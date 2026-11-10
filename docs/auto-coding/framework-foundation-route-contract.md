# 早期框架学习链与单框架路线合同

Issue #7；基线 `81a7fb6`；审读与初次请求采集 2026-11-10，请求复现、组件片段实验、页面复核与交付 2026-11-11（Asia/Shanghai）。**这是研究与下一轮实施合同，不是已上线的新路线。** 本轮未改生产代码、课程、考核或真实记录。

结论：采用 React 01→02→03→04、Vue 01→02→03→04→05 两条独立早期链，在各自副作用节点补异步失败与清理能力。先实现独立偏好及全入口统一推荐，同时显式标注下游练习尚待修订；不得将当前七份考核宣称为已验证的闭环。最优先的内容阻碍是 REACT-02 的产品行为冲突、VUE-02 的未固定片段，以及 VUE-03 倒置要求组件接口。具体修订已在下文裁决，无需再研究才能开始路线实施。

## 证据与已读边界

全文审读七份主讲义及 `knowledge-base/03-react.md`、`11-vue-development.md` 对应节点的学习资料、五题首考、复测、通过标准；逐项读取 `materials/b04/b05/b06.json` 对应章节。原始目录与题源分别保存在 [catalog.json](evidence/framework-foundation-route/catalog.json)、[source-inventory.json](evidence/framework-foundation-route/source-inventory.json)。两个入口仅沿用[已接受的入口合同](framework-entry-contracts.md)并核对共享定义，不重验 #6。异步基础沿用[已接受的异步链研究](route-principles-and-async-pilot.md)及 `async-pilot.ts`，本轮没有重读全部上游正文，不能由此要求 JS-07、TS-02、TS-03、JS-06 全篇必修。

实际运行：三个节点各一份练习 fetch 和挑战 Provider 输入捕获；七点上下文提取；VUE-02 全部 13 个独立 JS 片段；隔离产品页面走查；研究图与案例检查。没有真实模型评分、完整七点组件实测、真实 IME 操作、教学效果实验或真实数据迁移。[证据与复现索引](evidence/framework-foundation-route/README.md)记录命令、限制和失败后修正。

以下“硬前置”表示理解任务所需能力及可解释的补学建议，**不表示阅读权限、M3 认证门禁或整篇上游考核强制通过**。推荐顺序只减少概念切换；对照链接不计入待完成数。表中的章名为正文原三级标题，可在对应主讲义定位；Q1/Q2/Q3/Q4/Q5 指当前首考，M4 指当前复测。

## 七点概念—章节—断言—基础审定

### REACT-02

[主讲义](../knowledge/chinese-guides/react-02-component-boundaries-data-flow-composition.md)；目录 B05。当前运行时硬边仅 REACT-01→REACT-02。

| 概念 | 正文章节 | 练习及可观察断言 | 基础与裁决 |
| --- | --- | --- | --- |
| 所有权、单向流 | 先为工作台里的数据找主人；用完整组件追踪数据下行与意图上行 | Q2/Q3 追踪筛选→父层→列表→选择；正文筛选后详情保留，题目却要求关闭编辑器 | REACT-01 硬前置；先统一产品合同，不能用多加前置解决矛盾 |
| props、业务意图 | props 表达组件需要什么而不是允许改什么；用事件名称说明业务意图 | Q3 props/事件契约；Q4 候选中的状态位置、向下传值逐项证伪 | 对象引用来自入口 JS-03；函数参数来自 JS-01；表单沿 WEB-01，不新增整篇类型门槛 |
| 提升、children | 多个消费者共享状态时才向上提升；children 让容器不必了解所有业务字段 | Q1/Q3/Q5 组件树与组合实现；互斥面板允许全关、不允许同时开 | REACT-01；ReactNode/useId 最小用途本篇解释 |
| render prop | 内容需要子层数据时再用 render prop | 正文进度到 3 后按钮禁用；当前首考未点名，不追加评分 | 推荐延伸；Vue 作用域插槽是对照，不是前置 |
| key 与身份 | 列表重排时让草稿跟着资料走 | Q4 索引 key 候选；M4 openIds 两面板只关闭 A | 身份来自 REACT-01；M4 缺完整双面板夹具，应补齐，而非要求先学 REACT-03 |
| 异步回调 | 异步回调要说明何时才算完成 | 正文失败保留输入、等待时禁用；当前 Q3 保存未规定异步 | 把本节标为进阶选读，建议 JS-05 等待边界；首考保存用同步回调，不前置整条异步链 |
| 模式与公共接口 | 空态错误和只读模式也属于组件的输入；拆分的价值是减少隐含关系 | 说明加载/失败/只读责任；不以组件数量或 memo 为评分标准 | TS-02 判别联合推荐补读；Error Boundary/Suspense 留后续，避免反向要求 REACT-08 |

**确定修订**：保留正文“筛选不清除详情”的只读工作台。新增明确标为另一业务规则的“仅允许编辑可见订单”小节及完整父子夹具：A/B、selectedId=1，筛掉 A 时关闭 A 编辑器；保存入口还要核对可见 ID，旧回调不可提交。Q1 定位此节，Q4 失败版本固定为父层从全集计算可编辑对象，其他两个候选有对照证据；保留组件树、单向流、组合、三组交互与证伪检查。M4 固定 openIds=[1,2] 的源码、筛选动作与 A 关闭/B 可保存断言。这让两种产品行为各有适用条件，不把正文示例错判为坏代码。

### REACT-03

[主讲义](../knowledge/chinese-guides/react-03-state-model-derived-controlled.md)；B05；运行时当前没有入向硬边。

