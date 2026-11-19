# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: b01-materials.spec.ts >> B01 小节交叉引用保留完整正文，后退恢复原来的阅读位置
- Location: e2e/b01-materials.spec.ts:28:1

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByRole('navigation', { name: 'B01 阅读路线' }).getByRole('link')
Expected: 4
Received: 0
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" getByRole('navigation', { name: 'B01 阅读路线' }).getByRole('link') with timeout 5000ms
  - waiting for getByRole('navigation', { name: 'B01 阅读路线' }).getByRole('link')
    14 × locator resolved to 0 elements
       - unexpected value "0"

```

# Page snapshot

```yaml
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
        - generic [ref=e68]: 中文学习资料
      - button "快速查找，快捷键 Command 或 Control 加 K" [ref=e70] [cursor=pointer]:
        - generic [ref=e73]: 搜索知识点、页面…
        - generic [ref=e74]: ⌘ K
    - main [ref=e75]:
      - paragraph [ref=e76]: 中文学习资料页面已打开
      - main [ref=e79]:
        - region "我的下一步" [ref=e80]:
          - generic [ref=e81]:
            - heading "我的下一步" [level=2] [ref=e82]
            - link "查看学习路线" [ref=e83] [cursor=pointer]:
              - /url: /plan
          - generic [ref=e84]:
            - generic [ref=e85]:
              - text: 框架方向
              - combobox "框架方向" [ref=e86]:
                - option "尚未选择" [selected]
                - option "React"
                - option "Vue"
                - option "暂不进入框架"
            - button "保存方向" [ref=e87] [cursor=pointer]
          - paragraph [ref=e88]: 选择只影响推荐，不改变当前学习点、暂缓状态或阅读进度。
          - status [ref=e89]: 按当前偏好与学习记录推荐；可自由查阅其他资料。
          - link "继续学习 · JS-05 →" [ref=e90] [cursor=pointer]:
            - /url: /knowledge/JS-05
          - list [ref=e91]:
            - listitem [ref=e92]:
              - link "JS-01" [ref=e93] [cursor=pointer]:
                - /url: /knowledge/JS-01
              - text: · 建议补齐此基础
          - group [ref=e94]:
            - generic "本次已审范围：共同基础与一个可选框架方向" [ref=e95] [cursor=pointer]
          - link "浏览全部资料" [ref=e96] [cursor=pointer]:
            - /url: /knowledge
        - navigation "讲义操作" [ref=e98]:
          - button "← 返回上一页" [ref=e99] [cursor=pointer]
          - button "复制本页链接" [ref=e101] [cursor=pointer]
        - navigation "切换学习批次" [ref=e102]:
          - link "B01" [ref=e103] [cursor=pointer]:
            - /url: /knowledge/materials/js-01-execution-context-scope-closure.md/js-01
          - link "B02" [ref=e104] [cursor=pointer]:
            - /url: /knowledge/materials/cs-01-complexity-scale-engineering-cost.md/cs-01
          - link "B03" [ref=e105] [cursor=pointer]:
            - /url: /knowledge/materials/js-05-promise-errors-async-control-flow.md/js-05
          - link "B04" [ref=e106] [cursor=pointer]:
            - /url: /knowledge/materials/ts-03-generics-constraints-keyof-indexed-access.md/ts-03
          - link "B05" [ref=e107] [cursor=pointer]:
            - /url: /knowledge/materials/react-02-component-boundaries-data-flow-composition.md/react-02
          - link "B06" [ref=e108] [cursor=pointer]:
            - /url: /knowledge/materials/react-04-effects-external-sync-cleanup.md/react-04
          - link "B07" [ref=e109] [cursor=pointer]:
            - /url: /knowledge/materials/react-06-reducer-context-state-domains.md/react-06
          - link "B08" [ref=e110] [cursor=pointer]:
            - /url: /knowledge/materials/vue-07-router-navigation-boundaries.md/vue-07
          - link "B09" [ref=e111] [cursor=pointer]:
            - /url: /knowledge/materials/git-01-object-index-references-recovery.md/git-01
          - link "B10" [ref=e112] [cursor=pointer]:
            - /url: /knowledge/materials/eng-01-module-graph-build-output-source-maps.md/eng-01
          - link "B11" [ref=e113] [cursor=pointer]:
            - /url: /knowledge/materials/test-01-test-design-oracles-properties-mutation.md/test-01
          - link "B12" [ref=e114] [cursor=pointer]:
            - /url: /knowledge/materials/career-02-architecture-diagrams-boundaries-adrs.md/career-02
          - link "B13" [ref=e115] [cursor=pointer]:
            - /url: /knowledge/materials/a11y-01-wcag-testing-governance.md/a11y-01
          - link "B14" [ref=e116] [cursor=pointer]:
            - /url: /knowledge/materials/web-05-web-components-shadow-dom-interoperability.md/web-05
          - link "B15" [ref=e117] [cursor=pointer]:
            - /url: /knowledge/materials/sec-04-cross-origin-isolation-embedding-permissions.md/sec-04
          - link "B16" [ref=e118] [cursor=pointer]:
            - /url: /knowledge/materials/ts-05-conditional-infer-distribution.md/ts-05
          - link "B17" [ref=e119] [cursor=pointer]:
            - /url: /knowledge/materials/identity-01-session-cookie-token-browser-boundaries.md/identity-01
          - link "B18" [ref=e120] [cursor=pointer]:
            - /url: /knowledge/materials/node-01-runtime-event-loop-nonblocking-io.md/node-01
          - link "B19" [ref=e121] [cursor=pointer]:
            - /url: /knowledge/materials/aidev-02-context-engineering-repository-instructions.md/aidev-02
          - link "B20" [ref=e122] [cursor=pointer]:
            - /url: /knowledge/materials/biz-03-rbac-abac-data-permissions.md/biz-03
          - link "B21" [ref=e123] [cursor=pointer]:
            - /url: /knowledge/materials/biz-08-requirement-acceptance-traceability.md/biz-08
          - link "B22" [ref=e124] [cursor=pointer]:
            - /url: /knowledge/materials/data-01-server-state-cache-keys-invalidation-deduplication.md/data-01
          - link "B23" [ref=e125] [cursor=pointer]:
            - /url: /knowledge/materials/comp-02-controlled-uncontrolled-state-imperative.md/comp-02
          - link "B24" [ref=e126] [cursor=pointer]:
            - /url: /knowledge/materials/linux-02-process-port-log-network-diagnostics.md/linux-02
          - link "B25" [ref=e127] [cursor=pointer]:
            - /url: /knowledge/materials/eng-06-ci-cd-artifact-promotion-release-rollback.md/eng-06
          - link "B26" [ref=e128] [cursor=pointer]:
            - /url: /knowledge/materials/perf-02-network-resource-loading-cache-optimization.md/perf-02
          - link "B27" [ref=e129] [cursor=pointer]:
            - /url: /knowledge/materials/h5-02-scroll-soft-keyboard-pointer-gestures.md/h5-02
          - link "B28" [ref=e130] [cursor=pointer]:
            - /url: /knowledge/materials/aisafe-01-output-validation-content-safety-guardrails.md/aisafe-01
          - link "B29" [ref=e131] [cursor=pointer]:
            - /url: /knowledge/materials/aiapp-03-structured-output-schema-validation.md/aiapp-03
          - link "B30" [ref=e132] [cursor=pointer]:
            - /url: /knowledge/materials/aiapp-06-rag-citations-source-trust.md/aiapp-06
          - link "B31" [ref=e133] [cursor=pointer]:
            - /url: /knowledge/materials/aiapp-10-ai-interaction-trust-recovery.md/aiapp-10
          - link "B32" [ref=e134] [cursor=pointer]:
            - /url: /knowledge/materials/agent-03-mcp-transport-stateless-state-versioning.md/agent-03
          - link "B33" [ref=e135] [cursor=pointer]:
            - /url: /knowledge/materials/agent-08-tool-contract-schema-discoverability.md/agent-08
          - link "B34" [ref=e136] [cursor=pointer]:
            - /url: /knowledge/materials/aidev-07-dependency-source-security.md/aidev-07
          - link "B35" [ref=e137] [cursor=pointer]:
            - /url: /knowledge/materials/arch-02-technical-proposal-adr-review.md/arch-02
        - navigation "B01 旧分组浏览" [ref=e138]:
          - generic [ref=e139]:
            - generic [ref=e140]: B01 · 兼容阅读分组
            - strong [ref=e141]: 理解 JavaScript 的运行方式
          - list [ref=e142]:
            - listitem [ref=e143]:
              - link "01 JS-01 作用域与闭包" [ref=e144] [cursor=pointer]:
                - /url: /knowledge/materials/js-01-execution-context-scope-closure.md/js-01
                - generic [ref=e145]: "01"
                - generic [ref=e146]:
                  - generic [ref=e147]: JS-01
                  - strong [ref=e148]: 作用域与闭包
            - listitem [ref=e149]:
              - link "02 JS-02 原型与 this" [ref=e150] [cursor=pointer]:
                - /url: /knowledge/materials/js-02-prototype-object-model-this.md/js-02
                - generic [ref=e151]: "02"
                - generic [ref=e152]:
                  - generic [ref=e153]: JS-02
                  - strong [ref=e154]: 原型与 this
            - listitem [ref=e155]:
              - link "03 JS-03 类型与数据更新" [ref=e156] [cursor=pointer]:
                - /url: /knowledge/materials/js-03-types-equality-copy-immutability.md/js-03
                - generic [ref=e157]: "03"
                - generic [ref=e158]:
                  - generic [ref=e159]: JS-03
                  - strong [ref=e160]: 类型与数据更新
            - listitem [ref=e161]:
              - link "04 JS-07 迭代、代理与资源" [ref=e162] [cursor=pointer]:
                - /url: /knowledge/materials/js-07-iteration-metaprogramming-resources.md/js-07
                - generic [ref=e163]: "04"
                - generic [ref=e164]:
                  - generic [ref=e165]: JS-07
                  - strong [ref=e166]: 迭代、代理与资源
        - generic [ref=e167]:
          - generic [ref=e168]:
            - paragraph [ref=e169]: B01 · 第 1 / 4 篇 · JS-01
            - heading "JS-01 执行上下文、作用域与闭包" [level=1] [ref=e170]
            - generic [ref=e171]: 从一次函数调用开始，理解变量的来处、闭包中的共享状态，以及回调的清理。
          - generic [ref=e172]:
            - generic [ref=e173]:
              - term [ref=e174]: 预计阅读
              - definition [ref=e175]: 18 分钟
            - generic [ref=e176]:
              - term [ref=e177]: 阅读状态
              - definition [ref=e178]: 未读
        - generic [ref=e179]:
          - complementary "本页目录" [ref=e180]:
            - navigation [ref=e182]:
              - button "学习前先确认" [ref=e183] [cursor=pointer]
              - button "从一次函数调用看起" [ref=e184] [cursor=pointer]
              - button "名字沿源码的位置查找" [ref=e185] [cursor=pointer]
              - button "声明之前为什么有时能读有时会报错" [ref=e186] [cursor=pointer]
              - button "闭包让函数继续访问创建处的变量" [ref=e187] [cursor=pointer]
              - button "闭包保存的是变量还是快照" [ref=e188] [cursor=pointer]
              - button "两次创建会得到两份独立状态" [ref=e189] [cursor=pointer]
              - button "循环中的回调为什么会读到同一个数" [ref=e190] [cursor=pointer]
              - button "回调结束使用后要解除谁的引用" [ref=e191] [cursor=pointer]
              - button "用一条线把概念连起来" [ref=e192] [cursor=pointer]
              - button "参考与延伸阅读" [ref=e193] [cursor=pointer]
          - article [ref=e194]:
            - generic [ref=e195]:
              - text: 这一篇，读懂一个问题
              - heading "函数从哪里读取变量？" [level=2] [ref=e196]
              - list [ref=e197]:
                - listitem [ref=e198]: 沿源码找到变量所属的作用域
                - listitem [ref=e199]: 解释闭包读取变量与保存快照的区别
                - listitem [ref=e200]: 区分实例隔离、循环绑定和长期引用
            - article "Markdown 内容" [ref=e202]:
              - paragraph [ref=e203]:
                - text: 为什么函数已经执行完，里面的变量还能继续使用？为什么同一个回调，换个地方调用也找不到那个地方的同名变量？这两个看似分开的问题，其实都在问：
                - strong [ref=e204]: 一个函数究竟从哪里读取变量。
              - paragraph [ref=e205]: 这篇文章从普通函数调用开始，逐步走到闭包。读完后，你应该能顺着源码解释变量的来处，分清“这一次调用的局部状态”和“多个函数共用的状态”，也能判断回调何时需要清理。
              - heading "学习前先确认" [level=3] [ref=e206]
              - list [ref=e207]:
                - listitem [ref=e208]:
                  - text: 直接前置：
                  - link "函数、参数、返回值与回调" [ref=e209] [cursor=pointer]:
                    - /url: /knowledge/materials/javascript-functions-and-callbacks.md/prejs-02
                  - text: 。只需能读懂函数定义、调用和返回函数；变量基础在这篇前置短文中另有入口。
              - paragraph [ref=e210]:
                - text: 本文示例可分别复制到现代浏览器控制台运行。每个代码块都自带所需定义，
                - code [ref=e211]: // =>
                - text: 后面是应看到的输出。先运行，再改一个值观察变化，比一开始记术语更容易建立直觉。
              - heading "从一次函数调用看起" [level=3] [ref=e212]
              - paragraph [ref=e213]: 先看一个最普通的价格计算：
              - generic [ref=e214]:
                - generic [ref=e215]:
                  - generic [ref=e216]: js
                  - button "复制代码" [ref=e217] [cursor=pointer]
                - code [ref=e219]: "function calculatePrice(unitPrice, quantity) { const subtotal = unitPrice * quantity; return subtotal; } console.log(calculatePrice(12, 2)); // => 24 console.log(calculatePrice(12, 5)); // => 60"
              - paragraph [ref=e220]:
                - text: 两次调用用的是同一段函数代码，却各自有一组参数和局部变量。第一次的
                - code [ref=e221]: quantity
                - text: 是
                - code [ref=e222]: "2"
                - text: ，第二次是
                - code [ref=e223]: "5"
                - text: 。它们并不是让同一个局部变量来回换值，而是两次调用分别建立了自己的执行环境。
              - paragraph [ref=e224]:
                - text: 可以把
                - strong [ref=e225]:
                  - text: 执行上下文（execution context
                  - button "播放“execution context”的美式发音" [ref=e226] [cursor=pointer]:
                    - generic [aria-hidden] [ref=e227]: 🔊
                  - text: ）
                - text: 理解为：为了执行当前这段代码，JavaScript 需要保存的一组信息。例如正在执行哪个函数、局部变量在哪里，以及代码执行到了哪里。它是解释运行过程的模型，不是要求你猜测引擎把每个变量放在内存的哪个位置。
              - paragraph [ref=e228]:
                - text: 当一个函数调用另一个函数时，当前函数暂时等着，被调用的函数先执行；返回以后，再从原来的位置继续。这种“后来调用的先返回”的顺序，由
                - strong [ref=e229]:
                  - text: 调用栈（call stack
                  - button "播放“call stack”的美式发音" [ref=e230] [cursor=pointer]:
                    - generic [aria-hidden] [ref=e231]: 🔊
                  - text: ）
                - text: 描述。
              - generic [ref=e232]:
                - generic [ref=e233]:
                  - generic [ref=e234]: js
                  - button "复制代码" [ref=e235] [cursor=pointer]
                - code [ref=e237]:
                  - text: "function formatPrice(value) { console.log('进入 formatPrice'); return"
                  - generic [ref=e238]: "`¥${value}`"
                  - text: "; } function showPrice() { console.log('进入 showPrice'); const text = formatPrice(24); console.log(text); } showPrice(); // => 进入 showPrice // => 进入 formatPrice // => ¥24"
              - paragraph [ref=e239]: 调用栈回答的是“现在轮到谁执行”。它不直接回答“函数中的某个名字应该去哪里找”。后一个问题需要作用域。把这两个问题拆开，闭包就不必依赖“函数退出了，栈怎么还没消失”这样的猜想来解释。
              - heading "名字沿源码的位置查找" [level=3] [ref=e240]
              - paragraph [ref=e241]:
                - strong [ref=e242]:
                  - text: 作用域（scope
                  - button "播放“scope”的美式发音" [ref=e243] [cursor=pointer]:
                    - generic [aria-hidden] [ref=e244]: 🔊
                  - text: ）
                - text: 决定一个名字能在哪些位置被访问。JavaScript 主要采用
                - strong [ref=e245]:
                  - text: 词法作用域（lexical scope
                  - button "播放“lexical scope”的美式发音" [ref=e246] [cursor=pointer]:
                    - generic [aria-hidden] [ref=e247]: 🔊
                  - text: ）
                - text: ：查找外层变量的方向，由函数在源码中定义的位置决定，而不是由调用位置决定。
              - generic [ref=e248]:
                - generic [ref=e249]:
                  - generic [ref=e250]: js
                  - button "复制代码" [ref=e251] [cursor=pointer]
                - code [ref=e253]: "const city = '杭州'; function showCity() { return city; } function visit() { const city = '成都'; return showCity(); } console.log(visit()); // => 杭州"
              - paragraph [ref=e254]:
                - code [ref=e255]: showCity
                - text: 自己没有声明
                - code [ref=e256]: city
                - text: ，于是向它定义处的外层查找，找到
                - code [ref=e257]: "'杭州'"
                - text: 。虽然这次调用发生在
                - code [ref=e258]: visit
                - text: 里面，但
                - code [ref=e259]: visit
                - text: 的局部变量不在
                - code [ref=e260]: showCity
                - text: 的外层作用域中，因此不会参与这次查找。
              - paragraph [ref=e261]: 读这种代码时，可以先圈出函数的定义，再沿源码中的嵌套关系向外看。不要从调用处反向寻找“最近执行过的同名变量”。前者是作用域关系，后者只是执行顺序，两者不能混用。
              - paragraph [ref=e262]:
                - text: 如果内层也声明了同名变量，内层变量会
                - strong [ref=e263]:
                  - text: 遮蔽（shadowing
                  - button "播放“shadowing”的美式发音" [ref=e264] [cursor=pointer]:
                    - generic [aria-hidden] [ref=e265]: 🔊
                  - text: ）
                - text: 外层变量。遮蔽只是名字查找会先停在内层，并不意味着外层的值被改了。
              - generic [ref=e266]:
                - generic [ref=e267]:
                  - generic [ref=e268]: js
                  - button "复制代码" [ref=e269] [cursor=pointer]
                - code [ref=e271]: "const label = '全站设置'; { const label = '当前页面'; console.log(label); // => 当前页面 } console.log(label); // => 全站设置"
              - paragraph [ref=e272]:
                - text: 作用域也不等于花括号的数量。
                - code [ref=e273]: if
                - text: 、
                - code [ref=e274]: for
                - text: 和独立代码块会为
                - code [ref=e275]: let
                - text: 、
                - code [ref=e276]: const
                - text: 建立块级作用域；
                - code [ref=e277]: var
                - text: 通常受所在函数约束，不会因为普通的
                - code [ref=e278]: if
                - text: 块就产生独立作用域。对象字面量的花括号则是在描述属性，不是创建一层供变量查找的词法作用域。
              - heading "声明之前为什么有时能读有时会报错" [level=3] [ref=e279]
              - paragraph [ref=e280]: “声明提升”这个说法容易让人以为引擎把源码搬到了文件顶部。更准确的读法是：进入作用域时，某些名字已经被登记，但不同声明的初始化规则不同。
              - generic [ref=e281]:
                - generic [ref=e282]:
                  - generic [ref=e283]: js
                  - button "复制代码" [ref=e284] [cursor=pointer]
                - code [ref=e286]: "function inspectDeclarations() { console.log(total); // => undefined var total = 3; try { console.log(count); } catch (error) { console.log(error.name); // => ReferenceError } let count = 4; console.log(count); // => 4 } inspectDeclarations();"
              - paragraph [ref=e287]:
                - code [ref=e288]: var total
                - text: 在函数开始执行时已经初始化为
                - code [ref=e289]: undefined
                - text: ，运行到赋值处才变成
                - code [ref=e290]: "3"
                - text: 。
                - code [ref=e291]: let count
                - text: 的绑定虽然已经属于这个作用域，但直到执行声明时才完成初始化。此前这段时间叫
                - strong [ref=e292]:
                  - text: 暂时性死区（temporal dead zone
                  - button "播放“temporal dead zone”的美式发音" [ref=e293] [cursor=pointer]:
                    - generic [aria-hidden] [ref=e294]: 🔊
                  - text: ）
                - text: ，简称 TDZ。
              - paragraph [ref=e295]: TDZ 中的变量不是“先去外层找找看”。只要当前作用域声明了这个名字，就会先找到当前绑定；它尚未初始化，读取便报错，即使外层恰好也有同名变量。
              - generic [ref=e296]:
                - generic [ref=e297]:
                  - generic [ref=e298]: js
                  - button "复制代码" [ref=e299] [cursor=pointer]
                - code [ref=e301]: "const theme = '浅色'; { try { console.log(theme); } catch (error) { console.log(error.name); // => ReferenceError } const theme = '深色'; console.log(theme); // => 深色 }"
              - paragraph [ref=e302]:
                - text: 普通函数声明在所在函数或模块的作用域初始化时就可供调用。赋给
                - code [ref=e303]: const
                - text: 的函数表达式则要等到那条声明执行完成。不要把“函数能提前调用”推广成所有写法都一样；阅读旧式脚本时，块内函数声明还有历史兼容规则，现代代码尽量在模块或明确的函数作用域中定义它们。
              - paragraph [ref=e304]:
                - text: 还有一个有用的区别：
                - code [ref=e305]: typeof
                - text: 一个完全未声明的名字通常返回
                - code [ref=e306]: "'undefined'"
                - text: ，但
                - code [ref=e307]: typeof
                - text: 一个处于 TDZ 的绑定仍会报错。
                - code [ref=e308]: typeof
                - text: 不是绕过初始化规则的通行证。
                - code [ref=e309]: const
                - text: 声明后的约束则是不能重新赋值，和 TDZ 是两个阶段的规则；它也不会自动冻结对象，见
                - link "JS-03 中的共享对象" [ref=e310] [cursor=pointer]:
                  - /url: /knowledge/materials/js-03-types-equality-copy-immutability.md/js-03#%E8%B5%8B%E5%80%BC%E4%B9%8B%E5%90%8E%E8%B0%81%E5%92%8C%E8%B0%81%E5%85%B1%E7%94%A8%E5%AF%B9%E8%B1%A1
                - text: 。
              - paragraph [ref=e311]:
                - text: 脚本与模块的顶层也要区分。在浏览器传统脚本中，顶层
                - code [ref=e312]: var
                - text: 通常会成为全局对象的属性，顶层
                - code [ref=e313]: let
                - text: 、
                - code [ref=e314]: const
                - text: 则不会；ES Module 的顶层声明属于模块自己的作用域，不会自动成为
                - code [ref=e315]: window
                - text: 的属性。因此，“能直接读到一个名字”和“能从
                - code [ref=e316]: window
                - text: 读到同名属性”不能画等号。控制台还有自己的输入处理方式，判断工程代码时应以它实际作为脚本还是模块加载为准。
              - heading "闭包让函数继续访问创建处的变量" [level=3] [ref=e317]
              - paragraph [ref=e318]: 现在把函数当作返回值，让它在外层函数结束后再执行：
              - generic [ref=e319]:
                - generic [ref=e320]:
                  - generic [ref=e321]: js
                  - button "复制代码" [ref=e322] [cursor=pointer]
                - code [ref=e324]: "function createCounter() { let count = 0; return function next() { count += 1; return count; }; } const next = createCounter(); console.log(next()); // => 1 console.log(next()); // => 2"
              - paragraph [ref=e325]:
                - code [ref=e326]: createCounter()
                - text: 结束后，我们拿到了
                - code [ref=e327]: next
                - text: 这个函数。稍后调用
                - code [ref=e328]: next()
                - text: ，它仍然可以找到创建时所在作用域中的
                - code [ref=e329]: count
                - text: ，并继续修改它。
              - paragraph [ref=e330]:
                - strong [ref=e331]:
                  - text: 闭包（closure
                  - button "播放“closure”的美式发音" [ref=e332] [cursor=pointer]:
                    - generic [aria-hidden] [ref=e333]: 🔊
                  - text: ）
                - text: 指的就是函数以及它能够访问的词法环境这一组合。函数创建时就确定了向外查找变量的关系。把函数返回，只是让这种关系在外层调用结束以后表现得特别明显；事件回调、数组回调里的函数，同样可以形成闭包。
              - paragraph [ref=e334]:
                - text: 这里有两个动作不要混在一起：调用
                - code [ref=e335]: createCounter()
                - text: 建立这一份
                - code [ref=e336]: count
                - text: ；调用返回的
                - code [ref=e337]: next()
                - text: 使用这一份
                - code [ref=e338]: count
                - text: 。第二次执行
                - code [ref=e339]: next()
                - text: 不会重新执行外层的
                - code [ref=e340]: let count = 0
                - text: ，所以输出会接着增长。
              - paragraph [ref=e341]: 这也解释了为什么“调用结束”不等于“所有局部状态立刻消失”。调用栈上的执行过程可以结束，而仍被函数引用的环境继续存在。引擎可以对存储方式做优化；理解语义时，只需关心这些变量是否仍然能被访问，不必假设整个栈帧原封不动地保存着。
              - heading "闭包保存的是变量还是快照" [level=3] [ref=e342]
              - paragraph [ref=e343]: 闭包不是在创建函数时，把外层所有值拍一张照片。它会在执行时读取相应的绑定，所以能看到后来发生的重新赋值。
              - generic [ref=e344]:
                - generic [ref=e345]:
                  - generic [ref=e346]: js
                  - button "复制代码" [ref=e347] [cursor=pointer]
                - code [ref=e349]: let currentName = '未登录'; const readName = () => currentName; const savedName = currentName; const readSavedName = () => savedName; currentName = '小林'; console.log(readName()); // => 小林 console.log(readSavedName()); // => 未登录
              - paragraph [ref=e350]:
                - text: 两个函数都用到了闭包。差别在于
                - code [ref=e351]: readName
                - text: 读取会变化的
                - code [ref=e352]: currentName
                - text: ，而
                - code [ref=e353]: readSavedName
                - text: 读取另外建立的
                - code [ref=e354]: savedName
                - text: 。后者保存的是当时的字符串值，之后没有被重新赋值。
              - paragraph [ref=e355]:
                - text: 如果把字符串换成对象，
                - code [ref=e356]: const saved = currentObject
                - text: 只会保存同一个对象的引用，不会复制对象内容。闭包没有替你完成深拷贝。遇到“为什么保存了旧状态却仍然变了”，应同时检查变量绑定和对象是否共享，接着看
                - link "JS-03：浅拷贝只复制一层" [ref=e357] [cursor=pointer]:
                  - /url: /knowledge/materials/js-03-types-equality-copy-immutability.md/js-03#%E6%B5%85%E6%8B%B7%E8%B4%9D%E5%8F%AA%E5%A4%8D%E5%88%B6%E4%B8%80%E5%B1%82
                - text: 。
              - paragraph [ref=e358]: 反过来，闭包也不会自动跟随所有“最新状态”。如果某次调用先算出一个字符串，再让回调读取这个字符串，回调读取的就是那次计算结果。决定它是新是旧的，不是“用了闭包”四个字，而是它实际捕获哪个绑定、该绑定以后是否更新。
              - heading "两次创建会得到两份独立状态" [level=3] [ref=e359]
              - paragraph [ref=e360]: 同一次外层调用中创建的多个函数，可以共同使用同一组局部变量。再次调用外层函数，则会建立另一份。
              - generic [ref=e361]:
                - generic [ref=e362]:
                  - generic [ref=e363]: js
                  - button "复制代码" [ref=e364] [cursor=pointer]
                - code [ref=e366]: "function createCounter() { let count = 0; return { increment() { count += 1; }, read() { return count; }, }; } const first = createCounter(); const second = createCounter(); first.increment(); first.increment(); console.log(first.read()); // => 2 console.log(second.read()); // => 0"
              - paragraph [ref=e367]:
                - code [ref=e368]: first.increment
                - text: 和
                - code [ref=e369]: first.read
                - text: 是两个函数，但它们读取同一份
                - code [ref=e370]: count
                - text: 。
                - code [ref=e371]: second
                - text: 的两个方法来自第二次外层调用，使用另一份
                - code [ref=e372]: count
                - text: 。这是一种简单的封装方式：外部只能通过提供的方法访问状态，不能直接用
                - code [ref=e373]: first.count
                - text: 修改局部变量。
              - paragraph [ref=e374]:
                - text: 这种封装并不保证所有返回的数据都安全。如果
                - code [ref=e375]: read()
                - text: 返回一个内部可变对象，外部拿到它仍可能改动内部状态；“变量名不可直接访问”和“对象不可修改”是两回事。也不要在外层模块只创建一次实例，再误以为每个使用者拿到的都是新状态。需要隔离时，应明确在哪里调用创建函数。
              - paragraph [ref=e376]:
                - text: 此处的方法没有用到
                - code [ref=e377]: this
                - text: ，把
                - code [ref=e378]: first.read
                - text: 取出来单独调用也能工作。它读取的是词法环境里的
                - code [ref=e379]: count
                - text: 。如果方法写成
                - code [ref=e380]: return this.count
                - text: ，决定结果的就变成了调用方式；这个区别在
                - link "JS-02：先找到函数再看怎样调用" [ref=e381] [cursor=pointer]:
                  - /url: /knowledge/materials/js-02-prototype-object-model-this.md/js-02#%E5%85%88%E6%89%BE%E5%88%B0%E5%87%BD%E6%95%B0%E5%86%8D%E7%9C%8B%E6%80%8E%E6%A0%B7%E8%B0%83%E7%94%A8
                - text: 中展开。
              - heading "循环中的回调为什么会读到同一个数" [level=3] [ref=e382]
              - paragraph [ref=e383]: 闭包问题不一定要等待定时器才出现。先把函数放进数组，再在循环结束后调用，就能把变量问题单独看清楚。
              - generic [ref=e384]:
                - generic [ref=e385]:
                  - generic [ref=e386]: js
                  - button "复制代码" [ref=e387] [cursor=pointer]
                - code [ref=e389]:
                  - text: "const shared = []; for (var index = 0; index < 3; index += 1) { shared.push(() => index); } console.log(shared.map("
                  - generic [ref=e390]: (read) =>
                  - text: "read()).join(',')); // => 3,3,3 const separate = []; for (let index = 0; index < 3; index += 1) { separate.push(() => index); } console.log(separate.map("
                  - generic [ref=e391]: (read) =>
                  - text: read()).join(',')); // => 0,1,2
              - paragraph [ref=e392]:
                - text: 第一轮循环使用
                - code [ref=e393]: var
                - text: 。所有回调共享同一个
                - code [ref=e394]: index
                - text: ；等我们真正调用它们时，循环已经结束，这个变量的值是
                - code [ref=e395]: "3"
                - text: 。
              - paragraph [ref=e396]:
                - text: 第二轮在
                - code [ref=e397]: for
                - text: 头部使用
                - code [ref=e398]: let
                - text: 。JavaScript 为迭代建立各自的绑定，因此每个回调关联自己那一轮的
                - code [ref=e399]: index
                - text: 。这不是因为箭头函数能自动记住当前数字，两组代码都用了箭头函数；变化的是绑定的创建规则。
              - paragraph [ref=e400]:
                - text: 如果必须处理使用
                - code [ref=e401]: var
                - text: 的旧代码，可以在每一轮调用一个普通函数，把当前值作为参数传进去，让这次调用建立单独的参数绑定。原理和
                - code [ref=e402]: createCounter
                - text: 完全一致，不需要再背一套神秘口诀。若问题来自定时器，把“何时执行”交给
                - link "稍后执行的回调" [ref=e403] [cursor=pointer]:
                  - /url: /knowledge/materials/javascript-scheduled-callbacks.md/prejs-04
                - text: ，把“届时读哪个变量”留给作用域分析，两条线各自推清就够了。
              - heading "回调结束使用后要解除谁的引用" [level=3] [ref=e404]
              - paragraph [ref=e405]:
                - text: 闭包本身不是内存泄漏。一个计数器刻意保存
                - code [ref=e406]: count
                - text: ，就是它正常工作的方式。真正值得留意的是：业务已经不再需要回调，但事件系统、定时器或长期存在的集合仍然保存着它。
              - paragraph [ref=e407]:
                - text: 下面使用标准
                - code [ref=e408]: EventTarget
                - text: 模拟一个通知来源，不需要页面上预先存在按钮。订阅函数返回清理函数，让登记和撤销写在一起。
              - generic [ref=e409]:
                - generic [ref=e410]:
                  - generic [ref=e411]: js
                  - button "复制代码" [ref=e412] [cursor=pointer]
                - code [ref=e414]: "const events = new EventTarget(); function subscribeLabel(label) { function onChange() { console.log(label); // => 草稿已保存 } events.addEventListener('change', onChange); return () => events.removeEventListener('change', onChange); } const stop = subscribeLabel('草稿已保存'); events.dispatchEvent(new Event('change')); stop(); events.dispatchEvent(new Event('change'));"
              - paragraph [ref=e415]:
                - text: 第一次派发事件，监听器读取闭包中的
                - code [ref=e416]: label
                - text: 。调用
                - code [ref=e417]: stop()
                - text: 后，事件源不再保存这条监听，第二次派发不会输出。清理时使用的是原来的
                - code [ref=e418]: onChange
                - text: 函数；重新写一个内容相同的函数，会得到另一个函数对象，无法替代它。
              - paragraph [ref=e419]:
                - text: 还要继续问一层：我们是否仍把
                - code [ref=e420]: stop
                - text: 放在一个长期存在的数组中？清理函数自身也可能引用
                - code [ref=e421]: onChange
                - text: 。移除监听会断开事件源这一条引用，但其他引用若仍存在，对应对象仍可能保持可达。因此，清理完成后也应让过期订阅记录退出自己的集合。垃圾回收取决于对象是否仍然可达，而且不会承诺在某一行代码后立即执行。
              - generic [ref=e422]:
                - strong [ref=e423]: 把清理责任写在创建处
                - paragraph [ref=e424]:
                  - text: 凡是把函数交给一个比当前操作活得更久的系统，都顺手确认撤销入口。完整的“正常结束、提前退出、发生异常”清理模型，见
                  - link "JS-07：让资源的打开和关闭待在一起" [ref=e425] [cursor=pointer]:
                    - /url: /knowledge/materials/js-07-iteration-metaprogramming-resources.md/js-07#%E8%AE%A9%E8%B5%84%E6%BA%90%E7%9A%84%E6%89%93%E5%BC%80%E5%92%8C%E5%85%B3%E9%97%AD%E5%BE%85%E5%9C%A8%E4%B8%80%E8%B5%B7
                  - text: 。
              - heading "用一条线把概念连起来" [level=3] [ref=e426]
              - paragraph [ref=e427]: 分析一段涉及闭包的代码，可以按这样的次序阅读：函数在哪里定义；当前读取的名字属于哪一层作用域；那层作用域是哪次调用建立的；读取发生前，这个绑定或它指向的对象有没有变化；最后，是谁仍然持有这个函数。
              - paragraph [ref=e428]: 这条顺序比先判断“这算不算闭包”更实用。它同时解释了调用结束后的状态保留、同一实例中的共享状态、多实例隔离，以及回调的清理。调用栈帮助你跟踪执行过程，词法作用域帮助你找到变量，闭包则把函数与它仍可访问的环境连在一起。
              - paragraph [ref=e429]:
                - text: 接下来读
                - link "JS-02 原型、对象模型与 this" [ref=e430] [cursor=pointer]:
                  - /url: /knowledge/materials/js-02-prototype-object-model-this.md/js-02
                - text: 。你会遇到另一种容易混淆的查找：
                - code [ref=e431]: name
                - text: 沿作用域找变量，
                - code [ref=e432]: object.name
                - text: 沿对象及其原型找属性。先把两条路径分开，再看它们如何在方法调用中碰面。
              - heading "参考与延伸阅读" [level=3] [ref=e433]
              - list [ref=e434]:
                - listitem [ref=e435]:
                  - link "MDN：Closures ↗" [ref=e436] [cursor=pointer]:
                    - /url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures
                  - text: ——查阅词法环境、闭包共享状态和循环回调的更多说明。
                - listitem [ref=e437]:
                  - link "MDN：JavaScript execution model ↗" [ref=e438] [cursor=pointer]:
                    - /url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model
                  - text: ——进一步了解执行上下文、调用栈与宿主环境的关系。
                - listitem [ref=e439]:
                  - link "MDN：let ↗" [ref=e440] [cursor=pointer]:
                    - /url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let
                  - text: ——核对 TDZ 和
                  - code [ref=e441]: for
                  - text: 循环的逐轮绑定规则。
                - listitem [ref=e442]:
                  - link "MDN：Memory management ↗" [ref=e443] [cursor=pointer]:
                    - /url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Memory_management
                  - text: ——需要定位长期保留的数据时，再深入可达性和垃圾回收。
            - navigation "继续学习" [ref=e444]:
              - link "同组下一篇 → 原型与 this" [ref=e445] [cursor=pointer]:
                - /url: /knowledge/materials/js-02-prototype-object-model-this.md/js-02
                - generic [ref=e446]: 同组下一篇 →
                - strong [ref=e447]: 原型与 this
            - generic [ref=e448]:
              - generic [ref=e449]: 正文阅读超过 80% 仅标记资料看完，不改变知识点状态
              - button "返回上一页 →" [ref=e450] [cursor=pointer]
          - complementary [ref=e453]:
            - generic [ref=e454]:
              - generic [ref=e455]: 知识连接
              - paragraph [ref=e456]: 遇到疑惑时，跳到相关小节。返回后继续刚才的阅读。
              - link "JS-02 先找到函数再看怎样调用 ↗ 普通变量与 this 的查找方式不同。" [ref=e457] [cursor=pointer]:
                - /url: /knowledge/materials/js-02-prototype-object-model-this.md/js-02#%E5%85%88%E6%89%BE%E5%88%B0%E5%87%BD%E6%95%B0%E5%86%8D%E7%9C%8B%E6%80%8E%E6%A0%B7%E8%B0%83%E7%94%A8
                - generic [ref=e458]: JS-02
                - strong [ref=e459]: 先找到函数再看怎样调用 ↗
                - generic [ref=e460]: 普通变量与 this 的查找方式不同。
              - link "JS-03 赋值之后谁和谁共用对象 ↗ 捕获对象引用，不等于保存一份独立数据。" [ref=e461] [cursor=pointer]:
                - /url: /knowledge/materials/js-03-types-equality-copy-immutability.md/js-03#%E8%B5%8B%E5%80%BC%E4%B9%8B%E5%90%8E%E8%B0%81%E5%92%8C%E8%B0%81%E5%85%B1%E7%94%A8%E5%AF%B9%E8%B1%A1
                - generic [ref=e462]: JS-03
                - strong [ref=e463]: 赋值之后谁和谁共用对象 ↗
                - generic [ref=e464]: 捕获对象引用，不等于保存一份独立数据。
              - link "JS-07 让资源的打开和关闭待在一起 ↗ 把回调清理扩展到所有退出路径。" [ref=e465] [cursor=pointer]:
                - /url: /knowledge/materials/js-07-iteration-metaprogramming-resources.md/js-07#%E8%AE%A9%E8%B5%84%E6%BA%90%E7%9A%84%E6%89%93%E5%BC%80%E5%92%8C%E5%85%B3%E9%97%AD%E5%BE%85%E5%9C%A8%E4%B8%80%E8%B5%B7
                - generic [ref=e466]: JS-07
                - strong [ref=e467]: 让资源的打开和关闭待在一起 ↗
                - generic [ref=e468]: 把回调清理扩展到所有退出路径。
  - button "打开 Atlas AI 助手" [ref=e469] [cursor=pointer]:
    - generic [aria-hidden] [ref=e470]: ✦
    - generic [ref=e471]:
      - strong [ref=e472]: Atlas AI
      - generic [ref=e473]: 总结 · 解释 · 查资料
