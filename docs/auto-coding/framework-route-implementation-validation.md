# 独立框架偏好与统一推荐实施验证

最新状态（2026-11-15）：第三次返工完成，最新 17 项失败与 41 项未执行均已有分批通过证据；详见文末覆盖汇总。历史失败与中断保留，不将分批结果称为单次全量通过。

Issue #8，基线 `ef7edbc`，2026-11-11 实施，2026-11-12 至 11-14 恢复并复核。本轮依据[已接受产品合同](framework-foundation-route-contract.md)实施，不新增框架 API 行为结论、不发布七点新夹具。副作用两篇正文已通读，仅补学习前的 JS-05 链接与能力范围；示例未改。

## 最终行为与接口

- `GET /api/v1/learning/preferences` 返回 frameworkChoice、revision、updatedAt；`PUT` 接受 frameworkChoice 与 expectedRevision。事务内先校验修订号，再处理同值幂等；过期（包括同值）返回 409，当前值同时在 current 与 error.details.current。不存在从旧进度推断意愿的逻辑。
- `GET /api/v1/learning/route` 返回共享 `LearningRoute`：routeVersion=`framework-foundation-v1`、preferenceRevision、frameworkChoice、current、next、outcome、blockers、diagnostics、reviewScope。纯函数位于 shared；状态快照选择位于服务端 learning/routes。
- current 优先显式焦点，否则按 updated_at 倒序、code 升序选 LEARNING；多显式焦点报告诊断，不修库。LEARNING 焦点优先继续，未满足基础另外提示。已完成焦点保留展示，已完成链不追溯上游。完成另一浏览点不再抢走焦点；只有显式开始操作可以切换到另一点。
- 未选择、暂缓、缺目录、共同基础完成、已审链完成均不按旧数组兜底。当前未审点仍可继续。READING 辅助不进入知识点 ID、完成分母或开始门禁。
- workspace.suggested、旧 recommendation.point、旧 branches 数组均映射统一结果，可空；workspace 与 recommendation 附完整 route。旧 branches 只保留数组兼容，空态通过同一 `/learning/route` 展示。
- 学习台、路线、知识清单、详情、阅读器采用同一推荐；详情另列本篇基础。路线统计明确为旧分组浏览统计；材料前后篇称“同组上一篇/下一篇”。图谱与脑图明确不代表已验证必修路线。没有删除 React/Vue 资料或稳定 track ID。

## 迁移与兼容

0016 迁移在 Drizzle 的 SQLite 事务中新增独立偏好行、关系来源列、合同版本及已审边。旧库默认 UNDECIDED/0。仅按完整旧描述与端点匹配清理已知自动硬边；UNKNOWN/人工边保留，纯规划器不读取这些边。运行时 sync 的删除与插入也在同一事务，重复同步不重建已匹配的自动边。

[迁移结果](evidence/framework-route-implementation/migration.json)来自真实旧版 SQLite：旧 schema 先执行 0000–0015，填充双框架、旧 BRANCH、笔记两版、37% 阅读、旧练习/题目/答案/评分/提示、掌握事件、两套打卡与个人计划，然后执行实际 0016。按表比较所有旧字段；插入阶段故障发生在旧边删除后，验证 DDL、偏好、删除和旧记录一起回滚；再次正常迁移和重复执行保持偏好修订号。原始数据库仅在工作副本 tmp/issue8-migrations。项目没有独立 settings 表；旁置个人设置样本文件保持原值，未读取真实用户配置。

重复导入另由生产服务测试验证，不通过研究模型代替。旧练习 `strict-practice` 标为 framework-foundation-legacy，只读保留；新七点草稿采用 `foundation-structure-draft`，结构通过仍保留 DRAFT。七点新语义挑战服务端拒绝，已有会话可读取/恢复原题。assessmentReadyCodes 只有 REACT-01、VUE-01、JS-04、JS-05；这不是阅读或自主完成条件。

