# Vue 知识点讲义

## VUE-04 类型化组件接口、Slots、v-model 与 Teleport

一个标题输入框从页面里提取成组件后，问题会突然变多：当前值由谁保存？修改后怎么通知父层？id 和错误描述应该落到外层 div，还是实际 input？如果把弹窗传送到 body，原来的组件关系还在吗？

本篇用资料行、带标签的输入框、可定制列表和原生弹窗，逐步建立组件的公开接口。每一步都从调用者怎样使用开始，让类型、事件和最终 DOM 对应起来。

### 学习前先确认

- 直接前置：[VUE-03 模板语法、指令、事件与表单](../chinese-guides/vue-03-template-directives-events-forms.md#vue-03)。它继续链接响应式、HTML 与 TypeScript 基础。

示例使用 Vue 3.5 及之后的组合式 API；defineModel 自 Vue 3.4 起可用，useId 和响应式 props 解构涉及 Vue 3.5。每组文件独立：把同组命名组件放在 src，配套 App.vue 负责调用；不要把不同组的 App.vue 合并成一份。

### 先把输入和修改意图写成一对

资料行接收资料与当前是否选中，点击后只报告选择 ID。先创建 `src/LessonRow.vue`：

```vue example=vue04-props-row runtime=project file=src/LessonRow.vue
<script setup lang="ts">
type Lesson = Readonly<{ id: string; title: string }>;
withDefaults(defineProps<{ lesson: Lesson; selected?: boolean }>(), { selected: false });
const emit = defineEmits<{ select: [id: string] }>();
</script>
<template>
  <button type="button" :aria-pressed="selected" @click="emit('select', lesson.id)">
    {{ lesson.title }}{{ selected ? '（已选择）' : '' }}
  </button>
</template>
```

配套 `src/App.vue`：

```vue example=vue04-props-app runtime=project file=src/App.vue
<script setup lang="ts">
import { ref } from 'vue';
import LessonRow from './LessonRow.vue';
const lessons = [
  { id: 'form', title: 'HTML 表单' },
  { id: 'component', title: '组件协作' },
];
const selectedId = ref<string | null>(null);
function select(id: string) { selectedId.value = id; }
</script>
<template>
  <main>
    <h1>选择阅读资料</h1>
    <ul>
      <li v-for="lesson in lessons" :key="lesson.id">
        <LessonRow :lesson="lesson" :selected="selectedId === lesson.id" @select="select" />
      </li>
    </ul>
    <p>当前 ID：{{ selectedId ?? '未选择' }}</p>
  </main>
</template>
```

点击组件协作，父层 selectedId 变成 component，再把新的 selected 下传。子组件没有修改 lesson，也不偷偷保存第二份全局选择。

**属性输入（property input）**通常直接称 props，说明子组件当前需要什么；**组件事件（component event）**说明子层提出什么意图。defineProps、defineEmits 和 withDefaults 是编译器理解的写法，不需要从 Vue 导入这些宏。

默认 selected=false 表示调用者省略该值时如何显示，不是“子层永久拥有 selected”。以后父层传入 true，子层仍应按新输入渲染。

### 类型能说明允许的调用不能代替运行时解析

事件类型 `select: [id: string]` 可以让编辑器检查事件名、参数数量和类型。错写事件名或传数字，会在合适的 Vue 类型检查中暴露。组件调用处漏掉必填 prop，也应得到诊断。

但来自网络或未参与类型检查的 JavaScript 仍可能传入错误值。类型宏生成的部分运行时 prop 信息，不能替代完整业务校验；开发警告也不等于自动拒绝操作。外部资料应先经过 [TS-01 的解析边界](../chinese-guides/ts-01-type-system-structural-strict-mode.md#外部数据经过检查后再进入业务代码)，再成为可信组件输入。

props 的只读约定也不是深度冻结。对于对象和数组，子层仍可能沿嵌套引用修改父层数据，因此要约定从 emit 或模型更新进入拥有者。TypeScript 的 Readonly 同样主要约束对应层级的静态写法，复杂嵌套需要更明确的类型或接口。

为数组或对象 prop 提供 withDefaults 默认值时，通常使用工厂函数，让每个实例得到自己的默认对象。Vue 3.5 的响应式解构默认值又有编译器支持，不应把两种语法的规则混用。第一次设计组件，优先选择团队能一致理解的写法。

### emit 不会沿组件树自动冒泡也不能用来等待保存

如果页面包含 Panel，Panel 再包含 LessonRow，LessonRow 的 select 事件不会自动传给页面。Panel 需要显式监听并转发，或由更合适的父层直接协调。组件事件与原生 DOM 冒泡是两件事。

emits 声明还能帮助区分哪些监听器是组件公开事件，哪些属于可能透传到根元素的原生监听器。尤其把 click 声明为组件事件后，调用者的监听会面向你发出的组件事件；不要同时手动 emit 和无意透传同一监听，造成重复。

更容易忽略的是异步：`emit('save', draft)` 发送事件，并不会把父层异步处理器的 Promise 交回子层。因此 `await emit(...)` 不能代表等到了保存成功，父层稍后拒绝的 Promise 也不会因此自动进入子层 catch。

需要保存进度时，可由父层管理 saving/error 再传入；如果子层必须等待完成，则显式声明一个返回 Promise 的函数 prop，并像 [React 的异步回调接口](../chinese-guides/react-02-component-boundaries-data-flow-composition.md#异步回调要说明何时才算完成)那样约定成功与失败。选择哪种方式并不重要，重要的是接口真的表达了谁负责等待。

### 组件 v-model 让值与更新意图配对

原生 input 的 v-model 处理 DOM 值和事件；组件上的默认 v-model 通常对应 modelValue prop 与 update:modelValue 事件。defineModel 把这一对关系声明在一起。

创建 `src/TitleField.vue`：

```vue example=vue04-model-field runtime=project file=src/TitleField.vue
<script setup lang="ts">
import { useId } from 'vue';
defineProps<{ label: string }>();
const model = defineModel<string>({ required: true });
const id = useId();
</script>
<template>
  <div>
    <label :for="id">{{ label }}</label>
    <input :id="id" v-model="model">
  </div>
</template>
```

配套 `src/App.vue`：

```vue example=vue04-model-app runtime=project file=src/App.vue
<script setup lang="ts">
import { ref } from 'vue';
import TitleField from './TitleField.vue';
const title = ref('组件协作');
</script>
<template>
  <main>
    <h1>修改资料标题</h1>
    <TitleField v-model="title" label="资料标题" />
    <button type="button" @click="title = '恢复后的标题'">从父层重置</button>
    <p>父层当前值：{{ title }}</p>
  </main>
</template>
```

输入时父层文字同步变化；点击重置，输入框也显示新值。父层拥有权威 title，子层通过模型提出更新。**双向绑定协议（two-way binding protocol）**是这里的便利表达，不意味着父子各自可以保存一份互不相干的最终值。

不要在 TitleField 里另建 localTitle，再写两个 watch 相互复制。只有“尚未提交的草稿”和“已确认值”确实允许不同时，才应保存两份并明确命名。

也要注意默认值：若子层 defineModel 默认 1，而父层绑定的 ref 仍是 undefined，可能出现子层显示 1、父层仍未获得值的不同步。默认值不是一次自动向父层提交。像例子一样由父层初始化，并声明模型必填，通常更清楚。

### 多个模型适合真正独立的连续值

标题和备注允许分别编辑时，可以用具名模型。创建 `src/NoteFields.vue`：

```vue example=vue04-named-fields runtime=project file=src/NoteFields.vue
<script setup lang="ts">
import { useId } from 'vue';
const title = defineModel<string>('title', { required: true });
const note = defineModel<string>('note', { required: true });
const id = useId();
</script>
<template>
  <div>
    <label :for="`${id}-title`">标题</label>
    <input :id="`${id}-title`" v-model="title">
    <label :for="`${id}-note`">备注</label>
    <textarea :id="`${id}-note`" v-model="note"></textarea>
  </div>
</template>
```

配套 `src/App.vue`：

```vue example=vue04-named-app runtime=project file=src/App.vue
<script setup lang="ts">
import { ref } from 'vue';
import NoteFields from './NoteFields.vue';
const title = ref('表单');
const note = ref('周末复习');
</script>
<template>
  <main>
    <h1>资料备忘</h1>
    <NoteFields v-model:title="title" v-model:note="note" />
    <p>{{ title }} / {{ note }}</p>
  </main>
</template>
```

修改备注不会改标题。title 模型对应 title 与 update:title，note 模型有自己的一对关系。如果字段必须一起确认，例如日期范围的开始和结束，应在拥有者中校验整体，或提交一份完整草稿，不能靠两个模型默认获得原子业务操作。

自定义模型修饰符可通过 defineModel 返回的 modifiers 与 get/set 转换处理。但子组件收到 `.trim` 不表示它已经替你实现所有自定义转换；需要说明转换时机、空值与输入法行为。逐字符改写文本可能影响编辑体验，提交时归一化往往更适合保留草稿的表单。

### 普通插槽的内容仍属于父层作用域

容器只负责结构，调用者提供标题、正文和操作区。先创建 `src/ReadingPanel.vue`：

```vue example=vue04-slots-panel runtime=project file=src/ReadingPanel.vue
<script setup lang="ts">
import { useId } from 'vue';
const titleId = useId();
defineSlots<{
  title?: () => unknown;
  default?: () => unknown;
  actions?: () => unknown;
}>();
</script>
<template>
  <section :aria-labelledby="titleId">
    <header>
      <h2 :id="titleId"><slot name="title">资料面板</slot></h2>
      <slot name="actions"></slot>
    </header>
    <slot><p>暂无内容。</p></slot>
  </section>
</template>
```

配套 `src/App.vue`：

```vue example=vue04-slots-app runtime=project file=src/App.vue
<script setup lang="ts">
import { ref } from 'vue';
import ReadingPanel from './ReadingPanel.vue';
const completed = ref(false);
</script>
<template>
  <main>
    <h1>组合阅读面板</h1>
    <ReadingPanel>
      <template #title>组件接口</template>
      <template #actions><button type="button" @click="completed = !completed">切换完成状态</button></template>
      <p>{{ completed ? '已完成' : '学习中' }}</p>
    </ReadingPanel>
    <ReadingPanel />
  </main>
</template>
```

第一块由父层提供全部内容，第二块显示默认标题与占位文字。**插槽（slot）**为容器留下内容位置，`#actions` 是具名插槽的缩写。

插槽里的 completed 来自 App，不是 ReadingPanel。内容在父层作用域编写，并不会因为显示在子组件里就能直接读取子层私有变量。defineSlots 描述名称和参数形状，主要帮助类型工具理解调用关系；它不会在运行时强制所有调用者提供每一个插槽。

actions 按用途命名，比 right 更能容纳未来布局调整。容器仍负责标题关联和 DOM 顺序，插槽也不能自动保证调用者放入的内容有正确层级。与 [React 的 children 组合](../chinese-guides/react-02-component-boundaries-data-flow-composition.md#children-让容器不必了解所有业务字段)对照，可以看到相同的职责划分。

### 作用域插槽把子层数据交给父层排版

如果列表负责遍历、提供索引，父层负责每行怎样显示，需要从子层传出 slot props。创建 `src/LessonList.vue`：

```vue example=vue04-scoped-list runtime=project file=src/LessonList.vue
<script setup lang="ts">
type Lesson = Readonly<{ id: string; title: string; minutes: number }>;
defineProps<{ items: readonly Lesson[] }>();
defineSlots<{ default?: (props: { item: Lesson; index: number }) => unknown }>();
</script>
<template>
  <ul v-if="items.length">
    <li v-for="(item, index) in items" :key="item.id">
      <slot :item="item" :index="index">{{ item.title }}</slot>
    </li>
  </ul>
  <p v-else>暂无资料。</p>
</template>
```

配套 `src/App.vue`：

```vue example=vue04-scoped-app runtime=project file=src/App.vue
<script setup lang="ts">
import LessonList from './LessonList.vue';
const lessons = [
  { id: 'form', title: 'HTML 表单', minutes: 25 },
  { id: 'slots', title: '插槽', minutes: 30 },
];
</script>
<template>
  <main>
    <h1>按自己的方式显示资料</h1>
    <LessonList :items="lessons" v-slot="{ item, index }">
      <strong>{{ index + 1 }}. {{ item.title }}</strong> · {{ item.minutes }} 分钟
    </LessonList>
  </main>
</template>
```

列表显示两行带序号和用时的内容。子层通过 slot 的绑定提供 item 与 index，父层在 v-slot 中接收它们，再选择展示方式，这就是**作用域插槽（scoped slot）**。

slot props 是公开接口的一部分，不宜把整个内部 store、DOM 实例和可写响应式对象全部传出。这里只需要资料摘要与索引。若父层要修改条目，应经过明确动作；看到一个对象引用，不代表获得随意改它的所有权。

类型化 slot 可以帮助发现读取不存在字段等问题，但不能替你判断格式化是否符合产品要求。这个例子保留 fallback，所以调用者不提供默认插槽时仍能显示标题。

### 透传属性必须落到真正的控件

把 input 包在一个 div 里以后，调用者传入的 id、disabled、aria-describedby 不应全部落到 div。创建 `src/AccessibleField.vue`：

```vue example=vue04-attrs-field runtime=project file=src/AccessibleField.vue
<script setup lang="ts">
import type { InputHTMLAttributes } from 'vue';
defineOptions({ inheritAttrs: false });
interface FieldProps extends /* @vue-ignore */ Omit<InputHTMLAttributes, 'value'> {
  id: string;
  label: string;
}
defineProps<FieldProps>();
const model = defineModel<string>({ required: true });
</script>
<template>
  <div class="field">
    <label :for="id">{{ label }}</label>
    <input v-bind="$attrs" :id="id" v-model="model">
  </div>
</template>
```

配套 `src/App.vue`：

```vue example=vue04-attrs-app runtime=project file=src/App.vue
<script setup lang="ts">
import { ref } from 'vue';
import AccessibleField from './AccessibleField.vue';
const email = ref('');
const disabled = ref(false);
</script>
<template>
  <main>
    <h1>封装后仍能使用的表单控件</h1>
    <AccessibleField id="reader-email" v-model="email" label="提醒邮箱"
      type="email" name="email" autocomplete="email" aria-describedby="email-help" :disabled="disabled" />
    <p id="email-help">用于接收已订阅的提醒。</p>
    <label><input v-model="disabled" type="checkbox"> 暂停编辑</label>
  </main>
</template>
```

点击提醒邮箱的标签，焦点应落在真实 input；勾选暂停编辑，该 input 被禁用；描述关联也在 input 上。id 和 label 已声明为 props，其他透传属性经 `$attrs` 放到明确位置。

这里的类型接口继承原生 input 属性，让调用者能获得 type、name 等提示，并排除另一个 value 来源。`/* @vue-ignore */` 告诉 Vue 宏不要把继承来的整组原生属性生成运行时 props；TypeScript 仍能看到这些类型，它们在运行时仍按透传属性处理。这是编译器对接口继承的特定标记，不是用来忽略任意类型错误的注释。

单根组件默认会透传未声明的属性与监听器，class 和 style 还有相应合并规则。多根组件无法自动判断目标，更需要显式安排。不要把同一份 `$attrs` 同时展开到多个控件，否则可能出现重复 ID、重复事件或错误名称。

`$attrs` 总能反映最新透传值，但它不是供 watch 按普通响应式对象自动追踪的状态来源。需要依赖某个值进行计算时，通常应声明相应 prop。组件 API 要表达你真正关心的输入，不能全部藏进自由透传对象。

### Teleport 移动 DOM 不改变组件的归属

有的浮层放在带 overflow 的容器里会被裁切。**Teleport** 可以把一段内容渲染到另一个 DOM 位置，逻辑上仍属于原组件。理解它时，需要同时画出两种关系：

```text
组件关系：App → ReadingDialog → 插槽内容
DOM 关系：body → app 容器
             → dialog 元素
```

props、组件事件与 provide/inject 仍按 Vue 组件关系工作；CSS 祖先选择器、原生事件传播路径、焦点和 DOM 查询则受真实 DOM 位置影响。不要把原生点击冒泡和组件 emit 混在一起理解。

Teleport 目标通常需要在挂载时存在。Vue 3.5 的 defer 可以推迟到同一轮挂载更新中解析目标，但不是等待一个任意时间以后才出现的元素。多处内容传送到同一目标也需要各自稳定的身份和合理顺序。

### 用原生 dialog 补齐弹窗的进入和退出

下面把 Teleport、有限的实例方法与原生弹窗放在同一组完整例子里。创建 `src/ReadingDialog.vue`：

```vue example=vue04-dialog-panel runtime=project file=src/ReadingDialog.vue
<script setup lang="ts">
import { onBeforeUnmount, ref, useId } from 'vue';
defineProps<{ title: string }>();
const emit = defineEmits<{ closed: [reason: 'confirm' | 'cancel'] }>();
const element = ref<HTMLDialogElement | null>(null);
const titleId = useId();
let opener: HTMLElement | null = null;
function open() {
  if (!element.value || element.value.open) return;
  opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  element.value.returnValue = '';
  element.value.showModal();
}
function restoreFocus() {
  if (opener?.isConnected) opener.focus();
  opener = null;
}
function closed() {
  const reason = element.value?.returnValue === 'confirm' ? 'confirm' : 'cancel';
  restoreFocus();
  emit('closed', reason);
}
onBeforeUnmount(() => {
  if (element.value?.open) element.value.close();
  restoreFocus();
});
defineExpose({ open });
</script>
<template>
  <Teleport to="body">
    <dialog ref="element" :aria-labelledby="titleId" @close="closed">
      <h2 :id="titleId">{{ title }}</h2>
      <slot></slot>
      <form method="dialog">
        <button value="cancel" autofocus>取消</button>
        <button value="confirm">确认</button>
      </form>
    </dialog>
  </Teleport>
</template>
```

配套 `src/App.vue`：

```vue example=vue04-dialog-app runtime=project file=src/App.vue
<script setup lang="ts">
import { ref } from 'vue';
import ReadingDialog from './ReadingDialog.vue';
const dialog = ref<InstanceType<typeof ReadingDialog> | null>(null);
const result = ref('尚未操作');
function closed(reason: 'confirm' | 'cancel') {
  result.value = reason === 'confirm' ? '已确认' : '已取消';
}
</script>
<template>
  <main>
    <h1>阅读安排</h1>
    <button type="button" @click="dialog?.open()">确认安排</button>
    <ReadingDialog ref="dialog" title="确认本周学习安排" @closed="closed">
      <p>计划阅读组件接口和状态建模两篇资料。</p>
    </ReadingDialog>
    <p role="status">{{ result }}</p>
  </main>
</template>
```

打开后焦点先到取消；确认会显示已确认；再次打开并按 Escape，结果应变成已取消，焦点返回触发按钮。每次打开重置 returnValue，避免上次确认结果被下一次 Escape 误用。DOM 中 dialog 在 body 下，仍能向 App 发 closed 事件。

模板 ref 在挂载前可能为空，defineExpose 只公开 open，不允许父层任意操作全部内部状态。这里的命令式方法是对浏览器 dialog API 的有限封装，适合“现在打开”这件事。不要把所有组件数据流都改成从父层调用十几个私有方法。

原生 showModal 本来就会进入浏览器顶层，很多 dialog 场景并不必须使用 Teleport。本例将二者组合，是为了区分“放到哪里”和“怎样作为模态对话框工作”：Teleport 不提供模态、Escape 或焦点协议，原生 dialog 提供基础，组件补上名称、返回结果和焦点归还。

### 草稿保存与弹窗开关需要各自定义

如果在这个弹窗里加入可编辑设置，要先约定：打开时复制已保存值形成草稿，确认后提交，取消后丢弃。不要在输入过程中直接改父层已保存值，再期待关闭动作自动撤销。

复杂对象尤其要小心共享引用。例如复制一个 Date 引用后调用 setDate，可能连原值一起改变；对象草稿也不能只改嵌套属性而认为顶层 ref 已经隔离。可以采用独立的表单文本结构，或明确复制需要修改的路径。更完整的版本冲突例子见 [React 的草稿与已保存数据](../chinese-guides/react-03-state-model-derived-controlled.md#草稿可以不同但保存前要核对基线)。

Teleport 也不隔离 CSS、脚本或权限。全局样式可以影响内容，祖先选择器可能因 DOM 位置变化失效；SSR 时还需要匹配的目标和注水结构。动态或异步组件同样要保持 prop、模型和插槽的接口，未知类型用允许的组件映射和明确占位，不能把任意外部字符串当组件实现。

### 选通信方式之前先说明责任

| 需要表达的事情 | 常用入口 | 谁仍然负责决策 |
| --- | --- | --- |
| 当前资料、只读状态 | props | 数据拥有者 |
| 选择、取消、确认 | emits | 监听并处理意图的父层 |
| 连续编辑一个父层值 | v-model | 父层保持权威值 |
| 把内容放入容器 | slot | 父层决定内容，容器决定结构 |
| 用子层数据定制内容 | scoped slot | 子层说明数据，父层负责排版 |
| 聚焦、打开原生弹窗 | 有限的 expose 方法 | 组件封装好 DOM 协议 |

如果接口需要解释大量隐藏前提，先缩小职责或明确所有权，再考虑更远层级的状态管理。后续 provide/inject、store 是解决特定共享范围的工具，不是缺少父子接口时的默认补丁。

核对组件时，从调用者角度检查真实结果：错误参数能否被类型工具发现，事件是否只发生一次，模型能否由父层重置，插槽数据是否符合声明，标签和焦点是否落在真实控件上。类型和实际交互相互补充，不能把宏写齐就当成公开接口已经可靠。

### 参考与延伸阅读

- [Vue：Props](https://cn.vuejs.org/guide/components/props.html)：查只读输入、默认值与运行时提示。
- [Vue：组件事件](https://cn.vuejs.org/guide/components/events.html)：查事件声明、参数与非冒泡行为。
- [Vue：组件 v-model](https://cn.vuejs.org/guide/components/v-model.html)：查 defineModel、具名模型、修饰符与默认值不同步。
- [Vue：Slots](https://cn.vuejs.org/guide/components/slots.html)：查父层作用域、fallback 和 slot props。
- [Vue：透传 Attributes](https://cn.vuejs.org/guide/components/attrs.html)：查多根节点、监听器与属性落点。
- [Vue：Teleport](https://cn.vuejs.org/guide/built-ins/teleport.html)：查目标、逻辑归属和 defer 的时机。
- [MDN：dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog)：查原生模态、关闭与焦点行为。
