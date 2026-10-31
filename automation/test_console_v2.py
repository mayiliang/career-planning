"""Offline console diagnostics and bounded asynchronous GitHub reads."""
import json
from pathlib import Path
import tempfile
import threading
import time
import unittest
from unittest.mock import Mock, patch

import auto_coding as runner
import console_server as console


class DiagnosticTests(unittest.TestCase):
    def test_current_state_drives_diagnosis_not_historical_error(self):
        self.assertEqual(console.diagnostics({'status': 'running:develop', 'last_error': 'GitHub 登录失效'})['category'], 'none')
        cases = [('needs_attention', 'GitHub 登录失效', 'auth'),
                 ('waiting:retry', 'temporary TLS error', 'network'),
                 ('waiting:quota', 'usage exhausted', 'quota'),
                 ('needs_attention', '必须检查文件', 'attention')]
        for status, error, category in cases:
            with self.subTest(category=category):
                actual = console.diagnostics({'status': status, 'last_error': error, 'updated_at': 'timestamp'})
                self.assertEqual(actual['category'], category)
                self.assertEqual(actual['updated_at'], 'timestamp')
                self.assertTrue(actual['suggestion'])
        self.assertEqual(console.diagnostics({'status': 'paused', 'resume_status': 'needs_attention', 'last_error': 'credential missing'})['category'], 'auth')

    def test_grouping_is_consecutive_and_preserves_compatibility(self):
        entries = [{'at': str(i), 'event': event, 'detail': detail, 'failure': i}
                   for i, (event, detail) in enumerate([('retry', 'tls'), ('retry', 'tls'), ('retry', 'auth'), ('retry', 'tls')])]
        grouped = console.grouped_events(entries)
        self.assertEqual([x['count'] for x in grouped], [2, 1, 1])
        self.assertEqual((grouped[0]['first_at'], grouped[0]['last_at'], grouped[0]['at']), ('0', '1', '1'))
        self.assertEqual(grouped[0]['event'], 'retry')
        self.assertEqual(grouped[0]['failure'], 1)

    def test_validation_keeps_complete_task_and_result_metadata(self):
        body = '完整需求正文' * 1000
        task = console.summarize_task({'plan': {'body': body, 'decision_summary': body}, 'validation': {
            'at': 'validated', 'checks': [{'command': ['npm', 'test'], 'exit_code': 0},
                                         {'command': 'npm run lint', 'exit_code': 1, 'at': 'earlier', 'tail': 'lint failed Bearer hidden123'}]}}, 'owner/repo')
        self.assertEqual((task['body'], task['decision']), (body, body))
        self.assertEqual(task['validation']['checks'][0], {'command': 'npm test', 'exit_code': 0, 'at': 'validated', 'result': '通过'})
        self.assertEqual(task['validation']['checks'][1]['command'], 'npm run lint')
        self.assertNotIn('hidden123', json.dumps(task))
        self.assertIn('lint failed', task['validation']['checks'][1]['result'])


    def test_validation_redacts_before_truncating_at_token_boundary(self):
        secret = 'ghp_' + 'Z' * 36
        # Raw slicing at 1200 would discard the recognizable token prefix.
        for field in ('tail', 'result'):
            task = console.summarize_task({'validation': {'checks': [
                {'exit_code': 1, field: secret + '\n' + 'x' * 1180}
            ]}}, 'owner/repo')
            result = task['validation']['checks'][0]['result']
            self.assertNotIn('Z', result)
            self.assertLessEqual(len(result), 1200)
            self.assertIn('[已隐藏]', result)

    def test_auth_diagnosis_names_only_the_identified_service(self):
        for error, expected, unexpected in [
            ('GitHub 登录失效', 'GitHub', 'Codex'),
            ('Codex authentication failed', 'Codex', 'GitHub'),
            ('authentication failed', '服务', 'GitHub'),
        ]:
            with self.subTest(error=error):
                result = console.diagnostics({'status': 'needs_attention', 'last_error': error})
                self.assertEqual(result['category'], 'auth')
                self.assertIn(expected, result['reason'])
                self.assertNotIn(unexpected, result['reason'] + result['suggestion'])


class GitHubCacheTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        runner.atomic_json(self.root / 'config.json', {'repository': 'owner/repo', 'workspace': str(self.root)})
        runner.atomic_json(self.root / 'state.json', {'status': 'needs_attention', 'last_error': 'GitHub 登录失效'})
        self.before = (self.root / 'state.json').read_bytes()
        self.cache = console.GitHubDiagnostic(self.root)

    def finish(self):
        deadline = time.monotonic() + 2
        while self.cache.inflight and time.monotonic() < deadline:
            time.sleep(.002)
        self.assertFalse(self.cache.inflight)

    def test_nonblocking_single_flight_ttl_and_explicit_refresh_throttle(self):
        entered, release = threading.Event(), threading.Event()
        calls = []
        def request(method, path):
            calls.append((method, path))
            entered.set()
            release.wait(2)
            if path == '':
                return {'permissions': {'pull': True, 'push': False, 'admin': False}, 'token': 'never-return'}
            return [{'number': 7, 'title': '工作 Bearer secret123', 'state': 'open', 'labels': [{'name': 'auto-coding'}], 'updated_at': 'today'},
                    {'number': 8, 'title': 'PR', 'state': 'closed', 'labels': [{'name': 'auto-coding'}], 'pull_request': {}},
                    {'number': 9, 'title': 'unrelated', 'state': 'open', 'labels': []}]
        fake = Mock(); fake.request.side_effect = request
        with patch.object(console, 'GitHub', return_value=fake) as factory:
            start = time.monotonic()
            self.assertEqual(self.cache.get()['status'], 'checking')
            self.assertLess(time.monotonic() - start, .2)
            self.assertTrue(entered.wait(1))
            for _ in range(20):
                self.assertTrue(self.cache.get(refresh=True)['checking'])
            self.assertEqual(len(calls), 1)
            release.set(); self.finish()
            result = self.cache.get()
            self.assertEqual(result['status'], 'connected')
            self.assertEqual(result['permissions'], {'pull': True, 'push': False, 'admin': False})
            self.assertEqual(result['issue_counts'], {'total': 1, 'open': 1, 'closed': 0})
            self.assertEqual([x['number'] for x in result['issues']], [7])
            self.assertNotIn('secret123', json.dumps(result))
            self.assertNotIn('never-return', json.dumps(result))
            self.assertEqual(self.cache.get(refresh=True)['status'], 'connected')
            self.assertEqual(len(calls), 2)
            self.cache.last_started -= 11
            self.cache.get()  # ordinary polling still obeys sixty seconds
            self.assertEqual(len(calls), 2)
            self.cache.get(refresh=True); self.finish()
            self.assertEqual(len(calls), 4)
            self.assertTrue(all(method == 'GET' for method, _ in calls))
            factory.assert_called_with('owner/repo', self.root)
        self.assertEqual((self.root / 'state.json').read_bytes(), self.before)

    def test_error_categories_never_expose_error_or_claim_permissions(self):
        for error, expected in [('GitHub 登录失效 ghp_private123', 'auth_error'), ('HTTP 403', 'forbidden'), ('TLS connection timeout', 'network_error')]:
            with self.subTest(expected=expected), patch.object(console, 'GitHub') as factory:
                factory.return_value.request.side_effect = RuntimeError(error)
                self.cache.last_started = None
                self.cache.get(); self.finish()
                result = self.cache.get()
                self.assertEqual(result['status'], expected)
                self.assertEqual(result['permissions'], {'pull': None, 'push': None, 'admin': None})
                self.assertNotIn('ghp_private123', json.dumps(result))
                self.assertIsNotNone(result['checked_at'])
        self.assertEqual((self.root / 'state.json').read_bytes(), self.before)

    def test_absent_permissions_remain_unknown(self):
        with patch.object(console, 'GitHub') as factory:
            factory.return_value.request.side_effect = [{}, []]
            self.cache.get(); self.finish()
            self.assertEqual(self.cache.get()['permissions'], {'pull': None, 'push': None, 'admin': None})

    def test_snapshot_tail_is_bounded_and_events_grouped(self):
        path = self.root / 'events.jsonl'
        with path.open('w') as out:
            for i in range(10000):
                out.write(json.dumps({'event': 'retry', 'detail': 'TLS', 'at': str(i)}) + '\n')
        snapshot = console.ControlStore(self.root).snapshot()
        self.assertEqual(snapshot['events'][0]['count'], 160)
        self.assertEqual(snapshot['events'][0]['last_at'], '9999')
        self.assertEqual(snapshot['diagnostics']['category'], 'auth')


if __name__ == '__main__':
    unittest.main()
