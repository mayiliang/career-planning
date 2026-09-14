# React 知识点讲义

## REACT-05 Hooks 规则与自定义 Hook

两个页面都有搜索框，于是把请求代码搬进 useSearch。文件变短了，问题却可能还在：输入一变就重复请求，卸载后旧任务继续回写，两个搜索框的状态意外混在一起。抽取代码和建立好用的复用入口，是两件不同的事。

这一篇先解释 Hook 为什么有调用限制，再用独立计数、可暂停节拍、防抖搜索和共享外部状态四个完整例子，说明应该复用哪些逻辑，以及调用者仍然需要知道什么。

### 学习前先确认

- 直接前置：[REACT-04 Effect、外部同步与清理](../chinese-guides/react-04-effects-external-sync-cleanup.md#react-04)。自定义 Hook 可以封装 Effect，但不会自动补上取消、清理和错误恢复。

每段 TSX 都是独立的 `src/App.tsx`，放入 React + TypeScript 项目运行。示例在同一文件中给出 Hook 与调用组件，方便顺着调用看完；理解后再拆文件。服务均为本地模拟。

### Hook 的调用位置让状态找到所属实例

**Hook** 让函数组件使用 React 保存的状态、引用、订阅等能力。理解普通 Hook 的调用规则时，可以暂时想象：React 为当前组件记住一串调用位置，每次渲染按同一顺序找回对应内容。

| 本次渲染的顺序 | 保存的含义 | 下次必须保持什么 |
| --- | --- | --- |
| 第一个 useState | 输入文本 | 仍是这个组件的第一个状态位置 |
| 第二个 useState | 面板开关 | 不能因为分支而跳过前一个位置 |
| useEffect | 外部同步安排 | 始终有相同的调用结构 |

这只是帮助理解的模型，不是要求依赖内部实现。若第一次渲染先调用 useState(text)，第二次却因为一个 if 跳过它，后续位置就不能按原来的方式对应。

因此普通 Hooks 放在函数组件或自定义 Hook 的顶层，不能放进条件、循环、事件处理器、普通嵌套回调或 try/catch，也不能放在某次可能提前 return 的后面。组件可以有条件地出现在 JSX 中，但在组件自己的执行过程中，Hook 调用结构要稳定。

React 的 use API 有专门例外，允许在条件和循环中读取资源，但仍有调用环境及 try/catch 限制；不能把这个特例推广到 useState、useEffect 或 useContext。

### 两次调用复用逻辑却各自拥有状态

**custom Hook** 是在 React 调用环境里组合其他 Hooks 的函数。名字以 use 开头，帮助读者和检查工具识别它的调用约束；名字本身不会创建任何共享状态。

```tsx example=react05-independent runtime=project file=src/App.tsx
import { useState } from 'react';

function useReadingCount() {
  const [count, setCount] = useState(0);
  function add() { setCount(value => value + 1); }
  function reset() { setCount(0); }
  return { count, add, reset };
}
function Counter({ name }: { name: string }) {
  const { count, add, reset } = useReadingCount();
  return <section aria-label={name}>
    <h2>{name}</h2><p>已读：{count}</p>
    <button onClick={add}>读完一篇</button>
    <button onClick={reset}>重新计数</button>
  </section>;
}
export default function App() {
  return <main><Counter name="React 阅读" /><Counter name="Vue 阅读" /></main>;
}
```

在 React 阅读里点两次，两个计数分别为 2 和 0；Vue 阅读点一次，变成 2 和 1。共享的是 useReadingCount 的代码，各次调用仍对应各自组件里的状态。

即使同一个组件调用 useReadingCount 两次，也会产生两个独立位置。只有内部明确连接同一个 Context 或外部 store，才会共享那个来源。两个组件碰巧都读取相同网络地址，也不代表自动共享缓存或去重请求。

### 条件控制工作是否开始而不是控制是否调用 Hook

假设只有启用面板时才要定时更新。正确的分支放在同步逻辑内部，Hook 本身每次渲染都调用。

```tsx example=react05-enabled runtime=project file=src/App.tsx
import { useEffect, useState } from 'react';

function usePulse(enabled: boolean) {
  const [ticks, setTicks] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => setTicks(value => value + 1), 300);
    return () => window.clearInterval(timer);
  }, [enabled]);
  return ticks;
}
function PulsePanel({ enabled }: { enabled: boolean }) {
  const ticks = usePulse(enabled);
  if (!enabled) return <p>已暂停，保留读数：{ticks}</p>;
  return <p>正在运行，读数：{ticks}</p>;
}
export default function App() {
  const [enabled, setEnabled] = useState(false);
  return <main>
    <button onClick={() => setEnabled(value => !value)}>{enabled ? '暂停' : '启用'}</button>
    <PulsePanel enabled={enabled} />
  </main>;
}
```

启用后读数增长，暂停时显示最后的读数，重新启用继续累计。PulsePanel 一直在树上，变化的是输出和资源状态；如果改成 `{enabled && <PulsePanel enabled />}`，关闭就会卸载，重新打开是新的组件状态。

两种界面都可能合理，区别在于是否保留状态。不要把“暂时不工作”“不显示 DOM”和“销毁实例”混为一谈。Vue 的 [KeepAlive 暂停例子](../chinese-guides/vue-05-lifecycle-effects-async-recovery.md#keepalive-保留实例时需要暂停仍在运行的工作)也在处理相似问题，只是机制不同。

### 先说明输入输出再决定抽取多少代码

一个 Hook 应能用短句说明：输入什么，什么时候工作，返回什么，失败或结束时如何表现。例如下面的搜索约定：

| 项目 | 本例选择 |
| --- | --- |
| 输入 | 查询文本、非负延迟、稳定的搜索函数 |
| 空文本 | 不启动请求，返回 idle |
| 连续编辑 | 等最后一次编辑后的静默窗口 |
| 请求进行中又修改 | 取消旧计时器与请求，并使旧结果失效 |
| 搜索失败 | 返回 error，输入新词后可再次尝试 |
| 返回值 | 一个明确的状态分支，不暴露任意 setState |

这是 **Hook API** 的一部分。以后若改成保留旧结果、自动重试或共享缓存，应明确改变约定，不能在内部悄悄加上这些行为。

字段少而位置固定时可以返回元组；状态和动作多时，普通对象通常更容易读。返回对象本身不一定需要稳定身份，调用者应使用实际需要的字段，而不是把整包结果塞进另一个 Effect 的依赖。

### 防抖搜索要结束等待也要结束已开始的请求

**debounce** 等待一段没有新输入的时间。一次搜索可能处于“还没开始”和“已经开始”两个阶段，所以清理也有两层。

```tsx example=react05-debounced-search runtime=project file=src/App.tsx
import { useEffect, useState } from 'react';

type SearchState<T> =
  | { kind: 'idle' }
  | { kind: 'waiting'; query: string }
  | { kind: 'pending'; query: string }
  | { kind: 'ready'; query: string; data: T }
  | { kind: 'error'; query: string; message: string };
type Searcher<T> = (query: string, signal: AbortSignal) => Promise<T>;

function useDebouncedSearch<T>(query: string, delay: number, search: Searcher<T>): SearchState<T> {
  const key = query.trim();
  const [state, setState] = useState<SearchState<T>>({ kind: 'idle' });
  useEffect(() => {
    if (!key) return;
    let active = true;
    const controller = new AbortController();
    setState({ kind: 'waiting', query: key });
    const timer = window.setTimeout(() => {
      setState({ kind: 'pending', query: key });
      async function run() {
        try {
          const data = await search(key, controller.signal);
          if (active) setState({ kind: 'ready', query: key, data });
        } catch (error) {
          if (!active || controller.signal.aborted) return;
          setState({ kind: 'error', query: key, message: error instanceof Error ? error.message : '搜索失败' });
        }
      }
      void run();
    }, delay);
    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort(new DOMException('搜索已失效', 'AbortError'));
    };
  }, [key, delay, search]);
  if (!key) return { kind: 'idle' };
  if (state.kind === 'idle' || state.query !== key) return { kind: 'waiting', query: key };
  return state;
}

const lessons = ['React 组件', 'React Effect', 'Vue watch', 'Vue Composable'];
const searchLessons: Searcher<string[]> = (query, signal) => new Promise((resolve, reject) => {
  if (signal.aborted) { reject(signal.reason); return; }
  const timer = window.setTimeout(() => {
    signal.removeEventListener('abort', abort);
    if (query === '!') reject(new Error('模拟搜索失败，请修改关键词'));
    else resolve(lessons.filter(title => title.toLowerCase().includes(query.toLowerCase())));
  }, 200);
  function abort() { window.clearTimeout(timer); reject(signal.reason); }
  signal.addEventListener('abort', abort, { once: true });
});

export default function App() {
  const [query, setQuery] = useState('');
  const state = useDebouncedSearch(query, 300, searchLessons);
  return <main>
    <label>搜索资料 <input value={query} onChange={e => setQuery(e.target.value)} /></label>
    <button onClick={() => setQuery('')}>清空</button>
    {state.kind === 'idle' && <p>请输入关键词</p>}
    {state.kind === 'waiting' && <p role="status">等待输入停下来</p>}
    {state.kind === 'pending' && <p role="status">正在搜索 {state.query}</p>}
    {state.kind === 'error' && <p role="alert">{state.message}</p>}
    {state.kind === 'ready' && <>
      <p>结果数：{state.data.length}</p><ul>{state.data.map(title => <li key={title}>{title}</li>)}</ul>
    </>}
  </main>;
}
```

输入 React 后，很快改成 Vue，最后只显示两条 Vue 资料。清空输入，立刻回到 idle；已开始的旧请求会被取消，不能把结果重新填回。输入 ! 会失败，再改成 React 可以恢复正常搜索。

这段代码没有缺省的 Searcher、错误函数或数据源，能从调用者一路读到模拟请求。泛型 T 只保留搜索结果的类型关联，不能替接口验证未知 JSON；外部数据仍要先解析，见 [泛型输入与运行时校验](../chinese-guides/ts-03-generics-constraints-keyof-indexed-access.md#ts-03)。

延迟在本例由调用方固定为 300。若作为公开库参数，应校验它是有限的非负数。delay 为 0 仍通过 setTimeout 排到后续任务，并非在当前调用栈直接执行；需要“零延迟立即开始”时，应另作明确分支。

### 防抖减少启动次数却不能替代结果身份检查

防抖只能避免尚未开始的请求，不会让已经开始的请求天然按顺序完成。即使没有防抖，结果也需要判断自己是否仍属于当前工作。上例把 query 保存在状态中，避免把旧词的结果放在新词下面；active 则让依赖变动或卸载后的所有旧回调失效。

只在新请求开始时增加版本号，却在卸载时不使旧版本失效，会遗漏“没有下一次请求”的情况。不要只考虑快速输入，还要考虑关掉组件。

清理把 timer、controller 和 active 放在同一轮闭包中，彼此的所有权很明确。需要更多实例共享、缓存失效、分页和服务端取数时，交给合适的数据层；把这些功能塞进 useFetch 并不会让它们自动可靠。

### 参数稳定性决定哪些变化会重新开始工作

上例 searchLessons 定义在组件外，身份稳定，也不偷偷捕获某次渲染的用户信息。如果改成在 JSX 组件内每次创建 `(q, signal) => api.search(q, signal)`，每次渲染都会得到新函数，可能让等待不断重启。

这时先决定搜索依赖什么。若 transport 不依赖组件状态，移到稳定的服务层；若确实依赖账号或筛选范围，使用正确依赖构造回调，并让这些变化使旧请求失效。忽略 search 依赖只会把重新同步的问题变成旧闭包问题。

回调也有不同含义：变化后重建资源，或者事件发生时才读取最新提示逻辑。后者可在符合限制时使用 [Effect Event](../chinese-guides/react-04-effects-external-sync-cleanup.md#effect-event-读取最新提示格式但不重启同步)。不能把两种行为都叫“回调参数”，却不告诉使用者何时会触发重建。

React 保证 setter 身份稳定，不必再次包装。其他返回动作是否稳定，要按消费者需要决定；useCallback 不是正确性的代替品，也不会自动修复漏写的依赖。

### 共享外部数据需要稳定快照和订阅入口

有些数据确实由 React 之外的对象拥有，多个组件需要一起读取。**useSyncExternalStore** 接受读取快照和订阅变化的入口。下面的 store 由 App 创建，两个视图共享它；它不是所有页面共用的模块单例。

```tsx example=react05-external-store runtime=project file=src/App.tsx
import { useState, useSyncExternalStore } from 'react';

type Snapshot = Readonly<{ count: number }>;
function createReadingStore(initial = 0) {
  const initialSnapshot: Snapshot = Object.freeze({ count: initial });
  let snapshot = initialSnapshot;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => initialSnapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    add() {
      snapshot = Object.freeze({ count: snapshot.count + 1 });
      for (const listener of listeners) listener();
    },
  };
}
type ReadingStore = ReturnType<typeof createReadingStore>;
function useSharedReading(store: ReadingStore) {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}
function ReadingView({ name, store }: { name: string; store: ReadingStore }) {
  const snapshot = useSharedReading(store);
  return <section aria-label={name}><h2>{name}</h2><p>共享读数：{snapshot.count}</p></section>;
}
export default function App() {
  const [store] = useState(() => createReadingStore());
  const [showSecond, setShowSecond] = useState(true);
  return <main>
    <button onClick={store.add}>共享计数加一</button>
    <button onClick={() => setShowSecond(value => !value)}>切换第二个视图</button>
    <ReadingView name="目录视图" store={store} />
    {showSecond && <ReadingView name="详情视图" store={store} />}
  </main>;
}
```

点一次，两个视图都显示 1；隐藏第二个视图后继续增加，再打开它，它读取当前共享值。隐藏视图只解除自己的订阅，不会把整个 store 重置。

数据未变时，getSnapshot 返回同一个对象；变化时创建新的不可变快照。若每次读取都返回 `{ count }` 新对象，即使数据没变也会被认为发生变化。subscribe 返回解除函数，订阅入口本身也保持稳定，避免无意义地重新订阅。

这里的 getServerSnapshot 用于服务器与客户端 hydration 的初始读取，双方需要相同的初始数据。真实 SSR 如果初始值来自请求，应按请求创建 store，并把对应初始值传给客户端，不能拿固定 0 冒充真实首屏。

### Context 依赖仍需说明提供者在哪里

自定义 Hook 可以把 useContext 包装为 useReaderSettings，并在缺少必需 Provider 时抛出清楚的错误。它帮助调用者找到配置缺失的位置，但不应偷偷创建另一个默认全局对象来掩盖装配问题。

提供者可以限定在一棵页面子树中；同名 Hook 在不同 Provider 下读取不同的值。Context、外部 store、状态提升都有各自范围，不能因为用了 Hook 就省去“谁拥有数据”的讨论。Context 与 Reducer 的系统设计留给 [REACT-06](../chinese-guides/react-06-reducer-context-state-domains.md#react-06)。

在本篇外部 store 例子里直接用 prop 传入依赖，是为了让共享范围一眼可见。跨层越来越多时再选择 Context，并为必须存在的服务提供明确接口。

### 普通函数组件与 Hook 分别复用不同东西

| 需要复用的东西 | 更直接的形式 | 例子 |
| --- | --- | --- |
| 纯计算 | 普通函数 | 校验数量、格式化标题 |
| 结构与交互语义 | 组件 | 带标签和错误提示的搜索框 |
| React 状态与资源生命周期 | 自定义 Hook | 当前搜索的等待、取消和结果 |
| 多个消费者共同的数据 | 明确的状态所有者或 store | 上面的共享阅读计数 |

不要为了文件命名整齐，把普通格式化函数也叫 useFormat。普通函数可以在循环或事件中调用，Hook 有调用环境限制；误命名会让使用者误判。

Hook 可以组合其他 Hook，但组合成本也要算清楚。一个 useWorkspace 内部调用三个各自监听 window 的 Hook，仍然可能有三份监听。相同代码不是共享资源，资源数、缓存范围和错误责任都需要明确。

### 好的封装让副作用更容易发现

调用 useSearch 不应意外刷新令牌、跳转登录、弹三次提示、写共享缓存并永久轮询。基础能力明确返回结果，认证和业务策略由能做决定的层协调。否则调用者即使看完类型，也不知道这行代码会改变什么。

首次抽取时，关注是否出现重复的输入、输出、生命周期和错误处理。两个函数都用了 useState，不足以说明它们应该合并成一个接收十个布尔参数的 Hook。

对外发布时还要说明 React 版本、是否要求 Provider、浏览器能力、SSR 初始值和卸载后的行为。模块加载阶段避免读取 window；初始化函数保持纯净，不能在 useState 初始化中打开连接，因为开发检查可能重复调用初始化函数。

### 用调用者能观察的变化检查复用结果

核对这四个例子时，观察的是：两个独立计数是否互不影响，暂停是否保留状态，旧搜索是否退出，两个共享视图是否一致。并不需要把内部 setState 次数当成 API。

需要排查时，可以控制输入变化、异步完成顺序和卸载时刻，记录仍有效的订阅或请求。错误应成为可理解的分支，取消不是红色故障；清理只结束自己的资源。做到这些，抽取后的调用处才会比原来更清楚。

### 参考与延伸阅读

- [React：Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)：查普通 Hook 的调用限制及 use 的例外。
- [React：Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)：查复用逻辑与独立状态的关系。
- [React：Separating Events from Effects](https://react.dev/learn/separating-events-from-effects)：区分响应式依赖与事件发生时读取的值。
- [React：useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)：查快照、订阅及 hydration 初始值。
- [React：useContext](https://react.dev/reference/react/useContext)：查最近提供者与上下文读取。
- [React：eslint-plugin-react-hooks](https://react.dev/reference/eslint-plugin-react-hooks)：查调用规则与依赖检查工具。
- [MDN：setTimeout](https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout)：查延迟调度及后台节流。
