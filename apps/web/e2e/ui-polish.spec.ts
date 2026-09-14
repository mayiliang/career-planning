import { expect, test } from '@playwright/test';

test('侧栏可收起并记住偏好，手机仍保留全部主导航', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page.getByRole('button', { name: '收起侧栏' }).click();
  await expect(page.getByRole('button', { name: '展开侧栏' })).toHaveAttribute('aria-expanded', 'false');
  await page.reload();
  await expect(page.getByRole('button', { name: '展开侧栏' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  for (const label of ['学习台', '知识体系', '笔记中心', '核心路线', '求职支线']) {
    const link = page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: label });
    await expect(link).toBeVisible();
    const box = await link.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole('link', { name: '设置与数据', exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
});

test('搜索键盘选择自动滚动，中文输入确认不会误导航，关闭恢复焦点', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto('/');
  const trigger = page.getByRole('button', { name: /^快速查找/ });
  await trigger.click();
  const input = page.getByRole('combobox', { name: '搜索页面或知识点' });
  await expect(input).toBeFocused();
  await expect(page.getByRole('option')).toHaveCount(12);
  for (let index = 0; index < 10; index++) await input.press('ArrowDown');
  const selected = page.getByRole('option', { selected: true });
  await expect(selected).toBeInViewport();
  const fullyVisible = await selected.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const parent = element.parentElement!.getBoundingClientRect();
    return bounds.top >= parent.top - 1 && bounds.bottom <= parent.bottom + 1;
  });
  expect(fullyVisible).toBe(true);
  await expect(input).toHaveAttribute('aria-activedescendant', await selected.getAttribute('id') as string);
  await input.dispatchEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true });
  await expect(input).toBeVisible();
  await input.fill('无匹配的知识点 xyz987');
  await expect(page.getByText('没有匹配结果')).toBeVisible();
  await input.fill('VUE-11');
  await expect(page.getByRole('option', { name: /VUE-11/ })).toBeVisible();
  await input.press('Escape');
  await expect(trigger).toBeFocused();
  await trigger.click();
  await input.press('Tab');
  await expect(page.getByRole('button', { name: '关闭快速查找' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: '快速查找' })).not.toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test('打卡可搜索前 60 项以外的知识点，失败保留输入并可重试保存', async ({ page }) => {
  const response = await page.request.get('/api/v1/knowledge/points');
  const { data } = await response.json() as { data: { items: Array<{ code: string; title: string }> } };
  const target = data.items.at(-1)!;
  expect(data.items.findIndex((point) => point.code === target.code)).toBeGreaterThan(60);
  let saveCount = 0;
  await page.route('**/api/v1/learning/checkins/*', async (route) => {
    saveCount++;
    if (saveCount === 1) {
      await route.fulfill({ status: 503, json: { error: { code: 'UNAVAILABLE', message: '测试：暂时无法保存，请重试', retryable: true }, meta: { requestId: 'ui-checkin-failure' } } });
      return;
    }
    const body = route.request().postDataJSON();
    expect(body.pointCodes).toContain(target.code);
    expect(body.summaryMd).toBe('这次学习的关键收获');
    await route.fulfill({ json: { data: { ...body, id: 'ui-checkin', checkinDate: '2026-09-06', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), points: [{ code: target.code, title: target.title, activity: 'LEARN' }] }, meta: { requestId: 'ui-checkin-success' } } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: /记录今日学习|修改今日打卡/ }).click();
  const dialog = page.getByRole('dialog', { name: '今天实际学了什么？' });
  await dialog.getByRole('searchbox', { name: '搜索打卡知识点' }).fill(target.code);
  const point = dialog.getByRole('group', { name: '可选知识点' }).getByRole('button', { name: new RegExp(target.code) });
  await point.click();
  await expect(point).toHaveAttribute('aria-pressed', 'true');
  await dialog.getByRole('searchbox').fill('');
  await dialog.getByRole('button', { name: /只看已选/ }).click();
  await expect(dialog.getByRole('group', { name: '可选知识点' }).getByRole('button')).toContainText([target.code]);
  await dialog.getByLabel('今日学习记录', { exact: true }).fill('这次学习的关键收获');
  await dialog.getByLabel('实际投入（分钟）').fill('-1');
  await dialog.getByRole('button', { name: '保存今日打卡' }).click();
  await expect(dialog.getByRole('alert')).toContainText('0–1440');
  expect(saveCount).toBe(0);
  await dialog.getByLabel('实际投入（分钟）').fill('25');
  await dialog.getByRole('button', { name: '保存今日打卡' }).click();
  await expect(dialog.getByRole('alert')).toContainText('暂时无法保存');
  await expect(dialog.getByLabel('今日学习记录', { exact: true })).toHaveValue('这次学习的关键收获');
  await dialog.getByRole('button', { name: '保存今日打卡' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('status')).toContainText('今日学习已记录');
  expect(saveCount).toBe(2);
});

test('矮屏弹窗固定操作区且不会被 AI 入口盖住', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto('/');
  const trigger = page.getByRole('button', { name: /记录今日学习|修改今日打卡/ });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: '今天实际学了什么？' });
  const box = await dialog.boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(600);
  await expect(dialog.getByRole('button', { name: '保存今日打卡' })).toBeInViewport();
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await page.screenshot({ path: '../../tmp/ui-review/checkin-mobile.png' });
  await dialog.getByRole('button', { name: '取消', exact: true }).click();
  await expect(trigger).toBeFocused();
});

test('开始学习失败有明确反馈并恢复可操作状态', async ({ page }) => {
  await page.route('**/api/v1/learning/workspace', async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    json.data.current = null;
    await route.fulfill({ json });
  });
  await page.route('**/api/v1/learning/points/*/focus', (route) => route.fulfill({ status: 503, json: { error: { code: 'UNAVAILABLE', message: '暂时无法开始，请重试', retryable: true }, meta: { requestId: 'ui-focus-failure' } } }));
  await page.goto('/');
  const start = page.getByRole('button', { name: '开始这项具体任务 →' });
  await start.click();
  await expect(page.getByRole('alert')).toContainText('暂时无法开始');
  await expect(start).toBeEnabled();
});

test('主要页面适配桌面、平板和手机且无页面脚本错误', async ({ page }) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const width of [1440, 1024, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/knowledge/map', '/knowledge', '/knowledge/graph', '/notes', '/plan', '/jobs', '/settings', '/knowledge/WEB-01']) {
      await page.goto(path);
      await expect(page.locator('.route-shell h1').first()).toBeVisible();
      await page.waitForLoadState('networkidle');
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${width}px ${path} 横向溢出`).toBeLessThanOrEqual(1);
      if (path === '/' && [1440, 390].includes(width)) await page.screenshot({ path: `../../tmp/ui-review/learning-${width}.png`, fullPage: true });
    }
  }
  expect(errors).toEqual([]);
});
