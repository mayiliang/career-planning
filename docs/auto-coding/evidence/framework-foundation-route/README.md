# Issue #7 研究证据

基线 81a7fb6，分支 auto_coding。初次采集 2026-11-10；请求复现、页面与片段复核 2026-11-11。仅工作副本数据；没有读取主目录数据库、个人配置或真实 AI 凭据。报告见 [路线合同](../../framework-foundation-route-contract.md)。

## 实际执行

| 命令/检查 | 结果与范围 |
| --- | --- |
| `node node_modules/vitest/vitest.mjs run --config docs/auto-coding/evidence/framework-foundation-route/capture.config.ts` | [capture.txt](capture.txt)：1 个采集测试通过，实际 import/练习服务/评分服务；三个练习 fetch 被拦截，三个挑战在 FakeProvider.grade 入口捕获后主动停止，无模型调用 |
| `node docs/auto-coding/evidence/framework-foundation-route/examples.mjs` | [examples.json](examples.json)：Vue 3.5.43 / Node 22.14.0，13 个正文独立 JS 片段全部输出等于原注释；不含两个 SFC、真实地图或 React 组件 |
| `node node_modules/typescript/bin/tsc -p apps/server/tsconfig.json` | exit 0，为启动本轮工作副本服务编译；不是完整产品测试或课程验证 |
| `node docs/auto-coding/evidence/framework-foundation-route/pages.mjs` | [pages.json](pages.json)：Chrome 157.0.8103.40，1440×1000，四个实际页面，另拍分支/阅读导航 |
| `node docs/auto-coding/evidence/framework-foundation-route/verify-contract.mjs` | [contract-check.txt](contract-check.txt)：研究方案参考模型的案例/无环/解析/链接检查，不测试生产规划器 |
| `git diff --check` | 交付前执行；无生产代码修改，不运行全套产品测试 |

复现先从仓库根运行。采集器复用 server test/setup.ts，在 `tmp/tests/server-<pid>-<worker>` 创建隔离 SQLite，自动迁移，禁用真实配置与备份。结构占位提交只为抵达发送边界，不是假造学习效果；请求头和 key 不写证据。[read-manifest.json](read-manifest.json) 记录七篇实际全文的 SHA-256 与行数。source-inventory 包含七点实际提取器返回的正文片段，catalog 为对应目录原值。legacy-route-map 为运行时索引快照，材料批次另见 catalog，不能把两者混用。

页面服务启动：

```sh
NODE_ENV=test CAREER_ATLAS_ENV_FILE='' AUTO_BACKUP=false DEEPSEEK_API_KEY='' DATA_DIR=tmp/issue7-browser PORT=42830 node apps/server/dist/index.js
# 在 apps/web 目录执行：
VITE_PROXY_TARGET=http://127.0.0.1:42830 node node_modules/vite/bin/vite.js --port 42831 --strictPort
# 回仓库根：
node docs/auto-coding/evidence/framework-foundation-route/pages.mjs
```

应先确认测试端口空闲；本次服务启动 strictPort/独立后端成功。页面全新导入库，没有真实记录。只导航和滚动；阅读器可自动记录该测试库的阅读进度。截图记录 current 页面，不代表新方案已实现。

## 页面证据

- [学习台](today.png)、[文本](today.txt)：无焦点，首项 JS-01，旧“求职优先路线”文字仍在。
- [路线入口](plan.png)、[完整页面文本](plan.txt)：双框架入口、异步试点和旧批次说明。
- [REACT-02 详情](detail.png)、[分支](detail-branches.png)、[文本](detail.txt)：默认建议 VUE-03。
- [正文阅读器](reader.png)、[同组导航](reader-navigation.png)、[文本](reader.txt)：使用实际 `.md` 路径；B05 前后篇不表示依赖。

## 请求和模型样本

- [REACT-04 练习](REACT-04-practice-request.json)、[挑战](REACT-04-challenge-request.json)
- [VUE-02 练习](VUE-02-practice-request.json)、[挑战](VUE-02-challenge-request.json)
- [VUE-04 练习](VUE-04-practice-request.json)、[挑战](VUE-04-challenge-request.json)
- [七点题源/硬边](source-inventory.json)、[目录](catalog.json)、[旧运行时顺序](legacy-route-map.json)
- [路线输入输出](route-cases.json)、[迁移样本设计](migration-samples.json)

真实模型语义、其他四点发送边界、整合组件夹具、IME 和 SQLite 新迁移均未验证。Provider 输入有随机 session/question ID，仅来自隔离库；采集器重跑会更新它们，不应把随机 ID 当合同差异。

## 失败与修正记录

1. `pnpm exec` 未能启动项目指定 pnpm 12.10.1（本机 pnpm 自切换二进制错误），改用已安装的 Node/Vitest/TypeScript 入口，未修改 packageManager 或依赖。
2. 第一次练习捕获未抵达 fetch，因为研究占位没有满足 profile 栏目与 fixedInput/expected/actual 结构条件。补齐结构占位后实际触发三次请求；没有绕过生产门禁或声称占位答案正确。
3. 沙箱内 Chrome 启动 SIGABRT，允许隔离浏览器执行后可运行。一次全页详情截图超时，改为视口截图并单拍相关分支/导航。
4. 第一次阅读 URL 漏 `.md`，返回“学习资料路径无效”；修正为应用实际格式后重新采集。错误截图未作为正文成功证据保留。

脚本只用于本次研究复现，存放 docs 证据目录，不进入产品测试或运行入口。不修改 automation，不执行 commit/push。

## 2026-11-11 验收补证

`capture.txt`、`contract-check.txt` 保存上一轮本地 `.log` 的真实内容（capture 仅移除文件末尾空行以通过差异格式检查），未重新捕获请求；其中 23 条链接为旧检查范围。新增检查结果见 [contract-check-rework.txt](contract-check-rework.txt)。

校验器现在同时检查研究报告和本索引的本地 Markdown 文件链接：目标必须存在且位于 Git 索引中（已提交或已暂存），未跟踪或被忽略的本地文件不能通过。新增证据需先纳入索引再运行；索引检查不等于已提交，最终提交由调度器完成。外部 URL 与页面锚点不属于本次文件检查范围。
