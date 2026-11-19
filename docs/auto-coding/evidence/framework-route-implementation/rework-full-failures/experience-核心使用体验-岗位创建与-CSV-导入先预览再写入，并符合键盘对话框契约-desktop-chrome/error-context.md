# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: experience.spec.ts >> 核心使用体验 >> 岗位创建与 CSV 导入先预览再写入，并符合键盘对话框契约
- Location: e2e/experience.spec.ts:951:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('.empty-guide li')
Expected: 3
Received: 0
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" locator('.empty-guide li') with timeout 5000ms
  - waiting for locator('.empty-guide li')
    5 × locator resolved to 0 elements
      - unexpected value "0"

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
        - generic [ref=e68]: 求职
      - button "快速查找，快捷键 Command 或 Control 加 K" [ref=e70] [cursor=pointer]:
        - generic [ref=e73]: 搜索知识点、页面…
        - generic [ref=e74]: ⌘ K
    - main [ref=e75]:
      - paragraph [ref=e76]: 求职页面已打开
      - generic [ref=e79]:
        - generic [ref=e80]:
          - generic [ref=e81]:
            - generic [ref=e82]:
              - text: JOB SEARCH WORKSPACE
              - heading "求职管理" [level=1] [ref=e83]
              - paragraph [ref=e84]: 先记录事实，再把每个岗位推进到一个清晰的下一步。
            - generic [ref=e85]:
              - button "导入 CSV" [ref=e86] [cursor=pointer]
              - button "新增岗位" [ref=e87] [cursor=pointer]
          - generic "求职漏斗" [ref=e88]:
            - generic [ref=e89]:
              - generic [ref=e90]: "0"
              - generic [ref=e91]: 已保存
            - generic [aria-hidden] [ref=e92]: →
            - generic [ref=e93]:
              - generic [ref=e94]: "0"
              - generic [ref=e95]: 已投递
            - generic [aria-hidden] [ref=e96]: →
            - generic [ref=e97]:
              - generic [ref=e98]: "0"
              - generic [ref=e99]: 面试中
            - generic [aria-hidden] [ref=e100]: →
            - generic [ref=e101]:
              - generic [ref=e102]: "0"
              - generic [ref=e103]: Offer
            - generic [ref=e104]: Offer 占当前漏斗 0%
        - generic [ref=e105]:
          - generic [ref=e106]: NO JOBS YET
          - heading "先放入一个真实岗位" [level=2] [ref=e107]
          - paragraph [ref=e108]: 手动创建适合单个岗位；已有表格时，用 CSV 先预览、修正，再一次导入。
          - generic [ref=e109]:
            - button "新增第一个岗位" [ref=e110] [cursor=pointer]
            - button "粘贴或选择 CSV" [ref=e111] [cursor=pointer]
          - list "求职管理三步流程" [ref=e112]:
            - listitem [ref=e113]:
              - generic [ref=e114]: "01"
              - generic [ref=e115]:
                - strong [ref=e116]: 记录事实
                - paragraph [ref=e117]: 公司、岗位、来源和原始链接先入库。
            - listitem [ref=e118]:
              - generic [ref=e119]: "02"
              - generic [ref=e120]:
                - strong [ref=e121]: 明确下一步
                - paragraph [ref=e122]: 每次只保留一个可执行动作和日期。
            - listitem [ref=e123]:
              - generic [ref=e124]: "03"
              - generic [ref=e125]:
                - strong [ref=e126]: 用证据复盘
                - paragraph [ref=e127]: 按投递、面试和 Offer 反馈更新技能缺口。
          - paragraph [ref=e128]: 岗位数据只保存在当前本地工作台；除非你主动使用 AI 功能，否则不会发送给模型服务商。
  - button "打开 Atlas AI 助手" [ref=e129] [cursor=pointer]:
    - generic [aria-hidden] [ref=e130]: ✦
    - generic [ref=e131]:
      - strong [ref=e132]: Atlas AI
      - generic [ref=e133]: 总结 · 解释 · 查资料
