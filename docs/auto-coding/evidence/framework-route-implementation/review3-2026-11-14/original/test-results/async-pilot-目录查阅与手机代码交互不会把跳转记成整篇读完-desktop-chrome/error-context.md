# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: async-pilot.spec.ts >> 目录查阅与手机代码交互不会把跳转记成整篇读完
- Location: e2e/async-pilot.spec.ts:48:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('.material-hero')
Expected substring: "JS-04"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" locator('.material-hero') with timeout 5000ms
  - waiting for locator('.material-hero')

```

```yaml
- link "跳到主要内容":
  - /url: "#main-content"
- navigation "主导航":
  - text: Career Atlas
  - paragraph: AI 时代前端能力地图
  - paragraph: 我的工作空间
  - list:
    - listitem:
      - link "学习台":
        - /url: /
        - strong: 学习台
    - listitem:
      - link "知识体系":
        - /url: /knowledge/map
        - strong: 知识体系
    - listitem:
      - link "笔记中心":
        - /url: /notes
        - strong: 笔记中心
    - listitem:
      - link "核心路线":
        - /url: /plan
        - strong: 核心路线
    - listitem:
      - link "求职支线":
        - /url: /jobs
        - strong: 求职支线
  - link "设置与数据":
    - /url: /settings
    - strong: 设置与数据
  - strong: 服务正常
  - text: 本地优先 · 自主学习
- banner:
  - button "收起侧栏" [expanded]
  - text: 工作空间 中文学习资料
  - button "快速查找，快捷键 Command 或 Control 加 K": 搜索知识点、页面… ⌘ K
- main:
  - paragraph: 中文学习资料页面已打开
- button "打开 Atlas AI 助手":
  - strong: Atlas AI
  - text: 总结 · 解释 · 查资料
