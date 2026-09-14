import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { readB01Examples } from '../scripts/learning-material-examples.mjs';

const first = '/knowledge/materials/js-01-execution-context-scope-closure.md/js-01';
const third = '/knowledge/materials/js-03-types-equality-copy-immutability.md/js-03';

test('B01 正文全部示例在浏览器中的实际输出与讲义一致', async ({ page }) => {
  const examples = await readB01Examples();
  await page.goto(first);
  const results = await page.evaluate(async (items) => {
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const results = [];
    for (const item of items) {
      const output: string[] = [];
      try {
        await new AsyncFunction('console', `"use strict";\n${item.code}`)({ log: (...args: unknown[]) => output.push(args.map(String).join(' ')) });
        results.push({ id: item.id, output, error: '' });
      } catch (error) {
        results.push({ id: item.id, output, error: String(error) });
      }
    }
    return results;
  }, examples);
  expect(results).toEqual(examples.map((item: { id: string; expected: string[] }) => ({ id: item.id, output: item.expected, error: '' })));
});

test('B01 小节交叉引用保留完整正文，后退恢复原来的阅读位置', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(first);
  await expect(page.locator('[data-reader-ready]')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'B01 阅读路线' }).getByRole('link')).toHaveCount(4);
  const link = page.locator('.markdown-body a').filter({ hasText: 'JS-03：浅拷贝只复制一层' });
  await link.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => window.scrollY);
  await link.click();
  await expect(page).toHaveURL(`${third}#${encodeURIComponent('浅拷贝只复制一层')}`);
  const target = page.locator('.markdown-body h3').filter({ hasText: /^浅拷贝只复制一层$/ });
  await expect.poll(async () => Math.abs(((await target.boundingBox())?.y ?? Infinity) - 96)).toBeLessThan(8);
  await expect(page.locator('.markdown-body')).toContainText('先区分原始值和对象');
  await expect(page.locator('.material-hero h1')).toContainText('JS-03');
  await page.goBack();
  await expect(page).toHaveURL(first);
  await expect.poll(async () => Math.abs(await page.evaluate(() => window.scrollY) - before)).toBeLessThan(8);
  await expect(link).toBeInViewport();

  await page.locator('.toc-rail').getByRole('button', { name: '闭包让函数继续访问创建处的变量', exact: true }).click();
  await expect(page).toHaveURL(`${first}#${encodeURIComponent('闭包让函数继续访问创建处的变量')}`);
  await expect.poll(async () => (await page.locator('.markdown-body h3').filter({ hasText: /^闭包让函数继续访问创建处的变量$/ }).boundingBox())?.y).toBeCloseTo(96, 0);
});

test('B01 旧小节入口和刷新都保留完整讲义与准确定位', async ({ page }) => {
  const progressWrites: string[] = [];
  page.on('request', (request) => {
    if (request.method() !== 'GET' && request.url().includes('js-03-types-equality-copy-immutability.md/js-03/progress')) progressWrites.push(request.url());
  });
  const section = encodeURIComponent('赋值之后谁和谁共用对象');
  await page.goto(`/knowledge/materials/js-03-types-equality-copy-immutability.md/${section}`);
  await expect(page).toHaveURL(`${third}#${section}`);
  const heading = page.locator('.markdown-body h3').filter({ hasText: /^赋值之后谁和谁共用对象$/ });
  await expect.poll(async () => Math.abs(((await heading.boundingBox())?.y ?? Infinity) - 96)).toBeLessThan(8);
  await page.reload();
  await expect.poll(async () => Math.abs(((await heading.boundingBox())?.y ?? Infinity) - 96)).toBeLessThan(8);
  expect(progressWrites).toHaveLength(0);
  await page.locator('.toc-rail').getByRole('button', { name: '从头阅读本篇 →' }).click();
  await expect(page).toHaveURL(third);
  await expect(page.locator('.section-visit-note')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.locator('.chapter-pagination')).toContainText('迭代、代理与资源');
  await page.locator('.chapter-pagination a').last().click();
  await expect(page).toHaveURL(/\/js-07$/);
  await expect(page.locator('.concept-connections a')).toHaveCount(3);
});

test('B01 桌面与手机阅读、目录和代码复制可用', async ({ page }) => {
  await mkdir('../../tmp/b01-review', { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(first);
  await expect(page.locator('[data-reader-ready]')).toBeVisible();
  await page.screenshot({ path: '../../tmp/b01-review/b01-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '../../tmp/b01-review/b01-mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: '打开本页目录' }).click();
  await page.locator('.toc-rail').getByRole('button', { name: '从一次函数调用看起', exact: true }).click();
  await expect(page.locator('.toc-rail')).not.toBeVisible();
  await expect.poll(async () => (await page.locator('.markdown-body h3').filter({ hasText: /^从一次函数调用看起$/ }).boundingBox())?.y).toBeCloseTo(96, 0);
  const code = page.locator('.code-block').first();
  await code.getByRole('button', { name: '复制代码' }).click();
  await expect(code.getByRole('button', { name: '已复制' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: '../../tmp/b01-review/b01-example-mobile.png' });
});

