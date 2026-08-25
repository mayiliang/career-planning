# TypeScript 业务建模与迁移实战

这份讲义面向已经会写基础 JavaScript、刚开始承担真实前端业务的学习者。它不把 TypeScript 当作“给变量加类型”，而是把类型、运行时校验、业务规则和升级证据连成一条可验证的工程链路。

> 阅读约定：代码中的 `// @ts-expect-error` 表示“这一行应当编译失败”。它不是忽略错误，而是把预期的类型错误变成回归断言。每节都按“定义—机制—场景—失败—验证”展开；先完成固定输入，再尝试变式。

## 先修词汇与责任边界

- **静态类型（Static Type）**：编译或编辑阶段用于分析代码的类型信息。它不会自动检查服务器返回的 JSON。
- **运行时（Runtime）**：程序实际执行的阶段。网络响应、浏览器存储和用户输入都在运行时进入系统。
- **类型擦除（Type Erasure）**：TypeScript 编译成 JavaScript 后，大部分类型标注会被移除。因此 `value as User` 不会生成校验代码。
- **不变量（Invariant）**：对象在任何合法时刻都必须满足的规则，例如“已批准的审核单一定有审核人”。
- **夹具（Fixture，固定测试输入）**：题目预先给定、每次测试保持一致的一组输入。固定夹具能让首考和复测结果可比较。
- **断言（Assertion）**：直接告诉编译器“相信我”。断言只改变静态判断，不改变值，也不验证值。
- **守卫（Type Guard，类型守卫）**：通过运行时判断把宽类型收窄为具体类型的函数或条件。

边界只有一句话：**TypeScript 证明“代码按声明使用值”，运行时解析器证明“外部值符合声明”，服务端授权证明“本次操作确实允许”。** 三者不能互相替代。

---

## TS-01

### 类型系统、结构化类型与严格模式

适用场景与具体示例：接收网络 JSON、浏览器存储或第三方消息时，用四个固定用户样本比较静态兼容与运行时守卫。

### 定义与机制

TypeScript 采用 **结构化类型（Structural Typing）**：只要一个值拥有目标类型要求的成员，并且各成员可赋值，它通常就能赋给目标类型；并不要求它由某个同名类创建。

```ts
type User = { id: number; name: string };

const fromVariable = { id: 1, name: "Ada", role: "admin" };
const user: User = fromVariable; // 结构满足，允许多余成员

// @ts-expect-error 对“直接对象字面量”执行额外属性检查
const literal: User = { id: 1, name: "Ada", role: "admin" };
```

这里的 **额外属性检查（Excess Property Check）** 是对象字面量的易错提示，不是运行时安全边界，也不是“所有多余字段都禁止”的通用规则。若业务确实要求拒绝多余字段，必须在解析器中明确实现。

常见宽类型的边界：

| 类型 | 可以直接做什么 | 主要风险 |
| --- | --- | --- |
| `any` | 几乎任何操作 | 关闭检查并向下游传播，错误延迟到运行时 |
| `unknown` | 只能赋给 `unknown`/`any`，使用前必须收窄 | 最适合外部输入入口 |
| `object` | 表示非原始值 | 不能说明具体成员 |
| `{}` | 在严格空值检查下接收大多数非 `null`/`undefined` 值 | 容易被误解为“空对象” |
| `T?` | 属性可缺失，读取时通常得到 `T | undefined` | “缺失”和显式 `undefined` 的契约可能不同 |
| `T | null` | 明确允许空值 | 必须先收窄再调用成员 |

建议的最低严格配置：

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

`strict` 是一组严格检查的总开关；另外三项分别暴露越界索引、可选属性契约混淆和异常对象被当作 `any` 的问题。是否开启应记录迁移错误，而不是为“零红线”批量加断言。

### 固定场景：从 `unknown` 建立入口

```ts
type User = { id: number; name: string };

function isExactUser(value: unknown): value is User {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  return keys.length === 2 &&
    keys.includes("id") &&
    keys.includes("name") &&
    typeof record.id === "number" &&
    Number.isInteger(record.id) &&
    typeof record.name === "string" &&
    record.name.length > 0;
}

function importUsers(value: unknown): User[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isExactUser);
}

const raw: unknown = [
  { id: 1, name: "Ada" },
  { id: "2", name: "Bo" },
  { id: 3, name: null },
  { id: 4, name: "Di", role: "admin" },
];
```

本题把 `role` 拒绝掉，是固定契约的选择；若真实 API 允许向前兼容的新字段，可改为只校验必需字段，但必须在契约中写清楚。不要把两种策略混在同一个解析器中。

### 失败模式与验证

- 用 `JSON.parse(text) as User[]`：只有断言，没有校验。
- 把入口写成 `any`：`name.toUpperCase()` 直到线上才暴露 `null`。
- 误把额外属性检查当安全边界：变量赋值和网络数据都会绕过它。
- 为通过迁移关闭 `strictNullChecks`：会把大量真实空值错误藏起来。

验收必须包含：`tsc --noEmit` 成功；四个样本逐项记录接受/拒绝原因；自动断言结果只包含 `{id:1,name:'Ada'}`；再将 `id` 改为品牌类型时，展示品牌只能由已验证入口创建。

---

## TS-02

### 联合类型、收窄、`never` 与穷尽检查

适用场景与具体示例：订单页存在五种互斥渲染状态时，用判别联合和未知状态夹具验证新增成员不会静默漏掉。

### 定义与机制

**联合类型（Union Type）** 表示“若干类型之一”；**交叉类型（Intersection Type）** 表示“同时满足多个类型”。业务状态优先使用带稳定判别字段的 **判别联合（Discriminated Union）**，让同一状态携带的数据与该状态绑定。

```ts
type OrderResult =
  | { kind: "loading" }
  | { kind: "success"; orders: Array<{ id: string }> }
  | { kind: "empty" }
  | { kind: "error"; message: string; retryable: boolean }
  | { kind: "forbidden"; reason: string };

function assertNever(value: never): never {
  throw new Error(`未处理状态：${JSON.stringify(value)}`);
}

function render(result: OrderResult): string {
  switch (result.kind) {
    case "loading": return "加载中";
    case "success": return `共 ${result.orders.length} 单`;
    case "empty": return "暂无订单";
    case "error": return result.message;
    case "forbidden": return result.reason;
    default: return assertNever(result);
  }
}
```

**控制流收窄（Control-flow Narrowing）** 会根据 `switch`、`typeof`、`in`、真假判断或类型谓词推导当前分支。`never` 表示此处不应存在任何合法值；把默认分支交给 `assertNever`，新增成员却没补分支时就会编译失败。

### 未知输入守卫

```ts
function isOrderResult(value: unknown): value is OrderResult {
  if (typeof value !== "object" || value === null) return false;
  const x = value as Record<string, unknown>;
  switch (x.kind) {
    case "loading":
    case "empty":
      return true;
    case "success":
      return Array.isArray(x.orders) && x.orders.every(
        (order) => typeof order === "object" && order !== null &&
          typeof (order as Record<string, unknown>).id === "string",
      );
    case "error":
      return typeof x.message === "string" && typeof x.retryable === "boolean";
    case "forbidden":
      return typeof x.reason === "string";
    default:
      return false;
  }
}
```

固定的 `{kind:'archived', archivedAt:'2026-08-01'}` 和复测 `{kind:'paused'}` 都应在运行时被拒绝。若把 `kind` 写成 `string`、先 `as OrderResult`，或在 `default` 静默返回空字符串，编译器都无法替你发现新增状态遗漏。

### 失败模式与验证

- 判别字段可变或被拓宽为 `string`，成员关系会变弱。
- 用断言把 JSON 变成联合类型，只制造“看起来安全”的假象。
- `default: return ''` 吞掉新增状态，页面形成无解释空白。
- 只测渲染函数，不测入口守卫，未知状态仍可能进入系统。

