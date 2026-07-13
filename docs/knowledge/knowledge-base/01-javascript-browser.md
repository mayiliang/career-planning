# 01 JavaScript、HTML/CSS、浏览器、网络与安全

所有“通过”均需满足[统一考核规则](00-assessment-rules.md)。建议把代码、答卷和分析报告保存在 `evidence/JS-xx/`。

## JS-01 执行上下文、作用域与闭包

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN 闭包](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Closures)、[MDN 函数](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Functions)。
- 严格考核：闭卷画出 3 段嵌套函数的作用域链并预测输出；30 分钟实现带私有状态、撤销和订阅能力的闭包模块；解释 React 旧闭包问题。
- 通过标准：输出全对；实现无全局泄漏且测试覆盖多实例隔离；能解释词法作用域、创建时机、内存保留和不适合使用闭包的场景。

## JS-02 原型、对象模型与 `this`

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN 对象模型](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Inheritance_and_the_prototype_chain)、[MDN `this`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/this)。
- 严格考核：闭卷解释 `new`、原型查找、class 语法和 `call/apply/bind`；实现简化版 `new` 与 `bind`；排查一个方法丢失 `this` 的真实 Bug。
- 通过标准：正确处理构造函数显式返回、箭头函数和多层原型；能比较组合、class 与原型委托的边界。

## JS-03 类型、相等、拷贝与不可变更新

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN 数据类型](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Data_structures)、[MDN 相等比较](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Equality_comparisons_and_sameness)、[structuredClone](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/structuredClone)。
- 严格考核：完成 15 道隐式转换与相等判断题；实现支持循环引用的深拷贝或明确拒绝的类型；修复一段因引用共享导致的状态污染代码。
- 通过标准：至少答对 13 题；实现对 Date、Map、Set、数组和循环引用有明确策略；能说明深拷贝不是默认解决方案。

## JS-04 异步、Promise 与事件循环

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN 异步 JavaScript](https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Extensions/Async_JS)、[MDN 微任务指南](https://developer.mozilla.org/zh-CN/docs/Web/API/HTML_DOM_API/Microtask_guide)。
- 严格考核：闭卷完成 10 道宏任务/微任务输出题；45 分钟实现并发数受限、可取消、失败重试的任务调度器；解释浏览器与 Node 事件循环差异。
- 通过标准：输出题至少 9/10；调度器通过并发、顺序、取消、超时和错误测试；不会把 Promise 回调误判为普通宏任务。

## JS-05 Promise 错误处理与异步控制流

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN Promise](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Using_promises)、[MDN AbortController](https://developer.mozilla.org/zh-CN/docs/Web/API/AbortController)。
- 严格考核：实现 `all` 或 `allSettled`；为搜索联想请求加入取消、竞态保护和错误分级；回答未处理拒绝、finally 返回值和串并行取舍。
- 通过标准：实现符合原生语义且有边界测试；旧请求不能覆盖新结果；能区分业务错误、网络错误、取消和程序错误。

## JS-06 ES Modules 与模块边界

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN JavaScript 模块](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Modules)、[Node.js ESM](https://nodejs.org/api/esm.html)。
- 严格考核：解释静态依赖、live binding、循环依赖和动态导入；重构一个循环依赖示例；设计浏览器应用与组件包的导出边界。
- 通过标准：可独立定位循环依赖初始化问题；能说清 ESM/CJS 互操作风险、tree-shaking 前提和 `exports` 字段作用。

## WEB-01 HTML 语义、表单与可访问性基础

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN HTML](https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/Structuring_content)、[WAI ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)。
- 严格考核：把一段全是 `div` 的表单与弹窗改成语义结构；只用键盘完成操作；用辅助技术树检查名称、角色、状态。
- 通过标准：表单标签、焦点顺序、错误提示和弹窗焦点管理正确；不能用 ARIA 掩盖可使用原生元素的问题。

## WEB-02 CSS 布局、层叠与响应式

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN CSS 布局](https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/CSS_layout)、[MDN 层叠](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_cascade/Cascade)。
- 严格考核：90 分钟无组件库实现响应式列表、吸顶工具栏和弹层；解决 BFC、层叠上下文、溢出和长文本问题；解释 Flex/Grid 选择。
- 通过标准：覆盖 320px、768px、1440px；无横向溢出；不能依赖大量 `!important` 或固定像素碰巧通过。

## BROWSER-01 渲染流水线、DOM 事件与存储

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN 关键渲染路径](https://developer.mozilla.org/zh-CN/docs/Web/Performance/Guides/Critical_rendering_path)、[MDN 事件](https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/Scripting/Events)、[Web Storage](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Storage_API)。
- 严格考核：画出 HTML 到像素的流程；实现事件委托并处理动态节点；比较 cookie、localStorage、sessionStorage、IndexedDB 的一致性与安全边界。
- 通过标准：能用 DevTools 证据区分 style/layout/paint/composite；事件实现正确处理冒泡与清理；存储选型不保存不应落盘的敏感数据。

## NET-01 HTTP、缓存、Cookie 与 CORS

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN HTTP](https://developer.mozilla.org/zh-CN/docs/Web/HTTP)、[HTTP 缓存](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Guides/Caching)、[CORS](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Guides/CORS)。
- 严格考核：分析一份请求瀑布流；为 HTML、带哈希静态资源和用户 API 设计缓存头；手工推演带凭证 CORS 预检；定位 304、缓存未更新和跨域失败。
- 通过标准：缓存策略不会泄漏用户数据；正确区分 `no-cache`/`no-store`、强缓存/协商缓存、同源策略/CORS；能给出客户端和服务端验证步骤。

## SEC-01 XSS、CSRF、鉴权与前端安全边界

- [ ] 自评已掌握
- [ ] 已通过严格考核
- 学习资料：[MDN Web 安全](https://developer.mozilla.org/zh-CN/docs/Web/Security)、[OWASP XSS 防护](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)、[OWASP CSRF 防护](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)。
- 严格考核：审查一个富文本/Markdown 页面和 token 登录流程；构造威胁模型；修复 5 个包含 XSS、CSRF、开放重定向、越权误判和敏感信息泄露的问题。
- 通过标准：至少发现全部高危问题；能说明前端权限显示不等于服务端授权；修复包含输入、输出、传输、Cookie 和 CSP 层面的合理边界。

## 领域综合考核

- [ ] 已通过领域综合考核
- 任务：独立实现一个无框架的可访问数据看板，包含异步请求、缓存、取消、响应式布局、错误处理和安全渲染，并附 DevTools 网络/渲染分析报告。
- 通过标准：4 小时内完成；自动测试覆盖核心逻辑；键盘可用；无明显 XSS 风险；能闭卷解释任意 5 处实现的浏览器底层原因。
