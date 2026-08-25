# React 工程工作台：从渲染模型到数据路由

> 适用知识点：`REACT-01` 至 `REACT-10`  
> 审阅与版本基线：2026-08-25；React 19.2；React Router 官方文档当前版本 8.3.0  
> 阅读目标：这不是 API 清单，而是站内挑战的中文实验手册。先读每个知识点列出的 React 官方中文资料，再用本讲义完成固定实验、断言和排错记录。

## 0. 初学者先读：怎样使用这份讲义

每节都按同一条工程证据链组织：

1. **状态模型**：先写“哪些是源状态，哪些能在渲染时计算”，不要先写 Hook。
2. **固定输入**：严格使用题目给出的记录、延时和错误，保证结果可以比较。
3. **可观察证据**：保存状态序列、DOM、请求、Profiler 或构建日志，不以“看起来正常”代替断言。
4. **受限排错**：一次只改变一个候选原因；被排除的候选也要留下证据。
5. **复测变式**：只改变题目指定的一项，确认修复针对机制而不是偶然通过样例。

本讲义中的英文术语第一次出现时同时保留原名和中文：例如 **snapshot（快照）**。代码中的 API 名不翻译，以免学习者查文档时找不到原名。

---

## REACT-01

**主题：渲染、组件纯度与 state snapshot（状态快照）**

### 1.1 三个阶段不要混为一谈

- **trigger（触发）**：首次挂载，或组件的 state 更新。
- **render（渲染）**：React 调用组件函数，计算本次 JSX。render 可以重复、暂停或放弃，所以必须纯粹。
- **commit（提交）**：React 把必要的 DOM 变化提交给浏览器。`useLayoutEffect` / `useEffect` 属于提交后的同步工作，不属于 render。

**state snapshot（状态快照）**不是“变量被立刻改写”。一次 render 得到一张固定快照；该次 render 创建的事件处理器和定时器闭包继续看到这张快照。

### 1.2 固定 fixture：三次更新与两个回调

```tsx
function Counter() {
  const [count, setCount] = useState(0)

  function addThreeWrong() {
    setCount(count + 1)
    setCount(count + 1)
    setCount(count + 1)
  }

  function addThreeRight() {
    setCount(c => c + 1)
    setCount(c => c + 1)
    setCount(c => c + 1)
  }

  function scheduleTwo() {
    const snapshot = count
    setTimeout(() => setCount(snapshot + 1), 0)
    setTimeout(() => setCount(c => c + 1), 0)
  }

  return (
    <>
      <output aria-label="count">{count}</output>
      <button onClick={addThreeWrong}>值式加三次</button>
      <button onClick={addThreeRight}>函数式加三次</button>
      <button onClick={scheduleTwo}>安排两个回调</button>
    </>
  )
}
```

值式写法三次都基于同一个 `count`，队列中是三次“设为同一个值”；函数更新接收队列中的前一个结果，所以能连续累加。两个异步回调中，第一个显式使用创建时快照，第二个使用执行更新时的前值；两者语义不同，测试必须分别写出预期。

```tsx
await user.click(screen.getByRole('button', { name: '值式加三次' }))
expect(screen.getByLabelText('count')).toHaveTextContent('1')

await user.click(screen.getByRole('button', { name: '函数式加三次' }))
expect(screen.getByLabelText('count')).toHaveTextContent('4')
```

复测时只把两个定时器改为 20ms / 40ms。延时改变顺序，不改变闭包捕获哪张 snapshot。

### 1.3 为什么 `Date.now()` 不能直接写进 render

```tsx
// 错误：同样的 props/state 在不同时间得到不同输出
function ClockLabel() {
  return <span>{Date.now()}</span>
}

// 正确边界之一：外部时间由父层作为明确输入传入
function ClockLabel({ now }: { now: number }) {
  return <span>{now}</span>
}
```

**pure component（纯组件）**要求相同 props、state、context 得到相同 JSX，并且 render 不修改组件外对象、DOM、网络、存储或时间源。Strict Mode（严格模式）在开发环境重复调用 render，是为了暴露不纯逻辑，不代表生产环境会“自动执行两次业务”。

### 1.4 受限排错表

