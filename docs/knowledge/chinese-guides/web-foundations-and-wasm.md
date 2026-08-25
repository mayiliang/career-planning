# Web 底层与界面基础中文核心讲义

这份讲义用四个可复现项目连接语义、布局、渐进增强与 WebAssembly 宿主边界。不要用“API 存在”代替“交互可用”，也不要用“最新浏览器截图正常”代替边界证据。

## WASM-01

### WebAssembly 通用运行时、宿主边界与工程化

#### 1. WebAssembly 不是“更快的 JavaScript”

**WebAssembly（Wasm，Web 汇编）**是一种可移植的低层字节码与执行模型。常见工具链把 C/C++、Rust 等语言编译为 `.wasm`，JavaScript 通过浏览器 WebAssembly API 加载并调用。是否更快取决于计算密度、启动/下载、数据编码、跨边界调用次数、内存所有权与目标设备，不是只由语言名称决定。

加载链上的核心对象：

- **Module（模块）**：已验证与编译的无状态 Wasm 代码，可多次实例化；
- **Instance（实例）**：Module 与实际 imports 链接后的有状态运行实例，通过 `instance.exports` 暴露能力；
- **import/export（导入/导出）**：Wasm 和宿主之间的显式连接。Wasm 沙箱不能自行访问 DOM 或业务 API，但如果宿主导入了网络/日志能力，仍必须另做权限与输入验证；
- **Memory（线性内存）**：按 64KiB 页扩展的字节数组，JavaScript 通过 `memory.buffer` 建立 TypedArray 视图；
- **Table（表）**：保存可间接引用的函数或引用值，不是业务数据表。

#### 2. ABI 是两种运行时的合同

**ABI（application binary interface，应用二进制接口）**定义参数怎样表示、内存如何布局、谁分配/释放、如何返回错误。`sum(ptr,len)` 的最小 ABI 表：

| 项 | 约定 |
| --- | --- |
| `ptr` | 线性内存中输入首字节偏移，单位是 byte |
| `len` | 元素数，不是末尾地址 |
| 元素类型 | 本挑战固定为 `u8` |
| 返回值 | 无符号求和，输出范围在 fixture 内不溢出 |
| 分配 | JavaScript 调用 `alloc(len)` 得到 `ptr` |
| 释放 | 无论成功、Wasm 异常还是 JS 异常，都在 `finally` 中 `free(ptr,len)` |
| 越界 | `ptr < 0` 或 `ptr + len > memory.buffer.byteLength` 时拒绝 |

```js
async function loadWasm(url, imports) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Wasm 下载失败：${response.status}`);

  if (WebAssembly.instantiateStreaming) {
    try {
      return await WebAssembly.instantiateStreaming(response.clone(), imports);
    } catch (error) {
      // 例如服务器 MIME 不是 application/wasm。记录后回退，不吞错。
      console.warn("streaming fallback", error);
    }
  }

  const bytes = await response.arrayBuffer();
  return WebAssembly.instantiate(bytes, imports);
}

function makeSum(exports, input) {
  const ptr = exports.alloc(input.byteLength);
  try {
    let view = new Uint8Array(exports.memory.buffer);
    view.set(input, ptr);
    return exports.sum(ptr, input.length);
  } finally {
    exports.free(ptr, input.byteLength);
  }
}
```

链接错误例如模块导入 `env.log` 但 imports 只有 `host.log`。排错时先用 `WebAssembly.Module.imports(module)` 列出实际模块名/字段名，再修正导入表，不用空函数掩盖缺失能力。

#### 3. `memory.grow()` 后为什么必须重建视图

```js
const memory = new WebAssembly.Memory({ initial: 1, maximum: 4 });
const beforeBuffer = memory.buffer;
const before = new Uint8Array(beforeBuffer);

memory.grow(1);

