# Agent UI 协议与互操作知识点讲义

## AIUI-01 Agent UI 协议与 MCP Apps 互操作实现

同一个 Agent 服务返回了三类东西：一串运行事件、一张表单的组件描述、一份需要嵌入的 HTML。前端能否把它们都塞进一个 `renderAgentMessage`？如果只按名字里的 UI 判断，很容易把参数结束当执行成功，把组件目录当下载地址，或者以为支持 MCP Tool 的客户端一定能显示 MCP App。

本讲先区分 AG-UI、A2UI 和 MCP Apps 的职责，再用具体消息与离线适配实验说明它们如何连接。读完后，你应能列出产品所需能力，指出不能等价映射的部分，并让能力不足、版本不同和消息恢复时的界面保留真实状态与用户工作。

### 学习前先确认

- 直接前置：[AIAPP-05 Generative UI 视图模型与宿主边界](../chinese-guides/aiapp-05-generative-ui-view-model-host-safety.md#aiapp-05)。需要理解受信注册表、用户草稿与嵌入应用的边界。
- 直接前置：[AIAPP-02 流式响应、SSE 与增量渲染](../chinese-guides/aiapp-02-streaming-sse-incremental-rendering.md#aiapp-02)。需要理解帧、连续事件、终态和取消，不能把一次网络读取当完整消息。

### 一、三个协议解决三个不同的问题

**事件协议（Event Protocol）**用明确的事件类型表达一次运行发生了什么，使接收者可以更新状态。AG-UI 主要处于这一层。A2UI 描述可由客户端组件目录解释的界面；MCP Apps 则把工具与 UI 资源关联，由支持扩展的宿主加载应用并桥接能力。

| 对象 | 主要交流内容 | 消费者需要做什么 | 不能自动得到什么 |
| --- | --- | --- | --- |
| AG-UI | 运行、消息、工具、共享状态等事件 | 校验、归约并呈现进度与结果 | 统一组件目录、业务授权 |
| A2UI | surface、组件、数据模型、动作 | 按约定 catalog 渲染与回传意图 | 可靠续传、任意程序运行权限 |
| MCP Apps | UI 资源、初始化、工具数据和宿主请求 | 隔离加载、协商能力、控制桥接 | 所有 MCP 客户端都支持 UI |

一个资料助手可以用 AG-UI 报告检索阶段，用 A2UI 表达摘要卡，用 MCP App 提供复杂筛选。但不必三者齐上：固定页面加普通工具结果可能已经够用。A2UI 的传输合同也不强迫只能搭配 AG-UI；MCP 的工具与资源机制是另一层，不能把这些名称当同一协议的别名。

以下版本事实核对于 2026-10-01：A2UI 官方将 v0.9.1 标为 Current、v0.9 为 Previous Stable、v1.0 为 Candidate；本文消息锁定 v0.9.1。MCP Apps 的具体资源与初始化解释以 2026-01-26 Stable 扩展规范为依据，核心 MCP 的版本另行协商。AG-UI 页面包含持续演进的类型和草案，本讲仅使用明确说明的事件子集，不假定所有 SDK 已实现网页上的全部能力。

### 二、事件结束要问结束了什么

AG-UI 文本消息常由 `TEXT_MESSAGE_START`、若干 `TEXT_MESSAGE_CONTENT` 和 `TEXT_MESSAGE_END` 组成，messageId 连接同一条消息。工具提议也有开始、参数增量与结束；`TOOL_CALL_END` 标识调用描述完成，不是业务系统已成功执行。工具结果另有对应事件或应用结果合同，卡片还要解释其中的成功、拒绝与未知状态。

例如先到达参数 `{"title":"本周`，后到达 `学习"}`，最后参数结束。此时最多得到可解析候选，仍须校验、授权和必要确认。真正创建计划后的 operationId 与版本来自执行服务，不能从结束事件里猜出来。相关执行链见 [AIAPP-04](../chinese-guides/aiapp-04-tool-calling-execution-result-ui.md#五未知结果和取消都不能伪装成失败)。

运行结束、消息结束和工具完成也各有作用域。AG-UI 当前说明还包含等待人输入的运行 outcome；不能仅见到 `RUN_FINISHED` 就把所有业务操作标成 succeeded。不能理解某个关键 outcome 的旧适配器应停止相应动作或降级，不能默默按旧成功语义消费。

官方基础事件字段没有为每个事件统一强制全局 seq、eventId 和幂等键。恢复若需要这些标识，可以在项目传输封装中增加，但必须由可信生产端持久分配；接收端重连后重新从 1 编号，无法识别原事件的重放。

### 三、A2UI 把组件结构与数据更新分开

surface 可以理解为一块有独立身份和数据模型的界面区域。v0.9.1 用 `createSurface` 建立它，`updateComponents` 增加或更新组件，`updateDataModel` 更新数据，`deleteSurface` 删除。每个服务端消息只包含其中一种操作，版本字段用于解释这一份消息。

下面是四个依次发送的消息，保存为 `surface-messages.json` 可用 JSON 查看器阅读。外层数组仅为展示顺序而包装，真实传输按集成方式逐条发送，不是 A2UI 规定的批量请求。本例没有运行渲染器。

```json example=aiui01-surface-messages runtime=project file=surface-messages.json
[
  { "version": "v0.9.1", "createSurface": {
    "surfaceId": "reading-card",
    "catalogId": "https://a2ui.org/specification/v0_9_1/catalogs/basic/catalog.json"
  } },
  { "version": "v0.9.1", "updateComponents": {
    "surfaceId": "reading-card",
    "components": [{ "id": "root", "component": "Text", "text": { "path": "/summary" } }]
  } },
  { "version": "v0.9.1", "updateDataModel": {
    "surfaceId": "reading-card", "path": "/summary", "value": "本周先读作用域，再练习闭包"
  } },
  { "version": "v0.9.1", "deleteSurface": { "surfaceId": "reading-card" } }
]
```

第一条建立区域并固定 catalog；第二条给出根组件，文字绑定数据模型中的 summary；第三条填充内容；第四条移除区域。删除不能被实现成业务任务撤销，草稿如何保留也应由宿主明确决定。改变 catalog 需要按协议重新建立 surface，不能在旧区域里悄悄换一套组件语义。

catalogId 是双方约定的标识，即使长得像 URL，也不要求可下载，更不授权客户端自动拉代码。v0.9.1 的 `updateDataModel` 是替换指定路径的值，省略 value 表示删除该路径；不要把它等同于任意 JSON Patch。根替换、字段删除和本地脏字段冲突应分别处理。

未知组件能否保留已知部分，取决于结构依赖和产品降级合同；未知根组件不能简单丢掉后称整棵树有效。组件目录与 envelope 一起校验，引用缺失时只显示受控占位，不执行未验证动作。具体注册与草稿策略见 [AIAPP-05](../chinese-guides/aiapp-05-generative-ui-view-model-host-safety.md#五增量更新保护的不只是字段值)。

### 四、MCP Apps 连接资源与宿主桥接

MCP Apps 是可选扩展。工具定义通过 `_meta.ui.resourceUri` 关联 `ui://` 资源，资源媒体类型为 `text/html;profile=mcp-app`。这份 HTML 是应用代码，区别于 A2UI 的组件描述；应从受控服务器和资源流程加载，不能把模型随手生成的 HTML 字符串当同等来源。

View 与 Host 之间使用基于 JSON-RPC 的桥接，初始化为 `ui/initialize`，随后 View 发送 `ui/notifications/initialized`；所选 Stable 规范要求 Host 收到该通知后再向 View 发后续请求或通知。App 声明能力，Host 返回能力与上下文，主题和尺寸等信息按合同处理。扩展初始化与核心 MCP 的连接生命周期不是同一握手。

Web Host 的这版规范还要求经过不同来源的 Sandbox proxy，不能把“有一个 iframe”当作完成规范隔离。CSP 限制加载或连接来源，权限请求由宿主决定，资源声明不会自动授予相机、工具调用或任意网络。规范规定、SDK 封装和某个宿主额外批准政策应分别记录。

不支持扩展的客户端仍应得到可读工具结果。`ui://` 指向资源，并不证明用户有权看到每条业务数据；App 发起的调用也应经过当前授权。宿主关闭视图时清理桥接和订阅，已经提交的服务端操作仍需要单独确认结果。MCP 工具与资源的基础归属见 [MCP-01](../chinese-guides/mcp-01-server-tools-resources-prompts-schema.md#八声明只读和得到批准都不是安全边界)。

### 五、能力矩阵描述的是具体组合

**能力矩阵（Capability Matrix）**逐项记录当前功能需要什么、对端声明什么、适配器实际支持什么，以及缺失时怎么办。一个 `supportsUI` 布尔值无法区分只读文字、表单编辑、沙箱资源、工具调用、确认和恢复。

例如“读资料并申请建计划”可把文字设为必需、图表设为可选、业务写入确认设为执行前置。下面的独立决策实验使用自定字段，不是三个协议通用的握手格式。保存为 `capability-plan.mjs`，用 Node.js 22 执行。

```js example=aiui01-capability-plan
function decide(host) {
  if (!host.text) return { view: 'unsupported', action: 'blocked' };
  const view = host.catalogs.includes('reading@1') ? 'components' : 'text';
  const action = host.createPlan && host.confirmation ? 'propose' : 'manual';
  return { view, action };
}
for (const host of [
  { text: true, catalogs: ['reading@1'], createPlan: true, confirmation: true },
  { text: true, catalogs: [], createPlan: true, confirmation: false },
  { text: false, catalogs: [], createPlan: true, confirmation: true }
]) {
  const plan = decide(host);
  console.log(`${plan.view} / ${plan.action}`);
}
// => components / propose
// => text / manual
// => unsupported / blocked
```

第二种宿主仍可读文字，但不会因为缺确认组件就自动执行。propose 也只表示可以提出动作，实际对象、权限和批准仍要检查。矩阵记录版本、来源、核对日期与真实宿主结果；本地伪造能力对象只验证分支，不能证明某个真实宿主支持对应协议。

### 六、用适配器保护内部状态含义

**协议适配器（Protocol Adapter）**负责把经过校验的外部消息转换成内部事件或视图，同时保留不能等价转换的差异。它不应该既做所有业务授权，又把协议私有字段直接透传给组件。关键不变量先于字段映射：哪个 ID 稳定、谁拥有状态、完成意味着什么、缺口怎样恢复。

以下独立实验消费 AG-UI 文本事件的一个小子集。外层 `run` 和 `seq` 是本实验的可靠投递封装，表示它们由上游预先分配，不属于 AG-UI 基础事件要求。只允许一个文本消息，payload 已视为由锁定的 Schema 校验；这里关注顺序、重复和终态。保存为 `event-adapter.mjs`，用 Node.js 22 运行。

```js example=aiui01-event-adapter
function adapter(run, messageId) {
  let next = 1, state = 'idle', text = '';
  const waiting = new Map();
  function reduce(event) {
    if (event.messageId !== messageId) throw new Error('wrong_message');
    if (event.type === 'TEXT_MESSAGE_START' && state === 'idle') state = 'streaming';
    else if (event.type === 'TEXT_MESSAGE_CONTENT' && state === 'streaming') text += event.delta;
    else if (event.type === 'TEXT_MESSAGE_END' && state === 'streaming') state = 'complete';
    else throw new Error('unsupported_transition');
  }
  return {
    receive(envelope) {
      if (envelope.run !== run || state === 'complete' || state === 'error') return;
      if (!Number.isInteger(envelope.seq) || envelope.seq < next) return;
      if (envelope.seq > next + 8) { state = 'error'; waiting.clear(); return; }
      const old = waiting.get(envelope.seq);
      if (old && JSON.stringify(old) !== JSON.stringify(envelope.event)) {
        state = 'error'; waiting.clear(); return;
      }
      waiting.set(envelope.seq, envelope.event);
      while (waiting.has(next)) {
        const event = waiting.get(next); waiting.delete(next++);
        try { reduce(event); } catch { state = 'error'; }
        if (state === 'complete' || state === 'error') { waiting.clear(); break; }
      }
    },
    snapshot() { return `${state} / ${next - 1} / ${text || '-'}`; }
  };
}
const view = adapter('run-a', 'message-a');
const event = (seq, type, delta = '') => ({
  run: 'run-a', seq,
  event: type === 'TEXT_MESSAGE_START' ? { type, messageId: 'message-a', role: 'assistant' }
    : type === 'TEXT_MESSAGE_CONTENT' ? { type, messageId: 'message-a', delta }
      : { type, messageId: 'message-a' }
});
view.receive(event(1, 'TEXT_MESSAGE_START'));
view.receive(event(3, 'TEXT_MESSAGE_END'));
console.log(view.snapshot()); // => streaming / 1 / -
view.receive({ ...event(2, 'TEXT_MESSAGE_CONTENT', '旧'), run: 'run-old' });
view.receive(event(2, 'TEXT_MESSAGE_CONTENT', '已整理资料'));
view.receive(event(2, 'TEXT_MESSAGE_CONTENT', '已整理资料'));
view.receive(event(4, 'TEXT_MESSAGE_CONTENT', '迟到'));
console.log(view.snapshot()); // => complete / 3 / 已整理资料
```

收到第 3 条时不能跳过第 2 条；补齐后只追加一次文本，旧运行和终态后的增量不起作用。这里 complete 只指这一条文字消息，不代表创建计划成功，也不代表整个 run 不会继续产生其他消息。

实验不实现完整协议校验、持久化、缺口超时或所有实体的并发；已应用序号的冲突也没有保留历史逐项审计。真实系统应按所选协议的恢复机制补齐这些职责，不把一个通用 reducer 冒充三个协议的完整客户端。AG-UI 状态 delta、A2UI 路径替换与 App 私有状态有不同基线，不能共用一个无条件 merge。

### 七、桥接安全要落到实例和方法

桥接消息先检查它从哪个当前窗口或通道到达，再检查来源、版本、请求 ID、Schema 与允许方法。只看到 `type: tool-call` 或相同 nonce 不足以授权；过期实例即使拿着旧标识也不能继续请求。敏感字段在发送到 App 前就裁剪，不能只靠组件隐藏。

普通固定来源窗口应校验精确 origin 和 source。opaque origin 会呈现 `null`，不能把所有 null 当可信；隔离代理和通道绑定应按具体宿主/SDK 建立。某些沙箱传输使用通配目标有其上下文，不能从示例里的 `*` 推出任何窗口都可接收敏感结果。规则与边界见 [AIAPP-05](../chinese-guides/aiapp-05-generative-ui-view-model-host-safety.md#六普通组件与隔离应用的边界不同)。

对桥接设置消息字节、并发、频率和等待上限；销毁时移除监听、拒绝未完成请求并撤销实例能力。主题变化只接受设计令牌，尺寸变化有上下界和节流，打开链接与工具调用重新检查目标和授权。协议标准化的是交流方式，不是对消息内容的信任背书。

### 八、恢复时区分五类状态的所有者

服务端掌握运行与业务事实，协议共享状态只在约定字段内同步；客户端掌握当前视图、展开折叠和滚动；用户草稿有独立所有权；嵌入 App 还可能有私有状态。Agent 提出的状态更新不能更改服务端权限，也不能无条件覆盖用户输入。

假设网络断开前已经确认文字到序号 12，用户又修改了备注。恢复时从连续检查点或新快照重建生成区域，保留本地草稿，再查原工具操作。不能把“最后见到 15”作为检查点跳过 13、14，也不能因为 App 重建就重新执行创建。

快照是有作用域和版本的替换，不是任意来源都能覆盖整个页面。对没有可靠续传的协议组合，应说明当前内容未完成，并以新 run 重新发起；不能把新输出拼到旧回答尾部，伪装成恢复。跨标签页、刷新和权限撤销都按相同所有权处理，已不可见的数据及缓存需要随授权变化清理。

### 九、升级与降级都应保留可解释的任务路径

**优雅降级（Graceful Degradation）**是在能力缺失时仍保留核心信息和安全操作路径，并明确少了什么。例如图表变为数据表，交互表单变为只读摘要和可信编辑入口；不能把缺少事实来源变成“来源已核实”，也不能把缺少确认变成批准。

协议和 catalog/SDK 分别锁版本，记录组合与映射限制。升级先比较旧消费者读取新结果、新消费者恢复旧记录的行为；未知可选信息可按合同忽略，未知关键语义要停止。不要在文档里长期写“latest 支持”，也不要只替换版本字符串而不更新字段解释。

适配器回放应比较内部结果，而不只看消息是否能 parse：同一份合成轨迹在不同入口是否保留工具事实、草稿和降级理由。记录 transport、协议版本、run、message、tool、surface、App 实例及错误类别即可支持定位，无需保存全部提示和隐藏推理。真实宿主兼容性仍需在目标宿主运行；本讲的离线轨迹不是互操作认证。

### 带着问题回看

- TOOL_CALL_END、TEXT_MESSAGE_END 与业务成功分别由什么证据支持？
- A2UI catalogId 是 URL 形式，为什么仍不能自动下载并执行它？
- 在事件外层加入 seq 后，为什么还要规定谁分配、如何持久保存？
- 文本宿主缺少确认能力时，应保留哪些信息、停止哪些动作？

### 参考与延伸阅读

核对日期：2026-10-01。未连接真实 AG-UI 运行时、A2UI 渲染器或 MCP Apps 宿主；实验只验证所述内部状态与能力分支。

- [AG-UI 事件](https://docs.ag-ui.com/concepts/events)：查消息、工具、运行与状态的事件字段，区分正式类型和草案扩展。
- [A2UI v0.9.1](https://a2ui.org/specification/v0.9.1-a2ui/)：查本文锁定的四类消息、catalog、数据路径与客户端动作。
- [MCP Apps 2026-01-26 Stable 规范](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx)：查资源媒体类型、隔离代理、初始化及能力边界。
- [MCP Apps 官方概览](https://modelcontextprotocol.io/extensions/apps/overview)：查扩展定位和宿主接入入口；具体支持仍以目标版本为准。
