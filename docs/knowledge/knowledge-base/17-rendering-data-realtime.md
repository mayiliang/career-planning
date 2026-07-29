# 17 现代渲染、数据层、实时协作与离线

所有“通过”均需满足[统一考核规则](00-assessment-rules.md)。本领域补齐框架之上的应用架构能力：渲染边界、Server State、实时协议、协作一致性与离线恢复。

## RENDER-01 SPA、SSR、SSG、ISR 与混合渲染决策

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#render-01)、[Next.js Rendering](https://nextjs.org/docs/app/getting-started/server-and-client-components)（英文原文，仅用于版本核验）、[web.dev Rendering on the Web](https://web.dev/articles/rendering-on-the-web?hl=zh-cn)。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：CSR、SSR、SSG、ISR 和按路由混合渲染的数据时效、个性化、缓存键/失效、SEO、状态码、TTFB/注水/交互成本、部署约束、失败降级、指标验证与渐进迁移边界。
- 严格考核：题源包含《中文核心讲义》；首考题 1（资料定位）：只允许使用《中文核心讲义》，定位能支撑「SPA、SSR、SSG、ISR 与混合渲染决策」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：解释请求、渲染、缓存、注水和交互接管链路；首考题 3（最小产出）：为内容页、控制台和个性化首页制作决策矩阵并实现两种渲染方式；首考题 4（受限排错）：诊断一次缓存陈旧或 hydration mismatch；首考题 5（学习复述）：三分钟说明为什么不存在通用最佳渲染模式。命题边界：答案必须区分框架实现与通用 Web 约束。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：决策包含数据时效、性能、成本、故障和回滚；实现有可测量证据；能说明不应服务端渲染的场景。评估边界：不以背诵框架 API 代替架构判断。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## RENDER-02 RSC、Streaming、Suspense、Hydration 与 Islands

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#render-02)、[React Server Components](https://zh-hans.react.dev/reference/rsc/server-components)、[Next.js Streaming](https://nextjs.org/docs/app/getting-started/linking-and-navigating#streaming)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：服务端/客户端组件与信任边界、可序列化值、数据/模块缓存、流式 HTML、Suspense、选择性注水、Islands 思想、客户端导航、部分错误、取消、敏感信息和故障恢复。
- 严格考核：题源包含《中文核心讲义》；首考题 1（资料定位）：只允许使用《中文核心讲义》，定位能支撑「RSC、Streaming、Suspense、Hydration 与 Islands」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：画出服务端组件载荷到客户端交互的链路；首考题 3（最小产出）：实现含慢数据、错误和交互岛的流式页面；首考题 4（受限排错）：定位不可序列化属性、瀑布请求或注水不一致；首考题 5（学习复述）：比较 RSC、SSR 和纯 CSR。命题边界：实验特性必须标明版本与稳定性。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：组件边界正确；慢区块不阻塞页面骨架；错误可恢复；能解释网络瀑布、缓存与包体取舍。评估边界：不得把 RSC 等同于传统模板渲染。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## EDGE-01 BFF、Edge Runtime 与 Serverless 边界

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/advanced-topics.md#edge-01)、[Next.js Backend for Frontend](https://nextjs.org/docs/app/guides/backend-for-frontend)（英文原文，仅用于版本核验）、[Cloudflare Workers Runtime APIs](https://developers.cloudflare.com/workers/runtime-apis/)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：BFF 聚合、认证/租户边界、Web 标准与 Node API 差异、Edge/Serverless CPU/内存/连接/时长限制、冷启动、多区域状态一致性、缓存、密钥、日志追踪、过载和常规服务回退。
- 严格考核：题源包含《中文核心讲义》；首考题 1（资料定位）：只允许使用《中文核心讲义》，定位能支撑「BFF、Edge Runtime 与 Serverless 边界」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：解释浏览器、BFF、源站和边缘缓存间的数据流；首考题 3（最小产出）：实现带鉴权、超时和缓存的聚合接口；首考题 4（受限排错）：诊断运行时不兼容、跨区延迟或缓存泄漏；首考题 5（学习复述）：说明何时不应增加 BFF。命题边界：不得把 BFF 当作绕过后端治理的代理层。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：权限和密钥不下放浏览器；错误与超时隔离；缓存按用户边界设计；能给出传统服务器回退方案。评估边界：供应商专属 API 不能作为唯一结论。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## DATA-01 Server State、缓存键、失效与请求去重

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/advanced-topics.md#data-01)、[TanStack Query Important Defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)（英文原文，仅用于版本核验）、[TanStack Query Query Keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：Server State 与客户端状态边界、包含用户/租户/参数的缓存键、fresh/stale/gc、失效、去重、取消、退避重试、游标分页、预取、SSR hydration、权限变化、登出清理和观测。
- 严格考核：题源包含《中文核心讲义》；首考题 1（资料定位）：只允许使用《中文核心讲义》，定位能支撑「Server State、缓存键、失效与请求去重」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：解释一次查询从命中、失效到重取的状态迁移；首考题 3（最小产出）：实现筛选分页列表及详情联动缓存；首考题 4（受限排错）：排查串数据、重复请求或过期 UI；首考题 5（学习复述）：比较 Server State、全局状态与 URL 状态。命题边界：必须说明使用的库版本及通用原理。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：缓存键包含所有依赖；取消和错误恢复正确；列表与详情更新一致；能用网络证据证明去重。评估边界：不得用“清空所有缓存”掩盖建模错误。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## DATA-02 乐观更新、并发冲突与离线突变

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#data-02)、[TanStack Query Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)（英文原文，仅用于版本核验）、[MDN IndexedDB](https://developer.mozilla.org/zh-CN/docs/Web/API/IndexedDB_API)。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：乐观快照/局部补丁、失败回滚、并发写入、基版本/ETag 冲突、离线 outbox、身份隔离、幂等键、重复/乱序重放、冲突呈现、刷新恢复和悲观更新选择。
- 严格考核：题源包含《中文核心讲义》；首考题 1（资料定位）：只允许使用《中文核心讲义》，定位能支撑「乐观更新、并发冲突与离线突变」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：说明写入、失败回滚、重放与冲突解决链路；首考题 3（最小产出）：实现可离线修改并恢复同步的任务列表；首考题 4（受限排错）：注入乱序、重复和 409 冲突；首考题 5（学习复述）：说明何时悲观更新更安全。命题边界：不能假设网络请求严格有序或只执行一次。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：失败不丢用户输入；重复提交可去重；冲突显式呈现；断网重启后队列仍可恢复。评估边界：不得以最后写入覆盖作为默认冲突策略。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## REALTIME-01 SSE、WebSocket、WebTransport 与实时消息可靠性

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN 使用 SSE](https://developer.mozilla.org/zh-CN/docs/Web/API/Server-sent_events/Using_server-sent_events)、[MDN WebSocket](https://developer.mozilla.org/zh-CN/docs/Web/API/WebSocket)、[MDN WebTransport](https://developer.mozilla.org/zh-CN/docs/Web/API/WebTransport)、[MDN Streams API](https://developer.mozilla.org/zh-CN/docs/Web/API/Streams_API)。覆盖范围：轮询/SSE/WebSocket/WebTransport 的单向、双向、可靠流和不可靠数据报；HTTP/3、安全上下文、握手、心跳、背压、流复用、顺序、消息编号、鉴权、代理、网络迁移、重连、幂等和兼容降级；全部必读资料均为中文。
- 严格考核：首考题 1（资料定位）：只允许使用列出的中文资料，比较 SSE、WebSocket 与 WebTransport 的能力、兼容和安全边界；首考题 2（机制解释）：解释连接、流/数据报、断线、恢复、乱序、去重与业务确认链路；首考题 3（最小产出）：实现带游标恢复的 SSE 通知、WebSocket 双向通道和 WebTransport 可靠流/不可靠数据报实验，提供能力检测与降级；首考题 4（受限排错）：注入断网、网络切换、乱序、丢包、代理超时、重复消息和背压失控；首考题 5（学习复述）：给出协议与降级决策树。命题边界：必须区分传输可靠、应用确认、幂等和业务恰好一次语义。
- 通过标准：断线可恢复且不静默丢关键消息；可丢数据报只承载允许丢失的数据；资源和流正确释放；退避有上限和抖动；不支持 WebTransport 时可降级到 WebSocket/SSE/轮询。评估边界：不得宣称任一传输自带业务持久化或恰好一次。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## COLLAB-01 WebRTC、CRDT 与多人协作一致性

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#collab-01)、[MDN WebRTC API](https://developer.mozilla.org/zh-CN/docs/Web/API/WebRTC_API)、[Yjs Documentation](https://docs.yjs.dev/)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：信令、ICE/STUN/TURN 与服务端回退、数据通道可靠性、CRDT/OT/服务端串行取舍、收敛、意识状态、离线并发、撤销、Schema/权限、恶意消息、历史压缩和恢复。
- 严格考核：题源包含《中文核心讲义》；首考题 1（资料定位）：只允许使用《中文核心讲义》，定位能支撑「WebRTC、CRDT 与多人协作一致性」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：画出信令、点对点连接和文档同步链路；首考题 3（最小产出）：实现两端离线编辑后自动合并的协作文档；首考题 4（受限排错）：处理 NAT 失败、重复更新和恶意大消息；首考题 5（学习复述）：比较 OT、CRDT 与服务端串行。命题边界：安全与访问控制不能交给 CRDT 自动解决。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：并发编辑可收敛；断线重连不丢修改；连接失败可转 TURN 或服务端通道；权限在服务端验证。评估边界：演示两端成功不等于证明任意并发可收敛。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## PWA-01 Service Worker、离线缓存与版本迁移

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN Service Worker](https://developer.mozilla.org/zh-CN/docs/Web/API/Service_Worker_API)、[Workbox Caching Strategies](https://developer.chrome.com/docs/workbox/caching-strategies-overview?hl=zh-cn)、[MDN StorageManager](https://developer.mozilla.org/zh-CN/docs/Web/API/StorageManager)、[MDN 源私有文件系统 OPFS](https://developer.mozilla.org/zh-CN/docs/Web/API/File_System_API/Origin_private_file_system)。覆盖范围：生命周期、作用域、缓存策略、导航回退、更新提示、旧资源兼容、Cache API/IndexedDB/OPFS 选型、存储估算与持久化、配额和驱逐、模型/大文件分片、版本迁移、清理、离线突变和多标签页协调；全部必读资料均为中文。
- 严格考核：首考题 1（资料定位）：只允许使用列出的中文资料，定位生命周期、缓存策略、配额与 OPFS 边界；首考题 2（机制解释）：解释安装/等待/激活、HTTP 缓存/Cache API/IndexedDB/OPFS、持久化请求和浏览器驱逐之间的关系；首考题 3（最小产出）：实现离线壳、运行时缓存、可控升级及带配额预算和版本迁移的大文件/模型分片缓存；首考题 4（受限排错）：复现旧 chunk、缓存污染、配额耗尽、部分分片、迁移中断、多标签页冲突和驱逐后恢复；首考题 5（学习复述）：说明数据分别应放在哪里、何时不应缓存。命题边界：不得把任何浏览器存储视为永久可靠或适合保存明文敏感数据。
- 通过标准：离线核心路径可用；版本更新不白屏；写入具备原子/恢复设计；配额、驱逐和清理可观测；敏感响应不进入共享缓存；用户可释放大文件。评估边界：不得默认立即 `skipWaiting` 总是安全，也不得仅在无限配额环境演示。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## LOCALFIRST-01 本地优先数据、浏览器数据库与同步引擎

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#localfirst-01)、[中文｜IndexedDB](https://developer.mozilla.org/zh-CN/docs/Web/API/IndexedDB_API)、[中文｜Origin Private File System](https://developer.mozilla.org/zh-CN/docs/Web/API/File_System_API/Origin_private_file_system)、[中文｜存储配额与逐出](https://developer.mozilla.org/zh-CN/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)、[SQLite Wasm 持久化](https://sqlite.org/wasm/doc/tip/persistence.md)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：local-first 与 offline-capable 的差别；IndexedDB/OPFS/SQLite Wasm 选择；事务、索引、Schema 迁移、配额/持久化/逐出、加密边界、Worker 并发、跨标签协调、变更日志、outbox/inbox、游标同步、幂等、删除墓碑、冲突检测/合并、快照压缩、备份导出、恢复、可观测性与多设备一致性；CRDT 协同细节归入 `COLLAB-01`。
- 严格考核：首考题 1（资料定位）：只允许使用《中文核心讲义》，定位事务、版本升级、OPFS、持久化请求及配额逐出依据；首考题 2（机制解释）：闭卷画出本地提交、变更日志、上传确认、远端拉取、冲突合并和压缩链路，并区分“界面先更新”“离线队列”和“本地数据库为主副本”；首考题 3（最小产出）：实现一个刷新、断网和多标签后仍可编辑的知识库，具备版本化数据库迁移、outbox、幂等同步、删除墓碑、冲突界面、配额预警、导入导出和故障恢复；首考题 4（受限排错）：注入升级中断、事务回滚、磁盘满、浏览器逐出、时钟漂移、重复/乱序消息、跨标签并发、服务端快照落后和损坏数据库，提交可复现证据与恢复演练；首考题 5（学习复述）：3 分钟说明何时值得承担 local-first 的同步复杂度。命题边界：不得用时间戳最后写入覆盖所有冲突，也不得承诺浏览器存储永不被逐出。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：用户操作先持久化到本地事务再反馈成功；刷新/崩溃/离线不丢已确认输入；迁移可中断恢复且旧版本有明确阻断或兼容策略；同步消息可重复、乱序并可断点续传；删除、关联完整性和语义冲突可解释；多标签只有受控写入者或有明确协调；配额不足、私密模式、不支持 OPFS 时有降级；导出文件可在空环境恢复；故障注入后本地与服务端最终收敛并有审计证据。评估边界：仅把查询缓存写入 localStorage、只演示单设备在线成功或忽略数据删除责任不能通过。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## PWA-02 Web App Manifest、安装、推送与后台能力

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#pwa-02)、[中文｜MDN Web App Manifest](https://developer.mozilla.org/zh-CN/docs/Web/Progressive_web_apps/Manifest)、[MDN Web Share Target](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/share_target)（英文原文，仅用于版本核验）、[中文｜MDN Push API](https://developer.mozilla.org/zh-CN/docs/Web/API/Push_API)、[中文｜MDN 通知 API 使用指南](https://developer.mozilla.org/zh-CN/docs/Web/API/Notifications_API/Using_the_Notifications_API)。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：Manifest 成员、图标/主题/显示模式/作用域、安装资格与自定义安装、`launch_handler`/快捷方式/文件/协议/Share Target 的渐进增强；分享文本/URL/文件的 method、enctype、大小/类型/数量校验、临时文件生命周期、CSRF/导航与不可信输入；推送订阅、通知权限与操作、后台事件、静默推送限制、退订、隐私、配额和浏览器/平台差异；全部必读资料均为中文。
- 严格考核：首考题 1（资料定位）：只允许使用《中文核心讲义》，定位安装、分享目标、推送和通知规则；首考题 2（机制解释）：闭卷解释 Manifest、浏览器/操作系统分享面板、导航/表单提交、Service Worker、Push Service、应用服务与系统通知之间的生命周期；首考题 3（最小产出）：实现可安装应用、文本/URL/文件 Share Target、输入预览与确认、订阅管理、服务端推送、通知操作和应用内替代提示；首考题 4（受限排错）：定位作用域/图标错误、分享参数名不匹配、超大/伪造文件、重复提交、恶意 URL、安装入口缺失、订阅过期、重复通知、权限拒绝或后台事件未完成；首考题 5（学习复述）：3 分钟说明何时应注册分享目标、请求安装/通知权限，以及平台不支持时如何保留核心任务。命题边界：分享目标收到的所有文本、URL 和文件均为不可信输入；不得在无用户意图时诱导授权，也不得承诺后台任务永久运行。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：安装与非安装路径均可用；Share Target 使用 HTTPS、严格参数/类型/数量/大小校验、临时存储清理、幂等去重和用户确认，非支持平台仍可用文件选择/粘贴/普通分享；权限在明确价值时触发；订阅更新/注销可恢复；推送载荷最小化；通知可关闭且深链安全；跨平台差异有实测矩阵。评估边界：只在单一桌面浏览器显示通知、信任 MIME/扩展名或收到分享后立即执行/发布内容不能通过。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## GQL-01 GraphQL Schema、缓存与前端契约

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/advanced-topics.md#gql-01)、[GraphQL Learn](https://graphql.org/learn/)（英文原文，仅用于版本核验）、[GraphQL over HTTP](https://graphql.github.io/graphql-over-http/draft/)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：Schema、query/mutation/subscription、片段、nullability、错误、分页、规范化缓存、复杂度和增量交付。
- 严格考核：题源包含《中文核心讲义》；首考题 1（资料定位）：只允许使用《中文核心讲义》，定位能支撑「GraphQL Schema、缓存与前端契约」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：解释查询验证、执行与部分错误；首考题 3（最小产出）：为列表详情设计 Schema、游标分页和生成类型；首考题 4（受限排错）：处理 N+1 暴露、缓存实体冲突和部分成功；首考题 5（学习复述）：比较 GraphQL、REST 与 RPC。命题边界：GraphQL 不能被描述成自动解决性能或授权。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：Schema 能表达空值和错误边界；分页稳定；缓存实体键明确；查询复杂度和字段权限有服务端约束。评估边界：不得仅展示客户端调用成功。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## 领域综合考核

设计并实现一个支持 SSR、Server State、实时通知和离线写入的垂直切片。提交渲染决策、协议契约、缓存/冲突模型、故障注入记录和恢复演示。
