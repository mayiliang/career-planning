# 前端系统化调试中文核心讲义

## DEBUG-01

### 1. 调试不是猜修复，而是缩小因果范围

Systematic Debugging（系统化调试）的最小闭环是：

> 固定现象 → 建立可重复用例 → 排序假设 → 采集能证伪的证据 → 单变量实验 → 最小修复 → 回归与监控

重要术语：

- **Symptom（现象）**：用户或系统实际观察到的偏差，如“旧搜索结果覆盖新结果”。
- **Expected/Actual（预期/实际）**：同一输入和环境下应该发生与实际发生的可比较结果。
- **Reproduction（复现）**：用明确步骤再次产生现象；“偶尔看到过”不是复现。
- **Minimal Reproducible Example, MRE（最小可复现用例）**：保留必要输入、时序和环境，删去无关变量的最小场景。
- **Heisenbug（观察者效应缺陷）**：加入日志、暂停或改变时序后就消失/变化的故障；这不证明故障不存在。
- **Hypothesis（假设）**：可被证据推翻的原因候选。
- **Falsifiability（可证伪性）**：事先写出“看到什么就判此假设不成立”。
- **Confounder（混杂变量）**：同时变化、会让因果判断失真的变量，如版本和缓存一起变。
- **Control（对照）**：只改变一个目标变量，其余输入、账号、网络、缓存和浏览器保持一致。
- **Correlation（相关）与 Causation（因果）**：`X-Cache:HIT` 与故障同现只是相关；必须证明改变缓存路径会稳定改变结果，才能进入因果链。
- **Regression Test（回归测试）**：修复后长期防止同一机制再次出错的自动检查。

禁止从“handler 这一行报错”直接跳到“改 handler”。堆栈是异常被观察的位置；根因可能是更早的请求顺序、错误构建映射或旧缓存输入。

### 2. 固定事件卡片

本点只调试一个固定 fixture：

| 字段 | 固定值 |
| --- | --- |
| 正常版本 | `v17` |
| 异常版本 | `v18` |
| 生产栈 | `app.min.js:1:1842` |
| Source Map 预期映射 | `src/search/handler.ts:42:11`，必须来自 v18 同一制品 |
| 网络证据 | 两次 `/search?q=a`；S1 30ms，S2 10ms；响应含 `X-Cache: HIT` |
| 实际 | v18 偶发先呈现 S2，再被 S1 旧数据覆盖 |
| 预期 | 最终始终为 S2；S1 只能标记 stale/aborted，不能提交 UI |
| 限定假设 | 请求竞争、构建/Source Map 不匹配、缓存版本错误 |

先填写而不修改代码：浏览器与系统、账号/区域、精确 URL、请求序号、发布版本/commit、静态资源散列、时间戳、复现率、预期/实际截图。Cookie、Authorization、用户查询和个人数据只保留必要且脱敏的字段。

### 3. 用假设矩阵决定下一步

| 假设 | 若为真应观察到 | 可证伪证据 | 最小实验 |
| --- | --- | --- | --- |
| H1 请求竞争 | S2 先完成/提交，S1 后完成并再次提交；v18 缺少 sequence/Abort 守卫 | 响应完成顺序不同但提交始终只发生一次，或旧提交代码不可达 | 对两次请求加不暂停的 logpoint，记录 start/resolve/commit 序号 |
| H2 Source Map 错配 | v18 栈与 map/制品 release 不一致，映射位置在当前源码无对应语句 | JS 和 map 散列/发布 ID 一致，映射位置与调用栈、局部变量吻合 | 只替换为同 release 私有 map 重新映射，不改运行代码 |
| H3 缓存版本错误 | HTML、JS、API 响应或 map 的 release/ETag/内容散列不一致；HIT 命中旧对象 | HIT/MISS 返回相同 release/正文，资源散列与 v18 manifest 一致 | 对同一输入比较一次受控 revalidate/MISS，不全局清缓存 |

每个实验只改变一个变量。`v18 + 当前缓存` 与 `v17 + 当前缓存` 是版本对照；`v18 + HIT` 与 `v18 + 受控 MISS` 是缓存对照。若同时回滚版本并清缓存，即使现象消失也不能判断原因。

### 4. 选择能在“错误发生处”暂停的断点

Breakpoint（断点）不是越多越好；按未知范围选最短路径：

