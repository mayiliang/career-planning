# 04 Umi/Max、Ant Design 与中后台应用

所有“通过”均需满足[统一考核规则](00-assessment-rules.md)。考核优先使用现有 Umi/Max 项目，不要求脱离真实技术栈造玩具。

## UMI-01 路由、布局与页面生命周期

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Umi 路由](https://umijs.org/docs/guides/routes)、[Umi 目录结构](https://umijs.org/docs/guides/directory-structure)。
- 严格考核：闭卷设计嵌套路由、动态参数、404、登录页无布局和路由级拆包；定位一次旧路径迁移后的菜单/跳转遗漏。
- 通过标准：配置可运行且深链刷新正常；能解释配置式/约定式路由、Outlet、base 和 history 的边界。

## UMI-02 initialState、运行时配置与应用初始化

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Umi Max 数据流与全局初始状态](https://umijs.org/docs/max/data-flow#全局初始状态)、[Umi 运行时配置](https://umijs.org/docs/api/runtime-config)。
- 严格考核：画出 token、用户、权限、layout、菜单和首屏请求的初始化链路；修复一个初始化竞态或重复请求问题。
- 通过标准：未登录、token 过期、刷新、切换用户均有确定行为；初始化失败可恢复且不会白屏。

## UMI-03 请求层、错误处理与取消

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Umi Max Request](https://umijs.org/docs/max/request)、[AbortController](https://developer.mozilla.org/zh-CN/docs/Web/API/AbortController)。
- 严格考核：设计统一请求配置、鉴权头、错误映射、业务错误、静默请求和取消；为一个真实 service 对齐类型与 UI 错误状态。
- 通过标准：不重复 toast；401、403、422、500、取消和离线处理边界清晰；页面不依赖未验证的响应形状。

## UMI-04 页面、按钮与数据权限

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Umi Max Access](https://umijs.org/docs/max/access)、项目真实权限与菜单配置。
- 严格考核：实现页面、按钮、字段和数据范围四层权限矩阵；构造直接访问 URL、伪造前端状态和权限刷新场景。
- 通过标准：前端负责体验、后端负责最终授权的边界明确；权限来源单一；无权限状态不闪现敏感内容。

## ANTD-01 Form 数据流、联动与校验

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Ant Design Form](https://ant.design/components/form/)、[ProComponents Form](https://procomponents.ant.design/components/form)。
- 严格考核：实现动态数组、条件字段、异步校验、编辑回填、只读态和防重复提交；排查 `initialValues`、preserve 和联动失效问题。
- 通过标准：新建/编辑切换不串值；零值与空值显示正确；校验无竞态；提交参数与接口契约一致。

## ANTD-02 Table/ProTable 查询、分页与导出

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Ant Design Table](https://ant.design/components/table/)、[ProTable](https://procomponents.ant.design/components/table)。
- 严格考核：实现服务端分页、排序、筛选、URL 同步、列权限、批量操作和异步导出；处理页码回退与请求竞态。
- 通过标准：查询条件与请求参数可追踪；刷新可恢复状态；导出遵循任务进度与下载流程；大数据量无明显卡顿。

## ANTD-03 Modal、Drawer、详情与反馈

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Ant Design Modal](https://ant.design/components/modal/)、[Drawer](https://ant.design/components/drawer/)、[Descriptions](https://ant.design/components/descriptions/)。
- 严格考核：实现可复用详情/编辑容器；处理异步确认、关闭保护、焦点恢复、重复打开和过期数据；修复一个弹窗状态串联 Bug。
- 通过标准：生命周期稳定；危险操作有二次确认；关闭与重新打开状态正确；键盘和焦点行为合格。

## ANTD-04 Ant Design Mobile 与移动业务组件

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Ant Design Mobile](https://mobile.ant.design/)、[移动端适配指南](https://mobile.ant.design/guide/css-variables)。
- 严格考核：实现移动表单、列表、弹层、日期与上传流程；在窄屏、横屏、软键盘和安全区环境验收。
- 通过标准：触控目标、滚动、键盘遮挡、safe-area 和弱网状态均通过；不会照搬桌面交互。

## 领域综合考核

- [ ] 已通过领域综合考核
- 任务：用 Umi Max + Ant Design 实现一个审核业务模块，包含路由、初始化、权限、查询表格、详情、编辑、审核、异步导出和异常处理。
- 通过标准：8 小时内完成；刷新与深链正常；权限绕过测试失败；自动测试覆盖核心流；能够说明项目目录、状态、请求和组件边界。
