# 01—03 域中文补充讲义

本讲义只补足审计中发现的资料缺口；它不是外部文档的转述。每节均给出可独立完成的最小练习和验收条件。术语与 API 的版本细节仍以各知识点链接的官方文档为准。

## TS-01

术语与定义：本节的核心概念是“静态可赋值”，机制/流程是先由编译器检查、再由运行时边界校验。适用场景是在重构既有 JavaScript、接收可选字段或维护公共 API 时；边界是类型擦除后不能阻止恶意输入。验证证据应包含编译失败样例、解析成功样例和回归测试。

复核清单：把每次类型报错分为“模型表达不全”“调用点缺少收窄”“外部边界未校验”和“配置故意收紧”四类，再决定修复位置。不要为了让编译器安静而把可选字段改成必填、以非空断言读取索引，或把第三方响应直接声明成内部模型；这些做法会把失败推迟到生产环境。可以先在小切片启用严格选项，记录错误数、风险、负责人和回归测试，再逐步扩大范围。类型别名用于命名稳定业务概念，接口适合声明可扩展对象契约；二者都不会制造运行时验证。验收时应展示：空值、缺失索引、额外属性、错误回调参数各一例的编译失败，以及经过解析后才允许进入领域逻辑的一例成功路径。

TypeScript 的类型在编译后会被擦除；它约束的是写程序时的可赋值关系，不能验证网络、文件或用户输入。结构化类型表示“可用性”由成员形状决定，而不是声明时的名字决定：赋值目标所要求的每个成员都必须存在且类型兼容。对象字面量的 excess property check 是额外的拼写错误防线，不应误当作所有赋值都会执行的运行时或名义类型检查。开启 `strict` 后，`strictNullChecks`、`noImplicitAny` 等选项把此前隐含的不确定性变成显式错误；`noUncheckedIndexedAccess` 则使可能越界的索引结果包含 `undefined`。

优先让外部输入为 `unknown`，经校验后再变成业务类型；不要用 `any`、双重断言或空对象类型跳过检查。`object` 不接收原始值，`{}` 接收所有非空值，二者都不是“任意 JSON 对象”。练习：把一段含可选字段、索引访问和回调参数的 JavaScript 迁至 `strict` + `noUncheckedIndexedAccess`，列出八处原本隐含的不安全，并分别用收窄、默认值或边界校验修复。验收：无 `any` 与断言逃生；能说明其中一处必须在运行时校验的原因。

## TS-02

定义：判别联合是以稳定字面量区分成员的类型模型；机制/流程是先读取判别字段、再收窄、最后穷尽分支。适用场景为异步界面、业务流程与协议结果。边界是未经验证的输入和可变判别字段；验证通过新增成员的编译失败、失败 JSON fixture 与回归测试完成。

设计判别联合时，判别字段必须在每个成员中都存在、是不可歧义的字面量，并在构造边界一次写入。不要用 `status?: string`、相互重叠的成员或“成功且错误字段也存在”的对象来表示状态；它们会令分支无法可靠收窄。对 API 返回的 `kind`，先验证它属于允许集合，再按成员验证其必需字段；未知 `kind` 应进入显式的兼容/失败分支。测试至少包括：合法五状态都被渲染、缺少判别字段被拒绝、服务端新增状态被 `assertNever` 暴露、以及调用者不能把 `error` 当成 `data` 读取。这样类型系统负责局部完备性，协议兼容仍由运行时边界负责。

联合类型表示值可能是若干明确形状之一；收窄必须由运行时可观察的证据触发，例如 `typeof`、`in`、判别字段或经验证的类型谓词。推荐为异步或业务状态定义稳定的字面量判别字段，再用 `switch` 分支处理。分支全部排除后剩余类型为 `never`；把值传给 `assertNever(value: never)`，即可让新增成员在遗漏分支时成为编译错误。

断言不会产生检查，错误的自定义谓词也会把不可信值伪装成安全值；可变的判别字段会破坏已完成的收窄。练习：定义 loading、success、empty、failure、forbidden 五种状态的判别联合，渲染函数必须穷尽处理；随后新增 `stale` 状态。验收：新增状态使遗漏的分支编译失败；伪造 JSON 先作为 `unknown` 拒绝，而非直接断言为联合成员。

## TS-03

补充练习场景：为后台表格同时定义用户、订单和审计记录三种行模型，证明列配置不能把订单字段用在用户行上；再把字段改为可选并观察渲染回调必须处理 `undefined`。把这些案例纳入类型测试，作为 API 演进时的回归证据。

定义：泛型是保留输入输出关系的参数化类型；机制/流程是先推断 `T`、再由约束限制可访问成员、最后得到精确返回值。适用场景为表格列、字段访问和复用库 API。边界是动态键和无意义泛化；验证要用合法/非法键、可选字段和回归测试证明关系没有被断言破坏。

泛型 API 的好坏不取决于参数数量，而取决于调用者能否从签名看出约束与返回关系。若 `K` 必须来自 `T`，应把它写成 `K extends keyof T`，而不是接收 `string` 后再断言；若只支持对象字段，不要暗示数组索引、继承私有成员或动态 JSON 键也安全。把泛型放在函数上可让每次调用独立推断，放在容器/组件上适合其整个生命周期共享同一行模型。测试应包含空对象、可选字段、联合键、错误键和回调返回不一致；同时人工检查错误信息是否仍能让普通使用者理解。若参数只为了“未来可能用到”而存在，删除它通常比给默认 `unknown` 更安全。

