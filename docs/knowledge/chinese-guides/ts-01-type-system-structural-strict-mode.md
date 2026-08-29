# TypeScript 知识点讲义

## TS-01 类型系统、结构化类型与严格模式

TypeScript 的价值不是把 JavaScript 变成另一种运行时语言，而是在代码执行前，对“什么值可以流到什么位置、哪些操作可能不成立”做系统检查。要真正用好它，必须同时理解三层事实：JavaScript 运行时仍然决定程序行为，TypeScript 类型只在开发和构建阶段存在，外部输入只有经过运行时校验才能成为可信数据。

### 学习前先确认

- 直接前置：[JS-03 类型、相等、拷贝与不可变更新](../chinese-guides/js-03-types-equality-copy-immutability.md#js-03)。对象、原始值、身份、函数和变量基础已由它继续递归链接，这里不再重复列出。

TypeScript 注解、推断、结构兼容和严格配置都是本讲正文。没有写过 TypeScript 也可以从这里开始。

### 一、TypeScript 检查程序，不替代 JavaScript 运行时

**静态类型检查（static type checking）**在程序运行前分析表达式可能拥有的类型，并阻止已知不成立的操作：

```ts
function upperName(name: string): string {
  return name.toUpperCase();
}

upperName('Ada');
// upperName(42); // 编译错误：number 不能传给 string
```

类型注解帮助编译器和读者理解合同。生成 JavaScript 时，大多数类型语法会被移除，这叫**类型擦除（type erasure）**：

```js
function upperName(name) {
  return name.toUpperCase();
}
```

浏览器或 Node.js 最终仍执行 JavaScript。类型不会在运行时自动拒绝服务器返回的坏 JSON，也不会冻结对象、限制属性写入或改变 `===`。如果未经校验的数据绕过编译器进入函数，`name.toUpperCase()` 仍可能抛错。

因此要把两句话同时记住：类型检查能在开发阶段消灭大量不一致；类型检查无法证明外部世界一定遵守声明。高级 TypeScript 设计不是写出最复杂的类型，而是让静态合同与真实运行时边界一致。

### 二、注解与推断共同形成类型信息

TypeScript 不要求给每个变量写类型。它会根据初始化值、返回语句和使用位置进行**类型推断（type inference）**：

```ts
const taxRate = 0.13;       // number
const label = '含税价';     // 字面量或 string，取决于上下文

function total(price: number) {
  return price * (1 + taxRate); // 返回类型推断为 number
}
```

在公共函数参数、跨模块返回值、持久化结构等合同边界写注解，可以让意外变化更早暴露；局部变量已经显而易见时重复写注解只会增加噪声。

匿名函数的参数还会从出现位置得到**上下文类型（contextual typing）**：

```ts
const names = ['Ada', 'Lin'];

names.map((name) => name.toUpperCase());
// name 由 Array<string>.map 的合同推断为 string
```

如果把回调脱离上下文单独声明，而项目又关闭了 `noImplicitAny`，参数可能退化成 `any`。这说明类型信息在数据流中传播；关键边界清楚，内部推断才能可靠。

### 三、拓宽与字面量保留影响后续精度

`let status = 'idle'` 的值以后可以重新赋成其他字符串，所以通常被拓宽为 `string`；`const status = 'idle'` 不能重新赋值，可以保留更具体的字面量 `'idle'`。对象即使用 `const` 声明，属性仍可能变化，因此对象属性常被拓宽：

```ts
const state = { kind: 'idle' };
// state.kind 通常是 string，因为属性仍可被改写
```

需要把配置保留为只读字面量时，可以使用 `as const`：

```ts
const routes = {
  home: '/',
  settings: '/settings',
} as const;
```

这会递归地把该字面量表达式的属性视为只读并保留字面量类型，但不会在运行时调用 `Object.freeze`。它是类型层约束，不是运行时不可变保证。

`satisfies` 可检查表达式满足目标合同，同时尽量保留表达式自身的精确类型：

```ts
type RouteTable = Record<string, `/${string}`>;

const routes = {
  home: '/',
  settings: '/settings',
} satisfies RouteTable;
```

与直接注解 `const routes: RouteTable` 相比，`satisfies` 不强迫变量只剩宽泛的 `Record` 视图；与 `as RouteTable` 相比，它会真正检查值是否满足合同。三者用途不同，不能把 `as` 当成“更强的 satisfies”。

### 四、结构化类型比较能力，不比较名字

TypeScript 主要采用**结构化类型（structural typing）**。判断一个值能否用于某处时，关心它是否拥有目标要求的成员以及成员类型是否兼容，而不是它是否由某个同名类或类型别名创建：

```ts
type User = {
  id: string;
  name: string;
};

const employee = {
  id: 'u-1',
  name: 'Ada',
  department: 'platform',
};

const user: User = employee; // 结构包含所需成员
```

这种“一个类型的值能否放到另一个类型要求的位置”叫**可赋值性（assignability）**。目标 `User` 只要求 `id` 与 `name`；额外的 `department` 不妨碍变量赋值。结构化类型很适合 JavaScript 的对象组合、测试替身和接口适配，但也意味着两个语义不同、结构恰好相同的字符串 ID 会互相兼容。

若订单 ID 与用户 ID 不能混用，可以在经过验证的创建边界使用品牌字段建立名义差异：

```ts
declare const userIdBrand: unique symbol;
type UserId = string & { readonly [userIdBrand]: 'UserId' };

function parseUserId(value: string): UserId {
  if (!/^u-\d+$/.test(value)) throw new Error('无效用户 ID');
  return value as UserId;
}
```

断言只集中在已经完成运行时检查的构造函数里。若任何字符串都随手 `as UserId`，品牌就只剩装饰。

### 五、额外属性检查不是精确对象类型

直接把对象字面量交给目标类型时，TypeScript 会执行启发式的**额外属性检查（excess property checking）**，帮助发现拼写错误：

```ts
type User = { id: string; name: string };

// 错误：对象字面量里的 displayName 不在 User 中
const user: User = {
  id: 'u-1',
  name: 'Ada',
  displayName: 'Ada',
};
```

但先保存到变量再赋值时，只要结构包含所需字段，额外字段通常允许：

```ts
const payload = { id: 'u-1', name: 'Ada', role: 'admin' };
const user: User = payload;
```

这不是编译器前后矛盾。额外属性检查专门帮助对象字面量发现可疑键，TypeScript 的一般兼容规则仍是结构化的。它不等于“运行时拒绝多余字段”，更不等于安全过滤。外部输入是否允许未知字段，要由 Schema 或解析器合同明确决定。

将一个对象赋给较窄变量也不会删除额外属性。`user` 的静态视图看不到 `role`，运行时对象仍是原来的 `payload`。类型只限制这段代码允许怎样使用值，不会重写值本身。

### 六、any、unknown、object 与 {} 的边界完全不同

几个看起来宽泛的类型承担不同责任：

| 类型 | 表达的意思 | 使用边界 |
| --- | --- | --- |
| `any` | 退出当前类型检查 | 几乎任何操作都允许，并会向下游传播不安全 |
| `unknown` | 值存在，但使用前不知道类型 | 必须收窄，适合外部输入入口 |
| `object` | 任意非原始值 | 不能直接假设有某个属性 |
| `{}` | 除 `null`/`undefined` 外几乎任何值 | 不是“空对象”，通常不适合作为业务对象类型 |
| `Record<string, unknown>` | 有字符串键的记录视图 | 仍需逐字段校验，数组与特殊对象也要按合同排除 |

`any` 的危险不是某一行变得宽松，而是它具有污染性：从 `any` 读取属性仍是 `any`，再传给严格函数也可能不报错。迁移旧项目时可以在边界暂时存在 `any`，但应记录来源、缩小范围，并尽快转成 `unknown` 后解析。

```ts
function parseName(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('name 必须是非空字符串');
  }
  return value;
}
```

类型系统逼迫代码先证明，运行时判断真正保护输入。二者在这个函数中对齐。

### 七、可选、undefined 与 null 不是同一合同

```ts
type Preferences = {
  theme?: 'light' | 'dark';
};
```

`theme?` 表示属性可以缺失。读取时得到 `'light' | 'dark' | undefined`，因为缺失属性的运行时读取结果是 `undefined`。但“属性缺失”和“属性明确存在且值为 undefined”仍会影响 `Object.hasOwn`、对象展开、序列化和补丁语义。

开启 `exactOptionalPropertyTypes` 后，`theme?: T` 不再默认允许显式写入 `undefined`；如果合同允许，需写成 `theme?: T | undefined`。这对 PATCH 请求尤其重要：缺失可能表示“不修改”，`null` 可能表示“清空”，显式 `undefined` 又可能不在 JSON 协议中。类型必须跟实际接口语义一致。

`strictNullChecks` 开启时，`null` 与 `undefined` 不会自动流入普通 `string`、`number`。只有合同写出 `string | null` 才允许空值。非空断言 `value!` 只是告诉编译器“相信我”，不会在运行时检查；它应基于附近明确的不变量，而不是消除所有红线的快捷键。

```ts
function label(value: string | null): string {
  return value === null ? '未设置' : value.toUpperCase();
}
```

### 八、索引访问需要承认“键可能不存在”

普通数组访问 `items[index]` 在运行时可能得到 `undefined`。不开额外检查时，TypeScript 常把它当作元素类型，导致代码过度乐观。开启 `noUncheckedIndexedAccess` 后，未证明存在的索引或字典键会加入 `undefined`：

```ts
const names: string[] = [];
const first = names[0]; // string | undefined

if (first !== undefined) {
  console.log(first.toUpperCase());
}
```

这会增加一些判断，却让类型更接近 JavaScript 事实。对于已经由长度判断、循环协议或专门函数证明存在的位置，可以在局部建立更精确的结构，例如非空元组 `[T, ...T[]]`，而不是在整个项目关闭检查。

动态字典同样如此：`Record<string, User>` 从类型表面声称每个字符串键都有 User，这通常比真实对象更强。若键可能缺失，应使用 `Partial<Record<string, User>>`、`Record<string, User | undefined>` 或 Map，并让读取方处理不存在。

### 九、严格模式是一组协同工作的检查

TypeScript 的**严格模式（strict mode）**通过 `"strict": true` 打开一组严格检查，例如严格空值、函数参数、属性初始化和隐式 any。它不是 JavaScript `'use strict'`，也不是一个运行时开关。

一个面向新项目的基础配置可以是：

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "useUnknownInCatchVariables": true,
    "noEmit": true
  }
}
```

后三项不全部包含在 `strict` 中的所有版本语义里，显式写出能表达项目合同。`useUnknownInCatchVariables` 让 `catch (error)` 按 unknown 处理，因为被抛出的值不保证是 Error。

配置必须与构建链一致。若应用由 Babel、SWC 或框架插件转译 TypeScript，类型检查可能由单独的 `tsc --noEmit` 或语言服务承担；只因为产物成功生成，不代表类型检查已经运行。CI 应明确执行类型检查，编辑器绿线不能作为唯一证据。

### 十、严格迁移要修复模型，而不是消除红线

旧项目一次开启严格模式会暴露大量问题。可靠迁移通常按边界推进：

1. 确认当前构建与类型检查使用同一份 tsconfig；
2. 先处理外部输入、共享模型和公共函数合同；
3. 把无来源的 any 改为 unknown，并在入口建立解析；
4. 修复真实 null/undefined 与索引缺失，而不是批量加 `!`；
5. 用小批次开启选项，保存错误类别和回归证据；
6. 对暂时豁免写清原因、负责人和移除条件。

`// @ts-ignore` 会忽略下一行是否仍有错误，容易在问题消失后继续隐藏新问题；确实需要保留一个已知错误时，`// @ts-expect-error` 更可审计，因为如果那行以后不再报错，编译器会提醒注释已经过期。两者都不应成为常规类型建模工具。