| 候选 | 最小证据 | 能否解释什么 |
| --- | --- | --- |
| 值式更新 / 函数更新 | 只替换 `setCount` 参数并比较序列 | 能解释一次事件中的 1 / 3 差异 |
| 异步闭包快照 | 记录创建时与执行时 count | 能解释旧值覆盖或累加差异 |
| render 内 `Date.now()` | 固定输入重复 render 并比较文本 | 能解释 Strict Mode 两次文本不同 |

---

## REACT-02

**主题：组件边界、数据流与组合**

### 2.1 从数据职责拆组件

组件边界不是按页面上的矩形随意切块，而是看“谁拥有状态、谁只显示数据、谁发出事件”。固定订单 fixture 建议为：

```text
OrderWorkspace（拥有 filter 与 selectedId）
├─ OrderFilter（value, onChange）
├─ OrderList（orders, selectedId, onSelect）
└─ EditorFrame（children 组合边界）
   └─ OrderEditor（order, onSave, onClose）
```

**one-way data flow（单向数据流）**：数据由父到子通过 props 下行；用户意图由回调上行。它不等于“子组件不能交互”，而是每次状态变化都有唯一可追踪的所有者。

### 2.2 筛掉 A 后不能保存悬挂记录

```tsx
const visibleOrders = orders.filter(order => order.name.includes(filter))
const selectedOrder = visibleOrders.find(order => order.id === selectedId) ?? null

useEffect(() => {
  if (selectedId !== null && !selectedOrder) onSelect(null)
}, [selectedId, selectedOrder, onSelect])
```

更简单的实现可以直接在筛选事件中同步校正 `selectedId`；关键不是一定使用 Effect，而是 `OrderEditor` 不能把旧 A 对象复制到自己的长期 state 后脱离父层有效集合。保存时还要按当前可见/可用记录再解析 ID。

```tsx
expect(screen.getByRole('dialog', { name: '编辑 A' })).toBeVisible()
await user.type(screen.getByRole('searchbox'), 'B')
expect(screen.queryByRole('dialog', { name: '编辑 A' })).not.toBeInTheDocument()
expect(saveOrder).not.toHaveBeenCalled()
```

复测 `openIds=[1,2]` 时，派生 `validOpenIds = openIds.filter(id => visibleIds.has(id))`。筛掉 A 只移除 `1`，不能把 B 的面板一起关闭。

### 2.3 children 组合与 props 透传

**composition（组合）**是让容器接收 `children`，而不是让容器知道编辑器的全部业务 props：

```tsx
function EditorFrame({ title, children }: PropsWithChildren<{ title: string }>) {
  return <section aria-labelledby="editor-title"><h2 id="editor-title">{title}</h2>{children}</section>
}
```

children 不会自动解决状态所有权，也不是“任意插槽都安全”。容器仍要保证标题、焦点顺序和 landmark（地标）等可访问语义。

### 2.4 三个候选怎样证伪

- `selectedId` 在编辑器内部：检查父层筛选后编辑器内部 ID 是否仍为 1。
- 列表 key 复用：把 key 固定改为稳定 `order.id`；若问题仍在，就不是 key 根因。
- 父层未传有效筛选结果：在父层记录 `visibleIds` 与传给编辑器的 order；若仍传 A，则命中。

---

## REACT-03

**主题：状态建模、派生状态与受控模式**

### 3.1 先区分源状态与派生值

固定表单只有这些源状态：

```ts
type FormState = {
  quantityInput: string
  draft: string
}
```

`price` 来自当前记录；`total` 能从 `price` 和合法数量计算，因此是 **derived state（派生状态）**，不应再复制进 state。

```tsx
const parsedQuantity = quantityInput === '' ? null : Number(quantityInput)
const quantityValid = parsedQuantity !== null && Number.isFinite(parsedQuantity)
const total = quantityValid ? price * parsedQuantity : null
```

价格 10、数量 `"2"` 时总额 20；服务端刷新价格为 12 后，下一次 render 自然得到 24。若把 total 存为 state，再用 Effect 同步，就会制造“旧 total 已提交、新 total 尚未同步”的中间帧和重复事实来源。

### 3.2 空字符串不是 0

HTML 数字输入在编辑过程中仍可能给出空字符串。`Number('') === 0` 是 JavaScript 转换规则，不是业务规则。

```tsx
function submit() {
  if (!quantityValid) {
    setError('请输入有效数量')
    return
  }
  save({ quantity: parsedQuantity })
}
```

必须同时断言 DOM 保持空值、出现错误、payload 未发送，不能只断言总额显示为空。

### 3.3 key 重置草稿

```tsx
<OrderEditor key={order.id} order={order} />
```

`key` 是 React 识别组件身份的一部分。ID 改变后，旧编辑器卸载、新编辑器挂载，局部 draft 被重置。若产品要求切回来仍保留草稿，就把草稿提升为 `draftById`；不要一边要求重置，一边把草稿存全局。

```tsx
expect(screen.getByLabelText('总额')).toHaveTextContent('20')
rerender(<Editor order={{ id: 1, price: 12 }} />)
expect(screen.getByLabelText('总额')).toHaveTextContent('24')
rerender(<Editor key={2} order={{ id: 2, price: 12 }} />)
expect(screen.getByLabelText('草稿')).toHaveValue('')
```

**controlled component（受控组件）**指关键值由父层 props 决定、通过事件请求变更；**uncontrolled component（非受控组件）**指组件自己保存该值。两者是状态所有权选择，不是质量高低标签。

---

## REACT-04

**主题：Effect（副作用同步）、外部同步与清理**

### 4.1 Effect 只连接外部系统

Effect（副作用同步）适合连接网络、订阅、浏览器 API 或第三方控件。过滤数组、计算 total、把 props 改个格式都应在 render 中完成。

固定时序：A 在 0ms setup；50ms 切到 B；B 在切换后 80ms 成功；初始时刻后 150ms 卸载；A 在 300ms 才尝试发消息。

```tsx
function useRoom(roomId: string, connect: Connect) {
  const [status, setStatus] = useState<'connecting' | 'ready' | 'error'>('connecting')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    setStatus('connecting')

    const connection = connect(roomId, {
      signal: controller.signal,
      onReady() { if (active) setStatus('ready') },
      onMessage(value) { if (active) setMessage(value) },
      onError(error) {
        if (active && error.name !== 'AbortError') setStatus('error')
      },
    })

    return () => {
      active = false
      controller.abort()
      connection.unsubscribe()
    }
  }, [roomId, connect])

  return { status, message }
}
```

`AbortController` 尽量取消真实工作；`active` 标志阻止不支持取消的旧回调写状态；`unsubscribe` 对称释放订阅。三者承担不同职责，不能用一个布尔变量假装网络已被取消。

### 4.2 正确时间线

```text
0ms    setup A
50ms   cleanup A -> abort A -> unsubscribe A
50ms   setup B
130ms  B ready（若尚未卸载才允许写入）
150ms  cleanup B
300ms  A 回调到达 -> active=false -> 忽略
```

### 4.3 失败变式

B 立即失败时，错误态只能属于 B；A 消息仍不得覆盖。取消是预期控制流，不应显示为红色错误。

```tsx
expect(log).toEqual(expect.arrayContaining(['setup:A', 'cleanup:A', 'setup:B']))
expect(log).not.toContain('state:A message')
expect(consoleError).not.toHaveBeenCalledWith(expect.stringContaining('unmounted'))
```

**race condition（竞态条件）**指结果依赖不可控的完成顺序；**cleanup（清理函数）**是 setup 的对称撤销；**reactive dependency（响应式依赖）**是 Effect 内读取且会随 render 改变的 props、state 或组件内声明值。

---

## REACT-05

**主题：Hooks 规则与自定义 Hook（钩子）**

### 5.1 为什么 Hook 必须保持调用顺序

React 依赖同一组件每次 render 以相同顺序调用 Hook，把调用位置与内部状态槽对应。除 `use(resource)` 这一特殊 API 外，不得在条件、循环、事件、嵌套函数或 `try/catch/finally` 中调用 Hook。

```tsx
// 错误
if (enabled) useEffect(sync, [])

// 正确：顺序固定，把条件放进 Hook 内部
useEffect(() => {
  if (!enabled) return
  return sync()
}, [enabled, sync])
```

### 5.2 `useDebouncedSearch` 固定实现

```tsx
type SearchResult<T> = { status: 'idle' | 'loading' | 'success' | 'error'; data: T[] }

function useDebouncedSearch<T>(query: string, delay: number, search: Search<T>) {
  const [result, setResult] = useState<SearchResult<T>>({ status: 'idle', data: [] })

  useEffect(() => {
    if (!query) {
      setResult({ status: 'idle', data: [] })
      return
    }

    const controller = new AbortController()
    let active = true
    const timer = setTimeout(async () => {
      setResult(current => ({ ...current, status: 'loading' }))
      try {
        const data = await search(query, controller.signal)
        if (active) setResult({ status: 'success', data })
      } catch (error) {
        if (active && (error as Error).name !== 'AbortError') {
          setResult({ status: 'error', data: [] })
        }
      }
    }, delay)

    return () => {
      active = false
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, delay, search])

  return result
}
```

