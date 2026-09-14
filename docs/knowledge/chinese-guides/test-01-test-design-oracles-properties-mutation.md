# 测试知识点讲义

## TEST-01 从规则到测试证据

资料标题明明能保存，为什么还需要测试？因为“试过一次能用”没有回答这些问题：只有空格能否保存，两个字符是否刚好合法，保存失败后草稿还在不在，旧请求是否会覆盖新结果。

测试设计的起点是把这些模糊期待变成明确规则，再选择最能揭示规则的少量输入。这篇从一个标题校验函数出发，逐步解释边界、状态、不变量、替身和变异。重点是学会判断一项检查有没有用，而不是累积用例数量。

### 学习前先确认

本讲没有硬性前置。能阅读函数的输入和返回值即可开始。基础例子只需要 Node.js，属性测试另用 fast-check；正文明确区分两者，不要求一开始安装全部工具。

本批例子按 Node.js 22.23.0 核对。新建独立目录 `test-design-lab` 保存本讲文件，避免把教学中的故障修改带进正在使用的项目。

### 预期结果先从需求里找

**测试预言（test oracle）**是判断结果对错的依据，不是某个工具特有的功能。这里的规则先写成普通中文：

| 输入与条件 | 应有结果 | 规则的理由 |
| --- | --- | --- |
| 输入不是字符串 | 拒绝，并说明类型不符 | 接口和存储读出的数据不一定可信 |
| 输入是字符串 | 先去掉首尾空白 | 不让误输入的空格成为标题的一部分 |
| 处理后长度为 2～20 | 接受处理后的标题 | 本例产品明确采用包含两端的范围 |
| 处理后长度小于 2 或大于 20 | 拒绝 | 不让空标题或过长标题进入后续流程 |

本例特意把“长度”定义为 **Unicode 码点**数量，且不做 Unicode 规范化。它是一个明确的练习约定，不等于所有产品都应这样计数。用户眼中的一个字符可能由多个码点组成，若产品要求按感知字符计数，就需要另定规则与例子。

预言可以来自需求、协议、独立参考或不变量。若你把实现里的判断完整抄到测试里，两边可能一起写错。例如实现错把长度上限写成 19，测试也从同一个常量推导“20 必须拒绝”，整套检查会共同维护错误理解。

先用需求给出几个独立答案，再实现函数。下面保存为 `title.mjs`：

```js example=test01-title runtime=project file=title.mjs
export function parseTitle(value) {
  if (typeof value !== 'string') {
    return { ok: false, message: '标题必须是字符串' };
  }
  const title = value.trim();
  const length = [...title].length;
  if (length < 2 || length > 20) {
    return { ok: false, message: '标题需为 2～20 个字符' };
  }
  return { ok: true, title };
}
```

这里没有为了测试暴露内部 length；外部只需要知道是否接受、接受什么标题、拒绝时如何解释。后面即使改变函数内部写法，只要公开约定保持不变，检查就应继续成立。

### 等价类和边界帮你选出有意义的输入

**等价类（equivalence partition）**把预计由同一规则处理的输入归组。本例首先分成非字符串、过短、合法和过长，再为“去空白”和“Unicode 计数”各选一个能改变答案的案例。

**边界值（boundary value）**位于规则发生切换的位置。范围是 2～20，因此 1、2、20、21 比随意选 8、9、10 更能揭示包含关系。它们不是万能模板；如果规则变成按字节限制，边界还要重新设计。

```js example=test01-unicode
console.log('😀'.length);
// => 2
console.log([...'😀'].length);
// => 1
console.log([...'学习'].length);
// => 2
console.log([...'e\u0301'].length);
// => 2
```

