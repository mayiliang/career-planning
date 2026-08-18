# 03 React 原理、状态、Hooks、路由与性能

所有“通过”均需满足[统一考核规则](00-assessment-rules.md)。考核使用函数组件，要求能说明 React 代码背后的状态模型，而不只是记 API。

### 渲染与组件边界

## REACT-01 渲染、组件纯度与 state snapshot

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Render and Commit](https://zh-hans.react.dev/learn/render-and-commit)、[State as a Snapshot](https://zh-hans.react.dev/learn/state-as-a-snapshot)、[Keeping Components Pure](https://zh-hans.react.dev/learn/keeping-components-pure)。覆盖范围：render/commit 两阶段、组件纯度、state snapshot、批处理、Strict Mode 和更新触发；覆盖闭包读到旧快照、渲染副作用与可中断渲染边界。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《Render and Commit》《State as a Snapshot》《Keeping Components Pure》，逐篇定位 render/commit、snapshot 与纯度反例的章节或关键词；首考题 2（机制解释）：以连续三次 `setCount(count + 1)`、函数更新和父组件重渲染为例，按“事件处理器读 snapshot→更新入队→下一次 render→commit”解释值式/函数更新差异，并说明 render 内 `Date.now()` 破坏纯度的因果；首考题 3（最小产出）：固定 fixture 为按钮在一次事件中点击三次、随后两个 0ms 回调各更新一次，子组件在 render 中调用 `Date.now()`；编写最小组件与测试，交付每步 count、render/commit 日志、移除副作用后的代码及前后对比；用断言验证同步点击得到 1/3 的差异、异步回调按各自 snapshot 行为执行，且重复渲染不改变输出；首考题 4（受限排错）：给定日志“`click x3 => count: 1`，Strict Mode 第二次 render 的时间文本不同”，仅在“值式更新/函数更新”“异步闭包快照”“render 内 `Date.now()`”三个候选中排查；提交最小复现、两项被证伪候选、根因与修复，并以三次点击、两个回调和 Strict Mode 重渲染回归；首考题 5（学习复述）：3 分钟解释 state 为何是 snapshot、何时必须用函数更新，并说明纯组件不能在 render 改变什么。复测变式：仅将题 3 的两个回调延迟从同为 0ms 改为 20ms/40ms，保留三次点击、更新函数和 `Date.now()` 处理；预期两个回调仍各按其创建时 snapshot 入队，提交新的时间序列、实际 count 与断言日志。命题边界：只在「渲染、组件纯度与 state snapshot」列出的资料、fixture 和可复核产出内评分；英文资料不得作为独立首考题源。
- 通过标准：提交源码、三组断言、render/commit 日志和修复前后对比证据；状态序列、纯度解释与资料定位均可复核。否决项：只给最终 count、在 render 中保留副作用、未证伪候选或用资料外经验替代日志。评估边界：仅评估本题固定更新序列、纯度问题和列出资料的机制，不评估业务状态管理方案。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## REACT-02 组件边界、数据流与组合

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Thinking in React](https://zh-hans.react.dev/learn/thinking-in-react)、[Passing Props（含 children 组合小节）](https://zh-hans.react.dev/learn/passing-props-to-a-component)。覆盖范围：组件职责、props 单向流、children/slot 式组合、状态提升和边界拆分；覆盖布尔参数爆炸、跨层透传、实现泄漏与可访问语义。
- 严格考核：挑战类型：DESIGN_CASE；首考题 1（资料定位）：只允许使用《Thinking in React》《Passing Props（含 children 组合小节）》，定位状态提升、单向数据流与 children 组合对应章节；首考题 2（机制解释）：以订单筛选、列表和编辑器为例，按“筛选事件→父层状态→列表派生→编辑器有效性→保存事件上行”说明状态最小所有者、props 契约与 children 组合边界；首考题 3（最小产出）：固定 fixture 为列表 `[A{id:1}, B{id:2}]`、`selectedId=1`、筛掉 A 后保存编辑器；交付组件树、每个组件的 props/事件契约、一份 children 组合实现和交互测试，验证筛选后编辑器关闭或切换而非保存已消失记录；首考题 4（受限排错）：给定失败日志“筛选掉 A 后编辑器仍提交 A”，仅比较“selectedId 放在编辑器内部”“列表 key 复用”“父层未向下传递筛选结果”三个候选；交付复现、至少两项证伪记录、根因、最小修复和筛选/切换 B/保存回归；首考题 5（学习复述）：3 分钟说明何时以 children 组合代替继续透传 props，以及共享状态最小放置点的判断。复测变式：仅将题 3 的“单一 `selectedId`”改为 `openIds=[1,2]`，保留列表、筛选和保存契约；预期筛掉 A 只关闭 A 面板、B 仍可保存，提交新的组件树、A/B 交互断言与 props 流向记录。命题边界：只在「组件边界、数据流与组合」资料、固定列表和交付物内评分；英文资料不得作为独立首考题源。
- 通过标准：组件树、props 契约、组合实现和三条交互证据完整；数据只沿声明方向流动，筛选后不存在悬挂编辑对象。否决项：按视觉块机械拆分、以全局状态掩盖边界、无证伪记录或 props 泄漏页面私有细节。评估边界：仅评估该订单 fixture 的组件边界和数据流，不评估通用架构选型。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

### 状态、副作用与逻辑复用

## REACT-03 状态建模、派生状态与受控模式

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Choosing the State Structure](https://zh-hans.react.dev/learn/choosing-the-state-structure)、[Sharing State](https://zh-hans.react.dev/learn/sharing-state-between-components)、[Preserving and Resetting State](https://zh-hans.react.dev/learn/preserving-and-resetting-state)。覆盖范围：状态归一化、派生状态、单一所有者、受控模式、key 重置与状态保存边界；覆盖重复状态、镜像 props、对象切换和重置错误。Actions、乐观提交和 React 19.2 新能力统一归 `REACT-09`。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《Choosing the State Structure》《Sharing State》《Preserving and Resetting State》，定位冗余状态、状态提升与 key 重置依据；首考题 2（机制解释）：以价格、数量、总额和草稿为例，按“受控输入→源状态→render 中派生 total→key 改变时状态重置”区分状态所有权与可计算派生值；首考题 3（最小产出）：固定 fixture 为价格 10、数量 2、草稿“x”，服务端随后刷新价格 12；实现受控表单，交付状态模型、`total=price*quantity` 的计算代码、以 key 切换对象的测试和更新记录，断言总额由 20 更新为 24 且新对象不带旧草稿；首考题 4（受限排错）：给定失败现象“价格刷新为 12，界面总额仍为 20，切换记录带出旧草稿”，仅排查“total 被缓存为 state”“Effect 同步 total”“输入所有权/key 未改变”三个候选；提交复现、逐项证伪、根因、最小修复和刷新价格/切换对象/提交回归；首考题 5（学习复述）：3 分钟说明为何 Effect 不应同步可计算总额，以及草稿何时才需持久化。复测变式：仅将题 3 的数量从 `2` 改为非法空字符串，保留价格刷新、草稿和 key 切换；预期显示空值且提交被阻止而非默认为 0，提交新的 DOM/提交 payload 断言。命题边界：只在「状态建模、派生状态与受控模式」资料和指定表单状态内评分；英文资料不得作为独立首考题源。
- 通过标准：状态图、表单源码、三组断言和更新记录可复核；无重复 total，切换对象不串草稿。否决项：用 Effect 回写可计算总额、把空字符串静默当 0、未区分输入所有权或未提供候选证伪。评估边界：仅评估此 fixture 的客户端状态建模，不评估服务端缓存策略。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## REACT-04 Effect、外部同步与清理

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Synchronizing with Effects](https://zh-hans.react.dev/learn/synchronizing-with-effects)、[Lifecycle of Reactive Effects](https://zh-hans.react.dev/learn/lifecycle-of-reactive-effects)、[You Might Not Need an Effect](https://zh-hans.react.dev/learn/you-might-not-need-an-effect)。覆盖范围：Effect 作为外部系统同步、依赖集合、闭包、清理、竞态与取消；区分事件逻辑、派生计算、订阅和无需 Effect 的场景。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《Synchronizing with Effects》《Lifecycle of Reactive Effects》《You Might Not Need an Effect》，定位 setup/cleanup、响应式依赖与无需 Effect 的章节；首考题 2（机制解释）：以 `roomId=A→B`、A 延迟 300ms 关闭为例，按“依赖变更→旧 cleanup→新 setup→回调是否仍有效→卸载 cleanup”画出连接时序；首考题 3（最小产出）：固定 fixture 为先连接 A、50ms 切 B、100ms 卸载，A 在 300ms 才发消息、B 在 80ms 成功连接；实现同步 hook，交付 setup/cleanup 日志、取消或忽略旧消息的测试、DOM 快照和从 8 个候选 Effect 中删除至少一个纯计算 Effect 的理由；断言卸载后无 setState、A 不能覆盖 B；首考题 4（受限排错）：给定日志“`unmount; A message; setState`”，仅比较“缺 cleanup”“依赖遗漏导致旧连接”“未取消/忽略回调”“订阅未注销”四个候选；提交时间线、至少两项证伪、根因、修复和 A→B/卸载/B 失败回归；首考题 5（学习复述）：3 分钟解释 Effect 为何不做纯计算，以及 Strict Mode 重放能暴露的同步问题。复测变式：仅将题 3 的 B 连接结果从 80ms 成功改为立即失败，保留 A 的时序、切换和卸载；预期错误态只属于 B、A 消息仍不得写入，提交新的 cleanup/错误状态时间线与断言。命题边界：只评估「Effect、外部同步与清理」资料、给定连接序列及可复核证据；英文资料不得作为独立首考题源。
- 通过标准：提交 hook、日志、DOM 快照、清理/失败三组回归和资料定位；每个外部同步有对称清理。否决项：关闭 lint 代替依赖推导、卸载后仍写状态、用最终截图替代时间线或未证伪候选。评估边界：不评估真实聊天服务实现，仅评估固定连接 fixture。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## REACT-05 Hooks 规则与自定义 Hook

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Reusing Logic with Custom Hooks](https://zh-hans.react.dev/learn/reusing-logic-with-custom-hooks)、[Rules of Hooks](https://zh-hans.react.dev/reference/rules/rules-of-hooks)。覆盖范围：Hook 调用顺序、闭包依赖、自定义 Hook 契约和逻辑复用；覆盖条件调用、隐式生命周期、返回值稳定性、测试、迁移和普通函数回退边界。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《Reusing Logic with Custom Hooks》《Rules of Hooks》，定位调用顺序、不应条件调用和自定义 Hook 契约；首考题 2（机制解释）：以 `useDebouncedSearch` 按“每次 render 相同 Hook 顺序→输入参数变化→旧 timer cleanup→新 timer→结果返回”说明参数/返回值和生命周期隐藏边界；首考题 3（最小产出）：固定输入为依次键入 `a`、50ms 后 `ab`，delay 300ms，250ms 卸载；实现 `useDebouncedSearch` 与调用组件，交付调用序列、取消日志、测试和五段 Hook 规则审查；断言只发出 `ab`、卸载后无结果写入、hook API 不包含权限决策；首考题 4（受限排错）：给定错误“条件调用 Hook 后下一次渲染状态错位，卸载后仍收到搜索结果”，仅排查“条件调用”“依赖数组遗漏”“timer cleanup 缺失”“普通函数被误写为 Hook”四个候选；提交最小复现、排除记录、根因、修复与条件切换/快速输入/卸载回归；首考题 5（学习复述）：3 分钟说明普通函数何时优于 Hook，以及为什么 Hook 不应隐藏权限决定。复测变式：仅将 delay 从 300ms 改为 0，保留 `a→ab`、50ms 间隔和 250ms 卸载；预期两个输入各按 0ms 定时规则产生记录但卸载后无写入，提交新的调用时间戳与取消断言。命题边界：仅在「Hooks 规则与自定义 Hook」资料、指定输入和测试内评分；英文资料不得作为独立首考题源。
- 通过标准：hook 源码、调用组件、取消日志、三组测试和审查表可复核；调用顺序固定、API 意图明确。否决项：条件调用 Hook、以延时掩盖泄漏、把权限决定藏入通用 Hook 或未提交证伪记录。评估边界：不评估完整搜索后端，只评估 Hook 规则与此 debounce 生命周期。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## REACT-06 Reducer、Context 与跨组件状态

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Extracting State Logic into a Reducer](https://zh-hans.react.dev/learn/extracting-state-logic-into-a-reducer)、[Scaling Up with Reducer and Context](https://zh-hans.react.dev/learn/scaling-up-with-reducer-and-context)、[中文补充讲义：REACT-06](../chinese-guides/content-audit-01-03.md#react-06)。覆盖范围：Reducer 状态转移、Context 广播、Provider 边界、状态域拆分与更新范围；外部 store、选择器和服务端缓存只作选型边界，不作为本点实现题。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《Extracting State Logic into a Reducer》《Scaling Up with Reducer and Context》《中文补充讲义：REACT-06》，定位 reducer 纯度、Provider 更新与讲义转换表；首考题 2（机制解释）：按“action→纯 reducer→Provider value→读消费者 render→写消费者 dispatch”画出 `SUBMIT→APPROVE/REJECT` 状态转换与渲染传播；首考题 3（最小产出）：固定 fixture 为审核单初态 `draft`，允许 `SUBMIT→pending→APPROVED|REJECTED`，非法 `draft→APPROVED`；按单一转换表实现 reducer、读/写 Context 与表驱动测试，交付状态表、源码、非法跃迁断言、只读摘要的 Profiler 前后证据；首考题 4（受限排错）：给定失败现象“无关 `theme` 更新使全部审核摘要重渲染，且 `draft→APPROVED` 被错误接受”，仅排查“reducer 允许非法跃迁”“Provider value 身份变化”“读写 Context 未拆分”“卸载后异步 dispatch”四个候选；交付 profiler/测试证据、排除项、根因、修复和无关更新/非法 action/卸载回归；首考题 5（学习复述）：3 分钟说明 Context、外部 store 与服务端缓存的职责边界。复测变式：仅将 Provider 的无关 `theme` 从 light 改为 dark，保留审核 action 与消费者树；预期审核状态不变且只读摘要渲染次数不增加，提交新的 Profiler commit 记录和状态表断言。命题边界：不得把 Context 当选择器或权限系统；仅评估列出资料、转换表与 fixture。
- 通过标准：状态表、reducer 测试、Context 分层与 Profiler 证据齐全；非法跃迁被拒绝，非相关更新不扩大消费者渲染。否决项：reducer 内副作用、把所有状态塞入单一 Context、未排除候选或无转换/渲染证据。评估边界：不评估第三方状态库实现，仅评估 reducer/Context 的本点职责。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

### 性能与可恢复体验

## REACT-07 性能测量、memo 与大列表

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[React Profiler](https://zh-hans.react.dev/reference/react/Profiler)、[`memo`](https://zh-hans.react.dev/reference/react/memo)、[`useMemo`](https://zh-hans.react.dev/reference/react/useMemo)、[`useCallback`](https://zh-hans.react.dev/reference/react/useCallback)、[中文补充讲义：REACT-07](../chinese-guides/content-audit-01-03.md#react-07)。覆盖范围：Profiler、React DevTools、引用稳定性、`memo`/`useMemo`/`useCallback`、大列表的渲染预算与虚拟化选型；坚持先测量再优化并覆盖缓存失效成本。本点负责手工性能诊断与基线，Compiler 的启用、迁移和验证统一归 `REACT-09`。
- 严格考核：挑战类型：TOOL_OPERATION；首考题 1（资料定位）：只允许使用《React Profiler》《`memo`》《`useMemo`》《`useCallback`》《中文补充讲义：REACT-07》，定位提交时间、缓存失效、虚拟化与反证实验章节；首考题 2（机制解释）：按“筛选输入→props 身份→组件 render→commit→键盘焦点恢复”区分 React commit 耗时、用户交互延迟与网络等待，并解释 memo 仅在 props 稳定时有效；首考题 3（最小产出）：固定 fixture 为 10,000 行、同一筛选脚本执行三次、每行可键盘聚焦；用 Profiler 提交三次 commit 记录、中位数、离群原因与一个明确瓶颈的优化或“不优化”结论；若采用 memo/窗口化，交付删除该优化后的反证测量及键盘焦点检查录像；首考题 4（受限排错）：给定记录“加 `memo` 后 commit 未降、滚动后焦点跳到错误行、网络慢 2s”，仅排查“props 每次新建”“key 错误”“窗口化焦点管理”“把网络等待归因 React”四个候选；交付 profiler、两项证伪、根因、修复和筛选/键盘/离线网络回归；首考题 5（学习复述）：说明何时不使用 memo 或虚拟化。复测变式：仅将固定行数从 10,000 改为 100，保留筛选脚本、浏览器条件和键盘焦点路径；预期用同一三次测量证明优化应撤销或保留，提交新的中位数、删除反证和焦点录像。命题边界：比较必须使用同一脚本、数据集和浏览器条件；仅评估本点工具证据。
- 通过标准：提交三轮测量、脚本、Profiler 轨迹、反证记录和焦点证据；结论由指标支持，至少改善明确指标 30% 或可证明无需优化。否决项：只报一次数据、无对照直接加 memo、把网络问题归因 React、虚拟化破坏键盘焦点。评估边界：不评估服务端性能，只评估给定列表的 React 渲染与交互证据。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## REACT-08 错误边界、异步 UI 与可恢复体验

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文补充讲义：REACT-08](../chinese-guides/content-audit-01-03.md#react-08)、[Error Boundary](https://zh-hans.react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)、[`Suspense`](https://zh-hans.react.dev/reference/react/Suspense)、[React `use`](https://zh-hans.react.dev/reference/react/use)、[TanStack Query Suspense](https://tanstack.com/query/latest/docs/framework/react/guides/suspense)（英文原文，仅用于版本核验）。TanStack Query 英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：渲染错误、异步数据、Suspense 边界、错误恢复、重试、取消和框架数据源集成；同时明确 Effect 内普通请求不会自动触发 Suspense。移除中文核心讲义：其摘要未提供资源协议、局部恢复、失败注入或反证验收。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《中文补充讲义：REACT-08》《Error Boundary》《`Suspense`》《React `use`》，定位渲染错误、Promise、局部恢复与 Effect 请求限制；首考题 2（机制解释）：按“资源读取 Promise→Suspense fallback/错误边界→重试缓存键→局部恢复”解释链路，并说明 Effect 请求的错误为何不会自动进入该链路；首考题 3（最小产出）：固定 fixture 为订单页输入框已填“note”、左侧数据抛渲染异常、右侧接口 500、第三段请求被取消；实现加载、空、错误、无权限、部分失败与重试边界，交付状态图、运行页、三种失败注入记录和恢复后的输入快照；断言左侧失败不卸载右侧、取消不显示错误、重试不丢 `note`；首考题 4（受限排错）：给定日志“点击重试后请求持续递增，Effect 请求只显示 loading，错误边界未出现”，仅排查“重试依赖循环”“Promise 缓存键变化”“在 Effect 中请求”“错误发生于事件处理”四个候选；交付复现、候选证伪、根因、修复和渲染错误/500/取消/重试回归；首考题 5（学习复述）：比较框架集成数据源与 Effect 请求的适用边界。复测变式：仅将右侧请求结果从 500 改为取消，保留左侧渲染异常、输入 “note” 与边界结构；预期取消不显示错误、左侧仍隔离、输入保留，提交新的 DOM 快照和取消/恢复断言。命题边界：答案必须回指列出的中文资料和给定失败 fixture；TanStack Query 英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：状态图、失败注入、DOM 快照、恢复断言和资料定位可复核；错误隔离与输入保留符合 fixture。否决项：把所有失败吞为 loading、让局部失败卸载整页、取消显示错误、无候选证伪或恢复丢输入。评估边界：仅评估渲染/异步 UI 的边界，不评估后端重试策略。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

### 编译优化、服务端边界与路由

## REACT-09 React Compiler、服务端组件边界与安全升级

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文补充讲义：REACT-09](../chinese-guides/content-audit-01-03.md#react-09)、[React 19.2](https://zh-hans.react.dev/blog/2025/10/01/react-19-2)、[React Compiler v1.0](https://zh-hans.react.dev/blog/2025/10/07/react-compiler-1)、[RSC 远程代码执行安全公告](https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components)（英文原文，仅用于版本核验）、[RSC 拒绝服务与源码暴露跟进公告](https://react.dev/blog/2025/12/11/denial-of-service-and-source-code-exposure-in-react-server-components)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：React 19.2 的 `Activity`、`useEffectEvent`、`cacheSignal`、Performance Tracks、Partial Pre-rendering 与 resume API；React Compiler 的稳定启用、lint、增量迁移与手工 memo 取舍；Actions/Form Actions、`useActionState`、`useOptimistic` 作为 React 19 迁移背景；RSC/Server Function 的序列化、授权、依赖树核验和连续安全公告响应；覆盖框架支持差异、不完整早期补丁、升级、灰度和回退。移除 React 历史版本总览：其正文主要是版本索引与档案，不能作为当前机制的主题资料。
- 严格考核：挑战类型：TOOL_OPERATION；首考题 1（资料定位）：只允许使用《中文补充讲义：REACT-09》《React 19.2》《React Compiler v1.0》，定位 Compiler 配置、手工 memo、Activity、服务端输入安全与连续补丁核验依据；首考题 2（机制解释）：按“编译配置→组件变换→props 比较→commit 轨迹”与“client 输入→Server Function→会话再校验→允许/拒绝→依赖补丁核验”两条链路说明优化和信任边界；首考题 3（最小产出）：固定 fixture 为 1,000 行列表、一个 props 依赖不完整的手工 memo、Server Function 输入 `{role:'admin', userId:'u2'}` 和一份含 RSC 传输包的锁文件；启用 Compiler，交付构建/lint/运行版本记录、Performance Tracks 前后比较、删除 memo 的反证、Activity 切换记录、实际依赖树/锁文件与公告受影响范围对照，以及服务端按会话重新校验 role 的审计结论；以筛选结果、活动状态、拒绝伪造 role、无受影响 RSC 传输包的断言验证；首考题 4（受限排错）：给定现象“Compiler 已启用但切换筛选后 props 不更新，Server Function 接受 client role，顶层 React 已升级但锁文件仍含早期不完整补丁”，仅排查“Compiler 未生效/版本不配”“memo 依赖遗漏”“服务端信任客户端输入”“实际 RSC 传输依赖未修补”四个候选；提交轨迹、依赖树或日志、逐项证伪、根因、修复和筛选/10 行/伪造 role/供应链扫描回归；首考题 5（学习复述）：3 分钟解释 Server Component 为何不是授权边界、为何不能只看顶层 `react` 版本，以及何时保留手工 memo。复测变式：仅将 Server Function 的 client 输入从 `{role:'admin', userId:'u2'}` 改为 `{role:'viewer', userId:'u2'}`，保留 1,000 行列表、Compiler、锁文件与会话中的真实角色；预期服务端依真实会话而非 client role 决定允许/拒绝，依赖核验结论不变；提交新的请求/审计日志、授权断言和依赖扫描摘要。命题边界：只在「React 19.2、Compiler 与服务端边界安全」中文资料、固定工具记录和输入内评分；英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：配置、实际依赖树与锁文件、公告版本对照、Compiler 轨迹、反证与服务端再校验记录完整；行为不回归且伪造 role 被拒绝。否决项：只看配置不核对已安装版本、将 Server Component 当授权、无前后对照、没有安全候选证伪或回滚说明。评估边界：不评估完整部署，仅评估 fixture 中的 Compiler、RSC 依赖与信任边界。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## REACT-10 React 路由、数据路由与框架模式

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文补充讲义：REACT-10](../chinese-guides/content-audit-01-03.md#react-10)、[React 创建应用](https://react.dev/learn/creating-a-react-app)（英文原文，仅用于版本核验）、[React Router 模式选择](https://reactrouter.com/start/modes)（英文原文，仅用于版本核验）、[React Router Routing](https://reactrouter.com/start/data/routing)（英文原文，仅用于版本核验）、[React Router Data Loading](https://reactrouter.com/start/data/data-loading)（英文原文，仅用于版本核验）、[React Router Actions](https://reactrouter.com/start/data/actions)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：URL 与历史记录、嵌套/参数路由、链接与导航、Route Module、`loader`/`clientLoader`、`action`/`clientAction`、`Form`/`fetcher`、pending/error/revalidation、代码分割、鉴权可见性、SSR/SPA/静态模式，以及 Declarative/Data/Framework 三种模式的控制权和迁移边界；服务端授权与通用 Server State 缓存分别归 BIZ-03 和 DATA-01/02。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《中文补充讲义：REACT-10》，定位路由匹配、loader/action、重验证和错误边界章节；首考题 2（机制解释）：按“导航→路由匹配→并行 loader→render→action 提交→revalidation→局部错误恢复”画时序，并比较声明式、数据路由和框架模式；首考题 3（最小产出）：固定 fixture 为 `/products/7/orders/42`、`/products/7/orders/not-number`、未保存备注“draft”、loader A 300ms 与紧随导航 B 50ms；实现嵌套布局、参数校验、懒加载、loader/action、并发导航、局部错误边界和阻止导航，交付路由表、运行页、五步验收脚本及地址/网络/DOM 记录；断言深链刷新可用、非法参数进入局部错误、B 不被 A 覆盖、取消导航保留备注；首考题 4（受限排错）：给定失败日志“提交后 loader 重复请求、后退显示 A 的陈旧页面、未登录仍进入 action”，仅排查“loader revalidation 配置”“导航 abort/竞争”“重定向循环”“客户端路由当授权”四个候选；交付请求时间线、逐项证伪、根因、修复和刷新/后退/取消/未授权回归；首考题 5（学习复述）：说明何时只用声明式路由、何时采用数据路由、何时进入框架模式。复测变式：仅将深链路径从 `/products/7/orders/42` 改为 `/products/7/orders/404`，保留备注 “draft”、A/B loader 时序和路由结构；预期只出现局部资源错误、布局和备注保留且 B 不被 A 覆盖，提交新的地址/网络/DOM 记录。命题边界：路由层不得替代服务端授权或把组件通用缓存包装成路由职责；英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：路由表、五步脚本、地址/网络/DOM 证据、候选证伪和模式取舍记录可复核；深链、刷新、前进后退、404 与并发导航均符合 fixture。否决项：仅配置路径表、客户端隐藏页面代替授权、无导航时间线或未保存状态丢失。评估边界：仅评估给定产品/订单路由 fixture，不评估服务端授权实现本身。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## 领域综合考核

- [ ] 已通过领域综合考核
- 任务：实现一个带查询、分页、详情编辑、并发请求取消和 10000 行虚拟列表的 React 管理页面，包含错误恢复、可访问性和性能报告。
- 通过标准：6 小时内完成；组件测试覆盖关键行为；无 Effect 竞态；Profiler 有前后证据；现场随机改变需求后能在 30 分钟内安全调整状态模型。评估边界：领域综合考核只依据本领域列出的资料、题目输入和可复核产出；不得用资料外经验替代跨知识点整合证据。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟
