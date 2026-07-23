# 前端职业成长工作台

更新时间：2026-07-21

这套文档用于管理职业定位、学习计划、项目复盘和求职进度。当前主线是：先把已有项目经验整理成可表达的职业资产，再系统补强 TypeScript、React、中后台、H5、工程化和质量能力。

## 从这里开始

1. 阅读[个人定制前端成长计划](docs/plans/personalized-frontend-mastery-plan.md)，确认 20 周目标与每天至少 500 分钟的安排。
2. 打开[20 周学习追踪表](templates/learning-tracker-template.csv)，从当前周、当天任务开始执行。
3. 从[可勾选知识掌握清单](docs/knowledge/knowledge-base/README.md)选择知识点，按预计耗时分阶段学习，并用[学习资料使用指南](docs/knowledge/learning-resource-guide.md)选择官方主线资料。
4. 把项目复盘、技术难点和成果补进[项目经验资产库](docs/knowledge/project-assets.md)。
5. 开始投递后，用[杭州前端岗位追踪表](templates/hangzhou-frontend-jobs-template.csv)记录 JD、差距和后续动作。

文档已经实现为本地优先的 Career Atlas 网站。它提供知识体系与图谱、覆盖知识点的学习资料、逐层过渡的严格考核、DeepSeek 逐题评审、日历打卡、每日复盘、求职看板和本地备份；从[Career Atlas 开发文档](docs/development/README.md)了解架构，从[实施与验收状态](docs/development/implementation-status.md)查看已完成能力和环境依赖。

## 启动网站

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

前端地址为 `http://127.0.0.1:41731`，本地 API 为 `http://127.0.0.1:41730`。首次启动会自动迁移数据库、导入 153 个知识点、生成每周 7 天的 20 周计划，并创建当天备份，无需手动初始化。DeepSeek 自动评分需要在 `.env.local` 中配置 `DEEPSEEK_API_KEY`；未配置时仍可学习和答题，但不能完成 AI 自动判卷。

当前知识库包含 16 个领域、153 个知识点，已把 Linux、Docker、Nginx、CI/CD 和部署回滚纳入高级前端主线。系统按“资料精读、刻意练习、项目产出、严格考核、延迟复测”五阶段和 15 分钟粒度安排日历，默认每日学习容量为 540 分钟，生成计划时每天预计投入不低于 500 分钟；严格首考从资料定位、概念解释、小例子推导、受限排错到学习复述逐层过渡，答案必须能从学习资料直接查到或一跳推导。每个知识点的默认耗时档位见学习资料使用指南，显式覆盖值会在导入后写入数据库。

## 使用 Docker 启动

本机安装 Docker Desktop 后，在项目根目录运行：

```bash
docker compose up --build -d
```

本机打开 `http://127.0.0.1:41731`，同一内网中的设备使用 `http://<本机内网 IP>:41731`。Docker 仅向内网开放网站端口，API 地址 `http://127.0.0.1:41730` 仍只允许本机直接访问，网页请求会由 Nginx 在容器网络中转发。SQLite 数据和自动备份保存在 Docker 具名卷 `career-atlas-data` 中，重建容器不会丢失。

当前内网 IP 可用 `ipconfig getifaddr en0` 查询；只应在可信内网中运行，如 macOS 防火墙弹出提示，需要允许 Docker 接受传入连接。

常用维护命令：

```bash
# 查看运行状态和日志
docker compose ps
docker compose logs -f

# 停止服务（保留数据）
docker compose down

# 重新构建并启动
docker compose up --build -d
```

如需 DeepSeek 自动评分，在 `.env.local` 中设置 `DEEPSEEK_API_KEY` 后重新执行 `docker compose up -d`。不要使用 `docker compose down -v`，除非确定要同时删除 SQLite 数据卷。

知识体系或学习计划大改后，可以在网站的“系统与数据 -> 学习进度重置”中清空学习掌握状态、考核、打卡、复盘、请假和模板计划，并按最新版 20 周模板重新生成日历。岗位、项目资产和备份不会被这个动作删除。

## 内容变更发布规则

知识库、学习计划、规划文档、模板或前端代码有任何变动，都必须重新打包部署。不要直接修改容器内文件，也不要假设 Markdown 改完会在生产环境自动生效。

