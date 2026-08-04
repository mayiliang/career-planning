# 13 Agent、MCP 与 AI 工具协议

这一领域把“会调用模型”升级为“能设计可靠 Agent 系统”。前端工程师需要理解工具协议、状态、审批、长任务和可观测性，才能做好 Agent 产品的交互层与工具层。

### MCP 核心模型

## MCP-01 MCP Server、Tools/Resources/Prompts 与 Schema 核心模型

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/content-audit-13-14.md#mcp-01)、[MCP 2026-07-28 规范](https://modelcontextprotocol.io/specification/2026-07-28)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：MCP Host、Client、Server 的职责；Tools、Resources、Prompts 的语义边界、能力声明与发现；JSON Schema 2020-12、结构化输出、协议错误与业务错误；显式业务 handle、只读/有副作用标记和最小能力暴露。Streamable HTTP、stdio、会话恢复与版本传输兼容归 `AGENT-03`。
- 严格考核：首考题 1（资料定位）：只允许使用《中文核心讲义》，定位 Host/Client/Server、三种服务端原语、Schema 和能力协商依据；首考题 2（机制解释）：闭卷解释三种原语、能力声明、结构化输入输出、协议错误和有状态业务的关系；首考题 3（最小产出）：把一组接口文档能力正确拆成 Tool、Resource 和 Prompt，实现只读 Server、结构化输出、显式业务 handle 与能力协商测试；首考题 4（受限排错）：处理错误原语、Schema 不兼容、重复副作用、能力过宽、业务错误冒充协议错误和未知能力；首考题 5（学习复述）：3 分钟说明 MCP 是协议能力模型而不是 Agent 框架或传输实现。命题边界：不重复考核具体传输生命周期。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：Host、Client、Server 责任清晰；原语选择与语义一致；输入输出严格校验；协议错误与业务错误可区分；业务状态通过显式 handle 传递；能力最小且可协商；无越权文件或网络访问。评估边界：只让 SDK 示例运行、把所有能力做成 Tool 或用具体传输细节代替核心模型解释不能通过。
- 预计耗时：资料 135 分钟；练习 195 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

### Agent 循环与停止条件

## AGENT-01 Agent Loop、计划与停止条件

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/content-audit-13-14.md#agent-01)、[AI SDK Loop Control](https://ai-sdk.dev/docs/agents/loop-control)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：observe-plan-act-reflect 循环、目标/步骤状态、最大步数、预算、重复动作检测、取消、停止和恢复；覆盖不可达目标与失控循环。
- 严格考核：首考题 1（资料定位）：只允许使用《中文核心讲义》，定位能支撑「Agent Loop、计划与停止条件」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：闭卷解释「Agent Loop、计划与停止条件」覆盖的输入、状态转换、运行边界与失败传播，并用首考题 3 的产出证明机制选择；首考题 3（最小产出）：画出 observe-plan-act-reflect 循环，设计最大步数、预算、取消、重复动作检测和失败停止条件，并用状态机实现；首考题 4（受限排错）：围绕「Agent Loop、计划与停止条件」的首考题 3 产出注入正常、边界和失败场景，提交预期/实际、三项资料假设、证伪证据、根因、修复与回归；首考题 5（学习复述）：3 分钟说明「Agent Loop、计划与停止条件」解决的问题、运行机制、选型条件、反例和验证证据，并回答边界变化追问。命题边界：只在「Agent Loop、计划与停止条件」所列资料和覆盖范围内命题；资料外经验不能替代题目要求的机制与证据。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：不会把 while(true) 当 Agent；每一步可审计；停止与恢复确定；用户能看到当前目标、动作和剩余预算。评估边界：缺少与「Agent Loop、计划与停止条件」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 135 分钟；练习 195 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

### MCP 传输与客户端兼容

