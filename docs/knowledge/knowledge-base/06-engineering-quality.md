# 06 Git、工程化、测试、CI/CD 与发布质量

所有“通过”均需满足[统一考核规则](00-assessment-rules.md)。考核必须通过真实命令和产物验证，不能只画概念图。

### 版本控制与协作

## GIT-01 Git 对象模型、暂存区与安全恢复

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#git-01)、[中文｜Pro Git 记录每次更新](https://git-scm.com/book/zh/v2/Git-基础-记录每次更新到仓库)、[中文｜Pro Git Git 对象](https://git-scm.com/book/zh/v2/Git-内部原理-Git-对象)、[中文｜Pro Git 重置揭密](https://git-scm.com/book/zh/v2/Git-工具-重置揭密)。覆盖范围：工作区、暂存区与仓库；blob/tree/commit/tag 对象；引用、`HEAD`、提交可达性；`add`/`commit`/`restore`/`reset`/`revert` 的状态变化；`reflog`、丢失提交恢复和敏感信息清理边界；全部必读资料均为中文。
- 严格考核：挑战类型：TOOL_OPERATION；首考题 1（资料定位）：只允许使用《中文核心讲义》《中文｜Pro Git 记录每次更新》《中文｜Pro Git Git 对象》《中文｜Pro Git 重置揭密》，分别摘出能支撑「Git 对象模型、暂存区与安全恢复」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：在固定提交图 `main:A-B-C(HEAD=C)` 中，说明 `git add` 为什么只改索引而不新建提交、`restore --staged` 为什么令索引回到 HEAD、`revert B` 为什么保留可达历史；用 `git cat-file -p` 写出 C 的 tree 与 parent 关系，并以“已推送的 C 不可用 reset 改写”为反例，逐项回指对象和重置资料；首考题 3（最小产出）：固定 fixture：克隆 `fixtures/git-recovery` 的 `exercise/g1` 分支；其中 `notes.txt` 在 C 中为 `release=3`。依次暂存 `draft=4`、撤销暂存、提交 C 后执行 `git reset --hard HEAD~2`。交付 `commands.txt`、A/B/C 与 dangling C 的对象 ID、`git fsck --no-reflogs` 和 `git reflog --date=iso` 输出、恢复 C 后的提交图及 `git diff C -- notes.txt`。用 `git show` 核对 C 的 tree，并验证 `notes.txt` 恢复为 `release=3`、索引为空且 `main` 可达 C；首考题 4（受限排错）：固定失败日志为 `HEAD is now at <A>`、`git log --oneline` 只见 A，且工作区干净。只能在“reflog 仍含 C”“C 已成 dangling object”“C 从未提交”三项中排查；分别用 `git reflog show main`、`git fsck --no-reflogs`、`git status --porcelain` 证伪，选择最小的 `git branch rescue <C>` 或明确不可恢复结论，并在同一 fixture 重跑 `git show rescue:notes.txt` 回归；首考题 5（学习复述）：说明对象可达性、索引状态和已发布历史三者如何决定恢复命令，并给出敏感信息误提交时“恢复文件”与“清理历史”不能混为一谈的反例；复测变式：仅把 `release=3` 的带注释 tag `v3` 删除后恢复为同一对象；不变量是 A-B-C 内容与 parent 不变，预期变化是 tag 引用重新指向 C，提交新旧 tag 的 `show-ref --tags -d`、对象 ID 和 `git fsck` 输出作为新证据。命题边界：参考答案必须逐题回指学习资料、题目依据或通过标准；不得使用未列资料或题目未点名的托管平台行为作为主要依据。
- 通过标准：验证证据：提交题 3 的命令记录、对象 ID、reflog/fsck 输出、恢复后提交图和题 4 的证伪—修复—回归链；对象、文件与索引状态须彼此一致。否决项：用 `reset` 改写已发布历史、无法说明 C 的可达性、伪造对象 ID，或以工作区文件代替可复核恢复记录，均不通过。评估边界：不得用未列资料或题目未点名的托管平台行为作为主要评分依据。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## GIT-02 分支、合并、变基与冲突处理

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#git-02)、[中文｜Pro Git 分支简介](https://git-scm.com/book/zh/v2/Git-分支-分支简介)、[中文｜Pro Git 分支的新建与合并](https://git-scm.com/book/zh/v2/Git-分支-分支的新建与合并)、[中文｜Pro Git 变基](https://git-scm.com/book/zh/v2/Git-分支-变基)。覆盖范围：分支引用与共同祖先、fast-forward 和三方合并、rebase 的提交重放、cherry-pick、冲突标记与三阶段索引、`merge-base`、`rerere`、已发布历史边界以及 merge/rebase 策略选择；全部必读资料均为中文。
- 严格考核：挑战类型：TOOL_OPERATION；首考题 1（资料定位）：只允许使用《中文核心讲义》《中文｜Pro Git 分支简介》《中文｜Pro Git 分支的新建与合并》《中文｜Pro Git 变基》，分别摘出能支撑「分支、合并、变基与冲突处理」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：对 `main:A-B-C`、`feature:B-D` 的提交图，分别推导三方 merge、把 D rebase 到 C、cherry-pick D 的 parent 与 patch 变化；解释共同祖先 B 为何决定三方合并基线，说明冲突标记删除不等于默认超时语义正确，并以“共享分支不可随意 rebase 后 force-push”为协作边界，回指分支/合并/变基资料；首考题 3（最小产出）：固定 fixture：在 `fixtures/git-conflict` 的 `exercise/g2` 分支创建图 `A-B-C` 与 `feature:B-D`；`src/retry.ts` 的 C 将 `timeoutMs` 改为 800，D 将其改为 2000。分别完成 `--no-ff` merge、rebase、cherry-pick 三个临时分支。交付三张 `git log --graph --all`、每个分支 `git diff B..HEAD -- src/retry.ts`、冲突解决说明及 `pnpm test retry` 输出；验证三个分支均只调用一次 retry，且 `timeoutMs` 分别符合对应策略；首考题 4（受限排错）：固定失败证据为 rebase 后 `retry` 被调用两次、`git merge-base main feature` 为 B、测试输出 `expected 1 call, received 2`。仅在“重复 cherry-pick”“选择了两段冲突实现”“rebase 基点错误”三项中取证；用 `git log --cherry main...HEAD`、冲突前后 diff 与 `merge-base --is-ancestor C HEAD` 逐项证伪，执行最小的 drop/checkout 修复，并在同一 `retry` 测试和提交图上回归；首考题 5（学习复述）：解释提交图、共同祖先与三阶段冲突内容如何共同决定合并策略，且说明 `--force-with-lease` 的保护范围为何仍不能替代协调；复测变式：只将 C 的 `timeoutMs` 从 800 改为 1200；不变量是 D 的业务分支与共同祖先 B 不变，预期变化是冲突块中的基线数字和测试期望，提交新 `git diff`、冲突文件和测试输出作为证据。命题边界：参考答案必须逐题回指学习资料、题目依据或通过标准；不得把某个团队的分支命名习惯当成 Git 机制。
- 通过标准：验证证据：三种历史的提交图、冲突前后 diff、语义测试和受限排错回归必须齐全；每个策略须能从 parent 与共同祖先解释。否决项：仅删除冲突标记、对共享分支无协调强推、未验证 timeout 语义，或以同一张截图替代三个策略的产物，均不通过。评估边界：不得把某个团队的分支命名习惯当成 Git 机制。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## GIT-03 协作工作流、提交治理与 AI Agent 隔离

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#git-03)、[中文｜Pro Git 向项目贡献](https://git-scm.com/book/zh/v2/分布式-Git-向一个项目贡献)、[中文｜GitHub 关于拉取请求](https://docs.github.com/zh/pull-requests/reference/pull-requests)、[中文｜GitHub 审查建议更改](https://docs.github.com/zh/pull-requests/how-tos/review-pull-requests/reviewing-proposed-changes-in-a-pull-request?tool=webui)。覆盖范围：原子提交、提交消息与可审查差异；远端和跟踪分支；fetch/pull/push；PR 生命周期、逐文件评审、评论/批准/请求更改与保护规则；worktree 的共享对象库和独立工作区；多 Agent 的任务边界、独立 worktree/分支、提交归属、依赖与集成顺序、越界检测、冲突处理、钩子和 CI 证据；全部必读资料均为中文。
- 严格考核：挑战类型：TOOL_OPERATION；首考题 1（资料定位）：只允许使用《中文核心讲义》《中文｜Pro Git 向项目贡献》《中文｜GitHub 关于拉取请求》《中文｜GitHub 审查建议更改》，分别摘出能支撑「协作工作流、提交治理与 AI Agent 隔离」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：给定 `origin/main` 和两个 worktree，说明工作树隔离为何不隔离对象库、原子提交怎样让 fix/test/docs 可独立评审与回滚、PR 检查如何在合入前建立证据；以“两个 Agent 共用一个脏工作区”导致覆盖用户改动为反例，并回指贡献与 PR 资料；首考题 3（最小产出）：固定 fixture：从 `fixtures/collaboration-demo` 建立 `../agent-a` 的 `agent/a-fix` 与 `../agent-b` 的 `agent/b-docs` worktree；给定 `src/auth.ts` 的 null-guard 修复、`src/auth.test.ts` 断言和 `docs/auth.md` 文档混合 diff。交付 `git worktree list --porcelain`、三份单目的提交、PR 描述中的需求—提交—检查映射、`pnpm test auth` 与只合入 A 后再合入 B 的日志；首考题 4（受限排错）：固定失败证据为 B 的 `git status --porcelain` 显示修改 `src/auth.ts`，A 工作区未提交，且 B 的 `origin/main` 落后两个提交。仅在“B 越权编辑”“A 的未提交改动被误用”“B 基线过期”三项中排查；用 `git diff --name-only`、`git diff -- ../agent-a/src/auth.ts` 和 `git rev-list --left-right --count origin/main...HEAD` 证伪，采用最小的 stash/还原越界文件/rebase 方案，并重跑 `pnpm test auth` 与 worktree 清洁检查；首考题 5（学习复述）：说明 Git worktree、提交原子性、PR 评审和保护分支如何分担协作责任，且解释 hooks、CI 不能阻止工作区越界的边界；复测变式：仅将 B 的文档提交回滚；不变量是 A 的 auth 修复、测试提交与 main 提交图不变，预期变化是 `docs/auth.md` 回到旧文案，提交 revert 的 diff、PR 检查和 A 测试输出作为新证据。命题边界：参考答案必须逐题回指学习资料、题目依据或通过标准；托管平台功能只能作为协作实现，不能替代 Git 提交图和引用机制。
- 通过标准：验证证据：交付两条独立 worktree 记录、三个单目的提交、PR 映射、检查输出及越界修复后的回归；每次合入顺序可由提交图复核。否决项：共享脏目录、将 fix/test/docs 混入不可回滚提交、覆盖 A 的未提交内容、仅贴 PR 链接而无 Git 证据，均不通过。评估边界：托管平台功能只能作为协作实现，不能替代 Git 提交图和引用机制。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

### 构建与依赖工程

## ENG-01 模块图、构建流程与产物分析

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文完整讲义](../chinese-guides/content-audit-04-06.md#eng-01)。移除 Vite 构建生产版本和 JavaScript Modules：两页分别只覆盖产物配置、原生模块基础，不能独立支撑模块图到运行时产物的完整机制；同时移除 webpack Concepts 与 Vite Guide 根目录。覆盖范围：入口、模块图、chunk、loader/plugin、tree-shaking、代码分割、source map 和产物分析；覆盖副作用、重复依赖和动态导入边界。
- 严格考核：挑战类型：DEBUGGING；首考题 1（资料定位）：只允许使用《中文完整讲义》，定位能支撑「模块图、构建流程与产物分析」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：根据入口 `src/main.ts→ui.ts→import('./chart.ts')` 与副作用模块 `legacy.ts`，解释动态 import 为什么形成按需 chunk、`sideEffects` 声明为何影响保留、source map 如何映射压缩位置；以“把 Chart 静态导入并误把 legacy 标成无副作用”作为两个反例，回指模块图与产物分析章节；首考题 3（最小产出）：固定 fixture：在 `fixtures/build-graph` 的 `main` 分支运行 `pnpm build && pnpm analyze`，其中 `src/chart.ts` 600 KiB、`src/legacy.ts` 写入 `window.legacyLoaded=true`。交付 `dist/manifest.json`、分析器 HTML、每个 chunk 的字节表、`dist/assets/*.map` 中 `chart.ts` 映射片段和 `reproduce.md`；访问 `/` 后再点击“图表”，用 network 日志和 `legacyLoaded` 断言验证加载顺序；首考题 4（受限排错）：固定失败日志为首页加载后 `TypeError: Chart is not a constructor`，分析报告仍有 `legacy` chunk。仅在“chart 导出名不匹配”“`sideEffects:false` 错删 legacy”“运行时 chunk 未部署”三项中排查；用产物导出 grep、`window.legacyLoaded` 与 Network 中 runtime 404 逐项证伪，修改一处 export/sideEffects/部署清单后在同一 fixture 重跑构建、点击流程和 source-map 定位；首考题 5（学习复述）：说明源码模块、转换、chunk、压缩和运行时加载的因果链，且说明体积下降不能证明副作用安全；复测变式：只把 `chart.ts` 的动态 import 改为静态 import；不变量是 `legacyLoaded` 与 Chart 行为正确，预期变化是首页主 chunk 增大且点击不再发 chart 请求，提交前后 manifest、网络 HAR 和字节表作为新证据。命题边界：只在「模块图、构建流程与产物分析」的完整讲义和覆盖范围内命题；资料外经验不能替代题目要求的机制与证据。
- 通过标准：验证证据：源码到 manifest、chunk、network、source map 的对应关系与受限排错的证伪记录完整；结论必须区分转译、打包、压缩、分包和运行时加载。否决项：只报总体体积、删掉 `legacy` 规避问题、没有点击后的网络证据，或以 source map 文件存在代替可定位映射，均不通过。评估边界：缺少与「模块图、构建流程与产物分析」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## ENG-02 构建工具的开发模型、生产模型与环境差异

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文完整讲义](../chinese-guides/content-audit-04-06.md#eng-02)。移除 Vite Build 与 Umi MFSU：前者只支撑生产构建，后者只支撑依赖预构建/开发缓存，二者均不能作为 dev/build 环境差异的完整学习资料。覆盖范围：Vite/Webpack/Umi 的开发服务器、HMR、插件、环境变量和生产优化差异；覆盖代理、路径、CSS/资源处理和只在开发环境成立的假象。
- 严格考核：挑战类型：DEBUGGING；首考题 1（资料定位）：只允许使用《中文完整讲义》，定位开发服务器、原生模块/HMR、预构建、插件管线与生产产物的职责边界；首考题 2（机制解释）：对于开发端代理 `/api`、生产 `base='/portal/'`、变量 `VITE_API_ORIGIN`，说明开发服务器为何可代理而 build 产物必须包含正确资源前缀、HMR 更新为何不等于生产缓存行为、`VITE_` 前缀为何决定暴露；以“dev 可用就复制 proxy 到生产”和“把运行时密钥放入 VITE”为边界反例，回指讲义；首考题 3（最小产出）：固定 fixture：在 `fixtures/env-boundary` 使用 `.env.development` 的 `VITE_API_ORIGIN=http://localhost:4000` 与 `.env.production` 的 `VITE_API_ORIGIN=https://api.example.test`，`vite.config.ts` 初始 `base:'/portal/'`。分别运行 `pnpm dev` 与 `pnpm build`，将 `dist` 挂到 `/portal/`。交付环境变量表、浏览器请求 HAR、`dist/index.html`/manifest 的资源 URL、开发代理日志和生产 `curl -I /portal/assets/app.js` 结果；验证开发代理返回 localhost API、生产页面从 `/portal/` 加载带 hash 的资源且请求 production API；首考题 4（受限排错）：固定失败为生产页面请求 `/assets/app-abc.js` 返回 404，控制台同时显示 `VITE_API_ORIGIN is undefined`。仅在“base 错误”“变量未使用 VITE 前缀”“静态站点挂载路径错误”三项中排查；用 build 后 HTML、`import.meta.env` 替换结果和服务器 access log 证伪，实施一个最小配置修复后重建并验证 `/portal/` 与 API 请求；首考题 5（学习复述）：解释开发代理、HMR、预构建、编译期变量和生产静态产物的职责差异，并说明清缓存不会修复错误 base；复测变式：仅令 CDN 继续缓存旧 `index.html` 一版；不变量是新产物仍从 `/portal/` 取得，预期变化是旧 HTML 的 hash 请求 404 或回退策略生效，提交两版 HTML、访问日志和缓存响应头作为新证据。命题边界：具体工具只作为机制载体，不把某一版本命令记忆当作能力。
- 通过标准：验证证据：开发与生产的变量表、资源 URL、代理/服务器日志和修复后 HAR 均可复核；归因必须区分开发服务、转换配置、生产构建和部署路径。否决项：只执行清缓存、只在 dev 验证、把非 `VITE_` 变量当作浏览器配置，或忽略旧 HTML 与 chunk 的兼容证据，均不通过。评估边界：只在一个工具中记住配置片段不能证明掌握构建模型。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## ENG-07 构建工具链演进、兼容迁移与回滚

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Vite Migration Guide](https://cn.vite.dev/guide/migration)、[中文完整讲义](../chinese-guides/content-audit-04-06.md#eng-07)。第二轮删除重复且过薄的《中文核心讲义》；继续移除 Vite 8 Announcement、Rolldown/Oxc 根文档。覆盖范围：构建工具、解析器、转换器和压缩器演进的迁移动机；运行时与插件兼容矩阵、解析/转换差异、基线测量、双轨验证、渐进切换、停止条件和回滚；Vite/Rolldown/Oxc 仅作为当前案例，版本变化不改变迁移方法。
- 严格考核：挑战类型：TOOL_OPERATION；首考题 1（资料定位）：只允许使用《Vite Migration Guide》《中文完整讲义》，分别定位当前破坏性变化/迁移入口，以及兼容矩阵、插件双轨、停止条件和回滚证据；首考题 2（机制解释）：在固定迁移矩阵中，旧链为 Vite 6 + `legacy-css` 插件，新链为 Vite 7 + 同插件；解释版本约束、插件钩子产物和 source map 为什么必须分别比对，而不能以冷启动变快替代兼容结论；以“删除插件使构建通过”和“只在开发服务器验证”为反例，回指迁移与双轨章节；首考题 3（最小产出）：固定 fixture：在 `fixtures/toolchain-migration` 的 `baseline` 分支，`src/theme.css` 通过 `legacy-css` 生成 `.brand{color:#246}`，`src/error.ts` 故意在第 12 行抛错。分别执行 `pnpm build:old && pnpm test:smoke:old` 与 `pnpm build:new && pnpm test:smoke:new`。交付 `migration-matrix.md`、两套 lockfile/插件版本、冷启与增量计时、两份 manifest、CSS grep 输出、浏览器错误堆栈及 source-map 映射、`rollback.sh --dry-run` 输出和 ADR；验证：运行上述两组 build、smoke、CSS grep 和 source-map 定位命令，并逐项核对 manifest、CSS 选择器与第 12 行映射；预期两链均有 `.brand`、错误映射到第 12 行且 smoke 通过；首考题 4（受限排错）：固定失败日志为 `new build 30% faster; .brand missing; Error: error.ts:1:392`。只能在“插件钩子 API 变化”“CSS 被错误标记为副作用”“新链未发布 map”三项中排查；分别用插件 debug 日志、产物 CSS/`sideEffects` diff、`curl -I dist/assets/*.map` 证伪，修改唯一命中的适配/配置项，并在同一 fixture 重跑两条 build、smoke、CSS grep 和映射验证；首考题 5（学习复述）：说明迁移决策须同时约束兼容矩阵、可观测产物、停止条件与回滚，解释性能收益为何不能抵消 CSS 或调试能力回退；复测变式：只把同一 fixture 的内存上限从 1024 MiB 调为 768 MiB；不变量是插件版本、CSS 语义和错误源行不变，预期新证据是两链内存峰值、停止条件判定与保留的 rollback dry-run 输出。命题边界：不得只考当前版本命令或营销性能数据。
- 通过标准：验证证据：迁移矩阵、双链命令与计时、manifest/CSS/source-map 对照、停止或放行决定、dry-run 回滚及同 fixture 修复回归齐全。否决项：删除插件、关闭 source map、仅报告单项性能收益、未验证发布 map 或绕过停止条件，均不通过。评估边界：只完成一次升级或只给出单项性能提升不能证明工具链迁移能力。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## ENG-03 包管理、lockfile 与 workspace

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文｜pnpm Workspaces（官方当前版）](https://pnpm.io/zh/workspaces)、[中文完整讲义](../chinese-guides/content-audit-04-06.md#eng-03)、[中文｜语义化版本 2.0.0](https://semver.org/lang/zh-CN/)（只用于核验公共 API 与 MAJOR/MINOR/PATCH 版本承诺，不要求记忆页面后半的 BNF 语法和正则）。覆盖范围：依赖解析、lockfile、workspace、peer dependency、override、发布协议和可重复安装；覆盖幽灵依赖、单仓多版本与缓存污染。
- 严格考核：挑战类型：TOOL_OPERATION；首考题 1（资料定位）：只允许使用《中文｜pnpm Workspaces（官方当前版）》《中文完整讲义》《中文｜语义化版本 2.0.0》，分别定位 workspace 协议，依赖声明/lockfile/peer/幽灵依赖/override/干净安装证据，以及公共 API 与版本号承诺；首考题 2（机制解释）：给定 workspace `apps/web` 直接 import `@scope/date-kit`、仅由 `packages/ui` 间接安装，且 `react` peer 需要 `^18` 而根安装 19，解释 hoist 可运行为何不是声明正确、lockfile 为何是解析结果；以“删 lockfile 重装”和“把 peer 放进 dependencies”作为反例，回指依赖类型和 lockfile 资料；首考题 3（最小产出）：固定 fixture：在 `fixtures/pnpm-workspace` 的 `broken` 分支，补齐 `apps/web` 的 `@scope/date-kit: workspace:*`，将 `packages/ui` 的 `react` 改为 peer `^18.3.1` 并以 root override 固定 `react@18.3.1`。执行 `pnpm install --frozen-lockfile`、在空 store 的 `pnpm install --offline`、`pnpm --filter web test` 与 `pnpm why react`。交付三个 `package.json` diff、`pnpm-lock.yaml` diff、依赖树、store 路径与四条命令输出；验证：在空 store 重跑 frozen/offline、web test 与 why，并核对 manifest 声明、lockfile 解析树及命令退出码；预期 frozen/offline 都成功且 `web` 不再幽灵 import；首考题 4（受限排错）：固定失败日志为 `ERR_PNPM_OUTDATED_LOCKFILE`，本地 `web` 却能启动且 `pnpm why react` 同时显示 18.3.1、19.0.0。只能在“web 漏声明依赖”“peer 范围冲突”“lockfile 被手工改写”三项中排查；分别用 `pnpm --filter web exec node -p "require.resolve('@scope/date-kit/package.json')"`、`pnpm explain peer-requirements`、重新生成后的 lockfile diff 证伪，修复唯一根因，并在同一 fixture 重新跑 frozen、offline、test 和 why；首考题 5（学习复述）：说明 manifest、解析树、lockfile 与安装环境怎样共同建立可重复性，解释本地 hoist 成功为何不能证明 CI 可复现；复测变式：只令 `packages/ui` 的可选依赖 `fsevents` 在 Linux fixture 中不可用；不变量是直接依赖、lockfile 的 React 解析和 web 测试结果不变，预期新证据是 optional 标记、Linux 安装日志与 `pnpm why fsevents` 输出。命题边界：只在「包管理、lockfile 与 workspace」所列资料和覆盖范围内命题；资料外经验不能替代题目要求的机制与证据；BNF 语法和正则不进入首考。
- 通过标准：验证证据：显式依赖与 peer/override 的 manifest diff、可审阅 lockfile、干净/离线安装输出、依赖树和同 fixture 回归齐全。否决项：删除或手改 lockfile、借 hoist 隐藏幽灵依赖、以安装成功掩盖 peer 冲突、未在干净环境验证，均不通过。评估边界：缺少与「包管理、lockfile 与 workspace」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## ENG-04 组件库构建、CJS/ESM、types 与 exports

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文工程讲义：ENG-04](../chinese-guides/content-audit-04-06.md#eng-04)、[Vite Library Mode](https://cn.vite.dev/guide/build.html#library-mode)。覆盖范围：组件包入口、ESM/CJS、`exports`、类型声明、CSS/资源、`sideEffects` 和发布验证；覆盖 Node/浏览器/bundler 消费兼容。考核使用题目提供的最小组件包 fixture，不依赖未交付的个人项目配置。
- 严格考核：挑战类型：TOOL_OPERATION；首考题 1（资料定位）：只允许使用《中文工程讲义：ENG-04》《Vite Library Mode》，分别定位包入口、条件导出、类型和资源处理边界；首考题 2（机制解释）：对条件导出 `import→./dist/index.js`、`require→./dist/index.cjs`、`types→./dist/index.d.ts` 和 `./style.css`，解释解析器为何按消费者选择入口、为何 React 必须为 peer、为何 CSS 与 `sideEffects` 决定保留；以“用 `main` 绕过 exports”和“把 React 打进库”作为反例；首考题 3（最小产出）：固定 fixture：在 `fixtures/ui-library` 的 `broken` 分支，为 `@fixture/button` 构建 `Button.tsx`、`style.css`、ESM/CJS/d.ts；修复 `package.json` 条件 exports、`peerDependencies.react` 和 CSS sideEffects。执行 `pnpm build`、`node fixtures/consumer-require.cjs`、`node fixtures/consumer-import.mjs`、`pnpm --dir fixtures/vite-consumer build`、`pnpm --dir fixtures/type-consumer tsc --noEmit`。交付 package diff、`dist` 文件清单、四条输出、consumer bundle 中 React 解析报告和 CSS 选择器 grep；验证：分别运行 CJS、ESM、Vite 与类型消费者并核对其退出码、bundle 中 React 副本和 CSS 选择器；预期两个消费者均渲染 Button、类型通过且 bundle 无第二个 React；首考题 4（受限排错）：固定失败日志为 `ERR_PACKAGE_PATH_NOT_EXPORTED`、bundle report `react@18` 与 `react@19` 各一份、页面无 `.button-primary`。只能在“exports 缺 require 条件”“React 被列为 dependency”“CSS 被 sideEffects 排除”三项中排查；分别用 `node -p "require.resolve('@fixture/button')"`、bundle metafile、产物 CSS grep 证伪，做一个最小 manifest 修复，并在同一 fixture 重跑五项构建/消费验证；首考题 5（学习复述）：说明 exports、模块格式、声明文件、peer 与样式如何构成不同消费者的发布合同，解释构建成功为何不能代替消费端验证；复测变式：只移除 CJS 消费者并声明下一主版本为 ESM-only；不变量是 ESM、类型、CSS 和 React peer 结果不变，预期新证据是 CJS 失败迁移说明、ESM consumer 输出、package 版本与 changelog 片段。命题边界：不得把个人项目配置当作隐藏题源。
- 通过标准：验证证据：exports/peer/sideEffects diff、ESM/CJS/类型消费者输出、bundler 解析报告、CSS 证据和同 fixture 回归必须齐全。否决项：通过深路径绕过 exports、把 React 打入库、只检查 dist 存在、遗漏 CSS 或类型消费者、将破坏性入口变更伪装为补丁版，均不通过。评估边界：缺少与「组件库构建、CJS/ESM、types 与 exports」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

### 质量门禁与测试体系

## ENG-05 lint、format、typecheck 与提交门禁

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文完整讲义](../chinese-guides/content-audit-04-06.md#eng-05)。覆盖范围：lint、format、typecheck、单测和提交/CI 门禁的职责、增量执行与阻断规则；覆盖误报、跳过门禁、基线债务和本地/CI 不一致；项目脚本必须由题目显式给出。
- 严格考核：挑战类型：TOOL_OPERATION；首考题 1（资料定位）：只允许使用《中文完整讲义》，定位 lint 配置、类型门禁，以及 format/lint/type/test/CI 分层、钩子旁路、基线债务和故障注入证据；首考题 2（机制解释）：对未用变量、未处理 Promise、`string` 赋给 `UserId` 和格式漂移，解释 formatter、lint、typecheck、unit test 各自的阻断范围；以 `--no-verify` 与把规则全降为 warning 为反例，说明本地快捷检查不能取代 CI 全量门禁；首考题 3（最小产出）：固定 fixture：在 `fixtures/quality-gate` 的 `broken` 分支，`src/save.ts` 含 `unusedToken`、裸 `saveDraft()`、`const id: UserId = '42'` 和 Prettier 错行。修复显式提供的 ESLint/tsconfig/pre-commit 配置后依次执行 `pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm gate:dry-run`。交付配置 diff、每个故障的红绿输出、hook dry-run、CI workflow job 日志和例外登记；验证：逐条保存 format/lint/type/test/gate 的退出码与 CI job 结果，并核对所有注入缺陷的红绿记录；预期五项均通过且不存在 `--no-verify`；首考题 4（受限排错）：固定失败日志为本地 lint 绿、CI `tsc` 报 `UserId` 不可赋值，并显示 commit message 含 `[skip-hooks]`。只能在“本地 lint 范围遗漏文件”“CI 使用不同 tsconfig”“提交旁路 hook”三项中排查；分别用 `eslint src/save.ts`、`tsc -p tsconfig.ci.json --showConfig`、hook 审计日志证伪，选择最小的脚本/配置/提交修复，并在同一 fixture 重跑五项命令与 CI job；首考题 5（学习复述）：说明格式、静态规则、类型和测试的职责互补，解释例外为何需要范围、负责人和到期日而不是静默忽略；复测变式：只把 `src/save.ts` 的单引号格式改为项目要求的双引号；不变量是类型约束、Promise 处理和 gate 分层不变，预期新证据是 format 红绿差异、lint/type/test 不受影响的输出和 staged 文件清单。命题边界：只在「lint、format、typecheck 与提交门禁」所列资料和覆盖范围内命题；资料外经验不能替代题目要求的机制与证据。
- 通过标准：验证证据：每层门禁的故障注入红绿记录、配置与范围、hook/CI 日志、例外登记和同 fixture 回归齐全。否决项：使用 `--no-verify`、将错误普遍降级为 warning、只在本地或只跑 format、篡改基线使故障消失、缺少 CI typecheck，均不通过。评估边界：缺少与「lint、format、typecheck 与提交门禁」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## TEST-01 单元测试、测试替身与覆盖边界

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Vitest Writing Tests](https://cn.vitest.dev/guide/learn/writing-tests)、[中文完整讲义](../chinese-guides/content-audit-04-06.md#test-01)。覆盖范围：测试预言、等价类、边界值、状态转换与不变量；fake/stub/spy/mock 的语义和耦合成本；基于示例与基于属性测试、生成器和收缩；变异测试衡量断言有效性；格式/解析器的结构化 fuzz；差分与蜕变测试；非确定性、时间、随机数和并发控制；行/分支覆盖与风险覆盖的差别；失败最小化和回归集治理；全部必读资料均为中文。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《Vitest Writing Tests》《中文完整讲义》，分别定位运行器断言/替身/隔离能力，以及生成器、收缩、种子、差分预言机、变异算子/存活者和回归固化方法；首考题 2（机制解释）：对 `price(quantity,coupon,region)` 说明边界 `quantity=100`、非法 `-1/NaN` 与折扣单调性各需要何种预言机；解释为何把被测公式复制进生成器会共享错误，说明 `>=100` 改 `>100` 是怎样的变异体，并以 99/100 的可收缩反例回指测试替身、属性和变异资料；首考题 3（最小产出）：固定 fixture：在 `fixtures/unit-price` 的 `src/price.ts` 对输入表 `0,1,99,100,-1,NaN` 编写 `price.spec.ts`；使用种子 `20260812` 生成数量 0–200 的样本，提交边界断言、折扣后总价不高于未折扣的不变量、拒绝非法数值的替身调用断言、失败样本 JSON 与风险—断言表。运行 `pnpm vitest run price --seed=20260812` 并保存输出；首考题 4（受限排错）：固定失败为把折扣条件 `>=100` 变为 `>100` 后 86 个测试仍绿。仅在“没有 quantity=100 边界样例”“属性生成器未覆盖 100”“预言机复刻了实现”三项中排查；用失败样本、生成器覆盖计数和独立手工价格表证伪，新增最小断言或收缩规则，并在同一 seed 杀死变异体后回归；首考题 5（学习复述）：说明例子、属性、替身和覆盖率各能与不能证明什么，解释快照或行覆盖率不能替代风险预言机；复测变式：只把 `region='CN'` 的税率从 0.06 改为 0.09；不变量是非法输入仍抛错、折扣单调性不变，预期变化是税后总价断言，提交新旧税率样本、seed 和变异结果作为新证据。命题边界：不要求指定属性测试或变异测试工具；不得让生成器复制被测实现，也不得以随机运行次数代替不变量和预言。
- 通过标准：验证证据：固定 seed、可重放反例、风险—断言表、变异报告和同 seed 回归齐全；至少一个属性失败必须收缩成可读输入。否决项：用随机次数代替不变量、将业务公式复制为预言机、忽略存活变异体，或仅以高行覆盖率判定通过，均不通过。评估边界：只有 happy path、快照或高行覆盖率，不能证明测试有效。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## TEST-02 React 组件测试

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文工程讲义：TEST-02](../chinese-guides/content-audit-04-06.md#test-02)、[Testing Library Queries](https://testing-library.node.org.cn/docs/queries/about/)、[User Event](https://testing-library.node.org.cn/docs/user-event/intro/)。覆盖范围：以用户可见行为测试 React 组件，覆盖查询优先级、事件、异步更新、网络替身、可访问性、清理和失败诊断；避免断言内部实现与脆弱 DOM 结构。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《中文工程讲义：TEST-02》《Testing Library Queries》《User Event》，分别摘出能支撑「React 组件测试」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：对申请表在空值、提交中、403、500、只读五种状态，说明以 role/name 查询如何对应用户可见语义、`userEvent` 与等待条件如何避免抢跑；以依赖 `data-testid` 和同步断言 loading 消失为反例，回指查询优先级与用户交互资料；首考题 3（最小产出）：固定 fixture：在 `fixtures/react-application-form` 的 `ApplicationForm.tsx` 使用 MSW；为姓名空值、保存中按钮禁用、403 权限提示、500 重试提示、只读字段五个状态写测试。交付测试文件、每例 `getByRole/findByRole` 查询、MSW handler、403/500 DOM 失败片段和 `pnpm vitest run ApplicationForm` 输出；首考题 4（受限排错）：固定失败为测试使用 `getByTestId('submit')` 后立即断言，故意植入的“loading 时按钮未禁用”和“500 无 alert”均未失败。仅在“断言早于异步完成”“查询没有用户语义”“handler 未真正返回 500”三项中排查；用 `screen.debug()`、等待前后 DOM 与 handler 调用计数证伪，替换一个查询/等待/handler 后让两缺陷均红并修复回归；首考题 5（学习复述）：说明组件测试验证的是用户可感知行为而非内部 state，实现重构时为什么 role/name 测试更稳；复测变式：只把 500 响应延迟从 0ms 改为 750ms；不变量是 alert 和重试语义，预期变化是 loading 在延迟窗口可见，提交时间线、DOM 片段和测试输出作为新证据。命题边界：只在「React 组件测试」所列资料和覆盖范围内命题；资料外经验不能替代题目要求的机制与证据。
- 通过标准：验证证据：五种状态的可访问查询、真实 handler 响应、异步 DOM 证据和两项故障注入的红绿记录必须齐全。否决项：只用 testid、固定 sleep、未断言 disabled/alert、或组件内部重构即失效的选择器，均不通过。评估边界：缺少与「React 组件测试」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## TEST-03 E2E、视觉回归、关键路径与测试隔离

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文工程讲义：TEST-03](../chinese-guides/content-audit-04-06.md#test-03)、[Playwright Introduction](https://playwright.nodejs.cn/docs/intro)、[Best Practices](https://playwright.nodejs.cn/docs/best-practices)、[截图视觉比较](https://playwright.nodejs.cn/docs/test-snapshots)。覆盖范围：E2E 关键路径、fixture、数据隔离、等待条件、重试、并行、trace/视频和失败归因；跨浏览器截图基线、稳定字体/时区/动画、动态区域遮罩、阈值、基线评审和有意变更更新；覆盖 flaky、第三方依赖、环境污染和视觉假阳性。
- 严格考核：挑战类型：TOOL_OPERATION；首考题 1（资料定位）：只允许使用《中文工程讲义：TEST-03》《Playwright Introduction》《Best Practices》《截图视觉比较》，定位隔离、自动等待、重试、trace 与截图比较的机制和边界；首考题 2（机制解释）：对登录—编辑—提交的关键路径，解释独立账户/数据库 seed、语义等待、trace 与快照阈值怎样避免把环境污染和视觉噪声当产品缺陷；以固定 `waitForTimeout` 和批量接受截图基线为反例；首考题 3（最小产出）：固定 fixture：在 `fixtures/e2e-profile` 使用账户 `e2e-u17`、时区 `Asia/Shanghai`、字体 `Noto Sans SC`、禁用 CSS 动画；Chromium desktop 与 Firefox mobile 各运行登录、编辑显示名为 `Lin`、提交并读取成功 toast。执行 `pnpm playwright test profile --project=chromium-desktop --repeat-each=10`、同命令 Firefox、`pnpm playwright test profile --update-snapshots=none`。交付 seed 脚本、spec、两浏览器报告、失败 trace/video、`profile.png` 基线/actual/diff、动态头像遮罩和测试隔离说明；预期两组 10 次全绿、toast 和截图均通过；首考题 4（受限排错）：固定失败日志为 Firefox 的第 7/10 次快照右移 8px，trace 显示头像请求 1.2s，且断言在 `networkidle` 后读取按钮。只能在“动态头像未遮罩”“Firefox 字体未固定”“等待的是网络而非提交完成”三项中排查；分别用遮罩前后 diff、浏览器字体样式采样、toast DOM 时间线证伪，做一个最小遮罩/字体/语义等待修复，并在同一 fixture 重跑两浏览器各 10 次及快照；首考题 5（学习复述）：说明行为断言、视觉断言和运行隔离各自证明的范围，解释稳定截图为何仍不能替代无障碍和业务行为测试；复测变式：只把成功按钮文案从“保存”改为“保存资料”；不变量是账户隔离、提交请求和 toast 成功语义不变，预期新证据是有审批的基线 diff、两浏览器行为报告与变更说明。命题边界：视觉回归不能替代行为与无障碍测试。
- 通过标准：验证证据：固定环境/seed、两浏览器各 10 次报告、关键行为断言、trace/video、基线/actual/diff/遮罩和同 fixture 修复回归齐全。否决项：固定 sleep、共享脏账户、批量接受基线、只生成截图、以关闭动画忽略真实交互缺陷，均不通过。评估边界：只生成截图、关闭动画后忽略真实缺陷或批量接受新基线不能通过。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## TEST-04 API 契约兼容与消费者驱动契约测试

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[TEST-04 契约兼容完整讲义](../chinese-guides/content-audit-04-06.md#test-04)。覆盖范围：消费者驱动契约、Provider State、Broker、提供者验证、多消费者/多版本矩阵、HTTP/OpenAPI、Protobuf/gRPC-Web 与异步消息的兼容断言、弃用和发布阻断。本点只负责可执行验证，不重复业务 DTO 设计或规范解析器实现。
- 严格考核：挑战类型：TOOL_OPERATION；首考题 1（资料定位）：只允许使用中文资料《TEST-04 契约兼容完整讲义》，定位 HTTP 与二进制契约的破坏性变更、消费者契约、Provider State、提供者验证和版本演进规则；首考题 2（机制解释）：给 Web、mobile、batch 三个消费者以及 proto 字段 `3=status`，解释消费者预期、Provider State、HTTP 错误语义和 protobuf 字段号为什么要分别验证；以“生成 mock 成功”和“最新版 Web 能解码”作为反例；首考题 3（最小产出）：固定 fixture：在 `fixtures/contract-orders`，Web 契约要求 `GET /orders/7` 返回 `status` 与 404 `ORDER_NOT_FOUND`，mobile 契约要求未知枚举回退为 `UNKNOWN`，batch 消费 `OrderChanged` 消息；proto 的 `3=status` 保持不变。编写三份消费者契约与 Provider State，执行 `pnpm pact:verify`、`pnpm proto:compat`、`pnpm message:verify`、`pnpm ci:contract`。交付契约/状态文件、兼容矩阵、四条输出、Broker 发布记录和弃用计划；预期三消费者及 unary/message 验证通过；首考题 4（受限排错）：固定失败日志为 provider 将字段号 3 改成 `reason`，mobile stream 末尾缺 `x-request-id`，Web 正常 200。只能在“破坏了字段号”“stream metadata 漏传”“仅 Web 合同被执行”三项中排查；分别用 `pnpm proto:compat --against baseline.proto`、stream header 捕获、CI job 列表证伪，恢复字段号或 metadata/CI 配置的最小修复，并在同一 fixture 重跑四项验证与发布阻断；首考题 5（学习复述）：说明多消费者、状态准备、提供者验证和弃用窗口如何共同约束兼容性，解释可解码未知字段为何不是所有语义兼容的证明；复测变式：只令 mobile 收到新增的未知枚举 `PAUSED=4`；不变量是字段号 3、Web 404 与 batch 消息版本不变，预期新证据是 mobile 回退断言、proto 兼容报告和三消费者矩阵。命题边界：不得把生成 Mock、客户端能解码或单一最新版消费者成功当兼容性证明；
- 通过标准：验证证据：三份消费者契约、Provider State、HTTP/proto/message 验证输出、兼容矩阵、发布阻断和同 fixture 回归记录齐全。否决项：只跑单一消费者快乐路径、只比较 JSON 字段、修改 protobuf 已发布字段号、以 mock 成功替代提供者验证、跳过 CI 契约 job，均不通过。评估边界：只有单消费者快乐路径或只比较 JSON 字段不能通过。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

### 交付、供应链与平台工程

## ENG-06 CI/CD、制品晋级、发布与回滚

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#eng-06)、[GitHub Actions 工作流机制](https://docs.github.com/zh/actions/about-github-actions/understanding-github-actions)。覆盖范围：PR 门禁、可复现构建、不可变制品、环境与密钥、数据库/配置向前向后兼容、功能开关、蓝绿/金丝雀发布、变更冻结、自动/人工回滚、旧 chunk 与缓存兼容、回滚后恢复验证和发布审计；知识库、配置、内容与代码变更都必须生成新制品。SBOM/签名归 `ENG-08`，健康检查和镜像归部署/容器知识点，遥测、SLO 与告警归 `OBS-01`，事故指挥与复盘归 `CAREER-04`。
- 严格考核：挑战类型：TOOL_OPERATION；首考题 1（资料定位）：只允许使用《中文核心讲义》《GitHub Actions 工作流机制》，分别定位流水线、制品、灰度、停止条件和回滚依据；首考题 2（机制解释）：对同一不可变 `build-42@sha256:aa42` 从 staging 晋级 5% production，解释制品身份、环境配置、金丝雀停止条件、旧 chunk 兼容和 expand-contract 顺序为何不能混为一次“部署成功”；以重建同名制品和回滚代码却保留新 CDN HTML 为反例；首考题 3（最小产出）：固定 fixture：在 `fixtures/release-pipeline`，`build-42@sha256:aa42` 含 app `2.4.0` 与 schema expand migration，staging 已验证；执行 `pnpm pipeline promote --digest sha256:aa42 --to prod --percent 5 --dry-run`、`pnpm release verify --version 2.4.0`、`pnpm rollback --to 2.3.9 --dry-run`。交付 workflow YAML、digest/attestation 引用、5% 流量日志、停止阈值表、旧/新 HTML 与 chunk manifest、migration 演练、回滚计划和发布审计；预期同一 digest 晋级、旧 chunk 可取且三类恢复检查通过；首考题 4（受限排错）：固定失败证据为错误率 0.2% 未超阈值但 `/checkout` 成功率降至 91%，回滚后 CDN 日志仍请求 `app-2.4.0.js` 并 404。只能在“业务停止条件缺失”“旧 HTML 未保留旧 chunk”“回滚用了错误制品版本”三项中排查；分别用用户任务事件、HTML/manifest 与 CDN access log、release digest 审计记录证伪，修复唯一命中的阈值/保留策略/回滚引用，并在同一 fixture 重跑 dry-run、verify 与回滚后恢复检查；首考题 5（学习复述）：说明门禁、不可变制品、渐进发布、停止条件与回滚验证怎样形成可审计闭环，解释基础错误率正常为何不能替代核心任务证据；复测变式：只把 contract 的删除操作延后一版发布；不变量是 `build-42` digest、5% 流量策略和 schema expand 阶段不变，预期新证据是兼容矩阵、延后记录、旧客户端调用日志和回滚 dry-run。命题边界：本点不重复考核 SBOM 生成、遥测 SDK 实现或事故指挥流程。
- 通过标准：验证证据：不可变 digest、逐环境晋级日志、门禁与停止阈值、旧/新 chunk 证据、expand-contract 演练、回滚 dry-run 和三类恢复检查齐全。否决项：重建同名制品、密钥写入制品/日志、仅看错误率、回滚后未检查核心任务与数据、用成功命令替代制品身份，均不通过。评估边界：流水线或回滚命令显示成功但没有制品身份、停止条件和恢复证据，不能通过。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## ENG-08 软件供应链、SBOM 与制品可信

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文｜ENG-08 供应链完整讲义](../chinese-guides/content-audit-04-06.md#eng-08)。覆盖范围：通用软件供应链中的依赖图、lockfile、SBOM、漏洞/许可证、包签名、provenance、制品晋级、来源追踪和事件响应。AI 建议依赖的专项审计归 `AIDEV-07`，容器镜像层与基础镜像硬化归 `DOCKER-04`。
- 严格考核：挑战类型：TOOL_OPERATION；首考题 1（资料定位）：只允许使用《中文｜ENG-08 供应链完整讲义》，定位供应链威胁、SBOM/来源证明/签名、许可证义务和 AI 代码来源治理；首考题 2（机制解释）：对固定制品 digest，解释 lockfile、SBOM、许可证清单、NOTICE、签名和 provenance 为什么必须绑定同一对象；以同名公网包替换和“AI 生成所以无需来源复核”为反例，区分漏洞扫描、许可证义务与来源追踪；首考题 3（最小产出）：固定 fixture：在 `fixtures/supply-chain` 用 `app@sha256:8f00`、`pnpm-lock.yaml`、直接依赖 `ui-kit@1.4.2` 和传递依赖 `left-pad@1.3.0` 生成制品。执行 `pnpm install --frozen-lockfile`、`pnpm sbom --digest sha256:8f00`、`pnpm license:check`、`pnpm notice:verify`、`pnpm attest:verify --digest sha256:8f00`。交付 lockfile、CycloneDX SBOM、许可证/NOTICE、签名与 provenance、digest 关联表、AI 依赖建议复核记录和五项输出；预期所有文件指向相同 digest 且禁止许可证清零；首考题 4（受限排错）：固定失败日志为 registry 中同名 `ui-kit@1.4.2` 的 tarball sha 与 lockfile integrity 不符、`left-pad` 被策略标为禁止传递许可证、签名声明 `sha256:8f00` 而 SBOM 是 `sha256:91aa`。只能在“源包被替换”“许可证策略命中”“签名/SBOM 来源不一致”三项中排查；分别用 lockfile integrity 校验、license policy report、attestation subject 比对证伪，采用锁定可信包/申请有期限例外/重签同一 digest 的最小修复，并在同一 fixture 重跑五项命令与消费者查询；首考题 5（学习复述）：说明依赖解析、制品身份、许可证审查、签名来源与撤回如何构成供应链证据，解释 AI 工具声明为何不是版权或安全证明；复测变式：只撤销 `sha256:8f00` 的签名；不变量是 lockfile、SBOM 内容和许可证判定不变，预期新证据是签名撤销记录、受影响消费者列表、阻断发布日志与恢复签名后的验证。命题边界：不要求给出法律意见；许可证结论必须标明政策与复核责任，AI 工具声明不能自动洗清来源风险。
- 通过标准：验证证据：可重复安装、同 digest 的 SBOM/许可证/NOTICE/签名/provenance、禁止项或例外审批、消费者定位和同 fixture 回归齐全。否决项：仅漏洞扫描、手改 SBOM、签名与制品摘要不一致、忽略传递依赖、以 AI 生成声明代替人工来源复核，均不通过。评估边界：只有漏洞扫描通过、只生成未复核 NOTICE 或忽略传递依赖不能通过。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## OBS-01 前端可观测性、SLO、告警与隐私边界

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#obs-01)、[OpenTelemetry Browser](https://opentelemetry.io/zh/docs/languages/js/getting-started/browser/)、[MDN Performance APIs](https://developer.mozilla.org/zh-CN/docs/Web/API/Performance_API)。覆盖范围：错误、日志、RUM、Web Vitals、资源、请求、用户任务和业务结果；trace/span/metric/log 与版本、路由、会话的关联；SPA 软导航的边界、指标重置/归属和不支持时的启发式回退；采样、脱敏、同意、留存和上报成本；症状/原因告警、SLO/错误预算、严重度分级输入、值班路由以及发布/恢复验证；实验/有限支持能力的成熟度隔离。事故指挥、状态沟通和复盘行动归 `CAREER-04`。
- 严格考核：挑战类型：DEBUGGING；首考题 1（资料定位）：只允许使用《中文核心讲义》《OpenTelemetry Browser》《MDN Performance APIs》，分别定位 RUM/Trace/SLO 与隐私边界、JS 遥测语义、浏览器接入、Performance Entry/Observer 采集依据；首考题 2（机制解释）：在 SPA `/search→/detail/42` 中，解释 `navigationId`、route、release、trace/span/error 如何关联一次用户任务，及无新导航 API 时为何必须标记启发式口径；以采集 email 和只按页面均值告警为反例，说明隐私与可行动性边界；首考题 3（最小产出）：固定 fixture：在 `fixtures/rum-spa`，`/search` 产生 `nav-s1`，点击 detail 产生 `nav-d42`；注入 `/api/detail/42` 2200ms、`chunk-detail.js` 404 和白屏 3s。实现 PerformanceObserver/RUM/span 采集、`email` 脱敏、10% 成功采样与 100% 错误采样，执行 `pnpm telemetry:simulate`、`pnpm slo:check`、`pnpm privacy:scan`。交付事件样本、trace 导出、SLO/错误预算表、告警路由、采样成本表、隐私扫描输出和三条命令输出；验证：以事件样本、trace、SLO 检查和隐私扫描逐项核对 nav-d42 归属、采样率及脱敏前后的 payload；预期 detail 的 INP/错误归属 `nav-d42`，payload 不含 email；首考题 4（受限排错）：固定失败证据为 INP 被归到 `nav-s1`、相同 chunk 404 连发三次告警、导出 payload 含 `email=lin@example.test`。只能在“软导航未创建新关联”“告警去重键缺失”“脱敏在导出后执行”三项中排查；分别用 navigation trace 时间线、告警 fingerprint 日志、collector 前后 payload 证伪，做最小的关联/去重/采集前脱敏修复，并在同一 fixture 重新跑 simulate、SLO、privacy scan 和恢复观察窗口；首考题 5（学习复述）：说明 RUM、trace、SLO、告警与隐私控制怎样服务于发现、定位、发布和恢复，解释实验性 Soft Navigation 能力为何不能无标注地当全浏览器事实；复测变式：只令 detail 浏览器不提供 `navigationId`；不变量是 release、route、错误采样和 email 脱敏不变，预期新证据是标注“启发式关联”的事件、关联规则日志、SLO 口径说明和隐私扫描。命题边界：Soft Navigations 的启用状态按考核日期冻结，不得把单浏览器能力当全平台事实；
- 通过标准：验证证据：可关联的事件/trace、SLO 与错误预算、去重告警与路由、采样成本、隐私扫描、恢复观察和同 fixture 回归齐全。否决项：上报 email/密钥、仅报告均值、混用硬软导航口径、告警无去重或 owner、将单浏览器实验能力当全平台结论，均不通过。评估边界：只上报页面加载均值、无法行动的高噪声告警、把所有 SPA 生命周期算成一次导航或混用不同口径不能通过。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## DX-01 前端平台工程、Golden Path 与开发者体验

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/content-audit-04-06.md#dx-01)、[DORA Platform Engineering](https://dora.dev/capabilities/platform-engineering/)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：平台即产品、用户研究与开发者旅程、Golden Path、开发者门户、服务目录、所有权、平台 API/SLA、权限、成本、采用/留存/任务成功率和有治理的逃生通道；本点负责平台产品合同与采用闭环。项目图/任务图归 `ENG-03`，AST/Codemod 实现归 `AIDEV-06`，Agent 仓库上下文归 `AIDEV-02`，组织推广与继任归 `LEAD-01`。
- 严格考核：挑战类型：DESIGN_CASE；首考题 1（资料定位）：只允许使用《中文核心讲义》，定位平台产品边界、Golden Path、自助服务、治理、逃生通道和度量规则；首考题 2（机制解释）：对“新建应用”和“存量应用升级”两位开发者，解释为什么同一模板不是同一旅程，以及目录 owner、平台 API/SLA、权限和有治理退出如何把平台当产品；以强制安装工具和只统计模板创建次数为反例；首考题 3（最小产出）：固定 fixture：为 `new-catalog-app` 与 `legacy-checkout` 设计一条前端 Golden Path，约束平台团队 2 人、试点 6 人、4 周。交付两份逐步旅程、门户目录条目（owner/成本/版本）、创建/升级 API 合同与 SLA、权限矩阵、退出申请表、支持值班表、基线与目标指标表，以及 `pilot-results.csv` 模板。执行 `pnpm platform:validate-plan fixtures/golden-path` 并交付校验输出；验证：以计划校验输出和试点结果表逐项核对两类用户的任务完成、退出审计与三类指标采集；预期两类用户均能完成受支持路径或有审计的退出，且至少三类指标可测；首考题 4（受限排错）：固定失败证据为存量升级者 6 人中 4 人在生产权限审批处失败，路径留存 2/6，反馈称“找不到 owner”。只能在“权限矩阵缺角色”“目录 owner 为空”“升级 API 的 SLA 无响应窗口”三项中排查；分别用审批审计、目录 schema 校验、支持工单时间线证伪，修复唯一命中的权限/owner/SLA 合同，并以同一 6 人旅程重测任务成功时间、失败率和满意度；首考题 5（学习复述）：说明平台产品合同、Golden Path、逃生通道和采用指标怎样形成持续改进闭环，解释为什么使用次数或锁死配置不是开发者成功；复测变式：只将平台试点预算从 10 万元降为 5 万元；不变量是两个用户旅程、owner 责任、退出审计和任务成功定义不变，预期新证据是范围调整表、成本/采用预测、三类指标对照和未达目标时的停止决定。命题边界：任务图实现归 `ENG-03`，Codemod 归 `AIDEV-06`，Agent 上下文归 `AIDEV-02`；不得以工具安装、模板数量或强制采用率替代任务成功证据。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：验证证据：两类用户旅程、目录/owner/版本/SLA、权限与退出审计、至少三类试点指标、失败取证与同 fixture 重测齐全。否决项：只搭建工具或脚手架、强制采用替代任务成功、owner/SLA 为空、禁止退出、只报使用人数或未验证存量升级，均不通过。评估边界：只搭建 Nx/Backstage、只写脚手架、只统计使用人数或通过锁死配置制造一致性不能通过。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟


## 领域综合考核

- [ ] 已通过领域综合考核
- 任务：为一个现有项目建立最小可用质量体系，包括可恢复的 Git 提交图、分支与 PR 策略、可重复构建、lint/typecheck、单测、组件测试、E2E、CI 配置、制品说明和回滚手册。
- 通过标准：8 小时内完成；能恢复误操作并解释提交图；注入 5 类工程缺陷均被对应门禁阻止；CI 可重复；考官随机删除缓存后仍能从零完成全流程。评估边界：领域综合考核只依据本领域列出的资料、题目输入和可复核产出；不得用资料外经验替代跨知识点整合证据。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟
