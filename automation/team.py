"""Pinned, local-only model policy and native subagent progress tracking."""
from __future__ import annotations

TEAM = {
    'commander': {'model': 'gpt-6-astra', 'reasoning_effort': 'medium'},
    'workers': [
        {'role': 'sol', 'model': 'gpt-6.1-sol', 'reasoning_effort': 'medium'},
        {'role': 'terra', 'model': 'gpt-6.1-terra', 'reasoning_effort': 'medium'},
    ],
    'max_workers': 2,
}
WORKER_MODELS = {x['model'] for x in TEAM['workers']}
LIVE_STATES = {'pending', 'running'}


def codex_config(runtime):
    result = {
        'model_reasoning_effort': TEAM['commander']['reasoning_effort'],
        'features.multi_agent': True,
        'agents.max_concurrent_threads_per_session': TEAM['max_workers'],
        'agents.max_depth': 1,
        'agents.default_subagent_model': 'gpt-6.1-sol',
        'agents.default_subagent_reasoning_effort': 'medium',
        'web_search': 'live',
    }
    for worker in TEAM['workers']:
        role = worker['role']
        result['agents.' + role] = {
            'description': '有明确范围的技术研究、实现与验证' if role == 'sol' else '中文内容、页面体验与有明确范围的实现和复核',
            'config_file': str(runtime / 'agents' / (role + '.toml')),
        }
    return result


def normalize_status(value, previous=None):
    if value == 'shutdown' and previous == 'completed':
        return 'completed'
    return {'pendingInit': 'pending', 'inProgress': 'running', 'running': 'running',
            'completed': 'completed', 'errored': 'failed', 'failed': 'failed',
            'interrupted': 'cancelled', 'shutdown': 'cancelled', 'notFound': 'failed'}.get(value, value)


def track_children(active, event, timestamp):
    """Track only descendants of this phase; never interpret another root's events."""
    method, data = event.get('method'), event.get('params', {})
    children = active.setdefault('children', [])
    by_id = {child['id']: child for child in children}
    changed = False

    def child_for(thread_id):
        nonlocal changed
        if not thread_id or thread_id == active.get('thread_id'):
            return None
        if thread_id not in by_id:
            child = {'id': thread_id, 'role': None, 'model': None, 'status': 'pending', 'task': ''}
            children.append(child)
            by_id[thread_id] = child
        changed = True
        by_id[thread_id]['updated_at'] = timestamp
        return by_id[thread_id]

    if method == 'thread/started':
        thread = data.get('thread') or {}
        source = thread.get('source') or {}
        source = source.get('subAgent', {}) if isinstance(source, dict) else {}
        spawn = source.get('thread_spawn', {}) if isinstance(source, dict) else {}
        parent = thread.get('parentThreadId') or spawn.get('parent_thread_id')
        if parent == active.get('thread_id'):
            child = child_for(thread.get('id'))
            if child is not None:
                child.update(role=thread.get('agentRole') or spawn.get('agent_role'), model=thread.get('model'))
    item = data.get('item') or {}
    if method in ('item/started', 'item/completed') and item.get('type') == 'subAgentActivity':
        if data.get('threadId') == active.get('thread_id'):
            child = child_for(item.get('agentThreadId'))
            if child is not None:
                if item.get('model'):
                    child['model'] = item['model']
                if item.get('reasoningEffort'):
                    child['reasoning_effort'] = item['reasoningEffort']
                if not child.get('task'):
                    child['task'] = (item.get('agentPath') or '').rsplit('/', 1)[-1].replace('_', ' ')[:240]
                kind = item.get('kind')
                if kind == 'started':
                    child['status'] = 'running'
                elif kind == 'interrupted':
                    child['status'] = 'cancelled'
                elif kind == 'completed' and child.get('status') not in ('failed', 'cancelled'):
                    child['status'] = 'completed'
    if method in ('item/started', 'item/completed') and item.get('type') == 'collabAgentToolCall':
        if item.get('senderThreadId') == active.get('thread_id'):
            for thread_id in item.get('receiverThreadIds', []):
                child = child_for(thread_id)
                if child is None:
                    continue
                if item.get('tool') == 'spawnAgent':
                    if item.get('model'):
                        child['model'] = item['model']
                    child['task'] = (item.get('prompt') or '')[:240]
                reported = item.get('agentsStates', {}).get(thread_id, {}).get('status')
                if reported:
                    child['status'] = normalize_status(reported, child.get('status'))
    child_id = data.get('threadId')
    if child_id in by_id and method in ('turn/started', 'turn/completed'):
        child = child_for(child_id)
        turn = data.get('turn') or {}
        child['turn_id'] = turn.get('id') or child.get('turn_id')
        child['status'] = 'running' if method == 'turn/started' else normalize_status(turn.get('status'))
    for child in children:
        if not child.get('role'):
            child['role'] = next((x['role'] for x in TEAM['workers'] if x['model'] == child.get('model')), None)
    return changed
