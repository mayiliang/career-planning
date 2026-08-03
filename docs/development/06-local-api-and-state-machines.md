# API 与状态机

更新时间：2026-08-03

API 前缀为 `/api/v1`。普通响应使用 `{ data, meta }`，错误使用稳定代码、中文信息和 `retryable`；流式接口使用 SSE。

## 1. 核心 API

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | `/system/health` | 服务、数据库、数据目录与 AI 配置健康 |
| GET | `/learning/workspace` | 当前点、建议点、路线与今日打卡 |
| POST | `/learning/points/:code/focus` | 设为当前学习 |
| POST | `/learning/points/:code/complete` | 用户确认已学完 |
| POST | `/learning/points/:code/defer` | 暂缓知识点 |
| POST | `/learning/points/:code/restore` | 恢复知识点 |
| GET | `/learning/points/:code/branches` | 唯一后续或线路选择 |
| PUT | `/learning/route-choices` | 选择/暂缓点或支线 |
| PUT | `/learning/checkins/:date` | 保存当天实际学习打卡 |
| GET/PUT | `/notes/:code` | 获取/保存原始 Markdown 笔记 |
| POST | `/notes/:code/organize/stream` | AI 流式整理候选稿 |
| POST | `/notes/:code/accept-organized` | 采用候选阅读版本 |
| GET/PUT | `/learning/points/:code/practice-attempts...` | 站内练习草稿与结果 |
| POST | `.../validate/stream` | 流式验证练习 |
| POST | `/assessments` | 创建或恢复掌握挑战 |
| GET | `/assessments/:id` | 题目、答案和会话 |
| POST | `/assessments/:id/start|submit|cancel` | 会话流转 |
| PUT | `/assessments/:id/answers/:questionId` | 自动保存答案 |
| POST | `.../hints/stream` | 题目专属渐进帮助 |
| POST | `/assessments/:id/grade/stream` | 流式评分 |
| POST | `/assessments/:id/regrade/stream` | 保留答案重新评分 |

知识、图谱、求职、项目、设置、备份和导入接口继续按各自路由提供；新增接口必须在客户端 Zod Schema 和本文件同步。

## 2. SSE 协议

```text
event: start     data: { ...task identity }
event: progress  data: { message, elapsedSeconds?, receivedChars? }
event: thinking  data: { delta }
event: delta     data: { delta }
event: done      data: { note|hint|attempt|grade }
event: error     data: { message }
```

SSE 必须包含 `no-cache, no-transform` 与 `X-Accel-Buffering: no`。客户端中止时路由中止上游；代理读取超时不少于 360 秒。

## 3. 学习状态机

```text
NOT_STARTED --focus--> LEARNING --complete--> LEARNED
     |                    |                     |
     +------defer---------+--------defer--------+--> DEFERRED
                                                  |
                                               restore
                                                  v
                                             NOT_STARTED
```

当前焦点和学习状态有关但不等价：系统保证最多一个 `currentFocus`；已学完后可以暂时保留焦点，直到选择下一个点。`complete` 不改变 `masteryLevel`。

## 4. 掌握状态机

`masteryLevel` 只允许 0→1→2→3→4 单调提升。M4 必须满足延迟变式条件。帮助等级过高时本次最高只能认证 M2。挑战失败或取消不得降低已有等级。

会话典型状态：

```text
DRAFT -> IN_PROGRESS -> SUBMITTED -> GRADING -> GRADED
                    \-> CANCELLED        \-> ERROR -> GRADING
```

同一知识点存在可恢复的 DRAFT/IN_PROGRESS 会话时，创建接口返回 `resumedExisting=true` 和中文 `resumeMessage`。

## 5. 路线语义

- `CONTINUE`：系统在过滤主动放弃/暂缓和不可满足硬前置后，得到唯一直接后续。
- `TRACK_CHOICE`：当前轨道结束，返回多个新轨道入口及说明。
- `SELECTED`：当前选择，不等于永久放弃其他轨道。
- `DEFERRED + POINT`：只暂缓一个点；非硬前置时可以跨过继续。
- `DEFERRED + BRANCH`：整条支线暂不推荐，用户可恢复。

推荐入口、学习台、详情下一步和路线参考必须共用同一服务层结果，不能各自排序。
