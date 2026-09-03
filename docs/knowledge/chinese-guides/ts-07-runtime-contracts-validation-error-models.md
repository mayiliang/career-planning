# TypeScript 知识点讲义

## TS-07 接口契约、运行时校验与错误模型

TypeScript 类型在编译后消失。接口响应、localStorage、URL、postMessage、环境变量和 AI 输出即使写了 `as User`，运行时仍可能完全不同。可靠系统把外部值以 unknown 接入，通过可执行 schema 解析和归一化，再交给内部模型；失败则进入稳定、可恢复且不泄密的错误模型。

### 学习前先确认

- 直接前置：[TS-02 联合类型、收窄、`never` 与穷尽检查](../chinese-guides/ts-02-unions-narrowing-never-exhaustiveness.md#ts-02)。本讲直接使用 unknown、守卫、判别联合与穷尽分支，泛型不是硬前置。

### 一、静态类型只覆盖受检查的程序关系

函数参数标注 User 能阻止已检查调用者传 number，却不能让网络 JSON 变成 User。`response.json()` 的值来自外部，声明文件无法约束服务器、缓存、代理或旧版本实际返回。

`as User` 是编译器断言，不执行检查。它应只出现在已经有其他证明的位置；直接断言外部值等于关闭报警器。

建立原则：越过运行时边界的值都是 unknown，只有解析成功的内部值才获得领域类型。

### 二、接口契约包含成功、失败与演进

**接口契约（API Contract）**不只是一个成功 DTO，还包括方法、状态、标头、认证、错误 code、分页、幂等、版本与兼容。前后端类型相同也不能证明 HTTP 与业务语义一致。

OpenAPI/JSON Schema/Protobuf 等可作为单一来源生成类型与校验器，但生成物仍需在运行时执行，并验证生成版本与服务版本。手写类型和 schema 双份维护则用测试检查漂移。

契约 owner、变更策略和消费者矩阵比工具名更重要。

### 三、Schema 是可执行的结构规则

**运行时模式（Runtime Schema）**检查值形状、字段类型、范围、格式与组合，并可返回路径化问题。schema 库提供组合、推断和错误格式，不替你决定业务规则。

基础检查区分 object/null/array，使用 Object.hasOwn 处理必需字段，限制字符串长度、数值 finite、安全整数和数组数量。日期字符串还需格式与实际日历有效性，URL 需协议/源业务规则。

schema 通过表示满足已声明规则，不表示数据真实、已授权或无恶意业务含义。

### 四、Parse 与 validate 可以包含归一化

validate 常只判断接受/拒绝；parse 可以把外部表示转换为内部模型，例如 ISO 时间转 Temporal/Date、空白字符串转 null、旧字段迁移到新结构。

归一化必须确定、可测试，不把错误值悄悄改成合法业务状态。`amount:'9'` 是否允许转 number 是接口决定；安全或财务边界通常严格拒绝比宽松 coercion 更好。

保留原始值只用于受控诊断，内部模型不携带未知多余字段进入后续序列化。

### 五、严格对象与未知字段策略

服务端新增字段通常应向后兼容，客户端可忽略未知字段；但配置、命令和安全策略可能要求 strict object，未知字段即失败。选择取决于方向与风险。

“strip unknown”适合读取响应的宽容消费者，“reject unknown”适合写命令和签名对象，passthrough 容易把攻击者字段带到数据库或下游。每个 schema 明确策略。

原型危险键与对象原型也要处理。将外部对象复制为安全内部对象，不直接继续修改原引用。

### 六、判别联合承载版本和状态

以稳定 `type`/`kind`/`version` 区分消息：

```ts
type Event =
  | { version: 1; type: 'created'; id: string }
  | { version: 1; type: 'deleted'; id: string; reason?: string };
```

schema 先检查公共字段，再按 discriminant 分支。未知 type 可以安全忽略、保存为 unknown-event 或拒绝，取决于协议；不能默认当成最接近已知状态。

内部 switch 用 assertNever，新增成员会迫使处理所有分支。

### 七、未知枚举需要兼容策略

服务端可能新增 `status:'refunded'`，旧客户端只知道 paid。直接抛异常会让整页崩溃，把它强转 paid 又造成错误决策。

可返回 `{kind:'unknown-status', rawStatus}`，UI 显示“该状态需更新后查看”，并禁用高风险操作。对安全命令则 fail closed，要求升级。兼容不等于继续执行未知含义。

监控未知值频率与服务版本，避免降级状态永久无人处理。

### 八、错误模型分离内部原因与用户表达

错误至少包含稳定 code、边界 path/field、可重试性、requestId/correlationId 和受控 cause。用户文案由 UI 按 code、本地化和上下文映射，不直接显示 error.message 或原始响应。

```ts
type DataError =
  | { code: 'NETWORK'; retryable: true }
  | { code: 'INVALID_RESPONSE'; retryable: false; path?: string }
  | { code: 'FORBIDDEN'; retryable: false };
```

错误 code 是程序合同，改名需版本治理；日志信息可以更丰富但先脱敏与限长。

### 九、throw、Result 与状态各有位置

不可继续的底层失败可以 throw，由边界统一捕获；预期业务分支如冲突、无库存用 Result/判别联合更清晰；UI 再把结果映射到 loading/success/empty/error/recovering。

不要把所有错误都变 `null` 丢失原因，也不要让每层 catch 后重新 throw 新字符串丢失 cause。边界添加上下文一次，并保留关联 ID。

Promise rejection 类型在 TypeScript 中不受函数签名完整表达，调用约定与测试必须补上。

### 十、异常规范化从 unknown 开始

catch variable 在严格配置下是 unknown。先判断 Error、DOMException、HTTP error 或库错误，再映射内部 code。跨 realm 的 `instanceof Error` 可能失效，可同时检查安全结构。

永远限制序列化 cause 深度、字符串长度和自定义 getter，避免错误上报自身抛错或泄露。Abort/timeout 与真实失败分开，不把用户取消记成错误率。

### 十一、路径化问题服务表单与诊断

schema issue 可以有 path `['items',3,'price']`、code、expected/received。映射到表单时只暴露用户能修正的字段问题；服务端内部路径和原始值不显示。

数组和联合可能产生大量 issue，设置上限并合并。错误摘要把焦点和字段关联交给可访问 UI，不能只把 JSON dump 给用户。

### 十二、请求解码先限制资源

在 parse 前检查 HTTP status、Content-Type、Content-Length（若可信）并给流式读取设置最大字节。JSON.parse 可能消耗内存/CPU，深层对象与超大数组会形成资源攻击。

schema 也可能在复杂联合/正则上昂贵。限制深度、数量、字符串长度，避免灾难性正则。服务端和客户端都需要边界，前端校验不能保护服务端。

### 十三、请求输入与响应输出应分别建模

CreateOrderInput、OrderRecord、OrderResponse 和 OrderView 有不同字段和信任。复用数据库 Entity 作为所有 DTO 会暴露内部字段并耦合迁移。

请求 schema 对未知字段更严格，响应消费者可对新增字段宽容；内部领域模型包含经过归一化的不变量；UI view model 包含显示派生。每层转换函数可测试。

### 十四、生成类型不等于运行时验证

从 OpenAPI 生成 `.d.ts`/client 能保证调用代码与文档一致，却不能保证服务实际响应一致。生成 runtime schema、响应拦截器或契约测试，确保真实样本经过解析。

版本固定到 spec hash，CI 检查未提交生成差异。不要在生产每次动态下载未经验证的 schema 决定安全解析。

### 十五、前后端契约测试补充单边校验

provider test 证明服务实现 schema 和语义，consumer test 证明客户端依赖字段与错误。消费者驱动契约适合跨团队演进，但不能覆盖所有业务和基础设施。

测试成功、每类错误、未知字段、未知枚举、null/缺失、超大值、旧版本与新增可选字段。真实 HTTP 层还检查状态和 Content-Type。

### 十六、PostMessage、存储与 AI 输出同样需要解析

event.data、localStorage 字符串、IndexedDB 旧记录、URLSearchParams 和模型结构化输出都在边界。TypeScript interface 不会随存储 schema 自动迁移，也不能让模型保证 JSON。

消息验证 origin/source 后再 parse schema；存储记录按 version 迁移；URL 限制长度与允许集合；AI 输出 parse 失败可重试/修复但不能直接执行工具或写数据库。

### 十七、品牌类型只能在验证入口创建

UserId 与 OrderId 都是 string 时可用 branded type 防混用，但若任何地方 `as UserId`，品牌失去价值。提供 parseUserId/check format 的唯一构造入口。

品牌不验证数据库存在、权限或当前租户，只证明通过本地格式/来源规则。序列化后品牌消失，再进入系统时重新解析。

### 十八、版本化 schema 支持渐进迁移

持久数据和消息包含 schemaVersion。解析器先识别版本，旧版本通过纯迁移函数逐步升级，当前版本再严格验证；未知未来版本不按旧结构猜测。

迁移函数不依赖网络和当前 UI，输入输出可保存 fixture。大规模数据采用双读/单写和覆盖率，失败保留旧数据与恢复路径。

### 十九、日志、隐私与可观测性

记录 code、path、schemaVersion、release、requestId 与计数，默认不记录完整 payload。调试采样也要字段 allowlist、访问控制、留存和删除策略。

同类 parse error 聚合，关注突然上升和新字段，不为每个用户数据创建高基数标签。错误监控必须能连接到服务版本和接口 owner。

### 二十、类型与运行时测试共同证明边界

类型测试证明解析成功后字段精确、调用者必须处理 Result 分支、品牌不能混用；运行时测试用 unknown 样本检查接受/拒绝、路径、归一化和脱敏。

Property-based/fuzz 测试可生成缺失、额外、深层和类型变化，mutation test 检验删掉某条校验会不会被发现。固定回归保存真实事故的最小脱敏样本。

### 二十一、失败要有用户恢复路径

数据格式错误时，UI 不应白屏。读取场景可显示局部不可用、重新加载、升级应用或联系支持；写入校验问题让用户修正；权限失败不重复请求；冲突提供刷新/合并。

恢复动作本身受取消、重试预算和当前账号约束。错误模型的价值是让系统选择正确下一步，不只是让日志好看。

### 二十二、何时选择 schema 库或手写解析

小而稳定的边界可手写清晰守卫；复杂嵌套、复用与错误路径适合成熟 schema 库。选择关注 bundle、性能、类型推断、标准兼容、维护和安全公告。

不要让库 DSL 取代领域命名。把 schema、内部类型和转换封装在边界模块，业务层不依赖具体库错误对象。

对跨团队长期契约，再增加可发现的示例与版本说明：一份最小合法输入、一份常见失败、一份向后兼容新增字段。示例由 schema 校验并在 CI 执行，避免文档代码与真实规则各自演进；但示例只是教学入口，不能替代完整 schema 与攻击边界测试。

### 学完后应能说明

你应能解释 TypeScript 静态类型为何不能验证外部值，设计 unknown→schema parse→内部模型/稳定错误的边界；能处理未知字段/枚举、版本迁移、资源限制、错误脱敏和用户恢复，并用类型测试、契约测试、fuzz 与真实 HTTP 证据保持声明和运行时一致。
