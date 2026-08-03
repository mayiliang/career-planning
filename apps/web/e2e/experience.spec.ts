import { expect, test } from '@playwright/test';

test.describe.serial('核心使用体验', () => {
  test('知识脑图展示完整能力体系并可逐层展开', async ({ page }) => {
    await page.goto('/knowledge/map');
    await expect(page.getByRole('heading', { name: '把知识连成一张图' })).toBeVisible();
    await expect(page.locator('.map-stats')).toContainText('219');
    await expect(page.locator('.map-stats')).toContainText('7');
    await expect(page.locator('.group-branch')).toHaveCount(7);

    const aiDomain = page.getByRole('button', { name: /12 AI 原生前端与模型应用工程/ });
    await aiDomain.click();
    await expect(page.getByRole('button', { name: /AIAPP-01/ })).toBeVisible();
  });

  test('资料学习、笔记和掌握状态彼此独立', async ({ page }) => {
    await page.goto('/knowledge/AIAPP-01');
    await expect(page.getByText('AIAPP-01', { exact: true }).first()).toBeVisible();
    const resource = page.locator('.markdown-content a').first();
    await expect(resource).toBeVisible();
    await expect(resource).toHaveAttribute('href', /^https:\/\//);
    await expect(resource).toHaveAttribute('target', '_blank');
    await expect(resource).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(page.getByText('推荐学习方式', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: '学完资料后，可以这样练' })).toBeVisible();
    await expect(page.getByRole('button', { name: '在系统中开始并完成 →' }).first()).toBeVisible();
    await expect(page.getByText(/不再用没有入口的“项目时间”占位/)).toBeVisible();

    await page.getByRole('button', { name: '我的笔记' }).click();
    await expect(page.getByRole('heading', { name: '边写边预览，你的原文永远保留' })).toBeVisible();
    await expect(page.getByText(/只会生成新稿，不覆盖你的文字/)).toBeVisible();

    await page.getByRole('button', { name: /掌握挑战/ }).last().click();
    await expect(page.getByText('M3', { exact: true })).toBeVisible();
    await expect(page.getByText('已掌握', { exact: true })).toBeVisible();
    await expect(page.getByText('M4', { exact: true })).toBeVisible();
    await expect(page.getByText('稳定掌握', { exact: true })).toBeVisible();
  });

  test('代码练习在站内执行、保存输出并提供明确任务契约', async ({ page }) => {
    await page.goto('/knowledge/JS-01');
    await page.getByRole('button', { name: '在系统中开始并完成 →' }).first().click();
    await expect(page.getByText('01 · 明确输入')).toBeVisible();
    await expect(page.getByText('02 · 必须提交')).toBeVisible();
    await expect(page.getByText('03 · 完成判定')).toBeVisible();
    const codeEditor = page.getByRole('textbox', { name: '练习代码' });
    await expect(codeEditor).toBeVisible();
    await codeEditor.fill("const input = 2;\nconst expected = 3;\nconst actual = input + 1;\nconsole.log({ input, expected, actual });\nconsole.assert(actual === expected, '固定样例通过');");
    await page.getByRole('button', { name: '▶ 执行并捕获输出' }).click();
    await expect(page.locator('.execution-output')).toContainText('SUCCESS');
    await expect(page.locator('.execution-output')).toContainText('ASSERT PASS');
    await page.locator('.submission-editor textarea').fill('# 固定输入\n输入为 2。\n# 预期输出\n预期为 3。\n# 实际输出\n脚本输出为 3。\n# 资料机制映射\n依据学习资料解释执行上下文、作用域与闭包机制。\n# 边界与异常验证\n补充边界输入、异常条件、验证动作和可复核证据。');
    await page.getByRole('button', { name: '保存草稿' }).click();
    await expect(page.getByText('练习草稿、代码和执行输出已经保存。')).toBeVisible();
    const validationStream = page.waitForResponse((response) => response.url().includes('/validate/stream'));
    await page.getByRole('button', { name: '提交并验证' }).click();
    expect((await validationStream).headers()['content-type']).toContain('text/event-stream');
    await expect(page.getByText('练习已通过系统验证并保存为完成证据。')).toBeVisible();
  });

  test('重复进入掌握挑战会恢复会话并展示资料与作答契约', async ({ page }) => {
    await page.goto('/knowledge/JS-02');
    await page.getByRole('button', { name: '我的笔记' }).click();
    await page.locator('.note-editor textarea').fill('会话恢复回归测试笔记：原型、对象模型与 this。');
    await page.getByRole('button', { name: '我已阅读资料并完成笔记' }).click();
    await page.getByRole('button', { name: /掌握挑战/ }).last().click();
    await page.getByRole('button', { name: '开始这一级挑战 →' }).click();
    await page.getByRole('button', { name: '开始挑战' }).click();
    await expect(page.getByText('相关知识点').first()).toBeVisible();
    await expect(page.getByText('题目输入').first()).toBeVisible();
    await expect(page.getByText('必须输出').first()).toBeVisible();
    await expect(page.getByText('指定格式').first()).toBeVisible();
    await expect(page.getByText('本题对应的学习资料与具体位置').first()).toBeVisible();
    const hintStream = page.waitForResponse((response) => response.url().includes('/hints/stream'));
    await page.getByRole('button', { name: '给一个提示' }).first().click();
    expect((await hintStream).headers()['content-type']).toContain('text/event-stream');
    await expect(page.getByText(/题目规则提示|AI 针对本题生成/).first()).toBeVisible();
    const firstSessionPath = new URL(page.url()).pathname;

    await page.goto('/knowledge/JS-02?tab=mastery');
    await page.getByRole('button', { name: '开始这一级挑战 →' }).click();
    await expect(page).toHaveURL(new RegExp(`${firstSessionPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\?resumed=1`));
    await expect(page.getByText(/已找到正在进行的 M1 掌握挑战/)).toBeVisible();
  });

  test('64 周内容是可展开的路线参考而非每日计划', async ({ page }) => {
    await page.goto('/plan');
    await expect(page.getByRole('heading', { name: '64 周路线参考' })).toBeVisible();
    await expect(page.getByText(/不规定你哪一天必须学什么/)).toBeVisible();
    await expect(page.getByText(/不会制造逾期/)).toBeVisible();
    await expect(page.locator('.week-list article')).toHaveCount(64);
    const firstWeek = page.locator('.week-list article').filter({ has: page.locator('.week-points button') }).first();
    const firstPoint = firstWeek.locator('.week-points button').first();
    if (!(await firstPoint.isVisible())) await firstWeek.locator('.week-summary').click();
    await expect(firstPoint).toBeVisible();
    await expect(firstPoint).toContainText('JS-01');
    await expect(page.getByText('每天都明确学什么')).toHaveCount(0);
  });

  test('详情下一步与路线一致，关系分支按知识点去重', async ({ page }) => {
    await page.goto('/knowledge/JS-01');
    await expect(page.getByRole('heading', { name: '继续当前路线的下一个知识点' })).toBeVisible();
    // JS-02 已在上一条回归用例中学完，连续路线应自动跳过它并推荐 JS-03。
    await expect(page.locator('.branch-grid article').first()).toContainText('JS-03');
    await expect(page.locator('.branch-grid article').first()).toContainText('唯一下一步');
    await expect(page.getByText('TS-01', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '学习下一个 →' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: '暂缓整条路线' })).toHaveCount(0);

    await page.goto('/knowledge/A11Y-01');
    await expect(page.getByText('BROWSER-01', { exact: true })).toBeVisible();
    await expect(page.getByText('UX-01', { exact: true })).toHaveCount(0);
  });

  test('路线建议、学习完成和学习台当前现场形成连续闭环', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.current-card')).toContainText('JS-02');
    await expect(page.locator('.current-card')).toContainText('最近完成');
    await page.getByRole('button', { name: /学习下一个 · JS-03/ }).click();
    await expect(page).toHaveURL(/\/knowledge\/JS-03$/);

    await page.getByRole('button', { name: '我的笔记' }).click();
    await page.locator('.note-editor textarea').fill('端到端测试笔记：类型、相等、拷贝与不可变更新。');
    await page.getByRole('button', { name: '我已阅读资料并完成笔记' }).click();
    await expect(page.getByText('已学完 ✓', { exact: true })).toBeVisible();

    await page.goto('/');
    await expect(page.locator('.current-card')).toContainText('JS-03');
    await expect(page.locator('.current-card')).toContainText('最近完成');
    const nextPointButton = page.getByRole('button', { name: /^学习下一个 · / });
    await expect(nextPointButton).toBeVisible();
    await nextPointButton.click();
    await expect(page).toHaveURL(/\/knowledge\/[^/?]+$/);
    await page.getByRole('button', { name: '暂时不学' }).click();
    await expect(page.getByRole('dialog', { name: '暂时搁置这个知识点？' })).toBeVisible();
    await page.getByRole('button', { name: '取消' }).click();
  });

  test('知识清单支持全局命令导航，笔记中心按体系归档', async ({ page }) => {
    await page.goto('/knowledge');
    await page.getByRole('button', { name: /快速查找/ }).click();
    await page.getByRole('textbox', { name: '搜索页面或知识点' }).fill('VUE-11');
    await expect(page.getByRole('option', { name: /VUE-11/ })).toBeVisible();

    await page.goto('/notes');
    await expect(page.getByRole('heading', { name: '笔记中心' })).toBeVisible();
    await expect(page.getByText(/知识点里写下的内容会自动同步到这里/)).toBeVisible();
  });

  test('Markdown 笔记实时预览、AI 流式整理并可切换排序', async ({ page }) => {
    await page.goto('/knowledge/JS-03?tab=notes');
    const editor = page.getByRole('textbox', { name: 'Markdown 原始笔记' });
    await editor.fill('# 类型与不可变更新\n\n- [x] 理解浅拷贝\n\n```js\nconst next = { ...state };\n```');
    await expect(page.getByLabel('Markdown 实时预览').getByRole('heading', { name: '类型与不可变更新' })).toBeVisible();
    await expect(page.getByLabel('Markdown 实时预览').locator('pre code')).toContainText('const next');
    await page.getByRole('button', { name: '保存原始笔记' }).click();

    const streamResponse = page.waitForResponse((response) => response.url().includes('/notes/JS-03/organize/stream'));
    await page.getByRole('button', { name: '用 AI 整理并核对' }).click();
    const response = await streamResponse;
    expect(response.headers()['content-type']).toContain('text/event-stream');
    await expect(page.getByText(/已生成安全排版稿/)).toBeVisible();
    await expect(page.locator('.organized .markdown-content')).toContainText('类型与不可变更新');

    await page.goto('/notes');
    const sort = page.getByLabel('笔记排序');
    await expect(sort).toHaveValue('knowledge');
    await expect(page.locator('.notes-index section button code').first()).toHaveText('JS-02');
    await sort.selectOption('updated_desc');
    await expect(page.locator('.notes-index section button code').first()).toHaveText('JS-03');
  });

  test('学习台不分配每日任务并支持回顾式打卡', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: '学习台' })).toBeVisible();
    await expect(page.getByText('这里没有每日任务表', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: '按你的节奏积累' })).toBeVisible();
    await expect(page.getByText('M3 已掌握', { exact: true })).toBeVisible();
    await expect(page.getByText('M4 稳定掌握', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: /记录今日学习|修改今日打卡/ }).click();
    await expect(page.getByRole('heading', { name: '今天实际学了什么？' })).toBeVisible();
    await expect(page.getByText(/系统只记录事实，不检查计划/)).toBeVisible();
  });

  test('关系图可浏览路径、搜索知识点并进入局部关系', async ({ page }) => {
    await page.goto('/knowledge/graph');
    await expect(page.getByRole('heading', { name: '沿着关系理解知识' })).toBeVisible();
    await expect(page.locator('.domain-node')).toHaveCount(20);
    await expect(page.locator('.vue-flow__edge')).not.toHaveCount(0);

    await page.getByLabel('定位知识点').fill('AIAPP-03');
    await page.getByRole('button', { name: /AIAPP-03/ }).click();
    await expect(page.getByText('AIAPP-03', { exact: true }).last()).toBeVisible();
    await expect(page.getByText('单击选择 · 双击打开知识点')).toBeVisible();
    await expect(page.locator('.knowledge-node')).toHaveCount(15);
  });

  test('系统页说明自主节奏、数据备份和重置保留笔记', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: '系统与数据' })).toBeVisible();
    await expect(page.getByText(/64 周内容只作为可选路线参考/)).toBeVisible();
    await expect(page.getByText('219 个知识点')).toBeVisible();
    await expect(page.getByText('20 个领域已入库')).toBeVisible();
    await expect(page.getByText(/每天自动创建一次一致性快照/)).toBeVisible();
    await expect(page.getByText(/清空进度，但保留全部笔记/)).toBeVisible();
    await expect(page.getByText(/^(?:已配置(?: \/ 连接失败)?|未配置)$/)).toBeVisible();
  });

  test('窄屏下主导航和脑图没有页面级横向溢出', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/knowledge/map');
    await expect(page.getByRole('heading', { name: '把知识连成一张图' })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page.getByRole('link', { name: /学习台/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /笔记中心/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /路线参考/ })).toBeVisible();
  });

  test('窄屏下新学习路径没有页面级横向溢出', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ['/', '/knowledge', '/knowledge/graph', '/notes', '/plan', '/knowledge/WEB-01']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} 存在横向溢出`).toBeLessThanOrEqual(1);
    }
  });
});
