# Vue 项目学习指南

更新时间：2026-07-13

这份指南基于 Career Atlas 的真实代码，解释 Vue 3 项目开发的核心概念。目标是在实现功能的同时，留下可复习、可考核的学习材料。

---

## Phase 0：项目脚手架与启动流程

### 需求背景

Career Atlas 是一个本地 Web 应用，需要 Vue 3 前端和 Fastify 后端。Phase 0 的目标是建立可持续开发的基础环境。

### 涉及文件

```
apps/web/
├── package.json         # 依赖和脚本
├── vite.config.ts       # Vite 构建配置
├── tsconfig.json        # TypeScript 严格模式
├── index.html           # HTML 入口
└── src/
    ├── main.ts          # Vue 应用入口
    ├── app/App.vue      # 根组件
    ├── router/index.ts  # Vue Router 配置
    └── api/client.ts    # API 客户端
```

### 核心概念

#### 1. Vite 开发服务器

Vite 是 Vue 3 官方推荐的构建工具。相比 Webpack，它使用原生 ES 模块，开发时启动更快。

**配置要点**：

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    vue(),                    // Vue SFC 支持
    AutoImport({ ... }),      // 自动导入 Vue API
    Components({ ... }),      // 自动注册组件
  ],
  server: {
    port: 41731,
    proxy: {
      '/api': { target: 'http://127.0.0.1:41730' }  // API 代理
    }
  }
})
```

#### 2. Vue 应用入口

**main.ts** 是应用启动的起点：

```typescript
import { createApp } from 'vue'
import App from './app/App.vue'

const app = createApp(App)
app.use(router)      // 注册路由
app.use(pinia)       // 注册状态管理
app.mount('#app')    // 挂载到 DOM
```

这与 React 的 `ReactDOM.createRoot()` 类似，但 Vue 的插件系统通过 `app.use()` 注册。

#### 3. SFC（单文件组件）

Vue 组件使用 `.vue` 文件，包含 `<script>`、`<template>` 和 `<style>`：

```vue
<script setup lang="ts">
// Composition API 逻辑
import { ref } from 'vue'
const count = ref(0)
</script>

<template>
  <!-- 模板声明式渲染 -->
  <button @click="count++">{{ count }}</button>
</template>

<style scoped>
/* 组件私有样式 */
</style>
```

**与 React JSX 的差异**：
- Vue 模板有编译期优化（静态提升、缓存）
- 模板中使用 `@click` 而非 `onClick`
- `ref` 在模板中自动解包，不需要 `.value`

#### 4. Composition API

Vue 3 推荐使用 `<script setup lang="ts">`，这是 Composition API 的编译器语法糖：

```typescript
// 不需要 return，变量自动暴露给模板
const statusText = computed(() => {
  if (error.value) return '服务离线'
  return '服务正常'
})
```

**与 React Hooks 对照**：

| React | Vue | 说明 |
| --- | --- | --- |
| `useState` | `ref` / `reactive` | Vue 模板自动解包 ref |
| `useMemo` | `computed` | computed 有依赖追踪，不依赖手动声明 deps |
| `useEffect` | `watch` / `watchEffect` | Vue 明确区分同步副作用和异步监听 |

#### 5. Vue Router

路由配置使用路由表，支持懒加载：

```typescript
const routes = [
  { path: '/', component: () => import('@/features/today/TodayPage.vue') }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})
```

**与 React Router 差异**：
- Vue Router 是静态路由表，不支持动态路由组件
- 路由守卫用 `router.beforeEach`，类似 React 的路由中间件
- 模板用 `<RouterLink>` 和 `<RouterView>`，非 `<Link>` 和 `<Routes>`

### 常见错误

1. **在模板中忘记 `.value`**
   ```vue
   <!-- 错误：ref 需要 .value（在模板中会自动解包） -->
   <p>{{ count.value }}</p>  <!-- 多写了 .value -->
   ```

2. **computed 里修改状态**
   ```typescript
   // computed 应只计算，不应有副作用
   const status = computed(() => {
     if (error.value) {
       counter.value++  // 错误：不应修改
     }
   })
   ```

3. **混用 Options API 和 Composition API**
   ```vue
   <script>
   export default {
     data() { return { count: 0 } }  // Options API
   }
   </script>
   <script setup lang="ts">
   const count = ref(0)  // Composition API
   // 两者不应混用
   </script>
   ```

### 本项目避免的反模式

- 不把所有状态都放进 Pinia store：服务端数据用 Vue Query，本地 UI 状态用 ref
- 不用 `watch` 复制 `computed` 的功能
- 不在模板中写复杂表达式：逻辑进入 computed 或函数

### 验证练习

1. 启动开发服务器：
   ```bash
   pnpm dev:web
   ```

2. 打开 http://127.0.0.1:41731，检查页面是否显示服务状态

3. 在 App.vue 中添加一个计数器，验证 ref 和模板绑定

### 对应知识点

- VUE-01：Vite 项目创建与启动流程
- VUE-02：SFC 与模板语法
- VUE-03：Composition API 与 ref/reactive

---

## Phase 1：内容导入与数据模型

待实现后更新...

---

## Phase 2：知识清单与学习工作区

待实现后更新...