[旧导航映射](evidence/framework-route-implementation/legacy-navigation.json)分别保存 runtime `{code,week,order}` 与材料 `{id,batch,guide,anchor}`；生产 runtime 冻结为 legacy-route-map.ts，材料目录继续独立维护。code/ID 不改，不需要合并映射。降级时保留新增表和旧记录，停用新推荐即可；本轮未执行真实用户库升级或旧版本程序降级。

## 验证方法与证据

项目指定 pnpm 12.10.1 本机自切换报 `Unknown system error -8`；关闭自切换后的 10.11.0 被项目 engines 拒绝。未升级依赖或修改 packageManager，直接调用仓库已安装 Node、TypeScript、ESLint、Vitest、Vite 与 Playwright 入口执行相同检查。命令与结果见[检查日志索引](evidence/framework-route-implementation/checks.md)。

15 个 #7 输入输出案例已进入生产规划测试（STEP/outcome/next 均按原案例），并补充当前点缺失、多 LEARNING 稳定顺序、多焦点诊断、已学节点不追溯、阅读辅助、偏好 409/幂等、各消费者一致、图无环/跨框架门槛、人工边保留、重复同步及故障回滚。原研究案例没有 current.blockers 断言；生产在继续焦点时按合同补基础提示，测试单独验证，不把模型的 null blocker 当成禁止提示。

真实页面采用 global-setup 创建的工作副本独立 DATA_DIR，后端 42730、前端 42731，NODE_ENV=test、AUTO_BACKUP=false、禁 .env.local、空模型密钥。普通沙箱 Chrome 启动 SIGABRT；经自动审批允许的隔离 Chrome 运行后进行实际检查。截图、浏览器版本、视口及地址见 [pages.json](evidence/framework-route-implementation/pages.json)。初次页面检查发现恢复入口缺失、个人路线在旧说明下方，已经修正。历史 #7 截图不作为此次页面通过证据。

## 边界

本轮不验证七点新版整合夹具、真实 IME、VUE-07 独立 chunk、真实模型评分或教学效果。保留原有入口/异步代码、目录、复制、滚动、阅读阈值与导航检查。外链常规检查对三条网信办链接返回 fetch failed，不能宣称已核验其正文；其余结果以当轮检查日志为准。构建原有大 chunk 提示与预算结果分别记录，不把构建成功等同视觉验收。

## 2026-11-13 恢复检查点：尚未完成最终页面验收

当前开发状态为 blocked，保留实现，不提交代码。代码套件 server 265、web 51、shared 10、content-parser 18 项通过；加强后的规划/七点保护 29 项和笔记迁移单项另行通过。TypeScript、vue-tsc、ESLint、内容与体积检查、最终生产构建完成。没有把失败或中断的 pnpm 入口记成通过。

页面证据分段有效：`e2e-initial.txt` 的异步与入口 10 项通过；`e2e-route-and-experience-recheck.txt` 的前 27 项和新增路线项通过；修正旧题截图后 `e2e-focused-first.txt` 的新增路线项通过，已查看原题窄屏截图。截图属于本轮多次运行，后续运行可能覆盖已经走到的页面截图；pages.json 是最后完整成功路线运行的元数据，不能据此宣称之后整套回归成功。

未完成：学习闭环用例已改为显式开始 JS-02、显式准备 JS-01 基础，最终修改后尚未获得通过结果；其后的笔记、设置、窄屏等连续回归也未完成。多次运行在不同位置出现 15～29 分钟停顿、超时或浏览器会话关闭；临时 caffeinate 防闲置睡眠后仍失败（`e2e-awake.txt`：5 passed、2 failed、18 did not run），因此不能将原因确定为系统睡眠，也不能排除页面或执行环境问题。保留最后两处 trace 与 error-context 供定位。

恢复步骤：先检查本工作区和已有证据，不重复实现。使用稳定的隔离浏览器运行 `node node_modules/@playwright/test/cli.js test e2e/experience.spec.ts e2e/framework-route.spec.ts --grep-invert 'B0|B1|B2|B3|自建中文讲义'`（apps/web 目录），重点确认学习闭环及后续 12 项；定位真实失败后修复，不扩大超时或删除断言掩盖问题。最后汇总覆盖范围、检查截图并更新本报告，再交给独立验收。

