# 能力不同，用户仍要完成同一个任务

## COMPAT-01 Baseline、渐进增强与跨浏览器真机测试

一个表单在开发者电脑上很好用，客户却说侧栏展开后内容被截断。团队查到 ResizeObserver 已经广泛可用，于是认定不是兼容问题。后来才发现，客户宿主关闭了这个 API，而页面把所有布局更新都放进了观察器回调。

兼容工作要连接三个问题：承诺支持谁，没有增强时还能做什么，以及靠什么证据证明任务可用。本篇以能切换能力、保留输入的页面为主线，解释 Baseline、能力检测、渐进增强和验证分工。本站仍面向桌面；涉及移动设备的机制会讲清，但桌面实验不能代替移动真机结论。

### 学习前先确认

- 直接前置：[TEST-03 端到端、视觉回归、隔离与稳定性](../chinese-guides/test-03-e2e-visual-regression-isolation-flakiness.md#test-03)。理解自动化结果需要对应具体环境与隔离数据。
- 直接前置：[WEB-03 现代 CSS 架构、容器查询与渐进能力](../chinese-guides/web-03-modern-css-architecture-container-progressive.md#web-03)。理解基础样式、增强规则和容器空间。

### 一、先承诺任务，再确定支持范围

假设产品的核心任务是填写说明、查看预览、提交并获知结果。自动调整预览、动画和快捷键都可以增强体验，但它们失败时不能删掉输入或让提交永久无响应。先区分核心任务与附加体验，才知道哪些差异可以接受。

**支持矩阵（Support Matrix）**把任务与目标环境连在一起，说明必须通过、允许降级以及尚未验证的范围。浏览器名称只是其中一列，还需要版本、系统、设备、输入法、辅助技术、网络与关键能力。矩阵的依据可以是客户合同、受管设备清单和真实使用分布，不能只写开发团队手头有什么。

下面是桌面表单项目的教学矩阵，版本字段应在真实运行时填写，不把“最新”当作以后可复现的版本号。

| 目标环境 | 核心承诺 | 差异分支 | 需要留下的证据 |
| --- | --- | --- | --- |
| Windows 的受管 Chromium 浏览器 | 编辑、键盘操作、提交反馈 | 扩展或企业策略限制能力 | 系统与浏览器版本、任务结果 |
| macOS Safari | 同一表单可完成 | 布局、权限和系统输入 | 实际 Safari 版本、截图与事件记录 |
| Firefox 桌面版 | 同一表单可完成 | 样式与事件行为 | 构建版本、核心断言与错误 |
| 目标环境禁用 ResizeObserver | 输入不丢，可手动更新 | 降级分支 | 禁用方式、提示和操作结果 |

这里没有承诺移动端。若一个 H5 产品确实面向 iOS Safari、Android Chrome 或 WebView，就要添加对应系统、浏览器与真实设备证据。不能从桌面缩放、UA 字符串或浏览器品牌推断设备上的具体引擎、系统策略和输入行为，应记录实测组合。

### 二、Baseline 提供平台信号，不代替项目验收

**Baseline**描述 Web 平台功能在核心浏览器集合中的支持情况。按 2026-10-07 核对的官方定义，Newly available 表示核心集合均已支持；从这个时间点经过 30 个月，进入 Widely available。核心集合包含 Chrome 桌面与 Android、Edge、Firefox 桌面与 Android、Safari macOS 与 iOS。

因此“广泛可用”并不是“全世界所有设备都有”。嵌入式宿主、冻结旧版本、辅助技术、权限策略和已知实现缺陷都可能不被这一个标签解释。Baseline 是选技术和制定构建目标时的起点，项目矩阵才是对用户的承诺。

例如某功能刚进入 Newly available，你可以根据用户分布决定暂时只用于增强；若核心流程必须依赖它，就需要相应最低版本、替代路径和验证。也不能把一个大 API 家族的标签扩张到所有方法、选项与组合行为。应查看具体特性、兼容表注释和查询日期。

构建工具使用的浏览器目标也不等于 Baseline 自动生效。语法转换、CSS 处理、API polyfill 是不同工作。选择一个目标后，应检查产物实际包含什么转换，不能只看到配置写了年份就认定全部运行时能力都被补齐。

### 三、先安排失败时仍能使用的路径

**渐进增强（Progressive Enhancement）**是先提供可用的基础任务，再在能力满足时增加体验。基础不一定意味着每个复杂应用都能无 JavaScript 工作，但应说明依赖和失败界限。例如真实链接不依赖动画完成导航，原生表单可以由服务端接收，再增加客户端异步反馈。

ResizeObserver 观察元素尺寸变化，它比 window resize 更适合侧栏、字体或父容器变化。替代方式也不是简单把回调搬到窗口事件：侧栏变窄可能没有窗口 resize。若只需要排版，应优先让 CSS 自动布局；确实需要读尺寸时，可以提供手动更新，并说明什么变化不会自动检测。

**能力检测（Feature Detection）**检查当前环境提供的能力，例如构造器是否存在、CSS.supports 是否接受某声明。它比按 UA 猜测更接近实际条件，但属性存在仍不保证权限、配额、构造和后续调用成功。因此“检测存在”和“处理执行失败”要同时做。

语法、CSS 和 API 还有不同失败阶段。新 JavaScript 语法若在解析时失败，写在同一脚本后面的 if 根本来不及运行；需要符合目标的构建产物或独立加载分支。未知 CSS 声明通常被忽略，可先写基础声明再增强。API 缺失适合运行时判断，权限拒绝则要在具体动作失败时解释。把三者混成一个 UA 分支会漏掉真正原因。

### 四、运行一个可以关闭增强而不丢输入的页面

保存下面完整页面为 `compat-lab.html`，使用现代桌面浏览器打开即可，无依赖、无网络请求。它只提供本地编辑和预览，**没有服务端保存**。若需要部署表单，应另接真实提交与结果确认；这里不会用一个本地提示冒充保存成功。

```html example=compat01-fallback-lab runtime=project file=compat-lab.html
<!doctype html>
<html lang='zh-CN'>
<meta charset='utf-8'>
<meta name='viewport' content='width=device-width, initial-scale=1'>
<title>兼容与输入保留实验</title>
<style>
  * { box-sizing: border-box; }
  body { max-width: 850px; margin: 32px auto; padding: 0 20px;
    font: 18px/1.65 system-ui; color: #17283a; background: #f4f7fb; }
  label { display: block; margin: 12px 0; }
  button, select, textarea { font: inherit; }
  button { margin: 6px 8px 6px 0; }
  textarea { width: 100%; min-height: 130px; }
  #card { width: 620px; max-width: 100%; min-width: 0;
    padding: 18px; background: white; border: 1px solid #8095ab; }
  #preview { white-space: pre-wrap; overflow-wrap: anywhere; }
  :focus-visible { outline: 3px solid #1263d6; outline-offset: 3px; }
</style>
<h1>能力变化，输入继续保留</h1>
<p>本地模拟，不向服务端保存。尺寸增强失败时仍可编辑和手动更新。</p>
<label>增强模式
  <select id='mode'>
    <option value='auto'>自动检测</option>
    <option value='off'>模拟能力缺失</option>
    <option value='fail'>模拟初始化失败</option>
  </select>
</label>
<label>内容容器宽度
  <select id='width'><option value='620'>620 像素</option><option value='360'>360 像素</option></select>
</label>
<button id='toggle' type='button'>关闭编辑区</button>
<p id='status' role='status'>等待脚本初始化；仍可填写文本。</p>
<p id='metrics'>活动观察器：0；本轮回调：0</p>
<section id='panel'>
  <form id='form'>
    <div id='card'>
      <label for='draft'>说明草稿</label>
      <textarea id='draft' name='draft'>侧栏变化以后，这段输入应该保留。</textarea>
      <p id='preview'>点击预览查看当前文本。</p>
    </div>
    <button id='show' type='submit' disabled>预览当前文本</button>
    <button id='measure' type='button' disabled>手动更新尺寸</button>
    <p id='size'>尚未测量</p>
  </form>
</section>
<script>
  const el = id => document.getElementById(id);
  const mode = el('mode'), panel = el('panel'), card = el('card');
  const draft = el('draft'), metrics = el('metrics');
  let observer = null, generation = 0, calls = 0, composing = false;
  function report() {
    metrics.textContent = `活动观察器：${observer ? 1 : 0}；本轮回调：${calls}`;
  }
  function measure() {
    if (!panel.hidden) el('size').textContent = `边框盒宽度：${Math.round(card.getBoundingClientRect().width)} 像素`;
  }
  function stop() {
    generation++;
    observer?.disconnect();
    observer = null;
    calls = 0;
    report();
  }
  function start() {
    stop();
    if (panel.hidden) return;
    measure();
    const current = generation;
    if (mode.value === 'off' || typeof window.ResizeObserver !== 'function') {
      el('status').textContent = '手动模式：可以编辑，尺寸变化后请手动更新。';
      return;
    }
    try {
      if (mode.value === 'fail') throw new Error('synthetic-init-failure');
      observer = new ResizeObserver(() => {
        if (current !== generation || panel.hidden) return;
        calls++;
        measure();
        report();
      });
      observer.observe(card);
      el('status').textContent = '自动模式：观察内容容器的尺寸变化。';
      report();
    } catch {
      stop();
      el('status').textContent = '增强初始化失败，已转为手动模式；草稿仍然保留。';
    }
  }
  draft.addEventListener('compositionstart', () => { composing = true; });
  draft.addEventListener('compositionend', () => { composing = false; });
  el('form').addEventListener('submit', event => {
    event.preventDefault();
    if (composing) {
      el('status').textContent = '请先完成输入法选词，再预览。';
      return;
    }
    el('preview').textContent = draft.value;
  });
  el('measure').addEventListener('click', measure);
  mode.addEventListener('change', start);
  el('width').addEventListener('change', event => {
    card.style.width = `${event.target.value}px`;
  });
  el('toggle').addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    el('toggle').textContent = panel.hidden ? '重新打开编辑区' : '关闭编辑区';
    if (panel.hidden) {
      stop();
      el('status').textContent = '编辑区已关闭，草稿保留在本页内存中。';
    } else {
      start();
      draft.focus();
    }
  });
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', start);
  el('show').disabled = false;
  el('measure').disabled = false;
  start();
</script>
</html>
```

先填写一段独特文本并点击预览，再将容器从 620 改为 360 像素。自动模式下尺寸文字会更新，输入不会重置。回调次数可能受布局与浏览器调度影响，不应断言固定数值。测量结果写在容器之外，也没有在观察回调中修改被观察对象的宽度，避免用自身更新反复触发测量。

然后选择“模拟能力缺失”，再改变宽度。CSS 仍会重排，尺寸文字暂时保持旧值，点击“手动更新尺寸”后才更新。这个变化揭示了降级范围：阅读与编辑可用，自动测量被替换为明确的手动操作。模式开关只改变本示例分支，不删除浏览器全局 API，不能据此宣称所有 API 缺失问题都测过了。

再选择“模拟初始化失败”。这是合成异常，不代表发现真实浏览器缺陷。观察器会被断开，用户看到手动提示，草稿仍可预览。最后关闭、重新打开编辑区，确认文本与预览保留；关闭时活动观察器为 0，重新打开按当前模式建立新观察。generation 使旧回调失去更新资格，disconnect 负责停止观察，两者承担不同职责。

这里保留的是同一页面中同一个 textarea 节点，并不保证刷新、进程终止或跨设备后恢复。pagehide 清理资源，pageshow 按当前状态恢复；这也适用于从往返缓存返回的恢复入口。计数归零仅说明本例登记的观察器已清理，完整内存审计仍需检查其他引用与资源，见 [PERF-04](../chinese-guides/perf-04-memory-listeners-resource-leaks.md#三比较相同生命周期位置才有意义)。

### 五、中文输入要区分选词过程与提交意图

中文 IME 输入时，用户可能先输入拼音，再选择候选，最后才得到确认文字。compositionstart 到 compositionend 之间是组合过程；键盘上的一次 Enter 可能只是在确认候选，而不是要求提交表单。逐次 keydown 过滤字符、强制格式化或发请求，容易造成少字和重复操作。

本例使用原生 textarea 保留文本，不在每次输入时重建节点，也没有把 Enter 绑定成发送。预览只响应显式提交，并在组合状态中暂缓。这个选择让例子容易推理，但不等于覆盖所有受控组件、搜索框、快捷发送和浏览器事件差异。

若产品确实需要“回车发送”，应结合组合状态、KeyboardEvent.isComposing 和目标环境的实测事件顺序设计。历史边界可能需要受限补丁，不能把 keyCode 数字或 UA 猜测当成通用 IME 模型。compositionend 后还可能有 input，搜索更新需按当前值去重；自动化派发组合事件只证明程序分支，不等于真实输入法体验。

复现时记录系统、浏览器、输入法和步骤：输入拼音、切换候选、Enter 确认、继续编辑、粘贴、撤销及主动提交。若框架受控输入导致光标跳动，还应检查节点身份、值回写和批处理时序。不要看到某浏览器首先暴露问题，就跳过组件自己的状态模型。

### 六、布局与弱网差异要沿现象找原因

内容溢出常来自 Flex/Grid 子项的最小内容尺寸、长文本和错误滚动容器，而不一定是浏览器缺陷。先比较 DOM、computed style 和实际盒子，再决定是否需要 `min-inline-size: 0`、换行或调整轨道。容器查询适合纯布局增强，已有解释见 [WEB-03](../chinese-guides/web-03-modern-css-architecture-container-progressive.md#容器查询读取的是哪一个祖先)。

可用目标是文字可读、操作可见、焦点清楚和任务连续。200% 缩放、长文本和字体变化能暴露内容约束；阴影和字形并不要求像素一致。未知 CSS 声明被忽略时，前面的基础样式应仍可用。API polyfill 也不会自动补上原生权限、系统交互或同样的性能。

弱网则改变资源到达顺序。400 kbps 只是带宽条件，还需说明延迟、缓存、丢包、离线和请求类型。实验页面没有网络，因此不能证明网络降级。真实表单应在增强脚本慢到时保留输入，提交超时时区分未发送、处理中与结果未知；副作用操作不能因超时就盲目重试，先使用幂等标识或查询结果。

对于移动 H5，软键盘、视觉视口、触摸滚动、后台恢复和系统权限进一步改变行为。桌面 viewport 仿真不会产生真实软键盘、触摸硬件和内存压力。相关机制见 [H5-02](../chinese-guides/h5-02-scroll-soft-keyboard-pointer-gestures.md#六软键盘改变什么先测可见边界)。是否支持这些组合应由产品矩阵决定，不把知识讲解扩张成本站的移动界面承诺。

### 七、让每层验证只证明自己覆盖的条件

多引擎自动化可以使用 Playwright projects 在 Chromium、Firefox 和 WebKit 上执行同一任务，固定版本、数据、语言、权限和时区，保留失败 trace 与截图。优先断言用户结果，例如输入未丢、预览与当前文本一致、能力关闭后可手动完成；不要把内部 class 名当成业务承诺。

Playwright 的 WebKit 来自带测试补丁的 WebKit 构建，不直接运行品牌 Safari；系统媒体、输入和浏览器集成也可能不同。项目名叫 Desktop Safari 或 Mobile Safari 不会改变这一事实。它能提前发现引擎差异，但不能把一次通过写成 Safari 真机全部通过。

真机补充自动化不易覆盖的真实输入法、软键盘、系统分享、辅助技术、设备资源与宿主策略。选择使用量高、失败损失大或变化风险高的组合，无需穷举设备。记录型号、系统、浏览器、输入法、构建、网络条件、操作步骤和结果，让别人可以解释证据的适用范围。

当前只有一个桌面浏览器时，可以先验证普通路径、禁用增强、初始化失败和输入保留，并明确其他引擎与设备待核对。模拟按钮和本地计数给出的结论应写成“本实验分支符合预期”，不能变成“跨浏览器兼容性已完成”。有实际差异时再增加针对性验证，避免无目标地扩展整套矩阵。

### 八、修复之后还要知道何时可以删除兼容层

发现差异先缩成最小页面，保存预期行为、实际行为、目标版本和输入。判断是项目假设、框架处理、规范允许差异还是引擎缺陷；优先修复共享逻辑，然后考虑能力分支。只有确实无法用能力或行为检测表达时，才使用范围很窄的 UA workaround。

临时补丁要有 owner、上游问题入口、影响版本与删除条件。未来引擎修复后，在相同场景关闭补丁比较结果，再删除；如果用户合同要求长期保留，就把它变成正式维护路径。没有触发条件的“暂时处理 Safari”会逐渐成为无法解释的全局规则。

发布后按支持范围观察核心任务成功、错误和回退使用，样本太少时保留不确定性。若增强导致故障，可以先关闭增强并保留基础任务。删除回退前则核对目标用户、合同和监测，不能因为 Baseline 标签变化就自动撤销支持承诺。兼容策略最终应与 [ARCH-01 的质量场景](../chinese-guides/arch-01-quality-attributes-constraints-tradeoffs.md#二把更快更稳定写成可以被推翻的场景)保持一致。

### 带着问题回看

1. Baseline Widely available 为什么不能证明受管宿主一定提供该 API？
2. 实验关闭自动观察以后，什么仍然成立，什么变成手动操作？
3. disconnect 与 generation 各解决什么？活动计数归零还不能证明什么？
4. WebKit 自动化、模拟组合事件和真实 Safari 中文输入分别提供什么证据？

### 参考与延伸阅读

核验日期：2026-10-07。具体浏览器版本和实际测试日期应另行登记。

- [Web Platform Baseline](https://web.dev/baseline/)与 [MDN 的适用边界](https://developer.mozilla.org/en-US/docs/Glossary/Baseline/Compatibility)：核对核心集合、阶段与未覆盖范围。
- [MDN ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver)：查尺寸观察、循环问题、方法和兼容信息。
- [MDN 特性检测](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Testing/Feature_detection)：区分能力检查和 UA 推断。
- [MDN isComposing](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/isComposing)：查询键盘事件中的组合状态含义，实际输入顺序仍须实测。
- [Playwright 浏览器说明](https://playwright.dev/docs/browsers)：核对项目配置和 WebKit 与品牌 Safari 的区别。
