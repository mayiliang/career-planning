# TypeScript 知识点讲义

## TS-04 从一份模型派生清楚、可信的类型

资料对象里有 title、progress 和 createdAt。编辑表单想知道字段是否改过，配置表想为每种状态提供文案，事件处理器想让 progress 只接收数字。把这些类型各写一遍很容易漏改；一味自动派生，又可能把不该公开的字段带出去。

映射类型的价值是维护一条清楚的关系。读完本篇，你应能把转换用一句话说明，再用正反例检查编译器是否真的表达了它。

### 学习前先确认

- 直接前置：[TS-03 泛型、约束、keyof 与索引访问](../chinese-guides/ts-03-generics-constraints-keyof-indexed-access.md#ts-03)。需要知道 `keyof T` 提供键集合，`T[K]` 取得某个键对应的值类型。

下面每段 TypeScript 都可单独检查，使用 TypeScript 5.7.2，开启 `strict`、`noUncheckedIndexedAccess` 和 `exactOptionalPropertyTypes`。最后两项不因 strict 自动开启。标为 `@ts-expect-error` 的行故意保留错误；放在未调用函数中的非法操作不会实际执行。

### 一、映射类型逐个取键，再决定每个键的结果

**Mapped Type**（映射类型）可理解为类型层的表格加工：拿到一个键 K，为它生成属性类型。它不会在运行时遍历对象，也不会创建字段包装器。

```ts example=ts04-field-model
type FieldStates<T> = {
  [K in keyof T]: { value: T[K]; dirty: boolean };
};
type Note = { title: string; progress: number };
const fields: FieldStates<Note> = {
  title: { value: '作用域', dirty: false },
  progress: { value: 30, dirty: true },
};
console.log(fields.title.value); // => 作用域
console.log(fields.progress.value); // => 30
function invalid() {
  // @ts-expect-error progress 对应的 value 必须是 number
  fields.progress.value = '30';
}
```

展开过程如下：

| 当前 K | T[K] | 生成的属性 |
| --- | --- | --- |
| title | string | title: { value: string; dirty: boolean } |
| progress | number | progress: { value: number; dirty: boolean } |

这里关系确实稳定：每个字段都配自己的值和修改标记。若 title 需要富文本编辑，而 progress 必须通过独立审批才能变更，业务关系就不能仅靠“所有字段都包一层”表达。

### 二、readonly、可选与 undefined 是三件事

常见的同态映射 `[K in keyof T]` 会保留原属性修饰符。可以用 `-readonly` 去掉只读，用 `-?` 去掉可选，也可以添加它们。改变的是类型视图，真实对象仍需初始化。

```ts example=ts04-modifiers
type Draft<T> = { -readonly [K in keyof T]-?: T[K] };
type Source = { readonly id?: number; memo?: string | undefined };
const draft: Draft<Source> = { id: 7, memo: undefined };
draft.id = 8;
console.log(draft.id); // => 8
console.log(draft.memo === undefined); // => true
function invalid() {
  // @ts-expect-error -? 使 id 必须存在
  const missing: Draft<Source> = { memo: '说明' };
  // @ts-expect-error 在本篇配置下，id 不允许显式 undefined
  const wrong: Draft<Source> = { id: undefined, memo: '说明' };
}
```

在本篇开启精确可选属性的配置下，`id?: number` 表示可以不提供 id，提供时应为 number；`memo?: string | undefined` 明确允许提供 undefined，移除 `?` 后仍保留这项值类型。读取一个可选字段又要考虑它可能缺失，所以读取结果可能包含 undefined。不要把缺失、读取和赋值三种情况混成一句“可选就是加 undefined”。

内置 **Partial**、**Required**、**Readonly** 都主要改变这一层结构。下例的第一层不可重新赋值，嵌套对象仍可改，且没有运行时冻结。

```ts example=ts04-shallow-readonly
const source = { title: '旧标题', settings: { compact: false } };
const view: Readonly<typeof source> = source;
view.settings.compact = true;
source.title = '新标题';
console.log(view.title, view.settings.compact); // => 新标题 true
console.log(Object.isFrozen(view)); // => false
function invalid() {
  // @ts-expect-error 此类型视图不允许重写第一层 title
  view.title = '不允许';
}
```

### 三、Pick 与 Omit 不会从对象里删除字段

**Pick** 选择键，**Omit** 排除键，它们都只处理类型。给对象换一个更窄的变量类型，不会执行脱敏或序列化。

```ts example=ts04-runtime-projection
type Account = { id: number; name: string; recoveryToken: string };
const account: Account = { id: 3, name: '小林', recoveryToken: '教学占位值' };
const view: Omit<Account, 'recoveryToken'> = account;
console.log(Object.keys(view).join(',')); // => id,name,recoveryToken
const publicData: Pick<Account, 'id' | 'name'> = {
  id: account.id, name: account.name,
};
console.log(JSON.stringify(publicData)); // => {"id":3,"name":"小林"}
```

第一种写法如果拿去返回 JSON，真实值仍有 recoveryToken。第二种写法按允许字段创建了新对象，才真正改变输出内容。敏感输出优先采用明确 DTO 与正向字段投影，不依赖“排除目前知道的一个秘密”：以后新加的敏感字段可能自动落入 Omit 的剩余集合。

额外属性检查主要帮助发现新鲜对象字面量的误写，并非所有结构赋值都要求键完全相等。类型检查也不能替代接口输入校验或资源授权，可以接回 [SEC-01 的 source 与 sink](../chinese-guides/sec-01-xss-csrf-trust-boundaries.md#二沿-sourcetransformsink-追踪数据)。

### 四、只让指定字段可选，并保留业务关系

“编辑标题时，简介可以不传，但 id 必须传”可以用两块类型组合：保留其他字段，让指定字段变为可选。`Prettify` 只是把提示展开得更容易看，不赋予新能力。

```ts example=ts04-partial-by-keys
type Prettify<T> = { [K in keyof T]: T[K] };
type PartialByKeys<T, K extends keyof T> = Prettify<Omit<T, K> & Partial<Pick<T, K>>>;
type Edit = PartialByKeys<{ readonly id: number; title: string; summary: string }, 'summary'>;
const edit: Edit = { id: 1, title: '闭包' };
console.log(edit.title); // => 闭包
function invalid() {
  // @ts-expect-error 仅 summary 可选，title 仍然必须提供
  const missing: Edit = { id: 1 };
  // @ts-expect-error 原先 id 的 readonly 得到保留
  edit.id = 2;
}
```

但“修改价格必须同时填写理由”是字段之间的关系，单纯 Partial 允许两个字段各自缺失，表达不出要求。这时适合命令类型或判别联合，参见 [TS-02 的状态建模](../chinese-guides/ts-02-unions-narrowing-never-exhaustiveness.md#ts-02)。

联合类型还要小心：`Pick`、`Omit` 不会自动对每个联合成员分别保持全部关系。如果某个转换依赖分支，应先明确需要逐成员转换还是只处理公共表面，条件类型与分配规则将在 TS-05 继续展开。

### 五、Record 用有限键保证配置完整

**Record** 的键若是有限联合，适合表示每个状态都有一条文案。键若是任意 string，就要考虑实际对象里不存在该键。

```ts example=ts04-record-table
type Stage = 'idle' | 'pending' | 'failed';
const labels = {
  idle: '准备开始', pending: '处理中', failed: '请重试',
} satisfies Record<Stage, string>;
console.log(labels.pending); // => 处理中
const counts: Record<string, number> = { read: 3 };
console.log(counts['missing'] ?? 0); // => 0
function invalid() {
  // @ts-expect-error 有限键集合要求包含 failed
  const incomplete: Record<Stage, string> = { idle: '等待', pending: '处理中' };
  // @ts-expect-error 开启索引缺失检查后，动态读取可能是 undefined
  const missing: number = counts['missing'];
}
```

为开放字典选择 Map、显式缺失值或对应的索引检查，比通过断言假装值一定存在更清楚。有限表的穷尽性适合本批 [Passkey 的认证阶段](../chinese-guides/sec-03-webauthn-passkeys-authentication.md#五运行一个逐步推进的认证状态页)：增加一个阶段时，让编译器提醒缺少文案。

### 六、键重映射把字段名与值类型一起带过去

映射中的 `as` 可以改变生成的键。下面把 title 变为 onTitleChange，把 progress 变为 onProgressChange，同时让处理器参数仍对应原字段类型。

```ts example=ts04-change-handlers
type ChangeHandlers<T> = {
  [K in keyof T & string as `on${Capitalize<K>}Change`]: (value: T[K]) => void;
};
type Fields = { title: string; progress: number };
const handlers: ChangeHandlers<Fields> = {
  onTitleChange: value => console.log(value.toUpperCase()),
  onProgressChange: value => console.log(value + 1),
};
handlers.onTitleChange('scope'); // => SCOPE
handlers.onProgressChange(20); // => 21
function invalid() {
  // @ts-expect-error progress 的处理器只接收 number
  handlers.onProgressChange('20');
}
```

`keyof T & string` 排除 number 与 symbol 键，避免把所有 PropertyKey 都送进字符串命名规则。`Capitalize` 适合代码标识符，不是面向用户姓名的本地化大小写系统。

类型只规定“应该有这些处理器”，并没有实现事件发射。真实组件若发出 `progress-change`，而宿主等待 `onProgressChange`，仍然无法通信。公开接口和内部实现的责任可接回 [WEB-05 的组件接口](../chinese-guides/web-05-web-components-shadow-dom-interoperability.md#二先写调用方能依赖什么)。

### 七、映射成 never 可以删除键

在键的位置生成 `never`，表示该键不出现在结果中。下面只保留值为字符串或可选字符串的属性，让其他字段消失。

```ts example=ts04-filter-keys
type TextFields<T> = {
  [K in keyof T as NonNullable<T[K]> extends string ? K : never]: T[K];
};
type Model = { readonly title: string; summary?: string; progress: number };
const text: TextFields<Model> = { title: '泛型', summary: '保留文字字段' };
console.log(Object.keys(text).join(',')); // => title,summary
function invalid() {
  // @ts-expect-error progress 被过滤掉，不属于结果字段
  const wrong: TextFields<Model> = { title: '泛型', progress: 10 };
  // @ts-expect-error title 的 readonly 未被移除
  text.title = '修改';
}
```

这里先用 `NonNullable` 去除值中的 null/undefined，再判断是否属于 string。没有这一步，`summary?: string` 的读取类型包含 undefined，整个值类型就不满足 string。它表达的是“去掉空值后全部属于字符串”，而不是“联合中只要有一项是字符串就行”。

空集合 `never` 本身也满足某些 extends 判断，因此这不是接受任意复杂模型的万能筛选器。本例的输入范围已经写明；遇到回调、联合对象或特殊业务字段时，先写出期望保留的键，再决定条件。

### 八、模板字面量适合小而稳定的命名协议

**Template Literal Type** 把字符串联合组合成新联合。两个方向乘两个对齐方式，得到四种合法位置；三个各有一百项的联合组合，则可能生成一百万项候选。

```ts example=ts04-template-values
type Placement = `${'top' | 'bottom'}-${'start' | 'end'}`;
function parsePlacement(value: string): Placement | null {
  return value === 'top-start' || value === 'top-end'
    || value === 'bottom-start' || value === 'bottom-end' ? value : null;
}
console.log(parsePlacement('top-end')); // => top-end
console.log(parsePlacement('middle-center')); // => null
function invalid() {
  // @ts-expect-error 只允许四种位置名称
  const wrong: Placement = 'middle-center';
}
```

把用户输入写成 `value as Placement` 不会执行上面的判断。`Uppercase`、`Lowercase`、`Capitalize`、`Uncapitalize` 也是类型中的命名转换；运行时要产生同样名称，需要相应实现或显式映射表。

如果协议允许 Unicode、缩写或命名例外，不要追求一条模板推导所有情况。清楚的名称表通常比编译器和运行时代码各藏一套规则更容易维护。

### 九、satisfies 检查形状，as const 约束推断

**satisfies** 检查表达式是否符合目标类型，同时保留由表达式和上下文得到的推断结果。它并非保证所有字面量都完全不变，也不是运行时验证函数。

```ts example=ts04-satisfies
type Config = { mode: 'compact' | 'full'; retries: number };
const config = { mode: 'compact', retries: 2 } satisfies Config;
config.retries = 3;
const labels = { idle: '等待', done: '完成' } as const;
console.log(config.mode, config.retries); // => compact 3
console.log(labels.done); // => 完成
function invalid() {
  // @ts-expect-error 此表达式的 mode 被推断为字面量 compact
  config.mode = 'full';
  // @ts-expect-error as const 使该属性成为只读类型
  labels.done = '已完成';
}
```

如果你需要 config.mode 在运行中切换，应显式声明 `const config: Config = ...`，让该属性使用整个联合范围。不要因为 satisfies “更先进”就替换所有类型注解。

`as const` 帮助保留字面量、得到只读属性和元组类型，也不执行 Object.freeze。两种工具可以配合建立配置真源，但不能替代读取配置后的校验、权限或冻结策略。

### 十、递归只读必须先定义叶子和深度

**Deep Readonly** 没有一种适合所有 JavaScript 对象的唯一写法。Date、函数、Map、Set 和类实例都属于对象，但不能简单假定每个对象只是属性袋。

下面只支持普通数据对象、数组、元组和明确保留的 Date/函数叶子，最多展开三层。Map、Set 和任意类实例不在约定内，不应传入后就宣称得到了正确语义。

```ts example=ts04-deep-readonly
type Depth = 0 | 1 | 2 | 3;
type Previous = [0, 0, 1, 2];
type DeepReadonly<T, D extends Depth = 3> =
  T extends Date | ((...args: never[]) => unknown) ? T :
  D extends 0 ? T :
  T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K], Previous[D]> } : T;
type Note = { profile: { name: string }; tags: string[]; createdAt: Date };
const original: Note = { profile: { name: '小林' }, tags: ['TS'], createdAt: new Date('2020-01-01T00:00:00Z') };
const view: DeepReadonly<Note> = original;
view.createdAt.setUTCFullYear(2021);
console.log(view.createdAt.getUTCFullYear()); // => 2021
original.profile.name = '新名称';
console.log(view.profile.name); // => 新名称
function invalid() {
  // @ts-expect-error 三层范围内的普通属性被标为只读
  view.profile.name = '禁止';
  // @ts-expect-error 字符串数组得到只读数组表面
  view.tags.push('Vue');
}
```

保留 Date 让 getTime 等方法仍可调用，也让 setUTCFullYear 仍可修改内部值。这不是遗漏了一个 readonly，而是你选择把 Date 当作叶子。如果业务需要不会变化的时间，应使用时间戳、受控值对象或真正的运行时约束。

深度到零后，本例保留原类型，因此最深层仍可能可写。深度限制是公开约定，不应把名字简化成“所有层都不可变”。已有的可变别名仍能改同一个对象，深度再大也不会替你复制数据。

### 十一、数组与元组要保留原来的形状

对于直接基于 keyof 的同态映射，TypeScript 对数组、只读数组和元组有相应处理。不要把任意元组先拆成元素联合再装回数组，那样会丢失顺序、长度和位置类型。

```ts example=ts04-tuples
type ReadonlyView<T> = { readonly [K in keyof T]: T[K] };
type Pair = [title: string, progress: number];
const pair: ReadonlyView<Pair> = ['闭包', 60];
const tags: ReadonlyView<readonly string[]> = ['JS', 'TS'];
console.log(pair[0], pair[1]); // => 闭包 60
console.log(tags.length); // => 2
function invalid() {
  // @ts-expect-error 第二个位置必须是 number
  const wrong: ReadonlyView<Pair> = ['闭包', '60'];
  // @ts-expect-error 结果是只读元组
  pair[1] = 80;
  // @ts-expect-error 输入已经只读，结果也没有 push
  tags.push('Vue');
}
```

如果要移除只读容器表面，也应针对受支持范围表达。数组的元素对象是否继续只读、可选元组项是否保留、Date 是否保持方法，都需要独立例子。类型工具的输入域越宽，越不能只验证一个普通对象成功。

序列化更是另一件事：JSON 往返会把 Date 变成字符串，不会因为返回类型仍写 Date 而恢复原型。需要从接口数据建立领域对象时，应显式解析并构造。

### 十二、以错误可读性和维护成本决定抽象到哪一步

每个工具类型至少保留一个合法用法、一个预期非法用法和一个边界观察。例如 PartialByKeys 检查“目标键可缺失、其他键仍必填”，DeepReadonly 同时展示数组不可写与 Date 可变。预期错误注释若不再对应错误，编译器应提示过期；不要用 `any` 抹掉这个信号。

复杂条件、递归与模板联合会增加类型实例化成本，可能拖慢补全或生成难读错误。遇到实际慢点，可用 `tsc --extendedDiagnostics`、编译器 trace 和最小复现定位；不要仅凭类型看起来长就猜测性能，也不要承诺加一个别名一定更快。

公开工具的修饰符、叶子范围和键过滤规则都是兼容约定。改变它们即使没有修改运行时代码，也会影响消费者。若一个 API 只服务一处业务、各字段含义不同，直接写清楚的 CreateNoteInput 往往更合适；派生应消除稳定的机械重复，而不是隐藏业务决策。

学完后，拿一份自己的模型分别回答三个问题：哪些关系值得编译器推导？哪些值必须在运行时创建或验证？哪些安全输出应该显式列字段？能划清这三层，类型派生才会让代码更可信。

### 参考与延伸阅读

- [TypeScript：Mapped Types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html)：查阅映射修饰符、键重映射与过滤。
- [TypeScript：Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)：核对 Partial、Pick、Omit、Record 等工具的定义。
- [TypeScript：Template Literal Types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html)：观察名称推导、联合组合与键值关系。
- [TypeScript 4.9：satisfies](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html)：理解约束检查与推断结果的关系。
- [TypeScript 3.4：只读数组与映射](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html)：查阅元组、数组映射和 const assertion。
- [TypeScript：exactOptionalPropertyTypes](https://www.typescriptlang.org/tsconfig/exactOptionalPropertyTypes.html)：核对缺失与显式 undefined 的差别。
