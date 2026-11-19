# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui-polish.spec.ts >> 打卡可搜索前 60 项以外的知识点，失败保留输入并可重试保存
- Location: e2e/ui-polish.spec.ts:57:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('dialog', { name: '今天实际学了什么？' }).getByRole('button', { name: /只看已选/ })

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - link "跳到主要内容" [ref=e4] [cursor=pointer]:
      - /url: "#main-content"
    - navigation "主导航" [ref=e5]:
      - generic [ref=e8]:
        - generic [ref=e9]: Career Atlas
        - paragraph [ref=e10]: AI 时代前端能力地图
      - paragraph [ref=e11]: 我的工作空间
      - list [ref=e12]:
        - listitem [ref=e13]:
          - link [ref=e14] [cursor=pointer]:
            - /url: /
            - strong [ref=e19]: 学习台
        - listitem [ref=e20]:
          - link [ref=e21] [cursor=pointer]:
            - /url: /knowledge/map
            - strong [ref=e26]: 知识体系
        - listitem [ref=e27]:
          - link [ref=e28] [cursor=pointer]:
            - /url: /notes
            - strong [ref=e33]: 笔记中心
        - listitem [ref=e34]:
          - link [ref=e35] [cursor=pointer]:
            - /url: /plan
            - strong [ref=e40]: 核心路线
        - listitem [ref=e41]:
          - link [ref=e42] [cursor=pointer]:
            - /url: /jobs
            - strong [ref=e47]: 求职支线
      - generic [ref=e48]:
        - link [ref=e49] [cursor=pointer]:
          - /url: /settings
          - strong [ref=e54]: 设置与数据
        - generic "服务正常" [ref=e55]:
          - generic [ref=e57]:
            - strong [ref=e58]: 服务正常
            - generic [ref=e59]: 本地优先 · 自主学习
    - generic [ref=e60]:
      - banner [ref=e61]:
        - generic [ref=e62]:
          - button "收起侧栏" [expanded] [ref=e63] [cursor=pointer]
          - generic [ref=e66]: 工作空间
          - generic [aria-hidden] [ref=e67]: /
          - generic [ref=e68]: 学习台
        - button "快速查找，快捷键 Command 或 Control 加 K" [ref=e70] [cursor=pointer]:
          - generic [ref=e73]: 搜索知识点、页面…
          - generic [ref=e74]: ⌘ K
      - main [ref=e75]:
        - paragraph [ref=e76]: 学习台页面已打开
        - generic [ref=e79]:
          - generic [ref=e80]:
            - generic [ref=e81]:
              - paragraph [ref=e82]:
                - text: YOUR LEARNING SPACE
                - generic [ref=e83]: 11月15日星期日
              - heading "学习台" [level=1] [ref=e84]: 学习台.
              - generic [ref=e85]: 每一点积累，都在拓宽你的能力边界。按自己的节奏，继续就好。
            - generic [ref=e86]:
              - button "从知识体系选择" [ref=e87] [cursor=pointer]
              - button "记录今日学习" [ref=e90] [cursor=pointer]
          - region "我的下一步" [ref=e93]:
            - generic [ref=e94]:
              - heading "我的下一步" [level=2] [ref=e95]
              - link "查看学习路线" [ref=e96] [cursor=pointer]:
                - /url: /plan
            - generic [ref=e97]:
              - generic [ref=e98]:
                - text: 框架方向
                - combobox "框架方向" [ref=e99]:
                  - option "尚未选择"
                  - option "React" [selected]
                  - option "Vue"
                  - option "暂不进入框架"
              - button "保存方向" [ref=e100] [cursor=pointer]
            - paragraph [ref=e101]: 选择只影响推荐，不改变当前学习点、暂缓状态或阅读进度。
            - status [ref=e102]: 按当前偏好与学习记录推荐；可自由查阅其他资料。
            - link "补齐基础 · JS-01 →" [ref=e103] [cursor=pointer]:
              - /url: /knowledge/JS-01
            - group [ref=e104]:
              - generic "本次已审范围：共同基础与一个可选框架方向" [ref=e105] [cursor=pointer]
            - link "浏览全部资料" [ref=e106] [cursor=pointer]:
              - /url: /knowledge
          - generic [ref=e107]:
            - generic [ref=e108]:
              - generic [ref=e109]:
                - text: 从这里，开始下一步
                - generic [ref=e111]: FIRST CONCRETE STEP
              - heading "JS-01 · 执行上下文、作用域与闭包" [level=2] [ref=e112]
              - paragraph [ref=e113]:
                - strong [ref=e114]: 先完成：资料阅读与笔记
                - text: 读完列出的资料，记录核心概念、仍有疑问的地方，以及至少一个边界或反例。
              - generic [ref=e115]:
                - generic [ref=e118]: 预计 90 分钟
                - generic [ref=e119]: ·
                - generic [ref=e120]: 可随时暂停，下次继续
              - group [ref=e121]:
                - generic "查看任务输入与完成标准" [ref=e122] [cursor=pointer]:
                  - text: 查看任务输入与完成标准
                  - generic [aria-hidden] [ref=e123]: ＋
            - generic [ref=e124]:
              - button "开始这项具体任务 →" [ref=e125] [cursor=pointer]
              - button "自由选择" [ref=e126] [cursor=pointer]
          - generic [ref=e127]:
            - strong [ref=e128]: 这里没有泛化每日任务
            - generic [ref=e129]: 系统不规定你今天必须学什么；你决定学习完成，系统只根据挑战证据判定掌握程度。
            - button "查看学习路线" [ref=e130] [cursor=pointer]
          - generic [ref=e131]:
            - generic [ref=e132]:
              - generic [ref=e133]:
                - generic [ref=e134]:
                  - text: LEARNING OVERVIEW
                  - heading "按你的节奏积累" [level=2] [ref=e135]
                - generic [ref=e136]:
                  - strong [ref=e137]: 0%
                  - generic [ref=e138]: 学习完成度
              - progressbar "学习完成度" [ref=e139]
              - generic [ref=e140]:
                - generic [ref=e141]:
                  - strong [ref=e142]: "0"
                  - generic [ref=e143]: 已学完
                - generic [ref=e144]:
                  - strong [ref=e145]: "0"
                  - generic [ref=e146]: 学习中
                - generic [ref=e147]:
                  - strong [ref=e148]: "0"
                  - generic [ref=e149]: M3 已掌握
                - generic [ref=e150]:
                  - strong [ref=e151]: "0"
                  - generic [ref=e152]: M4 稳定掌握
              - paragraph [ref=e153]: 阅读完成由你确认；M0–M4 只表示系统拥有多少掌握证据。两者不会混在一起。
            - generic [ref=e154]:
              - generic [ref=e155]:
                - generic [ref=e156]: DAILY CHECK-IN
                - generic [ref=e157]: 等待你的记录
              - heading "今天学了什么，就记录什么" [level=2] [ref=e158]
              - paragraph [ref=e159]: 不和计划绑定，不产生缺勤、逾期或补打压力。时长、感受和总结都可选。
              - button "现在打卡" [ref=e160] [cursor=pointer]
          - generic [ref=e163]:
            - generic [ref=e164]:
              - generic [ref=e165]:
                - generic [ref=e166]:
                  - text: RECENTLY LEARNED
                  - heading "最近学完" [level=2] [ref=e167]
                - button "全部笔记 →" [ref=e168] [cursor=pointer]
              - paragraph [ref=e169]: 还没有标记为“已学完”的知识点。认真读完第一个并留下笔记，就会出现在这里。
            - generic [ref=e170]:
              - generic [ref=e171]:
                - generic [ref=e172]:
                  - text: LEARN LATER
                  - heading "稍后学习" [level=2] [ref=e173]
                - strong [ref=e174]: "0"
              - paragraph [ref=e175]: 暂时没有搁置的知识点。以后不需要的分支可以放心放到这里。
    - button "打开 Atlas AI 助手" [ref=e176] [cursor=pointer]:
      - generic [aria-hidden] [ref=e177]: ✦
      - generic [ref=e178]:
        - strong [ref=e179]: Atlas AI
        - generic [ref=e180]: 总结 · 解释 · 查资料
  - dialog [ref=e182]:
    - banner [ref=e183]:
      - generic [ref=e184]: ✓
      - generic [ref=e185]:
        - paragraph [ref=e186]: CHECK-IN · 2026-11-15
        - heading "今天实际学了什么？" [level=2] [ref=e187]
        - generic [ref=e188]: 可以选择多个知识点。系统只记录事实，不检查计划。
      - button "关闭" [ref=e189] [cursor=pointer]: ×
    - generic [ref=e191]:
      - generic [ref=e192]:
        - text: 选择今天学过的知识点
        - searchbox "搜索打卡知识点" [active] [ref=e193]
      - generic [ref=e194]:
        - generic [ref=e195]: 223 个匹配
        - button "只看已选（1）" [ref=e196] [cursor=pointer]
      - group "可选知识点" [ref=e197]:
        - button "JS-01 执行上下文、作用域与闭包" [ref=e198] [cursor=pointer]:
          - code [ref=e199]: JS-01
          - generic [ref=e200]: 执行上下文、作用域与闭包
        - 'button "JS-02 原型、对象模型与 `this`" [ref=e201] [cursor=pointer]':
          - code [ref=e202]: JS-02
          - generic [ref=e203]: "原型、对象模型与 `this`"
        - button "JS-03 类型、相等、拷贝与不可变更新" [ref=e204] [cursor=pointer]:
          - code [ref=e205]: JS-03
          - generic [ref=e206]: 类型、相等、拷贝与不可变更新
        - button "JS-07 迭代协议、元编程与资源生命周期" [ref=e207] [cursor=pointer]:
          - code [ref=e208]: JS-07
          - generic [ref=e209]: 迭代协议、元编程与资源生命周期
        - button "CS-01 复杂度、数据规模与工程成本判断" [ref=e210] [cursor=pointer]:
          - code [ref=e211]: CS-01
          - generic [ref=e212]: 复杂度、数据规模与工程成本判断
        - button "CS-02 常用数据结构、算法模式与正确性" [ref=e213] [cursor=pointer]:
          - code [ref=e214]: CS-02
          - generic [ref=e215]: 常用数据结构、算法模式与正确性
        - button "CS-03 前端大数据、Worker 并行、增量计算与内存边界" [ref=e216] [cursor=pointer]:
          - code [ref=e217]: CS-03
          - generic [ref=e218]: 前端大数据、Worker 并行、增量计算与内存边界
        - button "JS-04 异步、Promise 与事件循环" [ref=e219] [cursor=pointer]:
          - code [ref=e220]: JS-04
          - generic [ref=e221]: 异步、Promise 与事件循环
        - button "JS-05 Promise 错误处理与异步控制流" [ref=e222] [cursor=pointer]:
          - code [ref=e223]: JS-05
          - generic [ref=e224]: Promise 错误处理与异步控制流
        - button "JS-06 ES Modules 与模块边界" [ref=e225] [cursor=pointer]:
          - code [ref=e226]: JS-06
          - generic [ref=e227]: ES Modules 与模块边界
        - button "TS-01 类型系统、结构化类型与严格模式" [ref=e228] [cursor=pointer]:
          - code [ref=e229]: TS-01
          - generic [ref=e230]: 类型系统、结构化类型与严格模式
        - 'button "TS-02 联合类型、收窄、`never` 与穷尽检查" [ref=e231] [cursor=pointer]':
          - code [ref=e232]: TS-02
          - generic [ref=e233]: "联合类型、收窄、`never` 与穷尽检查"
        - 'button "TS-03 泛型、约束、`keyof` 与索引访问" [ref=e234] [cursor=pointer]':
          - code [ref=e235]: TS-03
          - generic [ref=e236]: "泛型、约束、`keyof` 与索引访问"
        - button "WEB-01 HTML 语义、表单与可访问性基础" [ref=e237] [cursor=pointer]:
          - code [ref=e238]: WEB-01
          - generic [ref=e239]: HTML 语义、表单与可访问性基础
        - button "REACT-01 渲染、组件纯度与 state snapshot" [ref=e240] [cursor=pointer]:
          - code [ref=e241]: REACT-01
          - generic [ref=e242]: 渲染、组件纯度与 state snapshot
        - button "VUE-01 Vite 脚手架、SFC 与项目结构" [ref=e243] [cursor=pointer]:
          - code [ref=e244]: VUE-01
          - generic [ref=e245]: Vite 脚手架、SFC 与项目结构
        - 'button "VUE-02 `ref`、`reactive`、`computed` 与响应式边界" [ref=e246] [cursor=pointer]':
          - code [ref=e247]: VUE-02
          - generic [ref=e248]: "`ref`、`reactive`、`computed` 与响应式边界"
        - button "REACT-02 组件边界、数据流与组合" [ref=e249] [cursor=pointer]:
          - code [ref=e250]: REACT-02
          - generic [ref=e251]: 组件边界、数据流与组合
        - button "VUE-03 模板语法、指令、事件与表单" [ref=e252] [cursor=pointer]:
          - code [ref=e253]: VUE-03
          - generic [ref=e254]: 模板语法、指令、事件与表单
        - 'button "VUE-04 类型化组件契约、Slots、`v-model` 与 Teleport" [ref=e255] [cursor=pointer]':
          - code [ref=e256]: VUE-04
          - generic [ref=e257]: "类型化组件契约、Slots、`v-model` 与 Teleport"
        - button "REACT-03 状态建模、派生状态与受控模式" [ref=e258] [cursor=pointer]:
          - code [ref=e259]: REACT-03
          - generic [ref=e260]: 状态建模、派生状态与受控模式
        - button "REACT-04 Effect、外部同步与清理" [ref=e261] [cursor=pointer]:
          - code [ref=e262]: REACT-04
          - generic [ref=e263]: Effect、外部同步与清理
        - button "VUE-05 生命周期、副作用清理与异步恢复" [ref=e264] [cursor=pointer]:
          - code [ref=e265]: VUE-05
          - generic [ref=e266]: 生命周期、副作用清理与异步恢复
        - button "REACT-05 Hooks 规则与自定义 Hook" [ref=e267] [cursor=pointer]:
          - code [ref=e268]: REACT-05
          - generic [ref=e269]: Hooks 规则与自定义 Hook
        - button "VUE-06 Composable、依赖注入与逻辑复用" [ref=e270] [cursor=pointer]:
          - code [ref=e271]: VUE-06
          - generic [ref=e272]: Composable、依赖注入与逻辑复用
        - button "REACT-06 Reducer、Context 与跨组件状态" [ref=e273] [cursor=pointer]:
          - code [ref=e274]: REACT-06
          - generic [ref=e275]: Reducer、Context 与跨组件状态
        - button "VUE-08 Pinia 与状态分层" [ref=e276] [cursor=pointer]:
          - code [ref=e277]: VUE-08
          - generic [ref=e278]: Pinia 与状态分层
        - button "REACT-08 错误边界、异步 UI 与可恢复体验" [ref=e279] [cursor=pointer]:
          - code [ref=e280]: REACT-08
          - generic [ref=e281]: 错误边界、异步 UI 与可恢复体验
        - button "REACT-10 React 路由、数据路由与框架模式" [ref=e282] [cursor=pointer]:
          - code [ref=e283]: REACT-10
          - generic [ref=e284]: React 路由、数据路由与框架模式
        - button "VUE-07 Vue Router、类型化/文件路由与导航边界" [ref=e285] [cursor=pointer]:
          - code [ref=e286]: VUE-07
          - generic [ref=e287]: Vue Router、类型化/文件路由与导航边界
        - button "REACT-07 性能测量、memo 与大列表" [ref=e288] [cursor=pointer]:
          - code [ref=e289]: REACT-07
          - generic [ref=e290]: 性能测量、memo 与大列表
        - button "VUE-10 组件测试、性能与生产构建" [ref=e291] [cursor=pointer]:
          - code [ref=e292]: VUE-10
          - generic [ref=e293]: 组件测试、性能与生产构建
        - button "REACT-09 React Compiler、服务端组件边界与安全升级" [ref=e294] [cursor=pointer]:
          - code [ref=e295]: REACT-09
          - generic [ref=e296]: React Compiler、服务端组件边界与安全升级
        - button "VUE-11 Nuxt 全栈渲染、数据获取与性能" [ref=e297] [cursor=pointer]:
          - code [ref=e298]: VUE-11
          - generic [ref=e299]: Nuxt 全栈渲染、数据获取与性能
        - button "GIT-01 Git 对象模型、暂存区与安全恢复" [ref=e300] [cursor=pointer]:
          - code [ref=e301]: GIT-01
          - generic [ref=e302]: Git 对象模型、暂存区与安全恢复
        - button "GIT-02 分支、合并、变基与冲突处理" [ref=e303] [cursor=pointer]:
          - code [ref=e304]: GIT-02
          - generic [ref=e305]: 分支、合并、变基与冲突处理
        - button "GIT-03 协作工作流、提交治理与 AI Agent 隔离" [ref=e306] [cursor=pointer]:
          - code [ref=e307]: GIT-03
          - generic [ref=e308]: 协作工作流、提交治理与 AI Agent 隔离
        - button "DEBUG-01 浏览器、异步与生产环境系统化调试" [ref=e309] [cursor=pointer]:
          - code [ref=e310]: DEBUG-01
          - generic [ref=e311]: 浏览器、异步与生产环境系统化调试
        - button "ENG-01 模块图、构建流程与产物分析" [ref=e312] [cursor=pointer]:
          - code [ref=e313]: ENG-01
          - generic [ref=e314]: 模块图、构建流程与产物分析
        - button "ENG-02 构建工具的开发模型、生产模型与环境差异" [ref=e315] [cursor=pointer]:
          - code [ref=e316]: ENG-02
          - generic [ref=e317]: 构建工具的开发模型、生产模型与环境差异
        - button "ENG-03 包管理、lockfile 与 workspace" [ref=e318] [cursor=pointer]:
          - code [ref=e319]: ENG-03
          - generic [ref=e320]: 包管理、lockfile 与 workspace
        - button "ENG-05 lint、format、typecheck 与提交门禁" [ref=e321] [cursor=pointer]:
          - code [ref=e322]: ENG-05
          - generic [ref=e323]: lint、format、typecheck 与提交门禁
        - button "TEST-01 单元测试、测试替身与覆盖边界" [ref=e324] [cursor=pointer]:
          - code [ref=e325]: TEST-01
          - generic [ref=e326]: 单元测试、测试替身与覆盖边界
        - button "TEST-02 React 组件测试" [ref=e327] [cursor=pointer]:
          - code [ref=e328]: TEST-02
          - generic [ref=e329]: React 组件测试
        - button "TEST-03 E2E、视觉回归、关键路径与测试隔离" [ref=e330] [cursor=pointer]:
          - code [ref=e331]: TEST-03
          - generic [ref=e332]: E2E、视觉回归、关键路径与测试隔离
        - button "CAREER-01 项目复盘与 STAR/问题-方案-结果表达" [ref=e333] [cursor=pointer]:
          - code [ref=e334]: CAREER-01
          - generic [ref=e335]: 项目复盘与 STAR/问题-方案-结果表达
        - button "CAREER-02 架构图与系统边界" [ref=e336] [cursor=pointer]:
          - code [ref=e337]: CAREER-02
          - generic [ref=e338]: 架构图与系统边界
        - button "CAREER-04 故障复盘与问题定位表达" [ref=e339] [cursor=pointer]:
          - code [ref=e340]: CAREER-04
          - generic [ref=e341]: 故障复盘与问题定位表达
        - button "CAREER-05 代码评审、沟通与技术推动" [ref=e342] [cursor=pointer]:
          - code [ref=e343]: CAREER-05
          - generic [ref=e344]: 代码评审、沟通与技术推动
        - button "WEB-02 CSS 布局、层叠与响应式" [ref=e345] [cursor=pointer]:
          - code [ref=e346]: WEB-02
          - generic [ref=e347]: CSS 布局、层叠与响应式
        - button "WEB-03 现代 CSS 架构、容器查询与渐进增强" [ref=e348] [cursor=pointer]:
          - code [ref=e349]: WEB-03
          - generic [ref=e350]: 现代 CSS 架构、容器查询与渐进增强
        - button "A11Y-01 WCAG 2.2、无障碍测试与工程治理" [ref=e351] [cursor=pointer]:
          - code [ref=e352]: A11Y-01
          - generic [ref=e353]: WCAG 2.2、无障碍测试与工程治理
        - button "BROWSER-01 渲染流水线、DOM 事件与存储" [ref=e354] [cursor=pointer]:
          - code [ref=e355]: BROWSER-01
          - generic [ref=e356]: 渲染流水线、DOM 事件与存储
        - button "BROWSER-02 观察器、调度、页面生命周期与多标签页协同" [ref=e357] [cursor=pointer]:
          - code [ref=e358]: BROWSER-02
          - generic [ref=e359]: 观察器、调度、页面生命周期与多标签页协同
        - button "WEB-04 原生分层 UI、视图过渡与渐进增强" [ref=e360] [cursor=pointer]:
          - code [ref=e361]: WEB-04
          - generic [ref=e362]: 原生分层 UI、视图过渡与渐进增强
        - button "WEB-05 Web Components、Shadow DOM 与跨框架互操作" [ref=e363] [cursor=pointer]:
          - code [ref=e364]: WEB-05
          - generic [ref=e365]: Web Components、Shadow DOM 与跨框架互操作
        - button "NET-01 浏览器网络协议、Fetch 与请求可靠性" [ref=e366] [cursor=pointer]:
          - code [ref=e367]: NET-01
          - generic [ref=e368]: 浏览器网络协议、Fetch 与请求可靠性
        - button "SEC-01 XSS、CSRF 与前端输入输出信任边界" [ref=e369] [cursor=pointer]:
          - code [ref=e370]: SEC-01
          - generic [ref=e371]: XSS、CSRF 与前端输入输出信任边界
        - button "SEC-02 CSP、Trusted Types 与安全违规报告" [ref=e372] [cursor=pointer]:
          - code [ref=e373]: SEC-02
          - generic [ref=e374]: CSP、Trusted Types 与安全违规报告
        - button "SEC-04 跨源隔离、嵌入式上下文与权限策略" [ref=e375] [cursor=pointer]:
          - code [ref=e376]: SEC-04
          - generic [ref=e377]: 跨源隔离、嵌入式上下文与权限策略
        - button "SEC-03 WebAuthn、Passkey 与安全认证体验" [ref=e378] [cursor=pointer]:
          - code [ref=e379]: SEC-03
          - generic [ref=e380]: WebAuthn、Passkey 与安全认证体验
        - button "SEC-05 Web Crypto、密钥生命周期与客户端密码学边界" [ref=e381] [cursor=pointer]:
          - code [ref=e382]: SEC-05
          - generic [ref=e383]: Web Crypto、密钥生命周期与客户端密码学边界
        - button "TS-04 映射类型、工具类型与模板字面量类型" [ref=e384] [cursor=pointer]:
          - code [ref=e385]: TS-04
          - generic [ref=e386]: 映射类型、工具类型与模板字面量类型
        - 'button "TS-05 条件类型、`infer` 与分布式行为" [ref=e387] [cursor=pointer]':
          - code [ref=e388]: TS-05
          - generic [ref=e389]: "条件类型、`infer` 与分布式行为"
        - button "TS-06 函数、重载、协变逆变与组件 API" [ref=e390] [cursor=pointer]:
          - code [ref=e391]: TS-06
          - generic [ref=e392]: 函数、重载、协变逆变与组件 API
        - button "TS-07 接口契约、运行时校验与错误模型" [ref=e393] [cursor=pointer]:
          - code [ref=e394]: TS-07
          - generic [ref=e395]: 接口契约、运行时校验与错误模型
        - button "TS-08 业务状态与权限类型建模" [ref=e396] [cursor=pointer]:
          - code [ref=e397]: TS-08
          - generic [ref=e398]: 业务状态与权限类型建模
        - button "TS-09 TypeScript 版本迁移、模块语义与弃用治理" [ref=e399] [cursor=pointer]:
          - code [ref=e400]: TS-09
          - generic [ref=e401]: TypeScript 版本迁移、模块语义与弃用治理
        - button "IDENTITY-01 Cookie、Session、Token 与浏览器身份边界" [ref=e402] [cursor=pointer]:
          - code [ref=e403]: IDENTITY-01
          - generic [ref=e404]: Cookie、Session、Token 与浏览器身份边界
        - button "IDENTITY-02 OAuth 安全最佳实践、OIDC 与 PKCE" [ref=e405] [cursor=pointer]:
          - code [ref=e406]: IDENTITY-02
          - generic [ref=e407]: OAuth 安全最佳实践、OIDC 与 PKCE
        - button "PRIVACY-01 数据最小化、同意、留存与用户权利" [ref=e408] [cursor=pointer]:
          - code [ref=e409]: PRIVACY-01
          - generic [ref=e410]: 数据最小化、同意、留存与用户权利
        - button "PRIVACY-02 跨区域合规、数据分级与前端工程控制" [ref=e411] [cursor=pointer]:
          - code [ref=e412]: PRIVACY-02
          - generic [ref=e413]: 跨区域合规、数据分级与前端工程控制
        - button "NODE-01 Node 运行时、事件循环与非阻塞 I/O" [ref=e414] [cursor=pointer]:
          - code [ref=e415]: NODE-01
          - generic [ref=e416]: Node 运行时、事件循环与非阻塞 I/O
        - button "NODE-02 文件、Stream、Buffer 与错误处理" [ref=e417] [cursor=pointer]:
          - code [ref=e418]: NODE-02
          - generic [ref=e419]: 文件、Stream、Buffer 与错误处理
        - button "NODE-04 Node.js HTTP 服务与 BFF 生产工程" [ref=e420] [cursor=pointer]:
          - code [ref=e421]: NODE-04
          - generic [ref=e422]: Node.js HTTP 服务与 BFF 生产工程
        - button "AIDEV-01 AI 协作规格上下文与代理执行闭环" [ref=e423] [cursor=pointer]:
          - code [ref=e424]: AIDEV-01
          - generic [ref=e425]: AI 协作规格上下文与代理执行闭环
        - button "AIDEV-02 Context Engineering 与仓库指令" [ref=e426] [cursor=pointer]:
          - code [ref=e427]: AIDEV-02
          - generic [ref=e428]: Context Engineering 与仓库指令
        - button "AIDEV-03 AI 生成代码的验证金字塔" [ref=e429] [cursor=pointer]:
          - code [ref=e430]: AIDEV-03
          - generic [ref=e431]: AI 生成代码的验证金字塔
        - button "BIZ-01 业务对象、关系与统一语言" [ref=e432] [cursor=pointer]:
          - code [ref=e433]: BIZ-01
          - generic [ref=e434]: 业务对象、关系与统一语言
        - button "BIZ-02 状态机与业务不变量" [ref=e435] [cursor=pointer]:
          - code [ref=e436]: BIZ-02
          - generic [ref=e437]: 状态机与业务不变量
        - button "BIZ-03 RBAC、ABAC 与数据权限" [ref=e438] [cursor=pointer]:
          - code [ref=e439]: BIZ-03
          - generic [ref=e440]: RBAC、ABAC 与数据权限
        - button "BIZ-04 API 契约、DTO 与前端模型" [ref=e441] [cursor=pointer]:
          - code [ref=e442]: BIZ-04
          - generic [ref=e443]: API 契约、DTO 与前端模型
        - button "BIZ-05 表单、表格、详情的状态一致性" [ref=e444] [cursor=pointer]:
          - code [ref=e445]: BIZ-05
          - generic [ref=e446]: 表单、表格、详情的状态一致性
        - button "BIZ-06 异步任务、导入导出与进度" [ref=e447] [cursor=pointer]:
          - code [ref=e448]: BIZ-06
          - generic [ref=e449]: 异步任务、导入导出与进度
        - button "BIZ-07 异常边界、幂等与一致性" [ref=e450] [cursor=pointer]:
          - code [ref=e451]: BIZ-07
          - generic [ref=e452]: 异常边界、幂等与一致性
        - button "BIZ-08 需求到验收的可追踪性" [ref=e453] [cursor=pointer]:
          - code [ref=e454]: BIZ-08
          - generic [ref=e455]: 需求到验收的可追踪性
        - button "TEST-04 API 契约兼容与消费者驱动契约测试" [ref=e456] [cursor=pointer]:
          - code [ref=e457]: TEST-04
          - generic [ref=e458]: API 契约兼容与消费者驱动契约测试
        - button "RENDER-01 SPA、SSR、SSG、ISR 与混合渲染决策" [ref=e459] [cursor=pointer]:
          - code [ref=e460]: RENDER-01
          - generic [ref=e461]: SPA、SSR、SSG、ISR 与混合渲染决策
        - button "RENDER-02 流式 SSR、Hydration 与 Islands 架构" [ref=e462] [cursor=pointer]:
          - code [ref=e463]: RENDER-02
          - generic [ref=e464]: 流式 SSR、Hydration 与 Islands 架构
        - button "DATA-01 Server State、缓存键、失效与请求去重" [ref=e465] [cursor=pointer]:
          - code [ref=e466]: DATA-01
          - generic [ref=e467]: Server State、缓存键、失效与请求去重
        - button "DATA-02 乐观更新、并发冲突与离线突变" [ref=e468] [cursor=pointer]:
          - code [ref=e469]: DATA-02
          - generic [ref=e470]: 乐观更新、并发冲突与离线突变
        - button "REALTIME-01 SSE、WebSocket、WebTransport 与实时消息可靠性" [ref=e471] [cursor=pointer]:
          - code [ref=e472]: REALTIME-01
          - generic [ref=e473]: SSE、WebSocket、WebTransport 与实时消息可靠性
        - button "COMP-01 组件职责、API 与组合设计" [ref=e474] [cursor=pointer]:
          - code [ref=e475]: COMP-01
          - generic [ref=e476]: 组件职责、API 与组合设计
        - button "COMP-02 受控/非受控、状态同步与命令式能力" [ref=e477] [cursor=pointer]:
          - code [ref=e478]: COMP-02
          - generic [ref=e479]: 受控/非受控、状态同步与命令式能力
        - button "UX-01 交互设计、状态体验与可用性验证" [ref=e480] [cursor=pointer]:
          - code [ref=e481]: UX-01
          - generic [ref=e482]: 交互设计、状态体验与可用性验证
        - button "ENG-08 软件供应链、SBOM 与制品可信" [ref=e483] [cursor=pointer]:
          - code [ref=e484]: ENG-08
          - generic [ref=e485]: 软件供应链、SBOM 与制品可信
        - button "LINUX-01 Linux 文件系统、权限与常用命令" [ref=e486] [cursor=pointer]:
          - code [ref=e487]: LINUX-01
          - generic [ref=e488]: Linux 文件系统、权限与常用命令
        - button "LINUX-02 进程、端口、日志与网络诊断" [ref=e489] [cursor=pointer]:
          - code [ref=e490]: LINUX-02
          - generic [ref=e491]: 进程、端口、日志与网络诊断
        - button "LINUX-03 Shell 脚本、环境变量与自动化任务" [ref=e492] [cursor=pointer]:
          - code [ref=e493]: LINUX-03
          - generic [ref=e494]: Shell 脚本、环境变量与自动化任务
        - button "LINUX-04 服务器安全、SSH、用户与基础防护" [ref=e495] [cursor=pointer]:
          - code [ref=e496]: LINUX-04
          - generic [ref=e497]: 服务器安全、SSH、用户与基础防护
        - button "DOCKER-01 镜像、容器、Dockerfile 与构建缓存" [ref=e498] [cursor=pointer]:
          - code [ref=e499]: DOCKER-01
          - generic [ref=e500]: 镜像、容器、Dockerfile 与构建缓存
        - button "DOCKER-02 Docker Compose、网络、数据卷与环境隔离" [ref=e501] [cursor=pointer]:
          - code [ref=e502]: DOCKER-02
          - generic [ref=e503]: Docker Compose、网络、数据卷与环境隔离
        - button "ENG-06 CI/CD、制品晋级、发布与回滚" [ref=e504] [cursor=pointer]:
          - code [ref=e505]: ENG-06
          - generic [ref=e506]: CI/CD、制品晋级、发布与回滚
        - button "DEPLOY-01 Nginx、静态资源、反向代理、HTTPS 与 CDN 缓存" [ref=e507] [cursor=pointer]:
          - code [ref=e508]: DEPLOY-01
          - generic [ref=e509]: Nginx、静态资源、反向代理、HTTPS 与 CDN 缓存
        - button "OBS-01 前端可观测性、SLO、告警与隐私边界" [ref=e510] [cursor=pointer]:
          - code [ref=e511]: OBS-01
          - generic [ref=e512]: 前端可观测性、SLO、告警与隐私边界
        - button "PERF-01 Core Web Vitals 与性能预算" [ref=e513] [cursor=pointer]:
          - code [ref=e514]: PERF-01
          - generic [ref=e515]: Core Web Vitals 与性能预算
        - button "PERF-02 Network、资源加载与缓存优化" [ref=e516] [cursor=pointer]:
          - code [ref=e517]: PERF-02
          - generic [ref=e518]: Network、资源加载与缓存优化
        - button "PERF-03 主线程、渲染、长任务与交互响应" [ref=e519] [cursor=pointer]:
          - code [ref=e520]: PERF-03
          - generic [ref=e521]: 主线程、渲染、长任务与交互响应
        - button "PERF-04 内存、监听器与资源泄漏" [ref=e522] [cursor=pointer]:
          - code [ref=e523]: PERF-04
          - generic [ref=e524]: 内存、监听器与资源泄漏
        - button "H5-01 viewport、响应式、安全区与横竖屏" [ref=e525] [cursor=pointer]:
          - code [ref=e526]: H5-01
          - generic [ref=e527]: viewport、响应式、安全区与横竖屏
        - button "H5-02 滚动、软键盘、触控与手势冲突" [ref=e528] [cursor=pointer]:
          - code [ref=e529]: H5-02
          - generic [ref=e530]: 滚动、软键盘、触控与手势冲突
        - button "MCP-01 MCP Server、Tools/Resources/Prompts 与 Schema 核心模型" [ref=e531] [cursor=pointer]:
          - code [ref=e532]: MCP-01
          - generic [ref=e533]: MCP Server、Tools/Resources/Prompts 与 Schema 核心模型
        - button "AIPROD-01 AI 任务定义、模型选择与价值验证" [ref=e534] [cursor=pointer]:
          - code [ref=e535]: AIPROD-01
          - generic [ref=e536]: AI 任务定义、模型选择与价值验证
        - button "AIPROD-02 高风险自动化分级、失败 UX 与 Human-in-the-loop" [ref=e537] [cursor=pointer]:
          - code [ref=e538]: AIPROD-02
          - generic [ref=e539]: 高风险自动化分级、失败 UX 与 Human-in-the-loop
        - button "AISAFE-01 输出校验、内容安全与 Guardrails" [ref=e540] [cursor=pointer]:
          - code [ref=e541]: AISAFE-01
          - generic [ref=e542]: 输出校验、内容安全与 Guardrails
        - button "AISAFE-02 AI 威胁建模、红队与滥用防护" [ref=e543] [cursor=pointer]:
          - code [ref=e544]: AISAFE-02
          - generic [ref=e545]: AI 威胁建模、红队与滥用防护
        - button "AIGOV-01 数据来源、模型变更、审计与责任治理" [ref=e546] [cursor=pointer]:
          - code [ref=e547]: AIGOV-01
          - generic [ref=e548]: 数据来源、模型变更、审计与责任治理
        - button "AIAPP-01 AI 产品运行时的模型接口、指令与上下文边界" [ref=e549] [cursor=pointer]:
          - code [ref=e550]: AIAPP-01
          - generic [ref=e551]: AI 产品运行时的模型接口、指令与上下文边界
        - button "AIAPP-02 流式响应、SSE 与增量渲染" [ref=e552] [cursor=pointer]:
          - code [ref=e553]: AIAPP-02
          - generic [ref=e554]: 流式响应、SSE 与增量渲染
        - button "AIAPP-03 结构化输出与 Schema 校验" [ref=e555] [cursor=pointer]:
          - code [ref=e556]: AIAPP-03
          - generic [ref=e557]: 结构化输出与 Schema 校验
        - button "AIAPP-04 Tool Calling 与前端工具结果呈现" [ref=e558] [cursor=pointer]:
          - code [ref=e559]: AIAPP-04
          - generic [ref=e560]: Tool Calling 与前端工具结果呈现
        - button "AIAPP-05 Generative UI 视图模型、宿主与安全边界" [ref=e561] [cursor=pointer]:
          - code [ref=e562]: AIAPP-05
          - generic [ref=e563]: Generative UI 视图模型、宿主与安全边界
        - button "AIUI-01 Agent UI 协议与 MCP Apps 互操作实现" [ref=e564] [cursor=pointer]:
          - code [ref=e565]: AIUI-01
          - generic [ref=e566]: Agent UI 协议与 MCP Apps 互操作实现
        - button "AIAPP-06 RAG、引用与来源可信度" [ref=e567] [cursor=pointer]:
          - code [ref=e568]: AIAPP-06
          - generic [ref=e569]: RAG、引用与来源可信度
        - button "AIAPP-07 Prompt Injection 与不可信内容边界" [ref=e570] [cursor=pointer]:
          - code [ref=e571]: AIAPP-07
          - generic [ref=e572]: Prompt Injection 与不可信内容边界
        - button "AIAPP-08 模型评估、生产可观测与回归门禁" [ref=e573] [cursor=pointer]:
          - code [ref=e574]: AIAPP-08
          - generic [ref=e575]: 模型评估、生产可观测与回归门禁
        - button "AIAPP-09 成本、配额、缓存与可靠性" [ref=e576] [cursor=pointer]:
          - code [ref=e577]: AIAPP-09
          - generic [ref=e578]: 成本、配额、缓存与可靠性
        - button "AIAPP-10 通用 AI 交互、信任与可恢复体验" [ref=e579] [cursor=pointer]:
          - code [ref=e580]: AIAPP-10
          - generic [ref=e581]: 通用 AI 交互、信任与可恢复体验
        - button "AIAPP-12 会话状态、上下文组装、压缩与持久化隐私" [ref=e582] [cursor=pointer]:
          - code [ref=e583]: AIAPP-12
          - generic [ref=e584]: 会话状态、上下文组装、压缩与持久化隐私
        - button "AIAPP-13 长期记忆、个性化与可遗忘治理" [ref=e585] [cursor=pointer]:
          - code [ref=e586]: AIAPP-13
          - generic [ref=e587]: 长期记忆、个性化与可遗忘治理
        - button "AGENT-01 Agent Loop、计划与停止条件" [ref=e588] [cursor=pointer]:
          - code [ref=e589]: AGENT-01
          - generic [ref=e590]: Agent Loop、计划与停止条件
        - button "AGENT-03 MCP 传输、显式状态与跨版本兼容" [ref=e591] [cursor=pointer]:
          - code [ref=e592]: AGENT-03
          - generic [ref=e593]: MCP 传输、显式状态与跨版本兼容
        - button "AGENT-04 MCP Client、服务发现与版本兼容" [ref=e594] [cursor=pointer]:
          - code [ref=e595]: AGENT-04
          - generic [ref=e596]: MCP Client、服务发现与版本兼容
        - button "AGENT-05 Human-in-the-loop 与高风险审批" [ref=e597] [cursor=pointer]:
          - code [ref=e598]: AGENT-05
          - generic [ref=e599]: Human-in-the-loop 与高风险审批
        - button "AGENT-06 Tasks 扩展、长任务、恢复与幂等" [ref=e600] [cursor=pointer]:
          - code [ref=e601]: AGENT-06
          - generic [ref=e602]: Tasks 扩展、长任务、恢复与幂等
        - button "AGENT-07 多 Agent 协作与上下文隔离" [ref=e603] [cursor=pointer]:
          - code [ref=e604]: AGENT-07
          - generic [ref=e605]: 多 Agent 协作与上下文隔离
        - button "AGENT-08 工具描述、Schema 与可发现性" [ref=e606] [cursor=pointer]:
          - code [ref=e607]: AGENT-08
          - generic [ref=e608]: 工具描述、Schema 与可发现性
        - button "AGENT-09 Agent 可观测性与回放" [ref=e609] [cursor=pointer]:
          - code [ref=e610]: AGENT-09
          - generic [ref=e611]: Agent 可观测性与回放
        - button "AGENT-10 Agent 身份、授权、工具权限与运行隔离" [ref=e612] [cursor=pointer]:
          - code [ref=e613]: AGENT-10
          - generic [ref=e614]: Agent 身份、授权、工具权限与运行隔离
        - button "AIDEV-04 AI Code Review 与风险分级" [ref=e615] [cursor=pointer]:
          - code [ref=e616]: AIDEV-04
          - generic [ref=e617]: AI Code Review 与风险分级
        - button "AIDEV-07 AI 建议依赖与生成代码来源安全" [ref=e618] [cursor=pointer]:
          - code [ref=e619]: AIDEV-07
          - generic [ref=e620]: AI 建议依赖与生成代码来源安全
        - button "AIDEV-10 AI 研发工具准入、数据与团队治理" [ref=e621] [cursor=pointer]:
          - code [ref=e622]: AIDEV-10
          - generic [ref=e623]: AI 研发工具准入、数据与团队治理
        - button "COMPAT-01 Baseline、渐进增强与跨浏览器真机测试" [ref=e624] [cursor=pointer]:
          - code [ref=e625]: COMPAT-01
          - generic [ref=e626]: Baseline、渐进增强与跨浏览器真机测试
        - button "ARCH-01 质量属性、约束与架构权衡" [ref=e627] [cursor=pointer]:
          - code [ref=e628]: ARCH-01
          - generic [ref=e629]: 质量属性、约束与架构权衡
        - button "ARCH-02 技术方案、ADR 与架构评审" [ref=e630] [cursor=pointer]:
          - code [ref=e631]: ARCH-02
          - generic [ref=e632]: 技术方案、ADR 与架构评审
        - button "ARCH-03 渐进迁移、Strangler 与兼容层" [ref=e633] [cursor=pointer]:
          - code [ref=e634]: ARCH-03
          - generic [ref=e635]: 渐进迁移、Strangler 与兼容层
        - button "ARCH-04 技术债识别、优先级与偿还治理" [ref=e636] [cursor=pointer]:
          - code [ref=e637]: ARCH-04
          - generic [ref=e638]: 技术债识别、优先级与偿还治理
        - button "ARCH-05 框架选型、生命周期与跨框架迁移" [ref=e639] [cursor=pointer]:
          - code [ref=e640]: ARCH-05
          - generic [ref=e641]: 框架选型、生命周期与跨框架迁移
        - button "LEAD-01 技术路线、跨团队推动与影响力" [ref=e642] [cursor=pointer]:
          - code [ref=e643]: LEAD-01
          - generic [ref=e644]: 技术路线、跨团队推动与影响力
        - button "AGENT-11 A2A 协议、Agent Card 与跨组织协作" [ref=e645] [cursor=pointer]:
          - code [ref=e646]: AGENT-11
          - generic [ref=e647]: A2A 协议、Agent Card 与跨组织协作
        - button "AIAPP-11 实时多模态与语音 Agent 交互编排" [ref=e648] [cursor=pointer]:
          - code [ref=e649]: AIAPP-11
          - generic [ref=e650]: 实时多模态与语音 Agent 交互编排
        - button "AIDEV-06 AI 生成代码的 AST 确定性约束与改写" [ref=e651] [cursor=pointer]:
          - code [ref=e652]: AIDEV-06
          - generic [ref=e653]: AI 生成代码的 AST 确定性约束与改写
        - button "AIDEV-08 AI 研发指标与真实提效评估" [ref=e654] [cursor=pointer]:
          - code [ref=e655]: AIDEV-08
          - generic [ref=e656]: AI 研发指标与真实提效评估
        - button "AIDEV-09 设计稿到代码与视觉验收" [ref=e657] [cursor=pointer]:
          - code [ref=e658]: AIDEV-09
          - generic [ref=e659]: 设计稿到代码与视觉验收
        - button "AIDEV-11 AI 驱动的浏览器运行时调试与证据闭环" [ref=e660] [cursor=pointer]:
          - code [ref=e661]: AIDEV-11
          - generic [ref=e662]: AI 驱动的浏览器运行时调试与证据闭环
        - button "AIMEDIA-01 生成式图像、视频与音频制品工作流" [ref=e663] [cursor=pointer]:
          - code [ref=e664]: AIMEDIA-01
          - generic [ref=e665]: 生成式图像、视频与音频制品工作流
        - button "ANALYTICS-01 埋点模型、数据质量与可观测产品指标" [ref=e666] [cursor=pointer]:
          - code [ref=e667]: ANALYTICS-01
          - generic [ref=e668]: 埋点模型、数据质量与可观测产品指标
        - button "ANTD-01 Form 数据流、联动与校验" [ref=e669] [cursor=pointer]:
          - code [ref=e670]: ANTD-01
          - generic [ref=e671]: Form 数据流、联动与校验
        - button "ANTD-02 Table/ProTable 查询、分页与导出" [ref=e672] [cursor=pointer]:
          - code [ref=e673]: ANTD-02
          - generic [ref=e674]: Table/ProTable 查询、分页与导出
        - button "ANTD-03 Modal、Drawer、详情与反馈" [ref=e675] [cursor=pointer]:
          - code [ref=e676]: ANTD-03
          - generic [ref=e677]: Modal、Drawer、详情与反馈
        - button "ANTD-04 Ant Design Mobile 与移动业务组件" [ref=e678] [cursor=pointer]:
          - code [ref=e679]: ANTD-04
          - generic [ref=e680]: Ant Design Mobile 与移动业务组件
        - button "API-01 OpenAPI/YAML 解析与规范化" [ref=e681] [cursor=pointer]:
          - code [ref=e682]: API-01
          - generic [ref=e683]: OpenAPI/YAML 解析与规范化
        - button "API-02 类型推断、代码生成与可维护输出" [ref=e684] [cursor=pointer]:
          - code [ref=e685]: API-02
          - generic [ref=e686]: 类型推断、代码生成与可维护输出
        - button "BACKEND-01 SQL、事务、索引与前端数据模型" [ref=e687] [cursor=pointer]:
          - code [ref=e688]: BACKEND-01
          - generic [ref=e689]: SQL、事务、索引与前端数据模型
        - button "BACKEND-02 消息队列、异步任务与幂等消费" [ref=e690] [cursor=pointer]:
          - code [ref=e691]: BACKEND-02
          - generic [ref=e692]: 消息队列、异步任务与幂等消费
        - button "BACKEND-03 对象存储签名、生命周期与 CDN 服务边界" [ref=e693] [cursor=pointer]:
          - code [ref=e694]: BACKEND-03
          - generic [ref=e695]: 对象存储签名、生命周期与 CDN 服务边界
        - button "CAREER-06 面试、教学与技术影响力" [ref=e696] [cursor=pointer]:
          - code [ref=e697]: CAREER-06
          - generic [ref=e698]: 面试、教学与技术影响力
        - button "CLOUD-01 云交付拓扑、平台协作与 Kubernetes 素养" [ref=e699] [cursor=pointer]:
          - code [ref=e700]: CLOUD-01
          - generic [ref=e701]: 云交付拓扑、平台协作与 Kubernetes 素养
        - button "COLLAB-01 CRDT、OT、Presence 与多人协作一致性" [ref=e702] [cursor=pointer]:
          - code [ref=e703]: COLLAB-01
          - generic [ref=e704]: CRDT、OT、Presence 与多人协作一致性
        - button "COMP-03 文档、示例、测试与版本治理" [ref=e705] [cursor=pointer]:
          - code [ref=e706]: COMP-03
          - generic [ref=e707]: 文档、示例、测试与版本治理
        - button "CONTENT-01 内容模型、CMS、Markdown/MDX 与搜索" [ref=e708] [cursor=pointer]:
          - code [ref=e709]: CONTENT-01
          - generic [ref=e710]: 内容模型、CMS、Markdown/MDX 与搜索
        - button "DOCKER-03 容器内调试、资源限制与生产运行边界" [ref=e711] [cursor=pointer]:
          - code [ref=e712]: DOCKER-03
          - generic [ref=e713]: 容器内调试、资源限制与生产运行边界
        - button "DOCKER-04 容器镜像安全、扫描与制品可信" [ref=e714] [cursor=pointer]:
          - code [ref=e715]: DOCKER-04
          - generic [ref=e716]: 容器镜像安全、扫描与制品可信
        - button "DS-01 Design Token、主题与一致性" [ref=e717] [cursor=pointer]:
          - code [ref=e718]: DS-01
          - generic [ref=e719]: Design Token、主题与一致性
        - button "DX-01 前端平台工程、Golden Path 与开发者体验" [ref=e720] [cursor=pointer]:
          - code [ref=e721]: DX-01
          - generic [ref=e722]: 前端平台工程、Golden Path 与开发者体验
        - button "EDGE-01 Edge Runtime、Serverless 执行约束与部署边界" [ref=e723] [cursor=pointer]:
          - code [ref=e724]: EDGE-01
          - generic [ref=e725]: Edge Runtime、Serverless 执行约束与部署边界
        - button "EDITOR-01 复杂编辑器、输入法与 AI 创作界面" [ref=e726] [cursor=pointer]:
          - code [ref=e727]: EDITOR-01
          - generic [ref=e728]: 复杂编辑器、输入法与 AI 创作界面
        - button "EMBED-01 嵌入式前端 SDK、第三方宿主与多租户隔离" [ref=e729] [cursor=pointer]:
          - code [ref=e730]: EMBED-01
          - generic [ref=e731]: 嵌入式前端 SDK、第三方宿主与多租户隔离
        - button "ENG-04 组件库构建、CJS/ESM、types 与 exports" [ref=e732] [cursor=pointer]:
          - code [ref=e733]: ENG-04
          - generic [ref=e734]: 组件库构建、CJS/ESM、types 与 exports
        - button "ENG-07 构建工具链演进、兼容迁移与回滚" [ref=e735] [cursor=pointer]:
          - code [ref=e736]: ENG-07
          - generic [ref=e737]: 构建工具链演进、兼容迁移与回滚
        - button "EXP-01 Feature Flag、运行时曝光与实验配置治理" [ref=e738] [cursor=pointer]:
          - code [ref=e739]: EXP-01
          - generic [ref=e740]: Feature Flag、运行时曝光与实验配置治理
        - button "EXP-02 A/B Test、统计推断与实验护栏" [ref=e741] [cursor=pointer]:
          - code [ref=e742]: EXP-02
          - generic [ref=e743]: A/B Test、统计推断与实验护栏
        - button "GQL-01 GraphQL Schema、缓存与前端契约" [ref=e744] [cursor=pointer]:
          - code [ref=e745]: GQL-01
          - generic [ref=e746]: GraphQL Schema、缓存与前端契约
        - button "GRAPHICS-01 SVG、Canvas 2D 与图形选择" [ref=e747] [cursor=pointer]:
          - code [ref=e748]: GRAPHICS-01
          - generic [ref=e749]: SVG、Canvas 2D 与图形选择
        - button "GRAPHICS-02 WebGL/WebGPU 渲染管线与资源管理" [ref=e750] [cursor=pointer]:
          - code [ref=e751]: GRAPHICS-02
          - generic [ref=e752]: WebGL/WebGPU 渲染管线与资源管理
        - button "H5-03 移动 Web 定位、地图与设备权限" [ref=e753] [cursor=pointer]:
          - code [ref=e754]: H5-03
          - generic [ref=e755]: 移动 Web 定位、地图与设备权限
        - button "H5-04 浏览器大文件传输、分片与断点恢复" [ref=e756] [cursor=pointer]:
          - code [ref=e757]: H5-04
          - generic [ref=e758]: 浏览器大文件传输、分片与断点恢复
        - button "HYBRID-01 企业微信/钉钉 SDK 与容器差异" [ref=e759] [cursor=pointer]:
          - code [ref=e760]: HYBRID-01
          - generic [ref=e761]: 企业微信/钉钉 SDK 与容器差异
        - button "I18N-01 本地化、文本方向与可翻译 UI" [ref=e762] [cursor=pointer]:
          - code [ref=e763]: I18N-01
          - generic [ref=e764]: 本地化、文本方向与可翻译 UI
        - button "I18N-02 Temporal、时区、日历、数字与货币" [ref=e765] [cursor=pointer]:
          - code [ref=e766]: I18N-02
          - generic [ref=e767]: Temporal、时区、日历、数字与货币
        - button "LOCALFIRST-01 本地优先数据、浏览器数据库与同步引擎" [ref=e768] [cursor=pointer]:
          - code [ref=e769]: LOCALFIRST-01
          - generic [ref=e770]: 本地优先数据、浏览器数据库与同步引擎
        - button "MEDIA-01 专业 Web 播放、编解码、DRM 与质量治理" [ref=e771] [cursor=pointer]:
          - code [ref=e772]: MEDIA-01
          - generic [ref=e773]: 专业 Web 播放、编解码、DRM 与质量治理
        - button "MEDIA-02 媒体采集、WebRTC 与实时音频处理" [ref=e774] [cursor=pointer]:
          - code [ref=e775]: MEDIA-02
          - generic [ref=e776]: 媒体采集、WebRTC 与实时音频处理
        - button "MOBILE-01 跨平台原生前端、Native Bridge 与应用生命周期" [ref=e777] [cursor=pointer]:
          - code [ref=e778]: MOBILE-01
          - generic [ref=e779]: 跨平台原生前端、Native Bridge 与应用生命周期
        - button "NODE-03 CLI 参数、退出码与用户体验" [ref=e780] [cursor=pointer]:
          - code [ref=e781]: NODE-03
          - generic [ref=e782]: CLI 参数、退出码与用户体验
        - button "PLATFORM-01 Schema 与配置化页面" [ref=e783] [cursor=pointer]:
          - code [ref=e784]: PLATFORM-01
          - generic [ref=e785]: Schema 与配置化页面
        - button "PLATFORM-02 微前端拆分、隔离、通信与部署" [ref=e786] [cursor=pointer]:
          - code [ref=e787]: PLATFORM-02
          - generic [ref=e788]: 微前端拆分、隔离、通信与部署
        - button "PLATFORM-03 物料平台、采用率与治理" [ref=e789] [cursor=pointer]:
          - code [ref=e790]: PLATFORM-03
          - generic [ref=e791]: 物料平台、采用率与治理
        - button "PWA-01 Service Worker、离线缓存与版本迁移" [ref=e792] [cursor=pointer]:
          - code [ref=e793]: PWA-01
          - generic [ref=e794]: Service Worker、离线缓存与版本迁移
        - button "PWA-02 Web App Manifest、安装、推送与后台能力" [ref=e795] [cursor=pointer]:
          - code [ref=e796]: PWA-02
          - generic [ref=e797]: Web App Manifest、安装、推送与后台能力
        - button "RUNTIME-01 浏览器扩展、小程序与受限 Web 容器" [ref=e798] [cursor=pointer]:
          - code [ref=e799]: RUNTIME-01
          - generic [ref=e800]: 浏览器扩展、小程序与受限 Web 容器
        - button "RUNTIME-02 Electron/Tauri 桌面前端、安全桥接与分发" [ref=e801] [cursor=pointer]:
          - code [ref=e802]: RUNTIME-02
          - generic [ref=e803]: Electron/Tauri 桌面前端、安全桥接与分发
        - button "SEO-01 技术 SEO、抓取索引与内容可发现性" [ref=e804] [cursor=pointer]:
          - code [ref=e805]: SEO-01
          - generic [ref=e806]: 技术 SEO、抓取索引与内容可发现性
        - button "SUSTAIN-01 Web 与 AI 可持续性、能效与碳感知工程" [ref=e807] [cursor=pointer]:
          - code [ref=e808]: SUSTAIN-01
          - generic [ref=e809]: Web 与 AI 可持续性、能效与碳感知工程
        - button "UMI-01 路由、布局与页面生命周期" [ref=e810] [cursor=pointer]:
          - code [ref=e811]: UMI-01
          - generic [ref=e812]: 路由、布局与页面生命周期
        - button "UMI-02 initialState、运行时配置与应用初始化" [ref=e813] [cursor=pointer]:
          - code [ref=e814]: UMI-02
          - generic [ref=e815]: initialState、运行时配置与应用初始化
        - button "UMI-03 请求层、错误处理与取消" [ref=e816] [cursor=pointer]:
          - code [ref=e817]: UMI-03
          - generic [ref=e818]: 请求层、错误处理与取消
        - button "UMI-04 页面、按钮与数据权限" [ref=e819] [cursor=pointer]:
          - code [ref=e820]: UMI-04
          - generic [ref=e821]: 页面、按钮与数据权限
        - button "VIS-01 数据可视化语义、交互与性能" [ref=e822] [cursor=pointer]:
          - code [ref=e823]: VIS-01
          - generic [ref=e824]: 数据可视化语义、交互与性能
        - button "VUE-09 Vue Query 与服务器状态" [ref=e825] [cursor=pointer]:
          - code [ref=e826]: VUE-09
          - generic [ref=e827]: Vue Query 与服务器状态
        - button "WASM-01 WebAssembly 通用运行时、宿主边界与工程化" [ref=e828] [cursor=pointer]:
          - code [ref=e829]: WASM-01
          - generic [ref=e830]: WebAssembly 通用运行时、宿主边界与工程化
        - button "WEBAGENT-01 Agent 可操作 Web、WebMCP 与渐进增强" [ref=e831] [cursor=pointer]:
          - code [ref=e832]: WEBAGENT-01
          - generic [ref=e833]: Agent 可操作 Web、WebMCP 与渐进增强
        - button "WEBAI-01 Chrome Built-in AI API、分级可用性与能力检测" [ref=e834] [cursor=pointer]:
          - code [ref=e835]: WEBAI-01
          - generic [ref=e836]: Chrome Built-in AI API、分级可用性与能力检测
        - button "WEBAI-02 WebGPU 计算管线、张量与 AI 推理后端" [ref=e837] [cursor=pointer]:
          - code [ref=e838]: WEBAI-02
          - generic [ref=e839]: WebGPU 计算管线、张量与 AI 推理后端
        - button "WEBAI-03 WebAssembly、SIMD 与推理性能" [ref=e840] [cursor=pointer]:
          - code [ref=e841]: WEBAI-03
          - generic [ref=e842]: WebAssembly、SIMD 与推理性能
        - button "WEBAI-04 AI 推理 Worker、任务池与主线程响应" [ref=e843] [cursor=pointer]:
          - code [ref=e844]: WEBAI-04
          - generic [ref=e845]: AI 推理 Worker、任务池与主线程响应
        - button "WEBAI-05 浏览器模型下载、缓存与版本管理" [ref=e846] [cursor=pointer]:
          - code [ref=e847]: WEBAI-05
          - generic [ref=e848]: 浏览器模型下载、缓存与版本管理
        - button "WEBAI-06 本地 Embedding 与语义搜索" [ref=e849] [cursor=pointer]:
          - code [ref=e850]: WEBAI-06
          - generic [ref=e851]: 本地 Embedding 与语义搜索
        - button "WEBAI-07 多模态输入、媒体管线与隐私" [ref=e852] [cursor=pointer]:
          - code [ref=e853]: WEBAI-07
          - generic [ref=e854]: 多模态输入、媒体管线与隐私
        - button "WEBAI-08 混合推理与端云路由" [ref=e855] [cursor=pointer]:
          - code [ref=e856]: WEBAI-08
          - generic [ref=e857]: 混合推理与端云路由
        - button "WEBAI-09 离线 AI 作业、Outbox 与恢复同步" [ref=e858] [cursor=pointer]:
          - code [ref=e859]: WEBAI-09
          - generic [ref=e860]: 离线 AI 作业、Outbox 与恢复同步
        - button "WEBAI-10 本地 AI 性能、能耗与可访问性" [ref=e861] [cursor=pointer]:
          - code [ref=e862]: WEBAI-10
          - generic [ref=e863]: 本地 AI 性能、能耗与可访问性
        - button "WEBAI-11 WebNN 图计算、抽象设备偏好与推理后端" [pressed] [ref=e864] [cursor=pointer]:
          - code [ref=e865]: WEBAI-11
          - generic [ref=e866]: WebNN 图计算、抽象设备偏好与推理后端
      - generic "已选知识点" [ref=e869]:
        - button "移除 WEBAI-11" [ref=e870] [cursor=pointer]: WEBAI-11
      - generic [ref=e873]:
        - text: 今日学习记录
        - textbox "今日学习记录" [ref=e874]:
          - /placeholder: 关键收获、仍然困惑的地方、下一次想继续什么……
      - generic [ref=e875]:
        - generic [ref=e876]:
          - text: 实际投入（分钟）
          - spinbutton "实际投入（分钟）" [ref=e877]: "60"
        - generic [ref=e878]:
          - text: 精力 3/5
          - slider "精力 3/5" [ref=e879]: "3"
        - generic [ref=e880]:
          - text: 难度 3/5
          - slider "难度 3/5" [ref=e881]: "3"
      - paragraph [ref=e882]: 已选 1 个知识点
    - contentinfo [ref=e883]:
      - button "取消" [ref=e884] [cursor=pointer]
      - button "保存今日打卡" [ref=e885] [cursor=pointer]
