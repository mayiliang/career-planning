# 11 Vue 3 项目开发

所有“通过”均需满足[统一考核规则](00-assessment-rules.md)。本领域必须使用 Career Atlas 的真实 Vue 代码作为学习和考核证据，不能只完成孤立 Demo。

### 项目与响应式基础

## VUE-01 Vite 脚手架、SFC 与项目结构

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Vue Quick Start](https://cn.vuejs.org/guide/quick-start.html)、[Single-File Components](https://cn.vuejs.org/guide/scaling-up/sfc.html)、[Vite 为什么选择 Vite](https://cn.vite.dev/guide/why)。覆盖范围：Vite 创建 Vue 3 项目、SFC 编译、`script setup`、目录/别名、环境变量和生产构建；覆盖开发/生产差异与依赖边界。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《Vue Quick Start》《Single-File Components》《Vite 为什么选择 Vite》，定位脚手架、SFC 编译和边界；首考题 2（机制解释）：闭卷说明 `main.ts→createApp→App.vue`、`script setup` 编译和 scoped 样式标记分别发生在哪里，及 dev 的模块更新为何不等于 production bundle；首考题 3（最小产出）：固定夹具为 `/knowledge/:id` 页面、`@/` 别名和 `VITE_API_BASE`；提交严格 TS 项目树、入口/路由/页面/组件边界、dev/build/typecheck 日志与产物清单；预期观察=环境变量不进入未声明位置，且 `/knowledge/:id` 从入口可追踪到页面组件；验证=执行固定夹具的 dev、build 与 typecheck，核对构建产物、入口链路和环境变量断言；首考题 4（受限排错）：仅可改 Vite/SFC/目录层；注入别名构建失败、未暴露变量、style scoped 穿透误用和组件被错误当页面入口。提交错误输出、三项假设、最小修复与 build 回归；首考题 5（掌握挑战）：向 React 开发者解释 SFC 模板/样式作用域与 JSX 模块的相同边界和关键不同，并现场追踪一个路由到组件。复测变式：仅将页面组件导入方式改为路由级懒加载；不变量=`/knowledge/:id`、`@/` 别名、`VITE_API_BASE` 和入口到组件边界不变；预期变化=dev 与 production build 均解析同一页面模块且产生独立路由 chunk；证据=模块解析日志、构建 chunk 清单和路由断言。命题边界：只在所列资料和覆盖范围内命题。
- 通过标准：dev/build/typecheck 均通过（证据=日志）；入口到组件可追踪（证据=项目树/链路）；四个夹具均有确定诊断（证据=回归）；环境与样式边界不泄漏（证据=构建/DOM 检查）。否决项：只交脚手架截图、混入未解释的 Options API、或以 dev 成功替代构建验证，均不能通过。 评估边界：仅以本点资料、题目输入与上述可复核产出评分，资料外经验不能替代证据。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## VUE-02 `ref`、`reactive`、`computed` 与响应式边界

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Reactivity Fundamentals](https://cn.vuejs.org/guide/essentials/reactivity-fundamentals.html)、[Computed Properties](https://cn.vuejs.org/guide/essentials/computed.html)、[Reactivity in Depth](https://cn.vuejs.org/guide/extras/reactivity-in-depth.html)。覆盖范围：`ref`、`reactive`、`computed` 的代理/依赖跟踪、解包、只读与身份边界；覆盖解构丢失响应性、深浅代理和外部对象。
- 严格考核：挑战类型：DEBUGGING；首考题 1（资料定位）：只允许使用《Reactivity Fundamentals》《Computed Properties》《Reactivity in Depth》，定位依赖追踪、解包和反例；首考题 2（机制解释）：闭卷对筛选页的 `filters`、`visibleItems`、外部地图实例说明哪些应为 ref/reactive/computed/普通对象，画出一次访问到触发的依赖链；首考题 3（最小产出）：固定夹具为 10 个可运行片段：解构丢响应、嵌套 ref、可写派生、shallowRef 外部对象等；提交预测表、四处修复、筛选页状态表和 DOM 断言；预期观察=至少 9 个片段的触发顺序预测正确，四个边界修复后筛选结果随 `filters` 更新且外部地图对象不被深代理；验证=运行 10 个固定片段，核对预测表、触发日志、状态表和 DOM 断言；首考题 4（受限排错）：仅可改状态形态/派生层；注入数组就地修改不更新、computed 副作用、深代理拖慢地图对象、重复派生不同步。提交触发日志、三项假设、根因/修复和回归；首考题 5（掌握挑战）：解释为何 watch 不是同步两份派生状态的补丁，并判断新增“草稿筛选条件”应归哪个状态层。复测变式：仅将 `filters` 的持有方式改为传入第三方地图实例的 `shallowRef`；不变量=10 个固定片段、筛选条件、`visibleItems` 派生规则和地图输入不变；预期变化=筛选结果仍更新而地图实例不出现深代理触发；证据=触发日志、状态表、DOM 断言和代理检查快照。命题边界：只在所列资料和覆盖范围内命题。
- 通过标准：预测至少 9/10（证据=运行日志）；四种边界缺陷均被修复（证据=DOM 断言）；派生值无独立可变副本（证据=状态表）；外部对象不被误深代理（证据=夹具）。否决项：用 watch 维持 computed、只靠试错描述依赖链、或忽略解构边界，均不能通过。 评估边界：仅以本点资料、题目输入与上述可复核产出评分，资料外经验不能替代证据。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## VUE-03 模板语法、指令、事件与表单

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Template Syntax](https://cn.vuejs.org/guide/essentials/template-syntax.html)、[Event Handling](https://cn.vuejs.org/guide/essentials/event-handling.html)、[Form Input Bindings](https://cn.vuejs.org/guide/essentials/forms.html)。覆盖范围：模板表达式、指令、列表 key、事件修饰符和表单双向绑定；覆盖动态 HTML、渲染性能、输入法组合事件、空值、键盘与可访问语义。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《Template Syntax》《Event Handling》《Form Input Bindings》，定位指令、事件、表单边界；首考题 2（机制解释）：闭卷解释编辑列表中稳定业务 key、`v-model.number` 空输入、IME 组合事件和 `.prevent` 如何影响 DOM/状态，不得把模板写成命令式副作用；首考题 3（最小产出）：固定夹具含三个同名显示项但不同 id、中文输入法、空数量、复选框和自定义日期组件；实现编辑页并提交交互录像、DOM 断言、提交 payload 和键盘路径；预期观察=排序后焦点仍绑定原业务 id，IME 组合期间不提交，空数量和日期组件按表单契约进入 payload；验证=回放固定交互步骤，核对录像、DOM 断言、键盘路径和提交 payload；首考题 4（受限排错）：仅可改模板/事件/表单；注入 index key 导致焦点错位、`v-if`/`v-for` 同节点、number 空值变 0、composition 中提前提交。提交预期/实际、三项假设、修复与回归；失败现象：index key 排序后焦点错位，IME 组合期间提前提交；首考题 5（掌握挑战）：现场解释为何 key 是身份而非性能提示，并为“删除后保留正在输入的草稿”选择模板结构。复测变式：仅在固定列表中启用排序；不变量=三个业务 id、中文输入法草稿、过滤条件、表单字段和提交契约不变；预期变化=排序后焦点、草稿值和提交 payload 仍对应同一业务 id；证据=新的交互录像、DOM 断言、键盘路径和 payload 快照。命题边界：只在所列资料和覆盖范围内命题。
- 通过标准：排序/过滤后 DOM 身份稳定（证据=断言/录像）；表单四种输入按契约编码（证据=payload）；IME/键盘均可完成（证据=交互记录）；模板无副作用（证据=审查）。否决项：index 作业务 key、只鼠标 happy path、或以视觉正确替代表单值验证，均不能通过。 评估边界：仅以本点资料、题目输入与上述可复核产出评分，资料外经验不能替代证据。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

### 组件、副作用与逻辑复用

## VUE-04 类型化组件契约、Slots、`v-model` 与 Teleport

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文补充讲义：VUE-04](../chinese-guides/content-audit-10-12.md#vue-04)、[Props](https://cn.vuejs.org/guide/components/props.html)、[Component Events](https://cn.vuejs.org/guide/components/events.html)、[Slots](https://cn.vuejs.org/guide/components/slots.html)、[Component v-model](https://cn.vuejs.org/guide/components/v-model.html)、[Teleport](https://cn.vuejs.org/guide/built-ins/teleport)。覆盖范围：类型化 Props/Emits/Slots/`defineModel` 组件合同、单向数据流、多模型、受控状态所有权，以及 Teleport 的逻辑组件树、DOM 目标、焦点与无障碍边界；不把 Teleport 当安全隔离或跨应用通信。
- 严格考核：挑战类型：DESIGN_CASE；首考题 1（资料定位）：只允许使用《中文补充讲义：VUE-04》《Props》《Component Events》《Slots》《Component v-model》《Teleport》，定位单向流、类型化宏、组合与逻辑树/DOM 放置边界；首考题 2（机制解释）：闭卷为“筛选器的 query、页码、结果项插槽和确认浮层”指定 prop、`update:*`、业务事件、slot prop 与 Teleport 焦点所有权，说明受控父组件如何拒绝非法更新，以及 Teleport 为何不改变 provide/inject 和事件归属；首考题 3（最小产出）：固定夹具为 API 需求：含 `v-model:query`、`v-model:page`、可替换 result slot、loading/error 与渲染到 `#overlays` 的确认浮层；提交 TS Props/Emits/Slots/Model 声明、父子交互测试、焦点恢复断言、6 个反例审查和最小示例；预期观察=父组件是 query/page 的唯一真相源，非法修改和不匹配载荷被类型或测试拒绝，替换 slot 仍取得完整类型，Teleport 后逻辑所有权不变且关闭回到触发按钮；验证=运行类型检查、父子交互与键盘测试，核对事件序列、DOM 目标、背景不可操作和焦点恢复；首考题 4（受限排错）：仅可改组件合同/浮层边界，固定失败为“错误载荷通过且浮层移到 body 后背景仍可操作”；仅在“prop 被直接修改”“emit/model 载荷声明不一致”“slot prop 被 `any` 绕过”“Teleport 目标/焦点合同缺失”四个候选中逐项证伪；提交事件/焦点序列、根因、最小修复和同 fixture 回归；首考题 5（掌握挑战）：解释为何该场景不应放全局 store，并评审一个把“关闭弹窗”误命名成 `update:modelValue`、把 Teleport 当隔离机制的 API。复测变式：仅将父组件确认 `query` 更新的延迟设为 200 ms；不变量=API 需求、`page`、slot、Teleport 目标、父组件所有权和原始 query 值不变；预期变化=子组件只发出 `update:query`，不持久化未确认的冲突值，浮层焦点行为不变；证据=事件序列、父子交互测试、焦点断言和状态快照。命题边界：只在所列中文资料和覆盖范围内命题。
- 通过标准：数据单向、事件/载荷/slot/model 有 TS 契约（证据=类型与交互测试）；Teleport 后逻辑树、焦点和背景隔离符合声明（证据=DOM/键盘断言）；四类失败有同 fixture 回归（证据=事件与焦点序列）。否决项：直接修改 prop、用 `any` 绕过合同、语义模糊 emit、把 Teleport 当安全边界或仅靠截图证明受控行为，均不能通过。评估边界：仅以本点资料、题目输入与上述可复核产出评分，资料外经验不能替代证据。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## VUE-05 生命周期、副作用清理与异步恢复

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文补充讲义：VUE-05](../chinese-guides/content-audit-10-12.md#vue-05)、[Lifecycle Hooks](https://cn.vuejs.org/guide/essentials/lifecycle.html)、[Watchers](https://cn.vuejs.org/guide/essentials/watchers.html)、[Async Components](https://cn.vuejs.org/guide/components/async)、[KeepAlive](https://cn.vuejs.org/guide/built-ins/keep-alive)、[Suspense](https://cn.vuejs.org/guide/built-ins/suspense)。覆盖范围：组件挂载/卸载与 activated/deactivated 生命周期、`watch`/`watchEffect` 的依赖和清理、异步组件加载/超时/重试、KeepAlive 缓存资源边界、Suspense pending/fallback 及 `onErrorCaptured` 恢复；明确 Suspense 仍是实验性能力且自身不是错误边界。
- 严格考核：挑战类型：DEBUGGING；首考题 1（资料定位）：只允许使用《中文补充讲义：VUE-05》《Lifecycle Hooks》《Watchers》《Async Components》《KeepAlive》《Suspense》，定位失效清理、激活/停用、异步加载、fallback 与错误捕获边界；首考题 2（机制解释）：闭卷按“旧 watch 清理→新请求→异步组件 pending/resolve/error→KeepAlive deactivate/activate→错误捕获/受控重试”解释 A→B→C 快切，并说明 Suspense 为什么不能代替 `onErrorCaptured`；首考题 3（最小产出）：固定夹具为 A/B/C 延迟 300/200/100 ms、一个 loader 首次失败的异步报表、`KeepAlive max=2` 的两个草稿标签页及深层 5,000 项对象；提交可取消同步、事件/请求时间线、激活/停用资源计数、错误恢复 DOM/焦点断言和性能记录；预期观察=仅 C 可提交，停用后外部监听归零但允许的草稿保留，异步失败进入可重试局部错误而非整页卸载；验证=重放快切、停用/激活、loader 失败/重试和卸载，核对日志、DOM、焦点、监听器与缓存计数；首考题 4（受限排错）：固定失败为“A 迟到覆盖 C，停用标签仍维持连接，loader rejection 使整页空白”；仅在“watch cleanup/代次缺失”“KeepAlive 生命周期策略缺失”“Suspense 被误当错误边界”“异步组件 retry/timeout 合同缺失”四个候选中逐项证伪；提交原始时间线、最小修复和同 fixture 回归；首考题 5（掌握挑战）：解释 computed、watch、watchEffect、异步组件、KeepAlive 与 Suspense 的选择边界，而非把生命周期机械翻译成 `useEffect`。复测变式：仅把 C 请求的 100 ms 成功响应改为 100 ms 失败响应；不变量=A/B 时序、异步组件、KeepAlive 树、监听策略和深层对象不变；预期变化=页面显示 C 的可恢复错误，A/B 旧成功不可覆盖，其他标签草稿和焦点按合同保留；证据=请求/生命周期时间线、DOM 与焦点断言。命题边界：只在所列中文资料内，实验性 Suspense 不作稳定生产承诺。
- 通过标准：所有 I/O/监听按挂载、停用和卸载合同清理（证据=资源计数）；快切只显示当前代次，异步失败可局部重试（证据=时间线与 DOM/焦点断言）；KeepAlive 只保留声明状态，Suspense 边界表述准确（证据=缓存快照与错误回归）。否决项：忽略过期响应、以 `deep:true` 解决一切、把 Suspense 当稳定错误边界、停用后仍占用外部资源或只验证成功路径，均不能通过。评估边界：仅以本点资料、固定组件树与可复核产出评分，资料外经验不能替代证据。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## VUE-06 Composable、依赖注入与逻辑复用

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Composables](https://cn.vuejs.org/guide/reusability/composables.html)、[Provide / Inject](https://cn.vuejs.org/guide/components/provide-inject.html)。覆盖范围：Composable 的输入输出、响应式约定、清理、依赖注入和可测试性；覆盖隐藏全局状态、调用时机、SSR 作用域、错误传播与逻辑复用边界。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《Composables》《Provide / Inject》，定位输入/输出与注入边界；首考题 2（机制解释）：闭卷说明 `useKnowledge(idRef, api)` 如何让调用者持有业务状态、Composable 持有请求生命周期，以及为何用 InjectionKey 代替字符串；首考题 3（最小产出）：固定输入为可变 id、可替换 api、父级权限上下文；提交 Composable 类型签名、取消/错误/卸载测试、provide/inject 测试替身与最小消费组件；预期观察=id 改变时旧请求被取消，缺失注入产生明确诊断，卸载后无回调且不同实例不共享状态；验证=运行取消/错误/卸载及 provide/inject 替身测试，核对调用日志、类型检查和最小消费组件快照；首考题 4（受限排错）：受限范围：仅可改 Composable/注入层，注入未提供依赖、全局单例串实例、传入普通值丢响应和卸载后请求完成；提交调用日志、三项假设、修复回归；首考题 5（掌握挑战）：评审何时是普通函数、Composable、Pinia store，及为什么不能在 Composable 隐藏权限决定。复测变式：仅将同页第二个 Composable 实例的 id 从 `k-2` 改为 `k-3`；不变量=第一个实例的 id、api、父级权限上下文和两实例的注入键不变；预期变化=只有第二个实例取消旧请求并获取 `k-3`，第一个实例状态不变；证据=调用日志、双挂载测试和两份状态快照。命题边界：只在所列资料和覆盖范围内命题。
- 通过标准：响应输入、类型和资源释放可测试（证据=单测）；依赖可替换且缺失诊断明确（证据=注入测试）；实例无共享泄漏（证据=双挂载）；业务所有权不被隐藏（证据=接口说明）。否决项：模块级可变单例、字符串注入碰撞、或只抽文件不验证生命周期，均不能通过。 评估边界：仅以本点资料、题目输入与上述可复核产出评分，资料外经验不能替代证据。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

### 路由、客户端状态与服务器状态

## VUE-07 Vue Router、类型化/文件路由与导航边界

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文补充讲义：VUE-07](../chinese-guides/content-audit-10-12.md#vue-07)、[动态路由匹配](https://router.vuejs.org/zh/guide/essentials/dynamic-matching.html)、[Route Lazy Loading](https://router.vuejs.org/zh/guide/advanced/lazy-loading.html)、[Navigation Guards](https://router.vuejs.org/zh/guide/advanced/navigation-guards.html)、[Vue Router v4→v5 Migration](https://router.vuejs.org/guide/migration/v4-to-v5)（英文原文，仅用于版本核验）、[File-based Routing](https://router.vuejs.org/file-based-routing/)（英文原文，仅用于版本核验）、[Typed Routes](https://router.vuejs.org/guide/advanced/typed-routes)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：Vue Router 路由匹配、嵌套、懒加载、导航守卫与错误路径；覆盖 v5 的手写路由兼容升级、文件路由、生成类型、深链刷新和服务端授权分工；实验性 data loader 只作能力边界并保留稳定回退。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《中文补充讲义：VUE-07》《动态路由匹配》《Route Lazy Loading》《Navigation Guards》，定位匹配、守卫、v5 文件/类型路由迁移和实验能力边界；首考题 2（机制解释）：闭卷画 `/team/7/knowledge/42?tab=note` 从路由记录生成/匹配、参数校验、守卫、懒加载到 404/403 的链路，说明生成类型为何不能替代运行时校验，客户端守卫为何不是服务端授权；首考题 3（最小产出）：固定夹具含手写 v4 路由、同语义 v5 文件路由、深链、未保存草稿、无权限 403 和缺块懒加载；提交迁移 diff、生成 route map 类型、路由清单、E2E 日志、刷新/标题/404 断言；预期观察=两种模式深链语义一致，错误 route name/参数被类型或运行时拒绝，403 与 chunk 失败进入可恢复页面；验证=重放 v4 基线和 v5 迁移后的同一脚本，核对类型检查、路由清单、地址/历史、E2E 与服务端 403；首考题 4（受限排错）：固定失败为“生成路由跳错详情且守卫重定向循环”；仅在“文件路由生成记录错误”“route name/参数类型或运行时校验缺失”“守卫重定向条件”“动态 import 失败”四个候选中逐项证伪；提交导航/构建时间线、最小修复和同 fixture 回归；首考题 5（掌握挑战）：说明何时保留手写路由、何时采用文件/类型路由，以及实验 data loader 何时必须退回稳定读取路径。复测变式：仅将同级目标路由的授权结果从允许改为 403；不变量=v5 路由生成结果、详情参数、查询条件、未保存草稿和服务端规则结构不变；预期变化=导航进入可恢复无权限状态，既有草稿和查询不越过定义边界；证据=导航时间线、生成类型检查、E2E 与 403 响应记录。命题边界：只在所列中文资料和覆盖范围内命题；英文原文仅用于版本核验，不作为独立首考题源；实验 API 不作稳定生产承诺。
- 通过标准：深链、404、懒加载错误均可恢复（证据=E2E）；守卫无隐藏写副作用（证据=时间线）；v4 基线与 v5 迁移后生成路由类型均通过 typecheck（证据=锁文件、迁移 diff 与类型日志）；实验性数据加载器可关闭并回退到稳定加载路径（证据=回归）；授权最终被服务端拒绝（证据=403 fixture）。否决项：守卫循环、仅前端保护、把实验性数据加载器当稳定合同、或只验证首页跳转，均不能通过。评估边界：仅以本点资料、题目输入与上述可复核产出评分，资料外经验不能替代证据。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## VUE-08 Pinia 与状态分层

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Pinia 定义 Store](https://pinia.vuejs.org/zh/core-concepts/)、[Testing Stores](https://pinia.vuejs.org/zh/cookbook/testing.html)。覆盖范围：Pinia store 边界、state/getter/action、组合式 store、持久化和 SSR；覆盖跨请求污染、派生状态和服务端数据缓存分工。
- 严格考核：挑战类型：DESIGN_CASE；首考题 1（资料定位）：只允许使用《Pinia 定义 Store》《Testing Stores》，定位 state/getter/action 和测试；首考题 2（机制解释）：闭卷将“主题偏好、跨页草稿、知识详情、会话令牌”分别归类并解释为何详情不是 Pinia 真相源、令牌不得浏览器持久化；首考题 3（最小产出）：固定夹具为两个页面共享草稿、刷新、过期详情缓存和登出；提交 store 契约、持久化 allowlist、单测与状态分层图；预期观察=允许持久化的跨页草稿可按当前用户恢复，过期详情不成为 store 真相源，会话令牌不落盘；验证=重放共享草稿、刷新、过期缓存和登出场景，核对 store 单测、状态分层图、持久化清单和存储快照；首考题 4（受限排错）：受限范围：仅可改 store/持久化边界，注入双数据源、跨用户草稿、getter 写状态和 localStorage 泄密；提交状态快照、三项假设、修复回归；失败现象：跨用户草稿从持久化恢复，getter 写入状态；首考题 5（掌握挑战）：向评审解释“全局可访问”不等于应放全局。复测变式：仅将当前账号从 `t1` 切换为 `t2`；不变量=共享草稿的 schema、持久化 allowlist、详情缓存策略和 UI 状态层级不变；预期变化=`t1` 的持久化草稿不得在 `t2` 恢复，临时 UI 状态不写入领域 store；证据=登出/登录状态快照、存储检查、store 单测和状态分层图。命题边界：只在所列资料和覆盖范围内命题。
- 通过标准：职责/持久化允许项清楚（证据=分层图）；store 单测覆盖四夹具（证据=日志）；服务端缓存未复制进 store（证据=依赖检查）；敏感信息不落盘（证据=存储检查）。否决项：万能 store、getter 副作用、或共享持久化串用户，均不能通过。 评估边界：仅以本点资料、题目输入与上述可复核产出评分，资料外经验不能替代证据。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## VUE-09 Vue Query 与服务器状态

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[本地中文讲义：VUE-09](../chinese-guides/content-audit-10-12.md#vue-09)、[TanStack Query Queries](https://tanstack.com/query/latest/docs/framework/vue/guides/queries)（英文原文，仅用于版本核验）、[TanStack Query Mutations](https://tanstack.com/query/latest/docs/framework/vue/guides/mutations)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：Vue Query 的 query key、缓存、失效、去重、乐观更新和错误恢复；明确 TanStack Query 管理服务器状态，Pinia 管理客户端领域/界面状态，本点是 Vue 赛道可选数据层而非所有 Vue 项目的强制依赖。
- 严格考核：挑战类型：DEBUGGING；首考题 1（资料定位）：只允许使用《本地中文讲义：VUE-09》，定位 key、失效、写入和反例；首考题 2（机制解释）：闭卷说明 key 中 `tenantId`、`knowledgeId`、过滤器的身份语义，以及乐观写入失败如何只回滚对应快照；首考题 3（最小产出）：固定夹具为租户 t1/t2、列表/详情、自评 mutation、拖拽日历和 409；提交 key 表、乐观前后缓存快照、失败回滚和授权测试；预期观察=409 仅回滚对应 mutation 快照，t1/t2 的列表和详情缓存不互见，服务端授权仍决定访问；验证=重放双租户、自评 mutation、拖拽日历和 409，核对 key 表、网络/缓存事件、前后快照和授权测试；首考题 4（受限排错）：受限范围：仅可改 Query 层，注入漏租户 key、双击 mutation、失效整个缓存、Pinia 复制详情；提交网络/缓存事件、三项假设、修复回归；失败现象：漏租户 query key 导致详情缓存串用户；首考题 5（掌握挑战）：解释 UI、客户端缓存、服务端真相源各自职责。复测变式：仅将已登录租户从 `t1` 切换为 `t2`；不变量=列表/详情输入、`knowledgeId`、过滤器、query key 结构和服务端授权规则不变；预期变化=`t2` 不可读取 `t1` 的旧详情，且 409 回滚仍仅作用于对应快照；证据=双租户缓存快照、网络事件、授权测试和回归断言。命题边界：只在所列资料和覆盖范围内命题。 英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：key/失效精确（证据=缓存快照）；409 后正确回滚（证据=事件记录）；租户不串缓存（证据=双租户测试）；无 Pinia 双数据源（证据=依赖图）。否决项：key 缺身份、全量失效掩盖错误、或前端缓存当授权，均不能通过。 评估边界：仅以本点资料、题目输入与上述可复核产出评分，资料外经验不能替代证据。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

### 测试、性能与全栈渲染

## VUE-10 组件测试、性能与生产构建

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Vue Testing Guide](https://cn.vuejs.org/guide/scaling-up/testing.html)、[Vue Performance](https://cn.vuejs.org/guide/best-practices/performance.html)、[Vite Build](https://cn.vite.dev/guide/build)。覆盖范围：Vue 组件测试、响应式异步刷新、性能剖析、懒加载和生产构建分析；覆盖实现细节断言、内存泄漏与 hydration 警告。
- 严格考核：挑战类型：DEBUGGING；首考题 1（资料定位）：只允许使用《Vue Testing Guide》《Vue Performance》《Vite Build》，定位行为测试、性能和构建边界；首考题 2（机制解释）：闭卷说明用户可见断言、组件重复更新、路由分包和 source map 分别验证什么；首考题 3（最小产出）：固定夹具为异步详情页、重复渲染父组件、2 个懒路由；提交行为测试、连续 10 次结果、性能前后 trace、chunk 报告和 production 静态服务检查；预期观察=10 次测试结果一致，重复父渲染不导致额外用户可见更新，两个懒路由独立分包且 production 静态服务可映射错误；验证=连续运行 10 次行为测试，比较性能 trace、chunk 报告和 production 静态服务检查记录；首考题 4（受限排错）：受限范围：仅可改测试/渲染/构建层，注入测试依赖内部 state、慢请求 flake、未拆包、线上 source map 缺失；提交失败证据、三项假设、修复回归；首考题 5（掌握挑战）：解释为什么“测试绿”不能证明性能或产物正确。复测变式：仅将详情请求结果从成功改为一次可重试的 503；不变量=异步详情页、父组件渲染次数、两个懒路由、断言口径和构建配置不变；预期变化=测试仍稳定且详情状态不重复更新；证据=10 次测试报告、组件更新 trace、网络记录和回归断言。命题边界：只在所列资料和覆盖范围内命题。
- 通过标准：测试从用户行为断言且 10 次稳定（证据=报告）；优化有同条件 trace（证据=前后记录）；chunk/source map/静态服务可验证（证据=构建产物）；失败夹具均可定位。否决项：断言内部实现、单次性能截图、或只验证 dev，均不能通过。 评估边界：仅以本点资料、题目输入与上述可复核产出评分，资料外经验不能替代证据。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## VUE-11 Nuxt 全栈渲染、数据获取与性能

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[本地中文讲义：VUE-11](../chinese-guides/content-audit-10-12.md#vue-11)、[Nuxt Data Fetching](https://nuxt.com.cn/docs/4.x/getting-started/data-fetching)、[Nuxt Rendering Modes](https://nuxt.com/docs/4.x/guide/concepts/rendering)（英文原文，仅用于版本核验）、[Nuxt 4.5](https://nuxt.com/blog/v4-5)（英文原文，仅用于版本核验）、[Nuxt 4.5 Security Fixes](https://nuxt.com/blog/v4-5-security)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：Nuxt 4 SSR/SSG/混合路由、数据获取、服务端路由、缓存、hydration 和性能剖析；覆盖 4.5 构建/实验 streaming 边界、4.5.1 安全修复、Nuxt 3 生命周期终点、跨请求状态、部署适配与稳定回退；实施时必须按最新公告、锁文件和适配器重新核验。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《本地中文讲义：VUE-11》《Nuxt Data Fetching》，定位 SSR/payload/key、当前升级闸门与安全核验边界；首考题 2（机制解释）：闭卷画出首屏服务端取数、payload 接管、客户端导航重取的时序，说明 key 与认证上下文为何不能混用，并解释实验 streaming 为什么必须能退回稳定 SSR；首考题 3（最小产出）：固定输入为 SPA 列表/详情、匿名/登录两身份、一条服务端私有 token、一个 Nuxt 3 lockfile 和一个未修补的 4.5.0 lockfile；提交 Nuxt 4 SSR 页面、HTML/payload 对照、导航网络记录、依赖树/公告对照、产物扫描、错误页/键盘路由播报、构建报告与回滚步骤；预期观察=三阶段数据一致、身份缓存隔离、私有 token 不出客户端，两个旧锁文件都被升级闸门拒绝；验证=重放两身份首屏/导航与旧锁文件扫描，核对 HTML/payload、网络、依赖树、产物、错误路径和构建报告；首考题 4（受限排错）：固定失败为“登录 payload 串到匿名用户且旧 lockfile 被放行”；仅在“数据 key 缺身份范围”“模块级跨请求状态”“受影响 Nuxt/devtools 组合未升级”“实验 streaming/代理回退配置缺失”四个候选中逐项证伪；提交原始响应、依赖树、最小修复和同 fixture 回归；首考题 5（掌握挑战）：按内容新鲜度/个性化解释 SSR、CSR、预渲染取舍，并说明 Nuxt 3 项目迁移与 Nuxt 4 安全补丁不能只看顶层版本。复测变式：仅将导航后的身份从匿名改为登录；不变量=首屏匿名输入、列表/详情数据、数据 key 结构、私有 token、锁文件核验规则和 SSR 配置不变；预期变化=登录导航使用独立身份缓存且不读取匿名数据，私有 token 仍不暴露，升级闸门结论不变；证据=HTML/payload 对照、导航网络记录、缓存键快照、依赖树和产物扫描。命题边界：只在所列中文资料、固定输入与可复核产出内评分；英文原文仅用于版本核验，不作为独立首考题源；实验能力不作稳定生产承诺。
- 通过标准：三阶段数据一致（证据=HTML/payload/网络）；私密值未出客户端（证据=产物扫描）；四夹具回归（证据=响应/日志）；Nuxt 版本、实际依赖树与锁文件对应官方安全公告，升级前后 build/E2E 通过且保留可执行回滚（证据=版本对照、升级 diff 与回滚日志）；路由/键盘错误路径可恢复（证据=E2E）。否决项：只看首屏、共享认证缓存、继续使用已结束支持的基线而无迁移计划、忽略安全公告或 hydration warning，均不能通过。评估边界：仅以本点资料、题目输入与上述可复核产出评分，资料外经验不能替代证据。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## 领域综合考核

- [ ] 已通过领域综合考核
- 任务：使用 Career Atlas 真实架构完成“知识列表 -> 详情学习 -> 自评掌握 -> 日历新增复测”的 Vue 垂直切片，包含 Router、Pinia、Vue Query、Element Plus、composable、组件测试和 E2E。
- 通过标准：8 小时内完成；typecheck、组件测试、E2E 和 build 通过；现场解释每一类状态为何放在组件、Pinia 或 Vue Query；能对照 React 说明至少 5 个相似点与关键差异。否决项：私密 token 进入 payload、认证缓存串身份、或只验证首屏。 评估边界：领域综合考核只依据本领域列出的资料、题目输入和可复核产出；不得用资料外经验替代跨知识点整合证据。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟
