# React 知识点讲义

## REACT-04 Effect、外部同步与清理

资料详情从 A 切到 B，标题已经是 B，正文却被迟到的 A 请求改了回去；阅读面板关掉以后，后台计时器还在走。遇到这些问题，先别急着调整依赖数组。真正需要说明的是：这轮工作属于谁，什么时候不再需要它，以及结束后还能不能改界面。

这一篇把 Effect 看成一次可以结束、也可以重新开始的同步过程。我们会用键盘监听、暂停计数、快慢请求和提示格式四个完整页面，观察它到底管理了什么。

### 学习前先确认

- 直接前置：[REACT-03 状态建模、派生状态与受控模式](../chinese-guides/react-03-state-model-derived-controlled.md#react-03)。先能区分源数据、派生值和编辑草稿，再决定哪些变化需要连接外部系统。

示例分别放入 React + TypeScript 项目的 `src/App.tsx`，一次运行一段；最后一段使用 React 19.2 的 useEffectEvent。其余示例只用常规 Hooks。保留开发环境的 Strict Mode，方便观察清理是否完整。请求均在内存中模拟，不访问真实接口。

### 先判断是在计算展示还是连接外部系统

**Effect** 用来让组件与 React 之外的对象保持一致。例如浏览器事件、计时器、网络、媒体播放器和地图实例，它们不会因为 JSX 改变就自行服从新的状态。

可以先把需求写成一句具体的话：

| 需求 | 合适的入口 | 原因 |
| --- | --- | --- |
| 根据关键词显示资料列表 | render 中计算 | 已有数据足以得到结果 |
| 点击确认后保存草稿 | 点击或提交处理器 | 这次操作由用户明确发起 |
| 面板存在时监听快捷键 | Effect | 需要向浏览器登记并撤销监听 |
| 当前资料改变后加载正文 | 数据层，或负责同步的 Effect | 需要与异步数据源协调 |
| 点击后滚动到目录 | 事件处理器 | 不必先存一个 shouldScroll 再监听它 |

筛选结果、总价和错误摘要不需要先存一份 state，再用 Effect 补算。这样做会多出一个需要同步的数据副本；相关例子见 [删除冗余状态](../chinese-guides/react-03-state-model-derived-controlled.md#删除一份冗余数据比补一条同步更直接)。

保存、购买之类的写入也不要靠“组件出现了”来推断用户意图。重新挂载、路由恢复或依赖变化，都可能再次开始同步；它们并不代表用户又确认了一次操作。

### 一次监听对应一份清理函数

下面的面板把方向右键解释为“增加已读数量”。先聚焦面板再按键；输入框里的方向键仍用于移动光标。面板关闭时，监听也应结束。

```tsx example=react04-keyboard runtime=project file=src/App.tsx
import { useEffect, useRef, useState } from 'react';

function ReadingPanel({ step }: { step: number }) {
  const panel = useRef<HTMLElement>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    function onKeydown(event: KeyboardEvent) {
      if (event.target !== panel.current || event.key !== 'ArrowRight') return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      event.preventDefault();
      setCount(value => value + step);
    }
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, [step]);

  return <section ref={panel} tabIndex={0} aria-label="阅读快捷键面板">
    <p>已读数量：{count}</p>
    <p>聚焦此面板后按方向右键，每次增加 {step}。</p>
    <label>临时备注 <input /></label>
  </section>;
}

export default function App() {
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(1);
  return <main>
    <label>每次增加 <select value={step} onChange={e => setStep(Number(e.target.value))}>
      <option value={1}>1</option><option value={3}>3</option>
    </select></label>
    <button onClick={() => setOpen(value => !value)}>{open ? '关闭面板' : '打开面板'}</button>
    {open && <ReadingPanel step={step} />}
  </main>;
}
```

依次做四件事：聚焦面板，按一次右键，数量为 1；把步长改为 3，再聚焦并按一次，数量为 4；在备注输入框里按右键，数量不变；关闭再打开面板，数量重新从 0 开始。最后一次归零来自组件重新挂载，并不是 cleanup 主动清空了 state。

返回的函数叫 **cleanup**。这里它保留本轮 onKeydown 的函数引用，移除的正是本轮监听。分别在 add 和 remove 中创建两个内容相同的箭头函数，会得到两个不同引用，不能互相抵消。DOM 事件移除还要匹配 capture；once、passive 等选项各有自己的作用，不要笼统地把所有配置当成同一规则。

### 依赖变化时先结束旧同步再开始新同步

把上面的例子按时间展开，组件始终存在也会发生清理：

| 时刻 | React 中的变化 | 浏览器中的变化 |
| --- | --- | --- |
| 面板出现，step 为 1 | 提交面板 DOM | 登记读取 step=1 的监听 |
| step 改成 3 | 提交新界面 | 移除旧监听，再登记读取 step=3 的监听 |
| 面板关闭 | 移除面板 DOM | 移除最后一份监听 |

Effect 的每一轮都拥有自己的闭包和清理函数。旧 cleanup 读取旧值，正适合关闭旧资源；不能为了“总是最新”让它改为关闭一个可能已经被替换的共享变量。

这和 [一次渲染的快照](../chinese-guides/react-01-render-purity-state-snapshot.md#快照属于一次渲染而不是整个组件)相连：新渲染不会修改旧函数里的 step，只会产生新的同步安排。

### 依赖数组说明读取关系不能充当运行次数开关

**dependency array** 记录 Effect 使用的响应式值。React 用 Object.is 逐项比较，它不是“想什么时候执行就填什么”的调度器。

上例读取 step，因此依赖包含 step；setCount 是 React 保证稳定的 setter，函数式更新又不读取本轮 count，所以不必为了累计而依赖 count。ref 对象身份稳定，ref.current 的变化本身不会触发渲染，也不是订阅来源。

三种写法的含义不同：省略数组，每次提交后重新同步；空数组，没有需要随渲染变化而重新同步的依赖；列出依赖，在对应值变化后重新同步。空数组不承诺进程里永远只执行一次，卸载后再次挂载仍是新实例。

对象和函数也按身份比较。如果在组件内每次创建 options，再把整个 options 当依赖，普通重渲染就可能重启连接。先把对象创建移入 Effect，只依赖 roomId 等实际输入；无须读取组件值的常量可以移到模块外。不要先删依赖或叠加 useMemo 来掩盖问题。

### 暂停计时需要保留状态并停止外部计时器

“暂停”应停止后续跳动，并保留当前读数；它和销毁整个组件不同。这个例子按触发次数计数，不把计时器当成精确时钟。

```tsx example=react04-timer runtime=project file=src/App.tsx
import { useEffect, useState } from 'react';

export default function App() {
  const [running, setRunning] = useState(false);
  const [ticks, setTicks] = useState(0);
  const [delay, setDelay] = useState(300);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setTicks(value => value + 1), delay);
    return () => window.clearInterval(timer);
  }, [running, delay]);

  return <main>
    <p>触发次数：{ticks}</p>
    <button onClick={() => setRunning(value => !value)}>{running ? '暂停' : '开始'}</button>
    <button onClick={() => setTicks(0)}>清零</button>
    <label>间隔 <select value={delay} onChange={e => setDelay(Number(e.target.value))}>
      <option value={300}>300 毫秒</option><option value={800}>800 毫秒</option>
    </select></label>
  </main>;
}
```

开始后读数增长；暂停后读数停住；再次开始继续累计。切换间隔会结束旧 interval，并从切换时刻按新间隔计时，不保留旧周期已经经过的部分。清零只是更新读数，未改变 running 和 delay，因此不会重新启动 interval。

这类具体约定比“已经 clearInterval”更完整。倒计时若要求接近真实截止时间，应保存截止时间并重新计算剩余量；后台标签节流、系统休眠和页面隐藏会改变回调频率。清理句柄只解决资源是否继续存在，不解决时间如何定义。

### 请求能否取消和结果能否提交是两个问题

A 加载慢，B 加载快。用户先选 A，再选 B，即使 A 最后完成，也不应该覆盖 B。下面用一个可选择“不理会取消”的模拟服务，把这两层责任拆开观察。

```tsx example=react04-request runtime=project file=src/App.tsx
import { useEffect, useState } from 'react';

type LoadState =
  | { kind: 'pending'; id: string }
  | { kind: 'ready'; id: string; text: string }
  | { kind: 'error'; id: string; message: string };

function loadLesson(id: string, attempt: number, signal: AbortSignal, ignoreAbort: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!ignoreAbort && signal.aborted) { reject(signal.reason); return; }
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', abort);
      if (id === '故障示例' && attempt === 0) reject(new Error('模拟第一次读取失败'));
      else resolve(`${id} 的正文`);
    }, id === 'A' ? 700 : 150);
    function abort() {
      window.clearTimeout(timer);
      reject(signal.reason);
    }
    if (!ignoreAbort) signal.addEventListener('abort', abort, { once: true });
  });
}

export default function App() {
  const [id, setId] = useState('A');
  const [attempt, setAttempt] = useState(0);
  const [ignoreAbort, setIgnoreAbort] = useState(false);
  const [state, setState] = useState<LoadState>({ kind: 'pending', id: 'A' });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setState({ kind: 'pending', id });
    async function run() {
      try {
        const text = await loadLesson(id, attempt, controller.signal, ignoreAbort);
        if (active) setState({ kind: 'ready', id, text });
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        setState({ kind: 'error', id, message: error instanceof Error ? error.message : '读取失败' });
      }
    }
    void run();
    return () => {
      active = false;
      controller.abort(new DOMException('这一轮读取已结束', 'AbortError'));
    };
  }, [id, attempt, ignoreAbort]);

  function choose(next: string) { setId(next); setAttempt(0); }
  const view: LoadState = state.id === id ? state : { kind: 'pending', id };
  return <main>
    <nav aria-label="切换资料">
      {['A', 'B', '故障示例'].map(name => <button key={name} onClick={() => choose(name)}>{name}</button>)}
    </nav>
    <label><input type="checkbox" checked={ignoreAbort} onChange={e => setIgnoreAbort(e.target.checked)} />
      模拟服务不支持取消</label>
    <h1>当前资料：{id}</h1>
    {view.kind === 'pending' && <p role="status">正在读取 {id}</p>}
    {view.kind === 'ready' && <p>{view.text}</p>}
    {view.kind === 'error' && <p role="alert">{view.message}</p>}
    <button onClick={() => setAttempt(value => value + 1)}>重新读取</button>
  </main>;
}
```

勾选“不支持取消”，切到 A，紧接着切到 B。B 很快出现，等 A 的 700 毫秒也过去，正文仍是 B。取消没有停止旧计算，但旧轮次的 active 已变成 false。再选择故障示例，先看到失败；点击重新读取，模拟服务第二次成功。这里成功来自模拟规则，现实中的重试仍可能失败。

**AbortController** 向协作方发出取消信号，active 则控制本轮结果是否还有提交资格。cleanup 先撤销资格，再发取消信号；卸载也会经过同一条路径。active 是本次 setup 的局部变量，新请求不能把旧请求的变量重新设为 true。

state 同时保存数据所属的 id，渲染时核对它与当前 id 是否一致。这避免在新 Effect 尚未执行的阶段，把 A 的正文放在 B 的标题下。是否保留“同一资料刷新前的旧数据”，可以另作状态设计；跨资料误贴标签则应避免。

### 异步工作的异常和收尾都需要主人

Effect 的 setup 不能直接写成 async 函数，因为返回的 Promise 不是 React 要接收的清理函数。上例在内部启动 run，并同步返回 cleanup；run 自己捕获请求错误。`void run()` 只表示调用方不等待，它不会自动吞掉拒绝。

异步完成后的每条路径都要服从失效规则，包括成功、失败和 finally。如果旧请求在 finally 无条件执行“关闭 loading”，它仍可能把新请求的等待状态关掉。若用判别联合一次提交状态，可以少一个需要协调的布尔值。

清理也不是一个 React 会等待完成的异步事务。资源需要异步关闭时，应先让旧回调失效，再启动有错误处理的关闭过程。发过的写请求不会因为 abort 自动回滚；服务端版本、幂等和结果未知的处理属于写入协议，见 [取消与远端结果](../chinese-guides/js-05-promise-errors-async-control-flow.md#js-05)。

### Strict Mode 帮你发现开始和结束不对称

开发时，在相应 Strict Mode 检查范围内，初次挂载可能出现额外的“建立 → 清理 → 建立”。不要把这概括成“用户点一次，业务必须执行两次”。它是在检查资源是否能完整释放和重新建立。

键盘例子无论经过几轮建立，按一次键都应只增加一步；计时例子不应留下两个 interval。网络读取可能已到达远端，清理不能假装它没发生，所以不应把购买等不可重复动作放在挂载 Effect 里。

用 hasRun ref 跳过第二轮，可能得到“第一轮连接已经关闭，第二轮又不允许建立”的坏状态。更可靠的目标是：每次建立只管理本次资源，每次清理准确结束它。

### Effect Event 读取最新提示格式但不重启同步

有时外部订阅的身份没变，只是展示提示的方式变了。下面订阅一个定时“资料更新”通知；切换详细提示，不应该重新从第 1 条通知开始。

```tsx example=react04-effect-event runtime=project file=src/App.tsx
import { useEffect, useEffectEvent, useState } from 'react';

export default function App() {
  const [topic, setTopic] = useState('React');
  const [detailed, setDetailed] = useState(false);
  const [message, setMessage] = useState('等待通知');
  const onNotice = useEffectEvent((source: string, sequence: number) => {
    setMessage(detailed ? `${source}：本轮第 ${sequence} 条资料更新` : `${source} #${sequence}`);
  });

  useEffect(() => {
    let sequence = 0;
    const timer = window.setInterval(() => onNotice(topic, ++sequence), 400);
    return () => window.clearInterval(timer);
  }, [topic]);

  return <main>
    <label>订阅主题 <select value={topic} onChange={e => setTopic(e.target.value)}>
      <option>React</option><option>Vue</option>
    </select></label>
    <label><input type="checkbox" checked={detailed} onChange={e => setDetailed(e.target.checked)} />详细提示</label>
    <p role="status">{message}</p>
  </main>;
}
```

看到 React #2 后切换详细提示，下一条继续用后续序号，并读取当前提示格式；切换主题后，新订阅从第 1 条开始。已有通知不会因格式改变而被改写，下一条通知才使用新格式。

**Effect Event** 适用于由 Effect 建立的过程触发、但需要读取最新已提交值的逻辑。它不放进依赖数组，也不能作为普通点击处理器、传给子组件或别的 Hook。它的函数身份不保证稳定，不能用它替代 useCallback。

topic 决定订阅身份，仍是依赖；detailed 只影响通知发生时的表达。如果主题变了却故意藏进 Effect Event，仍会订阅错误主题。旧版 React 没有这个 API 时，可以接受相关值变化后重建同步，或按已经验证的适配方式处理；不要在 render 中随意改 ref 来伪造“最新值”。

### 布局读取需要单独说明与绘制的关系

普通 useEffect 不能承诺永远在绘制之后执行；交互触发等情况会影响调度。若必须在用户看到首帧之前读取尺寸并修正布局，useLayoutEffect 才提供相应的阻塞绘制时机。

例如浮层先渲染，测出高度，再决定放在按钮上方还是下方。这里确有布局读取；如果只是让卡片居中，CSS 往往已经足够。useLayoutEffect 中大量测量和写入会拖慢绘制，字体变化、桌面缩放和容器大小变化也要考虑。

外部编辑器或图表要明确 DOM 所有权：React 提供容器，外部库管理容器内部；创建与销毁实例和更新实例参数可以分开处理。不要让 React 与库同时改写同一批子节点。

### 按同步对象划分职责再考虑复用

标题、键盘和实时连接没有共同的重建条件，就不必挤在一个 Effect 里。否则标题变化可能连带重连。反过来，必须一起建立和释放的同一资源，应保留明确的协调入口，不能依赖两个 Effect 在文件中的先后顺序来碰运气。

共享外部 store 时，多个消费者需要一致的读取与订阅规则，下一篇会用 [useSyncExternalStore](../chinese-guides/react-05-hooks-rules-custom-hooks.md#共享外部数据需要稳定快照和订阅入口)说明。已有路由或查询层提供缓存、去重和服务端取数时，优先使用它的能力；本篇的手写请求用于看清责任，并不等于建议每个页面重造数据层。

### 页面离开浏览器暂停与错误恢复各有边界

Effect 只在客户端运行。服务端渲染没有浏览器布局，初始 JSX 仍应能成立；不要在模块顶层读取 window 或创建用户连接。

页面隐藏、网络状态变化、BFCache 恢复和组件卸载是不同事件。轮询是否暂停、恢复时是否立即重取、断线如何退避，需要单独约定。navigator.onLine 只能提供网络状态线索，不能证明某个接口可访问。

普通定时器或订阅回调中的错误也不会自动成为 React 错误边界的渲染错误。能恢复的读取失败转成局部状态，未知问题交给监控；日志记录资源身份和操作，不记录密钥。学习时重点观察当前有效资源、旧结果是否被拒绝、失败后能否继续操作，比数 Effect 调用了几次更有意义。

### 参考与延伸阅读

- [React：Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects)：理解同步与用户事件的区别。
- [React：useEffect](https://react.dev/reference/react/useEffect)：查依赖比较、清理顺序和客户端执行边界。
- [React：Lifecycle of Reactive Effects](https://react.dev/learn/lifecycle-of-reactive-effects)：按开始与停止理解每轮同步。
- [React：Removing Effect Dependencies](https://react.dev/learn/removing-effect-dependencies)：调整代码的真实依赖，而不是压制检查。
- [React：useEffectEvent](https://react.dev/reference/react/useEffectEvent)：查 React 19.2 的调用限制和最新值语义。
- [React：useLayoutEffect](https://react.dev/reference/react/useLayoutEffect)：查布局读取与绘制的关系。
- [MDN：AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)：查取消信号及其使用方式。
