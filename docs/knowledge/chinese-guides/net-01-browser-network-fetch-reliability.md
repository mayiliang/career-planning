# 浏览器网络知识点讲义

## NET-01 浏览器网络协议、Fetch 与请求可靠性

前端发起一次请求，真正经历的是浏览器缓存、域名解析、连接与加密、代理和服务、HTTP 状态、正文解析、业务判断以及最终 UI 提交。只会写 `await fetch()`，无法解释旧响应覆盖、新旧缓存冲突、401 风暴和写请求结果未知。可靠请求层必须把各层成功、取消、去重、重试和证据分开。

### 学习前先确认

- 直接前置：[BROWSER-01 渲染流水线、DOM 事件与存储](../chinese-guides/browser-01-render-events-storage.md#browser-01)。它已递归链接异步与事件循环；本讲直接使用 Fetch、缓存来源、Abort 与界面提交。

### 一、从 URL 到界面状态有四条链

浏览器链可能经过 Service Worker、HTTP Cache、DNS、连接复用、TLS 与实际网络；服务链可能经过 CDN、反向代理、网关、应用和数据库；应用链要检查状态、解析与业务契约；界面链还要确认结果属于当前请求、当前账号和仍连接的页面。

任一层失败都应有不同证据。Network 面板的 TTFB 长不能直接证明数据库慢，Fetch resolve 不能证明 HTTP 成功，200 也不能证明业务成功，正确业务响应还可能因请求已经过时而不得提交 UI。

建立 requestId、route、account scope 和 release 关联，让日志从浏览器请求连接到服务端 trace。敏感标头、正文和 URL 参数先脱敏。

### 二、DNS、连接与 TLS 是传输准备

DNS 把域名解析为地址，但浏览器、系统、网络与权威服务都有缓存。HTTP/1.1 与常见 HTTP/2 使用 TCP，HTTPS 还要 TLS 握手；HTTP/3 基于 QUIC。已有连接、会话恢复和代理会让某些阶段不再单独出现。

证书验证包括主机名、有效期和信任链。HTTPS 保护传输并认证服务端域名，不证明用户身份、业务授权或页面脚本无 XSS。企业代理、VPN、IPv4/IPv6 与网络切换都可能改变实际路线。

前端通常不能强制 h2/h3 或指定连接。以 Network 的 Protocol、Remote Address、Connection ID、Timing 和服务端日志为准。

### 三、HTTP 版本改变传输，不改变业务契约

HTTP/1.1 常通过多连接并发；HTTP/2 在一条 TCP 连接多路复用，TCP 丢包仍可能影响连接上的流；HTTP/3 的 QUIC 将丢包恢复更多隔离到流。协议升级可能改善握手与队头阻塞，但资源优先级、服务器处理、体积和主线程消费仍决定体验。

方法、状态码、标头、缓存和应用接口语义在版本间保持。不要用域名分片等旧优化机械对待 h2/h3，也不要看到 h3 就宣布性能完成。以真实用户网络分布和对照测量决策。

### 四、HTTP 方法承载安全与幂等语义

GET/HEAD 按语义是 safe，不应改变服务端业务状态；PUT/DELETE 规范上幂等，即重复执行预期效果一致；POST 通常不幂等。这是客户端和中间设施做缓存、重试和预取的重要合同，错误服务端实现会破坏整个链路。

状态码按类别表达结果：2xx 成功，3xx 重定向，4xx 请求或权限问题，5xx 服务端暂时失败。但具体 API 还要定义 202 异步接受、204 空正文、409 冲突、412 前置条件、429 限流和 Retry-After。

不要用 200 包装所有错误再让前端猜字符串。稳定错误 code、requestId、可重试性和用户消息分工属于接口合同。

### 五、HTTP Cache 由新鲜度与验证器驱动

Cache-Control 决定缓存资格和新鲜度，ETag/If-None-Match、Last-Modified/If-Modified-Since 用于重新验证。`no-cache` 允许存储但复用前验证，`no-store` 要求不存这次响应，却不会删除已存在旧副本。

内容散列静态资源适合长期 immutable，因为内容变化会产生新 URL；HTML 通常使用 no-cache 与验证器，确保入口能发现新资源；个性化 GET 至少 private，并正确设置 Vary。Cookie 存在不会自动阻止共享缓存。

`Vary` 把请求标头纳入缓存键，漏掉 Origin、Accept-Encoding 或语言会串响应，过度 Vary 又降低命中。缓存规则要同时检查浏览器、CDN 与代理，每层的 Age、Via、Cache-Status 或自定义证据互相印证。

### 六、Service Worker Cache 与应用缓存是另外两层

Service Worker 的 fetch handler 可以从 Cache API 返回响应，完全绕过一次网络；应用内 Map/Query Cache 又以业务 key 保存 Promise 或数据。三层键、版本、生命周期和失效不同。

Network 显示 from ServiceWorker 不等于 HTTP Cache 命中。更新失败可能来自旧 Worker、旧 Cache API 条目、CDN 或应用内状态，清掉所有缓存只会丢失定位线索。记录每层的 source、version 与命中原因。

离线策略先定义真源与可接受陈旧时间。Cache-first、network-first、stale-while-revalidate 是组合模板，不是万能答案；用户身份变化和敏感响应要隔离。

### 七、CORS 控制脚本读取，不是权限系统

**跨源资源共享（Cross-Origin Resource Sharing, CORS）**让服务器声明哪些 origin 的浏览器脚本可读取响应。非简单请求先发 OPTIONS 预检；携带凭据时不能使用 `Access-Control-Allow-Origin:*`，还要明确允许 credentials，Cookie 的 SameSite/第三方策略仍可能阻止发送。

简单跨源 form 或某些请求可在攻击者读不到响应的情况下产生服务端副作用，所以 CORS 不能替代 CSRF 防护。CORS 成功也不证明用户有权读取该对象；服务端必须按当前身份和资源重新授权。

动态回显允许 origin 时采用严格 allowlist 并 `Vary: Origin`。浏览器给脚本的错误常很概括，结合控制台、预检与服务端日志定位，不能让用户关闭浏览器安全策略。

### 八、Cookie 是请求状态载体，不是前端数据库

Cookie 按 Domain、Path、Secure、HttpOnly、SameSite 与过期规则匹配请求。HttpOnly 阻止普通脚本读取，仍会随匹配请求发送；Secure 限制 HTTPS；SameSite 缩小跨站发送范围但不是完整 CSRF 防线。

会话 Cookie 体积小、随请求重复发送，不适合存业务对象。Domain 放宽会让更多子域参与信任，优先 host-only 或 `__Host-` 约束。退出、轮换、并发会话和吊销属于服务端身份协议。

前端请求层负责 credentials 选项和错误状态，不应读取 Cookie 判断“已登录”。真实会话以服务端响应为准。

### 九、Fetch 有传输、HTTP、业务和 UI 四层成功

Fetch 在网络错误、CORS 阻断或 Abort 时 reject；收到 404/503 仍 resolve Response。读取正文还可能因空 body、格式或流中断失败。可靠解码顺序是检查状态与 Content-Type，限制体积，解析为 unknown，再用运行时 schema 验证业务结构。

业务成功不等于界面可提交。搜索 A 发出后搜索 B 发出，A 晚到就必须被标记 stale；账号切换或组件卸载也使响应失去所有权。提交前检查单调 sequence、query key、accountId 与 mounted/navigation identity。

错误模型区分 network、timeout、abort、http、parse、contract、business 与 stale，让 UI 给出正确恢复而不是统一“网络错误”。

### 十、流式响应需要背压、取消与增量解析

Response body 是 ReadableStream 时，可以逐块读取；chunk 边界不等于 UTF-8 字符、JSON 行或业务事件边界。使用 TextDecoder streaming 模式与明确帧协议，保存残余缓冲，限制单帧与总大小。

消费者处理慢会形成背压；不要把所有 chunk 先累积再声称“流式”。渲染频率与网络读取频率分离，批量提交 UI并响应 Abort。连接结束要区分正常完成、协议不完整、服务端错误帧和客户端取消。

流已经显示部分内容后失败，需要产品定义保留、标记不完整或回滚；不能悄悄把半个对象当成功。

### 十一、Abort 停止等待，不撤销远端副作用

AbortSignal 能通知 Fetch 和消费代码停止。用户取消、路由取代、组件卸载与超时使用不同 reason，组合信号后仍保留来源。finally 清理 timer 与 listener。

读取请求中止后可丢弃结果；写请求在响应前中止，服务端可能已执行，属于 outcome unknown。不能自动再发一次付款或删除；显示“确认中”，使用业务 ID/幂等键查询最终状态。

后端也应传播取消到下游并设置超时，但客户端 Abort 不是事务回滚协议。对不可取消 SDK，至少用 sequence 抑制迟到提交。

### 十二、并发去重、取代与缓存不是一回事

相同账号、相同 key 的并发 GET 可共享一次 in-flight Promise，这叫 **单飞（Singleflight）**。Promise settle 后从 map 删除，失败也不能永久缓存。消费者各自取消时要决定只取消等待还是在最后消费者离开后取消底层请求。

搜索输入的“后一次取代前一次”不是去重：即使 query 字符相同，用户意图和页面身份也可能不同。数据缓存还要处理 stale time、失效和更新，而 singleflight 只合并同时发生的执行。

key 包含 URL 规范化、方法、账号/租户、locale、授权维度和影响响应的 Vary 信息。遗漏会跨用户串数据，过度包含随机 requestId 又无法去重。

### 十三、401 刷新需要单飞与重放上限

多个请求同时 401 时，只允许一个 refresh Promise，其余等待同一结果。刷新成功后每个原请求最多重放一次；再次 401 进入统一退出或再认证，不能递归刷新风暴。

请求 body 若是已消费流、上传或不可重复操作，不可透明重放。刷新期间账号切换要取消旧等待者，清理内存缓存和提交序号。refresh 失败把一致错误传给等待者，不让每个请求各自显示不同登录弹窗。

更稳健的方案是服务端令牌生命周期、提前刷新和 BFF 会话共同设计，而不是让前端响应拦截器承担全部身份协议。

### 十四、重试只对有资格且有预算的操作

瞬时网络错误、429 和部分 5xx 可能重试；认证、参数错误和业务拒绝通常不重试。自动重试先检查方法语义、幂等协议、用户取消和 Retry-After，再使用指数退避与 jitter，设置最大次数和总时间预算。

幂等键由客户端为一次业务意图生成稳定 ID，服务端原子记录 processing/completed 结果，重复请求返回同一结果。只加请求头而服务端不保存没有意义。键还需作用域、过期和参数一致性检查。

重试指标记录首次失败、每次等待、最终结果与额外负载。无限重试会放大故障并制造惊群；熔断、并发限制和服务端过载信号需要跨层协作。

### 十五、离线写入需要 outbox 和冲突协议

`navigator.onLine` 只是网络线索，不证明目标服务可达。离线 outbox 保存业务意图、账号/租户、幂等键、创建时间、版本、重试预算和用户可见状态。恢复前重新认证并确认账号，不把 A 的队列交给 B。

区分从未发出、已发出结果未知、明确失败和已确认成功。普通读取可重新取快照，高风险写入默认要求用户确认或服务端结果查询。并发修改使用版本/ETag/If-Match 或领域合并，不以最后写入者静默覆盖。

队列加密不能替代设备与脚本信任边界。配额驱逐、schema 升级和永久失败都要有可恢复 UI。

### 十六、Network 与 HAR 建立分层证据

录制时说明冷/热缓存，保留日志并清除无关请求；显示 Method、Protocol、Priority、Initiator、Connection ID 与 Service Worker 来源。Timing 中 queued/stalled、DNS、connect/TLS、request sent、waiting TTFB、download 分别解释。

用离线、延迟、限速、状态覆盖和服务端故障注入验证取消、重试和缓存。导出 HAR 前删除 Authorization、Cookie、签名 URL、查询、正文和个人数据；工具声称 sanitized 后仍人工检查。

把 HAR 与服务端 trace、缓存标头、应用 requestId 和最终 UI state 对齐。只截一张红色请求截图无法证明哪层失败。

### 十七、可靠请求层需要可观测不变量

定义并自动验证：旧请求不能覆盖新请求；同 key 同账号并发只发一次；刷新任一时刻一个；每个请求最多重放一次；取消后不提交；非幂等写默认不自动重试；结果未知进入查询；缓存命中来源可解释。

测试故意让旧请求晚到、Mock 忽略 Abort、刷新失败、GET 503 后恢复、POST 响应丢失、离线账号切换和 schema 错误。成功和失败路径都保存请求计数、状态机与脱敏日志。

### 学完后应能说明

你应能从 DNS/TLS/HTTP/缓存到业务与 UI 画出请求全生命周期，区分 CORS、Cookie、授权和 CSRF；能正确处理 Fetch 状态、流式解析、Abort、迟到响应、singleflight、刷新、重试、幂等和离线 outbox；还能用 Network、HAR 与服务端 trace 证明问题属于哪一层。

