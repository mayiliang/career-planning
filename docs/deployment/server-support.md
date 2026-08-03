# Career Atlas 服务器支持与部署手册

更新时间：2026-08-03

本文是生产部署的标准操作说明。Career Atlas 当前是单用户应用，没有内置账号、组织或公网登录系统，因此生产部署的首要原则是：**不要把网站和 API 无保护地直接暴露到公网。**

## 1. 支持矩阵

| 项目 | 最低支持 | 推荐生产配置 |
| --- | --- | --- |
| 操作系统 | 能运行 Node.js 20 或 Docker Engine 的 64 位系统 | Ubuntu 24.04 LTS、Debian 12 或同等级长期支持 Linux |
| 容器运行时 | Docker Engine 24、Compose v2.20 | 当前稳定版 Docker Engine 与 Compose v2 |
| 原生运行时 | Node.js 20、pnpm 11 | Node.js 22 LTS、pnpm 11.15.1 |
| CPU 架构 | x86_64；arm64 需验证原生 SQLite 依赖构建 | x86_64 |
| 浏览器 | 当前和前一个稳定版 Chromium、Firefox、Safari | 当前稳定版 Chrome/Edge |

Windows 11、Windows Server 2022 和 macOS 可用于开发或内网运行；标准生产方案以 Linux 容器为准。原生部署需要能编译或安装 `better-sqlite3`，容器镜像已固定 Debian 用户空间以减少差异。

## 2. 容量建议

| 场景 | CPU | 内存 | 可用磁盘 | 说明 |
| --- | ---: | ---: | ---: | --- |
| 单用户运行 | 1 vCPU | 1 GB | 5 GB | 不在服务器上构建镜像时可用 |
| 推荐生产 | 2 vCPU | 4 GB | 20 GB SSD | 同机完成构建、备份和 AI 流式请求 |
| 频繁构建/大笔记 | 4 vCPU | 8 GB | 40 GB SSD | Mermaid、KaTeX、TypeScript 构建更稳定 |

SQLite、笔记和备份会持续占用磁盘。至少保留数据目录实际大小的 3 倍空间，并给镜像构建缓存额外预留 5～10 GB。

## 3. 网络与端口

| 端口 | 默认绑定 | 用途 |
| ---: | --- | --- |
| 41731/TCP | `0.0.0.0` | Nginx 网站入口 |
| 41730/TCP | `127.0.0.1` | Fastify API 调试入口；不对公网开放 |

生产环境只允许外部访问反向代理的 443/TCP。41731 应仅对内网、VPN 或上游访问网关开放；41730 保持回环绑定。出站网络只需 DNS、容器镜像仓库和所配置 AI 服务的 HTTPS。

## 4. Docker Compose 部署

1. 安装 Docker Engine 与 Compose v2，克隆仓库。
2. 复制 `.env.example` 为 `.env.local`，只在服务器上填写密钥。
3. 启动并检查健康状态：

```bash
docker compose up -d --build
docker compose ps
curl --fail http://127.0.0.1:41730/api/v1/system/health
```

`compose.yaml` 会构建两个目标：`server` 运行 Fastify 与 SQLite，`web` 使用 Nginx 提供静态页面并转发 `/api/`。用户数据保存在命名卷 `career-atlas-data`，重建容器不会删除该卷。

查看日志与停止服务：

```bash
docker compose logs -f --tail=200
docker compose down
```

不要使用 `docker compose down -v`，除非明确要永久删除全部用户数据。

## 5. 必要配置

| 环境变量 | 默认值 | 生产建议 |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | 容器内由 Compose 设为 `0.0.0.0` |
| `PORT` | `41730` | 保持默认 |
| `DATA_DIR` | `./data` | 容器内固定 `/app/data` 并挂载持久卷 |
| `DEEPSEEK_API_KEY` | 空 | 仅存 `.env.local` 或密钥管理器 |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` | 按兼容服务实际地址填写 |
| `DEEPSEEK_MODEL` | `deepseek-v4-pro` | 使用账号实际可用的模型 |
| `DEEPSEEK_TIMEOUT_MS` | `120000` | 建议 120000～300000 |
| `DEEPSEEK_THINKING_MODE` | `auto` | `auto` 最兼容；明确支持时可设 `enabled` |
| `AUTO_BACKUP` | `true` | 保持开启 |
| `AUTO_BACKUP_INTERVAL_HOURS` | `24` | 至少每日一次 |

模型只有实际返回 `reasoning_content` 或兼容的 `reasoning` 字段时，界面才显示“AI 思考过程”。`enabled` 会向上游显式发送 thinking 参数，不兼容该参数的服务应使用 `auto`。

## 6. TLS 与访问控制

建议在 Career Atlas 前增加 Caddy、Nginx、Traefik 或云端零信任访问网关：

```text
用户 -> HTTPS + 身份认证/VPN -> 上游反向代理 -> 127.0.0.1:41731 -> Web/API
```

代理必须满足：

- 强制 HTTPS，启用可信证书和安全响应头。
- 提供身份认证、设备策略或私有网络隔离。
- `/api/` 的读取和发送超时不少于 360 秒。
- 对 SSE 关闭响应缓冲与缓存，保持 HTTP/1.1 或正确支持流式 HTTP/2。
- 将请求体上限设置为至少 50 MB；按实际附件策略进一步收紧。
- 不记录 Authorization、Cookie、原始笔记、答案或 AI 请求正文。

仓库内 `docker/nginx.conf` 已对 AI SSE 关闭缓冲并设置 360 秒超时。

## 7. 数据、备份与恢复

- 需要持久化整个 `/app/data`，不能只复制单个数据库文件。
- 使用系统内置一致性备份或 `pnpm backup:create`；不要在服务写入期间直接复制 SQLite 主文件。
- 至少保留 7 个日备份和 4 个周备份，并把一份加密副本放到另一台设备或对象存储。
- 每月至少做一次恢复演练。恢复前停止服务，保留当前数据副本，校验备份后再替换。
- 备份中可能包含笔记、答案和求职资料，应按个人敏感数据加密和限制访问。

## 8. 升级与回滚

```bash
docker compose exec server node -e "fetch('http://127.0.0.1:41730/api/v1/system/health').then(r=>r.text()).then(console.log)"
docker compose down
docker compose up -d --build
docker compose ps
```

升级前先创建并校验备份。更新后检查健康接口、打开学习台、读取一条旧笔记并执行一次不写入的页面浏览。若需要回滚，恢复上一版镜像和对应备份；不要让旧程序继续写入已经完成新迁移的数据文件。

## 9. 运行监控与故障判断

至少监控以下信号：容器健康状态、重启次数、磁盘剩余、数据目录大小、备份时间、API 5xx、AI 请求耗时与上游限流。健康接口为：

```text
GET /api/v1/system/health
```

健康响应应同时确认服务、数据库和数据目录可用。AI 未配置会显示为能力不可用，但不应使基础健康检查失败。

常见故障：

- 页面能打开但 AI 流中断：检查上游代理是否缓冲 SSE、超时是否低于 360 秒。
- 容器反复重启：检查数据卷权限、磁盘空间和 SQLite 日志。
- 图形不显示：确认浏览器允许加载站内分块资源，并检查 Mermaid 语法错误提示。
- AI 没有思考区：模型可能没有输出推理字段；先保持 `auto`，再依据供应商能力决定是否使用 `enabled`。

## 10. 上线验收清单

- [ ] 只通过 HTTPS、VPN 或认证网关访问。
- [ ] 41730 未向公网开放。
- [ ] 数据卷持久化且完成一次异机备份。
- [ ] `.env.local` 权限受限，日志不含密钥和笔记正文。
- [ ] 健康检查通过，容器无重启循环。
- [ ] SSE 连续运行超过 3 分钟不被代理中断。
- [ ] 旧笔记、Markdown 表格/公式/图形均可正常读取。
- [ ] 已记录升级、备份和回滚负责人及操作时间。
