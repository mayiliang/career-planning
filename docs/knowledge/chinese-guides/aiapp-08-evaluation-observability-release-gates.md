# AI 系统评估、生产观测与发布门禁知识点讲义

## AIAPP-08 模型评估、生产可观测与回归门禁

团队改了提示词，住宿政策助手的回答更流畅，平均评分从 3.8 升到 4.2。准备发布时，有人发现一个回答引用了失效政策，另一个回答虽然给出正确金额，却先读取了用户无权访问的附件。更高的文字分数没有回答“这个版本是否值得发布”。

这一篇把发布判断拆成样本、评分、轨迹和门禁。读完后，你应能说明一次评估究竟证明了什么，定位均分掩盖的失败，并把生产异常变成可重复的回归材料。文中的答案、分数、调用与时间都是合成数据，不代表对任何真实模型的测量。

### 学习前先确认

- 直接前置：[AIPROD-01 AI 任务定义、模型选择与价值验证](../chinese-guides/aiprod-01-ai-task-model-selection-value-validation.md#aiprod-01)，用于明确任务与失败代价；[OBS-01 前端可观测性、SLO 与隐私](../chinese-guides/obs-01-frontend-observability-slo-alerting-privacy.md#obs-01)，用于理解指标、事件、trace 与数据最小化。前者决定评什么，后者帮助知道实际发生了什么。

### 一、先把成功拆成能够检查的事实

**评估（Evaluation）**是在明确的任务、系统配置、输入和判定规则下，收集证据判断一个质量或风险主张。它不是向模型随便提问几次，再凭最好的一次回答给整个系统打分。

对于政策助手，成功可以拆成：找到了适用资料；回答保留适用条件；引用真的支持金额；无权资料没有进入上下文；没有擅自执行工具；在预算内给出答案或明确的恢复路径。拆开以后，“金额答对但越权读取”就有确定的失败位置，不再被一个 4.2 分盖住。

确定事实优先由代码检查。例如引用 ID 是否在本次集合、工具实际调用次数、审批是否绑定参数和超时后有没有继续写入。开放语义再由人工或经过校准的模型辅助判断，例如解释是否遗漏关键条件。JSON 合法只能证明结构，不能证明业务结果；已有[结构与可执行性的区别](../chinese-guides/aiapp-03-structured-output-schema-validation.md#二schema-约束形状不能替业务作决定)可帮助选择评分器。

| 被评层次 | 观察什么 | 只看最终文字会漏掉什么 |
| --- | --- | --- |
| 单轮回答 | 事实、条件、引用、拒答 | 正确答案可能碰巧来自模型记忆 |
| 多轮会话 | 用户修正、取消、旧结果、隐私范围 | 旧上下文覆盖了新意图 |
| RAG | 允许集合、召回、入选证据、主张支持 | 检索错了但答案看起来合理 |
| 工具与 Agent | 真实副作用、顺序、权限、预算、停止 | 结尾成功但动作执行了两次 |
| 实时语音 | 转写、轮次、打断与工具状态 | 已停止播报，后台仍在行动 |

一个任务可以用多种合法路径完成。除非顺序本身承载安全或业务条件，不要强制模型复现某一条示范轨迹。应该禁止的是未经批准先写入，而不一定是必须先调用名为 `plan` 的工具。

### 二、样本集保存的是任务条件，不是一串标准句子

**黄金样本集（Gold Set）**保存经过复核的任务输入、允许资料、预期事实或判定量表，以及适用版本。它的“黄金”来自可复核的标注，不表示永远不变。

一条政策样本可以记录：住宿日期、主体、问题、允许的文档版本、必须包含的城市与金额、允许的不确定回答、禁止调用的工具，以及标注依据。这样“上限为 500 元”和“每晚最多报销 500 元”都能通过语义要求，不必做整句相等比较。政策改版时新增样本版本，保留旧版本用于历史回放，不能直接覆盖标签后声称模型进步了。

样本至少分成正常任务、边界条件、对抗输入和故障路径。真实生产抽样用于估计常见体验；合成的跨租户、旧批准、响应丢失等样本用于验证危险边界。两者不能混成一个百分比：人为加入大量攻击后得到的越权比例，不是生产攻击发生率。

开发集允许反复看；回归集守住已修复问题；最终留出集控制调参过拟合。发现留出集失败可以修复，但这条样本之后不再能充当完全未见证据。保留样本去重、来源、删除与争议记录，避免同一问题的轻微改写同时出现在训练或提示示例与评估中。

样本数量由风险、分布和待检测差异决定。小集合适合发现明确机制错误；对“真实任务成功率提高两个百分点”的主张，则需要更有代表性的抽样和不确定性分析。不要为了便宜删除难题，也不要为了显得严谨给每次文字改动跑全套无关能力。

### 三、先校准评分器，再相信它给出的分数

**模型裁判（Model as Judge）**让模型依据量表判断开放输出，可帮助批量比较覆盖与可读性。它也可能偏爱较长答案、固定位置或自身熟悉的表达；待评回答还可能包含诱导裁判打高分的文字。因此裁判不是一个天然独立、永远正确的真值来源。

先让领域人员独立标注一小批代表性样本，记录分歧与裁决，再看裁判在哪类样本上错。隐藏候选版本，交换成对答案的左右顺序，观察判定是否跟着位置走。量表应说明“哪些条件缺失算失败”，并要求指出可核查的文本依据，而不是要求披露隐藏推理。

下例把“值得接受”记为 true，统计一个合成裁判的误接受。保存为 `judge-calibration.mjs`，在 Node.js 22 执行 `node judge-calibration.mjs`；所有输入都在代码中，没有调用模型。

```js example=aiapp08-judge-calibration
const rows = [
  { id: 'normal', human: true, judge: true },
  { id: 'missing-condition', human: false, judge: true },
  { id: 'wrong-amount', human: false, judge: false },
  { id: 'long-but-unsupported', human: false, judge: true },
];
const agreement = rows.filter(r => r.human === r.judge).length;
const falseAccept = rows.filter(r => !r.human && r.judge).length;
const humanReject = rows.filter(r => !r.human).length;
console.log('agreement', agreement + '/' + rows.length);
// => agreement 2/4
console.log('false-accept', falseAccept + '/' + humanReject);
// => false-accept 2/3
```

四条里有两条与人工一致，但三条应拒绝的样本有两条被放过。第二个分母回答“错误答案有多少被放行”，比孤立的总体一致率更接近这里的风险。若两个人工标注者也有分歧，应先澄清量表和证据，不能直接指定某个人永远正确。

实际校准按语言、任务和风险切片；高风险、意见不一致、阈值附近的样本送人工。裁判模型、提示和量表都带版本，更换裁判后重新校准。结构、权限、实际副作用仍由确定证据判断，不让裁判用“回答很有帮助”推翻执行日志。

### 四、比较两个版本时，把波动和退化一起留下

固定同一组输入、资料与模拟工具，用相同运行器比较 v4 和 v5。模型快照、推理设置、提示模板、索引、工具、策略与运行器版本都要记录；如果一次同时换了模型和索引，只能先说“组合版本变了”，不能立即把提升归因于新模型。

随机系统可对重要样本重复运行，但重复同一个问题不会自动增加任务覆盖。报告每题成功次数与失败类别，再按事先约定的切片聚合。固定随机种子或低温有助于减少部分波动，不承诺远端服务完全可复现；无法固定的模型别名和后端版本要记录为限制。

“试三次至少成功一次”适合允许用户挑选候选的情境；“三次都成功”更接近稳定执行的要求。若教学上假设每次独立且成功概率都是 0.8，前者为 `1 - 0.2³ = 0.992`，后者为 `0.8³ = 0.512`。真实请求往往相关，这个计算只是帮助看清两种问题，不是实测可靠性。

平均值还会隐藏子群退化。例如普通问答多对五题，会议例外却全错；如果会议例外涉及高额费用，总体提升不够支持发布。列出改好、改坏、两版都失败的样本，能让评审者看到变化。对于“观察到零次违规”，结论只限于被测样本，不能推导生产违规概率为零。

### 五、生产轨迹连接事实，不补写当时没有记录的版本

Trace 是一次运行的关联记录；span 表示其中的一段操作。生成、检索和工具各自记录开始结束、结果类别及关联 ID，就能区分首个字迟到是排队、检索还是模型耗时。Trace 回答“这一次发生了什么”，评估则跨多次运行判断质量，两者需要连接但含义不同。

下面是本站教学用记录字段，不是某家 SDK 或 OpenTelemetry 的标准消息格式。它不保存用户原文，只检查重放所需的关键版本是否存在。保存为 `trace-completeness.mjs`，使用 Node.js 22 单独运行。

```js example=aiapp08-trace-completeness
const required = ['model', 'prompt', 'index', 'tools', 'policy', 'runner'];
const trace = {
  runId: 'r-demo', fixtureId: 'policy-normal-v2',
  versions: { model: 'mock-1', prompt: 'v5', index: 'i2',
    tools: 't3', policy: 'p2', runner: 'h1' },
  stages: [
    { name: 'retrieval', outcome: 'ok', evidenceIds: ['c-1'], durationMs: 12 },
    { name: 'generation', outcome: 'ok', inputTokens: 120, outputTokens: 30 },
  ],
};
function missingVersions(value) {
  return required.filter(key => typeof value.versions?.[key] !== 'string' ||
    value.versions[key].length === 0);
}
console.log(missingVersions(trace).length);
// => 0
const incomplete = { ...trace, versions: { ...trace.versions, index: '' } };
console.log(missingVersions(incomplete).join(','));
// => index
```

字段齐全仍不保证可以重放：还需要获准保存的资料快照、可用的模拟工具与相同运行条件。字段缺失时更不能从今天的配置补写昨天的版本，然后标为“已复现”。真实写工具使用桩或隔离测试实例回放，绝不能因为调查日志而再次发送邮件或退款。

记录生成 usage、供应商 requestId、审批决定、实际工具结果、延迟和费用时，区分未返回与零。异常与取消也留下终态；只存成功请求会使线上看板过于乐观。用户 ID 和完整提示不进入高基数指标标签，必要诊断通过受控 runId 查找最少记录。

截至 2026-10-02，OpenTelemetry 原 GenAI 文档入口已指向独立语义约定仓库。落地时锁定 SDK、约定版本及稳定性状态，再映射内部字段，不能把文中教学字段称为通用协议。已有的[日志、指标与链路分工](../chinese-guides/obs-01-frontend-observability-slo-alerting-privacy.md#五日志指标和链路各自适合看什么)仍适用。

### 六、发布门禁先检查硬边界，再比较质量

**发布门禁（Release Gate）**是在扩大使用范围之前，按预先约定的证据和阈值作决定。它绑定样本、评分器、系统配置和负责人；不能看到结果后再删除难题或移动阈值来取得通过。

下面完整实验把质量比例与未授权执行分开。保存为 `release-gate.mjs`，使用 Node.js 22 运行。四条记录是合成夹具；`quality` 模拟已复核的语义评分，`unauthorized` 模拟从执行事件归并出的次数，不应在生产中直接相信模型自己填的值。

```js example=aiapp08-release-gate
const expectedIds = ['normal', 'exception', 'no-evidence', 'injection'];
const versions = {
  v4: [true, false, true, true].map((quality, i) => ({
    id: expectedIds[i], quality, unauthorized: 0,
  })),
  v5: [true, true, true, true].map((quality, i) => ({
    id: expectedIds[i], quality, unauthorized: i === 3 ? 1 : 0,
  })),
};
function gate(rows) {
  const ids = new Set(rows.map(r => r.id));
  if (rows.length !== expectedIds.length || ids.size !== expectedIds.length ||
      expectedIds.some(id => !ids.has(id))) return 'BLOCK missing-or-duplicate';
  if (rows.some(r => typeof r.quality !== 'boolean' ||
      !Number.isSafeInteger(r.unauthorized) || r.unauthorized < 0)) {
    return 'BLOCK invalid-observation';
  }
  const quality = rows.filter(r => r.quality).length / rows.length;
  const violations = rows.reduce((sum, r) => sum + r.unauthorized, 0);
  return `${violations === 0 && quality >= 0.75 ? 'PASS' : 'BLOCK'} quality=${quality} unauthorized=${violations}`;
}
console.log('v4', gate(versions.v4));
// => v4 PASS quality=0.75 unauthorized=0
console.log('v5', gate(versions.v5));
// => v5 BLOCK quality=1 unauthorized=1
console.log(gate(versions.v5.slice(0, 3)));
// => BLOCK missing-or-duplicate
```

v5 的文字质量全过，仍被一次未授权执行阻断；删掉出错的最后一条也不能放行，因为样本集合已不完整。0.75 是本实验的教学阈值，不是可通用于真实产品的发布标准。把阈值、样本数、可信观测来源和已知限制一起写进报告，才有可审查的决定。

实际门禁还包括业务关键切片、错误恢复、延迟与成本，允许权衡的项目与硬否决分开。工具拒绝率升高未必更危险，可能是防护开始生效；要区分正确阻止攻击和错误拒绝正常任务。针对越权执行应看实际违规次数，而不是把所有拒绝都算坏结果。

### 七、离线通过以后，用灰度观察真实任务

离线夹具便于比较，却可能漏掉新语言、新资料或复杂会话。先影子运行可以观察候选差异，但影子路径不应产生真实副作用；随后小范围灰度，用稳定的用户或会话分组避免同一任务在不同版本间反复跳动。

线上同时观察合格任务完成率、证据不足、正确与错误拒绝、人工接管、恢复、延迟和单位成功成本。分母写明是否包括取消、预算拒绝与服务错误；按需求保留原始类别，再决定纳入哪个指标。采样会改变可见分布，不能把只收集点赞用户的反馈当成总体满意度。

提前约定暂停与回退条件。例如观察到一次真实跨租户访问，先停止相关执行入口；某版本延迟持续超线，则减流量并调查。回退模型配置不能自动撤销已发出的业务动作，也不自动清理新版本生成的摘要与缓存。资产版本和派生关系的回退方式见[治理中的恢复范围](../chinese-guides/aigov-01-data-model-change-audit-accountability.md#四灰度回退与下线恢复不同东西)。

收到线上问题后，用最少获准材料重建失败，再由人工确认预期行为，加入新回归版本。不能直接把每条投诉当作金标，也不能把用户输入中的要求当作修改评测规则的指令。

### 八、评估系统自己也需要可解释的边界

评测样本、标注工具、模型裁判和 trace 存储都是数据处理环节。确认目的、访问角色、保留期限和删除路径后再引入生产资料；去掉姓名并不保证长文本不可重新识别。样本删除还要传播到派生报告与缓存，确需保留的审计信息单独说明范围。

评分器用已知正例、负例和边界例检查。故意删除一个授权观测、把引用换成过期版本、让裁判交换左右候选，观察对应层是否失败。若无论怎样破坏轨迹都得到相同高分，应先修评分器，而不是调模型。

评估运行器使用独立权限，待评系统不能修改阈值或选择只运行容易的样本。报告保存配置、样本与评分版本、运行次数、失败列表、人工分歧、限制和发布决定；缺少工具证据时写“未验证”，不要默认零违规。这样下一次变更可以复用相同事实，减少重复研究和无方向的大规模测试。

### 带着问题回看

1. 最终答案正确，但过程读取了无权文件，哪一层应判失败？
2. 只有成功请求进入 trace，看板会怎样误导你？
3. 裁判总体一致率很高，为什么仍要单独检查危险答案的误接受？
4. 灰度回滚了提示词以后，哪些状态还不会自动恢复？

### 参考与延伸阅读

官方资料核对于 2026-10-02。正文指标与阈值是独立教学设计，没有运行真实模型评估。

- [Anthropic：Agent 评估工程说明](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)：比较代码、模型和人工评分，理解终态、轨迹及多次尝试指标的分工。
- [OpenTelemetry：GenAI 语义约定仓库](https://github.com/open-telemetry/semantic-conventions-genai)：查阅当前约定与迁移状态，按实际依赖版本接入观测字段。
- [OpenTelemetry：采样](https://opentelemetry.io/docs/concepts/sampling/)：核对采样为何影响调查覆盖，避免把缺少记录当成没有失败。
