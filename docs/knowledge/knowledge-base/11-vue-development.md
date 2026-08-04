# 11 Vue 3 项目开发

所有“通过”均需满足[统一考核规则](00-assessment-rules.md)。本领域必须使用 Career Atlas 的真实 Vue 代码作为学习和考核证据，不能只完成孤立 Demo。

### 项目与响应式基础

## VUE-01 Vite 脚手架、SFC 与项目结构

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Vue Quick Start](https://cn.vuejs.org/guide/quick-start.html)、[Single-File Components](https://cn.vuejs.org/guide/scaling-up/sfc.html)、[Vite 为什么选择 Vite](https://cn.vite.dev/guide/why)。覆盖范围：Vite 创建 Vue 3 项目、SFC 编译、`script setup`、目录/别名、环境变量和生产构建；覆盖开发/生产差异与依赖边界。
- 严格考核：首考题 1（资料定位）：只允许使用《Vue Quick Start》《Single-File Components》《Vite 为什么选择 Vite》，分别摘出能支撑「Vite 脚手架、SFC 与项目结构」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：闭卷解释「Vite 脚手架、SFC 与项目结构」覆盖的输入、状态转换、运行边界与失败传播，并用首考题 3 的产出证明机制选择；首考题 3（最小产出）：闭卷解释 `createApp`、SFC 编译、`<script setup>`、样式作用域和 Vite 开发/构建流程；从零搭建一个严格 TypeScript Vue 应用并说明目录边界；首考题 4（受限排错）：围绕「Vite 脚手架、SFC 与项目结构」的首考题 3 产出注入正常、边界和失败场景，提交预期/实际、三项资料假设、证伪证据、根因、修复与回归；首考题 5（学习复述）：3 分钟说明「Vite 脚手架、SFC 与项目结构」解决的问题、运行机制、选型条件、反例和验证证据，并回答边界变化追问。命题边界：只在「Vite 脚手架、SFC 与项目结构」所列资料和覆盖范围内命题；资料外经验不能替代题目要求的机制与证据。
- 通过标准：应用可 dev/build/typecheck；不混用 Options API；能从入口追踪到路由、页面和组件，并说明 SFC 与 React 组件模块的差异。评估边界：缺少与「Vite 脚手架、SFC 与项目结构」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## VUE-02 `ref`、`reactive`、`computed` 与响应式边界

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Reactivity Fundamentals](https://cn.vuejs.org/guide/essentials/reactivity-fundamentals.html)、[Computed Properties](https://cn.vuejs.org/guide/essentials/computed.html)、[Reactivity in Depth](https://cn.vuejs.org/guide/extras/reactivity-in-depth.html)。覆盖范围：`ref`、`reactive`、`computed` 的代理/依赖跟踪、解包、只读与身份边界；覆盖解构丢失响应性、深浅代理和外部对象。
- 严格考核：首考题 1（资料定位）：只允许使用《Reactivity Fundamentals》《Computed Properties》《Reactivity in Depth》，分别摘出能支撑「`ref`、`reactive`、`computed` 与响应式边界」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：闭卷解释「`ref`、`reactive`、`computed` 与响应式边界」覆盖的输入、状态转换、运行边界与失败传播，并用首考题 3 的产出证明机制选择；首考题 3（最小产出）：完成 10 道响应式预测题；修复解构丢失响应性、错误嵌套 ref、可变 computed 和重复派生状态；为真实筛选页选择正确状态形态；首考题 4（受限排错）：围绕「`ref`、`reactive`、`computed` 与响应式边界」的首考题 3 产出注入正常、边界和失败场景，提交预期/实际、三项资料假设、证伪证据、根因、修复与回归；首考题 5（学习复述）：3 分钟说明「`ref`、`reactive`、`computed` 与响应式边界」解决的问题、运行机制、选型条件、反例和验证证据，并回答边界变化追问。命题边界：只在「`ref`、`reactive`、`computed` 与响应式边界」所列资料和覆盖范围内命题；资料外经验不能替代题目要求的机制与证据。
- 通过标准：至少 9/10 正确；能解释依赖追踪、自动解包和 shallow API 边界；不会用 watch 维护本可 computed 的状态。评估边界：缺少与「`ref`、`reactive`、`computed` 与响应式边界」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## VUE-03 模板语法、指令、事件与表单

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Template Syntax](https://cn.vuejs.org/guide/essentials/template-syntax.html)、[Event Handling](https://cn.vuejs.org/guide/essentials/event-handling.html)、[Form Input Bindings](https://cn.vuejs.org/guide/essentials/forms.html)。覆盖范围：模板表达式、指令、列表 key、事件修饰符和表单双向绑定；覆盖动态 HTML、渲染性能、输入法组合事件、空值、键盘与可访问语义。
- 严格考核：首考题 1（资料定位）：只允许使用《Template Syntax》《Event Handling》《Form Input Bindings》，分别摘出能支撑「模板语法、指令、事件与表单」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：闭卷解释「模板语法、指令、事件与表单」覆盖的输入、状态转换、运行边界与失败传播，并用首考题 3 的产出证明机制选择；首考题 3（最小产出）：实现包含条件、列表、事件修饰符、动态表单和校验的页面；排查不稳定 key、模板副作用、错误 `v-if/v-for` 组合和 `v-model` 类型问题；首考题 4（受限排错）：围绕「模板语法、指令、事件与表单」的首考题 3 产出注入正常、边界和失败场景，提交预期/实际、三项资料假设、证伪证据、根因、修复与回归；首考题 5（学习复述）：3 分钟说明「模板语法、指令、事件与表单」解决的问题、运行机制、选型条件、反例和验证证据，并回答边界变化追问。命题边界：只在「模板语法、指令、事件与表单」所列资料和覆盖范围内命题；资料外经验不能替代题目要求的机制与证据。
- 通过标准：DOM 更新稳定；列表 key 使用业务标识；模板只承担声明式渲染；表单空值、数字、复选和自定义组件行为正确。评估边界：缺少与「模板语法、指令、事件与表单」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

### 组件、副作用与逻辑复用

## VUE-04 Props、Emits、Slots 与组件 `v-model`

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Props](https://cn.vuejs.org/guide/components/props.html)、[Component Events](https://cn.vuejs.org/guide/components/events.html)、[Slots](https://cn.vuejs.org/guide/components/slots.html)、[Component v-model](https://cn.vuejs.org/guide/components/v-model.html)。覆盖范围：Props 单向流、Emits 合同、Slots 组合和组件 `v-model`；覆盖属性透传、多模型、事件命名和受控状态所有权。
- 严格考核：首考题 1（资料定位）：只允许使用《Props》《Component Events》《Slots》《Component v-model》，分别摘出能支撑「Props、Emits、Slots 与组件 `v-model`」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：闭卷解释「Props、Emits、Slots 与组件 `v-model`」覆盖的输入、状态转换、运行边界与失败传播，并用首考题 3 的产出证明机制选择；首考题 3（最小产出）：为一个筛选器或编辑器设计类型安全的 Props/Emits/Slots API，同时支持受控值和扩展渲染；审查 6 个直接改 prop 或事件语义混乱的例子；首考题 4（受限排错）：围绕「Props、Emits、Slots 与组件 `v-model`」的首考题 3 产出注入正常、边界和失败场景，提交预期/实际、三项资料假设、证伪证据、根因、修复与回归；首考题 5（学习复述）：3 分钟说明「Props、Emits、Slots 与组件 `v-model`」解决的问题、运行机制、选型条件、反例和验证证据，并回答边界变化追问。命题边界：只在「Props、Emits、Slots 与组件 `v-model`」所列资料和覆盖范围内命题；资料外经验不能替代题目要求的机制与证据。
- 通过标准：单向数据流清晰；事件命名表达业务结果；slot props 类型正确；没有用全局 store 替代正常父子通信。评估边界：缺少与「Props、Emits、Slots 与组件 `v-model`」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## VUE-05 生命周期、`watch`、`watchEffect` 与副作用清理

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Lifecycle Hooks](https://cn.vuejs.org/guide/essentials/lifecycle.html)、[Watchers](https://cn.vuejs.org/guide/essentials/watchers.html)。覆盖范围：组件生命周期、`watch`/`watchEffect` 依赖、flush 时机、清理和竞态；区分派生计算、事件与外部同步。
- 严格考核：首考题 1（资料定位）：只允许使用《Lifecycle Hooks》《Watchers》，分别摘出能支撑「生命周期、`watch`、`watchEffect` 与副作用清理」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：闭卷解释「生命周期、`watch`、`watchEffect` 与副作用清理」覆盖的输入、状态转换、运行边界与失败传播，并用首考题 3 的产出证明机制选择；首考题 3（最小产出）：修复重复请求、旧请求覆盖、监听器泄漏和深度 watch 性能问题；比较 computed、watch 和 watchEffect；实现可取消的数据同步；首考题 4（受限排错）：围绕「生命周期、`watch`、`watchEffect` 与副作用清理」的首考题 3 产出注入正常、边界和失败场景，提交预期/实际、三项资料假设、证伪证据、根因、修复与回归；首考题 5（学习复述）：3 分钟说明「生命周期、`watch`、`watchEffect` 与副作用清理」解决的问题、运行机制、选型条件、反例和验证证据，并回答边界变化追问。命题边界：只在「生命周期、`watch`、`watchEffect` 与副作用清理」所列资料和覆盖范围内命题；资料外经验不能替代题目要求的机制与证据。
- 通过标准：所有外部副作用有清理；快速切换参数结果正确；能说明 flush 时机、immediate/deep 代价，以及为什么生命周期 Hook 不等于机械翻译 useEffect。评估边界：缺少与「生命周期、`watch`、`watchEffect` 与副作用清理」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## VUE-06 Composable、依赖注入与逻辑复用

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Composables](https://cn.vuejs.org/guide/reusability/composables.html)、[Provide / Inject](https://cn.vuejs.org/guide/components/provide-inject.html)。覆盖范围：Composable 的输入输出、响应式约定、清理、依赖注入和可测试性；覆盖隐藏全局状态、调用时机、SSR 作用域、错误传播与逻辑复用边界。
- 严格考核：首考题 1（资料定位）：只允许使用《Composables》《Provide / Inject》，分别摘出能支撑「Composable、依赖注入与逻辑复用」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：闭卷解释「Composable、依赖注入与逻辑复用」覆盖的输入、状态转换、运行边界与失败传播，并用首考题 3 的产出证明机制选择；首考题 3（最小产出）：从知识详情页抽取一个可复用 composable，覆盖响应式输入、取消、错误和卸载；为深层上下文设计带 InjectionKey 的 provide/inject；首考题 4（受限排错）：围绕「Composable、依赖注入与逻辑复用」的首考题 3 产出注入正常、边界和失败场景，提交预期/实际、三项资料假设、证伪证据、根因、修复与回归；首考题 5（学习复述）：3 分钟说明「Composable、依赖注入与逻辑复用」解决的问题、运行机制、选型条件、反例和验证证据，并回答边界变化追问。命题边界：只在「Composable、依赖注入与逻辑复用」所列资料和覆盖范围内命题；资料外经验不能替代题目要求的机制与证据。
- 通过标准：composable 不隐藏关键业务状态；返回值保持响应性与类型；依赖可测试；能说明 composable、自定义 Hook、普通函数和 Pinia store 的边界。评估边界：缺少与「Composable、依赖注入与逻辑复用」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

### 路由、客户端状态与服务器状态

## VUE-07 Vue Router、懒加载与导航守卫

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[动态路由匹配](https://router.vuejs.org/zh/guide/essentials/dynamic-matching.html)、[Route Lazy Loading](https://router.vuejs.org/zh/guide/advanced/lazy-loading.html)、[Navigation Guards](https://router.vuejs.org/zh/guide/advanced/navigation-guards.html)。覆盖范围：Vue Router 路由匹配、嵌套、懒加载、导航守卫、数据获取和错误路径；覆盖深链刷新、重定向循环、权限可见性与服务端授权分工。
- 严格考核：首考题 1（资料定位）：只允许使用《动态路由匹配》《Route Lazy Loading》《Navigation Guards》，分别摘出能支撑「Vue Router、懒加载与导航守卫」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：闭卷解释「Vue Router、懒加载与导航守卫」覆盖的输入、状态转换、运行边界与失败传播，并用首考题 3 的产出证明机制选择；首考题 3（最小产出）：实现嵌套路由、动态参数、懒加载、404、离开未保存页面保护和页面标题；定位一次重复导航或守卫循环；首考题 4（受限排错）：围绕「Vue Router、懒加载与导航守卫」的首考题 3 产出注入正常、边界和失败场景，提交预期/实际、三项资料假设、证伪证据、根因、修复与回归；首考题 5（学习复述）：3 分钟说明「Vue Router、懒加载与导航守卫」解决的问题、运行机制、选型条件、反例和验证证据，并回答边界变化追问。命题边界：只在「Vue Router、懒加载与导航守卫」所列资料和覆盖范围内命题；资料外经验不能替代题目要求的机制与证据。
- 通过标准：深链刷新正常；守卫没有隐藏副作用；路由状态与页面查询条件可恢复；权限最终仍由服务端验证。评估边界：缺少与「Vue Router、懒加载与导航守卫」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## VUE-08 Pinia 与状态分层

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Pinia 定义 Store](https://pinia.vuejs.org/zh/core-concepts/)、[Testing Stores](https://pinia.vuejs.org/zh/cookbook/testing.html)。覆盖范围：Pinia store 边界、state/getter/action、组合式 store、持久化和 SSR；覆盖跨请求污染、派生状态和服务端数据缓存分工。
- 严格考核：首考题 1（资料定位）：只允许使用《Pinia 定义 Store》《Testing Stores》，分别摘出能支撑「Pinia 与状态分层」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：闭卷解释「Pinia 与状态分层」覆盖的输入、状态转换、运行边界与失败传播，并用首考题 3 的产出证明机制选择；首考题 3（最小产出）：为布局偏好和跨页草稿设计 Pinia store；把错误放入 store 的服务端数据迁回 Vue Query；完成 store 单测与持久化边界设计；首考题 4（受限排错）：围绕「Pinia 与状态分层」的首考题 3 产出注入正常、边界和失败场景，提交预期/实际、三项资料假设、证伪证据、根因、修复与回归；首考题 5（学习复述）：3 分钟说明「Pinia 与状态分层」解决的问题、运行机制、选型条件、反例和验证证据，并回答边界变化追问。命题边界：只在「Pinia 与状态分层」所列资料和覆盖范围内命题；资料外经验不能替代题目要求的机制与证据。
- 通过标准：state/getters/actions 职责清楚；没有万能全局 store；服务端缓存与 UI 状态分离；敏感信息不持久化到浏览器。评估边界：缺少与「Pinia 与状态分层」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## VUE-09 Vue Query 与服务器状态

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[本地中文讲义：VUE-09](../chinese-guides/content-audit-10-12.md#vue-09)、[TanStack Query Queries](https://tanstack.com/query/latest/docs/framework/vue/guides/queries)（英文原文，仅用于版本核验）、[TanStack Query Mutations](https://tanstack.com/query/latest/docs/framework/vue/guides/mutations)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：Vue Query 的 query key、缓存、失效、去重、乐观更新和错误恢复；明确 TanStack Query 管理服务器状态，Pinia 管理客户端领域/界面状态，本点是 Vue 赛道可选数据层而非所有 Vue 项目的强制依赖。
- 严格考核：首考题 1（资料定位）：只允许使用《本地中文讲义：VUE-09》，定位 query key、缓存、写入和反例；首考题 2（机制解释）：闭卷解释 key、失效、乐观更新和回滚；首考题 3（最小产出）：输入为知识列表、详情和自评 API，输出为稳定 key 表、查询/自评 mutation、乐观日历拖拽与失败回滚测试；首考题 4（受限排错）：处理 key 漏租户、重复请求、缓存串用户、过度失效和 Pinia 双数据源；首考题 5（学习复述）：说明三类状态的职责。检查：失效范围精确、失败可恢复、服务端授权未被缓存替代。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：query key 稳定；缓存失效范围正确；错误可恢复；不会把 API 数据复制到 Pinia 形成双数据源。评估边界：缺少与「Vue Query 与本地 API 状态」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

### 测试、性能与全栈渲染

## VUE-10 组件测试、性能与生产构建

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Vue Testing Guide](https://cn.vuejs.org/guide/scaling-up/testing.html)、[Vue Performance](https://cn.vuejs.org/guide/best-practices/performance.html)、[Vite Build](https://cn.vite.dev/guide/build)。覆盖范围：Vue 组件测试、响应式异步刷新、性能剖析、懒加载和生产构建分析；覆盖实现细节断言、内存泄漏与 hydration 警告。
- 严格考核：首考题 1（资料定位）：只允许使用《Vue Testing Guide》《Vue Performance》《Vite Build》，分别摘出能支撑「组件测试、性能与生产构建」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：闭卷解释「组件测试、性能与生产构建」覆盖的输入、状态转换、运行边界与失败传播，并用首考题 3 的产出证明机制选择；首考题 3（最小产出）：为一个异步 Vue 页面写用户行为测试；使用 Vue DevTools 或性能记录定位重复更新；检查路由分包和生产产物；修复至少一个真实问题；首考题 4（受限排错）：围绕「组件测试、性能与生产构建」的首考题 3 产出注入正常、边界和失败场景，提交预期/实际、三项资料假设、证伪证据、根因、修复与回归；首考题 5（学习复述）：3 分钟说明「组件测试、性能与生产构建」解决的问题、运行机制、选型条件、反例和验证证据，并回答边界变化追问。命题边界：只在「组件测试、性能与生产构建」所列资料和覆盖范围内命题；资料外经验不能替代题目要求的机制与证据。
- 通过标准：测试不依赖内部实现；连续运行稳定；优化有前后证据；生产构建、懒加载、source map 和本地服务静态托管均有明确配置。评估边界：缺少与「组件测试、性能与生产构建」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## VUE-11 Nuxt 全栈渲染、数据获取与性能

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[本地中文讲义：VUE-11](../chinese-guides/content-audit-10-12.md#vue-11)、[Nuxt Data Fetching](https://nuxt.com.cn/docs/4.x/getting-started/data-fetching)、[Nuxt Rendering Modes](https://nuxt.com/docs/4.x/guide/concepts/rendering)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：Nuxt 4 SSR/SSG/混合路由、数据获取、服务端路由、缓存、hydration 和性能剖析；覆盖跨请求状态、部署适配与客户端降级；稳定概念以 4.x 文档为准并在升级前核对变更记录。
- 严格考核：首考题 1（资料定位）：只允许使用《本地中文讲义：VUE-11》，定位 SSR、payload、缓存和 hydration；首考题 2（机制解释）：解释服务端首屏、客户端接管和导航取数；首考题 3（最小产出）：输入为一个 Vue SPA 列表/详情切片，输出为 Nuxt 4 SSR 页面、客户端导航、服务端路由、首屏 HTML/payload 与构建报告；首考题 4（受限排错）：处理 hydration mismatch、重复取数、错缓存键和未授权请求；首考题 5（学习复述）：说明渲染模式取舍。检查：首屏、接管与导航数据一致，秘密不进客户端，错误页可恢复。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：首屏 HTML、客户端接管和导航数据一致；`useFetch`/`useAsyncData` 的 key、缓存和错误边界明确；敏感逻辑留在服务端；通过键盘和路由播报验证可访问性；提交构建与运行性能前后数据。评估边界：缺少与「Nuxt 4 全栈渲染、数据获取与性能剖析」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## 领域综合考核

- [ ] 已通过领域综合考核
- 任务：使用 Career Atlas 真实架构完成“知识列表 -> 详情学习 -> 自评掌握 -> 日历新增复测”的 Vue 垂直切片，包含 Router、Pinia、Vue Query、Element Plus、composable、组件测试和 E2E。
- 通过标准：8 小时内完成；typecheck、组件测试、E2E 和 build 通过；现场解释每一类状态为何放在组件、Pinia 或 Vue Query；能对照 React 说明至少 5 个相似点与关键差异。评估边界：领域综合考核只依据本领域列出的资料、题目输入和可复核产出；不得用资料外经验替代跨知识点整合证据。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟
