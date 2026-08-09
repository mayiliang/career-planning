# 07 性能、移动 Web 与媒体交付

所有“通过”均需满足[统一考核规则](00-assessment-rules.md)。性能结论必须有数据；移动端结论至少在一种真实移动设备或可靠设备环境中验证。所有现行中文资料均列于“学习资料”，并由首考题 1 逐项精确引用。

### Web 性能工程

## PERF-01 Core Web Vitals 与性能预算

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[07–09 内容审计中文讲义：PERF-01](../chinese-guides/content-audit-07-09.md#perf-01)、[Core Web Vitals](https://web.dev/articles/vitals?hl=zh-cn)、[Lighthouse Performance](https://developer.chrome.com/docs/lighthouse/performance/?hl=zh-cn)。覆盖分工：本地讲义=当前版本/条件记录、故障注入和验收证据；官方深页=指标定义、采集口径与实验室审计。覆盖范围：LCP、INP、CLS 等 Core Web Vitals 的定义、归因、实验室/RUM 差异、分位数和性能预算；覆盖页面类型、设备网络与回归门禁。
- 严格考核：首考题 1（资料定位）：只允许使用《07–09 内容审计中文讲义：PERF-01》《Core Web Vitals》《Lighthouse Performance》，分别摘出能支撑「Core Web Vitals 与性能预算」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：闭卷解释「Core Web Vitals 与性能预算」覆盖的输入、状态转换、运行边界与失败传播，并用首考题 3 的产出证明机制选择；首考题 3（最小产出）：解释 LCP、INP、CLS 的测量与归因；为一个真实页面建立性能预算；比较实验室数据和真实用户数据；首考题 4（受限排错）：围绕「Core Web Vitals 与性能预算」的首考题 3 产出注入正常、边界和失败场景，提交预期/实际、三项资料假设、证伪证据、根因、修复与回归；首考题 5（学习复述）：3 分钟说明「Core Web Vitals 与性能预算」解决的问题、运行机制、选型条件、反例和验证证据，并回答边界变化追问。命题边界：只在「Core Web Vitals 与性能预算」所列资料和覆盖范围内命题；资料外经验不能替代题目要求的机制与证据。
- 通过标准：指标解释无混淆；预算包含基线、目标、设备与网络条件；能指出平均值掩盖长尾的问题。评估边界：缺少与「Core Web Vitals 与性能预算」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## PERF-02 Network、资源加载与缓存优化

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[07–09 内容审计中文讲义：PERF-02](../chinese-guides/content-audit-07-09.md#perf-02)、[Chrome Network Reference](https://developer.chrome.com/docs/devtools/network/reference/?hl=zh-cn)、[HTTP Caching](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Guides/Caching)、[Resource Hints](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Reference/Attributes/rel/preload)、[Chrome 推测规则与预渲染](https://developer.chrome.com/docs/web-platform/prerender-pages?hl=zh-cn)、[web.dev 往返缓存](https://web.dev/articles/bfcache?hl=zh-cn)。覆盖分工：本地讲义=HAR 测量路径、反例与副作用验收；官方深页=缓存、提示、推测和 bfcache 的当前 API 语义。覆盖范围：瀑布流、关键资源、压缩、图片、第三方脚本、HTTP 缓存、资源提示、导航预取、Speculation Rules 的 prefetch/prerender、bfcache、激活检测、认证/存储/埋点副作用、资源浪费、兼容和降级；全部必读资料均为中文。
- 严格考核：首考题 1（资料定位）：只允许使用《07–09 内容审计中文讲义：PERF-02》《Chrome Network Reference》《HTTP Caching》《Resource Hints》《Chrome 推测规则与预渲染》《web.dev 往返缓存》，分别定位缓存、资源提示、推测导航和 bfcache 的机制与限制；首考题 2（机制解释）：解释 HTTP 缓存、preload、prefetch、prerender 和 bfcache 在获取、执行、页面状态与激活时机上的差异；首考题 3（最小产出）：分析瀑布流并实施缓存/图片/关键资源优化，再为高意图导航配置保守推测规则和 bfcache 兼容，比较命中、浪费、内存和导航指标；首考题 4（受限排错）：处理重复下载、版本错乱、预渲染重复埋点/写入、登录态过期、`unload` 阻断 bfcache 和跨源取消；首考题 5（学习复述）：3 分钟给出加载与导航优化决策树。命题边界：不得为了演示速度预渲染支付、删除等有不可逆副作用的页面。
- 通过标准：至少改善一个加载或导航指标 20% 或用证据否定无效优化；缓存和推测加载不重复执行业务副作用、不造成状态泄漏或明显资源浪费；不支持时保持正确导航。评估边界：单次最快结果不能替代命中率、浪费率、内存、数据新鲜度和正确性证据。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## PERF-03 主线程、渲染、长任务与交互响应

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[07–09 内容审计中文讲义：PERF-03](../chinese-guides/content-audit-07-09.md#perf-03)、[Chrome Performance](https://developer.chrome.com/docs/devtools/performance/?hl=zh-cn)、[Rendering Performance](https://web.dev/articles/rendering-performance?hl=zh-cn)、[Long Tasks API](https://developer.mozilla.org/zh-CN/docs/Web/API/PerformanceLongTaskTiming)、[中文｜MDN PerformanceObserver](https://developer.mozilla.org/zh-CN/docs/Web/API/PerformanceObserver)。覆盖分工：本地讲义=trace 故障注入、观测开销和复测证据；官方资料=渲染机制、工具操作与条目语义；重复的核心讲义已移出。覆盖范围：任务/微任务/帧、样式/布局/绘制/合成、长任务、Long Animation Frame、脚本归因、INP、`PerformanceObserver` 现场采集、分片/调度/Worker 和测量开销边界；全部必读资料均为中文。
- 严格考核：首考题 1（资料定位）：只允许使用《07–09 内容审计中文讲义：PERF-03》《Chrome Performance》《Rendering Performance》《Long Tasks API》《中文｜MDN PerformanceObserver》，定位 trace、长任务、长动画帧和现场观察规则；首考题 2（机制解释）：闭卷解释输入事件如何经过任务、渲染机会与呈现形成交互延迟；首考题 3（最小产出）：录制一次卡顿操作，从 flame chart 与 LoAF 脚本归因定位瓶颈，并用 `PerformanceObserver` 建立现场采集；首考题 4（受限排错）：仅依据 trace、LoAF、longtask、INP 和帧时序区分脚本、布局、绘制或观测器自身开销；首考题 5（学习复述）：3 分钟说明实验室 trace 与真实用户数据如何互证。命题边界：不得只凭总耗时或单一分数归因。
- 通过标准：结论可由 trace 和现场条目交叉复核；观测器有兼容检测、采样和清理；优化不改变业务正确性；INP、LoAF 或长任务达到题目目标。评估边界：缺少与「主线程、渲染、长任务与交互响应」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## PERF-04 内存、监听器与资源泄漏

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[07–09 内容审计中文讲义：PERF-04](../chinese-guides/content-audit-07-09.md#perf-04)、[Chrome Memory Problems](https://developer.chrome.com/docs/devtools/memory-problems/?hl=zh-cn)、[MDN Memory Management](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Memory_management)。覆盖分工：本地讲义=retaining path、资源清理与趋势验收；官方资料=GC 可达性和 DevTools 操作。覆盖范围：堆快照、分配时间线、监听器、定时器、闭包、detached DOM、Blob/媒体和缓存释放；覆盖泄漏复现、增长趋势和生命周期回收。
- 严格考核：首考题 1（资料定位）：只允许使用《07–09 内容审计中文讲义：PERF-04》《Chrome Memory Problems》《MDN Memory Management》，分别摘出能支撑「内存、监听器与资源泄漏」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：闭卷解释「内存、监听器与资源泄漏」覆盖的输入、状态转换、运行边界与失败传播，并用首考题 3 的产出证明机制选择；首考题 3（最小产出）：在反复打开页面/弹窗/播放器后拍摄 heap snapshot；定位 detached DOM、未清理监听器或大对象保留；修复并复测；首考题 4（受限排错）：围绕「内存、监听器与资源泄漏」的首考题 3 产出注入正常、边界和失败场景，提交预期/实际、三项资料假设、证伪证据、根因、修复与回归；首考题 5（学习复述）：3 分钟说明「内存、监听器与资源泄漏」解决的问题、运行机制、选型条件、反例和验证证据，并回答边界变化追问。命题边界：只在「内存、监听器与资源泄漏」所列资料和覆盖范围内命题；资料外经验不能替代题目要求的机制与证据。
- 通过标准：能从 retaining path 证明根因；重复操作后的堆增长稳定；不会只用强制 GC 掩盖泄漏。评估边界：缺少与「内存、监听器与资源泄漏」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

### 移动 Web 与宿主适配

## H5-01 viewport、响应式、安全区与横竖屏

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[07–09 内容审计中文讲义：H5-01](../chinese-guides/content-audit-07-09.md#h5-01)、[MDN Responsive Design](https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/CSS_layout/Responsive_Design)、[viewport](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Viewport_meta_tag)、[CSS env](https://developer.mozilla.org/zh-CN/docs/Web/CSS/env)。覆盖分工：本地讲义=动态视口、多条件截图与失败复现；MDN=响应式、viewport 和环境变量语义。覆盖范围：viewport、DPR、响应式单位、安全区、横竖屏、缩放和折叠屏；覆盖软键盘、状态栏、全屏和不同 WebView 的视觉边界。
- 严格考核：首考题 1（资料定位）：只允许使用《07–09 内容审计中文讲义：H5-01》《MDN Responsive Design》《viewport》《CSS env》，分别摘出能支撑「viewport、响应式、安全区与横竖屏」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：闭卷解释「viewport、响应式、安全区与横竖屏」覆盖的输入、状态转换、运行边界与失败传播，并用首考题 3 的产出证明机制选择；首考题 3（最小产出）：实现 320-430px 页面并兼容刘海安全区、横屏、字体放大和动态视口；解释 px/rem/vw 方案取舍；首考题 4（受限排错）：围绕「viewport、响应式、安全区与横竖屏」的首考题 3 产出注入正常、边界和失败场景，提交预期/实际、三项资料假设、证伪证据、根因、修复与回归；首考题 5（学习复述）：3 分钟说明「viewport、响应式、安全区与横竖屏」解决的问题、运行机制、选型条件、反例和验证证据，并回答边界变化追问。命题边界：只在「viewport、响应式、安全区与横竖屏」所列资料和覆盖范围内命题；资料外经验不能替代题目要求的机制与证据。
- 通过标准：关键内容不被遮挡；无横向滚动；200% 字体缩放仍可操作；不依赖设备型号硬编码。评估边界：缺少与「viewport、响应式、安全区与横竖屏」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## H5-02 滚动、软键盘、触控与手势冲突

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[07–09 内容审计中文讲义：H5-02](../chinese-guides/content-audit-07-09.md#h5-02)、[MDN Touch Events](https://developer.mozilla.org/zh-CN/docs/Web/API/Touch_events)、[Pointer Events](https://developer.mozilla.org/zh-CN/docs/Web/API/Pointer_events)、[Visual Viewport](https://developer.mozilla.org/zh-CN/docs/Web/API/Visual_Viewport_API)、[`overscroll-behavior`](https://developer.mozilla.org/zh-CN/docs/Web/CSS/overscroll-behavior)。覆盖分工：本地讲义=事件仲裁、软键盘故障注入和双端证据；MDN=输入、视口和滚动链 API 语义。覆盖范围：滚动容器、overscroll、软键盘、触控事件、Pointer Events、手势识别和冲突仲裁；覆盖被动监听、300ms 历史问题与可访问替代。
- 严格考核：首考题 1（资料定位）：只允许使用《07–09 内容审计中文讲义：H5-02》《MDN Touch Events》《Pointer Events》《Visual Viewport》《`overscroll-behavior`》，分别摘出能支撑「滚动、软键盘、触控与手势冲突」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：闭卷解释「滚动、软键盘、触控与手势冲突」覆盖的输入、状态转换、运行边界与失败传播，并用首考题 3 的产出证明机制选择；首考题 3（最小产出）：复现并修复滚动穿透、输入框遮挡、列表回弹、300ms/重复点击或手势冲突；在 iOS/Android 环境对照验证；首考题 4（受限排错）：围绕「滚动、软键盘、触控与手势冲突」的首考题 3 产出注入正常、边界和失败场景，提交预期/实际、三项资料假设、证伪证据、根因、修复与回归；首考题 5（学习复述）：3 分钟说明「滚动、软键盘、触控与手势冲突」解决的问题、运行机制、选型条件、反例和验证证据，并回答边界变化追问。命题边界：只在「滚动、软键盘、触控与手势冲突」所列资料和覆盖范围内命题；资料外经验不能替代题目要求的机制与证据。
- 通过标准：主流程两端通过；事件监听正确设置 passive 与清理；修复不锁死页面其他滚动区域。评估边界：缺少与「滚动、软键盘、触控与手势冲突」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## HYBRID-01 企业微信/钉钉 SDK 与容器差异

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[07–09 内容审计中文讲义：HYBRID-01](../chinese-guides/content-audit-07-09.md#hybrid-01)、[企业微信 JS-SDK](https://developer.work.weixin.qq.com/document/path/94313)、[钉钉 JSAPI](https://open.dingtalk.com/document/isvapp-client/read-before-development)。覆盖分工：本地讲义=适配状态机、错误归一与降级验收；厂商文档=签名字段、能力调用与当前容器版本。覆盖范围：企业微信/钉钉的 JS SDK 鉴权、能力检测、Bridge 生命周期、分享/定位/文件能力和容器差异；厂商适配必须隔离并保留普通 H5 回退。
- 严格考核：首考题 1（资料定位）：只允许使用《07–09 内容审计中文讲义：HYBRID-01》《企业微信 JS-SDK》《钉钉 JSAPI》，分别摘出能支撑「企业微信/钉钉 SDK 与容器差异」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：闭卷解释「企业微信/钉钉 SDK 与容器差异」覆盖的输入、状态转换、运行边界与失败传播，并用首考题 3 的产出证明机制选择；首考题 3（最小产出）：画出环境识别、签名、鉴权、ready/error、API 调用和降级链路；定位签名失败、域名错误、时钟偏差或容器版本问题；首考题 4（受限排错）：围绕「企业微信/钉钉 SDK 与容器差异」的首考题 3 产出注入正常、边界和失败场景，提交预期/实际、三项资料假设、证伪证据、根因、修复与回归；首考题 5（学习复述）：3 分钟说明「企业微信/钉钉 SDK 与容器差异」解决的问题、运行机制、选型条件、反例和验证证据，并回答边界变化追问。命题边界：只在「企业微信/钉钉 SDK 与容器差异」所列资料和覆盖范围内命题；资料外经验不能替代题目要求的机制与证据。
- 通过标准：排障清单按证据顺序执行；浏览器非容器环境可降级；敏感签名不在前端生成或泄露。评估边界：缺少与「企业微信/钉钉 SDK 与容器差异」直接对应的可复核产出，或用资料外经验绕过通过标准，均不能通过。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## H5-03 移动 Web 定位、地图与设备权限

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[07–09 内容审计中文讲义：H5-03](../chinese-guides/content-audit-07-09.md#h5-03)、[Geolocation](https://developer.mozilla.org/zh-CN/docs/Web/API/Geolocation_API)、[Permissions API](https://developer.mozilla.org/zh-CN/docs/Web/API/Permissions_API)、[高德地图 JS API 2.0](https://lbs.amap.com/api/javascript-api-v2/summary)。覆盖分工：本地讲义=定位状态机、资源清理、隐私证据与文本降级；官方资料=权限、定位与地图 API 语义；重复的核心讲义已移出。覆盖范围：Geolocation 安全上下文、设备权限、精度、超时、缓存位置、watch 清理与隐私；地图 SDK 的异步加载、公开 Key/域名、坐标系、覆盖物、事件、销毁、厂商边界和无地图降级；定位仅在用户动作和明确目的下请求。媒体播放归 `MEDIA-01`，媒体采集归 `MEDIA-02`，大文件直传归 `H5-04`。
- 严格考核：首考题 1（资料定位）：只允许使用《07–09 内容审计中文讲义：H5-03》《Geolocation》《Permissions API》《高德地图 JS API 2.0》，定位定位权限、精度/超时、地图 SDK 和资源清理边界；首考题 2（机制解释）：闭卷解释一次定位请求和持续监听的生命周期、地图坐标/覆盖物生命周期，以及浏览器公开 Key 与服务端长期 Secret 的区别；首考题 3（最小产出）：实现按需定位和地图展示的移动页面，支持权限拒绝、低精度、超时、坐标转换、弱网、后台切换和 SDK 加载失败；首考题 4（受限排错）：处理坐标偏差、域名/Key 错误、重复监听、权限永久拒绝和卸载后资源泄漏；首考题 5（学习复述）：3 分钟说明定位、地址搜索、地图 SDK 和静态地址文本降级的选择边界。命题边界：不得把单一地图厂商字段当作通用 Web 标准。
- 通过标准：权限只在明确用户意图下按需请求且拒绝可恢复；定位监听和地图资源卸载时释放；坐标、精度、缓存位置和隐私说明清楚；长期密钥不进入浏览器；无地图 SDK 或定位能力时仍可用地址文本或手工输入完成核心任务。提交真机或可靠设备环境的权限拒绝、超时、卸载清理和地址文本降级**验证**记录。评估边界：只在已授权设备或单一厂商快乐路径演示不能通过。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

### 大文件传输

## H5-04 浏览器大文件传输、分片与断点恢复

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[07–09 内容审计中文讲义：H5-04](../chinese-guides/content-audit-07-09.md#h5-04)、[File API](https://developer.mozilla.org/zh-CN/docs/Web/API/File_API)、[阿里云 OSS 服务端签名直传](https://help.aliyun.com/zh/oss/user-guide/obtain-signature-information-from-the-server-and-upload-data-to-oss)、[阿里云 OSS 分片上传](https://help.aliyun.com/zh/oss/user-guide/multipart-upload/)。覆盖分工：本地讲义=代理、单次直传、分片直传的信任/成本/统一状态机、故障切换和可复现实验；官方资料=File/Blob、短期授权和厂商分片流程的当前语义；重复的核心讲义已移出。覆盖范围：File/Blob、类型/尺寸/内容校验、服务端短期签名或 STS、CORS、对象键、分片/并发/断点、校验和、幂等完成、取消、过期分片清理、进度、刷新恢复和服务端回调校验；厂商文档只用于验证真实流程，通用合同不得绑定厂商字段。
- 严格考核：首考题 1（资料定位）：只允许使用《07–09 内容审计中文讲义：H5-04》《File API》《阿里云 OSS 服务端签名直传》《阿里云 OSS 分片上传》，定位代理/单次直传/分片直传的信任与成本、短期授权、分片状态、幂等完成、切换和清理边界；首考题 2（机制解释）：闭卷画出三条数据路径，比较浏览器、业务服务和对象存储分别信任什么、承担哪些带宽/请求/恢复成本，并说明不确定完成为何不能盲目切换；首考题 3（最小产出）：以统一 `UploadTransport` 为同一大文件实现流式代理、单次直传和限并发分片直传，支持短期授权刷新、断点、取消、校验、幂等完成、对象复核和策略允许时切换代理或保留待重试；首考题 4（受限排错）：处理代理背压/中断、CORS、签名过期、存储 `503`、分片乱序/重复、完成响应丢失、内容类型/回调伪造和遗留分片，提交三条时序及切换/对账证据；首考题 5（学习复述）：3 分钟按文件、网络、合规、服务容量和成本比较代理、单次直传与分片直传。命题边界：不得把永久密钥放入浏览器，不得信任客户端类型/路径/完成状态，也不得承诺所有存储故障都能无损切代理。
- 通过标准：三条路径的数据流、信任边界和成本可量化；代理尊重流与背压，直传授权最小且可过期，分片上传可取消、恢复、校验、去重和清理；并发、重试、内存及代理文件上限明确；服务端以业务意图幂等地确认对象与归属；存储不可用时先对账，再按策略切换代理或保留待重试，且不产生双对象/双业务记录。提交三模式同一 fixture 的资源数据，以及断点恢复、签名刷新、不确定完成、切换/待重试、取消和服务端确认的验证记录。评估边界：只用小文件、只实现一种路径、无刷新恢复或没有服务端确认不能通过。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 165 分钟；考核 90 分钟；复测 75 分钟

### 专业媒体工程

## MEDIA-01 专业 Web 播放、编解码、DRM 与质量治理

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[07–09 内容审计中文讲义：编解码与能力探测](../chinese-guides/content-audit-07-09.md#media-01)、[MDN Picture-in-Picture](https://developer.mozilla.org/zh-CN/docs/Web/API/Picture-in-Picture_API)、[MDN 媒体源扩展 MSE](https://developer.mozilla.org/zh-CN/docs/Web/API/Media_Source_Extensions_API)、[MDN 加密媒体扩展 EME](https://developer.mozilla.org/zh-CN/docs/Web/API/Encrypted_Media_Extensions_API)。覆盖分工：本地讲义=容器/编解码分层、WebCodecs 队列、反例与 QoE 验收；MDN=PiP、MSE、EME 的当前 API/权限边界。重复的核心讲义已移出。覆盖范围：容器、轨道、编解码器、时间戳、关键帧、WebCodecs 队列/背压/释放；MSE、自适应码率与直播延迟；EME/DRM；Media Capabilities、Picture-in-Picture、字幕、音频描述、QoE 和降级。摄像头/麦克风/屏幕捕获、WebRTC 和 AudioWorklet 归 `MEDIA-02`；W3C 英文标准页已从必读资源移除，版本变化以实现方发布说明复核。
- 严格考核：首考题 1（资料定位）：只允许使用《07–09 内容审计中文讲义：编解码与能力探测》《MDN Picture-in-Picture》《MDN 媒体源扩展 MSE》《MDN 加密媒体扩展 EME》，定位容器/编码分层、WebCodecs 生命周期、MSE 缓冲、EME 边界、PiP 和 QoE 指标；首考题 2（机制解释）：闭卷画出媒体获取、封装、缓冲、解码、同步、渲染和 DRM 授权链路，解释时间戳、关键帧、背压和资源释放；首考题 3（最小产出）：实现支持自适应播放、字幕、PiP、质量面板和受控队列的播放器切片，提供不支持 WebCodecs/MSE/EME 时的降级，并用网络抖动、解码队列上限与资源释放测试验证；首考题 4（受限排错）：处理音画不同步、队列增长、帧未关闭、SourceBuffer 异常、后台限流、DRM 拒绝和掉帧；首考题 5（学习复述）：3 分钟说明何时使用媒体元素、MSE、WebCodecs、EME 或服务端媒体处理。命题边界：不得绕过 DRM，也不得把 WebCodecs 当完整播放器。
- 通过标准：PiP 或高级管线不支持时核心播放可用；时间戳单调且音画同步；队列有上限并施加背压；帧、Chunk、SourceBuffer 和对象 URL 生命周期可证明已释放；QoE 至少包含首帧、卡顿、掉帧和错误；版权内容不绕过 EME；字幕与控件可访问。评估边界：只播放本地 MP4、忽略资源释放或把 WebCodecs 当完整播放器不能通过。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## MEDIA-02 媒体采集、WebRTC 与实时音频处理

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[07–09 内容审计中文讲义：MEDIA-02](../chinese-guides/content-audit-07-09.md#media-02)、[MDN 屏幕捕获 API](https://developer.mozilla.org/zh-CN/docs/Web/API/Screen_Capture_API)、[MDN getUserMedia](https://developer.mozilla.org/zh-CN/docs/Web/API/MediaDevices/getUserMedia)、[MDN WebRTC API](https://developer.mozilla.org/zh-CN/docs/Web/API/WebRTC_API)、[MDN AudioWorkletNode](https://developer.mozilla.org/zh-CN/docs/Web/API/AudioWorkletNode)。覆盖分工：本地讲义=轨道状态、MediaRecorder 分片/背压、WebRTC/分片/AudioWorklet/服务端路径选择、字幕时序、质量面板、隐私和故障实验；官方资料=采集、协商、音频线程 API 的当前语义；重复的核心讲义已移出。覆盖范围：摄像头/麦克风/屏幕/窗口/标签页捕获、明确授权、约束协商、设备枚举与热切换、轨道 ended/mute/unmute 生命周期、系统音频、Region Capture、MediaRecorder、WebRTC 协商与网络降级、AudioWorklet 实时处理、转写/字幕和隐私边界；播放/DRM 归 `MEDIA-01`。
- 严格考核：首考题 1（资料定位）：只允许使用《07–09 内容审计中文讲义：MEDIA-02》《MDN 屏幕捕获 API》《MDN getUserMedia》《MDN WebRTC API》《MDN AudioWorkletNode》，定位采集授权、轨道生命周期、MediaRecorder 分片/背压、WebRTC 协商、AudioWorklet 实时线程、服务端处理、字幕时序和降级边界；首考题 2（机制解释）：闭卷画出设备/屏幕、Track、Recorder 或实时处理、受限队列、WebRTC/分片传输、服务端处理、revision 字幕和停止/撤权传播链路，并比较三种处理路径；首考题 3（最小产出）：实现可取消的会议/录制切片，支持明确授权、设备/屏幕切换、带序号和源时钟的受控录制分片、WebRTC 测试对端、可控转写服务的 interim/final 字幕及延迟/队列/网络质量面板；首考题 4（受限排错）：处理用户停止共享、权限拒绝、设备切换、Recorder 不支持/报错、片队列超限、ICE/服务断连、字幕乱序/迟到、页面隐藏和 Worklet 过载，提交状态时序、降级和资源释放复测；首考题 5（学习复述）：3 分钟按延迟、质量、设备/网络成本和隐私说明 MediaRecorder 分片、WebRTC、AudioWorklet、本地处理与服务端实时处理的选择边界。命题边界：必须由明确用户操作触发高权限捕获，不得伪造或绕过浏览器分享指示；可控转写服务只能验证协议与 UI，不能充当真实准确率证据。
- 通过标准：权限拒绝、撤销、用户主动停止、设备插拔/切换和页面隐藏均有明确状态与恢复；录制片有序号/源时钟和队列上限，字幕按 segment/revision 去重并可访问，质量面板区分可测延迟/覆盖与需要真值的准确率；网络或高级 API 不支持时有经用户知情的降级；Track、Recorder、PeerConnection、Worklet、对象 URL、上传队列和字幕请求可证明已释放；原始媒体/字幕的传输、日志与保留符合明确同意。提交停止共享、设备热切换、队列超限、网络/服务降级、字幕乱序和资源释放的验证记录。评估边界：只在预授权桌面环境演示、只显示假字幕、忽略背压/停止传播或不释放硬件资源不能通过。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## 领域综合考核

- [ ] 已通过领域综合考核
- 任务：选择现有 H5 页面，在中端移动设备和弱网条件下完成性能治理，提交基线、trace、优化实现、前后数据、兼容性矩阵和回归清单；无障碍与体验质量统一由 `A11Y-01` 和 `UX-01` 验证。
- 通过标准：8 小时内完成；至少一个核心指标改善 25%；iOS/Android 主流程通过；所有结论均有截图、trace 或测量数据。评估边界：领域综合考核只依据本领域列出的资料、题目输入和可复核产出；不得用资料外经验替代跨知识点整合证据。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟
