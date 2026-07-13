# 个人定制前端成长计划：8 小时/天版本

更新时间：2026-07-13  
适用对象：5 年前端开发，长期负责 Web/H5 系统，技术栈集中在 React、Umi/Max、Ant Design、Ant Design Mobile、TypeScript、业务中后台、移动端、组件包和内部工具。

## 这份计划的定位

你的主线不是“为了跳槽临时背题”，而是把过去 5 年分散在项目里的经验，升级成可迁移、可表达、可持续成长的能力体系。求职只是近期最直接的验证方式。

学习时先看[前端知识体系](../knowledge/frontend-knowledge-system.md)，再从[可勾选知识掌握清单](../knowledge/knowledge-base/README.md)选择当天知识点。每个学习任务都要绑定稳定编号、项目案例、考核证据和复测记录；只看完资料不能算掌握。

你现在每天有 8 小时，这是一个很好的窗口期。正确用法不是把 8 小时都塞满课程，而是按“输入、实战、输出、复盘、求职反馈”分配。

```text
每天 8 小时 = 2 小时系统学习 + 3 小时项目实战 + 1 小时输出沉淀 + 1 小时面试/求职校准 + 1 小时复盘与补漏
```

## 基于你项目的能力画像

我读取了这些项目：

- `/Users/bob/Documents/web/gungnir-web`
- `/Users/bob/Documents/h5/gungnir-h5`
- `/Users/bob/Documents/web/teaching-web`
- `/Users/bob/Documents/web/digitalteacher-web`
- `/Users/bob/Documents/h5/digitalteacher-h5`
- `/Users/bob/Documents/h5/teaching-h5`
- `/Users/bob/Documents/package/aiui`
- `/Users/bob/Documents/app/get_apidoc`

### 项目结构观察

| 项目 | 类型 | 主要技术/依赖 | 能力信号 |
| --- | --- | --- | --- |
| gungnir-web | 大型 Web 中后台 | Umi Max 4、React 18、AntD 5、ProComponents、TypeScript、AntV、拖拽、PDF、Excel、虚拟列表、地图、富文本、AIUI | 复杂中后台、权限菜单、业务流程、组件沉淀、接口联调、可视化、文件处理 |
| gungnir-h5 | 大型 H5 | Umi 4、React 18、AntD Mobile、企业微信/钉钉、Agora、地图、视频、签名、KeepAlive、F2/F6 | 移动端适配、Hybrid/企业应用、H5 业务闭环、多媒体 |
| teaching-web | 教学 Web 系统 | Umi Max、React、AntD、ProComponents、AIUI、富文本、PDF、视频 | 教学业务中后台、AI 教学组件接入、内容编辑与媒体 |
| digitalteacher-web | 数字教师 Web | Umi Max、React、AntD、ByteMD、Markdown、PDF 高亮、视频、AIUI、Framer Motion | AI 教学、知识内容、Markdown/公式/代码高亮、资料与问答场景 |
| digitalteacher-h5 | 数字教师 H5 | Umi Max、React、AntD Mobile、AIUI、企业微信/钉钉、Markdown、视频 | 移动端 AI 学习场景、课程问答、预习研讨、分享 |
| teaching-h5 | 教学 H5 | Umi Max、AntD Mobile、F2、企业微信/钉钉、KeepAlive、移动适配 | H5 表单、评价、督导、教学档案 |
| aiui | 前端组件/类库 | father、React peerDependency、TypeScript strict、Markdown、KaTeX、Excel、PDF 导出 | 组件库/包开发、构建发布、AI 对话 UI、类型声明 |
| get_apidoc | Node/TypeScript 工具 | MCP SDK、Zod、YAML、tsup、commander、测试 | CLI/MCP 工具、接口文档解析、类型推断、工具化能力 |

### 你已经具备的能力

1. **大型业务系统经验**：页面规模和服务接口数量都说明你不是只做简单页面，尤其 `gungnir-web` 的 `src/pages` 和 `src/services` 规模很大。
2. **React + Umi/Max + AntD 业务栈**：这是你的主战场，也是短期求职最该强化表达的核心。
3. **Web/H5 双端经验**：你不是单纯中后台前端，也做过企业微信、钉钉、移动端、视频、地图、签名、移动表单等场景。
4. **业务抽象经验**：组件目录里有权限、自动表单、自动表格、导入、下载、地图编辑、PDF、虚拟列表、富文本、趋势、详情 Tabs 等公共能力。
5. **工具化意识**：`get_apidoc` 说明你已经开始从业务开发走向“工具解决问题”，这是高级前端的重要信号。
6. **组件包/类库经验**：`aiui` 使用 father 构建，带 peerDependencies 和类型声明，说明你接触过可复用包的发布形态。
7. **TypeScript 基础不弱**：多个项目开启 `strict: true`，`aiui` 还开启了 `noUncheckedIndexedAccess`。