泛型用类型参数表达输入与输出之间的关系，而不是用 `any` 放弃关系。约束如 `<T extends object>` 只允许访问约束所保证的成员；`keyof T` 取得合法键的联合，`T[K]` 取得对应值类型。典型安全接口是 `getProperty<T, K extends keyof T>(value: T, key: K): T[K]`：错误键名和错误返回值都会在编译期暴露。

默认类型参数只应服务明确的常见情形；当调用者不需要类型参数之间的关系时，普通联合或重载通常更易读。练习：为表格列定义 `Column<Row, K extends keyof Row>`，其 `render` 接收精确的 `Row[K]`；实现 `getProperty` 并为合法/非法键各写类型测试。验收：字段改名会同时报错，不能通过无意义的 `<T>` 或断言让错误通过。

## TS-04

补充场景：当表单保存失败时，错误视图只暴露可编辑字段，服务端生成字段仍保持只读。验证应断言映射后的 key 集合准确，并保留一个非法事件名的反例。

定义：映射类型按键生成新属性形状；机制/流程是遍历键、应用修饰符或重映射、再得到受限视图。适用场景为 DTO、表单与事件名转换。边界是深递归、无限联合和运行时对象并未被冻结；验证用 readonly、optional、嵌套和错误键的类型测试及回归测试。

工具类型应只转换已有稳定模型的局部视图，不能替代领域命名和运行时转换。`Partial<T>` 适合补丁语义却不等同于创建输入；`Readonly<T>` 阻止静态写入却不冻结对象；深递归 `DeepReadonly` 对函数、数组、日期、Map/Set 和递归图都要声明策略。键重映射和模板字面量应限制于有限联合，避免把任意字符串拼成看似可调用的事件名。验证时给出 DTO、表单和提交 payload 三种不同形状，证明不允许编辑的字段不会混入提交；再以一个大型联合展示编译缓慢或提示难读时如何退回到显式类型。类型测试既要断言期望能通过，也要保留一个 `@ts-expect-error` 的反例。

映射类型遍历键：`{ [K in keyof T]: T[K] }`，并可用 `readonly`、`?` 的增删和 `as` 键重映射改变属性。标准 `Pick`、`Omit`、`Partial`、`Required`、`Readonly` 应先于自定义复杂工具使用。模板字面量类型能把有限字符串联合组合成事件名或路径，但联合的笛卡尔展开会迅速放大编译成本与错误信息。

练习：从只读 DTO 推导可编辑表单模型，保留 ID、把可修改字段设为可选，并用 ``on${Capitalize<K>}`` 生成有限事件名。验收：类型测试覆盖 readonly、optional、union 与嵌套对象；若工具需要递归到未知深度或报错难读，改为显式模型而非继续叠加类型体操。

## TS-05

补充验证场景：把每个推断结果写为可读的别名并交由类型测试检查；一旦联合成员增加，预期类型与失败边界必须同时更新。

定义：条件类型根据可赋值关系选择结果；机制/流程是先匹配、必要时 `infer`、对裸联合分布或用元组阻止分布。适用场景为提取 Promise、函数和有限联合的结构。边界是 `any` 污染、`never` 消失和递归性能；验证采用具体成员、联合成员和反例的类型测试。

阅读条件类型时先代入一个具体成员，再代入联合，最后观察 `never` 与 `any`；不要仅凭直觉判断推断结果。分布式行为特别适合过滤联合成员，但在判断“整个联合是否满足条件”时必须用元组包裹。`infer` 推出的是匹配位置存在的类型变量，不会执行运行时解包；不匹配时要有可读的回退，而非递归到无限深。为每个工具写别名级测试，例如 `Unwrap<Promise<string>>`、`Unwrap<string>`、`ParametersOf<() => void>`、`ParametersOf<string>` 和联合输入；记录预期类型及失败原因。若需要多层递归、分配式交叉或错误信息无法定位，优先把复杂关系拆成两个命名步骤，或改用运行时函数配合普通联合。

条件类型 `T extends U ? X : Y` 根据可赋值关系选择分支；当 `T` 是裸类型参数且传入联合时，会对每个成员分布。把两侧包入元组（`[T] extends [U]`）可阻止分布。`infer` 只在条件类型的匹配位置提取已有结构，例如 `T extends Promise<infer U> ? U : T`。`never` 在分布中会消失，`any` 会污染分支推断，因此需要用独立类型测试固定预期。

练习：实现 Promise 解包、函数参数提取和一个非分布式“整体是否为字符串”判断，并写出 `string | number`、`never`、`any` 的预期。验收：解释每一例为何分布或不分布；递归或多层条件导致可读性/编译时间恶化时，用运行时函数、显式别名或更简单的联合替代。

## TS-07

定义：运行时 schema 是从不可信值建立可信模型的边界；机制/流程是先接收 `unknown`、再解析字段、最后映射领域错误。适用场景为 HTTP、存储和跨版本消息。边界是 schema 不能替代授权、也不能阻止上游不可用；验证必须保存错误路径、取消路径和成功路径的测试证据。

schema 的职责是解析和拒绝，不能只在开发环境打印警告后继续使用原始值。把错误收集为稳定的结构（路径、规则、可显示消息、关联 ID），再按调用层决定是否重试、提示、记录或降级；取消不是“未知错误”，应被单独识别。版本演进时应允许向后兼容的可选字段，但未知枚举、关键字段缺失和不满足不变量的组合必须有明确策略。测试至少包括：服务端返回 HTML/非 JSON、数组被误作对象、嵌套字段错误、分页游标失效及同一错误的用户/日志表示。验收产物需展示 schema 从 `unknown` 到领域模型的唯一入口，避免某个快捷调用绕过校验。

