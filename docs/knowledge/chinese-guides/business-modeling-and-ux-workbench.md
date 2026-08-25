# 业务建模与体验验证工程讲义

这份讲义面向已经会写基础 TypeScript 和 React 页面、但还不熟悉复杂业务工程的初级前端。九节都围绕固定 fixture 展开：先建立业务事实，再说明前端如何映射，最后用可复跑的失败实验验收。讲义不会要求先掌握微服务框架、形式化方法或研究统计学；这些超纲概念只解释它们在本题中的最小含义。

> 术语约定：首次出现时同时写中文与英文原名。`Entity（实体）`、`Value Object（值对象）`、`Aggregate（聚合）` 属于领域建模；`Guard（守卫）` 和 `Invariant（不变量）` 属于状态规则；`DTO（Data Transfer Object，数据传输对象）` 属于接口边界；`Usability Test（可用性测试）` 属于体验证据。记住职责比背缩写更重要。

## BIZ-01

### 先分清“是谁”“是什么”和“谁守住规则”

`Entity（实体）` 由稳定身份区分，即使属性变化仍是同一个对象；`Value Object（值对象）` 没有独立身份，只按一组值判断相等；`Aggregate（聚合）` 是一次业务命令必须保持一致的一组对象，`Aggregate Root（聚合根）` 是修改这组对象的唯一入口。固定题例中，`Course c1`、`Student s1/s2` 和每一条 `Enrollment` 都有身份，所以是实体；“人民币 100 元”这类金额可以按币种和数值比较，是值对象；课程容量是 `Course` 聚合的不变量，不能由 `CourseCard` 或 `EnrollDialog` 私自扣减。

`Ubiquitous Language（统一语言）` 的意思是需求、接口、类型、页面和测试对同一概念使用同一个可解释名称。这里必须明确：`ENROLLED` 是“已录取”，`WAITLIST` 是“候补”，两者不能被一句 truthy 判断都翻成“报名成功”。DTO 中的 `status` 只是传输字段，页面文案是展示模型；它们必须经过唯一映射器：

```ts
type EnrollmentStatus = 'ENROLLED' | 'WAITLIST';

function toEnrollmentView(status: EnrollmentStatus) {
  return status === 'ENROLLED'
    ? { label: '已录取', canPay: true }
    : { label: '候补中', canPay: false };
}
```

### 固定流程、反例和验证

用 `Course{ id:'c1', capacity:1 }`、`Student{s1,s2}` 连续执行两次 enroll。聚合根先检查当前有效名额：s1 得到 `ENROLLED`，s2 得到 `WAITLIST`，并各自产生一条有身份和时间的 Enrollment。错误实现有三种：把 Enrollment 扁平成 `Course.students[]` 后丢失候补过程；让对话框先减容量，造成两处事实；把任何非空 status 当成功，造成候补误报。

验收必须同时提交对象关系图、术语表、DTO→展示模型转换器和 `Course.enroll` 测试。把 capacity 由 1 改为 2 后，只有 s2 的结果变为 `ENROLLED`；术语和 mapper 不应改动。若一个页面仍直接读取 DTO、术语表无法被业务人员读懂，或第二次请求能绕过 Course 修改容量，就说明模型没有建立。`Bounded Context（限界上下文）` 是超纲词，在本题只理解为“同一个词在哪一块业务里采用这一套明确含义”，不要求设计微服务。

## BIZ-02

### 状态不是若干布尔值，事件也不是任意赋值

**适用场景与固定实验。**状态机适用于订单、审批、导入任务等状态有限、合法操作随状态变化的生命周期；连续数值计算或一次性 UI 开关不适合硬套状态机。本节固定实验使用订单 o7、过期时间 10:00 和重复回调 k9，所有机制都用同一事件文件重放。

