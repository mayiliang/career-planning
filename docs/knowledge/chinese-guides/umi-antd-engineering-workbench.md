# Umi / Ant Design 中后台工程讲义

适用范围：`UMI-01`—`UMI-04`、`ANTD-01`—`ANTD-04`。本讲义不是 API 大全；它只解释站内挑战需要的机制、固定输入、失败边界和验证方法。代码中的服务端授权、文件上传和导出任务是教学接口，生产实现仍需后端共同评审。

阅读方法：先看每节的“固定场景”，再按“机制→实现→失败→证据”完成练习。英文术语第一次出现时保留原名并给出中文解释；无需背诵 API 表。

---

## UMI-01

**主题：路由、布局与页面生命周期**

### 1.1 从深链请求开始理解路由

route（路由）是“URL 条件到页面树”的映射；layout（布局）是页面树中复用的外壳；deep link（深链）是用户直接打开某个内部 URL，而不是先进入首页再点击菜单。

固定场景：应用部署在 `/console`，必须处理：

- `/console/orders/42`：订单详情；
- `/console/orders/not-a-number`：参数错误；
- `/console/legacy-orders/42`：迁移到新地址并保留 `42`；
- `/console/login`：不显示后台布局；
- 其他地址：明确 404。

深链的完整链路不是“React Router 匹配”一件事：

```text
浏览器 GET /console/orders/42
  -> Web 服务器识别 /console 前缀并返回同一应用入口
  -> Umi 用 base=/console 得到相对 pathname=/orders/42
  -> 路由匹配与参数校验
  -> 外层布局挂载，子页面通过 Outlet 呈现
  -> 页面拆包与数据请求
  -> 切换子路由时复用布局，离开布局树时才卸载
```

静态服务器没有 SPA fallback（单页应用回退）时，刷新会在 React 运行前就返回 404；只测菜单点击无法证明深链可用。SSR（Server-Side Rendering，服务端渲染）则要让服务端和客户端使用同一个 `base` 与路由结论，否则 hydration（水合：客户端接管服务端 HTML）会不一致。

### 1.2 精确路由表示例

```ts
export default {
  base: '/console',
  routes: [
    { path: '/login', component: '@/pages/login', layout: false },
    {
      path: '/',
      component: '@/layouts/admin',
      routes: [
        { path: '/orders/:id', component: '@/pages/orders/detail' },
        { path: '/legacy-orders/:id', component: '@/pages/orders/legacy' },
        { path: '/*', component: '@/pages/404' },
      ],
    },
  ],
}
```

Umi 4 文档的 `path` 只支持 `:id` 与末尾 `*`，不支持 `:id?` 或正则片段。若业务需要“有 ID / 无 ID”两种页面，应写两条清楚的路由，再在页面入口做运行时参数校验；不能假装可选参数语法已经生效。

```ts
function parseOrderId(raw: string | undefined) {
  if (!raw || !/^\d+$/.test(raw)) return { ok: false as const, code: 'INVALID_ID' }
  return { ok: true as const, id: Number(raw) }
}
```

菜单是路由的 navigation projection（导航投影），不是路由真相。旧菜单仍跳 `/legacy-orders/42` 时，即使迁移页工作也应更新菜单；迁移页要记录命中并保留 ID，不能一律跳首页。

### 1.3 失败注入与验证

只比较四个候选：`base`、匹配顺序、服务器回退、菜单配置。不要同时改路由库、代理和权限。

| 操作 | 应保存的证据 | 正确结果 |
| --- | --- | --- |
| 地址栏直接打开并刷新 `/console/orders/42` | request URL、HTTP 状态、DOM | 入口返回成功，订单 42 出现 |
| 打开 `not-a-number` | 参数日志、局部 DOM | 明确参数错误，不误当 404 |
| 打开旧地址 | 迁移前后 URL | ID 保留，history 行为有说明 |
| 前进/后退 | 地址与页面录像 | 地址和内容一致 |
| 改 `base` 为 `/ops` | 新旧地址网络记录 | `/ops` 成功，旧前缀明确失败或迁移 |

---

## UMI-02

**主题：initialState（初始状态）、运行时配置与应用初始化**

### 2.1 `getInitialState` 的真实职责

