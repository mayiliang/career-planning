# Web 安全知识点讲义

## SEC-04 跨源隔离、嵌入式上下文与权限策略

浏览器把页面放入 origin、site、浏览上下文组与进程等多层边界。跨源隔离、iframe sandbox、Permissions Policy 和 postMessage 分别控制资源进入、窗口关系、功能使用与消息交换，不能互相替代。高级工程师必须先画清控制方向，再设计第三方嵌入与高性能能力的兼容路线。

### 学习前先确认

- 直接前置：[SEC-02 CSP、Trusted Types 与安全违规报告](../chinese-guides/sec-02-csp-trusted-types-reporting.md#sec-02)。该讲已递归覆盖网络、浏览器与通用信任边界；本讲直接使用响应头、报告与脚本信任概念。

### 一、Origin、Site 与浏览上下文不是同义词

origin 由 scheme、host、port 组成，任一不同即跨源。同站点 site 通常围绕 scheme 与可注册域判断，两个子域可能 same-site 但 cross-origin。Cookie SameSite、同源策略与 CORS 因此作用在不同边界。

Browsing context 是窗口、标签或 iframe 的文档环境；opener、parent、top 描述上下文关系。浏览上下文组影响窗口能否持有彼此引用，进程分配是浏览器实现选择，不能只凭“不同进程”推断安全。

设计前列出 app、API、CDN、partner iframe、popup 与第三方资源各自 origin/site，说明谁嵌入谁、谁打开谁、谁需要读取响应或发送消息。

### 二、同源策略限制读取，不阻止所有跨源动作

同源策略阻止跨源脚本任意读取 DOM 与响应，却允许导航、图片、表单和某些嵌入。攻击者即使读不到响应，也可能触发副作用、测量加载差异或诱导点击。

CORS 是服务器允许特定 origin 脚本读取响应的协议；CORP 是资源服务器声明谁可嵌入资源的响应策略；CSP 控制当前文档愿意加载什么。三者方向不同。

Opaque response、no-cors 与图片成功加载不能证明内容可信。跨源错误对页面常被刻意模糊，诊断需服务端日志与响应头。

### 三、COOP 改变 opener 与浏览上下文组

**跨源打开者策略（Cross-Origin-Opener-Policy, COOP）**通过响应头控制顶层文档与跨源 opener 是否留在同一浏览上下文组。`same-origin` 有助于隔离跨源窗口并参与 cross-origin isolated 条件；`same-origin-allow-popups` 为需要保留特定弹窗关系的场景提供不同权衡。

启用后，`window.open()` 返回的引用、`window.opener`、关闭检测与支付/登录 popup 集成可能改变。不能只在性能页加头而忽略认证与第三方流程。

COOP 报告可帮助迁移，但报告和浏览器支持需核验。测试直接打开、从外站打开、同源与跨源 popup，以及返回主页面的完整流程。

### 四、COEP 要求嵌入资源明确允许

**跨源嵌入者策略（Cross-Origin-Embedder-Policy, COEP）**使文档只能加载满足 CORS 或 CORP 等条件的跨源资源。`require-corp` 要求资源显式 CORS/CORP，`credentialless` 对部分 no-cors 跨源请求移除凭据以换取可嵌入性，具体限制按当前规范核验。

启用 COEP 后，旧 CDN 图片、字体、Worker、iframe 和第三方 SDK 可能失败。正确修复是在资源服务器设置准确 CORP/CORS，或迁移/代理资源并审计缓存，不是全局关闭隔离。

动态 CORS 要 `Vary: Origin`，CORP 的 same-origin、same-site、cross-origin 选择要与资源敏感度一致。公开资源也不代表允许携带 Cookie。

### 五、跨源隔离是组合结果

页面通常在合适的 COOP 与 COEP 组合下获得 `crossOriginIsolated === true`，从而使用 SharedArrayBuffer 等受限能力。该布尔值是运行时证据，不能只检查响应头字符串。

子资源、重定向、Worker 脚本和嵌套文档都可能破坏加载。开发、预览、CDN 和生产的头配置要一致；Service Worker 与缓存也可能返回旧头或旧资源。

隔离不是全面安全模式。它主要减少特定跨源信息泄漏并开放高能力，XSS、授权和恶意第三方脚本仍需各自控制。

### 六、SharedArrayBuffer 的产品收益与兼容成本

SharedArrayBuffer 允许多个 agent 共享内存并用 Atomics 协调，适合 Wasm 线程、媒体和高性能计算。共享内存会引入数据竞争、死锁、忙等和内存可见性问题，不应只为“更快”启用。

先证明 Worker 普通消息传递成为瓶颈，再衡量跨源隔离对支付 popup、客服 SDK、广告、字体和媒体的影响。提供无共享内存的单线程或 transferable 回退，核心任务不能因一项优化不可用而消失。

性能测试比较总耗时、主线程响应、内存与数据搬运，并验证隔离开关两条路径结果一致。

### 七、iframe sandbox 采用允许能力模型

iframe `sandbox` 无值时施加最严格限制，再用 allow-scripts、allow-forms、allow-popups 等 token 逐项放开。`allow-scripts` 与 `allow-same-origin` 同时给同源不可信内容时尤其危险，内容可能接近移除沙箱的能力。

sandbox 控制被嵌入文档行为，不控制谁能嵌入当前页面；后者由 frame-ancestors。它也不决定摄像头、地理位置等功能，功能由 Permissions Policy 与 iframe allow 控制。

第三方内容优先使用独立不受信 origin，最小 sandbox，并通过窄消息 API 交换。不要把用户 HTML 放入与主应用同源的“sandboxed” iframe 后假定永久安全。

### 八、Permissions Policy 控制强大功能

**权限策略（Permissions Policy）**由响应头设置顶层允许列表，并可通过 iframe `allow` 进一步缩小某个子文档的能力，如 camera、microphone、geolocation、fullscreen。父级不允许的功能，子级不能自行放宽。

Permissions Policy 与用户权限提示是两层：策略允许后，浏览器仍可能要求用户授权；策略拒绝则通常不会进入提示。前端要区分 policy denied、user denied、device unavailable 和 insecure context。

建立功能—origin 矩阵，默认 self 或 none，合作方只开放业务需要能力。升级第三方 SDK 时重新检查其功能需求，不能用 `allow="*"` 省事。

### 九、frame-ancestors、frame-src 与 sandbox 控制方向不同

`frame-ancestors` 在被嵌入页面上声明允许哪些父页面；`frame-src` 在父页面上限制愿意加载哪些 frame；sandbox 限制 frame 内文档；Permissions Policy 限制功能。四者组合形成嵌入合同。

点击劫持防护优先 frame-ancestors。允许嵌入的组件还要有视觉身份、操作确认和消息来源验证。祖先策略在响应头部署，不能只靠 JavaScript 检查 `top !== self`。

### 十、postMessage 是显式跨源能力通道

`window.postMessage()`允许不同 origin 的上下文交换结构化数据。发送时使用精确 targetOrigin，接收时同时验证 `event.origin`、`event.source` 和消息 schema。只检查 origin 可能接受同源其他 iframe，只检查 source 又可能接受该窗口导航后的未知 origin。

消息包含 version、type、requestId 与最小 payload；未知版本和类型安全拒绝。不要发送 token、完整用户对象或可由接收方自行请求的数据。收到消息后执行支付、导航或权限操作仍需服务端授权。

握手协议由子页发 ready，父页验证后返回有限配置；重载与导航会更换 document，旧 pending request 要超时。MessageChannel 可建立专用端口，仍不改变初始来源验证。

### 十一、消息 schema 需要运行时验证

TypeScript 类型在运行时不存在。把 `event.data` 当 unknown，检查对象、version、type 和每个字段限制。禁止原型危险键和超大 payload，必要时限制频率。

请求/响应协议维护 requestId map，设置 timeout、取消与一次完成；重复 response 不产生两次副作用。错误只返回稳定 code，不泄露父页面内部状态。

跨版本迁移可让接收端同时支持 v1/v2 一段时间，发送端按握手能力选择。不能通过默默忽略关键字段把不兼容消息当成功。

### 十二、Popup 集成与隔离可能存在路线冲突

OAuth、支付或身份验证常用 popup 与 opener 通信。严格 COOP 可能切断引用，第三方 SDK 也可能依赖 opener 轮询。产品可改为全页重定向、后端回调+轮询、同源中转或单独不隔离的入口路由。

不要为了一个集成把所有页面改成宽松 COOP，也不要为了 SharedArrayBuffer 破坏登录。按路由和能力分区，明确哪些页面需要隔离，哪些需要 popup，状态通过服务端一次性 code 关联。

### 十三、Origin-Agent-Cluster 与进程隔离边界

Origin-Agent-Cluster 可请求按 origin 而非 site 聚类某些 agent，帮助隔离不同子域的内存环境。它不保证独占操作系统进程，也不替代同源策略、COOP/COEP 或服务端隔离。

旧页面与新头、浏览器启发式和资源限制都可能影响实际进程。安全设计依赖规范可见的边界，不依赖 DevTools 某次显示“不同进程”。

### 十四、XS-Leaks 通过可观察差异推断信息

即使同源策略禁止读正文，攻击者可能测量窗口是否关闭、资源尺寸、缓存、错误或时间，推断用户状态。这类跨站泄漏需要 SameSite/Fetch Metadata、缓存分区、COOP、frame-ancestors、统一错误和减少可观察差异共同缓解。

不要把所有 timing 差异都声称可完全消除；从高价值状态和可行攻击模型开始。登录状态检测端点、按权限不同的资源存在性和窗口行为需要特别审计。

### 十五、跨源资源缓存必须包含正确变体

CORS 按 Origin 动态响应时，缓存键包含 `Vary: Origin`；带凭据与不带凭据响应不能混用。COEP credentialless 又可能改变请求凭据模式，CDN 配置必须区分。

错误缓存的允许头可能把一个合作方权限交给另一个 origin，或让生产随机失败。验证浏览器、CDN 与源站三层头，保存 redirect 链与 cache status。

### 十六、迁移跨源隔离要先做依赖清单

扫描所有脚本、Worker、图片、字体、媒体、iframe 和 popup，记录 URL、请求模式、凭据、响应 CORS/CORP、owner 与替代。先在 Report-Only/测试环境观察，再按路由灰度。

为每项失败定义修复：资源加 CORP/CORS、迁移同源、隔离 iframe、替换 SDK 或保留非隔离路线。未知 owner 的第三方不能通过全局 `cross-origin` 放行。

### 十七、降级路径必须保持核心任务

无 crossOriginIsolated 时关闭共享内存优化，用普通 Worker/单线程；partner 资源不兼容时显示可理解占位并提供原始链接；摄像头被 policy 拒绝时允许文件上传；popup 不可用时使用全页重定向。

降级会降低性能或便利，但不能悄悄放宽 origin、使用 `*` targetOrigin 或移除 sandbox。安全失败优先于不受控成功。

### 十八、验证矩阵覆盖控制方向和攻击路径

检查 app/partner/evil 三类 origin、带/不带凭据资源、正确/缺失 CORP、同源/跨源 popup、iframe camera、消息 source/origin/version、隔离开关和 fallback。记录响应头、Network、`crossOriginIsolated`、窗口引用、消息拒绝和权限错误。

自动测试外使用真实多 origin 本地环境，因为 localhost 不同端口就是不同 origin。不能用一个同源 mock 证明跨源策略。

### 学完后应能说明

你应能区分 origin、site 与浏览上下文，解释 COOP/COEP/CORP/CORS 的控制方向和跨源隔离条件；能最小化 iframe sandbox 与 Permissions Policy，用 origin+source+schema 验证 postMessage；还能在 popup、第三方资源与 SharedArrayBuffer 之间做可回退的产品分区并用多 origin 证据验证。

