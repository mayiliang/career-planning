# 19 身份、隐私、AI 产品判断与安全治理

所有“通过”均需满足[统一考核规则](00-assessment-rules.md)。本领域是 AI 功能上线的产品与安全底线；法规资料用于工程边界识别，不替代专业法律意见。

## IDENTITY-01 Cookie、Session、Token 与浏览器身份边界

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#identity-01)、[MDN Cookie](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Guides/Cookies)、[MDN CHIPS 分区 Cookie](https://developer.mozilla.org/zh-CN/docs/Web/Privacy/Guides/Third-party_cookies/Partitioned_cookies)、[MDN Storage Access API](https://developer.mozilla.org/en-US/docs/Web/API/Storage_Access_API)（英文原文，仅用于版本核验）、[Chrome Immediate UI](https://developer.chrome.com/docs/identity/immediate-ui-mode?hl=en)（英文原文，仅用于版本核验）、[W3C Digital Credentials API 草案](https://www.w3.org/TR/digital-credentials/)（英文原文，仅用于版本核验）、[OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：Cookie、服务端 Session、Bearer Token、CSRF/XSS、刷新/轮换/退出/吊销、跨域与多设备会话；第三方 Cookie 受限、存储分区、CHIPS、Storage Access API 和 FedCM；Passkey/密码 Immediate UI 的能力检测、用户手势、静默无凭证与传统登录回退，且截至 2026-07-29 仅作为 Chrome 专属观察项；Digital Credentials 的选择性披露、用户中介、验证方和渐进增强，仍为草案观察项。
- 严格考核：题源包含《中文核心讲义》；首考题 1（资料定位）：只允许使用《中文核心讲义》，定位会话、分区 Cookie、第三方嵌入、存储访问和新身份 UI 的机制与成熟度；首考题 2（机制解释）：画出登录、续期、退出、吊销以及顶层/第三方 iframe、Immediate UI 成功/无凭证回退的链路；首考题 3（最小产出）：实现 HttpOnly 会话和 CSRF 防护，为跨站嵌入设计 CHIPS/Storage Access/FedCM，并在检测到 `immediateGet` 且有用户手势时尝试 Immediate UI，`NotAllowedError` 或不支持时无感回到传统登录；首考题 4（受限排错）：处理会话固定、Token 泄漏、第三方 Cookie 阻断、错误分区键、无用户激活、无本地凭证、私密模式、Chrome 专属能力误判和跨站跟踪；首考题 5（学习复述）：比较一方会话、分区 Cookie、Storage Access、FedCM 与 Immediate UI。命题边界：不得把 JWT 当天然安全或可吊销，不得用指纹追踪绕过隐私，也不得把 Chrome Immediate UI/Digital Credentials 当通用认证基线。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：敏感凭证不暴露给普通脚本；Cookie 配置合理；第三方访问由明确用户动作和最小范围触发；退出与吊销有效；Immediate UI 只在能力检测和用户手势后调用，无凭证/不支持时保留可发现的标准登录；禁用第三方 Cookie 或不支持 FedCM/Immediate UI/Digital Credentials 时仍可用；实验/专属/草案能力在 UI、遥测和发布中标注成熟度。评估边界：只验证顶层登录、把 `NotAllowedError` 显示为账户错误或把观察项作为必经路径不能通过。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## IDENTITY-02 OAuth 2.1、OIDC、PKCE 与第三方授权

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/advanced-topics.md#identity-02)、[OAuth 2.0 Security Best Current Practice](https://www.rfc-editor.org/rfc/rfc9700)（英文原文，仅用于版本核验）、[OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：授权码、PKCE、state/nonce、issuer/audience、发现、刷新、Scope、资源服务器和账号绑定。
- 严格考核：题源包含《中文核心讲义》；首考题 1（资料定位）：只允许使用《中文核心讲义》，定位能支撑「OAuth 2.1、OIDC、PKCE 与第三方授权」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：画出浏览器、客户端、授权服务器和资源服务器交互；首考题 3（最小产出）：实现带 PKCE 的登录并验证 ID Token；首考题 4（受限排错）：处理 mix-up、重定向劫持、nonce 重放和错误 audience；首考题 5（学习复述）：说明 OAuth 授权与 OIDC 认证的区别。命题边界：不得自行发明协议流程。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：只用授权码+PKCE；严格校验 issuer/audience/state/nonce；Scope 最小化；失败不泄漏凭证。评估边界：第三方 SDK 返回成功不代表协议验证正确。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## PRIVACY-01 数据最小化、同意、留存与用户权利

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/advanced-topics.md#privacy-01)、[W3C Privacy Principles](https://www.w3.org/TR/privacy-principles/)（英文原文，仅用于版本核验）、[NIST Privacy Framework](https://www.nist.gov/privacy-framework)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：处理目的/合法性与用途限制、数据最小化、分层告知/同意/撤回、数据清单与流图、敏感度、保留、访问/更正/删除/导出、日志/缓存/索引/备份副本、访问控制、第三方/跨境和删除传播验证。
- 严格考核：题源包含《中文核心讲义》；首考题 1（资料定位）：只允许使用《中文核心讲义》，定位能支撑「数据最小化、同意、留存与用户权利」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：解释数据从收集到删除的生命周期；首考题 3（最小产出）：为 AI 对话功能制作数据清单、同意流和留存策略；首考题 4（受限排错）：发现过度采集、无法删除和第三方泄漏；首考题 5（学习复述）：说明隐私与安全的区别。命题边界：不得把隐私政策勾选框当作全部合规。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：每项数据有目的、期限和负责人；拒绝非必要采集不阻断核心功能；删除可传播到缓存和派生数据。评估边界：法律结论必须交由专业人员确认。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## PRIVACY-02 跨区域合规、数据分级与前端工程控制

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#privacy-02)、[中国个人信息保护法（全国人大公报原版）](https://flk.npc.gov.cn/detail?fileId=&id=ff8081817b6472a3017b656cc2040044&title=%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E4%B8%AA%E4%BA%BA%E4%BF%A1%E6%81%AF%E4%BF%9D%E6%8A%A4%E6%B3%95&type=)、[GDPR Official Text](https://eur-lex.europa.eu/eli/reg/2016/679/oj)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：个人/敏感信息与去标识边界、未成年人、跨境/第三方、单独同意与撤回、自动化决策解释/拒绝、访问更正删除导出权利、前端告知/权限/埋点/日志/AI 输入映射及法务复核边界。
- 严格考核：题源包含《中文核心讲义》；首考题 1（资料定位）：只允许使用《中文核心讲义》，定位能支撑「跨区域合规、数据分级与前端工程控制」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：把法规原则映射到收集、展示、导出和删除控制；首考题 3（最小产出）：完成一个多地区产品的数据流和控制矩阵；首考题 4（受限排错）：识别默认勾选、暗黑模式和日志泄漏；首考题 5（学习复述）：说明工程人员何时必须升级给法务。命题边界：考核工程识别和落实能力，不考法律执业判断。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：敏感数据分级；地区差异可配置且可审计；用户权利流程可实际执行；高风险变更有评审闸门。评估边界：不得声称单份清单即可证明合规。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## AIPROD-01 AI 任务定义、模型选择与价值验证

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/advanced-topics.md#aiprod-01)、[Google PAIR Guidebook](https://pair.withgoogle.com/guidebook-v2/)（英文原文，仅用于版本核验）、[NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：用户任务/失败成本/可验证性、生成 AI 适配、规则/搜索/传统模型/人工基线、模型能力与不确定性、延迟/成本/隐私/公平/可解释性、无 AI 降级、成功/护栏指标、试点和不采用 AI 的决策。
- 严格考核：题源包含《中文核心讲义》；首考题 1（资料定位）：只允许使用《中文核心讲义》，定位能支撑「AI 任务定义、模型选择与价值验证」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：解释任务、数据、模型、体验和指标之间的关系；首考题 3（最小产出）：对三个需求完成 AI/规则/搜索方案选择；首考题 4（受限排错）：识别“为了 AI 而 AI”、代理指标和不可验证目标；首考题 5（学习复述）：说明何时应删除 AI 功能。命题边界：模型榜单不能替代真实任务评估。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：存在非 AI 基线；成功/失败指标明确；成本、延迟和风险预算量化；高风险任务有人类兜底。评估边界：Demo 惊艳不等于产品价值成立。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## AIPROD-02 不确定性、失败 UX 与 Human-in-the-loop

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/advanced-topics.md#aiprod-02)、[Google PAIR Explainability + Trust](https://pair.withgoogle.com/guidebook-v2/chapter/explainability-trust/)（英文原文，仅用于版本核验）、[MCP Elicitation](https://modelcontextprotocol.io/docs/learn/client-concepts#elicitation)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：能力/限制预期、置信与不确定性表达、可核验引用与来源、草稿/预览/可撤销、高风险影响摘要/确认、人工接管、拒绝/超时/部分成功恢复、反馈闭环、自动化分级和避免欺骗性拟人化。
- 严格考核：题源包含《中文核心讲义》；首考题 1（资料定位）：只允许使用《中文核心讲义》，定位能支撑「不确定性、失败 UX 与 Human-in-the-loop」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：解释模型失败如何转化为产品状态；首考题 3（最小产出）：设计包含生成、校验、确认、撤销和申诉的流程；首考题 4（受限排错）：处理假引用、过度自信和确认疲劳；首考题 5（学习复述）：区分“显示免责声明”和真正可恢复体验。命题边界：不允许用虚构概率冒充模型置信度。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：关键事实可核验；高风险动作默认不自动执行；用户能中止、编辑和恢复；失败原因不泄密且可行动。评估边界：聊天式界面本身不代表良好 AI UX。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## AISAFE-01 输出校验、内容安全与 Guardrails

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/advanced-topics.md#aisafe-01)、[OWASP LLM Output Handling](https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/)（英文原文，仅用于版本核验）、[NIST AI RMF Generative AI Profile](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：模型输出作为不可信输入、Schema/范围/业务校验、上下文编码、URL/HTML/命令边界、引用事实核验、内容/风险分级、PII/秘密、拒绝与安全替代、人工升级、分类器阈值、误拦截申诉和持续监测。
- 严格考核：题源包含《中文核心讲义》；首考题 1（资料定位）：只允许使用《中文核心讲义》，定位能支撑「输出校验、内容安全与 Guardrails」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：解释模型输出成为代码、HTML 或工具参数前的信任边界；首考题 3（最小产出）：实现结构、链接、HTML 和敏感内容校验层；首考题 4（受限排错）：注入 XSS、危险 URL、越权指令和误报；首考题 5（学习复述）：说明 Guardrail 为何不是单个分类器。命题边界：模型自检不能作为唯一安全控制。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：输出按最终解释器编码；危险动作二次授权；校验失败安全降级；误报漏报有评估集。评估边界：只屏蔽关键词不足以通过。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## AISAFE-02 AI 威胁建模、红队与滥用防护

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/advanced-topics.md#aisafe-02)、[OWASP GenAI Security Project](https://genai.owasp.org/)（英文原文，仅用于版本核验）、[OWASP Agentic Security Initiative](https://genai.owasp.org/initiatives/agentic-security-initiative/)（英文原文，仅用于版本核验）、[MITRE ATLAS](https://atlas.mitre.org/)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：Prompt Injection、目标劫持、工具与身份权限滥用、数据/记忆/上下文投毒、模型窃取、资源耗尽、供应链与不安全代码执行、Agent 间信任、级联失效、人机信任利用、失控 Agent、红队用例、纵深防御和紧急停止。
- 严格考核：题源包含《中文核心讲义》；首考题 1（资料定位）：只允许使用《中文核心讲义》，定位能支撑「AI 威胁建模、红队与滥用防护」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：画出资产、信任边界、攻击面和控制；首考题 3（最小产出）：为 RAG Agent 建立威胁模型和红队集；首考题 4（受限排错）：测试间接注入、越权工具、敏感数据回显和成本攻击；首考题 5（学习复述）：区分安全测试与模型质量评估。命题边界：红队操作只针对授权环境。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：覆盖输入、检索、模型、记忆、身份、工具、Agent 间通信、代码执行和输出；控制可测试；至少验证一条跨 Agent 级联攻击及停止机制；高风险失败默认关闭；残余风险有负责人和复测期限。评估边界：列举 OWASP 名称不等于完成威胁建模。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## AIGOV-01 数据来源、模型变更、审计与责任治理

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/advanced-topics.md#aigov-01)、[NIST AI RMF Playbook](https://airc.nist.gov/airmf-resources/playbook/)（英文原文，仅用于版本核验）、[Google DeepMind Model Cards](https://deepmind.google/models/model-cards/)（英文原文，仅用于版本核验）、[C2PA 2.4 Content Credentials](https://spec.c2pa.org/specifications/specifications/2.4/index.html)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：训练/检索数据来源与许可、模型卡、模型/Prompt/Guardrail 版本、评估闸门、审计日志、责任人、事故响应和下线；AI 生成/编辑媒体的来源、C2PA Content Credentials、签名验证、凭证丢失/损坏、展示 UX、导出和平台再编码边界。
- 严格考核：题源包含《中文核心讲义》；首考题 1（资料定位）：只允许使用《中文核心讲义》，定位数据/模型治理与生成内容来源凭证的机制、边界和反例；首考题 2（机制解释）：解释模型/Prompt/数据变更如何进入生产，并画出媒体从生成、编辑、签名、导出到展示的来源链；首考题 3（最小产出）：制作 AI 功能登记表、变更闸门和回滚流程，再为生成图片实现 Content Credentials 检测、可信展示、缺失/无效提示和原始文件验证入口；首考题 4（受限排错）：处理无来源数据、静默换模、审计缺口、签名失效、凭证被平台剥离和将“无凭证”误判为“非 AI”；首考题 5（学习复述）：说明治理和来源 UX 如何服务交付与用户判断。命题边界：治理强度按风险分级；水印或凭证只提供来源证据，不能证明内容事实真实。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：每项 AI 能力有 owner、版本、用途和评估；变更可追溯可回滚；事故可通知和停用；生成媒体来源展示不夸大、不因凭证缺失作错误断言，并允许查看验证细节。评估边界：只有原则文档、只加“AI 生成”文字或只验证 happy path 不能通过。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## 领域综合考核

为一个具备检索和工具调用的 AI 功能完成身份、数据、隐私和威胁模型；实现授权、输出校验、高风险确认、审计、模型变更闸门与事故停用演练。
