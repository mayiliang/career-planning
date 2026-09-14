# Web 基础知识点讲义

## WEB-01 HTML 语义、表单与可访问性基础

一个“保存”控件看起来像按钮，按 Tab 却到不了；一个输入框边上写着“邮箱”，读屏软件却只念“编辑”；错误已经显示，用户仍不知道该改哪一项。它们通常不是再补一点颜色就能解决的问题，而是页面没有把内容、操作和状态表达清楚。

HTML 给浏览器的不只是盒子。选用正确元素、建立正确关联，能让鼠标、键盘和辅助技术使用同一套页面。本篇用资料检索、账户表单和阅读设置弹窗，逐步建立这套结构。例子以桌面浏览器为主。

### 学习前先确认

本讲不要求其他站内前置。只需认识开始标签、结束标签和属性；后文会就地解释名称、描述、焦点和 ARIA。

标注为完整页面的 HTML 示例可分别保存成 `.html` 文件，直接用浏览器打开；页面之间不共享变量或元素。结构片段会明确说明放置位置。示例只在当前页面展示结果，不向服务器提交个人信息。

### 先让页面结构能被说清楚

想象去掉全部颜色、边框和图标，你还应当能说清“这是哪一页，主要内容是什么，有哪些小节”。下面是放在页面 `body` 中的一段资料详情结构：

```html example=web01-landmarks
<header>
  <a href="/">知识资料库</a>
  <nav aria-label="主导航">
    <a href="/knowledge">知识点</a>
    <a href="/plan">学习计划</a>
  </nav>
</header>
<main id="main-content">
  <h1>HTML 语义与表单</h1>
  <p>先建立结构，再添加交互。</p>
  <section aria-labelledby="goals-title">
    <h2 id="goals-title">这一篇会学到什么</h2>
    <ul>
      <li>为控件提供稳定名称</li>
      <li>让错误和输入框建立关联</li>
    </ul>
  </section>
  <section aria-labelledby="examples-title">
    <h2 id="examples-title">动手看一个例子</h2>
    <p>从下面的检索表单开始。</p>
  </section>
</main>
<footer><p>资料持续更新，阅读时可查看各篇参考来源。</p></footer>
```

这里的链接指向示意站点路径，单独保存文件时无需点击这些地址。要观察的是标题和区域的层次：整页主题是 `h1`，学习目标与示例是两个 `h2`，列表明确告诉浏览器这是一组并列项目。

标题等级表达从属关系，字号交给 CSS。不要因为想把字放大就选 `h1`，也不要为了小字号从 `h2` 跳到 `h5`。页面通常保留一个可见的主要 `main`；多个导航区用不同名称区分，例如“主导航”和“本篇目录”。

`section` 适合有主题的内容分组，`article` 适合可以独立分发或阅读的内容。没有相应含义、只为布局包一层时，普通 `div` 就够了。把所有 `div` 换成 `section` 不会自动改善结构。

浏览器会依据 DOM 的语义和状态生成**可访问性树（accessibility tree）**，辅助技术从中识别标题、区域和控件。它与 DOM 并非一一对应：纯布局容器可能不重要，被隐藏的内容也可能不出现在通常的阅读路径中。

### 链接负责去哪里按钮负责做什么

同样一块带底色的矩形，可能承担两件不同的事：

| 用户意图 | 元素 | 浏览器已有的能力 |
| --- | --- | --- |
| 前往某份资料 | 带 `href` 的 `a` | 显示目标地址、复制链接、在新标签页打开 |
| 展开筛选、保存修改 | `button type="button"` 或提交按钮 | 键盘聚焦、Enter/Space 激活、禁用状态 |
| 在多个布尔选项中选择 | `input type="checkbox"` | 选中状态、键盘切换、表单取值 |

给 `div` 加点击监听器，只是让鼠标点击时执行函数。它没有因此获得按钮的角色、默认焦点或 Space 行为。即使再补 `role="button"`，这些交互仍要自己实现。