`State Machine（状态机）` 用有限状态、事件和合法转移描述一个对象现在处于哪里、下一步允许发生什么。`Event（事件）` 是已经发生的事实输入，`Command（命令）` 是请求系统做某事，`Guard（守卫）` 是转移前必须满足的条件，`Invariant（不变量）` 是任何合法转移完成后都必须继续成立的事实。订单存在 `DRAFT → SUBMITTED → APPROVED`，以及终态 `REVOKED/EXPIRED`；这比 `isApproved/isExpired/isRevoked` 三个可能同时为真的布尔值更可验证。

固定事件为 `submit→approve→expire→paymentCallback(k9)×2`。题目约定过期判断先于迟到回调，`EXPIRED` 是终态。处理入口必须先读取当前状态和版本，再检查终态守卫与事件是否允许，最后在同一个原子步骤记录新状态、事件和幂等键。回调成功到达只说明消息抵达，不表示它有权把历史状态改回 `APPROVED`：

```ts
function transition(state: State, event: Event): State {
  if (state === 'EXPIRED' || state === 'REVOKED') return state;
  if (event.type === 'PAYMENT_CALLBACK' && seen(event.key)) return state;
  // 只执行状态图列出的合法边
  return table[state]?.[event.type]?.(event) ?? state;
}
```

### 并发、补偿、演进和证据

两条命令同时读取旧版本时，只有一个条件更新能成功，另一个得到冲突并基于最新状态重新决定；不能“最后写入者获胜”静默覆盖。`Compensation（补偿）` 是在外部副作用已经发生后用另一条可审计动作纠正结果，不是删除历史或回写一个看似顺眼的旧状态。新增 `APPROVED→APPEALING` 时，先补转移表和 24 小时守卫，再同步 API 枚举、前端未知值降级和测试；老客户端读到未知状态只能显示“状态待确认”，不能当完成。

验证时输出每一步 `event/current/guard/next/version` 的 trace，参数化覆盖所有合法边和非法边，并重放重复 k9、过期与回调乱序、并发 approve/revoke。预期最终始终为 `EXPIRED`，第二个 k9 不产生副作用。`Statechart（状态图）` 的层级、并行状态是扩展能力，本题只要求理解它们能压缩复杂状态组合；不要求实现 SCXML 解释器或绑定 XState 框架。若只画图却没有拒绝后的“对象未改变”断言，也不算掌握。

## BIZ-03

### RBAC 决定角色能力，ABAC 收窄到具体数据

`RBAC（Role-Based Access Control，基于角色的访问控制）` 把资源动作授予角色，再把角色授予用户，适合 teacher、auditor 等稳定岗位。`ABAC（Attribute-Based Access Control，基于属性的访问控制）` 根据主体、资源、动作和环境属性判断，适合“仅本校、仅本班、代班 30 分钟”。先列资源和动作，例如 `grade:read`、`report:export`、`grade:edit`，再列 `tenantId/classId/ownerId/delegateUntil` 等数据属性。任何规则没有明确允许时采用 `Deny by Default（默认拒绝）`。

前端的菜单、路由、按钮和字段可见性只是体验层提示，不能作为安全边界。服务端必须从已验证会话取得 user 与 tenant，不能相信查询参数传来的角色或学校；列表查询强制加数据范围，详情、导出、批量操作和写入再次授权。固定 fixture 中，school-a 的 auditor a9 请求 school-b 的 grade g2 必须返回 403，即使手工显示了导出按钮也一样拒绝。

```ts
function canReadGrade(ctx: AuthContext, grade: Grade) {
  if (ctx.tenantId !== grade.tenantId) return false;
  if (ctx.roles.includes('auditor')) return true;
  return ctx.roles.includes('teacher') && ctx.classIds.includes(grade.classId);
}
```

### 缓存、失效、反例和验证

权限快照的缓存键至少包含用户、租户、策略版本，代班属性还要包含到期语义。`cacheKey=role:auditor` 会让不同学校共用决定，是明确反例。角色撤回或代班到期后，原子替换前端快照并失效服务端授权缓存；旧标签页直接发送请求仍应被服务端拒绝。排错只比较三项：请求上下文是否缺 tenant/class、授权入口是否只在前端、缓存键是否缺策略版本或租户。

交付角色—资源—动作—属性矩阵、前端可见性函数和服务端断言；保存 200/403、策略版本和请求关联 ID。代班窗口到期前 200、到期后 403，且过期缓存不能继续放行。`Authentication（身份认证）` 回答“你是谁”，`Authorization（授权）` 回答“已知你是谁后能做什么”；本题只考后者，不要求实现 OAuth/OIDC。`Policy Engine（策略引擎）` 也属超纲实现，不要求引入，先用可测试的纯函数表达规则。

## BIZ-04

### 契约不仅是字段类型，而是业务承诺

**适用场景、机制流程与固定实验。**当多个页面或客户端共享接口，且空值、枚举、错误或版本会演进时，需要显式契约和防腐层；封闭的一次性静态展示可以保持简单。本节固定实验把同一 progress/status 输入依次送进 DTO 校验、领域解释和 UI 映射，再用缺失、null、0、未知枚举与流尾错误观察每一层产物。

`API Contract（接口契约）` 规定操作、输入、成功、业务拒绝、暂时失败、未知结果和版本兼容语义。`DTO（Data Transfer Object，数据传输对象）` 只是网络传输形状；`Domain Model（领域模型）` 承载业务含义；`UI Model（界面模型）` 决定用户看到的文案和可操作性。三者之间的唯一映射层常被称为 `Anti-Corruption Layer（防腐层）`：它防止服务端字段名、协议默认值和未知枚举直接污染所有页面。

固定输入包含 `{progress:null,status:'PAUSED'}`、缺失 progress、未知 `BLOCKED`，以及流尾错误 `RESOURCE_EXHAUSTED`。缺失表示旧服务没提供，`null` 表示服务明确告知“当前未知”，0 表示真实零进度，不能互换。未知枚举不能兜底为成功，应保留原值并生成可行动的“状态待确认”；传输层资源耗尽表示 RPC 没有完整成功，不能等同业务完成。

```ts
type ProgressView =
  | { kind: 'known'; percent: number }
  | { kind: 'unknown'; reason: 'NULL' | 'MISSING' };

function mapProgress(dto: { progress?: number | null }): ProgressView {
  if (!Object.hasOwn(dto, 'progress')) return { kind: 'unknown', reason: 'MISSING' };
  return dto.progress === null
    ? { kind: 'unknown', reason: 'NULL' }
    : { kind: 'known', percent: dto.progress };
}
```

### 协议选择、失败边界和验证

普通浏览器查询/命令优先清晰的 HTTP+JSON；需要强类型、多语言内部调用且已有代理设施时才评估 `gRPC-Web（面向浏览器的 gRPC 变体）`；异步消息适合解耦长任务通知，但必须另有查询恢复。`Protocol Buffers（协议缓冲区）` 的字段编号、默认零值和未知字段属于协议演进细节；在本题只需知道“协议默认值不自动等于业务默认值”。OpenAPI/JSON Schema 的解析和代码生成归 API-01/02，多消费者发布门禁归 TEST-04，本节不要求通读或实现这些规范。

交付操作合同、协议选型表、唯一 mapper 和四类值测试。页面禁止直接 import DTO；新响应增加 `eta` 时，旧 UI 可忽略，但删除旧 `reason` 后仍不得误报完成。失败日志必须能区分校验失败、业务拒绝、传输错误和未知结果，并保留关联 ID 与脱敏后的响应类别。若只用 TypeScript `as` 强转、把 HTTP 200 当业务成功，或把新枚举显示成完成，就没有建立契约边界。

## BIZ-05

### 一个服务端事实，多种页面投影

**适用场景与机制流程。**当同一实体同时出现在新建、列表、详情、编辑或草稿中，尤其存在后台刷新和并发保存时，应采用“确认快照→本地草稿→带版本提交→服务端确认或冲突恢复”的流程；单页只读展示无需引入完整草稿机制。

