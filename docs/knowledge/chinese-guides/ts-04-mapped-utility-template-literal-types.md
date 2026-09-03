# TypeScript 知识点讲义

## TS-04 映射类型、工具类型与模板字面量类型

TypeScript 可以从一份稳定模型派生只读视图、可选更新、事件名称和配置表。派生能减少重复，却也容易制造看不懂的类型体操。真正的目标不是记住 `Partial`、`Pick`，而是理解它们如何遍历键、改变修饰符和重映射名称，进而判断哪些关系值得由编译器维护，哪些应该写成明确业务类型。

### 学习前先确认

- 直接前置：[TS-03 泛型、约束、`keyof` 与索引访问](../chinese-guides/ts-03-generics-constraints-keyof-indexed-access.md#ts-03)。联合、严格模式和 JavaScript 值模型由它递归链接，本讲不重复列出。

### 一、映射类型遍历一组 PropertyKey

**映射类型（Mapped Type）**的核心形式是 `{ [K in Keys]: Value }`。Keys 通常来自 `keyof T`，每个 K 对应一个属性，值可用 `T[K]` 保留键值关系。

适用场景是多个类型确实由同一键集合和稳定转换规则派生，例如从只读 DTO 得到可编辑表单、从事件映射得到处理器名称，或对公开模型选择少数字段。若字段语义各自独立、转换含运行时条件，显式命名类型通常更清楚。

```ts
type Flags<T> = {
  [K in keyof T]: boolean;
};

type User = { id: string; active: boolean };
type UserFlags = Flags<User>; // { id: boolean; active: boolean }
```

这是类型层计算，不在运行时遍历对象，也不会创建真实值。若程序需要 flags 对象，仍要实现并测试运行时代码。

### 二、同态映射会保留原修饰符

直接遍历 `keyof T` 并读取 `T[K]` 的同态映射通常保留 readonly 与 optional。使用 `+?/-?` 和 `+readonly/-readonly` 可以显式添加或移除。

```ts
type MutableRequired<T> = {
  -readonly [K in keyof T]-?: T[K];
};
```

移除可选只改变属性是否必须存在，不自动从值类型删除 `undefined`。`exactOptionalPropertyTypes` 会让“缺失”与“显式 undefined”更精确，工具类型设计应在目标配置下验证。

### 三、Partial、Required、Readonly 是浅层转换

`Partial<T>` 让第一层属性可选，`Required<T>` 让第一层必需，`Readonly<T>` 禁止第一层重新赋值。嵌套对象仍保持原类型，运行时对象也没有冻结。

```ts
type Profile = { name: string; prefs: { theme: string } };
declare const view: Readonly<Profile>;
view.prefs.theme = 'dark'; // 第一层 readonly 不阻止这个嵌套写入
```

把静态 Readonly 当作运行时不可变会产生安全错觉。需要运行时冻结、状态库规则或值对象封装时另行实现。

### 四、Pick 与 Omit 表达明确子集

`Pick<T,K>` 保留指定键，`Omit<T,K>` 排除指定键。它们适合从稳定内部实体派生窄视图，但不能代替接口边界审查。

直接 `Omit<User,'passwordHash'>` 作为公开 DTO 存在风险：实体以后新增 secret 字段会被自动公开。安全输出更适合正向 Pick 或独立 DTO，字段变化经显式评审。

工具类型表达结构关系，不表达数据来源、授权或序列化。服务端仍需按当前权限构造结果。

### 五、Record 建立有限键集合

`Record<K,V>` 表示每个 K 都有 V。K 是有限字面量联合时非常适合穷尽配置：

```ts
type State = 'idle' | 'loading' | 'error';
const labels = {
  idle: '等待',
  loading: '加载中',
  error: '失败',
} satisfies Record<State, string>;
```

`Record<string,V>` 则声称任意字符串键都存在，与普通 JavaScript 对象实际可能缺失冲突。开启 noUncheckedIndexedAccess 或使用 `Partial<Record<string,V>>`/Map 更诚实。

### 六、交叉组合可能让错误信息复杂

`PartialByKeys<T,K> = Omit<T,K> & Partial<Pick<T,K>>` 能只让部分键可选。交叉结果在提示中可能显示两块，使用 `Prettify` 展开只改善展示，不改变语义。

```ts
type Prettify<T> = { [K in keyof T]: T[K] } & {};
type PartialByKeys<T, K extends keyof T> = Prettify<
  Omit<T, K> & Partial<Pick<T, K>>
>;
```

若规则是“更新 name 时必须同时提供 reason”，单纯 Partial 无法表达字段关联，应使用判别联合或命令类型。

### 七、键重映射用 as 生成新表面

映射类型可以 `as` 重映射键：

```ts
type ChangeHandlers<T> = {
  [K in keyof T & string as `on${Capitalize<K>}Change`]:
    (value: T[K]) => void;
};
```

`keyof T & string` 排除 number/symbol，因为字符串模板只处理字符串键。生成名称必须与运行时注册方式一致；类型有 `onNameChange` 而实现发 `name-change` 仍是漂移。

### 八、映射到 never 可以过滤键

在 `as` 位置返回 never 会删除该属性。可以按 key 名或 value 类型筛选：

```ts
type FunctionKeys<T> = {
  [K in keyof T]-?: T[K] extends (...args: any[]) => unknown ? K : never
}[keyof T];
```

可选属性可能包含 undefined，使条件判断出现意外。先决定是否使用 NonNullable，明确“可选函数”是否属于函数键。不要靠试错叠加条件。

### 九、模板字面量类型组合字符串联合

**模板字面量类型（Template Literal Type）**在类型层把字符串字面量联合组合成新联合。`'top'|'bottom'` 与 `'left'|'right'` 可生成四种 placement。

联合成员数会做笛卡尔积，多个大联合迅速膨胀，拖慢编辑器并产生难读错误。适合小而稳定的命名协议，不适合生成所有路由、语言和字段组合。

运行时字符串仍需验证。来自 URL 的 `string` 不会因 `as Placement` 变得合法。

### 十、内置字符串转换有语言边界

Uppercase、Lowercase、Capitalize、Uncapitalize 基于编译器内置的字符转换，并非完整 locale-aware 文本系统。它们适合代码标识符，不应用于用户姓名、土耳其语大小写或显示文案。

类型名称生成与运行时函数要共享可验证规则。复杂 Unicode 命名协议更适合显式 map。

### 十一、递归映射必须声明支持范围

DeepReadonly 常见，但 `object` 包含数组、函数、Date、Map、Set 和第三方类。无边界递归会把方法和内部实现映射成奇怪结构。

先处理 primitive、Function、Date 等叶子，再处理 readonly arrays、Map/Set 与普通 record。即使 Date 类型保留，Date 实例仍可通过方法变化；静态深 readonly 不等于运行时深冻结。

业务最好定义“本系统可深映射的数据树”而不是声称支持任意 object。递归深度也会触发编译器实例化限制。

### 十二、数组与元组需要保持形状

数组是对象，粗糙映射会遍历 length、push 等成员。内置 Readonly 对数组有专门行为，递归工具也应先匹配 tuple/array。

元组包含固定位置、可选元素和 readonly 修饰。`T extends readonly unknown[]` 后用 mapped tuple 可保持位置，若直接 `T[number]` 会丢成元素联合。

测试普通数组、readonly array、固定 tuple 和可选 tuple，不能只用 `{profile:{name}}`。

### 十三、symbol 与 number 键不能被字符串协议吞掉

PropertyKey 是 string|number|symbol。`keyof` 数字索引和字符串索引会产生不同结果，模板重映射若只支持 string 应显式 `Extract<keyof T,string>`。

把所有键 `String(K)` 化可能碰撞 symbol 或数字语义。DOM attribute、JSON 和事件名本就只支持字符串子集，类型应诚实缩小而不是断言。

### 十四、satisfies 保留推断并检查结构

类型注解可能把字面量拓宽，而 `satisfies` 检查值满足目标形状并保留自身精确类型。它适合状态配置、路由表和 token 表。

```ts
const transitions = {
  idle: ['loading'],
  loading: ['idle', 'error'],
  error: ['loading'],
} as const satisfies Record<State, readonly State[]>;
```

satisfies 不改变运行时，也不会冻结对象。外部 JSON 仍从 unknown 解析。

### 十五、工具类型应服务单一来源

最有价值的派生是从一个明确 source of truth 生成多个一致视图：状态联合到标签表、DTO 到表单 patch、事件 schema 到 handler。若真源不稳定或多个系统各有定义，复杂派生会隐藏冲突。

不要从数据库实体自动派生所有 API、表单和权限类型。各边界有不同生命周期和安全要求，适度重复反而让变更显式。

### 十六、编译器性能也是 API 质量

大型联合、递归映射、模板笛卡尔积和多层条件会增加实例化次数。症状包括编辑器补全卡顿、类型错误巨大、声明输出膨胀。

使用 `tsc --extendedDiagnostics`、trace 与最小复现定位热点。缓存中间别名、缩小联合、降低递归、在公共边界发布简单命名类型。类型级“零运行时成本”仍有开发与构建成本。

### 十七、错误可读性决定长期维护

公共工具类型起清楚名称，参数不超过必要数量，错误尽量发生在调用点。若使用者必须阅读五层展开才能知道缺哪个字段，API 设计需要简化。

为复杂转换写 doc comment、正向示例和预期失败。不要用 `any` 或 `as unknown as` 把错误压下去；这只是移除证明。

### 十八、类型测试保存正反证据

对 PartialByKeys 证明只有目标键可选，Readonly 证明写入失败，事件名证明键和值对应，过滤证明不合格键消失。使用 `@ts-expect-error` 时每条说明为何必须失败；若以后不再报错，编译器会提示过期断言。

运行时同步测试生成的事件注册表、序列化与 schema。类型与实现两层都通过，派生合同才可信。

### 十九、何时退回显式类型

只有一个业务场景、变化很少时，直接写 `CreateUserInput` 可能比抽象通用 `DeepMutableExcept` 更清楚。安全边界、跨团队 API 与持久化 schema 尤其适合明确命名。

当类型参数无法推断、错误不可解释、实现依赖断言、编译明显变慢或业务关系无法由字段变换表达时，停止类型体操。高级 TypeScript 不是最长类型，而是最小且真实的约束。

团队还应把公共工具类型的兼容性当作发布合同。改变可选修饰符、键过滤规则或递归叶子，会让下游在看似无运行时代码变化时出现大量错误；先用类型测试锁定旧行为，发布迁移说明，并避免在多个包复制名称相同但语义不同的 `DeepReadonly`。

评审时要求作者用一句业务语言说明每次派生：“从字段 K 生成只接收 T[K] 的变更处理器”，而不是只展示实现。若一句话无法说清，往往说明类型同时承担了多个责任，应拆成命名中间模型。

### 学完后应能说明

你应能解释映射类型如何遍历键、保留或改变修饰符、用 `as` 重映射/过滤，理解 Partial/Pick/Record 的真实边界和模板字面量联合膨胀；能为递归映射声明支持范围，用 satisfies 与类型测试维护单一来源，并在安全、性能或可读性不合适时选择显式业务类型。
