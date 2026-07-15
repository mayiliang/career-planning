# 学习资料与耗时使用指南

更新时间：2026-07-15

这份索引是每个知识点“学习资料”的补充入口。知识点详情中的链接负责精确定位主题，本页负责提供连续课程、权威参考和通用学习方法。默认只把官方文档、标准组织、项目维护方资料列为必读；博客、视频和课程只能作为辅助解释，不能替代原始资料。

## 每个知识点的五阶段学习协议

1. **资料精读**：先写出 3 个待验证问题，再阅读知识点直达链接和本页领域课程；只摘录能回答问题的内容。
2. **机制练习**：用最小 Demo、DevTools、类型测试或故障注入验证至少一个关键机制和一个反例。
3. **项目产出**：把机制迁移到 Career Atlas 或已有真实项目，留下代码、测试、ADR、性能报告或演示材料。
4. **严格首考**：闭卷问答加现场编码、排障或方案设计；DeepSeek 评分达到 80 且无关键否决项才算首次通过。
5. **7 天复测**：不用原答案完成变式题；失败则回到薄弱阶段重学，不能直接标记掌握。

网站显示的“首次掌握预计耗时”包含前四阶段，复测时间单列。它是计划基线，不是硬性截止时间；打卡时填写实际投入，连续三个同类知识点偏差超过 25% 时，应按自己的历史速度调整后续计划。

## 官方学习主干

| 能力领域 | 连续学习资料 | 使用方式 |
| --- | --- | --- |
| Web 基础、浏览器、性能、可访问性 | [MDN Front-end Curriculum](https://developer.mozilla.org/en-US/curriculum/)、[web.dev Learn](https://web.dev/learn/)、[W3C WAI Digital Accessibility Foundations](https://www.w3.org/WAI/courses/foundations-course/) | 用 MDN 检查基础覆盖，用 web.dev 完成 HTML、CSS、JS、Performance、Accessibility、Testing 等连续课程；WAI 课程用于建立可访问性完整视角。 |
| TypeScript | [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)、[TSConfig Reference](https://www.typescriptlang.org/tsconfig/) | Handbook 建立类型系统心智模型；每个高级类型知识点都要配一个可编译的正例和失败用例。 |
| Vue 3 | [Vue Guide](https://vuejs.org/guide/introduction.html)、[Vue + TypeScript](https://vuejs.org/guide/typescript/overview.html)、[Vue Testing](https://vuejs.org/guide/scaling-up/testing.html)、[Vue Performance](https://vuejs.org/guide/best-practices/performance.html) | 按 Essentials → Components → Scaling Up → Best Practices 顺序推进，并直接在本项目实现功能。 |
| React | [React Learn](https://react.dev/learn)、[React Setup](https://react.dev/learn/setup) | 按 Describing UI、Interactivity、Managing State、Escape Hatches 形成连续学习链，再用 DevTools 和测试验证性能与状态边界。 |
| 安全、业务边界与 AI 安全 | [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)、[HTML5 Security](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)、[Business Logic Security](https://cheatsheetseries.owasp.org/cheatsheets/Business_Logic_Security_Cheat_Sheet.html) | 每个安全知识点至少完成威胁建模、攻击复现、修复和回归测试四步；AI 与 Agent 方向同时检查 Prompt Injection、RAG 和最小权限清单。 |
| 工程化与测试 | [Vite Guide](https://vite.dev/guide/)、[Vitest Guide](https://vitest.dev/guide/)、[Playwright Docs](https://playwright.dev/docs/intro)、[pnpm Workspaces](https://pnpm.io/workspaces) | 资料阅读必须落到可运行命令、失败用例、CI 门禁和可复现报告，不能只记配置项。 |
| API、Node 与工具协议 | [Node.js Learn](https://nodejs.org/en/learn)、[OpenAPI Specification](https://spec.openapis.org/oas/latest.html)、[Model Context Protocol](https://modelcontextprotocol.io/docs/getting-started/intro) | 以真实 Schema、CLI 或 MCP Tool 为产出，验证异常输入、权限、超时、重试和可观测性。 |
| AI 原生前端与浏览器 AI | [web.dev Learn AI](https://web.dev/learn/ai/)、[Chrome Built-in AI](https://developer.chrome.com/docs/ai/built-in)、[WebGPU Specification](https://www.w3.org/TR/webgpu/) | 先验证能力检测、兼容性与降级，再评测质量、延迟、成本、隐私和能耗；实验结果必须可复现。 |

## 耗时估算规则

- **资料精读 45–75 分钟**：基础主题较短；规范、AI、平台与安全主题较长。
- **机制练习 60–105 分钟**：至少包含一个正例、一个反例和可观察证据。
- **项目产出 45–120 分钟**：框架、组件平台、AI 应用和职业资产的项目权重更高。
- **严格首考 45–60 分钟**：包括闭卷问答、编码或方案任务及 DeepSeek 评分。
- **7 天复测 30–45 分钟**：使用变式题，不重复原题。
- 所有时间按 15 分钟取整。自动估算由知识编号所属领域决定；特别复杂的知识点可在 Markdown 中显式覆盖。

覆盖格式：

```markdown
- 预计耗时：资料 60 分钟；练习 120 分钟；项目 90 分钟；考核 75 分钟；复测 45 分钟
```

## 资料失效与更新规则

- 每月抽查本月使用过的链接；出现 404、版本过期或内容迁移时，优先替换为同一项目的新官方入口。
- 框架和工具资料以当前主版本为准；涉及旧项目迁移时，再补充旧版本差异，而不是让旧文档成为主线。
- 新资料必须说明它解决哪个知识点、对应哪个学习阶段、预期留下什么证据；单纯“值得收藏”不进入知识库。
