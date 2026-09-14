# 调试知识点讲义

## DEBUG-01 系统化调试、证据与因果定位

“刷新一下就好了”“应该是缓存”“这行是昨天改的”，都可以成为线索，但还不是结论。调试要把模糊的不正常，逐步变成能复现的事实、能区分的候选原因，以及能说明为什么有效的修复。

本篇围绕三种常见现象展开：零值被默认值覆盖、连续搜索显示旧结果、切换语言后仍读到旧文案。你会亲手控制变量和完成顺序，再把同样的方法用于浏览器工具与版本定位。

### 学习前先确认

本讲无站内硬前置。JavaScript 例子会解释调试所需的语义；Git 二分是可选的工具练习，没学过 Git 可以先读其他部分。通用代码可在现代浏览器控制台或 Node.js 中运行；完整 HTML 页面可保存后直接打开。Git 练习另外需要 PowerShell 7、Git 和 Node.js。

### 先把现象写成别人能重现的事实

**复现（reproduction）**是一组能让别人比较结果的输入和步骤，不是“再点几次试试”。先记录预期、实际、环境和触发条件，暂时把原因留空。

| 模糊描述 | 可用于下一步的事实 |
| --- | --- |
| 数量设置失效 | 数值输入为 0 时，保存结果是 20；输入 5 时结果是 5；预期 0 表示不加载 |
| 搜索有时倒退 | 先搜 a 再搜 ab，ab 先完成、a 后完成时，最后显示 a |
| 英文页面还是中文 | 同一资料先中文读取、再切英文，第二次读取仍是中文；新开无状态环境首次英文正常 |

第三条提示持久状态可能参与，但尚不能断言是哪层缓存。第二条记录了完成顺序，仍未证明请求层、状态层还是渲染层出了问题。

最小复现要保留机制需要的条件。删掉缓存以后故障消失，缓存就可能是关键条件；把并发改成串行后“正常”，也可能只是移除了触发顺序。每次删减后都要重新确认现象仍在，而不是只追求代码最短。

### 从一个零值例子练习单变量实验

下面函数想在“没有配置数量”时默认使用 20。先观察，不急着修改：

```js example=debug01-default-value
function readLimit(value) {
  return value || 20;
}
console.log(readLimit(0)); // => 20
console.log(readLimit(5)); // => 5
console.log(readLimit(undefined)); // => 20
```

假设“输入框没有把 0 传进来”，最便宜的区分实验是绕过输入框，直接调用函数。上面已经做到这一点：输入明确是数值 0，输出仍是 20，所以这个函数本身就足以产生现象。

`||` 选择右侧值的条件是左侧为 falsy，0 也满足；需求却只想把 null 或 undefined 当作缺省。把这一处条件改成 **空值合并（nullish coalescing）**：

```js example=debug01-default-fix
function readLimit(value) {
  return value ?? 20;
}
console.log(readLimit(0)); // => 0
console.log(readLimit(5)); // => 5
console.log(readLimit(undefined)); // => 20
console.log(readLimit(null)); // => 20
```

旧实现稳定失败，新实现保留 0，并维持普通值和缺省值行为，这条证据链很短。它只覆盖这里约定的输入：`??` 不会替你校验负数、字符串或 NaN。如果真实页面传来的是字符串 `"0"`，还要单独确认解析边界，不能把所有输入问题都归为同一个原因。

### 每个假设都要有能推翻它的观察

对于“连续搜索显示旧结果”，先画数据经过的路径：

```text
输入 → 发起读取 → 得到响应 → 决定是否写入状态 → 页面显示
          A、B         B、A            ?
```

输入顺序是 A 后 B，完成顺序却可以 B 后 A。接下来列出真正能区别的候选：

| 假设 | 若为真，预计看到 | 最小区分实验 |
| --- | --- | --- |
| 服务端给 B 返回了 A 的数据 | B 的原始响应已是错的 | 按请求身份对照参数和响应 |
| 响应正确，旧 A 又写入状态 | 响应各自正确，提交顺序为 B、A | 记录 resolve 与 commit 阶段 |
| 状态已是 B，视图仍用旧值 | 最后状态正确，页面文字不同 | 同一次交互对照状态与 DOM |

实验顺序优先考虑区分能力和成本。读取响应比重写组件便宜；核对部署版本比先升级依赖更容易归因。一次同时清缓存、换账号、重启服务，现象即使消失，也很难知道是哪一个动作有效。

事实可以写“最后一次状态写入来自 A”，推断再写“缺少最新请求身份判断”。把两者分开，后来发现新证据时才知道应修正哪一层结论。

### 用可控顺序把偶发现象变成确定过程

