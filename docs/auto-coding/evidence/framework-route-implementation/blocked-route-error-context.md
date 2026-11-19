# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: framework-route.spec.ts >> 独立方向、统一下一步、保留焦点、阅读辅助与空态
- Location: e2e/framework-route.spec.ts:7:1

# Error details

```
Test timeout of 120000ms exceeded.
```

```
Error: expect(locator).toHaveText(expected) failed

Locator: locator('.point-hero h1 code')
Expected: "WEB-01"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toHaveText" locator('.point-hero h1 code') with timeout 5000ms
  - waiting for locator('.point-hero h1 code')

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
  - text: 工作空间 知识点详情
  - button "快速查找，快捷键 Command 或 Control 加 K": 搜索知识点、页面… ⌘ K
- main:
  - paragraph: 知识点详情页面已打开
  - main:
    - region "我的下一步":
      - heading "我的下一步" [level=2]
      - link "查看学习路线":
        - /url: /plan
      - text: 框架方向
      - combobox "框架方向":
        - option "尚未选择"
        - option "React"
        - option "Vue" [selected]
        - option "暂不进入框架"
      - button "保存方向"
      - paragraph: 选择只影响推荐，不改变当前学习点、暂缓状态或阅读进度。
      - status: 按当前偏好与学习记录推荐；可自由查阅其他资料。
      - link "补齐基础 · WEB-01 →":
        - /url: /knowledge/WEB-01
      - group: 本次已审范围：共同基础与一个可选框架方向
      - link "浏览全部资料":
        - /url: /knowledge
    - complementary "练习合同状态":
      - strong: 练习合同待修订
      - paragraph: 筛选后编辑器行为与双面板复测夹具尚未统一。
      - paragraph: 本篇可正常阅读、自主标记学完和查看历史记录。新练习仅作结构检查并保存草稿，暂不创建新的语义挑战。
      - paragraph:
        - text: 本篇学习基础：
        - link "REACT-01":
          - /url: /knowledge/REACT-01?entryReturn=REACT-02
        - text: 。这与“我的下一步”分别说明本篇基础和个人推荐。
    - navigation "讲义操作":
      - button "← 返回上一页"
      - button "复制本页链接"
    - navigation "切换学习批次":
      - link "B01":
        - /url: /knowledge/materials/js-01-execution-context-scope-closure.md/js-01
      - link "B02":
        - /url: /knowledge/materials/cs-01-complexity-scale-engineering-cost.md/cs-01
      - link "B03":
        - /url: /knowledge/materials/js-05-promise-errors-async-control-flow.md/js-05
      - link "B04":
        - /url: /knowledge/materials/ts-03-generics-constraints-keyof-indexed-access.md/ts-03
      - link "B05":
        - /url: /knowledge/materials/react-02-component-boundaries-data-flow-composition.md/react-02
      - link "B06":
        - /url: /knowledge/materials/react-04-effects-external-sync-cleanup.md/react-04
      - link "B07":
        - /url: /knowledge/materials/react-06-reducer-context-state-domains.md/react-06
      - link "B08":
        - /url: /knowledge/materials/vue-07-router-navigation-boundaries.md/vue-07
      - link "B09":
        - /url: /knowledge/materials/git-01-object-index-references-recovery.md/git-01
      - link "B10":
        - /url: /knowledge/materials/eng-01-module-graph-build-output-source-maps.md/eng-01
      - link "B11":
        - /url: /knowledge/materials/test-01-test-design-oracles-properties-mutation.md/test-01
      - link "B12":
        - /url: /knowledge/materials/career-02-architecture-diagrams-boundaries-adrs.md/career-02
      - link "B13":
        - /url: /knowledge/materials/a11y-01-wcag-testing-governance.md/a11y-01
      - link "B14":
        - /url: /knowledge/materials/web-05-web-components-shadow-dom-interoperability.md/web-05
      - link "B15":
        - /url: /knowledge/materials/sec-04-cross-origin-isolation-embedding-permissions.md/sec-04
      - link "B16":
        - /url: /knowledge/materials/ts-05-conditional-infer-distribution.md/ts-05
      - link "B17":
        - /url: /knowledge/materials/identity-01-session-cookie-token-browser-boundaries.md/identity-01
      - link "B18":
        - /url: /knowledge/materials/node-01-runtime-event-loop-nonblocking-io.md/node-01
      - link "B19":
        - /url: /knowledge/materials/aidev-02-context-engineering-repository-instructions.md/aidev-02
      - link "B20":
        - /url: /knowledge/materials/biz-03-rbac-abac-data-permissions.md/biz-03
      - link "B21":
        - /url: /knowledge/materials/biz-08-requirement-acceptance-traceability.md/biz-08
      - link "B22":
        - /url: /knowledge/materials/data-01-server-state-cache-keys-invalidation-deduplication.md/data-01
      - link "B23":
        - /url: /knowledge/materials/comp-02-controlled-uncontrolled-state-imperative.md/comp-02
      - link "B24":
        - /url: /knowledge/materials/linux-02-process-port-log-network-diagnostics.md/linux-02
      - link "B25":
        - /url: /knowledge/materials/eng-06-ci-cd-artifact-promotion-release-rollback.md/eng-06
      - link "B26":
        - /url: /knowledge/materials/perf-02-network-resource-loading-cache-optimization.md/perf-02
      - link "B27":
        - /url: /knowledge/materials/h5-02-scroll-soft-keyboard-pointer-gestures.md/h5-02
      - link "B28":
        - /url: /knowledge/materials/aisafe-01-output-validation-content-safety-guardrails.md/aisafe-01
      - link "B29":
        - /url: /knowledge/materials/aiapp-03-structured-output-schema-validation.md/aiapp-03
      - link "B30":
        - /url: /knowledge/materials/aiapp-06-rag-citations-source-trust.md/aiapp-06
      - link "B31":
        - /url: /knowledge/materials/aiapp-10-ai-interaction-trust-recovery.md/aiapp-10
      - link "B32":
        - /url: /knowledge/materials/agent-03-mcp-transport-stateless-state-versioning.md/agent-03
      - link "B33":
        - /url: /knowledge/materials/agent-08-tool-contract-schema-discoverability.md/agent-08
      - link "B34":
        - /url: /knowledge/materials/aidev-07-dependency-source-security.md/aidev-07
      - link "B35":
        - /url: /knowledge/materials/arch-02-technical-proposal-adr-review.md/arch-02
    - navigation "B05 旧分组浏览":
      - text: B05 · 兼容阅读分组
      - strong: 让组件协作与状态变化有据可循
      - list:
        - listitem:
          - link "01 REACT-02 React 组件协作":
            - /url: /knowledge/materials/react-02-component-boundaries-data-flow-composition.md/react-02
            - text: 01 REACT-02
            - strong: React 组件协作
        - listitem:
          - link "02 VUE-03 Vue 模板与表单":
            - /url: /knowledge/materials/vue-03-template-directives-events-forms.md/vue-03
            - text: 02 VUE-03
            - strong: Vue 模板与表单
        - listitem:
          - link "03 VUE-04 Vue 组件接口与组合":
            - /url: /knowledge/materials/vue-04-typed-components-slots-model-teleport.md/vue-04
            - text: 03 VUE-04
            - strong: Vue 组件接口与组合
        - listitem:
          - link "04 REACT-03 React 状态建模":
            - /url: /knowledge/materials/react-03-state-model-derived-controlled.md/react-03
            - text: 04 REACT-03
            - strong: React 状态建模
    - paragraph: B05 · 第 1 / 4 篇 · REACT-02
    - heading "REACT-02 组件边界、数据流与组合" [level=1]
    - text: 从完整资料工作台理解 props、意图回调、共同状态与组合。
    - term: 预计阅读
    - definition: 24 分钟
    - term: 阅读状态
    - definition: 未读
    - complementary "本页目录":
      - text: 本页目录
      - navigation:
        - button "学习前先确认"
        - button "先为工作台里的数据找主人"
        - button "用完整组件追踪数据下行与意图上行"
        - button "props 表达组件需要什么而不是允许改什么"
        - button "用事件名称说明业务意图"
        - button "多个消费者共享状态时才向上提升"
        - button "children 让容器不必了解所有业务字段"
        - button "内容需要子层数据时再用 render prop"
        - button "列表重排时让草稿跟着资料走"
        - button "异步回调要说明何时才算完成"
        - button "空态错误和只读模式也属于组件的输入"
        - button "拆分的价值是减少隐含关系"
        - button "参考与延伸阅读"
    - article:
      - text: 这一篇，读懂一个问题
      - heading "拆开页面之后，每份数据和每个动作由谁负责？" [level=2]
      - list:
        - listitem: 沿父子组件追踪数据和修改意图
        - listitem: 用 children 与 render prop 留出明确内容位置
        - listitem: 处理列表身份和异步回调的完成边界
      - article "Markdown 内容":
        - paragraph: 资料列表左边有搜索框，中间有条目，右边有详情。把它们拆成三个文件很容易，难的是回答：搜索词放在哪里？点击条目后谁改变选择？详情里的草稿应不应该跟列表同时更新？
        - paragraph: 这一篇先把一个小型资料工作台完整写出来，再沿数据的来去理解组件边界。目标不是尽量增加组件数量，而是让每份数据、每个用户动作和每块可替换内容都有清楚的去处。
        - heading "学习前先确认" [level=3]
        - list:
          - listitem:
            - text: 直接前置：
            - link "REACT-01 渲染、组件纯度与状态快照":
              - /url: /knowledge/materials/react-01-render-purity-state-snapshot.md/react-01
            - text: 。其中的快照、更新队列与组件身份会继续用到。
        - paragraph:
          - text: 每段 TSX 都是独立示例，可替换已有 React + TypeScript 项目的
          - code: App.tsx
          - text: ；所需组件、数据和导入均在同一段中。实际工程可以再按名字拆文件。先读完整的数据流，再拆文件，更容易看懂边界。
        - heading "先为工作台里的数据找主人" [level=3]
        - paragraph: 先约定产品行为：搜索只改变列表范围，不清空已经选中的资料；选中项即使暂时被筛掉，右侧仍能查看。这个决定要写在设计里，不能让某个 Effect 偶然决定。
        - table:
          - rowgroup:
            - row "数据或动作 谁拥有 为什么":
              - columnheader "数据或动作"
              - columnheader "谁拥有"
              - columnheader "为什么"
          - rowgroup:
            - row "关键词 工作台 搜索框要修改，列表要读取":
              - cell "关键词"
              - cell "工作台"
              - cell "搜索框要修改，列表要读取"
            - row "选中资料 ID 工作台 列表发起选择，详情显示同一选择":
              - cell "选中资料 ID"
              - cell "工作台"
              - cell "列表发起选择，详情显示同一选择"
            - row "筛选后的列表 不另存 state 根据原列表和关键词计算":
              - cell "筛选后的列表"
              - cell "不另存 state"
              - cell "根据原列表和关键词计算"
            - row "详情里的临时草稿 编辑器，或需要保留草稿的上层 看是否要跨资料切换保留":
              - cell "详情里的临时草稿"
              - cell "编辑器，或需要保留草稿的上层"
              - cell "看是否要跨资料切换保留"
            - row "每行按钮的 DOM 事件 行组件内部 父层只需要知道用户选了哪个 ID":
              - cell "每行按钮的 DOM 事件"
              - cell "行组件内部"
              - cell "父层只需要知道用户选了哪个 ID"
        - paragraph: 这张表先回答所有权，再决定组件。页面上有几个矩形，不能直接告诉你状态应放在哪一层。两个相距很远的区域可能共享同一事实；紧挨着的两个按钮也可能属于不同任务。
        - heading "用完整组件追踪数据下行与意图上行" [level=3]
        - paragraph: 运行这个工作台，选择“状态快照”，再搜索“表单”。列表只留下表单，详情仍显示状态快照；清空搜索后，原选择重新出现在列表中。
        - text: tsx
        - button "复制代码"
        - code: "import { useId, useState } from 'react'; type Lesson = Readonly<{ id: string; title: string; minutes: number }>; const lessons: readonly Lesson[] = [ { id: 'form', title: 'HTML 表单', minutes: 25 }, { id: 'snapshot', title: '状态快照', minutes: 30 }, ]; function SearchBox({ value, onChange }: { value: string; onChange: (next: string) => void; }) { const id = useId(); return ( <div> <label htmlFor={id}>关键词</label> <input id={id} value={value} onChange={event => onChange(event.target.value)} /> </div> ); } function LessonList({ items, selectedId, onSelect }: { items: readonly Lesson[]; selectedId: string | null; onSelect: (id: string) => void; }) { if (items.length === 0) return <p>没有匹配的资料。</p>; return <ul>{items.map(item => ( <li key={item.id}> <button type=\"button\" aria-pressed={selectedId === item.id} onClick={() => onSelect(item.id)}> {item.title} </button> </li> ))}</ul>; } function LessonDetails({ lesson }: { lesson: Lesson | null }) { return lesson ? <section><h2>{lesson.title}</h2><p>预计 {lesson.minutes} 分钟</p></section> : <p>请先选择一份资料。</p>; } export default function App() { const [query, setQuery] = useState(''); const [selectedId, setSelectedId] = useState<string | null>(null); const visible = lessons.filter(item => item.title.includes(query.trim())); const selected = lessons.find(item => item.id === selectedId) ?? null; return ( <main> <h1>资料工作台</h1> <SearchBox value={query} onChange={setQuery} /> <LessonList items={visible} selectedId={selectedId} onSelect={setSelectedId} /> <LessonDetails lesson={selected} /> </main> ); }"
        - paragraph: 先沿搜索走一遍：父层把 query 传给 SearchBox；输入时子层读取文本，调用 onChange；父层更新 query；下一次 render 重新算 visible，再把结果传给列表。
        - paragraph: 再沿选择走一遍：行按钮调用 onSelect 并传 ID；父层更新 selectedId；详情从完整集合查找该 ID。注意查找的不是 visible，所以筛选不会让当前详情凭空消失。换成从 visible 查找，产品行为就变了，不是无关紧要的实现细节。
        - paragraph:
          - text: 这种“父层给数据，子层报告意图”的组织方式叫
          - strong:
            - text: 单向数据流（one-way data flow
            - button "播放“one-way data flow”的美式发音"
            - text: ）
          - text: 。回调向上调用并没有把数据流变成混乱的双向修改：改变权威状态的地方仍是父层，新的结果再以 props 向下传递。
        - heading "props 表达组件需要什么而不是允许改什么" [level=3]
        - paragraph:
          - code: LessonList
          - text: 只需要条目、当前选择和选择回调，不需要知道路由、请求地址、用户的全部偏好。
          - code: LessonDetails
          - text: 只需要一份可显示的数据，不必通过全局单例偷偷找当前选择。
        - paragraph:
          - strong: props
          - button "播放“props”的美式发音"
          - text: 可以是对象、数组、函数或 JSX，不限于字符串。它们是子组件当前收到的输入，不能靠修改
          - code: items[0].title
          - text: 来通知父组件。TypeScript 的 readonly 能发现部分不当写法，但不会在运行时冻结数据，嵌套对象也需要相应约定。
        - paragraph: 如果子层确实需要编辑，传出“新标题”或“待保存草稿”，由拥有者决定如何更新。这样父层还能检查标题长度、记录修改或拒绝操作，而不是在事后才发现自己的对象已经变了。
        - paragraph:
          - text: 也不必把对象每个字段都拆成单独 prop。需要一个完整的资料摘要时，
          - code: "lesson: LessonSummary"
          - text: 往往更清楚；只负责标题排版的组件，用
          - code: "title: string"
          - text: 就够了。最小输入指的是符合职责的稳定形状，不是字符数量最少。
        - heading "用事件名称说明业务意图" [level=3]
        - paragraph:
          - code: onClick
          - text: 说明一个底层事件，
          - code: onSelect
          - text: 说明用户想选中资料。父层不必知道这个意图来自鼠标、Enter 还是某个菜单。同样，
          - code: onCancel
          - text: 、
          - code: onRename
          - text: 、
          - code: onSubmitDraft
          - text: 通常比
          - code: onButtonTwoClick
          - text: 更稳定。
        - paragraph: 回调参数应足够完成任务，但不携带无关内部信息。选择只需 ID；提交需要经过明确约定的草稿。没有必要把整个 DOM Event 存入父层 state，更不应把子组件内部可写状态对象直接暴露出去。
        - paragraph:
          - text: 需要注意“命名”与“浏览器协议”是两层事情。组件的
          - code: onSubmitDraft
          - text: 只是你定义的函数 prop；真正的 HTML form 仍需要处理 submit、原生校验和默认导航。参见
          - link "WEB-01 的标签与提交":
            - /url: /knowledge/materials/web-01-html-semantics-forms-accessibility.md/web-01#%E7%94%A8%E4%B8%80%E4%B8%AA%E5%AE%8C%E6%95%B4%E8%A1%A8%E5%8D%95%E7%9C%8B%E6%B8%85%E6%A0%87%E7%AD%BE%E4%B8%8E%E6%8F%90%E4%BA%A4
          - text: 。
        - heading "多个消费者共享状态时才向上提升" [level=3]
        - paragraph: 若两个折叠面板要求“同时只能展开一个”，每个面板各存一个 open 布尔值就难以协调。共同父层保存 activeId，面板只接收当前是否展开，就能让这个要求直接成立：
        - text: tsx
        - button "复制代码"
        - code: "import { useId, useState, type ReactNode } from 'react'; function Section({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: ReactNode; }) { const contentId = useId(); return ( <section> <h2><button type=\"button\" aria-expanded={open} aria-controls={contentId} onClick={onToggle}>{title}</button></h2> <div id={contentId} hidden={!open}>{children}</div> </section> ); } export default function App() { const [activeId, setActiveId] = useState<string | null>('goals'); function toggle(id: string) { setActiveId(previous => previous === id ? null : id); } return ( <main> <h1>阅读提示</h1> <Section title=\"学习目标\" open={activeId === 'goals'} onToggle={() => toggle('goals')}>解释数据由谁修改。</Section> <Section title=\"阅读建议\" open={activeId === 'tips'} onToggle={() => toggle('tips')}>先运行例子，再看规则。</Section> </main> ); }"
        - paragraph: 先点“阅读建议”，目标内容隐藏；再点一次，两个都关闭。没有“同时 true”的组合需要额外补救。这里的 hidden 保留内容节点；如果内容有局部状态，也会继续存在。
        - paragraph:
          - text: 把需要共享的状态移到最近共同父层，叫
          - strong:
            - text: 状态提升（lifting state up
            - button "播放“lifting state up”的美式发音"
            - text: ）
          - text: 。它不要求把所有输入都搬到应用根部。仅某个编辑器使用的草稿，可以仍留在编辑器；只有需要跨编辑器协调或跨页面保留时，再提升到能承担这项责任的位置。
        - heading "children 让容器不必了解所有业务字段" [level=3]
        - paragraph: 资料面板可能放正文、统计或帮助信息。容器只负责标题、边框和操作区，不应该为了每种内容都新增一个布尔开关。
        - text: tsx
        - button "复制代码"
        - code: "import { useId, useState, type ReactNode } from 'react'; function Panel({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode; }) { const titleId = useId(); return ( <section aria-labelledby={titleId}> <header><h2 id={titleId}>{title}</h2>{actions}</header> <div>{children}</div> </section> ); } export default function App() { const [completed, setCompleted] = useState(false); return ( <main> <h1>我的阅读区</h1> <Panel title=\"当前资料\" actions={<button type=\"button\" onClick={() => setCompleted(value => !value)}>切换完成状态</button>}> <p>组件边界：{completed ? '已完成' : '学习中'}</p> </Panel> <Panel title=\"阅读建议\"><p>每次追踪一份数据的来去。</p></Panel> </main> ); }"
        - paragraph: Panel 不需要知道 completed，它只显示传入内容。状态属于 App，创建 children 和 actions 的表达式也位于 App。点按钮时，两种不同用途的 Panel 可以共用同一种结构。
        - paragraph:
          - text: 这叫
          - strong:
            - text: 组合（composition
            - button "播放“composition”的美式发音"
            - text: ）
          - text: ：通过明确的内容位置拼装组件，而不是让容器猜内容属于哪种业务。普通 children 是默认内容，actions 这样的 ReactNode prop 是一个命名位置。
        - paragraph:
          - text: 示例用 useId 给每个面板建立独立的标题关联，避免重复
          - code: id="panel-title"
          - text: 。useId 适合可访问性关联，不应用作列表数据的 key。列表 key 应来自记录自身的稳定 ID。
        - paragraph: 组合也能减少无意义转发。例如布局层只需接收一个已经配置好的编辑器节点，就不用了解编辑器的每个字段。但真正负责决策的父组件仍需要知道它传入了什么，不能用组合隐藏本来应该清楚的业务关系。
        - heading "内容需要子层数据时再用 render prop" [level=3]
        - paragraph: 如果容器内部算出了阅读进度，调用者想决定显示百分比还是文字，可以让 children 成为函数：
        - text: tsx
        - button "复制代码"
        - code: "import { useState, type ReactNode } from 'react'; function Progress({ total, children }: { total: number; children: (progress: { completed: number; remaining: number }) => ReactNode; }) { const [completed, setCompleted] = useState(0); const current = Math.min(completed, total); return ( <section> {children({ completed: current, remaining: total - current })} <button type=\"button\" disabled={current >= total} onClick={() => setCompleted(value => Math.min(value + 1, total))}>完成一篇</button> </section> ); } export default function App() { return ( <main> <h1>阅读进度</h1> <Progress total={3}> {({ completed, remaining }) => <p>已完成 {completed} 篇，还剩 {remaining} 篇</p>} </Progress> </main> ); }"
        - paragraph: 这个例子约定 total 是非负整数。连续完成三篇，文本依次变化，最后按钮禁用。Progress 拥有计数和推进规则，App 决定怎样描述这些数字。
        - paragraph:
          - text: 函数形式的内容入口常叫
          - strong: render prop
          - button "播放“render prop”的美式发音"
          - text: 。它在渲染期间调用，函数内同样应该保持纯计算，也不要在里面调用 Hook。需要更多状态时，把内容提取为真正的组件；需要复用不带 UI 的有状态逻辑，后续再学习自定义 Hook。
        - paragraph:
          - text: 这与
          - link "Vue 的作用域插槽":
            - /url: /knowledge/materials/vue-04-typed-components-slots-model-teleport.md/vue-04#%E4%BD%9C%E7%94%A8%E5%9F%9F%E6%8F%92%E6%A7%BD%E6%8A%8A%E5%AD%90%E5%B1%82%E6%95%B0%E6%8D%AE%E4%BA%A4%E7%BB%99%E7%88%B6%E5%B1%82%E6%8E%92%E7%89%88
          - text: 可以对照：容器提供数据，调用者提供展示。先明确谁拥有哪部分，再选择语法。
        - heading "列表重排时让草稿跟着资料走" [level=3]
        - paragraph: 列表 key 的意义最好通过一个会交换位置的例子观察。这里每行 DOM 自己保存尚未提交的输入文本，用来突出身份问题：
        - text: tsx
        - button "复制代码"
        - code: "import { useState } from 'react'; type Lesson = { id: string; title: string }; const initial: Lesson[] = [ { id: 'form', title: 'HTML 表单' }, { id: 'snapshot', title: '状态快照' }, ]; function Row({ lesson }: { lesson: Lesson }) { return <li><label>{lesson.title} 的备注 <input defaultValue=\"\" /></label></li>; } export default function App() { const [items, setItems] = useState(initial); return ( <main> <h1>资料备注</h1> <button type=\"button\" onClick={() => setItems(previous => [...previous].reverse())}>反转顺序</button> <ul>{items.map(item => <Row key={item.id} lesson={item} />)}</ul> </main> ); }"
        - paragraph: 在 HTML 表单那一行输入“周末复习”，反转后，它应仍属于 HTML 表单。key 让 React 把已有节点和状态匹配到同一记录，而不是把“第一行的位置”当成身份。
        - paragraph: 可以对照改成索引 key：资料顺序变了，原位置保留的输入却可能被贴到另一条资料旁。这不是 input 的 bug，而是你告诉 React 按另一种身份复用节点。随机 key 又会在每次渲染时制造新身份，使草稿和焦点更容易丢失。
        - paragraph:
          - text: key 只在同一组兄弟中区分身份，也不会自动作为普通 prop 交给 Row。若 Row 需要 ID，仍应显式传 lesson.id。更完整的状态保留规则参见
          - link "REACT-01 的组件身份":
            - /url: /knowledge/materials/react-01-render-purity-state-snapshot.md/react-01#%E7%BB%84%E4%BB%B6%E8%BA%AB%E4%BB%BD%E5%86%B3%E5%AE%9A%E8%8D%89%E7%A8%BF%E4%BF%9D%E7%95%99%E8%BF%98%E6%98%AF%E9%87%8D%E7%BD%AE
          - text: 。
        - heading "异步回调要说明何时才算完成" [level=3]
        - paragraph: 子组件需要显示保存中和失败原因时，父层必须给它一个可以等待的结果。下面约定：Promise 完成代表保存成功，拒绝代表失败；失败时保留输入。示例只模拟本地保存。
        - text: tsx
        - button "复制代码"
        - code: "import { useId, useState, type FormEvent } from 'react'; function RenameForm({ onSave }: { onSave: (title: string) => Promise<void> }) { const id = useId(); const [title, setTitle] = useState('组件边界'); const [status, setStatus] = useState<'editing' | 'saving' | 'error' | 'saved'>('editing'); const [message, setMessage] = useState(''); async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (status === 'saving') return; setStatus('saving'); setMessage(''); try { await onSave(title.trim()); setStatus('saved'); setMessage('已保存'); } catch (error) { setStatus('error'); setMessage(error instanceof Error ? error.message : '保存失败，请重试'); } } return ( <form onSubmit={submit}> <label htmlFor={id}>资料标题</label> <input id={id} required value={title} disabled={status === 'saving'} onChange={event => { setTitle(event.target.value); setStatus('editing'); setMessage(''); }} /> <button type=\"submit\" disabled={status === 'saving'}>{status === 'saving' ? '保存中' : '保存标题'}</button> <p role=\"status\">{message}</p> </form> ); } export default function App() { const [saved, setSaved] = useState('尚未保存'); async function save(title: string) { await new Promise<void>(resolve => setTimeout(resolve, 200)); if (title.length < 2) throw new Error('标题至少需要两个字符'); setSaved(title); } return <main><h1>修改资料标题</h1><RenameForm onSave={save} /><p>已保存标题：{saved}</p></main>; }"
        - paragraph: 输入一个字符再保存，会得到错误且文本仍在；改成“组件协作”再保存，父层的已保存标题改变。等待期间禁用输入和按钮，避免这个简化场景里草稿在提交途中又发生变化。
        - paragraph:
          - text: 父层若启动异步请求却忘了 return 或 await，子层就会过早以为完成。类型写成 Promise 有助于发现签名问题，实际实现也要遵守等待关系。这个基础来自
          - link "JS-05 的异步等待边界":
            - /url: /knowledge/materials/js-05-promise-errors-async-control-flow.md/js-05#%E8%B0%83%E7%94%A8%E6%96%B9%E7%AD%89%E5%BE%85%E7%9A%84%E7%A9%B6%E7%AB%9F%E6%98%AF%E5%93%AA%E4%B8%80%E4%BB%B6%E4%BA%8B
          - text: 。跨实体切换、取消与并发保存则需要额外身份判断，不能仅凭 saving 就推断所有异步都安全。
        - heading "空态错误和只读模式也属于组件的输入" [level=3]
        - paragraph: 只有成功数据时才知道怎样渲染的组件，通常会让调用者在每个角落补条件。先确定加载中、无结果、失败、只读时分别由谁提供内容和动作，再决定 API。
        - paragraph:
          - text: 互斥模式可以用判别联合表达，参见
          - link "TS-02 的判别联合":
            - /url: /knowledge/materials/ts-02-unions-narrowing-never-exhaustiveness.md/ts-02#%E5%88%A4%E5%88%AB%E8%81%94%E5%90%88%E6%8A%8A%E4%B8%80%E4%B8%AA%E7%8A%B6%E6%80%81%E5%92%8C%E5%AE%83%E9%9C%80%E8%A6%81%E7%9A%84%E6%95%B0%E6%8D%AE%E6%94%BE%E5%9C%A8%E4%B8%80%E8%B5%B7
          - text: 。例如编辑模式要求 onSave，只读模式不提供保存操作，比 editable、hideActions、disabled 等一组可能互相冲突的布尔值更容易理解。
        - paragraph: 但也不必把请求状态全部塞进最底层行组件。父层可以负责加载或错误分支，列表专心显示已经可用的数据；也可以用前面的组合容器统一状态区域。区别在于调用者是否仍能明确控制恢复路径。
        - paragraph: 隐藏按钮只是呈现层的权限体验，实际写入仍由可信服务端授权。组件不能因为没有显示“删除”就声称数据无法被删除。
        - heading "拆分的价值是减少隐含关系" [level=3]
        - paragraph: 判断边界是否合适，可以尝试只拿组件公开的 props、回调和内容位置，解释它的行为。如果还必须知道某个路由全局变量、某个兄弟组件的私有 ref 或某段隐藏 Effect，说明依赖尚未表达完整。
        - paragraph: 组件拆小不保证不再渲染。父层变化仍可能让子组件重新计算；不要为避免一次便宜的 render 把每个标签单独包装。把临时输入放在合理的拥有者，减少冗余数据，再在确有成本时研究性能，比一开始到处 memo 更有效。
        - paragraph: 错误边界和 Suspense 也应服务于可独立恢复的用户任务，而不是每个小块都套一个 fallback。普通 Error Boundary 不会自动捕获事件处理器里的所有异步失败，保存错误仍要在相应流程处理。后续异步边界资料会展开这一点。
        - paragraph: 当公共组件被多个页面使用时，事件参数、回调完成时机、默认值、属性落点和可访问名称都是调用者依赖的行为。改了它们，应同步修改代表性用法与说明。这里的必要核对是“输入什么、操作什么、得到什么”，不是固定内部 Hook 次数或文件层级。
        - heading "参考与延伸阅读" [level=3]
        - list:
          - listitem:
            - link "React：Passing Props to a Component ↗":
              - /url: https://react.dev/learn/passing-props-to-a-component
            - text: ：查 props、默认值与 children。
          - listitem:
            - link "React：Sharing State Between Components ↗":
              - /url: https://react.dev/learn/sharing-state-between-components
            - text: ：查共同拥有者和受控组件。
          - listitem:
            - link "React：Rendering Lists ↗":
              - /url: https://react.dev/learn/rendering-lists
            - text: ：查列表 key 与稳定身份。
          - listitem:
            - link "React：useId ↗":
              - /url: https://react.dev/reference/react/useId
            - text: ：查可访问性 ID 与列表 key 的不同用途。
          - listitem:
            - link "React：Thinking in React ↗":
              - /url: https://react.dev/learn/thinking-in-react
            - text: ：继续练习从数据、状态与组件关系构建页面。
      - navigation "继续学习":
        - link "同组下一篇 → Vue 模板与表单":
          - /url: /knowledge/materials/vue-03-template-directives-events-forms.md/vue-03
          - text: 同组下一篇 →
          - strong: Vue 模板与表单
      - text: 正文阅读超过 80% 仅标记资料看完，不改变知识点状态
      - button "返回上一页 →"
    - complementary:
      - text: 知识连接
      - paragraph: 遇到疑惑时，跳到相关小节。返回后继续刚才的阅读。
      - link "REACT-01 快照属于一次渲染而不是整个组件 ↗ 每次传入的 props 和处理器都属于对应渲染，先理解快照来源。":
        - /url: /knowledge/materials/react-01-render-purity-state-snapshot.md/react-01#%E5%BF%AB%E7%85%A7%E5%B1%9E%E4%BA%8E%E4%B8%80%E6%AC%A1%E6%B8%B2%E6%9F%93%E8%80%8C%E4%B8%8D%E6%98%AF%E6%95%B4%E4%B8%AA%E7%BB%84%E4%BB%B6
        - text: REACT-01
        - strong: 快照属于一次渲染而不是整个组件 ↗
        - text: 每次传入的 props 和处理器都属于对应渲染，先理解快照来源。
      - link "VUE-04 emit 不会沿组件树自动冒泡也不能用来等待保存 ↗ 对照 Vue 事件与 React 函数回调，区分通知和可等待的结果。":
        - /url: /knowledge/materials/vue-04-typed-components-slots-model-teleport.md/vue-04#emit-%E4%B8%8D%E4%BC%9A%E6%B2%BF%E7%BB%84%E4%BB%B6%E6%A0%91%E8%87%AA%E5%8A%A8%E5%86%92%E6%B3%A1%E4%B9%9F%E4%B8%8D%E8%83%BD%E7%94%A8%E6%9D%A5%E7%AD%89%E5%BE%85%E4%BF%9D%E5%AD%98
        - text: VUE-04
        - strong: emit 不会沿组件树自动冒泡也不能用来等待保存 ↗
        - text: 对照 Vue 事件与 React 函数回调，区分通知和可等待的结果。
      - link "VUE-04 作用域插槽把子层数据交给父层排版 ↗ 比较容器提供数据、调用者决定展示的两种组合方式。":
        - /url: /knowledge/materials/vue-04-typed-components-slots-model-teleport.md/vue-04#%E4%BD%9C%E7%94%A8%E5%9F%9F%E6%8F%92%E6%A7%BD%E6%8A%8A%E5%AD%90%E5%B1%82%E6%95%B0%E6%8D%AE%E4%BA%A4%E7%BB%99%E7%88%B6%E5%B1%82%E6%8E%92%E7%89%88
        - text: VUE-04
        - strong: 作用域插槽把子层数据交给父层排版 ↗
        - text: 比较容器提供数据、调用者决定展示的两种组合方式。
      - link "REACT-03 草稿可以不同但保存前要核对基线 ↗ 组件拆分以后，用版本明确编辑草稿与已保存数据的关系。":
        - /url: /knowledge/materials/react-03-state-model-derived-controlled.md/react-03#%E8%8D%89%E7%A8%BF%E5%8F%AF%E4%BB%A5%E4%B8%8D%E5%90%8C%E4%BD%86%E4%BF%9D%E5%AD%98%E5%89%8D%E8%A6%81%E6%A0%B8%E5%AF%B9%E5%9F%BA%E7%BA%BF
        - text: REACT-03
        - strong: 草稿可以不同但保存前要核对基线 ↗
        - text: 组件拆分以后，用版本明确编辑草稿与已保存数据的关系。
- button "打开 Atlas AI 助手":
  - strong: Atlas AI
  - text: 总结 · 解释 · 查资料
```

