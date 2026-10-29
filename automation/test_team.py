"""Offline protocol tests: no Codex model turns or GitHub requests."""
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch

import auto_coding as m
import team


def event(method, **params):
    return {'method': method, 'params': params}


def collab(tool='spawnAgent', ids=('sol-id',), states=None, sender='root', **extra):
    return event('item/completed', threadId=sender, item={
        'type': 'collabAgentToolCall', 'id': 'call', 'senderThreadId': sender,
        'receiverThreadIds': list(ids), 'tool': tool, 'status': 'completed',
        'agentsStates': states or {}, **extra})


class ChildTrackingTests(unittest.TestCase):
    def setUp(self):
        self.active = {'thread_id': 'root'}

    def track(self, e):
        return team.track_children(self.active, e, 'timestamp')

    def test_policy_is_pinned_and_uses_separate_role_files(self):
        self.assertEqual(team.TEAM['commander'], {'model': 'gpt-6-astra', 'reasoning_effort': 'medium'})
        cfg = team.codex_config(Path('/runtime'))
        self.assertTrue(cfg['features.multi_agent'])
        self.assertEqual(cfg['agents.max_concurrent_threads_per_session'], 2)
        self.assertEqual(cfg['agents.max_depth'], 1)
        for role, model in [('sol', 'gpt-6.1-sol'), ('terra', 'gpt-6.1-terra')]:
            self.assertEqual(cfg['agents.' + role]['config_file'], '/runtime/agents/' + role + '.toml')
            text = (Path(__file__).parent / 'agents' / (role + '.toml')).read_text()
            self.assertIn('model = "' + model + '"', text)
            self.assertIn('model_reasoning_effort = "medium"', text)

    def test_other_parent_is_ignored(self):
        self.assertFalse(self.track(collab(sender='other')))
        self.assertFalse(self.track(event('thread/started', thread={'id': 'alien', 'source': {'subAgent': {'thread_spawn': {'parent_thread_id': 'other', 'depth': 1}}}})))
        self.assertEqual(self.active['children'], [])

    def test_spawn_started_turn_wait_close_multiple_agents(self):
        self.track(collab(model='gpt-6.1-sol', prompt='scoped task'))
        self.track(event('thread/started', thread={'id': 'terra-id', 'source': {'subAgent': {'thread_spawn': {'parent_thread_id': 'root', 'depth': 1, 'agent_role': 'terra'}}}}))
        self.track(event('turn/started', threadId='sol-id', turn={'id': 's-turn', 'status': 'inProgress'}))
        self.track(event('turn/started', threadId='terra-id', turn={'id': 't-turn', 'status': 'inProgress'}))
        self.assertEqual([c['status'] for c in self.active['children']], ['running', 'running'])
        self.track(event('turn/completed', threadId='sol-id', turn={'id': 's-turn', 'status': 'completed'}))
        self.track(collab('wait', ('sol-id', 'terra-id'), {'sol-id': {'status': 'completed'}, 'terra-id': {'status': 'errored'}}))
        self.track(collab('closeAgent', states={'sol-id': {'status': 'shutdown'}}))
        self.assertEqual([c['status'] for c in self.active['children']], ['completed', 'failed'])
        self.assertEqual([c['role'] for c in self.active['children']], ['sol', 'terra'])
        self.assertEqual(self.active['children'][0]['task'], 'scoped task')

    def test_status_mapping(self):
        for value, expected in {'pendingInit': 'pending', 'inProgress': 'running', 'running': 'running', 'completed': 'completed', 'errored': 'failed', 'notFound': 'failed', 'interrupted': 'cancelled', 'shutdown': 'cancelled'}.items():
            self.assertEqual(team.normalize_status(value), expected)
        self.assertEqual(team.normalize_status('shutdown', 'completed'), 'completed')


    def test_native_activity_sequence_preserves_models_and_child_turns(self):
        # Mirrors observed app-server items; no transcript/reasoning is retained.
        for thread_id, path, model in [('sol-id', '/root/sol_calc', 'gpt-6.1-sol'), ('terra-id', '/root/terra_copy', 'gpt-6.1-terra')]:
            for method in ('item/started', 'item/completed'):
                self.track(event(method, threadId='root', turnId='root-turn', item={
                    'type': 'subAgentActivity', 'id': 'spawn-' + thread_id, 'kind': 'started',
                    'agentThreadId': thread_id, 'agentPath': path, 'model': model, 'reasoningEffort': 'medium'}))
            self.track(event('turn/started', threadId=thread_id, turn={'id': thread_id + '-turn', 'status': 'inProgress'}))
        self.assertEqual(len(self.active['children']), 2)
        self.assertEqual([c['status'] for c in self.active['children']], ['running', 'running'])
        for child in list(self.active['children']):
            thread_id = child['id']
            self.track(event('turn/completed', threadId=thread_id, turn={'id': thread_id + '-turn', 'status': 'completed'}))
            for method in ('item/started', 'item/completed'):
                self.track(event(method, threadId='root', turnId='root-turn', item={
                    'type': 'subAgentActivity', 'id': 'done-' + thread_id, 'kind': 'completed',
                    'agentThreadId': thread_id, 'agentPath': '/root/task', 'model': None, 'reasoningEffort': None}))
        self.assertEqual([c['model'] for c in self.active['children']], ['gpt-6.1-sol', 'gpt-6.1-terra'])
        self.assertEqual([c['role'] for c in self.active['children']], ['sol', 'terra'])
        self.assertEqual([c['status'] for c in self.active['children']], ['completed', 'completed'])
        self.assertEqual([c['turn_id'] for c in self.active['children']], ['sol-id-turn', 'terra-id-turn'])

    def test_native_completed_activity_does_not_erase_failed_child(self):
        self.track(event('item/started', threadId='root', item={'type': 'subAgentActivity', 'kind': 'started', 'agentThreadId': 'sol-id', 'agentPath': '/root/sol', 'model': 'gpt-6.1-sol', 'reasoningEffort': 'medium'}))
        self.track(event('turn/completed', threadId='sol-id', turn={'id': 'failed-turn', 'status': 'failed'}))
        self.track(event('item/completed', threadId='root', item={'type': 'subAgentActivity', 'kind': 'completed', 'agentThreadId': 'sol-id', 'model': None, 'reasoningEffort': None}))
        self.assertEqual(self.active['children'][0]['status'], 'failed')
        self.assertEqual(self.active['children'][0]['model'], 'gpt-6.1-sol')

    def test_native_activity_filters_other_roots_and_tracks_interrupt(self):
        def activity(kind, parent='root'):
            return event('item/completed', threadId=parent, item={'type': 'subAgentActivity', 'kind': kind, 'agentThreadId': 'sol-id', 'agentPath': '/root/sol', 'model': 'gpt-6.1-sol', 'reasoningEffort': 'medium'})
        self.assertFalse(self.track(activity('started', 'other')))
        self.assertEqual(self.active['children'], [])
        self.track(activity('started'))
        self.track(activity('interacted'))
        self.assertIn(self.active['children'][0]['status'], team.LIVE_STATES)
        self.track(activity('interrupted'))
        self.assertEqual(self.active['children'][0]['status'], 'cancelled')


