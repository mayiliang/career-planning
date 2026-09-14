# Vue 知识点讲义

## VUE-03 模板语法、指令、事件与表单

搜索框、筛选列表和提交按钮都可以用很短的 Vue 模板写出来。但代码短，不意味着行为已经想清楚：隐藏一块内容会不会丢草稿？反转列表以后，备注还属于原资料吗？中文输入尚未选词时，搜索是否应该提交？

本篇把模板还原成能观察的页面行为。从文本和属性开始，再看条件、列表、事件与表单，让每个指令都对应一个明确问题。

### 学习前先确认

- 直接前置：[VUE-02 ref、reactive、computed 与响应式边界](../chinese-guides/vue-02-ref-reactive-computed-boundaries.md#vue-02)。源状态、派生值和 DOM 更新时机会继续使用。

每个 Vue 代码块都是独立的 `App.vue`，可放入 Vue 3 项目或官方演练场。一次运行一段即可，不需要先复制前面的变量。先操作，再比较结果；组件 props 和插槽放在下一篇展开。

### 文本插值与属性绑定各有入口

先运行这个页面。资料中的尖括号应显示为文字，暂停时主按钮应不能操作：

```vue example=vue03-bindings runtime=project file=src/App.vue
<script setup lang="ts">
import { ref } from 'vue';
const title = '<strong>理解模板</strong>';
const paused = ref(false);
const visits = ref(0);
</script>
<template>
  <main>
    <h1>模板输出</h1>
    <p>{{ title }}</p>
    <label><input v-model="paused" type="checkbox"> 暂停操作</label>
    <button type="button" :disabled="paused" :aria-busy="paused" @click="visits += 1">
      {{ paused ? '已暂停' : '记录阅读' }}
    </button>
    <p>已记录 {{ visits }} 次</p>
  </main>
</template>
```

双大括号是文本插值。Vue 将值作为文本显示，不会因为 title 中包含 strong 标签就创建粗体元素。属性位置则用冒号，即 `v-bind` 的缩写；不能在属性字符串里用双大括号期待同样的绑定。

**模板语法（template syntax）**描述界面与表达式的关系，编译后成为渲染逻辑。`v-if`、`v-for` 等带 `v-` 的特殊属性叫**指令（directive）**，它们不是浏览器原生属性，而是 Vue 在编译或运行时处理的规则。

模板适合简单表达式，不适合塞入复杂业务过程。格式化一段文字很自然；筛选、校验和多个步骤的提交，应提到 computed 或命名函数中。这样读模板时仍能看清“页面要显示什么”。

### 布尔属性与字符串状态不能混着理解

`:disabled="paused"` 让真正的布尔值参与绑定；写死 `disabled="false"` 时，HTML 的 disabled 属性仍然存在，控件仍被禁用。布尔属性常以存在与否表达状态，字符串长得像 false 没有帮助。

ARIA 属性又不是全部遵守布尔属性规则。`aria-expanded="false"` 是有意义的“未展开”；`:aria-busy="false"` 也可以明确表示不忙。需要省略一个不适用的属性时，可以使用 null 或 undefined，不能用“所有 false 都该移除”的口号替代具体规则。

class 与 style 支持对象、数组等常见绑定方式，适合把视觉状态与数据联系起来。但 class 的颜色改变不能代替可访问状态：选中、无效和禁用仍要落到正确元素或属性上。

也别把 DOM attribute、DOM property 与组件 prop 混为一谈。用户编辑后的 input.value property 可以已变化，初始 value attribute 却仍是原文字。Vue 会根据绑定对象决定怎样更新，特殊场景也可用 `.attr`、`.prop` 指定。调试时要看当前运行状态，不只复制 Elements 面板中的初始标记。

### v-if 与 v-show 决定的是两种保留方式

用两个不绑定 Vue 状态的原生输入框，直接观察 DOM 自己保存的草稿：

```vue example=vue03-visibility runtime=project file=src/App.vue
<script setup lang="ts">
import { ref } from 'vue';
const visible = ref(true);
</script>
<template>
  <main>
    <h1>隐藏以后草稿还在吗</h1>
    <button type="button" @click="visible = !visible">切换显示</button>
    <section v-if="visible">
      <h2>v-if 区域</h2>
      <label>临时备注 <input value="初始备注"></label>
    </section>
    <section v-show="visible">
      <h2>v-show 区域</h2>
      <label>保留备注 <input value="初始备注"></label>
    </section>
  </main>
</template>
```

把两处都改成“周末再看”，关闭再打开。v-if 区域恢复初始备注，因为原节点被移除后重新创建；v-show 区域仍保留修改，因为节点只是通过 display 隐藏。

如果输入使用 v-model 绑定到父层仍存在的 ref，即使输入 DOM 被 v-if 重建，也会从该 ref 恢复当前文本。丢不丢数据取决于状态在哪里，不能仅凭模板有 v-if 就下结论。子组件卸载会结束它的实例，而父层持有的数据并不会自动清空。

v-show 适合需要保留实例、经常切换的区域，但隐藏不会自动停止定时器、媒体或订阅。v-if 可以按需创建分支，却可能付出反复挂载的成本。两者也都不等于权限控制；浏览器拿到的数据不会因为界面隐藏就变成不可访问。

如果用户正在面板内部操作，关闭后还要明确焦点去处。不要只让内容消失，再让键盘用户猜接下来落在哪里。完整焦点原则见 [WEB-01](../chinese-guides/web-01-html-semantics-forms-accessibility.md#焦点表示键盘接下来会操作哪里)。

### 列表 key 让输入跟随稳定身份

列表经常需要排序。运行下面的组件，在表单这一行写备注，然后反转：

```vue example=vue03-list-key runtime=project file=src/App.vue
<script setup lang="ts">
import { ref } from 'vue';
const lessons = ref([
  { id: 'form', title: 'HTML 表单' },
  { id: 'state', title: '状态建模' },
]);
function reverse() { lessons.value = [...lessons.value].reverse(); }
</script>
<template>
  <main>
    <h1>为资料写备注</h1>
    <button type="button" @click="reverse">反转顺序</button>
    <ul>
      <li v-for="lesson in lessons" :key="lesson.id">
        <label>{{ lesson.title }} 的备注 <input></label>
      </li>
    </ul>
  </main>
</template>
```

备注应跟着 HTML 表单移动。Vue 可以移动已有节点，key 帮它知道“还是同一份资料”。若把 key 改为索引，位置成了身份，保留在原节点上的输入可能被显示在另一条记录旁。

key 应在当前兄弟集合中唯一、稳定。记录 ID 通常合适，可能修改的标题、每次生成的随机数通常不合适。用 template 同时循环生成多个兄弟节点时，key 放在带 v-for 的 template 上，标识这一组输出。

同一个元素同时使用 v-if 和 v-for 容易让作用域与执行优先级难懂。Vue 中 v-if 优先于 v-for，所以它不能按你直觉读取尚未引入的循环变量。先用 computed 得到 visibleLessons，再循环显示；或使用不同层的 template 明确分支与列表。已有 [computed 筛选例子](../chinese-guides/vue-02-ref-reactive-computed-boundaries.md#computed-让筛选结果跟着源状态变化)可以直接对应这里。

React 的列表也有类似身份要求，参见 [资料备注重排](../chinese-guides/react-02-component-boundaries-data-flow-composition.md#列表重排时让草稿跟着资料走)。这是一条跨框架的数据与节点对应关系。

### 事件处理器先提取当前任务需要的值

`@click` 是 `v-on:click` 的缩写。`@click="select"` 可以传给方法处理事件，`@click="select(lesson.id)"` 则直接表达选择某条记录。需要事件对象时，在内联表达式里用 `$event`。

复杂逻辑适合命名函数，例如 submitSearch、saveDraft，而不是在模板里连续赋值、请求、清理。尽早从事件对象中取出文本、选项或 ID，避免把整个 DOM Event 当业务数据长期保存。

事件名和原生元素要相互配合。按钮本来就能被 Enter 或 Space 激活，再加一套重复的键盘点击逻辑，可能让同一操作发生两次。大多数提交需求应该监听 form 的 submit，把按钮点击与回车统一到同一个入口。

### prevent 和 stop 处理不同的问题

**事件修饰符（event modifier）**把常用 DOM 操作写在事件名后面。下面的例子同时观察默认提交和事件传播：

```vue example=vue03-events runtime=project file=src/App.vue
<script setup lang="ts">
import { ref } from 'vue';
const query = ref('表单');
const submitted = ref('尚未检索');
const parentClicks = ref(0);
const childClicks = ref(0);
function submit() { submitted.value = `检索：${query.value.trim()}`; }
</script>
<template>
  <main>
    <h1>默认行为与传播</h1>
    <form @submit.prevent="submit">
      <label>关键词 <input v-model="query" required></label>
      <button type="submit">检索</button>
    </form>
    <p role="status">{{ submitted }}</p>
    <div @click="parentClicks += 1">
      <button type="button" @click="childClicks += 1">允许冒泡</button>
      <button type="button" @click.stop="childClicks += 1">停止冒泡</button>
    </div>
    <p>子层 {{ childClicks }} 次，父层 {{ parentClicks }} 次</p>
  </main>
</template>
```

在输入框按 Enter，页面留在当前位置并显示检索词，因为 `.prevent` 取消默认提交导航。点击“允许冒泡”，子层与父层都加一；点击“停止冒泡”，只有子层加一，因为 `.stop` 阻止事件继续传播。

阻止默认行为不会自动阻止传播，阻止传播也不会自动取消链接导航或表单提交。`.self` 要求事件目标就是当前元素，`.capture` 选择捕获阶段，`.once` 让监听器只触发一次；它们不能互换。

修饰符按写下的顺序生成处理逻辑。例如父容器的 `.prevent.self` 会先取消默认行为再判断目标，`.self.prevent` 则先判断是否来自自身。对子元素事件，两种顺序可能有不同结果。`.passive` 表示不会阻止默认行为，不应与 `.prevent` 同时使用。

不要为消除一个现象给所有事件补 `.stop`。事件委托、外侧点击或上层统计可能因此收不到事件。先说明你要改变默认行为还是传播路径，再选对应手段。

### v-model 根据原生控件选择值与事件

**表单绑定（form binding）**连接输入显示和源状态，但不同控件保存的值不一样。下面把三种常见形式放在一个完整页面中：

```vue example=vue03-model-controls runtime=project file=src/App.vue
<script setup lang="ts">
import { ref } from 'vue';
const name = ref('');
const topics = ref<string[]>([]);
const mode = ref('comfortable');
</script>
<template>
  <main>
    <h1>阅读偏好</h1>
    <label>显示名称 <input v-model.trim="name"></label>
    <fieldset>
      <legend>关注主题</legend>
      <label><input v-model="topics" type="checkbox" value="html"> HTML</label>
      <label><input v-model="topics" type="checkbox" value="vue"> Vue</label>
    </fieldset>
    <label>阅读密度
      <select v-model="mode">
        <option value="comfortable">舒适</option>
        <option value="compact">紧凑</option>
      </select>
    </label>
    <p>名称：{{ name || '未填写' }}</p>
    <p>主题：{{ topics.join('、') || '未选择' }}；密度：{{ mode }}</p>
  </main>
</template>
```

文本框的 v-model 通常通过 value 和 input 连接；复选框与单选框涉及 checked 和 change；select 通过选中值与 change 连接。一个复选框可以绑定布尔值，一组同类复选框可绑定数组或 Set，复选框的 value 决定加入集合的内容。

JavaScript 状态是 v-model 初始化时的来源，不能一边设置 ref 为空，一边依赖 HTML 的 checked、selected 或初始 value 希望得到另一个结果。先把正确初始值放进状态。

原生单选组还应共享合适的 name，表单控件需要 label，相关选项可用 fieldset 和 legend 分组。这些语义不会因为 v-model 存在而自动补齐。

`.trim` 调整字符串空白，`.lazy` 改为在 change 时同步，`.number` 尝试数字转换；number 类型输入也会自动应用数字转换逻辑。转换失败时可能保留字符串，清空时也可能是空字符串，所以它不是“以后永远得到有效业务数字”的承诺。

### 输入过程允许暂时不是合法业务值

假设每天计划学习 1 到 480 分钟。用户把 25 删除到空，再输入 30，中间必须能保留空白，而不是被强制改成零。

```vue example=vue03-editing-number runtime=project file=src/App.vue
<script setup lang="ts">
import { computed, ref } from 'vue';
const minutesText = ref('25');
const attempted = ref(false);
const saved = ref<number | null>(null);
const parsed = computed(() => {
  const text = minutesText.value.trim();
  if (!/^\d+$/.test(text)) return null;
  const number = Number(text);
  return Number.isSafeInteger(number) && number >= 1 && number <= 480 ? number : null;
});
const error = computed(() => attempted.value && parsed.value === null ? '请输入 1 到 480 的整数分钟。' : '');
function submit() {
  attempted.value = true;
  if (parsed.value !== null) saved.value = parsed.value;
}
</script>
<template>
  <main>
    <h1>每日学习计划</h1>
    <form @submit.prevent="submit" novalidate>
      <label for="minutes">计划分钟</label>
      <input id="minutes" v-model="minutesText" inputmode="numeric" :aria-invalid="error ? 'true' : undefined" aria-describedby="minutes-error">
      <p id="minutes-error" :hidden="!error">{{ error }}</p>
      <button type="submit">保存计划</button>
    </form>
    <p>当前文本：{{ JSON.stringify(minutesText) }}</p>
    <p>已保存：{{ saved === null ? '尚未保存' : `${saved} 分钟` }}</p>
  </main>
</template>
```

清空输入，当前文本保持 `""`；提交才出现错误。输入 30 后再保存，已保存值成为 30。这里保存的文本、解析出的数字、已提交的计划是不同含义：前两者随编辑变化，最后一个只有成功提交才改变。

inputmode 是输入提示，不负责校验；正则、范围与整数判断才决定这份计划接受什么。真实数字输入还可能有本地化格式、金额精度等需求，解析应按业务定义，不能随手 Number 一次就结束。

相同原则也适用于 [React 的编辑文本与领域值](../chinese-guides/react-03-state-model-derived-controlled.md#编辑文本和有效数量是两种不同的信息)。先让用户完成编辑，再决定数据是否能进入下一步。

### 中文输入先完成选词再提交意图

中文输入通常经过 compositionstart、若干输入变化、compositionend。**输入法编辑器（input method editor）**常简称 IME，输入法中的 Enter 可能是在确认候选词，不是在提交表单。

Vue 默认文本 v-model 会避免在组合输入过程中不断同步中间值；但自己额外监听 input、keydown 或主动发请求，仍需要理解组合阶段。下面的搜索只在明确提交时更新结果：

```vue example=vue03-ime-search runtime=project file=src/App.vue
<script setup lang="ts">
import { ref } from 'vue';
const query = ref('');
const committed = ref('尚未提交');
const submissions = ref(0);
const composing = ref(false);
function guardEnter(event: KeyboardEvent) {
  // 229 用于补充部分输入法/浏览器在选词 Enter 上的兼容行为。
  if (event.key === 'Enter' && (event.isComposing || composing.value || event.keyCode === 229)) {
    event.preventDefault();
  }
}
function submit(event: Event) {
  if (composing.value) return;
  const form = event.currentTarget;
  if (!(form instanceof HTMLFormElement)) return;
  const value = new FormData(form).get('q');
  if (typeof value !== 'string' || !value.trim()) return;
  committed.value = value.trim();
  submissions.value += 1;
}
</script>
<template>
  <main>
    <h1>中文关键词检索</h1>
    <form @submit.prevent="submit">
      <label for="query">关键词</label>
      <input id="query" v-model="query" name="q" required
        @compositionstart="composing = true"
        @compositionend="composing = false"
        @keydown="guardEnter">
      <button type="submit" :disabled="composing">检索</button>
    </form>
    <p>已提交关键词：{{ committed }}</p>
    <p>提交次数：{{ submissions }}</p>
  </main>
</template>
```

试着使用真实中文输入法输入“组件”，先用 Enter 确认选词，再明确点击检索或再次提交。组合期间不应产生业务提交；正常提交后次数只增加一次。处理器在 submit 时从表单读取控件当前值，避免依赖自定义 input 与 v-model 监听器谁先执行。

keyCode 已被弃用，这里只作为 229 的兼容补充，不应用它设计全部键盘逻辑。不同操作系统、浏览器和输入法的事件细节不完全一致，合成事件可以核对守卫分支，不能等同于所有真实输入法都已经验证。实际产品应在支持的桌面输入环境中体验选词流程。

如果希望边输入边搜索，可以对稳定的 query 进行防抖并处理旧请求，而不是为 v-model 再复制一套可能重复的 compositionend 请求。防抖解决频率，组合阶段解决输入意图，旧请求门禁解决先后覆盖，三件事各有职责。

### v-html 不会把字符串变成 Vue 组件

双大括号显示文本，v-html 把字符串当 HTML 解释。只有来自明确可信来源或经过适当净化的内容，才应进入这条路径。Vue 不会进一步编译字符串中的 v-if、事件绑定或组件标签，所以它也不是动态创建组件的办法。

若只是展示用户写下的一句标题，用文本绑定即可。若要渲染富文本，还要考虑允许的标签、URL、图片替代文字和标题层级。删除 script 标签并不足以处理事件属性或危险 URL；这与 HTML 的 [文本信任边界](../chinese-guides/web-01-html-semantics-forms-accessibility.md#框架最终仍要生成可用的-html)相同。

`:href="url"` 只是绑定地址，也不会替你判断外部值是否是可接受的协议或目标。使用明确允许的地址来源和解析规则，不能把任意服务端对象直接展开为 DOM 属性。

### 自定义指令只承担清楚的 DOM 操作

组件已经能组合模板和状态，不必再把整套业务塞进自定义指令。需要复用“元素挂载时聚焦”这类低层行为时，指令才是合适候选：

```vue example=vue03-focus-directive runtime=project file=src/App.vue
<script setup lang="ts">
import { ref, type Directive } from 'vue';
const editing = ref(false);
const vFocus: Directive<HTMLInputElement> = {
  mounted(element) { element.focus(); },
};
</script>
<template>
  <main>
    <h1>就地编辑</h1>
    <button type="button" @click="editing = true">开始编辑</button>
    <label v-if="editing">标题 <input v-focus value="模板语法"></label>
  </main>
</template>
```

点击开始编辑，新输入框挂载后获得焦点。这个指令没有保存业务数据，也不负责提交。若指令建立监听器、ResizeObserver 或第三方实例，应在对应卸载阶段清理；当前仅调用一次 focus，没有持续资源需要保留。

与复杂弹窗不同，这个页面没有关闭流程。若增加关闭编辑功能，还要决定焦点归还到哪个按钮。指令不能凭空知道整条用户任务。

### 沿最终 DOM 和用户动作检查模板

模板编译成功，只说明语法可转换。实际页面还要看控件名称是否存在、错误是否连到字段、列表重排是否保留正确备注、提交是否经过一个入口。Vue DevTools 能解释组件状态，浏览器 DOM 与焦点能解释用户正在操作什么，两者可以互相补充。

响应式值赋值后，DOM 更新有自己的调度。需要读新节点时，按 [nextTick 的边界](../chinese-guides/vue-02-ref-reactive-computed-boundaries.md#数据立即变化与-dom-稍后更新可以同时成立)等待 Vue 更新；它不负责等待任意网络请求或动画结束。

加入异步保存以后，应明确编辑、提交、成功和失败的行为，失败时保留可修正输入。原生 required 与 autocomplete 等仍有价值；`.prevent` 只是把默认流程交给你，不会自动提供 loading、重试或服务器校验。先把单次任务做完整，再扩展外部同步与取消。

### 参考与延伸阅读

- [Vue：模板语法](https://cn.vuejs.org/guide/essentials/template-syntax.html)：查表达式、插值、属性绑定与指令。
- [Vue：条件渲染](https://cn.vuejs.org/guide/essentials/conditional.html)：查 v-if、v-show 与切换成本。
- [Vue：列表渲染](https://cn.vuejs.org/guide/essentials/list.html)：查 key、template 列表与条件优先级。
- [Vue：事件处理](https://cn.vuejs.org/guide/essentials/event-handling.html)：查默认行为、传播与修饰符顺序。
- [Vue：表单输入绑定](https://cn.vuejs.org/guide/essentials/forms.html)：查不同控件、数字转换与输入法组合行为。
- [MDN：KeyboardEvent.isComposing](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/isComposing)：查事件是否处于组合输入过程。
