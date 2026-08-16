# 01 Web 平台核心基础

所有“通过”均需满足[统一考核规则](00-assessment-rules.md)。建议把代码、答卷和分析报告保存在 `evidence/JS-xx/`。

### JavaScript 语言模型

## JS-01 执行上下文、作用域与闭包

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN JavaScript 执行模型](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Execution_model)、[MDN 作用域](https://developer.mozilla.org/zh-CN/docs/Glossary/Scope)、[MDN 闭包](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Closures)、[MDN 函数](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Functions)。覆盖范围：执行上下文、词法环境、作用域链和闭包创建/保留机制；覆盖循环闭包、模块作用域、异步回调、内存保留与可回收条件，不延伸到框架生命周期抽象。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《MDN JavaScript 执行模型》《MDN 作用域》《MDN 闭包》《MDN 函数》，分别定位执行上下文、词法环境、闭包保留和内存边界段落；首考题 2（机制解释）：给定 `for(var i=0;i<3;i++) setTimeout(()=>out(i))` 与两个计数器，解释作用域链和每个闭包捕获的环境；首考题 3（最小产出）：固定 fixture 为上述循环、两个独立计数器 `A/B`、订阅 `unsubscribe()` 与预期输出 `[3,3,3]`/`[0,1,2]`；实现私有计数、撤销和订阅闭包模块，交付作用域图、两实例输出、取消后不再通知的测试及清理记录；首考题 4（受限排错）：给定异常“循环回调全打印 3，B 调用后 A 的计数也变化，已取消订阅仍触发”；只在 `var` 声明作用域、捕获变量、订阅清理三项中排查，提交每项证伪输出、根因修复和取消回归；首考题 5（学习复述）：用 3 分钟说明闭包保留什么、何时释放，并回答为何不应长期持有 DOM。复测变式：仅将循环声明从 `var` 改为 `let`，保持两个计数器 `A/B`、订阅/取消时机和其余 fixture 不变；预期循环输出为 `[0,1,2]`，取消后的 B 仍无通知；提交新的循环输出、隔离计数与取消断言作为新证据。命题边界：只使用本点语言模型 fixture。
- 通过标准：作用域图、两实例输出、取消测试和清理记录可复核；无全局泄漏且输出符合预期。否决项：只改 `var` 不解释捕获环境，或未提交取消后的测试证据。评估边界：只评估执行上下文、作用域和闭包，不评估框架生命周期。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## JS-02 原型、对象模型与 `this`

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN 对象模型](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Inheritance_and_the_prototype_chain)、[MDN `this`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/this)。覆盖范围：自有属性与继承属性、原型链查找、属性描述符、构造调用、`this` 绑定、箭头函数、class 语义以及 `call`/`apply`/`bind`；覆盖原型污染之外的对象模型边界。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《MDN 对象模型》《MDN `this`》，定位原型查找、构造调用、调用形式与箭头函数的边界；首考题 2（机制解释）：给定 `user.say`、`const f=user.say`、箭头方法和三层原型，说明每次 `this` 与属性查找结果；首考题 3（最小产出）：固定 fixture 为 `user={name:'Ada',say(){return this.name}}`、脱离函数 `f`、构造函数显式返回 `{kind:'override'}` 与 `grand→parent→child` 原型链；实现简化 `new`/`bind`，交付原型图、五个调用输出和构造返回断言；首考题 4（受限排错）：给定异常“事件回调的 `this` 为 `undefined`，显式返回对象却未生效”；只在调用形式、箭头词法 `this`、`bind/new` 返回规则三项中排查，提交 trace 证伪、根因修复和五断言回归；首考题 5（学习复述）：用 3 分钟说明 class 隐藏的原型机制，并回答何时组合优于继承。复测变式：仅将 `say` 作为未绑定事件回调传入，保持原型链、构造显式返回和方法实现不变；预期未绑定调用的 `this` 不再指向 `user`，经 `bind` 后恢复返回 `Ada`；提交新的事件调用 trace、绑定结果和原型查找记录作为新证据。命题边界：只评估对象模型与 `this`。
- 通过标准：原型图、五个调用输出和断言可复核；正确区分构造显式返回、箭头函数和多层委托。否决项：只用箭头函数回避 `this`，或未给出脱离调用的失败证据。评估边界：不评估原型污染安全主题。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## JS-03 类型、相等、拷贝与不可变更新

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN 数据类型](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Data_structures)、[MDN 相等比较](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Equality_comparisons_and_sameness)、[structuredClone](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/structuredClone)。覆盖范围：原始值与引用值、`Object.is`/严格相等、浅拷贝与深拷贝、结构化克隆、循环引用和不可变更新；区分值语义、身份语义与序列化边界。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《MDN 数据类型》《MDN 相等比较》《structuredClone》，定位值/身份相等、结构化克隆和循环引用的边界；首考题 2（机制解释）：给定 `NaN`、`-0`、共享嵌套对象和循环图，比较 `===`、`Object.is` 与克隆行为；首考题 3（最小产出）：固定 fixture 为 `{date:new Date(0),map:new Map([['x',1]]),set:new Set([1]),child:{n:1}}`、`fixture.self=fixture` 和两个共享 `child` 的状态 A/B；交付 15 个相等判断答案、克隆策略/明确拒绝说明、A 更新 B 不变的测试和 Date/Map/Set/循环快照；首考题 4（受限排错）：给定异常“更新 B 的 `child.n` 后 A 也变，循环对象克隆抛错”；只在引用路径、浅拷贝层级、循环处理三项中排查，提交快照证伪、根因修复与回归；首考题 5（学习复述）：用 3 分钟说明深拷贝为何不是默认方案，并回答何时用结构共享。复测变式：仅将既有 `Map` 键 `x` 的值从 `1` 改为既有循环根对象 `fixture`，保持 `fixture.self=fixture`、Date/Set、共享 `child` 与状态 A/B 的不可变更新机制不变；预期克隆后 `clone.map.get('x')===clone` 且 `clone.self===clone`，A/B 仍引用隔离；提交新的 Map—根对象身份断言、循环快照和 A/B 回归作为新证据。命题边界：只评估相等、拷贝和不可变更新。
- 通过标准：15 题至少 13 题正确，快照、策略与测试可复核；Date、Map、Set、数组和循环引用均有明确结论。否决项：把 JSON 序列化当作通用深拷贝，或未验证 A/B 引用隔离。评估边界：不评估持久化数据结构库。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## JS-07 迭代协议、元编程与资源生命周期

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#js-07)、[中文｜MDN 迭代协议](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Iteration_protocols)、[中文｜MDN Proxy](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Proxy)、[中文｜MDN Reflect](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Reflect)。覆盖范围：可迭代/迭代器协议、生成器、`Symbol`、`Proxy`/`Reflect` 不变量、惰性序列、同步/异步资源释放、可观测性与性能边界；全部必读资料均为中文。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《中文核心讲义》《中文｜MDN 迭代协议》《中文｜MDN Proxy》《中文｜MDN Reflect》，定位迭代协议、不变量与资源清理；首考题 2（机制解释）：以 `for...of` 提前 `break`、生成器 `throw` 与代理转发解释暂停、关闭和陷阱约束；首考题 3（最小产出）：固定 fixture 为页码 `[[1,2],[3,4]]`、第二页前 `break`、异步页 `Promise.resolve([5])` 和资源 `closeCount`；实现惰性迭代器、异步生成器及资源包装器，交付消费输出、`return/throw` 清理测试、`closeCount===1` 断言与代理不变量记录；首考题 4（受限排错）：给定异常“`break` 后仍拉取第二页，`closeCount=2`，代理读取 non-configurable 属性报错”；仅在迭代器 `return`、重复消费、Proxy/Reflect 不变量三项中排查，提交证伪日志、根因修复和成功/异常/取消回归；首考题 5（学习复述）：用 3 分钟说明普通集合、生成器、代理和显式资源管理的取舍。复测变式：仅将提前终止信号从 `break` 改为生成器 `throw new Error('stop')`，保持页码、异步页、资源包装器和代理不变量不变；预期第二页仍不拉取且 `closeCount===1`；提交新的 `throw` 消费 trace、关闭断言和代理记录作为新证据。命题边界：必须验证终止、异常和清理。
- 通过标准：迭代输出、关闭计数、代理断言和异常回归可复核；资源三条路径均只释放一次。否决项：只展示生成器正常路径、未给出 `return/throw` 清理证据，或把 Proxy 当通用状态管理。评估边界：不评估未给定的显式资源管理提案语法。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

