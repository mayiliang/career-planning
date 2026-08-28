# JavaScript 基础台阶：异常与清理

## PREJS-06 异常、try/catch 与 finally

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

继续阅读：

- 生成器如何借助 `finally` 响应消费者的提前结束： [JS-07](../chinese-guides/js-07-iteration-metaprogramming-resources.md#js-07)。
- Promise 链里的异常传播与 `finally`： [JS-05 Promise 错误处理与异步控制流](../chinese-guides/javascript-language-core.md#js-05)。
