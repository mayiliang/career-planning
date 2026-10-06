# AI 交互信任、控制与恢复知识点讲义

## AIAPP-10 通用 AI 交互、信任与可恢复体验

你在差旅申请里写到一半，点了“帮我整理”。生成期间，你又把“周五”改成“周四”。助手稍后返回一份很漂亮的申请，却把日期改回周五。页面显示成功，你的工作反而丢了。

问题不只是模型理解错，而是界面没有区分旧输入、生成候选和用户当前草稿。本篇从这次编辑出发，说明怎样让状态、证据与按钮含义一致。读完后，你应能设计失败后仍能继续的任务，并解释取消、重试、采用、撤销与人工接管分别改变什么。实验中的生成、时间和错误均为本地模拟，没有模型或业务写入。

### 学习前先确认

- 直接前置：[UX-01 交互状态、可用性与验证](../chinese-guides/ux-01-interaction-states-usability-validation.md#ux-01)，用于区分任务状态与用户下一步；[AIAPP-02 流式响应、SSE 与增量渲染](../chinese-guides/aiapp-02-streaming-sse-incremental-rendering.md#aiapp-02)，用于理解取消、断线及迟到事件。本篇在这些机制之上讨论产品怎样准确呈现事实。

### 一、先让用户知道这一按钮会改变什么

“整理草稿”“采用建议”“发送申请”应是三件事。第一步产生候选，第二步修改当前文稿，第三步才可能写入外部系统。如果都叫“完成”，用户无法判断哪些内容还能改、哪些动作已经发生。

进入功能时，用贴近操作的短说明交代输入范围、输出用途和实际动作。例如“根据此草稿生成措辞建议，采用前不会修改正文”比一段泛泛的免责声明更有用。涉及附件时，明确使用哪份文件或哪个选区；需要外部模型时，数据去向与用途不能藏在技术详情里。

**信任校准（Trust Calibration）**让用户对当前结果的信心与可核查证据相匹配。草稿流畅不等于事实准确；有引用不等于已完成核验；服务端收到请求也不等于申请已发送。界面用来源、日期、验证状态和回执帮助用户判断，不凭模型自报的“95% 可信”改变按钮权限。

在普通写作里，可以快速编辑和比较候选；若结果涉及支付、发布或其他高影响动作，确认依据来自独立业务流程。风险分级和强制审批的主解释在[高风险自动化讲义](../chinese-guides/aiprod-02-high-risk-automation-human-in-the-loop.md#aiprod-02)，不要为每次低风险措辞修改机械增加确认。

### 二、状态来自事实，进度文字不能替系统猜测

先画出常见路径：用户编辑，提交一份输入快照，等待候选，比较后采用。再补上中断、输入变化和远端状态未知等分支。不要只用 `loading` 与 `success` 两个布尔值表示整个任务。

| 观察到的事实 | 用户应该知道什么 | 合理的下一步 |
| --- | --- | --- |
| 请求已经入队，还没有正文 | 正在等待响应，草稿仍可编辑 | 等待或取消 |
| 已收到部分正文，还没有完成事件 | 这是未完成候选 | 查看、保留输入或停止 |
| 完整候选基于当前草稿版本 | 尚未采用，也没有发送 | 比较并采用 |
| 生成期间用户改了输入 | 原候选依据已经过时 | 保留新输入，重新生成 |
| 只读生成中断 | 当前候选不完整 | 新建一次生成，不拼接两次答案 |
| 写请求没有收到回执 | 是否执行仍未知 | 查询原操作状态 |

最后一行尤其容易误判。网络超时不是“发送失败”的充分证据；显示“再发一次”可能造成重复申请。应复用[工具未知结果的恢复](../chinese-guides/aiapp-04-tool-calling-execution-result-ui.md#五未知结果和取消都不能伪装成失败)，让服务端账本决定状态。

阶段描述也应来自事件。只知道请求未返回时写“等待响应”，不要编造“正在检查第三条政策”。没有明确总工作量时不显示虚假的百分比。部分成功应列出已完成和未完成部分，例如两份附件已解析、一份失败，而不是用一张全红错误页抹去已有结果。

### 三、取消、采用和撤销各有自己的版本条件

**可恢复性（Recoverability）**意味着中断以后，用户已经输入、选择、核对或修改的内容仍能被识别和继续使用。它不是任何错误旁边都放一个“重试”按钮。

草稿有自己的 revision，生成请求记住开始时的 revision 和 generationId。结果回来时两者都匹配，才有资格成为当前候选。取消先使 generationId 失效，再清理可取消的网络或计时器；这样已经排队的迟到回调也不能重新接管界面。机制细节复用[取消与资源释放](../chinese-guides/aiapp-02-streaming-sse-incremental-rendering.md#六取消先让旧尝试失效再释放资源)。

采用建议时保存采用前的草稿快照。撤销按钮只撤销本次采用，且仅当用户没有继续编辑时自动恢复；否则它会把采用后的新工作一起覆盖。实际编辑器可以提供范围明确的撤销栈或差异合并，不应把简单赋值包装成通用编辑器能力。

取消不等于撤销外部动作。关闭窗口后是否继续任务也要说清：普通本地生成可以停止，已提交的后台任务可能继续。再次打开时先查询真实状态与当前权限，不要从最后一帧动画猜测任务结果。

### 四、运行一页草稿与候选分离的实验

将以下完整页面保存为 `draft-recovery.html`，直接用现代桌面浏览器打开。它不使用外部依赖，也不保存到磁盘或服务端。页面以定时器模拟部分结果与完整结果；“模拟迟到结果”主动重放被取消或被编辑淘汰的旧快照，便于不依赖手速地观察保护条件。

```html example=aiapp10-draft-recovery runtime=project file=draft-recovery.html
<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<title>草稿与生成候选</title>
<style>
  body { max-width: 850px; margin: 40px auto; padding: 0 24px;
    font: 17px/1.65 system-ui; color: #193a35; background: #f5f8f6; }
  textarea { display: block; box-sizing: border-box; width: 100%; min-height: 130px;
    padding: 12px; font: inherit; }
  button, select { margin: 10px 8px 0 0; padding: 8px; font: inherit; }
  pre { white-space: pre-wrap; overflow-wrap: anywhere; padding: 16px; background: white; }
  :focus-visible { outline: 3px solid #236b9a; outline-offset: 3px; }
</style>
<h1>差旅申请草稿</h1>
<p>本地模拟：建议不会自动覆盖草稿，采用也不会发送申请。刷新会丢失本页内容。</p>
<label for="draft">你的草稿</label>
<textarea id="draft">周五前往北京参加会议。</textarea>
<label for="mode">模拟结果</label>
<select id="mode"><option value="ok">正常完成</option><option value="fail">部分结果后中断</option></select>
<div>
  <button id="generate">生成建议</button><button id="cancel" disabled>取消生成</button>
  <button id="late" disabled>模拟迟到结果</button>
</div>
<p id="status" role="status" aria-atomic="true">可以开始，当前草稿尚未发送。</p>
<h2>候选预览</h2>
<pre id="preview">暂无候选</pre>
<button id="adopt" disabled>采用建议</button><button id="undo" disabled>撤销采用</button>
<script type="module">
const byId = id => document.getElementById(id);
const draft = byId('draft');
let revision = 0, generation = 0, active = null, retired = null;
let candidate = null, undo = null;
const timers = new Set();
function schedule(callback, delay) {
  const id = setTimeout(() => { timers.delete(id); callback(); }, delay);
  timers.add(id);
}
function controls() {
  byId('cancel').disabled = active === null;
  byId('late').disabled = retired === null;
  byId('adopt').disabled = !candidate || candidate.revision !== revision;
  byId('undo').disabled = !undo || undo.appliedRevision !== revision;
}
function say(text) { byId('status').textContent = text; controls(); }
function invalidate() {
  if (active) retired = active;
  generation++;
  active = null;
  candidate = null;
  for (const id of timers) clearTimeout(id);
  timers.clear();
  byId('preview').textContent = '暂无可采用候选';
}
function deliver(request, phase) {
  if (request.generation !== generation || request.revision !== revision || active !== request) {
    say('已忽略过期结果；草稿未变。');
    return;
  }
  const text = '请审批以下出差安排：' + request.text;
  byId('preview').textContent = phase === 'partial' ? '未完成候选：' + text : text;
  if (phase === 'partial') return;
  active = null;
  if (request.fail) {
    byId('preview').textContent = '中断前的未完成候选：' + text;
    say('生成中断，草稿保留。可重新生成一份候选。');
  } else {
    candidate = { text, revision: request.revision };
    say('候选已就绪。请核对日期和地点后采用。');
  }
}
byId('generate').onclick = () => {
  invalidate();
  if (!draft.value.trim()) { say('请先填写草稿。'); draft.focus(); return; }
  const request = { generation, revision, text: draft.value, fail: byId('mode').value === 'fail' };
  active = request;
  say('正在生成候选；可以取消或继续编辑草稿。');
  schedule(() => deliver(request, 'partial'), 400);
  schedule(() => deliver(request, 'complete'), 1000);
};
draft.oninput = () => { revision++; invalidate(); say('草稿已修改，旧候选失效。'); };
byId('cancel').onclick = () => { invalidate(); say('已停止本地生成，草稿保留。'); };
byId('late').onclick = () => { if (retired) deliver(retired, 'complete'); };
byId('adopt').onclick = () => {
  if (!candidate || candidate.revision !== revision) return;
  const before = draft.value;
  draft.value = candidate.text;
  revision++;
  undo = { before, appliedRevision: revision };
  candidate = null;
  say('已采用到本地草稿，尚未发送。');
};
byId('undo').onclick = () => {
  if (!undo || undo.appliedRevision !== revision) return;
  draft.value = undo.before;
  revision++;
  undo = null;
  invalidate();
  say('已撤销本次采用，恢复采用前的草稿。');
};
window.addEventListener('pagehide', invalidate);
window.addEventListener('pageshow', event => {
  if (event.persisted) say('页面已恢复，草稿仍在；需要时重新生成候选。');
  else controls();
});
controls();
</script>
</html>
```

先正常生成并采用，再撤销：草稿应恢复为原句，页面始终没有声称申请已发送。采用后手工继续修改，撤销按钮会禁用，避免整段回退吞掉新编辑；这个实验没有实现浏览器原生撤销栈的完整保持。

再生成并立即修改日期，随后点“模拟迟到结果”。草稿保留新日期，旧结果不取得采用资格。改成“部分结果后中断”时，预览可见，但采用按钮不可用；重新生成创建新候选，不把两次结果接在一起。取消会清理定时器，主动重放仍被 generation 与 revision 拦住：清理资源和拒绝旧结果是互补控制。

页面只把状态句放在 `role="status"` 中，预览不是不断播报的 live region；没有在新结果到达时移动输入焦点。它验证本地状态与文本插入，没有验证真实 SSE、远端取消、刷新恢复、人工服务或内存泄漏。若用于生产，应把会话事实和持久草稿接入[会话恢复模型](../chinese-guides/aiapp-12-conversation-state-context-compression-privacy.md#一聊天窗口只展示状态的一部分)，不能因为页面里还有文字就称为已保存。

### 五、依据和错误说明要靠近当前决定

**渐进披露（Progressive Disclosure）**先展示当前决定所需的信息，再提供展开路径。候选旁边显示“未核验金额”“来源更新于何时”和可执行动作；需要排查的人再展开来源片段、错误类别与关联号。不可逆影响、接收对象和不确定结果属于主要信息，不能折叠到几乎看不到的位置。

来源应贴近对应主张。两份政策冲突时，将冲突条件并列；用户查看原文再返回，仍应保留草稿、滚动位置和选择范围。有链接只说明可以打开资料，不能直接显示“事实已验证”，证据支持的检查见[RAG 的引用落地](../chinese-guides/aiapp-06-rag-citations-source-trust.md#五引用存在与引用支持结论是两次不同的检查)。

错误文案连接影响与下一步。“附件格式无法读取，正文已保留，请换一份可提取文本的文件”比“处理失败”有帮助；“请求结果待确认，请查询原操作”比一律重试诚实。预算不足可以缩小输入或使用手动路径，不应静默换到不符合原数据处理条件的模型。

缺少证据时保留为草稿，按任务合同限制后续动作；不要只在页面顶部放一个“AI 可能出错”横幅。事实、推断与建议也要区分，例如“根据两份当前政策”与“建议向行政确认”分别说明已知和待决事项。

### 六、人工接管要带走任务，也要移交控制权

**人工接管（Human Handoff）**让有能力的人继续同一任务，包含必要背景和当前状态，并让用户知道谁正在处理。普通交互可以提供导出草稿、手动填写或联系支持；本篇不重复设计高风险审批链。

一个可用交接包可以包括用户目标、最新草稿版本、已确认事实、来源、失败类别、未决操作 ID 和数据限制。模型推断与用户原话分开，敏感附件按实际职责筛选。显示接收方和传递范围，不自动把完整对话发送给无关人员。

“已提交给人工”需要真实接收回执。队列不可用时说清未送达，并提供保留或导出方式。人工接管后，AI 不应继续后台改写同一草稿；恢复自动化也需要明确的控制权与版本转换，避免两位处理者同时写入。

产品的非 AI 路径仍应能完成核心任务。用户不愿上传附件或关闭个性化，不应因此丢失手动填写能力。如何暂停记忆使用但保留当前会话，见[记忆控制的区别](../chinese-guides/aiapp-13-long-term-memory-personalization-forgetting.md#六本次忽略关闭与删除改变不同状态)。

### 七、用可理解性和恢复结果检验体验

无障碍首先是状态设计：变化不只靠颜色，按钮有可理解名称，生成时不抢焦点，键盘可以到达取消与来源。长输出按语义段节流播报，允许停下或跳到最新；用户正在阅读旧段落时不要自动拖到底部。图片有替代文本，音视频有字幕或转写，生成组件退回文本后仍应保留任务含义。具体 WCAG 验收继续使用[A11Y-01](../chinese-guides/a11y-01-wcag-testing-governance.md#a11y-01)。

桌面缩放、键盘、减少动画与辅助技术仍需要验证。产品不开放移动端，不意味着有关浏览器状态和无障碍的机制可以讲错；也不必因此建立完整移动设备矩阵。Chrome 内置 AI 的会话创建、克隆与销毁是具体平台能力，不是所有模型接口的通用操作。

围绕五个任务做走查：生成并采用；生成中改输入；中断后保留工作；查看失效引用；人工暂不可用时继续。让参与者解释“当前哪份文字是我的”“是否已经发送”“怎样恢复”，比只问是否喜欢界面更容易发现问题。自动实验能验证状态条件，不能替代真实参与者理解或实际读屏效果。

指标看合格任务完成、恢复成功、误采用、反复重试、编辑与放弃，并说明分母。用户点了采用不证明内容正确，更多人工接管也可能意味着危险动作终于被正确停止。把反馈与[质量和轨迹评估](../chinese-guides/aiapp-08-evaluation-observability-release-gates.md#一先把成功拆成能够检查的事实)结合，再决定改文案、交互或执行机制。

### 带着问题回看

1. 生成成功、采用成功、发送成功分别需要什么事实？
2. 为什么既要取消计时器，也要检查 generationId 和草稿版本？
3. 采用后用户又编辑了文字，整段撤销会损失什么？
4. 人工队列没有收到请求时，页面应如何表达接管状态？

### 参考与延伸阅读

官方资料核对于 2026-10-04。页面与情境为本站独立编写，没有调用 Chrome 内置模型。

- [Chrome：内置 AI 的体验与运行建议](https://developer.chrome.com/docs/ai/built-in-ai-dos-donts?hl=zh-cn)：查询该平台的会话、资源释放与输出处理条件，避免把平台实践当成通用保证。
- [W3C：状态消息的可访问性](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)：理解状态变化怎样在不移动焦点的情况下被辅助技术识别。
- [MDN：AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)：核对 Web 请求取消机制，结合正文区分停止等待与外部副作用撤销。
