# TypeScript 知识点讲义

## TS-02 联合类型、收窄、`never` 与穷尽检查

真实业务很少只有一种状态：请求可能尚未开始、正在加载、成功、为空或失败；一个输入可能是字符串、数字或尚未验证的外部值。把这些可能性写进类型后，程序不能再假装每个成员都拥有同样能力。TypeScript 会跟随 JavaScript 控制流逐步排除不可能情况，本讲要建立的正是“可能性集合如何被证明、缩小并最终处理完整”的模型。

### 学习前先确认

- 直接前置：[TS-01 类型系统、结构化类型与严格模式](../chinese-guides/ts-01-type-system-structural-strict-mode.md#ts-01)。它已经继续链接 JavaScript 类型、对象、函数与变量基础，这里不重复列出。

联合、交叉、控制流收窄、自定义守卫、`never` 与穷尽检查都在本讲从头解释。

### 一、联合类型表示多个可能值的集合

**联合类型（union type）** `A | B` 表示值可以属于 A，也可以属于 B：

```ts
function normalizeId(id: string | number): string {
  return String(id);
}
```

给联合类型提供值很容易，只要满足任一成员。使用它时却只能执行所有成员都支持的操作：

```ts
function printId(id: string | number) {
  // id.toUpperCase(); // number 没有这个方法
  console.log(id.toString()); // 两者都支持
}
```

可以把类型理解成允许值的集合。`string | number` 扩大了值的可能性，关于当前值的确定事实反而减少；只有证明它是 string 后，才能使用 string 专有能力。这不是编译器故意阻碍，而是调用者确实可能传入 number。

联合应表达一组有业务意义的可能性。为了让红线消失而不断追加 `| undefined | null | false | {}`，会把模糊责任扩散给所有下游。先确认这些值是否真的是合同的一部分，还是上游没有完成初始化或解析。

### 二、交叉类型要求同时满足多个约束

**交叉类型（intersection type）** `A & B` 表示值同时满足 A 和 B：

```ts
type Timestamped = { createdAt: Date };
type Identified = { id: string };
type Entity = Timestamped & Identified;

const order: Entity = {
  id: 'o-1',
  createdAt: new Date(),
};
```

交叉适合组合彼此正交的能力或字段，但不是“把两个任意业务模型安全合并”。若同名属性要求互不相容，交叉可能产生无法构造的类型：

```ts
type Left = { status: 'open' };
type Right = { status: 'closed' };
type Impossible = Left & Right;
// status 必须同时是 'open' 与 'closed'，结果落到 never
```

在对象运行时用展开合并时，后面的同名字段会覆盖前面的值；类型交叉却要求同时满足。不能把 `A & B` 误解成 `{ ...a, ...b }` 的运行时覆盖算法。组合前应先处理字段冲突和语义所有权。

联合扩大可能值集合，交叉缩小为同时满足的部分。这个集合视角会帮助理解后面的 `never`：当约束的交集为空，就没有任何合法值。

### 三、控制流让编译器追踪当前可能性

TypeScript 会分析分支、返回、赋值和可达性，根据路径调整变量类型，这叫**控制流分析（control flow analysis）**。从宽类型得到更具体类型的过程叫**类型收窄（type narrowing）**：

```ts
function format(value: string | number) {
  if (typeof value === 'string') {
    return value.trim(); // 这里是 string
  }

  return value.toFixed(2); // string 分支已返回，这里只能是 number
}
```

编译器不只看条件本身，也看某条路径是否已经 `return`、`throw` 或永远不继续。赋值还可能重新扩大或改变已知类型：

```ts
let value: string | number = 'ready';

if (typeof value === 'string') {
  value = 42;
  // 此后 value 是 number，不再是先前的 string
}
```

收窄是某个程序点上的事实，不是给变量永久改类型。跨越回调或 `await` 时，外部可变状态可能变化；编译器会在不能证明安全时收回部分收窄，代码也应重新读取或复制稳定值。

### 四、typeof 有用，但要知道 JavaScript 的历史边界

`typeof` 可以可靠区分 `string`、`number`、`boolean`、`bigint`、`symbol`、`undefined`、`function` 与一般 object。最著名的例外是 `typeof null === 'object'`：

```ts
function readName(value: unknown) {
  if (typeof value === 'object' && value !== null) {
    // 这里只证明是非 null 对象，还没证明存在 name
  }
}
```

数组同样是 object，需要 `Array.isArray`。Date、Map、DOM 元素和普通记录都有自己的运行时品牌或结构，不能只靠 `typeof value === 'object'` 就断言为目标类型。

`typeof value === 'function'` 会把值收窄到可调用函数，但外部对象可能是代理或有特殊行为；执行仍可能抛错。类型证明某个操作在静态合同上允许，不承诺操作一定成功。

### 五、真假判断可能丢掉合法的零和空字符串

`if (value)` 会排除 JavaScript 假值，包括 `false`、`0`、`-0`、`0n`、空字符串、`null`、`undefined` 和 `NaN`。它适合合同本来就是“有值/无值”的场景，却不适合把合法的 0 或空字符串当作缺失：

```ts
function showCount(count: number | null) {
  if (count) {
    return `数量：${count}`;
  }
  return '未提供'; // count 为 0 时也会走这里，语义错误
}
```

更准确的判断是 `count !== null`。同样，`name || '匿名'` 会把合法空字符串替换掉；若只想处理 null/undefined，应使用 `name ?? '匿名'`。收窄条件首先是业务语义，其次才是写法短不短。

`Boolean(value)` 产生 boolean，但未必保留为类型守卫关系；双重否定 `!!value` 可能得到更具体字面量。不要为了诱导编译器而写难懂条件，显式比较通常更可靠。

### 六、相等判断可以同时收窄多个变量

严格相等能让编译器利用类型交集：

```ts
function compare(left: string | number, right: string | boolean) {
  if (left === right) {
    // 两者在此只能都是 string
    return left.toUpperCase();
  }
  return null;
}
```

`value == null` 是少数有明确用途的宽松相等写法：它同时匹配 null 与 undefined，而不匹配其他常见假值。团队若采用这条约定，应在规范和 lint 中明确；否则使用 `value === null || value === undefined` 更直白。

对象相等仍按身份。`left === right` 证明两个引用是同一对象，不证明两个独立对象字段内容相同。类型收窄不能改变 JavaScript 相等语义。

### 七、in 与 instanceof 依赖真实运行时结构

`'key' in value` 检查属性是否存在于对象自身或原型链中，并可收窄含有该属性的联合成员：

```ts
type FileResult = { bytes: Uint8Array } | { error: string };

function describe(result: FileResult) {
  if ('error' in result) return result.error;
  return `${result.bytes.byteLength} bytes`;
}
```

若多个成员都把 `error` 定义为可选属性，`in` 的真假分支仍可能包含多个成员，不能完成互斥。外部对象还可能从原型继承属性；做数据解析时通常需要 `Object.hasOwn` 与字段值校验，而不是把 `in` 当作完整 Schema。

`value instanceof Constructor` 检查构造函数的原型是否出现在对象原型链上，适合 Date、Error、DOM 类等同一 realm 中的实例。跨 iframe/realm 的对象可能来自另一份构造函数，序列化后的数据也失去原型，因此领域消息更适合使用显式判别字段和结构校验。

### 八、判别联合把状态与其专属数据绑在一起

多个对象成员共享一个字面量字段，并由它区分状态，形成**判别联合（discriminated union）**：

```ts
type LoadState<T> =
  | { kind: 'idle' }
  | { kind: 'loading'; requestId: string }
  | { kind: 'success'; data: T; receivedAt: number }
  | { kind: 'empty'; receivedAt: number }
  | { kind: 'error'; message: string; retryable: boolean };
```

每个状态只携带此时合法的数据：loading 才有 requestId，success 才有 data，error 才有 retryable。相比下面这种“许多可选字段”的模型，它更难形成矛盾：

```ts
type WeakState<T> = {
  loading: boolean;
  data?: T;
  error?: string;
};
```

弱模型允许 `loading: true` 同时存在 data 和 error，也允许三者都没有。判别联合把这些**不可能状态（impossible state）**排除在可构造类型之外，使渲染逻辑不必反复猜组合优先级。

```ts
function view(state: LoadState<string[]>) {
  switch (state.kind) {
    case 'idle':
      return '尚未加载';
    case 'loading':
      return `正在加载 ${state.requestId}`;
    case 'success':
      return state.data.join('、');
    case 'empty':
      return '暂无数据';
    case 'error':
      return state.retryable ? `可重试：${state.message}` : state.message;
  }
}
```

判别字段应是稳定、必需、互斥的字面量。若把 `kind` 写成 `string`，编译器无法根据值排除成员；若字段可选，缺失分支又会产生歧义。

### 九、自定义类型守卫是一份需要实现者负责的承诺

有些结构判断重复出现，可以封装为返回 `value is T` 的函数。返回类型中的 `value is T` 叫**类型谓词（type predicate）**：

```ts
type User = { id: string; name: string };

function isUser(value: unknown): value is User {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return typeof record.id === 'string' && typeof record.name === 'string';
}
```

编译器不会自动证明函数体真的足以推出 User；它相信开发者写下的谓词。因此一个总是返回 true 的守卫会让整个下游错误地获得类型安全外观：

```ts
function isUserUnsafe(_value: unknown): _value is User {
  return true;
}
```

守卫应逐项验证目标类型依赖的运行时事实，并用反例测试缺字段、错类型、null、数组和嵌套错误。若目标类型改变，守卫也必须同步更新。对复杂合同，Schema 库可从单一规则生成推断类型，减少手写类型与校验漂移，但未知字段和转换策略仍需设计。

### 十、断言函数适合“失败就不能继续”的入口

返回布尔的守卫让调用者选择真假分支；如果检查失败必须抛错，可以写**断言函数（assertion function）**：

```ts
function assertUser(value: unknown): asserts value is User {
  if (!isUser(value)) {
    throw new Error('用户数据无效');
  }
}

const payload: unknown = receiveMessage();
assertUser(payload);
console.log(payload.name); // 此后收窄为 User
```

断言函数适合应用启动配置、不可恢复协议错误和测试辅助。面向用户输入时，直接抛异常未必是最佳体验；解析器可以返回带字段路径的成功/失败联合，让调用方展示可修复信息。

断言函数同样是承诺。函数如果在条件不满足时仍正常返回，编译器就会接受一个不真实的类型事实。命名使用 `assert` 能提醒读者失败会中断控制流。

### 十一、赋值、别名与闭包会让收窄失效

对属性的收窄依赖对象在当前路径上没有被不透明代码改写：

```ts
function print(user: { name?: string }) {
  if (user.name !== undefined) {
    const name = user.name;
    setTimeout(() => console.log(name.toUpperCase()), 0);
  }
}
```

复制到局部 const 后，回调使用稳定字符串。若回调直接再次读取 `user.name`，外部代码可能在执行前删除或改写属性；即使某些版本的分析仍允许，也要从运行时所有权考虑竞态。

数组方法回调也可能让分析保守，因为回调何时执行、谁能修改别名并不总是可知。与其到处断言，先把已经证明的值保存到不可变局部变量，或设计不可变数据流。

`await` 同样是可重入边界。等待前检查组件仍活动，恢复时可能已经卸载；TypeScript 类型无法替你证明业务版本或生命周期仍有效。类型收窄解决值的形状，版本门禁解决时间上的资格。

### 十二、never 表示没有合法值

`never` 是不包含任何值的类型。一个函数若永远抛错或不可能正常结束，返回类型可以是 never：

```ts
function fail(message: string): never {
  throw new Error(message);
}
```

控制流排除联合的所有成员后，剩余也会成为 never。它不是 undefined、null 或 void：这些类型都有可能出现的运行时值，而 never 表示这条合同下不应有任何值。

类型运算中 never 也像空集合：`T | never` 仍是 T；交叉约束冲突时可能得到 never。条件类型的分布等高级行为会在后续知识点展开，本讲先把它用于完整状态处理。

若一个公开函数被推断为 never，先问它是否确实永不返回，还是分支、递归或类型约束写错。不要把 never 当作消除报错的占位符。

### 十三、穷尽检查把新增状态变成编译错误

确认联合的所有成员都被处理叫**穷尽检查（exhaustiveness checking）**。可以把剩余值交给只接收 never 的函数：

```ts
function assertNever(value: never): never {
  throw new Error(`未处理状态：${JSON.stringify(value)}`);
}

function view(state: LoadState<string[]>) {
  switch (state.kind) {
    case 'idle':
      return '尚未加载';
    case 'loading':
      return '加载中';
    case 'success':
      return state.data.join('、');
    case 'empty':
      return '暂无数据';
    case 'error':
      return state.message;
    default:
      return assertNever(state);
  }
}
```

以后加入 `{ kind: 'forbidden'; reason: string }` 而忘记处理，default 中的 state 不再是 never，编译器就会报错。`default: return ''` 会吞掉新增状态，失去这个保护。

还有一种写法是不写 default，并给函数标注明确返回类型，配合 `noImplicitReturns` 发现遗漏。`assertNever` 同时提供编译期检查和运行时最后防线，适合输入可能因版本漂移而越过静态假设的场景。

穷尽不是要求 UI 对所有未来字符串都预知。对外部开放协议，应先由运行时解析把已知成员转成内部封闭联合；未知成员走明确的“版本不支持”分支，而不是在输入处直接断言为内部类型。

### 十四、内部封闭联合与外部开放世界要分开

编译器看到 `LoadState` 时假设所有构造者都遵守类型。但服务器、缓存和旧客户端来自开放世界，可能发送未来新增的 `kind`。安全流程是：

```text
unknown 外部值
  ↓ 运行时解析
已知内部联合  或  明确的未知版本错误
  ↓ 穷尽处理
页面状态 / 领域动作
```

不要用 `JSON.parse(text) as LoadState<T>` 跳过解析。那会让编译器认为 default 不可达，运行时却可能真的收到未知状态。也不要为了兼容未来把 `kind` 直接写成 `string`；这样所有已知分支都失去精确收窄。

协议可以显式建模未知成员：

```ts
type ParsedMessage =
  | { kind: 'known'; value: ServerEvent }
  | { kind: 'unsupported'; rawKind: string };
```

外层先处理版本兼容，进入 `known` 后再对 ServerEvent 做穷尽业务处理。开放世界与封闭核心各有边界，既不欺骗编译器，也不让未知数据冲垮页面。

### 十五、具体示例：用判别联合设计状态机

判别联合不仅适合渲染，也能表达允许的状态转换。状态与事件分别是联合，转换函数集中决定下一状态：

```ts
type State =
  | { kind: 'idle' }
  | { kind: 'loading'; requestId: string }
  | { kind: 'success'; data: string[] }
  | { kind: 'error'; message: string };

type Event =
  | { type: 'load'; requestId: string }
  | { type: 'resolve'; requestId: string; data: string[] }
  | { type: 'reject'; requestId: string; message: string }
  | { type: 'reset' };

function transition(state: State, event: Event): State {
  switch (event.type) {
    case 'load':
      return { kind: 'loading', requestId: event.requestId };
    case 'resolve':
      if (state.kind !== 'loading' || state.requestId !== event.requestId) return state;
      return { kind: 'success', data: event.data };
    case 'reject':
      if (state.kind !== 'loading' || state.requestId !== event.requestId) return state;
      return { kind: 'error', message: event.message };
    case 'reset':
      return { kind: 'idle' };
    default:
      return assertNever(event);
  }
}
```

类型保证事件字段完整，运行时门禁保证旧 requestId 没有资格改变当前状态。类型不能单独证明时间顺序；控制流与业务不变量需要共同表达。

更严格的状态机可以限制某个状态允许哪些事件，但类型复杂度也会上升。先集中转换和穷尽事件，通常已比散落在组件里的布尔字段可靠；只有错误转移仍频繁出现时，再引入按状态映射事件的高级类型。

### 十六、数组过滤中的守卫要保留语义

数组常包含可选值：

```ts
const values: Array<string | undefined> = ['A', undefined, 'B'];
const defined = values.filter(
  (value): value is string => value !== undefined,
);
```

不要机械使用 `.filter(Boolean)` 并断言结果为 string[]，因为它还会移除合法空字符串；对数字则会移除 0。守卫条件应精确对应想排除的成员。

若过滤对象联合，可以复用已验证守卫：

```ts
const users = unknownValues.filter(isUser);
```

这要求 `isUser` 真正校验所有必要字段。过滤后的类型精度来自守卫承诺，运行时正确性来自守卫实现和测试；两者缺一不可。

### 十七、验证收窄代码要故意制造反例

类型层与运行时层应分别测试：

1. 合法联合成员能进入对应分支；
2. 新增成员但不补 switch 时，类型测试必须失败；
3. `@ts-expect-error` 记录本应拒绝的非法构造；
4. 守卫输入 null、数组、缺字段、错字段和看似相似的对象时返回 false；
5. 外部未知判别值进入兼容错误，不进入内部 `assertNever` 假设；
6. 对 0、空字符串、false 等合法假值验证不会被真假判断误删；
7. 对 `in`、`instanceof` 和跨消息数据验证实际运行时结构；
8. 对异步状态交换完成顺序，确认 requestId 门禁仍正确。

一个守卫只有成功样本，没有反例测试，最容易形成“编译器很满意、运行时全放行”的假安全。穷尽检查只有在联合成员保持字面量、没有被 `string` 或 any 冲淡时才有效。

### 常见误解

- “联合类型的值可以使用任一成员的全部方法”：收窄前只能使用所有成员共有的能力。
- “交叉类型就是对象展开合并”：交叉要求同时满足，运行时展开会按顺序覆盖同名字段。
- “`if (value)` 等于排除 null/undefined”：它也排除 0、空字符串、false 和 NaN。
- “有 `in` 就证明整个对象合法”：它只证明属性可被找到，还需检查自有性和字段值。
- “类型谓词会由编译器验证实现”：编译器信任谓词，错误守卫会欺骗所有下游。
- “default 返回空值最稳妥”：它会吞掉新增成员，破坏穷尽检查。
- “never 是没有返回值的 void”：void 允许正常返回 undefined，never 表示无法正常到达。
- “内部联合能描述所有未来服务端状态”：外部协议是开放世界，必须先运行时解析。

### 学完后应能说明

1. 联合与交叉从“允许值集合”的角度怎样扩大或缩小可能性。
2. typeof、真假、相等、in、instanceof 各自能证明什么，又有哪些运行时边界。
3. 判别联合如何把状态与专属数据绑定，并排除矛盾组合。
4. 类型谓词和断言函数为什么是开发者必须用实现和测试兑现的承诺。
5. never、穷尽检查、外部 unknown 解析怎样共同应对新增状态。
6. 类型收窄与请求版本门禁为何分别解决形状和时间资格问题。

掌握这些模型后，后续学习泛型、条件类型和组件 API 时，就能判断高级类型是在保留真实关系，还是只把简单业务隐藏进难以维护的类型体操。
