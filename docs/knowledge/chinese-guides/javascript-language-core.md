# JavaScript 语言核心讲义

这份讲义面向已经写过基础 JavaScript、但还不能稳定解释运行机制的初级前端工程师。每一节只服务同编号知识点及其站内练习和掌握挑战；文中出现的扩展内容会明确标为边界，不会暗中扩大考核范围。

阅读约定：先完成“机制”中的手工推演，再运行示例，最后完成“挑战前自检”。不要先背输出答案。重要术语采用“中文（English）”形式，便于继续阅读官方文档。

## JS-01

### 执行上下文、作用域与闭包

### 1. 先建立四个不会混淆的概念

- **执行上下文（Execution Context）**：一段代码正在执行时所需的状态，至少包括当前代码、变量绑定、`this` 和返回位置。函数每调用一次都会得到一次新的函数执行上下文。
- **调用栈（Call Stack）**：保存当前执行上下文的后进先出结构。函数进入时压栈，正常返回或抛错离开时出栈。
- **词法环境（Lexical Environment）**：按照源码嵌套位置组织的名字到值的绑定，以及指向外层环境的引用。“词法”强调查找关系由代码写在哪里决定，不由从哪里调用决定。
- **闭包（Closure）**：函数与它创建时可访问的外层词法环境引用的组合。闭包捕获的是绑定，不是把当时的值统一拍成一张照片。

变量查找从当前词法环境开始，找不到就沿外层引用继续，这条路径叫**作用域链（Scope Chain）**。调用栈回答“现在执行到哪一层”，作用域链回答“这个名字去哪里找”，两者不是同一棵树。

```js
const label = 'global';

function makeCounter(label) {
  let count = 0;
  return function next() {
    count += 1;
    return `${label}:${count}`;
  };
}

const a = makeCounter('A');
const b = makeCounter('B');
console.log(a(), a(), b()); // A:1 A:2 B:1
```

`makeCounter` 的两次调用各自产生一个环境，因此 A、B 不共享 `count`。`next` 返回后仍可访问对应环境，这就是私有状态；如果把 `count` 错放到模块顶层，两实例才会相互污染。

### 2. 为什么循环中的 `var` 会得到三个 3

```js
for (var i = 0; i < 3; i += 1) {
  setTimeout(() => console.log(i), 0);
}
```

`var` 是函数作用域，这三个回调共享同一个 `i` 绑定。定时回调真正执行时循环已经结束，绑定的当前值是 3。`let` 在每次迭代建立新的迭代绑定，所以三个闭包分别读取 0、1、2。修复的关键不是“`let` 比 `var` 新”，而是“每个回调需要独立绑定”。用函数工厂显式创建独立参数也能修复。

### 3. 闭包为什么可能保留内存

垃圾回收（Garbage Collection, GC）通常依据**可达性（Reachability）**：只要根对象仍能沿引用路径到达某对象，它就不能被回收。闭包不会机械地保留整个函数栈，但它引用的外层绑定及这些绑定可达的对象可能继续存活。

```js
function subscribe(button, listener) {
  button.addEventListener('click', listener);
  let active = true;

  return function unsubscribe() {
    if (!active) return;
    active = false;
    button.removeEventListener('click', listener);
  };
}
```

只把 `unsubscribe` 变量设成 `null` 并不一定够：若按钮仍注册着监听器，按钮和监听器之间的引用关系仍存在。正确清理要撤销真正的外部注册，例如事件、定时器、订阅或观察器。不要声称“调用 GC”或“函数返回就释放”；JavaScript 不提供这种业务保证。

### 4. 与挑战固定输入对齐的最小模块

```js
function createCounter() {
  let value = 0;
  const listeners = new Set();

  return {
    next() {
      value += 1;
      for (const listener of listeners) listener(value);
      return value;
    },
    subscribe(listener) {
      listeners.add(listener);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        listeners.delete(listener);
      };
    },
  };
}
```

必须验证：A/B 计数隔离；同一订阅撤销两次也安全；撤销后再次 `next()` 不通知；测试结束时不留下 timer、DOM listener 或全局变量。闭包能隐藏状态，但它不等于权限边界，拿到返回方法的调用者仍能执行公开能力。

