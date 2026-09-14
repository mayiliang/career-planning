# Git 知识点讲义

## GIT-02 分支、合并、变基与冲突处理

同一份请求配置，一位同事把默认等待时间缩短，另一位同事为了导出报表把它延长。Git 报冲突时，应该保留哪个数字？即使工具自动合并成功，产品行为就一定正确吗？

这篇把同一张提交图分别交给 merge、rebase 和 cherry-pick。你会看到：它们不仅改变文件，还会以不同方式连接历史；解决冲突则必须重新理解双方要达成的行为。

### 学习前先确认

- 直接前置：[GIT-01 对象、暂存区与恢复](../chinese-guides/git-01-object-index-references-recovery.md#git-01)。需要知道分支是引用，以及工作区、暂存区和 HEAD 可以不同。

例子使用 PowerShell 7、Git 2.43。请从下面新建的练习仓库开始，按顺序执行。预期冲突的命令会返回非零状态，这是观察点；不要在真实项目里批量照搬解决步骤。

### 先画关系再选择整合方式

**分支（branch）**给一条开发线提供名字。两条线分开修改后，先问它们最近共享哪段历史。**共同祖先（merge base）**提供比较双方变化的基线。

```text
      C  main：普通请求希望更快失败
     /
A ──┤
     \
      D  codex/export：报表导出需要更长等待
```

A、C、D 是下文的讲解标签，不是可以直接传给 Git 的真实 ID。分叉的关键是 C 与 D 都以 A 为父提交；谁的时间戳更晚并不能决定该保留谁。

整合之前先读 `git status`。带着未知未提交修改进入 merge 或 rebase，会把“本次冲突”与“原有现场”混在一起，abort 也未必能完整重建所有原有修改。先提交、另建工作区或妥善保留已确认归属的修改，再开始整合。

### 建立一份确实会分叉的配置历史

下面建出图中的三次提交。主线和导出分支故意改同一行，以便稳定观察冲突。

```powershell example=git02-setup runtime=project
$lab = Join-Path ([System.IO.Path]::GetTempPath()) ('atlas-git02-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $lab | Out-Null
Set-Location -LiteralPath $lab
git init -b main
git config user.name 'Atlas Learner'
git config user.email 'learner@example.invalid'
git config core.autocrlf false
git config merge.conflictStyle diff3
# A：双方共同使用的起点
'timeoutMs=1000' | Set-Content -Encoding utf8NoBOM request.conf
git add -- request.conf
git commit -m '建立请求等待配置'
$base = git rev-parse HEAD
git switch -c codex/export
'timeoutMs=2000' | Set-Content -Encoding utf8NoBOM request.conf
git add -- request.conf
git commit -m '为报表导出延长等待'
$topic = git rev-parse HEAD
git switch main
'timeoutMs=800' | Set-Content -Encoding utf8NoBOM request.conf
git add -- request.conf
git commit -m '普通请求更快报告超时'
$mainTip = git rev-parse HEAD
git log --graph --oneline --all
```

`main` 停在 C，`codex/export` 停在 D。变量 `$base`、`$topic`、`$mainTip` 保存真实 ID，后续命令用它们说明比较基线。读图时从分支名沿线向父提交走，应该都能到达 A。

### 两个点和三个点要连同命令一起读

同样的点号在 `diff` 和 `log` 中回答不同问题，不能背成统一的“范围语法”。

```powershell example=git02-compare runtime=project
git merge-base main codex/export
git diff main..codex/export -- request.conf
git diff main...codex/export -- request.conf
git log --oneline main..codex/export
git log --left-right --oneline main...codex/export
```

| 操作 | 这个例子里的含义 | 预期结果 |
| --- | --- | --- |
| `merge-base main codex/export` | 查共同祖先 | 等于 `$base` |
| `diff main..codex/export` | 比较两个端点的文件 | 800 → 2000；与 `diff main codex/export` 相同 |
| `diff main...codex/export` | 从共同祖先看右侧端点 | 1000 → 2000 |
| `log main..codex/export` | 右侧可达而左侧不可达的提交 | 只有 D |
| `log --left-right main...codex/export` | 两侧各自独有的提交 | C 带 `<`，D 带 `>`；显示顺序可不同 |

评审一个主题分支时，“它相对共同基线做了什么”通常比“它与今天主线的最终文件有何不同”更容易解释。复杂历史可能有多个最优共同祖先；本篇练习图只有一个，不把这个简化推广成所有仓库的规则。

### merge 保留两条线并记录一次汇合

先从 C 新建整合分支，保留 `main` 给后面的对照用。**三方合并（three-way merge）**比较基线 A、当前侧 C 和合入侧 D，而不是单纯让后一份文件覆盖前一份。

```powershell example=git02-merge-conflict runtime=project
git switch -c codex/merge main
git merge --no-ff codex/export -m '整合普通请求与导出配置'
# 上一行预期报告冲突；停下来查看，尚未生成合并提交。
git status --short
git ls-files -u -- request.conf
git show :1:request.conf
git show :2:request.conf
git show :3:request.conf
Get-Content request.conf
```

状态包含 `UU request.conf`。三个 `show` 依次显示 1000、800、2000。`ls-files -u` 中 stage 1 是基线，stage 2 是当前侧，stage 3 是合入侧。冲突时暂存区保存这些候选；解决后 `add` 会用一个已解决版本替代它们。

因为设置了 `diff3`，工作文件里还会显示基线块。`<<<<<<<` 到 `=======` 的区域不能整体当作“正确版本”；中间的 `|||||||` 是基线标记，读的时候要分清三段。标签中出现的分支名或 ID 可随命令变化。

### 冲突解决先保留需求再决定文本

800 的意图是让普通请求尽快反馈失败，2000 的意图是允许较慢的报表生成。如果系统确实同时支持这两类请求，更合理的整合是分开配置。我们把格式改为两个明确命名的值：

```powershell example=git02-merge-resolve runtime=project
@('defaultTimeoutMs=800', 'exportTimeoutMs=2000') | Set-Content -Encoding utf8NoBOM request.conf
git add -- request.conf
git diff --staged -- request.conf
git ls-files -u -- request.conf
git commit -m '分别配置普通请求与报表导出的等待时间'
git rev-list --parents -n 1 HEAD
Get-Content request.conf
```

`ls-files -u` 现在没有输出；最后一条历史记录包含“当前提交 ID + 两个父提交 ID”。新的 merge commit M 同时连接 C 和 D，原来的两个提交仍然存在。

这个练习只有配置文件，所以这里只验证了配置整合与提交关系。真实程序还需要让读取配置的代码选择正确字段：普通请求使用 800，导出请求使用 2000，并覆盖未知请求类型的默认行为。**冲突标记消失只能证明文本已被接受，不能证明使用配置的程序已改对。**

没有文本冲突也可能发生**语义冲突（semantic conflict）**：A 分支让价格接口从“元”改为“分”，B 分支在另一文件直接显示价格。Git 合并得很顺，页面却把 12.50 元显示成 1250 元。此时需要验证接口与消费者的组合，不能依赖冲突检测。

### rebase 重放变化并建立新的父子关系

**变基（rebase）**把选定提交的变化重新应用到另一个基线上。继续同一个练习，从 D 新建对照分支，再将它移到 C 后面：

```powershell example=git02-rebase runtime=project
git switch -c codex/rebase codex/export
git rebase main
# 预期冲突；这次先看两侧分别是谁。
git show :2:request.conf
git show :3:request.conf
@('defaultTimeoutMs=800', 'exportTimeoutMs=2000') | Set-Content -Encoding utf8NoBOM request.conf
git add -- request.conf
git rebase --continue
git log --graph --oneline codex/rebase
git rev-list --parents -n 1 HEAD
git diff codex/merge codex/rebase -- request.conf
```

最终历史是 `A—C—D′`，D′ 只有一个父提交 C。最后的文件 diff 没有输出：两种整合方式得到了相同内容，却留下不同历史。原来的 D 仍由 `codex/export` 指着，不能说 rebase 把所有旧对象删掉了。

继续时 Git 可能打开你配置的编辑器。核对提交说明，保存并关闭编辑器后，命令才会结束；冲突解决改变了意图时，应相应修改说明。

rebase 不保证“挑出的每个提交都必然对应一个新提交”：已经应用过的补丁、变成空的提交、无须移动的情况及命令选项都会影响结果。本例 D 的父提交确实改变，所以 D′ 有新的身份。将已共享提交重放后直接强推，会让别人的基线分裂，协作约定见 [GIT-03](../chinese-guides/git-03-commits-remotes-pr-worktrees-collaboration.md#lease-比较的是你明确确认过的远端位置)。

### ours 和 theirs 要看当前正在做什么

这两个词是当前合并过程的角色，不是“我的代码”和“同事的代码”的永久标签。

| 场景 | stage 2 / ours | stage 3 / theirs |
| --- | --- | --- |
| 在 C 上 merge D | 当前 C | 合入的 D |
| 把 D rebase 到 C，本例第一步 | 已建立的新基线 C | 正在重放的 D |

所以你明明在自己的导出分支运行 rebase，`ours` 却读到主线的 800。因为 Git 正从新基线逐个接回补丁，“当前侧”是这个逐步组装的结果。多个提交重放时，它还可能含前面已成功重放的内容。

不要在不看内容的情况下批量选 `--ours` 或 `--theirs`。先读 stage 和原提交意图，再手工写出最终行为。**rerere** 可以记住并复用相似冲突的解决结果，节省重复编辑；复用的决定仍要重读，因为新基线可能改变了它原来的前提。

### fast-forward 和 cherry-pick 各自省略了什么

**快进（fast-forward）**适用于当前分支是目标提交祖先的情况：只需把引用向前移动，就已经包含全部现有历史。当前 `main` 在 C，而对照分支 D′ 的父提交正是 C：

```powershell example=git02-fast-forward runtime=project
git switch -c codex/fast main
git merge --ff-only codex/rebase
git rev-parse HEAD
git rev-parse codex/rebase
```

两个 ID 相同，没有额外的 merge commit。`--ff-only` 在真正分叉时会拒绝，不会替你偷偷挑另一种策略。强制保留汇合点可选择 `--no-ff`，但应以团队追踪和回滚需要为依据。

**cherry-pick** 则把选定提交相对父提交的变化应用到当前线，适合只把一个修复带到维护分支。继续用 D 的变化观察一次：

```powershell example=git02-cherry-pick runtime=project
git switch -c codex/pick main
git cherry-pick -x $topic
# 预期冲突；仍需决定普通请求和导出请求怎样共存。
@('defaultTimeoutMs=800', 'exportTimeoutMs=2000') | Set-Content -Encoding utf8NoBOM request.conf
git add -- request.conf
git cherry-pick --continue
git rev-list --parents -n 1 HEAD
git log -1 --format=%B
```

新提交只有一个父提交 C。核对最终说明是否保留来源 ID；`-x` 的自动来源说明在官方文档中以无冲突挑选为保证范围，冲突后应检查并按需要补充。它没有把 D 的整个分支祖先关系合进来。若修复还依赖另一个类型或 API 变化，只挑最后一条补丁可能编译失败；先检查依赖，再决定是否一起引入。

### 整理本地提交时保留可恢复的起点

交互式 rebase 可调整尚未共享的主题历史：`reword` 改说明，`squash` 合并并编辑说明，`fixup` 通常折入前一提交，`edit` 暂停以便拆分或修改。比如“增加输入校验 → 修正自己刚写的拼写 → 补充校验边界”可以整理为一个完整的校验变化。

开始前给旧尖端保留一个分支名，再确认暂存和工作区状态。拆分一条提交时，常见思路是在 edit 停点把该提交用 mixed reset 退到父提交，保留工作文件，然后分批暂存、提交并继续。这个过程改变的是选中历史，不能对未知共享分支直接套用。

暂停之后先用 `git status` 判断自己处于哪一种流程，再使用对应的 `merge --abort`、`rebase --abort` 或 `cherry-pick --abort`。`rebase --skip` 会跳过正在重放的提交，并不是通用的“忽略报错继续”。若意外移动了入口，回到 [reflog 救援](../chinese-guides/git-01-object-index-references-recovery.md#用-reflog-找回被移走的入口)，先固定旧提交再处理。

### 撤销合并后仍要看祖先关系

设合并后的主线是 `C—M—R`，M 的另一个父提交是 D，R 是撤销 M 所引入变化的提交。`git revert -m 1 <M的ID>` 中的 `1` 指以 M 的第一个父提交为主线计算反向变化，不表示“撤销第一个父提交”。使用前先查看 M 的父列表，确认哪一侧是要保留的主线。

撤销内容不会取消 D 已经是主线祖先这个事实。之后再 merge 原来的 D，Git 可能认为已经整合过；如果 D 后面增加 E，再次合并通常也不会自动恢复 D 中已撤销的旧变化。

下一步取决于需求：若整次撤销需要反转，可以讨论撤销 R；若只要其中修好的部分，应在当前基线上提交新的修复。无论哪种，都要重新核对组合行为和已发布结果，不能把“再点一次合并”当作还原按钮。

### 最终检查围绕组合后的行为

评估整合方式时，可以把历史和结果分开看：

| 关注点 | 可观察证据 | 尚需判断 |
| --- | --- | --- |
| 谁包含谁 | 父提交、祖先判断、提交图 | 是否符合协作约定 |
| 最终文件 | 与目标基线的 diff | 新接口和消费者是否匹配 |
| 可追溯性 | 提交说明、来源 ID、PR 决定 | 以后能否独立解释与撤销 |
| 验证结果 | 目标组合上的关键行为 | 单分支通过是否覆盖最新组合 |

锁文件冲突要结合依赖清单和约定的包管理器重建，不能随机保留半边生成内容；二进制冲突需确定权威资产，文本工具无法替你拼出正确图像。数据库迁移还涉及部署顺序与数据兼容，Git 图连上了不代表迁移可逆。

集成队列可以按主线最新状态验证待合入组合，减少“各自通过，合起来失败”的窗口；它仍依赖检查覆盖真正的组合行为。发现异常时，沿 [系统化调试](../chinese-guides/debug-01-systematic-debugging-evidence-causality.md#先把现象写成别人能重现的事实) 记录输入和证据，比反复切换合并方式更能定位原因。

### 参考与延伸阅读

- [Pro Git：分支的合并](https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging)：结合图理解分叉、快进和汇合。
- [git diff](https://git-scm.com/docs/git-diff) 与 [git log](https://git-scm.com/docs/git-log)：对照端点差异与提交集合。
- [git merge](https://git-scm.com/docs/git-merge)：查看三方合并、索引阶段、冲突与 abort 的边界。
- [git rebase](https://git-scm.com/docs/git-rebase)：查询重放、交互操作、空提交和 ours/theirs 的含义。
- [git cherry-pick](https://git-scm.com/docs/git-cherry-pick) 与 [git revert](https://git-scm.com/docs/git-revert)：需要移植修复或撤销 merge 时查具体选项。

本篇于 2026-09-09 核对官方机制；例子展示相同文件结果如何对应不同历史，不预设某种团队分支风格一定更优秀。
