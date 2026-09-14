# B02 数据处理与异步协作

## CS-03 大数据、Worker、增量计算与内存边界

假设一个订单页面有十万条记录。用户修改了一条订单的状态，页面却重新统计十万条数据；统计结束后，又一次性创建十万个列表元素。此时，即使把统计搬进 Worker，页面仍可能在显示结果时卡住。

这一篇沿着“数据进来 → 计算 → 显示 → 离开页面”的过程，区分几种经常被混用的优化手段。先判断哪部分工作可以省掉，再决定在哪里计算、怎样交接数据，以及何时结束。

### 学习前先确认

- 直接前置：[PRECS-03 主线程、消息与内存所有权](../chinese-guides/browser-main-thread-messages-memory.md#precs-03)。先分清页面、Worker 和消息各自负责什么。
- 直接前置：[CS-01 复杂度、数据规模与工程成本](../chinese-guides/cs-01-complexity-scale-engineering-cost.md#cs-01)。本篇继续区分总工作量、连续占用时间和内存成本。

示例中的小数组是为了方便核对结果，不代表这点数据就值得创建 Worker。带 `await` 的示例可在现代桌面浏览器开发者工具的 Console 中逐段运行；完整 Worker 示例也在浏览器中运行。

### 先沿着一条数据路径寻找多余工作

先把“加载列表”展开：

```text
服务端查询 → 下载响应 → JSON 解析 → 建立索引
         → 筛选与排序 → 生成显示数据 → 创建和更新 DOM
```

每个箭头都可能带来等待，每个阶段都可能创建新数据。例如页面只需要“本月已完成订单的数量”，服务端却返回全部订单明细。此时，把明细传进 Worker 再计数，仍然付出了下载、解析和存储全部明细的代价。让服务端返回所需的聚合结果，可能直接省掉后面的大部分工作。

另一个例子：界面只展示订单号和金额，却把每条订单的完整操作历史也留在页面。先缩减字段，比研究怎样更快复制这些历史更直接。反过来，离线分析工具确实需要完整数据，客户端保留数据就可能是合理要求。方案要跟使用场景一起判断。

对于必须保留的数据，再看有没有重复工作。筛选条件没变，就不必重新构建同一份搜索索引；只改了一行，不一定要重新格式化所有行。缓存可以减少重复计算，但要同时说清楚它对应哪个输入版本、何时失效、最大保留多少份。缓存一个永远不会命中的旧版本，只是在延长数据的存活时间。

### 少渲染和少计算分别解决什么

**虚拟化（virtualization）**是只为视窗附近的内容创建 DOM。例如十万条订单，当前只显示三十条，页面可以维持几十个元素，滚动后更新这批元素代表的记录。这样减少了元素数量，以及相关的布局和绘制工作。

但虚拟化不会自动减少数据计算。如果滚动一次就重新筛选十万条订单，即使 DOM 只有几十个，主线程仍可能忙于筛选。

**增量计算（incremental computation）**关注的是：已经知道旧结果后，能否只处理变化造成的差额。假设有两条待处理订单，把其中一条改成已完成，计数应从“待处理 2、已完成 0”变成“待处理 1、已完成 1”。不必重新遍历所有订单。

下面维护一份订单表和一份计数表。为了突出更新过程，只允许两种状态；输入校验和持久化属于调用方责任。

```js example=cs03-incremental
const orders = new Map();
const counts = new Map([['待处理', 0], ['已完成', 0]]);

function upsert(order) {
  const previous = orders.get(order.id);
  if (previous) {
    counts.set(previous.status, counts.get(previous.status) - 1);
  }
  // 保存副本，避免调用方随后修改同一个对象而绕过计数更新。
  orders.set(order.id, { ...order });
  counts.set(order.status, counts.get(order.status) + 1);
}

function remove(id) {
  const previous = orders.get(id);
  if (!previous) return;
  counts.set(previous.status, counts.get(previous.status) - 1);
  orders.delete(id);
}

upsert({ id: 1, status: '待处理' });
upsert({ id: 2, status: '待处理' });
console.log(counts.get('待处理'), counts.get('已完成')); // => 2 0
upsert({ id: 1, status: '已完成' });
console.log(counts.get('待处理'), counts.get('已完成')); // => 1 1
upsert({ id: 1, status: '已完成' });
console.log(counts.get('待处理'), counts.get('已完成')); // => 1 1
remove(2);
console.log(counts.get('待处理'), counts.get('已完成')); // => 0 1
```

最关键的一步是“撤销旧影响，再加入新影响”。如果只把已完成数量加一，待处理数量就会一直错误。重复收到同一条更新时，先减后加也使计数保持不变；但这还没有解决乱序消息。如果旧版本最后到达，它仍会把新状态改回去。来自网络的更新还需要版本比较，或按可靠的顺序应用。

这里应始终成立的性质是：两种状态的计数之和等于订单表的大小，每个计数都与表中实际状态一致。漏掉删除事件后，这个关系会失效。因此增量系统通常仍保留从完整数据重建计数的入口，用来初始化或恢复。理解这种“数据加索引”的关系，可以回看 [CS-02 的数组和索引](../chinese-guides/cs-02-data-structures-algorithms-correctness.md#数组和索引可以各自保留一种关系)。

### 把工作拆开让界面有机会响应

有些任务不能省掉，但不必连续做完。**分块（chunking）**把一段大工作拆成小段，在段与段之间交还执行机会。

下面只对五个数求和，并把每段处理的下标记下来。真实数组可能大得多，分段大小也需要根据每项工作量调整。

```js example=cs03-chunking
async function sumInChunks(values, chunkSize) {
  if (!Number.isInteger(chunkSize) || chunkSize < 1) {
    throw new RangeError('每段至少处理一项');
  }
  let total = 0;
  const ranges = [];
  for (let start = 0; start < values.length; start += chunkSize) {
    const end = Math.min(start + chunkSize, values.length);
    for (let i = start; i < end; i++) total += values[i];
    ranges.push(`${start}..${end - 1}`);
    if (end < values.length) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  return { total, ranges };
}

const result = await sumInChunks([1, 2, 3, 4, 5], 2);
console.log(result.total); // => 15
console.log(result.ranges.join(' / ')); // => 0..1 / 2..3 / 4..4
```

这里的 `setTimeout` 把后续步骤留到之后的任务。它提供了处理其他工作和渲染的机会，不承诺浏览器一定在两个分段之间绘制，也不承诺零毫秒后执行。总加法次数没有减少，额外调度还可能使总耗时略长，但界面不必等整段计算结束才获得机会。

把这一行改成 `await Promise.resolve()`，含义就变了：后续计算进入微任务，微任务会继续排空，不能依靠这种写法给界面留下渲染机会。原因见 [JS-04 的微任务与让出执行机会](../chinese-guides/js-04-async-promise-browser-event-loop.md#微任务执行完不等于浏览器已经绘制)。

固定每段处理一千项只是一种起点。一千次简单加法与一千次复杂文本匹配的耗时并不相同。桌面应用可以先采用保守的分段大小，再观察目标电脑上单段连续占用多久、操作是否仍有明显等待。没有必要为了这个例子引入完整调度框架。

### 用一条完整消息理解 Worker

**Web Worker** 让脚本在独立执行环境中工作。它可以处理计算，再通过消息交回结果；它不能直接修改页面 DOM。主线程负责显示结果，Worker 负责独立计算，这是一个容易理解的分工。

下面是可直接运行的完整例子。为了避免先创建两个文件，使用 Blob 临时提供 Worker 源码；项目里通常把 Worker 放在独立模块，用构建工具支持的 `new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })` 创建。

```js example=cs03-worker-roundtrip runtime=browser
const workerSource = `
  self.onmessage = ({ data }) => {
    const total = data.values.reduce((sum, value) => sum + value, 0);
    self.postMessage({ jobId: data.jobId, total });
  };
`;
const url = URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' }));
let worker;
let timer;
try {
  worker = new Worker(url);
  const response = await new Promise((resolve, reject) => {
    worker.onmessage = ({ data }) => resolve(data);
    worker.onerror = (event) => reject(new Error(event.message || 'Worker 运行失败'));
    worker.onmessageerror = () => reject(new Error('结果消息无法读取'));
    timer = setTimeout(() => reject(new Error('等待结果超时')), 5000);
    worker.postMessage({ jobId: 1, values: [2, 4, 6] });
  });
  console.log(response.jobId, response.total); // => 1 12
} finally {
  clearTimeout(timer);
  worker?.terminate();
  URL.revokeObjectURL(url);
}
```

沿着数据看一次往返：主线程创建 `{ jobId: 1, values: [2, 4, 6] }`；Worker 收到消息后求和；它发回 `{ jobId: 1, total: 12 }`；主线程收到结果并输出。`jobId` 用来辨认任务，不是线程编号。

这个例子一次只发送一个任务，收到一条结果就结束，因此可以直接给 `onmessage` 赋值。多个任务共用一个 Worker 时，需要按 `jobId` 查找各自等待的 Promise，不能每次覆盖前一个任务的处理函数。成功、业务失败、运行异常、消息解码失败和超时，都应该让等待者获得明确结果。

Blob 示例需要页面安全策略允许 `blob:` Worker。若页面限制了它，使用独立 Worker 文件，并按项目策略配置；这与求和代码是否正确是两件事。

三个数相加当然不值得这样做。Worker 更适合工作量较大、能用消息描述、无需访问 DOM 的计算，例如构建搜索索引或分析大型文本。请求主要在等网络时，使用 Worker 通常不会缩短网络等待。只有几行计算却要来回复制一个巨大对象时，交接成本还可能超过计算成本。

### 复制和转移会留下什么

普通对象消息通常通过**结构化克隆（structured clone）**交接。接收方得到独立的数据图。主线程修改原对象，不会直接改掉 Worker 收到的那份普通对象。

这意味着隔离，也意味着成本。两边都保留一份大数据时，峰值内存可能上升。具体哪些类型可以克隆，以及类实例、函数等有哪些限制，见 [B01 的 structuredClone](../chinese-guides/js-03-types-equality-copy-immutability.md#structuredclone-能解决什么不能解决什么)。

**转移（transfer）**则把可转移资源交给接收方。为了先单独观察所有权变化，下面使用 `structuredClone`，不创建 Worker；它的 transfer 选项同样能展示 ArrayBuffer 分离。

```js example=cs03-transfer
const original = new Uint8Array([10, 20, 30]);
const copied = structuredClone(original);
copied[0] = 99;
console.log(original[0], copied[0]); // => 10 99

const received = structuredClone(original, { transfer: [original.buffer] });
console.log(original.byteLength, received.byteLength); // => 0 3
console.log(received.join(',')); // => 10,20,30
```

复制后，两边都能继续使用自己的内容。转移后，接收方拿到三个字节，原视图的 `byteLength` 变为 0。不是“原数据恰好被清空了”，而是发送方已经失去对这块数据的使用权。

在 Worker 消息中，相应写法是 `worker.postMessage({ values }, [values.buffer])`：消息中的 `values` 让接收方找到数据，第二个参数列出要转移的资源。TypedArray 是视图，放进 transfer list 的是它的底层 `ArrayBuffer`。如果多个视图共用同一 buffer，转移会同时影响这些视图，不能只检查当前变量。

如果主线程还要显示原始数据，就不能把唯一副本转移后照常读取。可选做法包括：只转移临时批次；保留一份主副本；或者让 Worker 长期持有原始数据，主线程只请求摘要或某个可见区间。API 的选择应当跟数据归属一起确定。

`SharedArrayBuffer` 是另一种方式：两个环境共享底层内存，修改可能被另一方观察到。此时必须定义同步协议，通常涉及整数视图与 `Atomics`；浏览器使用还受跨源隔离等条件约束。比如“先写内容，再设置已完成标记”，若缺少正确同步，不能仅凭代码行顺序推断另一线程读到的组合。需要共享内存时应专门设计和验证协议，普通计算先采用消息交接会更容易说明白。

### 限制在途批次才能避免越排越多

假设主线程每秒能发送一百批数据，Worker 每秒只能处理二十批。即使每批只有一千条，“已经分批”仍然挡不住队列越来越长。

**背压（backpressure）**的意思是让上游知道下游的接收能力。最简单的约定是：最多允许两批尚未确认完成的数据。只有 Worker 处理完一批并返回确认，上游才继续发下一批。

| 发生的事 | 尚未完成的批次 | 是否继续发送 |
| --- | --- | --- |
| 发出第 1 批 | 1 | 可以再发一批 |
| 发出第 2 批 | 1、2 | 达到上限，暂停 |
| 收到第 1 批完成确认 | 2 | 发送第 3 批 |
| 第 2 批仍在处理 | 2、3 | 继续等待 |

这样，Worker 前面的积压有了上限。不过如果主线程提前把一百万个批次全部放进自己的数组，只是把积压换了位置。上游也应按需读取或生成批次；从网络流读取时，需要把下游的等待传回读取过程。Streams API 提供队列和背压机制，Worker 的普通消息接口则需要自己约定确认与上限。

一个容易阅读的消息可以包含：协议 `version`、任务 `jobId`、消息 `type`、批次 `sequence` 和数据。确认要说明究竟确认了什么：只是“收到”，还是“处理完、可以继续”。前者不一定释放处理能力。

任务失败时，也要结清它占用的额度并结束等待。遇到重复确认，不能重复增加额度。是否重试、是否允许乱序完成，要写进约定：纯计算可以重新计算；如果处理结果还会触发外部写入，则需要在提交处去重，不能把“没收到确认”等同于“肯定没做过”。

### 停止旧工作和拒绝旧结果需要分别处理

用户先搜索“函数”，随后改成“闭包”。第二次搜索先完成，第一次却最后返回。即使每次计算都正确，最后显示“函数”的结果仍然是错误体验。

可以在每次启动时增加任务编号，收到结果时只接受当前编号。下面用两条普通消息演示判断，刻意让旧结果晚到，不依赖真实线程速度。

```js example=cs03-current-job
let currentJobId = 2;
let visible = '';
function receive(message) {
  if (message.jobId !== currentJobId) return;
  visible = message.text;
}

receive({ jobId: 2, text: '闭包的搜索结果' });
receive({ jobId: 1, text: '函数的搜索结果' });
console.log(visible); // => 闭包的搜索结果
```

这个检查只防止过期结果显示，并没有让旧计算停止。完整的取消还包括：停止发送新批次；让进行中的任务尽快响应取消；清理监听、缓存、定时器以及等待中的 Promise。

`AbortSignal` 用来表达取消意图，不会强行打断任意 JavaScript。Worker 正在执行一个长同步循环时，`cancel` 消息必须等当前任务交还执行机会才能被处理。如果取消标记只能由这条消息修改，那么循环里再频繁地检查标记，也无法让尚未处理的消息提前生效。

解决办法之一是让 Worker 自己分段工作，在段间回到事件循环。此时取消延迟至少受到单段耗时影响。仅等待一个已兑现的 Promise 仍然可能连续排空微任务，并不能确保取消消息及时运行。

另一种办法是 `worker.terminate()`，直接停止整个 Worker。它不会替你运行 Worker 内尚未执行的 `finally`，也会影响该 Worker 上的其他任务。因此主线程必须结束相应等待、清理自己的资源；需要继续处理时再创建新 Worker。可复用 Worker 适合协作取消，独占且可丢弃的计算则更容易采用直接终止。两者的资源责任不同。

### 用数据的同时存活时间解释内存峰值

看一个数值数据集：一百万个 `Float64` 数值的数据区是八百万字节，约 8 MB，约 7.63 MiB。它不包含对象和视图本身的开销。

```js example=cs03-bytes
const values = new Float64Array(1_000_000);
console.log(values.byteLength); // => 8000000
console.log(values.byteLength / 1024 / 1024 < 8); // => true
```

如果普通克隆到 Worker，两边同时保留数据区时，仅这两份就约 16 MB。若原始数据来自 JSON，响应文本、解析后的普通数组、转换后的 TypedArray 可能还会短暂共存。最后只返回一个数字，不意味着计算过程中只占一个数字的空间。

可以用下面这张表追踪一份搜索数据，而不用急着猜每个对象的精确大小。

| 数据 | 谁持有 | 何时不再需要 |
| --- | --- | --- |
| 原始响应文本 | 解析流程 | 解析结束且无需重试时 |
| 记录表与搜索索引 | Worker | 更换数据集或销毁工作区时 |
| 在途批次 | 发送队列、消息系统 | 对应批次完成或任务结束时 |
| 当前查询结果 | 主线程 | 新结果替换或页面关闭时 |
| 可见区间的显示数据 | 视图 | 滚出复用范围或数据更新时 |

“用完了”是业务判断，“仍然被谁引用”才决定垃圾回收能否回收它。比如页面关闭后，一个全局 Map 仍保存旧 Worker 任务的回调，回调又捕获完整记录表，这份数据就仍然可达。关联关系可以画成 `全局 Map → 回调 → 记录表`。这正是 [B01 中回调的引用清理](../chinese-guides/js-01-execution-context-scope-closure.md#回调结束使用后要解除谁的引用) 在大数据场景中的表现。

堆快照中的 shallow size 只看对象自身，retained size 关注因这个对象而被保住、随它不可达才可能释放的对象总量。一个很小的回调也可能保住一大张表。应沿引用保留路径找持有者，而不是只找自身最大的对象。解除引用后，回收何时发生由引擎决定，不能用“清理后内存没有立即下降”直接判定泄漏。

### 把方案放回完整页面中判断

考虑一个本地大型文本分析工具。可以先由服务端或文件读取阶段缩减输入，再把文本分析交给专用 Worker；Worker 长期维护索引，查询只返回命中摘要；主线程只显示可见结果；换文件时终止旧任务并清空旧索引的引用。

这里只讨论专用 Worker。Shared Worker 面向多个同源页面之间的共享连接，Service Worker 主要处理网络代理、离线等事件，Worklet 则参与特定渲染或音频管线。它们的生命周期和可用接口不同，不能仅因为都在页面之外执行就互相替换。

如果使用 Worker 池，也不要把 Worker 数量直接等同于电脑核心数。浏览器、界面与其他软件也需要 CPU；每个 Worker 可能复制索引，数量翻倍还可能先把内存吃满。对桌面系统，可以从少量 Worker 开始，根据队列等待、计算吞吐和界面响应调整。需要同时处理多个任务，不等于越多线程越好。

最后，只需用几项观察检验最主要的假设：用户操作是否仍等待很久；主线程时间花在计算还是结果显示；最大在途批次数是否受控；换数据集后旧数据是否还有保留路径。若 Worker 内计算很快、主线程合并很慢，继续增加 Worker 解决不了问题。若输入本身超出客户端可承受范围，则应重新考虑分页、聚合或服务端计算。

这几种优化可以配合使用，但各自回答的问题不同：减少数据是在少搬东西；增量是在少算东西；虚拟化是在少显示东西；分块是在安排执行时机；Worker 是在安排执行位置。先找到真正昂贵的阶段，再选择对应手段。

### 参考与延伸阅读

- [MDN：使用 Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)——创建、消息往返、可用能力与终止。
- [MDN：可转移对象](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects)——转移清单、底层资源与分离行为。
- [MDN：Streams API 概念](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Concepts)——队列、消费速度与背压。
- [MDN：SharedArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer)——共享内存与浏览器安全条件。
- [MDN：Worker.terminate](https://developer.mozilla.org/en-US/docs/Web/API/Worker/terminate)——立即终止的具体边界。
