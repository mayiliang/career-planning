# Vue 知识点讲义

## VUE-06 Composable、依赖注入与逻辑复用

Composable 是利用 Vue Composition API 封装有状态逻辑的函数。它能复用响应式状态、watch、生命周期和资源清理，但不会自动产生正确边界。一个成熟 composable 必须说明输入是否响应式、每次调用是否独立、返回值能否修改、何时启动和停止、SSR 是否隔离，以及依赖从哪里获得。

### 学习前先确认

- 直接前置：[VUE-05 生命周期、副作用清理与异步恢复](../chinese-guides/vue-05-lifecycle-effects-async-recovery.md#vue-05)。它会继续链接组件合同、响应式、Promise 和 Web 基础。

Pinia 在 VUE-08。本讲聚焦组件/局部树中的逻辑复用和依赖注入。

### 一、Composable 复用有状态协议

按 Composition API 约定封装有状态逻辑的函数称为**组合式函数（composable）**。它运行在一个**副作用作用域（effect scope）**中，可向消费者返回**只读状态（readonly state）**；当多个调用者共享同一外部连接时，常用**引用计数（reference counting）**决定最后一次释放。

```ts
export function useMouse() {
  const x = ref(0);
  const y = ref(0);
  function update(event: MouseEvent) {
    x.value = event.pageX;
    y.value = event.pageY;
  }
  onMounted(() => window.addEventListener('mousemove', update));
  onUnmounted(() => window.removeEventListener('mousemove', update));
  return { x: readonly(x), y: readonly(y) };
}
```

它把状态、监听和清理作为一个整体。两个组件分别调用通常会创建两套状态和监听。若应共享单个监听，需要模块级外部 store、provide 的实例或专门订阅器，并明确引用计数和 SSR 隔离。

### 二、命名反映调用环境

以 `use` 开头是 Vue 生态约定，提示函数可能调用 ref、watch 或生命周期，并应在 setup 同步阶段执行。普通纯函数不必伪装成 composable。

Composable 应同步注册生命周期。若等待 Promise 后才调用 onUnmounted，当前组件实例可能已丢失。异步工作放进已经同步注册的 watch/effect 内，或显式返回 start/stop 动作。

### 三、输入可以是值、ref 或 getter

只接收普通值最简单，但失去后续响应；只接收 ref 又让字面量调用不便。可以定义 `MaybeRefOrGetter<T>` 并在内部 `toValue`：

```ts
function useTitle(title: MaybeRefOrGetter<string>) {
  watchEffect(() => {
    document.title = toValue(title);
  });
}
```

API 必须说明 getter 是否会被响应式追踪、对象是否深度观察。不要在内部偷偷把调用者对象变 reactive 并修改它。输入所有权仍属于调用者。

### 四、返回多个 ref 便于安全解构

Composable 常返回普通对象中的 ref：

```ts
return { data, error, status, refresh };
```

调用者 `const { data } = useResource()` 后仍持有 ref。若返回 reactive 对象再普通解构，会丢失属性响应性。也可以返回 readonly reactive 对象，但要记录使用方式。

不要把可写内部 ref 全部暴露。对外返回 readonly 值和动作，可以让状态变化经过可审计入口。需要双向控制的值则明确使用 model/传入 ref，而不是让调用者偶然修改内部。

### 五、清理应绑定当前 effect scope

生命周期 Hook 适合组件实例；更通用 composable 可使用 `onScopeDispose`，在当前 effect scope 停止时清理。这样它也能在自建 effectScope 中正确工作。

若 composable 会在没有组件 scope 的环境调用，要检测并提供显式 `dispose()`。资源清理函数应幂等，重复调用不抛错，也不能关闭其他实例新建的资源。

### 六、每轮异步工作都要有失效协议

```ts
watch(source, async (value, _, onCleanup) => {
  const controller = new AbortController();
  onCleanup(() => controller.abort());
  // 请求、版本门禁、错误分类
}, { immediate: true });
```

Composable 封装请求时仍要区分取消、失败、空数据和旧结果。不要把错误只打印到控制台，也不要把 AbortError 暴露为用户错误。缓存、重试和鉴权刷新若超出单一职责，应委托专门服务。

### 七、依赖注入解决跨层传递而非所有全局状态

祖先 `provide`，后代 `inject` 可以跨越多层 props：

```ts
export interface Clock { now(): number }
export const clockKey: InjectionKey<Clock> = Symbol('clock');

provide(clockKey, systemClock);
const clock = inject(clockKey);
```

**依赖注入（dependency injection）**适合主题、表单上下文、服务适配器、时钟和局部共享状态。它让组件依赖接口而不是导入全局单例，测试可提供替身。

inject 查找最近祖先 Provider，形成树作用域。它不是事件广播，也不适合让任意组件隐式修改整个应用。

### 八、使用 Symbol 和 InjectionKey 保持类型与唯一性

字符串键可能与其他库冲突，Symbol 提供唯一身份；`InjectionKey<T>` 让 provide/inject 的值类型一致。注入仍可能缺失：

```ts
export function useClock() {
  const clock = inject(clockKey);
  if (!clock) throw new Error('useClock 必须位于 ClockProvider 内');
  return clock;
}
```

默认值只适合真正可选的依赖。对必需 Provider 静默创建默认单例会隐藏装配错误，并可能破坏测试/SSR 隔离。

### 九、修改响应式注入应留在提供者

Provider 可以提供 readonly state 与动作：

```ts
provide(cartKey, {
  state: readonly(state),
  addItem,
  removeItem,
});
```

后代通过动作表达意图，提供者维护不变量。若直接 provide 可写 reactive 对象，任何深层组件都能修改，变化来源难以追踪。

Context 很大且频繁变化时，依赖它的组件可能全部更新。拆分不同变化域，或升级到带选择器的 store。不要把服务端查询结果和所有局部 UI 状态塞入一个 provide。

### 十、SSR 必须每请求创建依赖

模块级 `const state = reactive(...)` 在 Node 进程中可能跨请求共享用户数据。SSR 应在每个应用/请求创建 store、客户端和认证上下文，再通过 provide 传入。

Composable 也不能在模块顶层读 window、localStorage。将运行时依赖作为参数或注入，客户端挂载后再访问浏览器 API。服务器与客户端初始值要一致，避免 hydration mismatch。

### 十一、单例 Composable 需要显式资源策略

有时多个调用者应共享 WebSocket 或窗口监听。可以把状态放模块级并用订阅计数：首个订阅建立，最后一个释放。还要处理 HMR、测试隔离、错误恢复和 SSR 禁用。

如果这些规则复杂，使用明确 external store 比“看起来像普通 composable 的隐藏单例”更诚实。API 名、文档和测试应告诉调用者共享事实。

### 十二、与 Pinia 的边界

Composable 适合可组合的局部协议、浏览器能力和树作用域依赖；Pinia 适合需要 DevTools、跨页面共享、明确 action 和测试工具的客户端状态域。二者可以组合：store 调用服务，composable 连接组件生命周期，但不要互相循环依赖。

服务器状态的缓存、失效和重试通常属于查询层，不应因为多个组件使用就自动进入 Pinia。VUE-08 会展开状态分层。

### 十三、错误和 loading 需要稳定模型

Composable 不应返回互相矛盾的 `loading:boolean`、`error:any`、`data:any`。判别联合或明确状态 refs 能表示 idle/pending/ready/error 与 previous data。错误应归一化为应用错误，保留 cause 给日志，面向 UI 暴露安全信息。

动作在 disposed 后如何表现也要定义：抛出、无操作或返回取消结果。隐藏的后台重试与轮询必须可暂停，页面停用、离线和用户退出时不能继续使用旧凭证。

### 十四、测试依赖与资源而非内部 watcher

给 composable 注入假时钟、transport、storage 或 Provider 替身，控制时间与 Promise。验证每个调用实例是否隔离、源变化是否取消旧工作、scope 停止后资源归零、缺失 Provider 是否明确失败、SSR 不访问 window。

类型测试应覆盖输入是值/ref/getter、返回 readonly、注入键类型和错误调用。用户行为由挂载组件测试验证，纯计算可单独测试。

### 十五、抽取时机来自重复协议

两段代码都调用 `ref` 不代表需要抽取。出现相同输入输出、相同生命周期、相同错误与清理规则时，才形成可复用协议。过早抽取会产生几十个只被调用一次、名字模糊的 `useX`。

抽取后调用处应更容易看懂。如果为了配置一个 Hook 需要传十个布尔值和多个回调，可能应拆分协议或保留在具体 feature。

### 十六、Composable 审查表

每次调用独立还是共享？输入如何响应？返回谁可写？何时建立/停止？错误、取消和竞态如何处理？是否需要组件 scope？SSR 是否每请求隔离？依赖能否注入测试？这些答案应体现在类型、实现和文档，而不是只存在作者记忆中。

### 十七、共享外部资源需要引用计数与一致身份

WebSocket、BroadcastChannel、媒体查询监听或同一查询缓存可能被多个组件共享。此时“每次调用都新建”会浪费资源，“永不关闭的模块单例”又会泄漏。更稳妥的资源管理器用稳定 key 标识连接，第一次订阅时建立，最后一个订阅者离开时延迟或立即关闭，并对重连、认证变化和错误广播制定协议。

调用者得到的是订阅结果和显式停止函数，不直接拥有底层连接。测试至少覆盖两个调用者共享、一个先卸载、最后一个卸载、快速重新订阅、用户切换和 SSR 请求隔离。引用计数是实现手段，业务上仍需回答资源何时应该真正失效。

### 十八、`customRef` 与 `readonly` 用来表达边界而非炫技

`customRef` 可以控制依赖跟踪和触发时机，适合把防抖输入封装成明确协议；但若隐藏网络请求或复杂副作用，调用者很难理解赋值后何时生效。`readonly` 则能在开发期阻止消费者直接改写提供者状态，配合命名动作建立单向修改边界。

优先使用普通 `ref`、`computed` 和函数。当时间协议确实重复且有测试时再采用 `customRef`；当状态只能由拥有者修改时返回 readonly。高级 API 应降低调用处复杂度，而不是把复杂度藏起来。

### 进阶：提供者版本演进要保护整个组件树

注入值从一个函数扩展成对象后，远端子组件可能仍按旧合同调用。为跨包 Provider 定义版本化接口、能力检测和安全默认值，开发环境对缺失/不兼容立即报错；不要悄悄返回空对象让错误延后到业务写入。

切换租户、账号或测试容器时重建 Provider 作用域并停止旧资源。类型只能保护同一编译图，运行时插件、微前端和独立部署仍需 schema/版本检查。这样 provide/inject 才是受控依赖边界，而不是不可见的全局变量。

### 学完后应能说明

你应能设计值/ref/getter 输入和 readonly 输出，解释 composable 每次调用为何通常独立，使用 effect scope 清理资源，通过 InjectionKey 建立树作用域依赖，避免 SSR 模块单例污染，并判断普通函数、组件、composable、provide/inject 与 Pinia 的适用边界。
