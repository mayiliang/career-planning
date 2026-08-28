# JavaScript 基础台阶：函数与回调

## PREJS-02 函数、参数、返回值与回调

函数把一段可重复执行的过程包装成值。定义函数不会立刻执行函数体；只有发生调用时，函数体才会运行。

```js
function add(left, right) {
  const total = left + right;
  return total;
}

const result = add(2, 3); // 5
```

调用 `add(2, 3)` 时，`left`、`right` 获得这一次调用的参数值。函数执行到 `return` 后结束，并把结果交回调用处。没有显式 `return` 的函数会返回 `undefined`。下一次调用会建立另一组参数和局部变量，不会自动与上一次共用。

JavaScript 的函数也是值，所以可以把函数放进变量、对象或数组，也可以把它作为参数传给另一个函数：

```js
function runTwice(action) {
  action();
  action();
}

runTwice(() => console.log('运行'));
```

这里的 `action` 是**回调函数（callback）**：调用时机由接收它的代码决定。“回调”不等于“异步”。`runTwice` 会同步调用回调；数组的 `map` 也会在当前调用过程中执行回调。定时器、事件系统和网络 API 才可能在以后调用它。

函数声明、函数表达式和箭头函数都能产生函数值，但箭头函数没有自己的 `this`、`arguments`，也不能通过 `new` 构造实例。只因为箭头更短就到处替换普通函数，会改变行为。

继续阅读：

- 如果“声明、赋值、局部变量”仍不熟悉，先看[变量、绑定、声明与赋值](../chinese-guides/javascript-variables-and-bindings.md#prejs-01)。
- 回调何时晚一点运行，见[定时器、事件与稍后执行的回调](../chinese-guides/javascript-scheduled-callbacks.md#prejs-04)。
- 函数为何能记住创建处的变量，由 [JS-01](../chinese-guides/js-01-execution-context-scope-closure.md#js-01)解释；函数被当作对象方法调用时的 `this`，由 [JS-02](../chinese-guides/js-02-prototype-object-model-this.md#js-02)解释。