```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test';
  2   | import { mkdir, readFile, writeFile } from 'node:fs/promises';
  3   | import { fileURLToPath } from 'node:url';
  4   | import { readMaterialExamples } from '../scripts/learning-material-examples.mjs';
  5   | 
  6   | const root = new URL('../../../', import.meta.url);
  7   | const evidence = new URL('tmp/async-pilot-evidence/', root);
  8   | const js04 = '/knowledge/materials/js-04-async-promise-browser-event-loop.md/js-04';
  9   | const js05 = '/knowledge/materials/js-05-promise-errors-async-control-flow.md/js-05';
  10  | const primer = '/knowledge/materials/javascript-promises-and-cancellation.md/prejs-07';
  11  | const api = '/api/v1';
  12  | async function ready(page: Page) {
  13  |   const anchor = new URL(page.url()).pathname.split('/').at(-1)!.toUpperCase();
> 14  |   await expect(page.locator('.material-hero')).toContainText(anchor);
      |                                                ^ Error: expect(locator).toContainText(expected) failed
  15  |   await expect(page.locator('[data-reader-ready="true"]')).toBeVisible();
  16  | }
  17  | async function records(page: Page) {
  18  |   return (await (await page.request.get(`${api}/knowledge/material-progress`)).json()).data as Array<{guide: string; anchor: string; progressPercent: number; completed: boolean}>;
  19  | }
  20  | async function point(page: Page, code: string) { return (await (await page.request.get(`${api}/knowledge/points/${code}`)).json()).data; }
  21  | async function progress(page: Page, name: string) { return (await records(page)).find(r => r.guide === name)?.progressPercent ?? 0; }
  22  | 
  23  | test.describe.configure({ mode: 'serial' });
  24  | 
  25  | test('三篇正文的实际代码在 Chrome 中产生标注结果', async ({ page, browser }) => {
  26  |   await mkdir(evidence, { recursive: true });
  27  |   const examples = (await Promise.all(['b02', 'b03'].map(readMaterialExamples))).flat().filter((item: {guide: string}) => /js-0[45]-/.test(item.guide));
  28  |   const markdown = await readFile(new URL('docs/knowledge/chinese-guides/javascript-promises-and-cancellation.md', root), 'utf8');
  29  |   const primerExamples = [...markdown.matchAll(/^```js example=([a-z0-9-]+)[^\n]*\n([\s\S]*?)^```/gm)].map(m => ({ id: m[1], code: m[2], expected: [...m[2]!.matchAll(/\/\/ => (.*)$/gm)].map(output => output[1]!.trim()) }));
  30  |   const all = [...examples, ...primerExamples];
  31  |   await page.goto(js04);
  32  |   const results = await page.evaluate(async (items) => {
  33  |     const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  34  |     const results = [];
  35  |     for (const item of items) {
  36  |       const output: string[] = [];
  37  |       try {
  38  |         await new AsyncFunction('console', `"use strict";\n${item.code}`)({ log: (...args: unknown[]) => output.push(args.map(String).join(' ')) });
  39  |         results.push({ id: item.id, output, error: '' });
  40  |       } catch (error) { results.push({ id: item.id, output, error: String(error) }); }
  41  |     }
  42  |     return results;
  43  |   }, all);
  44  |   expect(results).toEqual(all.map(item => ({ id: item.id, output: item.expected, error: '' })));
  45  |   await writeFile(new URL('browser-examples.json', evidence), JSON.stringify({ browser: browser.version(), viewport: page.viewportSize(), results }, null, 2));
  46  | });
  47  | 
  48  | test('目录查阅与手机代码交互不会把跳转记成整篇读完', async ({ page }) => {
  49  |   await page.setViewportSize({ width: 1440, height: 1000 });
  50  |   await page.goto(js04); await ready(page);
  51  |   const toc = page.locator('.toc-rail');
  52  |   await toc.getByRole('button', { name: '限制并发需要推迟启动', exact: true }).focus();
  53  |   // 聚焦屏外目录会原生滚动并产生正常阅读进度，先等它保存，再检查 Enter 跳转。
  54  |   await expect.poll(() => progress(page, 'js-04-async-promise-browser-event-loop.md')).toBeGreaterThan(0);
  55  |   const before = await progress(page, 'js-04-async-promise-browser-event-loop.md');
  56  |   expect(before).toBeLessThan(80);
  57  |   await page.keyboard.press('Enter');
  58  |   const target = page.locator('.markdown-body h3').filter({ hasText: /^限制并发需要推迟启动$/ });
  59  |   await expect(target).toBeFocused();
  60  |   await expect.poll(async () => Math.abs(((await target.boundingBox())?.y ?? Infinity) - 96)).toBeLessThan(8);
  61  |   await expect(toc).toContainText('正在查阅相关小节');
  62  |   await page.waitForTimeout(750);
  63  |   expect(await progress(page, 'js-04-async-promise-browser-event-loop.md')).toBe(before);
  64  |   await page.screenshot({ path: fileURLToPath(new URL('js04-mechanism-desktop.png', evidence)) });
  65  |   await page.setViewportSize({ width: 390, height: 844 });
  66  |   await page.reload(); await ready(page);
  67  |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  68  |   const block = page.locator('.code-block').filter({ hasText: 'async function runLimited' });
  69  |   await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  70  |   await block.getByRole('button', { name: '复制代码' }).click();
  71  |   await expect(block.getByRole('button', { name: '已复制' })).toBeVisible();
  72  |   const pre = block.locator('pre');
  73  |   expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(await pre.textContent());
  74  |   expect(await pre.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
  75  |   await pre.evaluate(el => { el.scrollLeft = el.scrollWidth; });
  76  |   expect(await pre.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  77  |   await pre.evaluate(el => { el.scrollLeft = 0; });
  78  |   await page.screenshot({ path: fileURLToPath(new URL('js04-code-mobile.png', evidence)) });
  79  |   await page.getByRole('button', { name: '打开本页目录' }).click();
  80  |   await page.locator('.toc-rail').getByRole('button', { name: '组合 Promise 不会自动取消工作', exact: true }).click();
  81  |   await expect(page.locator('.toc-rail')).not.toBeVisible();
  82  |   await expect(page.locator('.markdown-body h3').filter({ hasText: /^组合 Promise 不会自动取消工作$/ })).toBeFocused();
  83  |   const table = page.locator('.markdown-body table').filter({ hasText: '组合方法' });
  84  |   await expect(table).toBeVisible();
  85  |   await table.scrollIntoViewIfNeeded();
  86  |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  87  |   await expect(table).toContainText('allSettled');
  88  |   expect(await table.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
  89  |   await table.evaluate(el => { el.scrollLeft = el.scrollWidth; });
  90  |   expect(await table.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  91  |   await table.evaluate(el => { el.scrollLeft = 0; });
  92  |   await page.screenshot({ path: fileURLToPath(new URL('js04-table-mobile.png', evidence)) });
  93  | });
  94  | 
  95  | test('小节直达不记录整篇完成，正常读到末尾只完成阅读', async ({ page }) => {
  96  |   await page.setViewportSize({ width: 1440, height: 1000 });
  97  |   const before = await point(page, 'JS-05');
  98  |   const existing = await progress(page, 'js-05-promise-errors-async-control-flow.md');
  99  |   expect(existing).toBeLessThan(80);
  100 |   await page.goto(`${js05}#${encodeURIComponent('超时结束等待并不代表远端撤销')}`); await ready(page);
  101 |   await expect(page.locator('.section-visit-note')).toBeVisible();
  102 |   await page.waitForTimeout(750);
  103 |   expect(await progress(page, 'js-05-promise-errors-async-control-flow.md')).toBe(existing);
  104 |   await page.locator('.toc-rail').getByRole('button', { name: '从头阅读本篇 →' }).click();
  105 |   await expect(page).toHaveURL(js05);
  106 |   await page.locator('.material-sheet footer').scrollIntoViewIfNeeded();
  107 |   await expect.poll(async () => (await records(page)).find(r => r.guide === 'js-05-promise-errors-async-control-flow.md')?.completed).toBe(true);
  108 |   const after = await point(page, 'JS-05');
  109 |   expect({ state: after.learningState, mastery: after.masteryLevel, focus: after.currentFocus }).toEqual({ state: before.learningState, mastery: before.masteryLevel, focus: before.currentFocus });
  110 |   await expect(page.locator('.material-sheet footer')).toContainText('知识点是否学完由你决定');
  111 |   const external = page.locator('.markdown-body a[href^="https://"]');
  112 |   expect(await external.count()).toBeGreaterThan(4);
  113 |   for (const link of await external.all()) {
  114 |     await expect(link).toHaveAttribute('target', '_blank');
```