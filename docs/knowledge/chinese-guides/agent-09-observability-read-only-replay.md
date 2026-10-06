# Agent 可观测性、关联追踪与安全回放知识点讲义

## AGENT-09 Agent 可观测性与回放

资料助手显示“导出失败”。日志里有模型返回、工具请求和一条超时，但看不出文件是否已经生成。开发者点“重跑”想找原因，系统却又创建了一份导出任务。另一个人打开完整日志，才发现用户文档和访问令牌也被记录了下来。

一次有效排障应找回发生过的事实，同时避免新增业务动作和额外泄露。本篇先把运行、请求与业务操作连起来，再演示采集前裁剪、重复事件处理和只读回放。例子使用合成事件，不连接观测平台；它们帮助理解证据链，不能证明生产日志已经安全。

### 学习前先确认

- 直接前置：[AGENT-01 Agent 循环、规划、停止与恢复](../chinese-guides/agent-01-loop-planning-stopping-recovery.md#agent-01)，理解步骤、工具动作与停止状态；[OBS-01 前端可观测性、SLO、告警与隐私](../chinese-guides/obs-01-frontend-observability-slo-alerting-privacy.md#obs-01)，理解日志、指标与追踪各自提供什么证据。

### 一、先区分一次目标、一次尝试与一次业务动作

**分布式追踪（Distributed Trace）**把跨组件的一次处理连接成可查询的因果关系。一个 trace 中的 span 表示一段有起止的操作，如规划、工具请求或结果验证。span 可以有父节点，也可以用 link 表示与另一段异步工作有关；它不是把聊天记录按时间排一遍。

用户发起一次导出，是 run；客户端超时后查询原任务，是另一次请求；后台最终生成文件，是原业务动作的结果。它们可以有不同的 requestId 和 spanId，却共享同一个 operationId。若只按请求数统计成功，会把重试或查询当成多份成果；若所有请求只留同一个 ID，又无法找出哪次传输失败。

| 标识 | 回答的问题 | 不应拿来替代什么 |
| --- | --- | --- |
| runId / stepId / attempt | 哪个目标的哪一步、第几次尝试 | 当前访问主体 |
| traceId / spanId | 这段处理与哪些处理有关 | 业务幂等键 |
| MCP JSON-RPC id | 哪个响应对应本次往返 | 长任务句柄 |
| operationId / taskId | 怎样找回同一业务工作 | trace 的完整因果结构 |

身份与租户从受信上下文取得，不能因为两个客户端发来相同 traceId 就把数据混在一起。排障查询先验证访问范围，再按运行和操作定位。模型输出“完成了”只是一条输出事件，不是业务回执。

### 二、跨服务传播的是关联信息，不是权限

**上下文传播（Context Propagation）**是在发送时把关联字段写入载体，在接收时解析并建立下一段处理的关系。HTTP 常用 W3C `traceparent`；MCP 2026-07-28 在 `_meta` 中保留 traceparent、tracestate、baggage 三个键，值遵守对应 W3C 格式。它们不替代每次请求必需的协议版本与 Client 能力元数据。

下面只展示 version 00 的基本解析和父子传递。保存为 `trace-context.mjs`，运行 `node trace-context.mjs`，环境为 Node.js 22。固定 ID 是教学数据，不要用重复常量生成真实链路。

```js example=agent09-trace-context
function parse00(value) {
  const match = typeof value === 'string' && value.match(
    /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/);
  if (!match || /^0+$/.test(match[1]) || /^0+$/.test(match[2])) return null;
  return { traceId: match[1], parentId: match[2], sampled: (parseInt(match[3], 16) & 1) === 1 };
}
const incoming = '00-11111111111111111111111111111111-2222222222222222-01';
const remote = parse00(incoming);
const span = { traceId: remote.traceId, spanId: '3333333333333333', parentId: remote.parentId };
const outgoing = `00-${span.traceId}-${span.spanId}-01`;
console.log(span.parentId, parse00(outgoing).parentId);
// => 2222222222222222 3333333333333333
console.log(parse00(incoming)?.sampled, parse00('invalid') === null);
// => true true
console.log(parse00('00-00000000000000000000000000000000-2222222222222222-00') === null);
// => true
```

下游收到的 parentId 是本段 spanId，不是把入口的 parentId 原样传到底。代码不处理未来版本、多个头值或 tracestate，也没有安装 OpenTelemetry；生产使用相应 SDK 的传播器，按安全边界决定是否接续外部链路。

格式合法不代表可信。外部调用者可以编造关联 ID 与 sampled 标志，入口仍需限制属性大小和采样成本；必要时新建内部 trace，并以受限 link 记录外部关联。baggage 会继续传播，默认不放令牌、联系人、租户秘密或文档内容，更不能从 baggage 的 `role=admin` 决定授权。向第三方发送前构造允许字段，不无差别转发内部上下文。

### 三、事件要说明发生了什么，并保留断链与重复的区别

一个 span 可以包含“请求已发送”“收到结果”“结果已验证”等多个事件，它们共享 spanId。因而“按 spanId 删除重复日志”会吞掉正常事实。独立事件使用 eventId 去重；同一个 span 的生命周期记录则按具体存储合同更新或归并，不能混为一谈。

事件词汇先区分提议、批准、提交、观察和验证。审批通过只能证明允许尝试执行；收到超时只能证明这次等待结束；都不能直接写成退款成功或未执行。每条记录保留 run、step、attempt、请求关联、版本及安全错误码。不要采集模型的内部思维过程，诊断需要的是可观察输入引用、决定和执行证据。

队列乱序时，本地序号可以恢复同一事件生产者的先后；跨生产者还需要因果关系，不能凭时间相近造一条父边。找不到父 span，标为断链并说明推断来源。缺少记录可能是未采样、投递丢失、留存到期或访问被过滤，不能自动等同“没有发生”。

持续时间应由同一进程的单调时钟计算。不同机器的单调时钟没有可直接相减的共同起点；跨主机墙钟也可能偏移。图中出现负等待时，先检查时钟与关联，不用展示层偷偷修改原始证据来制造连贯故事。

### 四、先裁剪字段，再让事件进入存储

**数据最小化（Data Minimization）**是只保留完成诊断所需的数据，并在进入队列、日志或导出之前处理。查询页面再打码太晚，原文可能已进入磁盘和备份。下面把“允许哪些字段”写成采集器，而不是先展开整个对象再删除几个已知秘密。

保存为 `trace-capture.mjs`，用 Node.js 22 执行。合成卡号不是用户数据；本例仅为展示掩码。如果诊断不需要末四位，应该连它也不采集。内存数组代替落盘管线，没有真实持久存储与访问控制。

```js example=agent09-capture-events
const records = [], seen = new Map();
const allowedKinds = new Set(['tool.requested', 'tool.observed', 'tool.verified']);
function capture(raw, trusted) {
  if (!allowedKinds.has(raw.kind) || !/^[a-z0-9-]{1,40}$/.test(raw.eventId)) return 'invalid';
  const safe = {
    tenant: trusted.tenant, eventId: raw.eventId, kind: raw.kind,
    runId: trusted.runId, spanId: trusted.spanId, parentSpanId: trusted.parentSpanId,
    sequence: raw.sequence, operationId: trusted.operationId,
    contractVersion: trusted.contractVersion,
    card: /^\d{16}$/.test(raw.card ?? '') ? `****${raw.card.slice(-4)}` : null,
    resultCode: ['TIMEOUT', 'CONFIRMED'].includes(raw.resultCode) ? raw.resultCode : null,
  };
  if (!Number.isSafeInteger(safe.sequence) || safe.sequence < 0) return 'invalid';
  const key = JSON.stringify([trusted.tenant, trusted.runId, raw.eventId]);
  const encoded = JSON.stringify(safe);
  if (seen.has(key)) return seen.get(key) === encoded ? 'duplicate' : 'event-conflict';
  seen.set(key, encoded); records.push(safe); return 'stored';
}
const context = { tenant: 'team-a', runId: 'run-7', spanId: 'tool-7',
  parentSpanId: 'plan-7', operationId: 'export-7', contractVersion: '3' };
const first = { eventId: 'ev-1', kind: 'tool.requested', sequence: 1,
  card: '4000000000001234', token: 'synthetic-secret', document: '合成私人正文', tenant: 'forged' };
console.log(capture(first, context), capture(first, context));
// => stored duplicate
console.log(capture({ ...first, eventId: 'ev-2', kind: 'tool.observed', sequence: 2, resultCode: 'TIMEOUT' }, context));
// => stored
console.log(capture({ ...first, sequence: 9 }, context));
// => event-conflict
console.log(records.length, records[0].card, records[0].tenant);
// => 2 ****1234 team-a
const stored = JSON.stringify(records);
console.log(['4000000000001234', 'synthetic-secret', '合成私人正文', 'forged'].some(value => stored.includes(value)));
// => false
```

两条不同 eventId 的事件都属于 tool-7，仍完整保留；同一 eventId 重送只保留一次，内容改变则冲突。tenant 取自受信上下文，输入中的伪造值不会落盘。最后一行只检查这组已知哨兵不在产物中，不证明任意秘密都能被自动识别。

真实采集器还需限制每个标识长度、总事件字节与速率，并审查异常分支、第三方堆栈、URL 参数和批量导出。哈希也不等于匿名化，低熵邮箱或编号可能被枚举；更适合保存受权引用和短期用途记录。记录哪些字段被丢弃或掩码即可，不要为“脱敏报告”再次保存原文。基本方法沿用 [进入队列前的数据最小化](../chinese-guides/obs-01-frontend-observability-slo-alerting-privacy.md#十一数据最小化应发生在进入队列之前)。

### 五、只读回放只解释历史，不重新执行历史

**只读回放（Read-Only Replay）**根据冻结事件与录制结果重建过去的过程。回放器读取结果，不拥有发送、退款、删除等真实工具入口。只在代码里写 `dryRun: true`，却仍给它生产凭据，不能形成可靠边界。

保存为 `readonly-replay.mjs`，运行 `node readonly-replay.mjs`。数据中的 seq 是同一记录器产生的合成顺序，span ID 也是演示标签，不是 W3C ID。此代码不导入业务执行器，不发网络请求。

```js example=agent09-readonly-replay
const artifact = {
  schemaVersion: 1, mode: 'history',
  spans: [{ id: 'plan' }, { id: 'write', parent: 'plan' }],
  events: [
    { id: 'e2', seq: 2, span: 'write', type: 'write.requested', operation: 'export-7' },
    { id: 'e1', seq: 1, span: 'plan', type: 'plan.ready' },
    { id: 'e3', seq: 3, span: 'write', type: 'result.observed', recording: 'receipt-7' },
  ],
  recordings: { 'receipt-7': { status: 'confirmed', artifactId: 'file-7' } },
};
function replay(source) {
  const spanIds = new Set(source.spans.map(span => span.id));
  const gaps = source.spans.filter(span => span.parent && !spanIds.has(span.parent)).map(span => span.id);
  const timeline = [...source.events].sort((a, b) => a.seq - b.seq).map(event => {
    if (!spanIds.has(event.span)) return `${event.id}:SPAN_MISSING`;
    if (event.type === 'write.requested') return `${event.id}:REPLAY_WRITE_BLOCKED`;
    if (event.type === 'result.observed') return `${event.id}:${source.recordings[event.recording]?.status ?? 'REPLAY_DATA_MISSING'}`;
    return `${event.id}:${event.type}`;
  });
  return { timeline, gaps, mode: 'history' };
}
const result = replay(artifact);
console.log(result.timeline.join('|'), result.gaps.length);
// => e1:plan.ready|e2:REPLAY_WRITE_BLOCKED|e3:confirmed 0
const missing = structuredClone(artifact);
missing.spans = missing.spans.filter(span => span.id !== 'plan');
missing.recordings = {};
const incomplete = replay(missing);
console.log(incomplete.timeline.join('|'));
// => e1:SPAN_MISSING|e2:REPLAY_WRITE_BLOCKED|e3:REPLAY_DATA_MISSING
console.log(incomplete.gaps.join(','));
// => write
```

写入事件依然出现在时间线中，只是不会重做。后来的 confirmed 来自历史录制件，不代表回放刚刚确认了外部业务；没有录制件就显示缺失，不调用真工具“补齐”。删除父 span 后，缺口被保留下来，回放仍然只读。

这个函数检查的只是示例中的父节点存在性；生产导入还要验证结构、重复标识、循环、数据权限与完整性。没有执行器可以降低误调用机会，但进程若仍能联网或读生产秘密，仍需部署层隔离。安全边界见 [执行身份与运行隔离](../chinese-guides/agent-10-identity-authorization-runtime-isolation.md#五授权允许做什么隔离限制实际能碰到什么)。

将冻结输入交给新模型比较候选，是另一次反事实评估。它需要新 runId、评估标识和独立结果，不能覆盖历史事件；采样随机性、外部数据变化和滚动模型版本也意味着“同输入”未必得到相同回答。

### 六、采样能保留到达的证据，不能找回已丢弃的数据

头采样在处理早期决定保留与否，成本较低，但此时通常不知道最后会不会失败。尾采样等待更多 span 后按错误、耗时或其他条件决定，需要缓冲容量、等待窗口和正确路由。两者串联时，尾采样只能从上游送来的数据中选择，不能恢复已被头采样丢弃的链路。

用一组合成计数推演：100 次任务中有 2 次失败；头采样保留 10 条，恰好只有 1 条失败。下游规则“保留所有失败”最多保留到达的这 1 条，不会凭空得到另 1 条。若尾采样窗口结束后才收到错误 span，也可能遗漏。因此“配置了错误优先”不等于“所有错误都留有完整追踪”。

偏向错误的样本也不能直接算总体成功率。关键分母来自独立业务计数或完整状态汇总，trace 用于解释个案；高基数的用户、文件与 operationId 不直接成为指标标签。有限的错误类别、工具类别和发布版本更适合聚合。指标分母可参照 [SLO 与错误预算](../chinese-guides/obs-01-frontend-observability-slo-alerting-privacy.md#八先写清分母再计算-slo-与错误预算)。

诊断日志可以抽样，安全审计的必要留存则按系统要求另行设计。低流量服务不一定需要复杂尾采样；先测遥测体积与排障缺口，再决定投入，避免观测系统比被观察任务更昂贵。

### 七、版本、访问与留存让证据在之后仍可解释

同一工具名可能换了输入合同，模型别名也可能滚动更新。记录应用、提示模板、工具合同、策略和数据快照的版本；拿不到实际模型版本时明确 unknown，不填今天的版本冒充历史。哈希用于找到允许保留的制品，不要求在日志里复制整个提示和文档。

遥测读取有独立权限：能调用工具的人不一定能看其他人的参数摘要。查询、下载、分享、索引、备份和导出都应服从同样的租户与用途边界。调试正文若确实必需，放入短期受控存储，记录访问与到期；紧急调试开关应自动失效。

记录过期后，回放可以保留“制品已删除”的状态，不能因回放需求重新取回用户已经撤回的数据。恢复备份也要重放删除和撤销记录。日志减少字段能降低暴露，但不会免除访问控制与保留责任。

### 八、从用户结果反查首个语义缺口

回到导出失败：先找到用户任务与原 operationId，确认文件是否存在；再看工具尝试是否超时、是否收到回执、验证在哪一步缺失。最晚的一条错误往往是后果，未必是根因。将总耗时拆成排队、模型生成、人工等待、工具执行与结果验证，才能决定该改哪里。

一次有效验证只需围绕疑点：移除父关联应显示断链，重复投递应保留一次事件，带合成秘密的输入应在采集前裁剪，回放写步骤应被阻断。随后对同一路径复验修复，并确认正常路径仍能解释；仪表盘截图或事件数量不能替代这些证据。

MCP 2026-07-28 将 Logging 标为弃用并保留兼容期，不等于禁止普通日志。新系统可用 OpenTelemetry 建立观测，stdio 诊断走 stderr，不能污染 stdout 的协议消息。具体 SDK 字段与语义约定要按所用版本核对，本篇应用事件名不宣称是协议统一枚举。

### 自检问题

1. 同一 span 的两条不同事件，为什么不能按 spanId 去重？
2. 请求超时后，哪份证据才能证明业务动作未发生？
3. 上游没有导出失败链路，下游尾采样能保住它吗？
4. 回放缺少录制结果时，为什么不能调用真实工具补齐？

### 参考与延伸阅读

- [OpenTelemetry 上下文传播](https://opentelemetry.io/docs/concepts/context-propagation/)：查传播载体、边界与 baggage 风险。
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)：核对 traceparent 字段、格式与版本处理。
- [MCP 2026-07-28 基础规则](https://modelcontextprotocol.io/specification/2026-07-28/basic)：查 `_meta` 中的追踪键及协议字段。
- [OpenTelemetry 采样](https://opentelemetry.io/docs/concepts/sampling/)：比较头采样、尾采样与运行成本。
- [MCP 2026-07-28 发布说明](https://blog.modelcontextprotocol.io/posts/2026-07-28/)：查 Logging 弃用和兼容期。

核对日期：2026-10-06。示例没有接入真实遥测管线、租户权限或外部模型，也没有证明完整生产回放隔离。
