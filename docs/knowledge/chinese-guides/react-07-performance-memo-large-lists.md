# React 知识点讲义

## REACT-07 性能测量、memo 与大列表

搜索框卡顿，可能是筛选计算太重，也可能是一次创建了太多 DOM；点击详情慢，还可能主要在等网络。给所有组件加 memo，只有在原因恰好是可跳过的重复渲染时才有帮助。

本篇先把“慢”拆成可观察的工作，再用对照页观察引用、闭包和列表规模。示例帮助理解机制，不预先承诺在你的设备上节省多少毫秒。

### 学习前先确认

- 直接前置：[REACT-06 Reducer、Context 与跨组件状态](../chinese-guides/react-06-reducer-context-state-domains.md#react-06)。先能解释状态所有者、不可变更新和 Context 传播。

四段 App.tsx 分别在 React + TypeScript 项目中独立运行。手工 memo 对照应先关闭 React Compiler，否则编译器可能改变待观察的缓存行为；Compiler 在本批 REACT-09 单独说明。开发环境适合观察更新原因，实际性能结论仍需生产条件或 profiling build。

### 把用户等待的时间拆开看

先固定一个动作：“在已有一万条资料中输入关键词，再打开第一项”。不要把冷启动下载、热页面输入和首次访问详情混成一个指标。

| 观察到的现象 | 优先看什么 | 常见误判 |
| --- | --- | --- |
| 请求两秒后内容瞬间出现 | 网络与服务端耗时 | 认为组件 render 太慢 |
| 输入后主线程连续忙碌 | 脚本、筛选、解析 | 只查请求数量 |
| React 计算很少但滚动卡 | layout、paint、DOM 数量 | 再加一层 memo |
| 反复进出后越来越慢 | 存活对象、监听、缓存 | 只测第一次打开 |

浏览器 Performance 记录输入、脚本、布局与绘制；React **Profiler** 解释组件树的渲染工作。二者关注的层次不同。特别是 commitTime 是提交发生的时间点，不能把它当成“这次提交耗时”。

### Profiler 提供线索而不是用户体验分数

actualDuration 是本次已提交更新的 React 渲染耗时；baseDuration 根据各组件最近的渲染成本估计整棵子树不跳过时的成本。它们不是网络时间，也不包含完整浏览器绘制，更不是跨设备通用分数。

一次 background render 可能被打断，用户是否顺畅还要看输入到可见反馈的全过程。默认生产构建不会提供完整 profiling；需要对应构建才能测生产环境的 React 轨迹。

比较时保留相同数据、浏览器、构建、缓存状态和操作。先看多次结果是否稳定，再讨论中位数；不挑最快的一次作为“优化成功”。本文中的日志只辅助定位，不作为性能排名。

### 用一份清单观察三个缓存边界

**memo** 尝试跳过 props 未变的组件执行，**useMemo** 复用计算结果，**useCallback** 复用函数引用。三个入口作用在不同位置，下面放在同一页观察。

```tsx example=react07-memo-workbench runtime=project file=src/App.tsx
import { memo, Profiler, useCallback, useMemo, useState, type ProfilerOnRenderCallback } from 'react';
type Row = Readonly<{ id: number; title: string }>;
const rows: readonly Row[] = Array.from({ length: 1000 }, (_, id) => ({ id, title: `资料 ${id + 1}` }));
const stableOptions = { prefix: '打开' };
const report: ProfilerOnRenderCallback = (id, phase, actualDuration, baseDuration) => {
  console.log(id, phase, { actualDuration, baseDuration });
};
const List = memo(function List({ items, options, onOpen }: {
  items: readonly Row[]; options: { prefix: string }; onOpen: (id: number) => void;
}) {
  return <Profiler id="资料列表" onRender={report}>
    <ul>{items.slice(0, 30).map(item => <li key={item.id}>
      <button onClick={() => onOpen(item.id)}>{options.prefix} {item.title}</button>
    </li>)}</ul>
  </Profiler>;
});
export default function App() {
  const [query, setQuery] = useState('');
  const [count, setCount] = useState(0);
  const [stable, setStable] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const filtered = useMemo(() => rows.filter(row => row.title.includes(query.trim())), [query]);
  const open = useCallback((id: number) => setSelected(id), []);
  return <main>
    <label>筛选资料 <input value={query} onChange={e => setQuery(e.target.value)} /></label>
    <label><input type="checkbox" checked={stable} onChange={e => setStable(e.target.checked)} />使用稳定的选项对象</label>
    <button onClick={() => setCount(value => value + 1)}>无关计数加一</button>
    <p>计数：{count}，匹配：{filtered.length}，选中 ID：{selected ?? '无'}</p>
    <p>这里只显示前 30 项，用来观察更新原因。</p>
    <List items={filtered} options={stable ? stableOptions : { prefix: '打开' }} onOpen={open} />
  </main>;
}
```

打开控制台，保留稳定对象，多次点无关计数：List 的 props 没变，其内部 Profiler 通常不会得到新的提交回调。取消勾选后，每次父层执行都会创建新的 options，即使里面文字相同，也会破坏这次跳过机会。

筛选文字变化时，useMemo 重新计算数组，列表应该更新；点击条目时，回调仍应取得正确 ID。open 只调用稳定 setter，不读取本轮 selected，因此空依赖是完整的。若它还使用当前账号或筛选条件，就必须加入相应依赖。

本例有意限制显示数量，帮助分清“筛选计算”和“创建 DOM”。它没有证明筛选已经昂贵；若实际筛选很便宜，去掉 useMemo 仍可能是更易维护的选择。

### 引用相同与内容相同不是一回事

memo 默认对每个 prop 做 Object.is 比较。两个分别创建的对象，即使字段一样，也不相同；原对象被偷偷修改，即使字段变了，身份仍相同。

所以不能为了缓存命中直接改旧对象。应只为发生变化的条目创建新对象，其余条目保留引用。这同时维护了 [状态快照与不可变更新](../chinese-guides/react-03-state-model-derived-controlled.md#react-03)。

组件自己的 state、读取的 Context 或其他更新仍能使它执行。memo 是优化机会，不是“组件被锁住”；缓存被丢弃后，结果也应正确。网络连接、计时器和唯一业务身份不能依赖 useMemo 的存活保证。

### 忽略函数属性会保留过期的行为

下面故意保留一个错误比较器。左右两列都显示同一份资料，父层可以切换当前分类；按钮回调捕获该分类。

```tsx example=react07-comparator runtime=project file=src/App.tsx
import { memo, useState } from 'react';
type Props = { title: string; onChoose: () => void };
function Choice({ title, onChoose }: Props) { return <button onClick={onChoose}>{title}</button>; }
const Broken = memo(Choice, (before, after) => before.title === after.title);
const Correct = memo(Choice);
export default function App() {
  const [category, setCategory] = useState('基础');
  const [message, setMessage] = useState('尚未选择');
  return <main>
    <label>当前分类 <select value={category} onChange={e => setCategory(e.target.value)}>
      <option>基础</option><option>进阶</option>
    </select></label>
    <section aria-label="错误比较器"><h2>故意忽略回调的版本</h2>
      <Broken title="选择资料" onChoose={() => setMessage(`错误版本收到：${category}`)} />
    </section>
    <section aria-label="默认比较器"><h2>默认比较的版本</h2>
      <Correct title="选择资料" onChoose={() => setMessage(`正确版本收到：${category}`)} />
    </section>
    <p role="status">{message}</p>
  </main>;
}
```

切到进阶后，左侧仍可能报告基础，右侧报告进阶。界面文字没有变化，但可观察行为已经不同。比较器返回 true 相当于开发者承诺“新旧 props 的结果和行为等价”，不能漏掉函数闭包。

深比较也不天然更好：遍历成本可能比重渲染还大。优先缩小 props、改进状态位置；确需自定义比较时，再验证所有影响输出与行为的字段。

### 先减少一次动作造成的工作

输入框状态放在整页根部，可能让无关侧栏一起参与更新；派生数据再存 state，可能多出一轮 Effect 与渲染。先修这些更新链，再给真正昂贵的纯计算缓存。

筛选每次扫描全部数据、重复 JSON 解析或交错读写尺寸，也不会因包上 memo 自动消失。布局读取与样式写入尽量分批，避免反复强制 layout；只看 React Profiler 看不到全部浏览器成本。

**long task** 通常指占用主线程超过 50ms 的任务。不是每个小任务都值得单独优化，也不能因单次没越线就认定整条输入路径流畅。应把一串工作与可见反馈连接起来看。

### 大列表先算清需要多少 DOM

有一万条数据，不代表必须同时创建一万个列表项。分页可以简单地限制 DOM；**virtualization** 则只显示窗口附近的项目，用占位高度保留滚动范围。

固定行高时，窗口计算不复杂。以下例子把范围夹在合法区间，并额外留两行 overscan，降低滚动边缘短暂空白的机会。

```js example=react07-window-math
function windowRange(total, top, height, rowHeight, overscan) {
  const first = Math.max(0, Math.min(total, Math.floor(top / rowHeight)));
  return { start: Math.max(0, first - overscan), end: Math.min(total, Math.ceil((top + height) / rowHeight) + overscan) };
}
console.log(JSON.stringify(windowRange(10000, 320, 320, 32, 2))); // => {"start":8,"end":22}
console.log(JSON.stringify(windowRange(3, 0, 320, 32, 2))); // => {"start":0,"end":3}
```

### 用固定高度窗口观察节点数量

下面是只读列表演示。每行固定 32px，没有可聚焦按钮，因此不涉及“焦点按钮被回收”的问题；滚动区域本身可以接收键盘焦点。

```tsx example=react07-window-list runtime=project file=src/App.tsx
import { useRef, useState } from 'react';
const rows = Array.from({ length: 10000 }, (_, id) => ({ id, title: `资料 ${id + 1}` }));
const rowHeight = 32, height = 320, overscan = 2;
export default function App() {
  const viewport = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(0);
  const start = Math.max(0, Math.floor(top / rowHeight) - overscan);
  const end = Math.min(rows.length, Math.ceil((top + height) / rowHeight) + overscan);
  function jump() { if (viewport.current) viewport.current.scrollTop = 4999 * rowHeight; }
  return <main>
    <h1>一万条只读资料</h1><button onClick={jump}>跳到第 5000 条</button>
    <p>当前创建 {end - start} 个列表项，数据共 {rows.length} 条。</p>
    <div ref={viewport} role="region" aria-label="可滚动资料列表" tabIndex={0}
      style={{ height, overflowY: 'auto', border: '1px solid', overflowAnchor: 'none' }}
      onScroll={e => setTop(e.currentTarget.scrollTop)}>
      <ul aria-label="资料" style={{ height: rows.length * rowHeight, position: 'relative', margin: 0, padding: 0, listStyle: 'none' }}>
        {rows.slice(start, end).map((row, offset) => <li key={row.id} aria-posinset={start + offset + 1} aria-setsize={rows.length}
          style={{ position: 'absolute', top: (start + offset) * rowHeight, height: rowHeight, lineHeight: `${rowHeight}px`, boxSizing: 'border-box', whiteSpace: 'nowrap' }}>
          {row.title}
        </li>)}
      </ul>
    </div>
  </main>;
}
```

初始只创建 12 项，滚动到中间通常是 14 项。点击跳转可看到第 5000 条附近的内容；底部仍能到达第 10000 条。这说明节点数受窗口大小控制，没有让所有条目先隐藏在 DOM 中。

真实列表若有自动换行、图片或展开行，固定高度假设就不成立，需要测量与偏移修正。若每行有输入框，草稿要按业务 ID 保存，焦点项要保留或明确迁移；不能只把这段只读演示加个按钮就当成完整组件。

浏览器查找、打印、文本选择和读屏遍历也会受回收影响。aria-posinset 与 aria-setsize 说明集合位置，但不自动补齐所有交互。表格则用相应表格语义，不能把 aria-rowindex 随意加到普通列表上。

### 延后结果不等于让计算更少

输入属于当前动作，下面的非紧急结果可以稍后更新。**useDeferredValue** 让 React 有机会先响应输入，并在后台尝试新结果；它不是固定毫秒数的 debounce，也不会自动减少网络请求。

```tsx example=react07-deferred runtime=project file=src/App.tsx
import { memo, useDeferredValue, useState } from 'react';
const source = Array.from({ length: 3000 }, (_, id) => `资料 ${id + 1}`);
const Results = memo(function Results({ query }: { query: string }) {
  const found = source.filter(title => title.includes(query));
  return <section><p>结果对应关键词：{query || '全部'}</p><p>共 {found.length} 条，只显示前 20 条</p>
    <ul>{found.slice(0, 20).map(title => <li key={title}>{title}</li>)}</ul>
  </section>;
});
export default function App() {
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);
  const stale = query !== deferred;
  return <main>
    <label>即时输入 <input value={query} onChange={e => setQuery(e.target.value)} /></label>
    <p role="status">{stale ? '结果仍对应上一次输入' : '结果已跟上输入'}</p>
    <div style={{ opacity: stale ? 0.6 : 1 }}><Results query={deferred} /></div>
  </main>;
}
```

机器足够快时，过渡提示可能一闪而过，这是正常的；不能为了让提示明显就把每行故意拖慢再声称性能提升。这里让结果明确标注对应关键词，避免用户把旧结果误认为新查询。

React 能在合适的工作边界暂停渲染，但不能中断任意正在运行的长同步函数。若单个筛选函数很重，先改算法、分块或使用 Worker。Worker 的消息复制、启动与结果合并也有成本，相关基础见 [大数据与 Worker](../chinese-guides/cs-03-large-data-workers-incremental-memory.md#cs-03)。

### 网络内存与 Hydration 仍在性能范围内

首屏 JS 过大、串行数据请求、字体和图片，都可能比组件缓存更重要。路由分块应结合实际访问路径，不能只看构建后的文件个数。

长会话要观察离开页面后监听、DOM 和缓存是否释放。useMemo 不是全局无限缓存，而模块 Map 如果没有容量和失效规则就可能持续增长；隐藏区域也不等于卸载。

SSR 让 HTML 提前出现，但客户端仍需下载并接管交互。要区分“看见按钮”和“按钮可以响应”，分别定位服务器等待、payload、JS、Hydration 和浏览器布局。具体服务端边界见 [REACT-09](../chinese-guides/react-09-compiler-rsc-security-upgrades.md#react-09)。

### 何时保留优化何时停下来

一份有用的记录应包含：哪个用户动作慢、观察到哪类工作、改变了什么、同条件下发生什么，以及行为是否仍正确。删除优化再比较，可以帮助排除缓存预热或数据变化带来的假收益。

若用户目标已达到，继续加比较器、缓存或虚拟化可能只增加维护成本。保留能解释的优化，记录其前提；升级 Compiler、数据量或组件库后，再根据新证据重新判断。

### 参考与延伸阅读

- [React：Profiler](https://react.dev/reference/react/Profiler)：查 actualDuration、baseDuration 与生产 profiling。
- [React：memo](https://react.dev/reference/react/memo)：查 props 比较和函数闭包风险。
- [React：useMemo](https://react.dev/reference/react/useMemo)：查缓存适用范围与依赖。
- [React：useCallback](https://react.dev/reference/react/useCallback)：查函数身份。
- [React：useDeferredValue](https://react.dev/reference/react/useDeferredValue)：查后台渲染与过期结果提示。
- [MDN：Long Tasks API](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongTaskTiming)：查浏览器长任务。
