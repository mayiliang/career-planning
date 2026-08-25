# 浏览器运行时与存储中文核心讲义

本讲义只承担知识库中与固定挑战直接相关的浏览器运行时知识。浏览器内部实现会演进，阶段名称用于建立可测的因果模型，不应把某个引擎的一次轨迹当成所有浏览器的永久规则。

## BROWSER-01

### 1. 重要术语

- **DOM（Document Object Model，文档对象模型）**：HTML 解析后的节点树。
- **CSSOM（CSS Object Model，CSS 对象模型）**：样式表解析后的规则模型。
- **Render Tree（渲染树）**：参与视觉渲染的 DOM 内容与计算样式的组合模型。
- **Style Calculation（样式计算）**：确定元素最终使用哪些 CSS 声明。
- **Layout（布局，也常称 reflow，重排）**：计算元素的几何尺寸和位置。
- **Paint（绘制）**：生成背景、文字、边框、阴影等绘制指令。
- **Composite（合成）**：把不同图层组合成最终画面。合成不等于“完全免费”，图层也占显存和管理成本。
- **Event Propagation（事件传播）**：事件沿路径经历 capture（捕获）、target（目标）和 bubble（冒泡）的过程。
- **Event Delegation（事件委托）**：在稳定祖先上监听可冒泡事件，再依据目标处理动态子项。
- **Transaction（事务）**：一组操作作为整体成功或整体失败的边界。
- **Object Store（对象仓库）**：IndexedDB 按键保存结构化对象的容器，近似表但不是关系表。

### 2. 从 HTML/CSS 到像素

首次显示的主线可以简化为：

```text
HTML -> DOM --┐
              ├-> render tree -> style -> layout -> paint -> composite
CSS  -> CSSOM-┘
```

JavaScript 可以在任意时刻修改 DOM 或样式，因此运行时更新不是每次都完整重走全链。具体哪些属性使哪些阶段失效应以 Performance 录制为准：

| 修改 | 常见影响 | 不可草率下的结论 |
| --- | --- | --- |
| 改宽高、内容或盒模型 | style，可能 layout/paint/composite | “改一个 class 一定只重绘” |
| 改颜色或阴影 | style，常见为 paint/composite | “没有 layout 就没有成本” |
| 改 transform/opacity | 在适当条件下可主要走 composite | “强制创建大量图层一定更快” |

**Forced Synchronous Layout（强制同步布局）** 常来自“写—读—写—读”交错：刚改样式又读取 `getBoundingClientRect()`、`offsetWidth` 等几何信息，浏览器为了返回当前值被迫提前完成布局。把读取集中在前、写入集中在后，并用真实轨迹验证。

```js
const rows = [...document.querySelectorAll('[data-row]')];
const widths = rows.map((row) => row.getBoundingClientRect().width); // 批量读
rows.forEach((row, index) => {                                     // 批量写
  row.style.setProperty('--measured-width', `${widths[index]}px`);
});
```

固定挑战用 DevTools Performance 录制一次 class 修改，交付：操作时间点、主线程轨迹、Style/Layout/Paint/Composite 中实际出现的阶段、最长阶段和修改前后截图。没有录制就不能声称某个阶段是根因。

### 3. 100 项列表的事件委托与清理

`event.target` 是最初触发事件的节点，可能是按钮里的图标；`event.currentTarget` 是当前执行监听器的节点。委托时应使用 `closest()` 找到真正动作元素，再确认它仍属于容器。

```html
<ul id="items">
  <!-- 固定生成 100 个 li；第 73 项的按钮带 data-id="73" -->
  <li><button type="button" data-select data-id="73"><span>第 73 项</span></button></li>
</ul>
```

```js
function mountList(container) {
  const controller = new AbortController();
  let handled = 0;

  container.addEventListener('click', (event) => {
    const button = event.target.closest('[data-select]');
    if (!button || !container.contains(button)) return;
    handled += 1;
    console.log({
      id: button.dataset.id,
      target: event.target.tagName,
      currentTarget: event.currentTarget.id,
      handled,
    });
  }, { signal: controller.signal });

  return {
    getHandled: () => handled,
    unmount: () => controller.abort(),
  };
}
```

固定断言：点击第 73 项内层 `<span>`，`id === '73'` 且 `handled === 1`；执行 `unmount()` 后再次点击，计数不变。若一次点击触发两次，按以下顺序证伪：

1. mount 是否执行两次、旧 controller 是否未 abort；
2. 是否同时在子项和容器监听同一行为；
3. 是否误把冒泡的父监听器调用当成浏览器“重复派发”。

