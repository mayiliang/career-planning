# React 知识点讲义

## REACT-09 React Compiler、服务端组件边界与安全升级

框架演进不只是新 API。React Compiler 改变手工 memo 的必要性；Server Components/Server Functions 改变代码运行位置、序列化和攻击面；安全公告可能连续修补同一机制。高级开发者要把功能、编译、运行时信任边界、实际依赖树和可回滚升级连接起来。

### 学习前先确认

- 直接前置：[REACT-07 性能测量、memo 与大列表](../chinese-guides/react-07-performance-memo-large-lists.md#react-07)、[REACT-08 错误边界、异步 UI 与可恢复体验](../chinese-guides/react-08-error-boundaries-suspense-recovery.md#react-08)。两份资料共享更早祖先，但分别提供性能证据与异步/服务端边界所需概念，不互相替代。

版本事实核验日期为 2026-08-30。版本号不是背诵目标，实际升级必须重新阅读官方公告与锁文件。

### 一、先分清四个变化层

自动分析并缓存组件工作的工具称为**React 编译器（React Compiler）**。只在服务器运行并把描述结果发送给客户端的是**服务端组件（server component）**，可由客户端触发的服务器入口是**服务端函数（server function）**。安全公告中的**远程代码执行（remote code execution）**和**拒绝服务（denial of service）**代表不同影响；**软件物料清单（software bill of materials）**帮助定位真实制品依赖。

React 版本包含运行时 API；Compiler 是构建期优化；RSC/Server Functions 通常由框架和打包器提供端到端协议；路由/全栈框架还有自己的版本与适配器。只升级 `react` 顶层包不能证明其他层安全或兼容。

记录 `react`、`react-dom`、`react-server-dom-*`、框架、bundler plugin 和锁文件解析版本，理解谁实际进入服务器/客户端制品。

### 二、React Compiler 自动分析并缓存

Compiler v1.0 可在兼容代码中自动应用与 memo/useMemo/useCallback 类似的优化，减少不必要重渲染。它依赖组件/Hook 遵守纯度与规则，不会修复错误状态模型或副作用。

编译是优化而非语义前提：关闭 Compiler 应仍正确。启用前以现有性能脚本建立基线，逐目录/组件渐进，观察编译诊断、bundle、Profiler 与行为测试。

### 三、不要一次删除全部手工 memo

Compiler 能优化许多场景，但现有自定义 comparator、外部库合同和性能热点需逐项核验。先启用并测量，再删除一处 memo 复测。某些 memo 可能承担误用的语义保证，应先修正确性。

lint 规则可发现不兼容模式。不要通过大量忽略注释“强行编译”；记录 bailout 原因，优先修不纯和违规 Hook，对第三方/复杂区域保留稳定回退。

### 四、编译产物需要和源码同等审查

检查 source map、错误堆栈、开发/生产差异、HMR 和测试转换。Compiler 插件顺序要与 Babel/Vite/框架官方集成一致，避免不同环境一个启用一个未启用。

性能对比使用相同 React、数据和制品；缓存优化可能降低 render 但增加内存。只有用户指标和维护成本共同改善才推广。

### 五、Server Component 决定代码运行位置

Server Component 在服务端执行并把可序列化描述传给客户端，能直接访问服务端数据源且不把其组件代码发送客户端。Client Component 处理交互和浏览器 API，通过边界引用。

`'use client'` 标记客户端模块边界，不表示文件只在浏览器绝不参与服务构建；`'use server'`/Server Function 也不是授权注解。具体协议由框架实现，必须按框架文档理解。

### 六、跨边界 props 必须可序列化且最小

函数、数据库连接、类实例和秘密不能随意传到客户端。只传界面需要的最小 DTO，避免把完整用户/权限对象序列化。日期、Map 等是否支持取决于框架协议，不应假设普通 JSON 或任意对象都可传。

序列化边界也需要运行时校验和版本兼容。客户端返回的 action 参数仍是不可信输入。

### 七、Server Function 是远程入口

即使调用写在组件中，Server Function 最终可被构造成网络请求。服务端必须认证当前主体、验证输入、授权具体资源/动作、防重与记录审计。隐藏按钮、闭包捕获 userId 或 TypeScript 类型都不是安全控制。

```ts
export async function approveOrder(input: unknown) {
  const actor = await requireSession();
  const command = parseApproveCommand(input);
  await authorize(actor, 'approve', command.orderId);
  return approveWithVersion(command);
}
```

错误响应不泄漏堆栈或内部数据，写操作使用版本/幂等协议。

### 八、RSC 引入新的反序列化攻击面

服务端必须解析客户端发来的协议 payload。2025-12 的 RSC 远程代码执行公告表明，即使应用未显式写 Server Function，只要框架支持 RSC 也可能处于受影响面。首次补丁随后又出现 DoS、源码暴露和不完整修补。

安全响应不能只看“我们没用那个 API”。要检查实际服务器包、框架能力、暴露端点和传递依赖。

### 九、连续公告意味着补丁也要再核验

官方 2026-01-26 更新指出 19.0.3/19.1.4/19.2.3 补丁仍不完整，安全回补为 19.0.4/19.1.5/19.2.4。安全基线来自对应 `react-server-dom-*` 包与框架解析树，不等于只把 react-dom 升到某版本。

截至本讲核验日，React 文档主线仍为 19.2；但任何实施都应重新读取同一公告最新更新时间、框架 advisory 与包管理器 audit，不能永久复制本讲数字。

### 十、理解 RCE、DoS、源码暴露与 CVE/CVSS

RCE 表示攻击者可能执行代码，DoS 表示消耗 CPU/内存使服务不可用，源码暴露可能泄漏业务逻辑/秘密线索。CVE 是漏洞标识，CVSS 是通用严重度参考，不替代本组织暴露面和数据风险评估。

修复优先级还看是否公网、是否可利用、可回滚性和补偿控制。WAF 可临时减轻部分请求，不是依赖升级替代品。

### 十一、从锁文件确认真实版本

使用包管理器 why/list 检查每个 RSC 包由谁引入、是否有多版本、框架是否内嵌。扫描服务器制品/容器，而不仅 package.json。Monorepo 各应用可能解析不同依赖。

升级后重新生成锁文件并审查 diff，避免无关大范围更新。CI 应拒绝受影响组合，SBOM/制品扫描关联发布版本。

### 十二、升级前建立可复核基线

记录类型、单元、E2E、build、bundle、关键 route、SSR/hydration、Server Function 授权与回滚。Compiler 另外记录 Profiler；RSC 记录网络 payload、缓存与错误路径。

不要同时升级 React、Router、框架、构建器并重构业务。拆分可回滚步骤，先补安全时采用最小兼容补丁，再规划功能迁移。

### 十三、灰度与回滚必须包含数据/协议兼容

前后两版本可能并存，Server Function payload、缓存和 HTML/chunk 要兼容。灰度监控错误、延迟、内存、授权拒绝和 fallback；触发阈值时能回退旧制品，但旧制品不能回到已知漏洞版本。

数据库迁移需向后兼容。静态资源保留多版本，避免旧 HTML 请求被删除 chunk。

### 十四、RSC 缓存必须按身份与数据敏感度划分

服务端缓存键如果缺少用户/租户/权限上下文，可能把个性化结果串给他人。公开数据可共享缓存，私有数据默认按身份隔离或不缓存。注销/权限变化要失效相关条目。

不要把 access token、cookie 或服务端秘密放进客户端 payload。检查 HTML、Flight 数据、source map 和日志，而不只看页面文字。

### 十五、PPR、resume 与实验能力要可回退

React 19.2 引入/推进 Activity、useEffectEvent、cacheSignal、Performance Tracks、PPR/resume 等能力，但部分依赖框架/实验通道。生产采用前核对稳定级别、部署适配器、缓存/流式代理和浏览器行为。

每项能力建立最小对照，保留不使用它的稳定实现。不要因为顶层 React 版本支持，就假设当前框架已安全集成。

### 十六、安全测试不复现真实攻击也能建立证据

可以用依赖树断言、受影响版本拒绝门禁、Server Function 未授权/跨资源请求、恶意结构输入的安全拒绝、秘密产物扫描和速率/超时验证。不要在生产或未授权环境复现漏洞 payload。

测试边界：未登录、普通用户越权、陈旧版本、重复提交、超大/深层输入、取消与错误脱敏。服务端日志记录 request/actor/action，不记录秘密。

### 十七、版本资料的阅读方法

稳定中文学习页用于理解机制；release blog、changelog 和安全公告用于实施日核验。记录访问日期、受影响包、修复版本、后续更新和本项目证据。第三方摘要只能做线索，最终以官方公告和锁文件为准。

截至 2026-08-30，React 官方后续安全公告给出的安全回补版本为 19.0.4、19.1.5 与 19.2.4，并说明先前的 19.0.3、19.1.4、19.2.3 修复不完整。这是一条会变化的实施信息：每次升级都必须再次打开官方公告核验。

### 十八、Compiler 上线要区分可编译、行为正确与真实收益

第一阶段只在 CI 编译并收集不兼容诊断，不改变生产；第二阶段按目录/组件灰度，比较测试、错误和性能；最后才扩大范围。Compiler 跳过某段代码不一定是缺陷，强行改写到“全绿”可能改变语义。

对关键组件保存编译前后 Profiler 基线、bundle diff 和交互测试。确认收益后再删除冗余 memo；如果无收益或诊断成本高，保留回退开关。自动缓存减少手工工作，不免除纯 render、稳定 identity 和 effect 边界设计。

### 十九、Server Function 需要完整的远程入口防线

把调用视为 HTTP/RPC：解析 schema、认证当前会话、对具体资源授权、限制 body/嵌套深度与频率、处理 CSRF/重放、设置超时，并返回可序列化的安全错误。客户端传来的 userId、role 和价格都只是声明，服务端从可信主体和数据库重新取得。

写操作使用幂等键或业务版本处理重复提交。审计记录 actor、action、resource、request ID 与结果，不记录 cookie、token 或完整敏感 payload。异常堆栈只进入受控日志。

### 二十、供应链证据要从依赖树延伸到发布制品

锁文件、包管理器解析树和 SBOM 用于回答“真正打进了哪个版本”；构建 provenance、制品 hash 和部署记录用于回答“测试的版本是否真的上线”。仅搜索源码的版本字符串无法证明传递依赖或预构建镜像安全。

安全门禁应拒绝已知受影响组合，保留例外的责任人、期限和缓解措施。补丁后重新生成锁文件/制品证据并扫描客户端 bundle、Flight payload、source map 与服务器镜像，避免秘密或旧代码残留。

### 二十一、CSP 与输出编码是纵深防御而非 RSC 专属补丁

框架默认转义文本仍不能保护 `dangerouslySetInnerHTML`、不可信 URL、脚本 nonce 配置和第三方资源。建立内容净化、允许协议、严格 CSP、cookie 属性与必要的 Subresource Integrity；每项策略在真实 SSR/流式响应上验证，避免开发配置与生产不同。

CSP 报告是线索，不应自动加入宽泛 allowlist。修复根因后再最小放行，记录哪个组件/第三方确实需要该能力。

### 进阶：安全回滚不能重新暴露已知漏洞

常规功能回滚可切回旧制品，但安全补丁发布后，旧制品若仍含受影响依赖就不是安全退路。应准备“修补版本上的功能降级”或向前修复，静态资源和协议保持兼容，数据库迁移可逆或向后兼容。

发布门禁保存最低安全版本、例外期限和制品 hash；回滚工具在执行前同样检查依赖策略。事故演练验证停止流量、撤销实验能力、保留修补版本和恢复业务，而不是只验证部署按钮可用。

### 学完后应能说明

你应能区分 React 运行时、Compiler、RSC 协议与框架，设计渐进编译评估，解释 Server Function 为何必须重新授权，按实际依赖树响应连续安全公告，并建立从基线、灰度到安全回滚的升级证据。
