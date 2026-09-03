# React 知识点讲义

## REACT-02 组件边界、数据流与组合

把页面拆成许多 `.tsx` 文件并不等于获得了清晰组件。好的组件边界要让状态所有权、输入输出合同、变化原因和可替换部分清楚；坏的边界则会造成 props 层层转发、子组件偷偷修改父层数据、同一状态复制多份，以及组件只能在某个页面的隐含上下文中工作。

### 学习前先确认

- 直接前置：[REACT-01 渲染、组件纯度与 state snapshot](../chinese-guides/react-01-render-purity-state-snapshot.md#react-01)。它会继续链接 TypeScript、HTML、模块和 JavaScript 运行模型。

本讲从组件职责、props 与事件自然推进到组合、状态提升、列表身份和边界取舍；Context 与 reducer 留到 REACT-06。

### 一、先从数据和变化来源识别职责

面对订单工作台，不要先按屏幕矩形切文件。先列出数据：订单集合来自哪里，筛选词由谁修改，选中订单由谁拥有，编辑草稿何时创建和丢弃，保存动作交给谁。

```text
OrderWorkspace  拥有筛选、选中 ID 与保存协调
├─ OrderFilter  显示输入并上报变化意图
├─ OrderList    显示集合并上报选择意图
└─ EditorFrame  提供标题、布局与组合位置
   └─ OrderEditor  管理当前订单草稿
```

组件边界应围绕一种稳定责任。既处理路由参数、请求、筛选、弹窗焦点又绘制每行按钮的组件，变化原因太多；只把一个 `<div>` 搬到子文件、仍传二十个无结构参数，则没有形成真正边界。

### 二、props 是只读输入合同

```tsx
type OrderRowProps = {
  order: Readonly<OrderSummary>;
  selected: boolean;
  onSelect(id: OrderId): void;
};

function OrderRow({ order, selected, onSelect }: OrderRowProps) {
  return (
    <button aria-pressed={selected} onClick={() => onSelect(order.id)}>
      {order.title}
    </button>
  );
}
```

props 描述父层允许子层知道什么。只读不是因为 JavaScript 自动冻结了对象，而是所有权合同：子组件不得修改 `order.title` 后期待父层同步。用户意图通过回调上行，父层决定状态是否改变并用新 props 重新渲染。

这种“数据下行、意图上行”叫**单向数据流（one-way data flow）**。它不要求所有 state 都放根组件，只要求每份状态有可识别的所有者。

### 三、回调名称应表达意图而不是 DOM 事件

`onClick` 只能说明发生了鼠标/激活事件，`onSelectOrder`、`onDismiss`、`onSubmitDraft` 则表达业务意图。子组件可以使用按钮实现意图，未来也能改成键盘命令而不改变父层合同。

```tsx
type EditorProps = {
  order: Order;
  onSubmit(draft: OrderDraft): Promise<void>;
  onCancel(): void;
};
```

回调的同步或异步语义也要明确。若子组件需要显示提交状态，应由合同返回 Promise 或接收显式状态；不要依赖“父层回调碰巧会抛错”。错误分类、重复提交和取消都属于合同的一部分。

### 四、最小 props 减少耦合但不能丢掉语义

把完整页面对象传给所有子组件容易让它们读取不属于自己的字段；把每个字段拆成十几个参数又会让调用处难读。选择与组件责任一致的最小稳定形状：

```ts
type OrderRowModel = Pick<Order, 'id' | 'title' | 'status'>;
```

不要为了复用让业务组件接收 `Record<string, unknown>` 或大量布尔开关。`compact`, `editable`, `showStatus`, `hideActions` 组合增长时，往往意味着一个组件承担多种模式，应拆成组合部件或显式变体。

### 五、状态应放在能协调所有消费者的最低共同层

筛选输入和列表都需要筛选词，父层应拥有它；只有编辑器使用的临时输入可留在编辑器。把状态移动到共同父层叫**状态提升（lifting state up）**。

提升不是越高越好。放到应用根会扩大更新范围、增加依赖并使局部复用困难。判断位置时问：谁读取、谁写入、何时重置、是否要跨路由保留。能在最近共同祖先解决，就不应直接进全局 store。

### 六、保存 ID 而不是复制可派生对象

```tsx
const selectedOrder = orders.find(order => order.id === selectedId) ?? null;
```

若 state 同时保存 `selectedId` 和完整 `selectedOrder`，订单集合更新后两份数据可能不同步。保存稳定 ID，并从当前集合派生对象，能让删除、权限变化和刷新自然反映。

当筛选使选中项不可见，要先定义产品语义：保持选择但隐藏编辑器、清除选择，还是在独立区域继续编辑。实现必须来自明确决策，不能由某个 Effect 偶然清除。保存前仍应根据当前权威数据解析 ID，避免提交陈旧对象。

### 七、列表 key 表达兄弟节点身份

```tsx
{orders.map(order => <OrderRow key={order.id} order={order} ... />)}
```

key 只需在同一兄弟集合中唯一并稳定。它帮助 React 在插入、删除、排序时把旧 state 与正确项目对应。数组索引在静态列表中可能暂时可用，但只要项目会重排、过滤或保存输入状态，就可能把焦点和草稿迁移到另一项。

key 不作为普通 prop 传给组件。组件需要 ID 时必须显式传入。不要通过改变随机 key 强制刷新来掩盖状态模型错误；只有业务身份确实变化、需要重置整个子树时才改变 key。

### 八、组合让容器不知道具体内容

```tsx
type PanelProps = PropsWithChildren<{
  title: string;
  actions?: ReactNode;
}>;

function Panel({ title, actions, children }: PanelProps) {
  return (
    <section aria-labelledby="panel-title">
      <header><h2 id="panel-title">{title}</h2>{actions}</header>
      {children}
    </section>
  );
}
```

**组合（composition）**让父层提供 children 或命名区域，容器负责结构和样式，而不需要知道内容的所有业务 props。它比把几十个配置项传给“万能卡片”更可扩展。

组合不自动解决语义。容器仍需保证标题 ID 唯一、landmark 合理、焦点顺序与 DOM 顺序一致。children 也不是安全边界；传入内容仍在同一 React 树和 JavaScript 信任域。

### 九、渲染函数适合需要参数的插槽

有时容器需要把内部状态暴露给调用者决定如何渲染：

```tsx
type DataBoundaryProps<T> = {
  value: T | null;
  children(value: T): ReactNode;
};
```

这种**渲染属性（render prop）**或函数 children 能表达“容器拥有加载/选择，调用者拥有展示”。但它会增加嵌套和闭包，普通组件组合已足够时不必使用。Hook 更适合复用无 UI 的有状态逻辑，组件更适合复用结构和生命周期，两者不能互相完全替代。

### 十、受控与非受控边界要明确

受控组件由父层传入当前值与修改回调：

```tsx
function SearchBox({ value, onChange }: {
  value: string;
  onChange(value: string): void;
}) {
  return <input type="search" value={value} onChange={e => onChange(e.target.value)} />;
}
```

非受控组件自己保存状态，父层只提供初始值。两者都合理，但同一状态不能一半受控、一半内部维护。`defaultValue` 只在初始化使用，后续父值变化不会自动重置。需要切换业务对象时，用明确 key 或重置动作，而不是同步两份值。

### 十一、组件 API 应包含空、错、忙与权限状态

只为成功数据设计的组件会在真实项目迅速泄漏条件判断。列表组件可能需要：加载骨架、空态、错误与重试、部分数据、只读权限。不要用四个互相冲突的布尔值表达状态；可以传判别联合或把状态边界放在父层组合：

```ts
type LoadState<T> =
  | { kind: 'pending' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: T };
```

权限不是隐藏按钮即可完成。组件可根据权限改善可见性，但真正写操作必须由服务端重新授权。

### 十二、组件边界也决定更新范围

父组件更新默认会重新调用其子组件。清晰边界有助于定位变化，但不应为了“防止 render”把每个标签拆组件。render 本身通常很便宜；只有测量显示昂贵计算或大子树重复工作时，才使用 memo 或调整状态位置。

把临时 hover、输入草稿留在需要它的子树，往往比全局 memo 更有效。性能优化在 REACT-07 进一步讲解。

### 十三、错误边界和异步边界要按故障域放置

组件边界不仅是复用单位，也是恢复单位。订单侧栏失败不应让整个应用空白；编辑器保存失败也不应清空列表。根据用户能否独立重试和继续任务来放置 Error Boundary、Suspense 或路由错误边界。

但不要给每个小组件都包一层 fallback。边界太细会产生碎片化体验，也难以协调共享状态。REACT-08 会深入讲解错误与 pending 的层级。

### 十四、如何判断是否拆错了

常见信号包括：

- 子组件需要知道父页面的路由和全局单例才能工作；
- props 大量成对出现且每次都一起变化；
- 父层只负责把同一批 props 原样转发许多层；
- 子层修改传入对象，父层通过重新获取“修复”；
- 一个组件有十几个布尔模式，组合结果无法预测；
- 测试必须构造整个应用才能验证一个简单展示行为。

调整边界时一次改变一个维度：先明确所有权，再提取纯展示或稳定组合区，最后才考虑 Context 或 store。边界重构应保持用户行为和可访问语义不变。

### 十五、测试组件合同而不是内部实现

按角色和可见文本操作，验证 props 对应的输出与用户事件对应的回调。不要断言内部 state 名、Hook 调用次数或私有组件层级。

```tsx
render(<SearchBox value="Ada" onChange={onChange} />);
await user.clear(screen.getByRole('searchbox'));
await user.type(screen.getByRole('searchbox'), 'Bo');
expect(onChange).toHaveBeenLastCalledWith('Bo');
```

还应覆盖空集合、身份变化、重排 key、禁用/只读、错误和键盘路径。一个“可复用”组件若只能在快乐路径下工作，其合同仍不完整。

### 进阶：组件合同也需要兼容演进

公共组件被多个页面或团队消费后，prop 改名、默认值变化、事件时机和 DOM 结构都可能成为破坏性变更。新增能力优先采用可选 prop 或组合槽位，弃用旧合同要给迁移期和诊断；不要让十几个布尔 prop 组合出无法说明的隐式状态机。

测试选择少量代表性消费者，验证类型、行为、键盘和服务端渲染。样式选择器若依赖内部 DOM，也应视为脆弱耦合并通过稳定 part/class 或组合 API替代。组件“可复用”不是调用次数多，而是所有权、扩展点和失败语义对消费者保持清楚。

### 学完后应能说明

你应能从数据所有权和变化原因划分组件，解释 props 只读与意图回调，判断 state 应提升到哪里，说明 ID 派生、稳定 key、children 组合和受控模式的边界，并用用户行为测试验证组件合同而非实现细节。
