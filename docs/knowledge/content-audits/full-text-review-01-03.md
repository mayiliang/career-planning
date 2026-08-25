# 01—03 领域学习资料全文审读记录

审读日期：2026-08-25

这份记录替代“链接可访问 + 关键词命中 + 模板化相关度”的旧判定。每个结论必须来自目标页面/目标章节正文与本地讲义全文，并同时对照知识点覆盖声明、练习固定输入、首考五题和复测变式。

## 判定字段

- **正文事实**：资料实际讲授的章节、机制、示例和明确限制。
- **能支撑**：学习者读完后可以直接完成的知识点任务。
- **缺口/超纲**：正文没有讲授却被覆盖声明或挑战使用的内容，以及会显著增加初学者负担的无关章节。
- **处理**：保留为必读、降为补充/版本核验、替换、删除或补写本地讲义。
- **闭环证据**：资料中的机制与站内练习、首考、排错、复述和复测逐项对应。

“官方”“中文”“篇幅长”都不自动代表合格。目标页面若只覆盖 API 语法，不能被判定为覆盖工程协议；本地讲义若只有定义摘要，也不能被判定为足以完成挑战。

## JS-01 执行上下文、作用域与闭包

### 原资料逐份结论

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| MDN JavaScript 执行模型 | 正文包含引擎/宿主、代理、堆/作业队列/执行上下文栈、Realm、栈帧绑定、闭包、事件循环、共享内存和代理集群。执行上下文段能解释调用栈，闭包段说明函数记住创建环境的绑定。 | 页面开头明确假定读者熟悉 C/Java 执行模型；代理、Realm、尾调用、共享内存和进展保证对初学者与本点挑战明显超纲。正文没有订阅撤销实验，也不提供“何时可回收”的可操作判断。 | 从必读删除；不再让初学者为一个执行上下文概念阅读整篇高级参考。关键机制由本地讲义精确重写。 |
| MDN 作用域术语页 | 是短术语定义，可建立全局/模块/函数/块作用域的名称。 | 不能独立解释执行上下文、词法环境对象、闭包共享绑定、循环问题、内存或清理。旧审计把它当成完整题源属于过度判定。 | 从必读删除；其必要概念已合并进本地讲义。 |
| MDN 闭包 | 完整讲授词法作用域、`let`/`const` 块作用域、闭包创建、私有状态、作用域链、模块 live binding、循环 `var` 闭包错误和函数实例的性能考量。 | “性能考量”主要讨论不必要函数实例与原型方法，不等于 GC、DOM 保留、事件订阅和幂等清理；不能单独支撑挑战中的 `unsubscribe()`。 | 保留为补充阅读，明确只要求闭包、循环和性能考量相关章节；本地讲义承担清理与可达性。 |
| MDN 函数 | 正文覆盖函数定义/调用、参数、提升、作用域、递归、闭包、arguments、默认/剩余参数和箭头函数。 | 大部分内容与 JS-01 无关，闭包内容与专门的闭包页重复；没有订阅清理和可回收实验。要求全文阅读会给初级学习者制造无意义负担。 | 从本点删除；箭头函数等内容由 JS-02 或其他知识点承担。 |
| 中文核心讲义：JS-01 | 直接讲授执行上下文、调用栈、词法环境、作用域链、闭包绑定、`var`/`let` 循环差异、两实例隔离、可达性、事件监听撤销和幂等订阅清理，并提供与挑战一致的 `createCounter`。 | 不扩展到 Realm、共享内存、框架生命周期或 GC 实现算法。 | 新增为唯一核心必读。 |

### 练习与挑战闭环

| 要求 | 资料位置与判断 |
| --- | --- |
| 解释 `[3,3,3]` / `[0,1,2]` | 本地讲义“为什么循环中的 var 会得到三个 3”与 MDN 循环闭包章节直接覆盖。 |
| 两个计数器互不污染 | 本地讲义以两次 `makeCounter` 建立两个词法环境，并给出 A/B 输出。 |
| `unsubscribe()` 后不再通知 | 本地讲义提供 Set 订阅、幂等撤销及必须验证的回归；旧外部资料不覆盖，缺口已补齐。 |
| 说明何时释放与 DOM 边界 | 本地讲义使用可达性和真实外部注册解释“可能可回收”，避免承诺具体 GC 时刻。 |
| 受限排错 | 三个允许方向分别在循环绑定、实例状态位置、真实注册清理中有可运行反例。 |

结论：修订前不合格；修订后资料范围收紧且能完整支撑首考与复测。

## JS-02 原型、对象模型与 `this`

### 原资料逐份结论

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| MDN 继承与原型链 | 正文完整解释自有/继承属性、属性查找与遮蔽、`[[Prototype]]` 与函数 `.prototype`、继承方法的接收者、构造函数、显式返回非原始值、class 语法糖、长原型链和性能。 | 内容足以核对原型与构造规则，但没有教学版 `new`/`bind` 的逐步实现；旧覆盖声明中的“属性描述符”并非该页面核心，也未进入挑战。后半部分多种旧式继承写法不必作为首考必读。 | 保留，要求聚焦原型查找、构造函数和 class 关系；删除覆盖声明中的完整属性描述符承诺。 |
| MDN `this` | 正文按函数、回调、箭头、构造、类和全局上下文解释 `this`；明确 `obj.f()` 接收者、脱离回调、`call`/`apply`/`bind`、箭头词法 `this` 及构造显式返回对象。 | 页面包含 `eval`、派生类、全局脚本差异等非挑战重点；只读 API 说明仍不足以让初学者可靠实现教学版 `new`/`bind` 并写限制。 | 保留为机制参考；本地讲义提供固定 fixture、教学实现和限制声明。 |
| 中文核心讲义：JS-02 | 区分两条原型关系，按调用点解释 `this`，覆盖脱离事件回调、`new` 三步可观察规则、构造覆盖、教学版 `simpleNew`/`simpleBind` 和组合边界。 | 明确不模拟原生 bound function 构造语义，也不把原型污染并入本点。 | 新增为核心必读。 |

### 练习与挑战闭环

三层原型查找由本地讲义与 MDN 原型页共同覆盖；五种 `this` 调用由本地讲义与 MDN `this` 页共同覆盖；构造返回 `{kind:'override'}` 在两份资料中都有规则和断言；教学版 `new`/`bind` 及其限制由本地讲义补足；事件回调复测明确演示未绑定失败和绑定恢复。

结论：修订前“属性描述符”和实现能力被过度声明；修订后合格。

## JS-03 类型、相等、拷贝与不可变更新

### 原资料逐份结论

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| MDN JavaScript 数据类型和数据结构 | 当前正文位于 `/Guide/Data_structures`，讲授动态/弱类型、原始值、对象、属性、数组、Map/Set/Weak 集合与 JSON。 | 旧 URL 已迁移；正文不讲浅拷贝路径、结构共享或不可变更新，也不能支撑 A/B 共享 child 的排错。 | 修正 URL；保留用于原始值/对象和集合语义。 |
| MDN 相等比较和相同 | 正文完整比较 `==`、`===`、`Object.is`、SameValueZero，并给出 `NaN`、正负零、对象身份及 API 使用差异。 | 后段 IEEE 754/TypedArray 的 NaN 位模式对本挑战超纲，不应要求初学者掌握；页面不讲拷贝与不可变更新。 | 保留相等算法主体；超纲段不进入题源。 |
| MDN `structuredClone` | 正文说明深拷贝、循环引用、可转移对象、`DataCloneError` 和基本示例。 | 页面没有完整列出挑战中“不可变更新为何不默认深拷贝”的决策，也不教授结构共享；仅凭此页不能修复 A/B 共享引用。 | 保留作为结构化克隆 API 参考。 |
| 中文核心讲义：JS-03 | 讲授值/身份、浅拷贝第一层、修改路径复制、结构共享、Date/Map/Set/循环图、JSON 反例、不可克隆输入和 Map 指回克隆根的变式。 | 明确不扩展到持久化数据结构库。 | 新增为核心必读。 |

### 练习与挑战闭环

15 个相等判断由 MDN 相等页与本地讲义支撑；浅拷贝污染、A/B 隔离和结构共享由本地讲义补足；Date/Map/Set/循环图及 `clone.map.get('x') === clone` 有直接代码；函数/DOM 等不支持输入要求明确拒绝；JSON 深拷贝被作为反例而不是候选方案。

结论：修订前不合格，且存在迁移 URL 与覆盖过度问题；修订后合格。

## JS-04 异步、Promise 与事件循环

### 原资料逐份结论

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| MDN 异步 JavaScript | 目标地址的主体是子指南导览，只简介异步 JavaScript、事件处理、回调、Promise 与 worker，然后引导到其他页面。 | 它不是完整教程，没有任务/微任务队列变化、渲染时机或并发器实现；旧报告将“目录含有相关标题”当作“正文已教会”。 | 从必读删除。具体的 Promise 正文在 JS-05 承担，本点不再保留目录链接。 |
| MDN 微任务指南 | 正文解释任务与微任务的区别、事件循环每轮的微任务检查点与渲染机会，说明新微任务会在队列清空前继续执行，因而有递归饥饿风险。 | 不教“最多同时运行 2 个业务任务”这种用户态调度，也没有结果槽位、`AbortSignal` 协作取消和计时 fixture。 | 保留为浏览器调度模型核对资料，不声称它覆盖业务并发协议。 |
| 中文核心讲义：JS-04 | 从调用栈、任务、微任务到渲染机会建立可画 trace 的模型，另行区分业务并发限制，提供含 `nextIndex`、`active`、结果槽位和 `AbortSignal` 的执行器。 | 明确不扩展到 Node.js 各阶段事件循环，也不把 Promise 回调称为“普通宏任务”。 | 新增为核心必读。 |

### 练习与挑战闭环

`A/B/C` 队列 trace、微任务饥饿和渲染机会由两份资料直接支撑；并发上限 2、取消后不再开新任务、按输入序号汇总和 `active` 归零由本地讲义的完整执行器承担。讲义将“浏览器何时运行回调”与“应用允许多少任务同时运行”拆成两个问题，可直接支撑首考复述。

结论：修订前的必读集合含有目录页并缺少业务并发协议，不合格；修订后合格。

## JS-05 Promise 错误处理与异步控制流

