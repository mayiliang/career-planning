# Vue 知识点讲义

## VUE-02 `ref`、`reactive`、`computed` 与响应式边界

Vue 的模板会在数据变化后自动更新，但“自动”背后仍有明确机制：响应式读取被跟踪，写入触发相关 effect，调度器把多次变化合并，组件重新运行渲染函数并提交必要 DOM。理解代理、ref、computed 与身份边界，才能避免解构后不更新、把派生值写回源状态、外部对象被意外代理等问题。

### 学习前先确认

- 直接前置：[VUE-01 Vite 脚手架、SFC 与项目结构](../chinese-guides/vue-01-vite-sfc-project-structure.md#vue-01)。它会继续链接 TypeScript、HTML、模块和 JavaScript 基础。

模板指令、组件合同和 watch 的完整用法在后续知识点讲解。本讲专注响应式运行模型。

### 一、响应式系统连接读取与写入

当组件渲染或响应式 effect 执行时，读取某个响应式属性会建立依赖；之后写入该属性，系统会通知依赖它的工作重新运行。这叫**依赖追踪（dependency tracking）**。

概念上可以理解为：

```ts
let activeEffect: (() => void) | null = null;
const subscribers = new WeakMap<object, Map<PropertyKey, Set<() => void>>>();

function track(target: object, key: PropertyKey) { /* 记录 activeEffect */ }
function trigger(target: object, key: PropertyKey) { /* 通知订阅者 */ }
```

真实 Vue 实现包含缓存、清理、调度和更多优化，但关键不变：没有在 effect 执行期间读取，就没有该依赖；写入另一个无关属性，不应让所有工作都重新执行。

### 二、`ref` 用容器保存一个响应式值

```ts
const count = ref(0);
count.value += 1;
```

`ref` 返回带 `.value` 的对象。对 `.value` 的读取与写入可以被追踪。它适合基本类型，也适合希望明确替换整体的对象。

模板中会自动解包顶层 ref，所以写 `{{ count }}` 而不是 `{{ count.value }}`。脚本中仍需 `.value`。自动解包有具体规则，嵌套在普通数组或 Map 中的 ref 不一定自动解包；不要只凭“模板里不用 value”推断任意位置都相同。

ref 的身份稳定。把 `const state = ref({...})` 的 `.value` 替换为新对象，依赖 ref 的消费者仍能收到更新。

### 三、`reactive` 用 Proxy 包装对象

```ts
const state = reactive({
  query: '',
  page: 1,
});

state.page += 1;
```

`reactive` 返回原对象的**代理（proxy）**。读取和写入经过 Proxy trap，Vue 因此能按对象与属性追踪。代理与原对象不是同一引用：

```ts
const raw = { page: 1 };
const state = reactive(raw);
Object.is(raw, state); // false
```

不要一边把 raw 对象交给外部库修改，一边期待所有修改都经过代理。集合查找、WeakMap 键和第三方库的身份比较也可能受 raw/proxy 混用影响。

### 四、不能替换 `reactive` 绑定来更新消费者

```ts
let state = reactive({ count: 0 });
state = reactive({ count: 1 });
```

依赖旧代理的组件不会自动改为依赖新代理。若业务经常整体替换，使用 `ref`：

```ts
const state = ref({ count: 0 });
state.value = { count: 1 };
```

`reactive` 适合一组作为同一对象长期存在的字段；`ref` 适合独立值和可整体替换的状态。团队可以建立偏好，但不要把选择变成“对象永远 reactive、基本类型永远 ref”的机械规则。

### 五、普通解构会断开属性访问

```ts
const state = reactive({ count: 0 });
const { count } = state;
state.count += 1;
console.log(count); // 仍是解构时的数字
```

解构读取了一次代理属性，之后局部变量只是普通数字。需要保留属性级响应性时使用 `toRef`/`toRefs`，或保持通过对象访问：

```ts
const { count } = toRefs(state);
count.value += 1;
```

这不意味着每个 reactive 对象都应立刻 `toRefs`。过度拆散会丢失对象边界，API 也难以理解。Composable 返回普通对象中的多个 ref 是常见约定，因为调用者解构这些 ref 时仍保留容器身份。

### 六、深层代理有成本与边界

`reactive` 和普通 `ref` 通常会对嵌套对象建立深层响应性。大型不可变数据、第三方类实例、DOM 节点或外部状态机不一定适合深度代理。可选工具包括：

- `shallowRef`：只追踪 `.value` 的替换；
- `shallowReactive`：只代理根属性；
- `markRaw`：明确不转换某个对象；
- `toRaw`：临时取得原对象，不应用来长期绕过代理修改。

**浅层响应（shallow reactivity）**要求更新策略与之配套。若使用 `shallowRef` 保存大对象，修改深层字段不会触发更新，应替换 `.value` 或显式触发。混合深浅代理前应写清楚所有权和变更入口。

### 七、`computed` 表达有缓存的派生值

```ts
const firstName = ref('Ada');
const lastName = ref('Lovelace');
const fullName = computed(() => `${firstName.value} ${lastName.value}`);
```

**计算属性（computed property）**基于响应式依赖产生只读派生值。依赖未变时可以复用缓存；没有消费者读取时，也不需要无条件执行。getter 应保持纯粹，不发送请求、不修改依赖、不写存储。

如果计算很便宜，普通函数也能得到正确结果；computed 的主要意义是表达派生关系与按依赖缓存，不是“所有模板表达式都必须优化”。

### 八、可写 computed 是接口适配而非第二真源

```ts
const first = ref('Ada');
const last = ref('Lovelace');

const fullName = computed({
  get: () => `${first.value} ${last.value}`,
  set: value => {
    const [nextFirst = '', ...rest] = value.trim().split(/\s+/);
    first.value = nextFirst;
    last.value = rest.join(' ');
  },
});
```

可写 computed 适合把一个输入合同映射回已有源状态。setter 必须定义解析、空值和非法输入的策略。若内部另存一份 `fullName`，就会与 `first/last` 竞争真源。

### 九、更新是调度的，不是每次赋值立刻改 DOM

响应式值写入后，Vue 会安排组件更新并在同一 tick 合并多次变化：

```ts
count.value += 1;
count.value += 1;
await nextTick();
// 此时再读取依赖更新后的 DOM
```

脚本中的 `count.value` 会立即反映赋值，而 DOM 更新通常在队列刷新后发生。测试 DOM 时应等待 `nextTick` 或用户工具的异步动作，不要用任意 `setTimeout(100)` 猜测。

批处理不等于业务事务；两个网络请求和一次状态写入仍可能部分失败。异步一致性要靠状态机、取消和结果门禁。

### 十、effect 依赖来自实际读取

`watchEffect` 会在运行期间自动收集同步读取的依赖。`await` 之后才第一次读取的值通常不会按直觉被收集，因此复杂异步逻辑更适合显式 `watch` 源。

computed 也只依赖 getter 实际读取的分支：

```ts
const label = computed(() => enabled.value ? expensive.value : '关闭');
```

当 `enabled` 为 false 时，本次计算没有读取 `expensive`，其变化无需使该 computed 失效。动态依赖会在每次运行时更新，旧依赖必须被清理。

### 十一、响应式不负责运行时校验

把服务器 JSON 放入 `reactive` 不会验证字段类型，也不会把日期字符串变成 Date。外部数据仍应以 `unknown` 进入，经过解析和归一化后再进入可信响应式状态。

同样，readonly 代理主要防止通过该代理写入，并不是深度安全沙箱。持有原对象的代码仍可能修改它，TypeScript 的 readonly 也会在编译后消失。

### 十二、状态边界应服务于所有权

组件局部交互状态放在组件实例中；多个组件共享但生命周期有限的状态可提升到共同父层或 provide；全局客户端状态可进入 Pinia；服务器数据通常由专门缓存层管理。不要因为 reactive 好用就把所有数据放进一个全局大对象。

响应式粒度也影响更新范围。一个巨大 reactive 对象并不一定每次全量更新，但不透明的跨模块修改会让依赖和调试困难。按领域暴露只读状态与明确动作，比让所有调用者随意写代理更可靠。

### 十三、调试响应式问题的方法

出现“不更新”时依次检查：

1. 读取的是代理/ref，还是解构出的普通值？
2. 写入是否经过同一个代理，还是修改了 raw 对象？
3. 是否替换了 reactive 变量导致消费者仍订阅旧代理？
4. 使用 shallow API 后是否只改了深层字段？
5. computed/effect 在当前分支是否真的读取该依赖？

Vue DevTools、`isRef`、`isReactive`、`toRaw` 的临时诊断和最小复现比重复包一层 `reactive` 更有价值。诊断结束后不要把 `toRaw` 引用长期泄漏到业务层。

### 十四、与 React snapshot 模型对照

Vue 在代理/ref 读取时追踪依赖，脚本可在赋值后立即读取新值；React state 值属于某次 render 快照，通过 setter 安排下一次 render。Vue 的闭包也仍是 JavaScript 闭包，异步竞态不会因为响应式而消失。

共同原则是：源状态最小化、派生值不重复保存、更新具有调度边界、外部数据先验证、异步结果提交前重新确认所有权。

### 进阶：集合类型与数组也遵守“读取什么，触发什么”

响应式 `Map`/`Set` 不只是普通对象加代理：读取某个 key、遍历 keys、读取 size 会建立不同依赖，新增、删除和替换触发范围也不同。数组的 length、索引和迭代同样有各自关系。性能问题不能只看“对象很大”，而要看 effect 实际读取了哪些路径以及一次写入使多少消费者重新运行。

对频繁变化的大集合，可以把权威数据按 ID 分区、让 computed 只读取所需索引，或把外部不可代理的数据放进 `shallowRef` 后整体替换。不要为了少触发而直接修改 raw 对象，否则界面与数据会失去同步合同。

### 进阶：调试钩子用来解释因果链

开发模式的 render tracked/triggered 与 computed/watch 调试选项可以显示哪个 target/key 被读取、何种操作触发更新。先记录“谁读取—谁写入—为何重算”，再调整状态结构；看到一次重复更新不等于要立刻缓存。

调试事件可能包含业务对象，不能无筛选地上传生产日志。生产性能仍用用户动作、组件更新时间与浏览器主线程证据验证，调试钩子只帮助建立假设。

每次状态结构调整后，都应重放同一组读写步骤，确认依赖数量下降的同时结果、身份和更新时序没有改变。

### 学完后应能说明

你应能解释 ref 容器与 reactive 代理的差别、依赖怎样被追踪与触发、为什么解构和替换会断开联系、computed 的缓存与纯度边界、深浅响应的所有权要求，以及响应式系统为何不能替代运行时校验和异步一致性设计。
