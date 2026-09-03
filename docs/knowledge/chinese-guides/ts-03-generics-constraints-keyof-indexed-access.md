# TypeScript 知识点讲义

## TS-03 泛型、约束、`keyof` 与索引访问

TypeScript 的价值不只是给变量贴上类型名称，更重要的是表达“几个位置之间必须保持什么关系”。当一个函数接收对象和属性名时，返回值类型应随属性名变化；当一个组件接收数据与列配置时，每一列的格式化函数应只接收对应字段的值。泛型正是用来保存这种关系的工具。

### 学习前先确认

- 直接前置：[TS-02 联合类型、收窄、`never` 与穷尽检查](../chinese-guides/ts-02-unions-narrowing-never-exhaustiveness.md#ts-02)。它会继续链接严格类型、对象和 JavaScript 基础，这里不重复列出。

本讲会从普通函数自然推进到约束、键类型、索引访问、推断和异构配置，不要求先掌握条件类型或复杂类型体操。

### 一、泛型保存的是调用之间的关系

下面的函数如果使用 `unknown`，只能表达“输入输出都不知道”；它没有保存二者相同这一事实：

```ts
function identityLoose(value: unknown): unknown {
  return value;
}
```

加入类型参数后，调用者传入的具体类型会代入同一个位置：

```ts
function identity<T>(value: T): T {
  return value;
}

const name = identity('Ada'); // string
const count = identity(3);    // number
```

这里的 `T` 不是运行时变量，也不会生成额外 JavaScript。它是编译器在一次调用中使用的占位符。一个有意义的泛型通常至少出现两次：输入与输出、两个参数、容器与元素或对象与键之间。如果类型参数只出现一次，往往只是把普通类型换了一个抽象名字。

这类由调用点决定具体类型、函数体仍对所有允许类型成立的能力叫**泛型（generics）**。泛型的目标不是“支持任何东西”，而是在复用与精确关系之间取得平衡。

### 二、类型参数放在哪里决定关系持续多久

把类型参数放在调用签名上，每次调用都可以得到不同实例：

```ts
type Mapper = <Input, Output>(
  values: readonly Input[],
  map: (value: Input) => Output,
) => Output[];
```

把类型参数放在接口上，则创建对象时就固定下来：

```ts
interface Repository<Entity> {
  get(id: string): Promise<Entity | null>;
  save(entity: Entity): Promise<void>;
}

declare const users: Repository<User>;
```

前者适合一次调用建立关系，后者适合对象整个生命周期都操作同一实体。不要为了减少几个类型字符，把本应在对象层固定的实体类型挪到每个方法上；那会允许同一个仓库的一次调用处理用户、下一次处理订单，破坏领域含义。

类型参数也可以有默认值，但默认值只解决调用方便，不会增加约束：

```ts
interface Page<Result, Meta = { total: number }> {
  items: Result[];
  meta: Meta;
}
```

### 三、约束说明泛型至少具备什么能力

对完全未知的 `T` 不能读取 `.length`，因为数字没有这个属性。用 `extends` 声明最低能力：

```ts
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}
```

这里的**泛型约束（generic constraint）**不是把 `T` 变成 `{ length: number }`。调用者传入字符串时返回值仍是字符串，传入数组时仍保留具体数组元素类型；约束只保证函数体可以读取 `length`。

约束要与函数真正需要的能力一样窄。若写成 `T extends Record<string, unknown>`，会无意排除某些接口、函数或没有字符串索引签名的合法结构。若只需要 `id`，就约束 `{ id: string }`。若只需要迭代，就约束 `Iterable<T>`，不要要求数组特有方法。

### 四、`keyof` 把对象属性名变成联合类型

```ts
type User = {
  id: number;
  name: string;
  active: boolean;
};

type UserKey = keyof User; // 'id' | 'name' | 'active'
```

**键类型运算符（keyof operator）**读取的是类型可见的键集合，不是运行时执行 `Object.keys`。它可能包含 `string`、`number` 或 `symbol`。带字符串索引签名的对象常得到 `string | number`，因为 JavaScript 会把数字属性访问转换为字符串键。

```ts
type Dictionary = { [name: string]: boolean };
type DictionaryKey = keyof Dictionary; // string | number
```

这解释了为什么不能总把 `keyof T` 直接传给只接受字符串的 DOM 或序列化 API。需要字符串键时应明确写 `Extract<keyof T, string>`，而不是用断言假装所有键都是字符串。

### 五、索引访问让值类型跟随键变化

类型位置中的 `T[K]` 叫**索引访问类型（indexed access type）**。它与运行时的 `object[key]` 写法相似，但只参与静态检查：

```ts
function getProperty<T, K extends keyof T>(object: T, key: K): T[K] {
  return object[key];
}

const user: User = { id: 1, name: 'Ada', active: true };
const userName = getProperty(user, 'name'); // string
const active = getProperty(user, 'active'); // boolean
```

`K extends keyof T` 保证键合法，`T[K]` 保证结果对应这个键。若把参数写成 `key: keyof T`，返回值会变成所有属性值的联合；若写成 `key: string`，甚至失去键合法性。独立的 `K` 是保存精确关联的关键。

可选属性会自然把 `undefined` 带入结果：

```ts
type Profile = { name?: string; age: number };
declare const profile: Profile;

const maybeName = getProperty(profile, 'name'); // string | undefined
```

这不是类型系统“变笨”，而是在提醒调用者对象中可能没有该属性。`noUncheckedIndexedAccess` 还会让开放索引和数组下标体现越界可能性。

### 六、`typeof` 从运行时声明取得静态形状

类型位置中的 `typeof` 不同于 JavaScript 表达式 `typeof value`。它取得一个已声明值的静态类型：

```ts
const defaults = {
  locale: 'zh-CN',
  pageSize: 20,
  dense: false,
};

type Preferences = typeof defaults;
type PreferenceKey = keyof typeof defaults;
```

这种写法适合配置对象作为单一来源。若值需要保留字面量，可结合 `as const`；若希望检查形状但不改变推断，可使用 `satisfies`。不要从包含秘密或环境差异的真实运行时数据推导公共合同，也不要用 `typeof import(...)` 让业务类型依赖庞大的实现模块。

### 七、推断从参数流向类型参数

编译器会从实参、上下文和返回位置收集候选类型，这叫**类型推断（type inference）**。通常让推断工作比显式填写 `<User, 'name'>` 更清晰：

```ts
getProperty(user, 'name');
```

但推断会受字面量拓宽影响：

```ts
const key = 'name';       // 通常推断为 'name'
let changingKey = 'name'; // 通常拓宽为 string

getProperty(user, key);
// getProperty(user, changingKey); // string 不保证是 User 的键
```

若变量确实只能取用户键，就把约束写在它的定义处：

```ts
let changingKey: keyof User = 'name';
```

不要在调用点写 `changingKey as keyof User`；断言跳过了赋值来源的证明，稍后变量变成 `'missing'` 时仍可能访问到 `undefined`。

### 八、异构配置为何容易丢失键值关系

一个表格的不同列需要不同格式化参数。下面的朴素类型把所有键和值合并成两个联合，导致二者不再对应：

```ts
type LooseColumn<T> = {
  key: keyof T;
  format: (value: T[keyof T]) => string;
};
```

对 `User` 而言，`format` 被迫处理 `number | string | boolean`。正确模型是先为每个键生成一种列，再把这些列合并成联合：

```ts
type Column<T> = {
  [K in keyof T]-?: {
    key: K;
    format: (value: T[K], row: T) => string;
  }
}[keyof T];

const columns: Column<User>[] = [
  { key: 'id', format: value => value.toFixed(0) },
  { key: 'name', format: value => value.toUpperCase() },
  { key: 'active', format: value => value ? '启用' : '停用' },
];
```

这里的映射类型只用于恢复“某个 K 对应某个 `T[K]`”的关联。若配置需要排序、编辑、权限、空值显示等更多维度，继续堆叠类型运算会迅速降低可读性。此时可以拆成明确的列种类，或让列构造函数在调用处保存推断。

### 九、泛型 API 仍然需要运行时实现

类型安全不等于运行时安全。`getProperty` 能阻止源码中拼错键，却无法验证来自 URL、JSON 或用户输入的任意字符串：

```ts
function hasOwnKey<T extends object>(
  object: T,
  key: PropertyKey,
): key is keyof T {
  return Object.prototype.hasOwnProperty.call(object, key);
}
```

在边界先验证，再进入泛型核心。即使守卫证明键存在，开放对象或原型链仍有安全语义；读取配置时通常只接受自有属性，写入前还要限制可修改键，避免原型污染和越权字段。

### 十、什么时候不要使用泛型

泛型会增加抽象成本。出现以下情况时，显式类型通常更好：

- 只有一个稳定业务实体，未来也不需要复用；
- 泛型参数无法从调用点推断，使用者必须填写一长串参数；
- 返回类型包含多层条件、映射和递归，错误信息已经无法解释；
- 类型关系掩盖了运行时分支，实际实现仍靠断言；
- 两个领域对象形状相似但权限、生命周期或不变量不同。

高级 TypeScript 的标准不是写出最长的类型，而是用最小复杂度表达真实关系，让错误出现在维护者能理解的位置。

### 十一、验证一个泛型设计

同时保存正向和反向类型证据。正向证明合法调用有精确结果；反向证明非法键、错误格式化器和可选值遗漏会被拒绝。可以使用 `tsc --noEmit`、类型测试工具或带 `@ts-expect-error` 的最小样例，但每个预期错误都应说明为什么必须失败。

运行时测试仍要覆盖键来自外部、属性缺失和可选值为 `undefined`。只有静态与运行时两层都明确，泛型 API 才真正形成可信边界。

### 学完后应能说明

你应能解释类型参数保存的关系、约束与具体类型的区别、`keyof` 和 `T[K]` 如何关联键和值、推断为何会因拓宽丢失精度、映射联合为何能表示异构配置，以及何时应放弃复杂泛型改用显式领域类型。

