# 原生 UI 与跨框架组件中文核心讲义

本讲义坚持 Progressive Enhancement（渐进增强）：先让链接、按钮、表单和内容在没有新 API 时完成任务，再按能力增加原生浮层、视图过渡和导航协调。新 API 的支持状态会变化，代码必须以能力检测而不是浏览器名称分支。

## WEB-04

### 1. 术语和选择边界

- **Top Layer（顶层）**：浏览器管理的特殊绘制层，dialog、popover 等可进入其中；它不受普通祖先 `overflow` 和 `z-index` 竞争限制。
- **Modal（模态）**：打开期间背景不可交互；原生 `<dialog>.showModal()` 提供此行为。
- **Non-modal（非模态）**：浮层打开时背景仍可操作。Popover API 创建的 popover 是非模态的。
- **Light Dismiss（轻触关闭）**：点击浮层外或按 Escape 等方式关闭 `popover="auto"`。
- **inert（惰性/不可交互）**：使子树不接收焦点和用户输入，并从可访问性交互中移除；它不是权限控制。
- **View Transition（视图过渡）**：围绕一次 DOM 状态更新或跨文档导航建立新旧视图快照并动画。
- **Navigation API（导航 API）**：统一观察、启动和拦截同一浏览上下文中的导航，主要服务 SPA（Single-Page Application，单页应用）。
- **History Entry（历史条目）**：浏览器后退/前进栈中的一个位置。一次用户导航不应意外写入两个条目。
- **Fallback（回退）**：增强能力不可用或失败时仍能完成同一任务的基础路径。

先选语义再选技术：

| 需求 | 首选 | 原因 |
| --- | --- | --- |
| 操作菜单、提示、非阻塞选择 | popover + 原生按钮 | 顶层、轻触关闭、无需手写 z-index |
| 必须先确认/完成的命令面板 | modal dialog | 背景自动不可交互，具有 dialog 语义 |
| 列表进入详情 | 真实 `<a href>` | 无脚本、刷新、复制链接和服务端路径都可用 |
| 纯视觉连续感 | View Transition 增强 | 失败时直接更新内容，不影响任务 |

### 2. 固定菜单：popover 不是自动的 menu 组件

Popover API 只提供显示/隐藏和顶层行为，不会自动给普通 `<div>` 增加 `menu` 角色或方向键协议。固定练习使用普通按钮列表和自然 Tab 顺序，避免在本点引入完整 ARIA Menu 模式。

```html
<button id="menu-trigger" type="button" popovertarget="action-menu">
  操作
</button>
<div id="action-menu" popover="auto" aria-label="条目操作">
  <button type="button" data-action="rename" autofocus>重命名</button>
  <button type="button" data-action="archive">归档</button>
</div>
```

`popover="auto"` 支持轻触关闭且通常同组只打开一个；`manual` 必须显式关闭。打开后 popover 进入 top layer，不会被卡片祖先的 overflow 裁剪。为了让所有关闭路径都可验，记录触发器并在 `toggle` 事件进入 closed 状态时归焦：

```js
const trigger = document.querySelector('#menu-trigger');
const menu = document.querySelector('#action-menu');
let menuReturnFocus = null;

trigger.addEventListener('click', () => {
  menuReturnFocus = trigger;
});

menu.addEventListener('toggle', (event) => {
  if (event.newState === 'closed' && menuReturnFocus?.isConnected) {
    menuReturnFocus.focus();
  }
});
```

能力检测使用 `'popover' in HTMLElement.prototype`。不支持时，保留同一按钮，脚本用普通 `hidden` 属性切换，并实现外点/Escape/归焦；不要因没有 popover 而删除两个操作按钮。

### 3. 固定命令面板：使用 modal dialog

命令面板沿用 `WEB-01` 的原生 dialog 和关闭归焦协议。`showModal()` 打开后，浏览器把 dialog 以外内容作为不可交互背景处理；不需要再给整个 body 手工 `aria-hidden`。固定验证：

