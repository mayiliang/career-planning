# B03 异步边界、模块与类型

## JS-06 ES Modules 与模块边界

同一段金额格式化逻辑被复制到三个页面，后来改规则时只改了两处；一个文件为了读取用户状态导入另一个文件，另一个文件又反过来导入它。代码分成多个文件后，重复与依赖问题并不会自动消失。

模块要解决的是：哪些名字只在内部使用，哪些能力允许外部调用，代码依赖谁，以及导入时到底会发生什么。本篇先用两个文件跑通，再逐步加入共享状态、循环、异步加载和资源清理。

### 学习前先确认

- 直接前置：[JS-05 Promise 错误处理与异步控制流](../chinese-guides/js-05-promise-errors-async-control-flow.md#js-05)。动态导入返回 Promise，失败仍需要明确的处理边界。

本篇示例是多文件程序，不能把含静态 import/export 的片段直接粘到普通 Console 当成一段脚本。每组文件放在各自目录，入口为 `main.mjs`，由同目录 HTML 的 `<script type="module" src="./main.mjs"></script>` 加载。通过本地 HTTP 服务打开；已有前端项目也可以使用自己的开发服务。不同示例不要覆盖后混在同一目录运行。输出按注释核对。

### 用两个文件建立公开入口

**ES Module** 是 JavaScript 的标准模块形式。模块里的名字默认属于自己，写上 `export` 才允许其他模块导入。

文件：`money.mjs`

```js example=js06-exports runtime=browser file=money.mjs
const centsPerYuan = 100;
export const currency = 'CNY';
export default function formatMoney(cents) {
  return `${currency} ${(cents / centsPerYuan).toFixed(2)}`;
}
```

文件：`main.mjs`

```js example=js06-exports runtime=browser file=main.mjs
import format, { currency as unit } from './money.mjs';
import * as money from './money.mjs';
console.log(format(1250), unit); // => CNY 12.50 CNY
console.log(typeof money.default); // => function
console.log(Object.keys(money).sort().join(',')); // => currency,default
```

`currency` 是具名导出；导入时名称应当匹配，也可以用 `as` 改成本地名字 `unit`。`formatMoney` 是默认导出，一个模块最多有一个，导入方可以命名为 `format`。大括号是模块语法的一部分，不是在运行时对对象做解构。

`import * as money` 得到**模块命名空间对象（module namespace object）**。可以通过它读取公开导出，默认导出位于 `.default`。没有导出的 `centsPerYuan` 不在这个公开集合里；外部不需要知道内部换算常量怎样组织。

模块会自动采用 JavaScript 严格模式，顶层 `this` 为 `undefined`。顶层变量不会因为写在文件开头就自动成为 `window` 属性。这使模块内部实现有清晰边界，但并不阻止代码主动写全局对象；如果所有模块仍共同修改 `globalThis.app`，依赖就又藏回全局状态中了。

### 先找到模块再连接导入导出

`'./money.mjs'` 这样的字符串叫**模块说明符（module specifier）**。JavaScript 规定导入导出的语法与绑定关系，浏览器、Node.js 和构建工具决定说明符对应哪里。

| 写法 | 在表达什么 | 需要确认什么 |
| --- | --- | --- |
| `./money.mjs` | 相对于当前模块的位置 | 相对的是导入者，不是 HTML 所在目录 |
| `/shared/money.mjs` | 网站根路径下的资源 | 部署到子路径时地址是否仍然成立 |
| `https://example.com/money.mjs` | 完整资源 URL | 网络、内容类型与跨源策略 |
| `some-library` | 裸说明符 | 由 import map、包解析或构建工具解释 |

浏览器原生模块不会替所有裸说明符自动去某个 node_modules 找包。相对 URL 也没有通用的“自动补 `.js`、自动找 `index.js`”规则，应写能实际请求到的地址。文件扩展名可以由服务器约定，但响应必须具有可接受的 JavaScript MIME 类型。

这也解释了一种常见报错：请求的路径不存在，开发服务器返回了 HTML 首页，浏览器提示模块 MIME 不正确。问题不是 import 拼写形式错误，而是拿回来的资源根本不是 JavaScript。

跨源模块加载需要满足 CORS。直接双击 HTML 用 `file://` 打开，则可能受到本地文件安全限制。先确认加载方式和响应，再分析模块内部代码，能避免把网络问题误当成语言问题。

### 模块图不是把代码按文字顺序粘起来

如果 `main.mjs` 导入 `settings.mjs`，可以画一条 `main → settings` 的依赖边。多个文件组成**模块图（module graph）**。运行前，宿主需要找到静态依赖，模块系统才能连接它们的导入导出。

可以先分成三个阶段理解：读取与解析源码，确认静态依赖；链接或实例化，为模块建立环境并连接绑定；求值，实际执行顶层语句。加载资源的网络动作与语言层的链接、求值不是同一件事，工具也可能提前预加载资源。

文件：`settings.mjs`

```js example=js06-evaluation runtime=browser file=settings.mjs
console.log('配置模块开始执行'); // => 配置模块开始执行
export const language = 'zh-CN';
```

文件：`main.mjs`

```js example=js06-evaluation runtime=browser file=main.mjs
import * as first from './settings.mjs';
console.log(`入口读取：${first.language}`); // => 入口读取：zh-CN
const second = await import('./settings.mjs');
console.log(first === second); // => true
```

入口正文读取配置前，依赖的初始化已经完成。随后动态导入同一个模块得到相同命名空间，这次不会再打印“配置模块开始执行”。在同一执行环境中，成功加载的同一模块通常复用已有实例。

这里的“同一模块”与解析后的模块身份有关，浏览器主要以 URL 等信息识别；不同查询参数、不同执行环境或开发工具热更新，不能一概当作同一个实例。更不能把“顶层只执行一次”误解为“导出的函数调用多少次都只执行一次”。

由 HTML 解析器遇到、没有 async 属性的普通模块脚本默认延后执行；具体与 HTML 解析和其他脚本的顺序还受脚本属性影响。分析时先区分入口脚本的调度与模块依赖的求值关系，不必把所有情况挤进“从文件第一行开始”的模型。

### 实时绑定让读取跟着导出方变化

静态导入连接的是导出绑定，不是导入瞬间的一份值快照。这叫 **live binding**，可以理解为“以后每次读取，仍然读这一个导出位置”。

文件：`counter.mjs`

```js example=js06-live-binding runtime=browser file=counter.mjs
export let count = 0;
export const detail = { label: '未开始' };
export function increment() { count++; }
```

文件：`main.mjs`

```js example=js06-live-binding runtime=browser file=main.mjs
import { count, detail, increment } from './counter.mjs';
import * as counter from './counter.mjs';
const snapshot = count;
const { count: destructured } = counter;
increment();
console.log(count, counter.count, snapshot, destructured); // => 1 1 0 0
detail.label = '已经开始';
console.log(counter.detail.label); // => 已经开始
```

`count` 与 `counter.count` 继续读取导出位置，因此变成 1；普通赋值的 `snapshot` 和从命名空间解构出的数字，只保留当时读到的 0。这与 [B01 的绑定和快照](../chinese-guides/js-01-execution-context-scope-closure.md#闭包保存的是变量还是快照) 可以放在一起理解。

导入方不能直接给导入的 `count` 重新赋值，应通过导出方提供的命令改变它。但 `detail` 指向可变对象，给 `detail.label` 赋值仍然可以成功。导入绑定只读，不等于对象被深冻结；对象共享见 [B01 的对象身份](../chinese-guides/js-03-types-equality-copy-immutability.md#赋值之后谁和谁共用对象)。

默认导出也要看语法：`export default count` 会求出该表达式的值；`export { count as default }` 则导出 count 的绑定。不能仅凭“default”一词就判断更新是否会被观察到。默认导出与具名导出的选择，应服务于模块含义和命名一致性。

### 循环依赖为什么会读到尚未初始化的变量

下面这组文件故意形成循环。`a` 初始化需要 `b`，`b` 初始化又需要 `a`；谁都不能凭空先有值。

文件：`a.mjs`

```js example=js06-cycle runtime=browser file=a.mjs
import { b } from './b.mjs';
export const a = b + 1;
```

文件：`b.mjs`

```js example=js06-cycle runtime=browser file=b.mjs
import { a } from './a.mjs';
export const b = a + 1;
```

文件：`main.mjs`

```js example=js06-cycle runtime=browser file=main.mjs
try {
  await import('./a.mjs');
} catch (error) {
  console.log(error.name); // => ReferenceError
}
```

| 所处阶段 | 发生什么 |
| --- | --- |
| 发现依赖 | a 导入 b，b 又导入 a，形成环 |
| 连接绑定 | 两边知道对方导出哪个名字 |
| 执行初始化 | 某一方读取另一方尚未初始化的 const |
| 观察结果 | 暂时性死区读取失败，入口收到拒绝 |

“知道变量在哪”与“变量已经有值”不同。ESM 循环不是一律返回 `undefined`；对于尚未初始化的 let/const 等绑定，这里会抛出 ReferenceError。函数声明、var 和读取时机又有各自规则，不能用一个例子推断所有循环必然同样失败。

循环也不一定立即报错。如果相互调用被放到初始化结束后才发生，可能运行正常，但双向依赖仍会增加理解和修改难度。依赖图中的环与实际读取时机，需要分别判断。

### 拆开循环先重新划分谁依赖谁

如果两个模块其实都需要同一份基础规则，就把规则放在它们下层，让双方依赖它。下面的例子没有用定时器拖延报错，而是消除了“互相等待初始值”的关系。

文件：`base.mjs`

```js example=js06-directed-dependencies runtime=browser file=base.mjs
export const baseScore = 10;
```

文件：`score.mjs`

```js example=js06-directed-dependencies runtime=browser file=score.mjs
import { baseScore } from './base.mjs';
export function calculateScore(completed) { return baseScore + completed; }
```

文件：`main.mjs`

```js example=js06-directed-dependencies runtime=browser file=main.mjs
import { baseScore } from './base.mjs';
import { calculateScore } from './score.mjs';
console.log(baseScore, calculateScore(3)); // => 10 13
```

现在的图是 `main → score → base`，以及 `main → base`，没有向上的返回边。若底层需要通知上层，不一定要反向 import 页面，可以由上层传入回调、接口或数据。依赖应该跟职责一致，而不是为了方便访问某个变量就随处导入。

如果两个值在业务上确实定义为互相加一，抽出公共文件也解决不了矛盾，应先修正业务定义。模块重构能整理依赖，不能替一个无解定义制造答案。

### 动态导入让可选功能有自己的失败入口

静态 import 在模块顶层声明依赖，不能直接放进 if 分支。按需加载可以使用 `import()`，它返回的 Promise 兑现为模块命名空间对象。

文件：`chart.mjs`

```js example=js06-dynamic-failure runtime=browser file=chart.mjs
throw new Error('图表初始化失败');
```

文件：`main.mjs`

```js example=js06-dynamic-failure runtime=browser file=main.mjs
const loaders = { chart: () => import('./chart.mjs') };
try {
  await loaders.chart();
} catch (error) {
  console.log(`图表暂不可用：${error.message}`); // => 图表暂不可用：图表初始化失败
}
console.log('资料正文仍可阅读'); // => 资料正文仍可阅读
```

这里文件能找到，但顶层执行抛错，动态导入仍然拒绝。实际还可能遇到路径、网络、MIME、CORS、语法或依赖初始化失败。因此“下载完成”不能代表“模块已经可以使用”。

把失败提示放在真正可以降级的功能入口，正文就不必因为一个可选图表失败而消失。捕获后是否允许再试，则要看原因；同一环境中，模块求值失败可能被缓存，反复 import 同一 URL 不等于重新初始化成功。

明确的 loader 映射也比任意拼接路径更容易阅读和构建。动态 import 是语言能力，输出多少文件、怎样拆 chunk、是否预加载，由构建工具决定。按需加载不能代替依赖重构，也不保证模块一定只在用户点击后才开始下载。

### 顶层 await 把初始化等待传给依赖者

模块顶层可以直接 await。如果入口静态依赖这个模块，就要等相关初始化完成才能继续自己的依赖求值。

文件：`config.mjs`

```js example=js06-top-level-await runtime=browser file=config.mjs
export const config = await Promise.resolve({ language: 'zh-CN' });
console.log('配置就绪'); // => 配置就绪
```

文件：`main.mjs`

```js example=js06-top-level-await runtime=browser file=main.mjs
import { config } from './config.mjs';
console.log(`入口读取：${config.language}`); // => 入口读取：zh-CN
```

本例用立即可得的配置展示先后关系。如果改成网络加载，等待和失败也会影响依赖者。它不会冻结整个浏览器，其他任务仍可运行；影响的是需要这份模块初始化结果的部分。

对于可选配置或需要展示加载进度的功能，导出显式 `initialize()` 或 `loadConfig()`，让入口决定何时等待，往往更清楚。若用一个变量缓存初始化 Promise，还要决定失败后是否保留拒绝结果、是否允许清掉后重试。不能只用 `??=` 缓存一次，就默认所有恢复问题都解决了。

若两个模块通过顶层异步初始化相互等待，可能形成更难观察的停滞。先画出“谁等待谁”，比给更多函数加 async 更有帮助。

### 导入时发生的副作用需要有人负责结束

模块顶层注册监听、启动 timer 或写 DOM，都会在求值时产生**副作用（side effect）**。调用方可能只想借用一个工具函数，却顺带启动了长期工作。

把资源启动写成显式函数，并返回停止函数，调用者就能掌握生命周期。

文件：`observer.mjs`

```js example=js06-lifecycle runtime=browser file=observer.mjs
export function observe(target, onUpdate) {
  target.addEventListener('update', onUpdate);
  return () => target.removeEventListener('update', onUpdate);
}
```

文件：`main.mjs`

```js example=js06-lifecycle runtime=browser file=main.mjs
import { observe } from './observer.mjs';
const target = new EventTarget();
let count = 0;
const stop = observe(target, () => count++);
target.dispatchEvent(new Event('update'));
console.log(count); // => 1
stop();
target.dispatchEvent(new Event('update'));
console.log(count); // => 1
```

导入 observer 本身没有开始监听，调用 observe 才开始。结束时调用 stop，之后的事件不再修改计数。页面卸载、功能关闭或启动失败时，都可以在自己的清理路径调用它。资源责任与 [B01 的打开和关闭](../chinese-guides/js-07-iteration-metaprogramming-resources.md#让资源的打开和关闭待在一起) 是同一个问题。

**Tree shaking** 是构建工具尝试移除未使用代码的优化，依赖静态结构、副作用判断和配置。具名导出便于分析，但不保证产物一定删掉某段代码。确实依靠导入完成注册的模块，更不能随便声明为无副作用，否则可能连必要行为一起被删除。

### 公共导出应该小于内部实现

一个学习进度模块可以公开“记录完成”“读取进度”，内部的 Map、缓存键和存储细节则留在内部。消费者依赖的是稳定能力，内部重构才不必让所有页面一起改路径。

可以用明确的再导出建立公共入口，例如 `export { recordCompleted } from './progress.mjs'`。再导出不会自动在当前模块内部建立同名局部变量；需要在本模块使用时，仍要导入。

`export *` 适合已经明确设计过的聚合，但不会再导出默认导出，多个来源的同名导出还可能产生歧义。把整个目录无差别暴露，容易扩大依赖、隐藏冲突，也可能让内部模块反过来导入公共入口，形成意外循环。

模块边界不取决于一个文件只能写几行，而取决于哪些能力一起变化、谁拥有状态、依赖能否沿一个清楚方向流动。纯规则尽量不依赖页面；具体的网络或存储实现，可以由上层组装后传入需要它的业务函数。

### 浏览器和 Node 共享语法但采用不同解析规则

在 Node 中，`.mjs` 明确表示 ESM，`.cjs` 表示 CommonJS，`.js` 的解释与最近的 package.json 等条件有关。明确填写 `"type": "module"` 比依赖不明确格式的自动判断更容易维护；原生相对 ESM 导入需要完整扩展名，不应直接套用某个打包工具的省略规则。

包的 `exports` 用来列出公开入口：

```json
{
  "name": "@example/study",
  "type": "module",
  "exports": {
    ".": "./dist/index.js",
    "./format": "./dist/format.js"
  }
}
```

消费者可以使用 `@example/study` 和 `@example/study/format`。未列出的包子路径通常会被包解析规则拒绝。它为重构提供入口边界，但不是防止他人读取本机文件的安全沙箱。浏览器直接请求静态资源时，也不会自动按 Node 的 exports 检查 URL。

原生 ESM 不自动提供 CommonJS 的 `require`、`module.exports` 和 `__dirname`。`import.meta.url` 表示当前模块的 URL，可作为 `new URL('./asset.json', import.meta.url)` 的基准；浏览器中这是资源 URL，Node 中常是 file URL。宿主提供的其他 import.meta 字段，需要分别确认。

ESM 导入 CommonJS 时，Node 通常将 `module.exports` 作为 default 暴露，并可能通过静态分析提供部分具名导出；不能假设任意动态属性都能被具名导入，或这些推断属性总像 ESM 绑定一样实时更新。反方向也受版本影响：较新的 Node 可以 require 满足同步加载条件的 ESM 图，但包含顶层 await 的图不能当作普通同步 require 处理。跨环境迁移应先明确支持的 Node 版本和导出格式，不把某次本地导入成功当作所有宿主的保证。

### 顺着依赖和生命周期阅读模块

遇到模块问题，先确认请求的资源是否正确，再确认导入导出是否匹配，最后看顶层初始化是否读取了尚未准备好的数据。若只是借用能力却触发了额外工作，检查副作用是否应改为显式启动；若修改内部文件总牵动很多消费者，检查公共入口是否暴露过宽。

接下来进入 [TS-01](../chinese-guides/ts-01-type-system-structural-strict-mode.md#ts-01)。类型可以帮助描述跨模块的数据与函数，却不会改变模块求值顺序，也不会替你清理导入后创建的资源。

### 参考与延伸阅读

- [MDN：JavaScript 模块](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)——模块作用域、导入导出和依赖求值。
- [MDN：import 声明](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import)——绑定与说明符规则。
- [MDN：动态 import](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import)——异步加载、命名空间与失败缓存。
- [Node.js：ECMAScript modules](https://nodejs.org/api/esm.html)——Node 的解析、扩展名和互操作边界。
- [Node.js：Packages](https://nodejs.org/api/packages.html)——type、exports 与包入口封装。
