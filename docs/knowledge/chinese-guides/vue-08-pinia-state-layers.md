# Vue 知识点讲义

## VUE-08 Pinia 与状态分层

Pinia 提供 Vue 应用级 store、DevTools 与测试支持，但“可以全局访问”不代表任何数据都应放进去。成熟状态架构先区分组件交互、路由、客户端领域状态、持久化偏好和服务器数据，再为每类状态选择所有者、生命周期、更新入口与安全边界。

### 学习前先确认

- 直接前置：[VUE-06 Composable、依赖注入与逻辑复用](../chinese-guides/vue-06-composables-injection-reuse.md#vue-06)。它会继续链接生命周期、组件合同、响应式与异步控制流。

路由在 VUE-07，测试/性能在 VUE-10，Nuxt SSR 在 VUE-11。本讲建立 store 与状态分层。

### 一、先给状态分类

Pinia 中一个业务状态域称为**状态仓库（store）**；其中保存事实的是**状态（state）**，纯派生读取是**获取器（getter）**，表达业务意图和异步协调的是**动作（action）**。跨刷新保留少量字段属于**状态持久化（state persistence）**，远端权威数据则属于**服务器状态（server state）**。

- 组件局部：弹窗开关、输入草稿、hover；
- URL：页码、筛选、选中标签等可分享/前进后退状态；
- 客户端领域状态：跨页面购物车、编辑会话、工作流；
- 服务器状态：查询结果、缓存、过期和后台刷新；
- 持久化偏好：主题、密度等允许保存的设置；
- 会话/安全：当前身份的最小展示信息，真实授权仍在服务端。

Pinia 适合其中部分客户端状态，不应成为所有类别的默认容器。

### 二、Store 表达一个状态域

```ts
export const useCartStore = defineStore('cart', () => {
  const lines = ref<CartLine[]>([]);
  const total = computed(() => lines.value.reduce((sum, line) => sum + line.price * line.quantity, 0));
  function add(product: Product) { /* enforce invariants */ }
  function remove(productId: ProductId) { /* ... */ }
  return { lines: readonly(lines), total, add, remove };
});
```

store ID 要稳定。state 是最小事实，getter/computed 是派生，action 是允许的变化入口。按业务域拆 store，比 `globalStore` 按页面不断追加字段更易维护。

### 三、Options 与 Setup Store 都要保持合同

Options store 显式分 state/getters/actions；Setup store 可组合 ref/computed/composable。Setup 更灵活，也更容易把私有状态、watch 和依赖生命周期混在一起。无论风格，都应返回需要被 Pinia 管理/序列化的 state，并避免模块级用户状态。

不要只根据语法偏好选风格。团队需考虑 SSR、插件、测试、HMR 和代码生成。公共合同应能从类型与文档看出，而不是依赖作者知道哪个 ref 能改。

### 四、Action 承担业务意图和异步协调

Action 可以异步，并通过 `this` 或闭包访问 state。它应表达 `checkout`、`applyCoupon` 等意图，负责调用服务、错误归一化和状态转移，而不是让组件串联多个底层 setter。

并发仍要处理 requestId、取消与幂等。多个组件调用同一 action 时，要决定共享一个进行中请求、排队还是分别执行。Pinia 不自动去重网络请求。

### 五、不要复制 getter 结果为 state

总价、筛选后列表、是否可结账能从当前 state 计算，就用 getter。复制会制造同步债务。昂贵 getter 是否缓存取决于调用和依赖；先测量，不要把缓存结果持久化。

Getter 也应纯粹，不发送请求或写 state。需要参数的 getter 实际返回函数，其内部结果未必按参数缓存；复杂查询可用 selector/composable 或索引结构。

### 六、组件解构 Store 要保留响应性

直接解构 store 的 state/getter 会取出普通值。使用 `storeToRefs(store)` 保留 ref，action 可直接解构因为方法绑定由 Pinia 处理：

```ts
const cart = useCartStore();
const { lines, total } = storeToRefs(cart);
const { add } = cart;
```

不要把整个 store 作为 prop 传遍组件树。展示组件接收最小只读数据与意图回调，容器或 composable 连接 store，保持复用和测试边界。

### 七、Store 之间依赖要避免循环

一个 action 调另一个 store 很常见，但双向初始化读取会形成循环。共享规则可提取到纯领域函数或服务，跨 store 流程由更高协调层触发。

不要在 store 定义顶层立即读取另一个 store 的动态 state 并固化。需要时在 action/getter 内取得，或通过参数注入。画出依赖方向，保证 feature 不反向依赖应用装配。

### 八、服务器状态通常不应复制进 Pinia

服务器数据需要缓存键、失效、重取、分页、取消和多订阅者。专门查询库或路由数据层更适合。把查询结果复制到 Pinia 后，谁负责更新、何时过期和变更后回写会变得含糊。

Pinia 可以保存当前草稿、选择或查询参数，服务器缓存保存远端实体。若确需 store 管理请求，应明确实现完整协议并承认它是数据层，不是简单数组。

### 九、持久化必须白名单和版本化

只保存真正需要跨会话保留的字段：

```ts
type PersistedPreferencesV2 = {
  version: 2;
  theme: 'light' | 'dark' | 'system';
  density: 'comfortable' | 'compact';
};
```

读取以 unknown 解析，迁移旧版本，损坏时安全回退。不要直接序列化整个 store，其中可能含 token、个人数据、错误、缓存和临时 UI。退出登录要清理身份相关持久化。

跨标签同步还要处理版本、来源和循环写入。localStorage 不是事务数据库，也不适合秘密。

### 十、SSR 要为每个请求创建 Pinia

服务端若复用一个 Pinia 实例，用户 A 状态可能进入用户 B 响应。每个请求创建 app 和 pinia，在服务器填充后安全序列化，再由客户端 hydrate 对应实例。

模块级 reactive 单例、缓存和插件也要审查。认证数据应按请求 cookie/headers 获取，不能从上一个请求残留。VUE-11 会进一步讲 Nuxt payload 与缓存键。

### 十一、Hydration 数据仍是不可信边界

服务端生成 payload 不代表客户端可以盲目信任；页面可能缓存、扩展篡改或版本不一致。不要把服务端秘密放进 state；客户端动作仍经服务端授权。序列化要防 XSS，交给框架安全机制并避免自行拼 script 字符串。

客户端 schema 与服务端版本变化时要有降级。未知字段可以忽略，关键枚举未知应进入安全状态，不能用断言让旧客户端继续执行权限动作。

### 十二、插件扩展要控制全局副作用

Pinia 插件可添加持久化、日志或注入服务。它对每个 store 运行，容易把敏感数据写日志、在 SSR 重复订阅或让测试依赖全局环境。插件应按 store opt-in、支持 dispose、区分 server/client 并有字段过滤。

不要为了少写几行在插件里自动请求全部数据。隐式网络与重试会让加载顺序难以理解。

### 十三、测试 Store 的纯规则与真实装配

单元测试用 `setActivePinia(createPinia())` 为每个用例创建新实例，验证 getter、action、错误和并发。组件测试可用 testing pinia，但要知道 action 默认是否 stub；需要验证真实状态转移时必须关闭 stub 或使用真实 store。

测试还应覆盖实例隔离、持久化迁移、损坏 JSON、退出清理、SSR 两请求不串数据、旧请求不覆盖。只断言 action 被调用不足以证明业务状态正确。

### 十四、DevTools 时间线不是完整审计日志

Pinia DevTools 能观察 mutation/action，适合开发定位。生产审计需要稳定事件、用户/请求关联、脱敏和服务端记录。不要把 DevTools 截图当权限或交易证据。

Action 日志不应包含完整 token、个人字段或请求体。错误 cause 留在受控诊断系统，UI 只显示安全消息。

### 十五、更新范围与 selector

读取整个 store 的组件会对多个变化响应。把容器按业务职责拆分，组件只读取所需 refs。大型列表可建立按 ID getter、拆 store 或使用专门 selector；不要先给每个 getter 加深拷贝。

性能要用 Vue DevTools/浏览器测量。store 数量少不代表快，store 多也不必然慢；变化频率、消费者范围和 DOM 工作才决定体验。

### 十六、重置和生命周期要有业务含义

Pinia store 通常随应用长期存在。离开页面是否清草稿、切租户是否重建、退出是否全清，必须显式。Options store 可 `$reset`，Setup store 自己实现；不要假设路由卸载会销毁 store。

多租户/多账户切换应先停止请求和订阅，再清敏感状态，最后建立新会话。仅覆盖 userId 可能让旧缓存继续显示。

### 十七、状态分层审查表

这份数据的权威来源是谁？是否要进 URL？是否只属于一个组件？是否为服务器缓存？跨刷新保留哪些字段？何时失效/重置？谁有权修改？SSR 是否隔离？如果这些问题没有答案，选择 Pinia 只是把混乱变成全局混乱。

### 十八、`$patch`、订阅与 Action 观察各有语义

`$patch` 适合把同一业务动作中的多字段修改形成一次可读事务，函数形式还便于修改集合；它不是绕过 action 命名的快捷方式。`$subscribe` 观察 state 变化，`$onAction` 观察业务动作的开始、结果和错误。持久化通常订阅少量白名单字段，诊断可观察 action，但两者都要保存取消订阅函数。

订阅默认跟随创建它的作用域。若插件或模块把订阅永久留在全局，测试和热更新会重复注册。记录日志时保留 action 名、耗时和安全标识即可，不能序列化 token、密码或完整个人数据。

### 十九、乐观更新需要补偿而不只是先改界面

乐观更新先反映用户意图，再等待服务端确认。Store 应保存足以判断请求身份和回滚的上下文：旧值或操作 ID、当前实体版本、pending 状态以及服务器返回的权威结果。失败时只撤销属于该操作的变化，不能用过时快照覆盖后来成功的编辑。

并发收藏、排序和批量编辑尤其需要操作级 ID或版本。如果业务不能安全合并，就串行化同一实体写入或在冲突后重新获取。所谓“看起来更快”不能牺牲最终一致性和可解释错误。

### 二十、热更新与代码分割下仍要保持 Store 合同

开发时可接受热更新替换 Store 定义，但新增/删除字段、插件顺序和持久化 schema 仍可能留下旧状态。完整刷新与迁移测试是必要对照。按路由懒加载 Store 时，要区分“代码尚未加载”和“状态应被销毁”；Pinia 注册并不等于页面卸载后自动清空。

跨版本发布时，旧页面可能读取新持久化数据。schema 迁移要向前兼容或能安全清空非关键缓存，不能让一次回滚使应用无法启动。

### 进阶：大型 Store 要按变化频率和权限边界拆分

把账户、编辑器、通知、远端实体和所有页面 UI 放进一个 store，会让初始化、持久化和重置互相牵连。拆分依据不是文件行数，而是谁拥有修改权、何时创建/销毁、哪些消费者随哪些字段更新以及能否独立测试。跨 store action 可调用明确服务，但依赖方向保持单向。

权限变化时，先让服务端成为最终裁决，再更新客户端可见状态；隐藏 action 或按钮不等于禁用接口。多租户数据按实例/key 隔离，切换时停止请求、清缓存并重新装配，不能只覆盖一个 tenantId 字段。

分层图、重置表和消费者清单应随 store 合同进入代码审查，防止后续字段重新混回万能容器。

### 学完后应能说明

你应能按状态类别选择所有者，设计 state/getter/action 与业务域，正确解构 store，避免复制服务器缓存，建立持久化白名单和迁移，确保 SSR 每请求隔离，并用真实 action、并发和污染测试验证 store。
