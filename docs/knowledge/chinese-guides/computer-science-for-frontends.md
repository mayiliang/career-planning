# 前端计算机基础：规模、正确性与数据边界

这份讲义不把竞赛模板当作前端工程能力。我们关心三件事：输入变大后成本怎样增长，程序为什么始终正确，数据在主线程、Worker 和服务端之间移动时要付出什么代价。

## CS-01

### 复杂度、数据规模与工程成本

#### 1. 先定义问题，再写 Big-O

**时间复杂度（time complexity）**描述输入规模改变时基本操作次数的增长趋势。**空间复杂度（space complexity）**描述额外内存的增长趋势。分析前必须写清：

- `n` 是记录数、字符数、图节点数，还是网络页数；
- 基本操作是比较、Map 查找、DOM 查询，还是序列化字节；
- 结论是**最坏情况（worst case）**、**平均情况（average case）**还是**摊还分析（amortized analysis，摊销后的分析）**。

例如，数组 `push` 偶尔需要扩容并复制原数组，单次可能是 O(n)；但扩容不是每次发生，一串连续 `push` 的单次平均成本可以用摊还 O(1) 表述。这不是说“每一次都必然 O(1)”。

#### 2. 相同 Big-O 不等于相同体验

Big-O 会忽略常数和低阶项。两个 O(n) 实现仍可能差很多：

```js
// 版本 A：单次遍历，比较原始数值
function sumPositiveA(values) {
  let total = 0;
  for (const value of values) if (value > 0) total += value;
  return total;
}

// 版本 B：仍是 O(n)，但频繁创建字符串和对象
function sumPositiveB(values) {
  return values
    .map((value) => ({ value, label: String(value) }))
    .filter((item) => item.value > 0)
    .reduce((sum, item) => sum + item.value, 0);
}
```

版本 B 的额外分配会增加常数、峰值内存和**垃圾回收（garbage collection, GC）**压力；跨 Worker 复制对象图还会增加序列化成本。因此算法推导与真机测量必须并存。

#### 3. 前端的四层成本

1. **算法成本**：比较、遍历、排序、图搜索的操作次数。
2. **内存成本**：数据本体、中间数组、索引、缓存和跨线程复制。
3. **主线程预算（main-thread budget，主线程预算）**：60Hz 下一帧约 16.7ms，但这不是“JavaScript 可以占满 16.7ms”；样式、布局、绘制也需要时间。
4. **系统边界成本**：Worker 消息、网络延迟、服务端权限、数据一致性和失败恢复。

常见决策顺序是：先减少不必要工作，再改善算法，然后考虑分块或 Worker，最后才是否把计算移到服务端。Worker 只移出主线程，不会让总计算量消失；服务端聚合也不会让网络与授权成本消失。

#### 4. 怎样设计可信的基准

**基准测试（benchmark，性能基准）**不是执行一次 `performance.now()` 相减。挑战的可复现协议是：

- 用固定随机种子生成 1k / 10k / 100k 的排序数组；
- 先执行 30 次预热，但不把预热样本混入结果；
- 每个规模测 10 次，保留原始样本，不只保留平均值；
- 报告中位数、p95（第 95 百分位）、峰值堆内存、超过 16ms 的帧数；
- 同时保存 Performance 录制的调用栈与分配证据。

```js
function percentile(sortedSamples, ratio) {
  if (sortedSamples.length === 0) return NaN;
  const index = Math.ceil(sortedSamples.length * ratio) - 1;
  return sortedSamples[Math.max(0, index)];
}

function summarize(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    medianMs: percentile(sorted, 0.5),
    p95Ms: percentile(sorted, 0.95),
    over16ms: samples.filter((value) => value > 16).length,
  };
}
```

CSV 至少包含 `implementation,size,run,durationMs,heapBytes,over16ms` 列。如果 100k 时 p95 从 18ms 跳到 820ms，且火焰图中 `find` 执行 100000 次，优先把“循环内线性查找导致 O(n²)”作为候选根因，然后用 Map 索引变体做对照；不要只凭直觉宣布根因。

#### 5. 挑战前自检

- 能分别写出线性扫描与嵌套扫描的基本操作次数；
- 能说明最坏、平均和摊还三种结论的前提；
- 能解释为什么同为 O(n) 的实现可能有不同 p95 和峰值内存；
- 在 1m 复测时会重新报告曲线、内存和帧预算，而不是外推 100k 结论。

## CS-02

### 常用数据结构、算法模式与正确性

#### 1. 数据结构是对操作模式的选择

| 结构 | 适合的问题 | 主要边界 |
| --- | --- | --- |
| 数组（Array） | 连续遍历、按下标访问、小规模排序 | 中间插入/删除要移动元素；反复线性查找会退化 |
| 栈（stack） | 最后进先出的撤销、遍历待办 | 深递归可能溢出，可改显式栈 |
| 队列（queue） | 先进先出的 BFS、任务调度 | 用 `shift()` 可能反复移动，可用头指针 |
| Map | 任意类型键的身份查找、计数、索引 | 对象键按引用身份比较；不会自动 JSON 序列化 |
| Set | 去重、成员检查、已访问集合 | 对象仍按引用身份判断 |
| 堆（heap） | 动态 Top-K、优先队列 | 只保证堆顶极值，不保证整体有序 |
| 树（tree）/Trie（字典树） | 层级、前缀查找 | 不平衡树会退化；Trie 用内存换前缀速度 |
| 图（graph） | 依赖、关系、路径 | 必须处理环、重复边和不连通部分 |