| 概念 | 正文章节 | 练习及可观察断言 | 基础与裁决 |
| --- | --- | --- | --- |
| 源与派生 | 先列事实再决定哪些需要 state；删除一份冗余数据比补一条同步更直接 | Q1/Q2/Q3 price 10→12、quantity=2，total 20→24；Q4 不用 Effect 回写 | REACT-02 硬前置：父层拥有输入、子层报告意图；补入运行时 |
| 输入中间值 | 编辑文本和有效数量是两种不同的信息 | M4 quantity='' 保留空白、阻止提交，不变成 0 | WEB-01 表单基础由入口承接；正文分钟解析可一跳迁移到数量，新增价格/数量固定驱动 |
| 互斥与刷新 | 互斥状态用一种明确的分支表示 | 正文 pending/error 保留 previous，失败后可重试；不是当前固定表单必考 | TS-02 类型记号用本地分支表解释；异步示例选读 JS-05，不让它阻塞同步状态练习 |
| 受控/非受控 | 一份状态放在能协调使用者的地方；受控值由外层决定非受控输入由 DOM 保存 | Q3/Q4 所有权、提交 payload；默认值与当前值区别 | REACT-02、WEB-01；FormData 就地用法保留 |
| 草稿、版本、key | 草稿可以不同但保存前要核对基线；重置应跟随身份或明确动作 | Q3 切换对象不能带出旧草稿；正文同 ID 新版本保留草稿并提示冲突 | REACT-01 身份经 REACT-02 承接；须固定对象 A/B 与初始标题，区别 ID 变化和版本变化 |
| 集合、不可变更新 | 集合里保存 ID 可以少一份陈旧对象；不可变更新只复制变化经过的路径 | 正文删除选中记录后显示未选择；不修改旧快照 | JS-03 已属入口基础；不因 Record 记号强制 TS-03 |
| URL、旧结果、撤销 | URL 状态与输入草稿可以各自有职责；旧请求有没有资格更新由身份决定；撤销只回退你明确记录的事实；用不变量检查模型是否清楚 | 正文撤销后新增清空 redo；服务器操作不随本地撤销回滚 | 选读，不要求先学 Router、服务端缓存或 REACT-04；当前考核仍限客户端表单 |

**确定修订**：补一个同步按钮模拟价格刷新、A/B 两对象切换的整合夹具，首考 10×2→12×2，M4 只改数量为空；保留 total 不重复保存、key 重置、输入空值与三候选证伪检查。无需将完整状态管理或请求竞态加入必修。

### REACT-04

[主讲义](../knowledge/chinese-guides/react-04-effects-external-sync-cleanup.md)；B06。目录 REACT-03，运行时仅 JS-04。

| 概念 | 正文章节 | 练习及可观察断言 | 基础与裁决 |
| --- | --- | --- | --- |
| 同步与计算 | 先判断是在计算展示还是连接外部系统 | Q1/Q3 删除纯计算 Effect；题称“8 个候选”但没有列出 | REACT-03 硬前置；补完整八项，不引入 REACT-05 |
| 资源与闭包 | 一次监听对应一份清理函数；依赖变化时先结束旧同步再开始新同步 | Q2 A→B；Q3/Q4 清理旧资源、卸载无状态提交 | REACT-01 闭包/身份；监听函数引用与 capture 本篇解释 |
| 依赖、计时 | 依赖数组说明读取关系不能充当运行次数开关；暂停计时需要保留状态并停止外部计时器 | 步长 1→3、暂停保留读数；不固定 render 次数 | JS-01，定时器短文 PREJS-04 推荐辅助；非整篇浏览器专题 |
| 取消与资格 | 请求能否取消和结果能否提交是两个问题；异步工作的异常和收尾都需要主人 | Q3 A 消息不能盖 B、卸载后无提交；M4 B 立即失败只显示 B 错误 | JS-05 的错误/取消/旧结果是硬能力，替换含糊 JS-04 直边；JS-04 由 JS-05 递归承接 |
| 重放与最新值 | Strict Mode 帮你发现开始和结束不对称；Effect Event 读取最新提示格式但不重启同步 | Q5 对称清理；正文详细格式变化不重启订阅 | Effect Event 为版本化选读，不提升为首考条件；在线 API 本次核验见来源表 |
| 布局、复用、平台 | 布局读取需要单独说明与绘制的关系；按同步对象划分职责再考虑复用；页面离开浏览器暂停与错误恢复各有边界 | 不把普通 Effect 承诺为绘制之后；当前首考不考 SSR/BFCache/store | 就地边界解释与后续链接，不加入硬前置 |

**确定修订**：当前 Q2 写“A 延迟 300ms 关闭”，Q3 写“A 在 300ms 发消息”，需统一为“取消不阻止测试服务在 t=300 交付旧消息”。提供可控调度器与连接句柄：t0 A，t50 B，t130 B ready，t150 unmount，t300 A message；记录提交尝试而非仅看卸载后 DOM。M4 只改 B 在 t50 立即失败。八个候选明确固定为筛选、总额、格式化全名（render），点击保存（event），监听、计时、连接、加载资料（外部同步）；保留至少移除一个纯计算 Effect 的要求。函数先在组件内讲清，再抽同步 hook；Hook 复用规则仅局部说明，不能形成 REACT-04↔REACT-05 环。

### VUE-02

[主讲义](../knowledge/chinese-guides/vue-02-ref-reactive-computed-boundaries.md)；B04。目录 VUE-01，运行时仅 JS-07。

