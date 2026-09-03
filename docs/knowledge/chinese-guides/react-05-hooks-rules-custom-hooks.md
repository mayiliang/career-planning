# React 知识点讲义

## REACT-05 Hooks 规则与自定义 Hook

Hook 让函数组件接入 state、context、ref 和 Effect。它们依赖稳定的调用顺序把每次函数执行与 React 保存的内部单元对应起来，因此不能像普通工具函数那样任意条件调用。自定义 Hook 的价值也不是“把代码搬到另一个文件”，而是定义可复用的有状态协议、隐藏资源生命周期并保留清晰输入输出。

### 学习前先确认

- 直接前置：[REACT-04 Effect、外部同步与清理](../chinese-guides/react-04-effects-external-sync-cleanup.md#react-04)。它会继续链接状态模型、Promise 取消和 React 渲染基础。

Reducer/Context 在 REACT-06；本讲关注 Hook 调用模型与复用边界。

### 一、React 用调用顺序识别 Hook 单元

抽取可复用 Hook 协议形成**自定义 Hook（custom hook）**；回调捕获了旧 render 值却继续执行，称为**陈旧闭包（stale closure）**。Effect/备忘 Hook 的**依赖数组（dependency array）**声明所读取的响应式值，而稳定的输入、输出、错误和清理共同构成**Hook 合同（hook contract）**。

每次 render，组件中的 Hook 必须以相同顺序执行。概念上 React 沿当前组件的一条 Hook 链依次读取 state/effect 单元。若某次条件分支跳过一个 Hook，后面的调用会与错误单元对齐。

```tsx
// 错误
if (enabled) {
  const [value, setValue] = useState(0);
}
```

Hook 要放在组件或自定义 Hook 的顶层，不放循环、条件、事件处理器、普通回调、`try/catch` 或提前 return 之后。这叫**Hook 调用规则（Rules of Hooks）**。

条件行为应放进 Hook 的参数或内部：始终调用 `useConnection(enabled ? roomId : null)`，由其内部决定是否建立资源。

### 二、只有 React 函数中才能调用 Hook

Hook 只能在函数组件或名字以 `use` 开头的自定义 Hook 中调用。普通工具函数可能在任意时间被调用，没有当前 render 上下文，React 无法知道 state 属于哪个实例。

`use` 这类新 API 有个别特殊规则，但不能据此放宽所有 Hook。以项目锁定版本的官方 lint 与文档为准，不要根据名字猜可调用位置。

eslint 插件不仅检查调用顺序，也能检查 Effect 依赖、自定义 Hook 配置和一些编译器兼容问题。不要用 disable 注释长期掩盖真实模型错误。

### 三、自定义 Hook 复用逻辑，不共享 state 实例

```ts
function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}
```

两个组件分别调用 `useOnlineStatus`，会得到两个 state/effect 实例，只是复用了协议代码。若需要共享一个数据源，应让 Hook 订阅同一外部 store、使用 Context，或提升状态，而不是期待同名 Hook 自动共享。

### 四、Hook API 应从使用者需求反推

一个 Hook 的输入包括业务参数、依赖和策略；输出包括只读状态、明确动作和必要元数据。避免返回一整个内部对象让调用者随意修改。

```ts
type SearchResult<T> = {
  state: LoadState<T>;
  retry(): void;
  cancel(): void;
};

function useSearch<T>(query: string, searcher: Searcher<T>): SearchResult<T> { /* ... */ }
```

返回元组适合少量、位置稳定的值；字段增多时对象更易读。动作名应表达语义，避免暴露 `setInternalState`。是否自动请求、空查询如何处理、错误是否保留旧数据都应记录。

### 五、参数稳定性是 API 合同的一部分

若调用者每次 render 传新对象，内部 Effect 可能不断重启。Hook 可以要求原始稳定参数、在内部构造 options，或明确调用者必须 memoize。不要悄悄忽略对象字段变化或只比较 JSON 字符串。

回调参数有三种常见语义：变化时重建资源；只在事件发生时调用最新回调；固定在首次创建时。API 应选择并实现一种，不能让使用者猜。需要读取最新回调但不重启 Effect 时，可用 ref 或当前 React 提供的 Effect Event 模式，并解释其限制。

### 六、完整搜索 Hook 包含两层取消

防抖搜索先等待 timer，再启动请求。因此清理既要取消 timer，也要 abort 已启动请求，并用版本号阻止迟到结果：

```ts
function useDebouncedSearch<T>(
  query: string,
  delay: number,
  search: (query: string, signal: AbortSignal) => Promise<T>,
) {
  const [state, setState] = useState<LoadState<T>>({ kind: 'idle' });
  const version = useRef(0);

  useEffect(() => {
    const mine = ++version.current;
    if (!query.trim()) {
      setState({ kind: 'idle' });
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setState(previous => ({ kind: 'pending', previous: readyData(previous) }));
      try {
        const data = await search(query, controller.signal);
        if (mine === version.current) setState({ kind: 'ready', data });
      } catch (error) {
        if (mine !== version.current || controller.signal.aborted) return;
        setState({ kind: 'error', error: normalizeError(error) });
      }
    }, Math.max(0, delay));
    return () => {
      window.clearTimeout(timer);
      controller.abort('query-changed');
    };
  }, [query, delay, search]);

  return state;
}
```

这只是底层协议。真实应用还要考虑缓存、去重、重试、离线和 SSR，通常交给数据层。Hook 不应重复发明一个不完整查询库。

### 七、delay 为零仍有明确语义

`setTimeout(..., 0)` 仍把任务放到后续队列，并可在执行前取消。若产品希望零延时立刻启动，代码应显式分支；若希望统一为可取消的下一任务，则保留 timer。测试必须固定这一合同，不能依赖运行速度。

防抖与节流也不同：防抖等待静默窗口，节流限制时间窗口内频率。搜索、拖动、滚动和自动保存需要根据业务结果选择，而不是共享一个名为 `useDebounce` 的模糊实现。

### 八、Hook 不应隐藏业务权限和不可见副作用

通用 `useFetch` 若内部自动刷新令牌、跳转登录、弹 toast、写全局缓存并重试，调用者无法判断一次调用的影响。基础 Hook 应有单一责任；认证和业务错误由更高层协调。

同样，自定义 Hook 不能因为名字以 use 开头就绕开架构。它仍是模块 API，需要审查依赖方向、错误模型、日志、测试和资源成本。

### 九、普通函数、组件与 Hook 各自复用什么

- 普通函数：纯计算或显式 I/O，不依赖 React 生命周期；
- 组件：复用 UI 结构、语义和实例生命周期；
- Hook：复用与 React state/effect/context 绑定的无 UI 协议。

日期格式化应是普通函数；带标签和错误的日期输入是组件；监听窗口宽度并清理 observer 可以是 Hook。把所有函数改名 `useX` 会混淆调用限制和测试方式。

### 十、Hook 可以组合，但要避免生命周期乘法

一个 Hook 调另一个 Hook 很自然。组合时要检查是否重复订阅同一资源、是否每个调用都创建独立缓存、错误和 loading 是否被多层改写。多个 `useWindowSize` 调用若各自监听 resize，可能需要外部共享 store 统一订阅。

调用层级也影响取消：外层参数变化会使多个内层 Effect 同时失效。cleanup 必须独立幂等，不能依赖另一个 Hook 恰好先清理。

### 十一、Context 依赖可以作为显式 Hook

```ts
function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth 必须位于 AuthProvider 内');
  return value;
}
```

封装可以提供缺失 Provider 的清晰错误并隐藏 Context 实现。但 Hook 名和文档应说明依赖 Provider；测试也必须覆盖缺失、多个 Provider 和实例隔离。SSR 中不得用模块级单例保存每请求用户。

### 十二、稳定返回引用只在消费者需要时优化

Hook 每次返回新对象通常语义正确。若消费者把结果作为 memo 组件 prop 或 Effect 依赖，可能需要 memoize 对象/动作。但先测量，并让稳定性成为明确合同；否则未来加入字段会意外破坏调用者假设。

setter/dispatch 等 React 保证稳定的函数无需重复包装。过度 useCallback 会增加依赖推理和代码噪音，React Compiler 环境下还可能与自动优化重叠。

### 十三、测试 Hook 的公共行为和清理

通过测试组件或 Hook 测试工具，控制 props 变化、时间、Promise 和卸载。验证输入变化后的状态、旧工作取消、错误分类、重试、资源计数和 Strict Mode。

不要只测试内部 setState 次数。一个 Hook 的合同是调用者看到的 state/actions 与外部系统行为。对泛型 Hook 还应保存类型测试，证明合法推断和非法参数都正确。

### 十四、发布 Hook 需要兼容性边界

组件库 Hook 要声明 React peer dependency、运行环境、SSR 行为和是否要求浏览器 API。不要在模块顶层读取 window；允许调用者注入 clock、storage、transport 等依赖，可提高测试与多运行时兼容性。

升级 React 时运行 lint、类型、Strict Mode、并发导航和卸载测试。只看 Hook API 未变化不足以证明生命周期行为兼容。

### 十五、审查自定义 Hook 的问题

它复用的是有状态协议还是只搬代码？每次调用是否应独立？输入变化时哪些资源重启？输出是否泄漏可写内部状态？取消、错误、SSR 和清理由谁负责？普通函数或组件是否更合适？

这些问题比“文件是否以 use 开头”更能判断抽象质量。

### 进阶：面向外部订阅时优先提供一致快照合同

浏览器 storage、自定义 store 或第三方状态源若可能在 React 外变化，仅用 Effect 订阅加 `useState` 容易在并发渲染时撕裂。适配器应提供同步 `getSnapshot`、subscribe/unsubscribe 以及 SSR 的 server snapshot，再由 `useSyncExternalStore` 连接 React。

快照在数据未变时保持引用稳定，订阅回调只通知“可能变化”，React 再读取并比较。测试订阅前后竞态、卸载清理、两个消费者、服务端/客户端首帧一致和错误快照。自定义 Hook 隐藏的是重复协议，不应隐藏数据所有者与权限判断。

### 学完后应能说明

你应能解释 Hook 顺序为何必须稳定、自定义 Hook 为何不共享 state、如何设计输入输出与回调稳定性、如何在防抖请求中清理 timer 和请求，并区分普通函数、组件、Hook、Context 与外部 store 的复用责任。