console.assert(memory.buffer !== beforeBuffer);
console.assert(before.byteLength === 0); // 旧 ArrayBuffer 已分离
const after = new Uint8Array(memory.buffer); // 必须重建
```

旧视图读到 0 或长度变 0 不是 Wasm 把原数据清空，而是它仍指向增长前已分离的 buffer。不要把 TypedArray 视图保存为永久单例；每次可能 grow 后从 `memory.buffer` 重建。

#### 4. 固定基准：计算量相同，边界次数不同

两组输入总量都是 4MB：

- A：一次调用处理一个 4MB buffer；
- B：1000 次调用，每次 4KB。

每组同时跑 JS fallback 与 Wasm，报告下载大小、冷编译/实例化、预热后稳态、边界调用次数、拷贝字节、峰值 memory 页数、求和正确性与 `free` 计数。预期 B 更容易被调用/分配/拷贝的边界成本支配，但结论必须由目标设备的原始样本证明。

#### 5. 技术选择与成熟度边界

- JavaScript：DOM 交互、业务编排、小数据和频繁宿主调用的默认选择；
- Wasm：已有原生库或 CPU 密集热点，且 ABI/包体/所有权成本可控；
- WebGPU：大量 GPU 并行计算，需要设备能力、显存与丢失恢复；
- 服务端原生模块：数据不应下载、必须在权限内聚合，或客户设备不足；
- WASI（WebAssembly System Interface，WebAssembly 系统接口）与 Component Model（组件模型）：为非浏览器宿主能力和语言间组件接口服务，运行时/工具链成熟度必须按部署目标核验，它们不是浏览器通用基线。

制品不只有 `.wasm`，还可能有 JS glue（粘合代码）、类型、Worker、source map 和工具链锁文件。验收要保存工具版本、包体积、响应 MIME、内容摘要、fallback 路径、异常释放日志和基准原始样本。

## WEB-01

### HTML 语义、表单与可访问性基础

#### 1. 语义是浏览器与用户之间的合同

**语义 HTML（semantic HTML，语义化 HTML）**用元素的角色而不是外观描述内容。`<button>` 默认可聚焦，能被 Enter/Space 激活，并暴露 button 角色；`<div role="button">` 只补充角色，不会自动得到全部键盘行为、disabled 语义和表单能力。

**ARIA（Accessible Rich Internet Applications，无障碍富互联网应用）**是对 HTML 的补充。第一原则是：如果已有语义和行为都合适的原生元素，优先使用原生元素。ARIA 不会修复错误的键盘交互，错误角色/状态反而会向辅助技术传递错误信息。

一个可交互元素在无障碍树中最少要核对：

- **role（角色）**：它是按钮、输入框、标题还是对话框；
- **accessible name（可访问名称）**：“它叫什么”，常来自文本、`<label>`、`aria-labelledby` 或必要时的 `aria-label`；
- **description（描述）**：补充帮助或错误，通常由 `aria-describedby` 引用；
- **state（状态）**：禁用、展开、无效、选中等，必须与真实交互一致。

#### 2. 表单标签、分组和错误链

```html
<form id="profile-form" novalidate>
  <div class="field">
    <label for="name">姓名</label>
    <input
      id="name"
      name="name"
      required
      autocomplete="name"
      aria-describedby="name-help name-error"
    />
    <p id="name-help">请输入用于学习档案展示的姓名。</p>
    <p id="name-error" role="status" hidden></p>
  </div>
  <button type="submit">保存</button>
</form>
```

`for="name"` 与 `id="name"` 建立可点击的 label—control（标签—控件）关联。`name` 决定提交字段，不是可访问名称的替代。`aria-describedby` 引用帮助与错误文本，不要把错误字符串塞入 `aria-label` 覆盖字段名。

```js
const form = document.querySelector("#profile-form");
const nameInput = document.querySelector("#name");
const nameError = document.querySelector("#name-error");

function validateName({ announce = false } = {}) {
  const message = nameInput.value.trim() ? "" : "请输入姓名";
  nameInput.setAttribute("aria-invalid", String(Boolean(message)));
  nameError.textContent = message;
  nameError.hidden = !message;

  // blur 只调用一次本函数；不同时再建 alert 复读一次。
  if (announce && message) nameError.setAttribute("role", "alert");
  else nameError.setAttribute("role", "status");
  return !message;
}

nameInput.addEventListener("blur", () => validateName({ announce: true }));
form.addEventListener("submit", (event) => {
  if (!validateName({ announce: true })) {
    event.preventDefault();
    nameInput.focus();
  }
});
```

提交触发变为 blur 时，名称、描述链和聚焦顺序不应改变；只改变校验与通知时机。同一错误只通知一次，后续键入修正后更新或移除错误。

#### 3. 原生 dialog 的打开、关闭和归焦

```html
<button id="open-profile" type="button">编辑资料</button>
<dialog id="profile-dialog" aria-labelledby="profile-title">
  <h2 id="profile-title">编辑资料</h2>
  <form method="dialog">
    <label for="nickname">昵称</label>
    <input id="nickname" name="nickname" autofocus />
    <button value="cancel">取消</button>
    <button value="save">保存</button>
  </form>
