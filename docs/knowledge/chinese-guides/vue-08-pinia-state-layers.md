# Vue 知识点讲义

## VUE-08 Pinia 与状态分层

一个页面把资料列表放进 Pinia，另一个页面再复制一份。更新以后两边不一致，于是又补两个 watch。类似问题并不会因为数据“都进了 store”就消失：首先要决定谁保存事实，哪些值可以计算，哪些变化需要跨页面保留。

这一篇用共享阅读清单、快慢读取和版本化设置三个完整场景，说明 Pinia 管理什么，以及组件、URL 和服务器仍分别负责什么。

### 学习前先确认

- 直接前置：[VUE-06 Composable、依赖注入与逻辑复用](../chinese-guides/vue-06-composables-injection-reuse.md#vue-06)。先理解每次调用的状态范围、响应式返回值和依赖所属的实例。

示例使用仓库现有的 Vue 3.5 与 Pinia 2.3.1 核对，所讲的是 state、getter、action 等核心机制。各组替换自己的 `src/App.vue`，其余文件按小节创建。先给应用安装一次 Pinia，`src/main.ts` 如下；Vite 模板的 index.html 应保留 id 为 app 的挂载点。

```ts example=vue08-bootstrap runtime=project file=src/main.ts
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
export const app = createApp(App);
app.use(createPinia());
app.mount('#app');
```

### 先判断状态应该跟随谁

**store** 是一个有身份的状态单元，不是所有变量的默认住处。可以先按使用范围判断：

| 数据 | 常见所有者 | 生命周期问题 |
| --- | --- | --- |
| 尚未确认的输入、弹窗开关 | 当前组件或编辑任务 | 取消后是否丢弃 |
| 页码、可分享筛选 | URL | 返回或刷新能否恢复 |
| 跨页面的阅读计划 | 客户端状态域 | 何时重置、是否跨账号 |
| 服务器上的资料正文 | 服务端与查询缓存 | 何时过期、写后如何重取 |
| 显示密度等偏好 | 设置状态及持久化适配器 | 版本迁移、读取失败如何回退 |

同一资料可以同时有服务器正文和本地草稿，它们的含义不同，不能只因字段长得相似就强行合成一份。反过来，列表总数已经能从集合算出，就不必再存一个需要同步的 total。

Pinia 很适合明确的客户端状态域；是否使用它，应来自共享范围和管理需求，而不是因为组件多了两个层级。

### 一个清单 store 保存事实并提供命名动作

创建 `src/readingPlan.ts`：

```ts example=vue08-plan-store runtime=project file=src/readingPlan.ts
import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
type Lesson = { id: string; title: string; done: boolean };
export const useReadingPlan = defineStore('b07-reading-plan', () => {
  const lessons = ref<Lesson[]>([
    { id: 'a', title: '组件协作', done: false },
    { id: 'b', title: '状态分层', done: false },
  ]);
  const remaining = computed(() => lessons.value.filter(item => !item.done).length);
  function add(title: string) {
    const text = title.trim();
    if (!text) return;
    lessons.value.push({ id: crypto.randomUUID(), title: text, done: false });
  }
  function toggle(id: string) {
    const item = lessons.value.find(lesson => lesson.id === id);
    if (item) item.done = !item.done;
  }
  function remove(id: string) { lessons.value = lessons.value.filter(item => item.id !== id); }
  function reset() { lessons.value = []; }
  return { lessons, remaining, add, toggle, remove, reset };
});
```

**state** 是 lessons 这类事实，**getter** 是 remaining 这类派生读取，**action** 是 add、toggle、remove 这些命名操作。在 Setup Store 中，ref、computed 和函数分别对应这些角色。

Pinia 允许直接修改 state。把业务修改集中到 action，是让规则更容易检查的设计选择，不是自动存在的权限限制。示例的 add 在动作里产生 ID，getter 只计算未读数，不发请求或写回状态。

### 两个组件取得同一实例却不需要复制数据

`src/PlanSummary.vue` 直接读取同一个 store：

```vue example=vue08-plan-summary runtime=project file=src/PlanSummary.vue
<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useReadingPlan } from './readingPlan';
defineProps<{ name: string }>();
const plan = useReadingPlan();
const { lessons, remaining } = storeToRefs(plan);
</script>
<template><aside :aria-label="name"><h2>{{ name }}</h2><p>共 {{ lessons.length }} 篇，未读 {{ remaining }} 篇</p></aside></template>
```

`src/App.vue` 负责编辑与展示组合：

```vue example=vue08-plan-app runtime=project file=src/App.vue
<script setup lang="ts">
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useReadingPlan } from './readingPlan';
import PlanSummary from './PlanSummary.vue';
const plan = useReadingPlan();
const { lessons } = storeToRefs(plan);
const title = ref('');
const showDetail = ref(true);
function add() { plan.add(title.value); title.value = ''; }
</script>
<template>
  <main>
    <form @submit.prevent="add"><label>新资料标题 <input v-model="title"></label><button :disabled="!title.trim()">加入清单</button></form>
    <ul><li v-for="item in lessons" :key="item.id">
      <label><input type="checkbox" :checked="item.done" @change="plan.toggle(item.id)">{{ item.title }}</label>
      <button :aria-label="`删除${item.title}`" @click="plan.remove(item.id)">删除</button>
    </li></ul>
    <button @click="showDetail = !showDetail">切换详情摘要</button><button @click="plan.reset()">清空本例清单</button>
    <PlanSummary name="侧栏摘要" /><PlanSummary v-if="showDetail" name="详情摘要" />
  </main>
</template>
```

把一篇标记已读，两处摘要同时变化；隐藏详情摘要，再添加资料，再显示详情，它读到当前的同一份数据。组件卸载没有销毁 store，也不需要先从侧栏复制数据到详情。

同一个 Pinia 实例内，调用相同 ID 的 useReadingPlan 得到同一 store；换一个独立 Pinia 实例则是另一份状态。因此 store ID 要稳定且避免冲突，共享范围也要说清楚。

### Setup Store 的状态需要交给 Pinia 管理

上一批 Composable 可以向调用者返回 readonly(ref)，但不要不加区分地把这个习惯直接搬到 Setup Store。Pinia 需要识别并管理完整 state，以支持 SSR、DevTools、插件和状态恢复；隐藏 state 或把返回的 state 做成 readonly，会破坏相关能力。

上例返回原始 ref，由 Pinia 接管。展示组件若需要更窄的只读接口，可以由容器传入必要数据与动作，不必把整个 store 暴露给它。只读视图与 store 自身的状态登记，是两个层次。

Options Store 使用 state/getters/actions 结构，Setup Store 使用 Composition API；选择哪种形式不改变这些管理责任。Options Store 自带 $reset，Setup Store 则需要自己定义符合业务语义的重置方法。

### 解构时保留响应性并理解 getter 的成本

直接从响应式 store 解构某个数字或字符串，取得的是当时的值。storeToRefs 会为 state 与 getter 保留 ref，跳过 action 等方法；绑定后的 action 可以直接解构调用。

不要给 getter 结果再配一个 state 和同步 watcher。需要参数的 getter 通常返回一个函数，它不等于为每个参数建立独立缓存。大集合查询先考虑实际读取模式和索引，而不是默认给结果深拷贝。

Vue 按实际访问的响应式属性追踪依赖，并不是“拿到 store 就订阅其中所有字段”。把渲染范围、数据变化频率和 DOM 成本分开看，才能判断是否需要拆分。

### 异步 action 仍然要拒绝过期结果

Pinia 可以运行异步 action，但不会自动让相同 action 去重、取消或按正确顺序完成。下面故意让 A 比 B 慢，也让“重置后旧请求才完成”容易观察。

创建 `src/readingRequest.ts`：

```ts example=vue08-request-store runtime=project file=src/readingRequest.ts
import { ref, shallowRef } from 'vue';
import { defineStore } from 'pinia';
type State =
  | { kind: 'idle' }
  | { kind: 'pending'; id: string }
  | { kind: 'ready'; id: string; text: string }
  | { kind: 'error'; id: string; message: string };
export const useReadingRequest = defineStore('b07-reading-request', () => {
  const state = shallowRef<State>({ kind: 'idle' });
  const requestVersion = ref(0);
  async function load(id: string) {
    const mine = ++requestVersion.value;
    state.value = { kind: 'pending', id };
    try {
      const text = await new Promise<string>((resolve, reject) => {
        window.setTimeout(() => {
          if (id === '故障') reject(new Error('模拟读取失败'));
          else resolve(`${id} 的正文`);
        }, id === 'A' ? 700 : 150);
      });
      if (mine !== requestVersion.value) return;
      state.value = { kind: 'ready', id, text };
    } catch (error) {
      if (mine !== requestVersion.value) return;
      state.value = { kind: 'error', id, message: error instanceof Error ? error.message : '读取失败' };
    }
  }
  function reset() { requestVersion.value++; state.value = { kind: 'idle' }; }
  return { state, requestVersion, load, reset };
});
```

`src/App.vue`：

```vue example=vue08-request-app runtime=project file=src/App.vue
<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useReadingRequest } from './readingRequest';
const reader = useReadingRequest();
const { state } = storeToRefs(reader);
</script>
<template>
  <main>
    <nav aria-label="读取资料"><button v-for="id in ['A', 'B', '故障']" :key="id" @click="reader.load(id)">读取 {{ id }}</button></nav>
    <button @click="reader.reset()">结束本次阅读</button>
    <p v-if="state.kind === 'idle'">请选择资料</p>
    <p v-else-if="state.kind === 'pending'" role="status">正在读取 {{ state.id }}</p>
    <p v-else-if="state.kind === 'ready'">{{ state.text }}</p>
    <p v-else role="alert">{{ state.message }}</p>
  </main>
</template>
```

点 A 后马上点 B，最终保持 B。再点 A，立即结束阅读，等 700 毫秒以后仍是请选择资料。reset 增加版本，而不是把版本归零；否则旧编号可能与下一轮再次碰上。

本例只让过期结果失去提交资格，不假装取消了模拟计时器。真实读取可以同时传入 AbortSignal 节省工作，取消与资格的区别见 [watch 请求清理](../chinese-guides/vue-05-lifecycle-effects-async-recovery.md#用快慢请求观察取消与失效的不同责任)。如果多个组件共同拥有进行中的读取，一个离开时是否取消，也需要按共享范围决定。

### Store 的重置处置和页面卸载不是同一件事

页面中的 useStore 调用不等于“这个页面拥有 store 的寿命”。离开页面时是否丢弃草稿、退出账号时是否清空状态，都应由业务入口明确处理。

$dispose 停止 store 的作用域并从 store 注册表移除实例，但不会自动删除整个 Pinia state 中对应的数据。也不要把 $reset 当作资源管理器：它重置数据，并不自动中止请求、解除外部监听或清理存储。

切换账号或租户时，先让旧异步工作失效并释放资源，再重置身份相关数据，最后开始新的读取。只覆盖 userId 会留下旧缓存与旧回执。

### 持久化只保存允许字段并解析版本

**persistence** 让少量设置跨刷新保留，不是把整个 store 序列化。以下例子只保存主题与密度，使用独立的演示键，不保存阅读记录或身份信息。

`src/preferences.ts` 定义 Options Store：

```ts example=vue08-preferences-store runtime=project file=src/preferences.ts
import { defineStore } from 'pinia';
export type Preferences = { theme: 'light' | 'dark' | 'system'; density: 'comfortable' | 'compact' };
export const defaults = (): Preferences => ({ theme: 'system', density: 'comfortable' });
export const usePreferences = defineStore('b07-preferences', { state: defaults });
```

`src/preferenceStorage.ts` 只负责解析和允许保存的数据形状：

```ts example=vue08-preferences-parser runtime=project file=src/preferenceStorage.ts
import { defaults, type Preferences } from './preferences';
type Result = { kind: 'empty' | 'valid' | 'migrated' | 'invalid'; value: Preferences };
export const storageKey = 'career-atlas-b07-demo-preferences';
export function decodePreferences(raw: string | null): Result {
  if (raw === null) return { kind: 'empty', value: defaults() };
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return { kind: 'invalid', value: defaults() }; }
  if (!value || typeof value !== 'object') return { kind: 'invalid', value: defaults() };
  if (!('theme' in value)) return { kind: 'invalid', value: defaults() };
  const theme = value.theme;
  if (theme !== 'light' && theme !== 'dark' && theme !== 'system') return { kind: 'invalid', value: defaults() };
  if ('version' in value && value.version === 2 && 'density' in value && (value.density === 'comfortable' || value.density === 'compact')) {
    return { kind: 'valid', value: { theme, density: value.density } };
  }
  if ('version' in value && value.version === 1 && 'compact' in value && typeof value.compact === 'boolean') {
    return { kind: 'migrated', value: { theme, density: value.compact ? 'compact' : 'comfortable' } };
  }
  return { kind: 'invalid', value: defaults() };
}
export function encodePreferences(value: Preferences) {
  return JSON.stringify({ version: 2, theme: value.theme, density: value.density });
}
```

`src/App.vue` 显式读取和保存，不会在发现未知版本后立刻覆盖原记录：

```vue example=vue08-preferences-app runtime=project file=src/App.vue
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { usePreferences } from './preferences';
import { decodePreferences, encodePreferences, storageKey } from './preferenceStorage';
const preferences = usePreferences();
const { theme, density } = storeToRefs(preferences);
const message = ref('等待读取设置');
onMounted(() => {
  try {
    const result = decodePreferences(localStorage.getItem(storageKey));
    preferences.$patch(result.value);
    message.value = result.kind === 'invalid' ? '记录无法识别，暂用默认值；原记录尚未覆盖' : result.kind === 'migrated' ? '已在内存迁移旧版设置，保存后写入新版' : '设置已就绪';
  } catch { message.value = '浏览器暂不允许读取存储，仍可使用当前设置'; }
});
function save() {
  try { localStorage.setItem(storageKey, encodePreferences({ theme: theme.value, density: density.value })); message.value = '设置已保存'; }
  catch { message.value = '保存失败，当前设置仍保留在页面中'; }
}
function clear() {
  try { localStorage.removeItem(storageKey); preferences.$reset(); message.value = '已清除本例设置'; }
  catch { message.value = '无法清除浏览器记录'; }
}
</script>
<template>
  <main>
    <label>主题 <select v-model="theme"><option value="system">跟随系统</option><option value="light">浅色</option><option value="dark">深色</option></select></label>
    <label>密度 <select v-model="density"><option value="comfortable">舒适</option><option value="compact">紧凑</option></select></label>
    <button @click="save">保存显示设置</button><button @click="clear">清除本例设置</button>
    <p role="status">{{ message }}</p>
  </main>
</template>
```

选择深色、紧凑并保存，刷新后恢复这两项。清除本例设置后回到默认值。旧版 `{ "version": 1, "theme": "dark", "compact": true }` 会在读取时迁移到新版字段；损坏 JSON 或未知版本只在内存中回退，直到用户明确保存才覆盖。

存储可能被修改、内容可能过期，读入时先视为 unknown。token、服务端权限结论、临时错误、请求版本以及整份缓存都不应混入这个设置记录。localStorage 也不是跨标签事务数据库；跨标签同步需额外处理来源与版本。

### Patch 订阅与动作观察各自解决不同问题

$patch 可以把相关修改组织成一个便于观察的更新组，函数形式也方便批量改集合。但它不是数据库事务：中途抛错不会自动回滚所有已执行的修改，同步观察者也可能看到过程。业务不变量仍要由动作保证。

$subscribe 观察 state 修改，$onAction 观察动作开始、结果与失败。一个用于“数据变了什么”，一个用于“哪项操作发生了”；直接修改 state 可以触发前者，却不一定经过后者。

在组件 setup 中创建的订阅通常随组件卸载移除；detached 订阅不随该组件自动结束，需要保存停止函数并由明确的拥有者清理。插件里的持久化或日志也应按 store 选择启用、过滤字段并释放资源，避免每次热更新又重复注册。

### 服务器缓存和乐观变化需要另外定义责任

服务器数据除了数组，还包括读取键、过期、失效、并发、分页和重取。**server state** 可以由查询层或路由数据层管理；把它再复制到 Pinia 并不会增强一致性，反而多出一个需要同步的来源。

Pinia 可以保存当前编辑草稿或选择。若确实承担服务器读取，就应像上面的例子一样明确结果身份，并继续补上实际项目需要的缓存和错误策略。

乐观更新也不能只保存一份旧数组、失败时整份覆盖：

| 顺序 | 发生的事 | 整份回滚的风险 |
| --- | --- | --- |
| 1 | 操作 A 先把资料 a 标成收藏 | 保存旧集合 |
| 2 | 操作 B 修改资料 b 并成功 | 集合已有后续有效变化 |
| 3 | A 失败 | 恢复第 1 步旧集合会误删 B 的成功 |

应该只补偿 A 所属的操作，或在无法安全合并时串行处理同一实体、重新读取服务端结果。操作 ID、实体版本和服务器确认仍是关键，store 不会自动提供它们。

### 跨 store 调用与 SSR 需要明确实例

Store 之间可以调用，但不要在双方初始化时互相读取，形成循环依赖。共有计算可以提取为纯函数，跨域流程放在能协调它们的上层动作中。

在组件外或 SSR 中调用 useStore 时，要确保拿到正确 Pinia 实例。尤其异步流程中，不应依赖一个可能已经属于别的请求的“当前活动实例”；先取得依赖或明确传入本次 Pinia。

SSR 按请求创建 app 与 Pinia，安全序列化允许传给客户端的数据，再由客户端恢复对应状态。Pinia 工厂定义可以位于模块顶层，用户状态实例不能作为进程级单例共享。浏览器存储留到客户端挂载后读取，首屏仍要有一致的默认或服务端数据。

### 分层清楚以后再讨论工具与规模

少量局部值继续用组件状态，树内依赖可以 provide/inject，跨页面客户端状态可以用 Pinia。它们可以合作，不需要为了统一风格把所有数据搬进一个巨大的 global store。

拆分依据是所有者、生命周期、修改入口和实际消费者，不能只看文件行数。DevTools 时间线帮助观察变化，但不是业务审计或授权证据；测试替身里的 action 可能被 stub，也不能据“按钮调用了 action”就宣称状态规则正确。

重构后应能直接回答：两处摘要为何一致、隐藏组件后为何还在、旧请求为何不能回写、设置的未知版本为何不被自动覆盖。回答清楚这些问题，比单纯增加 store 数量更能改善维护体验。

### 参考与延伸阅读

- [Pinia：Defining a Store](https://pinia.vuejs.org/core-concepts/)：查 Options/Setup Store 与完整 state 登记。
- [Pinia：State](https://pinia.vuejs.org/core-concepts/state.html)：查直接修改、patch、reset 与订阅。
- [Pinia：Actions](https://pinia.vuejs.org/core-concepts/actions.html)：查异步动作和动作观察。
- [Pinia：Outside Components](https://pinia.vuejs.org/core-concepts/outside-component-usage.html)：查应用外与 SSR 的实例选择。
- [Pinia：SSR](https://pinia.vuejs.org/ssr/)：查按请求创建实例与状态恢复。
- [Pinia：Store API](https://pinia.vuejs.org/api/pinia/interfaces/StoreWithState.html)：查 dispose 等实例操作。
- [Vue：状态管理](https://cn.vuejs.org/guide/scaling-up/state-management.html)：比较局部共享与应用状态管理。
- [MDN：localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)：查存储范围与可能失败的访问。
