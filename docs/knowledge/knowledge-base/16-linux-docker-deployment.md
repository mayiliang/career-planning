# 16 Linux、Docker 与前端部署交付

这一领域把前端能力从“本地开发完成”推进到“可打包、可部署、可排障、可回滚”。你需要掌握 Linux 基础、Docker 镜像、Compose 编排、Nginx/CDN 静态资源、CI/CD 制品和生产排障，才能独立完成 Web/H5 项目的交付闭环。

### Linux 运行与排障基础

## LINUX-01 Linux 文件系统、权限与常用命令

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文学习讲义：LINUX-01](../chinese-guides/linux-01-filesystem-permissions-safe-commands.md#linux-01)。覆盖范围：独立讲义从目录树、inode、文件类型、权限、owner/group、umask、链接推进到特殊文件名、原子写入、归档、磁盘、ACL、安全删除与故障实验；所有破坏性示例限定临时环境。
- 严格考核：挑战类型：TOOL_OPERATION；首考题 1（资料定位）：只允许使用《中文学习讲义：LINUX-01》，定位 FHS、权限位、umask、链接与安全归档的依据；首考题 2（机制解释）：闭卷用 `/srv/app/releases`、`/srv/app/current` 和 `deploy` 用户说明路径解析、所有者、组、权限位与软链接切换的因果，并反驳“chmod 成功即最小权限”；首考题 3（最小产出）：在给定 Linux fixture 中，`/srv/demo/releases/42` 为只读构建物、`current` 指向 41、`uploads/` 仅 `app` 组可写且磁盘仅余 8%，提交 `namei -l`、`find`、`stat`、`du`、`tar -tzf`、`tail` 的命令记录，完成权限 diff、原子切换链接和不含绝对路径的归档清单；预期 `current` 切至 42、归档不含 `uploads/` 外文件；首考题 4（受限排错）：固定失败为 `current` 指向不存在的 release 且归档命令将 `uploads/` 外文件纳入；候选根因仅限 `umask 000`、sticky 目录误删、`*` 扩张到错误目录三项，仅可使用上述输出与只读目录快照；观察合同分别为权限位、目录删除记录、tar 文件清单，以 `namei`/`stat`/归档清单逐项证伪，提交最小命令或配置 diff、修复后链接/归档回归及回滚链接证据；首考题 5（学习复述）：用 3 分钟说明为何“能 chmod 成功”不能证明部署目录最小权限。复测变式：仅将 `current` 链接由绝对改为相对；不变量为 release 42、`app` 组写入和归档范围；预期父目录有执行位且链接解析至 42；新证据为 `namei -l`、`readlink` 与归档清单。命题边界：只考文件系统、权限和命令，不以容器或网络知识代替。
- 通过标准：提交物必须逐项含目录权限快照、命令及退出码、归档清单、切换前后链接目标和回滚结果；否决项：危险通配符、以 root 绕过权限、归档含敏感运行文件或无回滚证据。评估边界：只口述命令或只展示最终目录不能通过。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 105 分钟；复测 75 分钟

## LINUX-02 进程、端口、日志与网络诊断

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文学习讲义：LINUX-02](../chinese-guides/linux-02-process-port-log-network-diagnostics.md#linux-02)。覆盖范围：独立讲义把用户现象、DNS、路由、TCP/TLS、HTTP、socket、进程/systemd、journal、资源与容器观察位置串成因果诊断链，覆盖现场保留、最小修复、同路径复验和故障演练。
- 严格考核：挑战类型：DEBUGGING；首考题 1（资料定位）：只允许使用《中文学习讲义：LINUX-02》，定位进程、监听、DNS、HTTP/TLS 与日志取证顺序；首考题 2（机制解释）：闭卷解释浏览器到 `demo.example.test:443` 的 DNS、TCP、TLS、反向代理与应用进程链，并说明 502 不能直接推出 DNS 故障；首考题 3（最小产出）：在 fixture 中 Nginx 监听 443、API 应监听 127.0.0.1:41730 而实际退出，提交 `ps -ef`、`ss -ltnp`、`curl -vk --resolve`、`journalctl -u demo-api`、`dig` 的原始输出、按层假设表、一次最小 systemd/配置 diff 与同命令验证记录；预期 API 仅监听回环且 curl 返回非 502；首考题 4（受限排错）：固定失败为 `curl -vk --resolve` 返回 502 且 `journalctl` 显示 API 已退出；候选根因仅限旧进程占端口、DNS 指向旧地址、证书域名错配、OOM 重启环四项，禁止重启或改 DNS；观察合同分别为 pid/端口、`dig` 地址、TLS SNI、OOM 日志，以五类原始输出逐项证伪，提交修复后同命令回归与回滚服务单元；首考题 5（学习复述）：用 3 分钟区分“连接拒绝、超时、TLS 失败和 502”各自首先说明什么。复测变式：仅将 DNS 记录由 A 改为 AAAA，服务仍只监听 IPv4；不变量为域名、443 和诊断顺序；预期 AAAA 连接失败而 A 不被臆断；新证据为 `dig AAAA`、`ss` 与 curl 输出。命题边界：不考应用业务逻辑或 CDN 缓存。
- 通过标准：证据必须映射进程、监听、名称解析、握手/响应和日志五项中的相关项；否决项：只重启、只清缓存、用单一 HTTP 状态臆断根因或不保留修复前输出。评估边界：口述排障流程不能代替 fixture 输出。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 105 分钟；复测 75 分钟

## LINUX-03 Shell 脚本、环境变量与自动化任务

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文学习讲义：LINUX-03](../chinese-guides/linux-03-shell-environment-automation.md#linux-03)。覆盖范围：独立讲义围绕执行合同解释展开/引用、严格模式与 pipefail、输入验证、临时文件/trap、原子写、幂等、锁、环境/秘密、退出码、网络预算、调度、信号、测试与语言选型。
- 严格考核：挑战类型：TOOL_OPERATION；首考题 1（资料定位）：只允许使用《中文学习讲义：LINUX-03》，定位引用、退出传播、trap、幂等与密钥边界；首考题 2（机制解释）：闭卷解释参数解析、环境注入、失败退出和 trap 清理如何决定部署脚本可恢复性，并反驳“严格模式自动覆盖输入校验”；首考题 3（最小产出）：为 `/srv/demo` 编写 `deploy.sh`，固定输入为 `--release 42 --dry-run|--apply` 和从受限环境读 `DEPLOY_TOKEN`，要求 `set -euo pipefail`、加引号、锁文件、结构化日志、`--help`、ShellCheck 0 error，并交付 dry-run 与 apply 输出、退出码、计划/实际配置 diff、定时备份 unit/timer、恢复命令与验证记录；预期 dry-run 无写入、apply 仅部署 release 42；首考题 4（受限排错）：固定失败为发布路径含空格时管道前段失败但脚本仍返回 0；候选根因仅限未设置变量、未加引号、吞掉管道退出码、并发第二次执行四项，禁止打印 token；观察合同分别为 nounset 输出、带空格 argv、pipeline status、锁文件，以失败输出和 trap 清理逐项证伪，提交幂等二次运行与回滚回归证据；首考题 5（学习复述）：用 3 分钟说明“严格模式”不能替代输入白名单与显式回滚。复测变式：仅将 timer 触发条件改为错过执行后的 persistent；不变量为 release 42、锁与 dry-run 语义；预期同一 release 不重复部署；新证据为 timer 状态、两次运行日志和退出码。命题边界：不以 CI 平台 YAML 取代 Shell 可执行证据。
- 通过标准：必须含脚本、ShellCheck 输出、两次运行输出、锁/清理和回滚记录；否决项：密钥写入脚本/日志、未引用变量、吞掉退出码、dry-run 实际改写或部分失败无恢复。评估边界：仅展示脚本正文不能通过。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 105 分钟；复测 75 分钟

## LINUX-04 服务器安全、SSH、用户与基础防护

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文学习讲义：LINUX-04](../chinese-guides/linux-04-server-security-ssh-users-firewall.md#linux-04)。覆盖范围：独立讲义从资产、主体、最小权限推进到 SSH/host key、authorized_keys、sudoers、防火墙、补丁、systemd 硬化、日志、备份、漂移和事件响应，并给出防止自锁的第二会话/控制台回退流程。
- 严格考核：挑战类型：TOOL_OPERATION；首考题 1（资料定位）：只允许使用《中文学习讲义：LINUX-04》，定位 SSH、sudo、入站规则、审计与应急访问的约束；首考题 2（机制解释）：闭卷解释 `deploy`、`ops-breakglass`、sshd 和防火墙规则如何共同限制登录与提权，并反驳“防火墙允许即应用可达”；首考题 3（最小产出）：对给定 Ubuntu fixture 交付 `/etc/ssh/sshd_config.d/50-demo.conf`、`/etc/sudoers.d/deploy`、UFW/安全组规则 diff 和密钥轮换清单：只允许 `deploy` 密钥登录、仅 443 公网入站、API 41730 仅回环、break-glass 有时限；提交 `sshd -T`、`sudo -l -U deploy`、入站规则和审计日志输出，以及在第二会话验证成功后才应用的回滚步骤；预期 deploy 可密钥登录、41730 无公网监听；首考题 4（受限排错）：固定失败为错误 Match 规则使 `deploy` 被锁定；候选根因仅限 sudo 通配符允许 root shell、41730 意外公网暴露、过期密钥仍可登录三项，限制为控制台应急账户；观察合同分别为 `sshd -T` Match 生效项、`sudo -l` 命令集、端口矩阵、authorized_keys 时间戳，以连通/拒绝双向证据逐项证伪，提交最小 diff、回滚后的再次拒绝和回归；首考题 5（学习复述）：用 3 分钟说明防火墙允许与应用监听之间为什么必须双重验证。复测变式：仅将入站路径由 IPv4 改为 IPv6；不变量为 deploy/sudo/443/41730 策略；预期 IPv6 也不得绕过端口矩阵；新证据为 IPv6 规则、监听和拒绝日志。命题边界：不把 TLS 证书配置或应用鉴权作为服务器账户安全证据。
- 通过标准：证据逐项覆盖配置 diff、正反登录、sudo 边界、端口矩阵、审计和可用应急回滚；否决项：共享 root、密码登录、私钥/密钥入镜像或日志、先断开唯一会话再试配置。评估边界：安全建议清单不能代替真实拒绝证据。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 105 分钟；复测 75 分钟

### 容器化基础与专项治理

## DOCKER-01 镜像、容器、Dockerfile 与构建缓存

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文学习讲义：DOCKER-01](../chinese-guides/docker-01-images-containers-dockerfile-cache.md#docker-01)。覆盖范围：独立讲义解释镜像/容器、Dockerfile、上下文、layer cache、多阶段、基础 digest、依赖与秘密、非 root/只读、入口/信号、健康、多架构、远程缓存和制品验证；以可追溯输入和最小运行面为主线。
- 严格考核：挑战类型：TOOL_OPERATION；首考题 1（资料定位）：只允许使用《中文学习讲义：DOCKER-01》，定位构建上下文、缓存层、多阶段、运行用户与信号边界；首考题 2（机制解释）：闭卷解释 Dockerfile 指令和上下文变更如何决定 layer cache 与最终运行面，并反驳“能启动就说明制品最小”；首考题 3（最小产出）：为固定 Vite fixture 交付 Dockerfile 与 `.dockerignore` diff，使用锁文件构建、node 构建阶段与非 root nginx 运行阶段；记录干净构建和仅改 `src/` 后构建的 BuildKit 输出、`docker image inspect` 用户/入口/端口、镜像文件清单和 `curl` 结果，并提供同 digest 的 rebuild 记录；预期仅 `src/` 修改复用依赖层且镜像非 root；首考题 4（受限排错）：固定失败为仅改 `src/` 却使依赖层缓存失效；候选根因仅限 `.env` 进入 build context、先复制全部源码、arm64/amd64 不匹配、只读运行时写临时文件四项；限制只改 Dockerfile/.dockerignore，观察合同分别为 context 清单、COPY 层 hash、platform、运行时写入错误，以 BuildKit/inspect 输出逐项证伪，提交最小 diff、重建回归和回滚到前一 image digest 的证据；首考题 5（学习复述）：用 3 分钟说明 build arg、runtime env 与 secret mount 各自能否进入最终层。复测变式：仅将输入改为锁文件变更；不变量为 Dockerfile、多阶段和运行用户；预期依赖层失效而静态层仍最小；新证据为 BuildKit 层日志、image inspect 与 digest。命题边界：不以 Compose 网络或镜像扫描代替构建缓存/制品边界。
- 通过标准：验证证据：题 3 须提交 Dockerfile 与 `.dockerignore` diff、干净构建/仅改 `src/` 的两次 BuildKit 输出、image inspect、镜像文件清单、curl 结果及同 digest 重建记录；题 4 须提交失败输出、候选根因的逐项证伪记录、最小修复 diff、同 fixture 重建回归及前一 image digest 回滚输出。否决项：`latest` 基础镜像、`.env`/密钥/node_modules 进层、root 运行、无 health/启动依据或不能从空缓存构建。评估边界：只展示能启动的容器不能通过。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## DOCKER-02 Docker Compose、网络、数据卷与环境隔离

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文学习讲义：DOCKER-02](../chinese-guides/docker-02-compose-network-volumes-environments.md#docker-02)。覆盖范围：独立讲义围绕 Compose 最终拓扑解释项目隔离、服务 DNS、端口、就绪、迁移、命名卷/备份、bind mount、环境/秘密、覆盖、资源、日志、安全和删除恢复；明确 running/depends_on 不等于业务就绪。
- 严格考核：挑战类型：TOOL_OPERATION；首考题 1（资料定位）：只允许使用《中文学习讲义：DOCKER-02》，定位服务 DNS、网络隔离、volume、healthcheck 与环境分层；首考题 2（机制解释）：闭卷解释 `depends_on`、healthcheck、内部 DNS 与 named volume 为什么不是同一可用性保证，并反驳“已启动即数据库可查询”；首考题 3（最小产出）：交付 `compose.yaml` 和 `.env.example`，固定 web、api、postgres 三服务：仅 web 发布 443、api/db 不发布宿主端口、api 以 `db:5432` 访问、postgres 使用 named volume；提交 `docker compose config`、网络 inspect、health 状态、容器重建后数据 hash、从 web/API 的连通与拒绝输出、`down/up` 回滚命令和验证记录；预期 api 仅经 `db:5432` 连通且重建后 hash 不变；首考题 4（受限排错）：固定失败为 api 使用 `localhost` 连接 DB 后健康检查一直未就绪；候选根因仅限匿名 volume、生产 `.env` 覆盖示例密钥、错误端口发布三项，限制查看 config/原始日志/inspect；观察合同分别为解析后的 DB_HOST、volume 名称、环境来源、publish 列表，逐项证伪，提交最小 config diff、同一检查回归和恢复数据证据；首考题 5（学习复述）：用 3 分钟说明为什么 `depends_on` 不是数据库已经可查询的证明。复测变式：仅将 DB 网络成员改为只读；不变量为 web/api 端口隔离和 named volume；预期 web 仍不可直连 DB；新证据为网络 inspect、拒绝输出和数据 hash。命题边界：不考 Dockerfile 构建缓存或主机防火墙。
- 通过标准：证据须含解析后的 config、网络/端口矩阵、health、持久化重建、环境脱敏和回滚；否决项：数据库公网发布、服务间 `localhost`、生产密钥入仓库、以启动顺序替代健康验证。评估边界：仅贴 Compose 文件不能通过。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## DOCKER-03 容器内调试、资源限制与生产运行边界

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文学习讲义：DOCKER-03](../chinese-guides/content-audit-15-17.md#docker-03)。该讲义的正文专门讲解容器调试、资源限制和故障边界；覆盖范围：容器内进程/网络/文件调试、信号、只读文件系统、CPU/内存限制、日志和优雅退出；覆盖 OOM、僵尸进程、健康检查、重启环与宿主差异。
- 严格考核：挑战类型：DEBUGGING；首考题 1（资料定位）：只允许使用《中文学习讲义：DOCKER-03》，定位构建/启动/运行期、cgroup 限制、健康、信号与日志边界；首考题 2（机制解释）：闭卷解释 OOM、健康失败和 restart loop 如何在容器状态、日志和宿主观测中留下不同证据，并反驳“running 即服务可用”；首考题 3（最小产出）：以 `demo-web` fixture（内存 `128m`、只读 rootfs、健康端点 `/healthz`）为输入，交付 `docker compose` resource/health/restart 配置 diff，并提交 `ps/logs/inspect/stats/events` 输出、SIGTERM 后连接排空记录、一次失败到修复的事件时间线和镜像化修复；预期 `/healthz` 通过且 SIGTERM 前连接排空；首考题 4（受限排错）：固定失败为 `stats` 显示 128m 上限触发 OOM 后 restart loop；候选根因仅限入口脚本无执行位、端口冲突、只读文件系统写 `/tmp`、健康命令错误四项；不得 `exec` 后手工改文件；观察合同分别为 entrypoint mode、端口占用、只读写入 errno、health 输出，以受限证据逐项证伪，提交配置/镜像 diff、重建后状态回归和回滚 image digest；首考题 5（学习复述）：用 3 分钟说明为什么“容器在 running”不能说明服务可用或资源安全。复测变式：仅将故障从 OOM 改为优雅退出超时；不变量为 128m、只读 rootfs、`/healthz` 和镜像化修复；预期 SIGTERM 后有排空记录且无重启环；新证据为 events、health 与终止日志。命题边界：不考镜像签名或主机网络诊断。
- 通过标准：必须区分构建、启动、运行和健康层证据；含资源/事件输出、不可变修复、优雅终止及回滚；否决项：容器内热改当长期方案、只看 logs、无 cgroup/健康观察或无限重启掩盖故障。评估边界：只给最终配置不能通过。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## DOCKER-04 容器镜像安全、扫描与制品可信

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文学习讲义：DOCKER-04](../chinese-guides/content-audit-15-17.md#docker-04)。该讲义的正文专门讲解容器镜像扫描、可信制品和晋级回滚；覆盖范围：仅负责容器基础镜像、层内容、软件包/秘密扫描、镜像 SBOM 关联、签名/provenance、最小用户与运行面、镜像晋级和回滚。通用依赖供应链归 `ENG-08`，AI 生成依赖来源归 `AIDEV-07`。
- 严格考核：挑战类型：TOOL_OPERATION；首考题 1（资料定位）：只允许使用《中文学习讲义：DOCKER-04》，定位基础镜像、SBOM、扫描、签名/provenance、晋级与回滚证据；首考题 2（机制解释）：闭卷解释 image digest、标签、SBOM、扫描结果和签名/provenance 如何共同支撑“可部署制品”，并反驳“扫描通过即可晋级”；首考题 3（最小产出）：给定 `web:1.4.2` 与固定 digest，交付生成/保存 SBOM、漏洞与 secret scan、非 root inspect、签名或 provenance 验证、dev→staging→prod 晋级记录和前一 digest 回滚命令；高危 CVE fixture 须声明 SLA、接受/修复负责人和阻断策略；预期所有扫描/签名证据绑定同一 digest；首考题 4（受限排错）：固定失败为 SBOM 与已部署 digest 不匹配且扫描忽略高危 CVE；候选根因仅限仅用 `latest` 标签、签名主体不受信、回滚标签被覆盖三项，限制查看制品/策略输出；观察合同分别为 digest、签名 subject、回滚部署记录，以失败输出逐项证伪，提交策略/配置 diff、重新验签/扫描回归与已部署 digest 回滚证据；首考题 5（学习复述）：用 3 分钟说明扫描通过为何不能替代来源和部署 digest 的可追溯性。复测变式：仅将基础镜像 digest 升级为修复 CVE 的版本；不变量为应用制品、签名策略与晋级流程；预期 SBOM 变化且门禁重新通过；新证据为新旧 SBOM diff、验签与晋级记录。命题边界：不把应用依赖审计或源码许可证评审算为容器制品证明。
- 通过标准：每项证据映射基础来源、digest、SBOM、扫描、可信声明、晋级及回滚；否决项：仅 latest、扫描结果无制品绑定、未处置高危或生产使用不可回滚构建。评估边界：一张扫描截图不能通过。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

### Web 部署交付

## DEPLOY-01 Nginx、静态资源、反向代理、HTTPS 与 CDN 缓存

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[DEPLOY-01 中文核心讲义](../chinese-guides/deploy-01-nginx-static-assets-reverse-proxy-https-cdn.md#deploy-01)。该讲义从请求路径逐层讲解静态资源、反向代理、TLS 和 CDN 缓存的联动边界；覆盖范围：Nginx 静态资源、SPA 回退、反向代理、HTTPS、压缩、缓存头、CDN 失效和安全头；覆盖哈希资源、HTML 缓存、新旧客户端与回滚。
- 严格考核：挑战类型：TOOL_OPERATION；首考题 1（资料定位）：只允许使用《DEPLOY-01 中文核心讲义》，定位 SPA 回退、代理、TLS、缓存层级、旧 chunk 与回滚依据；首考题 2（机制解释）：闭卷解释 HTML、带 hash 资源、API 响应与 CDN 各自缓存/失效如何决定发布可恢复性，并反驳“静态资源 200 即已有标签页安全”；首考题 3（最小产出）：对 fixture `index.html`（no-cache）和 `assets/app.abc.js`（immutable）交付 Nginx server block diff：443 TLS、`/api/` 至 127.0.0.1:41730、深路由回退、gzip/brotli、CSP/HSTS 基础头及旧 chunk 捕获刷新；提交 `nginx -t`、`curl -I` 各路径、深链路响应、代理 header、部署前后 manifest/digest、CDN purge/回滚命令及验证输出；预期 API 不落 HTML、HTML 非 immutable 且旧 chunk 可恢复；首考题 4（受限排错）：固定失败为 API 被 `try_files` 落到 HTML，且旧 HTML 请求已删除 chunk；候选根因仅限 HTML 被 immutable 缓存、上游 Host/header 错误、证书链失败三项，限制为配置 diff 与 curl/access/error log；观察合同分别为 API 响应 Content-Type、Cache-Control、proxy header、TLS verify 输出，逐项证伪，提交修复后同输入验证、旧 chunk 回归和旧版本回滚；首考题 5（学习复述）：用 3 分钟说明为什么“静态资源 200”不能证明一次发布对已有标签页安全。复测变式：仅将 CDN 状态改为 HTML 未 purge；不变量为 hash 资源、代理与安全头；预期旧 chunk 自恢复而 API 仍非 fallback；新证据为 CDN 响应头、浏览器重载和 access log。命题边界：不以 Docker 构建成功或业务 API 功能替代 Web 交付证据。
- 通过标准：提交配置 diff、语法检查、响应头矩阵、深路由/代理/旧 chunk 证据、发布记录和回滚输出；否决项：HTML 长缓存、API 被 SPA fallback 吞没、跳过 TLS/安全头验证或只截图不保留命令输出。评估边界：仅页面可打开不能通过。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## 领域综合考核

- [ ] 已通过领域综合考核
- 任务：选择 Career Atlas 或一个真实 Web/H5 项目，完成从本地构建到 Docker 镜像、Compose 编排、Nginx/HTTPS/缓存配置、健康检查、日志查看、灰度发布和回滚演练的完整部署交付。
- 通过标准：8 小时内完成；提供 Dockerfile、Compose、部署说明、内容变更重新打包部署记录、排障记录、缓存策略、回滚步骤和截图/命令证据；随机注入端口冲突、旧 chunk、容器重启、权限错误和环境变量缺失时能定位并修复。评估边界：领域综合考核只依据本领域列出的资料、题目输入和可复核产出；不得用资料外经验替代跨知识点整合证据。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟
