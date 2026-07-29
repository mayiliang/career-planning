# 18 图形可视化、产品实验、SEO、兼容性与国际化

所有“通过”均需满足[统一考核规则](00-assessment-rules.md)。本领域连接视觉表达、产品度量和全球化交付，避免高级前端只会实现页面而不能验证产品效果。

## GRAPHICS-01 SVG、Canvas 2D 与图形选择

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN SVG](https://developer.mozilla.org/zh-CN/docs/Web/SVG)、[MDN Canvas API](https://developer.mozilla.org/zh-CN/docs/Web/API/Canvas_API)。覆盖范围：SVG 场景/DOM 与 Canvas 即时绘制模型、坐标和变换、路径、事件委托、命中测试、DPR 高清屏、缩放/平移、文本与图片加载、导出、键盘/替代文本、大量对象性能和选型降级。
- 严格考核：首考题 1（资料定位）：定位 SVG 与 Canvas 的能力差异；首考题 2（机制解释）：解释场景图和即时绘制模型；首考题 3（最小产出）：分别实现可交互关系图；首考题 4（受限排错）：处理缩放模糊、事件偏移和大节点卡顿；首考题 5（学习复述）：给出技术选择依据。命题边界：不得只按节点数量给出单一结论。
- 通过标准：视觉、交互和导出正确；高清屏清晰；键盘或文本替代可用；有性能测量。评估边界：不能以第三方库默认行为代替底层解释。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## GRAPHICS-02 WebGL/WebGPU 渲染管线与资源管理

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#graphics-02)、[MDN WebGL](https://developer.mozilla.org/zh-CN/docs/Web/API/WebGL_API)、[WebGPU Specification](https://www.w3.org/TR/webgpu/)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：GPU 管线、Buffer、Texture、Shader、批处理、资源释放、device/context lost、兼容与降级。
- 严格考核：题源包含《中文核心讲义》；首考题 1（资料定位）：只允许使用《中文核心讲义》，定位能支撑「WebGL/WebGPU 渲染管线与资源管理」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：画出数据上传到像素输出的过程；首考题 3（最小产出）：渲染十万点并实现缩放选择；首考题 4（受限排错）：诊断显存增长、上下文丢失和 Shader 错误；首考题 5（学习复述）：说明为何 WebGPU 不是 WebGL 的无条件替代。命题边界：必须标注浏览器兼容和实验特性。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：资源生命周期正确；交互保持响应；丢失后可恢复；无支持时提供 Canvas/SVG 降级。评估边界：只比较峰值 FPS 不足以通过。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## VIS-01 数据可视化语义、交互与性能

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/advanced-topics.md#vis-01)、[D3 Documentation](https://d3js.org/getting-started)（英文原文，仅用于版本核验）、[W3C WAI Images Tutorial](https://www.w3.org/WAI/tutorials/images/complex/)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：数据类型与视觉编码、线性/对数/时间比例尺、坐标与截断风险、感知颜色和不确定性、筛选/缩放/刷选、键盘交互、复杂图表说明/数据表、大数据聚合/抽样、渲染策略和误导检查。
- 严格考核：题源包含《中文核心讲义》；首考题 1（资料定位）：只允许使用《中文核心讲义》，定位能支撑「数据可视化语义、交互与性能」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：解释数据到视觉属性的映射；首考题 3（最小产出）：实现可筛选、缩放和键盘访问的趋势/分布图；首考题 4（受限排错）：纠正误导坐标、颜色混淆和重绘瓶颈；首考题 5（学习复述）：说明如何验证图表没有误导。命题边界：不得把“好看”作为主要评估标准。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：视觉编码与数据类型匹配；含标题、单位、来源和替代数据表；大数据量有抽样或聚合策略。评估边界：默认主题可用不代表无障碍通过。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## ANALYTICS-01 埋点模型、数据质量与可观测产品指标

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#analytics-01)、[OpenTelemetry Browser Instrumentation](https://opentelemetry.io/zh/docs/languages/js/getting-started/browser/)、[W3C Privacy Principles](https://www.w3.org/TR/privacy-principles/)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：事件命名/版本/owner、属性类型字典、匿名/登录/租户身份边界、漏斗/留存口径、重复/遗漏/乱序数据质量、离线批量、采样、同意、敏感字段、删除、告警和版本迁移复算。
- 严格考核：题源包含《中文核心讲义》；首考题 1（资料定位）：只允许使用《中文核心讲义》，定位能支撑「埋点模型、数据质量与可观测产品指标」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：解释事件从页面到指标的链路；首考题 3（最小产出）：为核心漏斗设计事件字典和校验器；首考题 4（受限排错）：发现重复、遗漏、时序和口径漂移；首考题 5（学习复述）：区分产品分析、日志和性能监控。命题边界：不得采集未证明必要的个人数据。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：事件有 owner、版本和校验；指标可从原始事件复算；隐私同意和删除链路明确；异常数据可告警。评估边界：只展示仪表盘截图不算证据。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## EXP-01 Feature Flag、渐进发布与配置治理

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/advanced-topics.md#exp-01)、[OpenFeature Specification](https://openfeature.dev/specification/)（英文原文，仅用于版本核验）、[OpenFeature Evaluation Context](https://openfeature.dev/docs/reference/concepts/evaluation-context/)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：发布/实验/运维 Flag 类型、稳定 key 与类型、评估上下文、隐私与服务端授权边界、安全默认值、缓存/离线、审计、权限、稳定分组、灰度、Kill Switch、owner/到期和代码/配置技术债清理。
- 严格考核：题源包含《中文核心讲义》；首考题 1（资料定位）：只允许使用《中文核心讲义》，定位能支撑「Feature Flag、渐进发布与配置治理」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：解释配置发布到客户端决策的过程；首考题 3（最小产出）：实现带本地默认值和紧急关闭的功能发布；首考题 4（受限排错）：处理配置服务不可用、用户串组和旧 Flag 遗留；首考题 5（学习复述）：区分发布 Flag、实验 Flag 和权限。命题边界：Flag 不能替代授权校验。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：默认值安全；分组稳定；变更可审计和回滚；每个 Flag 有到期时间和负责人。评估边界：不得在客户端下发敏感分组规则。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## EXP-02 A/B Test、统计推断与实验护栏

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/advanced-topics.md#exp-02)、[NIST Hypothesis Tests](https://www.itl.nist.gov/div898/handbook/prc/section1/prc13.htm)（英文原文，仅用于版本核验）、[Microsoft ExP Experimentation Platform](https://www.microsoft.com/en-us/research/group/experimentation-platform-exp/)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：可证伪假设、随机单元/稳定分流、样本量与检验功效、SRM、显著性/效应量/置信区间、多重比较、提前窥探/停止、主指标/护栏、污染、新奇效应、分群与业务决策。
- 严格考核：题源包含《中文核心讲义》；首考题 1（资料定位）：只允许使用《中文核心讲义》，定位能支撑「A/B Test、统计推断与实验护栏」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：说明随机分流到结论的因果链；首考题 3（最小产出）：设计并分析一个转化实验；首考题 4（受限排错）：识别样本污染、SRM、窥探和指标选择偏差；首考题 5（学习复述）：解释统计显著与业务重要的差别。命题边界：不要求手算复杂统计，但必须正确解释假设和不确定性。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：主指标和护栏事前确定；分流稳定；报告效应量和区间；不因单次 p 值武断上线。评估边界：相关性图表不能代替随机实验。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## I18N-01 本地化、文本方向与可翻译 UI

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#i18n-01)、[W3C Internationalization](https://www.w3.org/International/quicktips/)（英文原文，仅用于版本核验）、[MDN dir 属性](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Global_attributes/dir)。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：BCP 47 语言标记、翻译键与消息上下文、复数/性别/插值、文本扩展与伪本地化、`lang`/`dir`、RTL/双向文本、逻辑属性、字体回退、排序、缺失键和翻译发布工作流。
- 严格考核：题源包含《中文核心讲义》；首考题 1（资料定位）：只允许使用《中文核心讲义》，定位能支撑「本地化、文本方向与可翻译 UI」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：解释内容语言、布局方向与组件样式的关系；首考题 3（最小产出）：把中英文页面扩展到阿拉伯语和复数语言；首考题 4（受限排错）：处理硬编码拼接、镜像错误和截断；首考题 5（学习复述）：说明国际化与翻译的区别。命题边界：不得用 CSS 全局翻转替代语义方向处理。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：无用户可见硬编码；逻辑属性支持 RTL；复数规则正确；伪本地化可发现布局问题。评估边界：机器翻译质量不作为前端工程通过依据。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## I18N-02 Temporal、时区、日历、数字与货币

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#i18n-02)、[MDN Intl](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Intl)、[Temporal 标准文本](https://tc39.es/proposal-temporal/)（英文原文，仅用于版本核验）、[Unicode CLDR](https://cldr.unicode.org/)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：Temporal 的 Instant/PlainDateTime/ZonedDateTime/Duration、IANA 时区、DST 歧义与舍入、日历、Intl 数字/货币/相对时间/排序、CLDR 数据、运行时支持与 polyfill、序列化和服务端契约。
- 严格考核：题源包含《中文核心讲义》；首考题 1（资料定位）：只允许使用《中文核心讲义》，定位 Temporal 类型、时区转换、DST 消歧和 Intl 格式规则；首考题 2（机制解释）：解释瞬间、墙上时间、时区、日历与显示格式为何不能混为一个 `Date`；首考题 3（最小产出）：实现跨时区日程、多币种展示和 Temporal/兼容层适配；首考题 4（受限排错）：处理 DST 缺失/重复时刻、跨日历、Duration 舍入、货币小数位和服务端无时区字符串；首考题 5（学习复述）：说明 Temporal 与 Intl 的职责以及为何不能手写日期格式。命题边界：金额换算与金额格式化必须分开；英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：存储和传输契约明确；Temporal 支持检测与 polyfill 边界清晰；DST 歧义策略和边界测试完整；格式由 locale/CLDR 决定；用户可知道事件所属时区。评估边界：本机时区测试通过不足以验收。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## SEO-01 技术 SEO、抓取索引与内容可发现性

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#seo-01)、[Google 面向 Web 开发者的 SEO 指南](https://developers.google.com/search/docs/fundamentals/get-started-developers?hl=zh-cn)、[Google 抓取和索引编制](https://developers.google.com/search/docs/crawling-indexing?hl=zh-cn)、[Google 结构化数据简介](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data?hl=zh-cn)、[Google 搜索中的 AI 功能与网站](https://developers.google.com/search/docs/appearance/ai-features?hl=zh-cn)。覆盖范围：搜索引擎发现—抓取—渲染—索引—传统/AI 搜索呈现链路、HTTP 状态与重定向、robots.txt、sitemap、canonical、meta robots、标题/摘要、链接语义、重复与分页内容、JavaScript 渲染、结构化数据、图片/视频、性能体验，以及 Search Console、日志和转化的可见性测量。
- 严格考核：首考题 1（资料定位）：只允许使用《中文核心讲义》和三份中文 Google 搜索文档，定位抓取、索引、canonical、robots 和结构化数据的规范依据；首考题 2（机制解释）：解释客户端渲染、服务端渲染、静态生成和流式渲染对抓取与索引的影响，并说明 robots.txt 与 noindex 的职责差异；首考题 3（最小产出）：为一个含列表、详情、多语言和筛选参数的站点设计 URL、状态码、重定向、canonical、sitemap、元信息与 JSON-LD，并产出自动校验；首考题 4（受限排错）：处理软 404、重定向链、重复内容、孤儿页、错误 canonical、被阻止资源、hydration 后正文缺失和结构化数据失效；首考题 5（学习复述）：3 分钟说明技术 SEO 能保证什么、不能保证什么，以及如何用日志和 Search Console 验证。命题边界：不要求预测或承诺搜索排名，不得以黑帽策略作为正确答案。
- 通过标准：关键内容无需用户交互即可被抓取；状态码、canonical、robots、sitemap 与多语言链接一致；结构化数据与页面可见内容相符；无索引膨胀和无限参数空间；有发布前自动检查及发布后抓取、收录、AI 搜索引荐/转化和展现监测；明确不存在可保证进入 AI 回答的“AI 专用 Schema”，不得承诺排名或使用欺骗性策略。评估边界：Lighthouse 分数、一次 URL 检查、无法归因的 AI 引荐或排名变化不能单独证明正确。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## CONTENT-01 内容模型、CMS、Markdown/MDX 与搜索

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/advanced-topics.md#content-01)、[CommonMark Specification](https://spec.commonmark.org/)（英文原文，仅用于版本核验）、[Schema.org Documentation](https://schema.org/docs/documents.html)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：结构化内容模型、富文本 AST、Markdown/MDX 安全渲染、版本、引用、内部全文搜索与发布流程；公共搜索可发现性、抓取索引和结构化数据实现归入 SEO-01。
- 严格考核：题源包含《中文核心讲义》；首考题 1（资料定位）：只允许使用《中文核心讲义》，定位能支撑「内容模型、CMS、Markdown/MDX 与搜索」的定义、关键机制、边界与反例并标明章节；首考题 2（机制解释）：解释内容从编辑、存储、构建到索引的链路；首考题 3（最小产出）：设计可版本化知识文章并安全渲染和搜索；首考题 4（受限排错）：处理 XSS、坏链接、重复 slug 和索引滞后；首考题 5（学习复述）：比较内容模型与页面模型。命题边界：不得直接执行不可信 MDX。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：内容与展示解耦；AST 经过白名单处理；链接和引用可校验；发布、回滚与索引状态可追踪。评估边界：所见即所得编辑器可用不代表内容工程完整。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## EDITOR-01 复杂编辑器、输入法与 AI 创作界面

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#editor-01)、[中文｜`contenteditable`](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Global_attributes/contenteditable)、[中文｜Selection API](https://developer.mozilla.org/zh-CN/docs/Web/API/Selection)、[中文｜`beforeinput`](https://developer.mozilla.org/zh-CN/docs/Web/API/Element/beforeinput_event)、[中文｜Clipboard API](https://developer.mozilla.org/zh-CN/docs/Web/API/Clipboard_API)、[EditContext API](https://developer.mozilla.org/en-US/docs/Web/API/EditContext_API)（英文原文，仅用于版本核验）。英文原文仅用于版本核验，不作为必读或独立首考题源。覆盖范围：文档模型/AST 与 DOM 映射、Selection/Range、`beforeinput`/composition/IME、撤销重做、命令与事务、剪贴板净化、拖放、粘贴/上传、虚拟化、协作光标、无障碍、移动端键盘、浏览器差异；AI 补全/改写/流式插入的锚点、局部 diff、预览接受/拒绝、取消、溯源、敏感信息和失败恢复；框架只作为模型实现，不替代浏览器输入机制。
- 严格考核：首考题 1（资料定位）：只允许使用《中文核心讲义》，定位编辑宿主、选择区、输入事件、IME 合成和剪贴板权限边界；首考题 2（机制解释）：闭卷画出键盘/语音/粘贴/IME 输入经浏览器事件、编辑事务、AST、DOM patch 到撤销栈的链路，并解释为何不能在 composition 中按普通按键处理；首考题 3（最小产出）：实现一个结构化编辑器，支持标题/段落/列表/代码块、跨块选择、IME、粘贴净化、撤销重做、键盘访问、序列化和恢复；再加入可取消的 AI 局部改写，以稳定锚点呈现 diff，逐段接受/拒绝且保留原文与来源；首考题 4（受限排错）：在 Chrome/Firefox/WebKit 和至少一种中文输入法下注入光标跳转、重复字符、撤销断裂、组合态误提交、粘贴 XSS、流式结果覆盖用户新输入、选区过期和大文档卡顿；首考题 5（学习复述）：3 分钟说明编辑器为何是状态机与数据模型问题，而不是 `contenteditable` 加工具栏。命题边界：不得用 `execCommand` 或框架插件“看似可用”替代事件时序、数据一致性和跨浏览器证据。英文原文仅用于版本核验，不作为独立首考题源。
- 通过标准：AST 为可验证的唯一内容真相且 DOM 变更可映射回事务；中文/日文/韩文组合输入不重复、不丢字、不提前提交；撤销重做按用户意图分组；外部 HTML 经过白名单净化；选区跨重渲染和 AI 流式更新保持稳定或明确失效；用户修改与迟到 AI 结果冲突时不静默覆盖；所有 AI 修改可预览、取消、逐项接受/拒绝并可追溯；键盘、读屏、移动端和三浏览器关键路径有证据；一万块文档操作延迟有预算。评估边界：仅支持英文键盘、只测框架内置示例或把整篇文本替换当作 AI 编辑不能通过。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## COMPAT-01 Baseline、渐进增强与跨浏览器真机测试

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[web.dev Baseline](https://web.dev/baseline?hl=zh-cn)、[Playwright Projects](https://playwright.nodejs.cn/docs/test-projects)。覆盖范围：目标用户/流量驱动的浏览器矩阵、特性检测、Baseline 与兼容数据、Polyfill 风险、渐进增强、输入法/触屏/移动真机、Chromium/Firefox/WebKit 自动化、视觉回归、供应商差异和核心任务降级。
- 严格考核：首考题 1（资料定位）：定位 Baseline 和多项目测试方法；首考题 2（机制解释）：说明从目标用户到兼容策略的决策链；首考题 3（最小产出）：建立 Chromium/Firefox/WebKit 与移动视口测试矩阵；首考题 4（受限排错）：处理 WebKit 布局、输入法、触屏和新 API 缺失；首考题 5（学习复述）：区分 UA 检测与能力检测。命题边界：桌面浏览器缩放不能替代真机验证。
- 通过标准：兼容矩阵基于用户和业务；核心功能可降级；自动化覆盖关键路径；至少有一次真机证据。评估边界：只追求像素完全一致不算合理兼容目标。
- 预计耗时：资料 90 分钟；练习 150 分钟；项目 135 分钟；考核 90 分钟；复测 75 分钟

## 领域综合考核

交付一个可公开发现的可视化实验看板：支持多语言和 RTL、跨时区指标、Feature Flag/A-B 分流、埋点校验、复杂图表替代文本，具备可验证的抓取/索引/结构化数据方案，并通过三浏览器和真机关键路径测试。
