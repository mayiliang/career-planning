# 13 Agent、MCP 与 AI 工具协议

这一领域把“会调用模型”升级为“能设计可靠 Agent 系统”。前端工程师需要理解工具协议、状态、审批、长任务和可观测性，才能做好 Agent 产品的交互层与工具层。

## AGENT-01 Agent Loop、计划与停止条件

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/advanced-topics.md#agent-01)、[AI SDK Agents](https://ai-sdk.dev/docs/agents/overview)（英文原文，仅用于版本核验）、[MCP 核心架构](https://modelcontextprotocol.io/docs/learn/architecture)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：围绕「Agent Loop、计划与停止条件」的定义、机制、边界、反例和通过标准；首考不得引入未列资料或题目未点名的框架/项目场景。
- 严格考核：首考题 1（资料定位）：只允许使用《中文核心讲义》及《AI SDK Agents》《MCP 核心架构》，分别摘出能支撑「Agent Loop、计划与停止条件」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：不用资料复述「Agent Loop、计划与停止条件」的因果链路、适用条件、失败表现和不该使用的场景；首考题 3（最小产出）：画出 observe-plan-act-reflect 循环，设计最大步数、预算、取消、重复动作检测和失败停止条件，并用状态机实现；首考题 4（受限排错）：围绕首考题 3 的产出给出一个失败现象，写出预期结果、实际异常、3 个可能原因、验证步骤和修复方案，证据只能来自上述资料或产出；首考题 5（学习复述）：3 分钟向同事讲清是什么、什么时候用、如何验证没有用错。命题边界：参考答案必须逐题回指学习资料、题目依据或通过标准；不得使用未列资料或题目未点名的框架/项目场景作为主要依据。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：不会把 while(true) 当 Agent；每一步可审计；停止与恢复确定；用户能看到当前目标、动作和剩余预算。评估边界：不得用未列资料或题目未点名的框架/项目场景作为主要评分依据。
- 预计耗时：资料 135 分钟；练习 195 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## AGENT-02 MCP Tools、Resources 与 Prompts

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/advanced-topics.md#agent-02)、[MCP TypeScript SDK v2](https://ts.sdk.modelcontextprotocol.io/v2/)（英文原文，仅用于版本核验）、[MCP Tools](https://ts.sdk.modelcontextprotocol.io/v2/servers/tools)（英文原文，仅用于版本核验）、[MCP Resources](https://ts.sdk.modelcontextprotocol.io/v2/servers/resources)（英文原文，仅用于版本核验）、[MCP Prompts](https://ts.sdk.modelcontextprotocol.io/v2/servers/prompts)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：2026-07-28 协议下 Tools、Resources、Prompts 的语义、Schema、错误、缓存和安全边界。
- 严格考核：首考题 1（资料定位）：只允许使用《中文核心讲义》及《MCP TypeScript SDK》《MCP Server 指南》，分别摘出能支撑「MCP Tools、Resources 与 Prompts」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：不用资料复述「MCP Tools、Resources 与 Prompts」的因果链路、适用条件、失败表现和不该使用的场景；首考题 3（最小产出）：把一个现有接口文档工具拆成 tools、resources、prompts，解释三者语义边界，并实现最小 MCP Server；首考题 4（受限排错）：围绕首考题 3 的产出给出一个失败现象，写出预期结果、实际异常、3 个可能原因、验证步骤和修复方案，证据只能来自上述资料或产出；首考题 5（学习复述）：3 分钟向同事讲清是什么、什么时候用、如何验证没有用错。命题边界：参考答案必须逐题回指学习资料、题目依据或通过标准；不得使用未列资料或题目未点名的框架/项目场景作为主要依据。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：只读数据优先 resource；副作用才用 tool；参数有 Zod 校验；错误使用协议错误而不是自然语言伪成功。评估边界：不得用未列资料或题目未点名的框架/项目场景作为主要评分依据。
- 预计耗时：资料 135 分钟；练习 195 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## AGENT-03 无状态 Streamable HTTP、stdio 与显式状态

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/advanced-topics.md#agent-03)、[MCP 2026-07-28 发布说明](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/)（英文原文，仅用于版本核验）、[TypeScript SDK 2026 协议支持](https://ts.sdk.modelcontextprotocol.io/v2/migration/support-2026-07-28)（英文原文，仅用于版本核验）、[MCP HTTP Server](https://ts.sdk.modelcontextprotocol.io/v2/servers/http)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：无状态请求、`MCP-Protocol-Version`、`Mcp-Method`/`Mcp-Name`、显式 handle、MRTR、stdio 与 2025 会话协议兼容。
- 严格考核：题源包含《中文核心讲义》；首考题 1（资料定位）：定位无状态核心、传输 Header 和旧版兼容要求；首考题 2（机制解释）：解释为什么 `initialize`、`initialized` 和 `Mcp-Session-Id` 在 2026 协议中被移除；首考题 3（最小产出）：分别实现 stdio 和无状态 HTTP 工具调用，以显式 handle 管理业务状态，并用 legacy adapter 兼容 2025 客户端；首考题 4（受限排错）：处理 Header/Body 不一致、重复副作用、负载均衡和断线；首考题 5（学习复述）：比较 2025 与 2026 协议。命题边界：不得把旧协议会话机制作为当前主实现。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：2026 请求可落到任意实例；状态以显式 handle 或业务存储承载；版本分支可测试；远程服务有 Origin、Host 和认证校验。评估边界：只让旧 SDK 示例运行不能通过。
- 预计耗时：资料 135 分钟；练习 195 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## AGENT-04 MCP Client、服务发现与版本兼容

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/advanced-topics.md#agent-04)、[MCP TypeScript Client](https://ts.sdk.modelcontextprotocol.io/v2/clients/connect)（英文原文，仅用于版本核验）、[MCP Protocol Versions](https://ts.sdk.modelcontextprotocol.io/v2/clients/protocol-versions)（英文原文，仅用于版本核验）、[2026 协议迁移](https://ts.sdk.modelcontextprotocol.io/v2/migration/support-2026-07-28)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：`server/discover`、版本选择、工具/资源缓存、能力缺失降级和 2025/2026 双栈兼容。
- 严格考核：题源包含《中文核心讲义》；首考题 1（资料定位）：定位服务发现和版本选择方法；首考题 2（机制解释）：解释 2026 按请求元数据与 2025 初始化协商的差异；首考题 3（最小产出）：实现客户端发现、工具/资源读取、分页、取消、缓存 TTL 与双版本兼容；首考题 4（受限排错）：处理错误版本、自报身份不可信、缓存陈旧和能力缺失；首考题 5（学习复述）：说明兼容层退出策略。命题边界：`serverInfo/clientInfo` 不得用于安全决策。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：不假设服务端一定支持全部能力；版本不兼容有明确提示；请求可取消；分页不会漏数据或死循环。评估边界：不得用未列资料或题目未点名的框架/项目场景作为主要评分依据。
- 预计耗时：资料 135 分钟；练习 195 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## AGENT-05 Human-in-the-loop 与高风险审批

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/advanced-topics.md#agent-05)、[MCP Input Required / MRTR](https://ts.sdk.modelcontextprotocol.io/v2/servers/input-required)（英文原文，仅用于版本核验）、[MCP 2026 发布说明](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/)（英文原文，仅用于版本核验）、[Google PAIR 控制原则](https://pair.withgoogle.com/guidebook/)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：2026 协议的 `InputRequiredResult`、请求状态回传、Elicitation、高风险审批与 2025 客户端降级。
- 严格考核：首考题 1（资料定位）：只允许使用《中文核心讲义》及《MCP Elicitation》《Google PAIR 控制原则》，分别摘出能支撑「Human-in-the-loop 与高风险审批」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：不用资料复述「Human-in-the-loop 与高风险审批」的因果链路、适用条件、失败表现和不该使用的场景；首考题 3（最小产出）：为删除文件、发送消息、支付和发布四类工具设计风险分级与审批 UI，支持参数编辑、拒绝、一次授权和范围授权；首考题 4（受限排错）：围绕首考题 3 的产出给出一个失败现象，写出预期结果、实际异常、3 个可能原因、验证步骤和修复方案，证据只能来自上述资料或产出；首考题 5（学习复述）：3 分钟向同事讲清是什么、什么时候用、如何验证没有用错。命题边界：参考答案必须逐题回指学习资料、题目依据或通过标准；不得使用未列资料或题目未点名的框架/项目场景作为主要依据。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：高风险动作不能静默执行；确认页展示真实参数和影响范围；拒绝不会破坏会话；授权可撤销并有审计记录。评估边界：不得用未列资料或题目未点名的框架/项目场景作为主要评分依据。
- 预计耗时：资料 135 分钟；练习 195 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## AGENT-06 Tasks 扩展、长任务、恢复与幂等

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#agent-06)、[MCP Tasks Extension](https://github.com/modelcontextprotocol/ext-tasks)（英文原文，仅用于版本核验）、[MCP 2026 Tasks 迁移](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/#tasks-graduates-to-an-extension)（英文原文，仅用于版本核验）、[MDN AbortController 中文版](https://developer.mozilla.org/zh-CN/docs/Web/API/AbortController)。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：Tasks 扩展协商、task handle、get/update/cancel、持久化、进度、恢复、取消和幂等；明确 `tasks/list` 已移除。
- 严格考核：首考题 1（资料定位）：只允许使用《中文核心讲义》及《MCP Tasks》《MDN AbortController》，分别摘出能支撑「长任务、进度、恢复与幂等」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：不用资料复述「长任务、进度、恢复与幂等」的因果链路、适用条件、失败表现和不该使用的场景；首考题 3（最小产出）：实现一个可持续数分钟的代码分析任务，支持进度、取消、浏览器刷新恢复、失败重试和幂等键；首考题 4（受限排错）：围绕首考题 3 的产出给出一个失败现象，写出预期结果、实际异常、3 个可能原因、验证步骤和修复方案，证据只能来自上述资料或产出；首考题 5（学习复述）：3 分钟向同事讲清是什么、什么时候用、如何验证没有用错。命题边界：参考答案必须逐题回指学习资料、题目依据或通过标准；不得使用未列资料或题目未点名的框架/项目场景作为主要依据。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：刷新不丢任务；取消可达服务端；同一幂等键不重复创建；失败区分可重试与不可重试。评估边界：不得用未列资料或题目未点名的框架/项目场景作为主要评分依据。
- 预计耗时：资料 135 分钟；练习 195 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## AGENT-07 多 Agent 协作与上下文隔离

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/advanced-topics.md#agent-07)、[AI SDK Agents](https://ai-sdk.dev/docs/agents)（英文原文，仅用于版本核验）、[AI SDK Subagents](https://ai-sdk.dev/docs/agents/subagents)（英文原文，仅用于版本核验）、[MCP 2026 弃用说明](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/#roots-sampling-and-logging-are-deprecated)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：多 Agent 职责、任务交接、上下文隔离、停止条件、直接模型供应商调用，以及不再以 MCP Sampling 构建新系统。
- 严格考核：题源包含《中文核心讲义》；首考题 1（资料定位）：定位 Agent/Subagent 和 Sampling 弃用依据；首考题 2（机制解释）：解释协调者、子任务、共享产物与模型调用边界；首考题 3（最小产出）：设计研究、实现、评审三个角色的协作协议，以直接模型 API 完成推理并限制上下文权限；首考题 4（受限排错）：处理循环委派、提示污染、预算失控和冲突结论；首考题 5（学习复述）：说明多 Agent 何时不如确定性工作流。命题边界：不得把已弃用 Sampling 作为主线方案。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：有明确单一责任与交接格式；敏感上下文不广播；循环委派可检测；最终结论可追溯到各 Agent 证据。评估边界：不得用未列资料或题目未点名的框架/项目场景作为主要评分依据。
- 预计耗时：资料 135 分钟；练习 195 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## AGENT-08 工具描述、Schema 与可发现性

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/advanced-topics.md#agent-08)、[MCP TypeScript Tools](https://ts.sdk.modelcontextprotocol.io/v2/servers/tools)（英文原文，仅用于版本核验）、[JSON Schema 2020-12](https://json-schema.org/draft/2020-12)（英文原文，仅用于版本核验）、[MCP 2026 发布说明](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/#full-json-schema-2020-12-for-tools)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：工具命名、输入/输出 Schema、组合与引用、`structuredContent`、描述、缓存 TTL、可发现性与验证资源上限。
- 严格考核：首考题 1（资料定位）：只允许使用《中文核心讲义》及《MCP Tools》《JSON Schema》，分别摘出能支撑「工具描述、Schema 与可发现性」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：不用资料复述「工具描述、Schema 与可发现性」的因果链路、适用条件、失败表现和不该使用的场景；首考题 3（最小产出）：为 10 个相似业务接口重写工具名称、描述、输入 Schema 和错误，并用 20 条意图测试工具选择准确率；首考题 4（受限排错）：围绕首考题 3 的产出给出一个失败现象，写出预期结果、实际异常、3 个可能原因、验证步骤和修复方案，证据只能来自上述资料或产出；首考题 5（学习复述）：3 分钟向同事讲清是什么、什么时候用、如何验证没有用错。命题边界：参考答案必须逐题回指学习资料、题目依据或通过标准；不得使用未列资料或题目未点名的框架/项目场景作为主要依据。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：名称稳定无歧义；必填/枚举/互斥约束进入 Schema；描述不泄露实现细节；选择错误有评估数据。评估边界：不得用未列资料或题目未点名的框架/项目场景作为主要评分依据。
- 预计耗时：资料 135 分钟；练习 195 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## AGENT-09 Agent 可观测性与回放

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#agent-09)、[OpenTelemetry JS](https://opentelemetry.io/zh/docs/languages/js/)、[W3C Trace Context](https://www.w3.org/TR/trace-context/)（英文原文，仅用于版本核验）、[MCP 2026 弃用说明](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/#roots-sampling-and-logging-are-deprecated)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：跨 Host/Client/Server 的 Trace Context、step/tool/token/approval/error 事件、脱敏、回放和以 OpenTelemetry 替代新系统中的 MCP Logging。
- 严格考核：题源包含《中文核心讲义》；首考题 1（资料定位）：定位 Trace Context 和 Logging 弃用依据；首考题 2（机制解释）：解释 trace 如何跨模型与工具传播；首考题 3（最小产出）：记录 trace、step、tool、token、latency、approval 和 error，并实现只读回放时间线；首考题 4（受限排错）：处理断链、重复 span、敏感信息和回放误执行；首考题 5（学习复述）：说明日志、指标和追踪的边界。命题边界：不得以已弃用 MCP Logging 作为结构化可观测性主方案。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：敏感参数脱敏；trace 能定位慢步骤和失败链路；不会把完整用户内容无期限写日志；回放不重新执行副作用。评估边界：不得用未列资料或题目未点名的框架/项目场景作为主要评分依据。
- 预计耗时：资料 135 分钟；练习 195 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## AGENT-10 Agent 安全、OAuth 与最小权限

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/advanced-topics.md#agent-10)、[MCP Security Best Practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices)（英文原文，仅用于版本核验）、[OAuth Security BCP](https://www.rfc-editor.org/rfc/rfc9700)（英文原文，仅用于版本核验）、[MCP 2026 Authorization Hardening](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/#authorization-hardening)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：OAuth/OIDC issuer、audience、Scope、动态注册、Token passthrough、confused deputy、SSRF、DNS rebinding、最小权限和审计。
- 严格考核：首考题 1（资料定位）：只允许使用《中文核心讲义》及《MCP Authorization》《MCP Security Best Practices》，分别摘出能支撑「Agent 安全、OAuth 与最小权限」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：不用资料复述「Agent 安全、OAuth 与最小权限」的因果链路、适用条件、失败表现和不该使用的场景；首考题 3（最小产出）：完成 token passthrough、confused deputy、SSRF、DNS rebinding、权限扩大和工具投毒威胁建模，并提出验证方案；首考题 4（受限排错）：围绕首考题 3 的产出给出一个失败现象，写出预期结果、实际异常、3 个可能原因、验证步骤和修复方案，证据只能来自上述资料或产出；首考题 5（学习复述）：3 分钟向同事讲清是什么、什么时候用、如何验证没有用错。命题边界：参考答案必须逐题回指学习资料、题目依据或通过标准；不得使用未列资料或题目未点名的框架/项目场景作为主要依据。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：OAuth audience 与 scope 校验正确；不接受任意回调；本地服务防 DNS rebinding；工具权限默认最小化。评估边界：不得用未列资料或题目未点名的框架/项目场景作为主要评分依据。
- 预计耗时：资料 135 分钟；练习 195 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## 领域综合考核

用 TypeScript SDK v2 实现一个面向 2026-07-28 的无状态 MCP 服务，具备 resource、tool、MRTR 审批、Tasks 扩展、取消与 OpenTelemetry 追踪；制作客户端运行时间线，并完成 2025 兼容、安全和迁移答辩。
