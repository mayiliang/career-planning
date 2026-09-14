# 工程化知识点讲义

## ENG-02 开发与生产差异、环境变量、资源路径与缓存

“本地能打开，上线后白屏”通常不是一个足够准确的问题。可能是 HTML 找不到脚本，也可能脚本已加载却读错环境变量；可能只有刷新子页面失败，也可能只有一直没关闭的旧标签页失败。不同现象对应不同层，先区分它们，才能减少试配置的时间。

这篇接着上一讲的资料应用做三个观察：同一份源码如何生成不同环境的文件，应用放到 `/atlas/` 后浏览器会请求哪里，以及服务器怎样告诉浏览器“可以继续使用这份文件”。

### 学习前先确认

- 直接前置：[ENG-01 模块图、构建产物、代码分割与 Source Map](../chinese-guides/eng-01-module-graph-build-output-source-maps.md#eng-01)。准备好其中的 `build-lab`，能构建、预览并打开统计面板。

例子继续使用 Vite 6.4.3 和 Node.js 22.23.0。所有文件都放在这个练习目录中。下面的本地 HTTP 服务只用于观察路径与缓存，不承担正式部署所需的 TLS、压缩、访问控制或完整 HTTP 条件请求处理。

### 开发预览和部署各自提供哪些能力

**开发服务器（dev server）**不只是一个静态文件目录。它接收模块请求、转换源码，维护依赖关系，并通过热更新把变化通知页面。开发时浏览器看到 `/main.js`，并不表示生产服务器也应该读取项目根目录的这个源码文件。

| 环节 | 它提供什么 | 不能据此下什么结论 |
| --- | --- | --- |
| `npm run dev` | 源码转换、开发错误提示、热更新；也可配置代理 | 源码能运行，不代表构建文件、生产路径和生产权限正确 |
| `npm run build` | 环境替换、优化和产物生成 | 文件生成成功，不代表服务器会以正确路径和响应头交付 |
| `npm run preview` | 在本机提供构建文件，检查基本加载行为 | 不是对正式 CDN、反向代理、证书和缓存策略的复刻 |
| 正式部署 | 从指定来源提供 HTML、资源、API 和响应头 | 还需观察实际访问域名、发布版本与浏览器行为 |

Vite 的开发依赖预构建主要改善开发加载和依赖兼容；不要把预构建缓存当成生产部署制品。上一讲的 [manifest](../chinese-guides/eng-01-module-graph-build-output-source-maps.md#从-manifest-找到真正要部署的文件) 才是在生产构建中追踪入口与资源的线索。

例如开发配置把 `/api` 代理到后端，页面请求就可能成功；把 `dist` 复制到一个纯静态服务器后，那里并不会自动执行开发配置。Vite 某些预览配置又会继承开发代理，因此“预览成功”也可能把部署缺失掩盖住。检查生产边界时明确关闭预览代理，并让正式入口实际提供 API，或配置完整的跨域接口地址。

### 热更新保留现场也会保留错误的副作用

**热模块替换（HMR）**尝试只更新受影响的模块，保留页面中可保留的状态。能不能保留组件状态取决于框架和更新边界；改变模块结构时，工具可能退回整页刷新。不能承诺每次修改都不重置状态。

一个典型现象是：每保存一次源码，“收到消息”的日志就多打印一次。原因可能是模块顶层反复创建监听，而旧监听没有释放。先看下面这个可选实验，在 `main.js` 顶部加入 `import './hot-clock.js'`，以开发模式打开页面并观察控制台。

```js example=eng02-hot-clock runtime=project file=hot-clock.js
let ticks = 0;
const timer = setInterval(() => {
  ticks += 1;
  console.log(`计时器：${ticks}`);
}, 1000);

if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => clearInterval(timer));
}
```

修改日志中的中文再保存，应只剩新的计时器继续输出。对照时暂时去掉 `dispose` 那一行，再连续修改两次，旧计时器可能继续运行，形成多条计数流；最后恢复该行并整页刷新，清理已经遗留的现场。不要把这个故障对照留进业务项目。

这里清理的是模块替换生命周期。组件卸载、订阅参数改变和模块替换是不同触发条件，要各自找到资源的创建者。框架内的相同原则可以回看 [Vue 的生命周期与异步恢复](../chinese-guides/vue-05-lifecycle-effects-async-recovery.md#vue-05)。

### mode 决定配置组而不是是否优化构建

**模式（mode）**用于选择一组环境配置。`vite build --mode staging` 仍然执行生产构建，只是模式名为 `staging`；它不等于运行开发服务器。通常这次构建的 `MODE` 为 `staging`，`PROD` 为 `true`。如果显式设置了 `NODE_ENV`，还可能改变相关判断，所以记录实际命令和进程变量比只说“测试环境”更可靠。

先停止可选计时器实验，移除它的导入。在练习目录添加 `.env`，内容如下：

```text
VITE_SITE_LABEL=资料应用
VITE_REPORT_ENABLED=false
```

再添加 `.env.staging`：

```text
VITE_SITE_LABEL=资料应用·预发布
VITE_REPORT_ENABLED=true
```

在 `main.js` 顶部加入 `import './env.js'`，保存下面的文件：

```js example=eng02-env runtime=project file=env.js
function readBoolean(value, name) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${name} 必须明确写 true 或 false`);
}

const enabled = readBoolean(
  import.meta.env.VITE_REPORT_ENABLED,
  'VITE_REPORT_ENABLED',
);
const note = document.createElement('p');
note.id = 'environment';
note.textContent = [
  import.meta.env.VITE_SITE_LABEL,
  `mode=${import.meta.env.MODE}`,
  `prod=${import.meta.env.PROD}`,
  `report=${enabled}`,
].join(' | ');
document.querySelector('main').prepend(note);
document.querySelector('#report').disabled = !enabled;
```

先执行 `npm run build` 再预览，页面显示默认名称、`mode=production`、`prod=true`、`report=false`，统计按钮不可用。执行 `npm run build -- --mode staging` 后重新加载预览页，应显示预发布名称、`mode=staging`、`prod=true`、`report=true`。两次都在运行构建文件，差别来自构建时选入的配置。

若结果不符，检查同目录的 `.env.local`、`.env.staging.local`，以及启动命令之前已存在的进程变量。通常模式专用文件优先于通用文件，已有进程变量优先于文件；本地覆盖文件不应含糊地参与团队的正式构建。修改 `.env` 后重新启动开发服务，构建产物则必须重新构建。

### 配置值先解析再决定行为

环境文件中的值是字符串。`Boolean('false')` 等于 `true`，因为它判断的是字符串是否为空，而不是字符串的英文含义。上面的 `readBoolean` 故意拒绝缺失值和拼写错误，让问题在明确位置暴露。

```js example=eng02-config-values
console.log(Boolean('false'));
// => true
const raw = 'false';
console.log(raw === 'true');
// => false
const pageSize = Number('24');
console.log(Number.isInteger(pageSize) && pageSize > 0);
// => true
console.log(Number(''));
// => 0
```

最后一行说明数字也不能只做转换：如果空值不合法，先检查是否为空，再检查整数范围。端口、分页大小、超时时间和 URL 分别有自己的约束；把所有字符串一股脑转换成对象，只是把错误推迟到别处。

默认以 `VITE_` 开头的变量可以进入浏览器代码。API 密钥、数据库口令、服务器签名密钥不应放进去；即使没有显示在界面上，用户仍可读取下载到浏览器的代码和请求。环境文件被忽略提交，只影响仓库记录，不会使已经写进产物的值变成秘密。

公开配置与权限也要分清。这里禁用统计按钮只是界面选择，不能阻止用户自己发起请求。后端授权必须独立成立。对于读取外部配置的 TypeScript 代码，类型断言也不会验证数据；这一点会在 [ENG-05](../chinese-guides/eng-05-quality-gates-lint-types-tests-ci.md#类型检查和转译回答不同问题) 再用故障对照说明。

### 把应用放到子路径时检查浏览器实际请求

将 `vite.config.js` 完整替换为以下配置，继续构建预发布模式：

```js example=eng02-base-config runtime=project file=vite.config.js
export default {
  base: '/atlas/',
  build: { manifest: true, sourcemap: true },
  preview: { proxy: {} },
};
```

启动预览后访问它输出的地址下的 `/atlas/`。在 Network 中，入口脚本、报告脚本和报告 CSS 应位于 `/atlas/assets/`，按钮仍能得到“2 篇资料，共 30 分钟”的结果。查看 `dist/index.html`，它也应引用这个公共路径。

**公共基础路径（base）**改变的是资源对外访问的位置，不会自动给磁盘上的 `dist` 再套一层 `atlas` 目录。服务器需要把 URL 的 `/atlas/` 映射到 `dist`。应用内的路由基础路径、Service Worker 的注册位置与作用范围，也要与实际部署位置相容。

Vite 能处理它识别的资源引用，例如静态导入图片、CSS 中的 URL 和可分析的 `new URL(..., import.meta.url)`。它不会理解所有运行时字符串。如果代码写死 `fetch('/settings.json')`，请求仍从域名根开始；放在 `public/settings.json` 的公开文件可通过 `import.meta.env.BASE_URL + 'settings.json'` 取得对应子路径。`BASE_URL` 需要按工具支持的形式直接读取，任意动态属性访问未必能被静态替换。

若 CDN 资源域与页面域不同，再核对字体、跨域模块、凭据和内容安全策略，而不是通过改一个 base 猜测全部问题已经解决。判断标准始终是浏览器请求的完整 URL、响应状态和响应内容。

### 用一个本地服务观察路径与响应头

下面的服务直接读取刚构建的 `dist`，不提供开发代理或源码转换。保存为 `serve-dist.mjs`，执行 `node serve-dist.mjs`，浏览器访问 `http://127.0.0.1:4182/atlas/`。退出时在该终端按 Ctrl+C。

```js example=eng02-dist-server runtime=project file=serve-dist.mjs
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { createHash } from 'node:crypto';

const files = new Map();
async function collect(directory, prefix = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const relative = prefix + entry.name;
    if (entry.isDirectory()) {
      await collect(join(directory, entry.name), relative + '/');
    } else if (entry.isFile() && !entry.name.endsWith('.map')) {
      const body = await readFile(join(directory, entry.name));
      const etag = '"' + createHash('sha256').update(body).digest('hex') + '"';
      files.set('/atlas/' + relative, { body, etag });
    }
  }
}
await collect('dist');
if (!files.has('/atlas/index.html')) throw new Error('请先构建 dist');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  let key = pathname === '/atlas/' ? '/atlas/index.html' : pathname;
  const acceptsHtml = request.headers.accept?.includes('text/html');
  const isDocumentRoute = pathname.startsWith('/atlas/')
    && pathname !== '/atlas/api' && !pathname.startsWith('/atlas/api/')
    && !pathname.startsWith('/atlas/assets/') && !extname(pathname);
  if (!files.has(key) && acceptsHtml && isDocumentRoute) {
    key = '/atlas/index.html';
  }
  const file = files.get(key);
  if (!file) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('文件或接口不存在');
    return;
  }
  const immutable = /^\/atlas\/assets\/.+-[\w-]{8,}\.[\w]+$/.test(key);
  const headers = {
    'Content-Type': types[extname(key)] ?? 'application/octet-stream',
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    ETag: file.etag,
  };
  if (request.headers['if-none-match'] === file.etag) {
    response.writeHead(304, headers);
    response.end();
    return;
  }
  response.writeHead(200, headers);
  response.end(file.body);
}).listen(4182, '127.0.0.1', () => {
  console.log('打开 http://127.0.0.1:4182/atlas/');
});
```

服务启动时把文件读入内存，因此重新构建后需要重启它。示例把隐藏目录和 `.map` 排除在公开文件表外；访问 URL 只能命中这张表，不会拼接用户输入去读取任意磁盘路径。它只演示最简单的 ETag 精确匹配，不实现条件头列表、弱比较、Range、压缩变体等完整语义，正式服务使用成熟实现。

### 页面回退不能吞掉资源和接口错误

在地址栏访问 `/atlas/lessons/closure`，服务会返回应用的 HTML。这让 SPA 路由器有机会解释深层路径。本例没有安装路由器，所以看到相同主页属于预期，并不代表已经实现详情路由。

再请求 `/atlas/assets/missing.js` 或 `/atlas/api/missing`，应得到真正的 `404`，不能返回 HTML `200`。否则浏览器可能报告“模块 MIME 类型错误”或 `Unexpected token '<'`，开发者却去检查完全没有问题的 JavaScript 语法。

| 观察到的结果 | 优先检查什么 |
| --- | --- |
| 站内导航正常，刷新深层地址 404 | 文档路由是否回退到应用入口 |
| JS 请求 200，内容却以 HTML 开始 | 回退规则是否吞掉缺失资源 |
| API 返回首页 | API 路径是否被误当成页面路由 |
| 所有资源都指向域名根 | 构建 base、运行时绝对路径与代理前缀是否一致 |

回退规则要按产品路由定义。上面用“没有文件扩展名”的启发式足够演示，但真实应用可能包含带点的路由，不能不经调整直接复制。Vue 应用中的导航与服务端回退边界，可以接着读 [VUE-07](../chinese-guides/vue-07-router-navigation-boundaries.md#vue-07)。

### 缓存新鲜度与文件是否存在是两回事

**缓存（cache）**让浏览器或中间节点复用已有响应。文件名里的 hash 使不同内容通常得到不同 URL；HTTP 响应头则决定同一个 URL 的响应可以怎样复用。这是两个配合的机制。

| 响应策略 | 读者可以怎样理解 | 常见适用对象 |
| --- | --- | --- |
| `no-cache` | 可以存，但复用前通常要向服务器验证 | 容易换版本的 HTML、公开运行配置 |
| `no-store` | 不应存储这次响应 | 不希望进入缓存的敏感响应，具体仍按业务策略 |
| `max-age=31536000, immutable` | 在很长的新鲜期内按内容不变处理 | 真正按内容命名、发布后不覆盖的静态资源 |
| `ETag` + `If-None-Match` | 用验证标识询问缓存内容是否仍有效 | 支持重新验证的资源 |

`no-cache` 不等于“绝不使用缓存”。条件验证返回 `304` 时，响应没有重新传输文件正文，浏览器仍使用已有内容。反过来，只给一个会被覆盖的 `app.js` 加一年缓存，用户可能长期看不到修复。

保存下面的观察脚本，保持本地服务运行，在另一终端执行 `node inspect-http.mjs`：

```js example=eng02-http-observation runtime=project file=inspect-http.mjs
const origin = 'http://127.0.0.1:4182';
const first = await fetch(origin + '/atlas/');
const html = await first.text();
console.log('HTML', first.status, first.headers.get('cache-control'));
const repeated = await fetch(origin + '/atlas/', {
  headers: { 'If-None-Match': first.headers.get('etag') },
});
console.log('再次验证', repeated.status, (await repeated.text()).length);
const source = html.match(/src="([^"]+\.js)"/)?.[1];
if (!source) throw new Error('没有找到构建入口');
const asset = await fetch(new URL(source, origin));
console.log('脚本', asset.status, asset.headers.get('cache-control'));
const missing = await fetch(origin + '/atlas/assets/missing.js');
console.log('缺失脚本', missing.status, missing.headers.get('content-type'));
```

预期依次观察到 HTML `200 no-cache`、再次验证 `304 0`、脚本的长期 immutable 策略、缺失脚本 `404 text/plain`。Node fetch 不会替你模拟浏览器的完整缓存，这里是显式发送验证头来观察服务器协议；浏览器是否命中内存、磁盘或网络缓存，仍要结合 Network 的来源标记判断。

### 发布新版本时旧页面仍可能需要旧文件

假设周一构建得到 `report-A.js`，一位用户打开页面但没有点统计。周二发布后服务器只剩 `report-B.js`，用户这时才点按钮：仍在运行的周一入口会请求 `report-A.js`。HTML 已更新、缓存头也正确，依然会失败，因为旧文件已经不存在。

发布时先上传新资源并确认可访问，再切换 HTML 或版本入口；为合理存活期内的旧页面保留旧 hash 文件。不要在新 HTML 可见之前覆盖一半资源，也不要只考虑刚打开的新标签页。回滚同样要让 HTML、资源与配置回到相容的组合。

遇到动态导入失败，可以利用工具提供的预加载错误事件或应用错误边界，区分离线、资源丢失和版本变化，给出“页面已更新，保存后重新加载”的操作。不要在每次失败时无限自动刷新：网络故障不会靠刷新治好，未保存内容也会丢失。界面恢复的设计可连接 [React 错误边界与恢复](../chinese-guides/react-08-error-boundaries-suspense-recovery.md#react-08)。

### 运行配置与多端构建要明确生效时刻

构建时变量已经写进文件，部署后修改服务器上的 `.env` 不会改掉下载到浏览器的字节。如果希望“一份构建产物部署多套环境”，可以启动时读取公开的 `config.json`，但要增加加载、校验、失败展示和缓存策略，并说明配置与应用版本的兼容范围。

例如页面先取得 `{ apiBase, schemaVersion }`，确认版本支持、URL 合法，再启动请求；配置不存在时显示明确错误，而不是默默回退到另一个环境。它仍然是公开数据，不能装服务器秘密。运行时功能开关也应有负责人、默认行为和移除条件，避免长期叠加出无法解释的组合。

灰度发布时，新旧页面可能同时请求同一套 API。新版本开始发送一个必填字段之前，需要考虑旧页面仍不会发送它；回滚页面之后，新配置也可能暂时保留。按实际需要安排兼容窗口，记录客户端版本、配置版本和接口能力，比只给环境贴上“灰度”标签更容易定位组合问题。

SSR 至少涉及服务端执行与浏览器执行两套环境。`window` 不能假设在服务器存在，服务器变量也不能全部转发给客户端；Worker 可能又有独立入口和能力限制。应按“执行位置、可用 API、资源前缀、配置来源”列出实际支持组合，不靠一个 `production` 标签包办判断。

Service Worker 还会增加一层独立缓存和激活生命周期。普通刷新不一定替换正在控制页面的 Worker；Cache Storage 中的响应也不由普通 HTTP 缓存规则直接统一管理。排错时记录控制器版本、缓存内容和更新状态，避免把清缓存后成功当成修复证明。

### 从一次真实请求定位生产差异

面对白屏，先固定访问 URL、发布版本、复现操作与错误时间。接着沿 HTML、入口脚本、异步脚本、样式、API 逐个看状态、MIME、响应正文和缓存来源。一次请求已经能把“找不到资源”和“代码执行失败”分开。

CSS 顺序、字体加载、CSP、Cookie 的 SameSite/Secure、跨域策略和 HTTPS 混合内容都可能只在部署条件下出现。应修正对应来源与策略，不把关闭浏览器保护当成产品修复。Source Map 必须与实际失败的版本一致，见 [ENG-01 的还原步骤](../chinese-guides/eng-01-module-graph-build-output-source-maps.md#source-map-把生成位置接回源码)。

读完这篇，试着完整解释两个现场：“新开标签页正常，旧页面点按钮失败”和“站内能进详情，刷新详情却失败”。如果能分别沿版本资源与文档路由找证据，就已经从“生产环境很玄学”走到了可以逐层定位的问题。

### 参考与延伸阅读

核对日期：2026-09-10。Vite 示例按 6.4.3 运行，当前文档用于核对公共概念与迁移差异。

- [Vite 6：生产构建与公共基础路径](https://v6.vite.dev/guide/build)：对应子路径、旧 chunk 与发布边界。
- [Vite：环境变量与模式](https://vite.dev/guide/env-and-mode)：对应加载优先级、字符串、公开前缀和 mode。
- [Vite：HMR API](https://vite.dev/guide/api-hmr)：对应 accept、dispose 和模块更新生命周期。
- [MDN：HTTP 缓存指南](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)：对应新鲜度、重新验证和缓存响应头。
- [MDN：Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)：对应独立的控制、更新与缓存边界。
