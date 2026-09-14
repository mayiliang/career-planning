# Git 知识点讲义

## GIT-03 原子提交、远端协作、PR 与并行工作区

你已经会提交和合并，接下来会遇到另一类问题：自己的分支为什么推不上去，评审者为什么看不懂改动，临时修复为什么弄乱了正在写的功能？这些问题需要把个人操作放进共同的工作约定里。

本篇从一个可解释的提交开始，用两个本地副本模拟远端同步，再观察 worktree 如何保留独立现场。PR、检查和发布记录也会回到同一个问题：别人能否理解、验证和接手这次变化。

### 学习前先确认

- 直接前置：[GIT-02 分支整合与冲突处理](../chinese-guides/git-02-branches-merge-rebase-conflicts.md#git-02)。正文会直接使用分叉、快进和重放的含义。

终端例子使用 PowerShell 7 与 Git 2.43，按顺序在全新练习目录中执行。这里的远端也是本机临时目录，不需要注册平台账号，不会向互联网上传内容。真实平台的权限与合并规则需另行确认。

### 一个提交围绕一个可以解释的变化

**原子提交（atomic commit）**的“原子”强调意图完整：这组变化共同完成一个可以命名的行为，便于独立理解、验证和撤销。它不以文件数或代码行数划界。

假设搜索页会被过期请求覆盖。一次完整修复可能同时包含请求身份判断、控制完成顺序的回归例子和必要说明；这些文件服务于同一件事。把修复、回归和说明机械拆开，反而可能留下无法解释或无法运行的中间提交。

| 混合在工作区里的变化 | 更合适的归属 | 原因 |
| --- | --- | --- |
| 阻止旧请求覆盖新结果，以及对应回归 | 搜索修复提交 | 一起定义并保护同一行为 |
| 全站按钮圆角调整 | 视觉调整提交 | 可独立讨论和撤销 |
| 无关依赖升级 | 依赖升级提交 | 风险和验证条件不同 |

用 [暂存区](../chinese-guides/git-01-object-index-references-recovery.md#同一个文件可以同时有三个版本) 选择本次内容，再读 `git diff --staged`。特别检查有没有漏掉实现依赖的类型、误带临时日志、混入别人的修改。部分暂存后，本地运行的工作文件可能不是暂存版本，不能直接把那次运行结果写成“提交已验证”。

### 提交说明解释用户能观察到的变化

标题先写结果，正文补充原因与必要边界。一份可以独立理解的说明例如：

```text
修复连续搜索时旧响应覆盖当前结果

输入 a 后立即输入 ab，若 a 较晚返回，页面会退回 a 的结果。
现在只允许最新搜索提交状态；取消请求用于减少无效工作。
用可控的响应完成顺序核对了旧结果被忽略、当前结果正常显示。
```

这比“修改 search.ts”多解释了触发条件、机制和验证。工单号可以帮助追溯背景，但不能代替说明本身。提交作者、提交者和最终合入者也可能是不同的人；判断变更背景时看完整记录，不把某个名字当作全部责任。

说明应与实际做过的检查一致。没连接真实后端，就写清验证使用可控返回；没有测量过性能，就不写“显著提升”。怎样从复现推到机制，见 [DEBUG-01](../chinese-guides/debug-01-systematic-debugging-evidence-causality.md#每个假设都要有能推翻它的观察)。

### 用两个本地副本看清远端同步

创建一个裸仓库 `remote.git` 作为共享端，`author` 和 `peer` 模拟两位协作者。`git -C` 表示在指定目录里执行 Git，省去反复切换终端位置。

```powershell example=git03-setup runtime=project
$lab = Join-Path ([System.IO.Path]::GetTempPath()) ('atlas-git03-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $lab | Out-Null
git init --bare -b main "$lab/remote.git"
git clone "$lab/remote.git" "$lab/author"
git -C "$lab/author" config user.name 'Atlas Author'
git -C "$lab/author" config user.email 'author@example.invalid'
git -C "$lab/author" config core.autocrlf false
'lesson=1' | Set-Content -Encoding utf8NoBOM "$lab/author/notes.txt"
git -C "$lab/author" add -- notes.txt
git -C "$lab/author" commit -m '建立共同笔记'
git -C "$lab/author" push -u origin main
git clone "$lab/remote.git" "$lab/peer"
git -C "$lab/peer" config user.name 'Atlas Peer'
git -C "$lab/peer" config user.email 'peer@example.invalid'
git -C "$lab/peer" config core.autocrlf false
```

第一次 clone 报“空仓库”提示是正常的，因为那时还没有提交。现在三处都能找到第一版。`origin` 只是 clone 建立的远端别名，不代表特殊权限；`push -u` 设置当前分支的 **upstream**，供状态展示和部分默认操作使用，不是开启自动同步。

让 peer 推送新笔记，同时让 author 在另一文件里写自己的变化：

```powershell example=git03-diverge runtime=project
'lesson=2' | Set-Content -Encoding utf8NoBOM "$lab/peer/notes.txt"
git -C "$lab/peer" add -- notes.txt
git -C "$lab/peer" commit -m '补充第二版笔记'
git -C "$lab/peer" push origin main
'catalog=ready' | Set-Content -Encoding utf8NoBOM "$lab/author/catalog.txt"
git -C "$lab/author" add -- catalog.txt
git -C "$lab/author" commit -m '增加资料目录'
git -C "$lab/author" show origin/main:notes.txt
git -C "$lab/author" show main:notes.txt
```

author 的两次读取仍是 `lesson=1`。服务器已是第二版，但 author 的远端跟踪引用尚未更新。本地的 ahead/behind 也只能基于已有观察，不能告诉你“全世界此刻的真实进度”。

### fetch 更新观察而整合改变当前开发线

现在尝试普通 push，再拉取观察信息：

```powershell example=git03-fetch runtime=project
git -C "$lab/author" push origin main
# 上一行预期被拒绝：远端已有本地尚未包含的变化。
git -C "$lab/author" fetch origin
git -C "$lab/author" show origin/main:notes.txt
git -C "$lab/author" show main:notes.txt
git -C "$lab/author" rev-list --left-right --count main...origin/main
git -C "$lab/author" diff main...origin/main -- notes.txt
```

fetch 后，`origin/main` 读到第二版，`main` 仍是第一版；计数为 `1 1`，表示两侧各有一个独有提交。fetch 下载对象并按引用规则更新本地观察，不会自动把当前工作文件改为远端版本。

本例 author 的目录提交尚未共享，且改的是不同文件，可以重放到新主线，再普通推送：

```powershell example=git03-integrate runtime=project
git -C "$lab/author" rebase origin/main
git -C "$lab/author" show HEAD:notes.txt
git -C "$lab/author" show HEAD:catalog.txt
git -C "$lab/author" push origin main
git -C "$lab/author" branch -vv
```

结果同时有 `lesson=2` 和 `catalog=ready`。如果两侧改同一行，仍需按 [三方内容和业务意图](../chinese-guides/git-02-branches-merge-rebase-conflicts.md#冲突解决先保留需求再决定文本) 处理冲突。

**pull** 把 fetch 和随后的集成放在一条命令里，具体使用 merge、rebase 或仅允许快进与参数、配置有关。日常可以使用团队约定的 pull 方式；在学习或排错时把获取与整合拆开，能更容易指出是哪一步改变了什么。

### lease 比较的是你明确确认过的远端位置

`--force-with-lease` 可在重写已发布主题历史时限制更新条件：远端分支必须仍处于预期旧 ID。它不是锁，也不证明你已经读过别人所有变化。省略显式旧值时，通常依赖本地远端跟踪引用；编辑器后台 fetch 可能更新它，所以“刚 fetch 过”不能等同于“已经审阅并同意覆盖”。

下面只在练习远端制造一次应当拒绝的更新。author 先发布主题提交并保存自己确认的位置：

```powershell example=git03-lease-start runtime=project
git -C "$lab/author" switch -c codex/lease
'heading=Draft' | Set-Content -Encoding utf8NoBOM "$lab/author/title.txt"
git -C "$lab/author" add -- title.txt
git -C "$lab/author" commit -m '增加资料标题'
git -C "$lab/author" push -u origin codex/lease
$expected = git -C "$lab/author" rev-parse origin/codex/lease
# peer 在这个已发布主题上继续工作。
git -C "$lab/peer" fetch origin
git -C "$lab/peer" switch -c codex/lease origin/codex/lease
'review=done' | Set-Content -Encoding utf8NoBOM "$lab/peer/review.txt"
git -C "$lab/peer" add -- review.txt
git -C "$lab/peer" commit -m '补充评审记录'
git -C "$lab/peer" push origin codex/lease
```

author 只改写自己的标题提交说明，再模拟一次后台 fetch：

```powershell example=git03-lease-reject runtime=project
git -C "$lab/author" commit --amend -m '为学习资料增加可辨认的标题'
git -C "$lab/author" fetch origin
git -C "$lab/author" push "--force-with-lease=refs/heads/codex/lease:$expected" origin HEAD:refs/heads/codex/lease
# 预期被拒绝；检查 peer 的记录仍在远端跟踪版本中。
git -C "$lab/author" show origin/codex/lease:review.txt
```

预期仍读到 `review=done`。虽然 fetch 更新了 `origin/codex/lease`，显式保存的 `$expected` 没有变化，远端实际位置与它不符，所以更新被挡住。若此时只是把 `$expected` 改成新 ID 再试，可能恰好绕过你需要处理的协作问题。

被拒绝后应查看新提交、协调目标，再选择保留两侧内容的整合方式；本例到拒绝和核对为止。即便条件匹配，平台权限、保护规则和 hooks 仍可拒绝推送。租约只针对指定引用在更新时的值，也不代表它此前从未移动过。

### PR 帮助别人完成一次有依据的决定

**pull request**，常写作 PR，是托管平台组织变更提案、差异、讨论和检查的方式，不是第五种 Git 对象。它把“准备怎么改”交给别人审阅，最终历史仍取决于实际整合方式。

搜索修复的 PR 可以这样组织：

```text
连续输入 a、ab 时，较早发出的 a 若晚返回，会覆盖当前结果。
本次在状态提交前核对请求身份；取消请求用于减少无效等待。

验证：可控顺序下分别交付旧响应和新响应，旧响应不再写入界面；
单次搜索及当前请求失败仍保留原有反馈。未连接生产搜索服务。

关注点：请求身份是否在每次新搜索时更新，错误分支是否也受保护。
恢复：可撤销本次行为提交；没有数据格式迁移。
```

这段文字让评审者知道触发、结果、重点和证据边界。截图适合展示视觉变化，日志适合说明顺序；附件都应附采集条件，不能只堆“已测试”的图片。

对于大变更，按可运行的垂直切片拆分比机械限制文件数更有帮助。PR-B 依赖 PR-A 时，写明临时基线和最终合入目标；A 合入后要重新检查 B 的最终 diff，尤其是 A 经过 squash 后，原提交未必成为主线祖先。

### 合入方式应该服务于以后如何追踪

| 方式 | 最终历史的主要特点 | 适合讨论的取舍 |
| --- | --- | --- |
| merge commit | 保留主题提交和明确的汇合节点 | 如何追踪分支意图与撤销整次整合 |
| squash | 把本次差异形成一个新的主线提交 | PR 是否就是合适的回滚单位，最终说明是否完整 |
| rebase 式合入 | 通常将主题提交逐个接到目标线 | 中间提交能否独立理解、构建和二分 |
| fast-forward | 只移动目标引用 | 是否需要额外记录合入时点 |

平台的具体实现可能有额外规则，最终应查看真实提交图。不要同时要求保留所有临时提交，又希望每一步都可独立解释；先明确对维护最有用的历史粒度。

本地 hooks 能提前提醒格式、说明和快速检查，但可能未安装或被跳过；共同要求应由 CI 与服务端规则执行。人工评审继续负责需求理解、设计边界和运行风险。检查全绿与评审通过都不是对未来所有环境的保证。

评审意见应指向可观察问题。例如“快速切换后旧请求还能写入错误提示，建议给错误分支加同样守卫”，比“这里不够优雅”更容易达成决定。作者提供修订或证据，评审者再核对；回复过不等于问题已解决。

### worktree 给每项工作一份独立现场

**worktree** 让一个仓库拥有多个工作目录。每个目录有自己的 HEAD、暂存区和工作文件，同时共享对象数据库和大部分仓库引用、配置。它适合把正在开发的功能留在原处，另开一个目录处理修复。

继续使用本篇 `$lab`。先在 author 留下一个尚未提交的草稿，再从 main 建立修复工作区：

```powershell example=git03-worktree runtime=project
'尚未完成的草稿' | Set-Content -Encoding utf8NoBOM "$lab/author/draft.txt"
git -C "$lab/author" worktree add -b codex/hotfix "$lab/hotfix" main
git -C "$lab/author" worktree list
git -C "$lab/author" status --short
git -C "$lab/hotfix" status --short
Test-Path -LiteralPath "$lab/hotfix/draft.txt"
'notice=fixed' | Set-Content -Encoding utf8NoBOM "$lab/hotfix/notice.txt"
git -C "$lab/hotfix" add -- notice.txt
git -C "$lab/hotfix" commit -m '修正阅读提示'
git -C "$lab/author" show codex/hotfix:notice.txt
Test-Path -LiteralPath "$lab/author/notice.txt"
```

author 显示 `?? draft.txt`，hotfix 起初干净；两次 `Test-Path` 都是 `False`。但 author 中的 `git show` 能读到 `notice=fixed`：工作文件各自独立，提交对象与分支引用共享。

同一个分支通常不能同时检出到两个 worktree，以免两个现场共同移动同一个分支。只读评审可考虑 detached worktree；需要长期保存修改时应给它命名分支。原理回到 [HEAD 与引用](../chinese-guides/git-01-object-index-references-recovery.md#分支和-head-是找到提交的入口)。

### 工作目录独立还需要运行资源独立

两个目录都执行“启动开发服务”，仍可能争用同一个端口；两套测试指向同一个数据库，仍可能清掉对方数据。对象库共享也意味着一处 fetch 可以更新另一处看到的远端跟踪引用。

| 需要约定的资源 | 一个可执行的分配例子 |
| --- | --- |
| 修改范围 | 修复任务负责请求逻辑和相邻回归，文档任务负责说明 |
| 起点和目标 | 都记录起始 commit；明确先合修复再核对文档 |
| 端口与数据 | 每项任务使用独立端口和带任务前缀的测试数据库 |
| 缓存与产物 | 查清脚本是否写仓库共享目录，必要时单独路径或串行生成 |
| 交接信息 | 完成的行为、实际修改、检查结果和未解决问题 |

这些约定同样适用于 AI Agent。文件不重叠仍可能改坏同一个接口合同；接手人必须读整合结果。遇到未知脏工作区，先辨认归属，保留现有改动；不能为了让状态好看就自动 reset 或 stash。

结束 worktree 前先查看它的状态，确认需要的内容已提交或另有保存，再使用 `git worktree remove <已确认路径>`。它默认拒绝有未提交或未跟踪内容的工作区。不要用强制删除来代替交接，也不要把移除工作目录误认为删除了对应分支或提交。

### 跨仓库依赖与发布记录补齐交付链条

**submodule** 在父仓库记录子仓库的特定 commit；父仓库提交存在，不保证协作者能从子仓库取得那个对象。更新指针时要保证子提交已共享、权限可用，并评审子仓库对应差异。

**Git LFS** 通常让 Git 保存指针，大文件内容由另一存储提供。看到同名文件不保证它已替换成实际资产；备份也需要包含大对象。二进制锁可以减少冲突，却仍需明确锁归属和异常解除方式。

跨仓库修改接口时，可采用兼容窗口：先让服务端同时接受旧、新格式，再迁移前端，最后移除旧支持。两个仓库的合入与发布通常不是同一瞬间，不能靠“我们同时点按钮”实现原子交付。

一条便于维护的记录链是“问题 → 提交 → PR 决定 → 检查运行 → 合入 ID → 构建制品 → 发布验证”。合入后发生故障时，还要区分撤销源代码、回退部署制品和恢复数据；它们不是同一件事。制品错配的排查可以继续看 [Source Map 与运行版本](../chinese-guides/debug-01-systematic-debugging-evidence-causality.md#source-map-必须和实际运行的制品配对)。

### 参考与延伸阅读

- [git fetch](https://git-scm.com/docs/git-fetch) 与 [git pull](https://git-scm.com/docs/git-pull)：核对获取、引用更新与集成策略。
- [git push](https://git-scm.com/docs/git-push)：特别查看带明确预期值的 lease，以及后台 fetch 的说明。
- [GitHub：Pull requests](https://docs.github.com/en/pull-requests/reference/pull-requests)：理解平台上的提案、差异、讨论与评审。
- [git worktree](https://git-scm.com/docs/git-worktree)：查询共享范围、分支检出限制和移除条件。
- [Git 子模块](https://git-scm.com/docs/gitsubmodules) 与 [Git LFS](https://git-lfs.com/)：需要跨仓库或管理大文件时继续学习。

本篇于 2026-09-09 对照官方机制。练习中的共享端只验证 Git 对象与引用行为，不代表已经验证任何托管平台权限、CI 或生产发布。
