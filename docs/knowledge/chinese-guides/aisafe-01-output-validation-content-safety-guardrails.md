# AI 输出安全与分层校验知识点讲义

## AISAFE-01 输出校验、内容安全与 Guardrails

资料助手生成了“订单已退款”，还附上一个“查看详情”链接。句子通顺，JSON 也能解析，但订单其实属于别人，链接指向陌生站点，退款更没有发生。问题出在三个不同地方：谁能访问订单、链接能去哪里、结论有没有事实依据。让模型再检查一次语气，解决不了这些问题。

本讲沿一张“资料摘要卡”建立输出控制：先认清输出将交给谁，再检查结构、授权、解释器和证据，最后处理内容风险与无法判断的情况。读完后，你应能说明每道检查证明了什么，并给失败保留可继续的路径。

### 学习前先确认

- 直接前置：[SEC-01 XSS、CSRF 与 Web 信任边界](../chinese-guides/sec-01-xss-csrf-trust-boundaries.md#sec-01)。模型生成的数据和普通外部输入一样，不能自行获得代码执行权或用户权限。

### 一、从最终用途倒推要检查什么

输出是纯文本时，`<img>` 只是几个字符；插入 `innerHTML` 后，它可能变成元素并引发请求。同一段字符串作为 SQL、Shell 或工具参数，又进入另一种解释规则。因此先写清消费位置，才能选择控制。

| 输出去哪里 | 需要确认什么 | 单独做这件事仍证明不了什么 |
| --- | --- | --- |
| 摘要正文 | 作为文本显示，内容符合任务政策 | 事实正确、没有隐私泄露 |
| 可点击链接 | 解析后的协议、来源、路径符合用途 | 目标内容可信、服务器抓取没有 SSRF |
| 工具参数 | 结构合法、主体获权、对象状态允许 | 用户已经批准所有副作用 |
| 对外答复 | 事实与引用支持结论，完成必要复核 | 第三方一定会正确理解 |

**安全护栏（Guardrail）**是围绕这些使用路径设置的限制、检测和恢复措施。它不是某个分类器的别名。分类器可以提示风险，URL 允许集合可以限制跳转，执行器可以拒绝越权；三者负责不同事实。先画出路径，再决定需要哪些层，比在每次调用前后重复加一个“请安全回答”更有用。

输出进入下一层时，保留来源、请求身份和校验结果，但不要给整段文本打一个永久的“可信”标签。通过文字审核的内容一旦变成命令，必须重新判断。

### 二、解析成功之后，仍要检查对象和动作

**输出校验（Output Validation）**是把外部返回逐步变成应用可接受数据的过程。第一步通常是限制大小并解析；然后按 Schema 检查字段、类型、枚举、额外属性及集合上限。`JSON.parse` 只证明语法，TypeScript 类型只描述开发时的预期，两者都不会确认金额、租户或业务状态。

例如卡片要求 `documentId` 和 `summary`。模型给出两个字符串，形状没错；但 `documentId` 指向另一个团队的文档，仍必须拒绝。读取主体来自已认证的服务端会话，不能来自模型附带的 `tenantId`。返回“没有权限或资料不可用”通常比向无权者确认文档存在更合适。

下面是可独立运行的内存实验。保存为 `output-gate.mjs`，使用 Node.js 22 运行，或整体放入现代浏览器控制台。数据、身份与规则均为教学自编，没有真实认证、模型或网络请求。它只验证这张固定卡片，不是通用 Schema 实现。

```js example=aisafe01-output-gate
const documents = new Map([
  ['d1', { tenant: 't1', text: '资料每周五更新。' }],
  ['d2', { tenant: 't2', text: '另一团队的内部资料。' }]
]);
function safeLink(value) {
  try {
    const url = new URL(value);
    return url.origin === 'https://docs.example.test'
      && !url.username && !url.password && !url.search && !url.hash
      && url.pathname === '/help';
  } catch { return false; }
}
function inspect(raw, session, policy = 'ready') {
  if (typeof raw !== 'string' || raw.length > 2000) return 'size';
  let card;
  try { card = JSON.parse(raw); } catch { return 'syntax'; }
  const keys = ['documentId', 'summary', 'quote', 'link'];
  if (!card || Array.isArray(card) || typeof card !== 'object'
    || Object.keys(card).length !== keys.length
    || !keys.every((key) => typeof card[key] === 'string')
    || !card.summary.trim() || card.summary.length > 300) return 'shape';
  const source = documents.get(card.documentId);
  if (!source || source.tenant !== session.tenant) return 'unavailable';
  if (!safeLink(card.link)) return 'link';
  if (!card.quote.trim() || !source.text.includes(card.quote)) return 'evidence';
  if (policy !== 'ready') return 'review_unavailable';
  return 'candidate';
}
const session = { tenant: 't1' }; // 模拟服务端已知身份，不能由卡片提供。
const card = { documentId: 'd1', summary: '资料在周五更新。',
  quote: '每周五更新', link: 'https://docs.example.test/help' };
const run = (patch, policy) => inspect(JSON.stringify({ ...card, ...patch }), session, policy);
console.log(run({})); // => candidate
console.log(run({ tenantId: 't2' })); // => shape
console.log(run({ documentId: 'd2' })); // => unavailable
console.log(run({ link: 'javascript:void(0)' })); // => link
console.log(run({ link: 'https://docs.example.test.evil.test/help' })); // => link
console.log(run({ quote: '每天更新' })); // => evidence
console.log(run({}, 'timeout')); // => review_unavailable
console.log(run({ summary: '保证每天更新' })); // => candidate
```

最后一项故意通过：引用确实出现了，但摘要与它矛盾。检查“引用字符串存在”只能排除一部分伪造引用，不能证明引用支持结论。`candidate` 因此表示“可进入下一步”，不叫 `safe`。本例的 `policy` 是注入的模拟状态，没有运行内容审核；摘要也没有插入 DOM，更没有执行工具。

把输入改成数组、空摘要或增加 `admin` 字段，可以观察结构层拒绝；把来源换成别人拥有的文档，则由授权层拒绝。层次清楚以后，错误才能对应到正确的修复者。运行时解析的完整模型见 [TS-07](../chinese-guides/ts-07-runtime-contracts-validation-error-models.md#四解析归一化与业务校验分开决定)。

### 三、在真正使用内容的位置守住解释边界

纯文本展示优先使用文本节点；需要 Markdown 时，禁用原始 HTML 或对最终解析结果采用严格净化策略。不要先“检查过字符串”，再拼进新的 HTML 属性、脚本或样式。上下文变了，之前的证明就不成立。已有的 [SEC-01 安全预览实验](../chinese-guides/sec-01-xss-csrf-trust-boundaries.md#四运行一个只允许少量富文本的预览页)展示了受限富文本入口。

链接规则要在 URL 解析后判断。`startsWith('https://docs.example.test')` 也会接受 `https://docs.example.test.evil.test`。上例比较完整 origin，并限制路径及查询；这是“固定帮助页”的应用政策，不适合原样套到所有链接。若服务端要抓取该地址，还要检查 DNS、重定向和网络出口，浏览器链接校验不能代替 SSRF 防护。

金额查询使用数据库参数化接口，代码生成默认作为文本交付，确需运行则进入明确的沙箱。对 Shell 命令，优先将动作固定成受控 API，并校验参数；“去掉分号”不构成命令执行安全。

流式内容也不能按每个网络块独立净化后拼接：危险标记可能跨块，Markdown 的链接、代码围栏也未必完整。先纯文本预览，或在受控解析边界更新，终态再核对完整表示，详见 [AIAPP-02 的渲染边界](../chinese-guides/aiapp-02-streaming-sse-incremental-rendering.md#七渲染批次不等于安全边界)。

### 四、事实、隐私与内容政策是三种判断

事实核对要分别问：来源是否存在、当前用户能否读取、原文是否支持这条结论、版本是否仍有效。来源只说“可以申请”，模型写成“已经批准”，即使引用链接真实也不合格。计算交给确定程序，原始输入和结果关联；来源冲突时展示冲突，不按哪个更顺口来选择。

隐私控制关心的是数据能否用于当前目的和接收者。订单号可以出现在本人订单页，却不应出现在公开错误日志。秘密、个人信息、私有 URL 和敏感推断需要分类处理；正则能找某些格式，找不到全部身份线索，更无法独自决定用途是否正当。优先在检索和上下文阶段不发送不必要数据，输出检测是补充防线。

内容政策则区分任务意图、风险类别和允许的帮助方式。同样提到危险行为，教育分析、受害者求助与操作性协助应采用不同处理。规则要给出可观察的判定依据和安全替代，不能用“出现这个词就拒绝”代替场景判断。对不支持的语言、混合编码和缺少上下文的片段，记录无法判断，而不是默认安全。

把所有失败变成一个“违规”会伤害恢复：事实不足应补来源，越权应走权限流程，模型格式错误应由系统修复，内容不适合则提供安全范围内的替代。

### 五、阈值的代价要从具体样本看

分类器分数通常是某模型在某任务上的信号，不自然等于真实风险概率。以下合成标签中 `1` 表示应拦截，分数越高越倾向拦截。保存为 `threshold.mjs` 后运行：

```js example=aisafe01-threshold
const samples = [
  { harmful: true, score: 0.9 }, { harmful: true, score: 0.4 },
  { harmful: false, score: 0.8 }, { harmful: false, score: 0.1 }
];
function count(threshold) {
  let missed = 0, blockedNormal = 0;
  for (const x of samples) {
    const blocked = x.score >= threshold;
    if (x.harmful && !blocked) missed += 1;
    if (!x.harmful && blocked) blockedNormal += 1;
  }
  return `漏过 ${missed}；误拦 ${blockedNormal}`;
}
console.log(count(0.5)); // => 漏过 1；误拦 1
console.log(count(0.3)); // => 漏过 0；误拦 1
console.log(count(0.85)); // => 漏过 1；误拦 0
```

降低阈值减少这里的漏过，却不能据四个样本决定生产策略。真实选择需要独立标注集、样本分母、严重程度、语言切片、标注分歧和人工容量。中间区域可以转人工，但审核队列不是无限的；复用 [AIPROD-02 的容量解释](../chinese-guides/aiprod-02-high-risk-automation-human-in-the-loop.md#八审核队列不是无限容量的兜底)。

监控阻断率上涨，可能表示攻击增多，也可能是正常用户被误拦或服务异常。应一起看严重漏报、申诉纠正、等待与任务完成，版本更新后重新校准。固定回归样本用于防倒退，新鲜样本用于发现未知失败，两者不能相互替代。

### 六、无法判断时，保留工作而暂停危险动作

**安全失败（Fail Closed）**是关键判断不可用时不继续依赖该判断的动作。例如授权服务超时，不能把删除请求当作已授权；审核服务不可用，可以保留用户草稿并提示稍后复核。它不要求无关页面一起白屏。

失败默认应按用途明确：普通文本渲染器故障可退回文本展示，但隐私审核未完成时，退回纯文本仍可能泄露，因此也不能发布。已经发生的副作用遇到超时则先查状态，不能以“护栏失败”为理由重新执行。用户确认与执行授权的区别见 [AIPROD-02 的确认快照](../chinese-guides/aiprod-02-high-risk-automation-human-in-the-loop.md#四确认必须绑定即将执行的具体版本)。

人工复核要看最少必要上下文和规则版本，可以纠正当前决定，不能随手关闭全局控制。申诉保留原决定与新证据，展示稳定原因和下一步；不公开秘密、内部堆栈或可用来精确探测防线的细节。对重复申诉可以限流，但正常用户不应因此失去全部草稿。

### 七、让几道控制分别承担责任

**纵深防御（Defense in Depth）**的价值在于不同层限制不同后果。例如分类器误放危险 URL，最终链接策略仍拒绝；模型提出跨租户读取，执行器仍按会话拒绝。连续问三个同类模型“是否安全”，可能共享同一盲点。

可以为每条路径写一张小表：输入、预期阻断层、实际结果、用户剩下什么。先用正常摘要证明功能仍可用，再单独改变链接、身份、引用和审核可用性。检查的是最后是否产生危险效果，而不只是日志是否写了“blocked”。

审计保留请求 ID、来源版本、规则类别、授权结果与最终动作。必要的敏感样本存入有权限和期限的证据库；普通日志不复制完整提示或秘密。这样事故可以追踪，又不会由审核系统制造第二次泄露。

### 带着问题回看

- 最后一个摘要样本为什么通过，却仍不能直接作为事实发布？
- 纯文本可以防止 HTML 执行，为什么不能代替隐私审核？
- 审核超时、权限拒绝和来源缺失应给用户哪些不同动作？

### 参考与延伸阅读

核对日期：2026-09-26。实验为固定内存规则，不代表完整内容审核或安全认证。

- [OWASP 提示注入防护](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)：查模型防护的限制与执行侧控制。
- [OWASP XSS 防护](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)：查编码、净化与最终上下文的分工。
- [Chrome 流式内容呈现](https://developer.chrome.com/docs/ai/render-llm-responses)：查文本追加、Markdown 与安全插入的边界。
- [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework)：查风险度量、持续处理及组织责任。