```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test';
  2   | 
  3   | test('侧栏可收起并记住偏好，手机仍保留全部主导航', async ({ page }) => {
  4   |   await page.setViewportSize({ width: 1440, height: 1000 });
  5   |   await page.goto('/');
  6   |   await page.getByRole('button', { name: '收起侧栏' }).click();
  7   |   await expect(page.getByRole('button', { name: '展开侧栏' })).toHaveAttribute('aria-expanded', 'false');
  8   |   await page.reload();
  9   |   await expect(page.getByRole('button', { name: '展开侧栏' })).toBeVisible();
  10  |   await page.setViewportSize({ width: 390, height: 844 });
  11  |   for (const label of ['学习台', '知识体系', '笔记中心', '核心路线', '求职支线']) {
  12  |     const link = page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: label });
  13  |     await expect(link).toBeVisible();
  14  |     const box = await link.boundingBox();
  15  |     expect(box!.width).toBeGreaterThanOrEqual(44);
  16  |     expect(box!.height).toBeGreaterThanOrEqual(44);
  17  |   }
  18  |   await page.getByRole('link', { name: '设置与数据', exact: true }).click();
  19  |   await expect(page).toHaveURL(/\/settings$/);
  20  | });
  21  | 
  22  | test('搜索键盘选择自动滚动，中文输入确认不会误导航，关闭恢复焦点', async ({ page }) => {
  23  |   await page.setViewportSize({ width: 390, height: 600 });
  24  |   await page.goto('/');
  25  |   const trigger = page.getByRole('button', { name: /^快速查找/ });
  26  |   await trigger.click();
  27  |   const input = page.getByRole('combobox', { name: '搜索页面或知识点' });
  28  |   await expect(input).toBeFocused();
  29  |   const results = page.getByRole('listbox', { name: '页面与知识点' });
  30  |   await expect(results.getByRole('option')).toHaveCount(12);
  31  |   for (let index = 0; index < 10; index++) await input.press('ArrowDown');
  32  |   const selected = results.getByRole('option', { selected: true });
  33  |   await expect(selected).toBeInViewport();
  34  |   const fullyVisible = await selected.evaluate((element) => {
  35  |     const bounds = element.getBoundingClientRect();
  36  |     const parent = element.parentElement!.getBoundingClientRect();
  37  |     return bounds.top >= parent.top - 1 && bounds.bottom <= parent.bottom + 1;
  38  |   });
  39  |   expect(fullyVisible).toBe(true);
  40  |   await expect(input).toHaveAttribute('aria-activedescendant', await selected.getAttribute('id') as string);
  41  |   await input.dispatchEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true });
  42  |   await expect(input).toBeVisible();
  43  |   await input.fill('无匹配的知识点 xyz987');
  44  |   await expect(page.getByText('没有匹配结果')).toBeVisible();
  45  |   await input.fill('VUE-11');
  46  |   await expect(results.getByRole('option', { name: /VUE-11/ })).toBeVisible();
  47  |   await input.press('Escape');
  48  |   await expect(trigger).toBeFocused();
  49  |   await trigger.click();
  50  |   await input.press('Tab');
  51  |   await expect(page.getByRole('button', { name: '关闭快速查找' })).toBeFocused();
  52  |   await page.keyboard.press('Enter');
  53  |   await expect(page.getByRole('dialog', { name: '快速查找' })).not.toBeVisible();
  54  |   await expect(page).toHaveURL(/\/$/);
  55  | });
  56  | 
  57  | test('打卡可搜索前 60 项以外的知识点，失败保留输入并可重试保存', async ({ page }) => {
  58  |   const response = await page.request.get('/api/v1/knowledge/points');
  59  |   const { data } = await response.json() as { data: { items: Array<{ code: string; title: string }> } };
  60  |   const target = data.items.at(-1)!;
  61  |   expect(data.items.findIndex((point) => point.code === target.code)).toBeGreaterThan(60);
  62  |   let saveCount = 0;
  63  |   await page.route('**/api/v1/learning/checkins/*', async (route) => {
  64  |     saveCount++;
  65  |     if (saveCount === 1) {
  66  |       await route.fulfill({ status: 503, json: { error: { code: 'UNAVAILABLE', message: '测试：暂时无法保存，请重试', retryable: true }, meta: { requestId: 'ui-checkin-failure' } } });
  67  |       return;
  68  |     }
  69  |     const body = route.request().postDataJSON();
  70  |     expect(body.pointCodes).toContain(target.code);
  71  |     expect(body.summaryMd).toBe('这次学习的关键收获');
  72  |     await route.fulfill({ json: { data: { ...body, id: 'ui-checkin', checkinDate: '2026-09-06', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), points: [{ code: target.code, title: target.title, activity: 'LEARN' }] }, meta: { requestId: 'ui-checkin-success' } } });
  73  |   });
  74  |   await page.goto('/');
  75  |   await page.getByRole('button', { name: /记录今日学习|修改今日打卡/ }).click();
  76  |   const dialog = page.getByRole('dialog', { name: '今天实际学了什么？' });
  77  |   await dialog.getByRole('searchbox', { name: '搜索打卡知识点' }).fill(target.code);
  78  |   const point = dialog.getByRole('group', { name: '可选知识点' }).getByRole('button', { name: new RegExp(target.code) });
  79  |   await point.click();
  80  |   await expect(point).toHaveAttribute('aria-pressed', 'true');
  81  |   await dialog.getByRole('searchbox').fill('');
> 82  |   await dialog.getByRole('button', { name: /只看已选/ }).click();
      |                                                      ^ Error: locator.click: Test timeout of 30000ms exceeded.
  83  |   await expect(dialog.getByRole('group', { name: '可选知识点' }).getByRole('button')).toContainText([target.code]);
  84  |   await dialog.getByLabel('今日学习记录', { exact: true }).fill('这次学习的关键收获');
  85  |   await dialog.getByLabel('实际投入（分钟）').fill('-1');
  86  |   await dialog.getByRole('button', { name: '保存今日打卡' }).click();
  87  |   await expect(dialog.getByRole('alert')).toContainText('0–1440');
  88  |   expect(saveCount).toBe(0);
  89  |   await dialog.getByLabel('实际投入（分钟）').fill('25');
  90  |   await dialog.getByRole('button', { name: '保存今日打卡' }).click();
  91  |   await expect(dialog.getByRole('alert')).toContainText('暂时无法保存');
  92  |   await expect(dialog.getByLabel('今日学习记录', { exact: true })).toHaveValue('这次学习的关键收获');
  93  |   await dialog.getByRole('button', { name: '保存今日打卡' }).click();
  94  |   await expect(dialog).not.toBeVisible();
  95  |   await expect(page.getByRole('status').filter({ hasText: '今日学习已记录' })).toBeVisible();
  96  |   expect(saveCount).toBe(2);
  97  | });
  98  | 
  99  | test('矮屏弹窗固定操作区且不会被 AI 入口盖住', async ({ page }) => {
  100 |   await page.setViewportSize({ width: 390, height: 600 });
  101 |   await page.goto('/');
  102 |   const trigger = page.getByRole('button', { name: /记录今日学习|修改今日打卡/ });
  103 |   await trigger.click();
  104 |   const dialog = page.getByRole('dialog', { name: '今天实际学了什么？' });
  105 |   const box = await dialog.boundingBox();
  106 |   expect(box!.y).toBeGreaterThanOrEqual(0);
  107 |   expect(box!.y + box!.height).toBeLessThanOrEqual(600);
  108 |   await expect(dialog.getByRole('button', { name: '保存今日打卡' })).toBeInViewport();
  109 |   await page.keyboard.press('Control+k');
  110 |   await expect(page.getByRole('dialog')).toHaveCount(1);
  111 |   await page.screenshot({ path: '../../tmp/ui-review/checkin-mobile.png' });
  112 |   await dialog.getByRole('button', { name: '取消', exact: true }).click();
  113 |   await expect(trigger).toBeFocused();
  114 | });
  115 | 
  116 | test('开始学习失败有明确反馈并恢复可操作状态', async ({ page }) => {
  117 |   expect((await page.request.post('/api/v1/import/reset-learning-progress', { data: {} })).ok()).toBe(true);
  118 |   const preference = (await (await page.request.get('/api/v1/learning/preferences')).json()).data;
  119 |   expect((await page.request.put('/api/v1/learning/preferences', {
  120 |     data: { frameworkChoice: 'NONE', expectedRevision: preference.revision },
  121 |   })).ok()).toBe(true);
  122 |   const workspace = (await (await page.request.get('/api/v1/learning/workspace')).json()).data;
  123 |   expect(workspace.current).toBeNull();
  124 |   expect(workspace.suggested.code).toBe('JS-01');
  125 |   await page.route('**/api/v1/learning/points/*/focus', (route) => route.fulfill({ status: 503, json: { error: { code: 'UNAVAILABLE', message: '暂时无法开始，请重试', retryable: true }, meta: { requestId: 'ui-focus-failure' } } }));
  126 |   await page.goto('/');
  127 |   const start = page.getByRole('button', { name: '开始这项具体任务 →' });
  128 |   await start.click();
  129 |   await expect(page.getByRole('alert')).toContainText('暂时无法开始');
  130 |   await expect(start).toBeEnabled();
  131 | });
  132 | 
  133 | test('主要页面适配桌面、平板和手机且无页面脚本错误', async ({ page }) => {
  134 |   test.setTimeout(60_000);
  135 |   const errors: string[] = [];
  136 |   page.on('pageerror', (error) => errors.push(error.message));
  137 |   for (const width of [1440, 1024, 390, 320]) {
  138 |     await page.setViewportSize({ width, height: 900 });
  139 |     for (const path of ['/', '/knowledge/map', '/knowledge', '/knowledge/graph', '/notes', '/plan', '/jobs', '/settings', '/knowledge/WEB-01']) {
  140 |       await page.goto(path);
  141 |       await expect(page.locator('.route-shell h1').first()).toBeVisible();
  142 |       await page.waitForLoadState('networkidle');
  143 |       expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${width}px ${path} 横向溢出`).toBeLessThanOrEqual(1);
  144 |       if (path === '/' && [1440, 390].includes(width)) await page.screenshot({ path: `../../tmp/ui-review/learning-${width}.png`, fullPage: true });
  145 |     }
  146 |   }
  147 |   expect(errors).toEqual([]);
  148 | });
  149 | 
```