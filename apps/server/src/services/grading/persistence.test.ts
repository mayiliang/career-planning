import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { db, rawDb } from '../../db/index.js';
import { assessmentSessions, assessmentQuestions, assessmentAnswers } from '../../db/schema.js';
import type { AIResponse, GradingRequest } from '../../ai/provider.js';
import { executeImport } from '../import.service.js';
import { gradeAssessment, regradeAssessment } from '../grading.service.js';
import { prepareGrading, recoverInterruptedGradings } from './persistence.js';

const grade = vi.hoisted(() => vi.fn());
vi.mock('../../ai/index.js', () => ({ createProvider: () => ({ grade }) }));

function responseFor(request: GradingRequest): AIResponse {
  return {
    rawContent: 'controlled grading response', parseSuccess: true,
    usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 }, provider: 'fake', model: 'test', responseTime: 1,
    parsedOutput: {
      schemaVersion: '1.0', knowledgePointId: request.knowledgePointCode, assessmentType: request.assessmentType,
      dimensionScores: { principlesAndBoundaries: 25, practice: 35, troubleshootingAndDesign: 25, projectCommunication: 15 },
      confidence: 0.95, findings: [], criticalFailures: [], weaknesses: [], recommendedVerdict: 'PASS',
      feedback: {
        summary: '通过', whatWasStrong: [], whatMustImprove: [], suggestedRetestFocus: [],
        questionReviews: request.questions.map(question => ({
          questionId: question.id, score: question.maxScore, maxScore: question.maxScore,
          correctParts: [], incorrectParts: [], missingParts: [], referenceAnswer: '参考答案', sourceBasis: [], nextAction: '继续学习',
        })),
      },
    },
  };
}

function createSubmittedSession() {
  const id = randomUUID();
  const now = new Date().toISOString();
  db.insert(assessmentSessions).values({ id, knowledgePointCode: 'JS-01', assessmentType: 'FIRST', status: 'SUBMITTED', durationMinutes: 30, masteryStage: 3, createdAt: now, updatedAt: now }).run();
  const dimensions = [
    ['principlesAndBoundaries', 25], ['practice', 35], ['troubleshootingAndDesign', 25], ['projectCommunication', 15],
  ] as const;
  dimensions.forEach(([dimension, maxScore], orderIndex) => {
    const questionId = randomUUID();
    db.insert(assessmentQuestions).values({ id: questionId, sessionId: id, questionType: 'ESSAY', dimension, maxScore, orderIndex, questionContent: '{}', createdAt: now }).run();
    db.insert(assessmentAnswers).values({ id: randomUUID(), sessionId: id, questionId, answerContent: '原始答卷', answeredAt: now, createdAt: now, updatedAt: now }).run();
  });
  return id;
}

function storedSession(id: string) {
  return rawDb.prepare('SELECT status, result_id AS resultId FROM assessment_sessions WHERE id = ?').get(id);
}

function resultCount(id: string) {
  return (rawDb.prepare('SELECT count(*) AS count FROM assessment_results WHERE session_id = ?').get(id) as { count: number }).count;
}

beforeAll(async () => { await executeImport(); });
beforeEach(() => {
  rawDb.prepare('DELETE FROM mastery_events').run();
  rawDb.prepare('DELETE FROM assessment_sessions').run();
  rawDb.prepare("UPDATE knowledge_points SET status = 'LEARNING', learning_state = 'LEARNED', mastery_level = 0, first_passed_at = NULL, mastered_at = NULL WHERE code = 'JS-01'").run();
  grade.mockReset().mockImplementation(async (request: GradingRequest) => responseFor(request));
});
afterEach(() => { rawDb.exec('DROP TRIGGER IF EXISTS fail_mastery_audit'); });

