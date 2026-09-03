# Vue/Nuxt 知识点讲义

## VUE-11 Nuxt 全栈渲染、数据获取与性能

Nuxt 把 Vue 组件、文件路由、服务端渲染、数据获取、服务端 API 和部署适配器组合为全栈框架。关键不是记住目录，而是理解一段代码在哪里执行、首屏数据如何进入 HTML/payload、客户端如何 hydrate、缓存怎样按身份隔离，以及实验能力和版本升级如何保持稳定回退。

### 学习前先确认

- 直接前置：[VUE-10 组件测试、性能与生产构建](../chinese-guides/vue-10-testing-performance-production-build.md#vue-10)。它会递归包含 Vue Router、组件、Pinia 相关路径、响应式和异步基础。

版本事实核验日期为 2026-08-30：官方 Nuxt 4 文档显示 4.5.2；Nuxt 4.5 发布于 2026-07-18，Nuxt 3 已于 2026-07-31 结束支持。实施时仍须重新核验。

### 一、先区分 universal、client 与 server 代码

请求时生成 HTML 是**服务端渲染（server-side rendering）**，浏览器生成主要内容是**客户端渲染（client-side rendering）**，构建时生成页面是**静态站点生成（static site generation）**。Nuxt 把首屏数据序列化为**页面载荷（page payload）**，把服务端私密/公开配置分层为**运行时配置（runtime configuration）**，并可用**路由规则（route rules）**选择每条路由的渲染与缓存策略。

页面 setup 可能在首屏服务器执行，也会在客户端 hydrate/导航；`.client` 插件只在浏览器，`.server` 只在服务端；server routes 在 Nitro 端执行。直接在通用 setup 读 window/localStorage 会使 SSR 失败或首屏不一致。

秘密只能进入服务端 runtimeConfig 私有部分。公开 runtimeConfig/public 和任何序列化 payload 都会被客户端看到。

### 二、SSR、CSR、预渲染与混合路由

例如公开且每天更新的文档列表适合预渲染并定期失效，个性化控制台适合按请求 SSR，强交互编辑器可以在受控壳内客户端渲染。选择条件来自内容公开性、新鲜度、服务器成本与交互需求，而不是全站只用一种模式。

SSR 每请求生成 HTML，适合个性化/新鲜内容但增加服务器和缓存复杂度；CSR 由浏览器获取/渲染；预渲染在构建时生成稳定公开页面；route rules 可按路径组合缓存、ISR 或客户端模式。

选择基于 SEO、首屏、个性化、新鲜度、成本和故障恢复，不是“SSR 一定更快”。同一应用可混合，但每种 route 需要明确数据与缓存合同。

### 三、Hydration 接管服务器 HTML

客户端 Vue 使用相同组件和初始数据连接服务器 DOM，这叫**水合（hydration）**。服务器与客户端首次输出不一致会出现 warning、DOM 修补、状态丢失或事件错位。

常见原因：当前时间/随机数、浏览器专属条件、无效 HTML、模块级状态、身份缓存串请求。应提供确定输入，在 mounted 后再显示客户端专属信息，不能通过关闭 warning 掩盖。

### 四、`useFetch`/`useAsyncData` 避免首屏重复请求

Nuxt 在服务器获取数据，将结果序列化进 payload，客户端 hydrate 时按 key 复用，避免 `$fetch` 在 setup 中服务器一次、客户端又一次。

`useFetch` 适合基于 URL 的请求；`useAsyncData` 适合任意异步逻辑和更细控制；`$fetch` 适合事件动作或服务端内部调用。它们不是同义别名。

### 五、数据 key 是缓存身份合同

同 key 的 useAsyncData/useFetch 可能共享 data/error/status；选项不一致会产生难以理解行为。key 应包含影响结果的稳定参数，并在个性化场景包含适当身份/租户范围。

不要把 token 本身拼进 key 或日志。服务端可从请求上下文取得身份，用不可逆稳定范围标识；公共与私有缓存明确分开。

### 六、Payload 只包含客户端需要的数据

payload 允许客户端接管而不重取，但任何内容都到浏览器。只返回 DTO，删除数据库字段、内部错误、token 和权限细节。检查生成 HTML/payload/网络，而不是相信 TypeScript private 名称。

序列化支持范围取决于 Nuxt/devalue 与 server API JSON 路径，Date/Map 等在不同路径可能不同。跨边界使用明确 DTO 和解析，避免类实例方法在客户端消失。

### 七、请求头转发必须白名单思维

服务端 useFetch 可转发部分用户 headers/cookie 给同源 API，但不应把任意 host、连接头或内部凭据传向外部 URL。服务端 API 根据会话授权，不能相信客户端传入 userId。

外部请求使用专门 server service，限制目标域、超时、重试和响应大小，防 SSRF。错误对客户端脱敏，对服务端日志保留关联 ID。

### 八、状态必须每请求隔离

模块级 ref/reactive/store 在长生命周期服务器中可能跨请求共享。使用 Nuxt `useState` 的唯一 key 或每请求 Pinia 实例，并保证默认工厂不复用可变对象。

认证/租户切换要清理客户端缓存；服务端缓存 key 必须包含权限上下文。用两个并发身份测试 HTML/payload，证明不串数据。

### 九、缓存从内容公开性开始设计

公开文章可共享 CDN/route 缓存；用户订单不能按 URL 全局缓存。缓存合同包含 key、TTL、stale、失效、错误缓存、身份和部署版本。

ISR/边缘缓存提高性能但可能服务旧内容。写操作后如何 revalidate、权限变化何时失效、旧版本 schema 是否兼容必须明确。Cache-Control 也是安全边界。

### 十、客户端导航与首屏时序不同

首屏服务器等待数据并输出 HTML；客户端导航可阻塞直到数据就绪，或 lazy 显示 pending。选择应根据是否可保留旧页面、目标数据是否关键和用户是否能取消。

同一页面测试地址栏首屏与应用内导航，比较请求次数、payload 和 DOM。只测试其中一种会漏掉重复请求或 hydration 差异。

### 十一、Server Routes 形成可信 API 边界

`server/api`/`server/routes` 在服务端执行，可访问私有配置和数据库。每个 handler 解析 unknown 输入、认证、授权、限制资源、调用领域服务并返回最小 DTO。

文件路由方便不等于安全。写操作需要 CSRF/来源策略、幂等、版本冲突和审计；错误不返回堆栈。客户端隐藏按钮不能替代这些检查。

### 十二、错误页要覆盖服务端与客户端

服务器 render 失败、useFetch 错误、客户端 hydration 错误和导航 chunk 失败需要不同诊断。Nuxt error page 应有安全消息、状态码、返回/重试和可访问焦点。

全局错误恢复不要陷入循环；清除错误后目标 route 仍坏时应提供稳定退出。日志关联 request/build/route，脱敏 payload。

### 十三、性能要看 HTML、Payload、JS 和服务器

SSR 可改善首个内容但服务器慢会增加 TTFB；大 payload/JS 会拖慢 hydration；过多客户端组件增加交互成本。分别测 server timing、HTML/payload 大小、JS、LCP/INP、hydration 和客户端导航。

使用同一 route 在冷/热缓存、匿名/登录和移动设备对比。优化一层不应让另一层退化。

### 十四、懒水合与流式能力要按稳定级别采用

Vue 3.5 异步组件支持不同 hydration 策略，Nuxt 4.5 推进实验 SSR streaming。它们能推迟工作或逐步发送，但改变事件重放、代理 buffering、错误与缓存时序。

实验能力不作为唯一生产路径。建立 feature flag 和稳定 SSR 回退，在真实 CDN/代理验证 chunk、断线、错误和可访问性；升级时重新核对 API。

### 十五、Nuxt 4.5 的版本边界

官方 4.5 发布说明包含 Vite 8、Rspack 2、unhead v3、实验 streaming、稳定错误码和面向 Nuxt 5 的 groundwork。升级可能暴露 Vite 插件、Rspack 自定义配置和更严格 useHead 类型变化。

截至核验日文档为 4.5.2。不要把 4.5.0 当安全/稳定终点；补丁与安全公告要看锁文件中的 Nuxt、devtools 和传递依赖组合。

### 十六、Nuxt 3 EOL 意味着迁移责任

Nuxt 3 在 2026-07-31 EOL 后不应继续作为无计划生产基线。迁移先升级到受支持末端、清理弃用、运行 compatibility、再迁 Nuxt 4；记录 module 兼容、目录变化、Node 基线、构建和部署适配器。

无法立即迁移时要有风险接受、隔离、监控和明确截止，不把“还能运行”当受支持。

### 十七、安全升级核对实际依赖树

顶层 Nuxt 版本不足以证明安全。检查 lockfile/why、构建制品、Nitro preset 和 devtools/模块。官方安全公告可能要求特定组合，升级后跑 server/API、SSR、payload、build 和 E2E。

生产 devtools 不应暴露内部信息；source map、runtime config 和 payload 都要扫描。保持可执行回滚，但不能回退到已知漏洞版本。

### 十八、部署适配器决定运行能力

Node server、serverless、edge 与静态托管对文件系统、连接、流式、缓存和超时不同。选择 Nitro preset 后在目标环境验证，而不是只本地 node preview。

长连接、后台任务和大响应可能不适合某平台。反向代理需正确传递 header、流式与客户端断开；健康检查不依赖私人页面。

### 十九、测试三阶段与双身份

对同一路由记录：首屏 HTML/响应；payload 与 hydration；客户端导航网络。用匿名/登录两身份并发，检查缓存 key、数据和 private token。注入服务失败、payload 不一致、旧 chunk 和实验 streaming 关闭。

断言页面内容、请求次数、console hydration warning、焦点/路由播报、产物秘密扫描和服务器日志。所有证据关联同一 build/lockfile。

### 二十、全栈边界审查问题

代码在哪运行？数据由谁拥有？什么进入客户端？缓存按谁隔离？首屏与导航是否重复？未知输入在哪里解析？服务器在哪里授权？实验能力怎样关闭？版本/制品怎样回滚？回答不完整就不应仅凭页面可打开宣称全栈正确。

### 二十一、Runtime Config 要区分服务端秘密与公开配置

私密 runtime config 只在服务器读取；进入 public 区域的值会被序列化给客户端，必须视为公开。部署平台通过受控环境注入，启动时验证必需字段、格式和允许 URL，日志只输出是否存在与安全摘要。

不要把整个 process environment 展开进 payload，也不要让客户端决定内部 API 地址或权限。密钥轮换后验证新实例、旧实例和回滚版本的兼容，并确保构建制品/source map 不包含历史值。

### 二十二、Route Rules 把缓存和渲染选择变成可审查配置

不同路由可选择预渲染、SSR、客户端渲染、缓存或代理规则。先按内容是否公开、个性化程度、更新频率和容忍陈旧时间分类，再设置规则。过宽通配可能把账号页缓存为公开，过细规则又可能在新 route 上失去保护。

用匿名/两名用户和冷/热请求验证响应、缓存 header 与 HTML/payload；配置变更纳入代码审查和回滚。CDN 缓存、Nitro 缓存和数据源缓存必须分别记录 key 与失效责任。

### 二十三、流式渲染会把失败与代理能力暴露得更早

流式响应可以先发送外壳，再揭示慢边界，但代理缓冲、serverless 超时或客户端断开可能让效果消失。首字节变快不代表完成时间变快；同时测 TTFB、关键内容、可交互和服务器资源。

流中失败需要已发送 HTML 的安全 fallback，不能再随意改状态码。敏感错误不进入流，取消后停止下游工作。实验能力通过 route/环境开关灰度，并保留非流式路径。

### 二十四、可观测性要贯穿一次服务端请求与客户端导航

为请求、payload、客户端 hydration 和后续 API 建立关联 ID，记录 route、缓存命中、数据源耗时、build 与安全的用户/租户标识。浏览器错误与服务器日志能沿同一链汇合，才可定位重复取数、串缓存或 hydration 失败。

指标按匿名/登录、地区、设备与发布版本分层，但避免高基数字段和个人数据。告警对应用户影响与回滚阈值，而不是每个单次异常都制造噪音。

### 学完后应能说明

你应能比较 SSR/CSR/预渲染/混合，画出服务端取数—payload—hydration—客户端导航时序，设计身份隔离的 key/cache，保护 Server Route 与私密配置，测量全链性能，并按官方版本、依赖树和稳定回退治理 Nuxt 升级。
