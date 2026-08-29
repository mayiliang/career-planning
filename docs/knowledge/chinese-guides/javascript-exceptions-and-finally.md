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

**最终清理块（finally）**中的代码无论 `try` 正常完成、提前 `return`，还是抛出异常，通常都会在离开这段结构前执行。因此它适合释放由这段过程取得的资源：

```js
const resource = openResource();
try {
  useResource(resource);
} finally {
  resource.close();
}
```

`finally` 不是“忽略错误”。如果没有 `catch`，原异常会在清理后继续向外传播。也不要在 `finally` 里随意 `return` 或再抛出无关错误，否则可能覆盖原来的返回值或异常。

一个资源可能从正常结束、主动取消和异常等多个出口走向清理，所以 `close()` 常要设计为幂等：重复调用不会重复释放、重复计费或破坏状态。

`try/catch` 只能捕获在它的动态执行范围内抛出的异常。稍后由 timer 调用的回调已经离开原来的 `try`，外层不能这样捕获：

```js
try {
  setTimeout(() => {
    throw new Error('稍后发生');
  }, 0);
} catch {
  // 不会运行
}
```

异步操作需要通过 Promise rejection、回调错误参数或事件等自己的通道传播失败，再在对应异步边界处理。`try/catch` 能捕获在其中被 `await` 的 Promise 拒绝，因为异步函数会在同一逻辑流程恢复；它捕获不了已经启动但没有返回或 `await` 的“脱离链条”Promise。错误处理的位置也要有责任：能恢复时采取降级或重试，不能恢复时补充上下文后继续向上传递；空 `catch` 会让系统看起来继续运行，却失去根因。

```js
try {
  await loadProfile(); // 拒绝会进入 catch
} catch (error) {
  report(error);
}

// 只写 loadProfile(); 而不 return/await，外层 try 无法负责它稍后的拒绝。
```

清理代码本身也可能失败。若 `useResource` 与 `close` 都抛错，最终可见错误可能遮住最初失败。成熟实现会让清理尽量可靠，并在必须保留两份信息时使用 `cause`、聚合错误或结构化日志，而不是随意用新异常覆盖旧异常。

继续阅读：

- 生成器如何借助 `finally` 响应消费者的提前结束： [JS-07](../chinese-guides/js-07-iteration-metaprogramming-resources.md#js-07)。
- Promise 链里的异常传播与 `finally`： [JS-05 Promise 错误处理与异步控制流](../chinese-guides/js-05-promise-errors-async-control-flow.md#js-05)。
