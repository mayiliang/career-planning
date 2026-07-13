# 06 工程化、测试、CI/CD 与发布质量

所有“通过”均需满足[统一考核规则](00-assessment-rules.md)。考核必须通过真实命令和产物验证，不能只画概念图。

## ENG-01 模块图、构建流程与产物分析

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[webpack Concepts](https://webpack.js.org/concepts/)、[Vite Guide](https://vite.dev/guide/)、[JavaScript Modules](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Modules)。
- 严格考核：从入口追踪依赖图、loader/plugin 或转换插件、chunk 和运行时；手工解释一个构建产物；定位一次构建期与运行期差异。
- 通过标准：能从源码定位到产物；说清转译、打包、压缩、分包和运行时加载的区别；结论有产物证据。

## ENG-02 Vite/Webpack/Umi 开发与生产差异

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Why Vite](https://vite.dev/guide/why.html)、[Vite Build](https://vite.dev/guide/build)、[Umi MFSU](https://umijs.org/docs/guides/mfsu)。
- 严格考核：比较开发服务器、HMR、预构建和生产打包；排查一个 dev 正常、build 失败或部署后 chunk 404 的问题。
- 通过标准：定位过程包含复现、最小化、日志与产物检查；修复兼顾 base、缓存和旧 chunk；不会用清缓存作为唯一解释。

## ENG-03 包管理、lockfile 与 workspace

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[pnpm Workspaces](https://pnpm.io/workspaces)、[pnpm Dependency Types](https://pnpm.io/package_json)、[Semantic Versioning](https://semver.org/)。
- 严格考核：设计多包 workspace；解释 dependencies/dev/peer/optional；解决幽灵依赖、peer 冲突和 lockfile 漂移。
- 通过标准：干净环境可重复安装；包边界与版本策略明确；不会通过删除 lockfile 隐藏根因。

## ENG-04 组件库构建、CJS/ESM、types 与 exports

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Node Packages](https://nodejs.org/api/packages.html)、[Vite Library Mode](https://vite.dev/guide/build.html#library-mode)、`aiui` 的 father 配置与产物。
- 严格考核：发布一个最小 TS 组件包，生成 ESM、CJS 和声明文件；配置 `exports`；在两种消费者环境验证；处理 CSS 与 peer 依赖。
- 通过标准：导入、类型、tree-shaking 和样式均可验证；React 不被重复打包；破坏性变更有版本策略。

## ENG-05 lint、format、typecheck 与提交门禁

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[ESLint Configure](https://eslint.org/docs/latest/use/configure/)、[TypeScript Compiler Options](https://www.typescriptlang.org/tsconfig/)、项目现有脚本。
- 严格考核：为一个仓库设计本地与 CI 质量脚本；注入未使用变量、危险 Promise、类型错误和格式问题；验证门禁阻止合入。
- 通过标准：命令在干净环境可重复；规则有原因和例外机制；不会把所有问题自动忽略或降级为 warning。

## TEST-01 单元测试、测试替身与覆盖边界

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Vitest Writing Tests](https://vitest.dev/guide/learn/writing-tests)、[Node Test Runner](https://nodejs.org/api/test.html)。
- 严格考核：为解析、权限或状态转换纯函数设计等价类和边界测试；使用 fake/stub/mock 并解释取舍；完成一次变异测试式人工检查。
- 通过标准：测试能发现注入缺陷；不只追覆盖率；失败信息可读；时间、随机和外部依赖可控。

## TEST-02 React 组件测试

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Testing Library Queries](https://testing-library.com/docs/queries/about/)、[User Event](https://testing-library.com/docs/user-event/intro/)。
- 严格考核：为表单、异步列表或弹窗写基于用户行为的测试，覆盖成功、校验、加载、失败、重试和权限；禁止测试内部 state。
- 通过标准：优先使用可访问查询；异步断言稳定；测试重构组件内部实现后仍有效；至少能发现两个故意植入的缺陷。

## TEST-03 E2E、关键路径与测试隔离

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Playwright Introduction](https://playwright.dev/docs/intro)、[Best Practices](https://playwright.dev/docs/best-practices)。
- 严格考核：实现登录、查询、编辑、提交和结果验证的 E2E；处理鉴权状态、网络模拟、数据隔离、失败截图和重试。
- 通过标准：连续运行 10 次无随机失败；测试不依赖执行顺序；失败可定位；不使用任意固定 sleep。

## ENG-06 CI/CD、发布、监控与回滚

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[GitHub Actions](https://docs.github.com/actions)、[web.dev Monitoring](https://web.dev/articles/vitals-field-measurement-best-practices)、现有部署与监控流程。
- 严格考核：设计从 PR 到生产的流水线，包含缓存、检查、构建、制品、环境、灰度、告警与回滚；演练错误版本和旧 chunk 问题。
- 通过标准：同一制品逐环境晋级；密钥不进入构建产物；回滚有时间目标与验证；发布结果可观测。

## 领域综合考核

- [ ] 已通过领域综合考核
- 任务：为一个现有项目建立最小可用质量体系，包括可重复构建、lint/typecheck、单测、组件测试、E2E、CI 配置、制品说明和回滚手册。
- 通过标准：8 小时内完成；注入 5 类缺陷均被对应门禁阻止；CI 可重复；考官随机删除缓存后仍能从零完成全流程。