## 2026-11-13 验收返工

本节接续上方历史检查点。修复 `deferBranch` 只刷新分支导致个人路线陈旧的问题：写入后读取当前详情与分支，再更新个人路线刷新版本；页面已切换时丢弃晚到响应，保持笔记编辑器及草稿。新增真实浏览器用例从 REACT-02 暂缓 JS-01，检查上方立即显示暂停、分支消失、生产路线为 PAUSED_PREREQUISITE、旧推荐为空，再进入 JS-01 恢复并返回，全程无需手动刷新。

两份旧 trace 的结构化分析见 [rework-trace-analysis.json](evidence/framework-route-implementation/rework-trace-analysis.json)：挑战创建与会话读取均为 200，点击停在元素稳定检查；相邻浏览器事件出现约 691 秒空档。阅读器的 WEB-01 链接点击已完成，后续详情相关 API 返回 200，但 5 秒元素等待跨越约 1025 秒。以上说明存在异常执行空档，不能据此确定系统睡眠或排除环境其他因素。本轮在相同 Chrome channel、原超时及原断言下，挑战恢复 7.1 秒通过，完整方向/阅读返回流程 13.9 秒通过；没有为这两处改产品逻辑或扩大超时。

定向首轮日志 [rework-focused-approved.txt](evidence/framework-route-implementation/rework-focused-approved.txt) 为 3 通过、1 失败：独立运行学习闭环时缺少之前用例设置的 NONE 偏好，找不到 JS-03 下一步。已在闭环自身显式准备方向和已完成焦点，不依赖用例顺序。普通沙箱 Chrome 启动 SIGABRT 另见 rework-focused.txt，不记为页面失败或通过。

### 2026-11-14 最终回归汇总

- `rework-full-e2e.txt`：52 项完整运行，43 通过、4 失败、5 未执行。失败 trace 与 error-context 保存在 `rework-full-failures/`，相邻事件最大空档分别约 595、959、949、925 秒（event-gaps.json）。不能将此批次记为整套通过。
- `rework-remaining.txt`：对上述四项失败、五项跳过，以及学习闭环与新增暂缓回归共 11 项分批复核，全部通过，1.1 分钟。命令为 `caffeinate -i node node_modules/@playwright/test/cli.js test e2e/experience.spec.ts e2e/framework-route.spec.ts e2e/framework-entry.spec.ts --grep '岗位创建|恢复数据必须|本地个人数据|窄屏下|未知地址|REACT-01 路线到|VUE-01 小节|独立方向|详情暂缓|连续闭环'`，在 apps/web 运行。仅临时阻止空闲休眠，未改系统设置、超时或产品断言；这次通过不足以证明先前停顿由休眠导致。
- 两批次合并覆盖全部 52 个用例，包括此前未执行的笔记、设置、数据预览、窄屏及导航流程，每项均有本轮通过记录。没有要求反复整套重跑来抹去失败；运行稳定性仍作为环境限制交独立验收参考。
- `rework-route-tests.txt`：生产规划器 29 项通过（工作副本隔离 SQLite）。`rework-types.txt`、`rework-lint.txt`：vue-tsc 与修改文件 ESLint 退出码 0。`rework-build.txt`、`rework-budget.txt`：最终 Vite 构建与体积预算通过，保留原有大 chunk 提示。`git diff --check` 通过。
- 本次返工仅改详情状态同步与 E2E 准备/证据记录，未改课程正文、服务端或迁移。全库单测、内容/链接检查与迁移比较沿用上方已记录的本 Issue 开发验证，未宣称在本次返工重跑。

