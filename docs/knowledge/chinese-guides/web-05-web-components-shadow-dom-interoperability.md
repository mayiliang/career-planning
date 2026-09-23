# Web 平台组件学习资料

## WEB-05 把组件做成清楚的 DOM 接口

同一个评分控件，要在普通页面、React 页面和 Vue 页面里使用。如果调用方必须知道它内部的类名、框架实例和节点层级，复用很快就会变成互相迁就。

Web Components 提供另一种边界：调用方认识一个 HTML 标签，通过属性、方法、事件和插槽与它协作。本篇做一个 0～5 分的资料评分控件，把注册、升级、表单和清理放进同一个可观察的例子。

### 学习前先确认

- 直接前置：[BROWSER-01 渲染流水线、DOM 事件与存储](../chinese-guides/browser-01-render-events-storage.md#browser-01)。需要认识 DOM 节点、事件传播和监听器清理。

### 一、平台组件提供了哪些零件

**Web Components** 通常指 Custom Elements、Shadow DOM、template 和 slot 等可组合使用的平台能力。它们不附带路由、数据缓存或统一状态管理，也不要求每个组件把这些零件全部用上。

自定义元素扩展标签的行为；Shadow DOM 划分内部子树与样式边界；template 保存待使用的结构；slot 接收宿主提供的内容。例如一个简单的格式化时间元素，可以只注册自定义元素，不创建 shadow root。

本篇使用继承 HTMLElement 的独立自定义元素。名称带连字符，例如 study-score，可以与内建标签区分。Customized built-in elements 则在已有原生标签基础上扩展，兼容与消费方式另有约束，不能把两种方案当成一样。

### 二、先写调用方能依赖什么

把评分控件的公开约定写成一张小表，再决定内部布局：

| 入口 | 本例约定 | 调用方可以做什么 |
| --- | --- | --- |
| 标签 | study-score | 放入表单，与其他 HTML 一起使用 |
| value attribute | 0～5 的整数字符串；非法值按 0 显示 | 在 HTML 中提供初始值 |
| value property | 0～5 的整数；非法值抛错 | 用 JavaScript 更新当前值 |
| disabled | 按是否存在解释 | 禁止用户调整 |
| score-change | 用户调整完成后发出，detail.value 为数字 | 更新宿主状态，不查询内部按钮 |
| title slot | 评分区域的可见标题 | 提供自己的文案 |
| name / FormData | 支持表单关联时提交一份 score 字段 | 与原生输入共同提交 |
| CSS 入口 | --score-accent 与 part(control) | 修改颜色及公开按钮外观 |

本例程序设置 property 不发用户事件，避免宿主回写状态时再次触发业务处理。事件名字看不出这些细节，所以触发时机也要写进文档。

### 三、运行一个会升级的评分表单

保存为 `score-field.html`，用桌面浏览器打开。页面先输出带 label 的普通数字输入；脚本注册组件后，在支持表单关联的环境中接管它。注册前先设置 property 为 4，故意模拟“宿主先传值、组件定义后到”的情况。

点击“查看表单”应得到一个 score 值；加分到 5 后再提交，值为 5；重置回到 HTML 初始值 2。点“断开再接回”两次，再调整一次，事件次数只增加一。

```html example=web-score-field runtime=project file=score-field.html
<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<title>评分组件与原生表单</title>
<style>
  body { max-width: 54rem; margin: 3rem auto; padding: 0 2rem;
    font: 18px/1.7 system-ui; color: #172d3c; background: #f5f8fa; }
  button, input { font: inherit; padding: .5rem .8rem; margin: .3rem; }
  :focus-visible { outline: 3px solid #005fcc; outline-offset: 3px; }
  study-score { display: block; --score-accent: #1a557d; margin: 1.5rem 0; }
  study-score::part(control) { border-radius: .5rem; }
  pre { padding: 1rem; background: #e5eef5; }
</style>
<main>
  <h1>评分组件与原生表单</h1>
  <p>只演示本页表单；没有向服务器保存。</p>
  <form id="form">
    <fieldset id="fields">
      <legend>资料反馈</legend>
      <study-score id="score" name="score" value="2">
        <span slot="title">这份资料有多大帮助？</span>
        <span data-fallback><label for="plain-score">评分（0～5）</label>
          <input id="plain-score" name="score" type="number" min="0" max="5" step="1" value="2"></span>
      </study-score>
    </fieldset>
    <button type="submit">查看表单</button><button type="reset">重置</button>
  </form>
  <button id="move" type="button">断开再接回</button>
  <label><input id="disable" type="checkbox">禁用字段组</label>
  <p id="events" role="status">用户变更次数：0</p><pre id="result">等待提交</pre>
</main>
<script>
  document.getElementById('score').value = 4;
</script>
<script type="module">
  const supportsForm = 'ElementInternals' in window &&
    'setFormValue' in ElementInternals.prototype;
  const fromAttribute = (raw) => {
    const number = raw === null || raw.trim() === '' ? NaN : Number(raw);
    return Number.isInteger(number) && number >= 0 && number <= 5 ? number : 0;
  };
  class StudyScore extends HTMLElement {
    static formAssociated = true;
    static observedAttributes = ['value', 'disabled'];
    #internals; #panel; #minus; #plus; #output; #connection;
    #initial = null; #disabledByForm = false;
    constructor() {
      super();
      this.#internals = supportsForm ? this.attachInternals() : null;
      const root = this.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = `:host{display:block} .panel{padding:1rem;border:1px solid #8195a5}
        button{font:inherit;padding:.5rem .8rem;color:var(--score-accent,#173f61)}
        button:focus-visible{outline:3px solid #005fcc;outline-offset:3px}
        output{margin:0 1rem} [hidden]{display:none}`;
      const title = document.createElement('slot'); title.name = 'title';
      this.#panel = document.createElement('div'); this.#panel.className = 'panel';
      this.#panel.hidden = true;
      this.#minus = document.createElement('button'); this.#minus.textContent = '减分';
      this.#plus = document.createElement('button'); this.#plus.textContent = '加分';
      for (const button of [this.#minus, this.#plus]) {
        button.type = 'button'; button.setAttribute('part', 'control');
      }
      this.#output = document.createElement('output');
      this.#output.setAttribute('aria-label', '当前评分');
      this.#output.setAttribute('aria-live', 'off');
      this.#panel.append(this.#minus, this.#output, this.#plus);
      root.append(style, title, this.#panel, document.createElement('slot'));
    }
    get value() { return fromAttribute(this.getAttribute('value')); }
    set value(number) {
      if (!Number.isInteger(number) || number < 0 || number > 5) throw new RangeError('评分须为 0～5 的整数');
      if (this.getAttribute('value') !== String(number)) this.setAttribute('value', String(number));
    }
    connectedCallback() {
      if (!this.#internals) return; // 保留 light DOM 的原生输入。
      if (this.#initial === null) {
        this.#initial = this.value;
        if (Object.hasOwn(this, 'value')) {
          const earlyValue = this.value;
          delete this.value;
          // 初始值来自 HTML，提前设置的 property 优先成为当前值。
          this.#initial = fromAttribute(this.getAttribute('value'));
          this.value = earlyValue;
        }
      }
      const fallback = this.querySelector('[data-fallback]');
      if (fallback) { fallback.hidden = true; fallback.querySelector('input').disabled = true; }
      this.#panel.hidden = false;
      this.#connection?.abort(); this.#connection = new AbortController();
      const change = (delta, source) => {
        if (this.#disabledByForm || this.hasAttribute('disabled')) return;
        this.value = Math.max(0, Math.min(5, this.value + delta));
        source.dispatchEvent(new CustomEvent('score-change', {
          bubbles: true, composed: true, detail: { value: this.value },
        }));
      };
      this.#minus.addEventListener('click', () => change(-1, this.#minus), { signal: this.#connection.signal });
      this.#plus.addEventListener('click', () => change(1, this.#plus), { signal: this.#connection.signal });
      this.#render();
    }
    disconnectedCallback() { this.#connection?.abort(); }
    attributeChangedCallback() { this.#render(); }
    formDisabledCallback(disabled) { this.#disabledByForm = disabled; this.#render(); }
    formResetCallback() { this.value = this.#initial ?? 0; }
    formStateRestoreCallback(state) { this.value = fromAttribute(state); }
    #render() {
      if (!this.#internals) return;
      const value = this.value;
      this.#internals.setFormValue(String(value), String(value));
      this.#output.value = `${value} / 5`;
      const disabled = this.#disabledByForm || this.hasAttribute('disabled');
      this.#minus.disabled = disabled || value === 0;
      this.#plus.disabled = disabled || value === 5;
    }
  }
  if (!customElements.get('study-score')) customElements.define('study-score', StudyScore);
  const score = document.getElementById('score');
  let count = 0;
  document.getElementById('form').addEventListener('score-change', (event) => {
    document.getElementById('events').textContent = `用户变更次数：${++count}；该次评分 ${event.detail.value}；target=${event.target.localName}`;
  });
  document.getElementById('form').onsubmit = (event) => {
    event.preventDefault();
    document.getElementById('result').textContent = JSON.stringify([...new FormData(event.currentTarget)]);
  };
  document.getElementById('move').onclick = () => {
    score.remove(); document.getElementById('fields').append(score);
  };
  document.getElementById('disable').onchange = (event) => {
    document.getElementById('fields').disabled = event.target.checked;
  };
</script>
</html>
```

例子把 HTML 放在注册脚本之前，module 脚本在解析结束后运行，因此连接时能找到 fallback 子节点。若库会在文档解析前注册，不能假设 connectedCallback 里子节点已经完整；应另行约定初始化时机或观察所需子节点。

事件日志记录最近一次用户调整，重置和程序赋值不新增用户事件；当前值以控件或重新读取的 FormData 为准。

页面脚本禁用时，数字输入仍可操作，但静态示例没有保存后端。缺少表单关联能力时，也保留该输入；预先设置的组件 property 不会替原生输入修改值，基础路径初始值仍为 2。

### 四、Attribute 与 property 不会自动同步

**属性反射（Reflection）**是组件自己定义的同步规则。attribute 适合 HTML 序列化，主要是字符串或存在性标记；property 可以保持数字、对象或函数等类型。`disabled="false"` 仍有 disabled 属性，不能按英文单词理解成启用。

本例 setter 接受整数并反射到 attribute，attributeChangedCallback 统一更新界面与表单值；相同序列化结果不重复写回。非法 attribute 保留原始字符串、显示为 0，非法 property 则抛出 RangeError，两种入口的处理已经在公开约定中说明。

对象配置通常更适合 property。把复杂对象放进 HTML attribute，需要额外编码、解析和版本约定，还可能暴露原本不该出现在页面源码里的数据。是否反射应根据消费需要决定。

注册前执行 `element.value = 4`，会创建实例自己的 value 属性；定义升级后，它可能遮住类原型上的 setter。例子保存该值、删除自有属性，再经过 setter 设置，这是处理晚加载组件的一种明确方式。仅等待 whenDefined，不会自动替你清除已经遮住 setter 的属性。

### 五、连接回调可以发生很多次

**生命周期（Lifecycle）**描述实例经历的阶段。constructor 做轻量内部初始化，不依赖尚未准备好的外部 attributes、子节点或布局。connectedCallback 建立本次连接的资源，disconnectedCallback 结束它们；断开不代表实例永久销毁。

本例“断开再接回”保留实例值，却重新建立内部点击监听。每次连接前 abort 旧监听，所以不会因重复挂载导致一次加分处理两次。与外部窗口、频道、Observer 的订阅尤其需要明确归属，可接回 [BROWSER-02 的资源管理](../chinese-guides/browser-02-observers-scheduling-lifecycle-coordination.md#browser-02)。

普通 DOM 移动也可能触发断开与连接。新的 moveBefore / connectedMoveCallback 可在支持环境提供保留状态的移动路径，但不应把所有宿主框架的重排都假定为使用它。adoptedCallback 则对应跨 document 的移动，所依赖的窗口与文档资源需要重新核对。

### 六、Shadow DOM 隔离了什么

**Shadow DOM** 给宿主元素挂上一棵内部子树。外部普通选择器通常不会直接匹配内部按钮，普通 document 查询也不会穿透；但字体、颜色等继承值以及 CSS 自定义属性可以进入边界。

本例宿主通过 --score-accent 与 ::part(control) 修改公开样式。内部类名 panel 没有成为承诺，调用方也不需要向 shadowRoot 注入样式。开放少量稳定入口，比把每个内部节点都标成 part 更容易维护。

open root 便于调试。closed 主要限制通过 shadowRoot 属性的常规访问，不提供安全沙箱；同页面的恶意脚本仍处于高权限环境。不要把密钥或授权判断藏进 closed root，安全问题会在 [SEC-01](../chinese-guides/sec-01-xss-csrf-trust-boundaries.md#sec-01) 继续展开。

### 七、Slot 接收内容，不接管内容所有权

**插槽（Slot）**把 light DOM 内容分配到 shadow tree 中的显示位置。传入的标题仍由宿主管理，不是被复制进组件内部。宿主修改标题文本，组件应自然展示变化，不必拿 querySelector 把它重建一遍。

命名 slot 接收带相应 slot 属性的节点；默认 slot 接收未命名内容，fallback 内容在没有分配节点时显示。slotchange 关注分配集合变化，并不承诺报告已分配节点内部的每次文本修改。

`::slotted()` 不是任意深入所有投影子孙的选择器。若组件要求传入一个固定深层结构才能正常工作，实际已经形成了隐含 API，最好把所需内容改成清楚的 slot 或 property。

### 八、事件穿界与焦点定位要看两层

本例从 shadow 内的按钮发出 score-change，bubbles 让祖先能够委托监听，composed 让它能越过 shadow 边界。外部日志里的 target 是 study-score，体现了事件重定向；composedPath 可帮助理解对外暴露的路径。

如果事件直接在 host 上派发，则不需要先越过它自己的 shadow 边界。不要只背“自定义事件一律加两个 true”，要先看派发位置和预期接收者。事件 detail 应传小而明确的数据，不暴露可以任意修改的内部模型。

焦点也有内外两层：document.activeElement 可能是 host，shadowRoot.activeElement 才是内部按钮。原生 button 的名称、Enter/Space 激活与禁用行为仍有价值。自定义标签本身不会自动变成一个语义完整的评分控件，复杂键盘模式还要单独设计。相关基础见 [A11Y-01](../chinese-guides/a11y-01-wcag-testing-governance.md#a11y-01)。

### 九、表单关联不只是提交时拼一个对象

**ElementInternals** 让自定义元素参与原生表单协议。formAssociated 声明关联资格，setFormValue 提交值，表单禁用、重置与恢复通过相应回调处理。

本例接管后禁用 fallback input，所以 FormData 只出现一份 score。若只把 fallback 隐藏，它仍可能参与提交；同一个字段出现两份值时，后端如何取值就变成额外歧义。

本例把非法值规范为 0，因此没有额外自定义校验错误。真实组件需要约束校验时，可用 setValidity 提供 flags、错误信息和适当的内部焦点锚点，并在有效时清除错误。它不能代替服务端验证。

重置的含义也要明确。本例回到第一次连接时的 HTML 初始值 2，不回到最近一次 property 赋值 4。状态恢复回调接收到的类型由 setFormValue 的 state 约定决定；这里始终写入字符串，不应照搬到使用 File 或 FormData 状态的组件。

### 十、React 与 Vue 消费同一份约定

原生调用方可以设置 `element.value` 并 addEventListener。框架适配也只需要做这层转换，不应复制评分规则。

下面是已有 React 项目中的薄适配片段，组件定义须在入口注册完成。它把宿主的 value 写到 property，把自定义事件交给回调，并在依赖变化或卸载时清理监听。

```jsx example=web-react-score-adapter runtime=project
import { useEffect, useRef } from 'react';
export function ScoreField({ value, onValue }) {
  const ref = useRef(null);
  useEffect(() => { ref.current.value = value; }, [value]);
  useEffect(() => {
    const element = ref.current;
    const change = (event) => onValue(event.detail.value);
    element.addEventListener('score-change', change);
    return () => element.removeEventListener('score-change', change);
  }, [onValue]);
  return <study-score ref={ref} name="score"><span slot="title">资料评分</span></study-score>;
}
```

当前 React 官方文档也说明了自定义 HTML 元素的 property 与事件支持；旧版 React 的经验不能直接套到所有版本。这个片段使用显式桥接，便于看清生命周期，但没有为不支持表单关联的环境输出 fallback，也不等于完整 SSR 适配。

Vue 模板中可按需要用 `.prop` 明确传 property，用自定义事件接收值；例如 `:value.prop="score"` 与 `@score-change="score = $event.detail.value"`。编译器还需要通过 isCustomElement 把 study-score 识别为原生自定义标签，这通常属于构建插件的模板编译配置。不要只在运行时消掉警告，却让编译器继续尝试解析成 Vue 组件。

### 十一、SSR、注册表与版本由谁负责

服务端先输出有意义的 light DOM，脚本晚到时内容仍可读。Declarative Shadow DOM 可以直接在 HTML 表达 shadow root，但它与自定义元素升级、框架 hydration 是不同过程：谁保留已有子树、谁更新数据，都需要明确所有权。

本例是客户端新建 shadow tree，没有演示 Declarative Shadow DOM 水合。不要直接拿同一个 constructor 去接管已有服务端 shadow 内容，而不检查初始化策略。

默认注册表中的标签名是全局资源。get 守卫防止再次 define 抛错，却不能确保先注册的实现与后注册的使用方兼容。微前端应统一版本、明确标签前缀所有者，或使用不同标签名。scoped registries 属于另一种能力，应按实际浏览器和宿主工具链核对。

### 十二、用公开行为判断组件是否可靠

本文最有价值的检查是：升级前后内容存在，提前赋值生效，重连后事件不重复，表单只有一个字段，禁用后不提交该字段，重置有明确结果。它们直接对应调用方能依赖的行为。

大量实例时，还要看首次升级、重复样式、监听器数量和属性更新中的工作量；Shadow DOM 不会自动带来性能提升。需要网络数据的组件，也不能在每次 attributeChangedCallback 中无条件发请求，数据缓存与取消通常由上层统一管理。

学完后尝试回答：为什么 attribute 是 "false" 的 disabled 仍然禁用；为什么定义加载后 value setter 可能仍没有运行；为什么事件从内部按钮出来后 target 变成 host；为什么隐藏 fallback 后 FormData 仍可能重复。把这些机制连起来，才能写出真正可跨宿主消费的接口。

### 参考与延伸阅读

审校日期：2026-09-14。主例以平台 DOM 与原生表单为核心，框架片段说明适配方式，不等于所有版本的兼容结论。

- [MDN：Using custom elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements)：注册、升级和生命周期。
- [MDN：Using Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)：封装、slot 与样式边界。
- [MDN：ElementInternals](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals)：表单值、校验与状态。
- [React：Custom HTML elements](https://react.dev/reference/react-dom/components#custom-html-elements)：当前 React 的属性与自定义事件行为。
- [Vue：Vue and Web Components](https://vuejs.org/guide/extras/web-components.html)：模板识别、property 与框架消费。
