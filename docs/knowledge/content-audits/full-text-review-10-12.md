# 第 10—12 域逐份全文复核

复核日期：2026-08-25；`AIAPP-01/02` 于 2026-09-01 再次逐份全文复核并迁移为独立主讲义；`AIAPP-03/04/05`、`AIUI-01`、`AIAPP-06/07/08/09/10/12/13` 于同日逐份复核并迁移为 11 份独立主讲义。新讲义均超过 5000 个紧凑字符，只列可递归展开的直接前置，并只为 4 个关键英文名词提供读音标记。

## 范围与判定方法

- 范围：`10-career-expression.md`、`11-vue-development.md`、`12-ai-native-frontend.md` 的 31 个知识点；当前共 66 条学习链接，其中 28 条为本地中文讲义，38 条为外部中文正文或带中文界面的官方正文。
- 读取规则：本地讲义逐段读完；外部页面读取完整可见正文，并把定义、机制、边界、反例、版本事实与练习逐项对照知识点和掌握挑战。可达性或标题匹配不算覆盖证据。
- 淘汰规则：未能稳定取得全文、正文主要是动态全产品表格、范围明显大于知识点、已进入弃用流程、或只提供重复英文版本事实的页面，不留在初学者学习资料中。需要的稳定原理和术语由精确中文讲义接管；实施时再按锁文件和官方公告核验版本。
- 结果：当前 38 条外部资料均已读完正文；原候选中无法完整读取的页面已全部移除，未以“相关段落看过”冒充全文审阅。

## 当前学习资料逐点结论

表内列出当前实际链接；“全文通过”表示该点的所有列出资料均已读完并与考题闭环核对。

