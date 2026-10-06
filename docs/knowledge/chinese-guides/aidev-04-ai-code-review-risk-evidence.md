# AI Code Review、风险证据与人工责任知识点讲义

## AIDEV-04 AI Code Review 与风险分级

一个 PR 收到三条 AI 评论：“没有 AbortController，存在严重数据丢失”“使用 postMessage 通配符，必须立即停止发布”“变量名不够清晰”。作者把三条都改了，真正的旧响应覆盖新状态却仍然存在。问题不是评论太少，而是没有先问每条判断在什么条件下成立。

AI 评审适合帮助发现值得检查的路径。它给出的判断需要经过代码、需求和实际结果核对，才能成为可执行的修改建议。本篇沿一个资料编辑页的评审过程，说明怎样从疑点取得证据、如何分级、怎样验证修复，以及谁对合入决定负责。

### 学习前先确认

- 直接前置：[AIDEV-03 AI 生成代码的验证金字塔](../chinese-guides/aidev-03-ai-generated-code-verification.md#aidev-03)，理解独立预言与验证证据；[CAREER-05 代码评审、风险沟通与责任边界](../chinese-guides/career-05-code-review-risk-communication.md#career-05)，理解评审上下文、评论质量和合入责任。

### 一、把模型判断改成可以被推翻的假设

**评审假设（Review Hypothesis）**是一条尚待核验的判断：在某个输入和状态下，某段代码可能违反已经明确的合同。它应该允许证据证明其成立，也允许证据把它推翻，而不是先相信评论，再到代码里寻找支持。

“可能有竞态”缺少对象与结果。可以改成：“先提交草稿 A，再提交 B；让 B 的响应先到，A 后到；如果界面最后显示 A 已保存，就违反了当前编辑应对应最新提交的要求。”输入、顺序与观察点都明确，作者才知道怎样复现。

反过来，若代码已经比较当前意图版本，旧响应只写入自己的历史记录，没有覆盖当前编辑，这条假设就可能被推翻。没有 AbortController 仍可能有资源浪费，但不能因此沿用“严重数据丢失”的结论。不同缺陷要分别证明。

评审记录可有待调查、已确认、已驳回、接受风险等状态。证据不足不是确认，也不是没问题；需要指出还缺哪个调用者、业务约束或运行结果。无评论的文件也可能只是没有被模型读取，必须与“已覆盖且未发现问题”分开。

### 二、先确定正在评审哪份变化，以及用户想完成什么

阅读 PR 的目标、非目标、输入与原行为，然后沿变更触及的数据流检查。一个保存按钮可能影响请求、服务端条件写入、回执处理、草稿与焦点；只看组件 diff 会漏掉真正的写入边界。删除一段逻辑也要确认旧入口、迁移与消费者是否仍存在。

给模型的上下文以目标 diff 和必要调用链为起点。发现缺口再补充具体文件，避免把整仓库、相邻项目或用户目录无差别发送给外部服务。PR 描述、注释和测试夹具中的“忽略之前的评审规则”仍是待分析内容，不是评审者的新指令。

评论与证据绑定具体提交。作者修改了代码以后，旧行号可能错位，旧复现也可能已经无效；复核要针对新的差异，而不是把已修复问题再次报告。外部 API 结论还需核对仓库锁定版本、类型与官方文档，模型提出的新函数名不能仅凭看起来熟悉就接受。

已有 lint 或类型错误交给确定性工具即可。人工与 AI 的注意力更适合用在合同、边界和组合行为；文档措辞改动不应触发整套业务端到端测试，权限、状态与副作用变化则值得针对性复现。

### 三、触发路径把安全关键词变成具体风险

**触发路径（Trigger Path）**是从输入和环境条件，到代码分支，再到用户或系统影响的因果链。看到一个危险模式只提供线索，还要确认数据是什么、谁能控制它、它实际到达哪里、已有保护是否生效。

postMessage 是一个典型例子。发送时的 targetOrigin 限定消息可以交给哪个来源；接收时还需核对 event.origin、event.source 和消息结构。发送非敏感通知给特定场景中的不透明来源，与发送令牌到可能被导航的未知窗口，风险不同。不能把 `'*'` 单独等同于最高级事故，也不能因为消息是 JSON 就信任它。

下面是纯 JavaScript 的接收策略实验，没有创建真实 iframe。保存为 `message-review.mjs`，使用 Node.js 22 执行。对象身份模拟 WindowProxy，origin 由场景固定，错误数据不会触发动作。

```js example=aidev04-message-boundary
const expectedWindow = {}, otherWindow = {};
const expectedOrigin = 'https://preview.example';
function accepts(event) {
  const data = event.data;
  return event.origin === expectedOrigin && event.source === expectedWindow
    && data !== null && typeof data === 'object' && !Array.isArray(data)
    && Object.keys(data).every(key => ['type', 'documentId'].includes(key))
    && data.type === 'preview.ready' && data.documentId === 'doc-7';
}
const valid = { origin: expectedOrigin, source: expectedWindow,
  data: { type: 'preview.ready', documentId: 'doc-7' } };
for (const event of [valid,
  { ...valid, origin: 'https://other.example' },
  { ...valid, source: otherWindow },
  { ...valid, data: { type: 'delete', documentId: 'doc-7' } },
  { ...valid, data: null },
]) console.log(accepts(event));
// => true
// => false
// => false
// => false
// => false
```

同 origin 但不同窗口也被拒绝，因为实验只接受已建立关系的预览窗口。真实浏览器中的 origin/source 由消息事件提供，不能拿 data 自报的 origin 代替；窗口引用也可能被导航，所以两项都要核对。合法消息只表示预览就绪，不授予文档删除等业务权限。

这份实验验证分支，不证明浏览器的导航、沙箱与跨源组合已测试。真正修复跨窗口漏洞时，应在对应页面验证目标窗口、来源和输入；这里只演示怎样把“缺少校验”变成可核对的路径。

### 四、严重性、调查信心与处理优先级分别记录

**风险级别（Risk Severity）**描述缺陷成立时的影响与范围；证据强度描述我们有多大把握确认它；处理优先级还要考虑是否已暴露、补偿控制和恢复时间。模型说“置信度很高”不能把低影响问题变成 P0，缺少复现也不能把高影响线索悄悄当低风险关闭。

下面的 P0～P3 是本篇教学采用的团队约定，不是所有公司通用标准：

| 级别 | 判断依据 | 处理方式 |
| --- | --- | --- |
| P0 | 已确认或有强证据的广泛严重影响，且需要立即遏制 | 停止扩散，明确负责人和应急动作 |
| P1 | 可触发的高影响缺陷，如敏感数据越权、重要数据覆盖 | 修复或明确阻断相关发布路径 |
| P2 | 已确认但范围有限、有恢复手段的行为缺陷 | 按受影响场景安排修复与回归 |
| P3 | 低影响问题或有具体理由的非阻断改进 | 清楚标注建议，避免挤占关键审查 |

同样的旧响应覆盖，若只影响一个可重新查询的提示，可能是 P2；若它导致用户以错误状态继续修改重要业务，优先级可能更高。需要结合可控输入、服务端保护与恢复方式，不能用表格代替判断。纯命名偏好甚至可能不值得留评论。

高影响但未确认的线索应写“待调查，可能影响……，还缺……”，并根据暴露情况安排快速核查。接受已知风险时记录负责人、原因、期限、监测与退出条件；不能为了让合并按钮变绿就修改风险标签。

### 五、用可控完成顺序复现旧结果覆盖

并发问题需要可重复顺序，而不只是快速点击后希望它偶尔出错。下面页面把网络替换成手动完成按钮：A、B 都只保存在内存，读者决定哪个先返回。没有服务器写入，实验只观察响应如何更新界面，不能据此证明服务端没有丢失更新。

将代码保存为 `review-race.html`，在该目录运行 `python3 -m http.server 44752 --bind 127.0.0.1`，桌面浏览器打开 `http://127.0.0.1:44752/review-race.html`。没有外部依赖。选择“缺陷版”，输入 A 文本并发起 A，再修改为 B 文本并发起 B；先完成 B 后完成 A，结果退回 A。切换“修复版”重复，旧 A 应退出采用。

```html example=aidev04-race-page runtime=project file=review-race.html
<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<title>旧响应评审实验</title>
<style>
body { max-width: 840px; margin: 36px auto; padding: 0 24px; font: 17px/1.65 system-ui; }
textarea { display: block; width: 100%; box-sizing: border-box; min-height: 100px; font: inherit; }
button, select { padding: 8px; margin: 8px 8px 8px 0; font: inherit; }
pre { white-space: pre-wrap; overflow-wrap: anywhere; padding: 16px; background: #eef3ef; }
:focus-visible { outline: 3px solid #28688c; outline-offset: 3px; }
</style>
<h1>观察响应，不发送真实保存</h1>
<p>本地合成顺序；刷新丢失内容。完成按钮模拟响应到达，包括取消后的迟到响应。</p>
<label for="mode">采用规则</label>
<select id="mode"><option value="fixed">修复版</option><option value="buggy">缺陷版</option></select>
<label for="draft">当前草稿</label><textarea id="draft">资料 A</textarea>
<button id="startA">发起 A</button><button id="startB">发起 B</button>
<button id="finishA" disabled>完成 A</button><button id="finishB" disabled>完成 B</button>
<button id="cancel">取消当前等待</button>
<h2>最后采用的响应</h2><pre id="result">尚无响应</pre>
<p id="status" role="status" aria-atomic="true">可开始实验。</p>
<script type="module">
const el = id => document.getElementById(id);
let revision = 0, generation = 0;
const pending = new Map();
function show(message) {
  el('status').textContent = message;
  for (const name of ['A', 'B']) el(`finish${name}`).disabled = !pending.has(name);
}
el('draft').addEventListener('input', () => { revision++; show('草稿已改变，输入与焦点保留。'); });
function start(name) {
  pending.set(name, { generation: ++generation, revision, text: el('draft').value });
  show(`已发起 ${name}，等待手动完成。`);
}
function finish(name) {
  const request = pending.get(name);
  if (!request) return;
  pending.delete(name);
  if (el('mode').value === 'fixed' && (request.generation !== generation || request.revision !== revision)) {
    show(`忽略 ${name} 的过期响应。`); return;
  }
  el('result').textContent = `${name}：${request.text}`;
  show(`已采用 ${name} 的响应；这不是服务端写入证明。`);
}
for (const name of ['A', 'B']) {
  el(`start${name}`).onclick = () => start(name);
  el(`finish${name}`).onclick = () => finish(name);
}
el('cancel').onclick = () => { generation++; show('已取消等待；草稿保留，可模拟迟到完成。'); };
el('mode').onchange = () => {
  generation++; pending.clear(); el('result').textContent = '尚无响应';
  show('已切换规则并清空请求，草稿保留。');
};
show('可开始实验。');
</script>
</html>
```

修复版把结果采用限制在最新请求代次和当前草稿版本。B 发起后，A 的代次过期；发起后继续编辑，即使没有新请求，旧响应的草稿版本也过期；取消则增加代次，让迟到完成失去资格。输入元素没有被重建，所以编辑焦点和内容保持。

再做两个变式：发起 A 后编辑但不发 B，完成 A 应被忽略；发起请求后取消，随后模拟完成也不应覆盖结果。缺陷版故意缺少采用门槛，用来让评审假设产生可见反例。切换规则会清掉待完成请求，没有定时器、监听外部资源或真实网络；停止临时 HTTP 服务即可结束实验。

实际代码仍可用 AbortController 减少无用请求，但取消不能替代版本门槛，也不能回滚已经发生的服务端写入。服务端并发保存要用资源版本、条件更新与幂等记录解决，完整职责区分见 [普通评审中的守卫边界](../chinese-guides/career-05-code-review-risk-communication.md#修改后还要说明守卫保护了哪一层)。

### 六、资源与错误路径要围绕所有权收集证据

看到 createObjectURL 未配 revoke，先确认谁创建、谁还在使用、什么时候结束。文件替换和组件卸载都可能是释放点，但图片解码或下载仍使用 URL 时提前释放也会坏。对计时器、监听器、Worker、流和子进程同样如此：评审应把创建、持有、失效与清理连成路径。

重复操作后计数回到基线，只证明被计数资源的创建与释放平衡，不能证明完整内存审计通过。缓存保留也未必是泄漏；要比较相同工作负载下的引用与增长趋势。这里复用 [PERF-04 资源生命周期](../chinese-guides/perf-04-memory-listeners-resource-leaks.md#perf-04)，避免每次 AI 评审都凭一个 API 名重复下结论。

吞错也要具体说明后果：catch 后保留 loading 导致用户无法重试，与 catch 后展示安全错误但未把敏感堆栈公开，不能一概而论。验证时沿失败路径观察状态是否收敛、旧输入是否保留、重试是否重复动作。

可访问性检查关注这次变化影响的任务。保存失败后焦点落到 body、弹层关闭不返回触发按钮、错误状态没有可读说明，都可形成具体评论。DOM 有 ARIA 或截图好看不等于真实辅助技术验证；本篇桌面实验只检查焦点与状态行为，不把它扩张为完整读屏器验收。

### 七、评论应带证据，并明确哪些判断被驳回

一条可行动评论连接位置、触发、影响和修改方向。例如：“当前响应处理无条件覆盖状态；A 先发后回、B 后发先回时最后显示 A。请按当前请求与草稿版本判断采用资格，并以同一顺序复验。”行号帮助定位，真正证明来自可重复路径。

评论不必替作者重写所有代码。建议若采用新依赖或更大架构，应解释为何现有局部修复不足；不能为了避免竞态把所有错误都吞掉，或为了类型通过删除校验。修改后再确认合法输入和正常顺序，避免只证明错误路径不能继续。

保存评审结论时，还要拒绝旧提交证据被用于新提交。下面使用合成记录演示状态归并，保存为 `review-evidence.mjs`，运行 `node review-evidence.mjs`。

```js example=aidev04-evidence-version
const currentRevision = 'change-8';
const evidence = new Map([
  ['race-fixed', { revision: 'change-8', reproduced: false, reason: '当前版本已有代次检查' }],
  ['missing-label', { revision: 'change-8', reproduced: true, reason: '新增输入没有可访问名称' }],
  ['race-old', { revision: 'change-7', reproduced: true, reason: '旧版覆盖' }],
]);
function resolve(reference) {
  const item = evidence.get(reference);
  if (!item) return 'needs-evidence';
  if (item.revision !== currentRevision) return 'needs-current-revision';
  return item.reproduced ? 'confirmed' : 'rejected-with-reason';
}
for (const id of ['race-old', 'race-fixed', 'missing-label', 'invented']) console.log(resolve(id));
// => needs-current-revision
// => rejected-with-reason
// => confirmed
// => needs-evidence
```

这里 reproduced 是演示输入，不是模型自报结果；真实系统要保存测试输出、控制流证据或人工复核记录。没有复现并不总能驳回问题，例如触发依赖缺失设备或服务；该情形应保留待调查，而不是填 false 假装已经证伪。示例里的 false 特指已有当前版本反证。

误报记录说明是路径不可达、版本不适用、已有保护，还是仅为偏好。复核时间、真实缺陷逃逸和高风险召回比评论数量更有意义。校准样本还应包括修复后版本和上下文不足的情况，防止模型不断重报已消失问题。

### 八、人工责任落实到版本、未决事项与合入决定

**人工责任（Human Accountability）**意味着具有权限和业务上下文的人负责接受风险、批准合入与组织恢复。AI 可以提出线索和补丁，但模型的“审核通过”不能替代责任人判断；生成修复与验证修复也需要独立预言，不能让同一个错误假设同时决定实现和预期结果。

自动评审账号只获得必要仓库范围和评论能力，补丁进入正常评审路径。它不能自行扩大访问、删除失败检查或修改评测标签。发送代码给外部模型前确认允许范围，秘密与私人数据不进入提示或评论；模型服务不可用、上下文截断时明确覆盖缺口，保留人工路径。

合入前检查针对的提交、已确认问题、被驳回原因和仍未解决风险。关键代码需要相应领域负责人参与；低影响修改则使用更轻的流程。审核追求的是有证据的结论与可承担的剩余风险，而不是通过增加评论或测试数量获得表面确定性。

### 自检问题

1. 没有 AbortController 为什么不自动证明旧响应会覆盖界面？
2. postMessage 风险需要观察哪些发送、接收和业务条件？
3. 旧提交有复现，新提交已经改变，评论应处于什么状态？
4. 资源计数回零、模型没有评论，各自不能证明什么？

### 参考与延伸阅读

- [Google：代码评审关注什么](https://google.github.io/eng-practices/review/reviewer/looking-for.html)：核对功能、复杂度、并发与测试证据的评审方法。
- [MDN：Window.postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)：查 targetOrigin、接收来源和窗口引用的安全含义。
- [MDN：AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)：查浏览器取消能力；它不保证远端动作回滚。

核对日期：2026-10-06。示例没有调用模型服务或提交真实 PR；合成消息策略不替代真实跨窗口验证，桌面页面不验证服务端并发写入。