这就是优先使用原生元素的实际收益：同一份标记已经包含一组相互配合的默认行为。**ARIA** 可以补充名称、状态和关系，但不能替代浏览器的事件逻辑。比如 `aria-disabled="true"` 只是传达状态；普通元素的点击代码不会因此自动停止。原生 `disabled` 则确实参与控件行为。

### 用一个完整表单看清标签与提交

将下面代码保存为 `search.html`。先点击“关键词”文字，再在输入框中键入“闭包”，按 Enter；最后点击“清空”。

```html example=web01-native-form
<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<title>检索表单示例</title>
<form id="search-form">
  <label for="query">关键词</label>
  <input id="query" name="q" required aria-describedby="query-help">
  <p id="query-help">输入标题中的一部分，例如“闭包”。</p>
  <button type="submit">检索</button>
  <button type="button" id="clear-query">清空</button>
</form>
<p id="search-result" role="status"></p>
<script>
  const form = document.querySelector('#search-form');
  const input = document.querySelector('#query');
  const result = document.querySelector('#search-result');
  form.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(form);
    result.textContent = `你提交的关键词是：${data.get('q')}`;
  });
  document.querySelector('#clear-query').addEventListener('click', () => {
    input.value = '';
    result.textContent = '';
    input.focus();
  });
</script>
</html>
```

你会观察到三个结果：点击标签会聚焦输入框；按 Enter 和点击检索走同一个 `submit` 处理器；清空只清空，不触发提交。空白未填写时提交，浏览器会根据 `required` 拦下操作。这里只演示“非空”；如果业务不接受全是空格的关键词，需要另行使用 `trim()` 检查。

`id="query"` 让 `label for="query"` 找到这个控件；`name="q"` 决定它在提交数据中的字段名。两者不必相同，也不能相互替代。只写 `id` 而没有 `name`，并不会让该字段自动进入 `FormData`。

`event.preventDefault()` 取消这次提交的默认导航，让示例留在当前页展示结果。真实表单若由服务端接收，可设置相应 `action` 和 `method`，让浏览器按表单协议提交。接管提交之后，应用也就需要负责等待提示、失败反馈和重复操作等后续体验。

### 名称描述与状态分别回答一个问题

在上面的例子中，“关键词”是控件的**可访问名称（accessible name）**；“输入标题中的一部分”是**可访问描述（accessible description）**；`required` 表达必填要求。

| 信息 | 回答的问题 | 例子 |
| --- | --- | --- |
| 名称 | 这是什么控件？ | 邮箱、保存阅读设置 |
| 描述 | 怎么填写，或者为什么不能通过？ | 用于接收学习提醒、请输入完整邮箱 |
| 状态 | 此刻处于什么情况？ | 已选中、已展开、输入无效 |

占位符 `placeholder` 可以给格式示例，但输入后会消失，不能代替稳定的标签。图标按钮若没有可见文本，应补充名称，例如 `aria-label="关闭阅读设置"`。名称要表达操作，不要只说“叉号图标”。

有可见文字时，应优先让可见文字成为名称。随意添加另一个 `aria-label` 可能覆盖它，使视力用户看到“搜索”，语音或读屏用户却听到“提交查询条件”，双方使用的称呼不同。

帮助文本和错误文本可由一个 `aria-describedby` 同时关联多个 ID。ID 必须在当前文档中存在且唯一。框架循环生成表单时，不能让每一行都复制同一个 `id="email"`；React 与 Vue 的组件封装不会自动修复重复 ID。

### FormData 收集的是可提交的字段

不是页面上出现的所有输入都会进入提交数据。未选中的复选框、没有名称的控件、被禁用的控件，通常都不会被收集。`readonly` 控件仍可提交；它与 `disabled` 的用途不同。

下面的独立浏览器示例直接构建一个表单并读取数据，不需要先在页面放置元素：

```js example=web01-form-data runtime=browser
const form = document.createElement('form');
form.innerHTML = `
  <input name="title" value="表单" readonly>
  <input name="internal" value="隐藏选项" disabled>
  <input value="没有 name">
  <input type="checkbox" name="topic" value="html" checked>
  <input type="checkbox" name="topic" value="css" checked>
  <input type="checkbox" name="topic" value="js">
