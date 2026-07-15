# 前端职业成长工作台

更新时间：2026-07-15

这套文档用于管理职业定位、学习计划、项目复盘和求职进度。当前主线是：先把已有项目经验整理成可表达的职业资产，再系统补强 TypeScript、React、中后台、H5、工程化和质量能力。

## 从这里开始

1. 阅读[个人定制前端成长计划](docs/plans/personalized-frontend-mastery-plan.md)，确认 16 周目标与每天 8 小时的安排。
2. 打开[16 周学习追踪表](templates/learning-tracker-template.csv)，从当前周、当天任务开始执行。
3. 从[可勾选知识掌握清单](docs/knowledge/knowledge-base/README.md)选择知识点，按预计耗时分阶段学习，并用[学习资料使用指南](docs/knowledge/learning-resource-guide.md)选择官方主线资料。
4. 把项目复盘、技术难点和成果补进[项目经验资产库](docs/knowledge/project-assets.md)。
5. 开始投递后，用[杭州前端岗位追踪表](templates/hangzhou-frontend-jobs-template.csv)记录 JD、差距和后续动作。

文档已经实现为本地优先的 Career Atlas 网站。它提供知识体系与图谱、学习资料、严格考核、日历打卡、每日复盘、求职看板和本地备份；从[Career Atlas 开发文档](docs/development/README.md)了解架构，从[实施与验收状态](docs/development/implementation-status.md)查看已完成能力和环境依赖。

## 启动网站

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

前端地址为 `http://127.0.0.1:41731`，本地 API 为 `http://127.0.0.1:41730`。首次启动会自动迁移数据库、导入 143 个知识点、生成每周 7 天的 16 周计划，并创建当天备份，无需手动初始化。DeepSeek 自动评分需要在 `.env.local` 中配置 `DEEPSEEK_API_KEY`；未配置时仍可学习和答题，但不能完成 AI 自动判卷。

当前知识库包含 15 个领域、143 个知识点、339 个可直达资料链接和 178 条知识关系。首次掌握预计 666 小时，7 天复测预计 93 小时；系统按“资料精读、刻意练习、项目产出、严格考核、延迟复测”五阶段和 15 分钟粒度安排日历，单日容量上限为 480 分钟。

## 文档地图

| 类型 | 文档 | 用途 | 使用频率 |
| --- | --- | --- | --- |
| 主计划 | [个人定制前端成长计划](docs/plans/personalized-frontend-mastery-plan.md) | 能力画像、16 周路线、学习资源和每日安排 | 每周查看 |
| 长期方向 | [前端长期成长路线图](docs/plans/frontend-growth-roadmap.md) | 1-3 年职业方向和能力阶段 | 每月复盘 |
| 求职执行 | [前端求职执行计划](docs/plans/frontend-career-plan.md) | 岗位定位、简历、面试和投递节奏 | 求职期每周查看 |
| 知识管理 | [前端知识体系](docs/knowledge/frontend-knowledge-system.md) | 知识树、记录模板、复习闭环 | 每天使用 |
| 掌握与考核 | [可勾选知识掌握清单](docs/knowledge/knowledge-base/README.md) | 143 个知识点、学习资料、严格考核和通过状态 | 每天更新 |
| 资料与耗时 | [学习资料使用指南](docs/knowledge/learning-resource-guide.md) | 官方连续课程、资料优先级、五阶段耗时与使用方法 | 学习前查看 |
| 项目资产 | [项目经验资产库](docs/knowledge/project-assets.md) | 项目复盘、简历素材和面试案例 | 每周维护 |
| 执行蓝图 | [16 周学习计划蓝图](templates/learning-tracker-template.csv) | 阶段、周主题、项目锚点、周成果与严格考核；系统据此生成 112 条每日任务 | 知识体系重大更新时 |
| 时间模板 | [每日 8 小时安排](templates/daily-8h-learning-schedule.csv) | 分配学习、实战、输出与复盘时间 | 每天参考 |
| 求职模板 | [杭州前端岗位追踪表](templates/hangzhou-frontend-jobs-template.csv) | 记录目标岗位、匹配度与技能差距 | 每次投递更新 |
| 网站开发 | [Career Atlas 开发文档](docs/development/README.md) | 产品、架构、AI 考核、验收和 GLM-5 提示词 | 开发阶段使用 |

## 文件结构

```text
career-planning/
├── README.md                 # 唯一入口
├── docs/
│   ├── plans/                # 短期执行与长期发展规划
│   ├── knowledge/            # 知识体系、143 项掌握清单与项目资产
│   └── topics/               # 学习过程中逐步完成的专题产出
└── templates/                # 日程、学习和岗位追踪表
```

三份规划的边界：主计划回答“未来 16 周具体做什么”，长期路线图回答“未来 1-3 年走向哪里”，求职执行计划回答“如何把能力转成面试与 offer”。出现重复内容时，以主计划中的近期安排为准。

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
