# 调度器第二次验证返工证据

日期：2026-11-14。所有页面使用工作副本独立测试数据，不读取用户数据库或调用模型。

- `check-0.txt`～`check-6.txt`：原调度器日志副本；前六项通过，最后 E2E 66 通过、8 失败、5 跳过。
- `trace-gaps.json`：八份失败 trace 的最大相邻事件空档（毫秒）。同名测试子目录保留原 trace ZIP 中的 `.trace`、`.network` 事件流与 error-context.md；未保存 ZIP 的图片资源，不能用这些文件冒充完整可回放 ZIP。
- `focused.txt`：普通沙箱 Chrome 启动失败，不记为产品页面验证。
- `focused-approved.txt`：18 项通过。命令（apps/web）：`caffeinate -i node node_modules/@playwright/test/cli.js test e2e/b01-materials.spec.ts e2e/ui-polish.spec.ts e2e/framework-entry.spec.ts e2e/framework-route.spec.ts e2e/note-candidate.spec.ts`。
- `remaining-approved.txt`：7 项通过。命令（apps/web）：`caffeinate -i node node_modules/@playwright/test/cli.js test e2e/experience.spec.ts --grep '岗位创建|恢复数据必须|本地个人数据|窄屏下|未知地址|连续闭环'`。
- `lint.txt`：两份修改 E2E 文件执行本地 ESLint，退出码 0，无输出。
- `entry-pages/`：focused 批次的入口阅读、练习、目录与代码截图，以及各入口浏览器元数据。
- `ui-pages/`：focused 批次桌面/手机学习台、矮屏打卡截图，地址和视口见 pages.json。
- 路线、暂缓与历史记录截图及元数据位于相邻 `run-2026-11-14T00-09-40-852Z/`。

未提高超时、取消有效断言或修改运行器。临时 caffeinate 只作用于测试进程，并不能据此确定旧空档的原因。两批通过不是单次全套通过。
