# 自动迭代流程

产品约定见 [CHARTER.md](CHARTER.md)，决策记录见 [DECISIONS.md](DECISIONS.md)。

## 工作方式

产品经理研究并输出需求 → 调度器发布 GitHub Issue → 开发者实现 → 独立命令检查 → 提交并推送 `auto_coding` → 产品经理在独立会话中验收 → 关闭 Issue 或返工。

产品经理拥有项目内的最终产品决策权。日常决策无需逐项请示。执行器串行处理任务，每个阶段使用独立会话；额度中断时恢复对应会话。模型沿用本机 Codex 配置，不自动切换付费 API。

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

测试涵盖额度窗口、未知恢复状态、Issue/评论幂等、分支约束、失败检查阻断交付、提交恢复、版本验收、暂缓成果保存以及完整状态流转。额度真正耗尽后的恢复仍需在实际发生时观察，不能用模拟测试替代长期运行证据。

接口参考：[Codex App Server](https://learn.chatgpt.com/docs/app-server)、[macOS LaunchAgent](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html)。