验收：五种合法状态都有快照；`archived`/`paused` 被守卫拒绝；临时把 `archived` 加入联合但不加渲染分支，保存编译失败证据；补齐分支后再恢复通过。

---

## TS-03

### 泛型、约束、`keyof` 与索引访问

适用场景与具体示例：表格列的键与格式化器值类型需要一一对应时，用固定 `User` 列夹具验证泛型关系。

### 定义与机制

**泛型（Generic）** 用类型参数表达“多个位置之间保持同一种关系”，不是把所有具体类型都换成 `T`。`K extends keyof T` 限制键属于对象；`T[K]` 是 **索引访问类型（Indexed Access Type）**，取得该键对应的值类型。

```ts
function getProperty<T, K extends keyof T>(object: T, key: K): T[K] {
  return object[key];
}

type User = { id: number; name: string; active: boolean };
const user: User = { id: 1, name: "Ada", active: true };
const name = getProperty(user, "name"); // string
// @ts-expect-error User 没有 age
getProperty(user, "age");
```

异构列若直接写 `Column<User, keyof User>[]`，`format` 的参数可能变成宽联合，丢失每个 `key` 与 `value` 的对应关系。用 **映射联合（Mapped Union）** 保留关系：

```ts
type Column<T> = {
  [K in keyof T]-?: {
    key: K;
    title: string;
    format(value: T[K]): string;
  }
}[keyof T];

const columns: Column<User>[] = [
  { key: "id", title: "编号", format: (value) => value.toFixed(0) },
  { key: "name", title: "姓名", format: (value) => value.toUpperCase() },
  { key: "active", title: "状态", format: (value) => value ? "启用" : "停用" },
];

// @ts-expect-error 非法键
const invalid: Column<User> = { key: "age", title: "年龄", format: (x: number) => String(x) };
```

`typeof value` 可从值取得类型；泛型默认值用于调用者未提供参数时的默认类型；泛型推断依赖参数位置和字面量是否被保留。`const key = 'name'` 保留字面量，而 `let key = 'name'` 通常拓宽为 `string`。

### 失败模式与验证

- 用 `K extends string` 而不是 `keyof T`，允许不存在的键。
- 把格式化器写成 `(value: any) => string`，主动切断键值关系。
- 为“复用”设计十几个类型参数，让调用者比显式 DTO 更难理解。
- 用方法签名隐藏回调参数问题；公开 API 应优先清晰而非炫技。

验收：三个合法列运行输出正确；非法 `age` 编译失败；`getProperty(user,'name')` 的类型断言为 `string`；把 `name` 改为可选后应推导 `string | undefined`，格式化器必须显式处理缺失值。

---

## TS-04

### 映射类型、工具类型与模板字面量类型

适用场景与具体示例：从稳定 DTO 派生表单事件名或只读视图时，用 `UserDto` 夹具验证转换范围，而不是自动处理所有对象。

### 定义与机制

**映射类型（Mapped Type）** 遍历键并生成新属性；`+?/-?`、`+readonly/-readonly` 添加或移除修饰符；`as` 可以重映射键。**模板字面量类型（Template Literal Type）** 在类型层按字符串规则生成名称。

```ts
type PartialByKeys<T, K extends keyof T> =
  Omit<T, K> & Partial<Pick<T, K>>;

type EventName<T> = {
  [K in keyof T & string as `on${Capitalize<K>}Change`]:
    (value: T[K]) => void;
};
```

递归只读必须声明支持范围，不能把所有 `object` 一视同仁：

```ts
type Primitive = string | number | boolean | bigint | symbol | null | undefined;

type DeepReadonly<T> =
  T extends Primitive | Date | RegExp | Function ? T :
  T extends readonly (infer Item)[] ? ReadonlyArray<DeepReadonly<Item>> :
  T extends Map<infer K, infer V> ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>> :
  T extends Set<infer Item> ? ReadonlySet<DeepReadonly<Item>> :
  T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } :
  T;

type UserDto = {
  readonly id?: number;
  profile: { name: string };
  createdAt: Date;
  tags: string[];
};
```