1. 打开后焦点位于搜索输入；
2. Tab/Shift+Tab 不进入背景链接；
3. Escape 和关闭按钮都能关闭；
4. 关闭后焦点回到打开按钮；
5. 直接调用 `.show()` 是非模态反例，应使背景仍可 Tab，测试必须能抓到。

显式 `inert` 适合自定义非 dialog 区域临时停用，但不能把包含当前浮层的祖先设为 inert，也不能用它隐藏没有服务端权限的操作。

### 4. 视图过渡只包裹状态更新

基础函数先存在，再决定是否加动画：

```js
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

async function updateView(update) {
  if (!document.startViewTransition || reduceMotion.matches) {
    update();
    return { path: 'direct' };
  }

  try {
    const transition = document.startViewTransition(update);
    await transition.finished;
    return { path: 'view-transition' };
  } catch (error) {
    // startViewTransition 已调用 update；失败只影响动画，不重复业务更新。
    return { path: 'transition-failed', error: String(error) };
  }
}
```

不要在 catch 中再执行一次 `update()`，否则可能重复写状态。`view-transition-name` 应唯一；旧视图是快照，新视图是更新后的实时表示。过渡层在视觉上位于页面之上，但焦点、历史和业务状态仍由应用负责。

同一 DOM 节点被 `append()` 移动时，输入值、节点身份和已绑定监听器通常保留；销毁再用 `innerHTML` 创建新节点则不能假定这些状态保留。固定练习只移动同一详情卡片，并断言输入值与焦点约定。

### 5. Navigation API 是增强，不是第二套历史写入

基础详情入口始终是真实链接：

```html
<a href="/items/42" data-detail-link>查看详情</a>
```

服务端必须能直接返回 `/items/42`。在支持 Navigation API 的 SPA 环境中，可拦截符合条件的同源普通导航并渲染新视图；不要在同一个 `navigate` 事件里再次 `navigation.navigate()` 或 `history.pushState()`，因为当前导航本身已经在创建/遍历条目。

```js
if (globalThis.navigation) {
  navigation.addEventListener('navigate', (event) => {
    const url = new URL(event.destination.url);
    const eligible = event.canIntercept
      && url.origin === location.origin
      && !event.downloadRequest
      && event.formData == null;

    if (!eligible) return; // 浏览器继续普通导航

    event.intercept({
      async handler() {
        const model = await loadRoute(url.pathname, event.signal);
        await updateView(() => renderRoute(model));
        const heading = document.querySelector('main h1');
        heading?.setAttribute('tabindex', '-1');
        heading?.focus();
      },
    });
  });
}
```

NavigationTransition（导航过渡）描述历史条目从一个位置到另一个位置，与 CSS/View Transition 不是同一概念。Navigation API 可能暴露 `committed` 和 `finished` 两个阶段：URL 提交不等于页面异步渲染已完成。

### 6. 固定 fixture 的渐进增强矩阵

| 能力 | 支持时 | 不支持/关闭时 |
| --- | --- | --- |
| Popover | 声明式打开、top layer、轻触关闭 | `hidden` + click/Escape/外点 + 归焦 |
| dialog | `showModal()` 和原生模态边界 | 保留普通页面/路由形式的命令页；不以 div 假装完全等价 |
| View Transition | 包裹同一次 render，保存截图 | 直接 render，任务与焦点仍正确 |
| Navigation API | 拦截合格同源导航，写一个历史条目 | 浏览器加载真实 href/服务端页面 |
| reduced-motion | 关闭非必要过渡 | 内容状态立即更新 |

实验前记录：`popover`, `HTMLDialogElement`, `document.startViewTransition`, `navigation` 四个检测结果和浏览器版本。支持表会变化，不能把“Baseline 年份”硬编码成业务判断。

### 7. 关闭过渡的 CSS 边界

现代浏览器可用 `@starting-style`、`overlay`/`display` 离散过渡制作 popover 进入/退出动画，但它只属于视觉增强。固定实现允许用简单 opacity/transform；不支持离散过渡时必须立即关闭。

