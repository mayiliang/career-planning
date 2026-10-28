import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import { rawDb } from '../../db/index.js';
import { executeImport } from '../import.service.js';
import { createAssessmentSession, startAssessmentSession, getAssessmentSession } from '../assessment.service.js';
import { saveAnswer, submitAssessmentSession } from './answers.js';

function cleanup() { rawDb.prepare("DELETE FROM assessment_sessions WHERE knowledge_point_code = 'JS-01'").run(); }

describe('答案持久化与锁卷边界', () => {
  beforeAll(async () => { await executeImport(); });
  beforeEach(() => {
    cleanup();
    rawDb.prepare("UPDATE knowledge_points SET learning_state = 'LEARNED', mastery_level = 0 WHERE code = 'JS-01'").run();
  });
  afterAll(cleanup);

  async function startedSession() {
    const { session } = await createAssessmentSession({
      knowledgePointCode: 'JS-01', type: 'FIRST', durationMinutes: 30,
      masteryStage: 1, challengeMode: 'THEORY', challengeProfile: 'AUTO',
    });
    await startAssessmentSession(session.id);
    return getAssessmentSession(session.id);
  }

  it('同一题同时首次保存只产生一个答案，按事务顺序保留最后写入内容', async () => {
    const { session, questions } = await startedSession();
    await Promise.all([
      saveAnswer(session.id, questions[0]!.id, '第一次'),
      saveAnswer(session.id, questions[0]!.id, '第二次'),
    ]);
    const rows = rawDb.prepare('SELECT answer_content AS content FROM assessment_answers WHERE session_id = ? AND question_id = ?')
      .all(session.id, questions[0]!.id);
    expect(rows).toEqual([{ content: '第二次' }]);
  });

  it('提交开始后并发到达的答案不能绕过状态检查修改锁定答卷', async () => {
    const { session, questions } = await startedSession();
    for (const question of questions) await saveAnswer(session.id, question.id, '锁卷前答案');
    const submitting = submitAssessmentSession(session.id);
    const lateSave = saveAnswer(session.id, questions[0]!.id, '锁卷后晚到答案');
    await expect(lateSave).rejects.toThrow('SUBMITTED');
    expect((await submitting).status).toBe('SUBMITTED');
    const stored = await getAssessmentSession(session.id);
    expect(stored.answers.every(answer => answer.answerContent === '锁卷前答案')).toBe(true);
  });

  it.each(['empty', 'blank'] as const)('%s 的历史答卷不能被提交锁定', async kind => {
    const { session, questions } = await startedSession();
    if (kind === 'empty') rawDb.prepare('DELETE FROM assessment_questions WHERE session_id = ?').run(session.id);
    else {
      for (const question of questions) await saveAnswer(session.id, question.id, '完整答案');
      rawDb.prepare("UPDATE assessment_answers SET answer_content = '  ' WHERE question_id = ?").run(questions[0]!.id);
    }
    await expect(submitAssessmentSession(session.id)).rejects.toThrow(kind === 'empty' ? '没有题目' : '未作答');
    expect((await getAssessmentSession(session.id)).session.status).toBe('IN_PROGRESS');
  });
});
