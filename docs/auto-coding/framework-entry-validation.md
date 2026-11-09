# 框架入口验证记录

实施范围：Issue #6，REACT-01 / VUE-01；日期：2026-11-09（Asia/Shanghai）。实现等待调度器与独立产品经理验收。本次没有提交、推送或改动 automation/，没有读取原主目录数据库或真实模型配置。

## 环境与复现

- Node v22.14.0；工作副本内 pnpm 12.10.1 原生二进制。系统 pnpm 启动器缺少可执行目标，故用 `PATH="$PWD/tmp/framework-bin:$PATH"` 指向副本已有工具；项目 package.json / pnpm-lock.yaml 未改。
- 正文工程：React / React DOM 19.2.0，Vue 3.5.43，Vite 6.4.4，TypeScript 5.7.3；Vue 插件 5.2.4，vue-tsc 2.2.12。实际依赖见 [React 锁文件](evidence/framework-entry/react-package-lock.json) 与 [Vue 锁文件](evidence/framework-entry/vue-package-lock.json)。不是 latest 版本声明。
- 浏览器：Google Chrome 156.0.8078.76，Playwright；页面桌面 1440×1000，移动 390×844；独立工程默认 1280×720。
- 单测由 `apps/server/src/test/setup.ts` 设置 `DATA_DIR=repository/tmp/tests/server-<pid>-<worker>`，禁用 AUTO_BACKUP 与真实环境配置。E2E 由 globalSetup 建立 `repository/tmp/e2e/career-atlas-e2e-*`，使用 42730/42731，结束后清理；无真实模型 key。
- 示例工程只写 `tmp/framework-entry-examples/{react,vue}`，使用 42742/42743/42744。Chrome 使用临时 profile。沙箱内 Chrome 启动被 OS 拒绝，自动审批允许后以相同隔离配置执行；未使用个人浏览器 profile。

复现示例：运行 `node scripts/extract-framework-entry-examples.mjs`；两个目录各执行 `npm install`（或复制已保存锁文件后 `npm ci`）；然后运行 `node scripts/verify-framework-entry-examples.mjs`。脚本从实际 Markdown 提取命名代码块，并按正文明确要求的替换组合 Vue 最终工程，不另外维护一套组件答案。每次变异后恢复文件，最后构建恢复后的正确版本。

## 已执行的检查

| 命令 / 检查 | 结果 | 持久证据 |
| --- | --- | --- |
| `pnpm content:check` | 通过：内容合同 14 项；160 份资料前置无环/无传递重复；122 个 TS 示例；388 个通用示例结果；发音清单 | [内容日志](evidence/framework-entry/content-check.txt) |
| `pnpm lint` | 通过，含模块边界与各包 ESLint | [静态日志](evidence/framework-entry/lint.txt) |
| `pnpm test` | 313 项通过：shared 18、parser 10、server 234、web 51 | [单测日志](evidence/framework-entry/test.txt) |
| `pnpm build` | 通过；首屏 JS 272.2 KiB / CSS 30.0 KiB，预算通过；保留已有大 chunk 提示 | [构建日志](evidence/framework-entry/build.txt) |
| `pnpm content:links` | 未全通过，1528 个本地链接无失效；外链批量检查与单独打开的结果有差异，详见下文 | [链接复查日志](evidence/framework-entry/content-links-recheck.txt) |
| `playwright test e2e/framework-entry.spec.ts e2e/async-pilot.spec.ts e2e/async-navigation.spec.ts` | 14 项通过，含异步链及异步导航 10 项 | [联合回归](evidence/framework-entry/e2e.txt) |
| `playwright test e2e/framework-entry.spec.ts` | 补充已学前置状态、强化返回后正文与截图等待后，5 项通过 | [入口最终回归](evidence/framework-entry/e2e-entry-final.txt) |
| `node scripts/verify-framework-entry-examples.mjs` | 正确工程、变式与代表性错误均符合预期 | [完整结果](evidence/framework-entry/examples-results.json) |

第一次内容检查发现缺少题源标签、评估边界、站内路径前缀和独立 JS 示例输出标注，均修正正文，不删除检查。前置递归检查促成了 JS-06 门槛的重新审读，理由见入口合同。初始组件回归曾被 Vite 配置重启触发的旧页 reload 干扰，改用关闭旧开发页后的独立生产预览检查；保留原错误断言。截图复核曾发现返回时拍到上一页和页面过渡中的浅色内容，增加当前文章标题与动画结束等待后重拍，不将旧截图当作入口验收证据。

## 实际运行结果