`Date` 保持为 `Date`，所以 `getTime()` 可调用；这不等于 Date 内部时间不可变。若业务要求值对象真正不可变，应封装操作或在边界转成时间戳。数组分支必须先于普通对象分支，否则会暴露数组对象的实现细节。

### 失败模式与验证

- 无边界递归处理 `Date`、函数、Map 或第三方类，得到难用或错误的类型。
- 大型联合叠加递归和模板字面量，显著增加编辑器与编译器成本。
- 自动生成大量事件名，却没有运行时注册表对应，类型与实现漂移。
- 工具类型名字漂亮，但调用处读不出真实 DTO，维护成本高于重复。

验收：`PartialByKeys<UserDto,'profile'>` 只有 `profile` 变可选；事件名包含 `onIdChange` 等对应签名；深只读拒绝修改嵌套名字和数组写入，仍允许 `createdAt.getTime()`；将 `tags` 改为 `readonly string[]` 后结果保持一致。

---

## TS-05

### 条件类型、`infer` 与分布式行为

适用场景与具体示例：从 Promise 或函数签名提取类型时，用五组固定输入比较分布式与整体判断；普通业务字段不需要类型体操。

### 定义与机制

**条件类型（Conditional Type）** 形式为 `T extends U ? X : Y`。当检查对象是“裸类型参数”且传入联合类型时，会对联合成员逐一计算，这叫 **分布式条件类型（Distributive Conditional Type）**。

```ts
type Unwrap<T> = T extends Promise<infer Value> ? Value : T;
type ParametersOf<T> = T extends (...args: infer Args) => unknown ? Args : never;
type UnwrapWhole<T> = [T] extends [Promise<infer Value>] ? Value : T;

type A = Unwrap<Promise<string>>;                       // string
type B = Unwrap<string | number>;                       // string | number
type C = Unwrap<never>;                                 // never
type D = Unwrap<Promise<string> | Promise<number>>;     // string | number
type E = UnwrapWhole<Promise<string> | null>;           // Promise<string> | null
```

`infer` 只在条件类型的匹配位置声明待推导部分。`[T] extends [U]` 用单元素元组包裹两边，阻止分布，改为对联合整体判断。

`never` 是空联合，分布式条件对它没有成员可计算，所以仍为 `never`。`any` 会污染条件结果，常得到过宽联合或失去约束；外部入口应用 `unknown`。递归条件类型还受编译器实例化深度和性能限制。

### 失败模式与验证

- 期望整体判断，却忘记方括号，联合被逐项解包。
- 误把 `never` 当普通值或运行时异常；它只是静态上的“不可能类型”。
- 从 `any` 推导复杂类型，以为得到了可靠结论。
- 能用明确联合/重载表达的问题写成多层递归条件，报错难以阅读。

验收：为上述 A—E 建立 `Equal/Expect` 类型断言；增加 `ParametersOf<(id:string, retry?:number)=>void>`；复测将 D 的第二项换成 `null`，验证分布版本为 `string | null`、非分布版本保留整个联合。

---

## TS-06

### 函数、重载、协变逆变与组件 API

适用场景与具体示例：同一查询 API 接受单个或多个 id、组件接收消费者回调时，用固定数据库和过窄回调测试替换安全。

### 定义与机制

**重载（Overload）** 用多条公开签名描述调用方式，再用一条足够宽的实现签名完成运行时分支。调用者只看到重载签名，不能依赖实现签名。

```ts
type User = { id: string; name: string };
const database: Record<string, User> = {
  u1: { id: "u1", name: "Ada" },
  u2: { id: "u2", name: "Bo" },
};

function load(id: string): User;
function load(ids: string[]): User[];
function load(input: string | string[]): User | User[] {
  return Array.isArray(input) ? input.map((id) => database[id]) : database[input];
}
```

