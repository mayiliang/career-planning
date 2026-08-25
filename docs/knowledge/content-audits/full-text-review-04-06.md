# 04—06 域学习资料全文审读记录

审读日期：2026-08-25

本文件只把“逐页读取目标正文、对照固定挑战并作出取舍”的结果标为完成。第 04—06 域现行 **65 条**资料均已在本轮逐篇/逐章读取并与固定挑战对照：第 04 域 13 条、第 05 域 12 条、第 06 域 40 条。远程页面按目标正文读取；本地讲义按知识点完整章节读取。被撤下的超大规范只记录实际完成的结构核验和可量化范围，不冒充逐字通读。

判定字段：正文事实、挑战缺口/超纲、处理、闭环证据。目标 URL 带锚点时，学习范围以锚点章节为准；API 全页若作为资料列出，则按全页主体判断，而不是只看搜索命中的一段。

## UMI-01 路由、布局与页面生命周期

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| Umi 路由 | 全文覆盖配置路由、`path/component/routes/redirect/wrappers/layout`、约定式路由、动态路由、全局布局、404、跳转和参数；明确 Umi 4 的 path 只支持 `:id` 与末尾 `*`，不支持 `:id?` 和正则片段；也解释 `useLocation` 相对 `base`。 | 把 Umi 定义为客户端 SPA，不承担静态服务器 fallback、SSR 首次状态码或 hydration 一致性；没有 `/console` 三地址 fixture。 | 保留为中文框架机制主线。 |
| Umi 目录结构 | 全文从根目录、配置、dist/mock/public、资源、`.umi`、app/layout/pages、全局脚本/样式、loading、plugin、favicon 一直讲到路由约定。 | 路由/布局只占部分主体，mock、资源、CSS 覆盖、插件开发等与本点无关；作为必读会明显超纲。 | 删除。 |
| 旧中文完整讲义 | 解释路由/布局、深链、SSR、404、旧地址和最小实验。 | 没有可运行 `/console` 路由表、精确参数解析、Umi 4 不支持可选参数的版本事实，也没有 `/ops` 复测结果表。 | 替换。 |
| 新中文核心讲义 | 给出 `/console/orders/42`、非法参数、旧地址、登录无布局与 404 的路由代码；补服务器回退/SSR/hydration、菜单投影、四候选排错和 `/ops` 复测。 | 非 Umi 路由器迁移与 SSR 框架内部协议只作边界。 | 核心必读。 |

闭环：资料可直接回答可选参数追问，能区分服务器 404、应用 404、参数错误和迁移结果；地址栏、HTTP、DOM、history 与拆包证据和挑战一致。

## UMI-02 initialState、运行时配置与应用初始化

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| Umi 数据流：全局初始状态目标章节 | 目标章节定义 `getInitialState()`、`@@initialState`，并列 `initialState/loading/error/refresh/setInitialState`；明确首次取到状态前会阻止页面其他部分渲染。 | 不讲账号 A/B 竞态、401、SSR 安全快照、敏感菜单闪现；同页其余 model、useModel 性能、Qiankun 不属于目标锚点。 | 保留目标章节。 |
| Umi 运行时配置 | 全文包含 browser-only 配置、dva、数据流、getInitialState、layout、onRouteChange、动态 patch routes、qiankun、render、request、rootContainer。 | 绝大部分与 session 初始化无关；旧审计把“完整 API 页”判为直接覆盖启动顺序过宽。 | 删除；必要的运行时职责写入中文讲义。 |
| 旧中文完整讲义 | 已讲初始化链、错误分类、会话序号、SSR 与 A/B 实验方向。 | 没有连续可执行代码、0/50/100/300ms 时间线、401 单跳与安全序列化清单。 | 替换。 |
| 新中文核心讲义 | 定义可穷举 `BootstrapState`，以 AbortController + generation 实现 A/B 竞态，覆盖 401、失败重试、SSR Cookie/Header 来源、安全序列化和 hydration 复核。 | 不把 initialState 扩张为页面数据缓存。 | 核心必读。 |

闭环：A 300ms、B 50ms、B 首次失败/重试、匿名/有效/过期 SSR 都有明确状态、日志和 DOM 预期。

## UMI-03 请求层、错误处理与取消

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| Umi Max Request | 全文覆盖构建/运行时配置、dataField、errorThrower/errorHandler、请求/响应拦截器、useRequest/request、一次性拦截器、AbortController 取消、Umi 3→4 差异、参数序列化和完整错误示例；文末还说明旧内置错误方案已删除，示例需自行粘贴。 | 文档自身示例会同时在 errorHandler 与 response interceptor 显示错误，若照抄可能重复 toast；未校验 unknown 响应、未区分写结果未知、离线或 Token 单飞。 | 保留为框架 API 主线，讲义明确不能照抄责任冲突。 |
| MDN AbortController | 主体短且完整：controller、signal、abort，说明可中止 fetch、响应体与流，示例明确 Promise 以 `AbortError` DOMException 拒绝。 | 不保证服务端副作用回滚，也不讲错误映射/重试。 | 保留为中文取消语义。 |
| 旧中文完整讲义 | 已区分 transport/HTTP/业务/取消/离线/解析，提及请求 ID、单飞、写超时与最小实验。 | 未被知识库链接；没有固定六态的可执行 union、响应守卫代码和结果表。 | 由新讲义吸收并替换。 |
| 新中文核心讲义 | 给出 `ApiResult`、响应 guard、request ID、六态映射、唯一 UI 责任、单飞与结果未知边界；固定 200/422/401/500/取消/离线结果。 | 真实 Token 协议和服务端幂等由安全/API 域实现。 | 新增为核心必读。 |

