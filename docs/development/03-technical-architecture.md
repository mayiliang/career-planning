# 技术架构

更新时间：2026-10-13

## 1. 工作区

```text
apps/web              Vue 3 浏览器应用
apps/server           Fastify API、AI 适配、SQLite
packages/shared       跨端 Schema 与类型
packages/content-parser  Markdown/CSV 内容解析与门禁
docs/                 产品、知识、部署和开发文档
templates/            内容导入兼容模板
data/                 用户数据库、备份和运行数据（不提交）
```

浏览器只调用 `/api/v1`，不读取 `.env.local`。Fastify 负责数据写入、AI 密钥、状态机和最终校验；SQLite 是单用户事务真源。

## 2. Web 架构

- Vue 3 Composition API + TypeScript strict。
- Vue Router 负责功能页面；页面按路由分块。
- Vue Query 管理服务端状态；局部编辑和流式缓冲使用组件状态。
- Element Plus 提供基础组件，业务对话框和学习组件保持统一视觉。
- `MarkdownRenderer.vue` 是所有 Markdown/AI 内容的唯一渲染入口。
- 站内 JavaScript/TypeScript 练习由受限浏览器运行区执行；服务器绝不直接 `eval` 用户答案。

### API 模块与异步结果

`src/api/client.ts` 是兼容入口，按知识、学习、日历、考核、求职、助手和系统组合 `api/modules/`。业务模块维护请求方法与响应校验；已跨端统一的考核 Schema 和推导类型由 `packages/shared` 提供，其余领域继续维护各自合同。禁止反向导入聚合入口。`api/http.ts` 负责 JSON 请求与整个响应正文的超时，`api/stream.ts` 负责 SSE 解析、取消和读取器清理，`api/errors.ts` 提供可识别的错误类型。

页面通过 `createLatestRequest()` 管理相互替代的读取操作：启动新请求会取消旧请求；成功、失败和 finally 三条路径都检查 `isCurrent()`。卸载时取消，写入操作则保留持久化语义，并按当前资料或岗位身份决定是否更新界面。

阅读器的主讲义列表来自 `learning-material-catalog.ts`，发音批次来自 `scripts/pronunciation-batches.json`。`content/material-metadata.ts` 派生索引；页面不再维护同一映射的第三份副本。

## 3. Markdown 渲染流水线

```text
Markdown 源文
  -> think 标签规范化
  -> markdown-it + 插件
  -> KaTeX / Highlight HTML、Mermaid 占位
  -> DOMPurify
  -> Vue v-html
  -> 按需 import Mermaid 并以 strict 模式生成 SVG
```

流式模式使用 72ms 合并窗口、`requestAnimationFrame`、120 项 Markdown LRU、40 项图形缓存和修订号防竞态。Mermaid 不进入初始同步依赖路径。详细协议见[现代 Markdown 与 AI 流式协议](10-modern-markdown-and-ai-streaming.md)。

## 4. Server 架构

- 路由只负责参数校验、SSE 封装和响应映射。
- 服务层负责学习、路线、笔记、练习、挑战、评分、打卡和备份规则。
- Drizzle 管理主要表结构；部分高频/兼容逻辑使用参数化 SQLite 查询。
- 内容导入以 Markdown 为知识真源，但保留用户字段和笔记版本。
- AI Provider 只能返回建议和结构化评分；服务层用 Schema、状态机和（若存在）服务端可信执行结果决定最终写入。本地 Worker 自检不属于服务端可信执行结果。

`app.ts` 的 `buildApp()` 只组装应用，允许测试直接注入请求；`index.ts` 管理数据初始化、端口、信号和备份任务。关闭时先停止并等待备份，再关闭 HTTP 与数据库。

`http/contract.ts` 统一 Zod 校验、响应封装和异常映射。处理器内校验失败返回 400 与字段详情；未处理的内部异常记录日志并返回统一错误。路由测试复用同一个配置函数。

`http/sse.ts` 管理发送给浏览器的 SSE 连接；实际断连才中止任务，正常读取完请求正文不会误取消。`ai/sse.ts` 管理模型供应商的 data 流，统一处理跨片 UTF-8、CRLF、EOF、`[DONE]` 和读取器清理，业务模块继续负责最终 JSON/Schema 校验。

`assessment/questions.ts` 从逐点首考与复测变式合同构建题目并读取明确链接的本地讲义，不写数据库。会话创建先完成题目校验，再以同步短事务重新确认活动会话并一起写入会话与五道题；失败全部回滚，恢复已有挑战时保留原题与配置。

`http/dto/assessment.ts` 显式投影公开字段；JSON 与 SSE 最终结果共用映射，并与 `packages/shared/domain/assessment` 的公开 Schema 保持类型一致。空字段使用实际接口的 `null` 语义，原始模型响应、内部重算字段和提示版本保留在服务端记录中。

