# B03 异步边界、模块与类型

## TS-02 联合类型、收窄、never 与穷尽检查

一个请求可能正在加载，也可能成功或失败。若用三个彼此独立的字段表示它，页面就要不停猜测：既有 data 又有 error 时，到底显示什么？若服务器以后新增一种结果，原来的分支会不会默默漏掉？

这一篇把类型看成“值可能出现的情况”。联合列出可能性，运行时判断排除一部分，穷尽检查确认该处理的情况都已处理。我们会把这个模型用于数字与字符串、外部数据和一个小型加载状态机。

### 学习前先确认

- 直接前置：[TS-01 类型系统、结构化类型与严格模式](../chinese-guides/ts-01-type-system-structural-strict-mode.md#ts-01)。先分清静态检查与运行时事实，以及 unknown 为什么需要检查。

每个 TypeScript 示例独立使用，运行方式与 TS-01 相同。本篇按 TypeScript 5.7.2、strict 及前篇的两项额外选项核对。`@ts-expect-error` 表示故意保留的非法写法，可删除注释查看诊断；示例输出只来自标明可运行的路径。

### 联合列出可能性使用前先排除不适用的情况

**联合类型（union type）** `A | B` 表示值可以属于 A，也可以属于 B。它不意味着值立刻拥有两种类型的全部方法。

```ts example=ts02-union
function formatId(value: string | number): string {
  if (typeof value === 'string') return value.trim();
  return value.toFixed(0);
}
console.log(formatId('  js-01  ')); // => js-01
console.log(formatId(12)); // => 12
function invalidUse(value: string | number) {
  // @ts-expect-error number 不具备 trim，尚未排除这种可能。
  return value.trim();
}
```

进入函数时有两种可能。typeof 判断为 string 的分支可以调用 trim；这个分支已经 return，走到后面的就只可能是 number。编译器沿路径缩小可能范围，这叫**类型收窄（type narrowing）**。

| 程序位置 | 仍可能是什么 | 可以做什么 |
| --- | --- | --- |
| 刚进入函数 | string 或 number | 使用两者都支持的操作 |
| typeof 判断为 string | string | 调用 trim |
| string 分支已返回 | number | 调用 toFixed |

不一定只有 if 的花括号内才收窄。return、throw、赋值和可达路径，都属于**控制流分析（control flow analysis）**的依据。收窄反映的是这个程序点的已知事实，不是永久改写变量的声明类型。

### 交叉要求同时满足不是按顺序覆盖字段

**交叉类型（intersection type）** `A & B` 要求值同时满足两边。比如一条可定位、带标题的记录，需要同时包含 id 和 title。

```ts example=ts02-intersection
type Identified = { id: string };
type Titled = { title: string };
type Chapter = Identified & Titled;
const chapter: Chapter = { id: 'js-01', title: '闭包' };
console.log(chapter.id, chapter.title); // => js-01 闭包
type Conflict = { count: string } & { count: number };
function invalidIntersection() {
  // @ts-expect-error count 必须同时是 string 和 number，没有这种普通值。
  const impossible: Conflict = { count: 3 };
}
```

交叉里的 count 约束发生冲突，会成为 never。若冲突发生在用于判别的字面量字段上，整个交叉对象也可能被化简为 never。

这与 `{ ...first, ...second }` 不一样：运行时展开遇到同名字段，后者覆盖前者；类型交叉却要求两者同时成立。不能用一个 `A & B` 声明，就证明任意两个对象展开后安全地满足双方要求。

### 真假判断会顺便排除合法的零和空字符串

如果 count 可以是 0，`if (count)` 就不适合判断有没有提供数量。因为 0 也是假值。

```ts example=ts02-truthiness
function misleading(count: number | null): string {
  return count ? `数量：${count}` : '未提供';
}
function precise(count: number | null): string {
  return count === null ? '未提供' : `数量：${count}`;
}
console.log(misleading(0)); // => 未提供
console.log(precise(0)); // => 数量：0
function fallback(title: string | null) {
  return { truthy: title || '默认标题', nullish: title ?? '默认标题' };
}
const empty = fallback('');
console.log(empty.truthy); // => 默认标题
console.log(JSON.stringify(empty.nullish)); // => ""
```

`||` 会在左侧是假值时使用右侧，`??` 则只针对 null 和 undefined。哪个正确取决于业务：标题不允许空字符串时可以另做非空校验；允许空字符串表达“刻意留空”时，就不应当把它偷偷改成默认标题。

真假判断还会排除 false、NaN、0n 等值。写分支前先说明要排除哪些情况，比追求最短条件重要。`value == null` 是一种可以同时匹配 null 与 undefined 的惯用写法；若团队不使用这条约定，写成两个严格比较也很清楚。

### typeof in 和 instanceof 各自只证明一部分

typeof 对原始值很有用，但 `typeof null` 也是 object，数组也同样是 object。检查对象时，先排除 null；要求普通记录时，还要根据协议处理数组等情况。

```ts example=ts02-object-check
function describe(value: unknown): string {
  if (value === null) return '空值';
  if (Array.isArray(value)) return `数组，共 ${value.length} 项`;
  if (typeof value === 'object') return '非空对象，字段尚未检查';
  return typeof value;
}
console.log(describe(null)); // => 空值
console.log(describe([1, 2])); // => 数组，共 2 项
console.log(describe({ title: '闭包' })); // => 非空对象，字段尚未检查
```

对已经明确的对象联合，可以用 `in` 判断某个属性是否存在。

```ts example=ts02-in-check
type Download = { bytes: Uint8Array } | { error: string };
function describe(result: Download): string {
  if ('error' in result) return `失败：${result.error}`;
  return `${result.bytes.byteLength} 字节`;
}
console.log(describe({ bytes: new Uint8Array([1, 2, 3]) })); // => 3 字节
console.log(describe({ error: '格式无效' })); // => 失败：格式无效
```

这个联合中，error 能区分两个成员；但如果多个成员都拥有可选的 error 字段，in 就不一定能唯一识别成员。in 还会检查原型链，不能把它当作“自有业务字段已验证”。unknown 输入仍需要逐字段检查，见 [TS-01 的解析入口](../chinese-guides/ts-01-type-system-structural-strict-mode.md#外部数据经过检查后再进入业务代码)。

`instanceof Error` 等检查适合同一执行环境中使用相应构造函数创建的对象。不同 iframe 的 Error 可能来自另一份构造函数，序列化后也不再保留原来的实例关系。领域消息更适合用显式字段和结构校验，不要只凭 instanceof 推断所有跨环境数据。

### 相等比较也能帮助缩小可能性

如果一个值是 string 或 number，另一个是 string 或 boolean，两者严格相等时，当前声明中共同的可能类型只有 string。

```ts example=ts02-equality
function same(left: string | number, right: string | boolean): string {
  if (left === right) return left.toUpperCase();
  return '不同';
}
console.log(same('closure', 'closure')); // => CLOSURE
console.log(same(1, true)); // => 不同
```

这是编译器结合两个声明推导出的当前分支类型，没有改变 JavaScript 严格相等的运行规则。对象之间仍按身份比较，两个分别创建但字段相同的对象，不会因为类型相同就变成相等。

赋值也会改变当前已知类型。如果 `value: string | number` 刚被赋值为 42，在那一处它就是 number；之后再赋一个合法字符串，声明允许的范围仍然起作用。控制流跟踪当前情况，声明限定总体允许范围。

### 判别联合把一个状态和它需要的数据放在一起

先约定一个产品行为：开始新请求时暂时不展示旧结果；成功只展示结果，失败只展示错误。若用 `loading`、可选 data、可选 error 表示，类型仍可能允许“既在加载又同时有错误和结果”的组合，调用者必须自己猜优先级。

用一个必需的字面量字段区分对象成员，可以组成**判别联合（discriminated union）**。

```ts example=ts02-discriminated-state
type LoadState =
  | { kind: 'idle' }
  | { kind: 'loading'; requestId: number }
  | { kind: 'success'; data: string[] }
  | { kind: 'error'; message: string };
function label(state: LoadState): string {
  switch (state.kind) {
    case 'idle': return '尚未加载';
    case 'loading': return `正在加载第 ${state.requestId} 次请求`;
    case 'success': return state.data.length ? state.data.join('、') : '暂无资料';
    case 'error': return `读取失败：${state.message}`;
  }
}
console.log(label({ kind: 'loading', requestId: 2 })); // => 正在加载第 2 次请求
console.log(label({ kind: 'success', data: ['作用域', '闭包'] })); // => 作用域、闭包
function invalidState() {
  // @ts-expect-error success 必须提供 data。
  const broken: LoadState = { kind: 'success' };
}
```

判断 kind 后，编译器知道该成员拥有哪组字段。success 分支不用再问“data 到底有没有”，error 分支也不会误读 data。

这里 success 的 data 允许空数组，因此渲染时仍判断长度。把空结果另设一个 empty 状态也是一种设计，但单纯给 success 写 string[] 不会自动保证至少有一项。状态类型应当准确反映你的约定，不能仅凭命名推导额外保证。

保留旧数据并后台刷新也是合理体验，那就明确增加 refreshing 状态并携带旧数据。不能说“loading 与 data 同时存在永远错误”；真正需要避免的是产品含义没有确定，却让若干布尔字段任意组合。

### 类型守卫的承诺需要实现来兑现

重复的结构判断可以封装成**类型守卫（type guard）**。返回类型 `value is User` 是**类型谓词（type predicate）**，告诉编译器如何理解真假分支。

```ts example=ts02-type-guard
type User = { id: string; name: string };
function isUser(value: unknown): value is User {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    && 'id' in value && typeof value.id === 'string'
    && 'name' in value && typeof value.name === 'string';
}
const values: unknown[] = [{ id: 'u-1', name: '小林' }, null, { id: 'u-2', name: 42 }];
const users = values.filter(isUser);
console.log(users.map((user) => user.name).join(',')); // => 小林
console.log(isUser({ id: 'u-3' })); // => false
```

这份守卫检查 User 类型要求的两个字符串字段，允许其他字段存在，也没有要求非空。若业务需要非空、固定 ID 格式或自有字段，应再明确规则。结构类型要求什么，与业务还需要什么，要分开说清。

编译器不会完整证明你写的显式谓词正确。一个总返回 true 的 isUser 也可能让下游获得 User 类型，因此不能把“用了守卫”当成校验已经可靠的证据。

还要考虑 false 的含义。如果一个函数声称 `value is number`，却只接受正数，它会让 false 分支错误地排除所有 number，包括合法的 0。

```ts example=ts02-false-predicate
function isPositive(value: string | number): value is number {
  return typeof value === 'number' && value > 0;
}
function label(value: string | number): string {
  if (isPositive(value)) return '正数';
  return value.toUpperCase(); // 编译器相信这里已没有 number。
}
try {
  label(0);
} catch (error) {
  console.log(error instanceof TypeError); // => true
}
```

这段故意展示错误承诺。仅判断“是不是正数”，通常返回 boolean 就够了；判断“是不是 number”，则不要附加会遗漏 number 的限制。谓词要同时兑现两侧含义，不能只检查 true 分支的例子。

### 断言函数在检查失败时中断继续执行

普通守卫让调用方选择真假分支。若一个入口要求检查失败就不能继续，可以使用**断言函数（assertion function）**。

```ts example=ts02-assertion-function
function assertText(value: unknown): asserts value is string {
  if (typeof value !== 'string') throw new Error('必须提供字符串');
}
function upper(value: unknown): string {
  assertText(value);
  return value.toUpperCase();
}
console.log(upper('closure')); // => CLOSURE
try {
  upper(42);
} catch (error) {
  console.log(error instanceof Error ? error.message : '未知失败'); // => 必须提供字符串
}
```

`asserts` 告诉编译器：如果这个函数正常返回，条件已经成立。真正让它成立的是函数体中的检查和抛错；若条件不成立却正常返回，类型承诺同样会失真。

它与 `value as string` 不同：后者没有执行任何检查。断言函数适合必须满足的入口条件；用户可以修正的表单错误，也可以返回带字段说明的成功/失败联合，交给界面展示，不必全部抛异常。

### 等待期间可变对象可能已经变化

即使等待前的检查正确，恢复时再次读取同一个可变属性，仍可能得到另一个值。编译器对函数调用、别名和异步变化的分析存在边界，不会替你证明整个生命周期都安全。

```ts example=ts02-narrowing-lifetime
async function printAfterChange(user: { name?: string }, change: () => Promise<void>) {
  if (user.name === undefined) return;
  const snapshot = user.name;
  await change();
  console.log(snapshot.toUpperCase()); // => LIN
  console.log(user.name ?? '属性已经删除'); // => 属性已经删除
}
const user: { name?: string } = { name: 'Lin' };
await printAfterChange(user, async () => { delete user.name; });
```

这里保存的 snapshot 是一个字符串值，之后 user.name 被删除，不会改变已保存的字符串。若保存的是对象引用，则只是保住同一个对象，并没有自动得到深快照；可以回看 [B01 的绑定与快照](../chinese-guides/js-01-execution-context-scope-closure.md#闭包保存的是变量还是快照)。

不是所有 await 都必须让编译器丢弃收窄，也不能反过来认为“没有报错就证明等待期间没人修改”。涉及当前账号、页面是否还存在或请求版本时，应在提交前重新判断。类型描述值的形状，版本与资源归属描述它此刻是否还能使用。

### never 表示已经没有合法候选

`never` 表示不包含任何值。联合的所有可能都被排除后，剩下的类型就是 never；一个总抛错、不能正常返回的函数，也可以返回 never。

```ts example=ts02-never
function fail(message: string): never { throw new Error(message); }
function readTitle(value: string | null): string {
  if (value === null) fail('没有标题');
  return value.toUpperCase();
}
console.log(readTitle('closure')); // => CLOSURE
try {
  readTitle(null);
} catch (error) {
  console.log(error instanceof Error ? error.message : '未知失败'); // => 没有标题
}
```

fail 不会正常返回，因此后面的路径已经排除 null。它不是返回 undefined：undefined 是实际可出现的值，never 则表示这里不存在正常结果。

void 常用于表达调用方不依赖返回值，函数仍可以正常结束；never 表示无法正常到达返回后的路径。一个 async 函数即使永远拒绝，调用时仍会返回 Promise，它的返回类型通常应写 Promise<never>，而不是直接 never。

把类型看成集合，`T | never` 不增加新可能，结果仍是 T；不相容约束的交集则可能为空。这里先用这些直觉理解分支，不必马上进入复杂条件类型。

### 用穷尽检查让新增状态提醒所有处理者

如果 switch 已处理联合所有成员，default 中剩余值应该是 never。让一个函数只接收 never，就能把遗漏成员变成编译错误。

```ts example=ts02-exhaustiveness
type State = { kind: 'idle' } | { kind: 'done'; count: number };
function assertNever(value: never): never {
  throw new Error(`未处理的状态：${JSON.stringify(value)}`);
}
function describe(state: State): string {
  switch (state.kind) {
    case 'idle': return '尚未开始';
    case 'done': return `完成 ${state.count} 项`;
    default: return assertNever(state);
  }
}
console.log(describe({ kind: 'done', count: 3 })); // => 完成 3 项
```

新增状态却忘记修改处理函数时，剩余候选就不再为空。下面保留旧分支，并用预期错误注释标出遗漏位置。

```ts example=ts02-added-state
type State = { kind: 'idle' } | { kind: 'done'; count: number } | { kind: 'cancelled' };
function assertNever(value: never): never { throw new Error('遗漏状态'); }
function describe(state: State): string {
  switch (state.kind) {
    case 'idle': return '尚未开始';
    case 'done': return `完成 ${state.count} 项`;
    default:
      // @ts-expect-error 此处还剩 cancelled，不能传给 never。
      return assertNever(state);
  }
}
console.log(describe({ kind: 'idle' })); // => 尚未开始
```

修复方式是增加 cancelled 分支，决定取消后显示什么，而不是给 state 强行 `as never`。`default: return ''` 虽然能让函数继续运行，却让新增状态悄悄变成空界面，失去这种提醒。

明确返回类型并结合 noImplicitReturns 也可以帮助发现缺少返回的路径；assertNever 更直接表达“这里应当没有剩余成员”。它提供最后的运行时抛错，但不能代替外部输入解析。未经验证的服务器数据仍可能在运行时进入本以为不可能的分支。

### 外部未知状态先在入口处理

内部代码可以维护一个明确的联合，外部协议却可能发送未来新增的 kind。不要把整个外部值直接断言为内部类型，也不要为了接纳未来状态就把内部判别字段全部放宽为 string。

下面的解析入口区分已知事件、不支持的事件名和格式错误。

```ts example=ts02-open-boundary
type StudyEvent = { kind: 'progress'; percent: number } | { kind: 'done'; title: string };
type Parsed =
  | { kind: 'known'; event: StudyEvent }
  | { kind: 'unsupported'; rawKind: string }
  | { kind: 'invalid'; message: string };
function parseEvent(value: unknown): Parsed {
  if (typeof value !== 'object' || value === null || Array.isArray(value)
    || !('kind' in value) || typeof value.kind !== 'string') {
    return { kind: 'invalid', message: '缺少事件名称' };
  }
  switch (value.kind) {
    case 'progress':
      if ('percent' in value && typeof value.percent === 'number'
        && Number.isFinite(value.percent) && value.percent >= 0 && value.percent <= 100) {
        return { kind: 'known', event: { kind: 'progress', percent: value.percent } };
      }
      return { kind: 'invalid', message: '进度必须在 0 到 100 之间' };
    case 'done':
      if ('title' in value && typeof value.title === 'string') {
        return { kind: 'known', event: { kind: 'done', title: value.title } };
      }
      return { kind: 'invalid', message: '缺少标题' };
    default:
      return { kind: 'unsupported', rawKind: value.kind };
  }
}
console.log(JSON.stringify(parseEvent({ kind: 'paused' }))); // => {"kind":"unsupported","rawKind":"paused"}
console.log(JSON.stringify(parseEvent({ kind: 'progress', percent: 120 }))); // => {"kind":"invalid","message":"进度必须在 0 到 100 之间"}
console.log(JSON.stringify(parseEvent({ kind: 'progress', percent: 50 }))); // => {"kind":"known","event":{"kind":"progress","percent":50}}
```

只有 known 分支携带内部 StudyEvent，内部处理者可以继续穷尽判断；外部新增名称则走明确的兼容分支。这个例子面向普通 JSON 数据，允许额外字段，并在返回内部事件时只保留需要的字段。不同数据来源需要另外决定是否要求自有属性等规则。

类型里的 percent 是 number，不会自动表达百分比范围；范围保证来自解析器实际执行的判断。静态联合与运行时校验各自负责一部分，不能相互冒充。

### 类型描述状态版本判断决定谁能更新状态

将状态变化集中到一个函数，可以同时看清事件需要哪些字段，以及什么时机允许改变当前状态。下面用 requestId 拒绝过期结果。

```ts example=ts02-transition
type State =
  | { kind: 'idle' }
  | { kind: 'loading'; requestId: number }
  | { kind: 'success'; data: string[] }
  | { kind: 'error'; message: string };
type LoadEvent =
  | { type: 'start'; requestId: number }
  | { type: 'resolve'; requestId: number; data: string[] }
  | { type: 'reject'; requestId: number; message: string }
  | { type: 'reset' };
function assertNever(value: never): never { throw new Error('遗漏事件'); }
function transition(state: State, event: LoadEvent): State {
  switch (event.type) {
    case 'start': return { kind: 'loading', requestId: event.requestId };
    case 'resolve':
      if (state.kind !== 'loading' || state.requestId !== event.requestId) return state;
      return { kind: 'success', data: event.data };
    case 'reject':
      if (state.kind !== 'loading' || state.requestId !== event.requestId) return state;
      return { kind: 'error', message: event.message };
    case 'reset': return { kind: 'idle' };
    default: return assertNever(event);
  }
}
let state: State = transition({ kind: 'idle' }, { type: 'start', requestId: 1 });
state = transition(state, { type: 'start', requestId: 2 });
state = transition(state, { type: 'resolve', requestId: 1, data: ['旧结果'] });
console.log(JSON.stringify(state)); // => {"kind":"loading","requestId":2}
state = transition(state, { type: 'resolve', requestId: 2, data: ['新结果'] });
console.log(JSON.stringify(state)); // => {"kind":"success","data":["新结果"]}
```

| 事件 | 变化后的状态 | 理由 |
| --- | --- | --- |
| 开始请求 1 | loading，编号 1 | 建立第一次任务 |
| 开始请求 2 | loading，编号 2 | 当前任务已经更换 |
| 请求 1 成功 | 仍为 loading，编号 2 | 旧编号没有提交资格 |
| 请求 2 成功 | success，新结果 | 编号与当前任务匹配 |

类型要求成功事件携带 data、失败事件携带 message；运行时的编号比较保证旧事件不会覆盖当前状态。两种检查缺一不可。reset 后不再处于 loading，旧结果也会被忽略；编号必须在可能收到旧结果的生命周期内避免复用，否则旧编号可能碰巧再次匹配。

这个转换函数不负责真正启动网络，也没有自动取消请求。执行副作用的代码在外部获得结果后再发送事件，失败与清理由 [JS-05](../chinese-guides/js-05-promise-errors-async-control-flow.md#新请求开始后旧请求的清理也可能过期) 的规则管理。先把状态与副作用分清，比一开始设计庞大的泛型状态机更容易维护。

### 过滤时精确排除不需要的值

数组过滤也是一种收窄场景。想只删除 undefined，就直接表达这个条件，不要顺便删除空字符串。

```ts example=ts02-filter
const values: Array<string | undefined> = ['', undefined, '闭包'];
const defined = values.filter((value): value is string => value !== undefined);
console.log(JSON.stringify(defined)); // => ["","闭包"]
console.log(JSON.stringify(values.filter(Boolean))); // => ["闭包"]
```

前者保留合法空字符串；后者根据真假过滤，把它一起删掉。TypeScript 的新版本也能为一些简单回调推断谓词，但运行条件的业务含义不会因为推断更聪明就改变。本篇显式标注，是为了让返回的承诺清楚可见。

### 先问判断提供了什么证据

面对一个分支，先说清它排除了哪些值，再确认后续操作真的只需要这些证据。面对一个守卫，看看缺字段、错类型和 false 分支是否符合承诺。面对一个状态联合，试着增加一个成员，看看处理者是否会被提醒。

这些小反例能帮助理解类型，不需要围绕每段示例建立大量重复测试。真正值得保留的关系是：类型如何描述值，运行时判断如何证明当前情况，以及时间和副作用还需要哪些额外约束。以后学习泛型和组件接口时，也可以用同样的问题判断一个类型设计是否有用。

### 参考与延伸阅读

- [TypeScript Handbook：Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)——控制流、类型谓词、判别联合和穷尽检查。
- [TypeScript Handbook：More on Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html)——void、never 与函数返回约定。
- [TypeScript 5.5：推断类型谓词](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html)——过滤条件与谓词两侧的含义。
- [MDN：typeof](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof)、[in](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/in)、[instanceof](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/instanceof)——用于收窄的真实 JavaScript 判断。
