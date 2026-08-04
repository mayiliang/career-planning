# AI 时代高级前端知识库

更新时间：2026-08-04

本目录是 20 个稳定能力组、223 个知识点的结构化内容真源。文件内的 `###` 标题是必须持久化的二级主题，`## CODE` 是可独立验证的知识点。每个知识点有稳定编号、二级主题、能力层、AI 关系、要求级别、成熟度、主适用范围、多重适用标签、学习路线、横向主题标签、核验日期、降级策略和主题边界。

## 文件索引

| 文件 | 领域 |
| --- | --- |
| `01-javascript-browser.md` | Web 平台核心基础 |
| `02-typescript.md` | TypeScript |
| `03-react.md` | React |
| `04-umi-antd.md` | 中后台框架与组件生态 |
| `05-business-modeling.md` | 复杂业务建模 |
| `06-engineering-quality.md` | 工程、测试、Git 与质量 |
| `07-performance-h5.md` | 性能、移动 Web 与媒体交付 |
| `08-components-platform.md` | 组件系统与多运行时交付 |
| `09-node-api-ai.md` | Node.js 服务与接口工具 |
| `10-career-expression.md` | 项目证据、职业表达与影响力 |
| `11-vue-development.md` | Vue 3 工程开发 |
| `12-ai-native-frontend.md` | AI 原生前端应用 |
| `13-agents-mcp.md` | Agent、MCP 与协议 |
| `14-browser-ai-local-inference.md` | 浏览器 AI、本地推理与加速 |
| `15-ai-assisted-engineering.md` | AI 辅助研发与平台工程 |
| `16-linux-docker-deployment.md` | Linux、容器与生产交付 |
| `17-rendering-data-realtime.md` | 渲染、数据、实时与离线 |
| `18-graphics-experiment-i18n.md` | 图形可视化、增长内容、全球化与兼容治理专项 |
| `19-identity-privacy-ai-safety.md` | 身份、隐私与 AI 风险治理 |
| `20-architecture-leadership-infrastructure.md` | 架构领导力与基础设施协作 |

## 使用规则

1. 由系统推荐或用户选择一个知识点作为当前学习点。
2. 阅读资料并完成 Markdown 笔记后，由用户标记“已学完”。
3. 有明确练习契约时可以在站内实践；它是理解工具，不是所有知识点的强制阶段。
4. 掌握挑战完全可选。M3 表示独立掌握，M4 表示延迟变式后的稳定掌握。
5. 唯一直接后续自动推进；连续线路结束才选择新方向。
6. 每日打卡记录实际学习事实，不从固定周计划生成任务。

## 资料规则

- 必读和独立挑战题源优先使用官方中文或高质量中文文档。
- 缺少稳定中文版时，由 `chinese-guides/` 中逐点中文讲义补足定义、机制、边界、示例与验证方法；资料必须链接到精确标题锚点，系统会把该链接转换为站内资料页，只展示对应知识点章节。
- 每一份当前资料自身的主要正文都必须直接服务于该知识点，目标相关度不低于约 80%；不能用综合首页、目录页或仅有零散相关段落的长文充数。多份资料组合后还应恰好覆盖定义、机制、适用条件、边界/失败模式和验证方法，避免重复堆叠同一内容。
- 英文一手资料只能明确标为“版本核验”，不得成为用户必须阅读才能回答的隐藏题源。
- 提示必须能定位到具体资料和章节；需要举一反三时必须给出系统整理的依据与推导过程。
- `project-assets.md` 中标记为待完成的项目只是可选证据，不是知识真源、学习前置或考核的隐藏输入。

## 状态规则

- `learningState`：未开始、学习中、已学完、暂缓。
- `masteryLevel`：M0～M4，与学习状态独立。
- 只有显式 `PREREQUISITE` 是硬前置；文档相邻或推荐顺序不自动变成阻塞关系。
- 未选择的支线仍可再次出现；暂缓/放弃只有用户明确操作才成立。

详细规则见[学习资料与练习指南](../learning-resource-guide.md)和[自主学习路线](../../plans/self-paced-learning-route.md)。
