# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: experience.spec.ts >> 核心使用体验 >> 重复进入掌握挑战会恢复会话并展示资料与作答契约
- Location: e2e/experience.spec.ts:611:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: '开始挑战' })
    - locator resolved to <button data-v-e52121b9="" class="primary-action">开始挑战</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not stable
    - retrying click action
    - waiting 20ms
    - waiting for element to be visible, enabled and stable

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - link "跳到主要内容" [ref=e4] [cursor=pointer]:
    - /url: "#main-content"
  - navigation "主导航" [ref=e5]:
    - generic [ref=e8]:
      - generic [ref=e9]: Career Atlas
      - paragraph [ref=e10]: AI 时代前端能力地图
    - paragraph [ref=e11]: 我的工作空间
    - list [ref=e12]:
      - listitem [ref=e13]:
        - link [ref=e14] [cursor=pointer]:
          - /url: /
          - strong [ref=e19]: 学习台
      - listitem [ref=e20]:
        - link [ref=e21] [cursor=pointer]:
          - /url: /knowledge/map
          - strong [ref=e26]: 知识体系
      - listitem [ref=e27]:
        - link [ref=e28] [cursor=pointer]:
          - /url: /notes
          - strong [ref=e33]: 笔记中心
      - listitem [ref=e34]:
        - link [ref=e35] [cursor=pointer]:
          - /url: /plan
          - strong [ref=e40]: 核心路线
      - listitem [ref=e41]:
        - link [ref=e42] [cursor=pointer]:
          - /url: /jobs
          - strong [ref=e47]: 求职支线
    - generic [ref=e48]:
      - link [ref=e49] [cursor=pointer]:
        - /url: /settings
        - strong [ref=e54]: 设置与数据
      - generic "服务正常" [ref=e55]:
        - generic [ref=e57]:
          - strong [ref=e58]: 服务正常
          - generic [ref=e59]: 本地优先 · 自主学习
  - generic [ref=e60]:
    - banner [ref=e61]:
      - generic [ref=e62]:
        - button "收起侧栏" [expanded] [ref=e63] [cursor=pointer]
        - generic [ref=e66]: 工作空间
        - generic [aria-hidden] [ref=e67]: /
        - generic [ref=e68]: 掌握挑战
      - button "快速查找，快捷键 Command 或 Control 加 K" [ref=e70] [cursor=pointer]:
        - generic [ref=e73]: 搜索知识点、页面…
        - generic [ref=e74]: ⌘ K
    - main [ref=e75]:
      - paragraph [ref=e76]: 掌握挑战页面已打开
      - main [ref=e79]:
        - button "← 返回知识点" [ref=e80] [cursor=pointer]
        - generic [ref=e81]:
          - generic [ref=e82]:
            - paragraph [ref=e83]: OPTIONAL MASTERY CHALLENGE · M1
            - heading "JS-02 掌握挑战" [level=1] [ref=e84]
            - paragraph [ref=e85]: 5 个渐进任务 · 100 分 · 建议 35 分钟 · M1 首次合同
          - generic [ref=e86]:
            - generic [ref=e87]: 待开始
            - button "取消本次挑战" [ref=e88]
        - generic [ref=e89]:
          - paragraph [ref=e90]: "01"
          - generic [ref=e91]:
            - heading "先尝试，再按需要逐步获得帮助" [level=2] [ref=e92]
            - paragraph [ref=e93]: 本卷会保留本知识点的原题合同；M1 从资料定位、最小产出到受限排错渐进展开。帮助不会扣分，但系统会如实记录独立程度；失败或中止不会撤销“已学完”。
            - button "开始挑战" [ref=e94] [cursor=pointer]
  - button "打开 Atlas AI 助手" [ref=e95] [cursor=pointer]:
    - generic [aria-hidden] [ref=e96]: ✦
    - generic [ref=e97]:
      - strong [ref=e98]: Atlas AI
      - generic [ref=e99]: 总结 · 解释 · 查资料