| 概念 | 正文章节 | 练习及可观察断言 | 基础与裁决 |
| --- | --- | --- | --- |
| 容器、代理、raw | 从一份会变化的资料数量认识 ref；reactive 让对象属性访问经过代理；原对象变了不代表依赖收到通知 | Q1/Q2 读取→写入→通知；raw 绕写使缓存保持旧值 | VUE-01 硬前置；JS-07 降 RELATED，正文已讲代理访问，不要求迭代器/资源管理全篇 |
| 替换、解构、解包 | 整体替换时要保留被订阅的入口；解构基本类型会取走当时的值；自动解包取决于 ref 放在哪里 | Q3 预测并修复解构；普通对象/数组/Map 与顶层模板区别 | 对象身份、解构最小例子就地解释；JS-03 推荐章节；defineProps 特例为 VUE-04 对照 |
| 派生与分支 | computed 让筛选结果跟着源状态变化；依赖来自本次真正读取的分支；computed 的 getter 只计算结果 | Q2/Q3 筛选状态表、无独立派生副本；Q4 去除副作用/重复同步 | VUE-01 最小模板，补 v-model/v-for 用途说明即可，不把 VUE-03 反置为前置 |
| 可写派生 | 可写 computed 把编辑转换回源状态 | 1:30→2:05 得 125；2:90 失败保留 125 | 本地解析规则；不要求完整表单设计 |
| 浅层、外部对象 | 浅层响应式要求配套的更新方式；外部实例和对象身份需要明确保留 | Q3/Q4 shallowRef push 不通知、替换通知；地图不被深代理 | 本地 ReaderEngine 代替真实地图 SDK；不凭深代理推断性能变慢 |
| 只读、集合 | readonly 约束一条写入路径而不是冻结数据；数组和集合要看消费者实际读取什么 | readonly 原持有者仍可更新；Map 按键与遍历读取 | 就地解释，不强制 CS-01/TS-01 全篇 |
| DOM 与诊断 | 数据立即变化与 DOM 稍后更新可以同时成立；从不更新的现象反推哪条联系断了 | DOM 0→await nextTick→2；Q4 触发日志与状态表 | await 最小含义本节补一句，PREJS-07 推荐；不要增加 JS-04 整篇硬边 |

**确定修订**：当前实际有 13 个独立 JS 例子、2 个 SFC，并没有“10 个固定片段”清单。固定首考十项为 ref、proxy、raw-write、ref-replace、reactive-replace、destructure、unwrapping、writable-computed、shallow-ref、mark-raw（对应正文 example ID 均加 `vue02-`）。保留 ≥9/10 的输出/因果预测检查，改“内部触发顺序”成可观察值，不固定框架内部调用次数。另给完整 filter SFC 与四个独立故障补丁：shallow 数组 push、getter 改源数组、外部实例被 reactive 包装、额外保存 visible 副本。逐一验证修复，不笼统要求性能变快。

M4 当前“把 filters 持有方式改为传入地图实例的 shallowRef”混合了状态容器与实例输入，且正文 filter 用 query/onlyPending 而非 filters。新版先固定 `filters=ref({query:'',onlyPending:false})`，M4 仅改 shallowRef，更新协议均为整体替换 `.value`；外部实例单独保持 `shallowRef(new ReaderEngine())`，只接受筛选结果，不混放 filters。保留结果更新与实例身份检查；明确这套新夹具待实施，13 个 JS 片段输出通过不等于它已通过组件验证。

### VUE-03

[主讲义](../knowledge/chinese-guides/vue-03-template-directives-events-forms.md)；B05；当前运行时无入向硬边。

| 概念 | 正文章节 | 练习及可观察断言 | 基础与裁决 |
| --- | --- | --- | --- |
| 插值与属性 | 文本插值与属性绑定各有入口；布尔属性与字符串状态不能混着理解 | 文本尖括号不变 HTML；disabled 与 aria 状态区分 | VUE-02 硬前置；WEB-01 入口承接 |
| 隐藏与身份 | v-if 与 v-show 决定的是两种保留方式；列表 key 让输入跟随稳定身份 | Q2/Q3/Q4 排序后草稿/焦点仍对应 id；v-if/v-for 同节点反例 | VUE-02；React 列表是可选对照 |
| 事件与提交 | 事件处理器先提取当前任务需要的值；prevent 和 stop 处理不同的问题 | Enter 与按钮统一 submit，默认导航与冒泡分别验证 | DOM 基础就地解释；不强制额外框架 |
| 原生表单 | v-model 根据原生控件选择值与事件；输入过程允许暂时不是合法业务值 | Q2/Q3/M4 空数量不为 0、复选框与 payload | 保留四类输入；自定义日期组件移到 VUE-04，当前位置用原生 date 并明确 ISO 字符串或空值 |
| 中文输入 | 中文输入先完成选词再提交意图 | composition 中无提交，确认后明确提交一次 | 本篇教授；真实 IME 必须另测，合成事件只检查守卫 |
| 信任、DOM 职责 | v-html 不会把字符串变成 Vue 组件；自定义指令只承担清楚的 DOM 操作；沿最终 DOM 和用户动作检查模板 | 不把模板编译当交互通过；聚焦新节点 | 局部解释；自定义指令清理是后续 VUE-05 推荐方向 |

**确定修订**：固定三个同名记录 `{id:'a'/'b'/'c',title:'资料'}`、草稿按 ID 保存、过滤谓词与删除策略。首考固定无排序的过滤/删除，M4 仅打开反转排序；当前首考已要求排序，复测再“仅启用排序”不成立。首考验证存活项身份、被移除当前项的焦点回退；M4 增加排序前后焦点/草稿同 ID。日期的组件 v-model 能力迁至 VUE-04 的新增练习附件，不丢弃该有效检查；本点保留原生日期 payload 与其他输入、IME、键盘全部检查。

### VUE-04

[主讲义](../knowledge/chinese-guides/vue-04-typed-components-slots-model-teleport.md)；B05；运行时无入向硬边，TS-03 为 RELATED。

