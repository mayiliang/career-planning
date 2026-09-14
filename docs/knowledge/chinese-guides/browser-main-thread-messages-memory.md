# PRECS-03 主线程、消息与内存所有权

## PRECS-03

页面需要处理一份大文件时，常会听到“放进 Worker 就不卡了”。先不要急着搬代码。理解下面三件事更有帮助：计算原来占用了谁，数据怎样交给另一个环境，以及交出去后自己还能不能继续使用。

### 学习前先确认

- 直接前置：[PREJS-07 Promise、异步函数与取消信号](../chinese-guides/javascript-promises-and-cancellation.md#prejs-07)。
- 直接前置：[PRECS-02 JavaScript 集合、键与成员关系](../chinese-guides/javascript-collections-keys-membership.md#precs-02)。消息通常使用普通对象、数组或数值数据。

### 主线程忙的时候页面在等什么

**主线程（main thread）**承担普通页面脚本执行、事件处理以及渲染流程中的重要工作。如果脚本连续进行大量计算，点击对应的 JavaScript 处理和页面更新就可能等待，用户感觉是“按钮按了没反应”。

浏览器内部不止一个线程，网络、合成等工作也可能由其他部分完成。因此页面脚本忙时，不代表整个浏览器里每件事都停止了。这里真正关心的是：界面需要主线程参与，而这条执行路径有没有被长计算占住。

把计算写进 `async` 函数，不会自动把它送到另一个线程；`await` 后面继续运行的代码，也仍属于原来的执行环境。怎样让主线程获得其他执行机会，会在主讲义中展开。

### Worker 有自己的环境

**Web Worker** 可以独立执行 JavaScript，但不能直接访问页面 DOM，也没有页面的 `window` 对象。可以让它统计数据、构建索引，再把结果交给主线程显示。

把一次求和写成双方的分工，关系是这样的：

| 主线程 | 交接内容 | Worker |
| --- | --- | --- |
| 发出任务 | `{ jobId: 1, values: [2, 4, 6] }` | 接收并求和 |
| 等待消息，同时可以处理其他工作 | | 计算得到 12 |
| 接收结果并更新界面 | `{ jobId: 1, total: 12 }` | 发回结果 |

这不是一个写成 `const result = worker.calculate()` 就能立即返回结果的普通函数调用。双方使用 `postMessage` 发消息，通过 `message` 事件接收；编号帮助接收方知道结果属于哪次任务。创建、接收、失败处理与清理都齐全的代码，放在 [CS-03 的完整 Worker 示例](../chinese-guides/cs-03-large-data-workers-incremental-memory.md#用一条完整消息理解-worker) 中。

本篇默认说专用 Worker。Service Worker 主要参与网络代理、离线等事件，Worklet 参与特定音频或渲染流程；名字相近，职责和生命周期却不同。

### 复制之后两边各有一份

普通对象通常通过**结构化克隆（structured clone）**发送。先在同一环境里使用 `structuredClone` 看清“副本”是什么：

```js example=precs03-clone
const source = { values: [2, 4, 6] };
const copy = structuredClone(source);
copy.values[0] = 99;
console.log(source.values.join(',')); // => 2,4,6
console.log(copy.values.join(',')); // => 99,4,6
```

修改副本的数组，没有改到原数组。普通对象消息也会建立这种独立关系，并不是两个线程直接拿着同一个普通对象随意修改。克隆支持许多内置数据类型和循环引用，但不能把任意函数或 DOM 节点都当作普通数据发送。

独立副本更容易理解，但复制本身也需要时间和内存。输入很大时，两边同时保存一份的成本不能忽略。

### 转移之后原来的一方不能照常读取

有些底层资源可以转移。**所有权（ownership）**在这里表示当前谁可以使用这份资源。对 ArrayBuffer 的转移会使发送方原 buffer 分离；它不是复制一份后双方都照常使用。

```js example=precs03-transfer
const source = new Uint8Array([2, 4, 6]);
const received = structuredClone(source, { transfer: [source.buffer] });
console.log(source.byteLength); // => 0
console.log(received.join(',')); // => 2,4,6
```

这里仍使用 `structuredClone` 单独展示转移效果。在 Worker 中，可以把 `source.buffer` 放进 `postMessage` 的转移清单。接收方需要的数据也要出现在消息本身；清单只是声明哪些资源转移，不是另一份自动送达的数据正文。

TypedArray 如 `Uint8Array` 是查看底层字节的视图，转移的是它的 buffer。若另一个视图也使用同一 buffer，它同样会受到分离影响。主线程还要使用原数据时，应先明确保留副本、转移临时批次，还是让 Worker 持有原数据并按需返回结果。

共享内存又是另一种模式：使用 SharedArrayBuffer 时，两个环境可以共享底层字节，需要额外处理同步。不要把普通克隆、转移、共享混成一种“传引用”。

### 结束时还要看谁在持有数据

假设输入数据 8 MB，普通复制到 Worker 后两边各持有一份，仅数据区就可能同时占 16 MB；再加上中间结果和消息队列，处理过程中的内存峰值会高于最终结果大小。

页面离开后，如果缓存、监听回调或等待队列还引用旧数据，它们不会因为“用户看不见了”就自动消失。正常结束、失败和取消都需要明确谁负责解除这些引用。停止接收结果，也不等于 Worker 中的计算已经停止。

### 接下来去哪里

[CS-03 大数据、Worker、增量计算与内存边界](../chinese-guides/cs-03-large-data-workers-incremental-memory.md#cs-03)会用完整示例说明：什么时候先少算一点，什么时候分块或使用 Worker，以及怎样限制队列、拒绝旧结果并清理数据。

### 参考与延伸阅读

- [MDN：使用 Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)——创建、消息与执行环境。
- [MDN：可转移对象](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects)——转移和分离如何改变资源的使用权。
