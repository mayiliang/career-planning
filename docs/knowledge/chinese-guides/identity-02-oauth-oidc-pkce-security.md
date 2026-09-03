# OAuth 与 OIDC 知识点讲义

## IDENTITY-02 OAuth 安全最佳实践、OIDC 与 PKCE

OAuth 解决的是受限授权：客户端在不获得用户密码的情况下，拿到范围、对象和时间都受限制的访问能力。OpenID Connect 在 OAuth 之上增加身份层，让客户端能够验证一次登录结果。两者经常一起出现，但把“登录”“授权访问 API”和“账号绑定”混在一起，是身份系统最危险、也最常见的错误之一。

### 学习前先确认

- 直接前置：[IDENTITY-01 Cookie、Session、Token 与浏览器身份边界](../chinese-guides/identity-01-session-cookie-token-browser-boundaries.md#identity-01)。本讲默认你已经能区分认证、会话、授权、Cookie、access token、refresh token 与服务端吊销。

### 一、先认识四个角色和两条通道

OAuth 核心角色包括资源所有者、客户端、授权服务器和资源服务器。用户在浏览器中与授权服务器交互，客户端通过前通道获得短期 code，再通过后通道把 code 换成 token；资源服务器只接受目标正确且权限足够的 access token。

前通道经过浏览器，URL、历史、扩展、重定向和恶意页面都可能观察或干扰数据。后通道通常由服务器或受控客户端直接调用 token endpoint，能进行客户端认证和 TLS 保护。安全设计的目标之一，是避免高价值 access token 暴露在前通道。

OAuth 不规定用户如何登录授权服务器，也不保证 access token 含有可供客户端登录的用户身份。客户端若需要登录，应使用 OIDC 或明确的身份协议，而不是解析一个碰巧像 JWT 的 access token。

### 二、授权码流程把高价值 token 留到后通道

客户端生成授权请求，带上 client_id、精确 redirect_uri、scope、state 和 PKCE challenge，把浏览器导航到授权服务器。用户完成认证和授权后，授权服务器只把短期、一次性的 code 返回到已注册回调地址。

客户端在 token endpoint 提交 code、原 redirect_uri 和 PKCE verifier，换取 access token；OIDC 场景还可能得到 ID token，符合策略时得到 refresh token。code 应绑定客户端、redirect URI、PKCE challenge、短期过期和一次性消费。

**授权码（Authorization Code）**不是 access token。资源服务器不得接受 code，客户端也不应把 code 长期存储。code 被使用、过期或交换失败后都必须失效，重放不能产生第二组 token。

### 三、PKCE 让窃取 code 的攻击者缺少证明

客户端为每次授权生成高熵随机 code_verifier，再计算 `BASE64URL(SHA256(verifier))` 得到 code_challenge，授权请求发送 challenge，换 token 时发送 verifier。授权服务器比较后才签发 token。

**代码交换证明密钥（Proof Key for Code Exchange）**的目标是把授权请求和 token 交换绑定到同一次客户端实例。只偷到回调 URL 中 code 的攻击者，没有 verifier 就无法交换。现代安全基线对公共客户端要求 PKCE，机密客户端也应使用以获得纵深防御。

生产只使用 `S256`，不要在有能力计算 SHA-256 时退回 plain。verifier 每次请求新建，不能固定在构建配置、多个标签页共享或从可预测时间戳生成。服务端必须在授权请求阶段记录 challenge，不能信任 token 请求临时补交的值。

### 四、state 保护客户端事务，nonce 保护身份响应

state 由客户端生成并绑定发起登录前的浏览器事务，用于抵抗登录 CSRF、回调混淆和丢失上下文。它应高熵、一次性、短期，并与本地受保护会话关联；回调中的 state 必须与发起值恒定时间比较。

OIDC nonce 放入认证请求，并由授权服务器写入 ID token。客户端验证签名和标准 claims 后还要比较 nonce，防止旧 ID token 被重放到新流程。state 与 nonce 有交叉防护效果，但语义不同，不能只生成一个固定字符串同时敷衍两项检查。

错误页、日志和分析平台不应记录完整 code、state、nonce 或 token。回调处理完成后清理 URL，避免历史、Referer 或复制链接泄露临时参数。

### 五、redirect URI 必须精确匹配

授权服务器为客户端预注册允许的 redirect URI，并在请求时做精确比较。通配子域、任意路径前缀和客户端提供的二次跳转参数会把 code 送给攻击者。原生应用使用平台规定的 claimed HTTPS 或 loopback 等模式，不应自行发明可被别的应用抢注的 scheme。

回调端点本身不能是开放重定向器。处理 code 前先恢复并验证本地事务，交换完成后只导航到服务器保存或严格允许的内部路径。用户输入的 `returnTo=https://evil.example` 不能直接使用。

多个环境为不同 redirect URI 使用独立客户端注册，避免测试域、预览域和 localhost 混进生产 allowlist。删除旧环境时同步撤销注册，减少被接管域名成为回调入口。

### 六、客户端类型取决于能否保密

浏览器 SPA、移动应用和桌面应用是公共客户端，发布给用户的代码无法可靠保存 client_secret。把 secret 放进前端环境变量、混淆包或原生二进制都不构成保密。

运行在受控服务器并能保护凭证的客户端可以是机密客户端，在 token endpoint 使用私钥 JWT、mTLS 或其他适合的认证。共享对称 secret 泄露面更大，应有轮换和访问控制。

客户端认证证明哪个客户端调用 token endpoint，不证明用户身份，也不能替代 PKCE。反过来，公共客户端没有 secret 并不意味着可以省略 client_id、redirect URI 和实例绑定。

### 七、OIDC 在 OAuth 之上增加身份语义

OIDC 请求包含 `scope=openid`，授权服务器作为 OpenID Provider 返回 ID token。客户端作为 Relying Party 验证它，用来确认一次认证事件及主体，而不是把它发送给业务 API 当 access token。

**身份令牌（ID Token）**通常是签名 JWT，核心 claims 包括 `iss`、`sub`、`aud`、`exp`、`iat`，按流程还包括 `nonce`、`azp`、`auth_time` 等。subject 是 issuer 命名空间内的稳定标识；邮箱、手机号和昵称会变化，不应直接作为全局主键。

OIDC 还定义 UserInfo、Discovery、认证上下文和会话相关能力。具体产品只实现需要的部分，但必须遵守所选流程的完整验证要求，不能只从 ID token 解码头像和邮箱就建立账号。

### 八、验证 ID token 是一组不可拆的检查

客户端从可信 issuer 的 Discovery 文档取得端点与 JWKS URI，经 HTTPS 拉取密钥并按缓存策略更新。验证固定允许的签名算法、签名、issuer 精确值、audience 是否包含当前 client_id、必要时 azp、expiry/not-before、nonce 和认证时间策略。

不能使用 token 自带的任意 `jku`/`x5u` 去抓密钥，也不能因为 `kid` 未命中就无上限刷新。密钥轮换允许旧新密钥短期并存，未知 kid 触发受限刷新，仍失败则拒绝。

时钟偏差只给很小容忍窗口，不能用数小时 leeway 掩盖同步故障。验证失败对用户显示中性可恢复信息，内部日志记录原因类别而不记录原始 token。

### 九、access token 只给目标资源服务器

access token 的 audience 应限制到特定资源服务器或很小集合，scope 也只授予业务需要。资源服务器验证 token 的 issuer、audience、expiry、scope/authorization details 和撤销状态，再对具体资源做授权。

客户端不能把面向 API-A 的 token 交给 API-B，也不能把 ID token 当 API 凭证。资源服务器不应该根据前端传来的角色字符串放行；token claim 是授权输入之一，资源所有权和最新状态仍由服务端判断。

Token Exchange、资源指示器或多 audience 架构会增加混淆风险。为每条调用链记录谁签发、给谁、能做什么、能否转委托，比追求“一个 token 走遍全系统”更安全。

### 十、scope 不是完整权限模型

scope 表示客户端被授予的访问范围，例如读取资料或修改日历。它通常粒度较粗，不表达“只能修改用户自己的某个文档”“订单已关闭不可退款”等对象和状态约束。

授权服务器控制可签发范围，用户同意界面表达可理解的访问，资源服务器再根据主体、资源和业务规则裁决。客户端隐藏超出 scope 的入口改善体验，却不能代替 API 拒绝。

高风险生态可使用 Rich Authorization Requests 等结构化授权描述，但仍需要明确资源、金额、期限与重放边界。不要把几十个自定义 scope 当作替代领域授权模型的方法。

### 十一、账号绑定必须使用 issuer 与 subject

联合登录回调拿到验证通过的 `(iss, sub)` 后，服务端查找外部身份绑定，再连接到本地账号。不能只凭 email 自动合并：邮箱可更改、回收，不同 issuer 的验证语义也不同。

首次绑定已有账号要要求当前账号近期认证，并向用户说明新身份来源。若允许基于已验证邮箱发现候选账号，也要进行额外确认，避免攻击者在弱 issuer 上声明受害者邮箱后接管。

解除最后一个登录方式前确保有安全恢复路径。绑定、解绑和恢复都写审计日志、通知用户，并使高风险会话重新验证。

### 十二、授权服务器混淆需要绑定 issuer

同一客户端若支持多个授权服务器，攻击者可能让客户端把一个服务器签发的 code 发送给另一个服务器。防护包括为每个 issuer 保存独立配置和事务，在授权响应验证 `iss`，并把回调事务绑定到预期 issuer/token endpoint。

Discovery URL、authorization endpoint、token endpoint、JWKS 和 userinfo 必须来自同一受信 issuer 配置，不能让浏览器参数覆盖。服务器端请求还要防 SSRF，限制协议、主机、重定向和响应大小。

配置更新视为安全变更，经过审查和渐进发布。动态发现提高互操作性，也把元数据与密钥缓存变成需要监控的依赖。

### 十三、刷新令牌轮换能暴露重放

公共客户端的 refresh token 应发送方约束或轮换。每次成功刷新发出新 token、废弃旧 token，并保留家族关系；旧 token 再次使用表明可能泄露，需要撤销家族和重新认证。

**刷新令牌轮换（Refresh Token Rotation）**不是简单更新过期时间。服务端要原子消费，客户端要协调多标签页/并发请求，避免合法竞态频繁触发安全事件。很短的受控重试窗口不能演变成旧 token 长期有效。

刷新响应若缩小 scope，客户端必须接受新范围；授权服务器可因风险、密码变更、长期未使用或用户撤权拒绝刷新。UI 要回到明确登录状态，而不是无限循环刷新。

### 十四、发送方约束降低持有者重放

DPoP 让客户端为请求生成证明并把 access token 绑定到公钥；mTLS 把 token 绑定到客户端证书。资源服务器验证证明、方法、URI、时间、唯一标识和 token 绑定，降低单独窃取 token 后的利用。

发送方约束不消除恶意脚本在原客户端内发请求，也不替代 XSS 防护、scope 和授权。密钥生命周期、重放缓存、代理规范化和时钟偏差都会影响实现，应该使用成熟库与官方互操作测试。

对普通浏览器应用，引入 DPoP 前先判断密钥存储和威胁收益；BFF 常能更直接地减少 token 暴露。高级机制不是越多越安全，只有端到端正确实现才形成边界。

### 十五、隐式流程与密码模式不应作为新系统基线

隐式流程把 access token 放进授权响应前通道，增加 URL、历史和注入泄露风险。现代客户端使用授权码+PKCE。Resource Owner Password Credentials 让客户端直接收集用户密码，破坏身份提供方边界，也难以支持 MFA、Passkey 和联合登录。

迁移旧系统时先列出实际 grant、客户端类型和兼容约束，再逐步引入授权码+PKCE、精确 redirect URI、短期 token 和刷新保护。不能只把 endpoint 名称改成 OAuth 2.1 就宣称完成。

Client Credentials 用于客户端代表自身访问服务，不代表用户。设备授权等特殊流程适用于输入受限设备，也要按其规范处理用户码、轮询与钓鱼风险。

### 十六、截至当前应如何看 OAuth 2.1

OAuth 2.0 Security Best Current Practice 已作为 RFC 9700 发布，汇总了 PKCE、避免隐式流程、发送方约束、刷新令牌保护、最小权限和攻击模型等生产建议。OIDC Core 1.0 incorporating errata set 2 是当前身份层的稳定规范依据。

截至 2026 年 8 月，OAuth 2.1 仍是 IETF 活跃 Internet-Draft，第 15 版日期为 2026-03-02，并非已经发布的 RFC。它整合并简化现代 OAuth 基线，但草案仍可能变化。

生产文档要写“依据 RFC 9700 与相关已发布 RFC 实现，并跟踪 OAuth 2.1 草案”，不要写“已升级到 OAuth 2.1 标准”后省略实际安全控制。版本名称不能替代逐项验证。

### 十七、浏览器客户端需要事务状态机

登录 UI 至少区分 idle、preparing、redirecting、handling-callback、exchanging-code、establishing-session、authenticated、cancelled 和 failed。回调页面只能处理一次；刷新、后退或重复打开不能重复交换 code。

每次事务有唯一 ID，保存预期 issuer、state、nonce、PKCE verifier、redirect URI、创建时间和返回路径。保存位置要防篡改并短期；服务端 BFF 模式把事务放在 HttpOnly 会话，纯 SPA 需谨慎处理页面脚本暴露。

迟到回调、两个并发登录和账号切换要有明确规则。开始新登录可取消旧事务；回调与当前事务不匹配时拒绝，不要“尽量继续”绑定到当前用户。

### 十八、用攻击路径验证而不是只看 happy path

自动测试固定授权服务器和资源服务器，覆盖错误 state、错误 nonce、过期/重放 code、错误 issuer/audience、未知 kid、错误 redirect URI、PKCE 不匹配、scope 缩小、刷新重放和退出撤销。每个失败都断言不会建立本地会话。

集成环境通过代理记录端点调用，确认 code 只交换一次、token 不出现在 URL/浏览器日志、面向错误 audience 的 token 被资源服务器拒绝。账号绑定测试使用两个 issuer 的相同邮箱，证明不会静默合并。

生产监控关注授权开始到回调的转化、错误类别、key refresh、refresh reuse、issuer 分布和资源服务器拒绝。日志只保存事务摘要和安全原因，不能复制完整授权响应。

### 学完后应能说明

你应能画出授权码+PKCE 的前后通道，区分 OAuth 授权、OIDC 登录、ID token、access token 与 refresh token；能完整说明 state、nonce、redirect URI、issuer/audience、Discovery/JWKS、账号绑定和刷新重放防护；也能解释为什么 RFC 9700 是已发布安全基线、OAuth 2.1 仍应按草案跟踪，并用负向测试证明混淆与重放不会建立会话。
