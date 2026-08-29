# JavaScript 知识点讲义

## JS-02 原型、对象模型与 `this`

JavaScript 对象看似简单：读取属性、调用方法、创建实例。困难通常来自三套规则被混在一起——属性可以从原型继承，函数对象有一个名为 `prototype` 的属性，普通函数调用又会根据调用形式得到 `this`。这一讲按“先找属性，再调用函数”的顺序，把三套规则拆开。

### 学习前先确认

- 直接前置：[对象、属性与方法](../chinese-guides/javascript-objects-properties-methods.md#prejs-03)。函数与变量基础已经由这份短文逐层链接，不在这里重复列出。

原型链、构造调用和 `this` 绑定都在本讲从头解释。

### 属性读取不只看对象自己

每个普通对象都有一个内部的**原型关联（prototype）**，存放在 `[[Prototype]]` 槽位中；它要么指向另一个对象，要么是 `null`。代码不能直接用 `obj.[[Prototype]]` 这种语法读取它；应使用 `Object.getPrototypeOf(obj)`。

```js
const parent = { role: 'parent', shared: 1 };
const child = Object.create(parent);
child.name = 'child';

console.log(child.name);   // child 自己的属性
console.log(child.shared); // 从 parent 找到
console.log(child.missing); // 原型链走到尽头，undefined
```

读取 `child.shared` 时，运行时大致依次检查：

1. `child` 是否有自有属性 `shared`。
2. 没有，就到 `Object.getPrototypeOf(child)`，也就是 `parent` 上查找。
3. 仍没有就继续沿 `parent` 的原型查找，直到原型为 `null`。

这条逐级委托属性查找的路径称为**原型链（prototype chain）**。

`Object.hasOwn(child, 'shared')` 是 `false`，`'shared' in child` 是 `true`。前者只问自有属性，后者会考虑整个原型链。

### 属性遮蔽不是覆盖原型对象

给 `child` 写入一个与原型同名的普通可写属性，通常会在 `child` 上建立自有属性：

```js
child.shared = 2;

console.log(child.shared);  // 2
console.log(parent.shared); // 1
console.log(Object.hasOwn(child, 'shared')); // true
```

新的自有属性先被找到，所以原型上的 `shared` 暂时看不见，这叫**属性遮蔽（property shadowing）**。它没有修改 `parent.shared`。访问器属性、不可写属性和 Proxy 会让写入规则更复杂，不能把所有赋值都概括为“必然在子对象上新建属性”。

删除 `child.shared` 后，读取又会落到 `parent.shared`。因此排查属性来源时，应同时查看对象本身与原型链，而不是只看最终读到的值。

### `[[Prototype]]` 与函数的 `.prototype` 是两件事

函数也是对象，所以函数对象也有自己的内部 `[[Prototype]]`。此外，大多数可构造的普通函数还有一个名为 `prototype` 的普通属性：

```js
function User(name) {
  this.name = name;
}

console.log(typeof User.prototype); // object
```

能被 `new` 调用并创建实例的函数称为**构造函数（constructor）**。当 `User` 被 `new` 调用时，`User.prototype` 用来成为新实例的原型：

```js
const ada = new User('Ada');
console.log(Object.getPrototypeOf(ada) === User.prototype); // true
```

所以应区分：

- `Object.getPrototypeOf(ada)`：实例在属性查找时委托给谁。
- `User.prototype`：函数对象上一个用于构造实例的属性。
- `Object.getPrototypeOf(User)`：函数对象 `User` 自己的原型。

它们有联系，但不是同一个槽位。箭头函数没有供 `new` 使用的 `prototype` 属性，也不能当作构造函数。

### 方法先按原型查找，再按调用形式决定 `this`

方法只是值为函数的属性。下面的 `describe` 可以位于原型上：

```js
const userMethods = {
  describe() {
    return this.name;
  },
};

const user = Object.create(userMethods);
user.name = 'Ada';

console.log(user.describe()); // Ada
```

运行 `user.describe()` 时先沿原型找到函数 `describe`，再以 `user` 作为本次调用的**接收者（receiver）**。因此函数里的 `this` 是 `user`，不是保存方法的 `userMethods`。

这说明“方法从哪里找到”与“调用时 `this` 是谁”是两个步骤；后一个步骤形成**调用接收者绑定（this binding）**。把函数从对象上取出来会保留同一个函数值，却不保留点号左边的接收者：

接收者不只影响普通方法，也影响原型上的 getter 和 setter。下面的 getter 定义在 `userMethods` 上，但读取 `user.label` 时，getter 内的 `this` 仍是最初发起读取的 `user`：

```js
Object.defineProperty(userMethods, 'label', {
  get() {
    return `用户：${this.name}`;
  },
});

console.log(user.label); // 用户：Ada
```

这也是 `Reflect.get(target, key, receiver)` 和 `Reflect.set(target, key, value, receiver)` 提供 `receiver` 参数的原因：代理或转发层若擅自把接收者换成目标对象，原型访问器里的 `this` 就会改变，透明转发也随之失真。

```js
'use strict';

const describe = user.describe;
describe(); // this 是 undefined，读取 this.name 会抛错
```

函数没有把 `user` 永久记在自己身上。`this` 也不是由函数写在什么对象里决定；对普通函数来说，主要由这一次如何调用决定。

### 六种常见调用形式

本节会比较普通调用在严格与非严格代码中的差异；需要时就近打开 [PREJS-05 严格模式](../chinese-guides/javascript-strict-mode.md#prejs-05)。理解箭头函数的外层 `this` 时若卡住，再回看 [JS-01 的词法环境](../chinese-guides/js-01-execution-context-scope-closure.md#js-01)。这些是对应小节的补充，不是整篇讲义的重复硬前置。

#### 1. 普通调用

在严格模式下，`fn()` 中的 `this` 是 `undefined`。非严格旧脚本可能把它替换成全局对象，这种差异容易隐藏错误，现代模块代码应按严格模式理解。

#### 2. 方法调用

`receiver.fn()` 中，`this` 通常是点号或方括号左侧的 `receiver`。即使函数是沿原型找到的，接收者仍是本次表达式中的对象。

#### 3. `call` 与 `apply`

它们立即调用函数，并显式提供 `this`：

```js
function greet(greeting, punctuation) {
  return `${greeting}，${this.name}${punctuation}`;
}

greet.call({ name: 'Lin' }, '你好', '!');
greet.apply({ name: 'Lin' }, ['你好', '!']);
```

两者主要差在后续参数的提供形式。

#### 4. `bind`

`bind` 不立即执行原函数，而是返回一个新的绑定函数：

```js
const boundGreet = greet.bind({ name: 'Lin' }, '你好');
console.log(boundGreet('!'));
```

绑定函数还具有被 `new` 调用、`length`、`name` 等规范行为。下面这种教学实现只说明普通调用和参数拼接，不是完整替代品：

若绑定函数被 `new` 调用，构造调用创建的新实例会成为 `this`，`bind` 时提供的 `thisArg` 会被忽略；预设参数仍会排在构造参数之前。也就是说，显式绑定能固定普通调用的接收者，却不能把构造实例替换成绑定对象。判断优先级时应先识别“是否由 `new` 构造”，再讨论普通调用中的绑定。

```js
function simpleBind(fn, thisArg, ...preset) {
  return (...later) => Reflect.apply(fn, thisArg, [...preset, ...later]);
}
```

#### 5. 构造调用

`new Fn()` 会创建一个新对象，并让构造函数执行时的 `this` 指向它。构造返回规则将在下一节完整解释。

#### 6. 箭头函数

箭头函数没有自己的 `this`。它在词法环境中读取外层的 `this`，`call`、`apply`、`bind` 不能为它建立另一个 `this`：

```js
const group = {
  name: 'team',
  members: ['Ada', 'Lin'],
  labels() {
    return this.members.map(member => `${this.name}:${member}`);
  },
};
```

`map` 的箭头回调使用 `labels` 这次方法调用的 `this`。如果把 `labels` 本身写成箭头属性，它就不会获得 `group` 作为自己的 `this`。

### 回调为什么容易丢失 `this`

把 `user.describe` 传给另一个系统时，传递的是函数值：

```js
button.addEventListener('click', user.describe);
```

以后如何调用它，由事件系统决定。浏览器 `addEventListener` 对普通监听函数会使用事件的 `currentTarget` 作为 `this`；某些工具函数会以 `undefined` 调用，另一些库有自己的约定。无论哪种，都不能假设原来的 `user.` 会跟着函数值一起传走。

如果方法必须使用 `user`，可以在登记前绑定并保存同一个绑定函数，以便以后撤销：

```js
const handleClick = user.describe.bind(user);
button.addEventListener('click', handleClick);
button.removeEventListener('click', handleClick);
```

也可以用显式适配器 `event => user.describe(event)`。选择哪种方式取决于是否需要参数适配、撤销和测试替换。

### `new` 的可观察过程

把 `new Constructor(...args)` 作为一个整体理解更安全。为了学习对象模型，可以观察到四个关键步骤：

1. 创建一个新对象。
2. 如果 `Constructor.prototype` 是对象，就把它作为新对象的原型；否则使用 `Object.prototype`。
3. 以新对象作为 `this` 调用构造函数。
4. 构造函数显式返回对象或函数时，最终结果改用该返回值；返回原始值或没有返回时，使用步骤 1 的新对象。

```js
function User(name) {
  this.name = name;
}

User.prototype.greet = function greet() {
  return `你好，${this.name}`;
};

const ada = new User('Ada');
console.log(ada.greet());
```

构造返回覆盖常被漏掉：

```js
function Override() {
  this.kind = 'instance';
  return { kind: 'override' };
}

console.log(new Override().kind); // override
```

教学版 `simpleNew` 可以帮助观察这些步骤：

```js
function simpleNew(Constructor, ...args) {
  const prototype =
    typeof Constructor.prototype === 'object' && Constructor.prototype !== null
      ? Constructor.prototype
      : Object.prototype;
  const instance = Object.create(prototype);
  const returned = Reflect.apply(Constructor, instance, args);
  const returnedObject = returned !== null
    && (typeof returned === 'object' || typeof returned === 'function');
  return returnedObject ? returned : instance;
}
```

它用于理解普通可构造函数的可观察结果，不模拟 class 构造器、Proxy 构造陷阱、内建构造器和所有规范内部槽。

### `class` 没有消灭原型

类语法让构造器、实例方法、继承和私有字段更集中：

```js
class User {
  constructor(name) {
    this.name = name;
  }

  greet() {
    return `你好，${this.name}`;
  }
}
```

`User.prototype.greet` 仍然存在，实例仍沿原型链找到方法。类不只是把构造函数换个拼写：类体按严格模式运行，类不能不带 `new` 直接调用，派生类在 `super()` 前不能使用 `this`，私有字段也有独立规则。

理解原型以后，才能判断 class 的共享方法来自哪里；理解 `this` 以后，才能解释把类方法直接作为回调为何仍会丢失接收者。

### 继承与组合的边界

原型委托适合表达稳定的“是一种”关系和共享行为。例如不同用户实例共享 `User.prototype.greet`，不必为每个实例复制一份函数。

当行为需要频繁替换、同时组合多个能力，或继承层级开始依赖祖先内部细节时，组合通常更清晰：把需要的能力作为普通对象或函数传入，而不是继续加深原型链。组合不是永远优于继承；判断标准是所有权、替换性和依赖方向是否清楚。

### 常见误解

- **“对象的方法属于对象，所以 `this` 永远是那个对象。”** 方法是函数值；普通函数的 `this` 由本次调用形式决定。
- **“`obj.__proto__` 就是 `Fn.prototype`。”** 前者是历史访问器，后者是函数对象上的普通属性；应使用标准反射 API 区分关系。
- **“从原型找到方法后，`this` 是原型。”** `child.method()` 的接收者是 `child`。
- **“箭头函数可以解决所有 `this` 问题。”** 箭头没有自己的 `this`，用于需要动态接收者的方法反而会失效。
- **“教学版 bind/new 等同原生实现。”** 它们只展示部分可观察规则，不能替代完整规范行为。

### 学完后应能说明

1. 对 `child → parent → Object.prototype → null` 的链，逐步说明一个属性在哪里命中。
2. 区分实例的 `[[Prototype]]`、构造函数的 `.prototype` 和函数对象自己的原型。
3. 对普通调用、方法调用、`call`、`bind`、`new` 与箭头函数分别判断 `this`。
4. 解释构造函数显式返回对象时，为什么新建实例会被替换。
5. 说明一个真实设计中为何选择原型共享、class 或组合，而不是只凭语法长短。

接下来学习 [JS-03 类型、相等、拷贝与不可变更新](../chinese-guides/js-03-types-equality-copy-immutability.md#js-03)时，会继续使用这里的对象身份和属性模型。
