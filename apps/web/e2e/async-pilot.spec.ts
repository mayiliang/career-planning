import { expect, test, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { readMaterialExamples } from '../scripts/learning-material-examples.mjs';

const root = new URL('../../../', import.meta.url);
const evidence = new URL('tmp/async-pilot-evidence/', root);
const js04 = '/knowledge/materials/js-04-async-promise-browser-event-loop.md/js-04';
const js05 = '/knowledge/materials/js-05-promise-errors-async-control-flow.md/js-05';
const primer = '/knowledge/materials/javascript-promises-and-cancellation.md/prejs-07';
const api = '/api/v1';
async function ready(page: Page) {
  const anchor = new URL(page.url()).pathname.split('/').at(-1)!.toUpperCase();
  await expect(page.locator('.material-hero')).toContainText(anchor);
  await expect(page.locator('[data-reader-ready="true"]')).toBeVisible();
}
async function records(page: Page) {
  return (await (await page.request.get(`${api}/knowledge/material-progress`)).json()).data as Array<{guide: string; anchor: string; progressPercent: number; completed: boolean}>;
}
async function point(page: Page, code: string) { return (await (await page.request.get(`${api}/knowledge/points/${code}`)).json()).data; }
async function progress(page: Page, name: string) { return (await records(page)).find(r => r.guide === name)?.progressPercent ?? 0; }

test.describe.configure({ mode: 'serial' });

test('三篇正文的实际代码在 Chrome 中产生标注结果', async ({ page, browser }) => {
  await mkdir(evidence, { recursive: true });
  const examples = (await Promise.all(['b02', 'b03'].map(readMaterialExamples))).flat().filter((item: {guide: string}) => /js-0[45]-/.test(item.guide));
  const markdown = await readFile(new URL('docs/knowledge/chinese-guides/javascript-promises-and-cancellation.md', root), 'utf8');
  const primerExamples = [...markdown.matchAll(/^```js example=([a-z0-9-]+)[^\n]*\n([\s\S]*?)^```/gm)].map(m => ({ id: m[1], code: m[2], expected: [...m[2]!.matchAll(/\/\/ => (.*)$/gm)].map(output => output[1]!.trim()) }));
  const all = [...examples, ...primerExamples];
  await page.goto(js04);
  const results = await page.evaluate(async (items) => {
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const results = [];
    for (const item of items) {
      const output: string[] = [];
      try {
        await new AsyncFunction('console', `"use strict";\n${item.code}`)({ log: (...args: unknown[]) => output.push(args.map(String).join(' ')) });
        results.push({ id: item.id, output, error: '' });
      } catch (error) { results.push({ id: item.id, output, error: String(error) }); }
    }
    return results;
  }, all);
  expect(results).toEqual(all.map(item => ({ id: item.id, output: item.expected, error: '' })));
  await writeFile(new URL('browser-examples.json', evidence), JSON.stringify({ browser: browser.version(), viewport: page.viewportSize(), results }, null, 2));
});

test('目录查阅与手机代码交互不会把跳转记成整篇读完', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(js04); await ready(page);
  const toc = page.locator('.toc-rail');
  await toc.getByRole('button', { name: '限制并发需要推迟启动', exact: true }).focus();
  // 聚焦屏外目录会原生滚动并产生正常阅读进度，先等它保存，再检查 Enter 跳转。
  await expect.poll(() => progress(page, 'js-04-async-promise-browser-event-loop.md')).toBeGreaterThan(0);
  const before = await progress(page, 'js-04-async-promise-browser-event-loop.md');
  expect(before).toBeLessThan(80);
  await page.keyboard.press('Enter');
  const target = page.locator('.markdown-body h3').filter({ hasText: /^限制并发需要推迟启动$/ });
  await expect(target).toBeFocused();
  await expect.poll(async () => Math.abs(((await target.boundingBox())?.y ?? Infinity) - 96)).toBeLessThan(8);
  await expect(toc).toContainText('正在查阅相关小节');
  await page.waitForTimeout(750);
  expect(await progress(page, 'js-04-async-promise-browser-event-loop.md')).toBe(before);
  await page.screenshot({ path: fileURLToPath(new URL('js04-mechanism-desktop.png', evidence)) });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload(); await ready(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const block = page.locator('.code-block').filter({ hasText: 'async function runLimited' });
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await block.getByRole('button', { name: '复制代码' }).click();
  await expect(block.getByRole('button', { name: '已复制' })).toBeVisible();
  const pre = block.locator('pre');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(await pre.textContent());
  expect(await pre.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
  await pre.evaluate(el => { el.scrollLeft = el.scrollWidth; });
  expect(await pre.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  await pre.evaluate(el => { el.scrollLeft = 0; });
  await page.screenshot({ path: fileURLToPath(new URL('js04-code-mobile.png', evidence)) });
  await page.getByRole('button', { name: '打开本页目录' }).click();
  await page.locator('.toc-rail').getByRole('button', { name: '组合 Promise 不会自动取消工作', exact: true }).click();
  await expect(page.locator('.toc-rail')).not.toBeVisible();
  await expect(page.locator('.markdown-body h3').filter({ hasText: /^组合 Promise 不会自动取消工作$/ })).toBeFocused();
  const table = page.locator('.markdown-body table').filter({ hasText: '组合方法' });
  await expect(table).toBeVisible();
  await table.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(table).toContainText('allSettled');
  expect(await table.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
  await table.evaluate(el => { el.scrollLeft = el.scrollWidth; });
  expect(await table.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  await table.evaluate(el => { el.scrollLeft = 0; });
  await page.screenshot({ path: fileURLToPath(new URL('js04-table-mobile.png', evidence)) });
});

test('小节直达不记录整篇完成，正常读到末尾只完成阅读', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const before = await point(page, 'JS-05');
  const existing = await progress(page, 'js-05-promise-errors-async-control-flow.md');
  expect(existing).toBeLessThan(80);
  await page.goto(`${js05}#${encodeURIComponent('超时结束等待并不代表远端撤销')}`); await ready(page);
  await expect(page.locator('.section-visit-note')).toBeVisible();
  await page.waitForTimeout(750);
  expect(await progress(page, 'js-05-promise-errors-async-control-flow.md')).toBe(existing);
  await page.locator('.toc-rail').getByRole('button', { name: '从头阅读本篇 →' }).click();
  await expect(page).toHaveURL(js05);
  await page.locator('.material-sheet footer').scrollIntoViewIfNeeded();
  await expect.poll(async () => (await records(page)).find(r => r.guide === 'js-05-promise-errors-async-control-flow.md')?.completed).toBe(true);
  const after = await point(page, 'JS-05');
  expect({ state: after.learningState, mastery: after.masteryLevel, focus: after.currentFocus }).toEqual({ state: before.learningState, mastery: before.masteryLevel, focus: before.currentFocus });
  await expect(page.locator('.material-sheet footer')).toContainText('知识点是否学完由你决定');
  const external = page.locator('.markdown-body a[href^="https://"]');
  expect(await external.count()).toBeGreaterThan(4);
  for (const link of await external.all()) {
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);
  }
  await page.screenshot({ path: fileURLToPath(new URL('js05-reading-complete-desktop.png', evidence)) });
});

test('路线、详情、补基础返回与跨批次练习形成连续路径', async ({ page, browser }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/plan');
  const chain = page.getByRole('region', { name: '异步学习链试点' });
  await expect(chain).toBeVisible();
  await expect(chain).toContainText('PREJS-07');
  await expect(chain).toContainText('建议补齐');
  await page.screenshot({ path: fileURLToPath(new URL('plan-desktop.png', evidence)) });
  await chain.getByRole('link', { name: '查看详情与练习' }).first().click();
  await expect(page).toHaveURL('/knowledge/JS-04');
  await expect(page.getByRole('region', { name: '异步学习链试点' })).toBeVisible();
  await page.locator(`.material-reader a[href="${js04}"]`).click();
  await expect(page).toHaveURL(js04); await ready(page);
  await page.locator('.markdown-body').getByRole('link', { name: /PREJS-07 Promise/ }).click();
  await expect(page).toHaveURL(primer); await ready(page);
  await expect(page.locator('.material-hero')).toContainText('PREJS-07');
  await page.locator('.material-hero').scrollIntoViewIfNeeded();
  await page.screenshot({ path: fileURLToPath(new URL('prejs07-desktop.png', evidence)) });
  await page.getByRole('button', { name: '返回上一页 →' }).click();
  await expect(page).toHaveURL(js04); await ready(page);
  await page.locator('[aria-label="异步链连续阅读"]').getByRole('link', { name: /接着读/ }).click();
  await expect(page).toHaveURL(js05); await ready(page);
  await expect(page.locator('.batch-path')).toContainText('B03');
  await expect(page.locator('.markdown-body')).toContainText('把领取取消和结果槽位放进同一个协议');
  await page.locator('[aria-label="异步链连续阅读"]').getByRole('link', { name: '返回详情与练习 →' }).click();
  await expect(page).toHaveURL('/knowledge/JS-05');
  await page.getByRole('button', { name: '在系统中开始并完成 →' }).click();
  await expect(page.locator('.practice-workspace')).toBeVisible();
  await expect(page.locator('.task-statement').first()).toContainText('cancelled,fulfilled,cancelled,skipped,skipped');
  await page.screenshot({ path: fileURLToPath(new URL('js05-practice-desktop.png', evidence)), fullPage: false });
  await writeFile(new URL('browser-environment.json', evidence), JSON.stringify({ browser: browser.version(), viewport: page.viewportSize(), pages: ['/plan', '/knowledge/JS-04', js04, primer, js05, '/knowledge/JS-05'] }, null, 2));
});

test('前置暂缓只解释状态，浏览资料不改变用户当前点', async ({ page }) => {
  await page.request.post(`${api}/learning/points/JS-05/focus`);
  await page.request.post(`${api}/learning/points/JS-04/defer`, { data: { reason: '隔离样本：先补回调基础' } });
  await page.goto('/');
  await expect(page.getByRole('region', { name: '异步学习链试点' })).toContainText('JS-04 已暂缓');
  await page.getByRole('region', { name: '异步学习链试点' }).getByRole('link', { name: '查看暂缓状态' }).click();
  await expect(page).toHaveURL('/knowledge/JS-04');
  const before = await point(page, 'JS-04');
  await page.getByRole('region', { name: '异步学习链试点' }).getByRole('link', { name: '阅读讲义' }).nth(1).click();
  await ready(page);
  await expect.poll(async () => (await point(page, 'JS-04')).learningState).toBe('DEFERRED');
  expect((await point(page, 'JS-04')).deferReason).toBe(before.deferReason);
  expect((await point(page, 'JS-05')).currentFocus).toBe(true);
  await page.request.post(`${api}/learning/points/JS-04/restore`);
});
