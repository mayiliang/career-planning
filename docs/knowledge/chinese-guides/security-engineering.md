# 浏览器安全工程中文核心讲义

## SEC-01

### 1. 用 Source—Transform—Sink 描述安全问题

- **Untrusted Input（不可信输入）**：攻击者能直接或间接控制的数据，如 URL、Markdown、表单、接口响应、`postMessage` 与对象键。
- **Source（来源）**：不可信数据进入程序的位置，如 `location.search`、JSON body。
- **Transform（转换）**：解析、拼接、编码、净化、合并或默认值处理。
- **Sink（汇）**：数据产生安全影响的位置，如 `innerHTML`、script URL、导航 URL、对象属性写入和服务端授权决策。
- **Trust Boundary（信任边界）**：数据从低信任区域进入高影响操作前必须被验证/编码/拒绝的位置。
- **Threat Model（威胁模型）**：说明资产、攻击者能力、入口、影响和信任假设，不是 Payload 清单。
- **Defense in Depth（纵深防御）**：多层防线各自阻断不同链路；不是用 CSP、SameSite 或“已经登录”替代所有控制。

固定数据流图：

```text
Markdown ─解析─> HTML 字符串 ─innerHTML─> 可执行 DOM             [XSS]
HTML id/name ─DOM named access─> window.redirectTo ─导航─> 外站 [DOM Clobbering]
JSON key ─递归 merge─> Object.prototype/config ─授权默认值─> admin [Prototype Pollution]
evil.test 页面 ─自动 Cookie─> /transfer ─服务端决策─> 转账       [CSRF/授权]
next 参数 ─URL 解析─> location.assign ─导航─> evil.test          [Open Redirect]
```

### 1.1 适用条件与场景

本讲义适用于会接收 URL、Markdown、表单、接口响应、第三方消息或动态对象键的浏览器应用，也适用于需要转账、审批、导航和按角色授权的前后端协作功能。只要数据会从外部输入跨过信任边界，进入 DOM、导航、对象合并或服务端业务操作，就应使用本点的数据流图与攻击回归矩阵；纯静态且没有外部输入的展示页风险较低，但引入内容管理、登录态或第三方脚本后必须重新建模。

### 2. XSS：按输出上下文选防线

XSS（Cross-Site Scripting，跨站脚本）不是“出现 `<script>` 字符串”，而是不可信数据被浏览器当成可执行 HTML/JavaScript/URL/CSS。不同解析上下文不能共用一种转义：

| 目标 | 首选 | 反例 |
| --- | --- | --- |
| 显示普通文本 | `textContent`、框架默认文本插值 | `innerHTML = input` |
| 固定安全属性 | 固定属性名 + `setAttribute`/DOM property，值做类型/枚举校验 | 不可信 `onclick`、动态属性名 |
| URL 查询值 | `new URL()` + 协议/源/路径校验；参数用 `URLSearchParams` | 只做 URL encode 后允许 `javascript:` |
| 允许有限富文本 | 维护中的 HTML Sanitizer（净化器）+ 明确配置 + 净化后不再拼接 | 用正则删除 `<script>` |
| JavaScript/CSS 源码上下文 | 不把不可信数据插入源码；改为数据属性/JSON/DOM API | 依赖一次通用 HTML encode |

Markdown fixture 为 `<img src=x onerror=alert(1)>`。若产品只需显示源码，直接：

```js
preview.textContent = markdown;
```

若产品要渲染富文本，应从 Markdown AST（Abstract Syntax Tree，抽象语法树）创建允许的 DOM 节点，或用经过版本治理的净化器处理完整结果；图片 URL 仍需单独限制协议。净化后的字符串再拼进 `innerHTML` 或交给会修改它的库，会破坏净化保证。

固定回归不以 `alert` 是否出现为唯一判断：断言 DOM 中不存在事件属性/脚本节点，网络没有未知源请求，普通粗体/链接仍能工作。

### 3. DOM Clobbering：HTML 也能改变 JavaScript 取值

DOM Clobbering（DOM 命名遮蔽）利用带 `id`/`name` 的 HTML 元素进入 `window`/`document` Named Property Access（命名属性访问），覆盖应用期望读取的同名全局配置。

不使用不稳定的 `id=location` 证明；固定 fixture 使用官方机制可解释的应用名：

```html
<a id="redirectTo" href="https://evil.test">继续</a>
```

危险代码：

```js
const target = window.redirectTo || '/profile';
location.assign(target);
```

安全代码让配置来自模块局部常量/显式参数，并验证最终 URL：

```js
function sameOriginPath(raw, fallback = '/profile') {
  if (typeof raw !== 'string') return fallback;
  const url = new URL(raw, location.origin);
  if (url.origin !== location.origin) return fallback;
  if (!url.pathname.startsWith('/account/')) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}

const redirectTo = sameOriginPath(serverConfig.redirectTo);
```

避免裸标识符和 `window.foo` 作为安全配置；使用 `const/let`、模块作用域、显式 DOM 查询、类型/实例检查。净化器的 DOM-clobbering 配置和 CSP 是纵深层，不能修复错误的全局读取。

### 4. Prototype Pollution：危险的是“路径写入共享原型”

Prototype（原型）是对象属性查找链的一部分。Prototype Pollution（原型污染）发生在攻击者控制的键被递归写入 `__proto__` 或 `constructor.prototype` 等路径，进而影响其他对象。

对象字面量 `{__proto__: {...}}` 有特殊语法，不能稳定代表 JSON 输入。固定攻击应明确为：

```js
const payload = JSON.parse('{"__proto__":{"admin":true}}');
unsafeDeepMerge(config, payload);
```

危险递归合并可能执行 `target['__proto__'] = ...` 或沿 `constructor.prototype` 写入。合格边界在解析/递归的每一级拒绝危险段，而不只是顶层：

```js
const forbiddenKeys = new Set(['__proto__', 'prototype', 'constructor']);

function safeMerge(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (forbiddenKeys.has(key)) throw new TypeError(`拒绝危险键: ${key}`);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const current = Object.hasOwn(target, key) ? target[key] : undefined;
      target[key] = safeMerge(
        current && typeof current === 'object' ? current : Object.create(null),
        value,
      );
    } else {
      target[key] = value;
    }
  }
  return target;
}
```

枚举表/字典优先用 `Map`、`Set` 或 `Object.create(null)`；配置按 Schema Allowlist（模式白名单）只接受已知键和类型。`Object.freeze(Object.prototype)` 可能破坏库且挡不住所有路径，只是特定环境的纵深措施。

回归必须在隔离进程/页面运行，并断言：`({}).admin === undefined`、`config.admin !== true`、正常嵌套键仍能合并、`constructor.prototype` 变体也被拒绝。

### 5. Open Redirect：编码不能决定 URL 是否可信

Open Redirect（开放重定向）允许不可信 `next` 决定导航目标，常被用于钓鱼或把可信站点当跳板。`encodeURIComponent` 只编码一个参数，不会把外站 URL 变成可信 URL。

```js
function safeNext(raw) {
  try {
    const url = new URL(raw, location.origin);
    if (url.origin !== location.origin) return '/';
    return ['/dashboard', '/account'].includes(url.pathname) ? url.pathname : '/';
  } catch {
    return '/';
  }
}
```

固定 `next=https://evil.test` 必须回退 `/`；`next=/account` 正常通过；`javascript:`、协议相对 URL、用户名混淆 URL 都拒绝。服务端重定向端点也要执行同样的业务 allowlist，不能只信前端。

### 6. CSRF 与服务端授权是两道门

CSRF（Cross-Site Request Forgery，跨站请求伪造）利用浏览器自动携带 Session Cookie，让受害者浏览器向可信站点发出攻击者指定的写请求。CORS 不阻止普通 HTML form 发请求；“攻击者读不到响应”不等于副作用没有发生。

固定转账请求必须在服务端验证：

1. 当前会话已认证且有该账户转账权限；
2. 方法为 POST，不用 GET 改状态；
3. CSRF Token（CSRF 令牌）与当前会话绑定、从表单字段/自定义 header 显式提交且服务端校验；
4. `Origin`/`Referer` 或 Fetch Metadata 与预期源一致，作为纵深防御；
5. 高风险金额再次认证/确认业务主体与影响；
6. 使用幂等键防止网络重放，但幂等键不能替代 CSRF/授权。

SameSite Cookie、`__Host-` 前缀和自定义 header 都是辅助层。XSS 可以读取页面 token 并同源发请求，因此修复 XSS 仍是前提。服务端伪代码：

```js
function authorizeTransfer(request, session) {
  if (!session?.userId || !session.permissions.includes('transfer')) return 403;
  if (request.method !== 'POST') return 405;
  if (request.headers.origin !== 'https://app.test') return 403;
  if (!constantTimeEqual(request.headers['x-csrf-token'], session.csrfToken)) return 403;
  return 204;
}
```

隐藏/禁用 approve 按钮只是交互，不是授权。攻击者可直接构造请求；服务端必须对无权限用户返回 403，并且不产生业务副作用。

### 7. 敏感信息与客户端鉴权边界

- 不把 Token、密钥、完整用户对象、支付信息写入 URL、日志、错误报告或公开 HAR。
- `HttpOnly` Cookie 不能被普通脚本读取，但 XSS 仍可用受害者身份发同源请求。
- Local Storage/IndexedDB 对同源脚本可读，不是秘密保险箱。
- 前端路由守卫、隐藏按钮和角色字段只改善体验；最终对象级与动作级授权由服务端根据当前身份和资源重新判断。
- 登录、续期、退出和吊销的完整生命周期属于 `IDENTITY-01`，本点只验证数据是否越过 sink/授权边界。

### 8. 固定攻击回归矩阵

| 攻击 | 必须观测的阻断点 | 正常路径 |
| --- | --- | --- |
| Markdown `<img onerror=...>` | 不进入可执行 sink；DOM 无 onerror/未知请求 | 普通 Markdown 文本或允许的富文本可读 |
| `<a id=redirectTo ...>` | 导航只读模块配置并做同源/路径校验 | `/account` 可导航 |
| JSON `__proto__` / `constructor.prototype` | 任一级键校验拒绝；共享原型不变 | 已知配置键可合并 |
| `next=https://evil.test` | URL allowlist 回退 `/` | 同源允许路径通过 |
| evil origin 无 token 转账 | 服务端 403、余额不变、记录脱敏拒绝原因 | 正确 origin+token+权限只执行一次 |
| 隐藏按钮后直调接口 | 服务端 403，与 DOM 状态无关 | 授权账号完成操作 |

受限排错“预览执行 handler、merge 后 `config.admin=true`、隐藏按钮仍可请求”只查 DOM sink、危险路径拒绝、服务端授权/CSRF 三组。每组先保存攻击前后状态，再修复并跑全部矩阵，不能只让一个 Payload 失效。

### 9. 自检

- HTML encode 为什么不能让任意 URL 或 JavaScript 上下文安全？
- DOM Clobbering 为什么即使脚本标签被过滤仍可能危险？
- `JSON.parse` 本身为何不等于原型污染，污染在哪一步发生？
- SameSite、CORS、CSRF token、服务端授权分别阻断什么？
- 为什么隐藏按钮和客户端 `admin=true` 都不能作为授权证据？

能用数据流图、阻断日志和正常/攻击双路径回答，才算掌握 SEC-01。

## SEC-02

### 1. 定义、术语与适用场景

- **Content Security Policy（内容安全策略，CSP）**：由服务器通过响应头声明“这个页面允许加载或执行什么”的浏览器防线。它是纵深防御，不会修复已经存在的 XSS、错误授权或不安全净化。
- **Directive（指令）**：策略中的控制项，如 `script-src`、`object-src`、`base-uri`、`frame-ancestors`。
- **Source List（来源列表）**：某条取数指令允许的源或条件。广泛域名白名单常因第三方内容、JSONP 或供应链变化而失效，不等于脚本可信。
- **Nonce（一次性随机数）**：服务器为每个 HTML 响应生成的不可预测值，同时写入 CSP 与获准的 `<script nonce="…">`。这里不是密码学通信协议中的 nonce，也不是 CSRF token。
- **Hash（散列许可）**：把脚本内容的加密散列写入策略，内容变更时必须重新计算；更适合静态 HTML。
- **`strict-dynamic`（严格动态信任传播）**：带正确 nonce/hash 的脚本可继续加载后代脚本；它减少脆弱的主机白名单，但也意味着被信任的加载器必须安全。
- **Report-Only（仅报告）**：使用 `Content-Security-Policy-Report-Only` 观察将会发生的违规，不实际阻断。
- **Enforce（强制）**：使用 `Content-Security-Policy` 真正阻断违规。
- **Trusted Types（可信类型）**：让 DOM XSS 注入点只接收经命名 Policy（策略）生成的 `TrustedHTML`、`TrustedScript` 或 `TrustedScriptURL`。它不提供净化算法，安全性取决于团队定义的转换函数。
- **Injection Sink（注入汇）**：会把字符串解释为 HTML、JavaScript 或脚本 URL 的 API，例如 `innerHTML`、`document.write()`、`eval()`、`script.src`。
- **Violation Report（违规报告）**：浏览器向收集端点发送的策略违规记录；它可能重复、缺字段、被伪造或受扩展影响，不能单独证明攻击或阻断成功。

本点适用于含动态脚本、第三方 SDK、富文本预览、遗留 `innerHTML` 或多团队共享页面模板的 Web 应用。纯静态页面也可部署严格 CSP，但若无法为每个响应动态注入 nonce，应改用 hash，不应缓存并复用同一个 nonce。

### 2. 从 Report-Only 到 Enforce 的策略梯子

固定实验把 `n1` 当作单次响应的可读占位值；真实代码必须使用密码学安全随机源，为**每一个 HTML 响应**生成不同且不可预测的值。响应、HTML 与加载器必须来自同一次渲染：