Umi 的 `getInitialState()` 在应用最开始创建一份全局初始状态；首次完成前，其他页面渲染会被阻止。`useModel('@@initialState')` 提供 `initialState`、`loading`、`error`、`refresh` 和 `setInitialState`。它适合会话主体、权限快照和启动配置，不适合保存每个列表、草稿或任意页面缓存。

建议把状态定义成可穷举联合：

```ts
type BootstrapState =
  | { status: 'loading'; generation: number }
  | { status: 'anonymous'; generation: number }
  | { status: 'ready'; generation: number; user: User; permissions: string[] }
  | { status: 'recoverable-error'; generation: number; message: string }
```

runtime config（运行时配置）是浏览器端 `src/app.tsx` 的扩展点；可以定义函数、TSX 和浏览器依赖，不能导入 Node 专用依赖。`layout`、`request` 等消费者应读取同一份已裁决状态，不要各自再请求 `/me`。

### 2.2 A/B 账号竞态的固定机制

固定时间线：A 的 `/me` 在 0ms 发出、300ms 返回；50ms 退出并登录 B；B 请求在 50ms 发出、100ms 返回。最终只允许 B 提交。

```ts
let generation = 0
let activeController: AbortController | undefined

export async function loadSession(token: string | null): Promise<BootstrapState> {
  const mine = ++generation
  activeController?.abort('session-replaced')
  activeController = new AbortController()

  if (!token) return { status: 'anonymous', generation: mine }

  try {
    const user = await fetchMe(token, activeController.signal)
    if (mine !== generation) throw new DOMException('stale generation', 'AbortError')
    return {
      status: 'ready',
      generation: mine,
      user,
      permissions: derivePermissions(user),
    }
  } catch (error) {
    if (mine !== generation || (error as Error).name === 'AbortError') throw error
    if (isUnauthorized(error)) return { status: 'anonymous', generation: mine }
    return { status: 'recoverable-error', generation: mine, message: '初始化失败，可重试' }
  }
}
```

AbortController（中止控制器）尽量停止旧请求，generation（代次）阻止无法真正取消的旧回调写入；两者职责不同。401 要清理无效凭证并只导航一次；网络错误要显示可恢复壳，不应白屏。

### 2.3 SSR 与恢复边界

服务端不能读取 `localStorage`，只能从当前请求的 Cookie/Header 获得可验证会话。它可以安全序列化“主体 ID、公开展示信息、权限版本”等最小快照；客户端 hydration 后仍要按过期策略复核。不得把访问令牌或敏感权限规则嵌入 HTML。

SSR snapshot（服务端快照）与浏览器旧缓存冲突时，先渲染服务端本次请求裁决的状态；浏览器缓存只能当恢复提示，不能覆盖新会话。若必须等待复核，显示稳定骨架，不先闪现敏感菜单。

### 2.4 固定验收

- A 300ms、B 50ms：日志出现 `discard generation A`，最终 DOM 只含 B。
- `/me` 401：只清理一次凭证、只跳登录一次、没有敏感菜单闪现。
- B 首次网络失败、重试成功：先出现可恢复错误，重试后只提交 B。
- 匿名/有效/过期三种 SSR：保存 HTTP 状态、初始快照和 hydration 后 DOM。

race condition（竞态条件）表示结果依赖不可控的完成顺序；generation token（代次令牌）是用于拒绝旧结果的递增标识，不是权限令牌。

---

## UMI-03

**主题：请求层、错误处理与取消**

### 3.1 四层成功与六类失败

“HTTP 200”只说明传输层收到响应，不代表业务成功、响应结构可信或 UI 可提交。统一请求层应按以下顺序处理：

```text
配置/认证/关联 ID
  -> request interceptor（请求拦截器）
  -> HTTP response
  -> response shape（响应形状）校验
  -> 业务 code/HTTP/取消/离线分类
  -> 唯一责任方呈现 UI
```

```ts
type ApiResult<T> =
  | { ok: true; data: T; requestId: string }
  | { ok: false; kind: 'field'; fields: Record<string, string>; requestId: string }
  | { ok: false; kind: 'unauthorized' | 'forbidden' | 'server' | 'offline'; requestId: string }
  | { ok: false; kind: 'cancelled'; requestId: string }

function isEntity(value: unknown): value is { id: number } {
  return typeof value === 'object' && value !== null
    && typeof (value as { id?: unknown }).id === 'number'
}
```

