# Web 安全知识点讲义

## SEC-02 CSP、Trusted Types 与安全违规报告

修复输入输出边界后，浏览器仍可以用声明式策略阻断意外脚本、约束危险 DOM sink，并把违规反馈给工程系统。CSP 与 Trusted Types 的难点不是拼一行响应头，而是建立脚本信任链、处理每响应 nonce 与缓存、迁移遗留代码、治理第三方，并让报告可用且不泄露数据。

### 学习前先确认

- 直接前置：[SEC-01 XSS、CSRF 与前端输入输出信任边界](../chinese-guides/sec-01-xss-csrf-trust-boundaries.md#sec-01)。本讲是纵深防御，默认已经理解不同注入 sink 和服务端授权边界。

### 一、CSP 是浏览器执行的资源与注入策略

**内容安全策略（Content Security Policy, CSP）**由 HTTP 响应头声明页面允许加载或执行哪些资源，以及能否被嵌入、使用哪些注入 sink。它不会净化 HTML、修复授权或判断第三方业务可信，只在浏览器执行已声明限制。

策略由 directives 组成。fetch directives 如 script-src、style-src、img-src、connect-src 控制资源；document/navigation directives 如 base-uri、form-action、frame-ancestors 控制文档行为；`object-src 'none'` 移除旧插件入口；default-src 仅是部分指令的回退，不覆盖所有指令。

优先通过 HTTP 头部署。meta CSP 有时可提供部分控制，但不能表达 frame-ancestors、Report-Only 等完整能力，且出现在 meta 之前的资源已不受其保护。

### 二、来源列表不是第三方信任证明

`'self'` 表示同源，不表示同源所有路径安全；主机 allowlist 可能包含用户内容、JSONP、开放重定向或被接管子域。`https:`、`*` 和宽泛 CDN 会显著放大脚本来源。

严格脚本策略以 nonce 或 hash 信任具体脚本入口，再配合 `strict-dynamic` 传播到受信加载器创建的后代脚本。这样减少脆弱 host allowlist，但受信加载器若把用户输入当 URL，仍会传播错误信任。

第三方脚本在页面上下文拥有接近第一方的权限。策略允许只是技术准入，还要有 owner、版本、用途、数据边界和退出方案。

### 三、Nonce 必须每个 HTML 响应唯一且同步

**一次性随机数（Nonce）**由服务端使用密码学安全随机源为每个 HTML 响应生成，同时写入 CSP `script-src 'nonce-...'` 与允许的 script 标签。它不能是构建常量、用户可预测值或长时间缓存的同一个字符串。

头与 HTML 必须来自同一次渲染。CDN 缓存动态 HTML 时，要么缓存注入前模板并在可信边缘为每个响应同时改写头与标签，要么采用适合静态内容的 hash 策略。出现头 n1、标签 n0 会拦截合法脚本。

不要把 nonce 暴露给不可信模板属性或日志。nonce 在 DOM 中对已执行的同源脚本并非秘密；其价值是攻击者无法仅靠注入标记提前猜到当前响应许可。

### 四、Hash 适合内容稳定的内联脚本

hash source 对脚本精确字节计算 SHA-256/384/512，内容、空白变化就要更新策略。它适合静态 HTML 或构建期确定的小脚本，不适合每请求变化的内联数据。

外部资源完整性 SRI 与 CSP hash 有关联但职责不同。SRI 让浏览器验证获取的资源内容；CSP 决定是否允许执行。跨源 SRI 还受 CORS 等要求，不能把两者当同一个开关。

避免把大量运行时 JSON 放入可执行 script。使用安全序列化的 application/json、data attribute 或请求数据，并处理 `</script>` 等解析边界。

### 五、strict-dynamic 建立脚本信任链

在支持 CSP3 的浏览器中，带有效 nonce/hash 的脚本可加载后代脚本；传统 host source 在现代浏览器中的作用会变化，旧浏览器回退需要按目标矩阵设计。不要只看字符串猜策略效果。

受信 bootstrap loader 只能从固定清单、版本化 manifest 或受控模块图加载。动态导入路径也要审计。若标签管理器允许任意业务用户添加脚本，给它 nonce 就等于把页面脚本信任授予整个管理面。

模块脚本、Worker、Wasm 和 eval-like 能力受不同指令/关键字影响。不要为兼容某库直接加入 `unsafe-eval`；先定位它为何生成代码，升级、配置或隔离。

### 六、从 Report-Only 迁移到 Enforce

`Content-Security-Policy-Report-Only` 记录将发生的违规但不阻断，适合发现现有脚本、style 和 sink。上线顺序是：盘点入口和 owner，在测试环境修合法路径，生产按路由/发布分桶观察，高风险页面先强制，再逐步扩大。

Report-Only 不是永久安全措施。它没有阻断，且扩展、恶意流量与浏览器差异会制造噪声。制定退出条件：关键路径合法违规为零、攻击回归产生预期报告、第三方均有 owner、旧浏览器回退可接受。

强制头与更严格的 Report-Only 头可以同时存在，各自独立计算。策略收紧以一项一项的变更发布，出问题能回滚具体 directive，而不是用 `*` 全量放开。

### 七、Trusted Types 约束 DOM 注入 sink

**可信类型（Trusted Types）**让受保护的 DOM XSS sink 不再接受普通字符串，而要求 TrustedHTML、TrustedScript 或 TrustedScriptURL。CSP `require-trusted-types-for 'script'` 开启 sink 强制，`trusted-types` 限制可创建的 policy 名称。

它不提供 sanitizer。policy 的 createHTML 若直接返回原字符串，就把绕过集中到一个名字。每个 policy 对应明确业务目的和转换，例如只允许 Markdown 子集；JavaScript URL 不复用 HTML policy。

优先消除 sink：textContent、DOM construction 与框架安全插值无需 TrustedHTML。只在确需富文本的位置创建窄 policy，集中 code owner 与攻击测试。

### 八、默认 Policy 只适合有期限的迁移

Default policy 会接住遗留字符串写入，可用于记录调用栈、净化或拒绝，帮助迁移。但无条件返回输入会成为全局逃生口。设 owner、覆盖率和删除日期，逐个把调用点迁到命名 policy 或安全 API。

不支持 Trusted Types 的浏览器会忽略强制，应用仍必须调用同一 sanitizer/转换规则。安全基础不能依赖 API 存在；支持环境提供额外强制和观测。

第三方库写 innerHTML 时，先升级到兼容版本或用受控适配层。给整个库一个宽 policy 之前审计其所有数据来源。

### 九、CSP 与 Trusted Types 共同覆盖不同链路

CSP 限制哪些脚本能执行和资源能加载，Trusted Types 限制字符串如何进入部分 DOM 注入 sink，sanitizer 负责允许的 HTML 结构，输出编码负责具体上下文。四者互补。

一个已有 XSS sink 在没有可执行脚本时仍可能引发导航、网络、UI 欺骗或 DOM clobbering；一个合法受信脚本也可能因业务 bug 造成越权。不要把 CSP 通过当应用安全结论。

### 十、frame-ancestors、base-uri 与 form-action 缩小文档攻击面

`frame-ancestors` 控制哪些父页面可嵌入当前文档，抵御点击劫持；`base-uri 'none'` 防止注入 base 改写相对 URL；form-action 限制表单提交目标；object-src none 移除插件面。

它们应按产品需要显式设置。允许合作方嵌入时列精确 origin，并配合 iframe sandbox、Permissions Policy 和消息协议。frame-src 控制当前页加载哪些 frame，与 frame-ancestors 的控制方向不同。

### 十一、mixed content 与升级指令有边界

HTTPS 页面加载 HTTP 子资源会形成 mixed content，浏览器会升级或阻断不同类型。`upgrade-insecure-requests` 可请求把 HTTP URL 改为 HTTPS，但目标服务器必须真正支持且证书正确。

它不是 HSTS，不保证首次顶层访问 HTTPS，也不验证第三方资源内容。迁移时先清理源码 URL、监控失败，再用指令纵深；不要长期依赖自动升级隐藏错误配置。

### 十二、违规报告是不可信遥测输入

Reporting API/report-to 与旧 report-uri 能接收 CSP 违规，两套并存可能重复。报告缺字段、被扩展触发、被伪造或遭流量攻击，不能单独证明真实攻击或成功阻断。

接收端限制 Content-Type、body 大小、速率和来源成本，异步入队。归一化 release、routeTemplate、effectiveDirective、blockedOrigin、sourceFileKey、浏览器桶，形成去重键；完整 URL、query、fragment、用户名和 token 不入库。

聚合后分配到资源/组件 owner，区分新发布回归、第三方变化、攻击探测和扩展噪声。保留样本与计数，不把每条报告创建一个告警。

### 十三、报告与真实执行证据要相互验证

测试不仅看控制台。检查响应头、合法脚本执行计数、未知脚本网络、DOM sink 抛错、业务副作用和服务端报告。Report-Only 中危险脚本可能仍执行，强制模式才应阻断。

使用固定 release 和独立测试源，避免扩展噪声。错误 nonce、未知源、裸 innerHTML、合法 policy、旧浏览器回退分别有断言。报告端去重和脱敏也做测试。

策略解析可用浏览器和静态分析辅助，但真实页面、重定向、缓存和加载器行为必须端到端验证。

### 十四、缓存与 Service Worker 会影响策略排障

CSP 属于文档响应，旧 HTML、CDN、浏览器缓存和 Service Worker 都可能返回不同版本。记录 response URL、Age、cache source、release 与 nonce，不能用清缓存当修复。

Service Worker 脚本本身和它返回的 HTML 有不同更新生命周期。新 Worker 控制旧文档、旧 Worker 返回新资源的窗口需要兼容。策略发布与制品发布绑定，保留快速回滚但不永久放宽。

### 十五、第三方治理比追加域名更重要

每个第三方记录业务价值、script 入口、后代加载、connect/img/frame 需求、数据访问、owner、版本和退出期限。新增域名必须评估整个 origin 可提供的内容，不只当前 URL。

能服务器代理的静态资源可固定版本和完整性；需要高权限脚本的 SDK 放入隔离页面或最小路由。标签管理平台的发布权限纳入安全审计和双人审批。

策略报告用于发现未登记第三方，不能让业务团队自行加入 wildcard 消除告警。

### 十六、策略演进需要兼容矩阵和回滚条件

浏览器对子指令、Trusted Types 和 Reporting 支持不同。基础安全仍由安全 DOM API、sanitizer 与授权提供；CSP 增强按支持生效。记录目标浏览器、指令支持和可接受回退。

策略变更先在隔离环境和小流量路由验证，监控合法失败率、核心任务、报告量和第三方。回滚只退最近收紧项，保留已经证明有效的其他指令。事故后补自动回归和 owner，不用永久 Report-Only 掩盖。

### 十七、常见失败模式

常见反例包括：长期固定 nonce；HTML 与头 nonce 不一致；`unsafe-inline/unsafe-eval/*`；只靠 host allowlist；default policy 原样返回；报告保存完整 URL；合法 SDK 无 owner；看到控制台无错就宣称安全；meta CSP 代替必须的响应头；Report-Only 永不强制。

每个失败模式都能用反例验证：重复请求比较 nonce、缓存页面检查同步、注入未知脚本观察执行与报告、裸字符串写 sink 期待失败、报告样本确认脱敏。

### 学完后应能说明

你应能解释 CSP 指令、nonce/hash、strict-dynamic、Report-Only 与 Enforce 的关系，设计缓存安全的脚本信任链；能用 Trusted Types 命名 policy 约束 DOM sink而不创建全局绕过；还能把违规报告当不可信遥测进行限流、脱敏、去重和归属，并用真实执行证据验证策略。

