# 浏览器网络与请求可靠性中文核心讲义

## NET-01

### 1. 从一次 URL 到可提交的界面状态

先区分四条链，避免把“请求发出去了”误当成“用户看到了正确结果”：

1. 浏览器链：URL 解析 → Service Worker/HTTP Cache 等候选路径 → DNS（Domain Name System，域名系统）→ 连接 → TLS（Transport Layer Security，传输层安全）→ HTTP 请求/响应；具体顺序会因缓存、代理、连接复用和协议协商改变。
2. 服务链：CDN（Content Delivery Network，内容分发网络）/反向代理 → 网关 → 应用 → 数据存储 → 返回状态和正文。
3. 应用链：Fetch 完成 → 检查 HTTP 状态 → 解析正文 → 判断业务结果 → 处理身份、重试或错误。
4. 界面链：确认响应仍属当前请求和当前账号 → 提交状态 → 呈现给用户。

重要术语：

- **Origin（源）**：协议、主机和端口三元组；任一不同就是跨源。
- **DNS Lookup（DNS 查询）**：把域名解析为可连接地址；浏览器、系统、网络和服务端均可能缓存结果。
- **TCP Handshake（TCP 握手）**：HTTP/1.1 与常见 HTTP/2 连接建立的一部分。
- **TLS Handshake（TLS 握手）**：协商加密并验证证书主机名、有效期和信任链；HTTPS 不等于业务身份验证。
- **QUIC**：构建在 UDP 之上的加密多路传输协议，HTTP/3 使用它。
- **Multiplexing（多路复用）**：一条连接承载多个独立流。HTTP/2 消除 HTTP 层串行限制，但 TCP 丢包仍可阻塞该连接上的流；HTTP/3 的 QUIC 把丢包恢复隔离到流。
- **Proxy（代理）**：代替一端转发请求；Forward Proxy（正向代理）代表客户端，Reverse Proxy（反向代理）代表服务端。
- **TTFB（Time To First Byte，第一字节时间）**：从请求开始等待到响应首字节，包含网络往返和服务端准备时间，不能单独证明数据库慢。
- **HAR（HTTP Archive，HTTP 归档）**：保存请求瀑布、标头和时序的 JSON 证据；可能含 Cookie、Authorization、查询参数和个人数据，分享前必须使用清理版并复查。

页面脚本通常不能指定必须使用 h2/h3、复用哪条连接或走哪个 CDN 节点。应在 Network 面板记录实际协议和连接，而不是从代码猜测。

### 2. HTTP 版本只改变传输，不改变业务语义

| 项目 | HTTP/1.1 | HTTP/2 | HTTP/3 |
| --- | --- | --- | --- |
| 常见传输 | TCP + TLS | 单个 TCP + TLS 上的二进制多流 | QUIC/UDP，内建加密 |
| 并发 | 浏览器常开多条连接；同连接请求受顺序影响 | 多路复用；仍受 TCP 连接级丢包影响 | 多路复用；丢包主要阻塞受影响流 |
| 前端可控性 | 不能靠多域名“优化”替代测量 | 由客户端/服务端协商 | 由客户端/网络/服务端协商并可降级 |
| 不变的部分 | 方法、状态码、标头、缓存和应用接口语义 | 同左 | 同左 |

协议显示 `h3` 不表示请求一定快，`h2` 也不表示没有排队。资源优先级、服务端处理、丢包、主线程读取响应都可能成为瓶颈。

### 3. HTTP Cache、Service Worker Cache 与应用去重是三层东西

HTTP Cache（HTTP 缓存）根据 URL、请求方法、`Vary` 等选择已存响应，并按 `Cache-Control` 判断 Fresh（新鲜）或 Stale（过期）。过期不等于必须下载完整正文：

- `ETag` / `If-None-Match`：服务端版本标识匹配时返回 `304 Not Modified`。
- `Last-Modified` / `If-Modified-Since`：按修改时间验证；同时存在时通常优先 `If-None-Match`。
- `no-cache`：可以存储，但每次复用前必须验证。
- `no-store`：不要存储这次响应；它不会删除同 URL 已有旧响应，也不等于清理所有缓存。
- `private`：只允许私有缓存存储，避免个性化内容进入共享缓存。
- `immutable`：内容在 URL 生命周期内不会改变，适合内容散列资源。