`;
const data = new FormData(form);
console.log(data.get('title')); // => 表单
console.log(data.has('internal')); // => false
console.log(data.getAll('topic').join(',')); // => html,css
console.log([...data.keys()].join(',')); // => title,topic,topic
```

此处 `innerHTML` 只写入讲义中的固定字符串，后文会说明与不可信文本的区别。注意同名字段可以出现多次。多选项应使用 `getAll()`；直接把 `FormData` 转成普通对象可能只留下同名字段中的一个值。

提交按钮自身也可以带 `name` 和 `value`，表示“保存草稿”或“发布”等不同意图。需要收集本次按钮时，可把提交事件的 `submitter` 传给 `FormData` 构造函数；先确认它确实是这份表单的提交按钮。

脚本触发表单时，`requestSubmit()` 会进入约束校验和提交事件流程。`form.submit()` 会绕过这两个步骤，不宜拿来模拟用户按下提交按钮。这是两种不同的 API 行为，不是短写和长写的区别。

### 先把原生校验用对再定制错误提示

`required`、`type="email"`、`min`、`max`、`pattern` 等约束能处理不少基础问题。它们不理解全部业务规则：合法邮箱格式不表示邮箱存在，必填不表示账户有权限执行操作。

原生校验最直接的路径，是保留默认行为，让浏览器提示无效字段。如果希望错误一直显示在字段下方，便需要明确接管展示。下面是一个完整的邮箱表单；`novalidate` 关闭自动拦截，但我们仍读取原生 `validity` 来判断格式。

```html example=web01-custom-validation
<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<title>邮箱错误反馈示例</title>
<form id="email-form" novalidate>
  <label for="email">提醒邮箱</label>
  <input id="email" name="email" type="email" required
         autocomplete="email" aria-describedby="email-help email-error">
  <p id="email-help">用于接收你主动订阅的学习提醒。</p>
  <p id="email-error" hidden></p>
  <button type="submit">保存邮箱</button>
</form>
<p id="save-status" role="status"></p>
<script>
  const form = document.querySelector('#email-form');
  const input = document.querySelector('#email');
  const error = document.querySelector('#email-error');
  const status = document.querySelector('#save-status');
  let attempted = false;

  function validate() {
    const message = input.validity.valueMissing
      ? '请填写提醒邮箱。'
      : input.validity.typeMismatch ? '请输入完整邮箱，例如 reader@example.com。' : '';
    error.textContent = message;
    error.hidden = !message;
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
    return !message;
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    attempted = true;
    status.textContent = '';
    if (!validate()) {
      input.focus();
      return;
    }
    status.textContent = `本页已接受：${input.value}（未发送到服务器）`;
  });
  input.addEventListener('input', () => {
    status.textContent = '';
    if (attempted) validate();
  });
</script>
</html>
```

依次尝试空提交、输入 `reader`、输入 `reader@example.com`。第一种显示必填错误并聚焦字段；第二种显示格式说明；最后错误消失，页面报告已接受。修改一个先前通过的值时，旧成功提示会清空，避免显示过时结论。

这个例子在首次提交之前不不断纠正用户；提交失败之后，再随输入修正现有错误。错误说明通过描述关系连接到字段，`aria-invalid` 表示当前无效。它没有把每次敲键都设置成强制播报。

对于多个字段，可以在顶部提供错误摘要和跳转链接，或聚焦第一个错误。选择哪种方式取决于表单长度和任务，不应同时让摘要、字段错误与弹窗反复宣布同一件事。客户端检查提升填写体验，服务端仍需检查数据与操作权限。

### 焦点表示键盘接下来会操作哪里

**焦点管理（focus management）**可以从一个简单观察开始：连续按 Tab，看每一步落在哪里，是否看得见位置，能否完成同样的任务。

原生交互元素通常已经参与 Tab 顺序。让 DOM 顺序符合阅读顺序，再用 CSS 排版，通常比用 `tabindex="1"`、`2`、`3` 硬排更稳定。正值 tabindex 会先于普通顺序参与导航，页面新增一个按钮时很容易打乱整条路径。