```css
#action-menu {
  opacity: 0;
  transform: translateY(-0.25rem);
  transition: opacity 120ms, transform 120ms;
}

#action-menu:popover-open {
  opacity: 1;
  transform: none;
}

@starting-style {
  #action-menu:popover-open {
    opacity: 0;
    transform: translateY(-0.25rem);
  }
}

@media (prefers-reduced-motion: reduce) {
  #action-menu { transition: none; }
}
```

如果为了等待动画而延迟真实关闭，必须额外处理重复点击、Escape 和取消；本点不要求该高级协议。

### 8. 受限排错与验收

给定“关闭后焦点在 body、背景仍可 Tab、返回产生两条 history”，只查：

| 候选 | 证据 | 修复 |
| --- | --- | --- |
| dialog/popover 归焦 | open/close 前后 `activeElement`、toggle/close 日志 | 单一关闭处理器归还真实触发器 |
| inert/模态调用 | 打开方式是 show 还是 showModal、背景按钮是否可聚焦 | 改用 showModal；自定义 inert 必须成对清理 |
| 导航提交 | navigation type、history.length、是否又 push/navigate | 一次导航只由一套 API 提交 |

固定交付：Popover 菜单和 dialog 命令面板的 Tab/Shift+Tab/Escape/外点序列；焦点前后断言；详情链接前进/后退与历史长度；启用/禁用 View Transition 两张截图；四能力检测；普通链接 fallback；reduced-motion 记录。

### 9. 自检

- popover 为什么不是模态 dialog，也不会自动成为 ARIA menu？
- top layer 为什么不能用 `z-index:999999` 完全模拟？
- View Transition 失败时为什么不能盲目再执行一次 update？
- 为什么在 navigate 拦截器里再次 pushState 会制造双条目？

能用固定日志回答四问并完成交付，才算掌握本点。

## WEB-05

### 1. 先建立组件边界与术语表

- **Web Component（Web 组件）**：Custom Elements、Shadow DOM、`<template>` 与 `<slot>` 等平台能力的组合，不是某个框架。
- **Custom Element（自定义元素）**：开发者定义的新 HTML 元素。本站固定实现使用 Autonomous Custom Element（独立自定义元素），即继承 `HTMLElement`，名称必须包含连字符。
- **CustomElementRegistry（自定义元素注册表）**：当前 `Window` 中 `customElements` 管理的“标签名 → 构造函数”映射；同一名称不能重复定义。
- **Upgrade（升级）**：浏览器把已存在但尚未定义的普通未知元素，转换为已注册自定义元素实例的过程。
- **Light DOM（轻量 DOM）**：组件宿主标签在普通文档树中的子节点，也是服务端可以直接输出的内容。
- **Shadow DOM（影子 DOM）**：附着在宿主上的封装子树；Shadow host（影子宿主）、Shadow root（影子根）和 Shadow boundary（影子边界）分别表示宿主、根和边界。
- **Slot（插槽）**：把 light DOM 子节点按 `slot` 名称投影到 shadow tree 的位置。它改变呈现位置，不改变节点的所有权。
- **Attribute（HTML 属性）与 Property（DOM 属性）**：attribute 来自标记且本质是字符串；property 是 JavaScript 对象上的值，可为数字、对象等类型。
- **Reflection（反射）**：property 与 attribute 之间按明确规则同步。双向同步必须有相等判断，否则会形成回写循环。
- **ElementInternals（元素内部接口）**：让自定义元素参与表单、约束验证和部分无障碍语义的接口，由 `attachInternals()` 获得。
- **Form-associated Custom Element（表单关联自定义元素）**：声明 `static formAssociated = true`，并通过 `ElementInternals` 像原生表单控件一样提交值的元素。
- **Composed Event（可组合事件）**：`composed: true` 的事件可以穿过 Shadow DOM 边界；若还要祖先委托监听，通常同时设置 `bubbles: true`。
- **SSR（Server-Side Rendering，服务端渲染）**：服务器先输出可读 HTML；自定义元素脚本稍后加载、升级和增强。
- **Hydration（水合）**：客户端为服务端 HTML 接管状态与交互。Web Component 的 upgrade 与框架水合有关联，但不是同一个过程。

