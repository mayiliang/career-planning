# 07 Web 性能、H5 与 Hybrid

所有“通过”均需满足[统一考核规则](00-assessment-rules.md)。性能结论必须有数据；移动端结论至少在一种真实移动设备或可靠设备环境中验证。

## PERF-01 Core Web Vitals 与性能预算

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[web.dev Performance](https://web.dev/performance/)、[Core Web Vitals](https://web.dev/articles/vitals)、[Lighthouse Performance](https://developer.chrome.com/docs/lighthouse/performance/)。
- 严格考核：解释 LCP、INP、CLS 的测量与归因；为一个真实页面建立性能预算；比较实验室数据和真实用户数据。
- 通过标准：指标解释无混淆；预算包含基线、目标、设备与网络条件；能指出平均值掩盖长尾的问题。

## PERF-02 Network、资源加载与缓存优化

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Chrome Network Reference](https://developer.chrome.com/docs/devtools/network/reference/)、[HTTP Caching](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Guides/Caching)、[Resource Hints](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Reference/Attributes/rel/preload)。
- 严格考核：分析请求瀑布流、关键资源、缓存、压缩、图片和第三方脚本；提出并实施 3 项优化；对比前后数据。
- 通过标准：至少改善一个加载指标 20% 或用证据否定无效优化；缓存与预加载不造成重复下载或版本错乱。

## PERF-03 主线程、渲染、长任务与交互响应

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Chrome Performance](https://developer.chrome.com/docs/devtools/performance/)、[Rendering Performance](https://web.dev/articles/rendering-performance)、[Long Tasks API](https://developer.mozilla.org/zh-CN/docs/Web/API/PerformanceLongTaskTiming)。
- 严格考核：录制一次卡顿操作；从 flame chart 定位脚本、布局或绘制瓶颈；通过分片、减少布局或 worker 优化。
- 通过标准：结论可由 trace 复核；优化不改变业务正确性；INP 或长任务时长达到题目目标。

## PERF-04 内存、监听器与资源泄漏

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Chrome Memory Problems](https://developer.chrome.com/docs/devtools/memory-problems/)、[MDN Memory Management](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Memory_management)。
- 严格考核：在反复打开页面/弹窗/播放器后拍摄 heap snapshot；定位 detached DOM、未清理监听器或大对象保留；修复并复测。
- 通过标准：能从 retaining path 证明根因；重复操作后的堆增长稳定；不会只用强制 GC 掩盖泄漏。

## H5-01 viewport、响应式、安全区与横竖屏

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN Responsive Design](https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/CSS_layout/Responsive_Design)、[viewport](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Viewport_meta_tag)、[CSS env](https://developer.mozilla.org/zh-CN/docs/Web/CSS/env)。
- 严格考核：实现 320-430px 页面并兼容刘海安全区、横屏、字体放大和动态视口；解释 px/rem/vw 方案取舍。
- 通过标准：关键内容不被遮挡；无横向滚动；200% 字体缩放仍可操作；不依赖设备型号硬编码。

## H5-02 滚动、软键盘、触控与手势冲突

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN Touch Events](https://developer.mozilla.org/zh-CN/docs/Web/API/Touch_events)、[Visual Viewport](https://developer.mozilla.org/zh-CN/docs/Web/API/Visual_Viewport_API)、真实 H5 历史问题。
- 严格考核：复现并修复滚动穿透、输入框遮挡、列表回弹、300ms/重复点击或手势冲突；在 iOS/Android 环境对照验证。
- 通过标准：主流程两端通过；事件监听正确设置 passive 与清理；修复不锁死页面其他滚动区域。

## HYBRID-01 企业微信/钉钉 SDK 与容器差异

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[企业微信 JS-SDK](https://developer.work.weixin.qq.com/document/path/94313)、[钉钉 JSAPI](https://open.dingtalk.com/document/isvapp-client/read-before-development)。
- 严格考核：画出环境识别、签名、鉴权、ready/error、API 调用和降级链路；定位签名失败、域名错误、时钟偏差或容器版本问题。
- 通过标准：排障清单按证据顺序执行；浏览器非容器环境可降级；敏感签名不在前端生成或泄露。

## H5-03 视频、音频、地图、定位、上传与签名

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN Media](https://developer.mozilla.org/zh-CN/docs/Web/Media)、[Geolocation](https://developer.mozilla.org/zh-CN/docs/Web/API/Geolocation_API)、所用地图与上传 SDK 官方文档。
- 严格考核：实现一个媒体/定位业务流程，覆盖权限拒绝、弱网、后台切换、超时、取消、文件过大和 SDK 加载失败。
- 通过标准：所有权限与失败路径可恢复；资源在卸载时释放；坐标、精度、隐私说明和上传进度明确。

## PERF-05 可访问性与体验质量

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[WCAG Overview](https://www.w3.org/WAI/standards-guidelines/wcag/)、[Lighthouse Accessibility](https://developer.chrome.com/docs/lighthouse/accessibility/)。
- 严格考核：对一个 Web/H5 页面做键盘、对比度、语义、动态通知和缩放审计；修复全部严重问题；用自动工具加人工验证。
- 通过标准：Lighthouse 不存在严重问题；核心路径键盘可完成；焦点与读屏通知合理；不能只凭自动分数通过。

## 领域综合考核

- [ ] 已通过领域综合考核
- 任务：选择现有 H5 页面，在中端移动设备和弱网条件下完成性能与体验治理，提交基线、trace、优化实现、前后数据、兼容性矩阵和回归清单。
- 通过标准：8 小时内完成；至少一个核心指标改善 25%；iOS/Android 主流程通过；所有结论均有截图、trace 或测量数据。