`tabindex="0"` 让元素进入正常 Tab 顺序，但不会附赠角色与键盘激活；`tabindex="-1"` 允许脚本聚焦，通常不参加顺序 Tab，适合错误摘要或需要定位的静态标题。不要把每一段文字都放进 Tab 顺序，阅读文本和操作控件是两种不同任务。

焦点必须可见。可以通过 `:focus-visible` 设置清楚的轮廓与间距，不要全局移除 outline 后不提供替代。键盘定位依靠的是可识别的当前位置，单纯改变很浅的颜色可能不够。

内容较长的页面还可以在顶部提供跳转到主要内容的链接，减少每次都穿过导航的负担。缩放后、桌面窗口变窄后，同样要能看到标签、错误和焦点；这属于桌面阅读的基本可用性。

### 用原生 dialog 完成一次进出弹窗

弹窗不是把一个盒子盖到页面中间就结束。用户进入后，需要知道弹窗是什么、从哪里开始操作、如何退出、退出后回到哪里。下面是可直接保存的完整示例：

```html example=web01-dialog
<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<title>阅读设置弹窗示例</title>
<button id="open-settings" type="button">阅读设置</button>
<p id="settings-status" role="status">当前为舒适间距</p>
<dialog id="settings" aria-labelledby="settings-title">
  <form method="dialog" id="settings-form">
    <h2 id="settings-title">阅读设置</h2>
    <label><input id="dense" type="checkbox" autofocus> 使用紧凑间距</label>
    <p>取消会保留此前已经保存的设置。</p>
    <button value="cancel">取消</button>
    <button value="save">保存设置</button>
  </form>
</dialog>
<script>
  const opener = document.querySelector('#open-settings');
  const dialog = document.querySelector('#settings');
  const checkbox = document.querySelector('#dense');
  const status = document.querySelector('#settings-status');
  let savedDense = false;

  opener.addEventListener('click', () => {
    checkbox.checked = savedDense;
    dialog.returnValue = '';
    dialog.showModal();
  });
  dialog.addEventListener('close', () => {
    if (dialog.returnValue === 'save') savedDense = checkbox.checked;
    status.textContent = savedDense ? '当前为紧凑间距' : '当前为舒适间距';
    if (opener.isConnected) opener.focus();
  });
</script>
</html>
```

操作顺序是：打开，勾选，取消，再次打开。复选框应该恢复上一次保存的设置；这次勾选并保存，外部状态才改为紧凑间距。再次打开后按 Escape，也应退出并保留已保存值。

`showModal()` 将对话框放入顶层显示，并使背景内容不能像普通页面一样被交互；`show()` 或只添加 `open` 是非模态显示。它们外观可以很相似，交互约定却不同。`method="dialog"` 的表单用于关闭对话框并设置返回值，不会像普通表单那样发送网络请求。

这里有两个细节：打开时复制已保存设置，形成可以取消的草稿；每次打开先清空 `returnValue`，避免上一次“保存”的返回值被后来的 Escape 关闭误用。对话框负责显示与焦点，应用负责“取消是否丢弃修改”的业务含义。

示例通过 `autofocus` 选择第一个操作位置，通过名称关系说明弹窗主题。较长说明可以让带 `tabindex="-1"` 的标题先获得焦点；涉及危险操作时应选择合适的初始位置。关闭后一般回到触发控件，若控件已被移除，应改选仍存在且符合任务顺序的位置。

### 动态提示要出现也要适度

前面的 `role="status"` 适合“结果已经更新”“设置已保存”这类非紧急反馈。先让状态区域存在，再改变其文本，辅助技术才有明确的变化可以通知；具体播报时机仍受浏览器与辅助技术组合影响。

提示应说清结果，不只显示一个绿色图标。提交失败时告诉用户哪里错、怎么改；等待时说明正在处理；按钮是否禁用也要根据重复操作的后果决定。不能把颜色当成唯一信息来源。

