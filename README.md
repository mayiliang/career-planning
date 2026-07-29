# Career Atlas：AI 时代高级前端成长工作台

更新时间：2026-07-29

Career Atlas 是一个本地优先的职业成长系统，把“AI 时代高级前端能力体系”落成可学习、可考核、可复测、可追踪的执行计划。

当前基线：

- 20 个能力领域、190 个唯一知识点。
- 48 周、336 天计划；前 44 周覆盖全部知识点，后 4 周完成作品集、生产演练、综合项目和答辩。
- 每日学习容量上限 390 分钟。系统按实际学习合同排期，不为凑时长虚增任务。
- 每个知识点包含至少两份可交叉验证的资料，全部必读资料和独立首考题源均为中文；英文原文只能明确标注后用于版本核验。
- 学习阶段为资料精读、机制练习、项目产出、严格首考、至少 7 天后的延迟复测。
- 推荐阅读顺序与硬前置依赖分别建模，只有真实依赖会阻塞后续学习。

## 开始使用

1. 阅读[48 周高级前端掌握计划](docs/plans/personalized-frontend-mastery-plan.md)。
2. 查看[知识库入口与分层路线](docs/knowledge/knowledge-base/README.md)。
3. 按[学习资料与耗时指南](docs/knowledge/learning-resource-guide.md)执行当天知识点。
4. 在[项目经验资产库](docs/knowledge/project-assets.md)保存代码、测试、ADR、性能和部署证据。
5. 求职阶段使用[杭州前端岗位追踪表](templates/hangzhou-frontend-jobs-template.csv)记录岗位差距。

## 启动

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

网站地址为 `http://127.0.0.1:41731`，本地 API 为 `http://127.0.0.1:41730`。首次启动会自动迁移数据库、导入 190 个知识点、生成 48 周计划并创建当天备份。

DeepSeek 自动评分需要在 `.env.local` 配置 `DEEPSEEK_API_KEY`。未配置时仍可学习、记录和答题，但不能自动判卷。

## Docker

```bash
docker compose up --build -d
```

本机访问 `http://127.0.0.1:41731`；可信内网设备可使用 `http://<本机内网 IP>:41731`。SQLite 数据和自动备份保存在 Docker 具名卷 `career-atlas-data` 中。不要执行 `docker compose down -v`，除非确定要删除数据卷。

知识体系重大更新后，可在“系统与数据 -> 学习进度重置”中清空学习证据并按最新版 48 周模板重建日历；岗位、项目资产和备份会保留。

## 内容质量门禁

```bash
pnpm content:check
pnpm test
pnpm build
```

内容门禁会验证领域和知识点数量、编号唯一性、资料数量、中文必读资料覆盖、中文讲义逐点对应、每条英文原文的可选核验标记、英文不得独立命题、考核题源、耗时合同、陈旧链接黑名单和 Windows CRLF 兼容。服务端测试会验证导入、硬前置方向、48 周排期、每日容量和延迟复测。

## 文档地图

| 文档 | 作用 |
| --- | --- |
| [48 周高级前端掌握计划](docs/plans/personalized-frontend-mastery-plan.md) | 周期、阶段、每日节奏与毕业闸门 |
| [知识库入口](docs/knowledge/knowledge-base/README.md) | 20 个领域、190 个知识点和分层路线 |
| [前端知识体系说明](docs/knowledge/frontend-knowledge-system.md) | 能力边界、关联方式和掌握定义 |
| [学习资料与耗时指南](docs/knowledge/learning-resource-guide.md) | 中文资料优先级、证据协议和耗时口径 |
| [高级与前沿主题中文核心讲义](docs/knowledge/chinese-guides/advanced-topics.md) | 无稳定中文版主题的中文概念框架、工程边界和实践验证 |
| [核心与生态主题中文伴读](docs/knowledge/chinese-guides/core-and-ecosystem-topics.md) | 保留英文标准或项目原文知识点的逐点中文必读内容 |
| [覆盖闭环审计](docs/knowledge/ai-era-frontend-gap-audit.md) | 原缺口到新知识点的映射和维护规则 |
| [48 周执行蓝图](templates/learning-tracker-template.csv) | 48 周 × 7 天的计划模板 |
| [每日 6 小时 30 分钟模板](templates/daily-6h30m-learning-schedule.csv) | 390 分钟容量的参考时间块 |
| [开发文档](docs/development/README.md) | 产品、架构、数据、测试和运维说明 |

## 能力范围

本体系的“完整”是指覆盖高级前端在 AI 时代应具备的稳定能力，而不是罗列所有框架和厂商产品。它同时包含：

- 核心必修：Web 平台、JavaScript/TypeScript、框架、业务建模、工程质量、安全、性能、数据与交付。
- 岗位专精：中后台、H5/Hybrid、组件平台、实时协作、图形可视化、国际化、实验与增长。
- AI 原生：AI 产品判断、流式交互、RAG、Agent、MCP 2026、本地推理、评估、安全、隐私和研发治理。
- 高级影响力：架构决策、渐进迁移、成本与可靠性、后端/云基础设施素养、技术领导力和职业表达。

每完成一个知识点，必须留下可复核证据；“读过”不等于“掌握”。
