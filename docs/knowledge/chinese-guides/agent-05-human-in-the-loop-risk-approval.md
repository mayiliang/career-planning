# Agent 人工介入、风险分级与审批知识点讲义

## AGENT-05 Human-in-the-loop、风险分级与可验证审批

助手准备把课程公告发到团队频道。你看过正文并批准，随后它为“扩大覆盖面”把目标换成公开频道，还沿用刚才的批准。确认框确实出现过，但用户确认的对象和最终执行的对象已经不同。

有效审批要把人看到的内容、人的决定和执行器将做的动作连接起来。本篇先解释补充信息与批准动作的区别，再用范围额度和完整页面实验观察参数改变、拒绝、撤销与迟到决定。读完应能指出审批在哪一步失效，并让任务保留成果而停止未获准动作。

### 学习前先确认

- 直接前置：[AGENT-01 Agent 循环、规划、停止与恢复](../chinese-guides/agent-01-loop-planning-stopping-recovery.md#agent-01)，理解等待与执行状态；[AGENT-04 MCP Client 发现、能力与兼容](../chinese-guides/agent-04-mcp-client-discovery-compatibility.md#agent-04)，理解宿主如何选择能力和确认服务身份。

### 一、让人介入时，人必须仍能改变结果

**人工介入（Human in the Loop）**是在自动化过程中，让有权限的人查看必要事实、补充判断、修改、批准、拒绝或接管，并让决定约束后续执行。动作已经不可撤回之后才通知用户，属于事后告知，不能算执行前审批。

**风险等级（Risk Tier）**根据影响范围、可逆性、数据敏感度和不确定性决定控制强度。名称相同的工具可能产生不同风险：删除临时草稿与删除正式档案，向本人发送预览与向公众发布，都不能因为使用同一个函数就采用同样策略。

| 动作情境 | 用户需要核对的事实 | 控制重点 |
| --- | --- | --- |
| 删除资料 | 哪些对象、是否共享、能否恢复 | 精确对象与恢复边界 |
| 发送消息 | 收件人、正文、附件和数据去向 | 接收对象与外部影响 |
| 支付申请 | 收款方、币种、金额及累计额度 | 独立授权与资金边界 |
| 发布内容 | 环境、受众、内容版本和撤回条件 | 公开范围与最终制品 |

这张表是教学比较，不是适用于所有组织的风险政策。正式规则应由业务负责人制定并版本化，模型可以提示风险，不能替自己降低等级。高风险自动化的整体产品决策复用 [AIPROD-02 的影响分级](../chinese-guides/aiprod-02-high-risk-automation-human-in-the-loop.md#一按后果和影响范围决定自动化程度)，本篇重点是把一次决定落到可执行边界。

### 二、补充输入与授予权限走不同判断

“请选一个频道”是在补全参数，“允许把这段正文发到此频道”是在批准外部动作。用户提供参数，不自动表示允许执行。登录成功也只说明认证完成，不能替代具体交易或发布授权。

MCP 2026-07-28 的多轮请求用 `InputRequiredResult` 承载缺少的输入。Server 在支持该模式的方法上返回 `resultType: "input_required"`，用 `inputRequests` 映射描述请求，也可以返回不透明的 `requestState`。例如某个映射键对应 `elicitation/create` 表单，请用户补充发布范围；客户端先确认自身声明支持该能力，再决定如何呈现。

用户回答之后，Client 对原请求发起新一轮调用：JSON-RPC id 必须不同，回应键对应原来的输入请求键，requestState 如有则原样回传，不能转用到并行的另一个请求。Server 把回传状态当作不可信输入；凡影响权限、资源访问或业务逻辑的状态，都需要验证完整性。短时效与主体绑定可以缩小重放风险，但要保证只能消费一次，仍需服务端记录。

Elicitation 是输入交互机制，不是通用支付审批系统。表单的 accept/decline/cancel 要映射到应用自己的决定与状态；accept 也不代表工具的所有未来动作获准。口令、令牌等秘密应走合适的认证通道，不经普通文本表单交给模型。长期任务中的输入通过 Tasks 的更新流程提交，不能把普通 MRTR 继续调用与 `tasks/update` 混成同一个接口。

### 三、批准绑定一份不可变提议

提议应包含服务与工具身份、目标对象、关键参数、资源版本和预期影响。界面从这份结构化提议生成，模型的摘要只能帮助阅读；不能让摘要写“发到团队”，实际参数却是 public。

**审批令牌（Approval Token）**是应用用来引用或证明有效审批的凭证。它可以是服务端审批记录的随机引用，也可以是受保护的声明；不是 MCP 统一规定的某个 token 字段。执行器核对主体、提议摘要、对象版本、策略版本、期限和消费状态，不能只信前端传来的 `approved: true`。

用户编辑正文、收件人或金额后生成新提议版本，旧批准不再匹配。资源本身被别人修改时，也可能需要重新确认或条件写入。仅把 JSON 做哈希而不统一字段、默认值与规范化方式，容易产生比较歧义；生产实现要对验证后的结构使用稳定表示。

范围明确后，再安排执行的原子边界。批准检查、额度预留和动作意图登记应避免并发穿透；外部响应丢失时按原操作对账，不能重新批准并重复执行。批准、业务幂等与回执是互补记录，参见 [工具提议的确认绑定](../chinese-guides/aiapp-04-tool-calling-execution-result-ui.md#三确认绑定的必须是将要执行的动作)。

### 四、范围授权还要防止多次小动作绕过上限

**授权范围（Scope of Authorization）**说明谁可以对哪些对象、用什么动作、在什么期限和次数或额度内执行。一次允许不意味着永久允许；金额上限也要说明是单笔还是累计，否则两笔看似都没越界的请求仍可能超过用户真正批准的总量。

保存为 `approval-budget.mjs`，用 Node.js 22 执行。下方用合成金额“分”和固定时间演示累计范围，只有同步内存账本，不会转账，也不提供真实权限隔离。

```js example=agent05-approval-budget
const grant = { actor: 'user-a', tool: 'pay', recipient: 'vendor-a', currency: 'CNY',
  remaining: 100000, expiresAt: 1000, revoked: false };
const ledger = new Map();
function reserve(action, now) {
  if (grant.revoked || now >= grant.expiresAt) return 'inactive';
  if (['actor', 'tool', 'recipient', 'currency'].some(key => action[key] !== grant[key])) return 'out-of-scope';
  if (!Number.isSafeInteger(action.amount) || action.amount <= 0) return 'invalid-amount';
  const previous = ledger.get(action.id);
  if (previous) return previous.amount === action.amount ? 'replayed' : 'id-conflict';
  if (action.amount > grant.remaining) return 'needs-new-approval';
  grant.remaining -= action.amount;
  ledger.set(action.id, { amount: action.amount });
  return 'reserved';
}
const action = { id: 'a-1', actor: 'user-a', tool: 'pay', recipient: 'vendor-a', currency: 'CNY', amount: 60000 };
console.log(reserve(action, 100), grant.remaining);
// => reserved 40000
console.log(reserve(action, 100), grant.remaining);
// => replayed 40000
console.log(reserve({ ...action, id: 'a-2' }, 100));
// => needs-new-approval
console.log(reserve({ ...action, id: 'a-3', tool: 'publish' }, 100));
// => out-of-scope
console.log(reserve({ ...action, amount: 50000 }, 100));
// => id-conflict
grant.revoked = true;
console.log(reserve({ ...action, id: 'a-4', amount: 1000 }, 100));
// => inactive
```

第一笔预留 600 元后只剩 400 元，相同逻辑动作重发不再扣减；另一笔 600 元需要新批准，换成发布动作也不在范围内。撤销后阻止新的预留。已经产生的业务回执仍应在有权查询的接口中保留，不因授权撤销就抹去历史。

实际服务需要把比较与预留放入原子事务，避免两个执行者同时看到 1000 元余额。预留何时结算或释放取决于动作事实：结果未知时不能立即释放并重发；并发预算机制复用 [AI 运行成本的预留](../chinese-guides/aiapp-09-cost-quota-cache-reliability.md#二预算预留先发生后续请求才看得到额度已被占用)。

### 五、运行一页提议修改与拒绝实验

将完整页面保存为 `approval-review.html`，用现代桌面浏览器打开。所有状态只在本页内存，刷新即清空。“模拟执行”只增加本地计数，不发布任何内容。令牌、身份与服务端隔离没有在这个页面中实现；它用于看清用户操作与状态迁移。

```html example=agent05-approval-review runtime=project file=approval-review.html
<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<title>审批绑定实验</title>
<style>
body { max-width: 820px; margin: 36px auto; padding: 0 24px; font: 17px/1.65 system-ui; }
textarea { display: block; box-sizing: border-box; width: 100%; min-height: 110px; font: inherit; }
button, select { padding: 8px; margin: 8px 8px 8px 0; font: inherit; }
pre { white-space: pre-wrap; overflow-wrap: anywhere; background: #eef4f1; padding: 16px; }
:focus-visible { outline: 3px solid #236b9a; outline-offset: 3px; }
</style>
<h1>发布前审阅</h1>
<p>本地模拟，不会发出消息；刷新丢失内容。</p>
<label for="audience">发布范围</label>
<select id="audience"><option value="team">团队频道</option><option value="public">公开频道</option></select>
<label for="draft">公告正文</label>
<textarea id="draft">本周五更新学习资料。</textarea>
<button id="prepare">生成待审提议</button>
<h2>待审快照</h2><pre id="snapshot">尚无提议</pre>
<button id="allow" disabled>允许一次</button><button id="deny" disabled>拒绝</button>
<button id="revoke" disabled>撤销批准</button><button id="execute" disabled>模拟执行</button>
<button id="late" disabled>模拟迟到批准</button>
<p id="status" role="status" aria-atomic="true">请先准备提议。</p>
<p>模拟执行次数：<output id="count">0</output></p>
<script type="module">
const el = id => document.getElementById(id);
let revision = 0, sequence = 0, proposal = null, delayed = null, executions = 0;
function render(message) {
  el('status').textContent = message;
  const current = proposal && proposal.revision === revision;
  el('allow').disabled = !current || proposal.state !== 'pending';
  el('deny').disabled = !current || proposal.state !== 'pending';
  el('revoke').disabled = !current || proposal.state !== 'approved';
  el('execute').disabled = !current || proposal.state !== 'approved';
  el('late').disabled = delayed === null;
  el('count').textContent = executions;
  el('snapshot').textContent = proposal ? JSON.stringify(proposal, null, 2) : '尚无提议';
}
function changed() {
  revision++;
  if (proposal && ['pending', 'approved'].includes(proposal.state)) proposal.state = 'outdated';
  render('内容或范围已改变，旧审批失效；草稿保留。');
}
el('draft').addEventListener('input', changed);
el('audience').addEventListener('change', changed);
el('prepare').onclick = () => {
  if (!el('draft').value.trim()) { render('请填写正文。'); return; }
  proposal = { id: ++sequence, revision, audience: el('audience').value,
    text: el('draft').value, state: 'pending' };
  delayed = { id: proposal.id, revision };
  render('请核对快照中的正文与发布范围。');
};
function approve(decision) {
  if (!proposal || decision.id !== proposal.id || decision.revision !== revision || proposal.state !== 'pending') {
    render('已拒绝过期或不再适用的批准。'); return;
  }
  proposal.state = 'approved'; render('仅批准当前快照，尚未执行。');
}
el('allow').onclick = () => approve({ id: proposal.id, revision });
el('late').onclick = () => approve(delayed);
el('deny').onclick = () => { proposal.state = 'denied'; render('已拒绝；草稿保留，不会执行。'); };
el('revoke').onclick = () => { proposal.state = 'revoked'; render('批准已撤销；尚未执行。'); };
el('execute').onclick = () => {
  if (!proposal || proposal.revision !== revision || proposal.state !== 'approved') {
    render('当前没有适用的批准。'); return;
  }
  proposal.state = 'executed'; executions++; render('仅完成一次本地模拟；没有真实发布。');
};
render('请先准备提议。');
</script>
</html>
```

先生成提议并允许，再把团队频道改成公开频道：旧快照变为 outdated，执行按钮禁用，草稿仍在。点击“模拟迟到批准”也不能恢复旧授权。再生成一份提议后拒绝，重复迟到批准依然不能执行，因为 denied 没有回到 approved 的转换。

另走一遍允许、撤销批准，确认计数不变；正常允许并执行只增加一次，执行后按钮禁用。页面没有自动重试，也不把没有回应当同意。它验证了可见状态，不能证明攻击者无法绕过前端；实际批准检查必须位于服务端执行路径。

### 六、拒绝、撤销和接管都要保留任务连续性

拒绝一个动作不等于删除整个会话。保留草稿和已完成的只读成果，说明被阻止的动作，提供修改、手动处理或结束任务的选择。不能改用同义工具重复申请，直到用户疲劳后点击同意。

撤销阻止尚未提交的动作；已经发出的消息或发布内容可能无法完整收回。界面应区分已完成、在途、未知和未开始，补偿作为新的业务动作单独判断。审批服务不可用时保留提议并停止高影响执行，不用“系统繁忙”作为跳过检查的理由。

人工接管需要实际接收者与回执，并移交当前目标、原始依据、提议版本、未决操作和权限限制。自动执行者进入暂停状态，避免人与 Agent 同时改同一对象。恢复时重新核对主体、资源与策略，旧审批不会因为页面仍开着就永久有效。

旧版 MCP 客户端的交互由适配器处理。旧版 Server 发起请求与新版 input_required 返回的形态不同；缺少支持时，可以提供只读预览或手动路径，不能伪造 accept。协议允许某种交互，不代表每个宿主已经实现可信审批 UI。

### 七、审核质量靠人看得懂，也靠执行端守得住

审批界面首先展示目标、范围、内容差异和不可逆后果，再按需展开技术细节。批量操作应显示数量、筛选条件和完整清单入口，不能只展示一个示例就让用户批准所有对象。风险文案用具体后果，不用泛泛的“请注意安全”。

减少确认疲劳可以通过清晰的低风险范围授权和合并有意义的检查点实现，但不能隐藏实际扩大后的范围。组织要求双人复核时，需要两个独立有权主体，不能让同一模型模拟两个角色。职责与角色设计继续参阅 [双人审批](../chinese-guides/aiprod-02-high-risk-automation-human-in-the-loop.md#五双人审批必须是两个独立决定)。

审计至少能还原用户当时看见的版本、谁作出决定、依据哪版政策、执行的参数及最终回执，同时最小化敏感正文。批准率高不一定表示安全，可能是确认疲劳；用错误收件人、范围扩大等合成异常检查用户是否识别，再检查服务端是否确实拒绝不匹配动作。

桌面键盘、焦点和状态播报也是判断的一部分。不要在生成新提议时抢走草稿焦点，不能只靠颜色区分拒绝与允许。浏览器实验未验证真实读屏或人员响应质量，这些需要相应环境；无需因此建立与本系统无关的移动产品界面。

### 自检问题

1. 用户填写频道为什么不等于批准发布？
2. requestState 原样回传，为什么 Server 仍需校验它？
3. 两笔金额分别低于上限，何时仍应重新审批？
4. 审批撤销时远端动作结果未知，为什么不能直接显示“没有执行”？

### 参考与延伸阅读

- [MCP：Multi Round-Trip Requests](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr)：查输入请求映射、不同 JSON-RPC id、状态回传与防篡改要求。
- [OWASP：Transaction Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html)：查服务端强制授权、交易数据绑定、时效和防止跳过状态步骤的原则。
- [MCP：Tasks](https://modelcontextprotocol.io/extensions/tasks/overview)：对照长任务 input_required 与 tasks/update，避免混用两类继续流程。

核对日期：2026-10-05。风险表、审批状态与额度是应用教学约定；本地模拟不构成真实审批、支付或权限隔离验证。
