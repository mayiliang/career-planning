# AI 结构化输出与运行时校验知识点讲义

## AIAPP-03 结构化输出与 Schema 校验

读书助手返回了一个 JSON 对象：标题和评分都有，页面却不应马上把它存成评审结论。评分可能是字符串，引用可能来自另一份材料，模型还可能顺手添上 `approved: true`。这些问题分别发生在什么位置？如果只写一个 `try / catch`，最后往往只剩“生成失败”，既不能解释原因，也不知道怎样恢复。

这一篇以资料评审草稿为例，从消费者需要什么倒推数据合同。读完后，你应能区分解析、结构、业务规则与授权，定位嵌套字段错误，限制修复次数，并解释版本变化为什么可能让昨天的有效结果今天不能直接使用。

### 学习前先确认

- 直接前置：[AIAPP-01 模型接口、指令与上下文边界](../chinese-guides/aiapp-01-model-interface-instructions-context-boundaries.md#aiapp-01)。需要区分完整响应、拒绝、截断与能力不支持。
- 直接前置：[TS-07 运行时契约、校验与错误模型](../chinese-guides/ts-07-runtime-contracts-validation-error-models.md#ts-07)。类型声明描述预期，运行时解析器检查实际输入。

### 一、先确定页面究竟需要什么

**结构化输出（Structured Output）**是让生成结果具有约定的数据形状，便于程序逐字段处理。这里的消费者是一张“待复核”卡片，只需要材料 ID、摘要、评分和引用编号。作者身份、租户、批准状态和保存时间由应用补充，不属于模型可填写的字段。

假设原文只有“课程共有四节”，模型返回 `score: 82`、摘要“四节课适合初学者”。程序能检查 82 是否在 0 到 100 之间，也能检查引文编号是否存在；它不能因此证明“适合初学者”有充分依据。结构有效、引文存在、主张被支持是三个不同判断。

从消费端反推字段还有一个好处：不必把数据库整行暴露给模型。把 `isAdmin`、价格、权限范围放进生成 Schema，随后又试图在提示里禁止模型修改，会制造多余的入口。派生字段也应由程序计算，例如评分等级由评分映射得到，避免同时生成 `score: 82` 和 `level: poor` 这类矛盾。

### 二、Schema 约束形状，不能替业务作决定

**运行时模式（Runtime Schema）**是描述并检查真实值的规则：对象有哪些字段、哪些必填、每个值属于什么类型，以及数组、长度和取值范围有哪些限制。JSON Schema 是一种通用描述语言；Zod 是可在 JavaScript/TypeScript 中构造运行时校验器的库。它们不是同一个格式，供应商支持的 JSON Schema 子集也不一定等于本地校验器支持的全部规则。

以下是本讲自定的评审合同。保存为 `review.schema.json` 便于检查字段，不需要向模型或服务器发送它。

```json example=aiapp03-review-schema runtime=project file=review.schema.json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "schemaVersion": { "const": 1 },
    "documentId": { "type": "string", "minLength": 1, "maxLength": 40 },
    "summary": { "type": "string", "minLength": 1, "maxLength": 200 },
    "score": { "type": "integer", "minimum": 0, "maximum": 100 },
    "evidenceIds": {
      "type": "array", "minItems": 1, "maxItems": 5,
      "items": { "type": "string", "minLength": 1, "maxLength": 40 },
      "uniqueItems": true
    }
  },
  "required": ["schemaVersion", "documentId", "summary", "score", "evidenceIds"],
  "additionalProperties": false
}
```

`properties` 只描述出现时怎么检查，`required` 才要求字段存在；默认也不会因为声明了几个字段就自动拒绝其他字段。本例显式设置 `additionalProperties: false`，使未经设计的批准字段不能静默进入下游。允许扩展的产品可以单独定义元数据区域，但不能把全部未知字段直接展开到业务对象里。

缺失和 null 不同。缺失表示没有这个属性，null 是实际的 JSON 值；字符串字段不会因为“可选”就自动接受 null。`default` 通常是注解，不保证验证器替你填值；`format` 是否执行断言也取决于方言和验证器配置。金额宜用明确单位的整数，日期要明确日历、时区和比较规则，不能依靠字符串长得像日期就接受。

### 三、运行一次从候选到待复核的检查

下面没有实现通用 JSON Schema 引擎，而是把上面这个固定合同写成可观察的检查流程。保存为 `review-gate.mjs`，用 Node.js 22 执行 `node review-gate.mjs`。所有材料、权限和引用都是内存模拟；没有模型、数据库或业务写入。

```js example=aiapp03-review-gate
const good = { schemaVersion: 1, documentId: 'doc-a', summary: '课程共有四节', score: 82, evidenceIds: ['quote-a'] };
const context = { readable: new Set(['doc-a']), evidence: new Map([['doc-a', new Set(['quote-a'])]]) };
function inspect(response, ctx) {
  const fail = (code, path = '/') => ({ code, path });
  if (response.end !== 'complete') return fail(response.end);
  if (typeof response.text !== 'string' || !response.text.trim()) return fail('empty');
  if (new TextEncoder().encode(response.text).length > 4096) return fail('too_large');
  let value;
  try { value = JSON.parse(response.text); } catch { return fail('malformed'); }
  if (!value || Array.isArray(value) || typeof value !== 'object') return fail('shape');
  if (value.schemaVersion !== 1) return fail('unsupported_version', '/schemaVersion');
  const keys = ['schemaVersion', 'documentId', 'summary', 'score', 'evidenceIds'];
  if (Object.keys(value).some(key => !keys.includes(key))) return fail('unknown_field');
  const shortText = (text, max) => typeof text === 'string' && text.trim().length > 0 && text.length <= max;
  if (!shortText(value.documentId, 40)) return fail('shape', '/documentId');
  if (!shortText(value.summary, 200)) return fail('shape', '/summary');
  if (!Number.isInteger(value.score) || value.score < 0 || value.score > 100) return fail('shape', '/score');
  const ids = value.evidenceIds;
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 5) return fail('shape', '/evidenceIds');
  for (let i = 0; i < ids.length; i += 1) {
    if (!shortText(ids[i], 40)) return fail('shape', `/evidenceIds/${i}`);
  }
  if (new Set(ids).size !== ids.length) return fail('duplicate', '/evidenceIds');
  if (!ctx.readable.has(value.documentId)) return fail('denied');
  if (ids.some(id => !ctx.evidence.get(value.documentId)?.has(id))) return fail('evidence_missing', '/evidenceIds');
  return { code: 'needs_review', value };
}
const complete = value => ({ end: 'complete', text: JSON.stringify(value) });
for (const response of [
  complete(good), complete({ ...good, score: '82' }),
  complete({ ...good, evidenceIds: ['quote-a', 3] }),
  complete({ ...good, documentId: 'doc-b' }),
  complete({ ...good, evidenceIds: ['unknown'] }),
  { end: 'truncated', text: '{"score":82' },
  complete({ ...good, approved: true })
]) {
  const result = inspect(response, context);
  console.log(result.code + (result.path ?? ''));
}
// => needs_review
// => shape/score
// => shape/evidenceIds/1
// => denied/
// => evidence_missing/evidenceIds
// => truncated/
// => unknown_field/
```

第三个结果指向第二个数组元素，而不是含糊地说整份报告坏了。越权材料在查具体引用之前就被拒绝，避免通过不同引用错误泄露对象内容。完整对象最后仍叫 `needs_review`，因为例子只证明字段、可读范围和引用归属，没有检验摘要是否被引文支持，更没有批准评分。

本地字符串长度使用 UTF-16 code unit，JSON Schema 的字符串长度语义并不完全相同；本例还拒绝纯空白字符串，比上面的基础 Schema 更严格。真实项目应采用明确版本的库并核对这些差异，不要把这段教学函数当作标准一致性实现。网络字节上限也必须在缓冲过程中执行，本例的 4096 字节限制只检查已经收到的合成字符串。

### 四、在 Zod 中保持同样的边界

项目已有 Zod 3 系列依赖。下面演示嵌套错误路径及未知字段策略，保存为 `review-zod.mjs`。在独立目录安装 `zod@3.24.1` 后用 Node.js 22 运行；已有对应依赖时直接运行即可。本例明确锁定 v3 写法，升级到 v4 应重新核对 API 和错误行为。

```js example=aiapp03-zod runtime=project file=review-zod.mjs
import { z } from 'zod';
const Review = z.object({
  schemaVersion: z.literal(1),
  score: z.number().int().min(0).max(100),
  evidence: z.array(z.object({ id: z.string().min(1) }).strict()).min(1).max(5)
}).strict();
const result = Review.safeParse({ schemaVersion: 1, score: 82, evidence: [{ id: 7 }] });
if (!result.success) {
  console.log(result.error.issues.map(issue => issue.path.join('.')).join(','));
}
console.log(Review.safeParse({ schemaVersion: 1, score: 82, evidence: [{ id: 'q1' }], approved: true }).success);
// => evidence.0.id
// => false
```

`safeParse` 的成功分支才得到已校验值；`as Review` 不会产生同样效果。Zod v3 的普通对象默认会剥离未知字段，这里使用 `.strict()` 让意外扩展可见。是否归一化大小写、是否把数字字符串转成数字，应由合同明确决定；无条件 coercion 可能把输入错误变成难追踪的值。

**语义校验（Semantic Validation）**检查候选在领域和当前事实中是否成立，例如引用属于本次材料、结束日期晚于开始日期、对象版本仍有效。授权进一步检查当前主体是否有权执行相应动作。简单跨字段条件可以用 refine 表达，但依赖数据库和权限服务的判断仍应有明确阶段，不要把一次异步网络请求隐藏成“纯类型检查”。

### 五、错误不同，恢复动作也应不同

| 观察 | 程序知道什么 | 合适的下一步 |
| --- | --- | --- |
| 拒绝响应 | 供应商明确没有提供所求结果 | 展示可公开的拒绝说明 |
| 长度截断 | 当前候选未完成 | 缩小输出或发起明确的新尝试 |
| JSON 损坏、字段缺失 | 结构暂时不可消费 | 在允许范围内修复或让人补充 |
| 越权、来源不存在 | 当前候选无权使用或缺乏依据 | 停止，不请模型“猜一个能过的值” |
| 对象版本过期 | 依据的事实已改变 | 重新读取、预览和确认 |

字段路径服务于定位，不应携带秘密原值。给用户显示“第二条引用编号不是文字”；诊断记录保存请求、Schema 和提示版本、路径与错误类别，按需留受控样本。不要把完整候选、内部权限表和堆栈塞进普通日志或下一次模型输入。部分有效也不等于可以悄悄删去失败项：用户请求五项时只保留四项，需要明确产品是否允许部分结果。

### 六、修复预算只允许有限的新候选

**修复预算（Repair Budget）**是对修复次数、时间和费用的共同上限。第二次生成仍是不可信候选，仍须从头检查。更换请求 ID 可以标识一次新尝试，但不能抹掉原候选和任务身份，也不能重复保存原业务动作。

以下独立模拟只教“最多一次、只修结构”。保存为 `repair-budget.mjs`，用 Node.js 22 执行。函数参数里的数组代表预先写好的生成结果，没有调用模型。

```js example=aiapp03-repair-budget
function repairOnce(first, repairs) {
  let current = first, used = 0;
  while (true) {
    if (current.kind === 'valid') return `needs_review / ${used}`;
    if (current.kind !== 'shape') return `stopped:${current.kind} / ${used}`;
    if (used === 1 || !repairs[used]) return `manual / ${used}`;
    current = repairs[used++];
  }
}
console.log(repairOnce({ kind: 'shape' }, [{ kind: 'valid' }])); // => needs_review / 1
console.log(repairOnce({ kind: 'shape' }, [{ kind: 'shape' }, { kind: 'valid' }])); // => manual / 1
console.log(repairOnce({ kind: 'denied' }, [{ kind: 'valid' }])); // => stopped:denied / 0
```

真实修复必须重新运行校验器，而非相信例子里的 `kind`；这里把校验结果预先给定以隔离预算机制。修复评分、日期或引用可能改变原始意思，不能因为新对象通过 Schema 就覆盖原结论。可确定的格式归一化优先用程序；缺失事实交给来源或人补充。质量、成本和超时一起决定是否值得尝试，不能形成“直到通过”为止的循环。

### 七、严格模式和版本都需要具体条件

2026-10-01 核对的 DeepSeek JSON Output 使用 `response_format: {type: "json_object"}`，要求提示说明 JSON，并提醒输出可能为空、长度不足会截断。它不能替代本地领域 Schema。该厂商工具调用另有 Beta strict 模式，使用 Beta 地址和函数上的 strict 标记，支持的关键字有限；两项能力不能混称为任何响应都遵循任意 JSON Schema。调用前能力判断可复用 [AIAPP-01 的适配器](../chinese-guides/aiapp-01-model-interface-instructions-context-boundaries.md#二适配器转换格式也保留不能转换的差异)。

版本不只是新增字段。将 `score: 0.82` 的含义从比例改为百分制，即使都符合 number 也会破坏语义。保存记录应带 Schema 版本；旧版本先用旧规则读取，再用确定函数迁移，未知未来版本停止或只读。旧消费者拒绝额外字段时，新增可选字段也未必向后兼容，必须看实际消费者策略。

发布时一并记录 Schema、模型、提示和消费者版本。修复规则变宽导致接受率升高，不一定说明模型改善；应回看哪些失败被放行。绑定发布证据的方法见 [AIGOV-01](../chinese-guides/aigov-01-data-model-change-audit-accountability.md#三批准必须绑定整个配置组合)。

### 八、完整结构才有提交资格

半段 JSON 可以用于显示“正在整理”，不能作为最终表单值或工具参数。多个独立完整项可以逐项提交，但必须有稳定 ID、完整帧和明确的部分结果合同；整体约束仍要在组合后检查。例如每项百分比都在范围内，不证明总和是 100。

不要用正则删代码围栏、补括号、补缺失引号，再把猜出来的对象直接执行。需要宽松读取时，把它标为待复核的修复产物，保存原输入，并继续走全部边界。字节与完成事件的差异见 [AIAPP-02](../chinese-guides/aiapp-02-streaming-sse-incremental-rendering.md#二sse-的分隔规则与应用的完成规则分开)。

最终值进入 HTML、URL 或工具仍需在使用位置处理。结构化数据不是安全内容证书；[AISAFE-01 的解释边界](../chinese-guides/aisafe-01-output-validation-content-safety-guardrails.md#三在真正使用内容的位置守住解释边界)说明为什么安全的文字插入也不能证明事实和隐私要求已经满足。接下来 [AIAPP-04](../chinese-guides/aiapp-04-tool-calling-execution-result-ui.md#aiapp-04)把已校验候选变成可追踪的动作提议。

### 带着问题回看

- 为什么合法 JSON、Zod 成功和引用存在仍不能直接批准评分？
- 多出 approved 字段时，剥离与拒绝分别会留下什么观察结果？
- 越权与结构错误为何不能共用同一条“让模型再试一次”路径？
- 一个旧消费者拒绝未知字段，新增可选字段还算读兼容吗？

### 参考与延伸阅读

核对日期：2026-10-01。运行示例采用固定数据，未验证真实模型输出质量。

- [JSON Schema 对象规则](https://json-schema.org/understanding-json-schema/reference/object)：查 properties、required 和额外字段的准确含义。
- [Zod v3 文档](https://v3.zod.dev/?id=strict)：查本例锁定版本的 safeParse、对象策略与错误路径。
- [DeepSeek JSON Output](https://api-docs.deepseek.com/guides/json_mode/)：核对 JSON 模式配置及空内容、截断限制。
- [DeepSeek Tool Calls](https://api-docs.deepseek.com/guides/tool_calls/)：查工具 strict 模式的 Beta 前提和支持范围。
