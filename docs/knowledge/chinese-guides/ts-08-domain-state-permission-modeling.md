# TypeScript 知识点讲义

## TS-08 业务状态与权限类型建模

一份资料正在审核。作者看见“提交”，审核人看见“通过”和“退回”。这时作者在另一个窗口修改了内容，审核人仍拿着旧版本点击通过。按钮、TypeScript 和服务器分别应该阻止什么？

本讲围绕一个小流程：draft → submitted → approved 或 rejected。先建立状态与动作，再加入身份关系和版本。文中的桌面观察页只在本地内存中运行，用来观察同一套规则；真实服务必须从可信会话取得身份，并在数据库提交时重新执行检查。

### 学习前先确认

- 直接前置：[TS-07 接口契约、运行时校验与错误模型](../chinese-guides/ts-07-runtime-contracts-validation-error-models.md#ts-07)。本讲假设命令已从 unknown 解析，字段类型、未知动作、长度与版本格式已在入口检查。

读完应能分开回答：动作是否适用于当前状态、当前身份是否有权操作，以及请求是否针对最新版本。

### 一、实体靠身份延续，值对象靠内容表达意义

**实体（Entity）**的身份在变化中持续存在。同一份资料改了标题、进入审核，仍是同一个 documentId。**值对象（Value Object）**用内容表达意义，例如带币种的金额、起止时间；通常通过受控构造保证有效，不在创建后任意改字段。

品牌类型可以阻止两种同为字符串的 ID 被误传：

```ts example=ts08-branded-ids
declare const documentIdBrand: unique symbol;
declare const userIdBrand: unique symbol;
type DocumentId = string & { readonly [documentIdBrand]: true };
type UserId = string & { readonly [userIdBrand]: true };

function documentId(raw: unknown): DocumentId {
  if (typeof raw !== 'string' || !/^doc_[1-9][0-9]*$/.test(raw)) {
    throw new Error('资料编号无效');
  }
  // 断言集中在已完成格式校验的构造入口。
  return raw as DocumentId;
}
function findDocument(id: DocumentId) { return '读取 ' + id; }
function rejected(userId: UserId) {
  // @ts-expect-error 两种 ID 不可混用
  findDocument(userId);
}
console.log(findDocument(documentId('doc_7'))); // => 读取 doc_7
```

品牌不证明资料存在，也不证明操作者有权限。它只是编译期标记；序列化成 JSON 后必须重新解析。类似地，readonly 只能限制类型层的写法；真正不可变的值对象还要复制、冻结或隐藏可变内部结构。

### 二、用判别状态保存每个阶段真正需要的数据

一组布尔值很容易产生矛盾：isDraft、isSubmitted、isApproved 同时为真怎么办？把阶段放进一个判别字段，可以直接排除一部分无效组合。

```ts example=ts08-state-shape
type Review =
  | { kind: 'draft'; title: string }
  | { kind: 'submitted'; title: string; submittedAt: string }
  | { kind: 'approved'; title: string; reviewedAt: string }
  | { kind: 'rejected'; title: string; reviewedAt: string; reason: string };

function label(state: Review): string {
  switch (state.kind) {
    case 'draft': return '草稿：' + state.title;
    case 'submitted': return '等待审核，提交于 ' + state.submittedAt;
    case 'approved': return '已通过，审核于 ' + state.reviewedAt;
    case 'rejected': return '已退回：' + state.reason;
  }
}
function rejected() {
  // @ts-expect-error 退回状态必须保留原因
  const missing: Review = { kind: 'rejected', title: '类型', reviewedAt: '示例时间' };
}
console.log(label({ kind: 'draft', title: '条件类型' })); // => 草稿：条件类型
```

“正在保存”通常是请求状态，不是资料的业务阶段。可另建 idle/saving/error 的 UI 联合，让资料保持 submitted，同时展示保存中。权限也是另一个维度：相同 submitted 状态对作者和审核人有不同动作。

判别联合不会验证网络值，也不会保证 reviewedAt 是真实有效时间；这些证据来自[TS-07 的解析入口](../chinese-guides/ts-07-runtime-contracts-validation-error-models.md#ts-07)。

### 三、先用状态动作表回答能发生什么

| 当前状态 | 状态允许的动作 | 成功后状态 |
| --- | --- | --- |
| draft | submit | submitted |
| submitted | approve、reject | approved 或 rejected |
| approved | 无 | 保持 |
| rejected | 无 | 保持 |

本讲把 rejected 作为终态。真实产品若允许修改后重提，就要明确加入相应动作与转换；不要靠“退回后顺便改成 draft”暗中增加流程。

下文项目里的 actionTable 同时用于派生静态动作类型、按钮可见性和运行时状态检查。它是“状态允许什么”的统一来源。角色与资源关系由另一条策略判断，这样不会把所有审核人都误认为对所有资料有权限。

### 四、纯转换函数把决定与副作用分开

**状态转换（State Transition）**可以写成纯函数：给它当前记录、可信身份、命令和当前时间，返回下一状态或失败。它不发请求、不写库、不读取系统时间，因此同样输入可以重现同样决定。

下面是后续观察页实际使用的 model.ts。为了突出规则，项目中的 ID 使用普通字符串；真实边界可以换成上一节的受控品牌。拒绝原因是命令内容；演员身份来自单独参数，不能从请求正文照单全收。

```ts example=ts08-model runtime=project file=model.ts
export type Action = 'submit' | 'approve' | 'reject';
export type Status = 'draft' | 'submitted' | 'approved' | 'rejected';
export const actionTable = {
  draft: ['submit'],
  submitted: ['approve', 'reject'],
  approved: [],
  rejected: [],
} as const satisfies Record<Status, readonly Action[]>;

export type ActionFor<S extends Status> = (typeof actionTable)[S][number];
type Base = Readonly<{ id: string; authorId: string; reviewerId: string; version: number; title: string }>;
export type Document = Base & (
  | { kind: 'draft' }
  | { kind: 'submitted'; submittedAt: string }
  | { kind: 'approved'; reviewedAt: string }
  | { kind: 'rejected'; reviewedAt: string; reason: string }
);
export type Actor = Readonly<{ id: string; role: 'author' | 'reviewer' }>;
export type Command =
  | { action: 'submit' | 'approve'; expectedVersion: number }
  | { action: 'reject'; expectedVersion: number; reason: string };
export type Decision =
  | { ok: true; next: Document; event: { kind: Action; documentId: string; actorId: string; version: number; at: string } }
  | { ok: false; code: 'DENIED' | 'STALE' | 'STATE' | 'REASON' };

export function authorized(doc: Document, actor: Actor, action: Action): boolean {
  return action === 'submit'
    ? actor.role === 'author' && actor.id === doc.authorId
    : actor.role === 'reviewer' && actor.id === doc.reviewerId && actor.id !== doc.authorId;
}
export function visibleActions(doc: Document, actor: Actor): readonly Action[] {
  const allowed: readonly Action[] = actionTable[doc.kind];
  return allowed.filter(action => authorized(doc, actor, action));
}
export function decide(doc: Document, actor: Actor, command: Command, now: string): Decision {
  if (!authorized(doc, actor, command.action)) return { ok: false, code: 'DENIED' };
  if (command.expectedVersion !== doc.version) return { ok: false, code: 'STALE' };
  const allowed: readonly Action[] = actionTable[doc.kind];
  if (!allowed.includes(command.action)) return { ok: false, code: 'STATE' };
  // 明确投影公共字段，避免旧阶段的专属字段进入新阶段。
  const base: Base = {
    id: doc.id, authorId: doc.authorId, reviewerId: doc.reviewerId,
    version: doc.version + 1, title: doc.title,
  };
  let next: Document;
  switch (command.action) {
    case 'submit': next = { ...base, kind: 'submitted', submittedAt: now }; break;
    case 'approve': next = { ...base, kind: 'approved', reviewedAt: now }; break;
    case 'reject': {
      const reason = command.reason.trim();
      if (!reason || reason.length > 120) return { ok: false, code: 'REASON' };
      next = { ...base, kind: 'rejected', reviewedAt: now, reason };
      break;
    }
  }
  return { ok: true, next, event: {
    kind: command.action, documentId: doc.id, actorId: actor.id,
    version: next.version, at: now,
  } };
}
```

该函数返回事件描述，不直接发送事件。只有持久化成功后，才能把“请求批准”当成“已经批准”。正式领域事件可使用 DocumentApproved 这样的过去式名称；示例 kind 复用动作名以便页面展示，旁边的版本、操作者和时间记录发生结果。

这里故意没有把 decide 的参数限制成“编译时合法的状态—命令对”：服务器必须面对陈旧但格式正确的请求，并返回运行时拒绝。更严格的本地辅助接口可以使用 ActionFor<S>，但不能替代这个 guard。

### 五、角色、资源关系与环境条件共同决定授权

**RBAC** 根据角色授予能力，例如审核人可执行审核类动作。**ABAC** 还会检查资源与环境属性，例如文档所属组织、敏感级别或操作时间。基于关系的策略则直接询问“这个人是不是这份资料的指定审核人”。

项目策略同时检查 role、authorId、reviewerId，并禁止作者审核自己。若只写 `role === 'reviewer'`，会让一个审核人处理其他人的资料。

实际服务端的顺序应是：验证会话 → 加载当前身份与资源 → 解析命令 → 判断策略和状态 → 条件提交。为了减少信息泄露，示例先授权，再返回版本或状态错误。具体业务可能调整错误展示，但不能信任客户端自报的角色。

页面拿到的 capabilities 是某一时刻的能力快照。隐藏按钮有助于用户理解，但请求仍可被手工构造，权限也可能在打开页面后撤销。授权需要每次由服务器重判，相关边界见[SEC-01](../chinese-guides/sec-01-xss-csrf-trust-boundaries.md#sec-01)。

### 六、运行观察页，比较可见按钮与手工请求

把 model.ts、以下 tsconfig.json 与 index.html 放进一个新的实验目录。使用 TypeScript 5.7.2 编译得到 model.js，再通过本地静态服务器打开 index.html。示例按桌面阅读设计，不接入真实账号或真实数据。

```json example=ts08-config runtime=project file=tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noEmitOnError": true,
    "types": [],
    "lib": ["ES2022"]
  },
  "files": ["model.ts"]
}
```

```html example=ts08-review-page runtime=project file=index.html
<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<title>审核状态观察页</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #f3f5f9; color: #18243c; font: 16px/1.7 system-ui; }
  main { max-width: 1060px; margin: 44px auto; padding: 28px; background: white; border-radius: 18px; }
  h1 { margin: 0 0 8px; } h2 { font-size: 18px; }
  .hint { color: #526078; } .row { display: flex; gap: 18px; flex-wrap: wrap; align-items: end; }
  section { margin-top: 24px; padding: 20px; border: 1px solid #dce3ed; border-radius: 12px; }
  label { display: grid; gap: 6px; } select, input, button { font: inherit; padding: 8px 12px; }
  button { border: 1px solid #aab9d0; background: #f2f6ff; border-radius: 8px; cursor: pointer; }
  button:focus-visible, input:focus-visible, select:focus-visible { outline: 3px solid #5574cc; outline-offset: 3px; }
  #record { font-size: 20px; font-weight: 650; } #result { min-height: 30px; color: #244989; }
  #log { max-height: 220px; overflow: auto; padding-left: 24px; }
</style>
<main>
  <p class="hint">TS-08 · 本地规则模拟</p>
  <h1>谁能对哪一版资料做什么</h1>
  <p>可见动作来自同一张状态表。手工请求用来观察：按钮之外，规则还会检查什么。</p>
  <div class="row">
    <label>当前身份<select id="actor">
      <option value="author">作者 林</option><option value="reviewer">指定审核人 周</option>
      <option value="other">其他审核人 吴</option>
    </select></label>
    <label>请求携带版本<input id="version" type="number" min="1" step="1" value="3"></label>
    <button id="sync">读取最新版本</button><button id="reset">重置实验</button>
  </div>
  <section>
    <h2>当前记录与可见动作</h2>
    <p id="record"></p><div id="actions" class="row"></div>
  </section>
  <section>
    <h2>手工构造请求</h2>
    <div class="row">
      <label>动作<select id="manual"><option>submit</option><option>approve</option><option>reject</option></select></label>
      <label>退回原因<input id="reason" value="请补充例子" maxlength="120"></label>
      <button id="send">发送模拟请求</button>
    </div>
    <p id="result" role="status" aria-live="polite">等待操作</p>
  </section>
  <ol id="log" aria-label="决定记录"></ol>
</main>
<script type="module">
import { decide, visibleActions } from './model.js';
const $ = id => document.getElementById(id);
const actors = {
  author: { id: 'lin', role: 'author' },
  reviewer: { id: 'zhou', role: 'reviewer' },
  other: { id: 'wu', role: 'reviewer' },
};
const initial = () => ({
  id: 'doc_7', authorId: 'lin', reviewerId: 'zhou',
  version: 3, title: '条件类型讲义', kind: 'draft',
});
let record = initial();
let tick = 0;
const names = { submit: '提交', approve: '通过', reject: '退回' };
const failures = { DENIED: '无权执行', STALE: '版本已过期', STATE: '当前状态不允许', REASON: '退回原因无效' };
function render() {
  $('record').textContent = record.title + ' · ' + record.kind + ' · version ' + record.version;
  $('actions').replaceChildren();
  const actions = visibleActions(record, actors[$('actor').value]);
  if (!actions.length) $('actions').textContent = '当前身份没有可执行动作';
  for (const action of actions) {
    const button = document.createElement('button');
    button.textContent = names[action];
    button.addEventListener('click', () => send(action));
    $('actions').append(button);
  }
}
function send(action) {
  const version = Number($('version').value);
  if (!Number.isSafeInteger(version) || version < 1) {
    $('result').textContent = '请求版本必须是正整数'; return;
  }
  const command = action === 'reject'
    ? { action, expectedVersion: version, reason: $('reason').value }
    : { action, expectedVersion: version };
  const now = new Date(Date.UTC(2026, 8, 15, 8, 0, tick++)).toISOString();
  const result = decide(record, actors[$('actor').value], command, now);
  if (result.ok) record = result.next;
  const message = result.ok
    ? '成功：' + names[action] + '，新版本 ' + record.version
    : result.code + '：' + failures[result.code];
  $('result').textContent = message;
  const line = document.createElement('li');
  line.textContent = message;
  $('log').prepend(line);
  if ($('log').children.length > 20) $('log').lastElementChild.remove();
  render();
}
$('actor').addEventListener('change', render);
$('send').addEventListener('click', () => send($('manual').value));
$('sync').addEventListener('click', () => {
  $('version').value = String(record.version);
  $('result').textContent = '已读取 version ' + record.version;
});
$('reset').addEventListener('click', () => {
  record = initial(); tick = 0; $('version').value = '3';
  $('actor').value = 'author'; $('log').replaceChildren();
  $('result').textContent = '已重置'; render();
});
render();
</script>
</html>
```

在实验目录执行下列命令，保持静态服务器运行，再打开 http://127.0.0.1:43916。第一条命令使用固定版本的编译器；第二条需要本机有 Python 3，也可换成你已有的静态服务器。观察完后在该终端按 Ctrl+C 关闭服务。

```powershell example=ts08-run-page runtime=project
npm exec --package=typescript@5.7.2 -- tsc -p tsconfig.json
python -m http.server 43916 --bind 127.0.0.1
```

按以下顺序观察：

1. 作者以 version 3 提交，状态变为 submitted、版本变为 4；请求框仍保留 3，模拟旧页面。
2. 切换指定审核人，点击通过，得到 STALE，记录保持 submitted。
3. 点击“读取最新版本”再通过，得到 approved、version 5。
4. 重置并切换其他审核人，手工发送 approve，得到 DENIED。
5. 重置后，作者手工发送 approve 仍被拒绝；作者对已 submitted 的记录再 submit，在版本同步后得到 STATE。

页面复用真实纯函数，没有用另一套脚本伪造结果；但它不是已部署的服务器授权实现，切换身份也只是实验控制项。

### 七、期望版本把陈旧请求变成明确冲突

**乐观并发（Optimistic Concurrency）**假设冲突相对少，让用户先编辑，提交时检查记录是否仍是自己读到的版本。

请求携带 expectedVersion: 3，服务器当前已经是 4，不能仅因为动作和角色正确就继续写。先返回冲突，让用户重新查看差异，再决定是否提交新命令。

纯函数中的比较还不够。数据库需要条件更新，例如同时匹配 id 与 version，写入后检查影响行数；比较与写入必须在同一并发控制边界。否则两个请求都先读到 3、都比较成功，再各自写入，仍会丢更新。

HTTP 层也可用强 ETag 与 **If-Match** 表达类似前置条件；版本号和 ETag 是不同表示，具体错误与重试规则要与 API 契约一致。它们不负责授权，不能因为版本匹配就跳过身份判断。

### 八、幂等解决重复提交，不解决谁有权限

**幂等（Idempotency）**关注“同一个命令因为超时被重复发送，会不会重复产生副作用”。它与版本检查不同：用户可能已经提交成功，只是没收到响应；简单重发旧版本会得到冲突，却无法告诉用户上次是否成功。

通常用操作者、资源与幂等键定位收据，同时保存规范化命令的摘要与原结果：

| 收到的请求 | 收据情况 | 处理 |
| --- | --- | --- |
| 第一次命令 | 不存在 | 在事务内执行并保存结果 |
| 相同键、相同命令 | 已完成 | 在当前授权策略允许的范围内返回已存结果 |
| 相同键、不同内容 | 已存在 | 拒绝键复用 |
| 相同键、仍在执行 | 处理中 | 按契约等待或返回处理中 |

幂等键不能只按字符串全局共享，否则不同用户可能读到别人的结果。检查当前身份与资源访问能力后再处理收据；撤权时可以拒绝读取历史结果，但绝不能重新执行已提交的操作。过期时间、收据清理和结果暴露范围也需要约定。

本讲观察页没有持久化收据，因此重复提交展示状态或版本拒绝，不声称完成了幂等实现。这使“纯转换已验证”与“分布式写入已处理”保持清楚边界。

### 九、命令表达请求，事件记录已经发生

**命令（Command）**是“请批准这份资料”，可能被拒绝。**领域事件（Domain Event）**是“资料已批准”，只能在事实提交后产生。把命令刚发出就写成 approved，会在网络失败后留下假成功状态。

如果批准后要发通知，不能先通知再保存；也不能在数据库保存成功后只发一次网络消息，却不记录发送失败。常见方式是 **Outbox**：业务记录和待发布事件在同一事务保存，后台可靠转发。转发通常仍可能重复，消费者要按事件标识去重。

外部支付、邮件等动作无法由本地内存“撤销”。跨服务流程需要补偿动作与失败状态，例如退款请求、人工核查；补偿是新的业务动作，不是把历史删除。真实事务的完成边界可参照[BROWSER-01 的持久化事务](../chinese-guides/browser-01-render-events-storage.md#九亲眼看一次请求成功后的回滚)。

### 十、时间、审计与能力快照都要有来源

纯转换函数把 now 作为参数，方便复现实验；正式服务应从可信时钟取得时间。客户端倒计时、按钮过期提示只是辅助，不能决定授权到期是否成立。

审计记录至少关联资源、操作者、动作、旧版本与新版本、结果、时间和追踪标识。操作者从会话得到，不采信命令里的 actorId；拒绝原因也避免泄露无权查看的资源细节。敏感输入和凭据不应整体进入日志。

能从已有状态算出的信息就现场派生，例如 canApprove 来自状态、身份与策略。不再同时持久化 isApproved、status、canApprove 三份容易不一致的数据。需要缓存能力时，要明确它是快照、何时失效，最终提交仍重判。

### 十一、新增状态应让遗漏显露出来

给流程加入 archived 时，状态动作表必须明确填写空集合，渲染器也要展示“已归档”。不应该让未知状态悄悄进入一个返回空白页面的 default。

```ts example=ts08-archived-actions
type Action = 'submit' | 'approve' | 'reject';
const table = {
  draft: ['submit'],
  submitted: ['approve', 'reject'],
  approved: [],
  rejected: [],
  archived: [],
} as const satisfies Record<'draft' | 'submitted' | 'approved' | 'rejected' | 'archived', readonly Action[]>;
type Allowed<S extends keyof typeof table> = (typeof table)[S][number];
function rejected() {
  // @ts-expect-error archived 没有合法动作，结果为 never
  const impossible: Allowed<'archived'> = 'approve';
}
const visible: readonly Action[] = table.archived;
console.log(visible.length, visible.includes('approve')); // => 0 false
```

这个小例子展示类型拒绝和动作表的运行时结果。接回完整项目还需扩展 Document 联合、解析入口、显示标签及真实服务 guard，并验证 archived 对三个动作都拒绝。不能只更新表格就宣称所有链路已支持。

旧客户端遇到新状态时，应按[TS-07 的未知枚举策略](../chinese-guides/ts-07-runtime-contracts-validation-error-models.md#六未知字段和未知枚举需要各自的策略)进入只读或拒绝分支，不把它强行转成 draft。AI 提议的动作也走相同解析、授权、状态和版本检查。

### 十二、用少量关键路径检查模型有没有说到做到

不必穷举所有标题字符串；优先检查真正改变决定的维度：

| 场景 | 应观察到的结果 |
| --- | --- |
| 作者提交自己的 draft，版本正确 | submitted，版本加一 |
| 作者请求 approve | DENIED |
| 未被分配的审核人请求 approve | DENIED |
| 指定审核人使用旧版本 | STALE，记录不变 |
| 正确版本在终态继续操作 | STATE，记录不变 |
| reject 原因为空 | REASON，记录不变 |
| 新增 archived | 类型、可见动作、服务 guard 都拒绝动作 |

再看两项持久化问题：并发比较与写入是否原子完成；重复命令是否有可靠收据。这些不能由页面观察替代。

状态变多、并行子状态复杂或需要可视化追踪时，可以考虑状态机库；授权策略跨多个服务共享时，可以考虑专门的策略系统。引入工具前先把当前状态表、身份来源和失败语义写清楚，否则只是把模糊规则换一种语法保存。

### 参考与延伸阅读

- [TypeScript：判别联合与穷尽检查](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)：用类型显露遗漏。
- [OWASP：授权指南](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)：每次请求验证权限与默认拒绝。
- [MDN：If-Match](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/If-Match)：资源更新的前置条件。
- [继续阅读 TS-09](../chinese-guides/ts-09-version-migration-module-governance.md#ts-09)：让模型与工具链在版本迁移后仍然可用。