### 挑战前自检

1. 能分别画出调用栈和作用域链，而不是只画一棵“内存图”。
2. 能解释三个回调共享的是 `i` 绑定，不是“setTimeout 自动把 i 变成 3”。
3. 能用两个实例证明词法环境隔离。
4. 能指出真实外部注册点并实现幂等清理。
5. 能说明对象何时“可能可回收”，而不承诺具体回收时刻。

## JS-02

### 原型、对象模型与 `this`

### 1. 对象有两条容易混淆的关系

对象的**自有属性（Own Property）**直接存在于对象上；读取缺失属性时，运行时沿对象的 `[[Prototype]]` 继续查找，直到 `null`。函数对象的 `.prototype` 则是它被 `new` 调用时，新实例将采用的原型。`obj.[[Prototype]]` 与 `Fn.prototype` 不是同一个概念，只是在 `new Fn()` 后通常满足：

```js
Object.getPrototypeOf(new Fn()) === Fn.prototype;
```

属性遮蔽（Property Shadowing）表示子对象的同名自有属性先被找到。方法也只是值为函数的属性；从原型找到方法后，`this` 仍由本次调用形式决定。

### 2. `this` 看调用位置，不看函数写在哪里

```js
'use strict';
const user = { name: 'Ada', say() { return this.name; } };
const f = user.say;

user.say(); // Ada，调用接收者是 user
f();        // TypeError，普通严格函数直接调用时 this 为 undefined
user.say.call({ name: 'Lin' }); // Lin
```

可以把普通函数的 `this` 当成一个由调用方隐式传入的参数。`call`/`apply` 立即调用并显式指定 `this`；`bind` 返回一个绑定后的新函数。箭头函数没有自己的 `this`，它沿词法环境读取外层 `this`，因此不能用 `call`/`bind` 改写，也不能作为构造函数。

事件系统或第三方 API 如何调用回调由该 API 决定。把 `user.say` 直接作为回调传出，就已经丢失了 `user.` 这一调用接收者；修复可使用 `user.say.bind(user)`，或写一个显式适配器 `() => user.say()`。

### 3. `new` 的可观察规则

简化理解 `new Fn(...args)`：

1. 创建对象并让其原型指向 `Fn.prototype`。
2. 以新对象作为 `this` 调用 `Fn`。
3. 如果 `Fn` 显式返回对象或函数，使用该返回值；返回原始值或没有返回时，使用新对象。

```js
function simpleNew(Constructor, ...args) {
  const instance = Object.create(Constructor.prototype);
  const returned = Constructor.apply(instance, args);
  const isObject = returned !== null &&
    (typeof returned === 'object' || typeof returned === 'function');
  return isObject ? returned : instance;
}
```

这段练习只解释可观察语义，不替代原生 `new`。类（Class）仍建立在原型机制上，但类还有严格模式、不可直接调用、私有字段和继承初始化等规则；本点只要求理解实例方法位于原型和构造返回覆盖。

### 4. 一个能通过挑战的简化 `bind`

```js
function simpleBind(fn, thisArg, ...preset) {
  return function bound(...later) {
    return Reflect.apply(fn, thisArg, [...preset, ...later]);
  };
}
```

它足以验证普通调用绑定与参数拼接，但不完整模拟原生 bound function 被 `new` 调用时的行为、`length`/`name` 等属性。因此产出中必须标注“教学版限制”，不能声称重写了规范级 `bind`。

### 挑战前自检

1. 能画出 `child → parent → grand → Object.prototype → null` 并逐步记录属性命中位置。
2. 能预测方法调用、脱离调用、`call`、`bind`、箭头函数五种 `this`。
3. 能验证构造函数显式返回 `{ kind: 'override' }` 会覆盖新实例。
4. 能解释组合（Composition）为什么常比很深的继承链更容易替换和测试。
5. 不把原型污染并入本点；它属于安全知识点 `SEC-01`。

## JS-03