`stopPropagation()` 会改变整个传播链，只应在交互语义确实要求隔离时使用，不能把它当监听器泄漏的通用修复。

### 4. Cookie、Web Storage 与 IndexedDB 的选型

| 能力 | Cookie | sessionStorage / localStorage | IndexedDB |
| --- | --- | --- | --- |
| 典型用途 | 服务端会话标识、小型请求状态 | 小型字符串偏好、单标签临时状态 | 大量结构化数据、离线草稿、索引查询 |
| 调用方式 | 匹配条件下随 HTTP 请求；JS 可见性由 HttpOnly 决定 | 同步字符串键值 API，会阻塞当前 JS | 异步、事务化、支持结构化克隆与索引 |
| 生命周期 | 由会话/Expires/Max-Age 等决定 | session 按标签会话；local 持久到清除/驱逐 | 持久到清除/驱逐，受配额策略影响 |
| 一致性 | 由服务端与请求语义控制 | 单项 set/remove；无多键事务 | 指定对象仓库 scope 的事务 |
| 安全边界 | 会话 cookie 通常需要 Secure、HttpOnly、SameSite | 脚本可读，XSS 可窃取 | 脚本可读，XSS 可窃取 |

容量数字会随浏览器、设备、隐私模式和配额策略变化，不能把“5MB”当唯一选型依据。浏览器存储都不是可信安全区，不保存长期根密钥或可直接代表高价值授权的秘密。

### 5. IndexedDB 的版本升级和原子失败

`indexedDB.open(name, 2)` 的 `2` 是数据库 schema version（模式版本）。只有在 `upgradeneeded` 对应的 versionchange transaction（版本变更事务）中创建或删除对象仓库/索引。升级失败或事务 abort 后，不应留下“半个新模式”。

下面的固定 fixture 从 v1 的草稿 `{id:'d1',step:1}` 升级到 v2，并同时建立 `meta` 仓库。`failBeforeStep2` 用于验证中断时整个升级回滚。

```js
function openDraftDB(version, { failBeforeStep2 = false } = {}) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('browser-01-fixture', version);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const tx = request.transaction;

      if (event.oldVersion < 1) {
        const drafts = db.createObjectStore('drafts', { keyPath: 'id' });
        drafts.put({ id: 'd1', step: 1 });
      }

      if (event.oldVersion < 2) {
        const meta = db.createObjectStore('meta', { keyPath: 'key' });
        meta.put({ key: 'schema', value: 2 });
        if (failBeforeStep2) {
          tx.abort();
          return;
        }
        tx.objectStore('drafts').put({ id: 'd1', step: 2 });
      }
    };

    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('升级被旧连接阻塞'));
    request.onsuccess = () => resolve(request.result);
  });
}
```

验证步骤：

1. 打开 v1，等事务完成后读取 `d1.step === 1`，关闭连接；
2. 以 `failBeforeStep2:true` 打开 v2，预期打开失败；重新打开 v1，仍只有 `drafts` 且 step 为 1；
3. 正常打开 v2，预期数据库版本 2、`meta.schema === 2` 且 `d1.step === 2`；
4. 记录 `complete`、`abort`、`error`，不要在单个 request 成功时就宣布整个事务完成。

旧标签页保持连接会触发新请求的 `blocked`；生产代码还应监听旧连接的 `versionchange` 并关闭/提示刷新。固定挑战只验证同一浏览器中的升级与回滚，不延伸到多设备同步。

### 6. 受限排错

给定“点击一次触发两次、升级中断后出现半成品、轨迹连续 Layout”：

| 候选 | 只收集什么证据 | 允许的修复 |
| --- | --- | --- |
| 监听器清理 | mount/unmount 次数、controller 状态、单次点击 handled 计数 | abort 旧 listener，保证挂载幂等 |
| 冒泡目标 | target/currentTarget/closest 路径 | 修正委托选择器或监听层级 |
| 事务 scope/读写 | upgrade 事件、事务 complete/abort、v1/v2 重开快照 | 把相关 schema/data 操作放入同一升级事务 |

“连续 Layout”不能由这三项直接推出根因。先在固定 class 修改录制中检查是否存在几何读写交错；如果根因超出允许候选，应报告题目边界，而不是篡改证据。

### 7. 自检与交付

- 为什么 `event.target` 不能直接假设是按钮？
- 为什么 request 的 `success` 不等于 IndexedDB transaction 已完成？
- 为什么 localStorage 可持久化仍不适合大型离线草稿？
- 为什么 transform 动画也不能无测量地声称“零成本”？

交付必须包含 Performance 轨迹、事件路径与清理日志、v1/v2/abort 三组数据库快照和中断恢复测试。四问与证据全部通过，才算掌握本点。

