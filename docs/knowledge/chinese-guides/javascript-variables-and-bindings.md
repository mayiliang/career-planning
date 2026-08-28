# JavaScript 基础台阶：变量与绑定

## PREJS-01 变量、绑定、声明与赋值

程序运行时需要把名字和数据联系起来。这个联系叫做**绑定（binding）**。在下面的代码里，`price` 是名字，`20` 是当前与它关联的值：

```js
let price = 20;
price = 25;
```

第一行同时做了声明和初始化：运行环境建立 `price` 这个绑定，并给它初始值 `20`。第二行是赋值：绑定仍是原来的绑定，只是它现在关联 `25`。区分“绑定”和“值”很重要，因为闭包保留的是访问绑定的能力，而不一定是创建函数那一刻的旧值。

`let` 与 `const` 都以代码块为作用域。`const` 表示这个名字不能再次指向另一个值，不表示对象内部永远不能变化：

```js
const user = { name: 'Ada' };
user.name = 'Lin';      // 可以：修改对象属性
// user = { name: 'Bo' }; // 不可以：重新给 user 赋值
```

`var` 的作用域是当前函数，而不是当前代码块；它还有声明提升等历史行为。现代代码通常优先使用 `const`，确实需要重新赋值时使用 `let`。学习旧代码和循环闭包时仍需理解 `var`，但不必把它当作默认选择。

同一对花括号经常形成一个代码块，例如 `if`、`for` 和单独的 `{ ... }`。块内的 `let`、`const` 绑定在块外不可见：

```js
{
  const message = '只在这个块中可见';
  console.log(message);
}
// console.log(message); // ReferenceError
```

继续阅读：

- 准备理解函数调用时，转到[函数、参数与返回值](../chinese-guides/javascript-functions-and-callbacks.md#prejs-02)。
- 准备理解对象身份时，转到[对象、属性与方法](../chinese-guides/javascript-objects-properties-methods.md#prejs-03)。
- 变量为何会按源码嵌套位置被找到，由 [JS-01 执行上下文、作用域与闭包](../chinese-guides/js-01-execution-context-scope-closure.md#js-01)继续讲解。

