# Issue #8 恢复验证（2026-11-20）

本目录承接第 4 批调度结果，保留独立偏好与有限已审路线的已有实现。没有修改产品行为、课程、断言或超时。本轮仅给 global-setup 增加可选服务日志/运行元数据输出，另保存诊断与页面证据。

## 批次边界

- `scheduler4/check-0.txt` 至 `check-6.txt` 是 2026-11-15 调度原日志：前六项通过；E2E **70 通过、9 失败**。九个失败的原错误上下文和解压 trace 在同目录对应子目录；另外保留该次已有答案页面附件。
- `focused-sandbox/`：九项全部在 Chrome 启动时 SIGABRT，未进入业务页面，不记作业务验证。保留启动失败与服务日志。
- `focused-approved/runner.txt`：获自动审批后，前三项框架入口和两项个人路线 **5 项逐项通过**，分别为 7.5、8.5、6.3、14.7、2.9 秒；随后执行中断，没有最终 JSON 或 teardown 服务日志。恢复于 06:03（北京时间）确认进程不存在；不能宣称整批九项通过，也不推定中断原因。五份完整 trace 已从独立输出目录解压保存，未重复运行。
- `remaining-approved/`：只补余下四项侧栏、键盘搜索、打卡失败重试、四档布局，**4 项通过，0 失败/跳过**，完整批次含构建 113.46 秒。原 30/60 秒用例超时不变。服务起止时间、独立 DATA_DIR 和端口在 services.json；backend.txt/frontend.txt 为实际服务输出。
- [coverage.json](coverage.json) 将九项逐项映射至本轮执行，并保留不同批次属性。最新调度的 70 项成功与本轮九项补跑构成覆盖；不是单次 79 项全量通过，不采用更早 66 项或 21 项批次抵消新失败。

## 执行与诊断

[run.py](run.py) 保存命令、独立输出目录、JSON 报告与解压后的全部浏览器事件/网络/截图资源。命令默认选九项；本次恢复传入 `侧栏可收起|搜索键盘选择|打卡可搜索前 60 项|主要页面适配` 只选余下四项。运行方先构建共享包/解析器/服务端，globalSetup 对当前前端源码执行 Vite build 后启动 preview。服务端 NODE_ENV=test、空真实配置入口、AUTO_BACKUP=false、空模型密钥；42730/42731 测试端口，DATA_DIR 在工作副本 tmp/e2e。没有访问个人数据库或调用真实模型。

[休眠诊断](../../../issue8-recovery-20261119.md)解释原九份 trace 的 511.7～1065.9 秒空档与睡眠/唤醒对应关系。power-assertions.txt 与 power-assertions-resumed.txt 确认调度器本轮有 caffeinate 空闲睡眠抑制。恢复后九份 trace 的相邻事件最大间隔为 4.342 秒，未复现数百秒停顿。统计由 [summarize.py](summarize.py) 对各 trace 的单调时钟事件去重排序生成，不把两次运行之间的人工中断当成页面事件空档，也不承诺手动睡眠或合盖后仍可运行。

## 页面复核

首批由用例记录 Chrome 157.0.8103.51，原 channel=chrome；恢复间隔后 Chrome 已更新，补跑结束以同一 channel 新建临时浏览器实测为 157.0.8103.79（remaining-approved/browser-version.json），两批不混用版本。路线截图及逐页地址/视口见 [pages.json](../run-2026-11-19T17-20-04-332Z/pages.json) 与 [defer-pages.json](../run-2026-11-19T17-20-04-332Z/defer-pages.json)。已实际查看桌面阅读器/路线、窄屏保留焦点、暂停原因、链完成、旧练习原文与旧挑战原题；本批目录与代码复制/滚动证据在 focused-approved/framework-entry-evidence。阅读定位不增加整篇进度、切换不清零阅读、不自动改变学习状态由原生产接口断言验证。

[布局元数据](remaining-approved/ui-review/pages.json)对应 1440/1024/390/320×900、九页面标题/无脚本错误/无页面横向溢出检查；桌面与手机学习台截图独立保存，已查看手机全页图。固定导航与浮动入口会覆盖截图中的视口边缘，页面可滚动；未发现推荐选择或历史原文被截断不可用。合成 composition 守卫通过不等于真实 IME 验收。

此前 tmp 中的截图在复跑前备份至 previous-*，仅作历史保全；本轮图片按修改时间筛选复制，没有当作本轮新截图使用。

## 代码检查与边界

[checks.json](checks.json)记录命令和返回码。pnpm build:packages/build:server 因 12.10.1 自切换 `Unknown system error -8` 失败；直接调用已安装 tsc 完成 shared、content-parser 和 server 编译。生产规划器 29 项与真实旧库迁移 1 项通过，见 [route-migration.txt](route-migration.txt) 与 [migration.json](migration.json)。新增诊断代码 ESLint 返回 0。

全库内容、链接、lint、单测、生产体积预算沿用明确保存的调度第 4 批 check-0～5，没有声称本轮重跑。四条远程链接仍属该批网络未确认项。未测试真实用户库、真实模型、七点新版夹具、真实 IME 或教学效果。独立产品经理最终验收及提交由调度器执行；本开发会话不替代独立验收，未提交或推送。
