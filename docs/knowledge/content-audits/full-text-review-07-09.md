# 07–09 学习资料全文语义复核

复核日期：2026-08-25。范围：领域 07、08、09 的 28 个知识点，以及三轮复核期间被替换或降为按需查询的候选页。当前知识库共保留 72 个资料映射：28 个本地精确锚点和 44 个外部页面。

## 复核方法与判定口径

- 本地 Markdown 按 UTF-8 从头至尾读取，并把每节逐项映射到首考题 1、机制解释、最小产出、受限排错、复测变式和通过标准。
- 可直接抓取的外部页提取 `<article>`/`<main>` 可读正文后从首行读到末行；客户端渲染页面使用可见语义正文分段核读。中英对照重复、导航、兼容表、API 字典仍计入页面范围，但不会被误算成新的知识覆盖。
- “保留”要求正文直接支撑当前知识点，且超纲内容已在学习资料行或本地讲义中明确排除；“移出必读”表示页面仍可作为实现时查询入口，但不进入首考题 1 和资料闭环；“删除”表示正文存在过时、语言或聚焦问题。
- 超大型 Node API 根页额外做全量结构、版本历史和所有模块分区的扫描，并全文核读挑战实际涉及的 Stream/fs/error/http/performance 段。它们因 1,940–6,821 行完整参考枚举而被移出必读；本文不把这种结构审计伪称为适合初学者的逐行学习。

## 领域 07：性能、移动 Web 与媒体

| 资料 | 全文观察 | 当前判定 |
| --- | --- | --- |
| [07–09 讲义：PERF-01](../chinese-guides/perf-01-core-web-vitals-performance-budgets.md#perf-01) | 指标、p75、预算、实验室/RUM、反例和复测闭环；固定版本已改为运行时记录 | 保留，主讲义 |
| [Core Web Vitals](https://web.dev/articles/vitals?hl=zh-cn) | 全文覆盖 LCP/INP/CLS、good/needs improvement/poor、75 分位、字段与实验室限制 | 保留，指标定义 |
| [Lighthouse 性能评分](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring?hl=zh-cn) | 原链接重定向到评分页；正文讲权重、波动和分数而非完整操作流程 | 保留但限于评分限制，操作由讲义承担 |
| [07–09 讲义：PERF-02](../chinese-guides/perf-02-network-resource-loading-cache-optimization.md#perf-02) | 已补脱敏 HAR、瀑布阶段、缓存、资源提示、预取/预渲染/bfcache 和副作用 | 保留，主讲义 |
| [Chrome Network Reference](https://developer.chrome.com/docs/devtools/network/reference/?hl=zh-cn) | 363 行/12,843 字；除瀑布、节流、HAR 外还含过滤、Cookie、WebSocket、覆盖等大量工具说明 | 移出必读，按需查工具 |
| [HTTP 缓存指南](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Guides/Caching) | 缓存键、验证、新鲜度、共享/私有缓存完整；managed cache、请求折叠、QPACK 等超出首考 | 保留，进阶名词由讲义划界 |
| [`preload`](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Reference/Attributes/rel/preload) | 资源类型、CORS、字体、响应式媒体、重复下载风险均直接相关 | 保留 |
| [预渲染总页](https://developer.chrome.com/docs/web-platform/prerender-pages?hl=zh-cn) | 442 行/17,760 字；覆盖 Speculation Rules、激活、扩展、测量和大量部署细节 | 移出必读，讲义保留必要机制 |
| [往返缓存](https://web.dev/articles/bfcache?hl=zh-cn) | 248 行/13,110 字；页面生命周期、阻断原因、测试与分析直接相关，分析/连接细节偏进阶 | 保留，限定生命周期与恢复 |
| [07–09 讲义：PERF-03](../chinese-guides/perf-03-main-thread-rendering-long-tasks-inp.md#perf-03) | trace、LoAF、Long Task、INP、observer 成本和受限归因闭环 | 保留，主讲义 |
| [Chrome Performance](https://developer.chrome.com/docs/devtools/performance/?hl=zh-cn) | 75 行/3,390 字；录制、分析、主线程与调用栈流程聚焦 | 保留 |
| [Rendering Performance](https://web.dev/articles/rendering-performance?hl=zh-cn) | 44 行/3,218 字；JS/Style/Layout/Paint/Composite 与帧预算聚焦 | 保留 |
| [PerformanceLongTaskTiming](https://developer.mozilla.org/zh-CN/docs/Web/API/PerformanceLongTaskTiming) | 长任务条目与归因接口聚焦，但兼容范围有限 | 保留，必须 feature detection |
| [PerformanceObserver](https://developer.mozilla.org/zh-CN/docs/Web/API/PerformanceObserver) | 页面较短且中文翻译生硬；能查构造、observe/disconnect，不能承担现场采集策略 | 保留为接口查证，主机制在讲义 |
| [07–09 讲义：PERF-04](../chinese-guides/perf-04-memory-listeners-resource-leaks.md#perf-04) | 可达性、retaining path、重复趋势、资源释放和弱引用边界完整 | 保留，主讲义 |
| [Chrome Memory Problems](https://developer.chrome.com/docs/devtools/memory-problems/?hl=zh-cn) | 97 行；任务管理器、堆快照、分配、detached DOM 操作聚焦 | 保留 |
| [Memory Management](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Memory_management) | 200 行；前半可达性/标记清除相关，后半 WeakMap/WeakRef/FinalizationRegistry 超纲 | 保留限定前半，超纲由讲义解释 |
| [07–09 讲义：H5-01](../chinese-guides/h5-01-viewport-responsive-safe-area-orientation.md#h5-01) | viewport/DPR/响应式/安全区/横竖屏/字体缩放和三类视口单位 | 保留，主讲义 |
| [Responsive Design](https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/CSS_layout/Responsive_Design) | 162 行；包含大量历史、浮动布局、响应式排版等宽泛教程 | 移出必读 |
| [viewport meta](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Viewport_meta_tag) | viewport 配置、缩放、可访问性和尺寸语义聚焦 | 保留 |
| [CSS `env()`](https://developer.mozilla.org/zh-CN/docs/Web/CSS/env) | 环境变量、安全区和回退语法聚焦 | 保留 |
| [07–09 讲义：H5-02](../chinese-guides/h5-02-scroll-soft-keyboard-pointer-gestures.md#h5-02) | Pointer、passive、VisualViewport、滚动链、软键盘和双端故障注入 | 保留，主讲义 |
| [Touch Events](https://developer.mozilla.org/zh-CN/docs/Web/API/Touch_events) | 257 行；有限兼容、旧事件模型和历史写法较多 | 移出必读，旧宿主按需 |
| [Pointer Events](https://developer.mozilla.org/zh-CN/docs/Web/API/Pointer_events) | 301 行；统一输入、capture、事件和示例相关，完整接口枚举偏宽 | 保留限定概念/capture/cancel |
| [Visual Viewport](https://developer.mozilla.org/zh-CN/docs/Web/API/Visual_Viewport_API) | 可见区域、resize/scroll 与键盘场景聚焦 | 保留 |
| [`overscroll-behavior`](https://developer.mozilla.org/zh-CN/docs/Web/CSS/overscroll-behavior) | 滚动链控制直接相关，但并非所有宿主完整支持 | 保留并要求回退 |
| [07–09 讲义：HYBRID-01](../chinese-guides/content-audit-07-09.md#hybrid-01) | 三环境、服务端签名、ready/error、能力检测、Bridge 与普通 H5 回退 | 保留，唯一必读 |
| [企业微信 JS-SDK](https://developer.work.weixin.qq.com/document/path/94313) | 可读提取 1,713 行主要是全站导航，目标 `ww.register` 片段不足以覆盖跨容器合同 | 移出必读，实机按版本查阅 |
| [钉钉 JSAPI](https://open.dingtalk.com/document/isvapp-client/read-before-development) | 公开抓取仅有标题，无法形成可复核正文 | 移出必读 |
| [07–09 讲义：H5-03](../chinese-guides/content-audit-07-09.md#h5-03) | 定位状态机、精度/隐私、公开 Key 与 secret、地图销毁和文本降级 | 保留，主讲义 |
| [Geolocation](https://developer.mozilla.org/zh-CN/docs/Web/API/Geolocation_API) | 安全上下文、单次/持续定位、权限和接口聚焦，中文更新时间较早 | 保留并以当前实现复测 |
| [Permissions API](https://developer.mozilla.org/zh-CN/docs/Web/API/Permissions_API) | permission state 与查询限制聚焦 | 保留 |
| [高德 JS API 概述](https://lbs.amap.com/api/javascript-api-v2/summary) | 只列能力，不覆盖 Key/安全密钥和实例销毁，旧审计结论错误 | 删除并替换 |
| [高德准备工作](https://lbs.amap.com/api/javascript-api-v2/prerequisites) | 14 行；Key 与安全密钥/配置前置条件聚焦 | 保留 |
| [高德地图生命周期](https://lbs.amap.com/api/javascript-api-v2/guide/map/lifecycle) | 54 行；创建、complete、事件和 `destroy()` 聚焦 | 保留 |
| [07–09 讲义：H5-04](../chinese-guides/content-audit-07-09.md#h5-04) | 三种路径、信任/成本、状态机、故障切换、对账和可复现实验完整 | 保留，主讲义 |
| [File API](https://developer.mozilla.org/zh-CN/docs/Web/API/File_API) | File/Blob/输入与示例相关，OPFS 背景不参与本点 | 保留限定 File/Blob |
| [OSS 服务端签名直传](https://help.aliyun.com/zh/oss/user-guide/obtain-signature-information-from-the-server-and-upload-data-to-oss) | 1,330 行；混入 ECS、RAM/STS、CORS、五种后端语言、清理和 FAQ | 移出必读，厂商项目按需 |
| [OSS 分片上传](https://help.aliyun.com/zh/oss/user-guide/multipart-upload/) | 1,108 行；覆盖多语言 SDK、运维、成本与清理，远超浏览器知识点 | 移出必读，厂商项目按需 |
| [07–09 讲义：MEDIA-01](../chinese-guides/content-audit-07-09.md#media-01) | container/track/codec、MSE/ABR、WebCodecs、EME/DRM、QoE 和降级 | 保留，主讲义 |
| [Picture-in-Picture](https://developer.mozilla.org/zh-CN/docs/Web/API/Picture-in-Picture_API) | 状态与权限聚焦，兼容范围有限 | 保留 |
| [MSE 中文概览](https://developer.mozilla.org/zh-CN/docs/Web/API/Media_Source_Extensions_API) | 53 行；含 Flash 历史和“H.264/AAC/MP4 一定兼容”等过时绝对说法 | 删除 |
| [EME](https://developer.mozilla.org/zh-CN/docs/Web/API/Encrypted_Media_Extensions_API) | 加密媒体会话边界短而聚焦 | 保留 |
| [07–09 讲义：MEDIA-02](../chinese-guides/content-audit-07-09.md#media-02) | 采集、Track/Recorder、WebRTC、AudioWorklet、字幕时序、质量与隐私完整 | 保留，主讲义 |
| [Screen Capture](https://developer.mozilla.org/zh-CN/docs/Web/API/Screen_Capture_API) | 用户选择、轨道与停止聚焦；部分段落未翻译 | 保留 |
| [getUserMedia](https://developer.mozilla.org/zh-CN/docs/Web/API/MediaDevices/getUserMedia) | 194 行；包含旧前缀、polyfill、Firefox OS 和大段兼容历史 | 移出必读 |
| [WebRTC API](https://developer.mozilla.org/zh-CN/docs/Web/API/WebRTC_API) | 191 行；包含完整接口、DTMF、身份等大量未考内容 | 移出必读 |
| [AudioWorkletNode](https://developer.mozilla.org/zh-CN/docs/Web/API/AudioWorkletNode) | 节点/port/onprocessorerror 聚焦，但未解释实时线程禁忌 | 保留，实时约束由讲义补足 |

## 领域 08：组件系统与多运行时交付

| 资料 | 全文观察 | 当前判定 |
| --- | --- | --- |
| [COMP-01 组件职责与公共契约主讲义](../chinese-guides/comp-01-component-responsibility-api-composition.md#comp-01) | 跨框架职责、API、组合、无障碍、边界、测试和演进 | 2026-09-01 全文复审，保留 |
| [Thinking in React](https://zh-hans.react.dev/learn/thinking-in-react) | 465 行/13,608 字；组件层级、最小 state、单向数据流相关 | 保留 |
| [Passing Props](https://zh-hans.react.dev/learn/passing-props-to-a-component) | 284 行/6,628 字；props、默认值、children 与传递相关 | 保留 |
| [COMP-02 组件状态所有权主讲义](../chinese-guides/comp-02-controlled-uncontrolled-state-imperative.md#comp-02) | 受控/非受控唯一所有者、模式切换、异步竞态、持久化和最小句柄 | 2026-09-01 全文复审，保留 |
| [Sharing State](https://zh-hans.react.dev/learn/sharing-state-between-components) | 222 行/6,176 字；状态提升与单一所有者聚焦 | 保留 |
| [`useImperativeHandle`](https://zh-hans.react.dev/reference/react/useImperativeHandle) | 114 行/3,420 字；当前 React 19 ref 说明和句柄示例聚焦 | 保留 |
| [07–09 讲义：DS-01](../chinese-guides/content-audit-07-09.md#ds-01) | 通用三层 Token、主题、发布、对比度与 Ant 术语映射 | 保留，主讲义 |
| [Ant Design 主题配置](https://ant.design/docs/react/customize-theme-cn/?locale=zh-CN) | 客户端正文 777 行；配置/算法/Seed-Map-Alias 相关，数百项 Token 字典是查表 | 保留限定正文，字典按需 |
| COMP-03 / PLATFORM-01 / PLATFORM-03 / MOBILE-01 本地锚点 | 各节全文分别覆盖发布治理、Schema 安全、采用率和跨平台原生；外部英文/产品 API 页已在二轮移除 | 保留本地唯一必读 |
| [07–09 讲义：PLATFORM-02](../chinese-guides/content-audit-07-09.md#platform-02) | 拆分决策、协议、故障域、组织成本、回滚和退出 | 保留，主讲义 |
| [qiankun 快速上手](https://qiankun.umijs.org/zh/guide/getting-started/) | 85 行/2,405 字；注册、生命周期与卸载聚焦 | 保留 |
| [qiankun API](https://qiankun.umijs.org/zh/api/) | 250 行/9,615 字；register/start/load/unmount 相关，预取和全局状态表偏宽 | 保留限定核心 API |
| [07–09 讲义：EMBED-01](../chinese-guides/content-audit-07-09.md#embed-01) | 四形态决策、版本协议、租户隔离、安全与销毁 | 保留，主讲义 |
| [`iframe`](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Reference/Elements/iframe) | 222 行/7,861 字；sandbox/allow/title/跨源相关，其他属性偏宽 | 保留限定段落 |
| [`postMessage`](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/postMessage) | 106 行/4,726 字；targetOrigin/source/origin 与消息事件直接相关 | 保留，Schema/nonce 由讲义补足 |
| [07–09 讲义：RUNTIME-01](../chinese-guides/content-audit-07-09.md#runtime-01) | 网页/MV3/小程序/WebView 的能力、生命周期、Bridge、合同实验和降级 | 保留，主讲义 |
| [Chrome Manifest V3](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3?hl=zh-cn) | 38 行/855 字；service worker、权限、远程代码限制聚焦 | 保留 |
| [旧 MDN Content scripts](https://developer.mozilla.org/zh-CN/docs/Mozilla/Add-ons/WebExtensions/Content_scripts#与后台脚本通信) | 380 行/12,016 字；混入 Firefox/MV2/Xray/eval 等大量旧/跨实现细节 | 移出必读 |
| [Chrome 内容脚本](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts?authuser=0&hl=zh-cn) | 470 行/12,382 字；全文含三类注入、glob/frame、资源/CSP/安全，远超宿主合同首考 | 按当前版本查询，不列必读 |
| [Chrome 消息传递](https://developer.chrome.com/docs/extensions/develop/concepts/messaging?hl=zh-cn) | 304 行/12,074 字；一次/长连接、跨扩展/网页/原生消息及逐步发布的 146/148 行为 | 按当前版本查询，不列必读 |
| [07–09 讲义：RUNTIME-02](../chinese-guides/content-audit-07-09.md#runtime-02) | Electron/Tauri 能力授予、路径/IPC、更新与回滚 | 保留，主讲义 |
| [Electron 安全](https://www.electronjs.org/zh/docs/latest/tutorial/security) | 390 行/15,064 字；清单、隔离、沙箱、导航/外链和 IPC 直接相关，fuses 等偏进阶 | 保留限定安全清单 |
| [Electron 进程模型](https://www.electronjs.org/zh/docs/latest/tutorial/process-model) | 91 行/4,093 字；main/renderer/preload 聚焦 | 保留 |
| [Tauri 安全](https://v2.tauri.app/zh-cn/security/) | 55 行/1,779 字；信任边界和权限模型中文正文聚焦 | 保留 |
| [Tauri Capability](https://v2.tauri.app/zh-cn/security/capabilities/) | 178 行/6,608 字；URL 为 zh-cn 但正文实际为英文 | 移出中文必读，由讲义补足 |

## 领域 09：Node.js 服务与接口工具

| 资料 | 全文观察 | 当前判定 |
| --- | --- | --- |
| [中文主讲义：NODE-01](../chinese-guides/node-01-runtime-event-loop-nonblocking-io.md#node-01) | 全文逐段复核：线程/内核/工作池、事件循环与微任务、公平性、延迟/利用率、分片/worker、资源追踪、容量和版本实验均有解释与边界 | 保留，独立主讲义 |
| [Node.js 事件循环](https://nodejs.cn/learn/asynchronous-work/event-loop-timers-and-nexttick) | 390 行/19,695 字；中英对照重复；phase/poll/check/nextTick 和版本说明相关 | 保留限定核心段落 |
| [不要阻塞事件循环/工作池](https://nodejs.cn/learn/asynchronous-work/dont-block-the-event-loop) | 507 行/37,465 字；全文含阻塞、REDOS、JSON、分区/卸载、工作池和 npm 成本 | 保留限定核心，进阶术语由讲义解释 |
| [中文主讲义：NODE-02](../chinese-guides/node-02-files-streams-buffers-errors.md#node-02) | 全文逐段复核：句柄/Buffer、记录分块、背压、pipeline、取消、错误、文件提交、并发、路径、互操作和批量恢复形成连续教学链 | 保留，独立主讲义 |
| [流中的背压](https://nodejs.cn/learn/modules/backpressuring-in-streams) | 539 行/25,762 字；全文含 pipeline、内存实验、drain 与自定义流；旧 pump/dtrace 和自定义内部方法偏宽 | 保留限定必要段落 |
| [写入文件](https://nodejs.cn/learn/manipulating-files/writing-files-with-nodejs) | 90 行/2,735 字；异步/同步/Promise、覆盖/追加；不覆盖原子替换 | 保留为入口，原子机制由讲义承担 |
| Stream / fs / Errors API 根页 | 分别 4,017/6,821/3,479 行；全量结构含所有类、重载、历史、系统码和平台差异，挑战相关段已核读 | 移出必读，编码时按 API 名查询 |
| [中文主讲义：NODE-04](../chinese-guides/node-04-http-bff-production-engineering.md#node-04) | 全文逐段复核：HTTP/BFF 生命周期、校验、身份、deadline、容量、重试/幂等、缓存、流、过载、观测、健康、停机、代理与发布完整 | 保留，独立主讲义 |
| [AbortController](https://developer.mozilla.org/zh-CN/docs/Web/API/AbortController) | 65 行/1,681 字；controller/signal/abort/AbortError 聚焦 | 保留 |
| HTTP / perf_hooks API 根页 | 分别 3,552/1,940 行；全量结构是完整类/Agent/条目/历史参考，远超 BFF 挑战 | 移出必读，具体 API 按需查询 |
| [07–09 讲义：NODE-03](../chinese-guides/content-audit-07-09.md#node-03) | 参数/配置优先级、通道、退出码、确认、EPIPE、SIGINT 和零副作用 | 保留，主讲义 |
| [运行 Node.js 脚本](https://nodejs.cn/learn/command-line/run-nodejs-scripts-from-the-command-line) | 71 行/4,640 字；只覆盖运行、shebang、eval/watch/run，不覆盖完整 CLI 契约 | 保留为运行入口 |
| [07–09 讲义：API-01](../chinese-guides/content-audit-07-09.md#api-01) | OpenAPI 3.2/YAML/方言、引用、Overlay、多文件、规范化、诊断与固定 fixture | 保留，唯一必读 |
| [07–09 讲义：API-02](../chinese-guides/content-audit-07-09.md#api-02) | IR 到 AST、命名、确定性、受管写入、回滚与 typecheck | 保留，唯一必读 |

## 三轮修正结论

2026-08-31 的 B18 复核再次逐份读取上述 3 份现行主讲义、它们的直接前置与递归祖先，并核对两篇 Node 中文教程、写文件/背压教程和 AbortController 页面承担的窄职责。前置闭包只在每份讲义头部列直接依赖：NODE-01 → JS-04；NODE-02 → NODE-01、JS-05；NODE-04 → NODE-02、NET-01、TS-07。NODE-04 不再重复列 NODE-01，因为它已由 NODE-02 递归包含；整条链无环、无传递性重复。

- 删除/移出必读的不是“非权威资料”，而是正文范围、语言或时效不能与当前知识点和挑战形成恰好闭环的页面。
- 当前每个知识点至少有一份可脱离外链学习的中文锚点；外部页只承担可明确指出的窄职责。
- 资料定位题已同步到当前名称和来源；固定 Chrome 126 已替换为“题目指定的当前稳定版并记录完整版本”。
- `H5-03` 不再把受域名/能力限制的公开地图 Key 与服务端 secret 混为一谈；`H5-04` 不再要求初学者读完云平台 ECS/RAM/多语言后端教程；`NODE-02/04` 不再把数千行 API 根参考伪装成初级必读。