```http
Reporting-Endpoints: csp-endpoint="https://app.test/_/csp-reports"
Content-Security-Policy-Report-Only: default-src 'self'; script-src 'nonce-n1' 'strict-dynamic'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; require-trusted-types-for 'script'; trusted-types markdown; report-to csp-endpoint; report-uri /_/csp-reports
```

```html
<script nonce="n1" src="/assets/boot.js"></script>
<script nonce="n1" src="https://legal-sdk.test/sdk.js"></script>
<script nonce="n0" src="/assets/stale.js"></script>
<script src="https://evil.test/payload.js"></script>
```

`Reporting-Endpoints` 把 `csp-endpoint` 名称绑定到接收 URL，`report-to` 引用这个名称。`report-uri` 是兼容旧实现的回退；并用两种报告机制时服务端可能收到重复记录，必须去重。`frame-ancestors` 与完整报告能力要求 HTTP 响应头，不能把生产策略只放在 `<meta>`。

上线顺序：

1. 整理所有脚本、DOM sink 和第三方 owner（责任人），先在测试环境让合法路径使用 nonce/policy。
2. 生产部署 Report-Only，按发布版本、路由与浏览器分桶观察；修复合法违规，不为消除噪声加入 `unsafe-inline`、`unsafe-eval` 或 `*`。
3. 对登录、支付等高风险路由先强制；保持一个较新的 Report-Only 策略做下一轮探测。
4. 观察窗口内合法路径无阻断，攻击 fixture 均能产生预期证据后，把同一基线改为强制头：

```http
Content-Security-Policy: default-src 'self'; script-src 'nonce-n1' 'strict-dynamic'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; require-trusted-types-for 'script'; trusted-types markdown; report-to csp-endpoint; report-uri /_/csp-reports
```

强制头与仅报告头可以同时存在，各自独立生效。不能因为“控制台没有报错”就判定策略正确：自动化还要检查响应头、脚本执行计数、网络请求和收集端报告。

### 3. Nonce、`strict-dynamic` 与缓存机制

服务器端伪代码强调同一次渲染：

```js
function renderPage(request) {
  const nonce = crypto.randomBytes(16).toString('base64url');
  return {
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Security-Policy': buildCsp(nonce),
    },
    body: renderHtml({ nonce }),
  };
}
```

若 CDN 缓存 HTML，有两种合格路线：缓存 nonce 注入前的模板并在可信边缘为**每个响应**同时改写头和标签；或改用内容 hash 的静态严格 CSP。绝不能让 HTML 标签仍是 `n0`、响应头已经是 `n1`，也不能把同一 nonce 当成长期常量缓存。

在支持 CSP3 的浏览器中，`'strict-dynamic'` 会把 nonce/hash 的信任传给可信脚本创建的后代脚本，并使传统 host source 的含义发生变化。合法 SDK 可以自身带 `nonce="n1"`，也可由带 nonce 的、经过审查的 `boot.js` 以固定 URL 加载；未知 `evil.test` 没有这条信任链就应阻断。若可信加载器把用户输入直接当脚本 URL，信任也会被错误传播，所以加载器仍需 URL allowlist、版本锁定和 owner。

### 4. Trusted Types Policy 不是万能通行证

固定 Markdown 预览只允许一个命名策略 `markdown`：

```js
const rules = {
  createHTML(input) {
    return sanitizeMarkdownHtml(input, {
      allowedTags: ['p', 'strong', 'em', 'code', 'pre', 'a'],
      allowedAttributes: { a: ['href'] },
      allowedProtocols: ['https:', 'http:'],
    });
  },
};

const markdownPolicy = globalThis.trustedTypes
  ? trustedTypes.createPolicy('markdown', rules)
  : rules;

preview.innerHTML = markdownPolicy.createHTML(renderMarkdown(markdownSource));
```

`sanitizeMarkdownHtml` 代表一个经过版本治理和攻击回归的净化器，不可用正则临时替代。CSP 中的 `trusted-types markdown` 只允许创建这个名字的 policy；`require-trusted-types-for 'script'` 让受保护的 sink 接收普通字符串时抛出 `TypeError`。

不要创建返回原字符串的 Policy，也不要把 `default` Policy 作为永久兜底。Default Policy（默认策略）会拦截遗留字符串写入，适合迁移时记录/拒绝遗漏；若它无条件放行，便把强制机制变成全局绕过。对 JavaScript/脚本 URL sink 应优先停用，或只允许固定枚举，而不是把 HTML 净化结果复用过去。

不支持 Trusted Types 的浏览器会忽略相应 CSP 指令，所以应用仍必须走同一个 `rules.createHTML()` 净化路径，并继续使用 `textContent`、DOM API 和上下文编码。支持环境的强制测试用于证明没有旁路；旧环境的安全不应依赖 API 是否存在。

### 5. 违规报告的脱敏、去重与归属

报告接收端对外开放，先限流、限制 body 大小与 Content-Type，再按下列字段归一化：

```text
dedupeKey = release
          + routeTemplate
          + effectiveDirective
          + blockedOrigin
          + sourceFileKey
          + userAgentBucket
```

- `blocked-uri` 跨源时通常只保留协议、主机和端口；服务端再次去掉 path、query、fragment，避免 token 和用户标识进入日志。
- `document-uri` 只保留路由模板，如 `/courses/:courseId`；`source-file` 映射为受控制品键，不保存带签名的 Source Map URL。
- `script-sample` 可能含页面数据，默认关闭或清洗；release、策略版本、disposition（`report`/`enforce`）由服务端可信上下文补充。
- 同一 dedupeKey 在一个时间窗只保留计数与首末时间，例如每 5 分钟最多一条明细；采样率、扩展/爬虫桶和发布前后变化必须可见。
- 第三方清单至少记录 SDK 名称、业务用途、脚本入口、加载方式、数据权限、owner、到期复审日和下线开关。无人负责的脚本不应进入 nonce 信任链。

报告是遥测，不是授权输入，也不能自动证明存在攻击。验收必须把浏览器控制台、Network、脚本副作用和服务端聚合记录放在同一 fixture 中比对。

### 6. `upgrade-insecure-requests` 的边界

```http
Content-Security-Policy: upgrade-insecure-requests
```

该指令在请求发出前把页面中的不安全子资源 URL 从 `http:` 改写为 `https:`，适合大量遗留 URL 的 HTTPS 迁移。如果目标没有 HTTPS，加载会失败，不会回退到 HTTP；高破坏风险的第三方顶层导航也不会因此全部升级。

它不能替代 HSTS（HTTP Strict Transport Security，HTTP 严格传输安全）、证书治理、Mixed Content（混合内容）清理或 SRI（Subresource Integrity，子资源完整性），本点也不展开这些独立主题。可用 Report-Only 发现仍不支持 HTTPS 的资源，但最终仍要修正源地址和资产 owner。

### 7. 固定实验、失败边界与验证证据