静态类型描述可信代码中的形状，运行时 schema 才能决定不可信输入是否可进入系统。网络响应、存储恢复值和跨版本消息应先以 `unknown` 接收，解析器在成功时返回已验证数据，在失败时返回可归因的字段错误；不要把 `JSON.parse()` 的结果直接断言为接口。静态类型、schema、传输对象和领域对象可共享推导或生成来源，避免人工维护两份相同结构而漂移。

错误模型至少区分传输失败、协议/校验失败、业务拒绝与取消，并保留安全的 `cause`、请求关联 ID 和字段路径；对用户展示的信息不得泄露敏感原文。练习：为分页接口定义请求、成功响应、错误响应和 schema，注入缺字段、错误类型与未知枚举。验收：所有边界输入先为 `unknown`；失败路径可定位字段且不被 `any`/断言掩盖。

## TS-08

定义：状态机模型把状态、动作和权限关系显式化；机制/流程是先检查当前状态与主体、再选择允许动作、最后由服务端确认。适用场景为审核、订单和协同编辑。边界是客户端类型不构成授权且并发会造成旧状态；验证包括非法转移、越权请求和回归测试。

把“谁能看见按钮”与“谁能执行动作”分开建模：前者优化体验，后者必须由服务端根据当前主体、资源和状态再判断。品牌类型只在创建函数或校验边界赋予，不能用随处可见的 `as` 伪造；状态转移应从一个集中表或 reducer 推导 UI 文案、可用动作和测试矩阵，避免三处手写规则漂移。并发场景还要处理旧页面提交、新状态到达和重复请求，类型不能代替版本号、幂等键或服务端冲突响应。验收时展示非法动作在编译期不可构造、在运行时被拒绝、在 UI 中不可用的三层证据，并说明后端新增状态时先如何保守降级再完成客户端发布。

业务状态应以可辨识联合与允许动作的单一映射表达，而不是多个彼此矛盾的可选布尔值。用品牌类型区分同为字符串但语义不同的 ID；DTO 只代表传输形状，进入领域层后转换为带不变量的模型。类型可以阻止本地调用方构造显然非法的状态，却不能代替服务端对身份、当前数据和权限的重新授权。

练习：为审核单定义 draft、reviewing、approved、rejected 状态及动作表；把“只有管理员可批准”同时写成 UI 可见性和服务端返回的运行时拒绝 fixture。验收：新增状态或动作会迫使映射补全；越权请求即便绕过前端也失败；DTO 增删字段通过边界转换而非扩散断言处理。

下面是一个最小但完整的审核模型。品牌只由解析函数创建；它把“字符串格式正确”集中在边界，业务函数随后不再接受任意 `string`。`transitions` 是状态、可用动作、按钮文案和测试矩阵的唯一来源：新增 `State` 成员时，`satisfies Record<State, ...>` 会要求补齐该成员，而不是默默落入默认分支。

```ts
type Brand<T, Name extends string> = T & { readonly __brand: Name };
type ReviewId = Brand<string, "ReviewId">;
type Version = Brand<number, "Version">;
type State = "draft" | "reviewing" | "approved" | "rejected";
type Action = "submit" | "approve" | "reject" | "revise";
type Actor = { id: string; role: "author" | "reviewer" | "admin" };

function parseReviewId(value: unknown): ReviewId {
  if (typeof value !== "string" || !/^rvw_[a-z0-9]+$/.test(value)) throw new Error("invalid review id");
  return value as ReviewId; // 唯一的品牌构造边界
}

const transitions = {
  draft: ["submit"],
  reviewing: ["approve", "reject"],
  approved: ["revise"],
  rejected: ["revise"],
} as const satisfies Record<State, readonly Action[]>;

function mayAct(state: State, action: Action, actor: Actor): boolean {
  return transitions[state].includes(action) &&
    (action !== "approve" || actor.role === "admin");
}
```

UI 只能以 `mayAct(review.state, "approve", viewer)` 决定是否显示或禁用按钮；它不能把 `false` 当作授权结果。服务端动作要重新读取当前记录、验证主体、检查版本和状态，再在同一个事务中提交。例如 `approve({ id, expectedVersion })` 的顺序应是：解析 `id`、载入记录、比较 `record.version === expectedVersion`、检查当前用户为管理员且 `record.state === "reviewing"`、写入 `approved` 与 `version + 1`、记录审计事件。任何一步不满足都返回可判别结果，如 `{ ok: false, kind: "forbidden" | "invalid-transition" | "conflict" }`；不要仅返回 `false`，否则客户端无法给出安全且可行动的提示。

并发反例必须真实重放：管理员 A 与 B 都读取 `reviewing@4`；B 先批准，服务端写成 `approved@5`；A 再携带 `expectedVersion: 4` 提交，即使 A 也是管理员也必须得到 `conflict`，而不是覆盖 B 的决定。重复点击则使用请求幂等键；同一个 key 的第二次调用返回第一次的稳定结果，不能重复写审计事件。页面收到 `conflict` 后重新拉取，并保留用户尚未提交的修订说明；不能乐观地把本地状态永久显示为 `approved`。

