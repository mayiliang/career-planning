# JavaScript 知识点讲义

## JS-03 类型、相等、拷贝与不可变更新

很多状态错误表面上像“复制失败”或“比较不准”，根因却是没有先分清值、对象身份和引用关系。这一讲先建立 JavaScript 的值模型，再依次讨论相等算法、浅拷贝、结构共享、结构化克隆和不可变更新。目标不是记住一种“万能深拷贝”，而是能根据数据边界选择正确策略。

### 学习前先确认

- 必需：[变量、绑定、声明与赋值](../chinese-guides/javascript-variables-and-bindings.md#prejs-01)
- 必需：[对象、属性与方法](../chinese-guides/javascript-objects-properties-methods.md#prejs-03)
- 如果原型与自有属性仍混淆，可先回看 [JS-02 的属性查找](../chinese-guides/js-02-prototype-object-model-this.md#js-02)

展开语法、相等规则、Map、Set、结构共享和 `structuredClone` 都会在本讲就地解释，不要求预先阅读总术语资料。

### JavaScript 操作的是值

JavaScript 的运行表达式会产生值。规范中的语言类型包括：

- `Undefined`
- `Null`
- `Boolean`
- `String`
- `Symbol`
- `Number`
- `BigInt`
- `Object`

前七类通常称为**原始值（primitive value）**。原始值本身不可变。例如字符串方法会返回新字符串，不会在原字符串内部改掉某个字符。

对象则可以包含可变属性。数组、函数、日期、Map、Set 都属于对象类别，而不是与 Object 平行的原始类型：

```js
typeof 1;          // 'number'
typeof 1n;         // 'bigint'
typeof 'hello';    // 'string'
typeof Symbol();   // 'symbol'
typeof {};         // 'object'
typeof [];         // 'object'
typeof function () {}; // 'function'，这是 typeof 的特殊结果
typeof null;       // 'object'，历史遗留结果，不表示 null 是对象
```

`typeof` 适合做一部分粗粒度判断，却不是完整类型检测器。数组用 `Array.isArray`；日期、Map 等还要结合数据来源、原型或专门 API 判断。跨 Realm 时，单纯依赖 `instanceof` 也可能失效。

### 对象变量保存的是身份关联

把对象赋给另一个变量，不会自动复制对象：

```js
const original = { name: 'Ada' };
const alias = original;

alias.name = 'Lin';
console.log(original.name); // Lin
```

`original`、`alias` 都能到达同一个对象身份。日常语言常说“变量里存着引用”，这个模型有助于画图；不要进一步假设实现必须暴露某种内存地址。

两个分别创建的对象即使属性完全相同，也具有不同身份：

```js
{ n: 1 } === { n: 1 }; // false
```

JavaScript 内建的普通相等运算不会自动递归比较对象内容。需要内容相等时，应先定义哪些属性属于语义、顺序是否重要、特殊类型如何处理，再编写或选择相应比较器。

### 四类常见相等规则

#### 宽松相等 `==`

`==` 会在部分类型组合之间执行转换。它的完整规则有确定规范，但读代码时容易漏掉转换路径：

```js
0 == false;   // true
'' == 0;      // true
null == undefined; // true
```

业务代码通常优先使用 `===`，不是因为 `==` 随机，而是因为避免隐式转换后更容易从源码看出意图。若刻意使用 `value == null` 同时匹配 `null` 与 `undefined`，应让团队能识别这是有意规则。

#### 严格相等 `===`

两边类型不同就不相等，不做上述类型转换。对象按身份比较。两个特殊数字规则需要记住：

```js
NaN === NaN; // false
+0 === -0;   // true
```

#### `Object.is`

`Object.is` 接近**同值比较（SameValue）**：

```js
Object.is(NaN, NaN); // true
Object.is(+0, -0);   // false
```

它仍不会递归比较两个对象的内容。

#### SameValueZero

`Array.prototype.includes` 以及 Map、Set 的键匹配采用 **SameValueZero**：`NaN` 与自身相等，但 `+0`、`-0` 不区分。

| 场景 | `NaN` 与 `NaN` | `+0` 与 `-0` | 对象比较 |
| --- | --- | --- | --- |
| `===` | 不相等 | 相等 | 按身份 |
| `Object.is` | 相等 | 不相等 | 按身份 |
| SameValueZero | 相等 | 相等 | 按身份 |

选比较方法时应从业务问题出发：是在判断同一实体、检测数值变化、查找集合键，还是比较序列化后的领域内容。

### 浅拷贝到底复制了什么

对象展开语法会创建一个新的外层普通对象，并把来源对象的可枚举自有属性值复制过去：

```js
const child = { score: 1 };
const first = { name: 'A', child };
const second = { ...first, name: 'B' };

console.log(first === second);       // false
console.log(first.child === second.child); // true
```

外层身份变了，`child` 属性中的对象值仍指向原来的嵌套对象。这就是**浅拷贝（shallow copy）**：只复制当前容器这一层的属性槽位，不递归复制所有后代。

因此下面的修改会同时从 `first` 观察到：

```js
second.child.score = 2;
console.log(first.child.score); // 2
```

`Object.assign({}, source)` 也是浅层复制。数组的展开 `[...items]`、`slice()` 等会创建新数组，但数组元素若是对象，仍保留相同对象身份。

对象展开不是属性描述符和原型的完整克隆。访问器可能在复制时被读取，结果通常成为目标对象上的普通数据属性；不可枚举属性不会被复制；原型也不会因 `{ ...source }` 自动变成来源原型。

### 不可变更新只复制发生变化的路径

**不可变更新（immutable update）**不是让 JavaScript 对象突然不可变，而是一种更新纪律：不修改旧状态所能到达的目标节点，构造一个能表达新状态的新根。

```js
const previous = {
  profile: {
    name: 'Ada',
    address: { city: 'Hong Kong' },
  },
  preferences: { theme: 'dark' },
};

const next = {
  ...previous,
  profile: {
    ...previous.profile,
    address: {
      ...previous.profile.address,
      city: 'Taipei',
    },
  },
};
```

这里从根到 `city` 的路径都创建了新对象，而没有变化的 `preferences` 被安全复用：

```js
next !== previous; // true
next.profile !== previous.profile; // true
next.profile.address !== previous.profile.address; // true
next.preferences === previous.preferences; // true
```

这种“变化路径复制、未变分支复用”称为**结构共享（structural sharing）**。它保留旧快照，减少不必要复制，也让依赖身份比较的界面和缓存能快速判断哪些分支变化。

结构共享安全的前提是之后不再去修改被复用的旧分支。如果多个独立领域对象本来就不应共享某个子对象，应在它们建立所有权的边界上分离，而不是等污染发生后才对其中一个做表面浅拷贝。

### 浅拷贝、深克隆与不可变更新不是一组同义词

- **浅拷贝**描述复制深度：只新建当前容器。
- **深克隆（deep clone）**试图为一张数据图创建独立副本，但“支持哪些类型、保留哪些语义”必须由具体算法定义。
- **不可变更新**描述是否保留旧状态不被修改，通常通过路径复制和结构共享实现，不要求整张图都复制。

如果只是把 `profile.name` 从 A 改成 B，整张状态树深克隆通常比路径复制更昂贵，也会让所有对象身份都改变，破坏本可复用的缓存与渲染优化。

### `structuredClone` 适合复制结构化数据

浏览器和现代 Node.js 提供 `structuredClone`。它实现**结构化克隆（structured clone）**算法，能处理循环引用，也能支持 Date、Map、Set、ArrayBuffer、类型化数组等多种内建数据类型：

```js
const source = {
  createdAt: new Date(0),
  labels: new Set(['js']),
  scores: new Map([['Ada', 10]]),
  child: { n: 1 },
};
source.self = source;

const cloned = structuredClone(source);

console.log(cloned !== source); // true
console.log(cloned.self === cloned); // true
console.log(cloned.createdAt instanceof Date); // true
console.log(cloned.scores instanceof Map); // true
```

循环图不是无限嵌套文本，而是节点之间有边重新指向已存在节点。结构化克隆会记住已经访问的对象，让新图中的对应边指向新图的对应节点。

例如 Map 的值也指向根对象：

```js
source.scores.set('root', source);
const cloneWithMapCycle = structuredClone(source);

console.log(cloneWithMapCycle.self === cloneWithMapCycle);
console.log(cloneWithMapCycle.scores.get('root') === cloneWithMapCycle);
```

两个断言验证的是克隆图中的身份关系，而不只是“打印出来看着一样”。

### `structuredClone` 的边界

结构化克隆不是任意 JavaScript 对象的镜像工具：

- 函数不能被克隆，会触发 `DataCloneError`。
- DOM 节点等不在支持范围内的宿主对象通常不能克隆。
- 普通属性描述符、getter/setter、对象原型和类的私有状态不能假定原样保留。
- Proxy 对象不能作为普通透明数据随意克隆。
- 大数据图的完整复制有时间和内存成本。

部分可转移对象还可以通过 `transfer` 转移底层资源，原一侧会失去使用能力。这适合明确的线程或消息所有权转移，不是普通状态更新的默认选择。

调用克隆前先定义数据契约：允许哪些类型，遇到不支持值是拒绝、预处理，还是改用领域专用序列化。静默丢字段通常比明确失败更危险。

### JSON 往返不是通用深拷贝

`JSON.parse(JSON.stringify(value))` 只适用于明确属于 JSON 数据模型的内容。它有许多可观察变化：

- 循环引用会让 `JSON.stringify` 抛错。
- Date 通常变成字符串。
- Map、Set 不会按原集合语义保存。
- 对象属性中的 `undefined`、函数、symbol 可能被省略。
- `NaN`、`Infinity` 可能变成 `null`。
- BigInt 不能直接序列化。

如果边界本来就是“发送 JSON 请求”，这些限制可能正是协议的一部分；如果目的是保存 JavaScript 对象语义，它就不是可靠的通用克隆方案。

### 选择策略时先问所有权

面对“要不要复制”时，可以依次问：

1. 我是在创建一个新的领域实体，还是更新同一实体的新快照？
2. 哪些嵌套对象允许共享，哪些必须拥有独立身份？
3. 数据只包含 JSON 类型，还是包含 Date、Map、Set、循环、二进制等结构？
4. 消费者是否依赖对象身份检测变化？
5. 不支持的值应明确拒绝，还是有经过设计的转换协议？

这些问题决定使用直接复用、浅拷贝、路径复制、`structuredClone`、转移，还是领域专用序列化。

### 常见误解

- **“展开语法就是深拷贝。”** 它只复制当前层的可枚举自有属性值。
- **“不可变更新必须复制整棵树。”** 通常只复制变化路径，安全复用未变分支。
- **“两个对象内容相同，`===` 就应该相等。”** 对象按身份比较；内容相等需要单独定义。
- **“JSON 能复制所有前端数据。”** JSON 有明确而有限的数据模型。
- **“structuredClone 保留任何类实例和方法。”** 它面向可结构化克隆的数据，不是任意运行时对象镜像。

### 学完后应能说明

1. 原始值与对象在可变性和身份比较上的差异。
2. `===`、`Object.is` 与 SameValueZero 如何处理 `NaN`、正负零和对象。
3. 一次嵌套状态更新中，哪些路径必须新建，哪些分支可以结构共享。
4. Date、Map、Set、循环引用、函数和 DOM 节点分别能否由 `structuredClone` 处理。
5. 为什么某个具体业务边界选择路径复制、结构化克隆或 JSON，而不是背诵“深拷贝最好”。

本讲的对象身份语义是 [JS-07 迭代协议、元编程与资源生命周期](../chinese-guides/js-07-iteration-metaprogramming-resources.md#js-07)的直接前置：迭代器和 Proxy 都是对象协议，代理也必须遵守目标对象已经存在的事实。