## AGENT-03 MCP 传输、显式状态与跨版本兼容

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/content-audit-13-14.md#agent-03)、[MCP 2026 无状态协议小节](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/#a-stateless-protocol)（英文原文，仅用于版本核验）、[MCP HTTP Server](https://ts.sdk.modelcontextprotocol.io/v2/api/%40modelcontextprotocol/node/streamableHttp.html)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：无状态请求、`MCP-Protocol-Version`、`Mcp-Method`/`Mcp-Name`、显式 handle、MRTR、stdio 与 2025 会话协议兼容。
- 严格考核：题源包含《中文核心讲义》；首考题 1（资料定位）：只允许使用《中文核心讲义》，定位能支撑「MCP 传输、显式状态与跨版本兼容」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：解释为什么 `initialize`、`initialized` 和 `Mcp-Session-Id` 在 2026 协议中被移除；首考题 3（最小产出）：分别实现 stdio 和无状态 HTTP 工具调用，以显式 handle 管理业务状态，并用 legacy adapter 兼容 2025 客户端；首考题 4（受限排错）：处理 Header/Body 不一致、重复副作用、负载均衡和断线；首考题 5（学习复述）：比较 2025 与 2026 协议。命题边界：不得把旧协议会话机制作为当前主实现。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：2026 请求可落到任意实例；状态以显式 handle 或业务存储承载；版本分支可测试；远程服务有 Origin、Host 和认证校验。评估边界：只让旧 SDK 示例运行不能通过。
- 预计耗时：资料 135 分钟；练习 195 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## AGENT-04 MCP Client、服务发现与版本兼容

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/content-audit-13-14.md#agent-04)、[MCP TypeScript Client](https://ts.sdk.modelcontextprotocol.io/v2/clients/connect)（英文原文，仅用于版本核验）、[MCP Protocol Versions](https://ts.sdk.modelcontextprotocol.io/v2/protocol-versions)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：`server/discover`、协议/能力协商、版本选择、工具/资源缓存与失效、未知能力忽略、能力缺失降级、旧新客户端/服务端兼容矩阵和 2025/2026 双栈迁移退出。
- 严格考核：题源包含《中文核心讲义》；首考题 1（资料定位）：只允许使用《中文核心讲义》，定位能支撑「MCP Client、服务发现与版本兼容」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：解释 2026 按请求元数据与 2025 初始化协商的差异；首考题 3（最小产出）：实现客户端发现、工具/资源读取、分页、取消、缓存 TTL 与双版本兼容；首考题 4（受限排错）：处理错误版本、自报身份不可信、缓存陈旧和能力缺失；首考题 5（学习复述）：说明兼容层退出策略。命题边界：`serverInfo/clientInfo` 不得用于安全决策。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：不假设服务端一定支持全部能力；版本不兼容有明确提示；请求可取消；分页不会漏数据或死循环。评估边界：缺少与「MCP Client、服务发现与版本兼容」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 135 分钟；练习 195 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

### Agent 人工控制与长任务