反证实验分四层执行。第一，类型测试中给 `transitions` 加入 `"escalated"` 状态，预期编译失败直到补齐映射；第二，状态表测试遍历全部 `(state, action)`，对不在表中的动作断言 `invalid-transition`；第三，直接调用服务端 approve fixture，分别传 author、非法 ID 和旧版本，断言 `forbidden`、解析失败和 `conflict`；第四，用浏览器测试确认 author 看不到批准按钮，但仍用直接 HTTP 请求证明服务端拒绝。验收记录应保存请求 ID、旧/新 version、动作、主体、结果和审计事件数，因而能证明“类型、UI、服务端、并发控制”各自负责的边界。

## TS-09

定义：迁移是对编译、解析与运行契约的受控变更；机制/流程是先冻结基线、再逐项升级、验证三类产物、最后保留回滚。适用场景为 TypeScript、Node 或打包器版本升级。边界是编辑器通过不等于运行正确；验证要记录 module、target、解析和真实加载的 fixture 证据。

升级不应直接覆盖主分支配置。先锁定可复现依赖与基线测试，建立能单独运行的应用、服务和包，再按“诊断出现—最小修复—编译验证—运行验证—回滚条件”记录每项变化。模块问题尤其要分别检查源码语法、发射文件扩展名、`package.json` 的 `type`/exports、解析模式和实际 Node/打包器加载；其中任何一层不同都可能让“类型通过”而运行失败。对弃用选项先找到其替代语义，再更新工具链，而非长期压制警告。验收报告应能重放失败 fixture，列出锁定版本与命令输出，并在回滚时恢复到明确的旧行为而不是只恢复依赖锁文件。

迁移要分清四个维度：`target` 决定降级语法与标准库期望，`module` 决定输出模块格式，`moduleResolution` 决定编译时查找规则，运行时/打包器再决定真实加载。升级前锁定 TypeScript、Node、打包器和浏览器基线；在可回滚的工作区切片中逐项启用或接受默认值变化，并用编译与运行测试同时验证。`verbatimModuleSyntax` 让类型导入/值导入边界更直观；side-effect import、`types` 发现、`rootDir` 和 DOM/typed array 变动常暴露旧配置的隐含假设。

练习：为浏览器应用、Node 服务和组件包各建立最小 fixture，记录旧/新配置、错误、根因、修复和回滚条件；分别测试模块格式不匹配、缺失全局类型与副作用导入。验收：不以 `skipLibCheck`、批量断言或只看编辑器无红线通过；每项破坏性变化都有可复现的编译和运行证据。

## JS-04

浏览器中的 JavaScript 一次只在一个调用栈上执行。同步代码运行到栈清空才结束当前任务；随后浏览器会反复清空微任务队列，才有机会进行渲染并取下一个任务。`Promise.then`、`await` 的后续代码会排入微任务；定时器和用户事件产生任务。不要把“宏任务”当成规范里的统一任务类别，也不能假定每一个任务后必然绘制一帧。

判断顺序时按四步记录：先写同步输出；把每个已兑现 Promise 的后续代码入微任务队列；任务结束时按 FIFO 运行微任务，并把其中新产生的微任务继续排空；最后才处理下一任务。反例是递归 `queueMicrotask`：它可让浏览器迟迟没有渲染机会，表现为界面卡住，即使调用栈从未很深。`await` 并不“阻塞线程”，它只是把函数余下部分排到 Promise 兑现后的微任务。

练习：给定一段同步日志、两个 `Promise.then`、一个 `await` 和一个 `setTimeout(0)`，提交输出顺序及上述四步队列记录；再将递归微任务改成每 50 项让出一次任务。验收：在 DevTools Performance 中能看到让出后的输入事件被处理，且输出顺序与记录一致。浏览器与 Node 的事件循环并非同一题目，禁止把 Node 专有顺序当作本节结论。

并发上限和取消是另一层应用协议，不能从事件循环顺序“自动得到”。可复现的最小执行器应维护 `nextIndex`、`active`、结果槽位和一个已取消的 `AbortSignal`：只要 `active < 2` 且未取消，才启动下一个工厂函数；每个工厂完成时只写自己的槽位并使 `active--`，然后再次尝试启动；收到取消后停止补位，等待已启动任务自行观察 signal 并将尚未开始的槽位标为 `cancelled`。不要用 `Promise.race` 误把“最快一个完成”当作“全部停止”，也不要让后完成任务按完成顺序 `push` 结果。

实验：准备五个工厂，延迟分别为 `40/5/25/10/30ms`，第三个拒绝；在第 12ms 取消。记录每个工厂的“启动、收到 abort、完成”时间戳，以及每一时刻的 `active` 值。验收证据是：任何时刻 `active ≤ 2`；编号 4、5 从未启动；结果槽位仍按输入编号；拒绝被汇总而非变成未处理拒绝。若底层工作不支持取消，报告必须明确它可能继续消耗资源，但 UI/后续任务不会再由它推进。

## JS-05

Promise 的状态只会从 pending 进入 fulfilled 或 rejected 一次；链式 `then` 的返回值决定下一个 Promise，抛错或返回 rejected Promise 会沿链传播。`finally` 适合做无论成功失败都应执行的清理，但若它抛错或返回拒绝的 Promise，会覆盖原来的结果。`AbortController` 只传播“应当停止”的信号；被调用 API 是否立即停止、已经完成的响应能否被撤回，都必须由调用方和 API 契约分别保证。

搜索联想应维护“当前请求身份”：发起新查询时取消旧控制器并递增序号；响应抵达时只有序号仍等于当前值才可以提交 UI。网络故障、业务拒绝、用户取消和程序错误要使用不同呈现与日志路径。重试不是默认行为：仅对幂等或有幂等键、可安全重放的操作进行有限次数的指数退避与抖动；写操作在不知道服务端是否已成功时不能盲目重放。