实际执行条件仍为工作副本独立 DATA_DIR、42730/42731 测试端口、禁真实配置与自动备份、临时 Chrome 配置，未调用真实模型。Chrome 版本 157.0.8103.40；路线桌面 1440×1000、窄屏 390×844，暂缓详情默认 1280×720。最终路线截图和逐页地址以新增运行目录中的 pages.json/defer-pages.json 为准。异步阅读证据位于 `rework-full-reading-2026-11-13/`，入口补跑证据位于 `rework-entry-recheck-2026-11-14/`；它们分属明确批次，没有覆盖历史截图。已查看桌面与窄屏路线、阅读器、暂停原因、链完成、旧挑战原题，以及手机代码复制和目录焦点截图。

最终补拍批次：[pages.json](evidence/framework-route-implementation/run-2026-11-13T17-08-47-086Z/pages.json)、[暂缓详情元数据](evidence/framework-route-implementation/run-2026-11-13T17-08-47-086Z/defer-pages.json)。`rework-final-pages.txt` 为最终 framework-route.spec.ts 两项通过（25.9 秒）；旧练习检查强化为原答卷滚动到可见并断言可见，再截图，已人工查看原答卷、旧代码与旧输出。截图目录保留桌面、窄屏、暂停、链完成、旧练习与旧挑战各图。前一个成功补跑批次为 `run-2026-11-13T17-07-41-303Z/`，其中其余布局截图亦已人工查看。

返工实现与必要分批验证完成，交调度器进行独立验收及提交；未直接提交、推送或修改 automation。剩余限制：本机长时间整套浏览器运行仍可能停顿，根因未确定；未测试真实用户数据库、真实模型服务及教学效果。

## 2026-11-14 调度器第二次验证返工

恢复检查确认仍在 auto_coding、HEAD 为 ef7edbc，前次详情暂缓同步及其回归已经保留；调度器本身也通过了该用例，无需重复实现。本次仅修订 `b01-materials.spec.ts` 与 `ui-polish.spec.ts` 的定位范围，没有修改产品逻辑、学习记录或超时。

确定的两处失败原因：B01 导航已更名为“旧分组浏览”，测试仍使用“阅读路线”；搜索结果原来全页统计 option，新偏好 select 的四项混入 12 个结果，实得 16。改用正确导航名称和搜索 listbox 范围，保留所有数量、交互、阅读定位断言。

证据集中在 [scheduler-rework-2026-11-14](evidence/framework-route-implementation/scheduler-rework-2026-11-14/README.md)。调度器原始 `check-0` 至 `check-6` 日志已复制为可入库 txt：包构建、内容、链接、lint、单测与构建均通过；E2E 为 66 通过、8 失败、5 跳过，绝不记作整套通过。其余六处失败的 trace 事件空档约 44、45、601、905、954、956 秒；事件流、网络记录及错误上下文已保存。路线页容器仍由 App 包裹，未发现多根节点丢失容器问题；对应布局检查在本轮原断言下通过。上述空档不能确定为休眠或任何单一环境原因。

本轮 `focused-approved.txt`：18 项通过（2.1 分钟），覆盖 B01 四项、框架入口五项、个人路线两项、旧笔记候选稿一项、界面六项。普通沙箱启动 Chrome 失败记录在 focused.txt；获自动审批后的隔离 Chrome 才记作页面运行。本轮使用 Chrome 157.0.8103.51，原配置 42730/42731 测试端口、工作副本独立 DATA_DIR、禁真实配置及自动备份、无真实模型调用。

新路线页面与截图元数据：[pages.json](evidence/framework-route-implementation/run-2026-11-14T00-09-40-852Z/pages.json)、[暂缓详情](evidence/framework-route-implementation/run-2026-11-14T00-09-40-852Z/defer-pages.json)。已查看桌面阅读器、窄屏路线、暂停详情、旧练习原文截图。入口截图另存本批次 entry-pages；布局截图及地址/视口另存 ui-pages/pages.json，未覆盖旧证据。布局用例验证 1440/1024/390/320 四档宽度下九个页面的标题、无脚本错误、无页面级横向溢出；这是实际浏览器检查，不以构建代替。

