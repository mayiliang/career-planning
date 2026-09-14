# Vue 知识点讲义

## VUE-06 Composable、依赖注入与逻辑复用

把一段 ref 和 watch 搬进 useSomething，并不代表复用已经做好。调用者还会遇到更实际的问题：传入当前字符串为什么不再更新，解构返回值会不会丢掉响应性，两个面板为何共享了本该独立的草稿，以及离开页面后谁负责停掉计时器。

这一篇沿着这些问题设计小而完整的函数。先看每次调用的状态，再看输入和返回值，最后用作用域与 provide/inject 说明资源和共享范围。

### 学习前先确认

- 直接前置：[VUE-05 生命周期、副作用清理与异步恢复](../chinese-guides/vue-05-lifecycle-effects-async-recovery.md#vue-05)。先理解每轮 watcher 的建立、失效和清理，再把它们抽成函数。

使用 Vue 3.5 + TypeScript 的 Vite 项目。每组例子独立运行，按给出的文件名放入 src。composable 保留英文叫法，表示利用 Composition API 复用有状态逻辑的函数；它不是某个自动提供缓存或全局状态的框架对象。

### 每次调用先决定创建独立状态还是读取共享状态

**Composable** 通常以 use 开头，让调用者知道它可能建立响应式状态、watcher 或生命周期处理。最简单的例子是两个独立阅读计数。

先创建 `src/useReadingCount.ts`：

```ts example=vue06-count-function runtime=project file=src/useReadingCount.ts
import { readonly, ref } from 'vue';
export function useReadingCount() {
  const count = ref(0);
  function add() { count.value++; }
  function reset() { count.value = 0; }
  return { count: readonly(count), add, reset };
}
```

再放入 `src/App.vue`：

```vue example=vue06-count-app runtime=project file=src/App.vue
<script setup lang="ts">
import { useReadingCount } from './useReadingCount';
const { count: leftCount, add: addLeft, reset: resetLeft } = useReadingCount();
const { count: rightCount, add: addRight } = useReadingCount();
</script>
<template>
  <main>
    <section><h2>React 阅读</h2><p>已读：{{ leftCount }}</p><button @click="addLeft">左侧加一</button><button @click="resetLeft">左侧清零</button></section>
    <section><h2>Vue 阅读</h2><p>已读：{{ rightCount }}</p><button @click="addRight">右侧加一</button></section>
  </main>
</template>
```

左侧点两次、右侧点一次，得到 2 和 1。ref 在函数内部创建，每次调用都得到新的计数；如果把 count 移到模块顶层，才会改成所有调用者共用同一个 ref。这不是小小的整理代码，而是改变了状态所有权。

它与 [React 自定义 Hook 的独立调用](../chinese-guides/react-05-hooks-rules-custom-hooks.md#两次调用复用逻辑却各自拥有状态)有相似的使用结果，但 Vue 并不采用 React 每次 render 的 Hook 调用顺序模型。不要把一套框架的限制直接套在另一套框架上。

### 返回普通对象中的 ref 可以保留解构后的响应性

上例返回普通对象，count 字段仍是 ref。解构只是取出这个 ref，所以 leftCount 会继续更新；模板在顶层访问它时自动解包。

如果改成返回 `reactive({ count: 0 })`，再对这个对象普通解构 count，得到的是当时的数字。需要保留对应关系时，可以返回 ref、使用 toRefs，或让调用者继续通过对象属性读取。基础行为见 [Vue 响应式边界](../chinese-guides/vue-02-ref-reactive-computed-boundaries.md#vue-02)。

对外的 count 用 **readonly** 包装，调用者通过 add 和 reset 表达动作；readonly 代理会拦截经由该代理的写入，并在开发时提示，但它不会冻结内部原始对象，也不是安全或授权隔离。拥有内部 ref 的函数仍能更新它。

若函数本来就用于双向编辑，可以明确接收可写 ref 或返回可写字段。重点是公开说明谁可以改，而不是把所有值一律做成只读。

### 值 ref 和 getter 表达三种不同输入关系

有的输入永远不变，有的跟着父层变化，有的还需要派生。**MaybeRefOrGetter** 可以接受这几种形式，toValue 把它们读取成当前值；要跟踪变化，读取必须发生在 watch 的来源或 watchEffect 的同步执行中。

下面延迟更新一条标题，先创建 `src/useDelayedLabel.ts`：

```ts example=vue06-input-function runtime=project file=src/useDelayedLabel.ts
import { readonly, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';
export function useDelayedLabel(source: MaybeRefOrGetter<string>) {
  const label = ref('等待标题');
  watch(() => toValue(source), (value, _, onCleanup) => {
    const timer = window.setTimeout(() => { label.value = value; }, 250);
    onCleanup(() => window.clearTimeout(timer));
  }, { immediate: true });
  return { label: readonly(label) };
}
```

`src/App.vue` 并排使用四种输入：

```vue example=vue06-input-app runtime=project file=src/App.vue
<script setup lang="ts">
import { ref } from 'vue';
import { useDelayedLabel } from './useDelayedLabel';
const title = ref(' 初始标题 ');
const { label: fixed } = useDelayedLabel('固定标题');
const { label: live } = useDelayedLabel(title);
const { label: trimmed } = useDelayedLabel(() => title.value.trim());
const { label: captured } = useDelayedLabel(title.value);
</script>
<template>
  <main>
    <label>资料标题 <input v-model="title"></label>
    <p>字面量：{{ fixed }}</p><p>ref 输入：{{ live }}</p>
    <p>getter 输入：{{ trimmed }}</p><p>提前取值：{{ captured }}</p>
  </main>
</template>
```

将输入改成新的标题并等待约 250 毫秒。ref 和 getter 两行更新；字面量保持固定；提前取值仍是初始标题。最后一种调用在进入函数之前就完成了读取，函数只得到普通字符串，没有途径知道原 ref 以后变了。

getter 适合 `() => props.id`、去除两端空格或拼接筛选条件。不要在函数最外层只调用一次 toValue，再 watch 那个普通结果；这样依赖早已丢失。

这里观察的是读取结果是否变化，不是自动深度观察所有输入对象。getter 若每次返回一个新对象，还需要说明对象身份与字段变化的含义。

### 组合式函数要说明自己依赖哪种调用环境

Vue 的 composable 没有 React 普通 Hook 那样依靠固定调用序列的要求，但使用生命周期或组件注入时，仍需要相应上下文。含 onMounted、inject 的函数通常在 setup 同步阶段调用；等待一个普通 Promise 后再调用，不应假定当前实例还在。

只使用 ref 和纯计算的函数，可以适用于更多环境。包含 watch 与清理的函数则应说明是否要求活动的 **effect scope**。没有组件的场景也能显式创建作用域，但创建它的人必须负责停止。

上面的延迟标题例子定位为客户端组件示例，因为立即执行的 watcher 会建立 window 计时器。若需要 SSR 通用版本，应把浏览器工作推迟到客户端挂载，或注入适用于该环境的调度器；不能仅把文件改名叫 composable 就宣称能在服务器运行。

### 作用域停止时要真正释放外部资源

effectScope 管理其内部建立的响应式 effect；普通浏览器 interval 不会自己认识这个作用域，需要通过 onScopeDispose 连接释放动作。

创建 `src/usePulse.ts`：

```ts example=vue06-scope-function runtime=project file=src/usePulse.ts
import { getCurrentScope, onScopeDispose, readonly, ref } from 'vue';
export function usePulse() {
  if (!getCurrentScope()) throw new Error('usePulse 需要一个活动作用域');
  const ticks = ref(0);
  let disposed = false;
  const timer = window.setInterval(() => ticks.value++, 300);
  onScopeDispose(() => {
    disposed = true;
    window.clearInterval(timer);
  });
  function reset() { if (!disposed) ticks.value = 0; }
  return { ticks: readonly(ticks), reset };
}
```

用 `src/App.vue` 显式管理一段可结束的工作：

```vue example=vue06-scope-app runtime=project file=src/App.vue
<script setup lang="ts">
import { effectScope, onUnmounted, ref, shallowRef, type EffectScope } from 'vue';
import { usePulse } from './usePulse';
let scope: EffectScope | undefined;
const current = shallowRef<ReturnType<typeof usePulse> | null>(null);
const running = ref(false);
function start() {
  scope?.stop();
  scope = effectScope(true);
  current.value = scope.run(() => usePulse()) ?? null;
  running.value = true;
}
function stop() { scope?.stop(); running.value = false; }
onUnmounted(stop);
</script>
<template>
  <main>
    <button @click="start">开始新一轮</button><button @click="stop">停止作用域</button>
    <button @click="current?.reset()">清零当前读数</button>
    <p>{{ running ? '运行中' : '已停止' }}：{{ current?.ticks.value ?? 0 }}</p>
  </main>
</template>
```

开始新一轮后计数增长，停止后读数保留且不再增加；停止后点清零也没有作用，这是 reset 明确约定的行为。再次开始会先停旧作用域，再创建从 0 开始的新实例。

effectScope(true) 是独立作用域，不自动依附于创建它时的父作用域，所以 App 在卸载时显式 stop。普通子作用域可以跟随父作用域；这里选择独立形式，是为了让“谁创建、谁停止”在例子中清楚可见。

需要 DOM 挂载阶段的函数不能仅凭 effectScope 就调用 onMounted；组件实例与 effect scope 不是同一概念。onScopeDispose 也不是“以后一定会帮我找到某个作用域”，它在调用时绑定当前活动作用域。

### 异步封装要保留每一轮的身份和错误责任

延迟标题中的计时器就是最小的异步工作：输入变化取消旧 timer，作用域停止也取消它。把 timer 换成请求时，还需要捕获本轮输入、创建控制器、登记清理，并在成功和失败后核对本轮是否仍有效。

可以从 [Vue 完整请求场景](../chinese-guides/vue-05-lifecycle-effects-async-recovery.md#用快慢请求观察取消与失效的不同责任)开始抽取，而不是只把 await 放进一个名字好看的函数。active 与 controller 必须继续留在每轮 watch 回调中，不能搬成所有调用实例共用的模块变量。

例如旧请求 A 的 catch 不应覆盖新请求 B 的状态，A 的 finally 也不应关闭 B 的 loading。停止作用域后，不能只中止网络，却让不支持取消的适配器继续提交结果。

对调用者返回判别状态和明确动作，说明空输入、取消、错误、重试与旧数据保留。认证刷新、全局提示和路由跳转若由其他层负责，就把错误交给那一层；不要在通用请求函数里隐含权限判断。

### provide 和 inject 把共享范围限定在一棵子树

**provide/inject** 让后代越过中间组件取得依赖。它适合局部表单上下文、服务适配器和树范围内的共享状态，不是无边界的全局变量。

接下来用四个文件展示三本独立笔记本。外层两个按钮共享左侧笔记本，嵌套区域使用最近的提供者，右侧另有一本。

先创建 `src/notebook.ts`：

```ts example=vue06-injection-context runtime=project file=src/notebook.ts
import { inject, readonly, ref, type InjectionKey } from 'vue';
export function createNotebook(name: string) {
  const count = ref(0);
  function add() { count.value++; }
  return { name, count: readonly(count), add };
}
type Notebook = ReturnType<typeof createNotebook>;
export const notebookKey: InjectionKey<Notebook> = Symbol('notebook');
export function useNotebook() {
  const notebook = inject(notebookKey);
  if (!notebook) throw new Error('笔记按钮需要放在 NotebookPanel 内');
  return notebook;
}
```

`src/NotebookPanel.vue` 创建并提供本区域的实例：

```vue example=vue06-injection-panel runtime=project file=src/NotebookPanel.vue
<script setup lang="ts">
import { provide } from 'vue';
import { createNotebook, notebookKey } from './notebook';
const props = defineProps<{ name: string }>();
const notebook = createNotebook(props.name);
provide(notebookKey, notebook);
const { count } = notebook;
</script>
<template><section :aria-label="name"><h2>{{ name }}：{{ count }}</h2><slot /></section></template>
```

`src/NoteButton.vue` 消费最近的依赖：

```vue example=vue06-injection-button runtime=project file=src/NoteButton.vue
<script setup lang="ts">
import { useNotebook } from './notebook';
const { name, count, add } = useNotebook();
</script>
<template><button @click="add">{{ name }}新增笔记（{{ count }}）</button></template>
```

最后由 `src/App.vue` 组合：

```vue example=vue06-injection-app runtime=project file=src/App.vue
<script setup lang="ts">
import NotebookPanel from './NotebookPanel.vue';
import NoteButton from './NoteButton.vue';
</script>
<template>
  <main>
    <NotebookPanel name="左侧">
      <NoteButton /><NoteButton />
      <NotebookPanel name="嵌套"><NoteButton /></NotebookPanel>
    </NotebookPanel>
    <NotebookPanel name="右侧"><NoteButton /></NotebookPanel>
  </main>
</template>
```

点击任意一个左侧按钮，两个左侧按钮都显示新的数量；嵌套和右侧不变。嵌套区域优先找到最近祖先提供的同一个 key。共享来自同一个 notebook 实例，不是 useNotebook 这个函数名。

本例 name 是创建时的固定名称；如果产品允许实例存续期间改名，应提供响应式名称或明确的改名动作，而不是期待函数里保存的普通字符串自动更新。

### InjectionKey 统一类型身份缺失依赖仍要显式处理

**InjectionKey** 把键和值的类型联系起来，Symbol 提供唯一身份。创建与消费必须导入同一个 Symbol；分别执行两次 Symbol('notebook')，描述相同也不是同一个键。

类型并不能保证上方真的有 Provider，所以 useNotebook 检查缺失并给出明确提示。必需依赖不要静默退回默认单例，否则一个漏包的面板可能开始修改另一个用户或另一区域的数据。可选依赖才适合有说明的默认值。

Vue 不会因为提供了一个普通对象，就把其中所有普通字段变成响应式。上例 count 自己是 ref，后代读取它才建立依赖。后续更新通常按实际追踪的响应式属性触发，不应照搬“Context 一变，所有消费者一律更新”的理解。

Provider 保留修改动作，消费者读 readonly 状态并发出意图。服务、时钟或 transport 也能通过接口注入：页面负责组装具体实现，底层只依赖它需要的方法。运行时插件或跨包独立发布仍需要接口版本与数据校验，TypeScript 只保护它能看到的编译范围。

### 共享资源的释放不能由任意一个消费者决定

两个组件共用同一个连接时，一个先离开，不应关掉另一个还在用的连接。可以让更长寿命的 Provider 拥有连接，也可以用明确的订阅管理器做 **reference counting**。

| 操作 | 使用者数量 | 底层连接的变化 |
| --- | --- | --- |
| A 订阅资料频道 | 0 → 1 | 建立连接 |
| B 订阅同一频道 | 1 → 2 | 复用现有连接 |
| A 离开 | 2 → 1 | 只解除 A 的回调 |
| B 离开 | 1 → 0 | 按约定立即或延迟关闭 |

资源 key 还应反映频道、账号或租户等实际身份。仅凭 URL 相同就共享，可能让用户切换后继续沿用旧权限；凭空增加引用计数也解决不了重连、过期和消息归属。

这类管理器应该明确暴露订阅与释放，而不藏在一个看似每次都独立的 useConnection 里。快速重新订阅、HMR 和最终关闭的行为也要说明。若只需要一棵组件树共享，Provider 往往比永久模块单例更容易管理。

### customRef 适合确实需要延后发布的值

**customRef** 允许自己决定何时收集依赖、何时通知变化。它不应该只是为了写高级 API 而替换普通 ref。

下面把即时草稿和延后发布的值分开：输入仍然流畅，只有明确点击发布时才启动等待。将整段放入 `src/App.vue`。

```vue example=vue06-custom-ref runtime=project file=src/App.vue
<script setup lang="ts">
import { customRef, onScopeDispose, ref } from 'vue';
function useDelayedPublication(initial: string) {
  let value = initial;
  let timer: number | undefined;
  let disposed = false;
  onScopeDispose(() => {
    disposed = true;
    window.clearTimeout(timer);
  });
  return customRef<string>((track, trigger) => ({
    get() { track(); return value; },
    set(next) {
      if (disposed) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { value = next; trigger(); }, 300);
    },
  }));
}
const draft = ref('初稿');
const published = useDelayedPublication('尚未发布');
function publish() { published.value = draft.value; }
</script>
<template>
  <main>
    <label>编辑草稿 <input v-model="draft"></label>
    <button @click="publish">延后发布当前草稿</button>
    <p>当前草稿：{{ draft }}</p><p>已发布：{{ published }}</p>
  </main>
</template>
```

编辑不会改变已发布内容；点击后约 300 毫秒才发布当时的草稿。在等待结束前再次发布，会取消前一轮等待，以最后一次发布为准；仅继续输入而不再次点击，不会改变已经安排发布的文本。

读取器调用 track，最终发布调用 trigger；不是每次赋值都马上通知。卸载时取消 timer，函数也拒绝在已结束后重新安排工作。不要在 get 中每次创建新对象，否则父子更新时可能因为身份不断变化而产生难懂的比较结果。

大多数表单只需要普通 ref 加明确动作。网络请求、鉴权和复杂提交结果若藏进 customRef 的 setter，调用者很难判断一次赋值会发生什么；这些通常更适合有名字、有返回结果的函数。

### SSR 与状态分层决定复用的外部边界

模块顶层创建的 ref 在服务端进程中可能被多个请求共用。上面 notebook.ts 只导出工厂和键，真正状态在每个 Provider 中创建，因而更容易按页面或请求隔离。SSR 中还要确保客户端初始值匹配，避免从不同数据开始 hydration。

浏览器专属能力在挂载后接入，不在模块加载时读取 localStorage、window 或建立连接。切换账号时，明确重建对应 Provider 或重置其拥有的状态，并结束旧资源。

Composable 适合封装局部状态与资源操作；provide/inject 指定树范围内的依赖；Pinia 适合需要跨页面状态管理和相关工具支持的客户端状态域。服务器结果的缓存、失效和重试则常属于查询层，不能因为多个组件要读，就一律复制到 Pinia。状态分层见 [VUE-08](../chinese-guides/vue-08-pinia-state-layers.md#vue-08)。

### 抽取以后调用处应该更容易理解

一个好的 useX，让使用者知道是否独立、输入怎样响应、返回值谁能写、何时开始与停止，以及错误怎样交还。普通格式化保留普通函数，重复的 UI 保留组件，重复的响应式与资源处理再考虑 composable。

本篇例子可以用几次操作检查这些约定：左右计数是否独立，值/ref/getter 是否按预期更新，作用域停止后计时是否结束，嵌套 Provider 是否找到最近实例，延后发布是否保留点击时的文本。无需把内部 watcher 的触发次数作为公开接口。

如果抽取后需要许多互相影响的布尔开关、隐含全局状态和额外解释，先缩小职责。复用的价值是让重复关系更清楚，而不是仅仅减少文件里的行数。

### 参考与延伸阅读

- [Vue：组合式函数](https://cn.vuejs.org/guide/reusability/composables.html)：查命名、输入、返回 ref 和使用上下文。
- [Vue：响应式工具 API](https://cn.vuejs.org/api/reactivity-utilities.html)：查 toValue、toRef 和 toRefs 的差异。
- [Vue：effectScope 与 onScopeDispose](https://cn.vuejs.org/api/reactivity-advanced.html#effectscope)：查作用域与资源释放。
- [Vue：依赖注入](https://cn.vuejs.org/guide/components/provide-inject)：查最近提供者、响应式值及修改归属。
- [Vue：Composition API 的 TypeScript 用法](https://cn.vuejs.org/guide/typescript/composition-api.html#typing-provide-inject)：查 InjectionKey 与可能缺失的注入。
- [Vue：customRef](https://cn.vuejs.org/api/reactivity-advanced.html#customref)：查显式跟踪、通知和对象身份注意点。
- [Vue：readonly](https://cn.vuejs.org/api/reactivity-core.html#readonly)：查只读代理的行为。
- [Vue：服务端渲染](https://cn.vuejs.org/guide/scaling-up/ssr.html)：查跨请求状态与客户端副作用。