输入 `a`，50ms 后输入 `ab`，delay 300ms，初始时刻后 400ms 卸载：`a` 的 timer 在第二次 render 的 cleanup 被取消；`ab` 在 350ms 发出；400ms 卸载时清理剩余副作用。因此“只发出 `ab`”与“卸载后无写入”能够由同一条时序同时验证。

delay 改为 0 时，两个输入各自排入一个 0ms macrotask（宏任务）；测试每次输入后是否推进假时钟，决定 `a` 是否来得及发出。应把推进时钟步骤写进验收脚本。

### 5.3 普通函数何时更好

不读取 Hook、不连接组件生命周期的纯转换应写普通函数，例如 `normalizeQuery()`。自定义 Hook 应表达具体的 React 用例，如 `useDebouncedSearch`，而不是模糊的 `useMount` 或 `useEffectOnce`。

权限判断不应藏进通用搜索 Hook：Hook 可以接收服务端返回的“允许/拒绝”结果，但最终授权必须由服务端依据会话判断。

**custom Hook（自定义 Hook）**复用的是有状态逻辑，不共享同一份 state；每个调用都有独立状态。**contract（契约）**是输入、输出、错误、取消与生命周期的可观察约定。

---

## REACT-06

**主题：Reducer（归约器）、Context（上下文）与跨组件状态**

### 6.1 用单一转换表约束 reducer

| 当前状态 | action | 下一状态 | 合法 |
| --- | --- | --- | --- |
| `draft` | `SUBMIT` | `pending` | 是 |
| `pending` | `APPROVE` | `approved` | 是 |
| `pending` | `REJECT` | `rejected` | 是 |
| `draft` | `APPROVE` | — | 否 |
| `approved/rejected` | 任意审核 action | — | 否，除非产品另定义重开流程 |

```ts
type Status = 'draft' | 'pending' | 'approved' | 'rejected'
type Action = { type: 'SUBMIT' } | { type: 'APPROVE' } | { type: 'REJECT' }

const transitions: Record<Status, Partial<Record<Action['type'], Status>>> = {
  draft: { SUBMIT: 'pending' },
  pending: { APPROVE: 'approved', REJECT: 'rejected' },
  approved: {},
  rejected: {},
}

function reviewReducer(state: Status, action: Action): Status {
  const next = transitions[state][action.type]
  if (!next) throw new Error(`非法跃迁：${state} -> ${action.type}`)
  return next
}
```

reducer（归约器）必须是 pure function（纯函数）：不请求网络、不启动 timer、不修改旧 state。action 描述“发生了什么”，不是“把所有字段随便设成什么”。

### 6.2 Context 要按变化域拆分

```tsx
const ReviewStateContext = createContext<Status | null>(null)
const ReviewDispatchContext = createContext<Dispatch<Action> | null>(null)

function ReviewProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(reviewReducer, 'draft')
  return (
    <ReviewStateContext value={state}>
      <ReviewDispatchContext value={dispatch}>{children}</ReviewDispatchContext>
    </ReviewStateContext>
  )
}
```

`dispatch` 身份稳定，写消费者不必订阅 state。theme 应放到独立 ThemeContext；若把 `{state, dispatch, theme}` 每次新建为一个 value，theme 更新会广播给所有消费者。

### 6.3 Profiler 反证

1. 用 `<Profiler id="ReviewSummary">` 记录初始与 action 更新。
2. 只把 theme 从 light 改为 dark，状态保持不变。
3. 拆分前记录摘要 commit；拆分后同一脚本再测。
4. 通过标准是拆分后的只读审核摘要没有新增 commit，而不是只说“用了 `useMemo`”。

Context（上下文）适合低频、树级依赖注入；external store（外部状态仓库）适合需要选择器、跨树共享或高频细粒度订阅；server cache（服务端数据缓存）负责远端数据的新鲜度、去重和失效。三者不是互相替代的同一种“全局状态”。

---

## REACT-07

**主题：性能测量、memo（记忆化）与大列表**