### 十一、类型断言不会验证任何运行时事实

**类型断言（type assertion）** `value as User` 只改变编译器对值的看法，不检查字段、不转换数据，也不删除额外属性：

```ts
const raw = JSON.parse(text) as User;
console.log(raw.name.toUpperCase());
```

`JSON.parse` 返回的数据可能没有 `name`。这段代码把不确定性藏起来，运行时风险仍在。双重断言 `value as unknown as Target` 更是明确绕过兼容检查，只应出现在已经有外部证明、而类型声明无法表达的极窄适配层，并配有测试和注释。

DOM 查询也常见断言：`document.querySelector(...) as HTMLButtonElement` 没有证明元素存在或标签正确。更可靠的是检查 `instanceof HTMLButtonElement`，然后在分支内使用。

断言适合告诉编译器一个代码已证明但分析器看不出的事实；如果没有证明，它就是把错误从编译期推迟到运行时。

### 十二、外部输入必须经过运行时校验

网络 JSON、localStorage、URL 参数、跨窗口消息、Worker 消息和第三方 SDK 返回值都在类型系统之外。应先当作 unknown，经过**运行时校验（runtime validation）**后再进入可信领域：

```ts
type User = {
  id: string;
  name: string;
};

function parseUser(value: unknown): User {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('用户必须是对象');
  }

  const record = value as Record<string, unknown>;
  if (typeof record.id !== 'string' || typeof record.name !== 'string') {
    throw new Error('用户字段无效');
  }

  return { id: record.id, name: record.name };
}
```