`remaining-approved.txt`：7 项通过（36.5 秒），覆盖岗位创建/CSV、此前跳过的五项数据恢复与窄屏导航，以及学习闭环。两批共 25 项全部通过，与调度器已有的 66 项通过记录合并覆盖全部 79 项；本轮没有再次整套运行 79 项，不能宣称单次全量零失败。修改的两份 E2E 文件 ESLint 退出码 0，`git diff --check` 通过。未改生产实现，因此内容、单测、迁移与构建沿用调度器本次成功结果及之前明确标注的迁移证据，没有重复运行并冒称新结果。常规链接检查仍有 6 条网络暂不可确认，详见 check-2.txt。

本次返工已完成，交调度器独立验收及提交。剩余限制是长时间浏览器运行空档根因未确定，未验证真实用户数据库、真实模型和教学效果；不影响此次全部失败及跳过用例已有独立通过记录。

## 2026-11-14 第三次验收返工：答案顺序、状态隔离与最新覆盖

本节接续最新调度器 `deliveries/b80b96d5b1b447ac9dc54b5db46dc73e-3`，优先于上方历史“已完成”结论。该批次实际为 **21 通过、17 失败、41 未执行**；上方 66 项通过来自此前批次，不能抵消新失败。补跑之前已将最新 check-0 至 check-6、17 份 trace 与错误上下文保存到[第三次返工证据目录](evidence/framework-route-implementation/review3-2026-11-14/README.md)，之后每组使用独立输出目录。

### 答案保留原因与修改

[原始 trace 提取](evidence/framework-route-implementation/review3-2026-11-14/trace-analysis.json)显示：第一题已 PUT“最新答案一”，Vite 随后记录连接丢失、重连并重新加载页面；第二次 GET 由测试桩返回旧答案；提交阶段两个 PUT 已是旧答案；最后才发生评分错误及状态刷新。因此本次原失败不能证明评分后 `preserveAnswers` 覆盖了输入，覆盖已发生在评分前。连接为何断开未确定，也不以这一原因解释其他长停顿。

E2E 的 global-setup 现在先构建当前源码，再启动 Vite preview，避免开发热重载影响正在编辑的表单；没有使用旧 dist、修改产品保存行为或放宽超时。原“旧答卷刷新”测试条件保留，并增加提交前两题值、所有 PUT 内容、保存→锁卷→评分错误→GET 顺序与单次主文档加载检查。开始学习失败用例改为通过真实接口重置隔离进度、保存 NONE 偏好，并确认 current 为空、suggested 为 JS-01，不再依赖前一用例留下的状态。

生产答案保存单测 11 项通过，见 [assessment-unit.txt](evidence/framework-route-implementation/review3-2026-11-14/assessment-unit.txt)。首次浏览器执行因普通沙箱 Chrome 启动 SIGABRT 未进入页面；获准后原答案保留断言通过，但新计数把同页路由更新也算作加载，已修正为主文档请求计数。修正后 3 项通过；截图复核又发现弹窗离场动画，追加等待弹窗移除后在 routes 批次重拍。所有中间失败如实保留，不以最终通过覆盖历史文件。

### 当前页面证据

- [最新路线页元数据](evidence/framework-route-implementation/run-2026-11-14T07-27-49-266Z/pages.json)与[暂缓元数据](evidence/framework-route-implementation/run-2026-11-14T07-27-49-266Z/defer-pages.json)：Chrome 157.0.8103.51，桌面 1440×1000、窄屏 390×844，详情暂停默认 1280×720；已查看桌面阅读器、窄屏保留焦点、暂停、链完成、旧练习原文及旧挑战原题截图。
- [答案事件顺序](evidence/framework-route-implementation/review3-2026-11-14/routes/grade-answer-events.json)与[评分失败页面](evidence/framework-route-implementation/review3-2026-11-14/routes/assessment-save-挑战评分失败时保留新答案和明确错误-desktop-chrome/assessment-grade-after.png)：已查看截图，错误提示与两题新答案同时保留。保存失败手机截图、浏览器版本及实际 URL 也在 routes 目录。
- [交互组布局元数据](evidence/framework-route-implementation/review3-2026-11-14/interaction-pages/pages.json)：四档宽度、九页面无页面级溢出与脚本错误检查通过，桌面/手机学习台和矮屏弹窗图独立保存；已查看手机学习台图。
- 异步目录、代码复制/滚动、阅读阈值与入口补学返回的新截图只复制 routes 批次实际新生成的文件，位于 `review3-2026-11-14/routes-pages/`，没有把其他日期文件作为当次截图；已查看手机代码复制状态和横向代码容器。

