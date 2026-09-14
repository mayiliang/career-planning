# React 知识点讲义

## REACT-08 错误边界、异步 UI 与可恢复体验

报告区域出错时，旁边写到一半的笔记是否还能保留？点击重试后，究竟重新做了什么？页面正在切换时，旧内容能否继续显示？这些问题比“加一个 loading 和 error”更接近用户真正需要的恢复体验。

本篇把渲染失败、异步等待、事件结果和导航过渡分开，再用完整页面把它们连接起来。读者可以主动制造失败、交付结果并重试，不需要等待偶发故障。

### 学习前先确认

- 直接前置：[REACT-06 Reducer、Context 与跨组件状态](../chinese-guides/react-06-reducer-context-state-domains.md#react-06)。先明确区域的状态所有者和需要保留的任务，再选择错误边界的位置。

示例使用 React 19 的 use 与常规 Error Boundary、Suspense API。每个 App.tsx 独立运行，后续小节复用本篇给出的辅助文件。所有故障与资源均为本地演示，不执行真实保存。

### 先看错误发生在哪个执行阶段

**Error Boundary** 负责隔离后代组件无法正常渲染的错误，**Suspense** 负责等待支持它的内容准备好。它们不是两种不同颜色的通用提示框。

| 发生的情况 | 通常怎样处理 |
| --- | --- |
| 后代渲染时抛错 | 最近的错误边界显示替代界面 |
| React 执行后代 Effect 的同步 setup 时抛错 | 可交给错误边界 |
| 普通事件中请求失败、定时器或 Promise 回调抛错 | 由对应异步过程捕获，更新局部状态或报告 |
| use 读取尚未完成的 Promise | 最近 Suspense 处理等待 |
| use 读取已拒绝的 Promise | 拒绝原因进入最近错误边界 |
| 表单值不合法、业务冲突 | 优先用明确的字段或操作结果表达 |

不要笼统地说“Effect 的错误一概抓不到”。同步 setup 是 React 调用的执行路径；它之后另行启动的普通异步回调，则不自动沿同一条错误通路返回。现代 React 的 transition action 也有自己的错误处理语义，不能把普通异步代码的规则随意推广。

### 一个简单边界保护一块可以独立恢复的区域

先创建 `src/ReadingBoundary.tsx`，后续相关例子都保留这个文件：

```tsx example=react08-boundary runtime=project file=src/ReadingBoundary.tsx
import { Component, type ReactNode } from 'react';
type Props = { children: ReactNode; onRetry: () => void };
export default class ReadingBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <section aria-label="阅读恢复区域">
      <p role="alert">这部分内容暂时无法显示，其他区域仍可使用。</p>
      <button onClick={this.props.onRetry}>重新读取本区域</button>
    </section>;
    return this.props.children;
  }
}
```

类组件的 getDerivedStateFromError 切换渲染结果；需要诊断时，可以在 componentDidCatch 对接已有报告入口，记录错误身份、组件栈与发布版本。示例不把堆栈显示给用户，也不依赖尚未定义的报告函数。

边界不能捕获自身 fallback 再次抛出的错误，也不直接处理服务端渲染失败；如果 fallback 又读取相同的坏资源，就可能继续向外层失败。替代界面应尽量少依赖、保留合理的下一步动作。

### 对比渲染错误同步 Effect 错误与事件失败

把下面作为 `src/App.tsx`：

```tsx example=react08-capture-app runtime=project file=src/App.tsx
import { useEffect, useRef, useState } from 'react';
import ReadingBoundary from './ReadingBoundary';
type Mode = 'ok' | 'render' | 'effect';
function Report({ mode, focusOnMount }: { mode: Mode; focusOnMount: boolean }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (mode === 'effect') throw new Error('模拟 Effect 同步 setup 失败');
    if (focusOnMount) heading.current?.focus();
  }, [mode, focusOnMount]);
  async function submit() {
    try { await Promise.reject(new Error('模拟提交失败，内容仍可阅读')); }
    catch (error) { setMessage(error instanceof Error ? error.message : '提交失败'); }
  }
  if (mode === 'render') throw new Error('模拟报告渲染失败');
  return <section>
    <h2 ref={heading} tabIndex={-1}>阅读报告</h2><p>报告内容可用。</p>
    <button onClick={submit}>模拟提交失败</button>
    {message && <p role="alert">{message}</p>}
  </section>;
}
export default function App() {
  const [mode, setMode] = useState<Mode>('ok');
  const [attempt, setAttempt] = useState(0);
  const [draft, setDraft] = useState('');
  function retry() { setMode('ok'); setAttempt(value => value + 1); }
  return <main>
    <label>区域外的笔记 <textarea value={draft} onChange={e => setDraft(e.target.value)} /></label>
    <button onClick={() => setMode('render')}>制造渲染错误</button>
    <button onClick={() => setMode('effect')}>制造 Effect 错误</button>
    <ReadingBoundary key={attempt} onRetry={retry}>
      <Report mode={mode} focusOnMount={attempt > 0} />
    </ReadingBoundary>
  </main>;
}
```

先写笔记，再制造渲染错误。只有报告区域被替换，笔记保留；点击重新读取，恢复正常内容并聚焦报告标题。再制造 Effect 错误，同样进入边界。正常报告里的模拟提交失败只显示操作错误，报告不会消失。

这里的恢复做了两件事：把故障条件改回 ok，并通过新 key 重建边界。如果只重置边界，却保留 mode='render'，它会立刻再次失败。边界里的局部状态也会随重建丢失；需要保留的笔记因此放在边界之外。

异常出现时使用 alert 通知，并不自动抢走区域外正在编辑的焦点；用户主动重试后，再把焦点交给恢复的内容。边界的位置应对应“这项任务失败后，用户还能做什么”。

### Suspense 等待的是支持它的读取

普通 useEffect 中发请求，然后 setState，不会因为外面包着 Suspense 就自动出现 fallback。Suspense 不扫描页面里所有 Promise，也不负责启动和取消所有异步工作。

它响应支持 Suspense 的读取，例如 React.lazy 的代码加载、框架集成的数据读取，以及 use(promise)。等待中的资源会让对应子树暂停，React 在资源状态改变后重新尝试渲染。

第一次挂载就暂停的组件，尚未建立可依赖的本地状态。不能把“正在等待的 Promise 必须稳定”寄托在一个还没成功挂载的子组件初始化里。资源应由已存在的拥有者、框架缓存或明确的外部入口创建。

### 手动交付结果让 Promise 的三种状态清楚可见

创建 `src/readingTask.ts`。它只是本地演示控制器，用按钮决定何时完成，没有网络或缓存功能。

```ts example=react08-task runtime=project file=src/readingTask.ts
export function createReadingTask() {
  let resolveTask: (text: string) => void = () => {};
  let rejectTask: (error: Error) => void = () => {};
  const promise = new Promise<string>((resolve, reject) => {
    resolveTask = resolve;
    rejectTask = reject;
  });
  // 即使演示者很快交付失败，也让这份原始 Promise 有拒绝观察者。
  void promise.catch(() => undefined);
  return { promise, resolve: resolveTask, reject: rejectTask };
}
```

再使用 `src/App.tsx`，并保留 ReadingBoundary.tsx：

```tsx example=react08-resource-app runtime=project file=src/App.tsx
import { Suspense, use, useState } from 'react';
import ReadingBoundary from './ReadingBoundary';
import { createReadingTask } from './readingTask';
type Task = ReturnType<typeof createReadingTask>;
function Reading({ promise }: { promise: Promise<string> }) { return <p>正文：{use(promise)}</p>; }
export default function App() {
  const [task, setTask] = useState<Task | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [draft, setDraft] = useState('');
  function start() { setTask(createReadingTask()); setAttempt(value => value + 1); }
  return <main>
    <label>阅读笔记 <input value={draft} onChange={e => setDraft(e.target.value)} /></label>
    <button onClick={start}>{task ? '开始新一轮读取' : '开始读取'}</button>
    <button disabled={!task} onClick={() => task?.resolve('组件恢复机制')}>交付正文</button>
    <button disabled={!task} onClick={() => task?.reject(new Error('模拟读取失败'))}>交付失败</button>
    <button disabled={!task} onClick={() => setAttempt(value => value + 1)}>只重置边界</button>
    {task && <ReadingBoundary key={attempt} onRetry={start}>
      <Suspense fallback={<p role="status">正文还没有准备好</p>}>
        <Reading promise={task.promise} />
      </Suspense>
    </ReadingBoundary>}
  </main>;
}
```

开始读取后显示等待；交付正文后显示内容；再开始一轮并交付失败，进入错误边界。这对应 **pending**、fulfilled 和 rejected 三种结果。

辅助控制器给原始 Promise 添加了观察者，但传给 use 的仍是原始 Promise，因此失败不会被偷偷转换成成功。use 在组件中读取它的结果，而不是通过 Effect 复制到另一份 state。

### 只清错误标记不一定真的重新读取

失败后点“只重置边界”，仍会再次失败，因为 task.promise 仍是同一个已拒绝的资源。点“重新读取本区域”才创建新 Promise，再交付正文即可恢复。已经敲定的 Promise 不能被后来的 resolve 改成另一种结果。

**retry** 要针对失败原因采取行动：新建读取、使缓存失效、重新装配损坏组件，或提示用户改变输入。单纯把 error 清空只改变了展示条件。

生产缓存的 key 应包含影响内容的资料身份、参数及必要的账号范围；同一 key 等待期间需要稳定资源，失败后也有明确失效入口。缓存容量、过期和 SSR 每请求隔离不是这个演示控制器提供的能力。真实项目优先采用框架或已经验证的数据层，不自行拼一个永久全局 Promise Map。

### use 有自己的规则不能套用到所有 Hook

use 可以在某些条件与循环中读取资源，但仍需在 React 组件或 Hook 中调用，并且不能用普通 try/catch 包住它来截获暂停过程。希望处理拒绝时，使用最近错误边界，或在创建资源时明确转换失败结果。

Promise 应在当前渲染之外已经具有稳定身份。每次 render 都调用一个返回新 Promise 的读取函数，可能反复暂停、触发未缓存 Promise 提示或造成重复工作；并不是加一个 use 就拥有了缓存。

读取 Context 时的 use 与 useContext 也不要和异步数据架构混为一谈。先说明资源来自哪里，再选择读取 API。

### Transition 可以让已可用的内容暂时保留

**transition** 表示这次更新可以在准备好后再揭示。它不会加快请求，也不会自动取消旧任务。下面的 A 已经可读，切到 B 时保留 A，直到手动交付 B。

继续使用 readingTask.ts，把 App.tsx 改为：

```tsx example=react08-transition-app runtime=project file=src/App.tsx
import { Suspense, use, useState, useTransition } from 'react';
import { createReadingTask } from './readingTask';
const initialPromise = Promise.resolve('A 的正文');
type Resource = { id: string; promise: Promise<string> };
function Reading({ resource }: { resource: Resource }) {
  const text = use(resource.promise);
  return <section><h2>当前资料：{resource.id}</h2><p>{text}</p></section>;
}
export default function App() {
  const [resource, setResource] = useState<Resource>({ id: 'A', promise: initialPromise });
  const [task, setTask] = useState<ReturnType<typeof createReadingTask> | null>(null);
  const [pending, startTransition] = useTransition();
  function chooseB() {
    const next = createReadingTask();
    setTask(next);
    startTransition(() => setResource({ id: 'B', promise: next.promise }));
  }
  return <main>
    <button disabled={pending} onClick={chooseB}>切换到 B</button>
    <button disabled={!pending} onClick={() => task?.resolve('B 的正文')}>交付 B 的正文</button>
    <p role="status">{pending ? '正在切换，下面仍是原来的资料' : '当前内容已就绪'}</p>
    <Suspense fallback={<p>首次准备内容</p>}><Reading resource={resource} /></Suspense>
  </main>;
}
```

先等 A 出现，再切换 B。等待时标题仍是 A，也明确说明正在切换；交付以后，标题与正文一起变成 B。这里是只读内容，没有把 B 的标题提前贴到 A 的正文上。

如果是账号或租户切换，旧内容可能已不适合继续展示，就应立即隔离，而不是为减少闪烁继续保留。文本输入的即时反馈也不应直接靠 transition 延后；它适合非紧急的揭示过程。

现代 React 可以处理 transition action 中的某些错误，但异步等待之后的状态更新、多个并发写入的顺序仍有具体规则。不要据此认为任意 Promise 回调都会自动进入边界；本例只在同步 transition 回调里提交资源切换。

### lazy 管的是代码资源而不是业务数据

创建 `src/LazyReport.tsx`：

```tsx example=react08-lazy-report runtime=project file=src/LazyReport.tsx
export default function LazyReport() { return <section><h2>按需报告</h2><p>组件代码已经加载。</p></section>; }
```

独立的 `src/App.tsx`：

```tsx example=react08-lazy-app runtime=project file=src/App.tsx
import { lazy, Suspense, useState } from 'react';
const Report = lazy(async () => {
  await new Promise<void>(resolve => window.setTimeout(resolve, 350));
  return import('./LazyReport');
});
export default function App() {
  const [open, setOpen] = useState(false);
  return <main>
    <button onClick={() => setOpen(value => !value)}>{open ? '关闭报告' : '打开报告'}</button>
    {open && <Suspense fallback={<p role="status">正在加载报告代码</p>}><Report /></Suspense>}
  </main>;
}
```

第一次打开能看到人工延迟的等待；关闭后再打开，同一个 lazy 类型可以复用已经成功加载的代码。lazy 定义在组件外，避免每次 render 创建一个新组件类型。

导入拒绝会交给最近错误边界，但失败的 lazy 资源也可能被缓存。仅重建边界不能保证重新调用同一 loader；真正恢复要由框架的加载策略或明确的新资源身份负责。旧页面引用已删除分块时，应通过保留多版本静态资源、合适的发布方式或有保护的刷新恢复，而不是无限 reload。

### 等待失败和取消要提供不同的下一步

等待界面告诉用户还没准备好，失败界面说明哪部分不能继续，取消则表示这轮工作不再需要。把它们都显示成“系统错误，请重试”，会让正常导航也显得像故障。

表单字段不合法，应保留输入并指出具体字段；资源被删除，可以提供返回列表；临时读取失败可以局部重试；写入超时可能结果未知，需要查询确认或使用幂等协议，不能盲目再次提交。

局部错误状态与错误边界可以共存。能正常渲染的业务结果不一定要 throw；无法继续渲染的程序缺陷也不应 catch 后悄悄返回空白。

### 边界层级影响草稿布局和提示数量

一块任务能独立恢复，就可以有自己的边界；把每个小图标都包起来，会让页面充满零散提示。所有区域共用一个根边界，又可能因侧栏错误清掉整页编辑器。

fallback 尽量接近最终区域尺寸，避免大幅布局跳动，但不要用假的可点击控件装饰骨架。已有内容保留时，说明它仍属于哪个对象、是否正在更新，并限制可能写错对象的动作。

嵌套边界不要每层都播报同一错误。优先让最近能恢复的区域接管，必要时向上交还；日志使用错误、请求和发布身份去重。用户可见文案保持具体，不展示内部路径或完整异常堆栈。

### 服务端流式渲染与客户端恢复有不同责任

客户端 Error Boundary 不是服务端错误处理的替代品。流式 SSR 可以结合 Suspense 输出 fallback，客户端 hydration 还可能经历代码下载失败、版本不一致或非确定性渲染；这些路径由渲染框架和服务端共同处理。

状态与资源缓存需要按请求隔离，不把用户数据放进跨请求单例。服务端错误信息也不应完整序列化到浏览器。实际数据路由如何把 loader/action 错误交到对应区域，见 [REACT-10](../chinese-guides/react-10-router-data-framework-modes.md#react-10)。

本篇的四个场景分别回答：哪类错误进入边界，等待资源何时改变状态，重试是否换了失败资源，以及旧内容何时可以继续显示。先把这些关系讲清楚，再增加框架特有的能力。

### 参考与延伸阅读

- [React：Component 与错误边界](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)：查捕获范围、替代界面及日志入口。
- [React：Suspense](https://react.dev/reference/react/Suspense)：查受支持的数据源、等待与再次揭示。
- [React：use](https://react.dev/reference/react/use)：查 Promise 状态和调用限制。
- [React：useTransition](https://react.dev/reference/react/useTransition)：查过渡更新、错误及异步限制。
- [React：lazy](https://react.dev/reference/react/lazy)：查模块加载、缓存和组件类型身份。
- [React：renderToPipeableStream](https://react.dev/reference/react-dom/server/renderToPipeableStream)：查流式 SSR 与错误处理的不同阶段。
