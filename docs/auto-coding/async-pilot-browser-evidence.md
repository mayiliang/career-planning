# 异步学习链浏览器验收

2026-10-31，macOS 上的真实 Google Chrome **156.0.8078.76**，Playwright `desktop-chrome` 项目。桌面视口 1440×1000；手机布局视口 390×844（同一 Chrome 引擎，非真实手机设备）。最终执行结果：**5 passed (30.4s)**。

## 环境与复现

在 `apps/web` 执行：

```sh
node node_modules/@playwright/test/cli.js test e2e/async-pilot.spec.ts --workers=1
```

用例见 [async-pilot.spec.ts](../../apps/web/e2e/async-pilot.spec.ts)。使用已有 global setup 启动工作副本构建的后端和 Vite，专用端口 42730 / 42731；每次运行在工作副本 `tmp/e2e/career-atlas-e2e-*` 创建独立 DATA_DIR，退出后清理。`NODE_ENV=test`、`CAREER_ATLAS_ENV_FILE=''`、`DEEPSEEK_API_KEY=''`、`AUTO_BACKUP=false`，未加载真实环境文件、个人数据或备份。Chrome 在沙箱中启动 SIGABRT，获自动审查许可后在沙箱外执行同一隔离用例。

完整最终输出留于工作副本 `tmp/async-pilot-evidence/playwright.log`；浏览器版本和路径见 [环境记录](evidence/async-pilot/browser-environment.json)，30 个从三篇正文提取的示例实际输出见 [浏览器示例记录](evidence/async-pilot/browser-examples.json)。

## 真实断言与结果

| 验收范围 | 实际检查及结果 |
| --- | --- |
| 正文代码 | 提取 PREJS-07、JS-04、JS-05 共 30 个带 example 标记的代码块，在 Chrome 页面内执行，逐项比对全部标注输出；无异常，全部一致。包含并发任务组的启动顺序、取消槽位与资源归零输出。 |
| 完整路径 | `/plan` → JS-04 详情 → JS-04 讲义 → 正文 PREJS-07 链接 → “返回上一页”回 JS-04 → 连续阅读跨 B02/B03 到 JS-05 → 详情与练习；练习显示本点固定任务组预期 `cancelled,fulfilled,cancelled,skipped,skipped`。 |
| 目录与键盘 | 在未达 80% 的 JS-04 记录上，以键盘 Enter 打开并发小节；标题取得焦点，定位距视口顶部约 96px，等待保存周期后整篇进度不变。手机目录点击后关闭，并将焦点交给目标标题。 |
| 小节直达与阅读 | 在未达 80% 的 JS-05 记录上直达末尾附近小节，进度不变；点击“从头阅读”再滚到末尾，资料标记看完，知识点 learningState、masteryLevel、currentFocus 均与此前一致。这里检查滚动阈值行为，不声称证明用户理解。 |
| 暂缓与当前点 | 在隔离数据中选择 JS-05 为当前点、暂缓 JS-04，学习台解释“JS-04 已暂缓”；查看详情和讲义后 JS-04 保持 DEFERRED 及原原因，JS-05 保持当前点。 |
| 手机代码与表格 | 390px 页面无整体横向溢出；点击复制后读取 Chrome 剪贴板并与完整代码文本逐字比较；代码和组合方法表格均可在局部横向滚动。 |
| 链接 | 上述站内链接均实际点击到达；JS-05 正文外链逐项检查 `_blank` 和 `noopener`。外网可达性由单独的链接核验负责。 |

## 精选截图

以下七张是最终通过运行生成的原始截图，均通过图像查看工具实际打开检查。桌面机制标题有可见焦点框；手机表格和代码宽内容限制在局部滚动区，正文和底部导航保留在视口内。

| 页面 / 状态 | 截图 |
| --- | --- |
| `/plan` 异步链入口与待补基础 | [桌面路线](evidence/async-pilot/plan-desktop.png) |
| PREJS-07 补基础讲义 | [桌面前置短文](evidence/async-pilot/prejs07-desktop.png) |
| JS-04 并发机制、目录查阅及键盘焦点 | [桌面机制](evidence/async-pilot/js04-mechanism-desktop.png) |
| JS-04 手机代码复制成功 | [手机代码](evidence/async-pilot/js04-code-mobile.png) |
| JS-04 手机组合方法表格 | [手机表格](evidence/async-pilot/js04-table-mobile.png) |
| JS-05 固定任务组练习 | [桌面练习](evidence/async-pilot/js05-practice-desktop.png) |
| JS-05 阅读完成提示、返回与引用入口 | [桌面阅读完成](evidence/async-pilot/js05-reading-complete-desktop.png) |

## 修正与证据边界

本次续验修正了测试的表格严格定位、返回后主锚点就绪判定、截图 URL 解码；把进度用例移到完整路径之前，并断言初始进度低于 80%，避免完成记录掩盖目录行为。增加真实剪贴板内容及表格局部滚动检查。已保留并核对前端已有的阅读/学习状态分离、暂缓解释和连续阅读改动。

早期用例使用 URL.pathname，把三张测试截图误写到了含字面 `%20` 的平行路径 `/Users/bob/Library/Application%20Support/CareerPlanningAutoCoding/repository/tmp/async-pilot-evidence/`。该处仅为本次生成的 `js04-code-mobile.png`、`js04-mechanism-desktop.png`、`js05-practice-desktop.png`；未扩大工作目录清理。本文引用的截图均已使用 fileURLToPath 在正确工作副本内重新生成。

本组 E2E 验证页面与浏览器行为、正文示例输出和练习题展示，没有调用真实模型或提交评分；不将结构检查、模拟响应或示例运行写成真实模型语义评分、真实手机覆盖或学习效果验证。

## 2026-11-01 调度器回归修复证据

定向复测命令 `pnpm --filter @career-atlas/web exec playwright test e2e/assistant.spec.ts e2e/async-pilot.spec.ts e2e/assessment-save.spec.ts`：**15 项全部通过（1.0 分钟）**，日志 `tmp/async-repair-targeted.log`。本次重新执行了上表全部异步链路径和正文示例检查；助手响应仍为模拟，不是模型质量验收。

目录用例现明确区分“焦点滚动”和“小节跳转”：键盘聚焦屏外目录按钮会让浏览器滚动，可能记录少量正常阅读进度；等这次防抖保存落库后，按 Enter 跳转小节，进度必须严格保持不变。此前取基线过早，误把正常焦点滚动产生的 5% 记作小节跳转增加。选区用例使用实际正文，先断言拖动产生非空选区，再检查按住鼠标时没有提示、释放后出现提示。

Chrome 156.0.8078.76，实际查看下列截图。挑战使用模拟会话及保存/评分失败响应，验证真实页面布局、点击和最新答案保留；截图时页面为 `/assessment/00000000-0000-4000-8000-000000000011`。

- [手机提交栏，390×844](evidence/async-repair/assessment-save.png)：提交按钮与助手、底部导航分离，真实点击后验证保存失败不丢答案。[几何与浏览器记录](evidence/async-repair/assessment-save.json)。
- [桌面提交栏，1280×720](evidence/async-repair/assessment-grade.png)：提交按钮下缘 610px，助手上缘 642px，真实点击后验证评分失败不丢答案。[几何与浏览器记录](evidence/async-repair/assessment-grade.json)。

B01 换篇与后退恢复在本轮串行全套复测中通过，旧正文就绪标记已在换篇时撤销。助手新增“打开后才释放页面响应”回归，通过后上下文显示实际知识点标题，避免固定延时快照漏掉迟到正文。
