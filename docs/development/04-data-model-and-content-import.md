# 数据模型与内容导入

更新时间：2026-08-03

## 1. 数据边界

- `docs/knowledge/`：领域、知识点、中文资料、挑战边界和通过标准的内容真源。
- SQLite：学习状态、当前焦点、掌握等级、笔记版本、练习、挑战、打卡、路线选择、岗位和项目等用户数据真源。
- 导入器可以更新知识内容与关系，不能覆盖用户笔记、练习、答案或已取得的掌握证据。

## 2. 主要实体

| 领域 | 主要实体 | 说明 |
| --- | --- | --- |
| 知识 | domains、points、relations | 20 个领域、219 个稳定编号知识点及关系 |
| 自主学习 | point learning fields、route choices、checkins | 学习状态、当前点、暂缓/恢复、真实打卡 |
| 笔记 | notes、note versions | 原始稿、AI 候选稿、已采用来源、版本历史 |
| 练习 | practice attempts | 任务、提交、代码、执行输出、验证结果 |
| 掌握 | sessions、questions、answers、hint events、results | M1～M4、帮助等级、评分与逐题反馈 |
| 日历/复盘 | plan events、checkins、leave、reviews | 保留记录与兼容能力，不再生成强制每日学习任务 |
| 求职/项目 | jobs、job activities、project assets | 岗位反馈与可复核产出 |
| 系统 | settings、audit、backup metadata | 配置、审计和恢复 |

## 3. 知识点字段口径

- `code`、`title`、`domain`、`routeOrder`：身份和默认顺序。
- `studyMaterialMd`、`assessmentSpecMd`、`passCriteriaMd`：资料、题目边界、通过标准。
- `learningState`：`NOT_STARTED | LEARNING | LEARNED | DEFERRED`。
- `currentFocus`：全局最多一个当前学习点。
- `masteryLevel`：0～4；与学习状态独立。
- `challengeProfile`：由内容特性推导为理论、示例、编码、排错、工具或设计案例。
- `study/practice/project/assessment/retest minutes`：为旧内容与统计兼容字段。UI 只展示有真实任务的活动时长，不再把五项解释成用户必须线下完成的阶段。

旧的 `status`（如 `SELF_MASTERED`、`FIRST_PASS_PENDING_RETEST`、`MASTERED`）继续作为数据库兼容/统计字段；新产品语义以 `learningState + masteryLevel` 为准。

## 4. 笔记版本

每次保存原始笔记都新增版本。AI 整理完成后新增 `AI_DRAFT`，用户采用后新增 `AI_ACCEPTED`；采用只切换阅读来源，不删除或覆盖 `originalMd`。

AI 流式增量和 thinking 是临时 UI 状态，只有通过完整 JSON 解析和业务校验的最终候选稿才写入数据库。thinking 不持久化为用户笔记。

## 5. 内容解析规则

1. 知识点编号全局唯一，领域编号和路线顺序稳定。
2. 每点必须包含足以覆盖主题的中文必读资料、学习边界和通过标准。
3. 英文链接必须标注为版本核验，不得成为独立挑战题源。
4. 本地中文核心讲义必须有精确锚点，并覆盖资料难以中文化的前沿主题。
5. 学习活动只有在存在明确输入、输出、完成判定和站内交付方式时才生成。
6. 关系类型区分硬前置、推荐顺序、相关和应用关系；只有硬前置允许阻塞。
7. 导入必须支持 LF/CRLF 和 Windows/macOS/Linux 路径。

## 6. 同步与迁移

- 空库启动：迁移数据库、导入知识、同步关系、建立设置并创建备份。
- 已有数据库：权威同步知识内容，清理已删除的知识定义与关系，但先保护有关联用户数据的迁移路径。
- 重复启动和重复导入幂等。
- 破坏性重置必须由用户明确触发并说明保留/删除范围；普通知识更新不得重置笔记。

## 7. 数据验证

导入事务提交前验证：领域/知识数量、编号唯一、资料数量、中文覆盖、链接协议、锚点存在、关系无自环、硬前置方向、活动契约、题目来源与估算字段合法。任一错误时整批回滚，不允许半导入。
