import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { rawDb } from '../db/index.js';
import { executeImport } from './import.service.js';
import {
  createAssessmentSession,
  extractFirstAssessmentQuestions,
  extractRetestVariant,
  getAssessmentSession,
  revealAssessmentHint,
  saveAnswer,
  sanitizeClientSelfCheck,
  startAssessmentSession,
  submitAssessmentSession,
  validateCodingSelfCheckEvidence,
} from './assessment.service.js';
import { getKnowledgePoints } from './knowledge.service.js';
import { syncKnowledgeRelations } from './knowledge-relations.service.js';

const requestFor = (knowledgePointCode: string, masteryStage = 1) => ({
  knowledgePointCode,
  type: 'FIRST' as const,
  durationMinutes: 30,
  masteryStage,
  challengeMode: 'MIXED' as const,
  challengeProfile: 'AUTO' as const,
});

describe('逐点首考合同掌握挑战', () => {
  beforeAll(async () => {
    await executeImport();
    syncKnowledgeRelations();
    rawDb.prepare("UPDATE knowledge_points SET learning_state = 'LEARNED', mastery_level = 0, mastered_at = NULL").run();
    rawDb.prepare('DELETE FROM assessment_sessions').run();
  });

  afterAll(() => {
    rawDb.prepare('DELETE FROM assessment_sessions').run();
  });

  it('能解析各知识点首考题 1–5，而不是共享题目模板', async () => {
    const { items, total } = await getKnowledgePoints({});
    expect(total).toBe(223);
    const problems: string[] = [];
    for (const point of items) {
      const row = rawDb.prepare('SELECT assessment_spec_md AS assessmentSpec FROM knowledge_points WHERE code = ?').get(point.code) as { assessmentSpec: string } | undefined;
      const questions = extractFirstAssessmentQuestions(row?.assessmentSpec ?? '');
      if (questions.length !== 5 || questions.map((item) => item.number).join(',') !== '1,2,3,4,5') problems.push(point.code);
    }
    expect(problems, '223 点必须都有可独立复用的首考题 1–5').toEqual([]);
  });

  it('新挑战把每个知识点的首考题逐题保存为合同，并保留题干、资料、输出和证据', async () => {
    const created = await createAssessmentSession(requestFor('JS-01'));
    expect(created.session.promptVersion).toBe('2.0-point-contract');
    const detail = await getAssessmentSession(created.session.id);
    expect(detail.questions).toHaveLength(5);
    const source = rawDb.prepare('SELECT assessment_spec_md AS assessmentSpec FROM knowledge_points WHERE code = ?').get('JS-01') as { assessmentSpec: string };
    const first = extractFirstAssessmentQuestions(source.assessmentSpec);
    for (const [index, question] of detail.questions.entries()) {
      const content = JSON.parse(question.questionContent) as Record<string, unknown>;
      expect(content.sourceQuestion).toBe(`首考题 ${index + 1}（${first[index]!.label}）`);
      expect(String(content.question)).toContain(first[index]!.body);
      expect(content.givenInput).toBeTruthy();
      expect(content.expectedOutput).toBeTruthy();
      expect(content.materialReferences).toBeInstanceOf(Array);
      expect(content.referenceDirection).toBeTruthy();
      expect(content.verificationChecklist).toBeInstanceOf(Array);
      expect(content.vetoItems).toBeInstanceOf(Array);
    }
  });

  it('223 个知识点生成后均与自己的首考题 1–5 闭环，而非复用跨点题干', async () => {
    const { items } = await getKnowledgePoints({});
    const problems: string[] = [];
    for (const point of items) {
      rawDb.prepare('DELETE FROM assessment_sessions WHERE knowledge_point_code = ?').run(point.code);
      const created = await createAssessmentSession(requestFor(point.code));
      const detail = await getAssessmentSession(created.session.id);
      const row = rawDb.prepare('SELECT assessment_spec_md AS assessmentSpec FROM knowledge_points WHERE code = ?').get(point.code) as { assessmentSpec: string };
      const source = extractFirstAssessmentQuestions(row.assessmentSpec);
      for (const [index, question] of detail.questions.entries()) {
        const content = JSON.parse(question.questionContent) as { question?: string; sourceQuestion?: string; stageContract?: string };
        if (!content.question?.includes(source[index]!.body) || content.sourceQuestion !== `首考题 ${index + 1}（${source[index]!.label}）` || !content.stageContract) {
          problems.push(`${point.code}:首考题${index + 1}`);
        }
      }
    }
    expect(problems, '每一点必须用本点首考题 1–5 生成挑战合同').toEqual([]);
  });

  it('M1/M2/M3/M4 的帮助与变式合同不混淆，M4 无本点变式明确拒绝', async () => {
    const m1 = await createAssessmentSession(requestFor('JS-01', 1));
    await startAssessmentSession(m1.session.id);
    const m1Question = (await getAssessmentSession(m1.session.id)).questions[0]!;
    await expect(revealAssessmentHint(m1.session.id, m1Question.id, 'OUTLINE')).resolves.toMatchObject({ level: 4 });
    await expect(revealAssessmentHint(m1.session.id, m1Question.id, 'STARTER')).rejects.toThrow('最多允许');
    rawDb.prepare('DELETE FROM assessment_sessions WHERE id = ?').run(m1.session.id);

    const m2 = await createAssessmentSession(requestFor('JS-01', 2));
    await startAssessmentSession(m2.session.id);
    const m2Question = (await getAssessmentSession(m2.session.id)).questions[0]!;
    await expect(revealAssessmentHint(m2.session.id, m2Question.id, 'HINT')).resolves.toMatchObject({ level: 2 });
    await expect(revealAssessmentHint(m2.session.id, m2Question.id, 'DECOMPOSE')).rejects.toThrow('最多允许');
    rawDb.prepare('DELETE FROM assessment_sessions WHERE id = ?').run(m2.session.id);

    const m3 = await createAssessmentSession(requestFor('JS-01', 3));
    await startAssessmentSession(m3.session.id);
    const m3Question = (await getAssessmentSession(m3.session.id)).questions[0]!;
    await expect(revealAssessmentHint(m3.session.id, m3Question.id, 'EXPLAIN')).rejects.toThrow('独立挑战');
    rawDb.prepare('DELETE FROM assessment_sessions WHERE id = ?').run(m3.session.id);

    expect(extractRetestVariant('首考题 1（资料定位）：定位定义。')).toBeUndefined();
    expect(extractRetestVariant('首考题 5（学习复述）：说明边界。复测变式：仅把输入 A 改为 B，保持其余条件不变；提交新断言。命题边界：不考资料外框架。'))
      .toBe('仅把输入 A 改为 B，保持其余条件不变；提交新断言');
  });

  it('旧会话不被静默改写，新建后可保留并明确提示升级方式', async () => {
    const created = await createAssessmentSession(requestFor('JS-02'));
    const before = (await getAssessmentSession(created.session.id)).questions.map((question) => question.questionContent);
    rawDb.prepare("UPDATE assessment_sessions SET prompt_version = '1.0' WHERE id = ?").run(created.session.id);
    const resumed = await createAssessmentSession(requestFor('JS-02'));
    const after = (await getAssessmentSession(created.session.id)).questions.map((question) => question.questionContent);
    expect(resumed.resumedExisting).toBe(true);
    expect(resumed.resumeMessage).toContain('旧版');
    expect(after).toEqual(before);
  });

  it('编码题的本地 Worker 自检记录不会成为提交或掌握判定的硬门禁', async () => {
    rawDb.prepare("DELETE FROM assessment_sessions WHERE knowledge_point_code = 'JS-01'").run();
    const created = await createAssessmentSession({ ...requestFor('JS-01'), challengeProfile: 'CODING' as const });
    await startAssessmentSession(created.session.id);
    const detail = await getAssessmentSession(created.session.id);
    for (const question of detail.questions) await saveAnswer(created.session.id, question.id, '已按题目作答。');
    const codeQuestion = detail.questions.find((question) => question.questionType === 'CODE_WRITE');
    expect(codeQuestion).toBeTruthy();
    await expect(submitAssessmentSession(created.session.id)).resolves.toMatchObject({ status: 'SUBMITTED' });
    rawDb.prepare("UPDATE assessment_sessions SET status = 'IN_PROGRESS' WHERE id = ?").run(created.session.id);
    const validCode = `
      function createCounter() { let value = 0; return { increment() { value += 1; return value; } }; }
      const normalObserved = createCounter().increment();
      const normalExpected = 1;
      console.assert(normalObserved === normalExpected, 'contract-normal');
      const boundaryObserved = createCounter().increment();
      const boundaryExpected = 1;
      console.assert(boundaryObserved === boundaryExpected, 'contract-boundary');
    `;
    await saveAnswer(created.session.id, codeQuestion!.id, validCode, JSON.stringify({
      passed: true,
      output: '[ASSERT PASS] contract-normal\n[ASSERT PASS] contract-boundary',
    }));
    await expect(submitAssessmentSession(created.session.id)).resolves.toMatchObject({ status: 'SUBMITTED' });
  });

  it('M4 将变式拆成五道不同任务，保留 sourceQuestion 追溯但不要求复写首考题', async () => {
    rawDb.prepare("DELETE FROM assessment_sessions WHERE knowledge_point_code = 'JS-01'").run();
    rawDb.prepare("UPDATE knowledge_points SET mastery_level = 3, mastered_at = ? WHERE code = 'JS-01'").run(new Date(Date.now() - 8 * 86400_000).toISOString());
    const created = await createAssessmentSession(requestFor('JS-01', 4));
    const detail = await getAssessmentSession(created.session.id);
    const contents = detail.questions.map((question) => JSON.parse(question.questionContent) as { question: string; sourceQuestion: string; givenInput: string; expectedOutput: string; failureFixture?: string });
    expect(contents).toHaveLength(5);
    expect(contents.map((item) => item.sourceQuestion)).toEqual([
      '首考题 1（资料定位）', '首考题 2（机制解释）', '首考题 3（最小产出）', '首考题 4（受限排错）', '首考题 5（学习复述）',
    ]);
    expect(new Set(contents.map((item) => item.question))).toHaveLength(5);
    expect(contents.every((item) => item.question.includes('本题以变式为主任务'))).toBe(true);
    expect(contents[2]?.givenInput).toContain('固定输入');
    expect(contents[2]?.expectedOutput).toContain('边界输入');
    expect(contents[3]?.failureFixture).toContain('M4 变式故障夹具');
  });

  it('只保存有界且可解析的本地自检记录，raw HTTP 伪造不会升级为服务端回执', () => {
    expect(sanitizeClientSelfCheck('{bad json')).toBeUndefined();
    const record = JSON.parse(sanitizeClientSelfCheck(JSON.stringify({ passed: true, output: 'x'.repeat(14_000), receipt: 'forged' }))!) as Record<string, unknown>;
    expect(record.kind).toBe('LOCAL_WORKER_SELF_CHECK_UNTRUSTED');
    expect(String(record.output)).toHaveLength(12_000);
    expect(record).not.toHaveProperty('receipt');
  });

  it('自检执行证据拒绝伪造 passed、裸标记、直接打印标记和无条件 true', () => {
    const cases = [{ id: 'contract-normal' }, { id: 'contract-boundary' }];
    const markerOutput = '[ASSERT PASS] contract-normal\n[ASSERT PASS] contract-boundary';
    const badAnswers = [
      ['伪造 passed', 'function solve() { return 1; }', JSON.stringify({ passed: true, output: '' })],
      ['缺失 assert', 'function solve() { return 1; }', JSON.stringify({ passed: true, output: markerOutput })],
      ['直接打印 marker', "function solve() { return 1; }\nconsole.log('[ASSERT PASS] contract-normal');\nconsole.assert(solve() === 1, 'contract-normal');\nconsole.assert(solve() === 1, 'contract-boundary');", JSON.stringify({ passed: true, output: markerOutput })],
      ['无条件 true', "function solve() { return 1; }\nconsole.assert(true, 'contract-normal');\nconsole.assert(true, 'contract-boundary');", JSON.stringify({ passed: true, output: markerOutput })],
    ] as const;
    for (const [, code, result] of badAnswers) {
      expect(validateCodingSelfCheckEvidence(code, result, cases).passed).toBe(false);
    }
  });

  it('包含可审阅实现、真实条件断言与完整浏览器记录的自检证据可以提交', () => {
    const code = `
      function createCounter() { let value = 0; return { increment() { value += 1; return value; } }; }
      const normalObserved = createCounter().increment();
      const normalExpected = 1;
      console.assert(normalObserved === normalExpected, 'contract-normal');
      const boundaryObserved = createCounter().increment();
      const boundaryExpected = 1;
      console.assert(boundaryObserved === boundaryExpected, 'contract-boundary');
    `;
    const result = JSON.stringify({ passed: true, output: '[ASSERT PASS] contract-normal\n[ASSERT PASS] contract-boundary' });
    expect(validateCodingSelfCheckEvidence(code, result, [{ id: 'contract-normal' }, { id: 'contract-boundary' }])).toEqual({ passed: true, failures: [] });
  });
});
