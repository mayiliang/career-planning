# Vue 知识点讲义

## VUE-05 生命周期、副作用清理与异步恢复

Vue 会自动停止随组件作用域创建的许多响应式 effect，但不会替你关闭 WebSocket、取消 fetch、移除手写事件监听或决定旧结果能否覆盖新页面。生命周期、watch、异步组件、KeepAlive 和 Suspense 解决的是不同层次的问题，必须明确建立、失效、恢复和卸载的责任。

### 学习前先确认

- 直接前置：[VUE-04 类型化组件契约、Slots、`v-model` 与 Teleport](../chinese-guides/vue-04-typed-components-slots-model-teleport.md#vue-04)。它提供组件所有权，并会继续递归到模块与异步控制流基础。

Composable 抽取与依赖注入在 VUE-06。本讲先理解组件内部副作用和异步 UI。

### 一、生命周期钩子描述实例与 DOM 阶段

组件阶段回调称为**生命周期钩子（lifecycle hook）**，观察响应式来源并运行副作用的是**侦听器（watcher）**。按需加载的组件是**异步组件（async component）**，保留停用实例的是**存活缓存（keep alive）**，协调渲染期等待内容的是**悬停边界（suspense boundary）**；它们解决的责任不同。

`onMounted` 在组件首次挂载、DOM 已创建后运行；`onUpdated` 在响应式更新提交后运行；`onUnmounted` 在实例卸载后清理。注册必须在同步 setup 阶段完成，让 Vue 能把钩子关联到当前实例。

```ts
const canvas = ref<HTMLCanvasElement | null>(null);
let chart: Chart | null = null;

onMounted(() => {
  chart = new Chart(canvas.value!, options);
});
onUnmounted(() => {
  chart?.destroy();
  chart = null;
});
```

不要在 `onUpdated` 无条件修改触发本次更新的状态，会形成循环。需要根据 DOM 尺寸响应变化时，ResizeObserver 通常比每次组件更新后读取更精确。

### 二、watch 用显式源表达同步关系

```ts
watch(
  () => props.orderId,
  (orderId, previousId, onCleanup) => {
    const controller = new AbortController();
    onCleanup(() => controller.abort('source-changed'));
    void loadOrder(orderId, controller.signal);
  },
  { immediate: true },
);
```

`watch` 分开来源与回调，适合只在值变化时执行副作用、访问新旧值和精确控制深度。来源应是 ref、reactive 对象、getter 或数组；直接传 `props.orderId` 只会传当前普通值，失去响应性。

### 三、watchEffect 根据同步读取自动收集依赖

`watchEffect` 立即运行并收集执行期间读取的响应式值，适合依赖与逻辑紧密且简单的同步。异步函数中，首次 `await` 后才读取的值通常不在同一轮自动收集范围内。

自动收集让代码简洁，也可能隐藏依赖。请求、缓存键和权限条件较复杂时，显式 watch 源更易审查。不要通过在回调里“顺便读取”一个值来制造隐式触发。

### 四、清理发生在失效时而不只卸载时

watch 源再次变化前，旧回调先失效；清理应取消旧请求、计时器或订阅。若只在 `onUnmounted` 清理，组件仍挂载但 orderId 已改变时，旧工作仍会运行。

清理函数应只撤销这一轮创建的资源。把控制器放全局并在任意回调中 abort，可能取消新请求。每轮建立自己的句柄，提交结果前再用版本号确认所有权。

### 五、取消与迟到结果抑制缺一不可

```ts
let version = 0;

watch(() => props.query, async (query, _, onCleanup) => {
  const mine = ++version;
  const controller = new AbortController();
  onCleanup(() => controller.abort('stale-query'));
  try {
    const result = await search(query, controller.signal);
    if (mine !== version) return;
    state.value = { kind: 'ready', result };
  } catch (error) {
    if (mine !== version || controller.signal.aborted) return;
    state.value = { kind: 'error', error: normalizeError(error) };
  }
});
```

取消节省资源，version 防止不支持取消或已经完成的旧工作提交。watch cleanup 并不自动撤回服务器副作用；写操作需要幂等键、版本检查和明确结果未知处理。

### 六、flush 时机决定回调看到哪一阶段

watch 默认在父组件更新后、本组件 DOM 更新前执行。`flush: 'post'` 让回调在组件 DOM 更新后运行，适合读取 DOM；`flush: 'sync'` 同步触发，缺少批处理保护，容易在高频数组修改时爆发调用。

大多数业务同步不应依赖 DOM，保持默认即可。确需 DOM 时也先考虑 `nextTick`、模板 ref 和观察器。flush 选择要基于阶段证据，不是用来“修复偶尔读旧值”的试错开关。

### 七、深度 watch 有成本且旧新值可能同引用

watch reactive 对象或设置 `deep` 会遍历嵌套属性，数据大时成本明显。深层修改时 newValue/oldValue 可能指向同一对象，不能靠引用差异恢复旧快照。

优先 watch 具体 getter、稳定 ID 或版本字段。若业务需要审计每次变更，使用不可变更新、显式动作日志或领域状态机，不要让深度 watch 猜发生了什么。

### 八、事件监听和外部实例必须对称清理

```ts
function onKeydown(event: KeyboardEvent) { /* ... */ }
onMounted(() => window.addEventListener('keydown', onKeydown));
onUnmounted(() => window.removeEventListener('keydown', onKeydown));
```

函数引用和选项必须匹配。WebSocket、媒体、地图和编辑器实例也要有显式 dispose。依赖 props 的外部实例可由 watch 建立/清理，避免 onUpdated 每次重建。

Vue 自动停止组件 setup 中同步创建的 watch/watchEffect；如果在异步回调里晚创建 watcher，它可能脱离组件作用域，需要手动停止。最好同步创建 watcher，在回调内部用条件决定是否工作。

### 九、KeepAlive 把卸载变成停用

被 `<KeepAlive>` 缓存的组件移出 DOM 时不会卸载，而是 deactivated；恢复时 activated。组件 state 会保留，普通 onUnmounted 也不会在每次切走时运行。

```ts
onActivated(() => resumePolling());
onDeactivated(() => pausePolling());
onUnmounted(() => disposePolling());
```

需要区分暂停与销毁。视频、轮询、键盘监听和高频观察在停用时通常应暂停；缓存的数据和草稿可以保留。KeepAlive 的 max 类似 LRU，只限制实例数量，不保证某实例永远保留。

### 十、异步组件解决代码加载边界

`defineAsyncComponent(() => import('./Report.vue'))` 把组件代码放到按需 chunk。它可以配置 loading、delay、error、timeout 与重试。代码下载失败、组件内部请求失败和 render 抛错是三种不同故障，不能用一个 loadingComponent 全部处理。

网络很快时立即闪 loading 会造成抖动，适当 delay 可避免；超时只改变 UI 是否等待，不一定停止下载。重试要有次数、退避和离线/部署版本判断，不能无限刷新。

### 十一、Suspense 协调 pending，不是错误边界

Vue `<Suspense>` 可以等待异步 setup 与其控制的异步组件，并显示 fallback。它在当前官方文档中仍标为实验性，生产采用时应锁定版本、准备稳定回退并验证升级。

Suspense 负责 pending 协调，不自动捕获和展示所有错误。错误可由 `onErrorCaptured`、全局 errorHandler、异步组件 errorComponent 或路由/框架边界处理。普通 watch/fetch 不会因为外面包了 Suspense 就自动进入 fallback。

### 十二、错误捕获要明确传播和恢复

`onErrorCaptured` 可以观察后代渲染、事件和生命周期等错误，并决定是否继续向上传播。但记录错误、显示 fallback 和让用户重试是不同责任。

局部边界应保留仍可工作的页面部分；重试要创建新的资源或版本键，不能只是隐藏错误文本。取消、权限拒绝、空数据和程序缺陷也应分类，避免全部显示“网络错误”。

异步事件中手工启动的 Promise 拒绝仍需 catch。全局 errorHandler 是最后监控，不是业务恢复层。

### 十三、服务端渲染没有浏览器 DOM

onMounted 只在客户端执行，适合 window、document 和浏览器库。setup 中直接读取 localStorage 会使 SSR 失败或造成 hydration 不一致。通用代码应按运行环境分离，客户端专属状态在挂载后接管时要设计首屏占位。

模块级可变状态在 SSR 进程中可能跨请求共享。每个请求的用户数据、依赖和 store 必须创建独立实例。Nuxt 全栈边界会在 VUE-11 深入讲解。

### 十四、异步 UI 应使用显式状态而非多个布尔值

```ts
type LoadState<T> =
  | { kind: 'idle' }
  | { kind: 'pending'; previous?: T }
  | { kind: 'ready'; data: T }
  | { kind: 'error'; error: AppError; previous?: T };
```

是否保留旧数据、何时显示骨架、取消后回到哪个状态、重试是否禁用，都应从状态模型得到。`loading/error/data` 三个 ref 若独立修改，容易出现同时 loading 和 error 或失败后误清空可用数据。

### 十五、验证生命周期要控制变化顺序

测试应主动控制 Promise 完成顺序、组件 mount/deactivate/unmount、watch 源快速变化和错误注入。验证旧结果不提交、取消不显示错误、订阅计数归零、KeepAlive 停用暂停、再次激活恢复且不重复建立。

使用 `nextTick` 等待 Vue DOM，用可控 Promise 等待业务异步；两者不能互换。不要靠长 sleep 期待机器恰好按某个顺序完成。

### 十六、审查每个副作用的责任链

对 watch/生命周期逐项写出：触发源、外部资源、setup、失效条件、cleanup、结果提交门禁、错误分类、停用行为和 SSR 行为。任何一项答不出，都可能在切路由、快速输入或缓存组件时泄漏。

### 进阶：错误捕获需要决定继续传播还是局部接管

`onErrorCaptured` 能观察后代渲染、事件外的部分生命周期/异步错误，并可通过返回值影响继续传播；它不是把所有 Promise rejection 自动变成页面错误。最近边界负责可恢复 UI，全局处理器负责未知缺陷遥测，两层要去重并关联组件、route、资源与 build。

fallback 自身应足够简单，不能依赖刚失败的 Provider 或异步组件。重试时重建失败资源/组件 key，同时保留边界之外的草稿与焦点。测试渲染、watch、异步组件 loader 和用户事件四类失败，确认每类进入预期通路。

同一错误若跨层传播，使用稳定错误 ID 去重，避免局部处理器和全局处理器各上报一次并同时打扰用户。

### 学完后应能说明

你应能区分组件生命周期与 watcher 失效周期，选择 watch/watchEffect 和 flush，设计请求取消与版本门禁，处理 KeepAlive 的停用/激活，解释异步组件与 Suspense 的不同责任，并用受控时序验证清理和恢复。
