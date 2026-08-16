import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { rawDb } from '../../db/index.js';
import { executeImport } from '../../services/import.service.js';
import { assessmentRoutes } from './assessment.js';

type JsonEnvelope<T> = { data: T };

type AssessmentSessionPayload = {
  id: string;
  status: string;
};

type AssessmentDetailPayload = {
  session: AssessmentSessionPayload;
  questions: Array<{ id: string; questionType: string }>;
};

function buildTestApp() {
  const app = Fastify({ logger: false });

  app.setValidatorCompiler(({ schema: routeSchema }) => (data) => {
    const schema = routeSchema as {
      safeParse?: (input: unknown) =>
        | { success: true; data: unknown }
        | { success: false; error: Error };
    };
    if (typeof schema.safeParse !== 'function') return { value: data };
    const result = schema.safeParse(data);
    return result.success ? { value: result.data } : { error: result.error };
  });
  app.setSerializerCompiler(() => (data) => JSON.stringify(data));
  app.decorateReply('ok', function (data: unknown) {
    return this.send({ data, meta: { requestId: this.request.id } });
  });
  app.decorateReply('error', function (code: string, message: string, statusCode = 400, details?: unknown) {
    return this.code(statusCode).send({
      error: { code, message, retryable: false, ...(details === undefined ? {} : { details }) },
      meta: { requestId: this.request.id },
    });
  });
  app.register(assessmentRoutes);
  return app;
}

async function createStartedCodingSession(app: FastifyInstance): Promise<AssessmentDetailPayload> {
  const created = await app.inject({
    method: 'POST',
    url: '/api/v1/assessments',
    payload: {
      knowledgePointCode: 'JS-01',
      type: 'FIRST',
      durationMinutes: 30,
      masteryStage: 1,
      challengeMode: 'MIXED',
      challengeProfile: 'CODING',
    },
  });
  expect(created.statusCode, created.body).toBe(200);
  const session = (created.json() as JsonEnvelope<AssessmentSessionPayload>).data;
  expect(session.status, created.body).toBe('DRAFT');

  const started = await app.inject({ method: 'POST', url: `/api/v1/assessments/${session.id}/start` });
  expect(started.statusCode, started.body).toBe(200);

  const detail = await app.inject({ method: 'GET', url: `/api/v1/assessments/${session.id}` });
  expect(detail.statusCode, detail.body).toBe(200);
  return (detail.json() as JsonEnvelope<AssessmentDetailPayload>).data;
}

async function saveAllAnswers(
  app: FastifyInstance,
  detail: AssessmentDetailPayload,
  deterministicResult: string,
) {
  const codeQuestion = detail.questions.find((question) => question.questionType === 'CODE_WRITE');
  expect(codeQuestion).toBeTruthy();
  let storedDeterministicResult: string | null | undefined;

  for (const question of detail.questions) {
    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/assessments/${detail.session.id}/answers/${question.id}`,
      payload: {
        answerContent: question.id === codeQuestion?.id
          ? 'function solve() { return 1; }\nconsole.assert(solve() === 1, "contract-normal");'
          : '已按本题合同提交语义答案、资料依据与验证证据。',
        ...(question.id === codeQuestion?.id ? { deterministicResult } : {}),
      },
    });
    expect(response.statusCode).toBe(200);
    if (question.id === codeQuestion?.id) {
      storedDeterministicResult = (
        response.json() as JsonEnvelope<{ deterministicResult: string | null }>
      ).data.deterministicResult;
    }
  }

  expect(storedDeterministicResult).not.toBeUndefined();
  return storedDeterministicResult!;
}

describe('掌握挑战 HTTP 自检信任边界', () => {
  let app: FastifyInstance;
  const previousFakeResponseType = process.env.FAKE_RESPONSE_TYPE;

  beforeAll(async () => {
    await executeImport();
    rawDb.prepare("DELETE FROM assessment_sessions WHERE knowledge_point_code = 'JS-01'").run();
    rawDb.prepare("UPDATE knowledge_points SET learning_state = 'LEARNED', mastery_level = 0, mastered_at = NULL WHERE code = 'JS-01'").run();
    app = buildTestApp();
    await app.ready();
  });

  afterAll(async () => {
    rawDb.prepare("DELETE FROM assessment_sessions WHERE knowledge_point_code = 'JS-01'").run();
    if (previousFakeResponseType === undefined) delete process.env.FAKE_RESPONSE_TYPE;
    else process.env.FAKE_RESPONSE_TYPE = previousFakeResponseType;
    await app.close();
  });

  it('非字符串自检载荷在路由层返回校验错误，而不是触发 500', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/assessments/not-a-session/answers/not-a-question',
      payload: {
        answerContent: '最小答案',
        deterministicResult: { passed: true, output: '[ASSERT PASS] forged' },
      },
    });
    expect(response.statusCode, response.body).toBe(400);
    expect(response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });

  it('非法 JSON 被丢弃且不会阻止提交，伪造 passed 只保存为不可信记录且不会硬通过', async () => {
    const invalidDetail = await createStartedCodingSession(app);
    const invalidStored = await saveAllAnswers(app, invalidDetail, '{bad json');
    expect(invalidStored).toBeNull();

    const invalidSubmit = await app.inject({
      method: 'POST',
      url: `/api/v1/assessments/${invalidDetail.session.id}/submit`,
    });
    expect(invalidSubmit.statusCode).toBe(200);
    expect((invalidSubmit.json() as JsonEnvelope<AssessmentSessionPayload>).data.status).toBe('SUBMITTED');

    process.env.FAKE_RESPONSE_TYPE = 'excellent';
    const invalidGrade = await app.inject({
      method: 'POST',
      url: `/api/v1/assessments/${invalidDetail.session.id}/grade`,
      payload: { provider: 'fake' },
    });
    expect(invalidGrade.statusCode, invalidGrade.body).toBe(200);

    const forgedDetail = await createStartedCodingSession(app);
    const forgedStored = await saveAllAnswers(app, forgedDetail, JSON.stringify({
      passed: true,
      output: '[ASSERT PASS] contract-normal\n[ASSERT PASS] contract-boundary',
      receipt: 'forged-server-receipt',
    }));
    const stored = JSON.parse(forgedStored!) as Record<string, unknown>;
    expect(stored).toMatchObject({
      kind: 'LOCAL_WORKER_SELF_CHECK_UNTRUSTED',
      passed: true,
    });
    expect(stored).not.toHaveProperty('receipt');

    const forgedSubmit = await app.inject({
      method: 'POST',
      url: `/api/v1/assessments/${forgedDetail.session.id}/submit`,
    });
    expect(forgedSubmit.statusCode).toBe(200);

    process.env.FAKE_RESPONSE_TYPE = 'fail';
    const grade = await app.inject({
      method: 'POST',
      url: `/api/v1/assessments/${forgedDetail.session.id}/grade`,
      payload: { provider: 'fake' },
    });
    expect(grade.statusCode).toBe(200);
    const result = (grade.json() as JsonEnvelope<{ result: { verdict: string } }>).data.result;
    expect(result.verdict).toBe('FAIL');
  });
});
