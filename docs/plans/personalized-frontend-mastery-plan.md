# 个人定制前端成长计划：至少 500 分钟/天版本

更新时间：2026-07-22
适用对象：5 年前端开发，长期负责 Web/H5 系统，技术栈集中在 React、Umi/Max、Ant Design、Ant Design Mobile、TypeScript、业务中后台、移动端、组件包和内部工具。

## 这份计划的定位

你的主线不是“为了跳槽临时背题”，而是把过去 5 年分散在项目里的经验，升级成可迁移、可表达、可持续成长的能力体系。求职只是近期最直接的验证方式。

学习时先看[前端知识体系](../knowledge/frontend-knowledge-system.md)，再从[可勾选知识掌握清单](../knowledge/knowledge-base/README.md)选择当天知识点。每个学习任务都要绑定稳定编号、项目案例、考核证据和复测记录；只看完资料不能算掌握。

你现在每天有大块完整时间，这是一个很好的窗口期。正确用法不是把时间都塞满课程，而是按“输入、实战、考核、输出、复盘、求职反馈”分配。

```text
每天核心学习 540 分钟 = 110 分钟资料精读 + 90 分钟机制练习 + 120 分钟项目实战 + 80 分钟严格考核 + 50 分钟输出沉淀 + 90 分钟复盘与补弱
```

2026-07-22 重排说明：这次计划按“资料强关联 + 五段式考核 + 显式耗时”重构。153 个知识点都已写入覆盖范围、命题边界、评估边界和五阶段预计分钟数；计划生成时按这些分钟数从当前日期连续排布，周一到周日保持 540 分钟强度，没有休息日概念。

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

## 每天至少 500 分钟学习安排

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

## 23 周定制成长计划

这次重排以最新 16 个领域、153 个知识点、知识图谱前置关系和显式分阶段耗时为依据。全部知识点首次掌握合计约 85,050 分钟，如果每天保持 540 分钟，需要约 158 天。因此路线从 20 周升级为 **23 周**：前 18 个阶段按知识依赖覆盖全部知识点，第 19-20 周做求职材料、岗位匹配和薄弱项补考，第 21-22 周沉淀项目资产和部署交付证据，第 23 周完成综合答辩与求职启动。Linux、Docker、Nginx、CI/CD 和回滚不再是附录，而是高级前端交付能力主线。

日历不再按“知识点数量”平均分配，也不再把某个阶段硬塞进一周。它会把每个知识点的资料、练习、项目、首考分钟数连续切成 23 × 7 个学习桶；单点最短首次掌握耗时 465 分钟，AI、部署、平台和职业表达类知识点会达到 570-615 分钟，较重主题自然跨天推进，但每天总负载稳定在 540 分钟。

