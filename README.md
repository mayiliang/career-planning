# Career Atlas

> 本地优先、面向 AI 时代高级前端能力体系的个人学习与求职工作台。

Career Atlas 把知识地图、中文讲义、笔记、站内练习、掌握挑战、学习路线和求职记录放进同一个可持续使用的闭环。当前知识体系包含 **20 个能力组、223 个知识点**；默认的“求职优先核心路线”从中选取 **149 个主干点**，编排为 **35 个连续批次**，其余 74 个专项点仍保留在完整知识体系中按目标选择。

> 当前状态：2026-08-29。B01～B03 已具备独立中文主讲义与前置短文、重点英文术语发音和阅读进度记录；B04 起交错推进同等优先的 React 与 Vue 路线。

## 核心能力

| 模块 | 当前能力 |
| --- | --- |
| 知识体系 | 通过列表、脑图和关系图谱浏览 223 个知识点，区分前置、关联、能力层、成熟度、适用范围与主修路线 |
| 求职优先路线 | 35 个批次共用一条运行时顺序；B01～B03 建立 JavaScript、复杂度、异步、模块和 TypeScript 底座，随后进入双框架、工程化、测试、求职表达、生产与 AI 能力 |
| 中文学习资料 | 站内阅读独立讲义和原子化前置短文，支持目录定位、术语发音和阅读进度；阅读超过 80% 会把该资料标记为“已看完”，但不会代替用户确认知识点“已学完” |
| 学习与掌握 | 用户自主选择当前知识点并记录打卡；“已学完”与 M1～M4 掌握等级分离，练习和挑战提供明确输入、输出、验证标准与渐进帮助 |
| Atlas AI | 支持页面总结、划词解释和自由提问；优先检索站内知识与中文讲义，必要时再联网核验，并展示实际使用的站内/站外引用和独立会话历史 |
| 笔记与求职 | Markdown 原始笔记、本地草稿、自动保存、版本历史和 AI 候选稿彼此分离；岗位可手动管理或通过中英文 CSV 预览后导入 |
| 数据保护 | SQLite 本地持久化、自动备份、数据库恢复预览、个人数据 JSON 导入/导出；AI 密钥不进入浏览器构建或导出文件 |

Markdown 阅读与笔记统一支持表格、任务清单、脚注、标记、上下标、语法高亮、KaTeX 数学公式、Mermaid 图形、提示块和可折叠的模型思考区。原始 HTML 默认关闭，渲染结果经过清洗；Mermaid 和较大的执行能力按需加载。

## 技术栈

| 层级 | 主要技术 |
| --- | --- |
| Web | Vue 3、TypeScript、Vite、Vue Router、Pinia、TanStack Vue Query、Element Plus |
| API | Node.js、Fastify、Zod、Drizzle ORM |
| 数据 | SQLite、版本化迁移、本地/容器数据目录 |
| 内容 | Markdown 真源、Unified/Remark 内容解析、markdown-it 安全渲染 |
| AI | 服务端兼容接口、SSE 流式正文/思考/进度、站内优先检索 |
| 质量 | Vitest、Playwright、ESLint、TypeScript、内容与资源门禁 |
| 部署 | Windows 本地安装器，或 Docker Compose + Nginx |

## 快速开始

### Windows 本地单机版

如果只在自己的 Windows 电脑上使用，无需 Docker。双击：

```text
windows\Install-Career-Atlas.cmd
```

首次安装会构建独立运行副本并创建两个入口：

- “Career Atlas”使用现有 Chrome 配置打开普通最大化窗口，可继续使用浏览器扩展。
- “Career Atlas Immersive”使用 Microsoft Edge 应用模式打开沉浸窗口。

两个入口共享同一套本地服务、SQLite 数据和 AI 配置。升级应用不会覆盖个人数据；完整安装、升级、卸载和恢复说明见 [Windows 本地单机版手册](docs/deployment/windows-local.md)。

### 本地开发

需要 Node.js 20+ 和 pnpm 11+；推荐 Node.js 22 LTS，并使用仓库声明的 pnpm 11.15.1。

```bash
pnpm install --frozen-lockfile
pnpm dev
```

打开 `http://127.0.0.1:41731`，API 默认为 `http://127.0.0.1:41730`。

AI 功能是可选能力。如需启用，先把 `.env.example` 复制为 `.env.local`，再填写实际可用的服务端配置：

```powershell
Copy-Item .env.example .env.local
```

Linux/macOS 使用 `cp .env.example .env.local`。不要提交 `.env.local`，也不要把 API 密钥写入前端代码。未配置 AI 时，知识体系、资料、笔记、路线、打卡、本地练习和备份仍可使用；依赖模型的整理、提示、助手回答和自动判题会不可用或安全降级。