### 7.1 先定义同一测量条件

固定 10,000 行与 100 行复测都必须记录：

- 浏览器版本、生产构建、CPU 降速倍率、窗口尺寸；
- 完全相同的数据生成种子与筛选输入脚本；
- 三次 React commit 的 `actualDuration`、中位数和离群原因；
- 输入事件到下一帧的交互延迟；
- 网络单独记录，不能算进 React render 时间。

```tsx
function onRender(id: string, phase: string, actualDuration: number,
  baseDuration: number, startTime: number, commitTime: number) {
  samples.push({ id, phase, actualDuration, baseDuration, startTime, commitTime })
}

<Profiler id="Rows" onRender={onRender}><Rows /></Profiler>
```

**median（中位数）**是排序后的中间值，比单次最好成绩更能抵抗偶然抖动。三次仍很少，所以还要解释离群值，不能删除“不好看”的数据。

### 7.2 memo 系列各自做什么

- `memo(Component)`：父组件 render 时，如果每个 prop 经 `Object.is` 比较均相同，可跳过子组件 render；自身 state 或读取的 context 变化仍会 render。
- `useMemo(calculate, deps)`：缓存计算结果，只应用于性能；React 可在某些场景丢弃缓存。
- `useCallback(fn, deps)`：缓存函数身份，等价于返回函数的 `useMemo`；创建函数本身不是性能问题。

```tsx
const visibleRows = useMemo(() => filterRows(rows, query), [rows, query])
const onOpen = useCallback((id: string) => openRow(id), [openRow])
const Row = memo(RowView)
```

若每次都传 `{ row }` 新对象、内联新函数或错误 key，`memo` 可能完全无效。自定义 `arePropsEqual` 还必须比较函数，否则回调可能永久看到旧闭包。

### 7.3 虚拟化的可访问性边界

**virtualization（虚拟化）**只渲染可视窗口附近的行，可降低大列表 DOM 与 render 成本，但会引入：

- 稳定 `row.id` key；
- 滚动后焦点行仍与业务 ID 对应；
- 键盘上下移动能把目标行滚入并聚焦；
- `aria-rowcount` / `aria-rowindex` 等集合语义；
- 屏幕阅读器是否需要非虚拟化替代路径。

删除优化后的反证实验必须保留：同脚本、同环境、三次测量与焦点录像。100 行复测若没有可感知收益，应撤销复杂度；“优化代码已经写了”不是保留理由。

React Compiler 负责自动 memoization（记忆化），但启用与迁移统一在 `REACT-09`。本点仍要求会手工测量和证明瓶颈。

---

## REACT-08

**主题：错误边界、异步 UI 与可恢复体验**

### 8.1 三条错误通路

1. render 中抛出的 Error → 最近的 Error Boundary（错误边界）。
2. render 中读取 pending Promise → 最近的 Suspense fallback（后备 UI）；Promise reject → 错误边界。
3. Effect、事件处理器、普通 `setTimeout` 中抛错 → 不会自动进入错误边界，必须在该通路显式处理并转为可渲染状态。

Error Boundary 目前仍需要 class 组件（或经过验证的封装库）：

```tsx
class ErrorBoundary extends React.Component<Props, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: React.ErrorInfo) { report(error, info) }
  render() { return this.state.error ? this.props.fallback : this.props.children }
}
```

### 8.2 固定资源协议

测试资源要把 Promise 缓存在边界外或按稳定 key 缓存，不能每次 render 新建：

```ts
type Record<T> =
  | { status: 'pending'; promise: Promise<void> }
  | { status: 'success'; value: T }
  | { status: 'error'; error: Error }
  | { status: 'cancelled' }

function read<T>(record: Record<T>): T | null {
  if (record.status === 'pending') throw record.promise
  if (record.status === 'error') throw record.error
  if (record.status === 'cancelled') return null
  return record.value
}
```

`use(promise)` 能直接把 pending/rejected Promise 接入 Suspense / Error Boundary，但客户端 render 中反复创建 Promise 会导致重复挂起。优先使用框架提供的稳定数据源，或自己建立明确缓存键。

### 8.3 局部恢复结构

```tsx
<OrderPageShell>
  <OrderNoteInput defaultValue="note" />
  <ErrorBoundary fallback={<LeftRetry />}>
    <Suspense fallback={<LeftSkeleton />}><LeftPanel /></Suspense>
  </ErrorBoundary>
  <ErrorBoundary fallback={<RightRetry />}>
    <Suspense fallback={<RightSkeleton />}><RightPanel /></Suspense>
  </ErrorBoundary>
</OrderPageShell>
```

