# Web 安全知识点讲义

## SEC-01 XSS、CSRF 与前端输入输出信任边界

前端安全不是背 payload，而是追踪攻击者可控数据如何进入高影响操作。URL、Markdown、接口响应、对象键、DOM 名称和跨窗口消息都可能成为输入；HTML 解析、URL 导航、对象合并和服务端授权都是不同的汇。掌握共同的数据流方法，才能解释为什么“已经转义”“开了 CORS”“隐藏了按钮”仍可能不安全。

### 学习前先确认

- 直接前置：[NET-01 浏览器网络协议、Fetch 与请求可靠性](../chinese-guides/net-01-browser-network-fetch-reliability.md#net-01)。本讲直接使用 origin、Cookie、请求方法、CORS、缓存与服务端结果。

### 一、用威胁模型确定要保护什么

**威胁模型（Threat Model）**列出资产、攻击者能力、入口、信任边界、影响和已有控制。资产可能是账号操作、隐私数据、页面脚本权限、跳转信誉或配置完整性。攻击者能力不同，防线也不同：能提交 Markdown 与能执行同源脚本不是同一等级。

不要从 payload 列表开始。先画数据流和主体：浏览器用户、第三方内容、同源脚本、服务端、第三方 iframe 各自能读写什么。每条边界定义允许格式、来源、权限与失败方式，再构造能越界的输入验证。

适用场景包括富文本展示、URL 跳转、对象合并、带 Cookie 的写请求和第三方脚本接入。例如评审评论同时经过 Markdown 解析、HTML 净化和 DOM 插入，必须逐段确认数据仍处于预期上下文，并用正常链接与恶意事件属性组成具体实验，证明业务内容可用而跨边界输入被阻断。

风险等于影响与可利用性的组合，不是“前端问题都低危”。同一个 XSS 在静态营销页与财务后台影响完全不同。

### 二、Source—Transform—Sink 是共同分析语言

source 是不可信数据进入位置，如 location、表单、JSON、postMessage；transform 是解析、拼接、编码、净化、合并；sink 是产生安全影响的位置，如 innerHTML、script URL、导航、对象属性写入和服务端授权。

**信任边界（Trust Boundary）**不是“经过一个函数”，而是数据进入更高权限操作前必须满足的可验证合同。编码适配某个输出上下文，schema 验证适配数据结构，allowlist 适配业务集合，授权适配主体与资源；它们不能互换。

给每个高风险 sink 建立集中封装和代码搜索。框架默认文本插值通常安全，危险转义出口、原生 DOM API、模板编译和第三方富文本仍需单独审计。

### 三、XSS 是数据被解释为可执行内容

**跨站脚本（Cross-Site Scripting, XSS）**发生在不可信数据被页面当作 HTML、JavaScript、脚本 URL 或危险 CSS 等执行语境。Stored、reflected 与 DOM-based 描述输入和执行路径，防御仍回到 source—sink。

普通文本使用 textContent 或框架文本插值；固定安全属性用明确属性名和类型校验；URL 用 URL parser 后校验协议、origin 与路径；允许富文本时使用维护中的 sanitizer 和窄配置。JavaScript/CSS 源码上下文不要插入不可信字符串。

同一个字符在 HTML 文本、attribute、URL、JavaScript 字符串中的含义不同，所以不存在“一次 HTML encode 到处安全”。净化后再拼接字符串、改变解析上下文或交给会二次转换的库，会破坏保证。

### 四、富文本应以允许结构为核心

Markdown 转 HTML 时，解析器不等于 sanitizer。安全管线可以把 Markdown 解析成 AST，只生成允许的节点；或在完整 HTML 结果上运行经过治理的 sanitizer。允许标签、属性、协议与 URL 源均需配置。

图片、链接、iframe、style 和 SVG 有不同攻击面。只删除 `<script>` 挡不住事件 attribute、javascript URL、SVG 动画和解析差异。正则不适合解析 HTML。

验证同时包含攻击与正常内容：危险事件和未知请求被阻断，粗体、代码、允许链接仍工作。只让一个 payload 不弹 alert 不能证明安全。

### 五、DOM Clobbering 利用命名属性访问

带 id/name 的元素在某些条件下会成为 window/document 的命名属性，覆盖代码期望的全局配置。即使脚本标签被过滤，攻击者仍可能用 HTML 改变 `window.redirectTo` 等读取结果。

安全代码使用模块局部变量、显式配置对象与 `querySelector`，并检查数据类型。导航目标仍需 URL allowlist；避免裸全局标识符承担安全决策。sanitizer 的 clobbering 防护和 CSP 是纵深层，不替代修复不稳定读取。

测试使用规范可解释的普通应用名称，不依赖某浏览器特殊保留属性。检查输入插入前后 `window` 取值和最终导航。

### 六、原型污染发生在危险路径写入

JSON.parse 一个 `__proto__` 字段本身通常只是得到自有属性；危险发生在不安全递归 merge、path setter 或默认值逻辑把攻击者键写入共享原型，或沿 `constructor.prototype` 修改。

在每一级路径拒绝 `__proto__`、`prototype`、`constructor`，并按 schema allowlist 只接收已知字段。字典优先 Map 或 null-prototype object，权限默认值使用自有属性检查。不能只在顶层过滤。

Object.freeze(Object.prototype 可能破坏生态且无法挡住所有对象原型，不是通用修复。回归在隔离环境运行，断言普通对象未获得污染字段，正常嵌套配置仍可用。

### 七、开放重定向需要解析后的业务允许集合

`next`、`returnUrl` 和 OAuth 回调目标常被攻击者用作钓鱼跳板。encodeURIComponent 只改变表示，不判断可信。使用 `new URL(raw, trustedBase)` 解析，再限制协议、origin 与允许路径；拒绝 javascript、协议相对、用户名混淆和未知外站。

允许外部合作方时用配置化精确 origin/路径，并处理 IDN、端口和 HTTPS。前端与服务端重定向端点都要验证，不能只在按钮点击前检查。

记录拒绝类别而不保存完整敏感 URL。正常路径、绝对同源、相对路径、编码变体和攻击路径都测试。

### 八、CSRF 利用浏览器自动携带身份

**跨站请求伪造（Cross-Site Request Forgery, CSRF）**让受害者浏览器在已有会话下向可信站点发出攻击者指定的写请求。攻击者不一定能读取响应，副作用仍可能发生。CORS 不能阻止普通 form、导航和所有简单请求。

服务端对写操作使用非 GET 方法，验证与会话绑定的 CSRF token，并检查 Origin/Referer 或 Fetch Metadata 作为纵深。SameSite、Secure、HttpOnly 与 `__Host-` Cookie 缩小风险，但不单独覆盖所有部署、子域与浏览器场景。

XSS 能在同源读取 token 并发请求，所以 CSRF token 不能修复 XSS。反之，没有 XSS 也不代表无需 CSRF。

### 九、认证、CSRF 与授权是不同门

认证回答“主体是谁”，CSRF 防护回答“请求是否来自允许的交互源”，授权回答“这个主体能否对这个资源执行此动作”。三者都通过才产生业务副作用。

隐藏 approve 按钮、路由 guard 和客户端 role 字段只改善体验。攻击者能直接构造请求，服务端必须按最新会话、资源归属、角色、状态和版本重新判断。对象级授权缺失会形成 IDOR/BOLA，即使页面完全无 XSS。

幂等键防网络重放，不能替代 CSRF 或授权；CORS 允许读响应，也不能替代授权。安全评审把每道门写成独立断言。

### 十、SameSite 与站点/源边界不能混淆

SameSite 基于 site 语义，不等同 origin。两个子域可能 same-site 但 cross-origin；被接管的子域会影响依赖站点边界的假设。Cookie Domain 放宽也把更多子域加入发送范围。

Lax、Strict、None 的具体发送情形与浏览器默认会演进，应按当前平台文档和部署拓扑核验。`SameSite=None` 需要 Secure。高风险系统仍使用 token、origin 检查与服务端授权，而不是只依赖浏览器默认。

### 十一、客户端存储和日志都在脚本信任域

localStorage、sessionStorage、IndexedDB 与可读 Cookie 都可被同源 XSS 访问。HttpOnly 防读取，但恶意脚本仍可能借 Cookie 调用同源接口。不要在前端包、URL、Source Map、日志或错误上报保存长期秘密。

日志与 HAR 可能包含 Authorization、Cookie、个人数据、富文本和攻击 payload。采集前结构化字段、限制长度、脱敏并设置留存/访问控制。把完整危险 HTML 展示在内部控制台也可能形成二次 XSS。

前端环境变量在构建后通常进入公开制品，不能当秘密。真正的服务凭据留在受控服务端。

### 十二、第三方脚本等同页面脚本权限

统计、客服、标签管理和 A/B SDK 在页面上下文执行时，通常能读 DOM、调用同源接口和修改导航。来源域名允许不等于脚本内容永远可信；供应链账号、更新和加载器也可能受攻击。

建立第三方 owner、用途、数据访问、版本、完整性/隔离方式、失效与退出计划。能放进 sandboxed iframe 的内容不要给同源脚本权限。CSP、SRI 和 Trusted Types 属于纵深，仍需减少数量和权限。

### 十三、点击劫持与嵌入属于另一条边界

攻击者可把页面放入透明 iframe 诱导点击，这不是 XSS 或 CSRF 的同义词。使用 CSP `frame-ancestors` 限制谁能嵌入，旧系统还可能使用 X-Frame-Options。必须允许嵌入时，通过明确 origin、sandbox、Permissions Policy 与可视确认设计。

浮层、z-index 或 JavaScript frame busting 不可靠。高风险操作仍要求明确对象、影响和必要再认证。

### 十四、浏览器防线是纵深而非替代

CSP 能限制脚本来源和注入执行，Trusted Types 能约束 DOM XSS sink，SRI 能验证固定第三方资源，COOP/COEP 能改变跨源上下文，Permissions Policy 能限制功能。每项阻断的链路不同。

防线部署前先修 source—sink，随后用浏览器策略限制剩余错误和供应链风险。若策略只能通过 `unsafe-inline`、`unsafe-eval` 或广泛 `*` 才运行，说明迁移尚未完成，不能称为严格策略。

### 十五、攻击回归按不变量组织

测试普通文本、富文本、URL、命名元素、危险对象路径、跨站写请求和越权直调。每项同时有恶意输入与正常路径，观测 DOM、网络、共享原型、导航、服务端状态与拒绝日志。

不变量包括：不可信内容不进入可执行 sink；导航只到允许目标；任一级危险键不改变共享原型；无 token/错误 origin 写请求无副作用；无权限主体即使直接请求也被拒绝；日志不泄露原始秘密。

修复一个 payload 后跑完整矩阵，防止净化配置或合并函数修改造成回归。自动测试外还做依赖更新、浏览器差异和手工威胁复核。

### 十六、安全缺陷响应保留证据并缩小影响

发现疑似 XSS 或越权时先阻断高风险入口、轮换可能泄露会话、保存脱敏日志与受影响版本，再修复根因。只删除 payload、清缓存或关掉按钮会破坏证据且不解决通用路径。

复盘记录 source、transform、sink、缺失边界、为何现有测试未发现、影响窗口和长期控制。安全修复可能需要内容重净化、会话吊销、第三方移除和用户通知，范围由证据决定。

安全评审还要追踪代码之外的内容和配置入口：CMS 模板、远程功能开关、翻译文本、营销标签与客服脚本都可能绕过正常代码评审进入页面。它们必须经过相同的 schema、净化、发布审批和回滚流程；“不在 Git 仓库里”并不会降低脚本上下文的权限。

### 学完后应能说明

你应能以威胁模型和 source—transform—sink 分析 XSS、DOM clobbering、原型污染、开放重定向与 CSRF，按上下文选择编码、净化、schema、URL allowlist 和服务端授权；能解释 Cookie/CORS/CSRF/认证/授权的独立责任，并用正常与攻击路径证明安全不变量。
