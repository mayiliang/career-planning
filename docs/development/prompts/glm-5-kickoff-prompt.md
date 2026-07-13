# GLM-5 启动提示词

在设置[开发系统提示词](glm-5-system-prompt.md)后，将下面内容作为第一条 User Prompt 发送给 GLM-5。

```text
请在当前 career-planning 仓库中开始实现 Career Atlas。

目标不是生成原型截图，而是按照 docs/development/ 下的产品、架构、数据、AI、API、测试和路线文档，交付可长期使用的本地应用。你需要从 Phase 0 开始，按阶段持续实现、测试和记录，直到 Phase 8 的最终验收完成；不要跳过数据边界直接堆页面。

开始前：
1. 完整读取系统提示词要求的所有文档。
2. 检查仓库状态和现有文件，不覆盖用户已有修改。
3. 建立 docs/development/implementation-status.md。
4. 输出一份简短的“需求 ID -> 文件 -> 测试 -> 验收场景”映射。
5. 然后直接实施 Phase 0，不需要等待我确认。

执行要求：
- 每完成一个可运行垂直切片就运行相关测试。
- Phase 0 验收通过后继续 Phase 1，后续依次推进。
- 如果真实外部 DeepSeek API 未配置，使用 fake provider 完成开发与自动测试，并保留明确的真实连接 smoke test；不要因此阻塞其他模块。
- 如果 Docker/Podman 不可用，代码考核安全降级为 MANUAL_REVIEW，绝不能在宿主机直接执行不可信代码。
- 需要安装依赖、运行迁移、启动本地服务或浏览器验收时，直接按正常开发流程进行。
- 每阶段更新 implementation-status.md，记录实际执行的命令、结果和未解决风险。
- 验收失败就继续修复；不要只给我代码建议或伪代码。

最终交付时请提供：
1. 本地启动命令与访问地址。
2. 数据库、附件和备份位置。
3. 已实现需求与对应验收证据。
4. typecheck、单测、集成测试、E2E、build 的真实结果。
5. DeepSeek 配置方法与安全说明。
6. Vue 学习指南入口，以及各阶段新增的 Vue 知识说明。
6. 已知限制，尤其是代码沙箱和模型评分校准。
```

## 分阶段继续提示词

如果一次对话上下文不足，可以在新会话继续使用：

```text
继续 Career Atlas 开发。先读取 docs/development/implementation-status.md、系统提示词和当前阶段文档，核对 git status 与测试结果。不要重做已经通过验收的阶段；从第一个未通过的退出标准继续，完成、验证并更新状态文档。
```