### 类型、相等、拷贝与不可变更新

### 1. 值、身份和共享引用

原始值（Primitive Value）不可变，包括 `undefined`、`null`、boolean、number、bigint、string、symbol。对象是可变值；变量保存的是对对象身份的引用。两个形状相同但分别创建的对象不具有相同身份。

`===` 不做类型转换，并把 `+0` 与 `-0` 视为相等、把 `NaN` 与自身视为不等；`Object.is` 把 `NaN` 与自身视为相等，并区分 `+0`/`-0`。`Map`、`Set` 和 `includes` 常使用 SameValueZero（同值零）语义：`NaN` 相等但正负零不区分。

### 2. 浅拷贝只复制第一层槽位

```js
const child = { n: 1 };
const a = { name: 'A', child };
const b = { ...a, name: 'B' };

b.child.n = 2;
console.log(a.child.n); // 2，因为 a.child === b.child
```

展开语法创建了新的外层对象，但把 `child` 引用原样复制。不可变更新（Immutable Update）不是“任何地方都深拷贝”，而是复制从根到被修改节点的每一层，并复用没有变化的分支，这叫**结构共享（Structural Sharing）**。

```js
const nextB = { ...b, child: { ...b.child, n: 3 } };
console.assert(nextB !== b);
console.assert(nextB.child !== b.child);
```

如果 A 与 B 原本就不应共享 `child`，应在创建 B 的业务边界建立独立对象；仅在更新时复制 B，不能倒推修复已经发生的 A 污染。

### 3. `structuredClone` 能做什么，不能做什么

结构化克隆（Structured Clone）支持循环图，以及常见的 `Date`、`Map`、`Set`、ArrayBuffer 等类型；克隆结果获得新身份，并保留图中的内部引用关系。

```js
const fixture = {
  date: new Date(0),
  map: new Map([['x', 1]]),
  set: new Set([1]),
  child: { n: 1 },
};
fixture.self = fixture;

const clone = structuredClone(fixture);
console.assert(clone !== fixture);
console.assert(clone.self === clone);
console.assert(clone.date instanceof Date);
console.assert(clone.map instanceof Map);
```

函数、DOM 节点等不可结构化克隆的值会导致 `DataCloneError`；访问器、原型和属性描述信息也不能假定按原对象完整保留。克隆适合快照、跨线程消息和明确的数据隔离，不适合作为每次状态更新的默认方案：它会复制整张图、丢失不支持的语义，并掩盖谁真正拥有数据。

JSON 序列化不是通用深拷贝：循环引用会抛错，`Date` 变字符串，`Map`/`Set` 不能按原语义保存，`undefined`、symbol、函数也会被删除或改变。

### 4. 对挑战中的循环 Map 变式建立正确图

```js
fixture.map.set('x', fixture);
const clone2 = structuredClone(fixture);
console.assert(clone2.self === clone2);
console.assert(clone2.map.get('x') === clone2);
```

这里验证的不只是“值一样”，而是克隆后的两条边仍指向克隆根对象。画图时先写节点身份，再写边；不要把循环结构展开成无限嵌套文本。

### 挑战前自检

1. 能独立回答 `NaN`、`-0`、对象身份、Map/Set 键的比较规则。
2. 能用 `===` 断言证明浅拷贝中哪一层仍共享。
3. 能对 Date、Map、Set、循环图、函数分别给出克隆结论。
4. 能解释为什么不可变更新通常只复制修改路径。
5. 能为不支持的输入给出明确拒绝，而不是退回 JSON 技巧。

## JS-04

### 异步、Promise 与浏览器事件循环

### 1. 调度模型

浏览器一次取出一个任务（Task）运行到调用栈为空，随后清空当前微任务队列（Microtask Queue），然后浏览器才可能进行渲染，再进入下一个任务。`setTimeout` 回调进入任务队列；Promise reaction、`queueMicrotask` 和 `await` 后续通常进入微任务队列。微任务不是“更快的异步函数”，而是当前任务结束后的高优先级检查点。