| Fixture | Report-Only 证据 | Enforce 证据 | 正常对照 |
| --- | --- | --- | --- |
| 合法 SDK + `nonce=n1` | 无违规；启动标记为 1 | 请求 200，启动一次 | owner、版本、入口可追踪 |
| 本页 CSP 为 `n1`、缓存标签为 `n0` | `script-src-elem` 报告；定位 cache variant | `stale.js` 被阻断，启动标记为 0 | 同响应头/HTML 都是 `n1` 后恢复 |
| `https://evil.test` 无 nonce | 产生仅含安全 blocked origin 的报告 | 无网络成功/无脚本副作用 | 未扩大 allowlist |
| 字符串写 `innerHTML` / `markdown` policy | Trusted Types 违规或迁移日志 | 裸字符串抛 `TypeError`；净化后的 `TrustedHTML` 可渲染 | 普通粗体、代码和安全链接仍工作 |

受限排错固定日志为“缓存返回 `n0`、合法 SDK 被拦、同页报告 100 条”。只查三组证据：

1. nonce 缓存：比较响应头、HTML 标签、CDN cache key 与 origin/edge 实际制品；
2. policy 来源：确认是脚本缺正确 nonce、可信加载器未创建后代，还是 Trusted Types policy 名称/转换失败；
3. 报告去重：比较原始接收数、归一化 key、窗口计数和两种报告机制的重复。

修复后必须重跑四 fixture，并保存响应头、请求/控制台记录、脚本副作用计数、脱敏聚合样例和 owner 清单。长期 Report-Only、`unsafe-inline`、`unsafe-eval`、全站通配来源、复用 nonce、返回原文的 policy 或只看控制台，均直接判为不合格。

### 8. 自检

- nonce 为什么必须同时绑定当前响应头与当前 HTML？静态缓存该如何改用 hash？
- `strict-dynamic` 为什么既能减少 allowlist，又会放大不安全加载器的影响？
- Trusted Types 与净化器分别负责什么？为什么默认 Policy 不能长期无条件兜底？
- Report-Only、Enforce、浏览器报告和自动攻击回归分别提供什么证据？
- `upgrade-insecure-requests` 为什么不是 HSTS，也不是第三方资源完整性方案？

能用四 fixture 的响应头、网络、控制台、脚本副作用与脱敏聚合记录回答，才算掌握 SEC-02。

## SEC-04

### 1. 先分清 Origin、Site 与浏览上下文

- **Origin（源）**：`scheme + host + port` 的组合。`https://app.test` 与 `https://api.app.test` 是不同源，`http://app.test` 与 `https://app.test` 也不同源。
- **Site（站点）**：浏览器安全模型中通常按 scheme 与可注册域归组；同站不等于同源，DOM 访问和 CORS 仍按源判断。
- **Browsing Context（浏览上下文）**：页面、iframe、tab 或 popup 的执行环境。
- **Browsing Context Group（浏览上下文组，BCG）**：可以保存窗口引用并相互脚本访问的一组顶层上下文。COOP 会决定新页面是否进入另一个 BCG。
- **Cross-Origin Isolation（跨源隔离）**：浏览器确认当前上下文组与嵌入资源满足隔离条件后，开放 `SharedArrayBuffer` 等高精度能力。它是一项可检测的运行状态，不是“配置了两个头就一定成功”。
- **XS-Leaks（跨站泄漏）**：攻击者通过窗口引用、加载成功/失败、尺寸、时间等可观察差异推断跨站状态；即使读不到响应正文也可能泄漏信息。
- **UI Redressing（界面重定向攻击，常见为 Clickjacking/点击劫持）**：恶意父页透明或错位嵌入目标页面诱导点击；由被嵌入页面限制祖先，而不是靠子 iframe 的 `sandbox` 解决。

本点适用于需要 WebAssembly 多线程/高精度计时、跨源图片/脚本、合作方 iframe、支付 popup 或 `postMessage` 集成的应用。若没有隔离能力需求，不要为了“看起来更安全”盲目开启 COOP/COEP：它会改变弹窗引用和第三方资源加载，必须先建立兼容清单与降级路径。

### 2. COOP、COEP、CORP 与 CORS 各管一层

| 机制 | 原名与中文 | 决定什么 | 不负责什么 |
| --- | --- | --- | --- |
| COOP | Cross-Origin-Opener-Policy（跨源打开者策略） | 顶层页面与 opener 是否留在同一 BCG，是否保留窗口引用 | 不决定图片/脚本能否加载 |
| COEP | Cross-Origin-Embedder-Policy（跨源嵌入者策略） | 当前文档能否嵌入没有明确配合的跨源资源 | 不授予脚本读取跨源响应正文 |
| CORP | Cross-Origin-Resource-Policy（跨源资源策略） | 资源响应声明允许哪些站点/源以 `no-cors` 方式嵌入 | 不替代 CORS 的可读响应授权 |
| CORS | Cross-Origin Resource Sharing（跨源资源共享） | `cors` 请求的目标服务是否允许调用源读取响应 | 不是登录授权、CSRF 或 UI 权限策略 |

固定 `https://app.test/lab` 的隔离响应：

```http
Reporting-Endpoints: coep-endpoint="https://app.test/_/coep-reports"
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp; report-to="coep-endpoint"
Permissions-Policy: cross-origin-isolated=(self), camera=(), microphone=(), fullscreen=(self "https://partner.test")
Content-Security-Policy: frame-ancestors 'self'; frame-src https://partner.test
```

随后用运行时事实验收：

```js
const isolation = {
  isolated: globalThis.crossOriginIsolated === true,
  hasSharedBuffer: typeof SharedArrayBuffer === 'function',
};
```

只有两项同时为真才进入 SAB 路径。浏览器还可能因祖先页面、重定向、中间响应、子资源或 `Permissions-Policy: cross-origin-isolated` 失败而没有隔离，不能只检查服务器配置文件。

### 3. `require-corp`、`credentialless` 与资源修复

`Cross-Origin-Embedder-Policy: require-corp` 下，跨源 `no-cors` 资源必须通过适当的 CORP 响应头明确同意，或改成 `cors` 模式并通过目标服务的 CORS 校验。固定无 CORP 图片：

```html
<img src="https://partner.test/chart.png" alt="趋势图" />
```

它被阻断时有三种合格决策：

1. 资源服务返回 `Cross-Origin-Resource-Policy: cross-origin`，确认内容本就允许任意站点嵌入；
2. 页面使用 `crossorigin="anonymous"`，资源服务返回精确 CORS 头，改走 `cors`；
3. 资产确实不能公开嵌入，则保持阻断并换成同源代理/自有资产，代理还要重新执行授权、缓存和内容类型校验。

不要在不理解数据含义时把所有资源改为 `CORP: cross-origin`。

`Cross-Origin-Embedder-Policy: credentialless` 允许跨源 `no-cors` 资源不带显式 CORP 加载，但请求会省略 Cookie 等凭据，响应中的凭据也会忽略；其他模式仍按 `require-corp`/CORS 处理。它适合不依赖登录态的公开资源或特定兼容迁移，不适合需要合作方 Cookie 的个性化 iframe。支持范围要通过能力矩阵和真实浏览器测试确认，不能静默从 `require-corp` 降级到 `unsafe-none`。

