# 学习资料与耗时使用指南

更新时间：2026-07-28

本指南服务于 20 个领域、190 个知识点。知识点文件中的链接负责精确命中主题，本页负责说明资料优先级、连续学习主干、证据要求和耗时口径。

## 资料准入规则

按以下顺序选择资料：

1. 当前版本的规范、标准、官方文档或项目维护方文档。
2. 官方维护的中文文档；若中文版本落后，则使用当前英文原文，并为关键术语补充中文笔记。
3. 官方课程、示例仓库、迁移指南和安全公告。
4. 高质量书籍、论文、课程或技术文章，只作辅助解释，不能替代原始依据。

每个知识点至少需要两份可交叉验证的资料，并明确覆盖定义、机制、边界、反例、练习与考核依据。版本敏感主题必须写清当前版本；实验性 Web/AI API 必须包含能力检测、稳定性状态和降级方案。

## 五阶段掌握协议

1. 资料精读：先写 3 个待验证问题，再读取直达资料，整理定义、机制、边界和反例。
2. 机制练习：完成最小正例、反例或故障注入，并保留 DevTools、类型、测试或日志证据。
3. 项目产出：迁移到真实项目，留下代码、测试、ADR、性能报告、威胁模型或部署记录。
4. 严格首考：依次完成资料定位、机制解释、最小产出、受限排错和学习复述；达到 80 分且无关键否决项。
5. 延迟复测：首考至少 7 天后，不看原答案完成变式题；失败则回到对应阶段重学。

首次掌握耗时只计算前四阶段，复测单列。计划的 390 分钟是每日容量上限，不是必须填满的配额。

## 官方连续学习主干

