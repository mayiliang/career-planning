# 异步链试点实施验证

核验时间：2026-10-31，Asia/Shanghai。范围为 Issue #2，保留既有实现后继续验证；自动化基础设施变更不计入交付，未修改 automation/。本记录是开发验证，独立产品验收由调度器继续执行。

## 实际执行结果

运行命令前将工作副本 `tmp/tooling/native/package` 加入 PATH，使用 pnpm 12.10.1；系统 pnpm 转发器异常，因此使用下载到工作副本的官方发行包，未修改项目依赖。日志保存在忽略目录 tmp，下列结论及浏览器证据随产品入库。

| 命令 | 结果与证据 |
| --- | --- |
| `pnpm content:check` | 通过；14 项内容测试，160 份资料、211 条直接前置无环；122 个 TypeScript 正文示例、387 个通用正文示例、发音清单通过。日志 `tmp/async-content-check-final.log`。这些全库数字只是检查结果，不是产品数量目标。 |
| `pnpm content:links` | 通过常规模式；Markdown 解析排除代码伪链接，知识编码锚点对齐讲义阅读器；3 项校验器回归测试通过。最终 913 个远程唯一地址中 901 可访问、0 明确失效、12 暂无法确认，逐项列于下方。日志 `tmp/async-content-links-final.log`。不代表严格联网核验全部通过。 |
| `pnpm lint` | 通过；包括模块边界及全部包。日志 `tmp/async-lint-final.log`。 |
| `pnpm test` | 全量 306 项通过（内容 18、共享 10、服务端 227、网页 51）。日志 `tmp/async-all-tests.log`。随后增加的取消资源/旧结果检查连同试点测试再运行，见下一行；不把定向复测写成新一轮全量执行。 |
| `pnpm --filter @career-atlas/server exec vitest run src/services/async-pilot.test.ts` | 最终 10 项通过；依赖、完整机制预算、确定性任务组及错误变体、隔离记录重导入、版本快照、实际请求结构、无模型降级、正常/预取消/运行中取消清理、旧成功和旧清理抑制。日志 `tmp/async-targeted-tests.log`。 |
| `pnpm build` | 通过；网页首屏 JS 271.9 KiB、CSS 30.0 KiB，体积预算通过，服务端 TypeScript 编译通过。保留既有大 chunk 提示。日志 `tmp/async-build.log`。 |
| Chrome / Playwright | 见 [页面与正文浏览器证据](async-pilot-browser-evidence.md)，记录实际浏览器、视口、路径和截图；与 Node 示例检查分开。 |
| `git diff --check` | 通过。 |

测试数据库由 setup 显式配置在工作副本 `tmp/tests/` 与 `tmp/e2e/`，`NODE_ENV=test`、`AUTO_BACKUP=false`，禁用真实 env 配置并清空模型密钥；不使用原主目录数据库。兼容样本保留同一知识点身份、笔记、42% 阅读记录、学完与掌握状态、当前点、打卡、暂缓、旧练习及已完成挑战题目/评分。

## AI 证据的边界

`tmp/async-pilot-evidence/practice-request-mock.json` 保存测试捕获的实际构造请求正文（不含鉴权头）。断言检查完整机制段落、来源、预算、合同版本和缺失降级；响应来自测试模拟。新挑战只保存一次完整机制快照，评分消费创建时快照，旧挑战使用旧合同及已保存题源。没有使用真实模型或购买 API，因此真实输出的教学质量、评分准确性及学习者效果仍未验证。

## 链接检查修复及未确认来源

原脚本只承认完整标题锚点，误报阅读器支持的 `#JS-04` 等知识编码；还把代码中的 `tasks[index](signal)` 当成链接。现在仅对讲义接受运行时已有的编码别名，普通文档仍要求真实标题；Markdown 语法解析保留引用链接、排除代码，测试仍拒绝不存在的锚点和围栏伪标题。

