# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: framework-entry.spec.ts >> VUE-01 小节查阅、复制、滚动和阅读阈值
- Location: e2e/framework-entry.spec.ts:55:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-reader-ready="true"]')
Expected: visible
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('[data-reader-ready="true"]') with timeout 5000ms
  - waiting for locator('[data-reader-ready="true"]')
  - Test timeout of 30000ms exceeded.

```

```yaml
- link "跳到主要内容":
  - /url: "#main-content"
- navigation "主导航":
  - list:
    - listitem:
      - link "学习台":
        - /url: /
        - strong: 学习台
    - listitem:
      - link "知识体系":
        - /url: /knowledge/map
        - strong: 知识体系
    - listitem:
      - link "笔记中心":
        - /url: /notes
        - strong: 笔记中心
    - listitem:
      - link "核心路线":
        - /url: /plan
        - strong: 核心路线
    - listitem:
      - link "求职支线":
        - /url: /jobs
        - strong: 求职支线
- banner:
  - text: 中文学习资料
  - button "快速查找，快捷键 Command 或 Control 加 K"
  - link "设置与数据":
    - /url: /settings
- main:
  - paragraph: 中文学习资料页面已打开
  - main:
    - region "我的下一步":
      - heading "我的下一步" [level=2]
      - link "查看学习路线":
        - /url: /plan
      - text: 框架方向
      - combobox "框架方向":
        - option "尚未选择"
        - option "React"
        - option "Vue"
        - option "暂不进入框架" [selected]
      - button "保存方向"
      - paragraph: 选择只影响推荐，不改变当前学习点、暂缓状态或阅读进度。
      - status: 按当前偏好与学习记录推荐；可自由查阅其他资料。
      - link "继续学习 · VUE-01 →":
        - /url: /knowledge/VUE-01
      - paragraph: 保留当前学习点 VUE-01，它位于其他方向。
      - list:
        - listitem:
          - link "WEB-01":
            - /url: /knowledge/WEB-01
          - text: · 建议补齐此基础
      - group: 本次已审范围：共同基础与一个可选框架方向
      - link "浏览全部资料":
        - /url: /knowledge
    - navigation "讲义操作":
      - button "← 返回上一页"
      - button "复制本页链接"
    - navigation "切换学习批次":
      - link "B01":
        - /url: /knowledge/materials/js-01-execution-context-scope-closure.md/js-01
      - link "B02":
        - /url: /knowledge/materials/cs-01-complexity-scale-engineering-cost.md/cs-01
      - link "B03":
        - /url: /knowledge/materials/js-05-promise-errors-async-control-flow.md/js-05
      - link "B04":
        - /url: /knowledge/materials/ts-03-generics-constraints-keyof-indexed-access.md/ts-03
      - link "B05":
        - /url: /knowledge/materials/react-02-component-boundaries-data-flow-composition.md/react-02
      - link "B06":
        - /url: /knowledge/materials/react-04-effects-external-sync-cleanup.md/react-04
      - link "B07":
        - /url: /knowledge/materials/react-06-reducer-context-state-domains.md/react-06
      - link "B08":
        - /url: /knowledge/materials/vue-07-router-navigation-boundaries.md/vue-07
      - link "B09":
        - /url: /knowledge/materials/git-01-object-index-references-recovery.md/git-01
      - link "B10":
        - /url: /knowledge/materials/eng-01-module-graph-build-output-source-maps.md/eng-01
      - link "B11":
        - /url: /knowledge/materials/test-01-test-design-oracles-properties-mutation.md/test-01
      - link "B12":
        - /url: /knowledge/materials/career-02-architecture-diagrams-boundaries-adrs.md/career-02
      - link "B13":
        - /url: /knowledge/materials/a11y-01-wcag-testing-governance.md/a11y-01
      - link "B14":
        - /url: /knowledge/materials/web-05-web-components-shadow-dom-interoperability.md/web-05
      - link "B15":
        - /url: /knowledge/materials/sec-04-cross-origin-isolation-embedding-permissions.md/sec-04
      - link "B16":
        - /url: /knowledge/materials/ts-05-conditional-infer-distribution.md/ts-05
      - link "B17":
        - /url: /knowledge/materials/identity-01-session-cookie-token-browser-boundaries.md/identity-01
      - link "B18":
        - /url: /knowledge/materials/node-01-runtime-event-loop-nonblocking-io.md/node-01
      - link "B19":
        - /url: /knowledge/materials/aidev-02-context-engineering-repository-instructions.md/aidev-02
      - link "B20":
        - /url: /knowledge/materials/biz-03-rbac-abac-data-permissions.md/biz-03
      - link "B21":
        - /url: /knowledge/materials/biz-08-requirement-acceptance-traceability.md/biz-08
      - link "B22":
        - /url: /knowledge/materials/data-01-server-state-cache-keys-invalidation-deduplication.md/data-01
      - link "B23":
        - /url: /knowledge/materials/comp-02-controlled-uncontrolled-state-imperative.md/comp-02
      - link "B24":
        - /url: /knowledge/materials/linux-02-process-port-log-network-diagnostics.md/linux-02
      - link "B25":
        - /url: /knowledge/materials/eng-06-ci-cd-artifact-promotion-release-rollback.md/eng-06
      - link "B26":
        - /url: /knowledge/materials/perf-02-network-resource-loading-cache-optimization.md/perf-02
      - link "B27":
        - /url: /knowledge/materials/h5-02-scroll-soft-keyboard-pointer-gestures.md/h5-02
      - link "B28":
        - /url: /knowledge/materials/aisafe-01-output-validation-content-safety-guardrails.md/aisafe-01
      - link "B29":
        - /url: /knowledge/materials/aiapp-03-structured-output-schema-validation.md/aiapp-03
      - link "B30":
        - /url: /knowledge/materials/aiapp-06-rag-citations-source-trust.md/aiapp-06
      - link "B31":
        - /url: /knowledge/materials/aiapp-10-ai-interaction-trust-recovery.md/aiapp-10
      - link "B32":
        - /url: /knowledge/materials/agent-03-mcp-transport-stateless-state-versioning.md/agent-03
      - link "B33":
        - /url: /knowledge/materials/agent-08-tool-contract-schema-discoverability.md/agent-08
      - link "B34":
        - /url: /knowledge/materials/aidev-07-dependency-source-security.md/aidev-07
      - link "B35":
        - /url: /knowledge/materials/arch-02-technical-proposal-adr-review.md/arch-02
    - navigation "B04 旧分组浏览":
      - text: B04 · 兼容阅读分组
      - strong: 从类型关系走到页面与组件
      - list:
        - listitem:
          - link "01 TS-03 泛型与键值关系":
            - /url: /knowledge/materials/ts-03-generics-constraints-keyof-indexed-access.md/ts-03
            - text: 01 TS-03
            - strong: 泛型与键值关系
        - listitem:
          - link "02 WEB-01 HTML 语义与表单":
            - /url: /knowledge/materials/web-01-html-semantics-forms-accessibility.md/web-01
            - text: 02 WEB-01
            - strong: HTML 语义与表单
        - listitem:
          - link "03 REACT-01 React 渲染与快照":
            - /url: /knowledge/materials/react-01-render-purity-state-snapshot.md/react-01
            - text: 03 REACT-01
            - strong: React 渲染与快照
        - listitem:
          - link "04 VUE-01 Vue 项目与 SFC":
            - /url: /knowledge/materials/vue-01-vite-sfc-project-structure.md/vue-01
            - text: 04 VUE-01
            - strong: Vue 项目与 SFC
        - listitem:
          - link "05 VUE-02 Vue 响应式与派生值":
            - /url: /knowledge/materials/vue-02-ref-reactive-computed-boundaries.md/vue-02
            - text: 05 VUE-02
            - strong: Vue 响应式与派生值
    - region "框架入口基础":
      - heading "从一个框架开始" [level=2]
      - paragraph: 选择你要学的入口；无需先学另一个框架。熟悉下列基础可直接继续，查看链接不会更改当前学习点、学完或暂缓状态。
      - article:
        - heading "VUE-01 · 学习中" [level=3]
        - link "详情与练习":
          - /url: /knowledge/VUE-01
        - link "阅读讲义":
          - /url: /knowledge/materials/vue-01-vite-sfc-project-structure.md/vue-01
        - list:
          - listitem:
            - link "补学 WEB-01":
              - /url: /knowledge/WEB-01?entryReturn=VUE-01
            - text: · 未开始，可按需补学 HTML、按钮和挂载容器：读懂最终页面与用户事件。
      - text: 查阅不等于掌握；正文说明每项基础的用途。TS-03、Router 和跨框架对照不是入口门槛。个人推荐只采用所选方向；旧分组仅供浏览。
    - paragraph: B04 · 第 4 / 5 篇 · VUE-01
    - heading "VUE-01 Vite 脚手架、SFC 与项目结构" [level=1]
    - text: 沿 HTML、入口和组件追踪页面，厘清开发、构建与配置的责任。
    - term: 预计阅读
    - definition: 31 分钟
    - term: 阅读状态
    - definition: 已读 5%
    - button "打开本页目录"
    - article:
      - text: 这一篇，读懂一个问题
      - heading "浏览器不认识 .vue，页面是怎样出现的？" [level=2]
      - list:
        - listitem: 追踪 main.ts 到组件挂载的完整路径
        - listitem: 区分模块生命周期与组件实例
        - listitem: 正确理解别名、公开环境变量、资源与生产产物
      - article "Markdown 内容":
        - paragraph:
          - text: 第一次打开 Vue 项目，目录里有
          - code: index.html
          - text: 、
          - code: main.ts
          - text: 、
          - code: App.vue
          - text: 、几份配置和一个依赖锁文件。浏览器明明不认识
          - code: .vue
          - text: ，页面却能显示；开发时能访问的
          - code: /api
          - text: ，构建以后却可能找不到。要理解这些现象，先把“谁读这个文件、什么时候处理它、最后交给谁”说清楚。
        - paragraph: 本篇沿一张资料卡片从源码到页面的过程，认识 Vue 项目的入口、单文件组件、构建工具与目录边界。先看见一条能追踪的路径，再逐步加入别名、资源和环境配置。
        - heading "学习前先确认" [level=3]
        - paragraph: 本篇已更新为 framework-entry-v2：新增固定工程与操作协议，旧笔记、阅读进度和完成状态保留；旧考核仍按原合同查看。熟悉以下基础可直接继续，查阅不等于掌握。
        - list:
          - listitem:
            - text: 推荐补读：
            - link "JS-06 模块边界":
              - /url: /knowledge/materials/js-06-es-modules-module-boundaries.md/js-06#%E7%94%A8%E4%B8%A4%E4%B8%AA%E6%96%87%E4%BB%B6%E5%BB%BA%E7%AB%8B%E5%85%AC%E5%BC%80%E5%85%A5%E5%8F%A3
            - text: 。本篇只用静态导入，不要求先掌握动态导入、Promise 错误与资源清理整条链。
          - listitem:
            - text: 直接前置：
            - link "WEB-01":
              - /url: /knowledge/materials/web-01-html-semantics-forms-accessibility.md/web-01
            - text: 。HTML 元素、按钮与挂载容器：读懂组件输出。
        - paragraph:
          - text: 本文采用 Vue 3 的组合式 API 与
          - code: <script setup lang="ts">
          - text: 。例子沿用常见的 Vite 项目结构；脚手架的选项、Node.js 要求与默认配置会随版本变化，创建新项目时以对应版本的官方说明为准。读懂角色比背下一份特定版本的生成清单更有用。
        - paragraph:
          - text: 本篇先就地读懂模块记号：
          - code: export default
          - text: 导出一个默认值，
          - code: import App from './App'
          - text: 取这个默认值，名称由导入方命名；
          - code: "import { useState } from 'react'"
          - text: 或
          - code: "import { ref } from 'vue'"
          - text: 取库中同名导出。相对路径从当前文件所在目录解析，裸包名由工程工具从依赖解析。导入的组件交给框架创建实例，不是复制粘贴模块源码。每个模块实例通常只求值一次，组件函数或 setup 则可按实例执行多次。后文沿这些规则追踪入口，不使用动态 import。
        - heading "建立可复现的练习工程" [level=3]
        - paragraph:
          - text: 新建一个独立空目录（例如
          - code: framework-entry-lab
          - text: ），不要覆盖已有项目。使用 Node 22.14.0，按以下路径创建文件，再运行
          - code: npm install
          - text: 、
          - code: npm run typecheck
          - text: 、
          - code: npm run build
          - text: 、
          - code: npm run dev -- --host 127.0.0.1
          - text: 。安装后保留生成的 package-lock.json，复现时用
          - code: npm ci
          - text: 。组件源码和浏览器结果作为练习提交正文；站内 JavaScript/TypeScript 自检不提供 React/Vue DOM 运行环境，不能把 TSX/SFC 直接当普通脚本执行。站内断言只能补充核对已取得的结果，不能替代工程类型、构建与浏览器证据。这些是本篇固定版本，不代表最新版本或升级建议。
        - paragraph:
          - code: package.json
          - text: ：
        - text: json
        - button "复制代码"
        - code: "{ \"private\": true, \"type\": \"module\", \"scripts\": { \"dev\": \"vite\", \"typecheck\": \"vue-tsc --noEmit\", \"build\": \"vite build\", \"preview\": \"vite preview\" }, \"dependencies\": { \"vue\": \"3.5.43\" }, \"devDependencies\": { \"typescript\": \"5.7.3\", \"vite\": \"6.4.4\", \"@vitejs/plugin-vue\": \"5.2.4\", \"vue-tsc\": \"2.2.12\", \"@types/node\": \"22.10.5\" } }"
        - paragraph:
          - code: tsconfig.json
          - text: ：
        - text: json
        - button "复制代码"
        - code: "{ \"compilerOptions\": { \"target\": \"ES2022\", \"module\": \"ESNext\", \"moduleResolution\": \"Bundler\", \"strict\": true, \"skipLibCheck\": true, \"noEmit\": true, \"lib\": [ \"ES2022\", \"DOM\" ], \"types\": [ \"vite/client\" ], \"baseUrl\": \".\", \"paths\": { \"@/*\": [ \"src/*\" ] } }, \"include\": [ \"src\" ] }"
        - paragraph:
          - code: vite.config.ts
          - text: 使用下方“别名需要让构建工具和类型工具指向同一处”的完整配置；
          - code: index.html
          - text: 、
          - code: src/main.ts
          - text: 使用入口章节文件；
          - code: src/ReadingCard.vue
          - text: 和
          - code: src/App.vue
          - text: 使用“两张独立的资料卡片”版本。根目录只创建
          - code: .env
          - text: 这一份环境文件，写入以下公开练习值，供开发和构建共同使用。不要创建
          - code: .env.local
          - text: 或模式文件，也不要在启动命令的环境中设置这两个变量，避免覆盖练习值：
        - text: dotenv
        - button "复制代码"
        - code: VITE_API_BASE=/api VITE_SHOW_READING_TIPS=false
        - paragraph:
          - code: src/public-config.ts
          - text: 使用公开配置章节的完整文件，并在 App.vue 中导入、显示（见“固定入口练习与单变量排错”）。本项目无 Router、Pinia 或后端，不发网络请求。
          - code: /api
          - text: 仅是要观察的公开字符串。不要复制后文代理配置覆盖别名配置；代理与资源章节属于延伸阅读，不是本次首考工程必需设置。
        - heading "脚手架先帮你准备工具和入口" [level=3]
        - paragraph: 本篇直接使用上方固定文件建立练习工程。也可以参考文末 Vue 官方快速上手使用创建工具；该路径的交互选项会随版本变化，不属于本篇固定复现协议。选择 TypeScript 时可暂不加入 Router 和 Pinia，等需要路由或共享状态时再学习它们。
        - paragraph: 选择一项功能，会增加相应依赖、配置与文件。它不会自动替你决定页面应该怎样拆分。已有项目则先使用仓库指定的包管理器和锁文件，不要为了对齐示例重新创建整个工程。
        - paragraph:
          - text: 打开
          - code: package.json
          - text: 的 scripts，找出下面几项分别由什么命令实现。不同模板可能叫
          - code: type-check
          - text: 或
          - code: typecheck
          - text: ，不要只靠名字猜：
        - table:
          - rowgroup:
            - row "工作 常见命令 实际做什么":
              - columnheader "工作"
              - columnheader "常见命令"
              - columnheader "实际做什么"
          - rowgroup:
            - row "开发 vite 启动开发服务器，提供源码转换与热更新":
              - cell "开发"
              - cell "vite":
                - code: vite
              - cell "启动开发服务器，提供源码转换与热更新"
            - row "类型检查 vue-tsc 配合项目配置 检查 TypeScript 与 Vue 模板类型":
              - cell "类型检查"
              - cell "vue-tsc 配合项目配置":
                - code: vue-tsc
                - text: 配合项目配置
              - cell "检查 TypeScript 与 Vue 模板类型"
            - row "构建 vite build 生成部署所需文件，通常放进 dist":
              - cell "构建"
              - cell "vite build":
                - code: vite build
              - cell "生成部署所需文件，通常放进 dist"
            - row "预览 vite preview 在本地服务已经生成的 dist":
              - cell "预览"
              - cell "vite preview":
                - code: vite preview
              - cell "在本地服务已经生成的 dist"
        - paragraph:
          - text: 有的模板把类型检查和构建组合成一条
          - code: build
          - text: ，有的分开。只有真正读过脚本，才能知道“build 成功”包含哪些检查。预览工具用于本地查看产物，正式环境的服务器、缓存和访问规则还需部署配置承担。
        - heading "沿三个文件找到页面入口" [level=3]
        - paragraph: 先忽略复杂目录。下面三个文件就能解释一张资料卡片怎样出现。它们需要处在已有 Vue + Vite + TypeScript 项目中，保留脚手架的依赖和 Vue 插件配置。
        - paragraph:
          - text: 项目根目录的
          - code: index.html
          - text: ：
        - text: html
        - button "复制代码"
        - code: <!doctype html> <html lang="zh-CN"> <head> <meta charset="UTF-8"> <title>我的阅读室</title> </head> <body> <div id="app"></div> <script type="module" src="/src/main.ts"></script> </body> </html>
        - paragraph:
          - code: src/main.ts
          - text: ：
        - text: ts
        - button "复制代码"
        - code: "import { createApp } from 'vue'; import App from './App.vue'; createApp(App).mount('#app');"
        - paragraph:
          - code: src/App.vue
          - text: ：
        - text: vue
        - button "复制代码"
        - code: "<script setup lang=\"ts\"> const lesson = { title: 'HTML 语义与表单', minutes: 25 }; </script> <template> <main class=\"reading-room\"> <h1>我的阅读室</h1> <article> <h2>{{ lesson.title }}</h2> <p>预计用时：{{ lesson.minutes }} 分钟</p> </article> </main> </template> <style scoped> .reading-room { max-width: 56rem; margin: 3rem auto; padding: 0 2rem; } article { padding: 1.5rem; border: 1px solid #ccdcd3; border-radius: 12px; } h2 { margin-top: 0; } </style>"
        - paragraph:
          - text: 页面应显示“我的阅读室”和一张预计 25 分钟的资料卡片。先检查
          - code: index.html
          - text: 的容器 ID 与
          - code: mount('#app')
          - text: 是否一致，再看模块导入的文件是否存在，就能定位许多空白页问题。
        - paragraph:
          - text: 入口链可以写成：浏览器取得 HTML → 加载
          - code: main.ts
          - text: 对应的模块 → 模块导入
          - code: App.vue
          - text: 的编译结果 →
          - code: createApp
          - text: 创建应用 →
          - code: mount
          - text: 把组件挂到容器。这是模块加载与组件创建共同完成的过程，不是浏览器直接理解 TypeScript 或
          - code: .vue
          - text: 。
        - paragraph:
          - text: 把
          - code: App.vue
          - text: 标题改成“本周阅读”，观察页面更新；再把
          - code: mount
          - text: 的目标误写成不存在的 ID，观察警告和空白结果，最后恢复。这样的对照能说明每个文件的责任，比反复重装依赖更直接。
        - heading "SFC 把同一组件的代码放在一起" [level=3]
        - paragraph:
          - strong:
            - text: 单文件组件（single-file component
            - button "播放“single-file component”的美式发音"
            - text: ）
          - text: 通常简称
          - strong: SFC
          - button "播放“SFC”的美式发音"
          - text: 。一个
          - code: .vue
          - text: 文件把模板、逻辑和样式放在一起，是因为它们共同描述同一个组件。
        - table:
          - rowgroup:
            - row "区块 写什么 处理后去哪里":
              - columnheader "区块"
              - columnheader "写什么"
              - columnheader "处理后去哪里"
          - rowgroup:
            - row "template 页面结构、文本与绑定 编译成 Vue 可执行的渲染逻辑":
              - cell "template"
              - cell "页面结构、文本与绑定"
              - cell "编译成 Vue 可执行的渲染逻辑"
            - row "script setup 导入、实例内逻辑与暴露给模板的绑定 转成组件的 setup 相关代码":
              - cell "script setup"
              - cell "导入、实例内逻辑与暴露给模板的绑定"
              - cell "转成组件的 setup 相关代码"
            - row "style 组件样式 由构建工具处理并交给浏览器":
              - cell "style"
              - cell "组件样式"
              - cell "由构建工具处理并交给浏览器"
        - paragraph:
          - text: 模板的双大括号插入文本，冒号如
          - code: :minutes="25"
          - text: 绑定表达式，
          - code: "@click"
          - text: 绑定事件处理。这些是 Vue 模板语法，最终仍要得到普通 DOM。SFC 的存在没有改变
          - link "HTML 控件语义":
            - /url: /knowledge/materials/web-01-html-semantics-forms-accessibility.md/web-01#%E9%93%BE%E6%8E%A5%E8%B4%9F%E8%B4%A3%E5%8E%BB%E5%93%AA%E9%87%8C%E6%8C%89%E9%92%AE%E8%B4%9F%E8%B4%A3%E5%81%9A%E4%BB%80%E4%B9%88
          - text: 。
        - paragraph: 这与“把页面所有东西塞进一个文件”不同。一张资料卡片适合独立组件，整套账户系统却不应只因能放进一个 SFC 就放进去。拆分依据是责任和变化，而不是模板超过某个机械行数。
        - paragraph: 也不要把 script setup 当成浏览器生命周期事件。它不等于“页面加载完成后执行”，其中的 DOM 可能还没有挂载。需要读实际节点时，要结合挂载时机与模板引用。
        - heading "模块执行一次与每个实例执行不是一回事" [level=3]
        - paragraph:
          - text: 在同一模块实例中，普通模块顶层通常只求值一次；组件可以创建多个实例。
          - code: script setup
          - text: 中需要按实例执行的逻辑会进入组件 setup，顶层 import 仍属于模块导入。
        - paragraph:
          - text: 创建
          - code: src/ReadingCard.vue
          - text: ：
        - text: vue
        - button "复制代码"
        - code: "<script setup lang=\"ts\"> import { ref } from 'vue'; defineProps<{ title: string; minutes: number }>(); const expanded = ref(false); </script> <template> <article> <h2>{{ title }}</h2> <button type=\"button\" :aria-expanded=\"expanded\" @click=\"expanded = !expanded\"> {{ expanded ? '收起说明' : '展开说明' }} </button> <p v-if=\"expanded\">这份资料预计需要 {{ minutes }} 分钟。</p> </article> </template>"
        - paragraph:
          - text: 再将
          - code: src/App.vue
          - text: 替换为：
        - text: vue
        - button "复制代码"
        - code: <script setup lang="ts"> import ReadingCard from './ReadingCard.vue'; </script> <template> <main> <h1>两张独立的资料卡片</h1> <ReadingCard title="HTML 表单" :minutes="25" /> <ReadingCard title="状态快照" :minutes="30" /> </main> </template>
        - paragraph:
          - text: 点击第一张卡片的“展开说明”，第二张仍收起。因为
          - code: expanded
          - text: 在各自 setup 中创建，每个组件实例有自己的 ref。ref(false) 创建初始值为 false 的响应式容器；脚本中用 expanded.value 读写，模板会自动解包，所以模板中 expanded = !expanded 能切换布尔值。v-if 只在为真时创建说明段落；@click 绑定点击处理。更新后 Vue 安排 DOM 更新，不要求你先读 VUE-02 的依赖追踪实现。
        - paragraph: 如果把这个可变 ref 移到单独模块顶层再让两个组件共同导入，就变成共享状态。共享可以是需求，也可以是 bug，区别取决于谁应该拥有这份数据。服务端渲染还涉及多个请求之间的隔离，不能随意把用户状态放进进程共享模块。
        - paragraph:
          - code: defineProps
          - text: 是编译器宏，不需要从 Vue 导入，也不能当成任意位置都可调用的普通函数。同类宏如
          - code: defineEmits
          - text: 用于声明组件边界；它们的详细用法在后续组件知识点展开。需要回顾模块绑定与缓存时，阅读
          - link "JS-06 的模块求值":
            - /url: /knowledge/materials/js-06-es-modules-module-boundaries.md/js-06#%E6%A8%A1%E5%9D%97%E5%9B%BE%E4%B8%8D%E6%98%AF%E6%8A%8A%E4%BB%A3%E7%A0%81%E6%8C%89%E6%96%87%E5%AD%97%E9%A1%BA%E5%BA%8F%E7%B2%98%E8%B5%B7%E6%9D%A5
          - text: 。
        - heading "Vite 开发与生产使用同一份源码但处理方式不同" [level=3]
        - paragraph:
          - text: 开发时，Vite 根据浏览器请求转换源码，并利用模块关系更新受影响部分。改变一个组件，不必把整个生产包重新生成后再刷新页面。依赖还可能经过
          - strong:
            - text: 依赖预构建（dependency pre-bundling
            - button "播放“dependency pre-bundling”的美式发音"
            - text: ）
          - text: ，处理模块格式或过多小模块带来的开发加载成本。
        - paragraph: 生产构建会从入口分析依赖图，转换、分块和优化，输出可以部署的 HTML、JavaScript、CSS 与资源。具体内部构建器会随 Vite 版本变化，本篇不把某个实现名字写成永久规则。
        - paragraph: 因此，“开发能运行”与“产物能部署”是相关但不同的结论。例如源码中使用仅开发存在的代理地址，开发访问正常；构建后静态文件并不会随身携带那台代理。又如 Windows 上不易察觉的文件名大小写错误，放到大小写敏感的环境可能导致模块或资源找不到。
        - paragraph: 遇到错误，先判断发生在源码转换、类型检查、模块解析、产物生成，还是浏览器加载阶段。只有确认阶段，下一步查看控制台、终端或网络请求才有方向。
        - heading "目录随职责增长不必一开始就铺满层级" [level=3]
        - paragraph: 刚才三个文件的项目不需要提前创建几十个空目录。功能多起来后，可以围绕一条真实变化路线组织：
        - text: text
        - button "复制代码"
        - code: src/ main.ts App.vue app/ 路由与应用装配 features/ reading/ ReadingPage.vue 阅读页面，组合本功能的组件 ReadingCard.vue 资料卡片 reading-service.ts 本功能的数据读取与解析 index.ts 需要对外公开的入口 components/ 多个业务确实共用的展示组件 styles/ 全局颜色、排版与基础样式
        - paragraph: “页面”通常负责取得页面需要的参数与数据，并组合功能；“组件”负责可独立理解的一块界面；“服务”把网络响应转换为应用需要的数据。不要仅靠把文件放进 services 就认为外部数据已经可信，解析仍需要实际代码。
        - paragraph: 如果修改一张资料卡片总要穿过全局 components、utils、stores 中很多不相关文件，按业务就近组织可能更容易维护。反过来，一段只使用一次的两行函数，没有必要为了目录整齐拆到公共工具包。
        - paragraph:
          - text: 跨功能访问优先经过明确入口。别名能缩短路径，却不应让调用方深入另一个功能的内部实现。这里与
          - link "JS-06 的公共导出":
            - /url: /knowledge/materials/js-06-es-modules-module-boundaries.md/js-06#%E5%85%AC%E5%85%B1%E5%AF%BC%E5%87%BA%E5%BA%94%E8%AF%A5%E5%B0%8F%E4%BA%8E%E5%86%85%E9%83%A8%E5%AE%9E%E7%8E%B0
          - text: 遵循相同原则。
        - paragraph: 如果项目加入 Router，可以按“main 安装路由 → App 提供路由出口 → 路由表选择页面 → 页面组合组件”继续追踪。页面文件不会因为放进 pages 目录就自动成为路由，具体注册规则由所用工具决定。
        - heading "别名需要让构建工具和类型工具指向同一处" [level=3]
        - paragraph:
          - text: 当目录加深，
          - code: "@/features/reading/ReadingPage.vue"
          - text: 比多层
          - code: ../../
          - text: 更容易辨认，但
          - code: "@"
          - text: 不是 JavaScript 内置语法。下面是包含 Vue 插件与别名的完整 Vite 配置示意，合并到已有配置时保留项目其他必需插件：
        - text: ts
        - button "复制代码"
        - code: "import { fileURLToPath, URL } from 'node:url'; import { defineConfig } from 'vite'; import vue from '@vitejs/plugin-vue'; export default defineConfig({ plugins: [vue()], resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }, }, });"
        - paragraph:
          - text: 还要让检查应用源码的 TypeScript 配置解析同一位置。例如在已有
          - code: tsconfig.app.json
          - text: 的
          - code: compilerOptions
          - text: 中合并以下内容，而不是把整份生成配置删掉重写：
        - text: json
        - button "复制代码"
        - code: "{ \"baseUrl\": \".\", \"paths\": { \"@/*\": [\"src/*\"] } }"
        - paragraph: 路径相对于这份配置的位置解释；配置不在项目根目录时，应相应调整。TypeScript 的 paths 帮助类型解析，不会替你改写运行时的 import。只配它可能编辑器通过但构建失败；只配 Vite 则可能页面可用而编辑器找不到类型。
        - paragraph:
          - text: Vite 配置运行在工具环境，可以导入
          - code: node:url
          - text: ；浏览器里的组件不能因此使用全部 Node API。遇到 node 模块类型缺失，还应确认脚手架的 Node 类型与配置检查范围，别把工具配置硬塞进只面向 DOM 的类型环境。
        - heading "环境变量进入客户端以后就是公开配置" [level=3]
        - paragraph:
          - text: API 的公开地址、显示开关等可以随环境变化。Vite 通过
          - code: import.meta.env
          - text: 提供这些信息，自定义变量默认需要
          - code: VITE_
          - text: 前缀才暴露给客户端；前缀也可以由项目配置调整。
        - paragraph:
          - text: 继续使用建立工程时的根目录
          - code: .env
          - text: ，其中
          - code: VITE_API_BASE=/api
          - text: 、
          - code: VITE_SHOW_READING_TIPS=false
          - text: ；此处不新增环境文件。
        - paragraph:
          - text: 创建一个可在组件中导入的
          - code: src/public-config.ts
          - text: ：
        - text: ts
        - button "复制代码"
        - code: "const apiBase = import.meta.env.VITE_API_BASE?.trim(); if (!apiBase) throw new Error('缺少公开 API 地址 VITE_API_BASE'); const tipsFlag = import.meta.env.VITE_SHOW_READING_TIPS; if (tipsFlag !== undefined && tipsFlag !== 'true' && tipsFlag !== 'false') { throw new Error('VITE_SHOW_READING_TIPS 应为 true 或 false'); } export const publicConfig = { apiBase, showReadingTips: tipsFlag === 'true', };"
        - paragraph:
          - text: 自定义环境变量读到的是字符串。因此
          - code: Boolean('false')
          - text: 仍是 true，不能用它解释关闭开关。内置
          - code: DEV
          - text: 、
          - code: PROD
          - text: 、
          - code: SSR
          - text: 等变量有各自类型，不要把“所有 env 都是字符串”当成通用规则。
        - paragraph:
          - text: 更改
          - code: .env
          - text: 后停止并重新启动开发服务。生产值一般在构建时替换进产物，部署后仅修改服务器同名环境变量，不会自动改写已经生成的静态文件。如果产品需要部署时动态配置，就要另外设计明确的加载入口。
        - paragraph: VITE 前缀表示“允许进入客户端”，并不表示加密。数据库密码和服务端密钥不应出现在这些配置中；能在浏览器脚本或请求中读取的地址和开关，应按公开信息对待。
        - paragraph:
          - text: 选读：模式文件可覆盖通用文件。若在另一个独立实验目录创建
          - code: .env.development
          - text: 并设置
          - code: VITE_API_BASE=/dev-api
          - text: ，默认开发模式会优先使用它；默认生产构建仍使用
          - code: .env
          - text: 中的
          - code: /api
          - text: 。此时只删
          - code: .env
          - text: 的地址不会让开发模式报缺失错误。本篇必做工程不加入这个文件；如果之前已加入，应先移除额外环境文件并重启，再做下方单变量故障。已有进程环境中的同名变量优先级更高。规则见
          - link "Vite 环境文件说明 ↗":
            - /url: https://cn.vite.dev/guide/env-and-mode#env-files
          - text: （2026-11-10 核验，在线文档未标补丁版本；本篇实测 Vite 6.4.4）。
        - paragraph:
          - text: mode 与生产优化也别混在一起：
          - code: vite build --mode staging
          - text: 可以读取 staging 配置，但 build 仍是在做生产构建。命令、mode、环境文件与最终值需要一起看，不能只凭文件名判断行为。
        - heading "图片进入依赖图还是保持固定名字" [level=3]
        - paragraph: 资源有两条常见路径。需要与源码一起追踪的图片放在 src 中，通过导入得到 URL；必须保留固定名称的文件可以放在 public。
        - paragraph:
          - text: 例如新建
          - code: src/assets/book.svg
          - text: ：
        - text: svg
        - button "复制代码"
        - code: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"> <rect x="6" y="4" width="20" height="24" rx="3" fill="#38745a"/> <path d="M11 10h10M11 15h10M11 20h7" stroke="white" stroke-width="2"/> </svg>
        - paragraph:
          - text: 然后在独立的
          - code: App.vue
          - text: 中使用：
        - text: vue
        - button "复制代码"
        - code: <script setup lang="ts"> import bookUrl from './assets/book.svg'; </script> <template> <main> <h1><img :src="bookUrl" alt="" width="32" height="32"> 我的阅读室</h1> </main> </template>
        - paragraph: 图标在此处只是装饰，旁边已有标题，因此空 alt 避免重复描述。导入资源进入构建依赖图，构建工具可能生成带 hash 的文件，也可能把足够小的资源内联；不要承诺每次一定出现单独图片文件。
        - paragraph:
          - code: public/robots.txt
          - text: 的访问路径通常是站点公共根下的
          - code: robots.txt
          - text: ，而不是
          - code: public/robots.txt
          - text: 。部署在子路径时，还要考虑 Vite 的
          - code: base
          - text: ；手写根路径和由工具转换的导入 URL 不是同一回事。静态 URL、动态拼接路径与公共资源各自如何处理，应按实际部署路径核对。
        - heading "开发代理不会装进 dist" [level=3]
        - paragraph:
          - text: 本地前端和后端运行在不同端口时，开发服务器可以代理
          - code: /api
          - text: 。下面是项目根目录的另一份完整配置示例，演示本地后端地址：
        - text: ts
        - button "复制代码"
        - code: "import { defineConfig } from 'vite'; import vue from '@vitejs/plugin-vue'; export default defineConfig({ plugins: [vue()], server: { proxy: { '/api': { target: 'http://127.0.0.1:3000', changeOrigin: true }, }, }, });"
        - paragraph:
          - text: 使用这个例子需要本机后端实际监听对应地址；没有后端时，代理失败是预期现象。浏览器请求开发服务器的
          - code: /api/lessons
          - text: ，Vite 再转给后端。这里没有 rewrite，所以路径中的
          - code: /api
          - text: 会保留。
        - paragraph:
          - text: 构建后，dist 是静态产物，不含开发代理进程。正式服务若仍使用
          - code: /api
          - text: ，就需要部署服务器配置对应转发，或者采用明确的公开 API 地址。不要因为本地代理正常，就把线上 404 归因于 Vue 的响应式或组件代码。
        - paragraph: 代理和 CORS 处理的是访问路径与浏览器跨源读取规则；服务端身份和权限判断仍要存在。这个例子的意义是看清请求经过谁，不要求在入门阶段搭建完整生产网络。
        - heading "HMR 保留开发状态但不承担持久化" [level=3]
        - paragraph:
          - text: 保存组件文件后，页面往往立即变化，这叫
          - strong:
            - text: 热模块替换（hot module replacement
            - button "播放“hot module replacement”的美式发音"
            - text: ）
          - text: ，简称
          - strong: HMR
          - button "播放“HMR”的美式发音"
          - text: 。Vue 插件会尽量在适合的修改中保留组件状态，减少开发时重复操作。
        - paragraph: 可以展开刚才第一张资料卡片，修改模板中的说明文字，观察是否保留展开状态；再完整刷新，展开状态会按组件初始值重建。不同修改可能触发不同程度的重建，不能把“某次热更新保留了”当作产品保证。
        - paragraph:
          - text: 如果改代码越多，计时器或监听器越多，要查资源是否有清理，而不是期待刷新永久解决。模块顶层副作用与组件实例生命周期是不同范围；相关原则可以回看
          - link "JS-06 的导入副作用":
            - /url: /knowledge/materials/js-06-es-modules-module-boundaries.md/js-06#%E5%AF%BC%E5%85%A5%E6%97%B6%E5%8F%91%E7%94%9F%E7%9A%84%E5%89%AF%E4%BD%9C%E7%94%A8%E9%9C%80%E8%A6%81%E6%9C%89%E4%BA%BA%E8%B4%9F%E8%B4%A3%E7%BB%93%E6%9D%9F
          - text: 。
        - paragraph: 遇到只在热更新后出现的问题，做一次完整刷新作为对照很有帮助。源码冷启动也能复现时，再沿入口和状态路径继续查；不要一开始就同时删缓存、换版本和改业务代码。
        - heading "Scoped CSS 限制选择器不隔离整个世界" [level=3]
        - paragraph:
          - code: <style scoped>
          - text: 会让编译器为选择器与相应元素加入作用域标记。概念上，
          - code: .card
          - text: 会变成匹配带特定属性的
          - code: .card[data-v-xxxx]
          - text: ，从而减少组件样式意外命中其他位置。
        - paragraph: 它不是 Shadow DOM，也不是禁止外部 CSS 影响的墙。全局样式可以影响组件，字体与颜色可以继承，CSS 自定义属性也会沿正常规则传递。子组件根节点可同时受到父组件 scoped 样式与自己的 scoped 样式影响，这常用于父层控制布局。
        - paragraph:
          - text: 需要选择子组件内部元素时可以用
          - code: :deep()
          - text: ，但这会增加对内部结构的依赖。先看看组件是否提供合适的 prop、class 或变量入口，再决定是否穿透。Teleport 改变节点的 DOM 位置，也会影响依赖祖先关系的选择器，不要只看组件源码嵌套。
        - paragraph:
          - text: 把全局排版和颜色变量放在明确入口，组件局部样式跟随组件，跨组件覆盖保持可搜索。遇到规则不生效，查看真实 DOM、生成选择器与层叠顺序，比连续叠加
          - code: "!important"
          - text: 更容易得到可维护的结果。
        - heading "固定入口练习与单变量排错" [level=3]
        - paragraph:
          - text: 在两张卡片版本 App.vue 的 script setup 中加入
          - code: "import { publicConfig } from './public-config'"
          - text: ，并把卡片导入改为
          - code: import ReadingCard from '@/ReadingCard.vue'
          - text: 。在 main 内加入
          - code: "<p>公开地址：{{ publicConfig.apiBase }}；提示开关：{{ publicConfig.showReadingTips }}</p>"
          - text: 。此时应显示 /api 与 false，两张卡片初始收起，点击第一张只展开第一张。
        - paragraph:
          - text: 为检查样式边界，在 ReadingCard.vue 末尾加入
          - code: "<style scoped>h2 { color: rgb(20, 100, 60); }</style>"
          - text: ，在 App.vue 的 main 内另加
          - code: <h2>卡片外标题</h2>
          - text: 。CSS 选择器 h2 选择标题元素，color 设置文本颜色；scoped 后只有卡片内部标题被这条规则命中。DevTools 中检查实际 h2 与作用域属性，不能用“所有外部样式都进不来”解释。字体继承与全局规则仍可能影响组件。
        - paragraph: 每次只注入一种故障，记录原配置、错误输出、最小修复和恢复结果：
        - table:
          - rowgroup:
            - row "固定故障 可观察结果及证伪动作 最小修复":
              - columnheader "固定故障"
              - columnheader "可观察结果及证伪动作"
              - columnheader "最小修复"
          - rowgroup:
            - row "只删除 Vite resolve.alias，保留 TS paths typecheck 通过而 build 无法解析 @/ReadingCard.vue；相对路径能构建，证伪组件语法错误 恢复 Vite 别名":
              - cell "只删除 Vite resolve.alias，保留 TS paths"
              - cell "typecheck 通过而 build 无法解析 @/ReadingCard.vue；相对路径能构建，证伪组件语法错误"
              - cell "恢复 Vite 别名"
            - row "从唯一的 .env 删除 VITE_API_BASE，停止并重启 dev；另运行 build 后启动 preview 开发页与生产预览页均抛出“缺少公开 API 地址 VITE_API_BASE”，卡片未挂载；build 本身仍成功，HTML 与模块请求成功但模块求值抛错，证伪 mount ID 错误 恢复公开变量，再重启 dev、重新 build 并预览，两处均恢复 /api 与 false；绝不填写密钥":
              - cell "从唯一的 .env 删除 VITE_API_BASE，停止并重启 dev；另运行 build 后启动 preview"
              - cell "开发页与生产预览页均抛出“缺少公开 API 地址 VITE_API_BASE”，卡片未挂载；build 本身仍成功，HTML 与模块请求成功但模块求值抛错，证伪 mount ID 错误"
              - cell "恢复公开变量，再重启 dev、重新 build 并预览，两处均恢复 /api 与 false；绝不填写密钥"
            - row "删除卡片 style 的 scoped 卡片外 h2 也被命中，DevTools 中规则没有作用域限制 恢复 scoped；不靠叠加 !important":
              - cell "删除卡片 style 的 scoped"
              - cell "卡片外 h2 也被命中，DevTools 中规则没有作用域限制"
              - cell "恢复 scoped；不靠叠加 !important"
            - 'row "将 main.ts 的 mount 改成 #missing 容器不存在，页面空白；HTML 中 #app 存在，证伪 SFC 没有导出 改回 #app"':
              - 'cell "将 main.ts 的 mount 改成 #missing"'
              - 'cell "容器不存在，页面空白；HTML 中 #app 存在，证伪 SFC 没有导出"'
              - 'cell "改回 #app"'
        - paragraph: 复测只将第二张卡片 minutes 从 30 改成 45：typecheck/build 应通过，展开第二张后文字变为 45，第一张仍为 25，入口、别名与公开配置不变。原先路由地址、路由懒加载和 chunk 检查留给 VUE-07 的后续练习，不是本入口必考。跨框架对照仅供已经了解 React 的读者选读。
        - heading "类型检查和构建各自回答不同问题" [level=3]
        - paragraph:
          - text: 故意把卡片的
          - code: :minutes="25"
          - text: 改成
          - code: minutes="很多"
          - text: ：模板可以被转成 JavaScript，但这不代表 props 类型正确。Vue 项目常用
          - code: vue-tsc
          - text: 检查 SFC 与模板关系，而 Vite 的 TypeScript 转换本身不等于完整类型检查。
        - paragraph: 本篇练习的必要核对可以很集中：确认脚本包含类型检查；生成一次生产产物；本地预览标题、卡片和资源。若使用路由，再检查直接访问页面地址与刷新时服务器是否正确返回入口。无须为认识一个 SFC 就先建立庞大的测试体系。
        - paragraph: 锁文件保存实际依赖解析结果，便于另一台机器重现同一套工具。团队应约定 Node 与包管理器范围；升级时读对应版本说明，再看实际锁文件和产物变化。仅修改版本范围并不能证明所有人已使用同一依赖版本。
        - paragraph: 当页面空白时，可以按入口顺序逐项说明证据：HTML 是否成功返回，模块请求是否成功，挂载容器是否存在，组件是否编译，运行时是否抛错，资源路径是否正确。这样定位到哪一层，就只修改相关问题，避免让简单错误被更多无关调整掩盖。
        - paragraph:
          - text: 类型写法就地理解：
          - code: "{ title: string; minutes: number }"
          - text: 约定两个字段；
          - code: useState<0 | 1>
          - text: 限定只能保存 0 或 1；
          - code: "defineProps<{ ... }>()"
          - text: 声明组件输入类型。使用这些声明不要求先完成 TS-03 的泛型设计、keyof 与索引访问。TS-01 可作为类型记号的推荐补读，TS-03 属于深入学习。
        - heading "参考与延伸阅读" [level=3]
        - list:
          - listitem:
            - link "Vue：快速上手 ↗":
              - /url: https://cn.vuejs.org/guide/quick-start.html
            - text: ：查当前脚手架、环境要求与创建步骤。
          - listitem:
            - link "Vue：script setup ↗":
              - /url: https://cn.vuejs.org/api/sfc-script-setup.html
            - text: ：查实例执行、编译器宏和顶层绑定。
          - listitem:
            - link "Vue：SFC CSS 功能 ↗":
              - /url: https://cn.vuejs.org/api/sfc-css-features.html
            - text: ：查 scoped、deep、插槽与全局选择器。
          - listitem:
            - link "Vite：开始 ↗":
              - /url: https://cn.vite.dev/guide/
            - text: ：查开发与构建入口，并切换到所用版本的文档。
          - listitem:
            - link "Vite：环境变量和模式 ↗":
              - /url: https://cn.vite.dev/guide/env-and-mode
            - text: ：查变量前缀、类型、替换与 mode。
          - listitem:
            - link "Vite：静态资源处理 ↗":
              - /url: https://cn.vite.dev/guide/assets
            - text: ：查导入资源、public 与部署路径。
      - navigation "继续学习":
        - link "← 同组上一篇 React 渲染与快照":
          - /url: /knowledge/materials/react-01-render-purity-state-snapshot.md/react-01
          - text: ← 同组上一篇
          - strong: React 渲染与快照
        - link "同组下一篇 → Vue 响应式与派生值":
          - /url: /knowledge/materials/vue-02-ref-reactive-computed-boundaries.md/vue-02
          - text: 同组下一篇 →
          - strong: Vue 响应式与派生值
      - text: 正文阅读超过 80% 仅标记资料看完，不改变知识点状态
      - button "返回上一页 →"
    - complementary:
      - text: 知识连接
      - paragraph: 遇到疑惑时，跳到相关小节。返回后继续刚才的阅读。
      - link "JS-06 模块图不是把代码按文字顺序粘起来 ↗ 入口文件导入组件，仍遵守 ES Modules 的解析与求值规则。":
        - /url: /knowledge/materials/js-06-es-modules-module-boundaries.md/js-06#%E6%A8%A1%E5%9D%97%E5%9B%BE%E4%B8%8D%E6%98%AF%E6%8A%8A%E4%BB%A3%E7%A0%81%E6%8C%89%E6%96%87%E5%AD%97%E9%A1%BA%E5%BA%8F%E7%B2%98%E8%B5%B7%E6%9D%A5
        - text: JS-06
        - strong: 模块图不是把代码按文字顺序粘起来 ↗
        - text: 入口文件导入组件，仍遵守 ES Modules 的解析与求值规则。
      - link "WEB-01 链接负责去哪里按钮负责做什么 ↗ SFC 的模板语法不会替代原生按钮和表单的交互语义。":
        - /url: /knowledge/materials/web-01-html-semantics-forms-accessibility.md/web-01#%E9%93%BE%E6%8E%A5%E8%B4%9F%E8%B4%A3%E5%8E%BB%E5%93%AA%E9%87%8C%E6%8C%89%E9%92%AE%E8%B4%9F%E8%B4%A3%E5%81%9A%E4%BB%80%E4%B9%88
        - text: WEB-01
        - strong: 链接负责去哪里按钮负责做什么 ↗
        - text: SFC 的模板语法不会替代原生按钮和表单的交互语义。
      - link "VUE-02 从一份会变化的资料数量认识 ref ↗ 理解每个实例创建的 ref，以及后续变化如何通知页面。":
        - /url: /knowledge/materials/vue-02-ref-reactive-computed-boundaries.md/vue-02#%E4%BB%8E%E4%B8%80%E4%BB%BD%E4%BC%9A%E5%8F%98%E5%8C%96%E7%9A%84%E8%B5%84%E6%96%99%E6%95%B0%E9%87%8F%E8%AE%A4%E8%AF%86-ref
        - text: VUE-02
        - strong: 从一份会变化的资料数量认识 ref ↗
        - text: 理解每个实例创建的 ref，以及后续变化如何通知页面。
      - link "JS-06 导入时发生的副作用需要有人负责结束 ↗ 模块顶层资源与组件资源需要各自安排清理。":
        - /url: /knowledge/materials/js-06-es-modules-module-boundaries.md/js-06#%E5%AF%BC%E5%85%A5%E6%97%B6%E5%8F%91%E7%94%9F%E7%9A%84%E5%89%AF%E4%BD%9C%E7%94%A8%E9%9C%80%E8%A6%81%E6%9C%89%E4%BA%BA%E8%B4%9F%E8%B4%A3%E7%BB%93%E6%9D%9F
        - text: JS-06
        - strong: 导入时发生的副作用需要有人负责结束 ↗
        - text: 模块顶层资源与组件资源需要各自安排清理。
