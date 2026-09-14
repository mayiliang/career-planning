# Vue/Nuxt 知识点讲义

## VUE-11 Nuxt 全栈渲染、数据获取与性能

第一次打开资料页，服务器已经把正文放进 HTML；浏览器接着加载 Vue，让链接和输入框可以交互。为什么这时不应该把同一份正文再请求一遍？为什么两个用户访问相同路径，不能共享私人笔记？Nuxt 的关键就在这次交接以及交接后的状态管理。

本篇从一个完整的公开阅读台出发，依次观察首屏、Hydration 和客户端导航，再讨论私人数据、缓存、错误与部署。公开例子没有登录系统，不把它当成认证方案。

### 学习前先确认

- 直接前置：[VUE-10 组件测试、性能与生产构建](../chinese-guides/vue-10-testing-performance-production-build.md#vue-10)。先理解组件行为、构建产物和浏览器能够验证的范围。

示例按 Nuxt 4.5.2 的目录与 API 编写，使用 Vue 3、Node 22 环境。实施信息核验于 2026-09-09；在线文档可能先展示后续版本标记，遇到新选项要对照实际安装版本。本例不启用实验 streaming。

### 一次打开页面经历三个阶段

**server-side rendering** 在请求时生成 HTML；**hydration** 让客户端 Vue 接管初始 DOM；之后点击站内链接，通常由浏览器完成客户端导航。Nuxt 将首屏数据放进 **payload**，使接管过程可以复用结果。

```text
直接请求 /lessons?id=a
  服务器：匹配页面 → 读取资料 → 生成 HTML + payload
  浏览器：显示 HTML → 读取 payload → Vue 接管交互
点击资料 B
  浏览器：导航 → 按新地址读取 B → 更新页面
```

HTML 与 payload 各有用途：前者让用户先看到内容，后者让客户端知道这些内容依据什么数据生成。payload 不是秘密区，浏览器可以检查它。

如果只测站内点击，就可能漏掉首次响应错误；如果只看服务器 HTML，又看不到按钮接管、重复请求或后续导航的问题。

### 运行位置由入口和阶段决定

通用页面的 setup 可能在服务端和浏览器都执行。server/api 下的处理器属于服务端；客户端插件和 mounted 中的浏览器工作则有另一套生命周期。

| 放在通用 setup 中的工作 | 首屏风险 | 更清楚的安排 |
| --- | --- | --- |
| 直接读取 localStorage | 服务器没有该对象 | 挂载后读取，先用一致默认值 |
| 每次生成随机初始文字 | 两端输出不同 | 通过可序列化状态传递一次结果 |
| 直接 $fetch 读取初始正文 | 可能两端各读一次 | 使用 Nuxt 数据 composable 交接 |
| 创建模块级用户 ref | 多请求可能共用 | 在请求对应的 Nuxt 上下文创建 |

Nuxt 的 SSR 与 React Server Components 不是同一协议。代码运行在哪、什么需要在浏览器执行，要看各自框架的入口，而不是只看名称里有没有 server。

### 先创建能完整启动的小项目

在独立 Nuxt 4 项目中安装 nuxt@4.5.2 与 vue，保留 package.json 的 module 模式。下面六个文件组成阅读台；使用 `npx nuxt dev` 开发，或 `npx nuxt build` 后运行 `.output/server/index.mjs` 查看 Node 产物。

根目录 `nuxt.config.ts`：

```ts example=nuxt11-config runtime=project file=nuxt.config.ts
export default defineNuxtConfig({
  compatibilityDate: '2026-09-09',
  devtools: { enabled: false },
  nitro: { preset: 'node-server' },
  runtimeConfig: { catalogSecret: '', public: { siteName: 'B08 阅读台' } },
  routeRules: { '/api/**': { headers: { 'cache-control': 'no-store' } } },
});
```

这里保留空的服务端配置字段，用来说明私有与 public 的结构，没有硬编码凭据。实际部署可用 NUXT_CATALOG_SECRET 注入私有值，不能把它移到 public。示例数据来自本地公开记录，不需要这个凭据。

`app/app.vue` 提供一直保留的布局：

```vue example=nuxt11-shell runtime=project file=app/app.vue
<script setup lang="ts">
const config = useRuntimeConfig();
const note = useState('b08-layout-note', () => '');
</script>
<template>
  <main>
    <header>{{ config.public.siteName }}</header>
    <nav aria-label="资料导航">
      <NuxtLink to="/" :prefetch="false">目录</NuxtLink>
      <NuxtLink to="/lessons?id=a" :prefetch="false">资料 A</NuxtLink>
      <NuxtLink to="/lessons?id=b" :prefetch="false">资料 B</NuxtLink>
      <NuxtLink to="/lessons?id=fail" :prefetch="false">故障资料</NuxtLink>
    </nav>
    <label>布局临时笔记 <input v-model="note"></label>
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </main>
</template>
```

本例关闭链接预取，便于看清每次请求是谁触发的；真实项目可以根据访问概率再启用。useState 在本次 Nuxt 上下文共享笔记并参与首屏交接，但没有写入数据库或浏览器存储，刷新会重新开始。

### API 只返回阅读需要的字段

创建 `server/api/lesson.get.ts`。这是公开只读 API，合法 ID 只有 a、b 和用于观察失败的 fail。内部维护备注留在服务端，返回时明确选择字段。

```ts example=nuxt11-api runtime=project file=server/api/lesson.get.ts
export default defineEventHandler(event => {
  const id = getQuery(event).id;
  if (id === 'fail') throw createError({ statusCode: 503, statusMessage: 'Reading unavailable' });
  if (id !== 'a' && id !== 'b') throw createError({ statusCode: 404, statusMessage: 'Lesson not found' });
  const records = {
    a: { title: '组件协作', body: '先确定数据由谁保存，再安排组件之间的交互。', internalMemo: '仅供编辑维护' },
    b: { title: '状态分层', body: 'URL、页面草稿和服务器数据各有自己的生命周期。', internalMemo: '仅供编辑维护' },
  };
  const record = records[id];
  return { id, title: record.title, body: record.body };
});
```

浏览器调用 `/api/lesson?id=a` 只能得到三个公开字段。客户端 pick、界面不展示字段或 TypeScript 类型限制，都不能替代 API 返回时的这次选择；原始响应如果已经包含内部备注，数据就已经公开。

真实私人接口还要每次认证、按资源授权、限制输入和处理版本冲突。目录名 server/api 只说明运行位置，不会自动实现这些规则。可对照 [服务端主体与输入](../chinese-guides/react-09-compiler-rsc-security-upgrades.md#把服务端操作拆成输入主体资源和版本)。

### 页面用 useFetch 接住首屏结果

`app/pages/index.vue`：

```vue example=nuxt11-index runtime=project file=app/pages/index.vue
<script setup lang="ts">
useHead({ title: '阅读目录' });
</script>
<template><section><h1>阅读目录</h1><p>从上方打开资料，比较直接访问与站内导航。</p></section></template>
```

`app/pages/lessons.vue`：

```vue example=nuxt11-lesson runtime=project file=app/pages/lessons.vue
<script setup lang="ts">
definePageMeta({
  validate: route => typeof route.query.id === 'string' && ['a', 'b', 'fail'].includes(route.query.id)
    ? true : { statusCode: 404, statusMessage: 'Lesson not found' },
});
const route = useRoute();
const id = computed(() => typeof route.query.id === 'string' ? route.query.id : '');
const { data, status, error, refresh } = await useFetch(() => `/api/lesson?id=${encodeURIComponent(id.value)}`);
useHead({ title: () => data.value?.title ?? '资料暂不可读' });
</script>
<template>
  <section :aria-busy="status === 'pending'">
    <p v-if="status === 'pending'" role="status">正在读取资料</p>
    <div v-else-if="error">
      <h1>资料暂不可读</h1><p role="alert">读取失败，布局笔记仍然保留。</p>
      <button @click="refresh()">重新读取</button>
    </div>
    <template v-else-if="data"><h1>{{ data.title }}</h1><p>{{ data.body }}</p></template>
    <p v-else>尚无资料</p>
  </section>
</template>
```

最后创建 `app/error.vue`，处理不存在的页面等全局错误：

```vue example=nuxt11-error runtime=project file=app/error.vue
<script setup lang="ts">
import type { NuxtError } from '#app';
defineProps<{ error: NuxtError }>();
</script>
<template>
  <main>
    <h1>{{ error.statusCode === 404 ? '资料或页面不存在' : '页面暂时无法打开' }}</h1>
    <p>可以返回目录重新选择。</p>
    <button @click="clearError({ redirect: '/' })">返回阅读目录</button>
  </main>
</template>
```

直接打开 `/lessons?id=a`，查看原始响应：HTML 中已包含“组件协作”。浏览器接管时复用 payload，正常情况下不会再为同一首屏补发一个重复 API 请求。输入布局笔记，再点 B：正文变为状态分层，布局笔记仍在。

点故障资料，页面局部显示读取失败；重试仍可能失败，因为本例 fail 一直返回 503。改选 A 可以继续阅读。直接访问非法 ID 则由页面 validate 进入 404；API 自己也验证 ID，页面检查没有替代它。

该演示的 query 承载资料身份，便于并排观察；实际也可以用 app/pages/lessons/[id].vue 表达路径参数。无论采用哪种文件约定，都要处理重复参数、缺失值和非法输入。

### useFetch useAsyncData 与 fetch 各有合适位置

**useFetch** 连接 URL、请求选项和 Nuxt 数据交接；**useAsyncData** 适合自定义读取过程；**$fetch** 是底层请求工具，常用于事件提交或服务端内部调用。它们不是同义词。

在通用 setup 中直接 await $fetch，服务器读完以后，浏览器再次执行 setup 时可能又读一次。useFetch/useAsyncData 把结果交给 payload，让接管阶段知道已有结果。之后的 refresh、参数变化和显式重取仍可能发请求，“避免首屏重复”不等于“永远只请求一次”。

自定义 handler 应返回有意义的值；用 undefined/null 表示“工作完成但没有数据”可能造成接管时再次获取。没有条目时可以返回 `{ items: [] }` 这样的明确结果。保存、发送邮件或累加计数也不适合放在可能重跑的读取 handler 中。

### 数据 key 标识结果不承担授权

一个 key 应说明是哪份数据。例如公开资料 a 与 b 应不同，私人笔记还要考虑账号或租户范围。不能把所有页面都叫 detail，再期待框架猜出区别。

```js example=nuxt11-key-identity
function noteKey(account, lesson) {
  return JSON.stringify(['private-note', account, lesson]);
}
console.log(noteKey('u1', 'a')); // => ["private-note","u1","a"]
console.log(noteKey('u2', 'a')); // => ["private-note","u2","a"]
console.log(noteKey('u1', 'a') === noteKey('u1', 'b')); // => false
```

这是身份命名示例，不是认证实现。客户端即使改成 u2 的 key，也不能取得 u2 的私人数据，授权仍在服务端。不要把 cookie 或 token 拼进 key。

useFetch 会根据 URL 与相关选项生成 key；本例让 URL 随规范 ID 变化。useAsyncData 可以显式使用响应式 key。多个调用共享 key 时，应保持 handler、转换和数据选项一致；默认浅层数据也不意味着任意嵌套修改都会触发更新。

refresh 是重新读取，clear 是清理对应异步状态，它们都不自动清空所有 HTTP、CDN 或数据库缓存。登录、注销与租户切换需要明确清理哪些私人数据，不能只给当前页面换个 key 就认为旧记录消失了。

### Hydration 需要两端从相同输入开始

服务端显示“第 3 页”，客户端第一次却显示“第 1 页”，可能导致修补、闪动或交互状态丢失。常见来源包括时区、随机数、浏览器存储、无效嵌套 HTML，以及服务端串用另一个请求的状态。

例如系统主题只存在 localStorage 时，服务端无法直接知道。可以先用相同默认值，挂载后更新；也可以在合适的请求数据中提供确定的主题。选择哪种取决于首屏体验和可用输入，而不是关闭警告。

ClientOnly 可以隔开浏览器专属区域，但不应把整页搬进其中来掩盖交接问题。它也不会自动降低所有 JavaScript 成本，首屏内容与交互可用时间仍需分别看。

### SSR CSR 与预渲染按内容选择

公开帮助文档更新较少，预渲染可能合适；个人学习台依赖当前身份，需要明确的私有读取；重交互编辑器也可以选择客户端工作更重的结构。不是每条路径都必须采用同一种策略。

| 策略 | 主要生成时间 | 要回答的问题 |
| --- | --- | --- |
| SSR | 请求到达时 | 数据读取多慢，是否会共享私人结果 |
| CSR | 浏览器运行时 | 等待 JS 和数据期间显示什么 |
| 预渲染 | 构建或生成时 | 内容多久更新，哪些路径需要生成 |
| 混合路由 | 按路径约定 | 新路径是否落入正确规则 |

route rules 可以安排路径的渲染和缓存，但不能代替 API 授权。静态生成只有生成结果，不会凭空在静态托管平台运行 server/api；要么数据已经包含在静态结果中，要么另有可访问的服务。

### 缓存先分公开与私人再谈命中率

公开文章可以按资料身份共享；私人页面不能只按 `/dashboard` 这个 URL 缓存给所有用户。缓存约定至少包括身份范围、新鲜度、可接受陈旧时间、写入后的失效和错误是否可缓存。

Nitro 缓存、CDN 缓存、浏览器 HTTP 缓存和 Nuxt 数据状态并不是同一个存储。某层禁止缓存，不证明其他层也没有保存响应。尤其 HTML 与 payload 都可能含个性化信息，要一起检查。

不要在服务器模块顶层创建可变的用户 ref、Pinia 或 router 单例。useState 的调用应在本次 Nuxt 上下文中；声明一个工厂函数与把每个用户共用的实例放到顶层，是不同做法。相关实例寿命见 [Pinia](../chinese-guides/vue-08-pinia-state-layers.md#跨-store-调用与-ssr-需要明确实例)。

### 私有配置与请求头都需要明确出口

**runtime configuration** 中 public 部分可在客户端使用，私有字段只应由服务端读取。服务端把私有值返回给页面，仍然会造成公开；“原本存在哪里”不能替代“最后发给了谁”的判断。

Nuxt 在服务端对相对 URL 使用 useFetch 时，可通过请求上下文转发适当的请求头和 cookie。底层 $fetch 或外部 URL 不是完全相同的情况；不要把全部请求头和内部凭据顺手转给任意外域。

实际外部数据服务应限制目标、超时和响应范围。服务端输入中的 userId、role 和目标 URL 都需要独立校验。这个公开阅读台没有用户会话，因此只能说明交接和最小返回字段，不能证明双身份授权正确。

### 错误状态与 HTTP 状态要分别安排

本例 API 对故障返回 503，但页面选择把失败作为局部结果展示，页面 HTML 响应不因此自动变成 503。非法页面身份则由 validate 进入全局 404。API 状态、页面响应状态和可见文案是三个相关但不同的决定。

useFetch 的 error 可以留在当前布局处理，严重页面错误可以进入 error.vue。clearError 的跳转要有可靠目的地；如果仍回到坏地址，无限自动重试只会制造更多等待。

NuxtRouteAnnouncer 提供页面位置公告，useHead 更新标题；它们不代替所有焦点与滚动设计。query 切换是否应该抢焦点，需要按实际任务决定。

### 性能要把服务器和浏览器连起来看

更早收到 HTML，不代表更早可以操作。服务器数据慢会提高首字节等待，payload 过大会增加传输和解析，客户端 JS 与 Hydration 仍可能占用主线程。

用同一路径比较直接打开和站内导航，先确认请求数量、响应大小和等待位置，再决定优化。懒水合可以推迟非关键区域接管，但要处理用户提前操作的行为；流式可以逐步发送内容，但代理缓冲和平台超时可能改变效果。

实验 streaming 的支持级别应按实际 Nuxt 版本核对。本例保留稳定 SSR，未验证流式代理。已经开始发送响应后，错误状态码与 fallback 的处理也有额外限制，不能照搬一次性响应。

### 版本与部署要以当前制品为依据

截至本次核验，官方 v4.5.2 发布页标记该补丁版本；本文固定它作为可复现例子，不把在线文档里标注更高版本的选项混入代码。Nuxt 3 的官方支持延长到 2026-07-31，旧项目应依据实际依赖安排迁移。

2026-07-27 的官方安全说明要求 Nuxt 4.5.1 / 3.21.10 及相关 devtools 修补，说明只处理更早公告可能仍不够。顶层版本、devtools、模块、Nitro 和制品中的真实依赖都需要核对；不把某个历史补丁当成覆盖未来漏洞的结论。

**Nitro preset** 决定目标运行环境。Node、边缘、serverless 与静态托管的文件系统、连接、后台任务、流式和超时不同。本机 Node 产物能运行，并不证明任意平台都支持同样行为。

升级尽量分清安全修补、框架迁移和业务重构。保留兼容的资源和回退路径，安全回滚也应保留必要修补，不能重新部署已知受影响的旧依赖。

### 参考与延伸阅读

- [Nuxt：Data Fetching](https://nuxt.com/docs/4.x/getting-started/data-fetching)：查首屏数据如何交接。
- [Nuxt：useFetch](https://nuxt.com/docs/4.x/api/composables/use-fetch)：查 URL、响应式选项和 key。
- [Nuxt：useAsyncData](https://nuxt.com/docs/4.x/api/composables/use-async-data)：查共享状态、handler 与版本标记。
- [Nuxt：State Management](https://nuxt.com/docs/4.x/getting-started/state-management)：查请求状态与 useState。
- [Vue：SSR](https://cn.vuejs.org/guide/scaling-up/ssr.html)：理解 Hydration 和跨请求状态。
- [Nuxt 4.5.2 发布记录](https://github.com/nuxt/nuxt/releases/tag/v4.5.2)：核对本文示例版本。
- [Nuxt 2026-07 安全说明](https://nuxt.com/blog/v4-5-security)：核对 Nuxt 与 devtools 的相关修补。
- [Nuxt 3 支持期限说明](https://github.com/nuxt/nuxt/discussions/33918)：核对维护期限变更。
- [Nuxt：Deployment](https://nuxt.com/docs/4.x/getting-started/deployment)：查产物和目标平台要求。
