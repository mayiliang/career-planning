# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui-polish.spec.ts >> 主要页面适配桌面、平板和手机且无页面脚本错误
- Location: e2e/ui-polish.spec.ts:130:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.route-shell h1').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('.route-shell h1').first() with timeout 5000ms
  - waiting for locator('.route-shell h1').first()

```

```yaml
- link "跳到主要内容":
  - /url: "#main-content"
- navigation "主导航":
  - text: Career Atlas
  - paragraph: AI 时代前端能力地图
  - paragraph: 我的工作空间
  - list:
    - listitem:
      - link "学习台":
        - /url: /
        - strong: 学习台
    - listitem:
      - link "知识体系":
        - /url: /knowledge/map
        - strong: 知识体系
    - listitem:
      - link "笔记中心":
        - /url: /notes
        - strong: 笔记中心
    - listitem:
      - link "核心路线":
        - /url: /plan
        - strong: 核心路线
    - listitem:
      - link "求职支线":
        - /url: /jobs
        - strong: 求职支线
  - link "设置与数据":
    - /url: /settings
    - strong: 设置与数据
  - strong: 服务正常
  - text: 本地优先 · 自主学习
- banner:
  - button "收起侧栏" [expanded]
  - text: 工作空间 核心学习路线
  - button "快速查找，快捷键 Command 或 Control 加 K": 搜索知识点、页面… ⌘ K
- main:
  - paragraph: 核心学习路线页面已打开
  - region "我的下一步":
    - heading "我的下一步" [level=2]
    - link "查看学习路线":
      - /url: /plan
    - text: 框架方向
    - combobox "框架方向" [disabled]:
      - option "尚未选择" [selected]
      - option "React"
      - option "Vue"
      - option "暂不进入框架"
    - button "保存方向" [disabled]
    - paragraph: 选择只影响推荐，不改变当前学习点、暂缓状态或阅读进度。
    - link "浏览全部资料":
      - /url: /knowledge
  - region "框架入口基础":
    - heading "从一个框架开始" [level=2]
    - paragraph: 选择你要学的入口；无需先学另一个框架。熟悉下列基础可直接继续，查看链接不会更改当前学习点、学完或暂缓状态。
    - article:
      - heading "REACT-01 · 未开始，可按需补学" [level=3]
      - link "详情与练习":
        - /url: /knowledge/REACT-01
      - link "阅读讲义":
        - /url: /knowledge/materials/react-01-render-purity-state-snapshot.md/react-01
      - list:
        - listitem:
          - link "补学 JS-01":
            - /url: /knowledge/JS-01?entryReturn=REACT-01
          - text: · 未开始，可按需补学 闭包与局部绑定：解释回调为何保留创建时的状态。
        - listitem:
          - link "补学 JS-03":
            - /url: /knowledge/JS-03?entryReturn=REACT-01
          - text: · 未开始，可按需补学 对象共享与不可变更新：识别渲染修改输入造成的污染。
        - listitem:
          - link "补学 WEB-01":
            - /url: /knowledge/WEB-01?entryReturn=REACT-01
          - text: · 未开始，可按需补学 HTML、按钮和挂载容器：读懂最终页面与用户事件。
    - article:
      - heading "VUE-01 · 未开始，可按需补学" [level=3]
      - link "详情与练习":
        - /url: /knowledge/VUE-01
      - link "阅读讲义":
        - /url: /knowledge/materials/vue-01-vite-sfc-project-structure.md/vue-01
      - list:
        - listitem:
          - link "补学 WEB-01":
            - /url: /knowledge/WEB-01?entryReturn=VUE-01
          - text: · 未开始，可按需补学 HTML、按钮和挂载容器：读懂最终页面与用户事件。
    - text: 查阅不等于掌握；正文说明每项基础的用途。TS-03、Router 和跨框架对照不是入口门槛。个人推荐只采用所选方向；旧分组仅供浏览。
  - paragraph: COMPATIBLE READING GROUPS · 0 BATCHES
  - heading "按能力与基础安排学习" [level=1]
  - text: 异步链试点已按真实前置连接。以下 0 个知识点暂保留旧分组供查阅；框架不享有提前或交错特权，完整路线将逐步按能力与认知负担重构。
  - button "继续当前学习 →"
  - button "查看完整知识清单"
  - complementary "旧分组浏览统计":
    - strong: 0%
    - text: 旧分组阅读进度
    - term: 当前批次
    - definition: B01
    - term: 已学完
    - definition: 0 / 0
    - term: M3+ 掌握
    - definition: "0"
  - strong: ROUTE CONTRACT 旧分组浏览
  - text: 旧分组仅供浏览。 批次不是硬前置，按已有基础选择内容；0 个专项选修仍保留在完整知识清单中。 个人路线结合进度推荐。 熟悉内容无需重学，暂缓不会使依赖自动满足；学习完成与 M3+ 掌握仍分别记录。
  - region "旧分组统计":
    - text: CORE
    - strong: "0"
    - text: 旧分组知识点 DONE
    - strong: "0"
    - text: 已学完 MASTERED
    - strong: "0"
    - text: M3+ 已掌握 OPTIONAL
    - strong: "0"
    - text: 专项路线知识点
  - text: 在旧分组中查找
  - searchbox "在旧分组中查找"
  - text: 当前显示 0 个知识点
  - button "全部收起"
  - text: 正在整理路线参考…
- button "打开 Atlas AI 助手":
  - strong: Atlas AI
  - text: 总结 · 解释 · 查资料
```

# Test source

```ts
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
  130 | test('主要页面适配桌面、平板和手机且无页面脚本错误', async ({ page }) => {
  131 |   test.setTimeout(60_000);
  132 |   const errors: string[] = [];
  133 |   page.on('pageerror', (error) => errors.push(error.message));
  134 |   for (const width of [1440, 1024, 390, 320]) {
  135 |     await page.setViewportSize({ width, height: 900 });
  136 |     for (const path of ['/', '/knowledge/map', '/knowledge', '/knowledge/graph', '/notes', '/plan', '/jobs', '/settings', '/knowledge/WEB-01']) {
  137 |       await page.goto(path);
> 138 |       await expect(page.locator('.route-shell h1').first()).toBeVisible();
      |                                                             ^ Error: expect(locator).toBeVisible() failed
  139 |       await page.waitForLoadState('networkidle');
  140 |       expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${width}px ${path} 横向溢出`).toBeLessThanOrEqual(1);
  141 |       if (path === '/' && [1440, 390].includes(width)) await page.screenshot({ path: `../../tmp/ui-review/learning-${width}.png`, fullPage: true });
  142 |     }
  143 |   }
  144 |   expect(errors).toEqual([]);
  145 | });
  146 | 
```