### 4. iframe 的三把锁不能互相替代

固定合作方组件：

```html
<iframe
  id="partner"
  src="https://partner.test/embed"
  sandbox="allow-scripts allow-same-origin"
  allow="camera 'none'; microphone 'none'; fullscreen https://partner.test"
  referrerpolicy="strict-origin-when-cross-origin"
  title="合作方报表"
></iframe>
```

- `sandbox`（沙箱）默认撤销脚本、表单、导航、popup 与原源身份等能力，再逐项用 token 恢复。这里为了让精确 `postMessage` origin 可判定而保留 `allow-same-origin`；同源不可信内容不得同时取得 `allow-scripts allow-same-origin`，否则可能移除自己的 sandbox。
- `allow` 与父页面 `Permissions-Policy` 控制 camera、microphone、fullscreen 等功能。父头与 iframe 属性取更严格交集；子框架不能重新开启父级已经关闭的功能。
- CSP `frame-ancestors` 由**被嵌入页面**声明谁能嵌入它；`frame-src` 由父页声明自己能嵌入谁。二者方向相反。

Permissions Policy（权限策略）只决定页面是否有资格调用功能；Permissions API（权限 API）与用户授权仍是另一关。策略禁止 camera 时，子页面甚至不应弹出用户授权请求。

### 5. `postMessage` 要同时校验 origin、source 与 Schema

Schema（模式）是消息字段、类型与允许值的契约。只校验 `event.origin` 不足以区分同源多个窗口，只校验数据形状也挡不住 `evil.test`：

```js
const frame = document.querySelector('#partner');
const partnerOrigin = 'https://partner.test';

function parseReady(data) {
  if (!data || typeof data !== 'object') return null;
  if (data.version !== 1 || data.type !== 'ready') return null;
  if (Object.keys(data).some((key) => !['version', 'type'].includes(key))) return null;
  return { version: 1, type: 'ready' };
}

window.addEventListener('message', (event) => {
  if (event.origin !== partnerOrigin) return;
  if (event.source !== frame.contentWindow) return;
  const message = parseReady(event.data);
  if (!message) return;
  markPartnerReady();
});

frame.contentWindow?.postMessage({ version: 1, type: 'init' }, partnerOrigin);
```

发送时把 `targetOrigin` 固定为精确源，不能用 `*`；接收时拒绝 `null` origin、未知版本、额外敏感字段和错误 `event.source`。若产品必须使用产生 opaque/null origin 的严格 sandbox，应重新设计成可信握手/MessageChannel，不得把所有 `null` 消息视为合作方。

### 6. 弹窗、OAC 与 XS-Leaks 边界

`Cross-Origin-Opener-Policy: same-origin` 会把不匹配的跨源 popup 放进新 BCG，`window.open()` 返回的引用可能不可用；这正是隔离的一部分，却可能破坏依赖 popup 句柄的 OAuth/支付流程。需要该集成时，将支付回调放在单独、明确审计的非 SAB 路由，或按需求评估 `same-origin-allow-popups`，不能让高精度隔离页静默放宽并继续假设 `crossOriginIsolated=true`。

`Origin-Agent-Cluster: ?1`（源级代理集群）请求浏览器按源而不是站点划分 agent cluster（代理集群）。它有助于减少同站不同源共享执行资源，但不会产生跨源隔离、不会替代 COOP/COEP，也不是敏感数据的绝对进程沙箱。

COOP 可切断 opener 引用并减少一类 XS-Leaks；仍要避免用可观察的响应大小、状态码和时间差泄漏“用户是否存在/是否登录”，并保护 `postMessage`、BroadcastChannel、Service Worker 与服务端请求。浏览器进程分配也不是应用可以当作机密隔离证明的合同。

### 7. 无隔离降级与兼容迁移

SAB 功能只做性能增强：

```js
async function runAnalysis(input) {
  if (crossOriginIsolated && typeof SharedArrayBuffer === 'function') {
    return runParallelWithSharedBuffer(input);
  }
  return runChunkedWithArrayBuffer(input);
}
```

降级必须给出相同业务结果，可降低速度但不能丢正确性或无提示失败。迁移先用独立实验路由盘点所有脚本、图片、字体、worker、iframe、popup 和重定向；逐资源记录 owner、请求 mode、Cookie 依赖、CORP/CORS 选择与 fallback，再扩大流量。

### 8. 固定攻击与验证矩阵

| Fixture | 必须阻断/降级 | 证据 | 正常对照 |
| --- | --- | --- | --- |
| `app.test` + 合格 COOP/COEP | 无 | `crossOriginIsolated=true`、SAB worker 结果正确 | 去掉 COEP 后走 ArrayBuffer fallback，结果仍同 |
| `partner.test/chart.png` 无 CORP/CORS | 图片阻断且产生 COEP 记录 | Network 原因、脱敏 `blockedURL`/destination/type | 补精确 CORP 或 CORS 后加载 |
| `evil.test` 发送 `{version:1,type:'ready'}` | origin/source 拒绝且 UI 不变 | 拒绝计数与状态快照 | partner 同 Schema 只处理一次 |
| partner iframe 调 camera | 父头/allow 禁止，不弹用户授权 | API 拒绝、浏览器策略面板/自动化结果 | 允许的 fullscreen 按业务手势工作 |
| 恶意父页嵌入 `app.test` | `frame-ancestors` 阻断 | 父页 frame 错误、目标无可点击 UI | self 祖先按策略可嵌入 |
| 无隔离浏览器/路由 | 不创建 SAB、不崩溃 | fallback 截图、业务结果与耗时 | 支持环境走并行路径 |

受限排错固定日志为“partner 图片被 COEP 拦截，`*` 消息被接受，iframe 调用 camera”。只查 CORP/CORS/request mode、`event.origin`+`event.source`+Schema、父 Permissions-Policy 与 iframe `allow` 三组；每次修复都重跑 evil origin、缺 CORP、权限拒绝和 fallback。

### 9. 自检

- 同站为什么仍可能跨源？COOP、COEP、CORP、CORS 分别在哪条边界决策？
- `credentialless` 会丢掉什么？为什么不能用于依赖登录 Cookie 的个性化嵌入？
- `sandbox`、`allow`、`frame-ancestors` 的控制方向为什么不同？
- `postMessage` 为什么必须同时检查 origin、source 与 Schema？
- 隔离页的支付 popup 与 SAB 为什么可能是互斥的产品路线？

能用六 fixture 的响应头、Network、隔离状态、消息拒绝、权限拒绝和 fallback 证据回答，才算掌握 SEC-04。

## SEC-03

### 1. 核心术语与适用场景

