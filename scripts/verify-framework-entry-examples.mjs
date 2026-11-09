import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(resolve('apps/web/package.json'));
const { chromium } = require('@playwright/test');
const evidence = resolve('tmp/framework-entry-evidence');
mkdirSync(evidence, { recursive: true });
const children = [];
const results = [];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let page = await browser.newPage();
const logs = [];
page.on('console', msg => logs.push(msg.text()));
const project = framework => resolve('tmp/framework-entry-examples', framework);
function command(framework, script, success = true) {
  const result = spawnSync('npm', ['run', script], { cwd: project(framework), encoding: 'utf8' });
  results.push({ framework, script, expectedSuccess: success, status: result.status, output: result.stdout + result.stderr });
  assert.equal(result.status === 0, success, `${framework} ${script}: ${result.stdout}${result.stderr}`);
}
async function start(framework, port, mode = 'dev') {
  const cwd = project(framework);
  const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', ...(mode === 'preview' ? ['preview'] : []), '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd, stdio: 'pipe' });
  children.push(child);
  let output = '';
  child.stdout.on('data', data => { output += data; }); child.stderr.on('data', data => { output += data; });
  for (let n = 0; n < 100; n++) {
    if (child.exitCode !== null) throw new Error(output);
    try { if ((await fetch(`http://127.0.0.1:${port}`)).ok) return `http://127.0.0.1:${port}`; } catch { /* 等开发服务 */ }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error(`启动失败 ${output}`);
}
async function stop(child) {
  if (child.exitCode !== null) return;
  await new Promise(r => { child.once('exit', r); child.kill(); });
}
try {
  for (const framework of ['react', 'vue']) { command(framework, 'typecheck'); command(framework, 'build'); }
  const reactUrl = await start('react', 42742);
  const vueUrl = await start('vue', 42743);
  const click = label => page.getByRole('button', { name: label, exact: true }).click();
  async function count(expected) { await page.waitForFunction(value => document.querySelector('output')?.textContent === String(value), expected); }
  const reactApp = resolve(project('react'), 'src/App.tsx');
  const reactSource = readFileSync(reactApp, 'utf8');
  async function sequences(initial) {
    const traces = [];
    for (const functional of [false, true]) {
      await page.goto(reactUrl); await count(initial);
      await click(functional ? '函数三次' : '值式三次'); await count(initial + (functional ? 3 : 1));
      traces.push({ type: functional ? '单事件函数式' : '单事件值式', count: initial + (functional ? 3 : 1) });
    }
    await page.goto(reactUrl); await count(initial);
    for (let n = 1; n <= 3; n++) { await click('值式三次'); await count(initial + n); }
    traces.push({ type: '三次独立点击', counts: [initial + 1, initial + 2, initial + 3] });
    for (const functional of [false, true]) {
      await page.goto(reactUrl); await count(initial); logs.length = 0;
      await click(functional ? '预约函数回调' : '预约值式回调');
      await click('函数三次'); await count(initial + 3);
      await click('释放一个回调'); await count(initial + (functional ? 4 : 1));
      await click('释放一个回调'); await count(initial + (functional ? 5 : 1));
      const callbacks = logs.filter(x => x.startsWith('callback'));
      assert.deepEqual(callbacks, [`callback 1 snapshot ${initial}`, `callback 2 snapshot ${initial}`]);
      traces.push({ type: functional ? '延迟函数式' : '延迟值式', logs: [...logs] });
    }
    results.push({ initial, traces });
  }
  await sequences(0);
  await page.screenshot({ path: resolve(evidence, 'react-fixture.png') });
  try { writeFileSync(reactApp, reactSource.replace('useState(0)', 'useState(10)')); await sequences(10); }
  finally { writeFileSync(reactApp, reactSource); }
  const reactGuide = readFileSync('docs/knowledge/chinese-guides/react-01-render-purity-state-snapshot.md', 'utf8');
  const pureSource = reactGuide.match(/```js example=react01-purity\n([\s\S]*?)\n```/)[1];
  const purity = await page.evaluate(source => {
    const output = [];
    new Function('console', source)({ log: value => output.push(JSON.parse(value)), assert: condition => { if (!condition) throw new Error('纯度断言失败'); } });
    return output[0];
  }, pureSource);
  assert.deepEqual(purity, { bad: ['资料,占位', '资料,占位,占位'], badInput: ['资料', '占位', '占位'], good: ['资料,占位', '资料,占位'], goodInput: ['资料'] });
  results.push({ purity });
  // mutation: 把正确的函数更新退化为旧快照，真实 DOM 必须与预期 5 不同。
  try {
    writeFileSync(reactApp, reactSource.replaceAll('setCount(previous => previous + 1)', 'setCount(count + 1)'));
    await page.goto(reactUrl); await count(0); await click('预约函数回调'); await click('函数三次'); await count(1); await click('释放一个回调'); await click('释放一个回调'); await count(1);
    results.push({ mutation: '函数更新退化为替换', expected: 5, actual: 1 });
  } finally { writeFileSync(reactApp, reactSource); }
  const vueApp = resolve(project('vue'), 'src/App.vue'); const vueSource = readFileSync(vueApp, 'utf8');
  const cardFile = resolve(project('vue'), 'src/ReadingCard.vue'); const cardSource = readFileSync(cardFile, 'utf8');
  async function vueNormal(url, minutes = 30) {
    await page.goto(url); await page.getByRole('heading', { name: '两张独立的资料卡片' }).waitFor();
    assert.match(await page.locator('main').innerText(), /公开地址：\/api；提示开关：false/);
    const cards = page.locator('article');
    await cards.nth(0).getByRole('button').click();
    assert.match(await cards.nth(0).innerText(), /25 分钟/);
    assert.equal(await cards.nth(1).locator('p').count(), 0);
    await cards.nth(1).getByRole('button').click(); assert.match(await cards.nth(1).innerText(), new RegExp(`${minutes} 分钟`));
    assert.equal(await cards.nth(0).locator('h2').evaluate(el => getComputedStyle(el).color), 'rgb(20, 100, 60)');
    assert.notEqual(await page.getByRole('heading', { name: '卡片外标题' }).evaluate(el => getComputedStyle(el).color), 'rgb(20, 100, 60)');
  }
  await vueNormal(vueUrl);
  await page.screenshot({ path: resolve(evidence, 'vue-fixture.png') });
  const preview = await start('vue', 42744, 'preview'); await vueNormal(preview);
  try { writeFileSync(vueApp, vueSource.replace(':minutes="30"', ':minutes="45"')); command('vue', 'typecheck'); command('vue', 'build'); await vueNormal(vueUrl, 45); results.push({ variant: '第二张 30→45', first: 25, second: 45 }); }
  finally { writeFileSync(vueApp, vueSource); }
  try {
    writeFileSync(cardFile, cardSource.replace('<style scoped>', '<style>'));
    await page.goto(vueUrl); await page.getByRole('heading', { name: '卡片外标题' }).waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll('h2')].some(el => el.textContent === '卡片外标题' && getComputedStyle(el).color === 'rgb(20, 100, 60)')); 
    results.push({ fault: '删除 scoped', observed: '外部标题变绿' });
  } finally { writeFileSync(cardFile, cardSource); }
  const mainFile = resolve(project('vue'), 'src/main.ts'); const main = readFileSync(mainFile, 'utf8');
  try {
    writeFileSync(mainFile, main.replace("'#app'", "'#missing'"));
    logs.length = 0; await page.goto(vueUrl); await page.waitForFunction(() => document.querySelector('#app')?.childElementCount === 0);
    await page.waitForTimeout(300); assert.equal(await page.locator('main').count(), 0);
    assert.ok(logs.some(l => l.includes('#missing'))); results.push({ fault: 'mount 容器错误', logs: [...logs] });
  } finally { writeFileSync(mainFile, main); }
  const configFile = resolve(project('vue'), 'vite.config.ts'); const config = readFileSync(configFile, 'utf8');
  try { writeFileSync(configFile, config.replace("alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },", 'alias: {},')); command('vue', 'typecheck'); command('vue', 'build', false); }
  finally { writeFileSync(configFile, config); }
  await page.close();
  await stop(children[1]);
  page = await browser.newPage(); page.on('console', msg => logs.push(msg.text())); // 后续只看生产产物，避免 Vite 配置重启触发旧页 reload 干扰导航。
  // 独立生产构建验证缺失配置，不依赖开发服务器是否保留旧 env。
  const envFile = resolve(project('vue'), '.env'); const env = readFileSync(envFile, 'utf8');
  try {
    writeFileSync(envFile, 'VITE_SHOW_READING_TIPS=false\n'); command('vue', 'build');
    const errors = []; const handler = e => errors.push(e.message); page.on('pageerror', handler);
    await page.goto(preview); await page.waitForTimeout(300);
    assert.ok(errors.some(e => e.includes('缺少公开 API 地址'))); page.off('pageerror', handler);
    results.push({ fault: '删除公开地址', errors });
  } finally { writeFileSync(envFile, env); }
  try { writeFileSync(vueApp, vueSource.replace(':minutes="30"', 'minutes="很多"')); command('vue', 'typecheck', false); command('vue', 'build'); }
  finally { writeFileSync(vueApp, vueSource); }
  command('vue', 'typecheck'); command('vue', 'build'); await vueNormal(preview);
  writeFileSync(resolve(evidence, 'examples-results.json'), JSON.stringify({ browser: browser.version(), node: process.version, results }, null, 2));
  console.log('正文抽取工程：类型、生产、组件行为、单变量变式与代表性错误全部通过');
} finally { await browser.close(); for (const child of children) await stop(child); }