这里的断言只把已确认是普通非空对象的值临时视为可按字符串键读取的记录；每个业务字段仍逐一检查。返回新对象还建立了归一化边界：下游只拿到允许字段，不与原始输入共享任意额外属性。

项目可以使用 Schema 库减少重复代码，但仍要决定未知字段是保留、删除还是拒绝，错误路径怎样表达，日期和数字是否转换，以及版本不兼容如何降级。库替你执行规则，不替你定义合同。

### 十三、类型安全取决于“可信核心”有多小

可以把系统分成两圈：

```text
不可信边界：网络、存储、消息、用户输入、第三方库
              ↓ 解析 / 校验 / 归一化
可信核心：领域对象、状态转换、组件属性、内部函数
```

可信核心越多地使用精确类型，业务代码越少重复防御；边界越明确，断言和 any 越不容易扩散。反过来，如果每个组件都接收 `any` 后自行猜字段，再复杂的泛型也无法恢复整体可靠性。

类型声明还可能过度承诺。例如函数标注返回 `User`，实际在失败时返回 null；或声明对象只读，运行时却被另一个别名修改。评审类型时要问：谁构造这个值、谁能修改它、外部输入在哪里验证、运行时失败怎样表达。类型与生命周期、所有权和错误模型必须相互一致。