Shadow DOM 是封装手段，不是 Security Sandbox（安全沙箱）。`mode: "closed"` 只是表达“外部不应访问”，浏览器扩展或页面内被劫持的代码仍可能绕过它。它也不会自动解决权限、数据隔离、版本治理和无障碍。

### 2. 固定契约：先写消费端能依赖的表面

本点固定 fixture 不随实现变化：

```html
<form id="score-form">
  <user-score name="Ada" score="7">
    <strong slot="title">Ada 的得分</strong>
    <label data-score-fallback>
      Ada 的得分
      <input name="Ada" type="number" value="7" min="0" />
    </label>
  </user-score>
  <button type="submit">提交</button>
</form>
```

没有脚本或尚未升级时，light DOM 的标题和原生输入仍可读、可键盘操作并能提交 `Ada=7`。升级后组件禁用并隐藏这个原生 fallback，由表单关联自定义元素提交同一键值，避免重复字段。

| 契约面 | 固定约定 |
| --- | --- |
| 标签 | `user-score`；只能注册一次 |
| attributes | `name` 是表单字段名，`score` 是可序列化初始值 |
| property | `element.score` 读写有限非负整数 |
| content | `slot="title"` 提供标题；无内容时显示“得分” |
| event | `score-change`，`detail={ name, score }`，`bubbles/composed` 均为 true |
| form | 提交 `name=score`；固定输出为 `Ada=7` |
| style | 自定义属性控制设计 token，`::part()` 只开放稳定部件 |
| accessibility | 增量按钮为原生 button；分数变化通过 `output[aria-live]` 宣告 |

不要把内部 class 名、Shadow DOM 结构或框架实例暴露成公共契约。它们一旦被消费端依赖，就很难安全重构。

### 3. 可运行的 `user-score`

构造器只建立内部对象和静态 Shadow DOM，不读取尚未准备好的 light DOM 子节点；读取 attribute、连接监听器和处理 fallback 放在 `connectedCallback()`：

```js
class UserScore extends HTMLElement {
  static formAssociated = true;
  static observedAttributes = ['score'];

  #internals;
  #controller;
  #score = 7;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>
        :host {
          display: inline-block;
          color: var(--user-score-color, CanvasText);
        }
        [part="card"] {
          display: grid;
          gap: .75rem;
          padding: 1rem;
          border: 1px solid var(--user-score-border, #cbd5e1);
          border-radius: var(--user-score-radius, .75rem);
          background: var(--user-score-surface, Canvas);
        }
        button { min-block-size: 2.75rem; }
      </style>
      <section part="card" aria-label="用户得分">
        <slot name="title"><strong>得分</strong></slot>
        <output aria-live="polite">7</output>
        <button part="increment" type="button">增加 1 分</button>
      </section>
    `;
  }

  connectedCallback() {
    this.#controller?.abort();
    this.#controller = new AbortController();
    this.shadowRoot.querySelector('button').addEventListener(
      'click',
      () => this.#increment(),
      { signal: this.#controller.signal },
    );

    const fallback = this.querySelector('[data-score-fallback]');
    if (fallback) {
      fallback.hidden = true;
      fallback.querySelector('input').disabled = true;
    }
    this.#syncFromAttribute();
  }

  disconnectedCallback() {
    this.#controller?.abort();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'score' && oldValue !== newValue) this.#syncFromAttribute();
  }

  formResetCallback() {
    this.score = 7;
  }

  get score() {
    return this.#score;
  }

  set score(value) {
    const next = UserScore.#normalize(value);
    const serialized = String(next);
    if (this.getAttribute('score') !== serialized) {
      this.setAttribute('score', serialized);
      return; // attributeChangedCallback 负责唯一一次同步。
    }
    this.#apply(next);
  }

  #syncFromAttribute() {
    this.#apply(UserScore.#normalize(this.getAttribute('score') ?? 7));
  }

  #apply(next) {
    this.#score = next;
    this.shadowRoot.querySelector('output').value = String(next);
    this.#internals.setFormValue(String(next));
  }

  #increment() {
    this.score = this.score + 1;
    this.dispatchEvent(new CustomEvent('score-change', {
      detail: { name: this.getAttribute('name'), score: this.score },
      bubbles: true,
      composed: true,
    }));
  }

  static #normalize(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 7;
  }
}

