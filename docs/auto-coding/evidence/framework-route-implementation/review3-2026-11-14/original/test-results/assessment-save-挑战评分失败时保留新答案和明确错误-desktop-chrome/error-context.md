# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: assessment-save.spec.ts >> 挑战评分失败时保留新答案和明确错误
- Location: e2e/assessment-save.spec.ts:11:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: expect(locator).toHaveValue(expected) failed

Locator:  getByLabel('代码答案：第 1 题')
Expected: "最新答案一"
Received: "旧答案一"
Timeout:  5000ms

Call log:
  - Expect "toHaveValue" getByLabel('代码答案：第 1 题') with timeout 5000ms
  - waiting for getByLabel('代码答案：第 1 题')
    13 × locator resolved to <textarea disabled rows="13" data-v-e52121b9="" aria-label="代码答案：第 1 题" placeholder="编写可在本地 Worker 自检区运行的代码；可为每个给定场景添加真实条件的 console.assert。"></textarea>
       - unexpected value "旧答案一"

```

```yaml
- textbox "代码答案：第 1 题" [disabled]:
  - /placeholder: 编写可在本地 Worker 自检区运行的代码；可为每个给定场景添加真实条件的 console.assert。
  - text: 旧答案一
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | import { mkdir, writeFile } from 'node:fs/promises';
  3  | import { fileURLToPath } from 'node:url';
  4  | 
  5  | const sessionId = '00000000-0000-4000-8000-000000000011';
  6  | const firstId = '00000000-0000-4000-8000-000000000012';
  7  | const secondId = '00000000-0000-4000-8000-000000000013';
  8  | const now = '2026-10-13T00:00:00Z';
  9  | 
  10 | for (const failure of ['save', 'grade'] as const) {
  11 |   test(`挑战${failure === 'save' ? '答案保存' : '评分'}失败时保留新答案和明确错误`, async ({ page, browser }) => {
  12 |     await page.setViewportSize(failure === 'save' ? { width: 390, height: 844 } : { width: 1280, height: 720 });
  13 |     let status = 'IN_PROGRESS';
  14 |     let lockCount = 0;
  15 |     let gradeCount = 0;
  16 |     const session = () => ({
  17 |       id: sessionId, knowledgePointCode: 'JS-01', assessmentType: 'FIRST', status, durationMinutes: 30,
  18 |       masteryStage: 1, challengeMode: 'THEORY', challengeProfile: 'THEORY_ONLY', assistanceLevel: 0,
  19 |       startedAt: now, submittedAt: null, gradedAt: null, resultId: null, provider: 'fake', model: 'test', createdAt: now, updatedAt: now,
  20 |     });
  21 |     const answer = (questionId: string, content: string) => ({
  22 |       id: questionId, sessionId, questionId, answerContent: content, deterministicResult: null,
  23 |       answeredAt: now, createdAt: now, updatedAt: now,
  24 |     });
  25 |     await page.route('**/api/v1/assessments/**', async route => {
  26 |       const path = new URL(route.request().url()).pathname;
  27 |       if (path.endsWith('/grade/stream')) {
  28 |         gradeCount += 1;
  29 |         status = 'ERROR';
  30 |         await route.fulfill({ contentType: 'text/event-stream', body: 'event: error\ndata: {"message":"模拟模型连接失败"}\n\n' });
  31 |       } else if (path.endsWith('/submit')) {
  32 |         lockCount += 1;
  33 |         status = 'SUBMITTED';
  34 |         await route.fulfill({ json: { data: session(), meta: { requestId: 'submit' } } });
  35 |       } else if (route.request().method() === 'PUT') {
  36 |         const id = path.split('/').pop()!;
  37 |         if (failure === 'save' && id === firstId) {
  38 |           await route.fulfill({ status: 500, json: { error: { code: 'SAVE_FAILED', message: '模拟答案保存失败', retryable: false }, meta: { requestId: 'failed-save' } } });
  39 |         } else {
  40 |           const body = route.request().postDataJSON() as { answerContent: string };
  41 |           await route.fulfill({ json: { data: answer(id, body.answerContent), meta: { requestId: 'saved' } } });
  42 |         }
  43 |       } else {
  44 |         await route.fulfill({ json: { data: {
  45 |           session: session(),
  46 |           questions: [firstId, secondId].map((id, orderIndex) => ({
  47 |             id, sessionId, questionType: orderIndex === 0 ? 'CODE_WRITE' : 'ESSAY', dimension: 'practice',
  48 |             questionContent: JSON.stringify({ question: `验证题 ${orderIndex + 1}` }), maxScore: 10, orderIndex, createdAt: now,
  49 |           })),
  50 |           // 刷新故意返回旧副本，验证它不会覆盖用户刚编辑的内容。
  51 |           answers: [answer(firstId, '旧答案一'), answer(secondId, '旧答案二')],
  52 |         }, meta: { requestId: 'loaded' } } });
  53 |       }
  54 |     });
  55 |     await page.goto(`/assessment/${sessionId}`);
  56 |     const first = page.getByLabel('代码答案：第 1 题');
  57 |     const second = page.getByPlaceholder('写下可以被追问、验证和复现的答案...');
  58 |     await first.fill('最新答案一');
  59 |     await second.fill('最新答案二');
  60 |     const submit = page.getByRole('button', { name: '提交并查看掌握反馈' });
  61 |     await submit.scrollIntoViewIfNeeded();
  62 |     const submitBox = (await submit.boundingBox())!;
  63 |     const launcherBox = (await page.locator('.assistant-launcher').boundingBox())!;
  64 |     expect(submitBox.y + submitBox.height).toBeLessThanOrEqual(launcherBox.y);
  65 |     const evidence = new URL('../../../tmp/async-repair-evidence/', import.meta.url);
  66 |     await mkdir(evidence, { recursive: true });
  67 |     await page.screenshot({ path: fileURLToPath(new URL(`assessment-${failure}.png`, evidence)) });
  68 |     await writeFile(new URL(`assessment-${failure}.json`, evidence), JSON.stringify({ browser: browser.version(), viewport: page.viewportSize(), path: `/assessment/${sessionId}`, submitBox, launcherBox }, null, 2));
  69 |     await submit.click();
  70 |     await page.getByRole('button', { name: '提交并生成反馈', exact: true }).click();
  71 |     await expect(page.getByRole('alert')).toContainText(failure === 'save' ? '答卷尚未提交' : '模拟模型连接失败');
> 72 |     await expect(first).toHaveValue('最新答案一');
     |                         ^ Error: expect(locator).toHaveValue(expected) failed
  73 |     await expect(second).toHaveValue('最新答案二');
  74 |     expect(lockCount).toBe(failure === 'save' ? 0 : 1);
  75 |     expect(gradeCount).toBe(failure === 'save' ? 0 : 1);
  76 |     if (failure === 'save') await expect(first).toBeEnabled();
  77 |   });
  78 | }
  79 | 
```