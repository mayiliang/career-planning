# React 知识点讲义

## REACT-01 渲染、组件纯度与 state snapshot

按钮里连续调用三次 `setCount(count + 1)`，为什么屏幕只加一？点击“稍后发送”以后继续编辑，为什么回调看到的还是点击时的文字？组件日志出现两次，用户是不是就看到了两次更新？

这些问题可以放在同一条线上理解：React 调用组件，得到这一轮界面的描述；事件处理器属于这一轮渲染；setter 请求后续更新，不会回头改写已经执行到一半的函数。本篇先用小组件看到现象，再解释快照、队列、纯度和组件身份。

### 学习前先确认

- 直接前置：[TS-03 泛型、约束、keyof 与索引访问](../chinese-guides/ts-03-generics-constraints-keyof-indexed-access.md#ts-03)、[WEB-01 HTML 语义、表单与可访问性基础](../chinese-guides/web-01-html-semantics-forms-accessibility.md#web-01)、[JS-06 ES Modules 与模块边界](../chinese-guides/js-06-es-modules-module-boundaries.md#js-06)。分别补足类型、页面语义和模块导入。

下面每个 TSX 示例都是独立的默认导出组件，放入已有 React + TypeScript 项目的 `App.tsx` 即可观察；一次只使用一个。也可以使用 React 在线演练环境并选择 TypeScript。本文使用函数组件和现代 `createRoot` 应用，不依赖实验性 API。

### 组件先返回一份界面描述

先看一个没有状态的组件。它收到资料标题和用时，然后返回一张卡片：

```tsx example=react01-description
type LessonCardProps = { title: string; minutes: number };
function LessonCard({ title, minutes }: LessonCardProps) {
  return (
    <article>
      <h2>{title}</h2>
      <p>预计用时：{minutes} 分钟</p>
    </article>
  );
}
export default function App() {
  return (
    <main>
      <h1>今天的资料</h1>
      <LessonCard title="HTML 表单" minutes={25} />
      <LessonCard title="状态快照" minutes={30} />
    </main>
  );
}
```

页面会出现两张内容不同的卡片。`title`、`minutes` 是父组件提供的 **props**；大括号中的表达式在本次组件调用时求值。组件名首字母大写，让 JSX 能区分 `LessonCard` 与原生 `article`。

**JSX** 是描述界面的语法，需要转换后才能执行。它生成 React 元素描述，不是已经插入页面的 DOM。返回 `<LessonCard />` 是把组件交给 React 安排调用，也不等同于业务代码随意执行 `LessonCard(...)`。

`props` 是只读输入。一个值如果由父层拥有，本组件应通过回调请求父层修改，而不是直接改 props。真正需要随交互记住的信息，才放进 **state**。比如“搜索词”需要记住，“搜索后的数量”则可以由数据和搜索词算出来。

### 一次更新分成触发计算和提交

以下顺序有助于区分“函数执行了”与“屏幕改变了”：

```text
用户点击 → setter 请求更新
        → React 调用组件，计算下一份 UI 描述（render）
        → React 把需要的变化应用到 DOM（commit）
        → 浏览器安排样式、布局与绘制
```

**render** 在这里指 React 计算界面，**commit** 指提交所需的 DOM 变化。首次挂载也会开始这条流程；父组件更新、组件使用的 context 变化等，也可能让组件重新计算。

假设父组件更新了计数，但子组件仍返回同一段标题。子组件可能被再次调用，标题 DOM 却不必修改。渲染次数不是 DOM 修改次数，更不能直接当作浏览器绘制次数。

React 可以比较新旧描述，决定保留哪个节点、修改哪些属性。这个匹配过程通常称为 reconciliation。初学时不必背内部算法，先抓住结果：重新运行组件不意味着先清空整页再画一遍，输入框和组件状态可以在正确身份下被保留。

DOM 尺寸依赖实际提交后的节点，不能在 render 中假定新的布局已经存在。布局 Effect 与普通 Effect 有不同调度时机，普通 Effect 也不能简单理解为“永远在绘制之后”。这一篇只建立阶段边界，完整外部同步留给后续 Effect 资料。

与 [JS-04 的浏览器绘制时机](../chinese-guides/js-04-async-promise-browser-event-loop.md#微任务执行完不等于浏览器已经绘制)对照，就能明白：框架完成一项工作，与用户看到像素更新，中间还隔着浏览器自己的安排。

### 三次加一先看它们实际提交了什么

运行这个组件，先点“按当前值加三次”，再重置，再点“依次加三次”：

```tsx example=react01-counter
import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);
  function replaceThreeTimes() {
    setCount(count + 1);
    setCount(count + 1);
    setCount(count + 1);
    console.log('当前处理器读取到', count);
  }
  function incrementThreeTimes() {
    setCount(previous => previous + 1);
    setCount(previous => previous + 1);
    setCount(previous => previous + 1);
  }
  return (
    <main>
      <h1>更新队列</h1>
      <p>计数：<output>{count}</output></p>
      <button type="button" onClick={replaceThreeTimes}>按当前值加三次</button>
      <button type="button" onClick={incrementThreeTimes}>依次加三次</button>
      <button type="button" onClick={() => setCount(0)}>重置</button>
    </main>
  );
}
```

从零开始，第一种结果是 1，控制台输出的当前值还是 0；第二种结果是 3。这里没有丢掉三次点击，因为你只点击了一次，处理器里有三条更新请求。

先代入实际数字。第一次渲染给出的 `count` 是 0，所以前三行分别相当于“下次换成 1”“下次换成 1”“下次换成 1”。React 并没有收到“依次加一”的函数，只收到了三个相同的替换值。

后一种写法传入更新函数。React 处理队列时，把上一步结果交给下一步，因此依次得到 1、2、3。`previous` 是队列传入的值，不是你手动从某个全局变量读取的“最新 count”。

`useState` 是一个 Hook，要在组件顶层按稳定顺序调用，不放进条件、循环或事件处理器。初始值 0 用于这份组件状态的初始化，组件以后重新运行并不会每次都把状态重新设为零。

### 快照属于一次渲染而不是整个组件

**状态快照（state snapshot）**可以理解为“这一轮组件拿到的状态值”。setter 不会修改当前函数作用域里的 `count`，而是让 React 在后续渲染中提供新的值。

| 时刻 | 当前函数里的 count | 发出的请求 | 接下来会看到什么 |
| --- | --- | --- | --- |
| 初次渲染 | 0 | 无 | 按钮绑定这一轮处理器 |
| 点击处理器执行 | 0 | 替换成 1 | 处理器内继续读取仍是 0 |
| 后续渲染 | 1 | 无 | 新处理器使用这一轮的 1 |

这里与 [闭包保存绑定](../chinese-guides/js-01-execution-context-scope-closure.md#闭包保存的是变量还是快照)并不矛盾。每次组件调用都有自己的局部绑定；旧处理器仍引用旧调用中的绑定，新调用创建的是另一组绑定。React 没有把 JavaScript 的闭包规则改成另一套。

“快照”也不意味着深拷贝或冻结。如果 state 是对象，你直接改它的属性，仍可能破坏旧渲染所引用的数据。React 的状态约定要求你把已有对象当作不可变值，沿变化路径创建新对象；可以回看 [JS-03 的不可变更新](../chinese-guides/js-03-types-equality-copy-immutability.md#不可变更新沿修改路径创建新对象)。

因此，“把 setter 加上 await 就能读到新 count”不是解决办法。setter 不返回一个等待状态变更完成的 Promise；即使函数稍后恢复，原有局部绑定也不会因此换成下一次渲染的绑定。

### 替换值与更新函数可以按顺序混合

不要把更新函数背成“更高级写法”。需要固定结果时，替换值很直接；需要接着队列前一步累积时，更新函数更合适。试试这个完整组件：

```tsx example=react01-mixed-queue
import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);
  function change() {
    setCount(count + 5);
    setCount(previous => previous + 1);
    setCount(42);
  }
  return (
    <main>
      <h1>混合更新</h1>
      <p>计数：{count}</p>
      <button type="button" onClick={change}>执行三步更新</button>
    </main>
  );
}
```

第一次点击时，按队列顺序可以列出：

| 更新 | 输入如何使用 | 结果 |
| --- | --- | --- |
| 替换成 `count + 5` | 当前快照为 0，提前算出 5 | 5 |
| `previous => previous + 1` | 接收队列前一步的 5 | 6 |
| 替换成 42 | 不需要前一步结果 | 42 |

最终显示 42。如果删除最后一行，第一次点击会显示 6。这种逐步代入方法也适用于 reducer 等后续状态模型，比猜 React “合并掉了哪一行”更清楚。

更新函数应该只计算新状态。不要在里面发送请求、追加全局日志记录或调用另一个 setter，因为 React 可能为检查纯度而额外调用它。需要响应用户动作的工作，放在事件处理器对应的位置。

### 批处理不会把不同用户操作变成一次事务

React 会把适合一起处理的更新合并安排，减少用户看不到价值的中间提交，这叫**批处理（batching）**。在现代根节点应用中，它不只涉及 React 点击处理器，也覆盖许多异步回调中的更新。

但两次有意的点击仍是不同事件。你从零开始分别点击三次“按当前值加三次”，通常会看到 1、2、3：每次后续事件使用的是已更新界面对应的处理器。不能把“一次处理器里的三次 setter”与“三次分开的点击”混为一谈。

跨过异步等待之后，也不要承诺整个业务过程只有一次渲染。批处理是界面更新安排，不提供网络请求与本地状态的原子事务。例如“保存成功，再更新列表”需要处理请求失败，不能因为两个 setter 常被一起处理就假定数据已经可靠保存。

遇到必须同步读取提交后 DOM 的第三方集成，React 有相应逃生 API，但它们不会改变当前快照变量。大多数业务无需强制同步提交，先让状态流向下一轮界面就足够了。

### 延迟回调可以有意使用点击时的内容

这个示例模拟“稍后发送”。输入文字，点击发送，再立刻改输入框；一秒后观察结果：

```tsx example=react01-delayed-message
import { useEffect, useRef, useState } from 'react';

export default function App() {
  const [draft, setDraft] = useState('先学表单');
  const [sent, setSent] = useState('尚未发送');
  const [pending, setPending] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current);
  }, []);

  function sendLater() {
    const messageAtClick = draft;
    setPending(true);
    timer.current = setTimeout(() => {
      setSent(messageAtClick);
      setPending(false);
      timer.current = null;
    }, 1000);
  }
  return (
    <main>
      <h1>延迟发送</h1>
      <label htmlFor="draft">草稿</label>
      <input id="draft" value={draft} onChange={event => setDraft(event.target.value)} />
      <button type="button" disabled={pending} onClick={sendLater}>
        {pending ? '等待发送' : '一秒后发送'}
      </button>
      <p role="status">发送内容：{sent}</p>
    </main>
  );
}
```

假设点击时是“先学表单”，随后改成“再学 React”，发送结果仍是“先学表单”。对“提交点击时已确认的内容”来说，这正是合理结果。`messageAtClick` 把需求写得更明确，即使直接读取这个处理器捕获的 `draft`，也是同一张快照。

示例用 ref 保存定时器句柄，因为它需要跨渲染保留，但句柄本身不需要显示；Effect 只负责卸载时清理这个外部计时器。当前是否等待与已发送内容仍用 state，因为它们影响界面。这里无需深入 Effect 全部规则，先区分“显示数据”和“外部资源句柄”。

如果希望两个延迟回调分别累加计数，应让它们调用 `setCount(previous => previous + 1)`。如果都闭包读取某轮为 0 的 `count` 再设置 `count + 1`，两次替换的目标仍是 1。等待时间从 20 毫秒换成 40 毫秒，不会自动让闭包切换到另一轮快照。

如果需求是“执行时读取最新输入”，应重新设计明确的数据通道；ref 可以作为某些集成的手段，但不应让所有显示状态都绕过 setter。异步结果能否覆盖当前页面，则还涉及 [JS-05 的旧请求与清理](../chinese-guides/js-05-promise-errors-async-control-flow.md#新请求开始后旧请求的清理也可能过期)，不能只用“闭包旧了”解释全部竞态。

### 纯渲染允许 React 重新计算

React 可能重新执行组件，甚至不采用某一次计算结果。如果 render 每执行一次就修改外部数据，那么用户没有看到的计算也会留下痕迹。**组件纯度（component purity）**因此有两个实际要求：相同输入得到相同描述；计算过程不修改已有的外部世界。

比如传入三条资料，组件直接 `lessons.push(...)` 添加一行占位，第二次调用就多出第二行占位。换成每次创建自己的新数组，再排序或追加，就不会污染输入：

```tsx example=react01-pure-list
type Lesson = { id: string; title: string; minutes: number };
const lessons: readonly Lesson[] = [
  { id: 'snapshot', title: '状态快照', minutes: 30 },
  { id: 'form', title: 'HTML 表单', minutes: 25 },
];
function ReadingList({ items }: { items: readonly Lesson[] }) {
  const sorted = [...items].sort((a, b) => a.minutes - b.minutes);
  return <ul>{sorted.map(item => <li key={item.id}>{item.title}：{item.minutes} 分钟</li>)}</ul>;
}
export default function App() {
  return <main><h1>按用时排序</h1><ReadingList items={lessons} /><ReadingList items={lessons} /></main>;
}
```

两份列表都先显示 HTML 表单。每次调用都会新建 `sorted`，排序只修改这份局部数组。局部变更可以是纯计算的一部分；禁止的是修改此前就存在、可能被其他渲染共享的对象。注意浅拷贝只隔离了数组，若继续修改 `item.title`，仍会碰到共享元素。

时间和随机数也值得留意。`Date.now()` 没有像写存储那样直接改变外部世界，却会让同一输入的输出依赖调用时刻，因而不满足幂等的渲染要求。需要“点击时记录时间”时，在事件里取得时间并存入 state；需要时钟时，由可清理的外部同步定期更新状态，再让 render 格式化该状态。

不要在 render 中发请求、操作存储、建立订阅或直接改 DOM。用户动作对应事件处理器；与外部系统持续同步才考虑 Effect。render 保持为可以重新计算的描述。

### Strict Mode 的额外调用不是额外点击

开发环境使用 **Strict Mode** 时，React 会额外调用某些应当保持纯粹的函数，并执行额外的 Effect 或 ref 清理检查。检查的具体范围与 Strict Mode 放置位置有关；不能把某个日志次数当成所有配置下的固定公式。

组件函数和 updater 可能被额外调用，但一次真实点击不会因此自动调用两次事件处理器。看到两条 render 日志，先判断它记录的是计算、Effect 建立，还是已经发生的服务端操作，不要直接认定 React “把请求发了两次”。

如果重复执行暴露出列表越来越长，检查是否修改 props；如果订阅越来越多，检查清理是否对称。关闭 Strict Mode 可能暂时隐藏现象，却没有解决那些在重新挂载或重做计算时仍会出现的问题。

纯度也不表示组件必须永远不变化。用户输入改变后，组件当然可以返回不同内容。它要求的是变化有明确输入和发生位置，让重新计算本身不偷偷改变业务事实。

### 组件身份决定草稿保留还是重置

React 把状态关联到渲染树中的位置和组件身份，并不是按函数名字在全局保存一份状态。下面切换两份资料时，编辑器的草稿应从新资料标题重新开始：

```tsx example=react01-editor-identity
import { useState } from 'react';

type Lesson = { id: string; title: string };
const lessons: [Lesson, Lesson] = [
  { id: 'form', title: 'HTML 表单' },
  { id: 'snapshot', title: '状态快照' },
];
function Editor({ lesson }: { lesson: Lesson }) {
  const [draft, setDraft] = useState(lesson.title);
  return (
    <section>
      <h2>编辑 {lesson.title}</h2>
      <label htmlFor="title-draft">标题草稿</label>
      <input id="title-draft" value={draft} onChange={event => setDraft(event.target.value)} />
    </section>
  );
}
export default function App() {
  const [selected, setSelected] = useState<0 | 1>(0);
  const lesson = lessons[selected];
  return (
    <main>
      <h1>资料编辑</h1>
      <button type="button" onClick={() => setSelected(value => value === 0 ? 1 : 0)}>切换资料</button>
      <Editor key={lesson.id} lesson={lesson} />
    </main>
  );
}
```

在 HTML 表单草稿后加上“待修改”，切换资料，再切回来。由于 key 改变，每次建立新编辑器身份，临时草稿都会重新初始化。

再试着只删除 `key={lesson.id}`：同一位置仍是同一种 `Editor`，其 state 会保留。props 虽然换了，`useState(lesson.title)` 的初始参数不会自动重置已有状态。如果保留不同资料的草稿才符合需求，应按资料 ID 在更高层保存草稿，而不是期待组件替你决定。

key 只需在同一组兄弟中表达稳定身份，并不是全站唯一编号。随机 key 会不断重建组件；动态列表使用下标，在插入或排序后可能把原先某一行的状态留给另一行。组件函数也应定义在稳定的模块位置，避免在父组件内部每次创建一种新组件类型。

### 派生值直接计算可以少一份需要同步的状态

资料列表和搜索词已经确定时，筛选结果也确定了。下面没有为 `visible` 单独创建 state：

```tsx example=react01-derived-list
import { useState } from 'react';

const lessons = [
  { id: 'form', title: 'HTML 表单' },
  { id: 'snapshot', title: 'React 状态快照' },
  { id: 'closure', title: 'JavaScript 闭包' },
];
export default function App() {
  const [query, setQuery] = useState('');
  const keyword = query.trim().toLowerCase();
  const visible = lessons.filter(item => item.title.toLowerCase().includes(keyword));
  return (
    <main>
      <h1>筛选学习资料</h1>
      <label htmlFor="lesson-query">关键词</label>
      <input id="lesson-query" value={query} onChange={event => setQuery(event.target.value)} />
      <p>找到 {visible.length} 篇</p>
      <ul>{visible.map(item => <li key={item.id}>{item.title}</li>)}</ul>
    </main>
  );
}
```

空关键词显示三篇，输入 `react` 只显示状态快照，清空又回到三篇。每次 render 都从这一轮输入算出同一份结果，没有等待 Effect 再补一次列表状态。

如果通过 Effect 监听 query 然后调用 `setVisible`，就多维护了一个本可直接推导的值，也多了一次同步机会。先判断数据是否真的独立，再考虑是否放进 state。计算昂贵时可以研究缓存与调度，但不要先复制一份状态再解决复制带来的问题。

同样的筛选会在 [VUE-02 的 computed](../chinese-guides/vue-02-ref-reactive-computed-boundaries.md#computed-让筛选结果跟着源状态变化)中出现。React 这里重新运行组件中的普通计算；Vue 会跟踪响应式读取并按依赖管理派生计算。它们都应避免无必要地保存两份同义数据。

### 先保证计算正确再理解并发与 Hydration

并发渲染允许 React 调度、重做或放弃某些渲染工作；并不意味着它能在任意一行 JavaScript 中间抢占你的同步函数。重要的是一次计算可能不进入 commit，所以不能让“函数运行过”本身成为已完成业务操作的证据。

输入框回显与很重的结果展示可以有不同优先级。transition 等机制帮助安排工作，不自动取消旧网络请求，也不保证服务器返回顺序正确。异步提交资格仍要结合请求身份判断，本篇先掌握快照和纯度即可。

服务端渲染场景还会遇到 **Hydration**：客户端接管已有 HTML，并把组件交互与之连接起来。服务端与客户端的初始输出需要匹配。如果 render 随机生成文本、直接读取只在浏览器存在的存储，可能导致初始结果不一致。解决方向是明确初始数据与客户端同步时机，而不是把错误提示隐藏。

遇到旧值、重复或草稿错位时，先说清五件事：这次回调来自哪次渲染；队列里是替换还是累积；render 有没有改外部对象；派生值是否重复保存；key 是否表达了正确身份。能够沿这几步说明结果，就有了继续学习 Hooks 与性能优化所需的基础。

### 参考与延伸阅读

- [React：Render and Commit](https://react.dev/learn/render-and-commit)：查触发、渲染、提交与 DOM 更新的区别。
- [React：State as a Snapshot](https://react.dev/learn/state-as-a-snapshot)：查事件处理器与某次渲染状态的关系。
- [React：Queueing a Series of State Updates](https://react.dev/learn/queueing-a-series-of-state-updates)：查替换值、更新函数及队列顺序。
- [React：Keeping Components Pure](https://react.dev/learn/keeping-components-pure)：查输入、局部变更与纯度边界。
- [React：StrictMode](https://react.dev/reference/react/StrictMode)：查开发检查与具体启用范围。
- [React：Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state)：查树位置与 key 对状态的影响。