## AGENT-05 Human-in-the-loop 与高风险审批

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/content-audit-13-14.md#agent-05)、[MCP Input Required / MRTR](https://ts.sdk.modelcontextprotocol.io/v2/servers/input-required)（英文原文，仅用于版本核验）、[MCP 2026 MRTR 小节](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/#server-to-client-requests-restructured)（英文原文，仅用于版本核验）、[Google PAIR：Feedback + Control](https://pair.withgoogle.com/guidebook-v2/chapter/feedback-controls/)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：2026 协议的 `InputRequiredResult`、请求状态回传、Elicitation、高风险审批、用户接管与 2025 客户端降级。
- 严格考核：首考题 1（资料定位）：只允许使用《中文核心讲义》，定位能支撑「Human-in-the-loop 与高风险审批」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：闭卷解释「Human-in-the-loop 与高风险审批」覆盖的输入、状态转换、运行边界与失败传播，并用首考题 3 的产出证明机制选择；首考题 3（最小产出）：为删除文件、发送消息、支付和发布四类工具设计风险分级与审批 UI，支持参数编辑、拒绝、一次授权和范围授权；首考题 4（受限排错）：围绕「Human-in-the-loop 与高风险审批」的首考题 3 产出注入正常、边界和失败场景，提交预期/实际、三项资料假设、证伪证据、根因、修复与回归；首考题 5（学习复述）：3 分钟说明「Human-in-the-loop 与高风险审批」解决的问题、运行机制、选型条件、反例和验证证据，并回答边界变化追问。命题边界：只在「Human-in-the-loop 与高风险审批」所列资料和覆盖范围内命题；资料外经验不能替代题目要求的机制与证据。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：高风险动作不能静默执行；确认页展示真实参数和影响范围；拒绝不会破坏会话；授权可撤销并有审计记录。评估边界：缺少与「Human-in-the-loop 与高风险审批」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 135 分钟；练习 195 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## AGENT-06 Tasks 扩展、长任务、恢复与幂等

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/content-audit-13-14.md#agent-06)、[MCP Tasks Extension](https://github.com/modelcontextprotocol/ext-tasks)（英文原文，仅用于版本核验）、[MCP 2026 Tasks 迁移](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/#tasks-graduates-to-an-extension)（英文原文，仅用于版本核验）、[MDN AbortController 中文版](https://developer.mozilla.org/zh-CN/docs/Web/API/AbortController)。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：Tasks 扩展协商、task handle、get/update/cancel、持久化、进度、恢复、取消和幂等；明确 `tasks/list` 已移除。
- 严格考核：首考题 1（资料定位）：只允许使用《中文核心讲义》，定位能支撑「Tasks 扩展、长任务、恢复与幂等」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：闭卷解释「Tasks 扩展、长任务、恢复与幂等」覆盖的输入、状态转换、运行边界与失败传播，并用首考题 3 的产出证明机制选择；首考题 3（最小产出）：实现一个可持续数分钟的代码分析任务，支持进度、取消、浏览器刷新恢复、失败重试和幂等键；首考题 4（受限排错）：围绕「Tasks 扩展、长任务、恢复与幂等」的首考题 3 产出注入正常、边界和失败场景，提交预期/实际、三项资料假设、证伪证据、根因、修复与回归；首考题 5（学习复述）：3 分钟说明「Tasks 扩展、长任务、恢复与幂等」解决的问题、运行机制、选型条件、反例和验证证据，并回答边界变化追问。命题边界：只在「Tasks 扩展、长任务、恢复与幂等」所列资料和覆盖范围内命题；资料外经验不能替代题目要求的机制与证据。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：刷新不丢任务；取消可达服务端；同一幂等键不重复创建；失败区分可重试与不可重试。评估边界：缺少与「Tasks 扩展、长任务、恢复与幂等」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 135 分钟；练习 195 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

### 多 Agent 与跨组织协作

