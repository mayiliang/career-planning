# Git 知识点讲义

## GIT-01 Git 对象模型、暂存区与安全恢复

文件明明改了，提交里却没有；已经按了撤销，改动竟然还在；切走一个临时版本后，刚写的提交像是消失了。要解释这些现象，先别急着背“撤销命令大全”。我们需要看清：内容存在哪里，下一次准备提交什么，分支现在指向哪里。

这篇用一个只有 `notes.txt` 的小仓库，把保存、暂存、提交、恢复连成可观察的过程。学完以后，你应该能先说出自己想改变哪一层，再选择命令。

### 学习前先确认

本讲无站内硬前置。能分清文件、目录和终端当前位置即可。例子使用 **PowerShell** 7 和 Git 2.43 的已有命令；`switch` 与 `restore` 需要 Git 2.23 或以上。命令中的 `$lab` 是练习目录变量，实际提交 ID 每次运行可以不同。

### 先建一个可以放心观察的小仓库

打开 PowerShell 7，连续执行下面代码。它在系统临时目录中新建随机名称的仓库；只设置这个仓库的身份，不改全局配置。后文命令都在这个新目录里继续。

```powershell example=git01-setup runtime=project
$lab = Join-Path ([System.IO.Path]::GetTempPath()) ('atlas-git01-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $lab | Out-Null
Set-Location -LiteralPath $lab
git init -b main
git config user.name 'Atlas Learner'
git config user.email 'learner@example.invalid'
git config core.autocrlf false
'version=1' | Set-Content -Encoding utf8NoBOM notes.txt
git add -- notes.txt
git commit -m '记录第一版笔记'
git status --short
```

最后一行没有输出，表示 Git 没看到待提交或未跟踪的变化。“干净”只是相对当前提交的状态，不代表内容正确，也不代表已经上传。这个仓库还没有远端。

目录名用随机值，是为了让你反复练习时保留前一次结果。遇到意外输出就停在那一步看 `git status`，不要把真实项目当作下面的练习目录。

### 同一个文件可以同时有三个版本

你用编辑器打开的是**工作区（working tree）**里的文件。**暂存区（staging area）**也叫 **index**，记录下一次普通提交将采用的内容。`HEAD` 指向当前检出的提交，代表已经保存下来的一个版本。

```text
当前提交 HEAD       暂存区 index        工作区文件
已经记录的版本  ←   准备记录的版本  ←   正在编辑的版本
                  commit             add
```

`add` 不是“让 Git 从此自动提交这个文件”。它在执行那一刻取走文件内容。继续下面的实验：

```powershell example=git01-three-states runtime=project
'version=2' | Set-Content -Encoding utf8NoBOM notes.txt
git add -- notes.txt
'version=3' | Set-Content -Encoding utf8NoBOM notes.txt
git status --short
git show HEAD:notes.txt
git show :notes.txt
Get-Content notes.txt
```

你会看到 `MM notes.txt`，以及依次出现的 `version=1`、`version=2`、`version=3`。短状态的第一列比较暂存区和 HEAD，第二列比较工作区和暂存区，所以两个 `M` 可以同时成立。

这解释了一个常见误会：编辑器里的第三版运行正常，不等于即将提交的第二版也运行正常。部分暂存时尤其要留意这一点。

### diff 的关键是两端分别是谁

接着比较三个版本。下表里的命令都限制在同一个文件，便于辨认。

| 命令 | 比较方向 | 此时会看到什么 |
| --- | --- | --- |
| `git diff -- notes.txt` | 暂存区 → 工作区 | 第二版变成第三版 |
| `git diff --staged -- notes.txt` | HEAD → 暂存区 | 第一版变成第二版 |
| `git diff HEAD -- notes.txt` | HEAD → 工作区 | 第一版变成第三版 |

```powershell example=git01-diffs runtime=project
git diff -- notes.txt
git diff --staged -- notes.txt
git diff HEAD -- notes.txt
git commit -m '记录已暂存的第二版'
git show HEAD:notes.txt
Get-Content notes.txt
git status --short
```

