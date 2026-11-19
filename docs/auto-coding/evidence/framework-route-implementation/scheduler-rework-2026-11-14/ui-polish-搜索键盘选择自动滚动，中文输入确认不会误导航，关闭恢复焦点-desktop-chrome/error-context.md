# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui-polish.spec.ts >> 搜索键盘选择自动滚动，中文输入确认不会误导航，关闭恢复焦点
- Location: e2e/ui-polish.spec.ts:22:1

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByRole('option')
Expected: 12
Received: 16
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" getByRole('option') with timeout 5000ms
  - waiting for getByRole('option')
    14 × locator resolved to 16 elements
       - unexpected value "16"

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - link "跳到主要内容" [ref=e4] [cursor=pointer]:
      - /url: "#main-content"
    - navigation "主导航" [ref=e5]:
      - list [ref=e6]:
        - listitem [ref=e7]:
          - link [ref=e8] [cursor=pointer]:
            - /url: /
            - strong [ref=e13]: 学习台
        - listitem [ref=e14]:
          - link [ref=e15] [cursor=pointer]:
            - /url: /knowledge/map
            - strong [ref=e20]: 知识体系
        - listitem [ref=e21]:
          - link [ref=e22] [cursor=pointer]:
            - /url: /notes
            - strong [ref=e27]: 笔记中心
        - listitem [ref=e28]:
          - link [ref=e29] [cursor=pointer]:
            - /url: /plan
            - strong [ref=e34]: 核心路线
        - listitem [ref=e35]:
          - link [ref=e36] [cursor=pointer]:
            - /url: /jobs
            - strong [ref=e41]: 求职支线
    - generic [ref=e42]:
      - banner [ref=e43]:
        - generic [ref=e44]: 学习台
        - generic [ref=e46]:
          - button "快速查找，快捷键 Command 或 Control 加 K" [expanded] [ref=e47] [cursor=pointer]
          - link "设置与数据" [ref=e50] [cursor=pointer]:
            - /url: /settings
      - main [ref=e53]:
        - paragraph [ref=e54]: 学习台页面已打开
        - generic [ref=e57]:
          - generic [ref=e58]:
            - generic [ref=e59]:
              - paragraph [ref=e60]:
                - text: YOUR LEARNING SPACE
                - generic [ref=e61]: 11月14日星期六
              - heading "学习台" [level=1] [ref=e62]: 学习台.
              - generic [ref=e63]: 每一点积累，都在拓宽你的能力边界。按自己的节奏，继续就好。
            - generic [ref=e64]:
              - button "从知识体系选择" [ref=e65] [cursor=pointer]
              - button "记录今日学习" [ref=e68] [cursor=pointer]
          - region "我的下一步" [ref=e71]:
            - generic [ref=e72]:
              - heading "我的下一步" [level=2] [ref=e73]
              - link "查看学习路线" [ref=e74] [cursor=pointer]:
                - /url: /plan
            - generic [ref=e75]:
              - generic [ref=e76]:
                - text: 框架方向
                - combobox "框架方向" [ref=e77]:
                  - option "尚未选择"
                  - option "React" [selected]
                  - option "Vue"
                  - option "暂不进入框架"
              - button "保存方向" [ref=e78] [cursor=pointer]
            - paragraph [ref=e79]: 选择只影响推荐，不改变当前学习点、暂缓状态或阅读进度。
            - status [ref=e80]: 按当前偏好与学习记录推荐；可自由查阅其他资料。
            - link "补齐基础 · JS-01 →" [ref=e81] [cursor=pointer]:
              - /url: /knowledge/JS-01
            - group [ref=e82]:
              - generic "本次已审范围：共同基础与一个可选框架方向" [ref=e83] [cursor=pointer]
            - link "浏览全部资料" [ref=e84] [cursor=pointer]:
              - /url: /knowledge
          - generic [ref=e85]:
            - generic [ref=e86]:
              - generic [ref=e87]:
                - text: 从这里，开始下一步
                - generic [ref=e89]: FIRST CONCRETE STEP
              - heading "JS-01 · 执行上下文、作用域与闭包" [level=2] [ref=e90]
              - paragraph [ref=e91]:
                - strong [ref=e92]: 先完成：资料阅读与笔记
                - text: 读完列出的资料，记录核心概念、仍有疑问的地方，以及至少一个边界或反例。
              - generic [ref=e93]:
                - generic [ref=e96]: 预计 90 分钟
                - generic [ref=e97]: ·
                - generic [ref=e98]: 可随时暂停，下次继续
              - group [ref=e99]:
                - generic "查看任务输入与完成标准" [ref=e100] [cursor=pointer]:
                  - text: 查看任务输入与完成标准
                  - generic [aria-hidden] [ref=e101]: ＋
            - generic [ref=e102]:
              - button "开始这项具体任务 →" [ref=e103] [cursor=pointer]
              - button "自由选择" [ref=e104] [cursor=pointer]
          - generic [ref=e105]:
            - strong [ref=e106]: 这里没有泛化每日任务
            - generic [ref=e107]: 系统不规定你今天必须学什么；你决定学习完成，系统只根据挑战证据判定掌握程度。
            - button "查看学习路线" [ref=e108] [cursor=pointer]
          - generic [ref=e109]:
            - generic [ref=e110]:
              - generic [ref=e111]:
                - generic [ref=e112]:
                  - text: LEARNING OVERVIEW
                  - heading "按你的节奏积累" [level=2] [ref=e113]
                - generic [ref=e114]:
                  - strong [ref=e115]: 0%
                  - generic [ref=e116]: 学习完成度
              - progressbar "学习完成度" [ref=e117]
              - generic [ref=e118]:
                - generic [ref=e119]:
                  - strong [ref=e120]: "0"
                  - generic [ref=e121]: 已学完
                - generic [ref=e122]:
                  - strong [ref=e123]: "0"
                  - generic [ref=e124]: 学习中
                - generic [ref=e125]:
                  - strong [ref=e126]: "0"
                  - generic [ref=e127]: M3 已掌握
                - generic [ref=e128]:
                  - strong [ref=e129]: "0"
                  - generic [ref=e130]: M4 稳定掌握
              - paragraph [ref=e131]: 阅读完成由你确认；M0–M4 只表示系统拥有多少掌握证据。两者不会混在一起。
            - generic [ref=e132]:
              - generic [ref=e133]:
                - generic [ref=e134]: DAILY CHECK-IN
                - generic [ref=e135]: 等待你的记录
              - heading "今天学了什么，就记录什么" [level=2] [ref=e136]
              - paragraph [ref=e137]: 不和计划绑定，不产生缺勤、逾期或补打压力。时长、感受和总结都可选。
              - button "现在打卡" [ref=e138] [cursor=pointer]
          - generic [ref=e141]:
            - generic [ref=e142]:
              - generic [ref=e143]:
                - generic [ref=e144]:
                  - text: RECENTLY LEARNED
                  - heading "最近学完" [level=2] [ref=e145]
                - button "全部笔记 →" [ref=e146] [cursor=pointer]
              - paragraph [ref=e147]: 还没有标记为“已学完”的知识点。认真读完第一个并留下笔记，就会出现在这里。
            - generic [ref=e148]:
              - generic [ref=e149]:
                - generic [ref=e150]:
                  - text: LEARN LATER
                  - heading "稍后学习" [level=2] [ref=e151]
                - strong [ref=e152]: "0"
              - paragraph [ref=e153]: 暂时没有搁置的知识点。以后不需要的分支可以放心放到这里。
    - button "打开 Atlas AI 助手" [ref=e154] [cursor=pointer]:
      - generic [aria-hidden] [ref=e155]: ✦
  - dialog "快速查找" [ref=e157]:
    - banner [ref=e158]:
      - combobox "搜索页面或知识点" [expanded] [active] [ref=e161]
      - button "关闭快速查找" [ref=e162] [cursor=pointer]
    - generic [ref=e165]:
      - generic [ref=e166]: 快捷前往
      - generic [ref=e167]: ↑↓ 选择 · Enter 打开 · Esc 关闭
    - listbox "页面与知识点" [ref=e168]:
      - option "LEARN 学习台 继续当前知识点与今日打卡 ↗" [selected] [ref=e169] [cursor=pointer]:
        - code [ref=e170]: LEARN
        - generic [ref=e171]:
          - strong [ref=e172]: 学习台
          - generic [ref=e173]: 继续当前知识点与今日打卡
        - generic [ref=e174]: ↗
      - option "ATLAS 知识体系脑图 查看完整能力结构 ↗" [ref=e175] [cursor=pointer]:
        - code [ref=e176]: ATLAS
        - generic [ref=e177]:
          - strong [ref=e178]: 知识体系脑图
          - generic [ref=e179]: 查看完整能力结构
        - generic [ref=e180]: ↗
      - option "GRAPH 知识关系图谱 查看前置与关联关系 ↗" [ref=e181] [cursor=pointer]:
        - code [ref=e182]: GRAPH
        - generic [ref=e183]:
          - strong [ref=e184]: 知识关系图谱
          - generic [ref=e185]: 查看前置与关联关系
        - generic [ref=e186]: ↗
      - option "NOTES 笔记中心 按知识体系管理原文与 AI 整理稿 ↗" [ref=e187] [cursor=pointer]:
        - code [ref=e188]: NOTES
        - generic [ref=e189]:
          - strong [ref=e190]: 笔记中心
          - generic [ref=e191]: 按知识体系管理原文与 AI 整理稿
        - generic [ref=e192]: ↗
      - option "ROUTE 求职优先核心路线 先 React/Vue 与面试能力，再逐层深入 ↗" [ref=e193] [cursor=pointer]:
        - code [ref=e194]: ROUTE
        - generic [ref=e195]:
          - strong [ref=e196]: 求职优先核心路线
          - generic [ref=e197]: 先 React/Vue 与面试能力，再逐层深入
        - generic [ref=e198]: ↗
      - option "JOBS 求职支线 管理岗位、反馈与技能缺口 ↗" [ref=e199] [cursor=pointer]:
        - code [ref=e200]: JOBS
        - generic [ref=e201]:
          - strong [ref=e202]: 求职支线
          - generic [ref=e203]: 管理岗位、反馈与技能缺口
        - generic [ref=e204]: ↗
      - option "LOCAL 设置与本地数据 DeepSeek、备份与恢复 ↗" [ref=e205] [cursor=pointer]:
        - code [ref=e206]: LOCAL
        - generic [ref=e207]:
          - strong [ref=e208]: 设置与本地数据
          - generic [ref=e209]: DeepSeek、备份与恢复
        - generic [ref=e210]: ↗
      - option "JS-01 执行上下文、作用域与闭包 Web 平台核心基础 · 核心批次 B01 ↗" [ref=e211] [cursor=pointer]:
        - code [ref=e212]: JS-01
        - generic [ref=e213]:
          - strong [ref=e214]: 执行上下文、作用域与闭包
          - generic [ref=e215]: Web 平台核心基础 · 核心批次 B01
        - generic [ref=e216]: ↗
      - 'option "JS-02 原型、对象模型与 `this` Web 平台核心基础 · 核心批次 B01 ↗" [ref=e217] [cursor=pointer]':
        - code [ref=e218]: JS-02
        - generic [ref=e219]:
          - strong [ref=e220]: "原型、对象模型与 `this`"
          - generic [ref=e221]: Web 平台核心基础 · 核心批次 B01
        - generic [ref=e222]: ↗
      - option "JS-03 类型、相等、拷贝与不可变更新 Web 平台核心基础 · 核心批次 B01 ↗" [ref=e223] [cursor=pointer]:
        - code [ref=e224]: JS-03
        - generic [ref=e225]:
          - strong [ref=e226]: 类型、相等、拷贝与不可变更新
          - generic [ref=e227]: Web 平台核心基础 · 核心批次 B01
        - generic [ref=e228]: ↗
      - option "JS-07 迭代协议、元编程与资源生命周期 Web 平台核心基础 · 核心批次 B01 ↗" [ref=e229] [cursor=pointer]:
        - code [ref=e230]: JS-07
        - generic [ref=e231]:
          - strong [ref=e232]: 迭代协议、元编程与资源生命周期
          - generic [ref=e233]: Web 平台核心基础 · 核心批次 B01
        - generic [ref=e234]: ↗
      - option "CS-01 复杂度、数据规模与工程成本判断 Web 平台核心基础 · 核心批次 B02 ↗" [ref=e235] [cursor=pointer]:
        - code [ref=e236]: CS-01
        - generic [ref=e237]:
          - strong [ref=e238]: 复杂度、数据规模与工程成本判断
          - generic [ref=e239]: Web 平台核心基础 · 核心批次 B02
        - generic [ref=e240]: ↗
    - contentinfo [ref=e241]:
      - generic [ref=e242]: 本地知识库
      - status [ref=e244]: 12 个结果 · 223 个知识点可搜索
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
> 29  |   await expect(page.getByRole('option')).toHaveCount(12);
      |                                          ^ Error: expect(locator).toHaveCount(expected) failed
  30  |   for (let index = 0; index < 10; index++) await input.press('ArrowDown');
  31  |   const selected = page.getByRole('option', { selected: true });
  32  |   await expect(selected).toBeInViewport();
  33  |   const fullyVisible = await selected.evaluate((element) => {
  34  |     const bounds = element.getBoundingClientRect();
  35  |     const parent = element.parentElement!.getBoundingClientRect();
  36  |     return bounds.top >= parent.top - 1 && bounds.bottom <= parent.bottom + 1;
  37  |   });
  38  |   expect(fullyVisible).toBe(true);
  39  |   await expect(input).toHaveAttribute('aria-activedescendant', await selected.getAttribute('id') as string);
  40  |   await input.dispatchEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true });
  41  |   await expect(input).toBeVisible();
  42  |   await input.fill('无匹配的知识点 xyz987');
  43  |   await expect(page.getByText('没有匹配结果')).toBeVisible();
  44  |   await input.fill('VUE-11');
  45  |   await expect(page.getByRole('option', { name: /VUE-11/ })).toBeVisible();
  46  |   await input.press('Escape');
  47  |   await expect(trigger).toBeFocused();
  48  |   await trigger.click();
  49  |   await input.press('Tab');
  50  |   await expect(page.getByRole('button', { name: '关闭快速查找' })).toBeFocused();
  51  |   await page.keyboard.press('Enter');
  52  |   await expect(page.getByRole('dialog', { name: '快速查找' })).not.toBeVisible();
  53  |   await expect(page).toHaveURL(/\/$/);
  54  | });
  55  | 
  56  | test('打卡可搜索前 60 项以外的知识点，失败保留输入并可重试保存', async ({ page }) => {
  57  |   const response = await page.request.get('/api/v1/knowledge/points');
  58  |   const { data } = await response.json() as { data: { items: Array<{ code: string; title: string }> } };
  59  |   const target = data.items.at(-1)!;
  60  |   expect(data.items.findIndex((point) => point.code === target.code)).toBeGreaterThan(60);
  61  |   let saveCount = 0;
  62  |   await page.route('**/api/v1/learning/checkins/*', async (route) => {
  63  |     saveCount++;
  64  |     if (saveCount === 1) {
  65  |       await route.fulfill({ status: 503, json: { error: { code: 'UNAVAILABLE', message: '测试：暂时无法保存，请重试', retryable: true }, meta: { requestId: 'ui-checkin-failure' } } });
  66  |       return;
  67  |     }
  68  |     const body = route.request().postDataJSON();
  69  |     expect(body.pointCodes).toContain(target.code);
  70  |     expect(body.summaryMd).toBe('这次学习的关键收获');
  71  |     await route.fulfill({ json: { data: { ...body, id: 'ui-checkin', checkinDate: '2026-09-06', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), points: [{ code: target.code, title: target.title, activity: 'LEARN' }] }, meta: { requestId: 'ui-checkin-success' } } });
  72  |   });
  73  |   await page.goto('/');
  74  |   await page.getByRole('button', { name: /记录今日学习|修改今日打卡/ }).click();
  75  |   const dialog = page.getByRole('dialog', { name: '今天实际学了什么？' });
  76  |   await dialog.getByRole('searchbox', { name: '搜索打卡知识点' }).fill(target.code);
  77  |   const point = dialog.getByRole('group', { name: '可选知识点' }).getByRole('button', { name: new RegExp(target.code) });
  78  |   await point.click();
  79  |   await expect(point).toHaveAttribute('aria-pressed', 'true');
  80  |   await dialog.getByRole('searchbox').fill('');
  81  |   await dialog.getByRole('button', { name: /只看已选/ }).click();
  82  |   await expect(dialog.getByRole('group', { name: '可选知识点' }).getByRole('button')).toContainText([target.code]);
  83  |   await dialog.getByLabel('今日学习记录', { exact: true }).fill('这次学习的关键收获');
  84  |   await dialog.getByLabel('实际投入（分钟）').fill('-1');
  85  |   await dialog.getByRole('button', { name: '保存今日打卡' }).click();
  86  |   await expect(dialog.getByRole('alert')).toContainText('0–1440');
  87  |   expect(saveCount).toBe(0);
  88  |   await dialog.getByLabel('实际投入（分钟）').fill('25');
  89  |   await dialog.getByRole('button', { name: '保存今日打卡' }).click();
  90  |   await expect(dialog.getByRole('alert')).toContainText('暂时无法保存');
  91  |   await expect(dialog.getByLabel('今日学习记录', { exact: true })).toHaveValue('这次学习的关键收获');
  92  |   await dialog.getByRole('button', { name: '保存今日打卡' }).click();
  93  |   await expect(dialog).not.toBeVisible();
  94  |   await expect(page.getByRole('status').filter({ hasText: '今日学习已记录' })).toBeVisible();
  95  |   expect(saveCount).toBe(2);
  96  | });
  97  | 
  98  | test('矮屏弹窗固定操作区且不会被 AI 入口盖住', async ({ page }) => {
  99  |   await page.setViewportSize({ width: 390, height: 600 });
  100 |   await page.goto('/');
  101 |   const trigger = page.getByRole('button', { name: /记录今日学习|修改今日打卡/ });
  102 |   await trigger.click();
  103 |   const dialog = page.getByRole('dialog', { name: '今天实际学了什么？' });
  104 |   const box = await dialog.boundingBox();
  105 |   expect(box!.y).toBeGreaterThanOrEqual(0);
  106 |   expect(box!.y + box!.height).toBeLessThanOrEqual(600);
  107 |   await expect(dialog.getByRole('button', { name: '保存今日打卡' })).toBeInViewport();
  108 |   await page.keyboard.press('Control+k');
  109 |   await expect(page.getByRole('dialog')).toHaveCount(1);
  110 |   await page.screenshot({ path: '../../tmp/ui-review/checkin-mobile.png' });
  111 |   await dialog.getByRole('button', { name: '取消', exact: true }).click();
  112 |   await expect(trigger).toBeFocused();
  113 | });
  114 | 
  115 | test('开始学习失败有明确反馈并恢复可操作状态', async ({ page }) => {
  116 |   await page.route('**/api/v1/learning/workspace', async (route) => {
  117 |     const response = await route.fetch();
  118 |     const json = await response.json();
  119 |     json.data.current = null;
  120 |     await route.fulfill({ json });
  121 |   });
  122 |   await page.route('**/api/v1/learning/points/*/focus', (route) => route.fulfill({ status: 503, json: { error: { code: 'UNAVAILABLE', message: '暂时无法开始，请重试', retryable: true }, meta: { requestId: 'ui-focus-failure' } } }));
  123 |   await page.goto('/');
  124 |   const start = page.getByRole('button', { name: '开始这项具体任务 →' });
  125 |   await start.click();
  126 |   await expect(page.getByRole('alert')).toContainText('暂时无法开始');
  127 |   await expect(start).toBeEnabled();
  128 | });
  129 | 
```