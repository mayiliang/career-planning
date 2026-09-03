# React 知识点讲义

## REACT-08 错误边界、异步 UI 与可恢复体验

真实界面不会只有成功态。代码可能在 render 抛错，数据可能 pending、拒绝或取消，动态 chunk 可能因发布切换加载失败。React 的 Error Boundary、Suspense 和 `use` 分别处理不同信号。把它们放在正确层级，才能让局部功能失败时用户仍能继续、理解发生了什么并安全重试。

### 学习前先确认

- 直接前置：[REACT-06 Reducer、Context 与跨组件状态](../chinese-guides/react-06-reducer-context-state-domains.md#react-06)。它会递归包含 Hook、Effect、Promise 错误/取消与状态模型。

路由数据边界在 REACT-10，服务端组件和安全升级在 REACT-09。本讲先建立原生错误与 pending 模型。

### 一、先区分三条故障通路

捕获后代渲染异常并显示替代 UI 的组件是**错误边界（error boundary）**；等待内容时显示的是**后备界面（fallback）**。Suspense 读取的数据需要稳定的**资源缓存（resource cache）**，失败后的**重试（retry）**必须改变失败资源身份；非紧急揭示可放入**过渡更新（transition）**。

1. render/生命周期中抛出的错误，可由最近 Error Boundary 捕获；
2. 支持 Suspense 的数据源或 lazy 组件抛出 Promise，最近 Suspense 显示 fallback；
3. 事件处理器、Effect、timer、普通 Promise 回调中的错误不会自动进入 render Error Boundary，需要局部 catch 后转成 state 或上报。

“外面包了一个边界”不能统一处理所有异步失败。先确定错误发生阶段和责任主体。

### 二、Error Boundary 保护渲染子树

React 目前仍以类组件 API 实现通用错误边界：

```tsx
class ErrorBoundary extends Component<PropsWithChildren, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { report(error, info); }
  render() {
    return this.state.error
      ? <RecoveryPanel onRetry={() => this.setState({ error: null })} />
      : this.props.children;
  }
}
```

边界不能捕获自己 render 的错误、事件处理器错误或多数异步回调。框架/库可能提供函数式封装，但底层责任不变。

### 三、边界位置应对应用户可恢复任务

全局根边界防止白屏并提供刷新/反馈入口；页面或区域边界让侧栏失败时编辑器仍可用；过细边界会让页面充满碎片 fallback。按“这部分失败后用户还能完成什么、能否独立重试”划分。

边界 fallback 自身必须简单、可访问且低依赖，不能再次读取同一坏数据。提供清晰标题、错误摘要、重试/返回动作和焦点管理。不要向用户展示堆栈、内部路径或敏感请求信息。

### 四、重试必须改变失败资源

只把 boundary 的 error state 设 null，若子树再次读取同一拒绝 Promise 或同一损坏缓存，会立即再失败。重试需要使资源失效、创建新 request key 或改变边界 key：

```tsx
<ErrorBoundary key={retryVersion}>
  <Suspense fallback={<Pending />}>
    <OrderDetails resource={resource} />
  </Suspense>
</ErrorBoundary>
```

重试次数、退避、离线和不可重试错误应分类。写操作结果未知时不能盲目重放。

### 五、Suspense 表示子树尚未准备好

当支持的读取在 render 中遇到 pending Promise，React 找到最近 Suspense，显示 fallback，并在 Promise 敲定后重试渲染。**悬停边界（Suspense boundary）**管理的是显示时序，不是通用数据请求函数。

```tsx
<Suspense fallback={<OrderSkeleton />}>
  <OrderPage />
</Suspense>
```

Effect 中普通 fetch 不会自动 suspend。把每次 render 都新建 Promise 也会无限 pending；资源身份必须稳定，并由框架/缓存或模块外资源层管理。

### 六、`use` 在 render 中读取 Promise/Context

现代 React 的 `use(promise)` 可以读取 Promise：pending 时 suspend，拒绝时抛给 Error Boundary，兑现时返回值。Promise 应来自稳定缓存、服务器传入或框架数据层，不能在组件 render 中无缓存创建。

`use` 有不同于普通 Hook 的部分调用规则，但仍必须在 React 组件/Hook 语义内使用。项目采用前按锁定 React/框架版本核对服务器与客户端支持，不把实验示例当普遍数据架构。

### 七、Pending 布局要避免整页闪烁

边界层级决定 reveal：一个大 Suspense 会一起显示，多个嵌套边界可以先显示稳定 shell，再逐块出现。fallback 应与最终布局尺寸相近，避免 cumulative layout shift；短操作可延迟显示，避免瞬时闪烁。

导航中保留旧内容并显示 pending 指示，有时比清空为骨架更好。是否保留取决于新旧数据是否仍可安全交互。旧用户权限或租户数据不应在身份切换时继续显示。

### 八、取消不是错误 UI

用户导航、输入替换或组件卸载引起的 abort 通常表示旧工作不再需要。它应停止 pending 或由新导航接管，不显示“系统出错”。但取消也不能静默掩盖真正失败：检查 signal、错误分类和 requestId。

React/路由框架可能自动取消 loader；底层 fetch 必须接收 signal，结果层仍要防迟到提交。UI 要区分离线、权限、404、500、解析错误和代码缺陷。

### 九、错误状态与异常边界不是二选一

可预期业务结果适合显式 state：表单校验、权限拒绝、空数据、冲突。不可在当前局部正常渲染的程序/资源错误可以抛给 Error Boundary。不要把所有 404 都 throw，也不要把 render 缺陷 catch 后返回 null。

数据层可以把 HTTP/解析失败归一化，再由页面决定 inline error、保留旧数据、路由错误页或异常边界。错误分类是产品协议。

### 十、动态导入失败需要发布恢复策略

`lazy(() => import(...))` 与 Suspense 处理代码加载 pending，导入拒绝可进入 Error Boundary。部署时旧 HTML 引用已删除 chunk 会失败；可保留多版本静态资源、原子发布，或在识别 chunk mismatch 后提示安全刷新。

自动 reload 必须限次，避免离线或真实代码错误造成循环。记录当前 build ID、请求 URL 和缓存状态，有助于区分发布漂移与网络故障。

### 十一、服务端渲染与流式揭示增加边界责任

框架可在服务器流式发送 Suspense 边界，客户端再 hydrate。服务器错误、客户端 hydration 错误和后续事件错误发生在不同环境。fallback HTML 必须可访问，边界 ID 与数据缓存应按请求隔离。

不要把服务器敏感错误或堆栈序列化给浏览器。服务端组件/Function 仍需授权，边界只改善恢复。具体框架协议在 REACT-09/10 讲解。

### 十二、日志要关联边界、资源与发布版本

componentDidCatch 可提供组件栈，数据错误应有请求/资源 ID，chunk 错误应有 build ID。去重同一根因，避免每层重复上报。用户取消、已知 404 和程序缺陷使用不同等级。

日志必须脱敏；Error.cause 可保留内部链，但 UI 不直接展示。边界命中率、重试成功率和退出率能告诉你恢复是否真的有效。

### 十三、可访问恢复体验

错误出现后用合适 `role="alert"` 或焦点移动通知，但避免多个嵌套边界同时强提醒。重试按钮名称包含对象，例如“重新加载订单”；键盘焦点应落在错误标题或主要动作，并在恢复后回到合理位置。

Skeleton 不应伪装可点击控件；加载指示可用 `aria-busy` 标记区域。若保留旧数据，明确显示“正在更新”，不要让读屏用户误以为结果已是最新。

### 十四、测试必须注入不同故障阶段

分别让：render 抛错、资源 Promise pending/resolve/reject、请求 abort、HTTP 500、动态导入拒绝和 retry 成功。验证最近边界而非全局接管、无关区域仍可用、错误只报告一次、重试创建新资源且调用次数符合预期。

普通 Effect 请求应作为反证：外层 Suspense 不应自动显示 fallback。用可控 Promise 而非 sleep，确保每条时序可复现。

### 十五、边界审查问题

这个失败属于 render、数据、事件还是代码加载？最近能恢复的区域在哪里？fallback 是否独立可靠？重试会让什么资源失效？取消怎样处理？旧内容是否可安全保留？SSR 是否泄漏信息？没有答案就不应只加一个通用 ErrorBoundary。

### 十六、资源缓存必须把 Promise、数据和错误放在同一身份下

Suspense 数据源的关键不是“看到 Promise 就抛出”，而是同一资源 key 在 pending 时返回同一个 Promise，成功后返回缓存数据，失败后稳定地抛出对应错误。若每次 render 都创建新 Promise，组件会不断暂停；若重试仍复用失败项，按钮不会产生任何恢复。

资源 key 必须包含影响结果的参数与身份，失效要精确到所属数据。缓存容量、过期、请求取消和 SSR 每请求隔离同样属于协议。应用通常应采用框架支持的缓存/数据层，而不是临时写一个无法治理的全局 Map。

### 十七、Transition 可以避免已经可用的界面突然退回大面积 fallback

用户在已有页面发起非紧急导航或筛选时，可把更新放进 transition，让旧内容暂时保留，并用 pending 标识说明正在切换。它改善的是揭示顺序，不会让网络更快，也不能掩盖提交按钮这类紧急反馈。

旧内容保留期间必须避免误操作：展示旧数据身份、限制会写错对象的动作，并在新结果完成后恢复合理焦点。若内容已不再安全，例如退出登录或切租户，就应立即清空而非继续展示。

### 十八、Hydration 恢复要区分服务器输出与客户端失败

服务端可能已把 fallback 或部分内容发给浏览器，客户端随后下载代码并 hydrate。版本漂移、非确定性渲染和 chunk 404 会在这一阶段失败。可恢复设计要保存多版本静态资源、监测 hydration 错误，并允许刷新到同一发布版本；仅在客户端包一层边界未必能修复服务器生成的错误内容。

错误遥测至少关联 server request、boundary、build 与资源 key，同时对用户隐藏内部堆栈。这样团队才能判断是数据失败、客户端版本漂移还是服务器渲染缺陷。

### 进阶：恢复策略要按故障持续时间和数据风险分级

瞬时网络失败可原地重试并保留旧数据，权限失效应进入重新认证，资源删除进入稳定 404，程序缺陷则隔离区域并关联发布版本。统一显示“出错了，请重试”会让永久错误形成死循环，也无法告诉用户草稿是否安全。

为每类错误定义自动重试次数、人工动作、是否保留旧内容、日志等级和升级通路。写操作超时可能结果未知，先查询或使用幂等键，不能直接再次提交。错误边界负责 UI 生存性，业务恢复仍需领域协议。

### 进阶：嵌套边界要避免 fallback 瀑布和重复上报

页面、区域、资源可以嵌套边界，但每层都显示 skeleton/alert 会产生闪烁和多次读屏通知。外层负责页面骨架，内层只接管可独立恢复单元；错误冒泡到首个能处理它的边界，遥测用 error/request ID 去重。

测试父子同时 pending、内层失败后重试、fallback 自身失败和 route 切换。确认无关区域持续可操作，恢复后焦点和草稿仍属于正确任务。

### 学完后应能说明

你应能区分 Error Boundary、Suspense、`use` 和显式错误 state，选择与用户任务一致的边界层级，设计稳定资源与真实重试，处理取消和 chunk 漂移，并用多阶段失败注入验证局部恢复与可访问体验。
