import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AssessmentSessionSchema, AssessmentCreationResponseSchema, AssessmentDetailSchema,
  AssessmentAnswerSchema, AssessmentResultSchema, AssessmentGradeResponseSchema, AssessmentRegradeResponseSchema,
} from '@career-atlas/shared';
import { rawDb } from '../../db/index.js';
import { executeImport } from '../../services/import.service.js';
import { configureHttpContract } from '../contract.js';
import { assessmentRoutes } from './assessment.js';

// 只替换外部模型；路由、业务状态机、DTO 和 SQLite 持久化均使用真实实现。
vi.mock('../../ai/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../ai/index.js')>();
  return { ...actual, createProvider: () => new actual.FakeProvider({ responseType: 'excellent' }) };
});

const StrictGradeSchema = AssessmentGradeResponseSchema.extend({
  session: AssessmentSessionSchema.strict(), result: AssessmentResultSchema.strict(),
}).strict();
const StrictRegradeSchema = AssessmentRegradeResponseSchema.extend({ result: AssessmentResultSchema.strict() }).strict();

function doneGrade(body: string): unknown {
  const events = body.split('\n\n').filter(Boolean);
  expect(events.some(event => event.startsWith('event: error\n')), body).toBe(false);
  const done = events.filter(event => event.startsWith('event: done\n'));
  expect(done, body).toHaveLength(1);
  return (JSON.parse(done[0]!.split('\ndata: ')[1]!) as { grade: unknown }).grade;
}

describe('掌握挑战公开响应合同', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await executeImport();
    app = Fastify({ logger: false });
    configureHttpContract(app);
    app.register(assessmentRoutes);
    await app.ready();
  });

  beforeEach(() => {
    rawDb.prepare("DELETE FROM assessment_sessions WHERE knowledge_point_code = 'JS-01'").run();
    rawDb.prepare("UPDATE knowledge_points SET learning_state = 'LEARNED', mastery_level = 0, mastered_at = NULL WHERE code = 'JS-01'").run();
  });

  afterAll(async () => {
    rawDb.prepare("DELETE FROM assessment_sessions WHERE knowledge_point_code = 'JS-01'").run();
    await app.close();
  });

  async function createAnsweredSession() {
    const created = await app.inject({ method: 'POST', url: '/api/v1/assessments', payload: {
      knowledgePointCode: 'JS-01', type: 'FIRST', durationMinutes: 30,
    } });
    expect(created.statusCode, created.body).toBe(200);
    const session = AssessmentCreationResponseSchema.strict().parse(created.json().data);
    expect(session.startedAt).toBeNull();
    expect(session.resultId).toBeNull();
    const url = `/api/v1/assessments/${session.id}`;
    const started = await app.inject({ method: 'POST', url: `${url}/start` });
    expect(AssessmentSessionSchema.strict().parse(started.json().data).status).toBe('IN_PROGRESS');
    const detail = AssessmentDetailSchema.parse((await app.inject({ method: 'GET', url })).json().data);
    for (const question of detail.questions) {
      const saved = await app.inject({ method: 'PUT', url: `${url}/answers/${question.id}`, payload: { answerContent: '逐题作答与证据。' } });
      const answer = AssessmentAnswerSchema.strict().parse(saved.json().data);
      expect(answer.deterministicResult).toBeNull();
    }
    return url;
  }

  async function submitSession() {
    const url = await createAnsweredSession();
    const submitted = await app.inject({ method: 'POST', url: `${url}/submit` });
    expect(AssessmentSessionSchema.strict().parse(submitted.json().data).status).toBe('SUBMITTED');
    return url;
  }

  it('创建、开始、作答、查询和取消符合共享合同，空字段明确为 null', async () => {
    const url = await createAnsweredSession();
    const detail = (await app.inject({ method: 'GET', url })).json().data;
    expect(AssessmentSessionSchema.strict().parse(detail.session).status).toBe('IN_PROGRESS');
    expect(AssessmentDetailSchema.parse(detail).answers).toHaveLength(5);
    const canceled = await app.inject({ method: 'POST', url: `${url}/cancel` });
    expect(AssessmentSessionSchema.strict().parse(canceled.json().data).status).toBe('CANCELLED');
  });

  it('流式首评与普通首评、结果查询返回相同公开字段，内部审计记录仍保存在数据库', async () => {
    const url = await submitSession();
    const response = await app.inject({ method: 'POST', url: `${url}/grade/stream` });
    expect(response.headers['content-type']).toContain('text/event-stream');
    const streamed = StrictGradeSchema.parse(doneGrade(response.body));
    const cached = StrictGradeSchema.parse((await app.inject({ method: 'POST', url: `${url}/grade` })).json().data);
    expect(streamed.session).toEqual(cached.session);
    expect(streamed.result).toEqual(cached.result);
    const fetched = (await app.inject({ method: 'GET', url: `${url}/result` })).json().data;
    expect(AssessmentResultSchema.strict().parse(fetched)).toEqual(streamed.result);
    const stored = rawDb.prepare('SELECT ai_raw_response AS raw, server_calculated_total AS total FROM assessment_results WHERE id = ?')
      .get(streamed.result.id) as { raw: string; total: number };
    expect(stored.raw.length).toBeGreaterThan(0);
    expect(stored.total).toBe(streamed.result.totalScore);
  });

  it('普通重评和流式重评使用同一响应结构，不额外返回内部会话和模型记录', async () => {
    const url = await submitSession();
    await app.inject({ method: 'POST', url: `${url}/grade` });
    const normal = StrictRegradeSchema.parse((await app.inject({ method: 'POST', url: `${url}/regrade` })).json().data);
    const response = await app.inject({ method: 'POST', url: `${url}/regrade/stream` });
    const streamed = StrictRegradeSchema.parse(doneGrade(response.body));
    expect(Object.keys(streamed).sort()).toEqual(Object.keys(normal).sort());
    expect(Object.keys(streamed.result).sort()).toEqual(Object.keys(normal.result).sort());
    expect(streamed.result.id).not.toBe(normal.result.id);
    expect(streamed.result.sessionId).toBe(normal.result.sessionId);
    expect(AssessmentResultSchema.strict().parse((await app.inject({ method: 'GET', url: `${url}/result` })).json().data)).toEqual(streamed.result);
  });
});