闭环：修复“401 双 toast、取消显示 500”时只需在错误责任、AbortError 与拦截器三处取证；离线复测也有单次重试断言。

## UMI-04 页面、按钮与数据权限

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| Umi Max Access | 全文说明插件依赖 initialState、`src/access.ts` 返回布尔/函数权限、route access、自定义 403、`useAccess` 和 `<Access accessible fallback>`。 | 只控制客户端路由/组件呈现；不教授服务端资源授权、默认拒绝、数据范围或降权缓存清理。 | 保留为中文 UI 映射 API。 |
| OWASP Authorization Cheat Sheet | 全文从认证/授权区别，覆盖最小权限、默认拒绝、每请求校验、框架审查、ABAC/ReBAC 优于复杂 RBAC、IDOR、静态资源、服务端位置、安全失败、日志与自动测试。 | 英文且范围扩展到第三方供应链、云静态资源、SIEM、ReBAC/XACML 等；对初级前端固定四角色挑战明显过宽。 | 删除；必要原则由中文讲义精确翻译。 |
| 旧中文完整讲义 | 已讲权限快照、四层体验/服务端授权、RBAC/ABAC、范围和攻击回归。 | 没有 `access.ts` 可运行代码、auditor/editor/guest/reviewer 固定矩阵或正在编辑时降权收口。 | 替换。 |
| 新中文核心讲义 | 解释 authentication/authorization、RBAC/ABAC、least privilege、deny by default；给 access 代码、四角色矩阵、客户端不可信字段、四种攻击与降权清理。 | ReBAC、策略引擎和渗透测试只列边界。 | 核心必读。 |

闭环：UI 不闪现与服务端拒绝分别取证；直达 URL、篡改 state、跨对象 ID、editor→guest 均能验证。

## ANTD-01 Form 数据流、联动与校验

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| Ant Design Form 全页 | 当前全文约 2283 行：Form/Form.Item/Form.List/FormInstance/Hooks/Rule/Semantic DOM/Token/20 余 FAQ，并含布局、禁用、变体、尺寸、监听、校验、动态嵌套/拖拽、外部状态、多表单、登录/注册/搜索/弹窗/时间/自定义控件等大量演示。正文明确 Form 接管字段、`initialValues` 不随 setState 更新、用 `setFieldsValue`、`preserve` 默认 true、`resetFields` 重挂载、validator 返回 Promise。 | 与固定挑战直接相关的只是一部分；整页要求初学者同时学习样式、所有组件校验、Provider、Redux、拖拽、Token 等，明显不“刚好覆盖”。也没有 A 300ms/AB 50ms 旧结果拒绝和 0/null DTO。 | 删除全页必读。 |
| 旧中文补充讲义 | 解释 store、initialValues、重置、隐藏值、慢校验、422 和动态数组方向。 | 没有完整固定记录代码、0/null 对照、校验 generation 和防重提交证据表。 | 替换。 |
| 新中文核心讲义 | 以 `{id:1,name:'A',quota:0,tags:['x']}` 给出回填/重置、preserve/DTO、A/AB generation、422、Form.List 身份和防重提交验收。 | API 冷门属性、样式 Token 和复杂拖拽不在本点。 | 唯一必读。 |

## ANTD-02 Table/ProTable 查询、分页与导出

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| 旧中文补充讲义 | 全文已含查询源、URL、响应序号、页码回退、跨页主键、权限与异步导出，并给岗位列表例子。 | 没有与首考完全相同的 total=43、pageSize=20、a 300ms/ab 50ms 可执行函数；“只下载一次”只在验收描述。 | 替换为更精确讲义。 |
| 新中文核心讲义 | 固定 43/20 与两请求时序，给 latest-generation 代码、页码归一、跨页重新授权、exportId 状态机与 pageSize=10 复测。 | 不教授 Table/ProTable 全 API 或前端大数据虚拟化。 | 唯一必读。 |

## ANTD-03 Modal、Drawer、详情与反馈

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| Ant Design Modal 全页 | 当前全文约 672 行，覆盖适用场景、完整 props/method/useModal、`destroyOnHidden`、Form preserve 注意、focusable、keyboard/mask、异步 onOk、Semantic DOM、Token、FAQ、Context 与约 18 个演示。当前 API 已用 `focusable.focusTriggerAfterClose` 替代旧 prop。 | 只讲 Modal，不讲 Drawer/路由选型；A/B 异步结果归属、脏数据关闭和危险写结果未知仍缺失。大量 Token、静态方法、拖拽/位置/国际化对固定挑战超纲。 | 删除全页必读。 |
| 旧中文补充讲义 | 已讲容器状态、A 慢 B 快、脏数据、焦点与键盘。 | 无会话键实现、请求取消和结果未知分支。 | 替换。 |
| 新中文核心讲义 | 定义 Modal/Drawer/route 选择，给 A/B `PanelSession`、controller/key、保存归属、关闭清理、焦点圈定/恢复和危险写的等待/取消/对账。 | 动画与 Design Token 不在首考。 | 唯一必读。 |