下面不访问网络。`start` 建立一个等待结果的 Promise，并保存它的完成函数；调用 `finish` 相当于交付结果。这样每次都能让 B 先完成，A 后完成，不用靠随机延迟碰运气。

```js example=debug01-controlled-race
async function observe(guarded) {
  let latest = 0;
  let view = 'empty';
  const pending = new Map();
  const events = [];
  function start(label) {
    const id = ++latest;
    events.push(`start:${label}`);
    const task = new Promise(resolve => pending.set(label, resolve));
    task.then(result => {
      events.push(`resolve:${label}`);
      if (guarded && id !== latest) {
        events.push(`drop:${label}`);
        return;
      }
      view = result;
      events.push(`commit:${label}`);
    });
  }
  async function finish(label) {
    pending.get(label)(label);
    // 让上面注册的 then 回调执行，再进行下一次交付。
    await Promise.resolve();
  }
  start('a');
  start('ab');
  await finish('ab');
  await finish('a');
  return { view, events: events.join(' > ') };
}
const before = await observe(false);
const after = await observe(true);
console.log(before.view); // => a
console.log(before.events); // => start:a > start:ab > resolve:ab > commit:ab > resolve:a > commit:a
console.log(after.view); // => ab
console.log(after.events); // => start:a > start:ab > resolve:ab > commit:ab > resolve:a > drop:a
```

两次运行只改变了是否启用提交守卫，输入和交付顺序相同。旧实现把 A 写回去；修复后仍允许 A 完成，但忽略了它的结果。日志支持“在写入状态的边界检查身份”这个修复，而不是证明“网络需要更快”。

真实页面还要考虑失败结果、页面切换、卸载和取消。取消可以节省资源，结果是否仍有资格提交则是另一个问题；框架中的完整处理见 [React 请求身份](../chinese-guides/react-04-effects-external-sync-cleanup.md#请求能否取消和结果能否提交是两个问题)。

### 在一个小页面里找到最后写入的人

把下方完整代码保存为 `race-lab.html` 并在桌面 Chrome 打开。点击“发起两次搜索”，先交付 B，再交付 A；旧行为最后显示 a。勾选保护后重新发起，再按相同顺序交付，最后保持 ab。

这是手动交付结果的页面，按钮不发送 HTTP 请求。因此 Network 面板没有搜索请求是正常的；它让你专注于“响应交付之后谁改了界面”。

```html example=debug01-race-page runtime=project file=race-lab.html
<!doctype html>
<html lang="zh-CN">
<meta charset="UTF-8">
<title>观察搜索结果的写入顺序</title>
<style>
  body { max-width: 840px; margin: 64px auto; padding: 0 24px; color: #172b43; background: #f3f6fa; font: 17px/1.8 system-ui; }
  main { background: white; padding: 32px; border-radius: 18px; box-shadow: 0 12px 40px #17304b12; }
  button { padding: 10px 16px; margin: 8px 8px 8px 0; border: 1px solid #9aacc2; border-radius: 8px; background: #fff; color: inherit; cursor: pointer; }
  button:focus-visible { outline: 3px solid #246bd5; outline-offset: 3px; }
  button:disabled { opacity: .5; cursor: default; }
  #result { padding: 16px; background: #eaf2ff; border-radius: 10px; }
  pre { white-space: pre-wrap; padding: 16px; background: #f4f6f8; font-size: 14px; }
</style>
<main>
  <h1>谁最后写入了搜索结果？</h1>
  <p>请求已经发起，完成顺序由你控制。先交付 B，再交付 A。</p>
  <label><input id="guard" type="checkbox"> 只接纳最新请求</label>
  <div>
    <button id="start">发起两次搜索</button>
    <button id="finish-b" disabled>交付 B：ab</button>
    <button id="finish-a" disabled>交付 A：a</button>
  </div>
  <p id="result" role="status">等待发起</p>
  <pre id="events" aria-label="本次顺序记录"></pre>
</main>
<script>
  const result = document.querySelector('#result');
  const events = document.querySelector('#events');
  const guard = document.querySelector('#guard');
  const buttonA = document.querySelector('#finish-a');
  const buttonB = document.querySelector('#finish-b');
  const pending = new Map();
  let latest = 0;
  let protectedRun = false;
  function record(phase, id, label) {
    const line = `${phase} #${id} ${label}`;
    events.textContent += line + '\n';
    console.log(line);
  }
  function startSearch(label) {
    const id = ++latest;
    record('start', id, label);
    pending.set(label, () => {
      record('resolve', id, label);
      if (protectedRun && id !== latest) {
        record('drop', id, label);
        return;
      }
      result.textContent = label;
      record('commit', id, label);
    });
  }
  document.querySelector('#start').addEventListener('click', () => {
    pending.clear();
    events.textContent = '';
    result.textContent = '读取中';
    protectedRun = guard.checked;
    startSearch('a');
    startSearch('ab');
    buttonA.disabled = false;
    buttonB.disabled = false;
  });
  for (const [button, label] of [[buttonA, 'a'], [buttonB, 'ab']]) {
    button.addEventListener('click', () => {
      pending.get(label)?.();
      pending.delete(label);
      button.disabled = true;
    });
  }
