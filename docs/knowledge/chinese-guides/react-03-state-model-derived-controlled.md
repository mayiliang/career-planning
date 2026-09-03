# React 知识点讲义

## REACT-03 状态建模、派生状态与受控模式

React 状态问题经常不是 setter 写法问题，而是模型问题：同一事实保存了两份、编辑中的文本被强迫变成业务数字、对象身份和 UI 位置混淆、异步状态被压成几个互相矛盾的布尔值。状态建模的目标是找出最小源状态，让其余值可在渲染时确定，并把所有权与重置规则写清楚。

### 学习前先确认

- 直接前置：[REACT-02 组件边界、数据流与组合](../chinese-guides/react-02-component-boundaries-data-flow-composition.md#react-02)。它会继续链接 React 渲染、TypeScript、HTML 和 JavaScript 基础。

Reducer 与 Context 在 REACT-06，服务器数据与乐观更新在后续数据知识点。本讲先建立组件树内的状态模型。

### 一、先区分源状态、派生值和外部数据

从现有事实计算出的结果称为**派生状态（derived state）**；决定谁能修改某份事实，就是确定**状态所有权（state ownership）**。把实体按 ID 存放、关系另存为 ID 的方式称为**状态归一化（state normalization）**，能减少重复事实。输入值由父级决定的组件则称为**受控组件（controlled component）**。

源状态是无法从当前其他输入得到、且随交互变化的最小事实。派生值可以从 props、state 和 context 纯计算得到。外部数据由服务器、URL、存储或其他系统拥有，不应无条件复制为本地真源。

```tsx
const [quantityText, setQuantityText] = useState('2');
const quantity = parseQuantity(quantityText);
const total = quantity === null ? null : quantity * unitPrice;
```

这里输入文本是源状态，解析数量和总价是派生值。若同时保存 `quantity` 和 `total`，每次价格或文本变化都要同步三处，任何遗漏都会出现短暂或永久不一致。

### 二、冗余 state 产生同步债务

```tsx
// 不推荐
const [orders, setOrders] = useState<Order[]>([]);
const [visibleOrders, setVisibleOrders] = useState<Order[]>([]);
```

如果 `visibleOrders` 只由 `orders` 和 `filter` 得到，应在 render 计算。昂贵时可在测量后 `useMemo`，但 memo 仍是派生缓存，不是第二真源。

每增加一份冗余 state，就增加“何时更新、谁先更新、失败如何回滚、props 变化怎么办”的同步合同。能删除的 state 通常比再加一个 Effect 更可靠。

### 三、表单编辑态不等于领域值

数字输入在编辑中会经历空字符串、负号、小数点或尚未完成的本地格式。把 state 定义为 `number` 会迫使每个按键立刻成为合法业务值，导致光标跳动和无法清空。

```ts
type QuantityParse =
  | { kind: 'empty' }
  | { kind: 'invalid'; reason: string }
  | { kind: 'valid'; value: number };
```

保存文本，渲染时解析为结构化结果；提交时只接受 valid。这样 UI 能显示用户当前输入，领域层仍只接收合法数字。日期、金额、电话号码和本地化格式都遵循同一原则。

### 四、相关状态应一起更新，互斥状态应合并表达

若两个值必须原子变化，可以放同一对象或 reducer 动作；但不要仅因为“属于同一页面”把所有字段塞进一个对象。

多个互斥布尔值容易出现 impossible state：

```ts
// loading=true, success=true 是否可能？
type RequestState<T> =
  | { kind: 'idle' }
  | { kind: 'pending'; previous?: T }
  | { kind: 'success'; data: T }
  | { kind: 'error'; error: AppError; previous?: T };
```

判别联合让每个状态携带自己需要的数据，渲染可以穷尽处理。取消、空数据和权限拒绝是否单独建状态，取决于用户体验和恢复方式。

### 五、用 ID 建立选择关系

集合中的选择通常保存 ID，不复制整条记录：

```tsx
const selected = items.find(item => item.id === selectedId) ?? null;
```

集合刷新后能自然得到新对象。若记录删除，派生结果变 null，界面按明确规则恢复。保存对象副本会在后台更新、权限变化或乐观替换后陈旧。

ID 必须有稳定语义。数组索引不是业务 ID，标题也可能修改。TypeScript 品牌类型可以防止把 UserId 与 OrderId 混用，但运行时仍需校验来源。

### 六、状态所有者是能协调所有使用者的最近组件

两个兄弟需要同一展开项时，把 ID 提升到最近父层；只有某输入内部使用的焦点或草稿留在局部。提升过高会让不相关区域重渲染和耦合，过低则产生多个副本。

判断问题：

1. 哪些组件读取这份状态？
2. 哪些事件修改它？
3. 切换业务实体时是否保留？
4. URL 刷新后是否需要恢复？
5. 它是客户端交互状态还是服务器真源？

答案决定 local state、共同父层、URL、Context、store 或服务器缓存，而不是框架流行写法。

### 七、受控组件把所有权放在父层

```tsx
function SearchBox({ value, onChange }: {
  value: string;
  onChange(next: string): void;
}) {
  return <input value={value} onChange={event => onChange(event.target.value)} />;
}
```

父层提供当前值并接受修改意图，称为**受控模式（controlled pattern）**。好处是多个消费者一致、可从 URL 或规则统一更新；代价是调用合同更完整，父层必须及时传回新值。

非受控输入由 DOM 或组件自身保存，适合简单局部表单或文件输入。`defaultValue` 只提供初始值。不要运行中在受控与非受控之间切换，否则会出现警告和不可预测状态。

### 八、内部草稿与已提交值是两种事实

编辑弹窗可以把父层已提交对象复制成局部草稿，因为二者有不同生命周期：父值是权威已保存状态，草稿允许暂时偏离，确认后提交，取消后丢弃。

复制前必须写清同步规则：打开时初始化；编辑中父对象更新怎么办；保存失败是否保留草稿；切换实体是否提示未保存。不能用 Effect 每次 props 变化都覆盖草稿，也不能永久忽略父层版本变化。

可以给草稿记录基线版本，在提交时检测冲突。这比“last write wins 且用户无提示”更符合高级业务系统。

### 九、组件位置和 key 决定局部 state 生命周期

React 把 state 与树位置关联。同一位置渲染同一组件类型会保留 state；改变类型或 key 会重置。

```tsx
<ProfileEditor key={user.id} user={user} />
```

当切换用户必须创建全新草稿时，key 是清晰声明。若只是主题变化，不应换 key。把组件函数定义在另一个组件内部会让每次父 render 产生新的组件类型，从而意外重置 state，应把组件定义放模块顶层。

CSS 隐藏不重置 state，条件卸载通常会。路由、Tab 和 KeepAlive 类需求要先定义是否保留，再选择结构。

### 十、不要用 Effect 同步可派生 state

```tsx
// 多一次提交且可能显示旧 fullName
useEffect(() => setFullName(`${first} ${last}`), [first, last]);
```

直接在 render 计算即可。若需要在某个输入变化时重置局部 state，优先通过 key 表达身份变化，或在事件中同时更新相关源状态。Effect 应用于外部系统同步，而不是把 React 内部数据从一个 state 复制到另一个。

### 十一、更新对象和数组要创建新路径

React 依靠新值通知更新，也依赖不可变数据便于快照、memo 和时间线调试。不要直接修改现有 state 对象：

```tsx
setForm(previous => ({
  ...previous,
  address: { ...previous.address, city: nextCity },
}));
```

“不可变更新”不是深冻结所有对象，而是本次更新不修改旧快照中已存在的路径。对于复杂嵌套，先审视模型是否过深，或使用 reducer/经过审计的不可变辅助库。把服务器实体和编辑表单分成不同结构常能降低更新复杂度。

### 十二、状态归一化减少重复实体

多个列表包含同一用户时，重复保存完整用户对象会各自陈旧。可用 `byId` 与 ID 列表表示关系：

```ts
type UsersState = {
  byId: Record<UserId, User>;
  visibleIds: UserId[];
};
```

归一化适合复杂客户端集合，但不应在每个小页面机械应用。服务器状态缓存通常已经处理实体/查询关系，重复复制到 Context 或 reducer 会制造第二缓存。先明确谁拥有刷新、过期和错误。

### 十三、URL 可以是可分享状态的所有者

搜索词、页码、排序和选中标签如果应在刷新、前进后退和分享链接后保留，URL 往往比组件 state 更合适。组件从路由参数派生当前值，用户动作通过导航更新 URL。

不要同时把 URL 参数和本地 state 当真源再用双向 Effect 同步。需要输入草稿时可区分 `draftQuery` 与已提交 `searchParams`，在提交动作发生时更新 URL。

### 十四、异步结果提交前重新确认身份

即使 state 模型正确，旧请求也可能晚到。保存 `selectedId` 不代表异步回调自动知道当前 ID。发起请求时记录版本/请求 ID，完成时只提交仍属于当前状态的结果，并在切换或卸载时取消可取消工作。

```ts
if (requestId !== latestRequestId.current) return;
```

取消节省资源，版本门禁保护状态正确性。两者都不能用一个 `isLoading` 布尔值替代。

### 十五、用状态表和不变量评审模型

在写组件前列出状态、事件、允许转移与保持不变的条件。例如编辑器：closed → editing → submitting → success/error；切换实体时草稿如何处理；错误后是否可重试。

测试应覆盖不变量而不只是一次点击：总价始终由当前价格与有效数量得到；删除记录后 selected 不指向不存在 ID；切换 key 后草稿重置；空输入不被强制成 0；旧请求不能覆盖新选择。

### 十六、性能不是增加 state 的理由

把派生值存 state 常被误称为“缓存”，实际会增加 render 和同步。纯计算真的昂贵时，先测量，再用 `useMemo` 作为可丢弃优化；语义仍应允许 React 重新计算。memo 不能修复不纯函数，也不能成为数据持久层。

状态越小、所有权越近、关系越显式，React 越容易只更新必要区域。性能优化会在 REACT-07 系统展开。

### 进阶：撤销历史应记录领域操作或受控快照

需要 undo/redo 时，不能把整个组件树和网络状态任意深拷贝。小型纯客户端编辑器可保存结构共享的领域快照；大型状态适合记录可逆命令、补丁或事件，并限制历史容量。临时悬浮、请求 loading 和服务端缓存通常不属于可撤销事实。

每次撤销都要保持不变量，并说明外部副作用是否可补偿。已经发送的邮件或支付不能靠前端 state 回退，UI 应发起明确的反向业务动作。测试连续编辑、撤销后新分支、容量淘汰与服务器冲突，而不只检查按钮可点击。

### 进阶：乐观状态是有身份的暂定事实

乐观新增可带临时 ID、operation ID 和基准版本；服务器成功后按身份替换，失败只撤销对应操作。多个请求并发时，用整个旧列表快照回滚会覆盖后来成功的变化。状态模型应显式表达 pending/confirmed/failed 或保留补丁队列。

如果业务无法安全合并，宁可串行同一实体的写入或重新取权威数据。乐观 UI 是体验选择，不是绕过服务端验证和冲突处理的理由。

### 学完后应能说明

你应能区分源状态、派生值、编辑草稿、URL 与服务器数据，识别冗余和 impossible state，解释受控/非受控、ID 派生、key 重置和不可变更新，并用状态表、不变量和竞态测试证明模型在边界条件下仍一致。
