# PRECS-02 JavaScript 集合、键与成员关系

## PRECS-02

假设要做一份学习清单：资料按阅读顺序排列，可以用编号找到某篇资料，还要记住哪些资料已经收藏。这三个问题分别适合用 Array、Map 和 Set 表达。每一篇资料本身，则可以用普通对象描述。

### 学习前先确认

- 直接前置：[PREJS-03 对象、属性与方法](../chinese-guides/javascript-objects-properties-methods.md#prejs-03)。先能读懂对象字段和方法调用。

### Array 保留一列值的顺序

**数组（Array）**按下标访问成员，下标从 0 开始。适合回答“第二项是什么”以及“按顺序处理每一项”。

```js example=precs02-array
const titles = ['变量', '函数', '闭包'];
console.log(titles[1]); // => 函数
console.log(titles.join(' → ')); // => 变量 → 函数 → 闭包
console.log(titles.find((title) => title === '闭包')); // => 闭包
console.log(titles.find((title) => title === '原型')); // => undefined
```

已知下标读取与按条件寻找，是两种操作。`find` 从前向后检查，找到第一项就返回，找不到则返回 `undefined`。查找“闭包”时，这个例子检查了三项；它不是凭标题直接跳到第三项。

### Object 描述一条记录 Map 按键找到记录

`{ id: 'js-01', title: '作用域与闭包' }` 是一条记录，字段说明它包含什么信息。若有很多记录，想由 ID 找到其中一条，可以另外建立 **Map**。

```js example=precs02-map
const chapter = { id: 'js-01', title: '作用域与闭包' };
const byId = new Map([[chapter.id, chapter]]);
byId.set('js-02', { id: 'js-02', title: '原型与 this' });
console.log(byId.get('js-01').title); // => 作用域与闭包
console.log(byId.has('js-03')); // => false
console.log(byId.size); // => 2
byId.set('js-01', { id: 'js-01', title: '重新整理的讲义' });
console.log(byId.size, byId.get('js-01').title); // => 2 重新整理的讲义
```

对同一个键再次 `set`，会替换对应的值，不会增加第二个同名键。Map 可以按插入顺序迭代，但“按 ID 找到记录”与“资料应该按哪种业务顺序阅读”仍是两种关系，必要时用数组单独保存阅读顺序。

还有一个容易漏掉的区别：`get` 返回 `undefined`，既可能是没有这个键，也可能是这个键对应的值本来就是 `undefined`。需要判断存在性时用 `has`。

```js example=precs02-presence
const notes = new Map([['js-01', undefined]]);
console.log(notes.get('js-01'), notes.get('js-02')); // => undefined undefined
console.log(notes.has('js-01'), notes.has('js-02')); // => true false
```

普通对象也能按属性名保存数据。不过对象的属性键是字符串或 Symbol，其他键通常会转为字符串；它还可能继承原型属性。判断自有字段时使用 `Object.hasOwn`，不要把 `in` 的结果直接理解为“这条记录自己保存了这个字段”。固定字段的一条记录用对象很自然；需要频繁增删动态键、统计数量或使用其他类型键时，Map 更直接。

### 内容一样的对象不一定是同一个键

Map 中的对象键按**对象身份（object identity）**判断。分别创建两个 `{ id: 1 }`，它们的内容相同，身份却不同。

```js example=precs02-identity
const first = { id: 1 };
const second = { id: 1 };
const labels = new Map([[first, '已收藏']]);
console.log(labels.get(first)); // => 已收藏
console.log(labels.get(second)); // => undefined
```

如果你的业务把 `id: 1` 视为同一篇资料，就应考虑用稳定的 ID 作为键，而不是每次新建一个对象去查找。Map 不会替业务决定“这两个对象算不算同一条记录”。更完整的解释见 [B01 的对象身份](../chinese-guides/js-03-types-equality-copy-immutability.md#赋值之后谁和谁共用对象)。

### Set 只回答是否已经出现过

**Set** 保存不重复的成员。收藏资料时，如果只关心某个 ID 是否被收藏，不需要再为它配一个值，就可以使用 Set。

```js example=precs02-set
const favorites = new Set();
favorites.add('js-01');
favorites.add('js-01');
favorites.add('js-02');
console.log(favorites.size); // => 2
console.log(favorites.has('js-01')); // => true
favorites.delete('js-01');
console.log(favorites.has('js-01')); // => false
console.log(new Set([{ id: 1 }, { id: 1 }]).size); // => 2
```

最后一行不是去重失败，而是两个对象本来就有不同身份。按业务 ID 去重，可以先提取 ID，或建立按 ID 保存记录的 Map。Map 和 Set 对原始值使用 SameValueZero 比较，其中 `NaN` 可以识别为同一个成员，`+0` 与 `-0` 也视为相同；对象则看身份。

### 先确定问题再选择容器

| 当前问题 | 常见表达 |
| --- | --- |
| 第几项、按什么顺序处理 | Array |
| 一篇资料有哪些字段 | Object |
| 根据唯一编号找到资料 | Map |
| 编号是否已经出现过 | Set |

这些容器可以配合使用，但关系需要一致维护：从记录表删除资料时，收藏集合或顺序数组是否也要更新，要由业务规则决定。把同一个对象放进数组和 Map，也不会自动复制对象；它们可能共同指向同一条记录。

跨网络或保存为 JSON 时，还要明确转换方式。JSON 不会自动保留 Map、Set 的容器类型；直接 `JSON.stringify(new Map())` 得到的不是键值列表。可转换成键值对数组，并在读取后按约定重建。

### 接下来去哪里

[CS-02 常用数据结构、算法模式与正确性](../chinese-guides/cs-02-data-structures-algorithms-correctness.md#cs-02)会继续用栈、队列、索引和图说明：数据怎样组织，会影响什么操作容易、什么结果需要维护。

### 参考与延伸阅读

- [MDN：Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)——键、插入顺序与 Map 和对象的区别。
- [MDN：Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set)——成员判断与相等规则。
