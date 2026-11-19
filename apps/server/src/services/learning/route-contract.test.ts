import { PRACTICE_SECTION_HEADINGS } from '../learning-content.service.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { AUDITED_PREREQUISITES, ASSESSMENT_PENDING, planLearningRoute, type FrameworkChoice, type RouteState } from '@career-atlas/shared';
import { config, projectRoot } from '../../config/index.js';
import { rawDb } from '../../db/index.js';
import { executeImport } from '../import.service.js';
import { getLearningRoute, getNextBranches } from './routes.js';
import { getLearningPreferences, saveLearningPreferences } from './preferences.js';
import { getLearningWorkspace } from '../learning.service.js';
import { getKnowledgeRecommendation, getKnowledgePointByCode } from '../knowledge.service.js';
import { syncKnowledgeRelations } from '../knowledge-relations.service.js';
import { createAssessmentSession } from '../assessment.service.js';
import { validatePracticeAttempt, listPracticeAttempts } from '../practice.service.js';
import { configureHttpContract } from '../../http/contract.js';
import { learningRoutes } from '../../http/routes/learning.js';
const cases = JSON.parse(readFileSync(resolve(projectRoot, 'docs/auto-coding/evidence/framework-foundation-route/route-cases.json'), 'utf8')) as { cases: Array<{name:string; input:{choice?:FrameworkChoice;learned?:string[];deferred?:string[];missing?:string[];focus?:string};expected:{outcome:string;code:string|null;blocker:string|null}}> };
describe('生产规划器与隔离记录兼容', () => {
  beforeAll(async () => { await executeImport(); });
  beforeEach(() => {
    rawDb.prepare("UPDATE knowledge_points SET learning_state='NOT_STARTED', current_focus=0").run();
    rawDb.prepare("UPDATE learning_preferences SET framework_choice='UNDECIDED', revision=0").run();
  });
  it.each(cases.cases)('$name', ({input, expected}) => {
    const states = new Map<string, RouteState>(Object.keys(AUDITED_PREREQUISITES).map(code => [code, 'NOT_STARTED']));
    input.learned?.forEach(code => states.set(code, 'LEARNED'));
    input.deferred?.forEach(code => states.set(code, 'DEFERRED'));
    input.missing?.forEach(code => states.delete(code));
    if (input.focus) states.set(input.focus, 'LEARNING');
    const before = [...states];
    const route = planLearningRoute({ frameworkChoice: input.choice ?? 'UNDECIDED', preferenceRevision: 7, currentFocusCode: input.focus, states });
    expect(route.outcome).toBe(expected.outcome); expect(route.next?.code ?? null).toBe(expected.code);
    if (!input.focus) expect(route.blockers.find(b => b.kind === 'POINT')?.code ?? null).toBe(expected.blocker);
    expect([...states]).toEqual(before); expect(route.preferenceRevision).toBe(7);
  });
  it('已审图可解析、无环且无跨框架硬边，目录保持一致', () => {
    const visit = (code: string, ancestors: string[]) => {
      expect(ancestors).not.toContain(code);
      expect(rawDb.prepare('SELECT id FROM knowledge_points WHERE code=?').get(code)).toBeTruthy();
      for (const source of AUDITED_PREREQUISITES[code] ?? []) {
        expect(code.startsWith('REACT-') && source.startsWith('VUE-') || code.startsWith('VUE-') && source.startsWith('REACT-')).toBe(false);
        visit(source, [...ancestors, code]);
      }
    };
    Object.keys(AUDITED_PREREQUISITES).forEach(code => visit(code, []));
    for (const batch of ['b04','b05','b06']) {
      const catalog = JSON.parse(readFileSync(resolve(projectRoot, `docs/knowledge/materials/${batch}.json`), 'utf8'));
      for (const chapter of catalog.chapters) if (ASSESSMENT_PENDING[chapter.id]) {
        expect(chapter.prerequisites.map((href: string) => href.split('#')[1]!.toUpperCase())).toEqual(AUDITED_PREREQUISITES[chapter.id]);
      }
    }
  });
  it('重复导入保留全部已有个人表字段与偏好', async () => {
    saveLearningPreferences('VUE', 0);
    const tables = ['knowledge_points','knowledge_notes','knowledge_note_versions','material_reading_progress','learning_practice_attempts','learning_route_choices','learning_checkins','learning_checkin_points','assessment_sessions','assessment_questions','assessment_answers','assessment_results','assessment_hint_events','mastery_events','checkins','learning_preferences'];
    const snapshot = () => tables.map(table => rawDb.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all());
    const before = snapshot(); await executeImport(); syncKnowledgeRelations(); await executeImport();
    expect(snapshot()).toEqual(before);
  });
  it('缺失当前点、已完成节点不追溯前置、阅读辅助不是门禁', () => {
    expect(planLearningRoute({ frameworkChoice: 'VUE', preferenceRevision: 0, currentFocusCode: 'MISSING', states: new Map() }).outcome).toBe('DATA_GAP');
    const states = new Map<string, RouteState>(Object.keys(AUDITED_PREREQUISITES).map(code => [code, 'LEARNED']));
    states.set('JS-04', 'NOT_STARTED');
    const result = planLearningRoute({ frameworkChoice: 'NONE', preferenceRevision: 0, states });
    expect(result.next?.code).toBe('JS-04'); expect(result.blockers.map(b => b.kind)).toEqual(['READING','READING']);
    states.set('JS-01', 'DEFERRED');
    expect(planLearningRoute({ frameworkChoice: 'VUE', preferenceRevision: 0, states }).outcome).toBe('AUDITED_CHAIN_COMPLETE');
  });
  it('稳定继续上下文、异常多焦点提示且不写回', () => {
    rawDb.prepare("UPDATE knowledge_points SET learning_state='LEARNING', updated_at='2026-01-01' WHERE code IN ('VUE-01','REACT-01')").run();
    expect(getLearningRoute().next?.code).toBe('REACT-01');
    expect(rawDb.prepare('SELECT code FROM knowledge_points WHERE current_focus=1').all()).toEqual([]);
    rawDb.exec("DROP INDEX kp_single_current_focus_idx");
    rawDb.prepare("UPDATE knowledge_points SET current_focus=1 WHERE code IN ('VUE-01','REACT-01')").run();
    try { expect(getLearningRoute().diagnostics).toHaveLength(1); } finally {
      rawDb.prepare('UPDATE knowledge_points SET current_focus=0').run();
      rawDb.exec('CREATE UNIQUE INDEX kp_single_current_focus_idx ON knowledge_points(current_focus) WHERE current_focus=1');
    }
  });
  it('偏好保存只改独立表，重复同值幂等，过期请求409含当前值', async () => {
    const before = rawDb.prepare('SELECT * FROM knowledge_points ORDER BY id').all();
    const app = Fastify(); configureHttpContract(app); app.register(learningRoutes);
    try {
      const save = (expectedRevision:number) => app.inject({ method:'PUT', url:'/api/v1/learning/preferences', payload:{ frameworkChoice:'VUE', expectedRevision } });
      expect((await save(0)).json().data.revision).toBe(1);
      expect((await save(1)).json().data.revision).toBe(1);
      const conflict = await save(0); expect(conflict.statusCode).toBe(409); expect(conflict.json().current.frameworkChoice).toBe('VUE');
      expect((await app.inject('/api/v1/learning/preferences')).json().data).toEqual(getLearningPreferences());
      expect(rawDb.prepare('SELECT * FROM knowledge_points ORDER BY id').all()).toEqual(before);
    } finally { await app.close(); }
  });
  it('全部消费者一致，无下一步时不兜底', async () => {
    for (const choice of ['UNDECIDED', 'REACT', 'VUE', 'NONE'] as const) {
      saveLearningPreferences(choice, getLearningPreferences().revision);
      const route = getLearningRoute();
      expect(getLearningWorkspace().route).toEqual(route);
      expect((await getKnowledgeRecommendation()).route).toEqual(route);
      expect(getNextBranches('VUE-07').map(p => p.code)).toEqual(route.next ? [route.next.code] : []);
    }
  });
  it('关系同步保留未知人工边，删除后失败全部回滚，重复同步不改ID', () => {
    const source = (rawDb.prepare("SELECT id FROM knowledge_points WHERE code='JS-07'").get() as {id:string}).id;
    const target = (rawDb.prepare("SELECT id FROM knowledge_points WHERE code='VUE-02'").get() as {id:string}).id;
    rawDb.prepare("INSERT OR IGNORE INTO knowledge_edges (id,source_point_id,target_point_id,type,description,weight,created_at) VALUES ('manual-issue8',?,?,'PREREQUISITE','人工保留',1,'2026')").run(source,target);
    syncKnowledgeRelations();
    const before = rawDb.prepare('SELECT * FROM knowledge_edges ORDER BY id').all();
    expect(() => syncKnowledgeRelations(() => { throw new Error('故障注入'); })).toThrow('故障注入');
    expect(rawDb.prepare('SELECT * FROM knowledge_edges ORDER BY id').all()).toEqual(before);
    syncKnowledgeRelations();
    expect(rawDb.prepare('SELECT * FROM knowledge_edges ORDER BY id').all()).toEqual(before);
    expect(rawDb.prepare("SELECT id FROM knowledge_edges WHERE id='manual-issue8'").get()).toBeTruthy();
  });
  it.each(Object.keys(ASSESSMENT_PENDING))('%s 新挑战拒绝且结构草稿不调用Provider，旧练习仍可读', async code => {
    rawDb.prepare("UPDATE knowledge_points SET learning_state='LEARNED' WHERE code=?").run(code);
    const previousKey = config.DEEPSEEK_API_KEY; config.DEEPSEEK_API_KEY = 'isolated-test-placeholder';
    const network = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('不应请求网络'));
    try {
      await expect(createAssessmentSession({knowledgePointCode:code, type:'FIRST', masteryStage:1, challengeMode:'STANDARD', challengeProfile:'CODING', durationMinutes:30} as Parameters<typeof createAssessmentSession>[0])).rejects.toThrow('练习合同待修订');
      rawDb.prepare("INSERT INTO learning_practice_attempts (id,knowledge_point_code,activity_id,submission_md,code,execution_output,status,created_at,updated_at) VALUES (?,?,'strict-practice','原始答卷','旧代码','旧输出','COMPLETED','old','old')").run(`legacy-${code}`,code);
      const old = rawDb.prepare('SELECT * FROM learning_practice_attempts WHERE id=?').get(`legacy-${code}`);
      const point = (await getKnowledgePointByCode(code))!;
      const activity = point.learningActivities.find(a => a.deliveryMode === 'WORKSPACE')!;
      const result = await validatePracticeAttempt(code, activity.id, {submissionMd: PRACTICE_SECTION_HEADINGS[point.challengeProfile].map(h => `# ${h}\n固定输入、预期与实际结果和逐步运行证据见提交附件。`).join('\n'), code: 'const fixedInput=0; const expected=1; const actual=1; console.assert(actual===expected);', executionOutput:'fixedInput=0 expected=1 actual=1', executionStatus:'SUCCESS'});
      expect(result.validation.checks.every((c: {passed:boolean})=>c.passed)).toBe(true);
      expect(result.status).toBe('DRAFT'); expect(result.validation.validationLevel).toBe('STRUCTURE_ONLY');
      expect(listPracticeAttempts(code).find(a => a.activityId === 'strict-practice')).toMatchObject({readOnly:true,contractVersion:'framework-foundation-legacy',submissionMd:'原始答卷'});
      expect(rawDb.prepare('SELECT * FROM learning_practice_attempts WHERE id=?').get(`legacy-${code}`)).toEqual(old); expect(network).not.toHaveBeenCalled();
    } finally { network.mockRestore(); config.DEEPSEEK_API_KEY = previousKey; }
  });
});
