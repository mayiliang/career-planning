import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { executeImport } from './import.service.js';
import { rawDb } from '../db/index.js';
import { config } from '../config/index.js';
import {
  acceptOrganizedNote,
  getNextBranches,
  getLearningWorkspace,
  getNoteByCode,
  listNotes,
  markPointLearned,
  organizePointNoteStream,
  organizePointNote,
  extractPartialJsonString,
  saveCheckin,
  savePointNote,
  setCurrentLearningPoint,
} from './learning.service.js';
import { syncKnowledgeRelations } from './knowledge-relations.service.js';
import { getKnowledgePointByCode, getKnowledgePoints } from './knowledge.service.js';
import { buildQuestionAwareHint, createAssessmentSession, getAssessmentSession, startAssessmentSession } from './assessment.service.js';
import { listPracticeAttempts, mergePracticeChecks, validatePracticeAttempt } from './practice.service.js';
import { extractStrictAssessmentTasks, PRACTICE_SECTION_HEADINGS } from './learning-content.service.js';

const code = 'WEB-01';

describe('自主学习、笔记版本与打卡', () => {
  beforeAll(async () => {
    await executeImport();
    syncKnowledgeRelations();
    rawDb.prepare("DELETE FROM knowledge_note_versions WHERE note_id IN (SELECT id FROM knowledge_notes WHERE knowledge_point_code = ?)").run(code);
    rawDb.prepare('DELETE FROM knowledge_notes WHERE knowledge_point_code = ?').run(code);
    rawDb.prepare("UPDATE knowledge_points SET summary = NULL, learning_state = 'NOT_STARTED', mastery_level = 0, current_focus = 0 WHERE code = ?").run(code);
  });

  afterAll(() => {
    rawDb.prepare('DELETE FROM learning_checkins').run();
    rawDb.prepare("DELETE FROM knowledge_note_versions WHERE note_id IN (SELECT id FROM knowledge_notes WHERE knowledge_point_code = ?)").run(code);
    rawDb.prepare('DELETE FROM knowledge_notes WHERE knowledge_point_code = ?').run(code);
  });

  it('每次保存都保留历史，最新原始笔记同时镜像旧字段', () => {
    savePointNote(code, '第一版：语义元素优先。');
    const note = savePointNote(code, '第二版：语义元素优先，并正确关联 label。');
    expect(note.originalMd).toContain('第二版');
    expect(note.versions).toHaveLength(2);
    const legacy = rawDb.prepare('SELECT summary FROM knowledge_points WHERE code = ?').get(code) as { summary: string };
    expect(legacy.summary).toBe(note.originalMd);
    const first = rawDb.prepare("SELECT content_md AS contentMd FROM knowledge_note_versions WHERE note_id = ? AND version_no = 1").get(note.id) as { contentMd: string };
    expect(first.contentMd).toContain('第一版');
  });

  it('AI 整理稿与采用动作都不覆盖原始笔记', async () => {
    const original = getNoteByCode(code)!.originalMd;
    const previousKey = config.DEEPSEEK_API_KEY;
    config.DEEPSEEK_API_KEY = '';
    const draft = await organizePointNote(code);
    config.DEEPSEEK_API_KEY = previousKey;
    expect(draft.organizedMd).toBeTruthy();
    expect(draft.originalMd).toBe(original);
    const accepted = acceptOrganizedNote(code);
    expect(accepted.activeVersionSource).toBe('ORGANIZED');
    expect(accepted.originalMd).toBe(original);
    expect(accepted.versions.some((item: { source: string }) => item.source === 'AI_ACCEPTED')).toBe(true);
  });

  it('AI 整理流会逐段返回 Markdown，并只在完成后保存候选稿', async () => {
    const previousKey = config.DEEPSEEK_API_KEY;
    config.DEEPSEEK_API_KEY = '';
    const chunks: string[] = [];
    const result = await organizePointNoteStream(code, (delta) => chunks.push(delta));
    config.DEEPSEEK_API_KEY = previousKey;
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join('')).toBe(result.organizedMd);
    expect(result.originalMd).toContain('第二版');
  });

  it('AI 上游被中止时自动安全降级，不向用户暴露英文 AbortError', async () => {
    const previousKey = config.DEEPSEEK_API_KEY;
    config.DEEPSEEK_API_KEY = 'test-key';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new DOMException('This operation was aborted', 'AbortError'));
    const statuses: string[] = [];
    try {
      const result = await organizePointNoteStream(code, () => {}, undefined, (status) => statuses.push(status));
      expect(result.generationMode).toBe('LOCAL_FALLBACK');
      expect(result.generationNotice).toContain('AI 请求被意外中止');
      expect(result.organizedMd).not.toContain('This operation was aborted');
      expect(statuses.at(-1)).toContain('安全排版稿');
    } finally {
      fetchMock.mockRestore();
      config.DEEPSEEK_API_KEY = previousKey;
    }
  });

  it('AI 支持推理流时会把 reasoning_content 与最终 Markdown 分开输出', async () => {
    const previousKey = config.DEEPSEEK_API_KEY;
    config.DEEPSEEK_API_KEY = 'test-key';
    const frames = [
      { choices: [{ delta: { reasoning_content: '先核对学习资料。' } }] },
      { choices: [{ delta: { content: '{"organizedMarkdown":"# 整理稿","review":{"sourceGrounded":true}}' } }] },
    ].map((packet) => `data: ${JSON.stringify(packet)}\n\n`).join('') + 'data: [DONE]\n\n';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(frames, { status: 200 }));
    const thinking: string[] = [];
    const content: string[] = [];
    try {
      const result = await organizePointNoteStream(code, (delta) => content.push(delta), undefined, () => {}, (delta) => thinking.push(delta));
      expect(thinking.join('')).toBe('先核对学习资料。');
      expect(content.join('')).toBe('# 整理稿');
      expect(result.generationMode).toBe('AI');
    } finally {
      fetchMock.mockRestore();
      config.DEEPSEEK_API_KEY = previousKey;
    }
  });

  it('思考完成但最终正文被截断时会清空残稿并自动重试最终正文', async () => {
    const previousKey = config.DEEPSEEK_API_KEY;
    config.DEEPSEEK_API_KEY = 'test-key';
    const incompleteFrames = [
      { choices: [{ delta: { reasoning_content: '核对后准备完整整理稿。' } }] },
      { choices: [{ delta: { content: '{"organizedMarkdown":"# 未完成' } }] },
    ].map((packet) => `data: ${JSON.stringify(packet)}\n\n`).join('') + 'data: [DONE]\n\n';
    const completedFrames = `data: ${JSON.stringify({ choices: [{ delta: { content: '{"organizedMarkdown":"# 重试后的完整整理稿","review":{"sourceGrounded":true}}' } }] })}\n\ndata: [DONE]\n\n`;
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(incompleteFrames, { status: 200 }))
      .mockResolvedValueOnce(new Response(completedFrames, { status: 200 }));
    const content: string[] = [];
    let resets = 0;
    try {
      const result = await organizePointNoteStream(code, (delta) => content.push(delta), undefined, () => {}, () => {}, () => { resets += 1; });
      expect(resets).toBe(1);
      expect(content.at(-1)).toContain('重试后的完整整理稿');
      expect(result.organizedMd).toBe('# 重试后的完整整理稿');
      expect(result.generationMode).toBe('AI');
      const retryRequest = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)) as { thinking?: { type?: string } };
      expect(retryRequest.thinking?.type).toBe('disabled');
    } finally {
      fetchMock.mockRestore();
      config.DEEPSEEK_API_KEY = previousKey;
    }
  });

  it('能从尚未生成完的 JSON 中增量解码 Markdown 字符串', () => {
    const partial = extractPartialJsonString('{"organizedMarkdown":"# 标题\\n\\n第一段', 'organizedMarkdown');
    expect(partial).toEqual({ value: '# 标题\n\n第一段', complete: false });
    const complete = extractPartialJsonString('{"organizedMarkdown":"含有 \\"代码\\"","review":{}}', 'organizedMarkdown');
    expect(complete).toEqual({ value: '含有 "代码"', complete: true });
  });

  it('笔记默认按知识体系顺序返回，并支持自定义排序方式', () => {
    savePointNote('TS-01', 'TypeScript 笔记');
    savePointNote('JS-02', 'JavaScript 笔记');
    const defaultCodes = listNotes().map((item) => item.knowledgePointCode);
    expect(defaultCodes.indexOf('JS-02')).toBeLessThan(defaultCodes.indexOf('TS-01'));
    expect(listNotes().find((item) => item.knowledgePointCode === 'JS-02')?.versions).toHaveLength(1);
    const codeCodes = listNotes(undefined, undefined, 'code_asc').map((item) => item.knowledgePointCode);
    expect(codeCodes).toEqual([...codeCodes].sort((left, right) => left.localeCompare(right, 'zh-CN', { numeric: true })));
    for (const target of ['TS-01', 'JS-02']) {
      rawDb.prepare('DELETE FROM knowledge_note_versions WHERE note_id IN (SELECT id FROM knowledge_notes WHERE knowledge_point_code = ?)').run(target);
      rawDb.prepare('DELETE FROM knowledge_notes WHERE knowledge_point_code = ?').run(target);
    }
  });

  it('学习完成与掌握等级互相独立', () => {
    setCurrentLearningPoint(code);
    let row = rawDb.prepare('SELECT learning_state AS learningState, mastery_level AS masteryLevel FROM knowledge_points WHERE code = ?').get(code) as { learningState: string; masteryLevel: number };
    expect(row).toEqual({ learningState: 'LEARNING', masteryLevel: 0 });
    markPointLearned(code);
    row = rawDb.prepare('SELECT learning_state AS learningState, mastery_level AS masteryLevel FROM knowledge_points WHERE code = ?').get(code) as typeof row;
    expect(row).toEqual({ learningState: 'LEARNED', masteryLevel: 0 });
    expect(getLearningWorkspace().current?.code).toBe(code);
  });

  it('打卡独立于每日计划，并能关联多个知识点', () => {
    const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Hong_Kong', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const record = saveCheckin({ date: today, pointCodes: [code, 'JS-01'], summaryMd: '今天按实际进度学习。', actualMinutes: 75 });
    expect(record.points.map((item: { code: string }) => item.code)).toEqual([code, 'JS-01']);
    expect(getLearningWorkspace().todayCheckin?.summaryMd).toBe('今天按实际进度学习。');
  });

  it('一条路线没有结束时只给唯一下一步，不提前暴露关系分支', () => {
    rawDb.prepare("UPDATE knowledge_points SET learning_state = 'NOT_STARTED', current_focus = 0, learned_at = NULL WHERE code IN ('JS-01','JS-02','TS-01','A11Y-01','UX-01')").run();
    setCurrentLearningPoint('JS-01');
    markPointLearned('JS-01');
    const workspace = getLearningWorkspace();
    expect(workspace.current?.code).toBe('JS-01');
    expect(workspace.current?.learningState).toBe('LEARNED');
    expect(workspace.suggested?.code).toBe('JS-02');
    expect(getNextBranches('JS-01')[0]?.code).toBe('JS-02');
    const a11yBranches = getNextBranches('A11Y-01');
    expect(a11yBranches).toHaveLength(1);
    expect(a11yBranches[0]?.code).toBe('BROWSER-01');
    expect(a11yBranches[0]?.navigationKind).toBe('CONTINUE');
    expect(a11yBranches.some((item) => item.code === 'UX-01')).toBe(false);
    const trackChoices = getNextBranches('SEC-05');
    expect(trackChoices.length).toBeGreaterThan(1);
    expect(trackChoices.every((item) => item.navigationKind === 'TRACK_CHOICE')).toBe(true);
  });

  it('学习时间只展示有实际任务的活动，纯理论知识不再虚构第二份项目', async () => {
    const coding = await getKnowledgePointByCode('JS-01');
    expect(coding?.learningActivities.filter((item) => item.deliveryMode === 'WORKSPACE')).toHaveLength(1);
    const codeActivity = coding?.learningActivities.find((item) => item.workspaceMode === 'CODE');
    expect(codeActivity?.deliveryMode).toBe('WORKSPACE');
    expect(codeActivity?.outputRequirements.length).toBeGreaterThanOrEqual(3);
    expect(codeActivity?.materialReferences.length).toBeGreaterThan(0);
    const governance = await getKnowledgePointByCode('AIGOV-01');
    expect(governance?.learningActivities.filter((item) => item.deliveryMode === 'WORKSPACE')).toHaveLength(1);
    expect(governance?.challengeProfile).toBe('DESIGN_CASE');
  });

  it('223 个知识点均有唯一、profile 特异且精确复用首考题 3/4 的站内练习合同', async () => {
    const { items, total } = await getKnowledgePoints({});
    expect(total).toBe(223);
    const problems: string[] = [];
    const explicitProfileProblems: string[] = [];
    for (const item of items) {
      const detail = await getKnowledgePointByCode(item.code);
      if (!detail) {
        problems.push(`${item.code}:详情不存在`);
        continue;
      }
      const reading = detail?.learningActivities.find((activity) => activity.type === 'READING');
      const workspaces = detail?.learningActivities.filter((activity) => activity.deliveryMode === 'WORKSPACE') ?? [];
      if (reading?.optional !== false) problems.push(`${item.code}:阅读活动被标为可选`);
      if (!reading?.materialReferences.length) problems.push(`${item.code}:阅读活动缺少资料引用`);
      if (workspaces.length !== 1) problems.push(`${item.code}:可提交练习数量为${workspaces.length}，必须唯一`);
      const strictTasks = extractStrictAssessmentTasks(detail.assessmentSpecMd);
      if (!strictTasks) problems.push(`${item.code}:严格考核未解析出题3/题4`);
      if (!/(?:^|\n)\s*(?:[-*]\s*)?挑战类型\s*[：:]\s*(?:THEORY_ONLY|EXAMPLE_DRIVEN|CODING|DEBUGGING|TOOL_OPERATION|DESIGN_CASE)\s*[；;]?/.test(detail.assessmentSpecMd)) {
        explicitProfileProblems.push(item.code);
      }
      for (const activity of workspaces) {
        if (activity.task.length <= 20) problems.push(`${item.code}:练习任务仅${activity.task.length}字符`);
        if (activity.task !== strictTasks?.minimumOutput) problems.push(`${item.code}:练习未精确复用本点首考题3`);
        if (activity.failureFixture !== strictTasks?.constrainedDebugging) problems.push(`${item.code}:练习未精确复用本点首考题4`);
        if (activity.outputRequirements.length < 3) problems.push(`${item.code}:练习输出合同不完整`);
        if (activity.verificationChecklist.length < 5 || activity.vetoItems.length < 2) problems.push(`${item.code}:练习验证或否决合同不完整`);
        const headings = PRACTICE_SECTION_HEADINGS[detail.challengeProfile];
        if (!headings.every((heading) => activity.submissionTemplate?.includes(`# ${heading}`))) problems.push(`${item.code}:未使用${detail.challengeProfile}的固定提交栏目`);
        if (detail.challengeProfile === 'CODING' && (!activity.starterCode?.includes('fixedInput') || activity.starterCode.includes("'PASS'"))) problems.push(`${item.code}:编码合同仍含通用状态模板`);
        for (const source of activity.materialReferences) {
          if (!source.url) continue;
          if (!/^(?:https?:\/\/|\/knowledge\/materials\/)/.test(source.url)) {
            problems.push(`${item.code}:练习资料无法打开 ${source.url}`);
          }
        }
      }
    }
    expect(problems, '站内练习必须逐点绑定本点题源、最小产出与可验证合同').toEqual([]);
    expect(explicitProfileProblems, '223 个知识点必须显式声明挑战类型，不能只依赖标题启发式').toEqual([]);
  });

  it('无 AI 时只能通过固定合同的结构验证，不能声称语义正确', async () => {
    const previousKey = config.DEEPSEEK_API_KEY;
    config.DEEPSEEK_API_KEY = '';
    const detail = await getKnowledgePointByCode('AIGOV-01');
    const activity = detail!.learningActivities.find((item) => item.deliveryMode === 'WORKSPACE')!;
    const submissionMd = (activity.submissionTemplate ?? '').replace(/# ([^\n]+)\n/g, (_all, heading) => `# ${heading}\n已填写 ${heading} 的具体、可复核证据。\n`);
    const result = await validatePracticeAttempt('AIGOV-01', activity.id, { submissionMd });
    config.DEEPSEEK_API_KEY = previousKey;
    expect(result.status).toBe('COMPLETED');
    expect(result.validation?.passed).toBe(true);
    expect(result.validation?.validationLevel).toBe('STRUCTURE_ONLY');
    expect(result.validation?.summary).not.toContain('语义正确');
    expect(listPracticeAttempts('AIGOV-01')).toHaveLength(1);
    rawDb.prepare("DELETE FROM learning_practice_attempts WHERE knowledge_point_code = 'AIGOV-01'").run();
  });

  it('本地规则拒绝空栏目和未执行的编码证据，AI 不得覆盖本地失败', async () => {
    const previousKey = config.DEEPSEEK_API_KEY;
    config.DEEPSEEK_API_KEY = '';
    const detail = await getKnowledgePointByCode('JS-01');
    const activity = detail!.learningActivities.find((item) => item.deliveryMode === 'WORKSPACE')!;
    const result = await validatePracticeAttempt('JS-01', activity.id, {
      submissionMd: activity.submissionTemplate ?? '', code: activity.starterCode ?? '', executionStatus: 'NOT_RUN', executionOutput: '',
    });
    config.DEEPSEEK_API_KEY = previousKey;
    expect(result.status).toBe('DRAFT');
    expect(result.validation?.passed).toBe(false);
    expect(result.validation?.checks.some((check: { label: string; passed: boolean }) => check.label.includes('已填写固定栏目') && !check.passed)).toBe(true);
    rawDb.prepare("DELETE FROM learning_practice_attempts WHERE knowledge_point_code = 'JS-01'").run();
  });

  it('AI 的同名通过项不能覆盖本地门禁失败', () => {
    expect(mergePracticeChecks(
      [{ label: '脚本已在站内执行成功', passed: false }],
      [{ label: '脚本已在站内执行成功', passed: true }, { label: 'AI 语义核对', passed: true }],
    )).toEqual([
      { label: '脚本已在站内执行成功', passed: false },
      { label: 'AI 语义核对', passed: true },
    ]);
  });

  it('重复开始掌握挑战会恢复既有会话而不是抛出英文错误', async () => {
    markPointLearned(code);
    rawDb.prepare('DELETE FROM assessment_sessions WHERE knowledge_point_code = ?').run(code);
    const request = { knowledgePointCode: code, type: 'FIRST' as const, durationMinutes: 35, masteryStage: 1, challengeMode: 'THEORY' as const, challengeProfile: 'EXAMPLE_DRIVEN' as const };
    const first = await createAssessmentSession(request);
    const detail = await getAssessmentSession(first.session.id);
    const firstQuestion = JSON.parse(detail.questions[0]!.questionContent) as Record<string, unknown>;
    expect(firstQuestion.knowledgeTags).toBeInstanceOf(Array);
    expect(firstQuestion.answerRequirements).toBeInstanceOf(Array);
    expect(firstQuestion.answerFormat).toBeTruthy();
    expect(firstQuestion.materialReferences).toBeInstanceOf(Array);
    await startAssessmentSession(first.session.id);
    const resumed = await createAssessmentSession({ ...request, masteryStage: 2 });
    expect(resumed.resumedExisting).toBe(true);
    expect(resumed.session.id).toBe(first.session.id);
    expect(resumed.resumeMessage).toContain('已保留原题目和答案');
    rawDb.prepare('DELETE FROM assessment_sessions WHERE knowledge_point_code = ?').run(code);
  });

  it('离线提示也会读取具体题目和知识点，而不是返回固定废话', () => {
    const hint = buildQuestionAwareHint('OUTLINE', {
      question: '列出 JS-01 的三个关键概念并说明作用。',
      sourceHint: '依据学习资料回答。',
    }, '执行上下文、作用域与闭包');
    expect(hint).toContain('执行上下文');
    expect(hint).toContain('作用域');
    expect(hint).toContain('闭包');
  });
});
