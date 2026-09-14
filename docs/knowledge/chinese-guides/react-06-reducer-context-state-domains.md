# React 知识点讲义

## REACT-06 Reducer、Context 与跨组件状态

阅读清单里，删除一篇资料后，右侧详情还指着它；保存失败的旧回执，覆盖了刚刚保存成功的新标题。问题不在于少用了某个状态库，而在于一次操作应该一起改变什么、什么结果已经过期，没有被集中说明。

这一篇先把变化写成清楚的规则，再讨论怎样让多个组件共同使用。Reducer 负责“发生一件事以后得到什么状态”，Context 负责“哪些组件能取得这份状态”。它们可以组合，也可以分开使用。

### 学习前先确认

- 直接前置：[REACT-05 Hooks 规则与自定义 Hook](../chinese-guides/react-05-hooks-rules-custom-hooks.md#react-05)。先能区分独立调用、共享来源以及外部工作的责任。

三段 TSX 分别放入 React + TypeScript 项目的 `src/App.tsx`，每段独立运行。第二段让你手动交付模拟回执，方便亲眼比较新旧顺序，不会向服务端保存数据。

### 先把一次操作需要保持的关系写出来

资料清单至少有两份事实：条目集合、当前选中的 ID。选中项必须存在，或明确为空。删除选中项时，不能先只改集合，再期待另一个 Effect 以后修正选择。

| 事件 | 需要一起维护的关系 |
| --- | --- |
| 添加条目 | ID 唯一，标题有效，新条目进入集合 |
| 选择条目 | 目标确实存在 |
| 标记已读 | 只改变对应条目，其余条目保留 |
| 删除条目 | 从集合移除；若它被选中，同时清空选择 |

从当前状态和事件得到下一状态，叫 **state transition**。把这套计算写成函数，就是 **reducer**。它不要求页面很大；只要多个字段经常需要一起满足某个关系，就值得考虑。

总数、未读数和选中条目的正文都可以从现有事实计算，不必再各存一份。状态越少，需要协调的关系通常也越少；可回看 [最小状态模型](../chinese-guides/react-03-state-model-derived-controlled.md#先列事实再决定哪些需要-state)。

### 用完整清单观察 reducer 怎样维护一致性

```tsx example=react06-reading-plan runtime=project file=src/App.tsx
import { useReducer, useState } from 'react';

type Lesson = Readonly<{ id: string; title: string; done: boolean }>;
type State = Readonly<{ lessons: readonly Lesson[]; selectedId: string | null }>;
type Action =
  | { type: 'added'; id: string; title: string }
  | { type: 'selected'; id: string }
  | { type: 'toggled'; id: string }
  | { type: 'removed'; id: string };
const initial: State = {
  lessons: [{ id: 'a', title: '组件协作', done: false }, { id: 'b', title: '状态建模', done: false }],
  selectedId: null,
};
function unreachable(value: never): never { throw new Error(`未知动作：${String(value)}`); }
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'added': {
      const title = action.title.trim();
      if (!title || state.lessons.some(item => item.id === action.id)) return state;
      return { ...state, lessons: [...state.lessons, { id: action.id, title, done: false }] };
    }
    case 'selected':
      return state.lessons.some(item => item.id === action.id) ? { ...state, selectedId: action.id } : state;
    case 'toggled':
      if (!state.lessons.some(item => item.id === action.id)) return state;
      return { ...state, lessons: state.lessons.map(item => item.id === action.id ? { ...item, done: !item.done } : item) };
    case 'removed':
      return {
        lessons: state.lessons.filter(item => item.id !== action.id),
        selectedId: state.selectedId === action.id ? null : state.selectedId,
      };
    default: return unreachable(action);
  }
}
export default function App() {
  const [state, dispatch] = useReducer(reducer, initial);
  const [title, setTitle] = useState('');
  const selected = state.lessons.find(item => item.id === state.selectedId);
  const remaining = state.lessons.filter(item => !item.done).length;
  function add() {
    if (!title.trim()) return;
    dispatch({ type: 'added', id: crypto.randomUUID(), title });
    setTitle('');
  }
  return <main>
    <label>新资料标题 <input value={title} onChange={e => setTitle(e.target.value)} /></label>
    <button onClick={add} disabled={!title.trim()}>添加资料</button>
    <p>未读：{remaining}</p>
    <ul>{state.lessons.map(item => <li key={item.id}>
      <button onClick={() => dispatch({ type: 'selected', id: item.id })}>{item.title}</button>
      <label><input type="checkbox" checked={item.done} onChange={() => dispatch({ type: 'toggled', id: item.id })} />已读</label>
      <button aria-label={`删除${item.title}`} onClick={() => dispatch({ type: 'removed', id: item.id })}>删除</button>
    </li>)}</ul>
    <p>当前选择：{selected?.title ?? '尚未选择'}</p>
  </main>;
}
```

先选择“组件协作”，再删除它：列表与选择同时更新，详情回到尚未选择。把另一篇标记已读，未读数从现有条目重新计算。新增资料时，ID 在事件处理器里产生，再交给 reducer。

修改条目时只复制变化经过的数组和对象，没有改写旧条目；未改变的条目仍可共享引用。readonly 是类型约束，并不负责深度冻结；真正保持不可变，需要更新代码遵守约定。

### Action 应保留已经发生的事实

**action** 是描述事件的数据。上例的 added 带 ID 和标题，reducer 不需要认识 DOM、读取输入框或生成随机数。它可以在没有浏览器的环境中处理同一组输入。

“删除 a”比“把数组设成某个新数组，再把选中项设空”更接近用户动作，也更容易看出需要一起维护的关系。动作过于泛化，如 changed 携带任意对象，则会把判断重新推回调用者。

时间戳、随机 ID、服务端返回结果应在外部得到，再作为明确字段进入 action。不要把 MouseEvent、Promise 或可变的服务对象当作事件事实。若事件来自网络或持久化文件，进入 reducer 之前还要解析；TypeScript 的联合类型不会验证外部 JSON。

### 纯函数让规则可以重复计算

相同的状态和 action，reducer 应计算出同样的下一状态。它不发请求、不写 storage、不读取当前时间，也不修改传入对象。

开发环境的 Strict Mode 可能额外调用 reducer 和初始化函数来检查纯度，其中一份计算结果会被忽略。如果 reducer 内直接发请求，即使页面看起来只更新了一次，外部写入也可能已经发生多次。

派发 **dispatch** 后，当前函数里的 state 仍是当前渲染的快照，不会立刻变成新值。需要下一次规则接着上一条动作计算时，可以继续 dispatch，React 会按队列处理；不要读取旧 state 来猜派发后的结果。

### 迟到回执需要在状态规则中失去资格

以下保存模拟器没有定时器。你决定什么时候交付成功或失败，因此可以稳定复现“新请求先成功，旧请求后失败”。先看规则：

| 当前阶段 | 收到的事件 | 下一步 |
| --- | --- | --- |
| 空闲或失败 | 修改草稿 | 保存新草稿，回到空闲 |
| 空闲或失败 | 开始保存 | 记录本轮 requestId |
| 保存中 | 取消等待 | 保留草稿，回到空闲 |
| 保存中 | 相同 requestId 的成功或失败 | 接受本轮结果 |
| 任意阶段 | 已经过期的结果 | 保持现状 |

```tsx example=react06-receipts runtime=project file=src/App.tsx
import { useReducer, useRef, useState } from 'react';

type Phase = { kind: 'idle' } | { kind: 'pending'; requestId: number } | { kind: 'error'; message: string };
type State = Readonly<{ draft: string; saved: string; phase: Phase }>;
type Action =
  | { type: 'edited'; text: string }
  | { type: 'requested'; requestId: number }
  | { type: 'cancelled' }
  | { type: 'succeeded'; requestId: number; text: string }
  | { type: 'failed'; requestId: number };
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'edited':
      return state.phase.kind === 'pending' ? state : { ...state, draft: action.text, phase: { kind: 'idle' } };
    case 'requested':
      return state.phase.kind === 'pending' || !state.draft.trim() ? state : { ...state, phase: { kind: 'pending', requestId: action.requestId } };
    case 'cancelled': return { ...state, phase: { kind: 'idle' } };
    case 'succeeded':
      if (state.phase.kind !== 'pending' || state.phase.requestId !== action.requestId) return state;
      return { draft: action.text, saved: action.text, phase: { kind: 'idle' } };
    case 'failed':
      if (state.phase.kind !== 'pending' || state.phase.requestId !== action.requestId) return state;
      return { ...state, phase: { kind: 'error', message: '本轮模拟保存失败，草稿仍在' } };
    default: { const neverAction: never = action; throw new Error(String(neverAction)); }
  }
}
export default function App() {
  const [state, dispatch] = useReducer(reducer, { draft: '初稿', saved: '尚未保存', phase: { kind: 'idle' } });
  const sequence = useRef(0);
  const [receipts, setReceipts] = useState<readonly { id: number; text: string }[]>([]);
  function request() {
    if (state.phase.kind === 'pending' || !state.draft.trim()) return;
    const id = ++sequence.current;
    dispatch({ type: 'requested', requestId: id });
    setReceipts(items => [...items, { id, text: state.draft.trim() }]);
  }
  return <main>
    <label>标题草稿 <input value={state.draft} disabled={state.phase.kind === 'pending'} onChange={e => dispatch({ type: 'edited', text: e.target.value })} /></label>
    <button onClick={request} disabled={state.phase.kind === 'pending' || !state.draft.trim()}>开始模拟保存</button>
    <button onClick={() => dispatch({ type: 'cancelled' })} disabled={state.phase.kind !== 'pending'}>取消等待</button>
    <p>已保存：{state.saved}</p>
    <p role="status">{state.phase.kind === 'pending' ? `等待请求 ${state.phase.requestId}` : '没有等待中的请求'}</p>
    {state.phase.kind === 'error' && <p role="alert">{state.phase.message}</p>}
    <ul>{receipts.map(receipt => <li key={receipt.id}>
      请求 {receipt.id} 的标题：{receipt.text}
      <button onClick={() => dispatch({ type: 'succeeded', requestId: receipt.id, text: receipt.text })}>交付 {receipt.id} 成功</button>
      <button onClick={() => dispatch({ type: 'failed', requestId: receipt.id })}>交付 {receipt.id} 失败</button>
    </li>)}</ul>
  </main>;
}
```

按以下顺序操作：以“初稿”开始请求 1，取消等待；把标题改成“新版”，开始请求 2；交付 2 成功，再交付 1 失败。最终已保存仍是新版，也不会出现请求 1 的错误提示。若交付 2 失败，草稿保留，重新开始才产生新的请求身份。

这里只验证客户端是否接受回执。取消等待没有删除模拟回执，也没有声称服务端撤销了写入。真实请求由事件处理器、动作函数或资源层发起，收到结果后派发 action；它仍需服务端版本、幂等或查询确认，不能靠 reducer 替代。

### 非法变化和预期过期需要不同处理

已过期的回执是正常竞态，可以忽略；未知 action 类型则更像程序或数据格式问题，不应一律用 default 返回原 state 掩盖。

never 分支帮助编译器发现新增联合成员后漏掉的处理，但不能证明每个合法成员在所有阶段都合理。比如 pending 时收到 edited，要禁用、排队还是取消后再编辑，必须先做产品决定。上例选择禁用并在 reducer 中再次拒绝。

Reducer 不会自动成为形式化状态机。并行流程、进入与退出动作、复杂守卫和超时很多时，显式状态机可能更便于表达；简单独立开关则继续用 useState 即可。

### Context 让子树取得一份已有状态

**Context** 是传播值的通道，不会自动创建共享仓库。useReducer 仍属于调用它的组件实例，只有把 state 或 dispatch 提供给后代，后代才共享这一份。

下面两个区域使用同一组 Context 类型，但各自创建 reducer；左侧嵌套区域又提供一份更近的值。

```tsx example=react06-context-domains runtime=project file=src/App.tsx
import { createContext, useContext, useReducer, useState, type Dispatch, type ReactNode } from 'react';

type Action = { type: 'added' } | { type: 'reset' };
const CountContext = createContext<number | null>(null);
const DispatchContext = createContext<Dispatch<Action> | null>(null);
function countReducer(count: number, action: Action) { return action.type === 'added' ? count + 1 : 0; }
function CountProvider({ children }: { children: ReactNode }) {
  const [count, dispatch] = useReducer(countReducer, 0);
  return <CountContext.Provider value={count}>
    <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
  </CountContext.Provider>;
}
function useCount() {
  const count = useContext(CountContext);
  if (count === null) throw new Error('读数需要 CountProvider');
  return count;
}
function useCountDispatch() {
  const dispatch = useContext(DispatchContext);
  if (!dispatch) throw new Error('计数动作需要 CountProvider');
  return dispatch;
}
function Readout({ name }: { name: string }) { return <p>{name}读数：{useCount()}</p>; }
function AddButton({ name }: { name: string }) {
  const dispatch = useCountDispatch();
  return <button onClick={() => dispatch({ type: 'added' })}>{name}加一</button>;
}
export default function App() {
  const [leftVersion, setLeftVersion] = useState(0);
  return <main>
    <button onClick={() => setLeftVersion(value => value + 1)}>重建左侧状态域</button>
    <CountProvider key={leftVersion}>
      <section><h2>左侧</h2><Readout name="左侧" /><AddButton name="左侧" />
        <CountProvider><Readout name="嵌套" /><AddButton name="嵌套" /></CountProvider>
      </section>
    </CountProvider>
    <CountProvider><section><h2>右侧</h2><Readout name="右侧" /><AddButton name="右侧" /></section></CountProvider>
  </main>;
}
```

左侧加两次，右侧加一次，分别是 2 和 1；嵌套读数仍为 0。嵌套消费者读取最近的对应 **Provider**。重建左侧状态域会重建它以及其中嵌套的实例，右侧仍为 1。

缺少 Provider 时，辅助 Hook 给出明确错误。不能用一个看似方便的默认全局用户或默认编辑器来掩盖装配错误，否则状态可能悄悄落到不该共享的地方。

### 分开状态和动作有助于缩小传播范围

dispatch 身份稳定，而 state 通常随更新变化。分成两个 Context 后，只读 dispatch 的组件不会被 state Context 的变化直接通知。

这不承诺它永远不重新渲染：父组件重新渲染、props 改变或它读取的其他 Context 变化，仍可能使它执行。判断优化是否有效，应观察实际更新原因和耗时，而不是把“拆两个 Context”当成免渲染开关。

Provider 用 Object.is 比较前后 value。每次创建一个新对象作为 value，会造成新的 Context 值；memo 无法挡住消费者自己读取到的 Context 更新。优先选择合适作用域、分开不同变化域，再按需要稳定对象和回调。

### Provider 的位置决定状态活多久

把编辑器 Provider 放在页面内部，离开页面时通常一起卸载；放在多个子页面共用的布局里，切换子路由时可以保留。key 改变则明确创建新实例，常用于切换编辑对象或账号。

“共享”不等于“应用根上永远保留”。先说明状态应该跟随哪个任务，再放 Provider。草稿若需要刷新后恢复，还需要持久化策略；树中保留状态并不能抵抗页面重新加载。

Vue 的 [Pinia 状态分层](../chinese-guides/vue-08-pinia-state-layers.md#vue-08)也会遇到相同问题，只是 store 的默认寿命与组件状态不同。

### URL 服务器数据与本地状态各有所有者

可分享的页码和筛选通常属于 URL，远端实体属于服务端及其读取缓存，组件输入中间值属于当前编辑过程。Context 可以把它们提供给后代，但不能因此改变权威来源。

如果把路由 loader 返回的数据再复制进另一份 Context state，写入后到底更新哪份、谁负责过期，会更难说清。路由数据闭环见 [React 数据路由](../chinese-guides/react-10-router-data-framework-modes.md#react-10)。

需要 React 外读取、细粒度订阅或跨状态域协调时，可以考虑外部 store；它应提供一致快照，见 [useSyncExternalStore](../chinese-guides/react-05-hooks-rules-custom-hooks.md#共享外部数据需要稳定快照和订阅入口)。并不是 props 传得深，就一定要换状态库。

### 持久化和重放都不能越过真实副作用

持久化先选择允许保存的字段与 schema 版本，不直接保存整个 reducer state。临时 pending、错误文本和旧请求 ID 往往不适合跨刷新恢复，更不应把令牌或客户端权限结论当作可靠凭据保存。

纯 reducer 可以重放事件序列来还原状态变化，前提是初始状态和外部事实相同。重放不代表重发网络请求，也不能证明权限、DOM 或真实保存结果正确。

日志只保留排查所需的动作类型、资源身份和结果摘要。学习或维护时，优先检查删除与选择是否一致、旧回执是否被拒绝、独立 Provider 是否互不影响。这些可见关系比一大份对象快照更能说明规则是否清楚。

### 参考与延伸阅读

- [React：Extracting State Logic into a Reducer](https://react.dev/learn/extracting-state-logic-into-a-reducer)：理解何时集中状态更新。
- [React：useReducer](https://react.dev/reference/react/useReducer)：查纯度、dispatch 和开发检查。
- [React：Scaling Up with Reducer and Context](https://react.dev/learn/scaling-up-with-reducer-and-context)：查状态与动作的分层传递。
- [React：useContext](https://react.dev/reference/react/useContext)：查最近提供者及 Object.is 比较。
- [React：Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state)：查位置、身份和 key 的重置行为。
