# 工程化知识点讲义

## ENG-03 依赖解析、Lockfile、Workspace 与 Peer Dependency

你写下 `import { summarize } from '@atlas/summary'`，这行代码到底会找到谁？为什么同一仓库里能运行，打成包交给别人却报模块不存在？为什么两个人都安装了同一个版本，运行行为仍可能不同？

理解依赖管理，要把三个问题分开：包声明自己需要什么，包管理器最终选中了什么，运行工具实际加载了什么。这篇先建立一个没有外部依赖的小 workspace，再把其中的包取出来交给独立消费者使用，让这些区别变得可见。

### 学习前先确认

本讲没有硬性前置。需要能创建文本文件并在相应目录运行终端命令。例子使用 Node.js 22.23.0、pnpm 11.19.0；先用 `node --version` 和 `pnpm --version` 核对工具。本地包例子不需要从注册表下载第三方代码，但安装 pnpm 本身是另一步。

下面新建独立的 `dependency-lab`，不在业务仓库里试验依赖修改。当前 pnpm 在线文档已进入后续主版本，设置位置、脚本批准策略和默认值可能变化，本文的执行说明以这个明确版本为准。

### 从三个问题读懂依赖关系

**包清单（manifest）**通常就是 `package.json`：它表达包的名字、入口、脚本和依赖要求。**锁文件（lockfile）**记录一次解析后选定的版本、关联关系和来源等信息。运行时解析则从当前导入者出发，按实际解析规则找到具体入口。

例如应用写 `"tool": "^1.2.3"`，这表达允许范围；锁文件可能选中 `1.4.0`；浏览器构建又可能选择该版本中的 browser 入口，而 Node 选择另一个入口。不能只看一行版本声明就推断最终运行代码。

| 想知道什么 | 优先查看哪里 | 常见误判 |
| --- | --- | --- |
| 谁应该负责声明这个包 | 使用它的包清单 | 根目录安装过，所有子包就都拥有它 |
| 为什么安装了这个版本 | 锁文件、依赖树、`why` 的路径 | 只盯住顶层直接依赖 |
| 本次执行加载了哪个文件 | 解析结果、exports 条件、构建清单 | 同名包必然是同一个运行实例 |
| 最后交付了哪些代码 | tarball、应用构建产物及消费者运行 | 源码仓库中有文件，发布包里就一定有 |