### 计算机基础与数据处理

## CS-01 复杂度、数据规模与工程成本判断

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#cs-01)。覆盖范围：输入规模、时间/空间复杂度、最坏/平均/摊还分析、常数与内存局部性、基准设计、规模曲线、主线程帧预算、序列化和服务端计算边界；讲义同时给出不适用情形、退化反例和验证证据。
- 严格考核：挑战类型：DESIGN_CASE；首考题 1（资料定位）：只允许使用《中文核心讲义》，定位复杂度、摊还分析、基准预热与主线程预算；首考题 2（机制解释）：以 O(n) 两种实现一个有缓存命中一个频繁分配为例，解释相同 Big-O 的常数、内存和规模反例；首考题 3（最小产出）：固定 fixture 为排序数组 1k/10k/100k、相同随机种子和 30 次预热后 10 次采样；设计线性扫描与嵌套扫描实验，交付基本操作推导、CSV 曲线、P95、堆峰值和超过 16ms 帧数，并以 Performance 录制验证采样结果；首考题 4（受限排错）：给定日志“100k 时 P95 从 18ms 升至 820ms，火焰图显示 `find` 被调用 100000 次”；仅在嵌套查找、缓存未命中、序列化分配三项中排查，逐项提交证伪测量、根因改动和 1k/100k 回归表；首考题 5（学习复述）：用 3 分钟说明何时改算法、何时分块/Worker、何时移交服务端。复测变式：仅把输入规模从 100k 改为 1m，保持数据分布与采样命令不变，提交新曲线、内存峰值和帧预算证据。命题边界：不考竞赛技巧。
- 通过标准：推导、命令/采样记录、曲线、P95 和内存证据可复核；能区分最坏、平均、摊还及浏览器边界。否决项：只测一个规模、忽略预热/缓存或只报告平均耗时。评估边界：只评估复杂度判断与测量设计，不评估具体算法库。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## CS-02 常用数据结构、算法模式与正确性

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#cs-02)、[中文｜MDN Map](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Map)、[中文｜MDN Set](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Set)。覆盖范围：数组、链式结构、栈、队列、哈希、集合、堆、树、图与 Trie；排序稳定性、二分边界、双指针、滑动窗口、DFS/BFS、拓扑排序、贪心和动态规划的适用条件；不变量、终止性、边界样例与属性测试；全部必读资料均为中文。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《中文核心讲义》《中文｜MDN Map》《中文｜MDN Set》，定位结构操作、不变量和退化边界；首考题 2（机制解释）：给定依赖图和 Top-K 流，解释 Map 身份、入度不变量与堆/数组取舍；首考题 3（最小产出）：固定 fixture 为依赖 `A→C,B→C,C→D`、事件 `[a:3,b:9,a:4,c:2]`、空输入和重复边 `A→C`；实现拓扑排序与动态 Top-2，交付顺序/Top-2 输出、环/重复/空输入测试、关键不变量和复杂度说明；首考题 4（受限排错）：给定日志“拓扑结果缺 D，重复边令入度为 2，`A→B→A` 无限处理”；仅在入度初始化、去重集合、环检测三项中排查，逐项提交证伪用例、根因和回归；首考题 5（学习复述）：用 3 分钟说明为何此处不用数组扫描，并回答对象键何时不可靠。复测变式：仅把 fixture 的 `C→D` 改为 `C→A`，保持 Top-K 输入不变，提交环错误、未输出部分序列和不变量测试。命题边界：不考冷门模板。
- 通过标准：输出、空/重复/环测试和不变量记录可复核；不会将对象字符串化当稳定键。否决项：忽略环、以递归无限重试或仅通过理想样例。评估边界：只评估数据结构选择与正确性。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## CS-03 前端大数据、Worker 并行、增量计算与内存边界

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#cs-03)、[中文｜MDN Web Worker](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Workers_API/Using_web_workers)、[中文｜MDN Streams API](https://developer.mozilla.org/zh-CN/docs/Web/API/Streams_API)、[中文｜MDN 可转移对象](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Workers_API/Transferable_objects)。覆盖范围：长列表索引、分块/流式/增量计算、迭代器、缓存淘汰、TypedArray、Worker 基础、结构化克隆与 Transferable、取消、背压、内存峰值、GC、虚拟化和服务端聚合。本点拥有通用大数据与 Worker 数据传递基础；AI 推理任务池归 `WEBAI-04`。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《中文核心讲义》《中文｜MDN Web Worker》《中文｜MDN Streams API》《中文｜MDN 可转移对象》，定位复制、Transferable、背压、取消与内存边界；首考题 2（机制解释）：以 100k Float64Array 和 500 条批次为例，解释主线程、Worker 和服务端模拟的复制成本与交互差异；首考题 3（最小产出）：固定 fixture 为 100000 条 `{id,score}`、Top-10、500 条批次、在第 20 批取消；实现筛选/聚合 Worker，分别运行 structured clone 与 Transferable，交付三方案吞吐、INP/长任务、堆峰值、消息数和取消后无新结果的记录；首考题 4（受限排错）：给定日志“每批 clone 80MB、队列积压 2400 条、取消后仍收到 6 批、堆持续增长”；仅在传输方式、背压阈值、缓存释放三项中排查，逐项证伪、修复并回归 100k；首考题 5（学习复述）：用 3 分钟给出客户端、Worker、服务端分层决策。复测变式：仅把数据量改为 1m，保持批次/Top-K/取消点不变，提交取消延迟、峰值内存和降级决策证据。命题边界：Worker 不消除计算成本。
- 通过标准：三方案测量、消息/内存记录和取消测试可复核；Worker 有批量、背压和清理。否决项：只展示最终算完、无取消证据或把复制成本忽略。评估边界：不评估 AI 推理任务池。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

### 异步、模块与宿主运行时

## JS-04 异步、Promise 与事件循环

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN 异步 JavaScript](https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Extensions/Async_JS)、[MDN 微任务指南](https://developer.mozilla.org/zh-CN/docs/Web/API/HTML_DOM_API/Microtask_guide)、[中文补充讲义：JS-04](../chinese-guides/content-audit-01-03.md#js-04)。覆盖范围：浏览器调用栈、任务、微任务、Promise reaction、timer、I/O 与渲染机会的调度关系；`async/await` 展开、微任务饥饿、顺序预测与以 trace 验证的边界。Node 的事件循环不是本点题源。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《MDN 异步 JavaScript》《MDN 微任务指南》《中文补充讲义：JS-04》，定位任务、微任务、渲染机会和取消协议；首考题 2（机制解释）：给定 `console.log('A'); Promise.resolve().then(()=>console.log('B')); setTimeout(()=>console.log('C'))`，写出浏览器队列变化并区分业务并发限制；首考题 3（最小产出）：固定 fixture 为任务 `[10ms 成功,20ms 成功,15ms 失败,30ms 成功,5ms 成功]`、并发上限 2、在 12ms 取消；实现带 `nextIndex/active/AbortSignal` 的执行器，交付十道 trace 答卷、任务启动序列、按输入序号汇总结果和“取消后未启动 3–5”的自动测试；首考题 4（受限排错）：给定异常“递归微任务使 timer 不触发，`active=3`，取消后第 4 项仍写入状态”；仅在微任务递归、槽位递减、AbortSignal 检查三项中排查，提交队列 trace 证伪、根因修复和取消/超时回归；首考题 5（学习复述）：用 3 分钟说明浏览器事件循环与任务执行器协议的不同证据。复测变式：仅将取消时刻从 12ms 改为 35ms，保持任务序列、并发上限 2 和结果汇总规则不变；预期第 4 项在运行中取消、第 1/2/3/5 项仍按输入槽位汇总且 `active` 不超过 2；提交新的队列 trace、槽位释放和取消断言作为新证据。命题边界：不得使用 Node 专有顺序。
- 通过标准：十题至少九题正确；启动序列、汇总结果、取消/超时测试可复核，`active` 从不超过 2。否决项：把 Promise 回调当普通宏任务、取消后仍启动新任务或未提交队列 trace。评估边界：只评估浏览器调度，不评估 Node 事件循环。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## JS-05 Promise 错误处理与异步控制流

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN Promise](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Using_promises)、[MDN AbortController](https://developer.mozilla.org/zh-CN/docs/Web/API/AbortController)、[中文补充讲义：JS-05](../chinese-guides/content-audit-01-03.md#js-05)。覆盖范围：Promise 拒绝传播、组合器、串并行、取消与 `finally`；超时、重试预算和过期结果抑制的业务边界；区分业务失败、网络失败、主动取消和未处理拒绝。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《MDN Promise》《MDN AbortController》《中文补充讲义：JS-05》，定位拒绝传播、组合器、取消和安全重试边界；首考题 2（机制解释）：给定连续搜索，画出旧请求取消、最新结果提交和三类错误呈现状态图；首考题 3（最小产出）：固定 fixture 是 `a(30ms 成功)`、`ab(20ms AbortError)`、`abc(10ms 成功)` 与 `allSettled` 输入 `[resolve(1),reject('E')]`；实现等价聚合、请求序号与取消，交付聚合输出、最终 UI 仅为 `abc`、取消不显示错误和四类结果测试；首考题 4（受限排错）：给定异常“`finally` 覆盖原拒绝，`a` 晚到覆盖 `abc`，POST 被重复重试”；只在 `finally` 返回值、请求序号比较、重试幂等性三项中排查，提交证伪测试、根因修复和网络失败回归；首考题 5（学习复述）：说明取消、超时和重试各自不保证什么。复测变式：仅将 `abc` 的既有 10ms 结果从成功改为网络失败，保持查询顺序、`a` 的 30ms 晚到响应、`ab` 的 AbortError、`allSettled` 输入、取消和请求序号机制不变；预期最新请求显示网络错误且 `a` 不得提交旧结果；提交新的请求序号 trace、网络错误分类断言和旧结果抑制测试作为新证据。命题边界：重试仅限给定可安全重放操作。
- 通过标准：聚合输出、最终状态、取消/网络/业务/程序错误测试可复核；旧请求不能覆盖新结果。否决项：把取消展示成失败、允许非幂等 POST 自动重试或吞掉原拒绝。评估边界：不评估真实 HTTP 客户端库。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## JS-06 ES Modules 与模块边界

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文｜MDN JavaScript 模块](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Modules)、[中文｜Node.js ECMAScript 模块](https://nodejs.cn/api/esm.html)。覆盖范围：浏览器与 Node.js 中 ESM 的静态结构、live binding、动态导入、循环依赖、强制扩展名、`package.json` 的 `type`/`exports`、ESM 与 CommonJS 互操作及模块边界设计；两份资料均为中文。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《中文｜MDN JavaScript 模块》《中文｜Node.js ECMAScript 模块》，定位静态依赖、live binding、循环初始化、动态导入与导出边界；首考题 2（机制解释）：给定 `a.mjs↔b.mjs` 循环导入和失败的 `import('./missing.mjs')`，解释 live binding 与初始化顺序；首考题 3（最小产出）：固定 fixture 为 `a` 读取 `b.ready`、`b` 读取 `a.ready`、浏览器入口及组件包 `exports` 表；重构循环为单向依赖或动态导入，交付依赖图、重构代码、导出表、循环前后运行记录和动态导入 rejection 测试；首考题 4（受限排错）：给定异常“模块初始化读到 `undefined`，动态导入失败未显示”；只在循环依赖、顶层执行顺序、导出/错误边界三项中排查，提交最小复现、证伪日志、根因修复和构建回归；首考题 5（学习复述）：用 3 分钟比较 live binding 与复制值，回答动态导入失败在哪层处理。复测变式：仅删除动态导入分支的目标模块，保持 `a/b` 依赖图、动态导入调用和组件包 `exports` 表不变；预期 rejection 对用户可见且循环重构后的模块仍可运行；提交新的依赖图、失败 UI 和动态导入 rejection 测试作为新证据。命题边界：只评估 ES Modules；Node 文档仅用于本题所列互操作边界。
- 通过标准：依赖图、前后运行记录、动态导入失败测试和导出表可复核；可定位循环初始化问题并说明 ESM/CJS、tree-shaking、`exports` 边界。否决项：以延时或全局变量掩盖循环，或未处理动态导入拒绝。评估边界：不评估打包器私有实现。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## WASM-01 WebAssembly 通用运行时、宿主边界与工程化

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#wasm-01)、[MDN WebAssembly](https://developer.mozilla.org/zh-CN/docs/WebAssembly)、[WebAssembly Core 3.0](https://webassembly.github.io/spec/core/)（英文原文，仅用于版本核验）、[WebAssembly JavaScript API](https://webassembly.github.io/spec/js-api/)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：模块、实例、导入/导出、线性内存、Table、编译/流式实例化、JavaScript/Wasm ABI、数据编组、所有权、跨边界成本、SIMD、线程、调试和构建供应链。Component Model 与 WASI 只作为中文讲义中标明运行时成熟度的扩展边界，不设根页资料或独立题源。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《中文核心讲义》《MDN WebAssembly》，定位模块/实例、导入导出、线性内存、流式实例化和成熟度边界；首考题 2（机制解释）：给定 Wasm `sum(ptr,len)`，解释获取—验证—实例化—内存视图—导入调用链，并以 grow 后旧视图为反例；首考题 3（最小产出）：固定 fixture 为 `Uint8Array([1,2,3,4])`、一次 4MB 缓冲区和 1000 次 4KB 调用；构建含 `sum`/`free` 的 Wasm 模块及 JS fallback，执行 `instantiateStreaming`（失败时 fallback），交付 ABI 表、两组基准命令/结果、memory.grow 前后视图断言、释放/异常日志和包体大小；首考题 4（受限排错）：给定日志“import `env.log` 不存在，grow 后读到 0，`free` 未调用导致 heap 增长”；仅在导入名、视图重建、所有权释放三项中排查，逐项证伪、修复和两组基准回归；首考题 5（学习复述）：用 3 分钟比较 JS、Wasm、WebGPU、服务端原生模块和 Component Model。复测变式：仅将一次 4MB 调用替换为 1000 次 4KB 调用，保持算法/数据总量不变，提交边界开销、内存和 fallback 新证据。命题边界：WASI/Component Model 不作为通用浏览器基线；英文原文不作为独立首考题源。
- 通过标准：ABI、基准命令/日志、视图/释放断言和 fallback 记录可复核；能区分沙箱、宿主导入和业务授权。否决项：仅加载现成 wasm、只报单次跑分或忽略 grow 后视图。评估边界：不评估 WASI 服务器部署。
- 预计耗时：资料 135 分钟；练习 195 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

### Web 标准与可访问性

## WEB-01 HTML 语义、表单与可访问性基础

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文｜MDN HTML 语义化](https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/Structuring_content)、[中文｜MDN Web 表单](https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Extensions/Forms)、[中文｜MDN ARIA](https://developer.mozilla.org/zh-CN/docs/Web/Accessibility/ARIA)、[中文｜MDN dialog 元素](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Reference/Elements/dialog)。覆盖范围：HTML 语义结构、标签与控件关联、表单分组和错误提示、原生元素优先原则、ARIA 的名称/角色/状态、键盘操作以及对话框焦点进入、约束和恢复；全部必读资料均为中文。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《中文｜MDN HTML 语义化》《中文｜MDN Web 表单》《中文｜MDN ARIA》《中文｜MDN dialog 元素》，定位 label、错误关联、dialog 焦点和 ARIA 边界；首考题 2（机制解释）：给定 div 表单和无名称 dialog，解释原生语义、可访问名称、焦点归还和错误描述链；首考题 3（最小产出）：固定 fixture 为必填姓名、空提交错误、打开/关闭 dialog 的触发按钮；改写为 `<form><label><input>` 与原生 `<dialog>`，用键盘执行 Tab/Enter/Escape，交付 HTML、操作录像/步骤、无障碍树快照和焦点前后断言；首考题 4（受限排错）：给定日志“读屏只读 button，Escape 关闭后焦点落到 body，错误未关联输入”；仅在 label/aria 名称、dialog 调用/返回焦点、`aria-describedby` 三项中排查，逐项证伪、修复和键盘回归；首考题 5（学习复述）：用 3 分钟说明 ARIA 何时有害，并回答错误如何关联输入。复测变式：仅把错误触发从提交改为 blur，保持字段/弹窗不变，提交一次通知、名称和焦点不变的新树快照。命题边界：只评估 HTML 语义、表单与 dialog。
- 通过标准：HTML、树快照、键盘步骤与焦点断言可复核；标签、错误关联和关闭归焦正确。否决项：用 ARIA 伪装可用原生元素、只做鼠标测试或无树快照。评估边界：不评估完整 WCAG 治理。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## WEB-02 CSS 布局、层叠与响应式

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN CSS 布局](https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/CSS_layout)、[MDN 层叠](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_cascade/Cascade)。覆盖范围：层叠来源与优先级、盒模型、格式化上下文、Flex/Grid、媒体查询、响应式排版、溢出与滚动容器；覆盖缩放、长文本、窄屏和打印边界。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《MDN CSS 布局》《MDN 层叠》，定位 Flex/Grid、层叠上下文、溢出与最小尺寸；首考题 2（机制解释）：以 320/768/1440、200 字标题和被裁剪弹层解释布局链及 z-index 反例；首考题 3（最小产出）：固定 fixture 为上述三视口、200 字不换行标题、吸顶工具栏和弹层；无组件库实现列表，运行 Playwright 截图命令并交付三张截图、`scrollWidth===clientWidth` 断言、层叠上下文说明和键盘可操作弹层；首考题 4（受限排错）：给定日志“320px `scrollWidth=412`，弹层 z-index 9999 仍在吸顶栏下”；仅在 transform 创建层叠上下文、祖先 overflow、flex `min-width` 三项中排查，提交 DevTools 截图证伪、修复和三视口回归；首考题 5（学习复述）：用 3 分钟比较 Flex/Grid，并回答 z-index 为什么不能脱离层叠上下文。复测变式：仅把 `writing-mode` 改为 `vertical-rl`，保持内容/视口不变，提交逻辑属性、无溢出和弹层截图。命题边界：不评估设计系统 Token。
- 通过标准：三视口截图、宽度断言、层叠证据和回归可复核。否决项：大量 `!important`、固定像素碰巧通过或只截图宽屏。评估边界：只评估布局、层叠与响应式。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## WEB-03 现代 CSS 架构、容器查询与渐进增强

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#web-03)、[MDN Container Queries](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_containment/Container_queries)、[MDN Cascade Layers](https://developer.mozilla.org/zh-CN/docs/Web/CSS/@layer)、[MDN CSS Anchor Positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Anchor_positioning)（英文原文，仅用于版本核验）、[MDN Scroll-driven Animations](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations)（英文原文，仅用于版本核验）、[CSS Color Module Level 5](https://www.w3.org/TR/css-color-5/)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：容器查询、级联层、嵌套、`@scope`、逻辑属性、Subgrid、`content-visibility`、现代/相对颜色、Anchor Positioning、Scroll-driven Animations、真实支持矩阵、回退和 reduced-motion。只消费 `DS-01` 产出的 CSS 自定义属性，不重复定义 Token 分类、构建和治理。
- 严格考核：挑战类型：DESIGN_CASE；首考题 1（资料定位）：只允许使用《中文核心讲义》《MDN Container Queries》《MDN Cascade Layers》，定位容器状态、层顺序、回退和成熟度；首考题 2（机制解释）：给定同一卡片置于 240px/480px 容器，解释容器查询与视口断点、层叠层和脚本职责边界；首考题 3（最小产出）：固定 fixture 为 240px/480px 容器、`@layer reset,components,utilities`、reduced-motion 和不支持容器查询浏览器；重构卡片，交付 CSS、支持矩阵、两宽度截图、`CSS.supports` 回退记录、键盘/打印验证与层顺序说明；首考题 4（受限排错）：给定日志“240px 卡片仍三列，utility 层覆盖组件色，旧浏览器无内容布局”；仅在 `container-type`、layer 声明顺序、fallback 选择器三项中排查，提交逐项证伪、修复和两宽度回归；首考题 5（学习复述）：用 3 分钟说明哪些现代 CSS 能替代脚本、哪些仍需脚本/服务端状态。复测变式：仅将容器从 480px 改为 240px，保持数据/DOM 不变，提交单列预期、键盘路径和回退截图。命题边界：英文原文不作为独立首考题源。
- 通过标准：CSS、矩阵、截图、supports 回退和键盘/打印证据可复核；容器响应不依赖页面宽度。否决项：只在最新浏览器截图、把实验能力作为唯一路径或用轮询替代 CSS 状态。评估边界：不定义 Token 治理。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## A11Y-01 WCAG 2.2、无障碍测试与工程治理

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/advanced-topics.md#a11y-01)、[中文｜MDN 无障碍课程](https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/Accessibility)、[中文｜MDN ARIA](https://developer.mozilla.org/zh-CN/docs/Web/Accessibility/ARIA)、[中文｜Chrome DevTools 无障碍参考](https://developer.chrome.com/docs/devtools/accessibility/reference?hl=zh-cn)、[中文｜Lighthouse 无障碍评分](https://developer.chrome.com/docs/lighthouse/accessibility/scoring?hl=zh-cn)。覆盖范围：WCAG 2.2 POUR 与 AA 基线；语义、名称/角色/值、键盘模型、焦点、动态通知、表单错误、拖拽等价操作、目标尺寸、缩放、对比度、字幕与 reduced-motion；AI 流式回答、生成式 UI 和生成媒体的辅助技术边界；自动扫描、无障碍树、键盘和屏幕阅读器人工验证；组件准入规则、缺陷分级、CI 门禁、例外期限、负责人和回归基线等工程治理。
- 严格考核：挑战类型：TOOL_OPERATION；首考题 1（资料定位）：只允许使用《中文核心讲义》《中文｜MDN 无障碍课程》《中文｜MDN ARIA》《中文｜Chrome DevTools 无障碍参考》《中文｜Lighthouse 无障碍评分》，定位 WCAG 2.2、ARIA 使用边界、自动扫描局限和人工验证依据；首考题 2（机制解释）：闭卷解释语义树、焦点、名称计算、动态通知和用户偏好如何共同影响辅助技术体验，并说明单页修复为何不能替代工程治理；首考题 3（最小产出）：审计并修复一个含命令面板、拖拽、表单错误、AI 流式回答、生成图片、媒体和动画的页面，同时提交组件准入清单、CI 门禁、缺陷分级、例外到期与回归策略；首考题 3 固定 fixture：给定命令面板焦点丢失、拖拽仅鼠标可用、流式区域每 token 宣告、图片无替代文本、视频无字幕和动画未尊重 reduced-motion；交付修复页、无障碍树快照、键盘/读屏记录、CI 规则和例外清单，并以 Lighthouse、键盘、无障碍树和读屏四项验证；首考题 4（受限排错）：给定日志“Tab 从命令面板跳到 body；读屏连续播报 40 次”，仅限检查焦点陷阱/返回焦点、`aria-live` 节流、名称计算和组件准入规则；提交 DOM/无障碍树证据、两个被证伪候选、根因、修复与回归；首考题 5（学习复述）：3 分钟说明自动扫描为什么不能替代人工测试和治理闭环，并追问：为何可访问性例外必须有到期日。复测变式：仅将流式区域的宣告批量大小从每 1 token 改为每 8 token，保持总计 40 个 token、命令面板/拖拽/表单/图片/视频/动画 fixture、焦点管理、名称计算、CI 门禁和例外规则不变；预期读屏只收到 5 次批量通知，焦点与其他基线验证结果不变；提交新的五次通知读屏记录、焦点回归和无障碍树快照作为新证据。命题边界：不得用单一分数或单次人工演示代表持续合规。
- 通过标准：关键流程满足 WCAG 2.2 AA；焦点、动态状态、错误、AI 流式结果和生成媒体均可被辅助技术正确感知；自动扫描无严重问题并附键盘、无障碍树和屏幕阅读器记录；组件准入、CI、缺陷负责人、例外期限和回归基线形成可执行闭环。否决项：Lighthouse 分数、ARIA 数量或单一读屏器通过均不能单独作为通过证据。评估边界：只评估该 fixture 的关键流程与治理闭环。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

