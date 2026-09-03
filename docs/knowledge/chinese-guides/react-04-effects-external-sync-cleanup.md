# React 知识点讲义

## REACT-04 Effect、外部同步与清理

Effect 是 React 中最容易被滥用的机制。它不是“组件渲染完以后想做什么都行”，而是把 React 树中的声明状态与某个外部系统保持同步。只有明确外部对象、建立动作、依赖和撤销动作，Effect 才形成完整协议；否则会出现重复请求、旧结果覆盖、订阅泄漏和更新循环。

### 学习前先确认

- 直接前置：[REACT-03 状态建模、派生状态与受控模式](../chinese-guides/react-03-state-model-derived-controlled.md#react-03)。它提供状态所有权，并会继续递归到模块与异步控制流基础。

自定义 Hook 在 REACT-05，Suspense 与错误恢复在 REACT-08。本讲只讨论 Effect 同步协议。

### 一、先问外部系统是谁

Effect 面向的是 React 之外的**外部系统（external system）**。读取的响应式值形成**依赖数组（dependency array）**，返回函数承担**清理函数（cleanup function）**职责；多个异步结果争夺同一界面状态时形成**竞态条件（race condition）**，可用**中止控制器（abort controller）**协作取消网络工作。

外部系统可以是网络连接、浏览器事件、计时器、媒体播放、地图实例、第三方编辑器或非 React 小部件。若没有外部系统，通常不需要 Effect。

```tsx
useEffect(() => {
  const connection = createConnection(serverUrl, roomId);
  connection.connect();
  return () => connection.disconnect();
}, [serverUrl, roomId]);
```

这段 Effect 的同步目标清晰：让连接与当前 serverUrl/roomId 一致。setup 建立连接，cleanup 撤销旧连接。依赖改变时先清理旧同步，再建立新同步；卸载时只清理。

### 二、Effect 有自己的启动/停止生命周期

组件生命周期常被描述为挂载、更新、卸载，但单个 Effect 更适合描述为“开始同步—停止同步”。同一组件仍挂载时，依赖变化就会让 Effect 重新同步多次。

这叫**响应式 Effect 生命周期（reactive effect lifecycle）**。它解释了为什么 cleanup 不能只考虑最终卸载：切换 roomId 时旧订阅也必须立刻解除。每次 setup 都应有对称 cleanup，并且 cleanup 只能撤销本次 setup 创建的资源。

### 三、依赖数组不是手工调度清单

Effect 中读取的每个响应式值——props、state、组件内声明的函数和对象——都应出现在依赖中。lint 规则根据代码推导依赖，不是建议列表。

遗漏依赖会让闭包长期看到旧值。为了“只运行一次”删除依赖只是隐藏同步需求。正确处理方法包括：把不需响应的常量移到组件外、把对象创建移到 Effect 内、使用函数式更新减少对旧 state 的读取，或把非响应事件逻辑拆到事件处理器/Effect Event。

### 四、对象和函数依赖要先检查设计

```tsx
const options = { serverUrl, roomId };
useEffect(() => connect(options), [options]);
```

每次 render 都创建新对象，依赖因引用不同而变化。优先把对象放进 Effect：

```tsx
useEffect(() => {
  const options = { serverUrl, roomId };
  return connect(options);
}, [serverUrl, roomId]);
```

不要第一反应就 `useMemo`/`useCallback`。稳定引用是优化工具，先缩小 Effect 的真实依赖和职责。若函数只是某次点击执行，把它放事件处理器，不要让 Effect 观察一个“应该发生动作”的布尔 state。

### 五、可在 render 计算的值不需要 Effect

```tsx
// 多余：先提交旧 fullName，再提交新 fullName
useEffect(() => setFullName(`${first} ${last}`), [first, last]);
```

直接 `const fullName = ...`。筛选列表、格式化文本、总价和校验摘要同理。把派生值放 state 再用 Effect 同步，会制造额外 render 和不一致窗口。

用户点击产生的购买、发送、保存应在事件处理器中执行，因为“谁触发”是语义的一部分。若用 Effect 监听 `shouldSubmit`，页面恢复、Strict Mode 或重渲染可能重复动作。

### 六、订阅必须成对解除

```tsx
useEffect(() => {
  function onResize() { setWidth(window.innerWidth); }
  window.addEventListener('resize', onResize);
  onResize();
  return () => window.removeEventListener('resize', onResize);
}, []);
```

解除时必须使用相同函数引用和匹配选项。匿名函数分别写在 add/remove 中不会匹配。第三方 emitter、ResizeObserver、MutationObserver 和媒体查询监听也要遵循其真实 API。

订阅回调如果更新 state，要考虑高频事件节流、组件卸载和错误隔离。外部 store 更适合使用专门的订阅接口，确保并发渲染下快照一致。

### 七、计时器清理的是句柄和语义

```tsx
useEffect(() => {
  const timer = window.setTimeout(() => setVisible(true), delay);
  return () => window.clearTimeout(timer);
}, [delay]);
```

清理计时器防止旧回调在依赖变化或卸载后执行。但还要问：暂停页面、切换标签、delay 变化时是重新计时还是保留剩余时间？页面计时器不是精确时钟，后台标签会被节流；截止时间应保存目标时间并在恢复时重新计算。

### 八、请求同时需要取消和迟到结果门禁

```tsx
useEffect(() => {
  const controller = new AbortController();
  let active = true;

  loadOrder(orderId, controller.signal).then(
    data => { if (active) setState({ kind: 'ready', data }); },
    error => {
      if (!active || controller.signal.aborted) return;
      setState({ kind: 'error', error: normalizeError(error) });
    },
  );

  return () => {
    active = false;
    controller.abort('effect-invalidated');
  };
}, [orderId]);
```

AbortController 尝试停止底层工作，active/版本门禁阻止不能取消或已经完成的旧结果提交。两者解决不同问题。取消通常不是用户错误，不应显示成红色失败；真实失败要进入可恢复状态。

请求库或路由框架可能已经提供缓存、去重、取消和 SSR 集成，此时不要在每个组件重复手写 fetch Effect。Effect 适合解释底层协议，不一定是应用数据获取的最终抽象。

### 九、异步 Effect 回调本身不能直接是 async cleanup

`useEffect(async () => ...)` 返回 Promise，而 React 期待 cleanup 函数或 undefined。应在内部定义异步工作：

```tsx
useEffect(() => {
  let disposed = false;
  async function run() { /* ... */ }
  void run();
  return () => { disposed = true; };
}, []);
```

`void` 只表示有意不等待，不会处理拒绝。内部仍需 catch、监督或返回到责任主体。清理也不能 await；如果资源关闭是异步的，应立即标记失效并启动受监督关闭，避免新旧实例共享资源。

### 十、开发环境的建立—清理—建立是压力测试

Strict Mode 可能在首次挂载后模拟 setup → cleanup → setup。用户不应察觉与生产单次 setup 的差别。若出现两个连接、两个弹窗或重复购买，说明 Effect 不可重入、缺少清理，或动作根本不应在 Effect。

不要用全局 `hasRun` ref 阻止第二次 setup；这会让真正的依赖变化和重新挂载无法同步。修复协议，使每轮 setup 独立且 cleanup 对称。

### 十一、layout Effect 只用于必须阻塞绘制的布局同步

`useLayoutEffect` 在 DOM 提交后、浏览器绘制前运行，可读取布局并同步修正位置。它会阻塞绘制，服务器渲染也没有布局，因此应少用。大多数订阅、请求和日志使用普通 `useEffect`。

测量 tooltip 时先考虑 CSS 定位、ResizeObserver 或避免首帧依赖尺寸。若确需 layout Effect，要控制读写顺序避免强制同步布局，并在窄屏、缩放和字体加载后复测。

### 十二、Effect Event 分离响应与非响应逻辑

某些逻辑要读取最新值，却不希望该值改变时重建外部连接。例如连接成功提示使用当前主题，但主题变化不应重连。现代 React 可用 Effect Event 表达“由 Effect 触发、读取最新值、但自身不是依赖”的非响应代码。

这不是逃避依赖 lint 的通用工具。真正决定同步对象的 serverUrl、roomId 仍必须是依赖；只有通知样式等不改变连接协议的读取适合分离。实际项目要按锁定 React 版本核对可用性。

### 十三、多个 Effect 按同步对象拆分

一个 Effect 同时管理 socket、document title、analytics 和 localStorage，会让任一依赖变化重启所有资源。按独立外部系统拆分：连接一个 Effect，标题一个，快捷键一个。若两段必须原子建立/清理同一资源，则保持在一起。

Effect 顺序不应成为隐藏业务协议。若 B 必须等待 A，创建一个明确的协调对象或状态机，而不是依赖文件中的声明顺序。

### 十四、错误处理属于最近能恢复的边界

Effect 内请求失败后，应转成 UI 能理解的错误状态或交给数据层；不能只 `console.error`。订阅回调抛错不会自动被 React Error Boundary 捕获，因为它发生在异步事件中，需要显式捕获并报告。

日志应包含操作、资源 ID、尝试次数、取消原因和耗时，不包含令牌与敏感数据。全局未处理拒绝监控只能发现责任链断裂，不能替代局部恢复。

### 十五、测试 Effect 要控制时间与外部对象

使用可控 Promise、假计时器和可观察的 subscribe/unsubscribe 替身。验证：首次建立一次；依赖变化旧资源先清理；卸载清理；旧请求晚到不提交；取消不显示错误；真实失败可重试。

不要断言“Effect 被调用两次”作为用户合同。测试最终连接、DOM、调用顺序和资源计数。开发 Strict Mode 下也应通过，以提前暴露不可重入问题。

### 十六、Effect 审查清单

对每个 Effect 回答：外部系统是什么？setup 创建了什么？cleanup 是否精确撤销？哪些读取真正改变同步协议？能否改成 render 派生或事件动作？异步结果如何取消和门禁？错误由谁恢复？若答案含糊，这个 Effect 可能放错位置。

### 进阶：浏览器可见性与网络状态会改变同步策略

轮询、媒体和实时连接在页面 hidden、离线或进入 BFCache 时可能需要暂停；恢复后不能简单补发所有错过动作。Effect 可以监听宿主状态，但资源管理器应定义暂停、重连、指数退避、凭证刷新和最终失效。多个组件共享连接时还要防止每个 Effect 各自重连。

测试模拟可见/隐藏、离线/恢复和组件卸载，检查监听/连接计数及最新数据身份。平台事件只是信号，服务端时间、版本和幂等性仍决定数据正确性。

把资源计数和当前订阅 key 暴露给开发诊断面板，能更早发现重复建立、错误复用和未释放连接。

### 学完后应能说明

你应能把 Effect 描述为外部同步协议，解释依赖来自响应式读取、cleanup 在依赖变化时也执行，区分派生计算与用户事件，处理订阅、计时器、请求取消和竞态，并用 Strict Mode 与可控外部替身验证资源没有泄漏。