同一对象在列表、详情、编辑表单和本地草稿中形状可以不同，但业务事实必须来自同一已确认服务端快照。进入编辑时保存 `baseline（基线快照）+ version（版本）`，用户输入只改 `draft（草稿）` 并设置 `dirty（脏标记）`。列表与详情是从确认对象派生的 `Projection（投影）`；格式化金额、日期和标签不能反向当作保存 DTO。

固定对象是 `amount:0, eligible:false, note:'', version`。0 是有效金额，false 是有效资格结论，空串是用户明确留空，字段缺失与 `null` 也不同。`value || '—'` 会同时吞掉 0、false 和空串，是本题的核心反例。应使用共享映射器和空值策略，让四个页面得到一致语义。

保存携带版本条件。成功后以服务端返回的新对象为准，按 ID 更新列表、详情与表单基线并只清除对应草稿；若响应只是局部字段，则使完整查询失效并重读，不能用不完整对象覆盖详情。后台刷新到达时，未提交的脏字段不能被覆盖。

### 冲突恢复与可复跑证据

当服务端返回 409/412 和 `version:4`，保留用户草稿、旧基线与最新服务端对象，显示冲突字段，让用户选择重新加载、逐字段合并或放弃；不能静默“最后写入覆盖”。撤销恢复到最近一次确认快照，部分保存要分别标记成功字段和仍待提交字段。`Optimistic Concurrency Control（乐观并发控制）` 是超纲词，在这里仅指“提交时带上读到的版本，版本不相同就拒绝覆盖”。

用同一 fixture 驱动 List/Detail/Edit/Draft，断言 0、false、空串、缺失和 null；注入慢响应、双标签编辑、422、409、网络超时未知结果和权限撤回。证据包括初始快照、请求版本、响应、缓存变化、最终 UI 与草稿是否保存。若四页复制四套 formatter、保存失败后输入消失，或旧响应能把新版本回滚，即不通过。

## BIZ-06

### 浏览器请求与服务端任务是两条生命周期

长任务通常先创建并返回稳定 `taskId`，随后查询或订阅进度，终态后领取结果。至少区分 `QUEUED（排队）`、`RUNNING（执行）`、`SUCCEEDED（成功）`、`FAILED（失败）`、`CANCELLED（取消）`、`EXPIRED（结果过期）`；`202 Accepted（已接受）` 只表示服务器接收了请求，不代表完成。进度没有可靠分母时展示“不确定进度”，不能伪造 80%。

轮询从短间隔开始并指数退避，加入抖动避免大量客户端同时请求；进入终态立即停止。刷新后从 session 中恢复 `taskId` 并查询同一任务，重复点击用同一业务键避免创建第二个任务。成功领取采用短期 token，遇到 410 表示结果凭证过期，应提供“重新领取”而不是继续下载旧地址。

`AbortController（中止控制器）` 发出的 `AbortSignal（中止信号）` 只能取消当前浏览器 fetch 或流读取，不会自动回滚服务端任务。要取消业务任务，必须调用明确的 cancel 命令并再次查询服务端最终状态；取消与完成竞争时，事实以服务端记录为准。

### 固定失败实验与验收

对 t1 重放 `QUEUED→RUNNING(80)→SUCCEEDED`，用 fake timer 记录每次轮询间隔。故障版在 SUCCEEDED 后仍每秒轮询、页面重开又创建 t2，并把 Abort 当作任务已取消；修复后应只创建一次 t1、终态零额外请求、刷新查询同一 t1。断网两分钟后继续退避，恢复时先查询，不重复提交。部分成功必须保留成功行，同时提供错误行文件。

证据包含状态表、taskId 时间线、请求计数、session 恢复、410、断网和取消竞态结果。`Push（推送）` 可减少轮询，但断线后仍需以 taskId 查询恢复；本题不要求实现消息队列、SSE 或 WebSocket 服务端。若同步等待长 HTTP、固定一秒无限轮询、收到 202 就提示完成，或 Abort 后直接删掉任务 UI，都不通过。