Map 和 Set 的规范只保证平均访问时间对元素数是次线性（sublinear，低于线性），并没有强制浏览器一定用哈希表。键/值的唯一性基于 SameValueZero：`NaN` 与 `NaN` 视为相同，`0` 与 `-0` 视为相同，两个内容相同但不是同一引用的对象视为不同。

#### 2. 算法模式不是无条件套用

- **二分查找（binary search）**要求存在单调性或已排序区间，实现时先定义闭区间 `[left,right]` 还是左闭右开 `[left,right)`。
- **双指针（two pointers）**依赖指针移动后可排除一部分候选；无序数据不能盲目使用。
- **滑动窗口（sliding window）**适合连续区间，前提是窗口移动时能增量更新状态。
- **DFS（depth-first search，深度优先搜索）**与 **BFS（breadth-first search，广度优先搜索）**都需要已访问集；BFS 才能在无权图中给出边数最少路径。
- **贪心（greedy）**需要证明局部最优能导向全局最优；**动态规划（dynamic programming）**需要可复用的子问题和明确状态转移。
- **拓扑排序（topological sort，拓扑排序）**只适用于 DAG（directed acyclic graph，有向无环图）。

#### 3. 正确性来自不变量、终止性和反例

**不变量（invariant，不变条件）**是算法运行到某个指定位置时必须成立的事实。拓扑排序中最重要的三条是：

1. `indegree.get(node)` 始终等于尚未移除的入边数；
2. 队列中只有当前入度为 0 且尚未输出的节点；
3. 每条去重后的边只会使终点入度减 1 一次。

```js
export function topoSort(edges) {
  const nodes = new Set();
  const outgoing = new Map();
  const indegree = new Map();
  const seenEdges = new Set();

  for (const [from, to] of edges) {
    nodes.add(from);
    nodes.add(to);
    const edgeKey = `${from}\u0000${to}`;
    if (seenEdges.has(edgeKey)) continue;
    seenEdges.add(edgeKey);
    if (!outgoing.has(from)) outgoing.set(from, []);
    outgoing.get(from).push(to);
    indegree.set(to, (indegree.get(to) ?? 0) + 1);
  }
  for (const node of nodes) indegree.set(node, indegree.get(node) ?? 0);

  const queue = [...nodes].filter((node) => indegree.get(node) === 0);
  let head = 0;
  const order = [];

  while (head < queue.length) {
    const node = queue[head++];
    order.push(node);
    for (const next of outgoing.get(node) ?? []) {
      const rest = indegree.get(next) - 1;
      indegree.set(next, rest);
      if (rest === 0) queue.push(next);
    }
  }

  const remaining = [...nodes].filter((node) => indegree.get(node) > 0);
  return remaining.length === 0
    ? { ok: true, order }
    : { ok: false, order, cycleNodes: remaining };
}
```

对依赖 `A→C,B→C,C→D` 加重复边 `A→C`，重复边必须先去重，不能把 C 入度计为 3。输出可能是 `A,B,C,D` 或 `B,A,C,D`，正确性不依赖唯一顺序，而是依赖每条边的起点都在终点之前。如果把 `C→D` 改为 `C→A`，算法应返回环错误及未输出节点，而不是无限重试。

#### 4. 动态 Top-2 的边界

事件 `[a:3,b:9,a:4,c:2]` 的含义先要固定。这里定义为“同 ID 分数累加”，所以最终是 `a:7,b:9,c:2`，Top-2 为 `b:9,a:7`。K 固定为 2 时，每次从 Map 的小集合重排容易审查；当 K 远小于数据规模且更新频繁时，才考虑大小为 K 的最小堆。不能因为题目出现“Top-K”就无条件使用堆。

```js
export function dynamicTopK(events, k) {
  const totals = new Map();
  for (const { id, score } of events) {
    totals.set(id, (totals.get(id) ?? 0) + score);
  }
  return [...totals]
    .sort(([idA, a], [idB, b]) => b - a || idA.localeCompare(idB))
    .slice(0, k)
    .map(([id, score]) => ({ id, score }));
}
```

测试必须包括空输入、重复边、重复 ID、同分稳定规则、环和极深图。**属性测试（property-based testing，基于性质的测试）**可以随机生成 DAG，验证输出中每条边 `from` 的位置都早于 `to`；它不是“随机跑几次没报错”。

## CS-03

### 前端大数据、Worker、增量计算与内存边界

#### 1. 第一步不是上 Worker，而是少做工作

处理 100k 或 1m 记录时，按这个顺序检查：

