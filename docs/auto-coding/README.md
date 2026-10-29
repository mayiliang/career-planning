# 自动迭代流程

产品约定见 [CHARTER.md](CHARTER.md)，决策记录见 [DECISIONS.md](DECISIONS.md)。

## 工作方式

产品经理研究并输出需求 → 调度器发布 GitHub Issue → 开发者实现 → 独立命令检查 → 提交并推送 `auto_coding` → 产品经理在独立会话中验收 → 关闭 Issue 或返工。

产品经理拥有项目内的最终产品决策权。日常决策无需逐项请示。执行器串行处理 Issue，每个阶段使用独立会话；阶段内部可由总指挥派遣子代理。额度中断时恢复对应会话，不自动切换付费 API。

## 模型分工

| 模型 | 职责 |
| --- | --- |
| `gpt-6-astra` | 总指挥：目标理解、产品规则、任务拆分与调度、整合、疑难兜底、最终验收 |
| `gpt-6.1-sol` | 子代理：技术研究、代码实现、依赖分析与测试 |
| `gpt-6.1-terra` | 子代理：中文学习资料、页面体验、有明确范围的实现与复核 |

三个模型默认使用 `medium` 推理强度。调度器在每次新建及恢复会话时显式固定 Astra；原生 `sol`、`terra` 角色各有模型配置文件。配置仅作用于这个自动化，不改本机全局模型偏好。

每个主会话最多同时运行两个子代理，不递归派遣。独立研究或文件范围互不重叠的实现可并行，共享接口和交叉修改由 Astra 协调。子代理接收必要上下文与清晰的完成条件；小任务可直接处理，避免重复扫描和不必要的派遣。子代理连续两次无法解决同一问题，由 Astra 重新拆分或接管；最终验收仍在独立 Astra 会话中进行。

控制台把配置模型与实际派遣状态分开显示。调度器保存原生子代理的标识、模型、任务摘要及状态；父回合和恢复结果都必须确认子代理已结束，才会进入交付。暂停或额度中断会向父子回合发出中断，并关闭所属 app-server；已保存文件和会话供下次恢复。任何子代理报告额度耗尽时，团队统一等待并重新核验额度，不通过更换模型绕过。

此分工旨在减少重复上下文和让具体工作使用较合适的模型，不承诺固定的 token 或额度节省比例。实际效率取决于任务、返工和推理强度。实现字段以本机生成的 app-server schema 为准；本机版本使用 `agents.<role>.config_file`。

GitHub Issue 使用 `auto-coding` 标签，状态标签为 `auto:ready`、`auto:in-progress`、`auto:review`、`auto:blocked`、`auto:done`。Issue、交付和验收评论含持久化标识，重试时先查已有结果，避免重复发布。提交含 Issue 编号与执行标识。

## 本机部署

调度器由 macOS 用户级 LaunchAgent 管理。用户登录且电脑运行时可执行；休眠/关机期间不运行，唤醒或登录后从已保存状态继续。需要当前 GitHub 凭据、Codex ChatGPT 登录、网络和项目依赖可用。

- 服务标识：`com.careeratlas.auto-coding`
- 运行目录：`~/Library/Application Support/CareerPlanningAutoCoding`
- 独立执行仓库：运行目录中的 `repository/`，检出 `auto_coding`；原项目目录继续用于日常工作。
- 配置：`config.json`（工作目录、仓库、Codex 路径）
- 检查点：`state.json`
- 阶段输入/结果与事件：`runs/`
- 验证日志：`deliveries/`
- 已完成或暂缓任务：`history/`
- 状态事件：`events.jsonl`

执行器和角色规范安装为独立副本，产品开发不自动重部署执行器。GitHub 凭据通过 Git 已配置的 credential helper 在内存使用，不写入源码、运行配置或日志。配置和运行记录仅本机用户可读。

本机验证发现，引用 `Documents` 中原仓库 Git 元数据的 worktree 在后台进程中会超时。因此实际运行采用完整独立克隆，Git 元数据与工作文件均位于应用支持目录。自动化使用独立 `bin/` 中的 Codex 与 pnpm 路径，不依赖存在问题的全局启动包装脚本。

GitHub API 会读取 `git config --get-urlmatch http.proxy` 并沿用该仓库的 HTTP/HTTPS 代理；没有配置时使用系统默认代理发现。这样后台环境不依赖终端临时代理变量，也不关闭 TLS 证书验证。

## 查看、暂停、恢复

打开本机控制台：<http://127.0.0.1:42880>。页面每 5 秒读取一次真实状态，显示当前 Issue、六个执行阶段、两个角色、Codex 额度快照及重置时间。任务历史包含验收结果、依据与提交；运行日志可以按流程、角色、验证和服务分类查看、搜索与复制。