# Test source

```ts
  1  | import { createRequire } from 'node:module';
  2  | import { join } from 'node:path';
  3  | import { expect, test } from '@playwright/test';
  4  | import { mkdir, writeFile } from 'node:fs/promises';
  5  | import { fileURLToPath } from 'node:url';
  6  | const evidence = new URL('../../../docs/auto-coding/evidence/framework-route-implementation/', import.meta.url);
  7  | test('独立方向、统一下一步、保留焦点、阅读辅助与空态', async ({ page, browser }) => {
  8  |   test.setTimeout(120_000);
  9  |   await mkdir(evidence, {recursive:true});
  10 |   await page.request.post('/api/v1/import/reset-learning-progress', {data:{}});
  11 |   const pref = (await (await page.request.get('/api/v1/learning/preferences')).json()).data;
  12 |   await page.request.put('/api/v1/learning/preferences', {data:{frameworkChoice:'UNDECIDED',expectedRevision:pref.revision}});
  13 |   await page.setViewportSize({width:1440,height:1000});
  14 |   await page.goto('/');
  15 |   const panel = page.getByRole('region', {name:'我的下一步',exact:true});
  16 |   await expect(panel).toContainText('请选择框架方向');
  17 |   await panel.getByLabel('框架方向').focus();
  18 |   await expect(panel.getByLabel('框架方向')).toBeFocused();
  19 |   await panel.getByLabel('框架方向').selectOption('REACT');
  20 |   await panel.getByRole('button',{name:'保存方向',exact:true}).click();
  21 |   await expect(panel).toContainText('补齐基础 · JS-01');
  22 |   await page.reload(); await expect(panel.getByLabel('框架方向')).toHaveValue('REACT');
  23 |   for (const url of ['/plan','/knowledge/REACT-02','/knowledge/materials/react-02-component-boundaries-data-flow-composition.md/react-02']) {
  24 |     await page.goto(url); await expect(panel).toContainText('补齐基础 · JS-01');
  25 |   }
  26 |   await expect(page.getByLabel('练习合同状态')).toContainText('筛选后编辑器');
  27 |   await expect(page.locator('[data-reader-ready="true"]')).toBeVisible();
  28 |   await expect(page.getByText('同组下一篇 →',{exact:true})).toBeVisible();
  29 |   const reading = async () => (await (await page.request.get('/api/v1/knowledge/material-progress')).json()).data.find((r:{guide:string})=>r.guide==='react-02-component-boundaries-data-flow-composition.md');
  30 |   const before = await reading();
  31 |   await panel.getByLabel('框架方向').selectOption('VUE'); await panel.getByRole('button',{name:'保存方向',exact:true}).click();
  32 |   await expect(panel).toContainText('补齐基础 · WEB-01');
  33 |   const after = await reading(); expect(after?.progressPercent ?? 0).toBeGreaterThanOrEqual(before?.progressPercent ?? 0);
  34 |   await page.screenshot({path:fileURLToPath(new URL('reader-desktop.png',evidence)),fullPage:false,animations:'disabled'});
  35 |   // 补学链接与返回；查看不会开始目标。
  36 |   await panel.getByRole('link',{name:'补齐基础 · WEB-01 →',exact:true}).click();
> 37 |   await expect(page.locator('.point-hero h1 code')).toHaveText('WEB-01');
     |                                                     ^ Error: expect(locator).toHaveText(expected) failed
  38 |   await page.goBack(); await expect(page.locator('[data-reader-ready="true"]')).toBeVisible();
  39 |   await page.request.post('/api/v1/learning/points/REACT-03/focus');
  40 |   await page.goto('/plan'); await expect(panel).toContainText('继续学习 · REACT-03'); await expect(panel).toContainText('位于其他方向');
  41 |   await page.screenshot({path:fileURLToPath(new URL('plan-desktop.png',evidence)),fullPage:false,animations:'disabled'});
  42 |   await page.setViewportSize({width:390,height:844});
  43 |   await page.screenshot({path:fileURLToPath(new URL('plan-narrow.png',evidence)),fullPage:false,animations:'disabled'});
  44 |   expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  45 |   await page.request.post('/api/v1/learning/points/REACT-03/complete');
  46 |   await page.request.post('/api/v1/learning/points/WEB-01/defer',{data:{reason:'隔离测试'}});
  47 |   await page.reload(); await expect(panel).toContainText('所需基础已暂缓');
  48 |   await panel.locator('a[href="/knowledge/WEB-01"]').first().click();
  49 |   await page.getByRole('button',{name:'恢复学习',exact:true}).click();
  50 |   await expect(page.locator('.state-row')).not.toContainText('稍后再学');
  51 |   for (const code of ['VUE-01','VUE-02','VUE-03','VUE-04','VUE-05']) await page.request.post(`/api/v1/learning/points/${code}/complete`);
  52 |   await page.goto('/plan'); await expect(panel).toContainText('所选方向的已审学习链已完成');
  53 |   expect((await (await page.request.get('/api/v1/knowledge/recommendation')).json()).data.point).toBeNull();
  54 |   await page.screenshot({path:fileURLToPath(new URL('complete-narrow.png',evidence)),fullPage:false,animations:'disabled'});
  55 |   const dataDir = process.env.CAREER_ATLAS_E2E_DATA_DIR!;
  56 |   expect(dataDir).toContain('/tmp/e2e/career-atlas-e2e-');
  57 |   const requireServer = createRequire(new URL('../../server/package.json', import.meta.url));
  58 |   const Database = requireServer('better-sqlite3');
  59 |   const db = new Database(join(dataDir, 'career-atlas.db'));
  60 |   db.prepare("INSERT INTO learning_practice_attempts (id,knowledge_point_code,activity_id,submission_md,code,execution_output,status,created_at,updated_at) VALUES ('legacy-ui','REACT-02','strict-practice','旧夹具答卷：原文保留','旧代码','旧输出','DRAFT','old','old')").run();
  61 |   db.prepare("INSERT INTO assessment_sessions (id,knowledge_point_code,assessment_type,status,duration_minutes,created_at,updated_at) VALUES ('38107d0d-8a15-4f08-95ef-19144cdd8f00','REACT-02','FIRST','IN_PROGRESS',30,'2026-11-01','2026-11-01')").run();
  62 |   db.prepare("INSERT INTO assessment_questions (id,session_id,question_type,dimension,question_content,max_score,order_index,created_at) VALUES ('38107d0d-8a15-4f08-95ef-19144cdd8f01','38107d0d-8a15-4f08-95ef-19144cdd8f00','ESSAY','practice',?,20,0,'2026-11-01')").run(JSON.stringify({question:'旧题原文保留：解释原组件行为',sourceQuestion:'旧首考题 1'}));
  63 |   db.close();
  64 |   await page.goto('/knowledge/REACT-02');
  65 |   await page.getByRole('button', {name:'在系统中开始并完成 →'}).click();
  66 |   await page.getByText('历史练习 · framework-foundation-legacy · 只读证据',{exact:true}).click();
  67 |   await expect(page.locator('.practice-workspace')).toContainText('旧夹具答卷：原文保留');
  68 |   await page.screenshot({path:fileURLToPath(new URL('legacy-practice-narrow.png',evidence)),fullPage:false,animations:'disabled'});
  69 |   const legacy = (await (await page.request.get('/api/v1/assessments/38107d0d-8a15-4f08-95ef-19144cdd8f00')).json()).data;
  70 |   expect(JSON.stringify(legacy)).toContain('旧题原文保留');
  71 |   await page.goto('/assessment/38107d0d-8a15-4f08-95ef-19144cdd8f00');
  72 |   const oldQuestion = page.getByText('旧题原文保留：解释原组件行为', {exact:true});
  73 |   await oldQuestion.scrollIntoViewIfNeeded();
  74 |   await expect(oldQuestion).toBeVisible();
  75 |   await page.screenshot({path:fileURLToPath(new URL('legacy-challenge-narrow.png',evidence)),fullPage:false,animations:'disabled'});
  76 |   await writeFile(new URL('pages.json',evidence),JSON.stringify({time:new Date().toISOString(),browser:browser.version(),viewports:[{width:1440,height:1000},{width:390,height:844}],baseURL:'http://127.0.0.1:42731',paths:['/','/plan','/knowledge/REACT-02','/knowledge/WEB-01','/assessment/38107d0d-8a15-4f08-95ef-19144cdd8f00','/knowledge/materials/react-02-component-boundaries-data-flow-composition.md/react-02'],checks:['选择刷新持久化','各入口下一步一致','切换保留焦点','阅读进度不清零','补学返回','暂缓恢复','链完成无兜底','键盘焦点','窄屏无横向溢出','旧练习只读','旧挑战原题读取']},null,2));
  77 | });
  78 | 
```