| 周次 | 阶段 | 主题与知识范围 | 项目锚点 | 周验收结果 |
| --- | --- | --- | --- | --- |
| 1 | 基础底座 | `JS-01` 至 `NET-01` | 浏览器机制实验室 | 语言、CSS、可访问性、渲染与网络实验集 |
| 2 | 基础底座 | `SEC-01` 至 `TS-08` | 安全边界与审核流类型模型 | 安全修复证据与可编译业务类型模型 |
| 3 | 框架与业务 | `TS-09` 至 `VUE-10` | Career Atlas Vue 功能迭代 | 类型工程与 Vue 完整开发链路 |
| 4 | 框架与业务 | `VUE-11`、`REACT-01` 至 `REACT-09` | 双框架复杂页面对照实验 | Vue 生产边界与 React 原理、性能证据 |
| 5 | 框架与业务 | `UMI-01` 至 `BIZ-04` | gungnir-web 审核流模板 | 中后台标准实现与业务建模前半段 |
| 6 | 工程与平台 | `BIZ-05` 至 `ENG-05` | CampusJob 契约与质量流水线 | 业务闭环、构建与质量门禁 |
| 7 | 工程与质量 | `TEST-01` 至 `OBS-01` | get_apidoc 质量与发布流水线 | 测试、发布、供应链和 RUM 诊断闭环 |
| 8 | 部署交付 | `LINUX-01` 至 `DEPLOY-02` | Career Atlas 容器化部署 | Linux、Docker、Compose、Nginx、CI/CD 和回滚演练 |
| 9 | 体验性能 | `PERF-01` 至 `H5-03` | 移动端性能与容器兼容专项 | 性能、H5、Hybrid、媒体和真机问题诊断 |
| 10 | 工程与平台 | `PERF-05` 至 `PLATFORM-03` | aiui 组件平台专项 | 可访问体验、组件库、设计系统和平台治理 |
| 11 | 工具化 | `NODE-01` 至 `AI-01` | get_apidoc MCP 工具链 | Node、CLI、OpenAPI、类型生成、MCP Tool 和 AI 辅助研发验证 |
| 12 | AI 原生能力 | `AIAPP-01` 至 `AIAPP-08` | Career Atlas DeepSeek 考核链路 | AI 应用工程、RAG、Prompt Injection 与模型评估 |
| 13 | AI 原生能力 | `AIAPP-09` 至 `AGENT-06` | 可恢复的学习评测 Agent | AI 成本可靠性、Agent Loop、审批和长任务恢复 |
| 14 | AI 原生能力 | `AGENT-07` 至 `WEBAI-04` | 最小权限 Agent 与本地推理实验 | 多 Agent、MCP 安全、回放和浏览器 AI 基础 |
| 15 | AI 原生能力 | `WEBAI-05` 至 `AIDEV-01` | 本地语义搜索 PWA | 本地 AI、离线能力、端云路由和规格驱动研发 |
| 16 | AI 工程治理 | `AIDEV-02` 至 `AIDEV-09` | AI 研发质量门禁 | AI 辅助研发、评审、AST 改写和供应链治理 |
| 17 | 影响力转译 | `AIDEV-10` 至 `CAREER-04` | 四个代表项目资产包 | AI 治理、项目复盘、架构图、ADR 和故障复盘 |
| 18 | 影响力转译 | `CAREER-05` 至 `CAREER-06` | 高级前端面试资产库 | 技术推动、代码评审、教学表达和模拟面试 |
| 19 | 求职与补强 | 项目资产整合、求职材料与薄弱项补考 | 简历、作品集与岗位匹配表 | 简历、项目作品集、岗位匹配、补考和模拟面试 |
| 20 | 求职与补强 | 岗位匹配、模拟面试与薄弱项复测 | 杭州高级前端求职作战台 | 岗位 JD 深挖、简历迭代、模拟面试和补弱证据 |
| 21 | 项目资产 | 代表项目作品集与架构表达 | 四个代表项目资产包 | 架构图、ADR、性能报告、质量证据和项目故事线 |
| 22 | 项目资产 | 生产化交付、部署与回滚演练 | Career Atlas 2.0 生产化交付 | Docker 部署、Nginx 缓存、备份恢复、监控排障和回滚 |
| 23 | 综合闸门 | 高级前端毕业答辩与求职启动 | 高级前端能力答辩包 | 可运行产品、测试/性能/部署报告、作品集、简历和盲测计划 |

### 每周 7 天固定学习节奏

每天仍按至少 500 分钟执行，但每天的目的不同，避免把七天都做成低质量“看资料”。周日不休息，只是把任务主题切成综合闸门、项目答辩和复盘校准。

日历以 15 分钟为最小单位连续安排“资料 → 练习 → 项目 → 首考”，必要时同一知识点会跨两个工作日；页面会明确显示当天只需完成哪个阶段及其分钟数。下面的星期节奏是当天的主要关注点，不代表把其他已排入的阶段删掉。

| 日期 | 重点 | 必须完成的任务 | 可验收产出 |
| --- | --- | --- | --- |
| 周一 | 建立心智模型 | 精读资料，画概念、输入输出和前置关系 | 概念图、闭卷复述录音 |
| 周二 | 机制实验 | 用最小 Demo、DevTools 或源码断点验证结论 | 可运行实验、观察记录 |
| 周三 | 边界与反例 | 做故障注入、反例和高级面试连续追问 | 错题卡、边界用例 |
| 周四 | 真实项目迁移 | 把知识用于本周项目锚点，记录取舍与风险 | 项目增量、ADR |
| 周五 | 严格日检 | 闭卷问答、限时编码或方案设计；未过则补学再测 | DeepSeek 评分、修订证据 |
| 周六 | 关系整合 | 更新知识图谱，完成跨知识点综合题 | 关系图、综合题解 |
| 周日 | 综合闸门 | 闭卷 + 限时实作 + 项目证据答辩 + 下周重排 | 周考报告、可演示里程碑 |

### 严格通过与复测规则

- 日检由知识点自身的 `assessmentSpec` 和 `passCriteria` 出题，不能用统一的简单题替代。
- 周闸门总分至少 80 分，且安全、正确性、测试、核心机制等关键项不得出现否决项。
- 复测按“当天闭卷回忆 → 次日 15 分钟复述 → 7 天严格复测 → 30 天迁移题”执行。
- 某知识点前置项未通过时，日历必须显示“前置待补”；允许学习，但不允许标记严格通过。
- 每周至少保留一项可运行项目证据。第 19 周开始把这些证据集中转成简历和面试表达，求职模块保持支线定位。
- 第 23 周完成 4 小时综合实作、部署回滚演练和 90 分钟答辩；7 天后盲测仍通过，才算完成整个路线。

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

### 今天至少 500 分钟任务

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
