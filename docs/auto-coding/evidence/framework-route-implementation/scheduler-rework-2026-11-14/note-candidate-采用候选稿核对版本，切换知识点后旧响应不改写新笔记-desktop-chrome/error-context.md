# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: note-candidate.spec.ts >> 采用候选稿核对版本，切换知识点后旧响应不改写新笔记
- Location: e2e/note-candidate.spec.ts:3:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: expect(locator).toHaveValue(expected) failed

Locator: getByLabel('Markdown 原始笔记')
Expected: "旧原文"
Error: element(s) not found

Call log:
  - Expect "toHaveValue" getByLabel('Markdown 原始笔记') with timeout 5000ms
  - waiting for getByLabel('Markdown 原始笔记')
  - Protocol error (Runtime.callFunctionOn): Internal server error, session closed.

```

```yaml
- link "跳到主要内容":
  - /url: "#main-content"
- navigation "主导航":
  - text: Career Atlas
  - paragraph: AI 时代前端能力地图
  - paragraph: 我的工作空间
  - list:
    - listitem:
      - link "学习台":
        - /url: /
        - strong: 学习台
    - listitem:
      - link "知识体系":
        - /url: /knowledge/map
        - strong: 知识体系
    - listitem:
      - link "笔记中心":
        - /url: /notes
        - strong: 笔记中心
    - listitem:
      - link "核心路线":
        - /url: /plan
        - strong: 核心路线
    - listitem:
      - link "求职支线":
        - /url: /jobs
        - strong: 求职支线
  - link "设置与数据":
    - /url: /settings
    - strong: 设置与数据
  - strong: 服务正常
  - text: 本地优先 · 自主学习
- banner:
  - button "收起侧栏" [expanded]
  - text: 工作空间
  - button "快速查找，快捷键 Command 或 Control 加 K": 搜索知识点、页面… ⌘ K
- main:
  - paragraph: Career Atlas页面已打开
- button "打开 Atlas AI 助手":
  - strong: Atlas AI
  - text: 总结 · 解释 · 查资料
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | 
  3  | test('采用候选稿核对版本，切换知识点后旧响应不改写新笔记', async ({ page }) => {
  4  |   const oldCode = 'PERF-04';
  5  |   const newCode = 'H5-01';
  6  |   const now = '2026-10-13T00:00:00Z';
  7  |   const candidate = {
  8  |     id: 'candidate-note', knowledgePointCode: oldCode, pointTitle: '旧笔记', domainCode: '07', domainTitle: '测试',
  9  |     originalMd: '旧原文', organizedMd: '旧候选稿', activeVersionSource: 'ORIGINAL', activeMd: '旧原文', aiReview: null,
  10 |     createdAt: now, updatedAt: now, routeOrder: 1,
  11 |     versions: [{ id: 'reviewed-draft-id', versionNo: 2, source: 'AI_DRAFT', changeSummary: null, createdAt: now }],
  12 |   };
  13 |   let release!: () => void;
  14 |   let begin!: () => void;
  15 |   let finish!: () => void;
  16 |   const delayed = new Promise<void>(resolve => { release = resolve; });
  17 |   const started = new Promise<void>(resolve => { begin = resolve; });
  18 |   const finished = new Promise<void>(resolve => { finish = resolve; });
  19 |   await page.route('**/api/v1/notes/**', async route => {
  20 |     if (route.request().url().endsWith('/accept-organized')) {
  21 |       expect(route.request().postDataJSON()).toEqual({ expectedDraftVersionId: 'reviewed-draft-id' });
  22 |       begin();
  23 |       await delayed;
  24 |       try { await route.fulfill({ json: { data: { ...candidate, activeMd: '旧候选稿', activeVersionSource: 'ORGANIZED' }, meta: { requestId: 'accept-old' } } }); }
  25 |       finally { finish(); }
  26 |       return;
  27 |     }
  28 |     const code = new URL(route.request().url()).pathname.split('/').pop();
  29 |     const data = code === oldCode ? candidate : {
  30 |       ...candidate, id: 'new-note', knowledgePointCode: newCode, originalMd: '新知识点原文',
  31 |       organizedMd: null, activeMd: '新知识点原文', versions: [],
  32 |     };
  33 |     await route.fulfill({ json: { data, meta: { requestId: String(code) } } });
  34 |   });
  35 |   await page.goto(`/knowledge/${oldCode}?tab=notes`);
> 36 |   await expect(page.getByLabel('Markdown 原始笔记')).toHaveValue('旧原文');
     |                                                  ^ Error: expect(locator).toHaveValue(expected) failed
  37 |   await page.getByRole('button', { name: '采用为阅读版本' }).click();
  38 |   await started;
  39 |   await page.evaluate(path => {
  40 |     window.history.pushState({}, '', path);
  41 |     window.dispatchEvent(new PopStateEvent('popstate'));
  42 |   }, `/knowledge/${newCode}?tab=notes`);
  43 |   await expect(page.getByLabel('Markdown 原始笔记')).toHaveValue('新知识点原文');
  44 |   release();
  45 |   await finished;
  46 |   await expect(page.getByLabel('Markdown 原始笔记')).toHaveValue('新知识点原文');
  47 |   await expect(page.getByRole('button', { name: '采用为阅读版本' })).toHaveCount(0);
  48 |   await expect(page.getByText('已将整理稿设为阅读版本；原始笔记和全部版本仍然保留')).toHaveCount(0);
  49 | });
  50 | 
```