## ANTD-04 Ant Design Mobile 与移动业务组件

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| 旧中文完整讲义 | 全文覆盖移动约束、适用/不适用、分步任务、安全区、上传、窄屏/横屏/弱网/读屏验收。 | 没有 `env(safe-area-inset-bottom)` 代码、视觉视口术语、上传记录字段或“Blob 跨刷新不保证”的平台边界。 | 替换。 |
| 新中文核心讲义 | 固定 375×667、667×375、34/0px、3s 上传；给安全区 CSS、上传状态/数据、视觉视口、触控/弹层/放大字体/读屏和真机风险说明。 | 不要求把高密度桌面任务迁到移动端，也不承诺所有浏览器跨刷新持久保存文件。 | 唯一必读。 |

## 04 域逐点闭环

| 点 | 现行资料数 | 固定证据 | 结论 |
| --- | ---: | --- | --- |
| UMI-01 | 2 | 三地址、`/console`、404/迁移、`/ops` | 合格 |
| UMI-02 | 2 | A/B 代次、401、重试、SSR 三态 | 合格 |
| UMI-03 | 3 | 200/422/401/500/取消/离线 | 合格 |
| UMI-04 | 2 | 四角色、直达/篡改/跨 ID/降权 | 合格 |
| ANTD-01 | 1 | 固定记录、A/AB、0/null、422/双击 | 合格 |
| ANTD-02 | 1 | 43、20→10、a/ab、exportId | 合格 |
| ANTD-03 | 1 | A/B 保存、Esc、focus、结果归属 | 合格 |
| ANTD-04 | 1 | 两视口、34→0px、3s 上传、弱网/读屏 | 合格 |

## BIZ-01 业务对象、关系与统一语言

| 资料 | 全文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| Microsoft DDD 领域模型 | 当前中文正文 206 行，依次解释限界上下文、实体身份与行为、贫血/丰富模型取舍、值对象、聚合和聚合根；明确聚合根是维护不变量的唯一入口。 | 示例和实现语境偏 .NET 微服务；“统一语言”只在域模型需捕获业务语言处简述，没有前端 DTO/UI 映射或固定 Enrollment 失败。 | 保留为中文概念主线。 |
| 旧中文讲义 | 有定义、反例和证据清单。 | 没有 Course/Enrollment 代码、capacity 1→2 变式和 WAITLIST mapper 的可运行闭环。 | 替换。 |
| 新中文核心讲义 | 以 c1、s1/s2、capacity 1、ENROLLED/WAITLIST 固定身份、聚合入口、统一语言和唯一 mapper；解释 Bounded Context 但不要求微服务。 | 不教授 DDD 战略设计全套。 | 核心必读。 |

闭环：对象图、术语表、两次 enroll、mapper 和 capacity 1→2 复测均来自两份现行中文资料。

## BIZ-02 状态机与业务不变量

| 资料 | 全文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| W3C SCXML | 完整页面清洗后约 6351 行；除状态、事件、transition/cond、层级/并行/终态外，还规范 executable content、data model、send/cancel/invoke、处理器一致性算法、ECMAScript 数据模型、HTTP Event I/O、Schema、MIME 和大量附录。 | 2015 年英文执行规范；业务不变量、k9 幂等、补偿和订单版本演进不是其教学目标，绝大部分 XML 处理器细节对初级前端超纲。 | 从现行资料删除。 |
| XState Statecharts 概念 | 全文从 state machine 的收益讲到 statechart、状态、初始状态、事件/转移、终态、父/原子/并行状态和 self-transition，并给 dog machine 代码。 | 英文且只到基础结构；不讲业务守卫、不变量、并发版本、幂等或补偿。 | 仅作英文版本/术语核验。 |
| 旧中文讲义 | 机制方向完整。 | 缺固定 o7/k9 trace、终态入口代码和 APPEALING 变式。 | 替换。 |
| 新中文核心讲义 | 明确定义状态、事件、命令、守卫、不变量、终态、补偿；给 k9 入口代码、冲突处理、未知枚举降级和复跑证据。 | 不要求 SCXML/XState 实现。 | 唯一中文首考题源。 |

## BIZ-03 RBAC、ABAC 与数据权限

旧讲义的 RBAC/ABAC、服务端最终授权方向正确，但没有固定 school-a/school-b 代码和到期缓存实验。新讲义以 a9→g2 的 403、`canReadGrade`、默认拒绝、服务端 tenant 来源、`role:auditor` 错误缓存键和 30 分钟代班为同一因果链；同时解释 Authentication/Authorization 和 Policy Engine 的超纲边界。现行资料只有这一份中文章节，已逐段核对定义、机制、适用场景、反例、固定实验和验证证据。

## BIZ-04 API 契约、DTO 与前端模型

| 资料 | 全文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| OpenAPI 3.2 最新规范 | 完整页面清洗后约 10048 行，规范 OAS 文档、paths/operations、参数、request/response、callbacks/webhooks、components、security、Schema 方言、引用和附录。 | 本点只需要业务语义和 DTO 防腐层；整套英文 OAS 解析明显属于 API-01/02。 | 从现行资料删除。 |
| JSON Schema 入门 | 284 行全文从 product JSON 建 `$schema/$id/type/properties/required`，再讲可选数组、嵌套、`$ref` 与 validator。 | 是 Schema 编写课，不解释缺失/null 的业务差异或 DTO→领域→UI 映射。 | 删除。 |
| Protocol Buffers proto3 指南 | 全文覆盖字段号/复用风险、cardinality/presence、生成代码、标量/默认值、枚举、import、wire-safe/unsafe/compatible 演进、unknown fields、Any、oneof、map、package、service、JSON mapping、options 与生成器。 | 只有 presence、未知枚举和默认值一小部分支撑本题；其余协议语言与多语言生成超纲，兼容发布属于 TEST-04。 | 删除。 |
| gRPC-Web README | 全文覆盖代理、streaming 限制、protoc/插件安装、生成参数、text/binary wire mode、Envoy、JS/TS 客户端、deadline、Promise 限制、interceptor 与生态。 | 主体是接入手册，不是业务合同或模型防腐教学。 | 删除。 |
| 新中文核心讲义 | 只保留 progress 缺失/null/0、PAUSED/BLOCKED、RESOURCE_EXHAUSTED、唯一 mapper 和 HTTP+JSON/gRPC-Web/消息最小选型；明确跨点边界。 | 不实现任何规范解析器。 | 唯一必读。 |

闭环：四类值、页面禁止 import DTO、新增 eta/移除 reason 和流尾失败均有确定的输入、转换和断言。

## BIZ-05 表单、表格、详情的状态一致性

旧中文讲义已覆盖 baseline、draft、version 与冲突方向，但没有 `amount:0/eligible:false/note:''` 的共享 formatter 或 409 固定恢复。新讲义补齐“确认快照→本地草稿→带版本提交→确认/冲突”的流程，逐项区分 0、false、空串、缺失和 null；固定 List/Detail/Edit/Draft、慢响应、422、409/412、权限撤回和草稿保留证据。WAI 表单页只讲表单可访问性，不是跨视图一致性题源，维持历史删除。

## BIZ-06 异步任务、导入导出与进度

| 资料 | 全文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| MDN Fetch API | 当前中文正文是 Fetch/Request/Response/fetchLater 的接口总览；关键事实是 fetch 在响应头返回后兑现，HTTP 错误状态也会兑现 Response。 | 不讲 taskId、202 后的任务状态、轮询、终态、结果过期或恢复；仅“触发请求”不能达到单资源 80% 相关标准。 | 删除。 |
| MDN AbortController | 短正文完整说明 controller/signal/abort，可中止 fetch、响应体与流，Promise 以 AbortError 拒绝。 | 不保证服务端任务或副作用回滚。 | 保留，并在讲义中显式写出边界。 |
| 旧中文讲义 | 有状态、进度和恢复方向。 | 缺 t1/d1、fake timer、请求计数与断网时间线。 | 替换。 |
| 新中文核心讲义 | 定义六态、202、taskId、退避/抖动、终态停止、session 恢复、410、部分成功和取消竞态。 | 不要求实现 SSE/WebSocket/队列服务端。 | 核心必读。 |

## BIZ-07 异常边界、幂等与一致性

MDN 条件请求整页完整解释验证器、强/弱 ETag、五类条件首部、缓存更新、断点续传、乐观锁和首次上传。整页的大部分缓存/范围内容对本点过宽，因此现行链接精确收窄到“使用乐观锁避免更新丢失问题”：该节从两客户端竞态到 `If-Match/If-Unmodified-Since` 和 412，直接承担并发冲突机制。新中文讲义承担 k1 幂等、504 未知结果、账本查询、补偿 503 与请求—账本—UI 三方轨迹。固定证据能区分 ETag 与幂等键的职责。

## UX-01 交互设计、状态体验与可用性验证

| 资料 | 全文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| Ant Design 设计价值观 | 全文依次解释自然、确定性、意义感、生长性，含克制、模块化、一致性、即时反馈和人机共生。 | 是品牌/系统价值观，不给八态、任务脚本、可用性观察、严重度或复测方法。 | 删除。 |
| MDN Web 表单 | 当前正文是模块首页，列 first form、结构、input/控件、样式、验证、提交和高级文章链接。 | 本页不是这些子文的合并正文，也不教授 UX 研究或错误恢复任务。 | 删除。 |
| MDN 无障碍课程 | 当前正文是无障碍概述与 HTML/CSS/JS、ARIA、多媒体、移动端等子课目录。 | 独立 A11Y 点另有系统课程；本页不能承担 ImportReview 任务和可用性观察。 | 删除。 |
| 新中文核心讲义 | 固定第 8/11 行失败、八态、恢复文案、焦点/读屏、200% 缩放、reduced-motion、3 名逐人观察和两轮复测。 | 明确 3 人不支持统计泛化，也不替代完整 WCAG 学习。 | 唯一必读。 |

## BIZ-08 需求到验收的可追踪性