**协变（Covariance）** 可粗略理解为“输出可以更具体”；**逆变（Contravariance）** 可粗略理解为“消费输入的函数必须能接受调用方可能给出的所有值”。在 `strictFunctionTypes` 下，属性形式的函数类型会阻止过窄回调：

```ts
type SelectProps = {
  onSelect: (user: User) => void;
};

const safe: SelectProps = { onSelect: (user) => console.log(user.name) };

// @ts-expect-error 只能处理 u1，不能安全替换“可处理任意 User”的回调
const tooNarrow: SelectProps = { onSelect: (user: { id: "u1" }) => console.log(user.id) };
```

方法语法 `onSelect(user: User): void` 在一些兼容性规则下表现出 **双变性（Bivariance）**，可能接受过窄参数。面向消费者的组件回调应优先使用函数属性，并开启严格函数类型检查。

### 失败模式与验证

- 实现签名返回值与重载承诺不一致，数组输入却返回单对象。
- 用可选布尔参数控制返回类型，调用者拿到难以收窄的联合。
- 方法双变性接纳过窄回调，组件传入其他用户时崩溃。
- 重载只为“看起来高级”，实际一个联合参数加判别结果更清楚。

验收：`load('u1')` 推导 `User`，`load(['u1','u2'])` 推导 `User[]` 且运行一致；过窄回调与 `User & {vip:true}` 回调均编译失败；普通 `(user:User)=>void` 回调通过。

---

## TS-07

### 接口契约、运行时校验与错误模型

机制与流程：外部值先以 `unknown` 进入解析器，再验证字段、归一化为内部模型或稳定错误，最后由 UI 映射为可恢复状态。

### 定义与责任分工

- **接口契约（API Contract）**：请求、响应和错误的共同约定。
- **模式（Schema）**：可在运行时执行的结构规则；可以手写，也可以由库实现。
- **解析（Parsing）**：把 `unknown` 转换成内部可信模型；既可能验证，也可能归一化。
- **错误码（Error Code）**：程序稳定识别的分类，不等于给用户看的文案。
- **错误原因（Error Cause）**：帮助开发者追踪底层原因的信息，不应把密钥、原始响应或隐私数据直接展示给用户。

静态 `Order` 服务于内部代码；运行时解析器服务于边界；UI 只消费成功模型或稳定错误分类。生成 OpenAPI 类型可以减少重复，但若运行时没有执行校验，仍不能证明真实响应符合类型。

### 固定解析器

```ts
type OrderStatus = "paid";
type Order = { id: number; amount: number; status: OrderStatus };
type CompatibleOrder =
  | { kind: "known"; order: Order }
  | { kind: "unknown-status"; id: number; amount: number; rawStatus: string };

type ParseErrorCode = "NOT_OBJECT" | "MISSING_ID" | "INVALID_AMOUNT" | "INVALID_STATUS";

class OrderParseError extends Error {
  constructor(
    readonly code: ParseErrorCode,
    readonly path: string,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "OrderParseError";
  }
}

function parseOrder(value: unknown): CompatibleOrder {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new OrderParseError("NOT_OBJECT", "$", "订单不是对象");
  }
  const x = value as Record<string, unknown>;
  if (!Number.isInteger(x.id)) {
    throw new OrderParseError("MISSING_ID", "$.id", "订单编号缺失或不是整数");
  }
  if (typeof x.amount !== "number" || !Number.isFinite(x.amount)) {
    throw new OrderParseError("INVALID_AMOUNT", "$.amount", "金额不是有限数字");
  }
  if (typeof x.status !== "string") {
    throw new OrderParseError("INVALID_STATUS", "$.status", "状态不是字符串");
  }
  if (x.status !== "paid") {
    return { kind: "unknown-status", id: x.id as number, amount: x.amount, rawStatus: x.status };
  }
  return { kind: "known", order: { id: x.id as number, amount: x.amount, status: x.status } };
}
```

固定四样本的结果：有效值成功；缺 `id` 得 `MISSING_ID`；`amount:'9'` 得 `INVALID_AMOUNT`；`status:'refunded'` 不崩溃，而进入受控降级分支。复测把 `refunded` 换成 `pending`，结果仍应降级而非伪装成 `paid`。

错误码到 UI 的映射应集中管理，例如数据格式错误统一显示“订单数据暂不可用”，同时在受保护日志记录 `code/path/requestId`。`cause` 只进入内部诊断，并先做脱敏和体积限制。

### 失败模式与验证

- `response.json() as Order`：跳过边界验证。
- 收到未知枚举直接 `throw`：上游小升级导致整页崩溃；若安全要求必须拒绝，也应有恢复 UI。
- 把未知值强改成某个已知业务状态：造成错误决策。
- 将完整原始响应或 `cause` 展示给用户/上报日志：泄露隐私或令牌。

验收：自动测试四个固定样本和 `pending` 变式；断言错误 `code/path`；断言未知状态进入降级视图；断言面向用户的消息不含原始响应。

---

## TS-08

### 业务状态与权限类型建模

适用场景：审核单同时受状态、角色、资源归属和版本影响时，以状态—动作表为来源，并由服务端在每次命令上重新裁决。

### 定义与机制

- **实体（Entity）**：由稳定身份区分、会随时间变化的对象。
- **值对象（Value Object）**：由内容而非身份决定相等性的值。
- **品牌类型（Branded Type）**：在结构类型上添加不可随意伪造的名义标记，避免不同 ID 混用。
- **状态机（State Machine）**：定义有限状态、允许动作和转换结果。
- **乐观并发控制（Optimistic Concurrency Control）**：提交时携带已读版本，服务端拒绝陈旧版本，避免覆盖他人更新。
- **授权（Authorization）**：判断当前主体是否能对当前资源执行当前动作；按钮隐藏不是授权。

```ts
declare const reviewIdBrand: unique symbol;
type ReviewId = string & { readonly [reviewIdBrand]: "ReviewId" };
type Role = "author" | "reviewer";
type Action = "submit" | "approve" | "reject";
type ReviewState = "draft" | "submitted" | "approved" | "rejected" | "archived";

const allowedActions = {
  draft: ["submit"],
  submitted: ["approve", "reject"],
  approved: [],
  rejected: [],
  archived: [],
} as const satisfies Record<ReviewState, readonly Action[]>;

type Review =
  | { state: "draft"; id: ReviewId; authorId: string; version: number }
  | { state: "submitted"; id: ReviewId; authorId: string; version: number; submittedAt: string }
  | { state: "approved"; id: ReviewId; authorId: string; version: number; reviewerId: string }
  | { state: "rejected"; id: ReviewId; authorId: string; version: number; reviewerId: string; reason: string }
  | { state: "archived"; id: ReviewId; authorId: string; version: number; archivedAt: string };
```

### 固定场景与示例

状态—动作表是单一来源，但角色和服务端上下文仍需单独判断：作者只能提交自己的草稿；审核员只能批准/拒绝已提交项。服务端 guard 还必须重新读取最新对象并核对版本。

```ts
type Command = { reviewId: ReviewId; action: Action; expectedVersion: number; idempotencyKey: string };

function canAct(review: Review, role: Role, userId: string, action: Action): boolean {
  if (!(allowedActions[review.state] as readonly Action[]).includes(action)) return false;
  if (action === "submit") return role === "author" && review.authorId === userId;
  return role === "reviewer";
}

function authorizeCommand(current: Review, command: Command, role: Role, userId: string) {
  if (current.id !== command.reviewId) return { ok: false, code: "RESOURCE_MISMATCH" } as const;
  if (current.version !== command.expectedVersion) return { ok: false, code: "VERSION_CONFLICT" } as const;
  if (!canAct(current, role, userId, command.action)) return { ok: false, code: "FORBIDDEN" } as const;
  return { ok: true } as const;
}
```

