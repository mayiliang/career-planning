# Web 基础知识点讲义

## WEB-01 HTML 语义、表单与可访问性基础

HTML 不是给 CSS 和 JavaScript 提供钩子的无意义容器。浏览器会把元素、属性、文本和状态转成 DOM，也会生成供键盘、读屏软件、语音控制和自动化工具使用的可访问性信息。语义正确的页面通常更容易使用、更容易测试，也更能在样式或脚本失效时保持基本功能。

### 学习前先确认

本讲是 B04～B08 的 Web 语义根资料，不要求其他站内前置。只要能阅读简单 HTML 标签即可开始；ARIA、可访问名称、焦点管理和表单校验都会在正文中解释。

### 一、元素选择首先表达内容角色

标题、段落、列表、导航、主要内容、补充内容和按钮分别有自己的语义。浏览器据此构建**可访问性树（accessibility tree）**，辅助技术不必猜测一个带点击事件的 `div` 究竟是什么。

```html
<header>
  <nav aria-label="主导航">...</nav>
</header>
<main>
  <h1>账户设置</h1>
  <section aria-labelledby="profile-heading">
    <h2 id="profile-heading">个人资料</h2>
  </section>
</main>
```

标题等级表示文档结构，不是字号。`h2` 应是 `h1` 下的主题，而不是“想显示得小一点”。`main` 通常代表页面唯一的主要内容，多个 `nav` 应用可访问名称区分。列表中的重复项目应使用 `ul`/`ol` 和 `li`，数据之间有行列关系才使用 `table`。

### 二、原生控件带有完整交互合同

`button` 天生可聚焦，可由 Enter 或 Space 激活，向辅助技术暴露按钮角色，并支持 `disabled`。把 `div` 改造成按钮，需要重新实现键盘、角色、焦点、禁用和高对比度等行为，仍容易遗漏。

```html
<button type="button">打开筛选</button>
<a href="/orders/42">查看订单</a>
```

按钮执行当前页面动作，链接导航到一个地址。不要为了视觉样式互换二者。一个没有 `href` 的 `a` 也失去了链接语义。能用原生元素时优先原生，这条原则叫**原生语义优先（native semantics first）**。

ARIA 可以补充名称、描述、状态和关系，但不会自动增加键盘行为，也不会修复错误的焦点顺序。ARIA 的第一条实践规则就是不要用它替代已有的原生语义。

### 三、每个表单控件都需要可访问名称

占位符会在输入后消失，不是稳定标签。最可靠的方式是显式关联 `label`：

```html
<div>
  <label for="display-name">显示名称</label>
  <input id="display-name" name="displayName" autocomplete="name">
</div>
```

`for` 必须等于输入的 `id`。也可以把控件嵌套在 `label` 内，但复杂布局中显式关联通常更清晰。图标按钮需要来自可见文本、`aria-label` 或 `aria-labelledby` 的名称；同一控件不要同时提供互相矛盾的名称来源。

辅助技术用于识别控件的文本叫**可访问名称（accessible name）**。帮助信息和错误原因属于**可访问描述（accessible description）**，它们不应取代名称。

### 四、表单提交是一套浏览器协议

`form` 把字段、提交和校验组织成一个整体。按 Enter、点击提交按钮或调用 `requestSubmit()` 都能走提交协议。按钮在表单内默认可能是 `submit`，纯界面动作要显式写 `type="button"`。

```html
<form id="profile-form" novalidate>
  <label for="email">邮箱</label>
  <input id="email" name="email" type="email" required
         aria-describedby="email-help email-error">
  <p id="email-help">用于接收账户通知。</p>
  <p id="email-error" hidden></p>
  <button type="submit">保存</button>
</form>
```

原生 `required`、`type=email`、`minlength` 等提供基础约束，但真实业务常需要定制错误显示。无论采用原生还是自定义校验，都要保留字段名称、错误关系、键盘提交和服务器端再次校验。客户端校验改善体验，不是信任边界。

### 五、错误必须与字段建立关系

视觉上的红字如果没有程序化关系，读屏用户可能不知道它属于哪个字段。显示错误时可设置 `aria-invalid="true"`，并通过 `aria-describedby` 指向错误元素：

```js
function showError(input, error, message) {
  input.setAttribute('aria-invalid', 'true');
  error.textContent = message;
  error.hidden = false;
}
```

错误出现的时机也影响可用性。用户尚未离开字段时不断播报会造成噪音；常见策略是首次提交后显示所有关键错误，之后在已触碰字段的 blur 或修改时更新。一个错误变化只应产生一次必要通知。

动态总结可以使用带清晰标题的区域，并在提交失败后把焦点移动到总结或第一个无效字段。不要把每个字符变化都放进 `aria-live="assertive"`。

### 六、名称、描述和状态各司其职

假设密码框的可见标签是“密码”，辅助说明是“至少 12 个字符”，当前错误是“还差 3 个字符”：

- 名称回答“这是什么控件”；
- 描述回答“如何填写或为什么失败”；
- 状态回答“现在是否无效、展开、选中或忙碌”。

`aria-expanded` 应放在控制展开动作的按钮上，`aria-controls` 可指向被控制区域。复选框使用 `checked`，切换按钮可用 `aria-pressed`，不要把所有二元状态都写成 `aria-selected`。语义必须与控件模式一致。

### 七、焦点是键盘用户的当前位置

**焦点管理（focus management）**不是给元素加边框。它决定键盘输入接下来送到哪里，也决定读屏软件通常从哪里继续阅读。

