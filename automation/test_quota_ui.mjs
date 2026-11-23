import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('./console/app.js', import.meta.url), 'utf8');
const section = source.slice(source.indexOf('let quotaData ='), source.indexOf('\nfunction renderRoles('));
const context = vm.createContext({Date, Number, Math, AbortController, setTimeout, clearTimeout, fetch: null});
const wording = source.slice(source.indexOf('function quotaWaitNext('), source.indexOf('function updateCountdown('));
vm.runInContext(section + '\nrenderQuota = () => {};\n' + wording + '\nfunction date(v){return `时间${v}`;} function countdown(){return "5 分钟";}', context);
const run = code => vm.runInContext(code, context);

run("acceptQuota({checked_at:100,last_attempt_at:200,checking:true,primary:{usedPercent:50}})");
run("acceptQuota({checked_at:100,last_attempt_at:200,checking:false,error:'查询失败',primary:{usedPercent:50}})");
assert.equal(run('quotaData.checking'), false);
assert.equal(run('quotaData.error'), '查询失败');
run("acceptQuota({checked_at:100,last_attempt_at:200,checking:true,primary:{usedPercent:50}})");
assert.equal(run('quotaData.checking'), false);
assert.equal(run('quotaData.error'), '查询失败');
// A force refresh can start before the server persists the new attempt time.
run("acceptQuota({checked_at:100,last_attempt_at:200,checking:true,primary:{usedPercent:50}}, true)");
assert.equal(run('quotaData.checking'), true);
run("acceptQuota({checked_at:100,last_attempt_at:250,checking:false,error:'新查询失败',primary:{usedPercent:50}})");
assert.equal(run('quotaData.checking'), false);
assert.equal(run('quotaData.last_attempt_at'), 250);
run("acceptQuota({checked_at:100,last_attempt_at:200,checking:true,primary:{usedPercent:50}})");
assert.equal(run('quotaData.checking'), false);
run("acceptQuota({checked_at:300,last_attempt_at:300,checking:false,primary:{usedPercent:4}})");
run("acceptQuota({checked_at:100,last_attempt_at:200,checking:false,primary:{usedPercent:100}})");
assert.equal(run('quotaData.primary.usedPercent'), 4);
run("acceptQuota({checked_at:100,last_attempt_at:400,checking:false,error:'失败',primary:{usedPercent:100}})");
assert.equal(run('quotaData.primary.usedPercent'), 4);
assert.equal(run('quotaData.error'), '失败');

context.fetch = (_url, {signal}) => new Promise((_resolve, reject) => {
  signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), {name:'AbortError'})));
});
run("quotaData = {checked_at:300,last_attempt_at:300,checking:false,primary:{usedPercent:4}}; refreshQuota(true); stopQuotaPolling();");
await new Promise(resolve => setImmediate(resolve));
assert.equal(run('quotaData.error'), undefined);
assert.equal(run('quotaRequesting'), false);
assert.match(run("quotaWaitNext({next_run_at:999}, {next_check_at:123,allowed:false})"), /时间123/);
assert.doesNotMatch(run("quotaWaitNext({next_run_at:999}, {next_check_at:123,allowed:false})"), /999/);
assert.match(run("quotaWaitNext({}, {checking:true})"), /正在同步/);
assert.match(run("quotaWaitNext({}, {allowed:true,stale:false})"), /等待调度器确认/);
assert.match(run("quotaWaitNext({}, {allowed:true,stale:true})"), /等待下次检查/);
assert.match(run("quotaWaitNext({quota_wait_scope:'github',next_run_at:999}, {})"), /时间999/);
console.log('quota UI behavior: passed');
