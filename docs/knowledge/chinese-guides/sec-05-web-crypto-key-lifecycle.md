# Web 密码学知识点讲义

## SEC-05 从一条加密笔记理解密钥的边界

“已经 AES 加密”只描述做过一次运算。谁保管密钥、密文是否被换到另一条记录、旧密钥何时可以删除，仍然没有答案。把密钥也放在同一份可下载数据里，或让正在执行的恶意脚本调用解密，都不会被算法名称自动解决。

本篇用一条临时笔记串起加密、篡改、不可导出、换钥和迁移失败。重点是能解释每个参数保护什么，以及程序失败时如何保住原数据。

### 学习前先确认

- 直接前置：[SEC-01 XSS、CSRF 与前端输入输出信任边界](../chinese-guides/sec-01-xss-csrf-trust-boundaries.md#sec-01)。需要理解同源脚本能访问的内容，以及客户端成功与服务端授权的区别。

### 一、先问要保护什么，再选择原语

| 需求 | 对应工具 | 容易混淆的地方 |
| --- | --- | --- |
| 把字节放进 JSON 或 URL | UTF-8、Base64url 等编码 | 任何知道编码规则的人都能还原 |
| 比较内容指纹 | 摘要，例如 SHA-256 | 没有密钥，不能单独证明来自可信发布者 |
| 共享秘密的双方核对消息 | MAC，例如 HMAC | 双方都能生成，不能区分是哪一方生成 |
| 用公钥验证某私钥签出的内容 | 数字签名 | 公钥本身也需要可信来源 |
| 隐藏明文并检验完整性 | 认证加密，例如 AES-GCM | 参数、上下文和密钥生命周期仍要设计 |

**Web Crypto** 提供这些底层能力，其中 **SubtleCrypto** 的多数操作是异步的，输入输出以字节为主。它不包含完整的账号系统、证书信任链、端到端通信协议或密钥托管服务。

例如，想让下载者看不到前端包内的 API secret，不适合“在前端加密这个 secret”：能解开的代码和材料仍要交给下载者。想保护服务器不能读取的通信，则需要明确参与者、身份验证、恢复与密钥交换的完整协议。

### 二、CryptoKey 是句柄，不是权限凭空消失

**CryptoKey** 记录密钥种类、算法、`usages` 与 `extractable`。AES 对称密钥是 secret；签名密钥对有 public 与 private。只给需要的用途，能拒绝把解密密钥误用于签名等错误操作。

`extractable:false` 限制通过 exportKey 等操作取出原始材料，不表示脚本无法使用它。假设同源 XSS 拿到了一个允许 decrypt 的句柄，它仍可能请求解密；甚至不必碰密钥，直接读取用户刚输入的明文即可。

因此，密钥不可导出与 [SEC-02 的脚本入口控制](../chinese-guides/sec-02-csp-trusted-types-reporting.md#六trusted-types-要求值经过命名入口)解决不同问题。页面能操作密钥的时段、能接触明文的代码和第三方脚本，都是威胁模型的一部分。

### 三、AES-GCM 的 IV、AAD 和 tag 各有什么用

**AES-GCM** 是一种 **Authenticated Encryption**：在保护明文的同时验证数据是否被修改。Web Crypto 的加密结果包含密文和认证标签；解密失败时不能继续使用一部分“看起来正常”的明文。

**Initialization Vector**（IV）用于每次加密，常用 12 字节；同一密钥下必须避免重复。IV 不需要保密，可以随密文保存。`crypto.getRandomValues` 提供密码学随机数，但 API 不会替应用记住所有历史 IV，更不会在再次使用同一个 IV 时自动拒绝。

**Additional Authenticated Data**（AAD）不加密，却参加认证。可以把记录身份绑定进去：同一密文在笔记 A 下可读，搬到笔记 B 后解密失败。AAD 应由当前可信业务上下文重建，不能全盘采用不可信信封自报的账号与记录编号。

### 四、运行加密、篡改和换钥观察页

保存为 `crypto-note.html`，通过本地 HTTP 静态服务打开，例如 `http://127.0.0.1:端口/crypto-note.html`。需要支持 Web Crypto 的可信上下文；本机回环地址通常符合条件，正式站点使用 HTTPS。可使用你已有的静态服务，不需要接入任何外部 API。

这是一条内存中的教学笔记，刷新后密钥与密文都会消失。它不承诺永久保存，也不是可直接用于敏感资料的保险箱。固定文字便于观察，不要替换成真实秘密。

```html example=sec05-crypto-page runtime=project file=crypto-note.html
<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8"><title>一条加密笔记的生命周期</title>
<style>
body { max-width: 940px; margin: 36px auto; padding: 0 24px; font: 17px/1.7 system-ui; color: #173c34; background: #f3f7f5; }
section { margin: 18px 0; padding: 22px; background: white; border: 1px solid #c8d9d0; border-radius: 12px; }
button { padding: 8px 12px; margin: 5px; font: inherit; } pre { white-space: pre-wrap; } label { display: block; }
</style>
<h1>一条加密笔记的生命周期</h1>
<p>仅使用固定教学文本；刷新后全部清空。</p>
<section><h2>密钥与记录</h2><p id="meta"></p>
<button id="seal">保存教学笔记</button><button id="open">读取原记录</button>
<button id="export">尝试导出密钥</button><button id="reuse">尝试复用原 IV</button></section>
<section><h2>只修改副本</h2>
<button id="cipher">改密文一字节</button><button id="iv">改 IV 一字节</button>
<button id="context">放到另一条笔记下读取</button></section>
<section><h2>换钥与迁移</h2>
<button id="rotate">启用 v2，新写用 v2</button>
<label><input id="fail" type="checkbox">模拟迁移提交前失败</label>
<button id="migrate">将旧记录迁到当前密钥</button></section>
<section><h2>本次结果</h2><p id="result" role="status">正在准备密钥</p></section>
<script type="module">
const $ = id => document.getElementById(id);
const encoder = new TextEncoder(), decoder = new TextDecoder('utf-8', { fatal: true });
const context = 'note:demo-1';
const text = '今天读完一节';
const keys = new Map(), usedIVs = new Map();
let active = 'v1', record = null, busy = false, ready = false;
const to64 = bytes => btoa(String.fromCharCode(...bytes));
const from64 = text => Uint8Array.from(atob(text), char => char.charCodeAt(0));
const aad = (version, expectedContext) => encoder.encode(JSON.stringify(['lesson-note', 1, version, expectedContext]));
function render() {
  $('meta').textContent = `新写版本=${active}；记录版本=${record?.keyVersion ?? '尚未保存'}`;
  for (const button of document.querySelectorAll('button')) button.disabled = busy || !ready;
  for (const id of ['open', 'reuse', 'cipher', 'iv', 'context', 'migrate']) $(id).disabled ||= !record;
  $('rotate').disabled ||= active === 'v2';
}
async function generate(version) {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  keys.set(version, key); usedIVs.set(version, new Set());
}
async function seal(plain, version, expectedContext, suppliedIV) {
  const iv = suppliedIV ? new Uint8Array(suppliedIV) : crypto.getRandomValues(new Uint8Array(12));
  if (iv.byteLength !== 12) throw new Error('IV 长度不符合本例约定');
  const encodedIV = to64(iv), seen = usedIVs.get(version), key = keys.get(version);
  if (!seen || !key) throw new Error('未知密钥');
  if (seen.has(encodedIV)) throw new Error('拒绝复用 IV');
  seen.add(encodedIV); // 即使后续操作失败，也不在本例里重复使用。
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad(version, expectedContext), tagLength: 128 }, key, encoder.encode(plain));
  return { version: 1, alg: 'A256GCM', keyVersion: version, iv: encodedIV, ciphertext: to64(new Uint8Array(encrypted)) };
}
async function open(envelope, expectedContext) {
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)
      || Object.keys(envelope).length !== 5 || envelope.version !== 1 || envelope.alg !== 'A256GCM'
      || !['v1', 'v2'].includes(envelope.keyVersion)
      || typeof envelope.iv !== 'string' || envelope.iv.length !== 16
      || typeof envelope.ciphertext !== 'string' || envelope.ciphertext.length > 4096) throw new Error('信封格式不支持');
  const iv = from64(envelope.iv), ciphertext = from64(envelope.ciphertext);
  if (iv.byteLength !== 12 || ciphertext.byteLength < 16) throw new Error('信封长度不正确');
  const key = keys.get(envelope.keyVersion);
  if (!key) throw new Error('密钥不可用');
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: aad(envelope.keyVersion, expectedContext), tagLength: 128 }, key, ciphertext);
  return decoder.decode(plain);
}
async function run(action) {
  if (busy || !ready) return;
  busy = true; render();
  try { $('result').textContent = await action(); }
  catch (error) { $('result').textContent = error.name === 'OperationError' ? '认证失败：未返回明文，原记录保留' : `操作未完成：${error.message}`; }
  finally { busy = false; render(); }
}
$('seal').onclick = () => run(async () => { record = await seal(text, active, context); return `已用 ${active} 保存教学笔记`; });
$('open').onclick = () => run(async () => `读取：${await open(record, context)}`);
$('export').onclick = () => run(async () => {
  try { await crypto.subtle.exportKey('raw', keys.get(active)); return '意外：导出成功'; }
  catch (error) { return `导出被拒绝：${error.name}`; }
});
$('reuse').onclick = () => run(async () => { await seal(text, record.keyVersion, context, from64(record.iv)); return '意外：复用成功'; });
for (const [id, field] of [['cipher', 'ciphertext'], ['iv', 'iv']]) {
  $(id).onclick = () => run(async () => {
    const changed = from64(record[field]); changed[0] ^= 1;
    return await open({ ...record, [field]: to64(changed) }, context);
  });
}
$('context').onclick = () => run(async () => await open(record, 'note:demo-2'));
$('rotate').onclick = () => run(async () => {
  await generate('v2');
  const probe = await seal('换钥自检', 'v2', context);
  if (await open(probe, context) !== '换钥自检') throw new Error('新密钥自检失败');
  active = 'v2'; return '已切换新写版本；v1 仍能读取旧记录';
});
$('migrate').onclick = () => run(async () => {
  if (record.keyVersion === active) return '已是当前版本，无需迁移';
  const original = record;
  const candidate = await seal(await open(original, context), active, context);
  if (await open(candidate, context) !== text) throw new Error('新记录自检失败');
  if ($('fail').checked) throw new Error('模拟提交失败；旧记录未替换');
  record = candidate; return `迁移完成：${record.keyVersion}`;
});
render();
try {
  if (!globalThis.isSecureContext || !globalThis.crypto?.subtle) throw new Error('请在支持 Web Crypto 的可信上下文打开');
  await generate('v1'); ready = true; $('result').textContent = '准备完成，可保存教学笔记';
} catch (error) { $('result').textContent = error.message; }
render();
</script>
</html>
```

先保存并读取，应该得到原来的固定文字。分别修改密文、IV、读取上下文，都应拒绝，随后“读取原记录”仍可成功。点导出应被拒绝；点复用 IV 由本例自己的记录逻辑拒绝，而非 AES-GCM 自动发现重复。

再启用 v2，原记录仍是 v1。勾选迁移失败并尝试迁移，记录版本保持 v1；取消勾选后迁移为 v2，再次迁移显示无需处理。全过程没有删除旧密钥。

### 五、信封保存的是约定，不是任意算法菜单

**Cryptographic Envelope** 把版本、算法标识、密钥版本、IV 和密文放在一起。本例使用普通 Base64 以便放进 JSON；若用于 URL，应选择对应的 Base64url 约定。两者都只是字节表示。

信封解析只接受固定 `A256GCM`，不能读到一个陌生 `alg` 就自动改用对应算法。密钥版本是查找入口，也被纳入 AAD；当前记录身份由调用方提供。把一条记录连同它自报的身份整体挪走，不应因此自动获得合法上下文。

这里的尺寸检查发生在已得到 JavaScript 对象之后，适合教学页的小信封。真实网络或文件入口还要在读取、解析阶段限制字节数，并对结构做运行时校验。即使类型写为 Envelope，外部 JSON 仍是 unknown；可联系 [TS-04 的类型边界](../chinese-guides/ts-04-mapped-utility-template-literal-types.md#三pick-与-omit-不会从对象里删除字段)。

### 六、随机 IV、全局唯一和重放是不同问题

例子用密码学随机 12 字节 IV，并维护每个密钥版本的已用集合。集合只覆盖当前页面、当前生成的密钥；多个标签、多个设备、崩溃恢复和密钥别名都不在其证明范围。随机碰撞概率需要结合单密钥的调用量预算评估，不能写成“随机所以绝不会重复”。

不要使用 Math.random、当前时间或固定计数起点替换随机来源。若使用计数式 nonce，需要可靠的持久分配、并发协调与崩溃恢复规则；这应由成熟协议承担，不是临时加一行自增。

另一个常见误区是“能解密就一定是最新”。攻击者重放旧的、未被篡改的信封，GCM 仍可能验证通过。是否接受旧版本、重复命令或过期记录，需要可信的记录版本、状态和服务端决定。认证加密不自带业务防重放。

### 七、导出、包装、签名公钥都要追问来源

`exportKey` 可以输出 raw、JWK 等格式；`extractable:false` 会阻止相应导出，也会影响需要导出目标密钥材料的 wrapKey 操作。**Key wrapping** 使用另一个密钥保护密钥材料，包装密钥本身仍要管理，Base64 包一层不算包装。

需要迁移和备份时，应先确定合法恢复路径，再决定是否可导出及如何包装。不能先宣称所有密钥绝不导出，又在恢复流程中承诺无条件迁移到任何设备。

签名验证也需要可信公钥。假设清单和公钥都来自同一条被篡改的响应，攻击者可以一起替换；验证函数正常返回 true 并没有建立新信任。公钥指纹、发布链、有效期与防回退版本，要来自受信配置或协议。

### 八、保存 CryptoKey 不等于使用硬件保险箱

CryptoKey 可以结构化克隆，IndexedDB 可以保存这种对象及其用途、可导出属性，通常不需要先转成字符串。但浏览器持久化的实现和备份方式不由这段代码保证，它不等于硬件密钥不可离开安全芯片。

| 保存方案 | 得到什么 | 必须另行回答什么 |
| --- | --- | --- |
| 只保存在页面内存 | 刷新后不继续保留引用 | 如何避免意外数据丢失 |
| CryptoKey 存在 IndexedDB | 可以跨页面重启取回句柄 | 同源脚本权限、配额驱逐、恢复 |
| 把原始密钥字符串放本地存储 | 便于读取和迁移 | 明文密钥泄漏面明显扩大 |
| 受控密钥服务或平台存储 | 可实施独立授权与审计 | 调用权限、恢复、信任与可用性 |

如果密钥与密文一起落入同一份可读取备份，不能声称“拿到存储的人也无法解密”。存储事务的完成与单个请求成功也要区分，参见 [BROWSER-01 的事务实验](../chinese-guides/browser-01-render-events-storage.md#九亲眼看一次请求成功后的回滚)。

### 九、轮换的核心是双读单写和安全提交

常见状态为 staged（准备）、active（新写）、decrypt-only（只读旧数据）、revoked（停止使用）、removed（移除引用）。v2 自检通过后成为新写版本，v1 保留用于旧数据，这就是“双读单写”的基本意思。

本例先解密旧记录，再生成并检查新记录，最后替换引用。模拟失败发生在最后一步之前，所以旧记录仍可读取。真实数据库应以事务或版本条件提交，防止迁移覆盖同时发生的用户修改；教学页的赋值只演示顺序，不是持久事务。

本例还保留着 v1 的 encrypt usage。应用把 v1 标为只读，不会改变原 CryptoKey 的底层用途；这属于应用策略。等迁移覆盖、备份和回滚窗口都满足要求后，才讨论移除旧密钥，不能先删除再寻找遗漏记录。

### 十、密码派生、KMS 和 HSM 有不同职责

口令可猜测，不能直接填充成 AES 密钥，也不能把一次快速 SHA-256 当成合适的密码存储。**Key Derivation Function**（KDF）需要匹配用途的盐、成本和参数版本。Web Crypto 提供 PBKDF2 原语，但并未替你设计本地保险箱、恢复策略或登录数据库。

**Key Management Service**（KMS）提供密钥生成、访问控制、版本和审计等管理能力；**Hardware Security Module**（HSM）强调在受保护硬件内完成相应操作。两者都需要正确的调用授权，并非“接入服务就自动安全”。

浏览器需要的是哪些短期能力、谁应能解密、服务器是否允许恢复，应先讲清楚。密钥永不离开服务端和服务端永远无法解密，是不同的架构目标，不能同时含糊承诺。

### 十一、登出、撤销和泄漏响应不要只做清缓存

登出处理当前会话与本地状态，设备撤销处理后续调用资格，密钥轮换处理新旧数据兼容，密钥泄漏则需要停止受影响用途并评估已暴露内容。把变量设成 null 不能证明所有内存副本立即被物理擦除。

如果攻击者已经拿到旧密钥与旧密文，之后更换密钥也不能让已泄漏内容重新保密。撤销是对未来使用的控制，不能逆转已经发生的解密。

错误界面可以写“当前记录无法读取，请重试或恢复”，日志记录版本、阶段和关联编号。不要在生产日志中输出密钥、明文或完整敏感信封；`OperationError` 可能来自损坏、参数不匹配等原因，单凭它不能判断发生攻击。失败时也不能悄悄存成明文。

### 十二、用攻击者能力衡量你实际保护了什么

| 攻击者拿到了什么 | 本地加密能否解决 |
| --- | --- |
| 只有密文，没有密钥及获取权限 | 正确协议可保护相应明文 |
| 当前页面的同源脚本执行能力 | 可能直接读明文或调用密钥，不能靠不可导出解决 |
| 一个合法账号，想读取别人的记录 | 必须依赖资源授权，客户端解密成功不是授权依据 |
| 旧密钥和旧密文副本 | 后来的换钥无法撤回已获得的信息 |

本例应观察三类篡改拒绝、IV 复用保护、导出限制和迁移失败保留旧值。没有实现的持久化、多设备 nonce 分配、真实 KMS、口令恢复和端到端协议，不纳入成功结论。面对这些需求，优先采用经过评审的协议与库，再围绕明确边界验证实现。

### 参考与延伸阅读

- [MDN：SubtleCrypto](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto)：查阅可用原语、字节接口与底层能力的使用边界。
- [MDN：CryptoKey](https://developer.mozilla.org/en-US/docs/Web/API/CryptoKey)：核对 extractable、usages 和算法信息。
- [MDN：AesGcmParams](https://developer.mozilla.org/en-US/docs/Web/API/AesGcmParams)：查阅 IV、additionalData 与 tagLength 的精确约定。
- [MDN：SubtleCrypto.wrapKey](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/wrapKey)：核对包装过程与目标密钥的可导出要求。
- [OWASP：密钥管理](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html)：继续梳理生命周期、存储、恢复与泄漏响应。
