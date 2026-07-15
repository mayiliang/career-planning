import { expect, test } from '@playwright/test';

test.describe.serial('核心使用体验', () => {
  test('知识脑图展示完整能力体系并可逐层展开', async ({ page }) => {
    await page.goto('/knowledge/map');
    await expect(page.getByRole('heading', { name: '把知识连成一张图' })).toBeVisible();
    await expect(page.locator('.map-stats')).toContainText('143');
    await expect(page.locator('.map-stats')).toContainText('5');
    await expect(page.locator('.group-branch')).toHaveCount(5);

    const aiDomain = page.getByRole('button', { name: /12 AI 原生前端与模型应用工程/ });
    await aiDomain.click();
    await expect(page.getByRole('button', { name: /AIAPP-01/ })).toBeVisible();
  });

  test('学习资料是安全的可点击外链', async ({ page }) => {
    await page.goto('/knowledge/AIAPP-01');
    await expect(page.locator('.point-code')).toHaveText('AIAPP-01');
    const resource = page.locator('.markdown-content a').first();
    await expect(resource).toBeVisible();
    await expect(resource).toHaveAttribute('href', /^https:\/\//);
    await expect(resource).toHaveAttribute('target', '_blank');
    await expect(resource).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(page.getByText('预计 5 小时 30 分 完成首次掌握')).toBeVisible();
    await expect(page.getByText('资料精读', { exact: true })).toBeVisible();
    await expect(page.getByText('7 天复测', { exact: true })).toBeVisible();
  });

  test('学习计划提供 7 天周视图和请假入口', async ({ page }) => {
    await page.goto('/plan');
    await expect(page.getByRole('heading', { name: '学习计划' })).toBeVisible();
    await expect(page.getByText('每天都明确学什么', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: '周', exact: true }).click();
    await expect(page.locator('.agenda-day')).toHaveCount(7);
    await expect(page.locator('.learning-contract').first()).toBeVisible();
    await expect(page.getByText('基础底座', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('PROJECT', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('ASSESS', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('复测节奏', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('需要学习', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('必须掌握', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('必须完成', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('验收产出', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/前置已就绪|项前置待补/).first()).toBeVisible();
    await expect(page.locator('.effort-budget').first()).toContainText('预计投入');
    await expect(page.locator('.effort-budget').first()).toContainText('480 分钟容量');
    expect(await page.locator('.effort-budget.overloaded').count()).toBe(0);
    await page.getByRole('button', { name: '请假并顺延' }).click();
    await expect(page.getByRole('heading', { name: '请假并顺延学习计划' })).toBeVisible();
    await expect(page.getByText('所有未完成的学习、考核、复测和项目任务整体后移一天')).toBeVisible();
  });

  test('知识详情展示前置、后续和横向关联', async ({ page }) => {
    await page.goto('/knowledge/REACT-05');
    await expect(page.getByRole('heading', { name: '知识前置与后续路径' })).toBeVisible();
    await expect(page.getByText('REACT-04', { exact: true })).toBeVisible();
    await expect(page.getByText('REACT-06', { exact: true })).toBeVisible();
    await expect(page.getByText('VUE-06', { exact: true })).toBeVisible();
  });

  test('知识清单给出可解释的下一步并支持全局命令导航', async ({ page }) => {
    await page.goto('/knowledge');
    await expect(page.getByText('NEXT BEST ACTION', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: /JS-01/ })).toBeVisible();
    await expect(page.getByText('能力路线 1 / 143')).toBeVisible();
    await page.getByRole('button', { name: /快速查找/ }).click();
    await page.getByRole('textbox', { name: '搜索页面或知识点' }).fill('VUE-11');
    await expect(page.getByRole('option', { name: /VUE-11/ })).toBeVisible();
  });

  test('今日页提供当前任务、行动时间线、学习队列和未来七天', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: '今天的学习航线' })).toBeVisible();
    await expect(page.getByText('CURRENT', { exact: false }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: '今日行动时间线' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '需要继续推进' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '未来一周雷达' })).toBeVisible();
    await expect(page.locator('.week-days > button')).toHaveCount(7);
    await expect(page.locator('.mission-seal')).toContainText('预计');
    await expect(page.locator('.metric-grid')).toContainText('计划分钟');

    const checkinButton = page.getByRole('button', { name: /打卡|记录证据/ }).first();
    if (await checkinButton.isVisible()) {
      await checkinButton.click();
      await expect(page.locator('.dialog-content h2')).toBeVisible();
      await expect(page.getByRole('button', { name: '记录本次学习' })).toBeVisible();
    }
  });

  test('关系图谱可浏览路径、搜索知识点并进入局部关系', async ({ page }) => {
    await page.goto('/knowledge/graph');
    await expect(page.getByRole('heading', { name: '沿着关系理解知识' })).toBeVisible();
    await expect(page.locator('.domain-node')).toHaveCount(15);
    await expect(page.locator('.vue-flow__edge')).not.toHaveCount(0);

    await page.getByLabel('定位知识点').fill('AIAPP-03');
    await page.getByRole('button', { name: /AIAPP-03/ }).click();
    await expect(page.getByText('AIAPP-03', { exact: true }).last()).toBeVisible();
    await expect(page.getByText('单击选择 · 双击打开知识点')).toBeVisible();
    await expect(page.locator('.knowledge-node')).toHaveCount(10);
  });

  test('系统页显示自动初始化、DeepSeek 和自动备份状态', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: '系统与数据' })).toBeVisible();
    await expect(page.getByText('首次启动会自动迁移', { exact: false })).toBeVisible();
    await expect(page.getByText('143 个知识点')).toBeVisible();
    await expect(page.getByText('15 个领域已入库')).toBeVisible();
    await expect(page.getByText('系统每天自动创建一次一致性快照', { exact: false })).toBeVisible();
    await expect(page.getByText('已配置', { exact: true })).toBeVisible();
  });

  test('窄屏下主导航和脑图没有页面级横向溢出', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/knowledge/map');
    await expect(page.getByRole('heading', { name: '把知识连成一张图' })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page.getByRole('link', { name: /今日/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /学习计划/ })).toBeVisible();
  });

  test('窄屏下今日页和关系图谱没有页面级横向溢出', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ['/', '/knowledge', '/knowledge/graph']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} 存在横向溢出`).toBeLessThanOrEqual(1);
    }
  });
});
