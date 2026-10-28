/** 掌握挑战读写与执行流程；页面只负责展示合同、答案和反馈。 */
import { computed, onScopeDispose, ref } from 'vue';
import { apiClient, type AssessmentAnswer, type AssessmentDetail, type AssessmentResult } from '@/api/client';
import { runBrowserCode } from '@/utils/browser-code-runner';
import { createLatestRequest } from '@/utils/latest-request';
import { executionPayload, parseAssessmentQuestions, parseStoredExecution, type HintKind, type LocalExecution, type QuestionView } from './model';

export function useAssessmentSession(sessionId: string) {
  const detail = ref<AssessmentDetail | null>(null);
  const result = ref<AssessmentResult | null>(null);
  const answers = ref<Record<string, string>>({});
  const loading = ref(true);
  const busy = ref(false);
  const error = ref<string | null>(null);
  const savedQuestionId = ref<string | null>(null);
  const revealedHints = ref<Record<string, Array<{ kind: string; level: number; text: string; source: 'AI' | 'RULE'; independenceImpact: string; thinking?: string }>>>({});
  const hintBusy = ref<string | null>(null);
  const streamingHints = ref<Record<string, { kind: string; text: string; thinking: string } | undefined>>({});
  const aiProgress = ref('');
  const aiReceivedChars = ref(0);
  const gradingThinking = ref('');
  const pendingConfirmation = ref<'SUBMIT' | 'REGRADE' | 'CANCEL' | null>(null);
  const codeExecutions = ref<Record<string, LocalExecution>>({});
  const runningQuestionId = ref<string | null>(null);
  const questions = computed(() => parseAssessmentQuestions(detail.value?.questions ?? []));
  const latestLoad = createLatestRequest();
  const writes = new Map<string, { content: string; evidence: string | undefined; promise: Promise<AssessmentAnswer> }>();
  let disposed = false;
  let savedTimer: ReturnType<typeof setTimeout> | undefined;
  let hintController: AbortController | null = null;
  let gradingController: AbortController | null = null;

  async function load({ preserveAnswers = false, preserveError = false } = {}) {
    if (disposed) return;
    const request = latestLoad.start();
    loading.value = true;
    if (!preserveError) error.value = null;
    try {
      const data = await apiClient.getAssessment(sessionId, request.signal);
      if (!request.isCurrent() || disposed) return;
      const nextAnswers: Record<string, string> = {};
      const nextExecutions: Record<string, LocalExecution> = {};
      for (const answer of data.answers) {
        nextAnswers[answer.questionId] = answer.answerContent;
        const execution = parseStoredExecution(answer.deterministicResult);
        if (execution) nextExecutions[answer.questionId] = execution;
      }
      for (const question of parseAssessmentQuestions(data.questions)) {
        if (preserveAnswers && Object.hasOwn(answers.value, question.id)) nextAnswers[question.id] = answers.value[question.id]!;
        else if (!Object.hasOwn(nextAnswers, question.id) && question.content.starterCode) nextAnswers[question.id] = question.content.starterCode;
        if (preserveAnswers && codeExecutions.value[question.id]) nextExecutions[question.id] = codeExecutions.value[question.id]!;
      }
      detail.value = data;
      answers.value = nextAnswers;
      codeExecutions.value = nextExecutions;
      if (data.session.status === 'GRADED') {
        const graded = await apiClient.getAssessmentResult(sessionId, request.signal);
        if (request.isCurrent() && !disposed) result.value = graded;
      } else result.value = null;
    } catch (reason) {
      if (request.isCurrent() && !disposed && (!preserveError || !error.value)) error.value = message(reason, '加载考核失败');
    } finally { if (request.isCurrent() && !disposed) loading.value = false; }
  }

  /** 同一题的写入按顺序执行；失焦和提交使用相同快照时复用进行中的请求。 */
  function persistAnswer(questionId: string, content: string, evidence?: string) {
    const previous = writes.get(questionId);
    if (previous?.content === content && previous.evidence === evidence) return previous.promise;
    const promise = (previous?.promise.catch(() => undefined) ?? Promise.resolve())
      .then(() => apiClient.saveAssessmentAnswer(sessionId, questionId, content, evidence));
    const entry = { content, evidence, promise };
    writes.set(questionId, entry);
    const cleanup = () => { if (writes.get(questionId) === entry) writes.delete(questionId); };
    void promise.then(cleanup, cleanup);
    return promise;
  }

  function showSaved(questionId: string) {
    if (disposed) return;
    savedQuestionId.value = questionId;
    if (savedTimer) clearTimeout(savedTimer);
    savedTimer = setTimeout(() => { if (!disposed) savedQuestionId.value = null; }, 1600);
  }

  async function save(questionId: string) {
    const content = answers.value[questionId]?.trim();
    if (disposed || !content || detail.value?.session.status !== 'IN_PROGRESS') return false;
    try {
      await persistAnswer(questionId, content, executionPayload(codeExecutions.value[questionId]));
      showSaved(questionId);
      return true;
    } catch (reason) {
      if (!disposed) error.value = message(reason, '答案保存失败');
      return false;
    }
  }

  async function start() {
    if (disposed || busy.value) return;
    busy.value = true;
    error.value = null;
    aiProgress.value = '';
    try { await apiClient.startAssessment(sessionId); if (!disposed) await load(); }
    catch (reason) { if (!disposed) error.value = message(reason, '开始考核失败'); }
    finally { if (!disposed) busy.value = false; }
  }

  async function runQuestionCode(question: QuestionView) {
    if (disposed || busy.value || runningQuestionId.value || detail.value?.session.status !== 'IN_PROGRESS') return;
    const source = answers.value[question.id]?.trim();
    if (!source) { error.value = '请先填写代码，再运行本地 Worker 自检。'; return; }
    runningQuestionId.value = question.id;
    error.value = null;
    try {
      const execution = await runBrowserCode(source, question.content.language === 'javascript' ? 'javascript' : 'typescript');
      if (disposed) return;
      if (answers.value[question.id]?.trim() !== source) { error.value = '代码已修改，请重新运行当前答案的本地自检。'; return; }
      const caseIds = (question.content.testCases ?? []).filter(test => !test.isHidden).map(test => test.id);
      const missingCaseIds = execution.status === 'SUCCESS' ? caseIds.filter(id => !execution.output.includes(`[ASSERT PASS] ${id}`)) : caseIds;
      const fixtureRequired = question.content.deterministicRequired || caseIds.length > 0;
      const record: LocalExecution = {
        status: execution.status, output: execution.output, durationMs: execution.durationMs,
        passed: execution.status === 'SUCCESS' && (!fixtureRequired || (caseIds.length > 0 && !missingCaseIds.length)), missingCaseIds,
      };
      codeExecutions.value[question.id] = record;
      await persistAnswer(question.id, source, executionPayload(record));
      showSaved(question.id);
    } catch (reason) { if (!disposed) error.value = message(reason, '代码夹具运行或保存失败'); }
    finally { if (!disposed) runningQuestionId.value = null; }
  }

  async function revealHint(questionId: string, kind: HintKind) {
    if (disposed || busy.value || hintBusy.value || detail.value?.session.status !== 'IN_PROGRESS') return;
    const controller = new AbortController();
    hintController = controller;
    const isCurrent = () => !disposed && hintController === controller;
    hintBusy.value = `${questionId}:${kind}`;
    streamingHints.value[questionId] = { kind, text: '', thinking: '' };
    try {
      const hint = await apiClient.revealAssessmentHintStream(sessionId, questionId, kind, (_delta, text) => {
        if (isCurrent()) streamingHints.value[questionId] = { kind, text, thinking: streamingHints.value[questionId]?.thinking ?? '' };
      }, controller.signal, (_delta, thinking) => {
        if (isCurrent()) streamingHints.value[questionId] = { kind, text: streamingHints.value[questionId]?.text ?? '', thinking };
      });
      if (!isCurrent()) return;
      revealedHints.value[questionId] = [...(revealedHints.value[questionId] ?? []), { ...hint, thinking: streamingHints.value[questionId]?.thinking }];
      if (detail.value) detail.value.session.assistanceLevel = Math.max(detail.value.session.assistanceLevel, hint.level);
    } catch (reason) { if (isCurrent()) error.value = message(reason, '暂时无法提供提示'); }
    finally { if (isCurrent()) { hintBusy.value = null; hintController = null; delete streamingHints.value[questionId]; } }
  }

  async function grade(controller: AbortController, regrade: boolean) {
    const isCurrent = () => !disposed && gradingController === controller;
    const progress = (text: string, chars?: number) => {
      if (isCurrent()) { aiProgress.value = text; aiReceivedChars.value = chars ?? aiReceivedChars.value; }
    };
    const thinking = (_delta: string, text: string) => { if (isCurrent()) gradingThinking.value = text; };
    const graded = regrade
      ? await apiClient.regradeAssessmentStream(sessionId, progress, controller.signal, thinking)
      : await apiClient.gradeAssessmentStream(sessionId, progress, controller.signal, thinking);
    if (isCurrent()) { result.value = graded.result; await load({ preserveAnswers: true }); }
  }

  function beginGrading(progress: string) {
    const controller = new AbortController();
    gradingController = controller;
    aiProgress.value = progress;
    aiReceivedChars.value = 0;
    gradingThinking.value = '';
    return controller;
  }

  function canSubmit() {
    if (disposed || busy.value) return false;
    if (runningQuestionId.value || hintBusy.value) { error.value = '请等待当前自检或提示完成后再提交'; return false; }
    if (!questions.value.length) { error.value = '试卷没有可提交的题目，请取消后重新创建挑战'; return false; }
    const unanswered = questions.value.filter(question => !answers.value[question.id]?.trim()).length;
    if (unanswered) { error.value = `还有 ${unanswered} 道题未作答，请完成后再提交`; return false; }
    return detail.value?.session.status === 'IN_PROGRESS';
  }

  function requestSubmit() {
    if (!canSubmit()) return false;
    pendingConfirmation.value = 'SUBMIT';
    return true;
  }

  async function performSubmit() {
    if (!canSubmit()) return;
    const snapshot = questions.value.map(question => ({ id: question.id, content: answers.value[question.id]!.trim(), evidence: executionPayload(codeExecutions.value[question.id]) }));
    busy.value = true;
    error.value = null;
    const controller = beginGrading('正在保存全部答案');
    let submitAttempted = false;
    try {
      const saved = await Promise.allSettled(snapshot.map(answer => persistAnswer(answer.id, answer.content, answer.evidence)));
      if (disposed) return;
      const failed = saved.findIndex(outcome => outcome.status === 'rejected');
      if (failed >= 0) {
        const reason = (saved[failed] as PromiseRejectedResult).reason;
        throw new Error(`第 ${failed + 1} 题未保存：${message(reason, '答案保存失败')}。答卷尚未提交，请重试。`);
      }
      submitAttempted = true;
      const submitted = await apiClient.submitAssessment(sessionId);
      if (disposed) return;
      if (detail.value) detail.value.session = submitted;
      await grade(controller, false);
    } catch (reason) {
      if (!disposed) {
        error.value = message(reason, '提交或评分失败，请重试');
        // 只在可能已锁卷时刷新状态；保留主错误和当前答案，不用旧答卷覆盖编辑内容。
        if (submitAttempted) await load({ preserveAnswers: true, preserveError: true });
      }
    } finally { if (!disposed) { busy.value = false; gradingController = null; } }
  }

  async function performRegrade() {
    if (disposed || busy.value) return;
    busy.value = true;
    error.value = null;
    const controller = beginGrading('正在准备判题');
    try { await grade(controller, detail.value?.session.status !== 'SUBMITTED'); }
    catch (reason) {
      if (!disposed) { error.value = message(reason, '重新判题失败'); await load({ preserveAnswers: true, preserveError: true }); }
    } finally { if (!disposed) { busy.value = false; gradingController = null; } }
  }

  async function performCancel() {
    if (disposed || busy.value) return;
    busy.value = true;
    error.value = null;
    aiProgress.value = '';
    try {
      await Promise.allSettled([...writes.values()].map(write => write.promise));
      if (disposed) return;
      await apiClient.cancelAssessment(sessionId);
      if (!disposed) await load();
    } catch (reason) { if (!disposed) error.value = message(reason, '取消挑战失败'); }
    finally { if (!disposed) busy.value = false; }
  }

  async function confirmPendingAction() {
    const action = pendingConfirmation.value;
    pendingConfirmation.value = null;
    if (action === 'SUBMIT') await performSubmit();
    if (action === 'REGRADE') await performRegrade();
    if (action === 'CANCEL') await performCancel();
  }

  onScopeDispose(() => {
    disposed = true;
    latestLoad.cancel();
    hintController?.abort();
    gradingController?.abort();
    if (savedTimer) clearTimeout(savedTimer);
  });
  return {
    detail, result, answers, loading, busy, error, savedQuestionId, revealedHints, hintBusy,
    streamingHints, aiProgress, aiReceivedChars, gradingThinking, pendingConfirmation,
    codeExecutions, runningQuestionId, questions, load, start, save, runQuestionCode,
    revealHint, requestSubmit, confirmPendingAction,
  };
}

function message(reason: unknown, fallback: string) { return reason instanceof Error ? reason.message : fallback; }
