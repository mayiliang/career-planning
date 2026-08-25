# 前端无障碍工程中文核心讲义

本讲义面向初级前端工程师，只覆盖 `A11Y-01` 的固定挑战。它不是法律意见，也不宣称读完即可证明整个产品“符合 WCAG”。真正的符合性（conformance，符合性）结论必须限定页面、流程、版本和测试环境，并保留人工验证证据。

## A11Y-01

### 1. 先建立共同语言

- **Accessibility（可访问性，常简称 a11y）**：不同视觉、听觉、行动和认知能力的用户，能否完成同一项任务。
- **Assistive Technology（辅助技术，AT）**：屏幕阅读器、放大器、语音控制、开关控制等帮助用户操作设备的软硬件。
- **WCAG（Web Content Accessibility Guidelines，Web 内容无障碍指南）**：W3C 发布的可测试成功准则集合。
- **Success Criterion（成功准则，SC）**：WCAG 中可以判断通过或失败的要求，例如 2.1.1 键盘、2.4.7 焦点可见。
- **POUR**：Perceivable（可感知）、Operable（可操作）、Understandable（可理解）、Robust（健壮）。它是 WCAG 的四项原则，不是四个分数。
- **A / AA / AAA**：符合级别。本站固定挑战以 WCAG 2.2 AA 为工程基线，但“某个 fixture 通过”不等于整个站点已符合。
- **Accessibility Tree（无障碍树）**：浏览器从 DOM、CSS 和 ARIA 计算出的语义树，辅助技术主要通过它理解界面。DOM 中存在元素，不代表它一定以正确名称和角色出现在树中。
- **Accessible Name（可访问名称）**：控件“叫什么”；**Accessible Description（可访问描述）**：对名称的补充说明；**Role（角色）**：它是什么；**State/Value（状态/值）**：它现在怎样。
- **Keyboard Focus（键盘焦点）**：键盘输入当前指向的元素。视觉高亮只是焦点指示器，不等于浏览器焦点本身。
- **Live Region（实时区域）**：内容变化时向辅助技术提供通知建议的区域，例如 `aria-live="polite"`。它不是消息队列，也不保证每次更新都逐字播报。
- **Exception/Waiver（例外/豁免）**：在限定期限内接受已知缺陷的治理记录；必须有影响、临时替代、负责人和到期日。

初学者最容易混淆三组概念：

| 不是 | 而是 |
| --- | --- |
| DOM 顺序 = 视觉顺序 = 播报顺序 | 三者可能不同，必须分别检查 |
| 加了 ARIA = 已无障碍 | ARIA 只补语义；键盘、焦点、校验和视觉状态仍需实现 |
| Lighthouse 100 = WCAG 通过 | 自动规则只覆盖一部分，键盘与读屏任务仍需人工验证 |

### 2. WCAG 2.2 AA 在这个挑战中怎样落地

先把需求映射到成功准则，再写代码。不要为了“覆盖 WCAG”背诵所有编号。

| 固定页面能力 | 主要准则 | 可观察的通过证据 |
| --- | --- | --- |
| 命令面板可用键盘打开、操作、关闭 | 2.1.1 键盘；2.4.3 焦点顺序；2.4.7 焦点可见；2.4.11 焦点不被完全遮挡 | 全键盘录像/步骤、打开/关闭焦点断言、树快照 |
| 拖拽排序有等价操作 | 2.5.7 拖动动作 | 除拖动外还有可点击/可触控的“上移/下移”；键盘也能用 |
| 触控目标不拥挤 | 2.5.8 目标尺寸（最低） | 目标至少 24×24 CSS px，或满足该准则的间距/其他例外 |
| 表单错误可发现并可修正 | 3.3.1 错误识别；3.3.2 标签或说明；4.1.3 状态消息 | 错误文本、输入关联、错误摘要/焦点策略和读屏记录 |
| 图片和视频有等价内容 | 1.1.1 非文本内容；1.2.x 时基媒体 | 合适的 `alt`，视频字幕/转写；纯装饰图片使用空 `alt` |
| 缩放与窄视口仍可完成任务 | 1.4.4 调整文本；1.4.10 重排 | 200%/400% 与窄视口复测，无信息或功能丢失 |
| 动画尊重用户偏好 | 2.3.3 交互动画（AAA，可作增强）；同时避免 2.3.1 闪烁风险 | `prefers-reduced-motion` 下移除非必要移动，并保留状态变化 |

