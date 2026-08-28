# JavaScript 知识点讲义

## JS-07 迭代协议、元编程与资源生命周期

`for...of`、展开语法、生成器、异步数据流和 Proxy 看起来像几套互不相干的高级语法，背后却有一个共同思想：对象可以通过约定好的属性和方法参与语言行为。语言不需要知道你的分页器或资源句柄是什么，只要它遵守协议。本讲从迭代协议出发，再把“语言钩子”扩展到 Symbol、Proxy、Reflect 和资源关闭。

### 学习前先确认

- 必需：[函数、参数、返回值与回调](../chinese-guides/javascript-functions-and-callbacks.md#prejs-02)
- 必需：[对象、属性与方法](../chinese-guides/javascript-objects-properties-methods.md#prejs-03)
- 必需：[JS-03 的对象身份与引用图](../chinese-guides/js-03-types-equality-copy-immutability.md#js-03)
- 读资源清理前：[异常、try/catch 与 finally](../chinese-guides/javascript-exceptions-and-finally.md#prejs-06)

异步迭代一节还会使用 Promise 和取消信号；不熟悉时到该节再打开 [Promise、异步函数与取消信号](../chinese-guides/javascript-promises-and-cancellation.md#prejs-07)。Proxy 不变量一节会链接一份单独的[属性描述符](../chinese-guides/javascript-property-descriptors.md#prejs-08)短文。无需在开始前一次读完它们。

### 从 `for...of` 提出的问题

数组、字符串、Set、Map 都能被 `for...of` 遍历：

```js
for (const value of ['A', 'B']) {
  console.log(value);
}
```

`for...of` 并不是内置了一条“如果是数组就读取索引”的专用规则。它先向对象索取迭代器，然后不断向迭代器索取下一个结果。这让用户自己的对象也能参与同一语法。

这里需要区分三个角色：

- **可迭代对象（iterable）**：实现 `[Symbol.iterator]()` 方法。
- **迭代器（iterator）**：实现 `next()` 方法，保存遍历过程的当前位置。
- **迭代结果（iterator result）**：`next()` 返回的对象，形如 `{ value, done }`。

```js
const range = {
  from: 1,
  to: 3,
  [Symbol.iterator]() {
    let current = this.from;
    const end = this.to;

    return {
      next() {
        if (current <= end) {
          return { value: current++, done: false };
        }
        return { value: undefined, done: true };
      },
    };
  },
};

console.log([...range]); // [1, 2, 3]
```

`range` 是可迭代对象；每次调用它的 `[Symbol.iterator]()` 都创建一个新的迭代器和独立的 `current`。同一个可迭代对象可以开始两次互不干扰的遍历。

迭代器也可以让 `[Symbol.iterator]()` 返回自己，从而同时是 iterable 与 iterator。但一次性迭代器通常只能继续当前进度，不能保证从头重来。API 设计应说明返回的是可重复序列还是一次性游标。

### 惰性来自“按需调用 next”

迭代协议只在消费者请求时产生下一项，因此天然适合**惰性（lazy）**序列。一个巨大的范围不必先创建巨大数组：

```js
function createRange(from, to) {
  return {
    [Symbol.iterator]() {
      let current = from;
      return {
        next() {
          return current <= to
            ? { value: current++, done: false }
            : { value: undefined, done: true };
        },
      };
    },
  };
}
```

惰性并不自动代表高性能。每次 `next()` 仍可能做昂贵工作；无限序列若交给 `[...iterable]` 之类试图完整消费的操作，会永不结束或耗尽资源。生产者和消费者都要清楚终止条件。

### 生成器是编写迭代器的语法工具

**生成器（generator）**函数用 `function*` 声明。调用它不会立即运行到结束，而是返回一个生成器对象；每次 `next()` 让函数运行到下一个 `yield`：

```js
function* range(from, to) {
  for (let current = from; current <= to; current += 1) {
    yield current;
  }
}

const iterator = range(1, 3);
iterator.next(); // { value: 1, done: false }
iterator.next(); // { value: 2, done: false }
iterator.next(); // { value: 3, done: false }
iterator.next(); // { value: undefined, done: true }
```

生成器把 `current`、循环位置和异常处理状态保存在可暂停的执行过程中。它不是“先把所有值算好再逐个返回”。

`yield* otherIterable` 可以把一段产出委托给另一个可迭代对象。委托不仅传递普通值，也涉及 `next`、`return`、`throw` 等控制流；在资源型生成器里使用前应理解关闭如何向内传播。

### 消费者提前结束时，生产者也要有机会关闭

如果 `for...of` 因 `break`、外围 `return` 或循环体抛错而提前离开，语言会在迭代器提供 `return()` 时请求结束迭代。生成器的 `return()` 会让控制流进入相应的 `finally`：

```js
function* readLines(openFile) {
  const file = openFile();
  try {
    while (true) {
      const line = file.readLine();
      if (line === null) return;
      yield line;
    }
  } finally {
    file.close();
  }
}

for (const line of readLines(openFile)) {
  if (line.includes('STOP')) break;
  console.log(line);
}
```

如果没有关闭协议，消费者虽然停止读取，文件、游标、锁或监听器却可能继续占用。资源型迭代器不能只实现“正常读到 done”这条路径。

手写迭代器可以显式实现 `return()`：

```js
function createPageIterator(loadPage, close) {
  let index = 0;
  let closed = false;

  function closeOnce() {
    if (closed) return;
    closed = true;
    close();
  }

  return {
    next() {
      if (closed) return { value: undefined, done: true };
      const page = loadPage(index++);
      if (page === undefined) {
        closeOnce();
        return { value: undefined, done: true };
      }
      return { value: page, done: false };
    },
    return() {
      closeOnce();
      return { value: undefined, done: true };
    },
    [Symbol.iterator]() {
      return this;
    },
  };
}
```

`closeOnce` 让正常结束和提前结束汇合到同一个幂等清理点。是否允许在关闭后再次 `next()`、关闭失败如何报告，都应成为 API 契约，而不是留给偶然行为。

### `throw` 是向生成器内部注入异常

生成器对象的 `throw(error)` 会在当前暂停的 `yield` 位置抛入异常。生成器可以捕获它，也可以让它继续向调用者传播；无论哪种，`finally` 都有机会执行：

```js
function* values(close) {
  try {
    yield 1;
    yield 2;
  } finally {
    close();
  }
}

const iterator = values(() => console.log('closed'));
iterator.next();
try {
  iterator.throw(new Error('stop'));
} catch (error) {
  console.log(error.message); // stop
}
```

`iterator.throw()` 与“消费者循环体自己抛错”不是完全相同的调用路径，但两者都要求资源代码正确处理异常离开。测试资源迭代器时，应覆盖正常耗尽、主动提前结束和异常三类出口。

### 异步迭代把每一步变成可等待过程

分页网络请求、流式读取等场景的下一项不能同步产生。**异步迭代（async iteration）**使用实现了 `[Symbol.asyncIterator]()` 的异步可迭代对象，其 `next()` 可以返回 Promise。`for await...of` 会等待每一步结果：

```js
async function* pages(loadPage, signal) {
  let index = 0;
  try {
    while (!signal.aborted) {
      const page = await loadPage(index++, signal);
      if (page.length === 0) return;
      yield page;
    }
  } finally {
    console.log('停止分页读取');
  }
}
```

```js
const controller = new AbortController();

for await (const page of pages(loadPage, controller.signal)) {
  render(page);
  if (enough(page)) break;
}
```

`break` 会请求关闭异步迭代器，使生成器执行 `finally`。但正在进行的底层请求是否真正停止，仍取决于 `loadPage` 是否使用同一个 `AbortSignal`。迭代器关闭、网络取消和资源释放是相互配合的三层协议，不能只实现其中一层。

异步迭代也要考虑背压：消费者一次等待一项，生产者通常不应无限提前拉取。如果设计了预取，应明确最大并发、缓冲区和取消后如何处理已开始的工作。

### Symbol 为协议提供不易冲突的键

**符号值（Symbol）**是一种原始值，每次 `Symbol('name')` 通常都会创建唯一值：

```js
const first = Symbol('id');
const second = Symbol('id');
console.log(first === second); // false
```

对象属性键可以是字符串或 Symbol。语言用一组众所周知的 Symbol 定义扩展点，例如 `Symbol.iterator`、`Symbol.asyncIterator`、`Symbol.toPrimitive`。它们避免普通业务字符串键意外与语言协议重名。

Symbol 属性不是安全私有字段：`Object.getOwnPropertySymbols` 和反射 API 仍能发现它们。需要语言级私有状态时，类私有字段、闭包或 WeakMap 各有不同适用边界。

### Proxy 拦截对象操作

**代理（Proxy）**接收目标对象与处理器。处理器中的**陷阱（trap）**可以拦截读取、写入、枚举、函数调用、构造等内部操作：

```js
const target = { count: 1 };

const proxy = new Proxy(target, {
  get(targetObject, property, receiver) {
    console.log('读取', property);
    return Reflect.get(targetObject, property, receiver);
  },
  set(targetObject, property, value, receiver) {
    if (property === 'count' && value < 0) {
      throw new RangeError('count 不能小于 0');
    }
    return Reflect.set(targetObject, property, value, receiver);
  },
});
```

Proxy 常用于观察、校验、虚拟化或兼容层。它不是普通对象的另一种语法，也不是通用状态管理方案。每个陷阱都会进入关键访问路径，错误的返回值、递归访问和身份变化都可能产生难以定位的问题。

### Reflect 帮助表达默认内部操作

**反射（Reflect）**提供的 `Reflect.get`、`Reflect.set`、`Reflect.ownKeys` 等方法与多种 Proxy 陷阱一一对应，便于在拦截前后执行默认语义。上面的 `Reflect.get(targetObject, property, receiver)` 保留接收者，这对原型上的 getter 使用 `this` 尤其重要。

直接写 `targetObject[property]` 有时也能读取值，但容易忽略 receiver、布尔成功结果和与相应内部操作一致的边界。Reflect 不是必须和 Proxy 同时使用，却常是编写透明转发陷阱的清晰工具。

### Proxy 必须遵守目标对象不变量

Proxy 能拦截操作，但必须遵守**对象不变量（object invariant）**，不能伪造与目标对象已锁定事实冲突的结果。读本节前若不了解 `configurable`、`writable`，先看[属性描述符与对象不变量](../chinese-guides/javascript-property-descriptors.md#prejs-08)。

```js
const target = {};
Object.defineProperty(target, 'id', {
  value: 42,
  writable: false,
  configurable: false,
});

const invalid = new Proxy(target, {
  get() {
    return 7;
  },
});

// invalid.id 会抛 TypeError：代理不能谎报这个已锁定属性的值
```

其他不变量还涉及不可扩展对象、不可配置属性是否出现在 `ownKeys`、删除和定义属性的返回结果等。最稳妥的默认做法是由相应 `Reflect` 方法转发，只对明确需要的部分加逻辑，并为锁定对象写测试。

Proxy 还可能与依赖内部槽的内建对象或类私有字段不透明兼容。例如未经适配地从代理上调用 Map 方法，可能因 `this` 不是具有 Map 内部槽的原对象而失败。不要假设“代理看起来像目标”就能通过所有品牌检查。

### 把协议和生命周期连起来

迭代、代理和资源管理可以用同一个设计视角检查：

1. **入口是什么？** `Symbol.iterator`、`next`、`return`、Proxy trap 或取消信号。
2. **状态归谁所有？** 可迭代对象、每次迭代器实例、目标对象，还是外部资源管理器。
3. **正常路径是什么？** 读到 `done`、完成异步流、成功转发属性操作。
4. **提前退出和失败怎么走？** `return`、`throw`、AbortSignal、陷阱抛错。
5. **哪些事实不能破坏？** 只关闭一次、取消后不再拉取、Proxy 遵守目标不变量。

协议让语言与用户对象协作；生命周期设计保证协作不是只有顺利执行时才正确。

### 什么时候选择哪种工具

- 已经在内存中的小集合：数组或普通集合通常最直接。
- 需要按需生成、可能无限或提前停止的同步序列：可迭代对象或生成器。
- 每一项都需要等待 I/O：异步可迭代对象或异步生成器，并明确取消与背压。
- 需要对多种属性操作建立统一观察或虚拟行为：经过不变量评估的 Proxy。
- 只需要一个字段的 getter/setter：属性访问器可能比 Proxy 更简单。
- 资源有明确获得与释放：无论是否使用生成器，都应有单一、幂等的关闭路径。

### 常见误解

- **“iterable 和 iterator 是同一个概念。”** 一个负责产生迭代器，一个负责保存单次遍历进度；对象可以兼任，但职责不同。
- **“生成器会预先算出所有值。”** 它在消费者推进时运行到下一个 `yield`。
- **“break 只影响消费者。”** 对支持关闭的迭代器，提前结束会触发 `return` 协议。
- **“AbortSignal 会自动停止所有工作。”** 被调用层必须实际响应信号，并完成自身清理。
- **“Proxy 可以返回任何想要的结果。”** 陷阱受目标对象不变量约束。
- **“Reflect.get 等于任何情况下的 target[prop]。”** receiver 等参数会影响原型访问器和转发语义。

### 学完后应能说明

1. iterable、iterator、iterator result 三者的职责，以及一次遍历的状态放在哪里。
2. 生成器在 `yield` 处暂停后，`next`、`return`、`throw` 分别如何继续它。
3. 正常耗尽、`break`、异常和取消如何最终到达一次且仅一次的资源清理。
4. 异步迭代为何仍需要显式传递 AbortSignal 和背压边界。
5. Proxy 陷阱为什么常用 Reflect 转发，以及不可配置属性会施加什么约束。

如果这五点能通过自己写的小型序列和资源包装器解释，而不是只背 API 名称，就具备了把本知识点迁移到分页、流、观察器和响应式系统的基础。
