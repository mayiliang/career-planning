# JavaScript 基础台阶：属性描述符

## PREJS-08 属性描述符与对象不变量

### 学习前先确认

- 直接前置：[JS-03 类型、相等、拷贝与不可变更新](../chinese-guides/js-03-types-equality-copy-immutability.md#js-03)。对象、函数和变量基础由它继续向下链接。

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

`writable: false` 表示不能通过普通赋值改变值；`configurable: false` 表示不能删除该属性，也不能任意重定义它的规则。不可配置的数据属性仍可把 `writable` 从 `true` 收紧为 `false`，却不能再放宽回 `true`；其余允许的重定义还受当前描述符约束。访问器属性则用 `get`、`set` 描述读取和写入行为，不同时拥有 `value`、`writable`。因此“不配置”不是含糊的“什么都不能做”，而是一组语言明确规定的单向约束。

这些限制构成对象的**不变量（invariant）**。Proxy 可以拦截属性操作，却不能向调用者报告与目标对象不可配置事实相冲突的结果。例如，目标上一个不可配置且不可写的数据属性值为 `42`，代理的 `get` 陷阱不能声称它是 `7`。

学习 JS-07 前不需要记住所有描述符组合。只要会用 `Object.getOwnPropertyDescriptor` 查看规则，并理解“代理能拦截操作，但不能伪造目标已经锁死的事实”即可。

通过普通赋值创建属性时，`writable`、`enumerable`、`configurable` 通常都为 `true`；通过 `Object.defineProperty` 新建属性却会把没有写出的布尔字段默认为 `false`。因此下面的属性默认不可写、不可枚举、不可配置，这个差异很容易被忽略：

```js
Object.defineProperty(target, 'hidden', { value: 1 });
console.log(Object.keys(target).includes('hidden')); // false
```

`enumerable` 影响 `Object.keys`、对象展开等常见枚举路径，但不决定属性能否直接读取。访问器的 getter 还可能在读取时执行代码，所以“取属性”不一定只是拿一个槽位。描述符把这些可观察规则集中表达，也解释了 Proxy 陷阱为何必须尊重目标的固定事实。

继续阅读：

- 对象、属性和方法的基础： [对象、属性与方法](../chinese-guides/javascript-objects-properties-methods.md#prejs-03)。
- Proxy、Reflect 与迭代协议： [JS-07](../chinese-guides/js-07-iteration-metaprogramming-resources.md#js-07)。
