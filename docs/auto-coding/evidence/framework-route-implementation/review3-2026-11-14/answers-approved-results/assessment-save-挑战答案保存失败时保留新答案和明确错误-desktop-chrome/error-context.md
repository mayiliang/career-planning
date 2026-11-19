# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: assessment-save.spec.ts >> 挑战答案保存失败时保留新答案和明确错误
- Location: e2e/assessment-save.spec.ts:11:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 1
Received: 3
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - link "跳到主要内容" [ref=e4] [cursor=pointer]:
      - /url: "#main-content"
    - navigation "主导航" [ref=e5]:
      - list [ref=e6]:
        - listitem [ref=e7]:
          - link [ref=e8] [cursor=pointer]:
            - /url: /
            - strong [ref=e13]: 学习台
        - listitem [ref=e14]:
          - link [ref=e15] [cursor=pointer]:
            - /url: /knowledge/map
            - strong [ref=e20]: 知识体系
        - listitem [ref=e21]:
          - link [ref=e22] [cursor=pointer]:
            - /url: /notes
            - strong [ref=e27]: 笔记中心
        - listitem [ref=e28]:
          - link [ref=e29] [cursor=pointer]:
            - /url: /plan
            - strong [ref=e34]: 核心路线
        - listitem [ref=e35]:
          - link [ref=e36] [cursor=pointer]:
            - /url: /jobs
            - strong [ref=e41]: 求职支线
    - generic [ref=e42]:
      - banner [ref=e43]:
        - generic [ref=e44]: 掌握挑战
        - generic [ref=e46]:
          - button "快速查找，快捷键 Command 或 Control 加 K" [ref=e47] [cursor=pointer]
          - link "设置与数据" [ref=e50] [cursor=pointer]:
            - /url: /settings
      - main [ref=e53]:
        - paragraph [ref=e54]: 掌握挑战页面已打开
        - main [ref=e57]:
          - button "← 返回知识点" [ref=e58] [cursor=pointer]
          - generic [ref=e59]:
            - generic [ref=e60]:
              - paragraph [ref=e61]: OPTIONAL MASTERY CHALLENGE · M1
              - heading "JS-01 掌握挑战" [level=1] [ref=e62]
              - paragraph [ref=e63]: 2 个渐进任务 · 20 分 · 建议 30 分钟 · M1 首次合同
            - generic [ref=e64]:
              - generic [ref=e65]: 进行中
              - strong [ref=e66]: 建议时间 00:00
              - button "取消本次挑战" [ref=e67]
          - alert [ref=e68]: 第 1 题未保存：模拟答案保存失败。答卷尚未提交，请重试。
          - generic [ref=e69]:
            - article [ref=e70]:
              - generic [ref=e71]: "01"
              - generic [ref=e72]:
                - generic [ref=e73]:
                  - generic [ref=e74]: practice · 机试实战
                  - strong [ref=e75]: 10 分
                - paragraph [ref=e76]: 原题任务 · 本题合同
                - heading "验证题 1" [level=2] [ref=e77]
                - generic "挑战验证合同" [ref=e78]:
                  - generic [ref=e79]:
                    - generic [ref=e80]: M 阶段 / 复测
                    - paragraph [ref=e81]: M1 · 首次挑战：完成后如需复测，将以变式验证迁移能力。
                  - generic [ref=e82]:
                    - generic [ref=e83]: 否决项
                    - paragraph [ref=e84]: 本题未列出额外否决项；仍须满足题干、资料依据与验证清单。
                  - generic [ref=e85]:
                    - generic [ref=e86]: 本地 Worker 自检（非安全沙箱 / 非服务端证明）
                    - paragraph [ref=e87]: 本题不启用本地自检；将按题目合同和语义评分复核。
                - generic [ref=e88]:
                  - generic [ref=e89]: 卡住了？选择恰好够用的帮助
                  - generic [ref=e90]:
                    - button "解释题意" [ref=e91] [cursor=pointer]
                    - button "给一个提示" [ref=e92] [cursor=pointer]
                    - button "拆解步骤" [ref=e93] [cursor=pointer]
                    - button "给回答提纲" [ref=e94] [cursor=pointer]
                    - button "帮我起个头" [ref=e95] [cursor=pointer]
                    - button "看相似示例" [ref=e96] [cursor=pointer]
                    - button "查看完整思路" [ref=e97] [cursor=pointer]
                - generic [ref=e98]:
                  - generic [ref=e99]:
                    - generic [ref=e100]:
                      - generic [ref=e101]: 本地 Worker 自检区
                      - generic [ref=e102]: 非安全沙箱；结果可辅助排查，只作为 AI 上下文，不能成为服务端证明或单独决定通过。
                    - button "运行本地自检并保存记录" [ref=e103] [cursor=pointer]
                  - textbox "代码答案：第 1 题" [ref=e104]:
                    - /placeholder: 编写可在本地 Worker 自检区运行的代码；可为每个给定场景添加真实条件的 console.assert。
                    - text: 最新答案一
                  - generic [ref=e105]:
                    - text: 本地自检结果 · 尚未运行
                    - generic [ref=e106]: 尚未运行。运行后会保存有界的本地自检记录。
            - article [ref=e107]:
              - generic [ref=e108]: "02"
              - generic [ref=e109]:
                - generic [ref=e110]:
                  - generic [ref=e111]: practice · ESSAY
                  - strong [ref=e112]: 10 分
                - paragraph [ref=e113]: 原题任务 · 本题合同
                - heading "验证题 2" [level=2] [ref=e114]
                - generic "挑战验证合同" [ref=e115]:
                  - generic [ref=e116]:
                    - generic [ref=e117]: M 阶段 / 复测
                    - paragraph [ref=e118]: M1 · 首次挑战：完成后如需复测，将以变式验证迁移能力。
                  - generic [ref=e119]:
                    - generic [ref=e120]: 否决项
                    - paragraph [ref=e121]: 本题未列出额外否决项；仍须满足题干、资料依据与验证清单。
                  - generic [ref=e122]:
                    - generic [ref=e123]: 本地 Worker 自检（非安全沙箱 / 非服务端证明）
                    - paragraph [ref=e124]: 本题不启用本地自检；将按题目合同和语义评分复核。
                - generic [ref=e125]:
                  - generic [ref=e126]: 卡住了？选择恰好够用的帮助
                  - generic [ref=e127]:
                    - button "解释题意" [ref=e128] [cursor=pointer]
                    - button "给一个提示" [ref=e129] [cursor=pointer]
                    - button "拆解步骤" [ref=e130] [cursor=pointer]
                    - button "给回答提纲" [ref=e131] [cursor=pointer]
                    - button "帮我起个头" [ref=e132] [cursor=pointer]
                    - button "看相似示例" [ref=e133] [cursor=pointer]
                    - button "查看完整思路" [ref=e134] [cursor=pointer]
                - textbox "写下可以被追问、验证和复现的答案..." [ref=e135]: 最新答案二
                - generic [ref=e136]: 已保存到本地
            - generic [ref=e137]:
              - generic [ref=e138]: 已完成 2 / 2
              - button "提交并查看掌握反馈" [ref=e139] [cursor=pointer]
    - button "打开 Atlas AI 助手" [ref=e140] [cursor=pointer]:
      - generic [aria-hidden] [ref=e141]: ✦
  - dialog [ref=e143]:
    - banner [ref=e144]:
      - generic [ref=e145]: ✓
      - generic [ref=e146]:
        - paragraph [ref=e147]: CONFIRM ACTION
        - heading "提交本次掌握挑战？" [level=2] [ref=e148]
        - generic [ref=e149]: 提交后答案将锁定，系统会逐题分析并给出下一步建议。
      - button "关闭" [ref=e150] [cursor=pointer]: ×
    - contentinfo [ref=e151]:
      - button "取消" [ref=e152] [cursor=pointer]
      - button "提交并生成反馈" [active] [ref=e153] [cursor=pointer]
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
  11 |   test(`挑战${failure === 'save' ? '答案保存' : '评分'}失败时保留新答案和明确错误`, async ({ page, browser }, testInfo) => {
  12 |     await page.setViewportSize(failure === 'save' ? { width: 390, height: 844 } : { width: 1280, height: 720 });
  13 |     let status = 'IN_PROGRESS';
  14 |     let lockCount = 0;
  15 |     let gradeCount = 0;
  16 |     const events: Array<{ event: string; content?: string; id?: string }> = [];
  17 |     let navigations = 0;
  18 |     page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations += 1; });
  19 |     const session = () => ({
  20 |       id: sessionId, knowledgePointCode: 'JS-01', assessmentType: 'FIRST', status, durationMinutes: 30,
  21 |       masteryStage: 1, challengeMode: 'THEORY', challengeProfile: 'THEORY_ONLY', assistanceLevel: 0,
  22 |       startedAt: now, submittedAt: null, gradedAt: null, resultId: null, provider: 'fake', model: 'test', createdAt: now, updatedAt: now,
  23 |     });
  24 |     const answer = (questionId: string, content: string) => ({
  25 |       id: questionId, sessionId, questionId, answerContent: content, deterministicResult: null,
  26 |       answeredAt: now, createdAt: now, updatedAt: now,
  27 |     });
  28 |     await page.route('**/api/v1/assessments/**', async route => {
  29 |       const path = new URL(route.request().url()).pathname;
  30 |       if (path.endsWith('/grade/stream')) {
  31 |         events.push({ event: 'grade-error' });
  32 |         gradeCount += 1;
  33 |         status = 'ERROR';
  34 |         await route.fulfill({ contentType: 'text/event-stream', body: 'event: error\ndata: {"message":"模拟模型连接失败"}\n\n' });
  35 |       } else if (path.endsWith('/submit')) {
  36 |         events.push({ event: 'submit' });
  37 |         lockCount += 1;
  38 |         status = 'SUBMITTED';
  39 |         await route.fulfill({ json: { data: session(), meta: { requestId: 'submit' } } });
  40 |       } else if (route.request().method() === 'PUT') {
  41 |         const id = path.split('/').pop()!;
  42 |         events.push({ event: 'save', id, content: route.request().postDataJSON().answerContent });
  43 |         if (failure === 'save' && id === firstId) {
  44 |           await route.fulfill({ status: 500, json: { error: { code: 'SAVE_FAILED', message: '模拟答案保存失败', retryable: false }, meta: { requestId: 'failed-save' } } });
  45 |         } else {
  46 |           const body = route.request().postDataJSON() as { answerContent: string };
  47 |           await route.fulfill({ json: { data: answer(id, body.answerContent), meta: { requestId: 'saved' } } });
  48 |         }
  49 |       } else {
  50 |         events.push({ event: 'load' });
  51 |         await route.fulfill({ json: { data: {
  52 |           session: session(),
  53 |           questions: [firstId, secondId].map((id, orderIndex) => ({
  54 |             id, sessionId, questionType: orderIndex === 0 ? 'CODE_WRITE' : 'ESSAY', dimension: 'practice',
  55 |             questionContent: JSON.stringify({ question: `验证题 ${orderIndex + 1}` }), maxScore: 10, orderIndex, createdAt: now,
  56 |           })),
  57 |           // 刷新故意返回旧副本，验证它不会覆盖用户刚编辑的内容。
  58 |           answers: [answer(firstId, '旧答案一'), answer(secondId, '旧答案二')],
  59 |         }, meta: { requestId: 'loaded' } } });
  60 |       }
  61 |     });
  62 |     await page.goto(`/assessment/${sessionId}`);
  63 |     const first = page.getByLabel('代码答案：第 1 题');
  64 |     const second = page.getByPlaceholder('写下可以被追问、验证和复现的答案...');
  65 |     await first.fill('最新答案一');
  66 |     await second.fill('最新答案二');
  67 |     const submit = page.getByRole('button', { name: '提交并查看掌握反馈' });
  68 |     await submit.scrollIntoViewIfNeeded();
  69 |     const submitBox = (await submit.boundingBox())!;
  70 |     const launcherBox = (await page.locator('.assistant-launcher').boundingBox())!;
  71 |     expect(submitBox.y + submitBox.height).toBeLessThanOrEqual(launcherBox.y);
  72 |     const evidence = new URL('../../../tmp/async-repair-evidence/', import.meta.url);
  73 |     await mkdir(evidence, { recursive: true });
  74 |     await page.screenshot({ path: fileURLToPath(new URL(`assessment-${failure}.png`, evidence)) });
  75 |     await writeFile(new URL(`assessment-${failure}.json`, evidence), JSON.stringify({ browser: browser.version(), viewport: page.viewportSize(), path: `/assessment/${sessionId}`, submitBox, launcherBox }, null, 2));
  76 |     await expect(first).toHaveValue('最新答案一');
  77 |     await expect(second).toHaveValue('最新答案二');
  78 |     await submit.click();
  79 |     await page.getByRole('button', { name: '提交并生成反馈', exact: true }).click();
  80 |     await expect(page.getByRole('alert')).toContainText(failure === 'save' ? '答卷尚未提交' : '模拟模型连接失败');
  81 |     await expect(first).toHaveValue('最新答案一');
  82 |     await expect(second).toHaveValue('最新答案二');
  83 |     expect(lockCount).toBe(failure === 'save' ? 0 : 1);
  84 |     expect(gradeCount).toBe(failure === 'save' ? 0 : 1);
> 85 |     expect(navigations).toBe(1);
     |                         ^ Error: expect(received).toBe(expected) // Object.is equality
  86 |     expect(events.filter(event => event.event === 'save').every(event => event.content === (event.id === firstId ? '最新答案一' : '最新答案二'))).toBe(true);
  87 |     if (failure === 'grade') expect(events.slice(-3).map(event => event.event)).toEqual(['submit', 'grade-error', 'load']);
  88 |     await testInfo.attach('answer-events', { body: JSON.stringify(events, null, 2), contentType: 'application/json' });
  89 |     await page.screenshot({ path: testInfo.outputPath(`assessment-${failure}-after.png`) });
  90 |     await testInfo.attach('page-metadata', { body: JSON.stringify({ browser: browser.version(), viewport: page.viewportSize(), url: page.url(), navigations }), contentType: 'application/json' });
  91 |     if (failure === 'save') await expect(first).toBeEnabled();
  92 |   });
  93 | }
  94 | 
```