import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const evidence = new URL('../../../tmp/framework-entry-evidence/', import.meta.url);
const entries = [
  { code: 'REACT-01', guide: 'react-01-render-purity-state-snapshot.md', heading: '用手动释放回调固定观察顺序', sample: '固定快照实验' },
  { code: 'VUE-01', guide: 'vue-01-vite-sfc-project-structure.md', heading: '固定入口练习与单变量排错', sample: '两张独立的资料卡片' },
];
async function point(page: Page, code: string) { return (await (await page.request.get(`/api/v1/knowledge/points/${code}`)).json()).data; }
async function progress(page: Page, guide: string) {
  const records = (await (await page.request.get('/api/v1/knowledge/material-progress')).json()).data;
  return records.find((r: {guide:string}) => r.guide === guide)?.progressPercent ?? 0;
}
for (const entry of entries) {
  const href = `/knowledge/materials/${entry.guide}/${entry.code.toLowerCase()}`;
  test(`${entry.code} 路线到补学返回和练习，查看不改变学习状态`, async ({ page, browser }) => {
    await mkdir(evidence, { recursive: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.request.post(`/api/v1/learning/points/${entry.code}/focus`);
    await page.request.post('/api/v1/learning/points/WEB-01/defer', { data: { reason: '入口隔离测试' } });
    const before = await point(page, entry.code);
    await page.goto('/plan');
    const route = page.getByRole('region', { name: '框架入口基础' });
    await expect(route).toContainText('无需先学另一个框架');
    await route.locator(`a[href="/knowledge/${entry.code}"]`).click();
    await expect(page.locator('.point-hero h1 code')).toHaveText(entry.code);
    const panel = page.getByRole('region', { name: '框架入口基础' });
    await expect(panel).toContainText('学习中');
    await expect(panel).toContainText('已暂缓，依赖仍需补齐');
    await panel.getByRole('link', { name: '补学 WEB-01', exact: true }).click();
    await page.getByRole('link', { name: `← 返回框架入口 ${entry.code}` }).click();
    await expect(page.locator('.point-hero h1 code')).toHaveText(entry.code);
    await panel.getByRole('link', { name: '阅读讲义', exact: true }).click();
    await expect(page.locator('[data-reader-ready="true"]')).toBeVisible();
    await page.locator('.markdown-body').getByRole('link', { name: 'WEB-01', exact: true }).click();
    await expect(page.locator('.material-hero')).toContainText('WEB-01');
    await page.getByRole('button', { name: '返回上一页 →' }).click();
    await expect(page).toHaveURL(href);
    await expect(page.locator('.material-hero')).toContainText(entry.code);
    await expect(page.locator('[data-reader-ready="true"]')).toBeVisible();
    await page.locator('.material-hero').scrollIntoViewIfNeeded();
    await page.screenshot({ animations: 'disabled', path: fileURLToPath(new URL(`${entry.code}-reader-desktop.png`, evidence)) });
    await page.getByRole('region', { name: '框架入口基础' }).getByRole('link', { name: '详情与练习' }).click();
    await page.getByRole('button', { name: '在系统中开始并完成 →' }).click();
    await expect(page.locator('.practice-workspace')).toBeVisible();
    await expect(page.locator('.task-statement').first()).toContainText(entry.code === 'REACT-01' ? '3/4/5' : '无 Router');
    await page.evaluate(() => Promise.all(document.getAnimations().filter(a => a.effect?.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))));
    await page.screenshot({ animations: 'disabled', path: fileURLToPath(new URL(`${entry.code}-practice.png`, evidence)) });
    const after = await point(page, entry.code);
    expect({ state: after.learningState, focus: after.currentFocus, mastery: after.masteryLevel }).toEqual({ state: before.learningState, focus: before.currentFocus, mastery: before.masteryLevel });
    expect((await point(page, 'WEB-01')).learningState).toBe('DEFERRED');
    await page.request.post('/api/v1/learning/points/WEB-01/restore');
    await writeFile(new URL(`${entry.code}-browser.json`, evidence), JSON.stringify({ browser: browser.version(), viewport: page.viewportSize(), pages: ['/plan', `/knowledge/${entry.code}`, href, '/knowledge/WEB-01'], before, after }, null, 2));
  });
  test(`${entry.code} 小节查阅、复制、滚动和阅读阈值`, async ({ page }) => {
    const before = await point(page, entry.code);
    const initial = await progress(page, entry.guide);
    await page.goto(`${href}#${encodeURIComponent(entry.heading)}`);
    await expect(page.locator('[data-reader-ready="true"]')).toBeVisible();
    await expect(page.locator('.section-visit-note')).toBeVisible();
    await page.waitForTimeout(750);
    expect(await progress(page, entry.guide)).toBe(initial);
    const external = page.locator('.markdown-body a[href^="https://"]');
    expect(await external.count()).toBeGreaterThan(0);
    for (const link of await external.all()) { await expect(link).toHaveAttribute('target', '_blank'); await expect(link).toHaveAttribute('rel', /noopener/); }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: '打开本页目录' }).click();
    const toc = page.locator('.toc-rail').getByRole('button', { name: entry.heading, exact: true });
    await toc.focus(); await page.keyboard.press('Enter');
    await expect(page.locator('.markdown-body h3').filter({ hasText: new RegExp(`^${entry.heading}$`) })).toBeFocused();
    const block = page.locator('.code-block').filter({ hasText: entry.sample }).last();
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await block.getByRole('button', { name: '复制代码' }).click();
    await expect(block.getByRole('button', { name: '已复制' })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(await block.locator('pre').textContent());
    const wide = page.locator('.code-block pre').filter({ hasText: entry.code === 'REACT-01' ? 'commit observation' : 'fileURLToPath' }).first();
    await wide.scrollIntoViewIfNeeded();
    expect(await wide.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
    await wide.evaluate(el => { el.scrollLeft = el.scrollWidth; });
    expect(await wide.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
    await wide.evaluate(el => { el.scrollLeft = 0; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ animations: 'disabled', path: fileURLToPath(new URL(`${entry.code}-mobile-code.png`, evidence)) });
    await page.goto(href); await expect(page.locator('[data-reader-ready="true"]')).toBeVisible();
    await page.locator('.material-sheet footer').scrollIntoViewIfNeeded();
    await expect.poll(() => progress(page, entry.guide)).toBeGreaterThanOrEqual(80);
    const after = await point(page, entry.code);
    expect({ state: after.learningState, mastery: after.masteryLevel, focus: after.currentFocus }).toEqual({ state: before.learningState, mastery: before.masteryLevel, focus: before.currentFocus });
  });
}

test('入口明确区分未学与已学基础，查阅后当前点保持不变', async ({ page }) => {
  await page.request.post('/api/v1/learning/points/WEB-01/restore');
  await page.goto('/knowledge/VUE-01');
  const panel = page.getByRole('region', { name: '框架入口基础' });
  await expect(panel).toContainText('未开始，可按需补学');
  await page.request.post('/api/v1/learning/points/WEB-01/complete');
  await page.request.post('/api/v1/learning/points/VUE-01/focus');
  await page.reload();
  await expect(panel.locator('li')).toContainText('已学完');
  await panel.getByRole('link', { name: '补学 WEB-01' }).click();
  await page.getByRole('link', { name: '← 返回框架入口 VUE-01' }).click();
  expect((await point(page, 'VUE-01')).currentFocus).toBe(true);
  expect((await point(page, 'WEB-01')).learningState).toBe('LEARNED');
  await page.goto('/plan');
  await expect(page.getByRole('region', { name: '框架入口基础' })).toBeVisible();
  await page.screenshot({ animations: 'disabled', path: fileURLToPath(new URL('framework-plan.png', evidence)) });
});