### 原资料逐份结论

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| MDN Promise 指南 | 正文详细讲授链式调用、拒绝传播、嵌套 catch、`finally`、时序与微任务，以及 `all`、`allSettled`、`any`、`race` 等组合器。 | 不教连续搜索的请求序号、过期结果抑制、错误分类，也不说明业务操作是否可安全重放。 | 保留为 Promise 语义核心参考；工程控制协议由本地讲义补足。 |
| MDN AbortController | 页面说明构造器、`signal`、`abort()`、取消 `fetch` 及 `AbortError`，并给出简短示例。 | 没有自定义异步函数如何协作检查信号，不能单独支撑 stale 抑制、程序错误/网络错误/业务错误分类或重试决策。 | 保留为取消 API 核对资料，不把“取消 fetch”等同于“Promise 被取消”。 |
| 中文核心讲义：JS-05 | 把拒绝传播、`finally` 与组合器连到连续搜索 fixture；给出请求序号、旧请求取消、过期结果抑制、四类结果及可安全重放的有限重试边界。 | 明确不把 POST 默认视为幂等（idempotent，幂等的）操作，也不把取消展示成业务失败。 | 新增为核心必读。 |

### 练习与挑战闭环

`allSettled` 等价聚合、拒绝传播和 `finally` 规则可由 MDN 与本地讲义交叉核对；`a/ab/abc` 请求序列、取消不显错、新请求网络失败可见以及 `a` 晚到不得覆盖均在本地讲义有直接状态门禁和自检。

结论：修订前对业务控制流的覆盖被高估；修订后合格。

## JS-06 ES Modules 与模块边界

### 原资料逐份结论

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| MDN JavaScript 模块 | 正文从导入/导出、模块标识符、只读 live binding、`type="module"` 和模块作用域，讲到导入映射、非 JS 资源、动态 `import()`、顶层 `await`、导入提升与循环导入。循环章明确说明只有读取尚未初始化的 binding 时才失败。 | 页面很长，绘图示例、导入映射、CSS/JSON 模块、同构模块等不是挑战必读；没有为固定 `a↔b` fixture 提供“如何改成单向边界”的交付步骤。 | 保留，但将必读范围限于导入/导出、live binding、动态导入与循环导入。 |
| Node.js ECMAScript 模块中文页 | 正文可核对 `.mjs`、`package.json` 中的 `type`、相对路径强制扩展名、`import()`、`exports` 限制和 ESM/CJS 互操作；其中 CommonJS 命名导出是静态分析的 best-effort，不是可依赖的 live binding。 | 页面长达上千行且混合双语、版本历史、解析伪代码、Wasm 与加载器定制；中文部分存在明显机翻瑕疵，不适合初学者整页通读。 | 降为限定章节查表：只读“启用”、“import 说明符”、“强制文件扩展名”和“与 CommonJS 的互操作”；不以机翻表述作为唯一题源。 |
| 中文核心讲义：JS-06 | 精确解释静态结构、live binding、初始化顺序、动态导入的 Promise 失败、Node 文件/包边界和 ESM/CJS 差异，并用挑战的 `a↔b` 循环给出单向重构。 | 明确不要求掌握打包器 tree-shaking 实现或 Node 加载器算法。 | 新增为核心必读。 |

### 练习与挑战闭环

MDN 循环章和本地讲义共同支撑“循环不一定立即失败，在初始化前同步读取才失败”；本地讲义给出依赖图、抽取第三模块/反转依赖的重构方式和动态导入 `try/catch` 错误边界；Node 限定章节支撑固定 `exports` 表与扩展名查表。

结论：修订前存在整页过宽和本地挑战步骤不足；修订后通过限定章节与中文核心讲义闭环，合格。

## JS-07 迭代协议、元编程与资源生命周期

### 原资料逐份结论

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| MDN 迭代协议 | 正文完整定义可迭代协议的 `[Symbol.iterator]()`、迭代器协议的 `next()`/`IteratorResult`、可选 `return()`/`throw()`、异步迭代中返回 Promise 的对应方法，以及 `for...of`/`break` 提前结束时调用 `return()` 的直接示例。 | 没有把页码 fixture、只拉取第一页、`closeCount===1` 幂等关闭和 `AbortSignal` 组成一个资源安全实验。 | 保留为协议和语法交互的核心参考；具体资源包装器由本地讲义补齐。 |
| MDN Proxy | 正文解释 target、handler、trap，列出对象内部方法与各陷阱的对应关系；明确说明非可配置属性等不变量由 target 验证，违反时抛 `TypeError`，并演示用 `Reflect.get` 保留默认语义。 | 对初学者来说，完整内部方法表、`[[Set]]`/`[[DefineOwnProperty]]` 精微差异和所有 trap 参考明显过宽；也不教资源清理。 | 保留描述、Reflect 转发与不变量相关段落；不要求逐个背诵所有 trap。 |
| MDN Reflect | 正文说明 `Reflect` 是不可构造的静态方法集，其方法与 Proxy handler 同名，并列出 `get`、`set`、`ownKeys`、`defineProperty` 等方法的返回语义。 | 它是 API 参考，不会自己解释为何某个 non-configurable 属性的 trap 会违反不变量；整页通读的投入大于本挑战所需。 | 保留为 `Reflect.get`/`Reflect.set` 查表，不作为独立教程。 |
| 中文核心讲义：JS-07 | 用页码 `[[1,2],[3,4]]` 实现惰性迭代、提前 `break`、`return`/`throw`、`try/finally`、幂等 `closeOnce`、异步生成器与取消，并以 `Reflect` 转发说明 Proxy 不变量。 | 明确不把 Proxy 当通用状态管理器，也不引入挑战未给定的显式资源管理提案语法。 | 替换不足 700 字的原本地摘要，作为核心必读。 |

### 练习与挑战闭环

MDN 直接证明 `break` 会调用迭代器 `return()` 且异步迭代方法返回 Promise；本地讲义将这些规则落到固定页码、异常/取消和 `closeCount===1` 三路径。Proxy 页提供不变量的规则证据，本地讲义提供能完成受限排错的最小代码。

结论：修订前本地资料过浅且缺少清理闭环；修订后合格。

## CS-01 复杂度、数据规模与工程成本判断

### 原资料逐份结论

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| 旧中文核心讲义：CS-01 | 正文已有复杂度、摊还分析、常数/分配、多规模基准、主线程/Worker/服务端决策和订单筛选实验，是本批原有资料中相对完整的一份。 | 它的实验规模是 2k/200k，挑战却固定 1k/10k/100k、30 次预热加 10 次采样；没有 p95 汇总代码、CSV 列名和 `find` 100000 次的受限排错步骤。 | 内容作为新讲义基础，但不再作当前直链；固定采样协议已精确重写。 |
| 中文核心讲义：CS-01 | 逐项定义 `n`、基本操作、最坏/平均/摊还；对比两个 O(n) 的分配/GC 差异；给出 1k/10k/100k、预热/采样、中位数/p95、堆/帧预算、CSV 字段、火焰图证伪与 1m 复测清单。 | 不扩展到竞赛复杂度证明或特定引擎的 GC 算法。 | 替换直链，作为唯一必读。 |

### 练习与挑战闭环

新讲义的基准协议与固定 fixture 完全相同；推导、p95 汇总、堆峰值、超帧数和 Performance 录制不再只出现在考题中。“嵌套查找”、“缓存未命中”、“序列化分配”三个允许排错方向都有可对照的测量问题，且只有在修改前后曲线一致变化时才能确认根因。

结论：原讲义概念质量较好但与固定挑战的数据协议未对齐；修订后合格。

## CS-02 常用数据结构、算法模式与正确性

### 原资料逐份结论

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| 旧中文核心讲义：CS-02 | 只用三段概括数组/Map/Set/队列/堆/树/图的用途、常见算法模式和空/重复/环等测试边界。 | 没有任何固定拓扑 fixture、重复边去重、环检测、Top-2 更新实现或属性测试；不足以完成挑战。 | 删除当前直链，由完整新讲义替代。 |
| MDN Map | 正文完整解释键值、插入顺序、次线性平均访问要求、SameValueZero、对象键身份、Map 与 Object 的键/安全/迭代/序列化差异，以及 `set/get/has/delete` 和示例。 | 页面后半的所有实例方法、maplike Web IDL、静态分组等对挑战过宽；它不教拓扑、堆或不变量。 | 保留，限定在 Map 语义、Object 比较和基本操作。 |
| MDN Set | 正文说明唯一值、插入顺序、次线性平均访问、SameValueZero、`has` 相对线性扫描的特性和集合运算。 | 新集合运算 API 与完整方法列表不是挑战必须；页面不教图边去重策略。 | 保留为唯一性与成员检查核对。 |
| 中文核心讲义：CS-02 | 通过操作模式选数据结构，明确二分/双指针/滑窗/DFS/BFS/贪心/DP/拓扑的前提；实现重复边去重、入度不变量、循环错误、Top-2 累加语义和 DAG 属性测试。 | 明确不要求冷门竞赛模板；K=2 的简单实现不装作是通用堆。 | 新增为核心必读。 |

### 练习与挑战闭环

依赖 `A→C,B→C,C→D`、重复 `A→C`、变式 `C→A` 和事件 `[a:3,b:9,a:4,c:2]` 均在讲义中有直接语义、代码和预期；学习者不再需要根据考题自行猜测“重复边是否算两次”或“同 ID 分数是覆盖还是累加”。

结论：修订前不合格；修订后合格。

## CS-03 前端大数据、Worker 并行、增量计算与内存边界

### 原资料逐份结论

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| 旧中文核心讲义：CS-03 | 四段概括索引/增量/虚拟化、Worker 复制与 Transferable、缓存/内存以及主线程/Worker/服务端对比。 | 没有消息 Schema、批次序号、背压阈值、取消状态、组件卸载或四方案测量表，不足以修复队列 2400 和取消后 6 批结果的日志。 | 删除当前直链，由新讲义替代。 |
| MDN Web Worker | 正文完整讲授专用/共享 Worker、独立全局上下文、不能直接访问 DOM、`postMessage`/`message`、数据通过结构化克隆复制，以及 Worker 自身 CSP 的细节。 | 示例以两数相乘和通用 QueryableWorker 为主，不实现 Top-10、背压、取消或内存释放；共享 Worker、内联 Worker 与所有 API 列表对挑战过宽。 | 保留，限定为专用 Worker、消息复制和 DOM 边界核对。 |
| MDN Streams API | 主页解释边接收边处理、读取/取消流、Readable/Writable/TransformStream、可写流的内建队列与背压，以及计数/字节队列策略。 | 这是 API 概览，不详解 `desiredSize`、自定义 Worker ACK 或挑战的 500 条批次；完整字节流/BYOB 内容超出本点。 | 保留为分块、取消与背压概念核对；ACK 协议由本地讲义承担。 |
| MDN 可转移对象 | 正文明确可转移资源一次只在一个上下文可用，ArrayBuffer 转移后发送方分离且 `byteLength` 为 0；TypedArray 可序列化但 transfer list 应放底层 buffer。页面还列出 MessagePort、Stream、ImageBitmap 等可转移对象。 | 页面不解决所有权设计、重复发送、取消和返回 buffer 的应用协议；完整支持列表不必背诵。 | 保留为 clone/transfer 和 buffer 分离的必读核对。 |
| 中文核心讲义：CS-03 | 从减少工作开始，解释虚拟化/增量计算；对比 clone 与 transfer 所有权；定义 `start/batch/cancel/ack/partial/done/error` 协议、信用额背压、jobId/seq 门禁、卸载清理与四方案测量表。 | 不扩展到 SharedArrayBuffer 并发同步或 AI 推理任务池。 | 新增为核心必读。 |

