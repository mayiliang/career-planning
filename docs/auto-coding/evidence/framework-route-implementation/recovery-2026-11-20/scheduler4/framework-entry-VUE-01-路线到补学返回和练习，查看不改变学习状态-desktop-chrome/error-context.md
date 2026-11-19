# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: framework-entry.spec.ts >> VUE-01 路线到补学返回和练习，查看不改变学习状态
- Location: e2e/framework-entry.spec.ts:16:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-reader-ready="true"]')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('[data-reader-ready="true"]') with timeout 5000ms
  - waiting for locator('[data-reader-ready="true"]')

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
  - text: 工作空间 中文学习资料
  - button "快速查找，快捷键 Command 或 Control 加 K": 搜索知识点、页面… ⌘ K
- main:
  - paragraph: 中文学习资料页面已打开
  - region "我的下一步":
    - heading "我的下一步" [level=2]
    - link "查看学习路线":
      - /url: /plan
    - text: 框架方向
    - combobox "框架方向":
      - option "尚未选择"
      - option "React"
      - option "Vue"
      - option "暂不进入框架" [selected]
    - button "保存方向"
    - paragraph: 选择只影响推荐，不改变当前学习点、暂缓状态或阅读进度。
    - status: 按当前偏好与学习记录推荐；可自由查阅其他资料。
    - link "继续学习 · VUE-01 →":
      - /url: /knowledge/VUE-01
    - paragraph: 保留当前学习点 VUE-01，它位于其他方向。
    - list:
      - listitem:
        - link "WEB-01":
          - /url: /knowledge/WEB-01
        - text: · 已暂缓，需主动恢复
    - group: 本次已审范围：共同基础与一个可选框架方向
    - link "浏览全部资料":
      - /url: /knowledge
  - button "← 返回"
  - paragraph: 11 · Vue 3 项目开发 · 项目与响应式基础
  - heading "VUE-01 Vite 脚手架、SFC 与项目结构" [level=1]:
    - code: VUE-01
    - text: Vite 脚手架、SFC 与项目结构
  - text: 学习中 M0 · 未评估 编码验证型：理解机制后，用可运行的最小代码验证。 应用能力 · 主修必修 稳定 · 框架特定 · 核验 2026-08-09 约束 框架特定 学习路线 vue
  - button "正在学习"
  - button "暂时不学"
  - region "框架入口基础":
    - heading "从一个框架开始" [level=2]
    - paragraph: 选择你要学的入口；无需先学另一个框架。熟悉下列基础可直接继续，查看链接不会更改当前学习点、学完或暂缓状态。
    - article:
      - heading "VUE-01 · 学习中" [level=3]
      - link "详情与练习":
        - /url: /knowledge/VUE-01
      - link "阅读讲义":
        - /url: /knowledge/materials/vue-01-vite-sfc-project-structure.md/vue-01
      - list:
        - listitem:
          - link "补学 WEB-01":
            - /url: /knowledge/WEB-01?entryReturn=VUE-01
          - text: · 已暂缓，依赖仍需补齐 HTML、按钮和挂载容器：读懂最终页面与用户事件。
    - text: 查阅不等于掌握；正文说明每项基础的用途。TS-03、Router 和跨框架对照不是入口门槛。个人推荐只采用所选方向；旧分组仅供浏览。
  - group:
    - text: 推荐学习方式
    - strong: 编码验证型：理解机制后，用可运行的最小代码验证。
    - emphasis: 展开规则与预计投入
  - navigation:
    - button "学习资料"
    - button "我的笔记"
    - button "掌握挑战 可选":
      - text: 掌握挑战
      - emphasis: 可选
  - main:
    - article "学习资料":
      - paragraph:
        - link "中文主讲义：VUE-01 Vite、SFC 与项目结构 未读":
          - /url: /knowledge/materials/vue-01-vite-sfc-project-structure.md/vue-01
        - text: 、
        - link "Vue Quick Start ↗":
          - /url: https://cn.vuejs.org/guide/quick-start.html
        - text: 、
        - link "Single-File Components ↗":
          - /url: https://cn.vuejs.org/guide/scaling-up/sfc.html
        - text: 、
        - link "Vite 为什么选择 Vite ↗":
          - /url: https://cn.vite.dev/guide/why
        - text: 。覆盖范围：沿 HTML、main.ts、App.vue 和两份独立卡片追踪页面，讲清脚手架、SFC 编译、模块与实例、开发/生产、目录、双端别名、公开环境变量、资源、开发代理、HMR、Scoped CSS、锁文件及类型与产物核对；完整文件标明路径和组合方式。
    - complementary:
      - text: LEARNING ACTIVITIES
      - heading "学完资料后，可以这样练" [level=2]
      - paragraph: 每一项都给出实际任务，不再用没有入口的“项目时间”占位。
      - article:
        - text: "01"
        - heading "资料阅读与笔记 学习完成条件" [level=3]:
          - text: 资料阅读与笔记
          - emphasis: 学习完成条件
        - paragraph: 读完列出的资料，记录核心概念、仍有疑问的地方，以及至少一个边界或反例。
        - text: 建议 105 分钟，可按实际情况调整
      - article:
        - text: "02"
        - heading "站内编码验证 可选" [level=3]:
          - text: 站内编码验证
          - emphasis: 可选
        - paragraph: 按中文讲义“建立可复现的练习工程”和“固定入口练习与单变量排错”实现无 Router 的双资料卡片项目。固定输入为两张卡片 25/30 分钟、@/ReadingCard.vue、VITE_API_BASE=/api、提示开关 false；提交全部源码、项目树、dev/typecheck/build/preview 日志和产物清单；断言第一张展开不影响第二张、公开配置显示 /api 与 false、卡片 scoped 标题不命中外部 h2
        - text: 建议 315 分钟，可按实际情况调整
        - button "在系统中开始并完成 →"
  - text: LEARNING COMPLETION
  - heading "读完资料并写好笔记了吗？" [level=2]
  - paragraph: 这个按钮只记录学习完成，不声称已经掌握。
  - button "我已阅读资料并完成笔记"
  - heading "个人推荐操作" [level=2]
  - paragraph: 与上方“我的下一步”使用同一规划结果。当前浏览点的基础单独说明，不改变个人方向。
  - article:
    - code: VUE-01
    - text: 建议继续
    - heading "Vite 脚手架、SFC 与项目结构" [level=3]
    - paragraph: 按当前偏好与学习记录推荐；可自由查阅其他资料。
    - term: 路线
    - definition: 我的下一步
    - term: 本次建议
    - definition: 当前这一步，非整条路线剩余量
    - term: 预计投入
    - definition: 当前点约 420 分钟
    - term: 暂缓影响
    - definition: 暂缓后路线会明确暂停，不会自动跨入其他框架。
    - button "学习下一个 →"
    - button "暂缓此知识点"
