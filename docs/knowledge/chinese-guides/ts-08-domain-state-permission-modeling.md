# TypeScript 知识点讲义

## TS-08 业务状态与权限类型建模

业务系统的复杂度常来自“哪些状态允许哪些动作、谁能对哪个资源操作、并发变化后结果是否仍有效”。若把这些事实散落成 `isLoading`、`canApprove`、隐藏按钮和字符串 status，非法组合会在运行时出现。TypeScript 可以把状态与命令建模得更明确，但最终授权、并发和幂等仍由服务端执行。

### 学习前先确认

- 直接前置：[TS-07 接口契约、运行时校验与错误模型](../chinese-guides/ts-07-runtime-contracts-validation-error-models.md#ts-07)。本讲假定外部命令和响应已经过运行时解析；联合与穷尽由它的前置递归提供。

### 一、先区分实体、值对象与事件

Entity 由稳定 identity 区分，属性随时间变化；Value Object 由内容决定相等，如 Money、DateRange；Domain Event 描述已经发生且对业务有意义的事实。三者的更新和序列化方式不同。

订单 ID 相同即同一实体，即使状态不同；两份 `{amount:100,currency:'CNY'}` 可表示相等金额值；`OrderApproved` 应包含事件身份、实体 ID、版本与发生时间。不要把所有对象都当可任意展开合并的 DTO。

### 二、品牌类型防止相同原始类型误用

UserId、OrderId 都是 string，结构系统会互相兼容。用 unique symbol brand 建立名义区分：

```ts
declare const orderIdBrand: unique symbol;
type OrderId = string & { readonly [orderIdBrand]: 'OrderId' };
```

品牌只在验证入口创建，如 parseOrderId 检查格式。任意 `raw as OrderId` 会让证明失效。序列化后品牌消失，再进入系统需要重新解析。

品牌不证明数据库存在、租户归属或权限，只防代码层误把一个 ID 传到另一个位置。

### 三、值对象把不变量放在构造边界

Money 不只是 `{amount:number,currency:string}`。要限制有限数、最小单位、币种集合与舍入；构造成功后值保持不可变，通过 add/compare 返回新值。

类、工厂函数或 branded record 都可以，关键是不能绕过入口。前端展示仍注意 locale，服务端计算使用一致精度协议。JSON DTO 与内部 Money 分开转换。

### 四、判别联合排除非法状态组合

请求状态不要用 `isLoading/isError/data` 三个独立字段，可能同时 loading 和有 error。使用判别联合：

```ts
type LoadState<T> =
  | { status: 'idle' }
  | { status: 'loading'; requestId: string }
  | { status: 'success'; data: T }
  | { status: 'error'; error: DataError; stale?: T };
```

每个成员只拥有该状态合法字段。switch 收窄并用 assertNever，新增状态迫使所有消费者处理。

### 五、业务状态与界面状态不要混成一个联合

订单 approved/rejected 是领域状态，页面 modalOpen/selectedTab 是 UI 状态，网络 loading 是异步状态。混成一个巨大笛卡尔联合会难以理解。

按生命周期分层：领域实体保持服务端事实，命令 pending 独立记录，局部 UI 状态留在组件。只在确有不变量时组合，例如提交中禁止再次编辑。

同一页面可显示 stale approved 实体并正在 refresh，这不是非法业务状态。

### 六、状态机由状态、事件、守卫和效果组成

**状态机（State Machine）**定义有限 state、允许 event、guard 与 transition。纯 transition 函数接收当前 state/event，返回下一 state 或拒绝；网络、日志等 effect 在外层执行。

```ts
type ReviewState = 'draft'|'submitted'|'approved'|'rejected'|'archived';
type Action = 'submit'|'approve'|'reject';

const allowed = {
  draft: ['submit'], submitted: ['approve','reject'],
  approved: [], rejected: [], archived: [],
} as const satisfies Record<ReviewState, readonly Action[]>;
```

配置表可以驱动 UI 提示与测试，服务端仍拥有权威 transition。

### 七、状态—动作表不包含全部授权

submitted 允许 approve 只是状态条件。还需主体角色、资源租户/归属、委托范围、风险与当前版本。`canAct(review,user,action)` 需要完整 context。

前端使用同一规则改善按钮状态，但不能作为安全边界。攻击者可修改 JS 或直接发请求，服务端重新读取当前实体并执行 guard。

### 八、RBAC、ABAC 与关系授权表达不同维度

RBAC 按角色赋权限，简单但容易产生 role explosion；ABAC 使用主体、资源、动作、环境属性；关系授权表达 owner/member/parent 等图关系。产品可组合，不应把所有规则压进 `role:'admin'`。

TypeScript 类型能限制 action 名和 context 形状，不能计算远端最新组织关系。**授权（Authorization）**引擎返回 allow/deny 与受控 reason，默认拒绝未知动作。

### 九、能力对象比散落布尔值更可追踪

服务端可返回针对当前资源的 allowedActions/permissions version，前端用于呈现。它是快照，不是授权凭据；提交时服务端重算。

能力对象包含 resourceId、revision 与动作集合，账号或资源变化立即失效。不要把 `canApprove:true` 持久存储后长期复用。

### 十、命令与事件不能混淆

Command 表示希望执行的意图，可能被拒绝，如 ApproveReview；Event 表示已经发生，如 ReviewApproved。把命令命名成事件会让客户端误以为发送即成功。

命令包含 commandId/idempotencyKey、resourceId、expectedVersion 和明确 payload。事件包含 eventId、aggregateVersion、occurredAt 与事实数据。UI 只有收到权威成功才提交领域状态。

### 十一、乐观并发阻止陈旧覆盖

**乐观并发控制（Optimistic Concurrency Control）**让客户端提交已读 expectedVersion，服务端在事务中比较当前版本；不匹配返回 conflict，不覆盖他人更新。

ETag/If-Match 可用于 HTTP 资源，领域命令可携带 revision。冲突 UI 重新取最新、展示差异并让用户重做决定；不能自动用旧输入覆盖。

版本检查与授权都在最新服务端数据上执行，顺序和事务边界要明确。

### 十二、幂等键处理网络重放

客户端为一次业务意图生成稳定 key，服务端按用户/操作作用域原子保存 processing/completed 和参数摘要。相同 key+相同参数返回同一结果，不同参数拒绝。

幂等防重复执行，不防陈旧版本、越权或 CSRF。它与 expectedVersion 同时存在：一个回答“是不是同一次意图”，一个回答“基于哪个实体版本”。

### 十三、状态转换要 fail closed

未知 state/action、缺少 context、schema 版本过新都拒绝高风险命令。不要把未知状态映射 draft 或把未知角色当普通用户后仍允许默认动作。

读取界面可以受控降级并提示升级，写入则禁用并重新获取。拒绝 code 稳定，详细 policy 信息不向无权用户泄露。

### 十四、时间是领域数据而非 Date.now 到处调用

截止、冷却、审批窗口和租约依赖时间。把 Clock 作为服务依赖，测试传固定 instant；服务端权威时间决定授权，客户端时间只用于显示和提前提示。

保存 instant 与明确时区/日历规则，避免本地字符串和夏令时错误。过期命令在服务端检查，不因用户改系统时间绕过。

### 十五、派生状态不要重复持久化

`canApprove` 可由 state、role、ownership、version 派生，通常不与实体一起持久化；否则源字段变化会漂移。需要缓存时带依赖 revision 和失效协议。

UI selector 可集中派生，服务端 policy 是权威实现。跨语言无法真正共享一段 TS 函数时，共享 policy 表/schema 与契约测试，不伪装“单一代码”。

### 十六、状态机与数据库事务相连

服务端处理命令：解析→认证→加载最新实体→授权/guard→版本检查→生成新状态和事件→原子保存→记录幂等结果。任一步失败不产生半状态。

外部消息发布可用 transactional outbox，避免数据库已提交但事件丢失；消费者按 eventId 幂等。前端类型只是这一协议的客户端视图。

### 十七、Saga 与补偿处理跨系统长事务

付款、库存、通知跨服务无法用单数据库事务时，以 saga/状态机记录每步、重试和补偿。补偿不是“反向函数”保证恢复原状，可能需要人工处理。

前端展示 pending/confirmed/failed/requires-action，不在首次 202 后显示最终成功。命令查询返回权威进度。

### 十八、权限变化与进行中操作

用户打开页面后角色可能撤销。按钮快照仍显示可用，提交时服务端拒绝。UI 收到 forbidden 后清理敏感缓存、更新能力并解释“权限已变化”，不无限重试。

长编辑可保留本地草稿但不能泄露已无权数据；产品定义是否允许导出。WebSocket 权限也要在订阅与每类消息边界检查。

### 十九、审计记录事实而不是前端文案

高风险操作记录 actor、subject/resource、action、前后版本、decision、policyVersion、requestId 与时间，不记录秘密或整份敏感对象。拒绝也可按风险采样审计。

审计事件由服务端产生，不信客户端 `actorId` 或按钮名称。日志不可随普通业务修改，留存与访问受治理。

### 二十、建模演进需要向前兼容

新增 archived 状态后，旧 UI 不能当 draft；显示未知状态并禁用动作。服务端状态迁移、API schema、事件消费者与数据回填按版本发布。

删除状态要处理历史记录和审计，不只从联合移除。状态机图和 decision table 从可执行配置生成或由测试校对。

### 二十一、测试状态空间而非几个示例

对每个 state×action×role/owner 组合生成 decision table，断言允许与拒绝；property test 验证没有非法跃迁；mutation test 删除 guard 应导致失败。并发测试让 version 3/4 竞争，只有一个成功。

端到端验证隐藏按钮后直调仍拒绝、幂等重放不重复、权限撤销后旧页面失败、未知状态降级。保存服务端状态和事件，不只截图。

### 二十二、AI 生成代码不能绕过状态模型

AI 助手可能建议新动作或填充命令，输出仍是 unknown，经 schema、用户确认、授权、版本和幂等协议。自然语言“批准全部”不能直接转成循环请求。

把允许 action schema、影响预览和确认边界提供给工具；审计记录模型建议与人类批准，但最终服务端决定不依赖模型自述。

### 二十三、何时使用专用状态机或授权引擎

少量状态可用判别联合和纯函数；并发层次、定时器、并行状态和可视化复杂时考虑成熟 state machine 库。跨服务、关系图和审计要求高时使用专用授权引擎。

工具增加运行时、学习和迁移成本。选择前确认能否导出决策证据、版本化 policy、失败关闭和本地测试，避免把核心规则藏进不可审查配置。

### 学完后应能说明

你应能区分实体、值对象、命令与事件，用品牌 ID、判别联合和状态—动作表排除非法组合；能说明前端能力快照为何不是授权，服务端如何结合主体、资源、版本和事务重判；还能设计乐观并发、幂等、审计、未知状态演进与完整状态空间测试。