- **WebAuthn（Web Authentication API，Web 身份验证 API）**：浏览器、Authenticator（认证器）与 Relying Party（依赖方，RP）协作，用站点绑定的公钥凭证完成注册和认证。
- **Passkey（通行密钥）**：可发现的 WebAuthn 凭证体验，私钥由设备/密码管理器等凭证提供方保护，可能在用户设备间同步；它不是“保存在浏览器里的密码”。
- **Ceremony（仪式/流程）**：一次完整的注册或认证协议往返。Registration Ceremony（注册流程）创建并绑定凭证，Authentication Ceremony（认证流程）用已有凭证产生 Assertion（断言）。
- **Relying Party ID（依赖方标识，RP ID）**：凭证绑定的域范围。它不是任意 URL，也不包含 scheme/port；浏览器会约束它与当前源的关系。
- **Origin（源）**：客户端数据里记录的 `scheme + host + port`，服务端必须与预期值精确匹配。
- **Challenge（质询）**：服务端生成的不可预测一次性字节串，用来把响应绑定到本次请求并阻断重放。固定实验的 `c1` 只是便于阅读的编号，不是生产值。
- **Credential ID（凭证 ID）**：服务端查找公钥记录的非秘密标识。
- **User Handle（用户句柄）**：RP 为账号生成的稳定、不含 PII（Personally Identifiable Information，个人身份信息）的不透明字节标识。
- **User Presence（用户在场，UP）**：用户做了触摸/确认；**User Verification（用户验证，UV）**：认证器用 PIN、生物识别或设备解锁验证了用户。两者不是同一个保证。
- **Attestation（证明）**：注册时关于认证器/凭证来源的额外证明。普通消费者场景通常不需要企业级设备证明；要求 direct attestation 可能增加隐私、兼容和证书治理成本。

本点适用于登录、二次验证和账号设置中的通行密钥注册/管理。它不教授认证器固件、证明证书链格式或自写密码学验证器；生产服务端应使用维护中的 WebAuthn 库，并在本站练习中用明确的模拟检查展示信任边界。

### 2. 注册流程：创建成功不等于绑定成功

固定 RP 为 `app.test`，页面 origin 为 `https://app.test`。注册必须从近期重新验证过的账号会话发起，防止只偷到旧密码/会话的攻击者悄悄添加长期通行密钥。

```text
用户 ─近期再认证─> 服务端 /register/options
服务端 ─challenge c1 + rp + opaque user id─> 前端
前端 ─navigator.credentials.create({publicKey})─> 浏览器/认证器
认证器 ─PublicKeyCredential─> 前端
前端 ─序列化响应─> 服务端 /register/verify
服务端 ─验证 challenge/origin/RP/签名/状态并原子消费 c1─> 绑定公钥
服务端 ─成功 + 安全通知─> 前端/账号所有者
```

生产 challenge 至少使用足够长度的密码学安全随机字节（例如 32 bytes），在服务端绑定账号、ceremony 类型、会话和短过期时间。注册 options 的关键约束：

```js
const publicKey = {
  challenge: decodeBase64url(serverOptions.challenge),
  rp: { id: 'app.test', name: 'Career Atlas' },
  user: {
    id: decodeBase64url(serverOptions.opaqueUserHandle),
    name: serverOptions.accountLabel,
    displayName: serverOptions.displayName,
  },
  pubKeyCredParams: serverOptions.pubKeyCredParams,
  excludeCredentials: serverOptions.existingCredentialIds,
  authenticatorSelection: {
    residentKey: 'required',
    userVerification: 'required',
  },
  attestation: 'none',
};
```

前端不能生成或修改 RP ID、challenge、user handle 与算法策略。`navigator.credentials.create()` resolve 只表示本地获得凭证响应，UI 应进入“服务端验证中”；只有 `/register/verify` 原子完成验证和入库后才显示“创建成功”。若本地创建成功但服务端保存失败，应明确告知未绑定，并在支持环境谨慎使用 Signal API（信号 API）通知凭证提供方未知凭证，不能伪造成功。

### 3. 认证流程：服务端是最终裁判

```text
前端 -> /login/options -> 服务端创建一次性 c1
前端 -> navigator.credentials.get({ publicKey }) -> 得到 assertion
前端 -> /login/verify -> 服务端执行全部验证
服务端 -> 成功后建立会话 -> 前端才进入已登录状态
```

服务端验证模拟器至少记录这些布尔结果：

```js
function verifyAuthentication(record, expected) {
  const checks = {
    challengeExists: expected.challenge.status === 'pending',
    challengeMatches: record.challenge === expected.challenge.value,
    challengeFresh: Date.now() < expected.challenge.expiresAt,
    originMatches: record.origin === 'https://app.test',
    rpIdHashMatches: record.rpId === 'app.test',
    credentialActive: expected.credential.status === 'active',
    userVerified: record.flags.uv === true,
    signatureValid: record.signatureValid === true,
  };

  if (Object.values(checks).every(Boolean)) {
    expected.challenge.status = 'used';
    return { ok: true, checks };
  }
  return { ok: false, checks };
}
```

真实 `rpIdHash` 和签名验证必须交给服务端库；上例只展示决策顺序。成功消费 challenge 与建立登录会话要作为一个受控事务，失败/并发重放都不能产生第二个成功结果。

Signature Counter（签名计数器）异常可以形成风险信号，但同步型/多设备凭证的计数行为不一定严格递增，不能把“计数未增长”单独当作永久封号依据；结合备份状态、凭证元数据、会话风险与再验证处理。

### 4. 为什么抗钓鱼，但不等于完整授权

认证器只会为匹配 RP ID 的站点使用凭证，浏览器又把实际 origin 写入客户端数据，服务端验证二者，因此 `https://evil.test` 无法让 `app.test` 的凭证为它产生可被服务端接受的断言。这降低了把凭证输给仿冒站的风险。

但 Passkey 不会自动解决：账号恢复被社工绕过、已登录会话被劫持、服务端对象级授权错误、恶意浏览器扩展、注册时会话已被攻击者控制。登录只证明“当前凭证完成了认证”，转账、管理他人资源等动作仍要服务端重新授权与必要的 step-up（加强验证）。

### 5. 前端状态机与错误语言

```text
idle
  -> loading-options
  -> prompting-authenticator
  -> verifying-server
  -> authenticated
  -> cancelled | unavailable | recoverable-error | rejected
```

- `NotAllowedError` 可能表示用户取消、超时、没有匹配凭证、窗口失焦或策略限制；不能都提示“你拒绝了生物识别”。
- `AbortError` 表示应用取消/路由离开；使用 AbortController，避免旧 ceremony 回来覆盖新页面。
- 服务端 `challenge used/expired`、origin/RP 不匹配、凭证吊销和签名失败统一向用户显示不泄露账号/安全细节的失败信息，详细原因只写脱敏安全日志。
- 不在服务端成功前写本地“已登录”状态，也不把按钮动画、浏览器 Promise resolve 当成认证证据。

### 6. 能力检测、条件式 UI 与安全回退

Conditional UI（条件式界面）让通行密钥出现在登录表单的自动填充候选中；它是增强项，不能成为唯一登录入口。能力检测优先使用当前浏览器提供的 `PublicKeyCredential.getClientCapabilities()`，旧环境按实际支持回退：

```js
async function getPasskeyCapabilities() {
  if (!globalThis.PublicKeyCredential) return { webauthn: false };
  if (typeof PublicKeyCredential.getClientCapabilities === 'function') {
    return { webauthn: true, ...(await PublicKeyCredential.getClientCapabilities()) };
  }
  return { webauthn: true, conditionalGet: false, passkeyPlatformAuthenticator: false };
}
```

