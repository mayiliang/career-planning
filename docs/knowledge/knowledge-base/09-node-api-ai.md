# 09 Node.js、OpenAPI、MCP 与 AI 工具化

所有“通过”均需满足[统一考核规则](00-assessment-rules.md)。工具必须对输入、输出、错误、权限和可重复性负责。

## NODE-01 Node 运行时、事件循环与非阻塞 I/O

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Node.js Event Loop](https://nodejs.org/learn/asynchronous-work/event-loop-timers-and-nexttick)、[Don't Block the Event Loop](https://nodejs.org/learn/asynchronous-work/dont-block-the-event-loop)。
- 严格考核：预测 `nextTick`、Promise、timer、immediate 与 I/O 顺序；定位一个阻塞事件循环的 CPU/同步 I/O 问题；实施分片或 worker 方案。
- 通过标准：顺序题至少 9/10；能用事件循环延迟数据证明阻塞；优化不引入数据竞态。

## NODE-02 文件、Stream、Buffer 与错误处理

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Node.js Streams](https://nodejs.org/api/stream.html)、[File System](https://nodejs.org/api/fs.html)、[Errors](https://nodejs.org/api/errors.html)。
- 严格考核：实现大 YAML/JSON 文件流式处理；支持背压、取消、临时文件和原子替换；注入权限、磁盘、解析和中断错误。
- 通过标准：大文件内存受控；无半写文件；错误保留 cause 与上下文；资源在所有分支关闭。

## NODE-03 CLI 参数、退出码与用户体验

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Node Command Line](https://nodejs.org/learn/command-line/run-nodejs-scripts-from-the-command-line)、[Commander.js](https://github.com/tj/commander.js#readme)。
- 严格考核：实现一个带子命令、帮助、配置、dry-run、日志级别和结构化输出的 CLI；测试无效参数、SIGINT 和 CI 环境。
- 通过标准：退出码正确；stdout/stderr 分工明确；命令可脚本化；破坏性操作默认安全并可预览。

## API-01 OpenAPI/YAML 解析与规范化

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[OpenAPI Specification](https://spec.openapis.org/oas/latest.html)、[YAML Specification](https://yaml.org/spec/1.2.2/)、`get_apidoc` 真实实现。
- 严格考核：解析路径、operation、参数、requestBody、response、schema、example 和 `$ref`；处理循环引用、缺失 operationId 和多 content type。
- 通过标准：至少通过 20 个固定样例；错误定位到文档路径；不会把示例值无条件当成规范类型。

## API-02 类型推断、代码生成与可维护输出

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[TypeScript Compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API)、[OpenAPI Specification](https://spec.openapis.org/oas/latest.html)、现有 service 约定。
- 严格考核：实现 API 到 types/service 的最小生成器；保证确定性输出、合法命名、冲突处理、格式化和增量更新；对生成物运行 typecheck。
- 通过标准：相同输入字节级稳定；生成物可读且可编译；不覆盖手写扩展；schema 变化能产生可审查 diff。

## MCP-01 Server、Tool、Schema 与传输架构

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MCP Architecture](https://modelcontextprotocol.io/docs/learn/architecture)、[MCP Server Concepts](https://modelcontextprotocol.io/docs/learn/server-concepts)、MCP SDK 文档。
- 严格考核：设计并实现一个只读查询工具；定义输入 schema、结构化输出、错误和能力边界；使用 MCP 客户端完成协议交互测试。
- 通过标准：工具描述使模型可正确选择；参数严格校验；无越权文件/网络访问；协议错误与业务错误可区分。

## MCP-02 Tool 设计、安全与可观测性

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MCP Security Best Practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices)、[OWASP Logging](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)。
- 严格考核：对文件、接口和缓存工具做威胁模型；实现最小权限、路径约束、敏感信息脱敏、超时、取消和审计日志；尝试提示注入与路径穿越。
- 通过标准：攻击用例被阻止且有审计证据；日志不泄露秘密；失败不会扩大权限或破坏外部状态。

## AI-01 AI 辅助研发、验证与评估

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[项目内 AI 工作流专题](../../topics/README.md)、真实需求、接口和代码评审记录。
- 严格考核：设计“需求拆解→接口理解→实现→测试→审查”工作流；准备包含正常、边界和诱导错误的评估集；比较人工基线与 AI 流程。
- 通过标准：输出必须经编译、测试或人工证据验证；评估至少 20 个样例；能量化节省时间与新增错误；高风险步骤保留人工审批。

## 领域综合考核

- [ ] 已通过领域综合考核
- 任务：扩展 `get_apidoc`，完成一个 OpenAPI/YAML 查询与 TS 类型输出能力，同时提供 CLI 和 MCP Tool、测试、缓存、错误、安全说明及评估报告。
- 通过标准：8 小时内完成；至少 25 个测试；CLI/MCP 输出一致；恶意路径和无效 schema 被拒绝；生成结果通过 typecheck 且可重复。