## AGENT-07 多 Agent 协作与上下文隔离

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/content-audit-13-14.md#agent-07)、[AI SDK Subagents](https://ai-sdk.dev/docs/agents/subagents)（英文原文，仅用于版本核验）、[MCP 2026 弃用说明](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/#roots-sampling-and-logging-are-deprecated)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：多 Agent 职责、任务交接、上下文隔离、停止条件、直接模型供应商调用，以及不再以 MCP Sampling 构建新系统。
- 严格考核：题源包含《中文核心讲义》；首考题 1（资料定位）：只允许使用《中文核心讲义》，定位能支撑「多 Agent 协作与上下文隔离」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：解释协调者、子任务、共享产物与模型调用边界；首考题 3（最小产出）：设计研究、实现、评审三个角色的协作协议，以直接模型 API 完成推理并限制上下文权限；首考题 4（受限排错）：处理循环委派、提示污染、预算失控和冲突结论；首考题 5（学习复述）：说明多 Agent 何时不如确定性工作流。命题边界：不得把已弃用 Sampling 作为主线方案。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：有明确单一责任与交接格式；敏感上下文不广播；循环委派可检测；最终结论可追溯到各 Agent 证据。评估边界：缺少与「多 Agent 协作与上下文隔离」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 135 分钟；练习 195 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## AGENT-11 A2A 协议、Agent Card 与跨组织协作

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/content-audit-13-14.md#agent-11)、[A2A Agent Discovery](https://a2a-protocol.org/latest/topics/agent-discovery/)（英文原文，仅用于版本核验）、[A2A 核心概念与任务](https://a2a-protocol.org/latest/topics/key-concepts/)（英文原文，仅用于版本核验）、[A2A 规范认证与版本](https://a2a-protocol.org/latest/specification/#7-authentication-and-authorization)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：Agent Card 与能力发现、Task/Message/Artifact、同步/流式/异步交互、状态与取消、认证授权、签名元数据、扩展与版本协商、跨租户/跨组织信任、审计、重放和 A2A 与 MCP 的职责边界。
- 严格考核：首考题 1（资料定位）：只允许使用《中文核心讲义》，定位发现、任务生命周期、认证和协议边界；首考题 2（机制解释）：闭卷解释用户、客户端 Agent、远程 Agent、身份提供方和工具服务器之间的消息与信任链；首考题 3（最小产出）：实现一个发布 Agent Card、创建/订阅/取消任务并返回 Artifact 的客户端与服务端垂直切片；首考题 4（受限排错）：定位能力声明漂移、状态乱序、重复任务、伪造 Agent Card、越权委派或版本不兼容；首考题 5（学习复述）：3 分钟说明何时用 A2A、何时用 MCP、何时使用应用内部调用。命题边界：不得因对端自称某能力就授予权限；英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：任务状态机可恢复且幂等；远端身份与授权逐跳验证；Artifact 可追溯；取消、超时和回调重放安全；能力与扩展可协商；跨组织数据最小化并有审计。评估边界：只连接两个本地 Demo、没有失败和信任验证不能通过。
- 预计耗时：资料 135 分钟；练习 195 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

### 工具体验、可观测性与运行安全