if (!customElements.get('user-score')) {
  customElements.define('user-score', UserScore);
}
```

固定的 Enter 验证不需要手写 `keydown`：焦点在 Shadow DOM 内的原生 `<button>` 时，浏览器会把 Enter 激活转换为 click，继而只增加一次并发出一次事件。若再绑定 Enter 增分，反而可能重复执行。

### 4. 生命周期与回写循环为什么会出错

- `constructor()`：只做不依赖文档连接状态的初始化；不要读取子元素或根据 attribute 拼最终业务状态。
- `connectedCallback()`：元素每次进入文档都会调用，监听器必须可重复连接且不会叠加。示例用 `AbortController` 先清旧再连接。
- `disconnectedCallback()`：释放监听器、Observer、计时器和外部订阅；元素以后仍可能再次连接。
- `attributeChangedCallback()`：只响应 `observedAttributes` 中的属性，首次解析已有属性时也可能调用。
- `formResetCallback()`：表单 reset 时恢复组件初始约定；它不是普通 DOM 生命周期。

错误模式是 `attributeChangedCallback` 调 property setter，setter 无条件 `setAttribute`，回调再次触发。合格协议只有一个序列化入口，并在写 attribute 前比较旧值。调试时记录 `oldValue/newValue` 和调用次数，固定一次外部写入最多导致一次有效 apply。

### 5. Shadow DOM 的事件、焦点和可访问性

普通事件穿越 Shadow boundary 时会发生 Retargeting（重定向）：外部监听器看到的 `event.target` 往往是宿主，而不是内部按钮；需要诊断真实路径时读取 `event.composedPath()`。自定义事件只有 `composed: true` 才能穿出边界，只有 `bubbles: true` 才能继续供祖先委托。

Shadow DOM 不会从 Accessibility Tree（无障碍树）中自动隐藏内容。内部控件仍需原生语义、可访问名称、焦点顺序与状态反馈。固定组件使用 button、output 与 slot 文本，不用可点击 div。`delegatesFocus`、手工 `tabindex` 管理和复杂复合控件键盘模式属于后续选择，不是本题的必要复杂度。

`ElementInternals.states` 与 CSS `:state()` 可表达不应暴露成 HTML attribute 的自定义状态，但它不是 Redux 类业务仓库，也不是表单值。本站只要求理解边界，不要求把固定 score 改成自定义状态。

### 6. 样式只能开放稳定入口

Shadow DOM 默认隔离内外普通选择器。消费端可通过两类稳定入口定制：

```css
user-score {
  --user-score-surface: #f8fafc;
  --user-score-border: #94a3b8;
  --user-score-radius: 1rem;
}

