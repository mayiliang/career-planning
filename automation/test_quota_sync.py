"""Quota cache and scheduler recovery tests. Every native query is faked."""
import copy
import fcntl
import json
import multiprocessing
from pathlib import Path
import tempfile
import threading
import time
import unittest
from unittest.mock import Mock, patch

import auto_coding as m
import console_server as console
import quota_sync as q


def full(allowed=True, used=4):
    selected={'limitId':'codex','primary':{'usedPercent':5,'resetsAt':time.time()+300},
              'secondary':{'usedPercent':used,'resetsAt':time.time()+86400},
              'spendControlReached':False,'rateLimitReachedType':None}
    return {'ordinaryUsageAllowed':allowed,'rateLimits':selected,'rateLimitsByLimitId':{'codex':copy.deepcopy(selected)}}


def child_refresh(path, output):
    cache=q.QuotaCache(path)
    output.put(cache.refresh(fetch=lambda:full()))


class CacheTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name);self.cache=q.QuotaCache(self.root)
        m.atomic_json(self.root/'config.json',{'repository':'owner/repo','workspace':str(self.root),'codex':'fake-codex'})

    def test_failure_and_invalid_response_preserve_success_time_and_values(self):
        started=time.time()-1000;self.cache.record(full(False,100),started,started)
        for fetch in (lambda:{},Mock(side_effect=RuntimeError('Bearer private123 ghp_private123'))):
            self.assertFalse(self.cache.refresh(force=True,fetch=fetch))
            current=q.read(self.cache.path)
            self.assertEqual(current['checked_at'],started)
            self.assertFalse(current['snapshot']['ordinaryUsageAllowed'])
            view=self.cache.get(start_refresh=False)
            self.assertTrue(view['stale']);self.assertTrue(view['error'])
            self.assertNotIn('private123',json.dumps(view))
            with self.cache.locked():
                current=q.read(self.cache.path);current['last_attempt_at']=time.time()-11;self.cache.write(current)

    def test_full_premium_then_codex_partial_cannot_resurrect_old_window(self):
        self.cache.record(full(False,100),time.time()-100,time.time()-100)
        self.cache.record_event({'rateLimits':{'limitId':'codex','secondary':{'usedPercent':100}}})
        self.cache.record(full(True,4))
        self.cache.record_event({'rateLimits':{'limitId':'codex_premium','primary':None,'secondary':None}})
        view=self.cache.get(start_refresh=False)
        self.assertEqual(view['secondary']['usedPercent'],4)
        self.assertTrue(view['allowed']);self.assertFalse(view['stale'])
        self.cache.record_event({'rateLimits':{'limitId':'codex','primary':{'usedPercent':6}}})
        view=self.cache.get(start_refresh=False)
        self.assertEqual(view['secondary']['usedPercent'],4)
        self.assertIsNone(view['allowed'])
        self.assertEqual(q.read(self.cache.path)['snapshot']['ordinaryUsageAllowed'],True)
        self.assertEqual(q.read(self.cache.path)['snapshot']['rateLimits']['primary']['usedPercent'],5)

    def test_named_premium_bucket_does_not_override_legacy_codex(self):
        old=full(False,100);old.pop('rateLimitsByLimitId')
        merged=q.merge_event(old,{'rateLimits':{'limitId':'premium','primary':None}})
        self.assertEqual(q.bucket(merged)['secondary']['usedPercent'],100)
        self.assertFalse(merged['ordinaryUsageAllowed'])
        merged=q.merge_event(merged,{'rateLimits':{'limitId':'codex','primary':{'usedPercent':1}}})
        self.assertEqual(q.bucket(merged)['secondary']['usedPercent'],100)
        self.assertNotIn('ordinaryUsageAllowed',merged)

    def test_newer_full_sample_wins_over_late_response_or_failure(self):
        now=time.time();self.cache.record(full(True,4),now,now)
        self.assertFalse(self.cache.record(full(False,100),now-10,now+10))
        self.assertEqual(self.cache.get(start_refresh=False)['secondary']['usedPercent'],4)
        def late_failure():
            self.cache.record(full(True,3),time.time()+1,time.time()+1)
            raise RuntimeError('older failure')
        self.cache.refresh(force=True,fetch=late_failure)  # initially throttled
        with self.cache.locked():
            data=q.read(self.cache.path);data['last_attempt_at']=now-11;self.cache.write(data)
        self.cache.refresh(force=True,fetch=late_failure)
        self.assertIsNone(q.read(self.cache.path)['error'])
        self.assertEqual(q.bucket(q.read(self.cache.path)['snapshot'])['secondary']['usedPercent'],3)

    def test_async_cold_start_single_flight_and_ttl(self):
        entered,release=threading.Event(),threading.Event()
        def fetch(*args):entered.set();release.wait(2);return full()
        with patch.object(q,'query_native',side_effect=fetch) as query:
            began=time.monotonic();view=self.cache.get()
            self.assertTrue(view['checking']);self.assertTrue(view['stale']);self.assertIsNone(view['allowed'])
            self.assertLess(time.monotonic()-began,.2);self.assertTrue(entered.wait(1))
            for _ in range(10):self.cache.get(refresh=True)
            self.assertEqual(query.call_count,1)
            release.set()
            deadline=time.monotonic()+2
            while self.cache.checking() and time.monotonic()<deadline:time.sleep(.002)
            self.assertTrue(self.cache.get()['allowed'])
            for _ in range(10):self.cache.get(refresh=True)
            self.assertEqual(query.call_count,1)

    def test_query_lock_deduplicates_across_processes(self):
        ctx=multiprocessing.get_context('spawn');output=ctx.Queue()
        with open(self.root/'quota-query.lock','a') as lock:
            fcntl.flock(lock,fcntl.LOCK_EX)
            process=ctx.Process(target=child_refresh,args=(str(self.root),output));process.start()
            self.assertFalse(output.get(timeout=3));process.join(3)
            self.assertEqual(process.exitcode,0)
        self.assertFalse(self.cache.path.exists())

    def test_invalid_and_service_blocked_never_count_available(self):
        for bad in ({},{'ordinaryUsageAllowed':True},full(True,100),full(False,4)):
            self.assertFalse(q.available(bad))
        denied=full();denied['rateLimitsByLimitId']['codex']['spendControlReached']=True
        self.assertFalse(q.available(denied))
        wrong=full();wrong['rateLimitsByLimitId']={'premium':wrong['rateLimits']};wrong['rateLimits']['limitId']='premium'
        self.assertFalse(q.available(wrong))


class RunnerTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name)
        m.atomic_json(self.root/'config.json',{'repository':'owner/repo','workspace':str(self.root),'codex':'fake-codex'})
        self.runner=m.Runner(self.root);self.runner.log=Mock()
        self.runner.state={'phase':'review','status':'waiting:quota','quota':full(False,100),
                           'quota_checked_at':time.time()-42*3600,'next_run_at':time.time()+4*86400,
                           'last_error':'Codex 额度耗尽','active':{'thread_id':'original','run_id':'a'*32}}
        self.cache=q.QuotaCache(self.root)
        self.query=patch.object(q,'query_native',return_value=full());self.fake_query=self.query.start();self.addCleanup(self.query.stop)

    def test_fresh_cache_unlocks_old_reset_and_preserves_phase_and_thread(self):
        self.cache.record(full())
        self.runner.sync_quota_cache()
        self.assertEqual(self.runner.state['status'],'ready:review')
        self.assertNotIn('next_run_at',self.runner.state)
        self.assertEqual(self.runner.state['active']['thread_id'],'original')
        self.assertEqual(self.runner.state['quota']['ordinaryUsageAllowed'],True)

    def test_no_console_waiting_runner_queries_again_after_five_minutes(self):
        self.cache.record(full(False,100),time.time()-301,time.time()-301)
        self.runner.sync_quota_cache()
        deadline=time.monotonic()+2
        while (self.cache.checking() or not self.fake_query.called) and time.monotonic()<deadline:time.sleep(.002)
        self.runner.sync_quota_cache()
        self.assertEqual(self.runner.state['status'],'ready:review')
        self.fake_query.assert_called_once()

    def test_paused_github_and_other_states_are_not_unlocked(self):
        self.cache.record(full())
        for state in ({'status':'paused','resume_status':'waiting:quota'},
                      {'status':'waiting:quota','quota_wait_scope':'github','last_error':'GitHub 请求受限'},
                      {'status':'waiting:retry'},{'status':'running:review'}):
            with self.subTest(state=state):
                original={'phase':'review','next_run_at':time.time()+86400,'quota':full(False,100),**state}
                self.runner.state=copy.deepcopy(original)
                self.runner.sync_quota_cache()
                self.assertEqual(self.runner.state['status'],original['status'])
                self.assertEqual(self.runner.state['next_run_at'],original['next_run_at'])
        (self.root/'paused').touch()
        self.runner.state.update(status='waiting:quota',last_error='Codex 额度耗尽')
        self.runner.sync_quota_cache()
        self.assertEqual(self.runner.state['status'],'waiting:quota')

    def test_failed_query_or_partial_event_cannot_unlock(self):
        self.cache.record(full(False,100),time.time()-100,time.time()-100)
        self.cache.record_event({'rateLimits':{'limitId':'codex','primary':{'usedPercent':1},'secondary':{'usedPercent':4}},'ordinaryUsageAllowed':True})
        self.runner.sync_quota_cache()
        self.assertEqual(self.runner.state['status'],'waiting:quota')
        self.cache.record(full())
        with self.cache.locked():
            data=q.read(self.cache.path);data['error']='failed query';self.cache.write(data)
        self.runner.sync_quota_cache()
        self.assertEqual(self.runner.state['status'],'waiting:quota')

    def test_new_error_needs_a_query_newer_than_the_error(self):
        self.cache.record(full(),time.time()-10,time.time()-10)
        self.runner.state['quota_wait_since']=time.time()
        self.runner.sync_quota_cache()
        self.assertEqual(self.runner.state['status'],'waiting:quota')


    def test_public_wait_scope_is_whitelisted_with_legacy_fallback(self):
        self.cache.record(full())
        store=console.ControlStore(self.root)
        for fields, expected in [
            ({'quota_wait_scope':'github'},'github'),
            ({'quota_wait_scope':'codex'},'codex'),
            ({'last_error':'GitHub 请求受限 HTTP 403'},'github'),
            ({'last_error':'Codex 额度耗尽'},'codex'),
            ({'quota_wait_scope':'ghp_neverexpose'},'codex'),
            ({'status':'running:review','quota_wait_scope':'github'},None),
            ({'status':'paused','resume_status':'waiting:quota','last_error':'GitHub 请求受限'},'github'),
        ]:
            with self.subTest(fields=fields):
                state={'phase':'review','status':'waiting:quota',**fields}
                m.atomic_json(self.root/'state.json',state)
                view=store.snapshot()
                self.assertEqual(view['quota_wait_scope'],expected)
                self.assertNotIn('ghp_neverexpose',json.dumps(view))

    def test_console_uses_shared_cache_without_mutating_runner_state(self):
        self.cache.record(full())
        m.atomic_json(self.root/'state.json',self.runner.state)
        before=(self.root/'state.json').read_bytes()
        view=console.ControlStore(self.root).snapshot()['quota']
        self.assertTrue(view['allowed']);self.assertFalse(view['stale'])
        self.assertEqual(view['source'],'Codex app-server')
        self.assertEqual((self.root/'state.json').read_bytes(),before)


if __name__=='__main__':unittest.main()
