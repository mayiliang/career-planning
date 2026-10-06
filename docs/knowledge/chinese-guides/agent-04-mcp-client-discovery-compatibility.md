# MCP Client 发现、能力协商与兼容知识点讲义

## AGENT-04 MCP Client 发现、能力选择、缓存与兼容

客户端昨天连接过资料服务，缓存里有“搜索”和“读取附件”。今天管理员移除了附件访问，界面却仍显示绿色“已连接”，点击后只给出一个无法理解的错误。另一位用户登录后，还看到了前一个账号的私有资料目录。

连接正常、接口存在、用户有权使用，是三个不同条件。本篇从发现快照走到目录、缓存、调用与降级，解释 Client 为什么要持续检查这些条件。读完应能设计不会跨账号复用的缓存，停止失控分页，并在新旧协议之间选择明确路径。本篇以 2026-07-28 规范为主，核对日期为 2026-10-05。

### 学习前先确认

- 直接前置：[AGENT-03 MCP 传输、无状态核心与显式状态](../chinese-guides/agent-03-mcp-transport-stateless-state-versioning.md#agent-03)，理解逐请求元数据、响应格式、显式对象及版本边界。

### 一、发现回答支持什么，列表回答具体有什么

这一套处理适用于客户端连接多个独立部署、升级节奏不同的服务：先读能力声明，再选择当前能完成的操作。如果服务地址和功能都固定，也仍要检查实际返回与权限变化，但不必为了演示发现机制额外搭建注册中心。

**服务发现（Service Discovery）**让 Client 查询目标 Server 支持的版本和能力等元数据。2026-07-28 要求 Server 实现 `server/discover`；Client 可以先调用，也可以直接请求某个方法并处理版本错误。它不是强制的初始化握手。

一次发现响应可能声明 `tools: {}` 和 `resources: {}`，说明可以使用这两类功能；有哪些工具、每个工具接受什么参数，仍需取得 `tools/list`；资源条目由 `resources/list` 等接口提供。不要把发现接口的成功等同于完整目录已加载。

下面是一份本站构造的响应样本，保存为 `discover-response.json` 可用于人工核对字段，不是请求客户端，也不需要执行。短 TTL 仅为了后文实验，服务名称也不代表真实身份。

```json example=agent04-discover-response runtime=project file=discover-response.json
{
  "jsonrpc": "2.0",
  "id": "atlas-discovery-1",
  "result": {
    "resultType": "complete",
    "supportedVersions": ["2026-07-28"],
    "capabilities": { "tools": {}, "resources": {} },
    "_meta": {
      "io.modelcontextprotocol/serverInfo": {
        "name": "lesson-library", "version": "2.0"
      }
    },
    "ttlMs": 30000,
    "cacheScope": "private"
  }
}
```

先看 `supportedVersions` 是否有共同版本，再看能力能否满足任务，最后读取所需目录。`resultType` 区分结果形态；`ttlMs` 和 `cacheScope` 给出缓存提示。只读取 `serverInfo.name` 后显示“可用”，遗漏了真正决定能否调用的条件。

### 二、服务名称和工具描述都不能证明身份

Server 自报的名称、版本和 instructions 可以用于展示、日志或帮助理解，但不是协议验证过的安全身份。一个恶意服务也能把自己命名为“官方资料库”。Client 应从可信安装记录、管理员配置或用户明确选择的端点建立连接，再按传输和认证机制验证访问对象。

模型从网页里读到的新 URL 只是候选，不能自动携带用户凭据连接。重定向后目标可能改变，浏览器、桌面宿主与后端代理也具有不同网络能力；客户端需要限制可访问地址和凭据受众，避免外部描述把它引向内网。CORS 只影响浏览器是否允许读取响应，不代替业务授权。

工具的 `description` 和注解同样来自服务。标成只读可以帮助展示，却不能取消执行器对真实操作的风险检查。内部工具标识应包含受信连接身份与工具名，两个 Server 的同名 `search` 不能合并成一项，更不能在已批准动作执行失败后自动切换到另一个同名服务。

输出也要保留来源。资源内容、提示模板和工具返回的文字都是有出处的数据，不因经过 Client 而升格为宿主政策。具体输入污染路径复用 [提示注入的来源边界](../chinese-guides/aiapp-07-prompt-injection-untrusted-content.md#二可信来源也不能自动取得指令权)。

### 三、能力选择是多方条件的交集

**能力协商（Capability Negotiation）**在这里指 Client 根据协议、Server 声明、自身实现和宿主政策选择可用功能。新版采用逐请求元数据与扩展声明，不应把“协商”理解成必须存在一个连接级握手。

资料搜索需要工具能力；展示资源目录还需要资源能力；后台长任务则需要双方显式支持 Tasks 扩展。客户端能够解析普通工具结果，不代表能够保存 taskId 或处理 input_required。未知扩展不能凭名称相似就启用，缺少关键能力时应明确拒绝或进入可保持语义的降级路径。

| 缺少的条件 | 可以考虑的降级 | 不能假装做到什么 |
| --- | --- | --- |
| 资源目录不可用，但搜索工具可用 | 仅提供搜索入口 | 声称已经浏览完整附件目录 |
| 不支持某个可选扩展 | 回到双方支持的核心结果 | 让用户看不见的后台任务悄悄启动 |
| 宿主没有可信审批界面 | 只读预览、导出待处理提议 | 默认批准高影响动作 |
| 用户权限被撤回 | 停止调用，提示范围变化 | 用另一个账号或 Server 绕过 |

HTTP 同时支持 JSON 与 SSE 是该传输的要求，不属于“为了降级可以不实现”的可选能力。工具列表的 inputSchema、outputSchema 和必要头部标注，也需要按所选版本验证。格式正确仍不代表用户已经授权某次调用。

### 四、缓存的新鲜度和共享范围要分开判断

**缓存作用域（Cache Scope）**限定结果可以在哪个授权上下文中复用。规范的 `cacheScope` 有 `public` 与 `private`：前者表示结果不含用户特定数据，可以共享；后者不能跨授权上下文共享。实际缓存键还应包含受信服务连接、协议、方法和影响结果的参数，分页 cursor 也在其中。

TTL 表示最多可以把结果视为新鲜多久，不是服务承诺在这段时间绝不变化，也不是要求每隔这段时间自动轮询。收到相关变更通知、权限撤回或明确的目录错误时，应提前失效。带 `inputResponses` 或 `requestState` 的多轮重试结果不得按普通结果缓存；它们依赖额外的交互状态。

保存为 `discovery-cache.mjs`，用 Node.js 22 执行。用整数毫秒模拟时间，不实际等待 31 秒。`authContext` 是宿主生成的不含凭据的作用域标识，不能由模型任意指定；示例只缓存 private 发现结果。

```js example=agent04-discovery-cache
const cache = new Map();
const context = { endpoint: 'https://library.example/mcp', authContext: 'user-a/token-epoch-1' };
let fetches = 0;
function key(ctx) {
  return JSON.stringify([ctx.endpoint, ctx.authContext, '2026-07-28', 'server/discover']);
}
function discover(ctx, now) {
  const previous = cache.get(key(ctx));
  if (previous && now < previous.receivedAt + previous.result.ttlMs) return previous.result;
  fetches++;
  const result = { resultType: 'complete', supportedVersions: ['2026-07-28'],
    capabilities: now < 30000 ? { tools: {}, resources: {} } : { tools: {} },
    ttlMs: 30000, cacheScope: 'private' };
  cache.set(key(ctx), { receivedAt: now, result });
  return result;
}
function route(snapshot) {
  return Object.hasOwn(snapshot.capabilities, 'resources') ? 'browse-resources' : 'search-only';
}
console.log(route(discover(context, 0)), fetches);
// => browse-resources 1
console.log(route(discover(context, 29000)), fetches);
// => browse-resources 1
console.log(route(discover(context, 31000)), fetches);
// => search-only 2
console.log(route(discover({ ...context, authContext: 'user-b/token-epoch-1' }, 31000)), fetches);
// => search-only 3
cache.delete(key(context)); // 模拟安全撤回通知；不等 TTL 到期。
console.log(cache.has(key(context)));
// => false
```

第 29 秒复用快照，第 31 秒访问时重新发现，并从资源浏览降为搜索。换账号会产生独立查询，说明没有仅以 URL 作为键。这里移除的是 resources 能力，不是虚构一个标准 `pagination` 布尔能力；是否还有更多页，应根据相应列表响应判断。

生产实现还要处理失败、并发请求合并和缓存容量。离线时可以标注并展示旧目录供阅读，但旧快照不应成为执行高影响操作的授权依据。为了效率共享公开目录时，也必须确认它确实与用户无关；服务器误把私有结果标成 public 仍可能造成泄露，所以网关与宿主可以采用更保守的缓存政策。

### 五、分页必须能结束，也必须能取消

列表响应中的 `nextCursor` 表示还有后续页。游标是不透明值，客户端不推测页码，也不通过字符串加一构造下一页。每次继续使用同一连接身份、筛选条件和协议语义；分页过程中身份改变，应丢弃旧读取过程并重新开始。

保存为 `bounded-pages.mjs`，执行 `node bounded-pages.mjs`。输入是两页模拟资源，每页已作为完整对象返回；示例不实现 HTTP，也不把数组下标当真实游标。`beforeNext` 只用于制造确定的取消时刻。

```js example=agent04-bounded-pages
async function collect(readPage, signal, beforeNext = () => {}) {
  const items = [], cursors = new Set();
  let cursor;
  try {
    for (let page = 0; page < 5; page++) {
      signal.throwIfAborted();
      const result = await readPage(cursor);
      signal.throwIfAborted();
      items.push(...result.resources);
      if (result.nextCursor === undefined) return { status: 'complete', items };
      if (cursors.has(result.nextCursor)) return { status: 'cursor-loop', items };
      cursors.add(result.nextCursor);
      cursor = result.nextCursor;
      beforeNext();
    }
    return { status: 'page-limit', items };
  } catch (error) {
    if (signal.aborted) return { status: 'cancelled', items };
    throw error;
  }
}
const pages = new Map([
  [undefined, { resources: ['lesson-a'], nextCursor: 'page-b' }],
  ['page-b', { resources: ['lesson-b'] }],
]);
const normal = await collect(async cursor => pages.get(cursor), new AbortController().signal);
console.log(normal.status, normal.items.join(','));
// => complete lesson-a,lesson-b
const controller = new AbortController();
const requested = [];
const cancelled = await collect(async cursor => {
  requested.push(cursor ?? 'first');
  return pages.get(cursor);
}, controller.signal, () => controller.abort());
console.log(cancelled.status, requested.join(','));
// => cancelled first
const repeated = await collect(async () => ({ resources: [], nextCursor: 'same' }), new AbortController().signal);
console.log(repeated.status);
// => cursor-loop
```

正常读取包含两页；第一次取页后取消，不再请求 page-b；重复游标触发停止。实际 readPage 还应接收 AbortSignal 以中止正在等待的网络操作，本例只证明前后检查与下一页阻止。网络失败不应被吞成空目录，部分结果也不能标为完整。

跨页期间服务内容可能变化。相同资源可以按稳定 URI 与版本识别，但去重不等于获得一致性快照。需要完整快照的产品，应依赖服务明确提供的快照或版本合同；不能由客户端自行宣称所有页来自同一时刻。还要限制页数、单页大小和总条目数，防止恶意游标或超大目录消耗资源。

### 六、兼容层要解释能力缺口，不能伪造保证

**兼容适配器（Compatibility Adapter）**把指定旧协议的请求、结果与错误转换成宿主内部接口。它集中处理版本差异，让 UI 不必处处判断日期，但不能创造旧服务本来没有的能力。

| Client / Server | 新版服务 | 旧版服务 |
| --- | --- | --- |
| 仅实现新版 | 按逐请求元数据调用 | 给出不兼容说明 |
| 支持新旧两套语义 | 保持新版路径 | 按规定探测后走 initialize 等旧流程 |
| 仅实现旧版 | 除非服务另支持旧版，否则失败 | 按旧版合同工作 |

在 stdio 上，双栈客户端可以先用 server/discover 探测；HTTP 则必须读取相应错误正文来区分。识别到现代版本错误就协商支持的版本，识别到头部错误就修正头部；不要把任何 400、401、超时都当作降级指令。具体探测条件以对应传输规范为准，不能写一个全局 catch 后无条件 initialize。

旧适配器可以翻译字段、映射错误，但不能用一个进程内 session 伪装持久任务恢复。未知可选扩展不启用；缺少任务必需的语义应阻止执行。记录所选版本、适配器、缺口和降级原因，才能解释“为什么同一功能在这个服务上不可用”。

迁移还要安排退出：统计旧端比例、锁定受支持版本、确认在途任务如何结束，再停止旧路径。升级 SDK 不等于所有 Host 都支持新能力，协议发布说明也不是某个桌面产品的能力清单。

### 七、调用前再检查一次，错误之后只恢复该恢复的部分

用户打开目录到点击工具之间，Schema、资源或权限都可能变化。调用前按当前连接和目录版本校验参数，身份与审批信息由可信层加入。发现新增工具并不意味着它自动继承以前的写入授权。

错误处理按原因分开：网络失败检查连接；版本错误选择交集；参数与目录不一致重新发现；授权失败停止或重新认证；业务失败交由任务流程判断。写入响应丢失时查询原操作，不能因为重新发现成功就再次执行。未知结果恢复见 [检查点与对账](../chinese-guides/agent-01-loop-planning-stopping-recovery.md#六检查点要能回答崩溃前正在做什么)。

界面可分别显示已配置、已认证、目录新鲜度与可用能力，并保留上次检查时间。卸载服务时清理它的缓存、凭据引用、订阅和子进程；取消目录读取后不让迟到结果覆盖新账号的页面。诊断记录连接 ID、快照版本、缓存作用域和失败类别即可，避免把 token 和完整私有目录写进普通日志。

学习者验证自己的客户端时，应能拿出“第 31 秒使用了新快照”和“第二页从未被请求”这类事实，而不只是一个绿色连接状态。真实跨版本互测仍需要实际客户端与服务实现；本篇内存实验只验证选择规则。

### 自检问题

1. server/discover 声明 tools 后，为什么还要读取 tools/list？
2. 两个账号访问同一 URL 时，private 缓存为何不能直接共用？
3. 列表存在重复游标与条目重复，分别意味着什么？
4. HTTP 400 的正文是 HeaderMismatch，为什么不应立即进入旧版适配器？

### 参考与延伸阅读

- [MCP：Discovery](https://modelcontextprotocol.io/specification/2026-07-28/server/discover)：查发现结果、自报身份及调用时机。
- [MCP：Caching](https://modelcontextprotocol.io/specification/2026-07-28/server/utilities/caching)：查 TTL、public/private、缓存键与多轮请求的排除规则。
- [MCP：版本与兼容](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning)：查新旧端组合和传输相关探测，不靠日期字符串猜兼容性。
- [MCP：Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)：查必须实现的响应与头部规则，区分核心要求与可选扩展。