```

# Test source

```ts
  521 |       '/knowledge/materials/agent-05-human-in-the-loop-risk-approval.md/agent-05',
  522 |       '/knowledge/materials/agent-06-tasks-long-running-recovery-idempotency.md/agent-06',
  523 |       '/knowledge/materials/agent-07-multi-agent-coordination-context-isolation.md/agent-07',
  524 |     ];
  525 | 
  526 |     for (const materialPath of materials) {
  527 |       await expectMaterialPronunciations(page, materialPath);
  528 |     }
  529 | 
  530 |     const samples = [
  531 |       ['/knowledge/materials/aiapp-03-structured-output-schema-validation.md/aiapp-03', 'b29'],
  532 |       ['/knowledge/materials/aiapp-06-rag-citations-source-trust.md/aiapp-06', 'b30'],
  533 |       ['/knowledge/materials/agent-01-loop-planning-stopping-recovery.md/agent-01', 'b31'],
  534 |       ['/knowledge/materials/agent-03-mcp-transport-stateless-state-versioning.md/agent-03', 'b32'],
  535 |     ] as const;
  536 |     for (const [materialPath, batch] of samples) {
  537 |       await page.goto(materialPath);
  538 |       await playFirstPronunciation(page, batch);
  539 |     }
  540 |   });
  541 | 
  542 |   test('B33～B35 十三份主讲义只为关键名词提供英文发音', async ({ page }) => {
  543 |     const materials = [
  544 |       '/knowledge/materials/agent-08-tool-contract-schema-discoverability.md/agent-08',
  545 |       '/knowledge/materials/agent-09-observability-read-only-replay.md/agent-09',
  546 |       '/knowledge/materials/agent-10-identity-authorization-runtime-isolation.md/agent-10',
  547 |       '/knowledge/materials/aidev-04-ai-code-review-risk-evidence.md/aidev-04',
  548 |       '/knowledge/materials/aidev-07-dependency-source-security.md/aidev-07',
  549 |       '/knowledge/materials/aidev-10-ai-tool-data-team-governance.md/aidev-10',
  550 |       '/knowledge/materials/compat-01-baseline-progressive-enhancement-device-testing.md/compat-01',
  551 |       '/knowledge/materials/arch-01-quality-attributes-constraints-tradeoffs.md/arch-01',
  552 |       '/knowledge/materials/arch-02-technical-proposal-adr-review.md/arch-02',
  553 |       '/knowledge/materials/arch-03-progressive-migration-strangler-compatibility.md/arch-03',
  554 |       '/knowledge/materials/arch-04-technical-debt-prioritization-governance.md/arch-04',
  555 |       '/knowledge/materials/arch-05-framework-selection-lifecycle-migration.md/arch-05',
  556 |       '/knowledge/materials/lead-01-technical-roadmap-delegation-influence.md/lead-01',
  557 |     ];
  558 | 
  559 |     for (const materialPath of materials) {
  560 |       await expectMaterialPronunciations(page, materialPath);
  561 |     }
  562 | 
  563 |     const samples = [
  564 |       ['/knowledge/materials/agent-08-tool-contract-schema-discoverability.md/agent-08', 'b33'],
  565 |       ['/knowledge/materials/compat-01-baseline-progressive-enhancement-device-testing.md/compat-01', 'b34'],
  566 |       ['/knowledge/materials/arch-02-technical-proposal-adr-review.md/arch-02', 'b35'],
  567 |     ] as const;
  568 |     for (const [materialPath, batch] of samples) {
  569 |       await page.goto(materialPath);
  570 |       await playFirstPronunciation(page, batch);
  571 |     }
  572 |   });
  573 | 
  574 |   test('B01～B35 资料超过正文 80% 后自动标记看完，并在返回后保持状态', async ({ page }) => {
  575 |     const materialPath = '/knowledge/materials/lead-01-technical-roadmap-delegation-influence.md/lead-01';
  576 |     const progressPath = '/api/v1/knowledge/materials/lead-01-technical-roadmap-delegation-influence.md/lead-01/progress';
  577 | 
  578 |     await page.goto(materialPath);
  579 |     await expect(page.locator('.material-hero .reading-state')).toBeVisible();
  580 |     await expect(page.locator('.markdown-body')).toBeVisible();
  581 | 
  582 |     const progressResponse = page.waitForResponse((response) => (
  583 |       response.request().method() === 'PATCH'
  584 |       && new URL(response.url()).pathname === progressPath
  585 |     ));
  586 |     await page.evaluate(() => {
  587 |       const article = document.querySelector<HTMLElement>('.markdown-body');
  588 |       if (!article) throw new Error('未找到学习资料正文');
  589 |       const rect = article.getBoundingClientRect();
  590 |       const articleTop = rect.top + window.scrollY;
  591 |       window.scrollTo({ top: articleTop + rect.height * 0.85 - window.innerHeight, behavior: 'instant' });
  592 |     });
  593 | 
  594 |     const response = await progressResponse;
  595 |     expect(response.ok()).toBe(true);
  596 |     const payload = await response.json() as { data: { progressPercent: number; completed: boolean } };
  597 |     expect(payload.data.progressPercent).toBeGreaterThan(80);
  598 |     expect(payload.data.completed).toBe(true);
  599 |     await expect(page.locator('.material-hero .reading-state')).toContainText('已看完');
  600 |     await expect(page.locator('.reading-save-feedback')).toContainText('已自动标记为看完');
  601 | 
  602 |     await page.reload();
  603 |     await expect(page.locator('.material-hero .reading-state')).toContainText('已看完');
  604 | 
  605 |     await page.goto('/knowledge/LEAD-01');
  606 |     const materialLink = page.locator('a[href="/knowledge/materials/lead-01-technical-roadmap-delegation-influence.md/lead-01"]').first();
  607 |     await expect(materialLink).toBeVisible();
  608 |     await expect(materialLink.locator('.material-reading-badge')).toHaveText('已看完');
  609 |   });
  610 | 
  611 |   test('重复进入掌握挑战会恢复会话并展示资料与作答契约', async ({ page }) => {
  612 |     await mockAIReady(page);
  613 |     await page.goto('/knowledge/JS-02');
  614 |     // 只有显式开始才改变当前焦点；保存笔记或标记学完不隐式抢占。
  615 |     await page.getByRole('button', { name: '设为当前学习', exact: true }).click();
  616 |     await page.getByRole('button', { name: '我的笔记' }).click();
  617 |     await page.locator('.note-editor textarea').fill('会话恢复回归测试笔记：原型、对象模型与 this。');
  618 |     await page.getByRole('button', { name: '我已阅读资料并完成笔记' }).click();
  619 |     await page.getByRole('button', { name: /掌握挑战/ }).last().click();
  620 |     await page.getByRole('button', { name: '检查并开始这一级挑战 →' }).click();
> 621 |     await page.getByRole('button', { name: '开始挑战' }).click();
      |                                                      ^ Error: locator.click: Test timeout of 30000ms exceeded.
  622 |     await expect(page.getByText('相关知识点').first()).toBeVisible();
  623 |     await expect(page.getByText('题目输入').first()).toBeVisible();
  624 |     await expect(page.getByText('必须输出').first()).toBeVisible();
  625 |     await expect(page.getByText('指定格式').first()).toBeVisible();
  626 |     await expect(page.getByText(/原题任务 · 首考题/).first()).toBeVisible();
  627 |     await expect(page.getByText('M 阶段 / 复测').first()).toBeVisible();
  628 |     await expect(page.getByText('本地 Worker 自检（非安全沙箱 / 非服务端证明）').first()).toBeVisible();
  629 |     await expect(page.getByText('本题不启用本地自检；将按题目合同和语义评分复核。').first()).toBeVisible();
  630 |     await expect(page.getByText('否决项').first()).toBeVisible();
  631 |     await expect(page.getByText('本题对应的学习资料与具体位置').first()).toBeVisible();
  632 |     const hintStream = page.waitForResponse((response) => response.url().includes('/hints/stream'));
  633 |     await page.getByRole('button', { name: '给一个提示' }).first().click();
  634 |     expect((await hintStream).headers()['content-type']).toContain('text/event-stream');
  635 |     await expect(page.getByText(/题目规则提示|AI 针对本题生成/).first()).toBeVisible();
  636 |     const firstSessionPath = new URL(page.url()).pathname;
  637 | 
  638 |     await page.goto('/knowledge/JS-02?tab=mastery');
  639 |     await page.getByRole('button', { name: '检查并开始这一级挑战 →' }).click();
  640 |     await expect(page).toHaveURL(new RegExp(`${firstSessionPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\?resumed=1`));
  641 |     await expect(page.getByText(/已找到正在进行的 M1 掌握挑战/)).toBeVisible();
  642 |   });
  643 | 
  644 |   test('取消挑战保留旧答卷，并允许按当前合同新建会话', async ({ page }) => {
  645 |     await mockAIReady(page);
  646 |     await page.goto('/knowledge/JS-02?tab=mastery');
  647 |     await page.getByRole('button', { name: '检查并开始这一级挑战 →' }).click();
  648 |     await expect(page).toHaveURL(/\/assessment\//);
  649 |     const cancelledSessionPath = new URL(page.url()).pathname;
  650 |     const cancelledSessionId = cancelledSessionPath.split('/').at(-1);
  651 |     expect(cancelledSessionId).toBeTruthy();
  652 | 
  653 |     const firstAnswer = page.locator('.question-list textarea').first();
  654 |     await firstAnswer.fill('取消前保留的首题作答：原型链、调用形式与 this 绑定均已逐项说明。');
  655 |     await firstAnswer.blur();
  656 |     await expect(page.getByText('已保存到本地')).toBeVisible();
  657 | 
  658 |     await page.getByRole('button', { name: '取消本次挑战' }).click();
  659 |     await page.getByRole('dialog', { name: '取消本次挑战？' }).getByRole('button', { name: '确认取消' }).click();
  660 |     await expect(page.getByText('本次掌握挑战已中止。')).toBeVisible();
  661 |     await expect(page.getByText(/题目和已保存的答案不会被删除/)).toBeVisible();
  662 | 
  663 |     const cancelled = await page.evaluate(async (id) => {
  664 |       const response = await fetch(`/api/v1/assessments/${id}`);
  665 |       return response.json() as Promise<{ data: { session: { status: string }; answers: Array<{ answerContent: string }> } }>;
  666 |     }, cancelledSessionId!);
  667 |     expect(cancelled.data.session.status).toBe('CANCELLED');
  668 |     expect(cancelled.data.answers.some((answer) => answer.answerContent.includes('取消前保留的首题作答'))).toBe(true);
  669 | 
  670 |     await page.goto('/knowledge/JS-02?tab=mastery');
  671 |     await page.getByRole('button', { name: '检查并开始这一级挑战 →' }).click();
  672 |     await expect(page).toHaveURL(/\/assessment\//);
  673 |     expect(new URL(page.url()).pathname).not.toBe(cancelledSessionPath);
  674 |     await expect(page.getByText('待开始', { exact: true })).toBeVisible();
  675 |   });
  676 | 
  677 |   test('AI 不可用时在答题前说明影响、数据边界和修复入口', async ({ page }) => {
  678 |     await page.goto('/knowledge/JS-02?tab=mastery');
  679 |     await expect(page.getByText(/挑战题目合同、本点学习资料/)).toBeVisible();
  680 |     await page.getByRole('button', { name: '检查并开始这一级挑战 →' }).click();
  681 |     const dialog = page.getByRole('dialog', { name: '掌握挑战暂时无法完整评分' });
  682 |     await expect(dialog).toBeVisible();
  683 |     await expect(dialog).toContainText('尚未配置 AI 密钥');
  684 |     await expect(dialog).toContainText('资料阅读、笔记和站内练习仍可正常使用');
  685 |     await dialog.getByRole('button', { name: '去设置 AI' }).click();
  686 |     await expect(page).toHaveURL(/\/settings$/);
  687 |   });
  688 | 
  689 |   test('M4 明示七天稳定性门槛，并以真实变式取代旧题附录', async ({ page }) => {
  690 |     await page.goto('/knowledge/JS-01?tab=mastery');
  691 |     await expect(page.getByRole('button', { name: /M4.*稳定掌握.*至少 7 天后通过变式挑战/ })).toBeVisible();
  692 | 
  693 |     const sessionId = '00000000-0000-4000-8000-000000000004';
  694 |     const questionId = '00000000-0000-4000-8000-000000000003';
  695 |     await page.route(`**/api/v1/assessments/${sessionId}`, async (route) => {
  696 |       await route.fulfill({
  697 |         contentType: 'application/json',
  698 |         body: JSON.stringify({
  699 |           data: {
  700 |             session: {
  701 |               id: sessionId, knowledgePointCode: 'JS-01', assessmentType: 'RETEST', status: 'IN_PROGRESS',
  702 |               durationMinutes: 60, masteryStage: 4, challengeMode: 'MIXED', challengeProfile: 'CODING', assistanceLevel: 0,
  703 |               startedAt: '2026-08-16T00:00:00.000Z', submittedAt: null, gradedAt: null, resultId: null,
  704 |               provider: 'fake', model: 'fake', createdAt: '2026-08-16T00:00:00.000Z', updatedAt: '2026-08-16T00:00:00.000Z',
  705 |             },
  706 |             questions: [{
  707 |               id: questionId, sessionId, questionType: 'CODE_WRITE', dimension: 'practice', maxScore: 35, orderIndex: 2,
  708 |               createdAt: '2026-08-16T00:00:00.000Z',
  709 |               questionContent: JSON.stringify({
  710 |                 level: '最小产出', sourceQuestion: '首考题 3（最小产出）',
  711 |                 question: '针对复测变式完成最小实现或操作产出，并在固定输入和边界输入下各验证一次。复测变式依据：仅将循环声明从 `var` 改为 `let`，保持两个计数器 `A/B`、订阅/取消时机和其余 fixture 不变；预期循环输出为 `[0,1,2]`，取消后的 B 仍无通知。【M4 变式挑战合同】本题以变式为主任务，不要求重做首考题。',
  712 |                 stageContract: 'M4 稳定掌握：独立完成该点已配置的延迟复测变式，不提供题目帮助。',
  713 |                 retestVariant: '仅将循环声明从 `var` 改为 `let`，保持两个计数器 `A/B`、订阅/取消时机和其余 fixture 不变；预期循环输出为 `[0,1,2]`，取消后的 B 仍无通知；提交新的循环输出、隔离计数与取消断言作为新证据。',
  714 |                 givenInput: '固定输入：仅将循环声明从 `var` 改为 `let`。',
  715 |                 expectedOutput: '变式最小产出、固定输入结果、边界输入结果及两者差异解释。',
  716 |                 answerRequirements: ['只完成本题的变式动作，不复写首考作答'],
  717 |                 answerFormat: '## 变式最小产出',
  718 |                 failureFixture: 'M4 变式故障夹具：采用变式后，故意遗漏一个关键条件；不得改用首考故障。',
  719 |                 verificationChecklist: ['实际输出必须针对本题变式，且能与首考题干区分'],
  720 |                 vetoItems: ['不得以旧题答案代替变式产出。'],
  721 |                 deterministicRequired: true,
```