### 练习与挑战闭环

100000 条、Top-10、500 条批次、第 20 批取消、clone/transfer 对照与消息/堆/长任务证据都已落到新讲义的协议与表格。四个允许排错方面被收紧为题目实际给定的传输方式、背压阈值与缓存释放；不会用“GC 慢”这种不可证伪结论代替对照实验。

结论：修订前不合格；修订后合格。

## WASM-01 WebAssembly 通用运行时、宿主边界与工程化

### 原资料逐份结论

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| 旧中文核心讲义：WASM-01 | 只概括 Wasm 是字节码格式、由宿主提供能力、适合计算热点，并提示构建和成熟度。 | 没有 Module/Instance、导入导出、线性内存、ABI（Application Binary Interface，应用二进制接口）、所有权、`memory.grow()` 或固定两组基准。 | 删除当前直链。 |
| MDN WebAssembly 根页 | 正文简要定义 WebAssembly，列出 Module、Instance、Memory、Table、编译/实例化/验证 API、错误类型、指令与指南入口。 | 本质是总览和参考索引，不教 JS/Wasm ABI、`free` 所有权、流式实例化 MIME 回退、增长后旧视图或 4MB/1000×4KB 对照。 | 保留并明确标为 API 查表，不再声称能独立完成挑战。 |
| WebAssembly Core 3.0 / JavaScript API 规范 | 官方英文规范可核对当前核心语义和 JS API 的版本边界。 | 规范的形式化语义明显超出初级前端必读范围，且不是本站固定实验教程。 | 仅用于版本核验，不作为必读或独立首考题源。 |
| 中文核心讲义：WASM-01 | 完整解释 Module/Instance/import/export/Memory/Table、`sum(ptr,len)` ABI 表、分配/释放所有权、`instantiateStreaming` 回退、增长后重建视图、两组边界基准、JS fallback、构建供应链与成熟度边界。 | 将 WASI（WebAssembly System Interface，WebAssembly 系统接口）和 Component Model（组件模型）留作边界认识，不把它们当浏览器基线。 | 新增为核心必读。 |

### 练习与挑战闭环

固定 `Uint8Array([1,2,3,4])`、一次 4MB 与 1000 次 4KB、导入名缺失、增长后旧视图和未释放内存均在新讲义中有代码、断言或测量协议。MDN 只承担 API 名称与对象关系核对，学习者不会被迫从索引页猜测 ABI。

结论：修订前不合格；修订后合格。

## WEB-01 HTML 语义、表单与可访问性基础

### 原资料逐份结论

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| MDN HTML 语义化课程页 | 正文列出语义 HTML、标题、链接、列表、图片等子教程，并给出学习顺序。 | 是课程目录而非教学正文，没有固定表单错误和 dialog 焦点实验。 | 从必读删除。 |
| MDN Web 表单课程页 | 正文列出表单结构、控件、验证、样式和高级表单子文章。 | 同样是模块目录；不能直接支撑 label、`aria-describedby`、submit/blur 通知与证据交付。 | 从必读删除。 |
| MDN ARIA | 正文定义 ARIA（Accessible Rich Internet Applications，可访问富互联网应用），强调原生元素优先的第一规则，解释 role、state、property 及错误使用可能降低可访问性。 | 页面是概览和参考入口，不会替固定 fixture 完成名称计算、错误链和焦点回归。 | 保留为 ARIA 边界依据。 |
| MDN dialog 元素 | 正文解释隐式角色、`showModal()`、初始焦点、`autofocus`、Escape、`method="dialog"`、关闭机制和 backdrop，并警告不要给 dialog 本身设置 `tabindex`。 | 初始焦点选择有依据，但挑战要求的触发器关闭归焦断言仍需应用层代码与测试。 | 保留为原生 dialog 语义核对。 |
| 中文核心讲义：WEB-01 | 用同一表单/dialog fixture 教授语义角色、可访问名称/描述/状态、label 关联、submit/blur 一次通知、初始焦点、关闭归焦、键盘路径与无障碍树证据。 | 不扩展到完整 WCAG 治理；该主题由 A11Y-01 承担。 | 新增为核心必读。 |

### 练习与挑战闭环

必填姓名、空提交、blur 变式、Tab/Enter/Escape、无障碍树和关闭归焦均有直接实现与断言；ARIA 第一规则与 dialog 的平台语义由 MDN 深页交叉核对。

结论：修订前两张导航页被错误计为覆盖；修订后合格。

## WEB-02 CSS 布局、层叠与响应式

### 原资料逐份结论

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| MDN CSS 布局课程页 | 正文列出布局入门、Flexbox、Grid、浮动、定位、响应式与媒体查询等子教程。 | 是子教程导航，不含挑战所需的长文本、flex 最小尺寸、层叠上下文、祖先 overflow 与三视口联调。 | 从必读删除。 |
| MDN CSS 层叠 | 正文系统解释样式来源、相关声明过滤、来源与重要性顺序、层、特殊性、作用域接近度、声明顺序，以及动画/过渡的优先位置。 | 不教授特定 `z-index:9999` 仍失效的祖先链，也不提供 320/768/1440 fixture。 | 保留为层叠算法核心参考。 |
| 中文核心讲义：WEB-02 | 解释 Flex/Grid 选择、`min-inline-size:0`、长文本、sticky、层叠上下文与裁剪链，并给出 transform/overflow/最小尺寸三候选的受限排错，以及 320/768/1440、`vertical-rl` 和打印验证。 | 不定义设计系统 Token（设计令牌），避免与 DS-01 重叠。 | 新增为核心必读。 |

### 练习与挑战闭环

200 字标题、吸顶工具栏、被裁剪弹层、`scrollWidth===clientWidth` 和三视口/竖排复测均在本地讲义直接出现；MDN 深页只承担真正与层叠算法相关的机制。

结论：修订前导航页不足；修订后合格。

## WEB-03 现代 CSS 架构、容器查询与渐进增强

### 原资料逐份结论

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| 旧中文核心讲义：WEB-03 | 简要列出现代 CSS 可减少脚本、容器查询、层叠层、能力检测和回退。 | 没有 240/480 固定容器、层顺序、单列基线、`CSS.supports` 记录、打印/键盘验证或可运行 CSS。 | 删除当前直链。 |
| MDN Container Queries | 正文解释 `container-type` 的 size/inline-size/normal、容器命名、简写、容器单位、查询条件，并给出 Grid/Flex/媒体查询回退。 | 不包含本站同一组件双容器和完整交付表。 | 保留为容器机制深页。 |
| MDN `@layer` | 正文解释普通声明下后层优先、首次声明固定层序、非分层普通样式优先于分层样式、匿名/嵌套层和示例。 | 不替挑战决定 reset/components/utilities 的具体顺序，也不教完整回退。 | 保留为层叠层机制深页。 |
| Anchor Positioning、Scroll-driven Animations、CSS Color 5 英文页 | 可核对新能力的当前语法与标准进度。 | 都不是固定挑战的核心路径；整页学习会使初学者偏离容器、层和渐进增强。 | 仅用于版本核验。 |
| 中文核心讲义：WEB-03 | 给出 240/480px 同一组件、`@layer reset,components,utilities`、单列基线、`@supports` 增强/回退、reduced-motion、打印与键盘检查，并解释 Subgrid、`@scope`、`content-visibility`、锚点定位与滚动动画边界。 | 高级能力只讲“解决什么、何时不用”，不要求背实验性语法。 | 新增为核心必读。 |

### 练习与挑战闭环

固定容器宽度、层顺序、旧浏览器仍有内容布局和 240px 变式均有可运行代码与证据清单；外部两张深页直接支撑容器和层机制，英文页面不再混入独立首考题。

结论：修订前本地摘要不足；修订后合格。

## A11Y-01 WCAG 2.2、无障碍测试与工程治理

### 原资料逐份结论

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| 旧中文核心讲义：A11Y-01 | 正文正确概括 POUR、AA、语义、焦点、动态通知、媒体、AI 流式回答、自动/人工测试和治理。 | 只有约 17 段；没有 WCAG 2.2 新准则映射、固定命令面板代码、拖拽等价按钮、40 token/五次通知实现、证据矩阵、严重度和例外模板。 | 删除当前直链，由可执行新讲义替代。 |
| MDN 无障碍课程页 | 正文介绍无障碍意义和前提，随后列出 HTML、CSS/JS、ARIA、多媒体、移动端及评估等子教程。 | 是课程目录，不是这些主题的教学正文；不能直接承担综合 fixture 或 WCAG 2.2 工程治理。 | 从必读删除。 |
| MDN ARIA | 正文定义角色/属性，强调原生元素优先、ARIA 不自动提供键盘行为、误用可能更糟，并要求使用真实辅助技术测试。 | 不讲 WCAG 2.2 准则映射、命令面板完整焦点协议、批量播报、CI 或例外治理。 | 保留为 ARIA 使用边界。 |
| Chrome DevTools 无障碍参考 | 正文说明自动工具擅长静态标记问题、键盘/读屏任务必须亲自测试；详细介绍 Lighthouse、无障碍树、计算属性、源顺序、重排和 forced-colors/reduced-motion 模拟。 | 是工具参考，不会决定替代文本质量、读屏实际播报或组织门禁。 | 保留为工具操作必读。 |
| Lighthouse 无障碍评分 | 正文解释得分是审核的加权平均，每条自动审核二元通过/失败，且人工审核和部分最佳实践不影响分数；列出名称、角色、标签、对比度、字幕等规则。 | 分数不能证明任务可完成，也不覆盖焦点体验、语义质量和真实读屏；规则清单不应背诵。 | 保留，精确承担“为什么单一分数不足”。 |
| 中文核心讲义：A11Y-01 | 定义中英术语并区分 DOM/视觉/播报、ARIA/行为、得分/符合性；映射固定需求到 WCAG 2.2；实现原生 dialog、归焦、拖拽等价按钮、40 token 每 8 个一批、生成媒体与 reduced-motion；给出四证据矩阵、严重度、CI 和例外到期模板。 | 全站法律符合性、所有 APG 模式和所有读屏组合明确不在本点范围。 | 新增为核心必读。 |

### 练习与挑战闭环

命令面板焦点丢失、仅鼠标拖拽、表单错误、每 token 播报、生成图片/媒体和动画六类缺陷均在新讲义中有修复与证据要求。复测的 40 token/每 8 token 直接得到五次代码计数，同时明确代码计数不能替代真实读屏记录。自动扫描、无障碍树、键盘和读屏四项各自能证明及不能证明的边界也已显式列出。