## BROWSER-02

### 1. 用变化信号替代高频轮询

**Observer（观察器）** 让浏览器在已经知道变化时批量通知代码，不代表回调不消耗主线程：

| 观察器 | 观察什么 | 常见误用 |
| --- | --- | --- |
| IntersectionObserver（交叉观察器） | 元素与视口/根的交叉变化 | 用它要求像素级、每帧同步位置 |
| ResizeObserver（尺寸观察器） | 元素内容盒/边框盒尺寸变化 | 回调里反复改尺寸造成 resize loop |
| MutationObserver（变更观察器） | DOM 子树、属性或文本变化 | 无限制观察整个 document 且处理所有记录 |
| PerformanceObserver（性能观察器） | 浏览器暴露的性能条目 | 把本地单次条目当全体用户体验 |

创建者负责在卸载时 `disconnect()`；回调只收集必要记录并批量处理。视觉帧内必须发生的更新用 `requestAnimationFrame()`；可无限推迟且允许不执行的工作才考虑空闲回调。Observer、rAF 和调度器解决的是不同问题。

### 2. Task、yield、continuation 和 priority

- **Task（任务）**：事件循环一次取出执行的工作。长任务长期占用主线程，输入和绘制只能等待。
- **Yield（让出）**：主动结束当前执行片段，让浏览器处理其他待办工作。
- **Continuation（延续）**：`await scheduler.yield()` 之后尚未执行的函数部分。
- **Priority（优先级）**：`user-blocking`、`user-visible`、`background` 表达相对用户价值，不是执行时限保证。
- **INP（Interaction to Next Paint，交互到下次绘制）**：用户交互延迟指标；固定挑战只比较同一设备和步骤的录制，不用一次实验代表线上全体用户。

`scheduler.yield()` 的延续通常优先于同级新任务，但它不是 Baseline（广泛可用基线）能力，必须检测并回退。它也不会自动响应 AbortSignal，所以要在每批前后检查取消。

```js
const fallbackYield = () => new Promise((resolve) => setTimeout(resolve, 0));

async function yieldToMain() {
  if (globalThis.scheduler?.yield) {
    await globalThis.scheduler.yield();
  } else {
    await fallbackYield();
  }
}

async function processItems(items, { signal, chunkSize = 100, onChunk }) {
  for (let start = 0; start < items.length; start += chunkSize) {
    signal.throwIfAborted();
    const end = Math.min(start + chunkSize, items.length);
    for (let i = start; i < end; i += 1) doWork(items[i]);
    onChunk({ start, end, chunk: end / chunkSize });
    await yieldToMain();
    signal.throwIfAborted();
  }
}
```

固定运行器：

```js
async function runFixture(items) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('12ms fixture cancel'), 12);
  const chunks = [];
  const startedAt = performance.now();

  try {
    const job = () => processItems(items, {
      signal: controller.signal,
      chunkSize: 100,
      onChunk: (entry) => chunks.push(entry),
    });

    if (globalThis.scheduler?.postTask) {
      await scheduler.postTask(job, {
        priority: 'user-visible',
        signal: controller.signal,
      });
    } else {
      await job();
    }
    return { status: 'done', chunks };
  } catch (error) {
    if (!controller.signal.aborted) throw error;
    return { status: 'aborted', reason: controller.signal.reason, chunks };
  } finally {
    clearTimeout(timer);
    console.log({ totalMs: performance.now() - startedAt, chunks: chunks.length });
  }
}
```

数据固定为 10000 项、每批 100。记录有/无 `scheduler` 两条路径的总耗时、最长任务、交互录制和取消批次。机器过快导致 12ms 前完成时，应增加固定 `doWork` 计算量而不是偷偷改变取消时间；两条路径必须使用同一输入和工作函数。

### 3. 页面不是永远 active

- **visible/hidden（可见/隐藏）**：由 `document.visibilityState` 观察；hidden 往往是最后可靠的保存机会。
- **frozen/resumed（冻结/恢复）**：冻结时可冻结任务队列暂停，页面可能永远不恢复。
- **BFCache（Back/Forward Cache，往返缓存）**：后退/前进可能恢复整个页面状态而不是重新加载；`pageshow.persisted` 可用于识别恢复。
- **discarded（舍弃）**：页面在资源压力下被移除，无法在舍弃发生时运行回调；重新加载后可检查 `document.wasDiscarded`。

不要依赖 `unload` 保存关键状态。进入 hidden 时幂等保存并停止用户看不到的轮询；freeze/pagehide 时释放 IndexedDB 连接、BroadcastChannel、Web Locks 和网络连接，避免阻碍 BFCache 或其他标签页。