</dialog>
```

```js
const trigger = document.querySelector("#open-profile");
const dialog = document.querySelector("#profile-dialog");
let opener = null;

trigger.addEventListener("click", () => {
  opener = document.activeElement;
  dialog.showModal(); // 进入 top layer，非对话框子树变 inert
});

dialog.addEventListener("close", () => {
  if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
  opener = null;
});
```

`showModal()` 打开模态对话框，Escape 会发出 `cancel` 并默认关闭最上层模态对话框。对话框内必须有明确关闭按钮，因为不能假设用户有物理键盘。`method="dialog"` 提交会关闭对话框，按钮 `value` 进入 `dialog.returnValue`。

不要把 `open` 属性当作 `showModal()` 的等价品：它不会自动提供模态 top layer 行为。关闭后浏览器通常会尝试归还焦点，但业务流仍应保存并验证打开者，以处理动态 DOM 和自定义关闭路径。

#### 4. 挑战证据

- 从打开按钮开始，只用 Tab / Shift+Tab / Enter / Escape 走完路径；
- 保存打开前、打开后初始焦点、关闭后焦点的断言；
- 在无障碍树快照中检查 input 的名称为“姓名”，dialog 的名称为“编辑资料”，错误文本出现在描述链；
- 对 blur 复测记录错误只通知一次，名称与归焦不变。

## WEB-02

### CSS 布局、层叠与响应式

#### 1. 先找格式化上下文，再调数字

**格式化上下文（formatting context，布局上下文）**决定子元素如何排列。Flexbox（弹性盒布局）适合一个主轴上的分配和对齐，Grid（网格布局）适合同时控制行与列。它们可以嵌套，不是二选一的流行风格。

三视口列表的基础布局：

```css
*, *::before, *::after { box-sizing: border-box; }
html { overflow-wrap: anywhere; }
body { margin: 0; min-inline-size: 0; }

.page {
  inline-size: min(100% - 2rem, 72rem);
  margin-inline: auto;
}

.toolbar {
  position: sticky;
  inset-block-start: 0;
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  gap: .75rem;
}

.list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
  gap: 1rem;
}

.card,
.card__title {
  min-inline-size: 0; /* flex/grid 项默认 min-content 边界的关键修复 */
}

.card__title {
  overflow-wrap: anywhere;
}

@media print {
  .toolbar { position: static; }
  .dialog-trigger { display: none; }
  .list { display: block; }
  .card { break-inside: avoid; }
}
```

200 字无空格标题会暴露 min-content（最小内容宽度）限制。对 flex/grid 子项只加 `max-width:100%` 可能不够，需先让它能缩小：`min-inline-size:0`，再定义长内容换行策略。

#### 2. `z-index: 9999` 为什么仍可能没用

**层叠上下文（stacking context，堆叠上下文）**把一组子元素当作整体参与父级比较。常见创建条件包括：有效的 `transform`、`opacity < 1`、某些 `position + z-index`、`isolation:isolate`、filter 等。如果弹层在 `transform` 祖先创建的低层层叠上下文中，子元素内部 `z-index:9999` 也无法越过祖先整体。

受限排错顺序：

1. 在 DevTools 中沿祖先查找 `transform` 或其他层叠上下文创建条件，暂时关闭并截图对照；
2. 查找 `overflow:hidden/clip/auto`，区分“被裁剪”与“层叠在下方”；
3. 查找 flex/grid 项的 `min-width:auto`，用 `min-inline-size:0` 验证溢出是否消失。

真正的模态弹层可优先使用 `<dialog>.showModal()` 进入 top layer，而不是在普通 DOM 层级中进行 z-index 军备竞赛。但使用 dialog 也不会自动完成可访问名称、初始焦点和归焦，这些由 WEB-01 承担。

#### 3. 层叠算法不只是选择器权重

**层叠（cascade）**选择同一属性的最终声明。简化的判断顺序是：匹配与条件 → 来源/重要性/层 → 优先级 → 作用域近接度→ 出现顺序。用户的 `!important` 可以胜过作者的 `!important`，这是可访问性定制的一部分；不要把“作者选择器越长越强”当成层叠全部。

#### 4. 三视口与竖排复测证据

- 分别在 320 / 768 / 1440 CSS px 截图，每个视口断言 `document.documentElement.scrollWidth === document.documentElement.clientWidth`；
- 保留弹层打开的键盘步骤，不只截空闲页面；
- 保存层叠上下文与 overflow 的 DevTools 证伪截图；
- 将 `writing-mode` 改为 `vertical-rl` 时，使用 `inline-size`、`block-size`、`margin-inline`、`inset-block-start` 等**逻辑属性（logical properties）**保持内容无溢出，并重做弹层截图。

## WEB-03

### 现代 CSS 架构、容器查询与渐进增强

#### 1. 视口问题和容器问题不是一件事

**媒体查询（media query）**通常根据视口或设备特征选样式；**容器查询（container query）**根据组件所在查询容器的尺寸或状态选样式。同一页的主栏和侧栏即使共享视口，卡片可用空间也不同；这是容器查询最适合的边界。

```html
<section class="demo-frame demo-frame--narrow"><article class="course-card">...</article></section>
<section class="demo-frame demo-frame--wide"><article class="course-card">...</article></section>
```

```css
@layer reset, components, utilities;

