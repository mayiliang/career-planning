# Vue 知识点讲义

## VUE-04 类型化组件契约、Slots、`v-model` 与 Teleport

Vue 组件不是模板片段，而是具有输入、输出、组合位置和生命周期的模块。一个可维护的组件要明确哪些数据由父层拥有、哪些事件只是意图、插槽能访问哪个作用域、`v-model` 的值与事件怎样配对，以及内容 Teleport 到别处后逻辑树与 DOM 树为什么不同。

### 学习前先确认

- 直接前置：[VUE-03 模板语法、指令、事件与表单](../chinese-guides/vue-03-template-directives-events-forms.md#vue-03)。它会继续链接响应式、HTML、TypeScript 与模块基础。

跨组件全局状态和依赖注入留到 VUE-06/VUE-08；本讲专注单个组件及其父子合同。

### 一、props 是父层给出的只读输入

组件通过**属性输入（property input）**接收父级数据，通过**组件事件（component event）**表达意图；`v-model` 是一种**双向绑定协议（two-way binding protocol）**，不代表父子双方同时拥有状态。后文的 slot 与 Teleport 只是扩展内容和放置方式，仍必须服从这份所有权合同。

```vue
<script setup lang="ts">
type Status = 'draft' | 'submitted' | 'approved';

const props = defineProps<{
  orderId: string;
  status: Status;
  title?: string;
}>();
</script>
```

`defineProps` 是编译器宏。类型声明为开发期提供推断，运行时仍需考虑外部数据是否已验证。子组件不能修改 prop 绑定，也不应修改 prop 对象深层字段；单向数据流要求修改意图交回所有者。

可选 prop 的默认值可以使用解构默认或 `withDefaults`，但默认对象/数组要注意实例隔离和版本行为。默认值不是运行时输入校验，来自 JSON 的未知状态仍应在边界解析。

### 二、事件是意图合同而不是隐式冒泡

```ts
const emit = defineEmits<{
  submit: [orderId: string];
  cancel: [];
  'update:status': [value: Status];
}>();
```

Vue 组件事件不像原生 DOM 事件那样沿组件树自动冒泡。祖先若需要知道，应由中间层明确转发、提升状态或使用适当共享机制。

事件名应表达业务意图。`submit` 比 `button-click` 更稳定，因为组件可以换实现。payload 应最小且足够：传稳定 ID 或经过定义的草稿，不要把内部 reactive 对象和 DOM Event 原样泄漏给父层。

### 三、类型合同与运行时合同必须一致

TypeScript 只检查参与编译的调用者。来自旧 JavaScript、服务端渲染 payload、动态组件或外部包的值可能绕过。关键 prop 可以提供运行时 validator，但 validator 也不应承担完整业务解析。

发布组件库时，类型声明、运行时代码和文档示例必须来自同一版本。新增必填 prop 是破坏性变化；把事件 payload 从 ID 改为对象也会影响消费者。语义化版本与迁移说明属于组件 API 合同的一部分。

### 四、Slots 把渲染控制交给父层

```vue
<Panel>
  <template #title>订单详情</template>
  <OrderEditor />
  <template #actions><SaveButton /></template>
</Panel>
```

**插槽（slot）**允许容器规定结构、父层提供内容。插槽内容在父组件作用域编译，所以能读取父层数据，不能直接读取子组件内部变量。

容器仍负责其语义：Panel 应把标题与 section 关联，actions 的 DOM 顺序要符合键盘顺序。命名插槽应按角色命名而不是位置命名，例如 `actions` 比 `right` 更能适应布局变化。

### 五、作用域插槽由子层提供数据

```vue
<DataList :items="orders" v-slot="{ item, selected }">
  <OrderRow :order="item" :selected="selected" />
</DataList>
```

子组件通过 slot props 暴露渲染所需的最小数据，父层决定表示方式。这叫**作用域插槽（scoped slot）**。它适合“逻辑/状态在子层，视觉在调用者”的场景。

slot props 也是公共 API。若把内部 store、可写 reactive 对象或大量实现字段全部暴露，父层会依赖细节。优先提供只读值和明确动作，并记录空态、错误与键盘语义由哪一层负责。

### 六、组件 `v-model` 是 prop 与 update 事件

默认模型可以理解为 `modelValue` 加 `update:modelValue`。现代 Vue 可用 `defineModel`：

```vue
<script setup lang="ts">
const model = defineModel<string>({ required: true });
</script>

<template>
  <input :value="model" @input="model = ($event.target as HTMLInputElement).value">
</template>
```

父层仍是值的所有者。子层写 `model` 会发出更新事件，由父层状态改变后再下传。不要在子层另存 `localValue` 并用两个 watch 双向同步，除非明确区分“编辑草稿”和“已提交值”。

### 七、多个模型需要清晰语义

```ts
const firstName = defineModel<string>('firstName', { required: true });
const lastName = defineModel<string>('lastName', { required: true });
```

多个 `v-model` 适合确实独立的受控值。若十几个字段都成为模型，组件可能只是把一个领域表单拆成难以保持一致的局部更新。此时传入草稿对象并发出结构化变更、或让表单拥有局部草稿和统一 submit，往往更清晰。

自定义 modifier 会改变值转换，应处理空值、IME 和类型。不要用 modifier 承担服务器校验或权限规则。

### 八、受控值与内部草稿要分开命名

日期编辑器可能接收已提交 `modelValue`，用户在弹层中编辑草稿，点击确认才提交。此时两份值有不同生命周期：

```ts
const model = defineModel<Date | null>();
const draft = ref<Date | null>(model.value);

function confirm() {
  model.value = draft.value;
}
```

打开时如何同步、取消是否丢弃、外部值在编辑中变化如何处理，都必须明确。用 watch 无条件互相复制会覆盖用户输入或产生循环。最好用打开/确认/取消事件建立状态机。

### 九、透传 attributes 是便利也是边界

单根组件会把未声明 attributes 透传到根元素。包装 input 时，如果根是 div，`id`、`aria-describedby` 和原生事件可能落错位置。可关闭自动继承并把 `$attrs` 明确绑定到真实控件：

```vue
<script setup lang="ts">
defineOptions({ inheritAttrs: false });
</script>

<template>
  <label>邮箱 <input v-bind="$attrs"></label>
</template>
```

还要决定 class/style 合并、事件监听和多个根节点的目标。组件库应测试调用者提供的名称、描述和禁用状态是否最终落到正确 DOM。

### 十、模板 ref 是 DOM/实例逃生口

模板 ref 适合聚焦、测量或调用经过设计的公开实例方法。`defineExpose` 可以限制父层可访问内容。若父层需要读取子组件所有内部 state 或调用许多命令，通常说明合同过于隐式。

DOM ref 只在挂载后可用，条件渲染和卸载时可能变回 null。读取尺寸要考虑布局时机和 ResizeObserver，不能在 render 逻辑中假设节点永远存在。

### 十一、Teleport 改变 DOM 放置但不改变逻辑所有权

```vue
<Teleport to="body">
  <dialog ref="dialog" aria-labelledby="dialog-title">...</dialog>
</Teleport>
```

**传送（Teleport）**把一段 DOM 渲染到组件 DOM 层级之外，常用于弹窗、通知和浮层，以避开 overflow 或层叠上下文。它仍属于原 Vue 组件树：props、inject、响应式状态和组件事件关系不因 DOM 位置改变。

因此要同时画两棵树：逻辑组件树决定所有权与注入，DOM 树决定 CSS、事件路径、焦点、可访问性和查询范围。把内容 Teleport 到 body 不会自动获得正确 z-index、焦点闭环或滚动锁定。

### 十二、Teleport 不是安全或样式隔离

传送内容仍在同一 document，可被全局 CSS 和脚本访问。目标选择器必须存在，SSR/hydration 时客户端与服务器结构也要一致。多个应用共享 body 目标时，要避免 ID 冲突和相互清理。

弹窗优先使用原生 dialog 或经过验证的组件协议；Teleport 只是放置能力。服务端授权、HTML 净化、点击劫持防护都不由它解决。

### 十三、组件合同要包含无障碍责任

表单组件应让调用者能提供 `id`、名称、描述和错误关系；弹窗组件要定义初始焦点、Escape、关闭归还；菜单组件要定义键盘模式和 active item。不能以“调用者可以传 slot”推卸所有语义，也不能在内部硬编码重复 ID。

公共组件可在类型层要求必要 label，运行时开发模式给出警告，并用组件测试检查生成 DOM。但最终页面仍需验证组合后的标题层级和焦点顺序。

### 十四、事件、插槽和模型的选择

- props：父到子的只读数据；
- emits：子到父的离散意图；
- slot：父层决定子容器中的内容；
- scoped slot：子层提供数据，父层决定表示；
- v-model：父层拥有、子层可请求更新的连续值；
- provide/inject：跨多层的依赖或有限共享状态。

不要因为某种语法方便就替代所有通信。特别是 event bus 会隐藏来源和生命周期，通常不适合作为默认组件通信。

### 十五、验证组件公共合同

测试应从调用者角度挂载组件，提供合法/非法 props，触发用户事件并检查 emit payload、模型更新、slot 输出和最终 DOM。对 Teleport 要把目标加入 document，测试打开、Tab/Escape、关闭归还与卸载清理。

类型测试可证明错误事件名和 payload 被拒绝；运行时测试证明键盘与 DOM；Story/示例证明不同组合仍清晰。三者共同组成可发布组件证据。

### 进阶：透传属性与多根节点需要显式决定落点

单根组件默认把未声明 attribute 和监听器透传到根元素，但组件内部重构根元素后，class、aria 属性或事件可能落到错误对象。多根组件无法自动决定落点。使用 `inheritAttrs: false` 和 `$attrs` 时，应把它们放到真正代表公共交互表面的元素，并在类型/文档中说明。

不能盲目把 `$attrs` 同时展开到多个节点，否则同一事件执行多次，id 与 aria 关系也会重复。组件测试检查最终 DOM 元素类型、名称、disabled 与事件次数，而不只检查 wrapper props。

### 进阶：异步与动态组件仍要保持同一合同

`<component :is>` 允许在同一位置切换实现，业务 identity 应由稳定 key 表达；不同实现若共享 v-model/slot，必须遵守相同值和事件语义。异步组件增加 loading、timeout、error 与重试状态，不能假设加载失败时父级合同自动恢复。

把组件注册表限制为允许映射，不把服务端字符串直接当组件对象。需要 SSR 时确认首屏选择可确定、chunk 在滚动发布中可用，并为未知类型提供可访问的安全 fallback。

### 学完后应能说明

你应能说明 props/emits 的所有权合同、普通与作用域 slot 的作用域、组件 `v-model` 的真实展开、内部草稿为何需要独立生命周期、attributes 如何落到正确 DOM，以及 Teleport 后逻辑树与 DOM 树分别决定什么。