固定策略表：

| 资源 | 推荐起点 | 原因/边界 |
| --- | --- | --- |
| `app.8f3a.js` 等内容散列子资源 | `public, max-age=31536000, immutable` | 内容变更时 URL 必须变化 |
| 非个性化 HTML | `no-cache` + ETag/Last-Modified | URL 不便改名，每次先验证版本 |
| 个性化 HTML/API GET | `private, no-cache` + 验证器 | Cookie 不会自动使缓存私有 |
| 高敏感且任何落盘都不可接受 | 经过威胁建模后使用 `no-store` | 会失去缓存与部分浏览器恢复优势 |
| 写请求响应 | 默认不靠 HTTP Cache 解决重复提交 | 使用服务端幂等与结果查询 |

Service Worker Cache（Service Worker 缓存）由脚本的 fetch handler 和 Cache API 决定；它可返回一份与 HTTP Cache 不同的响应。应用内 `Map<key, Promise>` 又是第三层，只合并当前 JavaScript 进程中的并发请求。三者命中任意一层都不能推导另外两层也命中。

### 4. Cookie、CORS 与授权是三个问题

Cookie 常用属性：`Domain`、`Path`、`Expires/Max-Age`、`Secure`、`HttpOnly`、`SameSite`。Cookie 可能随匹配请求自动携带；`HttpOnly` 阻止普通页面脚本读取，但不阻止浏览器发送。

CORS（Cross-Origin Resource Sharing，跨源资源共享）是浏览器执行的跨源读取协议：

- 简单跨源请求直接发送，响应必须有匹配的 `Access-Control-Allow-Origin` 才向脚本开放。
- 非简单方法、标头或媒体类型会先发 `OPTIONS` Preflight（预检），携带实际方法和标头意图。
- 携带凭据时，服务端不能用 `Access-Control-Allow-Origin: *`，还需明确允许凭据；第三方 Cookie 与 SameSite 策略仍可能阻止 Cookie。
- 动态回显具体 Origin 时应正确设置 `Vary: Origin`，防止共享缓存把一个源的响应交给另一个源。
- CORS 成功只表示浏览器允许脚本读取响应，不表示用户有业务权限；CORS 也不能替代 CSRF 防护。

前端代码只能看到概括的 CORS 失败；精确原因要查控制台、预检请求和响应标头。不要用关闭浏览器安全策略作为产品修复。

### 5. Fetch 有四种“成功”

```js
async function decodeJson(response) {
  // fetch 收到 404/503 仍会 resolve；只有网络错误、CORS 阻断或取消等才 reject。
  if (!response.ok) {
    throw new HttpError(response.status, await response.text());
  }
  const body = await response.json();
  if (body.code !== 'OK') throw new BusinessError(body.code, body.message);
  return body.data;
}
```

| 层次 | 成功条件 | 反例 |
| --- | --- | --- |
| Transport Success（传输成功） | Fetch 得到 Response | 断网、DNS/TLS 失败、CORS 阻断、Abort 会 reject |
| HTTP Success（HTTP 成功） | `response.ok`，即 200–299 | 401、429、503 仍是正常收到的 HTTP 响应 |
| Business Success（业务成功） | 正文 Schema 与业务 code 满足契约 | 200 + `{code:'OUT_OF_STOCK'}` 不是支付成功 |
| UI Commit Success（界面提交成功） | 结果仍属最新请求、当前账号和已连接页面 | 旧请求晚到覆盖新结果 |

`response.json()` 还可能因空正文或格式错误失败。成功路径也必须验证 Content-Type/Schema；不能把任意 200 当可信对象。

### 6. 超时、用户取消与迟到响应

Abort（中止）是取消继续等待/消费的信号，不保证服务端没有收到或执行请求。写操作被中止后可能处于 Outcome Unknown（结果未知），必须查询服务端最终状态，不能直接假定失败再发一次。

```js
function timeoutSignal(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('超时', 'TimeoutError')), ms);
  return { signal: controller.signal, dispose: () => clearTimeout(timer) };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const timeout = timeoutSignal(timeoutMs);
  const signal = options.signal
    ? AbortSignal.any([options.signal, timeout.signal])
    : timeout.signal;
  try {
    return await fetch(url, { ...options, signal });
  } finally {
    timeout.dispose();
  }
}
```

