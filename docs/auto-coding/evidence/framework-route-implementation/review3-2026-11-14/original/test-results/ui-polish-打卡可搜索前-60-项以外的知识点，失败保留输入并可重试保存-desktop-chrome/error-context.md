# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui-polish.spec.ts >> 打卡可搜索前 60 项以外的知识点，失败保留输入并可重试保存
- Location: e2e/ui-polish.spec.ts:57:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: Test timeout of 30000ms exceeded.
Call log:
  - navigating to "http://127.0.0.1:42731/", waiting until "load"

```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test';
  2   | 
  3   | test('侧栏可收起并记住偏好，手机仍保留全部主导航', async ({ page }) => {
  4   |   await page.setViewportSize({ width: 1440, height: 1000 });
  5   |   await page.goto('/');
  6   |   await page.getByRole('button', { name: '收起侧栏' }).click();
  7   |   await expect(page.getByRole('button', { name: '展开侧栏' })).toHaveAttribute('aria-expanded', 'false');
  8   |   await page.reload();
  9   |   await expect(page.getByRole('button', { name: '展开侧栏' })).toBeVisible();
  10  |   await page.setViewportSize({ width: 390, height: 844 });
  11  |   for (const label of ['学习台', '知识体系', '笔记中心', '核心路线', '求职支线']) {
  12  |     const link = page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: label });
  13  |     await expect(link).toBeVisible();
  14  |     const box = await link.boundingBox();
  15  |     expect(box!.width).toBeGreaterThanOrEqual(44);
  16  |     expect(box!.height).toBeGreaterThanOrEqual(44);
  17  |   }
  18  |   await page.getByRole('link', { name: '设置与数据', exact: true }).click();
  19  |   await expect(page).toHaveURL(/\/settings$/);
  20  | });
  21  | 
  22  | test('搜索键盘选择自动滚动，中文输入确认不会误导航，关闭恢复焦点', async ({ page }) => {
  23  |   await page.setViewportSize({ width: 390, height: 600 });
  24  |   await page.goto('/');
  25  |   const trigger = page.getByRole('button', { name: /^快速查找/ });
  26  |   await trigger.click();
  27  |   const input = page.getByRole('combobox', { name: '搜索页面或知识点' });
  28  |   await expect(input).toBeFocused();
  29  |   const results = page.getByRole('listbox', { name: '页面与知识点' });
  30  |   await expect(results.getByRole('option')).toHaveCount(12);
  31  |   for (let index = 0; index < 10; index++) await input.press('ArrowDown');
  32  |   const selected = results.getByRole('option', { selected: true });
  33  |   await expect(selected).toBeInViewport();
  34  |   const fullyVisible = await selected.evaluate((element) => {
  35  |     const bounds = element.getBoundingClientRect();
  36  |     const parent = element.parentElement!.getBoundingClientRect();
  37  |     return bounds.top >= parent.top - 1 && bounds.bottom <= parent.bottom + 1;
  38  |   });
  39  |   expect(fullyVisible).toBe(true);
  40  |   await expect(input).toHaveAttribute('aria-activedescendant', await selected.getAttribute('id') as string);
  41  |   await input.dispatchEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true });
  42  |   await expect(input).toBeVisible();
  43  |   await input.fill('无匹配的知识点 xyz987');
  44  |   await expect(page.getByText('没有匹配结果')).toBeVisible();
  45  |   await input.fill('VUE-11');
  46  |   await expect(results.getByRole('option', { name: /VUE-11/ })).toBeVisible();
  47  |   await input.press('Escape');
  48  |   await expect(trigger).toBeFocused();
  49  |   await trigger.click();
  50  |   await input.press('Tab');
  51  |   await expect(page.getByRole('button', { name: '关闭快速查找' })).toBeFocused();
  52  |   await page.keyboard.press('Enter');
  53  |   await expect(page.getByRole('dialog', { name: '快速查找' })).not.toBeVisible();
  54  |   await expect(page).toHaveURL(/\/$/);
  55  | });
  56  | 
  57  | test('打卡可搜索前 60 项以外的知识点，失败保留输入并可重试保存', async ({ page }) => {
  58  |   const response = await page.request.get('/api/v1/knowledge/points');
  59  |   const { data } = await response.json() as { data: { items: Array<{ code: string; title: string }> } };
  60  |   const target = data.items.at(-1)!;
  61  |   expect(data.items.findIndex((point) => point.code === target.code)).toBeGreaterThan(60);
  62  |   let saveCount = 0;
  63  |   await page.route('**/api/v1/learning/checkins/*', async (route) => {
  64  |     saveCount++;
  65  |     if (saveCount === 1) {
  66  |       await route.fulfill({ status: 503, json: { error: { code: 'UNAVAILABLE', message: '测试：暂时无法保存，请重试', retryable: true }, meta: { requestId: 'ui-checkin-failure' } } });
  67  |       return;
  68  |     }
  69  |     const body = route.request().postDataJSON();
  70  |     expect(body.pointCodes).toContain(target.code);
  71  |     expect(body.summaryMd).toBe('这次学习的关键收获');
  72  |     await route.fulfill({ json: { data: { ...body, id: 'ui-checkin', checkinDate: '2026-09-06', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), points: [{ code: target.code, title: target.title, activity: 'LEARN' }] }, meta: { requestId: 'ui-checkin-success' } } });
  73  |   });
> 74  |   await page.goto('/');
      |              ^ Error: page.goto: Test timeout of 30000ms exceeded.
  75  |   await page.getByRole('button', { name: /记录今日学习|修改今日打卡/ }).click();
  76  |   const dialog = page.getByRole('dialog', { name: '今天实际学了什么？' });
  77  |   await dialog.getByRole('searchbox', { name: '搜索打卡知识点' }).fill(target.code);
  78  |   const point = dialog.getByRole('group', { name: '可选知识点' }).getByRole('button', { name: new RegExp(target.code) });
  79  |   await point.click();
  80  |   await expect(point).toHaveAttribute('aria-pressed', 'true');
  81  |   await dialog.getByRole('searchbox').fill('');
  82  |   await dialog.getByRole('button', { name: /只看已选/ }).click();
  83  |   await expect(dialog.getByRole('group', { name: '可选知识点' }).getByRole('button')).toContainText([target.code]);
  84  |   await dialog.getByLabel('今日学习记录', { exact: true }).fill('这次学习的关键收获');
  85  |   await dialog.getByLabel('实际投入（分钟）').fill('-1');
  86  |   await dialog.getByRole('button', { name: '保存今日打卡' }).click();
  87  |   await expect(dialog.getByRole('alert')).toContainText('0–1440');
  88  |   expect(saveCount).toBe(0);
  89  |   await dialog.getByLabel('实际投入（分钟）').fill('25');
  90  |   await dialog.getByRole('button', { name: '保存今日打卡' }).click();
  91  |   await expect(dialog.getByRole('alert')).toContainText('暂时无法保存');
  92  |   await expect(dialog.getByLabel('今日学习记录', { exact: true })).toHaveValue('这次学习的关键收获');
  93  |   await dialog.getByRole('button', { name: '保存今日打卡' }).click();
  94  |   await expect(dialog).not.toBeVisible();
  95  |   await expect(page.getByRole('status').filter({ hasText: '今日学习已记录' })).toBeVisible();
  96  |   expect(saveCount).toBe(2);
  97  | });
  98  | 
  99  | test('矮屏弹窗固定操作区且不会被 AI 入口盖住', async ({ page }) => {
  100 |   await page.setViewportSize({ width: 390, height: 600 });
  101 |   await page.goto('/');
  102 |   const trigger = page.getByRole('button', { name: /记录今日学习|修改今日打卡/ });
  103 |   await trigger.click();
  104 |   const dialog = page.getByRole('dialog', { name: '今天实际学了什么？' });
  105 |   const box = await dialog.boundingBox();
  106 |   expect(box!.y).toBeGreaterThanOrEqual(0);
  107 |   expect(box!.y + box!.height).toBeLessThanOrEqual(600);
  108 |   await expect(dialog.getByRole('button', { name: '保存今日打卡' })).toBeInViewport();
  109 |   await page.keyboard.press('Control+k');
  110 |   await expect(page.getByRole('dialog')).toHaveCount(1);
  111 |   await page.screenshot({ path: '../../tmp/ui-review/checkin-mobile.png' });
  112 |   await dialog.getByRole('button', { name: '取消', exact: true }).click();
  113 |   await expect(trigger).toBeFocused();
  114 | });
  115 | 
  116 | test('开始学习失败有明确反馈并恢复可操作状态', async ({ page }) => {
  117 |   await page.route('**/api/v1/learning/workspace', async (route) => {
  118 |     const response = await route.fetch();
  119 |     const json = await response.json();
  120 |     json.data.current = null;
  121 |     await route.fulfill({ json });
  122 |   });
  123 |   await page.route('**/api/v1/learning/points/*/focus', (route) => route.fulfill({ status: 503, json: { error: { code: 'UNAVAILABLE', message: '暂时无法开始，请重试', retryable: true }, meta: { requestId: 'ui-focus-failure' } } }));
  124 |   await page.goto('/');
  125 |   const start = page.getByRole('button', { name: '开始这项具体任务 →' });
  126 |   await start.click();
  127 |   await expect(page.getByRole('alert')).toContainText('暂时无法开始');
  128 |   await expect(start).toBeEnabled();
  129 | });
  130 | 
  131 | test('主要页面适配桌面、平板和手机且无页面脚本错误', async ({ page }) => {
  132 |   test.setTimeout(60_000);
  133 |   const errors: string[] = [];
  134 |   page.on('pageerror', (error) => errors.push(error.message));
  135 |   for (const width of [1440, 1024, 390, 320]) {
  136 |     await page.setViewportSize({ width, height: 900 });
  137 |     for (const path of ['/', '/knowledge/map', '/knowledge', '/knowledge/graph', '/notes', '/plan', '/jobs', '/settings', '/knowledge/WEB-01']) {
  138 |       await page.goto(path);
  139 |       await expect(page.locator('.route-shell h1').first()).toBeVisible();
  140 |       await page.waitForLoadState('networkidle');
  141 |       expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${width}px ${path} 横向溢出`).toBeLessThanOrEqual(1);
  142 |       if (path === '/' && [1440, 390].includes(width)) await page.screenshot({ path: `../../tmp/ui-review/learning-${width}.png`, fullPage: true });
  143 |     }
  144 |   }
  145 |   expect(errors).toEqual([]);
  146 | });
  147 | 
```