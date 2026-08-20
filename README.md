# Career Atlas

Career Atlas 是面向“AI 时代高级前端能力体系”的单用户、自主节奏学习工作台。系统内置 20 个稳定能力组和 223 个知识点，以中文学习资料、结构化笔记、站内练习、可选掌握挑战、知识路线与学习打卡构成闭环。

## 当前学习方式

- 系统不规定每天必须学习什么。用户自行选择知识点，并可将一个知识点设为“当前学习”。
- 阅读资料并完成笔记后，由用户点击“已学完”；这只表示完成学习，不等于已经掌握。
- 掌握挑战完全可选，按 M1 初步理解、M2 引导应用、M3 已掌握、M4 稳定掌握逐级提供理论题、站内机试和渐进帮助。
- 核心路线把 149 个主要知识点压缩为 35 个非空批次；学习台、详情下一步和路线页共用顺序，React/Vue 交错且同等优先。批次不绑定自然周，也不生成泛化任务。
- 只有当前连续路线告一段落时才让用户选择专项方向；暂缓和主动放弃是不同状态。
- 每日打卡记录当天实际学习的知识点、时间和总结，不依赖固定日程。
- 原始笔记始终保留。AI 只生成独立候选稿，支持流式正文和模型提供的思考过程，是否采用由用户决定。
- 首次进入会直接给出一个真实知识点下的具体任务、固定输入、交付结果和完成判定；不会用“今日学习”占位消耗时间。
- 掌握挑战会在答题前检查 AI 是否可用并说明数据去向；岗位支持手动创建和 CSV 预览导入；笔记会本地留稿并自动保存。
- 设置页可导出不含密钥和知识正文的个人数据；恢复快照前必须先查看完整性检查和数据差异。

Markdown 阅读与笔记支持表格、任务清单、脚注、标记、上下标、语法高亮、KaTeX 数学公式、Mermaid 图形、提示块和可折叠思考区。图形按需加载，流式预览使用节流、动画帧调度和有界缓存减少重复渲染。

## 本地开发

要求 Node.js 20 或更高版本、pnpm 11 或更高版本；推荐 Node.js 22 LTS 和仓库声明的 pnpm 11.15.1。

```bash
pnpm install --frozen-lockfile
copy .env.example .env.local
pnpm dev
```

打开 `http://127.0.0.1:41731`，API 默认为 `http://127.0.0.1:41730`。未配置 AI 密钥时，资料阅读、笔记、练习、路线和打卡仍可使用；AI 整理、动态提示与自动判题会安全降级或不可用。

Linux/macOS 可用 `cp .env.example .env.local`。不要提交 `.env.local`，也不要把 API 密钥写入前端代码。

## 生产部署

推荐使用 Docker Compose：

```bash
docker compose up -d --build
docker compose ps
```

默认网站端口是 `41731`，API 只映射到服务器回环地址。完整的操作系统、硬件配置、反向代理、TLS、数据卷、备份、升级和安全要求见[服务器支持与部署手册](docs/deployment/server-support.md)。本系统没有多用户认证，不应直接暴露到公网；远程访问应放在 VPN、零信任访问网关或带身份认证的反向代理之后。

## 质量检查

```bash
pnpm content:check
pnpm test
pnpm lint
pnpm build
pnpm test:e2e
```

内容链接检查会访问网络，可单独运行 `pnpm content:links`。

## 文档入口

| 文档 | 用途 |
| --- | --- |
| [自主学习路线](docs/plans/self-paced-learning-route.md) | 能力主线、分支选择和完成标准 |
| [知识体系总览](docs/knowledge/frontend-knowledge-system.md) | 20 个能力组、二级主题与知识点边界 |
| [学习资料使用规则](docs/knowledge/learning-resource-guide.md) | 中文资料、笔记、练习与掌握证据规则 |
| [产品与开发文档](docs/development/README.md) | 产品决策、架构、API、AI 与验收 |
| [现代 Markdown 与 AI 流式协议](docs/development/10-modern-markdown-and-ai-streaming.md) | 语法、thinking、性能和安全设计 |
| [服务器支持与部署手册](docs/deployment/server-support.md) | 生产环境标准 |
| [隐私与数据说明](PRIVACY.md) | 本地数据、AI 传输、导出、备份和部署边界 |
| [商用品质发布检查表](docs/development/commercial-release-checklist.md) | 候选版本阻断项、无障碍、安全和运营验收 |
| [变更记录](CHANGELOG.md) | 已落地、用户可感知的功能变化 |

用户数据默认位于 `data/` 或 Docker 命名卷 `career-atlas-data`。升级、重装或重建容器前先备份数据；删除代码文档不会删除 SQLite 中的学习记录和笔记。
