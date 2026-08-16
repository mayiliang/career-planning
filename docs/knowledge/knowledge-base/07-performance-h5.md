# 07 性能、移动 Web 与媒体交付

所有“通过”均需满足[统一考核规则](00-assessment-rules.md)。性能结论必须有数据；移动端结论至少在一种真实移动设备或可靠设备环境中验证。所有现行中文资料均列于“学习资料”，并由首考题 1 逐项精确引用。

### Web 性能工程

## PERF-01 Core Web Vitals 与性能预算

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[07–09 内容审计中文讲义：PERF-01](../chinese-guides/content-audit-07-09.md#perf-01)、[Core Web Vitals](https://web.dev/articles/vitals?hl=zh-cn)、[Lighthouse Performance](https://developer.chrome.com/docs/lighthouse/performance/?hl=zh-cn)。覆盖分工：本地讲义=当前版本/条件记录、故障注入和验收证据；官方深页=指标定义、采集口径与实验室审计。覆盖范围：LCP、INP、CLS 等 Core Web Vitals 的定义、归因、实验室/RUM 差异、分位数和性能预算；覆盖页面类型、设备网络与回归门禁。
- 严格考核：挑战类型：DEBUGGING；首考题 1（资料定位）：只允许使用《07–09 内容审计中文讲义：PERF-01》《Core Web Vitals》《Lighthouse Performance》，回指讲义的预算/分位数段、Vitals 指标定义和 Lighthouse 实验室限制；首考题 2（机制解释）：固定三次测量中 LCP `2.4/4.1/2.7s`、INP `120/480/150ms`、CLS `.01/.03/.28`；说明 p75 为什么比平均值更能决定预算结论、渲染阻塞图片为何推高 LCP、长任务为何推高 INP；反例是仅一次 Lighthouse 绿色不能证明 RUM p75 合格，并回指上述资料；首考题 3（最小产出）：在 Chrome 126 mobile、4×CPU、1.6Mbps/150ms、无缓存条件下，对给定 `product.html` 连跑 5 次 Lighthouse 并导入给定 120 条 RUM JSON；提交 `budget.json`（LCP≤2500ms、INP≤200ms、CLS≤0.1）、5 份报告、p75 计算表、图片 `preload` 前后 diff 和命令。断言：优化后 RUM p75 LCP≤2500ms 且 INP/CLS 不劣化超过 5%；首考题 4（受限排错）：失败证据为图片已 preload 后实验室 LCP 从4100降至2600ms、RUM p75 INP 从150升至480ms，trace 显示第三方标签单次 360ms。仅列 3 个候选：标签长任务、RUM 样本分层错误、预算阈值误设；分别以禁用标签后的 trace、按设备分组重算 p75、核对 `budget.json` 证伪。对成立候选做最小修复（延后标签或修正分组/阈值），用同一 120 条数据和 5 次测量回归；首考题 5（学习复述）：解释为何预算必须同时标明用户群、分位数和采集条件。复测变式：仅把 CPU 节流从 4× 改为 6×；不变量是页面、RUM 样本和预算字段不变，预期 LCP/INP 变差，提交新增 5 份报告和前后 p75 差值。命题边界：只评价 Core Web Vitals、实验室与 RUM 口径和预算，不把业务转化率当性能证明。
- 通过标准：验证证据：`budget.json`、5 份实验室报告、120 条 RUM 的 p75 表、优化 diff，以及题 4 的候选—证伪—修复—同 fixture 回归链；预算同时写明设备、网络、样本群和阈值。否决项：用单次分数或平均值替代 p75、未证明 INP 未回归、没有可复算原始数据均不通过。评估边界：仅判定指标归因、采集口径与预算是否可复核，不判定视觉设计或业务价值。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## PERF-02 Network、资源加载与缓存优化

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[07–09 内容审计中文讲义：PERF-02](../chinese-guides/content-audit-07-09.md#perf-02)、[Chrome Network Reference](https://developer.chrome.com/docs/devtools/network/reference/?hl=zh-cn)、[HTTP Caching](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Guides/Caching)、[Resource Hints](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Reference/Attributes/rel/preload)、[Chrome 推测规则与预渲染](https://developer.chrome.com/docs/web-platform/prerender-pages?hl=zh-cn)、[web.dev 往返缓存](https://web.dev/articles/bfcache?hl=zh-cn)。覆盖分工：本地讲义=HAR 测量路径、反例与副作用验收；官方深页=缓存、提示、推测和 bfcache 的当前 API 语义。覆盖范围：瀑布流、关键资源、压缩、图片、第三方脚本、HTTP 缓存、资源提示、导航预取、Speculation Rules 的 prefetch/prerender、bfcache、激活检测、认证/存储/埋点副作用、资源浪费、兼容和降级；全部必读资料均为中文。
- 严格考核：挑战类型：DEBUGGING；首考题 1（资料定位）：只允许使用《07–09 内容审计中文讲义：PERF-02》《Chrome Network Reference》《HTTP Caching》《Resource Hints》《Chrome 推测规则与预渲染》《web.dev 往返缓存》，回指缓存指令、preload、预渲染副作用和 bfcache 限制；首考题 2（机制解释）：给定首页→详情的 HAR，首屏 hero 图 800KB、`app.js` 240KB、`POST /analytics`，解释 `Cache-Control` 如何决定 warm 命中、preload 如何改变关键请求优先级、`unload` 为何阻断 bfcache；反例是把详情预渲染为支付页会重复副作用，回指资料；首考题 3（最小产出）：在 Chrome 126、Fast 3G、空/热/返回三轮运行给定 `catalog` fixture；设置 hero 的 `max-age=86400`、`app.js` 的内容哈希缓存、hero preload，提交三份 HAR、响应头、bfcache notRestoredReasons、命中/浪费字节和导航时延表。断言：热缓存传输字节比冷缓存少≥40%，返回导航 `pageshow.persisted=true`，`POST /analytics` 每次导航恰好一次；首考题 4（受限排错）：失败日志为 warm HAR 仍下载 hero 800KB、预渲染产生两条 `POST /analytics`、`notRestoredReasons` 含 `unload-listener`。仅列 3 个候选：Vary/缓存键不匹配、预渲染未隔离埋点、unload 监听器；用响应头差异、禁用预渲染的请求计数、移除 unload 后返回记录证伪。最小修复为修正缓存键、在 prerendering 时延迟埋点、改用 pagehide；用同一三轮 HAR 回归；首考题 5（学习复述）：比较 prefetch、prerender 与 bfcache 的触发时机和副作用边界。复测变式：仅把预取后的用户状态从有效改为登录态失效；不变量是资源和缓存策略不变，预期详情不使用陈旧个性化数据，提交新的 HAR、请求头和页面状态截图。命题边界：不得预渲染支付、删除等不可逆页面。
- 通过标准：验证证据：冷/热/返回三份 HAR、响应头、bfcache 诊断、字节/时延计算与题 4 回归；正确性和副作用必须与性能数据一起提交。否决项：只给最快一次、缓存命中却返回陈旧登录态、重复执行业务 POST、或用不支持时的报错替代降级均不通过。评估边界：只判定资源加载、缓存、推测导航和 bfcache，不评价后端容量。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## PERF-03 主线程、渲染、长任务与交互响应

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[07–09 内容审计中文讲义：PERF-03](../chinese-guides/content-audit-07-09.md#perf-03)、[Chrome Performance](https://developer.chrome.com/docs/devtools/performance/?hl=zh-cn)、[Rendering Performance](https://web.dev/articles/rendering-performance?hl=zh-cn)、[Long Tasks API](https://developer.mozilla.org/zh-CN/docs/Web/API/PerformanceLongTaskTiming)、[中文｜MDN PerformanceObserver](https://developer.mozilla.org/zh-CN/docs/Web/API/PerformanceObserver)。覆盖分工：本地讲义=trace 故障注入、观测开销和复测证据；官方资料=渲染机制、工具操作与条目语义；重复的核心讲义已移出。覆盖范围：任务/微任务/帧、样式/布局/绘制/合成、长任务、Long Animation Frame、脚本归因、INP、`PerformanceObserver` 现场采集、分片/调度/Worker 和测量开销边界；全部必读资料均为中文。
- 严格考核：挑战类型：DEBUGGING；首考题 1（资料定位）：只允许使用《07–09 内容审计中文讲义：PERF-03》《Chrome Performance》《Rendering Performance》《Long Tasks API》《中文｜MDN PerformanceObserver》，回指渲染流水线、trace 归因和观察器条目语义；首考题 2（机制解释）：在给定 5000 项筛选页中，结合 380ms 点击、260ms LoAF、210ms LongTask，说明同步过滤脚本、布局抖动、观察器开销的因果与各自证据；反例是仅看总耗时不能区分三者，回指 trace/observer 资料；首考题 3（最小产出）：Chrome 126 desktop、4×CPU 下对 `filter-5000` 输入 `shoe` 连点 10 次；接入 LongTask/LoAF `PerformanceObserver`，导出 trace、entry JSON、10 次 INP 表；以分片或 Worker 修复，提交 diff。断言：修复后 p75 INP≤200ms、LoAF≤100ms，筛选结果数仍为 137，observer 回调总耗时≤20ms；首考题 4（受限排错）：固定日志为 `click=380ms`、`loaf=260ms`、`longtask=210ms`、`observerCallback=15ms`，trace 同时有 `filterItems` 与 `Layout`。仅列 3 个候选：同步 JS 过滤、逐项读写布局、观察器处理过重；分别通过 Worker 替换、批量 DOM 写入、禁用 observer 回调后的 trace 证伪。选择成立项做最小修复，并用同一 10 次输入回归结果数与指标；首考题 5（学习复述）：说明为何 LongTask 为零仍可能有差 INP。复测变式：仅把列表从 5000 项改为 20000 项；不变量是查询词、节流和断言逻辑不变，预期处理压力增加，提交新的 trace、entry JSON 与 p75 表。命题边界：不得只凭总耗时或单一分数归因。
- 通过标准：验证证据：trace、LongTask/LoAF 条目 JSON、10 次 INP 统计、结果数断言、修复 diff 和题 4 的受限排错回归。否决项：无事件/帧级归因、优化后筛选结果变化、忽略观察器清理或把观察器自身开销当业务长任务均不通过。评估边界：只判定主线程、渲染和交互响应，不要求重构整个页面。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## PERF-04 内存、监听器与资源泄漏

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[07–09 内容审计中文讲义：PERF-04](../chinese-guides/content-audit-07-09.md#perf-04)、[Chrome Memory Problems](https://developer.chrome.com/docs/devtools/memory-problems/?hl=zh-cn)、[MDN Memory Management](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Memory_management)。覆盖分工：本地讲义=retaining path、资源清理与趋势验收；官方资料=GC 可达性和 DevTools 操作。覆盖范围：堆快照、分配时间线、监听器、定时器、闭包、detached DOM、Blob/媒体和缓存释放；覆盖泄漏复现、增长趋势和生命周期回收。
- 严格考核：挑战类型：DEBUGGING；首考题 1（资料定位）：只允许使用《07–09 内容审计中文讲义：PERF-04》《Chrome Memory Problems》《MDN Memory Management》，回指可达性、堆快照和 retaining path 的解释；首考题 2（机制解释）：给定 `modal-player` 连开关 30 次后 Detached DOM 从30到180、retaining path 为 `window.resize→handler→modalState`，解释监听器闭包为何阻止回收、Blob URL 缓存为何是另一根因、强制 GC 为何不是修复；反例回指资料；首考题 3（最小产出）：Chrome 126 对 `modal-player` 连续 open/close 30 次，在第0、15、30次后各取一次 GC 前后 heap snapshot；提交 retained size、Detached 节点数、三条 retaining path、监听器/URL revoke 修复 diff 与复现命令。断言：修复后第30次 GC 后 Detached DOM≤35，retained size 相对第0次增长≤10%，播放器仍可正常打开并播放给定 3 秒 MP4；首考题 4（受限排错）：固定证据为 Detached DOM `30→180`、`resize→handler→modalState` 和未释放的 `blob:https://app/7`。仅列 3 个候选：未移除 resize 监听、Blob URL 未 revoke、全局缓存保留 modal；分别通过 listener 计数、URL revoke 日志、清空缓存后的快照证伪。按证据做最小修复，并用同一30次流程回归；首考题 5（学习复述）：说明为何 heap 曲线稳定比单次强制 GC 更有说服力。复测变式：仅把重复操作从弹窗开关改为路由进入/离开；不变量是播放器资源、快照时点和阈值不变，预期不再出现累积 Detached DOM，提交新快照和趋势表。命题边界：不把 GC 时机本身当作泄漏根因。
- 通过标准：验证证据：6 份快照、retaining path、Detached DOM/retained size 趋势、修复 diff 与同 fixture 回归。否决项：只点强制 GC、没有 root 到对象的链路、阈值达标却播放器不可用、或未清理监听/Blob URL 均不通过。评估边界：只判定浏览器资源生命周期，不评价服务器内存。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

### 移动 Web 与宿主适配

## H5-01 viewport、响应式、安全区与横竖屏

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[07–09 内容审计中文讲义：H5-01](../chinese-guides/content-audit-07-09.md#h5-01)、[MDN Responsive Design](https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/CSS_layout/Responsive_Design)、[viewport](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Viewport_meta_tag)、[CSS env](https://developer.mozilla.org/zh-CN/docs/Web/CSS/env)。覆盖分工：本地讲义=动态视口、多条件截图与失败复现；MDN=响应式、viewport 和环境变量语义。覆盖范围：viewport、DPR、响应式单位、安全区、横竖屏、缩放和折叠屏；覆盖软键盘、状态栏、全屏和不同 WebView 的视觉边界。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《07–09 内容审计中文讲义：H5-01》《MDN Responsive Design》《viewport》《CSS env》，回指 viewport、响应式布局和安全区变量；首考题 2（机制解释）：对结算页在 `320×568`、`390×844`、`844×390` 和安全区 `0/34px` 下，说明 `meta viewport`、弹性约束与 `env(safe-area-inset-bottom)` 如何决定可视区域；反例是固定 375px 宽或按机型硬编码会在横屏溢出，回指资料；首考题 3（最小产出）：实现给定结算页，使用 `viewport-fit=cover` 与安全区 CSS；在 Chrome 320×568、iPhone 14 模拟 390×844（底部34px）、844×390 横屏分别截图，并在浏览器 200% 字体缩放下录屏。提交 CSS diff、三张截图和可运行 URL。断言：每个视口 `documentElement.scrollWidth===clientWidth`，提交按钮可见且距离安全区≥16px，200% 时按钮仍可点击；首考题 4（受限排错）：失败证据为横屏按钮被底部遮 34px、320 宽度出现 18px 横向滚动、200% 字体把价格覆盖。仅列 3 个候选：漏用安全区、固定卡片宽度、固定行高；分别用 computed padding、移除固定 width、改为 min-height 的截图证伪。做最小 CSS 修复，以同三视口和200%回归；首考题 5（学习复述）：说明安全区不是普通 padding、字体缩放为何属于布局输入。复测变式：仅把字体缩放从200%改为250%；不变量是视口、安全区、内容和断言不变，预期文本换行增加但无横滚/遮挡，提交新截图和 DOM 宽度断言。命题边界：不要求覆盖所有折叠屏厂商。
- 通过标准：验证证据：三视口与两档字体缩放截图/录屏、DOM 宽度/按钮距离断言、CSS diff 和题4回归。否决项：依赖设备型号硬编码、仅桌面截图、横滚或关键按钮遮挡、字体放大后无法操作均不通过。评估边界：只判定 viewport、响应式、安全区与横竖屏，不评价视觉风格。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## H5-02 滚动、软键盘、触控与手势冲突

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[07–09 内容审计中文讲义：H5-02](../chinese-guides/content-audit-07-09.md#h5-02)、[MDN Touch Events](https://developer.mozilla.org/zh-CN/docs/Web/API/Touch_events)、[Pointer Events](https://developer.mozilla.org/zh-CN/docs/Web/API/Pointer_events)、[Visual Viewport](https://developer.mozilla.org/zh-CN/docs/Web/API/Visual_Viewport_API)、[`overscroll-behavior`](https://developer.mozilla.org/zh-CN/docs/Web/CSS/overscroll-behavior)。覆盖分工：本地讲义=事件仲裁、软键盘故障注入和双端证据；MDN=输入、视口和滚动链 API 语义。覆盖范围：滚动容器、overscroll、软键盘、触控事件、Pointer Events、手势识别和冲突仲裁；覆盖被动监听、300ms 历史问题与可访问替代。
- 严格考核：挑战类型：DEBUGGING；首考题 1（资料定位）：只允许使用《07–09 内容审计中文讲义：H5-02》《MDN Touch Events》《Pointer Events》《Visual Viewport》《`overscroll-behavior`》，回指 Pointer 事件、VisualViewport 和滚动链限制；首考题 2（机制解释）：给定 iOS/Android 的 bottom-sheet 输入列表，解释键盘出现时 layout viewport 与 visual viewport 的差异、passive 监听器为何不能阻止默认行为、`overscroll-behavior` 如何截断滚动链；反例是全局 `preventDefault` 会锁死页面，回指资料；首考题 3（最小产出）：在 iPhone Safari 17 与 Android Chrome 126 各运行给定 bottom-sheet；聚焦末项输入框、上滑列表到边界、拖动关闭 sheet。提交 Pointer 事件日志、`visualViewport.height` 前后值、CSS/监听 diff 和两段录屏。断言：键盘出现时输入框底部在 visual viewport 内≥12px，边界上滑不带动 body，关闭后无残留 listener；首考题 4（受限排错）：失败日志为 `bodyScrollTop 420→0`、`visualViewport` 少290px、控制台提示 passive listener 调用 `preventDefault`。仅列 3 个候选：未按 visualViewport 调整、滚动链未隔离、passive 配置错误；分别以 resize 日志、边界滚动录屏、listener options 检查证伪。最小修复后在两端同操作回归；首考题 5（学习复述）：说明为何手势仲裁应先限定作用域再阻止默认行为。复测变式：仅把内层列表初始位置从中间改为顶部边界；不变量是键盘、输入框和监听策略不变，预期只改变滚动链行为，提交新增事件日志和录屏。命题边界：不要求处理已废弃的 300ms 历史兼容技巧。
- 通过标准：验证证据：两端录屏、visualViewport/事件日志、listener 清理检查、CSS/JS diff 和题4回归。否决项：全局锁滚动、未区分 passive、键盘遮挡输入框、或只在一个宿主验证均不通过。评估边界：只判定滚动、软键盘、触控与手势冲突，不评价输入业务校验。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## HYBRID-01 企业微信/钉钉 SDK 与容器差异

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[07–09 内容审计中文讲义：HYBRID-01](../chinese-guides/content-audit-07-09.md#hybrid-01)、[企业微信 JS-SDK](https://developer.work.weixin.qq.com/document/path/94313)、[钉钉 JSAPI](https://open.dingtalk.com/document/isvapp-client/read-before-development)。覆盖分工：本地讲义=适配状态机、错误归一与降级验收；厂商文档=签名字段、能力调用与当前容器版本。覆盖范围：企业微信/钉钉的 JS SDK 鉴权、能力检测、Bridge 生命周期、分享/定位/文件能力和容器差异；厂商适配必须隔离并保留普通 H5 回退。
- 严格考核：挑战类型：DEBUGGING；首考题 1（资料定位）：只允许使用《07–09 内容审计中文讲义：HYBRID-01》《企业微信 JS-SDK》《钉钉 JSAPI》，回指 SDK 鉴权字段、ready/error 生命周期与容器能力检测；首考题 2（机制解释）：固定浏览器、企业微信、钉钉三种 UA 以及 `url/timestamp/nonce/signature`，解释为何签名绑定当前 URL、ready 前调用为何失败、能力检测如何决定降级；反例是用 UA 伪装或前端生成签名，回指资料；首考题 3（最小产出）：给定 `scan` 页面，在企业微信/钉钉测试容器和普通 Chrome 各运行一次；服务端 mock 返回当前 URL 签名，前端在 ready 后调用扫描，在浏览器显示手动输入。提交环境检测表、签名请求日志、ready/error 时间线、三端录屏和 JS diff。断言：普通浏览器不调用 SDK，容器中 `ready` 前调用数为0，签名日志 URL 与 `location.href`（去 hash）一致；首考题 4（受限排错）：固定日志为 `invalid signature`、签名 URL 含错误 hash、客户端时钟慢8分钟、钉钉对象未定义。仅列 4 个候选：签名 URL 归一错误、时间戳过期、错误环境检测、SDK 未 ready；分别以服务端 URL 比对、更新时间后的请求、能力检测输出、ready 时间线证伪。做最小修复并在三环境回归；首考题 5（学习复述）：说明容器差异应由能力检测而非厂商 UA 名称驱动。复测变式：仅把部署域名从 `m.example.test` 改为 `m2.example.test`；不变量是功能、nonce 和容器版本不变，预期必须重新签名，提交新请求日志与扫描结果。命题边界：不要求实现厂商服务器，只评价 SDK 鉴权、生命周期和降级。
- 通过标准：验证证据：三环境矩阵、签名请求/URL 比对、ready/error 时间线、录屏和题4回归。否决项：在浏览器直接调用容器 API、把签名密钥放前端、忽略 URL/hash 差异、或 SDK 未 ready 即调用均不通过。评估边界：只判定企业微信/钉钉容器适配，不判定扫码业务。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## H5-03 移动 Web 定位、地图与设备权限

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[07–09 内容审计中文讲义：H5-03](../chinese-guides/content-audit-07-09.md#h5-03)、[Geolocation](https://developer.mozilla.org/zh-CN/docs/Web/API/Geolocation_API)、[Permissions API](https://developer.mozilla.org/zh-CN/docs/Web/API/Permissions_API)、[高德地图 JS API 2.0](https://lbs.amap.com/api/javascript-api-v2/summary)。覆盖分工：本地讲义=定位状态机、资源清理、隐私证据与文本降级；官方资料=权限、定位与地图 API 语义；重复的核心讲义已移出。覆盖范围：Geolocation 安全上下文、设备权限、精度、超时、缓存位置、watch 清理与隐私；地图 SDK 的异步加载、公开 Key/域名、坐标系、覆盖物、事件、销毁、厂商边界和无地图降级；定位仅在用户动作和明确目的下请求。媒体播放归 `MEDIA-01`，媒体采集归 `MEDIA-02`，大文件直传归 `H5-04`。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《07–09 内容审计中文讲义：H5-03》《Geolocation》《Permissions API》《高德地图 JS API 2.0》，回指权限状态、超时/精度和地图资源销毁；首考题 2（机制解释）：对 `prompt/denied/granted`、accuracy=150m、timeout=8s 解释为什么只在点击后请求、低精度位置不能冒充门店级坐标、拒绝后手工地址是必要降级；反例是页面加载即请求权限，回指资料；首考题 3（最小产出）：给定门店查询页，在 Chrome 设备模拟器依次注入 prompt→denied、granted（150m）和 timeout 8s；实现“定位附近”按钮、手工地址输入及地图 marker 销毁。提交权限状态日志、3 段录屏、watchId 清理日志、地图销毁 diff。断言：未点击前定位调用为0，denied/timeout 时地址输入可提交，卸载后 callback 计数不再增长；首考题 4（受限排错）：失败证据为组件卸载后仍有定位回调、拒绝后每次渲染都弹窗、bundle 内出现地图 Key。仅列 3 个候选：未 clearWatch、请求置于渲染副作用、Key 注入配置错误；分别以 watchId 日志、点击计数、构建产物扫描证伪。最小修复后重跑三状态；首考题 5（学习复述）：说明权限、精度和隐私告知为何必须分别呈现。复测变式：仅把模拟精度从150m改为500m；不变量是权限状态、门店数据和超时不变，预期界面提示低精度且仍允许地址输入，提交新日志/截图。命题边界：不把单一地图厂商字段当通用 Web 标准。
- 通过标准：验证证据：三种权限状态记录、超时/卸载日志、地址降级结果、构建扫描与题4回归。否决项：自动弹权限、拒绝/超时无法完成任务、泄漏 watch 或长期密钥进包均不通过。评估边界：只判定定位、地图和权限生命周期，不评价路线算法。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

### 大文件传输

## H5-04 浏览器大文件传输、分片与断点恢复

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[07–09 内容审计中文讲义：H5-04](../chinese-guides/content-audit-07-09.md#h5-04)、[File API](https://developer.mozilla.org/zh-CN/docs/Web/API/File_API)、[阿里云 OSS 服务端签名直传](https://help.aliyun.com/zh/oss/user-guide/obtain-signature-information-from-the-server-and-upload-data-to-oss)、[阿里云 OSS 分片上传](https://help.aliyun.com/zh/oss/user-guide/multipart-upload/)。覆盖分工：本地讲义=代理、单次直传、分片直传的信任/成本/统一状态机、故障切换和可复现实验；官方资料=File/Blob、短期授权和厂商分片流程的当前语义；重复的核心讲义已移出。覆盖范围：File/Blob、类型/尺寸/内容校验、服务端短期签名或 STS、CORS、对象键、分片/并发/断点、校验和、幂等完成、取消、过期分片清理、进度、刷新恢复和服务端回调校验；厂商文档只用于验证真实流程，通用合同不得绑定厂商字段。
- 严格考核：挑战类型：TOOL_OPERATION；首考题 1（资料定位）：只允许使用《07–09 内容审计中文讲义：H5-04》《File API》《阿里云 OSS 服务端签名直传》《阿里云 OSS 分片上传》，回指短期授权、分片状态、幂等完成和断点恢复；首考题 2（机制解释）：固定 100MB 文件、10MB/s、签名5分钟、4×25MB、并发2；说明分片为何降低重试成本、完成请求为何必须幂等、服务端签名为何不等于浏览器持有永久密钥；反例回指资料；首考题 3（最小产出）：在给定 mock storage 上传 `video-100mb.bin`，使用4片25MB、并发2、每片 SHA-256；第2片完成后刷新页面再恢复。提交分片状态 JSON、请求 HAR、hash 表、内存/耗时表、完成响应和复现命令。断言：恢复时只上传缺失片，完成对象 hash 等于原文件，浏览器 bundle 无永久 AccessKey；首考题 4（受限排错）：失败证据为第3片503、签名过期、完成响应丢失但 storage 已有对象。仅列 3 个候选：可重试网络失败、授权过期、完成幂等记录缺失；分别以重试次数、刷新签名日志、按 uploadId 查询对象证伪。按证据做最小修复并从同一断点回归；首考题 5（学习复述）：说明上传完成确认为什么不能只信前端状态。复测变式：仅把恢复后的第3片从成功改为取消后重试；不变量是文件、uploadId、分片大小和 hash 不变，预期仅第3片重传，提交状态 JSON 与 HAR diff。命题边界：不得把永久密钥放入浏览器。
- 通过标准：验证证据：分片状态、HAR、hash、断点恢复、授权刷新和题4回归。否决项：重传全部已完成分片、只靠客户端宣布完成、接受 hash 不符对象、或前端含永久密钥均不通过。评估边界：只判定浏览器传输、分片和恢复，不要求实现存储服务。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 165 分钟；考核 90 分钟；复测 75 分钟

### 专业媒体工程

## MEDIA-01 专业 Web 播放、编解码、DRM 与质量治理

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[07–09 内容审计中文讲义：编解码与能力探测](../chinese-guides/content-audit-07-09.md#media-01)、[MDN Picture-in-Picture](https://developer.mozilla.org/zh-CN/docs/Web/API/Picture-in-Picture_API)、[MDN 媒体源扩展 MSE](https://developer.mozilla.org/zh-CN/docs/Web/API/Media_Source_Extensions_API)、[MDN 加密媒体扩展 EME](https://developer.mozilla.org/zh-CN/docs/Web/API/Encrypted_Media_Extensions_API)。覆盖分工：本地讲义=容器/编解码分层、WebCodecs 队列、反例与 QoE 验收；MDN=PiP、MSE、EME 的当前 API/权限边界。重复的核心讲义已移出。覆盖范围：容器、轨道、编解码器、时间戳、关键帧、WebCodecs 队列/背压/释放；MSE、自适应码率与直播延迟；EME/DRM；Media Capabilities、Picture-in-Picture、字幕、音频描述、QoE 和降级。摄像头/麦克风/屏幕捕获、WebRTC 和 AudioWorklet 归 `MEDIA-02`；W3C 英文标准页已从必读资源移除，版本变化以实现方发布说明复核。
- 严格考核：挑战类型：DEBUGGING；首考题 1（资料定位）：只允许使用《07–09 内容审计中文讲义：编解码与能力探测》《MDN Picture-in-Picture》《MDN 媒体源扩展 MSE》《MDN 加密媒体扩展 EME》，回指容器/轨道/编解码与时间戳、MSE/ABR、DRM 许可、字幕和质量指标的边界；首考题 2（机制解释）：固定含 H.264 视频、AAC 音频和 WebVTT 字幕轨的 1080p/720p 两档内容、网络从8Mbps跌至1.2Mbps、DRM license 10分钟过期，以及按单调时间戳输入的 WebCodecs 视频帧；说明容器/轨道/编解码和关键帧为何限定解码路径、ABR 选择→buffer 下降→rebuffer、`decodeQueueSize` 背压→释放的因果，以及 DRM 更新为什么不能降级成明文播放；反例是只按文件扩展名选解码器或只提高画质而不限制队列/释放，回指资料；首考题 3（最小产出）：Chrome 126 中播放给定 60 秒 DASH fixture（H.264/AAC/WebVTT），注入第20秒带宽降至1.2Mbps、第40秒 license 过期；同时对给定 6 秒 H.264 视频轨 fixture 按时间戳送入 `VideoDecoder`，关键帧在0和3000000µs、背压高/低水位为4/2，停止时调用 `close()`。提交容器/轨道/codec probe、关键帧和时间戳检查、quality 切换事件、buffered ranges、rebuffer 秒数、`decodeQueueSize`/释放日志、license 请求日志、字幕切换录屏和播放器配置 diff。断言：视频/音频/字幕轨及 codec 均与 fixture 清单匹配、时间戳单调、队列不超过4且停止后 decoder 已关闭；带宽下降后30秒内切到720p，累计 rebuffer≤2秒，license 失败时显示受控错误而不播放内容；首考题 4（受限排错）：固定日志为 1080p 持续请求、buffer 0.3s、两次 `license 403`、字幕偏移1.2s、`decodeQueueSize=7` 且停止后 decoder 仍 open。仅列4个候选：ABR/buffer 控制环错误、license renewal URL 过期、字幕时间轴偏移、视频轨时间戳或 WebCodecs 背压/释放错误；分别以 bitrate 与 buffer 采样、更新时间 URL、替换字幕轨、轨道 probe/单调时间戳/队列和 close 日志证伪。最小修复后重放同60秒片段并重跑同6秒解码 fixture；首考题 5（学习复述）：说明画质提升不能以 DRM 绕过、不可接受卡顿或无界解码队列交换。复测变式：仅把网络跌速点从第20秒改为第5秒；不变量是内容、容器/轨道/codec、码率档、时间戳/背压水位和许可有效期不变，预期更早降档，提交新增切换、缓冲和队列证据。命题边界：只评估 Web 播放、编解码路径、质量与 DRM 边界，不评价版权策略。
- 通过标准：验证证据：容器/轨道/codec probe、关键帧/时间戳与队列释放日志、质量/缓冲事件、网络注入记录、许可日志、字幕录屏、配置 diff 与题4同 fixture 回归。否决项：DRM 失败仍播放、容器/轨道/codec 不符仍播放、队列无背压或停止后未释放、只用首帧速度代表体验、未记录 rebuffer、或字幕不同步无证据均不通过。评估边界：只判定播放器工程质量，不判定内容编解码生产流程。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## MEDIA-02 媒体采集、WebRTC 与实时音频处理

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[07–09 内容审计中文讲义：MEDIA-02](../chinese-guides/content-audit-07-09.md#media-02)、[MDN 屏幕捕获 API](https://developer.mozilla.org/zh-CN/docs/Web/API/Screen_Capture_API)、[MDN getUserMedia](https://developer.mozilla.org/zh-CN/docs/Web/API/MediaDevices/getUserMedia)、[MDN WebRTC API](https://developer.mozilla.org/zh-CN/docs/Web/API/WebRTC_API)、[MDN AudioWorkletNode](https://developer.mozilla.org/zh-CN/docs/Web/API/AudioWorkletNode)。覆盖分工：本地讲义=轨道状态、MediaRecorder 分片/背压、WebRTC/分片/AudioWorklet/服务端路径选择、字幕时序、质量面板、隐私和故障实验；官方资料=采集、协商、音频线程 API 的当前语义；重复的核心讲义已移出。覆盖范围：摄像头/麦克风/屏幕/窗口/标签页捕获、明确授权、约束协商、设备枚举与热切换、轨道 ended/mute/unmute 生命周期、系统音频、Region Capture、MediaRecorder、WebRTC 协商与网络降级、AudioWorklet 实时处理、转写/字幕和隐私边界；播放/DRM 归 `MEDIA-01`。
- 严格考核：挑战类型：DEBUGGING；首考题 1（资料定位）：只允许使用《07–09 内容审计中文讲义：MEDIA-02》《MDN 屏幕捕获 API》《MDN getUserMedia》《MDN WebRTC API》《MDN AudioWorkletNode》，回指 getUserMedia/屏幕捕获、MediaRecorder 分片、ICE、轨道生命周期和 AudioWorklet 实时处理限制；首考题 2（机制解释）：固定双端 WebRTC 通话、6秒屏幕捕获、模拟上行丢包12%、回声回路、摄像头拒绝和1kHz 测试音频；说明采集授权→轨道、ICE 候选→码率自适应、MediaRecorder 分片、AudioWorklet 音频线程处理、回声消除和权限拒绝各处于什么状态；反例是有本地预览或 `getStats()` 正常不代表远端有音频，也不代表录制分片与处理器已正确清理，回指资料；首考题 3（最小产出）：在两浏览器 profile 建立给定房间 `room-42`，第30秒注入12%上行丢包、第45秒切换麦克风，另跑一次拒绝摄像头；对给定 `screen-demo` 捕获6秒并以1秒 timeslice 录制，对给定1kHz/0.20 RMS 测试音频运行 AudioWorklet 电平表。提交 `getStats()` JSON、ICE 状态时间线、远端音量/轨道事件、屏幕轨和 MediaRecorder 分片表、AudioWorklet RMS/停止日志、三段录屏和清理 diff。断言：丢包后仍有远端音频且 jitter buffer≤150ms，切麦后旧 track `readyState=ended`，拒绝摄像头仍可文字降级；屏幕轨结束后 recorder 不再产生分片，6个分片时间戳连续，AudioWorklet RMS 在0.18–0.22且停止后 processor 不再回调；首考题 4（受限排错）：失败证据为 ICE `disconnected`、远端音量0、旧麦克风 track 仍 live、`NotAllowedError`、屏幕轨结束后仍多出2个分片且 AudioWorklet 停止后仍回调。仅列4个候选：TURN 不可达、发送 track 未 replace 或旧 track 未 stop、权限拒绝未降级、MediaRecorder/AudioWorklet 生命周期未清理；分别用候选列表、sender 参数和 track 状态、拒绝录屏、分片表与 processor 停止日志证伪。最小修复后在同房间、同6秒捕获和同测试音频 fixture 回归；首考题 5（学习复述）：说明 `getStats` 是质量证据而不是音频可用性、录制完整性或实时处理清理的唯一证明。复测变式：仅把丢包率从12%改为25%；不变量是房间、设备、屏幕捕获时长、recorder timeslice、AudioWorklet 输入和编码配置不变，预期质量指标变差但降级提示出现，提交新 stats、分片/处理日志与录屏。命题边界：不要求搭建生产信令或 TURN 服务。
- 通过标准：验证证据：两端 stats、ICE/track 时间线、屏幕/MediaRecorder 分片表、AudioWorklet 电平与停止日志、录屏、权限降级和题4同 fixture 回归。否决项：只测本地预览、未停止旧轨或处理器、屏幕轨结束后仍录制、拒绝权限后空白、或把模拟网络结果写成所有设备结论均不通过。评估边界：只判定采集、WebRTC 与实时音频前端行为，不评价运营网络质量。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟


## 领域综合考核

- [ ] 已通过领域综合考核
- 任务：选择现有 H5 页面，在中端移动设备和弱网条件下完成性能治理，提交基线、trace、优化实现、前后数据、兼容性矩阵和回归清单；无障碍与体验质量统一由 `A11Y-01` 和 `UX-01` 验证。
- 通过标准：8 小时内完成；至少一个核心指标改善 25%；iOS/Android 主流程通过；所有结论均有截图、trace 或测量数据。评估边界：领域综合考核只依据本领域列出的资料、题目输入和可复核产出；不得用资料外经验替代跨知识点整合证据。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟
