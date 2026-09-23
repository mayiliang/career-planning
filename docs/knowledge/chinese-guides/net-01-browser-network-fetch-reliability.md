# 浏览器网络学习资料

## NET-01 分清请求成功、取消与结果未知

点击“保存”后没有收到响应，究竟是请求没发出去、服务器拒绝了，还是服务器已经保存而回包丢了？如果不先区分这些状态，界面很容易一边显示“失败”，一边自动重发，最后产生重复记录。

本篇沿一次请求从传输走到界面，解释 Fetch、缓存、取消和重试。中间的本地实验会故意返回 404、错误 JSON、迟到响应，以及“已经写入但客户端停止等待”的结果。

### 学习前先确认

- 直接前置：[BROWSER-01 渲染流水线、DOM 事件与存储](../chinese-guides/browser-01-render-events-storage.md#browser-01)。需要理解异步回调、缓存来源和数据提交。

### 一、一次请求有四层结果

| 层次 | 成功说明什么 | 仍可能出什么问题 |
| --- | --- | --- |
| 传输与浏览器检查 | Fetch 得到 Response | HTTP 状态可能是 404 或 503 |
| HTTP | 状态符合接口约定 | 正文可能为空、破损或结构不符 |
| 应用数据 | 解析与校验通过 | 业务仍可能拒绝当前操作 |
| 界面提交 | 结果仍属于当前任务 | 账号、页面或查询已改变时，应放弃旧结果 |

`fetch()` 遇到 HTTP 错误状态通常不会 reject。收到 404 后依然有 Response，必须查看 status 或 ok；网络失败、部分浏览器策略阻断、取消等才会以拒绝的形式出现。读取 body 又是后续异步过程，不能只在拿到响应头时宣布全部完成。

正确数据也可能已经过期：搜索 A 后紧接着搜索 B，A 晚到时不应覆盖 B。取消旧请求可以节省资源，提交资格检查才决定它是否还能改变界面。

### 二、DNS、连接和 HTTP 版本解释哪一段时间

域名解析、连接建立、TLS、代理与服务处理都可能出现在请求路径中。浏览器复用连接、使用缓存或经过 Service Worker 时，不一定重新经历每个阶段。

HTTP/1.1、HTTP/2 和 HTTP/3 改变传输方式，不改变“这个用户能否修改这份资料”的业务约定。HTTP/2 在连接上多路复用，底层 TCP 丢包仍可能影响多个流；HTTP/3 使用 QUIC，改善部分传输阻塞情形，但不能替你缩小正文或消除主线程长任务。

Network 面板的 TTFB 包括多种等待，不能直接读成数据库耗时。先看 Protocol、Timing、Initiator 与缓存来源，再结合服务端 trace。具体调试方法可接回 [DEBUG-01](../chinese-guides/debug-01-systematic-debugging-evidence-causality.md#debug-01)。

HTTPS 保护传输并验证相应服务端身份，不证明页面脚本安全，也不代替用户认证或对象授权。

### 三、缓存新鲜度与重新验证分开看

**HTTP Cache** 保存响应副本。Cache-Control 描述复用条件，ETag 等验证器帮助浏览器询问“这份副本还有效吗”。

| 声明或现象 | 正确理解 |
| --- | --- |
| max-age=600 | 在条件满足时，十分钟内可直接复用新鲜响应 |
| no-cache | 可以存储，复用前需要验证 |
| no-store | 不应存储本次响应；不是删除所有历史副本的命令 |
| private | 只允许私有缓存存储，不表示内容已经加密或获得授权 |
| 304 | 验证后复用已有正文；不是再传一次完整正文 |
| Vary | 某些请求头也参与选择响应副本 |

例如入口 HTML 使用重新验证，带内容散列的静态文件使用长期缓存，是两种不同生命周期的配合。身份变化后还要清理或隔离应用内数据缓存；Cookie 的存在不会自动保证共享缓存不会串内容。

HTTP Cache、Service Worker 的 Cache API、组件查询缓存是三层。显示旧标题时，应先记录是哪一层返回了哪个版本，不能把“全部清缓存”当成根因解释。发布资源的版本关系见 [ENG-05](../chinese-guides/eng-05-quality-gates-lint-types-tests-ci.md#eng-05)。

### 四、启动一个只在本机运行的请求实验

将以下三个文件放进单独目录，使用 Node.js 22 运行 `node server.mjs`，打开 `http://127.0.0.1:43814`。服务器只监听回环地址，数据只在进程内存中；重启后归零。这是教学服务，没有真实账号、数据库或认证功能。

先保存 `server.mjs`。GET 的不同路径提供明确结果；POST 模拟“先写入、后延迟回包”，幂等键相同的请求返回同一记录。

```js example=net-lab-server runtime=project file=server.mjs
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const records = new Map();
let writes = 0;
const json = (res, status, value) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
};
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1:43814');
    if (req.method === 'GET' && ['/', '/client.js'].includes(url.pathname)) {
      const file = url.pathname === '/' ? 'index.html' : 'client.js';
      res.writeHead(200, { 'Content-Type': file.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(await readFile(new URL(file, import.meta.url))); return;
    }
    if (req.method === 'GET' && url.pathname === '/api/read') {
      const mode = url.searchParams.get('mode');
      if (mode === 'missing') { json(res, 404, { code: 'NOT_FOUND' }); return; }
      if (mode === 'bad-json') {
        res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{broken'); return;
      }
      if (mode === 'bad-shape') { json(res, 200, { title: 42 }); return; }
      if (mode === 'A') await new Promise(r => setTimeout(r, 300));
      json(res, 200, { title: mode === 'A' ? '资料 A' : '资料 B' }); return;
    }
    if (req.method === 'POST' && url.pathname === '/api/save') {
      const key = req.headers['idempotency-key'];
      if (typeof key !== 'string' || !/^[a-f0-9-]{36}$/.test(key)) {
        json(res, 400, { code: 'INVALID_KEY' }); return;
      }
      req.resume(); // 本例写入固定内容，不读取用户正文。
      if (records.has(key)) { json(res, 200, records.get(key)); return; }
      const result = { key, writes: ++writes, title: '教学草稿' };
      records.set(key, result); // 先发生副作用，随后才返回响应。
      await new Promise(r => setTimeout(r, 500));
      json(res, 200, result); return;
    }
    if (req.method === 'GET' && url.pathname === '/api/result') {
      const result = records.get(url.searchParams.get('key'));
      json(res, result ? 200 : 404, result ?? { code: 'NOT_FOUND' }); return;
    }
    json(res, 404, { code: 'NOT_FOUND' });
  } catch { if (!res.headersSent) json(res, 500, { code: 'LAB_ERROR' }); else res.end(); }
}).listen(43814, '127.0.0.1', () => console.log('请求实验：http://127.0.0.1:43814'));
```

再保存 `index.html`：

```html example=net-lab-page runtime=project file=index.html
<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<title>请求结果观察台</title>
<style>
  body { max-width: 56rem; margin: 3rem auto; padding: 0 2rem; font: 18px/1.7 system-ui; color: #172d3c; }
  button { font: inherit; padding: .6rem; margin: .3rem; }
  :focus-visible { outline: 3px solid #005fcc; outline-offset: 3px; }
  section { padding: 1rem; margin-block: 1rem; border: 1px solid #8e9daa; border-radius: .6rem; }
</style>
<main>
  <h1>请求结果观察台</h1>
  <section aria-labelledby="read-title">
    <h2 id="read-title">读取与过期响应</h2>
    <button data-read="A">读取 A（慢）</button><button data-read="B">读取 B（快）</button>
    <button data-read="missing">返回 404</button><button data-read="bad-json">错误 JSON</button>
    <button data-read="bad-shape">错误结构</button><button id="cancel">取消读取</button>
    <p id="read-result" role="status">尚未读取</p>
  </section>
  <section aria-labelledby="write-title">
    <h2 id="write-title">写入与结果未知</h2>
    <button id="write">写入后停止等待</button><button id="query" disabled>查询上次写入</button>
    <button id="retry" disabled>用同一标识再发</button>
    <p id="write-result" role="status">尚未写入</p>
  </section>
</main>
<script type="module" src="./client.js"></script>
</html>
```

最后保存 `client.js`。读取使用序号阻止旧结果覆盖，故意不主动取消被新查询取代的请求，方便观察提交资格与网络取消的差别；“取消读取”才真正中止当前等待。

```js example=net-lab-client runtime=project file=client.js
const el = (id) => document.getElementById(id);
class RequestError extends Error {
  constructor(kind, message) { super(message); this.kind = kind; }
}
async function requestJson(url, { signal, timeout = 3000, ...options } = {}) {
  const controller = new AbortController();
  const forward = () => controller.abort(signal.reason);
  if (signal?.aborted) forward(); else signal?.addEventListener('abort', forward, { once: true });
  const timer = setTimeout(() => controller.abort(new DOMException('等待超时', 'TimeoutError')), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new RequestError('http', `HTTP ${response.status}`);
    if (!response.headers.get('content-type')?.includes('application/json')) {
      throw new RequestError('format', '响应不是 JSON');
    }
    try { return await response.json(); }
    catch (error) {
      if (controller.signal.aborted) throw error;
      throw new RequestError('parse', 'JSON 解析失败');
    }
  } catch (error) {
    if (controller.signal.aborted) throw controller.signal.reason;
    throw error;
  } finally {
    clearTimeout(timer); signal?.removeEventListener('abort', forward);
  }
}
let sequence = 0;
let reading = null;
for (const button of document.querySelectorAll('[data-read]')) {
  button.onclick = async () => {
    const current = ++sequence;
    reading = new AbortController();
    const signal = reading.signal;
    el('read-result').textContent = `读取 ${button.dataset.read} 中…`;
    try {
      const data = await requestJson(`/api/read?mode=${encodeURIComponent(button.dataset.read)}`, { signal });
      if (!data || typeof data.title !== 'string') throw new RequestError('contract', '资料结构不符合约定');
      if (current === sequence) el('read-result').textContent = data.title;
    } catch (error) {
      if (current === sequence) el('read-result').textContent = `${error.kind ?? error.name}：${error.message}`;
    }
  };
}
el('cancel').onclick = () => {
  ++sequence; reading?.abort(new DOMException('用户取消', 'AbortError'));
  el('read-result').textContent = '已取消当前读取';
};
let lastKey = null;
const describe = (data) => `已确认：${data.title}；本服务累计写入 ${data.writes} 次`;
el('write').onclick = async () => {
  lastKey = crypto.randomUUID();
  const key = lastKey;
  el('write').disabled = true; el('query').disabled = true; el('retry').disabled = true;
  el('write-result').textContent = '正在发送教学写入…';
  try {
    const data = await requestJson('/api/save', { method: 'POST', headers: { 'Idempotency-Key': key }, timeout: 80 });
    el('write-result').textContent = describe(data);
  } catch {
    el('write-result').textContent = '写入结果未知，请查询；停止等待不等于撤销。';
  } finally {
    el('write').disabled = false; el('query').disabled = false; el('retry').disabled = false;
  }
};
async function confirm(retry) {
  if (!lastKey) return;
  const key = lastKey;
  el('write').disabled = true; el('query').disabled = true; el('retry').disabled = true;
  try {
    const data = retry
      ? await requestJson('/api/save', { method: 'POST', headers: { 'Idempotency-Key': key } })
      : await requestJson(`/api/result?key=${encodeURIComponent(key)}`);
    el('write-result').textContent = describe(data);
  } catch (error) { el('write-result').textContent = `确认失败：${error.message}`; }
  finally { el('write').disabled = false; el('query').disabled = false; el('retry').disabled = false; }
}
el('query').onclick = () => confirm(false);
el('retry').onclick = () => confirm(true);
```

依次尝试：慢 A 后立刻点快 B，最终仍显示 B；404、破损 JSON、错误结构分别得到不同错误；写入后停止等待，再查询，通常能确认服务已写入；同一标识再发不增加那次写入的次数。如果本机首次请求连服务都没到就超时，查询可能 404，这仍属于要查明的结果，不能倒推“超时一定已经写入”。

### 五、解码要遵守接口约定

例子先看 HTTP，再看 Content-Type，再解析，最后检查 title 类型。这种顺序让“服务返回 404”和“成功正文不是资料对象”能够分开呈现。TypeScript 的类型断言不会验证网络 JSON，实际输入仍要做运行时检查。

本例只处理很小的教学 JSON，没有实现字节上限、通用错误 schema 或所有 JSON media type。正式请求层应根据接口约定接受 `application/*+json` 等类型，并限制解析规模。204 没有正文时，也不应无条件调用 json。

错误消息同样需要分层：给用户提供可理解的下一步，给诊断保留稳定 code、status 和 requestId；不要把服务器堆栈或完整响应直接显示给用户。读取正文流期间的连接中断，也可能表现为读取失败，不能把所有 body 异常都确定归为“后端发错 JSON”。

### 六、取消的是等待，写入结果还要确认

**AbortSignal** 是协作式取消信号。Fetch 和支持它的消费代码可以停止工作；你自己写的耗时计算也要在适当位置检查。取消原因应区分用户操作、超时、路由替换与账号变化，并在 finally 中清理监听和计时器。

本例写入的关键顺序是：服务器记录结果，然后等待 500 ms 才回包；客户端只等 80 ms。因此存在“服务器已完成，客户端未知”的窗口。真实网络里，回包丢失也会造成同样的不确定性。

对读取，放弃旧结果通常可以接受；对付款、创建资源等写操作，不能看到 AbortError 就再用新标识重做一次。应查询原操作，或在明确支持幂等的接口上重试同一个意图。界面可以显示“结果确认中”，而不是过早显示“未发生”。

### 七、过期结果、单飞和数据缓存各管一件事

本例序号只保护当前读取的界面提交，旧 A 仍可能到达服务器。若为了节省资源再加入 abort，仍应保留序号或查询身份检查，因为有些 SDK 不响应取消，或者工作已经完成。

**单飞（Singleflight）**把相同范围内同时发生的请求合并为一个 Promise。它既不是长期缓存，也不是“后一次请求取代前一次”。下面的小例子在完成后删除登记，失败也走同一条清理路径。

```js example=net-singleflight
const running = new Map();
function singleflight(key, work) {
  if (running.has(key)) return running.get(key);
  const task = Promise.resolve().then(work).finally(() => {
    if (running.get(key) === task) running.delete(key);
  });
  running.set(key, task);
  return task;
}
let calls = 0;
const load = async () => { calls++; return '资料'; };
const values = await Promise.all([singleflight('account-a:note-7', load), singleflight('account-a:note-7', load)]);
console.log(values.join(','), calls);
// => 资料,资料 1
await singleflight('account-a:note-7', load);
console.log(calls);
// => 2
```

key 应包含影响响应的账号、租户、语言等范围。单个调用者取消时，不应随意中止其他调用者还在等待的共享请求；可以只停止该调用者等待，或在没有消费者时再结束底层请求。更完整的状态取舍可回看 [DATA-01 的服务端状态与缓存](../chinese-guides/data-01-server-state-cache-keys-invalidation-deduplication.md#data-01)。

### 八、重试要有资格，也要有预算

HTTP 的 safe 描述预期业务状态不因该方法改变，idempotent 描述重复执行的预期效果一致；两者不是“绝无日志”或“响应字节每次完全一样”。GET 不该承担业务写操作，PUT/DELETE 的语义也不能替错误服务端实现兜底。

| 情况 | 常见处理方向 |
| --- | --- |
| 用户主动取消读取 | 停止，不自动重试 |
| 429 或部分暂时性 5xx | 结合 Retry-After、次数与总时限决定 |
| 参数校验或业务拒绝 | 修改输入或操作，不原样循环 |
| 写入响应未知 | 查原操作或按已有幂等协议恢复 |
| 401 | 按认证流程处理，不无限重复原请求 |

退避和 jitter 减少大量客户端同时重试带来的压力，但重试次数、总等待时间和并发上限仍需明确。Retry-After 可以是秒数或 HTTP 日期，不应只当作一个固定字符串忽略。

本例幂等表在单个 Node 进程同步登记固定内容，只能说明“重复键返回同一结果”。正式服务需要把账号、参数一致性、processing/completed 状态、原子写入、有效期与多实例竞争都纳入设计；只添加一个请求头并不会自动实现幂等。

### 九、401 刷新与离线队列不能偷偷串账号

多个请求同时 401 时，可共享一次刷新过程，刷新后每个请求最多重放一次。再次 401 应进入一致的再认证流程，避免递归刷新风暴。流式上传正文可能已经消费，不能像普通 GET 一样透明重放。

账号切换应让旧等待者失去提交资格，清理相应缓存与队列。离线 **Outbox** 保存的是带账号、操作标识和版本的业务意图，不是“网络恢复后随便发一遍”的请求列表。

还要区分从未发送、已发送但未知、明确拒绝、已确认成功。navigator.onLine 只提供网络线索，不能证明目标服务可达。冻结后恢复与多标签协调可继续阅读 [BROWSER-02](../chinese-guides/browser-02-observers-scheduling-lifecycle-coordination.md#browser-02)。

### 十、流的 chunk 不等于一条消息

ReadableStream 的分块受传输与实现影响，不能假定一次 read 就得到一个完整汉字、一行 JSON 或一个业务事件。下面把 UTF-8 的“中”从中间切开，用流式 TextDecoder 保留未完成字节。

```js example=net-stream-decoding
const bytes = new TextEncoder().encode('中\n');
const decoder = new TextDecoder();
const first = decoder.decode(bytes.slice(0, 1), { stream: true });
const second = decoder.decode(bytes.slice(1), { stream: true }) + decoder.decode();
console.log(JSON.stringify(first));
// => ""
console.log(JSON.stringify(second));
// => "中\n"
```

字符解码之后还要按协议分帧，例如保存未完成的行，等下一批拼齐。限制单帧和总量，区分正常结束、错误帧与残缺结尾；已经展示一半的正文不能在断流后伪装成完整结果。

读取速度、计算速度与渲染频率也应分开。每来一个 chunk 就重绘全文，会把网络问题变成主线程问题；可以批量更新，同时保留取消与错误恢复。

### 十一、CORS 与 Cookie 解释不同边界

**CORS** 决定跨源脚本能否读取符合规则的响应。某些请求需要先 OPTIONS 预检；携带凭据时不能用通配符作为允许源，还需要正确的凭据允许配置。动态按允许列表返回 Origin 时，也要考虑 Vary。

`credentials: 'include'` 只是请求带凭据的模式，并不会突破 SameSite、第三方 Cookie 或存储分区限制。HttpOnly 限制脚本直接读取 Cookie，不阻止浏览器在符合条件时发送它。

`mode: 'no-cors'` 也不是修复 API 的办法，它会带来 opaque 响应等读取限制。攻击者不需要读到响应就可能造成写操作，所以 CORS 不是 CSRF 或授权方案；下一篇 [SEC-01](../chinese-guides/sec-01-xss-csrf-trust-boundaries.md#sec-01) 会把这几道检查分别展开。

### 十二、把网络证据接回用户结果

抓请求时记录操作、版本、缓存条件与 requestId，区分排队、连接、等待响应与下载。相同 URL 并不代表相同来源：Service Worker、CDN、HTTP Cache 和应用缓存都可能改变结果。

本篇例子可以先用状态、请求数量、最终文本和服务端结果证明机制。它没有部署真实 TLS、CDN、跨源 Cookie 或 HTTP/3，不能用它推断这些环境的表现。导出 HAR 时要去掉 Cookie、Authorization、签名参数与个人正文，再共享给协作者。

学完后应能解释：404 为什么还能拿到 Response，取消为什么不能撤销服务器写入，单飞为什么完成后还会重新请求，以及 CORS 失败为什么不一定说明副作用没发生。先把这些事实说清，请求层才能给用户可靠的反馈。

### 参考与延伸阅读

审校日期：2026-09-14。示例服务与数据为本地教学设定，不是当前系统的请求层实现。

- [MDN：Using Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)：状态、正文读取和取消。
- [MDN：HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)：新鲜度、验证器与 Vary。
- [MDN：CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)：预检、凭据和响应读取。
- [MDN：HTTP request methods](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods)：safe 与 idempotent 的方法语义。
- [MDN：TextDecoder.decode](https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder/decode)：跨分块解码。
- [Chrome：Network reference](https://developer.chrome.com/docs/devtools/network/reference)：分层观察请求来源与时序。