```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test';
  2   | import { mkdir } from 'node:fs/promises';
  3   | import { readB01Examples } from '../scripts/learning-material-examples.mjs';
  4   | 
  5   | const first = '/knowledge/materials/js-01-execution-context-scope-closure.md/js-01';
  6   | const third = '/knowledge/materials/js-03-types-equality-copy-immutability.md/js-03';
  7   | 
  8   | test('B01 正文全部示例在浏览器中的实际输出与讲义一致', async ({ page }) => {
  9   |   const examples = await readB01Examples();
  10  |   await page.goto(first);
  11  |   const results = await page.evaluate(async (items) => {
  12  |     const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  13  |     const results = [];
  14  |     for (const item of items) {
  15  |       const output: string[] = [];
  16  |       try {
  17  |         await new AsyncFunction('console', `"use strict";\n${item.code}`)({ log: (...args: unknown[]) => output.push(args.map(String).join(' ')) });
  18  |         results.push({ id: item.id, output, error: '' });
  19  |       } catch (error) {
  20  |         results.push({ id: item.id, output, error: String(error) });
  21  |       }
  22  |     }
  23  |     return results;
  24  |   }, examples);
  25  |   expect(results).toEqual(examples.map((item: { id: string; expected: string[] }) => ({ id: item.id, output: item.expected, error: '' })));
  26  | });
  27  | 
  28  | test('B01 小节交叉引用保留完整正文，后退恢复原来的阅读位置', async ({ page }) => {
  29  |   const materialRequests: string[] = [];
  30  |   page.on('request', request => {
  31  |     if (request.method() === 'GET' && request.url().includes('/api/v1/knowledge/materials/')) {
  32  |       materialRequests.push(new URL(request.url()).pathname);
  33  |     }
  34  |   });
  35  |   await page.setViewportSize({ width: 1440, height: 1000 });
  36  |   await page.goto(first);
  37  |   await expect(page.locator('[data-reader-ready]')).toBeVisible();
> 38  |   await expect(page.getByRole('navigation', { name: 'B01 阅读路线' }).getByRole('link')).toHaveCount(4);
      |                                                                                      ^ Error: expect(locator).toHaveCount(expected) failed
  39  |   const link = page.locator('.markdown-body a').filter({ hasText: 'JS-03：浅拷贝只复制一层' });
  40  |   await link.scrollIntoViewIfNeeded();
  41  |   const before = await page.evaluate(() => window.scrollY);
  42  |   await link.click();
  43  |   await expect(page).toHaveURL(`${third}#${encodeURIComponent('浅拷贝只复制一层')}`);
  44  |   const target = page.locator('.markdown-body h3').filter({ hasText: /^浅拷贝只复制一层$/ });
  45  |   await expect.poll(async () => Math.abs(((await target.boundingBox())?.y ?? Infinity) - 96)).toBeLessThan(8);
  46  |   await expect(page.locator('.markdown-body')).toContainText('先区分原始值和对象');
  47  |   await expect(page.locator('.material-hero h1')).toContainText('JS-03');
  48  |   await page.goBack();
  49  |   await expect(page).toHaveURL(first);
  50  |   await expect.poll(async () => Math.abs(await page.evaluate(() => window.scrollY) - before)).toBeLessThan(8);
  51  |   await expect(link).toBeInViewport();
  52  |   // 路径已由 App 的 key 决定实例身份，离场实例不应重复请求下一篇正文。
  53  |   expect(materialRequests.filter(path => path.includes('js-03-types-equality'))).toHaveLength(1);
  54  |   expect(materialRequests.filter(path => path.includes('js-01-execution-context'))).toHaveLength(2);
  55  | 
  56  |   await page.locator('.toc-rail').getByRole('button', { name: '闭包让函数继续访问创建处的变量', exact: true }).click();
  57  |   await expect(page).toHaveURL(`${first}#${encodeURIComponent('闭包让函数继续访问创建处的变量')}`);
  58  |   await expect.poll(async () => (await page.locator('.markdown-body h3').filter({ hasText: /^闭包让函数继续访问创建处的变量$/ }).boundingBox())?.y).toBeCloseTo(96, 0);
  59  | });
  60  | 
  61  | test('B01 旧小节入口和刷新都保留完整讲义与准确定位', async ({ page }) => {
  62  |   const progressWrites: string[] = [];
  63  |   page.on('request', (request) => {
  64  |     if (request.method() !== 'GET' && request.url().includes('js-03-types-equality-copy-immutability.md/js-03/progress')) progressWrites.push(request.url());
  65  |   });
  66  |   const section = encodeURIComponent('赋值之后谁和谁共用对象');
  67  |   await page.goto(`/knowledge/materials/js-03-types-equality-copy-immutability.md/${section}`);
  68  |   await expect(page).toHaveURL(`${third}#${section}`);
  69  |   const heading = page.locator('.markdown-body h3').filter({ hasText: /^赋值之后谁和谁共用对象$/ });
  70  |   await expect.poll(async () => Math.abs(((await heading.boundingBox())?.y ?? Infinity) - 96)).toBeLessThan(8);
  71  |   await page.reload();
  72  |   await expect.poll(async () => Math.abs(((await heading.boundingBox())?.y ?? Infinity) - 96)).toBeLessThan(8);
  73  |   expect(progressWrites).toHaveLength(0);
  74  |   await page.locator('.toc-rail').getByRole('button', { name: '从头阅读本篇 →' }).click();
  75  |   await expect(page).toHaveURL(third);
  76  |   await expect(page.locator('.section-visit-note')).toHaveCount(0);
  77  |   await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  78  |   await expect(page.locator('.chapter-pagination')).toContainText('迭代、代理与资源');
  79  |   await page.locator('.chapter-pagination a').last().click();
  80  |   await expect(page).toHaveURL(/\/js-07$/);
  81  |   await expect(page.locator('.concept-connections a')).toHaveCount(3);
  82  | });
  83  | 
  84  | test('B01 桌面与手机阅读、目录和代码复制可用', async ({ page }) => {
  85  |   await mkdir('../../tmp/b01-review', { recursive: true });
  86  |   await page.setViewportSize({ width: 1440, height: 1000 });
  87  |   await page.goto(first);
  88  |   await expect(page.locator('[data-reader-ready]')).toBeVisible();
  89  |   await page.screenshot({ path: '../../tmp/b01-review/b01-desktop.png' });
  90  |   await page.setViewportSize({ width: 390, height: 844 });
  91  |   await page.screenshot({ path: '../../tmp/b01-review/b01-mobile.png' });
  92  |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  93  |   await page.getByRole('button', { name: '打开本页目录' }).click();
  94  |   await page.locator('.toc-rail').getByRole('button', { name: '从一次函数调用看起', exact: true }).click();
  95  |   await expect(page.locator('.toc-rail')).not.toBeVisible();
  96  |   // 浏览器允许半像素布局；定位到目标顶部 1px 内即可验证滚动行为。
  97  |   await expect.poll(async () => {
  98  |     const box = await page.locator('.markdown-body h3').filter({ hasText: /^从一次函数调用看起$/ }).boundingBox();
  99  |     return box ? Math.abs(box.y - 96) : Infinity;
  100 |   }).toBeLessThanOrEqual(1);
  101 |   const code = page.locator('.code-block').first();
  102 |   await code.getByRole('button', { name: '复制代码' }).click();
  103 |   await expect(code.getByRole('button', { name: '已复制' })).toBeVisible();
  104 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  105 |   await page.screenshot({ path: '../../tmp/b01-review/b01-example-mobile.png' });
  106 | });
  107 | 
  108 | 
```