结论：修订前概念方向正确，但外部课程导航被高估且不足以完成挑战；修订后合格。

## BROWSER-01 渲染流水线、DOM 事件与存储

### 原资料逐份结论

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| 旧中文核心讲义：BROWSER-01 | 两段概括 DOM/CSSOM、渲染阶段、布局读写、事件传播/清理和三类浏览器存储。 | 没有固定 Performance 操作、100 项事件 fixture、target/currentTarget、升级代码、abort 回滚或事务证据。 | 删除当前直链。 |
| MDN 关键渲染路径 | 正文从 DOM/CSSOM、渲染树、布局和绘制讲到阻塞资源、批量更新和先测量后优化。 | 重点是首次渲染，未完整教授运行时 style/paint/composite 分类、DevTools 固定录制或强制同步布局排错。 | 保留为渲染主线；运行时实验由本地讲义补足。 |
| MDN 事件介绍 | 正文详细教 `addEventListener`、AbortSignal 清理、事件对象和默认行为。 | 传播与委托被放在下一篇，不能直接支撑本挑战的目标路径和父级委托。 | 从必读删除；清理由本地讲义承担。 |
| MDN 事件冒泡与委托 | 正文完整讲授冒泡顺序、捕获、`stopPropagation()`、`target/currentTarget` 和父级事件委托。 | 不处理组件重复挂载和 AbortController 清理，也没有固定第 73 项。 | 新增为精确外部必读。 |
| MDN IndexedDB 总览 | 正文说明 IndexedDB 是异步事务型结构化数据库，解释模式、打开连接、事务 scope/模式、对象仓库、索引和 versionchange 事件。 | 是 API 总览，没有 v1→v2 完整升级、旧连接 blocked、事务 complete 与 abort 回滚测试。 | 保留为 API/概念核对。 |
| MDN Web Storage 总览 | 正文解释 session/local 生命周期、Storage 接口、storage 事件、隐私模式和配额说明。 | 容量数字是实现相关提示，不能承担 Cookie/Storage/IndexedDB 的工程选型；页面也没有多键原子事务。 | 保留为生命周期查表，不以容量作唯一决策。 |
| 中文核心讲义：BROWSER-01 | 定义中英术语，给出可测的渲染阶段、读写批量化、100 项委托/AbortSignal 清理、三存储选型，以及 v1→v2 schema、step 1→2 与故障 abort 的原子升级代码和快照。 | 不延伸到浏览器引擎内部算法、多设备同步或认证存储设计。 | 新增为核心必读。 |

### 练习与挑战闭环

class 修改录制、第 73 项内层点击、一次/清理后零次处理、v1/v2/abort 三组数据库状态和事务完成证据均可直接照讲义实现。事件冒泡深页替换了主题不完整的事件介绍；IndexedDB/Web Storage 根页被准确标为总览而非固定实验教程。

结论：修订前不合格；修订后合格。

## BROWSER-02 观察器、调度、页面生命周期与多标签页协同

### 原资料逐份结论

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| 旧中文核心讲义：BROWSER-02 | 三段概括四类 Observer、rAF/空闲/后台限流、postTask/yield 及生命周期、广播和锁。 | 没有 10000×100、12ms Abort、scheduler fallback、A 第 20 批冻结、锁任期、消息版本或恢复幂等代码。 | 删除当前直链。 |
| Chrome `scheduler.yield()` | 正文详细解释长任务、yield 后 continuation（延续）相对同级新任务的优先性、postTask 优先级继承、非 Chromium 支持和 setTimeout/polyfill 回退。 | 不接 AbortSignal，不处理固定数据、冻结和双标签协调；支持信息会变化。 | 保留为调度机制深页，固定协议由本地讲义承担。 |
| Chrome 页面生命周期 | 正文完整描述 active/passive/hidden/frozen/terminated/discarded、visibility/freeze/resume/pageshow/pagehide、BFCache 和 wasDiscarded；明确 hidden 是常见最后可靠保存机会，freeze 前应释放 IDB/BroadcastChannel/WebRTC/Web Locks，且不应依赖 unload。 | 页面很长且部分 freeze/resume 能力并非所有浏览器一致；不会实现本站双标签任务协议。 | 保留，限定状态、事件和释放建议；跨浏览器需降级。 |
| MDN BroadcastChannel | 正文说明同源命名频道、发送对象自身不接收、`postMessage()`、`close()`、message/messageerror。 | 是 API 参考，不提供消息版本、去重、历史重放、领导者或安全互斥。 | 保留为广播 API 核对。 |
| MDN Web Locks API | 正文解释同源异步锁、回调存续期间持锁、完成后自动释放、独占/共享、ifAvailable、signal、query 和领导者选举用途。 | 不处理页面冻结主动释放、消息 Schema、无支持环境和业务幂等。 | 保留为互斥机制深页。 |
| 中文核心讲义：BROWSER-02 | 把四类 Observer、帧/空闲/任务区分、固定分片/取消、生命周期清理、版本化 BroadcastChannel 和 Web Locks 任期连成 A/B 双标签实验；明确无锁时禁用单实例副作用或交给服务端，不能伪造强互斥。 | 不扩展到服务端分布式锁或 SharedArrayBuffer 并发。 | 新增为核心必读。 |

### 练习与挑战闭环

10000 项、每批 100、12ms Abort、A 第 20 批 freeze、B 接任、A resume 不重复订阅、无 scheduler fallback 和 version 2 消息拒绝均有直接代码或断言。资料还明确区分“广播到达”和“锁互斥”，避免初学者用心跳误判强一致性。

结论：修订前不合格；修订后合格。

## WEB-04 原生分层 UI、视图过渡与渐进增强

### 原资料逐份结论

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| 旧中文核心讲义：WEB-04 | 四段正确区分 dialog/popover/top layer/inert、DOM 身份、同/跨文档过渡、Navigation 与渐进增强。 | 没有固定菜单/命令面板/详情链接代码、四能力检测、关闭归焦、单次状态更新、双历史条目反例或截图协议。 | 删除当前直链。 |
| MDN popover 属性 | 正文明确 auto/manual、popovertarget/showPopover、轻触关闭、top layer，且不受祖先 position/overflow 影响。 | 是精简属性参考，不教授 modal/dialog、焦点归还、ARIA menu、fallback 或完整关闭过渡。 | 保留并准确标为属性核对页。 |
| MDN View Transition API | 正文解释 SPA/MPA 过渡、认知连续性、无障碍风险、ViewTransition/startViewTransition、pageswap/pagereveal、快照伪元素与 view-transition-name。 | 是 API 总览，不给固定 render/focus/history 协议；完整 CSS 扩展对初学者过宽。 | 保留，限定概念和接口；代码由本地讲义补足。 |
| MDN Navigation API | 正文讲授 navigate/intercept、navigatesuccess/error、committed/finished、历史条目/状态、同框/首次加载等限制；页面同时标示新近可用与实验性，需查兼容性。 | 不能替代真实 href/服务端路由，也不会自动避免应用再次 pushState 的双写。 | 保留为机制和限制核对，明确不是唯一核心路径。 |
| 中文核心讲义：WEB-04 | 完整实现普通按钮 popover、modal dialog、归焦、reduced-motion、单次 updateView、真实详情链接和合格 navigate 拦截；给出四能力 fallback、单历史条目、DOM 身份和受限排错。 | commands、interest invoker、元素范围过渡等只作边界认识，不进入固定交付。 | 新增为核心必读。 |

### 练习与挑战闭环

Escape/外点关闭、命令面板背景不可 Tab、触发器归焦、一次详情导航、关闭 View Transition 仍可完成任务、普通链接服务端 fallback 和四能力检测均有直接实现/断言。讲义同时纠正“popover 自动是菜单”和“View Transition 失败需再 render 一次”两个危险误解。

结论：修订前本地资料不足以实作；修订后合格。

## WEB-05 Web Components、Shadow DOM 与跨框架互操作

### 原资料逐份结论

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| 旧中文核心讲义：WEB-05 | 五段正确说明 Web Components 组成、Custom Element 生命周期、Shadow DOM 非安全沙箱、事件穿界和跨框架契约方向。 | 没有固定 user-score 实现、构造器约束、注册/监听清理、反射守卫、ElementInternals、表单 fallback、三框架代码或可执行验收。 | 删除当前直链。 |
| MDN Web Components | 正文完整总览 Custom Elements、Shadow DOM、template/slot 三支柱，给出 class/define/attachShadow/slot 基础流程，并列出生命周期、CSS、事件、ElementInternals 等参考入口。 | 是平台地图，不是 ElementInternals、composed event、React/Vue、SSR 或固定 fixture 教程；Scoped Registry 等新接口对初学者超出本题。 | 保留为平台模型与接口地图，限定承担范围。 |
| MDN 使用自定义元素 | 正文详述独立/自定义内置元素、实现与注册、构造器限制、connected/disconnected/adopted/attributeChanged、observedAttributes 和示例。 | 不教重复注册守卫、attribute/property 双向协议、事件穿界、表单关联、框架适配或 SSR。 | 保留为生命周期与属性观察深页。 |
| MDN 使用 Shadow DOM | 正文逐段解释 host/tree/boundary/root、attachShadow、open/closed、JS/CSS 封装、构造样式表、template style 和与自定义元素组合；明确 closed 不是强安全机制。 | 不实现 slot 契约、composed 自定义事件、ElementInternals、框架/微前端治理或 SSR fallback。 | 保留为 Shadow DOM 机制与反例深页。 |
| 中文核心讲义：WEB-05 | 给出双路径 HTML fallback、完整 user-score、生命周期清理、注册/回写守卫、ElementInternals、跨边界事件、CSS contract、原生/React/Vue 适配、SSR/微前端版本边界和八项验收。 | Scoped Custom Element Registry、复杂复合控件焦点管理只作术语边界，不进入固定交付。 | 新增为核心必读。 |

### 练习与挑战闭环

`<user-score name="Ada" score="7">`、slot 标题、Enter 单次增分、宿主/祖先各收一次 `score-change`、`FormData.getAll('Ada') === ['7']`、断开重连不重复监听、二次模块加载不重复注册、React/Vue/原生消费和禁用脚本 SSR 截图均有直接代码或断言。讲义还明确区分 attribute/property、upgrade/hydration、Shadow DOM 封装/安全隔离，避免初学者把术语混为一谈。

结论：修订前不足以完成固定考核；修订后合格。

## NET-01 浏览器网络协议、Fetch 与请求可靠性