`grading.service.ts` 编排模型请求和服务端判定；`grading/feedback.ts` 负责纯计算与逐题映射，`assessment/self-check.ts` 负责不可信本地记录的收敛与诊断，`grading/persistence.ts` 负责评分任务领取、原子提交和失败恢复。外部模型调用不占用数据库事务；评分、会话、知识点和掌握审计事件在同一短事务提交。重评成功前保留旧结果，重复请求复用结果；单实例启动时恢复上一进程中断的任务。

`services/assistant.service.ts` 保留公共接口与流程编排；`services/assistant/` 分别维护类型、常量、文本工具、上下文、检索、模型通信和存储。存储模块通过领域类型接收候选评估，不依赖模型实现。

`learning.service.ts` 组装学习台与打卡，保留状态、路线和笔记的稳定出口。`learning/points.ts` 维护知识点投影，`learning/routes.ts` 在一份状态快照上规划分支并批量读取目标，`learning/state.ts` 维护状态转换和路线选择事务。暂缓记录与目标状态一起提交；已学完记录不被不适用的恢复或暂缓操作撤销，重新聚焦返回真实状态。

`notes.service.ts` 编排整理与降级，`notes/model.ts` 处理模型流与最终结构校验，`notes/persistence.ts` 维护原文、候选稿、已采用的阅读版本与历史。生成前记录笔记快照，提交时在短事务内核对版本；原文改变或另一任务已提交时返回冲突，避免晚到稿覆盖当前内容。笔记列表一次批量读取每份笔记最新 20 条历史。

新的候选稿只更新 `organizedMd`，`activeMd` 从最近一次 `AI_ACCEPTED` 版本读取；用户再次采用后才切换阅读内容。原文修改会使旧候选稿失效，并保留已采用内容及历史。采用请求可携带用户已核对的候选版本 ID，新前端会发送该 ID；重复保存同一原文、重复采用同一候选稿都复用原结果。

`usePointNoteEditor.ts` 集中管理草稿存储、自动保存、整理、采用和视图偏好。组件负责知识点加载与页面交互；编辑器按页面身份隔离反馈，并在新原文保存后拒绝旧整理或采用响应更新当前笔记。销毁作用域时取消读取型整理，已提交写入继续完成。

`useAssessmentSession.ts` 负责挑战读取、答案写入、提示、自检和提交评分；`assessment/model.ts` 提供题目和本地执行记录的展示投影。每题写入排队，相同进行中快照复用请求。提交固定答案快照，等待所有写入成功后才锁卷；失败保留编辑内容与主错误。已提交但未启动判题的会话可继续初评。读取和流反馈按任务身份隔离，组件销毁后停止后续锁卷与评分。

服务端 `assessment/answers.ts` 在短事务内检查会话、验证题目和保存答案；锁卷也在同一事务中核对题目、有效答案和会话状态。晚到写入不能绕过已提交状态。该保护覆盖服务入口，历史重复答案未被自动删除，现有查询索引也没有被描述为数据库唯一约束。

### 模块依赖门禁

`pnpm architecture:check` 静态扫描 TypeScript/Vue 导入、再导出与字面量动态导入，阻止运行时循环依赖和分层越界。共享包不依赖应用；浏览器不依赖服务端或 Node 专属模块；服务不依赖 HTTP，API 不依赖页面。`pnpm lint` 默认先运行该检查。类型专用导入检查边界，但不计入运行时循环。

变量生成的动态路径、运行时反射与外部包内部依赖不属于此门禁的覆盖范围。审查与后续维护说明见[代码质量审查记录](12-code-quality-review.md)。

## 5. AI 流

```text
浏览器发起任务 + AbortSignal
  -> Fastify 建立 SSE
  -> Provider 流式返回 reasoning/content
  -> server 分发 thinking/delta/progress
  -> browser 分别累积并节流渲染
  -> server 完整解析与校验
  -> 持久化最终候选稿/评分
  -> done 返回最终 DTO
```

网络中止、开始超时、空闲超时和总超时必须区分。笔记整理失败可生成明确标记的本地排版稿，但不能伪称完成事实核验。

## 6. 安全

- API 密钥只在服务端环境变量。
- 所有 SQL 参数化；输入长度由 Zod 限制。
- Markdown 关闭原始 HTML并清洗输出；外链和 Mermaid 使用安全策略。
- AI 输入中的用户笔记、答案和执行输出一律视为不可信文本，系统提示明确防止其覆盖指令。
- 生产服务器无内置公网身份认证，必须放到私网或认证网关之后。
- 数据目录、备份、日志和 `.env.local` 按敏感个人数据处理。

## 7. 构建与部署

- 开发：Node.js 20+、pnpm 11+，`pnpm dev`。
- 生产：多阶段 Dockerfile；Node 22 Debian 运行 API，Nginx Alpine 提供静态 Web。
- Compose 使用命名卷持久化 `/app/data`，Nginx 代理 `/api/` 并关闭 SSE 缓冲。
- 健康检查：`GET /api/v1/system/health`。
- 标准配置见[服务器支持与部署手册](../deployment/server-support.md)。
