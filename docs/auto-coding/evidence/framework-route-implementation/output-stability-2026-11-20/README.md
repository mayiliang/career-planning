# 第 5 批后的输出稳定性验证

本目录为开发者显式归档的固定批次，测试不会写入此目录。

- `scheduler5/check-0.txt` 至 `check-6.txt`：调度器第 5 批原日志，79 项页面单次全部通过；因验证写入交付文件，仍未交付。日志源为 deliveries/b80b96d5b1b447ac9dc54b5db46dc73e-5，只改扩展名以便纳入仓库。
- `migration.txt`、`migration.json`：本轮迁移 1 项通过，包括旧字段比较、故障回滚与重复迁移；JSON 从本次 sample-4tKsD2 显式复制。
- `pages.txt`：普通沙箱 Chrome 启动 SIGABRT，未进入业务断言。
- `pages-approved.txt`：获准沙箱外运行，两项通过，保留原断言和超时。
- `results-approved/`：本次桌面、窄屏、暂停、链完成及旧记录截图，分别位于两项用例的 evidence 子目录；pages.json/defer-pages.json 保存浏览器版本、路径、视口。
- `services-approved/`：隔离服务输出与起止时间；DATA_DIR 为工作副本临时库，结束后已清理。
- `web-lint.txt`、`server-lint.txt`：两个修改文件 ESLint 退出码均为 0（无输出）。
- `before.json`、`after.json`、`comparison.json`、`manifest.py`：相同 3,844 个交付文件的 SHA-256；新增、删除、变化均为 0。清单包括 Git 已跟踪及未忽略未跟踪文件；没有额外排除 docs。临时结果、构建、依赖沿用现有 .gitignore，未改忽略规则。

## 常规验证命令

从 apps/server 执行：

```sh
node node_modules/vitest/vitest.mjs run src/db/framework-route-migration.test.ts
```

从 apps/web 执行（该相对输出目录位于工作副本 tmp）：

```sh
CAREER_ATLAS_E2E_EVIDENCE_DIR="$PWD/../../tmp/issue8-output-stability/services-approved" \
  caffeinate -i node node_modules/@playwright/test/cli.js test \
  e2e/framework-route.spec.ts --output=../../tmp/issue8-output-stability/results-approved
```

不传 `--output` 时截图仍随 Playwright 默认 test-results 保存，不写 docs。诊断环境变量同样只指定 tmp；不要将 docs 路径作为测试输出目录。两份 ESLint 日志来自各应用目录的 `node node_modules/eslint/bin/eslint.js`，参数分别为 `src/db/framework-route-migration.test.ts` 和 `e2e/framework-route.spec.ts`。

## 显式归档步骤（在最终验证之前）

1. 完成采集并检查退出码、业务断言与截图，选定唯一运行批次；失败日志单独保留，不覆盖历史结果。
2. 在 docs 下创建尚不存在的批次目录。复制选定迁移样本的 migration.json、Playwright 用例 evidence、服务日志及测试日志；需要保留失败 trace 时另行解包，不能依赖被忽略的 zip 纳入交付。
3. 写索引，记录原始临时路径、命令、实际结果、浏览器元数据及未核验项。此次复制属于显式交付编辑，不由测试自动执行。
4. 归档和报告完成后再交调度器执行最终验证；此阶段不复制新结果回 docs。如需增补证据，先显式归档，再重新开始版本一致性验证。

本批 manifest.py 从仓库根目录运行，传入 tmp 中输出文件路径。分别在定向验证前后保存清单，比较键集合与逐文件摘要。本批清单在显式归档本轮结果、更新报告之前生成，因此不含本索引及后续复制结果；含已事先归档的 scheduler5 日志。全量测试结果采用调度器第 5 批日志，本轮仅定向重跑，不冒称全量重跑或独立最终验收。

开发者已实际查看本批 reader-desktop.png 与 plan-narrow.png：桌面阅读器的推荐和待修订说明可辨识，窄屏方向选择及保留 REACT-03 焦点可辨识；不据此替代独立产品经理的最终页面验收。
