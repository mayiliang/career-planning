# 01 Web 平台核心基础

所有“通过”均需满足[统一考核规则](00-assessment-rules.md)。建议把代码、答卷和分析报告保存在 `evidence/JS-xx/`。

### JavaScript 语言模型

## JS-01 执行上下文、作用域与闭包

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN JavaScript 执行模型](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Execution_model)、[MDN 作用域](https://developer.mozilla.org/zh-CN/docs/Glossary/Scope)、[MDN 闭包](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Closures)、[MDN 函数](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Functions)。覆盖范围：执行上下文、词法环境、作用域链和闭包创建/保留机制；覆盖循环闭包、模块作用域、异步回调、内存保留与可回收条件，不延伸到框架生命周期抽象。
- 严格考核：首考题 1（资料定位）：只允许使用《MDN JavaScript 执行模型》《MDN 作用域》《MDN 闭包》《MDN 函数》，分别摘出能支撑「执行上下文、作用域与闭包」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：闭卷解释「执行上下文、作用域与闭包」覆盖的输入、状态转换、运行边界与失败传播，并用首考题 3 的产出证明机制选择；首考题 3（最小产出）：闭卷画出 3 段嵌套函数的作用域链并预测输出；30 分钟实现带私有状态、撤销和订阅能力的闭包模块；解释循环闭包、共享状态和不必要闭包的边界；首考题 4（受限排错）：围绕「执行上下文、作用域与闭包」的首考题 3 产出注入正常、边界和失败场景，提交预期/实际、三项资料假设、证伪证据、根因、修复与回归；首考题 5（学习复述）：3 分钟说明「执行上下文、作用域与闭包」解决的问题、运行机制、选型条件、反例和验证证据，并回答边界变化追问。命题边界：只在「执行上下文、作用域与闭包」所列资料和覆盖范围内命题；资料外经验不能替代题目要求的机制与证据。
- 通过标准：输出全对；实现无全局泄漏且测试覆盖多实例隔离；能解释词法作用域、创建时机、内存保留和不适合使用闭包的场景。评估边界：缺少与「执行上下文、作用域与闭包」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## JS-02 原型、对象模型与 `this`

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN 对象模型](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Inheritance_and_the_prototype_chain)、[MDN `this`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/this)。覆盖范围：自有属性与继承属性、原型链查找、属性描述符、构造调用、`this` 绑定、箭头函数、class 语义以及 `call`/`apply`/`bind`；覆盖原型污染之外的对象模型边界。
- 严格考核：首考题 1（资料定位）：只允许使用《MDN 对象模型》《MDN `this`》，分别摘出能支撑「原型、对象模型与 `this`」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：闭卷解释「原型、对象模型与 `this`」覆盖的输入、状态转换、运行边界与失败传播，并用首考题 3 的产出证明机制选择；首考题 3（最小产出）：闭卷解释 `new`、原型查找、class 语法和 `call/apply/bind`；实现简化版 `new` 与 `bind`；排查一个方法丢失 `this` 的真实 Bug；首考题 4（受限排错）：围绕「原型、对象模型与 `this`」的首考题 3 产出注入正常、边界和失败场景，提交预期/实际、三项资料假设、证伪证据、根因、修复与回归；首考题 5（学习复述）：3 分钟说明「原型、对象模型与 `this`」解决的问题、运行机制、选型条件、反例和验证证据，并回答边界变化追问。命题边界：只在「原型、对象模型与 `this`」所列资料和覆盖范围内命题；资料外经验不能替代题目要求的机制与证据。
- 通过标准：正确处理构造函数显式返回、箭头函数和多层原型；能比较组合、class 与原型委托的边界。评估边界：缺少与「原型、对象模型与 `this`」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## JS-03 类型、相等、拷贝与不可变更新

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN 数据类型](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Data_structures)、[MDN 相等比较](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Equality_comparisons_and_sameness)、[structuredClone](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/structuredClone)。覆盖范围：原始值与引用值、`Object.is`/严格相等、浅拷贝与深拷贝、结构化克隆、循环引用和不可变更新；区分值语义、身份语义与序列化边界。
- 严格考核：首考题 1（资料定位）：只允许使用《MDN 数据类型》《MDN 相等比较》《structuredClone》，分别摘出能支撑「类型、相等、拷贝与不可变更新」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：闭卷解释「类型、相等、拷贝与不可变更新」覆盖的输入、状态转换、运行边界与失败传播，并用首考题 3 的产出证明机制选择；首考题 3（最小产出）：完成 15 道隐式转换与相等判断题；实现支持循环引用的深拷贝或明确拒绝的类型；修复一段因引用共享导致的状态污染代码；首考题 4（受限排错）：围绕「类型、相等、拷贝与不可变更新」的首考题 3 产出注入正常、边界和失败场景，提交预期/实际、三项资料假设、证伪证据、根因、修复与回归；首考题 5（学习复述）：3 分钟说明「类型、相等、拷贝与不可变更新」解决的问题、运行机制、选型条件、反例和验证证据，并回答边界变化追问。命题边界：只在「类型、相等、拷贝与不可变更新」所列资料和覆盖范围内命题；资料外经验不能替代题目要求的机制与证据。
- 通过标准：至少答对 13 题；实现对 Date、Map、Set、数组和循环引用有明确策略；能说明深拷贝不是默认解决方案。评估边界：缺少与「类型、相等、拷贝与不可变更新」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## JS-07 迭代协议、元编程与资源生命周期

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#js-07)、[中文｜MDN 迭代协议](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Iteration_protocols)、[中文｜MDN Proxy](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Proxy)、[中文｜MDN Reflect](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Reflect)。覆盖范围：可迭代/迭代器协议、生成器、`Symbol`、`Proxy`/`Reflect` 不变量、惰性序列、同步/异步资源释放、可观测性与性能边界；全部必读资料均为中文。
- 严格考核：首考题 1（资料定位）：只允许使用《中文核心讲义》《中文｜MDN 迭代协议》《中文｜MDN Proxy》《中文｜MDN Reflect》，定位协议、不变量与资源清理规则；首考题 2（机制解释）：闭卷解释 `for...of`、生成器暂停恢复、代理陷阱与反射转发的因果链路；首考题 3（最小产出）：实现可提前终止的惰性分页迭代器、异步生成器与带清理语义的资源包装器；首考题 4（受限排错）：仅根据调用轨迹定位无限迭代、重复消费、代理不变量破坏或资源未释放；首考题 5（学习复述）：3 分钟说明何时选普通集合、生成器、代理或显式资源管理。命题边界：不考冷门语法记忆；必须验证终止、异常与清理路径。
- 通过标准：自定义迭代器符合协议并能提前关闭；异步迭代支持取消和背压；代理不破坏目标对象不变量；资源在成功、异常和取消路径均只释放一次。评估边界：只会写生成器示例或把 Proxy 当通用状态管理方案不能通过。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