标准流程：

```bash
pnpm content:check
pnpm test
pnpm build
docker compose up --build -d
docker compose ps
```

发布后至少验证：

- 网站能打开：`http://127.0.0.1:41731`
- 同一内网设备能打开：`http://<本机内网 IP>:41731`
- API 能访问：`http://127.0.0.1:41730`
- 知识点数量、周计划和最新修改内容已经生效
- `docker compose logs -f` 中没有启动错误

## 文档地图

| 类型 | 文档 | 用途 | 使用频率 |
| --- | --- | --- | --- |
| 主计划 | [个人定制前端成长计划](docs/plans/personalized-frontend-mastery-plan.md) | 能力画像、20 周路线、学习资源和每日安排 | 每周查看 |
| 长期方向 | [前端长期成长路线图](docs/plans/frontend-growth-roadmap.md) | 1-3 年职业方向和能力阶段 | 每月复盘 |
| 求职执行 | [前端求职执行计划](docs/plans/frontend-career-plan.md) | 岗位定位、简历、面试和投递节奏 | 求职期每周查看 |
| 知识管理 | [前端知识体系](docs/knowledge/frontend-knowledge-system.md) | 知识树、记录模板、复习闭环 | 每天使用 |
| 体系审计 | [AI 时代高级前端知识体系查漏补全](docs/knowledge/ai-era-frontend-gap-audit.md) | 检查高级前端横向能力缺口和下一轮扩展方向 | 每月复盘 |
| 掌握与考核 | [可勾选知识掌握清单](docs/knowledge/knowledge-base/README.md) | 153 个知识点、学习资料、严格考核和通过状态 | 每天更新 |
| 资料与耗时 | [学习资料使用指南](docs/knowledge/learning-resource-guide.md) | 官方连续课程、资料优先级、五阶段耗时与使用方法 | 学习前查看 |
| 项目资产 | [项目经验资产库](docs/knowledge/project-assets.md) | 项目复盘、简历素材和面试案例 | 每周维护 |
| 执行蓝图 | [20 周学习计划蓝图](templates/learning-tracker-template.csv) | 阶段、周主题、项目锚点、周成果与严格考核；系统据此生成 140 条每日任务 | 知识体系重大更新时 |
| 时间模板 | [每日 540 分钟安排](templates/daily-8h-learning-schedule.csv) | 分配学习、实战、输出与复盘时间 | 每天参考 |
| 求职模板 | [杭州前端岗位追踪表](templates/hangzhou-frontend-jobs-template.csv) | 记录目标岗位、匹配度与技能差距 | 每次投递更新 |
| 网站开发 | [Career Atlas 开发文档](docs/development/README.md) | 产品、架构、AI 考核、验收和 GLM-5 提示词 | 开发阶段使用 |

## 文件结构

```text
career-planning/
├── README.md                 # 唯一入口
├── docs/
│   ├── plans/                # 短期执行与长期发展规划
│   ├── knowledge/            # 知识体系、153 项掌握清单与项目资产
│   └── topics/               # 学习过程中逐步完成的专题产出
└── templates/                # 日程、学习和岗位追踪表
```

三份规划的边界：主计划回答“未来 20 周具体做什么”，长期路线图回答“未来 1-3 年走向哪里”，求职执行计划回答“如何把能力转成面试与 offer”。出现重复内容时，以主计划中的近期安排为准。

## 执行闭环

```text
岗位或能力目标
  -> 从学习追踪表选择当天唯一主题
  -> 在真实项目中练习
  -> 产出专题笔记、代码或复盘
  -> 更新项目资产和面试表达
  -> 根据岗位与面试反馈调整下一轮计划
```

每天只推进一个主学习主题，并留下至少一个可见产出。每周更新一次项目资产，每两周做一次模拟面试，每四周校准一次主计划。

## 当前行动

- [ ] 完成 `gungnir-web` 项目复盘第一版。
- [ ] 完成一个 H5 项目复盘。
- [ ] 在 `aiui` 和 `get_apidoc` 中选定一个工具化或组件化代表作。
- [ ] 建立第一份专题文档，统一放入 `docs/topics/`。
- [ ] 采集首批 10 个杭州目标岗位并记录技能差距。
