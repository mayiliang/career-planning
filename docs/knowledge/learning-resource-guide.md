# 学习资料与耗时使用指南

更新时间：2026-07-22

这份索引是每个知识点“学习资料”的补充入口。知识点详情中的链接负责精确定位主题，本页负责提供连续课程、权威参考、工具应用和通用学习方法。学习资料不限于文本或视频，也可以是规范、实验、项目片段、工具应用、源码或本地笔记；唯一硬约束是必须覆盖当前知识点的机制、边界、反例、练习和考核依据。默认只把官方文档、标准组织、项目维护方资料列为必读；博客、视频和课程只能作为辅助解释，不能替代原始资料。

## 每个知识点的五阶段学习协议

1. **资料精读**：先写出 3 个待验证问题，再阅读知识点直达链接和本页领域课程；只摘录能回答问题的内容。
2. **机制练习**：用最小 Demo、DevTools、类型测试或故障注入验证至少一个关键机制和一个反例。
3. **项目产出**：把机制迁移到 Career Atlas 或已有真实项目，留下代码、测试、ADR、性能报告或演示材料。
4. **严格首考**：按“资料定位 -> 概念解释 -> 小例子推导 -> 受限排错 -> 学习复述”逐层答题；问题和参考答案必须能从学习资料直接查到或一跳推导，DeepSeek 评分达到 80 且无关键否决项才算首次通过。
5. **7 天复测**：不用原答案完成变式题；失败则回到薄弱阶段重学，不能直接标记掌握。

网站显示的“首次掌握预计耗时”包含前四阶段，复测时间单列。它是计划基线，不是硬性截止时间；打卡时填写实际投入，连续三个同类知识点偏差超过 25% 时，应按自己的历史速度调整后续计划。

当前 153 个知识点都已经写入显式 `预计耗时`，用于重新安排学习计划；默认档位只用于新增知识点或遗漏字段。导入后分钟数会持久化到数据库，知识详情、周计划和今日任务都读取同一份数据，不在前端临时重算。

## 官方学习主干