React 在 Strict Mode 下验证：单事件值式 1、函数式 3；独立三次点击 1/2/3；同次预约后先加三再释放，值式 3/1/1、函数式 3/4/5，两个 callback snapshot 均为 0。初始值 10 的对应结果为 11、13、11/12/13、13/11/11、13/14/15。将 updater 错改为闭包替换后结果为 1，无法通过正确序列。纯度片段验证原数组污染与两次输出差异；没有真实毫秒竞争，也没有固定 render 次数断言。

Vue 验证开发与生产预览都显示两张独立卡片；公开配置 /api 与 false；第一张展开不影响第二张。第二张 30→45 变式保持第一张 25。删 scoped 后外部标题被命中；错 mount 有空白页和警告；删 Vite alias 时类型通过而构建失败；删公开地址后生产页抛明确错误；minutes 错填字符串时类型检查失败而构建可通过。恢复后类型、构建和生产页面再次通过。

这些是确定性工程与组件验证，不等于 AI 已准确理解每种错误。站内 Worker 不运行 SFC/React DOM，正文已明确项目源码与浏览器结果应作为提交证据，站内断言只能补充核对。

## 请求正文与历史兼容

两个入口各选取 12 个完整机制小节：React 13,328 字符，Vue 12,578 字符，均低于 24,000 预算。捕获包含实际系统提示、任务、固定输入、材料正文、完整性标记与来源锚点：

- [React 练习请求](evidence/framework-entry/REACT-01-practice-request.json)、[Vue 练习请求](evidence/framework-entry/VUE-01-practice-request.json)：拦截真实 fetch 请求体，返回明确标记的模拟响应。
- [React 挑战评分请求](evidence/framework-entry/REACT-01-challenge-request.json)、[Vue 挑战评分请求](evidence/framework-entry/VUE-01-challenge-request.json)：经过实际评分服务，在 Provider 边界捕获后停止，没有调用模型。
- 小预算与缺少主源时验证结构降级、未发送请求和挑战拒绝。完整章节逐字属于正文，代码围栏完整；没有用关键词数量替代覆盖断言。
- 每个入口构造旧草稿、已完成挑战、原题/评分、笔记、42% 阅读、掌握级别、当前焦点、打卡和暂缓基础，重复导入及关系同步两次，核对身份和记录不变。旧练习只读且显示原合同，新练习另存；新版挑战仅存一份机制快照，缺失快照拒绝重评。

未启用真实模型，没有购买 API。模拟评分结果不构成语义验收或学习效果证明。

## 页面与视觉复核

实际路径为 `/plan` → 框架详情 → 讲义 → WEB-01 补学 → 返回 → 练习。覆盖未开始、学习中、已暂缓、已学完前置；查看不改焦点和暂缓状态。目录 Enter 跳转能聚焦标题，小节查阅不增加整篇完成；读到末尾只完成阅读，知识点状态与掌握级别保持。移动页无整页横向溢出，长代码可横向滚动，复制内容与 pre 一致；外链保留新窗口与 noopener。React 阶段说明采用正文文本流程，Vue 入口采用逐文件链路，本次没有新增需要外部渲染器的图示。

已打开截图审阅：入口名称、前置用途与状态清楚；正文标题和目录可读；移动长代码保留横向滚动；练习能到达题干和提交区。

- [React 桌面讲义](evidence/framework-entry/REACT-01-reader-desktop.png)、[Vue 桌面讲义](evidence/framework-entry/VUE-01-reader-desktop.png)
- [React 移动代码](evidence/framework-entry/REACT-01-mobile-code.png)、[Vue 移动代码](evidence/framework-entry/VUE-01-mobile-code.png)
- [React 练习](evidence/framework-entry/REACT-01-practice.png)、[Vue 练习](evidence/framework-entry/VUE-01-practice.png)、[路线入口](evidence/framework-entry/framework-plan.png)
- [React 实验页面](evidence/framework-entry/react-fixture.png)、[Vue 实验页面](evidence/framework-entry/vue-fixture.png)
- [React 浏览器与状态](evidence/framework-entry/REACT-01-browser.json)、[Vue 浏览器与状态](evidence/framework-entry/VUE-01-browser.json)

未执行全站全部 E2E，只执行受影响入口、异步学习链与异步导航。历史通过记录没有替代本轮检查。

## 外链与剩余限制

首轮两次批量链接检查都把范围外 ARCH-03 引用的 [AWS transactional outbox](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html) 报为 404；2026-11-09 通过浏览工具单独打开同一 URL 能取得完整正文。首轮未改写链接，第二次另有 8 个网络无法确认项（含不同 query 的 URL），具体地址保存在链接日志；这些不作为已读来源。调度器随后再次确认该 404 阻断，修复与最新结果如下。