| 概念 | 正文章节 | 练习及可观察断言 | 基础与裁决 |
| --- | --- | --- | --- |
| props/emits、类型 | 先把输入和修改意图写成一对；类型能说明允许的调用不能代替运行时解析 | Q1/Q2/Q3 错误载荷被类型或测试拒绝，父层拥有权威状态 | VUE-03 硬前置；TS-01/TS-03 推荐，宏的对象/元组/泛型记号就地补图解 |
| 事件与等待 | emit 不会沿组件树自动冒泡也不能用来等待保存 | Q2 业务事件与 update 区分；保存进度不能 await emit | 正文目前把完整 Promise 回调例子交给 REACT-02；补 Vue 同步父层 saving/error 示例，异步进阶指 JS-05，跨框架降选读 |
| model | 组件 v-model 让值与更新意图配对；多个模型适合真正独立的连续值 | Q3 query/page 唯一来源；M4 父确认延迟 200ms | 同步模型已有，延迟拒绝协议未教；必须补受控 prop+emit 的显式值/请求/确认流程，不能仅更改计时器宣称通过 |
| 插槽 | 普通插槽的内容仍属于父层作用域；作用域插槽把子层数据交给父层排版 | Q3 替换 result slot 类型仍完整；Q4 不用 any 绕过 | VUE-03 遍历/作用域；React children 为对照 |
| 属性透传 | 透传属性必须落到真正的控件 | 标签、禁用、描述都落 input，事件只发生一次 | WEB-01；Omit/继承/@vue-ignore 局部解释，非整篇 TS-03 硬门槛 |
| DOM 与组件树 | Teleport 移动 DOM 不改变组件的归属；用原生 dialog 补齐弹窗的进入和退出 | Q3/Q4 目标、背景不可操作、Esc、关闭回触发按钮 | VUE-03；本篇 onBeforeUnmount 为局部清理，不反置 VUE-05；provide/inject 只讲归属，不考未教实现 |
| 草稿与 API 责任 | 草稿保存与弹窗开关需要各自定义；选通信方式之前先说明责任 | 取消不修改已保存值；Q5 不用全局 store 掩盖边界 | 目前版本冲突跳 REACT-03；补 Vue 本地简化草稿/确认/取消，版本冲突保留选读 |

**确定修订**：统一题干 `#overlays` 与故障 body 的目标协议：HTML 提供固定 `#overlays`，dialog 使用 showModal；故障只移 DOM 不进入模态。固定六个反例：嵌套 prop 修改、错误 emit 类型、slot any、子层重复 model、重复 attrs 监听、仅 Teleport 的非模态层。M4 用手动释放“200ms 确认”任务，记录 t0 请求、未确认时权威 query 不变、确认后采用、拒绝后仍旧值；草稿如允许暂存必须明确命名且不作为提交权威。新增日期组件附件承接 VUE-03 的组件 payload 检查。未经组件运行验证，不把 defineModel 的延迟表现预设为符合这个合同。

### VUE-05

[主讲义](../knowledge/chinese-guides/vue-05-lifecycle-effects-async-recovery.md)；B06；目录 VUE-04，运行时仅 VUE-02。

| 概念 | 正文章节 | 练习及可观察断言 | 基础与裁决 |
| --- | --- | --- | --- |
| 实例与 DOM 资源 | 生命周期说明实例阶段不是所有变化的触发器；DOM 观察器必须与组件一起释放 | Q3/Q4 卸载外部监听归零；ResizeObserver 断开 | VUE-04 组件/DOM 归属硬前置；观察器 API 就地解释 |
| 来源与清理 | watch 和 watchEffect 对依赖的认识不同；清理属于每一轮工作必须尽早登记 | Q1/Q2/Q4 清理在新工作前，await 后读取不算同步依赖 | VUE-02 硬能力经 VUE-04 链承接，运行时直边降传递展示 |
| 异步资格 | 用快慢请求观察取消与失效的不同责任 | Q3 A/B/C 仅 C 提交；M4 C 错误不被 A/B 成功盖掉 | JS-05 硬能力；React 例子可对照，本篇已有完整请求源码 |
| DOM 时机与深度 | DOM 更新前后可以通过一个小例子分清；深度观察不是自动保存旧快照 | pre 数据3/DOM0、post 数据3/DOM3；5000 项不能以 deep:true 当通用修复 | nextTick 来自 VUE-02；性能任务缺对象形状/变更序列/指标，另补固定输入 |
| 缓存生命周期 | KeepAlive 保留实例时需要暂停仍在运行的工作 | Q3 停用监听归零、草稿保留、激活不重复连接 | VUE-04 实例；固定两个草稿页和第三页淘汰用例分开，不声称两个页能证明 max=2 淘汰 |
| 代码加载与恢复 | 异步组件加载失败要重新建立可恢复入口；Suspense 协调等待错误边界负责恢复 | loader 首次失败/重试保留父草稿，局部错误不卸整页 | 动态 import 本地解释及 JS-06 选读，不让其整篇成为门槛；Suspense 仍是选读实验边界 |
| 服务端与后续复用 | 服务端执行和组件停用要写进使用约定 | setup 同步注册、客户端资源；先理解生命周期再抽 composable | 不前置 VUE-06 或 React Effect |

**确定修订**：当前正文 A/B=700/150ms、单计时草稿页；题目 A/B/C=300/200/100ms、两个草稿标签、5000 项，不能当同一固定工程。补组合附件并明确发起 t0/t10/t20，结果 t300/t210/t120；另固定停用、激活、卸载操作点与资源计数。M4 仅改 C 为失败。5000 项固定 `{id,nested:{value}}`，比较字段 getter 与 deep 遍历的采样耗时/回调数量但不设跨机器绝对阈值；保留性能记录，不拿它作为前置课程门槛。明确焦点初始在“重试”按钮，恢复后仍可继续操作；保留 loader 首败/局部重试及草稿检查，不扩张 VUE-07 独立 chunk 产物合同。

## 关系差异与两条链

| 目标 | 目录/正文声明 | 当前运行时 PREREQUISITE | 审定后的直接关系 |
| --- | --- | --- | --- |
| REACT-02 | REACT-01 | REACT-01 | 保留；异步保存为选读 JS-05 |
| REACT-03 | REACT-02 | 无 | 补 REACT-02，依据输入所有权和组件接口，不因数组相邻 |
| REACT-04 | REACT-03 | JS-04 | 补 REACT-03；JS-04 直边替换为 JS-05 能力边，由 JS-05 递归承接 JS-04 |
| VUE-02 | VUE-01 | JS-07 | 补 VUE-01；JS-07 降相关；代理最小解释已在本篇 |
| VUE-03 | VUE-02 | 无 | 补 VUE-02，源数据/派生/更新时机确实用于任务 |
| VUE-04 | VUE-03 | 无 | 补 VUE-03；TS-03 继续相关，不升级 |
| VUE-05 | VUE-04 | VUE-02 | 补 VUE-04 与 JS-05；VUE-02 作为传递能力展示，不重复硬门槛 |