输入框放在局部边界之外，左侧渲染异常不能卸载右侧；右侧 500 只显示右侧重试；取消请求返回“已取消/静默结束”，不能伪装为 500。

重试应改变明确的资源 key 或调用缓存 reset，一次用户操作只产生一次新请求：

```tsx
const [attempt, retry] = useReducer(x => x + 1, 0)
const resource = getOrderResource(orderId, attempt)
```

失败注入必须分别保存：render throw、HTTP 500、AbortError、重试成功后的 DOM 与请求次数。若请求写在 Effect 中，必须使用 loading/error state 渲染；不能声称它“自动触发 Suspense”。

### 8.4 状态词汇

- loading（首次加载）：还没有可用内容。
- empty（空结果）：请求成功但集合为空。
- unauthorized / forbidden（未认证 / 无权限）：身份未知与权限不足要区分。
- partial failure（部分失败）：页面的一部分失败，其余仍可使用。
- retry（重试）：重新执行失败操作，必须防止请求无限递增。

TanStack Query 的 Suspense 是特定库集成，不是本知识点的前置要求；需要该库时再进入 DATA 领域核对其当前版本。

---

## REACT-09

**主题：React Compiler（React 编译器）、服务端组件边界与安全升级**

### 9.1 版本事实与阅读边界

截至 2026-08-25，React 官方学习页仍以 19.2 为当前主版本说明；React Compiler 1.0 是稳定发布。版本号本身会变化，实施升级时必须重新查官方发布页与锁文件。

React 19.2 的重点包括：`Activity`、`useEffectEvent`、仅限 RSC 的 `cacheSignal`、Performance Tracks、Partial Pre-rendering（部分预渲染）与 resume API。不要把整篇发布说明全部塞进一个练习；站内 fixture 只验证活动状态、性能轨迹和服务端信任边界。

### 9.2 Compiler 增量启用

```text
兼容性检查 -> 固定精确版本 -> lint -> 小范围 gate -> 构建确认变换
-> 同一交互 Performance Tracks 对照 -> E2E 回归 -> 扩大范围 -> 保留回滚开关
```

Compiler 是 build-time optimizing compiler（构建期优化编译器），依据数据流和可变性做 automatic memoization（自动记忆化）。它不是正确性修复器：若业务依赖错误的手工 memo、Effect 依赖或 render 副作用，改变缓存策略可能暴露潜在 bug。

旧代码不要批量删除 `memo` / `useMemo` / `useCallback`。对每处删除都做行为回归和 Profiler 反证；需要稳定 Effect 依赖时仍可能保留手工 memo。无充分测试覆盖时固定 Compiler 精确版本而不是宽泛 SemVer 范围。

### 9.3 Server Component 不是授权边界

Server Component（服务端组件）描述代码执行位置与序列化边界；Server Function（服务端函数）允许客户端发起服务端调用。客户端可以伪造任何 payload：

```ts
// client 输入：{ role: 'admin', userId: 'u2' }
export async function approve(input: unknown, request: Request) {
  const session = await requireSession(request)
  const command = parseApproveCommand(input) // 只解析资源 ID，不信任 role
  const allowed = await canApprove(session.userId, command.orderId)
  if (!allowed) throw new ForbiddenError()
  return approveOrder(command.orderId, session.userId)
}
```

**authentication（认证）**回答“你是谁”；**authorization（授权）**回答“你能否执行此动作”。两者必须由服务端依据会话和当前资源重新判断。序列化限制也不等于输入可信。

### 9.4 RSC 连续安全公告如何核验

2025-12 的 RSC 远程代码执行公告之后又出现拒绝服务与源码暴露跟进；2026-01-26 官方再次更新并指出先前补丁不完整。受影响核心是实际安装的：

- `react-server-dom-webpack`
- `react-server-dom-parcel`
- `react-server-dom-turbopack`

对应安全基线是 19.0.4、19.1.5、19.2.4。不要把 19.2.1 或 19.2.3 当成最终安全版本。

```powershell
pnpm why react-server-dom-webpack
pnpm why react-server-dom-parcel
pnpm why react-server-dom-turbopack
```

