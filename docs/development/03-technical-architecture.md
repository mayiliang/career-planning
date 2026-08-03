# 技术架构

更新时间：2026-08-03

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
- AI Provider 只能返回建议和结构化评分；服务层用 Schema、确定性结果和状态机决定最终写入。

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