## BIZ-07

### 超时是未知结果，幂等保护同一次意图

`Idempotency（幂等）` 表示同一次业务意图重复抵达不会产生额外业务效果，不表示每次 HTTP 响应文本完全相同。客户端为一次付款意图生成 `Idempotency-Key: k1`，重试沿用 k1；服务端原子保存 key、用户、请求摘要、结果和有效期。同键同载荷返回已保存结果，同键不同载荷拒绝。504 只说明客户端没有按时收到结果，不能推断扣款失败或成功，应查询 k1 的账本状态。

`ETag（实体标签）` 表示资源版本，写入时携带 `If-Match: v3`；服务端当前为 v4 时返回 `412 Precondition Failed（前置条件失败）`，客户端进入冲突恢复。ETag 解决并发版本覆盖，幂等键解决同一写意图的重复执行，两者不能互相替代。`Eventual Consistency（最终一致性）` 允许短暂不同步，但必须有可观察状态、截止时间、查询和补偿入口。

```ts
async function recoverPayment(intent: PaymentIntent) {
  const known = await queryByKey(intent.key);
  if (known) return known;
  return retrySameIntent(intent); // key 和请求摘要保持不变
}
```

### 补偿、反例和三方轨迹

`Compensation（补偿）` 是原副作用已经发生后执行另一条可审计业务动作，例如退款；补偿首响 503 不代表原扣款不存在，也不能换新 key 重复退款。明确区分：可重试的读取/幂等写、不可重试的业务拒绝、412 冲突、504 未知结果、需要人工介入的补偿失败。按钮禁用只改善体验，服务端唯一约束和幂等记录才防止多标签、代理重试和消息重复。

固定日志为 `POST /pay k1 504; ledger k1=SETTLED; UI=retry charge`。先用账本查询证明已入账，再用相同 k1 重放证明不新增记录；另测漏传 If-Match 得到的并发覆盖。交付请求—账本—UI 三方时间线、失败模式表、用户文案和补偿记录。若 504 后直接显示失败并生成新 key、HTTP 200 就当业务成功、或 412 后静默覆盖 v4，均不通过。

## UX-01

### 从用户任务和八类状态出发

**适用场景与固定实验。**复杂导入、审批和配置等有分支、错误恢复或高误操作成本的流程，适合做完整状态设计与可用性测试；纯品牌展示不应套用本节八态。本节固定实验使用第 8/11 行失败的 CSV、统一任务脚本和两轮目标用户观察。

`Interaction Design（交互设计）` 先明确用户目标、上下文、入口、决策、反馈和恢复，再组织页面。固定任务是“找到第 8 行失败数据，修正并重新提交”；至少设计默认、加载、空、成功、错误、离线、权限不足、部分完成八类状态。每一态都回答：发生了什么、已有成果是否保留、下一步能做什么、焦点应该去哪里。

`Information Architecture（信息架构）` 是内容与入口的组织方式；`Progressive Disclosure（渐进披露）` 是先展示当前任务所需信息，需要时再展开细节；`Cognitive Load（认知负荷）` 是用户为理解和操作付出的注意力。本题只要求用任务流和观察减少不必要选择，不要求学习心理学理论。部分成功应保留成功行，并把第 8/11 行错误聚成可跳转摘要；“重新导入”和“修正后重新提交”不能合成含义模糊的按钮。

破坏性操作根据可恢复性选择确认或 `Undo（撤销）`：不可逆、影响大且低频才先确认；可快速恢复的频繁操作优先撤销。错误文案写清问题、影响、保留内容和下一步，不只写“失败”。动效遵守 `prefers-reduced-motion（减少动态效果偏好）`，关键信息不能只靠颜色或 hover。

### 可用性验证不是偏好投票