user-score::part(increment) {
  font-weight: 700;
}
```

CSS Custom Property（CSS 自定义属性）适合设计 token，`part`/`::part()` 适合明确开放的内部部件。不要要求使用方通过 `shadowRoot.querySelector()` 改内部节点，也不要把每个内部元素都标成 part；这会让封装名存实亡。

### 7. 原生、React 与 Vue 使用同一 DOM 契约

原生消费端直接监听宿主：

```js
const score = document.querySelector('user-score');
score.addEventListener('score-change', (event) => {
  console.log(event.detail); // { name: 'Ada', score: 8 }
});
```

React 适配层使用 ref 和 DOM `addEventListener`，这条路径不依赖框架对任意自定义事件属性的转换规则：

```jsx
function UserScoreAdapter({ onChange }) {
  const ref = React.useRef(null);

  React.useEffect(() => {
    const node = ref.current;
    const handle = (event) => onChange(event.detail);
    node.addEventListener('score-change', handle);
    return () => node.removeEventListener('score-change', handle);
  }, [onChange]);

  return (
    <user-score ref={ref} name="Ada" score="7">
      <strong slot="title">Ada 的得分</strong>
    </user-score>
  );
}
```

Vue 模板可把自定义事件当 DOM 事件监听；构建配置需把 `user-score` 识别为 custom element，避免误当 Vue 组件解析：

```vue
<template>
  <user-score ref="score" name="Ada" score="7" @score-change="onChange">
    <strong slot="title">Ada 的得分</strong>
  </user-score>
</template>

<script setup>
import { ref } from 'vue'
const score = ref(null)
const onChange = (event) => console.log(event.detail)
</script>
```

三种环境都只依赖标签、attribute/property、slot、event、form 和 style contract。框架状态若要更新 `score`，写 DOM property 或序列化 attribute，但不要同时建立两套互相回写的真相源。

### 8. SSR、无 Shadow DOM 与微前端版本边界

SSR 首屏必须保留前面的 light DOM 标题与原生 input。验证时先禁用组件脚本截屏并提交表单，再启用脚本等待 `customElements.whenDefined('user-score')`，确认 fallback 被禁用且 `new FormData(form).getAll('Ada')` 只有一个字符串 `7`。事件在未升级阶段不存在，消费端必须把它当增强信号，不能把首屏核心数据只放在事件里。

默认注册表在同一 `Window` 内共享。多个微前端若各自执行 `define('user-score', ...)` 会抛错；注册守卫只能避免重复异常，不能让不兼容的 1.x/2.x 同名实现共存。设计系统必须统一标签名所有权、公开契约和版本升级窗口。Scoped Custom Element Registry（作用域自定义元素注册表）等较新能力只作版本边界认识，不进入固定交付。

### 9. 受限排错与验收矩阵

| 症状 | 只检查 | 必须提交的证据 |
| --- | --- | --- |
| 第二次注册抛错 | `customElements.get()` 守卫、是否加载两份 bundle | 两次执行模块只存在一个构造函数的日志 |
| attribute 回写循环 | observed callback 是否再次无条件写 attribute | 单次 `score=7` 的 callback/apply 计数 |
| 宿主收不到事件 | `composed`、`bubbles` 与监听位置 | host 和祖先各收到一次，detail 完整 |
| 表单值为空/重复 | `formAssociated`、`attachInternals`、`setFormValue`、fallback 是否 disabled | `FormData.getAll('Ada')` 严格等于 `['7']` |

固定交付包括：

1. 原生、React、Vue 三个消费端都完成鼠标与 Enter 增分；
2. 三端均断言事件的 `detail`、次数和宿主到达；
3. 升级前后各提交一次表单，输出均为 `Ada=7` 且升级后不重复；
4. 展示 CSS token 与 `::part(increment)`，不深穿 Shadow DOM；
5. SSR/禁用脚本截图中仍有标题、数值输入和提交按钮；
6. 元素断开再连接后，一次点击仍只触发一次事件；
7. 重复加载注册模块不抛错；
8. 记录 Shadow DOM 不是安全沙箱，以及不支持 `attachInternals` 时保留原生 fallback 的降级结果。

### 10. 自检

- 为什么 attribute 是序列化契约，而 property 可保留数字类型？
- 为什么事件需要同时设置 `bubbles` 与 `composed`？
- 为什么 `closed` Shadow DOM 仍不是安全隔离？
- 为什么 SSR fallback input 在升级后必须 disabled？
- 为什么微前端的注册守卫不能解决同名不兼容版本？

能用三环境测试、表单输出、SSR 截图和四类故障日志回答这些问题，才算掌握 WEB-05。
