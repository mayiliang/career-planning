import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { rawDb } from '../../db/index.js';
import { executeImport } from '../import.service.js';
import { createAssessmentSession, getAssessmentSession } from '../assessment.service.js';

const request = {
  knowledgePointCode: 'JS-03', type: 'FIRST' as const, durationMinutes: 30,
  masteryStage: 1, challengeMode: 'MIXED' as const, challengeProfile: 'AUTO' as const,
};

function sessionCount() {
  return (rawDb.prepare('SELECT COUNT(*) AS count FROM assessment_sessions WHERE knowledge_point_code = ?')
    .get(request.knowledgePointCode) as { count: number }).count;
}

describe('掌握挑战创建的一致性', () => {
  let originalSpec: string;

  beforeAll(async () => {
    await executeImport();
    originalSpec = (rawDb.prepare('SELECT assessment_spec_md AS spec FROM knowledge_points WHERE code = ?')
      .get(request.knowledgePointCode) as { spec: string }).spec;
  });

  beforeEach(() => {
    rawDb.prepare('DELETE FROM assessment_sessions WHERE knowledge_point_code = ?').run(request.knowledgePointCode);
    rawDb.prepare("UPDATE knowledge_points SET assessment_spec_md = ?, learning_state = 'LEARNED', mastery_level = 3, mastered_at = ? WHERE code = ?")
      .run(originalSpec, new Date(Date.now() - 8 * 86400_000).toISOString(), request.knowledgePointCode);
  });

  afterAll(() => {
    rawDb.prepare('UPDATE knowledge_points SET assessment_spec_md = ? WHERE code = ?').run(originalSpec, request.knowledgePointCode);
    rawDb.prepare('DELETE FROM assessment_sessions WHERE knowledge_point_code = ?').run(request.knowledgePointCode);
  });

  it.each([
    { reason: '首考题不完整', spec: '首考题 1（资料定位）：定位定义。', masteryStage: 1, message: '首考题 1–5' },
    { reason: '首考题缺少正文', spec: [1, 2, 3, 4, 5].map(n => `首考题 ${n}：${n === 3 ? '' : '解释机制与边界。'}`).join('\n'), masteryStage: 1, message: '首考题 1–5' },
    { reason: 'M4 缺少复测变式', spec: [1, 2, 3, 4, 5].map(n => `首考题 ${n}：解释机制与边界。`).join('\n'), masteryStage: 4, message: '复测变式' },
  ])('$reason 时不遗留空会话，修复合同后可以正常重试', async ({ spec, masteryStage, message }) => {
    rawDb.prepare('UPDATE knowledge_points SET assessment_spec_md = ? WHERE code = ?').run(spec, request.knowledgePointCode);
    await expect(createAssessmentSession({ ...request, masteryStage })).rejects.toThrow(message);
    expect(sessionCount()).toBe(0);

    rawDb.prepare('UPDATE knowledge_points SET assessment_spec_md = ? WHERE code = ?').run(originalSpec, request.knowledgePointCode);
    const created = await createAssessmentSession({ ...request, masteryStage });
    expect(created.resumedExisting).toBe(false);
    expect((await getAssessmentSession(created.session.id)).questions).toHaveLength(5);
  });

  it('题目写入中途失败时一起回滚会话和题目，随后可重试', async () => {
    const countQuestions = () => (rawDb.prepare('SELECT COUNT(*) AS count FROM assessment_questions').get() as { count: number }).count;
    const previousQuestionCount = countQuestions();
    rawDb.exec(`CREATE TRIGGER reject_challenge_question BEFORE INSERT ON assessment_questions
      WHEN NEW.order_index = 2 AND NEW.session_id IN (SELECT id FROM assessment_sessions WHERE knowledge_point_code = 'JS-03')
      BEGIN SELECT RAISE(ABORT, 'simulated question persistence failure'); END;`);
    try {
      await expect(createAssessmentSession(request)).rejects.toThrow('simulated question persistence failure');
      expect(sessionCount()).toBe(0);
      expect(countQuestions()).toBe(previousQuestionCount);
    } finally {
      rawDb.exec('DROP TRIGGER reject_challenge_question');
    }
    const created = await createAssessmentSession(request);
    expect(created.resumedExisting).toBe(false);
    expect((await getAssessmentSession(created.session.id)).questions).toHaveLength(5);
  });

  it('同时创建只返回一份挑战，恢复原题目和已保存的会话配置', async () => {
    const results = await Promise.all(Array.from({ length: 4 }, () => createAssessmentSession(request)));
    expect(new Set(results.map(result => result.session.id)).size).toBe(1);
    expect(results.filter(result => !result.resumedExisting)).toHaveLength(1);
    expect(sessionCount()).toBe(1);
    const detail = await getAssessmentSession(results[0]!.session.id);
    const resumed = await createAssessmentSession({ ...request, masteryStage: 2, durationMinutes: 60 });
    expect(resumed.session.masteryStage).toBe(1);
    expect(resumed.session.durationMinutes).toBe(30);
    expect((await getAssessmentSession(resumed.session.id)).questions).toEqual(detail.questions);
    expect(detail.questions).toHaveLength(5);
  });
});
