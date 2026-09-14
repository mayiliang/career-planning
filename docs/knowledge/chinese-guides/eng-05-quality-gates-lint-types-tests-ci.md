# 工程化知识点讲义

## ENG-05 格式、Lint、类型、测试与 CI 质量门禁

“检查全部通过”听起来很安心，但要继续问：到底检查了什么？统计分钟数少算了一个条目，类型检查可能完全满意；把返回类型写错，构建工具又可能照常生成 JavaScript。绿色结果只有对应到具体问题，才有判断价值。

这篇用一个很小的资料统计包，把格式、静态规则、类型、行为和构建分开运行。每次只故意改坏一处，观察哪一层发现问题，再把这些检查连接成一个会正确报告失败的统一入口。

### 学习前先确认

- 直接前置：[ENG-03 依赖解析、Lockfile、Workspace 与 Peer Dependency](../chinese-guides/eng-03-dependencies-lockfile-workspaces-peer.md#eng-03)。需要理解工具版本、清单与锁文件共同决定检查环境。

另建独立目录 `gate-lab`。本例使用 Node.js 22.23.0、Vite 6.4.3、TypeScript 5.7.2、ESLint 9.39.5、Prettier 3.6.2，这是为了固定观察条件，不是建议把业务仓库升级或降级到这一组版本。故障修改只在这个练习目录进行。

### 先把风险与能提供的证据对应起来

**质量门禁（quality gate）**是发布或合入之前必须满足的条件。它的价值在于稳定发现某类问题，并给出可以采取行动的失败信息，不在于命令数量多。

| 检查 | 本讲让它负责什么 | 它通过后仍未证明什么 |
| --- | --- | --- |
| format | 文件符合统一排版 | 算法和业务规则正确 |
| lint | 没有违反已开启的静态规则 | 未配置的风险也被检查过 |
| typecheck | 声明与使用符合静态类型约束 | 外部数据真实有效、行为符合需求 |
| test | 给定输入产生预期的可观察结果 | 所有输入和部署条件都正确 |
| build | 源码、入口和资源能够生成制品 | 制品已经正确部署并被用户成功使用 |

例如“空资料列表应显示 0 分钟”是一个清楚的业务规则，可以用一个直接的行为断言保护；“变量声明以后没有使用”适合交给静态规则。让测试只重复源码里的加法步骤，很难发现需求理解偏差；让一套庞大浏览器测试承担所有排版规则，又会拖慢反馈。

选择检查时先问损坏会产生什么影响，再找最小而可信的观察方式。涉及资源路径和旧版本加载的风险，应该接着 [ENG-02](../chinese-guides/eng-02-dev-production-environments-assets-cache.md#发布新版本时旧页面仍可能需要旧文件) 观察实际请求，不能仅靠纯函数测试代替。

### 建一个可以逐项运行的小型检查项目

先保存 `package.json`。所有脚本都明确命名，方便在失败时单独重现；首次执行 `npm install` 后保留生成的 `package-lock.json`，后续干净安装使用 `npm ci`。

```json example=eng05-package runtime=project file=package.json
{
  "name": "gate-lab",
  "private": true,
  "type": "module",
  "scripts": {
    "format:check": "prettier src test --check",
    "format:write": "prettier src test --write",
    "lint": "eslint src --max-warnings 0",
    "typecheck": "tsc --noEmit",
    "test": "node --test test/total.test.js",
    "build": "vite build",
    "check": "node run-gates.mjs"
  },
  "devDependencies": {
    "eslint": "9.39.5",
    "prettier": "3.6.2",
    "typescript": "5.7.2",
    "vite": "6.4.3"
  }
}
```

创建 `src/total.js`。它是普通 JavaScript，JSDoc 为参数与返回值补充类型合同，后面的 TypeScript 配置会实际检查这些合同。

```js example=eng05-total runtime=project file=src/total.js
/**
 * @param {ReadonlyArray<{ minutes: number }>} lessons
 * @returns {number}
 */
export function totalMinutes(lessons) {
  return lessons.reduce((sum, lesson) => sum + lesson.minutes, 0);
}
```

创建 `test/total.test.js`。两个用例分别保护正常累加与空列表，不引入网络、真实时钟或额外测试框架。

```js example=eng05-tests runtime=project file=test/total.test.js
import assert from 'node:assert/strict';
import test from 'node:test';
import { totalMinutes } from '../src/total.js';

test('累计资料分钟数', () => {
  assert.equal(totalMinutes([{ minutes: 12 }, { minutes: 18 }]), 30);
});

test('没有资料时为零分钟', () => {
  assert.equal(totalMinutes([]), 0);
});
```

最后添加三份检查配置和一份构建配置：

```js example=eng05-prettier runtime=project file=prettier.config.js
export default { singleQuote: true, endOfLine: 'lf' };
```

```js example=eng05-eslint runtime=project file=eslint.config.js
export default [
  {
    files: ['src/**/*.js'],
    rules: {
      'no-unused-vars': 'error',
      'no-undef': 'error',
      eqeqeq: 'error',
    },
  },
];
```

```json example=eng05-tsconfig runtime=project file=tsconfig.json
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "strict": true,
    "noEmit": true,
    "target": "ES2022",
    "module": "NodeNext",
    "types": []
  },
  "include": ["src/**/*.js"]
}
```

```js example=eng05-vite runtime=project file=vite.config.js
export default {
  build: {
    lib: { entry: 'src/total.js', formats: ['es'], fileName: 'total' },
    sourcemap: true,
  },
};
```

依次运行 `npm run format:check`、`npm run lint`、`npm run typecheck`、`npm test`、`npm run build`。按原样保存并采用 LF 换行时应全部成功，测试明确运行 2 项，构建目录包含 `dist/total.js` 与对应 Source Map。若编辑器保存成 CRLF，先在练习目录运行 `npm run format:write`，检查差异后重新核对。

本例刻意限定 format 为 `src` 与 `test`，lint 与类型检查为 `src`，避免配置文件的额外环境规则掩盖教学问题。正式仓库要把脚本、配置和测试文件也按各自环境纳入适当检查；这里不把未纳入的文件宣称为已检查。

### 格式和 lint 分别观察文本与代码结构

**格式化（formatting）**统一可机械决定的排版。把 `src/total.js` 的 return 那一行改成 `return lessons.reduce((sum,lesson)=>sum+lesson.minutes,0);`，运行 `format:check` 应失败；功能并没有因此改变，行为测试仍会通过。运行 `format:write` 可以恢复规范排版，再查看改动内容。

CI 使用 check 模式，目的是发现提交进来的文件是否合规，而不是悄悄替开发者生成一份未提交修改。大面积格式规则更新适合单独提交，减少它与行为变化混在一起造成的评审噪音，见 [B09 的提交组织](../chinese-guides/git-03-commits-remotes-pr-worktrees-collaboration.md#git-03)。

**静态规则检查（lint）**关注已配置的代码模式。在函数前加入 `const unused = 1;`，运行 lint 应由 `no-unused-vars` 报错。删除这一行恢复。排版工具可以把它排得很好看，却没有理由据此删除一个声明。

本例只开了三条规则。Hook 调用约束、未处理 Promise、跨包越界等需要相应规则或插件，有些还需要类型信息。不能因为运行了 ESLint，就认为这些风险自动全部获得保护。

warning 是否阻断由策略决定。本例用 `--max-warnings 0` 明确要求零 warning；把规则改成 warning 也不会使它通过。现实项目接入新规则时，可以先建立旧问题基线，再禁止新增；需要例外时限定到具体规则与位置，写清原因、负责人和移除条件，避免整个项目永久关闭保护。

### 类型检查和转译回答不同问题

**类型检查（type checking）**判断声明和使用是否相容。**转译（transpilation）**把源码转换成另一种可执行形式，它可能不进行完整类型检查。许多快速构建流程把这两项工作拆开，因此需要独立的 typecheck。

在本例中，把 `@returns {number}` 改成 `@returns {string}`，函数实现保持不动。`npm run typecheck` 应报告 number 无法赋给 string；`npm test` 仍可能通过，因为真正返回的仍是 30 和 0；`npm run build` 也可以成功，因为 Vite 不会把这份 JSDoc 的类型矛盾当作完整类型检查来处理。观察后恢复 number。

如果想看 TypeScript 语法被移除时发生了什么，保存并运行 `node transpile-demo.mjs`：

```js example=eng05-transpile runtime=project file=transpile-demo.mjs
import ts from 'typescript';

const source = "const pageSize: number = '24'; console.log(typeof pageSize);";
const result = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
});
console.log(result.outputText.trim());
new Function(result.outputText)();
```

输出的 JavaScript 没有 `: number`，执行结果是 `string`。例子有意给出了不满足 number 声明的值：`transpileModule` 处理了语法转换，并未替你建立完整的类型正确性证明。这段动态执行只针对代码里固定的教学字符串，不用于执行用户输入。

`as` 断言同样不会在运行时转换或校验数据。接口响应、环境变量、缓存和用户输入需要在边界做实际解析。即便某段代码通过 strict 检查，也可能收到缺字段、字符串冒充数字或超出业务范围的数值；这与 [TS-01](../chinese-guides/ts-01-type-system-structural-strict-mode.md#ts-01) 讲的类型系统边界一致。

真实多包项目还要说明类型声明是源码输入还是生成输出。若某包需要先构建声明，消费者的 typecheck 就要等待对应产物；旧的声明缓存存在时通过，不代表干净环境也能通过。

### 行为检查要能抓住一个真实规则的破坏

恢复所有原始内容后，把 reduce 的初始值从 `0` 改为 `1`。这是一个语法正确、类型正确、没有违反当前 lint 规则的实现。格式、lint、typecheck 仍可成功，但两项行为检查应报告实际值 31 和 1，而预期值分别是 30 和 0。

这个对照很关键：测试的预期来自“累计资料时长”和“空列表为零”的需求，不是从当前实现算出一个答案再自己比较。如果测试也把错误初始值抄过去，双方会一起通过，却没有保护需求。

运行结束要查看实际测试数量。筛选表达式没有匹配任何用例，不等于行为已验证；有些工具允许零测试成功，团队需要在必需路径上明确禁止这种伪通过。本例直接指定文件，文件缺失会失败，并要求输出确实包含 2 项。

对于请求竞态，可以像 [DEBUG-01](../chinese-guides/debug-01-systematic-debugging-evidence-causality.md#debug-01) 一样控制完成顺序；对于时区和时间，固定输入或注入时钟。尽量让失败由可控条件触发。偶发失败重跑后变绿，只说明这一次没复现，应保存首次失败并处理不稳定原因。

覆盖率可以帮助发现没走到的区域，但行被执行不代表判断有力。围绕已经发生过的事故和重要边界补充少量有效断言，通常比为了数字不断增加重复用例更有价值。完成观察后把初始值恢复为 0。

### 构建检查要落到可以交付的文件

本例的构建会输出 ESM 库文件。先确认 `dist/total.js` 存在，再从 Node 导入它，核对它仍导出 `totalMinutes`。保存下面的观察脚本，构建后执行 `node inspect-output.mjs`：

```js example=eng05-output runtime=project file=inspect-output.mjs
import assert from 'node:assert/strict';
import { stat } from 'node:fs/promises';
import { totalMinutes } from './dist/total.js';

assert.equal(totalMinutes([{ minutes: 12 }, { minutes: 18 }]), 30);
assert.equal(totalMinutes([]), 0);
console.log('可交付入口正确，字节数：', (await stat('dist/total.js')).size);
```

这一步补上了源码检查与生成文件之间的边界。故意把 `vite.config.js` 的入口改成不存在的 `src/missing.js`，构建应该失败；此时源码测试仍可以全部通过。恢复入口后重新构建，再检查产物。

对应用，需要继续看 HTML、CSS、异步 chunk 与资源 URL；对库，还需要检查打包清单和独立消费者。文件存在只回答了其中一部分问题。Source Map 的位置还原步骤见 [ENG-01](../chinese-guides/eng-01-module-graph-build-output-source-maps.md#source-map-把生成位置接回源码)，归档消费者见 [ENG-03](../chinese-guides/eng-03-dependencies-lockfile-workspaces-peer.md#把包交给独立消费者再检查公开边界)。

体积也应按入口、压缩方式和同一构建条件比较。给所有文件大小求和，不能直接推断用户首屏会下载多少；一次构建成功也不代表生产响应头、路由回退和发布顺序正确。

### 统一入口必须把子检查失败传出去

最后保存 `run-gates.mjs`。它顺序运行清单里已有的脚本，某一步失败就停止，并把非零退出状态返回给调用方。

```js example=eng05-runner runtime=project file=run-gates.mjs
import { spawnSync } from 'node:child_process';

const npmCli = process.env.npm_execpath;
if (!npmCli) {
  console.error('请通过 npm run check 启动，以使用同一个 npm。');
  process.exit(1);
}
const steps = ['format:check', 'lint', 'typecheck', 'test', 'build'];
for (const step of steps) {
  console.log(`\n开始检查：${step}`);
  const child = spawnSync(process.execPath, [npmCli, 'run', step], {
    stdio: 'inherit',
    env: process.env,
  });
  if (child.error || child.signal || child.status !== 0) {
    console.error(`检查失败：${step}`);
    if (child.error) console.error(child.error.message);
    process.exit(child.status && child.status > 0 ? child.status : 1);
  }
}
console.log('\n5 项检查全部完成。');
```

先运行 `npm run check`，预期完整经过五项。再把初始值改为 1，重复运行：应停在 test，不出现“5 项检查全部完成”，也不继续构建。PowerShell 中可紧接着查看 `$LASTEXITCODE`，应为非零；恢复原值后重新运行应归零。

这里直接用同一 Node 执行 npm 的脚本入口，避免 Windows `.cmd` 与不同 shell 对串接命令的处理差异。脚本处理了子进程启动失败、信号终止和普通失败，不能只看有没有抛出 JavaScript 异常。

容易出现的错误是捕获子检查失败后只打印日志，最后主脚本仍返回 0。平台会忠实地把它显示成绿色。所以检查脚本本身也要用一次故意失败验证，不需要为每一行包装逻辑写重复测试，但必须确认关键失败能够到达最终结果。

### 从本地反馈接到共同的 CI 判定

**持续集成（CI）**在共享环境中对明确提交运行统一检查。它接到的应是一份可还原的源代码、锁文件和配置，而不是某位开发者机器上碰巧存在的生成文件。

编辑器诊断、保存格式化和 Git hooks 可以提供更早反馈，但 hooks 可能未安装、被跳过，网页编辑也不会经过它们。需要共同遵守的合入条件，应由 CI 与仓库保护规则落实，不能把本地钩子当成不可绕过的边界。

一个针对本例的流水线过程可以写成：检出要检查的提交 → 准备明确版本的 Node/npm → `npm ci` → `npm run check` → `node inspect-output.mjs` → 保存对应提交的构建文件与日志。这里描述执行关系，不提供未经账号和仓库设置核对的即用工作流，也不表示已经在远端 CI 上运行。

真正落到平台配置时，明确触发事件、工作目录、权限、必需检查名称和产物保留规则。第三方 action 或共享工作流按项目策略固定可信版本或提交；来自外部贡献的不可信代码先在无秘密环境检查，有发布权限的阶段只接受经过核对的提交和产物。不要让“跑测试”顺便获得不需要的部署权限。

### 加速检查前先确认哪些输入会使结果失效

格式和 lint 往往反馈较快，适合先运行；没有前后依赖的检查可以并行。有些构建需要先生成类型或资源，就必须保留顺序。并行还要隔离输出目录、端口和可写缓存，否则检查本身可能互相干扰。

**受影响范围（affected scope）**不能只等于修改的文件名。统计包改变返回合同，阅读器也受影响；根类型配置或锁文件改变，许多未编辑文件的结论可能失效。按依赖图传播范围，比“只跑最近改的文件”更接近真实风险。

缓存保存的是“在某组输入下得到的结果”。输入通常包括源码、配置、工具版本、锁文件及会影响行为的环境值。漏掉其中一项，就可能复用旧成功。例如把 `strict` 由 false 改为 true，却沿用只按源码 hash 命中的旧 typecheck 结果，新的类型规则实际上没有被执行。

加速策略需要有失效证据：改动相关输入时重新运行，不相关变化才复用；偶尔与无缓存执行对照，检查范围与结果是否一致。日常检查可以快速失败，升级调查则可能需要收集所有失败，两者是不同的反馈目标。不要为了一次性收集更多日志而让普通小改动长期等待所有重型场景。

### 绿色结果要对应真正被合入的提交

一个 PR 在提交 A 上全绿，随后作者又推送了提交 B，A 的结果不能证明 B。目标分支发生变化时，两个各自通过的分支也可能在组合后失败。采用最新基线要求或合并队列时，要确认检查对应的是平台实际准备合入的对象。

这一点与 [B09 的分支整合](../chinese-guides/git-02-branches-merge-rebase-conflicts.md#git-02) 相连：检查结果也有明确的历史位置。记录提交 ID、环境、实际执行脚本、测试数量和产物版本，才能让绿色结果有可追溯的含义。

必需检查的名称、矩阵拆分或条件执行一旦改变，需要同步核对仓库保护。某个 job 被跳过，不自动等于这项风险不需要检查；汇总步骤要明确处理失败、取消、跳过与成功，不能用一个成功分片代表整个矩阵。文档变更可以有合理的跳过路径，但共享配置和锁文件变化通常不能套用同一规则。

线上事故需要紧急通道时，提前定义谁批准、哪些检查保留、怎样记录和补跑、何时恢复保护。一次例外不应变成永久关闭的检查；最终仍要在实际主线和交付文件上确认行为。

### 失败信息应该帮助人采取下一步

“lint failed”只能告诉人出了事；“`src/total.js` 的 `no-unused-vars` 发现 unused 未使用，执行 `npm run lint` 可复现”才足够开始处理。测试失败给出输入、预期与实际，构建失败保留首个解析错误，避免大量后续错误掩盖起点。

本地成功、CI 失败时，先比较提交、未跟踪生成物、Node/npm 版本、冻结安装、文件名大小写、环境变量、时区和缓存。Windows 上被容忍的大小写路径，可能在 Linux 立即失败。反复 rerun 只能提供发生频率，不能解释根因。

AI 生成的变更也使用同一套事实标准：检查实际差异和需求，运行与风险相称的检查，报告确实执行过的结果。代码由谁生成不会改变类型、行为和发布边界，生成的一句“测试通过”也不等于存在运行证据。

观察门禁效果时看真实缺陷拦截、误报、反馈耗时和主线事故。规则增强后失败变多，可能是过去看不见的问题终于被发现；长期全绿，也可能是重要风险没有进入检查范围。将真实事故映射回缺失的一层，比追求最好看的绿色比例更有用。

### 用一张故障对照表完成自查

每次只做一行对应的修改，观察后恢复，再进入下一行。不要累积故障，否则最前面的失败会挡住后续现象。

| 故意修改 | 应重点观察的失败 | 哪些结果可能仍为成功 |
| --- | --- | --- |
| 压紧 return 行的空格与箭头 | format:check | 类型、行为、构建 |
| 新增未使用的 unused 变量 | lint | 行为、构建 |
| JSDoc 返回类型改为 string | typecheck | 行为、构建 |
| 累加初始值改为 1 | test，实际 31 和 1 | lint、类型、构建 |
| 构建入口改成 missing.js | build | 源码类型与行为 |
| 保留行为故障运行统一入口 | check 非零且停止于 test | 前三项可以通过，但不能宣布整体成功 |

完成后，你应该能解释“为什么需要这项检查、它成功证明了什么、失败怎样传到最终结论”。这比记住一串工具名字更接近真正可维护的质量体系。

### 参考与延伸阅读

核对日期：2026-09-10。代码使用文首固定版本；检查范围和故障预期均在正文明确列出。

- [ESLint：命令行参数](https://eslint.org/docs/latest/use/command-line-interface)：对应检查范围、warning 阈值和退出状态。
- [Prettier：CLI](https://prettier.io/docs/cli)：对应 check 与 write 的用途。
- [TypeScript：checkJs](https://www.typescriptlang.org/tsconfig/checkJs.html) 与 [noEmit](https://www.typescriptlang.org/tsconfig/noEmit.html)：对应 JavaScript 类型检查及独立类型命令。
- [Vite：TypeScript 转换边界](https://vite.dev/guide/features#typescript)：对应转译与完整类型检查的分工。
- [Node.js：测试运行器](https://nodejs.org/api/test.html)：对应实际执行的行为用例与结果。
- [GitHub Actions：工作流语法](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)：对应事件、依赖、条件与权限；平台配置需要结合实际仓库核对。