React：JS-01、JS-03、WEB-01 → REACT-01 → REACT-02 → REACT-03 → REACT-04；在最后节点前补 JS-05。Vue：WEB-01 → VUE-01 → VUE-02 → VUE-03 → VUE-04 → VUE-05；在最后节点前补 JS-05。异步展开为 PREJS-04→PREJS-07（阅读辅助）、JS-01 与 PREJS-07→JS-04→JS-05。短文不伪造 knowledge ID，读过不等于掌握。JS-03/WEB-01 作为已接受入口能力边的边界叶子，本轮不向未审上游继续递归。

JS-05 补学卡定位“等待对象、错误出口、取消协作、旧结果资格”，不是要求完成其全部综合考核。React-02/03 的异步扩展与 Vue-04 的异步保存可在这之后回看。初学最短路径先完成同步组件/状态，再进入副作用。Effect Event、render prop、深浅集合、SSR、复杂类型仍可读，但必考机制明确集中。

[VUE-07 局部复核](../knowledge/chinese-guides/vue-07-router-navigation-boundaries.md)：第 170 行“请求取消与提交资格”链接 REACT-04，是解释真实 fetch 的实际补充；应改链 VUE-05“用快慢请求观察取消与失效的不同责任”。第 226 行懒加载恢复链接 REACT-08，当前 Vue 正文仅给发布/旧 chunk 原则，不能断言独立完整。改为 VUE-05 的 loader 重试作为已教授部分，并在 VUE-07 就地列明旧版本 chunk、网络失败、草稿保存与受控刷新区别；独立产物验证仍未审定。VUE-04 的两处异步/草稿链接也需本地补齐。其余七篇跨框架引用均是已有机制的比较，不加入硬边。

## 题源与版本合同

代码链路：`knowledge.service.ts` 从首考 Q3/Q4 生成练习任务；`assessment/questions.ts` 本地解析五题、按 M4 变式包装，**没有题目生成模型调用**。`practice.service.ts` 的 fetch 进行验证；`grading.service.ts` 把评分输入交给 Provider，系统提示词要求仅按资料、题干与证据评分。外部链接只有元数据，不会自动抓正文。

七点均不在现有版本化完整机制选择范围，落入 `extractLocalMaterialContext` 的每段 6,000 字符、总 24,000 字符策略。下表为本次实际提取（JS UTF-16 字符数）；三个代表点另有真实发送证据。

| 点 | 原长→发送长度 | 截止位置 | 实际缺少的必考解释 |
| --- | --- | --- | --- |
| REACT-02 | 12133→6000 | children 示例 `</P` 中断 | 后续 key、异步保存；新订单夹具本就不存在 |
| REACT-03 | 15619→6000 | 受控标题中断 | 受控输入、草稿/key、不可变更新的完整操作 |
| REACT-04 | 11860→6000 | 请求组件 state 声明中断 | active/cleanup、旧结果、异常收尾与 Strict Mode |
| VUE-02 | 15742→6000 | filter 源数据声明中断 | 筛选、computed 分支/纯度、shallow/markRaw、nextTick |
| VUE-03 | 12832→6000 | 原生 model 代码头中断 | 空数字、IME 守卫、自定义指令 |
| VUE-04 | 14994→6000 | slots 声明中断 | 作用域插槽、attrs、Teleport/dialog/焦点 |
| VUE-05 | 12986→6000 | 请求模板中断 | 请求操作说明、flush、KeepAlive、异步组件恢复 |

捕获 [REACT-04 练习](evidence/framework-foundation-route/REACT-04-practice-request.json)、[挑战](evidence/framework-foundation-route/REACT-04-challenge-request.json)，[VUE-02 练习](evidence/framework-foundation-route/VUE-02-practice-request.json)、[挑战](evidence/framework-foundation-route/VUE-02-challenge-request.json)，[VUE-04 练习](evidence/framework-foundation-route/VUE-04-practice-request.json)、[挑战](evidence/framework-foundation-route/VUE-04-challenge-request.json)。三个练习请求没有 contextCoverage；题干有要求但 materialContext 缺完整机制。挑战保留题干和 sourceBasis，不能靠题干里的术语代替教授机制。其余四点只捕获实际提取器输出，未捕获发送请求；同路径存在风险，不声称已逐个网络验证。

修订时采用 `framework-foundation-v1`（七点首次显式版本），保存旧 `strict-practice` 原文快照为 `framework-foundation-legacy`，不得冒称旧版已验证。每个必考机制按上表对应**完整三级小节**，加新夹具与操作表，24,000 预算按任务分组；缺节、夹具未发布或超限时练习仅 STRUCTURE_ONLY、挑战拒绝语义创建并给明确原因。禁止切半段代码或仅靠关键词算覆盖。新版五题、复测、pass criteria、正文机制、fixtureVersion/hash 和环境版本一同快照，评分与重评只读创建时版本；旧答卷继续旧题源，缺历史机制快照标为历史证据不足，不能从新版补写并重判。旧完成、M3/M4、笔记和草稿不清零；新练习另建 activityId，用户明确开始才产生新证据。

已观察的是输入缺失和夹具不一致；真实模型是否误判、延迟模型的实际交互、整合 fixture 是否正确仍待实施验证，不能从模拟响应推出正确性。

## 单框架偏好与确定的推荐语义

新增独立偏好 `frameworkChoice: UNDECIDED | REACT | VUE | NONE`。不存在记录等于 UNDECIDED；NONE 表示暂不进入框架，不表示放弃或暂缓任何知识点。随时可改回任意值。保留稳定 track ID `react`、`vue`，共同基础使用 `foundation`；agent-mcp 等现有专项仍可查阅，不在本切片默认选择。

纯规划接口提案：