WCAG 2.2 相比 2.1 增加了九项成功准则。本 fixture 最直接涉及：2.4.11 焦点不被完全遮挡、2.5.7 拖动动作、2.5.8 目标尺寸；组织治理还应知道 3.2.6 一致帮助、3.3.7 冗余输入和 3.3.8 可访问身份验证。4.1.1 Parsing（解析）在 WCAG 2.2 中已废弃并移除。这里不要求背九项原文，但要能从缺陷反查相应准则。

### 3. 先用原生语义，再补 ARIA

名称、角色和值是辅助技术理解组件的最小合同。原生 `<button>` 已提供 button 角色、键盘激活和禁用语义；`<div role="button">` 只增加角色，不会自动获得 Space/Enter 行为、焦点或禁用规则。

```html
<button type="button" aria-expanded="false" aria-controls="command-dialog">
  打开命令面板
</button>
```

名称计算有完整算法；本点只要求安全顺序：先用可见文本或 `<label>`，必要时用 `aria-labelledby` 引用可见标题，最后才使用 `aria-label`。`aria-describedby` 是描述，不要用它代替名称。

在 DevTools 中至少核对：

1. 元素是否进入无障碍树；
2. 计算出的 name、role、description、state 是否符合预期；
3. DOM 源顺序是否仍能形成合理任务顺序；
4. 这只是静态语义证据，不替代真实键盘与屏幕阅读器任务。

### 4. 命令面板：初始焦点、模态边界和关闭归焦

优先使用原生 `<dialog>` 的 `showModal()` 建立模态边界。仍要明确选择初始焦点，并记录打开它的触发器，以便所有关闭路径都归还焦点。

```html
<button id="open-command" type="button">打开命令面板</button>
<dialog id="command-dialog" aria-labelledby="command-title">
  <form method="dialog">
    <h2 id="command-title">命令面板</h2>
    <label for="command-query">搜索命令</label>
    <input id="command-query" autocomplete="off" />
    <button value="close">关闭</button>
  </form>
</dialog>
```

```js
const trigger = document.querySelector('#open-command');
const dialog = document.querySelector('#command-dialog');
const query = document.querySelector('#command-query');
let returnFocus = null;

trigger.addEventListener('click', () => {
  returnFocus = document.activeElement;
  dialog.showModal();
  query.focus();
});

dialog.addEventListener('close', () => {
  if (returnFocus?.isConnected) returnFocus.focus();
});
```

必须复测四条路径：打开后的首焦点、Tab/Shift+Tab 不进入背景、Escape 关闭、按钮关闭。关闭后断言 `document.activeElement === trigger`。不要用正数 `tabindex` 修补顺序，也不要在弹窗打开时把焦点留在被遮挡背景。

### 5. 拖拽不是唯一操作

仅增加键盘拖拽并不一定满足 WCAG 2.5.7；还要提供不需要拖动的单指针操作。最小方案是给每项提供“上移/下移”按钮，同一函数同时服务按钮与拖拽结束事件。

```html
<li data-id="b">
  <span>任务 B</span>
  <button type="button" data-move="up">上移任务 B</button>
  <button type="button" data-move="down">下移任务 B</button>
</li>
```

移动后保持焦点在触发按钮或等价的新位置，并用一条节制的状态消息说明“任务 B 已移动到第 1 位”。按钮目标要达到 24×24 CSS px 或满足间距例外。验证键盘、点击/触控和拖动三条路径得到同一数据顺序。

### 6. AI 流式回答：可见内容与播报缓冲分离

流式 UI 可以逐 token 更新视觉正文，但不能把同一个 live region 每 token 改一次。固定 fixture 共 40 个 token，每 8 个合并为一次语义完整或至少可理解的通知，预期正好五次。

```html
<article id="answer" aria-labelledby="answer-title">
  <h2 id="answer-title">AI 回答</h2>
  <div id="answer-visible"></div>
</article>
<p id="answer-announcer" class="visually-hidden" aria-live="polite"></p>
<button id="pause-answer" type="button">暂停生成</button>
```

```js
const BATCH_SIZE = 8;
let visible = '';
let pending = [];
let announceCount = 0;

function receiveToken(token, isFinal = false) {
  visible += token;
  answerVisible.textContent = visible;
  pending.push(token);

  if (pending.length === BATCH_SIZE || (isFinal && pending.length)) {
    answerAnnouncer.textContent = pending.join('');
    pending = [];
    announceCount += 1;
  }
}
```

