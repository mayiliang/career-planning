# Vue 3 项目学习指南

更新时间：2026-08-03

这份指南用 Career Atlas 的真实实现解释 Vue 3 项目结构。它不是另一份固定课程表；可以在阅读相应代码时按需查阅。

## 1. 项目入口与工具

```text
apps/web/
├── vite.config.ts              Vite、开发代理、测试和构建分块
├── src/main.ts                 createApp、Router、Pinia、Vue Query
├── src/router/index.ts         路由与页面懒加载
├── src/api/client.ts           fetch、Zod DTO、SSE 消费
├── src/app/                    应用外壳与全局视觉
├── src/features/               按业务功能组织的页面
├── src/components/             可复用业务组件
└── src/utils/                  Markdown、浏览器代码运行等纯能力
```

Vite 的 `/api` 开发代理把浏览器请求转发到 `127.0.0.1:41730`。生产环境由 Nginx 完成相同路径转发，所以组件不需要区分开发/生产 API 地址。

## 2. SFC 与 Composition API

页面采用 `<script setup lang="ts">`：

```vue
<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const source = ref('')
const hasContent = computed(() => Boolean(source.value.trim()))
watch(source, () => schedulePreview())
</script>

<template>
  <button :disabled="!hasContent">保存</button>
</template>
```

- `ref` 保存可变 UI 状态；模板会自动解包。
- `computed` 表达派生数据，不产生副作用。
- `watch` 只用于需要副作用的边界，如加载新路由、调度预览和取消旧任务。
- `onBeforeUnmount` 清理 AbortController、定时器和动画帧。

## 3. 页面状态与服务端状态

Career Atlas 不把所有数据塞进 Pinia：

- API 真源通过 `api/client.ts` 和 Vue Query 获取。
- 页面编辑草稿、当前标签、弹窗和流式文本用局部 `ref`。
- 多页面真正共享且需要客户端拥有的偏好才适合 Pinia。

知识详情页展示了完整模式：路由参数生成 `code` computed；`watch(code, load)` 在切换知识点时重新取数；笔记、分支和详情并行加载；AI 任务用 AbortController 在组件卸载时停止。

## 4. 组件契约

`PracticeWorkspace.vue` 使用强类型 props 和 emits：

```ts
const props = defineProps<{
  pointCode: string
  pointTitle: string
  activity: LearningActivity
}>()

const emit = defineEmits<{ completed: [activityId: string] }>()
```

父组件传入任务合同，子组件拥有草稿、站内执行和验证交互；验证通过后只发出业务事件，不直接修改父页面提示。这种边界比把整个详情对象双向绑定给子组件更容易测试。

## 5. 现代 Markdown 组件

`MarkdownRenderer.vue` 是值得重点学习的异步渲染组件：

- `source` 和 `thinking` 是独立 prop，避免把模型推理混入最终正文。
- `streaming` 决定立即渲染还是合并 72ms 内的更新。
- `requestAnimationFrame` 把 DOM 提交对齐浏览器绘制。
- Mermaid 使用动态 `import()`，只有页面真的出现图形才下载运行时。
- `revision` 防止旧异步图覆盖新文本。
- `onBeforeUnmount` 清理计时器和帧回调。
- scoped CSS 配合 `:deep()` 为 `v-html` 生成内容设置样式。

`v-html` 本身不安全，所以 HTML 只能来自 `utils/markdown.ts`：原始 HTML 关闭、链接受限、DOMPurify 清洗、Mermaid strict。不要在其他页面直接渲染用户或 AI 字符串。

## 6. SSE 与响应式流

API 客户端用 `ReadableStream.getReader()` 消费 SSE，把事件分成：

- `progress`：状态文字；
- `thinking`：推理增量；
- `delta`：正文增量；
- `done`：Zod 校验后的最终对象；
- `error`：抛出可显示错误。

页面只累积字符串，渲染组件负责节流。这样网络协议、业务状态与 DOM 性能各自有明确所有者。

## 7. 路由与会话恢复

页面通过 Vue Router 参数获取知识点或挑战 ID。创建挑战返回已存在会话时，路由 query 带上恢复标记，挑战页用 computed 形成一次性说明。恢复是正常分支，不应通过全局错误弹窗处理。

## 8. 样式与布局

- Grid 用于同级卡片对齐，`align-items: stretch` 让一行轨道等高。
- 内容高度不同不靠固定 `min-height` 制造空白；内部使用 flex/grid 分配空间。
- Markdown 表格、公式、代码和图形在局部滚动。
- 组件尊重 `prefers-reduced-motion`。
- 移动断点切单列，按钮可换行且不缩到不可点击。

## 9. 类型与测试

- API 每个响应先通过 Zod，再进入组件。
- `vue-tsc --noEmit` 检查模板与 script 的联合类型。
- Vitest 覆盖纯工具、服务和状态规则；Playwright 覆盖真实页面流程。
- 对流式 UI 不只断言“出现文字”，还要检查最终快照、取消行为、thinking/正文分离和高频更新性能。

常用命令：

```bash
pnpm --filter @career-atlas/web test
pnpm --filter @career-atlas/web lint
pnpm --filter @career-atlas/web build
pnpm --filter @career-atlas/web test:e2e
```

## 10. 建议阅读路径

1. `main.ts` 与 `router/index.ts`：应用如何启动和分包。
2. `TodayPage.vue`：computed、空状态和组合 API。
3. `KnowledgeDetailPage.vue`：并行加载、表单、AbortController、父子组件。
4. `PracticeWorkspace.vue`：强类型组件合同和站内执行。
5. `MarkdownRenderer.vue`、`utils/markdown.ts`：安全渲染、异步任务和性能。
6. `AssessmentPage.vue`、`api/client.ts`：SSE、会话恢复、渐进帮助和 AI 状态。

对应知识点的中文资料、练习和 M1～M4 挑战继续维护在 `docs/knowledge/knowledge-base/11-vue-development.md`。