```ts
planLearningRoute({
  routeVersion: 'framework-foundation-v1',
  frameworkChoice, currentFocusCode, states, readingStates, catalog
}): {
  routeVersion, preferenceRevision,
  current: null | { code, outsideSelectedTrack, blockers },
  next: null | { code, kind: 'CONTINUE' | 'PREREQUISITE' | 'START' },
  outcome: 'STEP' | 'CHOOSE_FRAMEWORK' | 'PAUSED_PREREQUISITE' |
    'PAUSED_POINT' | 'AUDITED_CHAIN_COMPLETE' | 'NO_RECOMMENDATION' | 'DATA_GAP',
  blockers: { code, state, reason, href, kind: 'POINT' | 'READING' }[],
  reviewScope: { auditedCodes, assessmentReadyCodes, unreviewedCodes }
}
```

`current` 为展示现有焦点；没有显式焦点时，由调用层按现有规则选择最近更新的 LEARNING 点作为继续上下文（同时间以 code 排序），不写 current_focus；当前 code 缺失则 DATA_GAP。规划器不写数据库；仅显式“开始这项”调用旧焦点操作。`assessmentReadyCodes` 初始只有已接受入口/异步合同，七个下游待上述课程版本交付后加入；推荐阅读不伪装成考核就绪。

确定规则（依序执行）：

1. `currentFocusCode` 存在且 LEARNING：`next=CONTINUE current`，即使偏好已切换也保留；附未满足基础和“位于其他方向”提示，用户可查看所选方向计划。current 若已 LEARNED，仅保留展示，不阻止下一步。异常多焦点按 updatedAt 倒序、code 字典序显示并报告数据问题，不自动修库。
2. 没有正在学习的焦点：UNDECIDED 返回 CHOOSE_FRAMEWORK，不自动选两套，也不根据历史进度推意愿；附共同基础浏览链接。NONE 只从已审共同能力 `[JS-01, JS-03, WEB-01, JS-04, JS-05]` 找第一项未学完，短文仅作补学提示；共同能力完成则 NO_RECOMMENDATION，不跳专项。
3. REACT/VUE 只在相应已审链从头找第一个未 LEARNED 点。DEFERRED 不视为已满足：若此点暂缓，PAUSED_POINT；未暂缓则按声明顺序深度优先查硬前置（先同框架，再异步）。已 LEARNED 的节点不追溯撤销其上游。前置 DEFERRED 返回 PAUSED_PREREQUISITE，不静默跳过；缺 code 返回 DATA_GAP，不推荐依赖点。普通未学前置返回 PREREQUISITE；用户可以直接查阅目标，不能自动标记掌握。
4. 阅读辅助只列入 blockers，不伪造成 POINT、也不阻塞知识点开始按钮；用户可略读，不能根据阅读百分比写掌握。已有 `status`/masteryLevel 单独作为考核提示，不用于替代 learningState 规划依据。
5. 链全 LEARNED 返回 AUDITED_CHAIN_COMPLETE，列“可继续浏览尚未审定的后续资料”，没有自动下一点。未审范围不从旧数组 fallback；已在未审点学习仍可继续 current，显式标记依据未审。无可推荐项保留搜索、资料与更改偏好入口，不显示“全部高级能力已掌握”。

可执行的案例见 [route-cases.json](evidence/framework-foundation-route/route-cases.json) 与[校验器](evidence/framework-foundation-route/verify-contract.mjs)。核心输入输出如下，未列点默认为 NOT_STARTED，除非写“全学完”。

| 输入 | 输出 | 不变项 |
| --- | --- | --- |
| 无偏好、无焦点，即使 React 01 已学 | CHOOSE_FRAMEWORK / null | 不能推断 React 或双框架 |
| REACT，入口与基础已学 | START REACT-02 | Vue 状态原样 |
| VUE，仅 WEB-01 已学 | START VUE-01 | React 不进入待学计数 |
| REACT，JS-01/WEB-01 已学、JS-03 未学 | PREREQUISITE JS-03 | 不跳入口 |
| 同上 JS-03 已暂缓 | PAUSED_PREREQUISITE / null，blocker JS-03 | 不恢复或覆盖暂缓原因 |
| VUE，缺 WEB-01 目录记录 | DATA_GAP / null | 不制造假 ID |
| VUE 偏好、current REACT-03 正在学习 | CONTINUE REACT-03，outsideSelectedTrack=true | 偏好与焦点均保留 |
| REACT 01–03 与入口基础已学，JS-04 未学 | PREREQUISITE JS-04，再 JS-05，再 REACT-04 | PREJS-07 作为阅读提示 |
| VUE 全链已学 | AUDITED_CHAIN_COMPLETE / null | 不转 React 或自动 VUE-06 |
| REACT 全链已学且 Vue 01–02 有历史进度 | AUDITED_CHAIN_COMPLETE / null | 不抹掉、不自动续第二框架 |
| 改成 VUE，Vue 01 已学、无学习中焦点 | START VUE-02 | 旧 route choice 保留 |
| VUE-02 因旧 BRANCH 暂缓，入口已学 | PAUSED_POINT / null | 选择 Vue 不批量恢复 |
| NONE、共同能力未学 | START JS-01 | 两框架进度不动 |
| NONE、共同能力全学 | NO_RECOMMENDATION / null | 仍可访问所有资料 |
| current VUE-07 正在学，偏好 VUE | CONTINUE VUE-07，依据未审 | 不把旧路径称作已验证依赖 |

## 消费者、导航与兼容接口

新增 `GET /api/v1/learning/route` 返回上面的完整模型；`GET/PUT /api/v1/learning/preferences`，PUT `{frameworkChoice, expectedRevision}`，原子更新独立表，重复同值不增加 revision，过期 revision 返回 409 和当前值。响应明确偏好不改焦点。所有个人推荐必须调用同一规划器，不能各过滤一次旧数组。

