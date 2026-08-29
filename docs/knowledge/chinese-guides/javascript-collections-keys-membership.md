# PRECS-02 JavaScript 集合、键与成员关系

## PRECS-02

这份短文只解释在算法讲义里会反复用到的四种容器：Array、Object、Map 和 Set。重点不是背 API，而是知道“按位置取”“按键找”“判断是否出现过”分别在表达什么。

### 学习前先确认

- 直接前置：[PREJS-03 对象、属性与方法](../chinese-guides/javascript-objects-properties-methods.md#prejs-03)。函数与变量基础由它继续向下链接。

### Array：有顺序的一列值

**数组（Array）**把值按从 0 开始的下标排列。按下标读取适合“我知道第几个”的问题，顺序遍历适合“每一项都处理一次”的问题。

```js
const cities = ['北京', '上海', '广州'];
console.log(cities[1]); // 上海

for (const city of cities) {
  console.log(city);
}
```

数组也能用 `find` 查找某个成员，但它必须从前向后检查，直到找到或走到结尾。如果程序在另一个大循环里反复 `find`，应考虑是否真正需要“按键直接找”。

### Object 与 Map：从键找到值

对象的属性把字符串或 Symbol 键映射到值，适合描述一条有固定字段的记录，例如 `{ id, name, score }`。当键集合会动态增加、需要任意类型的键，或需要直接使用 `size`、迭代与删除操作时，**映射（Map）**通常更清楚。

把普通对象当动态字典时要记住三条边界：数字等非 Symbol 键会转成字符串；普通对象会继承原型上的属性，因此成员判断应优先用 `Object.hasOwn`；来自外部的任意键还可能碰到 `__proto__` 等敏感名字。确实需要无原型字典时可用 `Object.create(null)`，但当键完全动态、类型不限或来自不可信输入时，Map 往往能更直接表达意图。

```js
const scoreById = new Map();
scoreById.set('u-17', 92);
scoreById.set('u-42', 88);

console.log(scoreById.get('u-17')); // 92
console.log(scoreById.has('u-99')); // false
```

Map 中的对象键按**引用身份（reference identity）**判断，而不是按内容自动比较：

```js
const first = { id: 1 };
const second = { id: 1 };
const labels = new Map([[first, '已保存']]);

console.log(labels.get(first));  // 已保存
console.log(labels.get(second)); // undefined
```

如果业务上的身份是 `id`，通常应把稳定的 `id` 字符串作为键，而不是临时创建的对象。

### Set：只关心成员是否存在

**集合（Set）**保存不重复的成员，常用于去重、已访问标记和权限集合。`add` 加入成员，`has` 检查成员，`delete` 移除成员。

```js
const visited = new Set();

function visit(id) {
  if (visited.has(id)) return false;
  visited.add(id);
  return true;
}
```

Set 对对象的判断同样依赖引用身份。两个内容相同但分别创建的对象仍是两个成员。

### 选择容器时先问操作

不要先问“哪种结构最高级”，先问程序最常做什么：

- 要保持顺序、按下标访问或完整遍历：从 Array 开始；
- 要从稳定键找到对应值：考虑 Map；
- 只需知道成员是否出现过：考虑 Set；
- 要表达字段固定的一条记录：Object 往往最自然。

容器还会影响序列化与接口边界。普通 JSON 能直接表达数组和普通对象，却不会自动保留 Map、Set 的类型；跨网络或持久化前要明确转换规则。

### 接下来去哪里

- 想系统学习结构选择、算法模式与正确性，请进入 [CS-02 常用数据结构、算法模式与正确性](../chinese-guides/cs-02-data-structures-algorithms-correctness.md#cs-02)。
- 想理解对象身份、相等与复制，请读 [JS-03 类型、相等、拷贝与不可变更新](../chinese-guides/js-03-types-equality-copy-immutability.md#js-03)。

