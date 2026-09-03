# 08 组件系统与多运行时交付

所有“通过”均需满足[统一考核规则](00-assessment-rules.md)。平台化考核重点是复用收益与边界，不以“抽象得多”作为高分标准。所有现行中文资料均列于“学习资料”，并由首考题 1 逐项精确引用。

### 组件与设计系统

## COMP-01 组件职责、API 与组合设计

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[07–09 内容审计中文讲义：组件契约与无障碍](../chinese-guides/comp-01-component-responsibility-api-composition.md#comp-01)、[React Thinking in React](https://zh-hans.react.dev/learn/thinking-in-react)、[React 组件属性](https://zh-hans.react.dev/learn/passing-props-to-a-component)。覆盖范围：主讲义负责跨框架职责、数据/事件/插槽 API、组合、语义变体、默认值、无障碍、样式边界、逃生口、测试和演进；React 中文页用于观察具体运行时映射，受控/非受控所有权归 `COMP-02`。
- 严格考核：挑战类型：DESIGN_CASE；首考题 1（资料定位）：只允许使用《07–09 内容审计中文讲义：组件契约与无障碍》《React Thinking in React》《React 组件属性》，逐项定位职责、props/事件、组合和键盘语义的定义、机制、边界及反例，并写出“规则→fixture 决策”的闭环；首考题 2（机制解释）：解释 `SearchPanel` 从筛选输入到 `onQueryChange`、组合插槽到列表焦点移动的机制链：职责收敛→显式数据/事件 API→组合扩展→语义键盘交互；反例是以 `isCompact/isAdmin/isReadonly` 三个布尔项替代具名组合，说明其为何产生非法组合；首考题 3（最小产出）：固定 fixture 为“管理员可筛选并导出、访客只能筛选、空结果可重试”，给定 `SearchPanel`、`FilterSlot`、`onQueryChange` 与键盘 Tab/Enter 顺序；交付 API 表、三张状态/焦点图、类型化调用样例和拒绝非法 `isAdmin+isReadonly` 的设计记录，执行 `pnpm content:check` 并逐场景走查；预期三场景均可完成、导出只由组合扩展提供、焦点不丢失，保存走查记录；首考题 4（受限排错）：给定日志“访客传入 `isAdmin=true` 后出现导出按钮；`Tab` 后焦点回到 body；`onChange` 收到内部 DOM 节点”；只在“布尔 API、焦点责任、事件载荷”三项候选中排查，每项写出证伪观察，给出最小 API/语义修复，并用同一三场景 fixture 回归；首考题 5（学习复述）：用 3 分钟依据 fixture 说明职责、组合与无障碍链，并回答“何时应拆成两个组件而不是继续增加 props”。复测变式：仅把访客的“可筛选”改为“只读查看”，保持 API 职责、组合出口和键盘语义不变，提交更新状态图、预期无编辑事件及新的走查证据。命题边界：受控/非受控状态与命令式句柄只在 COMP-02 考核；本地 API 是待评审样例而非规范来源。
- 通过标准：API 表、状态/焦点图、三场景走查记录和 `content:check` 输出可复核，且能证明扩展由组合而非布尔爆炸完成。否决项：以隐藏 DOM、全局状态或无语义点击区替代契约，或没有同 fixture 的焦点回归证据。评估边界：只评估组件职责、API、组合和无障碍交互，不评估 COMP-02 的状态所有权。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## COMP-02 受控/非受控、状态同步与命令式能力

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[07–09 内容审计中文讲义：COMP-02](../chinese-guides/comp-02-controlled-uncontrolled-state-imperative.md#comp-02)、[Sharing State](https://zh-hans.react.dev/learn/sharing-state-between-components)、[`useImperativeHandle`](https://zh-hans.react.dev/reference/react/useImperativeHandle)。覆盖范围：主讲义跨框架解释唯一所有者、受控/非受控、默认值、模式切换、事件回声、重置、异步版本、表单、URL/持久化和最小命令句柄；React 中文页只用于具体状态提升与句柄 API 查证，Vue `v-model` 是另一实现映射。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《07–09 内容审计中文讲义：COMP-02》《Sharing State》《`useImperativeHandle`》，逐项定位单一所有者、状态提升、模式切换和最小句柄的规则，并写出资料规则到状态机的闭环；首考题 2（机制解释）：解释 `TagEditor` 的 `defaultTags → 内部状态`、受控 `value → onChange → 父状态`、外部 reset 和 `focus()` 句柄链，反例是同时写入内部与外部数组导致回滚；首考题 3（最小产出）：固定 fixture 为非受控初值 `['a']`、受控值 `['b']`、第 2 步外部 reset 为 `[]`、异步保存 50ms 后成功，交付 `TagEditor`、状态迁移表、只含 `focus()` 的句柄和包含四个断言的 `apps/web/src/components/TagEditor.fixture.test.ts`；执行 `pnpm --dir apps/web test src/components/TagEditor.fixture.test.ts`。预期非受控可编辑、受控只经 `onChange` 更新、reset 后为空、保存不覆盖新值，保存该 fixture 的测试输出；首考题 4（受限排错）：给定日志“reset 后标签又变回 a；保存完成后覆盖了用户新输入；ref.current 暴露 `input`”；只在“双写、异步旧快照、句柄泄漏”三个候选中排查，逐项提交证伪观察、最小修复与同一四断言回归；首考题 5（学习复述）：用 3 分钟以该迁移表说明何时受控、何时非受控及为何句柄只暴露能力。复测变式：仅把异步保存结果从成功改为失败，保持单一所有者、reset 语义和最小句柄不变，提交错误状态、预期不回滚新输入及新测试证据。命题边界：只在列出的资料和 fixture 内命题，不评估其它表单库。
- 通过标准：状态迁移表、四断言、命令输出和最小句柄审阅记录可复核；没有双数据源、模式切换明确拒绝或警告。否决项：通过读取 DOM 绕过状态，暴露内部节点，或未用同 fixture 验证异步竞态。评估边界：只评估组件状态所有权、同步和命令式能力，不评估一般表单样式。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## DS-01 Design Token、主题与一致性

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[07–09 内容审计中文讲义：Token 分层与主题发布](../chinese-guides/content-audit-07-09.md#ds-01)、[Ant Design 主题配置与 Design Token](https://ant.design/docs/react/customize-theme-cn/?locale=zh-CN)。覆盖范围：原始/语义/组件 Token 的分层、别名、主题生成、颜色对比、构建输出、版本和治理；本地讲义承担跨技术栈分层、发布、失败边界与验收。Ant Design 页面只必读“主题配置”“Seed/Map/Alias Token”“算法”正文，用于观察一个真实组件库的映射；其数百项 Token 字典是按需查询表，不是学习或命题范围。负责 Token 全生命周期，不重复一般 CSS 架构；W3C 英文社区草案已从必读资源移除。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《07–09 内容审计中文讲义：Token 分层与主题发布》《Ant Design 主题配置与 Design Token》，逐项定位原始/语义/组件 token、主题派生和发布边界，写出规则→token 文件的闭环；首考题 2（机制解释）：解释 `blue-600 → color.action.primary → Button.primary.bg` 在亮/暗主题中的别名解析链；反例是组件直接引用 `#1677ff`，说明新增品牌时为何无法集中替换；首考题 3（最小产出）：固定 fixture 为 Button 与 Alert 的硬编码颜色 `#1677ff/#fff`、间距 `8px`、圆角 `4px`，以及亮/暗两份主题；交付三层 token JSON、两个组件映射表、构建后的 CSS 变量快照和对比检查，执行 `pnpm content:check`；预期组件 CSS 中直接输出的 `#1677ff/#fff/8px/4px` 计数均为0、亮暗两主题所有普通文字/背景组合对比度均≥4.5:1、同一语义 token 驱动两组件，保存逐组合比对值和检查记录；首考题 4（受限排错）：给定构建日志“`color.action.primary` 未解析；暗色 Alert 文本/背景对比度为3.2:1（低于4.5:1）；Button 仍输出 #1677ff”；只在“别名环、主题遗漏、组件硬编码”三项候选中排查，逐项记录别名解析、主题对比度计算和 CSS 字符串扫描的证伪观察，最小修复后以同一快照和4.5:1阈值回归；首考题 5（学习复述）：用 3 分钟说明分层如何让主题与组件一致，并回答何时不应新增语义 token。复测变式：仅把品牌原始色从 blue 改为 violet，保持语义 token 名称、组件映射和亮暗结构不变，提交差异快照、逐组合对比值、预期只改原始层及新检查证据。命题边界：只评估 token 分层、主题和一致性，不评估完整视觉设计。
- 通过标准：三层 token、映射表、CSS 快照、每个普通文字/背景组合≥4.5:1的可读性检查和命令输出可复核；组件直接硬编码计数为0，新品牌不需逐组件改值。否决项：把原始色当语义 token、任一普通文字/背景组合低于4.5:1，或仅截图而未给出未解析/硬编码回归证据均不通过。评估边界：只评估 token 发布链，不评估字体版权或设计审美。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

### 组件平台与配置化交付

## COMP-03 文档、示例、测试与版本治理

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[07–09 内容审计中文讲义：文档与版本发布](../chinese-guides/content-audit-07-09.md#comp-03)。覆盖范围：组件文档、可运行示例、交互/视觉/可访问测试、变更日志、SemVer、弃用和迁移；07–09 讲义已覆盖发布证据、反例和迁移验收，重复的进阶讲义已移出；覆盖文档漂移、多框架消费证据、破坏性变更检测和版本回退；Storybook、SemVer 和 Keep a Changelog 英文页已从必读资源移除。
- 严格考核：挑战类型：TOOL_OPERATION；首考题 1（资料定位）：只允许使用《07–09 内容审计中文讲义：文档与版本发布》，定位文档—示例—测试—版本—迁移的发布闭环及文档漂移反例；首考题 2（机制解释）：解释 `Modal` 的 API 改名如何从可运行示例和断言传播到变更级别、changelog、弃用期和迁移指南；反例是只改 README 而旧示例仍调用旧 API；首考题 3（最小产出）：固定 fixture 为 `Modal.visible/onClose` 升级为 `open/onOpenChange`，含一个键盘 Esc 示例和旧消费者；交付 API 前后表、可运行示例、交互/可访问断言、`BREAKING` changelog 与迁移指南，执行 `pnpm content:check`；预期新示例 Esc 关闭、旧消费者得到明确迁移失败提示，保存命令输出与示例记录；首考题 4（受限排错）：给定发布日志“示例仍传 visible；Esc 断言失败；changelog 标为 minor”；只在“示例漂移、键盘测试遗漏、变更分级错误”三个候选中排查，列每项证伪观察，完成最小文档/测试/版本修复并用同一 fixture 回归；首考题 5（学习复述）：用 3 分钟说明为何文档、示例与版本必须同一次发布，并回答何时可弃用而非 breaking。复测变式：仅将一个旧消费者改为使用受控 `open`，保持 API 语义、Esc 行为和迁移规则不变，提交更新示例、预期断言及新发布记录。命题边界：只评估组件文档、测试和版本治理，不要求真实发布到包仓库。
- 通过标准：API 前后表、可运行示例、断言、changelog、迁移指南和命令输出可复核，且变更级别与消费者影响一致。否决项：只更新文档不运行示例，或将破坏性改动标成 minor。评估边界：只评估发布证据链，不评估包管理器实现细节。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## PLATFORM-01 Schema 与配置化页面

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[07–09 内容审计中文讲义：Schema 渲染闭环](../chinese-guides/content-audit-07-09.md#platform-01)。覆盖范围：Schema 页面模型、组件注册、表达式/联动、校验、版本迁移、沙箱和渲染错误；07–09 讲义已覆盖定义、机制、边界和验收，重复的核心讲义已移出；表单/表格配置和权限模型必须由题目显式给出。Ant Design Form 的正文是特定 UI 库表单 API，不能承担通用 Schema 页面机制，已移出必读；JSON Schema、JSON Forms 与 Ajv 的英文页也已移除。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《07–09 内容审计中文讲义：Schema 渲染闭环》，定位 schema 版本、注册表、校验、渲染失败与安全逃生的闭环；首考题 2（机制解释）：解释 `v1 field:name → 迁移为 v2 field:keyword → 注册组件 → 校验 → 渲染` 的链，反例是把权限判断塞入任意 JSON 表达式；首考题 3（最小产出）：固定 fixture 为 v1 查询表单 `{field:'name',type:'text'}`、v2 `{field:'keyword',type:'text',required:true}`、表格列和 `export` 动作，另给未知组件 `ChartX`；交付版本化 schema、迁移函数、组件注册表、校验/错误视图和自定义扩展边界，执行 `pnpm content:check` 并运行三份 schema；预期 v1 迁到 v2、合法页渲染、未知组件可见拒绝而非执行，保存验证输出记录；首考题 4（受限排错）：给定日志“`Unknown component ChartX`；v1 的 name 丢失；`export` 在缺字段时仍执行”；只在“注册缺失、迁移映射、动作校验”三项候选中排查，每项给证伪观察，做最小修复并以同一三份 schema 回归；首考题 5（学习复述）：用 3 分钟说明配置何时足够、何时需要受控扩展，并回答为何不能把业务逻辑无限塞进表达式。复测变式：仅将 `keyword.required` 从 true 改为 false，保持版本迁移、注册和未知组件拒绝不变，提交新校验结果、预期 export 行为及新证据。命题边界：只评估 schema 渲染闭环，不评估特定表单库或权限系统。
- 通过标准：三份 schema 的迁移/渲染/拒绝输出、校验记录和命令输出可复核；复杂逻辑经受控扩展而非任意表达式。否决项：未知组件静默跳过，或迁移后不以同 fixture 验证动作校验。评估边界：只评估页面 schema、校验和迁移，不评估领域查询语义。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

### 应用平台与多团队集成

## PLATFORM-02 微前端拆分、隔离、通信与部署

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[07–09 内容审计中文讲义：隔离与发布边界](../chinese-guides/content-audit-07-09.md#platform-02)、[中文｜qiankun 生命周期与接入](https://qiankun.umijs.org/zh/guide/getting-started/)、[中文｜qiankun 核心 API](https://qiankun.umijs.org/zh/api/)。覆盖范围：微前端拆分依据、路由/样式/运行时隔离、通信、共享依赖、独立部署和故障域；本地讲义承担拆分决策、组织/故障成本、退出与验收。快速上手必读注册、生命周期和卸载；API 页只必读 `registerMicroApps`、`start` 的沙箱配置、手动加载与卸载，预取和全局状态表仅按需查阅。覆盖版本冲突、性能成本、组织耦合、降级、回滚与退出方案；Module Federation 英文概念页和 qiankun 总览页已从必读资源移除。
- 严格考核：挑战类型：DESIGN_CASE；首考题 1（资料定位）：只允许使用《07–09 内容审计中文讲义：隔离与发布边界》《中文｜qiankun 生命周期与接入》《中文｜qiankun 核心 API》，逐项定位生命周期、路由/样式隔离、通信和独立发布规则，形成资料到部署图闭环；首考题 2（机制解释）：解释主应用挂载 `orders`/`reports` 两子应用时的路由→生命周期→隔离→消息→故障降级链；反例是因两个团队而拆分却共享同一全局状态和发布窗口；首考题 3（最小产出）：固定 fixture 为 2 个团队、订单每周发布、报表每月发布、`/orders` 和 `/reports`、共享 `userId` 消息以及 reports 启动失败；交付采用/不采用决策表、路由与样式隔离图、通信契约、依赖版本策略、部署/回滚步骤和失败降级演练，执行 `pnpm content:check`；预期 orders 可用、reports 显示降级、无样式污染，保存演练验证记录；首考题 4（受限排错）：给定日志“reports mount 超时；orders 按钮变成 reports 红色；`userId` 收到旧值”；只在“生命周期超时、样式隔离、消息版本”三个候选中排查，列各自证伪观察，最小修复后以同一两路由 fixture 回归；首考题 5（学习复述）：用 3 分钟说明收益何时大于复杂度，并回答何时应保留单体模块。复测变式：仅把 reports 发布频率由每月改为每日，保持两路由、通信契约和隔离方式不变，提交更新决策表、预期发布收益变化及新演练证据。命题边界：只评估拆分、隔离、通信和部署决策，不引入未列题源的微前端框架。
- 通过标准：决策表、隔离图、通信契约、降级演练日志和命令输出可复核，且明确不采用条件。否决项：用组织名称代替发布收益，或故障/样式/消息任一项没有同 fixture 回归。评估边界：只评估该固定多团队场景，不评估完整企业权限体系。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## PLATFORM-03 物料平台、采用率与治理

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[07–09 内容审计中文讲义：物料治理与采用率](../chinese-guides/content-audit-07-09.md#platform-03)、题目提供的公共组件使用数据、Issue 和重复代码样本。覆盖范围：物料注册、发现、质量门禁、采用率、版本生命周期和治理责任；07–09 讲义已覆盖口径、退出和验收，重复的进阶讲义已移出；覆盖重复物料、废弃、平台绕行、退出指标、反馈闭环与以产出数量冒充价值；Google Engineering Practices 与 Storybook 英文页已从必读资源移除。
- 严格考核：挑战类型：DESIGN_CASE；首考题 1（资料定位）：只允许使用《07–09 内容审计中文讲义：物料治理与采用率》，定位物料准入、采用率口径、维护/废弃和退出治理规则，写出规则到指标表的闭环；首考题 2（机制解释）：解释重复 `StatusBadge` 如何从登记、质量门禁、owner/SLA 到采用率和废弃决策形成治理链；反例是只以发布物料数量宣布平台成功；首考题 3（最小产出）：固定 fixture 为 6 个应用、4 个各自实现的 StatusBadge、90 天内采用数 `1→3`、2 个 Issue 和一次破坏性升级；交付准入评分表、物料目录条目、owner/SLA、采用率/重复减少/缺陷/升级成本指标表、推广与废弃计划，执行 `pnpm content:check`；预期可判定是否沉淀、指标可按 90 天复算、升级有回滚，保存数据计算记录；首考题 4（受限排错）：给定数据日志“目录显示采用率 80% 但仅 3/6 应用；已废弃版本仍被 2 个应用引用；P1 Issue 超 SLA”；只在“分母口径、废弃通知、owner 响应”三个候选中排查，逐项写证伪观察，提出最小治理修复并以同一数据表回归；首考题 5（学习复述）：用 3 分钟说明为何采用率不能单独代表价值，并回答何时应下架而非继续推广。复测变式：仅把第 4 个应用接入改为拒绝接入，保持分母、SLA 与废弃规则不变，提交更新指标、预期采用率及新计算证据。命题边界：题目提供的数据是唯一证据源，不要求调用真实平台或团队数据。
- 通过标准：准入表、指标复算、目录/责任/退出方案、Issue 与命令输出可复核；至少同时判断采用、重复、缺陷和升级成本。否决项：篡改采用率分母，或无 owner/SLA/回滚仍宣布物料通过。评估边界：只评估固定物料治理案例，不评估组织绩效考核。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

### 嵌入式与跨运行时交付

## EMBED-01 嵌入式前端 SDK、第三方宿主与多租户隔离

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[07–09 内容审计中文讲义：交付形态与消息协议](../chinese-guides/content-audit-07-09.md#embed-01)、[中文｜`iframe` 的 `sandbox`、`allow` 与跨源边界](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Reference/Elements/iframe)、[中文｜`postMessage` 的来源与目标来源](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/postMessage)。覆盖分工：本地讲义=四种交付形态决策、宿主协议、租户隔离与故障验收；MDN 两页只必读标题/可访问名称、`sandbox`、`allow`、跨源限制，以及 `targetOrigin`、`source`/`origin` 校验和消息事件，其他 iframe 属性与兼容附录按需查阅。覆盖范围：npm/ESM SDK、Web Component、脚本注入和 iframe 四种交付形态；公共 API、初始化/销毁、样式与 DOM 隔离、事件协议、版本兼容、CSP/SRI/CORS、`sandbox`/Permissions Policy、`postMessage` 来源与 Schema 校验、认证令牌、租户配置、资源预算、遥测、故障隔离、灰度、回滚和宿主兼容矩阵。Web Components 与 CSP 的 MDN 页不能独立覆盖交付决策与租户协议，已由本地讲义承接。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《07–09 内容审计中文讲义：交付形态与消息协议》《中文｜`iframe` 的 `sandbox`、`allow` 与跨源边界》《中文｜`postMessage` 的来源与目标来源》，逐项定位交付形态、sandbox 和来源消息校验的规则，写出资料到通信契约的闭环；首考题 2（机制解释）：比较 iframe 与脚本注入的信任/隔离/升级链，并解释 `host origin → nonce → Schema → tenantId` 校验为何必须在接收端闭合；反例是 `postMessage('*')` 配合长期 token；首考题 3（最小产出）：固定 fixture 为 `portal.example.cn` 与 `shop.example.cn` 两宿主、同页两实例、租户 A/B、`INIT@v1` 与 `READY@v1` 消息及 iframe 加载失败；交付版本化初始化/事件 schema、幂等 mount/destroy、精确 origin/nonce/schema 校验、最小 sandbox、租户缓存键和降级页，执行 `pnpm content:check`；预期两实例不串主题/租户、destroy 后无监听器、失败显示降级，保存消息与 DOM 清理记录；首考题 4（受限排错）：给定日志“收到 `evil.example` 的 READY；第二实例显示租户 A 主题；destroy 后仍收到 2 次事件”；只在“origin 校验、缓存键、监听器清理”三个候选中排查，提交每项证伪观察、最小修复和同一双宿主 fixture 回归；首考题 5（学习复述）：用 3 分钟给出四种交付形态选择与退出依据，并回答何时不应嵌入第三方宿主。复测变式：仅把 shop 宿主 CSP 改为拒绝 iframe，保持消息校验、多实例隔离与租户键不变，提交降级页、预期不发送 READY 及新记录。命题边界：不得假定能改宿主构建配置，也不得使用 `postMessage('*')`、长期令牌或关闭 sandbox。
- 通过标准：通信 schema、两宿主日志、清理记录、降级截图/日志和命令输出可复核；精确 origin、租户隔离、最小权限都被同 fixture 验证。否决项：把密钥打包进前端、使用通配 origin，或无 destroy 回归证据。评估边界：只评估嵌入交付与消息协议，不评估模型回答质量。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## RUNTIME-01 浏览器扩展、小程序与受限 Web 容器

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[07–09 内容审计中文讲义：RUNTIME-01](../chinese-guides/content-audit-07-09.md#runtime-01)、[中文｜Chrome Manifest V3](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3?hl=zh-cn)。覆盖分工：本地讲义完整承担普通网页、MV3、小程序、IDE 面板与受限 WebView 的能力授予、执行上下文、可回收生命周期、消息 Schema、Bridge、存储/网络/更新、合同实验和标准 Web 降级；Chrome 页面只查证 MV3 的 service worker、权限与远程代码限制。旧 MDN 内容脚本页混入 Firefox/MV2、Xray 和旧式兼容细节，Chrome 两篇消息/内容脚本总页又包含大量注入模式、匹配表和处于灰度发布中的版本语义，均不适合作为本点必读；具体扩展实现时按题目 Chrome 版本查阅具体 API。覆盖范围：普通网页、Manifest V3 扩展、小程序、企业托管浏览器、IDE 面板和受限 WebView 的平台能力、权限、生命周期、执行上下文隔离、后台任务、消息、存储、CSP、网络白名单、企业策略、商店分发、版本兼容和标准 Web 降级。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《07–09 内容审计中文讲义：RUNTIME-01》《中文｜Chrome Manifest V3》，逐项定位权限授予、上下文隔离、后台回收和 Bridge 消息规则，写出资料到适配器契约的闭环；首考题 2（机制解释）：解释业务层经 `HostAdapter` 到网页/MV3/小程序/受限 WebView 的能力检测→会话消息→持久状态→标准 Web 或宿主内帮助降级链；反例是业务层直接读 `chrome.*`、把小程序 API 泄漏给网页，或假定后台常驻；首考题 3（最小产出）：固定 fixture 为“读取上下文、保存深色主题、打开帮助页”，网页无宿主能力、MV3 service worker 被回收、小程序只提供 `getContext` 与宿主内帮助页、WebView 禁用外链；交付四套适配、能力矩阵、`REQUEST@v1` schema、主题迁移表和降级 UI，执行 `pnpm content:check`；预期网页拒绝上下文但可本地主题、MV3 回收后不重复注册、小程序能读取上下文且帮助页不逃逸到外链、WebView 显示帮助页替代，保存四端运行记录；首考题 4（受限排错）：给定日志“worker 重启后重复注册；Bridge sender 不匹配；v2 主题被当 v1 读取；小程序打开帮助页后尝试外链且白屏”；只在“生命周期注册、发送者校验、版本迁移、小程序能力/帮助映射”四个候选中排查，逐项给证伪观察、最小修复与同一四宿主 fixture 回归；首考题 5（学习复述）：用 3 分钟说明何时受限宿主收益覆盖兼容成本，并回答能力撤回如何回到标准 Web。复测变式：仅把 MV3 的 `storage` 权限撤回，保持业务层隔离、会话校验、小程序能力映射和网页/WebView 降级不变，提交权限拒绝、预期主题内存回退及四端新记录。命题边界：不要求穷举厂商 API；合同测试器不能冒充真机兼容结论。
- 通过标准：能力矩阵、四套运行记录、消息/迁移日志、回收与降级证据和命令输出可复核；业务层不直接依赖网页、MV3 或小程序的宿主全局对象。否决项：请求全站权限、依赖后台永驻、把小程序外链失败写成成功，或把合同模拟写成厂商兼容结论。评估边界：只评估能力授予、生命周期、Bridge 与降级，不评估具体厂商 UI。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## RUNTIME-02 Electron/Tauri 桌面前端、安全桥接与分发

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[07–09 内容审计中文讲义：RUNTIME-02](../chinese-guides/content-audit-07-09.md#runtime-02)、[中文｜Electron 安全清单](https://www.electronjs.org/zh/docs/latest/tutorial/security)、[中文｜Electron 进程模型](https://www.electronjs.org/zh/docs/latest/tutorial/process-model)、[中文｜Tauri 安全模型](https://v2.tauri.app/zh-cn/security/)。覆盖分工：本地讲义完整承担能力授予链、Tauri capability/command、攻击注入、签名更新与回滚证据；Electron 安全页必读清单、Node 集成、上下文隔离、沙箱、导航/外链与 IPC 发送者校验，fuses 等部署加固按需查阅；进程模型查证 main/renderer/preload；Tauri 页面查证信任边界。Tauri Capability 链接虽为 `zh-cn`，正文仍是英文，已移出必读。覆盖范围：Electron main/renderer/preload、contextIsolation、IPC、导航与外链、Tauri command/capability、文件/剪贴板/通知/深链、Secret、代码签名、公证、自动更新、崩溃报告、供应链、企业分发和回滚。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《07–09 内容审计中文讲义：RUNTIME-02》《中文｜Electron 安全清单》《中文｜Electron 进程模型》《中文｜Tauri 安全模型》，逐项定位进程隔离、preload/IPC、capability、导航与更新边界，写出资料到桥接白名单的闭环；首考题 2（机制解释）：比较 renderer→preload→main IPC 与 WebView→Tauri command 的能力授予链；反例是 renderer 直接 require 文件系统、Electron 通用 `invoke(channel,payload)` 或 Tauri 给 `shell` 宽泛 capability；首考题 3（最小产出）：固定 fixture 为 Electron renderer 和 Tauri WebView 各一份、应用根 `C:\app-data`、允许 `chooseFile`/`notify`、拒绝 `..\\secret.txt`、外链 `https://help.example.cn` 与一份签名错误更新包；交付 Electron 类型化 preload/IPC 白名单与 Tauri command/capability 白名单、两端路径检查/导航策略/更新校验回滚方案和八项断言，执行 `pnpm content:check`；预期 Electron renderer 无 Node 且 `ipcRenderer.invoke('shell')` 被拒绝，Tauri 宽泛 `shell` command/capability 被拒绝；两端越界路径拒绝、外链受控打开、错误更新不安装，保存两端 IPC/command/断言日志；首考题 4（受限排错）：给定日志“Electron 的 `ipcRenderer.invoke('shell')` 成功；Tauri 的 `shell` command/capability 成功；两端 `C:\\app-data\\..\\secret.txt` 被读取；两端更新签名校验失败后仍替换版本”。只在“Electron 通用 IPC、Tauri capability 白名单、两端路径规范化、两端更新提交时机”四个候选中排查，分别以 Electron IPC 拒绝日志、Tauri capability 拒绝日志、两端规范化路径日志、两端更新暂存/提交日志证伪；最小修复后以同一双运行时 fixture 回归；首考题 5（学习复述）：用 3 分钟说明何时桌面收益大于权限和分发成本，并回答为何安全桥接不是 API 转发。复测变式：仅把允许打开的帮助页改为 `https://docs.example.cn`，保持两端隔离、路径根和更新签名策略不变，提交 Electron/Tauri 导航白名单差异、预期均拒绝旧域及新日志。命题边界：不得关闭隔离、开启广泛 Node 集成或加载可执行远程代码。
- 通过标准：Electron preload/IPC 与 Tauri command/capability 白名单、八断言、两端路径/桥接/更新日志和命令输出可复核；两个渲染层都不能直接取得系统能力。否决项：任一运行时有通用 IPC/宽泛 capability、未规范化路径、失败签名仍更新，或 Secret 进入前端包均不通过。评估边界：只评估桌面安全桥接与交付控制，不评估真实签名证书申请。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## MOBILE-01 跨平台原生前端、Native Bridge 与应用生命周期

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[07–09 内容审计中文讲义：跨平台原生交付](../chinese-guides/content-audit-07-09.md#mobile-01)。覆盖分工：本地讲义完整承担跨平台渲染/Bridge、生命周期、权限、OTA 二进制边界和真机验收；重复的核心讲义已移出。覆盖范围：React Native/Expo 等跨平台原生前端的渲染边界、JSI/Fabric/TurboModules、Native Module/Bridge、线程与序列化、前后台生命周期、权限、深链、推送、离线、热更新/OTA、安全存储、签名、商店审核、崩溃和启动/内存/列表性能；Web/Hybrid/跨平台原生/原生选择与降级。小程序和受限 Web 容器归 `RUNTIME-01`；React Native 与 Expo 英文页已从必读资源移除。
- 严格考核：挑战类型：CODING；首考题 1（资料定位）：只允许使用《07–09 内容审计中文讲义：跨平台原生交付》，定位跨平台渲染、Bridge、生命周期、权限、OTA 与商店版本边界，写出资料到兼容矩阵的闭环；首考题 2（机制解释）：解释“冷启动→请求相机权限→深链打开任务→后台→恢复→离线重试”的 JS/原生模块/UI 线程/网络链；反例是旧 JS 包直接调用新增原生 API 或权限永久拒绝后无限弹窗；首考题 3（最小产出）：固定 fixture 为 Android/iOS 版本 `1.0`、JS bundle `1.0/1.1`、相机权限“首次拒绝/永久拒绝”、深链 `app://task/42`、离线队列和后台恢复；交付最小切片、类型化版本化 Bridge、生命周期时序图、权限恢复 UI、OTA/商店兼容矩阵及六项断言，执行 `pnpm content:check`；预期永久拒绝导向设置、恢复不重复提交、1.0 原生拒绝 1.1-only 调用且降级、离线最终一次提交，保存模拟/断言记录；首考题 4（受限排错）：给定日志“恢复后同一任务提交两次；`NativeCameraV2` 在 1.0 崩溃；深链 `app://task/../../settings` 被接受”；只在“后台幂等键、版本能力检测、深链参数校验”三个候选中排查，写每项证伪观察、最小修复并用同一 fixture 六断言回归；首考题 5（学习复述）：用 3 分钟比较 Web、Hybrid、跨平台原生和原生的选择，并回答为何 OTA 不能越过二进制能力边界。复测变式：仅把网络从离线改为恢复时超时一次，保持权限、深链校验和二进制版本不变量不变，提交重试时序、预期仍只提交一次及新记录。命题边界：不要求成为 iOS/Android 专家，但不得忽略权限、生命周期和发布责任；模拟记录不冒充真机性能结论。
- 通过标准：时序图、兼容矩阵、六断言、拒绝/恢复日志和命令输出可复核；权限可恢复、Bridge 最小版本化、OTA 不越界。否决项：只在开发服务器成功、忽略永久拒绝/冷启动，或以旧 bundle 调新原生 API 而无降级。评估边界：只评估给定跨平台交付切片，不评估真实商店审核或设备性能。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟

## 领域综合考核

- [ ] 已通过领域综合考核
- 任务：从 3 个真实页面中提炼一个可复用组件或 schema 能力，完成用户任务流、全状态体验、API、实现、类型、测试、文档、示例、版本与迁移方案，并让另一页面实际接入；专项候选人再提供扩展或桌面容器接入。
- 通过标准：8 小时内完成；至少减少一处真实重复；两种消费者场景通过；考官提出一个不适合抽象的需求时能拒绝并说明理由。评估边界：领域综合考核只依据本领域列出的资料、题目输入和可复核产出；不得用资料外经验替代跨知识点整合证据。
- 预计耗时：资料 120 分钟；练习 180 分钟；项目 180 分钟；考核 105 分钟；复测 90 分钟