### 你可能欠缺或需要系统补强的能力

这些不是说你不会，而是从项目侧看，最值得系统化：

| 能力 | 当前判断 | 为什么要补 |
| --- | --- | --- |
| React 原理与性能体系 | 有大量实践，但需要理论化 | 面试和高级岗位都需要讲清渲染、状态、性能边界 |
| TypeScript 高级类型建模 | 项目开启 strict，但业务类型可能仍偏接口声明 | 要从“会写类型”升级到“用类型约束业务模型” |
| 前端测试体系 | 大型业务项目中显式测试文件较少，get_apidoc 有测试 | 高级前端要能推动质量，而不是只靠人工验收 |
| 工程化深度 | 用 Umi/Max/father/tsup，但需要理解构建原理 | 未来做平台/架构需要解释构建、包、发布、性能 |
| 性能诊断闭环 | 有 H5/Web 场景，但需要指标化 | 要能从 DevTools/Lighthouse 指标定位和证明优化 |
| 组件库设计系统 | 有 aiui 和公共组件，但需要 API 设计方法论 | 能把业务组件升级成团队资产 |
| Node/BFF/工具开发 | get_apidoc 是很好起点 | 可以提高上限，支持 MCP、CLI、接口治理、自动化 |
| 前端架构表达 | 你做过复杂项目，但需要文档化表达 | 面试、晋升、负责人路线都依赖方案表达 |
| AI 工具链 | 项目有 AIUI，但需要把 AI 变成研发提效能力 | 未来前端竞争力会越来越依赖 AI 辅助研发 |

## 你的能力发展主路径

建议主路径定为：

```text
高级 React 业务前端
  -> 中后台/H5 复杂业务 Owner
  -> 前端工程化 + 组件平台能力
  -> 资深前端/前端技术负责人
```

短期不要把主线切到纯 Node、纯算法、纯低代码或纯 AI。它们都是加分项，但你的优势来自“复杂业务 + React/Umi/AntD/H5 + 工具化”。

## 每天 8 小时学习安排

### 标准日程

| 时间段 | 内容 | 目标 | 产出 |
| --- | --- | --- | --- |
| 09:00-09:30 | 复盘与计划 | 明确今天只抓 1 个主线问题 | 今日任务清单 |
| 09:30-11:00 | 系统学习 | 看官方文档/课程/源码文章，并挂到知识树 | 结构化知识卡片 |
| 11:00-12:00 | 面试基础/手写题 | JS、TS、React、浏览器轮换 | 1-2 道题 |
| 14:00-16:30 | 项目实战 | 在你的项目或练习项目里落地 | 代码、Demo、重构 |
| 16:30-17:30 | 项目复盘/技术方案 | 把实战转成可表达资产 | 文档或图 |
| 19:30-20:30 | 求职校准 | JD 分析、简历、模拟面试 | 投递/问题清单 |
| 20:30-21:00 | 当日复盘 | 总结问题与明日计划 | 复盘记录 |

### 每天的硬性规则

- 每天只允许 1 个主学习主题，避免发散。
- 每个知识点必须使用[知识掌握清单](../knowledge/knowledge-base/README.md)中的编号，并写明它属于[前端知识体系](../knowledge/frontend-knowledge-system.md)的哪个分支。
- “自评已掌握”和“已通过严格考核”必须分开勾选，通过状态以闭卷考核、代码/项目证据和 7 天复测为准。
- 每天必须有 1 个可见产出：代码、笔记、方案、复盘、题解、简历片段都可以。
- 每周至少有 1 个项目级产出：Demo、重构 PR、组件封装、性能报告、测试样例、方案文档。
- 每两周做一次模拟面试，把学习转成表达。

## 16 周定制成长计划

### 第 1-2 周：项目资产盘点与表达重建

目标：把你已经做过的项目变成职业资产。

任务：

- 从 8 个项目里选 4 个代表作：一个 Web 中后台、一个 H5、一个 AI 教学/AIUI、一个工具化项目。
- 每个项目写一份复盘：背景、业务对象、核心流程、技术难点、你的方案、结果、反思。
- 画出 `gungnir-web` 或 `digitalteacher-web` 的前端架构图：路由、布局、权限、请求、服务、组件、业务页。
- 为 `get_apidoc` 写一份工具设计说明：输入、输出、缓存、类型推断、MCP 工具注册。

