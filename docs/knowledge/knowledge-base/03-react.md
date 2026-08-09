# 03 React 原理、状态、Hooks、路由与性能

所有“通过”均需满足[统一考核规则](00-assessment-rules.md)。考核使用函数组件，要求能说明 React 代码背后的状态模型，而不只是记 API。

### 渲染与组件边界

## REACT-01 渲染、组件纯度与 state snapshot

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Render and Commit](https://zh-hans.react.dev/learn/render-and-commit)、[State as a Snapshot](https://zh-hans.react.dev/learn/state-as-a-snapshot)、[Keeping Components Pure](https://zh-hans.react.dev/learn/keeping-components-pure)。覆盖范围：render/commit 两阶段、组件纯度、state snapshot、批处理、Strict Mode 和更新触发；覆盖闭包读到旧快照、渲染副作用与可中断渲染边界。
- 严格考核：首考题 1（资料定位）：只允许使用《Render and Commit》《State as a Snapshot》《Keeping Components Pure》，分别摘出能支撑「渲染、组件纯度与 state snapshot」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：闭卷解释「渲染、组件纯度与 state snapshot」覆盖的输入、状态转换、运行边界与失败传播，并用首考题 3 的产出证明机制选择；首考题 3（最小产出）：闭卷预测批量更新、事件处理和异步回调中的状态；修复渲染期副作用；画出一次更新的 render/commit 流程；首考题 4（受限排错）：围绕「渲染、组件纯度与 state snapshot」的首考题 3 产出注入正常、边界和失败场景，提交预期/实际、三项资料假设、证伪证据、根因、修复与回归；首考题 5（学习复述）：3 分钟说明「渲染、组件纯度与 state snapshot」解决的问题、运行机制、选型条件、反例和验证证据，并回答边界变化追问。命题边界：只在「渲染、组件纯度与 state snapshot」所列资料和覆盖范围内命题；资料外经验不能替代题目要求的机制与证据。
- 通过标准：10 道输出题至少 9 题正确；能解释闭包快照、批处理、纯度和 Strict Mode 暴露问题的原因。评估边界：缺少与「渲染、组件纯度与 state snapshot」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## REACT-02 组件边界、数据流与组合

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Thinking in React](https://zh-hans.react.dev/learn/thinking-in-react)、[Passing Props（含 children 组合小节）](https://zh-hans.react.dev/learn/passing-props-to-a-component)。覆盖范围：组件职责、props 单向流、children/slot 式组合、状态提升和边界拆分；覆盖布尔参数爆炸、跨层透传、实现泄漏与可访问语义。
- 严格考核：首考题 1（资料定位）：只允许使用《Thinking in React》《Passing Props（含 children 组合小节）》，分别摘出能支撑「组件边界、数据流与组合」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：闭卷解释「组件边界、数据流与组合」覆盖的输入、状态转换、运行边界与失败传播，并用首考题 3 的产出证明机制选择；首考题 3（最小产出）：把一个 500 行业务页面拆分为组件树；标注状态所有者、稳定接口和不应抽象部分；实现同一能力的组合式 API；首考题 4（受限排错）：围绕「组件边界、数据流与组合」的首考题 3 产出注入正常、边界和失败场景，提交预期/实际、三项资料假设、证伪证据、根因、修复与回归；首考题 5（学习复述）：3 分钟说明「组件边界、数据流与组合」解决的问题、运行机制、选型条件、反例和验证证据，并回答边界变化追问。命题边界：只在「组件边界、数据流与组合」所列资料和覆盖范围内命题；资料外经验不能替代题目要求的机制与证据。
- 通过标准：拆分不是按视觉块机械切割；依赖方向清晰；Props 不泄漏页面内部细节；能解释过度抽象成本。评估边界：缺少与「组件边界、数据流与组合」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

### 状态、副作用与逻辑复用

## REACT-03 状态建模、派生状态与受控模式

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Choosing the State Structure](https://zh-hans.react.dev/learn/choosing-the-state-structure)、[Sharing State](https://zh-hans.react.dev/learn/sharing-state-between-components)、[Preserving and Resetting State](https://zh-hans.react.dev/learn/preserving-and-resetting-state)。覆盖范围：状态归一化、派生状态、单一所有者、受控模式、key 重置与状态保存边界；覆盖重复状态、镜像 props、对象切换和重置错误。Actions、乐观提交和 React 19.2 新能力统一归 `REACT-09`。
- 严格考核：首考题 1（资料定位）：只允许使用《Choosing the State Structure》《Sharing State》《Preserving and Resetting State》，分别摘出能支撑「状态建模、派生状态与受控模式」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：闭卷解释「状态建模、派生状态与受控模式」覆盖的输入、状态转换、运行边界与失败传播，并用首考题 3 的产出证明机制选择；首考题 3（最小产出）：重构一个存在重复/矛盾状态的表单或列表；实现受控与非受控切换策略；用 `key` 正确控制状态重置；首考题 4（受限排错）：围绕「状态建模、派生状态与受控模式」的首考题 3 产出注入正常、边界和失败场景，提交预期/实际、三项资料假设、证伪证据、根因、修复与回归；首考题 5（学习复述）：3 分钟说明「状态建模、派生状态与受控模式」解决的问题、运行机制、选型条件、反例和验证证据，并回答边界变化追问。命题边界：只在「状态建模、派生状态与受控模式」所列资料和覆盖范围内命题；资料外经验不能替代题目要求的机制与证据。
- 通过标准：消除可派生和重复状态；切换对象不会串数据；能说明状态局部化、提升和服务端状态的边界。评估边界：缺少与「状态建模、派生状态与受控模式」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## REACT-04 Effect、外部同步与清理

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Synchronizing with Effects](https://zh-hans.react.dev/learn/synchronizing-with-effects)、[Lifecycle of Reactive Effects](https://zh-hans.react.dev/learn/lifecycle-of-reactive-effects)、[You Might Not Need an Effect](https://zh-hans.react.dev/learn/you-might-not-need-an-effect)。覆盖范围：Effect 作为外部系统同步、依赖集合、闭包、清理、竞态与取消；区分事件逻辑、派生计算、订阅和无需 Effect 的场景。
- 严格考核：首考题 1（资料定位）：只允许使用《Synchronizing with Effects》《Lifecycle of Reactive Effects》《You Might Not Need an Effect》，分别摘出能支撑「Effect、外部同步与清理」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：闭卷解释「Effect、外部同步与清理」覆盖的输入、状态转换、运行边界与失败传播，并用首考题 3 的产出证明机制选择；首考题 3（最小产出）：从 8 个 Effect 中删除不必要项；修复重复请求、旧闭包、竞态和订阅泄漏；解释依赖数组而不是关闭 lint；首考题 4（受限排错）：围绕「Effect、外部同步与清理」的首考题 3 产出注入正常、边界和失败场景，提交预期/实际、三项资料假设、证伪证据、根因、修复与回归；首考题 5（学习复述）：3 分钟说明「Effect、外部同步与清理」解决的问题、运行机制、选型条件、反例和验证证据，并回答边界变化追问。命题边界：只在「Effect、外部同步与清理」所列资料和覆盖范围内命题；资料外经验不能替代题目要求的机制与证据。
- 通过标准：所有外部同步都有对称清理；快速切换参数不出现旧结果覆盖；能从响应式值推导完整依赖。评估边界：缺少与「Effect、外部同步与清理」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## REACT-05 Hooks 规则与自定义 Hook

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Reusing Logic with Custom Hooks](https://zh-hans.react.dev/learn/reusing-logic-with-custom-hooks)、[Rules of Hooks](https://zh-hans.react.dev/reference/rules/rules-of-hooks)。覆盖范围：Hook 调用顺序、闭包依赖、自定义 Hook 契约和逻辑复用；覆盖条件调用、隐式生命周期、返回值稳定性、测试、迁移和普通函数回退边界。
- 严格考核：首考题 1（资料定位）：只允许使用《Reusing Logic with Custom Hooks》《Rules of Hooks》，分别摘出能支撑「Hooks 规则与自定义 Hook」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：闭卷解释「Hooks 规则与自定义 Hook」覆盖的输入、状态转换、运行边界与失败传播，并用首考题 3 的产出证明机制选择；首考题 3（最小产出）：实现请求、权限或 SDK 生命周期 Hook；提供取消、重试、卸载和依赖变化测试；审查 5 个违反 Hook 规则或抽象不当的例子；首考题 4（受限排错）：围绕「Hooks 规则与自定义 Hook」的首考题 3 产出注入正常、边界和失败场景，提交预期/实际、三项资料假设、证伪证据、根因、修复与回归；首考题 5（学习复述）：3 分钟说明「Hooks 规则与自定义 Hook」解决的问题、运行机制、选型条件、反例和验证证据，并回答边界变化追问。命题边界：只在「Hooks 规则与自定义 Hook」所列资料和覆盖范围内命题；资料外经验不能替代题目要求的机制与证据。
- 通过标准：Hook 名称和 API 表达意图；不隐藏关键业务状态；测试覆盖生命周期；能说明何时普通函数优于 Hook。评估边界：缺少与「Hooks 规则与自定义 Hook」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## REACT-06 Reducer、Context 与跨组件状态

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Extracting State Logic into a Reducer](https://zh-hans.react.dev/learn/extracting-state-logic-into-a-reducer)、[Scaling Up with Reducer and Context](https://zh-hans.react.dev/learn/scaling-up-with-reducer-and-context)、[中文补充讲义：REACT-06](../chinese-guides/content-audit-01-03.md#react-06)。覆盖范围：Reducer 状态转移、Context 广播、Provider 边界、状态域拆分与更新范围；外部 store、选择器和服务端缓存只作选型边界，不作为本点实现题。
- 严格考核：首考题 1（资料定位）：只允许使用《Extracting State Logic into a Reducer》《Scaling Up with Reducer and Context》《中文补充讲义：REACT-06》，分别定位 reducer 纯度、Provider 更新、状态边界及讲义中的转换表/读写 Context 实验；首考题 2（机制解释）：闭卷画出 action 到 reducer、Provider、消费者的状态转换；首考题 3（最小产出）：按讲义用单一转换表实现审核 reducer、读写 Context 和表驱动转换测试，并提交拆分前后只读摘要的 Profiler 证据；首考题 4（受限排错）：定位非法跃迁、过宽 Provider 或卸载后异步分发；首考题 5（学习复述）：3 分钟说明 Context、外部 store 与服务端缓存的职责边界。命题边界：不得把 Context 当选择器或权限系统。
- 通过标准：reducer 纯净且状态转换可测；Context 更新范围受控；能用数据生命周期而不是组件层级决定状态位置。评估边界：缺少与「Reducer、Context 与跨组件状态」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

### 性能与可恢复体验

## REACT-07 性能测量、memo 与大列表

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[React Profiler](https://zh-hans.react.dev/reference/react/Profiler)、[`memo`](https://zh-hans.react.dev/reference/react/memo)、[`useMemo`](https://zh-hans.react.dev/reference/react/useMemo)、[`useCallback`](https://zh-hans.react.dev/reference/react/useCallback)、[中文补充讲义：REACT-07](../chinese-guides/content-audit-01-03.md#react-07)。覆盖范围：Profiler、React DevTools、引用稳定性、`memo`/`useMemo`/`useCallback`、大列表的渲染预算与虚拟化选型；坚持先测量再优化并覆盖缓存失效成本。本点负责手工性能诊断与基线，Compiler 的启用、迁移和验证统一归 `REACT-09`。
- 严格考核：首考题 1（资料定位）：只允许使用《React Profiler》《`memo`》《`useMemo`》《`useCallback`》《中文补充讲义：REACT-07》，分别定位测量含义、缓存边界、虚拟化约束及讲义的反证实验；首考题 2（机制解释）：闭卷区分 React 提交时间与用户体验指标；首考题 3（最小产出）：按讲义在给定 10,000 行 fixture 上提交三次同脚本测量，记录中位数、离群原因与一次针对瓶颈的优化或无优化结论；若增加缓存/窗口化，提交删除该优化的反证测量，并验证键盘焦点；首考题 4（受限排错）：定位无效 memo、错误 key、焦点丢失或把网络问题归因于 React；首考题 5（学习复述）：说明何时不使用 memo 或虚拟化。命题边界：比较必须使用同一脚本和数据集。
- 通过标准：优化由测量驱动，至少改善一个明确指标 30% 或证明无需优化；无错误依赖；列表达到题目给定数据量与交互指标。评估边界：缺少与「性能测量、memo 与大列表」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## REACT-08 错误边界、异步 UI 与可恢复体验

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文补充讲义：REACT-08](../chinese-guides/content-audit-01-03.md#react-08)、[Error Boundary](https://zh-hans.react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)、[`Suspense`](https://zh-hans.react.dev/reference/react/Suspense)、[React `use`](https://zh-hans.react.dev/reference/react/use)、[TanStack Query Suspense](https://tanstack.com/query/latest/docs/framework/react/guides/suspense)（英文原文，仅用于版本核验）。TanStack Query 英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：渲染错误、异步数据、Suspense 边界、错误恢复、重试、取消和框架数据源集成；同时明确 Effect 内普通请求不会自动触发 Suspense。移除中文核心讲义：其摘要未提供资源协议、局部恢复、失败注入或反证验收。
- 严格考核：首考题 1（资料定位）：只允许使用《中文补充讲义：REACT-08》《Error Boundary》《`Suspense`》《React `use`》，分别定位错误/Promise 的渲染边界、局部恢复、普通 Effect 请求的限制和讲义的失败注入/反证实验，并标明章节；首考题 2（机制解释）：解释 Promise、Suspense、错误边界、缓存和重试链路，并说明普通 Effect 请求为何不会触发 Suspense；首考题 3（最小产出）：为页面设计加载、空、错误、无权限、部分失败和重试状态；实现错误边界和可恢复数据边界；模拟渲染异常、接口失败与取消，并提交同脚本的 Profiler、`memo`/`useMemo`/`useCallback` 删除反证；首考题 4（受限排错）：诊断一次无限重试、瀑布请求或错误边界失效；首考题 5（学习复述）：比较框架集成数据源与 Effect 请求。命题边界：答案必须回指列出的中文资料和实际产出；TanStack Query 英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：错误隔离范围合理；恢复不会丢失无关用户输入；能区分渲染错误、事件错误和异步请求错误的捕获边界。评估边界：缺少与「错误边界、异步 UI 与可恢复体验」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

### 编译优化、服务端边界与路由

## REACT-09 React Compiler、服务端组件边界与安全升级

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[React 19.2](https://zh-hans.react.dev/blog/2025/10/01/react-19-2)、[React Compiler v1.0](https://zh-hans.react.dev/blog/2025/10/07/react-compiler-1)、[React Server Components Security](https://zh-hans.react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components)。覆盖范围：React 19.2 的 `Activity`、`useEffectEvent`、`cacheSignal`、Performance Tracks、Partial Pre-rendering 与 resume API；React Compiler 的稳定启用、lint、增量迁移与手工 memo 取舍；Actions/Form Actions、`useActionState`、`useOptimistic` 作为 React 19 迁移背景；RSC/Server Function 的序列化、授权和安全公告响应；覆盖框架支持差异、升级、灰度和回退。移除 React 历史版本总览：其正文主要是版本索引与档案，不能作为当前机制的主题资料。
- 严格考核：首考题 1（资料定位）：只允许使用《React 19.2》《React Compiler v1.0》《React Server Components Security》，分别摘出能支撑「React 19.2、Compiler 与服务端边界安全」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：闭卷解释「React 19.2、Compiler 与服务端边界安全」覆盖的输入、状态转换、运行边界与失败传播，并用首考题 3 的产出证明机制选择；首考题 3（最小产出）：在真实页面启用 React Compiler 并清理无价值手工 memo，使用 Performance Tracks 验证收益；实现 `Activity` 保活切换和 `useEffectEvent` 事件逻辑；审查 RSC/Server Function 的信任边界和安全公告响应流程；首考题 4（受限排错）：围绕「React 19.2、Compiler 与服务端边界安全」的首考题 3 产出注入正常、边界和失败场景，提交预期/实际、三项资料假设、证伪证据、根因、修复与回归；首考题 5（学习复述）：3 分钟说明「React 19.2、Compiler 与服务端边界安全」解决的问题、运行机制、选型条件、反例和验证证据，并回答边界变化追问。命题边界：只在「React 19.2、Compiler 与服务端边界安全」所列资料和覆盖范围内命题；资料外经验不能替代题目要求的机制与证据。
- 通过标准：Compiler 配置、lint 和运行版本匹配；性能结论有前后证据且行为不回归；能判断何时保留手工 memo；服务端输入重新校验并具备补丁与回滚方案；不会把 Server Component 当成天然可信边界。评估边界：缺少与「React 19.2、Compiler 与服务端边界安全」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## REACT-10 React 路由、数据路由与框架模式

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文补充讲义：REACT-10](../chinese-guides/content-audit-01-03.md#react-10)、[React 创建应用](https://react.dev/learn/creating-a-react-app)（英文原文，仅用于版本核验）、[React Router 模式选择](https://reactrouter.com/start/modes)（英文原文，仅用于版本核验）、[React Router Routing](https://reactrouter.com/start/data/routing)（英文原文，仅用于版本核验）、[React Router Data Loading](https://reactrouter.com/start/data/data-loading)（英文原文，仅用于版本核验）、[React Router Actions](https://reactrouter.com/start/data/actions)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：URL 与历史记录、嵌套/参数路由、链接与导航、Route Module、`loader`/`clientLoader`、`action`/`clientAction`、`Form`/`fetcher`、pending/error/revalidation、代码分割、鉴权可见性、SSR/SPA/静态模式，以及 Declarative/Data/Framework 三种模式的控制权和迁移边界；服务端授权与通用 Server State 缓存分别归 BIZ-03 和 DATA-01/02。
- 严格考核：首考题 1（资料定位）：只允许使用《中文补充讲义：REACT-10》，定位路由匹配、数据加载、写操作和错误边界的依据；首考题 2（机制解释）：闭卷画出一次参数路由导航从匹配、并行加载、渲染、提交、重验证到错误恢复的时序，并比较三种模式；首考题 3（最小产出）：对给定的产品/订单 fixture 实现嵌套布局、参数校验、懒加载、loader/action、并发导航、局部错误边界和未保存表单保护；验收脚本依次深链刷新、后退、提交、取消导航和访问不存在资源，逐项比对给定输出；首考题 4（受限排错）：诊断一次重复请求、陈旧页面、重定向循环或客户端鉴权绕过；首考题 5（学习复述）：说明何时只用声明式路由、何时采用数据路由、何时进入框架模式。命题边界：路由层不得替代服务端授权或把组件内通用缓存包装成路由职责。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：深链、刷新、前进后退和 404 行为正确；参数与搜索条件被验证；读写与重验证无竞态；加载和错误边界位于合理层级；有模式选型、迁移和回滚证据。评估边界：只会配置路径表或用客户端隐藏页面代替授权不能通过。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## 领域综合考核

- [ ] 已通过领域综合考核
- 任务：实现一个带查询、分页、详情编辑、并发请求取消和 10000 行虚拟列表的 React 管理页面，包含错误恢复、可访问性和性能报告。
- 通过标准：6 小时内完成；组件测试覆盖关键行为；无 Effect 竞态；Profiler 有前后证据；现场随机改变需求后能在 30 分钟内安全调整状态模型。评估边界：领域综合考核只依据本领域列出的资料、题目输入和可复核产出；不得用资料外经验替代跨知识点整合证据。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟
