# 验证日志索引

所有命令在工作副本执行；不使用真实用户数据库或模型服务。原始标准输出保存在同目录 `.txt`，避免 `.log` 被忽略。

- 工具链入口：项目 pnpm 12.10.1 自切换失败；备用 10.11.0 不满足 engines。见 `pnpm.txt`。因此下面直接运行已经安装的同名工具，未改依赖。
- 根目录：`node scripts/check-module-boundaries.mjs`；`node node_modules/eslint/bin/eslint.js apps/server/src apps/web/src packages/shared/src packages/content-parser/src`。
- 各包目录：`node ../../node_modules/vitest/vitest.mjs run`。server 完整套件见 `server-tests.txt`，加强后的七点本地结构全通过且不调用网络测试另见 `guard-recheck.txt`；web/shared/content-parser 分别见对应 tests 文件。
- 根目录：`node node_modules/typescript/bin/tsc -p packages/shared/tsconfig.json`、content-parser 与 server 对应 tsconfig；web 目录 `node node_modules/vue-tsc/bin/vue-tsc.js --noEmit`。成功命令无输出，见构建结果记录。
- web 目录：`node scripts/check-learning-materials.mjs`、`node scripts/check-curated-materials.mjs`、`node scripts/check-pronunciations.mjs`；后者包含 388 个通用代码例子与 122 个 TypeScript 例子检查，并明确另有需真实环境核对的片段。
- content-parser 目录：`node --test scripts/learning-link-anchors.test.mjs` 与 `node scripts/check-learning-links.mjs`。常规外链检查 911 个可访问，3 个 fetch failed；未把这三页当成已核验正文。
- web 目录：`node node_modules/vite/bin/vite.js build`、`node scripts/check-bundle-budget.mjs`。现有大 chunk 警告保留，单独体积预算通过。
- web 目录：`node node_modules/@playwright/test/cli.js test e2e/framework-route.spec.ts e2e/framework-entry.spec.ts e2e/async-pilot.spec.ts e2e/experience.spec.ts`。global-setup 使用隔离目录和端口，测试串行；Chrome 在沙箱内启动失败，之后经自动审批运行隔离 Chrome。

初轮失败说明：新旧测试断言冲突已按合同修正；22 页发音检查触发 30 秒总预算，改为 90 秒用例总预算，逐页就绪/发音断言没有放宽。新增旧挑战样本先后修正 UUID 与会话状态（DRAFT 在开始前不展示题目），保留读取原题断言。一次恢复后运行遇到 Chrome 启动超时，不能算页面通过。后续通过范围以最终 E2E 日志为准，不以初轮截图替代最终检查。

`reading-regression/` 只收录本轮 `e2e-initial.txt` 中已通过的异步五项及框架入口五项产生的截图与浏览器元数据，未复制旧 fixture 实验文件。它们证明目录、小节直达、代码复制/横向滚动、阅读阈值与入口返回检查；`e2e-initial.txt` 的整个 51 项运行并未全部通过，后续复核另存。

最终补充：共享包、解析器、服务端 TypeScript 编译、web vue-tsc 与 ESLint 通过；最终 Vite 构建与体积预算见 `build.txt`，日志耗时包含环境中断，不能作为性能数据。笔记迁移改用工作副本目录后单项复核通过，见 `note-migration-recheck.txt`。`e2e-resume-stall.txt` 为环境长停顿后失败的运行，`e2e-interrupted.txt` 为没有结束汇总的中断运行，均不记为通过。

旧学习闭环用例增加显式开始 JS-02，并明确完成 JS-01 基础后验证 JS-03；这是消除隐式焦点切换及跳过未完成基础的历史假设，未删除完成、返回学习台和下一步操作断言。

当前未完成最终页面验收，详见实施报告恢复检查点。`e2e-focused-first.txt` 包含修正后的旧题截图成功流程，但整次运行未全部通过；`e2e-focused-stall.txt` 与 `e2e-awake.txt` 均失败，不能合称最终 25 项通过。

返工最终结果见实施报告末节：`rework-full-e2e.txt` 为 43 通过/4 失败/5 跳过；`rework-remaining.txt` 为上述缺口及关键回归 11 项全通过，两批次覆盖全部 52 项。失败 trace 保存在 rework-full-failures，保留异常事件空档证据。`rework-route-tests.txt` 为 29 项生产测试通过；rework-types/lint/build/budget 为实际返工检查。历史“尚未完成”段落描述当时检查点，不是最终状态。

最终截图复核：`caffeinate -i node node_modules/@playwright/test/cli.js test e2e/framework-route.spec.ts`，2 项通过，见 rework-final-pages.txt。完整截图与版本/地址/视口元数据在 run-2026-11-13T17-08-47-086Z；旧练习原文使用可见性断言并滚动后截图。返工未提交或推送。