全库检查另发现两个官方 404，仅更新 URL，未重写非试点讲义。2026-10-31 实际打开的一手在线页面（无语义版本号）：[Node.js HTTP transaction](https://nodejs.org/learn/http/anatomy-of-an-http-transaction) 和 [MDN controlling flex item ratios](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Flexible_box_layout/Controlling_flex_item_ratios)。这两项是链接修复，不声称完成对应讲义审读。

最后一轮以下地址网络失败，不能宣称已读取或有效：

- https://react.dev/learn/synchronizing-with-effects（fetch failed）
- https://react.dev/reference/react/useEffectEvent（fetch failed）
- https://react.dev/learn/separating-events-from-effects（fetch failed）
- https://react.dev/reference/react/useContext（fetch failed）
- https://react.dev/learn/extracting-state-logic-into-a-reducer（fetch failed）
- https://react.dev/reference/react/memo（fetch failed）
- https://react.dev/reference/react/useCallback（fetch failed）
- https://www.typescriptlang.org/tsconfig/strict.html（fetch failed）
- https://www.typescriptlang.org/tsconfig/noUncheckedIndexedAccess.html（fetch failed）
- https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html（fetch failed）
- https://www.typescriptlang.org/docs/handbook/2/generics.html（fetch failed）
- https://www.cac.gov.cn/2025-03/14/c_1743654684782215.htm?s=08（fetch failed）

网络结果有波动，前一轮亦未确认的网信办地址为 `https://www.cac.gov.cn/2024-03/22/c_1712776611775634.htm`、`https://www.cac.gov.cn/2025-03/14/c_1743654684782215.htm`、`https://www.cac.gov.cn/2026-07/24/c_1786638883119336.htm`。后续核验应以实际页面为准。

## 调度器首轮失败后的修复（2026-11-01）

本轮沿用保留的试点改动，仅处理调度器 `b32ea07b54e74dc78de2528152be56b0-1/check-6.log` 的浏览器失败。调度器同轮 `build:packages`、`content:check`、`content:links`、`lint`、`test` 和 `build` 均通过；这些结果不替代修复后的前端验证。

修复包括：换篇撤销旧正文就绪标记；助手随迟到的正文更新上下文；挑战提交栏避开助手；路线文案测试按已授权原则更新；打卡提示定位到具体状态消息。保留旧笔记保存失败隔离、锚点位置、阅读进度不增加、答案保留及真实点击检查。选区检查改选正文并先断言拖动确实产生非空选区；目录检查区分键盘聚焦引发的正常滚动与 Enter 查阅跳转。

全套 E2E 使用同一个单用户数据库，改为单 worker 顺序执行，避免不同用例争用学习焦点、暂缓及阅读记录。首次并行复测出现大量浏览器建页、加载超时，日志 `tmp/async-repair-e2e.log`，不列为通过证据。沙箱中的 Chrome 启动失败后，后续浏览器命令经自动审查允许在沙箱外执行，数据库仍限定工作副本独立目录。

修复后的实际结果：

| 命令 / 检查 | 结果与证据 |
| --- | --- |
| `pnpm lint` | 通过，日志 `tmp/async-repair-lint.log`。 |
| `pnpm --filter @career-atlas/web test` | 9 个文件、51 项单测通过，日志 `tmp/async-repair-web-test.log`。 |
| `pnpm build` | 通过；包含资料结构、正文示例及发音检查，首屏 JS 272.1 KiB、CSS 30.0 KiB，预算通过；保留大 chunk 提示。日志 `tmp/async-repair-build.log`。 |
| 定向 Playwright | 助手、异步链、挑战保存共 15 项通过，`tmp/async-repair-targeted.log`；截图见浏览器证据记录。 |
| `pnpm test:e2e` 及中断后补跑 | 最终全量命令在前 42 项全部通过后因会话中断退出，没有结束汇总，日志 `tmp/async-repair-e2e-final.log`。其余 30 项分段补跑，过程中修正详情页残留的三个旧文案断言；末段 15 项全部通过（56.9 秒，含重建 JS-02 已完成状态的挑战恢复用例）。日志 `tmp/async-repair-e2e-remaining.log`、`tmp/async-repair-e2e-route-final.log`。合计 72 个不同用例均有最终通过证据，逐项映射见 [通过用例清单](evidence/async-repair/passed-tests.json)。这不是一次完整命令成功退出的宣称，调度器仍应运行全套。 |
| `git diff --check` | 通过；`automation/` 无改动，分支仍为 `auto_coding`，未提交或推送。 |

最后一段复现：在 `apps/web` 运行 `pnpm exec playwright test`，参数为 `e2e/experience.spec.ts` 的测试起始行 `606、756、775、799、810、839、886、899、912、934、976、996、1025、1037、1053`（分别以 `e2e/experience.spec.ts:行号` 传入）。其中 606 重建后续连续路线检查需要的 JS-02 已完成现场。补跑服务每次仍建立独立 DATA_DIR。

本次没有改动正文或外链，没有重复联网核验；调度器首轮链接检查的 16 个暂无法确认地址仍见其 `check-2.log`，不能据早前的不同网络结果宣称已确认。真实模型输出、评分语义准确性和学习效果仍未验证。