```js
console.log('A');
setTimeout(() => console.log('D'), 0);
Promise.resolve().then(() => console.log('C'));
console.log('B');
// A B C D
```

连续递归添加微任务会让浏览器迟迟没有渲染和处理下一任务的机会，形成微任务饥饿（Microtask Starvation）。需要让出主线程时，应根据场景分片到后续任务或使用可用的调度 API，而不是继续 `queueMicrotask`。

### 2. 事件循环不等于业务并发限制

“浏览器单线程执行 JavaScript”不代表只能同时等待一个网络请求。业务并发器负责限制已经启动但尚未完成的异步操作数量；它需要独立维护 `nextIndex`、`active`、结果槽位和取消状态。

实现原则：只在有空槽且未取消时启动；每个任务在 `finally` 中释放一次槽位；结果按输入索引写回；取消后不再启动新任务，运行中任务通过同一个 `AbortSignal` 尝试取消；所有运行项结束后统一完成。

```js
async function runLimited(tasks, limit, signal) {
  const results = Array(tasks.length);
  let nextIndex = 0;
  let active = 0;

  return new Promise((resolve) => {
    const launch = () => {
      while (!signal.aborted && active < limit && nextIndex < tasks.length) {
        const index = nextIndex++;
        active += 1;
        Promise.resolve()
          .then(() => tasks[index](signal))
          .then(value => { results[index] = { status: 'fulfilled', value }; })
          .catch(reason => { results[index] = { status: 'rejected', reason }; })
          .finally(() => { active -= 1; finishOrLaunch(); });
      }
      finishOrLaunch();
    };
    const finishOrLaunch = () => {
      if (active === 0 && (signal.aborted || nextIndex === tasks.length)) resolve(results);
      else if (!signal.aborted) launch();
    };
    launch();
  });
}
```

教学实现要在测试中记录每次启动、完成、释放槽位和取消的时间线。取消时未启动的槽位保持空还是写入 cancelled，需要在契约中明确；不能靠计时碰巧得到顺序。

### 挑战前自检

能手工推演任务/微任务/渲染机会；能证明 `active` 从不超过 2；能验证取消后未启动项不会启动；能区分“队列调度顺序”和“异步操作完成时间”；不使用 Node 专有阶段解释浏览器题。

## JS-05

### Promise 错误处理与异步控制流

Promise 链中的 `throw` 和 rejected Promise 都沿链向最近的拒绝处理器传播；`.then(success, failure)` 的 failure 不能捕获同一个 `then` 的 success 内抛出的错误，而后接 `.catch()` 可以。`finally` 用于无论成功失败都要执行的清理；它若抛错或返回 rejected Promise，会用新错误覆盖原结果。

取消（Cancellation）不是 Promise 自带状态。`AbortController` 提供协作信号：调用方发出取消，被调用 API 必须读取或监听 `signal` 才会停止。取消、超时、网络失败、业务拒绝和程序错误应保持不同结果，避免把用户主动取消显示成红色失败。

连续搜索还需要**过期结果抑制（Stale-result Suppression）**：即使旧请求无法取消或已经返回，也只有最新请求序号能提交 UI。

```js
let requestId = 0;
let currentController;

async function search(query) {
  currentController?.abort();
  const id = ++requestId;
  const controller = new AbortController();
  currentController = controller;

  try {
    const data = await load(query, controller.signal);
    if (id === requestId) render(data);
  } catch (error) {
    if (error?.name === 'AbortError') return;
    if (id === requestId) renderError(classify(error));
  } finally {
    if (id === requestId) setLoading(false);
  }
}
```

重试（Retry）必须有安全重放条件、次数/总时长预算、退避和抖动。读取请求通常更容易重试；创建订单等非幂等写操作必须使用服务端幂等键或查询最终结果，不能因为“网络错误”就直接重复 POST。

`Promise.all` 任一拒绝就整体拒绝，但其他操作不会自动取消；`allSettled` 保留每一项结果；`race` 只采用第一个 settled 结果，也不会停止输家；`any` 采用第一个 fulfilled，全部拒绝才产生 `AggregateError`。选择组合器前先写出失败和取消契约。

