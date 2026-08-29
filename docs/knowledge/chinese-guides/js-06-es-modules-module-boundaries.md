# JavaScript 知识点讲义

## JS-06 ES Modules 与模块边界

当程序从几个脚本增长为几百个文件，模块首先解决的是“名字和依赖从哪里来”，随后才是打包、按需加载和代码分块。真正成熟的模块设计还要回答：哪些能力属于公开合同，副作用何时发生，依赖能否保持单向，浏览器与 Node.js 怎样解释同一段导入，以及模块失败应在哪个边界被处理。

### 学习前先确认

- 直接前置：[JS-05 Promise 错误处理与异步控制流](../chinese-guides/js-05-promise-errors-async-control-flow.md#js-05)。它会继续链接 JS-04、函数、变量和对象等基础；理解动态导入的拒绝与恢复只需沿这一条链补齐。

`import`、`export`、模块图、实时绑定和宿主解析规则都从本讲开始解释，不要求先背模块工具术语。

### 一、模块是带边界的代码单元

**ES Module** 是 ECMAScript 定义的标准模块系统。一个模块拥有自己的顶层作用域，通过 `export` 声明对外能力，通过 `import` 显式取得依赖：

```js
// currency.js
export const currency = 'CNY';

export function formatMoney(cents) {
  return `${currency} ${(cents / 100).toFixed(2)}`;
}
```

```js
// order-view.js
import { formatMoney } from './currency.js';

export function renderOrder(order) {
  return `${order.id}：${formatMoney(order.totalCents)}`;
}
```

模块顶层声明不会像旧式经典脚本那样自动成为 `window` 属性；模块代码天然使用严格模式，顶层 `this` 是 `undefined`。每个文件显式列出依赖后，工具和读者都能建立**模块图（module graph）**：节点是模块，边表示一个模块依赖另一个模块。

模块不是“把一个大文件切碎”这么简单。如果所有文件都读写同一个全局对象，文件虽多，依赖仍是隐式的；修改顺序、测试隔离和复用都不会自然改善。边界的价值来自限制谁能访问什么，并让依赖关系可以检查。

### 二、导入说明符先经过宿主解析

`import { x } from './math.js'` 中的字符串叫**模块说明符（module specifier）**。ECMAScript 规定模块语法和求值关系，浏览器、Node.js、打包工具则负责把说明符解析成具体模块。

常见说明符分三类：

- 相对说明符：`./math.js`、`../shared/id.js`；
- 绝对 URL 或绝对路径语义：具体能力取决于宿主；
- 裸说明符：`react`、`@scope/package/subpath`，需要包解析规则、导入映射或构建工具。

原生浏览器直接加载相对模块时通常要写完整路径和扩展名，服务器还需返回正确的 JavaScript MIME 类型。模块脚本跨源获取要满足 CORS；直接用 `file://` 打开 HTML 常因安全策略失败，应通过本地 HTTP 服务验证。

```html
<script type="module" src="/assets/main.js"></script>
```

模块脚本默认延后到文档解析完成后执行；重复请求同一规范化模块通常只会求值一次。缓存身份以解析后的 URL 为基础，查询参数或片段差异可能产生不同身份。不要把“文件内容相同”误当作“运行时一定是同一模块实例”。

### 三、加载分为解析、实例化和求值

理解循环依赖和顶层等待时，不能只想成“按 import 从上到下一行行复制代码”。可以把模块加载概括为三个阶段：

1. 解析：读取源码，确认语法和静态导入导出；
2. **实例化（instantiation）**：连接导入与导出的绑定，为模块图建立环境；
3. **求值（evaluation）**：按依赖关系执行模块顶层代码，初始化绑定并产生副作用。

静态 `import` 必须出现在模块顶层，使依赖在执行前可分析。它不是普通函数调用，不能直接放进 `if`：

```js
// 错误思路：静态 import 不能这样条件执行
if (needsEditor) {
  // import { openEditor } from './editor.js';
}
```

真正按条件加载使用后文的 `import()`。但不要为了躲开不合理依赖而把所有静态导入改为动态导入；那只会把设计错误推迟到运行时。

### 四、导入是实时绑定，不是一次复制

静态导入连接到导出方的绑定。导出方重新赋值后，导入方下一次读取能观察到新值，这叫**实时绑定（live binding）**：

```js
// session.js
export let currentUser = null;

export function signIn(user) {
  currentUser = user;
}
```

```js
// header.js
import { currentUser, signIn } from './session.js';

console.log(currentUser); // null
signIn({ name: 'Ada' });
console.log(currentUser); // { name: 'Ada' }
```

导入方不能直接给 `currentUser` 重新赋值；导入绑定是只读视图，但它指向的值若是可变对象，对象内容仍可能被修改。为了保持边界清晰，状态模块通常不直接导出可任意修改的对象，而是导出读取函数、命令函数或只读快照。

实时绑定也解释了循环模块为何“有时能工作、有时抛错”：连接可能已经建立，值却尚未在求值阶段初始化。它不同于 CommonJS 把某个导出对象作为结果交给调用者的直觉。

### 五、具名导出、默认导出与命名空间对象

具名导出要求导入方使用明确名称，重构工具更容易跟踪：

```js
export function parseOrder() {}
export function formatOrder() {}

import { parseOrder, formatOrder as format } from './orders.js';
```

默认导出每个模块最多一个，导入方可以自行命名：

```js
export default function createClient() {}

import makeClient from './client.js';
```

默认导出适合模块确实只有一个主要概念的情况；在工具库里大量默认导出会让名称不一致，搜索和自动导入变得困难。选择不是风格竞赛，而是公开合同是否稳定清楚。

`import * as orders from './orders.js'` 得到模块命名空间对象。它适合显式聚合或动态选择少量已知成员，不应被当作可任意写入的普通对象。过度使用命名空间导入也可能隐藏真正依赖了哪些能力。

再导出可以建立公共入口：

```js
export { createOrder } from './create-order.js';
export { cancelOrder } from './cancel-order.js';
```

但 `export *` 的“桶文件”会扩大图、隐藏同名冲突并诱发循环依赖。公共入口应经过设计，不是把目录下所有实现自动暴露出去。

### 六、循环依赖的危险来自初始化时机和职责方向

模块 A 依赖 B，B 又直接或间接依赖 A，形成**循环依赖（circular dependency）**。循环本身不必然报错；真正危险的是模块在对方绑定尚未初始化时就读取它：

```js
// a.js
import { b } from './b.js';
export const a = b + 1;

// b.js
import { a } from './a.js';
export const b = a + 1;
```

图在实例化阶段可以连接，但求值时某个绑定仍处于暂时性死区，读取就会抛 `ReferenceError`。若读取被放进稍后才调用的函数，初始化时可能不报错，却仍保留双向职责和脆弱顺序。

诊断循环时画出完整路径，而不是只看两个文件。常见修复按优先顺序考虑：

1. 把双方都依赖的纯类型、常量或协议抽到更低层模块；
2. 重新分配职责，让高层编排依赖低层能力，低层不反向导入页面或业务入口；
3. 把顶层副作用改成入口显式调用，并通过参数注入协作者；
4. 只有模块确实是可选功能边界时，才用动态导入切断初始加载。

用 timer 延迟读取只能改变报错时机，不能修复依赖方向。循环在一种打包顺序中看似正常，也可能在测试、服务端渲染或升级工具后暴露。

### 七、动态导入是异步能力边界

`import(specifier)` 是**动态导入（dynamic import）**表达式，返回 Promise，兑现值是模块命名空间对象：

```js
async function openEditor() {
  try {
    const { createEditor } = await import('./editor.js');
    return createEditor();
  } catch (error) {
    showEditorFallback(normalizeError(error));
    return null;
  }
}
```

失败可能来自网络、路径解析、MIME/CORS、语法错误、依赖模块失败或目标模块求值抛错。错误 UI 应放在真正能降级的功能边界，例如编辑器按钮、报表页或可选可视化组件，而不是在底层把所有导入失败改成空对象。

动态导入常与构建工具的代码分割配合，但两者不是同一概念。语言只规定异步加载模块的语义；构建工具决定产生多少 chunk、文件名、预加载和缓存策略。把变量任意拼成路径还可能超出构建工具可静态发现的集合，应使用明确映射：

```js
const loaders = {
  chart: () => import('./widgets/chart.js'),
  table: () => import('./widgets/table.js'),
};
```

同一模块已成功加载后再次导入通常复用模块实例，但业务初始化函数是否幂等仍由应用负责。模块只求值一次不等于每次调用导出函数都没有副作用。

### 八、顶层 await 会把等待传给依赖者

模块顶层可以使用 `await`，形成**顶层等待（top-level await）**。依赖它的模块必须等待其求值完成：

```js
// config.js
export const config = await loadConfig();
```

这能表达模块初始化确实依赖异步结果，却也把延迟和失败传播到整条依赖链。某个深层工具模块的网络请求可能阻塞大量无关模块启动，使入口看不到加载进度；相互等待还可能形成难以诊断的异步循环。

更可控的替代方案是导出显式初始化函数或 Promise，由应用入口决定何时等待、怎样显示状态和如何重试：

```js
let configPromise;

export function getConfig() {
  configPromise ??= loadConfig();
  return configPromise;
}
```

顶层 await 适合边界清楚、整张子图确实都依赖结果的模块，不应只是为了少写一个函数。

### 九、副作用决定模块能否安全组合

导入一个模块时执行顶层代码，产生外部可观察变化，这类行为叫**副作用（side effect）**。例如立即登记全局监听器、修改原型、启动 timer、访问网络或写 DOM：

```js
// 难以控制：只要导入就开始运行
window.addEventListener('resize', recalculate);
```

更清楚的模块导出显式启动和停止：

```js
export function observeLayout() {
  window.addEventListener('resize', recalculate);
  return () => window.removeEventListener('resize', recalculate);
}
```

调用者现在拥有生命周期。测试可以导入而不触发全局变化，应用入口也能在组件卸载时清理。某些 polyfill 或注册表模块确实依赖导入副作用，这时应在名称、文档和包元数据中明确，避免被优化器当作可删除代码。

构建工具的 tree shaking 利用静态结构尝试删除未使用代码，但它受副作用分析、转译格式和工具配置影响。**Tree shaking** 不是 ESM 对最终产物大小的保证；验证应查看生产构建的模块图和产物分析，而不是看到具名导出就宣称一定被删除。

### 十、模块边界应表达依赖方向

大型前端常见层次可以是：

```text
应用入口 / 页面编排
        ↓
业务用例 / 状态转换
        ↓
领域模型 / 纯规则
        ↓
通用语言能力

基础设施适配器（HTTP、存储、日志）由上层组装后传入业务用例
```

箭头表示源码依赖。领域规则不应为了发送请求而直接导入某个页面或具体全局客户端；页面可以依赖业务用例，业务用例通过参数接收基础设施实现。这样测试能提供替身，浏览器、Node、服务端渲染也能选择不同适配器。

一个模块对消费者承诺的导出集合叫**公共表面（public surface）**。稳定的公共表面应小于内部实现：

- 只导出消费者真正需要的能力；
- 不暴露临时缓存、内部路径和可随意修改的共享对象；
- 返回值和错误保持稳定语义；
- 公开入口与内部目录分开，重构内部文件不迫使消费者改路径；
- 破坏性变更有版本或迁移说明。

“一个文件只导出一个函数”并不自动形成好边界；关键是依赖方向、状态所有权和合同是否清楚。

### 十一、浏览器与 Node.js 共享 ESM 语义，但解析边界不同

Node.js 可以通过 `.mjs`、`.cjs` 和 `package.json` 的 `type` 字段明确模块格式。相对或绝对 ESM 导入通常必须写扩展名；包的 `exports` 字段限制消费者可访问的公开子路径：

```json
{
  "name": "@example/orders",
  "type": "module",
  "exports": {
    ".": "./dist/index.js",
    "./testing": "./dist/testing.js"
  }
}
```

一旦定义 `exports`，未列出的内部路径就不应被消费者深度导入。这个封装既能保护重构，也意味着新增公开子路径必须显式更新合同。条件导出还能为不同宿主提供入口，但条件顺序、类型声明和构建产物需要联合测试，不能假设工具会自动选到预期文件。

ESM 与 CommonJS 互操作存在方向、版本和工具差异：默认导出怎样映射、具名导出是否能被静态推断、同步 `require` 能否加载某个 ESM 图，都不能只凭一次本地运行下结论。迁移时先明确包格式和支持的 Node 版本，在真实发布产物上分别测试 `import` 与需要支持的 `require` 消费路径。

ESM 中没有 CommonJS 自动提供的 `require`、`module.exports`、`__filename`、`__dirname`。需要当前模块位置时使用 `import.meta.url`，现代 Node 还提供相应的 `import.meta` 能力；跨环境库应先确认目标宿主，而不是无条件使用某一个运行时扩展。

### 十二、测试模块要覆盖图、边界和产物

模块测试不仅是调用导出函数：

1. 静态检查是否存在禁止的反向依赖或循环路径；
2. 导入模块时验证没有意外启动网络、timer 或全局监听；
3. 对动态导入构造路径错误、网络失败和求值异常，验证功能级降级；
4. 对状态模块验证实时绑定的变化来自受控命令，而非任意消费者写共享对象；
5. 用 Node 与浏览器目标环境验证说明符、扩展名、CORS/MIME 和包 `exports`；
6. 在打包后的真实产物上检查 chunk 边界、重复依赖和副作用保留；
7. 对发布包从消费者视角导入公共入口，确认内部路径确实不可达。

循环依赖工具报告的是图上事实，不会自动判断是否危险；代码评审还要看求值时是否读取未初始化绑定，以及循环是否暴露职责混乱。产物分析同样只是证据，不能把“大 chunk”一律归因于某个 import。

### 常见误解

- “每个文件都是一个模块，所以项目已经模块化”：隐式全局状态和反向依赖仍会破坏边界。
- “导入值是在导入时复制”：静态导入连接到实时绑定。
- “循环依赖一定报错”：是否失败取决于求值时何时读取绑定，但循环仍可能使设计脆弱。
- “动态 import 可以修复循环”：它只改变加载时机，不能代替职责重构。
- “使用 ESM 就一定能 tree-shake”：最终删除取决于副作用与构建工具分析。
- “`exports` 只是路径别名”：它定义包的公开封装，未列子路径会被阻止。
- “浏览器能导入的说明符，Node 一定同样解析”：宿主解析、包规则和支持协议不同。

### 学完后应能说明

1. 模块图在解析、实例化和求值三个阶段分别发生什么。
2. 实时绑定为什么能观察导出方更新，又为什么不能由导入方重新赋值。
3. 循环依赖何时触发未初始化读取，以及如何通过职责和依赖方向修复。
4. 动态导入、顶层 await、副作用与代码分割怎样影响失败和启动边界。
5. 浏览器路径、Node `type`/`exports`、ESM/CJS 互操作为什么需要分别验证。

进入 TypeScript 后，模块仍保留这些运行时事实；类型只在编译期帮助描述导入导出合同，不会改变模块求值、副作用或宿主解析规则。
