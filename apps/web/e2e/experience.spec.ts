import { expect, test } from '@playwright/test';

test.describe.serial('核心使用体验', () => {
  test('知识脑图展示完整能力体系并可逐层展开', async ({ page }) => {
    await page.goto('/knowledge/map');
    await expect(page.getByRole('heading', { name: '把知识连成一张图' })).toBeVisible();
    await expect(page.locator('.map-stats')).toContainText('223');
    await expect(page.locator('.map-stats')).toContainText('7');
    await expect(page.locator('.group-branch')).toHaveCount(7);

    const aiDomain = page.getByRole('button', { name: /12 AI 原生前端与模型应用工程/ });
    await aiDomain.click();
    await expect(page.getByRole('button', { name: /AIAPP-01/ })).toBeVisible();
  });

  test('资料学习、笔记和掌握状态彼此独立', async ({ page }) => {
    await page.goto('/knowledge/AIAPP-01');
    await expect(page.getByText('AIAPP-01', { exact: true }).first()).toBeVisible();
    const localResource = page.locator('.markdown-content a[href^="/knowledge/materials/"]').first();
    await expect(localResource).toBeVisible();
    await expect(localResource).toHaveAttribute('href', '/knowledge/materials/core-and-ecosystem-topics.md/aiapp-01');
    await expect(localResource).not.toHaveAttribute('target', '_blank');
    const externalResource = page.locator('.markdown-content a[href^="https://"]').first();
    await expect(externalResource).toBeVisible();
    await expect(externalResource).toHaveAttribute('target', '_blank');
    await expect(externalResource).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(page.getByText('推荐学习方式', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: '学完资料后，可以这样练' })).toBeVisible();
    await expect(page.getByRole('button', { name: '在系统中开始并完成 →' }).first()).toBeVisible();
    await expect(page.getByText(/不再用没有入口的“项目时间”占位/)).toBeVisible();
    const panelWidths = await page.locator('.materials-layout > .content-card').evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().width)));
    expect(Math.abs((panelWidths[0] ?? 0) - (panelWidths[1] ?? 0))).toBeLessThanOrEqual(1);
    const activityHeights = await page.locator('.activity-panel > article').evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().height)));
    expect(Math.max(...activityHeights) - Math.min(...activityHeights)).toBeLessThanOrEqual(1);

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
    await expect(page.getByText('00 · 具体任务题干')).toBeVisible();
    await expect(page.getByText('01 · 固定输入与约束')).toBeVisible();
    await expect(page.getByText('02 · 必须提交')).toBeVisible();
    await expect(page.getByText('03 · 验证清单')).toBeVisible();
    await expect(page.getByText('本地结构检查')).toBeVisible();
    await expect(page.getByText('AI 语义复核')).toBeVisible();
    await expect(page.getByText('完全通过', { exact: true })).toBeVisible();
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
    await expect(page.locator('.validation-result')).toBeVisible();
    await expect(page.locator('.validation-result')).toContainText(/本地结构检查|AI 语义复核|完全通过/);
    await page.setViewportSize({ width: 390, height: 844 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('本地结构失败不能被未参与的 AI 复核伪装为完全通过', async ({ page }) => {
    await page.goto('/knowledge/TS-01');
    await page.getByRole('button', { name: '在系统中开始并完成 →' }).click();

    // 故意保留空模板和未执行代码：服务端只能返回本地结构失败，不能把它升级为 AI 通过。
    const validationStream = page.waitForResponse((response) => response.url().includes('/validate/stream'));
    await page.getByRole('button', { name: '提交并验证' }).click();
    expect((await validationStream).headers()['content-type']).toContain('text/event-stream');

    const result = page.locator('.validation-result');
    await expect(result).toBeVisible();
    await expect(result.locator('header strong')).toHaveText('本地结构检查待补充');
    await expect(result.locator('header span')).toHaveText('仅本地结构检查');
    await expect(result).not.toHaveClass(/passed/);
    await expect(result.locator('li:not(.passed)')).not.toHaveCount(0);
    await expect(page.locator('.validation-rail li').nth(1)).toContainText('未参与；不能替代为完全通过。');
    await expect(page.locator('.validation-rail li').nth(2)).toHaveClass(/pending/);
    await expect(page.locator('.workspace-header > span')).not.toHaveText('完全通过');
  });

  test('自建中文讲义能从知识点、练习与挑战共用的站内地址打开', async ({ page }) => {
    await page.goto('/knowledge/JS-04');
    const materialLink = page.getByRole('link', { name: /中文补充讲义：JS-04/ }).first();
    await expect(materialLink).toHaveAttribute('href', '/knowledge/materials/content-audit-01-03.md/js-04');
    await materialLink.click();
    await expect(page).toHaveURL(/\/knowledge\/materials\/content-audit-01-03\.md\/js-04$/);
    await expect(page.getByText('IN-SITE LEARNING MATERIAL · JS-04')).toBeVisible();
    await expect(page.getByRole('heading', { name: /JS-04/ }).first()).toBeVisible();
    await expect(page.getByText(/任务、微任务|事件循环/).first()).toBeVisible();
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
    await expect(page.getByText(/原题任务 · 首考题/).first()).toBeVisible();
    await expect(page.getByText('M 阶段 / 复测').first()).toBeVisible();
    await expect(page.getByText('本地 Worker 自检（非安全沙箱 / 非服务端证明）').first()).toBeVisible();
    await expect(page.getByText('本题不启用本地自检；将按题目合同和语义评分复核。').first()).toBeVisible();
    await expect(page.getByText('否决项').first()).toBeVisible();
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

  test('取消挑战保留旧答卷，并允许按当前合同新建会话', async ({ page }) => {
    await page.goto('/knowledge/JS-02?tab=mastery');
    await page.getByRole('button', { name: '开始这一级挑战 →' }).click();
    await expect(page).toHaveURL(/\/assessment\//);
    const cancelledSessionPath = new URL(page.url()).pathname;
    const cancelledSessionId = cancelledSessionPath.split('/').at(-1);
    expect(cancelledSessionId).toBeTruthy();

    const firstAnswer = page.locator('.question-list textarea').first();
    await firstAnswer.fill('取消前保留的首题作答：原型链、调用形式与 this 绑定均已逐项说明。');
    await firstAnswer.blur();
    await expect(page.getByText('已保存到本地')).toBeVisible();

    await page.getByRole('button', { name: '取消本次挑战' }).click();
    await page.getByRole('dialog', { name: '取消本次挑战？' }).getByRole('button', { name: '确认取消' }).click();
    await expect(page.getByText('本次掌握挑战已中止。')).toBeVisible();
    await expect(page.getByText(/题目和已保存的答案不会被删除/)).toBeVisible();

    const cancelled = await page.evaluate(async (id) => {
      const response = await fetch(`/api/v1/assessments/${id}`);
      return response.json() as Promise<{ data: { session: { status: string }; answers: Array<{ answerContent: string }> } }>;
    }, cancelledSessionId!);
    expect(cancelled.data.session.status).toBe('CANCELLED');
    expect(cancelled.data.answers.some((answer) => answer.answerContent.includes('取消前保留的首题作答'))).toBe(true);

    await page.goto('/knowledge/JS-02?tab=mastery');
    await page.getByRole('button', { name: '开始这一级挑战 →' }).click();
    await expect(page).toHaveURL(/\/assessment\//);
    expect(new URL(page.url()).pathname).not.toBe(cancelledSessionPath);
    await expect(page.getByText('待开始', { exact: true })).toBeVisible();
  });

  test('M4 明示七天稳定性门槛，并以真实变式取代旧题附录', async ({ page }) => {
    await page.goto('/knowledge/JS-01?tab=mastery');
    await expect(page.getByRole('button', { name: /M4.*稳定掌握.*至少 7 天后通过变式挑战/ })).toBeVisible();

    await page.route('**/api/v1/assessments/m4-variant-session', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            session: {
              id: 'm4-variant-session', knowledgePointCode: 'JS-01', assessmentType: 'RETEST', status: 'IN_PROGRESS',
              durationMinutes: 60, masteryStage: 4, challengeMode: 'MIXED', challengeProfile: 'CODING', assistanceLevel: 0,
              startedAt: '2026-08-16T00:00:00.000Z', submittedAt: null, gradedAt: null, resultId: null,
              provider: 'fake', model: 'fake', createdAt: '2026-08-16T00:00:00.000Z', updatedAt: '2026-08-16T00:00:00.000Z',
            },
            questions: [{
              id: 'm4-q3', sessionId: 'm4-variant-session', questionType: 'CODE_WRITE', dimension: 'practice', maxScore: 35, orderIndex: 2,
              createdAt: '2026-08-16T00:00:00.000Z',
              questionContent: JSON.stringify({
                level: '最小产出', sourceQuestion: '首考题 3（最小产出）',
                question: '针对复测变式完成最小实现或操作产出，并在固定输入和边界输入下各验证一次。复测变式依据：仅将循环声明从 `var` 改为 `let`，保持两个计数器 `A/B`、订阅/取消时机和其余 fixture 不变；预期循环输出为 `[0,1,2]`，取消后的 B 仍无通知。【M4 变式挑战合同】本题以变式为主任务，不要求重做首考题。',
                stageContract: 'M4 稳定掌握：独立完成该点已配置的延迟复测变式，不提供题目帮助。',
                retestVariant: '仅将循环声明从 `var` 改为 `let`，保持两个计数器 `A/B`、订阅/取消时机和其余 fixture 不变；预期循环输出为 `[0,1,2]`，取消后的 B 仍无通知；提交新的循环输出、隔离计数与取消断言作为新证据。',
                givenInput: '固定输入：仅将循环声明从 `var` 改为 `let`。',
                expectedOutput: '变式最小产出、固定输入结果、边界输入结果及两者差异解释。',
                answerRequirements: ['只完成本题的变式动作，不复写首考作答'],
                answerFormat: '## 变式最小产出',
                failureFixture: 'M4 变式故障夹具：采用变式后，故意遗漏一个关键条件；不得改用首考故障。',
                verificationChecklist: ['实际输出必须针对本题变式，且能与首考题干区分'],
                vetoItems: ['不得以旧题答案代替变式产出。'],
                deterministicRequired: true,
                testCases: [{ id: 'contract-normal', input: 'let 循环', expectedOutput: '[ASSERT PASS] contract-normal', isHidden: false }],
              }),
            }],
            answers: [],
          },
          meta: { requestId: 'm4-variant-e2e' },
        }),
      });
    });

    await page.goto('/assessment/m4-variant-session');
    await expect(page.getByText('M4 稳定掌握：独立完成该点已配置的延迟复测变式，不提供题目帮助。')).toBeVisible();
    await expect(page.getByText(/仅将循环声明从 `var` 改为 `let`/).first()).toBeVisible();
    await expect(page.locator('.challenge-contract')).toContainText('M4 变式故障夹具');
    await expect(page.locator('.question-body h2')).toContainText('本题以变式为主任务，不要求重做首考题。');
    await expect(page.locator('.question-body h2')).not.toContainText('固定 fixture 为上述循环、两个独立计数器');
  });

  test('64 周内容是可展开的路线参考而非每日计划', async ({ page }) => {
    await page.goto('/plan');
    await expect(page.getByRole('heading', { name: '64 周路线参考' })).toBeVisible();
    await expect(page.getByText(/不规定你哪一天必须学什么/)).toBeVisible();
    await expect(page.getByText(/不会制造逾期/)).toBeVisible();
    await expect(page.locator('.week-list article')).toHaveCount(64);
    const pairedHeights = await page.locator('.week-list article:not(.open)').evaluateAll((items) => items.slice(0, 2).map((item) => item.getBoundingClientRect().height));
    expect(Math.abs((pairedHeights[0] ?? 0) - (pairedHeights[1] ?? 0))).toBeLessThanOrEqual(1);
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
    await editor.fill('# 类型与不可变更新\n\n- [x] 理解浅拷贝\n\n| 输入 | 输出 |\n| --- | --- |\n| state | next |\n\n$$T(n) = O(n)$$\n\n```js\nconst next = { ...state };\n```\n\n```mermaid\nflowchart LR\n  A[原对象] --> B[新对象]\n```\n\n::: thinking\n先核对引用边界。\n:::');
    await expect(page.getByLabel('Markdown 实时预览').getByRole('heading', { name: '类型与不可变更新' })).toBeVisible();
    await expect(page.getByLabel('Markdown 实时预览').locator('pre.hljs code')).toContainText('const next');
    await expect(page.getByLabel('Markdown 实时预览').locator('table')).toBeVisible();
    await expect(page.getByLabel('Markdown 实时预览').locator('.katex-display')).toBeVisible();
    await expect(page.getByLabel('Markdown 实时预览').locator('.mermaid-diagram[data-mermaid-state="ready"] svg')).toBeVisible();
    await expect(page.getByLabel('Markdown 实时预览').locator('details.thinking-block')).toContainText('先核对引用边界');
    await page.getByRole('button', { name: '保存原始笔记' }).click();

    await page.route('**/notes/JS-03/organize/stream', async (route) => {
      const response = await route.fetch();
      const body = await response.text();
      const longThinking = Array.from({ length: 90 }, (_, index) => `第 ${index + 1} 步：核对原始笔记与学习资料的对应关系。`).join('\n\n');
      const thinkingEvent = `event: thinking\ndata: ${JSON.stringify({ delta: longThinking })}\n\n`;
      await route.fulfill({ response, body: body.replace('event: done', `${thinkingEvent}event: done`) });
    });
    const streamResponse = page.waitForResponse((response) => response.url().includes('/notes/JS-03/organize/stream'));
    await page.getByRole('button', { name: '用 AI 整理并核对' }).click();
    const response = await streamResponse;
    expect(response.headers()['content-type']).toContain('text/event-stream');
    expect((await response.body()).toString()).toContain('event: progress');
    await expect(page.getByText(/已生成安全排版稿/)).toBeVisible();
    await expect(page.locator('.organized .markdown-content')).toContainText('类型与不可变更新');
    const thinkingPanel = page.locator('.organized details.thinking-panel');
    await expect(thinkingPanel).toHaveJSProperty('open', false);
    await thinkingPanel.locator('summary').click();
    const thinkingViewport = thinkingPanel.locator('.thinking-panel__content');
    const thinkingMetrics = await thinkingViewport.evaluate((element) => ({ clientHeight: element.clientHeight, scrollHeight: element.scrollHeight }));
    expect(thinkingMetrics.scrollHeight).toBeGreaterThan(thinkingMetrics.clientHeight);
    expect(thinkingMetrics.clientHeight).toBeLessThanOrEqual(360);
    const noteCardHeights = await page.locator('.notes-layout > .content-card').evaluateAll((items) => items.map((item) => item.getBoundingClientRect().height));
    expect(Math.abs((noteCardHeights[0] ?? 0) - (noteCardHeights[1] ?? 0))).toBeLessThanOrEqual(1);

    await page.goto('/notes');
    expect(await page.locator('.notes-header').evaluate((element) => element.getBoundingClientRect().height)).toBeLessThan(100);
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
    await expect(page.getByText('223 个知识点')).toBeVisible();
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