```js
function mountLifecycle({ save, stopPolling, releaseLeader, resume }) {
  const controller = new AbortController();
  const options = { signal: controller.signal, capture: true };
  let savedRevision = -1;

  const saveOnce = () => {
    const revision = getRevision();
    if (revision === savedRevision) return;
    save();
    savedRevision = revision;
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      saveOnce();
      stopPolling();
    }
  }, options);
  document.addEventListener('freeze', () => {
    saveOnce();
    stopPolling();
    releaseLeader();
  }, options);
  window.addEventListener('pagehide', () => releaseLeader(), options);
  window.addEventListener('pageshow', (event) => resume({ fromBFCache: event.persisted }), options);

  return () => controller.abort();
}
```

`resume()` 必须幂等：恢复前先检查订阅是否仍存在，不能每次 pageshow 都再创建计时器和消息监听器。

### 4. BroadcastChannel 是消息总线，不是锁

BroadcastChannel（广播频道）在同源窗口、标签页、frame 和 Worker 间广播结构化克隆消息；发送对象自身不会收到自己的消息。频道名不是安全权限，消息仍需验证 schema（模式）和版本。

```js
const channel = new BroadcastChannel('browser-02-coordination-v1');
const tabId = crypto.randomUUID();
let seq = 0;

function publish(type, payload = {}) {
  channel.postMessage({ version: 1, type, tabId, seq: ++seq, ...payload });
}

channel.addEventListener('message', ({ data }) => {
  if (data?.version !== 1 || typeof data.type !== 'string') return;
  if (data.tabId === tabId) return;
  consumePeerMessage(data);
});
```

每个接收端按 `(tabId, seq)` 去重；不识别的 version/type 安全忽略并记录。结束时 `channel.close()`。BroadcastChannel 不保存历史，新打开标签不会自动收到旧消息。

### 5. Web Locks 建立同源单领导者

**Web Locks API（Web 锁 API）** 在同源标签页/Worker 之间协调同名锁。回调存续期间持锁，回调完成后自动释放。固定 fixture 用 `ifAvailable:true` 尝试成为 leader（领导者），用 AbortController 在冻结时结束任期。

```js
function createLeaderTerm() {
  const term = new AbortController();
  let role = 'follower';

  const finished = navigator.locks.request(
    'browser-02-single-leader',
    { ifAvailable: true, signal: term.signal },
    async (lock) => {
      if (!lock) return;
      role = 'leader';
      publish('leader-started');
      await new Promise((resolve) => {
        term.signal.addEventListener('abort', resolve, { once: true });
      });
      publish('leader-stopped');
      role = 'follower';
    },
  ).catch((error) => {
    if (!term.signal.aborted) throw error;
  });

  return {
    role: () => role,
    stop: (reason = 'term ended') => term.abort(reason),
    finished,
  };
}
```

标签 A 获锁后处理到第 20 批，模拟 freeze：取消工作、停止任期、关闭频道。标签 B 随后重新尝试并成为唯一 leader。A 恢复时先重建一次频道和生命周期订阅，再尝试锁；若 B 仍持锁，A 必须保持 follower。

无 Web Locks 时，不可用 BroadcastChannel 心跳冒充强互斥：后台限流、冻结和同时启动都可能造成 split brain（脑裂，两个领导者）。安全降级是停用只能单实例执行的副作用并显示说明，或把租约/幂等键交给服务端；本地只读计算可允许每标签独立运行。

### 6. 固定日志和受限排错

每条记录至少包含 `time, tabId, lifecycle, role, jobId, chunk, messageVersion, schedulerPath`。固定断言：

1. 12ms Abort 后不再出现新 chunk；
2. hidden 后轮询计数不再增长；
3. A freeze 后释放锁，A/B 任一时刻最多一个 leader；
4. A resume 后订阅数仍为 1；
5. 无 scheduler 时走 setTimeout fallback，任务仍能取消；
6. version 2 消息在只支持 version 1 时被拒绝并记录。

给定“hidden 仍每秒运行、恢复后订阅两次、A/B 同时 leader”，只查：visibility 清理、pageshow 幂等恢复、锁任期/消息版本。不要把固定延时加长到“看起来不冲突”。

### 7. 自检

- `scheduler.yield()` 为什么既不等于空闲任务，也不保证立刻执行？
- hidden、frozen、discarded 分别还能否运行代码？
- BroadcastChannel 为什么不能保证单领导者？
- 为什么没有 Web Locks 时必须明确降级而不是写一个永久心跳？

能用 A/B 双标签日志回答四问并通过六项断言，才算掌握本点。
