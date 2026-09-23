# TypeScript 知识点讲义

## TS-06 函数接口、重载与回调关系

函数类型是调用双方的约定：调用者交出哪些值，实现者承诺如何使用它们、返回什么。一个签名即使通过编译，也可能让调用者误解：回调参数为什么突然可能缺失？传入 async 函数以后，谁会处理失败？组件收到 value，却仍然偷偷维护另一份值，该听谁的？

本讲用资料列表、标题格式化和保存按钮解释这些问题。所有 TypeScript 代码块都能独立运行，预期非法写法放在不调用的函数中。示例以 TypeScript 5.7.2 的严格模式检查，包含 strictFunctionTypes、noUncheckedIndexedAccess 与 exactOptionalPropertyTypes。

### 学习前先确认

- 直接前置：[TS-03 泛型、约束、keyof 与索引访问](../chinese-guides/ts-03-generics-constraints-keyof-indexed-access.md#ts-03)。理解一个类型参数怎样连接输入和输出，便可以继续读本讲。

阅读时反复问一句：“这个位置是谁来调用，调用时能拿出什么？”这比孤立背诵协变、逆变更容易理解。

### 一、先写清谁调用谁，再决定函数签名

**调用签名（Call Signature）**描述参数顺序、可选性与返回值。参数名帮助阅读，但兼容关系主要由类型和位置决定。

一个回调可以不使用调用方提供的所有参数。列表遍历会传入 item 和 index，使用者只需要 item 时，可以只声明一个参数。这和“调用方可以不传 index”是不同约定。

```ts example=ts06-callback-optional
function visit(items: readonly string[], onItem: (item: string, index: number) => void) {
  items.forEach((item, index) => onItem(item, index));
}
const seen: string[] = [];
visit(['闭包', '泛型'], item => { seen.push(item); });

function acceptsPossiblyMissing(callback: (index?: number) => void) {
  callback();
}
function rejected() {
  // @ts-expect-error 调用方允许省略 index，接收方却要求它一定存在
  acceptsPossiblyMissing((index: number) => { console.log(index.toFixed()); });
}
console.log(seen.join('、')); // => 闭包、泛型
```

只有当实现确实可能不提供参数时，才应把回调参数标成可选。为了允许调用者少写一个变量而加问号，会迫使所有真正使用 index 的人处理 undefined，也可能掩盖接口设计错误。

### 二、rest 元组能保留参数之间的关系

把参数全部写成 string | number 的数组，会丢掉位置：第一个是什么、第二个能否省略、不同命令需要什么信息。**rest tuple** 可以把一整组合法参数保存下来。

```ts example=ts06-rest-tuples
type ActionArgs =
  | ['open', id: number]
  | ['search', keyword: string, limit?: number];

function describeAction(...args: ActionArgs): string {
  if (args[0] === 'open') return '打开 ' + args[1].toFixed(0);
  return '搜索 ' + args[1].trim() + '，最多 ' + (args[2] ?? 20) + ' 条';
}
function rejected() {
  // @ts-expect-error open 后面必须是数字 ID
  describeAction('open', '7');
  // @ts-expect-error search 的第二个参数不能缺少
  describeAction('search');
}
console.log(describeAction('open', 7)); // => 打开 7
console.log(describeAction('search', ' 类型 ', 5)); // => 搜索 类型，最多 5 条
```

args[0] 是判别位置。确认它是 open 后，第二个位置随之收窄到 number。不要先把参数分别保存为失去关联的宽类型，再期待它们自动恢复关系。

如果每个分支有大量字段，命名对象通常更容易读，例如 `{ kind: 'search', keyword, limit }`。元组适合位置少、调用习惯明确的 API。

### 三、重载应该表达调用关系，而不是堆叠形式

**函数重载（Function Overload）**适合“不同输入对应不同输出”。如果所有输入都返回同一个类型，普通联合参数往往更简单。

```ts example=ts06-overloads
function formatTitle(value: string): string;
function formatTitle(value: readonly string[]): string[];
function formatTitle(value: string | readonly string[]): string | string[];
function formatTitle(value: string | readonly string[]): string | string[] {
  return typeof value === 'string'
    ? value.trim()
    : value.map(title => title.trim());
}
const single = formatTitle(' 闭包 ');
const many = formatTitle([' 闭包 ', ' 泛型 ']);

function acceptsUnion(value: string | readonly string[]) {
  return formatTitle(value); // 总括重载允许已是联合类型的调用者
}
console.log(single.toUpperCase()); // => 闭包
console.log(many.join('、')); // => 闭包、泛型
console.log(acceptsUnion([' 推断 ']).toString()); // => 推断
```

前两个公开签名保留具体调用结果；第三个总括签名允许联合输入。没有第三个时，一个已经声明为联合的变量，可能无法匹配任一具体重载。最后带函数体的实现签名用于承接实现，不会自动对调用者公开。

重载顺序也会影响选中结果：具体签名通常放在宽签名前。重叠规则很多时，分成 formatOneTitle 和 formatTitles，反而能减少阅读成本。重载还不是实现语义证明：即使声明兼容，实现把两个分支的返回行为写反，也可能通过宽实现签名的检查；仍要核对实际输出。

### 四、this 参数说明接收者，不会自动绑定对象

普通函数的 this 由调用方式决定。TypeScript 的 this 参数只声明“调用时需要怎样的接收者”，编译后会被擦除，不占真实参数位置。

```ts example=ts06-this
type Viewer = { prefix: string };
function title(this: Viewer, value: string) {
  return this.prefix + value;
}
const viewer = { prefix: '资料：' };
const bound = title.bind(viewer);

function rejected() {
  // @ts-expect-error 普通调用没有提供要求的 this
  title('闭包');
}
console.log(title.call(viewer, '闭包')); // => 资料：闭包
console.log(bound('泛型')); // => 资料：泛型
```

把对象方法直接作为回调传出时，接收者可能丢失。可以在交出前 bind，也可以用箭头函数明确调用对象方法。若回调不应依赖 this，可声明 `this: void`，把需要的上下文作为普通参数传入。

这仍是类型检查，不会替运行时绑定接收者。JavaScript 调用方或错误断言能够绕过它；函数必须遵循真实调用方式。

### 五、返回值看提供什么，参数看能接住什么

**协变（Covariance）**和**逆变（Contravariance）**先用一句中文理解：

- 返回值：调用者只需要资料，实现返回字段更丰富的精选资料，通常没问题。
- 参数：调用者可能交来任意资料，处理器却只能处理精选资料，就可能访问不存在的字段。

```ts example=ts06-variance
type Note = { title: string };
type FeaturedNote = Note & { badge: string };

const produceFeatured = (): FeaturedNote => ({ title: '闭包', badge: '精选' });
const produceNote: () => Note = produceFeatured;

const readAnyNote = (note: Note) => note.title;
const readFeatured: (note: FeaturedNote) => string = readAnyNote;

function rejected() {
  const onlyFeatured = (note: FeaturedNote) => note.badge.toUpperCase();
  // @ts-expect-error 接口可能提供普通 Note，而处理器承受不了
  const unsafe: (note: Note) => string = onlyFeatured;
}
console.log(produceNote().title); // => 闭包
console.log(readFeatured({ title: '泛型', badge: '精选' })); // => 泛型
```

从能力看，能读任何资料的函数当然能读精选资料；反过来不成立。在函数替换问题里，参数方向与返回值方向相反。这不是运行时隐式转换，而是检查替换后会不会破坏调用者的预期。

### 六、方法的双变例外不能当成安全证明

开启 strictFunctionTypes 后，函数属性的参数一般按更严格的方向检查；方法声明存在兼容性例外，参数允许**双变（Bivariance）**。两个看似只差语法的接口，可能给出不同结果。

```ts example=ts06-method-bivariance
type Note = { title: string };
type Featured = Note & { badge: string };
type MethodReader<T> = { read(value: T): string };
type PropertyReader<T> = { read: (value: T) => string };

const specificMethod: MethodReader<Featured> = {
  read: value => value.badge.toUpperCase(),
};
const accepted: MethodReader<Note> = specificMethod;

const specificProperty: PropertyReader<Featured> = {
  read: value => value.badge.toUpperCase(),
};
function rejected() {
  // @ts-expect-error 函数属性会拒绝不安全的参数缩窄
  const safer: PropertyReader<Note> = specificProperty;
}
try {
  accepted.read({ title: '普通资料' });
} catch (error: unknown) {
  console.log(error instanceof TypeError); // => true
}
```

例子故意让一个“编译接受”的调用在运行时失败，展示兼容规则的边界。为公共回调接口选择函数属性，可以让编译器更早拒绝这种替换，但还不能验证外部数据，也不能消除所有结构类型的不健全情况。

看到某个框架事件类型使用双变技巧时，不应照搬到整个业务层。先确认库需要兼容什么调用，再决定自己的接口是否需要相同取舍。

### 七、void 表示调用者忽略结果，async 失败仍要有人接住

`() => void` 通常表示“调用者不会使用返回值”，并非所有兼容函数都只能返回 undefined。因此数组 push 这样返回数字的函数，可以作为通知回调。

```ts example=ts06-void-async
const values: string[] = [];
const notify: (value: string) => void = value => values.push(value);
notify('已选择');

// command 要明确返回 Promise，让调用方负责等待和失败处理。
async function runCommand(command: () => Promise<void>): Promise<string> {
  try {
    await command();
    return '完成';
  } catch (error: unknown) {
    return error instanceof Error ? '失败：' + error.message : '失败：未知原因';
  }
}
console.log(values.join(',')); // => 已选择
console.log(await runCommand(async () => { throw new Error('保存冲突'); })); // => 失败：保存冲突
```

async 函数也可能被赋给返回 void 的回调，但调用方不会因此自动 await。外层同步 try/catch 抓不到稍后发生的 Promise rejection；只写 `void save()` 也只是忽略值，不会处理拒绝。

按钮事件需要发起异步命令时，可以调用一个内部自带 try/await/catch 的适配函数，再更新忙碌和错误状态。保存是否允许并发、取消之后是否可能已经提交，应继续对照[网络取消与结果](../chinese-guides/net-01-browser-network-fetch-reliability.md#net-01)。

### 八、通知、命令与取消各有不同承诺

不要把所有函数都命名成 onChange，再靠调用者猜意思。

| 接口用途 | 一种合适的约定 | 调用者需要知道 |
| --- | --- | --- |
| 告知选择变化 | `onSelect(id): void` | 返回值被忽略 |
| 请求执行保存 | `save(input): Promise<Result>` | 等待何时结束，哪些错误可恢复 |
| 可取消的加载 | 输入包含 AbortSignal | 取消等待还是撤销业务操作 |
| 本地值转换 | `format(value): string` | 不执行隐藏网络请求 |
| 订阅事件 | 返回清理函数 | 何时取消订阅，能否重复清理 |

“抛异常”和“返回失败分支”都可以成立，但要统一边界。例如协议校验失败返回带字段路径的 Result，程序内部意外则交给日志与兜底处理。不能只把返回类型写成 Promise<Success>，却让使用者从字符串消息猜授权失败、冲突和临时网络故障。

**AbortSignal** 是调用协议的一部分。发起者创建控制器、执行者订阅信号、资源结束后清理监听；业务写入是否已经发生，需要服务器给出结果，类型无法替你撤销。Result 的完整例子见[TS-07 的输入与错误模型](../chinese-guides/ts-07-runtime-contracts-validation-error-models.md#ts-07)。

### 九、受控与非受控要在接口里写出唯一来源

**受控组件（Controlled Component）**从外部 value 读取当前值，并通过回调请求改变；非受控组件从 defaultValue 初始化，再自行维护。把三个字段都设为可选，会放进很多难解释的组合。

```ts example=ts06-controlled-props
type Controlled = {
  mode: 'controlled';
  value: string;
  onChange: (next: string) => void;
  defaultValue?: never;
};
type Uncontrolled = {
  mode: 'uncontrolled';
  defaultValue?: string;
  value?: never;
  onChange?: (next: string) => void;
};
type InputProps = Controlled | Uncontrolled;

function initialValue(props: InputProps): string {
  return props.mode === 'controlled' ? props.value : props.defaultValue ?? '';
}
function rejected() {
  // @ts-expect-error controlled 必须有 onChange
  const missing: InputProps = { mode: 'controlled', value: '标题' };
  // @ts-expect-error 两种值来源不能同时出现
  const mixed: InputProps = { mode: 'uncontrolled', value: 'A', defaultValue: 'B' };
}
console.log(initialValue({ mode: 'uncontrolled', defaultValue: '草稿' })); // => 草稿
```

这里用显式 mode 帮助分支收窄；精确可选属性检查也阻止给 `value?: never` 填入 undefined 来混淆“没传”和“传了一个缺失值”。

类型描述的是配置，组件实现仍要兑现它：受控分支不把内部副本当最终值；defaultValue 通常只影响初始化；运行中切换模式要明确支持还是拒绝。对调用者暴露的命令句柄也应保持很小，例如 focus 和 reset，不直接暴露内部 DOM、请求控制器及整个状态对象。

### 十、让数据提供泛型线索，让回调消费推断结果

表格先收到资料行，才能知道 onSelect 的参数有哪些字段。把行写成 object，再让回调自行断言，会丢掉泛型本来应保留的关系。

```ts example=ts06-generic-table
type ListProps<Row> = {
  rows: readonly Row[];
  keyOf: (row: Row) => string;
  onSelect: (row: Row) => void;
};
function selectFirst<Row>(props: ListProps<Row>) {
  const first = props.rows[0];
  if (first === undefined) return;
  props.onSelect(first);
}
const rows = [{ id: 3, title: '条件类型' }];
let selected = '';
selectFirst({
  rows,
  keyOf: row => String(row.id),
  onSelect: row => { selected = row.title; },
});
console.log(selected); // => 条件类型
```

keyOf 和 onSelect 中的 row 都来自同一个 Row。空数组的读取需要处理 undefined，这不应被非空断言藏起来。此函数只是选择行为的最小实现，keyOf 留作列表渲染时取得稳定标识的接口说明。

回调也可能成为推断来源。如果产品希望类型范围完全由 rows 确定，可以在适当参数位置使用[TS-05 的 NoInfer](../chinese-guides/ts-05-conditional-infer-distribution.md#十一noinfer-让一个位置只接受结果不参与猜测)，或把“创建列表”和“注册回调”分成两步。先看具体错误，再加约束，避免把每个泛型都机械包上 NoInfer。

### 十一、公开类型也需要考虑真实调用者

包内部调用顺利，不代表别人消费声明文件时也顺利。常见遗漏包括：声明引用了未导出的内部类型；源码路径别名没有变成可解析入口；事件类型依赖调用者不存在的全局 DOM；旧编译器不认识新语法。

为公共接口保留几个代表性消费场景即可：正常调用、应拒绝的参数、联合调用、async 回调、声明导入。不需要为每个别名写一套重复测试。升级后让这些真实调用继续通过，比只比较类型打印文本更有价值。

JavaScript 消费者没有同等静态保障。重要的外部选项、消息和业务权限仍要运行时检查。类型文件里的“只有管理员能批准”不会执行授权；这个边界会在[TS-08 状态与权限](../chinese-guides/ts-08-domain-state-permission-modeling.md#ts-08)进一步说明。

### 十二、沿一次调用检查接口是否清楚

用“用户选择一条资料并点击保存”走一遍接口：

1. rows 决定行类型，选择回调收到完整行；列表为空时不触发。
2. onSelect 通知选择变化，不偷偷执行保存。
3. save 返回 Promise<Result>，调用者显示等待和可恢复失败。
4. 受控 value 由父层更新，组件没有另一份相互竞争的权威值。
5. 请求失败、取消、冲突分别有清楚的处理者；结束后移除不再需要的监听。

如果签名必须写很多重载，先检查是否把几种不同职责塞进同一个函数。若回调需要反复断言，先检查类型信息从哪里丢失。若编译接受却运行崩溃，检查方法双变、外部输入和 this 绑定。

最好的函数类型能让调用方很自然地写对代码；错误发生时，也能告诉他哪项约定没有满足。

### 参考与延伸阅读

- [TypeScript：函数](https://www.typescriptlang.org/docs/handbook/2/functions.html)：回调参数、重载、this 与 void。
- [TypeScript：strictFunctionTypes](https://www.typescriptlang.org/tsconfig/strictFunctionTypes.html)：方法语法例外。
- [TypeScript：类型兼容](https://www.typescriptlang.org/docs/handbook/type-compatibility.html)：函数替换与结构兼容。
- [继续阅读 TS-07](../chinese-guides/ts-07-runtime-contracts-validation-error-models.md#ts-07)：让真实输入满足函数以为自己拿到的类型。
