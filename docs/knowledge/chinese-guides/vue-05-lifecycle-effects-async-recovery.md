# Vue 知识点讲义

## VUE-05 生命周期、副作用清理与异步恢复

离开一个页面后，轮询还在继续；切回缓存的面板，计数器突然变快；搜索 B 已经完成，却又出现 A 的结果。这些现象都与“旧工作没有正确结束”有关，但结束的原因不一样：来源变了、组件停用了、实例卸载了，都需要各自的处理。

本篇从能直接看到的 DOM 和请求顺序开始，再讨论 KeepAlive、异步组件与错误恢复。先分清它们负责哪一步，才能减少偶尔才出现的错乱。

### 学习前先确认

- 直接前置：[VUE-04 类型化组件、Slot、Model 与 Teleport](../chinese-guides/vue-04-typed-components-slots-model-teleport.md#vue-04)。先理解父子组件的输入、修改意图与 DOM 归属。

使用 Vue 3.5 + TypeScript 的 Vite 项目。单文件例子分别替换 `src/App.vue`；多文件例子按小节给出的文件名放在一起，每组独立运行。网络和加载失败通过本地延迟模拟，避免依赖真实服务。

### 生命周期说明实例阶段不是所有变化的触发器

**lifecycle hook** 让你在组件的特定阶段执行工作：onMounted 适合连接已经存在的 DOM，onUpdated 表示组件 DOM 发生更新，onUnmounted 用来结束随实例存在的外部工作。

注册时要让 Vue 知道这些函数属于哪个实例，所以通常在 setup 同步执行期间注册。不是“只要以后会调用 onMounted 就行”。顶层 script setup 的 await 有编译器支持的上下文恢复，但不能把这个特例推广到任意定时器或 Promise 回调。

如果资料 ID 改变了，需要重取数据，使用明确的 watch 来源；不要让 onUpdated 检查页面上所有东西。onUpdated 内无条件改动触发渲染的状态，还可能造成循环。

### DOM 观察器必须与组件一起释放

这个页面让卡片在两种宽度之间切换。ResizeObserver 直接观察实际元素，而不是推断“组件更新了一次，所以尺寸大概也变了”。

```vue example=vue05-resize runtime=project file=src/App.vue
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

const box = ref<HTMLElement | null>(null);
const wide = ref(false);
const measured = ref<number | null>(null);
let observer: ResizeObserver | undefined;
onMounted(() => {
  if (!box.value) return;
  observer = new ResizeObserver(entries => {
    const entry = entries[0];
    if (entry) measured.value = Math.round(entry.contentRect.width);
  });
  observer.observe(box.value);
});
onUnmounted(() => observer?.disconnect());
</script>
<template>
  <main>
    <button @click="wide = !wide">切换卡片宽度</button>
    <div ref="box" :style="{ width: wide ? '320px' : '180px', border: '1px solid', padding: '12px' }">
      阅读卡片
    </div>
    <p>内容区宽度：{{ measured ?? '等待测量' }}</p>
  </main>
</template>
```

初次测得 180，切换后为 320；边框和 padding 没算进 contentRect.width。组件卸载后 observer 被断开。这里目标 div 在组件存续期间一直存在；若 div 自己受 v-if 控制，应观察模板 ref 的变化并重新绑定，不能指望只执行一次的 onMounted 自动处理目标替换。

手写事件监听、地图实例、编辑器、WebSocket 也需要各自真实的释放入口。Vue 自动停止 watcher，不等于浏览器替你关闭这些外部对象。

### watch 和 watchEffect 对依赖的认识不同

**watcher** 用来响应数据变化。watch 明确写出观察什么；watchEffect 在同步执行过程中收集读到了什么。下面只改提示模式，就能看出差别。

```vue example=vue05-watch-sources runtime=project file=src/App.vue
<script setup lang="ts">
import { ref, watch, watchEffect } from 'vue';

const topic = ref('基础');
const mode = ref('简要');
const explicit = ref('');
const automatic = ref('');
watch(topic, value => {
  explicit.value = `${value} / ${mode.value}`;
}, { immediate: true });
watchEffect(() => {
  automatic.value = `${topic.value} / ${mode.value}`;
});
</script>
<template>
  <main>
    <label>主题 <select v-model="topic"><option>基础</option><option>进阶</option></select></label>
    <label>模式 <select v-model="mode"><option>简要</option><option>详细</option></select></label>
    <p>显式来源：{{ explicit }}</p>
    <p>自动收集：{{ automatic }}</p>
  </main>
</template>
```

开始时两行都是“基础 / 简要”。只把模式改成详细，第一行不变，第二行变化；再切换主题，第一行才读取当时的详细模式。

这是为了观察依赖而故意保存两份结果。真实页面如果只是拼接两个字符串，应使用 computed，不需要任何 watcher。watch 的回调读取 mode，不会把它自动加入来源；watchEffect 的同步读取会。

watch 的来源可以是 ref、reactive 对象、getter 或这些来源组成的数组。观察 props.id 应使用 `() => props.id`；直接传入普通字符串，只交出了当前值。异步 watchEffect 在第一次 await 之后才读取的值，不属于本轮同步收集的依赖。需要用某个 ID 发请求，就在 await 之前明确读取或直接写成 watch 来源。

### 清理属于每一轮工作必须尽早登记

watch 的第三个回调参数 onCleanup，或者 watchEffect 的第一个参数，可以登记本轮失效时的处理。失效包括下一轮即将执行，也包括 watcher 停止。Vue 3.5 的 onWatcherCleanup 则必须在回调同步阶段调用，不能放到 await 后面。

参数形式的 onCleanup 绑定了具体 watcher，不受相同的同步调用限制；但“允许较晚登记”不等于“晚登记也来得及”。等待期间组件可能早已卸载。因此，创建控制器或计时器以后，尽快登记释放，再启动异步等待。

同步在 setup 中建立的 watcher 通常随组件作用域停止；异步回调里后来创建的 watcher 可能脱离原来的管理范围，需要自行保存停止句柄。更简单的做法是同步建立 watcher，在内部根据条件决定是否开始工作。

### 用快慢请求观察取消与失效的不同责任

这个页面和 [React 请求例子](../chinese-guides/react-04-effects-external-sync-cleanup.md#请求能否取消和结果能否提交是两个问题)使用相同场景，便于比较清理入口。

```vue example=vue05-request runtime=project file=src/App.vue
<script setup lang="ts">
import { computed, ref, watch } from 'vue';

type LoadState =
  | { kind: 'pending'; id: string }
  | { kind: 'ready'; id: string; text: string }
  | { kind: 'error'; id: string; message: string };
const id = ref('A');
const attempt = ref(0);
const ignoreAbort = ref(false);
const state = ref<LoadState>({ kind: 'pending', id: 'A' });

function loadLesson(name: string, retry: number, signal: AbortSignal, ignore: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!ignore && signal.aborted) { reject(signal.reason); return; }
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', abort);
      if (name === '故障示例' && retry === 0) reject(new Error('模拟第一次读取失败'));
      else resolve(`${name} 的正文`);
    }, name === 'A' ? 700 : 150);
    function abort() { window.clearTimeout(timer); reject(signal.reason); }
    if (!ignore) signal.addEventListener('abort', abort, { once: true });
  });
}
watch([id, attempt, ignoreAbort], ([name, retry, ignore], _, onCleanup) => {
  const controller = new AbortController();
  let active = true;
  onCleanup(() => {
    active = false;
    controller.abort(new DOMException('这一轮读取已结束', 'AbortError'));
  });
  state.value = { kind: 'pending', id: name };
  async function run() {
    try {
      const text = await loadLesson(name, retry, controller.signal, ignore);
      if (active) state.value = { kind: 'ready', id: name, text };
    } catch (error) {
      if (!active || controller.signal.aborted) return;
      state.value = { kind: 'error', id: name, message: error instanceof Error ? error.message : '读取失败' };
    }
  }
  void run();
}, { immediate: true });
const view = computed<LoadState>(() => state.value.id === id.value ? state.value : { kind: 'pending', id: id.value });
function choose(name: string) { id.value = name; attempt.value = 0; }
</script>
<template>
  <main>
    <nav aria-label="切换资料"><button v-for="name in ['A', 'B', '故障示例']" :key="name" @click="choose(name)">{{ name }}</button></nav>
    <label><input v-model="ignoreAbort" type="checkbox"> 模拟服务不支持取消</label>
    <h1>当前资料：{{ id }}</h1>
    <p v-if="view.kind === 'pending'" role="status">正在读取 {{ id }}</p>
    <p v-else-if="view.kind === 'ready'">{{ view.text }}</p>
    <p v-else role="alert">{{ view.message }}</p>
    <button @click="attempt++">重新读取</button>
  </main>
</template>
```

勾选“不支持取消”，选 A 后立即选 B。B 先完成，A 后完成，页面始终保留 B 的正文。active 不只是判断“有没有更新请求”，停止 watcher 和卸载组件也会把它改成 false；只在新请求开始时递增版本，却在卸载时不失效，仍然不完整。

选择故障示例会失败，重新读取后按模拟规则成功。取消分支不显示为用户错误，真正失败才进入 error。失败重试是否保留旧内容，是独立的产品决定；状态分支可以参考 [刷新与旧数据](../chinese-guides/react-03-state-model-derived-controlled.md#互斥状态用一种明确的分支表示)。

异步回调使用捕获到的 name，避免等待后重新读取 id.value，把旧响应标成新资料。渲染又核对 state 的 id，防止数据更新与 watcher 调度之间的短暂错配。取消只能通知协作方，不能撤回已经完成的服务端写入。

### DOM 更新前后可以通过一个小例子分清

watch 默认会批量调度，通常在父组件更新后、所属组件 DOM 更新前执行。需要读取本组件更新后的 DOM 时，使用 flush: 'post'。下面一次点击同步加三次，却只观察最终值。

```vue example=vue05-flush runtime=project file=src/App.vue
<script setup lang="ts">
import { ref, watch } from 'vue';
const count = ref(0);
const output = ref<HTMLElement | null>(null);
const before = ref('尚未更新');
const after = ref('尚未更新');
watch(count, value => { before.value = `数据 ${value}，DOM ${output.value?.textContent}`; });
watch(count, value => { after.value = `数据 ${value}，DOM ${output.value?.textContent}`; }, { flush: 'post' });
function addThree() { count.value++; count.value++; count.value++; }
</script>
<template>
  <main>
    <button @click="addThree">连续增加三次</button>
    <p ref="output">{{ count }}</p>
    <p>更新前：{{ before }}</p><p>更新后：{{ after }}</p>
  </main>
</template>
```

第一次点击后，更新前记录“数据 3，DOM 0”，更新后记录“数据 3，DOM 3”。这是同一来源在两个阶段读取的结果，不是数据丢了两次。

flush: 'sync' 会同步触发，缺少这种批处理保护；对大量连续修改的数组可能很昂贵。不要因为读到旧 DOM 就把所有 watcher 改成 sync，它反而更早。nextTick 用于等待 Vue 的 DOM 更新，不会等待任意请求完成，也不承诺浏览器已经绘制。

### 深度观察不是自动保存旧快照

直接 watch 一个 reactive 对象会形成深层观察；观察返回对象的 getter，则默认关注返回值是否替换，除非再指定 deep。嵌套字段原地改变时，newValue 与 oldValue 可能指向同一个对象，所以不能拿 oldValue 还原修改前的内容。

例如表单对象的 address.city 从上海改为杭州，如果只是修改同一嵌套对象，两份参数都可能读到杭州。需要比较历史，就明确保存快照或记录“城市修改为杭州”这样的动作。

Vue 3.5 支持用数字限制 deep 的遍历深度，但遍历仍有成本。优先关注具体字段 getter、稳定 ID 或版本，不要把整个页面数据深度 watch 一遍当作通用变化日志。对象更新的基础见 [Vue 响应式边界](../chinese-guides/vue-02-ref-reactive-computed-boundaries.md#vue-02)。

### KeepAlive 保留实例时需要暂停仍在运行的工作

**KeepAlive** 缓存的是组件实例。离开缓存页面通常进入 deactivated，返回时进入 activated；草稿可以保留，但计时器不会因为 DOM 被移走就自动暂停。

先创建 `src/CachedTimer.vue`：

```vue example=vue05-keepalive-timer runtime=project file=src/CachedTimer.vue
<script setup lang="ts">
import { onActivated, onDeactivated, onUnmounted, ref } from 'vue';
const ticks = ref(0);
const draft = ref('');
let timer: number | undefined;
function stop() {
  if (timer !== undefined) window.clearInterval(timer);
  timer = undefined;
}
onActivated(() => {
  if (timer === undefined) timer = window.setInterval(() => ticks.value++, 300);
});
onDeactivated(stop);
onUnmounted(stop);
</script>
<template>
  <section>
    <p>活动期间触发次数：{{ ticks }}</p>
    <label>未保存的草稿 <input v-model="draft"></label>
  </section>
</template>
```

再放入 `src/App.vue`：

```vue example=vue05-keepalive-app runtime=project file=src/App.vue
<script setup lang="ts">
import { defineComponent, h, ref } from 'vue';
import CachedTimer from './CachedTimer.vue';
const AwayPanel = defineComponent({ setup: () => () => h('p', '已离开计时面板') });
const reading = ref(true);
const cacheVersion = ref(0);
</script>
<template>
  <main>
    <button @click="reading = !reading">{{ reading ? '离开面板' : '返回面板' }}</button>
    <button @click="cacheVersion++">清空缓存实例</button>
    <KeepAlive :key="cacheVersion" :max="2">
      <CachedTimer v-if="reading" />
      <AwayPanel v-else />
    </KeepAlive>
  </main>
</template>
```

写一段草稿，记下计数，离开约一秒再返回。草稿仍在，计数从接近离开时的读数继续增长，不应把离开的时间全部算进去。点击清空缓存实例，才会产生新的计数和空草稿。

onActivated 在首次激活时也会调用，所以这里不再额外用 onMounted 开一个 interval。stop 可以重复调用，既适用于停用，也适用于最终卸载。KeepAlive 只限制缓存数量时仍可能淘汰实例，不能把缓存当作持久化保存。

### 异步组件加载失败要重新建立可恢复入口

**async component** 处理组件代码的加载。它与组件内部读取业务数据是两件事。下面保留父层草稿，只重试失败的报告组件。

创建 `src/Report.vue`：

```vue example=vue05-async-report runtime=project file=src/Report.vue
<script setup lang="ts">
const title = '报告组件已就绪';
</script>
<template><section><h2>{{ title }}</h2><p>可以继续阅读。</p></section></template>
```

然后使用 `src/App.vue`：

```vue example=vue05-async-app runtime=project file=src/App.vue
<script setup lang="ts">
import { defineAsyncComponent, defineComponent, h, onErrorCaptured, ref, shallowRef } from 'vue';
const Loading = defineComponent({ setup: () => () => h('p', { role: 'status' }, '正在加载报告组件') });
const Failed = defineComponent({ setup: () => () => h('p', { role: 'alert' }, '报告组件加载失败，可以重新加载') });
const draft = ref('');
let attempt = 0;
function makeReport() {
  return defineAsyncComponent({
    loader: async () => {
      const mine = ++attempt;
      await new Promise<void>(resolve => window.setTimeout(resolve, 400));
      if (mine === 1) throw new Error('模拟分块失败');
      return import('./Report.vue');
    },
    loadingComponent: Loading,
    errorComponent: Failed,
    delay: 100,
  });
}
const Report = shallowRef(makeReport());
onErrorCaptured(error => {
  if (error instanceof Error && error.message === '模拟分块失败') return false;
});
</script>
<template>
  <main>
    <label>父层草稿 <input v-model="draft"></label>
    <button @click="Report = makeReport()">重新加载报告</button>
    <component :is="Report" />
  </main>
</template>
```

先写草稿，等待出现模拟失败，再点击重新加载。报告出现，父层草稿仍在。每次按钮操作创建新的异步包装组件，给用户一个真正重新执行 loader 的入口；反复点击会产生新的加载，不应在真实产品里无限重试。

delay 控制何时显示等待提示，timeout 控制加载超时的呈现，它们都不等于中止底层下载。Vite 的动态 import 可以形成代码分块，但部署后旧页面引用的分块被删除、网络断开、业务请求失败，各需要不同的恢复方式。不要一律用“刷新页面”抹掉草稿。

### Suspense 协调等待错误边界负责恢复

截至本版核对，Vue **Suspense** 仍被官方标记为实验性能力。它协调异步 setup 和其管理的异步组件的等待状态；普通 watch 中自行发起的请求，不会仅因外面包着 Suspense 就自动展示 fallback。

Suspense 也不等于错误边界。onErrorCaptured 可接到 Vue 管理的后代渲染、事件、生命周期、setup、watch 等执行路径中的错误；返回 false 会阻止继续向上传播。上例只接管特意制造的加载错误，让 Failed 展示恢复入口，不把未知错误全部吞掉。

手工在定时器里启动、又不返回给 Vue 的 Promise，仍需要自己的 catch。全局 errorHandler 适合记录未知故障，局部状态负责可恢复的用户反馈。fallback 应保持简单，不要再次依赖刚刚失败的组件；重试应重建失败资源，而不只是隐藏错误文字。

### 服务端执行和组件停用要写进使用约定

onMounted 不在服务端运行。需要 DOM 的库放到客户端挂载阶段；服务端 setup 中若建立无法被相应卸载阶段清理的计时器，可能一直留在进程中。模块级可变用户状态还可能在不同请求之间共享，所以服务端应按请求创建实例。

对于每段副作用，可以用一条完整的描述检查是否讲清楚了：观察当前资料 ID；每轮建立一个读取；ID 改变或作用域停止时让旧轮次失效；取消不显示失败；真实失败允许重新读取；若组件被缓存停用，另行决定暂停与恢复。

下一篇会把这些重复的输入、状态和清理整理成 [Composable](../chinese-guides/vue-06-composables-injection-reuse.md#vue-06)。抽取函数不会自动修复生命周期，先在具体页面中理解这些变化，再决定复用什么。

### 参考与延伸阅读

- [Vue：生命周期钩子](https://cn.vuejs.org/guide/essentials/lifecycle.html)：查注册时机与组件阶段。
- [Vue：侦听器](https://cn.vuejs.org/guide/essentials/watchers.html)：查来源、清理、flush 和自动停止。
- [Vue：响应式核心 API](https://cn.vuejs.org/api/reactivity-core.html)：查 watch 的来源类型、deep 与停止句柄。
- [Vue：KeepAlive](https://cn.vuejs.org/guide/built-ins/keep-alive)：查激活、停用和缓存淘汰。
- [Vue：异步组件](https://cn.vuejs.org/guide/components/async)：查加载、提示、失败与重试。
- [Vue：Suspense](https://cn.vuejs.org/guide/built-ins/suspense)：查实验状态与异步依赖范围。
- [Vue：onErrorCaptured](https://cn.vuejs.org/api/composition-api-lifecycle.html#onerrorcaptured)：查捕获范围和错误传播。
- [Vue：服务端渲染](https://cn.vuejs.org/guide/scaling-up/ssr.html)：查副作用与每请求隔离。
- [MDN：ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver)：查尺寸观察与释放接口。
