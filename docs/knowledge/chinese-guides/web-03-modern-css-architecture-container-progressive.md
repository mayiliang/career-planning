# Web 基础知识点讲义

## WEB-03 现代 CSS 架构、容器查询与渐进增强

现代 CSS 已经能按组件容器、作用域、级联层和用户偏好表达大量响应逻辑。能力变多并不意味着把所有新语法立即用于生产；高级工程师要先建立可用基线，再按浏览器能力增强，并为不支持、部分支持和行为变化保留清晰回退。CSS 架构的目标是降低隐式竞争，让组件在不同宿主中仍可预测。

### 学习前先确认

- 直接前置：[WEB-02 CSS 布局、层叠、响应式与逻辑属性](../chinese-guides/web-02-layout-cascade-responsive-logical-properties.md#web-02)。本讲直接使用 Grid/Flex、内在尺寸、层叠与媒体查询；HTML 语义由该讲的前置继续递归说明。

### 一、CSS 架构管理来源、范围和变化

规模增长后，问题常不是“不会写某个属性”，而是规则来自哪里、为何覆盖、能影响多大范围、组件在哪些上下文使用。架构应明确基线、设计 token、组件、工具类、主题和例外的责任。

避免以页面路径和深层 DOM 形成选择器，如 `.dashboard .main .card h3`。它把样式绑到当前结构，复用到侧栏或弹窗就要继续提高权重。组件选择器保持低权重，状态通过属性或明确修饰符表达。

CSS Modules、scoped style 或 CSS-in-JS 可以生成名称隔离，却不自动解决全局变量、层叠顺序、portal 和运行时主题。机制边界仍需设计。

### 二、级联层显式定义作者样式顺序

**级联层（cascade layer）**用 `@layer` 把作者声明分组，并在首次声明时固定普通声明的层顺序：

```css
@layer reset, tokens, base, components, utilities, overrides;

@layer components {
  .button { padding: .6rem 1rem; }
}

@layer utilities {
  .p-0 { padding: 0; }
}
```

不同层先比较层顺序，再在同层内比较优先级。后续重新打开已命名层只是追加内容，不重新排序。未放入层的作者普通样式位于命名层之后，可能意外覆盖 utilities；引入旧 CSS 时应明确放在哪一层。

important 的层顺序与普通声明有不同目的，用于保护早期重要基线。不要把 layer 当成新的 `!important` 竞赛，先设计正常层次并尽量少用 important。

### 三、第三方样式进入受控层

组件库和旧样式通常权重高或顺序不确定。可将其导入 vendor 层，再让本地组件层在不增加选择器权重的情况下覆盖普通规则。

```css
@layer reset, vendor, components, utilities;
@import url('./vendor.css') layer(vendor);
```

若第三方使用内联样式或 important，layer 不能自动解决，需要组件 API、CSS 变量或窄覆盖。升级第三方时重新检查层外规则和 DOM，不要假设导入位置不变。

### 四、@scope 限制匹配范围

**样式作用域（CSS scope）**可让一组规则只在某个根与可选下界之间匹配，减少全局选择器冲突：

```css
@scope (.profile-card) to (.embedded-widget) {
  :scope { border: 1px solid var(--border); }
  h2 { font-size: 1.1rem; }
}
```

scope 会参与层叠中的近接度，但不是 Shadow DOM，也不是安全或脚本隔离。自定义属性仍会继承，子树也仍在同一 DOM。

使用前提供无 scope 时仍正确的类选择器基线，或由构建工具转换；按目标浏览器验证。不要为了使用新语法把关键内容样式置于唯一不兼容路径。

### 五、容器查询解决组件可用空间

媒体查询通常看视口，而组件可能同时出现在宽主栏和窄侧栏。**容器查询（container query）**让组件根据最近合格祖先的尺寸或状态调整。

```css
.course-zone {
  container: course / inline-size;
}

.course-card {
  display: grid;
  grid-template-columns: 1fr;
}

@container course (min-width: 30rem) {
  .course-card {
    grid-template-columns: minmax(0, 2fr) minmax(9rem, 1fr);
  }
}
```

必须在祖先建立 containment；默认查询最近合格容器，命名可避免嵌套误选。不能让元素查询自己尺寸并通过样式无限反馈，容器建立会改变尺寸计算，需要检查布局副作用。

### 六、容器单位提供局部流式尺寸

`cqi`、`cqb` 等单位相对查询容器 inline/block size，可用于 `clamp()` 内的局部字号和间距。没有合格容器时的回退行为要理解，不能让文本变成不可预测尺寸。

```css
.course-card__title {
  font-size: clamp(1rem, 4cqi, 1.5rem);
}
```

流式尺寸仍需最小/最大边界，并在缩放和长文本下验证。排版可读性不应完全跟随容器线性变化。

### 七、样式查询与滚动状态查询有成熟度边界

容器查询体系还可以根据自定义属性样式或滚动状态选择规则。不同子能力的支持时间和语法可能不同，应查当前兼容数据并逐项 feature-detect，不能因尺寸查询可用就假设所有容器查询都可用。

状态若来自业务数据，仍应由 HTML 属性或应用状态明确表达；不要把权限、加载或持久状态藏进 CSS 查询。CSS 状态适合视觉环境，不是业务真源。

实验能力采用增强：基线先完成任务，支持时增加 sticky 状态提示或位置适配，不支持时保持可读。

### 八、Subgrid 共享父网格轨道

**子网格（subgrid）**让嵌套 grid 的某一轴沿用父轨道，适合多卡片标题、正文和动作行对齐：

```css
.cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.card {
  display: grid;
  grid-template-rows: subgrid;
  grid-row: span 3;
}
```

它解决轨道对齐，不解决内容过长、数据边界或语义顺序。窄屏转为单列时验证 span 和隐式轨道，保留普通 grid/flex 基线。

### 九、原生嵌套降低重复但要控制深度

CSS nesting 可以在规则内写相对选择器，减少重复组件前缀。它不会自动限制作用域，也可能生成高权重深层选择器。

```css
.card {
  border: 1px solid var(--border);

  & > h2 { margin-block-start: 0; }
  &:focus-within { border-color: var(--focus); }
}
```

嵌套保持一到两层，并查看最终选择器。不要把预处理器所有历史语法假设为原生 CSS 等价；构建和浏览器解析规则要按当前规范核对。

### 十、设计 token 用自定义属性表达运行时值

**自定义属性（custom property）**参与层叠和继承，可用于颜色、间距、字体和组件局部参数。它保存 token 引用，不做类型保证；未定义或产生无效值时会在计算阶段回退。

```css
:root {
  --color-surface: oklch(98% .01 160);
  --space-3: .75rem;
}

.card {
  padding: var(--card-padding, var(--space-3));
  background: var(--color-surface);
}
```

全局 token 表达语义而非具体组件，如 surface、danger、focus；组件变量作为窄接口。不要让任意页面覆盖内部全部值，使组件合同不可预测。

### 十一、现代颜色仍需可访问回退

OKLCH、`color-mix()`、相对颜色和广色域能建立更一致主题，但显示设备、浏览器和强制颜色行为不同。先声明 sRGB 基线，再在支持条件内增强。

```css
.notice {
  background: #eef7f3;
}

@supports (color: oklch(95% .03 160)) {
  .notice { background: oklch(95% .03 160); }
}
```

数学上的颜色空间均匀不自动满足对比度。验证文本、非文本控件、hover/focus、暗色、强制颜色和打印。不要只用颜色传达状态。

### 十二、@supports 是能力分支，不是版本分支

**特性查询（feature query）**用 `@supports` 检查某个声明是否被解析。它不证明实现无 bug，也不能检查所有组合行为，但比按浏览器名称分支稳健。

先写可用基线，再在 `@supports` 内覆盖。JavaScript 只有在行为需要脚本协同时用 `CSS.supports()`，不要为纯布局重复维护一份 JS 状态。

不支持环境应得到简单但完整的单列、普通定位和无动画体验，而不是空白或不可操作。

### 十三、渐进增强围绕核心任务

**渐进增强（progressive enhancement）**先保证目标环境能完成核心任务，再增加容器响应、锚点定位和动画。回退不是视觉完全相同，而是内容、操作和错误恢复仍可用。

确定基线浏览器与业务要求，列出增强能力和失败方式。关键确认按钮不能只通过不受支持的 popover 或动画出现；锚点定位失败时可回到普通 flow 或 JS 计算。

新 API 稳定后可以调整基线，但通过版本化决定移除旧回退，不要永久累积两套无人验证的 CSS。

### 十四、Anchor Positioning 处理锚点与碰撞

**锚点定位（anchor positioning）**可让浮层相对触发元素定位，并提供位置 fallback。它适合 tooltip、菜单等几何关系，不能替代弹层语义、焦点、dismiss 和 top layer。

基线可使用普通定位或成熟组件，支持时采用 anchor 和 `position-try` 改善碰撞。验证滚动容器、缩放、RTL、窄视口和锚点消失。浮层内容必须保持屏幕内可访问。

不同锚点相关子能力可能处于不同成熟阶段，使用时锁定支持矩阵并保留回退。

### 十五、滚动驱动动画不能控制内容可达性

**滚动驱动动画（scroll-driven animation）**把动画进度连接到滚动或视图时间线，可减少手写 scroll 监听。它适合进度指示和非关键呈现。

内容不能因为动画不支持或 reduced motion 而永远透明、偏离屏幕。基线直接显示，支持且用户未要求减少动画时增强。验证键盘跳转、程序滚动、打印和不同滚动容器。

性能仍需测量：CSS API 减少脚本不保证所有属性都在合成线程高效运行。

### 十六、content-visibility 是渲染优化而非虚拟列表

`content-visibility:auto` 可跳过屏外子树的部分渲染工作，`contain-intrinsic-size` 提供占位估计。它不减少 DOM、数据和事件监听，也不等于列表虚拟化。

验证浏览器查找、锚点跳转、焦点、可访问树、打印和布局偏移。若用户通过键盘进入未渲染区，内容必须及时出现。对短页面使用可能没有收益，却增加调试复杂度。

先用性能 trace 证明瓶颈和收益，并保留撤销优化的对照。

### 十七、主题系统依赖层叠与媒体偏好

暗色可通过 `prefers-color-scheme` 建立默认，再由用户显式选择覆盖。用户选择持久化后应成为应用状态，并在首屏尽早应用，减少闪烁。

主题 token 覆盖放在明确层和范围，组件消费语义变量。不要在每个组件硬编码暗色选择器。高对比度与 forced-colors 单独验证，不能认为暗色主题覆盖无障碍需求。

服务端渲染时处理首次主题与 hydrate 一致，避免客户端纠正造成抖动。

### 十八、CSS 架构需要删除和迁移策略

引入 layer、scope 或 token 时，避免一次混合全站行为变化。先声明层顺序，导入旧样式到 legacy 层，逐组件迁移并用视觉/交互回归验证。

记录旧 utility、变量和浏览器回退的弃用。使用统计和代码搜索决定删除时间。重复新旧规则长期共存会让 computed style 更难解释。

迁移期间的临时 override 有 owner 和截止条件，不成为永久最高层垃圾场。

### 十九、版本核验按子能力记录

现代 CSS 页面常把多个 API 放在同一“新特性”标题下，但尺寸容器查询、样式查询、锚点 fallback 和滚动时间线支持不同。资料记录访问日期、目标浏览器和具体语法，而不是只写“现代浏览器支持”。

使用 Web Platform Tests、MDN/规范和真实设备验证。Can I Use 等统计是输入，不替代你的用户浏览器分布和行为测试。实验能力需要功能开关或可安全回退。

### 二十、验证矩阵覆盖支持与不支持

选择同一组件在 240px 与 480px 容器、窄/宽视口、支持/禁用增强、reduced motion、打印和键盘路径下检查。断言核心内容与操作始终存在，增强只改变布局或体验。

查看 computed layer、查询容器和实际尺寸，保存断点两侧截图。故意把组件放进嵌套容器，确认查询命中了命名目标；移除增强规则后，基线仍能完成任务。

CSS 验证还要检查页面级 overflow、焦点和可访问名称，不能只比较像素。

### 学完后应能说明

你应能用 cascade layer 和 scope 控制来源与范围，使用容器查询、容器单位和 Subgrid 让组件响应宿主，并通过自定义属性建立主题合同。对锚点定位、滚动动画和 content-visibility 等能力，应能判断成熟度、提供可用基线和 `@supports` 增强，并用支持/不支持矩阵证明核心任务不依赖新语法。
