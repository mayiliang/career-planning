# JavaScript 基础台阶：属性描述符

## PREJS-08 属性描述符与对象不变量

普通赋值创建的属性不只有一个值，还带有一组**属性描述符（property descriptor）**规则。数据属性常见的描述字段包括 `value`、`writable`、`enumerable` 和 `configurable`：

```js
const target = {};
Object.defineProperty(target, 'id', {
  value: 42,
  writable: false,
  enumerable: true,
  configurable: false,
});

console.log(Object.getOwnPropertyDescriptor(target, 'id'));
```

`writable: false` 表示不能通过普通赋值改变值；`configurable: false` 表示不能删除该属性，也不能任意重定义它的规则。访问器属性则用 `get`、`set` 描述读取和写入行为，不同时拥有 `value`、`writable`。

这些限制构成对象的**不变量（invariant）**。Proxy 可以拦截属性操作，却不能向调用者报告与目标对象不可配置事实相冲突的结果。例如，目标上一个不可配置且不可写的数据属性值为 `42`，代理的 `get` 陷阱不能声称它是 `7`。

学习 JS-07 前不需要记住所有描述符组合。只要会用 `Object.getOwnPropertyDescriptor` 查看规则，并理解“代理能拦截操作，但不能伪造目标已经锁死的事实”即可。

继续阅读：

- 对象、属性和方法的基础： [对象、属性与方法](../chinese-guides/javascript-objects-properties-methods.md#prejs-03)。
- Proxy、Reflect 与迭代协议： [JS-07](../chinese-guides/js-07-iteration-metaprogramming-resources.md#js-07)。