## 生产部署

推荐使用 Docker Compose：

```bash
docker compose up -d --build
docker compose ps
curl --fail http://127.0.0.1:41730/api/v1/system/health
```

默认网站端口为 `41731`，API 端口 `41730` 只映射到服务器回环地址，用户数据保存在命名卷 `career-atlas-data`。系统没有内置多用户认证，不能无保护地暴露到公网；远程访问应置于 VPN、零信任访问网关或带身份认证的 HTTPS 反向代理之后。详见[服务器支持与部署手册](docs/deployment/server-support.md)。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `pnpm dev` | 同时启动 Web 与 API 开发服务 |
| `pnpm content:check` | 检查知识内容、B01～B03 讲义结构和发音资源 |
| `pnpm content:links` | 检查本地链接并联网核对远程资料；只阻断本地失效和明确的远程 404/410 |
| `pnpm content:links:strict` | 严格检查资料链接，网络环境下无法确认的远程地址也会失败 |
| `pnpm test` | 顺序运行各工作区单元测试 |
| `pnpm lint` | 运行全工作区静态检查 |
| `pnpm build` | 构建共享包、Web 和 Server，并执行前端资源预算门禁 |
| `pnpm test:e2e` | 运行 Playwright 端到端测试 |
| `pnpm backup:create` | 创建一致性的 SQLite 数据备份 |

## 项目结构

```text
apps/web                 Vue 3 浏览器应用、站内阅读器与 Playwright 测试
apps/server              Fastify API、学习/AI 服务、SQLite Schema 与迁移
packages/shared          跨端 Schema 与 TypeScript 类型
packages/content-parser  Markdown/CSV 解析、知识内容与链接门禁
docs/knowledge           知识体系、中文讲义、资料规则与审计记录
docs/development         产品、架构、数据、AI、测试和发布文档
docs/deployment          Windows 与服务器部署手册
windows                  Windows 安装、升级、启动和卸载脚本
docker                   Nginx 等容器运行配置
data                     本地数据库、备份和运行数据（默认不提交）
```

浏览器只访问 `/api/v1`，不会读取 `.env.local`。Fastify 负责数据写入、AI 密钥、状态机和最终校验；Markdown 是知识内容真源，SQLite 是用户状态与学习记录的事务真源。

## 数据与安全边界

- 用户数据默认位于 `data/`、Windows 的 `%LOCALAPPDATA%\CareerAtlas\data`，或 Docker 命名卷 `career-atlas-data`。
- 升级、重装或重建容器前应先创建并验证备份；不要直接复制正在写入的 SQLite 主文件，也不要使用 `docker compose down -v`，除非明确要永久删除数据。
- AI 请求可能包含当前页面、所选文字、笔记或作答等完成任务所需内容；密钥只保存在服务端。具体数据范围见[隐私与数据说明](PRIVACY.md)。
- 浏览器内代码练习用于即时反馈，不是安全沙箱或服务端可信执行证明。
- 该项目当前面向单用户本地或私有部署；公开服务前必须补充身份认证、访问控制和运营安全措施。

## 文档导航

| 文档 | 用途 |
| --- | --- |
| [求职优先自主学习路线](docs/plans/self-paced-learning-route.md) | 35 个批次、主干顺序、专项边界与完成标准 |
| [知识体系总览](docs/knowledge/frontend-knowledge-system.md) | 20 个能力组、二级主题与 223 个知识点 |
| [学习资料使用规则](docs/knowledge/learning-resource-guide.md) | 中文资料、笔记、练习、阅读进度与掌握证据 |
| [产品与开发文档](docs/development/README.md) | 产品决策、架构、数据、API、AI 与验收入口 |
| [现代 Markdown 与 AI 流式协议](docs/development/10-modern-markdown-and-ai-streaming.md) | 渲染语法、thinking、性能与安全设计 |
| [Windows 本地单机版手册](docs/deployment/windows-local.md) | 安装、桌面启动、升级、卸载和数据保护 |
| [服务器支持与部署手册](docs/deployment/server-support.md) | 容器、TLS、访问控制、备份、升级与监控 |
| [隐私与数据说明](PRIVACY.md) | 本地数据、AI 传输、导出、备份与部署边界 |
| [商用品质发布检查表](docs/development/commercial-release-checklist.md) | 公开发布前的阻断项与验收要求 |
| [变更记录](CHANGELOG.md) | 已落地、用户可感知的功能变化 |

## 许可证

本项目采用 [MIT License](LICENSE)。