### 浏览器运行时与原生能力

## BROWSER-01 渲染流水线、DOM 事件与存储

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#browser-01)、[MDN 关键渲染路径](https://developer.mozilla.org/zh-CN/docs/Web/Performance/Guides/Critical_rendering_path)、[MDN 事件](https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/Scripting/Events)、[MDN IndexedDB](https://developer.mozilla.org/zh-CN/docs/Web/API/IndexedDB_API)、[Web Storage](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Storage_API)。覆盖范围：HTML/CSS 到像素的渲染阶段、事件传播与委托、Cookie/Web Storage/IndexedDB 的容量、事务、一致性、同步阻塞、安全与生命周期边界；全部必读资料均为中文。
- 严格考核：挑战类型：TOOL_OPERATION；首考题 1（资料定位）：只允许使用《中文核心讲义》《MDN 关键渲染路径》《MDN 事件》《MDN IndexedDB》《Web Storage》，定位渲染阶段、事件路径、事务与存储边界；首考题 2（机制解释）：给定一次 class 修改、委托点击和草稿写入，解释 style/layout/paint/composite、冒泡和事务原子性；首考题 3（最小产出）：固定 fixture 为 100 个列表项、一次点击第 73 项、草稿 `{id:'d1',step:1→2}` 和版本 1→2；用 DevTools Performance 录制，执行委托/cleanup 与 IndexedDB upgrade 事务，交付渲染轨迹、事件路径日志、事务前后记录和中断恢复测试；首考题 4（受限排错）：给定日志“点击一次触发 2 次，事务中断后只写 step=1，轨迹连续 Layout”；仅在监听器清理、事件冒泡目标、事务 scope/读写三项中排查，逐项证伪、修复和回归；首考题 5（学习复述）：用 3 分钟说明 Cookie、Web Storage、IndexedDB 的选型边界。复测变式：仅在事务写入 step=2 前中断，保持 schema 不变，提交原子恢复记录、事件清理和轨迹证据。命题边界：不以容量作为唯一准则。
- 通过标准：轨迹、事件日志、事务记录和恢复测试可复核；不存储不应落盘的敏感数据。否决项：只背渲染阶段、重复监听未验证或部分写入仍通过。评估边界：不评估认证存储方案。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## BROWSER-02 观察器、调度、页面生命周期与多标签页协同

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#browser-02)、[中文｜使用 scheduler.yield](https://developer.chrome.com/blog/use-scheduler-yield?hl=zh-cn)、[中文｜Chrome 页面生命周期](https://developer.chrome.com/docs/web-platform/page-lifecycle-api?hl=zh-cn)、[中文｜MDN BroadcastChannel](https://developer.mozilla.org/zh-CN/docs/Web/API/BroadcastChannel)、[中文｜MDN Web Locks API](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Locks_API)。覆盖范围：Intersection/Resize/Mutation/Performance Observer；`requestAnimationFrame`、空闲任务、`scheduler.postTask()`/`scheduler.yield()`、优先级、TaskController/AbortSignal、分片、公平性与饥饿；可见性、冻结/恢复和 BFCache；BroadcastChannel、SharedWorker、Web Locks、互斥与领导者选举；能力检测、清理和降级；全部必读资料均为中文。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《中文核心讲义》《中文｜使用 scheduler.yield》《中文｜Chrome 页面生命周期》《中文｜MDN BroadcastChannel》《中文｜MDN Web Locks API》，定位优先级、冻结/恢复、锁和降级；首考题 2（机制解释）：给定可见/隐藏标签、冻结/恢复和两标签抢锁，解释调度、生命周期与领导者协议；首考题 3（最小产出）：固定 fixture 为 10000 项分片、每片 100、12ms 后 Abort、标签 A/B、A 在第 20 片冻结、无 `scheduler` 路径；实现优先任务/回退、可见性保存和单领导者，交付启动/取消日志、INP/总耗时比较、锁消息序列与冻结恢复断言；首考题 4（受限排错）：给定日志“hidden 标签仍每秒运行，恢复后订阅两次，A/B 同时 leader”；仅在 visibility 清理、pageshow 恢复、锁超时/消息版本三项中排查，逐项证伪、修复并回归；首考题 5（学习复述）：用 3 分钟说明帧、空闲、优先任务、Worker、广播与锁的选型。复测变式：仅把 A 的状态从前台改为冻结后恢复，保持 B/任务不变，提交唯一 leader、无重复订阅和降级路径新证据。命题边界：Scheduling API 不是 Baseline。
- 通过标准：日志、INP/耗时比较、锁序列和冻结恢复测试可复核；优先级、取消和降级有效。否决项：只调用一次 yield、只演示单标签或使用固定延时碰运气。评估边界：不评估服务端分布式锁。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## WEB-04 原生分层 UI、视图过渡与渐进增强

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#web-04)、[Popover API](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Reference/Global_attributes/popover)、[View Transition API](https://developer.mozilla.org/zh-CN/docs/Web/API/View_Transition_API)、[Navigation API](https://developer.mozilla.org/zh-CN/docs/Web/API/Navigation_API)。覆盖范围：`dialog`、popover、top layer、`inert`、声明式 invoker commands/`commandfor`、可定制原生控件与状态保持 DOM 移动；同文档、跨文档和元素范围 View Transition；Navigation API；焦点、历史、表单、恢复、reduced-motion；有限支持/实验能力的分层、能力检测与渐进增强。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《中文核心讲义》《Popover API》《View Transition API》《Navigation API》，定位 top layer、焦点、过渡和渐进增强；首考题 2（机制解释）：给定菜单、dialog、列表详情，解释 top layer/`inert`、历史和 View Transition 快照如何协作，并说明无过渡反例；首考题 3（最小产出）：固定 fixture 为菜单按钮、命令面板、详情链接、Escape/外点关闭、关闭过渡和不支持 API 浏览器；不用库实现，交付能力检测代码、键盘序列、历史长度/焦点断言、启用/关闭过渡截图和普通链接 fallback；首考题 4（受限排错）：给定日志“关闭后焦点在 body，背景仍可 Tab，返回产生两条 history”；仅在 dialog/popover 归焦、`inert`、导航提交三项中排查，逐项证伪、修复和关闭过渡回归；首考题 5（学习复述）：用 3 分钟说明何时选原生、框架或普通链接/表单。复测变式：仅关闭 View Transition，保持 DOM/链接不变，提交焦点、历史与任务可用的新证据。命题边界：实验能力不是核心唯一路径。
- 通过标准：键盘序列、历史/焦点断言、截图和 fallback 可复核。否决项：只展示动画、单浏览器验证或用 div 伪装原生控件。评估边界：不评估框架路由实现。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## WEB-05 Web Components、Shadow DOM 与跨框架互操作

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#web-05)、[中文｜MDN Web Components](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_components)、[中文｜MDN 使用自定义元素](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_components/Using_custom_elements)、[中文｜MDN 使用 Shadow DOM](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_components/Using_shadow_DOM)。覆盖范围：Custom Elements 生命周期与注册表、Shadow DOM 封装、template/slot、属性与属性值反射、ElementInternals 与表单关联、自定义状态、CSS Parts/自定义属性、composed 事件和焦点/无障碍树；在原生、React、Vue、微前端和设计系统中的互操作与版本边界；全部必读资料均为中文。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《中文核心讲义》《中文｜MDN Web Components》《中文｜MDN 使用自定义元素》《中文｜MDN 使用 Shadow DOM》，定位生命周期、slot、事件和封装边界；首考题 2（机制解释）：以 light DOM、shadow tree、composed event 和表单关联解释封装与非安全沙箱反例；首考题 3（最小产出）：固定 fixture 为 `<user-score name="Ada">`、slot 标题、`score-change` 事件、表单值 `7`、键盘 Enter 和无 Shadow DOM/SSR；实现元素并在原生/React/Vue 消费，交付属性/事件/样式契约、三环境测试、表单提交输出和 SSR fallback 截图；首考题 4（受限排错）：给定日志“第二次注册抛错，属性回写循环，事件未到宿主，表单值为空”；仅在注册守卫、attributeChanged 回写、`composed`/form-associated 三项中排查，逐项证伪、修复和三环境回归；首考题 5（学习复述）：用 3 分钟说明 Web Component、框架组件、普通函数取舍。复测变式：仅将消费端改为 SSR 无 Shadow DOM，保持属性/事件不变，提交可读 HTML、表单和事件降级证据。命题边界：不以封装库 API 代替平台标准。
- 通过标准：三环境测试、契约、表单输出和 fallback 截图可复核。否决项：只在单框架运行、依赖全局样式碰巧成功或关闭 Shadow DOM 回避边界。评估边界：不评估组件包发布流程。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

