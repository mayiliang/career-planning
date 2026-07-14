# 13 Agent、MCP 与 AI 工具协议

这一领域把“会调用模型”升级为“能设计可靠 Agent 系统”。前端工程师需要理解工具协议、状态、审批、长任务和可观测性，才能做好 Agent 产品的交互层与工具层。

## AGENT-01 Agent Loop、计划与停止条件

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[AI SDK Agents](https://ai-sdk.dev/docs/agents/overview)、[MCP 核心架构](https://modelcontextprotocol.io/docs/learn/architecture)
- 严格考核：画出 observe-plan-act-reflect 循环，设计最大步数、预算、取消、重复动作检测和失败停止条件，并用状态机实现。
- 通过标准：不会把 while(true) 当 Agent；每一步可审计；停止与恢复确定；用户能看到当前目标、动作和剩余预算。

## AGENT-02 MCP Tools、Resources 与 Prompts

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MCP TypeScript SDK](https://ts.sdk.modelcontextprotocol.io/)、[MCP Server 指南](https://ts.sdk.modelcontextprotocol.io/server)
- 严格考核：把一个现有接口文档工具拆成 tools、resources、prompts，解释三者语义边界，并实现最小 MCP Server。
- 通过标准：只读数据优先 resource；副作用才用 tool；参数有 Zod 校验；错误使用协议错误而不是自然语言伪成功。

## AGENT-03 Streamable HTTP、stdio 与会话

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MCP Transports](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)、[MCP TypeScript Server Transport](https://ts.sdk.modelcontextprotocol.io/server)
- 严格考核：分别实现本地 stdio 和远程 Streamable HTTP 连接，处理初始化、能力协商、会话 ID、断线、通知和关闭。
- 通过标准：能说明旧 SSE 与 Streamable HTTP 的迁移边界；远程服务有 Origin 校验和认证；断线不会重复副作用。

## AGENT-04 MCP Client、能力协商与兼容性

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MCP Client SDK](https://ts.sdk.modelcontextprotocol.io/client)、[MCP Protocol](https://modelcontextprotocol.io/specification/2025-11-25)
- 严格考核：实现客户端连接、工具列表、资源模板、分页、进度和取消；面对缺失 capability 时安全降级。
- 通过标准：不假设服务端一定支持全部能力；版本不兼容有明确提示；请求可取消；分页不会漏数据或死循环。

## AGENT-05 Human-in-the-loop 与高风险审批

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MCP Elicitation](https://modelcontextprotocol.io/specification/2025-11-25/client/elicitation)、[Google PAIR 控制原则](https://pair.withgoogle.com/guidebook/)
- 严格考核：为删除文件、发送消息、支付和发布四类工具设计风险分级与审批 UI，支持参数编辑、拒绝、一次授权和范围授权。
- 通过标准：高风险动作不能静默执行；确认页展示真实参数和影响范围；拒绝不会破坏会话；授权可撤销并有审计记录。

## AGENT-06 长任务、进度、恢复与幂等

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MCP Tasks](https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/tasks)、[MDN AbortController](https://developer.mozilla.org/docs/Web/API/AbortController)
- 严格考核：实现一个可持续数分钟的代码分析任务，支持进度、取消、浏览器刷新恢复、失败重试和幂等键。
- 通过标准：刷新不丢任务；取消可达服务端；同一幂等键不重复创建；失败区分可重试与不可重试。

## AGENT-07 多 Agent 协作与上下文隔离

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[AI SDK Multi-step Tools](https://ai-sdk.dev/docs/agents/multi-step-tools)、[MCP Sampling](https://modelcontextprotocol.io/specification/2025-11-25/client/sampling)
- 严格考核：设计研究、实现、评审三个角色的协作协议，说明任务分解、共享产物、冲突解决和上下文权限。
- 通过标准：有明确单一责任与交接格式；敏感上下文不广播；循环委派可检测；最终结论可追溯到各 Agent 证据。

## AGENT-08 工具描述、Schema 与可发现性

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MCP Tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)、[JSON Schema](https://json-schema.org/learn/getting-started-step-by-step)
- 严格考核：为 10 个相似业务接口重写工具名称、描述、输入 Schema 和错误，并用 20 条意图测试工具选择准确率。
- 通过标准：名称稳定无歧义；必填/枚举/互斥约束进入 Schema；描述不泄露实现细节；选择错误有评估数据。

## AGENT-09 Agent 可观测性与回放

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[OpenTelemetry JS](https://opentelemetry.io/docs/languages/js/)、[MCP Logging](https://modelcontextprotocol.io/specification/2025-11-25/server/utilities/logging)
- 严格考核：为一次 Agent 运行记录 trace、step、tool、token、latency、approval 和 error，并实现按 runId 回放的前端时间线。
- 通过标准：敏感参数脱敏；trace 能定位慢步骤和失败链路；不会把完整用户内容无期限写日志；回放不重新执行副作用。

## AGENT-10 Agent 安全、OAuth 与最小权限

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MCP Authorization](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)、[MCP Security Best Practices](https://modelcontextprotocol.io/specification/2025-11-25/basic/security_best_practices)
- 严格考核：完成 token passthrough、confused deputy、SSRF、DNS rebinding、权限扩大和工具投毒威胁建模，并提出验证方案。
- 通过标准：OAuth audience 与 scope 校验正确；不接受任意回调；本地服务防 DNS rebinding；工具权限默认最小化。

## 领域综合考核

用 TypeScript SDK 实现一个具备 resource、tool、progress、cancel、approval 与日志的 MCP 服务，并制作 Vue 客户端运行时间线。进行协议兼容与安全答辩。
