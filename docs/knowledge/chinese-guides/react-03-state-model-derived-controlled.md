# React 知识点讲义

## REACT-03 状态建模、派生状态与受控模式

你改了数量，总价却没变；切换资料，编辑器还留着上一份草稿；请求明明失败，页面却同时显示“成功”和“加载中”。这些问题往往不是 setter 少调用一次，而是同一事实存了多份，或者不同事实被挤进了一个变量。

本篇从“需要记住什么”开始，用计划输入、加载状态、受控表单和版本化草稿建立可推理的模型。先让数据关系清楚，再考虑缓存和更复杂的状态工具。

### 学习前先确认

- 直接前置：[REACT-02 组件边界、数据流与组合](../chinese-guides/react-02-component-boundaries-data-flow-composition.md#react-02)。它会继续链接快照、HTML 和 TypeScript 基础。

每段 TSX 都是独立 App.tsx，可以在已有 React + TypeScript 项目中运行。先按正文操作，再改一个条件观察差异。Reducer、Context 与服务器缓存的完整设计留给后续知识点。

### 先列事实再决定哪些需要 state

假设页面显示“每天学习分钟 × 计划天数”。分钟文本允许编辑，天数来自当前计划，总分钟数可以计算。它们都显示在页面上，却不必都成为 state。

| 页面上的信息 | 怎样得到 | 是否单独保存 |
| --- | --- | --- |
| 用户正在输入的分钟文本 | 用户每次编辑 | 需要 |
| 文本是否能解析成合法分钟 | 从当前文本判断 | 通常不需要 |
| 总分钟数 | 合法分钟乘计划天数 | 通常不需要 |
| 已确认的计划 | 用户成功提交时确定 | 若允许草稿偏离，就需要 |
| 搜索后可见条目 | 集合与搜索条件计算 | 通常不需要 |

**源状态（source state）**是当前无法从其他输入直接得到、又需要记住的事实。**派生状态（derived state）**是可以计算得到的结果；实际代码里常把它写成普通变量，不一定使用 state API。

这里的“最小”指避免重复事实，不是把所有信息压成一个难懂的字符串。多个独立状态可以分别保存；确实必须一起转换的状态可以放在同一个结构中。

### 编辑文本和有效数量是两种不同的信息

文本框正在输入什么，与它是否符合业务规则，是不同层次。清空 25 再输入 30 时，空字符串是合理的编辑过程，但不一定是可提交数量。

```tsx example=react03-quantity
import { useId, useState, type FormEvent } from 'react';

type Parsed = { kind: 'empty' } | { kind: 'invalid'; reason: string } | { kind: 'valid'; value: number };
function parseMinutes(text: string): Parsed {
  const trimmed = text.trim();
  if (!trimmed) return { kind: 'empty' };
  if (!/^\d+$/.test(trimmed)) return { kind: 'invalid', reason: '请填写整数分钟' };
  const value = Number(trimmed);
  return Number.isSafeInteger(value) && value >= 1 && value <= 480
    ? { kind: 'valid', value }
    : { kind: 'invalid', reason: '分钟应在 1 到 480 之间' };
}
export default function App() {
  const id = useId();
  const [minutesText, setMinutesText] = useState('25');
  const [attempted, setAttempted] = useState(false);
  const [saved, setSaved] = useState<number | null>(null);
  const parsed = parseMinutes(minutesText);
  const total = parsed.kind === 'valid' ? parsed.value * 5 : null;
  const error = !attempted || parsed.kind === 'valid' ? ''
    : parsed.kind === 'empty' ? '请填写每日学习分钟' : parsed.reason;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    if (parsed.kind === 'valid') setSaved(parsed.value);
  }
  return (
    <main>
      <h1>五天学习计划</h1>
      <form onSubmit={submit} noValidate>
        <label htmlFor={id}>每日分钟</label>
        <input id={id} value={minutesText} inputMode="numeric" aria-describedby={`${id}-error`}
          aria-invalid={error ? true : undefined} onChange={event => setMinutesText(event.target.value)} />
        <p id={`${id}-error`} hidden={!error}>{error}</p>
        <button type="submit">确认计划</button>
      </form>
      <p>预计总分钟：{total ?? '待填写'}</p>
      <p>已确认每日分钟：{saved ?? '尚未确认'}</p>
    </main>
  );
}
```

初始总量为 125；清空后显示待填写，输入仍保持空白；提交才显示错误。输入 30 后总量立即成为 150，但已确认计划要等点击确认才改变。

parseMinutes 没有修改 state，只把文本解释成 empty、invalid 或 valid。每轮 render 重新计算，结果始终对应当前文本。把 parsed 和 total 再分别存 state，就会多出“改文本时是否也改了解析和总量”的同步责任。

inputMode 只是输入提示，不替代校验。输入框保留字符串，业务提交只接受 valid 中的数字。金额、日期或本地化数字需要各自的解析规则，也应先允许编辑中的中间状态。

在 [Vue 的计划输入](../chinese-guides/vue-03-template-directives-events-forms.md#输入过程允许暂时不是合法业务值)中，源文本与派生结果由 ref 和 computed 连接；这里使用 state 和普通计算。两种实现都应先保持相同的数据含义。

### 删除一份冗余数据比补一条同步更直接

如果页面已有 items、query，就在 render 中算 visibleItems；如果已有 firstName、lastName，就算 fullName。不要先复制一份，再用 Effect 监听来源并更新副本。

多余副本不仅增加一行 setter，还增加初始值、更新顺序、错误恢复与 props 变化时的处理。派生值在 Effect 中更新，可能先提交旧结果再触发下一轮更新。能直接计算时，不需要这段等待。

计算很昂贵才考虑 useMemo 等缓存。缓存是可以丢弃后重算的优化，不应该承担“这就是唯一事实”的责任。若删除缓存后行为改变，通常需要先修正计算纯度或数据来源。

也不要把服务器查询结果不加区分地复制进本地 store。先明确谁负责刷新、过期、失败与缓存；否则两份数据各自更新，UI 无法判断哪份才是当前结果。

### 互斥状态用一种明确的分支表示

一个请求不应同时是 loading=true、success=true、error=true。但刷新期间显示旧结果可以是合理状态，不能为了“消除矛盾”把所有旧内容都清空。

```tsx example=react03-request-state
import { useState } from 'react';

type LoadState =
  | { kind: 'idle' }
  | { kind: 'pending'; previous: string | null }
  | { kind: 'success'; data: string }
  | { kind: 'error'; message: string; previous: string | null };
function currentData(state: LoadState): string | null {
  if (state.kind === 'success') return state.data;
  return state.kind === 'idle' ? null : state.previous;
}
export default function App() {
  const [state, setState] = useState<LoadState>({ kind: 'idle' });
  const [failNext, setFailNext] = useState(false);
  const data = currentData(state);
  async function load() {
    if (state.kind === 'pending') return;
    const previous = currentData(state);
    setState({ kind: 'pending', previous });
    try {
      await new Promise<void>(resolve => setTimeout(resolve, 200));
      if (failNext) throw new Error('本次刷新失败，原内容仍可阅读');
      setState({ kind: 'success', data: '已取得本周学习资料' });
    } catch (error) {
      setState({ kind: 'error', previous, message: error instanceof Error ? error.message : '加载失败' });
    }
  }
  return (
    <main>
      <h1>带旧内容的刷新</h1>
      <label><input type="checkbox" checked={failNext} disabled={state.kind === 'pending'} onChange={event => setFailNext(event.target.checked)} />模拟下次失败</label>
      <button type="button" disabled={state.kind === 'pending'} onClick={load}>{state.kind === 'pending' ? '正在刷新' : '加载或重试'}</button>
      <p>内容：{data ?? '暂无内容'}</p>
      {state.kind === 'error' && <p role="status">{state.message}</p>}
      {state.kind === 'success' && <p role="status">本次加载成功</p>}
    </main>
  );
}
```

先成功加载一次，再勾选失败并刷新。旧内容应仍然可见，同时出现失败说明；取消模拟失败，再重试可恢复。pending.previous 和 error.previous 明确表达旧内容为什么还在，没有第二个不受管理的成功布尔值。

类型能要求错误分支携带 message，成功分支携带 data。这与 [TS-02 的判别联合](../chinese-guides/ts-02-unions-narrowing-never-exhaustiveness.md#判别联合把一个状态和它需要的数据放在一起)对应。但类型不决定哪些事件有资格提交结果；这个示例限定同一时间只有一次本地加载，没有假装覆盖所有请求竞态。

### 一份状态放在能协调使用者的地方

**状态所有权（state ownership）**可以用四个问题确认：谁读取，谁修改，何时重置，离开当前界面后是否还需要。两个兄弟共用选择，把 ID 放在最近共同父层；只在一个输入里使用的临时草稿，不必立刻提升到根组件。

URL、服务器与组件也可以是不同事实的拥有者。搜索条件需要支持分享和前进后退时，URL 常适合保存已提交查询；输入框里尚未提交的文字则可以是本地 draftQuery。它们含义不同，所以同时存在并不一定冗余。

先把输入输出和最近共同层想清楚，再考虑 Context、store 或缓存库。工具不会自动替你辨认“这两份数据是重复事实，还是有意不同的草稿与结果”。

### 受控值由外层决定非受控输入由 DOM 保存

**受控组件（controlled component）**接收当前值与修改回调；子层报告输入，父层传回新值。原生非受控输入则让 DOM 保存当前输入，提交时再读取。

```tsx example=react03-controlled
import { useId, useState, type FormEvent } from 'react';

function SearchBox({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const id = useId();
  return <label htmlFor={id}>受控关键词 <input id={id} value={value} onChange={event => onChange(event.target.value)} /></label>;
}
export default function App() {
  const [query, setQuery] = useState('表单');
  const [submitted, setSubmitted] = useState('尚未提交');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSubmitted(String(data.get('note') ?? ''));
  }
  return (
    <main>
      <h1>两种输入所有权</h1>
      <SearchBox value={query} onChange={setQuery} />
      <button type="button" onClick={() => setQuery('组件')}>从父层改为组件</button>
      <p>父层关键词：{query}</p>
      <form onSubmit={submit}>
        <label>非受控备注 <input name="note" defaultValue="周末复习" /></label>
        <button type="submit">提交备注</button>
        <button type="reset">重置备注</button>
      </form>
      <p>已提交备注：{submitted}</p>
    </main>
  );
}
```

在受控框中输入，父层文字立即同步；点击父层按钮，输入值变成组件。非受控备注在编辑时不更新已提交文本，提交时 FormData 才读取当前 DOM 值。重置会把非受控输入恢复到默认值，但不会自动清掉上一条已提交记录，因为那是另一份 state。

文本受控值应始终是字符串，避免从 undefined 切换到字符串；复选框通常使用 checked 与布尔值。受控输入的 onChange 要及时更新对应 state，或明确使用 readOnly；不能传一个固定 value 却期待用户自由修改。

defaultValue 表达初始或默认值，不是控制当前编辑值的通道。对于用户已经编辑过的非受控输入，后续 props 更新不能当作可靠的“强制改当前内容”方式。需要外层每次决定显示什么，就明确使用受控模式；文件输入等场景则遵循原生控件限制。

### 草稿可以不同但保存前要核对基线

编辑中的标题和已经保存的标题允许不同。关键是说明这份草稿从哪个版本开始，父层在编辑途中更新时怎么办。

```tsx example=react03-draft-version
import { useId, useState, type FormEvent } from 'react';

type Saved = { id: string; title: string; version: number };
function Editor({ saved, onSave, onCancel }: {
  saved: Saved;
  onSave: (title: string, baseVersion: number) => void;
  onCancel: () => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(saved.title);
  const [baseVersion] = useState(saved.version);
  const conflict = saved.version !== baseVersion;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!conflict && draft.trim()) onSave(draft.trim(), baseVersion);
  }
  return (
    <form onSubmit={submit}>
      <label htmlFor={id}>标题草稿</label>
      <input id={id} value={draft} onChange={event => setDraft(event.target.value)} required />
      {conflict && <p role="status">资料已有新版本。请取消后重新打开，核对最新内容。</p>}
      <button type="submit" disabled={conflict || !draft.trim()}>保存草稿</button>
      <button type="button" onClick={onCancel}>取消编辑</button>
    </form>
  );
}
export default function App() {
  const [saved, setSaved] = useState<Saved>({ id: 'component', title: '组件边界', version: 1 });
  const [editing, setEditing] = useState(false);
  function save(title: string, baseVersion: number) {
    if (saved.version !== baseVersion) return;
    setSaved({ ...saved, title, version: saved.version + 1 });
    setEditing(false);
  }
  return (
    <main>
      <h1>有版本的资料草稿</h1>
      <p>已保存：{saved.title} / 版本 {saved.version}</p>
      <button type="button" onClick={() => setEditing(true)} disabled={editing}>开始编辑</button>
      <button type="button" onClick={() => setSaved(previous => ({ ...previous, title: '外部更新的标题', version: previous.version + 1 }))}>模拟外部更新</button>
      {editing && <Editor key={saved.id} saved={saved} onSave={save} onCancel={() => setEditing(false)} />}
    </main>
  );
}
```

开始编辑并修改草稿，然后模拟外部更新。草稿应保留，页面提示冲突并禁止覆盖；取消后重新打开，才以新标题和新版本开始。正常编辑保存则更新父层并关闭编辑器。

这里没有用 Effect 把每次 saved 变化都复制到 draft，否则外部更新会无声覆盖用户输入。baseVersion 刻意在实例创建时记录，后续通过 props 读取当前版本，两者比较才有意义。

这是本地组件模型示例；真实网络保存应把基准版本交给服务端，并由服务端执行并发检查。本地比较只保护当前 UI，不能在另一个用户同时修改时替服务端作保证。

### 重置应跟随身份或明确动作

例子里取消会卸载 Editor，下次打开建立新实例，因此重新初始化草稿。key 使用稳定资料 ID；同一资料版本变化时 key 没变，才允许保留草稿并显示冲突。

如果把 key 改成版本号，每次外部更新都会重新挂载，冲突出现之前草稿就被重置了。如果把 key 设成随机数，每次父层 render 又可能丢输入。key 的选择会改变产品行为，应与“什么时候允许丢弃草稿”一起决定。

CSS 隐藏通常保留组件状态，条件卸载通常结束实例。路由切换、标签页和弹窗是否保留草稿，也应先约定再选择结构。不要为了保留状态就把所有编辑器永久藏在 DOM 中，也不要在需要保留时随意更换身份。

更多身份机制可回看 [REACT-01](../chinese-guides/react-01-render-purity-state-snapshot.md#组件身份决定草稿保留还是重置)，这里新增的是状态生命周期的产品含义。

### 集合里保存 ID 可以少一份陈旧对象

选择关系通常只需 selectedId，再从当前集合查找对象。集合刷新时自然读到新版本，删除后派生为 null。若 state 同时保存整条 selectedItem，集合变了以后还要同步这一份副本。

当同一实体被多处引用时，可以进一步按 ID 存实体，让关系保存 ID。这叫**状态归一化（state normalization）**。

```tsx example=react03-normalized
import { useState } from 'react';

type Lesson = { id: string; title: string };
const initial: { byId: Record<string, Lesson>; ids: string[]; selectedId: string | null } = {
  byId: { form: { id: 'form', title: 'HTML 表单' }, state: { id: 'state', title: '状态建模' } },
  ids: ['form', 'state'],
  selectedId: 'form',
};
export default function App() {
  const [state, setState] = useState(initial);
  const selected = state.selectedId === null ? null : state.byId[state.selectedId] ?? null;
  function remove(id: string) {
    setState(previous => {
      const byId = { ...previous.byId };
      delete byId[id];
      return { byId, ids: previous.ids.filter(value => value !== id), selectedId: previous.selectedId === id ? null : previous.selectedId };
    });
  }
  return (
    <main>
      <h1>资料与选择关系</h1>
      <ul>{state.ids.map(id => {
        const lesson = state.byId[id];
        return lesson ? <li key={id}>
          <button type="button" aria-pressed={state.selectedId === id} onClick={() => setState(previous => ({ ...previous, selectedId: id }))}>{lesson.title}</button>
          <button type="button" onClick={() => remove(id)}>删除 {lesson.title}</button>
        </li> : null;
      })}</ul>
      <p>当前选择：{selected?.title ?? '未选择'}</p>
    </main>
  );
}
```

删除当前选中的表单，集合与选择在同一个 updater 中更新，详情变成未选择。byId 只保存一份实体，ids 表达顺序；它们不同于重复保存完整记录的多个列表。

这里使用显式索引缺失检查，因为字符串 ID 不保证一定有记录。实际模型还应保持“ids 中每个 ID 都存在于 byId”的不变量。小型两项列表完全可以直接用数组；归一化用于关系确实复杂时，不是每个输入框都要遵守的模板。

### 不可变更新只复制变化经过的路径

上面的 remove 创建新字典再删除，不会删除旧 state 中的记录。更新某个对象字段时，也应创建对应新对象；只浅拷贝最外层，却修改里面共享的实体，仍然破坏旧快照。

可以把一次变化画成路径：state → byId → 某个 lesson → title。变化经过的容器需要新的身份，没有变化的条目可以继续共享。相关机制见 [JS-03 的不可变更新](../chinese-guides/js-03-types-equality-copy-immutability.md#不可变更新沿修改路径创建新对象)。

不必为每次改一个字都深拷贝整棵树。模型太深时，先考虑拆分领域对象和表单结构，再选择 reducer 或适合的不可变辅助工具。目标是让旧值仍可解释，让新值明确表达变化。

### URL 状态与输入草稿可以各自有职责

需要分享的关键词、页码和排序适合由路由参数表达。组件从 URL 解析已提交条件，用户确认后通过导航更新 URL，这样刷新和前进后退才有一致含义。

输入框不一定每敲一个字就更新历史记录。可以保存 draftQuery，点击检索时提交给 URL；按后退时再按照明确规则采用地址中的条件。replace 适合替换当前历史项，push 适合形成可后退的操作记录，具体取决于产品需求。

不要同时让 URL 和本地 query 都自称权威，再用两个 Effect 相互纠正。草稿允许偏离已提交条件时，两个名字就应表明差别。路由工具还应负责订阅地址变化；仅调用 history.pushState 不会自动让普通 React 组件重新渲染。

### 旧请求有没有资格更新由身份决定

请求发起时捕获的 selectedId 属于那次渲染，回来时可能已经切换到另一份资料。状态模型再整齐，也不会自动拒绝旧结果。

为请求记录 ID、任务版本或目标实体，完成时核对它是否仍属于当前任务。取消用于减少不需要的工作，版本判断用于保护提交资格；两者不能都被一个 isLoading 代替。参见 [JS-05 的旧请求清理](../chinese-guides/js-05-promise-errors-async-control-flow.md#新请求开始后旧请求的清理也可能过期)和 [TS-02 的状态转换](../chinese-guides/ts-02-unions-narrowing-never-exhaustiveness.md#类型描述状态版本判断决定谁能更新状态)。

本篇的加载示例限定同一时间只有一个请求，草稿示例则用实体版本处理外部修改。它们分别说明不同层次的问题，不应把其中一个复制到所有异步流程后就认为竞态已经消失。

### 撤销只回退你明确记录的事实

简单文本编辑可以保存有限的快照历史。下面用“添加提示”演示撤销、重做和新分支，而不是每个按键都制造历史项：

```tsx example=react03-history
import { useState } from 'react';

type History = { past: string[]; present: string; future: string[] };
export default function App() {
  const [history, setHistory] = useState<History>({ past: [], present: '阅读正文', future: [] });
  function append() {
    setHistory(previous => ({ past: [...previous.past, previous.present].slice(-10), present: previous.present + ' → 做个例子', future: [] }));
  }
  function undo() {
    setHistory(previous => {
      const present = previous.past.at(-1);
      if (present === undefined) return previous;
      return { past: previous.past.slice(0, -1), present, future: [previous.present, ...previous.future] };
    });
  }
  function redo() {
    setHistory(previous => {
      const present = previous.future[0];
      if (present === undefined) return previous;
      return { past: [...previous.past, previous.present].slice(-10), present, future: previous.future.slice(1) };
    });
  }
  return (
    <main>
      <h1>有限的编辑历史</h1>
      <p>{history.present}</p>
      <button type="button" onClick={append}>添加提示</button>
      <button type="button" disabled={!history.past.length} onClick={undo}>撤销</button>
      <button type="button" disabled={!history.future.length} onClick={redo}>重做</button>
    </main>
  );
}
```

添加两次，撤销一次，再添加一次：原来的重做分支应清空。过去最多保留十步，避免无限积累。示例只回退本地文本，不包含请求状态、焦点或服务器数据。

已发送的邮件、已提交的服务端操作不会因为前端撤销而自动回滚。需要补偿时，应有明确反向业务动作；大型编辑器也可能更适合命令或补丁，而不是保存整个应用树。

乐观更新同样要记住操作身份。A 与 B 两个修改并发，A 失败后直接恢复整张旧列表，可能把已经成功的 B 也抹掉。用操作 ID、基准版本或对应补丁识别只应撤销的部分；无法安全合并时，可以串行同一实体的写入或重新取得权威结果。

### 用不变量检查模型是否清楚

不变量就是操作前后仍应成立的规则。例如总量总由当前有效分钟与天数计算；当前选择不存在时不显示陈旧对象；取消不修改已保存值；外部版本变化不静默覆盖草稿；撤销后新增操作清空旧重做分支。

这些规则可以直接对应前面的操作，而不必把测试扩展到所有内部细节。遇到 bug，先找哪条事实重复了、哪两个状态允许了矛盾组合、哪次结果失去了身份，再决定是否需要新工具。

状态建模做得好，通常表现为代码中需要同步的地方变少，用户动作与数据变化更容易一一对应，而不是类型或 Hook 数量更多。

### 参考与延伸阅读

- [React：Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure)：查冗余、矛盾与扁平数据关系。
- [React：Sharing State Between Components](https://react.dev/learn/sharing-state-between-components)：查共同拥有者、受控与非受控。
- [React：input](https://react.dev/reference/react-dom/components/input)：查 value、checked、defaultValue 和原生表单限制。
- [React：Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state)：查身份和状态生命周期。
- [React：You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)：检查哪些同步逻辑可以直接删除。
- [React：Updating Objects in State](https://react.dev/learn/updating-objects-in-state)：查对象更新与旧快照保护。