### 网络与系统化诊断

## NET-01 浏览器网络协议、Fetch 与请求可靠性

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#net-01)、[中文｜MDN HTTP](https://developer.mozilla.org/zh-CN/docs/Web/HTTP)、[中文｜MDN HTTP 的发展](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Guides/Evolution_of_HTTP)、[中文｜MDN HTTP 缓存](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Guides/Caching)、[中文｜MDN CORS](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Guides/CORS)、[中文｜Chrome Network 参考](https://developer.chrome.com/docs/devtools/network/reference?hl=zh-cn)。覆盖范围：URL、DNS、连接、TLS/证书到请求响应的浏览器链路；HTTP、Cookie、缓存与 CORS；请求超时、取消、重试退避与抖动、幂等键、重复提交、并发去重、过期响应、刷新令牌风暴和离线恢复；HTTP/1.1、HTTP/2、HTTP/3/QUIC 差异，以及 Service Worker、代理、CDN、TTFB 和瀑布流诊断。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《中文核心讲义》《中文｜MDN HTTP》《中文｜MDN HTTP 的发展》《中文｜MDN HTTP 缓存》《中文｜MDN CORS》《中文｜Chrome Network 参考》，定位 Timing、缓存、CORS、取消和重试；首考题 2（机制解释）：给定 GET 与 POST，画出 DNS/TLS/缓存/响应提交，并区分传输、业务、UI 成功；首考题 3（最小产出）：固定 fixture 为两次 `/search?q=a`（30ms/10ms）、刷新 token 的 401×3、GET 503 后成功及 POST `/pay` 503；实现 Abort/去重/singleflight/stale 抑制/退避，交付 Network HAR、最终状态、请求数、缓存策略表和 GET/POST 自动测试；首考题 4（受限排错）：给定日志“旧 a 覆盖新 a，401 发出 3 次 refresh，POST 重复扣款”；仅在请求序号、refresh singleflight、幂等/重试资格三项中排查，逐项证伪、修复和离线重连回归；首考题 5（学习复述）：用 3 分钟说明三种成功状态。复测变式：仅把 GET 503 fixture 改成非幂等 POST 503，保持超时/取消不变，提交无自动重试、HAR 和 UI 新证据。命题边界：不实现传输协议。
- 通过标准：HAR、请求数、状态测试和故障注入证据可复核；取消不提交旧状态，重试受预算。否决项：无限重试、清缓存当修复、只处理 GET 或未验证副作用。评估边界：不评估服务端协议实现。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## DEBUG-01 浏览器、异步与生产环境系统化调试

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#debug-01)、[中文｜Chrome JavaScript 调试](https://developer.chrome.com/docs/devtools/javascript?hl=zh-cn)、[中文｜Chrome 断点参考](https://developer.chrome.com/docs/devtools/javascript/breakpoints?hl=zh-cn)、[中文｜Chrome Source Map](https://developer.chrome.com/docs/devtools/javascript/source-maps?hl=zh-cn)、[中文｜Pro Git 使用 Git 调试](https://git-scm.com/book/zh/v2/Git-工具-使用-Git-调试)。覆盖范围：可重复最小用例、预期/实际差异、假设排序和证伪；行/条件/日志/DOM/事件/XHR/异常断点、调用栈、异步栈、闭包和 Worker 上下文；网络重放、存储、Source Map、压缩产物与生产错误映射；日志、Trace、版本差异、`git bisect` 和回归测试；全部必读资料均为中文。
- 严格考核：挑战类型：DEBUGGING；首考题 1（资料定位）：只允许使用《中文核心讲义》《中文｜Chrome JavaScript 调试》《中文｜Chrome 断点参考》《中文｜Chrome Source Map》《中文｜Pro Git 使用 Git 调试》，定位断点、Source Map、bisect 和证伪流程；首考题 2（机制解释）：以竞争、DOM 点击、缓存和压缩栈说明复现—取证—假设—验证—回归链与相关性反例；首考题 3（最小产出）：固定 fixture 为版本 `v17` 正常/`v18` 异常、压缩栈 `app.min.js:1:1842`、缓存响应 `X-Cache:HIT`、双请求 30/10ms；执行 Source Map 映射和 `git bisect run`，交付四类证据、首坏提交、最小修复和回归测试；首考题 4（受限排错）：给定日志“仅 v18 生产环境偶发旧响应覆盖，Source Map 指向 handler”；仅在请求竞争、构建 Source Map、缓存版本三项中排查，禁止先改代码，逐项证伪并提交 bisect/回归；首考题 5（学习复述）：用 3 分钟复盘事实、假设、证据和排除项。复测变式：仅将生产版本从 v18 改回 v17，保持输入/缓存不变，提交 bisect 结论反转和新 HAR。命题边界：禁止以重启、清缓存或全量回滚替代根因。
- 通过标准：复现步骤、断点/栈/HAR/bisect 记录和回归可复核；每个结论有证据。否决项：偶然修好、只描述最终改动或未排除竞争假设。评估边界：不评估真实生产发布权限。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

