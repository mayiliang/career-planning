import { FakeProvider } from '../ai/fake.js';
import { gradeAssessment } from './grading.service.js';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FRAMEWORK_ENTRY_NODES, practiceActivityId } from '@career-atlas/shared';
import { config, projectRoot } from '../config/index.js';
import { rawDb } from '../db/index.js';
import { executeImport } from './import.service.js';
import { getKnowledgePointByCode } from './knowledge.service.js';
import { buildAsyncPilotContext } from './async-pilot-context.js';
import * as contextModule from './async-pilot-context.js';
import { asyncGradingSources } from './async-pilot-contract.js';
import { buildRelationDefinitions, syncKnowledgeRelations } from './knowledge-relations.service.js';
import { planNextRoute } from './learning/routes.js';
import { createAssessmentSession, getAssessmentSession } from './assessment.service.js';
import { listPracticeAttempts, savePracticeAttempt, validatePracticeAttempt } from './practice.service.js';
import { PRACTICE_SECTION_HEADINGS } from './learning-content.service.js';
import { savePointNote, getNoteByCode, saveCheckin } from './learning.service.js';
import { updateMaterialReadingProgress, listMaterialReadingProgress } from './knowledge-material-progress.service.js';

const evidence = resolve(projectRoot, 'tmp/framework-entry-evidence');
const guide = (file: string) => readFileSync(resolve(projectRoot, 'docs/knowledge/chinese-guides', file), 'utf8');
const submission = { submissionMd: PRACTICE_SECTION_HEADINGS.CODING.map(h => `# ${h}\n固定输入、预期与实际结果和逐步运行证据见提交附件。`).join('\n'), code: 'const fixedInput=0; const expected=1; const actual=1; console.assert(actual===expected);', executionOutput: 'fixedInput=0 expected=1 actual=1', executionStatus: 'SUCCESS' as const };
describe('框架入口合同', () => {
  beforeAll(async () => { await executeImport(); mkdirSync(evidence, { recursive: true }); });
  it('正文、目录与关系一致，入口无循环且前置可暂缓而不被改写', () => {
    const relations = buildRelationDefinitions().filter(r => r.type === 'PREREQUISITE');
    const catalog = JSON.parse(readFileSync(resolve(projectRoot, 'docs/knowledge/materials/b04.json'), 'utf8'));
    for (const node of FRAMEWORK_ENTRY_NODES) {
      const direct = guide(node.guide).split('### 学习前先确认')[1]!.split('\n### ')[0]!;
      expect([...direct.matchAll(/^- 直接前置：\[([^\]]+)/gm)].map(m => m[1])).toEqual(node.prerequisites);
      expect(relations.filter(r => r.target === node.code).map(r => r.source).sort()).toEqual([...node.prerequisites].sort());
      expect(catalog.chapters.find((c: {id:string}) => c.id === node.code).prerequisites.map((r: string) => r.split('#')[1]!.toUpperCase())).toEqual(node.prerequisites);
      const visit = (code: string, path: string[]) => {
        expect(path).not.toContain(code);
        expect(rawDb.prepare('SELECT id FROM knowledge_points WHERE code=?').get(code)).toBeTruthy();
        relations.filter(r => r.target === code).forEach(r => visit(r.source, [...path, code]));
      };
      visit(node.code, []);
      const states = new Map<string, 'LEARNING' | 'LEARNED' | 'DEFERRED'>([[node.code, 'LEARNING'], ...node.prerequisites.map(c => [c, 'LEARNED'] as const)]);
      states.set(node.prerequisites[0], 'DEFERRED');
      const before = [...states];
      expect(planNextRoute(node.code, states)[0]).toMatchObject({ code: node.prerequisites[0], kind: 'PREREQUISITE' });
      expect([...states]).toEqual(before);
    }
  });
  for (const node of FRAMEWORK_ENTRY_NODES) {
    it(`${node.code} 完整上下文、降级、实际练习请求与挑战快照`, async () => {
      rawDb.prepare("UPDATE knowledge_points SET learning_state='LEARNED' WHERE code=?").run(node.code);
      const point = (await getKnowledgePointByCode(node.code))!;
      const coverage = buildAsyncPilotContext(node.code, point.studyMaterialMd)!;
      expect(coverage.complete).toBe(true); expect(coverage.used).toBeLessThanOrEqual(24000);
      for (const section of coverage.sections) {
        expect(guide(node.guide)).toContain(section.content);
        expect(section.truncated).toBe(false);
        expect((section.content.match(/^```/gm) ?? []).length % 2).toBe(0);
      }
      expect(buildAsyncPilotContext(node.code, '')?.complete).toBe(false);
      const partial = buildAsyncPilotContext(node.code, point.studyMaterialMd, 20)!;
      const source = vi.spyOn(contextModule, 'buildAsyncPilotContext').mockReturnValue(partial);
      const network = vi.spyOn(globalThis, 'fetch');
      try {
        const result = await validatePracticeAttempt(node.code, practiceActivityId(node.code), submission);
        expect(result.validation.validationLevel).toBe('STRUCTURE_ONLY');
        expect(result.validation.summary).toContain('正文缺失');
        expect(network).not.toHaveBeenCalled();
        await expect(createAssessmentSession({ knowledgePointCode: node.code, type: 'FIRST', durationMinutes: 30, masteryStage: 1, challengeMode: 'PRACTICE', challengeProfile: 'AUTO' })).rejects.toThrow('正文不足');
      } finally { source.mockRestore(); network.mockRestore(); }
      const mock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('data: ' + JSON.stringify({ choices: [{ delta: { content: JSON.stringify({ passed: false, summary: '模拟响应，不证明语义正确', checks: [], nextAction: '人工复核' }) } }] }) + '\n\ndata: [DONE]\n\n'));
      config.DEEPSEEK_API_KEY = 'isolated-placeholder';
      try {
        await validatePracticeAttempt(node.code, practiceActivityId(node.code), submission);
        expect(mock).toHaveBeenCalledOnce();
        const body = JSON.parse(String(mock.mock.calls[0]![1]?.body));
        const sent = JSON.parse(body.messages[1].content);
        expect(sent.materialContext).toEqual(coverage.sections);
        expect(sent.contextCoverage.complete).toBe(true);
        writeFileSync(resolve(evidence, `${node.code}-practice-request.json`), JSON.stringify({ mode: '模拟响应；实际请求体', body }, null, 2));
      } finally { config.DEEPSEEK_API_KEY = ''; mock.mockRestore(); }
      rawDb.prepare("UPDATE knowledge_points SET learning_state='LEARNED' WHERE code=?").run(node.code);
      const created = await createAssessmentSession({ knowledgePointCode: node.code, type: 'FIRST', durationMinutes: 30, masteryStage: 1, challengeMode: 'PRACTICE', challengeProfile: 'AUTO' });
      const detail = await getAssessmentSession(created.session.id);
      expect(detail.questions.map(q => JSON.parse(q.questionContent)).filter(q => q.contractSnapshot)).toHaveLength(1);
      expect(detail.questions.every(q => JSON.parse(q.questionContent).contractVersion === 'framework-entry-v2')).toBe(true);
      const sources = asyncGradingSources(node.code, detail.questions)!;
      coverage.sections.forEach(section => expect(sources.studyMaterial).toContain(section.content));
      rawDb.prepare("UPDATE assessment_sessions SET status='SUBMITTED' WHERE id=?").run(created.session.id);
      const grading = vi.spyOn(FakeProvider.prototype, 'grade').mockImplementation(async request => {
        expect(request.studyMaterial).toBe(sources.studyMaterial);
        expect(request.rubric).toBe(point.assessmentSpecMd);
        writeFileSync(resolve(evidence, `${node.code}-challenge-request.json`), JSON.stringify({ mode: '实际评分服务请求；在 Provider 边界截获，未调用模型', request }, null, 2));
        throw new Error('请求捕获结束');
      });
      try { await expect(gradeAssessment({ sessionId: created.session.id, provider: 'fake' })).rejects.toThrow('请求捕获结束'); }
      finally { grading.mockRestore(); }
      expect(() => asyncGradingSources(node.code, [{ questionContent: '{"contractVersion":"framework-entry-v2"}' }])).toThrow('快照');
    });
    it(`${node.code} 重复导入保留旧草稿、完成挑战和个人记录`, async () => {
      rawDb.prepare('UPDATE knowledge_points SET current_focus=0').run();
      savePointNote(node.code, '框架入口旧笔记');
      saveCheckin({ date: '2026-11-01', pointCodes: [node.code], summaryMd: '入口旧打卡' });
      updateMaterialReadingProgress(node.guide, node.anchor, 42);
      rawDb.prepare("UPDATE knowledge_points SET learning_state='LEARNED', current_focus=1, mastery_level=3, source_hash='old' WHERE code=?").run(node.code);
      rawDb.prepare("UPDATE knowledge_points SET learning_state='DEFERRED', defer_reason='稍后补学' WHERE code='JS-06'").run();
      rawDb.prepare(`INSERT INTO learning_practice_attempts (id,knowledge_point_code,activity_id,submission_md,code,execution_output,status,created_at,updated_at) VALUES (?,?,'strict-practice','旧草稿','旧代码','旧输出','DRAFT','old','old')`).run(`${node.code}-legacy`, node.code);
      const created = await createAssessmentSession({ knowledgePointCode: node.code, type: 'FIRST', durationMinutes: 30, masteryStage: 1, challengeMode: 'PRACTICE', challengeProfile: 'AUTO' });
      const question = JSON.stringify({ question: '原题快照', sourceBasis: ['原合同依据'] });
      rawDb.prepare('UPDATE assessment_questions SET question_content=? WHERE session_id=?').run(question, created.session.id);
      rawDb.prepare("UPDATE assessment_sessions SET status='GRADED' WHERE id=?").run(created.session.id);
      rawDb.prepare("INSERT INTO assessment_results (id,session_id,verdict,confidence,feedback,created_at) VALUES (?,?,'PASS','0.9','旧评分','old')").run(`${node.code}-result`, created.session.id);
      const snapshot = () => rawDb.prepare("SELECT id,code,learning_state,current_focus,mastery_level,defer_reason FROM knowledge_points WHERE code IN (?, 'JS-06') ORDER BY code").all(node.code);
      const before = snapshot();
      await executeImport(); syncKnowledgeRelations(); await executeImport(); syncKnowledgeRelations();
      expect(snapshot()).toEqual(before);
      expect(getNoteByCode(node.code)?.originalMd).toBe('框架入口旧笔记');
      expect(listMaterialReadingProgress().find(r => r.guide === node.guide)?.progressPercent).toBe(42);
      expect(rawDb.prepare("SELECT summary_md FROM learning_checkins WHERE checkin_date='2026-11-01'").get()).toEqual({ summary_md: '入口旧打卡' });
      const detail = await getAssessmentSession(created.session.id);
      expect(detail.questions.every(q => q.questionContent === question)).toBe(true);
      expect(rawDb.prepare('SELECT feedback FROM assessment_results WHERE session_id=?').get(created.session.id)).toEqual({ feedback: '旧评分' });
      const old = listPracticeAttempts(node.code).find(a => a.activityId === 'strict-practice')!;
      expect(old).toMatchObject({ submissionMd: '旧草稿', readOnly: true, contractVersion: 'framework-entry-v1' });
      expect(old.contractSnapshot).toContain(node.code === 'REACT-01' ? '0ms' : '/knowledge/:id');
      expect(() => savePracticeAttempt(node.code, 'strict-practice', submission)).toThrow('历史合同');
      expect(asyncGradingSources(node.code, detail.questions)?.studyMaterial).not.toContain('用手动释放回调');
    });
  }
});