GitHub Issues 中文页全文覆盖 Issue、子问题、依赖、元数据、Projects、通知、模板、沟通和 Discussions；它说明工作项载体，却没有业务规则 ID 到 API/UI/测试/验收的双向关系，因此撤下。新中文讲义用导师审批、7 天失效和从 `2026-08-01T09:00Z` 开始的 48 小时代班，给稳定 Rule ID、ADR、正向/反向追踪、固定时间测试和“仅合规命中时必填”的五处变更影响。ALM 平台和图数据库列为超纲，不要求初学者引入。

## 05 域逐点闭环

| 点 | 现行资料数 | 固定证据 | 结论 |
| --- | ---: | --- | --- |
| BIZ-01 | 2 | c1、s1/s2、capacity 1→2、WAITLIST mapper | 合格 |
| BIZ-02 | 2 | o7、10:00、k9×2、终态与 APPEALING 变式 | 合格 |
| BIZ-03 | 1 | school-a/b、a9→g2 403、代班到期 | 合格 |
| BIZ-04 | 1 | 缺失/null/0、BLOCKED、流尾、eta/reason | 合格 |
| BIZ-05 | 1 | 四视图、0/false/空串、409/412、草稿 | 合格 |
| BIZ-06 | 2 | t1、d1、fake timer、410、断网/取消 | 合格 |
| BIZ-07 | 2 | k1、v3/v4、504/412、补偿 503 | 合格 |
| UX-01 | 1 | 第 8/11 行、八态、3 人逐例、两轮焦点记录 | 合格 |
| BIZ-08 | 1 | Rule ID、48h、API 403、五处变更追踪 | 合格 |

## GIT-01 Git 对象、暂存区、提交与安全恢复

| 资料 | 全文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| Pro Git：记录每次更新到仓库 | 当前正文 601 个可读行，从已跟踪/未跟踪、modified/staged 状态周期，完整讲到 `status`、`add`、`.gitignore`、工作区/暂存区 diff、commit、跳过暂存、删除和移动。关键事实是提交记录 `git add` 时放入索引的快照，而不是提交瞬间工作区的全部内容。 | 包含 glob、移除/移动等基础扩展；不解释对象图、三棵树后的恢复决策或敏感信息清除。 | 保留，承担状态转换和可复跑提交演练。 |
| Pro Git：Git 对象 | 当前正文 475 个可读行，以 `hash-object/cat-file/update-index/write-tree/commit-tree` 完整构造 blob、tree、commit 和父提交关系，并解释内容寻址、对象头与压缩存储。 | 底层 Ruby/zlib 存储实现不进入首考；引用、reflog 与安全恢复由相邻资料/讲义承担。 | 保留，承担对象模型，不要求背底层命令。 |
| Pro Git：重置揭密 | 当前正文 432 个可读行，以 HEAD、Index、Working Directory 三棵树解释 `reset --soft/mixed/hard`、按路径重置、checkout 差异与安全表；明确 `--hard` 会覆盖未提交数据。 | 章节沿用部分旧命令写法；挑战使用当前 Git 给出的 restore/switch 提示，且敏感信息泄露后的远端处置不在正文。 | 保留为恢复机制；讲义补当前安全选择、reflog 与秘密撤销边界。 |
| 中文核心讲义 GIT-01 | 完整章节把对象/引用/索引/工作区串成恢复决策，要求空仓库对象、引用、reflog 和敏感信息边界证据。 | 不替代 Git 官方命令参考。 | 核心中文闭环。 |

闭环：固定空仓库可分别证明对象、索引和引用变化；恢复题必须先判断数据是否已提交/推送，再选 restore/reset/revert/reflog，不把 `--hard` 当通用清理。

## GIT-02 分支、合并、变基与冲突

| 资料 | 全文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| Pro Git：分支简介 | 当前正文 334 个可读行，从 blob/tree/commit 父关系推导分支是可移动提交指针、HEAD 指向当前分支，演示创建、切换、分叉与 `log --graph --all`。 | 不含实际冲突处置。 | 保留，承担提交图和共同祖先前置模型。 |
| Pro Git：分支的新建与合并 | 当前正文 408 个可读行，以 issue53/hotfix 完整演示快进、三方合并、合并提交、冲突标记、未合并状态、`git add` 标记解决和提交合并。 | “清掉冲突标记并暂存”只说明结构完成，不证明业务语义正确。 | 保留；讲义要求测试和差异验证语义。 |
| Pro Git：变基 | 当前正文 349 个可读行解释共同祖先、补丁重放、`--onto`、公开历史重写风险、patch-id 恢复与 merge/rebase 取舍；核心规则是不重写他人已基于的共享提交。 | 高级 `--onto` 和遭强推后的修复不是初级首考。 | 保留，首考只覆盖重放机制、提交身份变化和共享历史边界。 |
| 中文核心讲义 GIT-02 | 完整章节给固定提交图、内容冲突/语义冲突和 merge/rebase/cherry-pick 的验证证据。 | 不把单一团队分支策略规定为普遍答案。 | 核心中文闭环。 |

## GIT-03 协作工作流、PR 与 AI Agent 隔离

