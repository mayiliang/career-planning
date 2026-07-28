# 17 现代渲染、数据层、实时协作与离线

所有“通过”均需满足[统一考核规则](00-assessment-rules.md)。本领域补齐框架之上的应用架构能力：渲染边界、Server State、实时协议、协作一致性与离线恢复。

## RENDER-01 SPA、SSR、SSG、ISR 与混合渲染决策

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Next.js Rendering](https://nextjs.org/docs/app/getting-started/server-and-client-components)、[web.dev Rendering on the Web](https://web.dev/articles/rendering-on-the-web)。覆盖范围：各种渲染策略的数据时效、缓存、SEO、TTFB、交互成本、部署约束与迁移边界。
- 严格考核：首考题 1（资料定位）：定位两份资料对渲染位置和代价的说明；首考题 2（机制解释）：解释请求、渲染、缓存、注水和交互接管链路；首考题 3（最小产出）：为内容页、控制台和个性化首页制作决策矩阵并实现两种渲染方式；首考题 4（受限排错）：诊断一次缓存陈旧或 hydration mismatch；首考题 5（学习复述）：三分钟说明为什么不存在通用最佳渲染模式。命题边界：答案必须区分框架实现与通用 Web 约束。
- 通过标准：决策包含数据时效、性能、成本、故障和回滚；实现有可测量证据；能说明不应服务端渲染的场景。评估边界：不以背诵框架 API 代替架构判断。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## RENDER-02 RSC、Streaming、Suspense、Hydration 与 Islands

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[React Server Components](https://react.dev/reference/rsc/server-components)、[Next.js Streaming](https://nextjs.org/docs/app/getting-started/linking-and-navigating#streaming)。覆盖范围：服务端/客户端组件边界、序列化、流式 HTML、Suspense、选择性注水、Islands 思想与故障恢复。
- 严格考核：首考题 1（资料定位）：定位 RSC 与 Streaming 的约束；首考题 2（机制解释）：画出服务端组件载荷到客户端交互的链路；首考题 3（最小产出）：实现含慢数据、错误和交互岛的流式页面；首考题 4（受限排错）：定位不可序列化属性、瀑布请求或注水不一致；首考题 5（学习复述）：比较 RSC、SSR 和纯 CSR。命题边界：实验特性必须标明版本与稳定性。
- 通过标准：组件边界正确；慢区块不阻塞页面骨架；错误可恢复；能解释网络瀑布、缓存与包体取舍。评估边界：不得把 RSC 等同于传统模板渲染。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## EDGE-01 BFF、Edge Runtime 与 Serverless 边界

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Next.js Backend for Frontend](https://nextjs.org/docs/app/guides/backend-for-frontend)、[Cloudflare Workers Runtime APIs](https://developers.cloudflare.com/workers/runtime-apis/)。覆盖范围：BFF 聚合、认证边界、Edge/Serverless 运行限制、冷启动、区域一致性、密钥与可观测性。
- 严格考核：首考题 1（资料定位）：提取 BFF 与 Edge 运行限制；首考题 2（机制解释）：解释浏览器、BFF、源站和边缘缓存间的数据流；首考题 3（最小产出）：实现带鉴权、超时和缓存的聚合接口；首考题 4（受限排错）：诊断运行时不兼容、跨区延迟或缓存泄漏；首考题 5（学习复述）：说明何时不应增加 BFF。命题边界：不得把 BFF 当作绕过后端治理的代理层。
- 通过标准：权限和密钥不下放浏览器；错误与超时隔离；缓存按用户边界设计；能给出传统服务器回退方案。评估边界：供应商专属 API 不能作为唯一结论。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## DATA-01 Server State、缓存键、失效与请求去重

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[TanStack Query Important Defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)、[TanStack Query Query Keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)。覆盖范围：Server State 与客户端状态边界、缓存键、fresh/stale、失效、去重、取消、分页和服务端渲染。
- 严格考核：首考题 1（资料定位）：定位缓存默认行为和键规则；首考题 2（机制解释）：解释一次查询从命中、失效到重取的状态迁移；首考题 3（最小产出）：实现筛选分页列表及详情联动缓存；首考题 4（受限排错）：排查串数据、重复请求或过期 UI；首考题 5（学习复述）：比较 Server State、全局状态与 URL 状态。命题边界：必须说明使用的库版本及通用原理。
- 通过标准：缓存键包含所有依赖；取消和错误恢复正确；列表与详情更新一致；能用网络证据证明去重。评估边界：不得用“清空所有缓存”掩盖建模错误。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## DATA-02 乐观更新、并发冲突与离线突变

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[TanStack Query Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)、[MDN IndexedDB](https://developer.mozilla.org/zh-CN/docs/Web/API/IndexedDB_API)。覆盖范围：乐观快照、回滚、并发写入、版本冲突、离线队列、幂等键和最终一致性体验。
- 严格考核：首考题 1（资料定位）：定位乐观更新和持久存储机制；首考题 2（机制解释）：说明写入、失败回滚、重放与冲突解决链路；首考题 3（最小产出）：实现可离线修改并恢复同步的任务列表；首考题 4（受限排错）：注入乱序、重复和 409 冲突；首考题 5（学习复述）：说明何时悲观更新更安全。命题边界：不能假设网络请求严格有序或只执行一次。
- 通过标准：失败不丢用户输入；重复提交可去重；冲突显式呈现；断网重启后队列仍可恢复。评估边界：不得以最后写入覆盖作为默认冲突策略。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## REALTIME-01 SSE、WebSocket 与实时消息可靠性

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN 使用 SSE](https://developer.mozilla.org/zh-CN/docs/Web/API/Server-sent_events/Using_server-sent_events)、[MDN WebSocket](https://developer.mozilla.org/zh-CN/docs/Web/API/WebSocket)。覆盖范围：单向/双向实时通信、握手、心跳、重连、背压、消息编号、鉴权、代理与降级。
- 严格考核：首考题 1（资料定位）：比较 SSE 与 WebSocket 能力边界；首考题 2（机制解释）：解释连接、断线、恢复和去重链路；首考题 3（最小产出）：实现带游标恢复的通知流和双向协作通道；首考题 4（受限排错）：注入断网、乱序、代理超时和重复消息；首考题 5（学习复述）：给出协议选择决策树。命题边界：必须区分传输可靠与业务恰好一次语义。
- 通过标准：断线可恢复且不静默丢消息；资源正确释放；退避有上限和抖动；不支持时有轮询降级。评估边界：不得宣称 WebSocket 自带消息持久化。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## COLLAB-01 WebRTC、CRDT 与多人协作一致性

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN WebRTC API](https://developer.mozilla.org/zh-CN/docs/Web/API/WebRTC_API)、[Yjs Documentation](https://docs.yjs.dev/)。覆盖范围：信令、ICE/STUN/TURN、数据通道、CRDT 合并、意识状态、离线编辑、权限和历史恢复。
- 严格考核：首考题 1（资料定位）：定位 WebRTC 建链与 CRDT 合并机制；首考题 2（机制解释）：画出信令、点对点连接和文档同步链路；首考题 3（最小产出）：实现两端离线编辑后自动合并的协作文档；首考题 4（受限排错）：处理 NAT 失败、重复更新和恶意大消息；首考题 5（学习复述）：比较 OT、CRDT 与服务端串行。命题边界：安全与访问控制不能交给 CRDT 自动解决。
- 通过标准：并发编辑可收敛；断线重连不丢修改；连接失败可转 TURN 或服务端通道；权限在服务端验证。评估边界：演示两端成功不等于证明任意并发可收敛。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## PWA-01 Service Worker、离线缓存与版本迁移

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN Service Worker](https://developer.mozilla.org/zh-CN/docs/Web/API/Service_Worker_API)、[Workbox Caching Strategies](https://developer.chrome.com/docs/workbox/caching-strategies-overview)。覆盖范围：生命周期、作用域、缓存策略、导航回退、更新提示、旧资源兼容、离线数据和存储配额。
- 严格考核：首考题 1（资料定位）：定位生命周期和缓存策略依据；首考题 2（机制解释）：解释安装、等待、激活与页面控制；首考题 3（最小产出）：实现离线壳、运行时缓存和可控升级；首考题 4（受限排错）：复现旧 chunk、缓存污染和多标签页更新冲突；首考题 5（学习复述）：说明何时不应缓存。命题边界：必须区分 HTTP 缓存、Cache API 与业务数据缓存。
- 通过标准：离线核心路径可用；版本更新不造成白屏；敏感响应不进入共享缓存；有清理与手动恢复机制。评估边界：不得默认立即 `skipWaiting` 总是安全。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## GQL-01 GraphQL Schema、缓存与前端契约

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[GraphQL Learn](https://graphql.org/learn/)、[GraphQL over HTTP](https://graphql.github.io/graphql-over-http/draft/)。覆盖范围：Schema、query/mutation/subscription、片段、nullability、错误、分页、规范化缓存、复杂度和增量交付。
- 严格考核：首考题 1（资料定位）：定位类型系统和 HTTP 语义；首考题 2（机制解释）：解释查询验证、执行与部分错误；首考题 3（最小产出）：为列表详情设计 Schema、游标分页和生成类型；首考题 4（受限排错）：处理 N+1 暴露、缓存实体冲突和部分成功；首考题 5（学习复述）：比较 GraphQL、REST 与 RPC。命题边界：GraphQL 不能被描述成自动解决性能或授权。
- 通过标准：Schema 能表达空值和错误边界；分页稳定；缓存实体键明确；查询复杂度和字段权限有服务端约束。评估边界：不得仅展示客户端调用成功。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## 领域综合考核

设计并实现一个支持 SSR、Server State、实时通知和离线写入的垂直切片。提交渲染决策、协议契约、缓存/冲突模型、故障注入记录和恢复演示。