练习：实现 `allSettled` 等价聚合，输入三个“成功、失败、延迟成功”的任务，输出必须保留输入顺序。再以 `a → ab → abc` fixture 模拟搜索，延迟让 `a` 最后返回。验收：界面最终只有 `abc` 的结果；取消没有错误提示；`finally` 清理次数等于发起请求数；测试额外验证一个不可重放 POST 不被自动重试。

下面的聚合器刻意只复现“等待全部 settled、按输入顺序返回”这一语义；它不取消任务，也不会把 rejection 变成未处理异常。`Promise.resolve` 还使普通值与 thenable 走同一条路径：

```ts
type Settled<T> =
  | { status: "fulfilled"; value: T }
  | { status: "rejected"; reason: unknown };

async function settleInOrder<T>(items: Iterable<T | PromiseLike<T>>): Promise<Settled<T>[]> {
  return Promise.all([...items].map(async (item): Promise<Settled<T>> => {
    try {
      return { status: "fulfilled", value: await item };
    } catch (reason) {
      return { status: "rejected", reason };
    }
  }));
}
```

把 `[slowSuccess, fastFailure, fastSuccess]` 传入后，断言第 0 项仍是 `fulfilled`、第 1 项是 `rejected`，而不是按完成时刻排序；再传空 iterable，断言异步得到空数组。反例：把每项的 `catch` 删掉，`Promise.all` 会在第一个拒绝处提前拒绝，既不满足全量报告，也可能把后续错误留给调用者处理。搜索 fixture 则另外断言：旧请求即使底层无法立刻取消，因序号不匹配也不得调用任何“写入当前搜索结果”的函数。

## TS-06

最后以真实调用者的编译输出和运行日志作为验收证据。

补充场景：组件库的选择器既可接收单个项目也可接收数组时，只有返回类型确实随输入形状变化才使用重载；否则使用判别联合参数。验证应包括取消、拒绝和空数组，确保错误不会被回调参数的双变性吞掉。

定义：函数签名是调用者与实现者的输入输出契约；机制/流程是按重载选择调用视图、由实现覆盖全部分支、再检查回调的替换安全。适用场景为少量形状决定返回值的 API。边界是方法双变性、过窄回调和可选布尔组合；验证需同时有编译反例、运行 fixture 与回归测试。

函数类型的安全性由“调用者能够传入什么”和“调用者能够得到什么”决定。对可替换的回调，参数通常需要能接受更宽的输入（逆变方向），返回值则需要提供更窄或相同的输出（协变方向）。TypeScript 为了兼容既有 JavaScript，在方法参数上存在双变性等折中；这不是业务 API 可以忽略的风险提示。

重载用于“输入形状决定输出形状且调用方需要精确结果”的少数情况；若调用方只是从多个输入中选一个，优先使用联合参数和可判别结果。实现签名必须能处理每个公开重载，不能用 `any` 把不可能状态藏起来。面向消费者的组件 API 同理：把触发条件、回调参数、取消/错误结果写进公开类型；不要用多个相互冲突的可选布尔参数表达模式。

练习：为 `load(id: string): Promise<Item>` 与 `load(ids: string[]): Promise<Item[]>` 写两条重载及一个不使用 `any` 的实现；为 `onSelect` 设计能接收 `Item` 或其父类型的回调。验收：窄回调（只接收 `SpecialItem`）不能被注册到可能传入普通 `Item` 的位置；数组输入推断为数组输出；空数组、拒绝和取消在结果类型中可区分。

最小实现应把公开重载和宽于它们的实现签名分开，且把“取消/失败”建成结果而不是静默吞掉：

```ts
type Item = { id: string };
type LoadResult<T> = { ok: true; value: T } | { ok: false; kind: "cancelled" | "not-found" };

function load(id: string): Promise<LoadResult<Item>>;
function load(ids: readonly string[]): Promise<LoadResult<Item[]>>;
async function load(input: string | readonly string[]): Promise<LoadResult<Item | Item[]>> {
  if (Array.isArray(input) && input.length === 0) return { ok: true, value: [] };
  return { ok: false, kind: "not-found" }; // fixture 中替换为真实边界调用
}
```

验证时将 `const acceptsItem = (value: Item) => value.id` 赋给需要 `Item` 的回调应通过；只接受 `SpecialItem` 的回调在 `strictFunctionTypes` 下必须被拒绝。若 API 只是在 `string | string[]` 两种输入间选择、调用者不需要不同返回形状，就删除重载，改成一个联合参数和可判别结果；重载不是为“看起来精确”而存在。

## REACT-06

`useReducer` 把状态转换集中为纯函数：同样的旧状态和 action 必须得到同样的新状态，副作用放在事件处理、Effect 或数据层。Context 负责让子树读取某个值；Provider 的 value 身份变化会使使用该 Context 的消费者重新渲染。它不是自动选择器，也不是服务端缓存或跨页面事务系统。

做多步骤审核页时，先列状态（草稿、校验中、可提交、提交中、成功、失败）和允许的 action；reducer 对未知 action 或不允许转换应显式失败。在 Provider 边界只放确实跨越该子树、生命周期相近的状态；读写可拆成两个 Context，避免只读组件因 dispatch 身份或大对象变化被迫更新。外部 store、细粒度选择器与服务端缓存是另一个选型问题：本点只要求说明它们何时更合适，不要求假装 Context 能解决全部问题。

