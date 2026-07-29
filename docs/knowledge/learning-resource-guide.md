# 学习资料与耗时使用指南

更新时间：2026-07-29

本指南服务于 20 个领域、219 个知识点。知识点文件中的链接负责精确命中主题，本页负责说明资料优先级、连续学习主干、证据要求和耗时口径。

## 资料准入规则

按以下顺序选择资料：

1. 当前版本的规范、标准、官方文档或项目维护方文档。
2. 官方维护的中文文档，或与官方原文同步的高质量中文镜像。
3. 没有稳定中文版时，必须先提供与知识点一一对应的项目内中文核心讲义；英文官方原文只能用于核对 API、协议字段和版本变化。
4. 官方课程、示例仓库、迁移指南和安全公告。
5. 高质量书籍、论文、课程或技术文章，只作辅助解释，不能替代原始依据。

每个知识点至少需要两份可交叉验证的资料，并且**全部必读资料和独立首考题源都必须是中文**。中文资料须明确覆盖定义、机制、边界和主要误区；不能只把英文链接改成中文标题。版本敏感主题必须写清当前版本；实验性 Web/AI API 必须包含能力检测、稳定性状态和降级方案。

英文资料只有一种合法角色：**可选的版本核验原文**。每条英文链接都必须紧邻标注“英文原文，仅用于版本核验”，所在知识点必须有对应的中文核心讲义，并在学习范围和考核边界中明确它“不作为必读或独立首考题源”。只要保留英文链接，首考资料定位题就必须写明“只允许使用《中文核心讲义》”，且不能再列第二份题源。未满足任一条件，内容门禁直接失败。

中文核心讲义不能只是英文资料的短摘要。内容门禁按中文外部资料数量设置最低章节深度：没有中文外部资料时至少 200 字，只有 1 份时至少 140 字，已有 2 份及以上时仍至少 120 字；章节必须与知识编号一一对应，并实际解释机制、失败边界和验收方法。自动检查还会拒绝旧式“围绕标题学习”“给一个失败现象”等弱模板，以及短到无法界定机制、反例和验收边界的覆盖范围。