无 Passkey、无条件式 UI、用户取消或当前设备尚未同步时，保留密码 + MFA、另一个通行密钥、安全密钥或经过风控的账号恢复。回退不能泄漏“该邮箱存在/有几个 Passkey”：登录 options、错误文案和响应时间尽量保持一致，服务端做限流和风险检测。

### 7. 同步、丢失、恢复与凭证管理

Passkey 可能由平台提供方跨设备同步，也可能绑定单设备/安全密钥。产品不能承诺“换手机一定自动出现”。账号设置页应允许：

- 列出用户可理解的凭证名称、创建/最近使用时间、同步/设备绑定的可解释状态；不展示原始公钥或敏感内部标识；
- 在近期再认证后添加、重命名、撤销凭证，撤销由服务端立即生效；
- 至少保留两个独立恢复通道，避免只有一个设备/一个 Passkey 时永久锁死；
- 新增/删除通行密钥后向账号所有者发送安全通知，并提供非当前会话的撤销入口；
- 恢复完成后评估旧凭证、旧会话和恢复因子的吊销，不把“恢复了密码”误当成所有 Passkey 自动失效。

生物识别模板通常由设备/认证器本地处理，RP 接收的是签名结果而不是指纹/面部图像；文案不能声称服务器保存了用户生物信息。

### 8. 固定实验、失败边界与验证证据

| Fixture | UI 预期 | 服务端检查/结果 | 证据 |
| --- | --- | --- | --- |
| 注册 `c1` + `app.test` | prompting→verifying→created | c1 pending/match/fresh、origin/RP/UV/signature 全真后绑定一次 | 时序、脱敏 checks、凭证数 +1、通知 |
| 登录 `c1` 首次 | 服务器成功前不跳转 | 原子消费 c1，建立一个会话 | `pending→used`、会话 ID 脱敏 |
| 重放相同 `c1` | 通用失败，可重新开始 | `challengeExists=false`，无新会话 | `challenge used` 日志、会话数不变 |
| `origin=https://evil.test` 或错误 RP | 通用失败 | origin/RP check 失败，其他敏感细节不回显 | 拒绝日志、无会话 |
| 用户取消 | 回到可重试/其他方式 | 不调用 verify 或不改变 challenge 之外的业务状态 | Abort/NotAllowed 分类、无假成功 |
| 无 Passkey/无 conditional UI | 显示传统安全回退 | 防枚举 options/错误、限流生效 | fallback 截图、等价文案/响应桶 |

受限排错固定日志为“UI 显示成功，但服务端拒绝 `challenge used`”。只查 challenge 的生成/绑定/过期/原子消费、RP ID/origin、credential 状态与**服务端最终结果**三组。若前端在 `navigator.credentials.get()` resolve 时就置成功，先修状态机，再证明重放不会建立会话。

### 9. 自检

- Passkey、WebAuthn、认证器、RP、challenge、assertion 分别是什么？
- 为什么 `c1` 只能使用一次，且必须绑定会话、流程和过期时间？
- 浏览器 API resolve 后为什么还不能显示登录成功？
- RP ID/origin 如何降低钓鱼？恢复流程为什么仍可能成为薄弱点？
- 无条件式 UI、无凭证、不同步与用户取消应如何安全回退且不枚举账号？

能用六 fixture 的状态机、服务端模拟 checks、会话计数、威胁表和 fallback 证据回答，才算掌握 SEC-03。

## SEC-05

### 1. 先把常被混淆的术语分开

| 术语 | 原名 | 是否需要密钥 | 主要目标 | 典型反例 |
| --- | --- | --- | --- | --- |
| 编码 | Encoding | 否 | 把数据换成可传输表示，如 UTF-8/Base64url | 把 Base64 当加密 |
| 摘要/哈希 | Digest/Hash | 否 | 得到固定长度指纹，检测内容变化 | 认为 hash 可以解密；直接 hash 密码 |
| 消息认证码 | MAC / HMAC | 共享密钥 | 验证内容未改且来自持有同一密钥的一方 | 把 HMAC 当第三方可验证签名 |
| 数字签名 | Digital Signature | 私钥签名、公钥验签 | 完整性、来源与公开可验证性 | 把公钥放前端就能“签名” |
| 加密 | Encryption | 密钥 | 机密性；AEAD 同时验证完整性 | 只加密不认证；复用 nonce |

**Web Crypto API（Web 密码学 API）** 是浏览器提供的底层密码学原语；`crypto.subtle` 暴露 **SubtleCrypto（底层密码操作接口）**。名字中的 subtle 就在提醒：算法选对但密钥管理、nonce、上下文或协议选错，系统仍可能完全不安全。

本点适用于在明确 Threat Model（威胁模型）下保护本地缓存的一部分、验证服务端签名、或作为端到端协议的浏览器环节。它不适用于用前端秘密替代服务端授权、在 XSS 已完全控制页面后保护当前明文/可调用密钥，或由初级工程师自行设计新密码协议。

### 2. `CryptoKey` 是带策略的句柄

**CryptoKey（密码密钥对象）** 不是普通字符串，关键属性共同构成合同：

- `type`：`secret`（对称密钥）、`public`（公钥）或 `private`（私钥）；
- `algorithm`：AES-GCM、ECDSA 等算法及长度/曲线信息；
- `extractable`：是否允许 `exportKey()` 导出原始材料；
- `usages`：允许 `encrypt`、`decrypt`、`sign`、`verify`、`deriveKey`、`wrapKey` 等哪些操作。

最小权限示例只允许加解密：

```js
const key = await crypto.subtle.generateKey(
  { name: 'AES-GCM', length: 256 },
  false,
  ['encrypt', 'decrypt'],
);
```

`extractable:false` 会让 `exportKey()` 失败，但不会阻止同源 XSS 调用 `crypto.subtle.decrypt(key, ...)`，也不保证跨设备备份。`usages` 能减少误用面，却不能把不可信页面变成 HSM。

- **KMS（Key Management Service，密钥管理服务）**：集中生成、授权、轮换和审计密钥的服务。
- **HSM（Hardware Security Module，硬件安全模块）**：在受保护硬件边界内执行密钥操作，尽量不让关键材料离开硬件。
- 浏览器 `CryptoKey` 不是 KMS/HSM 的替代品；服务端可信根、撤销和跨用户授权仍在服务端/受控密钥域。

### 3. AES-GCM、IV、AAD 与信封

**AES-GCM（Advanced Encryption Standard - Galois/Counter Mode，AES GCM 认证加密模式）** 是 AEAD（Authenticated Encryption with Associated Data，带关联数据的认证加密）。它同时保护密文机密性与完整性。

