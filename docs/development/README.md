# Career Atlas 开发文档

更新时间：2026-08-18

Career Atlas 是单用户、自主节奏的高级前端学习工作台。Markdown 文档是知识内容真源，SQLite 保存用户状态、笔记、练习、挑战、打卡和求职数据；浏览器不持有 AI 密钥。

## 当前产品决策

| 主题 | 结论 |
| --- | --- |
| 学习节奏 | 不生成每日强制学习任务；用户选择当前知识点，打卡记录实际学习 |
| 学习完成 | 用户完成资料和笔记后主动标记“已学完” |
| 掌握判定 | 完全可选的 M1～M4 掌握挑战；M3 为已掌握，M4 为稳定掌握 |
| 路线 | 唯一后续自动连续；当前线路结束后才展示方向选择 |
| 笔记 | 原始 Markdown 永不被 AI 覆盖；AI 候选稿需用户接受 |
| 练习 | 有练习就必须有明确输入、输出、完成标准和站内工作区 |
| AI | Fastify 服务端调用可替换兼容接口；正文、thinking、进度分流式事件 |
| 数据 | SQLite + 本地数据目录 + 版本与备份 |
| 前端 | Vue 3、TypeScript、Vite、Element Plus |
| 后端 | Node.js、Fastify、Drizzle ORM、SQLite |
| 部署 | 本地或私有服务器；无内置公网认证，不可裸露公网 |

## 阅读顺序

1. [产品需求](01-product-requirements.md)
2. [信息架构与交互](02-information-architecture-and-ux.md)
3. [技术架构](03-technical-architecture.md)
4. [数据模型与内容导入](04-data-model-and-content-import.md)
5. [AI 与掌握挑战](05-ai-assessment-system.md)
6. [API 与状态机](06-local-api-and-state-machines.md)
7. [测试与验收](07-testing-and-acceptance.md)
8. [现代 Markdown 与 AI 流式协议](10-modern-markdown-and-ai-streaming.md)
9. [运行时评分器提示词](prompts/runtime-assessment-judge-system-prompt.md)
10. [服务器支持与部署](../deployment/server-support.md)
11. [实施状态](implementation-status.md)

早期的阶段实施路线、GLM-5 生成提示词、固定 64 周个人计划和重复职业路线已经移除。Git 历史可用于追溯，当前文档只维护实际产品口径。

## 变更同步矩阵

| 变更 | 同步文档 |
| --- | --- |
| 学习、掌握、路线、打卡规则 | `01`、`02`、根 README |
| Vue 页面、组件和交互 | `02`、对应 feature/component 测试；框架学习合同归 `docs/knowledge/knowledge-base/11-vue-development.md` |
| 依赖、包边界、渲染与性能 | `03`、`10` |
| 表、迁移、导入 | `04` |
| AI 提示、评分、thinking | `05`、`06`、`10`、运行时提示词（评分边界变化时） |
| API 或状态机 | `06` |
| 测试、计数、验收命令 | `07`、`implementation-status.md` |
| 部署、端口、环境变量 | 根 README、服务器支持文档、`.env.example` |
| 知识点或资料 | `docs/knowledge/` 对应文件与内容门禁 |

## 完成定义

- 数据库、API、前端 DTO、UI 与文档口径一致。
- 用户原始笔记和历史版本不因迁移或 AI 操作丢失。
- 相关单元测试、类型检查、构建和关键 E2E 通过。
- AI 失败有中文错误或安全降级，不产生伪造的完成/掌握状态。
- 新功能具备键盘、响应式、安全和性能验收，而不只是可点击。
