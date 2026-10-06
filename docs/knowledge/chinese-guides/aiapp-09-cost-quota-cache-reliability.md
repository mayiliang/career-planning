# AI 成本、配额、缓存与可靠性知识点讲义

## AIAPP-09 成本、配额、缓存与可靠性

政策助手平时一次就能回答，周一早上却出现大量等待。客户端遇到 429 后重试，服务端 SDK 也重试；有些用户刷新页面又发起一轮。最后多数人看到了答案，账单却明显上涨，还有人收到昨天缓存的旧政策。

这一篇沿一次任务解释用量、预算、排队、缓存和重试。读完后，你应能说明一笔费用来自哪次尝试，在并发下保住预算，并判断什么时候应该等待、重新生成、查询结果或停止。实验使用虚构计价点、内存状态和合成时间线，不代表真实价格、账单或生产容量。

### 学习前先确认

- 直接前置：[AIAPP-01 模型接口、指令与上下文边界](../chinese-guides/aiapp-01-model-interface-instructions-context-boundaries.md#aiapp-01)，用于理解供应商能力和用量适配；[NET-01 浏览器网络、Fetch 与可靠性](../chinese-guides/net-01-browser-network-fetch-reliability.md#net-01)，用于理解 HTTP、超时、取消与重试。这里在两者之上建立任务级运行策略。

### 一、先把一次任务的所有尝试记到同一本账

**成本账本（Cost Ledger）**关联一次任务产生的模型、检索、工具、媒体与其他费用，保留它们的计量依据和状态。任务可能只有一个 runId，却包含多个 providerRequestId 和 attemptId；只记录最后成功的那次，会把失败重试的消耗丢掉。

调用前用 tokenizer 或估算公式保护上下文和预算；调用后根据接口 usage 结算暂估费用，再按供应商账单对账。字符数与 token 数并不固定等价。输入、输出、推理和缓存字段也可能有包含关系，必须依据具体接口解释，不能把所有名为 token 的字段直接相加。

下面用虚构单位“点”演示重复计数。保存为 `usage-accounting.mjs`，在 Node.js 22 执行 `node usage-accounting.mjs`，或在现代浏览器控制台单独运行。此合同约定 `output` 已包含 `reasoning`；所有单价仅用于整数计算教学。

```js example=aiapp09-usage-accounting
const price = { version: 'demo-p1', miss: 2, hit: 1, output: 4 };
const usage = { input: 100, hit: 80, output: 20, reasoning: 5 };
const miss = usage.input - usage.hit;
const cost = miss * price.miss + usage.hit * price.hit + usage.output * price.output;
console.log(miss, cost);
// => 20 200
console.log(cost + usage.reasoning * price.output);
// => 220
```

第二次计算多收了 20 点，因为推理部分已包含在输出中。换到把推理单独计费的接口，适配器应改变合同，而不是沿用这里的公式。图像、音频时长、搜索次数、存储和人工复核也可能单独计费；账本保存币种、单位、有效日期与价格版本，跨币种不要直接求和。

usage 未返回时标为未知，不能填零。流中断和用户取消尤其容易缺少最终用量，先留下待对账记录，按供应商回执或账单补齐。应用内同一事件重复上报可以去重，但重新向供应商发起的两次推理，可能确实产生两笔费用。

截至 2026-10-02，DeepSeek 文档要求以实际返回 usage 核对 token 用量。文中的估算比率不应写成跨模型的精确换算常量；具体计费字段、价格和缓存规则在接入时按当前接口核验。

### 二、预算预留先发生，后续请求才看得到额度已被占用

预算约束累计消耗，可以按单次尝试、任务、用户、租户、功能和日月周期设置。浏览器显示余额帮助用户决定，但最终限制由服务端执行。若两次请求都先读到余额 100，再各自扣 70，就会超支。

常见做法是“预留—结算—释放差额”。启动请求前原子占用费用上界，成功后按真实用量结算；确定未发出的请求可以释放，结果未知的请求保留待核查状态。上界只有在输出长度、步骤和附加计费项目都受到约束时才成立，估得低不等于实际费用会服从估计。

下面保存为 `budget-reservation.mjs`，在 Node.js 22 单独运行。它利用单进程同步函数演示临界区：检查与写入之间没有 await。真实多进程服务需要数据库事务、条件更新或等效原子机制，不能把这个 Map 当成分布式预算控制。

```js example=aiapp09-budget-reservation
const budget = { limit: 100, spent: 0 };
const reservations = new Map();
function available() {
  const held = [...reservations.values()]
    .filter(r => r.state === 'pending').reduce((sum, r) => sum + r.max, 0);
  return budget.limit - budget.spent - held;
}
function reserve(key, fingerprint, max) {
  if (!Number.isSafeInteger(max) || max <= 0) return 'invalid';
  const old = reservations.get(key);
  if (old) return old.fingerprint === fingerprint && old.max === max ? 'existing' : 'conflict';
  if (available() < max) return 'no-budget';
  reservations.set(key, { fingerprint, max, state: 'pending', actual: null });
  return 'reserved';
}
function settle(key, actual) {
  const row = reservations.get(key);
  if (!row) return 'missing';
  if (!Number.isSafeInteger(actual) || actual < 0) return 'invalid';
  if (row.state === 'settled') return row.actual === actual ? 'existing' : 'conflict';
  // 即使超出估算也如实记账，负余额会阻止新的预留。
  row.state = 'settled';
  row.actual = actual;
  budget.spent += actual;
  return actual > row.max ? 'overrun' : 'settled';
}
console.log(reserve('k-1', 'question-v1', 60));
// => reserved
console.log(reserve('k-1', 'question-v1', 60), reserve('k-1', 'question-v2', 60));
// => existing conflict
console.log(reserve('k-2', 'another-question', 60), available());
// => no-budget 40
console.log(settle('k-1', 40), available());
// => settled 60
console.log(settle('k-1', 40), budget.spent);
// => existing 40
```

重复 k-1 复用原预留，同键异参拒绝；k-2 看到了已经占用的 60 点。结算后释放 20 点差额，重复结算不再扣费。生产还要将键限定到租户、主体和逻辑任务，用规范化参数的可信指纹绑定意图，并记录每个真实尝试的独立费用。

如果把结算删掉来模拟回执丢失，预留会保持 pending。不能到一个 TTL 就无条件释放并断言“没有费用”：远端可能仍在运行或已完成。先查询、对账或按明确的保守策略处理不确定负债，再决定新任务的可用额度。持久化、进程崩溃、预算周期切换和迟到回执均不在此内存实验范围内。

### 三、限流处理瞬时容量，排队也必须有截止

**限流（Rate Limit）**约束一段时间内的请求数、token 数或在途并发等资源。RPM 是每分钟请求数，TPM 是每分钟 token 数，并发数表示同时占用的请求。月预算还有很多，不代表此刻一定有容量；余额耗尽也可能发生在请求速率很低时。

截至 2026-10-02，DeepSeek 官方页按账号和模型描述并发限制，超出可返回 429；不能假设换 API Key 就得到独立容量。其 `user_id` 还涉及供应商侧隔离和调度规则，但不替应用完成身份认证与授权。其他供应商可能按项目、模型或组织计量，接入时读取实际合同，不在教材中背固定限额。

应用侧为交互、批处理和租户设置有限并发池。队列保存最大长度、预计等待和任务截止；排队期间取消就移除，启动前再次检查身份与预算。无限队列只是把即时拒绝换成更晚的超时，还会继续占用内存和预留额度。

区分排队、连接、首 token、流间空闲、工具与总任务时限。一个总超时不能解释慢在哪里。DeepSeek 文档描述等待时可能出现非流式空行或 SSE 保活注释，这些不是答案开始，也不应被 UI 计为首 token。其他服务的行为需单独适配。

### 四、三种缓存复用的是不同东西

**缓存键（Cache Key）**定义什么情况下两个请求可以共享结果。它是业务等价条件的一部分，不是只把问题做一次哈希。

| 缓存 | 复用对象 | 需要特别检查 |
| --- | --- | --- |
| 精确答案缓存 | 相同条件下的旧答案与引用 | 授权、资料版本、模型与提示、时效 |
| 语义答案缓存 | 与新问题相似的旧答案 | 相似是否真的意味着条件相同 |
| 供应商上下文缓存 | 重复前缀的计算结果 | 接口命中规则、数据政策与实际 usage |

“北京出差上限”和“北京会议出差上限”很相似，却可能适用不同规则。语义缓存不能因为相似分数高就忽略会议条件。只读公开资料可以适度共享；私有答案默认以主体或明确等价的权限范围隔离，命中后仍检查当前授权。

下面展示一个特定政策问答合同的键。保存为 `answer-cache-key.mjs`，在 Node.js 22 单独运行。数组序列化避免简单字符串拼接产生分隔冲突；这里没有真实哈希和缓存服务，也没有把所有产品需要的字段都列成通用标准。

```js example=aiapp09-answer-cache-key
function key(context) {
  return JSON.stringify([context.tenant, context.subject, context.aclVersion,
    context.index, context.model, context.prompt, context.policy, context.schema,
    context.language, context.date, context.question]);
}
const request = { tenant: 'team-a', subject: 'user-a', aclVersion: 3,
  index: 'i2', model: 'mock-1', prompt: 'p4', policy: 's2', schema: 'answer-v1',
  language: 'zh', date: '2026-10-02', question: '北京普通出差上限？' };
const cache = new Map([[key(request), { citation: 'c-1', answer: '500元' }]]);
console.log(cache.has(key(request)));
// => true
console.log(cache.has(key({ ...request, subject: 'user-b' })));
// => false
console.log(cache.has(key({ ...request, aclVersion: 4 })));
// => false
console.log(cache.has(key({ ...request, index: 'i3' })));
// => false
```

权限版本必须由受信服务维护；客户端随便填一个数字不会产生安全隔离。真实系统还要按任务包含工具、采样配置、输入附件和其他影响结果的条件。哈希只隐藏键的长度，不提供数据加密；敏感原问题和答案的存储、日志与留存仍要受控。

TTL 限制保存时长，主动失效处理政策发布、权限撤销、用户修改和安全事件。失效消息可能延迟，因此读取端检查当前版本水位，不能只等后台删除。允许展示陈旧结果的任务可以标明时间并后台刷新；授权、批准和操作状态不应返回陈旧成功。来源更新的派生链见[RAG 的版本与删除](../chinese-guides/aiapp-06-rag-citations-source-trust.md#七资料更新之后旧答案也需要退出使用)。

### 五、上下文命中不等于答案已经存在

截至 2026-10-02，DeepSeek 上下文缓存文档描述前缀计算复用，以及 usage 中的 `prompt_cache_hit_tokens` 与 `prompt_cache_miss_tokens`。输出仍需生成，缓存是尽力而为；不能从“输入相同”推出每次必命中或回答完全相同，也不能把该规则推广到所有 Provider。

稳定指令放在变化内容之前可能有利于前缀复用，但不能为了命中把本应更新的政策固定下来，更不能把不同用户的私有内容拼成共享前缀。是否允许供应商保存这些内容，需要核验其具体隔离、留存和地区约定。

请求合并又是另一层：同一条件的多个在途请求共用一次调用，完成后可能并不长期缓存。合并键同样要包含权限与版本，不能因为问题一样就合并不同主体。一个订阅者取消，只应退出自己的等待；只有没有剩余使用者且任务允许停止时，才中止共享上游。释放订阅、计时器和缓冲的责任要明确。

缓存是否值得使用，最后看质量门槛下的单位成功成本和延迟。命中率提高，同时过期引用率也提高，意味着错误被更有效地复用了。用新版本键自然失效之后命中率下降，反而可能是正确行为。

### 六、重试先取得资格，再决定等待多久

429、部分 5xx 和短暂网络错误可能允许重试；参数错误、无权限、不支持能力等通常应修正请求或停止。超时只能说明本方没拿到结果，不能证明远端未执行。对于副作用未知的写工具，先按业务操作 ID 查询；机制复用[未知结果的恢复](../chinese-guides/aiapp-04-tool-calling-execution-result-ui.md#五未知结果和取消都不能伪装成失败)。

HTTP `Retry-After` 可以是非负整数秒，也可以是 HTTP 日期。若应用决定重试，就不能比服务器要求的时间更早；超过自己的总期限时，选择停止等待，不能把服务器要求的 60 秒截成 2 秒立即重试。退避上限约束自己计算的退避，不覆盖服务器的等待要求。

下面是纯计算的重试规划器，保存为 `retry-plan.mjs`，用 Node.js 22 运行。它不真的等待，也不发请求；时钟、抖动值和剩余预算都是显式输入。HTTP 日期在本实验中接受标准 IMF-fixdate 格式，其他形式交给实际 HTTP 适配器解析。

```js example=aiapp09-retry-plan
function retryAfterMs(header, now) {
  if (header == null) return 0;
  if (/^\d+$/.test(header)) return Number(header) * 1000;
  const date = Date.parse(header);
  if (!Number.isFinite(date) || new Date(date).toUTCString() !== header) return null;
  return Math.max(0, date - now);
}
function plan(r) {
  if (r.cancelled || r.remainingAttempts <= 0 || r.remainingCost <= 0) return 'stop';
  if (r.effect === 'unknown-write') return 'reconcile';
  if (![429, 503].includes(r.status)) return 'stop';
  const serverWait = retryAfterMs(r.retryAfter, r.now);
  if (serverWait === null) return 'invalid-retry-after';
  const backoff = Math.min(4000, 500 * 2 ** r.attempt);
  const wait = Math.max(serverWait, backoff) + r.jitter;
  // 给下一次尝试预留运行时间，而不是只让等待勉强塞进期限。
  return wait + r.nextAttemptBudget > r.remainingMs ? 'deadline' : `wait ${wait}`;
}
const request = { cancelled: false, remainingAttempts: 2, remainingCost: 50,
  effect: 'read', status: 429, retryAfter: '2', now: Date.UTC(2026, 9, 2),
  attempt: 0, jitter: 100, nextAttemptBudget: 1000, remainingMs: 5000 };
console.log(plan(request));
// => wait 2100
console.log(plan({ ...request, retryAfter: '60' }));
// => deadline
console.log(plan({ ...request, effect: 'unknown-write' }));
// => reconcile
console.log(plan({ ...request, cancelled: true }));
// => stop
console.log(retryAfterMs('Fri, 02 Oct 2026 00:00:02 GMT', request.now));
// => 2000
```

这里的 `remainingCost > 0` 只是资格提示，真正发送下一次尝试前仍须按第二节原子预留所需上界。生产输入需要完整类型与范围校验，抖动从受控随机源生成；示例固定 100 毫秒以便核对结果。HTTP 日期还受本地时钟偏差影响，适配层应结合时间同步和服务器时间处理，不能声称本地计算是精确的远端倒计时。

SDK 和业务层的重试必须共用总次数、总时间与费用预算，否则上层三次乘以下层三次会放大成九次。每次实际尝试单独记账；同一个逻辑幂等键仅在服务端真的支持相应语义时才能去重，不能保证供应商不重复推理或计费。

### 七、取消与降级要保留用户已经完成的工作

用户取消时，先使当前尝试失去提交资格，再传播 AbortSignal、清理定时器和队列占用。远端可能已经接收请求，因此取消不承诺零费用。迟到回执仍可用于结算，但不能覆盖用户正在编辑的新草稿。流式状态的完整实现见[取消与资源释放](../chinese-guides/aiapp-02-streaming-sse-incremental-rendering.md#六取消先让旧尝试失效再释放资源)。

流已经显示一半时，不要把另一个模型的新回答直接接在尾部。结束旧候选，保留用户输入与明确标注的部分结果，再让新尝试生成独立候选。真实写工具的结果待确认时，页面提供查询状态，不能诱导用户重复提交同一副作用。

换 Provider 之前检查完整合同：数据地区、隐私、上下文、工具能力、Schema、质量和总预算。候选返回文本不等于它支持所需结构。若备用接口缺必填引用，先拒绝提交或降到明确的只读草稿，不给出伪装成功的界面。模型适配的主解释见[保留不能转换的差异](../chinese-guides/aiapp-01-model-interface-instructions-context-boundaries.md#二适配器转换格式也保留不能转换的差异)。

### 八、熔断与容量隔离限制故障传播

**熔断器（Circuit Breaker）**在某个依赖持续故障时暂时停止新调用，再用少量探测判断是否恢复。常见状态为 closed（正常放行）、open（快速拒绝）、half-open（有限探测）；这些是实现模式，不是 HTTP 协议为应用提供的自动保证。

按供应商、模型、地区或能力划分故障范围，避免一个端点失败拖垮全部任务。错误分类很重要：无效参数、用户取消和正常内容拒绝不应都计作供应商不可用。429 可能是本方超出配额，除了暂时减流，还应修正容量分配，不能指望熔断自动增加额度。

限制探测并发，避免恢复瞬间全部积压请求冲入。队列、租户并发池和重试预算共同提供背压；长时间批处理不能占满交互槽位。对于下游渲染慢的流，合并更新并限制缓冲，而不是无限收集 token 等待页面跟上。

### 九、把成本放回有效完成的任务中判断

假设 A 路径处理 100 个任务花费 1000 点，80 个在质量门槛内完成，单位成功成本为 12.5 点；B 路径单次更便宜，花费 900 点但只有 60 个完成，单位成功成本反而为 15 点。失败尝试、检索、工具和人工复核应按约定计入分子，成功口径固定在分母。

运行面板把质量、预算拒绝、429、分阶段超时、重试放大、缓存命中、陈旧来源、费用未知与账单差异放在一起，按功能和版本切片。不要让降低质量、扩大缓存共享或静默丢弃附件成为表面省钱的手段。

对账按供应商、价格版本与时间窗比较内部暂估和实际账单，考虑计费粒度、舍入、迟到回执与跨时区切分。差异超出容差后先查漏记与重复尝试，保留可追踪的调整记录；不要覆盖原记录来“抹平”差异。评估是否允许发布时，把这些观测接回[发布门禁](../chinese-guides/aiapp-08-evaluation-observability-release-gates.md#六发布门禁先检查硬边界再比较质量)。

### 带着问题回看

1. 相同逻辑任务重试三次，为什么应用去重和供应商账单仍可能是不同数字？
2. 两个请求争用最后一份预算，哪一步必须原子执行？未知回执能否直接释放预留？
3. 缓存命中后权限刚刚撤销，为什么 TTL 没过也不能继续使用？
4. Retry-After 要等 60 秒，但任务只剩 5 秒，规划器应该做什么？

### 参考与延伸阅读

官方资料核对于 2026-10-02。计价点、预算、时间线与阈值均为教学约定，没有真实供应商调用或费用测量。

- [DeepSeek Token 用量](https://api-docs.deepseek.com/zh-cn/quick_start/token_usage/)：区分估算和接口实际 usage。
- [DeepSeek 限速与隔离](https://api-docs.deepseek.com/zh-cn/quick_start/rate_limit/)：核对账号、模型与 user_id 的当前作用域，以及等待期间的保活行为。
- [DeepSeek 上下文缓存](https://api-docs.deepseek.com/zh-cn/guides/kv_cache/)：核对前缀复用、命中字段、尽力而为和输出仍需生成的含义。
- [MDN：Retry-After](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Reference/Headers/Retry-After)、[RFC 9110 第 10.2.3 节](https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after)：查阅等待值格式和 HTTP 语义；是否值得继续重试仍由应用合同决定。