@layer reset {
  *, *::before, *::after { box-sizing: border-box; }
}

@layer components {
  .demo-frame {
    container: course / inline-size;
    border: 1px solid currentColor;
  }
  .demo-frame--narrow { inline-size: 240px; }
  .demo-frame--wide { inline-size: 480px; }

  /* 基线：不支持容器查询时仍是可读的单列 */
  .course-card {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
    padding: 1rem;
  }

  @container course (min-width: 30rem) {
    .course-card { grid-template-columns: minmax(0, 2fr) minmax(8rem, 1fr); }
  }
}

@layer utilities {
  .visually-hidden { /* 可访问隐藏工具 */ }
}
```

要查询尺寸，祖先必须用 `container-type:inline-size` 或等价简写建立包含上下文。`@container` 默认查询最近的合格祖先，用 `container-name` 可避免嵌套组件误选容器。

注意：30rem 在默认 16px 根字号下是 480px。因此固定 480px 容器若应进入宽布局，查询可以用 `(min-width: 480px)` 或把阈值稍降为 `29rem`，必须通过实际 computed size 验证边界是否包含等号。挑战中不允许“设计稿看起来应该触发”。

#### 2. 级联层把架构顺序从选择器权重中抽出来

**级联层（cascade layer）**用 `@layer` 显式定义作者普通声明的层顺序。`@layer reset, components, utilities;` 在首次声明时固定顺序；对普通声明，后层胜前层，层之间先比层顺序，再在同层内比优先级。

两个常见陷阱：

1. 已建立的层名后续重复打开只是追加规则，不会改变层顺序；
2. 不属于任何层的作者普通样式会位于所有命名层之后，可能意外压过 utilities。

因此“utility 层覆盖组件色”应先检查全局层顺序是否真为 `reset,components,utilities`，再查覆盖规则是否其实在层外；不要一开始就增加 `!important`。

#### 3. 渐进增强从可用基线开始

**渐进增强（progressive enhancement，渐进式增强）**是先交付所有目标环境可完成核心任务的 HTML/CSS 基线，再对支持环境增加更好布局或动效。它不是“旧浏览器可以空白”。

```css
/* 不支持时已有单列基线 */
.course-card { display: grid; grid-template-columns: 1fr; }

@supports (container-type: inline-size) {
  .demo-frame { container-type: inline-size; }
  @container (min-width: 29rem) {
    .course-card { grid-template-columns: 2fr 1fr; }
  }
}

@media (prefers-reduced-motion: no-preference) {
  .course-card { transition: transform 180ms ease; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

`CSS.supports("container-type: inline-size")` 可以记录能力，但不必用 JS 重复维护卡片布局状态。CSS 能根据容器尺寸、用户 reduced-motion 和打印媒体自己解决的问题，不应改成轮询尺寸的脚本；身份、权限、远程数据和持久业务状态仍由 JS/服务端管理。

#### 4. 高级能力的边界

- `@scope` 缩小选择器匹配与层叠竞争，不是安全隔离；
- `content-visibility` 可跳过屏外渲染，但要验证搜索、焦点、打印和可访问树；
- Anchor Positioning（锚点定位）与 Scroll-driven Animations（滚动驱动动画）只做支持矩阵/版本核验，不得成为弹层位置或阅读内容的唯一路径；
- 现代颜色函数仍要验证对比度、强制颜色模式与打印；
- Subgrid（子网格）让嵌套网格沿用父网格轨道，它解决对齐，不解决数据边界。

挑战交付必须包含 240px / 480px 两容器截图、层顺序说明、支持与不支持容器查询的记录、键盘与打印路径、reduced-motion 证据。复测只改容器从 480px 到 240px，DOM 与数据不变；如果结果依赖页面视口变化，就说明误用了媒体查询。
