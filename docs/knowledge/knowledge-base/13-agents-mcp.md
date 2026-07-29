# 13 Agent、MCP 与 AI 工具协议

这一领域把“会调用模型”升级为“能设计可靠 Agent 系统”。前端工程师需要理解工具协议、状态、审批、长任务和可观测性，才能做好 Agent 产品的交互层与工具层。

## AGENT-01 Agent Loop、计划与停止条件

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/advanced-topics.md#agent-01)、[AI SDK Agents](https://ai-sdk.dev/docs/agents/overview)（英文原文，仅用于版本核验）、[MCP 核心架构](https://modelcontextprotocol.io/docs/learn/architecture)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：必须从列出资料建立主题术语表、运行时或数据流图、适用与不适用条件、常见反例，以及能由本知识点首考产出验证的正确性、安全、性能和兼容边界；不得只复述标题或框架用法。
- 严格考核：首考题 1（资料定位）：只允许使用《中文核心讲义》，定位能支撑「Agent Loop、计划与停止条件」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：闭卷用状态图、数据流、时序或类型推导解释关键机制、前置假设、失败传播与不适用条件，并以首考题 3 的具体产出举例；首考题 3（最小产出）：画出 observe-plan-act-reflect 循环，设计最大步数、预算、取消、重复动作检测和失败停止条件，并用状态机实现；首考题 4（受限排错）：对首考题 3 实施至少一个正常、一个边界和一个故障注入；提交预期与实际、最小复现、由资料支持的 3 项假设、逐项证伪证据、根因、最小修复与回归验证；首考题 5（学习复述）：3 分钟按问题、机制、选择、反例和验证证据五段复述，并回答一个边界追问。命题边界：参考答案必须逐题回指学习资料、题目依据或通过标准；评分只依据列出资料、题目给定输入和可复核产出；额外框架经验不得替代机制与证据。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：不会把 while(true) 当 Agent；每一步可审计；停止与恢复确定；用户能看到当前目标、动作和剩余预算。评估边界：评分只依据列出资料、题目给定输入和可复核产出；额外框架经验不得替代机制与证据。
- 预计耗时：资料 135 分钟；练习 195 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## AGENT-03 无状态 Streamable HTTP、stdio 与显式状态

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/advanced-topics.md#agent-03)、[MCP 2026-07-28 发布说明](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/)（英文原文，仅用于版本核验）、[TypeScript SDK 2026 协议支持](https://ts.sdk.modelcontextprotocol.io/v2/migration/support-2026-07-28)（英文原文，仅用于版本核验）、[MCP HTTP Server](https://ts.sdk.modelcontextprotocol.io/v2/api/%40modelcontextprotocol/node/streamableHttp.html)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：无状态请求、`MCP-Protocol-Version`、`Mcp-Method`/`Mcp-Name`、显式 handle、MRTR、stdio 与 2025 会话协议兼容。
- 严格考核：题源包含《中文核心讲义》；首考题 1（资料定位）：只允许使用《中文核心讲义》，定位能支撑「无状态 Streamable HTTP、stdio 与显式状态」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：解释为什么 `initialize`、`initialized` 和 `Mcp-Session-Id` 在 2026 协议中被移除；首考题 3（最小产出）：分别实现 stdio 和无状态 HTTP 工具调用，以显式 handle 管理业务状态，并用 legacy adapter 兼容 2025 客户端；首考题 4（受限排错）：处理 Header/Body 不一致、重复副作用、负载均衡和断线；首考题 5（学习复述）：比较 2025 与 2026 协议。命题边界：不得把旧协议会话机制作为当前主实现。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：2026 请求可落到任意实例；状态以显式 handle 或业务存储承载；版本分支可测试；远程服务有 Origin、Host 和认证校验。评估边界：只让旧 SDK 示例运行不能通过。
- 预计耗时：资料 135 分钟；练习 195 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## AGENT-04 MCP Client、服务发现与版本兼容

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/advanced-topics.md#agent-04)、[MCP TypeScript Client](https://ts.sdk.modelcontextprotocol.io/v2/clients/connect)（英文原文，仅用于版本核验）、[MCP Protocol Versions](https://ts.sdk.modelcontextprotocol.io/v2/protocol-versions)（英文原文，仅用于版本核验）、[2026 协议迁移](https://ts.sdk.modelcontextprotocol.io/v2/migration/support-2026-07-28)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：`server/discover`、协议/能力协商、版本选择、工具/资源缓存与失效、未知能力忽略、能力缺失降级、旧新客户端/服务端兼容矩阵和 2025/2026 双栈迁移退出。
- 严格考核：题源包含《中文核心讲义》；首考题 1（资料定位）：只允许使用《中文核心讲义》，定位能支撑「MCP Client、服务发现与版本兼容」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：解释 2026 按请求元数据与 2025 初始化协商的差异；首考题 3（最小产出）：实现客户端发现、工具/资源读取、分页、取消、缓存 TTL 与双版本兼容；首考题 4（受限排错）：处理错误版本、自报身份不可信、缓存陈旧和能力缺失；首考题 5（学习复述）：说明兼容层退出策略。命题边界：`serverInfo/clientInfo` 不得用于安全决策。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：不假设服务端一定支持全部能力；版本不兼容有明确提示；请求可取消；分页不会漏数据或死循环。评估边界：评分只依据列出资料、题目给定输入和可复核产出；额外框架经验不得替代机制与证据。
- 预计耗时：资料 135 分钟；练习 195 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## AGENT-05 Human-in-the-loop 与高风险审批

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/advanced-topics.md#agent-05)、[MCP Input Required / MRTR](https://ts.sdk.modelcontextprotocol.io/v2/servers/input-required)（英文原文，仅用于版本核验）、[MCP 2026 发布说明](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/)（英文原文，仅用于版本核验）、[Google PAIR 控制原则](https://pair.withgoogle.com/guidebook/)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：2026 协议的 `InputRequiredResult`、请求状态回传、Elicitation、高风险审批与 2025 客户端降级。
- 严格考核：首考题 1（资料定位）：只允许使用《中文核心讲义》，定位能支撑「Human-in-the-loop 与高风险审批」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：闭卷用状态图、数据流、时序或类型推导解释关键机制、前置假设、失败传播与不适用条件，并以首考题 3 的具体产出举例；首考题 3（最小产出）：为删除文件、发送消息、支付和发布四类工具设计风险分级与审批 UI，支持参数编辑、拒绝、一次授权和范围授权；首考题 4（受限排错）：对首考题 3 实施至少一个正常、一个边界和一个故障注入；提交预期与实际、最小复现、由资料支持的 3 项假设、逐项证伪证据、根因、最小修复与回归验证；首考题 5（学习复述）：3 分钟按问题、机制、选择、反例和验证证据五段复述，并回答一个边界追问。命题边界：参考答案必须逐题回指学习资料、题目依据或通过标准；评分只依据列出资料、题目给定输入和可复核产出；额外框架经验不得替代机制与证据。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：高风险动作不能静默执行；确认页展示真实参数和影响范围；拒绝不会破坏会话；授权可撤销并有审计记录。评估边界：评分只依据列出资料、题目给定输入和可复核产出；额外框架经验不得替代机制与证据。
- 预计耗时：资料 135 分钟；练习 195 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## AGENT-06 Tasks 扩展、长任务、恢复与幂等

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#agent-06)、[MCP Tasks Extension](https://github.com/modelcontextprotocol/ext-tasks)（英文原文，仅用于版本核验）、[MCP 2026 Tasks 迁移](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/#tasks-graduates-to-an-extension)（英文原文，仅用于版本核验）、[MDN AbortController 中文版](https://developer.mozilla.org/zh-CN/docs/Web/API/AbortController)。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：Tasks 扩展协商、task handle、get/update/cancel、持久化、进度、恢复、取消和幂等；明确 `tasks/list` 已移除。
- 严格考核：首考题 1（资料定位）：只允许使用《中文核心讲义》，定位能支撑「Tasks 扩展、长任务、恢复与幂等」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：闭卷用状态图、数据流、时序或类型推导解释关键机制、前置假设、失败传播与不适用条件，并以首考题 3 的具体产出举例；首考题 3（最小产出）：实现一个可持续数分钟的代码分析任务，支持进度、取消、浏览器刷新恢复、失败重试和幂等键；首考题 4（受限排错）：对首考题 3 实施至少一个正常、一个边界和一个故障注入；提交预期与实际、最小复现、由资料支持的 3 项假设、逐项证伪证据、根因、最小修复与回归验证；首考题 5（学习复述）：3 分钟按问题、机制、选择、反例和验证证据五段复述，并回答一个边界追问。命题边界：参考答案必须逐题回指学习资料、题目依据或通过标准；评分只依据列出资料、题目给定输入和可复核产出；额外框架经验不得替代机制与证据。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：刷新不丢任务；取消可达服务端；同一幂等键不重复创建；失败区分可重试与不可重试。评估边界：评分只依据列出资料、题目给定输入和可复核产出；额外框架经验不得替代机制与证据。
- 预计耗时：资料 135 分钟；练习 195 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## AGENT-07 多 Agent 协作与上下文隔离

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/advanced-topics.md#agent-07)、[AI SDK Agents](https://ai-sdk.dev/docs/agents)（英文原文，仅用于版本核验）、[AI SDK Subagents](https://ai-sdk.dev/docs/agents/subagents)（英文原文，仅用于版本核验）、[MCP 2026 弃用说明](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/#roots-sampling-and-logging-are-deprecated)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：多 Agent 职责、任务交接、上下文隔离、停止条件、直接模型供应商调用，以及不再以 MCP Sampling 构建新系统。
- 严格考核：题源包含《中文核心讲义》；首考题 1（资料定位）：只允许使用《中文核心讲义》，定位能支撑「多 Agent 协作与上下文隔离」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：解释协调者、子任务、共享产物与模型调用边界；首考题 3（最小产出）：设计研究、实现、评审三个角色的协作协议，以直接模型 API 完成推理并限制上下文权限；首考题 4（受限排错）：处理循环委派、提示污染、预算失控和冲突结论；首考题 5（学习复述）：说明多 Agent 何时不如确定性工作流。命题边界：不得把已弃用 Sampling 作为主线方案。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：有明确单一责任与交接格式；敏感上下文不广播；循环委派可检测；最终结论可追溯到各 Agent 证据。评估边界：评分只依据列出资料、题目给定输入和可复核产出；额外框架经验不得替代机制与证据。
- 预计耗时：资料 135 分钟；练习 195 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## AGENT-11 A2A 协议、Agent Card 与跨组织协作

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/advanced-topics.md#agent-11)、[A2A Protocol Specification 1.0](https://a2a-protocol.org/latest/specification/)（英文原文，仅用于版本核验）、[OWASP Agentic Security Initiative](https://genai.owasp.org/initiatives/agentic-security-initiative/)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：Agent Card 与能力发现、Task/Message/Artifact、同步/流式/异步交互、状态与取消、认证授权、签名元数据、扩展与版本协商、跨租户/跨组织信任、审计、重放和 A2A 与 MCP 的职责边界。
- 严格考核：首考题 1（资料定位）：只允许使用《中文核心讲义》，定位发现、任务生命周期、认证和协议边界；首考题 2（机制解释）：闭卷解释用户、客户端 Agent、远程 Agent、身份提供方和工具服务器之间的消息与信任链；首考题 3（最小产出）：实现一个发布 Agent Card、创建/订阅/取消任务并返回 Artifact 的客户端与服务端垂直切片；首考题 4（受限排错）：定位能力声明漂移、状态乱序、重复任务、伪造 Agent Card、越权委派或版本不兼容；首考题 5（学习复述）：3 分钟说明何时用 A2A、何时用 MCP、何时使用应用内部调用。命题边界：不得因对端自称某能力就授予权限；英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：任务状态机可恢复且幂等；远端身份与授权逐跳验证；Artifact 可追溯；取消、超时和回调重放安全；能力与扩展可协商；跨组织数据最小化并有审计。评估边界：只连接两个本地 Demo、没有失败和信任验证不能通过。
- 预计耗时：资料 135 分钟；练习 195 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## AGENT-08 工具描述、Schema 与可发现性

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/advanced-topics.md#agent-08)、[MCP TypeScript Tools](https://ts.sdk.modelcontextprotocol.io/v2/servers/tools)（英文原文，仅用于版本核验）、[JSON Schema 2020-12](https://json-schema.org/draft/2020-12)（英文原文，仅用于版本核验）、[MCP 2026 发布说明](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/#full-json-schema-2020-12-for-tools)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：工具命名、输入/输出 Schema、组合与引用、`structuredContent`、描述、缓存 TTL、分页与取消、可发现性、Resources/Prompts 引用边界，以及参数大小、路径和资源读取上限。
- 严格考核：首考题 1（资料定位）：只允许使用《中文核心讲义》，定位能支撑「工具描述、Schema 与可发现性」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：闭卷用状态图、数据流、时序或类型推导解释关键机制、前置假设、失败传播与不适用条件，并以首考题 3 的具体产出举例；首考题 3（最小产出）：为 10 个相似业务接口重写工具名称、描述、输入 Schema 和错误，并用 20 条意图测试工具选择准确率；首考题 4（受限排错）：对首考题 3 实施至少一个正常、一个边界和一个故障注入；提交预期与实际、最小复现、由资料支持的 3 项假设、逐项证伪证据、根因、最小修复与回归验证；首考题 5（学习复述）：3 分钟按问题、机制、选择、反例和验证证据五段复述，并回答一个边界追问。命题边界：参考答案必须逐题回指学习资料、题目依据或通过标准；评分只依据列出资料、题目给定输入和可复核产出；额外框架经验不得替代机制与证据。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：名称稳定无歧义；只读上下文优先 Resource、可复用模板使用 Prompt、副作用使用 Tool；必填/枚举/互斥与大小上限进入 Schema；路径和 URI 经过归一化与允许范围校验；描述不泄露实现细节；选择错误有评估数据。评估边界：不能只用 Schema 校验通过率代替工具选择和安全边界评估。
- 预计耗时：资料 135 分钟；练习 195 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## AGENT-09 Agent 可观测性与回放

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#agent-09)、[OpenTelemetry JS](https://opentelemetry.io/zh/docs/languages/js/)、[W3C Trace Context](https://www.w3.org/TR/trace-context/)（英文原文，仅用于版本核验）、[MCP 2026 弃用说明](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/#roots-sampling-and-logging-are-deprecated)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：跨 Host/Client/Server 的 Trace Context、step/tool/resource/token/approval/error 结构化事件、协议请求 ID 关联、日志级别、采样、字段脱敏、只读回放、保留期限，以及以 OpenTelemetry 替代新系统中的 MCP Logging。
- 严格考核：题源包含《中文核心讲义》；首考题 1（资料定位）：只允许使用《中文核心讲义》，定位能支撑「Agent 可观测性与回放」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：解释 trace 如何跨模型与工具传播；首考题 3（最小产出）：记录 trace、step、tool、token、latency、approval 和 error，并实现只读回放时间线；首考题 4（受限排错）：处理断链、重复 span、敏感信息和回放误执行；首考题 5（学习复述）：说明日志、指标和追踪的边界。命题边界：不得以已弃用 MCP Logging 作为结构化可观测性主方案。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：敏感参数在采集前脱敏；trace 能关联 MCP 请求并定位慢步骤和失败链路；日志有级别、采样、访问控制和保留期限；不会把完整用户内容无期限写日志；回放默认只读且绝不重新执行副作用。评估边界：日志数量和仪表盘截图不能替代一次端到端定位与安全回放证据。
- 预计耗时：资料 135 分钟；练习 195 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## AGENT-10 Agent 安全、OAuth 与最小权限

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/advanced-topics.md#agent-10)、[MCP Security Best Practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices)（英文原文，仅用于版本核验）、[OAuth Security BCP](https://www.rfc-editor.org/rfc/rfc9700)（英文原文，仅用于版本核验）、[OWASP Agentic Security Initiative](https://genai.owasp.org/initiatives/agentic-security-initiative/)（英文原文，仅用于版本核验）、[MCP 2026 Authorization Hardening](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/#authorization-hardening)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：OAuth/OIDC issuer、audience、Scope、PKCE、动态注册、Token passthrough、confused deputy、SSRF、DNS rebinding、路径穿越、符号链接逃逸、工具/资源投毒，以及 Agentic Top 10 所强调的目标劫持、工具滥用、身份权限滥用、供应链、代码执行、记忆/上下文投毒、级联失效、人机信任利用和失控 Agent；控制覆盖最小权限、审批、预算、隔离、审计与紧急停止。
- 严格考核：首考题 1（资料定位）：只允许使用《中文核心讲义》，定位能支撑「Agent 安全、OAuth 与最小权限」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：闭卷用状态图、数据流、时序或类型推导解释关键机制、前置假设、失败传播与不适用条件，并以首考题 3 的具体产出举例；首考题 3（最小产出）：完成 token passthrough、confused deputy、SSRF、DNS rebinding、权限扩大和工具投毒威胁建模，并提出验证方案；首考题 4（受限排错）：对首考题 3 实施至少一个正常、一个边界和一个故障注入；提交预期与实际、最小复现、由资料支持的 3 项假设、逐项证伪证据、根因、最小修复与回归验证；首考题 5（学习复述）：3 分钟按问题、机制、选择、反例和验证证据五段复述，并回答一个边界追问。命题边界：参考答案必须逐题回指学习资料、题目依据或通过标准；评分只依据列出资料、题目给定输入和可复核产出；额外框架经验不得替代机制与证据。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：OAuth issuer、audience、scope、state 与 PKCE 校验正确；不接受任意回调、Token 透传或开放重定向；本地服务防 DNS rebinding 与 SSRF；文件访问不能逃逸允许根目录；工具、资源、记忆和 Agent 间消息均按不可信输入处理；权限、预算和委派深度默认最小，高风险调用必须确认、可审计且可停止；至少验证一条级联失效链。评估边界：只完成正常登录或提示词防护而未执行攻击验证，不能通过。
- 预计耗时：资料 135 分钟；练习 195 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## 领域综合考核

用 TypeScript SDK v2 实现一个面向 2026-07-28 的无状态 MCP 服务，具备 resource、tool、MRTR 审批、Tasks 扩展、取消与 OpenTelemetry 追踪；制作客户端运行时间线，并完成 2025 兼容、安全和迁移答辩。