</script>
</html>
```

这份页面刻意把“交付”直接接到回调，没有模拟网络耗时或 Promise 调度。页面和前一例证明的是同一个提交规则；真实异步调度要回到上一例及实际请求现场观察。

打开 DevTools 的 Elements，找到 `#result`，右键选择 Break on → Subtree modifications，再点击交付按钮。暂停后沿 Call Stack 查看，是哪条回调写了结果，并在 Scope 中对照 `id`、`latest`、`label`。重新发起时“读取中”的写入也会触发断点，这是另一次写入，不要误认为它就是故障。

在 Sources 中也可给写入行设条件断点 `id !== latest`：旧行为下交付 A 时会停住。断点表达式应只读取状态，不调用会改数据的函数。想保留时间顺序而不暂停，可使用 **logpoint**，记录同样的身份与阶段。

### 工具显示的现场有各自的边界

**调用栈（call stack）**告诉你当前是怎样走到这里的；最上层是当前执行或报错位置，不保证最早的错误就在这里。异步栈能在支持的场景下补充调度来源，但不是完整的用户交互录像。

| 想回答的问题 | 优先使用 | 不能单凭它证明什么 |
| --- | --- | --- |
| 谁修改了这个节点 | DOM 变化断点 | 上游响应一定正确 |
| 谁抛出后又吞掉异常 | 已捕获或未捕获异常暂停 | 所有异常都影响用户结果 |
| 特定状态何时出现 | 条件断点或 logpoint | 开启工具前也是相同时序 |
| 请求由谁发起 | Network 的 Initiator | 响应一定被当前页面采用 |
| 为什么对象一直保留 | Heap snapshot 的 retaining path | 任何大对象都属于泄漏 |

暂停会改变主线程与回调时序。加了断点后故障消失，可能是观察扰动，常被称为 **Heisenbug**；不能由此说问题已经修复。保留不开断点的对照，必要时改用低开销阶段日志。

页面、iframe、Worker 和 Service Worker 有不同执行上下文。先确认控制台选中了谁、断点对应哪个实际脚本。同名变量出现在另一个上下文里，并不能解释当前页面。对于会继续变化的对象，优先记录必要的原始值；之后展开一个对象的控制台展示，未必等同于最初记录时的内容快照。

### 网络和缓存要沿数据来源逐层区分

真实搜索故障可在 Network 中对照 URL、参数、状态、响应正文、开始与完成时间、Initiator 和缓存来源。HTTP 200 只说明得到了协议层的成功响应；错误业务数据、旧数据和随后被丢弃的数据都可能带着 200。

先明确缓存所在层：浏览器 HTTP 缓存、Service Worker 的 Cache Storage、CDN、服务端缓存，以及应用自己的内存缓存。DevTools 的 Disable cache 主要用于浏览器缓存对照，不能因此宣称绕过了所有层。

下面用内存 Map 说明“缓存键漏了输入维度”怎样稳定产生错文案：

```js example=debug01-cache-key
function createReader(includeLanguage) {
  const cache = new Map();
  return (id, language) => {
    const key = includeLanguage ? JSON.stringify([id, language]) : id;
    if (!cache.has(key)) {
      cache.set(key, language === 'zh' ? '闭包' : 'Closure');
    }
    return cache.get(key);
  };
}
const oldReader = createReader(false);
console.log(oldReader('js-01', 'zh')); // => 闭包
console.log(oldReader('js-01', 'en')); // => 闭包
const fixedReader = createReader(true);
console.log(fixedReader('js-01', 'zh')); // => 闭包
console.log(fixedReader('js-01', 'en')); // => Closure
```

这里只改了 key 是否包含 language，其他输入顺序没变。清空缓存能暂时让首次英文正常，却没修复“下一次切换又混用”的机制。真实缓存还需考虑数据版本、失效和容量；私人数据更要在可信服务端验证身份与访问权，不能以“客户端加个 userId 到 key”代替授权。