审核必须同时保存：`package.json`、锁文件、`pnpm why` 实际依赖树、生产 bundle/供应链扫描和公告版本对照。顶层 `react@19.2.x` 安全，不能证明传输包没有被框架间接锁在不完整补丁。

### 9.5 固定 fixture 验收

- 1,000 行筛选：Compiler 前后结果一致，Performance Tracks 有同脚本对照。
- 删除依赖不完整的手工 memo：筛选 props 正确更新；若不删除，必须修正比较并有反证。
- `<Activity mode="hidden">`：隐藏时 DOM/Effect 行为与状态保存符合官方语义。
- 伪造 `{role:'admin', userId:'u2'}`：服务端按真实 session 拒绝。
- 锁文件：三种 RSC 传输包若存在，均不在公告受影响版本；若不存在，要以依赖树证明“未安装”，不能写“应该没有”。

**RCE (Remote Code Execution，远程代码执行)**、**DoS (Denial of Service，拒绝服务)**、**source code exposure（源码暴露）**是三类不同风险。CVE 是公开漏洞编号；CVSS 是严重度评分，不代表你的具体应用一定可利用。

---

## REACT-10

**主题：React 路由、数据路由与框架模式**

### 10.1 先选模式再选 API

React Router 当前文档把能力分为三种递增模式：

| 模式 | 核心能力 | 适用情况 | 代价 |
| --- | --- | --- | --- |
| Declarative（声明式） | URL 匹配、Link、导航、active state | 已有独立数据层，只需客户端路由 | loader/action 等要自己实现 |
| Data（数据模式） | loader、action、pending、fetcher、自动重验证 | 想要数据路由但保留构建与服务器控制 | 要维护路由对象与数据约定 |
| Framework（框架模式） | Route Module、类型、智能分包、SPA/SSR/SSG | 新应用或需要完整渲染策略 | 交出更多架构控制 |

模式是能力与控制权选择，不是“越高级越好”。React 官方创建应用页是生态入口，不直接覆盖固定路由挑战；本讲义和 React Router 官方页共同承担题目。

### 10.2 固定示例与路由表

```tsx
const router = createBrowserRouter([
  {
    path: '/products/:productId',
    Component: ProductLayout,
    errorElement: <ProductRouteError />,
    children: [
      {
        path: 'orders/:orderId',
        lazy: () => import('./order-route'),
        loader: orderLoader,
        action: orderAction,
        errorElement: <OrderRouteError />,
      },
    ],
  },
])
```

`/products/7/orders/42` 深链刷新要求服务器把未知前端路径回退到应用入口，或使用框架 SSR；只在客户端配置 route 不能保证部署服务器刷新可用。

参数来自 URL，是 untrusted input（不可信输入）：

```ts
function positiveInt(value: string | undefined, name: string) {
  if (!value || !/^\d+$/.test(value)) throw new Response(`${name} 非法`, { status: 400 })
  return Number(value)
}

export async function orderLoader({ params, request }: LoaderArgs) {
  const productId = positiveInt(params.productId, 'productId')
  const orderId = positiveInt(params.orderId, 'orderId')
  return getOrder({ productId, orderId, signal: request.signal })
}
```

`not-number` 进入最近的局部错误边界；404 只替换订单区域，产品布局和边界外草稿仍保留。

### 10.3 导航竞争与 action 重验证

Data Router 会在新导航出现时取消不再需要的 loader，并把 `request.signal` 传入 loader。底层请求必须真正使用该 signal：

```ts
return fetch(url, { signal: request.signal })
```

A 300ms 后马上导航 B 50ms：B 成功后 A 不得覆盖。保存网络时间线应包含 A aborted，而不是只看最终 DOM。

`action` 处理 mutation（变更）后，路由会 revalidate（重新验证）页面 loader 数据。重复请求可能是预期重验证，也可能是重定向循环或手工 fetch 与自动重验证叠加；先记录 request initiator（请求发起者）再判断。

`<Form>` 提交会导航并写 history；`fetcher.Form` 可提交而不导航。两者都不是服务端授权：未登录 action 必须由服务器拒绝或重定向，客户端隐藏按钮只改善界面。

### 10.4 未保存草稿与局部恢复

导航阻止器只在草稿 dirty 时工作：

```tsx
const blocker = useBlocker(isDirty)
// blocker.state === 'blocked' 时展示确认；取消调用 blocker.reset()
// 确认调用 blocker.proceed()
```

