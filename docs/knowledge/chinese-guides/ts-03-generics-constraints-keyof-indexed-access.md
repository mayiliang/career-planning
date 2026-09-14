# TypeScript 知识点讲义

## TS-03 泛型、约束、keyof 与索引访问

你正在写一个资料列表。取出标题时，希望编辑器知道结果是字符串；取出预计用时时，希望它知道结果是数字。两个操作都只是“读取一个属性”，却不该把结果混成一团。

这一篇从这个很小的需要出发，逐步把对象、字段名、字段值和显示函数联系起来。读完后，你应当能看懂 `T`、`K extends keyof T`、`T[K]` 各自保存了什么信息，也能判断什么时候不值得再增加一层泛型。

### 学习前先确认

- 直接前置：[TS-02 联合类型、收窄、never 与穷尽检查](../chinese-guides/ts-02-unions-narrowing-never-exhaustiveness.md#ts-02)。它继续链接类型推断和 JavaScript 基础。

下面的 TypeScript 片段相互独立，可以逐段放进 TypeScript Playground。启用 `strict`、`noUncheckedIndexedAccess` 和 `exactOptionalPropertyTypes`；`// =>` 表示运行输出。带 `@ts-expect-error` 的行是特意留下的类型反例，不应删掉注释后照搬到业务代码。

### 从取出数组第一项开始保留信息

先想一个不带泛型的函数：输入是 `readonly unknown[]`，取第一项只能得到 `unknown`。即使调用者传入一组标题，函数签名也没有把“元素是字符串”传到返回位置。

**泛型（generics）**允许我们给这段关系起一个名字：

```ts example=ts03-first
function first<Item>(items: readonly Item[]): Item | undefined {
  return items[0];
}

const title = first(['作用域', '闭包']);
const minutes = first([20, 35]);
console.log(title?.toUpperCase()); // => 作用域
console.log(minutes === undefined ? '未安排' : minutes + 5); // => 25
console.log(first<string>([])); // => undefined
```

沿着一次调用读：`['作用域', '闭包']` 提供字符串元素，编译器据此推断 `Item`，返回值于是保留为 `string | undefined`。另一次调用可以推断出数字，不会影响前一次。

`undefined` 不能因为加入泛型就消失。空数组仍然没有第一项，这是运行时事实。`readonly` 表示函数不需要修改输入，普通数组与只读数组都能传入；它没有冻结调用者的数据。

类型参数的名字可以是 `T`，也可以是 `Item`。在关系较多的函数里，`Item`、`Key`、`Result` 往往比一排单字母更容易读。关键是同一个名字在不同位置连接了什么，而不是尖括号本身。

### 两个类型参数可以描述一次转换

资料对象转换成标题，不要求输入与输出相同；它要求输出跟随传入的转换函数。这里需要两个名字：

```ts example=ts03-map
function mapItems<Input, Output>(
  items: readonly Input[],
  convert: (item: Input) => Output,
): Output[] {
  return items.map(convert);
}

const lessons = [{ title: '表单', minutes: 25 }];
const labels = mapItems(lessons, lesson => `${lesson.title} · ${lesson.minutes} 分钟`);
console.log(labels.join('、')); // => 表单 · 25 分钟
```

这里有两条线：数组元素与 `convert` 的参数共用 `Input`；`convert` 的返回值与结果数组元素共用 `Output`。调用者通常不用填写尖括号，编辑器能沿这些位置推断。

反过来，如果一个类型参数只出现在返回位置，输入里没有任何证据决定它，便要特别留心。例如 `readJson<T>(text): T` 不能仅靠一个类型参数把任意 JSON 变成可信的 `T`。这与 [TS-01 的外部数据解析](../chinese-guides/ts-01-type-system-structural-strict-mode.md#外部数据经过检查后再进入业务代码)是同一个边界。

### 约束只写函数真正需要的能力

假设要给一条带标题的数据生成摘要，同时保留其余字段。我们不需要规定它必须是哪一种业务对象，只需要它有字符串标题。

```ts example=ts03-constraint
function withLabel<Item extends { title: string }>(item: Item) {
  return { ...item, label: `正在学习：${item.title}` };
}

const result = withLabel({ title: '闭包', minutes: 35 });
console.log(result.label); // => 正在学习：闭包
console.log(result.minutes); // => 35

function rejected() {
  // @ts-expect-error title 必须是字符串
  withLabel({ title: 35 });
}
```

`extends { title: string }` 是**泛型约束（generic constraint）**，可以读作“传进来的类型至少要满足这个要求”。它不会删掉 `minutes`，也不意味着函数只能看到一个没有其他字段的对象。

写约束之前先问：实现究竟会读取什么、调用什么？只读取 `title` 就要求 `title`，只迭代元素就考虑 `Iterable<Item>`。不要因为参数看起来是对象，就顺手要求字符串索引签名；“允许任意字符串索引”是比“有几个已知字段”更强的承诺。

### 满足约束不代表能制造任意具体类型

最容易误读 `extends` 的地方，是把最低要求当成完整类型。下面的反例展示了原因：

```ts example=ts03-constraint-return
function brokenFallback<Item extends { title: string }>(item: Item): Item {
  if (item.title) return item;
  // @ts-expect-error Item 可能还要求 id 等字段
  return { title: '未命名' };
}

function rename<Item extends { title: string }>(item: Item): Omit<Item, 'title'> & { title: string } {
  return { ...item, title: item.title || '未命名' };
}
const fixed = rename({ id: 8, title: '' });
console.log(fixed.id, fixed.title); // => 8 未命名
```

如果调用者传来 `{ id: number; title: string }`，只返回 `{ title: '未命名' }` 就丢了 `id`。类型检查拒绝的正是这个缺口。正确做法取决于需求：保留其他字段、让调用者提供完整默认值，或者如实返回另一种结构。

`rename` 明确保留除标题以外的字段，并把新标题描述为 `string`。`Omit<Item, 'title'>` 可以读成“取出 Item 中除 title 以外的字段”。这样没有强行承诺标题仍是输入的某个特定字面量，也不需要断言替编译器作保证。

### keyof 得到类型中可见的字段名

先把资料类型写出来，再看它有哪些键：

```ts example=ts03-keyof
type Lesson = { title: string; minutes: number; completed: boolean };
type LessonKey = keyof Lesson;
const key: LessonKey = 'minutes';
console.log(key); // => minutes

function rejected() {
  // @ts-expect-error Lesson 中没有 difficulty
  const wrong: LessonKey = 'difficulty';
  return wrong;
}
```

`LessonKey` 就是 `'title' | 'minutes' | 'completed'`。**keyof** 在类型位置工作，得到编译器可见的键；它不会在浏览器里遍历一个真实对象。

因此，`keyof` 不等于 `Object.keys()` 的返回值。后者在运行时列出自有、可枚举的字符串属性；前者还可能涉及数字键、symbol 键、继承到类型上的成员。对带字符串索引签名的类型，`keyof` 可以是 `string | number`，因为普通对象的数字属性访问会转换成字符串键。

例如 `const names: (keyof Lesson)[]` 表示数组中的每一项都必须是合法字段，但不表示三个字段必须全部出现。如果只接受字符串键，可用 `Extract<keyof Lesson, string>` 筛出字符串成员。类型写了什么，就只把它理解到那一步。

### 索引访问把字段名连接到字段值

在运行时，`lesson['minutes']` 读取一个值。在类型位置，`Lesson['minutes']` 得到这个值的类型。后者叫**索引访问类型（indexed access type）**。

```ts example=ts03-indexed-access
type Lesson = { title: string; minutes: number; completed: boolean };
function getProperty<ObjectType, Key extends keyof ObjectType>(
  object: ObjectType,
  key: Key,
): ObjectType[Key] {
  return object[key];
}

const lesson: Lesson = { title: '表单', minutes: 25, completed: false };
const title: string = getProperty(lesson, 'title');
const minutes: number = getProperty(lesson, 'minutes');
console.log(title, minutes.toFixed(0)); // => 表单 25

function rejected() {
  // @ts-expect-error completed 对应 boolean，不能当成 number
  const wrong: number = getProperty(lesson, 'completed');
  return wrong;
}
```

把签名拆成三步：由第一个实参确定对象类型；让 `Key` 只能从它的键中选；用这个具体 `Key` 取对应值类型。少了第二个类型参数，关系就会变粗。

| 写法 | 能说明什么 | 缺了什么 |
| --- | --- | --- |
| `key: string` | 一个字符串 | 不知道是不是对象的字段 |
| `key: keyof Lesson` | 一个合法字段 | 单独看返回类型时，未必知道选的是哪一个 |
| `Key extends keyof Lesson` 配合 `Lesson[Key]` | 选哪个字段，就返回哪个字段的值 | 仍不验证外部输入 |

如果传入的键本身就是联合类型，结果也会相应成为联合。这没有丢失精度：调用者确实还没有确定会读取哪一个字段。

### 可选字段会把缺失传到读取结果

资料可以暂时没有副标题。访问合法字段，不代表字段一定有值：

```ts example=ts03-optional
type Lesson = { title: string; subtitle?: string };
function read<T, K extends keyof T>(object: T, key: K): T[K] {
  return object[key];
}
const lesson: Lesson = { title: '响应式' };
const subtitle: string | undefined = read(lesson, 'subtitle');
console.log(subtitle ?? '暂无副标题'); // => 暂无副标题

function rejected() {
  // @ts-expect-error 可能没有副标题，不能直接赋给 string
  const text: string = read(lesson, 'subtitle');
  return text;
}
```

`K extends keyof T` 解决“这个名称是否允许”，`T[K]` 反映“读出什么”。两者都不会替你创造不存在的值。开放字典和数组下标还有越界问题，回看 [TS-01 的严格类型基础](../chinese-guides/ts-01-type-system-structural-strict-mode.md#ts-01)，就能把它们放进同一套判断里。

### typeof 可以让配置成为类型的来源

如果一份静态配置已经包含全部允许的选项，不必再手写一份容易漏改的联合：

```ts example=ts03-typeof
const modes = {
  comfortable: { label: '舒适阅读', lineHeight: 1.9 },
  compact: { label: '紧凑阅读', lineHeight: 1.6 },
} as const;

type Mode = keyof typeof modes;
type ModeSettings = (typeof modes)[Mode];
const selected: Mode = 'comfortable';
const settings: ModeSettings = modes[selected];
console.log(settings.label, settings.lineHeight); // => 舒适阅读 1.9
```

读法是：`typeof modes` 取得变量的静态类型，`keyof` 取得键，最后的方括号取得其中的值类型。括号帮助人看清层次，不会在运行时执行这串类型运算。

这里的 `typeof` 与 `typeof value === 'string'` 属于不同位置：前者用于编写类型，后者是实际执行的 JavaScript 判断。`as const` 保留字面量并形成只读类型视图；它没有冻结对象。需要同时检查配置形状和保留具体信息时，可继续阅读 [satisfies 的用途](../chinese-guides/ts-01-type-system-structural-strict-mode.md#satisfies-检查要求同时保留具体信息)。

### 推断变宽时先检查变量的声明位置

“同一个字符串，直接传入能用，存在变量里却报错”通常是信息在更早的位置变宽了：

```ts example=ts03-inference
const lesson = { title: '状态快照', minutes: 30 };
function read<T, K extends keyof T>(object: T, key: K): T[K] {
  return object[key];
}
let looseKey = 'title';
const fixedKey = 'title';
let selectedKey: keyof typeof lesson = 'title';
console.log(read(lesson, fixedKey)); // => 状态快照
selectedKey = 'minutes';
console.log(read(lesson, selectedKey)); // => 30

function rejected() {
  // @ts-expect-error let looseKey 可被赋成任何 string，不能保证是合法字段
  read(lesson, looseKey);
}
```

选择 `const` 是在表达这个绑定不会再换值；给变量写键联合，是在表达以后允许切换，但只能在这几个字段之间切换。二者适用于不同需求。

在调用点补 `as keyof typeof lesson` 只会掩盖信息来源。字段真的来自 URL 时，它就是未经检查的字符串，应该走下一节的允许列表，而不是试图让推断相信它已经合法。

### 外部字段需要允许列表而不是泛型断言

有些通用工具写“只要 `hasOwnProperty` 为真，就把键断言为 `keyof T`”。这在开放的结构类型下不够严谨：实际对象可以拥有类型视图里没有的额外字段。更清楚的做法，是明确产品允许用户选择哪些字段。

```ts example=ts03-external-key
type Lesson = { title: string; minutes: number };
type PublicKey = keyof Lesson;
function isPublicKey(value: string): value is PublicKey {
  return value === 'title' || value === 'minutes';
}
function displayField(lesson: Lesson, field: string): string {
  if (!isPublicKey(field)) return '不支持这个字段';
  return String(lesson[field]);
}
const internal = { title: '表单', minutes: 25, privateNote: '内部草稿' };
console.log(displayField(internal, 'title')); // => 表单
console.log(displayField(internal, 'privateNote')); // => 不支持这个字段
```

`internal` 能传给 `Lesson` 参数，是结构兼容；参数类型不会在运行时删掉 `privateNote`。允许列表约束的是这个功能愿意公开什么，没有声称外部对象只含两项。

如果是写入接口，还应分别限定可修改字段和每个字段的值，不要把读取工具原样改成任意写入。类型关系帮助源码中的调用者，服务端的输入检查和权限判断仍有各自职责。

### 表格列要让格式化函数收到正确的值

现在回到开头的资料列表。标题列需要字符串，用时列需要数字。先只描述“一种确定的列”：

```ts example=ts03-column-pair
type Lesson = { title: string; minutes: number; completed: boolean };
type Column<Row, Key extends keyof Row> = {
  key: Key;
  format: (value: Row[Key]) => string;
};
const minutesColumn: Column<Lesson, 'minutes'> = {
  key: 'minutes',
  format: value => `${value.toFixed(0)} 分钟`,
};
const lesson: Lesson = { title: '表单', minutes: 25, completed: false };
console.log(minutesColumn.format(lesson[minutesColumn.key])); // => 25 分钟
```

这里 `Key` 已固定为 `'minutes'`，所以格式化参数就是 `number`。如果直接写 `Column<Lesson, keyof Lesson>`，键变成三个键的联合，值也变成 `string | number | boolean`。这时要求格式化器只处理数字就不合理了：类型没有说明自己究竟是哪一列。

多种列混放时，可以先为每个键生成一种结构，再合成联合：

```ts example=ts03-column-union
type Lesson = { title: string; minutes: number; completed: boolean };
type AnyColumn<Row> = {
  [Key in keyof Row]-?: {
    key: Key;
    format: (value: Row[Key]) => string;
  }
}[keyof Row];
const column: AnyColumn<Lesson> = {
  key: 'minutes',
  format: value => `${value.toFixed(0)} 分钟`,
};
console.log(column.format(25)); // => 25 分钟
```

由内往外读：`[Key in keyof Row]` 逐个处理键；花括号为该键建立对应的格式化器；最后 `[keyof Row]` 把生成的几种列取出来合成联合。`-?` 去掉映射结果自身的可选标记，避免原对象的可选字段让“列的联合”额外混入 `undefined`；该字段的值类型仍可能含 `undefined`。

这能描述配置，不代表循环遍历时编译器一定能恢复所有键值关联。对未收窄的联合直接调用 `column.format(row[column.key])`，仍可能报参数不匹配。不要因此塞入 `any`；如果实现不需要在遍历时观察键，换一种表示会更简单。

### 在创建列时保存关系让渲染保持简单

一种实用做法是在构造列的那一刻捕获确定的键，随后只暴露“给我一行，我返回显示文本”：

```ts example=ts03-column-builder
type Lesson = { title: string; minutes: number; completed: boolean };
function columnsFor<Row>() {
  return function column<Key extends keyof Row>(
    key: Key,
    format: (value: Row[Key]) => string,
  ) {
    return { key, render: (row: Row) => format(row[key]) };
  };
}
const column = columnsFor<Lesson>();
const columns = [
  column('title', value => value),
  column('minutes', value => `${value.toFixed(0)} 分钟`),
  column('completed', value => value ? '已学完' : '学习中'),
];
const lesson: Lesson = { title: '表单', minutes: 25, completed: false };
console.log(columns.map(item => item.render(lesson)).join(' / ')); // => 表单 / 25 分钟 / 学习中

function rejected() {
  // @ts-expect-error 不存在的字段不能创建列
  column('difficulty', String);
  // @ts-expect-error title 的格式化参数是 string
  column('title', (value: number) => value.toFixed(0));
}
```

第一次调用固定行类型，第二次调用推断具体字段。`render` 的闭包保存键和格式化函数，外部循环不再需要重新拼配它们。这正好连接到 [JS-01 的闭包与绑定](../chinese-guides/js-01-execution-context-scope-closure.md#闭包保存的是变量还是快照)：类型在编译阶段保证关系，闭包在运行阶段保存实际使用的东西。

如果界面只有两个固定字段，直接写两个显示函数也合理。抽象应减轻阅读与维护负担，而不是把简单表格变成类型谜题。

### 类型参数的位置决定何时固定关系

`first<Item>` 每次调用可以选新的 `Item`；一个已创建的容器通常应一直保存同一种数据。把参数放在接口上，就能表达后者：

```ts example=ts03-generic-position
interface Box<Item> {
  value: Item;
  replace: (next: Item) => void;
}
function createBox<Item>(initial: Item): Box<Item> {
  const box: Box<Item> = {
    value: initial,
    replace(next) { box.value = next; },
  };
  return box;
}
const titleBox = createBox('表单');
titleBox.replace('响应式');
console.log(titleBox.value); // => 响应式

function rejected() {
  // @ts-expect-error 这个容器在创建时已经固定为 string
  titleBox.replace(42);
}
```

如果错误地把 `replace` 写成 `<Next>(next: Next) => void`，每次替换都允许新类型，就失去了容器的约定。读泛型 API 时，可以先标出“何时确定一次类型”，很多看似复杂的签名便能解释清楚。

默认类型参数只是在未提供、也没有更合适推断时给出选择。例如 `Page<Item, Meta = { total: number }>` 表示默认分页元数据，并不要求所有页面永远只能用这一种元数据。它也不会在运行时自动生成 `total`。

### 把泛型翻译成一句普通中文

读到陌生签名时，试着改写为一句话：“接收什么，哪几个位置要对应，缺失或失败怎样表示。”本篇的答案分别是“数组里是什么，取出的就可能是什么”“选哪个键，就读取对应值”“创建哪种列，格式化器就接收那种字段”。

然后检查三件事：函数体能否对约束允许的所有输入成立；调用点是否保留了需要的信息；运行时是否真的兑现了类型的承诺。编译器能发现非法字段和错误参数，却不会验证服务端数据，也不会决定公开哪些业务字段。

可以把 `Lesson.minutes` 改成可选属性，观察哪一个格式化器需要补上缺失处理；再新增一个字段，观察 `keyof` 自动变了什么、允许列表又有哪些地方需要人工决定。变化带来的影响，比背诵类型运算符更能说明你是否理解了这段关系。

### 参考与延伸阅读

- [TypeScript Handbook：Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)：查类型参数、约束、默认值与参数位置。
- [TypeScript Handbook：Keyof Type Operator](https://www.typescriptlang.org/docs/handbook/2/keyof-types.html)：查数字键、字符串索引签名等规则。
- [TypeScript Handbook：Indexed Access Types](https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html)：查 `T[K]` 与联合索引的写法。
- [TypeScript Handbook：Mapped Types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html)：需要扩展表格列时，再深入映射类型；第一次阅读不必掌握全部类型运算。
