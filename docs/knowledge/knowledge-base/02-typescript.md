# 02 TypeScript 与业务类型建模

所有“通过”均需满足[统一考核规则](00-assessment-rules.md)。代码默认启用 `strict` 和 `noUncheckedIndexedAccess`，禁止用 `any`、双重断言或 `@ts-ignore` 绕过题目。

## TS-01 类型系统、结构化类型与严格模式

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)、[TSConfig Reference](https://www.typescriptlang.org/tsconfig/)。
- 严格考核：解释结构化类型、类型擦除、赋值兼容与 excess property check；把一个宽松 JS 模块迁到严格 TS；识别 8 处隐含不安全。
- 通过标准：迁移后零类型错误、无逃生写法；能说明静态类型无法替代运行时校验的边界。

## TS-02 联合类型、收窄、`never` 与穷尽检查

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[TypeScript Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)、[Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)。
- 严格考核：为加载、成功、空、失败、无权限状态建立可辨识联合；实现类型守卫与穷尽检查；加入新状态验证遗漏是否编译失败。
- 通过标准：非法状态无法表示；新增状态能触发所有未处理分支；能解释断言、谓词和真实运行时检查的差异。

## TS-03 泛型、约束、`keyof` 与索引访问

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[TypeScript Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)、[`keyof`](https://www.typescriptlang.org/docs/handbook/2/keyof-types.html)。
- 严格考核：45 分钟实现类型安全的表格列、表单字段或 `getProperty` 工具；完成 5 道泛型推断题；解释泛型放在函数、接口或组件上的取舍。
- 通过标准：错误字段名在编译期失败，返回值保持精确类型；没有无意义泛型；至少 4/5 推断题正确。

## TS-04 映射类型、工具类型与模板字面量类型

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Mapped Types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html)、[Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)、[Template Literal Types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html)。
- 严格考核：不看源码实现 `Pick`、`Omit`、`PartialByKeys`、`DeepReadonly` 和事件名映射；用于一个真实 DTO 到表单模型转换。
- 通过标准：类型测试覆盖 readonly、optional、union 和嵌套对象；能指出递归工具类型的性能和语义风险。

## TS-05 条件类型、`infer` 与分布式行为

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)、[Creating Types from Types](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)。
- 严格考核：完成 5 道中等类型体操；实现 Promise 解包、函数参数提取和非分布式条件类型；逐步解释编译器推导。
- 通过标准：至少 4/5 通过类型测试；能准确预测 union 分布并说明何时应避免复杂类型体操。

## TS-06 函数、重载、协变逆变与组件 API

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[More on Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html)、[Type Compatibility](https://www.typescriptlang.org/docs/handbook/type-compatibility.html)。
- 严格考核：设计带重载的查询函数和受控/非受控组件 Props；分析回调参数兼容性；修复一组表面可编译但运行不安全的 API。
- 通过标准：调用端获得精确提示；实现签名覆盖所有重载；能解释为什么应优先联合参数还是重载。

## TS-07 接口契约、运行时校验与错误模型

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[TypeScript 与运行时类型边界](https://www.typescriptlang.org/docs/handbook/typescript-from-scratch.html)、[Zod 文档](https://zod.dev/)、[OpenAPI Specification](https://spec.openapis.org/oas/latest.html)。
- 严格考核：从一个真实接口示例建立请求、响应、分页、错误类型和运行时 schema；注入缺字段、错类型、未知枚举验证失败路径。
- 通过标准：网络边界输入从 `unknown` 开始；错误可区分并可观测；schema 与静态类型不存在手工双份漂移。

## TS-08 业务状态与权限类型建模

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[TypeScript Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)、[TypeScript `satisfies`](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html)、项目中的真实枚举、服务类型与权限函数。
- 严格考核：选择 `gungnir-web` 一个审核流程，将业务对象、状态、允许动作、请求参数和按钮展示建模；编写类型与运行时测试阻止非法转换。
- 通过标准：状态与动作关系有单一来源；非法动作既在类型层也在运行时失败；能回答后端新增状态时如何安全演进。

## TS-09 TypeScript 5.9/6.0 迁移与模块语义

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[TypeScript 5.9 Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html)、[TypeScript 6.0 Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html)、[TypeScript Modules Reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html)。
- 严格考核：把一个含浏览器应用、Node 服务和组件包的 workspace 从旧配置迁移到 5.9/6.0；验证 `import defer`、`node20`、模块解析、DOM lib 与 typed array 变化；输出 TS 7 迁移风险清单。
- 通过标准：三类产物运行语义与类型检查一致；不以 `skipLibCheck` 或批量断言掩盖问题；每个 breaking change 有复现、归因和修复证据；能解释编译目标、模块格式、模块解析和运行时加载是四个不同维度。

## 领域综合考核

- [ ] 已通过领域综合考核
- 任务：为一个中后台审核模块建立完整 TS 模型，包括 API、状态机、表格列、动态表单、权限动作、运行时校验和类型测试。
- 通过标准：4 小时内完成；严格模式零错误；无 `any`；至少 15 个类型/运行时测试；随机新增一个状态后，所有受影响位置能被编译器或测试暴露。
