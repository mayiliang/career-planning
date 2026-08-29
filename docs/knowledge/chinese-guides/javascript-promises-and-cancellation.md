# JavaScript 基础台阶：Promise 与取消信号

## PREJS-07 Promise、异步函数与取消信号

### 学习前先确认

- 直接前置：[PREJS-04 定时器、事件与稍后执行的回调](../chinese-guides/javascript-scheduled-callbacks.md#prejs-04)。函数与变量基础由它继续向下链接。

**异步结果对象（Promise）**表示一个现在可能还没有、以后会成功或失败的结果。它不是底层操作本身，也不是操作的控制器：拿到 Promise 只说明可以观察结果，不代表能暂停、重试或取消产生结果的工作。`await` 会暂停当前异步函数，等 Promise 有结果后再继续这个函数；它不会阻塞整个浏览器线程。

```js
async function loadUser(id) {
  const response = await fetch(`/users/${id}`);
  return response.json();
}
```

Promise 只有 pending、fulfilled、rejected 三种状态，没有内置的“cancelled”状态。许多浏览器 API 使用**取消信号（cancellation signal）**协作取消，并通过 **AbortSignal** 表达它：调用者触发信号，被调用者必须实际读取这个信号，工作才可能停止。

```js
const controller = new AbortController();
const pending = fetch('/users/1', { signal: controller.signal });
controller.abort();

try {
  await pending;
} catch (error) {
  if (error.name !== 'AbortError') throw error;
}
```

取消信号不是资源清理的替代品。收到取消后，代码仍可能需要关闭游标、移除监听器或让生成器执行 `finally`。同样，消费者停止读取一个异步序列，并不会神奇地终止所有已发出的网络请求；生产者和消费者必须约定如何传递取消。

异步操作通常在调用 `fetch` 之类的 API 时就已经开始，不会等到 `.then` 或 `await` 才启动：

```js
const first = fetch('/first');
const second = fetch('/second');

// 两个请求已经发起；下面只是等待它们的结果。
const responses = await Promise.all([first, second]);
```

`Promise.all` 只组合结果：其中一个 Promise 拒绝时，它返回的 Promise 会尽快拒绝，但其他已启动请求不会因此自动取消。若失败后必须停止同组工作，需要把同一个取消信号传给这些操作，并明确决定何时触发。

`.then`、`.catch` 和 `.finally` 都会返回新的 Promise，因此调用链要么返回、要么被 `await`。只在函数内部创建链却不返回，会让调用者误以为工作已经完成，也可能让 rejection 失去处理入口。

`abort()` 表达的是意图，支持信号的操作决定何时观察它。取消可能发生在请求发出前、传输中或结果已经到达后，所以调用方仍应防止过期结果提交。多次调用 `abort()` 应被当作同一状态通知，而不是依赖它重复执行清理副作用。

继续阅读：

- 完整的 Promise 错误传播、组合与业务重试： [JS-05](../chinese-guides/js-05-promise-errors-async-control-flow.md#js-05)。
- 异步迭代如何接收取消并清理资源： [JS-07](../chinese-guides/js-07-iteration-metaprogramming-resources.md#js-07)。