当前 219 个知识点的中文必读资料覆盖率为 **219/219**。主流技术优先使用官方中文页面；缺少稳定中文版的主题由[高级与前沿主题中文核心讲义](chinese-guides/advanced-topics.md)和[核心与生态主题中文伴读](chinese-guides/core-and-ecosystem-topics.md)逐点补足。保留英文原文的知识点均执行上述可选核验规则。

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
| Web、浏览器、算法与可访问性 | [MDN 中文 Web 文档](https://developer.mozilla.org/zh-CN/docs/Web)、[MDN 中文 Web 表单](https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Extensions/Forms)、[MDN 中文 ARIA](https://developer.mozilla.org/zh-CN/docs/Web/Accessibility/ARIA)、[OI Wiki](https://oi-wiki.org/) | 语义、CSS、数据结构与复杂度、事件、调试、渲染、网络、Web Components 和可访问性 |
| JavaScript、TypeScript | [MDN JavaScript 中文指南](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide)、[TypeScript 中文手册](https://ts.nodejs.cn/docs/handbook/intro.html)、[TSConfig 中文参考](https://www.typescriptlang.org/zh/tsconfig/) | 运行模型、类型建模、类型测试和编译边界 |
| Git 与协作 | [Pro Git 中文版](https://git-scm.com/book/zh/v2)、[GitHub 拉取请求中文文档](https://docs.github.com/zh/pull-requests)、[Git 中文核心讲义](chinese-guides/core-and-ecosystem-topics.md#git-01) | 对象与引用、暂存区、恢复、分支、合并、变基、冲突、PR、worktree 与 Agent 隔离 |
| React | [React 中文学习文档](https://zh-hans.react.dev/learn)、[React API](https://zh-hans.react.dev/reference/react) | 渲染、状态、Hook、Effect、并发与异步边界 |
| Vue、Nuxt | [Vue 中文指南](https://cn.vuejs.org/guide/introduction.html)、[Vue TypeScript](https://cn.vuejs.org/guide/typescript/overview.html)、[Nuxt 中文文档](https://nuxt.com.cn/docs/getting-started/introduction) | 响应式、组合式 API、状态、测试、性能和 SSR |
| 中后台、UX 与多运行时 | [Ant Design 中文文档](https://ant.design/docs/react/introduce-cn)、[Umi Max](https://umijs.org/docs/max/introduce)、[MDN 中文 ARIA](https://developer.mozilla.org/zh-CN/docs/Web/Accessibility/ARIA)、[核心与生态主题中文伴读](chinese-guides/core-and-ecosystem-topics.md#ux-01) | 业务组件、权限、设计 Token、可用性、复杂编辑器/IME、嵌入式 SDK、第三方宿主、扩展、桌面容器、跨平台原生与平台治理 |
| 数据、API、实时与离线 | [核心与生态主题中文伴读](chinese-guides/core-and-ecosystem-topics.md)、[MDN 中文 IndexedDB](https://developer.mozilla.org/zh-CN/docs/Web/API/IndexedDB_API)、[MDN 中文 Service Worker](https://developer.mozilla.org/zh-CN/docs/Web/API/Service_Worker_API)；TanStack Query、OpenAPI、GraphQL 英文原文仅按具体知识点标注后用于版本核验 | Server State、契约、缓存、本地优先数据库/同步、冲突、实时恢复、离线、安装、Share Target 与推送 |
| 工程、测试、供应链 | [Vite 中文文档](https://cn.vite.dev/guide/)、[Vitest 中文文档](https://cn.vitest.dev/guide/)、[Playwright 中文文档](https://playwright.nodejs.cn/docs/intro)、[pnpm 中文文档](https://pnpm.node.org.cn/workspaces)、[中文核心讲义](chinese-guides/advanced-topics.md) | 可重复构建、验证金字塔、消费者驱动契约、CI 门禁、依赖与制品可信 |
| 安全、身份、隐私 | [高级与前沿主题中文核心讲义](chinese-guides/advanced-topics.md)、[核心与生态主题中文伴读](chinese-guides/core-and-ecosystem-topics.md)；安全和身份标准英文原文仅按具体知识点标注后用于版本核验 | 不可信输入输出、会话、授权、数据最小化和威胁建模 |
| 性能、图形、SEO 与全球化 | [核心与生态主题中文伴读](chinese-guides/core-and-ecosystem-topics.md)、[MDN 中文 WebGL](https://developer.mozilla.org/zh-CN/docs/Web/API/WebGL_API)、[Google 中文 SEO 指南](https://developers.google.com/search/docs/fundamentals/get-started-developers?hl=zh-cn)、[MDN 中文 Intl](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Intl) | 测量、预算、图形管线、抓取索引、国际化与兼容性 |
| Node、Linux、容器与云 | [Node.js 中文文档](https://nodejs.cn/)、[Node HTTP/BFF 中文讲义](chinese-guides/core-and-ecosystem-topics.md#node-04)、[中文核心讲义](chinese-guides/advanced-topics.md#linux-01)、[Docker 中文文档](https://docker.cadn.net.cn/)、[Nginx 中文文档](https://nginx.org/cn/docs/)、[Kubernetes 中文概念](https://kubernetes.io/zh-cn/docs/concepts/) | CLI、HTTP/BFF、超时/取消/背压/幂等/优雅停机、进程与网络、镜像、编排、部署、观测和回滚 |
| AI 应用与产品 | [高级与前沿主题中文核心讲义](chinese-guides/advanced-topics.md)、[核心与生态主题中文伴读](chinese-guides/core-and-ecosystem-topics.md)、[MDN 中文 WebRTC](https://developer.mozilla.org/zh-CN/docs/Web/API/WebRTC_API)；厂商 API、SDK 和安全规范英文原文仅按具体知识点标注后用于版本核验 | 任务价值、流式 UI、会话与长期记忆、AG-UI/A2UI/MCP Apps、实时语音、生成式媒体、RAG、分层评估、安全、来源与成本 |
| Agent 与 MCP | [MCP 中文核心讲义](chinese-guides/advanced-topics.md#mcp-01)、[A2A 中文核心讲义](chinese-guides/advanced-topics.md#agent-11)；MCP、A2A 规范和 SDK 英文原文仅按具体知识点标注后用于版本核验 | 无状态传输、工具/资源/提示词、跨 Agent 任务、身份授权、可观测性、安全与兼容 |
| 浏览器 AI、Web Agent 与 AI 研发 | [Chrome Built-in AI 中文页面](https://developer.chrome.com/docs/ai/built-in?hl=zh-cn)、[Chrome WebMCP 中文文档](https://developer.chrome.com/docs/ai/webmcp?hl=zh-cn)、[web.dev AI 中文页面](https://web.dev/learn/ai/?hl=zh-cn)、[GitHub Copilot 责任使用中文文档](https://docs.github.com/zh/copilot/responsible-use) | 能力检测、WebGPU/WebNN/Wasm、本地推理、Worker、WebMCP 渐进增强、隐私、验证和团队治理 |
| 架构与领导力 | [架构领导力中文核心讲义](chinese-guides/advanced-topics.md#arch-02)、[可持续工程中文核心讲义](chinese-guides/core-and-ecosystem-topics.md#sustain-01)、[AWS Well-Architected 中文文档](https://docs.aws.amazon.com/zh_cn/wellarchitected/latest/framework/welcome.html)、[Google 技术写作中文课程](https://developers.google.com/tech-writing/two?hl=zh-cn) | 质量属性、ADR、渐进迁移、可靠性、成本、可持续性、评审和表达 |

单个知识点的精确资料仍以[知识库](knowledge-base/README.md)为准。

## 默认耗时档位

| 类型 | 资料 | 练习 | 项目 | 首考 | 首次掌握 | 复测 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 基础机制 | 90 | 150 | 135 | 90 | 465 | 75 |
| 框架、业务、体验 | 105 | 165 | 150 | 90 | 510 | 75 |
| 工程、安全、数据、交付 | 120 | 180 | 165 | 105 | 570 | 90 |
| AI、Agent、架构与治理 | 135 | 195 | 180 | 105 | 615 | 90 |

全部 219 个知识点已显式填写耗时；默认档位只用于新知识点或遗漏字段。所有时间按 15 分钟取整。

## 资料失效维护

- 使用 `pnpm content:links` 检查全部知识文档中的本地文件、章节锚点和远程地址；明确的 404/410 会使命令失败，鉴权或限流地址单独统计，网络暂不可确认项必须重试或人工复核。
- 每月抽查实际使用过的链接；每季度执行一次 `pnpm content:links` 全库审计。
- 404、重定向到无关页面或版本过期时，优先替换为同一官方来源的新入口。
- 中文译文与原文冲突时，以当前官方原文为准，并同步修订中文核心讲义、标明差异。
- 自动化内容门禁要求每个知识点存在中文必读资料；每条英文原文必须逐条标注、拥有达到分档深度的对应中文讲义，并被排除在必读和首考资料定位题之外；覆盖范围和排错合同不得退回弱模板。任何一项缺失都会直接导致校验失败。
- MCP、浏览器 AI、框架主版本、隐私和安全规范属于高变动内容，每月检查一次。
- 新资料进入知识库前，必须说明覆盖哪个知识点、支持哪一类考核、预期留下什么证据。
