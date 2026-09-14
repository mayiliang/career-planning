# B03 异步边界、模块与类型

## JS-05 Promise 错误处理与异步控制流

保存按钮显示“已保存”，数据却还没有写完；搜索框已经换了关键词，旧请求的错误提示又盖了回来；请求超时后重试，服务端却创建了两条记录。这些问题里的每一段 Promise 都可能正常运行，出错的是它们之间的衔接。

这一篇沿着一次操作的生命周期讲解：怎样把工作交给调用方等待，失败由谁处理，取消和清理怎样结束，以及什么时候可以重试。先看能改变结果的小例子，再把规则放回实际页面。

### 学习前先确认

- 直接前置：[JS-04 异步、Promise 与浏览器事件循环](../chinese-guides/js-04-async-promise-browser-event-loop.md#js-04)。本篇沿用任务、微任务和 Promise 链的运行模型，不重复推演全部队列规则。

本文 JavaScript 示例可以分别在现代桌面浏览器 Console 中运行，带 `await` 的代码需整体执行。`// =>` 标注预期输出。请求和写入使用本地模拟，不访问真实服务。

### 调用方等待的究竟是哪一件事

假设 `persist()` 返回的 Promise 要到写入完成才兑现。外层函数调用它之后立即结束，就会让“外层结束”和“写入完成”变成两件事。

```js example=js05-floating-work
let finish;
const writing = new Promise((resolve) => { finish = resolve; });
const events = [];
const persisted = writing.then(() => events.push('数据写完'));
function persist() { return persisted; }
async function saveTooEarly() {
  persist(); // 没有把这项工作交给调用者等待。
}

await saveTooEarly();
events.push('外层已结束');
console.log(events.join(' → ')); // => 外层已结束
finish();
await persisted; // 示例最后明确接管并等完这项工作。
console.log(events.join(' → ')); // => 外层已结束 → 数据写完
```

这里特意用手动完成的 Promise，让顺序不受电脑速度影响。外层已经结束，底层仍然在等待，原因是 `saveTooEarly` 返回的 Promise 没有跟随 `persisted`。

如果改成 `return persist()`，调用者会等到写入结果；如果还要在写完后执行下一步，则可以写 `await persist()`，然后继续。不是看见了 async 就代表函数内部所有工作都被自动收集。

没有连接到返回值、等待或明确监督者的 Promise，常被称为 **floating promise**。`void persist()` 只是表明不使用返回值，不会自动处理拒绝。确实需要后台执行时，也应由后台任务管理逻辑负责结束、错误与清理。

### return 和 return await 的区别出现在错误边界内

对于单纯转交结果的函数，`return task()` 通常足够。但如果当前函数要用自己的 `try/catch` 捕获异步拒绝，就必须在这个边界内等待它。

```js example=js05-return-await
function failLater() { return Promise.reject(new Error('写入失败')); }
async function passThrough() {
  try {
    return failLater();
  } catch {
    return '本地恢复';
  }
}
async function recoverHere() {
  try {
    return await failLater();
  } catch {
    return '本地恢复';
  }
}
console.log(await passThrough().catch((error) => `外层收到：${error.message}`)); // => 外层收到：写入失败
console.log(await recoverHere()); // => 本地恢复
```

第一种写法成功调用了 `failLater`，然后离开 `try`，返回的 Promise 继续跟随失败结果。本地 `catch` 没有等到这次拒绝。第二种在 `await` 位置把拒绝表现为抛错，所以由本地 `catch` 接住。

如果 `task()` 在返回 Promise 之前就同步抛错，第一种的本地 `catch` 也能捕获；上面的例子特意返回拒绝 Promise，区分这两条路径。同样，`try/finally` 内直接返回一个尚未结束的 Promise，会先执行本地清理；需要等工作结束再清理时，应在 `try` 内 `await`。

### catch 的位置决定它能处理哪些失败

`.then(onSuccess, onFailure)` 的两个回调处理的是前一个 Promise 的两种结果。`onFailure` 不是包围同级 `onSuccess` 的 `try/catch`。

```js example=js05-catch-position
const events = [];
await Promise.resolve('原始结果')
  .then(
    () => { throw new Error('成功回调出错'); },
    () => events.push('同级拒绝回调'),
  )
  .catch((error) => events.push(`后续 catch：${error.message}`));
console.log(events.join(' → ')); // => 后续 catch：成功回调出错
```

成功回调抛出的错误，属于 `.then` 返回的新 Promise，因此交给后续的拒绝处理器。如果希望处理前一步拒绝和当前处理错误，尾部 `catch` 更符合这个范围。

还要看 `catch` 怎么结束。它正常返回一个值，链就以这个值恢复为成功；没有写返回值，也会成功兑现为 `undefined`。这可以是有意恢复，也可能无意吞掉错误。

比如“头像加载失败就用默认头像”有明确替代方案，可以在头像边界恢复；“订单读取失败就显示空订单”却把读取失败伪装成确实没有订单。决定能否恢复的，是当前这一层是否有足够的业务信息，而不是 `catch` 越多越稳。

### 错误要保留原因也要补上当前语境

底层知道“数据格式不对”，页面知道“这次正在导入学习清单”。可以为错误增加当前语境，同时保留原始原因。**Error cause** 用来连接这两层信息。

```js example=js05-error-cause
function readStudyList(text) {
  try {
    const value = JSON.parse(text);
    if (!Array.isArray(value)) throw new Error('顶层必须是数组');
    return value;
  } catch (cause) {
    throw new Error('学习清单读取失败', { cause });
  }
}
try {
  readStudyList('{}');
} catch (error) {
  console.log(error.message); // => 学习清单读取失败
  console.log(error.cause.message); // => 顶层必须是数组
}
```

这个解析器只检查顶层数组，不宣称数组中的每一项都已符合业务规则。逐字段校验会在 [TS-01 的输入边界](../chinese-guides/ts-01-type-system-structural-strict-mode.md#外部数据经过检查后再进入业务代码) 中继续展开。

JavaScript 可以抛出字符串、对象，甚至 `undefined`，所以接入第三方库时不要直接假定每次 `error.message` 都存在。一般边界可以先判断 `error instanceof Error`，否则使用适当的描述；跨执行环境时，还需要考虑对象不一定来自当前环境的 Error 构造函数。

避免每经过一层都记录一条相同告警。底层保留具体原因，业务层补充操作语境，负责呈现或监督的边界再统一记录，更容易把一次失败串起来。

### HTTP 失败和 Promise 拒绝需要分别判断

`fetch` 收到 HTTP 404 或 500 时，通常仍会兑现为 Response。网络失败、取消等才会使请求 Promise 拒绝。需要把非成功 HTTP 状态当成失败，就明确检查 `response.ok`。

下面用内存中的 Response 演示，不向服务器发送请求。

```js example=js05-http-status
async function readJson(response) {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
const good = new Response('{"count":3}', { status: 200 });
console.log((await readJson(good)).count); // => 3
try {
  await readJson(new Response('暂时无法处理', { status: 503 }));
} catch (error) {
  console.log(error.message); // => HTTP 503
}
```

状态正常后，解析仍可能失败：HTTP 200 的正文未必是合法 JSON；合法 JSON 也未必包含要求的字段。请求、HTTP 状态、正文解析、业务校验是不同阶段，应让错误描述指向具体阶段。

没有错误并不意味着结果一定适合当前页面。账号可能已经切换，查询条件可能已经更新，最终提交仍需判断结果归属。

### 两种 finally 的返回值不要混在一起

先看 `Promise.prototype.finally()`。清理函数正常返回普通值时，这个值不会替换原来的兑现值或拒绝原因。

```js example=js05-promise-finally
const value = await Promise.resolve('原结果').finally(() => '清理返回值');
console.log(value); // => 原结果
try {
  await Promise.reject(new Error('原失败')).finally(() => '备用数据');
} catch (error) {
  console.log(error.message); // => 原失败
}
```

所以不能靠 `.finally(() => cachedData)` 把失败恢复成缓存。要根据失败决定替代数据，应使用 `catch`。

如果清理抛错，或者返回最终拒绝的 Promise，它产生的新失败会替换原结果；返回一个尚未完成的 Promise，则会先等待清理完成。

```js example=js05-cleanup-failure
try {
  await Promise.reject(new Error('保存失败')).finally(() => {
    throw new Error('清理也失败');
  });
} catch (error) {
  console.log(error.message); // => 清理也失败
}
```

再看语言语句 `try/finally`。这里若在 finally 块中 `return`，会覆盖原来准备返回或抛出的结果。

```js example=js05-statement-finally
function finish() {
  try {
    return '原结果';
  } finally {
    return '被覆盖的结果';
  }
}
console.log(finish()); // => 被覆盖的结果
```

这段用于展示行为，不是推荐写法。清理尽量保持短小，避免在 finally 中改变业务结果。若主要操作和清理都失败，应明确记录两者，必要时用 cause 或 `AggregateError` 保留原因，不能让真正的保存失败无声消失。

### 一组工作需要先约定怎样算完成

[JS-04 的组合方法](../chinese-guides/js-04-async-promise-browser-event-loop.md#组合-promise-不会自动取消工作)已经解释各方法的时机。这里把它们放回一个页面：正文和作者信息缺一不可，适合一起成功才展示；三份独立附件逐项上传，希望每项都报告结果，则适合 `allSettled`。

```js example=js05-partial-results
const results = await Promise.allSettled([
  Promise.resolve('第一份已保存'),
  Promise.reject(new Error('第二份格式无效')),
  Promise.resolve('第三份已保存'),
]);
const report = results.map((result, index) => result.status === 'fulfilled'
  ? `${index + 1}：${result.value}`
  : `${index + 1}：${result.reason.message}`);
console.log(report.join(' / ')); // => 1：第一份已保存 / 2：第二份格式无效 / 3：第三份已保存
```

结果按输入顺序排列，不需要猜哪份先完成。失败项仍然是失败，只是没有让其他项的结果丢失。

若同组一项失败后其余工作也失去价值，需要另外发出取消信号。若数量很多，需要另外控制启动数量。组合结果、启动限制和取消是三个职责，不能期待一个 `Promise.all` 顺便完成全部工作。

### 可取消的等待需要处理开始前和结束后的情况

**协作取消（cooperative cancellation）**表示调用方提出停止意图，被调用方主动检查并释放自己管理的资源。下面实现一段可取消的定时等待，信号是必传参数。

```js example=js05-abortable-wait
function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(signal.reason); return; }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve('等完了');
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(signal.reason);
    }
    signal.addEventListener('abort', onAbort, { once: true });
  });
}
const controller = new AbortController();
const task = wait(5000, controller.signal);
controller.abort(new Error('用户停止等待'));
console.log(await task.catch((error) => error.message)); // => 用户停止等待
console.log(await wait(0, new AbortController().signal)); // => 等完了
```

先检查 `aborted`，因为信号可能在调用前就已取消，过去的 abort 事件不会为新监听器重新播放。正常完成时移除监听，取消时清掉 timer；`once: true` 只负责事件发生后的监听移除，不能代替正常完成的清理。

`signal.reason` 不一定是名为 AbortError 的异常，可以是发起方传入的任意理由。信号取消后不能重置；新操作通常需要新 controller。多个子任务可以共享一次用户操作的信号，但不相关功能不应随便共用一个全局取消开关。

长同步循环也不会因为收到 signal 就自动被打断。需要在可响应的分段边界检查；Worker 的消息取消为什么也有这个限制，可回看 [CS-03 的取消](../chinese-guides/cs-03-large-data-workers-incremental-memory.md#停止旧工作和拒绝旧结果需要分别处理)。

### 新请求开始后旧请求的清理也可能过期

版本检查不应只保护成功结果。旧请求的 catch 可能显示错误，旧请求的 finally 也可能把新请求的 loading 提前关闭。

```js example=js05-stale-cleanup
function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}
let version = 0;
let state = '空闲';
async function show(promise) {
  const ownVersion = ++version;
  state = '加载中';
  try {
    const text = await promise;
    if (ownVersion === version) state = `结果：${text}`;
  } catch {
    if (ownVersion === version) state = '加载失败';
  } finally {
    if (ownVersion === version && state === '加载中') state = '空闲';
  }
}
const first = deferred();
const second = deferred();
const older = show(first.promise);
const newer = show(second.promise);
first.resolve('旧内容');
await older;
console.log(state); // => 加载中
second.resolve('新内容');
await newer;
console.log(state); // => 结果：新内容
```

旧请求结束时，新请求还在等待，因此页面应该继续显示加载中。每个修改共享状态的位置都要判断当前版本，而不是只有给 data 赋值时才判断。

这个例子没有取消底层工作，专门展示状态归属。真实请求可以配合 AbortController 节省工作，但提交前仍保留版本判断。下一篇类型建模会把“加载中”“成功”“失败”变成互斥状态，见 [TS-02 的状态转换](../chinese-guides/ts-02-unions-narrowing-never-exhaustiveness.md#类型描述状态版本判断决定谁能更新状态)。

### 重试前先问上一次可能已经做成了吗

读取公开资料遇到短暂网络失败，稍后重试可能有价值。创建订单时连接断开，却可能是“服务端已创建，只是结果没回来”。直接重放会把一次用户意图变成两次操作。

**幂等性（idempotency）**表示重复执行不会增加额外的预期业务效果。它需要服务端或执行方支持，不能由客户端多加一个字段就单方面保证。常见协议是同一业务操作使用同一个幂等键，服务端按该键原子地记录和返回结果；新的业务操作才使用新键。具体保留时间、请求内容冲突和重放结果也要约定。

| 失败情形 | 先做什么 |
| --- | --- |
| 用户取消 | 停止，不自动重试 |
| 参数不符合规则 | 修正输入，再决定是否重新提交 |
| 认证失效 | 进入受控认证流程，避免每个请求各自无限刷新 |
| 可安全重放的读取遇到暂时故障 | 可以有限重试，并等待一段时间 |
| 写入结果未知 | 查询操作状态或沿既有幂等协议恢复 |
| 程序异常或数据协议不符 | 保留原因并修复，反复执行通常无益 |

还要限制次数和间隔。下面只模拟一项可重放的读取，前两次抛出明确标记的暂时故障，第三次成功。`pause` 记录本来要等待的毫秒数，不实际等待，用来观察策略。

```js example=js05-bounded-retry
async function retryRead(read, pause) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await read();
    } catch (error) {
      if (!error.retryable || attempt === 3) throw error;
      await pause(100 * 2 ** (attempt - 1));
    }
  }
}
let attempts = 0;
const delays = [];
const value = await retryRead(async () => {
  attempts++;
  if (attempts < 3) throw Object.assign(new Error('暂时不可用'), { retryable: true });
  return '读取完成';
}, async (ms) => { delays.push(ms); });
console.log(value, attempts); // => 读取完成 3
console.log(delays.join(',')); // => 100,200
```

等待逐渐增长叫**指数退避（exponential backoff）**。大量客户端同时失败时，固定间隔可能让它们同时重试；加入随机变化的 **jitter** 可以把再次请求的时刻分散开。示例只解释次数和间隔，不包含完整的取消、总时长与服务端 `Retry-After` 处理。

真实策略至少要说明最大尝试次数、单次超时、总等待预算、哪些错误能重试，以及等待是否响应取消。三次尝试若每次都可能一直 pending，最大次数仍不能保证总时间有界。多层各自重试还会放大请求数量，因此应明确主要由哪一层负责重试。

### 超时结束等待并不代表远端撤销

`Promise.race([work, timeout])` 只决定调用者先观察到哪个结果，输掉的工作可以继续运行。想让支持取消的操作停止，应把超时也表达为取消信号。

现代浏览器的 `AbortSignal.timeout` 可以产生超时信号，`AbortSignal.any` 可以把用户取消与超时组合起来。下面模拟一个只在取消时结束的等待，用零毫秒超时触发，观察它给出的原因。

```js example=js05-deadline runtime=browser
const user = new AbortController();
const deadline = AbortSignal.timeout(0);
const signal = AbortSignal.any([user.signal, deadline]);
try {
  await new Promise((resolve, reject) => {
    if (signal.aborted) { reject(signal.reason); return; }
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  });
} catch (error) {
  console.log(error.name); // => TimeoutError
}
```

这里没有网络请求，例子只演示信号组合。实际使用时把 signal 传给支持它的 API；目标环境不支持这些方法时，可以用 controller、timer 和清理逻辑实现相应协议。

`AbortSignal.timeout` 依据活动时间，页面挂起等情况可能暂停计时，不能直接把它当成始终流逝的墙钟截止时间。即使客户端取消成功，已经到达服务端的写操作也不因此自动回滚。界面应该区分“明确失败”“明确成功”与“结果暂时未知”，不要用一个超时提示掩盖后者。

### 让错误回到能够作决定的地方

浏览器的 `unhandledrejection` 可以发现没有及时处理的拒绝，适合诊断遗漏。它已经离开了局部操作的上下文，不能替每个页面决定恢复方式。正确修复通常是找到漏掉的 await、return 或任务监督者。

对一条异步流程，只要能回答几个具体问题，就已经比堆满 try/catch 更清楚：谁等待完成，谁能恢复失败，谁负责取消，谁负责清理，结果提交时还属于谁。记录操作名、任务编号、尝试次数、错误类别和最终状态，可以帮助把这些动作对上；不必把原始输入全部塞进日志。

本篇的例子故意交换完成顺序、制造清理失败和重复尝试，是为了让规则可观察。实际修改时，优先验证与当前问题有关的几个分支；不需要为了学一个 Promise 就搭建完整故障平台。

### 参考与延伸阅读

- [MDN：使用 Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)——结果链、错误边界和遗漏返回的影响。
- [MDN：Promise.prototype.finally](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/finally)——正常返回、拒绝与等待清理的差异。
- [MDN：try…catch](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch)——语言语句 finally 对控制流的影响。
- [MDN：AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal)——取消原因、组合信号与超时。
- [MDN：使用 Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)——HTTP 状态、响应体与请求取消。
