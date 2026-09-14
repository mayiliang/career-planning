# Web 基础知识点讲义

## WEB-03 让组件适应空间并保留可用基线

同一张资料卡片放在正文里很宽，放进侧栏后却只有 280 px。用视口断点判断，它们看到的是同一个浏览器；用容器查询判断，它们才知道各自真正拿到了多少空间。

现代 CSS 的价值，是更准确地表达这些关系，同时让样式来源、作用范围和回退更容易理解。这篇先给出一个可以切换增强的桌面页面，再解释级联层、容器查询、Subgrid、scope 与其他能力各自解决什么问题。

### 学习前先确认

- 直接前置：[WEB-02 布局尺寸与样式覆盖](../chinese-guides/web-02-layout-cascade-responsive-logical-properties.md#web-02)。本讲直接使用 Grid、内在尺寸、层叠与媒体查询。

完整例子的基线使用普通 Grid 与 CSS 自定义属性；容器布局和 Subgrid 作为可关闭的增强。页面的独立级联实验需要浏览器支持 @layer。本篇不会把一种新语法可用，写成所有现代 CSS 都已兼容。

### 先决定没有增强时用户还能做什么

**渐进增强（progressive enhancement）**先保证核心任务，然后在有相应能力时改善呈现。对资料卡片，核心任务是看清标题、摘要、状态，并进入资料；两列排版、主题细节与对齐属于可以退回简单形式的呈现。

先用相同 DOM 做出能阅读和操作的单列卡片，再增加容器条件。不要先把内容隐藏，等 JavaScript 判断所有能力后才显示；初始化失败时，用户可能连最基本的内容都拿不到。

可用基线也需要明确边界。完全不支持 Grid 的浏览器会忽略该声明，正常文档流仍应包含内容；正式支持范围若要求特定旧环境，应在那里实际检查。新浏览器里关闭增强，只证明基线分支可用，不等于模拟了另一个浏览器引擎。

### 在同一视口放入两种宽度的卡片

把下面整段保存为 `modern-css.html`，直接用桌面浏览器打开。两张卡片的内容与结构相同，宿主分别为 280 px 和 520 px。下方还有一组不依赖颜色名称猜测结果的级联实验与 Subgrid 对齐示例。

```html example=web03-cards runtime=project file=modern-css.html
<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>同一组件的两种空间</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  :root { --surface: #fff; --ink: #203f36; --muted: #506b60; --line: #b8cfc2; --accent: #21644f; }
  body { margin: 0; padding: 32px; background: #edf4ef; color: var(--ink); font-family: "Segoe UI", "Microsoft YaHei", sans-serif; }
  body[data-theme="dark"] { --surface: #183b31; --ink: #edf8f0; --muted: #c3d7c9; --line: #809e8c; --accent: #afd4bd; background: #10271f; }
  main { max-inline-size: 1120px; margin-inline: auto; }
  h1 { font-size: 1.8rem; }
  h2 { font-size: 1.15rem; margin: 0; }
  p { line-height: 1.7; }
  button, select { font: inherit; padding: .6rem .85rem; }
  button { border: 1px solid var(--line); border-radius: 8px; color: var(--ink); background: var(--surface); cursor: pointer; }
  :focus-visible { outline: 3px solid #be641d; outline-offset: 3px; }
  .controls { display: flex; flex-wrap: wrap; gap: 24px; align-items: center; margin-block: 24px; }
  .examples { display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start; }
  .slot { container: material / inline-size; max-inline-size: 100%; }
  .slot.narrow { inline-size: 280px; }
  .slot.wide { inline-size: 520px; }
  .slot-label { font-size: .85rem; color: var(--muted); }
  .card { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; padding: 24px; color: var(--ink); background: var(--surface); border: 1px solid var(--line); border-radius: 14px; }
  .card > * { min-inline-size: 0; margin: 0; }
  .summary { overflow-wrap: anywhere; }
  .meta { color: var(--muted); font-size: .9rem; }
  .action { justify-self: start; }
  @supports (container-type: inline-size) {
    @container material (min-width: 420px) {
      body.enhanced .card { grid-template-columns: minmax(0, 1fr) auto; }
      body.enhanced .card .action { grid-column: 2; grid-row: 1 / span 3; align-self: center; }
      body.enhanced .card h2 { font-size: clamp(1.15rem, 1rem + .6cqi, 1.35rem); }
    }
  }
  .panel { margin-block-start: 32px; padding: 24px; border: 1px solid var(--line); border-radius: 14px; background: var(--surface); }
  .aligned { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-block-start: 16px; }
  .aligned article { display: grid; grid-template-rows: auto 1fr auto; gap: 12px; padding: 18px; border: 1px solid var(--line); }
  .aligned article > * { margin: 0; }
  @supports (grid-template-rows: subgrid) {
    body.enhanced .aligned article { grid-template-rows: subgrid; grid-row: span 3; }
  }
  @media print {
    body { padding: 0; background: white; color: black; }
    .controls, button, #status { display: none; }
    .examples { display: block; }
    .slot.narrow, .slot.wide { inline-size: 100%; }
    .card, .panel { color: black; background: white; border-color: black; }
    .meta, .slot-label { color: black; }
    .card, .aligned article { break-inside: avoid; }
  }
  @media (forced-colors: active) {
    .card, .panel, button { border-color: CanvasText; }
    :focus-visible { outline-color: Highlight; }
  }
</style>
<style>
  @layer vendor, components, utilities;
  @layer vendor {
    .layer-probe { color: rgb(160, 0, 0); }
    .important-probe { color: rgb(128, 0, 128) !important; }
  }
  @layer components {
    #specific .layer-probe { color: rgb(0, 0, 160); }
  }
  @layer utilities {
    .layer-probe { color: rgb(0, 100, 0); }
    .important-probe { color: rgb(180, 80, 0) !important; }
  }
  .unlayered { color: rgb(20, 20, 20); }
  #specific { background: white; color: #182f25; }
</style>
</head>
<body class="enhanced" data-theme="light">
<main>
  <h1>同一组件的两种空间</h1>
  <p>视口不变，观察卡片怎样适应宿主；关闭增强后，内容与操作仍应保留。</p>
  <div class="controls">
    <label><input id="enhance" type="checkbox" checked>启用容器布局与 Subgrid</label>
    <label>页面主题 <select id="theme"><option value="light">浅色</option><option value="dark">深色</option></select></label>
  </div>
  <div class="examples">
    <section class="slot narrow" aria-label="窄容器"><p class="slot-label">宿主宽度 280 px</p><article class="card"><h2>资料标题与错误恢复</h2><p class="summary">用具体例子理解输入、保存和失败后的继续操作。</p><p class="meta">约 15 分钟 · 可以开始</p><button class="action">阅读资料</button></article></section>
    <section class="slot wide" aria-label="宽容器"><p class="slot-label">宿主宽度 520 px</p><article class="card"><h2>资料标题与错误恢复</h2><p class="summary">用具体例子理解输入、保存和失败后的继续操作。</p><p class="meta">约 15 分钟 · 可以开始</p><button class="action">阅读资料</button></article></section>
  </div>
  <p id="status" role="status">演示按钮只更新本页状态，不读取真实资料。</p>
  <section class="panel" id="specific" aria-label="级联实验">
    <h2>查看 Computed 中的颜色</h2>
    <p class="layer-probe">普通声明：utilities 胜出，应为深绿色。</p>
    <p class="layer-probe unlayered">未分层普通声明胜出，应为接近黑色。</p>
    <p class="important-probe">important 层顺序反转，vendor 胜出，应为紫色。</p>
  </section>
  <section class="panel" aria-label="轨道对齐实验"><h2>让相邻卡片共用行轨道</h2>
    <div class="aligned">
      <article><h2>短标题</h2><p>两行之外的空间由内容与父轨道共同分配。</p><button>查看第一份</button></article>
      <article><h2>这是一段较长的资料标题，用于观察标题行怎样影响相邻卡片</h2><p>说明。</p><button>查看第二份</button></article>
    </div>
  </section>
</main>
<script>
  document.querySelector('#enhance').addEventListener('change', (event) => {
    document.body.classList.toggle('enhanced', event.target.checked);
  });
  document.querySelector('#theme').addEventListener('change', (event) => {
    document.body.dataset.theme = event.target.value;
  });
  for (const button of document.querySelectorAll('button')) {
    button.addEventListener('click', () => {
      document.querySelector('#status').textContent = `已选择：${button.textContent}。这是本地演示反馈。`;
    });
  }
</script>
</body>
</html>
```

在支持容器尺寸查询的浏览器中，280 px 卡片应为单列，520 px 卡片的按钮应位于右侧。关闭增强后，两张都回到单列，按钮仍可通过 Tab 和 Enter 操作。主题选择只改 CSS 变量，不重建内容；本例不持久化主题，也没有真实跳转或业务权限。

### 级联层先决定来源顺序再看选择器

**级联层（cascade layer）**用 @layer 安排同一来源内部的优先次序。页面的第二段 style 故意独立出来，便于看清实验与正常卡片样式的边界。

普通声明中，后声明的层比前面的层优先。虽然 components 中使用了 ID，utilities 里的 `.layer-probe` 仍先按层顺序胜出，结果是深绿色；不是 ID 失效了，而是还没轮到比较 specificity。

普通的未分层声明优先于分层普通声明，所以第二行采用接近黑色。important 的层顺序反转，较早的 vendor 层优先；分层 important 也优先于未分层 important。这解释了为什么引入 layer 后，不能继续简单判断“最后一个层能覆盖一切”。

示例的三条规则只用于理解机制，真实项目不应把到处使用 important 当作架构。先明确 reset、第三方、组件、工具与覆盖的顺序，并限制特殊覆盖的范围。

已声明的层次再次出现，只会向该层追加规则，不重新排列初次顺序。第三方样式可以通过 `@import url(...) layer(vendor)` 进入指定层，但 import 有位置要求，也要核对构建器处理结果。不要把未分层旧样式搬进去后，未经检查就认为外观完全不变。

### 容器查询读取的是哪一个祖先

**容器查询（container query）**让被匹配元素按合适祖先的尺寸等条件选择样式。页面的 `.slot` 使用 `container:material / inline-size`，同时给出容器名称与所查询的尺寸轴。

查询为后代卡片选择规则，不是让容器按自己的尺寸改变自己。若把 container-type 直接放在卡片上，又希望卡片查询自身宽度，通常就选错了对象。外层 slot 分配空间，内层 card 适应空间，使两层责任清楚。

`@container material (min-width:420px)` 查找满足名称与查询能力的祖先。嵌套结构中如果最近的候选不满足所需名称或能力，选中的容器可能与你想象不同。使用 DevTools 查看实际命中容器，不靠 DOM 距离猜。

本例用的是 inline-size containment，避免卡片的横向内容反过来决定宿主的横向尺寸。若使用 size，块轴尺寸也受到约束，宿主高度可能需要额外安排；containment 不是完全没有代价的标记。

### 容器单位与断点要服务实际内容

cqi 表示所选尺寸容器 inline 方向尺寸的百分之一。本例仅在宽容器条件中适度增加标题字号，并用 rem 下限和上限限制范围，不让卡片大小完全由字体漂移决定。

没有适用尺寸容器时，容器单位可能退回相应小视口单位；它们不会自动按你心里想的那个卡片计算。把容器单位放到公共 token 前，应确认使用者始终处于预期容器内。

420 px 不是标准断点。这里选择它，是因为标题、摘要、间距与按钮并排需要这些空间。可以把宿主改到 419 与 421 px 观察条件两侧，再用更长的标题确认它是否仍合理。

尺寸查询、样式查询、滚动状态查询和锚点相关查询是不同子能力。尺寸查询可用，不意味着任意属性都能在 style() 中查询，也不意味着所有滚动状态语法都可用。本例只把已给出的尺寸查询作为完整演示，其他子能力按具体语法查阅兼容资料。

### Subgrid 共享轨道而不是固定每张卡片高度

**Subgrid** 让嵌套 Grid 在某一轴使用父网格的轨道。本例的 `.aligned` 有两列；每张 article 跨三行，标题、正文、按钮分别落到对应共享行。

普通基线中的 `auto 1fr auto` 为每张卡片独立计算内部行。标题长度不同，正文开始位置就可能不同；启用 Subgrid 后，同一组卡片的标题行共同参与父轨道尺寸，正文和按钮的行位置因此能对齐。

这个能力不要求把标题写死为两行，也不会自动截断超长内容。它解决轨道共享，不解决权限、加载或数据状态，更不会改变 DOM 顺序。改变列数后，还要确认 span 与隐式轨道是否符合新的排版。

本例通过 @supports 包住增强，关闭增强后保留独立 Grid。基线可能不具备完全相同的对齐效果，但信息和按钮都应存在。把“外观少一点整齐”作为回退，通常比“缺少核心内容”更容易接受。

### scope 与嵌套分别管理范围和重复

@scope 限制选择器匹配的范围，可以给组件样式明确的起止边界。下面是**说明片段**，不属于上面的完整页面：

```css
@scope (.reader) to (.embedded-widget) {
  h2 { color: var(--ink); }
}
```

它表达 reader 范围内、排除指定下界及其子树的匹配区域。它不是 Shadow DOM，也不会阻断所有继承：外层已算出的 color 或自定义属性仍可能沿继承传下去。不要把作用域边界误当成安全边界或彻底样式隔离。

作用域接近程度在层叠中有自己的比较位置，不能越过来源、重要性或 specificity 随意获胜。页面同时使用 layers 与 scope 时，应逐层解释结果；`:scope` 选择器可被识别，也不能单独证明浏览器支持 @scope 规则。

原生嵌套减少重复前缀，例如在 `.card` 内写 `&:focus-within`，但不会自动建立范围隔离。嵌套过深会继续形成长而难覆盖的选择器；含 ID 的父选择器列表还可能影响优先级。先保持短而明确的结构，再决定是否嵌套。

### 自定义属性表达可以变化的设计含义

页面定义 surface、ink、muted、line 与 accent 等变量，组件使用这些含义，而不是每处分别写主题颜色。用户选择深色后，只改变同一组变量，因此组件结构、文字和焦点顺序无需改变。

**自定义属性（custom property）**默认可以继承，在使用处通过 var() 代入；它不是预处理器中的纯文本常量。`var(--space,12px)` 的后备值也不是任意非法值的兜底：如果变量存在却是一个不适用于当前属性的值，替换后的声明仍可能在计算时无效。

例如给 `--space` 写 red，再用于 padding，不能指望自动回到 12 px。需要输入约束时可以考虑 @property 的语法、初始值与继承设置，但它又有自己的支持和语义，不能为了一个静态间距随意增加机制。

系统颜色偏好可以提供默认，用户明确选择则应有清楚优先级。若真实产品保存主题偏好，还要考虑首屏应用时机与 SSR 接管一致；这个演示只切换当前页面，不声称已经处理这些状态。

### 新颜色与能力检测都需要明确回退

现代颜色可用于表达感知关系，例如 oklch 或 color-mix，但语法支持不保证文字对比度、强制颜色与打印结果都符合要求。应先给可用的基础色，再在有能力时增强。

```css
.notice { background: #e8f2ec; }
@supports (background: color-mix(in oklch, white, green)) {
  .notice { background: color-mix(in oklch, white 92%, green); }
}
```

这也是说明片段。两条背景色都不能单独证明前景文字可读，还要结合实际文字色与使用状态判断。相对颜色与更高版本颜色语法要分别核对，不能从支持 color-mix 推出所有颜色功能都可用。

**@supports** 判断浏览器是否识别指定声明或条件，不保证整个组件没有布局错误。`CSS.supports('container-type','inline-size')` 可以提供语法能力线索，却不能证明你的命名容器选对、宽度正确或键盘路径完整。

增强开关便于在同一环境观察退回基线的行为；目标旧环境仍需实际运行。记录时写清“禁用增强”还是“真实不支持”，避免把二者合并成一个兼容性结论。

### 锚点定位与滚动动画只承担呈现

CSS Anchor Positioning 可以把浮层定位与另一个元素关联，并提供位置回退能力；但它不会自动赋予对话框语义、管理焦点、处理 Escape 或完成权限判断。菜单到底是非模态提示还是模态任务，应先用合适的 HTML 与交互协议表达。

对核心提示，可以先提供正常流或已验证的基础定位，再按具体属性增加锚点增强。anchor-name、position-anchor、位置回退语法以及不同子能力的支持要分别核对；检测某一个属性通过，不等于整条弹层协议都成立。

滚动驱动动画把时间线关联到滚动或可见进度，适合阅读进度等辅助呈现。不要默认让关键正文 opacity 为 0，指望滚动时间线最终把它显示出来。脚本失败、语法不支持、打印或用户减少动态效果时，内容都应可见。

本例没有为卡片添加运动，只通过布局直接呈现结果。真实产品若加入非必要动画，应提供 reduced-motion 分支；“没有动画”不需要再设置一套动画开关。弹层与层叠边界可回到 [WEB-02](../chinese-guides/web-02-layout-cascade-responsive-logical-properties.md#包含块与层叠上下文是两个问题)。

### 渲染优化不能让关键内容依赖偶然触发

content-visibility:auto 可以减少暂时不相关区域的渲染工作，配合 contain-intrinsic-size 给出合理的占位估计。它不把 DOM 数据移除，也不等于只保留少量节点的虚拟列表；大量节点、事件与数据仍有成本。

不应为了提速把重要焦点目标和阅读入口变成不可达内容。浏览器查找、锚点、辅助技术与滚动恢复需要按目标环境观察；估计尺寸失真时，进入区域可能引发位置变化。hidden 与 auto 的用途也不同，不能混用来实现权限隐藏。

性能改动先有具体瓶颈与前后观察。对于几张卡片，本例无需加这些优化；对于长列表，再选择适合的数据量与渲染策略。可继续查 [REACT-07](../chinese-guides/react-07-performance-memo-large-lists.md#react-07) 与 [CS-03](../chinese-guides/cs-03-large-data-workers-incremental-memory.md#cs-03)。

### 迁移样式时记录来源与退出条件

把旧规则放进 legacy 层、把新规则放进 components 层，是一项会改变覆盖关系的真实变更。先选一个组件，记录原来的 computed 值与外观，再迁移和核对，不把全站移动、改主题与改布局一次混在一起。

临时 override 应能说明为什么存在、由谁维护、何时可以删除。只不断新增 utilities 和 important，最终会形成无法推断的例外集合。设计变量也需要用途与弃用路径，不能让颜色变量名留着旧含义却换成新职责。

引入新能力前记录具体语法、目标浏览器、基线、增强结果与核对日期。可参考下表组织本例结论，不填未经运行的版本数字：

| 能力 | 本例的可观察结果 | 检查结论不能扩大到 |
| --- | --- | --- |
| 容器尺寸查询 | 两种宿主宽度采用不同列数 | 所有样式与滚动状态查询 |
| @layer | 三项颜色来源符合预期 | 所有第三方样式迁移都不变样 |
| Subgrid | 相邻标题、正文与按钮共享行位置 | 任意嵌套与列数都自动正确 |
| 基线开关 | 内容与按钮保留，卡片回到单列 | 真正旧浏览器已经通过 |
| 主题与打印 | 结构保留，演示控件可移除 | 完整可访问性或生产主题系统 |

### 让验证覆盖最有解释力的条件

先在同一桌面视口查看 280 与 520 px 卡片，再观察断点附近、关闭增强、主题变化与长标题。通过 Computed 核对颜色和网格列数，比只看肉眼“差不多”更能解释级联结果。

随后用键盘进入卡片按钮、触发反馈，查看打印样式和强制颜色下的信息结构。局部变窄不应使整页溢出，也不应把操作移到 DOM 中完全不同的位置。这里的窄宿主是桌面侧栏场景，不需要扩展手机设备矩阵。

截图可以留住外观，行为操作证明按钮能工作，计算样式说明规则来源。三者都有用，但对小型样式变更只保留能支持当前判断的观察。若提交 PR，可按 [CAREER-05](../chinese-guides/career-05-code-review-risk-communication.md#验证证据应来自正在评审的改动) 的方式说明范围与限制。

### 参考与延伸阅读

核对日期：2026-09-12。完整页面用于桌面示例；scope、颜色、锚点与滚动动画的说明不构成这些能力的完整兼容报告。

- [MDN：容器查询](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries)：区分尺寸容器、名称、单位与其他子能力。
- [MDN：@layer](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@layer) 与 [@scope](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@scope)：查阅来源顺序、作用范围与具体层叠规则。
- [MDN：Subgrid](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Subgrid)：理解轨道共享与内容尺寸。
- [MDN：自定义属性](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascading_variables/Using_custom_properties)：核对继承、替换与后备值。
- [MDN：锚点定位](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Anchor_positioning) 与 [滚动驱动动画](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations)：逐项查阅属性、语法和兼容性。
- [MDN：content-visibility](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/content-visibility)：理解渲染跳过的作用与边界。
