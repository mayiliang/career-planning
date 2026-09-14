# 工程化知识点讲义

## ENG-01 模块图、构建产物、代码分割与 Source Map

资料页上有一个“查看统计”按钮。如果用户还没点它，统计代码是否已经下载了？源码经过构建，为什么换成了带散列的文件名？生产错误只报 `assets/report-xxx.js:1:240`，又怎样找回原来的代码？

这篇用一个能实际构建的小应用，把这些问题接在一起。我们从入口跟随 import，观察构建清单和浏览器请求，再用同一次构建的 Source Map 还原错误位置。

### 学习前先确认

- 直接前置：[JS-06 ES Modules 与模块边界](../chinese-guides/js-06-es-modules-module-boundaries.md#js-06)。需要理解静态导入、导出绑定与动态 import 返回 Promise。

正文沿用当前项目的 Vite 6.4.3、Node.js 22.23.0 进行核对，不要求先升级业务项目。Vite 当前主版本的底层构建器和部分配置已有变化，因此例子只用这里明确列出的配置；迁移时按文末对应版本文档核对，不照搬旧版本内部实现。

### 模块图回答一份代码为什么会被带进来

**模块图（module graph）**记录入口通过哪些依赖关系找到其他模块。import 的字符串首先经过解析，变成实际文件或虚拟模块；工具再继续分析它的依赖。CSS、图片 URL 和插件生成模块也可能进入这张图。

```text
index.html → main.js → lessons.js
                 ├→ boot.js：初始化标记
                 └⇢ report.js → report.css
                   点击时动态导入
```

这里实线代表首屏会使用的静态关系，虚线代表由按钮触发的动态关系。这是源码关系图，不是最终网络请求图：构建器可能合并模块、拆共享文件，也可能删除不需要的导出。

同一个包名在浏览器、Node 或不同条件下可能对应不同入口。排错时要问“谁导入它、用什么条件、最后解析到哪里”，不能只找到一个同名文件就认定它会执行。重复依赖和条件导出的具体判断见 [ENG-03](../chinese-guides/eng-03-dependencies-lockfile-workspaces-peer.md#安装位置不同为什么可能改变运行结果)。

### 先建立一份可以从头运行的资料应用

新建独立目录 `build-lab`，按以下文件名保存内容。这是没有框架和后端的浏览器小应用，避免先把构建问题与框架行为混在一起。

`package.json` 定义本例需要的工具与命令：

```json example=eng01-package runtime=project file=package.json
{
  "name": "atlas-build-lab",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "vite build",
    "preview": "vite preview --host 127.0.0.1"
  },
  "devDependencies": { "vite": "6.4.3" }
}
```

`vite.config.js` 显式输出构建清单和本地练习用映射：

```js example=eng01-config runtime=project file=vite.config.js
export default {
  build: {
    manifest: true,
    sourcemap: true
  }
};
```

`index.html` 提供两个按钮和可观察结果：

```html example=eng01-html runtime=project file=index.html
<!doctype html>
<html lang="zh-CN">
<meta charset="UTF-8">
<title>资料构建观察台</title>
<style>
  body { max-width: 800px; margin: 64px auto; padding: 0 24px; font: 17px/1.8 system-ui; color: #19372e; background: #f2f6f4; }
  main { padding: 32px; border-radius: 18px; background: white; box-shadow: 0 12px 40px #183d2810; }
  button { padding: 10px 16px; margin-right: 8px; border: 1px solid #80a494; border-radius: 8px; color: inherit; background: #e9f4ee; cursor: pointer; }
  button:focus-visible { outline: 3px solid #217251; outline-offset: 3px; }
  pre { white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
<main>
  <h1>资料构建观察台</h1>
  <p id="summary"></p>
  <button id="report">查看统计</button>
  <button id="error">演示错误位置</button>
  <p id="status" role="status">尚未加载统计模块</p>
  <pre id="output"></pre>
</main>
<script type="module" src="/main.js"></script>
</html>
```

### 把静态依赖与按需工作写在明确的位置

`lessons.js` 中包含正在使用的资料和一个未使用的导出；`boot.js` 则故意产生初始化效果。

```js example=eng01-lessons runtime=project file=lessons.js
export const lessons = [
  { title: '闭包', minutes: 12 },
  { title: '模块', minutes: 18 }
];
export function unusedExample() {
  return 'ATLAS_UNUSED_EXPORT';
}
```

```js example=eng01-boot runtime=project file=boot.js
document.documentElement.dataset.atlasBoot = 'ready';
```

`main.js` 在首屏显示资料数量，按钮使用动态导入取得统计功能，并在失败时给出反馈：

```js example=eng01-main runtime=project file=main.js
import { lessons } from './lessons.js';
import './boot.js';

const summary = document.querySelector('#summary');
const status = document.querySelector('#status');
const output = document.querySelector('#output');
summary.textContent = `已准备 ${lessons.length} 篇资料`;

async function openReport(showError) {
  status.textContent = '正在加载统计模块';
  try {
    const report = await import('./report.js');
    if (showError) report.failForMapping();
    output.textContent = report.summarize(lessons);
    output.classList.add('report-result');
    status.textContent = '统计已就绪';
  } catch (error) {
    status.textContent = '统计暂时不可用，已保留当前页面';
    output.textContent = error instanceof Error ? error.stack : String(error);
  }
}
document.querySelector('#report').addEventListener('click', () => openReport(false));
document.querySelector('#error').addEventListener('click', () => openReport(true));
```

`report.js` 与 `report.css` 只负责统计结果。错误函数只用于本地定位演示，实际产品不应向用户展示完整堆栈。

```js example=eng01-report runtime=project file=report.js
import './report.css';

export function summarize(lessons) {
  const minutes = lessons.reduce((sum, lesson) => sum + lesson.minutes, 0);
  return `${lessons.length} 篇资料，共 ${minutes} 分钟`;
}
export function failForMapping() {
  throw new Error('ATLAS_MAP_DEMO');
}
```

```css example=eng01-report-css runtime=project file=report.css
.report-result {
  padding: 18px;
  border-left: 4px solid #217251;
  background: #edf6f0;
}
```

在这个独立目录运行 `npm install`，保留生成的锁文件，再运行 `npm run build`、`npm run preview`。后续重复安装可用 `npm ci`；不需要为本例更换业务仓库的包管理器。按照终端给出的本地地址打开页面，点击后应显示“2 篇资料，共 30 分钟”。

### 转换打包和压缩分别改变了什么

**转换（transformation）**把 TS、JSX、Vue SFC 等语法转成后续工具可以处理的模块；**打包（bundling）**根据模块关系组织部署文件；**压缩（minification）**在保持约定语义的前提下缩短表达、删除冗余内容。

这三件事可以由不同工具完成，也可能在一次命令内紧密配合。本例没有 TS，但若把文件改为 TS，能生成 JS 仍不意味着类型检查通过。类型检查需要自己的命令，见 [ENG-05](../chinese-guides/eng-05-quality-gates-lint-types-tests-ci.md#类型检查和转译回答不同问题)。

插件还可能介入解析、加载、转换和输出。排查“样式去哪了”时，先确认转换后有没有该样式，再追踪输出和加载；直接调整压缩器设置，可能根本没触及丢失发生的阶段。

构建目标通常负责语法转换范围，不会自动提供全部缺失的运行时 API。能解析某段语法，与环境里存在某个浏览器能力，是两个问题。

### 从 manifest 找到真正要部署的文件

本例生成 `dist/.vite/manifest.json`。**构建清单（manifest）**把源码入口与带散列的 JS、CSS 及依赖关联起来。默认路径和字段有工具约定，不能把文件名猜成固定的 `app.js`。

在项目根目录保存 `inspect.mjs`，构建后运行 `node inspect.mjs`：

```js example=eng01-inspect runtime=project file=inspect.mjs
import { readFile, stat } from 'node:fs/promises';
const manifest = JSON.parse(await readFile('dist/.vite/manifest.json', 'utf8'));
for (const [source, entry] of Object.entries(manifest)) {
  const bytes = (await stat(`dist/${entry.file}`)).size;
  console.log(source, '->', entry.file, `${bytes} bytes`);
  console.log('静态依赖:', entry.imports ?? []);
  console.log('动态依赖:', entry.dynamicImports ?? []);
  console.log('样式:', entry.css ?? []);
}
```

观察 `index.html` 对应的入口，以及指向 report 的动态关系；report 对应的记录还应带上它的 CSS。某些共享记录的 key 不是源码路径，而是生成名称。实际输出文件名和字节数以本次构建为准，不能把示例截图里的 hash 写死到部署脚本。

清单用于找产物，模块归属的细粒度分析还需构建报告或插件元数据。它不能直接告诉你每个用户是否下载过某个文件，更不能代替实际页面验证。

### chunk 的边界要到浏览器里观察

**chunk** 是一组构建后一起加载的代码，不等于一份源码文件。打开 Network，清空记录后刷新页面，再点击“查看统计”。在本例中，首屏没有请求 report JS；点击后才出现相应 JS 与 CSS，请求成功后结果才变成统计文本。

开发服务器里可能直接看到 `report.js`，预览产物里则看到带散列的资源。预加载、浏览器缓存和加载辅助代码也会影响瀑布，不要用“每次点击一定增加一条请求”作为通用结论。模块成功加载后通常会复用，第二次调用不等于再次下载。

做一次对照：把 `main.js` 顶部加入 `import * as report from './report.js'`，删除函数内同名的 `const report = await import('./report.js')`，重新构建。界面行为仍应成立，但 report 已进入首屏的静态可达集合，点击时不再需要同样的异步边界。

这说明拆分改变的是工作发生的阶段。示例模块很小，不据此宣称测出了速度提升。真实优化还需比较冷缓存、热缓存、解析执行和用户等待；大型编辑器或图表等低频功能往往更值得讨论拆分。

### tree-shaking 必须保留必要的副作用

**tree-shaking** 从使用关系和副作用分析出发，删除无需保留的代码。此例的 `unusedExample` 没有被引用，生产 JS 中应不再包含 `ATLAS_UNUSED_EXPORT`；但 boot 的初始化会影响外部状态，即使没有导出，仍需要执行。

在浏览器控制台检查 `document.documentElement.dataset.atlasBoot`，应得到 `ready`。体积变小和初始化仍正确要一起核对；只搜索标记可以辅助这个受控例子，不能证明任意项目的所有副作用都安全。

包清单中的 `sideEffects` 是对模块效果的声明。错误地把需要注册自定义元素、导入 CSS 或安装兼容补丁的文件声明为可忽略，消费者构建可能删掉它们。它不是“越小越好”的优化按钮；实际效果还取决于构建器如何读取该声明。

静态导入并不意味着全包必然留下，动态导入也不意味着所有内容都能删除。动态属性访问、CommonJS 包装、未知调用和插件生成代码都会影响分析能力。循环依赖则要回到 ESM 的绑定与求值顺序理解，构建图能容纳环，不代表业务初始化一定正确。

### Source Map 把生成位置接回源码

点击“演示错误位置”，页面会保留 `ATLAS_MAP_DEMO` 的堆栈。**Source Map** 记录生成位置到作者源码位置的对应关系；有 map 文件不等于已经成功定位。

先在 Chrome Sources 查看映射后的 `report.js`。还可以用下面独立脚本核对堆栈中的生成位置。保存为 `map-position.mjs`，向它传入本次 report 的 `.map` 路径以及堆栈行、列：

```js example=eng01-map-position runtime=project file=map-position.mjs
import { readFile } from 'node:fs/promises';
import { SourceMap } from 'node:module';
const [mapPath, lineText, columnText] = process.argv.slice(2);
const line = Number(lineText);
const column = Number(columnText);
if (!mapPath || !Number.isInteger(line) || line < 1 || !Number.isInteger(column) || column < 1) {
  throw new Error('用法：node map-position.mjs <本次.map路径> <生成行> <生成列>');
}
const payload = JSON.parse(await readFile(mapPath, 'utf8'));
const entry = new SourceMap(payload).findEntry(line - 1, column - 1);
if (entry.originalSource === undefined) throw new Error('这个位置没有对应源码');
console.log(entry.originalSource, entry.originalLine + 1, entry.originalColumn + 1);
```

例如命令形状是 `node map-position.mjs dist/assets/report-实际散列.js.map 1 实际列号`，必须替换为你的真实位置。Chrome 堆栈的行列从 1 开始，这个 API 的偏移从 0 开始，所以脚本先减 1，再将展示结果加回 1。

输出应回到 `report.js` 创建演示错误的那一行。换另一构建的 map，位置就可能失真。生产上可私有保存 map、限制访问；`sourcemap: 'hidden'` 只是去掉引用注释，生成的 map 仍需通过部署策略避免意外公开。位置与根因的区别见 [B09 调试](../chinese-guides/debug-01-systematic-debugging-evidence-causality.md#source-map-必须和实际运行的制品配对)。

### 资源多环境和库产物各有自己的合同

CSS 提取、字体、图片、Worker 与 WebAssembly 都会形成输出或加载关系。本例的统计功能需要 report JS 和 CSS 配合，缺少样式文件时，要继续观察动态导入是否因依赖资源加载失败而进入错误反馈，不能只确认 JS 文件存在。资源还可能被内联而不形成独立文件，不能用文件数量推断是否包含。

客户端、SSR 服务与 Worker 可能有不同入口图。顶层访问 `document` 的 boot 适合本例浏览器入口，不能直接放进服务器共享模块；服务端密钥也不能沿共享 import 意外进入客户端产物。配置和部署的对应关系见 [ENG-02](../chinese-guides/eng-02-dev-production-environments-assets-cache.md#开发预览和部署各自提供哪些能力)。

应用构建知道最终入口，库构建则服务未知消费者，要明确 ESM/CJS、exports、类型和 CSS。框架等宿主依赖常需 external 配合 peer 声明：声明 peer 不会自动阻止打包器把框架打进库。发布前应检查归档，并在独立消费者使用公开入口，而不是只通过仓库源码别名验证。

### 体积与可复现性都要对应同一组输入

| 观察项 | 能回答 | 还需核对 |
| --- | --- | --- |
| 首屏静态可达 JS | 打开入口必须先带来多少代码 | 解析、执行和真实用户等待 |
| 按需 chunk | 后续任务会增加哪些资源 | 加载失败、复用和缓存寿命 |
| 文件散列 | 两次产物字节是否相同 | 哪个输入造成差异 |
| 构建成功 | 当前配置完成输出 | 部署路径、完整上传与浏览器行为 |

共享 chunk 可提高复用，也可能把变化频繁与长期稳定的代码绑在一起，导致一次小更新让大文件失效。先测实际路径，再决定手工拆分；不要为了预算数字，把首屏立刻需要的代码机械挪到下一毫秒下载。

可复现构建还需要固定依赖、工具、环境配置、生成数据和平台条件。脚本写入当前时间或绝对路径，可能让相同源码生成不同字节；缓存 key 漏掉编译配置，则可能把旧产物错误复用。锁文件能固定重要的一部分输入，不能独自证明最终制品一致。

### 参考与延伸阅读

- [Vite 6：生产构建](https://v6.vite.dev/guide/build) 与 [当前构建文档](https://vite.dev/guide/build)：分别核对此例和新主版本的构建配置。
- [Vite 6：后端集成](https://v6.vite.dev/guide/backend-integration)：查看 manifest 的字段和依赖关系。
- [Vite：功能](https://vite.dev/guide/features)：区分 TypeScript 转译、资源处理与动态导入优化。
- [Node.js：SourceMap](https://nodejs.org/api/module.html#class-modulesourcemap)：查询生成与原始行列的映射 API。
- [MDN：动态 import](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import)：回到模块加载和失败语义。

审校日期：2026-09-10。正文的机制、文件和实际观察共同组成例子，工具版本变动时应保留同样的验证问题，而不是沿用旧散列和体积数字。