1. 这些数据是否真的需要下载到客户端，服务端能否在权限边界内筛选和聚合；
2. UI 是否只需要可见窗口，可否使用虚拟化而不渲染全部 DOM；
3. 能否用稳定索引和增量更新避免每次输入都全量排序/格式化；
4. 结果能否分块提交，中间数组是否可立即释放；
5. 剩下的 CPU 密集工作才考虑 Worker。

**增量计算（incremental computation）**是只根据变化部分更新结果，例如只更新改动 ID 的累计分数。**虚拟化（virtualization）**是只渲染视窗附近的项，它减少 DOM 与渲染工作，但不会自动减少上游的全量计算。

#### 2. Worker 的边界是消息，不是共享 DOM

**Web Worker（Web 工作线程）**运行在与 `window` 不同的全局上下文，不能直接读写 DOM。主线程与专用 Worker 通过 `postMessage` 与 `message` 交换数据。默认数据通过**结构化克隆（structured clone）**复制，这意味着：

- 两边不是同一个对象实例；
- 大对象图会带来复制、序列化和峰值内存成本；
- 方法、DOM 节点与某些宿主对象不能直接克隆；
- Worker 完成 CPU 工作后，主线程仍需合并结果与更新 UI。

**可转移对象（Transferable object）**把所有权从一个上下文移到另一个上下文。`ArrayBuffer` 转移后，发送方的 buffer 会被**分离（detached，脱离底层内存）**，`byteLength` 变成 0。TypedArray 视图本身可序列化但不是可转移对象，要放入 transfer list 的是其 `.buffer`。

```js
const scores = new Float64Array(100_000);

// 克隆：两边各有一份可用内存
worker.postMessage({ type: "score", payload: scores });

// 转移：底层 buffer 移给 Worker，主线程不再拥有
worker.postMessage(
  { type: "score", payload: scores },
  [scores.buffer],
);
console.assert(scores.byteLength === 0);
```

如果主线程后面还要使用原 buffer，就不能盲目转移；应先重新设计所有权。“Transferable 一定比 clone 快”也要在目标设备与真实消息大小上测量，不能只根据 API 名称判断。

#### 3. 批次、背压、取消和版本组成 Worker 协议

**背压（backpressure，反压）**是消费者速度跟不上生产者时，让上游暂停或降速，防止队列和内存无界增长。Streams API 的队列策略与 `desiredSize` 能表达背压；普通 Worker 消息也可以用 ACK/信用额协议实现。

```ts
type ToWorker =
  | { version: 1; type: "start"; jobId: string; total: number; batchSize: 500 }
  | { version: 1; type: "batch"; jobId: string; seq: number; records: RecordItem[] }
  | { version: 1; type: "cancel"; jobId: string };

type FromWorker =
  | { version: 1; type: "ready"; jobId: string; credits: number }
  | { version: 1; type: "ack"; jobId: string; seq: number; credits: number }
  | { version: 1; type: "partial"; jobId: string; seq: number; top10: Result[] }
  | { version: 1; type: "done"; jobId: string; top10: Result[] }
  | { version: 1; type: "cancelled"; jobId: string }
  | { version: 1; type: "error"; jobId: string; message: string };
```

协议的不变量：

1. 主线程只在 `credits > 0` 时发新批次，每发一批减 1；
2. Worker 处理完一批才通过 `ack` 归还信用额；
3. 每个批次有单调增加的 `seq`，重复或过期消息不得重复合并；
4. 收到 `cancel` 后立即标记任务取消，完成当前最小原子步骤后停止，不再发 `partial`/`done`；
5. 组件卸载时发取消，移除侦听并在超时后 `worker.terminate()`；
6. 过期 `jobId` 的任何结果都不能写入当前 UI。

“在第 20 批取消”的验收不只检查最终没有 `done`，还要检查取消后消息数不再增长、没有新结果写入、队列与缓存可释放。

#### 4. 内存边界与测量表

缓存必须同时声明键、最大容量、淘汰策略、失效条件与命中率。**LRU（least recently used，最近最少使用）**是一种容量淘汰策略，不是“永远不会泄漏”的保证。当日志显示“每批 clone 80MB、队列积压 2400、取消后仍收 6 批、堆持续增长”时，分别验证：

- 传输方式：消息中是否每次携带整个原始数组，能否改成小批次或明确所有权的 ArrayBuffer 转移；
- 背压阈值：生产者是否无条件 `postMessage`，ACK 信用额是否真正阻止发送；
- 缓存释放：取消、成功、失败时是否都删除批次、中间 Top-K、侦听器与 job Map。

主线程、structured clone Worker、Transferable Worker 和服务端模拟必须使用同一数据生成器与正确性断言，并记录：

| 方案 | 总吞吐 | INP/长任务 | 峰值堆 | 消息/请求数 | 取消延迟 | 结果摘要 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| 主线程 |  |  |  | 0 |  |  |
| Worker clone |  |  |  |  |  |  |
| Worker transfer |  |  |  |  |  |  |
| 服务端模拟 |  |  |  |  |  |  |

四方案的 Top-10 必须一致。数据量从 100k 变为 1m 时，不能只说“Worker 慢了”；要重测取消延迟、峰值内存、队列长度和所有权转移，并给出分页、降采样、服务端聚合或拒绝执行的明确降级决策。