### 计算机基础与数据处理

## CS-01 复杂度、数据规模与工程成本判断

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#cs-01)、[中文｜MDN 性能 API](https://developer.mozilla.org/zh-CN/docs/Web/API/Performance_API)。覆盖范围：输入规模、时间/空间复杂度、最坏/平均/摊还分析、常数与内存局部性、基准设计、规模曲线、主线程帧预算、序列化和服务端计算边界；全部必读资料均为中文。
- 严格考核：首考题 1（资料定位）：只允许使用《中文核心讲义》《中文｜OI Wiki 复杂度》《中文｜MDN 性能 API》，分别定位渐进复杂度、测量方法和浏览器性能边界；首考题 2（机制解释）：闭卷解释为何相同 Big-O 仍可能表现不同，以及一次小样本跑分为何不能证明可扩展；首考题 3（最小产出）：为线性、对数、线性对数和平方增长各构造一个前端数据处理实验，给出推导、规模曲线、内存与主线程证据；首考题 4（受限排错）：仅根据输入规模、调用次数、火焰图和内存数据定位一个复杂度退化；首考题 5（学习复述）：3 分钟说明何时优化算法、何时分块/Worker、何时转移到服务端。命题边界：不考竞赛技巧；必须同时给出推导和测量证据。
- 通过标准：能正确定义规模与基本操作；能区分最坏、平均和摊还复杂度；基准可重复且避免预热、缓存和样本偏差；能说明浏览器资源边界。评估边界：只背 Big-O 表、只测单一规模或只给运行时间不能通过。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## CS-02 常用数据结构、算法模式与正确性

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#cs-02)、[中文｜MDN Map](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Map)、[中文｜MDN Set](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Set)。覆盖范围：数组、链式结构、栈、队列、哈希、集合、堆、树、图与 Trie；排序稳定性、二分边界、双指针、滑动窗口、DFS/BFS、拓扑排序、贪心和动态规划的适用条件；不变量、终止性、边界样例与属性测试；全部必读资料均为中文。
- 严格考核：首考题 1（资料定位）：只允许使用《中文核心讲义》《中文｜OI Wiki 数据结构》《中文｜MDN Map》《中文｜MDN Set》，定位结构语义、典型操作和退化边界；首考题 2（机制解释）：闭卷比较数组、Map、Set、堆、树和图的查询、写入、遍历及内存取舍，并说明算法不变量；首考题 3（最小产出）：实现稳定排序/二分边界、动态 Top-K、依赖拓扑排序和树形权限查询，配套示例测试与属性测试；首考题 4（受限排错）：处理重复值、空输入、环、递归爆栈、错误比较器和哈希身份错误；首考题 5（学习复述）：3 分钟说明为何选择该结构而非熟悉的数组。命题边界：不要求冷门竞赛模板；考核可迁移模式、正确性和取舍。
- 通过标准：实现覆盖空值、重复、极端规模、环和非法输入；能写出关键不变量、复杂度及退化条件；不会把对象字符串化后草率当稳定键。评估边界：只通过理想样例或背诵模板不能通过。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## CS-03 前端大数据、Worker 并行、增量计算与内存边界

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#cs-03)、[中文｜MDN Web Worker](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Workers_API/Using_web_workers)、[中文｜MDN Streams API](https://developer.mozilla.org/zh-CN/docs/Web/API/Streams_API)、[中文｜MDN 可转移对象](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Workers_API/Transferable_objects)。覆盖范围：长列表索引、分块/流式/增量计算、迭代器、缓存淘汰、TypedArray、Worker 基础、结构化克隆与 Transferable、取消、背压、内存峰值、GC、虚拟化和服务端聚合。本点拥有通用大数据与 Worker 数据传递基础；AI 推理任务池归 `WEBAI-04`。
- 严格考核：首考题 1（资料定位）：只允许使用《中文核心讲义》《中文｜MDN Web Worker》《中文｜MDN Streams API》《中文｜MDN 可转移对象》，定位并发、流和数据传递边界；首考题 2（机制解释）：解释分块、增量索引、Worker 和服务端计算如何影响总计算量、交互延迟、复制成本与内存峰值；首考题 3（最小产出）：实现可取消的十万级筛选、Top-K 和增量聚合，比较主线程、Worker 与服务端模拟三种方案；首考题 4（受限排错）：定位重复排序、无界缓存、结构化克隆放大、消息洪泛和 GC 停顿；首考题 5（学习复述）：3 分钟给出大数据 UI 的分层决策。命题边界：不得把“移到 Worker”描述成消除计算成本。
- 通过标准：交互延迟、吞吐、内存和取消均有证据；Worker 通信有批量、背压与清理；超出客户端边界时能可靠降级或交给服务端。评估边界：只展示十万条数据最终算完而没有响应性和资源证据不能通过。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

### 异步、模块与宿主运行时

## JS-04 异步、Promise 与事件循环

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN 异步 JavaScript](https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Extensions/Async_JS)、[MDN 微任务指南](https://developer.mozilla.org/zh-CN/docs/Web/API/HTML_DOM_API/Microtask_guide)、[中文补充讲义：JS-04](../chinese-guides/content-audit-01-03.md#js-04)。覆盖范围：浏览器调用栈、任务、微任务、Promise reaction、timer、I/O 与渲染机会的调度关系；`async/await` 展开、微任务饥饿、顺序预测与以 trace 验证的边界。Node 的事件循环不是本点题源。
- 严格考核：首考题 1（资料定位）：只允许使用《MDN 异步 JavaScript》《MDN 微任务指南》《中文补充讲义：JS-04》，分别摘出定义、关键机制、边界/反例，并标明链接；首考题 2（机制解释）：闭卷说明一个浏览器任务完成后微任务检查点、渲染机会和下一任务的关系；首考题 3（最小产出）：完成 10 道给定浏览器 trace 的输出题（每题写出任务/微任务队列变化），并实现可取消、并发上限为 2 的浏览器任务执行器；输入为 5 个给定延迟/成功失败任务，输出必须按输入序号汇总结果、取消后不得启动新任务；首考题 4（受限排错）：针对微任务饥饿、错误的 `await` 顺序或取消后仍提交状态，提交 trace、预期/实际、三项可证伪假设、根因、修复与回归；首考题 5（学习复述）：3 分钟说明浏览器调度机制与可验证证据。命题边界：不得以 Node 专有调度顺序作答。
- 通过标准：输出题至少 9/10；调度器通过并发、顺序、取消、超时和错误测试；不会把 Promise 回调误判为普通宏任务。评估边界：缺少与「异步、Promise 与事件循环」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## JS-05 Promise 错误处理与异步控制流

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN Promise](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Using_promises)、[MDN AbortController](https://developer.mozilla.org/zh-CN/docs/Web/API/AbortController)、[中文补充讲义：JS-05](../chinese-guides/content-audit-01-03.md#js-05)。覆盖范围：Promise 拒绝传播、组合器、串并行、取消与 `finally`；超时、重试预算和过期结果抑制的业务边界；区分业务失败、网络失败、主动取消和未处理拒绝。
- 严格考核：首考题 1（资料定位）：只允许使用《MDN Promise》《MDN AbortController》《中文补充讲义：JS-05》，定位组合器、拒绝传播、取消和重试边界；首考题 2（机制解释）：闭卷画出搜索请求从发起、取消旧请求、接受最新结果到失败呈现的状态图；首考题 3（最小产出）：实现给定 `Promise.allSettled` 的等价结果聚合，并为给定搜索 fixture 加入 `AbortController`、请求序号和三类错误呈现；输入连续触发 `a`、`ab`、`abc`，输出只允许 `abc` 写入界面状态，取消不得显示为错误；首考题 4（受限排错）：诊断 `finally` 覆盖原拒绝、未处理拒绝、旧结果覆盖或不可安全重放的重试；首考题 5（学习复述）：说明取消、超时和重试各自不保证什么。命题边界：重试仅限讲义定义的可安全重放操作。
- 通过标准：实现符合原生语义且有边界测试；旧请求不能覆盖新结果；能区分业务错误、网络错误、取消和程序错误。评估边界：缺少与「Promise 错误处理与异步控制流」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## JS-06 ES Modules 与模块边界

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文｜MDN JavaScript 模块](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Modules)、[中文｜Node.js ECMAScript 模块](https://nodejs.cn/api/esm.html)。覆盖范围：浏览器与 Node.js 中 ESM 的静态结构、live binding、动态导入、循环依赖、强制扩展名、`package.json` 的 `type`/`exports`、ESM 与 CommonJS 互操作及模块边界设计；两份资料均为中文。
- 严格考核：首考题 1（资料定位）：只允许使用《中文｜MDN JavaScript 模块》《中文｜Node.js ECMAScript 模块》，分别摘出能支撑「ES Modules 与模块边界」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：闭卷解释「ES Modules 与模块边界」覆盖的输入、状态转换、运行边界与失败传播，并用首考题 3 的产出证明机制选择；首考题 3（最小产出）：解释静态依赖、live binding、循环依赖和动态导入；重构一个循环依赖示例；设计浏览器应用与组件包的导出边界；首考题 4（受限排错）：围绕「ES Modules 与模块边界」的首考题 3 产出注入正常、边界和失败场景，提交预期/实际、三项资料假设、证伪证据、根因、修复与回归；首考题 5（学习复述）：3 分钟说明「ES Modules 与模块边界」解决的问题、运行机制、选型条件、反例和验证证据，并回答边界变化追问。命题边界：只在「ES Modules 与模块边界」所列资料和覆盖范围内命题；资料外经验不能替代题目要求的机制与证据。
- 通过标准：可独立定位循环依赖初始化问题；能说清 ESM/CJS 互操作风险、tree-shaking 前提和 `exports` 字段作用。评估边界：缺少与「ES Modules 与模块边界」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## WASM-01 WebAssembly 通用运行时、宿主边界与工程化

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#wasm-01)、[MDN WebAssembly](https://developer.mozilla.org/zh-CN/docs/WebAssembly)、[WebAssembly Core 3.0](https://webassembly.github.io/spec/core/)（英文原文，仅用于版本核验）、[WebAssembly JavaScript API](https://webassembly.github.io/spec/js-api/)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：模块、实例、导入/导出、线性内存、Table、编译/流式实例化、JavaScript/Wasm ABI、数据编组、所有权、跨边界成本、SIMD、线程、调试和构建供应链。Component Model 与 WASI 只作为中文讲义中标明运行时成熟度的扩展边界，不设根页资料或独立题源。
- 严格考核：首考题 1（资料定位）：只允许使用《中文核心讲义》，定位核心执行模型、JavaScript 接口、内存/所有权、线程条件、调试和组件化成熟度边界；首考题 2（机制解释）：闭卷解释一个 Wasm 模块从获取、验证、编译、实例化、导入调用到内存交换的因果链，并说明沙箱不等于业务安全；首考题 3（最小产出）：用 Rust 或 C/C++ 实现含字符串和二进制缓冲区的计算模块，提供流式实例化、特性检测、错误传播、显式释放和 JavaScript fallback，对比少量大调用与大量小调用的加载、预热、执行、内存和包体；首考题 4（受限排错）：根据导入不匹配、内存越界、视图在 memory grow 后失效、对象未释放、线程隔离失败、source map 缺失或 ABI 编组错误定位修复；首考题 5（学习复述）：3 分钟说明何时选 JavaScript、Wasm、WebGPU、服务端原生模块或 Component Model。命题边界：WASI 与 Component Model 必须按具体运行时标注成熟度，不得当作所有浏览器原生能力；英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：接口和所有权合同明确；异常、取消与释放形成闭环；跨边界成本有基准而非想当然；线程路径满足 `crossOriginIsolated` 并有单线程降级；产物来源、体积、缓存和调试可验证；能够说明 Wasm 的沙箱、宿主导入和业务授权分别解决什么问题。评估边界：只把现成 `.wasm` 文件加载成功、只展示单次跑分或把 Core 3.0/WASI/组件模型宣传为通用浏览器基线不能通过。
- 预计耗时：资料 135 分钟；练习 195 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

### Web 标准与可访问性

## WEB-01 HTML 语义、表单与可访问性基础

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文｜MDN HTML 语义化](https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/Structuring_content)、[中文｜MDN Web 表单](https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Extensions/Forms)、[中文｜MDN ARIA](https://developer.mozilla.org/zh-CN/docs/Web/Accessibility/ARIA)、[中文｜MDN dialog 元素](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Reference/Elements/dialog)。覆盖范围：HTML 语义结构、标签与控件关联、表单分组和错误提示、原生元素优先原则、ARIA 的名称/角色/状态、键盘操作以及对话框焦点进入、约束和恢复；全部必读资料均为中文。
- 严格考核：首考题 1（资料定位）：只允许使用《中文｜MDN HTML 语义化》《中文｜MDN Web 表单》《中文｜MDN ARIA》《中文｜MDN dialog 元素》，分别摘出能支撑「HTML 语义、表单与可访问性基础」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：闭卷解释「HTML 语义、表单与可访问性基础」覆盖的输入、状态转换、运行边界与失败传播，并用首考题 3 的产出证明机制选择；首考题 3（最小产出）：把一段全是 `div` 的表单与弹窗改成语义结构；只用键盘完成操作；用辅助技术树检查名称、角色、状态；首考题 4（受限排错）：围绕「HTML 语义、表单与可访问性基础」的首考题 3 产出注入正常、边界和失败场景，提交预期/实际、三项资料假设、证伪证据、根因、修复与回归；首考题 5（学习复述）：3 分钟说明「HTML 语义、表单与可访问性基础」解决的问题、运行机制、选型条件、反例和验证证据，并回答边界变化追问。命题边界：只在「HTML 语义、表单与可访问性基础」所列资料和覆盖范围内命题；资料外经验不能替代题目要求的机制与证据。
- 通过标准：表单标签、焦点顺序、错误提示和弹窗焦点管理正确；不能用 ARIA 掩盖可使用原生元素的问题。评估边界：缺少与「HTML 语义、表单与可访问性基础」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## WEB-02 CSS 布局、层叠与响应式

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN CSS 布局](https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/CSS_layout)、[MDN 层叠](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_cascade/Cascade)。覆盖范围：层叠来源与优先级、盒模型、格式化上下文、Flex/Grid、媒体查询、响应式排版、溢出与滚动容器；覆盖缩放、长文本、窄屏和打印边界。
- 严格考核：首考题 1（资料定位）：只允许使用《MDN CSS 布局》《MDN 层叠》，分别摘出能支撑「CSS 布局、层叠与响应式」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：闭卷解释「CSS 布局、层叠与响应式」覆盖的输入、状态转换、运行边界与失败传播，并用首考题 3 的产出证明机制选择；首考题 3（最小产出）：90 分钟无组件库实现响应式列表、吸顶工具栏和弹层；解决 BFC、层叠上下文、溢出和长文本问题；解释 Flex/Grid 选择；首考题 4（受限排错）：围绕「CSS 布局、层叠与响应式」的首考题 3 产出注入正常、边界和失败场景，提交预期/实际、三项资料假设、证伪证据、根因、修复与回归；首考题 5（学习复述）：3 分钟说明「CSS 布局、层叠与响应式」解决的问题、运行机制、选型条件、反例和验证证据，并回答边界变化追问。命题边界：只在「CSS 布局、层叠与响应式」所列资料和覆盖范围内命题；资料外经验不能替代题目要求的机制与证据。
- 通过标准：覆盖 320px、768px、1440px；无横向溢出；不能依赖大量 `!important` 或固定像素碰巧通过。评估边界：缺少与「CSS 布局、层叠与响应式」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## WEB-03 现代 CSS 架构、容器查询与渐进增强

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#web-03)、[Baseline 2026](https://web.dev/baseline/2026?hl=zh-cn)、[MDN Container Queries](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_containment/Container_queries)、[MDN Cascade Layers](https://developer.mozilla.org/zh-CN/docs/Web/CSS/@layer)、[MDN CSS Anchor Positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Anchor_positioning)（英文原文，仅用于版本核验）、[MDN Scroll-driven Animations](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations)（英文原文，仅用于版本核验）、[CSS Color Module Level 5](https://www.w3.org/TR/css-color-5/)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：容器查询、级联层、嵌套、`@scope`、逻辑属性、Subgrid、`content-visibility`、现代/相对颜色、Anchor Positioning、Scroll-driven Animations、Baseline、回退和 reduced-motion。只消费 `DS-01` 产出的 CSS 自定义属性，不重复定义 Token 分类、构建和治理。
- 严格考核：首考题 1（资料定位）：只允许使用《中文核心讲义》，定位现代 CSS 作用域、响应、定位、滚动动画、CSS 变量消费和成熟度边界；首考题 2（机制解释）：闭卷解释视口、容器、锚点和滚动时间线分别由什么状态驱动，以及它们如何改变组件复用和脚本职责；首考题 3（最小产出）：把依赖页面断点、全局覆盖、脚本定位和滚动监听的组件重构为容器查询、级联层、逻辑属性、CSS 变量消费、锚点定位和滚动驱动增强；建立 Baseline/目标流量矩阵、无新特性回退和 reduced-motion 路径；首考题 4（受限排错）：定位查询容器缺失、层叠层顺序、锚点回退、滚动时间线、writing-mode、`content-visibility` 可访问性或旧浏览器降级问题；首考题 5（学习复述）：3 分钟说明哪些现代 CSS 可以替代 JavaScript、哪些仍需脚本或服务端状态。命题边界：不得在本点重新定义 Token 层级；不得因新特性减少代码就跳过键盘、读屏、缩放、打印和真实支持矩阵；英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：组件放入 3 种容器和两种 writing-mode 均可用；层叠顺序可预测且无 `!important`；能够消费 DS-01 产出的语义令牌且不在本点重新定义 Token 层级；定位/滚动增强关闭或不支持时核心任务仍可完成；动画尊重 reduced-motion；提交目标浏览器、320px/768px/1440px 和至少一项键盘/读屏视觉回归证据。评估边界：只在最新版 Chrome 展示效果或用 polyfill 隐藏兼容结论不能通过。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## A11Y-01 WCAG 2.2、无障碍测试与工程治理

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/advanced-topics.md#a11y-01)、[中文｜MDN 无障碍课程](https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/Accessibility)、[中文｜MDN ARIA](https://developer.mozilla.org/zh-CN/docs/Web/Accessibility/ARIA)、[中文｜Chrome DevTools 无障碍参考](https://developer.chrome.com/docs/devtools/accessibility/reference?hl=zh-cn)、[中文｜Lighthouse 无障碍评分](https://developer.chrome.com/docs/lighthouse/accessibility/scoring?hl=zh-cn)。覆盖范围：WCAG 2.2 POUR 与 AA 基线；语义、名称/角色/值、键盘模型、焦点、动态通知、表单错误、拖拽等价操作、目标尺寸、缩放、对比度、字幕与 reduced-motion；AI 流式回答、生成式 UI 和生成媒体的辅助技术边界；自动扫描、无障碍树、键盘和屏幕阅读器人工验证；组件准入规则、缺陷分级、CI 门禁、例外期限、负责人和回归基线等工程治理。
- 严格考核：首考题 1（资料定位）：只允许使用列出的中文资料，定位 WCAG 2.2、ARIA 使用边界、自动扫描局限和人工验证依据；首考题 2（机制解释）：闭卷解释语义树、焦点、名称计算、动态通知和用户偏好如何共同影响辅助技术体验，并说明单页修复为何不能替代工程治理；首考题 3（最小产出）：审计并修复一个含命令面板、拖拽、表单错误、AI 流式回答、生成图片、媒体和动画的页面，同时提交组件准入清单、CI 门禁、缺陷分级、例外到期与回归策略；首考题 4（受限排错）：定位焦点丢失、流式内容刷屏、语义漂移、替代文本缺失、对比度或 reduced-motion 失效，并判断应由组件、页面还是组织门禁阻断；首考题 5（学习复述）：3 分钟说明自动扫描为什么不能替代人工测试和治理闭环。命题边界：不得用单一分数或单次人工演示代表持续合规。
- 通过标准：关键流程满足 WCAG 2.2 AA；焦点、动态状态、错误、AI 流式结果和生成媒体均可被辅助技术正确感知；自动扫描无严重问题并附键盘、无障碍树和屏幕阅读器记录；组件准入、CI、缺陷负责人、例外期限和回归基线形成可执行闭环。评估边界：Lighthouse 分数、ARIA 数量或单一读屏器通过均不能单独作为通过证据。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