### 原资料逐份结论

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| 旧中文核心讲义：NET-01 | 六段正确概括 URL/DNS/TLS、h2/h3、缓存、Cookie/CORS、Network Timing 和可靠性原则。 | 没有固定 30/10ms 竞态、Abort/序号代码、401 单飞、GET/POST 重试资格、四层成功、账号隔离或 HAR 证据协议。 | 删除当前直链。 |
| MDN HTTP 总览 | 主体定义 HTTP 应用层、客户端—服务端、无状态，并提供教程、Cookie、方法、状态、标头和工具入口。 | 是导航/参考地图，不能独立教授请求链路、Fetch 或固定可靠性挑战；大量标头索引对初学者超纲。 | 保留但准确改名为总览与参考地图。 |
| MDN HTTP 的发展 | 正文从 0.9 读到 1.1 连接复用/TLS，再到 h2 二进制多路与 h3/QUIC 每流丢包恢复。 | 历史人物、WebDAV 和完整扩展史不属于固定交付；不教应用层重试。 | 保留为协议差异深页，限定承担范围。 |
| MDN HTTP 缓存 | 正文详述私有/共享/托管缓存、启发式、age/max-age、Vary、验证器、no-cache/no-store/private、重载、请求合并和散列/HTML 模式。 | Service Worker Cache 仅作托管缓存边界，不是应用 Promise 去重或离线队列教程。 | 保留为 HTTP 缓存主线。 |
| MDN CORS | 正文完整覆盖简单/预检、凭据、Origin/Allow/Vary、暴露标头、预检缓存和浏览器错误限制。 | CORS 不是授权或 CSRF 防护，也不负责 refresh token 和重试。 | 保留为跨源机制深页并纠正边界。 |
| Chrome Network 参考 | 正文完整说明录制/保留、禁缓存、离线/节流、过滤/列、协议/连接/发起方、Timing、Service Worker、清理/敏感 HAR 导出与导入。 | 是工具参考，不解释业务成功、幂等或 singleflight；页面很多布局/复制选项不进入考试。 | 保留为证据采集手册。 |
| 中文核心讲义：NET-01 | 以四链、四层成功和固定策略表串起协议/缓存/CORS；给出 Abort+sequence、GET 去重、401 单飞、预算重试、POST 结果未知、离线账号隔离、HAR 判读与六 fixture 断言。 | `AbortSignal.any` 要按支持范围提供回退；传输协议实现不在前端交付范围。 | 新增为核心必读。 |

### 练习与挑战闭环

S1 30ms/S2 10ms 最终只提交 S2、401×3 只发一次 refresh、GET 503→200 受预算重试、POST `/pay` 503 自动重试为 0、离线恢复隔离账号、hashed/HTML/个性化资源缓存矩阵和清理 HAR 均有直接代码或断言。讲义把 Transport/HTTP/Business/UI Commit 四层成功分开，能直接支撑首考题 2 与生产排错。

结论：修订前概念够用但不可完成固定挑战；修订后合格。

## DEBUG-01 浏览器、异步与生产环境系统化调试

### 原资料逐份结论

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| 旧中文核心讲义：DEBUG-01 | 四段正确强调先固定环境取证、断点/Source Map、跨事件循环与缓存、生产关联 ID 和 bisect。 | 没有 v17/v18 事件卡、假设可证伪表、固定断点记录、map 制品配对、HIT/MISS 对照、bisect oracle 或回归输出。 | 删除当前直链。 |
| Chrome JavaScript 调试 | 正文以 5+1 字符串错误完整演示复现、Sources、事件/行断点、单步、Scope/Watch/Console 和临时修复。 | 是同步入门案例，不覆盖异步竞态、生产构建、缓存或 bisect；DevTools 临时改动不是生产修复。 | 保留为基础流程教程。 |
| Chrome 断点参考 | 正文按场景详列行、条件、Logpoint、DOM、XHR/Fetch、事件、异常、函数与 Trusted Types 断点，含 Worker/异步异常边界。 | 不教如何排序假设或避免暂停改变竞态；Trusted Types 属 SEC-02 主线。 | 保留为断点查表，讲义补选型。 |
| Chrome Source Map | 正文说明浏览器执行生成代码、Sources 显示 authored 源码，断点/日志/栈自动映射，并解释 sourceMappingURL/sourceURL。 | 页面较旧且不教授 release/散列配对、错误平台私有上传和源代码泄露治理。 | 保留为映射机制；生产治理由本地讲义补足。 |
| Pro Git 使用 Git 调试 | 正文覆盖 blame/-L/-C 与 bisect good/bad、first bad commit、run 自动化和 reset。 | 不保证判定脚本稳定，也不负责前端构建/网络 fixture；blame 不是因果证明。 | 保留为 Git 操作主线。 |
| 中文核心讲义：DEBUG-01 | 把 v17/v18、`app.min.js:1:1842`、`X-Cache:HIT` 和 30/10ms 固定为同一事件；提供三假设矩阵、断点/异步栈、同制品 map、HAR/cache、脱敏 Trace、确定性 bisect、最小修复与回归。 | 安全断点和真实生产发布权限不进入固定交付。 | 新增为核心必读。 |

### 练习与挑战闭环

20 次 v17/v18 复现、S1/S2 start/resolve/commit/drop、v18 JS/map 散列与 `handler.ts:42:11` 映射、同版本 HIT/MISS 对照、稳定 `git bisect run`、first bad commit、sequence 守卫和 30/10/10/30/Abort 忽略回归均有直接流程或断言。四类证据分别承担运行时、构建、网络/缓存和版本因果，不再把单个栈帧当根因。

结论：修订前缺少可执行证伪协议；修订后合格。

## SEC-01 XSS、CSRF 与前端输入输出信任边界

### 原资料逐份结论

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| 旧中文核心讲义：SEC-01 | 正确给出信任边界、按上下文编码、XSS/CSRF、DOM Clobbering、Prototype Pollution 和服务端授权原则。 | 没有固定五输入代码/攻击断言；挑战使用 `id=location`，不能作为跨浏览器可靠命名遮蔽证明；对象字面量 `__proto__` 也未说明污染发生于不安全 merge。 | 删除当前直链并修正 fixture。 |
| OWASP XSS 防护 | 正文逐项覆盖框架逃生口、HTML/属性/JS/CSS/URL 编码、危险上下文、HTML 净化、safe sinks 及单靠 CSP/拦截器的反例。 | 英文且内容很广；不能承担本站中文首考和 Prototype/CSRF。 | 保留为版本核验，限定范围。 |
| OWASP CSRF 防护 | 正文覆盖同步 token、签名双提交、Fetch Metadata、Origin/SameSite、客户端 CSRF、自定义 header、再认证和服务端校验。 | 大量框架代码和 HMAC 细节超出初级固定交付；XSS 可绕过 CSRF 防线。 | 保留为版本核验；本地讲义给最小协议。 |
| OWASP DOM Clobbering | 正文用 `redirectTo`/`config.url` 展示 id/name 命名属性遮蔽，并给净化、CSP 局限、显式变量、类型和局部作用域建议。 | 不支持旧挑战用 `id=location` 作为稳定证明。 | 保留并据此修正 fixture。 |
| OWASP Prototype Pollution | 正文说明污染影响及 Map/Set、无原型对象、freeze/seal、Node flag；明确 `constructor.prototype` 仍是路径。 | 没有站内 JSON→deep merge→admin 的完整前端实验。 | 保留为版本核验，本地讲义补攻击链。 |
| 中文核心讲义：SEC-01 | 给出数据流图、上下文表、Markdown safe sink、redirectTo 安全配置、JSON 递归危险键、URL allowlist、CSRF+授权服务端伪代码、敏感信息边界和六攻击矩阵。 | 身份会话生命周期继续归 IDENTITY-01。 | 新增为核心必读。 |

### 练习与挑战闭环

Markdown onerror、`id=redirectTo`、JSON `__proto__`/`constructor.prototype`、evil next、无 token 跨站转账和隐藏按钮直调均有明确阻断点与正常对照。修订还区分“JSON 解析出普通危险键”与“递归 merge 写入原型”，避免把根因错误归给 JSON.parse。

结论：修订前术语方向正确但 fixture 不严谨；修订后合格。

## SEC-02 CSP、Trusted Types 与安全违规报告

### 原资料逐份结论

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| 旧中文核心讲义：SEC-02 | 三段正确说明 nonce/hash/strict-dynamic、Report-Only→强制、Trusted Types policy、报告去重和纵深防御边界。 | 没有可执行响应头、`Reporting-Endpoints` 绑定、缓存 nonce/hash 路线、Policy 代码、旧浏览器回退、归一化字段或四 fixture 证据。 | 删除当前直链。 |
| MDN CSP 指南 | 正文从威胁、响应头/meta、指令和来源写到五类示例、Report-Only/强制并存、report-uri/report 字段、跨源 blocked URI 裁剪和兼容说明。 | 中文页的示例偏 host allowlist，未完整教授现代 strict nonce、`strict-dynamic`、Trusted Types 与生产降噪；导航与历史兼容细节不进入固定挑战。 | 保留为中文基础主线，讲义补现代策略。 |
| 旧 Window.trustedTypes 属性页 | 正文只有全局属性返回 `TrustedTypePolicyFactory` 的入口、规范与兼容链接。 | 不能承担三类 sink/type、命名 policy、CSP 强制、default policy、间接 sink 或旧浏览器路径。 | 删除当前直链。 |
| MDN Trusted Types API | 正文完整解释 HTML/JS/脚本 URL 三类 sink/type、自定义转换、命名 policy、`require-trusted-types-for`/`trusted-types`、default policy 迁移边界、直接/间接 sink、tinyfill 与 2026 兼容状态。 | 英文且 API 列表较长；Trusted Types 本身不提供净化器，不能把示例转换误当万能安全算法。 | 改为版本核验，不作为中文必读或独立首考题源。 |
| MDN upgrade-insecure-requests | 中文正文完整给出指令语法、子资源请求前 HTTP→HTTPS 改写、HTTPS 不可用时失败不回退、第三方顶层导航限制、HSTS 边界及 Report-Only 发现方式。 | 不教授证书、HSTS 部署、SRI 或完整 Mixed Content 治理，且这些不属于本点。 | 保留为精确边界页。 |
| 中文核心讲义：SEC-02 | 给出双语术语、固定 Report-Only/Enforce 响应头、每响应 nonce 与 hash 缓存路线、strict-dynamic 信任链、最小 `markdown` policy、旧浏览器同路径净化、报告聚合键/脱敏/owner、upgrade 边界与四 fixture。 | 真实净化器选型、CDN 产品配置、HSTS/SRI 和浏览器报告基础设施不进入固定交付。 | 新增为核心必读。 |

### 练习与挑战闭环

合法 SDK `n1`、缓存旧 `n0`、无 nonce 的 `evil.test` 和裸字符串 `innerHTML`/`markdown` policy 四条路径均有 Report-Only 与 Enforce 的响应头、网络、控制台、脚本副作用和报告证据。受限排错只比较头/HTML/cache key、脚本 nonce/Trusted Types policy 来源、原始报告与去重 key；修复不能靠 `unsafe-inline`、`unsafe-eval`、通配来源或放行 Default Policy。

