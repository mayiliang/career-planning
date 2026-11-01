import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ASYNC_PILOT_NODES, practiceActivityId } from '@career-atlas/shared';
import { projectRoot, config } from '../config/index.js';
import { rawDb } from '../db/index.js';
import { executeImport } from './import.service.js';
import { buildAsyncPilotContext } from './async-pilot-context.js';
import * as contextModule from './async-pilot-context.js';
import { getKnowledgePointByCode } from './knowledge.service.js';
import { savePracticeAttempt, listPracticeAttempts, validatePracticeAttempt } from './practice.service.js';
import { savePointNote, saveCheckin, getNoteByCode } from './learning.service.js';
import { updateMaterialReadingProgress, listMaterialReadingProgress } from './knowledge-material-progress.service.js';
import { buildRelationDefinitions, syncKnowledgeRelations } from './knowledge-relations.service.js';
import { planNextRoute } from './learning/routes.js';
import { createAssessmentSession, getAssessmentSession } from './assessment.service.js';
import { asyncGradingSources } from './async-pilot-contract.js';
import { PRACTICE_SECTION_HEADINGS } from './learning-content.service.js';

const guide = (name: string) => readFileSync(resolve(projectRoot, 'docs/knowledge/chinese-guides', name), 'utf8');
const example = (id: string) => {
  const doc = guide('js-05-promise-errors-async-control-flow.md');
  const code = doc.match(new RegExp('```js example=' + id + '[^\\n]*\\n([\\s\\S]*?)\\n```'))?.[1];
  if (!code) throw new Error(`示例缺失 ${id}`);
  return code;
};
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

