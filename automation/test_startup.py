import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import Mock

import auto_coding as m


class StartupTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        m.atomic_json(self.root/'config.json', {'workspace':str(self.root),'repository':'owner/repo'})
        self.runner = m.Runner(self.root)
        self.runner.github = Mock()
        self.runner.step = Mock()
        self.runner.checkpoint = self.runner.save
        self.runner.close_server = Mock()

    def test_auth_failure_pauses_without_retry_storm(self):
        self.runner.github.ensure_labels.side_effect = m.Attention('GitHub 登录失效')
        self.runner.run(once=True)
        self.assertEqual(self.runner.state['status'],'needs_attention')
        self.assertTrue((self.root/'paused').exists())
        self.runner.run(once=True)
        self.runner.github.ensure_labels.assert_called_once()
        self.runner.step.assert_not_called()

    def test_future_backoff_prevents_startup_network_requests(self):
        deadline=time.time()+600
        self.runner.state.update(status='waiting:retry',next_run_at=deadline)
        self.runner.run(once=True)
        self.runner.github.ensure_labels.assert_not_called()
        self.assertEqual(self.runner.state['next_run_at'],deadline)

    def test_network_failure_uses_regular_backoff(self):
        self.runner.github.ensure_labels.side_effect = RuntimeError('TLS connection failed')
        self.runner.run(once=True)
        self.assertEqual(self.runner.state['status'],'waiting:retry')
        self.assertEqual(self.runner.state['failures'],1)
        self.assertGreater(self.runner.state['next_run_at'],time.time())
        self.runner.step.assert_not_called()

    def test_quota_failure_preserves_server_reset_deadline(self):
        self.runner.github.ensure_labels.side_effect=m.QuotaWait(12345678999,'GitHub 请求受限')
        self.runner.run(once=True)
        self.assertEqual(self.runner.state['status'],'waiting:quota')
        self.assertEqual(self.runner.state['next_run_at'],12345678999)


if __name__ == '__main__':
    unittest.main()
