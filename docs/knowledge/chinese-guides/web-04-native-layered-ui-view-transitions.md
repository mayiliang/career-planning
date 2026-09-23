# Web 平台交互学习资料

## WEB-04 用原生能力做好浮层与视图过渡

一个面板盖在页面上方，不代表它就是模态框；一段动画结束，也不代表数据保存成功。浮层和过渡之所以容易出错，是因为显示位置、交互范围、焦点、业务状态和历史记录常被揉进同一段代码。

本篇用一个桌面资料列表把它们拆开：工具面板用 popover，修改标题用 dialog，调整顺序时添加可关闭的 View Transition。然后再把同样的分工延伸到页面导航。

### 学习前先确认

- 直接前置：[BROWSER-01 渲染流水线、DOM 事件与存储](../chinese-guides/browser-01-render-events-storage.md#browser-01)。需要理解 DOM 修改、事件和浏览器绘制。
- 直接前置：[A11Y-01 WCAG 2.2、无障碍测试与工程治理](../chinese-guides/a11y-01-wcag-testing-governance.md#a11y-01)。焦点、名称、键盘和状态通知的选择依据在该篇解释。

### 一、先判断用户是在继续阅读还是进入新任务

| 用户想做什么 | 合适的基础形式 | 可以添加的增强 |
| --- | --- | --- |
| 查看几项工具，仍可操作背景 | 内联操作区 | 非模态 popover |
| 修改标题，明确应用或取消 | 表单 | modal dialog |
| 打开另一份资料 | 真实 href 链接 | 路由拦截、加载反馈、视图过渡 |
| 调整当前列表顺序 | 直接修改状态与 DOM | View Transition |

这里没有“所有浮层都选最新 API”的规则。原生元素帮你处理平台机制，任务语义仍由产品决定。一个只有两三个普通按钮的工具面板，保留 Tab 顺序就很好，不必加 `role="menu"` 后再承担方向键、Home/End 和焦点模型。

框架也不与原生能力冲突。React 或 Vue 负责状态和组合，最终仍可以渲染 button、dialog、真实链接。评判封装的依据，是最终行为与维护成本。

### 二、top layer 为什么能越过普通层级

**顶层（Top Layer）**是浏览器管理的特殊绘制层。通过 showModal 打开的 dialog、显示中的 popover 等可以进入它，摆脱普通祖先的裁剪和 z-index 竞争。

普通元素的 z-index 只在相关堆叠上下文中比较。一个低层父容器里的子元素即使写成 999999，也不意味着它能越过另一个更高的父上下文。这个问题的基础可接回 [WEB-02](../chinese-guides/web-02-layout-cascade-responsive-logical-properties.md#web-02)。

进入 top layer 不会把元素移出原来的 DOM 结构，继承、事件路径与业务所有权仍需要理解。它也不会自动赋予“必须先完成此任务”的语义：popover 就是非模态的，背景通常仍然可操作。

别把渲染层级当成权限边界。inert、顶层和隐藏元素都不能阻止服务器接受一个未授权请求，它们负责的是用户界面行为。

### 三、Popover 负责显示与轻触关闭

**Popover** 的 auto 模式提供浏览器管理的显示状态，以及外点或 Escape 等 light dismiss 行为。manual 模式由应用显式控制关闭，不应拿它做自动模式的等价替换。auto 模式可以有符合规则的嵌套关系，不能简单记成“全页永远只能有一个”。

声明式 `popovertarget` 把按钮与目标关联起来，浏览器可以据此处理相关展开关系与焦点导航。具体内容的名称和角色仍要合适。若是工具按钮组，就给区域一个可理解的标题，不要随意声明成菜单或对话框。

非模态面板通常不应锁住背景 Tab。关闭后的焦点也要看关闭原因：Escape 与工具操作完成后可以回到触发器；用户点击背景另一个输入框时，不应被无条件的 toggle 回调抢回去。

`beforetoggle` 与 `toggle` 适合观察开关状态，但连续快速切换可能合并通知。需要业务计数时记录用户操作本身，不能把每一个 toggle 事件当作绝不遗漏的操作账本。

### 四、Dialog 的模态来自 showModal

**Dialog** 的 `.show()` 是非模态显示，`.showModal()` 才建立模态行为并进入 top layer。直接添加 open 属性，也不等同于 showModal。

模态意味着背景交互被限制，焦点应留在当前任务范围内，并有可发现的退出方式。为 dialog 设置清楚的可访问名称，按内容选择初始焦点，提供可见取消按钮。关闭后返回仍存在的触发器；删除触发器的操作则要另选列表标题或邻近项目。

`method="dialog"` 表单可以关闭框并设置 returnValue，它本身不代表向服务器保存。真正的应用流程应等业务校验和提交结果；失败时保留草稿，取消与应用也不要使用含糊的同一个值。

不需要在 showModal 后手工给整个 body 设置 aria-hidden，那可能连框里的内容一起藏掉。浏览器提供的模态机制与自己维护的隐藏属性混用，很容易在关闭后留下不可操作的背景。

### 五、运行一个带基础路径的资料列表

保存为 `native-ui.html` 后打开。工具区在支持 popover 的浏览器中变成浮层；编辑区在支持 dialog 时变成模态表单。没有这些增强时，它们保持内联，仍能修改本页标题。所有修改只在内存里，刷新恢复。

“反转顺序”使用同一份更新函数。可以关闭动画、跳过正在进行的动画，或勾选“模拟重复名称”观察视觉准备失败。无论动画如何，成功的一次操作都只应把业务更新次数加一。

```html example=web-native-ui runtime=project file=native-ui.html
<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<title>原生浮层与资料顺序</title>
<style>
  body { max-width: 58rem; margin: 3rem auto; padding: 0 2rem;
    font: 18px/1.7 system-ui; color: #172d3c; background: #f6f8fa; }
  button, input { font: inherit; padding: .5rem .8rem; }
  button { margin: .3rem; border: 1px solid #637786; border-radius: .4rem;
    color: #172d3c; background: #edf3f8; }
  :focus-visible { outline: 3px solid #005fcc; outline-offset: 3px; }
  li, #editor, #tools { padding: 1rem; margin-block: 1rem;
    border: 1px solid #8e9daa; background: white; border-radius: .6rem; }
  li { list-style: none; } ul { padding: 0; }
  dialog { max-width: 36rem; max-height: 80vh; overflow: auto;
    border: 1px solid #637786; border-radius: .8rem; color: inherit; }
  dialog::backdrop { background: rgb(10 25 40 / .45); }
  #tools[popover] { max-width: 28rem; margin: auto; }
  #error { color: #a01627; }
  :root { view-transition-name: none; }
  ::view-transition-group(*) { animation-duration: .6s; }
  ::view-transition { pointer-events: none; }
  @media (prefers-reduced-motion: reduce) {
    ::view-transition-group(*) { animation: none; }
  }
</style>
<main>
  <h1>原生浮层与资料顺序</h1>
  <p>这是内存演示；刷新后恢复。<a href="#details">查看原生页内导航</a></p>
  <button id="tools-toggle" popovertarget="tools" hidden>阅读工具</button>
  <aside id="tools" aria-labelledby="tools-title">
    <h2 id="tools-title">阅读工具</h2>
    <button id="mark">标记稍后阅读</button>
    <p>这个区域是非模态的，背景仍可操作。</p>
  </aside>
  <p><a id="edit-link" href="#editor">编辑 a 号资料</a>
    <button id="edit" hidden>编辑 a 号资料</button></p>
  <ul id="list">
    <li data-key="a"><strong id="first-title">渲染笔记</strong></li>
    <li data-key="b">事件笔记</li><li data-key="c">存储笔记</li>
  </ul>
  <p><label><input id="motion" type="checkbox" checked>启用过渡</label>
    <label><input id="duplicate" type="checkbox">模拟重复名称</label></p>
  <button id="reverse">反转顺序</button><button id="skip" disabled>跳过动画</button>
  <p id="count">业务更新次数：0</p><p id="visual">尚未运行过渡</p>
  <section id="editor" aria-labelledby="editor-title">
    <h2 id="editor-title">编辑 a 号资料</h2>
    <form id="form">
      <label for="name">资料标题（必填）</label>
      <input id="name" value="渲染笔记" required>
      <p id="error" hidden></p>
      <button type="submit">应用到本页</button><button id="cancel" type="button" hidden>取消</button>
    </form>
  </section>
  <p id="status" role="status"></p>
  <section id="details"><h2>原生页内导航</h2><p>这个链接使用浏览器自己的定位与历史行为。</p></section>
</main>
<script>
  const el = (id) => document.getElementById(id);
  const tools = el('tools');
  if ('popover' in HTMLElement.prototype) {
    tools.setAttribute('popover', 'auto'); el('tools-toggle').hidden = false;
  }
  el('mark').onclick = () => { el('status').textContent = '本页已标记稍后阅读。'; };
  let dialog = null;
  if (typeof document.createElement('dialog').showModal === 'function') {
    dialog = document.createElement('dialog');
    dialog.setAttribute('aria-labelledby', 'editor-title');
    document.body.append(dialog); dialog.append(el('editor'));
    el('edit-link').hidden = true; el('edit').hidden = false; el('cancel').hidden = false;
    el('edit').onclick = () => {
      el('name').value = el('first-title').textContent;
      el('error').hidden = true; el('name').removeAttribute('aria-invalid');
      el('name').removeAttribute('aria-describedby');
      dialog.showModal(); el('name').focus();
    };
    el('cancel').onclick = () => dialog.close('cancel');
    dialog.addEventListener('close', () => { if (el('edit').isConnected) el('edit').focus(); });
  }
  el('form').noValidate = true;
  el('form').onsubmit = (event) => {
    event.preventDefault();
    const title = el('name').value.trim();
    if (!title) {
      el('error').textContent = '请填写标题后再应用。'; el('error').hidden = false;
      el('name').setAttribute('aria-invalid', 'true');
      el('name').setAttribute('aria-describedby', 'error'); el('name').focus(); return;
    }
    el('first-title').textContent = title;
    el('error').hidden = true; el('name').removeAttribute('aria-invalid');
    el('name').removeAttribute('aria-describedby');
    dialog?.close('applied'); el('status').textContent = `本页标题已更新为“${title}”。`;
  };
  let commits = 0;
  let transition = null;
  el('skip').onclick = () => transition?.skipTransition();
  el('reverse').onclick = async () => {
    const button = el('reverse');
    button.disabled = true; el('motion').disabled = true; el('duplicate').disabled = true;
    let committed = false;
    const updateOnce = () => {
      if (committed) return;
      committed = true;
      el('list').append(...[...el('list').children].reverse());
      el('count').textContent = `业务更新次数：${++commits}`;
    };
    const useMotion = el('motion').checked && !matchMedia('(prefers-reduced-motion: reduce)').matches
      && typeof document.startViewTransition === 'function';
    for (const item of el('list').children) {
      item.style.viewTransitionName = el('duplicate').checked ? 'same-note' : `note-${item.dataset.key}`;
    }
    try {
      if (!useMotion) {
        updateOnce(); el('visual').textContent = '直接更新，无动画。';
      } else {
        try { transition = document.startViewTransition(updateOnce); }
        catch {
          updateOnce(); el('visual').textContent = '无法启动过渡，已直接更新。'; return;
        }
        el('skip').disabled = false;
        // 立即为三个阶段挂上处理器，避免把视觉拒绝当成未处理异常。
        const [ready, updated] = await Promise.allSettled([
          transition.ready, transition.updateCallbackDone, transition.finished,
        ]);
        if (updated.status === 'rejected') {
          el('visual').textContent = '内容更新失败，需要检查更新函数。';
        } else {
          el('visual').textContent = ready.status === 'rejected'
            ? '视觉准备被跳过，内容仍已更新。' : '内容已更新，过渡已结束。';
        }
      }
    } finally {
      transition = null; el('skip').disabled = true;
      button.disabled = false; el('motion').disabled = false; el('duplicate').disabled = false;
    }
  };
</script>
</html>
```

先核对任务：工具面板可 Escape 关闭；编辑框打开后焦点到输入框，Tab 不应进入背景；空白标题得到错误，有效应用后框关闭并返回编辑按钮。反转顺序后列表从 a、b、c 变为 c、b、a，第二次回到原顺序，更新计数每次只增加一。

为了让交互边界清楚，示例执行期间禁用重复反转；跳过按钮可以结束动画。这个选择减少了教学代码的并发分支，后面再讨论允许连续操作时应如何扩展。

### 六、基础可用与关闭增强要分别检查

本页没有脚本时，工具区、资料列表、编辑表单和真实页内链接仍然能读到；静态文件没有保存后端，因此无脚本不能应用修改。所谓基础路径不能隐瞒这个限制。真正要支持无脚本保存，必须提供可用的 form action、method 与服务器响应。

有脚本但缺少 popover 或 dialog 时，内联区域仍由同一套表单逻辑处理。关闭过渡或检测到减少运动偏好时，同一个 updateOnce 直接更新列表，不等待动画回调。

在新浏览器中人为关闭增强，可以证明基础分支仍可用，却不能代替真实旧浏览器兼容验证。CSS 语法、DOM 方法和辅助技术行为也可能有差异。项目可以明确支持的桌面浏览器范围，再针对实际需求核对。

### 七、视图过渡分成三个阶段理解

**视图过渡（View Transition）**围绕一次状态变化保存视觉快照，再通过伪元素展示旧状态到新状态的变化。真正的 DOM 更新仍发生在你提供的回调里。

| Promise | 主要回答什么 | 应连接到什么逻辑 |
| --- | --- | --- |
| updateCallbackDone | 更新回调是否完成 | 判断本次 DOM 更新本身是否成功 |
| ready | 过渡快照与伪元素是否准备好 | 设置过渡动画或了解视觉准备失败 |
| finished | 过渡是否结束或被跳过 | 视觉收尾与释放相关资源 |

动画因重复名称或主动 skip 被跳过时，内容更新仍可能完成，finished 也不必因为视觉被跳过而拒绝。更新回调本身抛错则是另一类失败。不能在任意 catch 里再次执行“删除资料”或“提交订单”，那可能重复业务副作用。

示例的 updateOnce 限制本次操作只进入一次同步更新。它只是本例的本地保护，不是网络写入幂等方案。如果更新函数修改了一半 DOM 后抛错，标记变量不会把它自动回滚；复杂更新需要先准备数据、验证条件，再提交状态，失败时提供恢复。

### 八、快照中的卡片不是第二份可操作界面

过渡快照服务于视觉效果，不能承载真实表单状态或辅助技术语义。焦点和可访问树仍要围绕当前 DOM 管理。不要等动画结束才宣布保存结果，也不要让动画是否结束决定内容是否存在。

`view-transition-name` 用于关联新旧视觉对象；同一时刻重复名称可能使过渡准备失败。示例故意给三项都命名为 same-note，便能观察 ready 拒绝而更新计数仍增加一次。正常路径使用稳定业务 key，避免按列表位置命名后配错对象。

移动节点与重建节点也不同。示例反转原有 li，保留其身份；真实列表若含输入、选择区或订阅，要考虑 DOM 操作是否影响状态。视图动画不应成为无意清空用户草稿的理由。

本页用 `:root { view-transition-name: none; }` 排除整页根快照，只让命名的资料项参与过渡，并将 `::view-transition` 设置为不接收指针。这样列表之外的“跳过动画”仍可点击。仅修改覆盖层的 pointer-events，却保留包含按钮的整页根快照，仍可能遇到点击落不到真实按钮的问题。正式界面还要决定过渡期间允许哪些操作，不能只解决快照遮挡就认为并发问题已经处理。

### 九、连续操作先处理数据竞争，再处理动画

假设用户先打开 A，再打开 B，A 的读取却更晚完成。跳过 A 的动画不等于取消 A 的请求，也不等于禁止它覆盖 B。每次导航应有当前任务标识，并在提交前确认结果仍属于当前意图。

对读取可以配合 AbortController 减少不必要工作；对写入不能把请求取消解释成服务器撤销。旧结果失去提交资格的完整对照见 [CAREER-05](../chinese-guides/career-05-code-review-risk-communication.md#career-05)。

若允许连续调整顺序，可以维护一个业务更新队列或明确采用最新意图，再让新的视觉过渡取代旧的。两者需要分开记账：业务操作 ID 表示用户要求了什么，过渡对象表示如何显示这次变化。

示例选择执行期间禁止重入，是小型界面的合理实现之一；不必为了介绍 API 就引入复杂队列。重要的是把取舍写出来，让读者知道扩展时哪条假设会改变。

### 十、真实链接保留浏览器本来的能力

详情入口首先应是 `<a href="/notes/42">`，并让这个地址可以直接访问。这样刷新、复制、新标签打开和浏览器后退都有明确含义。只写一个 button 再用脚本拼 URL，会额外承担这些行为。

本文的 `href="#details"` 只演示原生页内定位。它不能证明服务器支持任意详情 URL。做跨页示例时，至少要能直接打开目标页，再谈客户端导航增强。

跨文档 View Transition 还要求相关页面选择加入，并符合浏览器的导航与同源等条件；不是在一页调用 startViewTransition 就自动为所有链接加上跨页动画。缺少支持时，浏览器仍应按正常链接加载内容。

### 十一、Navigation API 不需要再推一次历史

**Navigation API** 提供观察与拦截导航的统一入口。它和 View Transition 的职责不同：前者涉及目的地、历史和导航处理，后者涉及一次变化的视觉呈现。

下面是接入已有应用的说明片段，`loadNote` 与 `renderNote` 分别由应用提供数据读取和同步渲染；它不是可以直接贴到静态文件里使用的完整路由器。只处理明确的资料路径，其他导航交还浏览器。

```js example=web-navigation-intercept runtime=project
// loadNote(id, { signal }) 返回资料；renderNote(note) 同步更新页面。
// 服务器也必须能直接响应 /notes/<数字>。
if ('navigation' in window) {
  navigation.addEventListener('navigate', (event) => {
    const url = new URL(event.destination.url);
    if (!event.canIntercept || event.hashChange || event.downloadRequest != null ||
        event.formData || url.origin !== location.origin) return;
    const match = /^\/notes\/(\d+)$/.exec(url.pathname);
    if (!match || url.search || url.hash) return;
    event.intercept({
      async handler() {
        const note = await loadNote(match[1], { signal: event.signal });
        event.signal.throwIfAborted();
        renderNote(note);
      },
    });
  });
}
```

拦截后，不要为同一次导航再调用 history.pushState 或 navigation.navigate。浏览器正在处理的导航已经有自己的提交与历史语义；额外推送一次容易制造重复条目。普通后退前进也不应被改写成新 push。

导航 committed 与 finished 同样不同。默认拦截流程中，URL 可能已提交而异步加载尚未结束；加载失败需要错误界面、重试或返回路径。上面的片段只说明筛选与信号，不包含完整错误页、焦点和滚动策略。

默认焦点重置和滚动行为要按 Navigation API 的具体选项理解。若选择 manual，就应由应用兑现标题焦点和滚动恢复；不要一边依赖默认行为，一边额外无条件聚焦 body，让两套机制相互干扰。

### 十二、定位、运动与交互各自渐进增强

CSS Anchor Positioning 可以把浮层放在触发器附近，并尝试避免超出可用区域。它处理几何，不提供关闭按钮、模态语义或键盘协议。本文 popover 使用浏览器顶层的基础位置，读者可以先理解交互，再按需要加锚点定位。

能力检测也要分别做：支持 popover 不代表支持全部锚点语法，支持单文档过渡不代表跨文档条件都满足。现代 CSS 的分层思路可继续看 [WEB-03](../chinese-guides/web-03-modern-css-architecture-container-progressive.md#web-03)。

减少运动时保留结果，去掉不必要的位移、缩放和空间切换。动画时间设得极小，仍可能留下依赖动画事件的代码；从调用入口选择直接更新，通常更容易说明和维护。所有路径共享状态更新函数，才能减少行为分叉。

### 十三、完成交互要核对哪些事实

把一次浮层改动的验收写成动作和结果：打开后焦点在哪，Tab 能到哪里，Escape 如何退出，取消是否保留原值，应用失败时草稿是否还在，关闭后回到哪里。仅看一张浮层截图，不能说明这些事实。

过渡则看业务更新次数、最终 DOM 和用户偏好。正常、关闭增强、重复名称、主动跳过等路径，应该得到相同的业务结果。若检查的是历史，还要记录 URL 与后退前进结果；本文列表反转不修改历史，不能把它当作路由验证。

本批聚焦桌面任务。选择少量能发现真实错误的检查即可，无需围绕每个属性展开完整矩阵。浏览器实际焦点与读屏表达也应分开记载，没有运行屏幕阅读器就不能承诺实际播报已通过。

学完后应能解释：为何 popover 的背景能操作而 modal dialog 不行；为何重复 view-transition-name 可能没有动画但仍改变列表；为何拦截导航后再 pushState 会让历史变乱。解释清楚这三个区别，就能把视觉增强稳稳接在真实任务上。

### 参考与延伸阅读

审校日期：2026-09-14。保留英文 API 名称方便检索，具体兼容范围以目标浏览器和对应子特性为准。

- [MDN：Using the Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API/Using)：声明式触发、模式与关闭行为。
- [MDN：dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog)：showModal、表单关闭与可访问性说明。
- [MDN：Using the View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API/Using)：快照、名称、单文档与跨文档条件。
- [MDN：ViewTransition](https://developer.mozilla.org/en-US/docs/Web/API/ViewTransition)：三个 Promise 与 skipTransition 的语义。
- [MDN：startViewTransition](https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition)：更新回调与渐进增强入口。
- [MDN：NavigateEvent.intercept](https://developer.mozilla.org/en-US/docs/Web/API/NavigateEvent/intercept)：导航处理、焦点与滚动选项。