控制台提供暂停、恢复、启动调度服务，以及网络重试或研究待命时的立即重试。每次操作先进入持久化队列，由调度器串行执行并回传结果；页面不直接改写检查点。暂停会保留当前任务、会话和工作文件。额度等待期间不提供提前重试，恢复运行仍会核验真实额度。

控制台由独立 LaunchAgent `com.careeratlas.auto-coding.console` 管理，关闭网页不影响自动迭代。默认只监听本机回环地址，不对局域网开放。请求校验 Host、Origin 和操作令牌；只返回必要的状态字段及有界日志，不提供配置文件和模型内部推理日志，已知凭据格式会脱敏。日志仍是本机运行资料，不应直接作为公开报告。

已有调度器安装完成后，可在执行仓库部署控制台：

```sh
python3 automation/console_server.py --install
launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.careeratlas.auto-coding.console.plist"
```

更新已加载的控制台时，先 `bootout` 对应服务，部署后再次 `bootstrap`。更新执行器必须先暂停并停止调度服务，将 `auto_coding.py`、`team.py`、`roles/` 和 `agents/` 同步到运行目录，再加载原服务。不要覆盖 `config.json`、`state.json` 或运行历史。控制台静态页面必须通过上述 HTTP 地址打开，直接打开 HTML 文件无法连接服务。

在项目目录运行：

```sh
python3 automation/auto_coding.py status
python3 automation/auto_coding.py pause
python3 automation/auto_coding.py resume
```

暂停会在正在运行的模型阶段/验证命令的下一个检查点中断并保留已有文件；短暂进行中的 GitHub 或 Git 操作可能先完成。恢复后继续未完成阶段。额度等待不会因手动恢复而绕过。

查看系统服务：

```sh
launchctl print "gui/$(id -u)/com.careeratlas.auto-coding"
```

完全停止系统服务（保留所有进度）：

```sh
launchctl bootout "gui/$(id -u)/com.careeratlas.auto-coding"
```

再次加载：

```sh
launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.careeratlas.auto-coding.plist"
```

需要新部署时，先运行单元测试，再运行 `install --help` 查看参数。安装默认处于暂停状态，显式恢复后才会调用模型或管理 Issue。已有安装不被覆盖。

## 恢复与质量要求

- 用量通过 Codex app-server 查询，优先依据服务端状态；重置时间只决定何时重试，不能作为已恢复证明。多个耗尽窗口等待较晚的重置；无重置信息时每 15 分钟复查。
- 状态文件原子替换；每个模型阶段开始前与运行中定期保存 Git 检查点。进程退出后恢复已有会话，若上次结果已完成则读取已有结果。
- 单实例文件锁避免两个调度器同时修改同一个分支。所有 Git 写入检查仓库与分支。
- 验证失败不提交，不关闭 Issue；开发者修复，多次失败交产品经理重新判断。单轮模型工作两小时超时后保存现场重试；验证命令上限 30 分钟。
- 内容变更运行内容/链接检查；代码变更运行内容检查、静态检查、单测和构建；界面代码变更追加端到端测试。教学和视觉质量另由产品经理验收。
- 提交成功但检查点丢失时，通过提交标识恢复；推送与评论可重试。关闭 Issue 前核对本地、远端和验收提交一致。
- 暂缓任务的未完成改动保存在本地 Git stash，Issue 记录恢复标识，不推送未通过检查的代码；可以继续处理其他任务。
- 登录失效、仓库/分支漂移、修改控制程序等需要核对的问题进入 `needs_attention`，状态文件与日志说明原因。恢复条件解决后执行 `resume`。
- 无有价值的待办时，每六小时重新研究；有任务时阶段完成即继续，不等待固定轮询周期。

## 验证

```sh
python3 -m unittest discover -s automation -p 'test_*.py' -v
```

测试涵盖额度窗口、未知恢复状态、Issue/评论幂等、分支约束、失败检查阻断交付、提交恢复、版本验收、暂缓成果保存、完整状态流转，以及控制台 HTTP 接口、跨站请求拦截、日志路径限制、操作回执丢失后的去重和额度等待保护。额度真正耗尽后的恢复仍需在实际发生时观察，不能用模拟测试替代长期运行证据。

接口参考：[Codex App Server](https://learn.chatgpt.com/docs/app-server)、[原生子代理](https://learn.chatgpt.com/docs/agent-configuration/subagents)、[模型分工参考](https://learn.chatgpt.com/docs/model-selection)、[macOS LaunchAgent](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html)。
