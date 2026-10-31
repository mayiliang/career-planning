import fcntl
import json
from pathlib import Path
import tempfile
import threading
import time
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen

import auto_coding as runner
import console_server as console


class ConsoleTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        runner.atomic_json(self.root / 'config.json', {'workspace': str(self.root), 'repository': 'owner/repo'})
        runner.atomic_json(self.root / 'state.json', {'phase': 'publish', 'status': 'waiting:retry',
                            'next_run_at': time.time() + 600, 'cycle': 0, 'last_error': 'temporary TLS error'})
        self.lock = open(self.root / 'runner.lock', 'w')
        fcntl.flock(self.lock, fcntl.LOCK_EX)
        self.server = console.ConsoleServer(('127.0.0.1', 0), self.root)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.url = f'http://127.0.0.1:{self.server.server_address[1]}'

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(3)
        self.lock.close()
        self.temp.cleanup()

    def request(self, path, action=None, headers=None):
        req = Request(self.url + path, data=json.dumps({'action': action}).encode() if action else None,
                      headers=headers or {}, method='POST' if action else 'GET')
        try:
            response = urlopen(req, timeout=3)
        except HTTPError as error:
            response = error
        with response:
            data = response.read()
            return response.code, json.loads(data) if 'application/json' in response.headers['Content-Type'] else data

    def auth(self):
        token = self.request('/api/session')[1]['token']
        return {'Origin': self.url, 'Content-Type': 'application/json', 'X-Console-Token': token}

    def test_static_page_and_real_status_are_available(self):
        self.assertEqual(self.request('/')[0], 200)
        code, state = self.request('/api/status')
        self.assertEqual(code, 200)
        self.assertTrue(state['runner_online'])
        self.assertEqual(state['status'], 'waiting:retry')
        self.assertNotIn('config', state)

    def test_team_snapshot_exposes_only_redacted_public_fields(self):
        state = runner.read_json(self.root / 'state.json')
        state['team'] = {'commander': {'model': 'gpt-6-astra', 'reasoning_effort': 'medium', 'secret': 'hidden'},
                         'workers': [{'role': 'sol', 'model': 'gpt-6.1-sol', 'reasoning_effort': 'medium', 'secret': 'hidden'}],
                         'max_workers': 2, 'secret': 'hidden'}
        state['active'] = {'model': 'gpt-6-astra', 'reasoning_effort': 'medium', 'run_id': 'private',
                           'children': [{'id': 'child1', 'role': 'sol', 'model': 'gpt-6.1-sol',
                                         'status': 'running', 'task': '检查 Bearer abc.def.ghi',
                                         'updated_at': 123, 'secret': 'hidden'}]}
        runner.atomic_json(self.root / 'state.json', state)
        result = self.request('/api/status')[1]
        self.assertEqual(result['team']['commander']['model'], 'gpt-6-astra')
        self.assertEqual(result['team']['max_workers'], 2)
        self.assertEqual(result['active']['children'][0]['status'], 'running')
        self.assertIn('[已隐藏]', result['active']['children'][0]['task'])
        output = json.dumps({'team': result['team'], 'active': result['active']})
        self.assertNotIn('secret', output)
        self.assertNotIn('abc.def.ghi', output)
        self.assertNotIn('run_id', output)

    def test_legacy_state_distinguishes_missing_from_empty_children(self):
        result = self.request('/api/status')[1]
        self.assertIsNone(result['team']['commander'])
        self.assertIsNone(result['team']['workers'])
        self.assertIsNone(result['active']['children'])
        state = runner.read_json(self.root / 'state.json')
        state['active'] = {'children': []}
        runner.atomic_json(self.root / 'state.json', state)
        self.assertEqual(self.request('/api/status')[1]['active']['children'], [])

    def test_cross_origin_control_is_rejected(self):
        headers = self.auth(); headers['Origin'] = 'https://unrelated.example'
        self.assertEqual(self.request('/api/control', 'pause', headers)[0], 403)
        self.assertFalse((self.root / 'paused').exists())

    def test_wrong_token_and_rebinding_host_are_rejected(self):
        headers = self.auth(); headers['X-Console-Token'] = 'bad'
        self.assertEqual(self.request('/api/control', 'pause', headers)[0], 403)
        self.assertEqual(self.request('/api/status', headers={'Host': 'unrelated.example'})[0], 403)

    def test_web_action_queues_without_overwriting_scheduler_state(self):
        before = (self.root / 'state.json').read_bytes()
        code, result = self.request('/api/control', 'pause', self.auth())
        self.assertEqual(code, 202)
        self.assertTrue((self.root / 'paused').exists())
        self.assertEqual((self.root / 'state.json').read_bytes(), before)
        engine = runner.Runner(self.root)
        engine.process_controls()
        self.assertEqual(engine.state['status'], 'paused')
        applied = runner.read_json(self.root / 'controls' / 'processed' / (result['id'] + '.json'))
        self.assertEqual(applied['status'], 'applied')
        self.assertEqual(self.request('/api/control', 'resume', self.auth())[0], 202)
        engine.process_controls()
        self.assertFalse((self.root / 'paused').exists())
        self.assertEqual(engine.state['status'], 'waiting:retry')

    def test_retry_clears_network_backoff_but_not_quota_wait(self):
        self.assertEqual(self.request('/api/control', 'retry', self.auth())[0], 202)
        engine = runner.Runner(self.root); engine.process_controls()
        self.assertNotIn('next_run_at', engine.state)
        engine.state.update(status='waiting:quota', next_run_at=time.time()+900); engine.save()
        self.assertEqual(self.request('/api/control', 'retry', self.auth())[0], 409)
        self.assertGreater(runner.read_json(self.root / 'state.json')['next_run_at'], time.time())

    def test_queued_retry_rechecks_changed_state(self):
        self.assertEqual(self.request('/api/control', 'retry', self.auth())[0], 202)
        engine = runner.Runner(self.root)
        engine.state.update(status='waiting:quota', next_run_at=time.time()+900); engine.save()
        engine.process_controls()
        self.assertEqual(engine.state['status'], 'waiting:quota')
        self.assertEqual(engine.state['last_control']['status'], 'rejected')

    def test_pause_and_resume_preserve_quota_deadline_and_named_bucket(self):
        engine = runner.Runner(self.root)
        deadline = time.time() + 900
        engine.state.update(status='waiting:quota', next_run_at=deadline,
                            quota={'rateLimits': {'primary': {'usedPercent': 1}},
                                   'rateLimitsByLimitId': {'codex': {'primary': {'usedPercent': 100}}}})
        engine.save()
        self.assertEqual(self.request('/api/status')[1]['quota']['primary']['usedPercent'], 100)
        self.request('/api/control', 'pause', self.auth()); engine.process_controls()
        self.request('/api/control', 'resume', self.auth()); engine.process_controls()
        self.assertEqual(engine.state['status'], 'waiting:quota')
        self.assertEqual(engine.state['next_run_at'], deadline)

    def test_control_replay_is_idempotent_after_ack_loss(self):
        self.request('/api/control', 'retry', self.auth())
        path = next((self.root/'controls'/'pending').glob('*.json')); raw = path.read_bytes()
        engine = runner.Runner(self.root); engine.process_controls()
        result = engine.state['last_control']
        (self.root/'controls'/'processed'/(result['id']+'.json')).unlink()
        path.write_bytes(raw)
        engine.state.update(status='waiting:quota', next_run_at=time.time()+900); engine.save()
        engine.process_controls()
        self.assertEqual(engine.state['status'], 'waiting:quota')
        self.assertEqual(engine.state['last_control']['id'], result['id'])

    def test_agent_logs_exclude_reasoning_and_redact_credentials(self):
        run_id = 'a'*32
        state = runner.read_json(self.root/'state.json'); state['active']={'run_id':run_id}; runner.atomic_json(self.root/'state.json',state)
        path=self.root/'runs'/run_id/'events.jsonl'; path.parent.mkdir(parents=True)
        items=[{'type':'reasoning','text':'private reasoning'},
               {'type':'agentMessage','phase':'analysis','text':'private analysis'},
               {'type':'agentMessage','phase':'commentary','text':'已完成检查。Bearer abc.def.ghi'},
               {'type':'commandExecution','command':'echo ghp_secret123','status':'completed'}]
        path.write_text('\n'.join(json.dumps({'method':'item/completed','params':{'item':item}}) for item in items))
        code, data=self.request('/api/logs?source=agent'); output=json.dumps(data,ensure_ascii=False)
        self.assertEqual(code,200)
        self.assertNotIn('private',output); self.assertNotIn('abc.def.ghi',output); self.assertNotIn('ghp_secret123',output)
        self.assertIn('已完成检查',output)

    def test_log_paths_cannot_escape_delivery_directory(self):
        secret=self.root/'secret.txt';secret.write_text('must not expose')
        state=runner.read_json(self.root/'state.json');state['task']={'validation':{'checks':[{'log':str(secret),'command':['echo']} ]}}
        runner.atomic_json(self.root/'state.json',state)
        self.assertEqual(self.request('/api/logs?source=checks')[1]['entries'],[])
        self.assertEqual(self.request('/../config.json')[0],404)
        self.assertEqual(self.request('/api/logs?source=../../config')[0],400)


    def test_github_cached_endpoint_keeps_origin_and_host_guards(self):
        payload = {'status': 'checking', 'checking': True, 'issues': []}
        with patch.object(self.server.store.github, 'get', return_value=payload) as get:
            self.assertEqual(self.request('/api/github?refresh=1'), (200, payload))
            get.assert_called_once_with(True)
            self.assertEqual(self.request('/api/github', headers={'Origin': 'https://unrelated.example'})[0], 403)
            self.assertEqual(self.request('/api/github', headers={'Host': 'evil.example'})[0], 403)
            self.assertEqual(get.call_count, 1)


if __name__ == '__main__':
    unittest.main()
