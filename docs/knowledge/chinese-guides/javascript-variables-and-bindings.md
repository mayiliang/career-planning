# JavaScript 基础台阶：变量与绑定

## PREJS-01 变量、绑定、声明与赋值

### 学习前先确认

无需其他站内前置资料。只要能辨认数字、字符串和一行 JavaScript 代码，就可以从这里开始。

程序运行时需要把名字和数据联系起来。这个联系叫做**绑定（binding）**。在下面的代码里，`price` 是名字，`20` 是当前与它关联的值：

```js
let price = 20;
price = 25;
```

第一行同时做了声明和初始化：运行环境建立 `price` 这个绑定，并给它初始值 `20`。第二行是赋值：绑定仍是原来的绑定，只是它现在关联 `25`。区分“绑定”和“值”很重要：后续读取这个名字时，得到的是绑定当时关联的值，而不是第一次赋进去的值。函数怎样在稍后继续读取外层绑定，会由 JS-01 单独解释。

`let` 与 `const` 都以代码块为作用域。`let` 允许绑定以后关联另一个值，`const` 要求声明时就初始化，并禁止再次给这个绑定赋值：

```js
let quantity = 2;
quantity = 3;        // 可以：quantity 是 let 绑定

const taxRate = 0.1;
// taxRate = 0.2;    // 不可以：不能重新给 const 绑定赋值
```

`const` 约束的是绑定，不是在此处引入一套“所有值都不可变”的规则。等学到对象后，PREJS-03 会解释为什么 `const` 对象的属性仍可能变化；在当前阶段只需把 `const` 理解为“这个名字不能重新赋值”。

`var` 的作用域是当前函数，而不是当前代码块；它还有声明提升等历史行为。现代代码通常优先使用 `const`，确实需要重新赋值时使用 `let`。学习旧代码和循环闭包时仍需理解 `var`，但不必把它当作默认选择。

同一对花括号经常形成一个代码块，例如 `if`、`for` 和单独的 `{ ... }`。块内的 `let`、`const` 绑定在块外不可见：

```js
{
  const message = '只在这个块中可见';
  console.log(message);
}
// console.log(message); // ReferenceError
```

声明在源码中出现，并不表示绑定从函数第一行起就已经可以读取。`let`、`const` 从进入作用域到执行声明之前处于**暂时性死区（temporal dead zone）**，读取会抛出 `ReferenceError`：

```js
{
  // console.log(count); // ReferenceError
  const count = 1;
  console.log(count);
}
```

这不是“变量不存在”和“值是 `undefined`”的同一情况。绑定已经属于这个作用域，只是还没有完成初始化。区分声明、初始化、读取和重新赋值，能避免把提升规则背成一句含糊的“声明都被搬到顶部”。

命名也应表达一项稳定责任。`total` 从数字变成对象虽然语法允许，却会使后续读者难以推断；能保持同一种含义时优先保持。变量模型解决的是名字怎样关联值，良好命名解决的是人怎样可靠理解这条关联。

继续阅读：

- 准备理解函数调用时，转到[函数、参数与返回值](../chinese-guides/javascript-functions-and-callbacks.md#prejs-02)。
- 准备理解对象身份时，转到[对象、属性与方法](../chinese-guides/javascript-objects-properties-methods.md#prejs-03)。
- 变量为何会按源码嵌套位置被找到，由 [JS-01 执行上下文、作用域与闭包](../chinese-guides/js-01-execution-context-scope-closure.md#js-01)继续讲解。

