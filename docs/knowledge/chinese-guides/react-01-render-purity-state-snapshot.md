# React 知识点讲义

## REACT-01 渲染、组件纯度与 state snapshot

React 组件看起来像一个返回 JSX 的普通函数，但它不是由业务代码任意调用一次就结束。React 可以因为挂载、状态更新、父组件更新或上下文变化再次调用它，也可以在提交前重做或放弃一次计算。理解这种运行模型，才能解释“为什么刚调用 setter 仍读到旧值”“为什么开发环境出现两次日志”“为什么 render 中的副作用会造成幽灵请求”。

### 学习前先确认

- 直接前置：[TS-03 泛型、约束、`keyof` 与索引访问](../chinese-guides/ts-03-generics-constraints-keyof-indexed-access.md#ts-03)、[WEB-01 HTML 语义、表单与可访问性基础](../chinese-guides/web-01-html-semantics-forms-accessibility.md#web-01)、[JS-06 ES Modules 与模块边界](../chinese-guides/js-06-es-modules-module-boundaries.md#js-06)。三份资料分别补足 TypeScript 关系、DOM 语义和模块导入；更早的 JavaScript 基础会继续递归链接。

JSX、组件、props、state、事件与更新队列都是本讲正文，不需要另读一份 React 术语表。

### 一、组件描述界面，不直接命令 DOM

```tsx
type GreetingProps = { name: string };

export function Greeting({ name }: GreetingProps) {
  return <h2>你好，{name}</h2>;
}
```

组件接收 props、state 和 context，返回一份 UI 描述。JSX 会被编译为创建 React 元素的调用；React 元素是普通的不可变描述，不是已经插入页面的 DOM 节点。

组件函数首字母大写，让 JSX 能区分自定义组件与原生标签。props 是父层给出的只读输入，组件不能修改它。若需要随交互变化的内部记忆，使用 state；若值能从当前输入直接算出，就保持为普通变量。

### 二、一次屏幕更新经过触发、渲染和提交

首次挂载或 state 更新会**触发（trigger）**工作。React 随后进入**渲染阶段（render phase）**，调用相关组件并递归计算下一棵树；最后在**提交阶段（commit phase）**把必要变化应用到 DOM，并运行布局与普通 Effect 的相应生命周期。

渲染和浏览器绘制不是同一个词。React 提交 DOM 后，浏览器还要做样式、布局、绘制和合成。某次 render 也不保证产生 DOM 变化：如果新旧输出相同，提交可以不修改相应节点。

理解阶段分离很重要。render 中不能读取刚提交后的 DOM 尺寸；需要在提交后读取。Effect 中设置 state 可能触发下一轮渲染；它不是当前 render 的延续。

### 三、纯渲染让重做成为可能

相同 props、state 和 context 应得到相同 JSX，渲染过程也不修改外部世界。这叫**组件纯度（component purity）**。

```tsx
// 不纯：每次 render 都改变模块级数据
let nextId = 0;
function BadItem() {
  return <li>{nextId++}</li>;
}

// 纯：ID 是明确输入
function Item({ id }: { id: number }) {
  return <li>{id}</li>;
}
```

网络请求、存储写入、订阅、DOM 修改、随机数和当前时间都不应在 render 中产生不可控副作用。纯度不等于组件永远显示不变；它允许输入变化时得到新输出。事件处理器可以响应用户动作，Effect 可以与外部系统同步，但 render 本身必须像一次可重放计算。

### 四、Strict Mode 重复调用是检测手段

开发环境的 Strict Mode 会额外调用部分函数和执行 Effect 的建立—清理—重建流程，用来暴露不纯渲染和缺失清理。它不是生产环境“一定执行业务两次”的承诺，也不应通过关闭 Strict Mode 掩盖问题。

```tsx
function Price({ value }: { value: number }) {
  console.log('render', value);
  return <output>{value}</output>;
}
```

看到两次 render 日志不等于提交了两次 DOM，也不等于事件处理器被点击两次。要把组件调用、DOM commit、Effect 和真实请求分别记录，才能判断重复发生在哪一层。

### 五、state 是某次渲染的快照

`useState` 返回当前 render 的值和用于请求更新的 setter。调用 setter 不会改写当前函数中的变量；它把更新加入队列并安排新的 render。

```tsx
function Counter() {
  const [count, setCount] = useState(0);

  function addOnce() {
    setCount(count + 1);
    console.log(count); // 仍是当前快照中的 0
  }

  return <button onClick={addOnce}>{count}</button>;
}
```

每次 render 创建的事件处理器会闭包捕获那次 render 的值。这叫**状态快照（state snapshot）**。旧处理器稍后运行时看到旧快照，不是 React 把变量“缓存错了”，而是 JavaScript 闭包与 React render 共同形成的确定语义。

### 六、更新队列决定多次 setter 如何合并

```tsx
setCount(count + 1);
setCount(count + 1);
setCount(count + 1);
```

三行都从同一快照计算相同的替换值。若需要基于队列中的前一个结果累积，传入更新函数：

```tsx
setCount(previous => previous + 1);
setCount(previous => previous + 1);
setCount(previous => previous + 1);
```

更新函数必须纯粹，因为 React 也可能额外调用它检查问题。值式更新适合结果只依赖当前事件中已知的固定值；函数式更新适合依赖同一队列中的前一个 state。不要机械地把所有 setter 都写成函数，也不要在需要累积时用旧快照计算。

### 七、批处理减少中间提交

React 通常会把同一事件或异步边界中安排的多个更新一起处理，这叫**批处理（batching）**。批处理让组件在处理器结束后统一进入下一轮 render，避免每行 setter 都产生一次中间 DOM。

批处理不是事务系统：它不提供跨网络、存储或多个用户操作的原子性，也不保证外部系统与 UI 同时成功。业务原子性仍应由领域状态、请求协议和服务端保证。

需要立刻读取 DOM 的少数集成场景可能使用同步提交能力，但它会削弱调度与性能，不能用来模拟“setter 后立即改变变量”。多数代码应该在下一次 render 中读取新 state。

### 八、异步回调携带创建时的快照

```tsx
function sendLater() {
  const messageAtClick = message;
  setTimeout(() => send(messageAtClick), 1000);
}
```

这种行为有时正是需求：用户点击发送时，应发送点击时的内容，而不是一秒后正在编辑的新内容。如果需求是使用执行时最新值，可以重新设计数据流、使用函数式更新，或在确实需要逃生口时用 ref 保存最新值。

ref 是可变容器，修改它不会触发 render。它适合 DOM 实例、计时器句柄和“最新回调”桥接，不应取代应显示在 UI 上的 state。过度使用 ref 会绕开 React 的可追踪更新模型。

### 九、组件身份由树位置和 key 决定

React 把 state 关联到渲染树中的位置，而不是组件函数名字。相同类型出现在相同位置时通常保留 state；类型或 key 变化会形成新身份并重置其子树。

```tsx
<Editor key={documentId} documentId={documentId} />
```

当切换文档必须丢弃草稿时，使用稳定业务 ID 作为 key 可以明确表达身份变化。不要用 `Math.random()` 或数组下标作为动态列表 key；随机 key 会每次重建，索引 key 在插入、排序后可能把某行状态错误地移给另一行。

### 十、props、state 与普通变量的边界

- props：由父层拥有，本组件只读；
- state：由 React 保存，变化后需要重新渲染；
- 普通变量：本次 render 内的临时计算；
- ref：跨 render 保存但不触发界面更新的可变值。

例如筛选后的列表、总价和错误摘要能由当前 props/state 得到，就应在 render 中计算。把它们复制进 state 会产生两个真源，需要额外同步并可能短暂不一致。

### 十一、不要用 Effect 修补渲染模型

初学者常在“值没有及时更新”时增加 Effect：监听 A 后再设置 B。若 B 只是 A 的函数，这会先提交旧 B，再运行 Effect 设置新 B，造成额外 render 和可见的不一致。先判断是否能在 render 直接派生，或在用户事件中一次更新真正的源状态。

Effect 的职责是让 React 状态与网络连接、媒体、定时器、第三方控件等外部系统保持同步。它不是通用的“render 后执行代码”抽屉。完整 Effect 规则会在 REACT-04 讲解。

### 十二、从错误现象反推阶段

遇到重复、旧值或闪烁时，先问：

1. 是组件函数被调用多次，还是 DOM 真的提交多次？
2. 回调来自哪一次 render，捕获了哪张快照？
3. 多个 setter 是替换值还是更新函数？
4. 是否把派生值复制成了第二份 state？
5. key 是否让 React 错认或重建组件身份？

React DevTools、DOM 断言和带 render/commit 区分的日志比“加一个 timeout 看看”可靠。日志本身也应避免修改状态，否则观察会改变被观察对象。

### 十三、与 Vue 响应式模型的区别

React 组件每次 render 读取一张快照，并通过显式 setter 请求新 render；Vue 通常通过 ref/代理跟踪读取依赖，并在响应式值变化后调度更新。二者都批处理并最终提交 DOM，但不能把 Vue 的“修改代理属性”机械翻译成 React 中直接改 state 对象。

跨框架理解应比较状态所有权、依赖收集、更新触发和提交边界，而不是只找同名 API。

### 进阶：并发渲染要求 render 可暂停、重做和丢弃

React 可能开始一次 render，因更高优先级更新而暂停，随后从新的状态重新计算，先前结果甚至不进入 commit。只要 render 是纯计算，这种调度不会改变业务语义；若 render 中发请求、写全局对象或递增计数器，被丢弃的工作也留下副作用，问题便会随机出现。

因此“函数执行过”不等于“用户看到了”。DOM 测量、订阅和命令式第三方组件接入应在 commit 后建立并可清理；事件处理器负责用户动作；服务器写入需要独立幂等合同。Profiler 中的 render 次数也不能直接当成提交次数或用户卡顿，必须结合 commit 和浏览器时间线判断。

### 进阶：更新优先级改变揭示顺序，不改变状态事实

输入回显是紧急更新，昂贵筛选可被标记为非紧急工作。调度器可以让输入先响应并中断旧筛选，但所有计算仍应从各自捕获的 state snapshot 出发。不要因为使用 transition 就接受旧请求覆盖、新旧状态混写或没有取消的副作用；优先级只调度工作，数据身份与竞态仍由应用负责。

测试时让多次输入快速发生，断言最终界面对应最新输入、旧工作不提交，并检查 pending 提示不会阻断可用内容。这样才能区分“更流畅的揭示”与“正确的数据结果”。

任何优先级方案都应保留关闭并发优化的对照路径，以便证明行为一致且收益真实。

### 学完后应能说明

你应能画出触发—渲染—提交—浏览器绘制的顺序，解释纯度为什么允许重复计算，说明 state snapshot、闭包和批处理如何共同决定结果，区分值式与函数式更新，并用树位置与 key 预测 state 的保留或重置。