### Web 安全与可信边界

## SEC-01 XSS、CSRF 与前端输入输出信任边界

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#sec-01)、[OWASP XSS 防护](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)（英文原文，仅用于版本核验）、[OWASP CSRF 防护](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)（英文原文，仅用于版本核验）、[OWASP DOM Clobbering](https://cheatsheetseries.owasp.org/cheatsheets/DOM_Clobbering_Prevention_Cheat_Sheet.html)（英文原文，仅用于版本核验）、[OWASP Prototype Pollution](https://cheatsheetseries.owasp.org/cheatsheets/Prototype_Pollution_Prevention_Cheat_Sheet.html)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：上下文相关 XSS、DOM XSS、DOM Clobbering、Prototype Pollution、CSRF、开放重定向、客户端鉴权误用和敏感信息泄露；负责不可信输入到危险 sink/越权判断的攻击数据流。Cookie、Session、Token 的登录、续期、退出与吊销生命周期归 `IDENTITY-01`。
- 严格考核：挑战类型：DEBUGGING；首考题 1（资料定位）：只允许使用《中文核心讲义》，定位 XSS/CSRF、命名遮蔽、危险键与授权边界；首考题 2（机制解释）：给定不可信 HTML、`id=location` 和 `__proto__`，说明它们分别进入 sink、全局引用和原型链，以及隐藏按钮反例；首考题 3（最小产出）：固定 fixture 为 Markdown `<img onerror=1>`、`{__proto__:{admin:true}}`、`next=https://evil.test`、无 CSRF token 的转账请求；交付数据流图、上下文编码/安全 sink、危险键拒绝、origin/token 校验和自动攻击回归结果；首考题 4（受限排错）：给定日志“预览执行 handler，merge 后 `config.admin=true`，隐藏 approve 按钮仍可请求”；仅在 DOM sink、`__proto__/constructor` 过滤、服务端授权/CSRF 三项中排查，逐项证伪、修复和四攻击回归；首考题 5（学习复述）：用 3 分钟说明各防线阻断的数据流。复测变式：仅将 Markdown 输入替换为危险对象键，保持业务操作不变，提交 sink/合并双边界的新攻击记录。命题边界：不要求背诵 payload；英文原文不作为独立首考题源。
- 通过标准：数据流图、四攻击回归、请求/拒绝日志可复核；输出编码与 sink 匹配，授权由服务端执行。否决项：只装净化库、只隐藏按钮或只让一个 payload 失败。评估边界：不评估身份会话生命周期。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 150 分钟；考核 105 分钟；复测 90 分钟

