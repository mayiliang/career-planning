# 生成式界面视图模型与宿主安全知识点讲义

## AIAPP-05 Generative UI 视图模型、宿主与安全边界

读书助手先给出三张摘要卡，用户在其中一张写下自己的备注。新结果到达，页面整块重绘：备注没了，焦点也跳回顶部。另一份结果带着一个陌生图表类型，页面又试图按模型给出的包地址下载组件。这两个问题看起来分别属于体验和安全，其实都源于同一件事：应用没有划清模型可以描述什么、宿主必须掌握什么。

本讲从一个可更新的摘要面板建立受控视图。读完后，你应能设计组件注册表，保留用户输入与块身份，处理未知类型和版本，并区分普通数据渲染与隔离应用两种宿主边界。

### 学习前先确认

- 直接前置：[AIAPP-04 Tool Calling 与工具结果呈现](../chinese-guides/aiapp-04-tool-calling-execution-result-ui.md#aiapp-04)。点击生成界面的按钮仍须经过真实执行与结果确认。
- 直接前置：[SEC-04 跨源隔离、嵌入与权限](../chinese-guides/sec-04-cross-origin-isolation-embedding-permissions.md#sec-04)。需要理解 iframe、sandbox、来源和窗口身份。

### 一、先限制模型的表达方式

**生成式界面（Generative UI）**是让模型提出界面的数据和结构，由应用按受控规则选择组件并呈现的方式。模型可以建议“用列表展示三个候选”，宿主决定列表如何布局、哪些字段可见、按钮能表达什么动作。它并不必然涉及生成或执行 JavaScript。

同一份旅行比较有时适合表格，有时适合时间轴，这类任务有变化的表达需求。若一句话已经足够，额外引入组件协议只会增加失败面。先确定纯文本也能交代的事实，再决定交互形式如何帮助读者完成选择，不能把漂亮界面当作事实更可靠的证据。

可接受的自由度可以很小：标题、段落、固定列的表格、资料引用和受控动作。布局密度用宿主的主题令牌，链接走统一校验，不接受任意 CSS、事件函数、包地址或动态模板。每增加一种组件，都要定义空、加载、错误和只读状态，而不只是设计成功截图。

### 二、视图模型把显示和业务事实分开

**视图模型（View Model）**是供页面消费的内部数据表示。它描述稳定块 ID、类型、版本、内容与状态，不包含 Vue 实例、React 元素或待执行函数。外部结果先通过适配和校验，再变成视图模型；组件不需要理解每家供应商的字段。

一个块用 ID 定位，不用数组下标作为身份。插入第一项时，后面的文本框仍应属于原来的材料；否则草稿和错误提示会错位。视图版本表示这份描述的版本，业务对象版本表示服务器事实的版本，两者不能互相替代。

| 内部块 | 必需的语义 | 不应从模型获得的事实 |
| --- | --- | --- |
| text | 可显示的文字、块 ID | 内容必然真实或安全 |
| reasoning-summary | 可公开的步骤说明 | 隐藏推理原文、执行成功 |
| tool-call | 已校验提议、原调用 ID | 已批准、已有副作用 |
| tool-result | 操作 ID、确认状态与来源 | 根据模型语气推断的成功 |
| citation | 来源 ID、引用范围 | 永久访问权或事实背书 |
| artifact | 制品 ID、类型、可见摘要 | 可直接打开的任意外部 URL |

这是本讲的内部分类，不是 AG-UI、A2UI 或 MCP Apps 共同规定的消息集合。步骤说明只引用可以公开的计划或事实，无需暴露模型内部推理。制品和引用通常由服务端把标识解析成受权访问，不能让一个生成的 URL 越过附件权限。

### 三、注册表决定哪些描述能变成组件

**组件注册表（Component Registry）**是类型与版本到受审核实现的映射，同时规定输入、输出事件、资源限制和降级方式。查不到 `chart@9` 时，宿主显示文本替代，不去寻找同名全局变量，也不动态导入模型给出的包。

注册并不代表所有 props 都安全。图表标签是文字，formatter 若是函数就有执行能力；图片 src、Markdown 链接、CSS URL 和跳转地址又是不同解释位置。宿主先构造允许的 props，避免 `Component {...modelObject}` 把 onClick、style 或隐藏字段带入组件。

下面的独立实验演示一条受限绑定路径。保存为 `safe-binding.mjs`，用 Node.js 22 运行。输入使用本讲自定的点路径，不是 JSON Pointer，也不是 A2UI 路径实现。

```js example=aiapp05-safe-binding
function readOwn(model, path) {
  if (typeof path !== 'string' || path.length > 80) return 'blocked';
  const parts = path.split('.');
  if (parts.length > 4 || parts.some(p => !/^[a-zA-Z][a-zA-Z0-9]*$/.test(p)
      || ['constructor', 'prototype', '__proto__'].includes(p))) return 'blocked';
  let value = model;
  for (const part of parts) {
    if (!value || typeof value !== 'object' || !Object.hasOwn(value, part)) return 'missing';
    value = value[part];
  }
  return typeof value === 'string' ? value : 'wrong_type';
}
const model = { report: { title: '本周资料' } };
console.log(readOwn(model, 'report.title')); // => 本周资料
console.log(readOwn(model, 'report.constructor')); // => blocked
console.log(readOwn(model, 'report.toString')); // => missing
console.log(readOwn(model, 'report')); // => wrong_type
```

例子不沿原型链取值，不执行表达式，只允许有限层级的字符串字段。生产系统首先校验来自 JSON 的数据；任意 JavaScript 对象可能有 getter 或 Proxy，不能把这个函数说成任意对象的安全沙箱。需要日期格式化等计算时，只开放已审核的纯函数及其输入合同，不把 `eval` 包装成“灵活绑定”。

### 四、运行一个保留用户输入的桌面面板

保存下面完整页面为 `view-host.html`，用现代桌面浏览器打开即可。无需框架或网络。它模拟文本块、未知类型、异步更新和宿主关闭；不实现真实 Agent、iframe 或持久化。用户备注归宿主管理，生成块没有写备注的字段。

```html example=aiapp05-view-host runtime=project file=view-host.html
<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<title>受控视图与独立草稿</title>
<style>
body { max-width: 900px; margin: 32px auto; font: 18px/1.6 system-ui; }
button { font: inherit; margin: 4px; } textarea { width: 100%; min-height: 100px; font: inherit; box-sizing: border-box; }
section { padding: 20px; border: 1px solid #547465; margin-top: 18px; }
pre { white-space: pre-wrap; overflow-wrap: anywhere; font: inherit; }
:focus-visible { outline: 3px solid #875b20; } #status { min-height: 2em; }
</style>
<h1>受控视图与独立草稿</h1>
<p>本地合成结果；无网络、保存或真实工具执行。</p>
<button id="update">更新摘要</button><button id="unknown">未知组件</button>
<button id="late">安排延迟更新</button><button id="close">关闭面板</button>
<button id="open">重新打开</button>
<p id="status" role="status">准备就绪</p><main id="host"></main>
<script>
const host = document.querySelector('#host'), status = document.querySelector('#status');
const drafts = new Map();
let instance = 0, version = 0, active = false, timer = 0, output, input;
const registry = new Map([['text@1', text => {
  const node = document.createElement('pre'); node.textContent = text; return node;
}]]);
function accept(block, baseVersion, owner) {
  if (!active || owner !== instance) return 'old_instance';
  if (baseVersion !== version) return 'stale';
  if (!block || typeof block !== 'object' || Array.isArray(block)
      || Object.keys(block).sort().join(',') !== 'id,text,type,version'
      || block.id !== 'summary' || typeof block.type !== 'string' || block.type.length > 30
      || !Number.isInteger(block.version) || block.version < 1
      || typeof block.text !== 'string' || block.text.length > 400) return 'invalid';
  const render = registry.get(`${block.type}@${block.version}`);
  const node = render ? render(block.text) : document.createElement('p');
  if (!render) node.textContent = `当前不支持此组件。文字摘要：${block.text}`;
  output.replaceChildren(node); version += 1;
  return render ? 'updated' : 'text_fallback';
}
function show(result) { status.textContent = `${result}；视图版本 ${version}`; }
function mount() {
  if (active) return;
  active = true; instance += 1; version = 0;
  const panel = document.createElement('section');
  const heading = document.createElement('h2'); heading.textContent = '资料摘要';
  output = document.createElement('div'); output.id = 'generated';
  const label = document.createElement('label'); label.htmlFor = 'draft'; label.textContent = '我的备注';
  input = document.createElement('textarea'); input.id = 'draft';
  input.value = drafts.get('report-a:notes') ?? '';
  input.addEventListener('input', () => drafts.set('report-a:notes', input.value));
  panel.append(heading, output, label, input); host.replaceChildren(panel);
  show(accept({ id: 'summary', type: 'text', version: 1, text: '第一版资料摘要' }, 0, instance));
}
function unmount() {
  if (!active) return;
  active = false; instance += 1;
  clearTimeout(timer); timer = 0;
  host.replaceChildren(); output = undefined; input = undefined;
  status.textContent = '面板已关闭；备注保留在本页内存';
}
function block(type, text) { return { id: 'summary', type, version: type === 'text' ? 1 : 9, text }; }
document.querySelector('#update').addEventListener('click', () => {
  show(accept(block('text', '新摘要：<img src=x onerror=alert(1)> 仍是文字'), version, instance));
});
document.querySelector('#unknown').addEventListener('click', () => {
  show(accept(block('chart', '三个候选，仍可阅读摘要'), version, instance));
});
document.querySelector('#late').addEventListener('click', () => {
  if (!active) return;
  clearTimeout(timer); const base = version, owner = instance;
  timer = setTimeout(() => { timer = 0; show(accept(block('text', '延迟到达的旧摘要'), base, owner)); }, 800);
  status.textContent = '已安排 800ms 后的合成更新';
});
document.querySelector('#close').addEventListener('click', unmount);
document.querySelector('#open').addEventListener('click', mount);
window.addEventListener('pagehide', unmount);
mount();
</script>
</html>
```

先填写备注，再点“更新摘要”：只替换生成区域，文字框和已有输入不变，字符串中的 img 不会创建图片。点“未知组件”可看到文字替代，没有下载图表代码。安排延迟更新后立即更新摘要，800ms 后旧版本应返回 stale，不覆盖新摘要；安排后立即关闭，会清理定时器，重开仍从独立草稿恢复备注。

面板关闭使实例身份失效，同时清理待执行任务；被移除节点的监听随不可达节点回收。例子没有堆快照或完整泄漏审计。刷新会清空内存；生产持久化需要另定会话、材料、字段与版本的存储键以及删除政策。不能把“关闭后重开有备注”写成“刷新恢复已完成”。

### 五、增量更新保护的不只是字段值

每次更新至少明确目标实体、所依据版本和更新内容。先验证整个更新，再提交到视图，避免标题已换为新版本，按钮还绑定旧参数。重复包可以在上游去重，序号缺口先等待或取快照；没有基线的 delta 不能靠最后到达者覆盖。

生成默认值和用户草稿分开。未编辑字段可以按产品约定接收新默认值；脏字段保留用户版本，出现冲突时展示差异。若模型要求删除正在编辑的块，应先保存草稿并提供解释或确认，不能把输入当作可随时抹掉的生成缓存。

键盘焦点、选区和滚动也是用户正在进行的工作。局部更新保留控件节点，完整替换前记录合理的恢复位置；新结果不抢焦点，不逐 token 播报。例子点击按钮后焦点自然落在按钮上，它保证备注区域不被摘要更新重建，不宣称覆盖所有输入法或复杂富文本选区。增量与草稿分离可继续读 [AIAPP-02](../chinese-guides/aiapp-02-streaming-sse-incremental-rendering.md#六取消先让旧尝试失效再释放资源)。

### 六、普通组件与隔离应用的边界不同

**宿主边界（Host Boundary）**是应用决定哪些数据和能力可以交给生成内容或嵌入应用的界线。普通组件模式下，模型提供数据，代码始终来自宿主；这依赖受控字段和安全渲染，不会自动获得 iframe 隔离。隔离应用模式下，加载的是独立 HTML 程序，需要额外约束文档来源、sandbox、CSP、网络出口和桥接。

确定来源的窗口通信同时核对精确 origin、source window、消息结构和当前实例。opaque origin 的沙箱可能把 origin 序列化为 `null`，此时不能把所有 `null` 消息当成同一可信来源；要使用经过审核的隔离代理、固定窗口或通道绑定、初始化状态与方法允许列表。确需向 opaque origin 使用通配目标时，应遵循对应桥接实现，不能把通配符复制到普通敏感消息发送中。

sandbox、CSP 和 Permissions Policy 控制不同方向。禁止父页面访问不等于禁止所有网络；资源可能被允许从指定域加载。来源可靠也不代表内容拥有业务权限。基础区别见 [SEC-04](../chinese-guides/sec-04-cross-origin-isolation-embedding-permissions.md#六sandbox-给的是能力不是可信身份)。具体 MCP Apps 桥接归 [AIUI-01](../chinese-guides/aiui-01-agent-ui-protocol-interoperability.md#四mcp-apps-连接资源与宿主桥接)。

### 七、按钮返回意图，宿主决定动作

生成块可以声明“申请创建计划”的受限动作类型；不能传任意函数名、服务端令牌、URL 或 `approved: true` 来执行。宿主用当前会话和对象状态构造新提议，进入 [AIAPP-04 的确认流程](../chinese-guides/aiapp-04-tool-calling-execution-result-ui.md#三确认绑定的必须是将要执行的动作)。模型改变按钮文字不能把保存草稿变成正式发布。

动作事件带块身份和视图版本，输入按事件 Schema 校验。用户已经修改表单时，旧视图按钮不能提交旧默认值；服务端错误应对应当前提交版本。真实操作已完成而生成界面仍显示加载时，权威结果应禁用重复执行入口，不能等模型再说一句“成功”。

下载与打开制品同样是能力。界面保存制品 ID、摘要和安全媒体类型，由服务端按当前用户解析访问；只读展示路径也可能暴露数据，不能因没有写数据库就跳过授权。销毁 surface 不自动取消已提交操作，应分别清理界面订阅与查询原操作状态。

### 八、降级后仍要保留任务的核心信息

未知组件可以降为表格或文字；未知关键版本必须停止相应解释，不能猜旧字段的意思。若缺的是确认能力，降级应给可信人工入口或停止动作，不能把“没有确认弹窗”解释成默认同意。

控制节点数、深度、每帧更新量、图片大小与活动实例数；过大结果先摘要和分页。组件的可访问名称、表头、字段错误和键盘操作由注册实现保证，模型只填内容。主题与尺寸更新节流，避免 resize 消息互相触发无限布局。资料中的桌面限制不意味着可忽视键盘使用者。

单块失败应保住会话和草稿。记录块类型、版本、失败阶段及必要关联 ID，不把原始危险 HTML 作为错误详情执行。刷新恢复时以稳定视图快照、连续位置和独立草稿重建，再向服务端核对工具事实；DOM 截图无法代替这些状态。

### 带着问题回看

- 注册表查到组件以后，为什么仍不能把全部生成字段传成 props？
- 延迟更新的 baseVersion 为什么比“最后收到的总是最新”可靠？
- 未知图表可以变成文字，未知确认组件能否变成默认批准？
- 本地面板关闭保留备注，证明了持久化或 iframe 隔离吗？

### 参考与延伸阅读

核对日期：2026-10-01。页面实验只运行受控宿主代码，不执行模型代码或真实跨源桥接。

- [MDN textContent](https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent)：理解文本节点与 HTML 解析的区别。
- [MDN postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)：核对目标来源、发送窗口、消息接收与特殊来源条件。
- [MDN iframe](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe)：查 sandbox、allow 和嵌入约束。
- [MCP Apps 概览](https://modelcontextprotocol.io/extensions/apps/overview)：区分隔离应用资源与普通声明式组件；实际能力取决于宿主。
