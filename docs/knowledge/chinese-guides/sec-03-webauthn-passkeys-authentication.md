# Web 身份安全知识点讲义

## SEC-03 WebAuthn、Passkey 与安全认证体验

通行密钥把认证从“用户记住一个可复制秘密”转为“认证器为正确站点使用私钥签名一次性挑战”。前端只负责请求选项、调用浏览器与表达状态；服务端才验证 challenge、origin、RP、签名和凭证状态，并建立会话。理解这条边界，才能既利用抗钓鱼优势，又避免把浏览器弹窗成功误当登录成功。

### 学习前先确认

- 直接前置：[NET-01 浏览器网络协议、Fetch 与请求可靠性](../chinese-guides/net-01-browser-network-fetch-reliability.md#net-01)。本讲直接使用 origin、HTTPS、请求状态、取消、重放与服务端最终结果。

### 一、WebAuthn 是协议，Passkey 是用户凭证体验

**Web 身份验证（Web Authentication）**（WebAuthn）是浏览器、认证器与依赖方协作的公钥认证 API。**依赖方（Relying Party）**（RP）是提供认证服务的站点；认证器可能在设备平台、安全密钥或凭证提供方中。

**通行密钥（Passkey）**通常指可发现的 WebAuthn 凭证及其面向用户的体验，可能跨设备同步，也可能绑定单设备。它不是所有 WebAuthn 凭证的同义词。产品文案应说明“使用通行密钥登录”，工程协议仍用 credential、authenticator、RP 等精确术语。

生物识别模板通常留在设备或认证器，RP 收到的是签名与验证数据，不会收到指纹或面部图像。不能向用户声称服务器保存生物信息。

### 二、公钥凭证把秘密留在认证器

注册时认证器为 RP 创建密钥对，私钥不交给站点，服务端保存 public key、credential ID、user handle 与元数据。认证时认证器用私钥对 challenge 和上下文签名，服务端用公钥验证。

公钥泄露通常不能伪造签名，但凭证数据库仍含账号映射和隐私数据，需要保护。前端不能用 Web Crypto 自己模拟 WebAuthn，也不应解析复杂认证器数据后替服务端做最终决定。

站点绑定由 RP ID 与浏览器实际 origin 共同参与，降低仿冒站收集可复用秘密的能力。

### 三、Challenge 必须一次性、短期并绑定流程

**挑战（Challenge）**由服务端密码学安全随机生成，绑定账号/匿名登录尝试、会话、ceremony 类型和过期时间。注册 challenge 不能用于认证，A 用户 challenge 不能用于 B 用户，已使用 challenge 不能重放。

服务端原子消费 challenge 与建立结果。两个并发验证只有一个成功；失败日志记录稳定原因，不把剩余有效期、账号存在或凭证细节回显给攻击者。

前端只解码服务端 options 中的二进制字段，不生成、修改或缓存 challenge 当权威。页面刷新后重新取得新 options。

### 四、RP ID 与 Origin 形成抗钓鱼边界

RP ID 通常是当前域或其可注册父域，不能任意指向无关站点。认证器只为匹配 RP ID 的凭证响应，浏览器把实际 origin 放入 client data，服务端同时验证 expected origin 与 rpIdHash。

`https://evil.test` 即使复制 UI，也无法为 app.test 得到可通过服务端验证的断言。被接管子域、错误 RP 范围和不安全恢复仍可能破坏整体，因此部署拓扑与 DNS 也在威胁模型中。

本地开发例外与生产 secure context 要分开，不能把测试放宽带到线上。

### 五、注册从近期认证的会话开始

用户添加长期凭证前应近期再认证，避免被窃旧会话悄悄绑定攻击者设备。服务端 options 包含 rp、opaque user ID、算法、challenge、excludeCredentials、resident key 与 user verification 策略。

前端调用 `navigator.credentials.create({publicKey})` 得到 PublicKeyCredential，再按服务端约定序列化 ArrayBuffer。浏览器 Promise resolve 只表示本地 ceremony 得到响应，UI 应进入“服务器验证中”。

服务端验证 challenge、origin、RP、credential ID、user verification、算法/签名与凭证重复后再保存。保存和 challenge 消费要一致；失败时明确“未完成绑定”，不能显示成功。

### 六、Attestation 不是默认越多越安全

attestation 可提供认证器来源证明，但会增加隐私、证书链、元数据和兼容治理。普通消费者 Passkey 常使用 `attestation:'none'`，减少设备可识别信息。

高保证企业场景若要求特定认证器，要定义可信根、元数据更新、撤销、未知型号和离线验证策略。不要在没有服务端治理时把 attestation 改为 direct 后只看前端字段。

### 七、认证只有服务端验证后完成

登录 options 可包含 allowCredentials，也可支持可发现凭证让用户选择。前端调用 `navigator.credentials.get()` 获得 assertion，提交服务端。服务端检查 pending/fresh challenge、origin、RP、credential active、user presence/verification、signature 与账号绑定。

只有服务端建立会话并返回成功，前端才进入 authenticated。浏览器 API resolve、动画勾号或能解码 assertion 都不是认证证据。

会话建立仍需 Secure/HttpOnly/SameSite、CSRF、吊销和服务端授权。Passkey 替换认证因子，不替代完整会话系统。

### 八、User Presence 与 User Verification 不同

UP 表示用户与认证器发生了某种交互，UV 表示认证器按策略验证了用户，如 PIN 或生物识别。服务端根据业务风险设置 `userVerification` 并检查 flags，不能只让前端传一个布尔值。

设备解锁、认证器策略和同步凭证会影响实现。高风险操作可以要求更强验证或近期认证，但仍重新授权具体资源与金额。

### 九、签名计数只是风险信号之一

传统认证器的 signCount 递增可帮助发现克隆，现代同步/多设备凭证可能不严格递增或保持零。计数异常不能单独永久封号；结合 backup eligibility/state、凭证元数据、会话行为和再验证。

凭证记录保存最近使用、状态和必要元数据，安全日志避免原始 credential、签名或个人设备细节。风险决策可解释并允许恢复。

### 十、前端以状态机表达 ceremony

状态至少包括 idle、loading-options、prompting-authenticator、verifying-server、authenticated/created，以及 cancelled、unavailable、recoverable-error、rejected。不同阶段允许的按钮、取消和重试不同。

AbortController 在路由离开或新尝试开始时取消旧 ceremony，迟到服务端结果按 attempt ID 丢弃。不能让并发登录弹出多个认证器提示。

错误文案不把安全细节给用户。challenge used/expired、错误 RP、未知 credential 可统一为可重试失败，详细原因进入脱敏服务端日志。

### 十一、NotAllowedError 不能直接翻译成用户拒绝

NotAllowedError 可能表示取消、超时、无匹配凭证、窗口失焦或策略限制；AbortError 可能来自应用取消。InvalidStateError、SecurityError 等也需按阶段和能力解释。

UI 使用中性文案：“未完成通行密钥验证，你可以重试或使用其他方式”。不要显示“此邮箱有三个 Passkey”或根据不同错误泄露账号存在。

监控按内部类别聚合，客户端不上传完整 options 或 credential response。

### 十二、Conditional UI 是增强入口

Conditional mediation 让 Passkey 出现在登录表单自动填充候选中，需要 input autocomplete 与浏览器能力配合。它不应替代显式登录按钮和其他安全方式。

能力检测使用当前 PublicKeyCredential 提供的方法并对不存在回退，不能靠 User-Agent。即使 API 存在，设备可能没有匹配凭证、同步尚未完成或策略禁用。

页面只启动一个 conditional get，显式按钮触发时取消/协调旧请求。无条件式 UI 时回到普通 WebAuthn 或密码+MFA，不显示空白登录页。

### 十三、恢复路径决定系统真实安全下限

Passkey 抗钓鱼，但攻击者可能通过弱客服、邮箱或 SIM 恢复接管账号。恢复至少评估多个独立因子、等待期、风险信号、安全通知和已有设备确认。

用户应能在近期再认证后列出可理解的凭证名称、创建/最近使用、同步/设备绑定状态，添加、重命名和撤销。不要展示原始公钥或内部 ID。

新增/删除后通知账号所有者，并提供非当前会话的撤销入口。恢复完成后评估旧凭证、会话和恢复因子的吊销，不能假定改密码自动删除 Passkey。

### 十四、凭证同步与设备绑定要诚实表达

平台提供方可能同步 Passkey，也可能因账号、网络、管理策略而不可用。产品不承诺“换设备一定出现”。鼓励至少两个独立登录/恢复途径，避免单设备丢失锁死。

企业可以选择硬件安全密钥或设备绑定策略，代价是发放、替换与支持。消费者产品重视易用同步，仍要给用户凭证管理与风险通知。

### 十五、防枚举覆盖 options、错误与时序

匿名登录请求不应通过状态码、正文、可见文案或明显时延透露账号是否存在或是否有 Passkey。服务端可返回形状一致的 options 或安全失败，统一限流和风控。

用户选择可发现凭证后，user handle 在服务端映射账号；不要信任客户端提交的用户名覆盖凭证绑定。登录完成后才显示账号特定信息。

### 十六、WebAuthn 不替代授权和事务确认

认证证明凭证参与当前 ceremony，不证明用户能批准某订单。服务端对每个命令检查当前会话、资源、角色、状态、版本与业务约束。高风险 action 可把 transaction details 绑定到独立确认流程，但不要自行发明签名协议。

会话被劫持、同源 XSS、恶意扩展和服务端越权仍需 CSP、会话安全与授权。前端隐藏按钮永远不是最终控制。

### 十七、验证使用虚拟认证器和服务端断言

自动测试可用浏览器虚拟认证器覆盖注册、登录、user verification、无凭证与移除。服务端测试直接构造 challenge pending/used/expired、错误 origin/RP、撤销 credential 和签名失败。

端到端断言服务端成功前 UI 不跳转，相同 challenge 重放无第二会话，取消无假成功，未知账号文案一致，能力缺失有回退。生产监控观察 ceremony 阶段失败率而不采集敏感响应。

### 十八、版本演进与库治理

WebAuthn 数据结构、浏览器 capability 与 passkey 体验持续演进。生产服务端使用维护中的成熟库，固定版本、关注安全公告并用官方测试向量；不要手写 CBOR、COSE 和签名验证。

新 Signal API 或条件式能力按官方文档、目标浏览器与凭证提供方行为核验，只作为增强。协议核心 challenge/origin/RP/signature 不能因新 UI 简化。

跨设备验证还应覆盖系统时间错误、凭证提供方暂时离线、企业策略禁止同步和多个账号选择。测试团队不能只在一台已配置好的开发电脑上完成一次成功登录；兼容矩阵要包含无凭证的新设备、只有安全密钥的设备、恢复后的旧会话和凭证已被服务端撤销的情况。

### 学完后应能说明

你应能区分 WebAuthn、Passkey、RP、认证器、credential、challenge 与 assertion，解释注册/认证的服务端验证链和抗钓鱼来源；能设计可取消、防枚举的前端状态机、条件式 UI 回退和凭证恢复治理，并说明为何浏览器成功、Passkey 和生物识别都不等于业务授权。