```

# Test source

```ts
  853  |     await expect(page.getByText('已自动保存', { exact: true })).toBeVisible();
  854  |   });
  855  | 
  856  |   test('Markdown 笔记可在只编辑与只预览间切换，AI 流式整理并可切换排序', async ({ page }) => {
  857  |     await page.goto('/knowledge/JS-03?tab=notes');
  858  |     const editor = page.getByRole('textbox', { name: 'Markdown 原始笔记' });
  859  |     await editor.fill('# 类型与不可变更新\n\n- [x] 理解浅拷贝\n\n| 输入 | 输出 |\n| --- | --- |\n| state | next |\n\n$$T(n) = O(n)$$\n\n```js\nconst next = { ...state };\n```\n\n```mermaid\nflowchart LR\n  A[原对象] --> B[新对象]\n```\n\n::: thinking\n先核对引用边界。\n:::');
  860  |     await page.getByRole('button', { name: '只预览' }).click();
  861  |     await expect(editor).toBeHidden();
  862  |     await expect(page.getByLabel('Markdown 实时预览').getByRole('heading', { name: '类型与不可变更新' })).toBeVisible();
  863  |     await expect(page.getByLabel('Markdown 实时预览').locator('pre.hljs code')).toContainText('const next');
  864  |     await expect(page.getByLabel('Markdown 实时预览').locator('table')).toBeVisible();
  865  |     await expect(page.getByLabel('Markdown 实时预览').locator('.katex-display')).toBeVisible();
  866  |     await expect(page.getByLabel('Markdown 实时预览').locator('.mermaid-diagram[data-mermaid-state="ready"] svg')).toBeVisible();
  867  |     await expect(page.getByLabel('Markdown 实时预览').locator('details.thinking-block')).toContainText('先核对引用边界');
  868  |     await expect(page.getByText('已自动保存', { exact: true })).toBeVisible({ timeout: 5_000 });
  869  | 
  870  |     await page.route('**/notes/JS-03/organize/stream', async (route) => {
  871  |       const response = await route.fetch();
  872  |       const body = await response.text();
  873  |       const longThinking = Array.from({ length: 90 }, (_, index) => `第 ${index + 1} 步：核对原始笔记与学习资料的对应关系。`).join('\n\n');
  874  |       const thinkingEvent = `event: thinking\ndata: ${JSON.stringify({ delta: longThinking })}\n\n`;
  875  |       await route.fulfill({ response, body: body.replace('event: done', `${thinkingEvent}event: done`) });
  876  |     });
  877  |     const streamResponse = page.waitForResponse((response) => response.url().includes('/notes/JS-03/organize/stream'));
  878  |     await page.getByRole('button', { name: '用 AI 整理并核对' }).click();
  879  |     const response = await streamResponse;
  880  |     expect(response.headers()['content-type']).toContain('text/event-stream');
  881  |     expect((await response.body()).toString()).toContain('event: progress');
  882  |     await expect(page.getByText(/已生成安全排版稿/)).toBeVisible();
  883  |     await expect(page.locator('.organized .markdown-content')).toContainText('类型与不可变更新');
  884  |     const thinkingPanel = page.locator('.organized details.thinking-panel');
  885  |     await expect(thinkingPanel).toHaveJSProperty('open', false);
  886  |     await thinkingPanel.locator('summary').click();
  887  |     const thinkingViewport = thinkingPanel.locator('.thinking-panel__content');
  888  |     const thinkingMetrics = await thinkingViewport.evaluate((element) => ({ clientHeight: element.clientHeight, scrollHeight: element.scrollHeight }));
  889  |     expect(thinkingMetrics.scrollHeight).toBeGreaterThan(thinkingMetrics.clientHeight);
  890  |     expect(thinkingMetrics.clientHeight).toBeLessThanOrEqual(360);
  891  |     const noteCardHeights = await page.locator('.notes-layout > .content-card').evaluateAll((items) => items.map((item) => item.getBoundingClientRect().height));
  892  |     expect(Math.abs((noteCardHeights[0] ?? 0) - (noteCardHeights[1] ?? 0))).toBeLessThanOrEqual(1);
  893  | 
  894  |     await page.goto('/notes');
  895  |     expect(await page.locator('.notes-header').evaluate((element) => element.getBoundingClientRect().height)).toBeLessThan(240);
  896  |     const sort = page.getByLabel('笔记排序');
  897  |     await expect(sort).toHaveValue('knowledge');
  898  |     await expect(page.locator('.notes-index section button code').first()).toHaveText('JS-02');
  899  |     await sort.selectOption('updated_desc');
  900  |     await expect(page.locator('.notes-index section button code').first()).toHaveText('JS-03');
  901  |   });
  902  | 
  903  |   test('学习台不分配每日任务并支持回顾式打卡', async ({ page }) => {
  904  |     await page.goto('/');
  905  |     await expect(page.getByRole('heading', { name: '学习台' })).toBeVisible();
  906  |     await expect(page.getByText('这里没有泛化每日任务', { exact: true })).toBeVisible();
  907  |     await expect(page.getByRole('heading', { name: '按你的节奏积累' })).toBeVisible();
  908  |     await expect(page.getByText('M3 已掌握', { exact: true })).toBeVisible();
  909  |     await expect(page.getByText('M4 稳定掌握', { exact: true })).toBeVisible();
  910  | 
  911  |     await page.getByRole('button', { name: /记录今日学习|修改今日打卡/ }).click();
  912  |     await expect(page.getByRole('heading', { name: '今天实际学了什么？' })).toBeVisible();
  913  |     await expect(page.getByText(/系统只记录事实，不检查计划/)).toBeVisible();
  914  |   });
  915  | 
  916  |   test('关系图可浏览路径、搜索知识点并进入局部关系', async ({ page }) => {
  917  |     await page.goto('/knowledge/graph');
  918  |     await expect(page.getByRole('heading', { name: '沿着关系理解知识' })).toBeVisible();
  919  |     await expect(page.locator('.domain-node')).toHaveCount(20);
  920  |     await expect(page.locator('.vue-flow__edge')).not.toHaveCount(0);
  921  | 
  922  |     await page.getByLabel('定位知识点').fill('AIAPP-03');
  923  |     await page.getByRole('button', { name: /AIAPP-03/ }).click();
  924  |     await expect(page.getByText('AIAPP-03', { exact: true }).last()).toBeVisible();
  925  |     await expect(page.getByText('单击选择 · 双击打开知识点')).toBeVisible();
  926  |     await expect(page.locator('.knowledge-node')).toHaveCount(15);
  927  |   });
  928  | 
  929  |   test('系统页说明自主节奏、数据备份和重置保留笔记', async ({ page }) => {
  930  |     await page.route('**/api/v1/system/ai/status', async (route) => {
  931  |       await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: { configured: true, provider: 'deepseek', model: 'e2e-model', connectionOk: false }, meta: { requestId: 'e2e-ai-failed' } }) });
  932  |     });
  933  |     await page.route('**/api/v1/system/executor/status', async (route) => {
  934  |       await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: { available: false, type: 'disabled', warnings: ['Executor disabled by configuration', 'Code execution is disabled for security reasons', 'Assessment will require manual review for code questions'] }, meta: { requestId: 'e2e-executor-safe' } }) });
  935  |     });
  936  |     await page.goto('/settings');
  937  |     await expect(page.getByRole('heading', { name: '系统与数据' })).toBeVisible();
  938  |     await expect(page.getByText(/35 个核心批次只编排真实知识点/)).toBeVisible();
  939  |     await expect(page.getByText('223 个知识点')).toBeVisible();
  940  |     await expect(page.getByText('20 个领域已入库')).toBeVisible();
  941  |     await expect(page.getByText(/每天自动创建一次一致性快照/)).toBeVisible();
  942  |     await expect(page.getByText(/清空进度，但保留全部笔记/)).toBeVisible();
  943  |     const aiCard = page.locator('.status-card').filter({ hasText: 'DeepSeek' });
  944  |     await expect(aiCard).toHaveClass(/status-bad/);
  945  |     await expect(aiCard).toContainText('连接失败');
  946  |     await expect(page.getByText('当前采用保守复核模式')).toBeVisible();
  947  |     await expect(page.getByText('代码执行器已在当前配置中关闭。')).toBeVisible();
  948  |     await expect(page.getByText('Executor disabled by configuration')).toHaveCount(0);
  949  |   });
  950  | 
  951  |   test('岗位创建与 CSV 导入先预览再写入，并符合键盘对话框契约', async ({ page }) => {
  952  |     await page.goto('/jobs');
> 953  |     await expect(page.locator('.empty-guide li')).toHaveCount(3);
       |                                                   ^ Error: expect(locator).toHaveCount(expected) failed
  954  |     await expect(page.getByText('记录事实', { exact: true })).toBeVisible();
  955  | 
  956  |     await page.keyboard.press('Tab');
  957  |     const skipLink = page.getByRole('link', { name: '跳到主要内容' });
  958  |     await expect(skipLink).toBeFocused();
  959  |     await skipLink.press('Enter');
  960  |     await expect(page.locator('#main-content')).toBeFocused();
  961  | 
  962  |     const createTrigger = page.getByRole('button', { name: '新增岗位' });
  963  |     await createTrigger.click();
  964  |     const createDialog = page.getByRole('dialog', { name: '新增一个真实岗位' });
  965  |     await expect(createDialog.getByLabel('公司名称')).toBeFocused();
  966  |     await page.keyboard.press('Shift+Tab');
  967  |     await expect(createDialog.getByRole('button', { name: '关闭' })).toBeFocused();
  968  |     await page.keyboard.press('Shift+Tab');
  969  |     await expect(createDialog.getByRole('button', { name: '取消' })).toBeFocused();
  970  |     await page.keyboard.press('Escape');
  971  |     await expect(createTrigger).toBeFocused();
  972  | 
  973  |     await createTrigger.click();
  974  |     await createDialog.getByLabel('公司名称').fill('质量验收科技');
  975  |     await createDialog.getByLabel('岗位名称').fill('高级前端工程师');
  976  |     await createDialog.getByLabel('来源平台').fill('公司官网');
  977  |     await createDialog.getByRole('button', { name: '创建岗位' }).click();
  978  |     await expect(page.getByRole('status')).toContainText('已创建 质量验收科技 · 高级前端工程师');
  979  |     await expect(page.getByRole('button', { name: /质量验收科技.*高级前端工程师/ })).toBeVisible();
  980  |     expect(await page.locator('.kanban-column').count()).toBeGreaterThanOrEqual(4);
  981  |     await expect(page.locator('.empty-column').first()).toBeVisible();
  982  | 
  983  |     await page.getByRole('button', { name: '导入 CSV' }).click();
  984  |     const importDialog = page.getByRole('dialog', { name: '先预览，再导入岗位' });
  985  |     await importDialog.getByRole('button', { name: '填入格式示例' }).click();
  986  |     await importDialog.getByRole('button', { name: '先检查并预览' }).click();
  987  |     await expect(importDialog).toContainText('全部通过服务端校验');
  988  |     await expect(importDialog.getByRole('button', { name: /确认导入 \d+ 个岗位/ })).toBeEnabled();
  989  |     await importDialog.getByRole('button', { name: /确认导入 \d+ 个岗位/ }).click();
  990  |     await expect(page.getByRole('status')).toContainText('导入');
  991  |   });
  992  | 
  993  |   test('恢复数据必须先展示当前值、恢复后值和差异', async ({ page }) => {
  994  |     await page.goto('/settings');
  995  |     const note = `端到端恢复预览 ${Date.now()}`;
  996  |     await page.getByPlaceholder('给这份快照加一句备注（可选）').fill(note);
  997  |     await page.getByRole('button', { name: '创建本地快照' }).click();
  998  |     await expect(page.getByRole('status')).toContainText('本地数据库快照已创建');
  999  | 
  1000 |     const backup = page.locator('.backup-list article').filter({ hasText: note });
  1001 |     await backup.getByRole('button', { name: '预览恢复' }).click();
  1002 |     const dialog = page.getByRole('dialog', { name: '确认按预览结果恢复？' });
  1003 |     await expect(dialog).toBeVisible();
  1004 |     await expect(dialog).toContainText('当前');
  1005 |     await expect(dialog).toContainText('恢复后');
  1006 |     await expect(dialog).toContainText('变化');
  1007 |     await expect(dialog).toContainText('知识点');
  1008 |     await expect(dialog.getByRole('button', { name: '按此差异恢复' })).toBeVisible();
  1009 |     await dialog.getByRole('button', { name: '取消' }).click();
  1010 |     await expect(backup.getByRole('button', { name: '预览恢复' })).toBeFocused();
  1011 |   });
  1012 | 
  1013 |   test('本地个人数据 JSON 必须完整校验并预览后才能导入', async ({ page }) => {
  1014 |     const exportResponse = await page.request.get('/api/v1/data/export');
  1015 |     expect(exportResponse.ok()).toBe(true);
  1016 |     const snapshot = (await exportResponse.json() as { data: unknown }).data;
  1017 |     await page.goto('/settings');
  1018 | 
  1019 |     const chooseButton = page.getByRole('button', { name: '选择 JSON 并预览' });
  1020 |     const fileChooserPromise = page.waitForEvent('filechooser');
  1021 |     await chooseButton.click();
  1022 |     const fileChooser = await fileChooserPromise;
  1023 |     await fileChooser.setFiles({
  1024 |       name: 'career-atlas-existing-export.json',
  1025 |       mimeType: 'application/json',
  1026 |       buffer: Buffer.from(JSON.stringify(snapshot)),
  1027 |     });
  1028 | 
  1029 |     const dialog = page.getByRole('dialog', { name: '确认导入这份个人数据？' });
  1030 |     await expect(dialog).toBeVisible();
  1031 |     await expect(dialog).toContainText('career-atlas-existing-export.json');
  1032 |     await expect(dialog).toContainText('文件导出时间');
  1033 |     await expect(dialog).toContainText('个人数据类别');
  1034 |     await expect(dialog).toContainText('知识点进度');
  1035 |     await expect(dialog).toContainText('当前');
  1036 |     await expect(dialog).toContainText('导入后');
  1037 |     await expect(dialog.getByRole('button', { name: '按预览结果导入' })).toBeVisible();
  1038 |     await dialog.getByRole('button', { name: '取消' }).click();
  1039 |     await expect(chooseButton).toBeFocused();
  1040 |   });
  1041 | 
  1042 |   test('窄屏下主导航和脑图没有页面级横向溢出', async ({ page }) => {
  1043 |     await page.setViewportSize({ width: 390, height: 844 });
  1044 |     await page.goto('/knowledge/map');
  1045 |     await expect(page.getByRole('heading', { name: '把知识连成一张图' })).toBeVisible();
  1046 |     const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  1047 |     expect(overflow).toBeLessThanOrEqual(1);
  1048 |     await expect(page.getByRole('link', { name: /学习台/ })).toBeVisible();
  1049 |     await expect(page.getByRole('link', { name: /笔记中心/ })).toBeVisible();
  1050 |     await expect(page.getByRole('link', { name: /核心路线/ })).toBeVisible();
  1051 |     await expect(page.getByRole('link', { name: /知识体系/ })).toHaveAttribute('aria-current', 'page');
  1052 |   });
  1053 | 
```