- button "打开 Atlas AI 助手":
  - strong: Atlas AI
  - text: 总结 · 解释 · 查资料
```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test';
  2   | import { mkdir, writeFile } from 'node:fs/promises';
  3   | import { fileURLToPath } from 'node:url';
  4   | const evidence = new URL('../../../tmp/framework-entry-evidence/', import.meta.url);
  5   | const entries = [
  6   |   { code: 'REACT-01', guide: 'react-01-render-purity-state-snapshot.md', heading: '用手动释放回调固定观察顺序', sample: '固定快照实验' },
  7   |   { code: 'VUE-01', guide: 'vue-01-vite-sfc-project-structure.md', heading: '固定入口练习与单变量排错', sample: '两张独立的资料卡片' },
  8   | ];
  9   | async function point(page: Page, code: string) { return (await (await page.request.get(`/api/v1/knowledge/points/${code}`)).json()).data; }
  10  | async function progress(page: Page, guide: string) {
  11  |   const records = (await (await page.request.get('/api/v1/knowledge/material-progress')).json()).data;
  12  |   return records.find((r: {guide:string}) => r.guide === guide)?.progressPercent ?? 0;
  13  | }
  14  | for (const entry of entries) {
  15  |   const href = `/knowledge/materials/${entry.guide}/${entry.code.toLowerCase()}`;
  16  |   test(`${entry.code} 路线到补学返回和练习，查看不改变学习状态`, async ({ page, browser }) => {
  17  |     await mkdir(evidence, { recursive: true });
  18  |     await page.setViewportSize({ width: 1440, height: 1000 });
  19  |     await page.request.post(`/api/v1/learning/points/${entry.code}/focus`);
  20  |     await page.request.post('/api/v1/learning/points/WEB-01/defer', { data: { reason: '入口隔离测试' } });
  21  |     const before = await point(page, entry.code);
  22  |     await page.goto('/plan');
  23  |     const route = page.getByRole('region', { name: '框架入口基础' });
  24  |     await expect(route).toContainText('无需先学另一个框架');
  25  |     await route.locator(`a[href="/knowledge/${entry.code}"]`).click();
  26  |     await expect(page.locator('.point-hero h1 code')).toHaveText(entry.code);
  27  |     const panel = page.getByRole('region', { name: '框架入口基础' });
  28  |     await expect(panel).toContainText('学习中');
  29  |     await expect(panel).toContainText('已暂缓，依赖仍需补齐');
  30  |     await panel.getByRole('link', { name: '补学 WEB-01', exact: true }).click();
  31  |     await page.getByRole('link', { name: `← 返回框架入口 ${entry.code}` }).click();
  32  |     await expect(page.locator('.point-hero h1 code')).toHaveText(entry.code);
  33  |     await panel.getByRole('link', { name: '阅读讲义', exact: true }).click();
> 34  |     await expect(page.locator('[data-reader-ready="true"]')).toBeVisible();
      |                                                              ^ Error: expect(locator).toBeVisible() failed
  35  |     await page.locator('.markdown-body').getByRole('link', { name: 'WEB-01', exact: true }).click();
  36  |     await expect(page.locator('.material-hero')).toContainText('WEB-01');
  37  |     await page.getByRole('button', { name: '返回上一页 →' }).click();
  38  |     await expect(page).toHaveURL(href);
  39  |     await expect(page.locator('.material-hero')).toContainText(entry.code);
  40  |     await expect(page.locator('[data-reader-ready="true"]')).toBeVisible();
  41  |     await page.locator('.material-hero').scrollIntoViewIfNeeded();
  42  |     await page.screenshot({ animations: 'disabled', path: fileURLToPath(new URL(`${entry.code}-reader-desktop.png`, evidence)) });
  43  |     await page.getByRole('region', { name: '框架入口基础' }).getByRole('link', { name: '详情与练习' }).click();
  44  |     await page.getByRole('button', { name: '在系统中开始并完成 →' }).click();
  45  |     await expect(page.locator('.practice-workspace')).toBeVisible();
  46  |     await expect(page.locator('.task-statement').first()).toContainText(entry.code === 'REACT-01' ? '3/4/5' : '无 Router');
  47  |     await page.evaluate(() => Promise.all(document.getAnimations().filter(a => a.effect?.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))));
  48  |     await page.screenshot({ animations: 'disabled', path: fileURLToPath(new URL(`${entry.code}-practice.png`, evidence)) });
  49  |     const after = await point(page, entry.code);
  50  |     expect({ state: after.learningState, focus: after.currentFocus, mastery: after.masteryLevel }).toEqual({ state: before.learningState, focus: before.currentFocus, mastery: before.masteryLevel });
  51  |     expect((await point(page, 'WEB-01')).learningState).toBe('DEFERRED');
  52  |     await page.request.post('/api/v1/learning/points/WEB-01/restore');
  53  |     await writeFile(new URL(`${entry.code}-browser.json`, evidence), JSON.stringify({ browser: browser.version(), viewport: page.viewportSize(), pages: ['/plan', `/knowledge/${entry.code}`, href, '/knowledge/WEB-01'], before, after }, null, 2));
  54  |   });
  55  |   test(`${entry.code} 小节查阅、复制、滚动和阅读阈值`, async ({ page }) => {
  56  |     const before = await point(page, entry.code);
  57  |     const initial = await progress(page, entry.guide);
  58  |     await page.goto(`${href}#${encodeURIComponent(entry.heading)}`);
  59  |     await expect(page.locator('[data-reader-ready="true"]')).toBeVisible();
  60  |     await expect(page.locator('.section-visit-note')).toBeVisible();
  61  |     await page.waitForTimeout(750);
  62  |     expect(await progress(page, entry.guide)).toBe(initial);
  63  |     const external = page.locator('.markdown-body a[href^="https://"]');
  64  |     expect(await external.count()).toBeGreaterThan(0);
  65  |     for (const link of await external.all()) { await expect(link).toHaveAttribute('target', '_blank'); await expect(link).toHaveAttribute('rel', /noopener/); }
  66  |     await page.setViewportSize({ width: 390, height: 844 });
  67  |     await page.getByRole('button', { name: '打开本页目录' }).click();
  68  |     const toc = page.locator('.toc-rail').getByRole('button', { name: entry.heading, exact: true });
  69  |     await toc.focus(); await page.keyboard.press('Enter');
  70  |     await expect(page.locator('.markdown-body h3').filter({ hasText: new RegExp(`^${entry.heading}$`) })).toBeFocused();
  71  |     const block = page.locator('.code-block').filter({ hasText: entry.sample }).last();
  72  |     await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  73  |     await block.getByRole('button', { name: '复制代码' }).click();
  74  |     await expect(block.getByRole('button', { name: '已复制' })).toBeVisible();
  75  |     expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(await block.locator('pre').textContent());
  76  |     const wide = page.locator('.code-block pre').filter({ hasText: entry.code === 'REACT-01' ? 'commit observation' : 'fileURLToPath' }).first();
  77  |     await wide.scrollIntoViewIfNeeded();
  78  |     expect(await wide.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
  79  |     await wide.evaluate(el => { el.scrollLeft = el.scrollWidth; });
  80  |     expect(await wide.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  81  |     await wide.evaluate(el => { el.scrollLeft = 0; });
  82  |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  83  |     await page.screenshot({ animations: 'disabled', path: fileURLToPath(new URL(`${entry.code}-mobile-code.png`, evidence)) });
  84  |     await page.goto(href); await expect(page.locator('[data-reader-ready="true"]')).toBeVisible();
  85  |     await page.locator('.material-sheet footer').scrollIntoViewIfNeeded();
  86  |     await expect.poll(() => progress(page, entry.guide)).toBeGreaterThanOrEqual(80);
  87  |     const after = await point(page, entry.code);
  88  |     expect({ state: after.learningState, mastery: after.masteryLevel, focus: after.currentFocus }).toEqual({ state: before.learningState, mastery: before.masteryLevel, focus: before.currentFocus });
  89  |   });
  90  | }
  91  | 
  92  | test('入口明确区分未学与已学基础，查阅后当前点保持不变', async ({ page }) => {
  93  |   await page.request.post('/api/v1/learning/points/WEB-01/restore');
  94  |   await page.goto('/knowledge/VUE-01');
  95  |   const panel = page.getByRole('region', { name: '框架入口基础' });
  96  |   await expect(panel).toContainText('未开始，可按需补学');
  97  |   await page.request.post('/api/v1/learning/points/WEB-01/complete');
  98  |   await page.request.post('/api/v1/learning/points/VUE-01/focus');
  99  |   await page.reload();
  100 |   await expect(panel.locator('li')).toContainText('已学完');
  101 |   await panel.getByRole('link', { name: '补学 WEB-01' }).click();
  102 |   await page.getByRole('link', { name: '← 返回框架入口 VUE-01' }).click();
  103 |   expect((await point(page, 'VUE-01')).currentFocus).toBe(true);
  104 |   expect((await point(page, 'WEB-01')).learningState).toBe('LEARNED');
  105 |   await page.goto('/plan');
  106 |   await expect(page.getByRole('region', { name: '框架入口基础' })).toBeVisible();
  107 |   await page.screenshot({ animations: 'disabled', path: fileURLToPath(new URL('framework-plan.png', evidence)) });
  108 | });
  109 | 
```