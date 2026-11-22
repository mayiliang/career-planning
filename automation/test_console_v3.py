"""Recovery queues and research/progress presentation; no Git/network/model calls."""
import json
import os
from pathlib import Path
import tempfile
import threading
import time
import unittest
from unittest.mock import patch
from urllib.request import Request, urlopen
from urllib.error import HTTPError

import auto_coding as runner
import console_server as console


class SnapshotTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        runner.atomic_json(self.root/'config.json', {'repository': 'owner/repo', 'workspace': str(self.root)})
        self.state = {'phase': 'plan', 'status': 'waiting:research'}
        self.store = console.ControlStore(self.root)
        self.online = patch.object(console, 'runner_online', return_value=True)
        self.online.start(); self.addCleanup(self.online.stop)

    def snapshot(self):
        runner.atomic_json(self.root/'state.json', self.state)
        return self.store.snapshot()

    def archive(self, task_id, issue=8, verdict='defer', at=1000, stash='a'*40):
        raw = {'id': task_id, 'issue_number': issue, 'plan': {'title': '工作 Bearer hide123', 'body': '完整正文', 'decision_summary': '保留成果'},
               'review': {'verdict': verdict}, 'partial_work_stash': stash,
               'recovery': {'status': 'saved', 'reason': 'Bearer reason123'}}
        path = self.root/'history'/(task_id+'.json')
        runner.atomic_json(path, raw); os.utime(path, (at, at))

    def test_research_current_and_legacy_sources_are_redacted(self):
        events = [
            {'event': 'research_wait', 'at': 'old', 'result': {'issue_number': 7}},
            {'event': 'research_wait', 'at': 'middle', 'result': {'issue_number': 8}},
            {'event': 'operator_control'},
            {'event': 'research_wait', 'at': 'latest', 'result': {'issue_number': 8, 'title': '等待 Bearer hide123', 'body': 'ghp_body123', 'decision_summary': '新结论'}},
        ]
        (self.root/'events.jsonl').write_text('\n'.join(json.dumps(x) for x in events))
        self.state['last_decision'] = '旧决定'
        result = self.snapshot()
        self.assertEqual(result['research']['wait_count'], 2)
        self.assertEqual(result['research']['at'], 'latest')
        self.assertEqual(result['research']['summary'], '新结论')
        self.assertNotIn('hide123', json.dumps(result)); self.assertNotIn('ghp_body123', json.dumps(result))
        self.assertEqual(result['events'][-1]['detail'], '新结论')
        self.assertEqual(result['events'][-1]['issue'], 8)
        self.state['last_research'] = {'title': '最新研究', 'summary': 'Bearer current123', 'body': '新正文', 'issue_number': 9, 'at': 'current', 'wait_count': 12}
        current = self.snapshot()['research']
        self.assertEqual((current['issue_number'], current['wait_count'], current['at']), (9, 12, 'current'))
        self.assertNotIn('current123', json.dumps(current))

    def test_reconnecting_events_do_not_hide_actual_progress_stall(self):
        now = time.time()
        self.state['active'] = {'started_at': now-4000, 'last_progress_at': now-2000,
                               'last_event_at': now-2, 'protocol_idle_timeout_seconds': 1800,
                               'last_transport_error': {'at': now-2, 'message': 'Reconnecting', 'will_retry': True}}
        result = self.snapshot()
        self.assertTrue(result['progress']['quiet'])
        self.assertAlmostEqual(result['progress']['quiet_seconds'], 2000, delta=2)
        self.assertEqual(result['active']['last_progress_at'], now-2000)
        self.assertEqual(result['active']['last_transport_error']['message'], 'Reconnecting')

    def test_no_active_has_no_elapsed_or_quiet_claim(self):
        result = self.snapshot()
        self.assertIsNone(result['research'])
        self.assertEqual(result['progress'], {'last_activity_at': None, 'elapsed_seconds': None, 'quiet_seconds': None, 'quiet': False})

    def test_progress_uses_started_time_and_latest_run_event_mtime(self):
        now = time.time(); run_id = 'a'*32
        self.state['active'] = {'run_id': run_id, 'started_at': now-2000}
        path = self.root/'runs'/run_id/'events.jsonl'
        path.parent.mkdir(parents=True); path.write_text('')
        os.utime(path, (now-700, now-700))
        result = self.snapshot()['progress']
        self.assertTrue(result['quiet']); self.assertAlmostEqual(result['elapsed_seconds'], 2000, delta=2)
        self.assertAlmostEqual(result['quiet_seconds'], 700, delta=2)
        os.utime(path, None)
        self.assertFalse(self.snapshot()['progress']['quiet'])

    def test_legacy_event_mtime_cannot_predate_current_start(self):
        now = time.time(); run_id = 'b'*32
        self.state['active'] = {'run_id': run_id, 'started_at': now-30}
        path = self.root/'runs'/run_id/'events.jsonl'
        path.parent.mkdir(parents=True); path.write_text('')
        os.utime(path, (now-2000, now-2000))
        progress = self.snapshot()['progress']
        self.assertAlmostEqual(progress['quiet_seconds'], 30, delta=2)
        self.assertFalse(progress['quiet'])

    def test_reported_event_time_takes_precedence_over_file_mtime(self):
        now = time.time(); run_id = 'a'*32
        self.state['active'] = {'run_id': run_id, 'started_at': now-4000, 'last_event_at': now-1200,
                                'protocol_idle_timeout_seconds': 1800}
        path = self.root/'runs'/run_id/'events.jsonl'
        path.parent.mkdir(parents=True); path.write_text('')
        result = self.snapshot()
        self.assertAlmostEqual(result['progress']['quiet_seconds'], 1200, delta=2)
        self.assertEqual(result['active']['protocol_idle_timeout_seconds'], 1800)

    def test_transport_error_is_redacted_and_cleared_after_new_activity(self):
        now = time.time()
        self.state['active'] = {'started_at': now-200, 'last_event_at': now-100,
                                'last_transport_error': {'at': now-90, 'message': 'Bearer secret123 ghp_secret456',
                                                         'will_retry': True, 'private': 'do not expose'}}
        result = self.snapshot()['active']['last_transport_error']
        self.assertTrue(result['will_retry'])
        self.assertNotIn('secret123', json.dumps(result)); self.assertNotIn('ghp_secret456', json.dumps(result))
        self.assertNotIn('private', result)
        self.state['active']['last_event_at'] = now-80
        self.assertIsNone(self.snapshot()['active']['last_transport_error'])
        self.state['active'].pop('last_transport_error')
        self.assertIsNone(self.snapshot()['active']['last_transport_error'])

    def test_filters_current_and_later_accepted_history_and_counts_real_acceptance(self):
        self.archive('a'*32, issue=8, at=100)
        self.archive('b'*32, issue=8, verdict='accept', at=200)
        self.archive('c'*32, issue=9, at=300)
        self.archive('d'*32, issue=10, at=400, stash='not-a-stash')
        self.archive('e'*32, issue=11, at=500)
        self.state['task'] = {'id': 'e'*32}
        result = self.snapshot()
        self.assertEqual({x['id'] for x in result['blockers']}, {'c'*32, 'd'*32})
        self.assertEqual(result['counts'], {'accepted': 1, 'deferred': 2})
        by_id = {x['id']: x for x in result['blockers']}
        self.assertTrue(by_id['c'*32]['saved_work']); self.assertTrue(by_id['c'*32]['recoverable'])
        self.assertFalse(by_id['d'*32]['recoverable']); self.assertIn('无法', by_id['d'*32]['recovery_reason'])
        self.assertNotIn('reason123', json.dumps(result)); self.assertNotIn('hide123', json.dumps(result))
        self.assertEqual(by_id['c'*32]['archived_at'], 300)
        self.assertFalse(result['recovery_allowed'])

    def test_recovery_gate_cannot_bypass_active_work_or_quota(self):
        self.archive('a'*32)
        self.assertTrue(self.snapshot()['recovery_allowed'])
        for fields in [{'active': {'run_id': 'x'}}, {'task': {'id': 'x'}}, {'phase': 'review'}, {'status': 'waiting:quota'}, {'status': 'running:plan'}, {'status': 'paused', 'resume_status': 'waiting:quota'}]:
            with self.subTest(fields=fields):
                self.state = {'phase': 'plan', 'status': 'waiting:research', **fields}
                self.assertFalse(self.snapshot()['recovery_allowed'])
        self.state = {'phase': 'plan', 'status': 'paused'}
        self.assertFalse(self.snapshot()['recovery_allowed'])
        (self.root/'paused').write_text('paused')
        self.assertTrue(self.snapshot()['recovery_allowed'])
        with patch.object(console, 'runner_online', return_value=False):
            self.assertFalse(self.snapshot()['recovery_allowed'])

    def test_recover_only_enqueues_matching_saved_task_without_changing_state(self):
        task_id = 'a'*32; self.archive(task_id); self.snapshot()
        before = (self.root/'state.json').read_bytes()
        result = self.store.enqueue('recover', task_id)
        self.assertEqual(result['status'], 'queued')
        request = runner.read_json(next((self.root/'controls/pending').glob('*.json')))
        self.assertEqual((request['action'], request['task_id']), ('recover', task_id))
        self.assertEqual((self.root/'state.json').read_bytes(), before)
        for action, target in [('recover', '../bad'), ('recover', 'b'*32), ('resume', task_id), ('recover', None)]:
            with self.subTest(action=action, target=target), self.assertRaises(ValueError):
                self.store.enqueue(action, target)


