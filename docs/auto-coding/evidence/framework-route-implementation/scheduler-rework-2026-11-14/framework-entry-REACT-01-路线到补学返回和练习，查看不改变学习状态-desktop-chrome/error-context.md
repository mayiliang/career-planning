# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: framework-entry.spec.ts >> REACT-01 路线到补学返回和练习，查看不改变学习状态
- Location: e2e/framework-entry.spec.ts:16:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: apiRequestContext.get: Test timeout of 30000ms exceeded.
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
        - generic [ref=e68]: 知识点详情
      - button "快速查找，快捷键 Command 或 Control 加 K" [ref=e70] [cursor=pointer]:
        - generic [ref=e73]: 搜索知识点、页面…
        - generic [ref=e74]: ⌘ K
    - main [ref=e75]:
      - paragraph [ref=e76]: 知识点详情页面已打开
      - generic [ref=e79]:
        - region "我的下一步" [ref=e80]:
          - generic [ref=e81]:
            - heading "我的下一步" [level=2] [ref=e82]
            - link "查看学习路线" [ref=e83] [cursor=pointer]:
              - /url: /plan
          - generic [ref=e84]:
            - generic [ref=e85]:
              - text: 框架方向
              - combobox "框架方向" [ref=e86]:
                - option "尚未选择"
                - option "React"
                - option "Vue"
                - option "暂不进入框架" [selected]
            - button "保存方向" [ref=e87] [cursor=pointer]
          - paragraph [ref=e88]: 选择只影响推荐，不改变当前学习点、暂缓状态或阅读进度。
          - status [ref=e89]: 按当前偏好与学习记录推荐；可自由查阅其他资料。
          - link "继续学习 · REACT-01 →" [ref=e90] [cursor=pointer]:
            - /url: /knowledge/REACT-01
          - paragraph [ref=e91]: 保留当前学习点 REACT-01，它位于其他方向。
          - list [ref=e92]:
            - listitem [ref=e93]:
              - link "WEB-01" [ref=e94] [cursor=pointer]:
                - /url: /knowledge/WEB-01
              - text: · 已暂缓，需主动恢复
          - group [ref=e95]:
            - generic "本次已审范围：共同基础与一个可选框架方向" [ref=e96] [cursor=pointer]
          - link "浏览全部资料" [ref=e97] [cursor=pointer]:
            - /url: /knowledge
        - generic [ref=e98]:
          - button "← 返回" [ref=e99] [cursor=pointer]
          - generic [ref=e100]:
            - paragraph [ref=e101]: 03 · React 原理、状态、Hooks、路由与性能 · 渲染与组件边界
            - heading [level=1] [ref=e102]:
              - code [ref=e103]: REACT-01
              - text: 渲染、组件纯度与 state snapshot
            - generic [ref=e104]:
              - generic [ref=e105]: 学习中
              - generic [ref=e106]: M0 · 未评估
              - generic [ref=e107]: 编码验证型：理解机制后，用可运行的最小代码验证。
              - generic [ref=e108]: 应用能力 · 主修必修
              - generic "按 Baseline、目标浏览器和运行环境做能力检测与渐进增强。隔离框架适配层，保留框架无关的业务、数据与测试契约。" [ref=e109]: 稳定 · 框架特定 · 核验 2026-08-09
              - generic [ref=e110]: 约束 框架特定
              - generic [ref=e111]: 学习路线 react
          - generic [ref=e112]:
            - button "正在学习" [ref=e113] [cursor=pointer]
            - button "暂时不学" [ref=e114] [cursor=pointer]
        - region "框架入口基础" [ref=e115]:
          - heading "从一个框架开始" [level=2] [ref=e116]
          - paragraph [ref=e117]: 选择你要学的入口；无需先学另一个框架。熟悉下列基础可直接继续，查看链接不会更改当前学习点、学完或暂缓状态。
          - article [ref=e118]:
            - heading "REACT-01 · 学习中" [level=3] [ref=e119]
            - link "详情与练习" [ref=e120] [cursor=pointer]:
              - /url: /knowledge/REACT-01
            - link "阅读讲义" [ref=e121] [cursor=pointer]:
              - /url: /knowledge/materials/react-01-render-purity-state-snapshot.md/react-01
            - list [ref=e122]:
              - listitem [ref=e123]:
                - link "补学 JS-01" [ref=e124] [cursor=pointer]:
                  - /url: /knowledge/JS-01?entryReturn=REACT-01
                - text: · 已学完闭包与局部绑定：解释回调为何保留创建时的状态。
              - listitem [ref=e125]:
                - link "补学 JS-03" [ref=e126] [cursor=pointer]:
                  - /url: /knowledge/JS-03?entryReturn=REACT-01
                - text: · 已学完对象共享与不可变更新：识别渲染修改输入造成的污染。
              - listitem [ref=e127]:
                - link "补学 WEB-01" [ref=e128] [cursor=pointer]:
                  - /url: /knowledge/WEB-01?entryReturn=REACT-01
                - text: · 已暂缓，依赖仍需补齐HTML、按钮和挂载容器：读懂最终页面与用户事件。
          - generic [ref=e129]: 查阅不等于掌握；正文说明每项基础的用途。TS-03、Router 和跨框架对照不是入口门槛。个人推荐只采用所选方向；旧分组仅供浏览。
        - group [ref=e130]:
          - generic "推荐学习方式 编码验证型：理解机制后，用可运行的最小代码验证。 展开规则与预计投入" [ref=e131] [cursor=pointer]:
            - generic [ref=e132]:
              - generic [ref=e133]: 推荐学习方式
              - strong [ref=e134]: 编码验证型：理解机制后，用可运行的最小代码验证。
            - emphasis [ref=e135]: 展开规则与预计投入
        - navigation [ref=e137]:
          - button "学习资料" [ref=e138] [cursor=pointer]
          - button "我的笔记" [ref=e139] [cursor=pointer]
          - button [ref=e140] [cursor=pointer]:
            - text: 掌握挑战
            - emphasis [ref=e141]: 可选
        - main [ref=e142]:
          - article "学习资料" [ref=e144]:
            - paragraph [ref=e145]:
              - link "中文主讲义：REACT-01 渲染纯度、状态快照与提交 已读 5%" [ref=e146] [cursor=pointer]:
                - /url: /knowledge/materials/react-01-render-purity-state-snapshot.md/react-01
                - text: 中文主讲义：REACT-01 渲染纯度、状态快照与提交
                - generic [ref=e147]: 已读 5%
              - text: 、
              - link "Render and Commit ↗" [ref=e148] [cursor=pointer]:
                - /url: https://zh-hans.react.dev/learn/render-and-commit
              - text: 、
              - link "State as a Snapshot ↗" [ref=e149] [cursor=pointer]:
                - /url: https://zh-hans.react.dev/learn/state-as-a-snapshot
              - text: 、
              - link "Keeping Components Pure ↗" [ref=e150] [cursor=pointer]:
                - /url: https://zh-hans.react.dev/learn/keeping-components-pure
              - text: 。覆盖范围：通过独立 TSX 组件观察更新队列、混合更新、延迟发送、纯列表、草稿 key 和派生筛选，讲清 render/commit/绘制、快照与闭包、批处理、Strict Mode、不可变数据及并发与 Hydration 边界；提供逐步操作和结果对照。
          - complementary [ref=e151]:
            - generic [ref=e152]:
              - generic [ref=e153]: LEARNING ACTIVITIES
              - heading "学完资料后，可以这样练" [level=2] [ref=e154]
              - paragraph [ref=e155]: 每一项都给出实际任务，不再用没有入口的“项目时间”占位。
            - article [ref=e156]:
              - generic [ref=e157]: "01"
              - generic [ref=e158]:
                - heading [level=3] [ref=e159]:
                  - text: 资料阅读与笔记
                  - emphasis [ref=e160]: 学习完成条件
                - paragraph [ref=e161]: 读完列出的资料，记录核心概念、仍有疑问的地方，以及至少一个边界或反例。
                - generic [ref=e162]: 建议 105 分钟，可按实际情况调整
            - article [ref=e163]:
              - generic [ref=e164]: "02"
              - generic [ref=e165]:
                - heading [level=3] [ref=e166]:
                  - text: 站内编码验证
                  - emphasis [ref=e167]: 可选
                - paragraph [ref=e168]: 使用中文讲义“建立可复现的练习工程”和“用手动释放回调固定观察顺序”的完整源码，初始 count=0，每组刷新。运行表格五组操作并编写组件测试，逐步交付输入、入队过程、output 和 callback snapshot；预期值式单次=1、函数单次=3、三次独立点击=1/2/3、预约后先加三再释放的值式=3/1/1、函数式=3/4/5；保存分阶段日志，不按固定 render 次数判断；运行纯度反例并验证输入是否被污染
                - generic [ref=e169]: 建议 315 分钟，可按实际情况调整
                - button "收起练习区" [active] [ref=e170] [cursor=pointer]
              - region "REACT-01 站内编码验证" [ref=e171]:
                - generic [ref=e172]:
                  - generic [ref=e173]:
                    - text: IN-SITE PRACTICE
                    - heading "REACT-01 · 站内编码验证" [level=3] [ref=e174]
                    - paragraph [ref=e175]: 渲染、组件纯度与 state snapshot
                  - generic [ref=e176]: 新草稿
                - region "具体任务题干" [ref=e177]:
                  - text: 00 · 具体任务题干
                  - paragraph [ref=e178]: 使用中文讲义“建立可复现的练习工程”和“用手动释放回调固定观察顺序”的完整源码，初始 count=0，每组刷新。运行表格五组操作并编写组件测试，逐步交付输入、入队过程、output 和 callback snapshot；预期值式单次=1、函数单次=3、三次独立点击=1/2/3、预约后先加三再释放的值式=3/1/1、函数式=3/4/5；保存分阶段日志，不按固定 render 次数判断；运行纯度反例并验证输入是否被污染
                - generic [ref=e179]:
                  - generic [ref=e180]:
                    - text: 01 · 固定输入与约束
                    - paragraph [ref=e181]: 首考题 3（最小产出）原文：使用中文讲义“建立可复现的练习工程”和“用手动释放回调固定观察顺序”的完整源码，初始 count=0，每组刷新。运行表格五组操作并编写组件测试，逐步交付输入、入队过程、output 和 callback snapshot；预期值式单次=1、函数单次=3、三次独立点击=1/2/3、预约后先加三再释放的值式=3/1/1、函数式=3/4/5；保存分阶段日志，不按固定 render 次数判断；运行纯度反例并验证输入是否被污染 首考题 4（受限排错）原文：固定失败为预约值式后先加三，再释放导致计数回到 1。仅比较“旧快照替换”“函数更新累积”“重复用户事件”三个候选，提交最小复现、逐项证伪和改为函数更新后的 3/4/5 回归；另以纯度片段的 push 反例验证修复前后输入和输出，不能依赖 Date.now 两次不同 仅可依据 《中文主讲义：REACT-01 渲染纯度、状态快照与提交》、《Render and Commit》、《State as a Snapshot》、《Keeping Components Pure》 和本点通过标准完成；不得用通用 PASS/CONTROLLED 模板替换题目给定的输入、预期或异常。
                  - generic [ref=e182]:
                    - text: 02 · 必须提交
                    - list [ref=e183]:
                      - listitem [ref=e184]: 题 3 的可执行实现
                      - listitem [ref=e185]: 固定输入、预期、实际输出与断言
                      - listitem [ref=e186]: 题 4 的异常、根因、修复和回归证据
                  - generic [ref=e187]:
                    - text: 03 · 验证清单
                    - list [ref=e188]:
                      - listitem [ref=e189]: 首考题 3 和首考题 4 原文均已绑定到本练习
                      - listitem [ref=e190]: 提交模板的每个固定栏目都已填写
                      - listitem [ref=e191]: 固定输入、预期、实际和验证证据均可定位
                      - listitem [ref=e192]: 代码保留固定输入、预期输出、实际输出和断言
                      - listitem [ref=e193]: 题 4 异常有根因、修复与回归证据
                      - listitem [ref=e194]: 代码包含固定输入、expected、actual 与 console.assert，并已成功执行
                - generic "失败夹具与否决项" [ref=e195]:
                  - generic [ref=e196]:
                    - text: 失败夹具 / 复测变式
                    - paragraph [ref=e197]: 固定失败为预约值式后先加三，再释放导致计数回到 1。仅比较“旧快照替换”“函数更新累积”“重复用户事件”三个候选，提交最小复现、逐项证伪和改为函数更新后的 3/4/5 回归；另以纯度片段的 push 反例验证修复前后输入和输出，不能依赖 Date.now 两次不同
                  - generic [ref=e198]:
                    - text: 否决项
                    - list [ref=e199]:
                      - listitem [ref=e200]: 未保留首考题 3 的具体产出或首考题 4 的受限排错证据
                      - listitem [ref=e201]: 以资料外经验、空泛描述或预设 PASS/CONTROLLED 状态替代题目要求
                - group [ref=e202]:
                  - generic "本练习对应的学习资料位置" [ref=e203] [cursor=pointer]
                  - generic [ref=e204]:
                    - link "中文主讲义：REACT-01 渲染纯度、状态快照与提交 ↗" [ref=e205] [cursor=pointer]:
                      - /url: /knowledge/materials/react-01-render-purity-state-snapshot.md/react-01
                    - paragraph [ref=e206]: 打开后定位到“react 01”章节；重点核对：渲染、组件纯度、state snapshot
                  - generic [ref=e207]:
                    - link "Render and Commit ↗" [ref=e208] [cursor=pointer]:
                      - /url: https://zh-hans.react.dev/learn/render-and-commit
                    - paragraph [ref=e209]: 打开后使用页面查找定位“渲染”相关段落；重点核对：渲染、组件纯度、state snapshot
                  - generic [ref=e210]:
                    - link "State as a Snapshot ↗" [ref=e211] [cursor=pointer]:
                      - /url: https://zh-hans.react.dev/learn/state-as-a-snapshot
                    - paragraph [ref=e212]: 打开后使用页面查找定位“渲染”相关段落；重点核对：渲染、组件纯度、state snapshot
                  - generic [ref=e213]:
                    - link "Keeping Components Pure ↗" [ref=e214] [cursor=pointer]:
                      - /url: https://zh-hans.react.dev/learn/keeping-components-pure
                    - paragraph [ref=e215]: 打开后使用页面查找定位“渲染”相关段落；重点核对：渲染、组件纯度、state snapshot
                - generic [ref=e216]:
                  - generic [ref=e217]:
                    - generic [ref=e218]:
                      - generic [ref=e219]: 隔离脚本运行区
                      - generic [ref=e220]: javascript · 无 DOM · 3 秒超时
                    - button "▶ 执行并捕获输出" [ref=e221]
                  - textbox "练习代码" [ref=e222]: "// REACT-01 渲染、组件纯度与 state snapshot // 首考题 3 原文：使用中文讲义“建立可复现的练习工程”和“用手动释放回调固定观察顺序”的完整源码，初始 count=0，每组刷新。运行表格五组操作并编写组件测试，逐步交付输入、入队过程、output 和 callback snapshot；预期值式单次=1、函数单次=3、三次独立点击=1/2/3、预约后先加三再释放的值式=3/1/1、函数式=3/4/5；保存分阶段日志，不按固定 render 次数判断；运行纯度反例并验证输入是否被污染 // 首考题 4 原文：固定失败为预约值式后先加三，再释放导致计数回到 1。仅比较“旧快照替换”“函数更新累积”“重复用户事件”三个候选，提交最小复现、逐项证伪和改为函数更新后的 3/4/5 回归；另以纯度片段的 push 反例验证修复前后输入和输出，不能依赖 Date.now 两次不同 // 把题目给定的具体 fixture 写入 fixedInput；不要把预期替换成通用 PASS/CONTROLLED。 const fixedInput = Object.freeze({ /* 填写首考题 3 的固定输入 */ }); const expected = Object.freeze({ /* 填写题目要求的具体预期 */ }); function solve(input) { // 根据学习资料实现首考题 3。 throw new Error('TODO'); } let actual; try { actual = solve(fixedInput); console.log({ fixedInput, expected, actual }); console.assert(JSON.stringify(actual) === JSON.stringify(expected), '实际输出与首考题 3 的具体预期不一致'); } catch (error) { console.error({ fixedInput, expected, error: String(error) }); throw error; }"
                  - generic [ref=e223]:
                    - text: 执行结果 · NOT_RUN
                    - generic [ref=e224]: 尚未执行。请让脚本打印固定输入、预期输出和实际输出。
                - generic [ref=e225]:
                  - generic [ref=e226]: 实现说明与验证记录
                  - textbox "实现说明与验证记录" [ref=e227]:
                    - /placeholder: 请按模板逐项填写；系统将据此验证输入、输出、资料依据和边界。
                    - text: "# 首考题 3：实现说明 # 固定输入 # 预期输出 # 实际输出 # 首考题 4：异常、根因与修复 # 资料机制映射 # 验证证据"
                - list "练习验证阶段" [ref=e228]:
                  - listitem [ref=e229]:
                    - generic [ref=e230]: "1"
                    - generic [ref=e231]:
                      - strong [ref=e232]: 本地结构检查
                      - generic [ref=e233]: 尚未执行
                  - listitem [ref=e234]:
                    - generic [ref=e235]: "2"
                    - generic [ref=e236]:
                      - strong [ref=e237]: AI 语义复核
                      - generic [ref=e238]: 未参与；不能替代为完全通过。
                  - listitem [ref=e239]:
                    - generic [ref=e240]: "3"
                    - generic [ref=e241]:
                      - strong [ref=e242]: 完全通过
                      - generic [ref=e243]: 须在前两层均通过后才会点亮。
                - generic [ref=e244]:
                  - button "保存草稿" [ref=e245]
                  - button "提交并验证" [ref=e246]
        - generic [ref=e247]:
          - generic [ref=e248]:
            - text: LEARNING COMPLETION
            - heading "读完资料并写好笔记了吗？" [level=2] [ref=e249]
            - paragraph [ref=e250]: 这个按钮只记录学习完成，不声称已经掌握。
          - button "我已阅读资料并完成笔记" [ref=e251] [cursor=pointer]
        - generic [ref=e252]:
          - generic [ref=e253]:
            - heading "个人推荐操作" [level=2] [ref=e254]
            - paragraph [ref=e255]: 与上方“我的下一步”使用同一规划结果。当前浏览点的基础单独说明，不改变个人方向。
          - article [ref=e257]:
            - generic [ref=e258]:
              - code [ref=e259]: REACT-01
              - generic [ref=e260]: 建议继续
            - heading "渲染、组件纯度与 state snapshot" [level=3] [ref=e261]
            - paragraph [ref=e262]: 按当前偏好与学习记录推荐；可自由查阅其他资料。
            - generic [ref=e263]:
              - generic [ref=e264]:
                - term [ref=e265]: 路线
                - definition [ref=e266]: 我的下一步
              - generic [ref=e267]:
                - term [ref=e268]: 本次建议
                - definition [ref=e269]: 当前这一步，非整条路线剩余量
              - generic [ref=e270]:
                - term [ref=e271]: 预计投入
                - definition [ref=e272]: 当前点约 420 分钟
              - generic [ref=e273]:
                - term [ref=e274]: 暂缓影响
                - definition [ref=e275]: 暂缓后路线会明确暂停，不会自动跨入其他框架。
            - generic [ref=e276]:
              - button "学习下一个 →" [ref=e277] [cursor=pointer]
              - button "暂缓此知识点" [ref=e278] [cursor=pointer]
  - button "打开 Atlas AI 助手" [ref=e279] [cursor=pointer]:
    - generic [aria-hidden] [ref=e280]: ✦
    - generic [ref=e281]:
      - strong [ref=e282]: Atlas AI
      - generic [ref=e283]: 总结 · 解释 · 查资料
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
> 9   | async function point(page: Page, code: string) { return (await (await page.request.get(`/api/v1/knowledge/points/${code}`)).json()).data; }
      |                                                                                    ^ Error: apiRequestContext.get: Test timeout of 30000ms exceeded.
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
  34  |     await expect(page.locator('[data-reader-ready="true"]')).toBeVisible();
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