结论：原中文资料方向正确但无法完成固定挑战，旧 Trusted Types 属性页承担范围错误；替换和补讲后合格。

## SEC-04 跨源隔离、嵌入式上下文与权限策略

### 原资料逐份结论

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| 旧中文核心讲义：SEC-04 | 正确概述 origin/site、COOP/COEP/CORP/CORS、SAB、iframe、消息、popup、XS-Leaks 与降级方向。 | 没有固定响应头、credentialless 语义、无 CORP 资源决策、iframe 代码、origin/source/Schema 校验、权限继承或六 fixture。 | 删除当前直链。 |
| 中文 MDN COEP | 正文定义 COEP，覆盖 unsafe-none/require-corp、CORP/CORS 配合、COOP 同时部署、crossOriginIsolated 检测、SAB 与 ArrayBuffer fallback。 | 当前中文正文仍未列 `credentialless`、`report-to` 参数和违规报告对象，不能承担完整当前版本。 | 保留为中文机制主线，明确版本缺口。 |
| 中文 MDN 权限策略 | 正文完整解释功能策略、头与 iframe allow 两种入口、与权限 API 的区别、allowlist `*`/`() `/self/src/origin、头/属性语法和父子最严交集。 | 页面标明有限可用；大量指令清单不要求背诵，也不教 sandbox、frame-ancestors 或 postMessage。 | 保留为权限继承深页，讲义补三锁。 |
| 英文 MDN COEP 完整版 | 正文包含 require-corp/credentialless、no-cors 与 cors 分工、可选 report-to、Reporting-Endpoints/违规字段、iframe/嵌入边界和 isolation 条件。 | 英文且指令/报告兼容仍需真实浏览器验证；不承担中文首考。 | 新增为版本核验。 |
| 英文 MDN COOP | 正文完整覆盖 BCG、unsafe-none/same-origin/same-origin-allow-popups/noopener-allow-popups、导航/Window.open 匹配、SAB 条件、opener 切断与同源敏感应用剩余防线。 | 英文且 BCG 全矩阵对初学者超纲；COOP 不保证进程机密隔离。 | 保留为版本核验，本地讲义给最小模型。 |
| 中文核心讲义：SEC-04 | 给出双语术语与四机制表、固定 app/partner/evil 响应头、require-corp/credentialless 决策、iframe 三锁代码、精确消息校验、popup/OAC/XS-Leaks 边界、SAB fallback、迁移清单和六 fixture。 | OAuth/支付供应商具体集成、完整 Permissions 指令表、XS-Leaks 全攻击目录不进入固定交付。 | 新增为核心必读。 |

### 练习与挑战闭环

隔离成功、无 CORP 图片、evil ready 消息、camera 权限、恶意父页和无隔离 fallback 六条路径均有响应头、Network、`crossOriginIsolated`、UI 状态、策略拒绝或业务结果证据。受限排错仅查 CORP/CORS/request mode、origin/source/Schema、父 Permissions-Policy/iframe allow，避免用 `*`、关闭 COEP 或无提示移除 sandbox 应付失败。

结论：中文官方页存在可定位的版本缺口，旧摘要不可执行；加入完整版本核验与中文固定实验后合格。

## SEC-03 WebAuthn、Passkey 与安全认证体验

### 原资料逐份结论

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| 旧中文核心讲义：SEC-03 | 三段正确说明站点绑定公钥、challenge/RP/origin/服务端验证、Passkey 同步可能性和取消/恢复方向。 | 没有固定注册/登录时序、状态机、challenge 原子消费、服务端 checks、防枚举、同步凭证计数边界、管理/恢复或六 fixture。 | 删除当前直链。 |
| W3C WebAuthn Level 3 | 下载的现行规范约 2.74 MB、230 个章节标题；正文从 API/数据结构/RP 操作延伸到认证器内部算法、8 类证明格式、扩展、WebDriver、IANA、安全/隐私/无障碍、测试向量和 IDL。 | 绝大部分不属于初级前端固定交付；全文作为“版本核验”仍会造成范围误导，且英文规范不是本站学习主线。 | 从现行资料删除，仅在历史删除保留范围证据。 |
| 中文 MDN Web Authentication API | 正文完整解释 create/get、安全上下文、公钥/认证器、注册与认证各步、服务端 challenge/origin/RP/签名验证、主要接口/options 和焦点丢失取消。 | 示例较旧，使用直接 attestation 并混有过时/不一致的 challenge 长度叙述；不教授 Passkey 条件式 UI、同步、恢复、防枚举或原子消费。 | 保留为 API/ceremony 入门，讲义纠正生产边界。 |
| 中文 web.dev 创建通行密钥 | 2026-04 正文覆盖提供方/同步、近期身份确认、前后端/浏览器/提供方四方、能力检测、creation options、RP/user/算法/排除项、toJSON、服务端库与存储、Signal API、通知和检查清单。 | 主体是注册，不覆盖完整认证、重放、服务端会话、防枚举恢复；具体 capability 仍需按浏览器支持检测。 | 保留为当前 Passkey 注册实践。 |
| 中文核心讲义：SEC-03 | 给出双语术语、app.test 两类时序、challenge 生产约束与原子状态、服务端 checks 模拟、签名计数边界、抗钓鱼/授权区别、前端状态机、条件式 UI/fallback、防枚举、同步/恢复/凭证管理和六 fixture。 | 证明证书链、认证器固件、跨设备传输协议和真实密码学验证留给服务端库/专项安全工程。 | 新增为核心必读。 |

### 练习与挑战闭环

注册、首次登录、重放、evil origin/错误 RP、用户取消和无 Passkey/conditional UI 六条路径均有 UI 状态、服务端布尔 checks、challenge `pending→used`、会话计数、通知或 fallback 证据。受限排错只查 challenge 绑定/过期/原子消费、RP/origin、credential/服务端结果，并明确修复“浏览器 Promise resolve 即认证成功”的状态机错误。

结论：移除过宽英文规范后，现行资料全部中文且刚好覆盖固定挑战；新增讲义补足服务端裁决、恢复与防枚举。

## SEC-05 Web Crypto、密钥生命周期与客户端密码学边界

### 原资料逐份结论

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| 旧中文补充讲义：SEC-05 | 七段正确覆盖 Web Crypto 边界、CryptoKey algorithm/type/extractable/usages、AES-GCM 12-byte IV/AAD、篡改、受控导出、轮换和 XSS 反例。 | 固定输入仍是 note/rvw_42/v3 而非站内 salary/user/v1→v2；缺五术语对照、完整 Envelope 函数、明确状态机、KMS/HSM 解释和六 fixture 表。 | 删除当前直链，由扩展讲义替代。 |
| W3C Web Cryptography Level 2 | 下载的现行规范约 1.59 MB、251 个章节标题；正文从 Crypto/CryptoKey/SubtleCrypto 扩展到 RSA、ECDSA/ECDH/Ed25519/X25519、四类 AES、HMAC/SHA/HKDF/PBKDF2 全操作、IANA 与密钥格式映射。 | 绝大部分不属于初级前端固定交付；英文规范作为版本核验仍制造过宽范围和算法选择风险。 | 从现行资料删除，历史记录保留范围证据。 |
| 中文 MDN SubtleCrypto | 正文先给“底层原语容易误用、完整密钥管理需专家审查”警告，再完整列 encrypt/decrypt/sign/verify/digest/generate/derive/import/export/wrap/unwrap，解释加密/密钥管理分类、结构化克隆/IndexedDB 和算法—操作表。 | 是 API 地图，不提供 AES-GCM nonce 唯一、信封、轮换/回滚、日志、KMS/HSM 或固定攻击实验；长算法表不要求初学者背诵。 | 保留为中文 API/边界主线。 |
| 中文核心讲义：SEC-05 | 给出编码/摘要/HMAC/签名/加密对照、CryptoKey 合同、KMS/HSM、A256GCM/IV/AAD/tag/Envelope、完整 salary fixture、随机/密码/导入导出/IndexedDB 边界、v1→v2 状态机与回滚、威胁模型和六 fixture。 | 密码派生参数、真实 KMS/HSM 运营、端到端协议和算法选型必须由安全专项/维护库承担。 | 新增为核心必读。 |

### 练习与挑战闭环

`salary=100`、AAD `user:1`、随机 12-byte IV、不可导出 A256GCM key、密文/IV/AAD 三篡改、IV 复用、v1→v2 成功/失败迁移均有直接代码、状态与证据要求。受限排错把“验签失败”纠正为 GCM authentication tag（认证标签）失败，避免初学者混淆数字签名与 AEAD 完整性。

结论：移除过宽英文规范并替换为精确中文讲义后，现行两份资料刚好覆盖挑战，超纲算法只保留术语边界。

## TS-01—TS-09 TypeScript 业务建模与版本迁移

### 原资料逐份结论

| 知识点/资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| TS-01 旧批次讲义 | 解释结构类型、可赋值性、推断、严格模式、`any/unknown/object/{}`、空值和类型擦除。 | 没有精确拒绝多余字段的守卫代码、四输入结果表、严格配置或品牌 ID 复测入口。 | 删除当前直链；新讲义逐项补齐。 |
| TS-02 旧批次讲义 | 解释联合/交叉、控制流、判别联合、守卫、`never` 与断言边界。 | 没有五态模型、真实 JSON 守卫、`assertNever` 代码和 `archived/paused` 编译/运行双证据。 | 删除当前直链；新讲义逐项补齐。 |
| TS-03 旧批次讲义 | 解释泛型关系、约束、`keyof/typeof/T[K]`、默认值和推断。 | 普通 `Column<T,K>` 没有解决异构数组中的键值关联丢失；缺固定列实现和可选字段复测。 | 删除当前直链；新讲义以 mapped union（映射联合）修正。 |
| TS-04 旧批次讲义 | 解释映射、修饰符、键重映射、模板字面量、标准工具和递归性能。 | 没有可运行 `PartialByKeys/EventName/DeepReadonly`，也未明确 Date、函数、数组、Map/Set 的分支顺序与语义限制。 | 删除当前直链；新讲义声明支持范围并补类型断言。 |
| TS-05 旧批次讲义 | 解释条件类型、`infer`、分布与方括号阻止分布、`never/any`。 | 没有与首考一致的 A—E 推导、`ParametersOf`、`Promise<string>|null` 复测和编译证据。 | 删除当前直链；新讲义逐输入给出预期。 |
| TS-06 旧批次讲义 | 解释重载、协变/逆变、方法双变性和组件 API。 | 没有固定数据库、两个重载的完整实现、函数属性与方法的代码对照、两个过窄回调拒绝。 | 删除当前直链；新讲义逐项补齐。 |
| TS-07 旧批次讲义 | 解释静态类型与运行时校验、错误 code/path/cause 和兼容策略。 | 没有完整解析器；对未知枚举的“拒绝/降级”未绑定固定结果，无法直接支撑四样本与 `pending` 复测。 | 删除当前直链；新讲义给出可执行解析器和降级联合。 |
| Zod Basics | 英文正文完整介绍 `parse/safeParse`、异步解析、类型推断、transform 输入/输出与 `z.toZod`。 | 绑定特定库，且没有本题错误模型、降级策略和固定输入；英文页并非版本事实必需。 | 从现行资料删除。 |
| OpenAPI Specification 3.2.0 | 下载正文约 673 KB、272 个章节标题；范围含文档格式、服务器/路径/操作、参数序列化、流式媒体、multipart、响应、回调、链接、完整 Schema 等。 | 绝大多数超出 TS-07 的“外部订单 JSON 解析”；整份英文规范即使标作核验也会制造错误学习范围。 | 从现行资料删除，仅保留本次范围证据。 |
| TS-08 旧批次讲义 | 解释实体/值对象/状态机/品牌、状态动作表、服务端重授权、版本冲突与幂等。 | 定义和原则较完整，但缺一份从类型、按钮到服务端 guard 的连续代码及 archived 三层拒绝实现。 | 删除当前直链；新讲义给出单一 fixture。 |
| NIST RBAC 项目页 | 英文正文概述角色承载权限及历史标准/研究资料。 | 页面明确标为 archived（已归档）且 no longer updated（不再更新）；主体是历史项目索引，不覆盖状态机、资源归属、乐观并发或幂等。 | 从现行资料删除。 |
| TS-09 旧批次讲义 | 正确解释 5.9/6.0 模块语义、默认项、弃用治理、三包迁移与回滚。 | 把 6.0 当未来迁移终点，未覆盖 2026-07 已正式发布的 7.0、无程序化 API、原生 CLI、双轨包和 Vue/Volar 限制。 | 删除当前直链；按 2026-08-25 重写。 |
| TypeScript 6.0 正式发布说明 | 官方正文覆盖 5.9→6.0 兼容桥、默认配置、弃用项、DOM/typed array 等迁移影响和 `stableTypeOrdering`。 | 英文、内容会继续演进，不适合作中文首考题源。 | 保留为 TS-09 版本事实核验。 |
| TypeScript 7.0 正式发布说明 | 2026-07-08 官方正文覆盖原生 `tsc`/LSP、并行参数、6.0 兼容边界、无程序化 API、`@typescript/typescript6`/`tsc6` 双轨和 Vue/MDX/Astro/Svelte/Angular 限制。 | 英文；精确包版本和 7.1 API 计划会过时，实施日必须重查。 | 保留为 TS-09 版本事实核验。 |
| 新中文核心讲义：TS-01—TS-09 | 每点均按定义—机制—场景—失败—验证展开；固定代码、输入、预期、反例、双语术语和复测与站内挑战逐项对齐。 | 真实库选型、真实生产升级和服务端安全实现仍需项目专项；讲义不假装替代交付证据。 | 新增为九点核心必读。 |

### 逐知识点覆盖与挑战闭环

| 知识点 | 新讲义的精确覆盖 | 可核验证据 | 结论 |
| --- | --- | --- | --- |
| TS-01 | 结构化兼容、额外属性检查、五类宽/空值类型、类型擦除、严格配置、精确守卫、品牌入口 | 四输入仅接受 Ada；拒绝原因；`tsc --noEmit`；品牌复测 | 合格 |
| TS-02 | 五态判别联合、控制流收窄、真实 JSON 守卫、`assertNever`、未知状态策略 | 五态快照；archived/paused 拒绝；新增成员时编译失败 | 合格 |
| TS-03 | `K extends keyof T`、`T[K]`、映射联合、字面量拓宽、可选字段 | 三列运行；非法 age；name 推导；可选 name 复测 | 合格 |
| TS-04 | 修饰符、键重映射、事件名、受控递归、Date/数组/集合、复杂度回退 | 嵌套与数组写入拒绝；Date 方法保留；readonly 数组复测 | 合格 |
| TS-05 | `infer`、分布/非分布、`never/any`、推断失败和简化策略 | A—E 类型断言；参数元组；null 变式对照 | 合格 |
| TS-06 | 重载/实现签名、单项/数组分支、回调逆变、方法双变性 | 两种运行输出；过窄回调拒绝；VIP 变式 | 合格 |
| TS-07 | unknown 入口、解析/归一化、code/path/cause、错误—UI 映射、未知枚举降级、隐私 | 四样本自动测试；pending 降级；用户文案不含原始响应 | 合格 |
| TS-08 | 实体/值对象/品牌、状态动作表、角色/资源、服务端授权、版本/幂等 | 合法/非法转换；3/4 冲突；archived 三层拒绝 | 合格 |
| TS-09 | 5.9→6.0→7.0、五类配置、三包 fixture、无 API、双轨、兼容矩阵、回滚 | 三包版本/类型/运行/打包/声明日志；工具矩阵；隔离复测 | 合格（实施日复核） |

### 初学者超纲控制

新讲义把 mapped union、variance、programmatic compiler API、LSP、optimistic concurrency、idempotency 等术语都保留英文原名并给出中文解释；它们只服务固定案例，不扩展到类型体操、编译器插件开发、完整 OpenAPI、RBAC 数学模型或生产密码/权限架构。每节明确“何时退回显式 DTO/运行时 guard/服务端裁决”，避免把复杂类型误当业务安全。

结论：TS-01—TS-09 的现行主资料已由“批次摘要 + 过宽英文核验页”替换为可直接完成固定挑战的中文讲义；TS-09 的时效事实由 6.0/7.0 官方页补证，其他点不再依赖英文资料。

## REACT-01 render、commit、快照与纯度

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| Render and Commit | 正文按触发渲染、React 调用组件、提交 DOM 三步解释首次渲染与重渲染，并说明没有变化时不会触碰 DOM。 | 不讲批处理中值式更新与函数更新的差异，也没有本站三个 `setNumber`、定时回调和 DOM 快照 fixture。 | 保留为中文阶段模型主线。 |
| State as a Snapshot | 正文完整解释一次 render 获得一份固定 state 快照、事件处理器闭包看到该次快照、一次点击中多次 `setNumber(number + 1)` 的结果，以及延迟回调仍读取旧快照。 | 没有把两个定时回调、值式/函数式更新和固定断言组合成一套可直接验收的实验。 | 保留为中文快照与更新语义主线。 |
| Keeping Components Pure | 正文用公式类比纯函数，区分组件外部变量的突变与组件自身局部突变，并解释 Strict Mode 重复调用帮助发现不纯渲染。 | 没有把 `Date.now()`、随机数、网络或 DOM 读写逐项归到事件/Effect，也不承担性能诊断。 | 保留为中文纯度主线。 |
| 中文补充讲义：REACT-01 | 把三页机制合成固定计数器：三次值式更新、三次函数更新、两个延迟回调、`Date.now()` 反例、Strict Mode 预期和 DOM/日志断言。 | 调度优先级和并发渲染内部实现不在本点范围。 | 新增为核心必读，闭合站内 fixture。 |

结论：三份官方中文资料负责概念来源，新讲义只补固定输入、时间线与验收，不重复扩张 React 内部实现。

## REACT-02 组件职责、props 与组合

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| Thinking in React | 正文以可搜索商品表讲解拆 UI 层级、构建静态版本、识别最小 state、确定 state 所有者和添加反向数据流的五步过程。 | 示例没有订单 A/B、悬挂选择、展开项集合、空态或错误态，不能直接完成本站边界排错。 | 保留为中文建模流程主线。 |
| Passing Props | 正文覆盖 props 读取、默认值、JSX 展开、嵌套 JSX 作为 `children`、props 随时间变化和 props 只读快照。 | `children` 只解释通用视觉包装，不给业务组件契约、受控状态或插槽职责审查。 | 保留为 props/组合基础。 |
| 中文补充讲义：REACT-02 | 给出订单 A/B、`selectedId`、`openIds`、可替换详情区域、悬挂选择恢复、组件契约表和四候选排错证据。 | render props、compound components 等高级组合模式只作术语边界，不要求实现。 | 新增为核心必读。 |

结论：现行资料能从“如何拆”一直支撑到固定边界失败；状态结构的深入治理留给 REACT-03。

## REACT-03 状态结构、提升与重置

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| Choosing the State Structure | 正文给出合并关联 state、避免矛盾/冗余/重复/深层嵌套五项原则，并以选择项、嵌套对象等示例展示修正。 | 没有价格 10→12、数量空字符串、total 20→24 的固定派生断言。 | 保留为中文结构原则主线。 |
| Sharing State Between Components | 正文通过手风琴解释把 state 提升到最近共同父级、受控与非受控组件、单一事实来源。 | 不覆盖 keyed draft reset、实体消失后的悬挂 ID 或服务端缓存。 | 保留为状态所有权主线。 |
| Preserving and Resetting State | 正文说明 state 与渲染树位置绑定；组件类型或位置变化会重置，`key` 可显式区分身份；也提醒嵌套组件定义会意外重置。 | 聊天草稿示例接近但没有本站订单价格/数量和受控输入的完整验收。 | 保留为身份与重置主线。 |
| 中文补充讲义：REACT-03 | 用唯一状态源 `quantityText`、派生 total、价格更新、空字符串输入和 `key` 重置草稿组成连续代码与断言。 | Actions、乐观提交和服务器状态不在本点，转入 REACT-09/DATA。 | 新增为核心必读。 |

结论：资料包刚好覆盖本地 UI 状态；不会把服务器缓存误称为“提升 state”。

## REACT-04 Effect、外部同步与清理

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| Synchronizing with Effects | 正文区分 render、事件和 Effect，解释依赖数组、每次提交后的运行、视频控件同步、连接清理及开发环境额外重挂载。 | 没有固定 A→B 延迟回调、取消/忽略/退订三层实现。 | 保留为中文 Effect 入门。 |
| Lifecycle of Reactive Effects | 正文把每个 Effect 看成独立同步过程，说明 start/stop、多次同步、响应式值、依赖校验和拆分互不相关过程。 | 内容较长，lint 抑制与对象/函数依赖不是本挑战主产出；不提供本站绝对毫秒时间线。 | 保留为生命周期与依赖主线。 |
| You Might Not Need an Effect | 正文系统列出 render 中派生、事件中处理、`useMemo` 缓存、用 `key` 重置、状态调整、共享逻辑等无需 Effect 的情形。 | 一些数据获取讨论依赖框架语境；不能替代请求取消和订阅清理。 | 保留，用于删除纯计算 Effect。 |
| 中文补充讲义：REACT-04 | 固定 0ms A、50ms 切 B、130ms B ready、150ms 卸载、300ms A 回调；分别实现 AbortController、active guard、unsubscribe，并给失败变式与断言。 | 不深入请求库或并发调度器实现。 | 新增为核心必读。 |

