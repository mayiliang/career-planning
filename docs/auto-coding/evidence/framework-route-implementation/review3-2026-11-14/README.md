# 第三次验收返工（2026-11-14）

本目录对应调度器 `b80b96d5b1b447ac9dc54b5db46dc73e-3`，不是此前 66 项通过的批次。

## 原始失败与诊断

- `original/check-0.txt` 至 `check-6.txt`：调度器当次原始日志；E2E 为 **21 通过、17 失败、41 未执行**。
- `original/test-results/`：补跑前原样复制的 17 份失败 trace 与错误上下文。后续运行使用不同输出目录，不覆盖这些文件。
- `trace-analysis.json`：提取浏览器控制台、答案请求顺序及事件最大间隔。间隔只用于描述执行停顿，不能证明系统睡眠。部分 trace 在浏览器建立前即失败，没有足够浏览器事件，间隔为 0 不代表正常执行。
- `coverage.json`：79 项原始结果及本轮逐项覆盖映射；以每条实际结果为准，不合并成一次全量通过。

原评分失败顺序（UTC，原 trace）：00:15:46.604 第一题 PUT“最新答案一”；控制台随后出现 `[vite] server connection lost. Polling for restart...`、重新 connecting/connected；00:15:48.316 再次 GET 答卷，测试桩返回旧答案；00:15:49.276 提交阶段两个 PUT 均为旧答案；之后才锁卷、评分报错并刷新。说明旧内容已经在评分前由整页重载重新读入，不能据此判定评分后的保留逻辑失效。Vite 连接为何断开尚未确定。

执行条件改为每批由 global-setup 构建当次源码，再运行 Vite preview，移除开发客户端重连引发的刷新因素。使用专用 42730/42731 端口、工作副本 `tmp/e2e/career-atlas-e2e-*` 隔离 DATA_DIR、NODE_ENV=test、禁真实配置及备份、空模型密钥。测试退出清理隔离库；未访问真实用户库或调用模型。

## 本轮批次

所有命令在 `apps/web` 执行。分组 `.sh` 保存原始参数；每组单独 global-setup，不复用其他组数据。JSON 报告包含用例状态、耗时与附件；耗时不作为产品性能结论。

- `answers.txt`：普通沙箱 Chrome 启动 SIGABRT，3 项未进入页面；不能记作业务失败或通过。
- `answers-approved.txt/json`：获准运行隔离 Chrome，原答案保留断言及开始失败检查通过，但新增导航计数误把路由器同页地址更新计为加载，2 项在新断言处失败。修正为只统计主文档导航请求，未放松答案断言。
- `answers-final.txt/json`：三项通过。此批截图捕获了弹窗离场动画，不能作为最终错误页视觉证据；后续 routes 批次追加等待弹窗移除后截图。
- `assessment-unit.txt`：生产 `useAssessmentSession.test.ts` 11 项通过，包括受控延迟写入、评分失败后旧答卷刷新、并发保存顺序、退出页面、迟到请求；不是研究模型测试。
- `lint.txt`：本轮修改的 E2E/启动文件 ESLint。

分组：interaction（笔记竞态、助手上下文、导航、打卡、布局），routes（异步阅读、框架入口、偏好路线及答案错误页补拍），materials（此前未执行的讲义、发音、阅读阈值），learning（此前未执行的练习、挑战、学习闭环、笔记、数据管理和窄屏导航）。各项结果和截图以分组日志、JSON 与对应目录为准。

原始 17 项按失败阶段处理（编号对应 check-6 错误清单）：

| 阶段 | 原编号 | 处理与证据边界 |
| --- | --- | --- |
| 业务值/状态准备 | 1、16 | 1 的答案请求顺序证明评分前发生重载；16 独立准备实际可推荐状态，保留新答案/失败提示断言。 |
| 浏览器/页面 fixture 建立 | 3、11、15 | 3、11 在建立 page 时超时，15 为 browserType.launch 超时；不作为页面业务断言失败。原配置分批重跑。 |
| 页面加载 | 13、14 | page.goto 等待 load 超时；保留原加载与交互断言，以预览页补跑。 |
| 页面交互、元素等待或截图 | 2、4、5、6、7、8、9、10、12、17 | 分别归入 interaction、routes、learning；部分有数百秒事件间隔，部分为读不到页面元素，不能统一断言根因。没有扩大等待时限。 |

本目录 `.gitignore` 仅放行此处隔离证据的 test-results 和 ZIP，避免仓库通用忽略规则使原始 trace 在调度器提交时遗漏；未放行用户数据或仓库其他备份。

20:08 恢复时资料组进程已不存在，42730/42731 均空闲。`materials-interrupted.txt` 保留前七项明确通过的逐项日志，没有 JSON 或整组完成汇总；只将这七项纳入覆盖，不宣称整组成功。`materials-resume.sh` 仅选择其余九项，输出 `materials.txt/json`。这次恢复没有重做实现或覆盖中断日志。

## 2026-11-15 交付前核对结果

`python3 update-coverage.py` 输出：total=79、currentRerunPassed=59、remainingFailedOrSkipped=0。

完成批次为 answers-final 3、interaction 8、routes 11、materials 恢复 9、learning 23 项通过；另有 materials-interrupted 明确打印的 7 项通过。共 61 次执行、59 个不同用例，覆盖最新全部 17 项失败和 41 项未执行。没有重新执行剩余 20 个原本通过用例，不宣称单次 79 项全量成功。学习组 23 项完成日志为 `learning.txt/json`。

已复核实际 diff、单测和浏览器结果，查看新的答案错误页、桌面阅读器、手机学习台/路线/代码复制、暂停、链完成和旧练习/挑战原文截图；最终专用端口均空闲。`lint.txt`、`assessment-unit.txt`、`budget.txt` 及 `final-checks.txt` 记录静态与最终核对。调度器负责之后的独立验收和 Git 提交。
