# JavaScript 知识点讲义

## JS-03 类型、相等、拷贝与不可变更新

你复制了一份表单数据，在副本里改地址，原表单也跟着变了；两个字段完全一样的对象，比较结果却是 `false`。这不是两个独立的怪现象，而是同一个基础问题的不同表现：变量保存了什么，两个位置拿到的是否为同一个对象？

本文先区分值与对象身份，再解释相等、类型转换和复制。最后用一次真实的嵌套状态更新，把这些知识连成可以直接用于日常开发的判断方法。

### 学习前先确认

- 直接前置：[JS-02 原型、对象模型与 this](../chinese-guides/js-02-prototype-object-model-this.md#js-02)。需要理解对象属性、自有属性和原型查找。普通对象可以互相引用，读取属性也可能执行 getter。

每个示例都可以单独在现代浏览器控制台运行。涉及结构化克隆的示例使用 `structuredClone`；这是运行环境提供的 API，不是某个框架的功能。`// =>` 标出应看到的输出。

### 先区分原始值和对象

JavaScript 的原始类型包括 Undefined、Null、Boolean、Number、BigInt、String 和 Symbol。**原始值（primitive）**本身不可被原地修改。你可以给变量重新赋值，但那是让变量关联另一个值。

```js example=js03-primitives
let title = '草稿';
const savedTitle = title;
title = '已发布';
console.log(title); // => 已发布
console.log(savedTitle); // => 草稿
console.log('hello'.toUpperCase()); // => HELLO
```

调用字符串方法不会修改原字符串，而是产生结果值。字符串能调用方法，也不意味着字符串原始值已经成为一个普通的可变对象；语言会提供相应的属性访问行为。业务代码通常不需要 `new String()`、`new Number()` 这样的包装对象，它们会引入额外身份和真假判断差异。

对象则有身份，通常也允许修改属性。数组、函数、日期和 Map 都属于对象这一大类，但它们有各自的内部行为，不应该看到 `typeof value === 'object'` 就采用同一种复制方式。

### 赋值之后谁和谁共用对象

先让两个变量保存同一个对象，再分别观察“改属性”和“重新赋值”。

```js example=js03-alias
let original = { name: '小林' };
const alias = original;
alias.name = '小周';
console.log(original.name); // => 小周

original = { name: '小陈' };
console.log(original.name); // => 小陈
console.log(alias.name); // => 小周
```

`alias = original` 没有复制姓名，也没有复制整个对象。两个变量都能找到同一个对象，改动属性当然能从另一处看见。随后给 `original` 重新赋值，只改变这个变量关联的对象；`alias` 仍指向之前那个对象。

这可以称为按值传递对象引用：传递的是能找到对象的引用值，不是让两个变量名永远绑在一起。函数参数也一样。给参数重新赋值，不会替调用者重新赋值；通过参数修改共享对象的属性，则会被调用者观察到。

```js example=js03-parameter
const profile = { score: 0 };
function update(value) {
  value.score = 1;
  value = { score: 99 };
  return value;
}
const returned = update(profile);
console.log(profile.score); // => 1
console.log(returned.score); // => 99
```

`const profile` 限制的是不能让 `profile` 重新关联另一个值，并没有锁住对象属性。这也解释了为什么 [JS-01 的闭包](../chinese-guides/js-01-execution-context-scope-closure.md#闭包保存的是变量还是快照)可以不断修改 `const` 引用的对象：变量绑定与对象内容处在不同层面。

### 相等比较先决定你想比较什么

日常业务通常优先用严格相等 `===`，它不会先把两侧转换成同一种类型。原始值按各自类型的规则比较；对象则看身份，不递归比较字段。

```js example=js03-equality
const first = { id: 7 };
const second = { id: 7 };
const alias = first;
console.log(first === second); // => false
console.log(first === alias); // => true
console.log(7 === '7'); // => false
console.log(7 == '7'); // => true
```

两个对象拥有同样的 `id`，可能代表业务上的同一个用户，却仍然是两个 JavaScript 对象。要判断用户是否相同，就明确比较稳定的用户标识；要判断对象是否共享，就比较引用。用深比较代替所有身份判断，不仅可能昂贵，也可能掩盖业务定义不清的问题。

宽松相等 `==` 会遵循类型转换规则。它并不是把所有东西都转成字符串，也不能仅靠直觉预测。一处常见的刻意用法是 `value == null` 同时匹配 `null` 与 `undefined`；团队若使用这种写法，应明确约定。其余业务判断通常先在输入边界完成类型转换，再用 `===`，更容易解释。

`===`、**同值比较（SameValue）**与 **SameValueZero** 在两个数字边界上不同。`Object.is` 实现 SameValue；Map 的键、Set 的元素，以及数组 `includes` 使用 SameValueZero。

| 比较情形 | `===` | `Object.is` | SameValueZero |
| --- | --- | --- | --- |
| `NaN` 与 `NaN` | 不相等 | 相等 | 相等 |
| `+0` 与 `-0` | 相等 | 不相等 | 相等 |
| 两个不同的普通对象 | 不相等 | 不相等 | 不相等 |

```js example=js03-samevalue
console.log(NaN === NaN); // => false
console.log(Object.is(NaN, NaN)); // => true
console.log(Object.is(0, -0)); // => false
console.log([NaN].includes(NaN)); // => true
console.log([NaN].indexOf(NaN)); // => -1
console.log(new Set([0, -0, NaN, NaN]).size); // => 2
```

这张表适合查阅，不必当作每日编码的记忆负担。遇到去重、缓存键和数值边界时，再确认具体 API 使用哪套规则。`Object.is` 不是“更严格的深比较”，它同样不会递归比较对象内容。

### typeof 和真假判断各自能告诉你什么

`typeof` 很适合做初步分支，但它不会给所有对象返回具体类别。`typeof null` 的结果是 `'object'`，这是历史行为；数组也返回 `'object'`，函数则返回 `'function'`。

```js example=js03-typeof
console.log(typeof null); // => object
console.log(typeof []); // => object
console.log(typeof (() => {})); // => function
console.log(Array.isArray([])); // => true
console.log(Number.isNaN('不是数字')); // => false
console.log(Number.isNaN(Number('不是数字'))); // => true
```

因此，“非 null 的对象”至少要写成 `value !== null && typeof value === 'object'`；这仍然没有确认它是否为你期待的普通记录、日期或数组。外部 JSON、表单与接口数据还需要按字段验证，单个 `typeof` 无法证明完整结构正确。

**真假值（truthy / falsy）**解决的是条件分支的问题，与相等比较不同。`false`、`0`、`-0`、`0n`、空字符串、`null`、`undefined` 和 `NaN` 都是假值。普通对象即使没有任何字段也是真值，空数组同样是真值。浏览器遗留的 `document.all` 是特殊例外，普通业务对象不应按它的行为推断。

所以不能用 `if (items)` 判断数组是否有元素，也不能用 `count || 10` 保留合法的 `0`。如果只想在 `null` 或 `undefined` 时补默认值，使用 `??`；如果空字符串也算“未填写”，则应另外明确这一条业务规则。

```js example=js03-default
const count = 0;
console.log(count || 10); // => 10
console.log(count ?? 10); // => 0
console.log(Boolean([])); // => true
console.log(Boolean('false')); // => true
```

字符串 `'false'` 有内容，因此是真值，不会因为单词拼成 false 就变成布尔值。接口若把布尔状态编码成字符串，应在读取边界做明确解析，不要用 `Boolean(value)` 代替业务转换。

### 转换类型时把意图写出来

加号既能做数值加法，也能做字符串拼接，这使表单输入中的隐式转换格外容易出错。

```js example=js03-conversion
const input = '12';
console.log(input + 3); // => 123
console.log(Number(input) + 3); // => 15
console.log(Number('')); // => 0
console.log(Number('12px')); // => NaN
console.log(Number.parseInt('12px', 10)); // => 12
```

`Number('12px')` 不能把整个字符串解释为数字，而 `parseInt` 会读取可识别的整数前缀。两者回答的问题不同。`Number('')` 得到 `0` 也说明：如果空输入应该报“必填”，就要先检查是否为空，不能先转换再期待数字 API 替你识别业务含义。

对象参与转换时，可能通过 `Symbol.toPrimitive`、`valueOf` 或 `toString` 执行自定义代码。大多数业务不需要主动设计这种隐式行为；看到对象参与 `+` 或 `==`，应意识到那里可能发生方法调用，而不是简单地比较一块内存。

Number 使用浮点表示，某些十进制小数无法精确表示。相等比较不会自动为金额或测量值提供容差；需要根据业务单位、舍入规则或误差范围处理。BigInt 用于任意精度整数，不是“小数更精确的 Number”，也不能在常见算术中与 Number 随意混用。这些都是数值模型问题，不应归咎于 `===` 太严格。

### 浅拷贝只复制一层

对象展开可以新建一个外层对象，但嵌套对象仍然共享。先同时观察身份与内容，差别会非常清楚。

```js example=js03-shallow
const original = {
  name: '小林',
  address: { city: '杭州' },
};
const copy = { ...original };
copy.name = '小周';
copy.address.city = '成都';

console.log(copy === original); // => false
console.log(copy.address === original.address); // => true
console.log(original.name); // => 小林
console.log(original.address.city); // => 成都
```

**浅拷贝（shallow copy）**只创建了新的外层容器。`name` 保存的是字符串值，给副本的 `name` 重新赋值不会影响原对象；`address` 保存的是同一个对象引用，通过它改 `city` 就会影响两边。

数组的 `slice()`、`[...items]` 也只复制外层数组。复制后 `push` 新元素不会让原数组变长，但修改 `copy[0].name` 仍可能影响原数组中的那个对象。判断复制是否足够，要沿着将要修改的路径逐层检查，不要只看到最外层 `copy !== original` 就停止。

对象展开复制自有的可枚举属性，包括符合条件的 Symbol 属性。它不复制原型，也不原样保留 getter、setter 和属性描述符；读取源 getter 时会执行它，结果以普通数据属性进入新对象。`Object.assign` 同样会读取源属性，但它还会向已有目标赋值，因此可能触发目标 setter。

```js example=js03-getter-copy
let reads = 0;
const source = {
  get price() {
    reads += 1;
    return 20;
  },
};
const copy = { ...source };
console.log(reads); // => 1
console.log(copy.price); // => 20
console.log(reads); // => 1
console.log(Object.getOwnPropertyDescriptor(copy, 'price').get); // => undefined
```

复制因此不一定是无副作用的“搬数据”。需要保留属性规则时，要单独考虑描述符；需要复制实例时，还要考虑内部状态。普通记录数据、具有访问器的对象、浏览器节点和类实例，不应共享一个含糊的“万能深拷贝”约定。

### structuredClone 能解决什么不能解决什么

**结构化克隆（structured clone）**适合复制受支持的数据图。它支持普通对象、数组以及 Date、Map、Set 等多种类型，能处理循环引用，也会保留副本内部原有的共享关系。

```js example=js03-clone
const address = { city: '杭州' };
const source = {
  primary: address,
  backup: address,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};
source.self = source;
const copy = structuredClone(source);

console.log(copy !== source); // => true
console.log(copy.primary !== address); // => true
console.log(copy.primary === copy.backup); // => true
console.log(copy.self === copy); // => true
console.log(copy.createdAt instanceof Date); // => true
```

“副本独立”不等于“副本中的所有引用都必须互不相同”。源对象的两个字段原本指向同一个地址对象，副本也应该保留这种关系，只是共同指向克隆出来的新地址。这是数据图中的关系保真，与逐层随意递归创建对象不同。

`structuredClone` 不能复制函数或 DOM 节点，也不能当作保留自定义类行为的工具。自定义原型链、属性描述符和私有字段等不会按原样重建。对于带方法、代理或宿主资源的复杂对象，应先提取明确的数据结构，再根据业务需要重新构造行为。

```js example=js03-clone-error
try {
  structuredClone({ run() {} });
} catch (error) {
  console.log(error.name); // => DataCloneError
}
```

它还提供某些可转移对象的 `transfer` 选项。转移 ArrayBuffer 等资源会让源端失去对应数据的使用能力，这已经不是无影响地“多复制一份”。没有明确的所有权交接需求时，不要为了看起来更快就添加 transfer。

JSON 序列化适合交换符合约定的 JSON 数据，不适合作为通用对象复制工具。它会改变或丢弃部分值，循环引用会报错，BigInt 默认也无法直接序列化。

```js example=js03-json
const source = {
  missing: undefined,
  amount: NaN,
  date: new Date('2026-01-01T00:00:00Z'),
};
const copy = JSON.parse(JSON.stringify(source));
console.log(Object.hasOwn(copy, 'missing')); // => false
console.log(copy.amount); // => null
console.log(typeof copy.date); // => string
```

如果数据本来就来自严格约定的 JSON，来回序列化可能足够；但“当前例子能跑”不等于“将来加一个 Date、函数或循环关系仍保持原语义”。先写清要保留什么，再选复制方法。

### 不可变更新沿修改路径创建新对象

**不可变更新（immutable update）**的重点是保留旧状态，让更新产生新的结果。它通常不要求把整棵数据全部深拷贝。只沿着变化的路径创建新容器，未变化的分支继续共享，就能同时表达变化和减少无谓复制。

```js example=js03-update
const previous = {
  profile: {
    name: '小林',
    address: { city: '杭州', street: '湖滨路' },
  },
  preferences: { theme: '浅色' },
};

const next = {
  ...previous,
  profile: {
    ...previous.profile,
    address: { ...previous.profile.address, city: '成都' },
  },
};

console.log(previous.profile.address.city); // => 杭州
console.log(next.profile.address.city); // => 成都
console.log(next !== previous); // => true
console.log(next.profile !== previous.profile); // => true
console.log(next.preferences === previous.preferences); // => true
```

变化发生在 `profile.address.city`，所以新建根对象、`profile` 和 `address`。`preferences` 没有变化，因此与旧状态共享。这叫**结构共享（structural sharing）**。

但共享有前提：之后也不能绕过更新规则，直接修改 `next.preferences.theme`，否则旧状态看到的同一对象仍然会变。不可变更新是一套持续遵守的使用方式，不是写过一次展开语法就自动获得的保护。

数组中的单项更新通常也遵循同一原则：用 `map` 新建数组，只为目标项创建新对象，其他项原样返回。不要先改旧项再把它放进新数组，那样只是换了外层容器，旧数据已经被修改了。若业务关系较复杂，还应先决定是否用实体 ID 统一管理，避免同一实体被散落复制后出现互相矛盾的版本。

### freeze 是保护措施不是更新策略

`Object.freeze` 会限制对象自有属性的新增、删除和某些修改，但它是浅层操作，不递归冻结嵌套对象。严格模式下，对冻结对象的普通只读属性赋值会抛错；非严格代码可能静默失败。

```js example=js03-freeze
function inspectFreeze() {
  'use strict';
  const settings = Object.freeze({ theme: '浅色', nested: { size: 1 } });
  try {
    settings.theme = '深色';
  } catch (error) {
    console.log(error.name); // => TypeError
  }
  settings.nested.size = 2;
  console.log(settings.nested.size); // => 2
}
inspectFreeze();
```

冻结 Map 对象也不等于禁止 `map.set()` 改变内部条目，因为这些条目不是普通自有数据属性。通用的深冻结还要处理循环引用、各种内置对象及性能成本；业务中更常见的是对自己明确掌控的数据结构使用开发期保护，而不是随意递归整个对象世界。

### 按需要选择比较和复制方式

| 你的实际需求 | 通常从哪里开始 | 需要确认的边界 |
| --- | --- | --- |
| 判断是否为同一对象 | `===` | 字段相同不代表身份相同 |
| 判断是否为同一个业务实体 | 比较稳定 ID | ID 的类型和所属范围 |
| 新建普通记录的外层容器 | 对象展开 | 嵌套引用与 getter |
| 更新嵌套状态并保留旧版本 | 沿路径复制，其他分支共享 | 后续不能直接修改共享分支 |
| 克隆可支持的数据图 | `structuredClone` | 支持的类型及转移副作用 |
| 与接口交换数据 | 明确 JSON 结构 | 丢失的类型是否符合约定 |

值、身份、复制和更新并不是四套孤立知识。判断一次修改会影响谁，先找共享引用；判断两份数据是否相同，先定义你要比较的是身份还是业务内容；需要副本时，再决定应该保留哪些类型与关系。下一篇 [JS-07](../chinese-guides/js-07-iteration-metaprogramming-resources.md#js-07)会在这个对象模型上继续解释迭代协议与代理。

### 参考与延伸阅读

- [MDN：Data types and data structures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Data_structures)——查阅原始类型、对象与类型转换的基础。
- [MDN：Equality comparisons and sameness](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Equality_comparisons_and_sameness)——需要确认某个 API 的相等规则时查表。
- [MDN：The structured clone algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)——核对支持的数据类型及不会保留的对象特征。
- [MDN：Object.assign](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)——进一步理解属性复制、getter 与 setter。
- [MDN：Object.freeze](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze)——查阅冻结的范围与浅层限制。