| 消费者/文件 | 当前依据 | 下一轮改动与兼容 |
| --- | --- | --- |
| `services/learning/routes.ts`、learning HTTP routes | mainline/KNOWLEDGE_PATHS 顺序与入口递归；branches 返回 null choice | 委托新规划器；旧 branches 数组仅映射有 next 的结果，无 next 返回 []，附新版 route 供新 UI 展示原因；不能 fallback 另一轨 |
| `services/learning.service.ts#getLearningWorkspace` | current→branches，空结果再从 compareRouteOrder 找 NOT_STARTED | 删除个人推荐 fallback，返回 route/outcome；current 原样；suggested 保留 nullable 兼容 |
| `services/knowledge.service.ts#getKnowledgeRecommendation` | `status!==MASTERED`、硬边必须 MASTERED、旧 routeOrder | 改委托统一学习规划；考核/复测作为当前点辅助 action，不能以另一规则跨轨推荐或阻止查阅；旧 recommendation 保持 nullable point，新增 outcome |
| `services/learning/points.ts`、knowledge list/detail | KNOWLEDGE_ROUTE_INDEX 给 planWeek/routeOrder | 旧字段显式标 legacy；增加 personalRoutePosition/routeVersion，不拿批次推优先级 |
| `TodayPage.vue` 及工作台子组件、api-client/shared DTO | suggested 与旧求职入口 | 偏好选择卡、暂停/数据缺失/完成状态有明确文案；保留 current、完成按钮、打卡；移除“求职优先路线”默认称谓 |
| `CalendarPage.vue` (`/plan`) | planWeek 分组、旧总数/主干完成度 | 顶部“共同基础 / React 或 Vue 可选方向”结构与个人下一步；旧 B01–B35 单独“旧分组浏览”，分母不把双框架算全员必修 |
| `KnowledgeDetailPage.vue` 及分支组件 | 当前点 branches，推荐 VUE-03 等 | next 与偏好一致；查看其他轨只作浏览，不暗改偏好；无偏好显示选择入口 |
| `KnowledgeMaterialPage.vue`、`content/learning-material-catalog.ts` | batch.chapters 相邻项，按钮“接着读” | 保留旧分组前后篇但改“同组上一篇/下一篇”；增加“我的下一步”取 route；保留 code、guide、anchor 与 URL，URL query 可加 navigation=legacy |
| 图谱/脑图/知识清单与 taxonomy | 静态 trackIds、旧 routeOrder | 图呈共同基础和可选方向；排序仅浏览，未审边不显示已验证；不删另一框架节点 |
| `knowledge-relations.service.ts` | JOB_FIRST_FOUNDATION_CANDIDATES、FRAMEWORK_ROUTE_CANDIDATES→COMPLETE_ROUTE_CANDIDATES→PLAN_ROUTE→35 批→索引 | 从个人推荐全部移除；旧值冻结导出 legacy map，不用于新核心能力结构；显式早期合同生成边，related 保留对照 |
| `syncKnowledgeRelations` / `import.service.ts` | 自动边清理部分在事务外，relatedPairs 可删除同对人工硬边 | 新迁移带 origin/contractVersion；只按已知自动边 ID/描述映射清理，保留人工边并标注非推荐依据；删除/插入同事务，不能把 UNKNOWN 人工边静默删掉 |
| `notes/persistence.ts`、资料导入及阅读进度 | routeOrder 排序，code/guide 身份 | 笔记排序保留 legacy 或显式切 personal；import 按 code upsert，不能重建点或执行 reset；材料目录不从偏好删内容 |

保留现有 track ID `react`/`vue`，routeVersion 与 track ID 分离。新增 `legacyRouteMap` 冻结基线运行时 `{code, week, order}`，另存材料目录 `{code, batch, guide, anchor}`：**二者不是同一种 B 分组，不能假定同号同内容**。新路线不再固定 35；旧 planWeek 字段、链接和旧分组只读解析继续工作。code 不变，不需要知识点合并映射；旧 group→codes 是多对多映射，新 track→codes 独立存放。若将来拆课程，先新增 section/fixture 标识，不用改 knowledge ID。

## 数据迁移设计与隔离样本

新增表 `learning_preferences(id='local', framework_choice, revision, updated_at)`，旧库迁移时插入 UNDECIDED，不读取历史 route choice 推断偏好。route choice 原表保留，偏好界面不再调用 BRANCH。已有 BRANCH 造成的 DEFERRED 无法可靠推回原状态，原样保存，仅提供用户主动恢复单点入口。

隔离样本定义在 [migration-samples.json](evidence/framework-foundation-route/migration-samples.json)：双框架历史、旧分支暂缓、当前焦点、部分阅读、笔记版本、旧练习/挑战快照、掌握事件、打卡全部有预期。要求测试真实 SQLite 副本（下一轮），迁移前后按主键逐表比对：knowledge_points 的 ID/code、learning_state、status、mastery_level、focus、时间；knowledge_notes/versions；material_reading_progress；learning_practice_attempts；assessment sessions/questions/answers/results/hints；mastery_events；两套 checkins 与关联；learning_route_choices；个人设置。新增表和受控自动关系变更以外应字节/字段相等。

事务内执行 schema/偏好默认行/自动关系变更/版本记录；重复执行不新增默认行、不改 revision、不重置旧表。在关系删除后注入失败，整个事务回滚，旧边与旧记录仍在。备份只放隔离 DATA_DIR；生产升级需使用既有备份机制但本轮不执行。旧版本读取忽略新增表仍能按原 code/ID 查记录；新版本读旧挑战走 legacy 分支，不强求新字段。若旧应用写入导致新版修订失配，返回冲突后重读，不能静默覆盖偏好。降级可关闭新 route 功能并保留表，不删除用户新偏好或重建旧学习状态。

当前 sync 的删除在插入事务外，必须一起重构；不能只给表新增一列就声称原子迁移成立。本轮样本与模型检查不是 SQLite 迁移验收。

## 页面观察与拟议变化

2026-11-11 Chrome 157.0.8103.40、1440×1000；本机前端 42831、后端 42830，`DATA_DIR=tmp/issue7-browser`，NODE_ENV=test、禁 .env.local、禁自动备份、空 AI key。新导入库，无个人记录；只导航/滚动，没有点击开始、完成、暂缓或提交。阅读器自身可能写本隔离库的阅读进度。地址和 UTC 时间见 [pages.json](evidence/framework-foundation-route/pages.json)，正文文本及截图见证据索引。