练习：实现 `submit` 在非“可提交”状态返回原状态并记录诊断的 reducer。验收：表驱动测试覆盖每个允许和拒绝转换；在 Profiler 中证明只读摘要组件不会因 dispatch-only 变化重渲；卸载后不得再分发异步回调的结果。

可复现状态表应同时驱动 reducer 与测试，而不是在组件分支和测试中复制规则。例如把允许转换写成 `const transitions = { draft: ["validate"], ready: ["submit"], submitting: ["resolve", "reject"] } as const`，reducer 先检查 `action.type` 是否在当前状态的允许集合中，再构造下一状态。对非法转换返回原状态时，必须携带可观测诊断（开发期抛错、测试回调或受控日志三选一），不能悄悄忽略；否则 UI 表面稳定却无法发现调用方违反了契约。

实验分两组：第一组给每个 `(state, action)` 对生成测试，断言允许对得到预期 next state、其余对被拒绝；第二组将 `dispatch` 放入独立的 `DispatchContext`，让只读摘要只订阅 `StateContext`。在同一交互脚本下比较拆分前后 Profiler 的摘要 render 次数，并保存“操作、提交编号、次数”表。若 Provider value 每次都新建对象，或把整个服务端缓存塞进 Context，实验结果不应被宣称为 Context 已优化。

## REACT-07

性能优化先测量：Profiler 的提交时间说明某次 React 渲染的成本，但不等同于用户交互延迟，也不证明浏览器布局、绘制或网络没有瓶颈。`memo` 只在 props 相等时跳过重渲；新的对象、数组和函数引用会使浅比较失败。`useMemo` 缓存计算结果，`useCallback` 缓存函数身份；它们本身有比较、内存和失效成本，不能作为“默认写法”。

大列表先减少工作量：稳定 key、避免在渲染中重复排序/格式化、按查询增量计算。若可视区域远小于总行数，再采用窗口化/虚拟化，只渲染视口和适量 overscan。虚拟化不是无代价：可访问性中的总数、焦点移动、动态行高、滚动定位和打印需要专门验证；短列表或频繁高度变化时可能不值得引入。

练习：给定 10,000 行聊天 fixture，记录输入过滤前后的 Profiler 提交次数、最大提交耗时和可见行数；只在测量定位到的瓶颈处优化。验收：同一机器、同一脚本、三次运行的中位数有改进或书面证明无需优化；键盘能把焦点移到虚拟化后新出现的项；删除 `memo` 后若指标不变，必须撤销该缓存。

测量记录至少固定：提交编号、交互脚本版本、数据量、查询词、Profiler `actualDuration`、浏览器 Performance 中的输入到绘制时间、是否发生 GC/网络活动和焦点结果。只凭一次 `actualDuration` 不能推出 30% 改善；同一脚本跑三次，分别报告中位数与离群值原因。优化后要执行一次“反证”实验：删除新增的 `memo`/`useMemo` 或关闭窗口化，若指标和交互无实质变化，就恢复更简单的实现；若变差，再保留优化并说明缓存失效和内存上限。

## REACT-10

定义：路由是 URL、历史与界面状态的契约；机制/流程是匹配地址、加载数据、处理导航结果并在失败边界恢复。适用场景为有深链、表单提交或数据刷新的 React 应用。边界是客户端守卫不是授权、旧导航结果不能覆盖新页；验证包含刷新、前进后退、取消和错误回归测试。

路由是 URL、浏览器历史和界面状态之间的契约。声明式路由解决匹配与导航；数据路由把路由模块的读取、写入、pending、错误和重验证组织为一次导航流程；框架模式再把代码分割、SSR、预渲染和部署约束放入同一运行时。选择取决于数据生命周期、渲染部署和团队控制权，而不是哪一种“功能更多”。

一次参数导航应按顺序验证：先匹配并解析/校验参数；路由层可以并行开始所需读取；界面显示本次导航的 pending；提交写操作后由数据层重验证受影响读取；若失败，在能独立恢复的最近边界展示错误。新导航必须使旧导航的结果失去提交资格，未保存表单离开前必须确认或阻止。客户端隐藏菜单只能改善体验，不能取代服务端授权。

练习：以产品/订单 fixture 建立 `/products/:id` 和 `/orders/:id/edit`，其中无效 id 输出 404、加载失败输出局部错误、保存成功后重验证详情、离开未保存编辑页先确认。验收：深链刷新、前进后退、快速从 `1` 到 `2`、重复提交和取消导航均有自动化断言；网络 trace 证明旧请求不会覆盖新页面；模式选型文档列出一项回滚触发条件。

框架模式还要把编译与服务端边界放进路由设计。React Compiler 只能在规则满足、构建工具已接入时优化组件渲染；它不会修复不纯渲染、错误的数据缓存、慢接口或错误授权。先保留能说明意图的 API，再用相同交互脚本比较编译器启用前后提交次数和耗时；若无可复现收益，不以删除全部 `memo` 作为目标。反例是把“已启用编译器”当作性能验收，或为迎合缓存而让路由 loader 返回可变全局对象。

