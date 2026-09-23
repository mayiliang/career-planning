# Web 可访问性学习资料

## A11Y-01 让用户顺利完成操作

想象你正在修改一份资料的标题：输入有误时，页面只把边框变红；保存后，右上角闪过一条提示；打开帮助面板后，Tab 却跳到了背后的列表。鼠标用户也许能靠位置猜出下一步，使用键盘或屏幕阅读器的人却可能不知道发生了什么。

可访问性要解决的，就是这些操作过程中的断点。本篇从“修改标题、调整阅读顺序”这两个小任务出发，把规范、HTML、焦点、错误和状态通知连起来。读完后，你应能说清一个界面为什么可用，以及现有证据还没有覆盖什么。

### 学习前先确认

- 直接前置：[WEB-01 HTML 语义、表单与可访问性基础](../chinese-guides/web-01-html-semantics-forms-accessibility.md#web-01)。需要认识 label、button、表单和基本焦点顺序。

本篇围绕桌面浏览器、键盘和阅读辅助工具展开。桌面放大文字后仍能操作，同样是阅读质量的一部分。

### 一、从完整任务找到障碍

**可访问性（Accessibility）**关注用户能否感知信息、执行操作、理解结果并从错误中恢复。它不是某个群体专用的一套皮肤，也不是加上几个 ARIA 属性后获得的永久状态。

把“修改资料标题”拆成五步，会比逐个数按钮更容易发现问题：找到编辑入口，理解当前值，输入新值，处理错误，确认保存结果。每一步都要有可以辨认的内容和可以执行的操作。

| 任务步骤 | 具体障碍 | 可以观察的改进 |
| --- | --- | --- |
| 找到编辑 | 三个图标都叫“操作” | 名称包含动作和对象，例如“编辑渲染笔记” |
| 输入标题 | placeholder 消失后不知道字段用途 | 输入框始终有可见 label |
| 处理错误 | 只有红框，原因不明 | 明说“请填写标题”，并关联到输入框 |
| 确认保存 | 提示消失太快，焦点又被抢走 | 保留结果文字，节制通知，不强行移动焦点 |
| 调整顺序 | 只能精确拖到一条细线 | 提供调用同一排序逻辑的移动按钮 |

这里检查的是路径是否连贯。某个按钮有名称，并不能证明用户能走完路径；一次成功保存，也不能证明失败后仍能继续。

### 二、读懂 WCAG 的层次与边界

**WCAG** 是 Web Content Accessibility Guidelines 的缩写。四项原则可以记成四个问题：看得到或听得到吗，操作得了吗，理解得了吗，浏览器与辅助技术能正确解释吗。A、AA、AAA 是符合级别；声称 AA，涉及适用的 A 与 AA 成功准则，不能只挑几个容易通过的项目。

规范正文描述要求，Understanding 文档解释意图和例外，APG 则给出常见控件的交互模式。三者用途不同：照抄一个 APG 示例，不会自动证明整页符合 WCAG。

下面是查阅索引，实施时仍要读对应条目的完整条件：

| 页面现象 | 先查什么 | 不要误读成什么 |
| --- | --- | --- |
| 不能用键盘保存 | 2.1.1 Keyboard（A） | “能 Tab 到按钮”就足够，还必须能激活 |
| 焦点看不见 | 2.4.7 Focus Visible（AA） | 只要存在 outline 声明就通过 |
| 固定栏完全盖住焦点控件 | 2.4.11 Focus Not Obscured, Minimum（AA） | 最低项要求不能完全遮挡，不等于最佳体验只需露出一点 |
| 拖动才能排序 | 2.5.7 Dragging Movements（AA） | 仅补键盘操作就满足单指针的非拖动路径 |
| 密集的小图标难以点击 | 2.5.8 Target Size, Minimum（AA） | 所有控件一律必须 44 px |
| 保存结果无法获知 | 4.1.3 Status Messages（AA） | 所有 DOM 变化都必须播报 |

2.5.8 的一般尺寸门槛为 24 × 24 CSS px，并有间距、等价操作、行内内容等条件或例外。它与 AAA 的 44 × 44 目标尺寸要求不同。桌面工具条也会遇到精细定位困难，不能用“不支持手机”跳过这个问题。

符合性还涉及完整页面和完整流程。团队可以记录“本次检查桌面编辑流程，发现两项问题”，不要把它写成“整个系统已符合 WCAG 2.2 AA”。范围清楚，结论才有意义。

### 三、名称、角色和状态要与可见界面一致

**无障碍树（Accessibility Tree）**是浏览器提供给辅助技术的语义结构。它由 DOM、样式、原生语义与 ARIA 等共同影响，不是 DOM 的逐字复制。检查时可先看四件事：叫什么、是什么、当前值是什么、处于什么状态。

例如 `<button>保存标题</button>` 自带按钮角色和键盘激活行为；`<div role="button">保存标题</div>` 只是声明了角色，焦点、Space/Enter 与禁用处理仍然缺失。原生元素让代码与用户的既有习惯更容易对上。

名称优先使用可见文本或 label。一个写着“保存标题”的按钮若加上 `aria-label="确认"`，计算名称可能变成“确认”，语音控制用户按屏幕文字说“点击保存标题”就可能遇到困难。确实需要额外信息时，先想它是名称的一部分，还是应该放在 `aria-describedby` 指向的说明里。

`hidden`、`display: none` 会让普通内容退出显示与无障碍树；视觉隐藏的说明文字则可以留在树中。不要给仍可聚焦的控件设置 `aria-hidden="true"`：键盘能到达，语义却被藏掉，会形成两套互相矛盾的界面。

### 四、亲手操作一个有错误恢复的资料页

把下面完整内容保存为 `accessible-editor.html`，用桌面浏览器打开。示例只修改本页内存，刷新后恢复原样。“应用标题”特意不用“已保存到服务器”，避免让界面暗示并不存在的持久化。

先清空标题再提交，观察错误与焦点；填入“渲染笔记”后提交；最后把第二项上移。操作过程中也可以完全使用 Tab、Shift+Tab、Enter 和 Space。

```html example=a11y-editor runtime=project file=accessible-editor.html
<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<title>资料编辑与阅读顺序</title>
<style>
  body { max-width: 52rem; margin: 3rem auto; padding: 0 2rem;
    font: 18px/1.7 system-ui; color: #172d3c; background: #f6f8fa; }
  form, section { background: white; padding: 1.5rem; border: 1px solid #8e9daa;
    border-radius: .75rem; margin-block: 1.5rem; }
  input, button { font: inherit; padding: .5rem .8rem; }
  input { display: block; max-width: 100%; box-sizing: border-box; }
  button { color: #172d3c; background: #edf3f8; border: 1px solid #637786;
    border-radius: .3rem; cursor: pointer; min-height: 2.5rem; }
  :focus-visible { outline: 3px solid #005fcc; outline-offset: 4px; }
  [aria-invalid="true"] { border: 2px solid #a01627; }
  #error { color: #a01627; }
  li { margin-block: 1rem; }
  @media (forced-colors: active) { button, input { border: 1px solid ButtonText; } }
</style>
<main>
  <h1>资料编辑</h1>
  <p>这是本地演示；刷新后恢复。当前标题：<strong id="current">浏览器笔记</strong></p>
  <form id="editor" novalidate>
    <label for="title">资料标题（必填）</label>
    <input id="title" value="浏览器笔记" required aria-describedby="hint">
    <p id="hint">填写能区分这份资料的名称。</p>
    <p id="error" hidden></p>
    <button type="submit">应用标题</button>
  </form>
  <section aria-labelledby="order-heading">
    <h2 id="order-heading">阅读顺序</h2>
    <p>上移按钮提供无需拖动的排序方式，第一项保持不动。</p>
    <ol id="reading-list">
      <li data-name="HTML"><span>HTML</span> <button type="button">上移 HTML</button></li>
      <li data-name="浏览器"><span>浏览器</span> <button type="button">上移浏览器</button></li>
    </ol>
  </section>
  <p id="notice" role="status" aria-atomic="true"></p>
</main>
<script>
  const byId = (id) => document.getElementById(id);
  const input = byId('title');
  const error = byId('error');
  const notice = byId('notice');
  byId('editor').addEventListener('submit', (event) => {
    event.preventDefault();
    const title = input.value.trim();
    if (!title) {
      error.textContent = '请填写资料标题，再应用修改。';
      error.hidden = false;
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', 'hint error');
      notice.textContent = '';
      input.focus();
      return;
    }
    input.removeAttribute('aria-invalid');
    input.setAttribute('aria-describedby', 'hint');
    error.hidden = true;
    byId('current').textContent = title;
    notice.textContent = `本页标题已更新为“${title}”。刷新后恢复。`;
  });
  const list = byId('reading-list');
  list.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('button');
    if (!button || !list.contains(button)) return;
    const item = button.closest('li');
    const previous = item.previousElementSibling;
    if (!previous) {
      notice.textContent = `${item.dataset.name}已在第一位。`;
      return;
    }
    list.insertBefore(item, previous);
    button.focus();
    const position = [...list.children].indexOf(item) + 1;
    notice.textContent = `${item.dataset.name}已移到第 ${position} 位。`;
  });
</script>
</html>
```

可以核对的结果是：空标题没有覆盖当前标题，输入框关联到错误说明；有效提交清除错误状态；“浏览器”上移后成为第一项，焦点留在刚才操作的按钮。状态区在页面加载时已经存在，后续只更新它的内容。

这里保留同一个排序节点，并显式恢复按钮焦点。若改成整段 `innerHTML` 重建，原按钮可能被销毁；即使视觉顺序正确，用户也可能失去当前位置。代码中的事件委托会在 [BROWSER-01](../chinese-guides/browser-01-render-events-storage.md#browser-01) 继续拆解。

### 五、焦点应跟随用户任务

**焦点管理（Focus Management）**首先是下一次键盘输入归谁处理。主动移动焦点应有理由：错误提交后帮助定位问题，打开模态框后进入新任务，删除当前项后找到仍存在的邻近位置。

| 发生什么 | 通常合理的落点 | 需要避免的行为 |
| --- | --- | --- |
| 单字段提交失败 | 错误输入框 | 跳到页面顶部，让用户重新搜索 |
| 多字段失败 | 有清楚链接的错误摘要或首个错误字段 | 每次输入一个字都强制聚焦摘要 |
| 打开短确认框 | 合适的按钮，破坏性操作常先放在较安全选项 | 不看内容就永远聚焦“删除” |
| 打开长说明框 | 可编程聚焦的标题或首段 | 首焦点把上方必要说明滚出视野 |
| 关闭框 | 仍存在的触发器；否则邻近任务入口 | 一律回到 body |

原生模态框的实现见 [WEB-04](../chinese-guides/web-04-native-layered-ui-view-transitions.md#web-04)。本篇先建立选择焦点的理由，再去理解浏览器如何协助实现。

不要用正数 `tabindex` 排整页顺序，也不要为了隐藏边框全局设置 `outline: none`。视觉顺序与 DOM 顺序错位，通常应回到结构或布局处理；可编程聚焦标题时使用 `tabindex="-1"`，不必让它挤进每轮 Tab。

### 六、错误要说明原因，也要给出下一步

“格式错误”没有告诉人怎么修改；“请输入标题，例如‘事件循环笔记’”则有明确动作。错误文案应描述当前输入的问题，不责怪用户。校验时机也影响体验：输入到一半就持续宣布错误，会让正常打字变成不断被打断的过程。

示例选择提交时校验空白值，失败后保留输入与错误；下一次有效提交才清除。真实系统有长度限制时，应说明按字符、码点还是字节计算，与服务器保持一致，而不是前端显示能保存，服务器却拒绝。相关边界可回看 [TEST-01 的规则与样例](../chinese-guides/test-01-test-design-oracles-properties-mutation.md#test-01)。

服务端保存失败是另一类问题。此时应保留草稿，说明“暂时未保存，可重试”，不能清空表单再显示红色通知。超时也不必然等于服务端未写入，需要根据操作标识查询结果；界面语言要与实际已知状态一致。

### 七、动态通知要少而清楚

**实时区域（Live Region）**让辅助技术在焦点不移动时获知重要状态。`role="status"` 隐含 polite 通知语义，适合结果数量、保存状态等。它不是可靠消息队列：连续更新可能合并或被跳过，相同文字再次写入也不保证重新宣读。

因此，正文每追加一个 token，不应就更新一次通知区。可以把视觉流、通知摘要和终止状态分开：正文逐步出现；通知表达“正在生成”或阶段摘要；完成时说明“生成完成，共三段”；失败或停止时给出可操作的结果。需要逐句朗读的产品，应提供明确的朗读控制，不把 live region 当作完整播放器。

`aria-atomic="true"` 表达变化时倾向呈现整段区域内容，不能保证读屏器收到严格相等的 N 次播报。验收应关注用户是否及时理解状态，记录实际播报和重复打断情况，不把 DOM 更新次数当成声音次数。

示例错误没有再加 `role="alert"`：聚焦错误输入并读取关联说明，已经是一条通知路径。多个通知机制叠加，可能把同一句错误讲两遍。只有确实需要立即打断当前阅读的消息，才谨慎选择 assertive 或 alert。

### 八、鼠标操作也需要宽容度

拖拽涉及按住、移动、越过目标再松开，对手部控制和精确定位要求较高。上移按钮同时提供键盘与单指针点击路径；两条入口最终应该调用同一个排序函数，避免出现拖拽与按钮排序结果不同的问题。

若一张卡片既能打开详情，又在右上角放删除按钮，应检查两个实际点击区域是否重叠。把删除图标的伪元素扩大后盖住标题，不是改进目标尺寸，而是制造误操作。

快捷键是可以学习的增强。用单字符全局触发动作时，考虑关闭、重映射或仅在相关控件聚焦时启用；否则用户使用语音输入、在编辑器里打字时也可能触发操作。可见按钮仍应存在，方便发现和恢复。

### 九、等价信息取决于图片的用途

同一张柱状图出现在不同位置，替代信息会不同。如果它只是装饰，空 `alt` 可以避免多余朗读；如果正文借它论证“失败集中在资源加载阶段”，只写“柱状图”就丢掉了结论。

一个更完整的图表可以有：简短名称、正文中的主要发现、包含数据与单位的表格。三者最好来自同一份数据，避免图改了，描述还停留在旧版本。按钮里的图标若旁边已有文字，图标通常无需重复贡献名称。

视频中的对白需要字幕，纯音频可以提供转写；仅靠画面表达的步骤还需要可理解的文字或音频说明。自动生成的字幕、替代文本应核对人名、数字和术语。输出看似通顺，并不能证明它与媒体事实一致。

### 十、桌面放大与用户偏好也是正常使用

用户在大屏上放大页面、使用高对比度主题或减少动画，都属于正常桌面场景。对主要按竖直方向阅读的内容，重排要求涉及相当于 320 CSS px 的可用宽度；宽度 1280 CSS px 的窗口以 400% 放大是常见检查方式，数据表等确需二维布局的内容有相应例外。缩窄窗口有助于发现布局问题，但不等于完成了真实浏览器缩放检查。

普通文本通常需要至少 4.5:1 的对比度，大文本通常是 3:1；控件边界和状态等还要按非文本对比度条目判断。不要把不同对象混成一条“全页面都按某个比例”的规则，也不能只靠颜色区分错误。

**减少运动（Reduced Motion）**偏好提醒我们保留结果、去掉不必要的运动。若禁用动画后卡片永远透明，说明业务可见性错误地依赖了动画结束回调。CSS 与长内容的细节接到 [WEB-02](../chinese-guides/web-02-layout-cascade-responsive-logical-properties.md#web-02)，具体过渡实现接到本批最后一篇。

### 十一、每种检查只能支持相应结论

自动扫描适合找到缺名称、部分 ARIA 错误等可规则化问题。无障碍树检查能确认浏览器计算出的语义；键盘走查能发现无法退出和焦点丢失；真实屏幕阅读器才让你听见实际措辞、停顿和导航体验。

用本文示例做一次小范围记录即可：浏览器与系统版本、操作步骤、焦点位置、输入名称与错误关系、实际播报。如果没有运行屏幕阅读器，就写“已检查 DOM 和键盘，实际播报待核对”。这比用一次扫描分数概括所有情况更有帮助。

检查的重点可以放在最重要的用户路径和高复用组件上。无需为每段文案维护一套庞大测试，但修复了弹框无法退出的问题，至少应有能再次发现该行为的回归依据。如何选择证据可继续看 [TEST-02](../chinese-guides/test-02-component-testing-user-behavior-accessibility.md#test-02)。

### 十二、把一次修复变成团队可复用的约定

**可访问性治理（Accessibility Governance）**可以从一份短而明确的组件说明开始：按钮叫什么，Tab 怎么走，打开和关闭后焦点在哪，忙碌或失败时怎样提示。设计稿、实现与评审都围绕同一份约定讨论，问题才不会在每个页面重新出现。

例如“编辑面板关闭后焦点丢失”的修复记录，可以写：影响键盘编辑流程；关闭时回到触发器，触发器删除时回到列表标题；组件负责人负责修复；下一次改动保留这两条操作证据。临时例外则补上替代路径、责任人、到期时间与复查条件。不要用一张长期无人维护的例外表掩盖尚未解决的阻断。

发布优先级按任务影响决定：登录或保存无法操作，应优先处理；一个次要图标的细微问题可以进入有期限的后续工作。修复代码少不等于用户影响小。评审时把问题写成触发条件、后果与修改请求，可接着阅读 [CAREER-05](../chinese-guides/career-05-code-review-risk-communication.md#career-05)。

学完可以用三个反例检查理解：给 div 加角色为什么还不够；为什么状态区更新五次不能承诺播报五次；为什么拖拽只补键盘仍可能缺少单指针等价路径。能把答案落回用户正在做的事，比背一串属性更可靠。

### 参考与延伸阅读

审校日期：2026-09-14。以下分别用于核对要求、解释与交互模式；本页的资料编辑案例为独立教学示例。

- [W3C：WCAG 2.2](https://www.w3.org/TR/WCAG22/)：完整成功准则与符合性范围；可按上表编号查阅。
- [WAI：目标尺寸最低要求](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)：24 CSS px、间距与例外的解释。
- [WAI：焦点不被遮挡的最低要求](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)：区分最低条件与更好的体验。
- [WAI APG：模态对话框模式](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)：初始焦点、关闭与返回位置的选择。
- [MDN：ARIA live regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions)：通知区域、更新与辅助技术行为。
