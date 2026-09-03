# Web 平台组件知识点讲义

## WEB-05 Web Components、Shadow DOM 与跨框架互操作

Web Components 不是用平台 API 重写一套 React 或 Vue，而是用浏览器原生元素、DOM 边界和事件合同提供可跨宿主消费的组件。真正困难的部分不在 `attachShadow()`，而在公开表面：属性如何序列化，property 如何保留类型，生命周期如何清理，事件怎样穿过边界，表单与无脚本内容如何降级，以及多个框架和多个版本怎样共享同一标签名。

### 学习前先确认

- 直接前置：[BROWSER-01 渲染流水线、DOM 事件与存储](../chinese-guides/browser-01-render-events-storage.md#browser-01)。该讲已递归链接 HTML 语义和事件循环；本讲直接使用 DOM、事件传播与生命周期。

### 一、Web Components 是一组平台能力

**Web 组件（Web Components）**通常指 Custom Elements、Shadow DOM、`<template>` 与 `<slot>` 的组合。它没有统一状态管理器、路由或构建方案，也不自动提供设计系统。每项能力可以单独使用：只注册自定义元素而不创建 shadow root，或只在普通元素上使用 template。

自定义元素名称必须含连字符，避免与未来 HTML 元素冲突。Autonomous custom element 继承 HTMLElement；Customized built-in element 继承原生元素但兼容与消费方式更复杂。跨框架公共组件通常先从独立自定义元素开始。

浏览器在注册前把未知标签当普通 HTMLElement；定义出现后执行 **升级（Upgrade）**，把已有节点连接到相应类。由此产生一个重要原则：组件脚本晚到之前，light DOM 应尽量保持可读和可操作。

### 二、先设计消费合同，再决定内部结构

一个稳定组件合同至少包含：标签名、attributes、properties、methods、events、slots、CSS 自定义属性、parts、表单行为、可访问性与版本策略。内部 class 名、shadow tree 层级和框架实例不是公共 API。

以评分控件为例，可以约定：`score` attribute 是可序列化初始值，`element.score` property 是有限非负整数；`score-change` 事件给出 `{score}`；title slot 提供标题；表单提交固定字段；`::part(increment)` 仅开放稳定按钮部件。消费端不应查询 `.internal-button` 或修改 shadowRoot 私有节点。

合同应写出无脚本、升级中、已连接、断开重连和禁用状态。只描述“正常渲染截图”的 API 仍不足以跨框架使用。

### 三、Attribute 与 property 属于两种世界

HTML attribute 本质是字符串或存在性标记，适合服务端输出、DOM 序列化与 CSS 选择；DOM property 可以保存数字、布尔、对象或函数。二者是否反射必须明确，不是所有 property 都应写回 attribute。

布尔 attribute 以“是否存在”决定真假，`disabled="false"` 仍表示禁用。数字 attribute 要解析、检查有限性和范围；无效值选择默认、保留旧值或进入错误状态，不能静默产生 NaN。

反射协议只有一个规范化入口：setter 规范化值，比较序列化结果后按需 `setAttribute`；`attributeChangedCallback` 再应用内部状态。若两边无条件互调，会形成回写循环。对象配置通常只作为 property，不塞入 JSON attribute；需要 SSR 时拆成稳定原始字段或引用资源。

### 四、构造器保持轻量，连接回调拥有外部资源

constructor 适合建立私有字段、attachInternals、创建静态 shadow 结构；不要依赖尚未完成解析的子节点、文档位置或业务 attribute。connectedCallback 每次进入文档都会执行，disconnectedCallback 也不代表实例永久销毁。

监听器、Observer、计时器与外部订阅应由一次连接任期拥有。连接时先清旧资源或创建新的 AbortController，断开时 abort/disconnect。元素被移动、缓存或框架重排后再次连接，一次点击仍只能处理一次。

adoptedCallback 用于节点跨 document 移动的少见情况；attributeChangedCallback 只响应 observedAttributes。每个回调都应幂等，并避免在同步回调里执行大量布局工作。

### 五、Shadow DOM 提供封装，不提供安全沙箱

**影子 DOM（Shadow DOM）**把内部子树附着在 host 上，形成样式选择与 DOM 查询边界。外部普通选择器不会直接匹配内部节点，内部规则也不会任意泄漏；但继承属性和 CSS custom properties 可以穿过边界。

`mode:'closed'` 只限制通过 `element.shadowRoot` 的普通访问，页面内被劫持的代码、浏览器扩展或提前打补丁仍可能观察内部。它不能保护密钥、权限或敏感数据，也不能阻止同源 XSS。

Shadow DOM 不等于完全样式隔离：字体、颜色和自定义属性会继承，`:host`、`:host-context()`、`::slotted()` 和 parts 建立显式接口。封装的目标是减少偶然耦合，不是让组件不可诊断。

### 六、Slot 投影不改变节点所有权

light DOM 子节点通过 slot 分配到 shadow tree 的插槽。节点仍属于宿主的 light DOM，事件与样式需要按真实树和扁平树分别理解。默认 slot 接受未命名内容，命名 slot 接受匹配 `slot` attribute 的节点。

`slotchange` 表示分配集合变化，不一定捕获已分配节点内部文字的所有变化。读取 `assignedElements({flatten:true})` 前明确是否要穿过嵌套 slot。fallback 内容只在没有匹配节点时显示。

Slot 是内容组合合同。不要依靠消费端传入特定深层 DOM 再查询内部 class；为标题、说明和动作区定义少量有语义的插槽，并说明允许的内容与可访问名称关系。

### 七、事件跨边界会重定向

Shadow DOM 事件到达外部时，`event.target` 常重定向为 host，保护内部细节。调试真实路径使用 `composedPath()`。自定义事件要穿过 shadow boundary，需要 `composed:true`；要供祖先委托，还需要 `bubbles:true`。

事件名、detail schema、是否可取消和触发时机属于公共合同。用完成时态还是意图时态要清楚：`score-change` 可表示状态已改变，`score-request` 可取消并让宿主审批。不要在 detail 暴露可变内部对象，优先结构化克隆友好的小数据。

原生 click 等事件已有 composed 行为，不能假设所有事件相同。框架对自定义事件的绑定语法和版本支持会变化，互操作测试应落在真实 DOM 事件，而不是只通过框架模拟回调。

### 八、焦点与可访问性仍依赖原生语义

shadow tree 中的 button、input 等原生控件仍进入可访问树。内部需要标签、名称、状态和键盘顺序；host 的自定义标签名不会自动产生正确角色。可用 ElementInternals 设置部分语义，但优先让内部原生元素表达行为。

`delegatesFocus` 会改变点击 host 与程序聚焦的行为，支持和具体表现应核验；它不替代明确焦点协议。外部 `document.activeElement` 可能只看到 host，深入诊断要沿 shadowRoot.activeElement 查看。

高对比度、缩放、减少运动和读屏测试都要在组件真实宿主中进行。Shadow DOM 不是跳过 A11Y 测试的理由，也不能用 closed root 阻止测试；提供公开行为合同和可观测事件。

### 九、ElementInternals 连接原生表单协议

表单关联自定义元素声明 `static formAssociated = true` 并调用 `attachInternals()`。通过 `setFormValue()` 提交值，`setValidity()` 与 validationMessage 表达约束，formDisabledCallback、formResetCallback 和 formStateRestoreCallback 响应表单生命周期。

表单字段名、禁用、重置、自动填充和状态恢复都要定义。只在点击 submit 时手工拼对象，会错过 FormData、原生校验和宿主框架。若目标环境不支持 ElementInternals，保留 light DOM 原生 input 或外部隐藏 input 的清晰回退，但要防止升级后重复提交同一字段。

升级前 fallback input 可用；升级成功后由组件接管并禁用/隐藏 fallback。若脚本加载失败，fallback 不应提前由 CSS 永久隐藏。

### 十、CSS 接口只开放稳定入口

CSS custom property 适合颜色、间距和尺寸 token，会继承进 shadow tree；`::part(name)` 允许宿主样式化明确标记的内部部件。二者是版本化 API，改名可能是破坏性变化。

不要鼓励 `element.shadowRoot.querySelector()` 注入样式，也不要开放所有内部节点的 part。组件应保持可读默认样式，并在 forced-colors、暗色、打印和不同宿主字号下测试。宿主 `display`、尺寸和可替换性也应文档化。

Constructable stylesheet 可以复用样式对象，但服务器、测试环境和旧浏览器需要回退。样式加载不能让未升级内容长期闪烁或不可用。

### 十一、SSR 先输出有意义的 light DOM

服务端无法执行普通自定义元素类时，仍可以输出标签、标题、文本与原生表单 fallback。客户端脚本加载后 upgrade 并增强。这样抓取、首屏、无脚本和脚本失败都有基本内容。

Declarative Shadow DOM 可在 HTML 中声明 shadow root，但服务端与框架支持、序列化和水合策略要按当前工具链核验。它不消除数据一致性问题：服务器内容、attribute 与客户端初始 state 必须一致，避免升级时闪烁或重复。

框架 hydration 与 custom element upgrade 是两套生命周期，发生顺序可能不同。不要让双方同时重建同一内部 DOM；确定谁拥有 light DOM、谁拥有 shadow tree，并保存直接 URL 与禁用脚本测试。

### 十二、React、Vue 与原生都应消费 DOM 合同

原生消费端设置 property、监听 addEventListener 事件；Vue 通常能把 kebab-case attribute 与原生事件绑定，但对象 property 和 TypeScript 类型可能需要明确包装；React 的自定义元素支持随版本演进，仍要用真实版本验证 property/event 行为。

建立薄适配层时只转换框架约定到 DOM 合同，例如把 React callback 绑定到 `score-change`，不要复制组件业务。适配层卸载时移除监听，服务端渲染时仍保留 light DOM fallback。

类型声明可扩展 JSX intrinsic elements 或导出元素类接口，但 `.d.ts` 不能证明运行时已注册。消费端等待 `customElements.whenDefined()` 只用于确需调用方法的增强，核心内容不应依赖等待。

### 十三、注册表与版本所有权是组织问题

同一 Window 的默认 CustomElementRegistry 对标签名全局唯一。再次 define 同名会抛错；`customElements.get()` 守卫能避免重复执行异常，却不能让不兼容的 v1/v2 同名实现共存。

组织需要明确标签前缀所有者、语义版本、兼容窗口和弃用计划。微前端共享窗口时统一运行时或使用不同标签名；不能让加载顺序决定最终实现。较新的 scoped registry 能改善某些隔离场景，但支持与框架集成要核验，基础合同仍不能混乱。

发布包还要避免打包两份基类或副作用注册失控。可分离“导出类”和“注册入口”，让宿主决定何时注册，同时确保普通应用有简单默认入口。

### 十四、性能边界来自实例数量与工作内容

Shadow DOM 本身不是自动性能优化。大量实例各自创建相同 style、监听器和 Observer 会占用内存；复杂 slot 与样式也参与渲染。复用 stylesheet、事件委托或共享服务前先测量，并保持实例清理。

不要在 attributeChangedCallback 同步做网络请求或大布局。把业务数据获取交给拥有缓存与取消的上层，组件接收模型并发出意图。需要自管理时明确请求身份、断开取消和迟到结果抑制。

性能测试覆盖首次升级、批量创建、属性更新、断开重连和内存回收，不只测一个组件点击。

### 十五、验证跨框架公共合同

使用同一 HTML/属性/property/event/slot/form/CSS contract，在无框架、React 与 Vue 宿主运行。断言属性规范化、property 类型、事件次数与 detail、键盘激活、FormData、样式入口和断开重连。

另跑禁用脚本、延迟注册、SSR 输出、重复模块、无 ElementInternals、未知 attribute 与错误事件版本。外部测试只通过公开表面观察，少量内部单元测试验证私有算法；若所有测试都穿透 shadow tree，说明合同设计不足。

### 学完后应能说明

你应能解释 custom element 的注册与升级、attribute/property 反射、连接生命周期、Shadow DOM 与 slot、事件重定向、表单关联和 SSR 回退；能说明 Shadow DOM 为什么不是安全沙箱，并为原生、React、Vue 与微前端设计稳定、可版本化、可验证的 DOM 公共合同。

