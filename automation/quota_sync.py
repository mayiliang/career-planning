"""Shared, read-only Codex quota queries. Never edits scheduler state or runs a model."""
from __future__ import annotations
import contextlib
import copy
import fcntl
import json
import math
import os
from pathlib import Path
import queue
import re
import signal
import subprocess
import threading
import time
import uuid

SOURCE = 'Codex app-server'


def read(path):
    try:
        value = json.loads(path.read_text())
        return value if isinstance(value, dict) else {}
    except (OSError, ValueError):
        return {}


def finite(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def bucket(snapshot):
    named = snapshot.get('rateLimitsByLimitId') or {}
    if isinstance(named, dict) and isinstance(named.get('codex'), dict):
        return named['codex']
    legacy = snapshot.get('rateLimits') or {}
    return legacy if isinstance(legacy, dict) and legacy.get('limitId') in (None, 'codex') else {}


def window_valid(window):
    return isinstance(window, dict) and finite(window.get('usedPercent')) and 0 <= window['usedPercent'] <= 100


def sanitize(snapshot):
    def clean(value):
        if not isinstance(value, dict):
            return {}
        out = {key: value[key] for key in ('limitId', 'spendControlReached', 'rateLimitReachedType')
               if key in value and isinstance(value[key], (str, bool, type(None)))}
        for key in ('primary', 'secondary'):
            if isinstance(value.get(key), dict):
                out[key] = {k: v for k, v in value[key].items() if k in ('usedPercent', 'windowDurationMins', 'resetsAt') and finite(v)}
        return out
    out = {key: snapshot[key] for key in ('ordinaryUsageAllowed', 'spendControlReached', 'rateLimitReachedType')
           if key in snapshot and isinstance(snapshot[key], (bool, str, type(None)))}
    if isinstance(snapshot.get('rateLimits'), dict):
        out['rateLimits'] = clean(snapshot['rateLimits'])
    if isinstance(snapshot.get('rateLimitsByLimitId'), dict):
        out['rateLimitsByLimitId'] = {str(key): clean(value) for key, value in snapshot['rateLimitsByLimitId'].items() if isinstance(value, dict)}
    return out


def valid_full(snapshot):
    if not isinstance(snapshot, dict) or not isinstance(snapshot.get('ordinaryUsageAllowed'), bool):
        return False
    selected = bucket(snapshot)
    return all(window_valid(selected.get(key)) for key in ('primary', 'secondary'))


def available(snapshot):
    if not valid_full(snapshot) or snapshot['ordinaryUsageAllowed'] is not True:
        return False
    selected = bucket(snapshot)
    return not (snapshot.get('spendControlReached') or snapshot.get('rateLimitReachedType') or
                selected.get('spendControlReached') or selected.get('rateLimitReachedType') or
                any(selected[key]['usedPercent'] >= 100 for key in ('primary', 'secondary')))


def merge_event(previous, event):
    """Partial events are display evidence, never a replacement for a full query."""
    out = copy.deepcopy(previous or {})
    updates = dict(event.get('rateLimitsByLimitId') or {})
    legacy = event.get('rateLimits')
    if isinstance(legacy, dict):
        updates[legacy.get('limitId') or event.get('limitId') or 'codex'] = legacy
    if 'codex' in updates or not updates:
        out.pop('ordinaryUsageAllowed', None)
        if isinstance(event.get('ordinaryUsageAllowed'), bool):
            out['ordinaryUsageAllowed'] = event['ordinaryUsageAllowed']
    for key, value in updates.items():
        if not isinstance(value, dict):
            continue
        old = out.setdefault('rateLimitsByLimitId', {}).get(key) or (bucket(out) if key == 'codex' else {})
        out['rateLimitsByLimitId'][key] = {**old, **sanitize({'rateLimits': value}).get('rateLimits', {})}
        if key == 'codex':
            out['rateLimits'] = copy.deepcopy(out['rateLimitsByLimitId'][key])
    return sanitize(out)


def safe_error(error):
    text = str(error)
    text = re.sub(r'(?i)(bearer\s+)[\w.\-]+', r'\1[已隐藏]', text)
    text = re.sub(r'\b(?:gh[pousr]_[\w]+|github_pat_[\w]+|sk-[\w-]{12,})\b', '[已隐藏]', text)
    text = re.sub(r'(https?://)[^\s/@]+:[^\s/@]+@', r'\1[已隐藏]@', text)
    text = re.sub(r'(https?://[^\s?]+)\?[^\s]+', r'\1?[已隐藏]', text)
    return text[:400]


def query_native(config, runtime):
    """Only initialize and account/rateLimits/read; bounded wall time, isolated transport."""
    inbox = queue.Queue()
    with open(runtime / 'quota-query.stderr.log', 'a') as errors:
        process = subprocess.Popen([config['codex'], 'app-server'], cwd=config['workspace'],
                    stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=errors, text=True, start_new_session=True)
        def reader():
            try:
                for line in process.stdout:
                    with contextlib.suppress(ValueError):
                        inbox.put(json.loads(line))
            finally:
                inbox.put({'_eof': True})
        threading.Thread(target=reader, daemon=True).start()
        def send(value):
            process.stdin.write(json.dumps(value)+'\n'); process.stdin.flush()
        def response(request_id):
            deadline = time.time()+45
            monotonic_deadline = time.monotonic()+45
            while time.time() < deadline and time.monotonic() < monotonic_deadline:
                try: value = inbox.get(timeout=.5)
                except queue.Empty: continue
                if value.get('_eof'):
                    raise RuntimeError('额度查询进程退出')
                if value.get('id') == request_id:
                    if 'error' in value:
                        raise RuntimeError('额度查询失败：'+safe_error(value['error']))
                    return value.get('result')
            raise TimeoutError('额度查询超时，请稍后重试')
        try:
            send({'id':1,'method':'initialize','params':{'clientInfo':{'name':'career_quota_sync','version':'1.0'}}})
            response(1)
            send({'method':'initialized','params':{}})
            send({'id':2,'method':'account/rateLimits/read','params':{}})
            return response(2)
        finally:
            with contextlib.suppress(ProcessLookupError): os.killpg(process.pid, signal.SIGTERM)
            try: process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                with contextlib.suppress(ProcessLookupError): os.killpg(process.pid, signal.SIGKILL)
                process.wait(timeout=5)
            process.stdin.close(); process.stdout.close()


class QuotaCache:
    def __init__(self, runtime):
        self.runtime = Path(runtime)
        self.path = self.runtime/'quota-cache.json'

    @contextlib.contextmanager
    def locked(self):
        self.runtime.mkdir(parents=True,exist_ok=True)
        with open(self.runtime/'quota-cache.lock','a') as lock:
            fcntl.flock(lock,fcntl.LOCK_EX)
            yield

    def write(self, value):
        path = self.runtime/('quota-cache-'+uuid.uuid4().hex+'.tmp')
        try:
            with open(path,'w') as out:
                os.chmod(path,0o600);json.dump(value,out);out.flush();os.fsync(out.fileno())
            os.replace(path,self.path)
        finally:
            path.unlink(missing_ok=True)

    def record(self, snapshot, started_at=None, checked_at=None):
        if not valid_full(snapshot):
            raise ValueError('额度响应不完整，不能确认可用状态')
        started_at = time.time() if started_at is None else started_at
        checked_at = time.time() if checked_at is None else checked_at
        with self.locked():
            current = read(self.path)
            if started_at < current.get('sample_started_at', 0):
                return False
            current.pop('event_snapshot', None)
            current.pop('event_at', None)
            current.update(snapshot=sanitize(snapshot),sample_started_at=started_at,checked_at=checked_at,
                           last_attempt_at=max(started_at,current.get('last_attempt_at',0)),error=None)
            self.write(current)
        return True

    def record_event(self, event):
        with self.locked():
            current = read(self.path)
            previous = (current.get('event_snapshot') if current.get('event_at',0) > current.get('checked_at',0) else None) or current.get('snapshot') or {}
            current['event_snapshot'] = merge_event(previous, event)
            current['event_at'] = time.time()
            self.write(current)

    def refresh(self, max_age=60, force=False, fetch=None):
        with open(self.runtime/'quota-query.lock','a') as query_lock:
            try: fcntl.flock(query_lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
            except BlockingIOError:return False
            started = time.time()
            with self.locked():
                current=read(self.path)
                last=current.get('last_attempt_at')
                interval=10 if force else max_age
                if finite(last) and 0 <= started-last < interval:
                    return False
                current['last_attempt_at']=started;self.write(current)
            try:
                value = fetch() if fetch else query_native(read(self.runtime/'config.json'),self.runtime)
                self.record(value,started,time.time())
                return True
            except Exception as error:
                with self.locked():
                    current=read(self.path)
                    # A newer full result must not be poisoned by an older failed query.
                    if current.get('sample_started_at',0) <= started:
                        current['error']=safe_error(error);self.write(current)
                return False

    def checking(self):
        if not (self.runtime/'quota-query.lock').exists():return False
        with open(self.runtime/'quota-query.lock','a') as lock:
            try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
            except BlockingIOError:return True
        return False

    def get(self, refresh=False, max_age=60, start_refresh=True, fallback=None, fallback_at=None):
        current=read(self.path)
        attempt=current.get('last_attempt_at')
        interval=10 if refresh else max_age
        due=not finite(attempt) or not 0 <= time.time()-attempt < interval
        configured=bool(read(self.runtime/'config.json').get('codex'))
        scheduled=bool(start_refresh and configured and due and not self.checking())
        if scheduled:
            threading.Thread(target=self.refresh,kwargs={'max_age':max_age,'force':refresh},daemon=True).start()
        complete_snapshot=current.get('snapshot') or sanitize(fallback or {})
        snapshot=complete_snapshot
        if current.get('event_at',0) > current.get('checked_at',0):
            snapshot=current.get('event_snapshot') or snapshot
        checked=current.get('checked_at') or fallback_at
        selected=bucket(snapshot)
        # A partial live event can update percentages without an allowance flag.
        # It does not invalidate the successful full query's freshness; only
        # the separate complete snapshot can ever authorize scheduler recovery.
        stale=not finite(checked) or not 0 <= time.time()-checked <= max_age or bool(current.get('error')) or not valid_full(complete_snapshot)
        attempt=current.get('last_attempt_at')
        return {'primary':selected.get('primary'),'secondary':selected.get('secondary'),
                'allowed':snapshot.get('ordinaryUsageAllowed'),'checked_at':checked,'checking':scheduled or self.checking(),
                'last_attempt_at':attempt,'error':current.get('error') or (None if configured else '尚未配置 Codex 额度查询程序'),'stale':stale or not configured,
                'next_check_at':(attempt+max_age) if finite(attempt) else time.time(), 'source':SOURCE}
