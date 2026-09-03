# TypeScript 知识点讲义

## TS-05 条件类型、`infer` 与分布式行为

条件类型让类型系统根据结构关系选择结果，`infer` 能从匹配位置提取内部类型。这些能力支撑 Awaited、ReturnType、框架 props 与协议适配，也最容易制造“看起来神奇、没人敢改”的类型。掌握它们要从集合与代入理解分布，明确 `any`、`never`、递归和重载边界，并用类型测试保存可解释证据。

### 学习前先确认

- 直接前置：[TS-03 泛型、约束、`keyof` 与索引访问](../chinese-guides/ts-03-generics-constraints-keyof-indexed-access.md#ts-03)。本讲直接使用类型参数、约束和联合，映射类型不是理解条件类型的硬前置。

### 一、条件类型在类型层选择分支

**条件类型（Conditional Type）**写作 `T extends U ? X : Y`。这里的 extends 是可赋值/结构兼容判断，不是运行时 if，也不只表示 class 继承。

一个最小示例是 `type ElementOf<T> = T extends readonly (infer U)[] ? U : T`：输入 `string[]` 得到 `string`，输入 `Date` 保留 `Date`。把每次代入的检查类型、约束和真假分支写成推导表，能比只看编辑器悬浮结果更早发现方向写反。

```ts
type IsString<T> = T extends string ? true : false;
type A = IsString<'x'>; // true
type B = IsString<number>; // false
```

编译器代入具体 T 后化简。若 T 仍是未决泛型，结果可能延迟到调用处。条件类型不会生成 JavaScript，运行时仍要执行真实分支。

### 二、extends 判断方向很重要

`T extends U` 问“T 是否可赋给 U”，不是相等。字面量 `'x'` extends string 为真，string extends `'x'` 为假。对象含额外属性通常仍可赋给较小结构，因此“是否精确等于某对象”不能直接写 extends。

```ts
type HasId<T> = T extends { id: unknown } ? true : false;
```

它判断最低能力，适合选择可读 id 的分支。若需要双向相等，类型测试常用函数技巧，但对 any、never、联合仍需谨慎。

### 三、infer 在匹配位置声明待提取类型

**类型推断占位（infer）**只出现在条件类型 extends 右侧的模式中：

```ts
type ElementOf<T> = T extends readonly (infer Item)[] ? Item : never;
type ResultOf<T> = T extends (...args: any[]) => infer R ? R : never;
type Fulfilled<T> = T extends PromiseLike<infer V> ? V : T;
```

infer 不是“猜一切”，而是告诉编译器把匹配位置绑定为新类型变量。没有匹配就走 false 分支。提取后仍可继续约束或递归。

### 四、同一模式可以有多个 infer

函数参数和结果可同时提取：

```ts
type Signature<T> = T extends (...args: infer P) => infer R
  ? { params: P; result: R }
  : never;
```

元组模式可提取首尾，模板字面量可拆字符串。多个候选位置如何合并取决于方差和上下文，不应靠记忆猜结果；为公共工具写最小类型测试。

复杂模式若只为缩短一行，显式泛型参数可能更清楚。infer 应提取调用者已经拥有的结构，不负责证明运行时对象真实符合。

### 五、裸类型参数会对联合分布

当检查位置是“裸”的类型参数 `T`，`T extends U ? X : Y` 遇到联合 A|B 时，会分别计算每个成员再合并。这叫 **分布式条件类型（Distributive Conditional Type）**。

```ts
type ToArray<T> = T extends unknown ? T[] : never;
type Each = ToArray<string | number>; // string[] | number[]
```

可以把联合想成集合：map 每个成员。它不是先判断整个联合是否 extends U。分布常用于过滤和转换联合，也是许多意外的来源。

### 六、元组包裹会关闭分布

把两边包成单元素元组，使检查位置不再是裸 T：

```ts
type ToArrayWhole<T> = [T] extends [unknown] ? T[] : never;
type Whole = ToArrayWhole<string | number>; // (string | number)[]
```

`[T] extends [U]` 用于整体判断，不是运行时数组。选择分布或整体先写出期望集合：要分别过滤联合成员，使用分布；要判断所有成员整体满足，关闭分布。

### 七、Exclude 与 Extract 是分布过滤

`Exclude<T,U>` 本质近似 `T extends U ? never : T`，匹配成员变 never 后从联合消失；Extract 相反。NonNullable 也过滤 null/undefined。

```ts
type Events = 'click' | 'input' | null;
type DomEvent = Exclude<Events, null>; // 'click' | 'input'
```

它们只在类型层过滤。外部输入仍可能是 null，必须运行时检查。对对象联合按结构过滤时，宽成员可能意外匹配，最好使用稳定判别字段。

### 八、never 是空联合

never 表示不可能的值，也可以看作零个成员的联合。分布式条件收到 never 时没有成员可计算，结果仍是 never，而不是进入 true 分支。

```ts
type IsNeverBad<T> = T extends never ? true : false; // T=never 得 never
type IsNever<T> = [T] extends [never] ? true : false;
```

never 在穷尽检查和过滤中有价值。不要把它当运行时异常类型，也不要用任意断言把实际可能值塞进 never。

### 九、any 会让证明失效

any 同时允许几乎所有赋值并逃过检查，条件类型遇到 any 常得到联合分支或 any 污染。外部边界用 unknown，要求先收窄；公共工具可以选择拒绝 any，但检测技巧本身复杂且不总值得。

如果一个高级类型只有在输入不是 any 时可靠，文档和 lint 要防止 any 进入。用 `as any` 让类型测试通过不算修复。

### 十、unknown 与 never 位于集合两端

unknown 是所有值的安全超类型，使用前必须证明；never 是没有值。大多数 T extends unknown 为真并可触发分布，unknown extends T 则只有 T 足够宽时成立。

设计 fallback 时，返回 unknown 通常比 any 安全；过滤无匹配成员返回 never 能在后续暴露错误。但 API 对用户输入解析失败应有运行时 Result/Error，不是只让类型变 never。

### 十一、递归条件类型逐层解包

Awaited 风格类型要处理 PromiseLike 嵌套、null/undefined 与 thenable，而不是只解一层 Promise。

```ts
type UnwrapPromise<T> = T extends PromiseLike<infer V>
  ? UnwrapPromise<V>
  : T;
```

真实内置 Awaited 有更完整边界。递归必须有收敛基例；自引用、过深数据和大联合会触发实例化过深或性能问题。能用内置类型就不重写。

### 十二、递归深度可显式计数

深路径、JSON 转换等工具可携带 tuple 计数，到达上限返回保守类型。上限是工程策略，不是领域真理。

```ts
type DeepValue<T, Depth extends unknown[] = []> =
  Depth['length'] extends 5 ? unknown :
  T extends readonly (infer U)[] ? DeepValue<U, [...Depth, 0]> : T;
```

过深时返回 unknown 比 any 安全，也比编译器崩溃好。若业务确实需要任意深结构，运行时 schema 与显式模型往往更合适。

### 十三、函数重载的提取有最后签名边界

对 overloaded function 使用 ReturnType/Parameters，条件推断通常基于最后一个、最宽的签名，不能把所有重载关联自动恢复为完美联合。重载是调用检查表面，不是普通函数联合。

需要保留每个输入输出关系时，显式定义签名联合、tagged request map 或由 schema 单一来源生成。不要依赖 `infer` 从已丢失的信息还原。

### 十四、函数参数位置涉及方差

从协变输出位置推断的多个候选倾向形成联合，从逆变输入位置可能形成交叉等更复杂结果。此类技巧容易受编译器版本和上下文影响。

公共业务 API 不应以“方差魔法”作为唯一可读实现。先在 TS-06 理解函数替换安全，再决定是否需要提取参数交集。

### 十五、模板字面量也能使用 infer

```ts
type RouteParam<S> = S extends `${string}:${infer Param}/${infer Rest}`
  ? Param | RouteParam<Rest>
  : S extends `${string}:${infer Param}` ? Param : never;
```

它可从小型路由字面量提取参数，但真实 URL 有可选段、编码、通配与查询时，类型解析器会变复杂。运行时路由库才是解析真源；类型只应与其配置共同生成。

### 十六、条件类型适合关系，不适合业务流程

适合：从 Promise、函数、数组或 tagged union 提取部分；按稳定结构过滤联合；根据泛型标志关联返回类型。不适合：代替运行时权限、把十几个业务状态压成递归条件、解析任意 JSON。

条件返回 API 可能让函数体大量断言，因为实现参数 T 无法在普通分支中充分收窄。此时重载或判别结果更清楚。

### 十七、NoInfer 控制推断来源

有时一个类型参数应由首个参数决定，另一个参数只验证、不反向拓宽。内置 NoInfer 可阻止某个位置成为推断候选。

```ts
function choose<C extends string>(choices: readonly C[], initial: NoInfer<C>): C;
```

它是 API 推断调节器，不是修复错误模型。若用户必须理解多处 NoInfer 才能调用，考虑拆参数或显式类型。

### 十八、类型级解析要限制输入规模

复杂字符串、元组递归和联合组合会显著增加检查时间。公共库遇到任意 string 时应快速退回 string/unknown，不尝试无限拆分。中间别名和小联合能减少重复实例化。

用 extendedDiagnostics、trace 与实际编辑器延迟判断，而不是只看代码字符数。一个 8 行递归类型可能比 50 行显式联合更昂贵。

### 十九、类型测试覆盖分布与边界值

至少验证单成员、联合、never、unknown、any、readonly tuple、可选参数、重载和递归深度。使用 Equal/Expect、tsd 或仓库现有类型测试，保存预期通过与 `@ts-expect-error`。

编译器升级后先看类型断言差异，再判断是 bug 修复、推断变化还是自己的未定义假设。不要批量更新快照而不读结果。

### 二十、可读 API 优先于最大推导

给工具起表示业务关系的名字，文档说明是否分布、遇到 never/any 的结果和深度上限。错误信息过长时在公共边界 materialize 成命名类型。

如果明确的 `Success | Failure`、两个重载或一张 request map 已足够，不要用四层 infer 追求“零重复”。高级能力的价值是消除真实不一致，不是展示编译器技巧。

评审公共条件类型时，还要让调用者看到失败分支：如果不匹配后得到 `never`，它究竟表示应被过滤，还是悄悄吞掉了一个本该报错的输入？可在公共入口先约束泛型，在内部再做分布转换，并为可接受、不可接受和联合混合三类输入分别保存类型断言。这样，类型工具表达的是明确合同，而不是依赖偶然推断结果。

公共条件类型发布前还要在仓库支持的最低与最高 TypeScript 版本运行。推断细节、性能和错误文本可能演进；如果 API 依赖未承诺的微妙候选合并，应简化模型或固定编译器范围，而不是把所有升级差异推给消费者。

### 学完后应能说明

你应能解释条件类型的可赋值判断、infer 的模式提取、裸类型参数为何对联合分布、元组包裹如何整体判断，以及 never/unknown/any 的特殊行为；能处理递归、重载、方差与性能边界，并用类型测试决定何时使用条件类型、何时改为显式联合或重载。
