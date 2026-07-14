import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = {};
    if (path.endsWith('/system/health')) data = { ok: true, db: true, dataDir: true, aiConfigured: false, timestamp: new Date().toISOString() };
    if (path.endsWith('/calendar/today')) data = { events: [], retests: [], stats: { total: 0, completed: 0, inProgress: 0, planned: 0 } };
    await route.fulfill({ json: { data, meta: { requestId: 'e2e' } } });
  });
});

test('主导航可访问且当前栏目高亮', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Career Atlas' })).toBeVisible();
  await expect(page.getByRole('link', { name: '今日' })).toHaveClass(/active/);

  await page.getByRole('link', { name: /知识体系/ }).click();
  await expect(page).toHaveURL(/\/knowledge\/map$/);
  await expect(page.getByRole('link', { name: /知识体系/ })).toHaveClass(/active/);
});