| 知识点 | 当前资料 | 正文覆盖与结论 |
| --- | --- | --- |
| `CAREER-01` | 本地 `CAREER-01` | 全文通过；证据链、贡献归因、指标口径、反证与追问练习刚好覆盖。 |
| `CAREER-02` | 本地 `CAREER-02` | 全文通过；Context/Container/Component、箭头、时序、部署与 ADR 均有中文解释和故障验证。 |
| `CAREER-04` | 本地 `CAREER-04` | 全文通过；定级、角色、恢复、沟通、无责复盘和行动台账形成闭环。 |
| `CAREER-05` | 本地 `CAREER-05` | 全文通过；风险分级、可复现评论、异议修订和关闭证据对齐固定 PR 挑战。 |
| `CAREER-06` | 本地 `CAREER-06` | 全文通过；面试表达、分受众教学、迁移练习与技术影响证据均覆盖。 |
| `VUE-01` | 本地 `VUE-01`；Vue Quick Start；Single-File Components；Vite 为什么选择 Vite | 全文通过；新增中文章补齐 alias（别名）、`import.meta.env`、`VITE_` 公开边界、dev/build/preview/typecheck 和秘密隔离。 |
| `VUE-02` | Reactivity Fundamentals；Computed Properties；Reactivity in Depth | 全文通过；代理、依赖追踪、解包、解构、深浅代理和外部对象均覆盖；考题不扩大到资料外状态库。 |
| `VUE-03` | 本地 `VUE-03`；Template Syntax；Event Handling；Form Input Bindings | 全文通过；新增中文章补齐稳定 key、`v-html` 信任边界、IME（输入法编辑）、空值、键盘和读屏语义。 |
| `VUE-04` | 本地 `VUE-04`；Props；Component Events；Slots；Component v-model；Teleport | 全文通过；类型化组件合同、受控状态、逻辑树/DOM 放置、焦点和反例完整。 |
| `VUE-05` | 本地 `VUE-05`；Lifecycle Hooks；Watchers；Async Components；KeepAlive；Suspense | 全文通过；清理、竞态、activated/deactivated、异步恢复和实验性 Suspense 边界完整。 |
| `VUE-06` | Composables；Provide / Inject | 全文通过；输入输出、清理、注入、测试替身与实例隔离完整；SSR 只考资料明确给出的作用域边界。 |
| `VUE-07` | 本地 `VUE-07`；动态路由匹配；Route Lazy Loading；Navigation Guards | 全文通过；中文讲义承接 v4→v5、文件/类型路由和实验 loader 的版本事实，中文官方页负责稳定路由机制。 |
| `VUE-08` | 本地 `VUE-08`；Pinia 定义 Store；Testing Stores | 全文通过；新增中文章补齐持久化 allowlist、敏感数据、每请求实例、hydration 与跨请求污染；测试页遗漏片段已再次补读。 |
| `VUE-09` | 本地 `VUE-09` | 全文通过；query key、取消、缓存、精确失效、并发乐观更新、回滚、租户隔离和状态分层可独立学习。 |
| `VUE-10` | Vue Testing Guide；Vue Performance；Vite Build | 全文通过；行为测试、异步稳定性、性能测量、拆包、基路径、source map 与生产预览完整；hydration 告警移交 `VUE-11`。 |
| `VUE-11` | 本地 `VUE-11` | 全文通过；SSR/SSG/混合渲染、payload、缓存、hydration、安全升级和实验 streaming 回退独立成章；版本快照更新到 2026-08-25。 |
| `AIAPP-01` | 中文核心 `AIAPP-01`；DeepSeek 对话补全 API | 全文通过；请求/响应、上下文、参数、错误、角色差异和 Provider adapter 完整；明确 `developer` 并非跨供应商通用角色。 |
| `AIAPP-02` | 中文核心 `AIAPP-02`；Chrome 流式 LLM 响应指南 | 全文通过；SSE、UTF-8 增量解码、序号、终态、断线、取消、滚动和安全插入对齐事件回放挑战。 |
| `AIAPP-03` | 本地 `AIAPP-03`；DeepSeek JSON Output | 全文通过；候选→解析→Schema→业务/权限→展示、有限修复与副作用阻断完整。 |
| `AIAPP-04` | 中文核心 `AIAPP-04`；DeepSeek Tool Calls | 全文通过；工具提议、参数、确认、授权、幂等、未知结果与 tool 消息回传完整。 |
| `AIAPP-05` | 本地 `AIAPP-05` | 全文通过；版本化块、受信注册表、宿主、恢复和无 UI 降级完整，不执行模型 HTML/脚本。 |
| `AIUI-01` | 本地 `AIUI-01` | 全文通过；补入 AG-UI 标准事件、A2UI v0.9 catalog/Web Core/Agent SDK 与 MCP Apps 宿主能力的当前快照，并保留版本核验边界。 |
| `AIAPP-06` | 本地 `AIAPP-06` | 全文通过；切分、Embedding（向量嵌入）、权限过滤、检索/重排、引用绑定、冲突与无答案完整，避免绑定单一厂商向量库。 |
| `AIAPP-07` | 本地 `AIAPP-07` | 全文通过；直接/间接 Prompt Injection、最小权限、确认、输出编码、日志与 12 类攻击回归完整。 |
| `AIAPP-08` | 本地 `AIAPP-08` | 全文通过；分层 gold set、确定性/人工/模型评分、裁判校准、trace、灰度和发布闸门完整，不依赖已弃用平台。 |
| `AIAPP-09` | 中文核心 `AIAPP-09`；DeepSeek Token 用量；DeepSeek Rate Limit；DeepSeek 上下文缓存；HTTP Retry-After | 全文通过；账本、预算、配额、缓存、429/5xx/未知结果、重试预算、熔断和降级完整；具体限额只作会变化的示例。 |
| `AIAPP-10` | 中文核心 `AIAPP-10`；Chrome Built-in AI Do and Don't | 全文通过；能力预期、状态透明、渐进增强、取消/编辑/恢复和可访问呈现完整；页面中的建议时延不是通用硬规则。 |
| `AIAPP-11` | 本地 `AIAPP-11` | 全文通过；权限、VAD、WebRTC/WebSocket、barge-in、字幕、短期凭证、弱网恢复与分段延迟完整。 |
| `AIMEDIA-01` | 本地 `AIMEDIA-01` | 全文通过；异步制品、版本/进度、审核、来源、对象 URL、无障碍、发布与删除完整。 |
| `AIAPP-12` | 本地 `AIAPP-12` | 全文通过；UIMessage/模型消息、幂等追加、上下文预算、摘要漂移、租户隔离、留存和删除完整。 |
| `AIAPP-13` | 本地 `AIAPP-13` | 全文通过；记忆类型、写入门控、来源/置信/时效、投毒、纠正、删除传播和关闭能力完整。 |

## 退出学习清单的 18 个外部候选

