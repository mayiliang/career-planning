# 07 Web 性能、H5 与 Hybrid

所有“通过”均需满足[统一考核规则](00-assessment-rules.md)。性能结论必须有数据；移动端结论至少在一种真实移动设备或可靠设备环境中验证。

## PERF-01 Core Web Vitals 与性能预算

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[web.dev Performance](https://web.dev/performance/?hl=zh-cn)、[Core Web Vitals](https://web.dev/articles/vitals?hl=zh-cn)、[Lighthouse Performance](https://developer.chrome.com/docs/lighthouse/performance/?hl=zh-cn)。覆盖范围：必须从列出资料建立主题术语表、运行时或数据流图、适用与不适用条件、常见反例，以及能由本知识点首考产出验证的正确性、安全、性能和兼容边界；不得只复述标题或框架用法。
- 严格考核：首考题 1（资料定位）：只允许使用《web.dev Performance》《Core Web Vitals》《Lighthouse Performance》，分别摘出能支撑「Core Web Vitals 与性能预算」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：闭卷用状态图、数据流、时序或类型推导解释关键机制、前置假设、失败传播与不适用条件，并以首考题 3 的具体产出举例；首考题 3（最小产出）：解释 LCP、INP、CLS 的测量与归因；为一个真实页面建立性能预算；比较实验室数据和真实用户数据；首考题 4（受限排错）：对首考题 3 实施至少一个正常、一个边界和一个故障注入；提交预期与实际、最小复现、由资料支持的 3 项假设、逐项证伪证据、根因、最小修复与回归验证；首考题 5（学习复述）：3 分钟按问题、机制、选择、反例和验证证据五段复述，并回答一个边界追问。命题边界：参考答案必须逐题回指学习资料、题目依据或通过标准；评分只依据列出资料、题目给定输入和可复核产出；额外框架经验不得替代机制与证据。
- 通过标准：指标解释无混淆；预算包含基线、目标、设备与网络条件；能指出平均值掩盖长尾的问题。评估边界：评分只依据列出资料、题目给定输入和可复核产出；额外框架经验不得替代机制与证据。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## PERF-02 Network、资源加载与缓存优化

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Chrome Network Reference](https://developer.chrome.com/docs/devtools/network/reference/?hl=zh-cn)、[HTTP Caching](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Guides/Caching)、[Resource Hints](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Reference/Attributes/rel/preload)、[Chrome 推测规则与预渲染](https://developer.chrome.com/docs/web-platform/prerender-pages?hl=zh-cn)、[web.dev 往返缓存](https://web.dev/articles/bfcache?hl=zh-cn)。覆盖范围：瀑布流、关键资源、压缩、图片、第三方脚本、HTTP 缓存、资源提示、导航预取、Speculation Rules 的 prefetch/prerender、bfcache、激活检测、认证/存储/埋点副作用、资源浪费、兼容和降级；全部必读资料均为中文。
- 严格考核：首考题 1（资料定位）：只允许使用列出的中文资料，分别定位缓存、资源提示、推测导航和 bfcache 的机制与限制；首考题 2（机制解释）：解释 HTTP 缓存、preload、prefetch、prerender 和 bfcache 在获取、执行、页面状态与激活时机上的差异；首考题 3（最小产出）：分析瀑布流并实施缓存/图片/关键资源优化，再为高意图导航配置保守推测规则和 bfcache 兼容，比较命中、浪费、内存和导航指标；首考题 4（受限排错）：处理重复下载、版本错乱、预渲染重复埋点/写入、登录态过期、`unload` 阻断 bfcache 和跨源取消；首考题 5（学习复述）：3 分钟给出加载与导航优化决策树。命题边界：不得为了演示速度预渲染支付、删除等有不可逆副作用的页面。
- 通过标准：至少改善一个加载或导航指标 20% 或用证据否定无效优化；缓存和推测加载不重复执行业务副作用、不造成状态泄漏或明显资源浪费；不支持时保持正确导航。评估边界：单次最快结果不能替代命中率、浪费率、内存、数据新鲜度和正确性证据。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## PERF-03 主线程、渲染、长任务与交互响应

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#perf-03)、[Chrome Performance](https://developer.chrome.com/docs/devtools/performance/?hl=zh-cn)、[Rendering Performance](https://web.dev/articles/rendering-performance?hl=zh-cn)、[Long Tasks API](https://developer.mozilla.org/zh-CN/docs/Web/API/PerformanceLongTaskTiming)、[中文｜MDN PerformanceObserver](https://developer.mozilla.org/zh-CN/docs/Web/API/PerformanceObserver)。覆盖范围：任务/微任务/帧、样式/布局/绘制/合成、长任务、Long Animation Frame、脚本归因、INP、`PerformanceObserver` 现场采集、分片/调度/Worker 和测量开销边界；全部必读资料均为中文。
- 严格考核：首考题 1（资料定位）：只允许使用《中文核心讲义》《Chrome Performance》《Rendering Performance》《Long Tasks API》《中文｜MDN PerformanceObserver》，定位 trace、长任务、长动画帧和现场观察规则；首考题 2（机制解释）：闭卷解释输入事件如何经过任务、渲染机会与呈现形成交互延迟；首考题 3（最小产出）：录制一次卡顿操作，从 flame chart 与 LoAF 脚本归因定位瓶颈，并用 `PerformanceObserver` 建立现场采集；首考题 4（受限排错）：仅依据 trace、LoAF、longtask、INP 和帧时序区分脚本、布局、绘制或观测器自身开销；首考题 5（学习复述）：3 分钟说明实验室 trace 与真实用户数据如何互证。命题边界：不得只凭总耗时或单一分数归因。
- 通过标准：结论可由 trace 和现场条目交叉复核；观测器有兼容检测、采样和清理；优化不改变业务正确性；INP、LoAF 或长任务达到题目目标。评估边界：评分只依据列出资料、题目给定输入和可复核产出；额外框架经验不得替代机制与证据。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## PERF-04 内存、监听器与资源泄漏

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Chrome Memory Problems](https://developer.chrome.com/docs/devtools/memory-problems/?hl=zh-cn)、[MDN Memory Management](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Memory_management)。覆盖范围：必须从列出资料建立主题术语表、运行时或数据流图、适用与不适用条件、常见反例，以及能由本知识点首考产出验证的正确性、安全、性能和兼容边界；不得只复述标题或框架用法。
- 严格考核：首考题 1（资料定位）：只允许使用《Chrome Memory Problems》《MDN Memory Management》，分别摘出能支撑「内存、监听器与资源泄漏」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：闭卷用状态图、数据流、时序或类型推导解释关键机制、前置假设、失败传播与不适用条件，并以首考题 3 的具体产出举例；首考题 3（最小产出）：在反复打开页面/弹窗/播放器后拍摄 heap snapshot；定位 detached DOM、未清理监听器或大对象保留；修复并复测；首考题 4（受限排错）：对首考题 3 实施至少一个正常、一个边界和一个故障注入；提交预期与实际、最小复现、由资料支持的 3 项假设、逐项证伪证据、根因、最小修复与回归验证；首考题 5（学习复述）：3 分钟按问题、机制、选择、反例和验证证据五段复述，并回答一个边界追问。命题边界：参考答案必须逐题回指学习资料、题目依据或通过标准；评分只依据列出资料、题目给定输入和可复核产出；额外框架经验不得替代机制与证据。
- 通过标准：能从 retaining path 证明根因；重复操作后的堆增长稳定；不会只用强制 GC 掩盖泄漏。评估边界：评分只依据列出资料、题目给定输入和可复核产出；额外框架经验不得替代机制与证据。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## H5-01 viewport、响应式、安全区与横竖屏

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN Responsive Design](https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/CSS_layout/Responsive_Design)、[viewport](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Viewport_meta_tag)、[CSS env](https://developer.mozilla.org/zh-CN/docs/Web/CSS/env)。覆盖范围：必须从列出资料建立主题术语表、运行时或数据流图、适用与不适用条件、常见反例，以及能由本知识点首考产出验证的正确性、安全、性能和兼容边界；不得只复述标题或框架用法。
- 严格考核：首考题 1（资料定位）：只允许使用《MDN Responsive Design》《viewport》《CSS env》，分别摘出能支撑「viewport、响应式、安全区与横竖屏」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：闭卷用状态图、数据流、时序或类型推导解释关键机制、前置假设、失败传播与不适用条件，并以首考题 3 的具体产出举例；首考题 3（最小产出）：实现 320-430px 页面并兼容刘海安全区、横屏、字体放大和动态视口；解释 px/rem/vw 方案取舍；首考题 4（受限排错）：对首考题 3 实施至少一个正常、一个边界和一个故障注入；提交预期与实际、最小复现、由资料支持的 3 项假设、逐项证伪证据、根因、最小修复与回归验证；首考题 5（学习复述）：3 分钟按问题、机制、选择、反例和验证证据五段复述，并回答一个边界追问。命题边界：参考答案必须逐题回指学习资料、题目依据或通过标准；评分只依据列出资料、题目给定输入和可复核产出；额外框架经验不得替代机制与证据。
- 通过标准：关键内容不被遮挡；无横向滚动；200% 字体缩放仍可操作；不依赖设备型号硬编码。评估边界：评分只依据列出资料、题目给定输入和可复核产出；额外框架经验不得替代机制与证据。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## H5-02 滚动、软键盘、触控与手势冲突

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN Touch Events](https://developer.mozilla.org/zh-CN/docs/Web/API/Touch_events)、[Pointer Events](https://developer.mozilla.org/zh-CN/docs/Web/API/Pointer_events)、[Visual Viewport](https://developer.mozilla.org/zh-CN/docs/Web/API/Visual_Viewport_API)、[`overscroll-behavior`](https://developer.mozilla.org/zh-CN/docs/Web/CSS/overscroll-behavior)。覆盖范围：必须从列出资料建立主题术语表、运行时或数据流图、适用与不适用条件、常见反例，以及能由本知识点首考产出验证的正确性、安全、性能和兼容边界；不得只复述标题或框架用法。
- 严格考核：首考题 1（资料定位）：只允许使用《MDN Touch Events》《Pointer Events》《Visual Viewport》《`overscroll-behavior`》，分别摘出能支撑「滚动、软键盘、触控与手势冲突」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：闭卷用状态图、数据流、时序或类型推导解释关键机制、前置假设、失败传播与不适用条件，并以首考题 3 的具体产出举例；首考题 3（最小产出）：复现并修复滚动穿透、输入框遮挡、列表回弹、300ms/重复点击或手势冲突；在 iOS/Android 环境对照验证；首考题 4（受限排错）：对首考题 3 实施至少一个正常、一个边界和一个故障注入；提交预期与实际、最小复现、由资料支持的 3 项假设、逐项证伪证据、根因、最小修复与回归验证；首考题 5（学习复述）：3 分钟按问题、机制、选择、反例和验证证据五段复述，并回答一个边界追问。命题边界：参考答案必须逐题回指学习资料、题目依据或通过标准；评分只依据列出资料、题目给定输入和可复核产出；额外框架经验不得替代机制与证据。
- 通过标准：主流程两端通过；事件监听正确设置 passive 与清理；修复不锁死页面其他滚动区域。评估边界：评分只依据列出资料、题目给定输入和可复核产出；额外框架经验不得替代机制与证据。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## HYBRID-01 企业微信/钉钉 SDK 与容器差异

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[企业微信 JS-SDK](https://developer.work.weixin.qq.com/document/path/94313)、[钉钉 JSAPI](https://open.dingtalk.com/document/isvapp-client/read-before-development)。覆盖范围：必须从列出资料建立主题术语表、运行时或数据流图、适用与不适用条件、常见反例，以及能由本知识点首考产出验证的正确性、安全、性能和兼容边界；不得只复述标题或框架用法。
- 严格考核：首考题 1（资料定位）：只允许使用《企业微信 JS-SDK》《钉钉 JSAPI》，分别摘出能支撑「企业微信/钉钉 SDK 与容器差异」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：闭卷用状态图、数据流、时序或类型推导解释关键机制、前置假设、失败传播与不适用条件，并以首考题 3 的具体产出举例；首考题 3（最小产出）：画出环境识别、签名、鉴权、ready/error、API 调用和降级链路；定位签名失败、域名错误、时钟偏差或容器版本问题；首考题 4（受限排错）：对首考题 3 实施至少一个正常、一个边界和一个故障注入；提交预期与实际、最小复现、由资料支持的 3 项假设、逐项证伪证据、根因、最小修复与回归验证；首考题 5（学习复述）：3 分钟按问题、机制、选择、反例和验证证据五段复述，并回答一个边界追问。命题边界：参考答案必须逐题回指学习资料、题目依据或通过标准；评分只依据列出资料、题目给定输入和可复核产出；额外框架经验不得替代机制与证据。
- 通过标准：排障清单按证据顺序执行；浏览器非容器环境可降级；敏感签名不在前端生成或泄露。评估边界：评分只依据列出资料、题目给定输入和可复核产出；额外框架经验不得替代机制与证据。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## H5-03 媒体元素、定位、地图接入与大文件上传

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#h5-03)、[MDN Media](https://developer.mozilla.org/zh-CN/docs/Web/Media)、[HTMLMediaElement](https://developer.mozilla.org/zh-CN/docs/Web/API/HTMLMediaElement)、[Geolocation](https://developer.mozilla.org/zh-CN/docs/Web/API/Geolocation_API)、[File API](https://developer.mozilla.org/zh-CN/docs/Web/API/File_API)、[高德地图 JS API 2.0](https://lbs.amap.com/api/javascript-api-v2/summary)、[阿里云 OSS 服务端签名直传](https://help.aliyun.com/zh/oss/user-guide/obtain-signature-information-from-the-server-and-upload-data-to-oss)、[阿里云 OSS 分片上传](https://help.aliyun.com/zh/oss/user-guide/multipart-upload/)。覆盖范围：原生媒体元素的加载、播放、错误、自动播放、字幕和资源释放；Geolocation 权限、精度、超时、取消替代与隐私；地图 SDK 的异步加载、Key/域名、坐标系、覆盖物、事件、销毁、厂商边界和无地图降级；File/Blob、类型/尺寸/内容校验、服务端短期签名或 STS、CORS、对象键、分片/并发/断点、校验和、幂等完成、取消/过期分片清理、进度和回调校验；全部必读资料均为中文。专业编解码、MSE、WebCodecs、DRM 和低延迟音频归入 `MEDIA-01`。
- 严格考核：首考题 1（资料定位）：只允许使用《中文核心讲义》，定位媒体元素、定位、地图 SDK 和对象存储直传/分片的机制与安全边界；首考题 2（机制解释）：闭卷画出浏览器向服务端申请短期上传授权、直传对象存储、分片完成与服务端确认的链路，并解释地图 Key 不等于可放入浏览器的长期 Secret；首考题 3（最小产出）：实现一个含媒体预览、按需定位、地图展示和大文件直传的流程，支持签名过期刷新、分片并发上限、断点、进度、取消、校验和、幂等完成、权限拒绝、弱网、后台切换和 SDK 加载失败；首考题 4（受限排错）：根据自动播放失败、坐标偏差、域名/Key 错误、CORS、签名过期、分片乱序、重复完成、内容类型伪造或遗留分片定位修复；首考题 5（学习复述）：3 分钟说明媒体元素、专业媒体管线、地图 SDK、服务端代理上传和对象存储直传的选择边界。命题边界：厂商文档用于验证一套真实流程，但不得把高德或 OSS 的产品名、字段和限制当作通用 Web 标准。
- 通过标准：权限与失败路径可恢复；媒体和地图资源卸载时释放；坐标、精度和隐私说明清楚；长期密钥不进入浏览器；短期授权最小范围且可过期；上传可取消、恢复、校验、去重和清理，服务端不信任客户端上报的类型、路径与完成状态；无地图 SDK 或对象存储能力时仍有可用降级。评估边界：只用小文件、把永久密钥写入前端、依赖单一厂商快乐路径或没有服务端确认不能通过。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟

## MEDIA-01 专业 Web 音视频管线、播放与质量治理

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#media-01)、[MDN 屏幕捕获 API](https://developer.mozilla.org/zh-CN/docs/Web/API/Screen_Capture_API)、[MDN Picture-in-Picture](https://developer.mozilla.org/zh-CN/docs/Web/API/Picture-in-Picture_API)、[MDN 媒体源扩展 MSE](https://developer.mozilla.org/zh-CN/docs/Web/API/Media_Source_Extensions_API)、[MDN 加密媒体扩展 EME](https://developer.mozilla.org/zh-CN/docs/Web/API/Encrypted_Media_Extensions_API)、[MDN AudioWorkletNode](https://developer.mozilla.org/zh-CN/docs/Web/API/AudioWorkletNode)、[WebCodecs](https://www.w3.org/TR/webcodecs/)（英文原文，仅用于版本核验）、[Media Capabilities](https://www.w3.org/TR/media-capabilities/)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：摄像头/麦克风/屏幕/窗口/标签页捕获、用户授权、约束协商、设备枚举与热切换、轨道 ended/mute/unmute 生命周期、系统音频、Region Capture 与 Picture-in-Picture 的兼容/隐私边界；容器、轨道、编解码器、WebCodecs 队列/背压/释放；MSE、自适应码率与直播延迟；EME/DRM；Media Capabilities、QoE；MediaStream、录制、WebRTC 媒体处理、AudioWorklet；字幕、转写、音频描述和降级。
- 严格考核：首考题 1（资料定位）：只允许使用《中文核心讲义》，定位采集授权/轨道生命周期、区域捕获/PiP、容器/编码分层、WebCodecs 生命周期、MSE 缓冲、EME 边界、音频线程和 QoE 指标；首考题 2（机制解释）：闭卷画出摄像头或屏幕经约束协商、轨道、处理、编码、网络/封装、解码、同步到播放的管线，解释用户停止分享、设备拔出、时间戳、关键帧、背压和资源释放如何传播；首考题 3（最小产出）：实现可取消的会议/录制切片，支持摄像头与屏幕选择、授权拒绝恢复、设备热切换、轨道结束提示、Region Capture/PiP 能力检测、帧级处理、受控队列、MSE 或实时预览、字幕和质量面板，并提供降级；首考题 4（受限排错）：根据用户停止共享、权限永久拒绝、设备 label 不可用、切换后旧轨道未停、区域句柄失效、PiP 退出、音画不同步、队列增长、帧未关闭、SourceBuffer 异常、后台限流、DRM 拒绝或掉帧证据定位；首考题 5（学习复述）：3 分钟说明何时使用媒体元素、屏幕捕获、Region Capture、PiP、MSE、WebCodecs、WebRTC、AudioWorklet 或服务端媒体处理。命题边界：必须由明确用户操作触发高权限捕获，不能伪造或绕过浏览器分享指示；英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：权限拒绝、撤销、用户主动停止、设备插拔/切换和页面隐藏均有明确状态与恢复；旧轨道和硬件指示及时释放；区域捕获/PiP 不支持时核心流程可用；时间戳单调且音画同步；队列有上限并施加背压；帧、Chunk、Track、Worklet、SourceBuffer 和对象 URL 生命周期可证明已释放；QoE 至少包含首帧、卡顿、掉帧和错误；版权内容不绕过 EME；字幕与控件可访问。评估边界：只在预授权桌面环境播放本地 MP4、忽略用户停止共享或把 WebCodecs 当完整播放器不能通过。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## 领域综合考核

- [ ] 已通过领域综合考核
- 任务：选择现有 H5 页面，在中端移动设备和弱网条件下完成性能治理，提交基线、trace、优化实现、前后数据、兼容性矩阵和回归清单；无障碍与体验质量统一由 `A11Y-01` 和 `UX-01` 验证。
- 通过标准：8 小时内完成；至少一个核心指标改善 25%；iOS/Android 主流程通过；所有结论均有截图、trace 或测量数据。评估边界：评分只依据列出资料、题目给定输入和可复核产出；额外框架经验不得替代机制与证据。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 165 分钟；考核 105 分钟；复测 90 分钟
