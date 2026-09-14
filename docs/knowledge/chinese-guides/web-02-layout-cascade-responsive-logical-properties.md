# Web 基础知识点讲义

## WEB-02 看懂布局尺寸与样式覆盖

桌面足够宽，资料列表却被一个长文件名撑出滚动条；弹窗的 z-index 已经很大，仍然被另一块区域盖住。继续加宽度或更大的数字，往往只是让问题暂时换个地方出现。

这一讲先用一个可操作的桌面资料页，观察正常布局与溢出对照，再分别解释尺寸、空间分配、层叠和定位。目标是能说清某条规则为什么有效，而不是积累一串“遇到问题就加上”的 CSS。

### 学习前先确认

- 直接前置：[WEB-01 HTML 语义与原生交互](../chinese-guides/web-01-html-semantics-forms-accessibility.md#web-01)。本讲默认能使用标题、标签、按钮、对话框与合理的 DOM 顺序。

这里的适应布局主要面向桌面窗口、侧栏、长文本与放大阅读。无需为本例准备手机或触摸操作；媒体查询与逻辑属性的机制仍会解释。

### 从正常流与盒模型建立尺寸直觉

浏览器首先按文档顺序安排内容。普通块级内容沿块方向依次放置，行内文字在行盒里换行；不先指定 absolute，页面也能形成完整的阅读顺序。这就是理解布局的起点。

**盒模型（box model）**区分内容、padding、border 和 margin。默认 content-box 下，声明宽度只约束内容；使用 border-box 后，声明宽度包含内边距和边框，外边距仍在外面。

例如内容宽 240 px、两侧各 16 px 内边距与 1 px 边框，content-box 的边框盒总宽是 274 px；同样声明 `width:240px` 的 border-box 则把这些空间放进 240 px。元素还有最小尺寸约束，不能据此认定它在任何内容下都能任意缩小。

正常流里的尺寸与定位偏移也不同。relative 偏移后原位置仍被保留，absolute 通常脱离正常流，不再撑开父级高度；transform 改变视觉呈现，不等于重新按新位置排布周围元素。

### 先打开一个完整的桌面布局页面

把下面整段保存为 `layout.html`，直接用桌面浏览器打开即可。没有外部依赖，没有请求真实资料。顶部滑块改变演示区域宽度，两个复选框分别切换溢出对照和文字方向。

```html example=web02-layout runtime=project file=layout.html
<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>资料页布局观察</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  :root { font-family: "Segoe UI", "Microsoft YaHei", sans-serif; color: #183e35; background: #f1f6f3; }
  body { margin: 0; padding: 24px; }
  .page { max-inline-size: 1200px; margin-inline: auto; }
  h1 { font-size: 1.8rem; }
  h2 { font-size: 1.2rem; margin-block-start: 0; }
  p { line-height: 1.8; }
  button, input { font: inherit; }
  button { padding: .65rem 1rem; border: 1px solid #276954; border-radius: 8px; background: #21644f; color: white; cursor: pointer; }
  :focus-visible { outline: 3px solid #a34d13; outline-offset: 3px; }
  .controls { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; margin-block: 20px; }
  .controls label { display: inline-flex; align-items: center; gap: 8px; }
  .frame { inline-size: 100%; max-inline-size: 1120px; overflow: auto; border: 1px solid #acc5b8; border-radius: 16px; background: white; }
  .workspace { display: grid; grid-template-columns: 240px minmax(0, 1fr); gap: 24px; padding: 24px; }
  .side { padding: 18px; background: #e9f3ed; border-radius: 12px; }
  .side a { display: block; margin-block: 14px; color: #205f4b; }
  .main { min-inline-size: 0; }
  .toolbar { display: flex; flex-wrap: wrap; align-items: start; justify-content: space-between; gap: 12px; }
  .toolbar h2 { flex: 1 1 12rem; min-inline-size: 0; }
  .card { margin-block-start: 16px; padding: 20px; border: 1px solid #ccddd2; border-inline-start: 5px solid #34795d; border-radius: 10px; }
  .token { overflow-wrap: anywhere; }
  .table-wrap { overflow: auto; margin-block-start: 16px; }
  table { border-collapse: collapse; min-inline-size: 550px; inline-size: 100%; }
  th, td { text-align: start; padding: 12px; border-block-end: 1px solid #d4e2d9; }
  .broken .workspace { grid-template-columns: 240px 1fr; }
  .broken .main { min-inline-size: auto; }
  .broken .token { overflow-wrap: normal; }
  dialog { inline-size: min(560px, calc(100% - 48px)); padding: 28px; color: #183e35; border: 1px solid #acc5b8; border-radius: 16px; }
  dialog::backdrop { background: #163e3555; }
  #result { min-block-size: 2em; font-variant-numeric: tabular-nums; }
  @media (max-width: 1050px) {
    .workspace, .broken .workspace { grid-template-columns: minmax(0, 1fr); }
  }
  @media print {
    body { padding: 0; background: white; }
    .controls, .toolbar button, dialog, #result { display: none; }
    .frame { inline-size: auto !important; max-inline-size: none; overflow: visible; border: 0; }
    .workspace, .broken .workspace { display: block; padding: 0; }
    .side { display: none; }
    .token, .broken .token { overflow-wrap: anywhere; }
    .table-wrap { overflow: visible; }
    table { min-inline-size: 0; }
    .card { break-inside: avoid; }
  }
  @media (forced-colors: active) {
    button, .card, .frame { border-color: CanvasText; }
    :focus-visible { outline-color: Highlight; }
  }
</style>
</head>
<body>
<div class="page">
  <h1>资料页布局观察</h1>
  <p>调整区域宽度，观察长文件名、局部表格与资料详情。</p>
  <div class="controls">
    <label>区域宽度 <input id="width" type="range" min="680" max="1120" step="20" value="1120"><output id="size">1120 px</output></label>
    <label><input id="broken" type="checkbox">显示溢出对照</label>
    <label><input id="rtl" type="checkbox">右到左方向</label>
  </div>
  <div class="frame" id="frame" role="region" aria-label="布局演示区域" tabindex="0">
    <div class="workspace">
      <nav class="side" aria-label="资料分类"><h2>资料分类</h2><a href="#notes">学习笔记</a><a href="#files">文件记录</a></nav>
      <main class="main" id="notes">
        <div class="toolbar"><h2>执行上下文与闭包学习资料</h2><button id="details">查看资料详情</button></div>
        <article class="card"><h2>长文件名也属于正常内容</h2>
          <p class="token">knowledge_execution_context_scope_closure_review_notes_version_2026_09_12_with_extended_examples_and_references.md</p>
          <p>标题和说明可以自然换行；只有确实需要保留列关系的表格使用局部滚动。</p>
        </article>
        <div class="table-wrap" id="files" role="region" aria-label="文件记录表格" tabindex="0">
          <table><caption>文件记录</caption><thead><tr><th>资料</th><th>版本</th><th>状态</th></tr></thead>
          <tbody><tr><td>闭包笔记</td><td>2026-09-12</td><td>可阅读</td></tr><tr><td>异步控制</td><td>2026-09-12</td><td>待复习</td></tr></tbody></table>
        </div>
      </main>
    </div>
  </div>
  <p id="result" role="status"></p>
</div>
<dialog id="info" aria-labelledby="dialog-title">
  <h2 id="dialog-title">资料详情</h2><p>这是独立的布局演示，没有读取或修改真实学习记录。</p>
  <form method="dialog"><button autofocus>关闭详情</button></form>
</dialog>
<script>
  const frame = document.querySelector('#frame');
  const width = document.querySelector('#width');
  const broken = document.querySelector('#broken');
  const rtl = document.querySelector('#rtl');
  function update() {
    frame.style.inlineSize = `${width.value}px`;
    frame.style.maxInlineSize = '100%';
    frame.classList.toggle('broken', broken.checked);
    frame.dir = rtl.checked ? 'rtl' : 'ltr';
    document.querySelector('#size').textContent = `${width.value} px`;
    document.querySelector('#result').textContent = frame.scrollWidth > frame.clientWidth + 1
      ? '演示区域发生横向溢出：请检查长文件名与网格最小尺寸。'
      : '演示区域无横向溢出；表格可在自己的区域内滚动。';
  }
  for (const input of [width, broken, rtl]) input.addEventListener('input', update);
  window.addEventListener('resize', update);
  const info = document.querySelector('#info');
  const trigger = document.querySelector('#details');
  trigger.addEventListener('click', () => info.showModal());
  info.addEventListener('close', () => trigger.focus());
  update();
</script>
</body>
</html>
```

先保持浏览器宽度约 1440 px，把区域调到 680 px：资料文字应换行，按钮仍可见，表格在自己的区域滚动。勾选溢出对照后，长文件名会把内容所需宽度抬高，演示区域出现横向滚动；页面本身不应被撑宽。

对照开关同时撤掉三处保护，用于暴露整条尺寸链。理解下面的原因后，可以在 DevTools 中逐条启用规则，判断每条各负责什么，不把三个声明作为不加区分的万能补丁。

### 内在尺寸解释长内容为什么撑开网格

**内在尺寸（intrinsic sizing）**让内容参与尺寸计算。长而没有换行机会的字符串，会形成很大的最小内容需求；Grid 和 Flex 项目的自动最小尺寸也可能保护这个需求，使元素不愿继续缩小。

`1fr` 不等于“无论内容多宽都压进剩余空间”。在常见网格轨道用法中，它的自动最小值可能受内容影响。示例的 `minmax(0,1fr)` 为该轨道明确允许从 0 开始分配剩余空间；`.main { min-inline-size:0 }` 允许项目自身缩小。

两者也不会自动让字符串换行。`.token { overflow-wrap:anywhere }` 提供必要时的断行机会，并参与最小内容尺寸计算。这个声明适合长文件名等内容；正常中文段落不应为了省事全部使用 `word-break:break-all`，否则英文单词的阅读会被破坏。

表格不同：为了保留列关系，本例明确让它至少有 550 px 宽，并由可命名、可聚焦的容器承担横向滚动。文字应换行、代码可能局部滚动、表格保留列关系，这些是不同的内容决定。

### Flex 与 Grid 分别分配哪一部分空间

**Flexbox** 主要沿一个主轴安排项目，适合工具栏中标题和按钮的分配。本例用 flex-wrap 允许按钮在空间不足时换行，gap 保留间距；标题能伸缩，按钮依然有完整名称。

flex-grow 处理剩余空间，flex-shrink 处理收缩，flex-basis 给出分配的基础尺寸。`flex:1` 也不意味着可以忽略内容最小尺寸、边框或兄弟项目。先确认主轴和可用空间，再解释最终宽度。

**Grid** 同时建立行列轨道，本例的侧栏与正文由它负责。外层 Grid 确定区域分配，内层 Flex 处理工具栏，这是按职责组合，不需要在两者之间选出永远正确的一种。

auto-fill 与 auto-fit 在自动重复轨道上也有区别：空轨道是否继续保留会改变剩余空间的分配。卡片列表可以用 `repeat(auto-fit,minmax(min(100%,16rem),1fr))`，但还要看内容下限、外层尺寸与项目数量。不能把复制一条模板当成已经理解布局。

### 适应桌面空间时让内容决定断点

本例有两种不同的宽度：浏览器视口和滑块控制的局部区域。媒体查询的 1050 px 读取视口，因此在宽浏览器中把局部区域缩到 680 px，并不会自动触发这条查询；真正缩小浏览器窗口时才会变成单列。

这个区别解释了为什么“同一张卡片放进侧栏后坏了”：视口可能一直很宽，组件实际只拿到几百像素。局部空间问题可以在 [WEB-03 的容器查询](../chinese-guides/web-03-modern-css-architecture-container-progressive.md#容器查询读取的是哪一个祖先) 中继续解决。

断点的依据应是内容什么时候不再舒服，例如侧栏加正文、间距与最小阅读宽度之和已经放不下。1024 或 1280 不是天然正确的数字；示例的 1050 只是当前内容的教学选择。调整时检查断点两侧和中间宽度，而不是只保存两张端点截图。

页面缩窄不需要重建资料组件，也不应清空草稿或改变 DOM 阅读顺序。CSS order 或视觉定位可以改变外观，却不自动改变键盘顺序；重要操作不要出现在视觉与焦点完全相反的位置。

### 逻辑属性沿文字方向表达空间

**逻辑属性（logical properties）**使用 inline 与 block 描述相对书写模式的方向。通常横排中文中，inline-size 对应宽度，block-size 对应高度；竖排时对应关系会变化。

本例的 `border-inline-start` 标出卡片文字开始的一侧。切换 dir 后，它应从左侧移到右侧；`margin-inline:auto`、`padding-block` 和 `text-align:start` 也按语义表达布局。`dir` 改变文字方向，不是把所有图标和业务顺序都机械翻转。

如果一个箭头表示历史上的时间推进，是否翻转需要产品语义判断。竖排还需设置 writing-mode；只切 dir 并不能证明竖排布局可用。同一属性同时使用物理与逻辑声明时，也要检查它们最终映射到哪条边，不能以为二者永远互不覆盖。

### 层叠先确定候选再比较选择器

**层叠（cascade）**决定同一元素同一属性最终采用哪个声明。先确认选择器及 media、supports 等条件相关，再比较来源与重要性等层次；选择器的优先级并不是第一步。

在常见作者样式内部，先区分普通声明和 important、是否处于级联层，再比较 specificity；满足相同前提后才考虑作用域接近程度与出现顺序。动画、过渡、用户样式和浏览器默认样式也有各自的位置，不能用“后写的一定赢”概括全部情况。

例如一个普通 class 规则，无论写得多长，都不能仅靠更多 class 覆盖同属性的有效 important 声明。用户的重要样式优先于作者的重要样式，这是用户定制的重要机制。调试时查看 Computed 中实际胜出的值与来源，再回到 Styles 找被覆盖或根本没匹配的规则。

级联层可以让来源顺序更明确，详见 [WEB-03](../chinese-guides/web-03-modern-css-architecture-container-progressive.md#级联层先决定来源顺序再看选择器)。不要为了修复一个局部覆盖问题，直接在全站增加 important。

### 选择器优先级要按组成比较

specificity 通常按 ID、class/属性/伪类、类型/伪元素三列比较，逐列决定，不是把数字随便相加。一个 ID 的优先级不能靠增加若干类型选择器直接抵消。

`:where()` 及其参数不增加 specificity，适合低优先级基线；`:is()`、`:not()`、`:has()` 的参数会参与计算，应检查其中最高的选择器。它们不是“写短了就变弱”。原生嵌套也可能受父级选择器列表影响，不能假设所有展开都等同简单文本拼接。

例如 `:where(.card) h2` 很容易被 `.card h2` 覆盖，而含 ID 的候选可能让整条规则更难覆盖。优先保持作用范围清楚、选择器短、来源有序；真正需要业务状态时，用明确的状态 class 或属性，不层层增加祖先选择器。

本例的 `.broken .token` 比 `.token` 更具体，是为了一个明确的演示状态。真实项目若需要不断增加 `.page .panel .section ...` 才能改颜色，往往说明来源或组件边界需要整理。

### 包含块与层叠上下文是两个问题

**包含块（containing block）**参与定位尺寸与坐标计算；**层叠上下文（stacking context）**限制绘制顺序的比较范围。二者经常同时出现，却不能互相代替。

absolute 常以最近建立定位包含块的祖先为依据；fixed 通常相对视口，但 transform 等祖先可能改变它的包含块。opacity 小于 1、transform、isolation，以及某些定位与 z-index 组合，都可能建立新的层叠上下文。

想象区域 A 在父上下文的层级为 1，区域 B 为 2。A 内部的提示即使设置 z-index:9999，也仍作为 A 的一部分参与外层排序，不能直接越过 B。此时继续增加提示的数字不能解决外层关系。

本例调用 dialog.showModal()，模态对话框进入浏览器 top layer。它因此不依赖普通页面区域的 z-index 竞争，但仍要有名称、关闭方式和焦点返回；示例用原生 dialog 与关闭事件完成这些动作。弹层被裁剪和被另一层覆盖也要分别诊断，不能把所有“看不到”都归为 z-index。

### 滚动裁剪与 sticky 要找到实际祖先

`overflow:auto` 在需要时提供滚动；hidden 裁剪内容，仍可能形成可程序滚动的容器；clip 不提供相同的滚动机制。混合设置两个轴时还会有计算值规则，应该查看实际 overflow-x 与 overflow-y，而不是只读其中一行源码。

sticky 依赖滚动祖先、可移动空间和 inset 阈值。若祖先意外形成滚动容器、元素与容器几乎同高，或没有设置需要的阈值，表现可能与预期不同。把 z-index 调大不会增加它能移动的空间。

本例让“布局演示区域”承担故障对照的滚动，把表格滚动限制在表格区域。真实页面不要为了隐藏缺陷给 body 加 overflow-x:hidden：内容和键盘焦点可能只是被藏到看不见的地方。

需要局部滚动时，给区域可理解的名称，并确认键盘能进入、滚动和离开。模态开启后的滚动与背景交互也应沿原生协议观察，不能只给背景涂一层半透明颜色。

### 文字放大与字体变化也是布局输入

设计稿里的短标题不是唯一输入。至少把长中文、英文文件名、URL、空内容和错误提示带入判断。表单错误与关键操作不能依赖省略号表达完整意思，必要时允许换行或展开。

本例使用 rem 与相对尺寸，避免给正文固定高度。桌面缩窄与增大默认字体可帮助发现空间不足；它们不能完全替代浏览器真实页面缩放。实际目标中还需体验放大后的阅读、焦点和对话框可达性。

`clamp()` 可以给字号设置上下界，但若主要使用 vw 且上下界过紧，可能限制用户的放大效果。ch 是与字体度量相关的单位，不等于固定数量的中文字符。字体替换会改变行宽和行高，不能只在某一种已加载字体下判断是否溢出。

图片提供合理的 width/height 或 aspect-ratio，可以减少加载时位置跳动；不要为了消除偏移把真实正文裁进固定高度。vh 与 svh、lvh、dvh 表达的视口口径也不同；选择高度时仍需保留内容滚动，本例不依赖移动浏览器工具栏行为。

### 打印与用户偏好要保留信息和焦点

本例打印时去掉演示控件与分类导航，恢复表格自然排版，让正文内容进入纸面。不要只让页面截图看起来像纸张：真实分页、长表格和背景不打印时仍要能理解内容。

强制颜色模式可能替换作者颜色，因此示例保留实际边框并使用系统颜色表达焦点。不要只靠阴影或背景色区分可操作元素；黑白或用户颜色下也应有结构线索。深色主题与强制颜色是不同的机制，不能互相代表。

非必要动画可响应 prefers-reduced-motion，避免影响阅读；内容的出现不能依赖动画完成。下一篇会把这些偏好与渐进增强连接起来。

### 用逐层对照找到应修改的位置

遇到溢出，先找到哪个区域的 scrollWidth 超过 clientWidth，再定位具体元素。检查它的内容、最小尺寸、父轨道、定位和变换，逐条关闭可疑声明，观察变化。

本例先关闭溢出开关得到基线，再分别撤掉换行、项目最小尺寸与轨道最小值。某条声明在当前宽度下没有改变截图，不代表永远无用；它可能只在另一种长内容或嵌套环境中起作用。结论应包含触发条件。

同样，修改布局后要确认内容可见、焦点可达和 DOM 顺序仍合理。桌面上优先核对主工作宽度、一个较窄窗口、侧栏宽度与长内容；只有新的风险出现时才扩大检查，而不是默认铺开所有设备组合。

`contain` 或 content-visibility 能限制部分布局与渲染工作，也会改变尺寸、绘制和可见性条件。它们不应作为不理解溢出原因时的遮盖手段；相关能力与代价在 [WEB-03](../chinese-guides/web-03-modern-css-architecture-container-progressive.md#渲染优化不能让关键内容依赖偶然触发) 中继续说明。

### 参考与延伸阅读

核对日期：2026-09-12。完整 HTML 用于桌面布局观察，具体浏览器能力以目标环境为准。

- [MDN：盒模型](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Box_model)：理解声明宽度与最终占用空间。
- [MDN：Grid 中的尺寸](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Basic_concepts_of_grid_layout)：查阅轨道、fr 与 minmax。
- [MDN：Flex 项目比例](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Flexible_box_layout/Controlling_ratios_of_items_along_the_main_axis)：理解增长、收缩和基础尺寸。
- [MDN：层叠](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascade/Introduction) 与 [优先级](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascade/Specificity)：区分不同层次的比较。
- [MDN：层叠上下文](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Positioned_layout/Stacking_context)：排查跨祖先的覆盖问题。
- [MDN：逻辑属性](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Logical_properties_and_values)：按文字方向理解尺寸与边距。
