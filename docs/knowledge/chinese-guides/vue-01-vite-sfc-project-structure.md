# Vue 知识点讲义

## VUE-01 Vite 脚手架、SFC 与项目结构

第一次打开 Vue 项目，目录里有 `index.html`、`main.ts`、`App.vue`、几份配置和一个依赖锁文件。浏览器明明不认识 `.vue`，页面却能显示；开发时能访问的 `/api`，构建以后却可能找不到。要理解这些现象，先把“谁读这个文件、什么时候处理它、最后交给谁”说清楚。

本篇沿一张资料卡片从源码到页面的过程，认识 Vue 项目的入口、单文件组件、构建工具与目录边界。先看见一条能追踪的路径，再逐步加入别名、资源和环境配置。

### 学习前先确认

- 直接前置：[TS-03 泛型、约束、keyof 与索引访问](../chinese-guides/ts-03-generics-constraints-keyof-indexed-access.md#ts-03)、[WEB-01 HTML 语义、表单与可访问性基础](../chinese-guides/web-01-html-semantics-forms-accessibility.md#web-01)、[JS-06 ES Modules 与模块边界](../chinese-guides/js-06-es-modules-module-boundaries.md#js-06)。分别补足类型、HTML 和模块运行模型。

本文采用 Vue 3 的组合式 API 与 `<script setup lang="ts">`。例子沿用常见的 Vite 项目结构；脚手架的选项、Node.js 要求与默认配置会随版本变化，创建新项目时以对应版本的官方说明为准。读懂角色比背下一份特定版本的生成清单更有用。

### 脚手架先帮你准备工具和入口

如果从零开始，可以在准备放置练习项目的父目录运行 Vue 官方创建工具：

```sh
npm create vue@latest
```

项目名可填 `reading-room`，选择 TypeScript。为了先理解本篇入口，可以暂不加入 Router 和 Pinia，等需要路由或共享状态时再学习它们。生成后进入目录，按创建工具提示安装依赖并启动开发服务。

选择一项功能，会增加相应依赖、配置与文件。它不会自动替你决定页面应该怎样拆分。已有项目则先使用仓库指定的包管理器和锁文件，不要为了对齐示例重新创建整个工程。

打开 `package.json` 的 scripts，找出下面几项分别由什么命令实现。不同模板可能叫 `type-check` 或 `typecheck`，不要只靠名字猜：

| 工作 | 常见命令 | 实际做什么 |
| --- | --- | --- |
| 开发 | `vite` | 启动开发服务器，提供源码转换与热更新 |
| 类型检查 | `vue-tsc` 配合项目配置 | 检查 TypeScript 与 Vue 模板类型 |
| 构建 | `vite build` | 生成部署所需文件，通常放进 dist |
| 预览 | `vite preview` | 在本地服务已经生成的 dist |

有的模板把类型检查和构建组合成一条 `build`，有的分开。只有真正读过脚本，才能知道“build 成功”包含哪些检查。预览工具用于本地查看产物，正式环境的服务器、缓存和访问规则还需部署配置承担。

### 沿三个文件找到页面入口

先忽略复杂目录。下面三个文件就能解释一张资料卡片怎样出现。它们需要处在已有 Vue + Vite + TypeScript 项目中，保留脚手架的依赖和 Vue 插件配置。

项目根目录的 `index.html`：

```html example=vue01-index runtime=project file=index.html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <title>我的阅读室</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`src/main.ts`：

```ts example=vue01-main runtime=project file=src/main.ts
import { createApp } from 'vue';
import App from './App.vue';

createApp(App).mount('#app');
```

`src/App.vue`：

```vue example=vue01-app runtime=project file=src/App.vue
<script setup lang="ts">
const lesson = { title: 'HTML 语义与表单', minutes: 25 };
</script>

<template>
  <main class="reading-room">
    <h1>我的阅读室</h1>
    <article>
      <h2>{{ lesson.title }}</h2>
      <p>预计用时：{{ lesson.minutes }} 分钟</p>
    </article>
  </main>
</template>

<style scoped>
.reading-room { max-width: 56rem; margin: 3rem auto; padding: 0 2rem; }
article { padding: 1.5rem; border: 1px solid #ccdcd3; border-radius: 12px; }
h2 { margin-top: 0; }
</style>
```

页面应显示“我的阅读室”和一张预计 25 分钟的资料卡片。先检查 `index.html` 的容器 ID 与 `mount('#app')` 是否一致，再看模块导入的文件是否存在，就能定位许多空白页问题。

入口链可以写成：浏览器取得 HTML → 加载 `main.ts` 对应的模块 → 模块导入 `App.vue` 的编译结果 → `createApp` 创建应用 → `mount` 把组件挂到容器。这是模块加载与组件创建共同完成的过程，不是浏览器直接理解 TypeScript 或 `.vue`。

把 `App.vue` 标题改成“本周阅读”，观察页面更新；再把 `mount` 的目标误写成不存在的 ID，观察警告和空白结果，最后恢复。这样的对照能说明每个文件的责任，比反复重装依赖更直接。

### SFC 把同一组件的代码放在一起

**单文件组件（single-file component）**通常简称 **SFC**。一个 `.vue` 文件把模板、逻辑和样式放在一起，是因为它们共同描述同一个组件。

| 区块 | 写什么 | 处理后去哪里 |
| --- | --- | --- |
| template | 页面结构、文本与绑定 | 编译成 Vue 可执行的渲染逻辑 |
| script setup | 导入、实例内逻辑与暴露给模板的绑定 | 转成组件的 setup 相关代码 |
| style | 组件样式 | 由构建工具处理并交给浏览器 |

模板的双大括号插入文本，冒号如 `:minutes="25"` 绑定表达式，`@click` 绑定事件处理。这些是 Vue 模板语法，最终仍要得到普通 DOM。SFC 的存在没有改变 [HTML 控件语义](../chinese-guides/web-01-html-semantics-forms-accessibility.md#链接负责去哪里按钮负责做什么)。

这与“把页面所有东西塞进一个文件”不同。一张资料卡片适合独立组件，整套账户系统却不应只因能放进一个 SFC 就放进去。拆分依据是责任和变化，而不是模板超过某个机械行数。

也不要把 script setup 当成浏览器生命周期事件。它不等于“页面加载完成后执行”，其中的 DOM 可能还没有挂载。需要读实际节点时，要结合挂载时机与模板引用。

### 模块执行一次与每个实例执行不是一回事

在同一模块实例中，普通模块顶层通常只求值一次；组件可以创建多个实例。`script setup` 中需要按实例执行的逻辑会进入组件 setup，顶层 import 仍属于模块导入。

创建 `src/ReadingCard.vue`：

```vue example=vue01-card runtime=project file=src/ReadingCard.vue
<script setup lang="ts">
import { ref } from 'vue';

defineProps<{ title: string; minutes: number }>();
const expanded = ref(false);
</script>

<template>
  <article>
    <h2>{{ title }}</h2>
    <button type="button" :aria-expanded="expanded" @click="expanded = !expanded">
      {{ expanded ? '收起说明' : '展开说明' }}
    </button>
    <p v-if="expanded">这份资料预计需要 {{ minutes }} 分钟。</p>
  </article>
</template>
```

再将 `src/App.vue` 替换为：

```vue example=vue01-two-cards runtime=project file=src/App.vue
<script setup lang="ts">
import ReadingCard from './ReadingCard.vue';
</script>

<template>
  <main>
    <h1>两张独立的资料卡片</h1>
    <ReadingCard title="HTML 表单" :minutes="25" />
    <ReadingCard title="状态快照" :minutes="30" />
  </main>
</template>
```

点击第一张卡片的“展开说明”，第二张仍收起。因为 `expanded` 在各自 setup 中创建，每个组件实例有自己的 ref。这里暂时把 ref 理解为可以追踪变化的容器；下一篇会详细拆解它。

如果把这个可变 ref 移到单独模块顶层再让两个组件共同导入，就变成共享状态。共享可以是需求，也可以是 bug，区别取决于谁应该拥有这份数据。服务端渲染还涉及多个请求之间的隔离，不能随意把用户状态放进进程共享模块。

`defineProps` 是编译器宏，不需要从 Vue 导入，也不能当成任意位置都可调用的普通函数。同类宏如 `defineEmits` 用于声明组件边界；它们的详细用法在后续组件知识点展开。需要回顾模块绑定与缓存时，阅读 [JS-06 的模块求值](../chinese-guides/js-06-es-modules-module-boundaries.md#模块图不是把代码按文字顺序粘起来)。

### Vite 开发与生产使用同一份源码但处理方式不同

开发时，Vite 根据浏览器请求转换源码，并利用模块关系更新受影响部分。改变一个组件，不必把整个生产包重新生成后再刷新页面。依赖还可能经过**依赖预构建（dependency pre-bundling）**，处理模块格式或过多小模块带来的开发加载成本。

生产构建会从入口分析依赖图，转换、分块和优化，输出可以部署的 HTML、JavaScript、CSS 与资源。具体内部构建器会随 Vite 版本变化，本篇不把某个实现名字写成永久规则。

因此，“开发能运行”与“产物能部署”是相关但不同的结论。例如源码中使用仅开发存在的代理地址，开发访问正常；构建后静态文件并不会随身携带那台代理。又如 Windows 上不易察觉的文件名大小写错误，放到大小写敏感的环境可能导致模块或资源找不到。

遇到错误，先判断发生在源码转换、类型检查、模块解析、产物生成，还是浏览器加载阶段。只有确认阶段，下一步查看控制台、终端或网络请求才有方向。

### 目录随职责增长不必一开始就铺满层级

刚才三个文件的项目不需要提前创建几十个空目录。功能多起来后，可以围绕一条真实变化路线组织：

```text
src/
  main.ts
  App.vue
  app/                    路由与应用装配
  features/
    reading/
      ReadingPage.vue     阅读页面，组合本功能的组件
      ReadingCard.vue     资料卡片
      reading-service.ts  本功能的数据读取与解析
      index.ts            需要对外公开的入口
  components/             多个业务确实共用的展示组件
  styles/                 全局颜色、排版与基础样式
```

“页面”通常负责取得页面需要的参数与数据，并组合功能；“组件”负责可独立理解的一块界面；“服务”把网络响应转换为应用需要的数据。不要仅靠把文件放进 services 就认为外部数据已经可信，解析仍需要实际代码。

如果修改一张资料卡片总要穿过全局 components、utils、stores 中很多不相关文件，按业务就近组织可能更容易维护。反过来，一段只使用一次的两行函数，没有必要为了目录整齐拆到公共工具包。

跨功能访问优先经过明确入口。别名能缩短路径，却不应让调用方深入另一个功能的内部实现。这里与 [JS-06 的公共导出](../chinese-guides/js-06-es-modules-module-boundaries.md#公共导出应该小于内部实现)遵循相同原则。

如果项目加入 Router，可以按“main 安装路由 → App 提供路由出口 → 路由表选择页面 → 页面组合组件”继续追踪。页面文件不会因为放进 pages 目录就自动成为路由，具体注册规则由所用工具决定。

### 别名需要让构建工具和类型工具指向同一处

当目录加深，`@/features/reading/ReadingPage.vue` 比多层 `../../` 更容易辨认，但 `@` 不是 JavaScript 内置语法。下面是包含 Vue 插件与别名的完整 Vite 配置示意，合并到已有配置时保留项目其他必需插件：

```ts example=vue01-alias runtime=project file=vite.config.ts
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
```

还要让检查应用源码的 TypeScript 配置解析同一位置。例如在已有 `tsconfig.app.json` 的 `compilerOptions` 中合并以下内容，而不是把整份生成配置删掉重写：

```json
{
  "baseUrl": ".",
  "paths": { "@/*": ["src/*"] }
}
```

路径相对于这份配置的位置解释；配置不在项目根目录时，应相应调整。TypeScript 的 paths 帮助类型解析，不会替你改写运行时的 import。只配它可能编辑器通过但构建失败；只配 Vite 则可能页面可用而编辑器找不到类型。

Vite 配置运行在工具环境，可以导入 `node:url`；浏览器里的组件不能因此使用全部 Node API。遇到 node 模块类型缺失，还应确认脚手架的 Node 类型与配置检查范围，别把工具配置硬塞进只面向 DOM 的类型环境。

### 环境变量进入客户端以后就是公开配置

API 的公开地址、显示开关等可以随环境变化。Vite 通过 `import.meta.env` 提供这些信息，自定义变量默认需要 `VITE_` 前缀才暴露给客户端；前缀也可以由项目配置调整。

在项目根目录 `.env.development` 中写：

```dotenv
VITE_API_BASE=/api
VITE_SHOW_READING_TIPS=false
```

创建一个可在组件中导入的 `src/public-config.ts`：

```ts example=vue01-public-config runtime=project file=src/public-config.ts
const apiBase = import.meta.env.VITE_API_BASE?.trim();
if (!apiBase) throw new Error('缺少公开 API 地址 VITE_API_BASE');

const tipsFlag = import.meta.env.VITE_SHOW_READING_TIPS;
if (tipsFlag !== undefined && tipsFlag !== 'true' && tipsFlag !== 'false') {
  throw new Error('VITE_SHOW_READING_TIPS 应为 true 或 false');
}
export const publicConfig = {
  apiBase,
  showReadingTips: tipsFlag === 'true',
};
```

自定义环境变量读到的是字符串。因此 `Boolean('false')` 仍是 true，不能用它解释关闭开关。内置 `DEV`、`PROD`、`SSR` 等变量有各自类型，不要把“所有 env 都是字符串”当成通用规则。

更改 env 文件后通常需要重启开发服务。生产值一般在构建时替换进产物，部署后仅修改服务器同名环境变量，不会自动改写已经生成的静态文件。如果产品需要部署时动态配置，就要另外设计明确的加载入口。

VITE 前缀表示“允许进入客户端”，并不表示加密。数据库密码和服务端密钥不应出现在这些配置中；能在浏览器脚本或请求中读取的地址和开关，应按公开信息对待。

mode 与生产优化也别混在一起：`vite build --mode staging` 可以读取 staging 配置，但 build 仍是在做生产构建。命令、mode、环境文件与最终值需要一起看，不能只凭文件名判断行为。

### 图片进入依赖图还是保持固定名字

资源有两条常见路径。需要与源码一起追踪的图片放在 src 中，通过导入得到 URL；必须保留固定名称的文件可以放在 public。

例如新建 `src/assets/book.svg`：

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect x="6" y="4" width="20" height="24" rx="3" fill="#38745a"/>
  <path d="M11 10h10M11 15h10M11 20h7" stroke="white" stroke-width="2"/>
</svg>
```

然后在独立的 `App.vue` 中使用：

```vue example=vue01-asset runtime=project file=src/App.vue
<script setup lang="ts">
import bookUrl from './assets/book.svg';
</script>
<template>
  <main>
    <h1><img :src="bookUrl" alt="" width="32" height="32"> 我的阅读室</h1>
  </main>
</template>
```

图标在此处只是装饰，旁边已有标题，因此空 alt 避免重复描述。导入资源进入构建依赖图，构建工具可能生成带 hash 的文件，也可能把足够小的资源内联；不要承诺每次一定出现单独图片文件。

`public/robots.txt` 的访问路径通常是站点公共根下的 `robots.txt`，而不是 `public/robots.txt`。部署在子路径时，还要考虑 Vite 的 `base`；手写根路径和由工具转换的导入 URL 不是同一回事。静态 URL、动态拼接路径与公共资源各自如何处理，应按实际部署路径核对。

### 开发代理不会装进 dist

本地前端和后端运行在不同端口时，开发服务器可以代理 `/api`。下面是项目根目录的另一份完整配置示例，演示本地后端地址：

```ts example=vue01-proxy runtime=project file=vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': { target: 'http://127.0.0.1:3000', changeOrigin: true },
    },
  },
});
```

使用这个例子需要本机后端实际监听对应地址；没有后端时，代理失败是预期现象。浏览器请求开发服务器的 `/api/lessons`，Vite 再转给后端。这里没有 rewrite，所以路径中的 `/api` 会保留。

构建后，dist 是静态产物，不含开发代理进程。正式服务若仍使用 `/api`，就需要部署服务器配置对应转发，或者采用明确的公开 API 地址。不要因为本地代理正常，就把线上 404 归因于 Vue 的响应式或组件代码。

代理和 CORS 处理的是访问路径与浏览器跨源读取规则；服务端身份和权限判断仍要存在。这个例子的意义是看清请求经过谁，不要求在入门阶段搭建完整生产网络。

### HMR 保留开发状态但不承担持久化

保存组件文件后，页面往往立即变化，这叫**热模块替换（hot module replacement）**，简称 **HMR**。Vue 插件会尽量在适合的修改中保留组件状态，减少开发时重复操作。

可以展开刚才第一张资料卡片，修改模板中的说明文字，观察是否保留展开状态；再完整刷新，展开状态会按组件初始值重建。不同修改可能触发不同程度的重建，不能把“某次热更新保留了”当作产品保证。

如果改代码越多，计时器或监听器越多，要查资源是否有清理，而不是期待刷新永久解决。模块顶层副作用与组件实例生命周期是不同范围；相关原则可以回看 [JS-06 的导入副作用](../chinese-guides/js-06-es-modules-module-boundaries.md#导入时发生的副作用需要有人负责结束)。

遇到只在热更新后出现的问题，做一次完整刷新作为对照很有帮助。源码冷启动也能复现时，再沿入口和状态路径继续查；不要一开始就同时删缓存、换版本和改业务代码。

### Scoped CSS 限制选择器不隔离整个世界

`<style scoped>` 会让编译器为选择器与相应元素加入作用域标记。概念上，`.card` 会变成匹配带特定属性的 `.card[data-v-xxxx]`，从而减少组件样式意外命中其他位置。

它不是 Shadow DOM，也不是禁止外部 CSS 影响的墙。全局样式可以影响组件，字体与颜色可以继承，CSS 自定义属性也会沿正常规则传递。子组件根节点可同时受到父组件 scoped 样式与自己的 scoped 样式影响，这常用于父层控制布局。

需要选择子组件内部元素时可以用 `:deep()`，但这会增加对内部结构的依赖。先看看组件是否提供合适的 prop、class 或变量入口，再决定是否穿透。Teleport 改变节点的 DOM 位置，也会影响依赖祖先关系的选择器，不要只看组件源码嵌套。

把全局排版和颜色变量放在明确入口，组件局部样式跟随组件，跨组件覆盖保持可搜索。遇到规则不生效，查看真实 DOM、生成选择器与层叠顺序，比连续叠加 `!important` 更容易得到可维护的结果。

### 类型检查和构建各自回答不同问题

故意把卡片的 `:minutes="25"` 改成 `minutes="很多"`：模板可以被转成 JavaScript，但这不代表 props 类型正确。Vue 项目常用 `vue-tsc` 检查 SFC 与模板关系，而 Vite 的 TypeScript 转换本身不等于完整类型检查。

本篇练习的必要核对可以很集中：确认脚本包含类型检查；生成一次生产产物；本地预览标题、卡片和资源。若使用路由，再检查直接访问页面地址与刷新时服务器是否正确返回入口。无须为认识一个 SFC 就先建立庞大的测试体系。

锁文件保存实际依赖解析结果，便于另一台机器重现同一套工具。团队应约定 Node 与包管理器范围；升级时读对应版本说明，再看实际锁文件和产物变化。仅修改版本范围并不能证明所有人已使用同一依赖版本。

当页面空白时，可以按入口顺序逐项说明证据：HTML 是否成功返回，模块请求是否成功，挂载容器是否存在，组件是否编译，运行时是否抛错，资源路径是否正确。这样定位到哪一层，就只修改相关问题，避免让简单错误被更多无关调整掩盖。

### 参考与延伸阅读

- [Vue：快速上手](https://cn.vuejs.org/guide/quick-start.html)：查当前脚手架、环境要求与创建步骤。
- [Vue：script setup](https://cn.vuejs.org/api/sfc-script-setup.html)：查实例执行、编译器宏和顶层绑定。
- [Vue：SFC CSS 功能](https://cn.vuejs.org/api/sfc-css-features.html)：查 scoped、deep、插槽与全局选择器。
- [Vite：开始](https://cn.vite.dev/guide/)：查开发与构建入口，并切换到所用版本的文档。
- [Vite：环境变量和模式](https://cn.vite.dev/guide/env-and-mode)：查变量前缀、类型、替换与 mode。
- [Vite：静态资源处理](https://cn.vite.dev/guide/assets)：查导入资源、public 与部署路径。
