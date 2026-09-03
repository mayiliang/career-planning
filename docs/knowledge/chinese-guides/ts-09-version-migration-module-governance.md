# TypeScript 工程治理知识点讲义

## TS-09 TypeScript 版本迁移、模块语义与弃用治理

升级 TypeScript 不是把 package.json 的版本号改大。编译器、语言服务、程序化 API、模块解析、声明输出、框架模板工具与运行时各有独立兼容面。稳定迁移要先冻结基线，按包说明运行边界，分阶段处理诊断和弃用，再用类型、构建、真实运行与消费者证据决定推进或回滚。

### 学习前先确认

- 直接前置：[TS-01 类型系统、结构化类型与严格模式](../chinese-guides/ts-01-type-system-structural-strict-mode.md#ts-01)。本讲默认理解编译时与运行时边界，不要求先学完所有高级类型语法。
- 直接前置：[ENG-03 依赖、锁文件、Workspace 与 Peer Dependencies](../chinese-guides/eng-03-dependencies-lockfile-workspaces-peer.md#eng-03)。版本解析、锁文件、workspace 与 peer 兼容由该文独立解释。

### 一、先识别实际使用了几套 TypeScript

仓库可同时存在根依赖、包内依赖、全局 `tsc`、编辑器内置版本、Vue/Volar 或 ESLint 使用的编译器 API、测试转译器与构建插件。终端 `tsc --version` 只证明当前命令解析到一个版本。

记录 package manager why/list、锁文件、每个脚本的可执行路径、编辑器 workspace version、插件与 peer range。CI、开发机和发布镜像必须能解释版本来源。

禁止依赖全局 tsc。命令通过 workspace 脚本运行并保存版本头，避免本地绿、CI 红。

### 二、target、module 与 moduleResolution 是不同轴

target 控制输出/假设的 JavaScript 语法级别；module 控制发出的模块形式或保留策略；moduleResolution 控制 TypeScript 怎样找到 import 的文件与类型。三者必须与真实运行时/打包器配对。

浏览器 bundler 项目通常让 bundler 处理模块，选择 bundler/preserve/esnext 方向；Node 项目依据 Node 版本、package.json type、文件扩展名和 exports 选择 node20/nodenext 等。不能整仓复制一个 tsconfig。

编译成功不保证 Node 按同一格式加载。对每个包执行真实 import/start 测试。

### 三、类型发现与 lib 影响全局世界

`types` 控制进入项目的 `@types` 全局包，`lib` 控制 DOM/ES 等标准声明。测试、Node 与浏览器环境混在一个 config 会让代码错误依赖不存在的全局。

为 web、server、test、worker 分 config 或 project reference，明确 types/lib。升级时 DOM 声明变化也可能带来错误，不能全部归因于语言检查。

检查 skipLibCheck 的使用。它可缩短迁移阻塞，却会隐藏依赖声明冲突，必须有 owner 与退出计划。

### 四、声明输出是库的消费者合同

库不仅要自身 typecheck，还要生成 `.d.ts`、package exports/types 条件并在外部 fixture 消费。内部私有路径、不可命名推断或版本特有 lib 类型可能泄露进声明。

保存 declaration diff，区分格式顺序变化与语义变化。用最低支持 TypeScript 版本消费，必要时 typesVersions 或降级语法；不要只在最新编辑器打开源码证明发布可用。

### 五、严格项变化会暴露真实假设

strict、noUncheckedSideEffectImports、exactOptionalPropertyTypes、noUncheckedIndexedAccess 等可能新增诊断。逐类处理：是代码实际可能为空、声明错误、环境缺失还是工具不兼容。

不要批量 `as`、`!`、any、关闭 strict 或无限 skipLibCheck。源代码修复若在旧版本也正确，可提前合入，减少升级分支差异。

诊断台账记录 code、包、根因、修复与验证，避免同类错误被不同团队重复“临时处理”。

### 六、弃用配置需要先理解原用途

baseUrl、旧 moduleResolution、outFile 或 importsNotUsedAsValues 等配置可能来自历史工具链。删除前说明原本解决什么，现代替代是什么，是否仍有消费者。

有 codemod 时先在分支运行，逐项审查 diff。ignoreDeprecations 只作为有期限的迁移窗口，不能让弃用永久无人处理。

### 七、模块解析必须与运行时一致

**模块解析（Module Resolution）**回答一个 import specifier 最终对应哪个源码、声明或包入口。它必须与 Node、浏览器打包器、测试器和发布包真正采用的解析规则一致；类型检查能找到声明而运行时找不到 JavaScript，仍然是失败的工程配置。

Node ESM 的扩展名、package exports、type 字段与 conditional exports 会影响运行；bundler 可能支持 alias、CSS 与虚拟模块，Node 不理解。TypeScript paths 只帮助解析类型，不会自动改写运行时 import。

每个 alias 同时配置 bundler/runtime/test，或通过 package exports 提供统一入口。side-effect-only import 拼错在旧配置下可能静默，启用检查后修真实路径。

### 八、ESM/CJS 互操作需要真实执行

default import、namespace、require、动态 import 和 `__esModule` 在编译器、Node 与 bundler 间有历史差异。esModuleInterop 改善类型/emit 体验，不把任意 CJS 包变成原生 ESM。

测试从 ESM 消费 CJS、从 CJS 消费 ESM（若承诺）、动态 import、CLI 启动和测试运行器。查看最终产物与 package exports，不只看源码提示。

### 九、Project References 与增量缓存也会失效

复合项目用 references、composite、declaration 和 tsbuildinfo 加速。升级编译器后旧增量缓存可能不兼容或掩盖问题，迁移基线包含一次干净构建和一次增量构建。

引用图应与包依赖一致，避免循环和直接源码越界。声明先构建，消费者再检查；并行 CI 不能读取半写产物。

### 十、编辑器、CLI 与 API 是三种产品面

CLI tsc 负责命令行检查/emit，**语言服务器协议（Language Server Protocol）**（LSP）负责编辑体验，**程序化编译器 API（Programmatic Compiler API）**被 ESLint、Volar、MDX、代码生成器等嵌入。一个面可升级不表示另两个自动兼容。

迁移矩阵分别记录 diagnostics、completion/navigation、插件、template typecheck、programmatic tool 与性能。编辑器没有红线不能替代 CI，CLI 更快也不能证明模板工具已切换。

### 十一、框架嵌入语言是独立兼容层

Vue SFC、Svelte、Astro、MDX 和 Angular template 等会把嵌入代码映射到 TypeScript 虚拟文件，并依赖语言服务/API。升级核心编译器前查框架与插件官方支持矩阵。

对 Vue 同时跑 `vue-tsc`/Volar、普通 tsc（适用包）、Vite build、组件测试和编辑器功能。不能只对生成的 `.ts` 文件成功就宣布 SFC 兼容。

### 十二、建立逐包迁移地图

为 `apps/web`、`apps/server`、`packages/ui` 等记录：运行时、module/moduleResolution/target、lib/types、是否 emit、声明消费者、框架插件和当前命令。按包升级能定位错误归属。

基础共享 config 只放真正共同项，环境差异在包内覆盖。迁移一个包时其他包结果作为不变量，避免全仓同时变化无法归因。

### 十三、冻结可复核基线

升级前保存 git commit、锁文件、Node/package manager/TypeScript 版本、完整命令、类型诊断、测试、构建、运行、声明、耗时与峰值内存。环境可重建。

基线若本来红，先分类已知失败并冻结数量/签名，不能把旧问题算成升级回归，也不能因噪声看不到新增问题。

### 十四、分阶段而不是跨大版本跳跃

从 5.7 可先到 5.9，处理推断和弃用；再到 6.0 适应新默认和移除项；最后评估 7.0 原生工具链。每阶段锁精确版本、提交独立修复并可回退。

阶段顺序不是迷信，价值是缩小差异和获得官方迁移桥。若必须直接跨越，也要按各版本 release notes 分类处理，不能一次批量断言。

### 十五、当前版本事实快照

截至 2026-08-31，TypeScript 官方已发布 6.0 与 7.0。6.0 是从 JavaScript 实现过渡到原生 7.0 的桥接版本，带来默认项与弃用/移除变化；7.0 是 Go 原生编译器与语言服务器，官方说明完整构建常见显著加速。

TypeScript 7.0 当前不提供稳定程序化 compiler API，官方预计后续版本提供新 API；需要 API 的工具可与 `@typescript/typescript6` 并行。Vue/Volar、MDX、Astro、Svelte 与部分 Angular 模板工作流可能仍需 6.0。实施升级时必须重新核对官方发布说明，这段快照不是永久兼容承诺。

### 十六、当前仓库的真实起点

本仓库 package.json 与锁文件当前固定 TypeScript 5.7.2，并包含 Vue/Volar 相关工具。因此不能因为 7.0 已正式发布就直接替换为 7.0 并只跑 tsc。

合理路线是：确认所有 workspace 实际版本；5.7→5.9 修复基线；6.0 处理默认/弃用并让 API 依赖工具稳定；隔离评估 7.0 CLI/LSP；按 Vue/Volar 当前支持决定单轨还是 6/7 双轨。

### 十七、6.0 的迁移意义

官方 6.0 说明包括 strict/module/target 等默认变化、noUncheckedSideEffectImports 默认开启、baseUrl 等弃用、classic resolution 与 outFile 等移除/不再支持，以及对 7.0 的准备。精确清单以当前官方文档为准。

已有显式配置的项目未必受默认变化影响，但仍要检查继承 config 和空 config。不要为保持旧行为无脑显式写所有旧默认；先决定目标环境和长期方向。

### 十八、7.0 的原生架构改变工具集成

7.0 的 tsc 与 LSP 可显著改善大型项目速度，但原生实现、并行与新服务协议使程序化 API/插件边界不同。性能收益是升级输入，不是正确性证明。

比较诊断集合、声明、运行和编辑功能，再测时间/内存。并行可能改变输出顺序和竞态暴露，固定测试资源和比较语义内容。

### 十九、双轨方案要显式分工

若 CLI 可用 7.0、框架/ESLint 工具仍需 6.0，package alias 和脚本明确 `typecheck:native`、`typecheck:embedded` 等，不让 PATH 偶然选择。锁文件记录精确版本，CI 打印每条命令版本。

双轨会增加诊断差异、安装和维护成本，设置退出条件：哪些工具发布兼容、哪些差异归零、何时统一。不能把临时双轨变永久无人负责架构。

### 二十、诊断差异按类别处理

新错误可能来自语言正确性、lib.d.ts、模块解析、声明包、插件虚拟文件或配置默认。先最小复现并确认使用哪个编译器，再查 release notes/issue。

对真实 bug 修代码，对上游声明问题升级/补窄修复并跟踪，对编译器回归保留隔离 fixture 和官方 issue。不要用同一个 ts-ignore 覆盖所有类别。

### 二十一、性能比较控制缓存与并行

分别测干净构建、增量、watch 首次与编辑响应；固定代码、Node、CPU、并行参数和磁盘缓存。运行多次取中位数，记录峰值内存与 CI 成本。

TypeScript 7 的并行/诊断选项按官方当前说明使用。更快但漏诊断、声明不同或工具崩溃不能接受；稍慢但正确也可能需继续优化。

### 二十二、弃用治理要有 owner 和截止

建立 deprecation register：选项/API、出现位置、替代、阻塞工具、owner、目标版本、删除条件。新代码禁止继续使用，旧代码按风险迁移。

编译器、框架和 DefinitelyTyped 的弃用同时追踪。设置 ignore 只能指向台账和到期版本，CI 到期重新失败。

### 二十三、声明与消费者兼容需要矩阵

库在支持的最低/最高 TS、Node ESM/CJS、bundler 和应用 fixture 中安装真实 tarball，避免 workspace 源码路径掩盖 exports。检查 types、typesVersions、sideEffects 与 declaration maps。

公共声明不要无意使用新版本才识别的语法。若要提高最低版本，按 semver 和迁移说明发布。

### 二十四、Source Map 与调试链也要回归

emit、bundler 和运行时升级可能改变 Source Map。生产样例抛出已知错误，确认堆栈映射到正确源码、release 与列号；声明 map 也检查编辑器跳转。

类型检查通过而生产堆栈不可诊断，会降低运营能力。迁移证据包含调试链，不只构建产物存在。

### 二十五、自动化测试覆盖多条工具链

运行 tsc noEmit、vue-tsc/模板检查、lint typed rules、unit/E2E、生产 build、Node 启动、声明消费和编辑器 smoke。每项说明使用版本。

创建反例：错 side-effect import、ESM 扩展、模板 prop、声明消费者与全局类型污染，确保相应门禁会失败。只跑“当前全绿”无法证明工具真的工作。

### 二十六、回滚不等于丢掉所有修复

版本和锁文件可回到旧编译器，已证明正确且旧版兼容的源码修复可保留。回滚后重跑旧基线，确认没有半迁移 config、生成物或缓存。

提前定义触发条件：关键运行失败、声明破坏、编辑器不可用、性能超预算或上游插件阻塞。回滚记录根因和再次尝试条件。

### 二十七、发布迁移说明与组织知识

记录为何升级、受影响包、配置变化、常见新错误、工具分工、验证命令、已知限制和回滚。开发者知道编辑器选择哪个版本，CI 为什么跑两条类型检查。

完成后清理临时 alias、ignore、补丁和分支，更新模板项目。一次升级的经验进入自动化检查，降低下一次成本。

### 学完后应能说明

你应能区分 target/module/moduleResolution、类型发现、声明输出、CLI/LSP/API 与框架嵌入工具；能从真实依赖和锁文件建立逐包基线，分阶段处理诊断、弃用和 ESM/CJS；还能针对当前 6.0/7.0 原生迁移与无程序化 API 边界设计双轨、验证、退出和回滚，而不是把版本号升级当完成。
