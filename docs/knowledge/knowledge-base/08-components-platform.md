# 08 组件库、设计系统与平台化

所有“通过”均需满足[统一考核规则](00-assessment-rules.md)。平台化考核重点是复用收益与边界，不以“抽象得多”作为高分标准。

## COMP-01 组件职责、API 与组合设计

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[React Thinking in React](https://react.dev/learn/thinking-in-react)、[Ant Design API 设计](https://ant.design/docs/spec/api/)、`aiui` 现有组件 API。
- 严格考核：为复杂业务组件设计 Props、事件、插槽、状态和错误 API；用 3 个差异场景验证；评审布尔参数爆炸与泄漏实现细节问题。
- 通过标准：主场景简单、扩展场景可组合、非法组合可被类型阻止；能明确哪些需求不纳入组件。

## COMP-02 受控/非受控、状态同步与命令式能力

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Sharing State](https://react.dev/learn/sharing-state-between-components)、[`useImperativeHandle`](https://react.dev/reference/react/useImperativeHandle)。
- 严格考核：实现同时支持受控和非受控的选择器或编辑器；处理外部重置、默认值变化和异步提交；论证命令式 API 的最小边界。
- 通过标准：无双数据源竞态；切换模式有警告或禁止；命令式 API 不暴露内部 DOM 细节。

## DS-01 Design Token、主题与一致性

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Ant Design Design Token](https://ant.design/docs/react/customize-theme)、[W3C Design Tokens](https://www.w3.org/community/design-tokens/)。
- 严格考核：建立颜色、字号、间距、圆角与状态 token；实现明暗主题；迁移一组硬编码组件并检查视觉回归。
- 通过标准：语义 token 与原始值分层；主题切换无不可读状态；新增品牌主题无需逐组件修改。

## COMP-03 文档、示例、测试与版本治理

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Storybook Docs](https://storybook.js.org/docs/writing-docs)、[Semantic Versioning](https://semver.org/)、[Keep a Changelog](https://keepachangelog.com/)。
- 严格考核：为一个组件提供 API、示例、边界、可访问性、测试和迁移说明；发布一次 breaking change 并编写升级指南。
- 通过标准：陌生使用者仅看文档可完成主场景；变更级别正确；示例可运行；升级指南包含前后对照。

## PLATFORM-01 Schema 与配置化页面

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[JSON Schema](https://json-schema.org/learn/getting-started-step-by-step)、[JSON Forms Documentation](https://jsonforms.io/docs/)、项目中的表单/表格配置和权限模型。
- 严格考核：为查询表单、表格和动作定义可版本化 schema；实现渲染器、校验和自定义扩展；处理 schema 迁移与错误配置。
- 通过标准：简单需求配置完成，复杂需求可安全逃生；schema 有版本与校验；不把所有业务逻辑塞进 JSON 表达式。

## PLATFORM-02 微前端拆分、隔离、通信与部署

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[qiankun Guide](https://qiankun.umijs.org/guide)、[Module Federation Concepts](https://webpack.js.org/concepts/module-federation/)。
- 严格考核：针对真实系统做是否采用微前端的决策；设计拆分、路由、权限、样式隔离、共享依赖、通信和独立部署；演练子应用故障。
- 通过标准：先证明组织/发布收益大于复杂度；故障可隔离；版本与依赖冲突有策略；能说明不采用的条件。

## PLATFORM-03 物料平台、采用率与治理

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Google Engineering Practices](https://google.github.io/eng-practices/)、[Storybook Documentation](https://storybook.js.org/docs)、现有公共组件使用数据、Issue 和重复代码样本。
- 严格考核：为组件/物料平台制定准入、维护、废弃、指标和推广方案；用真实数据证明一个组件值得沉淀。
- 通过标准：有 owner、SLA、版本与退出机制；指标至少包含采用率、重复减少、缺陷和升级成本；没有只建不管的目录。

## 领域综合考核

- [ ] 已通过领域综合考核
- 任务：从 3 个真实页面中提炼一个可复用组件或 schema 能力，完成 API、实现、类型、测试、文档、示例、版本与迁移方案，并让另一页面实际接入。
- 通过标准：8 小时内完成；至少减少一处真实重复；两种消费者场景通过；考官提出一个不适合抽象的需求时能拒绝并说明理由。
