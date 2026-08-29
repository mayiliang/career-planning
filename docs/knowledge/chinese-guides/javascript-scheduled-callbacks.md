# JavaScript 基础台阶：稍后执行的回调

## PREJS-04 定时器、事件与稍后执行的回调

### 学习前先确认

- 直接前置：[PREJS-02 函数、参数、返回值与回调](../chinese-guides/javascript-functions-and-callbacks.md#prejs-02)。变量基础由它继续向下链接。

有些 API 接收一个函数，却不会立刻调用它。`setTimeout` 会登记**定时器（timer）**；达到最短等待时间后，回调才有机会进入后续任务：

```js
console.log('登记前');
setTimeout(() => console.log('定时回调'), 0);
console.log('登记后');
// 登记前、登记后、定时回调
```

`0` 不表示“当前这一行立即运行”，只表示没有额外的主动等待要求。当前同步代码仍会先执行完。完整的任务、微任务与渲染顺序属于 JS-04；在 JS-01 中，只需要知道循环结束后回调才读取它捕获的变量。

**事件监听器（event listener）**也是“登记后再调用”：

```js
function handleClick() {
  console.log('clicked');
}

button.addEventListener('click', handleClick);
button.removeEventListener('click', handleClick);
```

撤销监听时必须提供同一个事件类型和同一个函数对象。重新写一个内容相同的箭头函数，会得到另一个函数对象，无法撤销原监听。

定时器通常用 `clearTimeout(timerId)` 撤销；订阅库会返回 `unsubscribe`；观察器可能提供 `disconnect`。名字不同，生命周期都可概括为“登记—使用—撤销”。只丢掉本地变量，不等于已经撤销外部系统保存的回调。

定时器给出的是最短等待，不是精确执行时刻。主线程正忙、标签页进入后台或浏览器进行节能限制时，回调会更晚。需要固定节拍时，也不能假设每次回调都恰好间隔相同毫秒；应根据真实时间计算进度，并接受调度抖动。

事件监听还要保存准确的登记条件。`removeEventListener` 的移除匹配看事件类型、同一个函数对象和 `capture` 值；`once`、`passive` 会改变监听行为，却不参与这次移除匹配。工程上常把“登记”和“清理”写在相邻位置，或让登记函数返回清理函数，这比依赖记忆在另一个生命周期钩子中重写参数更可靠。支持 `signal` 的事件监听还可以把清理归到一个 `AbortController`，让一组监听共享明确的生命周期。

继续阅读：

- 回调函数本身： [函数、参数、返回值与回调](../chinese-guides/javascript-functions-and-callbacks.md#prejs-02)。
- 回调捕获变量和清理后何时可能回收： [JS-01](../chinese-guides/js-01-execution-context-scope-closure.md#js-01)。
- 完整浏览器调度模型： [JS-04 异步、Promise 与浏览器事件循环](../chinese-guides/js-04-async-promise-browser-event-loop.md#js-04)。
