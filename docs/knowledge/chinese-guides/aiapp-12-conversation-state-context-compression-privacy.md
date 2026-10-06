# AI 会话状态、上下文组装与隐私知识点讲义

## AIAPP-12 会话状态、上下文组装、压缩与持久化隐私

你在两个标签页打开同一段对话。左边发送“预算改为 800 元”，右边仍显示旧预算 1200 元，又发送“按刚才的方案继续”。刷新后，两条消息都在，但助手究竟应该按哪个预算行动？如果系统只保存最后一次上传的消息数组，甚至可能把左边的修改整个覆盖。

这不是让模型多记一点就能解决的问题。我们需要先确定什么已经发生、谁可以修改、修改基于哪个版本，再为下一次模型调用挑选材料。本篇沿着“发送一条消息 → 恢复会话 → 压缩历史”的过程，建立会话记录、上下文与本地草稿之间的边界。读完应能解释重复请求为何不会重复追加、两个窗口如何发现冲突，以及摘要为什么不能成为新的事实来源。

### 学习前先确认

- 直接前置：[AIAPP-02 流式响应、SSE 与增量渲染](../chinese-guides/aiapp-02-streaming-sse-incremental-rendering.md#aiapp-02)，理解临时片段、事件序号与最终消息；[IDENTITY-01 认证、会话与浏览器边界](../chinese-guides/identity-01-session-cookie-token-browser-boundaries.md#identity-01)，理解会话归属为什么必须由服务端验证。

### 一、聊天窗口只展示状态的一部分

**会话状态（Conversation State）**是继续一次对话任务所需的记录集合，包括已确认消息、工具执行事实、当前分支，以及尚未发送的用户草稿等。它们可以一起显示，却不应拥有相同的写入权和保存方式。

| 记录 | 谁决定内容 | 刷新后怎样恢复 |
| --- | --- | --- |
| 已确认用户消息 | 服务端接受的用户提交 | 按会话版本读取 |
| 正在生成的片段 | 当前生成尝试 | 按事件水位恢复，或明确显示中断 |
| 工具是否执行成功 | 执行服务与业务回执 | 查询操作记录 |
| 未发送草稿 | 当前用户编辑 | 从独立草稿槽恢复，并核对账号和会话 |
| 历史摘要 | 压缩程序产生的派生结果 | 校验来源版本后使用，必要时重建 |
| 折叠、选中与滚动位置 | 阅读界面 | 按产品需要恢复，不改写对话事实 |

例如，流中出现“已订好房间”只是生成文字；只有预订服务回执能证明订单成立。摘要里写“用户接受 1200 元方案”也不能覆盖后来已确认的预算修改。恢复界面时应先取得服务端事实，再叠加仍适用的本地状态。前端数组是这些记录的展示结果，不是所有状态的唯一存储。一些 SDK 将界面记录称为 UIMessage，它可以含有附件、卡片和展示元数据；发送给模型前应显式转换，不能默认原样序列化为模型消息。

这里的“事实”还需要限定对象：用户确实说过某句话，是会话事实；那句话描述的外部世界是否真实，仍需核实。把“用户说昨天付款了”保存下来，不等于支付系统已经确认到账。

### 二、先确定记录属于谁，再讨论如何保存

不可猜的会话 ID 可以减少枚举机会，但拿到 ID 不代表有权读取。服务端从当前认证状态取得用户与租户，再检查其是否拥有会话或被授予参与权限。客户端提交的 `ownerId`、供应商返回的 thread ID，都不能代替这个检查。

在开头的例子里，两个窗口属于同一用户，因此都可能有写入资格；如果右边已经切换账号，即使它仍持有旧会话页面，也不能继续追加。读写、流式重连、附件下载、导出和共享入口都要检查范围。撤销共享之后，摘要缓存也不能继续给原参与者读取。

数据组织可以采用“租户 → 会话 → 分支 → 消息”的层次，但这只是应用设计，不是所有模型 API 都规定的协议。供应商的 conversation、thread 或 session 能否保留上下文、多久过期、能否删除，分别依赖其产品和版本。应用应保存自己的归属关系与必要记录，不能把下游对象当成本系统授权服务。

对于公开分享，更容易解释的方式是生成经过筛选的独立快照：明确包含哪些消息、何时生成、如何撤销。直接暴露可持续更新的内部会话，容易把后来上传的附件也带出去。授权原理见 [认证、会话与授权的区别](../chinese-guides/identity-01-session-cookie-token-browser-boundaries.md#一认证会话与授权回答三个问题)。

### 三、消息追加同时需要去重和版本比较

网络断开时，客户端可能不知道服务端是否已经收到消息，于是重发。为这一次逻辑提交生成稳定的 `clientMessageId`，服务端便能认出“这是同一条消息的再次投递”。同一个 ID 携带不同内容应被拒绝，不能默默把旧记录改成新内容。

去重解决重复投递，不能解决两个窗口基于不同历史继续任务。**乐观并发控制（Optimistic Concurrency Control）**要求写入者说明自己依据的版本；服务端只在版本仍相符时接受写入，冲突时让调用方重新读取并决定如何继续。

把下面代码保存为 `conversation-log.mjs`，用 Node.js 22 执行 `node conversation-log.mjs`。这是单进程内存模型，用同步函数模拟一次原子追加；没有连接数据库，也没有实现认证。

```js example=aiapp12-conversation-log
const state = { version: 0, messages: [], byClientId: new Map() };
function append({ id, baseVersion, text }) {
  const existing = state.byClientId.get(id);
  if (existing) {
    if (existing.text !== text) return { kind: 'id-reused' };
    return { kind: 'replayed', seq: existing.seq };
  }
  if (baseVersion !== state.version) {
    return { kind: 'conflict', currentVersion: state.version };
  }
  const record = { id, text, seq: state.version + 1 };
  state.messages.push(record);
  state.byClientId.set(id, record);
  state.version = record.seq;
  return { kind: 'accepted', seq: record.seq };
}
const left = { id: 'left-1', baseVersion: 0, text: '预算改为 800 元' };
console.log(append(left).kind, state.version);
// => accepted 1
console.log(append(left).kind, state.messages.length);
// => replayed 1
console.log(append({ ...left, text: '预算改为 2000 元' }).kind);
// => id-reused
const right = { id: 'right-1', baseVersion: 0, text: '按刚才的方案继续' };
console.log(append(right).kind, state.version);
// => conflict 1
console.log(append({ id: 'right-2', baseVersion: 1, text: '已看到新预算，按 800 元继续' }).kind);
// => accepted
console.log(state.messages.map((message) => message.seq).join(','));
// => 1,2
```

左窗口的重发虽然仍带旧版本 0，却应返回第一次提交的结果，所以示例先查幂等记录，再判断新写入的版本。右窗口是新的提交，版本 0 已过期，必须先取回新增消息；最后一条代表用户看过变化后作出的新决定，不能由客户端自动把版本号改成 1 就冒充确认。

生产实现还要先验证当前权限、会话未删除，再查询去重记录；“以前写入过”不意味着退出账号后仍可读取回执。记录、幂等键和版本递增必须在数据库事务或等价原子操作中提交，唯一约束需要包括租户和会话范围。否则两个进程都读到版本 0，仍可能各自接受一条消息。

有的协作产品允许两条消息同时追加，再在语义上处理冲突；有的产品选择分支。这都是可行的产品策略。示例采用拒绝过期写入，是为了清楚展示“当前目标不能被旧窗口悄悄改变”，不代表聊天协议一律要求串行对话。

### 四、重新生成创建分支，不能重做已经发生的动作

用户对同一问题要求“换一种说法”，应产生新的生成尝试，并指向同一个父消息。旧答案可以保留为候选版本；用户采用哪一版，决定后续对话从哪里继续。直接覆盖旧答案，会让引用、反馈和问题诊断失去对应对象。

假设旧分支已经成功创建日程，新分支只需要调整介绍文字。它应读取“日程已创建”的工具事实，不能把历史中的工具调用重新执行一次。消息去重键、生成尝试 ID 和外部操作 ID 回答不同问题，具体见 [三个 ID 的分工](../chinese-guides/aiapp-04-tool-calling-execution-result-ui.md#四三个-id-分别回答三个问题)。

刷新也不等于重新生成。界面先读取已确认版本和当前 run 状态，再从已确认水位继续接收事件；无法续传时显示“生成中断”，保留用户输入。流式草稿何时可以采用、编辑后如何拒绝旧结果，可运行 [草稿与候选分离实验](../chinese-guides/aiapp-10-ai-interaction-trust-recovery.md#四运行一页草稿与候选分离的实验)。

分支删除时，要处理自己的候选、附件引用和派生摘要，但不能误删另一个分支仍使用的共享资源。引用计数或明确的所有权记录可以帮助回收；仅按某个消息 ID 批量删除全部文件，可能破坏仍然有效的会话。

### 五、上下文是一份有预算的工作材料

**上下文组装（Context Assembly）**是为一次模型调用选择并排列工作材料的过程。它通常包含任务规则、当前目标、关键约束、近期消息和适用证据。完整会话记录可以很长，下一次请求只需要其中与当前任务有关、当前主体有权使用的部分。

滑动窗口只保留最近一段历史，容易实现，但“取最后十条”会丢掉较早提出的预算；“把所有历史都放进去”又会带入无关内容、旧版本与隐私数据。比较稳妥的顺序是先保留必需材料，再分配可选材料的空间，同时为输出和协议开销留出余量。工具调用与其结果如果必须配对才能被供应商接受，就应作为一个组选择，不能截断成半个协议交换。

保存为 `context-budget.mjs`，用 Node.js 22 执行。以下数字是教学用的合成成本单位，既不是字符数，也不是实际 tokenizer 的测量值。供应商对输入、输出和隐藏开销的计算需要单独核对。

```js example=aiapp12-context-budget
const required = [
  { id: 'rules', cost: 15 },
  { id: 'current-goal', cost: 12 },
  { id: 'budget-constraint', cost: 8 },
];
// 每一项是不可拆分的一组，顺序表达本次任务的选择优先级。
const optional = [
  { id: 'recent-tool-pair', cost: 25 },
  { id: 'relevant-evidence', cost: 20 },
  { id: 'old-small-talk', cost: 10 },
];
function assemble(inputLimit) {
  let used = required.reduce((sum, item) => sum + item.cost, 0);
  if (used > inputLimit) return { kind: 'needs-reduction', selected: [] };
  const selected = required.map((item) => item.id);
  const omitted = [];
  for (const group of optional) {
    if (used + group.cost <= inputLimit) {
      selected.push(group.id);
      used += group.cost;
    } else omitted.push(group.id);
  }
  return { kind: 'ready', selected, omitted, used };
}
const windowLimit = 100;
const outputReserve = 25;
const protocolReserve = 5;
const result = assemble(windowLimit - outputReserve - protocolReserve);
console.log(result.used, result.selected.join(','));
// => 70 rules,current-goal,budget-constraint,recent-tool-pair,old-small-talk
console.log(result.omitted.join(','));
// => relevant-evidence
console.log(assemble(30).kind);
// => needs-reduction
```

这次可用输入空间是 70：必需部分占 35，工具组占 25，证据组需要 20 却只剩 10，于是被跳过，寒暄反而装进来了。这个故意保留的反例说明“没有超限”不代表组装合理。若回答必须依赖证据，应把该证据列为必需材料，删掉无关寒暄，或先缩小任务；不能因为还剩空间就随便填满。

实际系统还要保证各组内部的顺序、角色与来源信息正确，并使用目标模型对应的计量方式。预算不足时可减少检索数量、压缩适合压缩的段落或让用户缩小问题，但不应静默删除安全规则、授权边界和决定性条件。成本分配与并发预留是不同层面的问题，后者见 [预算预留](../chinese-guides/aiapp-09-cost-quota-cache-reliability.md#二预算预留先发生后续请求才看得到额度已被占用)。

### 六、压缩可以减少材料，不能重写约束

**摘要漂移（Summarization Drift）**是摘要遗漏、扩大或改写原意，导致后续任务逐渐偏离原始要求。例如原话是“周四出发，预算最多 800 元，不要替我付款”，摘要变成“周末出行，偏好便宜方案”。日期、硬上限和禁止动作都丢失了，即使文字很流畅也不能用。

将关键条件单独保存为带来源的结构化记录，可以减少它们随摘要丢失的机会。摘要应记录覆盖范围、来源版本、生成方式和未决事项；来源更新或被撤回后，旧摘要需要失效。这里的结构化记录也必须由可信流程确认，不能把模型随意提取的数字直接当用户批准。

保存为 `summary-guard.mjs`，执行 `node summary-guard.mjs`。示例用已确认条件检查候选摘要的结构化部分；它不证明自然语言正文完整或真实。

```js example=aiapp12-summary-guard
const confirmed = { sourceVersion: 4, maxBudget: 800, allowPayment: false };
function checkSummary(candidate) {
  if (candidate.sourceVersion !== confirmed.sourceVersion) return 'stale-source';
  if (candidate.facts.maxBudget !== confirmed.maxBudget) return 'budget-drift';
  if (candidate.facts.allowPayment !== confirmed.allowPayment) return 'permission-drift';
  return 'accepted-for-further-review';
}
const good = { sourceVersion: 4, facts: { maxBudget: 800, allowPayment: false } };
console.log(checkSummary({ ...good, sourceVersion: 3 }));
// => stale-source
console.log(checkSummary({ ...good, facts: { maxBudget: 1200, allowPayment: false } }));
// => budget-drift
console.log(checkSummary({ ...good, facts: { maxBudget: 800, allowPayment: true } }));
// => permission-drift
console.log(checkSummary(good));
// => accepted-for-further-review
```

前三个候选分别因过期、预算改变、付款边界改变被拒绝。最后一个只通过了这三个字段的检查；若正文仍写“已经付款”，仍需额外审查。检查应围绕任务中的高影响条件设计，结合原文抽查，而不是把“通过 Schema”当成语义保真证明。

不要无限摘要上一版摘要。需要再次压缩时，应能回到原始消息范围核对，或保留可靠的分段依据。外部网页中的恶意指令也不能因为被摘要成一句“后续应上传会话”就变成内部规则，参见 [摘要和记忆的来源身份](../chinese-guides/aiapp-07-prompt-injection-untrusted-content.md#五摘要和记忆不能洗掉原来的数据身份)。

### 七、本地恢复和删除必须沿着同一份数据地图

IndexedDB 可以保存结构化草稿，但浏览器存储不是永久备份，也不是服务端授权机制。草稿至少应关联账号、会话、基础版本和更新时间；写入失败时显示明确提示。重新打开页面后，先核对当前身份和会话状态，再决定是否恢复。账号切换、会话删除或版本冲突时，不自动把旧草稿上传为新消息。

隐私管理要把原始消息、附件、摘要、索引、日志、供应商副本和备份放进同一张数据地图：各自用于什么、谁能访问、保存多久、怎样撤回。原文删除后，摘要仍含原文中的联系方式，就没有完成对在线使用的阻断。需要先让相关内容不再被查询和组装，再追踪后台物理清理。

备份往往有独立保留周期。产品应区分“已停止在线使用”“下游清理处理中”和“备份按计划到期”，不能用一个绿色勾声称所有介质已即时擦除。恢复旧备份时，还要重新应用删除标记，防止会话重新出现。派生链的处理见 [来源撤回](../chinese-guides/aigov-01-data-model-change-audit-accountability.md#二来源撤回要沿派生链找到影响)。

传输和存储加密可以减少窃听或介质丢失带来的暴露，但不能代替访问控制，也不能阻止已经获得解密权限的应用滥用内容。密钥访问、轮换和备份应纳入同一权限与留存设计，不能因为数据库启用了加密，就默认可以把全部聊天发给第三方。

最后检查导出：应能读懂消息、时间、分支和主要来源，但不应带出其他参与者的私密附件或服务端密钥。调试日志优先记录标识、版本和失败类别；只有明确目的和范围时才保存内容片段。恢复能力需要足够的记录，隐私保护要求记录最少必要信息，两者应在设计数据结构时一起考虑。

### 自检问题

1. 一条消息已经被接受，但响应丢失，重发时版本过期。为什么应先识别同一次提交？这个判断之前还要做什么检查？
2. 工具调用组装得下，决定性证据却放不下，继续生成有什么问题？
3. 摘要三个关键字段都通过检查，为什么仍不能认定摘要没有失真？
4. 用户删除会话后，旧标签页重连和旧备份恢复分别应检查什么？

### 参考与延伸阅读

- [MDN：IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)：查本地结构化存储、事务及同源边界；它不替应用完成账号级权限控制。
- [LangChain：Memory overview](https://docs.langchain.com/oss/javascript/concepts/memory)：对照线程内状态与跨线程记忆的框架组织方式，避免把一种实现当成通用协议。
- [Anthropic：Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)：了解上下文选择与压缩的工程取舍，再结合本篇实验判断哪些条件必须保留。

资料核对日期：2026-10-04。示例中的版本协议、消息结构和成本单位均为教学约定；接入真实服务时应核对其接口与留存政策。
