# Web 安全知识点讲义

## SEC-04 让跨源页面在明确的边界内协作

资料站准备嵌入一个合作方的图表，又想用共享内存加速计算。加上两行响应头后，图表里的图片不见了，登录弹窗也联系不上主页面。此时，“把跨域打开”没有明确含义：你究竟要允许读取响应、允许嵌入资源，还是保留两个窗口之间的联系？

本篇从三个本地来源组成的小页面出发，把每项控制放回它实际作用的位置。先看到允许与拒绝的差别，再决定应用需要哪一种组合。

### 学习前先确认

- 直接前置：[SEC-02 CSP、Trusted Types 与安全违规报告](../chinese-guides/sec-02-csp-trusted-types-reporting.md#sec-02)。需要理解响应头对当前文档施加策略，以及记录违规与实际阻止的区别。

### 一、先把 origin、site 和窗口关系画清楚

**Origin** 是协议、主机、端口的组合。`http://127.0.0.1:43820` 与 `http://127.0.0.1:43821` 只差端口，仍然跨源；路径不同却不产生新来源。**Site** 用于 SameSite 等机制，通常按协议和可注册域判断，不把端口作为区分条件。因此，下面的多端口实验验证跨源行为，不能据此宣称已经验证跨站 Cookie。

窗口还有独立的一层关系：iframe 有 parent，弹窗可能有 opener；这些引用不等于访问对方 DOM 的权限。**Browsing context group** 决定一组浏览上下文的联系，浏览器进程则是实现层安排。不要把 DevTools 中看到的进程数量写进安全约定。

例如，主页面要显示合作方图表，只需要 iframe 展示和少量消息。它不需要合作方读取主页面 DOM，也不需要合作方拿到当前账号的完整对象。先写出这个需求，后面的允许列表才有依据。

### 二、把六种策略按控制方向摆在一起

| 机制 | 由谁声明 | 主要回答什么 |
| --- | --- | --- |
| CORS | 资源服务器 | 哪些来源的脚本可以读取该响应 |
| CORP | 资源服务器 | 该资源能否被相应来源以 no-cors 方式加载 |
| COEP | 嵌入方文档 | 我要求进入页面的跨源资源满足什么条件 |
| COOP | 顶层文档 | 我与打开者、被打开窗口怎样分组 |
| iframe sandbox | 父页面 | 子文档可以执行哪些行为 |
| Permissions Policy | 响应头及 iframe allow | 文档能使用哪些受控功能 |

**Cross-Origin Resource Policy**（CORP）不是读取授权。图片通过 CORP 被加载，仍不表示脚本能读取其像素。反过来，给图片响应加 CORS 允许头，也要配合图片的 `crossorigin` 请求模式，不能以为浏览器会自动换一种加载方法。

同源策略主要限制跨源读取，不保证请求根本不会发出，也不替服务端校验写入。这个区别可以接回 [NET-01 的 CORS 与 Cookie](../chinese-guides/net-01-browser-network-fetch-reliability.md#十一cors-与-cookie-解释不同边界)。

### 三、运行一个三来源的嵌入实验

创建一个空目录，放入下面三个文件。需要 Node.js 20 或更新版本，在目录内运行 `node isolation-server.mjs`，打开 `http://127.0.0.1:43820/`。三个端口都只监听本机；结束后在终端按 Ctrl+C。

这里的合作方、同来源的另一窗口、未知来源全是教学页面。没有真实第三方服务、登录状态或摄像头操作。

**isolation-server.mjs**：同一进程提供三个不同 origin。

```js example=sec04-local-server runtime=project file=isolation-server.mjs
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const main = await readFile(new URL('./isolation.html', import.meta.url));
const frame = await readFile(new URL('./partner.html', import.meta.url));
const picture = '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="56"><rect width="160" height="56" fill="#147d69"/><text x="18" y="35" fill="white" font-size="18">Partner image</text></svg>';
for (const port of [43820, 43821, 43822]) {
  createServer((req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    const headers = { 'Cache-Control': 'no-store' };
    if (port === 43820 && url.pathname === '/') {
      if (url.searchParams.get('isolated') !== '0') {
        headers['Cross-Origin-Opener-Policy'] = 'same-origin';
        headers['Cross-Origin-Embedder-Policy'] = 'require-corp';
      }
      headers['Permissions-Policy'] = 'camera=(), microphone=()';
      res.writeHead(200, { ...headers, 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(main);
    }
    if (port !== 43820 && url.pathname === '/partner') {
      headers['Cross-Origin-Embedder-Policy'] = 'require-corp';
      headers['Cross-Origin-Resource-Policy'] = 'cross-origin';
      headers['Content-Security-Policy'] = "frame-ancestors http://127.0.0.1:43820";
      res.writeHead(200, { ...headers, 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(frame);
    }
    if (port === 43821 && ['/open.svg', '/plain.svg'].includes(url.pathname)) {
      if (url.pathname === '/open.svg') headers['Cross-Origin-Resource-Policy'] = 'cross-origin';
      res.writeHead(200, { ...headers, 'Content-Type': 'image/svg+xml' });
      return res.end(picture);
    }
    res.writeHead(404); res.end('not found');
  }).listen(port, '127.0.0.1', () => console.log(`本地来源 http://127.0.0.1:${port}`));
}
```

**isolation.html**：父页面检查消息的来源、窗口和内容。

```html example=sec04-parent-page runtime=project file=isolation.html
<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<title>跨源协作观察台</title>
<style>
body { max-width: 1050px; margin: 36px auto; padding: 0 24px; font: 16px/1.7 system-ui; color: #193d35; background: #f3f7f5; }
section { background: white; border: 1px solid #ccdcd5; border-radius: 12px; padding: 20px; margin: 18px 0; }
.frames { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
iframe { width: 100%; height: 220px; box-sizing: border-box; border: 1px solid #acc8bd; }
img { display: block; } a { color: #086752; } li { overflow-wrap: anywhere; }
</style>
<h1>跨源协作观察台</h1>
<p><a href="/">启用隔离</a> · <a href="/?isolated=0">关闭隔离，观察基础路径</a></p>
<section><h2>当前能力</h2><p id="capability"></p>
<p>共享内存是可选能力；不可用时仍可用普通 ArrayBuffer 传递数据。</p></section>
<section><h2>相同图片，不同响应头</h2>
<p>带 CORP：<span id="open-result">加载中</span></p><img id="open-image" alt="合作方图片，允许跨源加载">
<p>不带 CORP：<span id="plain-result">加载中</span></p><img id="plain-image" alt="未声明 CORP 的合作方图片">
</section>
<div class="frames">
<section><h2>指定合作窗口</h2><iframe id="partner" title="指定合作窗口" sandbox="allow-scripts allow-same-origin" allow="camera 'none'; microphone 'none'"></iframe></section>
<section><h2>同来源的另一窗口</h2><iframe id="other" title="同来源的另一窗口" sandbox="allow-scripts allow-same-origin"></iframe></section>
<section><h2>未知来源</h2><iframe id="unknown" title="未知来源" sandbox="allow-scripts allow-same-origin"></iframe></section>
</div>
<section><h2>消息记录</h2><ul id="log" aria-live="polite"></ul></section>
<script type="module">
const $ = id => document.getElementById(id);
const origin = 'http://127.0.0.1:43821';
const log = text => { const li = document.createElement('li'); li.textContent = text; $('log').append(li); if ($('log').children.length > 20) $('log').firstElementChild.remove(); };
const shared = crossOriginIsolated && typeof SharedArrayBuffer === 'function';
const buffer = shared ? new SharedArrayBuffer(4) : new ArrayBuffer(4);
new Int32Array(buffer)[0] = 7;
$('capability').textContent = `crossOriginIsolated=${crossOriginIsolated}；${shared ? 'SharedArrayBuffer' : 'ArrayBuffer 回退'}；读取值=${new Int32Array(buffer)[0]}`;
const seen = new Set();
function valid(data) {
  return data !== null && typeof data === 'object' && !Array.isArray(data)
    && Object.keys(data).length === 3 && data.version === 1
    && data.type === 'ready' && typeof data.requestId === 'string'
    && /^ready-[0-9]{1,3}$/.test(data.requestId);
}
window.addEventListener('message', event => {
  if (event.origin !== origin) return log('拒绝：origin 不匹配');
  if (event.source !== $('partner').contentWindow) return log('拒绝：source 不是指定窗口');
  if (!valid(event.data)) return log('拒绝：消息格式不符合 v1');
  if (seen.has(event.data.requestId)) return log('忽略：已处理的 requestId');
  if (seen.size >= 100) return log('拒绝：请刷新后开始新的演示');
  seen.add(event.data.requestId);
  log(`接受：${event.data.requestId}`);
  event.source.postMessage({ version: 1, type: 'ack', requestId: event.data.requestId }, origin);
});
for (const name of ['open', 'plain']) {
  const img = $(`${name}-image`);
  img.onload = () => $(`${name}-result`).textContent = '已加载';
  img.onerror = () => $(`${name}-result`).textContent = '加载被拒绝或失败';
  img.src = `${origin}/${name}.svg`;
}
$('partner').src = `${origin}/partner`;
$('other').src = `${origin}/partner`;
$('unknown').src = 'http://127.0.0.1:43822/partner';
</script>
</html>
```

**partner.html**：三个子窗口共用同一个页面，差别来自真实 origin 和窗口身份。

```html example=sec04-partner-page runtime=project file=partner.html
<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8"><title>合作方消息</title>
<style>body { font: 14px/1.5 system-ui; color: #193d35; } button { padding: 7px; margin: 3px; } p { overflow-wrap: anywhere; }</style>
<p id="source"></p>
<button id="ready">发送 ready-1</button><button id="bad">发送错误版本</button>
<p id="policy"></p><p id="reply" role="status">等待回执</p>
<script type="module">
const host = 'http://127.0.0.1:43820';
document.getElementById('source').textContent = location.origin;
const policy = document.permissionsPolicy ?? document.featurePolicy;
document.getElementById('policy').textContent = policy?.allowsFeature
  ? `策略允许 camera=${policy.allowsFeature('camera')}` : '本浏览器没有策略查询接口';
function send(version) { parent.postMessage({ version, type: 'ready', requestId: 'ready-1' }, host); }
document.getElementById('ready').onclick = () => send(1);
document.getElementById('bad').onclick = () => send(2);
addEventListener('message', event => {
  if (event.origin !== host || event.source !== parent) return;
  const d = event.data;
  if (d && typeof d === 'object' && Object.keys(d).length === 3
      && d.version === 1 && d.type === 'ack' && d.requestId === 'ready-1') {
    document.getElementById('reply').textContent = '父页面已确认 ready-1';
  }
});
</script>
</html>
```

先看图片，再依次点击三个窗口的发送按钮。支持本例能力的桌面浏览器中，隔离开启时只有带 CORP 的图片成功；关闭时两张都能加载。只有指定合作窗口收到回执，同来源的第二个窗口也被拒绝。重复发送不会重复处理，错误版本无法进入业务分支。

### 四、COEP 管资源准入，失败不等于隔离消失

**Cross-Origin Embedder Policy**（COEP）的 `require-corp` 让跨源 no-cors 资源必须明确允许加载；走 CORS 的资源要通过相应检查。嵌套文档还有自身的 COEP 要求，所以服务端为子页面也发送了 COEP，而非只给一张图片加头。

观察本例：无 CORP 图片失败时，顶层 `crossOriginIsolated` 仍可为 true。浏览器阻止不符合条件的资源，正是在执行隔离规则；不要把所有子资源错误都解释成“页面退出隔离”。

`credentialless` 为跨源 no-cors 请求提供另一条路径：不携带相应凭据加载，但不覆盖资源自身更严格的 CORP，也不取消 CORS 检查。它会改变依赖 Cookie 的资源行为，不能作为“自动修复第三方”的开关。迁移时先查请求模式、重定向、响应头与资源所有者，再选方法。

### 五、COOP 影响弹窗，SharedArrayBuffer 要做能力分支

**Cross-Origin Opener Policy**（COOP）的 `same-origin` 与合适的 COEP、可信上下文及权限策略共同参与跨源隔离。以运行时 `crossOriginIsolated` 为准，不能只确认配置文件里有两行头。

严格 COOP 可能切断跨源 opener 联系。假设支付弹窗靠 `window.opener.postMessage` 通知主页面，改头后原先的返回路径就需要重审。`same-origin-allow-popups` 有不同的窗口保留规则，不能拿它当 `same-origin` 的同义词。按路由分配隔离能力，或改为全页返回、服务端状态查询，再完整检查登录和支付流程。

**SharedArrayBuffer** 是共享内存，**Atomics** 用于相应的原子操作与协调。本例只证明能否构造和读取，不证明跨线程更快。真正把它交给 Worker 前，要设计并发访问规则；不支持时可选普通消息或 transferable。不要在主线程忙等，更不要把优化不可用变成“资料无法打开”。

### 六、sandbox 给的是能力，不是可信身份

`sandbox` 没有任何 token 时施加一组限制；按需要添加 `allow-scripts`、`allow-forms` 等。没有 `allow-same-origin` 的子文档通常获得不透明 origin，消息来源可能是字符串 `null`，无法再按通常的业务 origin 验证。

本例为了展示精确 origin，给独立端口的合作页 `allow-scripts allow-same-origin`。这不是可套用到所有 iframe 的默认组合：若把不可信内容放在与父页面同源的位置，同时给这两个 token，内容可能访问父页面并解除限制。实际合作方应有独立来源和受控导航。

沙箱也不能让可信合作方“永远可信”。同一来源被接管、子窗口导航、对方增加新功能，都应重新审查消息约定；一个允许脚本的 iframe 仍可以运行其内部脚本。

### 七、嵌入、被嵌入和功能授权分开配置

父页面的 `frame-src` 管“我嵌入谁”，子页面的 `frame-ancestors` 管“谁能嵌入我”，后者检查整条祖先链并通过响应头部署。`sandbox` 管子文档行为，**Permissions Policy** 管摄像头等功能。它们不是四种写法完成同一件事。

本例顶层 `camera=()` 禁止摄像头，子页面再写 allow 也不能扩大父级已禁止的权限。策略允许后，API 仍有可信上下文、用户授权、设备存在等条件。查询策略返回 false 只证明策略层拒绝；没有弹出摄像头提示，不代表已经检查用户的设备。

点击劫持要从被嵌入页面的祖先限制开始。若业务确实允许嵌入，高风险操作仍需明确确认与服务端授权，不能只在 iframe 上盖一层遮罩。可对照 [SEC-02 的文档控制](../chinese-guides/sec-02-csp-trusted-types-reporting.md#十一其他文档限制不要混成一条规则)。

### 八、postMessage 同时核对三件事

**postMessage** 允许窗口显式交换结构化数据。发送端的 `targetOrigin` 是“只交给这个来源”；接收端的 `event.origin` 是“消息发出时来自哪里”；`event.source` 是“哪个窗口发出的”。二者都满足后，消息内容仍须验证。

本例第二个窗口拥有完全相同的 origin，却不具备主页面授予第一个窗口的身份。未知来源则连第一道检查都过不了。不要仅把目标域名作为字符串前缀比较，也不要根据收到的消息自动扩展允许列表。

窗口引用可在导航后继续代表同一个窗口，origin 却已经变化。发送消息时使用精确目标、收到每条消息时再次检查，不要认为第一次握手成功就能永久省略校验。数据只含必要配置；会话 token、完整用户资料不应作为通用握手礼物发出。

### 九、消息的类型说明要落到运行时

本例检查对象、字段数、version、type、requestId 的类型与长度，然后才处理。它针对结构化克隆后的窄消息，不声称能阻止消息在传输前占用内存；需要同时限制协议载荷、发送频率与应用处理队列。

用 TypeScript 声明 `{ version: 1 }` 无法约束另一个网站。本批 [TS-04 的类型与值边界](../chinese-guides/ts-04-mapped-utility-template-literal-types.md#三pick-与-omit-不会从对象里删除字段)会用真实输出说明：类型变窄，值并不会自动净化。

正式请求/响应还要有超时、取消、版本协商与一次完成规则。这里的 requestId 只是当前页面的有限去重键，不是秘密，也不代表用户身份；刷新会清空集合。需要跨刷新、跨服务实例去重的写入，应回到服务端处理。

### 十、XS-Leaks 与进程隔离还有各自边界

**XS-Leaks** 指通过可观察差异推测跨站信息。例如，对方虽然读不到某资源正文，却可能从加载成功、窗口状态或时间差猜到登录状态。应先指出具体可观察面，再组合 Cookie 策略、Fetch Metadata、缓存策略、COOP 和祖先限制。

`Origin-Agent-Cluster` 请求按 origin 划分相应的 agent cluster，不保证独占操作系统进程，也不会替代 COOP/COEP。把同源 XSS 放进另一个进程并不能撤回它已拥有的数据权限。

跨源隔离减少特定信息泄漏面，仍不能证明第三方脚本可信、业务授权正确或所有计时差异消失。对安全结论的检查应回到 [SEC-01 的信任边界](../chinese-guides/sec-01-xss-csrf-trust-boundaries.md#一先画出谁提供数据谁执行动作)。

### 十一、迁移时记录每个资源怎样进入页面

先列脚本、图片、字体、Worker、iframe 和 popup，记录来源、请求模式、是否带凭据、响应策略、负责人和替代路径。登录返回链也算依赖；只打开首页一次看不到完整影响。

若 CORS 按请求 Origin 动态返回允许来源，应把对应变体纳入缓存，例如 `Vary: Origin`；它本身不实现授权。CDN、Service Worker 或旧缓存返回的资源与头，也需要核对。具体原理见 [NET-01 的缓存新鲜度](../chinese-guides/net-01-browser-network-fetch-reliability.md#三缓存新鲜度与重新验证分开看)。

按支持情况使用 Report-Only 收集影响，再选低风险路由启用。报告里的 URL 可能携带敏感参数，不能完整抄进日志；记录失败类别、责任归属和可重现路径即可。一个资源不兼容时，应修资源策略或换明确的基础路径。

### 十二、用观察结果回答边界问题

| 观察 | 能说明什么 | 还不能说明什么 |
| --- | --- | --- |
| 两个端口互相不能读取 DOM | 当前环境的跨源边界生效 | 跨站 Cookie、所有浏览器行为 |
| 无 CORP 图片被阻止 | 当前请求受到 COEP 检查 | 所有第三方资源都可迁移 |
| 指定窗口有回执，其他窗口被拒绝 | origin、source 和格式检查参与了决策 | 服务端授权或永久信任 |
| 策略查询 camera=false | 当前子文档的策略不允许摄像头 | 用户曾拒绝、设备损坏 |
| 隔离关闭仍显示数值 7 | 本例基础分支可用 | Worker 性能、真实旧引擎兼容 |

学完后，试着给一个“支付 popup + 合作方 iframe + Wasm 计算”的页面分配职责。能说明哪条路径需要隔离、哪条路径需要窗口联系、失败后用户如何继续，比记住响应头缩写更有用。

### 参考与延伸阅读

- [MDN：COEP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Embedder-Policy)：核对 require-corp、credentialless、请求模式与隔离条件。
- [MDN：COOP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Opener-Policy)：查阅窗口分组与不同指令的组合。
- [MDN：Permissions Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Permissions_Policy)：查阅父子权限交集、功能支持与 iframe allow。
- [MDN：postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)：核对来源、source、targetOrigin 和导航后的边界。
- [MDN：iframe](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe)：查阅 sandbox token 与不透明来源。
