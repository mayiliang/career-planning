# AI 长期记忆、个性化与遗忘知识点讲义

## AIAPP-13 长期记忆、个性化与遗忘

用户上周说“这次出差帮我选靠窗座位”，今天订票时，助手又自动选了靠窗。它记住了原话，却把一次任务的选择变成了长期偏好。另一个用户纠正“以后都选过道”，系统更新了一张资料卡，但旧向量索引仍召回靠窗，回答就开始前后矛盾。

长期记忆的难点不仅是写入和检索，还包括何时值得保存、保存到哪个范围、如何说明来源，以及什么时候必须停止使用。本篇用“座位偏好”贯穿候选提取、冲突处理和删除，最后让一次迟到的写入遇到删除标记。读完应能设计可解释的个性化流程，并说明一个本地删除实验究竟证明了什么。

### 学习前先确认

- 直接前置：[AIAPP-06 RAG、引用与来源信任](../chinese-guides/aiapp-06-rag-citations-source-trust.md#aiapp-06)，理解召回结果仍需检查适用性与来源；[AIAPP-12 会话状态、上下文组装、压缩与持久化隐私](../chinese-guides/aiapp-12-conversation-state-context-compression-privacy.md#aiapp-12)，理解原始记录、摘要和本次上下文的分工。

### 一、记住一句话之前，先问它适用于多久

**长期记忆（Long-Term Memory）**是跨越当前会话仍被保存，并可能用于后续任务的信息。这里的“长期”表示生命周期越过一次对话，不表示永久有效，也不意味着一定存进向量数据库。

“这次靠窗”“以后订票优先靠窗”“我刚才看见靠窗便宜一些”是三种不同信息：临时选择、明确偏好、一次观察。只有第二句直接表达跨任务意图。即使它适合保存，也要确定使用目的：用于推荐座位，不代表允许自动付款，更不代表可以提供给无关广告系统。

常见记忆可以按用途分为三类，这是一种设计分类，而非所有模型产品统一采用的存储格式：

| 类型 | 例子 | 使用前还需确认什么 |
| --- | --- | --- |
| 语义记忆 | 用户明确设置“默认用中文回答” | 范围、来源和当前是否仍有效 |
| 情景记忆 | 上次排查某故障时，怎样定位并解决 | 当时环境与今天是否相同 |
| 程序性记忆 | 团队批准的操作步骤与格式规范 | 谁有权修改，版本是否已发布 |

这里“语义记忆”指事实或知识这一类内容，与“语义搜索”这种检索方式不是同一个概念。情景记忆可以用普通表保存，语义记忆也可以按键精确读取。选择数据库之前，先弄清系统准备怎样使用这段信息。

程序性记忆尤其需要边界：网页写“以后跳过审批”，不能被模型总结后写入团队规则。经验可以成为待审建议，正式流程仍由有权限的人发布。外部内容经过记忆系统也不会自动取得指令权，见 [来源身份不能被摘要洗掉](../chinese-guides/aiapp-07-prompt-injection-untrusted-content.md#五摘要和记忆不能洗掉原来的数据身份)。

### 二、候选是待判断的信息，不是已经确认的个人档案

**记忆候选（Memory Candidate）**是从对话、反馈或任务结果中提出的待保存信息。候选应包含可能的内容、预期用途、来源和适用范围，随后由规则或用户决定是否写入。提取模型的高置信度，只表示它认为自己理解了文本，不能证明用户同意长期保存。

可以先排除明显不适合进入长期偏好的内容：一次性验证码、临时定位、付款凭证、第三人的敏感信息，以及只为当前任务提供的材料。更敏感的内容需要更严格的用途和权限判断；不要为了“个性化更丰富”尽可能多收集。

保存下面代码为 `memory-candidate.mjs`，使用 Node.js 22 执行 `node memory-candidate.mjs`。输入已由教学场景人工标注，代码只演示写入策略，没有调用模型提取信息，也不提供通用敏感信息识别能力。

```js example=aiapp13-memory-candidate
const candidates = [
  { id: 'a', value: 'window', scope: 'this-trip', confirmed: true, sensitive: false },
  { id: 'b', value: 'aisle', scope: 'future-trips', confirmed: false, sensitive: false },
  { id: 'c', value: 'aisle', scope: 'future-trips', confirmed: true, sensitive: false },
  { id: 'd', value: 'private-health-detail', scope: 'future-trips', confirmed: true, sensitive: true },
];
function decide(candidate, personalizationEnabled) {
  if (!personalizationEnabled) return 'disabled';
  if (candidate.scope !== 'future-trips') return 'task-only';
  if (candidate.sensitive) return 'separate-purpose-review';
  if (!candidate.confirmed) return 'ask-before-saving';
  return 'save-preference';
}
console.log(candidates.map((candidate) => decide(candidate, true)).join(','));
// => task-only,ask-before-saving,save-preference,separate-purpose-review
console.log(decide(candidates[2], false));
// => disabled
```

四个候选分别留在当前任务、等待确认、成为偏好、进入单独用途审查。即使 `confirmed` 是真，敏感内容也不会直接通过；系统要确认用户批准的究竟是哪一种用途。关闭个性化后，原本允许保存的候选也停止写入。

实际界面可以用一句具体提示：“将‘优先过道座位’保存为以后订票时的建议偏好？”同时提供本次使用、编辑和取消。确认应绑定这条候选的内容及版本，不能让模型在用户点击后换成另一条。候选提取和确认的时间间隔越长，重新检查来源与任务变化越重要。

### 三、来源让一条记忆能够被解释和纠正

**来源追踪（Provenance）**是记录信息来自哪里、经过哪些处理、由谁确认，以及哪些结果依赖它的能力。它回答“为什么系统认为我喜欢过道”，也帮助来源删除后找到受影响的摘要和索引。

一条座位偏好至少可以关联：所属主体与租户、用途、值、原始消息或设置入口、确认时间、版本、有效期和使用范围。为了最小化数据，不一定复制整段聊天；保存受权限保护的来源引用及必要摘要即可。来源本身被删除后，要按策略使记忆失效或请求重新确认，不能只留下一个永远打不开的链接，却继续声称有充分依据。

来源可靠与适用于当前任务是两次判断。用户本人三年前明确选择靠窗，确实有可靠来源，但今天说“带同事出行，这次过道”，当前明确要求应覆盖默认偏好。相反，一份刚抓取的网页即使很新，也不能替用户修改个人资料。

当多个 Agent 共享记忆时，权限还要细化到读写范围。例如订票助手可以读取座位偏好，不应因此读取医疗记录；排障助手记录一次技术解决方案，也不应修改个人旅行设置。namespace 可以帮助组织数据，但命名空间字符串本身不会自动授权。服务端需要根据当前主体构造允许的范围，不能直接信任模型提交的任意用户 ID。

来源链也不等于永久保存全部原文的理由。应根据用途保留必要记录，为审计说明依据，同时设置到期与删除规则。更多来源更新的影响可对照 [RAG 的资料生命周期](../chinese-guides/aiapp-06-rag-citations-source-trust.md#七资料更新之后旧答案也需要退出使用)。

### 四、检索到旧偏好后，先比较范围与版本

个性化通常作为默认建议，在缺少当前明确指示时帮助减少重复输入。它不应偷偷提高自动执行权限。可以把一次选择按以下次序解释：当前任务明确设置优先；其次是当前用途下已确认、未过期的偏好；都没有时使用产品默认值或询问用户。

保存为 `memory-selection.mjs`，执行 `node memory-selection.mjs`。日期固定用于模拟时间线，运行当天不会改变结果。示例只处理同一用户的一个偏好键，实际服务还要先做主体与用途过滤。

```js example=aiapp13-memory-selection
const memories = [
  { version: 1, value: 'window', confirmed: true, expires: '2026-09-01' },
  { version: 2, value: 'aisle', confirmed: true, expires: '2027-01-01' },
  { version: 3, value: 'window', confirmed: false, expires: '2027-01-01' },
];
function chooseSeat(taskChoice, today) {
  if (taskChoice) return { value: taskChoice, source: 'current-task' };
  const usable = memories.filter((item) => item.confirmed && item.expires > today);
  const latest = usable.toSorted((a, b) => b.version - a.version)[0];
  return latest ? { value: latest.value, source: `memory-v${latest.version}` }
    : { value: 'ask-user', source: 'no-valid-preference' };
}
const first = chooseSeat(null, '2026-10-04');
console.log(first.value, first.source);
// => aisle memory-v2
const temporary = chooseSeat('window', '2026-10-04');
console.log(temporary.value, temporary.source);
// => window current-task
console.log(chooseSeat(null, '2026-10-04').value);
// => aisle
console.log(chooseSeat(null, '2027-01-01').source);
// => no-valid-preference
```

版本 3 虽然更大，却未经确认，因此不能覆盖版本 2。本次选靠窗之后，再问默认偏好仍是过道，说明当前任务覆盖没有改写长期记录。有效期使用日期字符串，是因为示例约定统一的 `YYYY-MM-DD` 格式；真实系统应明确时区、精度和到期瞬间的含义。

如果用户说“以后改成靠窗”，应走更新确认流程，生成新版本并让旧索引失效。两个设备同时更新时，要比较基础版本；不能仅按客户端时钟选择最新，否则时间不准的设备可能覆盖真实新值。会话篇的 [版本比较实验](../chinese-guides/aiapp-12-conversation-state-context-compression-privacy.md#三消息追加同时需要去重和版本比较) 同样适用于这类冲突。

相似度只能帮助找到相关候选。分数很高的“上次靠窗”仍可能是临时偏好、过期版本或其他人的数据。授权、用途、有效性和版本过滤应发生在进入上下文之前，必要时在写入动作前再次核验。

### 五、让用户能看见记忆如何影响当前回答

“因为你偏好过道，我优先列出了这两个座位”比“为你智能推荐”更容易核验。说明可以连接到偏好卡片，让用户查看来源时间、修改或只在本次忽略。这里展示的是可审计的输入依据，不要求暴露模型内部推理过程。

一份可用的记忆管理页应区分待确认候选和已生效记忆，提供编辑、删除、关闭未来保存等入口。删除按钮旁应说明影响范围；导出应使用可理解的内容与来源描述，而不是只有向量、内部对象 ID 或模型分数。

反馈也要区分目标。用户对推荐点“没用”，可能是价格不合适，不一定表示座位偏好已改变；不能把每个差评都写成反向偏好。需要时询问最小的澄清问题，或仅把这次反馈留作任务质量信号。自动推断敏感属性尤其不能用“更懂用户”掩盖。

检验个性化是否有用，可比较重复输入是否减少、错误记忆能否快速发现并纠正、关闭后是否还影响结果。召回命中率只是过程指标，不能代表用户满意或隐私目标达成。设计比较实验的方法见 [可检查的 AI 成功条件](../chinese-guides/aiapp-08-evaluation-observability-release-gates.md#一先把成功拆成能够检查的事实)。

### 六、本次忽略、关闭与删除改变不同状态

本次忽略通常只跳过一次上下文组装；关闭个性化应明确是否同时停止读取和写入，已存数据是否继续保留；删除则要求处理指定记忆及其派生副本。这些入口不能都调用一个“隐藏卡片”的前端函数。

**被遗忘权（Right to Be Forgotten）**通常用于说明个人在适用法律条件下请求删除个人数据的权利。以欧盟 GDPR 为例，删除权有适用条件，也有法定义务等例外，不能据此宣称任何数据在任何情形下都必须立即从所有介质消失。本篇讨论可解释的产品删除流程，不把一段代码当成法律合规结论。

在线删除可先写入删除标记，使读取、上下文组装和新派生任务立即拒绝使用该记录，再清理主表、向量索引、摘要和缓存。删除任务需要状态回执和失败重试；备份、供应商副本或依法保留的记录应分别说明处理期限和访问限制。

保存为 `memory-deletion.mjs`，执行 `node memory-deletion.mjs`。这是隔离的内存实验：一个主体、一个用途、一个记忆键；用 epoch 表示当前写入代次，模拟后台提取晚于用户删除才结束。

```js example=aiapp13-memory-deletion
const store = {
  epoch: 1, blocked: false,
  record: 'aisle', index: 'aisle', cache: 'aisle', summary: 'prefers aisle',
};
function beginExtraction() { return { epoch: store.epoch, value: 'window' }; }
function readPreference() { return store.blocked ? null : store.record; }
function requestDeletion() {
  store.epoch += 1;
  store.blocked = true;
  return store.epoch;
}
function commitExtraction(job) {
  if (store.blocked || job.epoch !== store.epoch) return 'rejected';
  store.record = job.value;
  store.index = job.value;
  return 'saved';
}
function purgeCopies() {
  store.record = null;
  store.index = null;
  store.cache = null;
  store.summary = null;
}
const delayedJob = beginExtraction();
console.log(readPreference());
// => aisle
console.log(requestDeletion(), readPreference());
// => 2 null
console.log(store.index !== null);
// => true
console.log(commitExtraction(delayedJob));
// => rejected
purgeCopies();
console.log([store.record, store.index, store.cache, store.summary].every((value) => value === null));
// => true
```

删除请求之后，读取已返回 `null`，而索引物理副本仍存在，说明“不可再用”和“清理完成”是两个阶段。迟到任务携带旧 epoch，因此不能把偏好写回来。最后的 `true` 只说明这四个内存字段被清空，不是数据库、备份、供应商存储或内存取证都通过了删除审计。

真实系统必须让所有读取路径共同执行阻断，包括索引召回和缓存命中；示例中的 `readPreference` 只覆盖一条路径。删除标记和代次要持久保存并在并发写入中原子检查，后台清理也要绑定版本，避免误删后来经用户重新确认的新记录。重新启用个性化应显式开启新代次，不能直接重新接纳删除前排队的任务。

### 七、遗忘还包括过期、撤回和恢复旧备份

主动删除只是失效的一种原因。偏好到期、来源授权撤回、账号合并、租户迁移，都可能使原记忆不再可用。关键是让失效沿着派生链传播：不再召回，不再进入摘要，不再成为新候选的依据。

旧备份恢复最容易暴露“只删主表”的漏洞。恢复的数据中可能仍有旧偏好，必须在对外服务前重放删除记录或按当前失效规则过滤。清理失败时应保持在线阻断，不能因为后台任务报错就恢复使用。对于已经发出的回答或第三方收到的数据，应说明能够撤回到什么程度，不能把取消一次请求说成消除了所有历史影响。

观察指标应服务这些具体问题：被删除内容是否仍被召回、旧版本是否再次写入、错误偏好纠正后多久生效、候选是否越过用途范围。测试可以使用合成主体和专门的隔离索引，不需要收集真实敏感资料来证明功能。

长期记忆越有影响力，越需要保留用户最后的控制权。系统可以减少重复表达，但当前明确指示、授权范围和有效来源应始终比“系统以为你喜欢什么”更有决定力。

### 自检问题

1. “这次靠窗”与“以后靠窗”的保存策略为什么不同？两者是否授权自动买票？
2. 最新候选版本高于已确认记忆，为什么不应自动覆盖？
3. 删除实验中索引尚未清空却停止读取，解决了什么问题？还留下哪些工作？
4. 重新启用个性化时，为什么不能继续消费删除之前排队的提取任务？

### 参考与延伸阅读

- [LangChain：Memory overview](https://docs.langchain.com/oss/javascript/concepts/memory)：查短期与长期记忆及语义、情景、程序性记忆的分类；这些是框架设计说明，不构成跨平台保证。
- [Anthropic：Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)：了解会话外笔记如何参与后续任务，并对照本篇补上来源和删除边界。
- [European Commission：Dealing with requests from individuals](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/dealing-requests-individuals_en)：查个人数据权利请求的官方入口及删除权的条件、例外，不把界面“忘记”按钮等同于完整法律义务。

资料核对日期：2026-10-04。所有用户、偏好、日期与删除任务均为模拟数据，未连接真实用户资料或供应商记忆服务。