describe('异步试点的合同与兼容', () => {
  beforeAll(async () => { await executeImport(); });
  it('正文、目录与运行时的直接前置一致，无反向环', () => {
    const relations = buildRelationDefinitions().filter(r => r.type === 'PREREQUISITE');
    for (const node of ASYNC_PILOT_NODES.filter(n => ['PREJS-07', 'JS-04', 'JS-05'].includes(n.code))) {
      const direct = guide(node.guide).split('### 学习前先确认')[1]!.split(/\n### /)[0]!;
      const codes = [...direct.matchAll(/^- 直接前置：\[([A-Z]+-\d+)/gm)].map(m => m[1]);
      expect(codes).toEqual(node.prerequisites);
      if (node.kind === 'POINT') {
        const batch = node.code === 'JS-04' ? 'b02' : 'b03';
        const catalog = JSON.parse(readFileSync(resolve(projectRoot, `docs/knowledge/materials/${batch}.json`), 'utf8'));
        expect(catalog.chapters.find((chapter: {id:string}) => chapter.id === node.code).prerequisites).toEqual(node.prerequisites.map(code => { const n = ASYNC_PILOT_NODES.find(item => item.code === code)!; return `${n.guide}#${n.anchor}`; }));
      }
      const pointDeps = node.prerequisites.filter(c => ASYNC_PILOT_NODES.find(n => n.code === c)?.kind === 'POINT');
      expect(relations.filter(r => r.target === node.code).map(r => r.source).sort()).toEqual([...pointDeps].sort());
    }
    expect(relations.some(r => r.source === 'JS-05' && r.target === 'JS-04')).toBe(false);
    const states = new Map([['JS-01', 'DEFERRED'], ['JS-04', 'LEARNED'], ['JS-05', 'NOT_STARTED']] as const);
    expect(planNextRoute('JS-04', states)[0]?.code).toBe('JS-05');
    const blockedStates = new Map([['JS-01', 'LEARNED'], ['JS-04', 'DEFERRED'], ['JS-05', 'LEARNING']] as const);
    expect(planNextRoute('JS-05', blockedStates)[0]).toMatchObject({ code: 'JS-04', kind: 'PREREQUISITE' });
  });
  it('上下文使用完整机制小节，预算不足明确报告，未读取的外链不是正文', async () => {
    for (const code of ['JS-04', 'JS-05']) {
      const point = (await getKnowledgePointByCode(code))!;
      const context = buildAsyncPilotContext(code, point.studyMaterialMd)!;
      expect(context.complete).toBe(true);
      expect(context.used).toBeLessThanOrEqual(24_000);
      for (const section of context.sections) {
        expect(guide(ASYNC_PILOT_NODES.find(n => n.code === code)!.guide)).toContain(section.content);
        expect(section.truncated).toBe(false);
        expect((section.content.match(/^```/gm) ?? []).length % 2).toBe(0);
      }
      expect(buildAsyncPilotContext(code, point.studyMaterialMd, 100)?.complete).toBe(false);
      expect(buildAsyncPilotContext(code, '', 24_000)?.sections).toEqual([]);
    }
  });
  it('JS-04 成功任务按输入槽位汇总，并限制真正启动数量', async () => {
    const code = guide('js-04-async-promise-browser-event-loop.md').match(/```js example=js04-concurrency-limit\n([\s\S]*?)\n```/)![1]!;
    const definitions = code.slice(0, code.indexOf('let active = 0;'));
    async function run(source: string) {
      return new AsyncFunction(`${source}
        const controls = []; const started = []; const finished = []; let active = 0; let peak = 0;
        const tasks = [10,20,30,40].map((value, index) => () => new Promise(resolve => {
          started.push(index+1); active++; peak=Math.max(peak,active);
          controls[index] = () => { active--; finished.push(index+1); resolve(value); };
        }));
        const done = runLimited(tasks, 2);
        controls[1](); await Promise.resolve(); controls[2](); await Promise.resolve();
        controls[0](); controls[3](); const result = await done;
        return { started, finished, peak, active, result };
      `)();
    }
    const expected = { started: [1,2,3,4], finished: [2,3,1,4], peak: 2, active: 0, result: [10,20,30,40] };
    expect(await run(definitions)).toEqual(expected);
    expect(await run(definitions.replace('Math.min(limit, tasks.length)', 'tasks.length'))).not.toEqual(expected);
    expect(await run(definitions.replace('results[index] = await tasks[index]();', 'results.push(await tasks[index]());'))).not.toEqual(expected);
    const fn = await new AsyncFunction(`${definitions}; return runLimited;`)();
    expect(await fn([], 2)).toEqual([]);
    await expect(fn([], 0)).rejects.toThrow('正整数');
  });
  it('机制缺失时不发送语义评分请求，明确保存结构降级结论', async () => {
    const point = (await getKnowledgePointByCode('JS-05'))!;
    const incomplete = buildAsyncPilotContext('JS-05', point.studyMaterialMd, 1)!;
    const source = vi.spyOn(contextModule, 'buildAsyncPilotContext').mockReturnValue(incomplete);
    const network = vi.spyOn(globalThis, 'fetch');
    try {
      const result = await validatePracticeAttempt('JS-05', practiceActivityId('JS-05'), {
        submissionMd: PRACTICE_SECTION_HEADINGS.CODING.map(h => `# ${h}\n固定输入和可复核证据已保存，详见运行代码。`).join('\n'),
        code: 'const fixedInput=[]; const expected=[]; const actual=[]; console.assert(true);',
        executionOutput: 'fixedInput=[] expected=[] actual=[]', executionStatus: 'SUCCESS',
      });
      expect(network).not.toHaveBeenCalled();
      expect(result.validation.validationLevel).toBe('STRUCTURE_ONLY');
      expect(result.validation.summary).toContain('正文缺失或超出预算');
    } finally { source.mockRestore(); network.mockRestore(); }
  });
  it('正文取消示例区分正确实现与取消后领取、槽位错位、监听泄漏错误', async () => {
    const code = example('js05-controlled-group');
    async function run(source: string) {
      const output: string[] = [];
      await new AsyncFunction('console', source)({ log: (...args: unknown[]) => output.push(args.join(' ')) });
      return output;
    }
    const expected = ['1,2,3', 'cancelled,fulfilled,cancelled,skipped,skipped', '{"active":0,"peak":2,"listeners":0}'];
    expect(await run(code)).toEqual(expected);
    expect(await run(code.replace('!signal.aborted && next', 'next'))).not.toEqual(expected);
    expect(await run(code.replaceAll('results[index] =', 'results[next - 1] ='))).not.toEqual(expected);
    expect(await run(code.replace('listeners--;', ''))).not.toEqual(expected);
    const definitions = code.slice(0, code.indexOf('const group = controlledTasks(5);'));
    const result = await new AsyncFunction(`${definitions}
      const group = controlledTasks(5); const c = new AbortController();
      const done = runControlled(group.tasks, 2, c.signal);
      group.controls[0].succeed(1); await Promise.resolve();
      group.controls[1].succeed(2); await Promise.resolve();
      group.controls[2].fail(); await Promise.resolve();
      group.controls[4].succeed(5); await Promise.resolve();
      c.abort(0); const report = await done;
      return { report: report.map(x => x.status), started: group.started, stats: group.stats() };
    `)();
    expect(result).toEqual({ report: ['fulfilled', 'fulfilled', 'rejected', 'cancelled', 'fulfilled'], started: [1, 2, 3, 4, 5], stats: { active: 0, peak: 2, listeners: 0 } });
  });
  it('重导入保留身份、笔记、完成、暂缓、阅读、打卡与旧练习，新版另存', async () => {
    savePointNote('JS-04', '旧笔记：启动与等待分开');
    saveCheckin({ date: '2026-10-28', pointCodes: ['JS-04'], summaryMd: '旧打卡' });
    const node = ASYNC_PILOT_NODES.find(n => n.code === 'JS-04')!;
    updateMaterialReadingProgress(node.guide, node.anchor, 42);
    rawDb.prepare("UPDATE knowledge_points SET learning_state='LEARNED', mastery_level=3, current_focus=1, source_hash='old' WHERE code='JS-04'").run();
    rawDb.prepare("UPDATE knowledge_points SET learning_state='DEFERRED', defer_reason='稍后处理取消', source_hash='old' WHERE code='JS-05'").run();
    rawDb.prepare(`INSERT OR REPLACE INTO learning_practice_attempts (id, knowledge_point_code, activity_id, submission_md, code, execution_output, validation_json, status, created_at, updated_at) VALUES ('pilot-legacy', 'JS-04', 'strict-practice', '旧提交', '旧代码', '旧输出', '{"passed":true,"summary":"旧评分"}', 'COMPLETED', '2026-10-28', '2026-10-28')`).run();
    const snapshot = () => rawDb.prepare("SELECT id, code, learning_state, mastery_level, current_focus, defer_reason FROM knowledge_points WHERE code IN ('JS-04','JS-05') ORDER BY code").all();
    const created = await createAssessmentSession({ knowledgePointCode: 'JS-04', type: 'FIRST', durationMinutes: 30, masteryStage: 1, challengeMode: 'PRACTICE', challengeProfile: 'AUTO' });
    const legacyQuestion = JSON.stringify({ question: '旧题目快照', sourceBasis: ['旧题源'] });
    rawDb.prepare('UPDATE assessment_questions SET question_content=? WHERE session_id=?').run(legacyQuestion, created.session.id);
    rawDb.prepare("UPDATE assessment_sessions SET status='GRADED' WHERE id=?").run(created.session.id);
    rawDb.prepare("INSERT INTO assessment_results (id, session_id, verdict, confidence, feedback, created_at) VALUES (?, ?, 'PASS', '0.9', ?, '2026-10-28')").run('pilot-old-result', created.session.id, JSON.stringify({ summary: '旧挑战评分' }));
    const before = snapshot();
    await executeImport(); syncKnowledgeRelations();
    expect(snapshot()).toEqual(before);
    const history = await getAssessmentSession(created.session.id);
    expect(history.questions.every(q => q.questionContent === legacyQuestion)).toBe(true);
    expect(rawDb.prepare('SELECT verdict, feedback FROM assessment_results WHERE session_id=?').get(created.session.id)).toEqual({ verdict: 'PASS', feedback: JSON.stringify({ summary: '旧挑战评分' }) });
    expect(asyncGradingSources('JS-04', history.questions)?.rubric).toContain('12ms');
    expect(asyncGradingSources('JS-04', history.questions)?.studyMaterial).not.toContain('runControlled');
    expect(getNoteByCode('JS-04')?.originalMd).toContain('旧笔记');
    expect(listMaterialReadingProgress().find(r => r.guide === node.guide)?.progressPercent).toBe(42);
    expect(rawDb.prepare("SELECT summary_md FROM learning_checkins WHERE checkin_date='2026-10-28'").get()).toEqual({ summary_md: '旧打卡' });
    expect(() => savePracticeAttempt('JS-04', 'strict-practice', { submissionMd: '不能覆盖' })).toThrow('历史合同');
    savePracticeAttempt('JS-04', practiceActivityId('JS-04'), { submissionMd: '新草稿' });
    const legacy = listPracticeAttempts('JS-04').find(r => r.activityId === 'strict-practice')!;
    expect(legacy).toMatchObject({ submissionMd: '旧提交', status: 'COMPLETED', readOnly: true, contractVersion: 'async-v1' });
    expect(legacy.contractSnapshot).toContain('12ms');
    expect(legacy.validation.summary).toBe('旧评分');
  });
  it('新版挑战只保存一次完整依据，重评采用创建时快照而非当前文件', async () => {
    rawDb.prepare("UPDATE knowledge_points SET learning_state='LEARNED' WHERE code='JS-05'").run();
    const created = await createAssessmentSession({ knowledgePointCode: 'JS-05', type: 'FIRST', durationMinutes: 30, masteryStage: 1, challengeMode: 'PRACTICE', challengeProfile: 'AUTO' });
    const detail = await getAssessmentSession(created.session.id);
    const content = detail.questions.map(q => JSON.parse(q.questionContent));
    expect(content.filter(q => q.contractSnapshot)).toHaveLength(1);
    expect(content.every(q => q.contractVersion === 'async-v2')).toBe(true);
    const saved = content.find(q => q.contractSnapshot).contractSnapshot;
    const sources = asyncGradingSources('JS-05', detail.questions)!;
    expect(sources.rubric).toBe(saved.assessmentSpecMd);
    expect(sources.studyMaterial).toContain(example('js05-controlled-group'));
    expect(() => asyncGradingSources('JS-05', [{ questionContent: JSON.stringify({ contractVersion: 'async-v2' }) }])).toThrow('快照');
  });
  it('定时等待在预取消、在途取消和正常完成时释放资源', async () => {
    const source = example('js05-abortable-wait').split('const controller =')[0]!;
    const wait = new AsyncFunction(`${source}; return wait;`);
    const run = await wait();
    vi.useFakeTimers();
    try {
      const before = new AbortController(); before.abort(0);
      await expect(run(5000, before.signal)).rejects.toBe(0);
      expect(vi.getTimerCount()).toBe(0);
      const controller = new AbortController();
      const pending = run(5000, controller.signal).catch((reason: unknown) => reason);
      controller.abort('停止');
      expect(await pending).toBe('停止'); expect(vi.getTimerCount()).toBe(0);
      const normal = new AbortController();
      const remove = vi.spyOn(normal.signal, 'removeEventListener');
      const done = run(5, normal.signal);
      await vi.runAllTimersAsync(); expect(await done).toBe('等完了');
      expect(remove).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
    } finally { vi.useRealTimers(); }
  });
  it('过期成功与旧清理的代表性错误会改变正文的可观察结果', async () => {
    async function output(code: string) {
      const values: string[] = [];
      await new AsyncFunction('console', code)({ log: (...args: unknown[]) => values.push(args.join(' ')) });
      return values;
    }
    const stale = example('js04-stale-result');
    expect(await output(stale)).toEqual(['闭包的结果']);
    expect(await output(stale.replace('if (ownVersion !== version) return;', ''))).toEqual(['函数的结果']);
    const cleanup = example('js05-stale-cleanup');
    expect(await output(cleanup)).toEqual(['加载中', '结果：新内容']);
    expect(await output(cleanup.replace("ownVersion === version && state === '加载中'", "state === '加载中'"))).not.toEqual(['加载中', '结果：新内容']);
  });
  it('捕获实际发送的上下文；模拟响应明确不算真实模型验收', async () => {
    const point = (await getKnowledgePointByCode('JS-05'))!;
    const mock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('data: ' + JSON.stringify({ choices: [{ delta: { content: JSON.stringify({ passed: false, summary: '模拟：需核对取消证据', checks: [], nextAction: '补充证据' }) } }] }) + '\n\ndata: [DONE]\n\n'));
    const key = config.DEEPSEEK_API_KEY;
    config.DEEPSEEK_API_KEY = 'isolated-test-placeholder';
    try {
      await validatePracticeAttempt('JS-05', practiceActivityId('JS-05'), { submissionMd: PRACTICE_SECTION_HEADINGS.CODING.map(h => `# ${h}\n固定任务组的输入、预期、实际与证据见代码和 trace。`).join('\n'), code: 'const fixedInput=[]; const expected=[]; const actual=[]; console.assert(true);', executionOutput: 'fixedInput=[] expected=[] actual=[]', executionStatus: 'SUCCESS' });
      expect(mock).toHaveBeenCalledOnce();
      const body = JSON.parse(String(mock.mock.calls[0]![1]?.body));
      const payload = JSON.parse(body.messages[1].content);
      expect(payload.contextCoverage.complete).toBe(true);
      expect(payload.materialContext.find((s: {title:string}) => s.title === '把领取取消和结果槽位放进同一个协议').content).toContain(example('js05-controlled-group'));
      expect(payload.task).toBe(point.learningActivities.find(a => a.deliveryMode === 'WORKSPACE')!.task);
      const dir = resolve(projectRoot, 'tmp/async-pilot-evidence'); mkdirSync(dir, { recursive: true });
      writeFileSync(resolve(dir, 'practice-request-mock.json'), JSON.stringify({ mode: '模拟响应；仅检查真实构造的请求体', body }, null, 2));
    } finally { config.DEEPSEEK_API_KEY = key; mock.mockRestore(); }
  });
});
