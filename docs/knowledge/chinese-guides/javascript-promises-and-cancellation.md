# JavaScript 基础台阶：Promise 与取消信号

## PREJS-07 Promise、异步函数与取消信号

**异步结果对象（Promise）**表示一个现在还没有结果、以后会成功或失败的操作。`await` 会暂停当前异步函数，等 Promise 有结果后再继续这个函数；它不会阻塞整个浏览器线程。

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

继续阅读：

- 完整的 Promise 错误传播、组合与业务重试： [JS-05](../chinese-guides/javascript-language-core.md#js-05)。
- 异步迭代如何接收取消并清理资源： [JS-07](../chinese-guides/js-07-iteration-metaprogramming-resources.md#js-07)。
