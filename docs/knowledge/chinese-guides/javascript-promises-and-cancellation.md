# JavaScript 基础台阶：Promise 与 await

## PREJS-07 Promise 与 await 入门

### 学习前先确认

- 直接前置：[PREJS-04 定时器、事件与稍后执行的回调](../chinese-guides/javascript-scheduled-callbacks.md#prejs-04)。先能区分调用一个函数和把函数交给别人稍后调用。

### 拿到的是结果的凭据

点击“读取姓名”时，函数可能立即返回，但姓名还没有准备好。**Promise** 表示这项工作最终会给出的结果；拿到它不等于已经拿到姓名。它可以处于等待中（pending）、成功兑现（fulfilled）或失败拒绝（rejected），成功或失败一旦确定便不会再改变。

先用已经准备好的值练习等待，不连接网络，也不需要先理解事件循环。以下代码可整体粘贴到现代浏览器 Console，预期输出写在 `// =>` 后。

```js example=prejs07-value
async function showUser() {
  const result = Promise.resolve({ name: '小林' });
  const user = await result;
  console.log(user.name); // => 小林
  return user.name;
}
const finished = showUser();
console.log(await finished); // => 小林
```

输入是包含 name 的对象。`Promise.resolve` 把它作为可等待的结果；`await result` 取出对象，下一行才能读取 `user.name`。`showUser()` 返回的仍是 Promise，所以外面也能等待整个函数结束。不要直接写 `result.name`：result 是结果凭据，姓名在它兑现的值里。

### 暂停函数不等于暂停页面

`async` 声明异步函数，`await` 暂停这个函数的后半段。调用者仍能继续执行自己的代码。下面让结果由我们手动交付，这样不必猜网络会花多少毫秒。

```js example=prejs07-wait
let deliver;
const result = new Promise((resolve) => { deliver = resolve; });
const events = [];
async function show() {
  events.push('开始等待');
  const name = await result;
  events.push(`收到${name}`);
}
const finished = show();
events.push('调用者继续');
deliver('小林');
await finished;
console.log(events.join(' → ')); // => 开始等待 → 调用者继续 → 收到小林
```

`new Promise` 的函数参数收到一个 resolve 函数。我们把它存到 deliver，稍后用 `deliver('小林')` 交付结果。这是学习用的可控输入；普通业务中，通常由请求 API 创建 Promise，不必给每个已有 Promise 再包一层。

推演时先找到 `show()`：它执行到 await 暂停，所以“调用者继续”先记录。deliver 交付后，show 的后半段才继续；最后等待 finished，确保记录齐了再打印。至于后半段怎样进入微任务队列，下一篇会展开。

### 失败也需要一个接收位置

失败不会变成一个普通的返回值：等待被拒绝的 Promise 时，await 位置表现为抛错。这里的 `try` 包住要尝试的工作，`catch` 接住失败，示例只显示原因。

```js example=prejs07-failure
async function readName() {
  try {
    const name = await Promise.reject(new Error('姓名暂不可用'));
    console.log(name);
  } catch (error) {
    console.log(error.message); // => 姓名暂不可用
  }
}
await readName();
```

把 reject 改为 resolve 后，正常路径会打印姓名，catch 不运行。此处让 readName 正常结束只是为了演示接收失败；真实保存操作不能在失败后仍告诉调用者“已保存”。何时恢复、何时继续抛出，由 JS-05 解释。

### 下一步学习什么

先用自己的话回答：函数返回时工作结束了吗？await 得到的是 Promise 还是它的值？失败由哪一行接住？可以交换 deliver 与 show 的调用顺序，再观察“调用者继续”和“收到小林”的位置，去 [JS-04](../chinese-guides/js-04-async-promise-browser-event-loop.md#js-04) 解释原因。

本文只建立等待结果的最小模型。Promise 没有内置的取消状态；取消底层工作需要操作方配合。浏览器常用 **AbortSignal** 传递**取消信号（cancellation signal）**，本文先认识名称，完整协议详见 [JS-05 的可取消等待](../chinese-guides/js-05-promise-errors-async-control-flow.md#可取消的等待需要处理开始前和结束后的情况)。这条延伸链接不是读本文之前的门槛。旧入口的文件名含 cancellation，保留它是为了让已有链接与阅读记录继续有效。

参考：[MDN Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)、[MDN await](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await)。核验日期：2026-10-29，在线文档无语义版本号。