- **IV / Nonce（初始化向量/一次性数）**：同一 key 下每次加密必须唯一；推荐固定实验使用随机 12 bytes（96 bits）。IV 不必保密，但不可复用。
- **AAD（Additional Authenticated Data，附加认证数据）**：不加密但被认证，用于绑定账号、记录类型、版本等上下文；解密时必须完全相同。
- **Authentication Tag（认证标签）**：GCM 输出的一部分；密文、IV、AAD 或 tag 任一被改，解密应整体失败，不能提交部分明文。
- **Envelope（密码信封）**：把算法、key version、IV、AAD 和 ciphertext 一起保存的结构，不是只存一段密文。

固定信封：

```ts
type Envelope = {
  alg: 'A256GCM';
  keyVersion: 'v1' | 'v2';
  iv: string;
  aad: string;
  ciphertext: string;
};
```

```js
const utf8 = new TextEncoder();

async function encryptSalary(key, keyVersion, usedIvs) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ivText = toBase64url(iv);
  if (usedIvs.has(`${keyVersion}:${ivText}`)) throw new Error('IV reuse');
  usedIvs.add(`${keyVersion}:${ivText}`);

  const aadText = 'user:1';
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: utf8.encode(aadText),
      tagLength: 128,
    },
    key,
    utf8.encode('salary=100'),
  );

  return {
    alg: 'A256GCM',
    keyVersion,
    iv: ivText,
    aad: aadText,
    ciphertext: toBase64url(new Uint8Array(ciphertext)),
  };
}
```

`usedIvs` 是练习中可观察的复用断言；真实系统仍以可靠随机源/计数器设计和 key version 治理保证唯一性，不能把一个页面内 Set 当作跨设备全局证明。

解密必须先按 `keyVersion` 找 key，再使用信封声明且业务允许的算法/IV/AAD。不要让攻击者把 `alg` 改成弱算法触发“算法协商”；本点只允许固定 `A256GCM`。

### 4. 安全随机数、密码与导入导出

- 随机 IV、challenge、临时 ID 使用 `crypto.getRandomValues()`；不要用 `Math.random()`。
- 普通 password 字符串不是 AES key。密码派生需要 PBKDF2/Argon2 等 KDF（Key Derivation Function，密钥派生函数）的 salt、成本和升级协议；Web Crypto 提供 PBKDF2 原语不等于参数自然安全，本点不设计登录密码存储。
- `importKey()` 要同时校验来源、格式（raw/JWK/PKCS#8/SPKI）、算法、用途、可导出性和 key version；导入成功不等于来源可信。
- `exportKey()` 输出未加密密钥材料；需要迁移时使用受控导出或 `wrapKey()`（密钥包装），明确临时权限、审计和清理，不能把生产私钥长期设为可导出只为方便。
- `CryptoKey` 可通过 structured clone（结构化克隆）保存在 IndexedDB，但同源脚本仍可能取得/调用；Local Storage 不能直接保存 CryptoKey，转成字符串反而常迫使密钥可导出。

### 5. 密钥生命周期与轮换回滚

```text
generate/import -> staged -> active -> decrypt-only -> revoked -> removed
```

- **staged（待启用）**：先验证新 key 和服务端版本映射，不用于正常写入；
- **active（启用）**：新信封只用当前版本加密；
- **decrypt-only（仅解密）**：旧版本只读，用于迁移/回滚窗口；
- **revoked（吊销）**：服务端拒绝新操作，安全事件时同时处理会话/设备；
- **removed（移除）**：清除 IndexedDB 记录与引用。JavaScript 无法保证立刻擦除所有内存副本，所以不得声称“变量设为 null 就物理销毁”。

`v1→v2` 轮换协议：

1. 发布并验证 v2，仍保留 v1 decrypt-only；
2. 新写入全部使用 v2；
3. 读取 v1 信封时先完整验证/解密，再以新 IV 和相同业务 AAD 写入 v2 临时记录；
4. 原子切换引用，校验可读性后才清理旧信封；失败保留 v1，记录关联 ID，不记录明文/密钥；
5. 覆盖率、失败率和回滚窗口达标后再吊销/移除 v1。

设备丢失、用户登出、密钥泄漏和常规轮换不是同一事件：登出可移除本地句柄，泄漏要吊销版本并评估数据重加密，设备丢失还要处理服务端设备授权与恢复。

### 6. 浏览器与服务端的威胁边界

| 攻击者能力 | 浏览器加密可降低 | 仍然暴露/需要其他防线 |
| --- | --- | --- |
| 只拿到离线 IndexedDB/备份 | 没有 key 时难读 AES-GCM 密文 | key 恢复、metadata 泄漏、设备授权 |
| 能执行同源 XSS | 很有限 | 可读加密前/解密后明文，也可能调用 CryptoKey；修 XSS/CSP/Trusted Types |
| 窃取服务端数据库 | 端到端协议可能减少明文暴露 | 服务端授权、KMS/HSM、密钥分离、备份/轮换 |
| 修改密文/AAD/IV | GCM 解密应拒绝 | UI 不得显示部分数据，日志要脱敏并告警 |
| 合法用户越权访问他人记录 | 无法自动阻止 | 服务端对象级授权与审计 |

客户端“加密成功/验签成功”从来不是服务端授权依据。服务端验签公钥可放前端用于验证下载内容，但真正影响账户/交易的决定仍由服务端以自己的可信数据重算。

### 7. 固定实验与验证证据

| Fixture | 预期 | 证据 |
| --- | --- | --- |
| `salary=100`、AAD `user:1`、v1、随机 12-byte IV | 解密严格等于原文 | 信封字段、IV 长度、key usages、明文只在断言中出现 |
| 翻转 ciphertext 一位 | `OperationError`/拒绝，无部分 UI | 拒绝类型、UI 状态、无敏感日志 |
| 替换 IV 或 AAD=`user:2` | 解密拒绝 | 两条独立失败记录 |
| 同 v1 重复 IV | fixture 在加密前拒绝 | `v1:iv` 唯一集合/计数 |
| `extractable:false` key 导出 | `exportKey` 拒绝 | Promise rejection；日常 key 无 raw/JWK |
| v1→v2 轮换 | 新写 v2；旧 v1 可迁移；注入失败仍保留 v1 | 迁移前后可读、版本计数、失败回滚日志 |

受限排错固定日志为“GCM 认证失败、两个信封 IV 相同、`exportKey` 成功”。只查编码/算法参数、IV 生成与 keyVersion、key usages/extractable 三组。先保存信封元数据与失败类型，再修复并重跑密文/IV/AAD 三篡改、导出拒绝和轮换回滚；禁止把密钥、明文或完整敏感信封写入日志。

### 8. 自检

- 编码、摘要、HMAC、签名和加密分别证明什么？
- `extractable:false`、最小 usages、IndexedDB 分别能做什么，挡不住什么？
- AES-GCM 下 IV 为什么必须按 key 唯一？AAD 为什么可以明文但不可随意改变？
- 轮换为什么必须保留 decrypt-only/回滚窗口，而不是直接删 v1？
- XSS、服务端越权、设备丢失与离线数据库泄漏分别需要哪些额外防线？

能用六 fixture 的信封、三篡改拒绝、导出失败、版本迁移、回滚和脱敏日志回答，才算掌握 SEC-05。