| 能力域 | 优先资料 | 使用重点 |
| --- | --- | --- |
| Web、浏览器、可访问性 | [MDN 中文 Web 文档](https://developer.mozilla.org/zh-CN/docs/Web)、[web.dev Learn 中文入口](https://web.dev/learn?hl=zh-cn)、[W3C WAI](https://www.w3.org/WAI/fundamentals/) | 语义、CSS、事件、渲染、网络、存储、性能和可访问性 |
| JavaScript、TypeScript | [MDN JavaScript 中文指南](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide)、[TypeScript 中文手册](https://www.typescriptlang.org/zh/docs/handbook/intro.html)、[TSConfig](https://www.typescriptlang.org/tsconfig/) | 运行模型、类型建模、类型测试和编译边界 |
| React | [React 中文学习文档](https://zh-hans.react.dev/learn)、[React API](https://zh-hans.react.dev/reference/react) | 渲染、状态、Hook、Effect、并发与异步边界 |
| Vue、Nuxt | [Vue 中文指南](https://cn.vuejs.org/guide/introduction.html)、[Vue TypeScript](https://cn.vuejs.org/guide/typescript/overview.html)、[Nuxt 文档](https://nuxt.com/docs/getting-started/introduction) | 响应式、组合式 API、状态、测试、性能和 SSR |
| 中后台与组件系统 | [Ant Design 中文文档](https://ant.design/docs/react/introduce-cn)、[Umi Max](https://umijs.org/docs/max/introduce)、[WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/) | 业务组件、权限、设计 Token、可访问交互与平台治理 |
| 数据、API、实时与离线 | [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview)、[OpenAPI](https://spec.openapis.org/oas/latest.html)、[GraphQL](https://graphql.org/learn/)、[MDN Service Worker](https://developer.mozilla.org/zh-CN/docs/Web/API/Service_Worker_API) | Server State、契约、缓存、冲突、实时恢复和离线 |
| 工程、测试、供应链 | [Vite](https://vite.dev/guide/)、[Vitest](https://vitest.dev/guide/)、[Playwright](https://playwright.dev/docs/intro)、[pnpm](https://pnpm.io/workspaces)、[Sigstore](https://docs.sigstore.dev/cosign/signing/overview/) | 可重复构建、验证金字塔、CI 门禁、依赖与制品可信 |
| 安全、身份、隐私 | [OWASP Cheat Sheet](https://cheatsheetseries.owasp.org/)、[OAuth 2.1](https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/)、[OpenID Connect](https://openid.net/developers/how-connect-works/)、[W3C Privacy Principles](https://www.w3.org/TR/privacy-principles/) | 不可信输入输出、会话、授权、数据最小化和威胁建模 |
| 性能、图形与体验 | [web.dev Performance](https://web.dev/learn/performance/)、[WebGL](https://developer.mozilla.org/zh-CN/docs/Web/API/WebGL_API)、[WebGPU](https://www.w3.org/TR/webgpu/)、[Intl](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Intl) | 测量、预算、图形管线、国际化与兼容性 |
| Node、Linux、容器与云 | [Node.js Learn](https://nodejs.org/en/learn)、[Linux man-pages](https://www.kernel.org/doc/man-pages/)、[Docker](https://docs.docker.com/)、[Nginx](https://docs.nginx.com/nginx/admin-guide/)、[Kubernetes Concepts](https://kubernetes.io/docs/concepts/) | CLI/服务、进程与网络、镜像、编排、部署、观测和回滚 |
| AI 应用与产品 | [OpenAI API 文档](https://platform.openai.com/docs/overview)、[Vercel AI SDK](https://ai-sdk.dev/docs/introduction)、[OWASP LLM Top 10](https://genai.owasp.org/llm-top-10/) | 任务价值、流式 UI、结构化输出、RAG、评估、安全与成本 |
| Agent 与 MCP | [MCP 官方文档](https://modelcontextprotocol.io/docs/getting-started/intro)、[MCP TypeScript SDK v2](https://github.com/modelcontextprotocol/typescript-sdk)、[MCP 2026 发布说明](https://blog.modelcontextprotocol.io/posts/2026-mcp-release/) | 无状态传输、工具/资源/提示词、任务、授权、可观测性与兼容 |
| 浏览器 AI 与 AI 研发 | [Chrome Built-in AI](https://developer.chrome.com/docs/ai/built-in)、[web.dev AI](https://web.dev/learn/ai/)、[GitHub Copilot 责任使用](https://docs.github.com/en/copilot/responsible-use) | 能力检测、本地推理、Worker、隐私、验证和团队治理 |
| 架构与领导力 | [Google SRE](https://sre.google/books/)、[AWS Well-Architected](https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html)、[Google 技术写作中文课程](https://developers.google.com/tech-writing/two?hl=zh-cn) | 质量属性、ADR、渐进迁移、可靠性、成本、评审和表达 |

单个知识点的精确资料仍以[知识库](knowledge-base/README.md)为准。

## 默认耗时档位

| 类型 | 资料 | 练习 | 项目 | 首考 | 首次掌握 | 复测 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 基础机制 | 90 | 150 | 135 | 90 | 465 | 75 |
| 框架、业务、体验 | 105 | 165 | 150 | 90 | 510 | 75 |
| 工程、安全、数据、交付 | 120 | 180 | 165 | 105 | 570 | 90 |
| AI、Agent、架构与治理 | 135 | 195 | 180 | 105 | 615 | 90 |

全部 190 个知识点已显式填写耗时；默认档位只用于新知识点或遗漏字段。所有时间按 15 分钟取整。

## 资料失效维护

- 每月抽查实际使用过的链接；每季度执行一次全库版本审计。
- 404、重定向到无关页面或版本过期时，优先替换为同一官方来源的新入口。
- 中文译文与原文冲突时，以当前官方原文为准，并在学习笔记说明差异。
- MCP、浏览器 AI、框架主版本、隐私和安全规范属于高变动内容，每月检查一次。
- 新资料进入知识库前，必须说明覆盖哪个知识点、支持哪一类考核、预期留下什么证据。
