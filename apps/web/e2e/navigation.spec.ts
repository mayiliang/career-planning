import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/system/health', async (route) => {
    await route.fulfill({
      json: {
        data: { ok: true, db: true, dataDir: true, aiConfigured: false, timestamp: new Date().toISOString() },
        meta: { requestId: 'e2e' },
      },
    });
  });
});

test('主导航可访问且当前栏目高亮', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '学习台' })).toBeVisible();
  await expect(page.getByRole('link', { name: '学习台' })).toHaveClass(/active/);

  await page.getByRole('link', { name: /知识体系/ }).click();
  await expect(page).toHaveURL(/\/knowledge\/map$/);
  await expect(page.getByRole('link', { name: /知识体系/ })).toHaveClass(/active/);

  await page.getByRole('link', { name: /笔记中心/ }).click();
  await expect(page).toHaveURL(/\/notes$/);
  await expect(page.getByRole('link', { name: /笔记中心/ })).toHaveClass(/active/);
});
