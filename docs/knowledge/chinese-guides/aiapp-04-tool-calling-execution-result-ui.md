# AI 工具调用与结果呈现知识点讲义

## AIAPP-04 Tool Calling 与前端工具结果呈现

用户说“把这周的学习安排存成计划”，模型回了一段函数名和参数。页面显示成功了吗？还没有。应用可能尚未校验参数，也可能正在等待确认。更麻烦的是，服务端已经创建计划，但返回途中连接断了；此时显示“失败，请重试”反而可能引导用户重复创建。

这一篇沿一个计划工具走过提议、执行和查结果，说明前端应该相信哪份证据。读完后，你应能设计工具输入与结果合同，把确认绑定到实际动作，并让重复请求、过期参数、取消和未知结果各有可恢复的路径。

### 学习前先确认

- 直接前置：[AIAPP-03 结构化输出与 Schema 校验](../chinese-guides/aiapp-03-structured-output-schema-validation.md#aiapp-03)。需要先区分结构有效、业务成立和授权通过，不能把工具参数当成已经执行的指令。

### 一、函数名和参数只是一份提议

**工具调用（Tool Calling）**是模型通过约定格式提出工具名称和参数，再由应用决定是否执行、如何执行以及怎样返回结果的交互方式。工具可以是计算、检索或业务接口。模型没有因为能说出函数名，就取得该函数的权限或真实业务身份。

一次常见轮次是：应用提供工具定义；模型返回调用提议；应用校验并执行；应用把结果与原调用 ID 关联回传；模型据此继续回答。工具结果已返回后，模型也可能继续提议其他调用，因此执行器需要步骤、时间和成本上限，不能无限递归。

2026-10-01 核对的 DeepSeek Tool Calls 用 `tool_calls` 表达提议，函数 arguments 是需要解析的 JSON 字符串，回传 tool 消息通过 `tool_call_id` 关联。应用应保留原 assistant 调用消息再加入对应结果。其他供应商可能采用内容块或不同结束原因，具体字段留在适配层，不传播到每个业务组件。

下面模拟这一轮次。保存为 `tool-round.mjs`，用 Node.js 22 执行。数组是手工编写的模型候选；注册表只提供一个只读工具，不访问真实账户或服务。

```js example=aiapp04-tool-round
const registry = new Map([
  ['search_notes', args => ({ items: [{ id: 'note-1', title: `关于${args.query}的笔记` }] })]
]);
const calls = [
  { id: 'call-a', name: 'search_notes', arguments: '{"query":"闭包"}' },
  { id: 'call-b', name: 'delete_notes', arguments: '{}' },
  { id: 'call-c', name: 'search_notes', arguments: '{"query":7}' }
];
const results = calls.map(call => {
  const reply = (code, value = null) => ({ role: 'tool', tool_call_id: call.id, content: JSON.stringify({ code, value }) });
  const run = registry.get(call.name);
  if (!run) return reply('unsupported_tool');
  let args;
  try { args = JSON.parse(call.arguments); } catch { return reply('malformed'); }
  if (!args || Array.isArray(args) || typeof args !== 'object' || Object.keys(args).length !== 1
      || typeof args.query !== 'string' || !args.query.trim() || args.query.length > 40) return reply('invalid_args');
  return reply('ok', run(args));
});
for (const result of results) console.log(`${result.tool_call_id}: ${JSON.parse(result.content).code}`);
console.log(JSON.parse(results[0].content).value.items[0].title);
// => call-a: ok
// => call-b: unsupported_tool
// => call-c: invalid_args
// => 关于闭包的笔记
```

第二项没有通过“名字相似”找到删除实现，第三项也没有把数字悄悄转成查询文本。每个结果都保留原调用 ID，不能把并行返回数组的第一个结果当成第一个请求的结果。例子假定外层调用包已由供应商适配器校验，只展示工具选择和参数边界；真实适配器还应限制名称、ID、参数字节数和调用数量，并检查结果合同。

### 二、工具合同应说明能力与后果

工具描述帮助模型理解用途，服务端注册表决定实际可用范围。二者不能互相替代。为“搜索笔记”开放一个有限查询，比暴露任意 SQL 更容易界定输入、对象范围和返回内容；但把一个动作切成过多小工具，也会增加调用成本和编排难度。

**副作用（Side Effect）**是操作对程序外部可观察状态产生的改变，例如创建计划、发送通知或改变访问权限。不要只看 GET/POST：POST 可以做只读搜索，GET 也可能触发昂贵计算。只读工具仍需授权、隐私与预算控制；是否需要确认应按对象、影响人数、可逆性和产品政策决定。

| 工具 | 输入来自哪里 | 应用继续确定什么 | 结果应带什么 |
| --- | --- | --- | --- |
| 搜索知识 | 模型提出关键词与数量 | 当前用户可见集合、数量上限 | 条目、来源、截断说明 |
| 读取日历 | 用户范围内的时间窗口 | 日历权限与时区 | 明确窗口、事件、读取时间 |
| 创建计划 | 待确认的标题与项目 | 当前主体、批准、对象版本 | 操作 ID、计划 ID、版本 |

身份、租户和服务端批准不接受模型填写。输入和输出都应有版本，错误结果也属于合同：参数错误可以给安全字段提示，权限拒绝不能泄露对象是否存在，内部异常栈不应直接回给模型。Schema 子集和并行工具能力在调用前协商；无工具能力的文本模型不能因输出一段 `<tool>` 就被当成等价实现。

### 三、确认绑定的必须是将要执行的动作

用户确认“创建三项学习任务”，应用却在确认后加入十个项目，这份确认已不对应实际后果。确认界面应展示规范化后的关键参数、影响对象、工具版本和必要费用，批准记录绑定主体、资源范围、参数摘要、有效期及相关对象版本。

参数变化后产生新提议，重新预览；权限撤销或对象改变后重新判断，不能只检查曾经有过一个确认按钮。服务端执行时取得当前认证上下文，以条件写入等方式保护从检查到提交之间的竞争。前端隐藏按钮是体验措施，不是权限证明。

批准快照及过期的完整内存推演见 [AIPROD-02](../chinese-guides/aiprod-02-high-risk-automation-human-in-the-loop.md#aiprod-02)。本讲不重复实现确认令牌，而把注意力放到批准之后仍会发生的响应丢失。真实确认令牌需要服务端保护、范围限制与防重放，示例字符串不能担当这个角色。

### 四、三个 ID 分别回答三个问题

`toolCallId` 把模型提议和回传结果对应起来；`operationId` 标识执行系统中的一次业务操作；**幂等键（Idempotency Key）**使同一业务意图的重复提交找到同一份执行记录。网络尝试又可以有单独的 requestId。它们可能有关联，但不能因为都是字符串就混用。

用户只是在查询“刚才那个计划到底建好没有”，应沿原操作或原幂等键查状态。用户明确改了标题并再次确认，才是一份新意图。同一键带不同参数应冲突，不能返回旧计划后声称新标题已保存。键的作用域要包含可信主体或租户、工具版本等，不把模型生成的字符串当作全局凭证。

下面用单线程内存账本模拟已经获准的计划写入。保存为 `operation-ledger.mjs`，用 Node.js 22 运行。`commitApproved` 的名字表示本实验假定上游已完成确认；函数不实现真实审批或认证，不可直接用作服务端接口。

```js example=aiapp04-operation-ledger
function createLedger() {
  const records = new Map();
  let writes = 0;
  const scope = (tenant, key) => JSON.stringify([tenant, 'create_plan@1', key]);
  const signature = args => JSON.stringify([args.title, args.baseVersion]);
  return {
    commitApproved(tenant, key, args, loseReply = false) {
      if (!args || Object.keys(args).sort().join(',') !== 'baseVersion,title'
          || typeof args.title !== 'string' || !args.title.trim() || args.title.length > 80
          || !Number.isInteger(args.baseVersion)) return { state: 'invalid' };
      const id = scope(tenant, key), digest = signature(args), old = records.get(id);
      if (old) return old.digest === digest ? { ...old.result } : { state: 'conflict' };
      if (args.baseVersion !== 1) return { state: 'stale' };
      writes += 1;
      const result = { state: 'succeeded', operationId: `op-${writes}`, planId: `plan-${writes}` };
      records.set(id, { digest, result });
      return loseReply ? { state: 'unknown', lookupKey: key } : { ...result };
    },
    query(tenant, key) { return { ...(records.get(scope(tenant, key))?.result ?? { state: 'unknown' }) }; },
    count() { return writes; }
  };
}
const ledger = createLedger();
const args = { title: '本周学习', baseVersion: 1 };
console.log(ledger.commitApproved('demo', 'intent-1', args, true).state);
console.log(ledger.query('demo', 'intent-1').state);
console.log(ledger.commitApproved('demo', 'intent-1', args).planId);
console.log(ledger.commitApproved('demo', 'intent-1', { ...args, title: '下周学习' }).state);
console.log(ledger.query('other', 'intent-1').state);
console.log(ledger.count());
// => unknown
// => succeeded
// => plan-1
// => conflict
// => unknown
// => 1
```

第一次调用在“写入”后故意丢弃成功回执，所以调用者只知道 unknown。随后查原意图，才能得到 succeeded；重放原意图不会增加计数，修改参数则冲突。没有记录时仍返回 unknown，是因为单凭查不到不能在所有分布式系统里证明原请求绝未执行；生产系统可以在掌握充分证据时定义更精确的状态。

计数为 1 只证明这个单进程模拟的路径。真实持久层必须原子地保存去重证据与业务效果，外部服务还可能需要自己的幂等支持、对账或补偿；先写内存 Map 再发网络请求不是跨系统事务。相关机制见 [BIZ-07 的原子提交](../chinese-guides/biz-07-errors-idempotency-eventual-consistency.md#五原子提交要把业务效果与识别重复的证据一起保存)。

### 五、未知结果和取消都不能伪装成失败

**未知结果（Unknown Outcome）**表示操作可能已经发生，但当前缺少足够证据判断。网关 502、连接超时、浏览器离开都可能发生在提交前，也可能发生在提交后；状态码本身通常无法区分这两种情况。

前端把本地等待状态和服务端操作状态分开：

| 已知事实 | 卡片文案 | 可提供的动作 |
| --- | --- | --- |
| 只有候选 | 建议创建，尚未执行 | 编辑、确认、拒绝 |
| 已排队或已开始 | 等待执行、执行中 | 按实际支持请求取消 |
| 回执不确定 | 尚无法确认是否创建 | 查询原操作、安全离开 |
| 服务端确认成功 | 已创建，并显示对象链接 | 查看结果 |
| 服务端确认未执行 | 未执行，并说明原因 | 修改后重新确认 |

取消尚未开始的提议可以直接结束；取消浏览器接收只是停止等待；执行中取消需要下游报告事实。若取消请求与成功竞争，以服务端操作版本收敛，不能把较晚到达的旧“执行中”覆盖已确认结果。`unknown → succeeded` 是证据补齐，不是允许任意终态反复变更；succeeded 之后的撤销应作为另一个业务动作记录。

刷新后恢复原操作卡片并查询，不根据模型历史文字推断成功，也不自动重放全部工具调用。查询失败时保留不确定性和已有输入，避免每次刷新都让用户重新描述整个任务。状态序列可参考 [AIAPP-01](../chinese-guides/aiapp-01-model-interface-instructions-context-boundaries.md#六状态和身份让旧结果无法冒充新答案)。

### 六、并行调用首先需要依赖关系

“查资料、建计划、发通知”有先后：查到的材料要通过授权和版本检查，才能用于计划；通知要引用已确认创建的计划。数组里同时出现三份提议，并不意味着可以直接 `Promise.all`。没有依赖的只读检索可以有限并行，写操作需要明确顺序和部分成功策略。

假设计划创建成功、通知失败，真实结果是“计划已创建，通知未发送”。整条链若只显示红色失败，用户可能全部重来。应显示各操作、它们的依赖和可单独恢复的步骤；补偿本身也可能失败，不能把它描述成一定回到过去。

父任务停止时先禁止尚未开始的依赖动作，再向在途操作传播取消请求，最后收集各自结果。步骤、并发、总时间和累计成本共享预算，避免每个分支都各用一份完整额度。受控执行入口如何限制计划后果，见 [AISAFE-02](../chinese-guides/aisafe-02-threat-modeling-red-teaming-abuse-defense.md#四用受控执行器观察错误计划的后果)。

### 七、回流模型的结果仍需要检查

工具结果中可能含用户备注、网页正文或来自外部系统的错误文字。“内部工具”不代表每个字符都可信。结构校验、来源、读取时间、对象版本和截断状态应保留；内容作为数据回流，不能升格成系统指令。模型可以解释结果，但服务端账本才决定卡片状态。

大结果应保留有权限控制的制品入口，并按合同提供摘要和计数。用户点击附件时重新鉴权，不能因为链接藏在成功卡片里就跳过检查。富文本和 URL 在最终解释位置分别处理，不把工具返回字符串直接交给 `innerHTML`。

部分参数流可以显示预览，但 arguments 完整并验证前不执行。收到“参数结束”只意味着调用描述结束，不表示动作完成。协议事件的这一区别在 [AIUI-01](../chinese-guides/aiui-01-agent-ui-protocol-interoperability.md#二事件结束要问结束了什么)继续展开。

### 八、让诊断记录支持下一次恢复

一次工具调用应能从任务找到提议、参数版本、授权决定、确认快照、业务意图键、执行操作和结果版本。日志记录稳定类别与必要摘要，敏感字段按策略裁剪；普通用户只看到可行动的说明和请求编号。模型推测的“正在连接数据库”不能进入权威阶段记录。

当旧会话引用已下线工具时，可以继续显示旧版本结果，但应禁止产生新执行。前端未知结果类型要安全降级，不能默认当成功；工具退役需要保留历史解释和操作查询。注册表不是只服务当前一轮生成的临时函数表。

排错优先核对真实副作用和恢复路径：双击是否重复创建、回执丢失是否先查原意图、过期批准是否产生零次新写入。不要把“模型恰好没选危险工具”当作控制成功；也不必为了每个只读调用增加确认弹窗。安全措施应对应具体后果，并同时保留正常使用路径。

### 带着问题回看

- 一份完整 tool call 参数为什么仍不能让卡片显示“已创建”？
- 哪些 ID 可以在重试时变化，哪些必须继续指向原业务意图？
- 同一键携带不同标题，应返回旧计划还是拒绝？
- 计划成功、通知失败时，用户下一步应该操作哪一项？

### 参考与延伸阅读

核对日期：2026-10-01。实验只验证内存消息与状态，没有真实审批、持久化或外部写入。

- [DeepSeek Tool Calls](https://api-docs.deepseek.com/guides/tool_calls/)：查函数定义、调用 ID、结果回传及 strict 模式前提。
- [RFC 9110 的幂等方法语义](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2)：区分 HTTP 方法幂等与应用自定义业务键。
- [OWASP 过度代理](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)：从功能、权限和自主程度检查工具范围。