提交后，HEAD 是第二版，工作区仍是第三版，状态为 ` M notes.txt`：第一列空白，只有未暂存变化。提交没有悄悄包含第三版，也没有把编辑器里的内容退回第二版。

`git add -p` 允许按差异块选择内容，适合把修复与无关文案分开。但 Git 判断的是文本块，两个块在业务上可能互相依赖。选择后应重新读暂存差异；怎样确定一个提交的边界，见 [原子提交](../chinese-guides/git-03-commits-remotes-pr-worktrees-collaboration.md#一个提交围绕一个可以解释的变化)。

### 对象保存内容和关系而不是编辑动作

Git 的核心记录可以按四类理解。**blob** 保存文件内容，**tree** 把文件名、模式和内容对象组织成目录，**commit** 指向一棵根 tree 并记录父提交、作者、提交者和说明。带注释的 **tag** 还有自己的对象，保存目标和注释等信息；轻量标签则只是一个引用。

```powershell example=git01-objects runtime=project
git cat-file -t HEAD
git cat-file -p HEAD
git ls-tree HEAD
git cat-file -p 'HEAD^{tree}'
git show HEAD:notes.txt
```

依次找这几个线索：第一行是 `commit`；提交内容含 `tree` 与 `parent`；tree 列出 `notes.txt` 对应的 blob；最后读出的仍是第二版。文件名在 tree 中，blob 自己不记得“我叫 notes.txt”。

对象 ID 由对象类型、长度与内容参与计算。相同对象内容可复用；改一个字节可能产生新 ID。提交即使文件内容相同，父提交或说明变化也可能产生不同 ID，因此不要把“文件一样”理解成“提交一样”。ID 长度还取决于仓库的对象格式，不必死记成固定 40 位。

Git 对外表达的是快照之间的关系。查看差异时，它再比较快照；内部打包可能使用压缩和 delta 节省空间，不改变这个模型。重命名通常也是比较时推断出的相似关系，并不存在专用的“重命名对象”。

### 分支和 HEAD 是找到提交的入口

**引用（reference）**为对象提供容易记住的名字。`main` 是本地分支引用；`HEAD` 通常符号指向当前分支。沿 commit 的 parent 可以继续找到更早的提交，这就是历史可达性。

```text
HEAD → main → 第二版提交 → 第一版提交
                 ↓            ↓
              第二版 tree   第一版 tree
```

分支不是一份整目录副本，也不会复制所有历史。查看分支位置可用 `git branch -v`，查看 HEAD 指向哪个分支可用 `git symbolic-ref --short HEAD`。

`origin/main` 则通常是本地保存的远端跟踪引用，表示最近一次相关同步所观察到的远端位置；它不是服务器的实时窗口。这个区别会在 [本地模拟远端](../chinese-guides/git-03-commits-remotes-pr-worktrees-collaboration.md#用两个本地副本看清远端同步) 中实际展示。

提交图有分叉和合流；日志的展示顺序还受选项影响。找“哪个变化包含在哪条历史里”，要看祖先关系，不能只凭时间戳先后。

### restore 先确定来源再确定落点

现在 HEAD 和暂存区是第二版，工作区是第三版。我们先把第三版暂存，再撤销暂存，最后明确丢弃练习文件中尚未提交的第三版：

```powershell example=git01-restore runtime=project
git add -- notes.txt
git restore --staged -- notes.txt
git show :notes.txt
Get-Content notes.txt
git restore -- notes.txt
Get-Content notes.txt
git status --short
```

三个读取结果依次是第二版、第三版、第二版；最后状态为空。`restore --staged` 默认从 HEAD 恢复暂存区，工作文件保持不动；普通 `restore` 默认从暂存区恢复工作文件，第三版就被覆盖了。

记成“来源 → 落点”更不容易出错：默认来源会随是否包含 `--staged` 改变，需要指定历史来源时写 `--source=某个提交`。若目标路径在来源里不存在，恢复也可能表现为删除该路径，不能把 restore 理解成只会补回文字。

恢复文件不移动分支。希望移动当前分支时，讨论的才是下一节的 reset。

### reset 和 revert 解决不同层次的问题

以下表格针对**带提交目标、不带路径**的 `git reset <模式> <提交>`，且当前 HEAD 附着在分支上。带路径的 reset 是暂存区操作，不要套用同一张表。

| 操作 | 当前分支与 HEAD | 暂存区 | 工作文件 |
| --- | --- | --- | --- |
| `reset --soft <提交>` | 移到目标 | 保留 | 保留 |
| `reset --mixed <提交>`，默认模式 | 移到目标 | 改为目标内容 | 保留 |
| `reset --hard <提交>` | 移到目标 | 改为目标内容 | 受影响文件被改为目标内容 |
| `revert <提交>` | 成功后新增一个提交 | 用于生成反向变更 | 应用反向变更，可能冲突 |

假设自己的未发布历史是 `A—B—C`，soft reset 到 B 后，C 的改动还在暂存区，适合重新整理提交。若 C 已被团队使用，新增一个反向提交 R 通常更好说明发生了什么：历史成为 `A—B—C—R`，其他人的 C 仍能被追溯。

`reset --hard` 不是“撤销但替我保管所有东西”：未提交的受影响修改会丢失，妨碍写入目标文件的未跟踪路径也可能被覆盖或移除。它也不等于清除所有未跟踪文件。先确认对象、路径和需要保留的内容，再决定是否使用。

`revert` 也不是删除旧提交，后续变更可能使反向补丁冲突。撤销 merge 还要选择主线并理解祖先关系，见 [撤销合并后的再次整合](../chinese-guides/git-02-branches-merge-rebase-conflicts.md#撤销合并后仍要看祖先关系)。

### 用 reflog 找回被移走的入口

继续当前干净的小仓库。我们先记下第二版 ID，再把分支退到第一版。用 mixed 模式是为了保留工作文件，便于同时观察“历史变了，内容还在”。

```powershell example=git01-reflog runtime=project
$second = git rev-parse HEAD
git reset --mixed HEAD~1
git log --oneline
git reflog -3
git show 'HEAD@{1}:notes.txt'
git branch codex/rescue 'HEAD@{1}'
git show codex/rescue:notes.txt
git rev-parse codex/rescue
```

普通日志只从第一版往前走，reflog 还记录刚才第二版所在的位置。这里的 `HEAD@{1}` 是“本次连续操作中，HEAD 的上一条记录”；读者如果又切分支或提交，序号就可能变化，应先查日志再选择。PowerShell 中含花括号的修订表达式要加引号。

两个 `show` 都应读到第二版，救援分支的 ID 应等于 `$second`。先建一个名字把目标固定下来，之后再决定切过去、挑选变更或整理当前分支。不要在找到对象之前继续反复 reset。

**reflog** 是本地引用移动记录，有保留期限，不随普通 clone 自动复制。记录过期、对象被清理后，不能保证恢复。`git fsck --no-reflogs` 可以帮助检查对象及可达性，但“未被引用的对象”可能只是旧实验，仍需读内容辨认；它也不能凭空找回从未被 Git 保存的编辑器文字。

### detached HEAD 可以工作但要及时命名

先把练习仓库 main 恢复到已救回的第二版。此时工作文件恰好与第二版相同，mixed reset 会更新暂存区而保留它。再进入第一版做一次临时提交：

```powershell example=git01-detached runtime=project
git reset --mixed codex/rescue
git switch --detach HEAD~1
'scratch=1' | Set-Content -Encoding utf8NoBOM scratch.txt
git add -- scratch.txt
git commit -m '在旧版本试写一条笔记'
git switch -c codex/scratch
git status --short
```

**detached HEAD** 表示 HEAD 直接指向提交，没有附着在普通分支上。仍然可以查看、构建和提交；创建 `codex/scratch` 后，临时提交就有了稳定入口。若未命名便切走，它可能只能靠 reflog 等线索找回。

`commit --amend` 同样值得用对象模型理解：它生成替代提交并移动当前入口，不是原地擦掉旧对象上的文字。修改已共享历史前，先确认他人是否以它为基线；相关协作边界见 [推送保护](../chinese-guides/git-03-commits-remotes-pr-worktrees-collaboration.md#lease-比较的是你明确确认过的远端位置)。

### 未跟踪文件和忽略规则不等于备份

`?? draft.txt` 表示 Git 尚未跟踪这个文件。忽略规则只是让特定未跟踪路径不那么容易进入状态展示和 add；已经跟踪的文件，不会因为后来写入 `.gitignore` 就退出历史。

| 想处理的内容 | 先观察 | 容易误判的地方 |
| --- | --- | --- |
| 普通未提交修改 | `git diff` 与 `git diff --staged` | 两层可能保存不同版本 |
| 未跟踪文件 | `git status --short --untracked-files=all` | 没有 commit 的内容不能靠日志找回 |
| 临时搁置 | `git stash list`、`git stash show -p` | 默认 stash 不包含未跟踪文件；`-u` 另含未跟踪，`-a` 还含忽略文件 |
| 清理候选 | `git clean -nd` | 这里只预览；执行删除后 Git 通常无法恢复未跟踪内容 |

stash 适合短时中断，但会把现场移走；共享目录里应先确认改动归属。重要成果更适合有名称的分支和明确提交。多人同时工作时，优先理解 [worktree 的独立范围](../chinese-guides/git-03-commits-remotes-pr-worktrees-collaboration.md#worktree-给每项工作一份独立现场)。

密钥误提交时，删除当前文件不撤销已经泄露的凭据。应先使泄露凭据失效，再按团队流程清理历史、副本与制品；忽略规则只能减少再次误加的机会。签名能用于核验特定密钥对对象的签署，也不证明代码已通过评审或不存在漏洞。

### 恢复完成要同时核对内容与历史

“文件回来了”只是一个结果。恢复后再回答三个问题：目标内容是否正确，目标提交是否仍能从所需分支到达，当前暂存和工作区是否包含预期变化。可以分别用 `git show`、`git log --graph --oneline --all`、两种 `git diff` 查看。

不同仓库形式也会影响观察边界。裸仓库通常用于保存和交换对象与引用，没有普通检出目录；浅克隆可能缺少早期历史；部分克隆可能延后获取某类对象；稀疏检出限制工作目录展开的范围。文件没出现在眼前，不一定表示服务器没有，反过来也不能把一次 clone 当作全部交付数据的完整备份。

继续学习时，先在 [GIT-02](../chinese-guides/git-02-branches-merge-rebase-conflicts.md#git-02) 看分支如何移动和整合，再到 GIT-03 看这些动作在协作中如何约定。调试时遇到“昨天正常，今天坏了”，可以沿 [版本二分](../chinese-guides/debug-01-systematic-debugging-evidence-causality.md#用稳定的判定找出首个异常版本) 找变化边界。

### 参考与延伸阅读

- [Pro Git：Git 对象](https://git-scm.com/book/en/v2/Git-Internals-Git-Objects)：查看 blob、tree、commit 的实际结构与对象存储。
- [git diff](https://git-scm.com/docs/git-diff)：查询比较端点、暂存差异和路径参数。
- [git restore](https://git-scm.com/docs/git-restore) 与 [git reset](https://git-scm.com/docs/git-reset)：确认来源、目标层和覆盖范围。
- [git reflog](https://git-scm.com/docs/git-reflog)：查询引用日志、修订写法和保留规则。
- [git stash](https://git-scm.com/docs/git-stash)、[git clean](https://git-scm.com/docs/git-clean) 与 [gitignore](https://git-scm.com/docs/gitignore)：处理临时修改和未跟踪路径时再查完整选项。

正文以原创小仓库讲清机制，命令细节于 2026-09-09 对照 Git 官方手册；终端提示和对象 ID 以你的实际运行结果为准。