Umi Request 提供全局配置、`errorThrower/errorHandler`、请求/响应拦截器和 `signal`。站内约定：全局层处理会话失效与不可恢复的系统反馈；页面层处理字段错误和当前任务的恢复；同一个错误只能有一个 UI 责任方。

### 3.2 固定 service 最小实现

```ts
async function loadEntity(signal: AbortSignal): Promise<ApiResult<{ id: number }>> {
  const requestId = crypto.randomUUID()
  try {
    const raw: unknown = await request('/api/entity', {
      signal,
      headers: { 'x-request-id': requestId },
      skipErrorHandler: true,
    })
    if (!isApiEnvelope(raw)) return { ok: false, kind: 'server', requestId }
    if (raw.code === 0 && isEntity(raw.data)) return { ok: true, data: raw.data, requestId }
    if (raw.code === 422) return { ok: false, kind: 'field', fields: normalizeFields(raw), requestId }
    return mapBusinessFailure(raw, requestId)
  } catch (error) {
    if ((error as Error).name === 'AbortError') return { ok: false, kind: 'cancelled', requestId }
    if (!navigator.onLine) return { ok: false, kind: 'offline', requestId }
    return mapHttpFailure(error, requestId)
  }
}
```

取消代表“调用方不再等待并尝试终止工作”，不保证服务器没有执行。GET 搜索可取消/重试；写操作超时是 outcome unknown（结果未知），应查询状态或用 idempotency key（幂等键）安全重试，不能盲目再发。

刷新 Token 要 single-flight（单飞：并发请求共用一次刷新）。刷新失败后清理会话；静默请求可以不弹 toast，但不能吞掉 401 的会话处置。

### 3.3 固定响应表

| 输入 | 唯一 UI 结果 | 禁止行为 |
| --- | --- | --- |
| 200 `{code:0,data:{id:1}}` | 显示实体 1 | 未校验直接断言类型 |
| 422 字段错误 | 映射到字段 | 全局 toast + 字段双提示 |
| 401 | 会话收口/登录 | 页面与拦截器各跳一次 |
| 500 | 可重试系统错误 | 伪装为空数据 |
| 500ms 后 abort | 静默取消 | 显示“服务器失败” |
| offline | 离线可恢复提示 | 无限自动重试 |

复测把 422 换为离线→恢复→手动重试：请求只成功一次，取消仍无错误。证据必须含 request ID、网络状态、错误映射表、UI 快照和调用次数。

---

## UMI-04

**主题：页面、按钮与数据权限**

### 4.1 可见性不是授权

authentication（认证）回答“你是谁”；authorization（授权）回答“这个主体能否对这个资源执行这个动作”。Umi Access 根据 `initialState` 生成 route/menu/component 的前端可见性；它改善体验，但攻击者可以直达 URL、调用接口或篡改本地状态，所以服务端必须重新授权。

RBAC（Role-Based Access Control，基于角色的访问控制）按角色赋权；ABAC（Attribute-Based Access Control，基于属性的访问控制）还考虑主体、资源、动作和环境；least privilege（最小权限）只给完成任务所需权限；deny by default（默认拒绝）表示没有明确允许规则就拒绝。

### 4.2 固定策略矩阵

| 角色 | 列表/详情 | 编辑自己订单 | 编辑他人订单 | 敏感字段 |
| --- | --- | --- | --- | --- |
| auditor | 可读 | 不可 | 不可 | 按规则脱敏 |
| editor | 可读 | 可 | 不可 | 按范围显示 |
| guest | 不可或公开摘要 | 不可 | 不可 | 不显示 |
| reviewer（复测新增） | 可读 | 不可 | 不可 | 脱敏 |

```ts
// src/access.ts：只负责前端体验
export default function access(initial: BootstrapState) {
  const ready = initial.status === 'ready'
  const role = ready ? initial.user.role : 'guest'
  return {
    canReadOrder: ready && ['auditor', 'editor', 'reviewer'].includes(role),
    canEditOrder: (order: Order) => role === 'editor' && order.ownerId === initial.user.id,
  }
}
```