### 2026-11-10：调度器链接失败修复

- 继续原工作区与 `auto_coding` 分支，保留框架入口实现。本次只修复引用并补充记录，不改检查器、应用逻辑或测试断言。
- 直接 Node fetch 对旧 AWS URL 的 HEAD / GET 均返回 404；官方英文地区入口与 PDF 在当前环境同样返回 404，浏览工具可读不能替代实际检查通过。
- 改为原文档 GitHub repository 一节直接指向的 [AWS 官方示例仓库](https://github.com/aws-samples/transactional-outbox-pattern)。已读 README 的 Intent、Motivation、Issues and Considerations、Implementation，保留双写、重复消息、幂等职责的阅读用途；不要求部署。该页面未标发布版本，本次核验日期为 2026-11-10。带检查器 Range / User-Agent 的直接 GET 返回 206。
- `PATH="$PWD/tmp/framework-bin:$PATH" pnpm content:links` 退出 0：锚点测试 3 项通过，1528 个本地链接无失效，913 个远程链接中 906 个可访问（含 1 个访问受限），0 个明确失效，7 个网络暂无法确认。完整地址见 [本次链接日志](evidence/framework-entry/content-links-fix.txt)，常规模式通过不代表严格模式通过。
- `PATH="$PWD/tmp/framework-bin:$PATH" pnpm content:check` 退出 0：14 项内容测试、160 份资料结构、122 个 TS 示例、388 个通用示例及发音清单通过，见 [本次内容日志](evidence/framework-entry/content-check-fix.txt)。`git diff --check` 通过。
- 此次仅调整参考链接与说明，未重跑 lint、全套单测、构建或浏览器验证；前文对应证据属于首次实现阶段，最终全套复验由调度器继续执行。

全局框架交错路线、VUE-07 独立 chunk 的固定产物合同、真实模型输出和实际学习效果仍未验收，均不在本次实现完成声明中。路线接口与后续依赖审查建议见 [入口合同](framework-entry-contracts.md)。

### 2026-11-10：调度器第二轮 E2E 失败修复与全站复验

- 已读调度器 `1ea084c2e8be4184ad42ce584ca7e9f7-2/check-6.log`。其余六项检查已通过，本轮保留已有实现，集中处理两处 E2E 失败。
- 路线断言改为核对 WEB-01 唯一补学分支、硬前置标记及查看按钮，符合入口合同；没有恢复直接推荐 VUE-01 的旧产品假设。
- 阅读器由 App 按路径重建，但旧实例还监听全局路由参数并重复加载。移除这层监听，正文就绪身份固定到实例路径，异步完成后拒绝离场实例报告新路径就绪。B01 回归新增去程一次、返回累计两次的正文请求检查，原后退位置小于 8 像素与目标可见断言均保留。
- 调度器的 493 像素偏差在独立运行及修复前重复运行中未稳定复现（重复运行期间末尾代码已有修改，因此不把这组结果作修复前基线）；本次不声称已经证明该偏差唯一根因。最终完整回归验证修复后的实际行为，不使用失败重试。
- `PATH="$PWD/tmp/framework-bin:$PATH" pnpm test:e2e`：**77 项全部通过，0 跳过，耗时 7.0 分钟**，覆盖两处原失败、上轮跳过的 13 项、异步链和两个框架入口。[完整日志](evidence/framework-entry/e2e-fix.txt)。Chrome 156.0.8078.76，沿用 globalSetup 的独立 DATA_DIR、42730/42731 端口、禁用真实配置与自动备份；沙箱内 Chrome 启动失败后经自动审批使用隔离临时 profile 运行。
- `pnpm --filter @career-atlas/web lint`、`pnpm --filter @career-atlas/web exec vue-tsc --noEmit`、`pnpm --filter @career-atlas/web test`（51 项）、`pnpm --filter @career-atlas/web build` 均退出 0；`git diff --check` 通过。[lint](evidence/framework-entry/lint-fix.txt)、[类型检查](evidence/framework-entry/typecheck-fix.txt)、[单测](evidence/framework-entry/unit-fix.txt)、[构建](evidence/framework-entry/build-fix.txt)。构建保留已有大 chunk 提示，体积预算通过。
- 已打开本轮 [B01 桌面截图](evidence/framework-entry/b01-return-fix-desktop.png)（1440×1000）复核正文、目录与阅读入口显示；截图不用于证明滚动坐标，坐标和键盘定位以浏览器断言为据。本轮未修改学习正文或服务端，未重跑已由调度器通过的内容、外链及服务端单测；未调用真实模型。独立产品验收仍由调度器后续会话完成。
