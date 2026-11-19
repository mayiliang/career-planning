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
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('dialog', { name: '先预览，再导入岗位' }).getByRole('button', { name: /确认导入 \d+ 个岗位/ })
    - locator resolved to <button data-v-51513c71="" data-tone="primary" class="dialog-confirm">确认导入 1 个岗位</button>
  - attempting click action
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
  - element was detached from the DOM, retrying

```

# Page snapshot

```yaml
- generic [ref=f1e3]:
  - link "跳到主要内容" [ref=f1e4] [cursor=pointer]:
    - /url: "#main-content"
  - navigation "主导航" [ref=f1e5]:
    - generic [ref=f1e8]:
      - generic [ref=f1e9]: Career Atlas
      - paragraph [ref=f1e10]: AI 时代前端能力地图
    - paragraph [ref=f1e11]: 我的工作空间
    - list [ref=f1e12]:
      - listitem [ref=f1e13]:
        - link [ref=f1e14] [cursor=pointer]:
          - /url: /
          - strong [ref=f1e19]: 学习台
      - listitem [ref=f1e20]:
        - link [ref=f1e21] [cursor=pointer]:
          - /url: /knowledge/map
          - strong [ref=f1e26]: 知识体系
      - listitem [ref=f1e27]:
        - link [ref=f1e28] [cursor=pointer]:
          - /url: /notes
          - strong [ref=f1e33]: 笔记中心
      - listitem [ref=f1e34]:
        - link [ref=f1e35] [cursor=pointer]:
          - /url: /plan
          - strong [ref=f1e40]: 核心路线
      - listitem [ref=f1e41]:
        - link [ref=f1e42] [cursor=pointer]:
          - /url: /jobs
          - strong [ref=f1e47]: 求职支线
    - generic [ref=f1e48]:
      - link [ref=f1e49] [cursor=pointer]:
        - /url: /settings
        - strong [ref=f1e54]: 设置与数据
      - generic "服务正常" [ref=f1e55]:
        - generic [ref=f1e57]:
          - strong [ref=f1e58]: 服务正常
          - generic [ref=f1e59]: 本地优先 · 自主学习
  - generic [ref=f1e60]:
    - banner [ref=f1e61]:
      - generic [ref=f1e62]:
        - button "收起侧栏" [expanded] [ref=f1e63] [cursor=pointer]
        - generic [ref=f1e66]: 工作空间
        - generic [aria-hidden] [ref=f1e67]: /
        - generic [ref=f1e68]: 求职
      - button "快速查找，快捷键 Command 或 Control 加 K" [ref=f1e70] [cursor=pointer]:
        - generic [ref=f1e73]: 搜索知识点、页面…
        - generic [ref=f1e74]: ⌘ K
    - main [ref=f1e75]:
      - paragraph [ref=f1e76]: 求职页面已打开
      - generic [ref=f1e79]:
        - generic [ref=f1e80]:
          - generic [ref=f1e81]:
            - generic [ref=f1e82]:
              - text: JOB SEARCH WORKSPACE
              - heading "求职管理" [level=1] [ref=f1e83]
              - paragraph [ref=f1e84]: 先记录事实，再把每个岗位推进到一个清晰的下一步。
            - generic [ref=f1e85]:
              - button "导入 CSV" [ref=f1e86] [cursor=pointer]
              - button "新增岗位" [ref=f1e87] [cursor=pointer]
          - generic "求职漏斗" [ref=f1e88]:
            - generic [ref=f1e89]:
              - generic [ref=f1e90]: "1"
              - generic [ref=f1e91]: 已保存
            - generic [aria-hidden] [ref=f1e92]: →
            - generic [ref=f1e93]:
              - generic [ref=f1e94]: "0"
              - generic [ref=f1e95]: 已投递
            - generic [aria-hidden] [ref=f1e96]: →
            - generic [ref=f1e97]:
              - generic [ref=f1e98]: "0"
              - generic [ref=f1e99]: 面试中
            - generic [aria-hidden] [ref=f1e100]: →
            - generic [ref=f1e101]:
              - generic [ref=f1e102]: "0"
              - generic [ref=f1e103]: Offer
            - generic [ref=f1e104]: Offer 占当前漏斗 0%
        - generic "岗位看板" [ref=f1e105]:
          - region "已保存" [ref=f1e106]:
            - generic [ref=f1e107]:
              - generic [ref=f1e108]: 已保存
              - generic [ref=f1e109]: "1"
            - button "质量验收科技 高级前端工程师" [ref=f1e111] [cursor=pointer]:
              - generic [ref=f1e112]: 质量验收科技
              - strong [ref=f1e113]: 高级前端工程师
          - region "待投递" [ref=f1e114]:
            - generic [ref=f1e115]:
              - generic [ref=f1e116]: 待投递
              - generic [ref=f1e117]: "0"
            - paragraph [ref=f1e119]:
              - text: 当前没有岗位
              - generic [ref=f1e120]: 从岗位详情推进到这里后会自动出现
          - region "已投递" [ref=f1e121]:
            - generic [ref=f1e122]:
              - generic [ref=f1e123]: 已投递
              - generic [ref=f1e124]: "0"
            - paragraph [ref=f1e126]:
              - text: 当前没有岗位
              - generic [ref=f1e127]: 从岗位详情推进到这里后会自动出现
          - region "沟通中" [ref=f1e128]:
            - generic [ref=f1e129]:
              - generic [ref=f1e130]: 沟通中
              - generic [ref=f1e131]: "0"
            - paragraph [ref=f1e133]:
              - text: 当前没有岗位
              - generic [ref=f1e134]: 从岗位详情推进到这里后会自动出现
          - region "笔试/测评" [ref=f1e135]:
            - generic [ref=f1e136]:
              - generic [ref=f1e137]: 笔试/测评
              - generic [ref=f1e138]: "0"
            - paragraph [ref=f1e140]:
              - text: 当前没有岗位
              - generic [ref=f1e141]: 从岗位详情推进到这里后会自动出现
          - region "面试中" [ref=f1e142]:
            - generic [ref=f1e143]:
              - generic [ref=f1e144]: 面试中
              - generic [ref=f1e145]: "0"
            - paragraph [ref=f1e147]:
              - text: 当前没有岗位
              - generic [ref=f1e148]: 从岗位详情推进到这里后会自动出现
          - region "已获 Offer" [ref=f1e149]:
            - generic [ref=f1e150]:
              - generic [ref=f1e151]: 已获 Offer
              - generic [ref=f1e152]: "0"
            - paragraph [ref=f1e154]:
              - text: 当前没有岗位
              - generic [ref=f1e155]: 从岗位详情推进到这里后会自动出现
          - region "已拒绝" [ref=f1e156]:
            - generic [ref=f1e157]:
              - generic [ref=f1e158]: 已拒绝
              - generic [ref=f1e159]: "0"
            - paragraph [ref=f1e161]:
              - text: 当前没有岗位
              - generic [ref=f1e162]: 从岗位详情推进到这里后会自动出现
          - region "已撤回" [ref=f1e163]:
            - generic [ref=f1e164]:
              - generic [ref=f1e165]: 已撤回
              - generic [ref=f1e166]: "0"
            - paragraph [ref=f1e168]:
              - text: 当前没有岗位
              - generic [ref=f1e169]: 从岗位详情推进到这里后会自动出现
  - button "打开 Atlas AI 助手" [ref=f1e170] [cursor=pointer]:
    - generic [aria-hidden] [ref=f1e171]: ✦
    - generic [ref=f1e172]:
      - strong [ref=f1e173]: Atlas AI
      - generic [ref=f1e174]: 总结 · 解释 · 查资料