服务端必须从已验证 session 取 user/role/tenant，并在列表查询、详情、修改、导出和批量操作每条路径检查。客户端提交的 `role`、`ownerId`、`tenantId` 都是不可信输入。

### 4.3 降权与故障验证

固定攻击路径：直达 `/orders/42/edit`、篡改 local state 为 editor、修改订单 ID 跨资源访问、已打开表单期间从 editor 降为 guest。

降权时要原子替换权限快照、停止或作废敏感请求、退出编辑态、清理仅授权用户可见的缓存，并给出可理解提示。不要先以宽松默认值渲染删除按钮再回收；初始不确定状态应默认拒绝或显示骨架。

验收同时保存 DOM 和服务端决定：按钮不见只是 UI 证据；接口 403/404、数据范围和审计日志才是授权证据。

---

## ANTD-01

**主题：Form（表单）数据流、联动与校验**

**定义与适用场景。**这里的 Form 指“由表单 store 统一管理字段值、错误、校验和提交状态的编辑任务”。它适用于新建/编辑、动态字段和需要统一校验的业务表单；简单的单个搜索框若已有清楚的受控状态，不必为了形式引入整套 Form。下面的固定记录与 A/AB 校验就是本节的最小示例。

### 5.1 Form store 与生命周期

Form store（表单存储）是字段当前值与错误的所有者；`initialValues` 只在初始化/重置语义中生效，不会因为 props 每次变化就自动覆盖用户输入。新建、编辑、只读共用实例时必须显式定义：何时 `resetFields()`、何时 `setFieldsValue()`、隐藏字段是否 `preserve`（保留）。

固定编辑记录：

```ts
const record = { id: 1, name: 'A', quota: 0, tags: ['x'] }
```

`quota: 0` 是有效数值，不能用 `value || ''` 抹掉；复测的 `quota: null` 表示“未设置”，显示和 payload 必须与 0 不同。

```ts
function openEdit(record: RecordDto) {
  form.resetFields()
  form.setFieldsValue({
    name: record.name,
    quota: record.quota,
    tags: record.tags.map(value => ({ value })),
  })
}

function openCreate() {
  form.resetFields()
}
```

### 5.2 联动与异步校验竞态

联动字段的可见性、值保留和提交 DTO 是三件事。若“无额度”时 quota 不应提交，就在 DTO 映射中删除；只隐藏 DOM 但保留 store 值会提交陈旧数据。

固定时间线：校验 `A` 在 0ms 发出、300ms 返回；50ms 输入 `AB`、其结果在 100ms 返回。最终只接受 AB。

```ts
let validationGeneration = 0

async function validateName(_: unknown, value: string) {
  const mine = ++validationGeneration
  const result = await checkName(value)
  if (mine !== validationGeneration) return
  if (!result.available) throw new Error('名称已存在')
}
```

真实组件应再使用请求取消；代次负责拒绝不支持取消的旧结果。服务端 422 字段错误用 `form.setFields()` 映射到字段，不再额外弹同一错误 toast。

### 5.3 动态数组、提交与证据

`Form.List` 的行身份不要使用数组下标作为业务 ID；删除/排序后仍要保持错误与实体一致。提交按钮在 promise 完成前禁用或去重，服务端仍用幂等/版本规则防重。

验收：新建→编辑 A→新建不串 `tags`；0 与 null 的 DOM/payload 不同；A 慢结果不覆盖 AB；隐藏条件字段按约定保留或删除；双击只产生一次 mutation。保存字段快照、payload、校验代次日志和键盘操作结果。

---

## ANTD-02

**主题：Table / ProTable 查询、分页与导出**

**定义与适用场景。**服务端表格是“查询快照映射到一页结果”的视图，不是浏览器中那一页数组本身。它适用于数据量大、权限/排序由服务端决定、需要刷新恢复或异步导出的场景；几十条已完整加载的只读数据无需套用服务端分页。下面 43 条数据和两次乱序请求是贯穿本节的固定实验示例。

### 6.1 查询状态不是当前页面数组

source of truth（单一事实来源）应是可序列化查询：关键词、页码、pageSize、排序、筛选；服务端返回当前 rows 与 total。刷新时从 URL 校验并恢复，不能依赖内存。