产出：

- [项目经验资产库](../knowledge/project-assets.md)
- 4 篇项目复盘
- 1 张架构图
- 简历项目经历第一版

### 第 3-4 周：TypeScript 深度与业务类型建模

目标：从“会写 TS”升级到“用 TS 表达业务约束”。

学习路径：

- 官方文档：TypeScript Handbook
- 练习方向：泛型、条件类型、映射类型、类型收窄、工具类型、类型体操适度即可
- 项目结合：从 `src/services`、表单、表格、枚举、审核状态里抽类型模型

实战任务：

- 为一个审批流写 `Status -> Action -> Permission -> UI` 的类型模型。
- 为 AntD/ProTable 列配置写泛型辅助类型。
- 重构一个 `any` 较多的业务模块。
- 给 `get_apidoc` 的 OpenAPI schema 推断逻辑写类型说明。

产出：

- `../topics/typescript-business-modeling.md`
- 20 道 TS 面试题答案
- 1 个类型建模代码样例

### 第 5-6 周：React 原理、状态与性能

目标：能讲清 React 为什么这样工作，以及复杂页面如何优化。

学习路径：

- 官方文档：React Learn、React Reference
- 重点：状态快照、批处理、Hooks 依赖、Effect 生命周期、Context、memo、useMemo、useCallback、虚拟列表
- 项目结合：`gungnir-web` 的表格、详情、弹窗、Workspace、CampusJob；`aiui` 的聊天 UI

实战任务：

- 选一个复杂页面，画组件树和状态流。
- 优化一个表格/列表/聊天消息渲染场景。
- 写一个自定义 Hook：请求状态、表单草稿、权限动作、滚动定位任选。
- 对比 `react-window`、虚拟列表和普通列表的适用边界。

产出：

- `../topics/react-state-performance.md`
- 1 个复杂组件性能优化记录
- 20 道 React 面试题答案

### 第 7-8 周：中后台业务建模与 Umi/AntD 专精

目标：把你最强的业务经验系统化。

学习路径：

- Umi 官方文档：路由、运行时配置、插件、请求、权限
- Ant Design 官方文档：Form、Table、Modal、Upload、ConfigProvider
- ProComponents：ProTable、ProForm、ProLayout
- 项目结合：`gungnir-web` 的 Layout、菜单、权限、服务、自动表格/自动表单

实战任务：

- 设计一套“审核流页面模板”：列表、详情、操作按钮、状态流、权限流。
- 抽象一个“字典/枚举显示工具”。
- 总结 AntD Form 动态联动、异步校验、只读态、编辑态统一方案。
- 梳理 Umi `getInitialState`、layout、路由菜单、请求错误处理链路。

产出：

- `../topics/enterprise-admin-patterns.md`
- 一个审核流 Demo 或页面模板
- 中后台面试题 30 题

### 第 9-10 周：H5、移动端与 Hybrid

目标：把你的 H5 经验从“做过”变成“有方法论”。

学习路径：

- MDN：响应式、Web APIs、表单、媒体、可访问性
- Chrome DevTools：设备模拟、Network、Performance、Memory、Application
- web.dev：性能、图片、PWA、表单
- 项目结合：`gungnir-h5`、`digitalteacher-h5`、`teaching-h5`

实战任务：

- 写一份 H5 适配方案：viewport、rem/vw、安全区、键盘、滚动、横竖屏。
- 写一份企业微信/钉钉 JS SDK 接入排查清单。
- 对一个 H5 页面做 Lighthouse 或 DevTools 性能分析。
- 梳理视频、音频、地图、签名、KeepAlive 的常见坑。

产出：

- `../topics/h5-hybrid-playbook.md`
- H5 性能分析报告
- H5 面试题 20 题

### 第 11-12 周：工程化、构建与质量体系

目标：补齐高级前端最容易拉开差距的部分。

学习路径：

- Vite 官方指南
- Webpack Concepts
- Umi Max 构建配置
- father 文档和 `aiui` 构建
- tsup 文档和 `get_apidoc` 构建
- Testing Library、Playwright

实战任务：

