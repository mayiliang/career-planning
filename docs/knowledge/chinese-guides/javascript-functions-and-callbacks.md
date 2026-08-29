# JavaScript 基础台阶：函数与回调

## PREJS-02 函数、参数、返回值与回调

### 学习前先确认

- 直接前置：[PREJS-01 变量、绑定、声明与赋值](../chinese-guides/javascript-variables-and-bindings.md#prejs-01)。

函数把一段可重复执行的过程包装成值。定义函数不会立刻执行函数体；只有发生调用时，函数体才会运行。

```js
function add(left, right) {
  const total = left + right;
  return total;
}

const result = add(2, 3); // 5
```

调用 `add(2, 3)` 时，`left`、`right` 获得这一次调用的参数值。函数执行到 `return` 后结束，并把结果交回调用处。没有显式 `return` 的函数会返回 `undefined`。下一次调用会建立另一组参数和局部变量，不会自动与上一次共用。

JavaScript 的函数也是值，所以可以把函数放进变量、作为参数传给另一个函数，也可以从函数中返回：

```js
function runTwice(action) {
  action();
  action();
}

runTwice(() => console.log('运行'));
```

这里的 `action` 是**回调函数（callback）**：调用时机由接收它的代码决定。“回调”不等于“异步”。`runTwice` 会在当前调用中同步执行回调；定时器、事件系统和网络 API 才可能把回调留到以后执行。

函数声明、函数表达式和箭头函数都能产生函数值，但箭头函数没有自己的 `this`、`arguments`，也不能通过 `new` 构造实例。只因为箭头更短就到处替换普通函数，会改变行为。

参数是本次调用新建立的局部绑定。给参数重新赋值，只改变函数内部这个参数绑定，不会回头改变调用处的变量绑定：

```js
let outside = 10;

function addOne(value) {
  value = value + 1;
  return value;
}

const result = addOne(outside);
console.log(result);  // 11
console.log(outside); // 10
```

对象作为参数时还会出现“两个绑定共同找到同一个对象”的情况；那需要先理解对象身份，由 PREJS-03 接着说明。这里不要把“参数接收值”误背成“函数总会自动复制一份完整数据”。

回调还应有明确合同：会被调用几次、以什么参数调用、是否读取返回值、错误怎样报告。上面的 `runTwice` 明确调用两次且忽略返回值；另一些调用方可能只调用一次并使用结果。只知道“这里传一个函数”还不够，读懂调用方的合同才能正确实现回调。

继续阅读：

- 如果“声明、赋值、局部变量”仍不熟悉，先看[变量、绑定、声明与赋值](../chinese-guides/javascript-variables-and-bindings.md#prejs-01)。
- 回调何时晚一点运行，见[定时器、事件与稍后执行的回调](../chinese-guides/javascript-scheduled-callbacks.md#prejs-04)。
- 函数为何能记住创建处的变量，由 [JS-01](../chinese-guides/js-01-execution-context-scope-closure.md#js-01)解释；函数被当作对象方法调用时的 `this`，由 [JS-02](../chinese-guides/js-02-prototype-object-model-this.md#js-02)解释。

