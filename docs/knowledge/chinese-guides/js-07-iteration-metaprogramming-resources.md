# JavaScript 知识点讲义

## JS-07 迭代协议、元编程与资源生命周期

数组、Set 和生成器都能放进 `for...of`，它们并不是同一种对象，却能被同一段循环使用。Proxy 也有类似的思路：读取属性、写入属性这些普通操作，可以由对象提供不同的实现。

这一篇关注“对象如何参与语言规定的操作”。先从逐项读取数据开始，再看中途停止时谁负责关闭资源，最后理解 Proxy 和 Reflect 怎样介入属性访问。前几篇讲过的闭包、`this`、对象身份和属性规则，会在这里汇合。

### 学习前先确认

- 直接前置：[属性描述符与对象不变量](../chinese-guides/javascript-property-descriptors.md#prejs-08)、[异常、try/catch 与 finally](../chinese-guides/javascript-exceptions-and-finally.md#prejs-06)。前者连接对象模型，后者解释清理代码何时执行。

异步小节才需要 [Promise、异步函数与取消信号](../chinese-guides/javascript-promises-and-cancellation.md#prejs-07)。首次阅读可以先走完同步迭代与 Proxy，再回来补异步部分。所有 JavaScript 示例相互独立；异步示例放在自带的异步函数中，`// =>` 标明输出。

### for of 为什么能读取不同的数据结构

`for...of` 并不要求输入必须是数组。它需要对象提供一条标准入口，告诉它如何逐个取得值。这个约定叫**可迭代协议（iterable protocol）**，入口是 `[Symbol.iterator]()`。

```js example=js07-builtins
console.log([...new Set(['前端', '前端', '设计'])].join(',')); // => 前端,设计
console.log([...'你好'].join(',')); // => 你,好
console.log([...new Map([['theme', '浅色']])][0].join('=')); // => theme=浅色
```

这些对象各自决定产出什么：Set 产出元素，字符串产出按 Unicode 码点迭代的字符串片段，Map 产出键值对。字符串迭代不等于按用户感知的完整字形切分，组合字符与复杂 emoji 可能由多个码点组成；需要按字形处理时，应使用相应的文本分段 API。

数组展开、数组解构等语法也会消费可迭代对象。但对象展开 `{ ...source }` 走的是自有可枚举属性复制规则，不读取迭代协议。这两种展开长得很像，实际入口不同，属性复制规则见 [JS-03：浅拷贝只复制一层](../chinese-guides/js-03-types-equality-copy-immutability.md#浅拷贝只复制一层)。

`for...in` 也不是 `for...of` 的别名。它枚举可枚举的字符串属性名，可能包含继承属性；`for...of` 消费迭代器提供的值。遍历数组元素时，一般先考虑后者或数组方法，不要用属性枚举来猜测元素顺序和范围。

这里的 `Symbol.iterator` 是语言约定的 Symbol 属性键。普通 Symbol 可以创建彼此不同的键，即使描述字符串相同，也不会因此成为同一个键；而这些 well-known Symbol 则是语言预先约定好的入口。它们不是私有属性，也不是防止别人访问的安全机制。使用协议时应取 `Symbol.iterator` 本身，不能用字符串 `'Symbol.iterator'` 代替。

### 可迭代对象和迭代器分工不同

**迭代器（iterator）**负责记住当前读到哪里。它提供 `next()`，每次返回一个结果对象：`value` 是产出的值，`done` 表示是否结束。可迭代对象则负责通过 `[Symbol.iterator]()` 提供迭代器。

下面创建一个可重复读取的页码范围。它不预先生成数组，而是每次需要时才计算下一个数字。

```js example=js07-iterator
function pageRange(start, end) {
  return {
    [Symbol.iterator]() {
      let current = start;
      return {
        next() {
          if (current > end) return { done: true };
          return { value: current++, done: false };
        },
      };
    },
  };
}

const pages = pageRange(2, 4);
const first = pages[Symbol.iterator]();
const second = pages[Symbol.iterator]();
console.log(first.next().value); // => 2
console.log(first.next().value); // => 3
console.log(second.next().value); // => 2
console.log([...pages].join(',')); // => 2,3,4
console.log([...pages].join(',')); // => 2,3,4
```

每次调用 `[Symbol.iterator]()` 都建立自己的 `current`，所以两次遍历互不干扰。这与 [JS-01 中多次创建独立状态](../chinese-guides/js-01-execution-context-scope-closure.md#两次创建会得到两份独立状态)完全相通：把状态放在创建迭代器的函数里，每次调用得到一份；把它放到更外层，则可能变成共享游标。

仅有 `next()` 的对象是迭代器，却不一定能直接交给 `for...of`；还要看它是否也提供 `[Symbol.iterator]()`。许多内置迭代器让这个方法返回自己，因此既是迭代器，也是可迭代对象。

协议也有基本形状要求。`[Symbol.iterator]` 必须可调用并返回对象，`next` 必须是函数，`next()` 必须返回对象，不能只返回一个数字。`done: true` 的结果可以携带最终返回值，但 `for...of` 不会把这个最终值当作普通元素再处理一次。

### 生成器把暂停位置保存在函数里

**生成器（generator）**让我们用普通控制流程编写迭代器，不必手动维护所有状态。函数名之前的 `*` 声明生成器函数；调用它得到生成器对象，真正的函数体要等到 `next()` 才开始执行。

```js example=js07-generator
function* steps() {
  yield '准备';
  yield '执行';
  return '结束';
}

const iterator = steps();
console.log(JSON.stringify(iterator.next())); // => {"value":"准备","done":false}
console.log(JSON.stringify(iterator.next())); // => {"value":"执行","done":false}
console.log(JSON.stringify(iterator.next())); // => {"value":"结束","done":true}
console.log([...steps()].join(',')); // => 准备,执行
```

`yield` 产出一个值，并暂停在当前位置。下一次 `next()` 从暂停处继续，局部变量和控制流程也继续保留。`return` 则结束生成器；正如上面的输出所示，展开结果包含两次 `yield`，不包含最终 `return` 的值。

一个生成器对象通常只有一条前进的轨迹，读完不会自动倒带。需要再次遍历时，应再次调用生成器函数，得到新的对象。

```js example=js07-once
function* letters() {
  yield '甲';
  yield '乙';
}
const iterator = letters();
console.log([...iterator].join(',')); // => 甲,乙
console.log([...iterator].length); // => 0
console.log([...letters()].join(',')); // => 甲,乙
```

这也是“可迭代”不等于“可重复遍历”的原因。设计 API 时应说明传入的是可重复产生迭代器的集合，还是已经开始读取的一次性游标。否则，为了计算长度先展开一次，正式处理时可能已经没有数据了。

`yield*` 可以把一段迭代委托给另一个可迭代对象。它不是普通的函数调用，也不仅仅等同于复制一段 `for` 循环，迭代控制方法也会参与委托。首次使用时先理解值从哪里产出；需要双向通信或复杂组合时，再查询完整协议。

### 向暂停位置传值和抛错

生成器不只向外产出值，调用者也可以把值传回暂停位置。第一次 `next()` 负责启动生成器，此时还没有暂停的 `yield` 可接收参数；之后传给 `next(value)` 的值，会成为上一次 `yield` 表达式的结果。

```js example=js07-next-value
function* askName() {
  const name = yield '怎么称呼你';
  return `你好，${name}`;
}
const iterator = askName();
console.log(iterator.next().value); // => 怎么称呼你
console.log(iterator.next('小林').value); // => 你好，小林
```

`iterator.throw(error)` 则像在当前暂停的 `yield` 处抛出异常。生成器内部可以捕获并继续，也可以让异常向外传播；它并不保证每次都结束生成器。需要测试失败清理时，应确认异常具体从哪里进入，以及内部有没有恢复逻辑。

```js example=js07-throw
const events = [];
function* read() {
  try {
    yield '第一项';
  } finally {
    events.push('关闭');
  }
}
const iterator = read();
iterator.next();
try {
  iterator.throw(new Error('停止'));
} catch (error) {
  events.push(error.message);
}
console.log(events.join(' → ')); // => 关闭 → 停止
```

### 让资源的打开和关闭待在一起

很多序列背后不只是内存数组，还可能有文件、数据库游标或订阅。消费者提前 `break` 时，这些资源不应该被留在原地。让生成器使用 `try/finally`，可以把资源的使用与关闭放在同一段代码中。

下面用内存记录模拟资源，不访问真实文件或网络。一次观察正常读完、主动停止和消费者处理失败三条路径。

```js example=js07-cleanup
function inspect(mode) {
  const events = [];
  function* readRows() {
    events.push('打开');
    try {
      yield '第一行';
      yield '第二行';
    } finally {
      events.push('关闭');
    }
  }

  try {
    for (const row of readRows()) {
      events.push(row);
      if (mode === 'stop') break;
      if (mode === 'error') throw new Error('处理失败');
    }
  } catch (error) {
    events.push(error.message);
  }
  return events.join(' → ');
}

console.log(inspect('all')); // => 打开 → 第一行 → 第二行 → 关闭
console.log(inspect('stop')); // => 打开 → 第一行 → 关闭
console.log(inspect('error')); // => 打开 → 第一行 → 关闭 → 处理失败
```

正常读完时，生成器执行到函数结尾，经过 `finally`。消费者提前停止时，`for...of` 会调用迭代器提供的 `return()`，通知它结束；对于这个生成器，控制流程会进入 `finally`。消费者自己的代码抛错，也会触发相应的关闭流程，然后错误继续向外传播。

因此，清理不等于吞掉失败。调用方仍应决定错误怎样呈现或恢复；生成器负责把自己取得的资源交还。真实的关闭操作可能失败，最好设计为可重复调用且不会重复释放，并避免在 `finally` 中随意 `return` 覆盖原始结果。基础规则见[异常与 finally](../chinese-guides/javascript-exceptions-and-finally.md#prejs-06)。

### next 出错和消费者退出不是一回事

有一个边界不能省略：如果手写迭代器的 `next()` 自己抛错，循环不会保证再调用它的 `return()`。生产者必须在自己的失败路径上清理。正常返回 `done: true` 时，循环也不会额外调用 `return()`。

```js example=js07-next-error
let closeCalls = 0;
const broken = {
  [Symbol.iterator]() { return this; },
  next() { throw new Error('读取失败'); },
  return() {
    closeCalls += 1;
    return { done: true };
  },
};

try {
  for (const value of broken) {
    console.log(value);
  }
} catch (error) {
  console.log(error.message); // => 读取失败
}
console.log(closeCalls); // => 0
```

这段代码故意展示了不完整的生产者：资源如果只在 `return()` 里关闭，`next()` 的报错路径就会遗漏。使用生成器时，把会失败的读取也放在自己的 `try/finally` 内，能让读取异常自然经过清理块。手写迭代器则要把正常耗尽、读取失败、消费者关闭等入口归到同一套清理逻辑。

另一个边界是直接调用 `next()` 的代码。如果调用者只取一个值，随后丢下迭代器，垃圾回收不会替它可靠调用 `return()`。手动读取也需要在自己的 `finally` 中主动关闭；资源释放不能寄希望于对象何时被回收。

如果生成器尚未开始执行，就对它调用 `return()`，函数体内的 `finally` 也不会被进入。因此，尽量在生成器真正开始工作时再取得资源，不要提前打开一个资源，再假设未启动的生成器总能替你关掉。

### return 请求结束但清理代码也可能暂停

通常我们希望清理一次完成，但生成器允许在 `finally` 内再次 `yield`。此时 `return()` 的结果可能是 `done: false`，还需要继续恢复执行。

```js example=js07-return-yield
function* unusual() {
  try {
    yield '正文';
  } finally {
    yield '清理中的暂停点';
  }
}
const iterator = unusual();
iterator.next();
console.log(JSON.stringify(iterator.return('结束'))); // => {"value":"清理中的暂停点","done":false}
console.log(JSON.stringify(iterator.next())); // => {"value":"结束","done":true}
```

这个例子用于理解语言边界，并不是推荐的资源管理写法。循环调用 `return()` 后不会为了等清理完成而无限替你调用 `next()`。承担资源释放责任的 `finally` 应尽量直接完成；异步清理需要等待时，可以在异步生成器的 `finally` 中 `await`，不需要借助额外产出值来表达。

### 异步迭代把等待也纳入协议

**异步迭代器（async iterator）**把“取下一个结果”变成可以等待的操作。入口是 `[Symbol.asyncIterator]()`，`next()` 返回的结果可通过 Promise 提供。`for await...of` 按次等待结果，很适合逐页、逐块消费数据。

下面仍用内存模拟异步读取，避免把网络状态混入语言概念。`async function*` 同时提供异步等待和生成器的暂停能力。

```js example=js07-async
async function inspectPages() {
  const events = [];
  async function* pages() {
    events.push('打开');
    try {
      yield await Promise.resolve('第一页');
      yield await Promise.resolve('第二页');
    } finally {
      await Promise.resolve();
      events.push('关闭');
    }
  }

  for await (const page of pages()) {
    events.push(page);
    break;
  }
  events.push('循环之后');
  console.log(events.join(' → ')); // => 打开 → 第一页 → 关闭 → 循环之后
}
await inspectPages();
```

提前退出时，`for await...of` 会等待关闭方法返回的结果，再继续循环后的代码，所以关闭发生在“循环之后”之前。自然结束和生产者失败同样需要在生产者内部处理好清理，不能把所有责任只放在外部循环。

`for await...of` 也可以消费同步可迭代对象，但涉及同步生成器产出 Promise、Promise 拒绝以及不同运行时版本时，应额外核对错误关闭行为。拥有异步资源的生产者，优先使用明确的异步生成器，并在自己的 `try/finally` 中等待操作与释放，避免依赖跨协议适配的细节。本节示例就采用这种组织方式。

这种消费方式会依次等待下一项，但不意味着生产者背后必然只有一个请求。生产者可能预取或并发工作。是否预取、预取多少、停止以后如何处理已启动工作，都需要 API 自己约定，循环语法不会替业务作出决定。

### 取消请求和停止消费需要合作

Promise 没有内置的取消状态。`AbortController` 负责发出取消信号，真正执行工作的代码需要观察这个信号。调用生成器的 `return()` 也不会神奇地打断一项完全不支持取消的网络操作。

```js example=js07-cancellation
async function inspectCancellation() {
  const events = [];
  const controller = new AbortController();
  async function* records(signal) {
    events.push('打开');
    try {
      for (const value of ['甲', '乙']) {
        signal.throwIfAborted();
        yield await Promise.resolve(value);
      }
    } finally {
      events.push('关闭');
    }
  }

  try {
    for await (const value of records(controller.signal)) {
      events.push(value);
      controller.abort();
    }
  } catch (error) {
    events.push(error.name);
  }
  console.log(events.join(' → ')); // => 打开 → 甲 → 关闭 → AbortError
}
await inspectCancellation();
```

这个例子在读取每一项之前检查信号，因此第一项后发出的取消，会在下一次推进时被发现。真实 `fetch` 应接收同一个 `signal`，由它响应等待过程中的取消；如果只是发出信号，却没传给实际工作，也没有主动检查，就不能承诺立即停止。

要分清三件事：消费者不再需要结果，生产者停止尚在进行的工作，以及双方关闭已经取得的资源。它们相互关联，却不自动等价。对于流，还需区分释放 reader 的锁与取消底层流，两种操作也不一定承担相同责任。进一步的异步背景见 [Promise 与取消信号](../chinese-guides/javascript-promises-and-cancellation.md#prejs-07)。

### Proxy 让普通操作经过一个入口

**元编程（metaprogramming）**在这里指代码介入对象操作的规则。**Proxy** 会为目标对象创建代理；在处理器中提供相应的 **trap**，就能拦截读取、写入等操作。本文保留这些英文名，避免额外记忆不常用的中文译名。

```js example=js07-proxy
const target = { title: '草稿' };
const reads = [];
const proxy = new Proxy(target, {
  get(object, key, receiver) {
    reads.push(String(key));
    return Reflect.get(object, key, receiver);
  },
});
console.log(proxy.title); // => 草稿
console.log(reads.join(',')); // => title
console.log(proxy === target); // => false
```

读取 `proxy.title` 时会经过 `get`，直接读取 `target.title` 则不会。代理是一个新的对象身份，不能简单当作与目标完全相同的引用。把代理和目标混着用作 Map 的键，或混着传给依赖身份的系统，可能出现两个独立条目。

Proxy 也不会自动递归代理嵌套对象。若 `target.address` 是普通对象，默认转发得到的仍是那个普通对象；是否继续代理、如何缓存代理身份，都需要额外设计。需要简单校验时，一个明确的更新函数有时比代理更容易维护；当确实需要系统性拦截操作时，Proxy 才提供有价值的统一入口。

### Reflect 保留原本的读取关系

**Reflect** 提供与对象内部操作对应的静态方法，适合在 trap 中把操作继续交给目标。`Reflect.get(target, key, receiver)` 的第三个参数特别重要：它决定读取 getter 时使用哪个 `this`。

```js example=js07-receiver
const target = {
  name: '目标对象',
  get label() {
    return this.name;
  },
};
const proxy = new Proxy(target, {
  get(object, key, receiver) {
    return Reflect.get(object, key, receiver);
  },
});
const child = Object.create(proxy);
child.name = '子对象';
console.log(child.label); // => 子对象
```

读取从 `child` 发起，沿原型链进入代理，最后找到目标上的 getter。保留 `receiver`，getter 中的 `this` 才仍然是 `child`。如果 trap 直接返回 `object[key]`，getter 会以目标作为 `this`，这里就会错误地读到 `'目标对象'`。原理与 [JS-02 的 getter 接收对象](../chinese-guides/js-02-prototype-object-model-this.md#getter-为什么也要关心接收对象)相同，只是现在多了一层代理。

Reflect 不是“绕开一切代理”的后门。把代理自身再次传给 `Reflect.get`，仍可能进入 trap，错误转发会递归。通常应转发给 trap 参数中的目标，并保留原操作需要的其他参数。

`set` trap 应返回布尔值表示操作是否成功，常见转发是 `return Reflect.set(target, key, value, receiver)`。随意返回 `true` 只是在报告成功，并不代表赋值真的发生；返回失败后，严格模式的赋值可能抛错。拦截器应保留必要的操作语义，而不只是让当前示例表面上跑通。

### 代理必须尊重目标已经固定的事实

Proxy 可以拦截操作，但不能违反语言规定的对象**不变量（invariant）**。例如，目标自身有一个不可配置且不可写的数据属性，`get` 不能谎报另一个值。

```js example=js07-invariant
const target = {};
Object.defineProperty(target, 'id', {
  value: 7,
  writable: false,
  configurable: false,
});
const proxy = new Proxy(target, {
  get() { return 99; },
});
try {
  console.log(proxy.id);
} catch (error) {
  console.log(error.name); // => TypeError
}
```

这里的报错不是 trap 没有被执行，而是返回值与目标锁定的属性事实冲突。枚举键、报告描述符、扩展对象等 trap 也有相应约束。需要实现它们时，应逐项查询具体规则，不能把“代理可以定制”理解成“可以任意伪造对象状态”。

还有一些对象把重要状态放在内部槽或私有字段中。空处理器代理不一定能透明替代 Map、Date 或有私有字段的实例；它们的方法可能要求 `this` 具有真实的内部状态，代理自身未必满足。把所有方法一律 `bind(target)` 也会改变方法身份和 receiver 行为。遇到这些类型，应针对所需 API 明确适配，并验证实际调用方式。

### 用同一套问题检查协议和资源

| 需要确认的事情 | 迭代场景 | 代理场景 |
| --- | --- | --- |
| 从哪里进入 | `Symbol.iterator` / `Symbol.asyncIterator` | `get`、`set` 等 trap |
| 谁保存状态 | 集合、独立迭代器或一次性生成器 | 目标、代理及额外缓存 |
| 原本关系是否保留 | 值的顺序与每次遍历的独立性 | receiver、属性规则与对象身份 |
| 提前结束怎么办 | `return`、取消信号与清理 | 撤销代理或解除额外订阅 |
| 失败由谁负责 | 生产者失败与消费者失败分别处理 | 报告真实失败并遵守不变量 |

B01 到这里可以串成一条完整的理解路径：作用域决定函数怎样找到变量；对象与原型决定属性怎样被找到；相等和复制决定状态是否共享；协议则让这些对象参与循环、代理和资源管理。需要回看时，沿正文中的小节链接补充对应概念，再返回当前阅读位置即可，不必每次重新通读整篇。

### 参考与延伸阅读

- [MDN：Iteration protocols](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols)——重点查询 `next`、`return` 以及生产者报错时的清理边界。
- [MDN：Generator.prototype.return](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator/return)——进一步理解 `finally` 中出现暂停时的控制流程。
- [MDN：for await...of](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of)——查询异步消费、提前关闭与同步迭代适配；边界行为还应在目标运行时实测。
- [MDN：Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)——查阅 trap、代理身份与内部槽限制。
- [MDN：Reflect.get](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/get)——确认 receiver 在 getter 读取中的作用。
- [MDN：Proxy get trap](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy/get)——查询不可配置属性对应的不变量。
