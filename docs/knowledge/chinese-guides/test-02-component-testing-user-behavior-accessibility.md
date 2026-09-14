# 测试知识点讲义

## TEST-02 用用户行为检查 React 组件

一个表单的 state 变成 `saved`，不代表用户完成了保存。按钮可能没有名称，错误可能只写进控制台，草稿可能在失败时被清空，键盘用户也可能到不了提交按钮。

这一讲把上篇的标题规则放进 React 表单。我们通过用户能看见和操作的界面检查结果：输入、提交、等待、失败、重试和成功。内部从 useState 改成 reducer 时，只要这些行为仍成立，用例就不应跟着大改。

### 学习前先确认

- 直接前置：[TEST-01 从规则到测试证据](../chinese-guides/test-01-test-design-oracles-properties-mutation.md#test-01)、[REACT-02 组件边界与数据流](../chinese-guides/react-02-component-boundaries-data-flow-composition.md#react-02)。前者提供预言与可控替身，后者提供公开 props 和组件协作的基础。

本例使用 React 19.2.8、Vitest 2.1.8、React Testing Library 16.3.0、user-event 14.6.1、jest-dom 6.6.3 与 jsdom 26.1.0。版本用于固定练习环境，不要求调整业务项目。新建独立目录 `reader-lab`，后续 TEST-03 会继续补齐同一项目的浏览器入口和本地服务。

### 先确定这一次组件检查的边界

**组件测试（component test）**可以挂载一组真实组件，提供公开输入，操作 DOM，再检查可观察结果。本例保留 React 渲染、表单、校验和状态变化，把保存能力作为 `saveTitle` 参数注入。

```text
用户操作 → 真实表单 → 真实标题校验 → saveTitle 替身
                    ← 成功或拒绝 ← 受控 Promise
```

这里能证明组件面对指定保存结果如何表现，不能证明真实 HTTP 方法、后端授权或持久化正确。替身的范围写清以后，下一层该验证什么就很明确了。真实接口与刷新后的读取会在 [TEST-03](../chinese-guides/test-03-e2e-visual-regression-isolation-flakiness.md#test-03) 接起来。

jsdom 提供 DOM 模拟，适合检查语义、内容和许多事件行为，但不实现真实浏览器布局。元素有文本，不代表没有被遮挡；`toHaveFocus` 成功，也不证明焦点轮廓的颜色足够清楚。这些边界要留给浏览器和人工观察。

### 把环境与文件准备完整

保存下面的 `package.json`，执行 `npm install` 并保留锁文件。本讲先使用 `npm test`；dev、build、start 和 e2e 的页面与服务文件会在下一讲交付。

```json example=test02-package runtime=project file=package.json
{
  "name": "reader-test-lab",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "dev": "vite --host 127.0.0.1",
    "build": "vite build",
    "start": "node server.mjs",
    "e2e": "playwright test"
  },
  "dependencies": { "react": "19.2.8", "react-dom": "19.2.8" },
  "devDependencies": {
    "@playwright/test": "1.61.1",
    "@testing-library/jest-dom": "6.6.3",
    "@testing-library/react": "16.3.0",
    "@testing-library/user-event": "14.6.1",
    "fast-check": "4.3.0",
    "jsdom": "26.1.0",
    "vite": "6.4.3",
    "vitest": "2.1.8"
  }
}
```

将 [TEST-01 的 title.mjs](../chinese-guides/test-01-test-design-oracles-properties-mutation.md#预期结果先从需求里找) 原样复制到 `src/title.mjs`。它仍是同一份规则，不另写一个“专供测试使用”的校验函数。

保存 `vite.config.js` 和 `test/setup.js`：

```js example=test02-config runtime=project file=vite.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.js'],
    include: ['test/**/*.test.jsx'],
  },
});
```

```js example=test02-setup runtime=project file=test/setup.js
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());
```

这里明确限制组件用例的发现目录，避免 Vitest 把下一讲的 Playwright 文件当作自己的测试。清理负责卸载当前界面；如果另外创建了全局 mock、定时器或缓存，还要在拥有它的用例中恢复，不能假设 cleanup 包办所有资源。

### 组件公开的约定要在界面上看得见

保存 `src/TitleForm.jsx`。表单接收初始标题、保存函数和可选只读状态。初始值用于这一次编辑会话；切换资料时应由父组件用资料身份重新挂载，不能假设 initialTitle 变化会自动覆盖本地草稿。

```jsx example=test02-form runtime=project file=src/TitleForm.jsx
import { useId, useRef, useState } from 'react';
import { parseTitle } from './title.mjs';

export function TitleForm({ initialTitle, saveTitle, readOnly = false }) {
  const id = useId();
  const field = useRef(null);
  const busy = useRef(false);
  const [draft, setDraft] = useState(initialTitle);
  const [saved, setSaved] = useState(initialTitle);
  const [phase, setPhase] = useState('editing');
  const [fieldError, setFieldError] = useState('');
  const [saveError, setSaveError] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (busy.current || readOnly) return;
    const result = parseTitle(draft);
    setSaveError('');
    if (!result.ok) {
      setFieldError(result.message);
      field.current.focus();
      return;
    }
    busy.current = true;
    setFieldError('');
    setPhase('saving');
    try {
      const record = await saveTitle(result.title);
      setSaved(record.title);
      setDraft(record.title);
      setPhase('saved');
    } catch (error) {
      setSaveError(error?.code === 'FORBIDDEN'
        ? '没有编辑权限，请联系资料负责人。草稿已保留。'
        : '保存失败，草稿已保留。请重试。');
      setPhase('error');
    } finally {
      busy.current = false;
    }
  }

  return (
    <section className="editor" aria-label="资料编辑区">
      <h1>修改资料标题</h1>
      <section aria-label="已保存内容">
        <h2>已保存内容</h2>
        <p>{saved}</p>
      </section>
      <form aria-label="编辑资料标题" onSubmit={submit} noValidate>
        <label htmlFor={id}>资料标题</label>
        <p id={`${id}-hint`}>去掉首尾空白后，标题需为 2～20 个字符。</p>
        <input id={id} ref={field} value={draft}
          readOnly={readOnly || phase === 'saving'}
          aria-invalid={fieldError ? 'true' : undefined}
          aria-describedby={`${id}-hint${fieldError ? ` ${id}-error` : ''}`}
          onChange={(event) => {
            setDraft(event.target.value);
            setFieldError('');
            setSaveError('');
            setPhase('editing');
          }} />
        {fieldError && <p id={`${id}-error`} role="alert">{fieldError}</p>}
        {saveError && <p role="alert">{saveError}</p>}
        <button type="submit" disabled={readOnly || phase === 'saving'}>
          {phase === 'saving' ? '保存中…' : phase === 'error' ? '重试保存' : '保存标题'}
        </button>
        <p role="status">
          {readOnly ? '当前仅可查看' : phase === 'saving' ? '正在保存'
            : phase === 'saved' ? '保存成功' : '可以编辑'}
        </p>
      </form>
    </section>
  );
}
```

错误关联到字段，字段无效时焦点回到输入框；保存期间输入只读，按钮禁用；保存失败不改草稿，成功才使用已交付结果。`busy` 还保护同一轮提交在界面更新之前被重复触发的窗口。两种保护都服务“不要重复写入”的约定。

客户端只读不等于服务端授权。只读 prop 决定界面如何呈现，服务端仍要检查请求主体和资源权限。权限拒绝与普通故障也不应给出相同原因，虽然两种情况下都需要保留用户输入。

### 角色名称和标签让查询接近真实使用

**可访问名称（accessible name）**回答“用户如何辨认这个控件”。本例的 label 与 input 关联，所以可以通过“文本框，资料标题”找到输入；按钮自身文字提供了名称。

```jsx example=test02-queries runtime=project
const input = screen.getByRole('textbox', { name: '资料标题' });
const submit = screen.getByRole('button', { name: '保存标题' });
const savedArea = screen.getByRole('region', { name: '已保存内容' });
```

这三行是查询写法说明，依赖后面完整测试里的 screen 与已挂载组件，不作为独立脚本运行。角色与名称来自公开界面，比 `.editor > form > button:nth-child(4)` 更能经受布局重构。

如果有两个同名按钮，先用 `within` 缩小到“资料编辑区”或某个对话框，而不是随意取第一个。单元素查询匹配多个节点也会抛错；`queryBy` 不会把歧义默默当成不存在。

`data-testid` 适合确实缺少语义入口的技术节点，但不是默认逃生口。找不到输入时先检查 label、角色和当前状态。placeholder 是提示，不能替代持久标签；role/name 能被查询，也不等于已经完整通过无障碍审查。语义基础可回到 [WEB-01](../chinese-guides/web-01-html-semantics-forms-accessibility.md#web-01)。

### 查询方式也在表达你对时间的判断

| 方式 | 它表达什么 | 本例适用场景 |
| --- | --- | --- |
| `getBy*` | 现在应有且唯一 | 表单刚挂载后找到标题输入 |
| `queryBy*` | 现在可以不存在 | 尚未出错时确认没有 alert |
| `findBy*` | 等待元素出现 | 保存拒绝后等待 alert |
| `waitFor` 内放断言 | 等待某个条件成立 | 已有 status 元素的文字改为保存成功 |

注意最后两行的区别：本例的 status 从一开始就存在。`findByRole('status')` 可以立即返回旧状态，不能单独证明它的文字已更新。要等待的是具体内容，而不只是节点存在。

`waitFor` 可能多次执行回调，所以只放查询和断言，不在里面点击或提交。否则一次等待可能重复执行多次业务动作。等待时限用于失败诊断，不要不断加长来掩盖没有发生的状态转换。

### 一条键盘路径同时检查输入与错误反馈

保存 `test/TitleForm.test.jsx`。下面三段按顺序放入同一个文件，第一段包含公共导入与第一个用例：

```jsx example=test02-validation runtime=project file=test/TitleForm.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TitleForm } from '../src/TitleForm.jsx';

describe('资料标题的用户行为', () => {
  it('键盘提交过短标题时指出字段且不保存', async () => {
    const save = vi.fn();
    const user = userEvent.setup();
    render(<TitleForm initialTitle="" saveTitle={save} />);
    const input = screen.getByRole('textbox', { name: '资料标题' });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await user.tab();
    expect(input).toHaveFocus();
    await user.type(input, '学');
    await user.tab();
    expect(screen.getByRole('button', { name: '保存标题' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('2～20');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(/2～20/);
    expect(input).toHaveFocus();
    expect(save).not.toHaveBeenCalled();
  });
});
```

**user-event** 把输入与点击展开为更接近用户操作的一组事件。每次动作都使用 await，给事件和框架更新留下完成机会。直接调用 submit 函数不能证明 Enter 能提交，也绕过了按钮类型与键盘路径。

`fireEvent` 可以用于工具尚未覆盖的底层事件，但要说明所模拟的边界。不要强行向禁用按钮派发事件，再用它推断用户可以重复保存。焦点轮廓和元素遮挡仍需真实浏览器；本例证明的是这条模拟 DOM 路径中的焦点行为。

### 手动交付失败结果才能看清恢复过程

继续在同一个测试文件末尾追加这段。它通过一个可控 Promise 保持保存尚未结束，以便可靠观察中间状态：

```jsx example=test02-recovery runtime=project
it('保存期间不重复提交，失败保留草稿并可重试', async () => {
  let rejectFirst;
  const first = new Promise((_, reject) => { rejectFirst = reject; });
  const save = vi.fn()
    .mockImplementationOnce(() => first)
    .mockResolvedValueOnce({ title: '新的笔记' });
  const user = userEvent.setup();
  render(<TitleForm initialTitle="学习笔记" saveTitle={save} />);
  const input = screen.getByRole('textbox', { name: '资料标题' });
  await user.clear(input);
  await user.type(input, '  新的笔记  ');
  await user.click(screen.getByRole('button', { name: '保存标题' }));
  const busy = screen.getByRole('button', { name: '保存中…' });
  expect(busy).toBeDisabled();
  expect(input).toHaveAttribute('readonly');
  await user.click(busy);
  expect(save).toHaveBeenCalledTimes(1);
  expect(save).toHaveBeenCalledWith('新的笔记');
  await act(async () => { rejectFirst(new Error('模拟保存失败')); });
  expect(await screen.findByRole('alert')).toHaveTextContent('草稿已保留');
  expect(input).toHaveValue('  新的笔记  ');
  expect(within(screen.getByRole('region', { name: '已保存内容' }))
    .getByText('学习笔记')).toBeVisible();
  await user.click(screen.getByRole('button', { name: '重试保存' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('保存成功'));
  expect(input).toHaveValue('新的笔记');
  expect(screen.getByRole('region', { name: '已保存内容' })).toHaveTextContent('新的笔记');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(save).toHaveBeenCalledTimes(2);
});
```

这里检查保存调用次数，是因为它对应重复写入风险。并不检查 React 渲染了几次、内部 setter 调了几次，也不要求使用某个特定 Hook。

显式 `act` 包围测试自己触发的 Promise 拒绝，让 React 处理相关更新；普通 user-event 与 Testing Library 操作已经集成常用更新等待。遇到 act 警告时，检查未等待的动作或测试结束后的更新，不把控制台整段静音。

如果组件面对失败会清空 draft，这个用例会在原始草稿处失败；如果只把按钮禁用删掉，它会在忙碌按钮处失败。即使内部 busy 守卫还挡住了第二次写入，禁用反馈本身仍是我们明确要求的用户行为。

### 只读和权限拒绝属于不同层

最后追加一个只读案例，然后执行 `npm test`，预期这份文件共 3 项通过：

```jsx example=test02-readonly runtime=project
it('只读资料展示现有标题且不能提交', async () => {
  const save = vi.fn();
  const user = userEvent.setup();
  render(<TitleForm initialTitle="只读笔记" saveTitle={save} readOnly />);
  const input = screen.getByRole('textbox', { name: '资料标题' });
  expect(input).toHaveAttribute('readonly');
  await user.type(input, '改写');
  expect(input).toHaveValue('只读笔记');
  const button = screen.getByRole('button', { name: '保存标题' });
  expect(button).toBeDisabled();
  await user.click(button);
  expect(save).not.toHaveBeenCalled();
  expect(screen.getByRole('status')).toHaveTextContent('当前仅可查看');
});
```

这条路径没有调用服务器，因而不能证明权限校验。HTTP 适配层遇到 403 时，可以映射为带 `code: 'FORBIDDEN'` 的错误，组件提供联系负责人的说明；普通服务故障则提供重试。权限变化以后重新确认身份，才可能解决 403，单纯重复请求并不改变授权。

当你需要验证 HTTP 方法、请求体或错误解析时，应把替身移到 fetch/XHR 的协议边界，例如使用 MSW。拦截器校验请求并交付相应响应，未匹配请求应可见，避免意外连到真实服务。只有调用函数替身的本例不宣称完成了这一步，协议适配将在下一讲结合真实服务验证。

### 异步资源和框架边界各自需要谁负责

本例只有一份资料的单次编辑会话，保存期间输入只读。搜索切换资料、组件卸载或先后两次读取时，还需要处理请求身份与清理。先 B 后 A 的可控结果比随机延迟更容易揭示竞态，详见 [TEST-01](../chinese-guides/test-01-test-design-oracles-properties-mutation.md#用可控完成顺序验证异步规则)。

Router、Context、Query Client 等边界可以提供最小真实 provider，并为每个用例建立新状态。不要为了方便直接 mock useContext 的返回值，那会绕过真实 provider 的更新与缺省行为。自定义 render 可以收纳重复配置，但重要的身份、路由和初始数据应仍在用例里看得见。

自定义 Hook 通常通过使用它的组件观察；纯 reducer 可以独立检查；管理外部订阅的 Hook 则观察订阅集合与清理。开发模式或 Strict Mode 可能增加检查性调用，所以不要把“渲染只发生一次”写成没有业务依据的预期。

使用 fake timer 检查防抖时，要让 user-event 按所用版本的方式配合时钟推进，并恢复真实计时器。推进计时器不一定已经清空全部 Promise 和框架更新，不能靠删除 await 或无限 timeout 解决。

### 弹层快照与浏览器能力不要混成一种证明

Portal 把 DOM 放到挂载容器之外时，查询范围可能应使用 screen，再用对话框角色和名称缩小范围。关闭后焦点是否回到触发者属于行为约定，不能只断言弹层节点消失。

Error Boundary 和 Suspense 需要分别验证等待、错误与恢复；按钮事件里的异步失败通常需要应用自己捕获，并不会自动变成渲染错误边界的 fallback。重试还要确认使用新的请求或正确重置边界，不能让旧结果覆盖恢复后的内容，可连接 [REACT-08](../chinese-guides/react-08-error-boundaries-suspense-recovery.md#react-08)。

大型 DOM 快照很容易变成“实现变了就全部更新”。小型稳定结构或有明确语义的序列化结果可以快照，但必须阅读差异；DOM 快照不包含真实像素布局，不能称为视觉回归。

SSR 又有服务端输出与客户端接管两个阶段。服务端 HTML 正确，不代表 hydrate 后事件、焦点和输入仍正确；模拟 DOM 可以检查一部分接管行为，真实解析、样式与浏览器能力仍应按风险补浏览器观察。[VUE-10](../chinese-guides/vue-10-testing-performance-production-build.md#两个行为测试就能保护关键约定) 中的用户约定与这里相通，框架调度细节则不能直接照搬。

### 失败时先问用户约定还是测试假设变了

查询失败时查看当时的角色、名称和 DOM。异步等待失败时查看最后一个界面状态、保存是否被调用、结果是否真的交付。未处理异常和控制台警告要找到来源，预期错误只在相应场景窄范围处理。

如果用例只有跟在另一个用例后才失败，检查未卸载组件、全局 mock、定时器、单例缓存和 provider 状态。固定运行顺序能暂时掩盖问题，但不能修复隔离。

完成本讲后，可以做两次有意义的故障对照：让保存失败时清空输入；让保存中按钮仍可用。现有恢复用例都应报告具体的用户约定损坏。保持这些观察，再重构组件内部，才是组件测试支持维护的方式。

### 参考与延伸阅读

核对日期：2026-09-10，完整项目采用文首所列版本。

- [Testing Library：查询](https://testing-library.com/docs/queries/about/) 与 [React API](https://testing-library.com/docs/react-testing-library/api/)：核对 role/name、查询时序、挂载、清理和作用域。
- [user-event：介绍](https://testing-library.com/docs/user-event/intro/) 与 [fake timer](https://testing-library.com/docs/using-fake-timers/)：了解用户动作模拟及计时器配合。
- [React：act](https://react.dev/reference/react/act)：区分 React 更新完成与测试自行触发的外部事件。
- [MSW：请求拦截与文档入口](https://mswjs.io/)：需要验证协议边界时再引入相应拦截环境。
- [Vitest 2：环境](https://v2.vitest.dev/guide/environment)：对应本例使用的 jsdom 环境和版本。
