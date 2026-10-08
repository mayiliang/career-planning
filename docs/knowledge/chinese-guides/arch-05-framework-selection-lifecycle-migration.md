# 选中的框架，三年后还接得住吗

## ARCH-05 框架选型、生命周期与跨框架迁移

两个团队要共同维护订单工作台。新候选很快搭出了漂亮页面，现有框架的页面则背着多年兼容代码。演示结束，有人建议统一迁移。此时尚未回答的问题包括：谁维护身份与路由？下次升级需要同时改多少插件？新实现加载失败时，用户已经输入的备注还在不在？框架选择要连同这些成本和失败路径一起比较。

本篇先确定比较对象，再安排有区分力的原型，最后用一个可独立打开的页面观察切换、取消与草稿保留。读完应能说明候选为何适合某个产品边界，以及选择改变后怎样退出。所有评测数字和实验实现都是教学情境，不代表 React、Vue 或其他框架的性能排名。

### 学习前先确认

- 直接前置：[ARCH-03 渐进迁移、Strangler 与兼容层](../chinese-guides/arch-03-progressive-migration-strangler-compatibility.md#arch-03)用于理解切片、写入权和回滚窗口；[ARCH-04 技术债识别、排序与偿还治理](../chinese-guides/arch-04-technical-debt-prioritization-governance.md#arch-04)用于判断长期维护成本和退出时机。

### 一、先说明究竟替换哪一层

团队口中的“框架”可能指组件渲染库，也可能包含路由、服务器渲染、数据请求、构建、部署与设计系统。比较 React 与一个包含服务器运行环境的完整产品栈，容易把不同层的能力混在一起。应记录候选组合与版本，再说明这次实际决定哪一层。

以订单工作台为例，可以划分为用户界面、导航与身份、领域数据、服务端接口、构建部署五个边界。若问题只是复杂表单难以维护，可以先替换表单所在子树，保留导航、身份和数据合同；若目标是公开页面的服务器渲染，则必须把服务器运行、缓存和部署也纳入原型。边界不同，证据也不同。

元框架通常把渲染方式、路由、构建和部署约定组合起来。组件库则主要提供界面能力。Web Components 可以提供一种浏览器级组件封装方式，但它不会自动统一不同实现的状态模型、表单验证、主题和无障碍行为。名称上的互操作不等于实际任务已经兼容。

比较表应包含“维持现状并治理”的候选。现有栈拥有已验证的业务行为，也可能承担过高维护成本；新栈拥有改善机会，也会产生培训与迁移成本。把现状当正式候选，才能区分收益来自新技术，还是来自终于整理了边界与测试。

### 二、同一任务才能产生可比较的证据

选择一条足够真实、又能在有限时间内完成的任务：打开订单，编辑备注，触发校验错误，修正并保存，再返回列表。两个团队使用同一份假数据、相同界面合同、相同网络与构建条件；记录每个候选使用的插件和必要定制。另行安排失败、权限拒绝与键盘操作，避免原型只展示正常路径。

如果包体预算是 300 KB，要先说明指首路由传输量、压缩后的 JavaScript，还是所有异步资源总和。一个候选把代码延后加载，可能改善首屏却使首次打开表单变慢；把两种指标混用会奖励统计技巧。LCP、交互延迟与内存也要保留设备、窗口、样本和构建模式。开发服务器的体验不能直接代表生产制品。

原型最有价值的步骤通常在首版完成以后。让另一位工程师增加一个验证规则，模拟接口字段变化，升级一个关键插件，再演练加载失败。这样能看见状态归属、学习成本与错误恢复。给某个候选更多调优时间或更熟练的人，属于评测条件差异，需要记录，不能偷偷当成框架优势。

证据可分为通过、失败和待核实。身份边界未核实时，不应靠开发速度得分抵消；正式选择仍需要说明风险由谁承担。可沿[证据矩阵如何支持决定](../chinese-guides/arch-02-technical-proposal-adr-review.md#三证据矩阵记录比较依据而不替人投票)继续阅读，把原型结果接入 ADR，而不是再做一份无法追溯的排行榜。

### 三、把支持组合与长期成本一起比较

**总拥有成本（Total Cost of Ownership）**包含最初开发，也包含培训、发布、运行、值班、升级、迁移期间的双份维护以及退出成本。不能把这些项目都简单相加成一个精确数字：有些是工时，有些是运行费用，有些是风险。可分别给出范围，并指出哪项假设会改变选择。

例如新候选初期少用五天开发，却依赖团队无人维护的身份插件。一次升级可能需要十天适配，这个不确定性就值得先做原型。反过来，已有经验也不是继续接受错误隔离边界的理由。先判断硬约束，再比较可接受候选的成本，才能避免把熟悉程度或技术热情变成隐含的最终标准。

**支持矩阵（Support Matrix）**在这里记录可维护的技术组合：组件框架、路由或元框架、构建器、运行时、TypeScript、关键插件、部署平台与责任人。浏览器支持只是其中一列，不能代替整个组合的生命周期判断。

| 项目 | 应记录的事实 | 不能据此推断的结论 |
| --- | --- | --- |
| 框架与插件版本 | 官方兼容范围、弃用公告、实际验证版本 | 主框架仍维护，所以所有插件都安全 |
| 运行与构建环境 | 运行时支持期、锁文件、构建制品 | 本机能启动，所以生产平台可运行 |
| 维护责任 | 升级负责人、检查窗口、替代路径 | 下载量大，所以长期维护已获保证 |
| 项目承诺 | 哪些组合允许上线，谁批准例外 | 官方兼容范围就是本站全部验收结果 |

若需要未来十二个月的支持，应查各组成部分的当前政策与公告。没有明确承诺时，记录“尚无可验证的支持期”，并安排跟踪或替代；不能把发布活跃度写成未来保证。Vue 的发布说明也不等于固定日期的项目升级计划。本文不固定一张会迅速过期的版本推荐表。

### 四、共存的关键是状态、DOM 和资源各有主人

跨框架迁移可以按路由，也可以按页面中的独立区域进行。稳定的宿主负责导航、身份上下文和跨实现需要保留的草稿；具体实现负责自己容器内的渲染与监听。宿主通过明确输入和回调传递数据，避免两个框架同时修改同一个 DOM 子树。

以订单备注为例，宿主持有 `draft`，实现接收初始值并通过 `onChange` 回传更新。切换时旧实现释放监听，新实现从当前 `draft` 初始化。若草稿只藏在旧框架组件的局部状态里，卸载就可能丢失；若新实现从请求开始时的快照初始化，等待期间输入的内容也会被覆盖。

实际 React 局部接入可使用 `createRoot`，结束时调用该根的 `unmount`；Vue 应用实例有对应的 `mount` 与 `unmount`。这些 API 管理框架自身的生命周期，外部创建的 WebSocket、观察器、计时器和订阅仍需按其归属清理。服务器已渲染的 React HTML 需要考虑 hydration，不能把普通 `createRoot` 示例当成水合方案。

样式、事件与数据协议也可能越界。全局 CSS 会影响宿主；两个路由器可能同时处理历史记录；不同日期和空值约定会改变业务含义。因此兼容层应转换明确合同，而不是任意转发内部对象。身份令牌不应为了“方便通信”暴露给每个子实现。

### 五、切换实现时保留草稿并拒绝过期结果

下面的完整页面用两种原生 DOM 视图模拟两个实现。它不加载 React 或 Vue，也不测量真实框架性能；目的只是在没有依赖和网络的条件下，观察宿主状态、请求代次、取消和卸载顺序。异步完成由按钮手动触发，属于合成时间线。

保存为 `framework-switch.html`，在现代桌面浏览器直接打开。先输入备注，再点击“请求紧凑视图”，继续修改备注，最后完成该请求：新视图应保留最新文字。先请求紧凑视图、再请求卡片视图，然后先完成较新的请求、再完成旧请求：旧结果应被忽略。也可以在请求后取消，或点击失败，现有视图与草稿应继续可用。

```html example=arch05-switch-lab runtime=project file=framework-switch.html
<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>框架边界模拟：草稿与过期结果</title>
<style>
  body { max-width: 860px; margin: 40px auto; padding: 0 24px;
    font: 17px/1.7 system-ui; color: #182c3b; }
  button, input { font: inherit; padding: 8px; margin: 4px; }
  input { max-width: 90%; width: 420px; }
  #view { border: 1px solid #75899a; padding: 20px; margin: 20px 0; }
  .card label { display: block; font-weight: 600; }
  .compact label { display: inline; }
</style>
<h1>订单备注的实现切换</h1>
<p>本地模拟：请求完成与失败均由下面的按钮触发。</p>
<button id="compact">请求紧凑视图</button>
<button id="card">请求卡片视图</button>
<button id="cancel">取消待处理请求</button>
<div id="view"></div>
<p id="status" role="status"></p>
<ul id="requests" aria-label="请求列表"></ul>
<script>
const view = document.querySelector('#view');
const status = document.querySelector('#status');
const requests = document.querySelector('#requests');
let draft = '到货前联系';
let generation = 0;
let pending = null;
let composing = false;
let deferredCommit = null;
let liveViews = 0;
let currentName = 'card';
let dispose = () => {};
function report(message) {
  status.textContent = `${message}；活动视图：${liveViews}`;
}
function mount(name) {
  const events = new AbortController();
  view.className = name;
  const label = document.createElement('label');
  label.textContent = name === 'card' ? '卡片视图备注' : '紧凑视图备注';
  const input = document.createElement('input');
  input.value = draft;
  label.append(input);
  view.replaceChildren(label);
  input.addEventListener('input', () => { draft = input.value; },
    { signal: events.signal });
  input.addEventListener('compositionstart', () => { composing = true; },
    { signal: events.signal });
  input.addEventListener('compositionend', () => {
    draft = input.value;
    composing = false;
    // 推迟到当前事件处理结束；各输入法时序仍需实测。
    queueMicrotask(() => {
      const commit = deferredCommit;
      deferredCommit = null;
      commit?.();
    });
  }, { signal: events.signal });
  liveViews += 1;
  currentName = name;
  input.focus();
  return () => {
    events.abort();
    liveViews -= 1;
    view.replaceChildren();
  };
}
function cancelPending() {
  generation += 1;
  pending?.abort();
  pending = null;
  deferredCommit = null;
}
function request(name) {
  cancelPending();
  const id = generation;
  const controller = new AbortController();
  pending = controller;
  const row = document.createElement('li');
  const done = document.createElement('button');
  const fail = document.createElement('button');
  done.textContent = `完成 #${id} ${name}`;
  fail.textContent = `失败 #${id}`;
  row.append(done, fail);
  requests.append(row);
  function finish(success) {
    row.remove();
    // 模拟忽略取消信号的旧加载器；代次校验仍必须挡住结果。
    if (controller.signal.aborted || id !== generation) {
      report('忽略过期结果');
      return;
    }
    if (!success) {
      pending = null;
      report(`加载失败，保留 ${currentName}`);
      return;
    }
    function commit() {
      if (controller.signal.aborted || id !== generation) return;
      if (composing) {
        deferredCommit = commit;
        report('等待本次中文选词结束');
        return;
      }
      const input = view.querySelector('input');
      const selection = [input.selectionStart, input.selectionEnd];
      draft = input.value;
      dispose();
      dispose = mount(name);
      view.querySelector('input').setSelectionRange(...selection);
      pending = null;
      report(`已切换 ${name}`);
    }
    commit();
  }
  done.addEventListener('click', () => finish(true), { once: true });
  fail.addEventListener('click', () => finish(false), { once: true });
  report(`等待请求 #${id}，现有视图仍可编辑`);
}
document.querySelector('#compact').onclick = () => request('compact');
document.querySelector('#card').onclick = () => request('card');
document.querySelector('#cancel').onclick = () => {
  cancelPending();
  report('已取消，保留当前草稿');
};
dispose = mount('card');
report('卡片视图就绪');
</script>
</html>
```

请求开始只建立候选，不卸载当前视图。宿主一直接收输入，直到有效结果能够提交时，才读取当前草稿与选区、释放旧视图、安装新视图。因此加载失败不会留下空白容器，等待期间的输入也不会被旧快照覆盖。

取消信号负责告知工作应当停止，代次负责判断结果是否仍属于当前决定。真实加载器可能无法中断某个阶段，即使它最终回调，也必须经过有效性检查。实验故意保留旧请求的完成按钮，使“取消以后仍然返回”成为可观察的反例。移除结果按钮后，对应行与回调不再由页面保留。

这里的挂载函数是同步、简单且不含外部插件的；真实框架初始化可能抛错。生产接入应在旧实现仍可用时完成可提前验证的准备，并约定挂载失败时恢复旧实现或稳定降级，不能仅照搬“先卸载再挂载”而忽略失败窗口。草稿示例只在当前页面内存中保留，刷新会重置；需要跨刷新恢复时，还要设计版本、租户隔离与过期清理。

实验展示了中文选词期间延迟提交的策略，但浏览器与输入法事件时序仍须在目标环境核对；代码并不构成完整 IME 兼容证明。活动视图计数始终为一，只证明这里登记的生命周期配对，不能证明整个页面没有泄漏。内存、读屏体验、真实框架组合和复杂表单状态都不在这个小实验的证明范围内。

### 六、双运行需要预算，也需要结束日期

**双运行期（Dual-Run Period）**是新旧实现同时存在、团队需要维护两条路径的阶段。它能缩小一次切换的风险，却会增加发布组合、问题定位、培训和安全更新成本。开始前应说明哪些路由仍旧、哪些用户进入新实现、哪个系统确认写入，以及谁维护公共合同。

双运行不要求两个实现同时提交同一笔订单。影子读取可以帮助发现差异；发送邮件、支付与库存扣减等外部副作用必须保留明确执行权。框架切换也不能绕开服务端身份校验。前端显示在新容器中，并不改变后端授权边界。

每个切片设置进入、暂停、回退与退役条件。输入丢失、错误率异常或权限语义不一致，可能要求暂停；不足够的观测时间则表示继续收集证据。不要用“没有收到投诉”替代使用量、任务成功率和失败反馈。双运行长期不结束，常常说明退出条件、数据迁移或组织责任还没有处理完。

### 七、可逆性来自预留的边界

**可逆性（Reversibility）**是改变选择时，以可承受成本恢复可用状态或转向替代方案的能力。切换一个前端路由开关通常比恢复已转换的数据容易，但即使路由能退，草稿格式、浏览器缓存和在途请求也可能已经变化。必须说明“退回哪一份代码，继续处理哪一种数据”。

可逆性可以通过稳定合同、独立容器、适配层、可导出数据和保留兼容窗口获得；代价是额外设计与一段时间的重复支持。并非所有边界都值得抽象：只为假想的任意框架切换设计万能接口，可能比实际迁移更昂贵。先保护最难恢复的用户输入、业务语义和身份边界。

退出演练应包含另一位工程师按记录恢复旧路径，核对当前草稿、已提交结果和下一次操作。若只能由原作者修补缓存并手动改数据库，表明回滚合同还不完整。删除旧实现前，核对流量、依赖、构建资源、监控、权限与值班手册；“新页面上线”只是过程节点。

### 八、让选择随证据更新，而不是变成身份认同

选型记录要说明使用范围、候选组合、通过与未通过的场景、成本假设、批准者、复查条件。一个团队在订单表单上选择某套组件方案，不自动推出全公司所有应用都应迁移。内容站、离线编辑器和后台工作台可能需要不同组合。

发布政策变化、关键插件停更、运行成本超过预算或团队失去维护能力，都可以触发复查。复查先检查原假设是否改变，再决定局部升级、缩小范围或退出；不必每隔半年重新举行一次品牌投票。把支持矩阵、ADR 和债务台账连接起来，才能让日常升级与长期选择使用同一组事实。

### 带着问题回看

1. 组件框架与元框架比较错层时，原型会漏掉哪些运行成本？
2. 请求新视图以后继续输入，为什么提交时应读取最新草稿？
3. 已发送取消信号，为什么结果仍要检查代次？
4. 一个计数器始终显示一，能否证明框架切换不存在内存泄漏？
5. 哪些条件满足后，旧框架与兼容层才可以真正删除？

### 参考与延伸阅读

以下官方入口于 2026-10-08 核对；实际接入应继续查所用版本与组合的文档。

- [React：接入已有项目](https://react.dev/learn/add-react-to-an-existing-project)：查局部区域与子路由逐步接入方式。
- [React：createRoot](https://react.dev/reference/react-dom/client/createRoot)：查根的创建、卸载以及与服务器渲染的区别。
- [Vue：应用实例 API](https://vuejs.org/api/application.html)：查应用挂载、卸载与应用级配置的边界。
- [Vue：发布说明](https://vuejs.org/about/releases)：核对发布与兼容政策，避免把项目自定支持期当成官方保证。