`aria-live="assertive"` 会尝试打断当前播报，应留给需要立即注意的情况。一个字符变化产生多个强制通知，会让本来能填写的表单变得难用。也不要为了播报普通状态就把焦点抢到提示上：用户仍可能正在输入。

如果一个按钮展开帮助，按钮上的 `aria-expanded` 要随展开状态更新，`aria-controls` 可指向内容区域。简单的说明折叠也可以直接使用 `details` 与 `summary`，由原生元素处理开关行为。ARIA 表达的是已经实现的状态，不能只加属性而没有实际操作。

### 数据表格先交代行列之间的关系

只有数据具有行列关系时才使用表格，不要拿表格为整页排版。下面片段可以放进任何 HTML 页面的 `body`：

```html example=web01-table
<table>
  <caption>本周学习安排</caption>
  <thead>
    <tr><th scope="col">资料</th><th scope="col">预计用时</th><th scope="col">状态</th></tr>
  </thead>
  <tbody>
    <tr><th scope="row">HTML 表单</th><td>25 分钟</td><td>学习中</td></tr>
    <tr><th scope="row">React 快照</th><td>30 分钟</td><td>未开始</td></tr>
  </tbody>
</table>
```

`caption` 说明表格主题；列头说明这列是什么，行头说明当前行属于哪份资料。复杂跨行跨列表头需要更明确的关联，但普通表格不必一开始就手写全部 ARIA 角色。

如果以后使用 [TS-03 的类型化列配置](../chinese-guides/ts-03-generics-constraints-keyof-indexed-access.md#在创建列时保存关系让渲染保持简单)生成表格，类型解决的是列与值匹配，HTML 解决的是最终页面如何被理解。这两层可以互相配合，不能互相替代。

### 框架最终仍要生成可用的 HTML

React 的 JSX、Vue 的模板都只是另一种描述页面的方式。按钮仍要有名称，表单仍需要标签，弹窗仍要管理进出焦点。学习 [React 的渲染与提交](../chinese-guides/react-01-render-purity-state-snapshot.md#一次更新分成触发计算和提交)时，可以把提交理解为框架把这份描述落实到 DOM。

普通文本插入应使用框架的文本绑定或 DOM 的 `textContent`。把不可信字符串交给 `innerHTML`、`v-html` 或 `dangerouslySetInnerHTML`，浏览器会把它当标记解释，可能引入不应执行的内容。确需富文本时，要在清楚的输入边界做适当净化；仅删除 script 标签并不充分。

语义、交互和安全是不同问题。用上原生 dialog 不会自动验证删除权限，过滤过的 HTML 也不保证标题层级正确。把职责说清楚，才能在框架组件中复用一套可理解的行为。

### 用一条完整操作路径检查理解

挑一个例子，只用键盘走完进入、填写、提交、修正和退出。每一步都回答：现在焦点在哪，控件叫什么，操作产生了什么结果，失败后能否继续？再查看浏览器的可访问性面板，核对名称和描述是否真与预期相同。

页面外观、DOM 结构和可访问性树提供不同证据。自动扫描可以发现部分缺失，不能替你判断“取消后用户会不会误以为保存了”。对实际产品，还应针对目标浏览器与辅助技术做必要人工体验；不需要把一篇入门资料读成一套庞大的测试流程。

当你能解释 `id` 与 `name` 的区别、为什么按钮不该伪装成 div、错误怎样连到字段，以及 Escape 后草稿和焦点分别去了哪里，HTML 就已经从标签清单变成了可推理的交互基础。

### 参考与延伸阅读

- [MDN：Your first form](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Your_first_form)：补充表单结构、标签和提交方式。
- [MDN：FormData 构造函数](https://developer.mozilla.org/en-US/docs/Web/API/FormData/FormData)：查字段收集与 submitter 参数。
- [MDN：客户端表单校验](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Form_validation)：查约束、validity 和自定义反馈。
- [MDN：dialog 元素](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog)：查模态、关闭、焦点及兼容性。
- [MDN：ARIA](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA)：需要补充角色或状态时查询，优先确认已有原生元素是否适用。