| 资料 | 全文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| Pro Git：向项目贡献 | 当前正文 704 个可读行，覆盖贡献影响因素、原子提交/消息、私有小团队、管理团队、fork/PR 和邮件补丁工作流；明确主题分支、fetch 后集成、非快进拒绝和贡献前整理。 | 邮件补丁、IMAP/SMTP 和多种组织模型远超本站固定双 worktree 挑战。 | 保留为协作原理，但首考只定位提交治理、主题分支和贡献流。 |
| GitHub：关于拉取请求 | 旧地址已重定向；本轮改为当前最终深链。39 个可读行完整解释对话/提交/检查/文件更改/结果、合并状态、草稿、临时 ref、比较基点及 fork/shared 两种模型。 | 不教 Git 对象、worktree 或原子提交。 | 保留为 PR 上下文与检查载体。 |
| GitHub：原“审查拉取请求”入口 | 实际正文只有 20 个可读行，是本地检查、建议更改、堆叠 PR、依赖评审、评论、批准等栏目索引。 | 不能支撑评论、批准、请求更改和保护规则的固定题。 | 撤下并替换精确深页。 |
| GitHub：审查建议更改 | 替换后的当前正文 105 个可读行，逐步说明理解 PR 目的、逐文件/逐行评论、建议块、待处理评审、标记已查看，以及 comment/approve/request changes；还明确请求更改只有配合规则集/分支保护才会阻断。 | Copilot/Codespaces 操作属于可选支线。 | 保留为评审闭环；首考不要求 Copilot/Codespaces。 |
| 中文核心讲义 GIT-03 | 完整章节补 worktree 共享对象库/独立工作区、Agent 任务边界、提交归属、依赖与集成顺序、越界检测和 CI 证据边界。 | 平台按钮不能替代 Git 提交图。 | 核心中文闭环。 |

闭环：固定 A/B worktree、三份单目的提交、PR 映射和“B 越权修改 A 文件”故障能同时验证工作区隔离、提交归属和评审门禁。

## ENG-01 / ENG-02 构建模型与开发/生产差异

两点现行资料各只有对应中文完整章节，已逐段读取。ENG-01 从模块图、解析/转换、chunk、source map 到浏览器执行，固定动态导入、副作用和源码—产物追踪；ENG-02 对照开发服务器按需转换/HMR 与生产静态产物，固定 base、旧 chunk 404、缓存与 CDN。此前 Vite Build、MDN Modules、Umi MFSU 各只覆盖单侧机制，已经撤下。挑战同时要求产物分析、运行时网络证据和清缓存前后的可复现解释，因此单一完整讲义比拼接两个局部页面更精确。

## ENG-07 渐进现代化与迁移

Vite Migration 当前正文 242 个可读行，已进入 Vite 8：浏览器目标更新、Rolldown/Oxc/Lightning CSS、依赖优化/转换/压缩/CJS 互操作、模块解析、插件钩子和已移除能力均给出迁移或临时兼容路径。它是具体版本破坏变更的真实清单，不是通用迁移方法；中文完整讲义负责基线、风险清单、兼容矩阵、双轨/停止条件、回滚和 ADR。两者组合让固定插件漂移故障既有当前事实，又不要求初学者背 Vite 8 全部进阶插件变化。

## ENG-03 包管理、lockfile 与 workspace

| 资料 | 全文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| 旧 pnpm 中文镜像 Workspaces | 全文 80 个可读行，页面明确停在 9.x，虽覆盖 `workspace:`、发布转换和循环依赖，但没有当前 11/12 的链接默认值、injected dependencies 和 shared lockfile 配置。 | 版本已落后，不符合当前工程学习资料要求。 | 替换。 |
| pnpm 官方简体中文 Workspaces | 当前标记“版本 11 & 12”，167 个可读行；完整覆盖 workspace 文件、`workspace:` 精确本地解析、别名/相对路径、发布转换、循环依赖，以及当前 `linkWorkspacePackages`、injected/sync、shared lockfile、save protocol 等配置。 | 工具页不解释 manifest 四类依赖、幽灵依赖根因、override 治理和干净/离线证据。 | 保留当前官方中文页；这些缺口由讲义承担。 |
| 语义化版本 2.0.0 | 原根页默认英文且含 309 个可读行；本轮改为官方简体中文页，159 个可读行完整解释公共 API、MAJOR/MINOR/PATCH、先行版、构建信息、优先级、BNF 和 FAQ。 | BNF、正则和完整优先级规则对固定 workspace 挑战超纲。 | 保留中文页，但明确只读公共 API 与版本承诺目标章节；BNF/正则不进首考。 |
| 中文完整讲义 ENG-03 | 完整章节解释 manifest、lockfile、workspace、peer、override、幽灵依赖、干净/离线安装和缓存边界，给 app/ui/shared fixture。 | 不替代特定 pnpm 版本配置参考。 | 核心中文闭环。 |

## ENG-04 组件库构建、types 与 exports

Vite Build 全页 342 个可读行，现行学习链接定位到“库模式”章节：该章给 `build.lib`、external、输出格式、`files/main/module/exports`、CSS 子路径、扩展名和环境变量边界；整页其余浏览器目标、base、多页和实验性高级路径不进首考。扩写后的中文 ENG-04 章节给出 `exports/types/files/peerDependencies/sideEffects` 发布合同、真实 tarball、四消费者矩阵、React 重复实例、声明/CSS/私有子路径故障和 ESM/CJS 超纲边界。原 Node Packages 全页覆盖完整解析算法，已撤下。组合可直接完成固定 `@atlas/ui@0.1.0` 挑战。