| 能力领域 | 连续学习资料 | 使用方式 |
| --- | --- | --- |
| Web 基础、浏览器、性能、可访问性 | [MDN Front-end Curriculum](https://developer.mozilla.org/en-US/curriculum/)、[web.dev Learn](https://web.dev/learn/)、[W3C WAI Digital Accessibility Foundations](https://www.w3.org/WAI/courses/foundations-course/) | 用 MDN 检查基础覆盖，用 web.dev 完成 HTML、CSS、JS、Performance、Accessibility、Testing 等连续课程；WAI 课程用于建立可访问性完整视角。 |
| TypeScript | [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)、[TSConfig Reference](https://www.typescriptlang.org/tsconfig/) | Handbook 建立类型系统心智模型；每个高级类型知识点都要配一个可编译的正例和失败用例。 |
| Vue 3 | [Vue Guide](https://vuejs.org/guide/introduction.html)、[Vue + TypeScript](https://vuejs.org/guide/typescript/overview.html)、[Vue Testing](https://vuejs.org/guide/scaling-up/testing.html)、[Vue Performance](https://vuejs.org/guide/best-practices/performance.html) | 按 Essentials → Components → Scaling Up → Best Practices 顺序推进，并直接在本项目实现功能。 |
| React | [React Learn](https://react.dev/learn)、[React Setup](https://react.dev/learn/setup) | 按 Describing UI、Interactivity、Managing State、Escape Hatches 形成连续学习链，再用 DevTools 和测试验证性能与状态边界。 |
| 安全、业务边界与 AI 安全 | [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)、[HTML5 Security](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)、[Business Logic Security](https://cheatsheetseries.owasp.org/cheatsheets/Business_Logic_Security_Cheat_Sheet.html) | 每个安全知识点至少完成威胁建模、攻击复现、修复和回归测试四步；AI 与 Agent 方向同时检查 Prompt Injection、RAG 和最小权限清单。 |
| 工程化与测试 | [Vite Guide](https://vite.dev/guide/)、[Vitest Guide](https://vitest.dev/guide/)、[Playwright Docs](https://playwright.dev/docs/intro)、[pnpm Workspaces](https://pnpm.io/workspaces) | 资料阅读必须落到可运行命令、失败用例、CI 门禁和可复现报告，不能只记配置项。 |
| Linux、Docker 与部署交付 | [Linux man-pages](https://www.kernel.org/doc/man-pages/)、[Docker Docs](https://docs.docker.com/)、[Docker Compose](https://docs.docker.com/compose/)、[Nginx Admin Guide](https://docs.nginx.com/nginx/admin-guide/)、[GitHub Actions](https://docs.github.com/actions) | 以可运行部署为唯一验收：命令记录、Dockerfile、Compose、Nginx 缓存、健康检查、日志、回滚演练和排障报告缺一不可。 |
| API、Node 与工具协议 | [Node.js Learn](https://nodejs.org/en/learn)、[OpenAPI Specification](https://spec.openapis.org/oas/latest.html)、[Model Context Protocol](https://modelcontextprotocol.io/docs/getting-started/intro) | 以真实 Schema、CLI 或 MCP Tool 为产出，验证异常输入、权限、超时、重试和可观测性。 |
| AI 原生前端与浏览器 AI | [web.dev Learn AI](https://web.dev/learn/ai/)、[Chrome Built-in AI](https://developer.chrome.com/docs/ai/built-in)、[WebGPU Specification](https://www.w3.org/TR/webgpu/) | 先验证能力检测、兼容性与降级，再评测质量、延迟、成本、隐私和能耗；实验结果必须可复现。 |

## 工具与应用路径

| 学习阶段 | 推荐工具 | 必须留下的证据 |
| --- | --- | --- |
| 资料精读 | MDN、React/Vue/TypeScript 官方文档、Docker Docs、OWASP、W3C 标准、项目源码搜索 | 3 个问题、关键结论、对应知识点链接 |
| 机制练习 | TypeScript Playground、Chrome DevTools、React DevTools、Vue Devtools、Docker Desktop、ShellCheck、Postman 或 Bruno | 最小复现、反例、截图或命令输出 |
| 项目产出 | Career Atlas、`gungnir-web`、`gungnir-h5`、`teaching-web`、`digitalteacher-web`、`digitalteacher-h5`、`aiui`、`get_apidoc` | 代码提交、测试、ADR、性能报告、部署记录或组件文档 |
| 严格首考 | 本地 Career Atlas 考核页、DeepSeek 判卷、Vitest、Playwright、Lighthouse、Playwright Trace Viewer | 答卷、逐题评审、参考答案、失败项和修复记录 |
| 7 天复测 | Career Atlas 复测事件、同主题变式题、真实项目二次应用 | 新答案、新代码或复盘结论 |

## 耗时估算规则

- **资料精读 90–135 分钟**：不仅看完链接，还要摘出定义、规则、边界和题目依据。
- **机制练习 150–195 分钟**：至少包含一个正例、一个反例、一个可观察证据和一条失败解释。
- **项目产出 135–210 分钟**：把机制迁移到 Career Atlas 或你的真实项目，留下代码、配置、ADR、报告或演示材料。
- **严格首考 90–105 分钟**：按资料定位、机制解释、最小产出、受限排错、学习复述五段式完成，并保留判卷意见。
- **7 天复测 75–90 分钟**：使用变式题，不重复原题；复测可以小范围迁移，但仍要说明资料依据。
- 所有时间按 15 分钟取整。现在的估算刻意提高了资料和练习时间，因为上一次实测说明“资料能看懂”不等于“能回答考核题”。

## 默认耗时档位

| 知识点前缀 | 资料 | 练习 | 项目 | 首考 | 首次掌握合计 | 复测 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `JS`、`WEB` | 90 | 150 | 135 | 90 | 465 | 75 |
| `A11Y`、`BROWSER` | 105 | 165 | 150 | 90 | 510 | 75 |
| `NET` | 105 | 165 | 150 | 105 | 525 | 75 |
| `SEC` | 120 | 180 | 150 | 105 | 555 | 90 |
| `TS` | 105 | 165 | 135 | 90 | 495 | 75 |
| `VUE`、`REACT`、`UMI`、`ANTD` | 105 | 165 | 150 | 90 | 510 | 75 |
| `BIZ` | 105 | 165 | 165 | 90 | 525 | 75 |
| `ENG`、`TEST`、`OBS`、`PERF`、`H5`、`HYBRID`、`NODE`、`API`、`MCP`、`AI` | 120 | 180 | 165 | 105 | 570 | 90 |
| `COMP`、`DS`、`PLATFORM`、`DOCKER`、`DEPLOY` | 120 | 180 | 180 | 105 | 585 | 90 |
| `AIAPP`、`AGENT`、`WEBAI`、`AIDEV` | 135 | 195 | 180 | 105 | 615 | 90 |
| `LINUX` | 105 | 165 | 150 | 105 | 525 | 75 |
| `CAREER` | 105 | 150 | 210 | 105 | 570 | 90 |

这张表覆盖全部 153 个知识点的默认策略。当前知识库已经为每个知识点写入显式耗时，重新执行内容检查、构建和 Docker 部署后，学习计划会按这些显式分钟数重排。

覆盖格式：

```markdown
- 预计耗时：资料 60 分钟；练习 120 分钟；项目 90 分钟；考核 75 分钟；复测 45 分钟
```

## 资料失效与更新规则

- 每月抽查本月使用过的链接；出现 404、版本过期或内容迁移时，优先替换为同一项目的新官方入口。
- 框架和工具资料以当前主版本为准；涉及旧项目迁移时，再补充旧版本差异，而不是让旧文档成为主线。
- 新资料必须说明它解决哪个知识点、对应哪个学习阶段、预期留下什么证据；单纯“值得收藏”不进入知识库。