服务端组件（RSC）和 Server Function 的序列化边界也不是信任边界。服务器可以把允许序列化的值传给客户端，但每个写入请求仍要在服务端重新鉴权、校验参数、限制副作用和记录关联 ID；不能把客户端路由守卫、隐藏按钮或组件名称当作权限控制。例子：订单编辑页可在服务端读取订单摘要，却必须在提交动作中再次核对当前用户是否拥有该订单；反例是只凭页面已加载就接受任意订单 ID。升级 React、路由器或编译器时，先在一个可回滚路由切片验证构建、SSR/hydration、序列化失败、403/404、错误边界和未保存表单，再扩大范围。验收记录至少包含版本、输入、预期输出、网络/渲染证据和回滚触发条件。

## REACT-08

定义：错误边界是在子树渲染出错时隔离并替换该子树的恢复 UI；Suspense 是组件在渲染期间等待 React 已知异步资源时展示 fallback 的边界。机制不是“所有 Promise 自动被接住”：渲染时由 `lazy`、`use` 或框架缓存读取抛出的 pending Promise 才会被最近 Suspense 处理；渲染错误由 Error Boundary 处理。事件处理器、定时器、普通 `useEffect` 回调和任意 `fetch()` 的 rejection 不会自动进入这两类边界，必须在其调用路径显式捕获并转换为状态。

适用场景是可以局部恢复的详情、侧栏或数据卡片：每个区域分别呈现 loading、empty、forbidden、error、partial 与 ready，避免一个页面的次要推荐列表失败就抹掉编辑中的表单。不要为每个很小组件包一个边界（会让恢复入口和观测碎片化），也不要只放一个全屏边界（会扩大故障半径）。错误边界的 reset key 或 retry 回调只能重试该数据域；无关的草稿状态应保留在边界外或由受控输入持有。写操作失败要区分“请求未送达”“服务器拒绝”“可能已提交但响应丢失”，最后一种不能自动重复提交。

下面的 fixture 用受控资源模拟三条渲染期路径：`read()` 返回值代表 ready、抛 Promise 代表 pending、抛 Error 代表失败。它只用于测试 Suspense/边界协议，生产中应换为框架或数据层支持的缓存，而不是从 Effect 里现造 Promise。

```tsx
type Entry<T> = { state: "pending"; promise: Promise<void> } | { state: "ready"; value: T } | { state: "error"; error: Error };
function readEntry<T>(entry: Entry<T>): T {
  if (entry.state === "pending") throw entry.promise;
  if (entry.state === "error") throw entry.error;
  return entry.value;
}

class CardBoundary extends React.Component<{ resetKey: string; onRetry(): void; children: React.ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidUpdate(prev: Readonly<{ resetKey: string }>) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  render() {
    return this.state.error
      ? <button onClick={this.props.onRetry}>重新加载此卡片</button>
      : this.props.children;
  }
}
```

实验使用订单详情、审计日志和仍可编辑的备注框。先让审计日志 `readEntry` 抛 pending Promise，断言只有日志显示 skeleton；改为抛 Error，断言只显示日志重试按钮且备注值不变；让 `fetch` 在 Effect 中拒绝，断言错误先被 `catch` 映射到普通 error state，而不是错误地期待 Suspense 显示 fallback。再分别注入 403、空数组、两张卡片中一张失败、取消导航和连续三次 retry，记录每次的请求 ID、边界名称、用户可见状态和提交次数。无限 retry、在 fallback 内发起新的同一请求、或通过重置整页 key 清空草稿，都是必须失败的反例。

恢复 UI 也需要测量，但性能优化不是本点的默认目标。为 `onRetry` 使用 `useCallback`、为纯错误展示组件使用 `memo`、为昂贵且确定的错误摘要使用 `useMemo` 前，先在同一错误—重试脚本下用 Profiler 记录提交次数与 `actualDuration`；然后分别删除三个优化，若中位数、焦点和请求次数没有变好，就撤销这些缓存。验收同时检查 retry 按钮在 reset 后仍可聚焦、旧 promise 兑现不会覆盖新请求、日志不暴露敏感 cause；这样 `memo`/`useMemo`/`useCallback` 是可反证的恢复体验证据，而不是掩盖错误状态设计的装饰。

## REACT-09

**定义与当前基线。** 本点把三类经常被混写的事情分开：React 19.2 是运行时与 DOM 能力基线，React Compiler 1.0 是稳定的编译期优化工具，React Server Components（RSC）与 Server Functions 则是由框架和打包器承载的服务端协议边界。Compiler 已稳定不代表所有组件都必然变快；RSC 能在服务端执行也不代表客户端输入已经可信。安全结论必须以实施时最新的 React 官方公告和所用框架公告为准，不能停留在首次修复版本。2025 年 12 月的 RSC 远程代码执行公告之后，又出现拒绝服务与源码暴露的跟进修复，且早期补丁并不完整，因此“曾经升级过”不能替代当前依赖树核验。

**机制与使用条件。** Compiler 在构建期分析符合 Rules of React 的组件与 Hook，生成缓存边界并由 lint/构建诊断提示无法安全优化的位置；它不会修复渲染副作用、错误 key、陈旧闭包、慢网络或服务端授权。采用时先固定 React、编译器、lint 插件、框架与构建插件版本，在一个可回滚路由切片记录启用前后的 React Performance Tracks、交互结果与构建日志。`Activity` 负责隐藏或恢复一棵 UI 子树并调整 Effect 生命周期，`useEffectEvent` 只用于 Effect 内的事件语义，不能拿来绕过依赖规则；`cacheSignal`、部分预渲染与 resume API 还受 RSC/框架支持约束，不能在普通客户端组件中假定可用。

