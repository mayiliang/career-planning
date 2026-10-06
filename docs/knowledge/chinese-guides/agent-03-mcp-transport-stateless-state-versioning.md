# MCP 传输、无状态核心与显式状态知识点讲义

## AGENT-03 MCP 传输、无状态核心、显式句柄与版本迁移

资料助手第一次请求落到实例 A，创建了一份草稿；第二次请求落到实例 B，却收到“找不到草稿”。为了让演示继续，开发者开启了粘性路由，把同一用户总是送回 A。问题暂时消失，A 一重启又全部失效。

这个场景有三层不同的连续性：HTTP 连接是否还在、双方按哪个 MCP 版本解释报文、草稿是否仍然存在。本篇先拆开这三层，再用两个本地 HTTP 实例观察响应格式、头部校验和显式句柄。读完应能解释为什么协议无状态仍需要业务存储，以及为什么收到半段流后不能直接重放写操作。

### 学习前先确认

- 直接前置：[MCP-01 MCP 核心概念、工具与信任边界](../chinese-guides/mcp-01-server-tools-resources-prompts-schema.md#mcp-01)，理解 Host、Client、Server 与工具调用的分工。

### 一、先确定消息走哪条路，再确定按哪版解释

**流式 HTTP（Streamable HTTP）**是 MCP 的 HTTP 传输绑定：Client 向 MCP 端点发送 POST，Server 可以返回一个 JSON 对象，也可以返回属于这次请求的 SSE 流。名字里有“流式”，不表示每次响应都必须是流。

本篇核对于 2026-10-05，以 **2026-07-28** 为主线；2025-11-25 只用于解释迁移。两版都叫 Streamable HTTP，却不能混用生命周期：新版核心没有 `initialize` 握手、`Mcp-Session-Id` 会话及独立 GET 事件流；旧版可能依赖这些机制。只替换一个版本日期，会让双方对后续消息产生不同理解。

本地 stdio 则由宿主启动子进程，通过标准输入输出传递按换行分隔的 JSON-RPC 消息。stdout 只放协议消息，诊断放 stderr；把“服务启动成功”打印到 stdout，可能被 Client 当成非法 JSON。宿主还要管理子进程退出、超时和资源回收。运行在本机不代表程序可信，启动来源、文件和网络权限仍需控制。

HTTP 适合独立部署与多实例，stdio 适合宿主管理的本地进程。传输不同，业务含义可以相同；身份凭据、进程管理和连接关闭方式却不能照搬。更多角色与原语解释沿用 [MCP 核心模型](../chinese-guides/mcp-01-server-tools-resources-prompts-schema.md#一先把助手连接器和能力提供方分开)。

### 二、无状态核心移除了隐藏会话，没有删除业务事实

**无状态协议（Stateless Protocol）**表示核心请求不依赖先前握手留下的隐式协议会话。新版请求在 `params._meta` 携带协议版本、Client 信息和能力，Server 独立判断能否处理。Client 自报的软件名用于说明实现，不是认证身份。

草稿、审批、幂等记录和长任务仍然是业务事实。A 创建草稿之后，B 要查询它，就必须访问共同的数据来源，或者验证请求携带的完整状态。共享存储解决业务连续性；协议无状态只是让通信不必依赖某条原连接，两者不矛盾。

**显式句柄（Explicit Handle）**是后续请求明确携带的对象引用。比如草稿服务返回 `draftHandle`，Client 再用它读取；字段名是这个工具自行定义的合同，不是 MCP 核心统一规定所有工具都要返回的字段。句柄应难以猜测、有限期，并绑定对象与访问范围，但它本身不应取代每次访问时的授权。

可以把自包含状态封装进受保护的令牌，也可以把状态保存在服务端，让句柄引用它。前者需要防篡改、保密和过期设计，仍不自动解决撤销与重复执行；后者需要持久性与一致性。不要仅因为 UUID 难猜，就允许拿到它的人读取别人的内容。

### 三、HTTP 头部与正文必须描述同一件事

2026-07-28 的请求既带正文元数据，也按 HTTP 绑定镜像必要字段。`MCP-Protocol-Version` 对应正文版本，`Mcp-Method` 对应 JSON-RPC 方法；`tools/call`、`prompts/get` 的 `Mcp-Name` 对应 `params.name`，`resources/read` 则对应 `params.uri`。它不是 Server 的显示名称。

这样网关可以只看头部做路由，但真正处理正文的服务必须核对两者一致。否则网关看见“只读搜索”，正文却要求“删除资料”，策略与实际动作就分叉了。规范对缺失或不匹配的必要镜像头定义 HTTP 400 与 `HeaderMismatch`（代码 -32020）；不支持的协议版本另有错误，不能全部当作旧服务器。

Client 的 `Accept` 必须同时包含 `application/json` 与 `text/event-stream`，并根据实际响应的 Content-Type 选择解析路径。只请求 JSON 却碰巧总收到 JSON，不证明客户端实现合规。媒体类型约束与工具是否成功是两层判断。

工具 Schema 还可能用 `x-mcp-header` 指定参数镜像。有效标注出现时，HTTP Client 需要按规定路径取值并编码；非法标注不能简单忽略后继续暴露该工具。非 ASCII、控制字符或有歧义的头值需要规范的编码形式。下方实验只使用安全 ASCII 名称，没有自定义镜像参数，因此没有实现这部分完整规则；实际客户端应交给经过版本核对的协议实现处理。

### 四、运行两个实例，观察同一草稿跨请求存在

保存为 `mcp-http-lab.mjs`，用 Node.js 22 执行 `node mcp-http-lab.mjs`。只使用 Node 内置模块，监听两个随机的本机端口，结束时关闭。输入是固定模拟草稿；实例共享一个 Map 来代替业务库。这是 HTTP 绑定的教学子集，不是完整 MCP Server，也没有真实认证、数据库、SDK 或生产网络性能测量。

```js example=agent03-http-lab runtime=project file=mcp-http-lab.mjs
import { createServer } from 'node:http';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';

const version = '2026-07-28';
const meta = {
  'io.modelcontextprotocol/protocolVersion': version,
  'io.modelcontextprotocol/clientInfo': { name: 'atlas-lab', version: '1.0' },
  'io.modelcontextprotocol/clientCapabilities': {},
};
const database = { drafts: new Map(), operations: new Map(), writes: 0 };
const servers = [];
async function start(encoding) {
  const server = createServer(async (req, res) => {
    const send = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    try {
      if (req.method !== 'POST' || req.url !== '/mcp') return send(405, { error: 'POST only' });
      const parts = [];
      let size = 0;
      for await (const part of req) {
        size += part.length;
        if (size > 16384) return send(413, { error: 'too large' });
        parts.push(part);
      }
      const body = JSON.parse(Buffer.concat(parts).toString('utf8'));
      const error = (status, code, message) => send(status, {
        jsonrpc: '2.0', id: body.id ?? null, error: { code, message },
      });
      // 简化媒体类型解析：本实验不处理 q 值等完整 Accept 语法。
      const accept = String(req.headers.accept ?? '').split(',').map(item => item.trim());
      if (!['application/json', 'text/event-stream'].every(type => accept.includes(type))) {
        return error(406, -32600, 'lab requires both media types');
      }
      const params = body.params ?? {};
      if (req.headers['mcp-protocol-version'] !== params._meta?.['io.modelcontextprotocol/protocolVersion']
          || req.headers['mcp-method'] !== body.method || req.headers['mcp-name'] !== params.name) {
        return error(400, -32020, 'HeaderMismatch');
      }
      if (body.method !== 'tools/call') return error(404, -32601, 'Method not found');
      if (params._meta?.['io.modelcontextprotocol/protocolVersion'] !== version) {
        return send(400, { jsonrpc: '2.0', id: body.id,
          error: { code: -32022, message: 'Unsupported protocol version',
            data: { requested: params._meta?.['io.modelcontextprotocol/protocolVersion'], supported: [version] } } });
      }
      const args = params.arguments ?? {};
      let value;
      if (params.name === 'save_draft') {
        if (typeof args.actionId !== 'string' || typeof args.text !== 'string') {
          return error(400, -32602, 'Invalid params');
        }
        const previous = database.operations.get(args.actionId);
        if (previous && previous.text !== args.text) return error(409, -32602, 'action conflict');
        if (previous) value = { handle: previous.handle };
        else {
          const handle = randomUUID();
          database.drafts.set(handle, args.text);
          database.operations.set(args.actionId, { handle, text: args.text });
          database.writes++;
          value = { handle };
        }
      } else if (params.name === 'get_draft') {
        if (!database.drafts.has(args.handle)) return error(404, -32602, 'unknown draft');
        value = { text: database.drafts.get(args.handle) };
      } else return error(400, -32602, 'unknown tool');
      const response = { jsonrpc: '2.0', id: body.id, result: {
        resultType: 'complete', content: [{ type: 'text', text: JSON.stringify(value) }],
        structuredContent: value,
      } };
      if (encoding === 'sse') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream' });
        res.end(`event: message\ndata: ${JSON.stringify(response)}\n\n`);
      } else send(200, response);
    } catch {
      if (!res.headersSent) send(400, { jsonrpc: '2.0', id: null,
        error: { code: -32700, message: 'Parse error' } });
      else res.destroy();
    }
  });
  servers.push(server);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return `http://127.0.0.1:${server.address().port}/mcp`;
}
let requestId = 0;
async function call(url, name, args, extraHeaders = {}) {
  const body = { jsonrpc: '2.0', id: ++requestId, method: 'tools/call',
    params: { name, arguments: args, _meta: meta } };
  const response = await fetch(url, { method: 'POST', signal: AbortSignal.timeout(3000),
    headers: { 'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream', 'MCP-Protocol-Version': version,
      'Mcp-Method': body.method, 'Mcp-Name': name, ...extraHeaders },
    body: JSON.stringify(body) });
  const type = response.headers.get('content-type').split(';')[0];
  const text = await response.text();
  // 这里只解析实验发出的单个完整 SSE 帧，不是通用流式解码器。
  const payload = type === 'text/event-stream'
    ? text.split('\n').find(line => line.startsWith('data: ')).slice(6) : text;
  return { status: response.status, type, body: JSON.parse(payload) };
}
try {
  const a = await start('json');
  const b = await start('sse');
  const saved = await call(a, 'save_draft', { actionId: 'draft-op-1', text: '待审阅草稿' });
  const handle = saved.body.result.structuredContent.handle;
  const loaded = await call(b, 'get_draft', { handle });
  console.log(saved.type, loaded.type, loaded.body.result.structuredContent.text);
  // => application/json text/event-stream 待审阅草稿
  const repeated = await call(b, 'save_draft', { actionId: 'draft-op-1', text: '待审阅草稿' });
  console.log(repeated.body.result.structuredContent.handle === handle, database.writes);
  // => true 1
  console.log((await call(a, 'get_draft', { handle }, { Accept: 'application/json' })).status);
  // => 406
  const mismatch = await call(a, 'get_draft', { handle }, { 'Mcp-Name': 'save_draft' });
  console.log(mismatch.status, mismatch.body.error.code);
  // => 400 -32020
} finally {
  await Promise.all(servers.map(server => new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeAllConnections();
  })));
}
```

A 以 JSON 返回句柄，B 以 SSE 返回同一份正文；重新提交同一 actionId 仍只有一次写入。把 Map 改为每个实例私有，第二次读取就会失败，这正是开头隐藏状态的问题。这个共享 Map 在进程退出时全部消失，所以跨两个 HTTP 实例成功不等于已验证崩溃恢复。

406 是实验服务对缺失双 Accept 的拒绝选择，不是说规范为所有这类违规都强制同一个错误码。镜像头不一致的 400/-32020 则对应规范规则。`actionId`、工具名、草稿句柄以及业务错误状态是实验合同，MCP 不会替任何写工具自动建立去重表。

### 五、连接断开后，要恢复对象而不是复活旧流

新版 HTTP SSE 是请求范围的流，不支持通过 `Last-Event-ID` 续传。不要把普通 SSE 的可选重连机制写成这一版 MCP 的保证。较早版本的会话与恢复机制，应留在对应版本的适配器中。

断流时先判断请求性质。只读查询可以在策略允许时重新取得快照；写操作可能已经生效，应查询已知业务句柄或按业务操作标识对账。仅重新发送相同 JSON-RPC `id`，不能保证不会再写一次，原因见 [工具调用的三个标识](../chinese-guides/aiapp-04-tool-calling-execution-result-ui.md#四三个-id-分别回答三个问题)。

关闭新版 HTTP 响应流是该请求的取消信号；stdio 使用 `notifications/cancelled`。收到取消后停止发送消息、尽快停止工作，与已经发生的外部副作用是否可撤回仍是不同问题。长任务有独立句柄时，停止一次查询也不等于取消任务，详见 [Tasks 的取消边界](../chinese-guides/agent-06-tasks-long-running-recovery-idempotency.md#五取消请求被收到不等于任务已经取消)。

代理缓冲会延迟可见输出，流量限额和慢消费者也会影响资源占用。客户端应限制消息大小、缓冲与等待时间，离开时关闭流；通知丢失后按能力重新查询。业务自定义的序号、版本与水位有助于恢复，但不是所有 MCP SSE 帧统一具有的字段。

### 六、中途需要输入，可以结束本轮响应再继续

**多轮请求（Multi-Round-Trip Request）**让 Server 在尚缺输入时返回 `InputRequiredResult`，Client 收集回应后重试原方法，并携带对应 `inputResponses` 与不透明的 `requestState`。它避免为了等用户思考而一直占用双向连接。

这里的“重试”是协议继续流程，不等于盲重做已提交的业务动作。Server 要能判断输入属于哪个提议，防止过期或重复回应再次触发副作用。`requestState` 由 Server 解释，Client 不解析、不修改，也不能把它当成用户已批准的证据。具体请求映射与审批判断由 [人工介入讲义](../chinese-guides/agent-05-human-in-the-loop-risk-approval.md#二补充输入与授予权限走不同判断) 解释。

协议元数据应由可信 Client 构造，凭据来自受控认证流程。工具描述、模型文本和不透明状态都不能自行添加管理员权限。HTTP 服务需要校验 Origin；无效 Origin 的拒绝、认证、目标地址限制以及 Host 校验应在服务边界实现，本地仅绑定环回地址有助于缩小暴露面。

### 七、迁移要保留可解释的版本分支

新版客户端对新版服务发送逐请求元数据；旧客户端仍可能首先调用 initialize。双栈服务可以支持两者，但必须明确按哪一版处理，不能先接受新头部再按旧会话语义执行正文。

新版请求得到现代协议的版本错误时，读取支持列表并选择交集；头部错误则修正请求。只有符合传输绑定的旧版探测条件时，双栈客户端才进入旧适配器，不能遇到 400 就降级，更不能把认证失败当成版本问题。发现和兼容矩阵见 [Client 的版本选择](../chinese-guides/agent-04-mcp-client-discovery-compatibility.md#六兼容层要解释能力缺口不能伪造保证)。

发布迁移时记录实际协议分布、适配器使用和在途句柄版本。先让接收端理解新格式，再启用发送端；退出旧适配器之前，确认没有仍依赖它的用户与未结束任务。验收至少能回答三件事：报文是否按所选版本解释、请求换实例后业务状态是否仍可访问、响应丢失后是否重复产生动作。一次连接成功只能回答其中很小的一部分。

### 自检问题

1. `Mcp-Name` 为什么不能填服务显示名？网关与正文不一致会造成什么后果？
2. 两个实例共享 Map 的实验通过后，还缺少什么才能证明重启恢复？
3. 新版 SSE 断流后，为什么不能直接套用 Last-Event-ID？
4. JSON-RPC id、业务幂等键和草稿句柄各自用于什么？

### 参考与延伸阅读

- [MCP 2026-07-28：Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)：查双 Accept、镜像头、取消及新旧流行为的精确要求。
- [MCP：传输概览](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports)：查 stdio、HTTP 与消息语义的边界。
- [MCP：版本与兼容](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning)：查现代、旧版与双栈端的探测与错误分支。
- [MCP：多轮请求](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr)：查输入请求、回应映射及 requestState 的处理规则。

核对日期：2026-10-05。规范要求、实验自定义字段和生产补充措施分别说明；本地实验不能证明完整协议兼容或生产隔离。