class FakeRPC:
    def __init__(self, events=(), resumed_turns=()):
        self.events = list(events)
        self.resumed_turns = list(resumed_turns)
        self.requests = []
        self.sent = []
        self.failure = None

    def request(self, method, params=None, **kwargs):
        self.requests.append((method, params))
        if method == 'account/rateLimits/read':
            return {'ordinaryUsageAllowed': False, 'accountId': 'do-not-persist', 'rateLimits': {'primary': {'usedPercent': 100, 'resetsAt': 9999999999}}}
        if method == 'thread/read':
            return {'thread': {'turns': getattr(self, 'read_turns', [])}}
        if method in ('thread/start', 'thread/resume'):
            return {'thread': {'id': 'root', 'turns': self.resumed_turns}}
        if method == 'turn/start':
            return {'turn': {'id': 'root-turn'}}
        raise AssertionError(method)

    def receive(self):
        if self.failure:
            raise self.failure
        raise AssertionError('Unexpected receive; fixture must finish or interrupt')

    def send(self, request):
        self.sent.append(request)


class RunnerProtocolTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        runtime = Path(self.temp.name)
        (runtime / 'roles').mkdir()
        for role in ('common', 'product-manager'):
            (runtime / 'roles' / (role + '.md')).write_text('CURRENT RULES ' + role)
        run_dir = runtime / 'runs' / 'existing'
        run_dir.mkdir(parents=True)
        m.atomic_json(run_dir / 'input.json', {'prompt': 'OLD PROMPT', 'instructions': 'OLD RULES'})
        self.kept = runtime / 'workspace-change.txt'
        self.kept.write_text('unfinished work')
        self.runner = m.Runner.__new__(m.Runner)
        self.runner.runtime = runtime
        self.runner.workspace = runtime
        self.runner.config = {'turn_timeout_seconds': 30}
        self.runner.state = {'active': {'phase': 'plan', 'run_id': 'existing', 'thread_id': 'root', 'model': 'old-model'}}
        self.runner.save = Mock()
        self.runner.log = Mock()
        self.runner.checkpoint = Mock()
        self.runner.check_quota = Mock()
        self.validator = patch.object(m, 'validate_result', side_effect=lambda value, schema: value)
        self.validator.start()
        self.addCleanup(self.validator.stop)

    def run_rpc(self, rpc):
        self.runner.server = lambda: rpc
        return self.runner.agent('plan', {'latest': True})

    def root_completion(self):
        return [event('item/completed', threadId='root', turnId='root-turn', item={'type': 'agentMessage', 'text': '{"from":"root"}'}), event('turn/completed', threadId='root', turn={'id': 'root-turn', 'status': 'completed'})]

    def test_child_json_cannot_replace_parent_result_and_resume_refreshes_policy(self):
        events = [self.root_completion()[0], event('item/completed', threadId='sol-id', item={'type': 'agentMessage', 'text': '{"from":"child"}'}), self.root_completion()[1]]
        rpc = FakeRPC(events)
        self.assertEqual(self.run_rpc(rpc), {'from': 'root'})
        method, params = rpc.requests[0]
        self.assertEqual(method, 'thread/resume')
        self.assertEqual(params['model'], 'gpt-6-astra')
        self.assertEqual(params['config'], team.codex_config(self.runner.runtime))
        self.assertIn('CURRENT RULES', params['developerInstructions'])
        turn = rpc.requests[1][1]
        self.assertEqual((turn['model'], turn['effort']), ('gpt-6-astra', 'medium'))
        self.assertIn('latest', turn['input'][0]['text'])
        self.assertEqual(self.kept.read_text(), 'unfinished work')

    def test_live_child_blocks_result_and_interrupts_team(self):
        events = [collab(model='gpt-6.1-sol'), event('turn/started', threadId='sol-id', turn={'id': 's-turn', 'status': 'inProgress'})] + self.root_completion()
        rpc = FakeRPC(events)
        with self.assertRaises(m.TurnFailure):
            self.run_rpc(rpc)
        self.assertEqual({r['params']['threadId'] for r in rpc.sent}, {'root', 'sol-id'})
        self.assertFalse((self.runner.runtime / 'runs/existing/result.json').exists())

    def test_pause_and_quota_interrupt_known_parent_and_child_turns(self):
        for failure in (m.Paused(), m.QuotaWait(123)):
            with self.subTest(failure=type(failure).__name__):
                rpc = FakeRPC([collab(model='gpt-6.1-sol'), event('turn/started', threadId='sol-id', turn={'id': 's-turn', 'status': 'inProgress'})])
                rpc.failure = failure
                with self.assertRaises(type(failure)):
                    self.run_rpc(rpc)
                self.assertEqual({(r['params']['threadId'], r['params']['turnId']) for r in rpc.sent}, {('root', 'root-turn'), ('sol-id', 's-turn')})

    def test_resume_completed_parent_still_blocks_live_children(self):
        self.runner.state['active']['children'] = [{'id': 'sol-id', 'status': 'running', 'turn_id': 's-turn'}]
        rpc = FakeRPC(self.root_completion(), resumed_turns=[{'id': 'old-turn', 'status': 'completed', 'items': [{'type': 'agentMessage', 'text': '{"from":"old-root"}'}]}])
        with self.assertRaises(m.TurnFailure):
            self.run_rpc(rpc)
        self.assertFalse((self.runner.runtime / 'runs/existing/result.json').exists())


    def test_child_quota_turn_and_collab_report_pause_entire_team(self):
        failures = [
            event('turn/completed', threadId='sol-id', turn={'id': 's-turn', 'status': 'failed', 'error': {'codexErrorInfo': 'usageLimitExceeded'}}),
            collab('wait', states={'sol-id': {'status': 'errored', 'message': 'usage limit exceeded'}}),
        ]
        for failed_event in failures:
            with self.subTest(event=failed_event['method']):
                self.runner.state['active']['children'] = []
                rpc = FakeRPC([
                    collab(model='gpt-6.1-sol'),
                    collab(ids=('terra-id',), model='gpt-6.1-terra'),
                    event('turn/started', threadId='sol-id', turn={'id': 's-turn', 'status': 'inProgress'}),
                    event('turn/started', threadId='terra-id', turn={'id': 't-turn', 'status': 'inProgress'}),
                    failed_event,
                ])
                with self.assertRaises(m.QuotaWait) as caught:
                    self.run_rpc(rpc)
                self.assertGreater(caught.exception.until, 9999999999)
                self.assertFalse(self.runner.state['quota']['ordinaryUsageAllowed'])
                self.assertNotIn('accountId', self.runner.state['quota'])
                self.assertIn(('account/rateLimits/read', {}), [(method, params or {}) for method, params in rpc.requests])
                self.assertEqual({r['params']['threadId'] for r in rpc.sent}, {'root', 'terra-id'})
                self.assertFalse((self.runner.runtime / 'runs/existing/result.json').exists())

    def test_interrupt_fetches_missing_turn_id_and_keeps_stopping_until_confirmed(self):
        active = {'thread_id': 'root', 'turn_id': 'root-turn', 'children': [
            {'id': 'sol-id', 'status': 'pending'},
            {'id': 'terra-id', 'status': 'completed', 'turn_id': 'finished'},
        ]}
        rpc = FakeRPC()
        rpc.read_turns = [{'id': 'discovered', 'status': 'inProgress'}]
        self.runner.interrupt_team(rpc, active)
        self.assertEqual(rpc.requests, [('thread/read', {'threadId': 'sol-id', 'includeTurns': True})])
        self.assertEqual({(r['params']['threadId'], r['params']['turnId']) for r in rpc.sent}, {('root', 'root-turn'), ('sol-id', 'discovered')})
        self.assertEqual(active['children'][0]['status'], 'stopping')
        self.assertEqual(active['children'][1]['status'], 'completed')

    def test_missing_turn_id_with_completed_read_does_not_fake_interrupt(self):
        active = {'thread_id': 'root', 'turn_id': 'root-turn', 'children': [{'id': 'sol-id', 'status': 'pending'}]}
        rpc = FakeRPC()
        rpc.read_turns = [{'id': 'finished', 'status': 'completed'}]
        self.runner.interrupt_team(rpc, active)
        self.assertEqual([r['params']['threadId'] for r in rpc.sent], ['root'])
        self.assertEqual(active['children'][0]['status'], 'stopping')


if __name__ == '__main__':
    unittest.main()
