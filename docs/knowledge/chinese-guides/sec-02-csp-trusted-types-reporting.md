# 浏览器安全策略学习资料

## SEC-02 用 CSP 与 Trusted Types 限制错误入口

评论已经净化，页面也使用了安全的文本插入方式，为什么还要加浏览器策略？因为大型应用里可能出现新的调用点、旧代码或第三方脚本，团队希望浏览器在边界被绕过时再挡一次，并留下可诊断的信号。

本篇从一个本地页面出发，对比 Report-Only 与强制执行：未获准脚本是否运行，普通字符串能否写入受保护的 DOM 入口，经过净化的内容是否仍能正常显示。策略只用于这个教学服务，不修改当前系统的生产响应头。

### 学习前先确认

- 直接前置：[SEC-01 XSS、CSRF 与前端输入输出信任边界](../chinese-guides/sec-01-xss-csrf-trust-boundaries.md#sec-01)。需要先区分输出编码、HTML 净化、请求来源检查与授权。

### 一、策略和净化各自负责什么

**内容安全策略（Content Security Policy）**，简称 CSP，是浏览器根据文档策略执行的一组限制。它可以约束脚本和资源、表单目标、嵌入关系，以及某些 DOM 注入入口。它不理解“谁有权修改第七份资料”，也不会自动把任意 HTML 变成安全结构。

| 防线 | 主要职责 | 不会自动完成 |
| --- | --- | --- |
| 安全 DOM API | 避免把普通文本解析成 HTML | 资源授权 |
| Sanitizer | 保留允许的 HTML 结构 | 决定第三方脚本是否可信 |
| CSP | 限制执行、加载与文档行为 | 净化所有用户内容 |
| Trusted Types | 约束部分 DOM XSS sink 接收的值 | 审核 policy 的转换逻辑 |
| 服务端授权 | 判断主体、资源与动作 | 修复页面内注入 |

要先把实际数据流写清，再使用策略缩小剩余错误空间。策略越来越长，却找不到每条限制对应的风险，会让维护和故障恢复都变得困难。

### 二、从指令的控制方向读策略

| 指令 | 控制什么 | 常见误解 |
| --- | --- | --- |
| default-src | 部分资源指令缺失时的回退 | 它不会自动覆盖所有指令 |
| script-src | 脚本执行与相关来源 | self 不等于同源内容都安全 |
| connect-src | Fetch、WebSocket 等连接 | 不取代服务端 CORS 和授权 |
| img-src / style-src | 图片与样式来源 | 放开一种不会自动放开另一种 |
| object-src | 插件等对象资源 | 常见基础策略可设为 none |
| base-uri | base 元素允许的目标 | 防止相对 URL 被意外改写 |
| form-action | 表单可以提交到哪里 | 不是 CSRF token 检查 |
| frame-ancestors | 谁能嵌入当前文档 | 方向与 frame-src 相反 |

HTTP 响应头能在文档解析前提供策略。meta CSP 支持范围不同，不能完整替代 Report-Only、frame-ancestors 等头部能力，而且它出现之前的加载已有时间窗口。

多条强制 CSP 会分别执行，不是后一条覆盖前一条。排查时看浏览器实际收到的全部响应头，而不仅是应用代码里最后拼出的那个字符串。

### 三、Nonce 与 Hash 授予什么信任

**Nonce** 是为每个 HTML 响应生成的不可预测随机值。响应头中的 nonce source 与获准 script 标签上的 nonce 必须匹配。它应由密码学安全随机源产生，不能写成构建常量或按时间简单拼接。

**Hash** 则匹配确定内容的哈希，适合构建时已知、字节稳定的内联脚本。空白变化也可能让哈希失配。它与 SRI 相关但不相同：CSP 决定是否允许执行，SRI 验证获取资源的内容完整性，跨源使用还有相应条件。

Nonce 的目的不是对已经执行的同源脚本保密，而是让单靠注入标记的人不能预先构造获准脚本。它不能给错误的受信代码“洗白”。

对可缓存的静态 HTML，hash 往往比每响应 nonce 更容易维护。若使用 nonce，头与正文必须来自同一次可信改写，不能让 CDN 缓存旧正文却返回新头。

### 四、启动策略对照实验

在独立目录准备 DOMPurify 3.4.12 的 `purify.min.js`，方法与上一讲相同。保存以下三个文件，使用 Node.js 22 执行 `node csp-server.mjs`，打开 `http://127.0.0.1:43815`。切换到 `/?mode=report` 可观察只报告模式。

服务器每次返回 HTML 都生成新 nonce，并设置 no-store。报告端只保留少量分类字段，不打印完整报告、URL 或 nonce。本地使用 report-uri 展示旧格式接收，生产环境还需根据支持情况规划 Reporting API。

```js example=sec-policy-server runtime=project file=csp-server.mjs
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
const summaries = [];
const allowed = new Set(['script-src-elem', 'require-trusted-types-for', 'trusted-types']);
const sendJson = (res, code, value) => {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
};
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1:43815');
    if (req.method === 'GET' && url.pathname === '/') {
      const nonce = randomBytes(18).toString('base64');
      const policy = [
        "default-src 'none'", `script-src 'nonce-${nonce}' 'strict-dynamic'`,
        `style-src 'nonce-${nonce}'`, "connect-src 'self'", "img-src 'none'",
        "object-src 'none'", "base-uri 'none'", "form-action 'self'", "frame-ancestors 'none'",
        "require-trusted-types-for 'script'", 'trusted-types lesson-html dompurify', 'report-uri /reports',
      ].join('; ');
      const header = url.searchParams.get('mode') === 'report'
        ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';
      const html = (await readFile(new URL('csp.html', import.meta.url), 'utf8')).replaceAll('__NONCE__', nonce);
      res.writeHead(200, { [header]: policy, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(html); return;
    }
    if (req.method === 'GET' && ['/csp-client.js', '/purify.min.js'].includes(url.pathname)) {
      res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' });
      res.end(await readFile(new URL('.' + url.pathname, import.meta.url))); return;
    }
    if (req.method === 'POST' && url.pathname === '/reports') {
      const type = req.headers['content-type']?.split(';')[0].trim();
      if (type !== 'application/csp-report') { sendJson(res, 415, { code: 'TYPE' }); return; }
      const parts = []; let bytes = 0;
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > 8192) { res.writeHead(413); res.end(); req.destroy(); return; }
        parts.push(chunk);
      }
      let report;
      try { report = JSON.parse(Buffer.concat(parts).toString('utf8'))?.['csp-report']; }
      catch { sendJson(res, 400, { code: 'JSON' }); return; }
      if (report && allowed.has(report['effective-directive'])) {
        summaries.push({ directive: report['effective-directive'],
          disposition: report.disposition === 'report' ? 'report' : 'enforce',
          blocked: ['inline', 'eval', 'trusted-types-sink', 'trusted-types-policy'].includes(report['blocked-uri'])
            ? report['blocked-uri'] : 'other' });
        if (summaries.length > 50) summaries.shift();
      }
      res.writeHead(204); res.end(); return;
    }
    if (req.method === 'GET' && url.pathname === '/report-summary') {
      sendJson(res, 200, summaries); return;
    }
    res.writeHead(404); res.end();
  } catch { if (!res.headersSent) res.writeHead(500); res.end(); }
}).listen(43815, '127.0.0.1', () => console.log('策略实验：http://127.0.0.1:43815'));
```

保存 `csp.html`。故意不带 nonce 的脚本只设置一个教学标记，用来观察是否被执行；没有数据读取、外发或其他业务副作用。

```html example=sec-policy-page runtime=project file=csp.html
<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<title>CSP 与 Trusted Types 对照</title>
<style nonce="__NONCE__">
  body { max-width: 56rem; margin: 3rem auto; padding: 0 2rem; font: 18px/1.7 system-ui; color: #172d3c; }
  button, textarea { font: inherit; padding: .6rem; } button { margin: .4rem; }
  textarea { display: block; box-sizing: border-box; width: 100%; min-height: 7rem; }
  section { border: 1px solid #8e9daa; padding: 1rem; margin-block: 1rem; border-radius: .6rem; }
  :focus-visible { outline: 3px solid #005fcc; outline-offset: 3px; }
</style>
<main>
  <h1>CSP 与 Trusted Types 对照</h1>
  <p><a href="/">强制模式</a> · <a href="/?mode=report">只报告模式</a></p>
  <p id="probe">等待检查未获准脚本</p>
  <section>
    <h2>受保护的 HTML 入口</h2>
    <label for="source">待展示内容</label>
    <textarea id="source">&lt;p&gt;&lt;strong&gt;重点&lt;/strong&gt;：策略与净化各有职责。&lt;/p&gt;</textarea>
    <button id="safe">通过净化 policy 显示</button><button id="raw">尝试直接写入固定字符串</button>
    <p id="result" role="status"></p><div id="preview"></div>
  </section>
  <h2>当前页面收到的违规事件</h2><ul id="violations"></ul>
</main>
<script>document.documentElement.dataset.unapproved = 'ran';</script>
<script nonce="__NONCE__" src="./purify.min.js" defer></script>
<script nonce="__NONCE__" src="./csp-client.js" defer></script>
</html>
```

保存 `csp-client.js`。命名 policy 的转换仍经过净化器；不支持 Trusted Types 时也调用同一套净化规则。直接写入的反例使用固定、无执行行为的 em 字符串，足以观察类型约束。

```js example=sec-policy-client runtime=project file=csp-client.js
const el = (id) => document.getElementById(id);
el('probe').textContent = document.documentElement.dataset.unapproved === 'ran'
  ? '未获准脚本已执行：当前没有被这条脚本策略强制阻断。'
  : '未获准脚本没有执行。';
document.addEventListener('securitypolicyviolation', (event) => {
  const item = document.createElement('li');
  item.textContent = `${event.effectiveDirective} / ${event.disposition}`;
  el('violations').append(item);
});
const clean = (value) => DOMPurify.sanitize(value, {
  ALLOWED_TAGS: ['p', 'strong', 'em', 'code', 'br'], ALLOWED_ATTR: [],
  ALLOW_DATA_ATTR: false, ALLOW_ARIA_ATTR: false, RETURN_TRUSTED_TYPE: false,
});
let policy = null;
if (window.DOMPurify?.isSupported && window.trustedTypes) {
  policy = trustedTypes.createPolicy('lesson-html', { createHTML: clean });
}
el('safe').onclick = () => {
  if (!window.DOMPurify?.isSupported) {
    el('preview').textContent = el('source').value;
    el('result').textContent = '净化器不可用，按普通文字显示。'; return;
  }
  el('preview').innerHTML = policy ? policy.createHTML(el('source').value) : clean(el('source').value);
  el('result').textContent = '已按允许结构显示。';
};
el('raw').onclick = () => {
  try {
    el('preview').innerHTML = '<em>固定教学字符串</em>';
    el('result').textContent = '普通字符串被接受；这个入口当前未强制 Trusted Types。';
  } catch (error) {
    el('result').textContent = `${error.name}：普通字符串被拒绝。`;
  }
};
```

在支持相关指令的浏览器中，强制模式应阻止未获准脚本，普通字符串写入抛 TypeError，而净化 policy 仍能显示粗体。只报告模式下，同样的违规可能仍会执行；其价值是发现问题，不是已经提供阻断。

页面监听器安装前产生的事件未必出现在下方列表，网络报告也可能延迟或未送达。因此判断脚本是否执行要看标记，判断写入是否被阻止要看实际 DOM 和异常，不要求报告数量与操作次数严格相等。

### 五、strict-dynamic 信任的是加载链

**strict-dynamic** 让通过 nonce/hash 获准的脚本在符合规则时把信任传给动态创建的后代脚本。在支持它的浏览器中，传统 host source 等的适用方式会改变，不能只按字符串里的域名数量判断策略强弱。

例如受信加载器从固定版本清单选资源，是可以解释的加载关系；若它直接把 URL 参数当作 script.src，那么 nonce 也会把错误输入带入受信加载链。策略无法替代加载器的数据边界检查。

本地实验只证明带 nonce 的静态入口可执行、未获准内联脚本被阻止，没有动态加载器或跨源依赖树。模块、Worker、Wasm 和 eval 类能力还要按具体指令核对；不要为解决一个库的报错就无条件加入 unsafe-eval。

### 六、Trusted Types 要求值经过命名入口

**Trusted Types** 让受保护的 DOM XSS sink 要求特定类型，例如 TrustedHTML、TrustedScript 或 TrustedScriptURL。`require-trusted-types-for 'script'` 开启相关入口约束，trusted-types 指令限制可创建的 policy 名称，这两项不是同一个开关。

名字叫 lesson-html，并不代表返回值自然安全。如果 createHTML 直接返回用户字符串，只是把危险操作集中包装起来。转换函数必须体现具体用途：允许什么结构，如何净化，什么情况拒绝。

本例 createHTML 调用 DOMPurify，并设置 RETURN_TRUSTED_TYPE 为 false，因为 policy 的转换回调返回净化后的字符串，由浏览器再生成 TrustedHTML。策略同时允许 dompurify 名称，是为了该版本净化器的内部解析集成；真实项目应核对实际依赖使用的 policy，而不是无限扩大允许集合。

如果内容只是文字，根本不需要绕这一圈，用 textContent 即可。减少危险入口，通常比给每个入口都建一个 policy 更容易维护。

### 七、默认 policy 与不支持环境的边界

default policy 可以接住遗留的字符串调用，适合有期限的迁移；原样返回输入却会成为全局绕过。迁移应知道哪些调用点还在依赖它、谁负责改造、何时删除。

没有 Trusted Types 的环境，不会提供相同的浏览器强制，但净化仍必须执行。本文 safe 按钮两条分支共用 clean；不能在能力缺失时直接写入原始输入。

同样，允许 policy 名称只是限制创建入口，不审核业务逻辑。浏览器策略、净化器配置、第三方适配和实际内容都要保持一致。安全边界的基础仍见 [SEC-01](../chinese-guides/sec-01-xss-csrf-trust-boundaries.md#sec-01)。

### 八、从报告迁移到强制执行

**Report-Only** 适合观察“如果启用策略，哪些合法功能会受影响”。可以先梳理脚本、样式、富文本和第三方依赖，修复正常路径，再按路由与版本逐步强制。

更严格的只报告头可以与已有强制头并存，各自独立生效。出现问题时应定位具体指令与调用来源，回退最近引入的限制，而不是把整个策略改成通配符。

迁移条件要与任务连接：资料是否能阅读、编辑是否可保存、第三方功能是否有明确责任人、危险入口是否出现预期阻断。长期停留在只报告模式，是尚未完成迁移的状态，不是等价的防护方案。

### 九、HTML 缓存与策略必须属于同一版本

头里允许 nonce=n2，HTML 里的脚本却带 n1，合法功能就会被拦截。常见原因是缓存旧正文、单独改响应头，或者 Service Worker 返回了另一版文档。

因此 nonce 与 HTML 要在同一可信渲染过程产生。本文用 no-store 简化这一问题，并不意味着所有站点都应禁用 HTML 缓存。静态页面可以采用构建期 hash，动态边缘改写则必须同时处理头和标记。

诊断时记录发布版本、响应来源和缓存状态，必要时在本地受控环境比较头与正文，不把完整 nonce 上传进普通日志。缓存机制与验证器可接回 [NET-01](../chinese-guides/net-01-browser-network-fetch-reliability.md#net-01)。

### 十、报告是输入，不能直接当作事故结论

**违规报告（Violation Report）**可能来自真实代码回归、第三方变化、浏览器扩展或伪造请求。缺报告不证明没有违规，报告增多也不证明攻击已成功。

本例接收端限制类型与 8 KiB 大小，只保留已知指令、模式和几种分类，最多留下 50 条记录。它没有认证、限流、聚合队列或持久化，只适合回环教学；生产接收端需要限制资源消耗并承担长期数据治理。

新 Reporting API 使用 Reporting-Endpoints 声明端点组，CSP 的 report-to 指向相应组；旧 report-uri 使用另一种请求与正文格式。浏览器支持 report-to 时通常优先采用它，不应笼统假设两套配置总会各发一次。采集仍应能够处理重复、延迟与未知字段。

报告中的文档 URL、查询参数、源码位置甚至样本可能含敏感内容。归一化到路由模板、资源标识、指令和发布版本即可回答许多问题；不要为方便排错保存完整攻击文本或用户正文。

### 十一、其他文档限制不要混成一条规则

frame-ancestors 限制父页面，frame-src 限制自己加载的 frame；base-uri 限制 base 对相对地址的影响；form-action 限制表单提交目标。它们减少不同路径的风险，仍不代替服务端请求来源检查和授权。

upgrade-insecure-requests 可以要求升级某些不安全资源请求，但目标必须真正支持 HTTPS。它不是 HSTS，也不验证第三方资源内容。混合内容迁移应先清理实际地址与服务能力，再用策略辅助，不能只靠隐藏控制台错误。

本例使用 HTTP 回环开发服务，没有验证真实站点的 TLS、混合内容、嵌入授权或跨域部署。这些行为需要在对应环境独立核对。

### 十二、把验证结果写成可解释的证据

一次合理的策略检查可以记录：响应头是否正确，两个 HTML 响应的 nonce 是否不同且各自匹配，合法脚本是否工作，未获准脚本是否改变标记，字符串 sink 是否拒绝，净化内容是否可用，报告是否只保留允许字段。

这些证据各自支持有限结论。只看到控制台没有报错，可能是没有触发对应路径；只看到报告 204，也不能证明客户端已阻断。图像、DOM、异常和接收记录应互相印证。

第三方脚本也需要用途、版本、加载关系与退出方式。若每次新报错都只追加一个域名，策略会逐渐失去意义。工程评审可以按 [CAREER-05](../chinese-guides/career-05-code-review-risk-communication.md#career-05) 的方式写出触发条件、后果与具体修改请求。

学完后应能解释：为什么固定 nonce 不合适，为什么 Report-Only 里脚本仍可能运行，为什么 TrustedHTML 不等于自动净化，以及为什么完整报告也要被当作不可信输入。浏览器防线的价值，来自这些清楚且可维护的约束。

### 参考与延伸阅读

审校日期：2026-09-14。浏览器策略按具体指令检查，示例使用本地、无敏感数据的独立页面。

- [MDN：CSP 指南](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP)：策略组合、nonce/hash 与部署。
- [MDN：Trusted Types API](https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API)：policy、类型与 sink 强制。
- [DOMPurify 官方仓库](https://github.com/cure53/DOMPurify)：Trusted Types 集成与返回值设置。
- [MDN：report-to](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/report-to)：报告端点组与旧接口关系。
- [MDN：upgrade-insecure-requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/upgrade-insecure-requests)：升级范围与限制。
