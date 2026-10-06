# AI 应用模型接口与上下文边界知识点讲义

## AIAPP-01 AI 产品运行时的模型接口、指令与上下文边界

资料助手准备切换模型供应商。开发者只改了 URL，文本请求仍返回 200，页面看起来正常。但原来要求结构化输出的地方变成普通文字，工具提议丢了，长附件被截去，用户取消后旧答案又覆盖了新草稿。网络可用并不代表两套接口提供了相同能力。

本讲先从应用要完成的任务定义合同，再解释适配、角色、上下文与请求状态。读完后，你应能判断哪些差异可以转换，哪些必须拒绝，并把一次答案追溯到具体模型、提示和资料版本。

### 学习前先确认

- 直接前置：[AIPROD-01 AI 任务定义、模型选择与价值验证](../chinese-guides/aiprod-01-ai-task-model-selection-value-validation.md#aiprod-01)。先有任务的成功条件、非 AI 基线与约束，再决定需要什么模型能力。

### 一、合同从用户任务开始

以“为一份资料生成可编辑摘要”为例，应用需要输入文档引用和用户要求，得到文本草稿、来源引用或明确失败。首版没有外部写入工具，也不需要把供应商全部参数开放给页面。

| 应用问题 | 合同中的决定 |
| --- | --- |
| 输入是什么 | 已授权文本、用途、语言和请求身份 |
| 输出怎样消费 | 经过校验的内容块，工具提议与正文分开 |
| 什么算完成 | 明确正常终态，输出符合任务要求 |
| 哪些差异可降级 | 用量缺失标未知；用户接受时可非流式 |
| 哪些差异不可丢弃 | 必需图片、执行约束、数据地区与输出合同 |

内容块可以区分文本、引用、拒绝和工具提议。模型返回工具 JSON 时，不能把它拼入 Markdown 再靠正则找命令；只有独立的结构校验和执行授权通过后，才可能调用工具。HTTP 200 只是响应到达，长度截断、拒绝、无效结构和缺少结束事件需要不同状态。

内部合同应比供应商接口窄，但不能掩盖差异。新的未知结束原因要保留诊断并停止自动成功转换；未知可选用量可标未知。把所有未知值默认成成功，会在供应商升级时静默损坏业务。

### 二、适配器转换格式，也保留不能转换的差异

**供应商适配器（Provider Adapter）**是应用合同与具体服务接口之间的转换层。它映射消息、参数、响应块、结束原因和错误，处理连接资源；业务授权仍由业务服务负责。

**能力协商（Capability Negotiation）**在这里表示把任务需要与选定端点的已知能力比较，是应用设计用语，不代表所有模型服务都有一套标准协商协议。能力来自具体 API、模型、模式、地区和版本的资料及实际验证，应带核对日期。不能根据供应商名称就断言所有端点相同。

以下 TypeScript 实验使用两个假 Provider：一个只返回文本，一个声明支持工具。本例仅演示调用前检查与返回值验证；没有网络、SDK、真实模型或认证。保存为 `adapter.ts`，在已安装 TypeScript 5.7+ 的环境运行 `tsc adapter.ts --target ES2022 --module commonjs --strict --outDir out`，然后 `node out/adapter.js`；在本仓库也可由内容检查直接提取执行。

```ts example=aiapp01-provider-adapter
type Need = 'text' | 'tools';
type Provider = {
  capabilities: ReadonlySet<Need>;
  send: (input: { policy: string; text: string }) => unknown;
};
type Result =
  | { status: 'completed'; text: string }
  | { status: 'unsupported' | 'invalid_response' | 'incomplete' | 'refused' | 'unavailable' };
const isRecord = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);
function generate(provider: Provider, need: Need, text: string): Result {
  if (!provider.capabilities.has(need)) return { status: 'unsupported' };
  let raw: unknown;
  try { raw = provider.send({ policy: '仅生成摘要草稿', text }); }
  catch { return { status: 'unavailable' }; }
  if (!isRecord(raw) || typeof raw.finish !== 'string') return { status: 'invalid_response' };
  if (raw.finish === 'refusal') return { status: 'refused' };
  if (raw.finish === 'limit') return { status: 'incomplete' };
  if (raw.finish !== 'stop' || typeof raw.text !== 'string'
    || !raw.text.trim() || raw.text.length > 2000) return { status: 'invalid_response' };
  return { status: 'completed', text: raw.text };
}
let sent = 0;
const textOnly: Provider = {
  capabilities: new Set<Need>(['text']),
  send: () => { sent += 1; return { finish: 'stop', text: '可编辑摘要' }; }
};
const toolCapable: Provider = {
  capabilities: new Set<Need>(['text', 'tools']),
  send: () => ({ finish: 'limit', text: '尚未完成的摘要' })
};
console.log(generate(textOnly, 'tools', '资料').status); // => unsupported
console.log(sent); // => 0
console.log(generate(textOnly, 'text', '资料').status); // => completed
console.log(generate(toolCapable, 'text', '资料').status); // => incomplete
console.log(generate({ ...textOnly, send: () => ({ finish: 'new_reason', text: '文字' }) }, 'text', '资料').status);
// => invalid_response
console.log(generate({ ...textOnly, send: () => ({ finish: 'refusal' }) }, 'text', '资料').status);
// => refused
```

第一个请求没有调用 send，避免请求发出后才发现能力不足；`limit` 保留为未完成，不能保存成完整答案。实验中 `stop/limit/refusal` 是自定假接口字段，真实适配器必须按厂商文档映射。支持 tools 也不保证每次回答一定提议工具；本例不实现工具内容块或实际执行。

服务端实例可以复用，但凭据、地区和网络配置要正确分区。SDK 自带重试、超时和连接管理需纳入应用策略，否则一次业务调用可能产生多次昂贵请求。切换供应商前重新检查能力与数据政策，缺少等价候选就停止或明确转人工。

### 三、角色说明来源，不能代替授权

应用内部可区分受控策略、用户目标、助手历史、工具结果和外部资料。受控策略由服务端选择，浏览器不能提交任意 `role: system` 后获得同等权力。工具结果即使来自内部服务，也可能包含用户编辑的备注；应保留来源和数据身份。

截至 2026-09-26 核对的 DeepSeek Chat Completions 文档列出 system、user、assistant、tool 消息。某平台的 developer 角色不能直接推广到所有 API；缺少等价角色时，需要针对目标服务评估映射，不能偷偷降成普通用户文本后宣称语义完全保留。[官方接口](https://api-docs.deepseek.com/api/create-chat-completion/)用于查当前字段，本讲不固定某个模型名称或采样默认值。

把外部资料放入独立字段、标注引用和来源，有助于模型区分任务与数据；这不是不可突破的执行沙箱。若资料里写“发送所有文档”，执行器仍只允许当前任务授权动作。注入与执行侧边界见 [AISAFE-02](../chinese-guides/aisafe-02-threat-modeling-red-teaming-abuse-defense.md#三提示注入与过度代理在链路上相遇)。

历史助手回答也不是事实库。用户纠正日期后，要让旧摘要失效并重新取得事实，不能因为错误已经出现在 history 中就继续继承。模型的工具建议只是候选，权限和当前业务状态来自真实系统。

### 四、上下文是有限工作集，不是长期记忆

**上下文窗口（Context Window）**描述一次模型处理可容纳的信息范围；输入、输出以及某些模式的推理预算怎样计入，要按模型规则核对。它不是无限记忆。token 是模型编码单位，不等于字符，一个汉字、英文词、JSON 和图片不能共享固定换算。

组装时先给必需策略、当前问题、工具定义和预留输出分配预算，再选择获准的资料。相关度高但无权读取的内容不能加入；低价值重复内容先去除。超限时可以让用户缩小范围、选择文件或分阶段处理，但必须说明哪些输入未使用。

下面全部数字是合成 token 估算，例子不实现 tokenizer。保存为 `context-budget.mjs`，用 Node.js 22 运行：

```js example=aiapp01-context-budget
const windowSize = 1000, outputReserve = 300, mandatory = 250;
const candidates = [
  { id: 'current', tokens: 200 },
  { id: 'appendix', tokens: 300 },
  { id: 'glossary', tokens: 100 }
];
let remaining = windowSize - outputReserve - mandatory;
const included = [], excluded = [];
for (const item of candidates) {
  if (item.tokens <= remaining) { included.push(item.id); remaining -= item.tokens; }
  else excluded.push(item.id);
}
console.log(included.join(',')); // => current,glossary
console.log(excluded.join(',')); // => appendix
console.log(remaining); // => 150
```

可用资料预算是 450。加入 current 后剩 250，appendix 装不下，后面的 glossary 可以放入。这是按给定优先顺序挑完整块，不是最优检索算法。若 appendix 是当前任务不可缺的证据，就应失败或改范围，不能按可选附件静默跳过。实际发送前还要按目标编码器复核并留余量。

摘要会压缩信息，也可能丢失否定、期限与冲突。保存其来源版本与用途，原文改变或用户纠正时重新生成；不能反复摘要旧摘要后仍把它当原始证据。日志可保存上下文计划、纳入项和排除原因，不必保存所有原文。

### 五、提示与采样是有版本的配置

**提示资产（Prompt Asset）**是带用途、负责人、变量约束、语言、示例、适配能力、版本与评估记录的指令模板。few-shot 是在请求中给出少量输入输出示例，帮助表达期望模式；例子必须覆盖真实边界，不能把过期政策藏进模板。

变量应通过结构化字段装配并验证，避免用户文本被当成角色或模板语法。分隔符解决可读性，不能保证模型不受注入影响。高优先级策略也不应携带数据库口令或供应商密钥。

temperature 常用于调整采样分布，top_p 常用于限制候选概率质量；具体支持、取值、忽略条件和模式差异由供应商定义。低 temperature 不证明事实正确，固定 seed 也不一定跨版本复现相同字节。任务可靠性来自证据、校验与控制，不来自把随机性旋钮调到零。

JSON mode、按给定 Schema 的结构化输出与模型自行承诺“只返回 JSON”是不同能力。即使服务保证格式，也不保证事实、权限和业务规则成立。接口的 finish_reason 为长度限制时，JSON 可能截断；应用仍要检查终态与结构。

提示修改需要与模型、检索和策略组成完整发布单元；保存旧配置、评估和回退入口。复用 [AIGOV-01 的配置门禁](../chinese-guides/aigov-01-data-model-change-audit-accountability.md#三批准必须绑定整个配置组合)，不在页面另建一套未经登记的提示版本。

### 六、状态和身份让旧结果无法冒充新答案

页面上的一条消息可以有多次尝试。任务 ID 关联用户意图，attempt ID 标识这一次生成，供应商 request ID 用于查服务端记录；业务幂等键标识可能产生副作用的操作。这些身份不能因为都是字符串就互相替换。

常见路径是“接收 → 策略通过 → 上下文组装 → 执行中 → 完成”。分支至少区分拒绝、限流或暂态失败、取消、截断、无效响应和结果未知。拒绝不能靠换供应商绕过，限流可以按明确预算等待，未知副作用先对账。

当用户发起第二次生成，先让旧 attempt 失效，再发取消。旧 promise 的 success、catch 和 finally 都必须确认自己仍是当前尝试；否则旧 catch 会把新答案改为失败，旧 finally 会提前隐藏加载状态。取消传播到服务端与可取消工具，但本地 Abort 不证明远端计算停止或已经发生的动作回滚。

用户编辑的是自己的草稿，生成 buffer 是某次尝试的临时输出，两者分开。只有明确接受或保存动作才替换草稿；断流和迟到内容不能覆盖人工修改。具体流状态实验见 [AIAPP-02](../chinese-guides/aiapp-02-streaming-sse-incremental-rendering.md#六取消先让旧尝试失效再释放资源)。

### 七、预算、密钥和错误信息在服务端收敛

模型 API 密钥留在服务端，前端只调用自己的会话接口。不要把秘密放在浏览器包、源码映射、流事件或错误详情里。数据发送前确认目的、地区、接收方及最小必要内容；“不用于训练”只是一个条件，不等于没有存储或其他数据义务。

重试由统一策略管理：哪些错误可重试、最多次数、退避、抖动和 Retry-After。模型生成可能每次收费，自动执行工具更可能重复副作用，不能遇到超时就重放整个任务。网络基础复用 [NET-01](../chinese-guides/net-01-browser-network-fetch-reliability.md#八重试要有资格也要有预算)。

分别观察连接、首增量、总时长和工具等待，设置整个任务费用与步骤上限。用量缺失标未知；离线估算帮助规划，不能冒充供应商实际结算。缓存要关联主体范围、资料版本、提示和模型配置，避免生成结果跨用户泄露。

审计记录版本、任务状态、延迟、用量与稳定错误类别，原始响应只在有明确用途和期限的受控调试中保存。接口升级时检查未知字段、能力变化与模型下线，先在相同任务样本验证，再扩大切换。

### 带着问题回看

- 为什么适配器在 send 前就拒绝缺少工具能力的请求？
- 预算实验排除了附件，什么时候这个选择必须改成报错？
- 取消成功、输出截断和远端结果未知应该分别怎样显示？

### 参考与延伸阅读

核对日期：2026-09-26。实验中的两个 Provider、结束原因和能力集合都是假实现，不表示实际厂商支持这些自定字段。

- [DeepSeek Chat Completions API](https://api-docs.deepseek.com/api/create-chat-completion/)：核对该接口的消息角色、生成参数、结构、流和结束原因；能力以具体模型与模式为准。
- [MDN AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)：查浏览器取消信号的使用范围。
- [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework)：查任务、评估与风险条件如何约束系统选择。