describe('评分任务与持久化边界', () => {
  it('启动时只恢复中断任务，首次评分允许重试，重评恢复旧结果', async () => {
    const fresh = createSubmittedSession();
    prepareGrading(fresh, false);
    const repeated = createSubmittedSession();
    const first = await gradeAssessment({ sessionId: repeated });
    prepareGrading(repeated, true);
    const untouched = createSubmittedSession();
    expect(recoverInterruptedGradings()).toBe(2);
    expect(storedSession(fresh)).toEqual({ status: 'ERROR', resultId: null });
    expect(storedSession(repeated)).toEqual({ status: 'GRADED', resultId: first.result.id });
    expect(storedSession(untouched)).toMatchObject({ status: 'SUBMITTED' });
    expect(recoverInterruptedGradings()).toBe(0);
  });
  it('重复评分返回同一结果，不再调用模型或重复写入掌握事件', async () => {
    const sessionId = createSubmittedSession();
    const first = await gradeAssessment({ sessionId });
    const repeated = await gradeAssessment({ sessionId });
    expect(first.result.verdict).toBe('PASS');
    expect(repeated.result.id).toBe(first.result.id);
    expect(repeated.knowledgePointUpdated).toBe(false);
    expect(grade).toHaveBeenCalledOnce();
    expect(rawDb.prepare('SELECT count(*) AS count FROM mastery_events').get()).toEqual({ count: 1 });
  });

  it('并发请求只能领取一次，冲突请求不能把正在评分的会话改成 ERROR', async () => {
    const sessionId = createSubmittedSession();
    let finish!: (response: AIResponse) => void;
    grade.mockImplementationOnce(() => new Promise<AIResponse>(resolve => { finish = resolve; }));
    const running = gradeAssessment({ sessionId });
    await vi.waitFor(() => expect(grade).toHaveBeenCalledOnce());
    await expect(gradeAssessment({ sessionId })).rejects.toMatchObject({ statusCode: 409 });
    await expect(regradeAssessment(sessionId)).rejects.toMatchObject({ statusCode: 409 });
    expect(storedSession(sessionId)).toMatchObject({ status: 'GRADING' });
    finish(responseFor(grade.mock.calls[0]![0] as GradingRequest));
    await running;
    expect(storedSession(sessionId)).toMatchObject({ status: 'GRADED' });
    expect(resultCount(sessionId)).toBe(1);
  });

  it('审计写入失败时回滚结果、知识点与会话，首次评分仍可重试', async () => {
    const sessionId = createSubmittedSession();
    rawDb.exec("CREATE TRIGGER fail_mastery_audit BEFORE INSERT ON mastery_events BEGIN SELECT RAISE(ABORT, 'audit write failed'); END");
    await expect(gradeAssessment({ sessionId })).rejects.toThrow('audit write failed');
    expect(resultCount(sessionId)).toBe(0);
    expect(storedSession(sessionId)).toEqual({ status: 'ERROR', resultId: null });
    expect(rawDb.prepare("SELECT mastery_level AS level, status FROM knowledge_points WHERE code = 'JS-01'").get()).toEqual({ level: 0, status: 'LEARNING' });
    rawDb.exec('DROP TRIGGER fail_mastery_audit');
    await expect(gradeAssessment({ sessionId })).resolves.toMatchObject({ session: { status: 'GRADED' } });
  });

  it('模型重评失败保留旧评分、原始答卷和掌握记录', async () => {
    const sessionId = createSubmittedSession();
    const first = await gradeAssessment({ sessionId });
    grade.mockRejectedValueOnce(new Error('model unavailable'));
    await expect(regradeAssessment(sessionId)).rejects.toThrow('model unavailable');
    expect(storedSession(sessionId)).toEqual({ status: 'GRADED', resultId: first.result.id });
    expect(resultCount(sessionId)).toBe(1);
    expect(rawDb.prepare('SELECT count(*) AS count FROM mastery_events').get()).toEqual({ count: 1 });
    expect(rawDb.prepare('SELECT DISTINCT answer_content AS content FROM assessment_answers').all()).toEqual([{ content: '原始答卷' }]);
  });

  it('重评提交失败仍回滚为旧评分，而不是丢失历史结果', async () => {
    const sessionId = createSubmittedSession();
    const first = await gradeAssessment({ sessionId });
    rawDb.exec("CREATE TRIGGER fail_mastery_audit BEFORE INSERT ON mastery_events BEGIN SELECT RAISE(ABORT, 'audit write failed'); END");
    await expect(regradeAssessment(sessionId)).rejects.toThrow('audit write failed');
    expect(storedSession(sessionId)).toEqual({ status: 'GRADED', resultId: first.result.id });
    expect(rawDb.prepare('SELECT id FROM assessment_results WHERE session_id = ?').get(sessionId)).toEqual({ id: first.result.id });
  });

  it('重评成功时原子替换当前结果，原始答卷保持不变', async () => {
    const sessionId = createSubmittedSession();
    const first = await gradeAssessment({ sessionId });
    const second = await regradeAssessment(sessionId);
    expect(second.result.id).not.toBe(first.result.id);
    expect(resultCount(sessionId)).toBe(1);
    expect(storedSession(sessionId)).toEqual({ status: 'GRADED', resultId: second.result.id });
    expect(rawDb.prepare('SELECT DISTINCT answer_content AS content FROM assessment_answers').all()).toEqual([{ content: '原始答卷' }]);
  });

  it('调用前已取消的请求不改变会话状态', async () => {
    const sessionId = createSubmittedSession();
    const controller = new AbortController();
    controller.abort();
    await expect(gradeAssessment({ sessionId }, undefined, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(storedSession(sessionId)).toMatchObject({ status: 'SUBMITTED' });
    expect(grade).not.toHaveBeenCalled();
  });

  it('模型忽略取消并返回结果时，服务仍阻止晚到结果写入', async () => {
    const sessionId = createSubmittedSession();
    const controller = new AbortController();
    grade.mockImplementationOnce(async (request: GradingRequest) => { controller.abort(); return responseFor(request); });
    await expect(gradeAssessment({ sessionId }, undefined, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(resultCount(sessionId)).toBe(0);
    expect(storedSession(sessionId)).toMatchObject({ status: 'ERROR' });
  });
});
