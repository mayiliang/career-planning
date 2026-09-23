# TypeScript 知识点讲义

## TS-05 条件类型、infer 与分布式行为

一个资料加载器有时直接返回标题，有时返回装着标题的 Promise。你想写一个类型工具，回答“加载结束后，拿到的是什么”。难点在于：输入可能是联合，可能根本没有候选，也可能不是 Promise。

本讲从这个问题出发。先逐项代入，再读 infer，最后处理递归和推断边界。每段 TypeScript 示例都可单独运行。类型在编译后会消失，因此我们用合法赋值、预期类型错误和实际输出共同说明结果。校验基线为 TypeScript 5.7.2，开启严格模式、索引缺失检查和精确可选属性。

### 学习前先确认

- 直接前置：[TS-03 泛型、约束、keyof 与索引访问](../chinese-guides/ts-03-generics-constraints-keyof-indexed-access.md#ts-03)。需要能读懂“把 T 换成具体类型”，以及约束允许函数依赖什么能力。

读完应能展开一个条件类型，说明联合为何被拆开，并为正常输入和边界输入写出结果。遇到长表达式时，先给中间步骤命名，不必一次读完。

### 一、extends 问的是能否赋值，方向不能倒过来

**条件类型（Conditional Type）**写作 `T extends U ? X : Y`，可以读作：“T 的值能否用在要求 U 的位置？能就选择 X，否则选择 Y。”

这里不是判断类型相等，也不是要求出现类继承。字面量 `'标题'` 比 string 更具体，可以交给需要字符串的位置；普通字符串却不能保证恰好是“标题”。

```ts example=ts05-direction
type IsText<T> = T extends string ? true : false;
type BroadFitsLiteral = string extends '标题' ? true : false;

const literal: IsText<'标题'> = true;
const number: IsText<number> = false;
const reverse: BroadFitsLiteral = false;
console.log(literal, number, reverse); // => true false false
```

| 代入 | 实际问题 | 结果 |
| --- | --- | --- |
| `IsText<'标题'>` | 特定字符串能当字符串用吗 | true |
| `IsText<string>` | 字符串能当字符串用吗 | true |
| `IsText<number>` | 数字能当字符串用吗 | false |
| `string extends '标题'` | 任意字符串都等于这个标题吗 | false |

类型也可以只要求一部分字段。带 id、title 的资料对象通常能赋给只要求 id 的对象类型，因为接收方需要的能力都存在。这个方向和[泛型的约束](../chinese-guides/ts-03-generics-constraints-keyof-indexed-access.md#ts-03)一致。

### 二、约束决定能否传入，条件决定传入后的结果

把 `T extends { title: string }` 写在类型参数约束里，是让不符合要求的输入直接报错。写在条件表达式中，则允许其他输入，再自行选择回退结果。

```ts example=ts05-constraint-fallback
type RequiredTitle<T extends { title: string }> = T['title'];
type OptionalTitle<T> = T extends { title: infer V } ? V : never;

const title: RequiredTitle<{ title: '闭包' }> = '闭包';
const extracted: OptionalTitle<{ title: number }> = 12;
function rejected() {
  // @ts-expect-error 输入不满足约束
  type Invalid = RequiredTitle<{ id: number }>;
  // @ts-expect-error 未找到 title 时结果是 never，没有合法值
  const missing: OptionalTitle<{ id: number }> = '默认标题';
}
console.log(title, extracted); // => 闭包 12
```

OptionalTitle 只要求存在 title，没有要求它一定是字符串，所以数字也能被提取。工具名称和实现要保持一致；只接受字符串标题时，应增加相应约束。

失败分支也未必需要 never。返回 T 表示“不是目标形状就原样保留”；返回 unknown 表示“无法得知内容”；返回 never 表示“没有符合要求的候选”。例如过滤结果用 never 很自然，但一个兼容同步与异步结果的工具通常需要保留普通值。

### 三、infer 在匹配成功的位置给内部类型起名字

**infer** 可以读作“在这里取出一个待推断的类型”。它不创建运行时变量；只有匹配成功，真分支才能使用这个名字。

```ts example=ts05-patterns
type ElementOf<T> = T extends readonly (infer Item)[] ? Item : never;
type FirstOf<T> = T extends readonly [infer First, ...unknown[]] ? First : never;
type ParametersOf<T> = T extends (...args: infer Args) => unknown ? Args : never;
type ReturnOf<T> = T extends (...args: never[]) => infer Result ? Result : never;

const item: ElementOf<readonly ['标题', 7]> = 7;
const first: FirstOf<readonly ['标题', 7]> = '标题';
const args: ParametersOf<(id: number, quiet?: boolean) => string> = [3];
const result: ReturnOf<(id: number) => string> = '资料 3';
console.log(item, first, args.join(','), result); // => 7 标题 3 资料 3
```

数组元素模式得到“任意元素可能是什么”；非空元组模式得到“第一个固定位置是什么”。因此 `ElementOf<string[]>` 是 string，但 `FirstOf<string[]>` 是 never：普通数组可能为空，不能承诺第一个位置存在。空元组同样不匹配非空模式。

返回值模式中的 `never[]` 用来匹配函数签名，不是在说该函数真的只接收 never 参数，也不能据此调用它。参数列表用 infer Args 整体提取，可以保留位置、可选参数和 rest 关系。实际项目通常直接使用内置 Parameters、ReturnType；这里拆开写是为了看清机制。

### 四、裸类型参数会让联合逐个经过分支

**分布式条件类型（Distributive Conditional Type）**最容易误读。判断位置直接是类型参数 T 时，传入联合会逐个代入，再把结果合起来。

```ts example=ts05-distribution
type Unwrap<T> = T extends PromiseLike<infer Value> ? Value : T;

const one: Unwrap<Promise<string>> = '已加载';
const mixed: Unwrap<Promise<string> | null> = null;
const two: Unwrap<Promise<string> | Promise<number>> = 42;
const unchanged: Unwrap<string | number> = '原样保留';
function rejected() {
  // @ts-expect-error 解包后不再是 Promise
  const wrong: Unwrap<Promise<string>> = Promise.resolve('标题');
}
console.log(one, mixed, two, unchanged); // => 已加载 null 42 原样保留
```

把 `Unwrap<Promise<string> | null>` 展开：

1. Promise<string> 匹配成功，得到 string。
2. null 匹配失败，回到原来的 null。
3. 合并为 string | null。

“联合像一组候选”是帮助代入的直觉，并不意味着 TypeScript 对所有类型都遵守简单集合运算，尤其要单独观察 any。类型上的解包也没有等待网络，更没有调用 await；运行时加载仍由 JavaScript 完成。

### 五、方括号让判断面对整个联合

当问题是“所有可能性是否都符合要求”，就不要让每个成员各走一次分支。把判断双方包成单元素元组：`[T] extends [U]`。

```ts example=ts05-whole-union
type Distributed<T> = T extends PromiseLike<infer V> ? V : T;
type Whole<T> = [T] extends [PromiseLike<infer V>] ? V : T;

const split: Distributed<Promise<string> | null> = '标题';
const whole: Whole<Promise<string> | null> = Promise.resolve('标题');
const allPromises: Whole<Promise<string> | Promise<number>> = 7;
function rejected() {
  // @ts-expect-error 整体不满足 PromiseLike，失败分支保留原联合
  const wrong: Whole<Promise<string> | null> = '标题';
}
console.log(split, await whole, allPromises); // => 标题 标题 7
```

| 输入 | 逐项判断 | 整体判断 |
| --- | --- | --- |
| Promise<string> | string | string |
| Promise<string> 或 null | string 或 null | 原输入联合 |
| Promise<string> 或 Promise<number> | string 或 number | string 或 number |
| string 或 number | 原输入联合 | 原输入联合 |

最后一组 Promise 即使整体判断，也都满足模式，V 仍可推断成联合。看到结果是联合，不能反推发生了分布；要检查表达式的位置，再用一半成功、一半失败的输入区分行为。

### 六、never、unknown 和 any 要分别代入

never 表示没有候选。进入分布式条件类型时，没有成员可分发，结果仍是 never；因此 `T extends never ? true : false` 不能按直觉检测它。

```ts example=ts05-special-types
type NaiveNever<T> = T extends never ? true : false;
type IsNever<T> = [T] extends [never] ? true : false;
type Branch<T> = T extends string ? '文本' : '其他';
type IsAny<T> = 0 extends (1 & T) ? true : false;

const empty: IsNever<NaiveNever<never>> = true;
const unknownCase: Branch<unknown> = '其他';
// 故意使用 any 观察污染，不是业务入口的推荐写法。
const eitherA: Branch<any> = '文本';
const eitherB: Branch<any> = '其他';
const polluted: IsAny<any> = true;
console.log(empty, unknownCase, eitherA, eitherB, polluted); // => true 其他 文本 其他 true
```

unknown 没有证明自己是字符串，所以这里进入失败分支。any 则使这个条件的结果包含两个分支，无法再得到原先期望的确定关系。不要把“any 永远得到两个分支”当作通用公式；模式不同，还可能直接化简。上面的检测利用 any 对交叉的特殊影响，只适合明确需要阻止它污染的底层工具。

另一个边界：`[never] extends [string]` 为真，因为 never 可以赋给 string。若“无候选”应有独立结果，先用 IsNever 单独处理，再判断整体是否满足模式。

### 七、过滤联合靠的是失败分支返回 never

内置 **Exclude** 可理解为“逐个排除能赋给 U 的成员”；**Extract** 则保留它们。被删除的成员变成 never，与其他成员合并时不再增加可能性。

```ts example=ts05-filter-union
type State =
  | { kind: 'draft'; title: string }
  | { kind: 'review'; reviewer: string }
  | { kind: 'published'; url: string };
type Editable = Exclude<State, { kind: 'published' }>;
type Review = Extract<State, { kind: 'review' }>;

const editable: Editable = { kind: 'draft', title: '类型推导' };
const review: Review = { kind: 'review', reviewer: '林' };
console.log(editable.kind, review.reviewer); // => draft 林
```

这里过滤的是联合成员，不是删除对象字段。字段类型投影可以回看[TS-04 的 Pick 与 Omit](../chinese-guides/ts-04-mapped-utility-template-literal-types.md#三pick-与-omit-不会从对象里删除字段)；真正删除网络响应里的字段，还需要运行时创建新对象。

### 八、递归解包要说明何时停止

单层 Unwrap 遇到嵌套 PromiseLike 只取一层。重复应用可以递归，但应先决定：接受哪些容器、最多拆几层、到上限保留什么。

```ts example=ts05-depth-budget
type UnwrapAtMost<T, Budget extends readonly unknown[]> =
  Budget extends readonly [unknown, ...infer Rest]
    ? T extends PromiseLike<infer V> ? UnwrapAtMost<V, Rest> : T
    : T;

type Nested = PromiseLike<PromiseLike<string>>;
const one: UnwrapAtMost<Nested, [0]> = Promise.resolve('标题');
const two: UnwrapAtMost<Nested, [0, 0]> = '标题';
const zero: UnwrapAtMost<Promise<string>, []> = Promise.resolve('保留');
console.log(await one, two, await zero); // => 标题 标题 保留
```

“预算”是元组剩余长度，不是运行时计时器。用完后保留当前 T，因此两层容器配一层预算仍留下 PromiseLike。嵌套只用于静态推导：真正的 Promise 解析会吸收 thenable，不能靠连续调用 Promise.resolve 构造可观察的嵌套 Promise 值。

如果需求就是“await 后会得到什么”，优先使用内置 **Awaited**。它处理递归 thenable、空值等细节，不能把本节工具宣称为完全等价实现。对象递归的边界可对照[递归只读的叶子与深度](../chinese-guides/ts-04-mapped-utility-template-literal-types.md#十递归只读必须先定义叶子和深度)。

### 九、从重载推断不会替你逐个模拟调用

对多个调用签名使用 ReturnType 或条件推断时，通常从最后一个签名推断，不会按假想参数重新选择重载。因此最后一个签名只有在你把它写成总括签名时，才代表全部结果。

```ts example=ts05-overload-inference
function label(value: string): string;
function label(value: number): number;
function label(value: string | number): string | number {
  return value;
}

const called = label('标题'); // 这次调用的静态结果是 string
const inferred: ReturnType<typeof label> = 8; // 最后一个公开签名返回 number
function rejected() {
  // @ts-expect-error 实现签名不会自动成为公开的总括重载
  const notInferred: ReturnType<typeof label> = '标题';
}
console.log(called, inferred); // => 标题 8
```

如果库需要让类型工具读到完整结果，可明确提供合适的总括签名，或者直接导出业务结果类型。调用选择与实现兼容检查将在[TS-06 函数接口](../chinese-guides/ts-06-functions-overloads-variance-component-apis.md#ts-06)展开。

同一个 infer U 出现多次也不等于“取第一个”。从多个返回值位置收集候选，可能合并为联合；从多个参数位置收集候选，可能需要交叉才能同时满足。出现难懂的交叉时，先判断这些位置是提供值还是接收值，不要马上加断言。

### 十、模板解析需要先约定输入语法

模板字面量里的 infer 可以拆字符串类型。下面只支持以冒号开头的整段路径参数，不支持可选段、通配符或查询串语法。

```ts example=ts05-route-params
type SegmentParam<S extends string> = S extends `:${infer Name}` ? Name : never;
type RouteParams<Path extends string> =
  Path extends `${infer Head}/${infer Tail}`
    ? SegmentParam<Head> | RouteParams<Tail>
    : SegmentParam<Path>;

const first: RouteParams<'/notes/:noteId/comments/:commentId'> = 'noteId';
const second: RouteParams<'/notes/:noteId/comments/:commentId'> = 'commentId';
function rejected() {
  // @ts-expect-error URL 字面量中没有这个参数
  const missing: RouteParams<'/notes/:noteId'> = 'userId';
}
console.log(first, second); // => noteId commentId
```

把 /notes/:noteId 逐段拆开：空段和 notes 不产生候选；:noteId 产生 noteId；最终只有这一个键。传入普通 string 时内容未知，不能凭空提取参数；如果允许冒号后面没有名字，也要另加校验。

这是有限协议的类型工具，不是 URL 解析器。真实地址仍要运行时读取和校验。输入很长、联合很多时，递归和候选组合可能拖慢编辑器；公共 API 可以限制为已声明路由集合，或直接写出参数类型。

### 十一、NoInfer 让一个位置只接受结果，不参与猜测

泛型可能同时从多个参数获得线索。假设默认筛选项必须来自已有选项；如果默认值也参与推断，就可能扩大范围。TypeScript 5.4 起提供内置 **NoInfer**，表达“检查这里是否兼容，但不要从这里推断 T”。

```ts example=ts05-no-infer
function choose<C extends string>(options: readonly C[], fallback: NoInfer<C>): C {
  return options.includes(fallback) ? fallback : options[0] ?? fallback;
}

const selected = choose(['draft', 'review'] as const, 'draft');
function rejected() {
  // @ts-expect-error fallback 不能替 options 加入新的成员
  choose(['draft', 'review'] as const, 'published');
}
console.log(selected); // => draft
```

NoInfer 不会检查运行时数组。这里 options.includes 才是真实的成员判断；空数组时返回 fallback，也应视为接口的一部分。来自 JSON 的选项应先完成解析，再调用函数。

### 十二、用一张推导表决定工具是否值得保留

先写输入—结果表，再写实现，最后让编译器检查正反例。只看编辑器悬浮信息，不能证明边界。

| 要证明的关系 | 至少试一次 |
| --- | --- |
| 匹配和失败分支 | PromiseLike、普通对象、null |
| 分布与整体判断 | 全匹配联合、部分匹配联合 |
| 没有候选和信息不足 | never、unknown |
| 位置保留 | 可选参数、只读元组、空元组 |
| 工具退出方式 | 零层预算、超过预算的嵌套 |
| 公共接口可理解 | 重载最后签名、非法调用的错误信息 |

未决泛型的条件结果可能延迟化简。在函数体里检查一个值，不一定能把整个类型参数及其条件返回类型同步缩窄。可以使用清楚的重载、拆分函数或显式返回联合，不要为让泛型实现通过而给所有返回值加断言。

当工具需要长篇说明才能解释常见调用，或每次改字段都产生几屏错误，显式业务类型可能更容易维护。保留常用中间类型名，把最低支持的 TypeScript 版本写进包的约定，并在升级时复核这些少量边界例子。类型表达能力服务于读者和调用者，不以层数或字符数衡量。

### 参考与延伸阅读

- [TypeScript：条件类型](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)：分布、infer 和重载推断。
- [TypeScript：工具类型](https://www.typescriptlang.org/docs/handbook/utility-types.html)：Awaited、Parameters、ReturnType、Exclude 与 Extract。
- [TypeScript 5.4 发布说明](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-4.html)：NoInfer。
- [继续阅读 TS-06](../chinese-guides/ts-06-functions-overloads-variance-component-apis.md#ts-06)：把类型关系落实到函数调用约定。
