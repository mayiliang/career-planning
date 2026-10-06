# Agent 工具契约、Schema 与可发现性知识点讲义

## AGENT-08 工具描述、Schema 与可发现性

用户想知道“这张发票还能退多少”，助手却选择了 `refund_invoice`。参数中的发票 ID 和金额都通过了校验，钱也确实退了，但用户原本只想查询。问题不在 JSON 是否正确，而在工具目录没有把“了解情况”和“改变情况”分开。

本篇从这次误调用出发，沿着工具选择、参数校验、执行和结果消费建立合同。读完应能设计容易区分的工具，写出拒绝非法组合的 Schema，并解释为什么选对名称、参数有效、执行获准和业务成功是四件事。协议说明核对于 2026-10-06，主线为 MCP 2026-07-28；实验不连接真实支付服务。

### 学习前先确认

- 直接前置：[MCP-01 Server、Tools、Resources、Prompts 与 Schema](../chinese-guides/mcp-01-server-tools-resources-prompts-schema.md#mcp-01)，理解工具、资源、提示与调用结果的基本职责。

### 一、先让查询、预览与执行可以被区分

**工具契约（Tool Contract）**说明调用者能做什么、要提供什么、会产生什么结果，以及失败后如何继续。它比函数签名多了副作用、授权、版本、预算和恢复条件；调用者可能是模型，也可能是普通程序，两者都需要同一条可执行边界。

在发票场景里，可以把能力分为三个入口：

| 工具 | 适用问题 | 结果与副作用 |
| --- | --- | --- |
| `get_refund_capacity` | 现在最多还能退多少 | 返回可退金额与版本，不发起退款 |
| `preview_refund` | 按这个金额退，会影响哪些记录 | 返回拟执行快照，不发起退款 |
| `submit_refund` | 执行已经批准的具体退款 | 校验批准与当前对象，再创建业务操作 |

名称说明动作与对象，描述再说明缺少信息时怎么办。例如读取工具的描述可以写：“按发票 ID 查询当前可退金额，单位为分；不查找发票、不创建退款。没有 ID 时先让用户选择发票。”这比“处理退款相关业务”更能缩小选择范围。

Tool 也可以是只读计算或搜索，并非所有 Tool 都有写入。已有、可寻址的资料适合 Resource；用户选择的重复工作方法适合 Prompt。不要把三类原语简化成“Tool 写、Resource 读、Prompt 是系统命令”：Prompt 仍需宿主按来源处理，Resource 读取也要有权限。

工具名只在一个 Server 内要求区分。聚合两个服务的 `search` 时，宿主应使用自身绑定的服务标识消歧；Server 自报的显示名称不能证明身份。更多发现层面的判断见 [服务名称与身份](../chinese-guides/agent-04-mcp-client-discovery-compatibility.md#二服务名称和工具描述都不能证明身份)。

### 二、选择是否正确，要与参数是否有效分别评估

描述影响模型选择，但不是访问控制。“仅管理员使用”不能阻止非管理员手写请求；`readOnlyHint` 等注解也不能替代执行端事实。来自未信任服务的注解必须作为不可信声明处理，不能凭它跳过审批。

先准备有明确意图的样本，再记录模型选了什么。样本应含“无需调用”“需要补充信息”和容易误选写工具的请求，不要强迫每条用户消息都映射到工具。下面是合成评估结果，用固定标签说明指标，不是真实模型准确率。保存为 `tool-selection.mjs`，运行 `node tool-selection.mjs`，需要 Node.js 22，无外部依赖。

```js example=agent08-selection-evidence
const cases = [
  { intent: '查看可退额度', expected: 'get_refund_capacity', picked: 'submit_refund' },
  { intent: '预览退回 500 分', expected: 'preview_refund', picked: 'preview_refund' },
  { intent: '解释什么是退款', expected: null, picked: 'get_refund_capacity' },
  { intent: '缺少发票 ID', expected: null, picked: null },
];
const writes = new Set(['submit_refund']);
let correct = 0, unnecessary = 0, unexpectedWrite = 0;
const confusion = new Map();
for (const item of cases) {
  if (item.expected === item.picked) correct++;
  if (item.expected === null && item.picked !== null) unnecessary++;
  if (writes.has(item.picked) && !writes.has(item.expected)) unexpectedWrite++;
  const key = `${item.expected ?? 'none'} -> ${item.picked ?? 'none'}`;
  confusion.set(key, (confusion.get(key) ?? 0) + 1);
}
console.log(`${correct}/${cases.length}`, unnecessary, unexpectedWrite);
// => 2/4 1 1
console.log(confusion.get('get_refund_capacity -> submit_refund'));
// => 1
```

总体命中 2/4 掩盖了最需要修复的一次写工具误选。若只把退款参数改成合法金额，这次选择仍然错误。修改描述后，应该对同一组意图重新取得候选，再比较误选类别；不能把手工改对 `picked` 的结果当成模型能力提升。

多个工具都可以合理完成任务时，标签可记录允许集合和禁止动作；缺少关键输入的样本记录应先追问什么。工具名称、描述、候选范围和模型版本一起保存，才能解释变化来自哪里。样本规模由真实混淆决定，不以凑满固定条数代替覆盖。

### 三、Schema 表达合法形状，不替调用者作业务决定

**JSON Schema**用规则描述 JSON 值能否被接受，例如字段类型、必填项、互斥分支与数组上限。MCP 2026-07-28 在省略 `$schema` 时使用 2020-12，允许显式声明其他方言；实现必须支持默认方言，并对不支持的方言明确报错，不能静默换一种解释。

退款的 `mode` 可以是 full 或 partial。partial 必须有正整数 `amountCents`，full 则不应再附金额。把二者写成两个判别分支，比同时放几个可选字段后猜意图清楚。`oneOf` 要求恰好匹配一个分支；`anyOf` 是至少一个；`allOf` 是全部约束同时成立，不是对象字段的覆盖合并。

还有三个容易误判的词：`required` 要求字段存在，并不自动拒绝空字符串；`default` 是注解，不是校验时自动补值；`format` 是否作为断言校验与方言、词汇表及验证器配置有关。不能用一个 `format: "email"` 就声称邮箱存在或收件人获准。

对象校验也不是净化器。默认校验不会自动删除未知属性、把字符串转成数字或填补缺失字段。某些验证器提供会修改数据的选项，采用前要说明转换规则，并让展示、审批和执行使用同一份规范化数据。对这些层次的区分可补读 [Schema 与业务决定](../chinese-guides/aiapp-03-structured-output-schema-validation.md#二schema-约束形状不能替业务作决定)。

### 四、运行一份输入与输出共同受约束的合同

在新建的临时目录安装 `ajv@8.20.0`，把下列代码保存为 `refund-contract.mjs`。Node.js 22 下依次运行 `npm init -y`、`npm install --save-exact ajv@8.20.0`、`node refund-contract.mjs`。不要在业务仓库里为了实验改锁文件。Ajv 是验证器实现，本例显式使用它的 2020-12 入口；这不是一个 MCP SDK 项目。

```js example=agent08-contract-lab runtime=project file=refund-contract.mjs
import Ajv2020 from 'ajv/dist/2020.js';
const ajv = new Ajv2020({ allErrors: true, strict: true,
  useDefaults: false, coerceTypes: false, removeAdditional: false });
const inputSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  properties: {
    invoiceId: { type: 'string', pattern: '^inv-[0-9]{1,8}$' },
    mode: { enum: ['full', 'partial'] },
    amountCents: { type: 'integer', minimum: 1, maximum: 100000 },
    currency: { const: 'CNY', default: 'CNY' },
  },
  required: ['invoiceId', 'mode', 'currency'], additionalProperties: false,
  oneOf: [
    { properties: { mode: { const: 'full' }, amountCents: false } },
    { properties: { mode: { const: 'partial' }, amountCents: {} }, required: ['amountCents'] },
  ],
};
const outputSchema = {
  type: 'object',
  properties: {
    status: { const: 'preview' }, invoiceId: { type: 'string' },
    amountCents: { type: 'integer', minimum: 1, maximum: 100000 },
    currency: { const: 'CNY' }, resourceVersion: { type: 'integer', minimum: 1 },
  },
  required: ['status', 'invoiceId', 'amountCents', 'currency', 'resourceVersion'],
  additionalProperties: false,
};
const validInput = ajv.compile(inputSchema), validOutput = ajv.compile(outputSchema);
const full = { invoiceId: 'inv-7', mode: 'full', currency: 'CNY' };
const partial = { ...full, mode: 'partial', amountCents: 500 };
console.log([full, partial, { ...full, amountCents: 500 },
  { ...partial, amountCents: '500' }, { ...partial, admin: true }]
  .map(value => validInput(value)).join(','));
// => true,true,false,false,false
const missingCurrency = { invoiceId: 'inv-7', mode: 'full' };
console.log(validInput(missingCurrency), Object.hasOwn(missingCurrency, 'currency'));
// => false false
// 固定业务输入：发票属于 team-a，剩余可退 400 分。
const invoice = { id: 'inv-7', tenant: 'team-a', remaining: 400, version: 3 };
function preview(actor, args) {
  if (!validInput(args)) return 'INPUT_INVALID';
  if (actor.tenant !== invoice.tenant || args.invoiceId !== invoice.id) return 'NOT_ACCESSIBLE';
  const amount = args.mode === 'full' ? invoice.remaining : args.amountCents;
  if (amount < 1 || amount > invoice.remaining) return 'AMOUNT_UNAVAILABLE';
  const result = { status: 'preview', invoiceId: invoice.id, amountCents: amount,
    currency: 'CNY', resourceVersion: invoice.version };
  if (!validOutput(result)) throw new Error('OUTPUT_INVALID');
  return result;
}
console.log(validInput(partial), preview({ tenant: 'team-a' }, partial));
// => true AMOUNT_UNAVAILABLE
console.log(preview({ tenant: 'team-b' }, full));
// => NOT_ACCESSIBLE
const result = preview({ tenant: 'team-a' }, full);
console.log(result.status, result.amountCents, result.resourceVersion);
// => preview 400 3
console.log(validOutput({ ...result, amountCents: '400' }));
// => false
```

full 分支用 `amountCents: false` 禁止该属性；partial 分支的空子 Schema 表示这里不再追加约束，整数与范围仍由外层 properties 检查。分支里显式列出必填属性，也符合本例 Ajv 的严格编译配置。

前五个输入依次验证两个合法分支、full 多带金额、金额类型错误和额外属性。缺失 currency 的对象仍然缺失该字段，说明 `default` 没有替它补值。最关键的第三行输出是 `true AMOUNT_UNAVAILABLE`：500 分在结构上完全合法，但当前发票只剩 400 分可退。

实验只预览，不创建退款；actor 是合成输入，不是认证服务。真实执行还要核对当前资源版本、批准、累计限制和幂等记录。审批机制复用 [批准绑定提议快照](../chinese-guides/agent-05-human-in-the-loop-risk-approval.md#三批准绑定一份不可变提议)，不在本篇重复实现。

### 五、结构化结果要让程序知道下一步能做什么

**结构化内容（Structured Content）**是 Server 在 `structuredContent` 中返回的 JSON 数据。它与模型的 Schema 约束生成不是同一种机制。2026-07-28 支持符合输出 Schema 的任意 JSON 值，不应继续把旧版“只能对象”的限制推广到所有版本。

声明 outputSchema 后，Server 必须返回符合合同的结构化结果，Client 应验证后再消费。可以同时提供文本便于人读及兼容旧消费者，但业务程序不应从“已成功退款”这句话里推断金额与最终状态。上例故意把输出金额改为字符串，验证失败后就应停在错误处理，不把坏数据交给下一步工具。

查询结果说明数据、快照与下一页游标；写入结果说明操作身份、确认状态与资源版本。预览结果不能冒充提交回执，已接收不能冒充已完成。一个完整工具结果可以在 `content` 中解释原因，并以 `isError: true` 表示可处理的工具执行错误；未知工具或不合协议结构的请求使用 JSON-RPC 错误。HTTP 成功、RPC 响应成功和领域动作成功需要分别判断。

输出也可能携带不可信 URI、路径和文字。即使结构通过，下载链接仍需访问策略，下一动作仍需重新授权。不要把供应商完整响应当成本站公共输出，否则隐私、内部字段和版本变化都会泄漏到调用者。

### 六、发现与缓存只提供当前候选，调用时仍须核对

**能力发现（Capability Discovery）**让 Client 知道可尝试哪些能力；具体工具合同来自 tools/list。2026 版工具集合可随请求授权和服务配置变化，但不能依赖连接上先前请求留下的隐式状态。分页、TTL 与 cacheScope 的完整机制见 [发现缓存的范围](../chinese-guides/agent-04-mcp-client-discovery-compatibility.md#四缓存的新鲜度和共享范围要分开判断)。

例如 Alice 看到了写工具，随后账号切换到 Bob；即使列表尚未到 TTL，Alice 的私有缓存也不能给 Bob 复用。工具执行端不能只因为名字曾出现在列表里就放行。未知工具需要刷新适用目录，权限不足则按授权流程处理，不能换一个别名继续撞。

工具数量过多时，可以按当前任务提供相关候选，但筛选必须来自允许集合，并保留缺少能力时的解释。客户端自己给模型裁剪候选是应用行为，不等于 tools/list 天然支持任意搜索参数。缓存到期也不是必须立即后台轮询的命令，按实际使用重新核对即可。

### 七、资源上限与路径边界是执行合同的一部分

参数的元素数量、字符串长度与整数范围只是第一层。还需在解析前限制请求字节，执行期间限制时间、并发和下游次数，返回时限制大小；否则小输入也可能触发巨大扫描。分页游标要绑定授权和查询条件，客户端发现重复游标应停止，而不是永远取下一页。

Schema 本身也可能耗资源。受信合同尽量预编译，控制组合分支、递归深度与正则开销。MCP 禁止默认自动联网解析 `$ref`；未解析的引用不应当成“没有限制”。允许外部引用时，必须另行治理来源与网络边界。`x-mcp-header` 的合法位置、类型与编码同样有规则，HTTP 客户端不能忽略非法声明；详细机制沿用 [HTTP 头部镜像](../chinese-guides/agent-03-mcp-transport-stateless-state-versioning.md#三http-头部与正文必须描述同一件事)。

Resource URI 或工具路径不能只查字符串前缀。`/workspace/reports-old` 以 `/workspace/reports` 开头，却在另一个目录；允许目录中的符号链接也可能指向外部。尽量把模型可选输入缩小为业务对象 ID，由受控存储解析；确需文件路径时，按真实目标、打开方式和竞争条件建立边界，见 [运行隔离中的文件访问](../chinese-guides/agent-10-identity-authorization-runtime-isolation.md#六文件路径检查之后还要守住打开的对象)。

取消后，正在生成的只读结果可以停止消费；已经提交的写动作要查询原操作，不能把关闭连接当作回滚。临时流、定时器和句柄由创建者清理，清理不会抹去幂等与审计所需的业务事实。

### 八、合同变更要同时检查选择、执行与旧消费者

把金额单位从元改成分，即使类型仍是 number，也是破坏性变化。新增必填字段、修改默认动作、改变错误语义或把预览改成执行，都需要迁移；不要只用 TypeScript 能编译判断兼容。保存带版本的真实序列化样本，并让旧消费者和新执行器的组合有明确结果。

检查分三层：固定意图是否选到允许工具；边界输入是否在副作用前拒绝；输出和恢复路径是否能被消费者正确理解。描述改动重点检查选择，授权改动重点检查对象拒绝；无关模块不必因此重跑全面业务测试。

每份合同有负责维护的人、支持版本与退场条件。旧工具下线时说明替代与失效时间；客户端错误中保留可关联的请求引用，不暴露秘密、完整路径或数据库细节。工具少而清楚通常比大量含糊入口更容易验证，但最终仍应以具体任务的选择与执行证据判断。

### 自检问题

1. 查询意图调用了写工具，参数全部合法，错误发生在哪一层？
2. 为什么 full 模式仍带 amountCents 应被拒绝？default 又为什么没有补 currency？
3. structuredContent 符合 Schema 后，还有哪些访问与业务判断没有完成？
4. 工具列表缓存尚未过期，什么变化仍要求重新选择和授权？

### 参考与延伸阅读

- [MCP 2026-07-28 Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)：核对工具名、结果、注解与错误的协议合同。
- [MCP Schema 规则](https://modelcontextprotocol.io/specification/2026-07-28/basic#json-schema-usage)：查默认方言、引用解析与资源约束。
- [JSON Schema 注解](https://json-schema.org/understanding-json-schema/reference/annotations)：区分 default、examples 等说明与校验行为。
- [Ajv 对 JSON Schema 的支持](https://ajv.js.org/json-schema.html)：查实验采用的 2020-12 入口与实现差异。

核对日期：2026-10-06。实验仅验证合成合同与本地校验，没有测量真实模型选择、支付权限或完整 MCP 互操作。
