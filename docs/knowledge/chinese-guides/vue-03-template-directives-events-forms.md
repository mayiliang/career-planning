# Vue 知识点讲义

## VUE-03 模板语法、指令、事件与表单

Vue 模板让响应式状态与 DOM 声明式连接，但模板不是任意 JavaScript 字符串。编译器会分析表达式、指令和事件，把它们变成渲染函数。要写出可靠界面，需要理解文本转义、属性绑定、条件与列表身份、事件传播、`v-model` 的真实展开，以及输入法和可访问表单的边界。

### 学习前先确认

- 直接前置：[VUE-02 `ref`、`reactive`、`computed` 与响应式边界](../chinese-guides/vue-02-ref-reactive-computed-boundaries.md#vue-02)。它会继续链接项目、HTML、TypeScript 和 JavaScript 基础。

组件 props、emits、slots 与 Teleport 在 VUE-04 展开。本讲先把原生 DOM 模板和表单交互讲清楚。

### 一、插值默认输出文本

Vue 的**模板语法（template syntax）**把声明式标记编译为渲染函数；以 `v-` 开头的**指令（directive）**给元素附加框架语义。事件后的 `.prevent`、`.stop` 等称为**事件修饰符（event modifier）**，而输入框的值/更新组合形成**表单绑定（form binding）**。中文输入还要认识**输入法编辑器（input method editor）**的组合阶段。

```vue
<p>{{ account.displayName }}</p>
```

双花括号会把值转换为文本并转义 HTML。即使名字包含 `<img onerror=...>`，它也应显示为文字而不是创建元素。这是模板的默认安全边界。

模板表达式可以读取当前组件上下文、调用允许的全局和执行简单运算，但不应承载复杂业务流程。复杂派生放入 computed，带副作用的动作放事件处理或显式服务。这样模板保留“界面是什么”的可读性。

### 二、`v-bind` 绑定 DOM 属性或组件 prop

```vue
<button :disabled="saving" :aria-busy="saving || undefined">
  {{ saving ? '保存中' : '保存' }}
</button>
```

冒号是 `v-bind` 缩写。绑定值按 DOM/组件规则处理，不是简单字符串拼接。布尔属性为假时应移除；ARIA 状态常需传字符串或 `undefined`，避免输出误导性的 `aria-busy="false"` 以外值。

批量 `v-bind="attrs"` 会把对象字段透传，方便但也可能覆盖名称、事件或危险 URL。设计组件公共属性时应列出允许字段，而不是把未知服务端对象直接展开到 DOM。

### 三、条件渲染决定节点生命周期

`v-if` 真正创建和销毁分支；`v-show` 保留节点，只切换显示样式。频繁切换且初始化便宜的面板可考虑 `v-show`，包含昂贵资源、敏感内容或无需后台运行的区域通常适合 `v-if`。

隐藏与卸载不同。`v-show` 下媒体、订阅和子组件实例仍存在，焦点也可能需要处理。`v-if` 重建会重置局部状态。选择前先定义切换后是否保留草稿、是否继续请求、是否允许辅助技术访问。

### 四、列表 key 保存业务身份

```vue
<OrderRow
  v-for="order in visibleOrders"
  :key="order.id"
  :order="order"
/>
```

Vue 会复用和移动节点。稳定 key 让输入值、组件状态、动画和焦点跟随正确业务记录。使用数组索引时，删除第一项可能让第二项继承第一项的输入 DOM；随机 key 则每次更新都销毁重建。

key 需要在当前兄弟列表唯一，不需要全球唯一。不要把用户可修改标题当 key；使用不可变 ID。key 也可用于明确重置某个编辑器，但不能当作修复所有响应式问题的开关。

### 五、`v-html` 绕过文本转义

```vue
<article v-html="trustedHtml" />
```

`v-html` 把字符串解释成 HTML，因此只能接收来自明确可信或经过合适净化的内容。删除 `<script>` 不足以防止事件属性、危险协议、SVG 等攻击。Vue 不会编译插入字符串中的模板语法，这也不是动态创建 Vue 组件的方式。

富文本边界还要处理标题等级、链接名称、图片替代文本和焦点元素。净化解决安全允许列表，语义审核解决可用性，两者不能互相替代。

### 六、事件处理器表达用户意图

```vue
<button type="button" @click="selectOrder(order.id)">选择</button>
```

`@click` 是 `v-on:click` 缩写。内联表达式适合简单参数传递，复杂流程放在命名函数中。命名函数应表达意图，如 `submitProfile`、`dismissDialog`，而不是 `handleThing`。

事件对象只在确实需要 DOM 信息时传入。把整个事件长期存进响应式状态会把 DOM 生命周期泄漏到业务层；应尽快提取稳定值。

### 七、事件修饰符改变 DOM 协议

`.prevent` 调用 `preventDefault`，`.stop` 阻止继续传播，`.once` 只监听一次，`.capture` 在捕获阶段监听，`.self` 要求事件目标就是当前元素。

```vue
<form @submit.prevent="submit">
```

修饰符顺序可能影响生成代码。不要随手给所有点击加 `.stop`；事件委托、弹层外点击和可访问组件可能因此失效。阻止默认表单提交后，应用必须完整接管 loading、防重、错误和恢复。

键盘修饰符只适合补充已有语义。原生 button 已支持 Enter/Space，不需要再绑定 `@keydown.enter` 造成重复激活。快捷键还要避开输入法组合、浏览器和辅助技术保留键。

### 八、`v-model` 是值与更新事件的组合

原生输入上的 `v-model` 根据元素类型展开为相应 value/checked 与输入事件：

```vue
<input v-model="name" />
```

它不是无条件“双向同步魔法”，而是语法糖。文本、复选框、单选和 select 的值模型不同。表单提交仍要读取当前状态并运行校验。

`.trim`、`.number`、`.lazy` 会改变同步行为。`.number` 不能保证结果永远是有效数字，空输入仍可能是空字符串；业务类型应容纳编辑中的中间状态，提交时再解析。

### 九、输入中的空字符串是有效编辑状态

数量输入从 `12` 删除到空，再输入 `3`，中间必须允许 `''`。如果每次输入都强制 `Number(value)`，空字符串会变成 `0`，光标和用户意图被破坏。

```ts
const quantityText = ref('');
const quantity = computed(() => {
  if (quantityText.value.trim() === '') return null;
  const value = Number(quantityText.value);
  return Number.isFinite(value) ? value : null;
});
```

源状态保存用户正在编辑的文本，派生值表达解析结果，错误根据触碰/提交策略显示。不要把“输入控件当前文本”和“已经验证的业务数量”混成一个变量。

### 十、输入法组合期间不要过早提交搜索

中文、日文等输入法会经历 compositionstart、若干 input、compositionend。若每个 input 都发送搜索，用户尚未选定的拼音片段会触发请求。

```vue
<input
  v-model="query"
  type="search"
  @compositionstart="composing = true"
  @compositionend="finishComposition"
  @input="scheduleSearch"
/>
```

处理器应在组合期间暂缓业务提交，并在结束后对最终值执行一次。不同浏览器事件顺序需要真实测试。防抖只能减少频率，不能自动理解 IME 语义。

### 十一、表单标签、描述和错误仍由 HTML 决定

```vue
<label for="email">邮箱</label>
<input
  id="email"
  v-model="email"
  type="email"
  :aria-invalid="emailError ? 'true' : undefined"
  aria-describedby="email-help email-error"
/>
<p id="email-help">用于接收通知。</p>
<p id="email-error" :hidden="!emailError">{{ emailError }}</p>
```

Vue 不会因为用了 `v-model` 自动建立 label、错误描述和焦点。组件模板最终仍必须产生正确 HTML。错误动态出现时避免重复 assertive 播报；提交失败可聚焦错误摘要或首个无效字段。

### 十二、DOM 更新需要等待调度边界

响应式状态写入后，模板 DOM 通常在下一 tick 更新。测试应使用 `await nextTick()`、Vue Test Utils 的异步触发或等待可见结果。

```ts
query.value = 'Ada';
await nextTick();
expect(input.value).toBe('Ada');
```

不要用固定延时掩盖缺少 await。另一方面，网络 Promise、动态导入和 transition 可能跨多个队列，单个 nextTick 也不保证所有外部工作结束；测试要等待真正的用户可见状态或受控 Promise。

### 十三、动态属性与 URL 仍需校验

`:href="url"`、`:src="imageUrl"` 不等于安全。来自外部的数据要限制允许协议、域名和路径；`javascript:`、开放重定向和跟踪参数可能形成风险。`target="_blank"` 的关系属性、下载文件名与跨源凭据也需要明确策略。

绑定类名和 style 对象通常不会执行脚本，但可能泄漏状态或造成 UI 欺骗。不要把任意服务端字段直接作为 CSS/DOM 属性名。

### 十四、从生成 DOM 检验模板

模板最终会成为 DOM，因此调试应查看渲染结果：元素类型、属性、文本、事件后的焦点与可访问性树。Vue DevTools 帮助查看组件与响应式状态，但不能替代浏览器 DOM 和网络面板。

列表错位先检查 key，输入不更新先检查源值与事件，提交重复先检查 button 类型和事件默认行为，读屏无名称先回到 label/ARIA 关系。按机制链定位比增加更多修饰符可靠。

### 十五、测试用户路径而不是指令存在

不必断言模板包含 `v-model`；应验证用户输入、清空、IME、提交、错误关联和键盘行为。列表测试要插入、删除、重排后确认焦点与草稿仍属于正确 ID。动态 HTML 测试要包含恶意样本并验证被转义或净化。

这些证据同时保护 Vue 代码和最终 Web 语义。框架升级后即使编译输出改变，用户行为合同仍能发现回归。

### 十六、DOM attribute 与 property 不是同一个状态层

HTML attribute 描述初始标记，DOM property 往往反映当前运行时状态。例如输入框的 `value` property 会随用户编辑变化，而原始 `value` attribute 可以仍保持初值。布尔属性以“是否存在”表达真假，字符串 `"false"` 仍可能表示存在。

Vue 会根据绑定目标选择 attribute 或 property，也允许用 `.attr`、`.prop` 明确意图。排查表单、媒体和自定义元素时，同时查看 DOM property、attribute 与组件 prop，不能只复制 Elements 面板中的一段 HTML 推断真实状态。

### 十七、自定义指令只处理低层 DOM 协议

自定义指令适合聚焦、尺寸观察、第三方 DOM 库接入等需要直接访问元素的行为。它有自己的挂载、更新和卸载钩子，因此也必须移除监听、observer 和第三方实例。业务数据流、权限和复杂状态不应藏进指令，否则输入输出难以追踪和测试。

如果同一行为需要模板、状态和交互界面，优先组件或 composable；只有复用点确实是“一个元素上的 DOM 协议”时才使用指令。这样能让模板语义仍然一眼可见。

### 进阶：表单提交要保留浏览器协议与业务状态机

一个可靠表单区分 editing、submitting、success 和 error，重复点击与回车提交进入同一入口。原生 `form` 的 submit 事件、按钮 type、required/autocomplete 和浏览器密码管理仍应工作；增强后的异步提交负责禁用重复写入、显示进度、关联字段/表单错误并在失败后保留可修正输入。

服务端返回的字段路径需要映射到实际控件，未知错误落到表单级提示。网络超时不一定表示服务端未写入，关键提交还要有幂等键或结果查询；模板修饰符无法单独解决业务一致性。

### 学完后应能说明

你应能解释模板插值和 `v-html` 的信任差别，预测 `v-if`/`v-show` 生命周期、稳定 key 的身份作用、事件修饰符的 DOM 后果、`v-model` 的展开与中间值边界，并用 IME、键盘、可访问名称和异步 DOM 测试验证表单。
