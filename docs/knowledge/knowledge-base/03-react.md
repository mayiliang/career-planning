# 03 React 原理、状态、Hooks 与性能

所有“通过”均需满足[统一考核规则](00-assessment-rules.md)。考核使用函数组件，要求能说明 React 代码背后的状态模型，而不只是记 API。

## REACT-01 渲染、组件纯度与 state snapshot

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Render and Commit](https://react.dev/learn/render-and-commit)、[State as a Snapshot](https://react.dev/learn/state-as-a-snapshot)、[Keeping Components Pure](https://react.dev/learn/keeping-components-pure)。覆盖范围：围绕「渲染、组件纯度与 state snapshot」的定义、机制、边界、反例和通过标准；首考不得引入未列资料或题目未点名的框架/项目场景。
- 严格考核：首考题 1（资料定位）：只允许使用《Render and Commit》《State as a Snapshot》《Keeping Components Pure》，分别摘出能支撑「渲染、组件纯度与 state snapshot」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：不用资料复述「渲染、组件纯度与 state snapshot」的因果链路、适用条件、失败表现和不该使用的场景；首考题 3（最小产出）：闭卷预测批量更新、事件处理和异步回调中的状态；修复渲染期副作用；画出一次更新的 render/commit 流程；首考题 4（受限排错）：围绕首考题 3 的产出给出一个失败现象，写出预期结果、实际异常、3 个可能原因、验证步骤和修复方案，证据只能来自上述资料或产出；首考题 5（学习复述）：3 分钟向同事讲清是什么、什么时候用、如何验证没有用错。命题边界：参考答案必须逐题回指学习资料、题目依据或通过标准；不得使用未列资料或题目未点名的框架/项目场景作为主要依据。
- 通过标准：10 道输出题至少 9 题正确；能解释闭包快照、批处理、纯度和 Strict Mode 暴露问题的原因。评估边界：不得用未列资料或题目未点名的框架/项目场景作为主要评分依据。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## REACT-02 组件边界、数据流与组合

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Thinking in React](https://react.dev/learn/thinking-in-react)、[Passing Props](https://react.dev/learn/passing-props-to-a-component)、[Passing JSX](https://react.dev/learn/passing-props-to-a-component#passing-jsx-as-children)。覆盖范围：围绕「组件边界、数据流与组合」的定义、机制、边界、反例和通过标准；首考不得引入未列资料或题目未点名的框架/项目场景。
- 严格考核：首考题 1（资料定位）：只允许使用《Thinking in React》《Passing Props》《Passing JSX》，分别摘出能支撑「组件边界、数据流与组合」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：不用资料复述「组件边界、数据流与组合」的因果链路、适用条件、失败表现和不该使用的场景；首考题 3（最小产出）：把一个 500 行业务页面拆分为组件树；标注状态所有者、稳定接口和不应抽象部分；实现同一能力的组合式 API；首考题 4（受限排错）：围绕首考题 3 的产出给出一个失败现象，写出预期结果、实际异常、3 个可能原因、验证步骤和修复方案，证据只能来自上述资料或产出；首考题 5（学习复述）：3 分钟向同事讲清是什么、什么时候用、如何验证没有用错。命题边界：参考答案必须逐题回指学习资料、题目依据或通过标准；不得使用未列资料或题目未点名的框架/项目场景作为主要依据。
- 通过标准：拆分不是按视觉块机械切割；依赖方向清晰；Props 不泄漏页面内部细节；能解释过度抽象成本。评估边界：不得用未列资料或题目未点名的框架/项目场景作为主要评分依据。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## REACT-03 状态建模、派生状态与受控模式

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure)、[Sharing State](https://react.dev/learn/sharing-state-between-components)、[Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state)。覆盖范围：围绕「状态建模、派生状态与受控模式」的定义、机制、边界、反例和通过标准；首考不得引入未列资料或题目未点名的框架/项目场景。
- 严格考核：首考题 1（资料定位）：只允许使用《Choosing the State Structure》《Sharing State》《Preserving and Resetting State》，分别摘出能支撑「状态建模、派生状态与受控模式」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：不用资料复述「状态建模、派生状态与受控模式」的因果链路、适用条件、失败表现和不该使用的场景；首考题 3（最小产出）：重构一个存在重复/矛盾状态的表单或列表；实现受控与非受控切换策略；用 `key` 正确控制状态重置；首考题 4（受限排错）：围绕首考题 3 的产出给出一个失败现象，写出预期结果、实际异常、3 个可能原因、验证步骤和修复方案，证据只能来自上述资料或产出；首考题 5（学习复述）：3 分钟向同事讲清是什么、什么时候用、如何验证没有用错。命题边界：参考答案必须逐题回指学习资料、题目依据或通过标准；不得使用未列资料或题目未点名的框架/项目场景作为主要依据。
- 通过标准：消除可派生和重复状态；切换对象不会串数据；能说明状态局部化、提升和服务端状态的边界。评估边界：不得用未列资料或题目未点名的框架/项目场景作为主要评分依据。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## REACT-04 Effect、外部同步与清理

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects)、[Lifecycle of Reactive Effects](https://react.dev/learn/lifecycle-of-reactive-effects)、[You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)。覆盖范围：围绕「Effect、外部同步与清理」的定义、机制、边界、反例和通过标准；首考不得引入未列资料或题目未点名的框架/项目场景。
- 严格考核：首考题 1（资料定位）：只允许使用《Synchronizing with Effects》《Lifecycle of Reactive Effects》《You Might Not Need an Effect》，分别摘出能支撑「Effect、外部同步与清理」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：不用资料复述「Effect、外部同步与清理」的因果链路、适用条件、失败表现和不该使用的场景；首考题 3（最小产出）：从 8 个 Effect 中删除不必要项；修复重复请求、旧闭包、竞态和订阅泄漏；解释依赖数组而不是关闭 lint；首考题 4（受限排错）：围绕首考题 3 的产出给出一个失败现象，写出预期结果、实际异常、3 个可能原因、验证步骤和修复方案，证据只能来自上述资料或产出；首考题 5（学习复述）：3 分钟向同事讲清是什么、什么时候用、如何验证没有用错。命题边界：参考答案必须逐题回指学习资料、题目依据或通过标准；不得使用未列资料或题目未点名的框架/项目场景作为主要依据。
- 通过标准：所有外部同步都有对称清理；快速切换参数不出现旧结果覆盖；能从响应式值推导完整依赖。评估边界：不得用未列资料或题目未点名的框架/项目场景作为主要评分依据。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## REACT-05 Hooks 规则与自定义 Hook

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)、[Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)。覆盖范围：围绕「Hooks 规则与自定义 Hook」的定义、机制、边界、反例和通过标准；首考不得引入未列资料或题目未点名的框架/项目场景。
- 严格考核：首考题 1（资料定位）：只允许使用《Reusing Logic with Custom Hooks》《Rules of Hooks》，分别摘出能支撑「Hooks 规则与自定义 Hook」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：不用资料复述「Hooks 规则与自定义 Hook」的因果链路、适用条件、失败表现和不该使用的场景；首考题 3（最小产出）：实现请求、权限或 SDK 生命周期 Hook；提供取消、重试、卸载和依赖变化测试；审查 5 个违反 Hook 规则或抽象不当的例子；首考题 4（受限排错）：围绕首考题 3 的产出给出一个失败现象，写出预期结果、实际异常、3 个可能原因、验证步骤和修复方案，证据只能来自上述资料或产出；首考题 5（学习复述）：3 分钟向同事讲清是什么、什么时候用、如何验证没有用错。命题边界：参考答案必须逐题回指学习资料、题目依据或通过标准；不得使用未列资料或题目未点名的框架/项目场景作为主要依据。
- 通过标准：Hook 名称和 API 表达意图；不隐藏关键业务状态；测试覆盖生命周期；能说明何时普通函数优于 Hook。评估边界：不得用未列资料或题目未点名的框架/项目场景作为主要评分依据。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## REACT-06 Reducer、Context 与跨组件状态

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Extracting State Logic into a Reducer](https://react.dev/learn/extracting-state-logic-into-a-reducer)、[Scaling Up with Reducer and Context](https://react.dev/learn/scaling-up-with-reducer-and-context)。覆盖范围：围绕「Reducer、Context 与跨组件状态」的定义、机制、边界、反例和通过标准；首考不得引入未列资料或题目未点名的框架/项目场景。
- 严格考核：首考题 1（资料定位）：只允许使用《Extracting State Logic into a Reducer》《Scaling Up with Reducer and Context》，分别摘出能支撑「Reducer、Context 与跨组件状态」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：不用资料复述「Reducer、Context 与跨组件状态」的因果链路、适用条件、失败表现和不该使用的场景；首考题 3（最小产出）：为多步骤审核页设计 reducer/action；拆分读写 Context；与外部状态库或服务端缓存方案做选型答辩；首考题 4（受限排错）：围绕首考题 3 的产出给出一个失败现象，写出预期结果、实际异常、3 个可能原因、验证步骤和修复方案，证据只能来自上述资料或产出；首考题 5（学习复述）：3 分钟向同事讲清是什么、什么时候用、如何验证没有用错。命题边界：参考答案必须逐题回指学习资料、题目依据或通过标准；不得使用未列资料或题目未点名的框架/项目场景作为主要依据。
- 通过标准：reducer 纯净且状态转换可测；Context 更新范围受控；能用数据生命周期而不是组件层级决定状态位置。评估边界：不得用未列资料或题目未点名的框架/项目场景作为主要评分依据。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## REACT-07 性能测量、memo 与大列表

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[React Profiler](https://react.dev/reference/react/Profiler)、[`memo`](https://react.dev/reference/react/memo)、[`useMemo`](https://react.dev/reference/react/useMemo)、[`useCallback`](https://react.dev/reference/react/useCallback)。覆盖范围：围绕「性能测量、memo 与大列表」的定义、机制、边界、反例和通过标准；首考不得引入未列资料或题目未点名的框架/项目场景。
- 严格考核：首考题 1（资料定位）：只允许使用《React Profiler》《`memo`》《`useMemo`》《`useCallback`》，分别摘出能支撑「性能测量、memo 与大列表」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：不用资料复述「性能测量、memo 与大列表」的因果链路、适用条件、失败表现和不该使用的场景；首考题 3（最小产出）：使用 Profiler 找到复杂表格或聊天列表的实际瓶颈；实施一次优化；提交优化前后数据；回答 6 个不该 memo 的场景；首考题 4（受限排错）：围绕首考题 3 的产出给出一个失败现象，写出预期结果、实际异常、3 个可能原因、验证步骤和修复方案，证据只能来自上述资料或产出；首考题 5（学习复述）：3 分钟向同事讲清是什么、什么时候用、如何验证没有用错。命题边界：参考答案必须逐题回指学习资料、题目依据或通过标准；不得使用未列资料或题目未点名的框架/项目场景作为主要依据。
- 通过标准：优化由测量驱动，至少改善一个明确指标 30% 或证明无需优化；无错误依赖；列表达到题目给定数据量与交互指标。评估边界：不得用未列资料或题目未点名的框架/项目场景作为主要评分依据。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## REACT-08 错误边界、异步 UI 与可恢复体验

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Error Boundary](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)、[`Suspense`](https://react.dev/reference/react/Suspense)、[Displaying Data](https://react.dev/learn/displaying-data)。覆盖范围：围绕「错误边界、异步 UI 与可恢复体验」的定义、机制、边界、反例和通过标准；首考不得引入未列资料或题目未点名的框架/项目场景。
- 严格考核：首考题 1（资料定位）：只允许使用《Error Boundary》《`Suspense`》《Displaying Data》，分别摘出能支撑「错误边界、异步 UI 与可恢复体验」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：不用资料复述「错误边界、异步 UI 与可恢复体验」的因果链路、适用条件、失败表现和不该使用的场景；首考题 3（最小产出）：为页面设计加载、空、错误、无权限、部分失败和重试状态；实现错误边界；模拟渲染异常与接口失败并验证恢复；首考题 4（受限排错）：围绕首考题 3 的产出给出一个失败现象，写出预期结果、实际异常、3 个可能原因、验证步骤和修复方案，证据只能来自上述资料或产出；首考题 5（学习复述）：3 分钟向同事讲清是什么、什么时候用、如何验证没有用错。命题边界：参考答案必须逐题回指学习资料、题目依据或通过标准；不得使用未列资料或题目未点名的框架/项目场景作为主要依据。
- 通过标准：错误隔离范围合理；恢复不会丢失无关用户输入；能区分渲染错误、事件错误和异步请求错误的捕获边界。评估边界：不得用未列资料或题目未点名的框架/项目场景作为主要评分依据。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## REACT-09 React 19.2、Compiler 与服务端边界安全

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[React 19.2](https://react.dev/blog/2025/10/01/react-19-2)、[React Compiler v1.0](https://react.dev/blog/2025/10/07/react-compiler-1)、[React Server Components Security](https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components)、[React Versions](https://react.dev/versions)。覆盖范围：围绕「React 19.2、Compiler 与服务端边界安全」的定义、机制、边界、反例和通过标准；首考不得引入未列资料或题目未点名的框架/项目场景。
- 严格考核：首考题 1（资料定位）：只允许使用《React 19.2》《React Compiler v1.0》《React Server Components Security》《React Versions》，分别摘出能支撑「React 19.2、Compiler 与服务端边界安全」的定义、关键机制、边界/反例，并标明来源；首考题 2（机制解释）：不用资料复述「React 19.2、Compiler 与服务端边界安全」的因果链路、适用条件、失败表现和不该使用的场景；首考题 3（最小产出）：在真实页面启用 React Compiler 并清理无价值手工 memo，使用 Performance Tracks 验证收益；实现 `Activity` 保活切换和 `useEffectEvent` 事件逻辑；审查 RSC/Server Function 的信任边界和安全公告响应流程；首考题 4（受限排错）：围绕首考题 3 的产出给出一个失败现象，写出预期结果、实际异常、3 个可能原因、验证步骤和修复方案，证据只能来自上述资料或产出；首考题 5（学习复述）：3 分钟向同事讲清是什么、什么时候用、如何验证没有用错。命题边界：参考答案必须逐题回指学习资料、题目依据或通过标准；不得使用未列资料或题目未点名的框架/项目场景作为主要依据。
- 通过标准：Compiler 配置、lint 和运行版本匹配；性能结论有前后证据且行为不回归；能判断何时保留手工 memo；服务端输入重新校验并具备补丁与回滚方案；不会把 Server Component 当成天然可信边界。评估边界：不得用未列资料或题目未点名的框架/项目场景作为主要评分依据。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟

## 领域综合考核

- [ ] 已通过领域综合考核
- 任务：实现一个带查询、分页、详情编辑、并发请求取消和 10000 行虚拟列表的 React 管理页面，包含错误恢复、可访问性和性能报告。
- 通过标准：6 小时内完成；组件测试覆盖关键行为；无 Effect 竞态；Profiler 有前后证据；现场随机改变需求后能在 30 分钟内安全调整状态模型。评估边界：不得用未列资料或题目未点名的框架/项目场景作为主要评分依据。
- 预计耗时：资料 105 分钟；练习 165 分钟；项目 150 分钟；考核 90 分钟；复测 75 分钟