锁文件帮助团队共享解析结果，不会替运行时解决所有条件差异。沿源码到产物的后半段，可以连接 [ENG-01 的模块图](../chinese-guides/eng-01-module-graph-build-output-source-maps.md#模块图回答一份代码为什么会被带进来)。

### 四类依赖先按使用责任区分

**运行依赖（dependencies）**是包正常使用时需要的依赖；**开发依赖（devDependencies）**用于开发、检查或构建这个包；**同伴依赖（peer dependency）**表达“我要接入宿主已经采用的某种能力及其兼容范围”；可选依赖允许某项安装失败或在不适用的平台缺席，但调用代码仍需处理缺席状态。

| 场景 | 通常声明在哪一类 | 为什么 |
| --- | --- | --- |
| Node 服务启动时调用数据库客户端 | dependencies | 部署后的服务还要加载它 |
| 用 TypeScript 生成发布文件 | devDependencies | 编译器是生成工具，消费者通常不需要运行编译器 |
| React 组件库要与应用共享 React | peerDependencies，开发时另配测试用版本 | 需要与宿主的框架实例和版本合同一致 |
| 某个平台上的可选加速实现 | optionalDependencies | 缺席时必须有回退或清楚的能力提示 |

这些分类不能直接预测浏览器包大小。如果应用把一个标成 devDependency 的库导入浏览器入口，打包器仍可能把它打进去；把它挪到另一栏并不会自动省掉下载。相反，服务端部署若只安装生产依赖，就不能在启动阶段突然依赖一个只放在 devDependencies 的工具。

也不要把可选项理解为“错误可以忽略”。例如图片处理库缺少原生扩展时，可以退回较慢实现；如果产品根本没有回退，就应该在启动或功能入口解释缺失，而不是运行到深处才抛出看不懂的错误。

### 建一个只连接本地包的 workspace

**工作区（workspace）**把多个包放在同一仓库中统一安装和组织，但每个包仍有自己的依赖与公开入口。按下列布局创建文件：

```text
dependency-lab/
  package.json
  pnpm-workspace.yaml
  packages/
    summary/
      package.json
      index.js
      internal.js
    reader/
      package.json
      index.js
```

根清单只管理这个练习，不向消费者发布：

```json example=eng03-root runtime=project file=package.json
{
  "name": "dependency-lab",
  "private": true,
  "packageManager": "pnpm@11.19.0"
}
```

```yaml example=eng03-workspace runtime=project file=pnpm-workspace.yaml
packages:
  - 'packages/*'
```

统计包的清单与实现如下。这里故意把一个内部文件放进包，但不把它列为公开入口，稍后观察 exports 的作用。

```json example=eng03-summary-package runtime=project file=packages/summary/package.json
{
  "name": "@atlas/summary",
  "version": "1.0.0",
  "type": "module",
  "exports": { ".": "./index.js" },
  "files": ["index.js", "internal.js"]
}
```

```js example=eng03-summary runtime=project file=packages/summary/index.js
export function summarize(lessons) {
  const minutes = lessons.reduce((sum, lesson) => sum + lesson.minutes, 0);
  return `${lessons.length} 篇资料，${minutes} 分钟`;
}
```

```js example=eng03-internal runtime=project file=packages/summary/internal.js
export const internalVersion = '只供包内使用';
```

阅读器明确声明自己使用统计包：

```json example=eng03-reader-package runtime=project file=packages/reader/package.json
{
  "name": "@atlas/reader",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": { "start": "node index.js" },
  "dependencies": { "@atlas/summary": "workspace:*" }
}
```

```js example=eng03-reader runtime=project file=packages/reader/index.js
import { summarize } from '@atlas/summary';

console.log(summarize([{ minutes: 12 }, { minutes: 18 }]));
console.log('实际入口：', import.meta.resolve('@atlas/summary'));
try {
  await import('@atlas/summary/internal.js');
} catch (error) {
  console.log('内部路径：', error.code);
}
```

在 `dependency-lab` 根目录执行 `pnpm install --offline --ignore-scripts`，再执行 `pnpm --filter @atlas/reader start`。预期第一行是 `2 篇资料，30 分钟`；实际入口指向本地统计包的 `index.js`；内部路径报告 `ERR_PACKAGE_PATH_NOT_EXPORTED`。

此例没有注册表依赖，也没有安装脚本，所以可以离线连接本地包。不要把它推广成“任何空缓存项目都能离线安装”。我们会在锁文件一节专门区分这两个条件。

### workspace 协议让本地包关系明确失败

`workspace:*` 表示要求使用当前 workspace 中的对应包。如果本地找不到，不能悄悄去注册表下载一个同名包来补上。它特别适合表达“这里必须用我们仓库里的这个实现”。

做一次故障对照：把阅读器依赖中的包名 `@atlas/summary` 改为 `@atlas/missing`，值仍为 `workspace:*`，执行 `pnpm install --offline --ignore-scripts --no-frozen-lockfile`。工作区没有这个包，安装应报告 `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND`，而不会从注册表补一个同名实现。看到失败之后，把包名恢复为 `@atlas/summary` 并重新安装。

这里主动使用 `--no-frozen-lockfile`，是为了观察本地包选择本身的错误；如果冻结锁文件，工具可能先因清单变化而拒绝，根本还没有走到包选择阶段。先确定想观察哪一步，错误信息才有解释价值。

普通 semver 范围是否自动链接本地包，还受包管理器设置影响。显式 workspace 协议把意图写进包之间的关系中，更容易审查。它也不表示可以从 `../../summary/internal.js` 随意越过边界；相对源码越界仍需要规则、目录设计和消费者检查来约束。

### 版本范围表达兼容承诺而不是验证结果

**语义化版本（SemVer）**用主版本、次版本、修订版本表达兼容变化的承诺。范围工具据此筛选候选版本，但不能证明作者从未引入回归。

下面只讨论普通稳定版本，不包含预发布版本的额外匹配规则：

| 声明 | 常见可选范围 | 例子 |
| --- | --- | --- |
| `1.2.3` | 只选该版本 | 不自动选 1.2.4 |
| `~1.2.3` | `>=1.2.3` 且 `<1.3.0` | 可选 1.2.9，不选 1.3.0 |
| `^1.2.3` | `>=1.2.3` 且 `<2.0.0` | 可选 1.9.0，不选 2.0.0 |
| `^0.2.3` | `>=0.2.3` 且 `<0.3.0` | 不跨越 0.2 这一线 |
| `^0.0.3` | `>=0.0.3` 且 `<0.0.4` | 不把 0.0.4 当作兼容更新 |

caret 的关键是最左边非零位，不是永远允许升级次版本。预发布版本例如 `2.0.0-beta.1` 有专门的匹配限制，不要凭这张简表推断会被普通稳定范围纳入。

升级时同时看公开 API、迁移说明、实际消费者与构建结果。锁文件里的小版本变化，也可能影响样式、解析条件、原生二进制或框架组合；发现问题后应缩小到具体依赖路径与变化，不把“版本号说兼容”当作行为证据。

### 冻结安装检查清单与锁文件是否一致

第一次安装后保留生成的 `pnpm-lock.yaml`。再次运行 `pnpm install --frozen-lockfile --offline --ignore-scripts` 应成功，因为依赖要求与已有锁定结果一致，而且本例只需要本地文件。

接着只把阅读器的 `workspace:*` 改成 `workspace:^1.0.0`，其他内容不动，再运行同一条冻结安装命令。即使本地 `1.0.0` 仍满足新范围，清单中的要求已经变化，工具应拒绝使用未同步的锁文件。恢复原值后，冻结安装恢复成功。

冻结安装保护的是“不能悄悄重新求解依赖”。开发者有意更改依赖时，应执行正常安装更新锁文件，检查差异，再把清单与锁文件作为同一个变化交付。不要把删除锁文件当成通用修复：它会让许多本来无关的传递依赖重新选择版本，扩大问题范围。

**离线安装（offline install）**解决另一个问题：所需包内容是否已经存在于本地可用来源。锁文件记录版本和完整性，不携带所有包字节；外部依赖没进入缓存时，冻结且离线的安装应该失败。可用一次联网获取准备缓存，再验证离线重建，但这证明的是该缓存条件下可重建。

平台、Node 版本、包管理器版本、注册表配置、安装脚本与可选依赖仍会影响结果。完整性校验能发现拿到的归档不符合记录，不能保证脚本执行结果在不同系统上完全相同。对照环境时把这些输入一起记录，而不只贴一张 lockfile 截图。

### 安装位置不同为什么可能改变运行结果

**幽灵依赖（phantom dependency）**是代码使用了包，却没有在负责使用它的包清单中声明，只因某种提升布局碰巧能找到。例如阅读器直接 import 一个仅由统计包间接依赖的库，在某台机器上成功，换一种安装布局后就失败。

包管理器展示的依赖图是逻辑关系；`node_modules` 中的链接、提升和隔离是实现解析的物理布局。pnpm 通常通过内容存储与链接减少复制并强化声明边界，但不能据此认为所有配置、根依赖和工具别名都不可能泄漏未声明访问。应在真正使用依赖的包中声明它，并检查独立运行或消费结果。

还要区分“版本一样”与“运行实例一样”。如果同一个库被解析成两个独立模块入口，它们各自创建的对象就不是同一个对象：

```js example=eng03-instance-identity
function loadIndependentCopy() {
  return { currentUser: null, token: {} };
}
const copyA = loadIndependentCopy();
const copyB = loadIndependentCopy();
copyA.currentUser = '小林';
console.log(copyB.currentUser);
// => null
console.log(copyA.token === copyB.token);
// => false
```

这个小例子模拟两份模块各自初始化的结果，并没有真的安装两个框架。真实项目中，重复 React、注入容器或全局注册表可能造成更难解释的错误。用 `pnpm why <包名>` 找来源，再核对导入者的实际入口；需要单例的依赖应在宿主、peer 声明与打包外置配置之间保持一致。

`exports` 还可以按 import/require、node 等条件选择不同入口；浏览器工具可能采用额外条件。条件名由解析器支持，不是写上一个字段就会对所有工具生效。TypeScript 的路径别名也不会自动改写所有运行时导入字符串，类型检查成功不能替代 Node 或打包器的解析验证。

### peer 描述组件库与宿主如何配合

假设应用使用 React，而资料卡片库也需要调用 React。我们通常希望卡片库使用宿主提供的兼容 React，不希望库把另一份私有 React 打进自身产物。

下面是另一个组件库的清单片段，仅解释字段，不加入前面的纯 JavaScript workspace：

```json example=eng03-peer-contract runtime=project
{
  "peerDependencies": { "react": "^19.0.0" },
  "devDependencies": { "react": "19.2.8" }
}
```

peer 范围告诉消费者支持哪一组宿主版本；devDependency 为库自己的开发和检查提供一个具体组合。`19.2.8` 只是这里的一个开发基线，不代表已经验证了范围内所有版本，也不是让业务应用无条件升级的建议。

peer 解析或自动安装策略因包管理器版本和配置而异。不要把 peer 简化为“永远不会被安装”。它表达的核心是宿主兼容关系；把警告全关掉，只是停止报告冲突，并没有让不兼容 API 变得兼容。

库构建还需要按目标外置 React 等宿主依赖：peer 字段与 bundler 的 external 配置承担不同工作。标了 peer 却仍把框架打包进去，问题仍会发生。发布前从消费者侧检查入口、体积和实际框架实例；具体产物判断可接 [ENG-01](../chinese-guides/eng-01-module-graph-build-output-source-maps.md#资源多环境和库产物各有自己的合同)。

若 peer 是可选插件，除了在元数据中声明可选，还要保证没有它时基础功能真的能启动。代码顶层无条件导入一个可能不存在的包，再期待运行时回退，是相互矛盾的设计。

### 把包交给独立消费者再检查公开边界

仓库内的链接可能让文件始终存在，而发布包漏掉文件时消费者才会发现。现在真正打包统计库：进入 `dependency-lab/packages/summary`，执行 `pnpm pack --pack-destination ../../artifacts`。该命令只生成本地归档，不向注册表发布。

检查输出的文件列表，应包含 `package.json`、`index.js` 和 `internal.js`。默认文件名为 `atlas-summary-1.0.0.tgz`。再在 `dependency-lab` 的同级目录新建 `consumer`，保存下面两个文件。这里用 npm 安装本地 tarball，避免消费者继续依靠 workspace 链接。

```json example=eng03-consumer-package runtime=project file=consumer/package.json
{
  "name": "summary-consumer",
  "private": true,
  "type": "module",
  "dependencies": {
    "@atlas/summary": "file:../dependency-lab/artifacts/atlas-summary-1.0.0.tgz"
  }
}
```

```js example=eng03-consumer runtime=project file=consumer/index.js
import { summarize } from '@atlas/summary';
console.log(summarize([{ minutes: 12 }, { minutes: 18 }]));
try {
  await import('@atlas/summary/internal.js');
} catch (error) {
  console.log(error.code);
}
```

在 `consumer` 中执行 `npm install --offline --ignore-scripts`，再执行 `node index.js`，应看到相同统计结果，以及 `ERR_PACKAGE_PATH_NOT_EXPORTED`。内部文件虽然随归档存在，包名的深层导入仍受到 exports 限制。exports 是公共 API 边界，不是把文件加密或阻止持有文件的人直接读取它。

还可以在阅读器包目录执行 `pnpm pack --pack-destination ../../artifacts`，检查归档中的清单：`workspace:*` 应被改写为统计包的具体版本 `1.0.0`。源清单保持 workspace 关系，交付清单则面向普通消费者。若需要保持范围含义，可按 `workspace:^` 等协议选择对应转换方式。

真正发布 TypeScript 库时，进一步检查声明文件、exports 的类型入口、CSS 和其他资源，以及承诺支持的 ESM/CJS 入口。不要让仓库内直接 import 源码的测试替代这一步。版本发布、弃用期和迁移说明也要与消费者能够接受的变化相配。

### 多包任务和临时修复要沿依赖图传播

如果统计包需要先生成 `dist`，阅读器的检查就不能抢在生成之前读取它。无依赖任务可以并行，有生成关系的任务需要按图排序；循环依赖可能让排序失去意义。除了文件，端口、缓存目录和数据库也属于并行运行时需要隔离的资源。

改变统计包的公开返回值，影响范围会传播到阅读器；只检查被编辑的统计文件不足以证明消费者没坏。反过来，改一篇无关说明通常不值得触发所有浏览器矩阵。增量检查的选择依据应是实际关系，根配置、锁文件或共享工具变化通常需要扩大范围，见 [ENG-05](../chinese-guides/eng-05-quality-gates-lint-types-tests-ci.md#加速检查前先确认哪些输入会使结果失效)。

**版本覆盖（override）**可以临时约束某条传递依赖，但不证明被替换版本与上游兼容。先用 why 找到来源，再限定覆盖范围、记录修复理由、消费者验证和移除条件。不要一次强制所有包使用同一主版本，然后把安装成功当成完成。

补丁则适合保存一个可审查的局部修改；应把补丁文件、适用版本和上游问题关联起来，升级后检查是否仍需要。集中 catalog 可以减少重复维护版本范围，但每个包仍须声明它实际使用的依赖；它不把根目录变成所有包的隐式依赖清单。

### 依赖变更要解释来源和实际执行内容

安装阶段可能执行 lifecycle scripts，下载二进制或生成文件。`--ignore-scripts` 可以帮助隔离这类动作，却也可能让确实依赖生成步骤的工具无法运行。对真实项目应按当前包管理器版本审查并批准必要脚本，再验证产物；本讲的两个本地包没有脚本，因此不受这个差异影响。

完整性哈希说明归档与记录匹配，不说明包作者可信或代码没有恶意行为。依赖审查还应考虑来源、安装行为、许可证、维护状态与实际使用位置；私有 scope 的注册表映射需要明确，凭据不要出现在仓库或安装日志中。

依赖清单或 SBOM 是追踪组件的材料，还要关联实际交付的产物。开发工具、可选平台包和打进浏览器的代码，其执行位置与风险不同。删除直接依赖后，它也可能仍沿另一条传递路径存在，应重新看图和构建文件，而不只是看清单变短。

面对“本地能装，CI 不能装”，先保留首个错误，再比较工具版本、清单与锁文件、可用包内容、平台、脚本策略和来源。一个好的依赖变更说明应该能回答：为什么改变、影响哪些消费者、如何复现安装和使用结果、失败后怎样恢复。它与 [B09 的原子提交和协作](../chinese-guides/git-03-commits-remotes-pr-worktrees-collaboration.md#git-03) 是同一条交付链。

### 参考与延伸阅读

核对日期：2026-09-10。连续练习使用 pnpm 11.19.0；线上主版本文档用于解释协议，默认设置变化以对应版本说明为准。

- [pnpm：Workspace 协议与打包转换](https://pnpm.io/workspaces)：对应本地包选择与发布清单转换。
- [pnpm：安装命令](https://pnpm.io/cli/install)：对应冻结安装、离线内容与安装参数。
- [pnpm：package.json](https://pnpm.io/package_json)：对应包声明、peer 与包管理器版本记录。
- [pnpm：pack](https://pnpm.io/cli/pack)：对应本地归档及内容观察。
- [语义化版本规范](https://semver.org/lang/zh-CN/) 与 [npm semver 的范围规则](https://github.com/npm/node-semver#caret-ranges-123-025-004)：对应兼容承诺与范围计算的区别。
- [Node.js：包入口与 exports](https://nodejs.org/api/packages.html#package-entry-points)：对应公共入口、条件与深层路径。