### 挑战前自检

能重放 `a → ab → abc` 的请求序号；取消不显示错误；旧成功不能覆盖新失败；`finally` 不返回替代业务值；只对明确可安全重放的操作重试；能写出 `allSettled([resolve(1), reject('E')])` 的完整结构。

## JS-06

### ES Modules 与模块边界

ES Module（ECMAScript Module, ESM）的静态 `import`/`export` 在执行前可分析。导入是只读的**实时绑定（Live Binding）**：导出方重新赋值后，导入方读取到新值；它不是导入时复制。模块顶层默认严格模式，浏览器模块脚本和 Node ESM 的顶层 `this` 为 `undefined`。

循环依赖不必然失败，但如果模块在对方绑定完成初始化前读取，就会出现暂时性死区错误或不完整状态。修复优先级：提取共同常量/协议到第三模块；把副作用移出顶层并由入口显式调用；重新划分职责形成单向依赖；只有真正的按需边界才使用动态导入，不能用延时掩盖设计问题。

```js
// shared.mjs
export const READY = 'ready';

// feature.mjs
import { READY } from './shared.mjs';
export function start() { return READY; }
```

`import('./feature.mjs')` 返回 Promise，因此网络、解析、求值和目标缺失都会表现为拒绝，需要在功能边界提供失败 UI 或降级。动态导入不是同步 `try/catch` 能捕获的调用。

Node ESM 的相对导入通常需要完整扩展名；`package.json` 的 `type` 决定 `.js` 的解释方式，`exports` 定义包消费者能访问的公开子路径。CommonJS 互操作存在默认导出、具名导出推断和加载时序差异，不能把本地恰好可用当作跨工具契约。Tree shaking 依赖静态结构和副作用信息，但具体删除行为属于构建工具边界，不在本点实现题内。

### 挑战前自检

能画出 `a.mjs ↔ b.mjs` 的求值顺序；能解释实时绑定；能用单向依赖重构而非 timer；能为动态导入拒绝展示可恢复 UI；能列出组件包公开 `exports`，并证明未公开内部路径不可导入。

## JS-07

### 迭代协议、元编程与资源生命周期

可迭代对象（Iterable）实现 `[Symbol.iterator]()`，返回迭代器（Iterator）；迭代器的 `next()` 返回 `{ value, done }`。生成器（Generator）把这套状态机写成可暂停函数。`for...of` 提前 `break`、循环体抛错或消费者提前结束时，会在存在 `iterator.return()` 的情况下请求关闭迭代器，因此资源型迭代器必须把清理放在 `finally`。

```js
function* pages(loadPage, close) {
  try {
    for (let index = 0; ; index += 1) {
      const page = loadPage(index);
      if (!page.length) return;
      yield page;
    }
  } finally {
    close();
  }
}
```

清理必须幂等（Idempotent）：正常结束、消费者 `break`、生成器 `throw`、取消可能经过不同入口，但底层资源只能关闭一次。用 `closed` 标记或底层幂等 API保护，测试断言 `closeCount === 1`。

Proxy（代理）通过 trap 拦截对象基本操作；Reflect 提供与这些操作对应的默认转发。trap 不能违反语言不变量，例如目标上的不可配置且不可写属性不能被 `get` trap 伪装成其他值。优先 `return Reflect.get(target, key, receiver)`，并只增加明确的记录、校验或虚拟化行为。Proxy 会改变可观察性和性能，不能当作所有状态管理的默认工具。

惰性序列只在消费者请求时拉取下一项；提前结束后不应继续请求第二页。异步生成器用 `for await...of` 消费，但仍需处理取消信号、错误与 `finally`。显式资源管理的新语法或提案只作为扩展背景，本点以可在目标环境运行的 `try/finally` 和幂等关闭为准。

### 挑战前自检

能手写 iterator/iterable 的区别；能证明 `break` 后第二页没有拉取；能用 `throw` 路径证明 finally 执行且只关闭一次；能说明 Proxy 不变量并用 Reflect 转发；能比较普通数组、生成器与资源型异步迭代器的适用边界。
