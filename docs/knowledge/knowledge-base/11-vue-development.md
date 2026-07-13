# 11 Vue 3 项目开发

所有“通过”均需满足[统一考核规则](00-assessment-rules.md)。本领域必须使用 Career Atlas 的真实 Vue 代码作为学习和考核证据，不能只完成孤立 Demo。

## VUE-01 Vite 脚手架、SFC 与项目结构

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Vue Quick Start](https://vuejs.org/guide/quick-start.html)、[Single-File Components](https://vuejs.org/guide/scaling-up/sfc.html)、[Vite Guide](https://vite.dev/guide/)。
- 严格考核：闭卷解释 `createApp`、SFC 编译、`<script setup>`、样式作用域和 Vite 开发/构建流程；从零搭建一个严格 TypeScript Vue 应用并说明目录边界。
- 通过标准：应用可 dev/build/typecheck；不混用 Options API；能从入口追踪到路由、页面和组件，并说明 SFC 与 React 组件模块的差异。

## VUE-02 `ref`、`reactive`、`computed` 与响应式边界

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Reactivity Fundamentals](https://vuejs.org/guide/essentials/reactivity-fundamentals.html)、[Computed Properties](https://vuejs.org/guide/essentials/computed.html)、[Reactivity in Depth](https://vuejs.org/guide/extras/reactivity-in-depth.html)。
- 严格考核：完成 10 道响应式预测题；修复解构丢失响应性、错误嵌套 ref、可变 computed 和重复派生状态；为真实筛选页选择正确状态形态。
- 通过标准：至少 9/10 正确；能解释依赖追踪、自动解包和 shallow API 边界；不会用 watch 维护本可 computed 的状态。

## VUE-03 模板语法、指令、事件与表单

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Template Syntax](https://vuejs.org/guide/essentials/template-syntax.html)、[Event Handling](https://vuejs.org/guide/essentials/event-handling.html)、[Form Input Bindings](https://vuejs.org/guide/essentials/forms.html)。
- 严格考核：实现包含条件、列表、事件修饰符、动态表单和校验的页面；排查不稳定 key、模板副作用、错误 `v-if/v-for` 组合和 `v-model` 类型问题。
- 通过标准：DOM 更新稳定；列表 key 使用业务标识；模板只承担声明式渲染；表单空值、数字、复选和自定义组件行为正确。

## VUE-04 Props、Emits、Slots 与组件 `v-model`

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Props](https://vuejs.org/guide/components/props.html)、[Component Events](https://vuejs.org/guide/components/events.html)、[Slots](https://vuejs.org/guide/components/slots.html)、[Component v-model](https://vuejs.org/guide/components/v-model.html)。
- 严格考核：为一个筛选器或编辑器设计类型安全的 Props/Emits/Slots API，同时支持受控值和扩展渲染；审查 6 个直接改 prop 或事件语义混乱的例子。
- 通过标准：单向数据流清晰；事件命名表达业务结果；slot props 类型正确；没有用全局 store 替代正常父子通信。

## VUE-05 生命周期、`watch`、`watchEffect` 与副作用清理

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Lifecycle Hooks](https://vuejs.org/guide/essentials/lifecycle.html)、[Watchers](https://vuejs.org/guide/essentials/watchers.html)。
- 严格考核：修复重复请求、旧请求覆盖、监听器泄漏和深度 watch 性能问题；比较 computed、watch 和 watchEffect；实现可取消的数据同步。
- 通过标准：所有外部副作用有清理；快速切换参数结果正确；能说明 flush 时机、immediate/deep 代价，以及为什么生命周期 Hook 不等于机械翻译 useEffect。

## VUE-06 Composable、依赖注入与逻辑复用

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Composables](https://vuejs.org/guide/reusability/composables.html)、[Provide / Inject](https://vuejs.org/guide/components/provide-inject.html)。
- 严格考核：从知识详情页抽取一个可复用 composable，覆盖响应式输入、取消、错误和卸载；为深层上下文设计带 InjectionKey 的 provide/inject。
- 通过标准：composable 不隐藏关键业务状态；返回值保持响应性与类型；依赖可测试；能说明 composable、自定义 Hook、普通函数和 Pinia store 的边界。

## VUE-07 Vue Router、懒加载与导航守卫

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Vue Router Guide](https://router.vuejs.org/guide/)、[Route Lazy Loading](https://router.vuejs.org/guide/advanced/lazy-loading.html)、[Navigation Guards](https://router.vuejs.org/guide/advanced/navigation-guards.html)。
- 严格考核：实现嵌套路由、动态参数、懒加载、404、离开未保存页面保护和页面标题；定位一次重复导航或守卫循环。
- 通过标准：深链刷新正常；守卫没有隐藏副作用；路由状态与页面查询条件可恢复；权限最终仍由服务端验证。

## VUE-08 Pinia 与状态分层

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Pinia Core Concepts](https://pinia.vuejs.org/core-concepts/)、[Defining a Store](https://pinia.vuejs.org/core-concepts/)、[Testing Stores](https://pinia.vuejs.org/cookbook/testing.html)。
- 严格考核：为布局偏好和跨页草稿设计 Pinia store；把错误放入 store 的服务端数据迁回 Vue Query；完成 store 单测与持久化边界设计。
- 通过标准：state/getters/actions 职责清楚；没有万能全局 store；服务端缓存与 UI 状态分离；敏感信息不持久化到浏览器。

## VUE-09 Vue Query 与本地 API 状态

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[TanStack Query Vue Overview](https://tanstack.com/query/latest/docs/framework/vue/overview)、[Queries](https://tanstack.com/query/latest/docs/framework/vue/guides/queries)、[Mutations](https://tanstack.com/query/latest/docs/framework/vue/guides/mutations)。
- 严格考核：实现知识列表查询、详情缓存、自评 mutation、乐观日历拖拽、失败回滚和精确失效；分析 query key 与重复请求问题。
- 通过标准：query key 稳定；缓存失效范围正确；错误可恢复；不会把 API 数据复制到 Pinia 形成双数据源。

## VUE-10 组件测试、性能与生产构建

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Vue Test Utils](https://test-utils.vuejs.org/guide/)、[Vue Testing Guide](https://vuejs.org/guide/scaling-up/testing.html)、[Vue Performance](https://vuejs.org/guide/best-practices/performance.html)、[Vite Build](https://vite.dev/guide/build)。
- 严格考核：为一个异步 Vue 页面写用户行为测试；使用 Vue DevTools 或性能记录定位重复更新；检查路由分包和生产产物；修复至少一个真实问题。
- 通过标准：测试不依赖内部实现；连续运行稳定；优化有前后证据；生产构建、懒加载、source map 和本地服务静态托管均有明确配置。

## 领域综合考核

- [ ] 已通过领域综合考核
- 任务：使用 Career Atlas 真实架构完成“知识列表 -> 详情学习 -> 自评掌握 -> 日历新增复测”的 Vue 垂直切片，包含 Router、Pinia、Vue Query、Element Plus、composable、组件测试和 E2E。
- 通过标准：8 小时内完成；typecheck、组件测试、E2E 和 build 通过；现场解释每一类状态为何放在组件、Pinia 或 Vue Query；能对照 React 说明至少 5 个相似点与关键差异。