| 原候选 | 实际读取情况 | 退出原因与接管资料 |
| --- | --- | --- |
| Vue Router v4→v5 Migration | 正文读完 | 英文版本事实已准确写入本地 `VUE-07`；初学者无需重复读英文，实施时再核验当前迁移页。 |
| File-based Routing | 正文读完 | 英文插件配置会随版本变化；稳定原理和迁移边界由本地 `VUE-07` 接管。 |
| Typed Routes | 正文读完 | 英文实现细节与前两页重复；编译期类型不能替代运行时校验已写入本地讲义。 |
| TanStack Query Queries | 两次完整抓取均超时，未取得全文 | 不能作为可靠学习资料；`VUE-09` 中文讲义已独立覆盖读取生命周期、key、缓存与取消。 |
| TanStack Query Mutations | 两次完整抓取均超时，未取得全文 | 不能作为可靠学习资料；`VUE-09` 中文讲义已独立覆盖 mutation、乐观更新、并发和回滚。 |
| Nuxt Data Fetching | 正文读完 | 英文且版本性强；必要机制与当前行为由本地 `VUE-11` 接管。 |
| Nuxt Rendering Modes | 正文读完 | 英文版本核验内容已融入中文讲义，避免重复阅读。 |
| Nuxt 4.5 | 正文读完 | 用于核对 Vite 8、实验 streaming、稳定错误码和 Nuxt 3 EOL；事实已注明日期写入 `VUE-11`，不作为背诵材料。 |
| Nuxt 4.5 Security Fixes | 正文读完 | 安全公告用于升级核验而非基础学习；修复组合、依赖树和锁文件检查已写入 `VUE-11`。 |
| Gemini GenerateContent API | 页面超过五千行；读取元数据与当前入口说明后停止，未声称全文已读 | 范围远超本点且页面已推荐新的 Interactions API；移除后由供应商无关中文讲义与 DeepSeek 中文 API 组成完整首学路径。 |
| AG-UI Architecture | 正文读完 | 当前事实已写入 `AIUI-01`，英文页仅在真实集成时核验协议版本。 |
| A2UI v0.9 | 官方页面正文无法被稳定完整提取；仅核对官方可见版本说明，未声称全文已读 | 不能留作必读；catalog、Web Core、Agent SDK、传输与宿主白名单边界由本地 `AIUI-01` 接管。 |
| OpenAI Retrieval | 正文读完 | 近三千行且绑定单一厂商向量库，超出 RAG 通用知识点；本地 `AIAPP-06` 更精确并含权限/引用实验。 |
| OWASP LLM Prompt Injection | 正文读完 | 作为英文风险核验有价值，但初学路径已由中文 `AIAPP-07` 精确覆盖。 |
| MCP Security Best Practices | 正文读完 | 约七百行、范围大于本点；用户同意、工具授权和输入验证已融入 `AIAPP-07`。 |
| OWASP Improper Output Handling | 正文读完 | 输出编码边界已融入 `AIAPP-07`，避免三份英文材料重复。 |
| OpenAI Evaluation Best Practices / 旧 Evals 平台 | 正文读完 | 页面明确旧 Evals 平台将于 2026-10-31 只读、2026-11-30 关闭并建议迁移到 Datasets；已弃用流程中的平台页面不能作为长期学习资料，通用评估方法由 `AIAPP-08` 接管。 |
| 阿里云百炼限流 | 动态页面只稳定提取到极少正文；核对了官方可见的 RPM/TPM、突发速率、429 与累计消费差异，未声称全文已读 | 全模型动态表范围过宽且易变；移出必读，通用限流与冻结配置方法由中文核心讲义、DeepSeek 中文页和 HTTP `Retry-After` 共同覆盖。 |

## 超纲术语与版本事实处理

- 所有新增重要术语保留中英文：SFC（Single-File Component，单文件组件）、HMR（Hot Module Replacement，热模块替换）、alias（别名）、IME（Input Method Editor，输入法编辑）、SSR（Server-Side Rendering，服务端渲染）、hydration（水合接管）、Provider（模型供应商）、Embedding（向量嵌入）、Prompt Injection（提示注入）、catalog（组件目录）。首次出现均给出用途和边界，不只翻译名词。
- Vue Router v5、Nuxt 4.5.2/4.5.1、AG-UI 事件数量、A2UI v0.9、供应商模型/限额属于时间敏感事实：讲义标注核验日期，考核只要求理解稳定机制和重新核验方法，不要求背诵数字。
- Vite 当前构建文档已经使用 Rolldown 相关配置语义；本点考产物、拆包、基路径和验证方法，不把旧 `Rollup` 字段名写成长期不变量。

## 最终门禁

- 31 个知识点均有资料定位、机制解释、固定夹具、受限排错、掌握挑战、复测变式和可复核通过标准。
- 当前学习资料不包含无法完整读取的页面；英文版本核验页不再混入初学者必读列表。
- 内容检查只能验证结构、锚点和链接，不能替代本文件记录的全文语义判断；后续修改任一学习资料或考题时，必须重新做正文—考题逐项核对。