`X-Cache: HIT` 也只说明某一层报告命中。先确认是哪一层，再比较受控 HIT 与 MISS 的参数、正文和版本。清空全部存储最多说明某个状态参与了问题；Cookie、Local Storage、IndexedDB 和 Service Worker 各自负责什么，应逐层做窄对照。导出 HAR 或日志前删去令牌、Cookie 和不必要的个人信息。

### Source Map 必须和实际运行的制品配对

**Source Map** 把生成代码的位置映射回作者源码。浏览器执行的仍是生成后的脚本，编辑器中的最新文件不自动等于线上执行版本；Pretty Print 只是整理生成代码的排版。

例如错误记录是 `app.ab12.js:1:640`，你手头却只有另一构建的 `app.cd34.js.map`。就算它能给出一个“看起来像 handler”的位置，也不能用它断言该函数有错。

可靠做法是先保存实际 release、脚本 URL、内容散列和生成位置，从同一次构建取得 JS、map 和清单，再在 DevTools 的 Developer Resources 检查 map 是否加载成功。最后核对映射语句与暂停时的参数、调用语义能否对上。

映射正确仍只说明“这段生成代码来自这里”。如果函数收到的是更早请求的数据，真正需要解释的还是上游时序。框架部署中的版本边界可继续看 [依赖、锁文件与制品证据](../chinese-guides/react-09-compiler-rsc-security-upgrades.md#依赖声明锁文件与部署制品不是同一份证据)。

生产 map 可能附带源码或内部路径，应按项目发布策略决定公开、私有上传和保留范围。这里提供核对方法，不预设所有项目都必须公开 map。

### 日志应该连接状态变化而不是堆文字

为一次读取分配请求身份，记录 `start → resolve → commit/drop`，比“进入函数”“请求完成”更有判断力。跨浏览器和服务端时可用 **correlation ID** 关联同一次事务；trace 则可进一步组织多个阶段的跨度。

针对搜索竞态，最少记录 release、请求 ID、序号、阶段和必要耗时。真实查询词往往无需全文采集，可以记录长度或脱敏类别。跨机器的时间戳可能有时钟偏差，序号与请求关系可以补足单纯排序时间的不足。

日志缺失不等于事情没发生：采样、页面关闭、上报失败都可能让记录不完整。结论要写清观察范围，例如“在已采集的 12 次复现中，最后的错误提交均来自旧请求”，比“从日志证明绝不会再发生”可靠。

### 用稳定的判定找出首个异常版本

**bisect** 在已知正常与异常的提交之间逐步缩小范围。它适合回答“这个确定行为从哪个版本开始改变”，不是从历史里自动推导完整原因。`blame` 则显示行的修改归属，便于寻找上下文，也不自动证明因果。

这个可选练习为前面的 0 值问题建立四次提交。全部内容在新临时目录中，判定脚本放在仓库外，避免检出旧版本时把判定本身一并换掉。

```powershell example=debug01-bisect-setup runtime=project
$lab = Join-Path ([System.IO.Path]::GetTempPath()) ('atlas-debug01-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path "$lab/repo" -Force | Out-Null
Set-Location -LiteralPath "$lab/repo"
git init -b main
git config user.name 'Atlas Learner'
git config user.email 'learner@example.invalid'
git config core.autocrlf false
'module.exports = value => value ?? 20;' | Set-Content -Encoding utf8NoBOM limit.cjs
git add -- limit.cjs
git commit -m '保留零值数量'
$good = git rev-parse HEAD
'limit=number' | Set-Content -Encoding utf8NoBOM notes.txt
git add -- notes.txt
git commit -m '记录数量类型'
'module.exports = value => value || 20;' | Set-Content -Encoding utf8NoBOM limit.cjs
git add -- limit.cjs
git commit -m '调整默认数量表达式'
$introduced = git rev-parse HEAD
'limit=number; default=20' | Set-Content -Encoding utf8NoBOM notes.txt
git add -- notes.txt
git commit -m '补充默认值说明'
$bad = git rev-parse HEAD
@(
  'const fs = require("node:fs");',
  'const file = process.cwd() + "/limit.cjs";',
  'if (!fs.existsSync(file)) process.exit(125);',
  'const readLimit = require(file);',
  'process.exit(readLimit(0) === 0 ? 0 : 1);'
) | Set-Content -Encoding utf8NoBOM "$lab/check.cjs"
```

判定脚本用退出码 0 表示行为正常，1 表示 0 值被破坏；125 表示此处缺少目标文件，不能判断。真正的工程还应先确认依赖、构建和数据条件，否则安装失败可能被错当成产品故障。

```powershell example=debug01-bisect-run runtime=project
git bisect start $bad $good
git bisect run node "$lab/check.cjs"
$firstBad = git rev-parse refs/bisect/bad
$firstBad
git bisect log
git bisect reset
git rev-parse HEAD
```

找到的 first bad commit 应等于 `$introduced`，说明是“调整默认数量表达式”那次提交。使用本次二分记录的 `refs/bisect/bad` 核对结果；HEAD 可能仍停在最后测试的正常提交，不能直接把它当成答案。reset 后 HEAD 回到开始时的 `$bad`。接着读首个异常提交的 diff，结合 0 值实验解释 `||` 的作用，才完成机制定位。

`bisect run` 把 1～127 中除 125 外的退出码当作异常；命令不存在等环境错误也可能落在这个范围，运行前应先独立确认判定程序可用。跳过临近关键提交时，结果可能只剩多个候选，不能伪称唯一定位。行为如果曾坏过、修好、再坏，要先选定一次变化区间；随机失败则需要先控制时序或采用适当统计判定。

### 性能和内存问题先建立可比较的口径

“慢”可能是等待响应、主线程计算、布局、绘制或过多更新。先固定输入规模、设备、构建模式、缓存状态和测量起止点，再选择 Performance trace、框架 Profiler 或内存工具。框架层的例子见 [React 性能分层](../chinese-guides/react-07-performance-memo-large-lists.md#把用户等待的时间拆开看)。

例如“搜索 5000 条资料，点击到结果可见”，应比较相同数据与发布构建；只看到一个函数占用时间长，还要检查它是否在用户等待的关键路径、调用次数为何增加。缩短非关键工作不一定让用户更快看到结果。

内存则可以做“进入页面 → 打开预览 → 关闭 → 重复”的对照，比较相近回收条件下的 heap snapshot。若关闭后旧预览对象仍沿事件监听器被引用，**retaining path** 提供继续查谁持有它的线索。单次快照大可能是有效缓存或尚未回收，进程总内存还包括原生与图形资源，不能直接等同于 JavaScript 泄漏。

低频故障也要看样本量和发生条件。原本约 1% 的问题，运行几次未见没有多少排除力。先说明基线、分组、采样和观察窗口，再讨论“没有再次观察到”能支持多强的判断。

### 用最小修复和可复核记录结束排查

0 值例子只需改缺省判断，竞态例子要守住状态提交，语言缓存例子要补充真实输入维度。修复应切断已经证明的错误路径，避免在同一轮顺带升级框架、改写整个模块，让结果难以归因。

| 阶段 | 搜索竞态例子里的记录 |
| --- | --- |
| 事实 | 输入 a、ab，逆序交付后最后显示 a |
| 机制 | A 的响应正确，但它过期后仍有权提交 |
| 修复 | 写入前比较请求身份与当前身份 |
| 核对 | 逆序时旧实现失败、新实现保留 ab；继续核对顺序完成与错误分支 |
| 边界 | 可控返回验证了提交规则，实际服务和页面生命周期需另查 |

生产影响扩大时可以先回滚、关闭开关或降级，目标是恢复用户任务。缓解有效不等于证明根因；保留必要版本与现场，再调查触发和放大条件。例如旧 HTML 引用已删除 chunk，再叠加无限刷新恢复逻辑，可能是多个条件共同扩大了影响。

最终记录应让接手者知道：改了哪个变量，看到了什么，排除了什么，哪些结论仍是暂定。失败实验也有价值，因为它们缩小了范围。把可解释的修复组织成 [原子提交和 PR](../chinese-guides/git-03-commits-remotes-pr-worktrees-collaboration.md#pr-帮助别人完成一次有依据的决定)，证据就能继续跟着代码流转。

### 参考与延伸阅读

- [MDN：空值合并](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing)：核对缺省值与 falsy 的区别。
- [Chrome DevTools：断点](https://developer.chrome.com/docs/devtools/javascript/breakpoints)：查询条件断点、logpoint、DOM 与异常暂停。
- [Chrome DevTools：Network 参考](https://developer.chrome.com/docs/devtools/network/reference)：查看请求身份、发起来源、缓存和网络对照选项。
- [Chrome DevTools：Source Map](https://developer.chrome.com/docs/devtools/javascript/source-maps)：核对编写源码与部署脚本的对应关系。
- [git bisect](https://git-scm.com/docs/git-bisect)：运行版本二分前确认退出码、skip 和恢复规则。
- [Chrome DevTools：内存问题](https://developer.chrome.com/docs/devtools/memory-problems)：区分泄漏、内存膨胀与频繁回收。

正文与操作入口于 2026-09-09 审校。工具版本可能改变菜单位置，先理解每一步需要观察的证据，再按对应官方入口查找操作。
