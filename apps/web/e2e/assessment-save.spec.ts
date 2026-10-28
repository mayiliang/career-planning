import { expect, test } from '@playwright/test';

const sessionId = '00000000-0000-4000-8000-000000000011';
const firstId = '00000000-0000-4000-8000-000000000012';
const secondId = '00000000-0000-4000-8000-000000000013';
const now = '2026-10-13T00:00:00Z';

for (const failure of ['save', 'grade'] as const) {
  test(`挑战${failure === 'save' ? '答案保存' : '评分'}失败时保留新答案和明确错误`, async ({ page }) => {
    let status = 'IN_PROGRESS';
    let lockCount = 0;
    let gradeCount = 0;
    const session = () => ({
      id: sessionId, knowledgePointCode: 'JS-01', assessmentType: 'FIRST', status, durationMinutes: 30,
      masteryStage: 1, challengeMode: 'THEORY', challengeProfile: 'THEORY_ONLY', assistanceLevel: 0,
      startedAt: now, submittedAt: null, gradedAt: null, resultId: null, provider: 'fake', model: 'test', createdAt: now, updatedAt: now,
    });
    const answer = (questionId: string, content: string) => ({
      id: questionId, sessionId, questionId, answerContent: content, deterministicResult: null,
      answeredAt: now, createdAt: now, updatedAt: now,
    });
    await page.route('**/api/v1/assessments/**', async route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/grade/stream')) {
        gradeCount += 1;
        status = 'ERROR';
        await route.fulfill({ contentType: 'text/event-stream', body: 'event: error\ndata: {"message":"模拟模型连接失败"}\n\n' });
      } else if (path.endsWith('/submit')) {
        lockCount += 1;
        status = 'SUBMITTED';
        await route.fulfill({ json: { data: session(), meta: { requestId: 'submit' } } });
      } else if (route.request().method() === 'PUT') {
        const id = path.split('/').pop()!;
        if (failure === 'save' && id === firstId) {
          await route.fulfill({ status: 500, json: { error: { code: 'SAVE_FAILED', message: '模拟答案保存失败', retryable: false }, meta: { requestId: 'failed-save' } } });
        } else {
          const body = route.request().postDataJSON() as { answerContent: string };
          await route.fulfill({ json: { data: answer(id, body.answerContent), meta: { requestId: 'saved' } } });
        }
      } else {
        await route.fulfill({ json: { data: {
          session: session(),
          questions: [firstId, secondId].map((id, orderIndex) => ({
            id, sessionId, questionType: orderIndex === 0 ? 'CODE_WRITE' : 'ESSAY', dimension: 'practice',
            questionContent: JSON.stringify({ question: `验证题 ${orderIndex + 1}` }), maxScore: 10, orderIndex, createdAt: now,
          })),
          // 刷新故意返回旧副本，验证它不会覆盖用户刚编辑的内容。
          answers: [answer(firstId, '旧答案一'), answer(secondId, '旧答案二')],
        }, meta: { requestId: 'loaded' } } });
      }
    });
    await page.goto(`/assessment/${sessionId}`);
    const first = page.getByLabel('代码答案：第 1 题');
    const second = page.getByPlaceholder('写下可以被追问、验证和复现的答案...');
    await first.fill('最新答案一');
    await second.fill('最新答案二');
    await page.getByRole('button', { name: '提交并查看掌握反馈' }).click();
    await page.getByRole('button', { name: '提交并生成反馈', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText(failure === 'save' ? '答卷尚未提交' : '模拟模型连接失败');
    await expect(first).toHaveValue('最新答案一');
    await expect(second).toHaveValue('最新答案二');
    expect(lockCount).toBe(failure === 'save' ? 0 : 1);
    expect(gradeCount).toBe(failure === 'save' ? 0 : 1);
    if (failure === 'save') await expect(first).toBeEnabled();
  });
}
