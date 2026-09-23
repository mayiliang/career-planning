# 浏览器协作机制学习资料

## BROWSER-02 让页面及时响应，也能暂停与恢复

页面里有三类常见工作：卡片接近阅读区域时加载内容，批量整理资料时持续显示进度，两个标签页都打开时避免重复执行同一任务。它们分别需要变化通知、调度和协调，不能都靠一个高频定时器解决。

本篇把这些工作拆开，再用可操作的例子把它们接起来。重点是理解：谁发出信号，谁执行工作，何时让出主线程，暂停后靠什么恢复。

### 学习前先确认

- 直接前置：[BROWSER-01 渲染流水线、DOM 事件与存储](../chinese-guides/browser-01-render-events-storage.md#browser-01)。需要理解事件回调、渲染机会和事务提交。

### 一、先选择信号，再安排工作

**观察器（Observer）**是订阅变化的工具。它通常批量交付记录，减少没变化时仍不断检查的浪费；回调仍需要时间，并不会因为 API 名字里有 Observer 就变成后台线程。

| 你真正想知道的事 | 合适入口 | 容易选错的做法 |
| --- | --- | --- |
| 目标是否接近滚动区域 | IntersectionObserver | 每 16 ms 扫全页矩形 |
| 组件实际宽度是否变化 | ResizeObserver | 只监听窗口 resize |
| 外部脚本改了哪些 DOM 属性 | MutationObserver | 从整个 body 反推应用状态 |
| 浏览器产生了哪些性能条目 | PerformanceObserver | 用 console 时间当作全部用户指标 |
| 纯 CSS 布局能否随容器变化 | CSS 容器查询 | 为每个断点安装尺寸回调 |

观察器只回答它负责的问题。拿到“交叉了”的记录后，加载多少数据、是否取消旧请求、怎样处理失败，仍由应用决定。可以先读 [WEB-03 的容器查询](../chinese-guides/web-03-modern-css-architecture-container-progressive.md#web-03)，避免用脚本重复实现纯样式需求。

### 二、交叉不等于用户真的读到了

**IntersectionObserver** 比较目标与 root 的交叉几何。root 可以是视口，也可以是指定滚动容器；rootMargin 调整判定范围，threshold 决定关注哪些比例变化。

例如为文章末尾的“下一篇”设置正的 rootMargin，是让它还没真正进入视野时就开始准备数据。此时收到记录，不能直接计为“用户看到了推荐”。目标也可能被其他内容遮住、透明，或所在标签处于后台。

曝光通常还需要持续时间、页面可见状态、业务 ID 与去重。快速滚过一次不等于认真阅读。虚拟列表复用 DOM 时，应核对元素当前对应哪份资料，不要把上一次绑定的 ID 留在闭包里。

回调也会给出初始观测记录，并非只有用户滚动后才调用。观察到目标离开区域的记录同样正常。需要逐像素跟随指针时，这个异步几何通知不是合适的同步输入源。

### 三、同时观察宽度、滚动与属性

保存为 `observers.html` 并打开：切换宽度时，看内容盒宽度变化；滚动框到底部，看交叉状态变化；点击“切换外部属性”，看 MutationObserver 收到的属性记录。这里用按钮模拟外部代码，不是在推荐应用先改 DOM 再反推自己的状态。

```html example=browser-observers runtime=project file=observers.html
<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<title>三个不同的变化信号</title>
<style>
  body { margin: 3rem; font: 18px/1.7 system-ui; color: #172d3c; }
  button { font: inherit; padding: .6rem; margin: .4rem; }
  :focus-visible { outline: 3px solid #005fcc; outline-offset: 3px; }
  #box { width: 360px; height: 180px; overflow: auto; border: 2px solid #73899b; }
  #space { height: 400px; background: linear-gradient(#eef4fa, #d8e7f3); }
  #target { height: 60px; background: #173f61; color: white; }
</style>
<main>
  <h1>三个不同的变化信号</h1>
  <button id="width">切换宽度</button><button id="mutate">切换外部属性</button>
  <button id="stop">停止观察</button>
  <div id="box" tabindex="0" role="region" aria-label="可滚动示例">
    <div id="space">向下滚动，找到底部目标。</div>
    <div id="target" data-state="idle">底部目标</div>
  </div>
  <p id="size">等待尺寸记录</p><p id="intersection">等待交叉记录</p>
  <p id="mutation">尚未改变属性</p><p id="status" role="status"></p>
</main>
<script>
  const el = (id) => document.getElementById(id);
  const box = el('box');
  const target = el('target');
  const observers = [];
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(([entry]) => {
      el('size').textContent = `内容盒宽度：${Math.round(entry.contentRect.width)} px`;
    });
    ro.observe(box); observers.push(ro);
  } else el('size').textContent = '此浏览器没有 ResizeObserver';
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(([entry]) => {
      el('intersection').textContent = entry.isIntersecting ? '目标已交叉' : '目标未交叉';
    }, { root: box, threshold: [0, 1] });
    io.observe(target); observers.push(io);
  } else el('intersection').textContent = '此浏览器没有 IntersectionObserver';
  if ('MutationObserver' in window) {
    const mo = new MutationObserver((records) => {
      el('mutation').textContent = `${records[0].attributeName}：${target.dataset.state}`;
    });
    mo.observe(target, { attributes: true, attributeFilter: ['data-state'] });
    observers.push(mo);
  } else el('mutation').textContent = '此浏览器没有 MutationObserver';
  let wide = false;
  el('width').onclick = () => { wide = !wide; box.style.width = wide ? '520px' : '360px'; };
  el('mutate').onclick = () => {
    target.dataset.state = target.dataset.state === 'idle' ? 'ready' : 'idle';
  };
  el('stop').onclick = () => {
    observers.forEach((observer) => observer.disconnect());
    el('status').textContent = '观察已停止，界面仍可操作；刷新可重新开始。';
  };
</script>
</html>
```

预期宽度从 360 变为 520，底部目标从未交叉变为已交叉，属性记录从尚未改变变成 `data-state：ready`。停止观察后按钮仍会改变 DOM，但显示的观测结果保持不动。显示区域的文字不是实时数据源，只是上一次收到通知时的记录。

代码把观察结果写到被观察区域之外，且没有修改目标宽度。这避免了“读到宽度—把宽度加 10—再次读到更大宽度”的反馈环。

### 四、尺寸回调必须能够收敛

**ResizeObserver** 可以观察内容盒或边框盒等尺寸，选择要与计算目的对应。文字换行、侧栏展开、字体加载都可能改变组件尺寸，即使窗口大小完全没变。

若回调不断给自己观察的元素加宽，浏览器可能报告 resize loop，或把部分通知延后。把写入塞进 requestAnimationFrame 只能改变发生时机，不能让“每次加 10”这个无终点规则自动收敛。

可以记录期望尺寸，只在新旧结果确实不同时更新；或观察外层、修改不会反过来影响外层的内部画布分辨率。Canvas 的 CSS 尺寸与像素尺寸还要分别处理，并考虑 devicePixelRatio。纯样式布局则优先让 CSS 完成。

观察器的成本也取决于回调。拖动桌面分栏时，若每次尺寸通知都重新构造几千个图形，仍然会卡；可以合并到最近一帧，只处理最新尺寸，而不是依次重放所有中间状态。

### 五、DOM 记录与性能条目有不同用途

**MutationObserver** 适合接入编辑器、第三方控件等自己无法直接拥有状态的边界。限定根、变化类型与 attributeFilter，减少无关记录。回调再次修改所观察的属性，可能产生后续记录；比较目标值、划分所有权，比无条件重新写一遍更可靠。

**PerformanceObserver** 订阅浏览器提供的性能条目。不同环境的 supportedEntryTypes 不同，不能把某一种 entry 当作所有浏览器都有。下面是可在页面控制台运行的独立观察片段，运行十秒后自动停止；没有 longtask 支持时明确说明。

```js example=browser-performance-observer runtime=project
if ('PerformanceObserver' in window &&
    PerformanceObserver.supportedEntryTypes.includes('longtask')) {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log('longtask', Math.round(entry.duration), 'ms');
    }
  });
  observer.observe({ type: 'longtask', buffered: true });
  setTimeout(() => observer.disconnect(), 10000);
} else {
  console.log('当前环境不提供 longtask 条目');
}
```

没有输出可能只是这段时间没有符合条件的条目。longtask 也不是 INP；指标采集需要遵循对应定义，处理候选更新、页面状态与样本。实际监控应尽量记录版本、路径和必要设备信息，避免把用户正文当作性能日志上传。

### 六、让出主线程与等待 Promise 不同

`await Promise.resolve()` 会把后续工作安排到微任务。持续追加微任务，仍可能延迟输入与绘制；它不是保证页面响应的切片工具。

| 入口 | 适合的工作 | 不保证什么 |
| --- | --- | --- |
| requestAnimationFrame | 绘制前提交一批视觉变化 | 不提供新的计算线程，也不保证后台持续运行 |
| scheduler.yield | 让当前工作在后续任务继续 | 不保证下一次一定先绘制，也不自动中断当前同步片段 |
| scheduler.postTask | 表达相对优先级 | 不是必须在某毫秒前完成的截止承诺 |
| setTimeout | 建立未来任务，作为简单回退 | 0 不表示立刻执行，隐藏页还可能限流 |
| requestIdleCallback | 可以推迟的可选工作 | 不适合必须尽快完成的保存步骤 |
| Worker | 隔离可并行计算 | 不能直接操作页面 DOM |

**让出（Yield）**的关键，是结束当前片段，让浏览器有机会安排其他工作。切片改善的可能是响应延迟，总耗时反而略长。单次同步工作仍很大时，外面包再多 yield 也无法把它从中间切开。

### 七、运行一段可以取消的批量计算

保存为 `sliced-work.html`。开始计算后仍可点击“试试响应”或“取消”；完成后显示已处理 200000 项。勾选“强制使用定时器回退”再运行，结果仍应相同。示例计算每项平方根之和来制造可重复的 CPU 工作，不代表真实业务算法。

```html example=browser-sliced-work runtime=project file=sliced-work.html
<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<title>能暂停的批量计算</title>
<style>
  body { max-width: 52rem; margin: 3rem auto; padding: 0 2rem;
    font: 18px/1.7 system-ui; color: #172d3c; }
  button { font: inherit; padding: .6rem; margin: .4rem; }
  :focus-visible { outline: 3px solid #005fcc; outline-offset: 3px; }
  progress { display: block; width: 100%; margin-block: 1rem; }
</style>
<main>
  <h1>能暂停的批量计算</h1>
  <label><input id="fallback" type="checkbox">强制使用定时器回退</label>
  <p><button id="start">开始计算</button><button id="cancel" disabled>取消</button>
    <button id="ping">试试响应</button></p>
  <label for="progress">处理进度</label><progress id="progress" max="200000" value="0"></progress>
  <p id="detail">尚未开始</p><p id="ping-result">响应次数：0</p>
  <p id="result" role="status"></p>
</main>
<script>
  const el = (id) => document.getElementById(id);
  let active = null;
  let responses = 0;
  el('ping').onclick = () => { el('ping-result').textContent = `响应次数：${++responses}`; };
  el('cancel').onclick = () => active?.abort();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) active?.abort();
  });
  el('start').onclick = async () => {
    const controller = new AbortController();
    active = controller;
    const forceTimer = el('fallback').checked;
    const canYield = !forceTimer && typeof globalThis.scheduler?.yield === 'function';
    const pause = () => canYield ? globalThis.scheduler.yield()
      : new Promise((resolve) => setTimeout(resolve, 0));
    el('start').disabled = true; el('cancel').disabled = false; el('fallback').disabled = true;
    el('progress').value = 0; el('result').textContent = '计算中，可取消。';
    let done = 0;
    let checksum = 0;
    try {
      while (done < 200000) {
        controller.signal.throwIfAborted();
        const deadline = performance.now() + 4;
        do {
          for (let j = 0; j < 200; j++) checksum += Math.sqrt(done + j);
          done++;
        } while (done < 200000 && performance.now() < deadline);
        controller.signal.throwIfAborted();
        el('progress').value = done;
        el('detail').textContent = `已处理 ${done} 项；${canYield ? 'scheduler.yield' : '定时器回退'}`;
        if (done < 200000) await pause();
      }
      controller.signal.throwIfAborted();
      el('result').textContent = `完成：${done} 项，校验和 ${Math.round(checksum)}`;
    } catch (error) {
      el('result').textContent = controller.signal.aborted
        ? `已取消，停在 ${done} 项；再次开始会从头计算。`
        : `计算失败：${error.message}`;
    } finally {
      if (active === controller) active = null;
      el('start').disabled = false; el('cancel').disabled = true; el('fallback').disabled = false;
    }
  };
</script>
</html>
```

进度文字不设为 live region，避免每几毫秒打断阅读；最终结果才通过状态区提示。开始按钮在执行时禁用，因此本例只有一个任务。若产品允许新任务替换旧任务，还需要 jobId 或递增序号，防止旧结果覆盖新任务。

4 ms 是教学预算，不是所有设备的最佳值。一次内层计算若已超过预算，JavaScript 仍会把它执行完，再检查时钟。取消同样发生在代码检查 signal 时，并非按下按钮就能中断当前指令。

本例隐藏页面时取消计算，再开始从头运行。它展示的是清楚的取消语义，没有假装已实现检查点续算。两个分支使用同样的输入与计算顺序，应该得到相同校验和；响应性与总耗时则需分开观察。

### 八、什么时候把工作搬进 Worker

**Worker** 有自己的执行环境，适合可隔离的解析、搜索索引或图像计算。若工作需要频繁直接读取 DOM，先把数据提取出来，才能移动计算边界。

发送对象通常涉及结构化克隆；转移 ArrayBuffer 的所有权后，发送侧不能继续把原缓冲当作可用数据。数据搬运、Worker 启动与内存峰值都需要计算在收益里，不能只比较循环运行时间。

一个清楚的协议可以包含 `{type, jobId, sequence, payload}`。开始后主线程只接受当前 jobId 的结果；取消时通知 Worker，Worker 在自己的片段边界检查。若 Worker 正在执行一段长同步循环，它也要等处理消息的机会，取消消息不会在任意指令中间插入。

终止 Worker 可以立即结束它，但会失去内部进度；需要恢复的任务先设计检查点。主线程切片与 Worker 不是二选一，Worker 内部也可能需要分段，方便响应新的控制消息。

### 九、页面隐藏、冻结和返回时发生什么

**页面生命周期（Page Lifecycle）**不止 load 与 unload。切换标签使页面 hidden；浏览器可能进一步冻结部分任务，或直接舍弃页面；后退前进也可能从 BFCache 恢复原有页面内存。

| 信号或状态 | 可以做什么 | 不能假定什么 |
| --- | --- | --- |
| visibilitychange → hidden | 停止不必要工作，尽早保存小状态 | 不代表页面一定关闭 |
| pagehide | 为离开或进入缓存释放资源 | 不是所有退出都一定送达 |
| freeze / resume | 在支持的环境协助暂停与恢复 | 不是所有浏览器都有的通用事件 |
| pageshow.persisted 为 true | 识别从 BFCache 恢复 | 不应重新安装一遍仍存在的监听器 |
| 页面被 discarded | 下次加载从持久状态恢复 | 被舍弃时没有收尾回调可依赖 |

**往返缓存（Back-Forward Cache）**可以保留完整页面状态。恢复时不能直接把启动函数无条件再执行一次，否则容易出现两份轮询、两条连接。也不能直接相信冻结前的账号、权限和数据仍然有效，应按需要重新验证。

hidden 往往是能较早捕获的保存机会，但任何关闭信号都不是持久化保证。重要草稿在编辑过程中就应持续保存，隐藏时再尽力补齐；不要等 unload 才第一次写入。sendBeacon 返回 true 只表示浏览器接受排队，不是服务器成功处理的收据。

### 十、广播是提醒，不是可靠状态历史

**BroadcastChannel** 在满足同源与存储分区条件的上下文间通信。不同顶层站点下嵌入的同源页面，不一定属于同一可通信分区。调用 postMessage 的频道对象不会收到自己的那次消息；另一个同页频道对象也可能是接收者，不能笼统写成“本页绝不收到”。

频道没有历史。A 广播完再打开 B，B 不会自动补收到过去的消息。因此消息可以设计为 `{v: 1, type: 'draft-changed', id, revision}`，接收端核对版本与字段后重新读取真源；启动时也主动读取。

广播和心跳都不负责互斥。A 长时间没有听见 B，可能是 B 被限流或冻结，并不能证明 B 已退出。依赖“谁最近没说话”决定唯一领导者，很容易让两边同时开始。

### 十一、用两个标签页观察锁的持有与释放

**Web Locks** 让同一受支持协调范围内的上下文申请命名锁。独占锁的回调开始执行时才算获得锁；回调返回的 Promise 结束后释放。取消等待用请求的 signal，已经拿到锁后则要让回调自行结束，不能把 abort 等待信号当作强制释放按钮。

下面保存为 `tab-lock.html`，通过本地 HTTP 服务打开，并复制相同 URL 到第二个标签页。可以在只含示例文件的目录运行 `python -m http.server 43813 --bind 127.0.0.1`，随后访问 `http://127.0.0.1:43813/tab-lock.html`。localhost 属于可使用相关安全上下文 API 的本地开发场景；不要用 file URL 证明跨标签同源行为。

点击 A 的“尝试占用”，再点 B 的同名按钮。B 应立即显示占用中。释放 A 后，再点 B，它才能持锁。为了让这个对照容易观察，本例不会在切换到 B 导致 A 隐藏时自动释放；离开页面时会释放，它不模拟生产后台领导者策略。

```html example=browser-tab-lock runtime=project file=tab-lock.html
<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<title>两个标签轮流持锁</title>
<style>
  body { max-width: 48rem; margin: 3rem auto; font: 18px/1.7 system-ui; color: #172d3c; }
  button { font: inherit; padding: .6rem; margin: .4rem; }
  :focus-visible { outline: 3px solid #005fcc; outline-offset: 3px; }
</style>
<main>
  <h1>两个标签轮流持锁</h1>
  <p>复制当前 HTTP 地址到另一张标签页，再交替操作。</p>
  <button id="acquire">尝试占用</button><button id="release" disabled>释放</button>
  <p id="state" role="status">尚未申请</p><p id="message">尚未收到广播；消息不保存历史。</p>
</main>
<script>
  const el = (id) => document.getElementById(id);
  let release = null;
  let channel = null;
  let leaving = false;
  function connect() {
    if (channel || !('BroadcastChannel' in window)) return;
    channel = new BroadcastChannel('b13-lock-demo-v1');
    channel.onmessage = ({ data }) => {
      if (data?.v !== 1 || !['held', 'released'].includes(data.type)) return;
      el('message').textContent = `收到提示：${data.type}；是否可占用仍以锁结果为准。`;
    };
  }
  connect();
  el('acquire').onclick = async () => {
    if (!navigator.locks?.request) {
      el('state').textContent = '当前环境不支持 Web Locks，此演示停用占用功能。';
      return;
    }
    el('acquire').disabled = true;
    try {
      await navigator.locks.request('b13-demo-exclusive', { ifAvailable: true }, async (lock) => {
        if (!lock) { el('state').textContent = '其他标签正在占用，请稍后重试。'; return; }
        if (leaving) return;
        el('state').textContent = '本标签已持锁'; el('release').disabled = false;
        const untilReleased = new Promise((resolve) => { release = resolve; });
        channel?.postMessage({ v: 1, type: 'held' });
        try { await untilReleased; }
        finally { release = null; el('release').disabled = true; }
      });
      if (el('state').textContent === '本标签已持锁') {
        el('state').textContent = '本标签已释放';
        channel?.postMessage({ v: 1, type: 'released' });
      }
    } catch (error) { el('state').textContent = `申请失败：${error.message}`; }
    finally { el('acquire').disabled = false; }
  };
  el('release').onclick = () => release?.();
  window.addEventListener('pagehide', () => {
    leaving = true; release?.(); channel?.close(); channel = null;
  });
  window.addEventListener('pageshow', () => { leaving = false; connect(); });
</script>
</html>
```

这个例子没有存储任务进度，没有同步到服务器，也没有宣称锁能抵抗任意页面冻结。它只演示同一锁名的互斥和消息提醒之间的差别。新标签的广播栏仍可能空白，但只要已有标签持锁，它依然无法拿到锁。

### 十二、恢复靠检查点，外部副作用靠幂等

假设一个导入任务有十块数据，上一标签显示“处理到第六块”后崩溃。新的持锁者不能只相信内存或广播，应读取持久检查点，确认哪些块已经提交，再继续处理。

检查点可记录 jobId、版本、下一块编号和状态；每块外部写入使用稳定幂等键，例如 jobId 与 chunkId 的组合。若服务器已提交而本地没来得及记账，重试相同幂等键应返回已有结果，而不是重复新增。

Web Locks 只协调本地符合条件的上下文，不能约束另一个浏览器或另一台设备。服务端租约过期后旧执行者仍可能恢复，此时需要由权威端发放递增的 fencing token，并拒绝旧 token 的写入；客户端随机 termId 只能标识任期，不能凭空提供这种顺序保证。

没有 Web Locks 时，可以停用需要本地唯一执行者的功能，或者交由服务端协调。把 localStorage 心跳包装成“可靠锁”，会把未解决的并发问题藏在更好看的名字下面。

### 十三、资源要有明确的主人

一个阅读页面可能同时持有观察器、事件监听器、计时器、数据库连接和频道。为每一类写清创建、停止、恢复，能避免“离开页面后还在工作”。

停止函数应允许重复调用；恢复函数只创建缺失资源。本文频道例子用 `if (channel) return` 保证重复恢复不会创建多份对象。真正的页面还要处理 freeze、账号变化和路由卸载，按任务选择保存或取消。

恢复后也不应补跑隐藏期间错过的每一个定时器 tick。例如定时更新“距离截止还有多久”，应按当前时间重新计算一次，而不是重放一小时内的 3600 次更新。网络重连则保留退避和预算，避免所有标签同时发请求。

### 十四、用少量对照确认自己理解了什么

本文例子的观察点很具体：停止观察后记录不再更新；计算两种调度分支结果一致，取消后不出现完成结果；一张标签持锁时另一张失败，释放后可以接替。

这些结果不等于真实屏幕阅读器验证、完整页面冻结测试或服务器幂等证明。记录浏览器版本与操作即可，扩展到产品时再补对应证据。需要验证后台策略，就真的切换标签或使用浏览器生命周期工具；调用一个处理函数只能证明函数分支，不等于页面实际进入了冻结状态。

学完后可以尝试解释三个问题：为什么把长循环换成连续 await Promise.resolve 仍可能卡；为什么把 ResizeObserver 写入推迟一帧仍可能无限增宽；为什么广播“我是 leader”不能证明独占资格。它们分别对应调度、收敛与协调，正是本篇最需要分开的三个机制。

### 参考与延伸阅读

审校日期：2026-09-14。兼容性按具体 API 与目标环境核对，入口存在不等于所有子行为都已验证。

- [MDN：Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)、[ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver)：几何通知与尺寸反馈环。
- [MDN：MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver)、[PerformanceObserver](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver)：DOM 记录与性能条目的不同用途。
- [MDN：scheduler.yield](https://developer.mozilla.org/en-US/docs/Web/API/Scheduler/yield)：让出、优先级继承和兼容表。
- [Chrome：Page Lifecycle API](https://developer.chrome.com/docs/web-platform/page-lifecycle-api)：隐藏、冻结、舍弃和资源释放。
- [MDN：Broadcast Channel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API)：同源、存储分区与无历史通信。
- [MDN：Web Locks API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API)：持锁回调、可用性检查与请求取消。
