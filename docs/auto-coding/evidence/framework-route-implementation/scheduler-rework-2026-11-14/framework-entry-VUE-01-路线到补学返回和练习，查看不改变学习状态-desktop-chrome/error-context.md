# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: framework-entry.spec.ts >> VUE-01 路线到补学返回和练习，查看不改变学习状态
- Location: e2e/framework-entry.spec.ts:16:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: expect(locator).toHaveText(expected) failed

Locator: locator('.point-hero h1 code')
Expected: "VUE-01"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toHaveText" locator('.point-hero h1 code') with timeout 5000ms
  - waiting for locator('.point-hero h1 code')

```

```yaml
- link "跳到主要内容":
  - /url: "#main-content"
- navigation "主导航":
  - text: Career Atlas
  - paragraph: AI 时代前端能力地图
  - paragraph: 我的工作空间
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
  - link "设置与数据":
    - /url: /settings
    - strong: 设置与数据
  - strong: 服务正常
  - text: 本地优先 · 自主学习
- banner:
  - button "收起侧栏" [expanded]
  - text: 工作空间 核心学习路线
  - button "快速查找，快捷键 Command 或 Control 加 K": 搜索知识点、页面… ⌘ K
- main:
  - paragraph: 核心学习路线页面已打开
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
        - text: · 已暂缓，需主动恢复
    - group:
      - text: 本次已审范围：共同基础与一个可选框架方向
      - paragraph:
        - text: 共同基础：
        - link "JS-01":
          - /url: /knowledge/JS-01
        - link "JS-03":
          - /url: /knowledge/JS-03
        - link "WEB-01":
          - /url: /knowledge/WEB-01
        - link "JS-04":
          - /url: /knowledge/JS-04
        - link "JS-05":
          - /url: /knowledge/JS-05
      - paragraph:
        - text: REACT：
        - link "REACT-01":
          - /url: /knowledge/REACT-01
        - link "REACT-02":
          - /url: /knowledge/REACT-02
        - link "REACT-03":
          - /url: /knowledge/REACT-03
        - link "REACT-04":
          - /url: /knowledge/REACT-04
      - paragraph:
        - text: VUE：
        - link "VUE-01":
          - /url: /knowledge/VUE-01
        - link "VUE-02":
          - /url: /knowledge/VUE-02
        - link "VUE-03":
          - /url: /knowledge/VUE-03
        - link "VUE-04":
          - /url: /knowledge/VUE-04
        - link "VUE-05":
          - /url: /knowledge/VUE-05
      - paragraph: 两条框架链可独立选择。已审链完成后不会自动进入另一框架或后续未审内容。学习完成与考核掌握分别记录。
    - link "浏览全部资料":
      - /url: /knowledge
  - region "框架入口基础":
    - heading "从一个框架开始" [level=2]
    - paragraph: 选择你要学的入口；无需先学另一个框架。熟悉下列基础可直接继续，查看链接不会更改当前学习点、学完或暂缓状态。
    - article:
      - heading "REACT-01 · 学习中" [level=3]
      - link "详情与练习":
        - /url: /knowledge/REACT-01
      - link "阅读讲义":
        - /url: /knowledge/materials/react-01-render-purity-state-snapshot.md/react-01
      - list:
        - listitem:
          - link "补学 JS-01":
            - /url: /knowledge/JS-01?entryReturn=REACT-01
          - text: · 已学完 闭包与局部绑定：解释回调为何保留创建时的状态。
        - listitem:
          - link "补学 JS-03":
            - /url: /knowledge/JS-03?entryReturn=REACT-01
          - text: · 已学完 对象共享与不可变更新：识别渲染修改输入造成的污染。
        - listitem:
          - link "补学 WEB-01":
            - /url: /knowledge/WEB-01?entryReturn=REACT-01
          - text: · 已暂缓，依赖仍需补齐 HTML、按钮和挂载容器：读懂最终页面与用户事件。
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
          - text: · 已暂缓，依赖仍需补齐 HTML、按钮和挂载容器：读懂最终页面与用户事件。
    - text: 查阅不等于掌握；正文说明每项基础的用途。TS-03、Router 和跨框架对照不是入口门槛。个人推荐只采用所选方向；旧分组仅供浏览。
  - paragraph: COMPATIBLE READING GROUPS · 35 BATCHES
  - heading "按能力与基础安排学习" [level=1]
  - text: 异步链试点已按真实前置连接。以下 149 个知识点暂保留旧分组供查阅；框架不享有提前或交错特权，完整路线将逐步按能力与认知负担重构。
  - button "继续当前学习 →"
  - button "查看完整知识清单"
  - complementary "旧分组浏览统计":
    - strong: 2%
    - text: 旧分组阅读进度
    - term: 当前批次
    - definition: B04
    - term: 已学完
    - definition: 3 / 149
    - term: M3+ 掌握
    - definition: "0"
  - strong: ROUTE CONTRACT 旧分组浏览
  - text: 旧分组仅供浏览。 批次不是硬前置，按已有基础选择内容；74 个专项选修仍保留在完整知识清单中。 个人路线结合进度推荐。 熟悉内容无需重学，暂缓不会使依赖自动满足；学习完成与 M3+ 掌握仍分别记录。
  - region "旧分组统计":
    - text: CORE
    - strong: "149"
    - text: 旧分组知识点 DONE
    - strong: "3"
    - text: 已学完 MASTERED
    - strong: "0"
    - text: M3+ 已掌握 OPTIONAL
    - strong: "74"
    - text: 专项路线知识点
  - text: 在旧分组中查找
  - searchbox "在旧分组中查找"
  - text: 当前显示 149 个知识点
  - button "全部展开"
  - article:
    - button "B01 Web 平台核心基础 4 个旧分组知识点 · 合计约 26 小时，可逐点推进 3/4 展开 ↓":
      - text: B01
      - strong: Web 平台核心基础
      - text: 4 个旧分组知识点 · 合计约 26 小时，可逐点推进
      - emphasis
      - text: 3/4 展开 ↓
  - article:
    - button "B02 Web 平台核心基础 4 个旧分组知识点 · 合计约 27 小时，可逐点推进 0/4 展开 ↓":
      - text: B02
      - strong: Web 平台核心基础
      - text: 4 个旧分组知识点 · 合计约 27 小时，可逐点推进
      - emphasis
      - text: 0/4 展开 ↓
  - article:
    - button "B03 Web 平台核心基础 × TypeScript 与业务类型建模 4 个旧分组知识点 · 合计约 26 小时，可逐点推进 0/4 展开 ↓":
      - text: B03
      - strong: Web 平台核心基础 × TypeScript 与业务类型建模
      - text: 4 个旧分组知识点 · 合计约 26 小时，可逐点推进
      - emphasis
      - text: 0/4 展开 ↓
  - article:
    - button "B04 当前 React / Vue 兼容分组 · TypeScript 与业务类型建模 × Web 平台核心基础 等 4 个领域 5 个旧分组知识点 · 合计约 34 小时，可逐点推进 0/5 收起 ↑" [expanded]:
      - text: B04 当前
      - strong: React / Vue 兼容分组 · TypeScript 与业务类型建模 × Web 平台核心基础 等 4 个领域
      - text: 5 个旧分组知识点 · 合计约 34 小时，可逐点推进
      - emphasis
      - text: 0/5 收起 ↑
    - 'button "TS-03 泛型、约束、`keyof` 与索引访问 TypeScript 与业务类型建模 · CODING 未开始"':
      - code: TS-03
      - strong: "泛型、约束、`keyof` 与索引访问"
      - text: TypeScript 与业务类型建模 · CODING 未开始
    - button "WEB-01 HTML 语义、表单与可访问性基础 Web 平台核心基础 · CODING 稍后学习":
      - code: WEB-01
      - strong: HTML 语义、表单与可访问性基础
      - text: Web 平台核心基础 · CODING 稍后学习
    - button "REACT-01 渲染、组件纯度与 state snapshot React 原理、状态、Hooks、路由与性能 · CODING 学习中":
      - code: REACT-01
      - strong: 渲染、组件纯度与 state snapshot
      - text: React 原理、状态、Hooks、路由与性能 · CODING 学习中
    - button "VUE-01 Vite 脚手架、SFC 与项目结构 Vue 3 项目开发 · CODING 学习中":
      - code: VUE-01
      - strong: Vite 脚手架、SFC 与项目结构
      - text: Vue 3 项目开发 · CODING 学习中
    - 'button "VUE-02 `ref`、`reactive`、`computed` 与响应式边界 Vue 3 项目开发 · DEBUGGING 未开始"':
      - code: VUE-02
      - strong: "`ref`、`reactive`、`computed` 与响应式边界"
      - text: Vue 3 项目开发 · DEBUGGING 未开始
  - article:
    - button "B05 React / Vue 兼容分组 · React 原理、状态、Hooks、路由与性能 × Vue 3 项目开发 4 个旧分组知识点 · 合计约 28 小时，可逐点推进 0/4 展开 ↓":
      - text: B05
      - strong: React / Vue 兼容分组 · React 原理、状态、Hooks、路由与性能 × Vue 3 项目开发
      - text: 4 个旧分组知识点 · 合计约 28 小时，可逐点推进
      - emphasis
      - text: 0/4 展开 ↓
  - article:
    - button "B06 React / Vue 兼容分组 · React 原理、状态、Hooks、路由与性能 × Vue 3 项目开发 4 个旧分组知识点 · 合计约 28 小时，可逐点推进 0/4 展开 ↓":
      - text: B06
      - strong: React / Vue 兼容分组 · React 原理、状态、Hooks、路由与性能 × Vue 3 项目开发
      - text: 4 个旧分组知识点 · 合计约 28 小时，可逐点推进
      - emphasis
      - text: 0/4 展开 ↓
  - article:
    - button "B07 React / Vue 兼容分组 · React 原理、状态、Hooks、路由与性能 × Vue 3 项目开发 4 个旧分组知识点 · 合计约 29 小时，可逐点推进 0/4 展开 ↓":
      - text: B07
      - strong: React / Vue 兼容分组 · React 原理、状态、Hooks、路由与性能 × Vue 3 项目开发
      - text: 4 个旧分组知识点 · 合计约 29 小时，可逐点推进
      - emphasis
      - text: 0/4 展开 ↓
  - article:
    - button "B08 React / Vue 兼容分组 · Vue 3 项目开发 × React 原理、状态、Hooks、路由与性能 5 个旧分组知识点 · 合计约 35 小时，可逐点推进 0/5 展开 ↓":
      - text: B08
      - strong: React / Vue 兼容分组 · Vue 3 项目开发 × React 原理、状态、Hooks、路由与性能
      - text: 5 个旧分组知识点 · 合计约 35 小时，可逐点推进
      - emphasis
      - text: 0/5 展开 ↓
  - article:
    - button "B09 工程与面试证据 · Git、工程化、测试、CI/CD 与发布质量 × Web 平台核心基础 4 个旧分组知识点 · 合计约 31 小时，可逐点推进 0/4 展开 ↓":
      - text: B09
      - strong: 工程与面试证据 · Git、工程化、测试、CI/CD 与发布质量 × Web 平台核心基础
      - text: 4 个旧分组知识点 · 合计约 31 小时，可逐点推进
      - emphasis
      - text: 0/4 展开 ↓
  - article:
    - button "B10 工程与面试证据 · Git、工程化、测试、CI/CD 与发布质量 4 个旧分组知识点 · 合计约 31 小时，可逐点推进 0/4 展开 ↓":
      - text: B10
      - strong: 工程与面试证据 · Git、工程化、测试、CI/CD 与发布质量
      - text: 4 个旧分组知识点 · 合计约 31 小时，可逐点推进
      - emphasis
      - text: 0/4 展开 ↓
  - article:
    - button "B11 工程与面试证据 · Git、工程化、测试、CI/CD 与发布质量 × 项目表达、技术方案与职业影响力 4 个旧分组知识点 · 合计约 31 小时，可逐点推进 0/4 展开 ↓":
      - text: B11
      - strong: 工程与面试证据 · Git、工程化、测试、CI/CD 与发布质量 × 项目表达、技术方案与职业影响力
      - text: 4 个旧分组知识点 · 合计约 31 小时，可逐点推进
      - emphasis
      - text: 0/4 展开 ↓
  - article:
    - button "B12 工程与面试证据 · 项目表达、技术方案与职业影响力 × Web 平台核心基础 5 个旧分组知识点 · 合计约 36 小时，可逐点推进 0/5 展开 ↓":
      - text: B12
      - strong: 工程与面试证据 · 项目表达、技术方案与职业影响力 × Web 平台核心基础
      - text: 5 个旧分组知识点 · 合计约 36 小时，可逐点推进
      - emphasis
      - text: 0/5 展开 ↓
  - article:
    - button "B13 Web 平台核心基础 4 个旧分组知识点 · 合计约 29 小时，可逐点推进 0/4 展开 ↓":
      - text: B13
      - strong: Web 平台核心基础
      - text: 4 个旧分组知识点 · 合计约 29 小时，可逐点推进
      - emphasis
      - text: 0/4 展开 ↓
  - article:
    - button "B14 Web 平台核心基础 4 个旧分组知识点 · 合计约 30 小时，可逐点推进 0/4 展开 ↓":
      - text: B14
      - strong: Web 平台核心基础
      - text: 4 个旧分组知识点 · 合计约 30 小时，可逐点推进
      - emphasis
      - text: 0/4 展开 ↓
  - article:
    - button "B15 Web 平台核心基础 × TypeScript 与业务类型建模 4 个旧分组知识点 · 合计约 30 小时，可逐点推进 0/4 展开 ↓":
      - text: B15
      - strong: Web 平台核心基础 × TypeScript 与业务类型建模
      - text: 4 个旧分组知识点 · 合计约 30 小时，可逐点推进
      - emphasis
      - text: 0/4 展开 ↓
  - article:
    - button "B16 TypeScript 与业务类型建模 5 个旧分组知识点 · 合计约 34 小时，可逐点推进 0/5 展开 ↓":
      - text: B16
      - strong: TypeScript 与业务类型建模
      - text: 5 个旧分组知识点 · 合计约 34 小时，可逐点推进
      - emphasis
      - text: 0/5 展开 ↓
  - article:
    - button "B17 身份、隐私与 AI 风险治理 4 个旧分组知识点 · 合计约 25 小时，可逐点推进 0/4 展开 ↓":
      - text: B17
      - strong: 身份、隐私与 AI 风险治理
      - text: 4 个旧分组知识点 · 合计约 25 小时，可逐点推进
      - emphasis
      - text: 0/4 展开 ↓
  - article:
    - button "B18 Node.js 服务与接口工具 × AI 辅助研发、评审与工程治理 4 个旧分组知识点 · 合计约 32 小时，可逐点推进 0/4 展开 ↓":
      - text: B18
      - strong: Node.js 服务与接口工具 × AI 辅助研发、评审与工程治理
      - text: 4 个旧分组知识点 · 合计约 32 小时，可逐点推进
      - emphasis
      - text: 0/4 展开 ↓
  - article:
    - button "B19 AI 辅助研发、评审与工程治理 × 业务建模、权限与接口契约 4 个旧分组知识点 · 合计约 32 小时，可逐点推进 0/4 展开 ↓":
      - text: B19
      - strong: AI 辅助研发、评审与工程治理 × 业务建模、权限与接口契约
      - text: 4 个旧分组知识点 · 合计约 32 小时，可逐点推进
      - emphasis
      - text: 0/4 展开 ↓
  - article:
    - button "B20 业务建模、权限与接口契约 5 个旧分组知识点 · 合计约 36 小时，可逐点推进 0/5 展开 ↓":
      - text: B20
      - strong: 业务建模、权限与接口契约
      - text: 5 个旧分组知识点 · 合计约 36 小时，可逐点推进
      - emphasis
      - text: 0/5 展开 ↓
  - article:
    - button "B21 工程与面试证据 · 业务建模、权限与接口契约 × Git、工程化、测试、CI/CD 与发布质量 等 3 个领域 4 个旧分组知识点 · 合计约 28 小时，可逐点推进 0/4 展开 ↓":
      - text: B21
      - strong: 工程与面试证据 · 业务建模、权限与接口契约 × Git、工程化、测试、CI/CD 与发布质量 等 3 个领域
      - text: 4 个旧分组知识点 · 合计约 28 小时，可逐点推进
      - emphasis
      - text: 0/4 展开 ↓
  - article:
    - button "B22 现代渲染、数据层、实时协作与离线 × 组件系统与多运行时交付 4 个旧分组知识点 · 合计约 27 小时，可逐点推进 0/4 展开 ↓":
      - text: B22
      - strong: 现代渲染、数据层、实时协作与离线 × 组件系统与多运行时交付
      - text: 4 个旧分组知识点 · 合计约 27 小时，可逐点推进
      - emphasis
      - text: 0/4 展开 ↓
  - article:
    - button "B23 工程与面试证据 · 组件系统与多运行时交付 × 业务建模、权限与接口契约 等 4 个领域 4 个旧分组知识点 · 合计约 30 小时，可逐点推进 0/4 展开 ↓":
      - text: B23
      - strong: 工程与面试证据 · 组件系统与多运行时交付 × 业务建模、权限与接口契约 等 4 个领域
      - text: 4 个旧分组知识点 · 合计约 30 小时，可逐点推进
      - emphasis
      - text: 0/4 展开 ↓
  - article:
    - button "B24 Linux、Docker 与前端部署交付 5 个旧分组知识点 · 合计约 37 小时，可逐点推进 0/5 展开 ↓":
      - text: B24
      - strong: Linux、Docker 与前端部署交付
      - text: 5 个旧分组知识点 · 合计约 37 小时，可逐点推进
      - emphasis
      - text: 0/5 展开 ↓
  - article:
    - button "B25 工程与面试证据 · Git、工程化、测试、CI/CD 与发布质量 × Linux、Docker 与前端部署交付 等 3 个领域 4 个旧分组知识点 · 合计约 31 小时，可逐点推进 0/4 展开 ↓":
      - text: B25
      - strong: 工程与面试证据 · Git、工程化、测试、CI/CD 与发布质量 × Linux、Docker 与前端部署交付 等 3 个领域
      - text: 4 个旧分组知识点 · 合计约 31 小时，可逐点推进
      - emphasis
      - text: 0/4 展开 ↓
  - article:
    - button "B26 性能、移动 Web 与媒体交付 4 个旧分组知识点 · 合计约 31 小时，可逐点推进 0/4 展开 ↓":
      - text: B26
      - strong: 性能、移动 Web 与媒体交付
      - text: 4 个旧分组知识点 · 合计约 31 小时，可逐点推进
      - emphasis
      - text: 0/4 展开 ↓
  - article:
    - button "B27 性能、移动 Web 与媒体交付 × Agent、MCP 与 AI 工具协议 等 3 个领域 4 个旧分组知识点 · 合计约 29 小时，可逐点推进 0/4 展开 ↓":
      - text: B27
      - strong: 性能、移动 Web 与媒体交付 × Agent、MCP 与 AI 工具协议 等 3 个领域
      - text: 4 个旧分组知识点 · 合计约 29 小时，可逐点推进
      - emphasis
      - text: 0/4 展开 ↓
  - article:
    - button "B28 身份、隐私与 AI 风险治理 × AI 原生前端与模型应用工程 5 个旧分组知识点 · 合计约 36 小时，可逐点推进 0/5 展开 ↓":
      - text: B28
      - strong: 身份、隐私与 AI 风险治理 × AI 原生前端与模型应用工程
      - text: 5 个旧分组知识点 · 合计约 36 小时，可逐点推进
      - emphasis
      - text: 0/5 展开 ↓
  - article:
    - button "B29 AI 原生前端与模型应用工程 4 个旧分组知识点 · 合计约 34 小时，可逐点推进 0/4 展开 ↓":
      - text: B29
      - strong: AI 原生前端与模型应用工程
      - text: 4 个旧分组知识点 · 合计约 34 小时，可逐点推进
      - emphasis
      - text: 0/4 展开 ↓
  - article:
    - button "B30 AI 原生前端与模型应用工程 4 个旧分组知识点 · 合计约 34 小时，可逐点推进 0/4 展开 ↓":
      - text: B30
      - strong: AI 原生前端与模型应用工程
      - text: 4 个旧分组知识点 · 合计约 34 小时，可逐点推进
      - emphasis
      - text: 0/4 展开 ↓
  - article:
    - button "B31 AI 原生前端与模型应用工程 × Agent、MCP 与 AI 工具协议 4 个旧分组知识点 · 合计约 34 小时，可逐点推进 0/4 展开 ↓":
      - text: B31
      - strong: AI 原生前端与模型应用工程 × Agent、MCP 与 AI 工具协议
      - text: 4 个旧分组知识点 · 合计约 34 小时，可逐点推进
      - emphasis
      - text: 0/4 展开 ↓
  - article:
    - button "B32 Agent、MCP 与 AI 工具协议 5 个旧分组知识点 · 合计约 43 小时，可逐点推进 0/5 展开 ↓":
      - text: B32
      - strong: Agent、MCP 与 AI 工具协议
      - text: 5 个旧分组知识点 · 合计约 43 小时，可逐点推进
      - emphasis
      - text: 0/5 展开 ↓
  - article:
    - button "B33 Agent、MCP 与 AI 工具协议 × AI 辅助研发、评审与工程治理 4 个旧分组知识点 · 合计约 34 小时，可逐点推进 0/4 展开 ↓":
      - text: B33
      - strong: Agent、MCP 与 AI 工具协议 × AI 辅助研发、评审与工程治理
      - text: 4 个旧分组知识点 · 合计约 34 小时，可逐点推进
      - emphasis
      - text: 0/4 展开 ↓
  - article:
    - button "B34 AI 辅助研发、评审与工程治理 × 图形可视化、增长内容、全球化与兼容治理专项 等 3 个领域 4 个旧分组知识点 · 合计约 30 小时，可逐点推进 0/4 展开 ↓":
      - text: B34
      - strong: AI 辅助研发、评审与工程治理 × 图形可视化、增长内容、全球化与兼容治理专项 等 3 个领域
      - text: 4 个旧分组知识点 · 合计约 30 小时，可逐点推进
      - emphasis
      - text: 0/4 展开 ↓
  - article:
    - button "B35 架构领导力与基础设施协作 5 个旧分组知识点 · 合计约 33 小时，可逐点推进 0/5 展开 ↓":
      - text: B35
      - strong: 架构领导力与基础设施协作
      - text: 5 个旧分组知识点 · 合计约 33 小时，可逐点推进
      - emphasis
      - text: 0/5 展开 ↓
- button "打开 Atlas AI 助手":
  - strong: Atlas AI
  - text: 总结 · 解释 · 查资料
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
> 26  |     await expect(page.locator('.point-hero h1 code')).toHaveText(entry.code);
      |                                                       ^ Error: expect(locator).toHaveText(expected) failed
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
  84  |     await page.goto(href); await expect(page.locator('[data-reader-ready="true"]')).toBeVisible();
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