- 学习台首项 JS-01，仍有“查看求职优先路线”文字；这是旧推荐入口，拟统一为“查看学习路线”，显示偏好状态。
- `/plan` 顶部入口卡并排说明 React/Vue 各自基础，没有持久偏好选择；下方仍统计旧分组主干。拟把核心结构、个人选择与旧分组分区，不把方向浏览计为必修。
- REACT-02 详情的实际分支是 VUE-03，“当前学习路线中紧接此知识点”，与单框架预期冲突。拟为选 React 时 REACT-03 或其未满足前置；未选时选择提示。
- REACT-02 阅读器同组导航含 Vue 篇章，来源是 B05 目录，不是依赖。拟保留浏览，但“接着读”改为“同组下一篇”，个人继续入口单独显示。

截图只证明当前页面。所有“拟”均未实施；移动端、辅助技术、焦点完整回归和新选择界面视觉验收留下一轮。

## 优先实施切片与验收交接

**第一切片：独立框架选择与统一有限范围推荐。** 包含 shared 新路线合同/DTO、服务端 preferences schema+迁移+服务+HTTP、`learning/routes.ts`、`learning.service.ts`、`knowledge.service.ts` 推荐入口、关系同步事务/来源、客户端 API、学习台/路线页/详情分支/阅读器导航，以及上述测试。冻结 legacy 索引，保持材料路径与旧分组可访问；不重排全库、不改变 223 个稳定身份、不把 agent-mcp 自动纳入选择。

内容同批最小改动限学习前提示、偏好说明与“练习待修订”状态：七点仍可阅读与看历史证据，旧练习不自动换题；新语义挑战对尚未发布的 foundation 合同给具体缺口，用户可保存结构草稿。不要把未修订考核作为完成早期链的硬门槛。课程修订按本报告逐点发布后，通过 assessmentReadyCodes 开启；这不是预设后续 Issue 数量。

验收必须同时覆盖：15 个确定路线案例；偏好变更不写旧状态；双框架/旧 BRANCH/阅读/笔记/挑战 SQLite 样本、幂等与失败回滚；学习台/旧 recommendation/详情/阅读器返回同一推荐结果；旧批次只读前后导航标签清楚；全链完成不 fallback 未审点；关系图无环可解析且无跨框架必修；有当前焦点时切偏好不跳页面；刷新后偏好保留。真实 UI 在隔离端口验证选择、切换、空态和旧记录读取。旧数量/双框架交错测试应改为上述不变量，保留有效身份与数据检查。

剩余局部风险：七份新整合 fixture 尚未实现；Vue 延迟 model 必须实测后选显式受控实现；IME 需真实输入法；VUE-07 chunk 尚未验证；现有人工关系缺来源需保守保留；未审上游不递归扩张。它们不阻止偏好与统一推荐切片，但阻止宣称七点全部考核已闭环。

## 一手来源表

以下实际打开正文指定段落；非全文审计，在线文档版本不等同工程锁版本。2026-11-10 React 页面页眉返回 v19.3（区别于旧报告 v19.2），Vue 文档无补丁版本。2026-11-11 实验使用仓库已安装 Vue **3.5.43**、Node **22.14.0**；无依赖升级。

| 核验日期 | 精确来源 | 本轮覆盖 |
| --- | --- | --- |
| 11-10 | [React Sharing State](https://react.dev/learn/sharing-state-between-components) | 最近共同拥有者、受控输入；支持 REACT-02/03 的能力衔接 |
| 11-10 | [React Choosing State](https://react.dev/learn/choosing-the-state-structure#principles-for-structuring-state) | 冗余/矛盾状态；不规定本站订单过滤规则 |
| 11-10 | [React useEffect](https://react.dev/reference/react/useEffect#parameters) | 旧 cleanup→新 setup、依赖比较，支持 REACT-04 |
| 11-10 | [React useEffectEvent](https://react.dev/reference/react/useEffectEvent#caveats) | 最新已提交值、限制与非稳定身份；不扩成首考要求 |
| 11-10 | [Vue 响应式](https://cn.vuejs.org/guide/essentials/reactivity-fundamentals#reactive) | 代理/原对象、替换和 DOM 更新，支持降级 JS-07 整篇门槛 |
| 11-10 | [Vue Watchers](https://cn.vuejs.org/guide/essentials/watchers#watcheffect) | 同步依赖与旧请求清理；本轮不重验所有生命周期 |
| 11-10 | [Vue 组件 model](https://cn.vuejs.org/guide/components/v-model#under-the-hood) | prop/update 配对，defineModel 3.4 起；不证明 200ms 复测已可行 |
| 11-10 | [Vue Suspense](https://cn.vuejs.org/guide/built-ins/suspense) | 实验性、两种异步依赖；不能作稳定错误恢复承诺 |
| 11-11 | [Vue 原生表单](https://cn.vuejs.org/guide/essentials/forms#basic-usage) | 控件绑定和 IME 中间态；不能替代真实 IME 实测 |
| 11-11 | [Vue 组件事件](https://cn.vuejs.org/guide/components/events#emitting-and-listening-to-events) | 组件事件非 DOM 冒泡 |
| 11-11 | [Vue Teleport](https://cn.vuejs.org/guide/built-ins/teleport#using-with-components) | DOM 放置与组件归属、目标存在时机 |
| 11-11 | [Vue computed](https://cn.vuejs.org/guide/essentials/computed#computed-caching-vs-methods) | 缓存与依赖，不以固定内部触发次数评分 |
| 11-11 | [Vue KeepAlive](https://cn.vuejs.org/guide/built-ins/keep-alive#lifecycle-of-cached-instance) | 缓存与激活/停用；支持显式资源暂停检查 |

上述页面均可打开；本轮未访问全部外链，不把未访问来源列为已核验。本站顺序、最小能力范围与迁移政策属于基于正文和任务的产品裁决，不是官方指定课程顺序。
