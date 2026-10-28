import { effectScope, type EffectScope } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, type AssessmentAnswer, type AssessmentDetail, type AssessmentResult } from '@/api/client';
import { runBrowserCode } from '@/utils/browser-code-runner';
import { useAssessmentSession } from './useAssessmentSession';

vi.mock('@/utils/browser-code-runner', () => ({ runBrowserCode: vi.fn() }));
const now = '2026-10-13T00:00:00Z';
function answer(questionId: string, answerContent = '旧答案'): AssessmentAnswer {
  return { id: questionId, sessionId: 'session', questionId, answerContent, deterministicResult: null, answeredAt: now, createdAt: now, updatedAt: now };
}
function detail(status: AssessmentDetail['session']['status'] = 'IN_PROGRESS'): AssessmentDetail {
  return {
    session: {
      id: 'session', knowledgePointCode: 'JS-01', assessmentType: 'FIRST', status, durationMinutes: 30,
      masteryStage: 1, challengeMode: 'MIXED', challengeProfile: 'CODING', assistanceLevel: 0,
      startedAt: now, submittedAt: null, gradedAt: null, resultId: null, provider: 'fake', model: 'test', createdAt: now, updatedAt: now,
    },
    questions: ['q1', 'q2'].map((id, orderIndex) => ({
      id, sessionId: 'session', questionType: orderIndex === 0 ? 'CODE_WRITE' : 'ESSAY', dimension: 'practice',
      questionContent: JSON.stringify({ question: id, language: 'javascript' }), maxScore: 10, orderIndex, createdAt: now,
    })),
    answers: [answer('q1'), answer('q2')],
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(resolvePromise => { resolve = resolvePromise; });
  return { promise, resolve };
}

describe('掌握挑战保存与提交流程', () => {
  let scope: EffectScope;
  beforeEach(() => { scope = effectScope(); vi.useFakeTimers(); });
  afterEach(() => { scope.stop(); vi.restoreAllMocks(); vi.useRealTimers(); });

  async function createSession() {
    vi.spyOn(apiClient, 'getAssessment').mockResolvedValue(detail());
    const session = scope.run(() => useAssessmentSession('session'))!;
    await session.load();
    session.answers.value = { q1: '最新答案 1', q2: '最新答案 2' };
    return session;
  }
  function saveSuccessfully() {
    return vi.spyOn(apiClient, 'saveAssessmentAnswer').mockImplementation(async (_id, questionId, content) => answer(questionId, content));
  }
  async function submit(session: ReturnType<typeof useAssessmentSession>) {
    expect(session.requestSubmit()).toBe(true);
    await session.confirmPendingAction();
  }

  it('任何答案保存失败都不锁卷、不启动评分，保留全部编辑内容', async () => {
    const session = await createSession();
    vi.spyOn(apiClient, 'saveAssessmentAnswer').mockImplementation(async (_id, questionId, content) => {
      if (questionId === 'q1') throw new Error('存储暂时不可用');
      return answer(questionId, content);
    });
    const lock = vi.spyOn(apiClient, 'submitAssessment');
    const grade = vi.spyOn(apiClient, 'gradeAssessmentStream');
    await submit(session);
    expect(lock).not.toHaveBeenCalled();
    expect(grade).not.toHaveBeenCalled();
    expect(apiClient.getAssessment).toHaveBeenCalledOnce();
    expect(session.answers.value).toEqual({ q1: '最新答案 1', q2: '最新答案 2' });
    expect(session.error.value).toContain('答卷尚未提交');
    expect(session.detail.value?.session.status).toBe('IN_PROGRESS');
    expect(session.busy.value).toBe(false);
  });

  it('等待全部答案写入成功后才锁卷，评分失败刷新时保留主错误和当前输入', async () => {
    const session = await createSession();
    const first = deferred<AssessmentAnswer>();
    const second = deferred<AssessmentAnswer>();
    const started = deferred<void>();
    let calls = 0;
    vi.spyOn(apiClient, 'saveAssessmentAnswer').mockImplementation((_id, questionId) => {
      if (++calls === 2) started.resolve();
      return questionId === 'q1' ? first.promise : second.promise;
    });
    const lock = vi.spyOn(apiClient, 'submitAssessment').mockResolvedValue(detail('SUBMITTED').session);
    vi.spyOn(apiClient, 'gradeAssessmentStream').mockRejectedValue(new Error('模型连接失败'));
    vi.mocked(apiClient.getAssessment).mockResolvedValue(detail('ERROR'));
    const submitting = submit(session);
    await started.promise;
    expect(lock).not.toHaveBeenCalled();
    first.resolve(answer('q1'));
    await Promise.resolve();
    expect(lock).not.toHaveBeenCalled();
    second.resolve(answer('q2'));
    await submitting;
    expect(lock).toHaveBeenCalledOnce();
    expect(session.error.value).toBe('模型连接失败');
    expect(session.answers.value.q1).toBe('最新答案 1');
    expect(session.detail.value?.session.status).toBe('ERROR');
  });

  it('提交响应失败时刷新真实状态，仍保留用户当前答案与错误', async () => {
    const session = await createSession();
    saveSuccessfully();
    vi.spyOn(apiClient, 'submitAssessment').mockRejectedValue(new Error('提交响应中断'));
    vi.mocked(apiClient.getAssessment).mockResolvedValue(detail('SUBMITTED'));
    await submit(session);
    expect(session.detail.value?.session.status).toBe('SUBMITTED');
    expect(session.error.value).toBe('提交响应中断');
    expect(session.answers.value.q1).toBe('最新答案 1');
  });

  it('已提交但尚未判题的会话可以继续初评，不调用仅适用于已判题的重评接口', async () => {
    const session = await createSession();
    session.detail.value!.session.status = 'SUBMITTED';
    vi.mocked(apiClient.getAssessment).mockResolvedValue(detail('SUBMITTED'));
    const grade = vi.spyOn(apiClient, 'gradeAssessmentStream').mockRejectedValue(new Error('服务未配置'));
    const regrade = vi.spyOn(apiClient, 'regradeAssessmentStream');
    session.pendingConfirmation.value = 'REGRADE';
    await session.confirmPendingAction();
    expect(grade).toHaveBeenCalledOnce();
    expect(regrade).not.toHaveBeenCalled();
    expect(session.error.value).toBe('服务未配置');
  });

  it('同一题的两个不同写入按顺序完成，避免并发插入和旧内容覆盖新内容', async () => {
    const session = await createSession();
    const first = deferred<AssessmentAnswer>();
    const started = deferred<void>();
    const save = vi.spyOn(apiClient, 'saveAssessmentAnswer')
      .mockImplementationOnce(() => { started.resolve(); return first.promise; })
      .mockImplementationOnce(async (_id, questionId, content) => answer(questionId, content));
    const oldSave = session.save('q1');
    await started.promise;
    session.answers.value.q1 = '再次修改';
    const newSave = session.save('q1');
    expect(save).toHaveBeenCalledOnce();
    first.resolve(answer('q1'));
    await Promise.all([oldSave, newSave]);
    expect(save.mock.calls.map(call => call[2])).toEqual(['最新答案 1', '再次修改']);
  });

  it('失焦和提交保存同一份答案时复用进行中的写入', async () => {
    const session = await createSession();
    const pending = deferred<AssessmentAnswer>();
    const started = deferred<void>();
    const save = vi.spyOn(apiClient, 'saveAssessmentAnswer').mockImplementation((_id, questionId, content) => {
      if (questionId === 'q1') { started.resolve(); return pending.promise; }
      return Promise.resolve(answer(questionId, content));
    });
    vi.spyOn(apiClient, 'submitAssessment').mockRejectedValue(new Error('测试锁卷失败'));
    const blurred = session.save('q1');
    await started.promise;
    const submitting = submit(session);
    pending.resolve(answer('q1'));
    await Promise.all([blurred, submitting]);
    expect(save.mock.calls.filter(call => call[1] === 'q1')).toHaveLength(1);
  });

  it('读取被新请求替代后，晚到结果不能覆盖新答卷', async () => {
    const session = await createSession();
    const old = deferred<AssessmentDetail>();
    const current = deferred<AssessmentDetail>();
    const get = vi.mocked(apiClient.getAssessment).mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    const oldLoad = session.load();
    const newLoad = session.load();
    const next = detail(); next.session.knowledgePointCode = 'JS-02';
    current.resolve(next); await newLoad;
    old.resolve(detail()); await oldLoad;
    expect(get.mock.calls[1]?.[1]?.aborted).toBe(true);
    expect(session.detail.value?.session.knowledgePointCode).toBe('JS-02');
    expect(session.loading.value).toBe(false);
  });

  it('页面离开时写入继续完成，随后不再锁卷或启动评分', async () => {
    const session = await createSession();
    const pending = deferred<AssessmentAnswer>();
    const started = deferred<void>();
    vi.spyOn(apiClient, 'saveAssessmentAnswer').mockImplementation(() => { started.resolve(); return pending.promise; });
    const lock = vi.spyOn(apiClient, 'submitAssessment');
    const grade = vi.spyOn(apiClient, 'gradeAssessmentStream');
    const submitting = submit(session);
    await started.promise;
    scope.stop();
    pending.resolve(answer('q1'));
    await submitting;
    expect(lock).not.toHaveBeenCalled();
    expect(grade).not.toHaveBeenCalled();
  });

  it('提示任务互斥，销毁作用域后忽略迟到内容与帮助等级', async () => {
    const session = await createSession();
    const pending = deferred<Awaited<ReturnType<typeof apiClient.revealAssessmentHintStream>>>();
    const hint = vi.spyOn(apiClient, 'revealAssessmentHintStream').mockReturnValue(pending.promise);
    const revealing = session.revealHint('q1', 'HINT');
    await session.revealHint('q2', 'EXPLAIN');
    expect(hint).toHaveBeenCalledOnce();
    expect(session.requestSubmit()).toBe(false);
    scope.stop();
    const call = hint.mock.calls[0]!;
    expect(call[4]?.aborted).toBe(true);
    call[3]('晚到提示', '晚到提示');
    pending.resolve({ kind: 'HINT', level: 2, text: '晚到提示', source: 'AI', independenceImpact: '记录帮助' });
    await revealing;
    expect(session.revealedHints.value.q1).toBeUndefined();
    expect(session.detail.value?.session.assistanceLevel).toBe(0);
    expect(session.streamingHints.value.q1?.text).toBe('');
  });

  it('代码自检结束时答案已变化，不把旧执行记录保存到新代码下', async () => {
    const session = await createSession();
    const pending = deferred<Awaited<ReturnType<typeof runBrowserCode>>>();
    vi.mocked(runBrowserCode).mockReturnValueOnce(pending.promise);
    const save = vi.spyOn(apiClient, 'saveAssessmentAnswer');
    const running = session.runQuestionCode(session.questions.value[0]!);
    session.answers.value.q1 = '更新后的代码';
    pending.resolve({ status: 'SUCCESS', output: '', durationMs: 1 });
    await running;
    expect(save).not.toHaveBeenCalled();
    expect(session.codeExecutions.value.q1).toBeUndefined();
    expect(session.error.value).toContain('代码已修改');
  });

  it('销毁后忽略评分的进度、思考与最终结果', async () => {
    const session = await createSession();
    saveSuccessfully();
    vi.spyOn(apiClient, 'submitAssessment').mockResolvedValue(detail('SUBMITTED').session);
    const pending = deferred<Awaited<ReturnType<typeof apiClient.gradeAssessmentStream>>>();
    const started = deferred<void>();
    const grade = vi.spyOn(apiClient, 'gradeAssessmentStream').mockImplementation(() => { started.resolve(); return pending.promise; });
    const submitting = submit(session);
    await started.promise;
    const progress = session.aiProgress.value;
    scope.stop();
    const call = grade.mock.calls[0]!;
    expect(call[2]?.aborted).toBe(true);
    call[1]('晚到进度', 99);
    call[3]?.('晚到思考', '晚到思考');
    const result: AssessmentResult = {
      id: 'result', sessionId: 'session', principlesScore: 0, practiceScore: 0, troubleshootingScore: 0,
      communicationScore: 0, totalScore: 0, verdict: 'FAIL', confidence: '1', criticalFailures: null, weaknesses: null, feedback: null, createdAt: now,
    };
    pending.resolve({ session: detail('GRADED').session, result, knowledgePointUpdated: false, retestEventCreated: false, reviewEventCreated: false });
    await submitting;
    expect(session.aiProgress.value).toBe(progress);
    expect(session.gradingThinking.value).toBe('');
    expect(session.result.value).toBeNull();
  });
});