本轮不改课程、生产服务、迁移、学习者数据或模型调用。最新调度器 check-0 至 check-5 的包构建、内容、链接、lint、单测和构建通过记录已随原日志保存；本次不冒称重跑这些全量检查。最新链接结果是 3 条网信办链接网络暂不可确认；此前记录中的 6 条属于旧批次。真实用户库、真实模型、长时间开发服务连接中断原因和教学效果仍未验证。

### 2026-11-15 交付前覆盖汇总

已复核保存的完成日志与 JSON，并重新生成[逐项覆盖映射](evidence/framework-route-implementation/review3-2026-11-14/coverage.json)：79 个原始用例中，本次有 59 个不同用例通过，最新 **17 个失败与 41 个未执行均已补齐，待补跑数为 0**。另外 20 项保留最新调度器原本通过的结果，不采用更早 66 项批次替代新失败。本轮没有再次进行 79 项全套运行，不能记为单次全量零失败。

| 批次证据 | 实际结果 |
| --- | --- |
| answers-final.txt/json | 3 项通过，包含独立状态准备后的开始失败检查 |
| interaction.txt/json | 8 项通过，涵盖竞态、导航与四档布局 |
| routes.txt/json | 11 项通过，含两项答案截图补拍与完整路线/旧记录流程 |
| materials-interrupted.txt | 中断前 7 项逐项通过；没有整组完成报告 |
| materials.txt/json（materials-resume.sh） | 仅补剩余 9 项，全部通过 |
| learning.txt/json | 23 项全部通过，涵盖挑战恢复、学习闭环、笔记与数据流程 |

以上共 61 次通过执行，答案两项重复复核，去重为 59 项。每批从新隔离库启动，使用当次源码构建的预览服务；最终复核专用端口均已释放。原始失败、中间计数断言失败、普通沙箱启动失败和中断记录全部保留。截图与元数据按批次独立保存，未覆盖旧图。

修改文件 ESLint、生产答案保存单测 11 项、构建体积预算和 `git diff --check` 通过；各浏览器批次启动前的当前源码 Vite 构建均成功。完整内容/链接、全库 lint/单测、服务端构建和迁移检查沿用上文明确标注的调度器或此前本 Issue 记录，不宣称本次重新运行。当前返工实现与必要验证完成，交调度器独立验收和提交；未直接提交、推送、修改 automation 或运行真实用户数据库迁移。

## 2026-11-20：休眠诊断后的恢复交付

本节是最新状态，接续第 4 批 **70 通过、9 失败** 的调度结果；上方 66 项、21 项及 59 项分批记录均为历史，不用来替代本次九项复测。恢复时分支 auto_coding、HEAD 为 4c49a7c，已有实现与返工均保留，未重做研究或修改产品行为。

九项现均有本轮通过证据：获准的隔离 Chrome 首批完成 5 项后执行中断，没有完整批次报告；恢复核对进程已结束后，仅补余下 4 项，全部通过（113.46 秒，含构建）。原断言和超时保持不变。普通沙箱 SIGABRT 的启动失败单独记录，不算业务结果。详情暂缓立即同步、阅读返回、方向切换保留焦点、旧记录读取、目录/代码复制滚动、阅读阈值、键盘操作及四档布局已按原用例完成。未再次运行 79 项全套，不宣称单次全量零失败。

