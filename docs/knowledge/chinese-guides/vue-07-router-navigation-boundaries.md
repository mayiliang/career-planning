# Vue 知识点讲义

## VUE-07 Vue Router、类型化/文件路由与导航边界

把资料 A 切到 B，地址变了，正文却还是 A；刷新分享链接，页面回到默认标签；离开编辑页时，刚写的笔记消失了。这些问题说明：路由既要表达“我在哪里”，也要安排地址变化之后的数据和界面。

本篇用一个小型阅读台把 URL、组件复用、数据读取和离开确认连起来。先掌握普通 Vue Router 的行为，再理解文件路由和类型生成增加了什么。

### 学习前先确认

- 直接前置：[VUE-06 Composable、依赖注入与逻辑复用](../chinese-guides/vue-06-composables-injection-reuse.md#vue-06)。能区分实例、响应式来源和异步清理，就能看懂路由复用时的变化。

正文工程使用 Vue 3、Vue Router 4 的稳定 API，核对环境为 Vue 3.5.39 与 Vue Router 4.6.4。Vue Router 5 的文件路由在后文另述，不要求先升级项目。本例只有浏览器内模拟读取，没有登录或真实保存。

### URL 先说明哪些状态值得带走

路径标识资料，query 表达可分享的视图，hash 指向文内位置。例如 `/lessons/a?tab=notes#summary` 分别回答“哪篇”“哪个标签”“哪一节”。输入框尚未提交的文字则可以先留在页面。

| 状态 | 合适的来源 | 刷新后怎样恢复 |
| --- | --- | --- |
| 当前资料 ID | 路径参数 | 重新解析并读取 |
| 当前标签、排序 | query | 按统一规则解析 |
| 正文和权限 | 可信数据源 | 按当前身份重新确认 |
| 尚未保存的笔记 | 当前编辑过程 | 需要另外设计保存或恢复 |

不要同时让 URL、Pinia 和组件各保存一份“当前标签”。本地可以有待提交的草稿，但应明确哪个值已经生效。状态分层见 [Pinia 的状态所有者](../chinese-guides/vue-08-pinia-state-layers.md#先判断状态应该跟随谁)。

### 查询参数要有确定的解释规则

地址可以由用户手动修改。同一个参数还可以重复出现，所以不能把 `Number(query.page) || 1` 当成完整规则。下面明确约定：page 必须唯一、为 1 到 100 的十进制正整数；非法时按 1 阅读；未知 tab 按简介阅读。

```js example=vue07-query-contract
function parseView(search) {
  const values = new URLSearchParams(search);
  const pages = values.getAll('page');
  const raw = pages.length === 1 ? pages[0] : '';
  const page = /^[1-9]\d*$/.test(raw) && Number(raw) <= 100 ? Number(raw) : 1;
  const tabs = values.getAll('tab');
  return { page, tab: tabs.length === 1 && tabs[0] === 'notes' ? 'notes' : 'intro' };
}
console.log(JSON.stringify(parseView('?page=2&tab=notes'))); // => {"page":2,"tab":"notes"}
console.log(JSON.stringify(parseView('?page=2&page=3'))); // => {"page":1,"tab":"intro"}
console.log(JSON.stringify(parseView('?page=-1&tab=other'))); // => {"page":1,"tab":"intro"}
```

“按默认值显示”与“改写地址”是两个决定。若要规范化地址，通常用 replace，避免自动修正又增加一条历史；用户主动切换标签则可用 push，方便后退。一次构造完整 query，保留其他功能负责的参数，不在两个 watch 中互相修正。

### 先搭起能保留布局的阅读台

以下四个文件组成一组 Vue + TypeScript 页面，入口 HTML 保留 `<div id="app"></div>`。先创建 `src/main.ts`：

```ts example=vue07-bootstrap runtime=project file=src/main.ts
import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';
export const app = createApp(App);
app.use(router);
await router.isReady();
app.mount('#app');
```

`src/router.ts` 定义**路由记录（route record）**。这里根布局由 App 提供，RouterView 只替换正文；更深的布局同样可以使用 children 和嵌套 RouterView。

```ts example=vue07-router runtime=project file=src/router.ts
import { defineComponent, h } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
const Home = defineComponent({ setup: () => () => h('h1', '阅读目录') });
const Missing = defineComponent({ setup: () => () => h('h1', '找不到这个页面') });
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/lessons/:id', name: 'lesson', component: () => import('./Lesson.vue') },
    { path: '/:pathMatch(.*)*', name: 'missing', component: Missing },
  ],
  scrollBehavior(to, from, saved) {
    if (saved) return saved;
    if (to.hash) return { el: to.hash, top: 16 };
    return to.path === from.path ? false : { top: 0 };
  },
});
```

再放入 `src/App.vue`：

```vue example=vue07-reader-app runtime=project file=src/App.vue
<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink, RouterView } from 'vue-router';
const note = ref('');
</script>
<template>
  <main>
    <nav aria-label="资料导航">
      <RouterLink to="/">目录</RouterLink>
      <RouterLink :to="{ name: 'lesson', params: { id: 'a' } }">资料 A</RouterLink>
      <RouterLink :to="{ name: 'lesson', params: { id: 'b' } }">资料 B</RouterLink>
      <RouterLink :to="{ name: 'lesson', params: { id: 'fail' } }">故障资料</RouterLink>
    </nav>
    <label>布局临时笔记 <input v-model="note"></label>
    <RouterView />
  </main>
</template>
```

`component: () => import(...)` 是路由的**懒加载（lazy loading）**入口，不必再包 defineAsyncComponent。初次访问详情才需要该模块；模块已加载以后，普通切换不会再次下载一份新的源码。

### 同一组件里的参数变化也要重新读取

最后创建 `src/Lesson.vue`。A 的模拟读取比 B 慢；故障资料会进入错误状态。watch 只观察资料参数与重试次数，标签切换不重新读正文。

```vue example=vue07-lesson runtime=project file=src/Lesson.vue
<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate, RouterLink, useRoute, useRouter } from 'vue-router';
const route = useRoute();
const router = useRouter();
const attempt = ref(0);
const draft = ref('');
const heading = ref<HTMLHeadingElement | null>(null);
const state = ref<{ kind: 'pending' | 'ready' | 'error' | 'missing'; text: string }>({ kind: 'pending', text: '' });
const tab = computed(() => route.query.tab === 'notes' ? 'notes' : 'intro');
function canLeave() { return !draft.value || window.confirm('离开当前资料会丢弃未保存笔记，继续吗？'); }
onBeforeRouteLeave(canLeave);
onBeforeRouteUpdate(to => to.params.id === route.params.id || canLeave());
watch([() => route.params.id, attempt], ([id], _, onCleanup) => {
  let current = true;
  const timer = window.setTimeout(async () => {
    if (!current) return;
    if (id === 'fail') state.value = { kind: 'error', text: '模拟读取失败，请换一篇或重新读取' };
    else if (id === 'a' || id === 'b') state.value = { kind: 'ready', text: id === 'a' ? '组件协作' : '状态分层' };
    else state.value = { kind: 'missing', text: '资料不存在' };
    document.title = state.value.text;
    await nextTick();
    if (current) heading.value?.focus();
  }, id === 'a' ? 650 : 120);
  draft.value = '';
  state.value = { kind: 'pending', text: '正在读取当前资料' };
  onCleanup(() => { current = false; window.clearTimeout(timer); });
}, { immediate: true });
async function chooseTab(next: 'intro' | 'notes') {
  const query = { ...route.query };
  if (next === 'intro') delete query.tab; else query.tab = next;
  await router.push({ query });
}
</script>
<template>
  <section>
    <p v-if="state.kind === 'pending'" role="status">{{ state.text }}</p>
    <template v-else>
      <h1 ref="heading" tabindex="-1">{{ state.text }}</h1>
      <template v-if="state.kind === 'ready'">
        <div aria-label="资料标签">
          <button :aria-pressed="tab === 'intro'" @click="chooseTab('intro')">简介</button>
          <button :aria-pressed="tab === 'notes'" @click="chooseTab('notes')">笔记</button>
        </div>
        <p v-if="tab === 'intro'">这是 {{ state.text }} 的简介。</p>
        <label v-else>本篇未保存笔记 <textarea v-model="draft"></textarea></label>
      </template>
      <p v-else-if="state.kind === 'error'" role="alert">读取未完成，布局笔记仍在。</p>
      <button v-if="state.kind === 'error'" @click="attempt++">重新读取</button>
      <RouterLink v-if="state.kind === 'missing'" to="/">返回目录</RouterLink>
    </template>
  </section>
</template>
```

先在布局笔记写一行字，点 A 后立刻点 B：最终显示状态分层，布局笔记保留。切到笔记标签，后退返回简介，前进恢复标签。这里的组件被复用，不能只靠 onMounted 读取；每轮 watch 清理旧计时器，并在等待 DOM 后再次检查本轮资格。

本例的计时器就是整个模拟工作，因此清除它能停止这次演示。真实 fetch 要传 AbortSignal，且仍要判断旧结果是否失效；取消浏览器等待不保证远端写入撤回，详见 [请求取消与提交资格](../chinese-guides/react-04-effects-external-sync-cleanup.md#请求能否取消和结果能否提交是两个问题)。

### 离开守卫既要覆盖卸载也要覆盖复用

**导航守卫（navigation guard）**可以允许、取消、重定向或抛错。本例用返回值表达决定，没有混用 next，避免同一分支重复结束导航。

在 A 的笔记标签写字，再点 B，取消确认后仍在 A，笔记不变；确认才进入 B。之所以还要 onBeforeRouteUpdate，是因为 A 与 B 使用同一条记录，切换参数不一定离开组件。只装离开守卫会漏掉这种情况。

查询标签变化不丢失草稿，因此本例不拦截；若业务要求 query 变化也切换编辑对象，就应按那个身份判断。浏览器原生确认框只是便于演示；产品若改成自定义 dialog，还需处理焦点、Escape、重复点击与待确认目标。

刷新、关闭、断电不能只靠路由守卫保护。beforeunload 也不是可靠保存时机，重要草稿应在编辑过程中保存或建立恢复记录。

### 导航失败与页面数据失败分开观察

重复点当前地址、被守卫拒绝、被更新的导航取代，属于可辨认的 **navigation failure**。等待 router.push 后，可用 isNavigationFailure 和 NavigationFailureType 判断，不把所有结果统称为异常。守卫抛错与模块加载失败则应有 router.onError 等诊断入口。

页面数据错误又是另一条通路：本例的故障页保留导航并提供重试；重试后依旧失败是模拟服务仍坏，并非“按钮没触发”。不存在的资料则给返回入口，避免诱导无意义重试。

异步守卫等待期间可能出现更新导航。路由器会协调导航结果，但守卫自己产生的网络写入、全局状态修改仍需管理；导航取消不会自动撤销那些副作用。登录重定向还要排除登录页自身，防止循环。

### 滚动与焦点各自回答不同问题

滚动决定看到哪里，焦点决定下一次键盘操作从哪里开始。示例在正文就绪后聚焦标题，标签切换不重新读取，也不抢走按钮焦点。完整产品还应为首页、404 和全局异常统一维护 document.title。

scrollBehavior 的 savedPosition 用于历史恢复，hash 可以定位锚点；异步正文尚未出现时，单纯返回选择器可能找不到目标。应等待该页面明确的就绪信号，不靠随意延长计时器。示例没有异步正文锚点，不能据此宣称覆盖所有滚动恢复。

在嵌套路由中选一层负责焦点即可。菜单激活状态、面包屑和页面名最好来自同一份路由语义，避免标题到了 B，导航仍宣称在 A。

### 文件路由和类型化路由属于生成工具

**typed routes** 帮助源码中按名称和参数构造链接，文件路由帮助生成 route records。它们不证明外部 URL 合法，也不自动提供授权或数据缓存。

截至 2026-09-09，官方 Vue Router 5 迁移说明仍把文件路由能力整合列为主要变化：Vite 插件来自 vue-router/vite，生成路由来自 vue-router/auto-routes；data loaders 位于 experimental 入口。迁移页还说明后续 v6 的 ESM-only 方向。实施时按实际锁文件核对，不把 v5 的生成层配置抄到只有 v4 的项目。

普通 v4 路由应用与原先使用 unplugin-vue-router 的应用有不同迁移工作。前者不必为了文件路由重写所有页面；后者需要检查插件、生成类型、导入路径和配置范围。源码类型检查与地址栏输入检查都应保留。

### Meta 重定向与别名不能代替授权

meta 可以记录布局或客户端访问提示；真实 API 仍需依据当前会话和资源授权。父守卫执行过，不代表任意后续请求都自动获准。

redirect 把旧入口引向新的目标，alias 则让另一地址匹配同一记录并保留别名地址。它们都不应该让外部输入随意决定跳转目的地。登录后的返回地址应限制为允许的站内路径，排除外域、协议相对地址和编码绕过；服务端认证回调也要遵守自己的限制。

URL 进入历史、日志和分享内容，令牌与大段私人草稿不适合放进去。导航统计在确认后记录必要的路由名与结果即可，不默认上传完整 query。

### 深链与 SSR 需要服务器配合

createWebHistory 要求服务器能处理直接访问的页面路径；API 和静态资源规则应先于页面 fallback。丢失的 JS 文件应返回真实失败，不能用 HTML 200 伪装成功。子路径部署时，history base、构建资源 base 与服务器前缀要一致。

hash history 的服务器请求不包含 hash 后的路由，部署要求不同；memory history 常用于 SSR 或隔离检查，本身不操作地址栏。两者能验证的范围不能混为一谈。

SSR 每个请求新建 router，推入本次 URL 并等待 ready，再渲染。客户端要接管对应地址和数据，不能把所有用户共享的 router 或可变状态放成进程单例。完整交接将在 [Nuxt](../chinese-guides/vue-11-nuxt-rendering-data-performance.md#vue-11)继续说明。

### 把核对集中在真正会改变用户结果的路径

对本例，最有价值的操作是：深链刷新、标签前后退、A/B 乱序、取消离开后笔记保留，以及不存在和读取失败两条分支。内存 history 的结果不能替代真实服务器配置，模拟请求也不能证明后端授权。

路径正确后再看代码分块和发布：旧页面可能仍引用旧 chunk，发布时需要保留兼容资源或提供受控恢复。懒加载失败的具体恢复原则见 [代码资源与错误边界](../chinese-guides/react-08-error-boundaries-suspense-recovery.md#lazy-管的是代码资源而不是业务数据)。

### 参考与延伸阅读

- [Vue Router：Composition API](https://router.vuejs.org/guide/advanced/composition-api.html)：查参数观察和组件内守卫。
- [Vue Router：Navigation Failures](https://router.vuejs.org/guide/advanced/navigation-failures.html)：查重复、取消与异常结果。
- [Vue Router：Scroll Behavior](https://router.vuejs.org/guide/advanced/scroll-behavior.html)：查历史位置和异步滚动。
- [Vue Router：Migrating to v5](https://router.vuejs.org/guide/migration/v4-to-v5)：核对文件路由与插件迁移。
- [Vue Router：Data Loaders](https://router.vuejs.org/data-loaders/)：查询实验数据加载方案。
- [Vue：路由](https://cn.vuejs.org/guide/scaling-up/routing.html)：了解路由与 Vue 应用的关系。
- [MDN：History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API)：查浏览器历史机制。