```

# Test source

```ts
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
  953  |     await expect(page.locator('.empty-guide li')).toHaveCount(3);
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
> 989  |     await importDialog.getByRole('button', { name: /确认导入 \d+ 个岗位/ }).click();
       |                                                                      ^ Error: locator.click: Test timeout of 30000ms exceeded.
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
  1054 |   test('未知地址提供可恢复入口，跨页面导航回到顶部', async ({ page }) => {
  1055 |     await page.goto('/this-route-does-not-exist');
  1056 |     await expect(page.getByRole('heading', { name: '这条路线还没有内容' })).toBeVisible();
  1057 |     await expect(page.getByRole('button', { name: '回到学习台' })).toBeVisible();
  1058 |     await page.getByRole('button', { name: '打开知识体系' }).click();
  1059 |     await expect(page).toHaveURL(/\/knowledge\/map$/);
  1060 | 
  1061 |     await page.goto('/plan');
  1062 |     await expect(page.getByRole('heading', { name: '按能力与基础安排学习' })).toBeVisible();
  1063 |     await page.locator('.week-list article').last().scrollIntoViewIfNeeded();
  1064 |     expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  1065 |     await page.getByRole('link', { name: /学习台/ }).click();
  1066 |     await expect(page).toHaveURL(/\/$/);
  1067 |     await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  1068 |   });
  1069 | 
  1070 |   test('窄屏下新学习路径没有页面级横向溢出', async ({ page }) => {
  1071 |     await page.setViewportSize({ width: 390, height: 844 });
  1072 |     for (const path of ['/', '/knowledge', '/knowledge/graph', '/notes', '/plan', '/knowledge/WEB-01']) {
  1073 |       await page.goto(path);
  1074 |       await page.waitForLoadState('networkidle');
  1075 |       const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  1076 |       expect(overflow, `${path} 存在横向溢出`).toBeLessThanOrEqual(1);
  1077 |     }
  1078 |   });
  1079 | });
  1080 | 
```