- 分析一个 Umi 项目的构建产物和依赖体积。
- 给一个工具函数或组件补单元测试。
- 给一个关键流程写 Playwright E2E。
- 梳理 `aiui` 从源码到 `dist/cjs`、`dist/esm`、`.d.ts` 的发布链路。
- 给 `get_apidoc` 增加测试覆盖说明。

产出：

- `../topics/frontend-engineering-quality.md`
- 1 个测试样例
- 1 份构建/包体分析记录

### 第 13-14 周：组件库、AIUI 与平台化

目标：把公共组件经验升级成平台能力。

学习路径：

- Ant Design 设计原则
- ProComponents 组件设计思路
- father 构建类库
- Storybook 或 Dumi 组件文档
- `aiui` 源码：聊天、Markdown、公式、代码高亮、复制、导出

实战任务：

- 给 `aiui` 写组件 API 文档。
- 设计一个可复用 Chat UI 组件：消息模型、渲染块、输入、工具栏、导出。
- 补一组组件使用示例。
- 设计版本管理和破坏性变更说明模板。

产出：

- `../topics/aiui-component-design.md`
- 1 套组件 API 文档
- 1 个示例页面

### 第 15-16 周：Node 工具、MCP、AI 辅助研发

目标：把 `get_apidoc` 发展成你的差异化能力。

学习路径：

- Node.js 官方 Learn
- MCP 官方文档与 TypeScript SDK
- Zod
- tsup
- OpenAPI/Swagger 基础
- OpenAI Platform 文档，了解 AI 应用开发基本概念

实战任务：

- 重构 `get_apidoc`：缓存、错误处理、类型推断、测试、CLI 参数。
- 写一个“从 API 文档生成前端 service/types 的设计方案”。
- 设计 AI 辅助工作流：读接口、生成类型、生成页面草稿、生成测试、代码审查。
- 总结 AI 工具的使用边界：不能替代需求理解、业务边界和最终验收。

产出：

- `../topics/api-tooling-and-ai-workflow.md`
- `get_apidoc` 改进计划
- AI 辅助研发流程图

## 所有核心技能的学习路径与资源

### 1. JavaScript 与浏览器基础

学习目标：

- 能解释运行机制、异步、事件循环、原型、闭包。
- 能定位浏览器渲染、缓存、跨域、安全、内存问题。

学习资源：

- MDN Learn Web Development：`https://developer.mozilla.org/en-US/docs/Learn_web_development`
- MDN JavaScript：`https://developer.mozilla.org/en-US/docs/Web/JavaScript`
- javascript.info：`https://javascript.info/`
- Chrome DevTools：`https://developer.chrome.com/docs/devtools/`

学习方式：

- 每天读 1 个主题，写“现象、原理、项目场景、面试表达”。
- 用 DevTools 复现：Network 缓存、Performance 火焰图、Memory 快照、Application 存储。
- 把你项目里的登录态、token、缓存、下载、跨域、白屏问题整理成案例。

掌握标准：

- 能从浏览器链路解释白屏、接口失败、缓存不更新、内存上涨、页面卡顿。

### 2. TypeScript

学习目标：

- 能用类型表达业务对象、状态、权限、接口、表单。
- 能写泛型工具，而不只是声明接口。

学习资源：

- TypeScript Docs：`https://www.typescriptlang.org/docs/`
- TypeScript Handbook：`https://www.typescriptlang.org/docs/handbook/intro.html`
- type-challenges：`https://github.com/type-challenges/type-challenges`
- ts-pattern：`https://github.com/gvergnaud/ts-pattern`

学习方式：

- 从你的 `src/services` 中选真实接口建模。
- 把审核状态、操作按钮、权限矩阵做成类型约束。
- 每周做 5 道 type-challenges，重点是理解，不追求难题数量。

掌握标准：

- 能在项目里减少 `any`，能让错误在编码期暴露。

### 3. React

学习目标：

- 理解组件、状态、Hooks、Effect、Context、性能优化。
- 能设计复杂组件的状态边界。

学习资源：

- React Learn：`https://react.dev/learn`
- React Reference：`https://react.dev/reference/react`
- React DevTools：`https://react.dev/learn/react-developer-tools`
- TanStack Query：`https://tanstack.com/query/latest/docs/framework/react/overview`

学习方式：

- 按 React 官方文档顺序补：Managing State、Escape Hatches、Hooks Reference。
- 从 `aiui` 聊天组件和 `gungnir-web` 复杂表格页中画组件树。
- 每周写一个自定义 Hook。

掌握标准：

- 能讲清 useEffect 依赖、闭包、重复请求、状态提升、Context 性能、memo 边界。