## SEC-02 CSP、Trusted Types 与安全违规报告

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#sec-02)、[MDN CSP 指南](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Guides/CSP)、[Trusted Types API](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/trustedTypes)、[MDN upgrade-insecure-requests](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/upgrade-insecure-requests)。覆盖范围：CSP nonce/hash/strict-dynamic、Report-Only 到强制、`frame-ancestors`、Trusted Types sink/policy、Reporting API 与违规报告；`upgrade-insecure-requests` 仅作为 CSP 指令的语义与适用边界。第三方 SDK/Tag Manager 只在其脚本来源、nonce 和违规治理的语境中讨论；不把 SRI、Mixed Content、HTTPS/HSTS 或资源完整性并入本点。
- 严格考核：挑战类型：TOOL_OPERATION；首考题 1（资料定位）：只允许使用《中文核心讲义》《MDN CSP 指南》《Trusted Types API》《MDN upgrade-insecure-requests》，定位 nonce、Trusted Types、report-only 与违规报告；首考题 2（机制解释）：给定 Markdown sink、第三方脚本和错误 nonce，解释 CSP、Trusted Types、报告链和输出编码边界；首考题 3（最小产出）：固定 fixture 为 `script-src 'nonce-n1'`、合法 SDK、未知 `evil.test`、旧 nonce `n0`、`innerHTML` sink 和 report endpoint；执行 Report-Only→enforce，交付响应头、policy、四种请求/控制台/报告记录、报告脱敏去重和第三方 owner 清单；首考题 4（受限排错）：给定日志“缓存返回 n0，合法 SDK 被拦，报告同页 100 条”；仅在 nonce 缓存、policy 来源、报告去重三项中排查，逐项证伪、修复并回归四 fixture；首考题 5（学习复述）：用 3 分钟说明第三方脚本为何等同站点权限。复测变式：仅把 nonce n1 改为缓存 n0，保持脚本/页面不变，提交阻断、报告和合法路径新证据。命题边界：不以 allowlist/unsafe-inline 规避。
- 通过标准：响应头、四类记录、报告与 owner 清单可复核；合法路径无误报，危险 sink/源被观测阻断。否决项：长期 Report-Only、广泛 allowlist、unsafe-inline/unsafe-eval 或只看控制台。评估边界：不评估 SRI/HTTPS 部署。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 150 分钟；考核 105 分钟；复测 90 分钟

