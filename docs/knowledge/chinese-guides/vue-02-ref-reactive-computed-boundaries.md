# Vue 知识点讲义

## VUE-02 ref、reactive、computed 与响应式边界

同样是给数字加一，为什么改 `state.count` 能更新页面，改解构出来的 `count` 却不行？把大列表放进 `shallowRef` 后，为什么 `push` 改了数据，界面仍停在原处？`computed` 看起来像函数，为什么有时不会重新执行？

先记住一条可以反复验证的线索：在需要追踪的计算中读取响应式值，建立联系；以后通过相应入口写入，Vue 才能通知依赖它的计算。容器、代理、普通变量和 DOM 各有自己的更新方式。本篇用筛选列表和小型对照程序把它们分开。

### 学习前先确认

- 直接前置：[VUE-01 Vite、SFC 与项目结构](../chinese-guides/vue-01-vite-sfc-project-structure.md#vue-01)。它继续链接 TypeScript、HTML 与模块基础。

完整 Vue 组件可放进 Vue 3 项目的 `App.vue`。其余 JavaScript 片段各自独立，作为项目里的 ES Module 运行，或逐段放入 Vue 官方演练场 `App.vue` 的 script setup 中；每次只运行一个，观察控制台。每段都包含所需 import，`// =>` 是预期输出。单独复制到没有 Vue 导入环境的浏览器控制台，不能直接解析裸模块名 `vue`。

### 从一份会变化的资料数量认识 ref

普通局部数字本身没有办法告诉框架“有人改我了”。**ref** 提供一个稳定容器，把需要追踪的读取和写入放在 `.value` 上：

```js example=vue02-ref runtime=browser file=main.mjs
import { ref, computed } from 'vue';
const count = ref(2);
const label = computed(() => `还有 ${count.value} 篇`);
console.log(label.value); // => 还有 2 篇
count.value += 1;
console.log(count.value); // => 3
console.log(label.value); // => 还有 3 篇
```

`count` 是容器，`count.value` 是此刻装在其中的值。容器保持不变，里面的值可以更新。`computed` 先暂时理解为依赖源数据的计算结果；它在 getter 中读取 `count.value`，所以知道自己的结果与 count 有关。

一次普通读取并不表示 Vue 永久监视那条语句。`console.log(count.value)` 执行完就结束了，不会在以后自行打印；组件渲染、computed 或 effect 执行期间的读取，才会为相应计算建立依赖。

在脚本里写 `.value`，不是多打一层无意义后缀，而是在选择可追踪的入口。模板对一些 ref 提供自动解包，所以完整组件里通常写 `{{ count }}`；后面会说明这个方便写法有哪些边界。

### reactive 让对象属性访问经过代理

一组长期放在一起的筛选字段，也可以用 **reactive** 包装成响应式对象：

```js example=vue02-proxy runtime=browser file=main.mjs
import { reactive, computed, isReactive } from 'vue';
const raw = { query: '', page: 1 };
const filters = reactive(raw);
const label = computed(() => `第 ${filters.page} 页`);
console.log(filters === raw, isReactive(filters)); // => false true
console.log(label.value); // => 第 1 页
filters.page = 2;
console.log(label.value); // => 第 2 页
```

`filters` 是原对象的代理。通过它读取 page 时，Vue 有机会记录依赖；通过它写 page 时，Vue 有机会通知相关计算。代理和原对象并不是同一个引用，但也不是把数据完整复制了一份。

这可以连接到 [JS-07 的 Proxy 与 Reflect](../chinese-guides/js-07-iteration-metaprogramming-resources.md#js-07)。代理拦截的是访问路径，不能隔空感知所有绕开它的写入。不要让一部分代码写 raw，另一部分代码读代理，却期待所有更新始终自动同步。

`reactive` 适合对象、数组与支持的集合类型，不能直接用一个基本类型数字当作对象代理。`ref` 则既可以保存基本类型，也可以保存对象。因此选择不必机械地变成“对象 reactive，数字 ref”，更应该看以后如何替换和共享。

### 原对象变了不代表依赖收到通知

下面故意绕过代理写入，观察原始值与缓存结果的区别：

```js example=vue02-raw-write runtime=browser file=main.mjs
import { reactive, computed } from 'vue';
const raw = { count: 0 };
const state = reactive(raw);
const doubled = computed(() => state.count * 2);
console.log(doubled.value); // => 0
raw.count = 1;
console.log(state.count, doubled.value); // => 1 0
state.count = 2;
console.log(doubled.value); // => 4
```

第二行输出里，代理重新读取属性时能看到底层已经变成 1，但 computed 没有收到这次修改的通知，仍返回缓存的 0。随后通过代理把值设成 2，相关计算才得到更新信号。

这说明“现在读到的数据正确”与“依赖会自动重算”不是一回事。此例用两个不同值让现象明确；如果绕过代理改成 1 后又通过代理写同样的 1，也不要指望一次相同值赋值替你补回丢失的通知。

`toRaw` 可以临时帮助诊断身份，却不应成为长期保存的第二个写入入口。对第三方库需要的原始实例，后面用 shallowRef 或 markRaw 明确隔离，通常比来回混用 raw 与 proxy 更容易理解。

### 整体替换时要保留被订阅的入口

使用 ref 保存对象时，可以替换整个 `.value`：

```js example=vue02-ref-replace runtime=browser file=main.mjs
import { ref, computed } from 'vue';
const draft = ref({ title: '表单' });
const heading = computed(() => draft.value.title);
console.log(heading.value); // => 表单
draft.value = { title: '响应式' };
console.log(heading.value); // => 响应式
```

计算仍通过同一个 `draft.value` 入口读取，所以能得到新对象。相反，普通变量重新指向另一个 reactive 对象，不是对旧响应式对象的一次写入：

```js example=vue02-reactive-replace runtime=browser file=main.mjs
import { reactive, computed } from 'vue';
let state = reactive({ count: 0 });
const captured = state;
const label = computed(() => captured.count);
console.log(label.value); // => 0
state = reactive({ count: 10 });
console.log(state.count, label.value); // => 10 0
captured.count = 1;
console.log(label.value); // => 1
```

消费者已经拿到旧代理，换掉局部变量不会让它手里的对象也换掉。即使 getter 闭包直接读取可重新赋值的 `state`，普通赋值本身也不会主动通知 computed；以后被其他依赖触发时才可能重新读取，容易留下难以解释的时序。

若需求是加载另一份完整数据，ref 的整体替换通常清楚；若是一组身份稳定的表单字段，持续修改同一 reactive 对象也合理。使用 `Object.assign` 更新字段时还要考虑旧字段是否应删除，不能把合并误当成完全替换。

### 解构基本类型会取走当时的值

解构本身只是 JavaScript 取值，不是一种响应式绑定声明：

```js example=vue02-destructure runtime=browser file=main.mjs
import { reactive, toRef, toRefs } from 'vue';
const state = reactive({ count: 0, title: '表单' });
const { count: plainCount } = state;
const linkedCount = toRef(state, 'count');
const { title } = toRefs(state);
state.count = 2;
title.value = '响应式';
console.log(plainCount, linkedCount.value, state.title); // => 0 2 响应式
linkedCount.value += 1;
console.log(state.count); // => 3
```

`plainCount` 只是解构时得到的数字 0。`toRef(state, 'count')` 则给该属性建立一个可以继续读写的 ref；`toRefs` 为对象当时可枚举的属性生成类似连接。后续才增加的字段，不会自动出现在此前返回的那份 toRefs 对象里。

“解构就一定完全失去响应式”又说得过头。如果解构取出的是一个嵌套代理对象，继续通过那个代理修改内部字段仍可追踪；只是它与父对象后来替换的新属性之间没有自动换绑关系。关键是取出来的到底是数字、对象引用还是 ref 容器。

Vue 3.5 及之后，script setup 中从 `defineProps` 解构的变量有专门的编译器支持，不能把它与普通 `const { count } = reactiveObject` 混为一谈。把这样的 props 值交给需要响应式来源的外部函数时，也要看函数接受的是当前值还是 getter。编译规则没有改变所有 JavaScript 解构的含义。

### 自动解包取决于 ref 放在哪里

先用脚本观察对象、数组和 Map 的差别：

```js example=vue02-unwrapping runtime=browser file=main.mjs
import { ref, reactive } from 'vue';
const count = ref(1);
const object = reactive({ count });
const list = reactive([ref(2)]);
const map = reactive(new Map([['count', ref(3)]]));
console.log(object.count); // => 1
console.log(list[0].value); // => 2
console.log(map.get('count').value); // => 3
object.count = 4;
console.log(count.value); // => 4
```

深层 reactive 对象的普通属性会解包 ref；数组元素和 Map 的值不会使用同一规则。模板中暴露为顶层绑定的 ref 通常自动解包，但普通对象里的嵌套 ref 不应一概省略 `.value`。

例如顶层 `count = ref(1)` 可以写 `{{ count + 1 }}`。若普通对象 `box = { count: ref(1) }`，应明确使用 `{{ box.count.value + 1 }}`；单纯文本插值最终结果又有解包便利，不能据此推断所有复合表达式。

可以按下面的顺序判断：现在在脚本还是模板；访问的是顶层绑定、reactive 对象属性，还是集合元素；得到的是实际值还是 ref。与其背“模板不用 value”，这三个问题更能解释具体代码。

### computed 让筛选结果跟着源状态变化

现在做一个完整资料筛选页面。列表、关键词和“只看未完成”是源状态；筛选结果与总用时由它们计算得到。

```vue example=vue02-filter runtime=project file=src/App.vue
<script setup lang="ts">
import { computed, ref } from 'vue';

type Lesson = { id: string; title: string; minutes: number; completed: boolean };
const lessons = ref<Lesson[]>([
  { id: 'html', title: 'HTML 表单', minutes: 25, completed: true },
  { id: 'react', title: 'React 状态快照', minutes: 30, completed: false },
  { id: 'vue', title: 'Vue 响应式', minutes: 35, completed: false },
]);
const query = ref('');
const onlyPending = ref(false);
const visible = computed(() => {
  const keyword = query.value.trim().toLowerCase();
  return lessons.value.filter(item =>
    item.title.toLowerCase().includes(keyword) && (!onlyPending.value || !item.completed),
  );
});
const totalMinutes = computed(() => visible.value.reduce((total, item) => total + item.minutes, 0));
function complete(id: string) {
  const lesson = lessons.value.find(item => item.id === id);
  if (lesson) lesson.completed = true;
}
</script>

<template>
  <main>
    <h1>筛选学习资料</h1>
    <label for="lesson-query">关键词</label>
    <input id="lesson-query" v-model="query">
    <label><input v-model="onlyPending" type="checkbox"> 只看未完成</label>
    <p>找到 {{ visible.length }} 篇，共 {{ totalMinutes }} 分钟</p>
    <ul>
      <li v-for="lesson in visible" :key="lesson.id">
        {{ lesson.title }}：{{ lesson.minutes }} 分钟
        <button type="button" :disabled="lesson.completed" @click="complete(lesson.id)">
          {{ lesson.completed ? '已完成' : '标为完成' }}
        </button>
      </li>
    </ul>
  </main>
</template>
```

初始显示三篇、90 分钟；勾选只看未完成，变成两篇、65 分钟；输入 `vue`，只剩一篇、35 分钟；再标为完成，变成零篇、零分钟。没有一行代码手动同步 `visible` 或 `totalMinutes`。

**计算属性（computed property）**表达的是这种派生关系。先读源数据，再计算结果；源数据变化后，结果在需要时重新求出，依赖未变则可以复用缓存。不是每次写入都无条件立即执行所有 getter。

`v-model` 在此连接输入值与源状态，`v-for` 根据数组生成列表，`v-if` 则按条件显示内容；后续资料会深入这些模板指令。当前先沿“输入改源状态 → visible 变化 → totalMinutes 变化 → 页面更新”追踪即可。

与 [React 的派生列表](../chinese-guides/react-01-render-purity-state-snapshot.md#派生值直接计算可以少一份需要同步的状态)对照，二者都只保存必要源数据。Vue 的 computed 显式描述并缓存派生计算，React 示例则在组件渲染时直接计算。正确的状态含义不依赖于 API 名字相似。

### 依赖来自本次真正读取的分支

下面的计数器只用来帮助观察 getter，正式业务的 computed 不应依赖它产生额外动作：

```js example=vue02-conditional-dependencies runtime=browser file=main.mjs
import { ref, computed } from 'vue';
const enabled = ref(false);
const title = ref('表单');
let calculations = 0;
const label = computed(() => {
  calculations += 1;
  return enabled.value ? title.value : '暂不显示';
});
console.log(label.value, calculations); // => 暂不显示 1
title.value = '响应式';
console.log(label.value, calculations); // => 暂不显示 1
enabled.value = true;
console.log(label.value, calculations); // => 响应式 2
title.value = '状态快照';
console.log(label.value, calculations); // => 状态快照 3
```

第一次执行只读取 enabled，没有进入读取 title 的分支；所以只改 title，不会让这次缓存失效。enabled 变为 true 后，getter 才真正读到 title，建立新的依赖。

这叫**依赖追踪（dependency tracking）**。依赖不是按源码里出现过哪些变量静态列一遍，而是随执行路径变化。后续分支不再需要的依赖也会得到相应清理。

`watchEffect` 同样依赖执行期间的同步读取；异步回调在第一次 await 之后才读取的值，不会像同步读取那样自动收集到这次 effect 中。需要明确监听哪些变化的异步任务，可以在后续 watch 资料中学习显式来源与清理，不要靠在 getter 中发请求绕过设计。

### computed 的 getter 只计算结果

筛选、拼接标签、求总价很适合 computed；发送请求、写存储、修改源状态不适合放进 getter。因为读取时间与次数由消费者和依赖决定，不能拿它充当一个可靠的业务事件入口。

例如在 getter 中对源数组直接 `.sort()`，既读取又修改源数据，可能影响其他消费者。先创建新数组再排序更容易保持计算纯粹；这与 React 纯渲染的局部变更边界相通。

默认 computed 是只读派生入口，不应再维护一份相同含义的普通 state，然后用 watch 来回同步。如果“草稿关键词”和“已经提交的关键词”确实可以不同，它们就是两份有不同含义的源状态，应明确命名，而不是一律合并或一律复制。

没有响应式依赖的 `computed(() => Date.now())` 不会自动成为时钟。时间过去并不会触发 Vue 依赖通知。需要计时时，由外部定时器更新一个源状态，并负责清理，再让 computed 格式化结果。

### 可写 computed 把编辑转换回源状态

当界面使用的格式与保存格式不同，可写 computed 可以做双向适配。比如内部存整数分钟，输入时显示“小时:分钟”：

```js example=vue02-writable-computed runtime=browser file=main.mjs
import { ref, computed } from 'vue';
const totalMinutes = ref(90);
const duration = computed({
  get: () => `${Math.floor(totalMinutes.value / 60)}:${String(totalMinutes.value % 60).padStart(2, '0')}`,
  set(value) {
    const match = /^(\d{1,2}):([0-5]\d)$/.exec(value.trim());
    if (!match) throw new Error('请按 小时:分钟 填写，例如 1:30');
    totalMinutes.value = Number(match[1]) * 60 + Number(match[2]);
  },
});
console.log(duration.value); // => 1:30
duration.value = '2:05';
console.log(totalMinutes.value, duration.value); // => 125 2:05
try { duration.value = '2:90'; }
catch (error) { console.log(error.message); } // => 请按 小时:分钟 填写，例如 1:30
console.log(totalMinutes.value); // => 125
```

这段代码没有另存一份 duration 字符串，唯一持久源仍是整数分钟。setter 定义合法格式、转换方法与失败行为；失败时保留原值。真实输入框允许用户输入一半时，通常先保留草稿，再在提交时解析并把错误显示到字段旁，不应让每次输入半个字符串都直接抛出未处理异常。

可写 computed 适合这种明确转换，并不意味着任何派生值都应可写。若无法说清“写入这个值应该怎样修改哪些源”，先保持只读更清楚。

### 浅层响应式要求配套的更新方式

普通 ref 保存对象时通常会让内部对象具备深层响应性；**shallowRef** 只追踪 `.value` 的替换，不为里面的普通对象建立同样的深层转换。

```js example=vue02-shallow-ref runtime=browser file=main.mjs
import { shallowRef, computed } from 'vue';
const lessons = shallowRef([{ title: '表单' }]);
const count = computed(() => lessons.value.length);
console.log(count.value); // => 1
lessons.value.push({ title: '响应式' });
console.log(lessons.value.length, count.value); // => 2 1
lessons.value = [...lessons.value];
console.log(count.value); // => 2
```

push 已经改了原数组，但没有替换 shallowRef 的 value，也没有经过深层响应式数组入口，所以缓存仍为 1。替换数组之后才通知依赖。这里不能把“不更新”修成再套一层相同的 shallowRef；应调整变更入口。

如果明确需要就地修改大对象后通知消费者，也可调用 `triggerRef`。这是一种显式协议，意味着所有修改方都得知道通知责任。多数不可变快照场景采用整体替换更直观。

`shallowReactive` 则只让根属性响应，不会深度转换内部对象，也不会按深层 reactive 对象的规则解包内部 ref。深浅 API 可以在清楚的边界使用，不宜混成一张没有明确变更入口的大树。

### 外部实例和对象身份需要明确保留

地图实例、编辑器实例或外部状态系统通常有自己的内部规则，不一定适合深代理。可以用 shallowRef 持有实例，更新时替换引用；也可以用 **markRaw** 表示某个对象不应被转换：

```js example=vue02-mark-raw runtime=browser file=main.mjs
import { markRaw, reactive, isReactive } from 'vue';
class ReaderEngine {
  currentPage = 1;
  open(page) { this.currentPage = page; }
}
const engine = markRaw(new ReaderEngine());
const state = reactive({ engine });
state.engine.open(3);
console.log(state.engine === engine, isReactive(state.engine)); // => true false
console.log(engine.currentPage); // => 3
```

对象行为仍可运行，markRaw 没有冻结它。通过这个原始实例改 currentPage，也不表示 Vue 会自动追踪内部所有变化。如果界面需要显示页码，应让外部库的事件更新一个明确的响应式值，并在卸载时解除监听。

markRaw 的豁免针对被标记对象本身。把它未标记的嵌套普通对象另外放进 reactive 树，仍可能得到嵌套代理。因此比较身份时，尽量使用稳定业务 ID，或统一保存原始实例的边界，不要在多个模块各自猜 raw 与 proxy 谁才是同一个对象。

### readonly 约束一条写入路径而不是冻结数据

只读入口适合让组件读取状态，把修改集中在拥有者的动作中：

```js example=vue02-readonly runtime=browser file=main.mjs
import { reactive, readonly, isReadonly } from 'vue';
const owned = reactive({ completed: 0 });
const publicState = readonly(owned);
function completeOne() { owned.completed += 1; }
console.log(isReadonly(publicState), publicState.completed); // => true 0
completeOne();
console.log(publicState.completed); // => 1
```

消费者从 publicState 读，拥有者通过 completeOne 改。readonly 代理会拦截通过它进行的修改，但原始持有者仍能更新数据；它不是安全沙箱，也没有完成深度冻结。

TypeScript 的 readonly 又属于静态限制，编译之后不会变成代理。三者分别是类型约定、运行时代理和实际冻结，不宜仅因中文都叫“只读”就视为同一种能力。相关对象共享基础可回看 [JS-03](../chinese-guides/js-03-types-equality-copy-immutability.md#js-03)。

同样，把网络 JSON 放进 ref 或 reactive，不会验证字段、恢复日期对象或阻止错误数据。外部数据仍需先经过 [TS-01 的运行时解析](../chinese-guides/ts-01-type-system-structural-strict-mode.md#外部数据经过检查后再进入业务代码)，再进入可信状态。

### 数组和集合要看消费者实际读取什么

数组 push 在普通深层响应式数组上可以触发相关更新；前面的 shallowRef 反例不能推广成“Vue 3 不追踪数组就地修改”。Map、Set 也有响应式支持：

```js example=vue02-map runtime=browser file=main.mjs
import { reactive, computed } from 'vue';
const progress = reactive(new Map([['html', 1], ['vue', 0]]));
const htmlProgress = computed(() => progress.get('html'));
const total = computed(() => [...progress.values()].reduce((sum, value) => sum + value, 0));
console.log(htmlProgress.value, total.value); // => 1 1
progress.set('vue', 2);
console.log(htmlProgress.value, total.value); // => 1 3
progress.delete('html');
console.log(htmlProgress.value, total.value); // => undefined 2
```

一个计算读取指定键，另一个遍历所有值，它们关注的范围不同。不能只看“整个对象很大”就断定所有组件会同样重算；也不能承诺每种集合操作在所有版本中都具有某个固定内部触发次数。先观察依赖表达了什么，再衡量实际成本。

数据结构还要服务于查询方式。频繁按 ID 找资料可以采用 Map 或索引对象，相关权衡见 [CS-01 的复杂度与性能](../chinese-guides/cs-01-complexity-scale-engineering-cost.md#cs-01)。响应式不会替你消除本来就很重的全量筛选。

### 数据立即变化与 DOM 稍后更新可以同时成立

运行这个完整组件，点击一次按钮，查看控制台与页面：

```vue example=vue02-next-tick runtime=project file=src/App.vue
<script setup lang="ts">
import { nextTick, ref } from 'vue';
const count = ref(0);
const numberElement = ref<HTMLOutputElement | null>(null);
async function addTwo() {
  count.value += 1;
  count.value += 1;
  console.log('赋值后', count.value, numberElement.value?.textContent);
  await nextTick();
  console.log('DOM 更新后', count.value, numberElement.value?.textContent);
}
</script>
<template>
  <main>
    <h1>数据与 DOM 的更新时机</h1>
    <output ref="numberElement">{{ count }}</output>
    <button type="button" @click="addTwo">加二并观察</button>
  </main>
</template>
```

从零开始第一次点击，赋值后日志里数据为 2，DOM 文本仍为 0；等待 `nextTick` 后，DOM 文本也成为 2。Vue 会把适合一起处理的组件更新安排到队列中，避免每次赋值都立即重复修改 DOM。

**nextTick** 等待 Vue 当前安排的 DOM 更新完成，不是等待网络请求，也不保证浏览器已经把像素绘制到屏幕。应先修改状态，再等待更新；在修改之前提前等待，不能替未来的写入作保证。

与 React 对照，Vue 在脚本里赋值后立刻读取 `.value` 就能得到新值；React 的 setter 不改当前 render 的局部快照。二者都存在 DOM 提交时机，也都需要处理异步任务的新旧关系。响应式并不会让旧请求自动失去覆盖页面的资格。

### 从不更新的现象反推哪条联系断了

遇到异常，先沿一条明确路径说明：谁读取了哪个容器或属性，谁通过哪个入口修改，消费者是否在这次执行中建立依赖，读取 DOM 时是否已经等待提交。然后再选工具。

可以临时用 isRef、isReactive、isReadonly 核对手里是什么对象；开发模式的 onRenderTracked/onRenderTriggered 或 computed 调试选项可以帮助观察读取与触发。调试输出只解释局部因果，不应把整个业务对象未经筛选地上传日志。

常见修复对应的都是具体断点：基本类型解构改为 toRef 或继续访问对象；整体换数据使用 ref；shallowRef 的深层变更改为替换或明确通知；把副作用移出 computed；让外部实例通过事件更新页面所需状态。不要先加 watch 在两份相同数据之间来回补同步。

最后按所有权放置状态：单个组件的草稿留在实例中，多个组件共同需要的数据提升到合适的共同拥有者，服务器数据考虑专门缓存。能解释一份数据由谁改、何时结束使用，比把所有对象都包进 reactive 更有帮助。

### 参考与延伸阅读

- [Vue：响应式基础](https://cn.vuejs.org/guide/essentials/reactivity-fundamentals.html)：查 ref、reactive、替换与解包规则。
- [Vue：计算属性](https://cn.vuejs.org/guide/essentials/computed.html)：查缓存、getter 纯度与可写 computed。
- [Vue：响应式 API 进阶](https://cn.vuejs.org/api/reactivity-advanced.html)：查 shallowRef、triggerRef、markRaw 与身份边界。
- [Vue：深入响应式系统](https://cn.vuejs.org/guide/extras/reactivity-in-depth.html)：进一步理解依赖追踪、调试和外部系统集成。
- [Vue：script setup 的响应式 props 解构](https://cn.vuejs.org/api/sfc-script-setup.html#reactive-props-destructure)：查 Vue 3.5 及之后的编译器特例，不把它推广到普通解构。