### 4. Umi/Max

学习目标：

- 理解路由、运行时配置、layout、initialState、请求、插件、构建。

学习资源：

- Umi 文档：`https://umijs.org/docs/introduce/introduce`
- Max 文档入口：`https://umijs.org/docs/max/introduce`
- Umi 插件：`https://umijs.org/docs/api/config`

学习方式：

- 以 `gungnir-web/src/app.tsx` 为主线，梳理初始化、菜单、权限、布局。
- 对比 Web 与 H5 项目的 Umi 配置差异。
- 总结一次你遇到的 Umi 白屏/构建问题排查链路。

掌握标准：

- 能独立搭建一个 Umi 中后台骨架，并解释运行时配置和构建配置。

### 5. Ant Design / Ant Design Mobile / ProComponents

学习目标：

- 精通复杂表单、表格、弹窗、上传、布局、主题、移动端组件。

学习资源：

- Ant Design：`https://ant.design/docs/react/introduce/`
- Ant Design Mobile：`https://mobile.ant.design/`
- ProComponents：`https://procomponents.ant.design/`

学习方式：

- 以 Form/Table 为核心，每天复盘一个复杂场景。
- 做一个审核流页面模板。
- 抽象只读态、编辑态、详情态、错误态。

掌握标准：

- 能设计可复用的查询表格、复杂表单、详情展示、批量操作、导入导出。

### 6. H5 / 移动端 / Hybrid

学习目标：

- 掌握移动端适配、兼容、性能、企业微信/钉钉 SDK、媒体能力。

学习资源：

- MDN Responsive Design：`https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design`
- web.dev Performance：`https://web.dev/learn/performance`
- Chrome DevTools Device Mode：`https://developer.chrome.com/docs/devtools/device-mode`
- 企业微信 JS-SDK：`https://developer.work.weixin.qq.com/document/path/90514`
- 钉钉 JSAPI：`https://open.dingtalk.com/document/orgapp-client/read-before-development`

学习方式：

- 从 `gungnir-h5` 和 `digitalteacher-h5` 选 3 个页面做适配/性能/兼容复盘。
- 用真机或模拟器检查键盘、滚动、安全区、视频、文件下载。
- 做 H5 问题排查清单。

掌握标准：

- 能独立负责一个企业级 H5 应用，从适配到上线排查。

### 7. 工程化与构建

学习目标：

- 理解 Vite/Webpack/Umi/father/tsup 的角色和构建链路。
- 能优化构建速度、包体积、发布稳定性。

学习资源：

- Vite Guide：`https://vite.dev/guide/`
- Webpack Concepts：`https://webpack.js.org/concepts/`
- pnpm Workspaces：`https://pnpm.io/workspaces`
- npm Workspaces：`https://docs.npmjs.com/cli/v11/using-npm/workspaces/`
- father：`https://github.com/umijs/father`
- tsup：`https://tsup.egoist.dev/`

学习方式：

- 分析 `aiui` 的 father 构建和 `get_apidoc` 的 tsup 构建。
- 对 Umi 项目跑一次 analyze，记录大依赖和优化思路。
- 设计 Monorepo 下组件包、业务项目、工具包的协作方式。

掌握标准：

- 能解释打包产物、模块格式、tree-shaking、代码分割、缓存、workspace。

### 8. 测试与质量

学习目标：

- 能为工具函数、组件、关键业务流程建立测试。

学习资源：

- React Testing Library：`https://testing-library.com/docs/react-testing-library/intro/`
- Playwright：`https://playwright.dev/docs/intro`
- Vitest：`https://vitest.dev/`
- Node.js Test Runner：`https://nodejs.org/learn/test-runner/introduction`

学习方式：

- 先从 `get_apidoc` 的测试入手，补纯函数测试。
- 再给 `aiui` 写组件行为测试。
- 最后给一个 Umi 页面写 E2E：登录态 mock、列表查询、表单提交。

掌握标准：

- 能说清单测、组件测、E2E 分别测什么，能推动关键链路自动化。

### 9. 性能优化

学习目标：

- 从指标、工具、原因、方案、收益形成闭环。

学习资源：

- web.dev Learn Performance：`https://web.dev/learn/performance`
- Lighthouse：`https://developer.chrome.com/docs/lighthouse/performance/performance-scoring`
- Chrome Performance Panel：`https://developer.chrome.com/docs/devtools/performance`
- PageSpeed Insights：`https://pagespeed.web.dev/`

学习方式：

