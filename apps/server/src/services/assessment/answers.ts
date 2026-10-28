/** 答案写入与答卷锁定使用短事务，避免检查状态后再异步写入。 */
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db, rawDb } from '../../db/index.js';
import { assessmentSessions, assessmentQuestions, assessmentAnswers } from '../../db/schema.js';
import type { AssessmentAnswerRecord, AssessmentSessionRecord } from '../../db/schema.js';
import { sanitizeClientSelfCheck } from './self-check.js';

export async function saveAnswer(sessionId: string, questionId: string, answerContent: string, deterministicResult?: string): Promise<AssessmentAnswerRecord> {
  if (!answerContent.trim()) throw new Error('答案不能为空。');
  if (answerContent.length > 120_000) throw new Error('答案内容超过 120000 个字符上限。');
  const selfCheck = sanitizeClientSelfCheck(deterministicResult);
  return rawDb.transaction(() => {
    const session = db.select().from(assessmentSessions).where(eq(assessmentSessions.id, sessionId)).get();
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    if (!['DRAFT', 'IN_PROGRESS'].includes(session.status)) throw new Error(`Cannot save answer to session with status: ${session.status}`);
    const question = db.select().from(assessmentQuestions).where(and(eq(assessmentQuestions.sessionId, sessionId), eq(assessmentQuestions.id, questionId))).get();
    if (!question) throw new Error(`Question not found: ${questionId}`);
    const existing = db.select().from(assessmentAnswers).where(and(eq(assessmentAnswers.sessionId, sessionId), eq(assessmentAnswers.questionId, questionId))).get();
    const now = new Date().toISOString();
    if (existing) return db.update(assessmentAnswers)
      .set({ answerContent, deterministicResult: selfCheck, answeredAt: now, updatedAt: now })
      .where(eq(assessmentAnswers.id, existing.id)).returning().get();
    return db.insert(assessmentAnswers).values({
      id: randomUUID(), sessionId, questionId, answerContent, deterministicResult: selfCheck,
      answeredAt: now, createdAt: now, updatedAt: now,
    }).returning().get();
  }).immediate();
}

export async function submitAssessmentSession(sessionId: string): Promise<AssessmentSessionRecord> {
  return rawDb.transaction(() => {
    const session = db.select().from(assessmentSessions).where(eq(assessmentSessions.id, sessionId)).get();
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    if (session.status !== 'IN_PROGRESS') throw new Error(`Cannot submit session with status: ${session.status}`);
    const questions = db.select().from(assessmentQuestions).where(eq(assessmentQuestions.sessionId, sessionId)).all();
    if (!questions.length) throw new Error('当前答卷没有题目，请取消后重新创建挑战。');
    const answers = db.select().from(assessmentAnswers).where(eq(assessmentAnswers.sessionId, sessionId)).all();
    const answered = new Set(answers.filter(answer => answer.answerContent.trim()).map(answer => answer.questionId));
    const unanswered = questions.filter(question => !answered.has(question.id)).length;
    if (unanswered) throw new Error(`还有 ${unanswered} 道题未作答`);
    // 本地自检是辅助记录，不是提交或掌握认证的硬门禁。
    const now = new Date().toISOString();
    return db.update(assessmentSessions).set({ status: 'SUBMITTED', submittedAt: now, updatedAt: now })
      .where(eq(assessmentSessions.id, sessionId)).returning().get();
  }).immediate();
}
