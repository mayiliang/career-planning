# Agent 长任务、恢复、幂等与取消知识点讲义

## AGENT-06 长运行任务、Task 句柄、恢复与可观测进度

资料导出需要两分钟。用户点了一次开始，等到一半刷新页面，又出现一个“开始导出”按钮。如果再次点击创建第二个任务，系统不只是浪费计算，还可能把同一批文件发送两次。更容易误导的是取消按钮：页面立刻显示“已取消”，后台却仍在提交制品。

长任务要把“我正在等某个请求”与“服务端仍在处理某个对象”分开。本篇沿着创建、查询、补充输入、取消和恢复，解释 Tasks 扩展负责哪些协议语义，以及应用还需要怎样保存幂等与执行事实。示例使用合成任务，不访问真实队列或业务服务。

### 学习前先确认

- 直接前置：[AGENT-01 Agent 循环、规划、停止与恢复](../chinese-guides/agent-01-loop-planning-stopping-recovery.md#agent-01)，理解状态机、停止和检查点；[AGENT-04 MCP Client 发现、能力与兼容](../chinese-guides/agent-04-mcp-client-discovery-compatibility.md#agent-04)，理解扩展声明、版本与客户端支持条件。

### 一、先确认双方支持任务，再处理两种返回形态

**长运行任务（Long-Running Task）**是需要跨越单次请求等待来推进和观察的工作。长不只指计算耗时：等待人工输入、排队资源或外部系统，都可能让一次 HTTP 请求不适合作为整个任务的生命周期。

本篇核对于 2026-10-05，主线是 Tasks 扩展 `io.modelcontextprotocol/tasks` 的 2026-07-28 Stable Schema，而非旧版实验性 Tasks。Server 在发现能力中声明扩展，Client 在每次请求的能力元数据中声明支持。没有双方支持，不能返回一个客户端根本无法处理的任务句柄。

当前任务增强适用于 `tools/call`。由 Server 按请求决定直接返回普通结果，还是返回 `CreateTaskResult`，后者以 `resultType: "task"` 区分，并带 taskId、状态、创建时间、TTL 等信息。客户端应处理两种结果，不凭工具过去总是很快就假定永远同步。

创建不是一个通用的 `tasks/create` 方法；也不是看到 HTTP 202 就自动得到 MCP Task。应用自己的 `POST /tasks`、创建幂等键和队列入口属于业务接口。阅读旧系统日志时，先确认它写的是应用接口还是 MCP 线上报文，不能按名字直接等同。

### 二、句柄让用户回来时找到同一件工作

**任务句柄（Task Handle）**是服务端返回的 taskId 等任务引用。Client 保存它，之后通过 `tasks/get` 查询；刷新页面、重新连接或换一个服务实例，都不应因此重新创建任务。

任务句柄应具有足够随机性，避免枚举。官方扩展允许把高熵句柄作为访问存储状态的 bearer 引用；这意味着某些部署中“持有句柄”就可能具有访问意义，必须保护它。对于有账号和租户的业务，本篇采用更严格的设计：每次查询、更新和取消再检查当前主体与任务归属，不仅依赖 ID 难猜。

创建响应到达前，任务应已持久建立；客户端也要在继续等待前保存引用。`ttlMs` 是从任务创建起计算的留存时间，可能变化，null 表示不设有限 TTL；它不是上篇目录缓存的新鲜度，也不应解释为每次查询都会自动续期。过期后找不到句柄，不证明任务从未执行，尤其不能直接重新提交有副作用的工作。

结果下载链接也可能先于任务记录过期。有权用户可以通过任务重新获得有效引用，但已经删除或无权访问的制品不能因为旧句柄仍在浏览器里就恢复。客户端应显示可理解的过期状态和下一步成本，服务端按留存政策清理任务与制品。

### 三、协议状态和内部工作阶段要分开命名

Tasks 的状态是 `working`、`input_required`、`completed`、`failed`、`cancelled`。后三个是终态，不能再返回工作状态。内部的 queued、validating、cancel_requested 或 reconciling 可以帮助调度，但它们不是可随意写进协议 status 的新枚举。

| 可观察情况 | 协议层解释 | 应用需要补充的事实 |
| --- | --- | --- |
| 正在排队或处理 | working | 阶段、完成项和更新时间 |
| 等待客户端输入 | input_required | 待回答的 inputRequests |
| 原操作已有最终结果 | completed | 结果及其业务含义 |
| 执行发生协议错误 | failed | error 与是否可恢复的说明 |
| 任务实际停止 | cancelled | 已发生、未开始和待处理部分 |

`completed` 表示已有原请求的最终结果，不等于业务必然成功。例如工具结果本身可以带 `isError`，客户端还需解释该工具的结果合同；不能只看任务终态就显示“导出成功”。同样，某个外部步骤结果未知时，应用应对账，不能随便编造一个协议 unknown 终态。

进度来自完成事实：固定五份文件已校验两份，可以显示 2/5；总工作量未确定时显示阶段与已完成项，不用 token 数伪造百分比。原始材料中敏感信息不需要出现在进度日志里，记录对象引用、阶段与失败类别通常已足够排错。

### 四、输入更新是提交回应，不是直接修改任务状态

`tasks/get` 返回任务当前快照；当状态是 input_required 时包含 inputRequests 映射。Client 为相应键收集回应，再通过 `tasks/update` 提交 inputResponses。Server 返回空确认并不代表任务已完成，应继续观察状态。请求键在任务生命周期内不能复用为另一项输入，迟到回答才不会误用到新问题。

输入可以部分到达，尚缺必需回应时继续等待。未知或已经满足的键不能重复触发同一动作。用户拒绝也要作为明确决定处理，不能把拒绝字段省略后当成没有收到而反复询问。审批绑定的主体、参数和时效仍由业务层验证，详见 [补充输入与授予权限](../chinese-guides/agent-05-human-in-the-loop-risk-approval.md#二补充输入与授予权限走不同判断)。

这里与普通 MRTR 有一个容易混淆的区别：普通多轮请求把回应附到原方法的下一次请求；已建立 Task 的输入走 tasks/update，不能为了回答一个问题重新创建长任务。查询本身也不应顺便消费审批或改变任务，才能安全地重复读取。

当前扩展没有 `tasks/list`。客户端要维护自己获准访问的任务引用，应用若提供“我的任务”列表，需要另外定义有权限过滤的业务查询。不能把恢复设计建立在某个已移除方法总能枚举出所有任务的假设上。

### 五、取消请求被收到，不等于任务已经取消

**协作式取消（Cooperative Cancellation）**表示 Client 提出取消意图，Server 在可停止的边界尝试收敛工作。`tasks/cancel` 的空结果只确认收到请求，任务仍可能以 completed 或 failed 结束。要再次查询或接收可信任务通知，才能知道最终状态。

关闭某次 tasks/get 的 HTTP 连接，只是停止等那次查询；它不等于发送任务取消。反过来，任务取消已请求时，界面可以停止新输入并显示“等待取消结果”，但不要把本地状态直接写成 cancelled。

保存为 `task-cancellation.mjs`，用 Node.js 22 执行。代码只模拟状态映射，没有实现 MCP 报文和网络。`cancelRequested` 是应用内部字段；外部提交和安全停止是两个由测试场景明确选择的结果。

```js example=agent06-cancellation-race
function createTask() { return { status: 'working', cancelRequested: false, receipt: null }; }
const terminal = new Set(['completed', 'failed', 'cancelled']);
function requestCancel(task) {
  if (!terminal.has(task.status)) task.cancelRequested = true;
  return {}; // 收到意图，不承诺最终 cancelled。
}
function finishAtBoundary(task, externalAlreadyCommitted) {
  if (terminal.has(task.status)) return 'terminal-unchanged';
  if (externalAlreadyCommitted) {
    task.receipt = 'artifact-1';
    task.status = 'completed';
  } else if (task.cancelRequested) task.status = 'cancelled';
  return task.status;
}
const safe = createTask();
console.log(JSON.stringify(requestCancel(safe)), safe.status);
// => {} working
console.log(finishAtBoundary(safe, false));
// => cancelled
console.log(finishAtBoundary(safe, true), safe.receipt);
// => terminal-unchanged null
const committed = createTask();
requestCancel(committed);
console.log(finishAtBoundary(committed, true), committed.receipt);
// => completed artifact-1
requestCancel(committed);
console.log(committed.status);
// => completed
```

第一条路径在安全点停住；第二条路径外部已提交，所以保留完成事实。终态后再次取消不篡改历史。例子中的 externalAlreadyCommitted 来自场景设定，真实系统必须靠回执或对账取得，不能由模型猜测。

如果外部结果仍未知，就不能调用此处的“安全停止”分支并声称已取消。应先禁止新步骤，再查询在途操作，必要时人工处理。计时器回零、连接关闭或按钮变灰都不是外部动作已撤销的证据。

### 六、幂等记录要覆盖刷新、重送和已经结束的任务

**幂等键（Idempotency Key）**识别同一次逻辑创建或动作。它不是 JSON-RPC 请求 id，也不是 taskId：前者识别一次往返，后者是在创建后引用结果对象。业务幂等键需要稳定跨越网络重试，而用户明确要求重新做一次时应使用新键。

保存为 `task-registry.mjs`，执行 `node task-registry.mjs`。序列化到字符串模拟持久快照与刷新读取，不访问磁盘；主体固定在教学输入中，没有认证服务。任务 ID 用计数方便观察，生产不得照搬为可枚举的访问凭证。

```js example=agent06-task-registry
function openRegistry(snapshot) {
  const db = snapshot ? JSON.parse(snapshot) : { next: 1, tasks: [], keys: [] };
  return {
    create(owner, key, input) {
      const old = db.keys.find(item => item.owner === owner && item.key === key);
      if (old) {
        if (old.input !== input) throw new Error('key-conflict');
        return db.tasks.find(task => task.id === old.id);
      }
      const task = { id: `task-${db.next++}`, owner, status: 'working', version: 1 };
      db.tasks.push(task);
      db.keys.push({ owner, key, input, id: task.id });
      return task;
    },
    get(owner, id) {
      const task = db.tasks.find(item => item.id === id && item.owner === owner);
      if (!task) throw new Error('not-accessible');
      return { ...task };
    },
    transition(owner, id, expectedVersion, next) {
      const task = db.tasks.find(item => item.id === id && item.owner === owner);
      if (!task) throw new Error('not-accessible');
      const edges = { working: ['input_required', 'completed', 'failed', 'cancelled'],
        input_required: ['working', 'failed', 'cancelled'] };
      if (task.version !== expectedVersion) throw new Error('version-conflict');
      if (!(edges[task.status] ?? []).includes(next)) throw new Error('closed-transition');
      task.status = next; task.version++;
    },
    snapshot() { return JSON.stringify(db); },
  };
}
let registry = openRegistry();
const created = registry.create('alice', 'export-1', 'lesson-set-v3');
const id = created.id;
registry.transition('alice', id, 1, 'input_required');
registry = openRegistry(registry.snapshot());
console.log(registry.get('alice', id).status);
// => input_required
registry.transition('alice', id, 2, 'cancelled'); // 模拟工作者已确认安全停止。
console.log(registry.create('alice', 'export-1', 'lesson-set-v3').id === id);
// => true
console.log(registry.get('alice', id).status);
// => cancelled
for (const attempt of [
  () => registry.create('alice', 'export-1', 'changed-input'),
  () => registry.transition('alice', id, 3, 'working'),
  () => registry.get('bob', id),
]) {
  try { attempt(); } catch (error) { console.log(error.message); }
}
// => key-conflict
// => closed-transition
// => not-accessible
```

刷新后仍找到 input_required 的原对象；任务取消后同一键也返回原任务，不因只查询“活跃任务”而创建第二个。改变输入却沿用旧键会冲突，取消后的迟到更新也被拒绝。返回给调用者的任务数据实际应是受限快照，避免暴露内部可变对象。

生产中“查键、建立任务、登记键”必须原子完成，并包含真实租户与动作范围。只写 Map 或先查询后插入，不能阻止两个进程并发创建。去重记录的保留期应覆盖允许的重试窗口；过早删除会使积压消息重新创建任务。业务操作本身还需独立幂等与回执，创建不重复不代表每个步骤都不会重复。

### 七、持久工作者恢复时先对账，再决定推进

队列可能再次交付同一消息。工作者读取任务版本，取得有期限的处理权，并在提交时使用条件更新，避免旧工作者在租约过期后继续覆盖新状态。租约过期不证明外部动作未发生，接管者仍需检查在途意图和回执。

最危险的窗口是“外部成功，本地还没存回执”。恢复时按操作标识查询，已成功就补存事实，无法确认则保持待对账；不要仅凭本地 pending 再做一次。完整推演复用 [检查点恢复实验](../chinese-guides/agent-01-loop-planning-stopping-recovery.md#六检查点要能回答崩溃前正在做什么)，不另造一套与任务状态矛盾的恢复规则。

数据库写入与向队列发布下一步若无法同一事务，可用 outbox：先在数据库事务中写任务变化与待发事件，再由发送者可靠投递并去重。它减少“状态已更新但后续永远没收到”的空洞，仍不取消消费者对重复消息的处理。

代码升级时保留工作流版本与预算余额。不能让一次重启重新获得完整额度，也不能给旧审批结构填一个默认允许值。成功兄弟步骤可以复用，失败部分按资格重试；整个任务图的依赖、取消与合并由 [多 Agent 的协调边界](../chinese-guides/agent-07-multi-agent-coordination-context-isolation.md#六计划变化与取消要阻止迟到结果覆盖) 进一步说明。

### 八、轮询、通知和清理都服务于同一份事实

Client 尊重任务的 `pollIntervalMs`，同时设置总等待期限和错误退避；这个值可以随任务变化。轮询没有进展时不应高频空转，页面离开可停止观察，回来按句柄重新查询。终态后停止轮询并释放定时器、流和监听器。

如果双方支持任务通知，可通过 `subscriptions/listen` 订阅 `notifications/tasks`，获取包含完整任务状态的通知。推送减少延迟，但连接会丢失；恢复以任务快照为依据，不把通知缺失当作任务消失。外部 webhook 则是另一种业务输入，需要验证来源、签名和事件去重，不直接当作 MCP 的可靠完成证明。

清理要同时看制品、任务摘要、细粒度事件和幂等记录的不同留存需求。共享制品不能因一个任务过期而误删；备份恢复后重放取消、删除和失效标记，避免旧任务重新排队。在线阻断与物理清理的区别可以参照 [记忆删除实验](../chinese-guides/aiapp-13-long-term-memory-personalization-forgetting.md#六本次忽略关闭与删除改变不同状态)。

交付给用户的时间线应能回答：处理了哪些输入、最后确认到哪一步、取消是否落实、哪些结果可下载、哪些还未知。HTTP 请求成功只证明一次通信有响应；只有任务事实与结果合同同时满足，才可以显示业务完成。

### 自检问题

1. taskId、JSON-RPC id 与幂等键为什么不能合并成一个字段？
2. tasks/cancel 返回空结果后，为什么还需要观察终态？
3. completed 中的工具结果带 isError 时，界面应如何解释？
4. 终态任务的幂等记录提前删除，会怎样影响迟到重送？

### 参考与延伸阅读

- [MCP：Tasks 概览](https://modelcontextprotocol.io/extensions/tasks/overview)：查扩展声明、服务端选择异步执行、查询与输入更新。
- [Tasks 扩展官方文档](https://tasks.extensions.modelcontextprotocol.io/)：查任务状态、取消、TTL、句柄安全与不提供任务枚举的边界。
- [Tasks 2026-07-28 Stable Schema](https://github.com/modelcontextprotocol/ext-tasks/blob/main/schema/2026-07-28/schema.ts)：查 CreateTaskResult、DetailedTask 及 get/update/cancel 类型，区别于 draft。

核对日期：2026-10-05。实验中的版本、状态迁移函数和幂等存储是业务模型；未验证真实持久层、队列竞争或 SDK 跨版本互操作。
