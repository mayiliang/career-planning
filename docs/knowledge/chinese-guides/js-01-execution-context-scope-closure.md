# JavaScript 知识点讲义

## JS-01 执行上下文、作用域与闭包

为什么函数已经执行完，里面的变量还能继续使用？为什么同一个回调，换个地方调用也找不到那个地方的同名变量？这两个看似分开的问题，其实都在问：**一个函数究竟从哪里读取变量。**

这篇文章从普通函数调用开始，逐步走到闭包。读完后，你应该能顺着源码解释变量的来处，分清“这一次调用的局部状态”和“多个函数共用的状态”，也能判断回调何时需要清理。

### 学习前先确认

- 直接前置：[函数、参数、返回值与回调](../chinese-guides/javascript-functions-and-callbacks.md#prejs-02)。只需能读懂函数定义、调用和返回函数；变量基础在这篇前置短文中另有入口。

本文示例可分别复制到现代浏览器控制台运行。每个代码块都自带所需定义，`// =>` 后面是应看到的输出。先运行，再改一个值观察变化，比一开始记术语更容易建立直觉。

### 从一次函数调用看起

先看一个最普通的价格计算：

```js example=js01-call
function calculatePrice(unitPrice, quantity) {
  const subtotal = unitPrice * quantity;
  return subtotal;
}

console.log(calculatePrice(12, 2)); // => 24
console.log(calculatePrice(12, 5)); // => 60
```

两次调用用的是同一段函数代码，却各自有一组参数和局部变量。第一次的 `quantity` 是 `2`，第二次是 `5`。它们并不是让同一个局部变量来回换值，而是两次调用分别建立了自己的执行环境。

可以把**执行上下文（execution context）**理解为：为了执行当前这段代码，JavaScript 需要保存的一组信息。例如正在执行哪个函数、局部变量在哪里，以及代码执行到了哪里。它是解释运行过程的模型，不是要求你猜测引擎把每个变量放在内存的哪个位置。

当一个函数调用另一个函数时，当前函数暂时等着，被调用的函数先执行；返回以后，再从原来的位置继续。这种“后来调用的先返回”的顺序，由**调用栈（call stack）**描述。

```js example=js01-stack
function formatPrice(value) {
  console.log('进入 formatPrice');
  return `¥${value}`;
}

function showPrice() {
  console.log('进入 showPrice');
  const text = formatPrice(24);
  console.log(text);
}

showPrice();
// => 进入 showPrice
// => 进入 formatPrice
// => ¥24
```

调用栈回答的是“现在轮到谁执行”。它不直接回答“函数中的某个名字应该去哪里找”。后一个问题需要作用域。把这两个问题拆开，闭包就不必依赖“函数退出了，栈怎么还没消失”这样的猜想来解释。

### 名字沿源码的位置查找

**作用域（scope）**决定一个名字能在哪些位置被访问。JavaScript 主要采用**词法作用域（lexical scope）**：查找外层变量的方向，由函数在源码中定义的位置决定，而不是由调用位置决定。

```js example=js01-scope
const city = '杭州';

function showCity() {
  return city;
}

function visit() {
  const city = '成都';
  return showCity();
}

console.log(visit()); // => 杭州
```

`showCity` 自己没有声明 `city`，于是向它定义处的外层查找，找到 `'杭州'`。虽然这次调用发生在 `visit` 里面，但 `visit` 的局部变量不在 `showCity` 的外层作用域中，因此不会参与这次查找。

读这种代码时，可以先圈出函数的定义，再沿源码中的嵌套关系向外看。不要从调用处反向寻找“最近执行过的同名变量”。前者是作用域关系，后者只是执行顺序，两者不能混用。

如果内层也声明了同名变量，内层变量会**遮蔽（shadowing）**外层变量。遮蔽只是名字查找会先停在内层，并不意味着外层的值被改了。

```js example=js01-shadow
const label = '全站设置';
{
  const label = '当前页面';
  console.log(label); // => 当前页面
}
console.log(label); // => 全站设置
```

作用域也不等于花括号的数量。`if`、`for` 和独立代码块会为 `let`、`const` 建立块级作用域；`var` 通常受所在函数约束，不会因为普通的 `if` 块就产生独立作用域。对象字面量的花括号则是在描述属性，不是创建一层供变量查找的词法作用域。

### 声明之前为什么有时能读有时会报错

“声明提升”这个说法容易让人以为引擎把源码搬到了文件顶部。更准确的读法是：进入作用域时，某些名字已经被登记，但不同声明的初始化规则不同。

```js example=js01-initialization
function inspectDeclarations() {
  console.log(total); // => undefined
  var total = 3;

  try {
    console.log(count);
  } catch (error) {
    console.log(error.name); // => ReferenceError
  }
  let count = 4;
  console.log(count); // => 4
}
inspectDeclarations();
```

`var total` 在函数开始执行时已经初始化为 `undefined`，运行到赋值处才变成 `3`。`let count` 的绑定虽然已经属于这个作用域，但直到执行声明时才完成初始化。此前这段时间叫**暂时性死区（temporal dead zone）**，简称 TDZ。

TDZ 中的变量不是“先去外层找找看”。只要当前作用域声明了这个名字，就会先找到当前绑定；它尚未初始化，读取便报错，即使外层恰好也有同名变量。

```js example=js01-tdz-shadow
const theme = '浅色';
{
  try {
    console.log(theme);
  } catch (error) {
    console.log(error.name); // => ReferenceError
  }
  const theme = '深色';
  console.log(theme); // => 深色
}
```

普通函数声明在所在函数或模块的作用域初始化时就可供调用。赋给 `const` 的函数表达式则要等到那条声明执行完成。不要把“函数能提前调用”推广成所有写法都一样；阅读旧式脚本时，块内函数声明还有历史兼容规则，现代代码尽量在模块或明确的函数作用域中定义它们。

还有一个有用的区别：`typeof` 一个完全未声明的名字通常返回 `'undefined'`，但 `typeof` 一个处于 TDZ 的绑定仍会报错。`typeof` 不是绕过初始化规则的通行证。`const` 声明后的约束则是不能重新赋值，和 TDZ 是两个阶段的规则；它也不会自动冻结对象，见 [JS-03 中的共享对象](../chinese-guides/js-03-types-equality-copy-immutability.md#赋值之后谁和谁共用对象)。

脚本与模块的顶层也要区分。在浏览器传统脚本中，顶层 `var` 通常会成为全局对象的属性，顶层 `let`、`const` 则不会；ES Module 的顶层声明属于模块自己的作用域，不会自动成为 `window` 的属性。因此，“能直接读到一个名字”和“能从 `window` 读到同名属性”不能画等号。控制台还有自己的输入处理方式，判断工程代码时应以它实际作为脚本还是模块加载为准。

### 闭包让函数继续访问创建处的变量

现在把函数当作返回值，让它在外层函数结束后再执行：

```js example=js01-counter
function createCounter() {
  let count = 0;
  return function next() {
    count += 1;
    return count;
  };
}

const next = createCounter();
console.log(next()); // => 1
console.log(next()); // => 2
```

`createCounter()` 结束后，我们拿到了 `next` 这个函数。稍后调用 `next()`，它仍然可以找到创建时所在作用域中的 `count`，并继续修改它。

**闭包（closure）**指的就是函数以及它能够访问的词法环境这一组合。函数创建时就确定了向外查找变量的关系。把函数返回，只是让这种关系在外层调用结束以后表现得特别明显；事件回调、数组回调里的函数，同样可以形成闭包。

这里有两个动作不要混在一起：调用 `createCounter()` 建立这一份 `count`；调用返回的 `next()` 使用这一份 `count`。第二次执行 `next()` 不会重新执行外层的 `let count = 0`，所以输出会接着增长。

这也解释了为什么“调用结束”不等于“所有局部状态立刻消失”。调用栈上的执行过程可以结束，而仍被函数引用的环境继续存在。引擎可以对存储方式做优化；理解语义时，只需关心这些变量是否仍然能被访问，不必假设整个栈帧原封不动地保存着。

### 闭包保存的是变量还是快照

闭包不是在创建函数时，把外层所有值拍一张照片。它会在执行时读取相应的绑定，所以能看到后来发生的重新赋值。

```js example=js01-live-binding
let currentName = '未登录';
const readName = () => currentName;
const savedName = currentName;
const readSavedName = () => savedName;

currentName = '小林';
console.log(readName()); // => 小林
console.log(readSavedName()); // => 未登录
```

两个函数都用到了闭包。差别在于 `readName` 读取会变化的 `currentName`，而 `readSavedName` 读取另外建立的 `savedName`。后者保存的是当时的字符串值，之后没有被重新赋值。

如果把字符串换成对象，`const saved = currentObject` 只会保存同一个对象的引用，不会复制对象内容。闭包没有替你完成深拷贝。遇到“为什么保存了旧状态却仍然变了”，应同时检查变量绑定和对象是否共享，接着看 [JS-03：浅拷贝只复制一层](../chinese-guides/js-03-types-equality-copy-immutability.md#浅拷贝只复制一层)。

反过来，闭包也不会自动跟随所有“最新状态”。如果某次调用先算出一个字符串，再让回调读取这个字符串，回调读取的就是那次计算结果。决定它是新是旧的，不是“用了闭包”四个字，而是它实际捕获哪个绑定、该绑定以后是否更新。

### 两次创建会得到两份独立状态

同一次外层调用中创建的多个函数，可以共同使用同一组局部变量。再次调用外层函数，则会建立另一份。

```js example=js01-independent
function createCounter() {
  let count = 0;
  return {
    increment() { count += 1; },
    read() { return count; },
  };
}

const first = createCounter();
const second = createCounter();
first.increment();
first.increment();
console.log(first.read()); // => 2
console.log(second.read()); // => 0
```

`first.increment` 和 `first.read` 是两个函数，但它们读取同一份 `count`。`second` 的两个方法来自第二次外层调用，使用另一份 `count`。这是一种简单的封装方式：外部只能通过提供的方法访问状态，不能直接用 `first.count` 修改局部变量。

这种封装并不保证所有返回的数据都安全。如果 `read()` 返回一个内部可变对象，外部拿到它仍可能改动内部状态；“变量名不可直接访问”和“对象不可修改”是两回事。也不要在外层模块只创建一次实例，再误以为每个使用者拿到的都是新状态。需要隔离时，应明确在哪里调用创建函数。

此处的方法没有用到 `this`，把 `first.read` 取出来单独调用也能工作。它读取的是词法环境里的 `count`。如果方法写成 `return this.count`，决定结果的就变成了调用方式；这个区别在 [JS-02：先找到函数再看怎样调用](../chinese-guides/js-02-prototype-object-model-this.md#先找到函数再看怎样调用)中展开。

### 循环中的回调为什么会读到同一个数

闭包问题不一定要等待定时器才出现。先把函数放进数组，再在循环结束后调用，就能把变量问题单独看清楚。

```js example=js01-loop
const shared = [];
for (var index = 0; index < 3; index += 1) {
  shared.push(() => index);
}
console.log(shared.map((read) => read()).join(',')); // => 3,3,3

const separate = [];
for (let index = 0; index < 3; index += 1) {
  separate.push(() => index);
}
console.log(separate.map((read) => read()).join(',')); // => 0,1,2
```

第一轮循环使用 `var`。所有回调共享同一个 `index`；等我们真正调用它们时，循环已经结束，这个变量的值是 `3`。

第二轮在 `for` 头部使用 `let`。JavaScript 为迭代建立各自的绑定，因此每个回调关联自己那一轮的 `index`。这不是因为箭头函数能自动记住当前数字，两组代码都用了箭头函数；变化的是绑定的创建规则。

如果必须处理使用 `var` 的旧代码，可以在每一轮调用一个普通函数，把当前值作为参数传进去，让这次调用建立单独的参数绑定。原理和 `createCounter` 完全一致，不需要再背一套神秘口诀。若问题来自定时器，把“何时执行”交给[稍后执行的回调](../chinese-guides/javascript-scheduled-callbacks.md#prejs-04)，把“届时读哪个变量”留给作用域分析，两条线各自推清就够了。

### 回调结束使用后要解除谁的引用

闭包本身不是内存泄漏。一个计数器刻意保存 `count`，就是它正常工作的方式。真正值得留意的是：业务已经不再需要回调，但事件系统、定时器或长期存在的集合仍然保存着它。

下面使用标准 `EventTarget` 模拟一个通知来源，不需要页面上预先存在按钮。订阅函数返回清理函数，让登记和撤销写在一起。

```js example=js01-cleanup
const events = new EventTarget();

function subscribeLabel(label) {
  function onChange() {
    console.log(label); // => 草稿已保存
  }
  events.addEventListener('change', onChange);
  return () => events.removeEventListener('change', onChange);
}

const stop = subscribeLabel('草稿已保存');
events.dispatchEvent(new Event('change'));
stop();
events.dispatchEvent(new Event('change'));
```

第一次派发事件，监听器读取闭包中的 `label`。调用 `stop()` 后，事件源不再保存这条监听，第二次派发不会输出。清理时使用的是原来的 `onChange` 函数；重新写一个内容相同的函数，会得到另一个函数对象，无法替代它。

还要继续问一层：我们是否仍把 `stop` 放在一个长期存在的数组中？清理函数自身也可能引用 `onChange`。移除监听会断开事件源这一条引用，但其他引用若仍存在，对应对象仍可能保持可达。因此，清理完成后也应让过期订阅记录退出自己的集合。垃圾回收取决于对象是否仍然可达，而且不会承诺在某一行代码后立即执行。

::: tip 把清理责任写在创建处
凡是把函数交给一个比当前操作活得更久的系统，都顺手确认撤销入口。完整的“正常结束、提前退出、发生异常”清理模型，见 [JS-07：让资源的打开和关闭待在一起](../chinese-guides/js-07-iteration-metaprogramming-resources.md#让资源的打开和关闭待在一起)。
:::

### 用一条线把概念连起来

分析一段涉及闭包的代码，可以按这样的次序阅读：函数在哪里定义；当前读取的名字属于哪一层作用域；那层作用域是哪次调用建立的；读取发生前，这个绑定或它指向的对象有没有变化；最后，是谁仍然持有这个函数。

这条顺序比先判断“这算不算闭包”更实用。它同时解释了调用结束后的状态保留、同一实例中的共享状态、多实例隔离，以及回调的清理。调用栈帮助你跟踪执行过程，词法作用域帮助你找到变量，闭包则把函数与它仍可访问的环境连在一起。

接下来读 [JS-02 原型、对象模型与 this](../chinese-guides/js-02-prototype-object-model-this.md#js-02)。你会遇到另一种容易混淆的查找：`name` 沿作用域找变量，`object.name` 沿对象及其原型找属性。先把两条路径分开，再看它们如何在方法调用中碰面。

### 参考与延伸阅读

- [MDN：Closures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures)——查阅词法环境、闭包共享状态和循环回调的更多说明。
- [MDN：JavaScript execution model](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model)——进一步了解执行上下文、调用栈与宿主环境的关系。
- [MDN：let](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let)——核对 TDZ 和 `for` 循环的逐轮绑定规则。
- [MDN：Memory management](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Memory_management)——需要定位长期保留的数据时，再深入可达性和垃圾回收。