### 十四、测试要同时验证静态合同和运行时边界

类型测试与运行时测试负责不同问题：

- 使用 `tsc --noEmit` 确认合法代码可编译、非法调用被拒绝；
- 对预期错误使用 `@ts-expect-error`，防止规则意外变松；
- 运行时给解析器输入缺字段、错类型、null、数组、额外字段和未来版本；
- 验证解析后对象是否归一化、错误是否含可定位路径；
- 在真实构建链运行类型检查，避免“只转译不检查”；
- 对公共库从消费者项目测试声明文件与实际导出一致。

编译通过不能替代运行时测试；运行时样本也不能证明所有静态组合。两类证据组合，才能说明合同既能帮助开发，也能面对真实输入。

### 常见误解

- “写了 TypeScript，接口返回值就会自动符合类型”：类型在运行时已擦除，外部数据仍需校验。
- “结构化类型会禁止所有多余属性”：一般兼容允许额外成员，字面量只会得到额外属性检查。
- “`{}` 表示空对象”：它通常接受大多数非 null/undefined 值。
- “`as` 会转换或验证数据”：断言只改变静态视图。
- “`const` 或 `readonly` 会冻结对象”：它们不自动建立运行时深冻结。
- “构建成功等于类型检查通过”：部分工具只移除类型并生成 JavaScript。
- “严格迁移就是把所有报错加 `!`”：非空断言隐藏事实，不能修复空值合同。

### 学完后应能说明

1. 静态类型检查与 JavaScript 运行时分别负责什么，类型擦除带来什么边界。
2. 推断、上下文类型、拓宽、`as const` 和 `satisfies` 怎样影响类型精度。
3. 结构化兼容与额外属性检查为何不是精确对象校验。
4. any、unknown、object、{}、可选属性、null 和 undefined 的责任差异。
5. 严格配置如何暴露真实问题，以及外部输入怎样进入可信核心。

下一讲 [TS-02 联合类型、收窄、never 与穷尽检查](../chinese-guides/ts-02-unions-narrowing-never-exhaustiveness.md#ts-02) 会在这套静态与运行时边界上，继续描述“一项值可能处于多个互斥状态”时的安全控制流。