**服务端信任边界。** Server Component 可以读取服务端数据，Server Function 可以接收客户端序列化参数，但每一次读取和写入仍要以当前会话重新鉴权、校验资源归属、限制副作用并记录关联 ID。客户端传入的 `role`、`userId`、资源 ID、组件是否成功渲染或按钮是否隐藏都不是授权证据。依赖核验要检查实际安装的 `react-server-dom-webpack`、`react-server-dom-parcel` 或 `react-server-dom-turbopack` 及框架锁文件，而不是只看顶层 `react` 版本；发现受影响版本时升级到当前受支持分支的最新补丁，并以供应链扫描和生产构建复核，不把托管商临时缓解当作长期修复。

**可复现实验与反例。** 固定一个 1,000 行列表、一个依赖不完整的手工 `memo`、一个带 `Activity` 的编辑面板，以及接收 `{ role: "admin", userId: "u2" }` 的 Server Function。先在相同脚本下记录 Compiler 关闭/开启的构建结果、提交次数和交互断言，再删除手工 `memo` 做反证；若行为回归或没有稳定收益，应缩小启用范围而不是为通过检查关闭 lint。服务端夹具把真实会话固定为 viewer，断言伪造 admin 被拒绝，并保存请求 ID、会话主体、授权决定和依赖版本清单。再注入旧 RSC 补丁、恶意超大/循环输入和可能暴露函数源码的字符串化路径，验证请求限额、超时/隔离、日志脱敏与升级闸门。否决反例包括：只改 `package.json` 不核锁文件、把“构建成功”当性能证据、把 Server Component 当授权边界、或继续使用官方已说明不完整的早期补丁。

## SEC-05

定义：Web Crypto 提供浏览器中的密码原语和 `CryptoKey` 句柄，不提供“前端天然可信”的业务安全。AES-GCM 是带认证的对称加密：同一密钥下每次加密必须使用新的 IV/nonce，解密会同时验证密文与可选的附加认证数据（AAD）。适用场景是明确威胁模型下的本地数据保护、端到端协议的一部分或对服务端签名的验证；不适用于把混淆当加密、在 XSS 已失守的同一页面保护密钥，或替代服务端授权、KMS/HSM、备份与撤销。

`CryptoKey` 的 `algorithm`、`type`、`extractable` 与 `usages` 是契约的一部分。加密数据的 key 应只给 `encrypt`/`decrypt`；验证公钥只给 `verify`；不要生成一个同时能 sign、verify、encrypt、decrypt 的万能 key。`extractable: false` 会拒绝 `exportKey`，但不等于密钥在被 XSS 控制的页面里不可被调用，也不等于它自动拥有安全的跨设备恢复方案。导入 JWK/raw/PKCS#8/SPKI 前必须记录来源、算法、用途和 key version；把一个用途或算法不同的字节硬塞给 `importKey`，即使偶尔能运行，也是在破坏生命周期边界。

下面的浏览器安全上下文 fixture 使用 96-bit 随机 IV、不可导出的 AES-GCM key 和 AAD 绑定记录身份/版本。每次加密都重新生成 IV；持久化信封必须同时保存 `keyVersion`、`iv`、`ciphertext` 和 AAD 的可重建输入，绝不能只保存密文或复用固定 IV。

```ts
const utf8 = new TextEncoder();
const key = await crypto.subtle.generateKey(
  { name: "AES-GCM", length: 256 },
  false,
  ["encrypt", "decrypt"],
);
const iv = crypto.getRandomValues(new Uint8Array(12));
const aad = utf8.encode("note:rvw_42:v3");
const ciphertext = await crypto.subtle.encrypt(
  { name: "AES-GCM", iv, additionalData: aad, tagLength: 128 },
  key,
  utf8.encode("confidential draft"),
);
await crypto.subtle.exportKey("raw", key); // 预期拒绝：extractable 为 false
```

实验先在 HTTPS/`isSecureContext === true` 的浏览器中运行；在不安全上下文里 API 缺失或调用失败应被明确展示为“不支持”，而不是静默降级到明文。解密成功后分别翻转一位 ciphertext、替换 AAD、重用已记录的 IV 和使用错误 version 的 key，前三者均应拒绝且不得把部分明文提交给 UI；IV 重用检测至少在 fixture 中维护每个 key version 的已用 IV 集合。再尝试导出该 key，断言拒绝；另生成 `extractable: true` 的迁移 key，仅在受控迁移测试里导出并立即销毁字节副本，不能把它作为日常存储方案。

轮换是数据迁移协议：服务端或受控密钥域发布 `v4` 后，新写入用 v4；读取旧 v3 信封时先用其标记的 key 解密、验证 AAD，再在可恢复的后台步骤重加密为 v4；任何一步失败都保留原信封并记录关联 ID，不能删除旧数据或假设“新 key 一定能解开”。撤销/设备丢失/登出分别意味着停止新用、移除本地 key handle 与服务端拒绝对应凭证；它们不是仅清空一个 JavaScript 变量。证据至少包含 key version、算法参数、IV 长度、key usages、导入/导出结果、篡改失败、轮换前后可读性和失败原因。

反例包括：把 password 字符串直接当 AES key、重用全零 IV、为了备份把生产私钥设为 `extractable: true`、把 Base64 当加密、只靠客户端“加密成功”决定服务器接受数据，或把 error.message 与密文/密钥材料写进日志。最后以威胁模型复核：若攻击者能执行同源脚本，他通常也能调用可用的 `CryptoKey` 和读取明文；浏览器加密只能缩小特定存储/传输暴露面，不能修复 XSS、错误授权或服务端密钥治理。
