# 12 AI 原生前端与模型应用工程

这一领域覆盖前端工程师构建 AI 产品时真正需要负责的交互、协议、可靠性与安全能力。重点不是背 Prompt 技巧，而是把不确定的模型能力变成可观测、可恢复、可评估的产品功能。

## AIAPP-01 模型 API、上下文窗口与生成参数

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[DeepSeek 对话补全 API](https://api-docs.deepseek.com/zh-cn/api/create-chat-completion/)、[Vercel AI SDK Core](https://ai-sdk.dev/docs/ai-sdk-core)
- 严格考核：解释 messages、temperature、top_p、max_tokens、thinking 与上下文窗口之间的关系；设计一个可切换 DeepSeek/其他 Provider 的 TypeScript adapter，并处理超时、取消、限流和模型下线。
- 通过标准：能说清参数的因果与边界；adapter 有运行时校验、AbortSignal、错误分类和测试；不能把密钥暴露到浏览器。

## AIAPP-02 流式响应、SSE 与增量渲染

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[AI SDK Streaming](https://ai-sdk.dev/docs/ai-sdk-core/generating-text)、[Chrome 流式 LLM 响应指南](https://developer.chrome.com/docs/ai/render-llm-responses)
- 严格考核：实现一个支持取消、断线提示、首 Token 延迟统计、Markdown 增量渲染和自动滚动保护的流式对话界面；说明 SSE、fetch stream 与 WebSocket 的取舍。
- 通过标准：弱网和中断可恢复；不会重复拼接 Token；用户主动向上滚动时不抢焦点；能给出 TTFT 与总耗时数据。

## AIAPP-03 结构化输出与 Schema 校验

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[DeepSeek JSON Output](https://api-docs.deepseek.com/guides/json_mode/)、[Zod 文档](https://zod.dev/)
- 严格考核：为一份复杂评分输出定义 Zod Schema，构造字段缺失、枚举错误、截断和空响应样本，实现校验、一次修复重试和人工复核降级。
- 通过标准：理解“JSON 合法”不等于“业务 Schema 合法”；所有失败可诊断；修复重试不改变原始业务结论；失败不能自动通过。

## AIAPP-04 Tool Calling 与前端工具结果呈现

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[DeepSeek Tool Calls](https://api-docs.deepseek.com/guides/tool_calls/)、[AI SDK Tool Calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)
- 严格考核：设计搜索知识、创建计划、读取日历三种工具的 JSON Schema，并实现“待确认 → 执行中 → 成功/失败 → 可重试”的前端状态机。
- 通过标准：模型不能绕过用户确认执行副作用；工具参数经服务端校验；重复 tool call 幂等；UI 能展示参数、结果来源和错误。

## AIAPP-05 Generative UI 与消息块协议

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[AI SDK UI](https://ai-sdk.dev/docs/ai-sdk-ui)、[Vue 动态组件](https://vuejs.org/guide/essentials/component-basics.html#dynamic-components)
- 严格考核：定义 text、reasoning-summary、tool-call、tool-result、citation、artifact 六种消息块，使用 Vue 动态组件渲染，并支持流式更新与持久化恢复。
- 通过标准：协议可版本化；未知块安全降级；组件无任意 HTML 注入；刷新后能还原执行状态；不是用一个大字符串硬解析。

## AIAPP-06 RAG、引用与来源可信度

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[OpenAI Retrieval 指南](https://platform.openai.com/docs/guides/retrieval)、[MDN URL API](https://developer.mozilla.org/docs/Web/API/URL)
- 严格考核：设计“切分 → 检索 → 重排 → 生成 → 引用”的前后端协议，前端展示段落级引用、来源时间和无法验证提示，并处理失效链接。
- 通过标准：回答与引用可追溯；不能把检索结果中的指令当系统指令；能区分无结果、低相关与来源冲突；有至少 10 条检索评估样本。

## AIAPP-07 Prompt Injection 与不可信内容边界

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[OWASP LLM Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)、[MCP Security Best Practices](https://modelcontextprotocol.io/specification/2025-11-25/basic/security_best_practices)
- 严格考核：对网页内容、上传文档、工具结果和用户答案做威胁建模，写出 12 个攻击用例，并设计权限、隔离、确认、输出编码和审计方案。
- 通过标准：能区分数据与指令；高风险工具最小权限；敏感信息不进入提示或日志；攻击样例进入自动化回归。

## AIAPP-08 模型评估、回归集与裁判偏差

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[OpenAI Evaluation Best Practices](https://platform.openai.com/docs/guides/evals)、[AI SDK Testing](https://ai-sdk.dev/docs/ai-sdk-core/testing)
- 严格考核：为一个评分或问答功能建立不少于 30 条 gold set，定义正确性、引用、格式、延迟和成本指标，并比较两种模型或提示版本。
- 通过标准：评估可重复运行；包含边界与对抗样本；不会只用另一个模型的单次主观判断；能解释统计波动和上线门槛。

## AIAPP-09 成本、配额、缓存与可靠性

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[DeepSeek Rate Limit](https://api-docs.deepseek.com/quick_start/rate_limit/)、[HTTP Retry-After](https://developer.mozilla.org/docs/Web/HTTP/Reference/Headers/Retry-After)
- 严格考核：设计 Token 用量记录、预算上限、请求去重、指数退避、Provider fallback 和用户级限流；给出峰值流量下的成本估算。
- 通过标准：429/5xx/超时分类正确；重试有抖动与上限；不可重试错误不重试；缓存不串用户；账单与产品指标可对账。

## AIAPP-10 AI 产品 UX、信任与人机协作

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Google People + AI Guidebook](https://pair.withgoogle.com/guidebook/)、[Chrome Built-in AI Do and Don't](https://developer.chrome.com/docs/ai/built-in-ai-dos-donts)
- 严格考核：为“生成、等待、失败、低置信度、需要确认、人工接管”设计完整交互原型，并通过 5 个任务做可用性走查。
- 通过标准：明确标识 AI 与事实来源；不伪造确定性；用户可取消、编辑、重试和接管；错误文案给出具体恢复路径。

## 领域综合考核

实现一个 Vue AI 助手垂直切片：流式输出、结构化工具调用、引用、取消、错误恢复、用量记录和 30 条评估集。现场解释安全边界与成本取舍。
