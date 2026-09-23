# TypeScript 知识点讲义

## TS-09 TypeScript 版本迁移、模块语义与弃用治理

升级 TypeScript 后，命令行通过了，编辑器还在报错；或者源码能找到模块，编译出来的 JavaScript 却无法启动。这些现象往往不是一项配置能解释的，因为“检查类型”“生成文件”“加载模块”和“编辑器服务”可能由不同工具完成。

本讲先用一个小型 ESM 包观察完整产物，再讨论逐包迁移与工具兼容。版本信息按 2026-09-15 读取的官方发布说明整理；其中关于 6.0、7.0 的描述是发布说明中的版本事实，不代表本仓库已升级。可运行实验使用本仓库已安装的 TypeScript 5.7.2 与 Node 22.23.0。实际迁移时应重新核验目标版本和框架工具的支持状态。

### 学习前先确认

- 直接前置：[TS-01 类型系统、结构化类型与严格模式](../chinese-guides/ts-01-type-system-structural-strict-mode.md#ts-01)。需要理解类型擦除、严格检查与运行时能力的区别。
- 直接前置：[ENG-03 依赖、锁文件、workspaces 与 peerDependencies](../chinese-guides/eng-03-dependencies-lockfile-workspaces-peer.md#eng-03)。迁移还涉及包解析、版本锁定与工具依赖，不能只修改一个数字。

读完应能从实际产物定位模块问题，为 browser app、Node service 和组件库分别列出验证项，并写清兼容窗口与回滚条件。

### 一、先找出是谁在检查这份代码

**编译器（Compiler）**不是仓库里唯一接触 TypeScript 的工具。命令行、编辑器、框架语言工具、声明生成器、代码分析插件，可能各自加载不同版本。

| 执行入口 | 要查的事实 | 常见误解 |
| --- | --- | --- |
| 项目脚本里的 tsc | 实际可执行文件、版本、读取的配置 | 全局 tsc 就代表项目版本 |
| 编辑器语言服务 | 当前工作区所选 TypeScript 与扩展 | 没有红线就说明命令行通过 |
| vue-tsc 等框架工具 | 自身版本、依赖的编译器 API | 普通 tsc 能检查所有模板 |
| 声明或代码分析工具 | 从哪个包导入 TypeScript | CLI 升级后内部 API 自动兼容 |

迁移记录应包含工具版本、对应包、配置路径与运行方式。例如“web 的 vue-tsc 通过”比“TS 通过”更可复核。先保留迁移前的真实输出，再改变一项，否则之后很难判断错误是不是本来就存在。

### 二、把 target、module、解析、lib 和 types 分开看

| 配置 | 主要回答 | 不会替你完成 |
| --- | --- | --- |
| target | 输出保留到哪一级 JavaScript 语法，并影响默认库声明选择 | 给旧环境安装新 API |
| module | 按什么模块模式检查或输出 | 决定所有部署环境的加载规则 |
| moduleResolution | 编译器怎样模拟模块查找 | 修改 Node 的真实解析器 |
| lib | 编译器认为有哪些标准与宿主 API | 创建 DOM、fetch 或 polyfill |
| types | 哪些类型包进入全局环境 | 禁止源码导入其他包的类型 |

**模块解析（Module Resolution）**应符合代码最终由谁加载。交给 bundler 的网页与直接交给 Node 的服务，不一定使用同一组合。NodeNext 模拟 Node 的模块判断，具体规则也会随编译器演进；需要稳定绑定某代 Node 行为时，要确认目标 TypeScript 是否支持对应版本化模式。

比如给纯 Node 工具加入 DOM lib，会让 document 在类型层存在，但 Node 里仍可能没有它。把 target 调低也不会自动补上 Promise 或新数组方法。语法、声明和运行时能力是三个需要对齐的事实。

### 三、运行一个真的生成 JavaScript 与声明的小包

在新的 lesson-note-kit 目录保存下面四个文件。这个包只接受字符串标题，去掉首尾空格并拒绝空标题；它不访问网络、不依赖框架。package.json 中的版本是实验固定基线，不是升级建议。

```json example=ts09-package runtime=project file=package.json
{
  "name": "@lesson/note-kit",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "files": ["dist"],
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" }
  },
  "scripts": { "build": "tsc -p tsconfig.json" },
  "devDependencies": { "typescript": "5.7.2" }
}
```

```json example=ts09-config runtime=project file=tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "src",
    "outDir": "dist",
    "lib": ["ES2022"],
    "types": [],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedSideEffectImports": true,
    "verbatimModuleSyntax": true,
    "declaration": true,
    "sourceMap": true,
    "inlineSources": true,
    "noEmitOnError": true,
    "skipLibCheck": false
  },
  "include": ["src/**/*.ts"]
}
```

```ts example=ts09-title runtime=project file=src/title.ts
export function normalizeTitle(value: string): string {
  const title = value.trim();
  if (title.length === 0) throw new Error('标题不能为空');
  return title;
}
```

```ts example=ts09-index runtime=project file=src/index.ts
import { normalizeTitle } from './title.js';

export interface Note {
  readonly title: string;
}
export function createNote(title: string): Note {
  return Object.freeze({ title: normalizeTitle(title) });
}
```

安装这个实验目录的依赖，再运行 build，会产生 dist/index.js、dist/title.js、各自的 .d.ts 与 source map。源码写的是 './title.js'，实际文件是 title.ts：编译器在检查时通过扩展名替换找到源码，而输出保留供 Node 加载的 .js 路径。

Object.freeze 是实际浅冻结；readonly 是静态写入限制。本例只有一个字符串字段，所以浅冻结足够。不要把这两项泛化为任意嵌套对象的深度不可变。

### 四、故意改错一次，看问题发生在哪一层

在正常构建后，只把 index.ts 的 './title.js' 改成 './title'，再编译。TypeScript 5.7.2 的 NodeNext 会指出 ESM 相对导入缺少扩展名。恢复后重新构建，错误应消失。

再做一组有边界的对照：保留缺扩展名的导入，把实验配置的 module 改为 ESNext、moduleResolution 改为 bundler。此时类型检查允许这种路径，但直接用 Node 加载编译结果会找不到 dist/title。因为本实验没有 bundler 替它解析和重写。

| 版本基线 5.7.2 下的组合 | 编译 | 直接由 Node 加载 |
| --- | --- | --- |
| NodeNext，导入 './title.js' | 通过 | 成功 |
| NodeNext，导入 './title' | 拒绝缺扩展名 | 不产生新产物 |
| ESNext + bundler，导入 './title' | 通过 | 找不到模块 |

noEmitOnError 不会删除上次构建留下的旧文件。验证失败时应看退出码，并在独立输出目录观察本轮产物，不能继续运行旧 dist 再宣布新构建成功。

这是一个模块解析反例，不是说所有 bundler 配置都不能服务 Node。真正交给打包器处理的服务，需要以其产物为验证对象。实验结束后恢复四文件基线配置。

### 五、从包外消费产物，才能检查公开入口

包内源码别名可能掩盖声明路径问题。把已构建小包打成 tarball，再在旁边的 consumer 目录安装这份包，检查包里实际包含的文件。

在 lesson-note-kit 中执行以下命令；npm pack 只创建本地压缩包，不发布包。private 标记也保留着。

```powershell example=ts09-build-pack runtime=project
npm install
npm run build
npm pack --ignore-scripts
```

在相邻 consumer 目录创建下面三个文件，再安装本地 tarball。命令里的相对路径对应刚才的目录名；本实验不把 TypeScript 加进 consumer 的依赖。

```json example=ts09-consumer-package runtime=project file=consumer/package.json
{
  "name": "note-kit-consumer",
  "private": true,
  "type": "module"
}
```

```js example=ts09-consumer-js runtime=project file=consumer/main.mjs
import { createNote } from '@lesson/note-kit';
const note = createNote('  条件类型  ');
console.log(note.title);
console.log(Object.isFrozen(note));
try { createNote('   '); } catch (error) { console.log(error.message); }
// => 条件类型
// => true
// => 标题不能为空
```

```ts example=ts09-consumer-types runtime=project file=consumer/types.ts
import { createNote } from '@lesson/note-kit';
import type { Note } from '@lesson/note-kit';
const note: Note = createNote('泛型');
function rejected() {
  // @ts-expect-error 公开声明只接受字符串
  createNote(3);
  // @ts-expect-error 公开声明保留 readonly
  note.title = '另一标题';
}
```

```powershell example=ts09-consumer-commands runtime=project
npm install ../lesson-note-kit/lesson-note-kit-1.0.0.tgz
node main.mjs
node ../lesson-note-kit/node_modules/typescript/bin/tsc types.ts --noEmit --strict --module NodeNext --moduleResolution NodeNext --target ES2022 --skipLibCheck false
```

JavaScript 消费结果应依次是“条件类型”、true、“标题不能为空”；类型消费应通过，并确认两处预期错误有效。如果包里漏了 title.js、exports 指向源码，或 .d.ts 引用未发布路径，这一步会暴露问题。

本例只承诺 ESM 的 import 消费。CommonJS、不同 moduleResolution 或更旧编译器需要各自的消费场景，不能凭这一组结果宣称全面兼容。

### 六、类型发现与副作用导入也会改变结果

**verbatimModuleSyntax** 让类型专用导入的擦除与普通导入的保留更明确。只用于类型时使用 import type；需要运行时执行时保留普通导入，不要指望编译器替你猜测模块副作用。

例如 `import './register.js'` 没有导入变量，却可能注册组件。路径拼错时，未检查的副作用导入会藏住问题。开启 noUncheckedSideEffectImports 可以让无法解析的此类导入报错。CSS 等非 JavaScript 资源如果由 bundler 处理，应提供匹配实际支持范围的声明，并让构建器验证文件确实存在；笼统声明所有名字都会弱化这层检查。

lib 与 types 也要分包安排。网页需要 DOM 声明；服务器使用 Node 类型；测试环境可能额外需要测试工具全局。把它们全堆进基础 tsconfig，会让某些包意外使用只在测试环境存在的变量。

**paths** 用于告诉 TypeScript 如何理解路径映射，本身不保证改写输出中的导入。若输出仍是 '@/config'，Node 也需要真实可用的加载规则，或在构建阶段重写。只因编辑器能跳转到文件就认为部署可用，是典型误判。

### 七、6.0 的默认值变化要改成可审阅的配置差异

按 2026-09-15 核验的官方 6.0 发布说明，6.0 是通往原生编译器的过渡版本。和依赖旧默认值的配置相比，需要特别核对以下项目：

| 6.0 发布说明中的变化 | 迁移时要确认 |
| --- | --- |
| strict 默认开启 | 原有错误是新增检查暴露，还是新代码引入 |
| module 默认 ESNext，target 默认跟随当年支持版本 | 产物目标是否仍符合部署环境 |
| rootDir 默认当前配置目录 | dist 的目录层次有没有变化 |
| types 默认空数组 | Node、测试等全局类型是否显式列出 |
| noUncheckedSideEffectImports 默认开启 | 资源导入是否有正确声明和真实构建支持 |

这些是目标版本的行为，不应倒灌成“所有 TypeScript 版本都如此”。本讲小包显式配置关键项，方便观察升级差异。

发布说明也列出 baseUrl、ES5 相关选项等弃用变化。处理 baseUrl 时，要重新检查裸路径是否依赖它；paths 的相对目标可能需要相应调整。不要只删除选项而不核对导入含义。对于目标版本支持的新 module/moduleResolution 组合，也应按该版本文档判断，不把 5.7 的兼容结论永久套用。

### 八、7.0 的 CLI 与程序化 API 要分轨核验

**CLI** 是通过命令执行检查；**LSP** 是编辑器和语言服务通信的协议；**Compiler API** 则让插件直接创建程序、读取类型或操作语法树。三者用途不同，某一入口可用不能证明另两项兼容。

7.0 官方发布说明介绍了原生实现，并明确 7.0 不随包提供程序化 API。说明中提到未来 7.1 的新 API 计划，属于后续计划，不是本讲已验证的可用能力。

官方提供 **@typescript/typescript6** 兼容包，带 tsc6 可执行入口与 6.0 API；需要直接导入 typescript 的工具还涉及 npm alias。理解这种双轨时，应写清：

- 哪个包名解析到 6.0 API，供框架或分析工具加载。
- 哪个可执行入口使用 7.0，负责独立 CLI 工作。
- 编辑器、模板工具和声明生成分别走哪一轨。
- 何时重新验证、什么条件满足后退出兼容轨道。

7.0 发布说明特别提醒嵌入 TypeScript 的 Vue/Volar、模板等工具存在迁移约束。实际实施时还要核验这些工具当时的正式支持版本；这不是对所有后续工具版本永久“不支持”的判定。原生编译器的官方性能案例也不能替代自己仓库的测量。

### 九、逐包迁移，基础配置只共享真正相同的规则

| 包的用途 | 模块与宿主重点 | 需要的证据 |
| --- | --- | --- |
| browser app | bundler 的模块规则、DOM、资源导入 | 类型检查、打包、浏览器启动 |
| Node service | 输出格式与部署 Node 一致 | 类型检查、实际启动、关键导入 |
| Vue component package | 模板工具、声明导出、消费方 | 模板检查、构建、外部消费 |

这个表是按职责制定的迁移方法，不宣称当前仓库服务器已经采用 NodeNext。当前仓库的 web、server 与 shared 都能见到 ESNext/bundler 配置，需要结合各自构建链判断。不能因为都是 .ts 文件就强行共用完整 tsconfig。

基础配置适合共享严格选项；宿主库、模块模式、输出位置、测试全局等通常留在各包。Project References 可以表达项目构建依赖，composite/declaration 等约定要一起满足。引用图不等于包的发布图，依然要检查最终导入与声明入口。

逐包试迁时锁定编译器、框架工具和构建依赖，记录使用的配置及命令。尽量把配置整理、业务类型修复与编译器升级分成可解释的变更，减少一次出现多种根因。

### 十、诊断先归类，再比较性能

| 现象 | 优先找的证据 |
| --- | --- |
| 只有编辑器出错 | 所选编译器版本、语言扩展与项目归属 |
| 找不到全局变量 | lib、types、类型包与配置继承 |
| 编译通过但启动失败 | 输出里的导入、扩展名、type 与 exports |
| 模板报错而普通 TS 通过 | 框架语言工具使用的 API 轨道 |
| 只在消费方失败 | 发布文件与声明、解析模式、编译器范围 |
| 类型推导明显变慢 | 递归、联合扩张、重复声明与项目边界 |

不要第一时间打开 skipLibCheck。它跳过声明文件的部分检查，可能隐藏冲突；既不修复运行时加载，也不保证库类型一致。临时兼容措施若确有必要，应记录范围、负责人和退出条件，不能用它冒充迁移完成。

性能比较要固定机器、文件集合、配置与检查范围，区分冷构建、增量构建和编辑器响应。清理或隔离相应增量缓存，先预热再按约定重复少量测量；不能把“少检查了一批文件”产生的加速算成编译器收益。复杂类型的边界可回看[TS-05](../chinese-guides/ts-05-conditional-infer-distribution.md#十二用一张推导表决定工具是否值得保留)。

### 十一、弃用登记要写替代方式和退出条件

**弃用（Deprecation）**表示某种写法需要迁移，可能尚未删除；具体还能用多久，以目标版本说明为准。项目登记表应该让维护者能执行：

| 项目 | 记录内容 |
| --- | --- |
| 旧行为 | 哪个包、哪个配置或 API、为什么还在依赖 |
| 替代方式 | 新配置、代码路径或工具版本 |
| 兼容窗口 | 暂时由哪一轨提供能力 |
| 验证方式 | 哪个构建、运行或消费场景证明替换成功 |
| 退出条件 | 对应工具正式支持、产物一致、调用方完成迁移 |

输出 .d.ts 的包还要声明最低 TypeScript 版本。引入调用方旧版本无法解析的新语法，即使 JavaScript 完全不变，也会破坏消费。更改回调参数、重载或泛型推断规则，同样可能影响调用者；代表场景可以来自[TS-06 的函数接口](../chinese-guides/ts-06-functions-overloads-variance-component-apis.md#ts-06)。

仅发布说明里说“兼容”，不能替代自己的导出面与调用方式。对需要支持的消费范围分别保留正例与应拒绝例，减少无目标的配置矩阵膨胀。

### 十二、用可恢复的产物完成迁移

可以按以下顺序整理交付：

1. 保留迁移前锁文件、配置、实际命令与产物位置，记录已存在的诊断。
2. 选择一个包试迁，确认类型、真实运行或打包，以及公开声明消费。
3. 对需要旧 API 的工具保留明确兼容轨道，核对编辑器与 CI。
4. 扩大到其他包，更新脚本、开发说明和支持范围。
5. 确认旧配置或工具退出条件后，再移除临时兼容项。

回滚需要一起恢复锁文件、配置、脚本、工具轨道及相关产物，避免新旧输出混用。增量缓存按配置和工具版本隔离；恢复版本后重新构建，比继续使用不明来源的旧 dist 更容易判断结果。source map 也应与发布产物对应，避免错误堆栈指向错误源码。

本讲的小包证明了基线下的编译、ESM 加载、声明消费与一个解析反例；没有在真实仓库实施 6.0/7.0 升级，也没有据此宣布 Vue 工具链可迁移。沿着这些证据逐包推进，才能把“升级成功”说具体。

### 参考与延伸阅读

- [TypeScript：模块理论](https://www.typescriptlang.org/docs/handbook/modules/theory.html)、[模块参考](https://www.typescriptlang.org/docs/handbook/modules/reference.html)：宿主、解析与输出的关系。
- [Node.js：ESM](https://nodejs.org/api/esm.html)：相对导入扩展名与包加载。
- [TypeScript：verbatimModuleSyntax](https://www.typescriptlang.org/tsconfig/verbatimModuleSyntax.html)、[skipLibCheck](https://www.typescriptlang.org/tsconfig/skipLibCheck.html)、[Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)：配置的具体边界。
- [TypeScript 6.0 正式发布说明](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/)、[7.0 正式发布说明](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)：2026-09-15 核验的版本来源，实施时重新确认。
