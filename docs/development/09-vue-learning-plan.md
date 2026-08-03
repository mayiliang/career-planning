# Vue 项目学习路线

更新时间：2026-07-13

这份路线把 Career Atlas 的开发过程同时当作 Vue 训练项目。目标不是先看完一套教程再开始编码，而是在真实功能中依次掌握项目创建、组件设计、状态管理、数据请求、测试和构建，并留下可复习、可考核的证据。

掌握挑战、资料与学习状态统一维护在 [Vue 3 项目开发知识清单](../knowledge/knowledge-base/11-vue-development.md)。开发时还必须持续更新 `docs/vue-learning-guide.md`，用仓库中的真实文件讲解已经完成的实现。

## 固定技术栈

| 能力 | 选型 | 学习重点 |
| --- | --- | --- |
| 基础框架 | Vue 3、TypeScript、Vite | SFC、Composition API、`<script setup lang="ts">`、开发与构建流程 |
| 路由 | Vue Router | 路由表、嵌套路由、参数、守卫和懒加载 |
| 本地共享状态 | Pinia | store 边界、getter、action、持久化偏好；不引入 Vuex |
| 服务端状态 | `@tanstack/vue-query` | 查询缓存、失效、mutation、乐观更新和错误恢复 |
| UI | Element Plus | 主题 Token、表单、可访问性和二次封装边界 |
| 通用组合逻辑 | VueUse | 优先复用成熟 composable，避免重复造轮子 |
| 图谱与日历 | `@vue-flow/core`、`@fullcalendar/vue3` | 第三方 Vue 组件集成、受控状态和性能 |
| 测试 | Vitest、Vue Test Utils、Testing Library Vue、Playwright | 组合逻辑、组件行为、跨页面业务闭环 |

## 随开发阶段学习

| 开发阶段 | Vue 学习主题 | 必须留下的产出 |
| --- | --- | --- |
| Phase 0 | Vite、SFC、模板语法、响应式、开发服务器与构建 | 能解释入口文件、根组件、环境变量和一次完整构建 |
| Phase 1 | 类型化 API client、composable、Vue Query 基础 | 内容导入查询与 mutation，并能说明缓存何时失效 |
| Phase 2 | 组件通信、表单、Router、Pinia、Element Plus | 知识详情垂直切片与组件测试；说明状态为何放在对应层 |
| Phase 3 | 日历组件集成、派生状态、拖拽交互 | 计划改期和打卡闭环；避免用 `watch` 复制派生状态 |
| Phase 4 | Vue Flow、自定义节点、图谱性能 | 双环节点、折叠和键盘等价路径；提供性能测量 |
| Phase 5 | 流式/异步 UI、错误恢复、考核状态机呈现 | DeepSeek 考核提交、等待、人工复核和失败恢复界面 |
| Phase 6-7 | 复杂表单、跨模块复用、图表 | 求职支线和统计页面，提炼可复用 composable 与组件 |
| Phase 8 | 测试分层、按需加载、构建分析 | 完整测试证据、构建产物分析和 Vue 学习总结 |

## React 到 Vue 的思维映射

这张表只帮助迁移已有经验，不能把 Vue 代码机械写成 React 风格。

| React 常用概念 | Vue 3 对应概念 | 关键差异 |
| --- | --- | --- |
| JSX 组件 | SFC 的 template/script/style | Vue 模板有指令和编译期优化，逻辑仍放在 TypeScript 中 |
| `useState` | `ref` / `reactive` | `ref` 在脚本中用 `.value`，模板会自动解包 |
| `useMemo` | `computed` | `computed` 用依赖追踪缓存，优先表达派生状态 |
| `useEffect` | `watch` / `watchEffect` / 生命周期钩子 | 不要默认把所有副作用都塞进 `watchEffect`；先判断是否真需要副作用 |
| 自定义 Hook | composable | composable 以 `use` 开头，返回响应式值并明确清理副作用 |
| props + callback | props + emits | 事件需要声明和类型化，子组件不直接改 props |
| controlled input | `v-model` | 自定义组件使用 `modelValue` / `update:modelValue` 协议 |
| Context | `provide` / `inject` | 适合局部依赖注入，不代替全局 store |
| Redux/Zustand | Pinia | 只放跨页面客户端状态；接口数据交给 Vue Query |
| React Query | Vue Query | 核心缓存模型接近，但组合式 API 和响应式参数不同 |
| React Testing Library | Testing Library Vue + Vue Test Utils | 业务断言优先面向用户行为，底层组件能力用 VTU |

## `docs/vue-learning-guide.md` 编写规范

每完成一个相关垂直切片，就增加一节，至少包括：

1. 本节解决的真实业务问题和对应需求 ID。
2. 涉及的真实文件路径、组件树和数据流。
3. 使用的 Vue 概念，以及为什么选 `ref`、`computed`、composable、Pinia 或 Vue Query。
4. 与 React 思维模型的简短对照。
5. 一个常见错误或本项目中主动避免的反模式。
6. 可以独立完成的小练习、验证命令和预期结果。
7. 对应 `VUE-*` 知识点与考核证据位置。

不要复制官方教程正文，也不要记录尚未实现的伪代码为“项目示例”。真实代码变化后，同步修订对应章节。

## Vue 代码约束

- 默认使用 Composition API 和 `<script setup lang="ts">`，不混用 Options API。
- props、emits、路由参数、API DTO 和 store 都保持严格类型。
- 模板只放轻量展示表达式，复杂业务逻辑进入 `computed`、函数或 composable。
- 能由现有状态推导的值使用 `computed`，不要再复制一份状态并用 `watch` 同步。
- 组件私有状态使用 `ref/reactive`；跨页面 UI 状态和偏好才进入 Pinia；服务端状态进入 Vue Query。
- composable 必须说明所有权和生命周期，注册监听或定时器时负责清理。
- 组件测试关注用户可见行为，不断言 Vue 内部实现细节。

## 学习完成判定

完成页面或写过代码不等于掌握。每个 `VUE-*` 知识点都必须依次满足：

1. 能脱离资料解释概念、边界和常见失败模式。
2. 能在 Career Atlas 的真实代码中指出对应实现和数据流。
3. 完成知识清单规定的闭卷问答、编码或项目任务。
4. 需要掌握证据时完成 M1～M3；至少 7 天后通过变式可达到 M4。