## SEC-04 跨源隔离、嵌入式上下文与权限策略

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#sec-04)、[中文｜MDN COEP](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Reference/Headers/Cross-Origin-Embedder-Policy)、[中文｜MDN 权限策略](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Guides/Permissions_Policy)、[MDN COOP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Opener-Policy)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：同源与站点、COOP/COEP/CORP/CORS、`crossOriginIsolated`、SharedArrayBuffer、Origin-Agent-Cluster；iframe sandbox/allow/credentialless、Permissions Policy、CSP `frame-ancestors` 与 UI redressing；`postMessage` 来源/Schema；弹窗 opener、第三方嵌入、跨站可观察差异与 XS-Leaks 防护；迁移、兼容、报告和降级。
- 严格考核：挑战类型：DESIGN_CASE；首考题 1（资料定位）：只允许使用《中文核心讲义》《中文｜MDN COEP》《中文｜MDN 权限策略》，定位隔离、iframe 最小授权、消息 Schema 与降级；首考题 2（机制解释）：给定顶层页、partner iframe 和 SAB，解释 COOP/COEP/CORP、sandbox/allow、postMessage origin 的链与通配来源反例；首考题 3（最小产出）：固定 fixture 为 `https://app.test`、`https://partner.test`、未知 `https://evil.test`、无 CORP 图片和 SAB feature；交付隔离/iframe 响应头、sandbox/allow、消息 `{version:1,type:'ready'}` Schema、自动化 `crossOriginIsolated`/拒绝 origin 测试和无隔离 fallback 截图；首考题 4（受限排错）：给定日志“partner 图片被 COEP 拦截，`*` 消息被接受，iframe 调用 camera”；仅在 CORP/CORS、origin/source 校验、allow 权限三项中排查，逐项证伪、修复和恶意父页回归；首考题 5（学习复述）：用 3 分钟说明隔离为何改变集成。复测变式：仅把 partner origin 改为 evil.test，保持消息 Schema/权限不变，提交消息拒绝、隔离状态和 fallback 新证据。命题边界：英文原文不作为独立首考题源。
- 通过标准：响应头、自动测试、消息日志、权限表和 fallback 证据可复核。否决项：关闭隔离、使用 `*`、放宽 iframe 权限或只加遮罩。评估边界：不评估真实第三方合同。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 150 分钟；考核 105 分钟；复测 90 分钟

## SEC-03 WebAuthn、Passkey 与安全认证体验

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#sec-03)、[WebAuthn Level 3](https://www.w3.org/TR/webauthn-3/)（英文原文，仅用于版本核验）、[MDN Web Authentication API](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Authentication_API)、[web.dev Passkeys](https://web.dev/articles/passkey-registration?hl=zh-cn)。WebAuthn Level 3 英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：WebAuthn 注册与认证 ceremony、challenge、RP ID、origin、凭证发现、用户验证、Passkey 同步和恢复；覆盖能力检测、传统登录回退与反钓鱼边界。
- 严格考核：挑战类型：DESIGN_CASE；首考题 1（资料定位）：只允许使用《中文核心讲义》《MDN Web Authentication API》《web.dev Passkeys》，定位 ceremony、challenge、RP/origin、恢复和降级；首考题 2（机制解释）：给定一次性 challenge、错误 RP ID 和无凭证设备，解释服务端验证链与“前端成功”反例；首考题 3（最小产出）：固定 fixture 为注册/登录/取消/无 Passkey、challenge `c1`、RP `app.test`、错误 origin `evil.test`；交付时序图、UI 状态、服务端验证模拟日志、重放/钓鱼威胁表和无凭证恢复测试；首考题 4（受限排错）：给定日志“UI 显示成功但服务端拒绝 `challenge used`”；仅在 challenge 一次性、RP/origin、credential/服务端结果三项中排查，逐项证伪、修复和登录回归；首考题 5（学习复述）：用 3 分钟说明 Passkey 降低钓鱼但不等于授权。复测变式：仅将设备改为不支持条件式 UI，保持 RP/challenge 不变，提交传统安全回退、枚举保护和验证日志。命题边界：英文原文不作为独立首考题源。
- 通过标准：时序、模拟验证日志、威胁表和回退测试可复核；challenge 由服务端一次性校验。否决项：前端成功即认证、错误泄露账号或无恢复路径。评估边界：不评估真实凭证存储服务。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 150 分钟；考核 105 分钟；复测 90 分钟

## SEC-05 Web Crypto、密钥生命周期与客户端密码学边界

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文补充讲义：SEC-05](../chinese-guides/content-audit-01-03.md#sec-05)、[中文｜MDN SubtleCrypto](https://developer.mozilla.org/zh-CN/docs/Web/API/SubtleCrypto)、[Web Cryptography Level 2](https://www.w3.org/TR/webcrypto-2/)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：安全随机数、摘要/HMAC、签名/验签、对称/非对称加密、密钥生成/导入/派生/包装/轮换/销毁、算法参数、传输与存储边界、服务端/KMS/HSM 职责以及浏览器威胁模型。移除中文核心讲义：其摘要未覆盖 `CryptoKey`、AES-GCM IV/nonce、导入导出、轮换或生命周期实验。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《中文补充讲义：SEC-05》《中文｜MDN SubtleCrypto》，定位 AES-GCM、CryptoKey usages、导入导出、轮换与失败路径；首考题 2（机制解释）：给定 AES-GCM 信封，解释 IV/AAD、不可导出 key 与服务端可信根，并区分编码/哈希/签名/加密；首考题 3（最小产出）：固定 fixture 为明文 `salary=100`、AAD `user:1`、随机 12-byte IV、`extractable:false` key、版本 `v1→v2`、篡改 ciphertext/IV/AAD；实现信封与受控验签，交付加密/解密结果、三篡改拒绝测试、key export 失败、轮换迁移和服务端模拟验证日志；首考题 4（受限排错）：给定日志“验签失败、两个信封 IV 相同、exportKey 成功”；仅在编码/算法参数、IV 生成、key usages/extractable 三项中排查，逐项证伪、修复和篡改/轮换回归；首考题 5（学习复述）：用 3 分钟说明浏览器与服务端/KMS 的密码学边界。复测变式：仅将 AAD 从 `user:1` 改为 `user:2`，保持 ciphertext/key/IV 不变，提交解密拒绝、审计日志和其他不变量证据。命题边界：禁止自创算法或混淆当加密；英文原文不作为独立首考题源。
- 通过标准：信封、三篡改测试、key export、轮换和验证日志可复核；nonce/usages 最小正确。否决项：只让示例成功、复用 nonce、可导出密钥或无攻击验证。评估边界：不评估真实 KMS 运营。
- 预计耗时：资料 135 分钟；练习 195 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## 领域综合考核

- [ ] 已通过领域综合考核
- 任务：独立实现一个无框架的可访问数据看板，包含异步请求、缓存、取消、响应式布局、错误处理和安全渲染，并附 DevTools 网络/渲染分析报告。
- 通过标准：4 小时内完成；自动测试覆盖核心逻辑；键盘可用；无明显 XSS 风险；能闭卷解释任意 5 处实现的浏览器底层原因。评估边界：领域综合考核只依据本领域列出的资料、题目输入和可复核产出；不得用资料外经验替代跨知识点整合证据。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 150 分钟；考核 105 分钟；复测 90 分钟
