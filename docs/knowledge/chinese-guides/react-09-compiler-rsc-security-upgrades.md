# React 知识点讲义

## REACT-09 React Compiler、服务端组件边界与安全升级

装了 Compiler，组件就一定更快吗？文件写了 use server，就能相信传进来的 userId 吗？package.json 中 React 已升级，为什么服务器仍可能带着旧的协议包？这些问题分别属于编译、执行位置和实际制品，不能用一个版本号回答。

本篇把三条线分开讲清，再用编译对照、隐藏区域和服务端规则模拟把它们连接起来。新能力应在已有知识上增加明确的收益，不应让正确性依赖难以解释的魔法。

### 学习前先确认

- 直接前置：[REACT-07 性能测量、memo 与大列表](../chinese-guides/react-07-performance-memo-large-lists.md#react-07)、[REACT-08 错误边界、异步 UI 与可恢复体验](../chinese-guides/react-08-error-boundaries-suspense-recovery.md#react-08)。两篇分别提供性能观察和异步恢复基础。

实施信息核验于 2026-09-09。正文使用 React 19.2 API；Compiler 示例固定 babel-plugin-react-compiler 1.0.0，便于观察一组确定的源码变换。安全说明以官方具体公告为依据，不能把本文数字作为永久安全承诺。

### 运行时编译器与框架各管一层

| 层次 | 主要工作 | 不能由它自动证明的事 |
| --- | --- | --- |
| React 与 React DOM | 渲染、状态、调度和 DOM 接管 | 所有服务器依赖已更新 |
| React Compiler | 构建时分析组件与 Hook，缓存可复用工作 | 业务模型、授权和算法正确 |
| RSC 集成与传输包 | 服务端组件结果和远程调用的协议 | 所有输入都可信 |
| 框架、构建器和适配器 | 路由、构建、执行环境和发布 | 插件及部署组合永远兼容 |

**React Compiler** 不等于 React 运行时内置的一个开关。服务器项目还可能包含 react-server-dom-webpack、turbopack 或 parcel 集成。顶层 React 与真正部署的框架、传输包可能不是同一条升级链。

### 自动缓存需要先有正确的组件

Compiler 识别可以复用的值、函数与 JSX，减少重复工作。它依赖组件纯度、Hook 规则和可分析的数据流，不会补全遗漏的业务依赖，也不会把昂贵算法变成更好的算法。

“可以编译”“行为相同”“有性能收益”是三种结论。先确保关闭编译时仍正确，再看哪些代码被处理，最后在相同条件下测量。不能只看到 DevTools 的编译标记就宣布页面更快。

### 用同一份源码对照编译结果

把以下内容放入 React + TypeScript 项目的 `src/App.tsx`。这个例子没有手工 memo；输入临时笔记不改变资料筛选条件。

```tsx example=react09-compiler-app runtime=project file=src/App.tsx
import { useState } from 'react';
const lessons = [
  { id: 'a', title: '组件协作', category: '基础' },
  { id: 'b', title: '状态分层', category: '进阶' },
];
function Results({ category }: { category: string }) {
  'use memo';
  const visible = lessons.filter(item => category === '全部' || item.category === category);
  return <ul>{visible.map(item => <li key={item.id}>{item.title}</li>)}</ul>;
}
export default function App() {
  return <Workbench />;
}
function Workbench() {
  const [category, setCategory] = useState('全部');
  const [note, setNote] = useState('');
  return <main>
    <label>资料分类 <select value={category} onChange={e => setCategory(e.target.value)}>
      <option>全部</option><option>基础</option><option>进阶</option>
    </select></label>
    <label>临时笔记 <input value={note} onChange={e => setNote(e.target.value)} /></label>
    <Results category={category} />
  </main>;
}
```

为单独观察变换，安装 `@babel/core` 与 `babel-plugin-react-compiler@1.0.0`，创建 `tools/inspect-compiler.mjs`：

```js example=react09-inspect-compiler runtime=project file=tools/inspect-compiler.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { transformAsync } from '@babel/core';
import compiler from 'babel-plugin-react-compiler';
const source = await readFile('src/App.tsx', 'utf8');
const result = await transformAsync(source, {
  filename: 'src/App.tsx', configFile: false, babelrc: false,
  parserOpts: { plugins: ['typescript', 'jsx'] },
  plugins: [[compiler, { target: '19', compilationMode: 'annotation' }]],
});
if (!result?.code) throw new Error('没有得到编译结果');
await writeFile('compiler-preview.txt', result.code);
console.log('已生成 compiler-preview.txt，请对照 Results 的缓存逻辑');
```

从项目根目录运行 `node tools/inspect-compiler.mjs`。annotation 模式只选择显式标注的函数，Results 中的 use memo 因此有实际作用；没有安装并接入 Compiler 时，这个字符串本身不会优化代码。

生成文件是用于阅读的变换结果，还保留需要后续工具处理的语法，不能直接当作浏览器入口。实际接入应按所用框架或构建器的官方集成说明配置，确保开发、检查和生产使用同一策略。默认推断模式通常不需要给每个组件都加 use memo。

### 保留手工缓存需要理由删除也需要理由

已有 useMemo、useCallback 或自定义 comparator 不应一次全部删除。先核对它有没有掩盖错误语义，再逐处比较结果与成本。自定义比较器漏掉回调的反例见 [函数属性与过期闭包](../chinese-guides/react-07-performance-memo-large-lists.md#忽略函数属性会保留过期的行为)。

Compiler 跳过不支持的代码，不一定意味着整个应用失效。查看诊断、修复纯度和 Hook 问题；确需暂时退出优化时，用局部配置或 use no memo 并写明原因，不用大量忽略注释追求“全部编译”。

目标 React 版本、插件版本、源码转换顺序都属于接入条件。缓存可能减少执行，也可能增加内存；推广依据应包括实际用户动作，而不是产物中多了几个缓存槽。

### Activity 保留状态同时结束隐藏区域的 Effect

**Activity** 让区域隐藏时保留状态与 DOM，同时清理其中的 Effect；重新显示时再建立 Effect。它与简单 CSS 隐藏、条件卸载都有区别。

下面第二个独立 App.tsx 不使用计时器，而是由按钮模拟外部通知。通知发给当前仍订阅的区域；隐藏后没有订阅，就不会累加那些通知。

```tsx example=react09-activity runtime=project file=src/App.tsx
import { Activity, useEffect, useState } from 'react';
function Notes() {
  const [draft, setDraft] = useState('');
  const [count, setCount] = useState(0);
  useEffect(() => {
    const receive = () => setCount(value => value + 1);
    window.addEventListener('b08-notice', receive);
    return () => window.removeEventListener('b08-notice', receive);
  }, []);
  return <section>
    <label>区域笔记 <textarea value={draft} onChange={e => setDraft(e.target.value)} /></label>
    <p>活动期间收到：{count}</p>
  </section>;
}
export default function App() {
  const [visible, setVisible] = useState(true);
  return <main>
    <button onClick={() => setVisible(value => !value)}>{visible ? '隐藏笔记区域' : '显示笔记区域'}</button>
    <button onClick={() => window.dispatchEvent(new Event('b08-notice'))}>模拟一条通知</button>
    <Activity mode={visible ? 'visible' : 'hidden'}><Notes /></Activity>
  </main>;
}
```

写入笔记，交付一条通知，再隐藏；隐藏期间交付两条，恢复后笔记仍在，读数仍是 1。继续交付才变为 2。开发 Strict Mode 的额外 setup/cleanup 不应产生重复订阅。

隐藏不是暂停整个 JavaScript 世界：没有由 Effect 清理的工作仍可能继续，隐藏子树也可以以较低优先级响应 props。音视频、外部连接和资源需要自己的停止规则。跨页面保留区域的范围仍由状态所有者决定。

### Server Component 与 SSR 不是同一个概念

**Server Component** 在服务器或构建阶段执行，其组件实现不作为交互代码发送到浏览器。SSR 则是生成初始 HTML 的过程；Client Component 也可能参与服务器生成初始页面，随后在浏览器接管。

use client 声明模块依赖图的客户端边界，不等于“所有代码只会在浏览器执行”。把 use server 写在函数或模块中，是声明可被远程调用的 Server Function，也不是把整个组件变成 Server Component 的标记。

一个服务端页面可以读取公开资料，只把标题与必要 ID 交给客户端收藏按钮。收藏按钮负责交互，服务端读取实现不必进入客户端。但只要把某字段放进 HTML 或序列化结果，它就已交给浏览器。

### 可序列化与可以公开必须分别判断

RSC 支持的边界值不完全等同 JSON；Date、Map、Set 等有明确协议规则，普通函数、任意类实例或数据库连接不能随意穿过边界。Server Function 引用也有专门语义。

“能传输”不代表“该传输”。用户对象里的内部字段、令牌和整份权限资料即使可以编码，也不应因此公开。构造最小 DTO，让页面只取得当前任务所需字段。

检查范围包括 HTML、RSC payload、网络响应、source map 和日志。页面没显示某个字段，不能证明浏览器没有收到它。框架提供的污点辅助机制或输出编码也不能替代最小化返回数据。

### 把服务端操作拆成输入主体资源和版本

**Server Function** 应按远程入口理解。下面是可独立运行的领域规则模拟：actor 表示可信会话层已经取得的主体，command 才来自客户端。它不实现 HTTP、会话认证或数据库，只让你看清二者不能混在一起。

```ts example=react09-server-rule
 type Actor = { id: string } | null;
 type Command = { lessonId: string; title: string; version: number };
 const records = new Map([['a', { owner: 'u1', title: '旧标题', version: 1 }]]);
 function parse(value: unknown): Command | null {
   if (typeof value !== 'object' || value === null) return null;
   if (Object.keys(value).some(key => !['lessonId', 'title', 'version'].includes(key))) return null;
   if (!('lessonId' in value) || typeof value.lessonId !== 'string') return null;
   if (!('title' in value) || typeof value.title !== 'string' || value.title.trim().length < 2) return null;
   if (!('version' in value) || typeof value.version !== 'number' || !Number.isSafeInteger(value.version) || value.version < 1) return null;
   return { lessonId: value.lessonId, title: value.title.trim(), version: value.version };
 }
 function rename(actor: Actor, input: unknown): string {
   if (!actor) return '需要登录';
   const command = parse(input);
   if (!command) return '输入无效';
   const record = records.get(command.lessonId);
   if (!record || record.owner !== actor.id) return '不能修改这篇资料';
   if (command.version !== record.version) return '版本已变化';
   records.set(command.lessonId, { ...record, title: command.title, version: record.version + 1 });
   return '已保存';
 }
 const command = { lessonId: 'a', title: '新标题', version: 1 };
 console.log(rename(null, command)); // => 需要登录
 console.log(rename({ id: 'u2' }, { ...command, role: 'admin' })); // => 输入无效
 console.log(rename({ id: 'u2' }, command)); // => 不能修改这篇资料
 console.log(rename({ id: 'u1' }, command)); // => 已保存
 console.log(rename({ id: 'u1' }, command)); // => 版本已变化
```

没有 role 字段并不会自动获得权限，资源所有者仍来自记录。实际 Server Function 还必须在每次调用中认证会话，不能让客户端直接传入上例的 actor；数据库的版本比较与更新需要原子执行，进程内 Map 不能证明跨实例并发正确。

写入口还要结合框架处理来源与 CSRF、请求大小、频率、重放、超时和安全错误。绑定参数、闭包捕获或隐藏按钮，都不免除服务端校验。取消等待也不等于撤销已经写入的数据。

### 安全公告要追到后续修补

**remote code execution** 是远程执行代码，**denial of service** 是让服务资源耗尽或无法正常工作。RSC 协议处理可能出现这些问题，业务中“没写那个按钮”不一定排除受影响框架能力。

2026 年 1 月的修补不能自动覆盖后续发现的问题。以下是本次核对的官方公告示例，针对其列出的 react-server-dom-parcel、turbopack 与 webpack 包：

| 官方公告时间 | 对应公告 | 该公告列出的修补版本 |
| --- | --- | --- |
| 2026-04-08 | GHSA-479c-33wc-g2pg | 19.0.5 / 19.1.6 / 19.2.5 |
| 2026-05-06 | GHSA-rv78-f8rc-xrxh | 19.0.6 / 19.1.7 / 19.2.6 |
| 2026-07-21 | GHSA-wx67-qw84-cm4g | 19.0.8 / 19.1.9 / 19.2.8 |

这张表说明为什么早期“已修补”不能永久沿用。它不是对所有 React 框架和所有漏洞的安全认证，也不能只比较顶层 react 版本；实施日还应查看官方公告列表、框架说明和真实解析树。

### 依赖声明锁文件与部署制品不是同一份证据

package.json 表达允许的版本范围，锁文件记录一次解析，安装树说明当前实际存在的包，最终镜像或部署包才是服务真正执行的内容。工作区里升级成功，不代表旧镜像已被替换。

使用对应包管理器的 list/why 查看谁引入协议包、是否并存多版本、框架是否内嵌依赖。**software bill of materials** 可以帮助记录制品包含什么，但生成清单本身不会修复漏洞。

CVE 标识与 CVSS 严重度帮助定位公告，修复优先级还取决于实际暴露面。WAF 或流量限制可以缓解部分风险，不能被当成已经完成依赖修补。框架更新、构建版本与实际部署记录要能相互对应。

### 身份缓存与安全回滚都要考虑旧状态

公开文章可以共享缓存，个性化结果则要按身份、租户和权限范围隔离或不缓存。token 不适合直接拼进缓存 key；退出登录还需要清理当前浏览器保留的私人数据。cache 等框架能力有自己的作用域，不能自动等同跨请求永久缓存。

安全补丁上线后，回到含已知漏洞的旧制品不是合格退路。可以回退功能、关闭实验能力，或准备保留补丁的兼容版本。前后端协议、数据库变化和旧 HTML 引用的 chunk 也需兼容滚动发布。

Activity、Effect Event、cacheSignal、流式与 resume 等能力的执行环境各不相同。稳定 API 仍可能需要特定框架集成；实验能力保留明确关闭路径，不根据一个运行时版本就推断整套部署支持。

### 用有限证据回答明确的问题

Compiler 观察源码变换、行为对照与性能；Activity 观察状态保留和 Effect 清理；服务端入口检查主体、输入、资源和版本；安全升级核对公告、解析树和制品。每条线都有自己的结论，不能用一次 build 成功代替全部。

CSP、输出编码和安全 cookie 是各自有用的防护，不能修复任意 RSC 协议漏洞。这里的规则模拟也不执行漏洞载荷，不应把“示例通过”误写成“服务器已通过安全审计”。

### 参考与延伸阅读

- [React Compiler：安装](https://react.dev/learn/react-compiler/installation)：查对应构建器的真实集成方式。
- [React Compiler：use memo](https://react.dev/reference/react-compiler/directives/use-memo)：查 annotation 与 infer 模式。
- [React：Activity](https://react.dev/reference/react/Activity)：查隐藏、状态保留和 Effect。
- [React：Server Components](https://react.dev/reference/rsc/server-components)：查服务端执行与模块边界。
- [React：use server](https://react.dev/reference/rsc/use-server)：查可序列化值和远程入口责任。
- [React 官方安全公告列表](https://github.com/react/react/security/advisories)：实施时先确认后续公告。
- [2026-04-08 公告](https://github.com/react/react/security/advisories/GHSA-479c-33wc-g2pg)、[2026-05-06 公告](https://github.com/react/react/security/advisories/GHSA-rv78-f8rc-xrxh)、[2026-07-21 公告](https://github.com/react/react/security/advisories/GHSA-wx67-qw84-cm4g)：核对上表的受影响包和修补范围。