## AGENT-08 工具描述、Schema 与可发现性

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/content-audit-13-14.md#agent-08)、[MCP TypeScript Tools](https://ts.sdk.modelcontextprotocol.io/v2/servers/tools)（英文原文，仅用于版本核验）、[JSON Schema 2020-12](https://json-schema.org/draft/2020-12)（英文原文，仅用于版本核验）、[MCP 2026 发布说明](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/#full-json-schema-2020-12-for-tools)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：工具命名、输入/输出 Schema、组合与引用、`structuredContent`、描述、缓存 TTL、分页与取消、可发现性、Resources/Prompts 引用边界，以及参数大小、路径和资源读取上限。
- 严格考核：首考题 1（资料定位）：只允许使用《中文核心讲义》，定位能支撑「工具描述、Schema 与可发现性」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：闭卷解释「工具描述、Schema 与可发现性」覆盖的输入、状态转换、运行边界与失败传播，并用首考题 3 的产出证明机制选择；首考题 3（最小产出）：为 10 个相似业务接口重写工具名称、描述、输入 Schema 和错误，并用 20 条意图测试工具选择准确率；首考题 4（受限排错）：围绕「工具描述、Schema 与可发现性」的首考题 3 产出注入正常、边界和失败场景，提交预期/实际、三项资料假设、证伪证据、根因、修复与回归；首考题 5（学习复述）：3 分钟说明「工具描述、Schema 与可发现性」解决的问题、运行机制、选型条件、反例和验证证据，并回答边界变化追问。命题边界：只在「工具描述、Schema 与可发现性」所列资料和覆盖范围内命题；资料外经验不能替代题目要求的机制与证据。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：名称稳定无歧义；只读上下文优先 Resource、可复用模板使用 Prompt、副作用使用 Tool；必填/枚举/互斥与大小上限进入 Schema；路径和 URI 经过归一化与允许范围校验；描述不泄露实现细节；选择错误有评估数据。评估边界：不能只用 Schema 校验通过率代替工具选择和安全边界评估。
- 预计耗时：资料 135 分钟；练习 195 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## AGENT-09 Agent 可观测性与回放

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/content-audit-13-14.md#agent-09)、[W3C Trace Context](https://www.w3.org/TR/trace-context/)（英文原文，仅用于版本核验）、[MCP 2026 弃用说明](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/#roots-sampling-and-logging-are-deprecated)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：跨 Host/Client/Server 的 Trace Context、step/tool/resource/token/approval/error 结构化事件、协议请求 ID 关联、日志级别、采样、字段脱敏、只读回放、保留期限，以及以 OpenTelemetry 替代新系统中的 MCP Logging。
- 严格考核：题源包含《中文核心讲义》；首考题 1（资料定位）：只允许使用《中文核心讲义》，定位能支撑「Agent 可观测性与回放」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：解释 trace 如何跨模型与工具传播；首考题 3（最小产出）：记录 trace、step、tool、token、latency、approval 和 error，并实现只读回放时间线；首考题 4（受限排错）：处理断链、重复 span、敏感信息和回放误执行；首考题 5（学习复述）：说明日志、指标和追踪的边界。命题边界：不得以已弃用 MCP Logging 作为结构化可观测性主方案。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：敏感参数在采集前脱敏；trace 能关联 MCP 请求并定位慢步骤和失败链路；日志有级别、采样、访问控制和保留期限；不会把完整用户内容无期限写日志；回放默认只读且绝不重新执行副作用。评估边界：日志数量和仪表盘截图不能替代一次端到端定位与安全回放证据。
- 预计耗时：资料 135 分钟；练习 195 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## AGENT-10 Agent 身份、授权、工具权限与运行隔离

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/content-audit-13-14.md#agent-10)、[MCP Security Best Practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices)（英文原文，仅用于版本核验）、[OAuth Security BCP](https://www.rfc-editor.org/rfc/rfc9700)（英文原文，仅用于版本核验）、[MCP 2026 Authorization Hardening](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/#authorization-hardening)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：Agent 与用户、服务、工具之间的身份和委派边界；OAuth/OIDC issuer、audience、Scope、PKCE、动态注册、Token passthrough、confused deputy；工具/资源权限、最小授权、运行沙箱、文件/网络允许列表、预算、审批、审计、撤销与紧急停止。系统级威胁建模、红队和滥用防护归 `AISAFE-02`。
- 严格考核：首考题 1（资料定位）：只允许使用《中文核心讲义》，定位 Agent 身份、委派、OAuth 校验、工具权限和运行隔离依据；首考题 2（机制解释）：闭卷画出用户、Agent、授权服务器、资源服务器和工具的身份/Token/权限流，解释 delegated authority 与 Agent 自身身份的差异；首考题 3（最小产出）：为一组读写工具设计最小 Scope、逐工具授权、文件/网络沙箱、预算、审批、撤销和审计，并验证 token passthrough、confused deputy、越权文件和网络访问；首考题 4（受限排错）：注入 audience 错配、权限扩大、委派链失控、沙箱逃逸和撤销延迟，提交证据链；首考题 5（学习复述）：3 分钟说明身份、授权、工具权限、运行隔离和通用红队各自边界。命题边界：不重复考核完整 Agentic Top 10 红队。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：OAuth issuer、audience、scope、state 与 PKCE 校验正确；不接受任意回调、Token 透传或开放重定向；文件和网络不能逃逸允许范围；工具权限、预算和委派深度默认最小；高风险调用必须确认、可审计、可撤销且可停止。评估边界：只完成正常登录、只写提示词防护或没有实际越权验证不能通过。
- 预计耗时：资料 135 分钟；练习 195 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## 领域综合考核

- [ ] 已通过领域综合考核
- 任务：用 TypeScript SDK v2 实现一个面向 2026-07-28 的无状态 MCP 服务，具备 resource、tool、MRTR 审批、Tasks 扩展、取消与 OpenTelemetry 追踪；制作客户端运行时间线，并完成 2025 兼容、安全和迁移答辩。
- 通过标准：modern 与 legacy/auto 路径均有协议测试；高风险动作不可静默执行；任务可取消、恢复且幂等；能力缺失和版本不兼容可降级；Trace 能串联请求、工具与审批。评估边界：领域综合考核只依据本领域列出的资料、题目输入和可复核产出；不得用资料外经验替代跨知识点整合证据。
- 预计耗时：准备 120 分钟；实现 420 分钟；故障注入 120 分钟；答辩 120 分钟