DOM 顺序应与视觉和阅读顺序一致。不要用大量正值 `tabindex` 人工重排；它会与 DOM、响应式布局和弹窗冲突。非交互元素只有在脚本确实需要临时聚焦时才使用 `tabindex="-1"`。

焦点样式必须可见，不能全局 `outline: none`。使用 `:focus-visible` 可以在键盘导航时提供清晰指示，同时避免鼠标点击后的不必要视觉噪音。

### 八、原生 `dialog` 解决一部分弹窗协议

```html
<button id="open-settings" type="button">打开设置</button>
<dialog id="settings-dialog" aria-labelledby="settings-title">
  <form method="dialog">
    <h2 id="settings-title">显示设置</h2>
    <label><input type="checkbox" name="dense"> 紧凑模式</label>
    <button value="cancel">取消</button>
    <button value="confirm">确认</button>
  </form>
</dialog>
```

调用 `showModal()` 会进入模态模式，浏览器限制与背景内容的交互；Escape 通常触发 `cancel`，`method="dialog"` 可以关闭并设置 `returnValue`。仅设置 `open` 属性不是同一套模态协议。

对话框必须有清晰名称，初始焦点要根据任务选择：短确认可聚焦最安全动作，长内容可先聚焦静态标题，破坏性动作通常不应默认获得焦点。关闭后应尽量把焦点还给打开它的元素；若触发元素已不存在，则选择仍存在且语义合理的邻近位置。

这种进入弹窗、限制背景、在内部移动、退出并归还焦点的行为叫**焦点闭环（focus loop）**。原生 dialog 提供重要基础，但应用仍负责名称、初始位置、关闭后的归还和业务状态。

### 九、模态并不等于安全边界

弹窗放在顶层、使用 `dialog` 或设置 `aria-modal`，都不会隔离脚本、样式或数据。确认删除仍需服务器授权、防重放和明确的操作对象。隐藏背景也不等于卸载组件；后台计时器、请求和媒体可能继续运行，需要业务逻辑主动暂停或清理。

如果目标浏览器不满足原生 dialog 要求，应采用经过验证的 polyfill 或成熟组件，而不是只画一层遮罩。无论实现方式，必须验证 Escape、Tab/Shift+Tab、焦点归还、滚动锁定、高对比度和缩放。

### 十、动态 HTML 与模板输出需要信任边界

框架默认会转义普通文本，这是安全基础。使用 `innerHTML`、React 的 `dangerouslySetInnerHTML` 或 Vue 的 `v-html` 会把字符串解释为标记；不可信输入可能产生跨站脚本。可访问性正确不代表安全，安全过滤也不自动产生正确语义。

确需富文本时，应在明确边界使用经过配置的 sanitizer，限制允许标签与属性，并把链接、标题层级和图片替代文本纳入审核。不能只删除 `<script>`，事件属性、危险 URL 和 SVG 等仍可能形成攻击面。

### 十一、在样式和脚本失效时检查结构

关闭 CSS 后，标题顺序、表单标签、按钮和错误信息应仍可理解。关闭 JavaScript 后，关键导航和服务端可处理的表单应尽量保留基本能力。不是所有应用都必须完全无脚本运行，但这种检查能暴露被样式伪装的语义缺失。

缩放到 200%、使用 320px 宽度、开启强制颜色和减少动画偏好，也不应让焦点或错误消失。语义是渐进增强的底层，不是最后补一轮 ARIA。

### 十二、怎样验证而不是凭眼睛判断

完整验证至少包含四层：

1. 检查 DOM 中元素、属性和关联 ID；
2. 查看浏览器可访问性树中的角色、名称、描述和状态；
3. 只用键盘完成进入、填写、提交、打开弹窗、关闭和返回；
4. 用至少一种读屏软件听取字段、错误和弹窗切换。

自动化测试可以按角色和名称查找元素，而不是依赖类名：

```ts
await page.getByRole('textbox', { name: '邮箱' }).fill('bad');
await page.getByRole('button', { name: '保存' }).click();
await expect(page.getByRole('textbox', { name: '邮箱' }))
  .toHaveAttribute('aria-invalid', 'true');
```

自动扫描能发现缺少名称、错误 ARIA 和对比度问题，但无法证明焦点顺序合理、播报不重复或任务真的可完成。人工路径与自动化应互补。

### 进阶：把语义合同带进组件库和自动化测试

组件库封装 `Button`、`Field`、`Dialog` 时，公开合同不仅是颜色和尺寸，还包括最终元素类型、可访问名称来源、键盘行为、错误关联和焦点恢复。若 `Button` 因传入 `href` 变成链接，类型和文档应让调用者看到语义变化；若表单组件自动生成 id，要保证 SSR 与客户端一致且调用者仍能关联帮助文本。

自动检查可发现缺少名称、重复 id 和部分对比度问题，却无法判断标题是否表达页面结构、错误提示是否及时、焦点回到哪里。发布前组合静态检查、DOM/可访问性树断言、仅键盘操作和至少一次真实读屏抽查。这样无障碍不是页面结束时补几个 ARIA，而是从组件合同一路可验证的质量属性。

设计评审还应要求禁用样式、缩放 200%、高对比度和错误恢复路径，避免只在理想视觉稿上验收。

### 学完后应能说明

你应能解释 HTML 语义如何进入可访问性树，为什么原生控件优先，名称、描述和状态如何分工，表单错误怎样关联字段，dialog 的焦点进入与归还如何设计，以及如何用 DOM、可访问性树、键盘和读屏证据验证结果。
