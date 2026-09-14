# React 知识点讲义

## REACT-02 组件边界、数据流与组合

资料列表左边有搜索框，中间有条目，右边有详情。把它们拆成三个文件很容易，难的是回答：搜索词放在哪里？点击条目后谁改变选择？详情里的草稿应不应该跟列表同时更新？

这一篇先把一个小型资料工作台完整写出来，再沿数据的来去理解组件边界。目标不是尽量增加组件数量，而是让每份数据、每个用户动作和每块可替换内容都有清楚的去处。

### 学习前先确认

- 直接前置：[REACT-01 渲染、组件纯度与状态快照](../chinese-guides/react-01-render-purity-state-snapshot.md#react-01)。其中的快照、更新队列与组件身份会继续用到。

每段 TSX 都是独立示例，可替换已有 React + TypeScript 项目的 `App.tsx`；所需组件、数据和导入均在同一段中。实际工程可以再按名字拆文件。先读完整的数据流，再拆文件，更容易看懂边界。

### 先为工作台里的数据找主人

先约定产品行为：搜索只改变列表范围，不清空已经选中的资料；选中项即使暂时被筛掉，右侧仍能查看。这个决定要写在设计里，不能让某个 Effect 偶然决定。

| 数据或动作 | 谁拥有 | 为什么 |
| --- | --- | --- |
| 关键词 | 工作台 | 搜索框要修改，列表要读取 |
| 选中资料 ID | 工作台 | 列表发起选择，详情显示同一选择 |
| 筛选后的列表 | 不另存 state | 根据原列表和关键词计算 |
| 详情里的临时草稿 | 编辑器，或需要保留草稿的上层 | 看是否要跨资料切换保留 |
| 每行按钮的 DOM 事件 | 行组件内部 | 父层只需要知道用户选了哪个 ID |

这张表先回答所有权，再决定组件。页面上有几个矩形，不能直接告诉你状态应放在哪一层。两个相距很远的区域可能共享同一事实；紧挨着的两个按钮也可能属于不同任务。

### 用完整组件追踪数据下行与意图上行

运行这个工作台，选择“状态快照”，再搜索“表单”。列表只留下表单，详情仍显示状态快照；清空搜索后，原选择重新出现在列表中。

```tsx example=react02-workspace
import { useId, useState } from 'react';

type Lesson = Readonly<{ id: string; title: string; minutes: number }>;
const lessons: readonly Lesson[] = [
  { id: 'form', title: 'HTML 表单', minutes: 25 },
  { id: 'snapshot', title: '状态快照', minutes: 30 },
];
function SearchBox({ value, onChange }: {
  value: string;
  onChange: (next: string) => void;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id}>关键词</label>
      <input id={id} value={value} onChange={event => onChange(event.target.value)} />
    </div>
  );
}
function LessonList({ items, selectedId, onSelect }: {
  items: readonly Lesson[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (items.length === 0) return <p>没有匹配的资料。</p>;
  return <ul>{items.map(item => (
    <li key={item.id}>
      <button type="button" aria-pressed={selectedId === item.id} onClick={() => onSelect(item.id)}>
        {item.title}
      </button>
    </li>
  ))}</ul>;
}
function LessonDetails({ lesson }: { lesson: Lesson | null }) {
  return lesson
    ? <section><h2>{lesson.title}</h2><p>预计 {lesson.minutes} 分钟</p></section>
    : <p>请先选择一份资料。</p>;
}
export default function App() {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const visible = lessons.filter(item => item.title.includes(query.trim()));
  const selected = lessons.find(item => item.id === selectedId) ?? null;
  return (
    <main>
      <h1>资料工作台</h1>
      <SearchBox value={query} onChange={setQuery} />
      <LessonList items={visible} selectedId={selectedId} onSelect={setSelectedId} />
      <LessonDetails lesson={selected} />
    </main>
  );
}
```

先沿搜索走一遍：父层把 query 传给 SearchBox；输入时子层读取文本，调用 onChange；父层更新 query；下一次 render 重新算 visible，再把结果传给列表。

再沿选择走一遍：行按钮调用 onSelect 并传 ID；父层更新 selectedId；详情从完整集合查找该 ID。注意查找的不是 visible，所以筛选不会让当前详情凭空消失。换成从 visible 查找，产品行为就变了，不是无关紧要的实现细节。

这种“父层给数据，子层报告意图”的组织方式叫**单向数据流（one-way data flow）**。回调向上调用并没有把数据流变成混乱的双向修改：改变权威状态的地方仍是父层，新的结果再以 props 向下传递。

### props 表达组件需要什么而不是允许改什么

`LessonList` 只需要条目、当前选择和选择回调，不需要知道路由、请求地址、用户的全部偏好。`LessonDetails` 只需要一份可显示的数据，不必通过全局单例偷偷找当前选择。

**props** 可以是对象、数组、函数或 JSX，不限于字符串。它们是子组件当前收到的输入，不能靠修改 `items[0].title` 来通知父组件。TypeScript 的 readonly 能发现部分不当写法，但不会在运行时冻结数据，嵌套对象也需要相应约定。

如果子层确实需要编辑，传出“新标题”或“待保存草稿”，由拥有者决定如何更新。这样父层还能检查标题长度、记录修改或拒绝操作，而不是在事后才发现自己的对象已经变了。

也不必把对象每个字段都拆成单独 prop。需要一个完整的资料摘要时，`lesson: LessonSummary` 往往更清楚；只负责标题排版的组件，用 `title: string` 就够了。最小输入指的是符合职责的稳定形状，不是字符数量最少。

### 用事件名称说明业务意图

`onClick` 说明一个底层事件，`onSelect` 说明用户想选中资料。父层不必知道这个意图来自鼠标、Enter 还是某个菜单。同样，`onCancel`、`onRename`、`onSubmitDraft` 通常比 `onButtonTwoClick` 更稳定。

回调参数应足够完成任务，但不携带无关内部信息。选择只需 ID；提交需要经过明确约定的草稿。没有必要把整个 DOM Event 存入父层 state，更不应把子组件内部可写状态对象直接暴露出去。

需要注意“命名”与“浏览器协议”是两层事情。组件的 `onSubmitDraft` 只是你定义的函数 prop；真正的 HTML form 仍需要处理 submit、原生校验和默认导航。参见 [WEB-01 的标签与提交](../chinese-guides/web-01-html-semantics-forms-accessibility.md#用一个完整表单看清标签与提交)。

### 多个消费者共享状态时才向上提升

若两个折叠面板要求“同时只能展开一个”，每个面板各存一个 open 布尔值就难以协调。共同父层保存 activeId，面板只接收当前是否展开，就能让这个要求直接成立：

```tsx example=react02-accordion
import { useId, useState, type ReactNode } from 'react';

function Section({ title, open, onToggle, children }: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const contentId = useId();
  return (
    <section>
      <h2><button type="button" aria-expanded={open} aria-controls={contentId} onClick={onToggle}>{title}</button></h2>
      <div id={contentId} hidden={!open}>{children}</div>
    </section>
  );
}
export default function App() {
  const [activeId, setActiveId] = useState<string | null>('goals');
  function toggle(id: string) {
    setActiveId(previous => previous === id ? null : id);
  }
  return (
    <main>
      <h1>阅读提示</h1>
      <Section title="学习目标" open={activeId === 'goals'} onToggle={() => toggle('goals')}>解释数据由谁修改。</Section>
      <Section title="阅读建议" open={activeId === 'tips'} onToggle={() => toggle('tips')}>先运行例子，再看规则。</Section>
    </main>
  );
}
```

先点“阅读建议”，目标内容隐藏；再点一次，两个都关闭。没有“同时 true”的组合需要额外补救。这里的 hidden 保留内容节点；如果内容有局部状态，也会继续存在。

把需要共享的状态移到最近共同父层，叫**状态提升（lifting state up）**。它不要求把所有输入都搬到应用根部。仅某个编辑器使用的草稿，可以仍留在编辑器；只有需要跨编辑器协调或跨页面保留时，再提升到能承担这项责任的位置。

### children 让容器不必了解所有业务字段

资料面板可能放正文、统计或帮助信息。容器只负责标题、边框和操作区，不应该为了每种内容都新增一个布尔开关。

```tsx example=react02-composition
import { useId, useState, type ReactNode } from 'react';

function Panel({ title, actions, children }: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId}>
      <header><h2 id={titleId}>{title}</h2>{actions}</header>
      <div>{children}</div>
    </section>
  );
}
export default function App() {
  const [completed, setCompleted] = useState(false);
  return (
    <main>
      <h1>我的阅读区</h1>
      <Panel title="当前资料" actions={<button type="button" onClick={() => setCompleted(value => !value)}>切换完成状态</button>}>
        <p>组件边界：{completed ? '已完成' : '学习中'}</p>
      </Panel>
      <Panel title="阅读建议"><p>每次追踪一份数据的来去。</p></Panel>
    </main>
  );
}
```

Panel 不需要知道 completed，它只显示传入内容。状态属于 App，创建 children 和 actions 的表达式也位于 App。点按钮时，两种不同用途的 Panel 可以共用同一种结构。

这叫**组合（composition）**：通过明确的内容位置拼装组件，而不是让容器猜内容属于哪种业务。普通 children 是默认内容，actions 这样的 ReactNode prop 是一个命名位置。

示例用 useId 给每个面板建立独立的标题关联，避免重复 `id="panel-title"`。useId 适合可访问性关联，不应用作列表数据的 key。列表 key 应来自记录自身的稳定 ID。

组合也能减少无意义转发。例如布局层只需接收一个已经配置好的编辑器节点，就不用了解编辑器的每个字段。但真正负责决策的父组件仍需要知道它传入了什么，不能用组合隐藏本来应该清楚的业务关系。

### 内容需要子层数据时再用 render prop

如果容器内部算出了阅读进度，调用者想决定显示百分比还是文字，可以让 children 成为函数：

```tsx example=react02-render-prop
import { useState, type ReactNode } from 'react';

function Progress({ total, children }: {
  total: number;
  children: (progress: { completed: number; remaining: number }) => ReactNode;
}) {
  const [completed, setCompleted] = useState(0);
  const current = Math.min(completed, total);
  return (
    <section>
      {children({ completed: current, remaining: total - current })}
      <button type="button" disabled={current >= total} onClick={() => setCompleted(value => Math.min(value + 1, total))}>完成一篇</button>
    </section>
  );
}
export default function App() {
  return (
    <main>
      <h1>阅读进度</h1>
      <Progress total={3}>
        {({ completed, remaining }) => <p>已完成 {completed} 篇，还剩 {remaining} 篇</p>}
      </Progress>
    </main>
  );
}
```

这个例子约定 total 是非负整数。连续完成三篇，文本依次变化，最后按钮禁用。Progress 拥有计数和推进规则，App 决定怎样描述这些数字。

函数形式的内容入口常叫 **render prop**。它在渲染期间调用，函数内同样应该保持纯计算，也不要在里面调用 Hook。需要更多状态时，把内容提取为真正的组件；需要复用不带 UI 的有状态逻辑，后续再学习自定义 Hook。

这与 [Vue 的作用域插槽](../chinese-guides/vue-04-typed-components-slots-model-teleport.md#作用域插槽把子层数据交给父层排版)可以对照：容器提供数据，调用者提供展示。先明确谁拥有哪部分，再选择语法。

### 列表重排时让草稿跟着资料走

列表 key 的意义最好通过一个会交换位置的例子观察。这里每行 DOM 自己保存尚未提交的输入文本，用来突出身份问题：

```tsx example=react02-list-identity
import { useState } from 'react';

type Lesson = { id: string; title: string };
const initial: Lesson[] = [
  { id: 'form', title: 'HTML 表单' },
  { id: 'snapshot', title: '状态快照' },
];
function Row({ lesson }: { lesson: Lesson }) {
  return <li><label>{lesson.title} 的备注 <input defaultValue="" /></label></li>;
}
export default function App() {
  const [items, setItems] = useState(initial);
  return (
    <main>
      <h1>资料备注</h1>
      <button type="button" onClick={() => setItems(previous => [...previous].reverse())}>反转顺序</button>
      <ul>{items.map(item => <Row key={item.id} lesson={item} />)}</ul>
    </main>
  );
}
```

在 HTML 表单那一行输入“周末复习”，反转后，它应仍属于 HTML 表单。key 让 React 把已有节点和状态匹配到同一记录，而不是把“第一行的位置”当成身份。

可以对照改成索引 key：资料顺序变了，原位置保留的输入却可能被贴到另一条资料旁。这不是 input 的 bug，而是你告诉 React 按另一种身份复用节点。随机 key 又会在每次渲染时制造新身份，使草稿和焦点更容易丢失。

key 只在同一组兄弟中区分身份，也不会自动作为普通 prop 交给 Row。若 Row 需要 ID，仍应显式传 lesson.id。更完整的状态保留规则参见 [REACT-01 的组件身份](../chinese-guides/react-01-render-purity-state-snapshot.md#组件身份决定草稿保留还是重置)。

### 异步回调要说明何时才算完成

子组件需要显示保存中和失败原因时，父层必须给它一个可以等待的结果。下面约定：Promise 完成代表保存成功，拒绝代表失败；失败时保留输入。示例只模拟本地保存。

```tsx example=react02-async-contract
import { useId, useState, type FormEvent } from 'react';

function RenameForm({ onSave }: { onSave: (title: string) => Promise<void> }) {
  const id = useId();
  const [title, setTitle] = useState('组件边界');
  const [status, setStatus] = useState<'editing' | 'saving' | 'error' | 'saved'>('editing');
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'saving') return;
    setStatus('saving');
    setMessage('');
    try {
      await onSave(title.trim());
      setStatus('saved');
      setMessage('已保存');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : '保存失败，请重试');
    }
  }
  return (
    <form onSubmit={submit}>
      <label htmlFor={id}>资料标题</label>
      <input id={id} required value={title} disabled={status === 'saving'} onChange={event => {
        setTitle(event.target.value); setStatus('editing'); setMessage('');
      }} />
      <button type="submit" disabled={status === 'saving'}>{status === 'saving' ? '保存中' : '保存标题'}</button>
      <p role="status">{message}</p>
    </form>
  );
}
export default function App() {
  const [saved, setSaved] = useState('尚未保存');
  async function save(title: string) {
    await new Promise<void>(resolve => setTimeout(resolve, 200));
    if (title.length < 2) throw new Error('标题至少需要两个字符');
    setSaved(title);
  }
  return <main><h1>修改资料标题</h1><RenameForm onSave={save} /><p>已保存标题：{saved}</p></main>;
}
```

输入一个字符再保存，会得到错误且文本仍在；改成“组件协作”再保存，父层的已保存标题改变。等待期间禁用输入和按钮，避免这个简化场景里草稿在提交途中又发生变化。

父层若启动异步请求却忘了 return 或 await，子层就会过早以为完成。类型写成 Promise 有助于发现签名问题，实际实现也要遵守等待关系。这个基础来自 [JS-05 的异步等待边界](../chinese-guides/js-05-promise-errors-async-control-flow.md#调用方等待的究竟是哪一件事)。跨实体切换、取消与并发保存则需要额外身份判断，不能仅凭 saving 就推断所有异步都安全。

### 空态错误和只读模式也属于组件的输入

只有成功数据时才知道怎样渲染的组件，通常会让调用者在每个角落补条件。先确定加载中、无结果、失败、只读时分别由谁提供内容和动作，再决定 API。

互斥模式可以用判别联合表达，参见 [TS-02 的判别联合](../chinese-guides/ts-02-unions-narrowing-never-exhaustiveness.md#判别联合把一个状态和它需要的数据放在一起)。例如编辑模式要求 onSave，只读模式不提供保存操作，比 editable、hideActions、disabled 等一组可能互相冲突的布尔值更容易理解。

但也不必把请求状态全部塞进最底层行组件。父层可以负责加载或错误分支，列表专心显示已经可用的数据；也可以用前面的组合容器统一状态区域。区别在于调用者是否仍能明确控制恢复路径。

隐藏按钮只是呈现层的权限体验，实际写入仍由可信服务端授权。组件不能因为没有显示“删除”就声称数据无法被删除。

### 拆分的价值是减少隐含关系

判断边界是否合适，可以尝试只拿组件公开的 props、回调和内容位置，解释它的行为。如果还必须知道某个路由全局变量、某个兄弟组件的私有 ref 或某段隐藏 Effect，说明依赖尚未表达完整。

组件拆小不保证不再渲染。父层变化仍可能让子组件重新计算；不要为避免一次便宜的 render 把每个标签单独包装。把临时输入放在合理的拥有者，减少冗余数据，再在确有成本时研究性能，比一开始到处 memo 更有效。

错误边界和 Suspense 也应服务于可独立恢复的用户任务，而不是每个小块都套一个 fallback。普通 Error Boundary 不会自动捕获事件处理器里的所有异步失败，保存错误仍要在相应流程处理。后续异步边界资料会展开这一点。

当公共组件被多个页面使用时，事件参数、回调完成时机、默认值、属性落点和可访问名称都是调用者依赖的行为。改了它们，应同步修改代表性用法与说明。这里的必要核对是“输入什么、操作什么、得到什么”，不是固定内部 Hook 次数或文件层级。

### 参考与延伸阅读

- [React：Passing Props to a Component](https://react.dev/learn/passing-props-to-a-component)：查 props、默认值与 children。
- [React：Sharing State Between Components](https://react.dev/learn/sharing-state-between-components)：查共同拥有者和受控组件。
- [React：Rendering Lists](https://react.dev/learn/rendering-lists)：查列表 key 与稳定身份。
- [React：useId](https://react.dev/reference/react/useId)：查可访问性 ID 与列表 key 的不同用途。
- [React：Thinking in React](https://react.dev/learn/thinking-in-react)：继续练习从数据、状态与组件关系构建页面。
