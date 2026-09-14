# 测试知识点讲义

## TEST-03 在浏览器中验证关键任务

组件检查已经证明保存成功时会显示新标题。但如果保存接口只返回成功，根本没有写入数据，组件测试仍可能全部通过。用户刷新页面，旧标题又回来了。

这一讲继续使用 `reader-lab`，把真实 React 页面、本地 HTTP 接口和内存存储接起来。先验证“修改后刷新仍能读到”，再注入一次保存故障，最后建立一个经过查看的桌面截图基线。

### 学习前先确认

- 直接前置：[TEST-01 从规则到测试证据](../chinese-guides/test-01-test-design-oracles-properties-mutation.md#test-01)、[WEB-01 HTML 语义与可访问性](../chinese-guides/web-01-html-semantics-forms-accessibility.md#web-01)。需要理解预期结果、隔离和角色名称。

本讲复用 [TEST-02 的 reader-lab 文件](../chinese-guides/test-02-component-testing-user-behavior-accessibility.md#把环境与文件准备完整)，不要求先学完它的组件测试方法。准备好该项目、`src/title.mjs` 和 `src/TitleForm.jsx`，再添加下面的入口、服务和浏览器用例。

本例采用 Playwright 1.61.1、Node.js 22.23.0 与本机 Chrome，验证环境为 Chrome 152.0.7977.83、Windows 桌面。只配置一个桌面视口，避免把当前没有开放的移动端纳入练习矩阵。

### 端到端先说明穿过哪些真实边界

**端到端测试（end-to-end test）**围绕完整用户任务穿过多个真实边界。这里的成功路径是：

```text
输入新标题 → React 表单 → HTTP PUT → 服务端校验与内存写入
刷新页面   → HTTP GET → React 重新显示已保存标题
```

刷新能区分“页面临时改了字”和“服务端确实保留了结果”。不过本例存储只在当前服务进程的内存中，服务重启后数据消失；没有数据库、认证、CDN 或第三方服务。因此它证明这一组本地边界，不宣称验证真实业务的登录、持久化或生产部署。

标题的全部边界值已在纯函数层检查，组件的详细错误反馈已在上一讲检查。浏览器层选择少量关键任务，重点补上它们还不能提供的证据。测试范围与真实性一起说明，才能合理控制运行成本。

### 给组件接上真正的 HTTP 保存与读取

在 `reader-lab` 中添加 `index.html`：

```html example=test03-html runtime=project file=index.html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>资料标题练习</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

添加 `src/main.jsx`。每个测试通过 URL 的 space 参数使用自己的数据空间；普通手动访问使用 demo。这只是本地练习的数据隔离标识，不是账号、令牌或权限机制。

```jsx example=test03-main runtime=project file=src/main.jsx
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TitleForm } from './TitleForm.jsx';
import { parseTitle } from './title.mjs';
import './style.css';

const space = new URL(location.href).searchParams.get('space') ?? 'demo';
const endpoint = `/api/lessons/${encodeURIComponent(space)}`;
async function recordRequest(method, title) {
  const response = await fetch(endpoint, {
    method,
    ...(method === 'PUT' ? {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    } : {}),
  });
  if (!response.ok) {
    const error = new Error('资料请求失败');
    if (response.status === 403) error.code = 'FORBIDDEN';
    throw error;
  }
  const body = await response.json();
  const parsed = parseTitle(body.title);
  if (!parsed.ok || parsed.title !== body.title) throw new Error('接口标题格式不正确');
  return { title: body.title };
}

function App() {
  const [record, setRecord] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    recordRequest('GET').then(
      (value) => { if (active) setRecord(value); },
      () => { if (active) setFailed(true); },
    );
    return () => { active = false; };
  }, []);
  if (failed) return <main><h1>资料暂时无法读取</h1><p role="alert">请稍后重新加载。</p></main>;
  if (!record) return <main><p role="status">正在读取资料</p></main>;
  return <main><TitleForm initialTitle={record.title}
    saveTitle={(title) => recordRequest('PUT', title)} /></main>;
}
createRoot(document.getElementById('root')).render(<App />);
```

适配层检查 HTTP 状态与响应结构，再把可信的标题交给组件。`fetch` 遇到 HTTP 500 不会自动按网络异常 reject，所以必须检查 `response.ok`。一次状态为 200 的响应也可能携带错误结构，不能直接用类型断言跳过这层判断。

添加 `src/style.css`，为桌面观察提供稳定、无需外部网络的样式：

```css example=test03-style runtime=project file=src/style.css
body { margin: 0; background: #f1f5f3; color: #183b30; font: 16px/1.7 "Segoe UI", "Microsoft YaHei", sans-serif; }
.editor { box-sizing: border-box; width: 760px; margin: 56px auto; padding: 32px; background: #fff; border: 1px solid #b6d2c4; border-radius: 18px; }
h1 { margin: 0 0 24px; font-size: 30px; }
h2 { margin: 0; font-size: 16px; }
section[aria-label="已保存内容"] { padding: 16px; background: #eef6f1; border-radius: 10px; margin-bottom: 24px; }
label { display: block; font-weight: 600; }
input { box-sizing: border-box; display: block; width: 100%; padding: 10px 12px; font: inherit; border: 1px solid #8eae9d; border-radius: 8px; }
button { margin-top: 20px; padding: 10px 20px; font: inherit; color: white; background: #216b50; border: 0; border-radius: 8px; }
button:disabled { opacity: .55; }
input:focus-visible, button:focus-visible { outline: 3px solid #8c5a15; outline-offset: 3px; }
[role="alert"] { color: #9a301f; }
```

这里不通过远端字体或随机头像制造噪声。系统字体仍随操作系统与安装环境变化，截图基线要在同一受控环境中比较，不能把“没有外部请求”误解为跨平台像素必然一致。

### 用小型服务观察真实的写入边界

保存 `server.mjs`。先执行 `npm run build`，再执行 `npm start`，手动打开 `http://127.0.0.1:4191/`。服务启动时读取构建文件，因此源码变化后需要重新构建并重启服务。

```js example=test03-server runtime=project file=server.mjs
import { createServer } from 'node:http';
import { readdir, readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { parseTitle } from './src/title.mjs';

const records = new Map();
const files = new Map();
async function collect(directory, prefix = '/') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    if (entry.isDirectory()) await collect(join(directory, entry.name), prefix + entry.name + '/');
    else if (entry.isFile()) files.set(prefix + entry.name, await readFile(join(directory, entry.name)));
  }
}
await collect('dist');
if (!files.has('/index.html')) throw new Error('请先执行 npm run build');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
function json(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(value));
}
async function handle(request, response) {
  const path = new URL(request.url, 'http://localhost').pathname;
  if (path === '/health') return json(response, 200, { ok: true });
  const match = path.match(/^\/api\/lessons\/([a-zA-Z0-9-]{1,64})$/);
  if (match) {
    const space = match[1];
    if (request.method === 'GET') return json(response, 200, { title: records.get(space) ?? '学习笔记' });
    if (request.method === 'DELETE') {
      records.delete(space);
      response.writeHead(204);
      response.end();
      return;
    }
    if (request.method === 'PUT') {
      const chunks = [];
      let size = 0;
      for await (const chunk of request) {
        size += chunk.length;
        if (size > 4096) return json(response, 413, { error: '输入过大' });
        chunks.push(chunk);
      }
      const text = Buffer.concat(chunks).toString('utf8');
      let body;
      try { body = JSON.parse(text); } catch { return json(response, 400, { error: 'JSON 格式不正确' }); }
      const result = parseTitle(body?.title);
      if (!result.ok) return json(response, 422, { error: result.message });
      records.set(space, result.title);
      return json(response, 200, { title: result.title });
    }
    return json(response, 405, { error: '不支持的方法' });
  }
  const key = path === '/' ? '/index.html' : path;
  const file = files.get(key);
  if (!file) return json(response, 404, { error: '未找到' });
  response.writeHead(200, { 'Content-Type': types[extname(key)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
  response.end(file);
}
createServer((request, response) => {
  void handle(request, response).catch(() => {
    if (!response.headersSent) json(response, 500, { error: '服务暂时不可用' });
    else response.end();
  });
}).listen(4191, '127.0.0.1', () => console.log('资料练习服务：http://127.0.0.1:4191'));
```

静态请求只命中启动时建立的文件表，不把 URL 拼成任意磁盘读取路径。接口也在服务端重新校验标题；浏览器是否提前校验，不影响服务器的职责。这里用 no-store 排除练习中不相关的缓存影响，真实部署缓存请连接 [ENG-02](../chinese-guides/eng-02-dev-production-environments-assets-cache.md#缓存新鲜度与文件是否存在是两回事)。

这个服务仅绑定本机，DELETE 用于清理独立练习数据，不是可公开部署的业务 API。生产服务仍需认证、授权、可靠存储等设计，不能把随机 space 当成访问控制。

### 运行配置把浏览器与服务联系起来

手动观察结束后，先在启动服务的终端按 Ctrl+C 停止它，再保存 `playwright.config.js`。自动检查会自己启动并关闭该本地服务；它不复用一个来源不明的已运行进程。

```js example=test03-config runtime=project file=playwright.config.js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: 2,
  retries: 0,
  timeout: 15000,
  expect: { timeout: 4000 },
  use: {
    baseURL: 'http://127.0.0.1:4191',
    channel: 'chrome',
    viewport: { width: 1440, height: 960 },
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    colorScheme: 'light',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm start',
    url: 'http://127.0.0.1:4191/health',
    reuseExistingServer: false,
    timeout: 10000,
  },
});
```

本例使用已经安装的 Chrome，不额外下载整套浏览器。Chrome 自动升级后应重新核对版本和视觉基线；团队 CI 则可以使用与 Playwright 配套的受控浏览器和固定主机环境。工具版本、浏览器版本与系统字体需要一起记录。

健康地址用于判断服务已准备接收请求，比等待固定几秒更明确。动作、断言和整用例超时是不同预算：有些后台任务合理地需要更长，但不能把所有超时一律改成几分钟。超时后应能看到最后 URL、状态和请求。

### 一条保存后刷新路径检查真正的结果

保存 `e2e/title.spec.js`。下面给出完整文件，它包含三条浏览器检查和每条检查自己的数据空间：

```js example=test03-spec runtime=project file=e2e/title.spec.js
import { randomUUID } from 'node:crypto';
import { test as base, expect } from '@playwright/test';

const test = base.extend({
  space: async ({ request }, use) => {
    const space = randomUUID();
    try { await use(space); }
    finally {
      const response = await request.delete(`/api/lessons/${space}`);
      expect(response.status()).toBe(204);
    }
  },
});
const titleField = (page) => page.getByRole('textbox', { name: '资料标题' });

test('修改标题后刷新仍能读取', async ({ page, space }) => {
  await page.goto(`/?space=${space}`);
  await titleField(page).fill('新的笔记');
  const response = page.waitForResponse((item) =>
    item.url().endsWith(`/api/lessons/${space}`) && item.request().method() === 'PUT');
  await page.getByRole('button', { name: '保存标题' }).click();
  expect((await response).status()).toBe(200);
  await expect(page.getByRole('status')).toHaveText('保存成功');
  await page.reload();
  await expect(titleField(page)).toHaveValue('新的笔记');
  await expect(page.getByRole('region', { name: '已保存内容' })).toContainText('新的笔记');
});

test('一次保存故障后保留草稿并真实重试', async ({ page, request, space }) => {
  let failNext = true;
  await page.route(`**/api/lessons/${space}`, (route) => {
    if (route.request().method() === 'PUT' && failNext) {
      failNext = false;
      return route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"模拟故障"}' });
    }
    return route.continue();
  });
  await page.goto(`/?space=${space}`);
  await titleField(page).fill('保留的草稿');
  await page.getByRole('button', { name: '保存标题' }).click();
  await expect(page.getByRole('alert')).toContainText('草稿已保留');
  await expect(titleField(page)).toHaveValue('保留的草稿');
  await page.getByRole('button', { name: '重试保存' }).click();
  await expect(page.getByRole('status')).toHaveText('保存成功');
  const saved = await request.get(`/api/lessons/${space}`);
  expect(saved.status()).toBe(200);
  expect(await saved.json()).toEqual({ title: '保留的草稿' });
});

test('标题编辑区的桌面视觉基线', async ({ page, space }) => {
  await page.goto(`/?space=${space}`);
  await expect(titleField(page)).toHaveValue('学习笔记');
  await page.evaluate(async () => { await document.fonts.ready; });
  await expect(page.getByRole('region', { name: '资料编辑区' }))
    .toHaveScreenshot('title-editor.png', { animations: 'disabled', caret: 'hide', maxDiffPixels: 0 });
});
```

第一次可以先运行 `npm run e2e -- --grep "修改标题|一次保存故障"`，预期两项通过。响应监听在点击之前建立，避免快速响应已经发生才开始等待；最后还读取界面或服务状态，不把一个 200 当成整个任务完成。

做一次很有说明力的故障对照：只在练习服务中注释掉 `records.set(space, result.title)`，重新运行“修改标题后刷新仍能读取”。接口仍返回 200，页面先显示成功，但刷新后旧标题回来，用例应失败。恢复该行后，同一任务应再次通过。它展示的正是组件替身检查没有覆盖的边界。

### Locator 的等待要落到业务信号上

**定位器（locator）**描述你要操作哪个界面对象。Playwright 的 click 会等待相应可操作条件，`expect(locator)` 会重试断言；它们不会自动知道服务器有没有写入成功。

`page.getByRole('button', { name: '保存标题' })` 比取第几个按钮更能表达意图。同名按钮出现时，先缩小到对应资料区域；如果需求本身涉及排序，再明确断言顺序，而不是让数组下标冒充资料身份。

注意 `expect(await locator.textContent()).toBe(...)` 取得的是一次字符串，不会因为之后文字改变而自动重新读取。需要等待变化时优先使用 `await expect(locator).toHaveText(...)`。`networkidle` 也不能表示业务完成：长连接可能一直存在，网络安静时数据也可能还没有提交。

深链、前进后退、下载和新窗口各有自己的完成信号。下载或 popup 的事件同样先订阅再触发；直接刷新详情页还涉及服务器回退，见 [VUE-07](../chinese-guides/vue-07-router-navigation-boundaries.md#深链与-ssr-需要服务器配合)。

### 浏览器隔离和服务数据隔离要同时成立

**浏览器上下文（browser context）**隔离 Cookie 和浏览器存储，但不会替你复制服务端数据库。本例即使每个用例有独立 context，如果都使用 `space=demo`，仍会修改同一条服务数据。

这里每项用例获得独立 UUID，并在 finally 中只删除自己的空间；失败之后也会尝试清理。清理失败应作为附加问题保留，不用它覆盖原始业务失败。真实系统可以使用合成账号、独立租户或运行 ID，让所有可写资源都有明确归属。

认证状态可以从受控 setup 复用，但状态文件可能含敏感 Cookie，应按凭据管理。加载状态不能替代全部登录测试，仍要保留必要的真实登录路径；不同角色也不要共用一个可变账号来切换权限。

并行与分片只改变执行组织，不改变隔离责任。浏览器、下载目录、端口、数据库和邮件队列需要分别安排；只把测试改成串行，可以帮助找污染来源，却不意味着底层资源已经独立。

### 故障注入必须说明替换了哪一段

第二个浏览器用例只拦截第一次 PUT，给前端一个确定的 500；后续请求继续交给真实服务。它证明客户端正确解释这个协议结果并可以恢复，不能据此宣称后端真的经历过故障或恢复。

这样的范围比把所有接口一律返回理想 JSON 更容易说明。对自有服务可以保留真实协议与测试存储，对第三方调用采用沙箱或受控响应，另安排适量真实联调。未匹配请求要可见，避免测着测着连接真实账号或服务。

403、离线、超时、异常响应结构和迟到结果代表不同问题，不需要全部放进一条漫长旅程。按风险选择相应层：授权交给真实服务边界，反馈文案的细分可以在组件层验证，浏览器保留关键连接。

### 视觉基线要先看过才有比较价值

**视觉回归（visual regression）**比较当前截图与已经确认的外观。先运行 `npm run e2e -- --grep "桌面视觉基线" --update-snapshots`，打开生成的 `title-editor.png`，检查标题、字段、按钮、间距与文字是否符合预期。确认后再执行 `npm run e2e -- --update-snapshots=none`，这时三项都应通过。

明确生成新基线和验证旧基线是两种动作。第一次没有基线，不是一项已通过的回归证明；日常验证不要自动接受差异。基线文件名会包含平台等信息，以实际输出路径为准。

对照时只在 CSS 末尾添加 `.editor button { transform: translateX(16px); }`，重新构建，再运行同一条视觉检查并禁止更新基线。保存功能仍可能正常，但按钮相对表单发生偏移，应出现截图差异。查看 expected、actual 与 diff，恢复样式并重新构建后再检查。

本例截取编辑区域，避免整页无关内容干扰。不过仅把整个区域平移时，区域截图可能跟着裁剪位置移动，看不到它相对页面的位置变化；若风险是整体布局，就应选择包含外层参照的截图。截图范围本身也是预言的一部分。

固定视口、浏览器、系统、字体、数据、颜色方案和缩放条件。关闭动画、等待字体只是减少噪声，不能保证跨系统一致。mask 只覆盖明确不关心的动态区域，不要把待验证的错误提示或主要内容一起遮掉；调整差异阈值也要有可解释依据。

### 用 Trace 区分产品错误与等待错误

**Trace** 能把操作、页面快照和请求串成时间线；截图只保留某个时刻，视频更适合看连续过程，服务日志则补充服务器侧事实。本例使用 `retain-on-failure` 保留失败运行的 trace，不等重试后才开始记录。

注释写入的故障中，应先看到 PUT 成功返回，再看到刷新后的 GET 仍是旧标题。这个序列比“等待标题超时”更接近问题根源。可用本地命令 `npm exec -- playwright show-trace <实际的 trace.zip 路径>` 打开，不需要把日志上传到第三方。

| 首个证据 | 下一步优先核对 |
| --- | --- |
| 请求没发出，按钮仍禁用 | 状态、定位目标、是否满足操作前提 |
| PUT 200，刷新 GET 返回旧值 | 写入是否真实发生、是否读了同一空间 |
| 接口结果正确，页面仍显示旧值 | 客户端提交资格与渲染路径 |
| 所有页面都无法连接 | 服务启动、端口和运行环境 |
| 内容正确，局部像素变化 | 样式、字体、截图范围与预期设计 |

Trace 和认证状态都可能包含输入与请求信息，分享时只保留证明问题所需的内容。本例采用合成标题，真实项目仍需遵守资料的可分享范围。

### 重试不是把失败抹掉

**不稳定测试（flaky test）**在条件看似相同时交替成功和失败。原因可能是产品竞态、错误等待、数据污染、环境容量或外部服务波动，不能仅凭一次重跑成功就归类。

本例 retries 设为 0，让首次失败直接可见。团队需要重试时，保留第一次失败、重试结果与触发条件；隔离用例也要有负责人和恢复条件。修好之后用能触发原窗口的场景确认，而不是靠更长超时让错误迟一点出现。

测试所用页面、服务与制品应来自同一版本。不要一边运行一边覆盖构建文件，也不要让两个分支轮流部署到相同测试地址。变更配置、检查名称和分片策略时，还要确认必需检查没有被意外跳过，参见 [ENG-05](../chinese-guides/eng-05-quality-gates-lint-types-tests-ci.md#绿色结果要对应真正被合入的提交)。

### 哪些结果仍需要其他观察补充

像素相同不代表按钮有正确名称、Tab 顺序合理或请求发生了；角色与名称正确，也不代表高对比度、放大和焦点视觉都可用。用户行为、语义、真实布局与视觉比较各有职责，不能互相取代。

文件上传下载要检查合成文件的内容与应用反馈，并把输出留在当前测试目录；剪贴板等能力只为当前 context 授予需要的权限，也要考虑拒绝状态。实际硬件、浏览器兼容和生产流量，则按产品支持约定安排专项观察，不需要默认扩展成最大矩阵。

本地任务通过之后，正式发布仍要观察真实入口、错误指标与用户关键任务。怎样把这组有限但明确的结果表述给同事或面试官，可以继续读 [CAREER-01](../chinese-guides/career-01-project-evidence-causal-storytelling.md#career-01)：既说明完成了什么，也说明证据停在哪里。

### 参考与延伸阅读

核对日期：2026-09-10。示例采用 Playwright 1.61.1 与文首桌面环境。

- [Playwright：Assertions](https://playwright.dev/docs/test-assertions) 与 [自动等待](https://playwright.dev/docs/actionability)：区分动作可执行与业务结果达成。
- [Playwright：隔离](https://playwright.dev/docs/browser-contexts) 与 [认证](https://playwright.dev/docs/auth)：了解 context 和状态复用的边界。
- [Playwright：视觉比较](https://playwright.dev/docs/test-snapshots)：核对基线生成、环境与差异审查。
- [Playwright：Trace Viewer](https://playwright.dev/docs/trace-viewer) 与 [重试](https://playwright.dev/docs/test-retries)：保存并分析首次失败。
- [MDN：使用 Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)：理解 HTTP 错误状态和 Promise 的区别。
