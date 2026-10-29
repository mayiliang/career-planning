#!/usr/bin/env python3
"""Loopback-only operator console for the existing auto-coding runtime."""
from __future__ import annotations

import argparse
import contextlib
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

from auto_coding import DEFAULT_HOME, LABEL, atomic_json, now, read_json

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
                       'checks': [{'command': redact(' '.join(x.get('command', []))),
                                   'exit_code': x.get('exit_code')} for x in validation.get('checks', [])]},
    }


class ControlStore:
    def __init__(self, runtime):
        self.runtime = Path(runtime)
        self.lock = threading.RLock()

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
        return {
            'server_time': time.time(), 'status': state.get('status', 'starting'),
            'phase': state.get('phase', 'plan'), 'paused': (self.runtime / 'paused').exists(),
            'runner_online': runner_online(self.runtime), 'cycle': state.get('cycle', 0),
            'updated_at': state.get('updated_at'), 'next_run_at': state.get('next_run_at'),
            'last_error': redact(state.get('last_error')), 'failures': state.get('failures', 0),
            'repository': repo, 'branch': 'auto_coding',
            'repository_url': f'https://github.com/{repo}/tree/auto_coding' if repo else None,
            'task': summarize_task(state.get('task'), repo), 'history': history,
            'quota': {'primary': bucket.get('primary'), 'secondary': bucket.get('secondary'),
                       'allowed': quota.get('ordinaryUsageAllowed'), 'checked_at': state.get('quota_checked_at')},
            'active': {'phase': active.get('phase'), 'started_at': active.get('started_at'),
                       'thread_id': active.get('thread_id')},
            'activity': self.agent_activity(state)[-12:],
            'events': [self.event(x) for x in json_lines(self.runtime / 'events.jsonl', 80)][-20:],
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
            return {'source': source, 'entries': [self.event(x) for x in json_lines(self.runtime / 'events.jsonl', 160)]}
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
