# PRECS-03 主线程、消息与内存所有权

## PRECS-03

这份短文只建立使用 Web Worker 前需要的运行图景：浏览器为什么有主线程，两个执行环境为什么要传消息，以及“复制”和“转移”为什么会改变内存所有权。

### 学习前先确认

- 直接前置：[PREJS-07 Promise、异步函数与取消信号](../chinese-guides/javascript-promises-and-cancellation.md#prejs-07)。
- 直接前置：[PRECS-02 JavaScript 集合、键与成员关系](../chinese-guides/javascript-collections-keys-membership.md#precs-02)。消息示例会使用数组和普通对象。

### 主线程负责什么

页面中的 JavaScript、DOM 事件处理、样式计算、布局和绘制需要协调。我们通常把承担这条交互关键路径的执行线程称为**主线程（main thread）**。如果一段 JavaScript 长时间占住主线程，点击和绘制只能等待，即使最终计算结果完全正确，页面也会显得卡顿。

“主线程”不等于浏览器进程中只有一个线程。网络、图像解码、合成等工作可能由浏览器的其他部分完成；关键边界是普通页面脚本不能随意在多个线程同时读写同一棵 DOM。

### Worker 是另一个执行环境

**Web Worker** 提供独立的全局环境，可以执行 JavaScript，但不能直接访问页面的 `window` 和 DOM。页面与 Worker 通过 `postMessage` 发送消息，通过 `message` 事件接收消息。

本页和 CS-03 讨论的默认是服务于一张页面的专用 Web Worker。Service Worker 主要拦截网络请求并支撑离线、推送等生命周期，不是页面随手调用的计算线程；Worklet 则运行在音频、渲染等受约束的专用管线。三者都可能在主线程之外执行代码，却不能互换使用。

```js
// 页面
worker.postMessage({ type: 'calculate', values: [2, 4, 6] });

// Worker
self.addEventListener('message', (event) => {
  const { values } = event.data;
  self.postMessage({ type: 'result', total: values.reduce((a, b) => a + b, 0) });
});
```

消息不是一次跨线程函数调用。发送方不能立刻拿到返回值，也不能假定来自不同发送源的消息具有全局顺序；双方需要用类型、任务编号和状态约定来理解彼此。同一消息端口会保持发送顺序，但结果仍可能因任务耗时不同而晚到，因此提交结果时要核对任务编号，而不是只相信“最后收到的就是最新的”。

### 结构化克隆会得到另一份值

大多数消息数据通过**结构化克隆（structured clone）**复制。接收方得到内容相应的新值，而不是与发送方共享同一个普通对象。它能处理循环引用、Map、Set、Date 和许多内置类型，但函数、DOM 节点等不能按普通数据克隆。

复制使两个环境可以独立修改数据，却也可能增加 CPU 时间和峰值内存。消息很大或频率很高时，不能只测 Worker 内部的计算，还要把消息成本算进去。

### 可转移对象交出所有权

某些底层资源可以作为**可转移对象（Transferable object）**交给另一个执行环境。转移 `ArrayBuffer` 时通常不复制其中的字节，而是把访问权移交给接收方；发送方原来的 buffer 会变成分离状态。

```js
const buffer = new ArrayBuffer(1024);
worker.postMessage({ type: 'consume', buffer }, [buffer]);

console.log(buffer.byteLength); // 0，发送方不再拥有这块数据
```

这里最重要的概念是**所有权（ownership）**：此刻谁可以使用这份资源，何时交出，结果是否需要再转回来。转移可能减少复制，却不是无条件优化；如果发送方还要继续读取原数据，协议就必须重新设计。

### 内存不能只看最终大小

处理过程可能同时存在原始数据、克隆副本、中间数组、消息队列和渲染结果，因此真正危险的常常是**峰值内存（peak memory）**，而不是任务结束后的大小。取消、失败或页面离开时，还要解除事件监听、清空队列并释放不再需要的引用。

### 接下来去哪里

- 要完整学习何时使用 Worker、怎样分块、背压、取消并控制内存，请进入 [CS-03 前端大数据、Worker、增量计算与内存边界](../chinese-guides/cs-03-large-data-workers-incremental-memory.md#cs-03)。
- 若“回调稍后执行”和 Promise 仍不熟悉，可分别阅读 [PREJS-04 定时器与稍后执行的回调](../chinese-guides/javascript-scheduled-callbacks.md#prejs-04)与 [PREJS-07 Promise 与取消信号](../chinese-guides/javascript-promises-and-cancellation.md#prejs-07)。