| 类型 | 适用问题 | 固定 fixture 用法 |
| --- | --- | --- |
| Line Breakpoint（行断点） | 已知具体代码区域 | 在 mapped handler 提交状态前暂停 |
| Conditional Breakpoint（条件断点） | 循环/高频路径只看特定条件 | `sequence !== latestSequence` 时暂停 |
| Logpoint（日志点） | 不能因暂停改变异步时序 | 输出 requestId、sequence、resolve/commit 时间，不改源码 |
| DOM Change Breakpoint（DOM 更改断点） | 不知道谁修改/删除节点 | 旧结果写入目标节点时抓调用栈 |
| Event Listener Breakpoint（事件监听器断点） | 不知道哪个 click/input handler 执行 | 从搜索输入或提交事件进入监听器 |
| XHR/Fetch Breakpoint（XHR/提取断点） | 不知道谁发出某 URL 请求 | URL 包含 `/search` 时在发送处暂停 |
| Exception Breakpoint（异常断点） | 错误被捕获/吞掉或异步 reject | 分别测试捕获与未捕获异常暂停 |
| Function Breakpoint（函数断点） | 已拿到函数对象但不便找文件 | 控制台 `debug(commitSearchResult)` |

Logpoint 不暂停，更适合 30/10ms 竞态；普通断点会改变调度，可能制造或隐藏 Heisenbug。条件表达式和日志点也会执行代码，不能放有副作用的函数调用。

### 5. 调用栈、异步栈、作用域和 Worker

- **Call Stack（调用栈）**：当前同步函数调用链；最上方是暂停位置，不等于根因位置。
- **Async Stack（异步调用栈）**：把 Promise、timer、事件等异步任务与其调度来源关联起来；用它追溯“谁启动了请求”。
- **Scope（作用域）**：当前暂停位置可访问的局部、闭包、模块和全局绑定。
- **Closure（闭包）**：函数连同其词法环境。竞态常因两个回调捕获了不同或错误共享的 sequence/state。
- **Execution Context（执行上下文）**：页面、iframe、Worker 等有不同全局环境；控制台和断点必须切到实际执行代码的上下文。
- **Ignore List（忽略列表）**：折叠框架/第三方调用帧以突出应用代码；不能删除真实因果，只改变展示。

暂停 S1 commit 时记录：局部 sequence、全局 latestSequence、响应 requestId、当前 release、调用栈、async parent。不要在 Scope 中随手修改值后把“现象消失”当修复；这只是实验。

### 6. Source Map 必须与制品严格配对

Source Map（源代码映射）把 Generated Code（生成/压缩代码）的位置映射到 Authored Source（编写的源码）。部署文件通常通过 `//# sourceMappingURL=...` 关联 map；浏览器实际执行的仍是生成代码。

固定映射校验：

1. 从生产错误记录 release=`v18`、JS URL、响应 ETag/内容散列和 `1:1842`；
2. 取得 v18 构建产物及其 map，不使用“本地最新 main”的 map；
3. 校验 JS 与 map 都属于同一构建 ID/manifest，且 map 的 `file`/sources 指向该 bundle；
4. 将 `1:1842` 映射到 `src/search/handler.ts:42:11`；
5. 在 Sources 的 Authored 与 Deployed 文件间跳转，确认断点、调用栈、局部变量和语句语义一致；
6. 若同一制品在两次映射中得到不同源码位置，先判映射证据无效，不继续改源码。

Minification（压缩/最小化）会重命名和合并代码；Pretty Print（美化）只格式化生成代码，不等价于恢复源码。map 可能含 `sourcesContent` 和内部路径，公开部署会泄露源码/架构。更稳妥的生产策略是将 map 按 release 私有上传到错误平台，控制访问和保留期；是否公开需经过安全评估。

### 7. Network、缓存与存储证据

固定 HAR 至少保存：请求开始/完成时间、Initiator、状态、`X-Cache`、Age、ETag、响应中的 release/request ID、是否来自 Service Worker、请求序号。HAR 分享前去掉 Cookie、Authorization、请求/响应正文中的敏感数据。

`X-Cache:HIT` 不能单独证明缓存错。要回答：

- HIT 的是 CDN、浏览器 HTTP Cache 还是 Service Worker？
- 命中的 URL/`Vary` key 与输入是否一致？
- HTML、JS、map 与 API 响应分别标示哪个 release？
- HIT 与受控 revalidate/MISS 的正文散列是否不同？
- 即使缓存返回同一份正确数据，S1/S2 的 UI commit 顺序是否仍错误？

Application 面板核对 Cookie、Local/Session Storage、IndexedDB 与 Service Worker 版本。查看不等于删除；固定挑战禁止以“清缓存后好了”结束排查。

### 8. 生产日志、Trace 与隐私

- **Correlation ID（关联 ID）**：贯穿前端请求、网关和服务日志的稳定标识。
- **Trace（追踪）**：一次端到端事务的整体时间线。
- **Span（跨度）**：Trace 中一个操作的开始、结束、状态与父子关系。
- **Sampling（采样）**：只收集部分事件以控制成本；低频严重错误需提高保留策略。
- **Redaction（脱敏）**：删除或替换 token、Cookie、个人数据和敏感正文。

建议结构化字段：`timestamp`, `release`, `route`, `requestId`, `sequence`, `phase=start|resolve|commit|drop`, `durationMs`, `cacheStatus`, `httpStatus`, `errorCode`。不要把完整搜索词、访问令牌或用户对象写入日志。

日志能证明顺序，Performance/Trace 能证明调度与耗时，HAR 能证明网络和缓存，Source Map 能把生成位置对应到源码，Git 历史能定位引入提交；四类证据互相补充，不能互相冒充。

### 9. `git blame` 与 `git bisect` 的正确边界

`git blame` 显示一行最后一次修改的提交，还可用 `-L` 限制范围、`-C` 追踪移动/复制来源。它用于找到上下文，不用于指责作者，也不能证明该提交就是根因。

`git bisect` 用 Good（正常）与 Bad（异常）提交做二分。前提是判定脚本 Deterministic（确定）：同一提交、同一 fixture 多次运行结果一致。

```sh
git bisect start v18 v17
git bisect run pnpm test -- search-race.bisect.test.ts
git bisect reset
```

判定脚本约定：返回 0 表示 good，1–127（125 除外）表示 bad，125 表示当前提交无法测试而跳过。每个提交都要用锁定依赖和同一 30/10ms Mock；若脚本偶发通过，先修复测试，不能相信“first bad commit”。结束后必须 `git bisect reset` 回到原工作状态。

### 10. 固定证伪流程

1. **不改代码复现**：v18 连跑固定 fixture 至少 20 次，记录失败率与 S1/S2 时间线；v17 同样运行作对照。
2. **验证映射**：把 `app.min.js:1:1842` 用 v18 同制品 map 映射并保存 Authored/Deployed 截图、散列与 release。
3. **验证竞态**：用 logpoint 记录 start/resolve/commit；若 S1 在 S2 后 commit，H1 获得支持。
4. **验证缓存**：比较同 v18、同输入下 HIT 与受控 revalidate/MISS 的 release/正文散列；不清全局缓存。
5. **自动二分**：只有判定脚本稳定后运行 bisect，保存每个 good/bad 和 first bad commit。
6. **最小修复**：在 UI commit 前加入 sequence/Abort 守卫，不顺带重写请求层。
7. **回归**：30/10、10/30、相同完成时刻、Abort 被忽略、HIT/MISS、v17/v18 fixture 都测试；再检查无多余请求。

若证据显示 map 错配，先修发布制品关联并重新取证；若缓存 release 错配，修缓存 key/失效策略并重新取证。三种原因可以同时存在，但每一项必须有独立证据。

### 11. 最小修复与回归示例

```js
let latestSequence = 0;

async function runSearch(query) {
  const sequence = ++latestSequence;
  trace({ sequence, phase: 'start' });
  const data = await fetchSearch(query);
  trace({ sequence, phase: 'resolve' });

  if (sequence !== latestSequence) {
    trace({ sequence, phase: 'drop' });
    return;
  }

  commitSearch(data);
  trace({ sequence, phase: 'commit' });
}
```

回归断言不是“没有抛错”，而是最终 UI、commit 序列、请求数、release/map 配对与缓存来源都满足契约。复测仅把生产版本 v18 改为 v17，输入和缓存保持不变：如果故障消失，只能说明版本差异与故障相关；结合稳定 bisect 才能定位 first bad commit。

### 12. 交付清单与自检

固定四类证据：

1. 复现卡与 20 次时间线，含预期/实际和环境；
2. 断点/async stack/Source Map 配对记录；
3. 清理 HAR、HIT/MISS 对照与 storage/SW 版本；
4. bisect good/bad 日志、first bad commit、最小补丁和回归测试。

自检：

- 为什么 logpoint 比暂停断点更适合 30/10ms 竞态？
- Source Map 指向 handler 为什么仍不能证明 handler 是根因？
- `X-Cache:HIT` 还缺哪两个对照才能支持缓存因果？
- 为什么不稳定的 bisect 判定脚本会给出可信外观下的错误提交？
- 回滚到 v17 为什么是实验和缓解，不是最终根因证明？

能以事实、假设、证据、排除项和回归逐项回答，才算掌握 DEBUG-01。