生产代码要按支持范围为 `AbortSignal.any()` 提供组合信号回退。界面卸载、用户点取消与超时应记录不同 reason；它们都不进入自动重试，除非产品协议明确允许。

固定搜索 fixture 用两道门防止旧状态提交：第二次搜索中止第一请求，同时用单调 Sequence（序号）抵挡“模拟服务端忽略 Abort 仍返回”的情况。

```js
let searchSequence = 0;
let activeSearch;

async function searchA() {
  const sequence = ++searchSequence;
  activeSearch?.abort('replaced');
  activeSearch = new AbortController();

  try {
    const response = await fetch('/search?q=a', { signal: activeSearch.signal });
    const data = await decodeJson(response);
    if (sequence !== searchSequence) return { committed: false, reason: 'stale' };
    renderSearch(data);
    return { committed: true, sequence };
  } catch (error) {
    if (activeSearch.signal.aborted) return { committed: false, reason: 'aborted' };
    throw error;
  }
}
```

测试让 S1 在 30ms 返回“旧”，S2 在 10ms 返回“新”。无论 Mock 是否遵守 Abort，最终 UI 只能是“新”，提交日志只含 S2。

### 7. 并发去重与 Singleflight（单飞）

Singleflight（单飞）表示多个相同的并发需求共享一次执行：

```js
const inFlight = new Map();

function dedupeGet(key, factory) {
  if (inFlight.has(key)) return inFlight.get(key);
  const promise = Promise.resolve().then(factory);
  inFlight.set(key, promise);
  return promise.finally(() => {
    if (inFlight.get(key) === promise) inFlight.delete(key);
  });
}
```

它只适合确实可共享的相同 GET。搜索的“后一次替换前一次”不是去重；不同账号、Locale、Authorization 或 `Vary` 维度不能共用 key。共享 Promise 时，单个消费者取消不应随意中止所有消费者的底层请求；需要引用计数或只取消该消费者的等待。

三路 401 固定使用一次刷新 Promise：

```js
let refreshPromise = null;

function refreshOnce() {
  if (!refreshPromise) {
    refreshPromise = fetch('/auth/refresh', { method: 'POST', credentials: 'include' })
      .then(decodeJson)
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

async function authorizedFetch(input, init, replayed = false) {
  const response = await fetch(input, init);
  if (response.status !== 401 || replayed) return response;
  await refreshOnce();
  return authorizedFetch(input, init, true); // 每个原请求最多重放一次。
}
```

测试断言：三个原请求、一个 refresh、三个最多一次 replay；刷新失败时三个等待者收到同一失败并进入登出流程，不能再次刷新形成风暴。账号切换时必须清空旧账号的 in-flight key 和可提交序号。

### 8. 重试资格、退避与幂等

- **Safe Method（安全方法）**：按语义不应改变服务端状态，如 GET/HEAD。
- **Idempotent Method（幂等方法）**：执行一次或多次的预期服务端效果相同，如 PUT/DELETE 的规范语义；错误实现仍可能不幂等。
- **Idempotency Key（幂等键）**：客户端为一次业务意图生成稳定键，服务端保存该键对应的处理中/完成结果并在重放时返回同一结果。只加一个请求头而服务端不实现协议毫无作用。
- **Exponential Backoff（指数退避）**：等待随尝试次数增长。
- **Jitter（抖动）**：在等待中加入随机量，避免大量客户端同时重试。
- **Retry Budget（重试预算）**：最大尝试次数和总时间上限；也应尊重服务端 `Retry-After` 和用户取消。

```js
const wait = (ms, signal) => new Promise((resolve, reject) => {
  const id = setTimeout(resolve, ms);
  signal?.addEventListener('abort', () => {
    clearTimeout(id);
    reject(signal.reason);
  }, { once: true });
});

async function retryGet(url, { signal, attempts = 3, baseMs = 100 } = {}) {
  const started = performance.now();
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetch(url, { signal });
    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === attempts - 1) return response;
    if (performance.now() - started > 2000) return response;
    const fullJitter = Math.random() * baseMs * (2 ** attempt);
    await wait(fullJitter, signal);
  }
}
```