固定输入：total 43、pageSize 20；先请求 `keyword=a&page=3`，300ms 返回；再请求 `keyword=ab&page=1`，50ms 返回。最终只显示 ab。

```ts
type Query = { keyword: string; page: number; pageSize: number; sort: string }
let latest = 0

async function load(query: Query, signal: AbortSignal) {
  const mine = ++latest
  const result = await listOrders(query, signal)
  if (mine !== latest) return { committed: false as const }
  return { committed: true as const, result }
}
```

筛选/排序变化先归一化再把 `page` 重置为 1。删除本页最后一行后，如果当前页超过最后有效页，回退并重新请求；不能用空表掩盖页码错误。

### 6.2 跨页选择与权限

选择集合保存稳定主键，不保存行下标。筛选变化、记录删除或权限下降后，服务端重新校验选择项；批量结果要区分成功/拒绝/不存在。无权限列必须由服务端不返回或脱敏，前端隐藏列不是数据保护。

### 6.3 导出是任务状态机

```text
idle -> creating -> queued/running -> succeeded -> downloaded
                           \-> failed / cancelled / expired
```

提交完整查询快照，服务端返回 `exportId`。轮询或订阅只追踪这个 ID；完成后取得短期下载凭证并只下载一次。当前页数组拼 CSV 不能冒充全量、权限一致的业务导出。

复测 pageSize 改 10：URL 与请求都为 10、筛选仍回第 1 页、慢响应仍不提交、同一 exportId 仍只下载一次。证据含 URL、请求顺序、commit/ignore 日志、跨页主键清单和任务状态。

---

## ANTD-03

**主题：Modal（对话框）、Drawer（抽屉）、详情与反馈**

**定义与适用场景。**浮层容器是在原页面之上临时承载一个有明确开始与结束的任务上下文；它不是新的页面历史。短确认适合 Modal，需保留列表背景的较长辅助编辑适合 Drawer，可分享/刷新或连续多步任务适合路由页。下面 A/B 保存竞态是本节的固定故障注入示例。

### 7.1 选择容器而不是照搬组件

Modal 适合需要集中决定、任务较短且会阻塞当前上下文的操作；Drawer 适合保留列表背景、查看/编辑较长的辅助内容；连续深链、可分享/刷新或长流程应使用路由页面。

容器状态至少有：closed、opening/loading、ready、dirty、saving、save-error、confirm-close。动画不是清理机制；状态必须按目标记录 ID 与请求代次归属。

### 7.2 A/B 固定竞态

记录 A 保存 300ms 后失败；用户关闭后打开 B，B 保存立即成功。A 的失败不得写入 B。

```ts
type PanelSession = { key: number; recordId: string; controller: AbortController }
let current: PanelSession | null = null

function openPanel(recordId: string) {
  current?.controller.abort('replaced')
  current = { key: (current?.key ?? 0) + 1, recordId, controller: new AbortController() }
  return current
}

async function save(session: PanelSession, payload: unknown) {
  const result = await saveRecord(session.recordId, payload, session.controller.signal)
  if (current?.key !== session.key) return
  applyResult(result)
}
```

key（会话键）与 recordId 共同确定结果归属；关闭时取消请求、决定表单保留/销毁策略并清除错误。保存失败留在当前上下文且保留输入；保存成功再关闭。

### 7.3 键盘、焦点与危险操作

打开前记录 trigger element（触发元素）；打开后焦点进入标题或第一个可操作字段；Tab 不应逃出模态区域；有脏数据时 Esc/遮罩关闭走同一确认；真正关闭后把焦点还给仍存在的触发器。若触发器已删除，回到邻近合理位置，不要落到 `body`。

危险删除需明确对象、后果和确认；保存中的危险操作不可静默关闭，因为请求可能已经提交。关闭只能“等待结果”“取消（若协议支持）”或进入结果未知的查询/对账。

验收保存 activeElement（当前焦点元素）时间线、A/B session key、保存响应归属、脏表单决策和重开快照。复测 A 改为成功时，仍不得污染随后 B 的焦点与状态。

---

## ANTD-04

**主题：Ant Design Mobile 与移动业务组件**

