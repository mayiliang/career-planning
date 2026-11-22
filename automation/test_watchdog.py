"""Offline wall-clock stall recovery: no real app-server, models, or GitHub."""
import json
import unittest
from unittest.mock import Mock, patch

import auto_coding as m
import test_team as fixtures
FakeRPC, event, collab = fixtures.FakeRPC, fixtures.event, fixtures.collab


class Clock:
    wall = 10000
    mono = 100
    def advance(self, wall, mono=1):
        self.wall += wall
        self.mono += mono


class ScriptRPC(FakeRPC):
    def __init__(self, clock, script):
        super().__init__()
        self.clock, self.script = clock, list(script)
        self.closed = False
    def receive(self):
        if not self.script:
            raise AssertionError('Unexpected receive after scripted outcome')
        wall, mono, result = self.script.pop(0)
        self.clock.advance(wall, mono)
        if isinstance(result, BaseException):
            raise result
        return result
    def close(self):
        self.closed = True


class WatchdogClockTests(unittest.TestCase):
    def test_validated_configuration(self):
        for value in [None, False, 0, -1, '1800', float('nan'), float('inf')]:
            self.assertEqual(m.protocol_idle_timeout({'protocol_idle_timeout_seconds': value}), 1800)
        self.assertEqual(m.protocol_idle_timeout({'protocol_idle_timeout_seconds': 60}), 60)

    def test_sleep_counts_and_rollback_preserves_idle_without_false_expiry(self):
        clock=Clock()
        with patch.object(m.time, 'time', side_effect=lambda:clock.wall), patch.object(m.time, 'monotonic', side_effect=lambda:clock.mono):
            watchdog=m.ProtocolWatchdog(1800)
            clock.advance(100,100);watchdog.check()
            clock.advance(-3600,1);watchdog.check()
            clock.advance(1600,1600);watchdog.check()
            clock.advance(101,101)
            with self.assertRaises(m.TurnFailure):watchdog.check()
            watchdog.progress()
            clock.advance(1801,1)  # macOS suspended monotonic, but real time elapsed
            with self.assertRaises(m.TurnFailure):watchdog.check()


