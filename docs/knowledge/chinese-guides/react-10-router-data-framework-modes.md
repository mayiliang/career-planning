# React 知识点讲义

## REACT-10 React 路由、数据路由与框架模式

点击链接能打开详情，不代表路由已经做好。把地址发给别人能否直接进入？修改标题以后，列表会不会还是旧名字？在输入草稿时点返回，应该保留、提醒还是丢弃？这些行为共同决定页面是否像一个完整应用。

本篇先把 URL 和布局连接起来，再用完整 Data Router 页面演示读取、提交、错误与重新验证。最后说明 Framework Mode 增加哪些构建和运行责任，避免把客户端路由和服务端能力混为一谈。

### 学习前先确认

- 直接前置：[REACT-08 错误边界、异步 UI 与可恢复体验](../chinese-guides/react-08-error-boundaries-suspense-recovery.md#react-08)。路由层也需要决定等待和失败替换哪一块区域。

2026-09-09 核对的官方文档版本为 React Router 8.3.1。以下例子使用 React 19、TypeScript 与 react-router 8.3.1，导入入口采用 react-router 及 react-router/dom；不是项目现有 Vue Router 的升级操作。每组放入独立的 React + Vite 页面，从站点根路径打开。

代码中的资料保存在浏览器模块内存里，刷新会恢复初始数据。loader/action 在本例都运行于浏览器，用于学习路由协议；它们不是可信后端，也不具有持久化或授权能力。

### URL 保存能分享和返回的页面状态

例如 `/lessons/a?tab=notes` 同时说明资料身份和当前标签。别人打开这个地址，应该能得到相同的位置；浏览器前进后退，也应按对应历史恢复。

| 位置 | 常见含义 | 读取时要注意什么 |
| --- | --- | --- |
| pathname | 页面或资源身份 | 参数是否有效、资源是否存在 |
| search params | 页码、筛选、标签 | 枚举和数字需要解析 |
| hash | 文档内位置 | 目标是否存在、如何滚动 |
| 当前组件状态 | 还没提交的编辑过程 | 不一定需要分享或进入历史 |

URL 里的值仍是外部输入。类型写了 tab: 'intro' | 'notes'，也不会阻止人在地址栏输入别的字符串。应决定使用默认值、规范化地址还是显示错误，而不是直接断言成想要的类型。

### 三种模式增加的是配套能力与约定

| 模式 | 主要入口 | 额外负责什么 |
| --- | --- | --- |
| Declarative | BrowserRouter、Routes | URL 匹配、链接和历史；数据由应用另行安排 |
| Data | createBrowserRouter、RouterProvider | loader、action、fetcher、导航等待与路由错误 |
| Framework | React Router 的 Vite 插件与 route modules | 类型生成、构建分块，以及 SPA、SSR、预渲染等运行方式 |

模式不是成熟度排名。Framework Mode 也能构建 SPA，并非只有需要 SSR 才有价值；Data Mode 也不会因为拥有 loader 就自动多出一台服务器。选择时看谁负责数据、构建和部署，以及团队想保留多少控制权。

### 嵌套路由让布局保留而内容切换

先运行一个 Declarative 示例，整段放在 `src/App.tsx`：

```tsx example=react10-declarative runtime=project file=src/App.tsx
import { useState } from 'react';
import { BrowserRouter, Link, NavLink, Outlet, Route, Routes, useParams, useSearchParams } from 'react-router';
const titles: Record<string, string> = { a: '组件协作', b: '状态分层' };
function Layout() {
  const [note, setNote] = useState('');
  return <main>
    <nav aria-label="资料导航"><NavLink to="/" end>目录</NavLink>{' '}<NavLink to="/lessons/a">资料 A</NavLink>{' '}<NavLink to="/lessons/b">资料 B</NavLink></nav>
    <label>布局里的临时笔记 <input value={note} onChange={e => setNote(e.target.value)} /></label>
    <Outlet />
  </main>;
}
function Lesson() {
  const { lessonId } = useParams();
  const [search, setSearch] = useSearchParams();
  const title = lessonId ? titles[lessonId] : undefined;
  const tab = search.get('tab') === 'notes' ? 'notes' : 'intro';
  function selectTab(next: 'intro' | 'notes') {
    const value = new URLSearchParams(search);
    if (next === 'intro') value.delete('tab'); else value.set('tab', next);
    setSearch(value);
  }
  if (!title) return <section><h1>资料不存在</h1><Link to="/">返回目录</Link></section>;
  return <section>
    <h1>{title}</h1>
    <div aria-label="资料标签"><button aria-pressed={tab === 'intro'} onClick={() => selectTab('intro')}>简介</button><button aria-pressed={tab === 'notes'} onClick={() => selectTab('notes')}>笔记</button></div>
    <p>{tab === 'notes' ? '这里是当前资料的笔记区域' : '这里是当前资料的简介'}</p>
  </section>;
}
export default function App() {
  return <BrowserRouter><Routes>
    <Route path="/" element={<Layout />}>
      <Route index element={<h1>阅读目录</h1>} />
      <Route path="lessons/:lessonId" element={<Lesson />} />
      <Route path="*" element={<h1>找不到这个页面</h1>} />
    </Route>
  </Routes></BrowserRouter>;
}
```

在布局笔记里输入内容，切换 A 与 B，笔记保留，因为父布局没有离开路由树。切到笔记标签，地址包含 tab=notes；返回上一条历史后恢复简介。刷新时 URL 标签仍在，组件内临时笔记则消失。

**nested route** 通过 Outlet 把子内容放进父布局。无 path 的布局路由可以只提供结构，index 表示父路径的默认子页面，动态段接收参数，* 处理剩余匹配。它们不要求完全照搬源码文件夹。

这个例子对未知 tab 显示简介，但不主动改地址；是否要规范化 URL，应作为明确策略。更新查询参数时先复制 URLSearchParams，保留与当前动作无关的参数。

### 地址变化与数据读取需要同一套身份

**loader** 让匹配到的路由取得读取结果。父子 loader 可以并行执行，不应假设“父 loader 的授权检查完成后，子 loader 才会开始”。真实可信端必须在相应请求路径中检查权限。

接下来是一组完整的 Data Mode 例子。创建 `src/lessonData.ts`，包括模拟数据、参数解析、取消和 action：

```ts example=react10-data-source runtime=project file=src/lessonData.ts
import { data, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router';
type Id = 'a' | 'b';
export type Lesson = { id: Id; title: string; done: boolean; version: number };
const lessons: Record<Id, Lesson> = {
  a: { id: 'a', title: '组件协作', done: false, version: 1 },
  b: { id: 'b', title: '状态分层', done: false, version: 1 },
};
function parseId(value: string | undefined): Id {
  if (value === 'a' || value === 'b') return value;
  throw new Response('资料不存在', { status: 404 });
}
function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(signal.reason); return; }
    const timer = window.setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    function abort() { window.clearTimeout(timer); reject(signal.reason); }
    signal.addEventListener('abort', abort, { once: true });
  });
}
export function listLoader() { return Object.values(lessons).map(lesson => ({ ...lesson })); }
export async function lessonLoader({ params, request }: LoaderFunctionArgs) {
  const id = parseId(params.lessonId);
  await wait(id === 'a' ? 600 : 150, request.signal);
  return { ...lessons[id] };
}
export type ActionResult = { ok: false; message: string } | { ok: true; message: string };
export async function lessonAction({ params, request }: ActionFunctionArgs) {
  const id = parseId(params.lessonId);
  const form = await request.formData();
  const intent = form.get('intent');
  const versionText = form.get('version');
  const title = form.get('title');
  const done = form.get('done');
  if (typeof versionText !== 'string' || !/^\d+$/.test(versionText) || !Number.isSafeInteger(Number(versionText))) {
    return data<ActionResult>({ ok: false, message: '版本参数无效，请重新读取' }, { status: 400 });
  }
  if (intent === 'rename' && (typeof title !== 'string' || title.trim().length < 2)) {
    return data<ActionResult>({ ok: false, message: '标题至少填写两个字符' }, { status: 422 });
  }
  if (intent !== 'rename' && intent !== 'mark') return data<ActionResult>({ ok: false, message: '未知操作' }, { status: 400 });
  if (intent === 'mark' && done !== 'true' && done !== 'false') return data<ActionResult>({ ok: false, message: '已读参数无效' }, { status: 400 });
  await wait(250, request.signal);
  const current = lessons[id];
  if (Number(versionText) !== current.version) return data<ActionResult>({ ok: false, message: '资料已变化，请重新读取后再提交' }, { status: 409 });
  if (intent === 'rename' && typeof title === 'string') {
    lessons[id] = { ...current, title: title.trim(), version: current.version + 1 };
    return redirect(`/lessons/${id}`, { status: 303 });
  }
  lessons[id] = { ...current, done: done === 'true', version: current.version + 1 };
  return data<ActionResult>({ ok: true, message: '已读状态已更新' });
}
```

返回读取结果前复制条目，避免调用者拿到模块内的同一个可变对象。模拟写入也检查版本，但这只是当前浏览器里的比较；真实服务端需要以自己的原子更新与授权规则执行。

### 完整页面把读取提交和错误连成一条路径

保留 lessonData.ts，再放入 `src/App.tsx`：

```tsx example=react10-data-app runtime=project file=src/App.tsx
import { useEffect, useRef, useState } from 'react';
import { createBrowserRouter, Form, isRouteErrorResponse, Link, Outlet, useActionData, useFetcher, useLoaderData, useLocation, useNavigation, useRevalidator, useRouteError, useRouteLoaderData } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { lessonAction, lessonLoader, listLoader, type ActionResult, type Lesson } from './lessonData';
function Heading({ title }: { title: string }) {
  const node = useRef<HTMLHeadingElement>(null);
  const { pathname } = useLocation();
  useEffect(() => { document.title = title; }, [title]);
  useEffect(() => { node.current?.focus(); }, [pathname]);
  return <h1 ref={node} tabIndex={-1}>{title}</h1>;
}
function Layout() {
  const navigation = useNavigation();
  const lessons = useLoaderData<typeof listLoader>();
  return <main>
    <nav aria-label="资料导航"><Link to="/">目录</Link>{' '}{lessons.map(lesson => <Link key={lesson.id} to={`/lessons/${lesson.id}`}>{lesson.title}{' '}</Link>)}</nav>
    {navigation.state !== 'idle' && <p role="status">{navigation.state === 'submitting' ? '正在提交' : '正在读取下一页'}</p>}
    <Outlet />
  </main>;
}
function MarkButton({ lesson }: { lesson: Lesson }) {
  const fetcher = useFetcher<ActionResult>();
  return <fetcher.Form method="post" action={`/lessons/${lesson.id}`}>
    <input type="hidden" name="intent" value="mark" /><input type="hidden" name="version" value={lesson.version} />
    <input type="hidden" name="done" value={String(!lesson.done)} />
    <button disabled={fetcher.state !== 'idle'}>{lesson.done ? '改回未读' : '标为已读'}：{lesson.title}</button>
    {fetcher.data && <p role={fetcher.data.ok ? 'status' : 'alert'}>{fetcher.data.message}</p>}
  </fetcher.Form>;
}
function List() {
  const lessons = useRouteLoaderData<typeof listLoader>('root') ?? [];
  return <section><Heading title="阅读目录" /><ul>{lessons.map(lesson => <li key={lesson.id}><MarkButton lesson={lesson} /></li>)}</ul></section>;
}
function TitleForm({ lesson }: { lesson: Lesson }) {
  const [draft, setDraft] = useState({ title: lesson.title, version: lesson.version });
  const navigation = useNavigation();
  const result = useActionData<typeof lessonAction>();
  return <Form method="post">
    <input type="hidden" name="intent" value="rename" /><input type="hidden" name="version" value={draft.version} />
    <label>标题草稿 <input name="title" value={draft.title} onChange={e => setDraft(value => ({ ...value, title: e.target.value }))} /></label>
    <button disabled={navigation.state !== 'idle'}>保存标题并重新读取</button>
    {result && !result.ok && <p role="alert">{result.message}</p>}
    {draft.version !== lesson.version && <div>
      <p role="status">当前资料已经更新，草稿尚未替换。</p>
      <button type="button" onClick={() => setDraft({ title: lesson.title, version: lesson.version })}>载入当前已保存标题</button>
    </div>}
  </Form>;
}
function Detail() {
  const lesson = useLoaderData<typeof lessonLoader>();
  return <section><Heading title={lesson.title} /><p>资料 {lesson.id}，版本 {lesson.version}</p><TitleForm key={lesson.id} lesson={lesson} /></section>;
}
function RouteFailure() {
  const error = useRouteError();
  const retry = useRevalidator();
  const missing = isRouteErrorResponse(error) && error.status === 404;
  return <section><Heading title={missing ? '资料不存在' : '这一页暂时无法读取'} />
    <Link to="/">返回目录</Link>{!missing && <button disabled={retry.state !== 'idle'} onClick={() => retry.revalidate()}>重新读取当前路由</button>}
  </section>;
}
const router = createBrowserRouter([{ id: 'root', path: '/', Component: Layout, loader: listLoader,
  ErrorBoundary: RouteFailure, HydrateFallback: () => <p role="status">正在准备阅读页面</p>, children: [
    { index: true, Component: List },
    { path: 'lessons/:lessonId', Component: Detail, loader: lessonLoader, action: lessonAction, ErrorBoundary: RouteFailure },
    { path: '*', Component: () => <section><Heading title="找不到这个页面" /><Link to="/">返回目录</Link></section> },
  ] }]);
export default function App() { return <RouterProvider router={router} />; }
```

在目录标记一篇已读，URL 不变，按钮文字随重新读取的结果改变。进入详情，把标题改成一个字再提交，字段错误留在表单旁；改成合格标题提交，顶部导航与详情标题一起更新。

草稿保存自己的基线版本。新的 loader 结果不会自动覆盖当前输入，载入已保存标题需要明确点击；这也意味着成功保存后可以选择把标准化后的标题与新版本作为下一轮编辑起点。关键是不要通过给整个编辑器设置不断变化的版本 key，无声地丢掉尚未提交的输入。

直接打开不存在的 `/lessons/x`，只替换详情区域，导航仍在。先点慢的 A，再马上点快的 B，最后仍进入 B，不会被迟到的 A 改回去。

### Form 与 fetcher 表达不同的位置变化

**Form** 用于参与路由提交的表单；**fetcher** 可以在不发起页面导航的情况下读取或提交。上例把“修改详情标题后回到该详情”交给 Form，把“在目录里标记一项”交给 fetcher。

它们的等待状态也不同：useNavigation 观察导航，fetcher.state 观察这份局部工作。目录里一项正在提交，不必把所有安全导航都禁用；同一按钮可以暂时禁用，防止重复触发。

按钮 disabled 不是服务端防重，也不能证明其他客户端不会同时写入。输入解析、身份授权、版本与幂等仍需要可信端负责。直接给任意查询参数作为 redirect 目标也有风险，应限制到允许的站内地址。

### Revalidation 让写入结果回到读取来源

**revalidation** 是重新执行相关读取，使页面拿到写入后的当前数据。Data Router 的 action 与 loader 已有配套流程，因此本例没有再额外把标题复制进 Context 或 Pinia。

验证错误以字段或操作结果返回，路由级异常交给最近错误区域。并不是 HTTP 状态一到 4xx 就一定整页替换；返回数据与抛出路由错误的语义不同。

shouldRevalidate 可以缩小重新读取范围，但每次跳过都要说明数据为何仍然有效。默认行为、错误状态后的重验证及版本升级也有具体约定；不能为了少发请求一律返回 false。手动重试可以使用 revalidator，资源真正不存在时则应提供稳定的返回入口。

### 导航取消不表示远端写入已撤回

request.signal 应传给底层 fetch 或能协作取消的适配器。上例的模拟等待接收 signal，因此旧读取能够及时结束；绕开路由器的异步副作用仍需要自己的失效判断。

路由器会协调导航结果，用户快速切到 B 时，不应再提交 A 的旧结果。但浏览器取消请求无法保证服务端停止已经开始的写入。尤其 action 超时、离开页面和重复点击，需要区分“客户端不再等待”和“写入没有发生”。

这与 [Effect 的取消和提交资格](../chinese-guides/react-04-effects-external-sync-cleanup.md#请求能否取消和结果能否提交是两个问题)是同一类责任划分，路由器只是接管其中一部分协调。

### 未保存草稿需要一个明确的离开策略

以下独立 App.tsx 使用 Data Router 的 useBlocker。它显示页面内确认区域，不假装能拦住所有刷新和关闭。

```tsx example=react10-blocker runtime=project file=src/App.tsx
import { useState } from 'react';
import { createBrowserRouter, Link, Outlet, useBlocker } from 'react-router';
import { RouterProvider } from 'react-router/dom';
function Layout() { return <main><nav><Link to="/">编辑</Link>{' '}<Link to="/done">其他页面</Link></nav><Outlet /></main>; }
function Editor() {
  const [draft, setDraft] = useState('');
  const [saved, setSaved] = useState('');
  const dirty = draft !== saved;
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);
  return <section>
    <h1>本地草稿</h1><label>草稿内容 <textarea value={draft} onChange={e => setDraft(e.target.value)} /></label>
    <button onClick={() => setSaved(draft)}>记为本次页面内已保存</button>
    <p>{dirty ? '有未保存修改' : '没有未保存修改'}</p>
    {blocker.state === 'blocked' && <div role="alert">
      <p>离开会丢弃当前页面的草稿，是否继续？</p>
      <button onClick={() => blocker.reset()}>留下继续编辑</button>
      <button onClick={() => blocker.proceed()}>丢弃并继续离开</button>
    </div>}
  </section>;
}
const router = createBrowserRouter([{ path: '/', Component: Layout, children: [
  { index: true, Component: Editor },
  { path: 'done', Component: () => <h1>已经离开编辑页</h1> },
] }]);
export default function App() { return <RouterProvider router={router} />; }
```

输入草稿后点击其他页面，地址暂时不变；留下则继续编辑，确认丢弃才执行之前被阻止的那次导航。本例的“已保存”只更新页面内基线，没有持久化，不能作为真正保存成功的证明。

useBlocker 针对客户端路由导航。刷新、关闭标签、跨文档导航的能力不同，beforeunload 也不能保证在所有退出情况下执行。重要草稿应有明确的自动保存或恢复机制，确认提示只是其中一层体验。

### Framework Mode 进一步统一路由模块与构建

Framework Mode 使用 route modules 表达页面、loader、action 和边界，由配套工具生成路由类型并组织构建。路由声明可以明确配置，文件约定也是可选择的组织方式，不必把“框架模式”解释成“文件名自动决定一切”。

它支持 SPA、SSR 和预渲染等策略。服务端 loader 与客户端加载函数有不同执行位置，客户端 action 也不等于受信任的服务端 action。使用前应看清当前模式和对应导出，而不是从另一个模式复制 API 后只改文件名。

生成类型保护源码之间的关系，不会代替 URL、表单和外部 JSON 的运行时解析。服务端秘密不能因为某函数名叫 loader 就自然安全；返回给浏览器的数据仍需要限制范围。

### 代码分割与错误恢复要考虑发布版本

Declarative 页面可以使用 React.lazy，Data Mode 可以按 route lazy 拆分，Framework Mode 还提供构建集成。按用户访问路径分块，通常比把每个小组件拆成独立文件更有意义。

动态代码加载失败可能是网络问题，也可能是旧 HTML 指向已删除资源。预加载能减少等待，但会消耗带宽和计算；无限自动刷新既不能修复真实程序错误，也可能丢失草稿。

代码资源失败与业务 loader 失败要分开定位。相关基础见 [lazy 与恢复边界](../chinese-guides/react-08-error-boundaries-suspense-recovery.md#lazy-管的是代码资源而不是业务数据)。升级时核对实际包版本、模式与构建产物，不把讲义日期当成永久兼容承诺。

### 深链部署要让服务器也认识入口

**deep link** 不只是在应用已经打开时点击 Link。用户直接请求 `/lessons/a`，服务器或静态托管也必须提供正确页面入口；否则客户端路由写得再好，刷新仍会 404。

SPA fallback 应在 API 和静态资源规则之后处理页面路径。丢失的 chunk、robots.txt、favicon 和 .well-known 文件，不应全部返回 HTML 200。应用里的“找不到页面”文案与 HTTP 响应状态也不同，尤其搜索引擎和缓存会关注真实状态码。

使用子路径部署时，路由 basename、资源 base 与服务器规则需要对应。浏览器 HTTP 缓存、CDN、路由重新读取和应用查询缓存也有不同的 key 与失效策略，不能统称为“路由缓存”。

### 导航完成还包括滚动焦点与文档标题

新内容出现后，应让用户知道位置变了。可以更新文档标题、聚焦新页面主标题、恢复返回时的滚动，或定位 hash 目标；不要让每层布局都抢一次焦点。

上面的 Data 示例在路径切换时聚焦当前标题，标题文字变化时更新 document.title；局部 fetcher 操作不改变路径，因此不会把焦点抢回整页开头。更完整的历史滚动、同页锚点和错误页恢复，还需要按实际产品统一安排。

核对路由时，重点是地址栏直达、刷新、前进后退、非法参数、等待、字段错误、写后重新读取和草稿退出是否讲得通。内存 router 能帮助隔离逻辑，但不能证明真实部署已经支持深链。

### 参考与延伸阅读

- [React Router：Picking a Mode](https://reactrouter.com/start/modes)：比较 Declarative、Data 与 Framework 的能力。
- [React Router：Data Routing](https://reactrouter.com/start/data/routing)：查嵌套、动态段与 route objects。
- [React Router：Data Loading](https://reactrouter.com/start/data/data-loading)：查 loader 和读取结果。
- [React Router：Actions](https://reactrouter.com/start/data/actions)：查 Form、fetcher 与重新验证。
- [React Router：Navigation Blocking](https://reactrouter.com/how-to/navigation-blocking)：查阻止、继续与取消导航。
- [React Router：Route Module](https://reactrouter.com/start/framework/route-module)：查框架模式的导出与执行位置。
- [React Router：Race Conditions](https://reactrouter.com/explanation/race-conditions)：查导航并发与取消边界。
- [React Router：Changelog](https://reactrouter.com/changelog)：核对实施时的版本与迁移信息。
- [React：状态保留与重置](https://react.dev/learn/preserving-and-resetting-state)：理解布局位置、草稿与 key。
- [MDN：History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API)：查浏览器历史的基本行为。
