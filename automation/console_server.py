#!/usr/bin/env python3
"""Loopback-only operator console for the existing auto-coding runtime."""
from __future__ import annotations

import argparse
import contextlib
import copy
import fcntl
import json
import mimetypes
import os
from pathlib import Path
import plistlib
import re
import secrets
import shutil
import subprocess
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit
import uuid

from auto_coding import DEFAULT_HOME, LABEL, GitHub, atomic_json, now, read_json

CONSOLE_LABEL = LABEL + '.console'
PORT = 42880
ASSETS = Path(__file__).with_name('console')


def redact(value):
    text = str(value or '')
    text = re.sub(r'(?i)(bearer\s+)[\w.\-]+', r'\1[已隐藏]', text)
    text = re.sub(r'\b(?:gh[pousr]_[\w]+|github_pat_[\w]+|sk-[\w-]{12,})\b', '[已隐藏]', text)
    text = re.sub(r'(https?://)[^\s/@]+:[^\s/@]+@', r'\1[已隐藏]@', text)
    return text


def tail_lines(path, limit=100, max_bytes=160000):
    if not path.exists() or not path.is_file():
        return []
    with open(path, 'rb') as f:
        f.seek(0, os.SEEK_END)
        size = f.tell()
        start = max(0, size - max_bytes)
        f.seek(start)
        raw = f.read(max_bytes)
    lines = raw.decode('utf-8', errors='replace').splitlines()
    if start:
        lines = lines[1:]
    return lines[-limit:]


def json_lines(path, limit=100):
    result = []
    for line in tail_lines(path, limit):
        with contextlib.suppress(ValueError):
            result.append(json.loads(line))
    return result