class RecoveryHTTPTests(unittest.TestCase):
    setUp = SnapshotTests.setUp
    archive = SnapshotTests.archive
    snapshot = SnapshotTests.snapshot
    # Exercise the actual body parser and origin/token checks with ephemeral loopback only.
    def test_recover_post_exact_fields_and_guarded_queue(self):
        task_id='a'*32; self.archive(task_id); self.snapshot()
        server=console.ConsoleServer(('127.0.0.1', 0), self.root)
        thread=threading.Thread(target=server.serve_forever, daemon=True); thread.start()
        self.addCleanup(lambda: (server.shutdown(), server.server_close(), thread.join(2)))
        base='http://127.0.0.1:'+str(server.server_address[1])
        def post(body, origin=base, token=None):
            req=Request(base+'/api/control', data=json.dumps(body).encode(), method='POST', headers={
                'Content-Type':'application/json','Origin':origin,'X-Console-Token':token if token is not None else server.token})
            try:r=urlopen(req,timeout=3)
            except HTTPError as error:r=error
            with r:return r.status, json.load(r)
        self.assertEqual(post({'action':'recover','task_id':task_id})[0],202)
        for body in [{'action':'recover'}, {'action':'recover','task_id':task_id,'extra':True}, {'action':'pause','task_id':task_id}]:
            self.assertEqual(post(body)[0],400)
        self.assertEqual(post({'action':'recover','task_id':'../bad'})[0],409)
        self.assertEqual(post({'action':'recover','task_id':task_id}, origin='https://evil.example')[0],403)
        self.assertEqual(post({'action':'recover','task_id':task_id}, token='invalid')[0],403)
        self.state['status']='waiting:quota';self.snapshot()
        self.assertEqual(post({'action':'recover','task_id':task_id})[0],409)


if __name__=='__main__':unittest.main()