### 浏览器运行时与原生能力

## BROWSER-01 渲染流水线、DOM 事件与存储

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#browser-01)、[MDN 关键渲染路径](https://developer.mozilla.org/zh-CN/docs/Web/Performance/Guides/Critical_rendering_path)、[MDN 事件](https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/Scripting/Events)、[MDN IndexedDB](https://developer.mozilla.org/zh-CN/docs/Web/API/IndexedDB_API)、[Web Storage](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Storage_API)。覆盖范围：HTML/CSS 到像素的渲染阶段、事件传播与委托、Cookie/Web Storage/IndexedDB 的容量、事务、一致性、同步阻塞、安全与生命周期边界；全部必读资料均为中文。
- 严格考核：首考题 1（资料定位）：只允许使用《中文核心讲义》《MDN 关键渲染路径》《MDN 事件》《MDN IndexedDB》《Web Storage》，分别定位渲染、事件和三类存储的语义边界；首考题 2（机制解释）：闭卷解释样式、布局、绘制、合成，事件捕获/冒泡，以及同步键值存储与异步事务数据库的差异；首考题 3（最小产出）：画出 HTML 到像素的流程，实现可清理的事件委托，并为离线草稿设计 IndexedDB 事务和迁移；首考题 4（受限排错）：根据性能轨迹、事件路径和存储事务证据定位强制布局、重复监听或部分写入；首考题 5（学习复述）：3 分钟说明 Cookie、Web Storage 与 IndexedDB 的选型。命题边界：不得把容量大小当唯一依据，也不得把前端存储视为可信安全边界。
- 通过标准：能用 DevTools 证据区分 style/layout/paint/composite；事件实现正确处理冒泡与清理；存储选型不保存不应落盘的敏感数据。评估边界：缺少与「渲染流水线、DOM 事件与存储」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## BROWSER-02 观察器、调度、页面生命周期与多标签页协同

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#browser-02)、[中文｜使用 scheduler.yield](https://developer.chrome.com/blog/use-scheduler-yield?hl=zh-cn)、[中文｜Chrome 页面生命周期](https://developer.chrome.com/docs/web-platform/page-lifecycle-api?hl=zh-cn)、[中文｜MDN BroadcastChannel](https://developer.mozilla.org/zh-CN/docs/Web/API/BroadcastChannel)、[中文｜MDN Web Locks API](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Locks_API)。覆盖范围：Intersection/Resize/Mutation/Performance Observer；`requestAnimationFrame`、空闲任务、`scheduler.postTask()`/`scheduler.yield()`、优先级、TaskController/AbortSignal、分片、公平性与饥饿；可见性、冻结/恢复和 BFCache；BroadcastChannel、SharedWorker、Web Locks、互斥与领导者选举；能力检测、清理和降级；全部必读资料均为中文。
- 严格考核：首考题 1（资料定位）：只允许使用《中文核心讲义》《中文｜优化长任务》《中文｜使用 scheduler.yield》《中文｜Chrome 页面生命周期》《中文｜MDN BroadcastChannel》《中文｜MDN Web Locks API》，定位调度优先级/取消、生命周期、跨上下文消息和互斥规则；首考题 2（机制解释）：闭卷解释观察器回调、用户阻塞/可见/后台任务、yield continuation、后台限流、冻结恢复与多标签竞争如何相互影响；首考题 3（最小产出）：把一个长计算切分为有优先级、可取消且有无 Scheduling API 降级的任务，同时实现可见才计算、生命周期安全自动保存和多标签单领导者任务，并对比 INP、总耗时和饥饿；首考题 4（受限排错）：定位错误优先级、后台任务饿死交互、过度 yield、观察器泄漏、恢复后重复订阅、BFCache 失效、消息回环或双领导者；首考题 5（学习复述）：3 分钟说明微任务、帧、空闲、优先任务、Worker、广播与锁的选型。命题边界：Scheduling API 不是 Baseline，必须能力检测；不得依赖固定计时碰运气，必须覆盖不可见、冻结、恢复、关闭和不支持 API 的路径。
- 通过标准：主线程分片后交互改善且业务总耗时没有无界恶化；优先级、取消和降级可验证；回调可取消且无泄漏；后台页面不做无效高频工作；恢复后状态一致且不重复提交；多标签竞争有版本化协议、超时和确定性降级；BFCache 与兼容性有实测证据。评估边界：只调用一次 `yield()`、只演示单标签前台路径或没有比较调度开销不能通过。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## WEB-04 原生分层 UI、视图过渡与渐进增强

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Baseline 2025](https://web.dev/baseline/2025?hl=zh-cn)、[Popover API](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Reference/Global_attributes/popover)、[View Transition API](https://developer.mozilla.org/zh-CN/docs/Web/API/View_Transition_API)、[Navigation API](https://developer.mozilla.org/zh-CN/docs/Web/API/Navigation_API)。覆盖范围：`dialog`、popover、top layer、`inert`、声明式 invoker commands/`commandfor`、可定制原生控件与状态保持 DOM 移动；同文档、跨文档和元素范围 View Transition；Navigation API；焦点、历史、表单、恢复、reduced-motion；Baseline、有限支持/实验能力的分层与渐进增强。
- 严格考核：首考题 1（资料定位）：只允许使用《Baseline》《Baseline 2025》《Popover API》《View Transition API》《Navigation API》，分别定位原生分层 UI、声明式命令、视图过渡、导航与成熟度依据；首考题 2（机制解释）：闭卷解释 top layer、焦点/背景隔离、命令触发、DOM 状态保持、导航历史和 View Transition 快照如何协作；首考题 3（最小产出）：不用第三方弹层库实现菜单、命令面板和模态流程，组合 `popover`、`dialog`、top layer、`inert`、声明式命令和焦点恢复；为列表到详情增加可关闭的同/跨文档 View Transition，并为 Navigation API、可定制控件和新命令提供能力检测与传统 HTML 降级；首考题 4（受限排错）：定位重复命令、无障碍名称、焦点丢失、背景可操作、历史重复、DOM 移动状态丢失、过渡伪元素层级或 reduced-motion 失效；首考题 5（学习复述）：3 分钟说明何时选择原生能力、框架抽象或普通链接/表单。命题边界：成熟度必须按测试日期冻结；有限支持或实验能力不得成为完成核心任务的唯一路径。
- 通过标准：Escape、外部点击、焦点圈定与返回焦点行为正确；声明式命令和脚本 fallback 语义一致；动画关闭后功能不受影响；旧浏览器走可用降级；无重复历史、焦点丢失、表单状态意外重置或不可操作背景；能解释原生能力与框架路由的职责边界。评估边界：只展示动画、只在单浏览器工作或以自定义 div 伪装原生控件不能通过。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## WEB-05 Web Components、Shadow DOM 与跨框架互操作

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#web-05)、[中文｜MDN Web Components](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_components)、[中文｜MDN 使用自定义元素](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_components/Using_custom_elements)、[中文｜MDN 使用 Shadow DOM](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_components/Using_shadow_DOM)。覆盖范围：Custom Elements 生命周期与注册表、Shadow DOM 封装、template/slot、属性与属性值反射、ElementInternals 与表单关联、自定义状态、CSS Parts/自定义属性、composed 事件和焦点/无障碍树；在原生、React、Vue、微前端和设计系统中的互操作与版本边界；全部必读资料均为中文。
- 严格考核：首考题 1（资料定位）：只允许使用《中文核心讲义》《中文｜MDN Web Components》《中文｜MDN 使用自定义元素》《中文｜MDN 使用 Shadow DOM》，定位生命周期、封装、Slot 和事件边界；首考题 2（机制解释）：闭卷画出 light DOM、shadow tree、flattened tree、事件 composed path 与焦点关系，并解释 Shadow DOM 不等于安全沙箱；首考题 3（最小产出）：实现一个可表单提交、可主题化、可键盘操作的自定义元素，在原生页面、React 和 Vue 中消费，提交属性/事件/样式/SSR 降级契约及三环境组件测试；首考题 4（受限排错）：定位重复注册、属性循环、事件不穿透、样式无法覆盖、表单值丢失或读屏名称错误；首考题 5（学习复述）：3 分钟说明何时选择 Web Component、框架组件或普通函数。命题边界：不得把某个封装库的 API 当成平台标准，也不得通过关闭 Shadow DOM 回避边界问题。
- 通过标准：组件跨三个消费环境行为一致；事件、属性、方法、Slot、样式和版本契约清楚；表单、键盘和读屏可用；支持能力检测和无 Shadow DOM/SSR 的可用降级；能说明封装、性能和调试代价。评估边界：只在单一框架运行、只展示视觉封装或依赖全局样式碰巧生效不能通过。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

### 网络与系统化诊断

## NET-01 浏览器网络协议、Fetch 与请求可靠性

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#net-01)、[中文｜MDN HTTP](https://developer.mozilla.org/zh-CN/docs/Web/HTTP)、[中文｜MDN HTTP 的发展](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Guides/Evolution_of_HTTP)、[中文｜MDN HTTP 缓存](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Guides/Caching)、[中文｜MDN CORS](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Guides/CORS)、[中文｜Chrome Network 参考](https://developer.chrome.com/docs/devtools/network/reference?hl=zh-cn)。覆盖范围：URL、DNS、连接、TLS/证书到请求响应的浏览器链路；HTTP、Cookie、缓存与 CORS；请求超时、取消、重试退避与抖动、幂等键、重复提交、并发去重、过期响应、刷新令牌风暴和离线恢复；HTTP/1.1、HTTP/2、HTTP/3/QUIC 差异，以及 Service Worker、代理、CDN、TTFB 和瀑布流诊断。
- 严格考核：首考题 1（资料定位）：只允许使用列出的中文资料，定位浏览器请求阶段、缓存语义、CORS 和请求取消依据；首考题 2（机制解释）：闭卷画出一次可取消请求从 DNS、连接、TLS、缓存到响应提交的链路，说明重试、幂等、去重和过期响应抑制的关系；首考题 3（最小产出）：为题目提供的请求客户端实现超时、取消、指数退避与抖动、幂等键、刷新令牌单飞、并发去重和 stale-response 防护，并为 HTML、哈希资源和用户数据设计缓存/CORS/Cookie 策略；首考题 4（受限排错）：定位证书、缓存污染、预检、重复提交、请求风暴、取消失效、离线重连或旧响应覆盖新状态，给出客户端与服务端证据；首考题 5（学习复述）：3 分钟说明传输成功、业务成功与界面提交为什么是三个状态。命题边界：不要求实现传输协议，但必须证明请求生命周期可靠。
- 通过标准：能从 Timing 和协议列解释延迟；缓存不泄漏用户数据；取消能停止后续状态提交；重试只用于可安全重放的操作并受预算限制；并发请求、刷新令牌和离线恢复不会造成风暴或重复副作用；优化有前后瀑布与自动化故障注入证据。评估边界：清缓存、无限重试、只处理 GET 或背诵状态码不能代替可靠性证明。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## DEBUG-01 浏览器、异步与生产环境系统化调试

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#debug-01)、[中文｜Chrome JavaScript 调试](https://developer.chrome.com/docs/devtools/javascript?hl=zh-cn)、[中文｜Chrome 断点参考](https://developer.chrome.com/docs/devtools/javascript/breakpoints?hl=zh-cn)、[中文｜Chrome Source Map](https://developer.chrome.com/docs/devtools/javascript/source-maps?hl=zh-cn)、[中文｜Pro Git 使用 Git 调试](https://git-scm.com/book/zh/v2/Git-工具-使用-Git-调试)。覆盖范围：可重复最小用例、预期/实际差异、假设排序和证伪；行/条件/日志/DOM/事件/XHR/异常断点、调用栈、异步栈、闭包和 Worker 上下文；网络重放、存储、Source Map、压缩产物与生产错误映射；日志、Trace、版本差异、`git bisect` 和回归测试；全部必读资料均为中文。
- 严格考核：首考题 1（资料定位）：只允许使用列出的中文资料，定位适合不同故障的断点、Source Map 和 `git bisect` 方法；首考题 2（机制解释）：闭卷说明“复现—取证—假设—最小验证—修复—回归”的闭环以及相关性为何不等于根因；首考题 3（最小产出）：分别诊断一个异步竞争、DOM 事件、请求/缓存和压缩后生产错误，保存断点、调用栈、网络、Source Map 与修复提交证据；首考题 4（受限排错）：面对间歇性且只在生产出现的故障，禁止先改代码，必须先缩小输入、环境、版本和时间范围，并用自动化 `git bisect` 或等价二分定位首个坏变更；首考题 5（学习复述）：3 分钟向同事复盘事实、假设、证据和排除项。命题边界：禁止以大量 `console.log`、清缓存、重启、关闭压缩或回滚全部功能掩盖根因。
- 通过标准：故障可稳定复现或明确记录不可复现条件；每个结论都有可审计证据；能跨源代码、构建产物、浏览器、网络和版本定位；修复包含最小回归测试且不会扩大影响面；敏感 Source Map 有正确的发布与访问策略。评估边界：偶然修好、只描述最终改动或没有排除竞争假设不能通过。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

### Web 安全与可信边界

## SEC-01 XSS、CSRF 与前端输入输出信任边界

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#sec-01)、[OWASP XSS 防护](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)（英文原文，仅用于版本核验）、[OWASP CSRF 防护](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)（英文原文，仅用于版本核验）、[OWASP DOM Clobbering](https://cheatsheetseries.owasp.org/cheatsheets/DOM_Clobbering_Prevention_Cheat_Sheet.html)（英文原文，仅用于版本核验）、[OWASP Prototype Pollution](https://cheatsheetseries.owasp.org/cheatsheets/Prototype_Pollution_Prevention_Cheat_Sheet.html)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：上下文相关 XSS、DOM XSS、DOM Clobbering、Prototype Pollution、CSRF、开放重定向、客户端鉴权误用和敏感信息泄露；负责不可信输入到危险 sink/越权判断的攻击数据流。Cookie、Session、Token 的登录、续期、退出与吊销生命周期归 `IDENTITY-01`。
- 严格考核：首考题 1（资料定位）：只允许使用《中文核心讲义》，定位 XSS、CSRF、DOM 命名解析、原型链污染和授权边界；首考题 2（机制解释）：闭卷解释不可信字符串、DOM 命名属性和攻击者控制的对象键如何分别进入执行、全局引用或原型链，并说明前端隐藏按钮为何不是授权；首考题 3（最小产出）：审查富文本/Markdown、动态 DOM、深合并配置和登录流程，构造威胁模型并修复 XSS、CSRF、DOM Clobbering、Prototype Pollution、开放重定向、越权误判和敏感信息泄露；首考题 4（受限排错）：使用最小攻击输入与调用链定位编码上下文错误、命名遮蔽、`__proto__`/constructor 键、错误 SameSite 或仅客户端权限检查；首考题 5（学习复述）：3 分钟说明各防线阻止的具体数据流。命题边界：不得要求背诵 Payload；英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：发现全部高危数据流；输出编码匹配上下文并避免危险 DOM sink；DOM 引用不依赖可被命名元素遮蔽的隐式全局；反序列化/合并拒绝危险键且使用安全对象边界；CSRF 与服务端授权有效；修复含自动攻击回归。评估边界：只装净化库、只加前端权限判断或只让单个 Payload 失败不能通过。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 150 分钟；考核 105 分钟；复测 90 分钟

## SEC-02 CSP、Trusted Types 与安全违规报告

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN CSP 指南](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Guides/CSP)、[Trusted Types API](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/trustedTypes)、[MDN 子资源完整性 SRI](https://developer.mozilla.org/zh-CN/docs/Web/Security/Defenses/Subresource_Integrity)、[web.dev 混合内容](https://web.dev/articles/what-is-mixed-content?hl=zh-cn)、[MDN upgrade-insecure-requests](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/upgrade-insecure-requests)。覆盖范围：CSP nonce/hash/strict-dynamic、Report-Only 到强制、Trusted Types sink/policy、Reporting API 与违规报告；`frame-ancestors` 与点击劫持；SRI、CORS 与第三方脚本/样式完整性；HTTPS、HSTS、Mixed Content、`upgrade-insecure-requests` 与 Secure Context；明确 `block-all-mixed-content` 已废弃、`report-uri` 正被现代报告机制替代；第三方 SDK/Tag Manager 的来源、能力、更新和退出边界；全部必读资料均为中文。
- 严格考核：首考题 1（资料定位）：只允许使用《MDN CSP 指南》《Trusted Types API》《CSP 实施指南》《MDN 子资源完整性 SRI》《MDN 混合内容》，分别定位脚本执行、DOM sink、嵌入、资源完整性与安全上下文边界；首考题 2（机制解释）：闭卷解释 CSP、Trusted Types、SRI、HTTPS 和 `frame-ancestors` 分别防护哪段链路以及为何不能相互替代；首考题 3（最小产出）：为含第三方 SDK、Tag Manager、Markdown 和动态脚本的应用从 Report-Only 推进到强制 CSP，接入 Trusted Types、SRI 和违规上报，并验证 DOM XSS、未知源、被替换 CDN 资源、混合内容和恶意嵌入被阻止；首考题 4（受限排错）：定位 nonce 缓存复用、SRI/CORS 不匹配、第三方动态加载、违规报告噪声、iframe 嵌入或 HTTPS 页面加载不安全资源；首考题 5（学习复述）：3 分钟说明第三方脚本为何等同于站点权限及其准入/退出方案。命题边界：不得用广泛 allowlist、关闭证书检查或取消 SRI 规避兼容问题。
- 通过标准：策略不依赖广泛 `unsafe-inline`/`unsafe-eval`；合法路径无误报；第三方脚本有 owner、必要性、完整性/更新和退出方案；违规报告可定位版本和页面；注入、资源替换、恶意嵌入和 Mixed Content 测试失败且可观测；能说明这些控制是纵深防御。评估边界：只设置响应头、只在本地 HTTPS 运行或让浏览器控制台无报错不能通过。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 150 分钟；考核 105 分钟；复测 90 分钟

## SEC-04 跨源隔离、嵌入式上下文与权限策略

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#sec-04)、[中文｜MDN COEP](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Reference/Headers/Cross-Origin-Embedder-Policy)、[中文｜MDN 权限策略](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Guides/Permissions_Policy)、[MDN COOP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Opener-Policy)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：同源与站点、COOP/COEP/CORP/CORS、`crossOriginIsolated`、SharedArrayBuffer、Origin-Agent-Cluster；iframe sandbox/allow/credentialless、Permissions Policy、CSP `frame-ancestors` 与 UI redressing；`postMessage` 来源/Schema；弹窗 opener、第三方嵌入、跨站可观察差异与 XS-Leaks 防护；迁移、兼容、报告和降级。
- 严格考核：首考题 1（资料定位）：只允许使用《中文核心讲义》，定位跨源隔离、资源准入、嵌入权限、消息、点击劫持和跨站信息泄露边界；首考题 2（机制解释）：画出顶层页、跨源 iframe、弹窗、Worker 和第三方资源的浏览上下文/进程/权限/可观察信号；首考题 3（最小产出）：为使用 SharedArrayBuffer 和合作方 iframe 的页面配置 COOP/COEP/CORP、sandbox、allow、`frame-ancestors` 与严格 `postMessage` 协议，统一敏感资源错误/缓存行为并提供不支持时降级；首考题 4（受限排错）：处理第三方资源被 COEP 阻断、opener 泄漏、通配消息来源、权限越授、恶意嵌入、跨站登录状态探测和登录弹窗失效；首考题 5（学习复述）：3 分钟解释隔离、嵌入和跨站防护为何会影响集成。命题边界：不得通过关闭隔离、使用 `*` 来源、放宽全部 iframe 权限或隐藏 UI 规避问题。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：`crossOriginIsolated` 与资源加载有自动化验证；消息校验 origin、source、版本和 Schema；iframe 权限和可嵌入父来源最小；敏感跨站资源不通过状态码、尺寸、缓存或时序暴露稳定身份信号；弹窗/第三方登录有兼容方案；违规可观测。评估边界：只设置两个隔离头、只加遮罩或未验证第三方资源、弹窗、恶意父页面和降级路径不能通过。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 150 分钟；考核 105 分钟；复测 90 分钟

## SEC-03 WebAuthn、Passkey 与安全认证体验

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#sec-03)、[WebAuthn Level 3](https://www.w3.org/TR/webauthn-3/)（英文原文，仅用于版本核验）、[MDN Web Authentication API](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Authentication_API)、[web.dev Passkeys](https://web.dev/articles/passkey-registration?hl=zh-cn)。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：WebAuthn 注册与认证 ceremony、challenge、RP ID、origin、凭证发现、用户验证、Passkey 同步和恢复；覆盖能力检测、传统登录回退与反钓鱼边界。
- 严格考核：首考题 1（资料定位）：只允许使用《中文核心讲义》，定位能支撑「WebAuthn、Passkey 与安全认证体验」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：闭卷解释「WebAuthn、Passkey 与安全认证体验」覆盖的输入、状态转换、运行边界与失败传播，并用首考题 3 的产出证明机制选择；首考题 3（最小产出）：设计并实现注册、登录、条件式 UI、取消、设备不可用和账号恢复流程；画出 challenge、RP、origin、credential 与服务端验证边界；完成重放、钓鱼域名和降级路径的威胁建模；首考题 4（受限排错）：围绕「WebAuthn、Passkey 与安全认证体验」的首考题 3 产出注入正常、边界和失败场景，提交预期/实际、三项资料假设、证伪证据、根因、修复与回归；首考题 5（学习复述）：3 分钟说明「WebAuthn、Passkey 与安全认证体验」解决的问题、运行机制、选型条件、反例和验证证据，并回答边界变化追问。命题边界：只在「WebAuthn、Passkey 与安全认证体验」所列资料和覆盖范围内命题；资料外经验不能替代题目要求的机制与证据。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：challenge 一次性且由服务端校验；前端不把成功 UI 当成认证结果；错误提示不泄露账号状态；无 Passkey 环境仍有安全恢复路径；能在高级面试中解释公钥凭证为何降低钓鱼和凭证填充风险。评估边界：缺少与「WebAuthn、Passkey 与安全认证体验」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 150 分钟；考核 105 分钟；复测 90 分钟

## SEC-05 Web Crypto、密钥生命周期与客户端密码学边界

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#sec-05)、[中文｜MDN SubtleCrypto](https://developer.mozilla.org/zh-CN/docs/Web/API/SubtleCrypto)、[Web Cryptography Level 2](https://www.w3.org/TR/webcrypto-2/)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：安全随机数、摘要/HMAC、签名/验签、对称/非对称加密、密钥生成/导入/派生/包装/轮换/销毁、算法参数、传输与存储边界、服务端/KMS/HSM 职责以及浏览器威胁模型。
- 严格考核：首考题 1（资料定位）：只允许使用《中文核心讲义》，定位密码原语、算法参数、密钥可提取性与生命周期规则；首考题 2（机制解释）：闭卷区分编码、哈希、MAC、签名、加密和密码派生，并解释浏览器内密钥为何不能自动成为可信根；首考题 3（最小产出）：实现带版本的签名验签与本地加密信封，设计轮换、撤销、恢复和服务端验证流程；首考题 4（受限排错）：仅依据算法、IV/nonce、编码、密钥用途和来源证据定位验签失败、nonce 重用或密钥泄漏；首考题 5（学习复述）：3 分钟说明哪些密码学操作可放前端、哪些必须交给服务端或托管密钥系统。命题边界：禁止自创算法或把混淆当加密；英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：随机数与 nonce 使用正确；密钥用途和可提取性最小化；签名与加密语义不混淆；轮换后新旧数据可受控迁移；XSS、日志、备份、设备丢失和服务端信任边界均有威胁模型。评估边界：只让示例成功运行、没有密钥生命周期和攻击验证不能通过。
- 预计耗时：资料 135 分钟；练习 195 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## 领域综合考核

- [ ] 已通过领域综合考核
- 任务：独立实现一个无框架的可访问数据看板，包含异步请求、缓存、取消、响应式布局、错误处理和安全渲染，并附 DevTools 网络/渲染分析报告。
- 通过标准：4 小时内完成；自动测试覆盖核心逻辑；键盘可用；无明显 XSS 风险；能闭卷解释任意 5 处实现的浏览器底层原因。评估边界：领域综合考核只依据本领域列出的资料、题目输入和可复核产出；不得用资料外经验替代跨知识点整合证据。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 150 分钟；考核 105 分钟；复测 90 分钟
