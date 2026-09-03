# React 知识点讲义

## REACT-06 Reducer、Context 与跨组件状态

当一个组件拥有多种状态、许多事件和严格转移规则时，分散的 setter 会把业务逻辑藏在各个处理器中。Reducer 把“当前状态 + 事件 → 下一状态”集中为纯函数；Context 让一棵子树读取共同依赖。二者结合可以构建清晰状态域，但并不等于把所有数据全局化，也不能替代服务器缓存或授权。

### 学习前先确认

- 直接前置：[REACT-05 Hooks 规则与自定义 Hook](../chinese-guides/react-05-hooks-rules-custom-hooks.md#react-05)。它会继续链接 Effect、状态模型、Promise 和 React 渲染基础。

性能测量在 REACT-07，错误/异步恢复在 REACT-08。本讲聚焦客户端状态域和传播。

### 一、Reducer 集中状态转移

从旧状态和事件得到新状态的规则是**状态转移（state transition）**，描述发生了什么的对象是**动作（action）**。向组件子树提供 Context 值的边界称为**提供者（provider）**；它负责作用域和广播，但不会替 reducer 设计业务不变量。

```ts
type State =
  | { kind: 'editing'; draft: Draft }
  | { kind: 'submitting'; draft: Draft; requestId: string }
  | { kind: 'error'; draft: Draft; message: string };

type Action =
  | { type: 'fieldChanged'; field: keyof Draft; value: string }
  | { type: 'submitted'; requestId: string }
  | { type: 'failed'; requestId: string; message: string }
  | { type: 'retry' };
```

**归约器（reducer）**接收 state/action 并返回新 state。action 描述发生了什么，不是“把 loading 设为 true”这类实现命令。集中逻辑让所有转移可列举、测试和审查。

### 二、Reducer 必须纯粹

Reducer 不发送请求、不读当前时间、不生成随机 ID、不写 storage，也不修改旧 state。相同输入应得到相同输出：

```ts
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'submitted':
      if (state.kind !== 'editing' && state.kind !== 'error') return state;
      return { kind: 'submitting', draft: state.draft, requestId: action.requestId };
    // ...
  }
}
```

副作用由事件处理器或 Effect 执行，完成后 dispatch 结果 action。这样 reducer 能在 Strict Mode、重放、测试和 DevTools 中保持确定。

### 三、非法转移要有显式策略

当 `failed` 的 requestId 不属于当前 submitting，应该忽略为迟到结果；当 submitting 中再次 edit，是禁用、排队还是取消后修改？状态表应先决定。

```ts
case 'failed':
  if (state.kind !== 'submitting') return state;
  if (state.requestId !== action.requestId) return state;
  return { kind: 'error', draft: state.draft, message: action.message };
```

对程序不变量，可在开发环境抛出或记录；对预期竞态应安全忽略。不要让 default 静默吞掉新增 action，使用 `never` 穷尽检查。

### 四、Action 设计决定可读性

粗粒度 `changed` 带任意 payload 会把分支重新塞回 reducer；极细 `setX` 又失去业务语义。action 应对应用户意图、外部结果或领域事件，例如 `checkoutRequested`、`orderLoaded`、`sessionExpired`。

Action payload 应包含 reducer 做决定所需的稳定事实，不传 DOM event、Promise 或可变服务实例。ID、版本和归一化错误比整个响应对象更易重放。

### 五、useReducer 仍是局部组件 state

`useReducer` 不自动跨组件共享。它只是用 reducer 管理当前组件实例的一份 state。要让子树共同读取，可将 state/dispatch 通过 props 或 Context 下传。

局部复杂表单、编辑器和状态机都适合 useReducer，即使只有一个组件使用。反之，简单独立字段不必为了“高级”改 reducer；增加 action 和 switch 也有成本。

### 六、Context 提供树作用域的值

```tsx
const StateContext = createContext<State | null>(null);
const DispatchContext = createContext<Dispatch<Action> | null>(null);
```

Provider 的后代读取最近的对应值。**上下文（context）**适合主题、当前用户接口、状态域、服务依赖等跨多层数据。它避免机械 props 转发，但让依赖从函数参数移到环境，必须通过命名 Hook 和 Provider 文档保持可见。

缺失 Provider 应明确报错，不要静默使用危险默认用户或全局单例。

### 七、分离 state 与 dispatch Context

dispatch 通常引用稳定，而 state 每次变化都得到新值。拆开后，只需要动作、不读取 state 的组件不会因 state Context 变化而更新：

```tsx
function DomainProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <StateContext value={state}>
      <DispatchContext value={dispatch}>{children}</DispatchContext>
    </StateContext>
  );
}
```

进一步按变化域拆分用户、主题、编辑器等 Context。一个包含全应用所有 state 的大对象，每个字段变化都可能广播给所有消费者。

### 八、Context 更新由引用身份传播

Provider value 使用 `Object.is` 比较。每次创建新对象会让消费者更新：

```tsx
const value = useMemo(() => ({ user, logout }), [user, logout]);
```

只有测量确认无关更新有成本时才 memoize。更重要的是把 Provider 放到正确子树、缩小 value、保持 state 所有权。memo 不能阻止读取该 Context 的组件在 value 改变时重新渲染。

### 九、Provider 边界决定实例与重置

同一 Context 可以有多个 Provider，形成独立状态域。例如每个编辑器实例有自己的 Provider；测试可以为每个 case 装配替身。Provider 的 key 或位置变化会重建内部 reducer，从而重置状态。

把 Provider 放在应用根意味着跨路由保留；放在页面路由内则离开页面重置。这个选择应来自产品生命周期，不是为了少写一层 JSX。

### 十、异步工作不应放进 reducer

事件处理器可生成 requestId、dispatch requested、调用服务，再 dispatch succeeded/failed。Effect 也可观察状态机进入某状态后启动工作，但要防 Strict Mode 重入和重复副作用。

更常见做法是动作函数/自定义 Hook 协调：

```ts
async function submit(draft: Draft) {
  const requestId = crypto.randomUUID();
  dispatch({ type: 'submitted', requestId });
  try { /* request then dispatch */ } catch { /* normalize */ }
}
```

服务端仍需幂等与授权。Reducer 只能保护客户端状态转移。

### 十一、Context 不适合所有服务端数据

服务器数据有缓存键、过期、去重、后台刷新、分页、错误和多个订阅者。把 fetch 结果放 Context 并手写这些机制，很快成为不完整查询库。使用路由数据 API 或专门服务器状态工具，让 Context 保留客户端会话与依赖装配。

同样，URL 可分享状态应以 URL 为真源，持久化偏好应有版本与白名单。Context 只是传播渠道，不决定数据应属于哪里。

### 十二、外部 store 何时更合适

当状态跨越多个不相邻 Provider、需要 selector 级订阅、DevTools、持久化、模块化或 React 之外读取时，可考虑外部 store。选择前先测量 Context 的真实更新范围，避免仅因“props 层数多”引入复杂库。

外部 store 要支持一致快照与订阅协议，React 集成通常使用 `useSyncExternalStore`。不要在 render 中直接读取一个可变单例并期望 React 自动更新。

### 十三、持久化只保存允许且可迁移的字段

如果状态域需要 localStorage，定义 allowlist、schema version、解析失败回退和用户退出清理。不要保存 access token、权限结果、临时错误或整个 reducer state。服务端最新状态和客户端旧持久化冲突时，必须规定合并策略。

初始化读取 storage 会影响 SSR/hydration，应提供一致首屏或客户端接管状态。写 storage 是副作用，放 Effect/适配器，不放 reducer。

### 十四、用状态转换表作为单一来源

文档、类型、reducer 和测试不应各自维护不同规则。可以先写状态 × action 表，再由它指导判别联合与测试。若规则需要服务端共享，考虑生成或共用领域协议，而不是复制字符串。

新增状态时，`never` 让编译暴露遗漏；运行时测试覆盖非法 action、迟到 requestId 和持久化旧版本。表不是为了考试，而是降低多人维护时的歧义。

### 十五、性能证据要区分 Provider 与消费者

用 React DevTools Profiler 记录 action 前后的提交，查看哪些消费者重新 render、实际耗时和 props/context 原因。拆分 Context 后在相同交互复测。若差异不可测，就不要用更复杂架构换理论优化。

渲染计数只说明调用次数，不代表用户卡顿；结合实际 duration、输入延迟和浏览器工作。REACT-07 会系统讲测量。

### 十六、测试 reducer 与集成层

Reducer 作为纯函数可表驱动测试每个合法/非法转移、旧对象未修改和穷尽。Provider 集成测试从用户动作 dispatch，验证多个消费者一致、缺失 Provider 报错、独立 Provider 不串状态、卸载资源清理。

异步协调测试控制 Promise 顺序和 requestId，证明旧失败不会覆盖新成功。不要只快照一大段 Context 对象。

### 进阶：Reducer 可作为可重放的诊断边界

纯 reducer 的 `(previousState, action) -> nextState` 可记录安全的 action 序列，在本地或测试中重放缺陷。日志应保存 action 类型、实体 ID、版本和结果摘要，敏感 payload 脱敏；时间、随机数和服务器响应先在外部产生，再作为显式 action 数据进入 reducer。

重放能证明状态转移，不证明网络、权限或 DOM 正确。把服务端拒绝建模为独立 action，保留 request/operation ID，避免旧响应结束新 pending。开发时可加入不变量断言，生产则用采样遥测和错误边界控制成本。

### 进阶：Reducer 与状态机的选择取决于约束强度

少量事件和局部状态用 reducer 足够；当存在并行状态、守卫、进入/退出动作、超时和需要可视化的流程时，显式状态机更容易证明非法路径不可达。反过来，只有几个字段更新却引入复杂状态机，会增加学习和工具成本。

无论采用哪种形式，单一转换表、穷尽测试和服务端重授权都不变。Context 只是把当前状态与 dispatch 传到树中，不会自动提供状态机、选择器或持久化。

### 学完后应能说明

你应能把复杂状态写成 reducer 和判别 action，保证纯度与非法转移策略，解释 Context 的树作用域和引用传播，按变化域拆 Provider，并判断局部 state、Context、外部 store、URL 与服务器缓存的边界。