测试必须使用 40 个固定 token，断言 `announceCount === 5`，并保留读屏实际记录。`aria-live` 是建议，浏览器/读屏器可能合并通知，所以代码计数不是读屏证据。生成期间不抢走用户焦点，并提供暂停/停止；失败和完成是不同状态消息。

### 7. 生成媒体、表单和动画

- 信息图片的 `alt` 描述用户完成当前任务所需的信息，不复述“图片”；装饰图片使用 `alt=""`。AI 生成的替代文本必须可编辑，并由内容责任人校正。
- 视频至少提供准确同步字幕；纯音频信息提供转写。自动字幕是草稿，不是天然合格证据。
- 表单的 label、错误关联与 submit/blur 规则沿用 `WEB-01`；复杂页再增加错误摘要时，不要同时让每个错误和摘要重复播报。
- `prefers-reduced-motion: reduce` 下移除非必要平移、缩放和自动滚动；状态仍要立即可见，不能连内容一起隐藏。

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

这个全局片段适合作为固定练习的验证起点，不是所有产品的最终策略；某些动画承载空间关系时，应设计低运动替代，而非简单删除反馈。

### 8. 四类证据必须同时存在

| 方法 | 能发现 | 不能单独证明 |
| --- | --- | --- |
| Lighthouse/axe 自动扫描 | 缺名称、无效 ARIA、部分对比度、标签和字幕标记等规则 | 任务是否能完成、焦点是否合理、替代文本是否准确 |
| DevTools 无障碍树 | 计算名称/角色/值、树映射、源顺序 | 实际读屏播报和完整键盘行为 |
| 全键盘任务 | Tab 顺序、激活、Escape、焦点可见与归还 | 名称是否被不同读屏器正确表达 |
| 屏幕阅读器抽查 | 实际名称、状态、live region 和任务体验 | 所有浏览器/辅助技术组合都通过 |

固定验收记录：浏览器与版本、操作系统、读屏器与版本、页面提交、测试步骤、预期、实际、截图/录像/树快照、缺陷编号。不要只保存一个总分。

### 9. 把一次修复升级成工程治理

组件准入至少要求：原生语义优先、公开键盘模型、焦点策略、名称/状态合同、缩放/强制颜色/reduced-motion 状态、自动测试和人工基线。CI 可以阻断新增严重自动规则失败与关键键盘 E2E 失败，但不能声称替代人工回归。

| 严重度 | 示例 | 发布策略 |
| --- | --- | --- |
| S0 阻断 | 登录、支付或核心学习流程对键盘/读屏完全不可用 | 阻断发布，立即负责人 |
| S1 严重 | 命令面板无法关闭、错误不可感知、视频无等价内容 | 默认阻断，必须明确修复期限 |
| S2 一般 | 局部目标拥挤、次要页面重排问题 | 进入迭代并设到期日 |
| S3 改进 | 不影响任务完成的一致性或文案优化 | 按组件计划处理 |

例外记录必须包括：缺陷与准则、受影响用户/任务、为何当前不能修复、临时可用替代、owner（负责人）、批准人、创建/到期日、复验条件。到期自动重新阻断，而不是无限延长。

### 10. 固定挑战的最小交付清单

1. 修复后的命令面板、拖拽等价按钮、表单错误、流式回答、图片/视频与 reduced-motion 页面。
2. 命令面板打开/循环/关闭归焦断言；40 token 对五次批量通知的代码断言与读屏记录。
3. 拖拽、点击/触控、键盘三路径的相同排序结果。
4. Lighthouse 报告、无障碍树快照、完整键盘步骤和至少一种真实读屏器记录。
5. 200%/400% 缩放、强制颜色、窄视口、reduced-motion 的复测记录。
6. 组件准入清单、CI 规则、严重度与一个包含到期日的例外样例。

### 11. 自检

- 为什么 Lighthouse 100 分仍可能无法用键盘关闭命令面板？
- 为什么给拖拽增加键盘快捷键，仍可能不满足 2.5.7？
- 40 个 token 分成每 8 个一批，代码计数与读屏实际记录各证明什么？
- 为什么 `aria-label` 不应无条件覆盖可见文字？
- 一个没有 owner 和到期日的“已知问题”为何不算治理闭环？

能用固定证据回答这五题，并完成交付清单，才算掌握本点。