- button "打开 Atlas AI 助手"
```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test';
  2   | import { mkdir, writeFile } from 'node:fs/promises';
  3   | import { fileURLToPath } from 'node:url';
  4   | const evidence = new URL('../../../tmp/framework-entry-evidence/', import.meta.url);
  5   | const entries = [
  6   |   { code: 'REACT-01', guide: 'react-01-render-purity-state-snapshot.md', heading: '用手动释放回调固定观察顺序', sample: '固定快照实验' },
  7   |   { code: 'VUE-01', guide: 'vue-01-vite-sfc-project-structure.md', heading: '固定入口练习与单变量排错', sample: '两张独立的资料卡片' },
  8   | ];
  9   | async function point(page: Page, code: string) { return (await (await page.request.get(`/api/v1/knowledge/points/${code}`)).json()).data; }
  10  | async function progress(page: Page, guide: string) {
  11  |   const records = (await (await page.request.get('/api/v1/knowledge/material-progress')).json()).data;
  12  |   return records.find((r: {guide:string}) => r.guide === guide)?.progressPercent ?? 0;
  13  | }
  14  | for (const entry of entries) {
  15  |   const href = `/knowledge/materials/${entry.guide}/${entry.code.toLowerCase()}`;
  16  |   test(`${entry.code} 路线到补学返回和练习，查看不改变学习状态`, async ({ page, browser }) => {
  17  |     await mkdir(evidence, { recursive: true });
  18  |     await page.setViewportSize({ width: 1440, height: 1000 });
  19  |     await page.request.post(`/api/v1/learning/points/${entry.code}/focus`);
  20  |     await page.request.post('/api/v1/learning/points/WEB-01/defer', { data: { reason: '入口隔离测试' } });
  21  |     const before = await point(page, entry.code);
  22  |     await page.goto('/plan');
  23  |     const route = page.getByRole('region', { name: '框架入口基础' });
  24  |     await expect(route).toContainText('无需先学另一个框架');
  25  |     await route.locator(`a[href="/knowledge/${entry.code}"]`).click();
  26  |     await expect(page.locator('.point-hero h1 code')).toHaveText(entry.code);
  27  |     const panel = page.getByRole('region', { name: '框架入口基础' });
  28  |     await expect(panel).toContainText('学习中');
  29  |     await expect(panel).toContainText('已暂缓，依赖仍需补齐');
  30  |     await panel.getByRole('link', { name: '补学 WEB-01', exact: true }).click();
  31  |     await page.getByRole('link', { name: `← 返回框架入口 ${entry.code}` }).click();
  32  |     await expect(page.locator('.point-hero h1 code')).toHaveText(entry.code);
  33  |     await panel.getByRole('link', { name: '阅读讲义', exact: true }).click();
  34  |     await expect(page.locator('[data-reader-ready="true"]')).toBeVisible();
  35  |     await page.locator('.markdown-body').getByRole('link', { name: 'WEB-01', exact: true }).click();
  36  |     await expect(page.locator('.material-hero')).toContainText('WEB-01');
  37  |     await page.getByRole('button', { name: '返回上一页 →' }).click();
  38  |     await expect(page).toHaveURL(href);
  39  |     await expect(page.locator('.material-hero')).toContainText(entry.code);
  40  |     await expect(page.locator('[data-reader-ready="true"]')).toBeVisible();
  41  |     await page.locator('.material-hero').scrollIntoViewIfNeeded();
  42  |     await page.screenshot({ animations: 'disabled', path: fileURLToPath(new URL(`${entry.code}-reader-desktop.png`, evidence)) });
  43  |     await page.getByRole('region', { name: '框架入口基础' }).getByRole('link', { name: '详情与练习' }).click();
  44  |     await page.getByRole('button', { name: '在系统中开始并完成 →' }).click();
  45  |     await expect(page.locator('.practice-workspace')).toBeVisible();
  46  |     await expect(page.locator('.task-statement').first()).toContainText(entry.code === 'REACT-01' ? '3/4/5' : '无 Router');
  47  |     await page.evaluate(() => Promise.all(document.getAnimations().filter(a => a.effect?.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))));
  48  |     await page.screenshot({ animations: 'disabled', path: fileURLToPath(new URL(`${entry.code}-practice.png`, evidence)) });
  49  |     const after = await point(page, entry.code);
  50  |     expect({ state: after.learningState, focus: after.currentFocus, mastery: after.masteryLevel }).toEqual({ state: before.learningState, focus: before.currentFocus, mastery: before.masteryLevel });
  51  |     expect((await point(page, 'WEB-01')).learningState).toBe('DEFERRED');
  52  |     await page.request.post('/api/v1/learning/points/WEB-01/restore');
  53  |     await writeFile(new URL(`${entry.code}-browser.json`, evidence), JSON.stringify({ browser: browser.version(), viewport: page.viewportSize(), pages: ['/plan', `/knowledge/${entry.code}`, href, '/knowledge/WEB-01'], before, after }, null, 2));
  54  |   });
  55  |   test(`${entry.code} 小节查阅、复制、滚动和阅读阈值`, async ({ page }) => {
  56  |     const before = await point(page, entry.code);
  57  |     const initial = await progress(page, entry.guide);
  58  |     await page.goto(`${href}#${encodeURIComponent(entry.heading)}`);
  59  |     await expect(page.locator('[data-reader-ready="true"]')).toBeVisible();
  60  |     await expect(page.locator('.section-visit-note')).toBeVisible();
  61  |     await page.waitForTimeout(750);
  62  |     expect(await progress(page, entry.guide)).toBe(initial);
  63  |     const external = page.locator('.markdown-body a[href^="https://"]');
  64  |     expect(await external.count()).toBeGreaterThan(0);
  65  |     for (const link of await external.all()) { await expect(link).toHaveAttribute('target', '_blank'); await expect(link).toHaveAttribute('rel', /noopener/); }
  66  |     await page.setViewportSize({ width: 390, height: 844 });
  67  |     await page.getByRole('button', { name: '打开本页目录' }).click();
  68  |     const toc = page.locator('.toc-rail').getByRole('button', { name: entry.heading, exact: true });
  69  |     await toc.focus(); await page.keyboard.press('Enter');
  70  |     await expect(page.locator('.markdown-body h3').filter({ hasText: new RegExp(`^${entry.heading}$`) })).toBeFocused();
  71  |     const block = page.locator('.code-block').filter({ hasText: entry.sample }).last();
  72  |     await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  73  |     await block.getByRole('button', { name: '复制代码' }).click();
  74  |     await expect(block.getByRole('button', { name: '已复制' })).toBeVisible();
  75  |     expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(await block.locator('pre').textContent());
  76  |     const wide = page.locator('.code-block pre').filter({ hasText: entry.code === 'REACT-01' ? 'commit observation' : 'fileURLToPath' }).first();
  77  |     await wide.scrollIntoViewIfNeeded();
  78  |     expect(await wide.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
  79  |     await wide.evaluate(el => { el.scrollLeft = el.scrollWidth; });
  80  |     expect(await wide.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  81  |     await wide.evaluate(el => { el.scrollLeft = 0; });
  82  |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  83  |     await page.screenshot({ animations: 'disabled', path: fileURLToPath(new URL(`${entry.code}-mobile-code.png`, evidence)) });
> 84  |     await page.goto(href); await expect(page.locator('[data-reader-ready="true"]')).toBeVisible();
      |                                                                                     ^ Error: expect(locator).toBeVisible() failed
  85  |     await page.locator('.material-sheet footer').scrollIntoViewIfNeeded();
  86  |     await expect.poll(() => progress(page, entry.guide)).toBeGreaterThanOrEqual(80);
  87  |     const after = await point(page, entry.code);
  88  |     expect({ state: after.learningState, mastery: after.masteryLevel, focus: after.currentFocus }).toEqual({ state: before.learningState, mastery: before.masteryLevel, focus: before.currentFocus });
  89  |   });
  90  | }
  91  | 
  92  | test('入口明确区分未学与已学基础，查阅后当前点保持不变', async ({ page }) => {
  93  |   await page.request.post('/api/v1/learning/points/WEB-01/restore');
  94  |   await page.goto('/knowledge/VUE-01');
  95  |   const panel = page.getByRole('region', { name: '框架入口基础' });
  96  |   await expect(panel).toContainText('未开始，可按需补学');
  97  |   await page.request.post('/api/v1/learning/points/WEB-01/complete');
  98  |   await page.request.post('/api/v1/learning/points/VUE-01/focus');
  99  |   await page.reload();
  100 |   await expect(panel.locator('li')).toContainText('已学完');
  101 |   await panel.getByRole('link', { name: '补学 WEB-01' }).click();
  102 |   await page.getByRole('link', { name: '← 返回框架入口 VUE-01' }).click();
  103 |   expect((await point(page, 'VUE-01')).currentFocus).toBe(true);
  104 |   expect((await point(page, 'WEB-01')).learningState).toBe('LEARNED');
  105 |   await page.goto('/plan');
  106 |   await expect(page.getByRole('region', { name: '框架入口基础' })).toBeVisible();
  107 |   await page.screenshot({ animations: 'disabled', path: fileURLToPath(new URL('framework-plan.png', evidence)) });
  108 | });
  109 | 
```