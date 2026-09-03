# TypeScript 知识点讲义

## TS-06 函数、重载、协变逆变与组件 API

函数类型不仅描述参数和返回值，还决定一个实现能否安全替换另一个。组件把回调交给消费者时，参数过窄可能在运行时崩溃；重载过多又可能让实现与声明分叉。本讲从调用签名、可选参数和重载出发，建立协变、逆变与双变的替换模型，最终落到框架无关的组件 API 设计。

### 学习前先确认

- 直接前置：[TS-03 泛型、约束、`keyof` 与索引访问](../chinese-guides/ts-03-generics-constraints-keyof-indexed-access.md#ts-03)。函数与联合基础由它递归链接；条件类型不是本讲硬前置。

### 一、函数类型描述调用合同

```ts
type Formatter = (value: number, locale?: string) => string;
```

参数是调用方可提供的输入，返回值是实现承诺的输出。函数实现必须能处理合同允许的每次调用，调用者只能依赖公开签名，不能依赖内部更宽实现。

TypeScript 按结构比较函数。参数名称不影响兼容，参数类型、个数、可选性、this 与返回值才影响。

### 二、可选参数表示调用者可以省略

`locale?: string` 意味着调用者可以不传，函数体必须处理 undefined。它不等于“实现总会收到一个字符串但我暂时不关心”。

回调参数尤其容易误写可选：

```ts
function visit(callback: (value: string, index?: number) => void) {}
```

这承诺 visit 可能只传 value，callback 必须处理 index 缺失。若实现总传 index，应写必需参数；消费者仍可用只声明 value 的函数，因为忽略额外参数通常安全。

### 三、剩余参数与元组保存调用形状

rest parameter 可用 tuple 表达有限变体：

```ts
type LogArgs =
  | [message: string]
  | [message: string, context: Record<string, unknown>];

function log(...args: LogArgs) {}
```

标记元组提高提示。可变长 tuple 适合装饰器和函数组合，但多层拼接会让错误复杂。公开 API 若只有两三种清晰调用，重载可能更友好。

### 四、重载把多个调用表面连接到一个实现

```ts
function load(id: string): User;
function load(ids: readonly string[]): User[];
function load(input: string | readonly string[]): User | User[] {
  return Array.isArray(input) ? input.map(readUser) : readUser(input);
}
```

前面是 overload signatures，最后是 implementation signature。调用者只看到重载，implementation 必须足够宽并在运行时正确分支。实现签名不是给用户的额外调用入口。

测试每个重载的静态结果与运行时结果，防止声明承诺数组、实现却返回单对象。

### 五、重载顺序从具体到一般

编译器按重载集合解析，过宽签名放前可能吞掉更精确情况。先列字面量/具体，再列一般。最后一个 catch-all 会让错误更少但可能丢推断。

不要用几十条重载枚举参数组合。可变 tuple、泛型映射或 options object 可能更清楚。重载也不适合用 boolean 标志决定完全不同返回，判别 options 或不同函数名可读性更好。

### 六、联合参数与重载解决不同问题

联合参数表示函数体和调用者都面对同一个联合结果：

```ts
function normalize(value: string | number): string;
```

若输入输出存在精确关联，重载或泛型能保留。若两种输入最后都返回 string，联合足够。选择标准是调用合同，不是语法偏好。

实现内部常用联合，即使外部是重载。分支必须穷尽并对非法运行时输入失败，类型声明不能防 JavaScript 消费者。

### 七、this 参数只参与类型检查

函数可声明伪参数 `this: HTMLElement`，要求调用上下文：

```ts
function handle(this: HTMLButtonElement, event: MouseEvent) {}
```

this parameter 不生成 JS，也不计入参数长度。箭头函数没有动态 this，不适合需要宿主 this 的回调。DOM API、事件与 legacy 库绑定规则要与运行时一致。

更现代的组件 API 通常显式传对象，减少 this 依赖。若公开 this 合同，测试脱离调用与 bind 行为。

### 八、协变描述输出可更具体

**协变（Covariance）**可用返回值理解：要求 `() => Animal` 的位置，可以接受 `() => Dog`，因为调用者只会得到至少是 Animal 的值。反过来不安全，承诺 Dog 却可能返回普通 Animal。

容器只读位置常协变；可写容器同时消费与产生值，单纯协变会不安全。TypeScript 的结构系统和历史兼容会影响具体结果，不能把数学术语机械套到所有泛型。

### 九、逆变描述输入必须更宽

**逆变（Contravariance）**可用回调参数理解：组件承诺会给回调任意 Animal，安全处理器必须接受 Animal 或更宽 unknown；只接受 Dog 的函数不能替换，因为组件可能传 Cat。

```ts
type Consumer = (value: Animal) => void;
const animalConsumer: Consumer = value => console.log(value.name);
// 只接受 Dog 的函数不能安全放这里
```

在 `strictFunctionTypes` 下，函数属性参数通常按更安全规则检查。开启 strict 是理解组件回调的基础。

### 十、方法语法可能保留双变性

为兼容常见类与 DOM 模式，method syntax 的参数在一些位置表现为 bivariance，既允许更宽也允许更窄。`onSelect(user: User): void` 可能比 `onSelect: (user: User)=>void` 宽松。

面向消费者的 props 回调优先函数属性，避免过窄处理器悄悄通过。框架类型有时使用 bivariant hack 改善人体工程学，阅读定义时要知道安全与兼容的权衡。

双变性不是“TypeScript 坏了”，而是历史实用选择；高风险业务可用更严格包装和运行时验证。

### 十一、strictFunctionTypes 仍有边界

它主要影响函数参数可赋值，method/constructor、any、断言和泛型相关位置仍可能宽松。启用后也不能证明回调永不抛错或不产生副作用。

类型测试要用真实 props 赋值与调用，而不只比较两个别名。不要用 `as SelectProps` 绕过过窄错误。

### 十二、返回 void 有特殊兼容语义

期望返回 void 的回调可以接收实际返回某值的函数，调用方会忽略结果。这使 `array.forEach(x => list.push(x))` 合法。它不表示函数运行时真的返回 undefined。

async 函数返回 Promise，传给期望 void 的事件回调时，未处理 rejection 可能丢失。使用明确 wrapper 捕获错误：

```ts
button.onclick = () => { void save().catch(reportError); };
```

lint 规则可检测 misused promises。组件应说明是否等待回调、如何处理失败和取消。

### 十三、回调的错误与取消属于合同

`onSubmit: () => Promise<void>` 意味着组件是否 await、重复点击如何处理、拒绝如何呈现必须明确。更稳健可返回判别结果或接收 AbortSignal。

```ts
type SaveResult = { ok: true } | { ok: false; code: 'CONFLICT'|'OFFLINE' };
type OnSave = (draft: Draft, options: { signal: AbortSignal }) => Promise<SaveResult>;
```

异常用于意外失败，业务拒绝用稳定结果，组件不解析 error.message。卸载/取代时 signal 取消，迟到结果仍检查 operation ID。

### 十四、事件回调与命令返回的所有权不同

`onChange` 通常是通知：状态已发生，消费者不能通过返回 false 取消。`beforeChange`/`onRequestChange` 表示意图，可返回决定。把两者混在一个 callback 会让所有权模糊。

组件 API 写清 controlled/uncontrolled、当前值、默认值、事件时机和重复。回调 detail 使用领域类型，不暴露内部 DOM event 除非消费者确实需要平台信息。

### 十五、组件泛型应从数据推断

表格 `Table<Row>` 的 columns 与 onSelect 应共享 Row。让 rows 推断 Row，列 key 与 formatter 保持 `K -> Row[K]` 关系。若消费者每次都要手填四个类型参数，API 过度抽象。

React JSX、Vue 模板和 TSX 的泛型推断限制随工具版本变化。核心模型可在普通 TypeScript 函数/对象中验证，框架包装保留尽量少的类型层。

### 十六、判别 props 表达互斥模式

受控与非受控组件不应允许 `value`、`defaultValue`、`onChange` 任意组合：

```ts
type Controlled = { mode: 'controlled'; value: string; onChange: (v:string)=>void };
type Uncontrolled = { mode: 'uncontrolled'; defaultValue?: string; onChange?: (v:string)=>void };
type Props = Controlled | Uncontrolled;
```

判别联合让非法组合在调用处失败，也让实现收窄。XOR 工具类型可能更短，但显式模式通常错误更清楚。

### 十七、Ref 与 imperative handle 要最小化

组件公开 ref 方法时，只暴露稳定命令如 focus、reset，不暴露整个内部实例或 DOM 树。方法的同步/异步、前置状态和失败要定义。

能通过 props/state 完成的行为不要额外加 imperative API。跨框架 Web Component 则把 method 作为 DOM 合同，仍需版本与类型声明。

### 十八、函数重载与声明输出是公共 ABI

库的 `.d.ts` 保存 overload order、泛型默认和回调方差。一次“只重构类型”可能改变消费者推断或允许集合，属于潜在破坏性变更。

发布前对旧/新 TypeScript 版本运行类型测试，检查 declaration diff。不要让实现用 any 后自动生成过宽声明；显式公共签名和最小导出。

### 十九、运行时边界仍接收 JavaScript

TypeScript 消费者也可能通过 any、旧声明或运行时 JSON 传错。组件对数值范围、对象存在和外部消息做运行时校验，给出稳定错误或回退。

类型保证的是已检查代码关系，不是权限或数据真实性。回调调用前仍处理卸载、异常、并发和用户输入。

### 二十、验证替换安全和推断

类型测试证明：具体重载得到具体返回；非法组合失败；过窄回调失败；更宽回调通过；async rejection 被处理；泛型从 rows 推断。运行时测试每个 overload branch、取消、重复操作和错误 UI。

用 `@ts-expect-error` 保存反例，不用注释掉。编译器升级后读每个差异，避免宽松变化悄悄扩大公共 API。

### 二十一、何时拆成不同函数名

如果不同输入有不同权限、副作用、错误和返回生命周期，两个明确函数通常比重载更好，例如 `loadUser` 与 `loadUsers`。重载适合同一概念的自然调用形状，不应用来隐藏完全不同业务。

API 评审关注用户能否从名称与提示理解调用，而不是声明是否“高级”。

### 学完后应能说明

你应能解释函数参数与返回合同、可选参数、rest tuple、重载和联合的取舍；能用协变、逆变和双变判断回调替换安全，理解 strictFunctionTypes 与 void/async 边界；还能设计所有权明确、可取消、可推断、声明稳定的组件 API，并以静态反例和运行时测试共同验证。

