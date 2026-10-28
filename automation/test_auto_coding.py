import contextlib
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import Mock

SPEC = importlib.util.spec_from_file_location('auto_coding', Path(__file__).with_name('auto_coding.py'))
m = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(m)


class QuotaTests(unittest.TestCase):
    def test_all_exhausted_windows_must_reset(self):
        s = {'rateLimits': {'primary': {'usedPercent': 100, 'resetsAt': 200},
                            'secondary': {'usedPercent': 100, 'resetsAt': 500}}}
        self.assertEqual(m.quota_deadline(s, 100), 560)

    def test_unknown_limit_retries_without_claiming_recovery(self):
        self.assertEqual(m.quota_deadline({'ordinaryUsageAllowed': False}, 100), 1000)
        self.assertEqual(m.quota_deadline({}, 100, forced=True), 1000)

    def test_old_reset_does_not_spin(self):
        self.assertEqual(m.quota_deadline({'rateLimits': {'primary': {'usedPercent': 100, 'resetsAt': 50}}}, 100), 1000)

    def test_available_usage_does_not_wait_for_normal_reset(self):
        self.assertIsNone(m.quota_deadline({'ordinaryUsageAllowed': True,
                          'rateLimits': {'primary': {'usedPercent': 26, 'resetsAt': 500}}}, 100))

    def test_unrelated_metered_bucket_does_not_block_normal_usage(self):
        self.assertIsNone(m.quota_deadline({'rateLimitsByLimitId': {
            'codex': {'primary': {'usedPercent': 10}},
            'other': {'primary': {'usedPercent': 100, 'resetsAt': 500}}}}, 100))

    def test_model_quota_errors_distinguished_from_tests(self):
        self.assertTrue(m.is_quota_error({'codexErrorInfo': 'usageLimitExceeded'}))
        self.assertFalse(m.is_quota_error({'message': 'TypeScript test failed'}))


class FakeGitHub(m.GitHub):
    def __init__(self):
        self.all_issues, self.comments, self.writes = [], [], []

    def issues(self, state='open'):
        return self.all_issues

    def pages(self, path):
        return self.comments

    def request(self, method, path, data=None):
        if method == 'GET':
            return {'labels': [{'name': 'auto-coding'}, {'name': 'auto:review'}, {'name': 'user-label'}]}
        self.writes.append((method, path, data))
        result = {**data, 'number': 7, 'html_url': 'https://github.com/owner/repo/issues/7'}
        if path.endswith('/comments'):
            self.comments.append(result)
        elif path == '/issues':
            self.all_issues.append(result)
        return result


class IdempotencyTests(unittest.TestCase):
    def test_issue_reconciliation_works_after_lost_create_response(self):
        github = FakeGitHub()
        first = github.ensure_issue('run-1', '需求', '正文')
        second = github.ensure_issue('run-1', '需求', '正文')
        self.assertEqual(first['number'], second['number'])
        self.assertEqual(len(github.writes), 1)

    def test_comment_retries_do_not_duplicate(self):
        github = FakeGitHub()
        github.comment(7, 'run-1:delivery', '交付')
        github.comment(7, 'run-1:delivery', '交付')
        self.assertEqual(len(github.writes), 1)

    def test_status_preserves_human_labels(self):
        github = FakeGitHub()
        github.status(7, 'auto:done', close=True)
        body = github.writes[0][2]
        self.assertEqual(body['labels'], ['auto-coding', 'user-label', 'auto:done'])
        self.assertEqual(body['state'], 'closed')


class RepositoryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.base = Path(self.temp.name)
        self.work = self.base / 'work'
        self.work.mkdir()
        self.runtime = self.base / 'runtime'
        self.runtime.mkdir()
        def git(*args):
            return m.command(['git', *args], self.work)
        self.git = git
        git('init', '-b', 'auto_coding')
        git('config', 'user.name', 'Workflow Test')
        git('config', 'user.email', 'test@example.invalid')
        git('remote', 'add', 'origin', 'https://github.com/owner/repo')
        (self.work / 'baseline.md').write_text('original\n')
        git('add', '.')
        git('commit', '-m', 'initial')
        m.atomic_json(self.runtime / 'config.json', {'workspace': str(self.work), 'repository': 'owner/repo'})
        self.runner = m.Runner(self.runtime)
        self.runner.github = FakeGitHub()

    def tearDown(self):
        self.temp.cleanup()

    def task(self):
        task = {'id': 'task1', 'issue_number': 7, 'attempt': 1,
                'base_sha': self.git('rev-parse', 'HEAD'),
                'development': {'summary': '完成', 'commit_message': 'docs: improve guide', 'tests': []}}
        self.runner.state.update(task=task, phase='validate')
        return task

    def test_refuses_other_branch(self):
        self.git('switch', '-c', 'main')
        with self.assertRaises(m.Attention):
            self.runner.assert_repo()

    def test_failed_check_does_not_commit_or_push(self):
        task = self.task()
        (self.work / 'new.md').write_text('draft')
        self.runner.gates = lambda paths: [['false']]
        self.runner.validate_and_deliver()
        self.assertEqual(self.git('rev-parse', 'HEAD'), task['base_sha'])
        self.assertEqual(self.runner.state['phase'], 'develop')
        self.assertFalse(task['validation']['passed'])

    def test_commit_recovered_after_checkpoint_loss(self):
        task = self.task()
        task['validation'] = {'passed': True, 'checks': []}
        (self.work / 'new.md').write_text('done')
        self.git('add', '.')
        self.git('commit', '-m', 'docs: done (#7)', '-m', 'Auto-Coding-Run: task1:1')
        expected = self.git('rev-parse', 'HEAD')
        real_git = self.runner.git
        pushed = []
        self.runner.git = lambda *args: pushed.append(args) or '' if args[0] == 'push' else real_git(*args)
        self.runner.validate_and_deliver()
        self.assertEqual(task['delivery_sha'], expected)
        self.assertEqual(self.runner.state['phase'], 'review')
        self.assertEqual(len(pushed), 1)
        self.assertEqual(self.git('rev-list', '--count', 'HEAD'), '2')

    def test_accept_requires_matching_remote_head(self):
        task = self.task()
        task['delivery_sha'] = task['base_sha']
        task['review'] = {'verdict': 'accept'}
        real_git = self.runner.git
        self.runner.git = lambda *args: 'wrong refs/heads/auto_coding' if args[0] == 'ls-remote' else real_git(*args)
        with self.assertRaises(m.Attention):
            self.runner.apply_review()
        self.assertEqual(self.runner.github.writes, [])

    def test_defer_preserves_partial_work_and_unblocks_pipeline(self):
        task = self.task()
        (self.work / 'baseline.md').write_text('changed')
        (self.work / 'untracked.md').write_text('new work')
        task['review'] = {'verdict': 'defer', 'summary': '需要来源', 'feedback': '后续复核',
                          'acceptance_evidence': [], 'decision_summary': '先做其他工作'}
        self.runner.apply_review()
        self.assertEqual(self.runner.state['phase'], 'plan')
        self.assertFalse(self.runner.changed_paths())
        archived = m.read_json(self.runtime / 'history' / 'task1.json')
        self.assertIn('partial_work_stash', archived)
        self.assertEqual(self.git('show', archived['partial_work_stash'] + ':baseline.md'), 'changed')

    def test_ui_changes_get_e2e_gate(self):
        self.assertIn(['pnpm', 'test:e2e'], self.runner.gates(['apps/web/src/Reader.vue']))
        self.assertEqual(self.runner.gates(['docs/auto-coding/DECISIONS.md']), [])

    def test_result_validation_rejects_incomplete_output(self):
        with self.assertRaises(m.TurnFailure):
            m.validate_result({'verdict': 'accept'}, m.SCHEMAS['review'])

    def test_state_is_recoverable_after_new_runner(self):
        self.runner.state.update(phase='develop', active={'thread_id': 'thread1'})
        self.runner.save()
        recovered = m.Runner(self.runtime)
        self.assertEqual(recovered.state['active']['thread_id'], 'thread1')

    def test_complete_workflow_closes_only_after_pm_acceptance(self):
        plan = {'action': 'implement', 'issue_number': 0, 'title': '路线研究',
                'body': '验收：提交研究报告', 'priority': 'P1', 'decision_summary': '先研究真实依赖'}
        self.runner.agent = Mock(return_value=plan)
        self.runner.state['active'] = {'run_id': 'e2e-plan'}
        self.runner.step()
        self.assertEqual(self.runner.state['phase'], 'publish')
        self.runner.step()
        self.assertEqual(self.runner.state['phase'], 'develop')
        self.runner.issue_context = Mock(return_value={'number': 7, 'body': plan['body']})
        (self.work / 'research.md').write_text('实际研究报告')
        self.runner.agent = Mock(return_value={'status': 'ready', 'summary': '已交付研究报告',
                'commit_message': 'docs: audit learning dependencies', 'tests': ['审读已完成'], 'risks': []})
        self.runner.step()
        self.assertEqual(self.runner.state['phase'], 'validate')
        real_git = self.runner.git
        def transport(*args):
            if args[0] == 'push':
                return ''
            if args[0] == 'ls-remote':
                return real_git('rev-parse', 'HEAD') + ' refs/heads/auto_coding'
            return real_git(*args)
        self.runner.git = transport
        self.runner.step()
        self.assertEqual(self.runner.state['phase'], 'review')
        self.assertFalse(any(w[2].get('state') == 'closed' for w in self.runner.github.writes))
        self.runner.agent = Mock(return_value={'verdict': 'accept', 'summary': '符合验收条件',
              'acceptance_evidence': ['已通读研究报告与引用实现'], 'feedback': '', 'decision_summary': '据此安排路线重构'})
        self.runner.step()
        self.runner.step()
        self.assertEqual(self.runner.state['phase'], 'plan')
        self.assertEqual(self.runner.state['cycle'], 1)
        self.assertTrue(any(w[2].get('state') == 'closed' for w in self.runner.github.writes))

    def test_invalid_acceptance_is_rejected(self):
        task = self.task()
        task['validation'] = {'passed': False}
        self.runner.state['phase'] = 'review'
        self.runner.issue_context = Mock(return_value={'number': 7})
        self.runner.agent = Mock(return_value={'verdict': 'accept', 'summary': '完成',
            'acceptance_evidence': ['模型自报'], 'feedback': '', 'decision_summary': ''})
        with self.assertRaises(m.TurnFailure):
            self.runner.step()
        self.assertFalse(any(w[2].get('state') == 'closed' for w in self.runner.github.writes))


if __name__ == '__main__':
    unittest.main()