第一行是 UTF-16 码元数量，第二行才是本例约定的码点数量。最后的 `e` 与组合重音可能显示成一个字形，却含两个码点。你不需要先背完整 Unicode 规则，但需要知道自己到底在测哪一种长度。更多字符串语义可回看 [JS-03](../chinese-guides/js-03-types-equality-copy-immutability.md#js-03)。

保存 `title.test.mjs`，在该目录执行 `node --test title.test.mjs`：

```js example=test01-boundaries runtime=project file=title.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { parseTitle } from './title.mjs';

const cases = [
  ['非字符串', null, false],
  ['空白', '   ', false],
  ['下限前', '学', false],
  ['恰好下限', '学习', true],
  ['恰好上限', '学'.repeat(20), true],
  ['超过上限', '学'.repeat(21), false],
  ['单个补充平面字符', '😀', false],
  ['两个码点', '😀学', true],
];
for (const [name, input, expected] of cases) {
  test(name, () => assert.equal(parseTitle(input).ok, expected));
}
test('去掉首尾空白后交付标题', () => {
  assert.deepEqual(parseTitle('  学习笔记  '), { ok: true, title: '学习笔记' });
});
```

预期 9 项通过。每一项都有选择理由：Unicode 案例可以发现错误的 `.length` 计数，恰好 20 可以发现上限排除错误，最后一项检查的不只是接受与否，还包括交付的数据。

如果输入涉及身份、状态和时间等多个维度，单维各测一例可能遗漏交互。例如“过期且已撤销”的处理可能不同于只过期。优先选高风险组合；pairwise 可以控制组合数量，但覆盖两两组合并不证明更高阶交互正确。

### 从单次返回值走到状态变化

保存表单不是一个纯函数，它有过程：

```text
可编辑 → 提交中 → 保存成功
             └→ 保存失败 → 修正或重试 → 提交中
```

只断言最终出现“保存成功”，可能漏掉中间连续发送两次请求的问题。把每条状态转换的前提、动作和可见结果写清，才能选择观察位置。

| 当前状态与动作 | 应观察什么 | 不应发生什么 |
| --- | --- | --- |
| 输入不合法时提交 | 错误信息出现，焦点回到字段 | 不发起保存 |
| 正在保存时再次点击 | 保持忙碌，不能再次提交 | 不新增同一轮保存请求 |
| 保存被拒绝 | 草稿仍在，可再次操作 | 不把失败当成成功 |
| 保存成功 | 显示已保存标题 | 不只是把按钮改成绿色 |

状态图也可以检查非法事件：提交中收到另一次提交、旧请求在新请求后完成、组件卸载后结果才到达。无须把每一种颜色都变成状态；优先建模会改变用户结果和外部动作的部分。完整的表单观察将在 [TEST-02](../chinese-guides/test-02-component-testing-user-behavior-accessibility.md#test-02) 实现。

### 不变量说明一组操作都必须遵守什么

**不变量（invariant）**是在约定范围内始终成立的规则。例如标题被接受后，再把已处理标题交给校验，应得到相同结果；一次保存失败不应删除未保存草稿；只允许当前请求提交结果。

“不变量”并不意味着所有输入都满足某个漂亮公式。标题的去空白是幂等的，但任意拼接不一定保持合法：两个各有 15 个字符的合法标题拼起来会超过上限。先写前提，再写关系。

下面的关系可以直接在 Node 中观察：

```js example=test01-idempotence
const normalize = (text) => text.trim();
const once = normalize('  学习笔记  ');
console.log(normalize(once) === once);
// => true
console.log(normalize('  学习笔记  ') === normalize('学习笔记'));
// => true
```

这只是两个样本，不是对所有字符串的证明。性质足够明确以后，可以用生成器探索更多输入，但要保留刚才那些已经确认的边界案例。生成式检查和手写案例是互补关系。

### 属性测试用生成器寻找反例

**属性测试（property-based testing）**生成许多输入，尝试找出违反性质的反例。为本讲添加 `package.json`，执行 `npm install`，保留锁文件：

```json example=test01-package runtime=project file=package.json
{
  "name": "title-rule-lab",
  "private": true,
  "type": "module",
  "scripts": { "properties": "node properties.mjs" },
  "devDependencies": { "fast-check": "4.3.0" }
}
```

保存 `properties.mjs`，执行 `npm run properties`：

```js example=test01-properties runtime=project file=properties.mjs
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { parseTitle } from './title.mjs';

const titleInput = fc.array(fc.constantFrom('学', '习', 'A', '😀', ' '), {
  minLength: 0,
  maxLength: 24,
}).map((items) => items.join(''));

fc.assert(fc.property(titleInput, (input) => {
  assert.deepEqual(parseTitle(input), parseTitle(`  ${input}  `));
  const result = parseTitle(input);
  if (result.ok) {
    assert.deepEqual(parseTitle(result.title), result);
  }
}), { seed: 20260910, numRuns: 100 });
console.log('100 组输入的首尾空白关系与接受后幂等性通过');
```

这里有意限制输入字符集合与最大长度，便于理解、复现和控制运行成本。它没有覆盖所有 Unicode 字符。seed 固定生成过程，工具版本也要一起保留；发现失败后，记录原始输入、seed 和报告中的收缩路径，而不只保存一句“随机测试失败”。

**收缩（shrinking）**会尝试把反例简化。例如长字符串触发了一个计数问题，工具可能找到只含一个 emoji 的更小反例。最小结果更容易分析，但原样本仍有价值，特别是收缩改变了触发机制时。

做一个反向思考：如果实现对所有输入都返回 `{ ok: false }`，上面两条性质仍可能通过。这说明性质集合还没有证明“合法标题应被接受”。已有的“学习”和恰好 20 个字符这类独立示例会发现问题。增加运行次数无法弥补一个过弱的预言。

### 蜕变差分和 fuzz 各自寻找不同问题

**蜕变测试（metamorphic testing）**在无法直接算出完整答案时，检查输入变化与输出之间的关系。上一节加首尾空白的实验就是一条蜕变关系；用 fast-check 生成输入是执行它的一种方式。两种术语分别描述关系与探索方式，并非互斥工具类别。

**差分测试（differential testing）**把相同输入交给不同实现，寻找分歧。假设准备把标题计数从 UTF-16 码元改成码点，旧新函数在 `😀` 上产生差异是预期变化，不能自动判新实现错。最终仍要回到明确的产品规则，判断哪边符合目标。

**模糊测试（fuzz testing）**更适合解析、解码或协议入口，通过变异输入寻找崩溃、超时和资源失控。可以向一个接受 JSON 的入口输入截断字符串、深层数组或大量重复字段，观察它是否有界结束并返回明确错误。它通常不必知道每个输入的完整业务答案。

| 方法 | 适合提出的问题 | 主要限制 |
| --- | --- | --- |
| 独立样例 | 恰好 20 个字符能否接受 | 有限输入不会覆盖所有情况 |
| 属性与蜕变关系 | 加首尾空格后语义是否相同 | 性质可能过弱，前提可能写错 |
| 差分 | 新旧实现在哪些输入上不同 | 差异本身不能裁决谁正确 |
| fuzz | 恶劣输入是否让解析过程失控 | 不崩溃不等于业务正确 |

生成和模糊检查应限定输入长度、深度、时间与内存，失败样本转成确定性回归。用合成数据在自己的隔离环境中执行，不需要为了学习对外部服务大量发请求。

### 替身放在需要控制的边界

**测试替身（test double）**替代真实边界，帮助控制输入和观察必要交互。名称在工具之间会有差异，先看它承担什么职责：

| 名称 | 例子 | 这次能证明什么 |
| --- | --- | --- |
| stub | 保存接口总是返回“无权限” | 组件面对这个结果如何反馈 |
| spy | 记录保存收到的标题 | 交付值是否规范化、是否重复提交 |
| fake | 一个可以读写的内存资料仓库 | 在该简化存储模型下如何交互 |
| mock | 预先规定必须发生的交互并验证 | 约定交互是否发生 |

不要把“检查调用次数”一律视为坏测试。保存中再次点击不得新增写入，本身就是外部约定，次数有意义；内部拆成几个辅助函数调用多少次，通常不属于用户约定。

最常需要控制的是时钟、随机、网络、存储和任务完成顺序。**依赖注入（dependency injection）**可以让这些边界从参数进入，而不是在测试中修改全局对象。

```js example=test01-clock
function canRetry(lastAttempt, now) {
  return now() - lastAttempt >= 1000;
}
console.log(canRetry(5000, () => 5999));
// => false
console.log(canRetry(5000, () => 6000));
// => true
```

这验证了间隔边界，不需要真的等一秒。真实生产时钟是否单调、跨设备时间是否可信，是另外的问题。给全局时钟打补丁若忘记恢复，会污染其他用例；能用一个小参数表达依赖时，通常更容易控制。

### 用可控完成顺序验证异步规则

异步测试经常需要“先观察等待状态，再让结果到达”。这里不赌某台机器会在 30 毫秒内完成，而是显式交付结果：

```js example=test01-controlled-result
let deliver;
const pending = new Promise((resolve) => { deliver = resolve; });
let state = 'saving';
const completed = pending.then(() => { state = 'saved'; });
console.log(state);
// => saving
deliver();
console.log(state);
// => saving
await completed;
console.log(state);
// => saved
```

调用 resolve 后，Promise 回调不会同步插进当前调用栈。用例必须等到真正的完成信号，而不是只调用一次交付函数就立即断言最终界面。

若有 A、B 两次请求，就为它们分别建立可控结果，先完成 B，再完成 A，观察旧结果是否被拒绝。取消请求与拒绝旧结果不是同一个保证；具体机制见 [REACT-04](../chinese-guides/react-04-effects-external-sync-cleanup.md#react-04) 和 [B09 的可控竞态](../chinese-guides/debug-01-systematic-debugging-evidence-causality.md#用可控顺序把偶发现象变成确定过程)。

fake timer 可推进计时任务，但还要理解 Promise 与框架更新队列；只有时间条件确实属于被测行为时才引入它。异步结束后清理自己创建的监听、计时器、目录和缓存，不能让下一项检查继承上一次现场。

### 变异检查问断言是否真的敏感

**变异测试（mutation testing）**对实现做小幅修改，观察现有检查能否发现。现在只在练习目录中，每次做一种修改，运行 `node --test title.test.mjs`，观察后恢复：

| 故意改动 | 应被哪条证据发现 |
| --- | --- |
| `length > 20` 改成 `length >= 20` | 恰好上限的输入被错误拒绝 |
| `[...title].length` 改成 `title.length` | 单个 emoji 被错误接受 |
| `value.trim()` 改成 `value` | 交付标题还含首尾空白 |
| 所有输入都返回失败 | 合法标题的独立样例失败 |

这里手工选择四个有明确业务含义的变异，不需要启动全仓变异平台。测试让变异后的实现失败，说明它对这个变化敏感；测试没失败，则继续区分真实缺口、等价变异、不可达变化和工具限制。

不要为了“杀死所有变异”把内部写法锁死。例如把变量改名不会改变公开行为，测试没有失败正是好事。面对一个存活变异，先解释它对用户结果有什么影响，再决定是否补测试。

### 覆盖率与测试数量都不能替代判断

**覆盖率（coverage）**告诉你哪些代码被执行了。若只调用 `parseTitle('学习')` 而完全不检查返回值，相关行可能已经被覆盖，却没有建立结果对错的判断。

把覆盖率当作寻找空白区域的地图，再按风险补充证据。核心授权条件、失败后的恢复、资源释放等通常值得重点保护；不可达代码或平台专用分支则需要记录原因，不能单凭一个百分数决定全部工作。

跨系统边界还要防替身漂移。组件测试返回“理想 JSON”不代表后端真的提供该字段；消费者与提供者可以通过契约检查共享请求、响应和错误语义，但它不替代认证、网络连通和部署验证。详细边界留给 [TEST-04](../chinese-guides/test-04-api-contract-consumer-driven-testing.md#test-04)。

性能和统计输出也有不同预言。一次测量快了 10 毫秒，可能只是噪声；需要固定口径、重复样本和合适的误差判断。容差来自问题本身，不能为了绿色不断放宽。这种证据强度会在 [CAREER-01](../chinese-guides/career-01-project-evidence-causal-storytelling.md#career-01) 继续用于项目表达。

### 失败之后先保留依据再修改预期

测试失败可能来自产品回归、过时需求、错误测试、共享状态污染或环境故障。先保存输入、预期与实际、运行版本和首个错误，再确定哪一层出了问题。直接更新快照或重跑到绿色，会让这些线索消失。

若单独运行成功、合在一起失败，优先找共享缓存、单例和未清理资源；若只有并行失败，检查同名数据、端口或目录。串行化可以帮助定位，但不能直接证明隔离已经修好。

确认缺陷后保留一个能稳定复现的最小例子：旧实现失败，修复实现通过，边界解释仍成立。出现 **flaky** 时记录首次失败、可触发条件、负责人和修复期限；重试通过要与首跑成功分开统计。

每项检查都应该回答一个值得保护的问题。随着产品变化，删除过时或重复用例，保留能支持重构的观察方式。如何把它们连接成可信的门禁，可返回 [ENG-05](../chinese-guides/eng-05-quality-gates-lint-types-tests-ci.md#统一入口必须把子检查失败传出去)。

### 参考与延伸阅读

核对日期：2026-09-10。基础例子使用 Node.js 22.23.0，属性例子使用 fast-check 4.3.0。

- [Node.js：测试运行器](https://nodejs.org/api/test.html)：查询实际运行、报告和失败的行为。
- [fast-check：属性](https://fast-check.dev/docs/core-blocks/properties/) 与 [运行配置](https://fast-check.dev/docs/configuration/)：核对生成、反例、seed 与重放配置。
- [MDN：String.length](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/length)：理解 UTF-16 长度与本例码点约定的区别。
- [Stryker：变异测试概念](https://stryker-mutator.io/docs/mutation-testing-elements/mutant-states-and-metrics/): 查询变异结果与分数的解释，按风险选用即可。
