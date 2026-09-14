# JavaScript 知识点讲义

## JS-02 原型、对象模型与 `this`

你可能写过这样的代码：`user.sayHello()` 能正常运行，把 `user.sayHello` 交给另一个函数却报错。也可能见过一个对象明明没有某个方法，调用时却找得到。前者与调用方式有关，后者与原型查找有关；把它们分开看，许多规则会自然连起来。

本文沿着“读取属性 → 找到函数 → 调用函数 → 创建对象”的顺序展开。你会理解方法为什么能共享、`this` 为什么会变化，以及 `class` 和原型之间的关系。

### 学习前先确认

- 直接前置：[对象、属性与方法](../chinese-guides/javascript-objects-properties-methods.md#prejs-03)。需要能读懂属性访问、函数值，以及两个变量可能指向同一个对象。

示例可以分别复制到现代浏览器控制台运行，`// =>` 标出输出。涉及普通函数的 `this` 时，示例会在函数内明确开启严格模式，避免控制台运行方式影响结果。严格模式的基础见[这篇短文](../chinese-guides/javascript-strict-mode.md#prejs-05)。

### 对象自己没有的属性从哪里来

设想几个用户都需要同一种问候方式。我们可以把公共行为放在一个对象上，再让用户对象沿着原型找到它。

```js example=js02-prototype
const userMethods = {
  describe() {
    return `我是${this.name}`;
  },
};

const user = Object.create(userMethods);
user.name = '小林';

console.log(user.describe()); // => 我是小林
console.log(Object.hasOwn(user, 'name')); // => true
console.log(Object.hasOwn(user, 'describe')); // => false
console.log(Object.getPrototypeOf(user) === userMethods); // => true
```

`name` 是 `user` 的自有属性，`describe` 则来自 `userMethods`。`Object.create(userMethods)` 创建一个新对象，并把它的内部原型指向 `userMethods`。读取 `user.describe` 时，JavaScript 先检查 `user` 自己；没有找到，再到原型上查找。

这个继续查找的路径就是**原型链（prototype chain）**。原型也可以有自己的原型，一层层查到 `null` 为止。整条链都没有这个属性，普通读取才得到 `undefined`。读取到值为 `undefined` 的自有属性就已经找到了，不会因为值看起来“空”而继续向上查找。

`Object.hasOwn(user, 'describe')` 只问对象自己有没有属性；`'describe' in user` 则会连原型链一起查。前者适合判断输入对象明确提供了什么，后者适合判断整个对象是否支持某个属性名。两者都不是在判断读取结果的真假，值为 `false` 或 `0` 的属性仍然可以存在。

### 共享方法不等于共享所有状态

普通、可写的数据属性可以被同名自有属性遮住。删除这条自有属性以后，原型上的属性又会被看到。

```js example=js02-shadow
const defaults = { theme: '浅色' };
const settings = Object.create(defaults);
settings.theme = '深色';
console.log(settings.theme); // => 深色
console.log(defaults.theme); // => 浅色

delete settings.theme;
console.log(settings.theme); // => 浅色
```

这里的赋值没有改动 `defaults.theme`，而是在 `settings` 上建立了自己的属性。不过，不要把它背成“赋值永远只改自己”：如果原型上对应的是 setter，赋值可能调用它；如果继承的数据属性不可写，赋值可能失败。理解普通情况以后，再用[属性描述符](../chinese-guides/javascript-property-descriptors.md#prejs-08)查看这些额外规则。

还有一种更常见的共享：原型属性本身存放可变对象。

```js example=js02-shared-array
const defaults = { tags: [] };
const first = Object.create(defaults);
const second = Object.create(defaults);
first.tags.push('置顶');
console.log(second.tags.join(',')); // => 置顶
console.log(Object.hasOwn(first, 'tags')); // => false
```

`first.tags.push()` 先读取 `tags`，得到原型上的数组，再修改这个数组。它没有给 `first.tags` 重新赋值，因此没有产生独立数组。需要各实例独立的数据时，应在创建实例时为它们分别准备；适合共享的通常是方法，而不是会被每个实例改动的列表。

这与闭包中的状态是否独立是同一个判断习惯：先确认究竟是哪次创建得到的对象。想继续检查共享和复制，见 [JS-03：赋值之后谁和谁共用对象](../chinese-guides/js-03-types-equality-copy-immutability.md#赋值之后谁和谁共用对象)。

### 先找到函数再看怎样调用

读取方法和调用方法是两个步骤。读取 `user.describe` 找到一个函数；随后采用什么调用方式，才决定普通函数的 `this`。

```js example=js02-this
const user = {
  name: '小林',
  describe() {
    'use strict';
    return this === undefined ? '没有接收对象' : this.name;
  },
};

const describe = user.describe;
console.log(user.describe()); // => 小林
console.log(describe()); // => 没有接收对象
console.log(describe.call({ name: '小周' })); // => 小周
```

`user.describe()` 是通过 `user` 调用，`this` 为 `user`。`describe()` 是独立调用，这个严格模式函数的 `this` 为 `undefined`。`call` 则显式指定 `this`。同一个函数值，三种调用，三种上下文；函数不会因为最初被存放在 `user` 上，就永远记住 `user`。

阅读英文资料时，你会遇到 **receiver**，本文保留这个词。在普通方法调用中，可以先把它理解为“本次调用接收方法的那个对象”。在 `user.describe()` 里，就是 `user`。不要把它和“方法最早定义在哪个对象上”混在一起：原型上的共享方法，也会以本次实际调用的对象作为 `this`。

::: note 严格模式看函数的定义环境
非严格的普通函数在独立调用时，通常会把 `undefined` 或 `null` 的 `this` 替换为全局对象；严格函数不会。是否严格由函数自身决定，并不是严格的调用者可以临时改变被调用函数。ES Module 与 `class` 中的代码本身就处于严格模式。
:::

将方法传给回调时，同样要看调用方怎样调用它。数组方法通常按自身规则传入参数，事件 API 也有各自的 `this` 约定；“回调中的 `this` 一律丢失”不是通用规则。要保证结果稳定，就让回调本身明确地选定需要的对象。

### call 和 bind 怎样明确调用对象

`call` 立即执行函数，参数逐个传入；`apply` 也立即执行，但把后续参数放在一个类数组对象中。**绑定函数（bound function）**由 `bind` 创建，它稍后被调用时会使用预先指定的 `this`，也可以预先固定一部分参数。

```js example=js02-bind
function greet(prefix) {
  'use strict';
  return `${prefix}，${this.name}`;
}
const user = { name: '小林' };
const hello = greet.bind(user, '你好');

console.log(greet.call(user, '早上好')); // => 早上好，小林
console.log(greet.apply(user, ['晚上好'])); // => 晚上好，小林
console.log(hello()); // => 你好，小林
console.log(hello.call({ name: '小周' })); // => 你好，小林
```

普通调用绑定函数时，再通过 `call` 传另一个对象，不会覆盖已经绑定的 `this`。但绑定并没有复制 `user`。如果之后改了 `user.name`，`hello()` 仍会从同一个对象读取新值。这一点又回到了对象身份与可变性。

`bind` 每次会创建一个新的函数对象。因此 `removeEventListener('click', obj.handle.bind(obj))` 不能移除先前通过另一次 `bind` 登记的监听。正确做法是保存绑定结果，用同一个函数登记和撤销；或者使用一条保存下来的箭头回调。清理细节可接着读 [JS-01：回调结束使用后要解除谁的引用](../chinese-guides/js-01-execution-context-scope-closure.md#回调结束使用后要解除谁的引用)。

### 箭头函数从外层取得 this

箭头函数不建立自己的 `this`。它使用的是创建位置外层的 `this`，因此很适合在普通方法内部保留本次调用对象。

```js example=js02-arrow
const user = {
  name: '小林',
  createReader() {
    'use strict';
    return () => this.name;
  },
};

const readName = user.createReader();
console.log(readName()); // => 小林
console.log(readName.call({ name: '小周' })); // => 小林
```

调用 `user.createReader()` 时，外层方法的 `this` 是 `user`。返回的箭头函数沿着外层环境取得这个 `this`，之后用 `call` 也改不了它。这个规则与 [JS-01 的词法作用域](../chinese-guides/js-01-execution-context-scope-closure.md#名字沿源码的位置查找)相连：决定外层环境的是创建位置。

因此，直接把依赖对象自身的字面量方法改成箭头函数，通常不合适。对象字面量不会建立自己的词法 `this`；`{ read: () => this.name }` 中的 `this` 来自对象外部，并不因为箭头被放进这个对象就指向它。

箭头函数还没有自己的 `arguments`，也不能被 `new` 调用。需要动态调用对象、构造实例或独立的 `arguments` 时，应选择普通函数。选择依据是需要怎样的行为，而不是哪种写法短。

### getter 为什么也要关心接收对象

属性不一定只是存储一个值。**访问器（accessor）**可以在读取时执行 getter，在写入时执行 setter。继承的 getter 同样需要知道最初是对哪个对象发起读取。

```js example=js02-getter
const profile = {
  get displayName() {
    return `${this.lastName}同学`;
  },
};
const student = Object.create(profile);
student.lastName = '林';

console.log(student.displayName); // => 林同学
console.log(Reflect.get(profile, 'displayName', { lastName: '周' })); // => 周同学
```

第一条读取在 `student` 上开始，沿原型找到 getter，却仍然以 `student` 作为 getter 的 `this`。第二条通过 `Reflect.get` 单独指定 receiver，所以 getter 读到 `'周'`。

此时只需记住：查到属性的位置和 getter 使用的 `this` 可以是两个对象。到 [JS-07：Reflect 保留原本的读取关系](../chinese-guides/js-07-iteration-metaprogramming-resources.md#reflect-保留原本的读取关系)，这个区分会解释为什么代理转发时不能总写 `target[key]`。

### new 怎样把实例接到原型上

普通构造函数与它创建的实例之间，可以通过 `prototype` 建立共享行为。

```js example=js02-new
function User(name) {
  this.name = name;
}
User.prototype.describe = function describe() {
  return `我是${this.name}`;
};

const first = new User('小林');
const second = new User('小周');
console.log(first.describe()); // => 我是小林
console.log(Object.getPrototypeOf(first) === User.prototype); // => true
console.log(first.describe === second.describe); // => true
```

对这样的普通构造函数执行 `new User('小林')`，可以抓住四步理解：创建实例对象；把实例的内部原型连接到 `User.prototype`；以实例作为 `this` 执行构造函数并传入参数；根据构造函数返回值决定最后结果。

最后一步有个例外：构造函数显式返回对象或函数时，那个返回值会成为 `new` 的结果；返回普通原始值通常会被忽略。构造函数的 `prototype` 不是对象时，普通构造过程会使用默认原型。内置构造器、派生类还有各自的细节，不应把这四步当成适用于所有情况的手写 `new` 实现。

```js example=js02-new-return
function ReturnObject() {
  this.name = '新实例';
  return { name: '另一个对象' };
}
function ReturnNumber() {
  this.name = '新实例';
  return 42;
}
console.log(new ReturnObject().name); // => 另一个对象
console.log(new ReturnNumber().name); // => 新实例
```

这里要区分两个名字很像的东西。实例的内部原型用 `Object.getPrototypeOf(instance)` 观察；构造函数的 `.prototype` 则是一个普通属性，在创建实例时提供原型对象。`User.prototype` 不表示“User 函数对象自己的原型”。函数本身也是对象，也有内部原型，两条关系不是同一条。

一般不需要通过旧式 `__proto__` 访问器操作原型，也不建议在对象已被大量使用后频繁修改原型。尽量在创建时确定结构，更容易读懂，也更容易避免意外影响所有共享该原型的对象。

### class 把构造和共享方法放在一起

`class` 提供了更集中的声明方式。实例方法放在原型上，实例字段则在每次创建实例时分别建立。

```js example=js02-class
class Notebook {
  notes = [];
  constructor(owner) {
    this.owner = owner;
  }
  add(text) {
    this.notes.push(text);
  }
}

const first = new Notebook('小林');
const second = new Notebook('小周');
first.add('读到原型了');
console.log(first.notes.length); // => 1
console.log(second.notes.length); // => 0
console.log(first.add === second.add); // => true
```

每次创建都会得到独立的 `notes` 数组，而 `add` 方法由两个实例共享。普通实例方法不会自动绑定 `this`，取出来独立调用仍然要处理调用对象。若把方法写成箭头函数字段，则每个实例会创建自己的函数，换来的是捕获实例 `this`；这是一项明确的取舍。

`class` 也不只是把旧语法换个样子：它必须通过 `new` 调用，类体默认严格，声明有初始化限制；继承中的 `super`、私有字段也有额外语义。把它理解为“建立在原型模型之上的类语法”更合适，不必强行把每种行为都还原成几行构造函数代码。

继承适合表达稳定的“是一种”关系，但不是所有复用都需要增加一层父类。如果笔记本只是“需要一个保存器”，可以把保存函数或保存器对象传进来，由笔记本调用它。这种组合让存储方式与笔记行为分别变化，也避免为了复用几行方法让所有类被迫继承同一种结构。选择时先看业务关系是否稳定，再决定共享代码放在原型、普通函数还是独立对象中。

### 进一步理解绑定函数与构造调用

对可构造的函数做 `bind`，所得函数仍可能被 `new` 调用。这时预先绑定的参数有效，但绑定的 `this` 会被忽略，因为构造调用要使用新实例。

```js example=js02-bound-new
function User(name) {
  this.name = name;
}
const existing = { name: '原对象' };
const CreateLin = User.bind(existing, '小林');
const created = new CreateLin();

console.log(created.name); // => 小林
console.log(existing.name); // => 原对象
console.log(created instanceof User); // => true
```

这不是“bind 失效”，而是普通调用和构造调用有不同规则。遇到组合写法时，先识别最外层操作：它到底是 `fn()`、`obj.fn()`、显式 `call`，还是 `new fn()`？再看函数是否为箭头、是否已经绑定。不要把各种场景压缩成一句“this 永远指向……”来猜。

默认情况下，`instanceof` 检查构造函数的 `prototype` 是否出现在对象原型链中，而不是核对对象有几个同名字段。它也不是跨窗口数据类型判断的万能工具；不同 Realm 的构造器可能不同，且 `Symbol.hasInstance` 可以定制行为。判断数组时优先使用 `Array.isArray` 这样的专门 API。

### 回看属性查找与函数调用

| 看到的表达式 | 先问什么 | 应关注的关系 |
| --- | --- | --- |
| `name` | 这个变量在哪里声明 | 词法作用域 |
| `user.name` | 自身有没有，原型上有没有 | 属性查找与访问器 |
| `user.read()` | 找到的是哪个函数，怎样调用 | 查找结果与本次 `this` |
| `read()` | 函数是否严格、绑定或为箭头 | 函数自身规则 |
| `new User()` | 是否可构造，实例接到哪里 | 构造过程与原型 |

如果一个行为看起来反常，先把表达式拆成“取值”和“调用”两步。原型负责共享和查找，普通方法的 `this` 由调用方式提供，箭头函数的 `this` 则沿创建处向外找。接着读 [JS-03](../chinese-guides/js-03-types-equality-copy-immutability.md#js-03)，把对象身份、相等比较和更新方式补齐。

### 参考与延伸阅读

- [MDN：Inheritance and the prototype chain](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Inheritance_and_the_prototype_chain)——查阅原型链、属性遮蔽与不同创建方式。
- [MDN：this](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this)——按调用场景查询 `this`，尤其留意严格函数与箭头函数。
- [MDN：Function.prototype.bind](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind)——核对参数预置和构造调用的边界。
- [MDN：new](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/new)——进一步查阅构造函数返回值与实例原型。