`version:3` 的页面隐藏按钮，只是体验提示；若服务端已是 `version:4`，陈旧请求必须得到 `VERSION_CONFLICT`。`idempotencyKey` 用于识别重试，避免同一动作因网络重发执行两次；它不替代版本检查。

### 失败模式与验证

- 用 `isApproved/isLoading/canApprove` 多个布尔值组合出非法状态。
- 客户端隐藏按钮却没有服务端重授权。
- 只校验角色，不校验资源归属、当前状态或版本。
- 品牌 ID 由任意字符串直接断言，品牌失去入口价值。
- 新增状态后在 UI、服务端和类型各维护一份表，产生漂移。

验收：固定 `draft→submitted→approved|rejected` 与角色、动作；测试合法转换、非法跃迁、错误角色、资源不匹配、`version:3/4` 冲突和相同幂等键重放；新增 `archived` 后三个动作在按钮、运行时 guard 与状态表三层均拒绝。

---

## TS-09

### TypeScript 版本迁移、模块语义与弃用治理

适用场景：多包 workspace 同时包含浏览器、Node、声明输出和 Vue/Volar 工具时，必须分包、分轨验证，不能一次替换版本后只看编辑器。

> 时效基线：本节按 2026-08-25 已正式发布的 TypeScript 5.9、6.0、7.0 编写。实施真实升级时必须重新核对 TypeScript 官方发布说明、框架工具链支持矩阵和本项目锁文件，不能把这里的版本号当永久事实。

### 先理解五个不同问题

- **目标版本（target）**：TypeScript 输出或假设的 JavaScript 语法级别。
- **模块格式（Module Format）**：ESM、CommonJS 等运行时代码组织形式。
- **模块解析（Module Resolution）**：编译器怎样从导入字符串找到文件及类型。
- **类型发现（Type Discovery）**：哪些全局声明和 `@types` 包进入项目。
- **声明输出（Declaration Emit）**：库向消费者发布的 `.d.ts` 契约。

“编译通过”只证明一次静态过程；Node 加载、浏览器打包、编辑器语言服务、测试运行器和声明消费者都要分别验证。

### 5.9 → 6.0 → 7.0 的迁移位置

TypeScript 5.9 可作为整理旧配置和模块语义的起点：记录 `tsc --version`；显式选择 Node 或 bundler 解析；理解 `import defer` 只延迟模块求值而不延迟加载；保存迁移前日志。

TypeScript 6.0 是通往 7.0 的兼容桥。重要默认变化包括：`strict:true`、`module:esnext`、更现代的 `target`、`noUncheckedSideEffectImports:true`、`rootDir` 默认项目根、`types:[]`。旧的 `node10/classic` 解析、部分旧模块格式和配置项进入硬错误或弃用清理；导入属性从 `assert` 转向 `with`。`stableTypeOrdering` 只用于定位类型输出顺序差异，可能降低检查性能，不能长期当作修复。

TypeScript 7.0 已是原生编译器正式版，命令行 `tsc` 和新语言服务器可用，并采用 6.0 的默认值及硬错误规则。但 7.0 **没有稳定的程序化编译器 API（Programmatic Compiler API）**。依赖嵌入式语言或编译器 API 的 Vue/Volar、MDX、Astro、Svelte、Angular 模板工具等，官方发布说明建议暂留 6.0 或使用双轨工具链，直到兼容方案明确。

官方给出的并行安装思路是：让 `typescript` 指向 `@typescript/typescript6` 兼容包（提供 `tsc6` 和 6.0 API），另用别名安装 7.0 的 `tsc`。实际项目应把精确版本固定在锁文件，不要照抄范围后不复核：

```json
{
  "devDependencies": {
    "@typescript/native": "npm:typescript@7.0.2",
    "typescript": "npm:@typescript/typescript6@6.0.2"
  }
}
```

