# JavaScript 基础台阶：对象与属性

## PREJS-03 对象、属性与方法

### 学习前先确认

- 直接前置：[PREJS-02 函数、参数、返回值与回调](../chinese-guides/javascript-functions-and-callbacks.md#prejs-02)。变量基础由它继续向下链接。

对象把一组以属性名索引的数据放在一起。下面的 `user` 有一个数据属性 `name` 和一个值为函数的属性 `greet`：

```js
const user = {
  name: 'Ada',
  greet(name) {
    return `你好，${name}`;
  },
};

console.log(user.name);
console.log(user['name']);
console.log(user.greet(user.name));
```

点号和方括号都能读取属性。属性名在运行时才确定，或属性名不是合适的标识符时，使用方括号。属性值是函数时，我们通常称它为**方法（method）**；方法仍是普通的函数值，“方法”主要描述它在对象中的使用方式。

对象是按身份区分的可变值。两个内容看起来一样的对象也不是同一个对象：

```js
const first = { n: 1 };
const second = { n: 1 };
const alias = first;

console.log(first === second); // false
console.log(first === alias);  // true
alias.n = 2;
console.log(first.n);          // 2
```

`alias` 与 `first` 指向同一个对象，所以经由任意一个名字修改属性，另一处都能观察到。JS-03 会以此为起点解释浅拷贝、结构共享和不可变更新。

这也补全了 `const` 的边界：`const first` 禁止把 `first` 重新赋成另一个值，却没有冻结它找到的对象，因此 `alias.n = 2` 合法。若业务需要对象不可变，必须采用额外的更新纪律或冻结策略，不能只看声明用了 `const`。

读取一个对象没有的属性时，JavaScript 还可能沿原型继续查找；这不是本页需要预先掌握的内容，由 JS-02 从零展开。现在只要能读写自有属性、调用方法，并理解对象可能被多个变量共同引用即可。

“没有这个属性”和“属性存在但值是 `undefined`”也不同：

```js
const settings = { theme: undefined };

console.log(settings.theme);                     // undefined
console.log(settings.missing);                   // undefined
console.log(Object.hasOwn(settings, 'theme'));   // true
console.log(Object.hasOwn(settings, 'missing')); // false
```

当缺失本身具有业务含义时，不能只用读取结果判断。删除属性用 `delete settings.theme`，它与把属性赋为 `undefined` 也不是同一操作。对象结构、序列化结果和 `Object.keys` 都可能因此不同。

把方法取出来只是取得函数值，并不会把原对象永久粘在函数上：`const greet = user.greet; greet()` 的调用形式已经改变。JS-02 会据此解释 `this`，这里先记住“属性查找到函数”与“随后怎样调用函数”是两个步骤。

继续阅读：

- 如果函数值还不熟悉，先看[函数、参数、返回值与回调](../chinese-guides/javascript-functions-and-callbacks.md#prejs-02)。
- 原型查找和方法调用时的 `this`： [JS-02 原型、对象模型与 this](../chinese-guides/js-02-prototype-object-model-this.md#js-02)。
- 对象身份、相等与复制： [JS-03 类型、相等、拷贝与不可变更新](../chinese-guides/js-03-types-equality-copy-immutability.md#js-03)。

