# 19 身份、隐私、AI 产品判断与安全治理

所有“通过”均需满足[统一考核规则](00-assessment-rules.md)。本领域是 AI 功能上线的产品与安全底线；法规资料用于工程边界识别，不替代专业法律意见。

## IDENTITY-01 Cookie、Session、Token 与浏览器身份边界

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN Cookie](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Guides/Cookies)、[OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)。覆盖范围：Cookie 属性、服务端 Session、Bearer Token、CSRF、XSS、刷新、退出、跨域和多设备会话。
- 严格考核：首考题 1（资料定位）：定位 Cookie 和 Session 安全属性；首考题 2（机制解释）：画出登录、续期、退出和吊销链路；首考题 3（最小产出）：实现 HttpOnly 会话和 CSRF 防护；首考题 4（受限排错）：处理会话固定、Token 泄漏和跨站请求；首考题 5（学习复述）：比较 Cookie Session 与浏览器存 Bearer Token。命题边界：不得把 JWT 当作天然安全或可吊销。
- 通过标准：敏感凭证不暴露给普通脚本；SameSite/Secure/HttpOnly 配置合理；退出与异常吊销有效；威胁模型完整。评估边界：仅验证正常登录不足以通过。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## IDENTITY-02 OAuth 2.1、OIDC、PKCE 与第三方授权

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[OAuth 2.0 Security Best Current Practice](https://www.rfc-editor.org/rfc/rfc9700)、[OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html)。覆盖范围：授权码、PKCE、state/nonce、issuer/audience、发现、刷新、Scope、资源服务器和账号绑定。
- 严格考核：首考题 1（资料定位）：定位 OAuth 安全建议和 OIDC 身份声明；首考题 2（机制解释）：画出浏览器、客户端、授权服务器和资源服务器交互；首考题 3（最小产出）：实现带 PKCE 的登录并验证 ID Token；首考题 4（受限排错）：处理 mix-up、重定向劫持、nonce 重放和错误 audience；首考题 5（学习复述）：说明 OAuth 授权与 OIDC 认证的区别。命题边界：不得自行发明协议流程。
- 通过标准：只用授权码+PKCE；严格校验 issuer/audience/state/nonce；Scope 最小化；失败不泄漏凭证。评估边界：第三方 SDK 返回成功不代表协议验证正确。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## PRIVACY-01 数据最小化、同意、留存与用户权利

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[W3C Privacy Principles](https://www.w3.org/TR/privacy-principles/)、[NIST Privacy Framework](https://www.nist.gov/privacy-framework)。覆盖范围：目的限制、数据最小化、同意、透明度、留存、删除、导出、访问控制和第三方处理。
- 严格考核：首考题 1（资料定位）：定位隐私设计原则；首考题 2（机制解释）：解释数据从收集到删除的生命周期；首考题 3（最小产出）：为 AI 对话功能制作数据清单、同意流和留存策略；首考题 4（受限排错）：发现过度采集、无法删除和第三方泄漏；首考题 5（学习复述）：说明隐私与安全的区别。命题边界：不得把隐私政策勾选框当作全部合规。
- 通过标准：每项数据有目的、期限和负责人；拒绝非必要采集不阻断核心功能；删除可传播到缓存和派生数据。评估边界：法律结论必须交由专业人员确认。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## PRIVACY-02 跨区域合规、数据分级与前端工程控制

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中国个人信息保护法（全国人大公报原版）](https://wb.flk.npc.gov.cn/flfg/PDF/f67af9f12e1b4c83a998cf5a876ce0e4.pdf)、[GDPR Official Text](https://eur-lex.europa.eu/eli/reg/2016/679/oj)。覆盖范围：个人/敏感信息识别、未成年人、跨境、自动化决策、数据主体权利及其前端工程映射。
- 严格考核：首考题 1（资料定位）：定位两类法规中的核心数据权利；首考题 2（机制解释）：把法规原则映射到收集、展示、导出和删除控制；首考题 3（最小产出）：完成一个多地区产品的数据流和控制矩阵；首考题 4（受限排错）：识别默认勾选、暗黑模式和日志泄漏；首考题 5（学习复述）：说明工程人员何时必须升级给法务。命题边界：考核工程识别和落实能力，不考法律执业判断。
- 通过标准：敏感数据分级；地区差异可配置且可审计；用户权利流程可实际执行；高风险变更有评审闸门。评估边界：不得声称单份清单即可证明合规。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## AIPROD-01 AI 任务定义、模型选择与价值验证

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Google PAIR Guidebook](https://pair.withgoogle.com/guidebook-v2/)、[NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework)。覆盖范围：任务适配、用户价值、模型能力、延迟、成本、隐私、可解释性、基线和不采用 AI 的方案。
- 严格考核：首考题 1（资料定位）：定位以人为本和风险管理原则；首考题 2（机制解释）：解释任务、数据、模型、体验和指标之间的关系；首考题 3（最小产出）：对三个需求完成 AI/规则/搜索方案选择；首考题 4（受限排错）：识别“为了 AI 而 AI”、代理指标和不可验证目标；首考题 5（学习复述）：说明何时应删除 AI 功能。命题边界：模型榜单不能替代真实任务评估。
- 通过标准：存在非 AI 基线；成功/失败指标明确；成本、延迟和风险预算量化；高风险任务有人类兜底。评估边界：Demo 惊艳不等于产品价值成立。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## AIPROD-02 不确定性、失败 UX 与 Human-in-the-loop

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Google PAIR Explainability + Trust](https://pair.withgoogle.com/guidebook-v2/chapter/explainability-trust/)、[MCP Elicitation](https://modelcontextprotocol.io/docs/learn/client-concepts#elicitation)。覆盖范围：置信与不确定性表达、引用、可撤销、高风险确认、人工接管、拒绝、恢复和用户反馈。
- 严格考核：首考题 1（资料定位）：定位透明度和用户确认原则；首考题 2（机制解释）：解释模型失败如何转化为产品状态；首考题 3（最小产出）：设计包含生成、校验、确认、撤销和申诉的流程；首考题 4（受限排错）：处理假引用、过度自信和确认疲劳；首考题 5（学习复述）：区分“显示免责声明”和真正可恢复体验。命题边界：不允许用虚构概率冒充模型置信度。
- 通过标准：关键事实可核验；高风险动作默认不自动执行；用户能中止、编辑和恢复；失败原因不泄密且可行动。评估边界：聊天式界面本身不代表良好 AI UX。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## AISAFE-01 输出校验、内容安全与 Guardrails

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[OWASP LLM Output Handling](https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/)、[NIST AI RMF Generative AI Profile](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence)。覆盖范围：结构校验、编码、引用验证、内容分级、PII、拒绝、人工升级和误拦截。
- 严格考核：首考题 1（资料定位）：定位输出处理和生成式 AI 风险；首考题 2（机制解释）：解释模型输出成为代码、HTML 或工具参数前的信任边界；首考题 3（最小产出）：实现结构、链接、HTML 和敏感内容校验层；首考题 4（受限排错）：注入 XSS、危险 URL、越权指令和误报；首考题 5（学习复述）：说明 Guardrail 为何不是单个分类器。命题边界：模型自检不能作为唯一安全控制。
- 通过标准：输出按最终解释器编码；危险动作二次授权；校验失败安全降级；误报漏报有评估集。评估边界：只屏蔽关键词不足以通过。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## AISAFE-02 AI 威胁建模、红队与滥用防护

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[OWASP GenAI Security Project](https://genai.owasp.org/)、[MITRE ATLAS](https://atlas.mitre.org/)。覆盖范围：Prompt Injection、数据投毒、模型窃取、资源耗尽、工具滥用、供应链、红队用例和纵深防御。
- 严格考核：首考题 1（资料定位）：定位主要威胁分类与攻击技术；首考题 2（机制解释）：画出资产、信任边界、攻击面和控制；首考题 3（最小产出）：为 RAG Agent 建立威胁模型和红队集；首考题 4（受限排错）：测试间接注入、越权工具、敏感数据回显和成本攻击；首考题 5（学习复述）：区分安全测试与模型质量评估。命题边界：红队操作只针对授权环境。
- 通过标准：覆盖输入、检索、模型、工具和输出；控制可测试；高风险失败默认关闭；残余风险有负责人。评估边界：列举 OWASP 名称不等于完成威胁建模。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## AIGOV-01 数据来源、模型变更、审计与责任治理

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[NIST AI RMF Playbook](https://airc.nist.gov/airmf-resources/playbook/)、[Google DeepMind Model Cards](https://deepmind.google/models/model-cards/)。覆盖范围：数据来源、许可、模型卡、版本、评估闸门、审计日志、责任人、事故响应和下线。
- 严格考核：首考题 1（资料定位）：定位治理职能和模型透明度信息；首考题 2（机制解释）：解释模型/Prompt/数据变更如何进入生产；首考题 3（最小产出）：制作 AI 功能登记表、变更闸门和回滚流程；首考题 4（受限排错）：处理无来源数据、静默换模和审计缺口；首考题 5（学习复述）：说明治理如何服务交付而非只增加审批。命题边界：治理强度必须按风险分级。
- 通过标准：每项 AI 能力有 owner、版本、用途和评估；变更可追溯可回滚；事故可通知和停用；供应商变化有复验。评估边界：只有原则文档而无执行证据不能通过。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## 领域综合考核

为一个具备检索和工具调用的 AI 功能完成身份、数据、隐私和威胁模型；实现授权、输出校验、高风险确认、审计、模型变更闸门与事故停用演练。
