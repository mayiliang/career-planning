# B02 数据处理与异步协作

## CS-02 常用数据结构、算法模式与正确性

你要做一个撤销按钮、一份待处理任务列表，以及“某个知识点依赖哪些前置”的查询。这三件事都可以先把数据放进数组，但它们真正需要的操作不同：撤销取最近一次，排队取最早一次，依赖查询则要沿关系往外找。

理解数据结构，先从这些操作入手。理解算法，则进一步追问：每一步排除了什么、保存了什么，为什么这样走一定能得到想要的结果。这篇会通过具体数据和中间过程，把结构、算法与正确性连起来。

### 学习前先确认

- 直接前置：[JavaScript 集合、键与成员关系](../chinese-guides/javascript-collections-keys-membership.md#precs-02)。需要知道 Array、Map 和 Set 的基本读写方式。

成本分析可随时回看 [CS-01](../chinese-guides/cs-01-complexity-scale-engineering-cost.md#cs-01)，但第一次阅读不必停下来计算每一行的复杂度。下面的 JavaScript 示例均可独立运行，`// =>` 表示输出。

### 撤销和排队为什么需要不同的顺序

**栈（stack）**是后进先出。编辑器中最后一次修改，通常应该最先撤销；用数组的 `push` 和 `pop` 就能直接表达。

```js example=cs02-stack
const history = [];
history.push('输入标题');
history.push('修改颜色');
history.push('插入图片');
console.log(history.pop()); // => 插入图片
console.log(history.pop()); // => 修改颜色
console.log(history.join(',')); // => 输入标题
```

**队列（queue）**则是先进先出。打印任务 A 先到、B 后到，通常应该先处理 A。下面保留一个头下标，读取后向前移动，不在每次取出时都移动整个数组。

```js example=cs02-queue
const queue = ['任务 A', '任务 B'];
let head = 0;
const processed = [];
while (head < queue.length) {
  const task = queue[head++];
  processed.push(task);
  if (task === '任务 A') queue.push('任务 C');
}
console.log(processed.join(' → ')); // => 任务 A → 任务 B → 任务 C
```

读完 A 时，B 已经在排队，新加入的 C 放在 B 后面。这个顺序正是之后 BFS 逐层扩展的基础。`shift()` 在小数组上很方便；频繁处理大队列时，不能忽略它可能涉及的元素搬移或属性操作成本。

头下标写法也不是免费的内存管理。已经处理过的对象仍在数组前部，可能继续被引用。一次性遍历结束后让整个数组退出使用即可；长期队列则需要按时清空已消费槽位、压缩数组或采用环形缓冲区。选择结构时，读写顺序和数据何时不再需要都要考虑。

### 数组和索引可以各自保留一种关系

数组擅长保存展示顺序，Map 擅长表达从稳定键找到数据。一份任务列表可以同时使用二者，而不是要求一个容器包办所有需求。

```js example=cs02-index
const tasks = [
  { id: 't1', title: '读讲义' },
  { id: 't2', title: '整理笔记' },
];
const byId = new Map(tasks.map((task) => [task.id, task]));
const order = ['t2', 't1'];
console.log(order.map((id) => byId.get(id).title).join(' → ')); // => 整理笔记 → 读讲义
console.log(byId.get('t1') === tasks[0]); // => true
```

这里 Map 与数组共同引用原来的任务对象，并没有自动复制一份数据。若直接修改 `byId.get('t1').title`，通过数组读取也会看到修改；若只是从 Map 删除一项，数组中的那项不会自动消失。两份容器分别存放了不同关系，也就需要明确的同步方式。

键也应对应业务身份。两次请求拿到的 `{ id: 't1' }` 是两个不同对象，直接用对象当键可能查不到；使用稳定字符串 ID 才能表达“业务上同一个任务”。对象身份的细节见 [JS-03：赋值之后谁和谁共用对象](../chinese-guides/js-03-types-equality-copy-immutability.md#赋值之后谁和谁共用对象)。

### 堆只负责把最重要的一项放到顶部

如果任务按照优先级执行，先进先出就不够了。**堆（heap）**可以维护“当前最小值或最大值在顶部”的关系，不必每次都将全部数据重新排序。这里讨论二叉堆：形状上是一棵完全二叉树，最后一层从左到右填充，前面的层都已填满；数值上满足父子之间的大小关系。形状条件让高度保持在对数级，不能只凭父子大小关系就推断调整成本。

以最小堆保存任务的截止时间，下面的形状满足每个父节点都不大于自己的孩子：

```text
        2
      /   \
     5     3
    / \
   9   7

按层存进数组：[2, 5, 3, 9, 7]
```

注意数组里的 `5` 在 `3` 前面。堆只保证顶部是最小值，并不保证整个数组有序。加入截止时间 `1` 时，先放到末尾，再与父节点比较：它比 `3` 小，交换；又比 `2` 小，再交换，最后来到顶部。沿树向上走的层数约为 log n。

取出最小值时，将末尾元素补到顶部，再沿较小的孩子向下调整，恢复父节点不大于孩子的关系。已知顶部的读取通常是 O(1)，插入与取出极值通常是 O(log n)，完整取出所有元素并不会变成 O(1)。

如果只从海量分数中找最高的 10 个，可以维护一个大小为 10 的最小堆：堆顶是“当前入选者中最低的分数”。新分数不超过堆顶，就不值得替换；超过堆顶才更新。若总共只有几十项而且很少变化，直接排序往往更容易维护。

优先级会变化时还要处理旧条目。可以维护 ID 到堆位置的索引并调整，也可以加入新版本、弹出时丢弃旧版本；后一种写法更简单，却可能积累过期数据。结构带来的速度优势，必须和一致性、内存一起考虑。

### 二分查找每一步都排除一段候选

**二分查找（binary search）**需要有序或其他单调条件。先看一个具体目标：在 `[2, 4, 4, 7]` 中，寻找第一个不小于 `4` 的位置。

返回值是一个插入边界，所以可能为 `0`，也可能等于数组长度 `n`。这里用 `left = 0`、`right = n`，每次查看 `[left, right)` 里的一个元素。

```js example=cs02-lower-bound
function lowerBound(values, target) {
  let left = 0;
  let right = values.length;
  while (left < right) {
    const middle = left + Math.floor((right - left) / 2);
    if (values[middle] < target) left = middle + 1;
    else right = middle;
  }
  return left;
}
console.log(lowerBound([2, 4, 4, 7], 4)); // => 1
console.log(lowerBound([2, 4, 4, 7], 8)); // => 4
console.log(lowerBound([], 4)); // => 0
```

把第一次调用展开，就能看到每次更新的理由：

| 当前 left / right | middle 与值 | 观察到的事实 | 下一步 |
| --- | --- | --- | --- |
| 0 / 4 | 2，值为 4 | 位置 2 已满足，但左侧可能更早满足 | right = 2 |
| 0 / 2 | 1，值为 4 | 位置 1 也满足，继续保留它作为边界 | right = 1 |
| 0 / 1 | 0，值为 2 | 位置 0 太小，更左侧也不会满足 | left = 1 |
| 1 / 1 | 不再读取元素 | 未确定的元素区间已空 | 返回 1 |

这里适合维护的**不变量（invariant）**是：`left` 左侧的元素都小于目标，`right` 及其右侧的元素都不小于目标；插入边界仍在闭区间 `[left, right]` 中。循环读取元素的区间却是左闭右开的 `[left, right)`。边界位置与可读取元素位置不是同一件事，尤其当答案为 `n` 时，不能去读取 `values[n]`。

每一步都会缩小 `right-left`，所以会结束。结束时 `left === right`，左右两侧的性质正好把第一个满足位置夹出来。这个解释同时覆盖空数组、重复值和目标比所有值都大的情况，比记住某套加一减一口诀更稳。

### 双指针为什么能一次排除多个答案

**双指针（two pointers）**的重点不是变量有两个，而是每次移动都有排除依据。比如有序数组 `[1, 3, 4, 6, 8]` 中，找两个位置不同的元素，使和为 `10`。

```js example=cs02-two-pointers
function findPair(values, target) {
  let left = 0;
  let right = values.length - 1;
  while (left < right) {
    const sum = values[left] + values[right];
    if (sum === target) return [values[left], values[right]];
    if (sum < target) left += 1;
    else right -= 1;
  }
  return null;
}
console.log(JSON.stringify(findPair([1, 3, 4, 6, 8], 10))); // => [4,6]
```

第一次 `1+8=9`，偏小。1 与当前范围内其他数相加只会更小，因此可以彻底排除左端的 1。接着 `3+8=11`，偏大；8 与范围内更靠右的大数配对不会更合适，所以排除右端的 8。然后依次检查 `3+6`、`4+6`，找到答案。

这个排除理由依赖有序。如果把同样代码直接用于乱序数组，左右移动就失去依据。是否允许先排序，还取决于需不需要保留原始位置、是否可以修改输入；不能只为了套用双指针而丢掉业务要求。

### 滑动窗口怎样保留连续区间的信息

**滑动窗口（sliding window）**适合维护连续区间，并在边界移动时更新所需信息。先考虑非负数数组：求“和不超过 5”的最长连续区间长度。

```js example=cs02-window
function longestWithin(values, limit) {
  let left = 0;
  let sum = 0;
  let best = 0;
  for (let right = 0; right < values.length; right += 1) {
    sum += values[right];
    while (left <= right && sum > limit) sum -= values[left++];
    best = Math.max(best, right - left + 1);
  }
  return best;
}
console.log(longestWithin([1, 2, 1, 3], 5)); // => 3
```

右端逐项加入时，窗口经历 `[1]`、`[1,2]`、`[1,2,1]`，最后加入 3 后总和为 7，需要收缩左侧。移走 1 还剩 6，再移走 2 才剩 4，得到 `[1,3]`。整个过程中最长的合法窗口为前三项，长度 3。

为什么只向右移动左端就够？因为数都非负：加入元素不会使总和变小，移除左端不会使总和变大。当当前左端已经导致超限时，把右端继续右移也救不了它，所以可以排除。

一旦允许负数，推理就失效了。`[6,-2]` 的总和为 4，整体符合限制；但上述算法看到第一个 6 就把它移走，后来再也无法恢复这个长度为 2 的答案。这不是边界判断少写一个等号，而是算法所依赖的条件不成立。需要换成适合负数的数据结构或算法。

### 树和图怎样表达数据之间的关系

**树（tree）**是图的一种特殊形式：在无向图的意义下连通且无环，任意两个节点之间只有一条简单路径。选定根之后，就可以表达文件夹这样的层级，除根以外每个节点都有一个父节点。一般的**图（graph）**可以表达更多关系：多个知识点共同依赖同一基础，一个模块被多个模块引用，甚至依赖形成循环。图也可以没有环；“没有环”本身并不足以说明一个有向关系就是树。

DFS 沿一条分支深入再回来，BFS 按离起点的层数向外扩展。先看 **广度优先搜索（breadth-first search）**怎样使用队列。

```js example=cs02-bfs
const graph = new Map([
  ['A', ['B', 'C']],
  ['B', ['D']],
  ['C', ['D']],
  ['D', ['A']],
]);
const distance = new Map([['A', 0]]);
const queue = ['A'];
for (let head = 0; head < queue.length; head += 1) {
  const current = queue[head];
  for (const neighbor of graph.get(current)) {
    if (distance.has(neighbor)) continue;
    distance.set(neighbor, distance.get(current) + 1);
    queue.push(neighbor);
  }
}
console.log([...distance].map(([id, steps]) => `${id}:${steps}`).join(',')); // => A:0,B:1,C:1,D:2
```

从 A 开始，先发现 B、C，把它们排到队尾，距离均为 1。处理 B 时发现 D，距离为 2；处理 C 时发现 D 已经登记，就不再入队。最后 D 指回 A，A 也已经登记，因此遍历能结束。

**在入队时就标记已发现**很重要。如果到出队时才标记，B 和 C 都可能把 D 放进队列，造成重复工作。要还原路径，可以在第一次发现邻居时再保存前驱，例如 `previous.set(neighbor, current)`，最后从终点倒着走回起点。

BFS 第一次发现节点时得到的，是无权图中最少边数的路径。若 A 到 B 要 100 分钟，A 到 C 再到 B 总共只要 2 分钟，“边更少”就不等于“时间更短”。非负权重的最短路径常用 Dijkstra，并结合优先队列；负权边会破坏它确认最短距离的前提，需要另选适合的方法。

**深度优先搜索（depth-first search）**则适合逐条探索分支或处理嵌套结构。用递归时注意深度与栈空间；层级很深可以改用显式栈。检测有向图环时，还要区分“正在当前路径上”和“已经完整处理”：遇到前者才说明绕回当前路径，遇到后者可能只是另一个分支汇入同一节点。一个 `visited` 集合足以避免重复访问，却不总能单独证明有环。

### 拓扑排序把先后依赖变成可执行顺序

如果关系是“变量基础先于函数，函数先于闭包”，需要的不是最短路，而是让每一项都在它的前置之后出现。**拓扑排序（topological sort）**就是这样的顺序，只在**有向无环图（directed acyclic graph）**中存在。

先做一个小模型。约定输入列出全部节点，边的方向是“前置 → 后续”，重复边只表示同一条关系。

```js example=cs02-topology
function learningOrder(nodes, edges) {
  const next = new Map(nodes.map((id) => [id, new Set()]));
  const degree = new Map(nodes.map((id) => [id, 0]));
  for (const [from, to] of edges) {
    if (next.get(from).has(to)) continue;
    next.get(from).add(to);
    degree.set(to, degree.get(to) + 1);
  }
  const ready = nodes.filter((id) => degree.get(id) === 0);
  const result = [];
  for (let head = 0; head < ready.length; head += 1) {
    const current = ready[head];
    result.push(current);
    for (const to of next.get(current)) {
      degree.set(to, degree.get(to) - 1);
      if (degree.get(to) === 0) ready.push(to);
    }
  }
  return result.length === nodes.length ? result : null;
}
const nodes = ['变量', '函数', '闭包'];
console.log(learningOrder(nodes, [['变量', '函数'], ['函数', '闭包']]).join(' → ')); // => 变量 → 函数 → 闭包
console.log(learningOrder(nodes, [['变量', '函数'], ['函数', '变量']])); // => null
```

`degree` 保存的入度，表示还有几个前置没被移除。开始时变量的入度为 0，可以先处理；处理完变量，函数的入度降到 0；再处理函数，闭包才变为可处理。每一步都只让前置已完成的节点进入队列。

第二个输入中，“变量”和“函数”互相等待。虽然独立的“闭包”节点可以先输出，但最后输出数量仍少于总数，于是返回 `null` 表示没有完整合法顺序。剩余未输出的节点可能在环内，也可能只是依赖环中的节点，不能把所有剩余节点都直接称为环成员。

没有唯一顺序也很正常。两个互不依赖的节点可以交换位置；正确性条件是每条依赖边的起点都早于终点。本站资料系统因此把“前置”和“相关引用”分开：前置应无环，相关知识则可以互相链接，不能把每一条链接都当作强制依赖。

### 贪心选择为什么有时成立有时失败

**贪心算法（greedy algorithm）**每次选择当前看起来最合适的一项，不再回头。它好写，但正确性需要问题本身支持。

假设要安排尽可能多、互不重叠的会议，结束时间等于下一场开始时间时允许相接：

| 会议 | 时间 |
| --- | --- |
| A | 9:00—10:00 |
| B | 9:00—12:00 |
| C | 10:00—11:00 |
| D | 11:00—12:00 |

先选最早结束的 A，可以继续选 C、D，共 3 场；先选 B 就只有 1 场。为什么“最早结束”值得相信？设一个最优方案的第一场不是 A，用 A 替换它，结束不会更晚，原先能接的后续会议仍能接，数量也不减少。于是总能找到一个以 A 开始的最优方案，再对剩下的会议重复这个理由。

这个替换过程叫交换论证。若目标改成“收入最高”，B 的收入可能远高于 A、C、D 之和，原证明就不能推出新目标的最优结果。策略适用范围取决于目标与约束，不取决于它以前通过了多少样例。

### 动态规划把重复的小问题保存下来

**动态规划（dynamic programming）**适合把一个问题拆成会重复出现的小问题，并保存已算结果。不要先想二维数组，先用一句中文说清每个状态表示什么。

面额为 `[1,3,4]`，要凑出 6。每次拿最大面额会得到 `4+1+1`，共 3 枚；实际 `3+3` 只要 2 枚。我们改为考虑最后一枚可能是什么。

定义 `dp[x]` 为“恰好凑出金额 x 所需的最少硬币数”。若最后一枚是 1，之前就需要凑出 `x-1`；最后一枚是 3，就需要 `x-3`。把所有合法选择比较一遍，再加上最后这 1 枚。

```js example=cs02-dp
function minCoins(coins, amount) {
  const dp = Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (let value = 1; value <= amount; value += 1) {
    for (const coin of coins) {
      if (coin <= value) dp[value] = Math.min(dp[value], dp[value - coin] + 1);
    }
  }
  return dp[amount] === Infinity ? null : dp[amount];
}
console.log(minCoins([1, 3, 4], 6)); // => 2
console.log(minCoins([2], 3)); // => null
console.log(minCoins([1, 3, 4], 0)); // => 0
```

本例约定面额为正整数、目标为非负整数，每种硬币可无限使用；有限枚数或负数面额是另一个问题。`Infinity` 表示暂时无法凑出，不会因为加一就变成合法答案。

| 金额 x | 一个最优拆法 | dp[x] |
| --- | --- | --- |
| 0 | 不选硬币 | 0 |
| 1 | 1 | 1 |
| 2 | 1+1 | 2 |
| 3 | 3 | 1 |
| 4 | 4 | 1 |
| 5 | 4+1 | 2 |
| 6 | 3+3 | 2 |

计算 6 时，比较的是 `dp[5]+1`、`dp[3]+1`、`dp[2]+1`，也就是 3、2、3，选择 2。按金额从小到大计算，是因为每种面额都为正，所依赖的金额一定更小，已经有结果。

为什么状态里不用保存选过的完整硬币序列？因为在这个问题里，后续能选什么只取决于剩余金额，不取决于先前拿硬币的顺序。若还需要返回具体组合，可以额外保存每个金额最后选的面额；若每种硬币数量有限，状态或更新顺序也需要反映剩余限制。这就是“状态要足够，但不要塞进无关历史”。

### 用结果性质检查理解是否完整

不变量不是只有数学证明才会用。它可以是一句非常具体的中文：“已入队的节点不会再次加入”“left 左侧全都太小”“dp[x] 比较过了所有合法的最后一枚”。这句话应同时解释初始化、每一步更新和结束时的结果。

终止也需要理由。二分的区间严格缩小，BFS 只把有限节点各入队一次，动态规划按有限金额前进。仅有“结果应当正确”的直觉，不足以排除死循环。

少量有针对性的反例通常很有帮助：二分用空数组、重复值和末尾插入；拓扑用重复边、独立节点和环；滑动窗口用一个含负数的例子攻击它的前提。若结果可能不唯一，就检查性质：排序结果有序且元素没丢，拓扑结果尊重每一条边，而不是强求某个固定字符串。

还要分清无解和无效输入。合法图含环、参数引用了根本不存在的节点、机器内存不足，是三类不同情况，不能为了让函数总返回数组就全部变成 `[]`。清晰的输入约定与错误含义，也属于算法正确性的一部分。

最后回头数一次工作量。二分每轮缩小候选区间，通常为 O(log n)；双指针和本篇窗口算法中，每个指针都只向一个方向走，合计 O(n)，不会因为出现内层 while 就变成 O(n²)。用邻接表保存图时，BFS、DFS 和拓扑排序各节点与各条边只需有限次处理，在常见集合访问成本模型下为 O(V+E)；不能把边数漏掉。找零钱示例设目标金额为 A、面额种类为 C，时间为 O(AC)，dp 数组的额外空间为 O(A)。数字金额本身可能很大，因此也不能把它理解为对金额的编码长度线性。关于输入规模的选择，可回看 [CS-01](../chinese-guides/cs-01-complexity-scale-engineering-cost.md#cs-01)。

下一篇 [CS-03](../chinese-guides/cs-03-large-data-workers-incremental-memory.md#cs-03)会把这些方法放进浏览器：数据很多时，如何少做工作，如何保持界面响应，以及怎样控制线程之间的消息与内存。

### 参考与延伸阅读

- [MIT 6.006 课程讲义](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/pages/lecture-notes/)——按主题查阅堆、搜索、图算法和动态规划的系统说明。
- [Binary Search：区间与单调条件](https://cp-algorithms.com/num_methods/binary_search.html)——进一步理解二分的循环不变量与边界表示。
- [MDN：Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)、[MDN：Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set)——核对键与成员的相等规则，避免把业务身份和对象引用混为一谈。