本仓库当前锁定 TypeScript 5.7.2，且使用 Vue/Volar 相关工具；因此不能因为 7.0 已发布就直接替换。正确结论是建立 5.7→5.9→6.0 的错误台账，再在隔离分支比较 7.0 CLI，并保留依赖编译器 API 的 6.0 路径。

### 三包固定迁移夹具

| 包 | 运行边界 | 建议配置方向 | 必须验收 |
| --- | --- | --- | --- |
| `apps/web` | 浏览器 + bundler | `module: preserve/esnext`、`moduleResolution: bundler` | 类型、开发服务器、生产打包、浏览器运行 |
| `apps/api` | Node 20 | 与 `package.json#type` 对齐的 `node20/nodenext` | 类型、实际 Node 启动、测试、动态导入 |
| `packages/ui` | 被其他包消费 | 明确声明输出、导出映射和目标环境 | `.d.ts`、ESM/CJS 消费者、打包副作用 |

旧配置 `module:commonjs,target:es2019,rootDir:src` 不能整仓机械替换。先对每个包记录运行时和消费者，再逐包处理：

1. 冻结基线：保存版本、完整命令、锁文件、`tsc`/测试/打包/运行日志。
2. 配置审计：显式列出 `module/moduleResolution/target/rootDir/types/lib` 和包导出。
3. 依次试迁：先 5.9，再 6.0；把每类错误修在所属包，不用批量断言。
4. 双轨验证：可使用 7.0 CLI 的包对比诊断、声明、运行和性能；编译器 API 工具留在 6.0。
5. 兼容窗口：CI 同时跑旧/新关键路径，规定退出条件和负责人。
6. 回滚：恢复版本与锁文件，同时保留已证明正确的源代码修复；回滚后重跑基线。

TypeScript 7 的 `--checkers`、`--builders` 和 `--singleThreaded` 是并行度/诊断控制，不是正确性修复。固定 CI 并行参数、比较内存与耗时，并在差异出现时用单线程最小复现。

### 失败模式与验证

- 编辑器没有红线就宣布升级成功，忽略 CI 使用的 TypeScript 版本。
- `apps/api` 编译为一种模块，`package.json#type` 或 Node 按另一种方式加载。
- 用 `skipLibCheck`、批量 `as` 或关闭严格项掩盖不兼容。
- 整仓一次升级，无法定位是语言、框架、插件还是声明消费者出错。
- 在 Vue 等嵌入式语言项目中只换 7.0 CLI，却假设 Volar 已使用同一编译器。
- 把性能提升当正确性证据，没有比较诊断、声明与运行输出。

验收必须交付三个包迁移前后的：`tsc --version`、配置差异、类型日志、运行/打包日志、声明差异、side-effect import 检查、全局类型发现结果、工具兼容矩阵、失败回滚演练。复测只把 `apps/api` 改成 Node 20 解析，另外两包结果必须保持不变。

### 官方时效核验入口

- TypeScript 5.9 发布说明：用于核对 `node20`、`import defer` 等 5.9 行为。
- TypeScript 6.0 正式发布说明：用于核对默认项、弃用项与 7.0 迁移桥。
- TypeScript 7.0 正式发布说明：用于核对原生编译器、无程序化 API、双轨包名和嵌入式语言限制。

这些英文官方页只承担版本事实核验；学习、首考与术语解释以本中文讲义为准。

---

## 领域综合自检

完成九节后，应能用同一个订单审核案例回答：

1. 外部 JSON 为什么从 `unknown` 开始，在哪一层转成内部模型？
2. 如何用判别联合表达加载状态和业务状态，又不把权限压成布尔值？
3. 哪些关系适合泛型、映射或条件类型，何时应退回显式 DTO？
4. 客户端按钮、运行时 guard、服务端授权和乐观并发分别阻止什么问题？
5. 为什么 TypeScript 大版本迁移必须同时验证编辑器、CLI、运行时、打包与声明消费者？

若只能说出类型语法，却不能用固定输入给出编译失败、运行结果、错误码、状态转换和迁移日志，这一领域仍未达到“掌握”。