- 每周选一个页面做性能报告。
- 指标优先：LCP、INP、CLS、TBT、资源体积、主线程耗时。
- 结合项目依赖：视频、Markdown、PDF、Excel、图表、AIUI 都可能是性能风险点。

掌握标准：

- 能用数据说明问题和收益，不只会列“懒加载、压缩、缓存”。

### 10. 组件库与设计系统

学习目标：

- 能设计组件 API、文档、示例、版本、主题和兼容策略。

学习资源：

- Ant Design 设计价值观：`https://ant.design/docs/spec/introduce`
- Dumi：`https://d.umijs.org/`
- Storybook：`https://storybook.js.org/docs`
- father：`https://github.com/umijs/father`

学习方式：

- 以 `aiui` 为核心，把聊天 UI 做成一个可展示的组件库案例。
- 写每个组件的 Props、事件、插槽/渲染扩展点、边界状态。
- 增加示例和变更日志模板。

掌握标准：

- 能让别人用你的组件，而不是只能你自己维护。

### 11. Node.js / CLI / MCP / 接口工具

学习目标：

- 能写 Node 工具、CLI、MCP Server，解决团队效率问题。

学习资源：

- Node.js Learn：`https://nodejs.org/learn/getting-started/introduction-to-nodejs`
- MCP Intro：`https://modelcontextprotocol.io/docs/getting-started/intro`
- MCP TypeScript SDK：`https://github.com/modelcontextprotocol/typescript-sdk`
- Zod：`https://zod.dev/`
- Commander：`https://github.com/tj/commander.js`

学习方式：

- 继续扩展 `get_apidoc`：服务发现、接口搜索、类型推断、缓存、错误提示、测试。
- 做一个代码生成器：API 文档 -> TypeScript types -> service function。
- 写工具设计文档和使用说明。

掌握标准：

- 能把重复工作工具化，并把工具变成团队可用资产。

### 12. AI 辅助研发

学习目标：

- 让 AI 成为需求拆解、代码审查、测试生成、文档生成、接口理解的工具。

学习资源：

- OpenAI Platform：`https://platform.openai.com/`
- Chrome DevTools AI / DevTools for agents：`https://developer.chrome.com/docs/devtools/`
- MCP 官方文档：`https://modelcontextprotocol.io/docs/getting-started/intro`

学习方式：

- 每天固定一个 AI 工作流实验：让 AI 读接口、改类型、写测试、生成方案、审查代码。
- 所有 AI 输出必须经过项目真实代码验证。
- 把有效 prompt 沉淀成模板。

掌握标准：

- 你不是“用 AI 替自己写代码”，而是能设计 AI 参与研发流程，提高交付质量。

## 每周产出节奏

| 周期 | 必须产出 |
| --- | --- |
| 每天 | 1 篇短笔记或 1 段代码/题解 |
| 每 3 天 | 1 个项目案例复盘 |
| 每周 | 1 个可展示成果：Demo、测试、性能报告、方案文档、组件文档 |
| 每 2 周 | 1 次模拟面试和错题复盘 |
| 每 4 周 | 1 次简历更新和能力地图更新 |

## 学习材料管理方式

按下面的目录维护计划、资产、专题产出和执行表：

```text
career-planning/
  README.md
  docs/
    plans/
      personalized-frontend-mastery-plan.md
    knowledge/
      frontend-knowledge-system.md
      project-assets.md
    topics/
      interview-question-bank.md
      weekly-review.md
      skill-resource-map.md
  templates/
    learning-tracker-template.csv
  demos/
```

每个知识点按这个模板记录：

```text
主题：
为什么要学：
官方资料：
项目对应场景：
我做的练习：
踩坑：
面试表达：
还能继续深入：
```

## 你的下一步

今天就可以开始，不需要再等完整资料。

### 今天 8 小时任务

1. 用 1 小时列出你参与最深的 10 个项目模块。
2. 用 2 小时写 `gungnir-web` 的项目复盘第一版。
3. 用 1 小时读 React 官方 `Managing State`。
4. 用 2 小时找一个复杂表单/表格页面，画组件树和状态流。
5. 用 1 小时写 5 道 React/TS 面试题。
6. 用 1 小时复盘：今天哪些内容能写进简历或面试表达。

### 本周目标

- 写完 2 个项目复盘。
- 形成一张个人技能雷达图文字版。
- 完成 10 道 TS、10 道 React、5 道浏览器题。
- 选定一个 Demo：审核流中后台、AI 聊天组件、API 文档工具三选一。
