import copy
import json
from pathlib import Path
import subprocess
import tempfile
import time
import unittest
from unittest.mock import Mock, patch

import auto_coding as m


class RecoveryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.repo = self.root / 'repo'
        self.repo.mkdir()
        self.git('init', '-b', 'auto_coding')
        self.git('config', 'user.name', 'Recovery Test')
        self.git('config', 'user.email', 'test@example.invalid')
        self.git('remote', 'add', 'origin', 'https://github.com/owner/repo')
        (self.repo / 'lesson.txt').write_text('original\n')
        self.git('add', '.')
        self.git('commit', '-m', 'base')
        base = self.git('rev-parse', 'HEAD')
        (self.repo / 'lesson.txt').write_text('preserved implementation\n')
        (self.repo / 'evidence.md').write_text('saved evidence\n')
        self.task_id = 'a' * 32
        self.git('stash', 'push', '--include-untracked', '-m', 'career-auto-coding-deferred:' + self.task_id)
        self.stash = self.git('rev-parse', 'stash@{0}')
        self.archive = {'id': self.task_id, 'issue_number': 8, 'attempt': 4,
                        'plan': {'title': 'Original task'}, 'base_sha': base,
                        'partial_work_stash': self.stash, 'review': {'verdict': 'defer', 'feedback': 'Reproduce nine failures'},
                        'validation': {'passed': False}, 'feedback': 'Old generic error'}
        m.atomic_json(self.root / 'config.json', {'workspace': str(self.repo), 'repository': 'owner/repo'})
        m.atomic_json(self.root / 'history' / (self.task_id + '.json'), self.archive)
        m.atomic_json(self.root / 'state.json', {'phase': 'plan', 'status': 'waiting:research', 'cycle': 4,
                                               'next_run_at': time.time() + 21600})
        self.runner = m.Runner(self.root)
        self.runner.github = Mock()
        self.runner.github.request.return_value = {'state': 'open', 'labels': [{'name': 'auto-coding'}]}

    def git(self, *args):
        return subprocess.check_output(['git', *args], cwd=self.repo, stderr=subprocess.STDOUT, text=True).strip()

    def queue(self):
        self.runner.queue_recovery(self.task_id, 'Verify sleep correlation before retesting', 'b' * 32)

    def test_recovers_tracked_and_untracked_work_without_dropping_snapshot(self):
        # Infrastructure may have advanced while the task was deferred.
        (self.repo / 'console.txt').write_text('new infrastructure')
        self.git('add', '.'); self.git('commit', '-m', 'infra')
        self.queue()
        self.assertEqual(self.runner.state['phase'], 'recover')
        self.runner.step()
        self.assertEqual(self.runner.state['phase'], 'develop')
        self.assertEqual(self.runner.state['task']['attempt'], 4)
        self.assertIn('Reproduce nine failures', self.runner.state['task']['feedback'])
        self.assertEqual((self.repo / 'lesson.txt').read_text(), 'preserved implementation\n')
        self.assertEqual((self.repo / 'evidence.md').read_text(), 'saved evidence\n')
        self.assertIn(self.stash, self.git('stash', 'list', '--format=%H'))
        self.assertEqual(m.read_json(self.root / 'history' / (self.task_id + '.json')), self.archive)
        self.queue()  # replay after state save but before acknowledging the request
        self.assertEqual(self.runner.state['phase'], 'develop')

    def test_network_retry_does_not_apply_snapshot_twice(self):
        self.queue()
        self.runner.github.comment.side_effect = RuntimeError('temporary network error')
        with self.assertRaises(RuntimeError): self.runner.step()
        self.assertEqual(self.runner.state['task']['recovery']['status'], 'applied')
        self.runner.github.comment.side_effect = None
        with patch.object(self.runner, 'git', wraps=self.runner.git) as git:
            self.runner.step()
        self.assertFalse(any(c.args[:2] == ('stash', 'apply') for c in git.call_args_list))

    def test_interrupted_apply_stops_for_review_without_reapplying(self):
        self.queue()
        self.runner.state['task']['recovery']['status'] = 'applying'
        with patch.object(self.runner, 'git', wraps=self.runner.git) as git:
            with self.assertRaises(m.Attention): self.runner.step()
        self.assertFalse(any(c.args[:2] == ('stash', 'apply') for c in git.call_args_list))

    def test_conflict_preserves_snapshot_and_stops(self):
        (self.repo / 'lesson.txt').write_text('other product revision\n')
        self.git('add', '.'); self.git('commit', '-m', 'other change')
        self.queue()
        with self.assertRaises(m.Attention): self.runner.step()
        self.assertEqual(self.runner.state['task']['recovery']['status'], 'applying')
        self.assertIn(self.stash, self.git('stash', 'list', '--format=%H'))

    def test_dirty_workspace_and_active_task_are_rejected(self):
        (self.repo / 'unrelated.txt').write_text('keep')
        with self.assertRaises(ValueError): self.queue()
        self.assertEqual((self.repo / 'unrelated.txt').read_text(), 'keep')
        (self.repo / 'unrelated.txt').unlink()
        self.runner.state['active'] = {'run_id': 'other'}
        with self.assertRaises(ValueError): self.queue()

    def test_quota_pause_is_not_bypassed(self):
        (self.root / 'paused').touch()
        self.runner.state['resume_status'] = 'waiting:quota'
        self.runner.state['next_run_at'] = deadline = time.time() + 600
        with self.assertRaises(ValueError): self.queue()
        self.assertTrue((self.root / 'paused').exists())
        self.assertEqual(self.runner.state['next_run_at'], deadline)

    def test_replay_finishes_pause_release_after_crash(self):
        (self.root / 'paused').touch()
        with patch.object(self.runner, 'release_recovery_pause', side_effect=OSError('simulated crash')):
            with self.assertRaises(OSError): self.queue()
        self.assertTrue((self.root / 'paused').exists())
        self.queue()
        self.assertFalse((self.root / 'paused').exists())
        self.assertEqual(self.runner.state['phase'], 'recover')

    def test_replay_preserves_newer_operator_pause(self):
        path = self.root / 'paused'
        path.touch()
        with patch.object(self.runner, 'release_recovery_pause', side_effect=OSError('simulated crash')):
            with self.assertRaises(OSError): self.queue()
        import os
        stamp = self.runner.state['task']['recovery']['paused_marker'] + 1000000
        os.utime(path, ns=(stamp, stamp))
        self.queue()
        self.assertTrue(path.exists())

    def test_closed_issue_is_not_restored(self):
        self.queue()
        self.runner.github.request.return_value = {'state': 'closed', 'labels': [{'name': 'auto-coding'}]}
        with self.assertRaises(m.Attention): self.runner.step()
        self.assertEqual(self.runner.changed_paths(), [])

    def test_invalid_id_and_missing_snapshot_are_rejected(self):
        with self.assertRaises(ValueError): self.runner.queue_recovery('../state', 'why', 'x')
        self.git('stash', 'clear')
        with self.assertRaises(ValueError): self.queue()

    def test_planning_reuses_archived_task_and_preserves_attempt(self):
        self.runner.github.issues.side_effect = [[{'number': 8}], []]
        result = {'action': 'implement', 'issue_number': 8, 'title': 'Diagnose old task', 'body': 'Specific reproduction',
                  'priority': 'P1', 'decision_summary': 'New sleep evidence'}
        def agent(*args):
            self.runner.state['active'] = {'run_id': 'c' * 32}
            return result
        self.runner.agent = agent
        self.runner.step()
        self.assertEqual(self.runner.state['task']['id'], self.task_id)
        self.assertEqual(self.runner.state['task']['attempt'], 4)
        self.assertEqual(self.runner.state['phase'], 'recover')
        self.assertNotIn('active', self.runner.state)


class AwakeTests(unittest.TestCase):
    def test_awake_guard_is_scoped_and_released_on_error(self):
        guard = Mock()
        with patch.object(m.sys, 'platform', 'darwin'), patch.object(m.subprocess, 'Popen', return_value=guard) as start:
            with self.assertRaises(ValueError):
                with m.active_work_awake(): raise ValueError('test error')
        self.assertEqual(start.call_args.args[0][:3], ['/usr/bin/caffeinate', '-i', '-w'])
        guard.terminate.assert_called_once()
        guard.wait.assert_called_once()

    def test_other_platforms_do_not_start_guard(self):
        with patch.object(m.sys, 'platform', 'linux'), patch.object(m.subprocess, 'Popen') as start:
            with m.active_work_awake(): pass
        start.assert_not_called()


if __name__ == '__main__': unittest.main()
