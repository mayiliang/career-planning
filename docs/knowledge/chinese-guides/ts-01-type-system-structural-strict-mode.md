# B03 异步边界、模块与类型

## TS-01 类型系统、结构化类型与严格模式

接口文档说用户名是字符串，服务器却返回了数字。给它写上 `User` 类型之后，错误会自动消失吗？另一个文件传来带额外字段的对象，为什么有时能赋值，有时编辑器又报错？

TypeScript 要解决的是运行前的检查：当前代码知道这个值可能是什么，哪些操作与这些信息一致。它不会替服务器验证数据，也不会因为改了类型就改写对象。本篇用“编辑器认为是什么”和“运行时实际是什么”两条线，把这些边界讲清楚。

### 学习前先确认

- 直接前置：[JS-03 类型、相等、拷贝与不可变更新](../chinese-guides/js-03-types-equality-copy-immutability.md#js-03)。先分清原始值、对象身份和赋值；没有写过 TypeScript 也可以从本篇开始。

TypeScript 代码需放进 TypeScript Playground 或项目中的 `.ts` 文件，经过检查和转换后运行，不能原样粘进普通浏览器 Console。每个示例独立使用。本篇按项目现有 TypeScript 5.7.2 核对，并开启 `strict`、`noUncheckedIndexedAccess` 和 `exactOptionalPropertyTypes`。

示例中的 `@ts-expect-error` 标明下一行故意展示一个类型错误。可以删除注释查看诊断；它不是推荐的修复方式。包含非法调用的函数不会被运行，避免为了观察编译错误而触发不必要的运行异常。

### 类型注解先帮助发现不合适的调用

**静态类型检查（static type checking）**在执行之前检查代码。函数参数写成 string，就明确要求调用方提供字符串。

```ts example=ts01-first-check
function heading(title: string): string {
  return title.trim().toUpperCase();
}
console.log(heading('  closure  ')); // => CLOSURE
function invalidCall() {
  // @ts-expect-error 数字不满足参数要求；此函数不运行。
  heading(42);
}
```

编译器不是先执行了 `heading(42)` 才知道有问题。它看到参数位置需要 string，而传入的是 number，就能提前指出不一致。

转换成 JavaScript 后，参数后面的 `: string` 和返回类型会被移除；这种**类型擦除（type erasure）**不产生运行时验证器。调用仍然是普通 JavaScript 函数调用。若坏数据绕过检查到达这里，`trim` 仍可能在运行时报错。

所以类型帮助开发者维护已知关系，运行时检查负责确认未知输入。二者互相补充。也不要把所有 TypeScript 语法都当成纯擦除标记：某些语言扩展会生成 JavaScript，类和函数本身也当然仍然存在；这里讨论的是类型注解等静态信息。

### 明确边界其余信息让编译器推断

多数局部变量不必重复写类型。初始化值、运算和函数使用位置，都可以提供**类型推断（type inference）**的依据。

```ts example=ts01-inference
let completed = 2;
completed += 1;
const titles = ['scope', 'closure'];
const upper = titles.map((title) => title.toUpperCase());
console.log(completed, upper.join(',')); // => 3 SCOPE,CLOSURE
function invalidAssignment() {
  // @ts-expect-error completed 根据初始化推断为 number。
  completed = '三';
}
```

`completed` 初始化为数字，后续允许其他数字，但不允许字符串。map 的回调参数 `title` 来自 string 数组，编译器可以沿这个使用位置推断它是 string。这叫**上下文类型（contextual typing）**。

把回调单独提出来，失去上下文后参数不一定还能推断。公共函数参数、跨模块输入输出等边界值得写清类型；局部数组已经清楚是字符串时，不需要给每一次遍历都重新注解。

类型不会因为变量后来暂时拿到一个更具体值，就永远禁止原声明允许的其他值。声明类型与某个程序点的已知类型不同；下一篇会用分支和赋值解释这种变化。

### 字面量保留多少取决于是否可能改写

字符串类型 string 允许很多字符串；字面量类型 `'idle'` 只允许这个具体字符串。可以用它描述一个状态名。

```ts example=ts01-widening
function acceptMode(mode: 'idle' | 'loading') { return mode; }
const fixed = 'idle';
const mutableObject = { mode: 'idle' };
const fixedObject = { mode: 'idle' } as const;
console.log(acceptMode(fixed), acceptMode(fixedObject.mode)); // => idle idle
function invalidMode() {
  // @ts-expect-error 属性可改写，因此 mutableObject.mode 推断为 string。
  acceptMode(mutableObject.mode);
}
```

`const fixed` 不能重新赋值，因此可以保留 `'idle'`；`const mutableObject` 虽然不能改指向，属性仍能改成其他字符串，因此属性通常会**拓宽（widening）**为 string。const 保护绑定，不自动保护对象内容。

`as const` 对这个字面量表达式保留更具体的值，并把其中的对象属性和数组结构视为只读。但它不会调用 Object.freeze。如果字面量中引用了一个外部可变对象，也不意味着那个外部对象从此不能修改。

```ts example=ts01-const-alias
const shared = { title: '旧标题' };
const config = { shared } as const;
shared.title = '新标题';
console.log(config.shared.title); // => 新标题
console.log(Object.isFrozen(config)); // => false
```

这里保留的是对 shared 的引用，外部仍可以改它。想理解运行时的复制与冻结，应回到 [B01 的不可变更新](../chinese-guides/js-03-types-equality-copy-immutability.md#不可变更新沿修改路径创建新对象)，不能用 `as const` 替代数据设计。

### satisfies 检查要求同时保留具体信息

有时既想确认对象符合配置要求，又想保留它自己有哪些键、某个字段是哪一个字面量。**satisfies** 适合这个场景。

```ts example=ts01-satisfies
type Display = { align: 'left' | 'right'; label: string };
const display = { align: 'left', label: '标题' } satisfies Display;
const alignment: 'left' = display.align;
display.label = '正文';
console.log(alignment, display.label); // => left 正文
function invalidDisplay() {
  // @ts-expect-error center 不在允许的方向中。
  const wrong = { align: 'center', label: '标题' } satisfies Display;
}
```

这里验证 align 与 label 符合 Display，同时保留 align 的具体取值。`satisfies` 会参与上下文类型分析，所以不能把它描述为“完全不影响推断”；关键是它验证兼容性，不直接把整个变量的视图替换成目标类型。

| 写法 | 主要用途 |
| --- | --- |
| `const value: T = expression` | 检查初始化，并让变量按 T 的视图使用 |
| `expression satisfies T` | 检查满足 T，同时保留表达式的具体类型信息 |
| `expression as T` | 告诉编译器按 T 看待，不做运行时校验 |
| `expression as const` | 保留字面量与相应只读结构 |

这几个写法不是从弱到强的升级关系。例如值根本不符合配置，用 as 抹掉红线，不能达到 satisfies 检查配置的目的。

### 结构化类型比较需要的成员

**结构化类型（structural typing）**主要根据成员判断兼容性。目标只需要 id 和 title，来源有这两个字段并且类型相容，就可能用于这个位置。

```ts example=ts01-structure
type Chapter = { id: string; title: string };
const source = { id: 'js-01', title: '作用域与闭包', starred: true };
const chapter: Chapter = source;
console.log(chapter.title); // => 作用域与闭包
console.log(chapter === source); // => true
console.log(Object.keys(chapter).join(',')); // => id,title,starred
```

赋值没有创建新对象，也没有删除 starred。当前 `chapter` 的静态视图只承诺 id 和 title，而运行时仍是原来的对象。类型限制这段代码被允许怎样使用值，不是字段过滤器。

类型别名也不会仅凭名字创造新身份：`type UserId = string` 与 `type ChapterId = string` 仍然都接受字符串。如果确实不能混用，可以采用有区分字段的对象，或者在受控创建入口使用品牌类型。

```ts example=ts01-brand
type UserId = string & { readonly __brand: 'UserId' };
function parseUserId(value: string): UserId {
  if (!/^u-\d+$/.test(value)) throw new Error('用户编号格式无效');
  return value as UserId;
}
const id = parseUserId('u-12');
console.log(id); // => u-12
function invalidId() {
  // @ts-expect-error 普通字符串没有经过这个类型入口。
  const bypass: UserId = 'u-12';
}
```

品牌没有给运行时字符串增加真实字段，它约束的是静态使用方式。这里断言集中在已经检查格式的入口；如果随处允许 `as UserId`，区分能力就被绕开了。这个检查也只证明格式，不证明该用户真实存在或当前调用者有访问权限。

类的 private/protected 等成员会带来额外兼容规则，因此“结构化”不是所有类型都只看公开字段的一句万能口诀。先掌握普通记录的结构兼容，再逐步学习这些例外即可。

### 额外属性检查是在提醒字面量可能写错了

直接给一个明确类型传入对象字面量时，TypeScript 会额外检查可疑字段，帮助发现拼写错误。这叫**额外属性检查（excess property checking）**。

```ts example=ts01-extra-properties
type Chapter = { id: string; title: string };
const source = { id: 'js-01', title: '闭包', color: 'green' };
const allowed: Chapter = source;
console.log(allowed.title); // => 闭包
function suspiciousLiteral() {
  // @ts-expect-error 直接对象字面量包含 Chapter 未声明的 color。
  const checked: Chapter = { id: 'js-01', title: '闭包', color: 'green' };
}
```

先放进变量再赋值时，按一般结构兼容规则判断；直接字面量会接受额外检查。两者不是矛盾，也不说明“先放变量就完成了安全过滤”。外部输入允许多余字段、丢弃它们还是直接拒绝，仍然要由运行时解析规则决定。

函数也有兼容方向。要求“能处理任意章节”的位置，不能随便放入一个只会处理带答案章节的函数：调用者可能真的传入不带答案的章节。`strictFunctionTypes` 会加强普通函数类型在这些位置的检查，方法声明等语法仍存在例外。理解“谁会把什么传进来”，比只背箭头方向容易。

### any 和 unknown 代表两种完全不同的态度

`any` 大幅放宽当前检查；`unknown` 表示现在不知道，使用前需要提供依据。外部输入优先视为 unknown，能防止不确定信息无声地向内部扩散。

```ts example=ts01-any-propagation
const raw: any = JSON.parse('{"count":"3"}');
const count: number = raw.count;
console.log(typeof count); // => string
console.log(count + 1); // => 31
```

虽然变量注解是 number，实际值仍是字符串，`+` 因而产生拼接。编译器接受这次赋值，是因为 any 绕过了这处检查，不是因为把字符串转换成了数字。

```ts example=ts01-unknown
function readTitle(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('标题必须是非空字符串');
  }
  return value.trim();
}
console.log(readTitle('  闭包  ')); // => 闭包
try {
  readTitle(42);
} catch (error) {
  console.log(error instanceof Error ? error.message : '未知失败'); // => 标题必须是非空字符串
}
```

运行时的 typeof 真正检查值，编译器也借助这个条件允许后续字符串操作。类型信息与实际行为在这里对齐。

| 类型 | 能说明什么 | 不能误认为 |
| --- | --- | --- |
| `any` | 这处检查被大幅放宽 | 数据已经安全 |
| `unknown` | 使用前还不知道具体类型 | 可以直接读任意属性 |
| `object` | 非原始值 | 一定是普通 JSON 记录 |
| `{}` | 在严格空值检查下接受多数非 null/undefined 值 | 只能接收没有字段的对象 |
| `Record<string, unknown>` | 按字符串键读取的记录视图 | 每个字段都满足业务含义 |

比如数字 3 可以赋给 `{}`，却不是 object。选择这些宽泛类型时，应先确定实际要允许什么值，避免只因为名字像“对象”就拿来代替业务结构。

### 缺少属性和属性值为 null 是不同的信息

在部分更新请求里，没有传 summary 可以表示保持原值，传入 null 可以表示清空，传入字符串则表示设置。把三种情况混在一起，可能让一次小更新意外擦掉旧内容。

```ts example=ts01-optional
type Patch = { summary?: string | null };
function apply(current: string | null, patch: Patch): string | null {
  if (!Object.hasOwn(patch, 'summary')) return current;
  return patch.summary === undefined ? current : patch.summary;
}
console.log(apply('旧说明', {})); // => 旧说明
console.log(apply('旧说明', { summary: null })); // => null
console.log(apply('旧说明', { summary: '新说明' })); // => 新说明
function invalidPatch() {
  // @ts-expect-error 本篇开启 exactOptionalPropertyTypes，不允许显式 undefined。
  const patch: Patch = { summary: undefined };
}
```

`summary?` 表示属性可以缺失。读取时仍可能得到 undefined，因此要处理；开启 `exactOptionalPropertyTypes` 后，写入显式 undefined 需要类型明确允许，例如 `summary?: string | null | undefined`。

示例在运行时额外守住 undefined，是因为类型检查不能阻止未经校验的外部对象越过边界。若协议要求这种输入必须报错，也可以在解析入口拒绝，不能把静态类型当成已发生的校验。

`strictNullChecks` 则使 null 和 undefined 不再自动流入普通 string 等类型。它与“可选属性的精确写入规则”相关但不同。JSON 中对象字段值为 undefined 会被省略，null 会保留；设计接口时应把序列化后的实际含义一起考虑。

### 索引访问要承认这一项可能不存在

数组的元素类型是 string，不意味着每个下标都一定有值。空数组的第零项，在 JavaScript 中就是 undefined。

```ts example=ts01-index-access
const titles: string[] = [];
const first = titles[0];
console.log(first ?? '没有第一篇'); // => 没有第一篇
function invalidIndexUse() {
  // @ts-expect-error noUncheckedIndexedAccess 使 first 包含 undefined。
  first.toUpperCase();
}
const pair: [string, string] = ['作用域', '闭包'];
console.log(pair[0].toUpperCase()); // => 作用域
```

`noUncheckedIndexedAccess` 为没有证明存在的数组或索引签名访问加入 undefined。元组则可以明确固定位置存在。仅仅在旁边写了一个长度判断，并不保证编译器会把所有任意下标都收窄；可以先读取到局部变量，再检查该值。

字典也类似。`Record<string, Chapter>` 看起来声称任何字符串键都有一篇资料，但真实对象往往并不如此。根据使用方式，可以明确允许 undefined、用 Partial，或者使用 Map 的 get 返回值来表达不存在。不要为了少写一个判断而在整个项目关闭检查。

### readonly 限制当前写法不负责冻结对象

```ts example=ts01-readonly
type Chapter = { title: string };
const original: Chapter = { title: '旧标题' };
const view: Readonly<Chapter> = original;
original.title = '新标题';
console.log(view.title); // => 新标题
function invalidWrite() {
  // @ts-expect-error 通过这个只读视图不能写 title。
  view.title = '再次改写';
}
```

通过 view 不能写，并不代表其他别名也不能写。Readonly 通常只作用于当前这一层属性，更不会自动深冻结。状态是否能安全共享，需要同时看类型、对象身份和实际修改者。

如果需要一份不会随来源变化的显示数据，可能需要复制；如果需要保证业务状态只能由固定入口修改，需要收紧导出和写入能力。类型注解只是其中一部分。

### 严格模式是一组编译检查

TypeScript 的 **strict mode** 与 JavaScript 的 `'use strict'` 不是同一个开关。前者加强类型分析，后者影响 JavaScript 运行语义。

本篇示例的重要选项如下：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noEmit": true
  }
}
```

`strict` 在本篇核对版本中包含 noImplicitAny、strictNullChecks、strictFunctionTypes、strictPropertyInitialization、useUnknownInCatchVariables 等检查。`noUncheckedIndexedAccess` 和 `exactOptionalPropertyTypes` 需要另行打开，不会只因 strict 为 true 就自动启用。具体 strict 家族可能随 TypeScript 版本扩展，升级后出现新诊断应查看对应说明。

`noEmit` 表示只检查、不生成 JavaScript；要运行示例，使用 Playground 的 JavaScript 输出或项目已有转换流程。Babel、SWC、某些构建插件可以只移除类型而不做完整检查，因此“产物生成成功”不一定等于“类型检查通过”。项目应有明确的类型检查步骤。

旧代码迁移时，先处理接口输入、共享记录和公开函数，再修复真实空值与索引问题。批量加 any、`!` 或双重断言只会让诊断暂时消失。`@ts-expect-error` 比无条件忽略更适合记录一个有理由保留的预期错误：该行不再报错时，它也会提醒注释已失效。

### 类型断言改变看法不改变值

**类型断言（type assertion）**不会验证、转换或过滤数据。下面故意让声明与真实值冲突，并捕获实际错误。

```ts example=ts01-assertion
type User = { name: string };
const raw: unknown = JSON.parse('{"name":42}');
const user = raw as User;
console.log(typeof user.name); // => number
try {
  user.name.toUpperCase();
} catch (error) {
  console.log(error instanceof TypeError); // => true
}
```

同样，`value!` 不会检查非空，`as HTMLButtonElement` 不会证明 DOM 元素存在或标签正确。需要真实保证时，必须运行检查；断言只适用于已有依据但分析器无法表达的窄小位置，并把依据写在附近。

TypeScript 也不是对所有 JavaScript 行为都完备的安全证明。any、断言、声明不准确、可变别名和一些为兼容性保留的规则，都可能让静态结论偏离实际。严格检查有价值，但结论应当落在它真的检查过的范围里。

### 外部数据经过检查后再进入业务代码

网络 JSON、存储和跨窗口消息都来自当前静态检查之外。入口先当作 unknown，按实际规则检查，再创建下游需要的记录。

```ts example=ts01-parse-boundary
type Chapter = { id: string; title: string };
function parseChapter(value: unknown): Chapter {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('资料必须是对象');
  }
  if (!Object.hasOwn(value, 'id') || !('id' in value) || typeof value.id !== 'string') {
    throw new Error('id 必须是自有字符串字段');
  }
  if (!Object.hasOwn(value, 'title') || !('title' in value) || typeof value.title !== 'string') {
    throw new Error('title 必须是自有字符串字段');
  }
  if (!value.id.trim() || !value.title.trim()) throw new Error('字段不能为空');
  return { id: value.id.trim(), title: value.title.trim() };
}
console.log(JSON.stringify(parseChapter({ id: ' js-01 ', title: ' 闭包 ', extra: 7 }))); // => {"id":"js-01","title":"闭包"}
try {
  parseChapter({ id: 'js-01', title: 42 });
} catch (error) {
  console.log(error instanceof Error ? error.message : '未知失败'); // => title 必须是自有字符串字段
}
```

这里 Object.hasOwn 明确要求自有字段；in 让 TypeScript 也能建立属性可读取的关系，字段值随后仍需检查。只用其中一次存在性判断，不等于验证整条记录。

返回新对象明确丢弃 extra，并归一化空白。这是本例选择的规则，其他接口也可以保留或拒绝未知字段。该解析器面向普通 JSON 数据；任意带 getter 或 Proxy 的外部对象还有额外行为，不应把这种字段读取宣称为无副作用的通用安全沙箱。

Schema 库可以减少规则与类型重复，但仍要由项目决定未知字段、转换方式、错误路径和版本不兼容如何处理。进入业务代码后，尽量使用已经明确的数据；不要让每个组件再拿一份 any 各自猜测。

### 接下来用类型描述多种可能

这一篇先建立边界：值实际是什么，静态视图允许怎样使用，未知输入在哪里变成已检查的数据。下一篇 [TS-02](../chinese-guides/ts-02-unions-narrowing-never-exhaustiveness.md#ts-02)会进一步描述请求的加载、成功与失败状态，并用分支一步步缩小可能性。

### 参考与延伸阅读

- [TypeScript Handbook：Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)——常见类型、推断与断言。
- [TypeScript：Type Compatibility](https://www.typescriptlang.org/docs/handbook/type-compatibility.html)——结构兼容及其边界。
- [TypeScript：strict](https://www.typescriptlang.org/tsconfig/strict.html)、[exactOptionalPropertyTypes](https://www.typescriptlang.org/tsconfig/exactOptionalPropertyTypes.html)、[noUncheckedIndexedAccess](https://www.typescriptlang.org/tsconfig/noUncheckedIndexedAccess.html)——逐项核对编译选项。
- [TypeScript 4.9：satisfies](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html)——满足要求与保留类型信息。
- [MDN：JavaScript 数据类型](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Data_structures)——类型检查之外仍然成立的运行时事实。