断言：取消导航后地址不变、输入仍为 `draft`；确认后地址改变。浏览器刷新/关闭还需 `beforeunload`，但自定义提示文本通常由浏览器控制。

### 10.5 五步可复核脚本

1. 直接打开并刷新 `/products/7/orders/42`，保存地址、网络和 DOM。
2. 打开 `not-number`，只出现订单局部 400，布局不卸载。
3. 触发 A→B 并发导航，记录 A abort、B 50ms 完成与最终 DOM。
4. 输入 `draft` 后导航，取消并断言地址/输入保持；再确认离开。
5. 未登录直接 POST action，服务端拒绝；登录后提交一次，记录 action 与 loader revalidation。

---

## 11. 超纲导航：只理解边界，不要求在本领域实现

下面这些术语会在官方资料中出现，但超出 `REACT-01` 至 `REACT-10` 的固定首考实现。初级学习者需要知道它们“解决什么、为什么暂不展开”。

### 11.1 Fiber（纤程）与 concurrent rendering（并发渲染）

Fiber 是 React 内部用来表示工作单元的结构；并发渲染让 React 能暂停、继续或放弃 render。学习本领域只需由此推出“render 必须纯粹”，不要求阅读源码、位标记或调度器实现。

### 11.2 Hydration（水合）、streaming SSR（流式服务端渲染）与 PPR

- SSR (Server-Side Rendering，服务端渲染)：服务器先生成 HTML。
- hydration（水合）：浏览器用 React 代码接管已有 HTML 并绑定交互。
- streaming SSR（流式 SSR）：HTML 分段到达，Suspense 边界可逐步呈现。
- PPR (Partial Pre-rendering，部分预渲染)：先生成静态 shell，再恢复动态部分。

这些能力通常由框架集成。站内题只要求理解边界和核验行为，不要求自己实现渲染器或传输协议。

### 11.3 HIR、CFG、Babel、SWC 与 Oxc

- AST (Abstract Syntax Tree，抽象语法树)：源码的结构化树表示。
- CFG (Control Flow Graph，控制流图)：代码可能执行路径组成的图。
- HIR (High-level Intermediate Representation，高层中间表示)：编译器分析和变换使用的中间结构。
- Babel / SWC / Oxc：不同语言实现的 JavaScript/TypeScript 解析与变换工具链。

React Compiler 会把输入 AST 降低到自己的 HIR 并分析数据流。初级学习者只需会配置、确认编译器生效、测量并回滚；不要求写编译器 pass（变换阶段）。

### 11.4 Scheduler（调度器）、lane（优先级通道）与 transition

Scheduler 安排不同优先级工作；lane 是 React 内部表达更新优先级的概念；transition（过渡更新）告诉 React 某次更新不紧急，可以避免已显示内容被 fallback 替换。不要把 transition 当定时器，也不要依赖内部 lane 数值。

### 11.5 Server State（服务端状态）与 BFF

Server State 是由服务器拥有、会过期并需失效/重取的数据；BFF (Backend for Frontend，面向前端的后端) 是为特定前端整合后端能力的服务层。React state、Context 和 reducer 不自动解决缓存一致性、幂等或授权；这些分别在 DATA、BIZ 与安全领域深入。

### 11.6 乐观更新与幂等

optimistic update（乐观更新）是在服务端确认前先显示预期结果；失败时必须回滚或协调。idempotency（幂等性）指同一操作重复执行不会产生额外业务结果。`useOptimistic` 只帮助表达界面状态，不会自动让后端写操作幂等。

---

## 12. 完成检查表

- [ ] 10 个固定 fixture 都有状态模型或时序图。
- [ ] 每题至少一条成功断言、一条失败/取消断言和一条复测断言。
- [ ] 每次排错都保留被证伪候选，未用“经验判断”替代日志。
- [ ] 英文版本页只用于核验事实，核心机制能用中文复述。
- [ ] 能区分 render / commit、Effect / event、状态 / 派生值、Context / 外部 store / server cache。
- [ ] 能区分 Suspense、Error Boundary 与 Effect 请求三条错误通路。
- [ ] 能用真实 session 说明服务端授权，并用实际依赖树核验 RSC 安全版本。
- [ ] 能用同一脚本、同一环境和中位数证明性能优化是否值得保留。
- [ ] 能说明 React Router 三种模式的控制权差异，而不是只背 API。