**定义与适用场景。**移动业务组件是针对触控、窄屏、软键盘、弱网和系统中断重新组织的任务界面，而不是缩放后的桌面组件。预约、报销、现场审核等会在手机上完成的关键流程适用；大量并排比较、精细拖拽和高密度分析通常不适用，应拆分任务或保留桌面路径。

### 8.1 移动端不是缩小桌面端

固定设备：375×667、横屏 667×375、底部 safe area（安全区）34px、上传延迟 3s。移动任务同时受触控精度、软键盘、窄屏、系统返回、弱网与刘海/手势区域约束。

safe-area inset（安全区内边距）用环境变量渐进增强：

```css
.bottom-action {
  position: sticky;
  bottom: 0;
  padding: 12px 16px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  background: var(--surface);
}
```

不能把 34px 写死为所有设备。软键盘出现时，可视视口会缩小；字段获得焦点后应滚入可视区，提交区不能被遮挡。横屏要验证滚动容器与固定栏，而不是仅验证 CSS 断点。

### 8.2 移动任务与上传状态机

预约表单的链路：进入→填写→日期→文件选择→上传→提交→成功/恢复。每一步都列 loading、empty、error、offline、forbidden。

```text
local-selected -> uploading -> uploaded
                      |-> failed -> retrying
                      |-> cancelled
```

“本地已选”不等于“服务端已上传”。上传状态保存本地条目标识、文件展示信息、服务端 uploadId、进度、错误与可重试条件；断网恢复不能重复创建申请。真正的文件句柄/Blob 能否跨刷新保存受平台与隐私限制，讲义不承诺所有浏览器可永久恢复文件。

### 8.3 触控、弹层与可访问性

触控目标要有足够尺寸和间距；不能只用 hover 解释操作。日期选择/底部弹层要有可访问名称、明确关闭路径、焦点或虚拟光标顺序。放大字体时错误文案不能被截断；暗色/高对比模式中仍要满足对比；屏幕阅读器应能读出字段、错误和上传进度。

复杂并排比较、高密度分析或精细拖拽不适合硬搬到手机，应拆分任务或保留桌面路径。

### 8.4 固定实验

- 375×667 + 键盘：当前字段和提交按钮可达。
- 667×375：底部栏不盖列表，弹层可关闭。
- safe area 34px 与复测 0px：都不出现不可点区域。
- 3s 上传 + 断网/恢复：已选条目保留，只重试一次。
- 字体放大、屏幕阅读器、仅键盘/开关控制：名称、错误、进度和关闭路径可达。

提交视口截图/录像、网络次数、上传状态表、触控尺寸与对比检查。只在桌面开发工具缩放一次不等于完成移动验证；至少记录模拟器设备参数，风险较高流程应补真机。

---

## 9. 超纲术语讲解

以下术语会在框架或组件文档出现，但不要求初级学习者实现内部机制：

- **history（历史记录栈）**：浏览器前进/后退使用的导航记录；`push` 新增记录，`replace` 替换当前记录。它不负责服务器深链回退。
- **hydration（水合）**：客户端 JavaScript 接管服务端 HTML 并绑定交互。服务端/客户端首次内容不一致会产生警告或闪烁。
- **interceptor（拦截器）**：请求发出或响应返回时统一加工的函数链。它适合认证头、关联 ID 和统一分类，不适合重复展示页面字段错误。
- **single-flight（单飞）**：并发调用共享同一个正在进行的操作，例如十个 401 只触发一次 Token 刷新。
- **RBAC / ABAC**：角色模型简单易懂；属性模型能表达 owner、tenant、时间等条件。无论哪种模型，最终检查都在服务端。
- **idempotency（幂等性）**：同一逻辑操作重复请求不会重复产生副作用，通常由服务端幂等键与结果记录保证。
- **focus trap（焦点圈定）**：模态容器打开时把键盘焦点限制在容器内；关闭后仍要恢复到合理触发位置。
- **visual viewport（视觉视口）**：屏幕上当前真正可见的区域，软键盘弹出时可能小于布局视口。

SSR 框架内部协议、Umi 插件开发、Axios 适配器、Form store 内部实现、虚拟列表算法和原生上传后台任务均不属于本域首考。遇到这些内容时只需说清它解决什么问题、为何当前不展开，以及应转到哪个专项领域。
