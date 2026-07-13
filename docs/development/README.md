# Career Atlas 开发文档

更新时间：2026-07-13

Career Atlas 是一个本地优先的个人前端成长与求职工作台。它把当前 Markdown/CSV 文档转成可视化知识体系、学习计划、严格考核、学习日历和求职管理系统。

## 已确定的产品决策

| 决策 | 结论 |
| --- | --- |
| 使用者 | 单用户，本机使用 |
| 数据 | SQLite 与本地文件，支持导出和备份 |
| 前端 | Vue 3 + TypeScript + Vite + Element Plus |
| 本地服务 | Node.js + Fastify |
| 数据访问 | Drizzle ORM + SQLite |
| AI | 可替换 Provider，考核默认调用 DeepSeek `deepseek-v4-pro`；密钥只存在本地服务环境变量 |
| 知识图谱 | `@vue-flow/core`，节点与边来自知识点和依赖关系 |
| 日历 | FullCalendar Vue 3 adapter，计划、考核、复测、面试共用事件模型 |
| 内容来源 | 当前 `docs/` 与 `templates/` 作为首次导入种子 |
| 部署 | 本地启动，服务仅绑定 `127.0.0.1` |

`DEEPSEEK_MODEL` 必须可配置，不能把模型名写死。默认使用 `deepseek-v4-pro`；旧模型名 `deepseek-chat` 和 `deepseek-reasoner` 不作为新项目默认值。

Vue 不只是实现技术，也承担学习目标。开发过程必须同步维护 Vue 学习说明，解释从脚手架、Composition API、路由、Pinia、Vue Query、组件测试到构建发布的完整流程，让用户能沿着真实代码学习 Vue 项目开发。

## 文档阅读顺序

1. [产品需求](01-product-requirements.md)
2. [信息架构与视觉交互](02-information-architecture-and-ux.md)
3. [技术架构](03-technical-architecture.md)
4. [数据模型与内容导入](04-data-model-and-content-import.md)
5. [AI 考核系统](05-ai-assessment-system.md)
6. [本地 API 与状态机](06-local-api-and-state-machines.md)
7. [测试与验收](07-testing-and-acceptance.md)
8. [实施路线](08-implementation-roadmap.md)
9. [Vue 项目学习路线](09-vue-learning-plan.md)
10. [GLM-5 系统提示词](prompts/glm-5-system-prompt.md)
11. [GLM-5 启动提示词](prompts/glm-5-kickoff-prompt.md)
12. [运行时考核评分器提示词](prompts/runtime-assessment-judge-system-prompt.md)

## 需求优先级

- P0：本地数据、文档导入、知识清单、学习阅读、日历、打卡、求职岗位管理、备份。
- P1：知识图谱、AI 问答考核、自动评分、状态自动流转、复测。
- P2：代码沙箱考核、统计洞察、智能排期、面试模拟和更多图谱关系。

## 成功标准

- 92 个现有知识点全部导入，资料、考核和通过标准不丢失。
- 用户可以在网站完成学习、自评掌握、参加考核、查看反馈和自动更新状态。
- 所有计划、打卡、岗位和考核记录在断网时仍可查看和编辑。
- 删除数据库后可以从导出文件恢复全部用户数据。
- 不依赖云端账号系统；除主动调用模型外，不发送任何本地数据。