固定 GET `/search` 先 503 后 200，可以在预算内自动重试。POST `/pay` 返回 503 时默认不得自动重发，因为服务器可能已扣款但响应丢失；UI 显示“结果确认中”，使用业务单号查询。只有服务端明确实现幂等键、原请求保持同一键且有查询/过期规则时，才允许受控重放。

### 9. 离线恢复不是“online 后重放所有 POST”

`navigator.onLine` 只是网络线索，不证明目标服务可达。离线 Outbox（发件箱）必须持久化业务意图、账号/租户、幂等键、创建时间、重试预算和用户可见状态；恢复时先重新认证并确认账号，再按服务端协议提交。支付、删除等高风险操作默认需要用户确认或结果查询。

读取请求可以在恢复后重新获取最新快照；写请求必须区分“从未发出”“已发出结果未知”“已确认失败”。退出账号时不能把 A 的离线队列带到 B。

### 10. 用 Network 面板建立证据

固定录制流程：

1. 打开 DevTools 后启用 Preserve log（保留日志），清空旧记录；只在测冷启动时勾选 Disable cache（停用缓存），不要把它当产品修复。
2. 增加 Method、Protocol、Priority、Connection ID 等列，记录 Initiator（发起方）和 Service Worker/Cache 来源。
3. 查看 Timing：Queued/Stalled、DNS、Initial connection/TLS、Request sent、Waiting (TTFB)、Content download。总时长不能替代分段证据。
4. 用离线、慢速网络和响应标头覆盖进行故障注入；分别复现缓存命中、304、401×3、GET 503、POST 503。
5. 导出 Sanitized HAR（已清理 HAR），再次检查 URL/body 是否仍含 token、个人数据或支付信息；敏感 HAR 不进入代码仓库和公开缺陷单。

判读示例：

| 现象 | 先查 | 不应直接下的结论 |
| --- | --- | --- |
| Queued 很长 | 优先级、h1 连接上限、磁盘缓存分配 | “后端慢” |
| TTFB 很长 | RTT、Server-Timing、CDN/网关/应用分段 | “DNS 慢” |
| Download 很长 | 响应大小、带宽、主线程读取 | “TLS 慢” |
| `(from ServiceWorker)` | SW 策略、Cache API 版本 | “HTTP Cache 命中” |
| CORS error | Console、OPTIONS、Origin/Allow/Vary/credentials | “接口没收到请求” |

### 11. 固定挑战的自动化断言

| Fixture | 合格断言 |
| --- | --- |
| `/search?q=a`：S1 30ms、S2 10ms | 最终只提交 S2；S1 为 aborted 或 stale；无旧状态闪回 |
| 三个接口同时 401 | refresh 请求数严格为 1；每个原请求最多 replay 1 次 |
| GET 503 → 200 | 在次数/时间预算内成功；等待含 jitter；取消立即停止 |
| POST `/pay` 503 | 自动重试数为 0；进入“结果未知/查询”状态 |
| 离线后恢复 | GET 可重新获取；POST 只有在账号和幂等协议确认后处理 |
| 缓存矩阵 | hashed asset/HTML/个性化 API 的标头、200/304 与来源可复核 |

受限排错“旧 a 覆盖新 a、401 发出 3 次 refresh、POST 重复扣款”只查：请求序号/Abort、refresh singleflight、幂等与重试资格。每项都要先用计数和 HAR 证伪，再修复并回归；不允许靠清空缓存、增大超时或无限重试掩盖问题。

### 12. 自检

- 为什么 Fetch resolve 不等于 HTTP 或业务成功？
- `no-cache` 与 `no-store` 的区别是什么，后者为什么不能删除旧响应？
- CORS 成功为什么不能证明用户已授权，也不能替代 CSRF 防护？
- 为什么共享 GET Promise 与“最新搜索替换旧搜索”是两种并发策略？
- POST 超时后为什么可能是“结果未知”，幂等键需要服务端做什么？
- HAR 分享前为什么即使选择“已清理”仍需人工复查？

能用请求计数、状态断言、缓存表和清理 HAR 回答以上问题，才算掌握 NET-01。
