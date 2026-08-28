# JavaScript 基础台阶：对象与属性

## PREJS-03 对象、属性与方法

对象把一组以属性名索引的数据放在一起。下面的 `user` 有一个数据属性 `name` 和一个值为函数的属性 `greet`：

```js
const user = {
  name: 'Ada',
  greet() {
    return `你好，${this.name}`;
  },
};

console.log(user.name);
console.log(user['name']);
console.log(user.greet());
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

读取一个对象没有的属性时，JavaScript 还可能沿原型继续查找；这不是本页需要预先掌握的内容，由 JS-02 从零展开。现在只要能读写自有属性、调用方法，并理解对象可能被多个变量共同引用即可。

继续阅读：

- 如果函数值还不熟悉，先看[函数、参数、返回值与回调](../chinese-guides/javascript-functions-and-callbacks.md#prejs-02)。
- 原型查找和方法调用时的 `this`： [JS-02 原型、对象模型与 this](../chinese-guides/js-02-prototype-object-model-this.md#js-02)。
- 对象身份、相等与复制： [JS-03 类型、相等、拷贝与不可变更新](../chinese-guides/js-03-types-equality-copy-immutability.md#js-03)。

