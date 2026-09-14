# JavaScript 基础台阶：异常与清理

## PREJS-06 异常、try/catch 与 finally

### 学习前先确认

- 直接前置：[PREJS-02 函数、参数、返回值与回调](../chinese-guides/javascript-functions-and-callbacks.md#prejs-02)。变量基础由它继续向下链接。

**异常（exception）**表示当前过程无法正常继续。代码可以用 `throw` 报告异常，运行时会向外寻找最近能处理它的 `catch`：

```js
try {
  throw new Error('读取失败');
} catch (error) {
  console.error(error.message);
}
```

无论 `try` 正常完成、提前 `return`，还是抛出异常，离开这段结构时都会先经过 **finally**。它适合关闭当前操作取得的资源。下面用内存对象模拟资源，观察使用和关闭的顺序；页面或进程被直接终止时，则不能依赖 JavaScript 一定有机会完成清理。

```js
const resource = {
  read() { return '第一行'; },
  close() { console.log('已关闭'); },
};
try {
  console.log(resource.read()); // 第一行
} finally {
  resource.close(); // 已关闭
}
```

`finally` 不是“忽略错误”。如果没有 `catch`，原异常会在清理后继续向外传播。也不要在 `finally` 里随意 `return` 或再抛出无关错误，否则可能覆盖原来的返回值或异常。

一个资源可能从正常结束、主动取消和异常等多个出口走向清理，所以 `close()` 常要设计为幂等：重复调用不会重复释放、重复计费或破坏状态。

`try/catch` 只能处理在它负责的执行过程中抛出的异常。定时器回调稍后执行，登记定时器的那段 `try` 可能早就结束了。需要在回调内处理它自己的同步错误，或把失败传回一个 Promise，让调用方等待并处理。

```js
setTimeout(() => {
  try {
    throw new Error('稍后发生');
  } catch (error) {
    console.log(error.message); // 稍后发生
  }
}, 0);
```

异步操作需要通过 Promise rejection、回调错误参数或事件等自己的通道传播失败，再在对应异步边界处理。`try/catch` 能捕获在其中被 `await` 的 Promise 拒绝，因为异步函数会在同一逻辑流程恢复；它捕获不了已经启动但没有返回或 `await` 的“脱离链条”Promise。错误处理的位置也要有责任：能恢复时采取降级或重试，不能恢复时补充上下文后继续向上传递；空 `catch` 会让系统看起来继续运行，却失去根因。

```js
async function readProfile() {
  try {
    await Promise.reject(new Error('读取失败'));
  } catch (error) {
    console.log(error.message); // 读取失败
  }
}
readProfile();

// 只启动 Promise 却不 return/await，外层 try 就无法负责它稍后的拒绝。
```

清理代码本身也可能失败。若 `useResource` 与 `close` 都抛错，最终可见错误可能遮住最初失败。成熟实现会让清理尽量可靠，并在必须保留两份信息时使用 `cause`、聚合错误或结构化日志，而不是随意用新异常覆盖旧异常。

继续阅读：

- 生成器如何借助 `finally` 响应消费者的提前结束： [JS-07](../chinese-guides/js-07-iteration-metaprogramming-resources.md#js-07)。
- Promise 链里的异常传播与 `finally`： [JS-05 Promise 错误处理与异步控制流](../chinese-guides/js-05-promise-errors-async-control-flow.md#js-05)。
