# 15 AI 辅助研发、评审与工程治理

这一领域把 AI 编程从“生成代码”提升为可控的工程流程，覆盖上下文、规格、测试、审查、供应链和团队治理。

## AIDEV-01 规格驱动开发与可验收任务拆解

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[GitHub Spec Kit](https://github.com/github/spec-kit)、[Google Engineering Practices](https://google.github.io/eng-practices/)
- 严格考核：把一个模糊需求拆成领域规则、状态、接口、UI、失败路径和可执行验收，交给 AI 实现后逐条验证。
- 通过标准：规格没有“优化一下”等不可验收措辞；边界和非目标明确；AI 输出能被测试与浏览器证据验证。

## AIDEV-02 Context Engineering 与仓库指令

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[GitHub Copilot Repository Instructions](https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot)、[MCP Resources](https://modelcontextprotocol.io/specification/2025-11-25/server/resources)
- 严格考核：为一个真实仓库编写分层指令、模块地图、关键命令和例外规则，并比较有无上下文时 AI 修改正确率。
- 通过标准：指令短且可维护；不复制整仓库；局部规则就近；敏感信息不进入上下文；有至少 10 个对比任务。

## AIDEV-03 AI 生成代码的验证金字塔

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Vitest](https://vitest.dev/)、[Playwright](https://playwright.dev/)、[Testing Library](https://testing-library.com/docs/vue-testing-library/intro/)
- 严格考核：让 AI 实现一个垂直切片，同时设计类型、单元、契约、组件、E2E 和人工视觉验收，注入三个缺陷验证门禁能否捕获。
- 通过标准：测试关注行为与领域规则；不会只测快照；失败能定位；不通过删除断言或 mock 全部依赖来“修复”。

## AIDEV-04 AI Code Review 与风险分级

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Google Code Review Guide](https://google.github.io/eng-practices/review/)、[OWASP Code Review Guide](https://owasp.org/www-project-code-review-guide/)
- 严格考核：对一份包含状态竞争、权限绕过、资源泄漏、错误吞噬和可访问性问题的补丁做 AI+人工双重评审。
- 通过标准：问题按影响与证据排序；不把风格当高危；能指出具体触发路径；AI 建议必须复核，不能盲目接受。

## AIDEV-05 Agentic Coding 的工作树与变更隔离

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Git Worktree](https://git-scm.com/docs/git-worktree)、[GitHub Pull Requests](https://docs.github.com/en/pull-requests)
- 严格考核：设计多个编码 Agent 并行时的任务边界、worktree、提交粒度、冲突处理和集成顺序，完成一次演练。
- 通过标准：不同任务不共享脏工作树；提交可回滚；冲突由理解业务的人处理；测试证据跟随变更而不是口头汇报。

## AIDEV-06 代码生成器、AST 与确定性改写

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[TypeScript Compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API)、[ts-morph](https://ts-morph.com/)
- 严格考核：将一类重复的 AI 文本改写替换为 AST codemod，支持 dry-run、格式化、幂等和回滚，并在 20 个文件验证。
- 通过标准：不使用脆弱正则修改语法结构；二次运行无变化；保留注释；错误文件不产生半成品。

## AIDEV-07 依赖、生成代码与供应链安全

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[OpenSSF Scorecard](https://scorecard.dev/)、[npm Provenance](https://docs.npmjs.com/generating-provenance-statements)
- 严格考核：审计 AI 建议的 10 个依赖，检查维护、许可证、已知漏洞、安装脚本、包体、重复能力和锁文件变化。
- 通过标准：每个新依赖有必要性；高风险安装脚本被识别；版本固定策略合理；不会复制来源不明代码或密钥。

## AIDEV-08 AI 研发指标与真实提效评估

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[DORA Metrics](https://dora.dev/guides/dora-metrics-four-keys/)、[SPACE Framework](https://queue.acm.org/detail.cfm?id=3454124)
- 严格考核：设计 4 周对照实验，记录交付时间、返工、缺陷、评审时间、认知负荷和开发者满意度，分析 AI 是否真实提效。
- 通过标准：不只统计生成代码行数；指标避免驱动刷数；样本与限制透明；能识别提速但质量下降的情况。

## AIDEV-09 设计稿到代码与视觉验收

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Playwright Visual Comparisons](https://playwright.dev/docs/test-snapshots)、[WCAG Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)
- 严格考核：让 AI 从设计规范实现响应式页面，通过截图、键盘、对比度、窄屏和 reduced-motion 进行两轮批评与修订。
- 通过标准：不以“像素差不多”代替体验；视觉 token 统一；可访问性与交互状态齐全；变化有截图证据。

## AIDEV-10 AI 能力治理、隐私与团队规范

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)、[OWASP GenAI Security](https://genai.owasp.org/)
- 严格考核：为企业前端团队制定可输入数据分类、允许工具、模型供应商、代码归属、人工复核、日志留存和事故响应规范。
- 通过标准：规则可执行且不过度阻塞；客户数据和密钥边界明确；高风险变更必须人工审批；有违规检测和事故演练。

## 领域综合考核

选择一个真实需求，完成规格、AI 实现、分层测试、代码评审、视觉验收和提效复盘。提交完整变更证据，并答辩哪些决策不能交给模型。