结论：题面已改为同一绝对时间原点，B 成功、卸载清理和旧 A 回调忽略能够同时成立。

## REACT-05 Hooks 规则与自定义 Hook

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| Reusing Logic with Custom Hooks | 正文从网络状态与聊天室连接提取自定义 Hook，解释名称、参数/返回值、共享逻辑而非共享 state、响应式代码以及何时提取。 | 篇幅很长但没有 debounce 固定实现、请求取消、卸载断言与权限边界。 | 保留为中文契约主线。 |
| Rules of Hooks | 正文枚举顶层调用要求，禁止在条件、循环、事件、回调、类、`try/catch/finally` 中调用 Hook，并说明 `use` 的特殊条件调用规则。 | 是规则页，不解释 timer/request 生命周期或普通函数何时更合适。 | 保留为调用顺序规则。 |
| 中文补充讲义：REACT-05 | 提供 `useDebouncedSearch` 完整代码；固定 0ms `a`、50ms `ab`、350ms 发出 `ab`、400ms 卸载，覆盖 timer/请求双取消、delay=0 假时钟步骤和权限不进通用 Hook 的边界。 | 搜索缓存、重试和服务端授权转入 DATA/SEC。 | 新增为核心必读。 |

结论：原题“250ms 卸载却只发出 ab”的矛盾已消除；资料与断言现在共用可执行时间线。

## REACT-06 Reducer、Context 与状态域

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| Extracting State Logic into a Reducer | 正文演示从多个事件处理器迁移到 reducer、dispatch action、编写纯 reducer，并比较 reducer 与 `useState`。 | 示例是任务列表，没有本站订单状态机、非法跃迁或单一转换表。 | 保留为中文 reducer 主线。 |
| Scaling Up with Reducer and Context | 正文完整演示创建 state/dispatch 两个 Context、Provider 提供 reducer、组件消费与抽取 provider 文件。 | 不讨论 Context 广播的实际测量、按状态域拆分或 selector/store 选型。 | 保留为中文组合主线。 |
| 中文补充讲义：REACT-06 | 以单一状态—动作转换表驱动 reducer；实现非法跃迁、状态/dispatch Context 拆分，并要求用 Profiler 证明更新范围。 | 外部 store、selector 和服务端缓存只给选型边界。 | 新增为核心必读。 |

结论：资料覆盖“写 reducer”到“证明 Context 拆分是否有效”，不把拆分本身当作性能结论。

## REACT-07 性能测量、memo 与大列表

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| React Profiler | 正文解释 `id`、`onRender`、phase、actualDuration、baseDuration、start/commit time；说明 profiling 会增加开销且生产构建需专用支持。 | 不提供业务预算、三次测量/中位数或列表交互无障碍验证。 | 保留为测量 API 主线。 |
| `memo` | 正文说明 props 未变时可跳过重渲染、缓存是优化而非保证、对象/函数 props 会破坏稳定性、自定义比较函数可能更慢。 | 不能证明具体组件值得 memo。 | 保留为边界参考。 |
| `useMemo` | 正文覆盖缓存计算、依赖、跳过子组件重渲染、稳定依赖和故障排查；反复强调只作性能优化。 | 示例不含本站大列表与删除优化反证。 | 保留为计算缓存参考。 |
| `useCallback` | 正文说明缓存函数定义、与 memo 的配合、依赖与 updater function，且不应靠它修复逻辑错误。 | 不提供实际收益基线。 | 保留为引用稳定性参考。 |
| 中文补充讲义：REACT-07 | 规定同制品/同设备/同交互测量，至少三次取中位数，对照 actual/base duration、渲染计数和输入延迟；要求删除优化反证，并把虚拟化焦点与 ARIA 纳入回归。 | 不讲 React 调度器内部优先级；Compiler 归 REACT-09。 | 新增为核心必读。 |

结论：先测量、再优化、再撤销验证，防止把 `memo` 当默认编码风格。

## REACT-08 错误边界、Suspense 与异步恢复

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| Error Boundary | 目标章节说明 `getDerivedStateFromError` 显示 fallback、`componentDidCatch` 记录错误，并明确边界捕获子树 render 错误。 | 不捕获事件处理器、普通异步回调、SSR 或边界自身错误；页面没有函数式错误边界 API，也没有本站重试协议。 | 保留为中文渲染错误语义。 |
| `Suspense` | 正文覆盖子树 pending 时 fallback、嵌套边界、再次 suspend 时替换、Transition 避免隐藏已显示内容、SSR/流式集成及状态保留注意事项。 | API 页很长；框架集成细节不等于任意 Effect 请求会触发 Suspense。 | 保留为中文 pending 边界主线。 |
| React `use` | 正文说明在组件/Hook 中读取 Promise 或 Context、可条件调用、与 Suspense/Error Boundary 协作、服务端创建 Promise 更稳定及 `try/catch` 限制。 | 直接在客户端 render 新建 Promise 会反复挂起；不提供缓存与取消协议。 | 保留为资源读取语义。 |
| TanStack Query Suspense | 英文正文解释特定库的 `useSuspenseQuery`、错误抛出、串行查询和取消限制。 | 库特定、英文且取消限制会扩大本点范围；不需要它即可完成 React 原生边界挑战。 | 从 REACT-08 删除，若 DATA 域采用该库再单独审读。 |
| 中文补充讲义：REACT-08 | 给出稳定资源缓存、局部 Suspense/Error Boundary 层级、500/取消/render throw 三类注入、retry key、调用次数与“普通 Effect 请求不 suspend”反证。 | 真实框架 SSR/流式缓存策略需按项目另行选择。 | 新增为核心必读。 |

结论：现行资料只保留 React 原生机制，第三方查询库不再制造超纲依赖。

## REACT-09 React 19.2、Compiler 与 RSC 安全边界

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| React 19.2 | 中文发布正文覆盖 `Activity`、`useEffectEvent`、`cacheSignal`、Performance Tracks、部分预渲染和 resume API，以及行为变化。 | 是发布说明，不给仓库依赖树扫描、升级矩阵或回滚流程。 | 保留为当前功能事实主线。 |
| React Compiler v1.0 | 中文正文说明编译器稳定、自动 memo、渐进采用、lint 诊断和 React 17+ 兼容；也提醒编译器不能修复规则违规代码。 | 不替代运行基线测量，也不保证第三方构建链兼容。 | 保留为当前编译器事实主线。 |
| RSC RCE 安全公告 | 官方英文正文说明未经认证请求可在受影响 RSC 服务端执行代码，列出受影响传输包、框架与补丁线。 | 首次公告中的早期补丁后来被证明不完整；英文且时效性强。 | 仅作版本核验，不作为必读/首考源。 |
| RSC DoS/源码暴露跟进公告 | 官方英文正文及 2026-01-26 更新说明后续拒绝服务、源码暴露和不完整补丁，当前安全基线为 19.0.4、19.1.5、19.2.4。 | CVE/CVSS、传输协议攻击细节对初学者超纲，版本也必须在真实升级日重查。 | 仅作版本核验。 |
| 中文补充讲义：REACT-09 | 串联功能、Compiler 渐进启用、RSC/Server Function 序列化与授权边界、锁文件实际传输包检查、供应链扫描、补丁/回滚证据，并逐一解释 RCE、DoS、CVE、CVSS。 | 不要求复现漏洞或实现 RSC 传输协议。 | 新增为核心必读。 |

结论：截至审读日以 React 19.2 功能线和 19.2.4 安全补丁为讲义基线；实施升级必须重新核验，而不能把文档快照当永久安全承诺。

## REACT-10 路由、数据加载与提交

| 资料 | 正文事实 | 缺口/超纲 | 处理 |
| --- | --- | --- | --- |
| React 创建应用 | 正文是从零创建 React 应用的框架推荐与生态入口，涉及 Next、React Router 等多种方案。 | 主体不是本站固定路由、loader/action、取消或未保存草稿挑战；要求阅读会扩大选型范围。 | 从现行资料删除。 |
| React Router 模式选择 | 当前 8.3.0 英文正文比较 Declarative、Data、Framework 三种模式在控制权、数据 API、代码分割与 SPA/SSR/静态策略上的差异。 | 英文且是选型页，不给固定 URL fixture。 | 仅作版本/模式核验。 |
| React Router Routing | 正文覆盖 route config、嵌套、layout、index、prefix、动态/可选/splat segment 和 route module。 | 不单独覆盖提交、pending 或草稿阻止。 | 仅作路由语义核验。 |
| React Router Data Loading | 正文解释 loader、URL 参数/request、并行数据策略、客户端加载与 revalidation 语义。 | 英文；真实缓存和鉴权仍是应用责任。 | 仅作数据加载语义核验。 |
| React Router Actions | 正文解释 Form/action、提交后自动 revalidate、pending UI、校验错误和导航外 fetcher 场景。 | 英文；不能直接承担本站权限、幂等或固定故障注入。 | 仅作提交语义核验。 |
| 中文补充讲义：REACT-10 | 按 8.3.0 固定 `/projects/:projectId/tasks/:taskId` 深链，给 route/loader/action/error/pending/revalidation、导航取消、未保存草稿、代码分割和 Declarative/Data/Framework 选择表及五步验收。 | 服务端授权、缓存协议和复杂 SSR 部署转入 SEC/DATA/ARCH。 | 新增为唯一中文核心必读。 |

结论：四份 Router 英文页只核验当前 API，学习和首考完全由精确中文讲义承接；宽泛生态页已删除。

## React 十点总闭环

| 知识点 | 固定证据 | 结论 |
| --- | --- | --- |
| REACT-01 | 三次值式/函数式更新、两个定时回调、Strict Mode 纯度日志 | 合格 |
| REACT-02 | 订单 A/B、悬挂选择、`openIds`、契约与受限排错 | 合格 |
| REACT-03 | 10→12、空数量、20→24、key 草稿重置 | 合格 |
| REACT-04 | 0/50/130/150/300ms 时间线、三层清理、B 失败变式 | 合格 |
| REACT-05 | 0/50/350/400ms debounce、delay=0、卸载回归 | 合格 |
| REACT-06 | 单一转换表、非法跃迁、Context 拆分 Profiler 反证 | 合格 |
| REACT-07 | 三次中位数、actual/base duration、删除优化反证、焦点回归 | 合格 |
| REACT-08 | pending/500/取消/render error/retry 与缓存调用次数 | 合格 |
| REACT-09 | 功能基线、Compiler 对照、依赖树补丁与回滚证据 | 合格（实施日复核） |
| REACT-10 | 深链、刷新、提交、错误、取消、草稿和模式选择 | 合格（版本日复核） |

至此，01—03 域 45 个知识点都已有逐资料正文记录；旧报告中的模板化“正文已读”不再作为独立完成证据。
