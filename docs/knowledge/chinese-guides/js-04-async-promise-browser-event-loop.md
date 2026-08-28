# JS-04 异步、Promise 与浏览器事件循环

JavaScript 可以发起网络请求、等待定时器，也能在用户点击时响应事件，但普通页面脚本并不是把任意两段 JavaScript 同时放在主线程执行。理解异步的关键，是分清“当前调用栈怎样结束”“回调何时进入哪类队列”“Promise 怎样安排后续反应”以及“浏览器何时得到渲染机会”。

## JS-04

### 学习前先确认

- 不熟悉函数作为参数传递，先读 [PREJS-02 函数、参数、返回值与回调](../chinese-guides/javascript-functions-and-callbacks.md#prejs-02)。
- 不清楚定时器为什么只是登记稍后执行，先读 [PREJS-04 定时器与稍后执行的回调](../chinese-guides/javascript-scheduled-callbacks.md#prejs-04)。
- 不熟悉 Promise 的三个状态和 AbortSignal，先读 [PREJS-07 Promise 与取消信号](../chinese-guides/javascript-promises-and-cancellation.md#prejs-07)。
- 若“函数调用进入栈、返回后离开”还不直观，可回看 [JS-01 的执行上下文与调用栈](../chinese-guides/js-01-execution-context-scope-closure.md#js-01)。

### 一、异步先把“等待”与“继续执行”分开

调用 `fetch` 或 `setTimeout` 时，JavaScript 不是停在原地占住调用栈等待。代码向宿主环境登记工作和回调，然后当前函数继续执行并返回。网络、计时或用户事件达到条件后，宿主再安排相应回调进入未来的执行机会。

这解释了为什么下面先打印“函数结束”：

```js
console.log('函数开始');

setTimeout(() => {
  console.log('定时回调');
}, 0);

console.log('函数结束');
```

延时为 0 的含义是“不再额外要求等待这段时长后，尽快安排”，不是“立即打断当前代码”。当前脚本仍要运行到调用栈为空。

**调用栈（call stack）**记录当前正在执行的函数。普通 JavaScript 函数具有运行到结束的语义：一个回调执行中不会在任意表达式中间突然换成另一个普通回调。异步的交错发生在一次执行结束、宿主选择下一项工作时。

### 二、任务、微任务与渲染机会组成基本节奏

浏览器从**任务队列（task queue）**中选择一个可运行任务，例如初始脚本、定时器回调或某些事件回调。任务运行到调用栈为空后，浏览器进入**微任务检查点（microtask checkpoint）**，持续执行当前队列中的微任务，直到队列为空。之后浏览器才可能更新渲染，再进入下一轮任务。

Promise 的反应回调、`queueMicrotask` 回调和 `await` 的后续通常作为**微任务（microtask）**运行。它们不会在当前同步代码中间插入，却会在下一个普通任务前完成：

```js
console.log('A');

setTimeout(() => console.log('D'), 0);

Promise.resolve().then(() => console.log('C'));

console.log('B');
// A B C D
```

逐行追踪时不要背最终字符串，画状态更可靠：初始脚本是当前任务；`setTimeout` 登记未来任务；`.then` 在 Promise 已兑现后登记微任务；同步打印结束；栈空后先清微任务得到 C；下一任务才得到 D。

**事件循环（event loop）**是协调任务、微任务、渲染和宿主事件的运行模型，不只是“两条队列轮流取值”。不同 API 的任务来源和浏览器调度策略更复杂；学习时先掌握稳定的顺序边界，再通过规范或开发者工具核对具体 API。

### 三、Promise 状态与回调执行时机要分开

Promise 有 pending、fulfilled、rejected 三种状态。状态一旦从 pending 变为 fulfilled 或 rejected 就不会再改变，但 `.then`/`.catch` 中的回调仍不会同步插入当前调用栈；它们作为 Promise reaction 在微任务中执行。

```js
const ready = Promise.resolve('数据');

ready.then((value) => console.log(value));
console.log('已登记处理函数');

// 已登记处理函数
// 数据
```

`.then` 会立即返回一个新的 Promise。回调返回普通值时，新 Promise 以该值兑现；抛出错误时，新 Promise 拒绝；返回另一个 Promise 或 thenable 时，新 Promise 会采用其最终状态。这就是链式调用能把异步步骤和错误沿同一条链传递的基础。

```js
fetch('/api/profile')
  .then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  })
  .then((profile) => renderProfile(profile))
  .catch((error) => showError(error));
```

把 `.then` 回调写成花括号后忘记 `return`，下一步会收到 `undefined`；在链外启动 Promise 却不返回，也会让外层无法等待和统一处理错误。先画每个 `.then` 返回的新 Promise，很多“异步失踪”都会变清楚。

### 四、async/await 改变写法，不改变调度模型

调用 `async` 函数总会得到 Promise。执行到 `await expression` 时，表达式会按 Promise 语义处理；当前 async 函数暂停，把控制权还给调用者，待结果可用后，其后续作为微任务继续。

```js
async function loadProfile() {
  console.log('开始请求');
  const response = await fetch('/api/profile');
  console.log('响应可用');
  return response.json();
}

const pending = loadProfile();
console.log('调用已经返回 Promise');
await pending;
```

`await` 不会冻结整个浏览器，也不会为普通 JavaScript 创建新线程。它只暂停当前 async 函数。两个互不依赖的请求如果连续 `await`，会人为串行等待；先同时发起再统一等待，才会重叠网络等待时间：

```js
const userRequest = fetch('/api/user');
const teamRequest = fetch('/api/team');

const [userResponse, teamResponse] = await Promise.all([
  userRequest,
  teamRequest,
]);
```

是否并行发起要考虑服务端容量、浏览器连接、请求成本和错误策略，不能把 `Promise.all` 当成越多越快的开关。

### 五、微任务连续产生会推迟任务和渲染

浏览器会在当前检查点持续清空微任务；如果每个微任务又加入新的微任务，队列可能长时间不为空。这叫**微任务饥饿（microtask starvation）**，会推迟定时器、事件和渲染。

```js
function keepRunning() {
  queueMicrotask(keepRunning);
}

keepRunning();
```

这段代码不是“高效地后台运行”，而是在主线程不断占用微任务检查点。大量 CPU 工作需要分片时，应使用能进入后续任务或浏览器调度阶段的机制，并控制每片工作量；需要真正移出主线程的计算则考虑 Worker。选择 API 时要结合浏览器支持和降级方案。

微任务适合在当前同步变化之后、下一任务之前做短小的一致性收尾，例如批量提交状态。它不适合承载无界循环或大规模计算。

### 六、事件循环并不等于业务并发控制

浏览器主线程一次执行一段 JavaScript，与同时等待多少个网络请求是两个层次。若一次发起数百个请求，代码需要在应用层设置**并发限制（concurrency limit）**，保护服务端、网络和内存。这个限制器维护的是已启动但尚未完成的操作数量，而不是改变任务/微任务规则。

应用层异步流程通常还要决定：结果是否保持输入顺序，单项失败是否终止整体，用户取消后是否停止未开始的工作，运行中的操作是否接受同一个 AbortSignal。它们是业务协议，不属于事件循环自动提供的保证。

理解这种分层可以避免两个常见错误：把“JavaScript 单线程”误解为一次只能等待一个请求；或把 Promise 同时创建误解为 JavaScript 回调在主线程真正并行执行。

### 七、取消和过期结果要在提交处设门禁

`AbortController` 可以把取消意图传给支持信号的 API，例如 `fetch`。取消不是 Promise 的第四种状态；底层操作通常以拒绝结束，调用方再根据错误类型区分用户取消与真实失败。

```js
const controller = new AbortController();

const request = fetch('/api/search?q=book', {
  signal: controller.signal,
});

controller.abort();
```

有些异步工作不能被真正中断，或者取消到达时结果已经在路上。连续搜索等场景还需要请求版本：只允许当前版本把结果写进状态，旧版本即使完成也被丢弃。取消节省工作，版本门禁保护正确性，两者互补。

Promise 的错误处理、重试和连续搜索状态会在 JS-05 继续展开。本知识点先把底层调度和基本取消边界建立牢固。

### 八、浏览器模型不要直接套到 Node.js

浏览器和 Node.js 都使用事件循环思想，但宿主阶段、API 与某些队列优先级不同。`process.nextTick`、I/O 阶段等是 Node 专有内容。分析浏览器页面时只使用浏览器 API 和对应规范；分析 Node 程序时再建立 Node 的阶段模型。记住一个环境中的输出顺序，不能替代辨认当前宿主。

### 九、用可解释的 trace 排查顺序问题

面对混合了同步代码、Promise、timer 和事件的程序，按以下方法：

1. 标出当前任务和调用栈；
2. 每遇到调度 API，就记录它最终加入任务还是微任务；
3. 当前栈未清空前，不执行任何已登记回调；
4. 栈空后清微任务，并把微任务新加入的微任务继续排到队尾；
5. 微任务为空后记录一次可能的渲染机会，再选择后续任务；
6. 对每个 Promise 标出它是谁返回的新 Promise，以及状态从哪里采用。

开发者工具中的 Performance 录制可以验证任务块、长任务与渲染间隙，日志可以验证业务事件顺序。不要在生产逻辑里依赖多个同截止时间 timer 的偶然相对顺序；需要顺序时，应在程序中显式串联。

### 学完后的自我检验

自己写一段包含同步日志、一个 timer、两级 `.then` 和一个 `await` 的短代码。在运行前画出任务、微任务、调用栈和 Promise 链，预测输出，再用浏览器验证。接着把其中一个微任务改成递归加入微任务，解释渲染为什么被推迟；最后说明如果场景需要限制网络并发或丢弃旧搜索结果，为什么那是事件循环之上的另一层协议。

