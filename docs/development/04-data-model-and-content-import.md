# 数据模型与内容导入

更新时间：2026-08-20

## 1. 数据边界

- `docs/knowledge/`：领域、知识点、中文资料、挑战边界和通过标准的内容真源。
- SQLite：学习状态、当前焦点、掌握等级、笔记版本、练习、挑战、打卡、路线选择、岗位和项目等用户数据真源。
- 导入器可以更新知识内容与关系，不能覆盖用户笔记、练习、答案或已取得的掌握证据。

## 2. 主要实体

| 领域 | 主要实体 | 说明 |
| --- | --- | --- |
| 知识 | domains、points、relations | 20 个稳定能力组、二级主题、223 个稳定编号知识点、独立分类轴、显式路线/主题映射及关系 |
| 自主学习 | point learning fields、route choices、checkins | 学习状态、当前点、暂缓/恢复、真实打卡 |
| 笔记 | notes、note versions | 原始稿、AI 候选稿、已采用来源、版本历史 |
| 练习 | practice attempts | 任务、提交、代码、执行输出、验证结果 |
| 掌握 | sessions、questions、answers、hint events、results | M1～M4、帮助等级、评分与逐题反馈 |
| 日历/复盘 | plan events、checkins、leave、reviews | 保留记录与兼容能力，不再生成强制每日学习任务 |
| 求职/项目 | jobs、job activities、project assets | 岗位反馈与可复核产出 |
| 系统 | settings、audit、backup metadata | 配置、审计和恢复 |

## 3. 知识点字段口径

- `code`、`title`、`domain`、`secondaryTopic`、`topicOrder`、`routeOrder`：身份、父级主题和顺序。
- `capabilityLayer`、`aiRelation`、`requirementLevel`、`maturity`、`portability`、`applicabilityTags`：能力层、AI 关系、要求级别、成熟度、主适用范围和多重适用标签；不得把 AI 属性、实验性或环境约束混入能力层/要求级别。
- `trackIds`：只表示 React、Vue、Umi/Ant Design、Agent/MCP 四条可执行主修路线；`topicTags` 表示安全、无障碍、平台工程、浏览器 AI 等跨领域主题，二者不得混用。
- `verifiedAt`、`fallbackStrategy`：内容最近核验日期和版本/能力降级策略。
- `studyMaterialMd`、`assessmentSpecMd`、`passCriteriaMd`：资料、题目边界、通过标准。
- `learningState`：`NOT_STARTED | LEARNING | LEARNED | DEFERRED`。
- `currentFocus`：全局最多一个当前学习点。
- `masteryLevel`：0～4；与学习状态独立。
- `challengeProfile`：由内容特性推导为理论、示例、编码、排错、工具或设计案例。
- `study/practice/project/assessment/retest minutes`：为旧内容与统计兼容字段。UI 只展示有真实任务的活动时长，不再把五项解释成用户必须线下完成的阶段。
- `planWeek`：仅为数据库/API 兼容名，运行时含义是 1～35 的核心路线批次；专项点一律返回空值，不读取旧库残留周次。

旧的 `status`（如 `SELF_MASTERED`、`FIRST_PASS_PENDING_RETEST`、`MASTERED`）继续作为数据库兼容/统计字段；新产品语义以 `learningState + masteryLevel` 为准。

## 4. 笔记版本

每次保存原始笔记都新增版本。AI 整理完成后新增 `AI_DRAFT`，用户采用后新增 `AI_ACCEPTED`；采用只切换阅读来源，不删除或覆盖 `originalMd`。

AI 流式增量和 thinking 是临时 UI 状态，只有通过完整 JSON 解析和业务校验的最终候选稿才写入数据库。thinking 不持久化为用户笔记。

## 5. 内容解析规则

1. 知识点编号全局唯一，领域编号和路线顺序稳定。
2. 每个领域至少有两个不重名的二级主题；每个知识点必须且只能归入一个二级主题，空主题不允许导入。
3. 每份当前资料自身的主要正文须与本点直接相关，目标约 80% 以上；同点资料组合后须完整覆盖定义/概念、机制/流程、适用条件/场景、具体示例/实验、边界/失败/反例和验证/测试/证据六类内容，不能用总览页、零散相关段落或多份重复短讲义充数。
4. 英文链接必须标注为版本核验，不得成为独立挑战题源。
5. 本地中文核心讲义必须有精确锚点，能由站内资料页只读取对应章节，并覆盖外部资料难以中文化或无法稳定访问的内容；链接必须直接进入该知识点的 `学习资料`，不能以脱离资料字段的“强化讲义”或文末跨点附录替代。
6. 学习活动只有在存在明确输入、输出、完成判定和站内交付方式时才生成。
7. 关系类型区分硬前置、推荐顺序、相关和应用关系；只有硬前置允许阻塞。
8. 导入必须支持 LF/CRLF 和 Windows/macOS/Linux 路径。
9. `TRACK_REQUIRED` 必须有至少一个 `trackId`；默认路线由 `REQUIRED` 与所选路线的 `TRACK_REQUIRED` 动态生成。
10. 当前默认路线必须精确为 149 个唯一知识点、35 个非空批次，每批 4～5 点；不得加入复盘周、项目周或自由文本占位项。
11. 非知识点事项只有在系统中具有固定输入、交付物、验证清单、否决项和系统/AI 验收结果时才能发布为路线任务；否则不得生成。

## 6. 同步与迁移

- 空库启动：迁移数据库、导入知识、同步关系、建立设置并创建备份。
- 已有数据库：权威同步知识内容，清理已删除的知识定义与关系，但先保护有关联用户数据的迁移路径。
- 重复启动和重复导入幂等。
- 破坏性重置必须由用户明确触发并说明保留/删除范围；普通知识更新不得重置笔记。

## 7. 数据验证

导入事务提交前验证：领域/知识数量、编号和标题唯一、二级主题非空且不重名、分类与路线/主题标签映射、资料数量、中文覆盖、链接协议、锚点存在、资料正文六维覆盖、首考题源与全部现行中文资料标签闭环、关系无自环、硬前置方向、活动契约、题目来源与估算字段合法。任一错误时整批回滚，不允许半导入。