def runner_online(runtime):
    path = runtime / 'runner.lock'
    if not path.exists():
        return False
    with open(path, 'r') as f:
        try:
            fcntl.flock(f, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return True
        fcntl.flock(f, fcntl.LOCK_UN)
        return False


def summarize_task(task, repo):
    if not task:
        return None
    plan = task.get('plan') or {}
    number = task.get('issue_number') or None
    development = task.get('development') or {}
    review = task.get('review') or {}
    validation = task.get('validation') or {}
    return {
        'id': task.get('id'), 'title': redact(plan.get('title') or '正在整理下一项任务'),
        'body': redact(plan.get('body')), 'priority': plan.get('priority'),
        'decision': redact(plan.get('decision_summary')), 'issue_number': number,
        'url': f'https://github.com/{repo}/issues/{number}' if number else None,
        'attempt': task.get('attempt', 0), 'delivery_sha': task.get('delivery_sha'),
        'feedback': redact(task.get('feedback')), 'development_summary': redact(development.get('summary')),
        'review': {'verdict': review.get('verdict'), 'summary': redact(review.get('summary')),
                   'evidence': [redact(x) for x in review.get('acceptance_evidence', [])]},
        'validation': {'passed': validation.get('passed'), 'at': validation.get('at'),
                       'reason': redact(validation.get('reason')),
                       'checks': [{'command': redact(' '.join(x.get('command', [])) if isinstance(x.get('command'), list) else x.get('command')),
                                   'exit_code': x.get('exit_code'), 'at': x.get('at') or validation.get('at'),
                                   'result': redact(x.get('result') or x.get('tail') or ('通过' if x.get('exit_code') == 0 else '未通过' if x.get('exit_code') is not None else '尚无结果'))[-1200:]}
                                  for x in validation.get('checks', [])]},
    }


def diagnostics(state):
    status = state.get('status', 'starting')
    effective = state.get('resume_status') if status == 'paused' else status
    effective = effective or status
    error = redact(state.get('last_error'))
    blocked = effective in ('needs_attention', 'waiting:retry', 'waiting:startup', 'waiting:quota', 'waiting:auth', 'waiting:network')
    category, reason, suggestion = 'none', '当前没有需要处理的故障', '可在此查看任务进度与验证结果。'
    if blocked:
        text = error.lower()
        quota = state.get('quota') or {}
        bucket = (quota.get('rateLimitsByLimitId') or {}).get('codex') or quota.get('rateLimits') or {}
        exhausted = quota.get('ordinaryUsageAllowed') is False or any(
            isinstance(bucket.get(key), dict) and isinstance(bucket[key].get('usedPercent'), (int, float))
            and bucket[key]['usedPercent'] >= 100 for key in ('primary', 'secondary'))
        if any(word in text for word in ('登录', '凭据', 'credential', 'unauthorized', 'http 401', 'authentication', 'bad credentials')):
            category = 'auth'
            if 'github' in text:
                reason, suggestion = 'GitHub 登录凭据不可用或已失效', '恢复本机 GitHub 登录后，刷新连接诊断，再继续或重试任务。'
            elif 'codex' in text:
                reason, suggestion = 'Codex 登录凭据不可用或已失效', '恢复本机 Codex 登录后，再继续或重试任务。'
            else:
                reason, suggestion = '服务登录凭据不可用或已失效', '查看当前错误以确认服务，恢复对应登录后，再继续或重试任务。'
        elif effective == 'waiting:quota' or (not error and exhausted) or any(word in text for word in ('额度', 'quota', 'usage limit', 'rate limit')):
            category, reason, suggestion = 'quota', '服务额度或请求频率达到限制', '等待重置时间后，调度器会重新检查；暂停不会清除等待时间。'
        elif any(word in text for word in ('network', 'tls', 'ssl', 'timeout', 'timed out', 'connection', 'urlopen', '网络', '代理', '连接', 'http 502', 'http 503', 'http 504')):
            category, reason, suggestion = 'network', '连接 GitHub 或模型服务暂时失败', '检查网络与代理，恢复后使用重试；任务进度会保留。'
        else:
            category, reason, suggestion = 'attention', '任务需要人工检查后继续', '查看当前错误、任务反馈和验证日志，处理后再继续。'
    return {'category': category, 'reason': reason, 'suggestion': suggestion,
            'status': effective, 'updated_at': state.get('updated_at')}


def grouped_events(items):
    result = []
    for item in items:
        # Event timestamps and changing retry counters do not create new groups.
        key = (item.get('event'), item.get('detail'))
        if result and key == (result[-1].get('event'), result[-1].get('detail')):
            result[-1].update(item)
            result[-1]['count'] += 1
            result[-1]['last_at'] = item.get('at')
        else:
            result.append({**item, 'count': 1, 'first_at': item.get('at'), 'last_at': item.get('at')})
    return result


class GitHubDiagnostic:
    """A single background GET refresh per runtime, with bounded polling frequency."""
    ttl = 60
    refresh_interval = 10

    def __init__(self, runtime):
        self.runtime = runtime
        self.lock = threading.Lock()
        self.last_started = None
        self.inflight = False
        self.cache = {'status': 'unknown', 'checking': False, 'checked_at': None,
                      'repository': None, 'repository_url': None, 'reason': '尚未检查 GitHub 连接',
                      'suggestion': '点击刷新连接诊断。',
                      'permissions': {'pull': None, 'push': None, 'admin': None},
                      'issue_counts': {'total': 0, 'open': 0, 'closed': 0},
                      'issue_counts_scope': '最近 40 条自动迭代 Issue', 'issues': []}

    def get(self, refresh=False):
        with self.lock:
            elapsed = float('inf') if self.last_started is None else time.monotonic() - self.last_started
            due = elapsed >= (self.refresh_interval if refresh else self.ttl)
            if not self.inflight and due:
                self.inflight = True
                self.last_started = time.monotonic()
                self.cache['checking'] = True
                if self.cache['status'] == 'unknown':
                    self.cache['status'] = 'checking'
                threading.Thread(target=self.update, daemon=True, name='github-diagnostic').start()
            return copy.deepcopy(self.cache)

    def update(self):
        with self.lock:
            result = copy.deepcopy(self.cache)
        try:
            config = read_json(self.runtime / 'config.json', {})
            repo = config.get('repository', '')
            # GitHub validates this unique, configured repository; URL/query input is never accepted.
            github = GitHub(repo, Path(config['workspace']))
            result.update(repository=repo, repository_url='https://github.com/' + repo)
            repository = github.request('GET', '')
            batch = github.request('GET', '/issues?state=all&labels=auto-coding&sort=updated&direction=desc&per_page=40')
            permissions = repository.get('permissions') or {}
            result['permissions'] = {key: permissions.get(key) if isinstance(permissions.get(key), bool) else None
                                     for key in ('pull', 'push', 'admin')}
            issues = []
            for issue in batch:
                labels = [redact(x.get('name')) for x in issue.get('labels', []) if isinstance(x, dict)]
                if 'pull_request' in issue or 'auto-coding' not in labels:
                    continue
                issues.append({'number': issue.get('number'), 'title': redact(issue.get('title')),
                               'state': issue.get('state'), 'labels': labels,
                               'url': 'https://github.com/' + repo + '/issues/' + str(issue.get('number')),
                               'updated_at': issue.get('updated_at')})
            result.update(status='connected', reason='GitHub 连接正常', suggestion='可查看自动迭代 Issue 队列。',
                          issues=issues[:40], issue_counts={'total': len(issues[:40]),
                          'open': sum(x['state'] == 'open' for x in issues[:40]),
                          'closed': sum(x['state'] == 'closed' for x in issues[:40])})
        except Exception as error:
            text = str(error).lower()
            if any(x in text for x in ('401', '登录', '凭据', 'credential', 'unauthorized', 'authentication')):
                result.update(status='auth_error', reason='GitHub 登录凭据不可用或已失效', suggestion='请恢复本机 GitHub 登录，再刷新诊断。')
            elif any(x in text for x in ('403', '404', '429', 'forbidden')):
                result.update(status='forbidden', reason='仓库访问被拒绝或 GitHub 请求受限', suggestion='确认账号可访问此仓库，并检查仓库权限或请求限制。')
            else:
                result.update(status='network_error', reason='暂时无法连接 GitHub', suggestion='检查网络与 Git 代理，稍后刷新诊断。')
            # Do not present earlier permission claims as current verification.
            result['permissions'] = {'pull': None, 'push': None, 'admin': None}
        finally:
            result.update(checking=False, checked_at=now())
            with self.lock:
                self.cache = result
                self.inflight = False


def team_snapshot(state):
    """Expose only the scheduler's public team and child activity fields."""
    team = state.get('team') if isinstance(state.get('team'), dict) else {}
    active = state.get('active') if isinstance(state.get('active'), dict) else {}

    def fields(value, names):
        if not isinstance(value, dict):
            return None
        return {key: redact(value[key])[:500] if isinstance(value.get(key), str) else value.get(key)
                for key in names if key in value}

    workers = team.get('workers')
    children = active.get('children')
    return {
        'team': {'commander': fields(team.get('commander'), ('model', 'reasoning_effort')),
                 'workers': [fields(x, ('role', 'model', 'reasoning_effort')) for x in workers if isinstance(x, dict)]
                            if isinstance(workers, list) else None,
                 'max_workers': team.get('max_workers') if isinstance(team.get('max_workers'), int) else None},
        'active': {'phase': active.get('phase'), 'started_at': active.get('started_at'),
                   'thread_id': redact(active.get('thread_id')) if active.get('thread_id') else None,
                   'model': redact(active.get('model')) if active.get('model') else None,
                   'reasoning_effort': redact(active.get('reasoning_effort')) if active.get('reasoning_effort') else None,
                   'children': [fields(x, ('id', 'role', 'model', 'status', 'task', 'updated_at'))
                                for x in children if isinstance(x, dict)] if isinstance(children, list) else None},
    }


class ControlStore:
    def __init__(self, runtime):
        self.runtime = Path(runtime)
        self.lock = threading.RLock()
        self.github = GitHubDiagnostic(self.runtime)

    def snapshot(self):
        state = read_json(self.runtime / 'state.json', {})
        config = read_json(self.runtime / 'config.json', {})
        repo = config.get('repository', '')
        quota = state.get('quota') or {}
        bucket = (quota.get('rateLimitsByLimitId') or {}).get('codex') or quota.get('rateLimits') or {}
        active = state.get('active') or {}
        processed = self.runtime / 'controls' / 'processed'
        controls = []
        if processed.exists():
            for path in sorted(processed.glob('*.json'), key=lambda p: p.stat().st_mtime, reverse=True)[:5]:
                item = read_json(path, {})
                controls.append({k: item.get(k) for k in ('id', 'action', 'status', 'message', 'applied_at')})
        history = []
        directory = self.runtime / 'history'
        if directory.exists():
            for path in sorted(directory.glob('*.json'), key=lambda p: p.stat().st_mtime, reverse=True)[:40]:
                task = summarize_task(read_json(path, {}), repo)
                if task:
                    task['recorded_at'] = path.stat().st_mtime
                    history.append(task)
        team_data = team_snapshot(state)
        return {
            'server_time': time.time(), 'status': state.get('status', 'starting'),
            'phase': state.get('phase', 'plan'), 'paused': (self.runtime / 'paused').exists(),
            'runner_online': runner_online(self.runtime), 'cycle': state.get('cycle', 0),
            'updated_at': state.get('updated_at'), 'next_run_at': state.get('next_run_at'),
            'diagnostics': diagnostics(state), 'resume_status': state.get('resume_status'),
            'last_error': redact(state.get('last_error')), 'failures': state.get('failures', 0),
            'repository': repo, 'branch': 'auto_coding',
            'repository_url': f'https://github.com/{repo}/tree/auto_coding' if repo else None,
            'task': summarize_task(state.get('task'), repo), 'history': history,
            'quota': {'primary': bucket.get('primary'), 'secondary': bucket.get('secondary'),
                       'allowed': quota.get('ordinaryUsageAllowed'), 'checked_at': state.get('quota_checked_at')},
            'team': team_data['team'], 'active': team_data['active'],
            'activity': self.agent_activity(state)[-12:],
            'events': grouped_events([self.event(x) for x in json_lines(self.runtime / 'events.jsonl', 160)])[-20:],
            'controls': controls,
            'pending_controls': len(list((self.runtime / 'controls' / 'pending').glob('*.json'))),
        }

    def event(self, item):
        return {k: redact(v) if isinstance(v, str) else v for k, v in item.items()
                if k in ('at', 'event', 'phase', 'detail', 'summary', 'issue', 'until', 'failure')}

    def agent_activity(self, state):
        active = state.get('active') or state.get('last_run') or {}
        run_id = active.get('run_id', '')
        if not re.fullmatch(r'[a-f0-9]{32}', run_id):
            return []
        path = self.runtime / 'runs' / run_id / 'events.jsonl'
        result = []
        for event in json_lines(path, 350):
            if event.get('method') != 'item/completed':
                continue
            item = event.get('params', {}).get('item', {})
            if item.get('type') == 'agentMessage' and item.get('phase') != 'analysis':
                text = item.get('text', '')
                with contextlib.suppress(ValueError, TypeError):
                    data = json.loads(text)
                    text = data.get('summary') or data.get('decision_summary') or data.get('title') or text
                result.append({'kind': 'message', 'text': redact(text)[:6000]})
            elif item.get('type') == 'commandExecution':
                result.append({'kind': 'command', 'text': redact(item.get('command'))[:700],
                               'status': item.get('status'), 'exit_code': item.get('exitCode')})
        return result[-60:]

    def logs(self, source):
        state = read_json(self.runtime / 'state.json', {})
        if source == 'events':
            return {'source': source, 'entries': grouped_events([self.event(x) for x in json_lines(self.runtime / 'events.jsonl', 160)])}
        if source == 'agent':
            return {'source': source, 'entries': self.agent_activity(state)}
        if source == 'checks':
            checks = (state.get('task') or {}).get('validation', {}).get('checks', [])
            result = []
            root = (self.runtime / 'deliveries').resolve()
            for check in checks[-12:]:
                path = Path(check.get('log', '/missing')).resolve()
                if not path.is_relative_to(root):
                    continue
                result.append({'command': redact(' '.join(check.get('command', []))),
                               'exit_code': check.get('exit_code'),
                               'text': redact('\n'.join(tail_lines(path, 120)))})
            return {'source': source, 'entries': result}
        if source == 'service':
            return {'source': source, 'entries': [{'name': name, 'text': redact('\n'.join(tail_lines(self.runtime / name, 70)))}
                    for name in ('launchd.stderr.log', 'app-server.stderr.log')]}
        raise ValueError('未知日志类型')

    def enqueue(self, action):
        if action not in ('pause', 'resume', 'retry', 'start'):
            raise ValueError('不支持的操作')
        with self.lock:
            state = self.snapshot()
            if action == 'pause' and (state['paused'] or not state['runner_online']):
                raise ValueError('流程已暂停或调度服务未运行')
            if action == 'resume' and (not state['paused'] or not state['runner_online']):
                raise ValueError('请先启动调度服务，或等待当前流程继续')
            if action == 'retry' and (state['paused'] or not state['runner_online'] or state['status'] not in
                                     ('waiting:retry', 'waiting:startup', 'waiting:research')):
                raise ValueError('当前不能立即重试；额度等待需要到重置后复查')
            if action == 'start' and state['runner_online']:
                raise ValueError('调度服务已在运行')
            request_id = uuid.uuid4().hex
            request = {'id': request_id, 'action': action, 'requested_at': now(), 'source': 'console'}
            if action == 'pause':
                path = self.runtime / f'pause-{request_id}.tmp'
                path.write_text('用户通过控制台暂停\n')
                os.replace(path, self.runtime / 'paused')
            if action == 'start':
                self.start_runner()
            atomic_json(self.runtime / 'controls' / 'pending' / f'{time.time_ns()}-{request_id}.json', request)
            return {'id': request_id, 'status': 'queued', 'message': {
                'pause': '暂停请求已发送，正在保存进度。', 'resume': '恢复请求已发送，将从检查点继续。',
                'retry': '重试请求已发送，仍会检查额度和执行条件。', 'start': '启动请求已发送，正在连接调度器。'}[action]}

    def start_runner(self):
        target = f'gui/{os.getuid()}/{LABEL}'
        result = subprocess.run(['launchctl', 'kickstart', target], capture_output=True, text=True, timeout=10)
        if result.returncode:
            path = Path.home() / 'Library' / 'LaunchAgents' / f'{LABEL}.plist'
            if not path.exists():
                raise ValueError('未找到调度服务配置，请先完成自动化安装')
            result = subprocess.run(['launchctl', 'bootstrap', f'gui/{os.getuid()}', str(path)],
                                    capture_output=True, text=True, timeout=10)
        if result.returncode:
            raise ValueError('调度服务未启动：' + redact(result.stderr.strip())[:400])


class ConsoleServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address, runtime, assets=ASSETS):
        super().__init__(address, Handler)
        self.store = ControlStore(runtime)
        self.assets = Path(assets)
        self.token = secrets.token_urlsafe(32)
        port = self.server_address[1]
        self.hosts = {f'127.0.0.1:{port}', f'localhost:{port}'}
        self.origins = {'http://' + host for host in self.hosts}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def reply(self, code, body, content_type='application/json; charset=utf-8'):
        data = json.dumps(body, ensure_ascii=False).encode() if isinstance(body, (dict, list)) else body
        self.send_response(code)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'")
        self.end_headers()
        self.wfile.write(data)

    def trusted(self, mutation=False):
        if self.headers.get('Host') not in self.server.hosts:
            return False
        origin = self.headers.get('Origin')
        if origin and origin not in self.server.origins:
            return False
        if self.headers.get('Sec-Fetch-Site') == 'cross-site':
            return False
        if mutation:
            return origin in self.server.origins and secrets.compare_digest(self.headers.get('X-Console-Token', ''), self.server.token)
        return True

    def do_GET(self):
        if not self.trusted():
            return self.reply(403, {'error': '仅允许从本地控制台访问'})
        url = urlsplit(self.path)
        try:
            if url.path == '/api/session':
                return self.reply(200, {'token': self.server.token})
            if url.path == '/api/status':
                return self.reply(200, self.server.store.snapshot())
            if url.path == '/api/github':
                return self.reply(200, self.server.store.github.get(parse_qs(url.query).get('refresh') == ['1']))
            if url.path == '/api/logs':
                source = parse_qs(url.query).get('source', ['events'])[0]
                return self.reply(200, self.server.store.logs(source))
            files = {'/': 'index.html', '/index.html': 'index.html', '/app.js': 'app.js', '/style.css': 'style.css', '/icon.svg': 'icon.svg'}
            if url.path not in files:
                return self.reply(404, {'error': '页面不存在'})
            path = self.server.assets / files[url.path]
            content_type = mimetypes.guess_type(path)[0] or 'application/octet-stream'
            return self.reply(200, path.read_bytes(), content_type + '; charset=utf-8')
        except ValueError as error:
            return self.reply(400, {'error': str(error)})
        except Exception:
            return self.reply(503, {'error': '暂时无法读取运行状态，请稍后刷新'})

    def do_POST(self):
        if not self.trusted(mutation=True):
            return self.reply(403, {'error': '操作校验失败，请刷新控制台后重试'})
        if self.path != '/api/control':
            return self.reply(404, {'error': '操作不存在'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if length < 1 or length > 1024 or self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
                return self.reply(400, {'error': '请求格式不正确'})
            data = json.loads(self.rfile.read(length))
            if not isinstance(data, dict) or set(data) != {'action'}:
                return self.reply(400, {'error': '请求格式不正确'})
            return self.reply(202, self.server.store.enqueue(data['action']))
        except (ValueError, TypeError) as error:
            return self.reply(409, {'error': str(error)})
        except Exception:
            return self.reply(503, {'error': '操作未完成，请检查调度服务状态后重试'})


def install(runtime, port):
    if not (runtime / 'config.json').exists():
        raise SystemExit('请先安装自动化调度器')
    shutil.copy2(Path(__file__), runtime / 'console_server.py')
    shutil.copytree(ASSETS, runtime / 'console', dirs_exist_ok=True)
    plist = {'Label': CONSOLE_LABEL,
             'ProgramArguments': [sys.executable, str(runtime / 'console_server.py'), '--runtime', str(runtime), '--port', str(port)],
             'WorkingDirectory': str(runtime), 'EnvironmentVariables': {'PYTHONUNBUFFERED': '1', 'TZ': 'Asia/Shanghai'},
             'RunAtLoad': True, 'KeepAlive': True, 'ThrottleInterval': 15,
             'StandardOutPath': str(runtime / 'console.stdout.log'),
             'StandardErrorPath': str(runtime / 'console.stderr.log')}
    path = Path.home() / 'Library' / 'LaunchAgents' / f'{CONSOLE_LABEL}.plist'
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(plistlib.dumps(plist))
    os.chmod(path, 0o600)
    print(json.dumps({'url': f'http://127.0.0.1:{port}', 'launch_agent': str(path)}, ensure_ascii=False))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--runtime', type=Path, default=DEFAULT_HOME)
    parser.add_argument('--port', type=int, default=PORT)
    parser.add_argument('--install', action='store_true')
    args = parser.parse_args()
    os.umask(0o077)
    if args.install:
        return install(args.runtime, args.port)
    server = ConsoleServer(('127.0.0.1', args.port), args.runtime)
    print(f'Local: http://127.0.0.1:{server.server_address[1]}', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