`Usability Test（可用性测试）` 给目标用户完成代表任务，观察实际行为。用固定 CSV 和同一脚本招募 3 名目标用户，逐人记录是否完成、用时、错误、求助、卡点和原话；3 人只能发现问题，不能宣称统计普遍性。问题按“阻断任务、造成严重错误、明显拖慢、轻微困惑”标严重度，只修改有证据支持的项，再用同类用户和同一任务复测。

键盘脚本为 `Tab→错误摘要→第 8 行→修正→重新提交`，对话框关闭后焦点回到触发点，提交失败后焦点进入错误摘要，读屏读出失败行数。再在 200% 缩放、窄屏、离线和 reduced-motion 下复跑。交付八态原型、原始观察、两轮完成率/错误数、焦点日志和修复前后录屏。漂亮截图、AI 自评或询问“喜欢吗”都不是任务证据；无障碍是体验底线，但 UX-01 不替代独立的 WCAG 系统学习。

## BIZ-08

### 建立能双向反查的交付链

`Traceability（可追踪性）` 把需求、业务规则、设计决定、接口/页面实现、测试和验收证据用稳定关系连起来。每条可验收规则分配 ID，例如 `APR-EXP-07` 表示审批 7 天失效；从规则能找到代码、测试和验收，从一次失败测试也能反查它保护哪条规则。Issue、PR 和文档只是载体，链接数量不能替代关系含义。

固定规则包含导师审批、7 天失效、拒绝原因和自 `2026-08-01T09:00Z` 起 48 小时代班。矩阵至少记录 `规则 ID / 来源 / 正例 / 反例 / API 守卫 / 页面反馈 / 测试 / 验收证据 / owner / 状态`。冻结时间后，代班在 `2026-08-03T09:00Z` 到期，直接 API 必须 403；只在页面禁用按钮不构成验收。

```md
| Rule | API | UI | Test | Evidence |
| APR-DELEGATE-48H | approve.guard.ts | ApproveButton | approval.test.ts | run-20260825.json |
```

### 需求变更、歧义和验证

需求改为“仅合规命中时拒绝原因必填”时，先写 `ADR（Architecture Decision Record，架构决策记录）` 保存歧义、备选解释和决定，再列影响清单：状态规则、接口校验、页面文案、测试数据、验收步骤和已发布行为。所有受影响位置引用同一规则 ID；不受影响的失效与代班规则也要回归，防止修改校验时破坏授权。

`Forward Trace（正向追踪）` 从需求到实现和验收，`Backward Trace（反向追踪）` 从代码/缺陷/测试回到规则来源。交付可检索矩阵、固定时间测试、API 403/200、页面状态和验收记录；随机指出任一规则时，复核者应在几分钟内找到完整链。只有 Issue 标题、PR 写“已完成”、测试写“覆盖需求”却没有规则 ID，或者变更代码后不更新影响清单，均不通过。本题不要求采购 ALM 平台或实现图数据库，Markdown 表和代码引用已经足够。

## 超纲术语的最小地图

| 原名与中文 | 在本讲义中的最小含义 | 本轮不要求 |
| --- | --- | --- |
| Bounded Context（限界上下文） | 同一术语在某块业务内采用一套明确含义 | 拆微服务、事件风暴全流程 |
| Statechart（状态图） | 能表达层级与并行状态的扩展状态机 | SCXML 解释器、形式化证明 |
| Anti-Corruption Layer（防腐层） | DTO 到稳定业务/UI 模型的唯一映射边界 | 企业集成模式全书 |
| Optimistic Concurrency Control（乐观并发控制） | 写入时比较版本，不一致就拒绝覆盖 | 数据库隔离级别推导 |
| Eventual Consistency（最终一致性） | 允许短暂不同步，但必须可观察、可恢复 | 分布式共识算法 |
| Usability Test（可用性测试） | 让目标用户完成任务并记录行为证据 | 统计显著性研究设计 |
| Traceability（可追踪性） | 需求、规则、实现、测试、验收可双向反查 | 专用 ALM 平台治理 |
