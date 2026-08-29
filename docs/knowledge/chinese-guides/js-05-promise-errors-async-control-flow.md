# JavaScript 知识点讲义

## JS-05 Promise 错误处理与异步控制流

异步程序真正困难的地方，通常不是把 `then` 改写成 `await`，而是回答一组责任问题：失败沿哪条路径传播，哪一层有能力恢复，谁可以取消工作，多个结果怎样汇合，旧结果是否仍有资格提交，以及重试会不会把一次操作变成两次。JS-04 已经解释了 Promise 与事件循环怎样调度；这一讲在那个运行模型上继续建立可维护的异步控制流。

### 学习前先确认

- 直接前置：[JS-04 异步、Promise 与浏览器事件循环](../chinese-guides/js-04-async-promise-browser-event-loop.md#js-04)。Promise 基础、timer、回调、函数、变量与调用栈已由它继续逐层链接，这里不重复列出。

异常、取消、组合器、重试和竞态都是本讲正文，不需要先读一份混合术语表。

### 一、Promise 链是一条结果与失败的管道

每次调用 `.then`、`.catch` 或 `.finally` 都会返回一个新的 Promise。新 Promise 的结果取决于处理器怎样结束：

- 返回普通值：新 Promise 兑现为该值；
- 返回 Promise 或 thenable：新 Promise 采用它的最终状态；
- 抛出异常：新 Promise 拒绝；
- 没有相应处理器：原来的兑现值或拒绝原因继续传递。

失败沿链向后寻找最近的拒绝处理器，这种行为叫**拒绝传播（rejection propagation）**。

```js
loadAccount()
  .then((account) => loadOrders(account.id))
  .then((orders) => summarize(orders))
  .catch((error) => {
    reportLoadFailure(error);
    throw error;
  });
```

`loadAccount` 拒绝、`loadOrders` 拒绝，或者任意成功处理器同步抛错，都会到达尾部 `catch`。但 `catch` 自己正常返回时，链已经从拒绝恢复为兑现；如果调用者仍应知道操作失败，就必须继续抛出，或返回一个明确的失败结果。空 `catch` 不是“错误已处理”，只是把错误信息丢掉。

下面两种写法也不等价：

```js
work().then(onSuccess, onFailure);

work().then(onSuccess).catch(onFailure);
```

第一种的 `onFailure` 处理 `work()` 的拒绝，却捕获不到同一个 `then` 中 `onSuccess` 新抛出的错误；第二种尾部 `catch` 可以处理两者。只有确实要把某一步的失败范围限制在局部时，才使用嵌套或第二参数建立局部恢复边界。

### 二、返回和等待决定调用者是否拥有完整控制流

异步函数如果启动工作却没有返回或等待它，就产生了脱离当前链条的工作：

```js
async function saveProfile(profile) {
  validate(profile);
  persistProfile(profile); // 错误：调用者不知道它何时完成或失败
}
```

外层 `await saveProfile(profile)` 只会等到函数执行到末尾，无法负责 `persistProfile` 稍后的拒绝。正确做法取决于责任：

```js
async function saveProfile(profile) {
  validate(profile);
  await persistProfile(profile);
}
```

或者直接 `return persistProfile(profile)`。如果工作确实要在后台独立运行，也应由专门的任务管理器接管错误、取消、日志和生命周期，不能只写一句 `void doWork()` 就假设风险消失。

一个好用的规则是：创建 Promise 的代码必须把它交给某个责任主体。责任主体可以 `await`、返回、组合或显式监督它；不能让 Promise 成为无人知道何时结束的漂浮工作。

### 三、catch 的位置表达恢复责任

不是越早 `catch` 越安全。错误处理层只有在能做出有意义决定时才应截获失败：

- 数据访问层可以补充请求地址、状态码和重试提示，但通常不知道界面如何呈现；
- 业务层可以区分权限拒绝、库存不足、版本冲突等领域结果；
- 页面层可以决定显示空态、错误态、重试按钮或保留旧数据；
- 全局边界负责记录未被更近层处理的缺陷，并提供最后的稳定降级。

这种把错误交给有能力处理的一层的设计叫**失败边界（failure boundary）**。边界不应把所有异常统一改成 `null`：这样调用者无法区分“确实没有数据”和“请求失败”。也不应每层都重复记录同一错误，否则一次失败会产生多条互相割裂的告警。

```js
class HttpError extends Error {
  constructor(status, message, options) {
    super(message, options);
    this.status = status;
  }
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new HttpError(response.status, `HTTP ${response.status}`);
  }
  return response.json();
}
```

注意 `fetch` 只有在网络失败、取消等情况下才拒绝；HTTP 404、500 仍会得到 Response，因此是否把非 2xx 视为异常必须由封装层明确决定。

异常也不保证一定是 `Error` 对象。JavaScript 允许 `throw 'failed'`，外部库也可能拒绝任意值。边界上先把 `unknown` 归一化，再读取 `message`、`cause` 或自定义字段，能避免错误处理代码本身再次抛错。

### 四、finally 保证经过清理，不保证保留原结果

`.finally(cleanup)` 适合收起 loading、释放锁或撤销登记。它不接收兑现值或拒绝原因；清理正常完成时，原状态继续向后传递：

```js
setSaving(true);

return saveDraft()
  .finally(() => {
    setSaving(false);
  });
```

但 `finally` 不是不可失败的旁路。若清理函数抛错，或返回拒绝 Promise，新失败会替代原来的成功或失败。`try/finally` 中写 `return` 也可能覆盖原返回值。因此关键清理应尽量短、幂等，并在清理可能失败时明确决定如何保留原始错误，例如记录二者、设置 `cause`，或聚合为包含双重信息的错误。

不要把业务恢复写进 `finally`。例如 `return cachedData` 会改变链的结果，却无法根据原状态做出清晰判断。恢复属于 `catch`，无条件收尾才属于 `finally`。

### 五、组合器先定义“整体完成”是什么意思

四个常用静态方法组合的是 Promise 结果，不会替你取消已经启动的工作：

| 组合器 | 返回 Promise 何时兑现 | 何时拒绝 | 适合的问题 |
| --- | --- | --- | --- |
| `Promise.all` | 全部兑现，按输入顺序给出值 | 任一拒绝后尽快拒绝 | 全部都必须成功 |
| `Promise.allSettled` | 全部敲定，逐项给出状态 | 自身通常不因单项失败拒绝 | 需要完整结果报告 |
| `Promise.any` | 任一首先兑现 | 全部拒绝后以 `AggregateError` 拒绝 | 多来源取首个成功 |
| `Promise.race` | 第一项敲定时采用其状态 | 第一项若拒绝就拒绝 | 竞争首个结果或构建超时门禁 |

“尽快拒绝”只描述组合 Promise 的可见结果，不表示其他请求停止。下面的三个请求在调用函数时就已启动：

```js
const requests = urls.map((url) => fetch(url));
const responses = await Promise.all(requests);
```

若同组失败后必须停止剩余工作，要在启动前创建共享取消信号，并让每个操作实际响应它。若任务数量无界，还要使用并发限制器控制何时调用任务函数；把已经启动的 Promise 放进队列只限制等待，不限制工作。

组合器的输出顺序也要分清。`Promise.all` 与 `allSettled` 的数组按输入顺序排列，不按完成顺序；若 UI 需要边完成边显示，应采用事件、异步迭代或显式进度回调，而不是等待整个组合结果。

### 六、取消是调用者与被调用者共同遵守的协议

Promise 没有 cancelled 状态。`AbortController`/`AbortSignal` 提供的是**协作取消（cooperative cancellation）**：调用者发出停止意图，被调用函数检查信号、停止能停止的工作，并完成自身清理。

```js
async function loadDocument(id, signal) {
  signal.throwIfAborted();
  const response = await fetch(`/documents/${id}`, { signal });
  if (!response.ok) throw new HttpError(response.status, '文档读取失败');
  return response.json();
}
```

取消可能发生在启动前、传输中、解析时或结果已经返回后。调用方不能只在 `catch` 中识别 `AbortError`，还应决定取消后哪些结果不得提交。对于自己实现的等待或长循环，可以监听 `abort` 事件，但必须在完成时移除监听，避免保存无用闭包；也可以使用 `{ once: true }` 并在正常完成路径主动清理。

```js
function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }

    const timer = setTimeout(finish, ms);
    signal.addEventListener('abort', abort, { once: true });

    function finish() {
      signal.removeEventListener('abort', abort);
      resolve();
    }

    function abort() {
      clearTimeout(timer);
      reject(signal.reason);
    }
  });
}
```

同一个 signal 可以统一一组子工作的生命周期，但不要把长期存在的全局 signal 随意传给所有功能；那会让一个局部取消意外停止不相关工作。取消范围应与用户动作、组件实例或一次业务操作相对应。

### 七、取消与过期结果抑制解决不同问题

用户连续输入搜索词时，新请求通常应取消旧请求，但取消并不能证明旧结果绝不会到达：底层 API 可能不支持取消，响应可能已经完成，或后续解析仍在运行。提交处还要检查结果是否属于当前请求，这叫**过期结果抑制（stale-result suppression）**。

```js
let currentVersion = 0;
let currentController = null;

async function search(query) {
  const version = ++currentVersion;
  currentController?.abort('superseded');
  const controller = new AbortController();
  currentController = controller;

  setSearchState({ kind: 'loading', query });

  try {
    const result = await loadSearch(query, controller.signal);
    if (version !== currentVersion) return;
    setSearchState({ kind: 'success', query, result });
  } catch (error) {
    if (version !== currentVersion) return;
    if (controller.signal.aborted) {
      setSearchState({ kind: 'idle' });
      return;
    }
    setSearchState({ kind: 'error', query, error: normalizeError(error) });
  }
}
```

版本号保护状态正确性，取消尽量节省网络、CPU 和内存。两者互补。门禁必须放在每个可能提交共享状态的位置；只在成功分支检查，而让旧失败覆盖新成功，同样会产生竞态。

`await` 是可重入边界。暂停期间，组件可能卸载、用户可能切换账户、权限可能改变。恢复后应重新验证版本、所有权、活动状态和取消信号，而不是假设等待前成立的条件仍成立。

### 八、先分类错误，再决定是否重试

“失败就再试一次”会制造重复写入、雪崩和更长等待。重试前先区分：

- 用户取消：通常不重试，也不显示为系统错误；
- 网络暂时中断、部分 5xx 或服务端明确建议稍后再试：可能重试；
- 认证失效：先走一次受控刷新流程，不能让每个请求独立无限刷新；
- 权限拒绝、参数错误、业务规则拒绝：改输入或权限前，重复请求没有意义；
- 程序错误、解析协议不符：应暴露并修复，自动重试只会重复缺陷；
- 结果未知的写操作：必须先查询状态或依靠幂等协议，不能直接重放。

一次操作可安全重复而不产生额外业务效果，称为**幂等性（idempotency）**。HTTP 方法名称可以提供线索，却不能代替真实服务端合同。创建订单、扣款、发送消息即使网络层重试成功，也可能已经在第一次请求中生效；常见做法是由客户端产生稳定幂等键，服务端原子记录该键与结果，再把同键重放映射到同一结果。

### 九、退避、抖动和总预算共同限制重试

可重试也不等于立刻无限重试。每次间隔逐步增加叫**指数退避（exponential backoff）**；在等待时间中加入随机变化叫**抖动（jitter）**，能避免大量客户端同时恢复后再次一起冲击服务。系统还要设置**重试预算（retry budget）**：最大尝试次数、总时长、单次超时以及是否遵守服务端 `Retry-After`。

```js
async function retry(operation, options) {
  const startedAt = Date.now();

  for (let attempt = 0; ; attempt += 1) {
    options.signal.throwIfAborted();
    try {
      return await operation({ attempt, signal: options.signal });
    } catch (error) {
      const elapsed = Date.now() - startedAt;
      if (!options.shouldRetry(error, attempt) || elapsed >= options.maxTotalMs) {
        throw error;
      }
      const base = Math.min(options.maxDelayMs, options.baseDelayMs * 2 ** attempt);
      const delay = Math.random() * base;
      await wait(delay, options.signal);
    }
  }
}
```

这个骨架仍需要业务层提供 `shouldRetry`。库不可能只看“抛错了”就知道写操作能否重放。多个重试层也会相乘：浏览器 SDK 重三次、网关重三次、服务内部再重三次，最坏会放大成许多次调用。系统应规定哪一层拥有重试责任，并把尝试次数写入日志和链路信息。

### 十、超时只是停止等待，也可能需要停止工作

`Promise.race([work, timeout])` 可以让调用者先收到超时失败，但输掉竞赛的 `work` 仍可能继续运行并提交副作用。真正的超时协议应把超时转换为取消信号，并让底层工作响应：

```js
async function loadWithDeadline(url, timeoutMs, parentSignal) {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal = AbortSignal.any([parentSignal, timeoutSignal]);
  return fetch(url, { signal });
}
```

使用这类较新的便捷方法前要核对目标浏览器和运行时；需要支持较旧环境时，可以用独立 controller、timer 与清理函数实现同样协议。无论哪种写法，都要区分父级取消和截止时间耗尽，因为用户提示、日志等级和是否重试可能不同。

服务端已经收到写请求时，客户端超时不等于服务端回滚。此时结果可能未知：先用幂等键查询，或让接口返回可追踪的操作 ID，再决定后续动作。

### 十一、未处理拒绝是监控信号，不是业务恢复机制

浏览器会暴露 `unhandledrejection`，用于发现没有及时连接到处理链的失败。这类**未处理拒绝（unhandled rejection）**通常意味着责任链断裂、忘记 `await`、事件回调中缺少监督，或应用顶层没有建立失败边界。

全局监听器适合记录诊断信息和触发最后降级，不适合把页面所有失败统一标记为成功。它看到的错误已经失去大量局部上下文，而且不同运行时对未处理拒绝的报告和进程行为可能不同。修复应回到产生 Promise 的责任位置。

可靠的**可观察性（observability）**至少要记录：操作名、请求或任务 ID、尝试次数、耗时、取消来源、错误分类、最终状态，以及必要时的 `cause` 链。日志不得包含令牌、完整个人数据或敏感请求体。把“用户取消”“旧结果丢弃”“服务失败”分开统计，才能知道系统是真的不稳定，还是用户快速切换产生了正常取消。

### 十二、测试异步控制流要验证协议，而不只验证一次结果

异步测试应主动控制完成顺序，而不是靠真实网络和 `setTimeout(100)` 猜测：

1. 用可手动 resolve/reject 的 Promise 控制旧请求和新请求谁先完成；
2. 分别验证成功、失败、取消、超时和清理失败；
3. 让旧请求最后成功，确认它不能覆盖新状态；
4. 让组合中的一项拒绝，确认其他工作是否按合同继续或被取消；
5. 用虚拟时钟验证退避、最大次数和总预算；
6. 对写操作验证同一幂等键的重放只产生一个业务结果；
7. 在函数返回后检查监听器、timer 和 loading 是否已经收起。

测试的核心不是把每个 `then` 都 mock 掉，而是构造会破坏协议的时间顺序。能够在确定性测试里交换完成顺序，才说明代码没有偷偷依赖“请求通常按发出顺序回来”。

### 常见误解

- “`await` 会把整个浏览器线程停住”：它只暂停当前异步函数后续，并把恢复安排进 Promise 调度。
- “有 `catch` 就不会丢错误”：`catch` 若无意中正常返回，链会恢复为成功。
- “`Promise.all` 失败会取消其他 Promise”：组合结果提前拒绝，已启动工作不会自动停止。
- “调用 `abort` 后旧结果绝不可能提交”：仍需在共享状态提交处做版本或所有权门禁。
- “GET 永远可以无限重试”：还受时间、负载、权限变化与产品等待预算限制。
- “超时等于服务端没有执行”：网络结果未知时，写操作可能已经生效。
- “全局未处理拒绝监听器可以代替局部错误处理”：它只能提供最后诊断，无法恢复局部业务语义。

### 学完后应能说明

1. `.then`、`.catch`、`.finally` 返回的新 Promise 如何由处理器结果决定。
2. 为什么捕获错误的位置应对应真正能恢复的责任层。
3. Promise 组合、并发限制、取消与过期结果抑制分别解决什么问题。
4. 哪些失败可以重试，幂等键、退避、抖动和总预算怎样共同限制风险。
5. 如何用确定的完成顺序验证旧结果、清理、取消和重试协议。

下一步进入 [JS-06 ES Modules 与模块边界](../chinese-guides/js-06-es-modules-module-boundaries.md#js-06) 时，会继续使用动态导入返回的 Promise，并把错误边界扩展到模块加载与求值阶段。