class RunnerWatchdogTests(unittest.TestCase):
    setUp = fixtures.RunnerProtocolTests.setUp
    root_completion = fixtures.RunnerProtocolTests.root_completion

    def clocked(self, script):
        clock=Clock()
        rpc=ScriptRPC(clock, script)
        self.runner.rpc=rpc
        self.runner.server=lambda:rpc
        self.runner.state.update(phase='plan',cycle=0)
        self.runner.github=Mock()
        self.runner.step=lambda:self.runner._agent('plan', {})
        self.clock_patch=patch.object(m.time,'time',side_effect=lambda:clock.wall)
        self.mono_patch=patch.object(m.time,'monotonic',side_effect=lambda:clock.mono)
        self.clock_patch.start();self.mono_patch.start()
        self.addCleanup(self.clock_patch.stop);self.addCleanup(self.mono_patch.stop)
        return clock,rpc

    def test_wall_stall_preserves_active_interrupts_and_closes_connection_with_backoff(self):
        clock,rpc=self.clocked([
            (0,0,collab(model='gpt-6.1-sol')),
            (0,0,event('turn/started',threadId='sol-id',turn={'id':'s-turn','status':'inProgress'})),
            (1801,1,None),
        ])
        self.runner.run(once=True)
        self.assertEqual(self.runner.state['status'],'waiting:retry')
        self.assertIsNotNone(self.runner.state['active'])
        self.assertEqual(self.runner.state['active']['thread_id'],'root')
        self.assertEqual(self.runner.state['active']['protocol_idle_timeout_seconds'],1800)
        self.assertGreater(self.runner.state['next_run_at'],clock.wall)
        self.assertEqual({r['params']['threadId'] for r in rpc.sent},{'root','sol-id'})
        self.assertTrue(rpc.closed);self.assertIsNone(self.runner.rpc)
        self.runner.checkpoint.assert_called()
        self.assertFalse((self.runner.runtime/'runs/existing/result.json').exists())

    def test_reconnecting_errors_do_not_immediately_fail_or_keep_stalled_turn_alive(self):
        retry=event('error',threadId='root',turnId='root-turn',willRetry=True,error={'message':'stream disconnected Bearer secret123'})
        clock,rpc=self.clocked([(600,1,retry),(600,1,retry),(601,1,None)])
        self.runner.run(once=True)
        self.assertEqual(self.runner.state['status'],'waiting:retry')
        active=self.runner.state['active']
        self.assertEqual(active['last_progress_at'],10000)
        self.assertEqual(active['last_event_at'],active['last_transport_error']['at'])
        self.assertTrue(active['last_transport_error']['will_retry'])
        self.assertNotIn('secret123',json.dumps(active))
        self.assertEqual(len(rpc.script),0)
        self.assertTrue(rpc.closed)

    def test_legitimate_parent_and_child_progress_reset_idle_and_clear_old_errors(self):
        retry=event('error',threadId='root',willRetry=True,error={'message':'reconnecting'})
        _,rpc=self.clocked([
            (500,1,retry),
            (500,1,collab(model='gpt-6.1-sol')),
            (1000,1,event('turn/started',threadId='sol-id',turn={'id':'s-turn','status':'inProgress'})),
            (1000,1,event('item/commandExecution/outputDelta',threadId='sol-id',delta='progress')),
            (1000,1,event('turn/completed',threadId='sol-id',turn={'id':'s-turn','status':'completed'})),
            (1000,1,self.root_completion()[0]),(0,0,self.root_completion()[1]),
        ])
        self.runner.state['active']['last_transport_error']={'message':'obsolete'}
        self.assertEqual(self.runner._agent('plan',{}),{'from':'root'})
        self.assertNotIn('last_transport_error',self.runner.state['active'])
        self.assertGreater(self.runner.state['active']['last_event_at'],10000+1800)
        self.assertFalse(rpc.closed)

    def test_global_notifications_and_other_roots_do_not_hide_stall(self):
        _,rpc=self.clocked([
            (1000,1,event('account/rateLimits/updated',rateLimits={})),
            (801,1,event('item/agentMessage/delta',threadId='other',delta='unrelated')),
        ])
        self.runner.run(once=True)
        self.assertEqual(self.runner.state['status'],'waiting:retry')
        self.assertEqual(self.runner.state['active']['last_event_at'],10000)
        self.assertTrue(rpc.closed)

    def test_terminal_error_fails_early_but_quota_keeps_wait_deadline(self):
        for quota in (False,True):
            with self.subTest(quota=quota):
                message={'message':'fatal transport'} if not quota else {'codexErrorInfo':'usageLimitExceeded','message':'quota exceeded'}
                self.runner.state.pop('next_run_at', None)
                clock,rpc=self.clocked([(1,1,event('error',threadId='root',willRetry=False,error=message))])
                self.runner.run(once=True)
                self.assertEqual(self.runner.state['status'],'waiting:quota' if quota else 'waiting:retry')
                self.assertTrue(rpc.closed)
                if quota:
                    self.assertEqual(self.runner.state['quota']['ordinaryUsageAllowed'],False)
                    self.assertGreater(self.runner.state['next_run_at'],9999999999)
                # The next iteration intentionally reuses the fixture and new clock.
                self.clock_patch.stop();self.mono_patch.stop()

    def test_pause_has_precedence_over_stall_and_preserves_quota(self):
        clock,rpc=self.clocked([(1801,1,m.Paused())])
        self.runner.state['quota']={'ordinaryUsageAllowed':False}
        self.runner.state['next_run_at']=123456
        with self.assertRaises(m.Paused):self.runner._agent('plan',{})
        self.assertEqual(self.runner.state['next_run_at'],123456)
        self.assertFalse(self.runner.state['quota']['ordinaryUsageAllowed'])
        self.assertTrue(rpc.sent)


    def test_configured_timeout_and_stale_parent_turn_do_not_reset_watchdog(self):
        self.runner.config['protocol_idle_timeout_seconds'] = 60
        _,rpc=self.clocked([
            (30,1,event('item/agentMessage/delta',threadId='root',turnId='previous-turn',delta='old')),
            (31,1,None),
        ])
        self.runner.run(once=True)
        self.assertEqual(self.runner.state['status'],'waiting:retry')
        self.assertEqual(self.runner.state['active']['protocol_idle_timeout_seconds'],60)
        self.assertEqual(self.runner.state['active']['last_progress_at'],10000)
        self.assertIn('60 秒',self.runner.state['last_error'])
        self.assertTrue(rpc.closed)

    def test_existing_monotonic_turn_limit_still_applies(self):
        _,rpc=self.clocked([(31,31,None)])
        with self.assertRaisesRegex(m.TurnFailure,'单轮超过'):
            self.runner._agent('plan',{})
        self.assertTrue(rpc.sent)


if __name__=='__main__':unittest.main()
