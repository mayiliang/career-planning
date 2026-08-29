# JavaScript 知识点讲义

## JS-01 执行上下文、作用域与闭包

写 JavaScript 时，我们经常会说“这个变量在函数里”“这个函数记住了外面的值”。这些说法在简单代码里够用，一旦出现嵌套函数、循环回调、多个实例和资源清理，就很容易互相矛盾。这一讲要建立一个稳定的运行模型：代码执行到哪里、名字从哪里查找、函数为何能在创建它的调用结束后继续访问局部状态。

### 学习前先确认

本讲不要求先读一份总术语表。只在下面某一项陌生时，打开对应的短文补齐后再回来：

- 直接前置：[函数、参数、返回值与回调](../chinese-guides/javascript-functions-and-callbacks.md#prejs-02)。如果变量与赋值仍不熟悉，这份短文会继续带你进入下一层，不必在这里重复打开。

调用栈、词法环境、作用域链和闭包都是本知识点的正文内容，不是额外前置。

### 从一次普通函数调用开始

先看一段没有异步、没有框架的代码：

```js
const taxRate = 0.1;

function total(price) {
  const tax = price * taxRate;
  return price + tax;
}

const result = total(100);
```

运行到 `total(100)` 时，JavaScript 必须保存“现在正在执行 `total`”“参数 `price` 是 `100`”“局部变量 `tax` 是什么”“函数结束后回到哪里”等状态。这组为一次执行服务的状态，称为**执行上下文（execution context）**。

全局代码有全局执行上下文；函数每调用一次，都会得到一个新的函数执行上下文。递归调用同一个函数五次，不是反复改同一个上下文，而是产生五次彼此独立的调用。

当前尚未结束的执行上下文按后进先出排列，这个结构就是**调用栈（call stack）**：

```text
调用 total(100) 之后：

栈顶  total 的函数执行上下文
      全局执行上下文
栈底
```

`total` 返回后，它的执行上下文从栈顶移出，全局代码继续。调用栈回答的是“当前执行到哪一层、结束后回到哪里”。它不直接回答“`taxRate` 为什么能被找到”。

### 名字按源码位置查找

程序还需要记录名字与绑定。可以把**词法环境（lexical environment）**理解为两部分：当前代码区域里的绑定，以及指向外层词法环境的引用。

在 `total` 内读取 `taxRate` 时，查找过程是：

1. 先看 `total` 这次调用的环境，只有 `price`、`tax` 等局部绑定。
2. 当前环境没有 `taxRate`，沿外层引用来到全局环境。
3. 找到全局绑定 `taxRate`，读取它的当前值。

这条从内向外的查找路径叫**作用域链（scope chain）**。外层关系由函数写在源码的什么位置决定，因此称为“词法”作用域，而不是由函数从什么地方被调用决定。

“最外层”还取决于代码运行在哪种宿主边界。经典浏览器脚本、ES Module、函数体和代码块会建立不同层次的环境；模块顶层绑定属于模块本身，不会因为写在文件最外面就自动变成 `window` 属性。不同模块也各有自己的顶层环境，再通过 `import`、`export` 明确连接。排查“全局变量”时应先问它属于哪个脚本或模块环境，不能把源码最左侧缩进为零一概当成同一个全局对象。

下面的 `showName` 无论从哪里调用，外层都是 `createUser` 的代码区域，不会因为调用者有一个同名变量就改道：

```js
const name = '全局名字';

function createUser() {
  const name = '局部名字';
  return function showName() {
    return name;
  };
}

const show = createUser();

function run() {
  const name = '调用者名字';
  return show();
}

console.log(run()); // 局部名字
```

`run` 出现在调用栈上，并不表示 `showName` 会从 `run` 的局部环境查找 `name`。这正是调用栈与作用域链最需要分开的地方。

规范模型还会把“保存当前声明的环境记录”与“指向外层的连接”分开描述。这里不必背内部槽位名称，但要避免另一个误解：创建函数时并不会把所有可见值复制一份塞进函数。后续执行保留的是按词法关系访问相关绑定的能力。调试器为了方便观察，可能显示比优化后真实保留范围更多的变量，因此调试面板是诊断视图，不是规范本身或精确的内存清单。

### 块作用域、函数作用域与变量遮蔽

`let`、`const`、`class` 采用块作用域。`var` 采用函数作用域；函数声明在不同语境下还受严格模式和历史兼容规则影响，现代代码不应依赖模糊的块内函数行为。

```js
const label = 'outer';

function printLabel() {
  const label = 'function';
  if (true) {
    const label = 'block';
    console.log(label); // block
  }
  console.log(label);   // function
}
```

内层同名绑定让外层绑定暂时不可见，称为**遮蔽（shadowing）**。这不等于修改外层值；离开内层块以后，外层绑定仍在。

`let`、`const` 绑定在进入代码块时已经属于该环境，但在声明语句完成初始化前不能读取，这段区域常称为**暂时性死区（temporal dead zone）**。把它简单记成“不会提升”并不准确：绑定存在，只是尚不可访问。

### 闭包不是值的截图

当函数能访问创建位置的外层词法环境时，我们说这个函数形成了**闭包（closure）**。更准确地说，闭包是函数代码与其可访问的外层环境引用的组合。

```js
function makeCounter(label) {
  let count = 0;

  return function next() {
    count += 1;
    return `${label}:${count}`;
  };
}

const counterA = makeCounter('A');
console.log(counterA()); // A:1
console.log(counterA()); // A:2
```

`makeCounter` 返回后，它的执行上下文已经离开调用栈，但 `next` 仍能访问那次调用建立的 `label`、`count` 绑定。函数返回不等于相关环境立刻消失；只要返回的函数仍可达，它依赖的环境就仍可能需要保留。

闭包访问的是绑定，而不是创建时把值复制进函数：

```js
function makeReader() {
  let value = 1;
  const read = () => value;
  value = 2;
  return read;
}

console.log(makeReader()()); // 2
```

如果闭包是一张旧值截图，结果应该是 `1`；实际读到 `2`，因为同一个 `value` 绑定后来被赋了新值。

### 每次调用会产生独立状态

函数工厂最常见的用途之一，是用每次调用独立的词法环境保存私有状态：

```js
const counterA = makeCounter('A');
const counterB = makeCounter('B');

console.log(counterA()); // A:1
console.log(counterA()); // A:2
console.log(counterB()); // B:1
```

两个 `next` 来自同一段函数代码，但分别连接到两次 `makeCounter` 调用的环境。A、B 不共享 `count`。如果计数器相互污染，应先检查状态是否被误放到模块顶层、全局对象或共享对象里，而不是把问题笼统归咎于闭包。

闭包能隐藏局部绑定，却不是安全权限边界。调用者仍可以使用返回对象公开的方法；调试工具、序列化边界和外部副作用也不会因为使用闭包自动安全。

### 循环闭包为什么常出现意外

如果还不清楚 timer 为什么在循环结束后才调用回调，可在读本节时打开 [PREJS-04 定时器与稍后执行的回调](../chinese-guides/javascript-scheduled-callbacks.md#prejs-04)。它是本节的就近补充，不是理解前半篇作用域模型的硬前置。

考虑旧代码中常见的写法：

```js
for (var i = 0; i < 3; i += 1) {
  setTimeout(() => console.log(i), 0);
}
```

`var i` 属于外围函数或全局环境，三次循环登记的回调都访问同一个 `i` 绑定。定时回调稍后执行时，循环已经把这个绑定改成 `3`，因此打印三次 `3`。

换成 `let` 后，`for` 会为每次迭代提供对应的迭代绑定：

```js
for (let i = 0; i < 3; i += 1) {
  setTimeout(() => console.log(i), 0);
}
// 稍后打印 0、1、2
```

关键不在于“`let` 更新”，而在于每个回调连接到了不同绑定。旧环境里不能使用 `let` 时，也可以通过函数参数显式创建独立绑定：

```js
for (var i = 0; i < 3; i += 1) {
  ((current) => {
    setTimeout(() => console.log(current), 0);
  })(i);
}
```

这里每次立即调用都会创建新的参数绑定 `current`。

### 闭包与内存生命周期

JavaScript 的垃圾回收通常从一组根开始，追踪还能到达哪些对象。只要某个活跃对象仍能沿引用关系到达另一个对象，后者就不能被当作不可达对象回收。业务代码不能依赖某个具体时刻必然发生垃圾回收。

闭包不会神秘地“保存整个调用栈”，但它引用的绑定，以及从这些绑定继续可达的对象，可能因此延长生命周期：

```js
function attachPreview(button, largePreview) {
  function handleClick() {
    showPreview(largePreview);
  }

  button.addEventListener('click', handleClick);

  let active = true;
  return function detach() {
    if (!active) return;
    active = false;
    button.removeEventListener('click', handleClick);
  };
}
```

事件系统保存着 `handleClick`，`handleClick` 又访问 `largePreview`。只把本地的 `detach` 变量设成 `null`，不能代替 `removeEventListener`。真正的清理动作应对应真正的外部注册点：事件要移除，定时器要取消，订阅要退订，观察器要断开。

`detach` 使用 `active` 让清理具备幂等性。重复调用不会重复执行底层撤销，也不会让计数或状态进入错误结果。幂等清理不是闭包专属概念，但闭包很适合保存“是否已经清理”的私有状态。

### 把模型用到实际代码

遇到变量结果异常或疑似泄漏时，可以按下面顺序推演：

1. 列出当前有哪些函数调用仍未结束，画出调用栈。
2. 对问题中的每个名字，标出它在哪个源码区域声明。
3. 从读取位置向外画作用域链，找出实际命中的绑定。
4. 如果函数被返回、登记或保存，标出是谁仍引用这个函数。
5. 顺着闭包访问的绑定继续找对象引用，定位真正需要撤销的外部注册。

这比“闭包会缓存变量”“函数执行完变量就释放”之类口号更可靠，因为它能在不同代码里重复使用。

### 常见误解

- **“闭包会复制外层变量的值。”** 闭包访问绑定；绑定后续改变时，读取结果也可能改变。
- **“函数返回后所有局部数据立即释放。”** 是否可回收取决于可达性，不取决于函数是否刚刚返回。
- **“调用者的局部变量会进入被调用函数的作用域链。”** 词法作用域看源码嵌套，不看动态调用者。
- **“把变量设为 null 就完成清理。”** 外部系统仍保存事件监听、定时器或订阅时，必须撤销那个注册。
- **“能用闭包隐藏就等于安全。”** 隐藏实现细节与建立授权边界是两件事。

### 学完后应能说明

不看输出答案，尝试独立说明下面四件事：

1. 调用栈与作用域链分别描述什么，为什么不能画成同一条线。
2. 两次调用 `makeCounter` 为什么拥有独立计数。
3. `var` 循环回调为什么共享一个绑定，`let` 为什么能得到逐次绑定。
4. 一个事件回调停止使用后，如何从引用关系判断应在哪里清理。

能用自己的小例子推导这些结论，就已经掌握了本知识点的核心模型。下一步可继续学习 [JS-02 原型、对象模型与 this](../chinese-guides/js-02-prototype-object-model-this.md#js-02)，它会把“函数从哪里找到名字”与“函数调用时 `this` 是谁”彻底分开。

