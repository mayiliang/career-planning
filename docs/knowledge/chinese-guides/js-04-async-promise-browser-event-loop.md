# B02 数据处理与异步协作

## JS-04 异步、Promise 与浏览器事件循环

“先写的代码为什么后执行？”学异步时，最容易把这个问题全交给一句“事件循环”。但它实际上包含几个不同问题：哪段代码现在就在执行，哪件事还在等待，完成后谁来安排回调，以及浏览器什么时候有机会响应用户。

本篇从几行可以手动推演的代码开始。先建立执行顺序，再把它用于并发请求、界面响应和过期结果处理。这里讨论浏览器；Node.js 的具体阶段和 `process.nextTick` 不在本篇的顺序模型内。

### 学习前先确认

- 直接前置：[PREJS-07 Promise、async/await 与取消信号](../chinese-guides/javascript-promises-and-cancellation.md#prejs-07)。先认识 Promise 表示什么、怎样得到结果。
- 直接前置：[JS-01 执行上下文、作用域与闭包](../chinese-guides/js-01-execution-context-scope-closure.md#js-01)。回调仍然遵守普通函数的调用与变量查找规则。

带 `await` 的示例可在现代桌面浏览器开发者工具的 Console 中逐段运行。每段示例都定义了自己需要的变量，输出用注释标在对应位置。先预测一次，再运行核对，重点看“哪个动作安排了下一步”。

### 先区分现在调用和以后回调

看下面四个动作：记录开始；安排一个定时器；给一个已兑现的 Promise 注册回调；记录结束。这里用数组保存顺序，最后一次输出，避免日志被其他代码插入而看乱。

```js example=js04-first-order
const events = [];
const timerDone = new Promise((resolve) => {
  events.push('开始');
  setTimeout(() => {
    events.push('定时器');
    resolve();
  }, 0);
});
Promise.resolve().then(() => events.push('Promise 回调'));
events.push('结束');
await timerDone;
console.log(events.join(' → ')); // => 开始 → 结束 → Promise 回调 → 定时器
```

先看不需要事件循环知识的部分：调用 `setTimeout` 是现在发生的，但传给它的函数不是现在调用。注册 `.then` 也是现在发生的，但回调不会在 `.then` 内立刻调用。于是“开始”和“结束”先进入数组。

之后再比较两个回调：已兑现 Promise 的处理回调进入微任务队列；定时器回调属于之后的任务。当前这段同步代码交还执行机会后，微任务先获得处理，因此“Promise 回调”排在“定时器”前面。

`0` 不是“立刻执行”。它表达的是定时器的延迟请求，回调还要等待调度，浏览器也可能施加延迟限制。若当前代码持续计算两秒，定时器不能在这两秒中间闯进来打断它。

### Promise 的执行器现在就会运行

**Promise** 表示一次异步结果的最终状态，但 `new Promise` 接收的执行器函数本身是同步调用的。它不是把整段代码放到后台的开关。

```js example=js04-executor
const events = ['创建前'];
const promise = new Promise((resolve) => {
  events.push('执行器');
  resolve(7);
  events.push('resolve 之后');
});
const observed = promise.then((value) => events.push(`收到 ${value}`));
events.push('创建后');
await observed;
console.log(events.join(' → ')); // => 创建前 → 执行器 → resolve 之后 → 创建后 → 收到 7
```

`resolve(7)` 决定结果，但不会让当前函数自动返回，所以“resolve 之后”仍会执行。若需要结束执行器，还得自己 `return`。`.then` 回调随后执行，也不会回到执行器的 `resolve` 那一行插队。

例如把一段很慢的循环放在 `new Promise` 的执行器里，循环仍会立即占用主线程。把它包成 `async` 函数也不会自动变成并行计算；需要减少工作、分块或转移执行位置，见 [CS-03 的分块](../chinese-guides/cs-03-large-data-workers-incremental-memory.md#把工作拆开让界面有机会响应)。

### 状态已决定和结果已到手不是同一件事

Promise 有三种状态：pending、fulfilled 和 rejected。后两种合称 settled，状态一旦落定就不会再变化。

还有一个容易混淆的词：resolved。它描述结果的走向已经被锁定，可能锁定为一个普通值，也可能锁定为跟随另一个仍然 pending 的 Promise。因此 resolved 不一定等于 fulfilled。

```js example=js04-adoption
let finishInner;
const inner = new Promise((resolve) => { finishInner = resolve; });
const outer = new Promise((resolve, reject) => {
  resolve(inner);
  reject(new Error('这次调用不会再改变 outer 的走向'));
});

let received = false;
const observed = outer.then((value) => {
  received = true;
  return value;
});
console.log(received); // => false
finishInner('资料已准备好');
console.log(await observed); // => 资料已准备好
console.log(received); // => true
```

`outer` 已经选择跟随 `inner`，后面的 `reject` 无法再把它改成另一个结果；但只要 `inner` 还没结束，`outer` 也拿不到最终结果。像“已经决定等小李回复”和“小李已经回复”是两件事，这个区别可以帮助理解 resolved 与 settled。

这种跟随也适用于 thenable，也就是带有可调用 `then` 方法的对象。Promise 会尝试接纳它的结果，因此返回一个 Promise 并不会让正常的 Promise 链变成“还需要再手动拆一层的盒子”。thenable 的读取、调用和异常处理有专门规则，不应把任意对象的 `.then` 当成普通数据属性随意执行。

### 链上的返回值决定下一步收到什么

每次 `.then` 都返回一个新 Promise。回调正常返回一个值，新 Promise 就以该值兑现；回调抛出异常，新 Promise 就拒绝；返回另一个 Promise，则跟随它的结果。

```js example=js04-chain
const events = [];
const value = await Promise.resolve(3)
  .then((number) => number * 2)
  .then((number) => {
    events.push(`中间值 ${number}`);
    throw new Error('示例中的失败');
  })
  .catch((error) => {
    events.push(error.message);
    return 0;
  })
  .finally(() => events.push('清理'));
console.log(events.join(' → ')); // => 中间值 6 → 示例中的失败 → 清理
console.log(value); // => 0
```

这里 `catch` 返回 0，表示这条链已经用 0 恢复为成功结果。记录错误后不再抛出，并不等于“错误还会自动继续传播”。如果调用方仍应知道失败，应在处理后重新抛出，或返回被拒绝的 Promise。

另一个常见遗漏是忘记 `return`：

```js example=js04-missing-return
const first = await Promise.resolve(3).then((number) => { number * 2; });
const second = await Promise.resolve(3).then((number) => number * 2);
console.log(first); // => undefined
console.log(second); // => 6
```

带花括号的箭头函数是函数体，表达式结果不会自动成为返回值。链上没有返回值，下一步就收到 `undefined`。这属于函数规则，不是 Promise 特有的随机行为。

`finally` 通常用于无论成功失败都要执行的清理。它不会接收前一步的结果；正常结束时保留原结果。不过它若抛错或返回最终拒绝的 Promise，就会让整条链转为相应失败；它若返回 pending 的 Promise，后续也会等待。释放资源的责任可与 [B01 的资源关闭](../chinese-guides/js-07-iteration-metaprogramming-resources.md#让资源的打开和关闭待在一起) 一起理解。

### 用调用栈任务和微任务推演顺序

可以先用三部分跟踪代码：

- 调用栈：正在调用的函数。当前同步执行过程不会被同一执行环境中的定时器回调任意打断。
- **任务（task）**：例如定时器、某些用户交互和消息引发的工作。浏览器有不同任务来源，不是所有异步回调都挤在一个全局先进先出队列里。
- **微任务（microtask）**：例如 Promise 的处理回调与 `queueMicrotask` 注册的回调。在微任务检查点，队列会持续处理，直到排空。

下面的例子在第一个微任务里再安排一个微任务。它能说明“检查一次微任务队列”为什么不等于“只处理最初已有的那几项”。

```js example=js04-nested-microtasks
const events = ['同步开始'];
const timerDone = new Promise((resolve) => {
  setTimeout(() => { events.push('定时器'); resolve(); }, 0);
});
queueMicrotask(() => {
  events.push('微任务 A');
  queueMicrotask(() => events.push('微任务 C'));
});
Promise.resolve().then(() => events.push('微任务 B'));
events.push('同步结束');
await timerDone;
console.log(events.join(' → ')); // => 同步开始 → 同步结束 → 微任务 A → 微任务 B → 微任务 C → 定时器
```

| 推演位置 | 已记录的内容 | 接下来等待的微任务 |
| --- | --- | --- |
| 同步代码完成 | 同步开始、同步结束 | A、B |
| A 执行，在队尾加入 C | 再加 A | B、C |
| B 执行 | 再加 B | C |
| C 执行 | 再加 C | 空 |

这里 A 先被安排，所以先执行；A 新建的 C 排在已入队的 B 后面。微任务排空后，定时器所在任务才有机会被选中。

“任务结束后检查微任务”是适合入门的路径，但不是所有检查点的完整清单。浏览器在特定脚本或回调执行完成后，也可能按规范进行微任务检查。分析复杂事件分发时，应结合那个 API 的调用方式，不能机械套用“一次点击的全部回调之间绝对没有微任务”。

尤其不要把不同来源的回调先后顺序当成保证。例如定时器和网络响应哪一个先就绪、哪一个任务先被选择，可能取决于环境。能够确定的顺序与碰巧观察到的顺序要分开。

### await 暂停的是当前异步函数

**async/await** 把 Promise 链写成更接近逐句阅读的形式。调用 async 函数时，它从开头同步执行；走到 `await`，当前函数暂停，后续在等待结果可用后通过微任务继续。

```js example=js04-await-order
const events = ['调用前'];
async function read() {
  events.push('函数开始');
  const value = await 5;
  events.push(`await 之后 ${value}`);
  return value * 2;
}
const result = read();
events.push('调用后');
console.log(await result); // => 10
console.log(events.join(' → ')); // => 调用前 → 函数开始 → 调用后 → await 之后 5
```

即使等的是普通值 5，`await` 后面的代码也不会留在原来的同步调用过程中继续执行。调用方先获得一个 Promise，可以继续做自己的事。

但“当前函数暂停”不等于“浏览器一定已经渲染一帧”。如果等待的结果已经可用，后续只是进入微任务，可能很快接着执行。也不等于“有另一个 JavaScript 线程接手了函数”；续体仍在所属执行环境中运行。

如果等待的 Promise 拒绝，`await` 位置会表现为抛出异常，可以用普通 `try/catch` 捕获。没有捕获时，async 函数返回的 Promise 会拒绝。注意把真正需要等待的工作纳入这条链：仅启动一个异步操作而不返回也不等待它，外层无法自动知道它何时结束或失败。

### 微任务执行完不等于浏览器已经绘制

设想不断执行“读取下一条 → 等一个已兑现的 Promise → 读取下一条”。看起来每轮都在 `await`，但下一轮仍可能不断加入微任务队列。只要队列一直有工作，浏览器就难以继续处理后续任务和渲染。

下面只重复四次，避免运行不会结束的示例。它展示微任务会排在定时器之前，不用制造页面冻结。

```js example=js04-bounded-microtasks
const events = [];
const timerDone = new Promise((resolve) => {
  setTimeout(() => { events.push('定时器'); resolve(); }, 0);
});
for (let i = 1; i <= 4; i++) {
  await Promise.resolve();
  events.push(`第 ${i} 步`);
}
await timerDone;
console.log(events.join(' → ')); // => 第 1 步 → 第 2 步 → 第 3 步 → 第 4 步 → 定时器
```

四步很轻，不会造成可感知的问题。但把四步换成持续创建新微任务的大量计算，就可能出现**饥饿（starvation）**：其他工作一直得不到机会。解决方向是减少工作，或在适当的分段边界安排之后的任务；需要脱离主线程计算时使用 Worker。单纯增加 `await Promise.resolve()` 并不能达到这个目的。

`requestAnimationFrame` 用于在浏览器准备更新渲染时执行回调，适合汇总当前帧的视觉更新。它是在绘制之前参与工作，不是“绘制已完成”的通知。把大计算放进它的回调，仍会推迟这一帧。后台或隐藏页面的回调频率也可能降低，不能把它当成可靠的后台计时器。

浏览器不会在每个任务后都保证绘制一帧。是否有渲染机会、是否需要更新、文档是否可见等都会影响调度。判断“加载中”为什么没显示，应该先看设置状态后的代码是否连续占用了主线程，而不是只检查有没有写 `await`。

### 并发从启动动作开始

假设要获取个人资料和通知列表，两者互不依赖。如果先等资料完成，再启动通知，就把两段等待串起来了。要让它们重叠，应先启动两件事，再等待结果。

下面用立即兑现的 Promise 记录启动与等待顺序，专门观察调用关系；它不模拟真实网络延迟，也不用于测量提速倍数。

```js example=js04-start-order
const events = [];
function load(name) {
  events.push(`启动${name}`);
  return Promise.resolve(name);
}

await load('资料');
events.push('资料已等待完');
await load('通知');
console.log(events.join(' → ')); // => 启动资料 → 资料已等待完 → 启动通知

events.length = 0;
const profile = load('资料');
const notices = load('通知');
const results = await Promise.all([profile, notices]);
events.push('一起等待完');
console.log(events.join(' → ')); // => 启动资料 → 启动通知 → 一起等待完
console.log(results.join(',')); // => 资料,通知
```

`Promise.all` 接收的是已经创建的 Promise。真正开始工作的时机由 `load` 等调用决定，不是看到 `all` 才自动启动。结果数组按输入顺序排列，即使通知先完成，它仍然位于第二项。

如果通知请求必须使用资料请求返回的用户 ID，就有真实依赖，需要先得到 ID。这时串行是正确表达，而不是等待写法不够“高级”。

还要区分并发和并行：多个请求可以同时处于等待状态，但同一个页面执行环境中的 JavaScript 回调仍逐个运行。CPU 计算是否真正同时在不同线程运行，是另一个问题。

### 组合 Promise 不会自动取消工作

`Promise.all` 在某个输入拒绝后，可以尽早拒绝自己的结果，但其他输入代表的工作仍会继续。`Promise.race` 也只是采用最先落定的结果，不会替你终止其余候选。若超时 Promise 先赢，网络请求仍可能在继续。

| 组合方法 | 结果何时确定 | 适合表达的问题 |
| --- | --- | --- |
| `all` | 全部兑现，或某个输入拒绝 | 所需结果必须全部成功 |
| `allSettled` | 每个输入都已兑现或拒绝 | 每项都要报告结果 |
| `race` | 第一个输入兑现或拒绝 | 接受最先落定的结果 |
| `any` | 首个兑现，或全部拒绝 | 任意一次成功即可 |

`allSettled` 不会把失败变成成功；它会把每项的状态和结果记录在返回数组中。`any` 遇到一个拒绝不会立刻结束，全部拒绝时返回 `AggregateError`。空数组也有明确规则：`all` 和 `allSettled` 兑现为空数组，`any` 拒绝，`race` 保持 pending。边界值常能暴露调用方对“至少会有一个结果”的隐含假设。

下面用手动完成的 Promise 看清 `all` 拒绝后，另一件事仍能完成。

```js example=js04-all-keeps-running
let finishOther;
const events = [];
const other = new Promise((resolve) => { finishOther = resolve; })
  .then(() => events.push('另一件事仍然完成'));
try {
  await Promise.all([Promise.reject(new Error('其中一件失败')), other]);
} catch (error) {
  events.push(error.message);
}
finishOther();
await other;
console.log(events.join(' → ')); // => 其中一件失败 → 另一件事仍然完成
```

如果任务需要共同停止，调用方应把同一取消信号交给支持它的操作，并在失败时主动取消。任意 Promise 没有通用的 `cancel()`；取消能力来自它代表的底层工作，而不是 Promise 这个结果容器本身。

### 限制并发需要推迟启动

一次启动一千个请求，再把它们交给 `Promise.all`，并没有限制并发。想最多运行两个，就应暂存“启动任务的函数”，而不是一千个已经在进行中的 Promise。

```js example=js04-concurrency-limit
async function runLimited(tasks, limit) {
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError('并发数必须是正整数');
  const results = new Array(tasks.length);
  let next = 0;
  async function consume() {
    while (next < tasks.length) {
      const index = next++;
      // 在 await 前领取编号，同一执行环境中的其他消费者不会中途插入。
      results[index] = await tasks[index]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, consume));
  return results;
}

let active = 0;
let peak = 0;
const tasks = [1, 2, 3, 4].map((number) => async () => {
  active++;
  peak = Math.max(peak, active);
  try {
    await Promise.resolve();
    return number * 10;
  } finally {
    active--;
  }
});
console.log((await runLimited(tasks, 2)).join(',')); // => 10,20,30,40
console.log(peak); // => 2
```

两个消费者各自领取一个编号，然后等待自己手上的任务。谁先完成，谁再领下一个。因此上限约束的是正在等待完成的任务数，结果仍放回输入对应的位置。

这是讲解“领取后再启动”的最小实现。示例中的任务都成功；若某个任务失败，它的消费者会停止，外层会拒绝，但另一个消费者仍可能继续领取后续任务。需要“一次失败就停止领取”时，还要加入共享停止状态，并在领取前检查；需要停止已启动的请求时，再传递取消信号。这个区别与 `Promise.all` 不负责取消完全一致。

### 取消之后仍要判断结果是否过期

搜索框的例子最容易看出问题：用户先输入“函数”，再输入“闭包”，第二次结果先到，第一次随后到。如果每个回调都直接写界面，旧查询就会覆盖新查询。

下面用可手动完成的 Promise 固定顺序，不靠网络速度复现。

```js example=js04-stale-result
function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}
const first = deferred();
const second = deferred();
let version = 0;
let visible = '';
async function displayLatest(promise) {
  const ownVersion = ++version;
  const text = await promise;
  if (ownVersion !== version) return;
  visible = text;
}

const oldTask = displayLatest(first.promise);
const newTask = displayLatest(second.promise);
second.resolve('闭包的结果');
await newTask;
first.resolve('函数的结果');
await oldTask;
console.log(visible); // => 闭包的结果
```

每次启动保存自己的版本；提交前与当前版本比较。这个检查让“最后一次查询”决定界面，而不是“最后一次返回”决定界面。失败提示也要做同样的判断，否则旧查询的错误仍可能盖住新查询的成功。

真实请求中，可以在启动新查询时先调用上一个 `AbortController` 的 `abort()`，把新 `signal` 交给 `fetch` 等支持它的操作。这能减少已失去价值的工作。但取消与结果就绪可能接近发生，某些底层操作也不支持取消，因此提交前的版本检查仍有意义。取消表示意图，版本检查决定结果现在是否适合显示。

页面关闭时也应使旧版本失效，并释放监听或其他资源。涉及 Worker 时，消息可能已经在途；同样的判断可以放在消息接收处，见 [CS-03 的任务编号](../chinese-guides/cs-03-large-data-workers-incremental-memory.md#停止旧工作和拒绝旧结果需要分别处理)。

### 把顺序问题还原成几个具体动作

遇到一段新的异步代码，可以沿下面的过程阅读：先圈出立即调用的函数；找到每个任务真正启动的位置；标出回调进入任务还是微任务；再看每个 `await` 暂停哪一个函数、后续依赖哪个结果。最后检查失败由谁接住，失去价值的工作由谁停止，旧结果由谁拒绝提交。

例如“点击刷新后加载提示没出现”，先找提示设置后的同步长计算；“两个独立请求很慢”，先看第二个是不是等第一个结束才启动；“快速切换后显示旧内容”，先看结果提交有没有校验当前版本。它们都发生在异步流程里，却需要不同的修正。

能逐步说明这些动作之后，就不用靠背诵长串日志顺序来理解异步。Promise 管结果，任务与微任务决定后续代码的安排方式，浏览器调度决定何时继续其他工作；把三者分开，再按实际调用关系连起来，会更容易判断代码。

### 参考与延伸阅读

- [MDN：Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)——状态、结果接纳与组合方法。
- [MDN：使用微任务](https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide)——任务、微任务与持续排空。
- [MDN：深入理解微任务](https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide/In_depth)——执行环境与浏览器运行过程。
- [MDN：await](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await)——恢复时机与异常传播。
- [MDN：AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)——给底层操作传递取消意图。
- [MDN：requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)——与渲染更新协作的边界。