原九个超时与睡眠对应的诊断见 [恢复报告](issue8-recovery-20261119.md)。本轮确认调度器 caffeinate 抑制空闲睡眠；新九份 trace 最大相邻事件间隔约 4.342 秒，没有复现 512～1066 秒停顿。独立 DATA_DIR、禁真实配置/备份/模型、端口 42730/42731 维持不变。global-setup 新增可选证据输出，保存服务输出和起止时间；中断首批的 teardown 服务日志未产生，此限制明确保留，其五份浏览器事件、网络和截图均已保存。

完整证据与逐项覆盖见 [本轮索引](evidence/framework-route-implementation/recovery-2026-11-20/README.md)。新图按批次保存，已实际查看桌面阅读器/路线、手机学习台、切换后的焦点、暂停、链完成、旧答卷/原题和代码滚动图；首批 Chrome 157.0.8103.51，恢复补跑结束后实测 Chrome 为 157.0.8103.79（版本证据在本轮索引），路线 1440×1000 / 390×844，布局检查另覆盖 1440/1024/390/320×900。独立产品经理的最终页面验收仍由调度器另起会话执行。

本轮生产规划器 29 项及真实旧 SQLite 迁移 1 项通过；shared/content-parser/server 的直接 tsc 编译、诊断代码 ESLint 及 git diff --check 通过。pnpm 自切换仍失败，原失败日志与直接工具替代命令均保留。全库内容/链接、lint、单测、生产构建预算使用第 4 批保存的成功日志，不声称本轮全量重跑；其中四条远程地址仍未确认。未验证真实用户库、真实模型、七点新夹具、真实 IME 或教学效果。

开发实现与必要恢复验证已完成，可交调度器独立验收和提交。未执行 commit/push、未修改 automation，也没有恢复默认双框架、批量改状态或放宽有效检查。

## 2026-11-20：第 5 批后的证据输出返工（当前状态）

第 5 批调度器日志已完整归档至 [scheduler5](evidence/framework-route-implementation/output-stability-2026-11-20/scheduler5/check-6.txt)：包构建、内容、链接、lint、单测与生产构建通过，页面为单次 **79 项全部通过（9.1 分钟）**。链接检查有 1 条网络暂无法确认，详见同目录 check-2.txt。该批最终仍未获交付：测试覆盖 docs 中迁移 JSON 并新增截图目录，触发版本一致性失败；没有交付提交。以上与第 4 批 70/9、此前分批结果分开记录。

本次只改两个测试的证据目的地，未改产品行为、课程范围、迁移/业务断言或超时：迁移 JSON 写到 `tmp/issue8-migrations/sample-*/migration.json`；路线截图与页面元数据写到 `testInfo.outputPath('evidence')`，随 Playwright 默认临时输出或显式 `--output` 目录保存。常规测试不归档 docs，选定证据需在调度器最终验证前手动归档，具体步骤见[本批索引](evidence/framework-route-implementation/output-stability-2026-11-20/README.md)。原 docs 历史文件保持原样。

本轮实际运行迁移 1 项通过、两项框架路线页面测试通过（1.3 分钟，包含构建）。普通沙箱首次 Chrome 启动 SIGABRT，两项均未进入业务断言；保留 pages.txt，获准沙箱外执行的成功记录为 pages-approved.txt。修改的两个测试文件 ESLint 与 git diff --check 通过。每次页面运行仍使用工作副本独立 DATA_DIR、42730/42731、禁真实配置/备份/模型；服务日志、浏览器版本、视口和页面路径已归档。

测试前后通过 `git ls-files --cached --others --exclude-standard` 枚举交付文件（包括未跟踪文件），逐文件比较 SHA-256：**3,844 → 3,844，新增 0、删除 0、内容变化 0**。原始清单与 comparison.json 在本批索引中。该比较覆盖迁移、两次页面执行和定向 ESLint；随后显式归档本批结果并更新文档属于交付准备，不属于测试副作用。常规验证没有自动复制步骤。

当前返工及必要定向验证完成，交调度器运行最终一致性检查、提交和独立验收；本轮不宣称重跑全量 79 项或已获产品经理最终验收。没有 commit/push，也未修改 automation 或版本一致性检查。真实用户数据库、真实模型及教学效果仍未验证。