## ENG-05 format、lint、typecheck、测试与 CI 门禁

现行资料只有完整中文章节，已逐段读取：它分开 format/lint/type/test 的责任，让本地增量/提交钩子只提供快速反馈，CI 承担不可绕过门禁；固定格式偏差、未使用变量、浮空 Promise、类型错误和行为回归，并要求跳过本地钩子后 CI 仍阻断。ESLint/TSConfig 总入口及 lint-staged/Husky 工具页主体都在教具体配置/安装，无法承担职责分层和旁路证明，已撤下。讲义同步清除了对这些旧题源的引用。

## TEST-01 单元测试、预言机与高级生成策略

Vitest Writing Tests 当前正文 165 个可读行，完整覆盖 `test/expect/describe`、文件组织、TypeScript 转换但不类型检查、失败输出、only/skip/todo、参数化、上下文、并行和运行；它精确承担测试实现基础。中文完整章节负责预言机、stub/spy/fake/mock、属性生成/种子/收缩、差分、变异、fuzz 资源上限和回归固化，固定金额分摊/解析器实验。Node Test Runner 大型 API 参考与 Vitest 基础重复且不教授这些风险方法，已撤下。两份资料组合既不要求通读两个运行器，也足以完成高级挑战。

## TEST-02 组件交互测试

| 资料 | 全文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| Testing Library Queries | 当前正文 158 个可读行，完整区分 get/query/find 与单/多元素、异步重试，给可访问查询优先级、screen、TextMatch、normalizer 和手动查询边界。 | 不教用户事件序列、网络替身或旧响应竞态。 | 保留，承担查询合同。 |
| User Event Introduction | 当前正文 39 个可读行，明确 user-event 模拟完整交互并检查可见/可交互，fireEvent 只是低级 dispatch；推荐每个测试使用 `userEvent.setup()` 返回实例并 await 操作。 | 不教表单业务场景、焦点恢复、慢请求或卸载。 | 保留，承担交互机制。 |
| 扩写后的中文 TEST-02 | 逐段给 `get/query/find` 决策、role/name 可访问合同、user-event 代码、字段错误→修正、A/B 逆序响应、卸载慢请求、网络替身职责和五条固定验收。 | 跨页、真实下载、多标签和像素布局归 TEST-03。 | 核心中文闭环。 |

## TEST-03 E2E 与视觉回归

| 资料 | 全文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| Playwright Introduction | 当前正文 122 个可读行，覆盖框架能力、浏览器/平台、安装脚手架、并行运行、HTML 报告、UI 模式、更新与当前系统要求。 | 是入门页，不教业务路径选择、网络等待和视觉稳定性。 | 保留为测试结构/运行入口。 |
| Playwright Best Practices | 当前正文 265 个可读行，覆盖用户可见行为、测试隔离、第三方/数据库控制、locator/链式过滤、web-first assertion、调试/trace、多浏览器、CI、lint、并行/分片和软断言。 | 范围较广，但均属于 E2E 稳定性机制；sharding 等进阶项不进入固定首考。 | 保留，讲义标注超纲边界。 |
| Playwright Visual Comparisons | 当前正文 98 个可读行，完整解释 `toHaveScreenshot` 首次基线、平台差异、命名/路径、更新、maxDiffPixels、stylePath、非图片快照和版本控制审查。 | 不规定本站的字体/时区/动画冻结和基线审批流程。 | 保留为截图 API；治理由讲义承担。 |
| 扩写后的中文 TEST-03 | 给 school-a 固定旅程、业务键 locator、响应+可访问状态等待、浏览器/字体/视口/时区/动画冻结、失败四分类、trace 和首跑/重试证据。 | 分片和隔离区仅解释术语，不要求实现。 | 核心中文闭环。 |

## TEST-04 消费者驱动契约测试

现行资料只有中文完整章节，已逐段读取：它定义 CDC、Provider State、多消费者版本、HTTP/OpenAPI/proto/gRPC-Web/异步消息的风险矩阵，并固定 Web v1/v2、Mobile v1、字段删除、枚举收窄、错误体、字段号复用和流提前结束。Pact/OAS/proto3/gRPC-Web 原文分别是英文实现规范、约万行规范、完整协议语言和接入 README，都会迫使初学者学习大量挑战外细节，已撤下。讲义给出的协议术语均保留原名与中文解释，不要求部署 Broker。

## ENG-06 CI/CD、灰度与回滚

GitHub Actions 当前最终页 52 个可读行，完整定义 CI/CD 平台及 workflow、event、job、step、action、runner，解释 job 默认并行、依赖/矩阵和新虚拟机；它只承担流水线执行模型。中文章节承担不可变制品、摘要、环境晋级、配置、审批、灰度停止条件、旧 HTML/chunk、回滚与技术/任务/数据三类恢复证据。web.dev 现场性能页属于 OBS-01，已撤下；讲义也同步清除旧“现场指标题源”描述。

## ENG-08 软件供应链与制品信任

现行资料只有中文完整章节，已逐段读取：它把 lockfile、SBOM（软件物料清单，Software Bill of Materials）、漏洞/许可证、签名、provenance（来源证明）、摘要、晋级和事件响应分成不能互相替代的证据，固定恶意 postinstall、依赖混淆、摘要替换、禁止许可证、NOTICE 缺失和密钥撤销。OWASP Top 10、SLSA 和 Cosign 英文页分别是风险纲要、完整等级规范和具体签名实现，已撤下；必要术语和“不证明什么”的边界已经在中文讲义中解释。

## OBS-01 前端可观测性、RUM、SLO 与告警

| 资料 | 全文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| OpenTelemetry Browser | 当前中文正文 173 个可读行，显著警告浏览器插桩仍为实验性/多数功能未标准化；完整演示 traceparent、WebTracerProvider、DocumentLoadInstrumentation、context manager、console exporter，以及用户交互/XHR 插桩。 | 只教接入示例，不教 SPA 导航归属、RUM/SLO、采样、隐私或告警。 | 保留为接入机制，同时把实验性状态写入考核不变量。 |
| MDN Performance API | 当前中文正文 78 个可读行，解释 performance timeline、PerformanceEntry 的 name/duration/startTime/type、`getEntries`/PerformanceObserver、自定义 mark/measure，并列导航、资源、事件、长任务等接口。 | 是接口总览，不给完整 RUM 策略或 SPA 软导航口径。 | 保留为浏览器采集基础。 |
| 中文核心讲义 OBS-01 | 完整章节关联错误、日志、指标、资源、请求、任务、release/route/session/trace，补软导航启发式、采样、脱敏/同意/留存、SLO/错误预算、告警 owner 与发布恢复。 | 不把一次 URL 变化当标准化导航，也不收集可识别内容。 | 核心中文闭环。 |

入口总页、web-vitals README 与试验性 Soft Navigation 页面已经撤下；固定 fixture 仍要求 capability detection，并在缺少 navigationId 时显式标“启发式关联”。

## DX-01 平台工程、Golden Path 与开发者体验

DORA Platform Engineering 当前英文正文 47 个可读行（约 9400 字符），定义平台工程为社会技术学科和面向开发者的内部产品，覆盖关键用户旅程、认知负担下沉、minimum viable platform、可扩展性、清晰反馈、反模式与交付/满意度/采用留存/任务成功度量；2025 段落把 AI 定义为 amplifier，并指出下游测试/安全/部署混乱会吞噬个人编码提速。它是英文当前能力核验，不作为初学者首考。中文完整章节已经逐段承担平台产品、两类用户旅程、目录 owner/API/SLA、Golden Path、escape hatch、至少三类指标和 4 周试点；本轮新增 AI 放大效应、downstream disorder 和 distribution/governance layer 的中英双语解释，同时明确年度百分比和相关性数据不进入首考。Nx/Backstage 功能页已撤下，避免把工具安装误当平台价值。

## 06 域逐点闭环

| 点 | 现行资料数 | 固定证据 | 结论 |
| --- | ---: | --- | --- |
| GIT-01 | 4 | 空仓库、对象/索引/引用、reflog、安全恢复 | 合格 |
| GIT-02 | 4 | 固定提交图、快进/三方、两类冲突、共享历史 | 合格 |
| GIT-03 | 4 | 双 worktree、三提交、PR 映射、越界检测 | 合格 |
| ENG-01 | 1 | 模块图、chunk/source map、源码—产物—运行时 | 合格 |
| ENG-02 | 1 | dev/build、base、旧 chunk 404、CDN/缓存 | 合格 |
| ENG-07 | 2 | 基线、风险矩阵、双轨、停止/回滚、插件漂移 | 合格 |
| ENG-03 | 3 | app/ui/shared、frozen/offline、peer/override/幽灵依赖 | 合格 |
| ENG-04 | 2 | tarball、四消费者、peer 单例、types/CSS/私有子路径 | 合格 |
| ENG-05 | 1 | 五类故障、跳过 hook、干净 CI、例外期限 | 合格 |
| TEST-01 | 2 | 属性/种子/收缩、差分、变异、fuzz 上限 | 合格 |
| TEST-02 | 3 | 键盘、字段错误、A/B 逆序、卸载慢请求、焦点 | 合格 |
| TEST-03 | 4 | school-a 旅程、故障注入、trace、三基线、双浏览器 | 合格 |
| TEST-04 | 1 | 三消费者、Provider State、五类兼容破坏 | 合格 |
| ENG-06 | 2 | 不可变摘要、晋级、灰度停止、旧 chunk、三类恢复 | 合格 |
| ENG-08 | 1 | SBOM/NOTICE/签名/来源、六类注入、撤销 | 合格 |
| OBS-01 | 3 | nav-s1/d42、采样/脱敏、SLO/告警、启发式回退 | 合格 |
| DX-01 | 2 | 两旅程、owner/SLA、escape hatch、3 类指标、预算变式 | 合格 |

合计：40 条现行资料（17 个本地完整章节、23 个远程官方/项目一手页面），逐项与固定挑战的输入、产出、失败注入和复测变式闭环。

## 下一批审读队列

第 04—06 域第三轮全文语义审读完成。下一批从第 07 域开始；在对应 `full-text-review-07-*` 记录形成前，后续域仍不得引用旧链接表或关键词扫描作为“全文审读完成”证明。
