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
Error: page.goto: Test timeout of 30000ms exceeded.
Call log:
  - navigating to "http://127.0.0.1:42731/knowledge/PERF-04?tab=notes", waiting until "load"

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
> 35 |   await page.goto(`/knowledge/${oldCode}?tab=notes`);
     |              ^ Error: page.goto: Test timeout of 30000ms exceeded.
  36 |   await expect(page.getByLabel('Markdown 原始笔记')).toHaveValue('旧原文');
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