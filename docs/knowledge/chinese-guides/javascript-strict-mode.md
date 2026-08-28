# JavaScript 基础台阶：严格模式

## PREJS-05 严格模式

**严格模式（strict mode）**让 JavaScript 对一部分容易掩盖错误的旧行为采取更明确的规则。脚本可以用字符串指令开启严格模式：

```js
'use strict';
```

ES Module 和 `class` 的代码天然按严格模式执行，不需要再写这条指令。

严格模式与 JS-02 最直接的关系是普通函数调用的 `this`。在严格模式里，`fn()` 不会把 `this` 自动替换成全局对象，而是保留为 `undefined`。这样，脱离对象的方法调用会更早暴露错误：

```js
'use strict';

function showThis() {
  return this;
}

console.log(showThis()); // undefined
```

严格模式还会拒绝给未声明名字赋值、删除不可删除属性等行为。它不是性能开关，也不会把动态类型的 JavaScript 变成静态类型语言。

继续阅读：

- 普通调用、方法调用、`call`、`bind` 和 `new` 如何决定 `this`： [JS-02](../chinese-guides/js-02-prototype-object-model-this.md#js-02)。
