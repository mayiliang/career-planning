<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { apiClient, type AssessmentDetail, type AssessmentResult } from '@/api/client';
import BaseDialog from '@/components/BaseDialog.vue';
import MarkdownRenderer from '@/components/MarkdownRenderer.vue';
import { runBrowserCode, type BrowserExecutionStatus } from '@/utils/browser-code-runner';

const route = useRoute();
const router = useRouter();
const sessionId = route.params.id as string;
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
const codeExecutions = ref<Record<string, { status: 'NOT_RUN' | BrowserExecutionStatus; output: string; durationMs: number; passed: boolean; missingCaseIds: string[] }>>({});
const runningQuestionId = ref<string | null>(null);
const resumedMessage = computed(() => route.query.resumed === '1'
  ? String(route.query.message || '已继续打开上次未完成的掌握挑战，原题目和答案均已保留。')
  : '');
const now = ref(Date.now());
let timer: number | undefined;
let hintController: AbortController | null = null;
let gradingController: AbortController | null = null;

const questions = computed(() => (detail.value?.questions ?? []).map((question) => {
  try {
    return { ...question, content: JSON.parse(question.questionContent) as {
      question?: string;
      prompt?: string;
      wordLimit?: number;
      level?: string;
      sourceHint?: string;
      starterCode?: string;
      language?: 'javascript' | 'typescript';
      knowledgeTags?: string[];
      givenInput?: string;
      expectedOutput?: string;
      answerRequirements?: string[];
      answerFormat?: string;
      materialReferences?: Array<{ title: string; url: string | null; locator: string; focus: string }>;
      derivationGuide?: { required: boolean; basis: string; steps: string[] };
      sourceQuestion?: string;
      stageContract?: string | { stage?: string; goal?: string; requirement?: string; retest?: string; [key: string]: unknown };
      retestVariant?: string | boolean | { description?: string; [key: string]: unknown };
      failureFixture?: string;
      verificationChecklist?: string[];
      vetoItems?: string[];
      deterministicRequired?: boolean;
      testCases?: Array<{ id: string; input?: string; expectedOutput?: string; isHidden?: boolean }>;
    } };
  } catch {
    return { ...question, content: { question: question.questionContent } };
  }
}));

const totalScore = computed(() => questions.value.reduce((sum, question) => sum + question.maxScore, 0));
const answeredCount = computed(() => questions.value.filter((question) => answers.value[question.id]?.trim()).length);
const remainingSeconds = computed(() => {
  const session = detail.value?.session;
  if (!session?.startedAt || session.status !== 'IN_PROGRESS') return session?.durationMinutes ? session.durationMinutes * 60 : 0;
  const deadline = new Date(session.startedAt).getTime() + session.durationMinutes * 60_000;
  return Math.max(0, Math.floor((deadline - now.value) / 1000));
});
const remainingText = computed(() => `${String(Math.floor(remainingSeconds.value / 60)).padStart(2, '0')}:${String(remainingSeconds.value % 60).padStart(2, '0')}`);
const certifiedLevel = computed(() => {
  const session = detail.value?.session;
  if (!session) return 0;
  return session.assistanceLevel >= 3 ? Math.min(session.masteryStage, 2) : session.masteryStage;
});
const hintOptions = [
  ['EXPLAIN', '解释题意'], ['HINT', '给一个提示'], ['DECOMPOSE', '拆解步骤'], ['OUTLINE', '给回答提纲'],
  ['STARTER', '帮我起个头'], ['SIMILAR_EXAMPLE', '看相似示例'], ['FULL_ANSWER', '查看完整思路'],
] as const;

function sourceQuestion(question: typeof questions.value[number]) {
  return question.content.question || question.content.prompt || question.content.sourceQuestion || '题目内容未能读取';
}

function stageContractLines(contract: typeof questions.value[number]['content']['stageContract']) {
  if (!contract) return [];
  if (typeof contract === 'string') return [contract];
  return Object.values(contract).filter((value): value is string => typeof value === 'string' && Boolean(value.trim()));
}

function retestVariantText(question: typeof questions.value[number]) {
  const variant = question.content.retestVariant;
  if (typeof variant === 'string') return variant;
  if (variant && typeof variant === 'object') return variant.description || '本题使用与首次挑战不同的复测变式。';
  return variant || detail.value?.session.assessmentType === 'RETEST'
    ? '本题为复测变式：保留同一能力目标，但会更换场景或夹具。'
    : '首次挑战：完成后如需复测，将以变式验证迁移能力。';
}

function visibleTestCases(question: typeof questions.value[number]) {
  return (question.content.testCases ?? []).filter((item) => !item.isHidden);
}

function parseStoredExecution(value: string | null) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as { passed?: boolean; output?: string; error?: string; runtimeMs?: number; status?: BrowserExecutionStatus; missingCaseIds?: string[] };
    if (typeof parsed.passed !== 'boolean') return null;
    return {
      status: parsed.status ?? (parsed.passed ? 'SUCCESS' : 'ERROR') as BrowserExecutionStatus,
      output: parsed.output || parsed.error || '', durationMs: parsed.runtimeMs ?? 0,
      passed: parsed.passed, missingCaseIds: parsed.missingCaseIds ?? [],
    };
  } catch { return null; }
}

function executionPayload(questionId: string) {
  const execution = codeExecutions.value[questionId];
  if (!execution) return undefined;
  return JSON.stringify({
    passed: execution.passed,
    output: execution.output,
    error: execution.status === 'SUCCESS' ? undefined : execution.output,
    runtimeMs: execution.durationMs,
    status: execution.status,
    missingCaseIds: execution.missingCaseIds,
  });
}

function deterministicStatus(question: typeof questions.value[number]) {
  const execution = codeExecutions.value[question.id];
  if (!question.content.deterministicRequired && !visibleTestCases(question).length) return '本题不启用本地自检；将按题目合同和语义评分复核。';
  if (!execution) return '尚未运行本地 Worker 自检。它可帮助发现问题，但不是安全沙箱或服务端证明。';
  if (execution.passed) return '本地 Worker 自检已通过；记录仅作为 AI 复核上下文，不单独证明实现正确。';
  if (execution.status === 'SUCCESS' && execution.missingCaseIds.length) return `脚本已运行，但缺少夹具断言：${execution.missingCaseIds.join('、')}。`;
  return '本地自检未通过；请根据执行输出修正后重新运行。';
}

async function load() {
  loading.value = true;
  error.value = null;
  try {
    detail.value = await apiClient.getAssessment(sessionId);
    for (const answer of detail.value.answers) {
      answers.value[answer.questionId] = answer.answerContent;
      const execution = parseStoredExecution(answer.deterministicResult);
      if (execution) codeExecutions.value[answer.questionId] = execution;
    }
    for (const question of detail.value.questions) {
      if (answers.value[question.id]) continue;
      try {
        const content = JSON.parse(question.questionContent) as { starterCode?: string };
        if (content.starterCode) answers.value[question.id] = content.starterCode;
      } catch { /* 保持空答案 */ }
    }
    if (detail.value.session.status === 'GRADED') result.value = await apiClient.getAssessmentResult(sessionId);
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '加载考核失败';
  } finally {
    loading.value = false;
  }
}

async function start() {
  busy.value = true;
  error.value = null;
  try {
    await apiClient.startAssessment(sessionId);
    await load();
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '开始考核失败';
  } finally {
    busy.value = false;
  }
}

async function save(questionId: string) {
  const content = answers.value[questionId]?.trim();
  if (!content || detail.value?.session.status !== 'IN_PROGRESS') return;
  try {
    await apiClient.saveAssessmentAnswer(sessionId, questionId, content, executionPayload(questionId));
    savedQuestionId.value = questionId;
    window.setTimeout(() => { if (savedQuestionId.value === questionId) savedQuestionId.value = null; }, 1600);
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '答案保存失败';
  }
}

async function runQuestionCode(question: typeof questions.value[number]) {
  const source = answers.value[question.id]?.trim();
  if (!source) {
    error.value = '请先填写代码，再运行本地 Worker 自检。';
    return;
  }
  runningQuestionId.value = question.id;
  error.value = null;
  try {
    const language = question.content.language === 'javascript' ? 'javascript' : 'typescript';
    const result = await runBrowserCode(source, language);
    const caseIds = visibleTestCases(question).map((item) => item.id);
    const missingCaseIds = result.status === 'SUCCESS'
      ? caseIds.filter((id) => !result.output.includes(`[ASSERT PASS] ${id}`))
      : caseIds;
    const fixtureRequired = question.content.deterministicRequired || caseIds.length > 0;
    codeExecutions.value[question.id] = {
      status: result.status,
      output: result.output,
      durationMs: result.durationMs,
      passed: result.status === 'SUCCESS' && (!fixtureRequired || (caseIds.length > 0 && missingCaseIds.length === 0)),
      missingCaseIds,
    };
    await save(question.id);
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '代码夹具运行失败';
  } finally {
    runningQuestionId.value = null;
  }
}

async function revealHint(questionId: string, kind: typeof hintOptions[number][0]) {
  hintBusy.value = `${questionId}:${kind}`;
  hintController = new AbortController();
  streamingHints.value[questionId] = { kind, text: '', thinking: '' };
  try {
    const hint = await apiClient.revealAssessmentHintStream(sessionId, questionId, kind, (_delta, accumulated) => {
      streamingHints.value[questionId] = { kind, text: accumulated, thinking: streamingHints.value[questionId]?.thinking ?? '' };
    }, hintController.signal, (_delta, accumulated) => {
      streamingHints.value[questionId] = { kind, text: streamingHints.value[questionId]?.text ?? '', thinking: accumulated };
    });
    revealedHints.value[questionId] = [...(revealedHints.value[questionId] ?? []), { ...hint, thinking: streamingHints.value[questionId]?.thinking }];
    if (detail.value) detail.value.session.assistanceLevel = Math.max(detail.value.session.assistanceLevel, hint.level);
  } catch (reason) { error.value = reason instanceof Error ? reason.message : '暂时无法提供提示'; }
  finally { hintBusy.value = null; hintController = null; delete streamingHints.value[questionId]; }
}

async function performSubmit() {
  busy.value = true;
  error.value = null;
  aiProgress.value = '正在保存全部答案';
  aiReceivedChars.value = 0;
  gradingThinking.value = '';
  gradingController = new AbortController();
  try {
    await Promise.all(questions.value.map((question) => save(question.id)));
    await apiClient.submitAssessment(sessionId);
    const graded = await apiClient.gradeAssessmentStream(sessionId, (progress, receivedChars) => {
      aiProgress.value = progress;
      aiReceivedChars.value = receivedChars ?? aiReceivedChars.value;
    }, gradingController.signal, (_delta, accumulated) => { gradingThinking.value = accumulated; });
    result.value = graded.result;
    await load();
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '提交或评分失败，请在设置页检查 DeepSeek 配置';
    await load();
  } finally {
    busy.value = false;
    gradingController = null;
  }
}

async function performRegrade() {
  busy.value = true;
  error.value = null;
  aiProgress.value = '正在准备重新判题';
  aiReceivedChars.value = 0;
  gradingThinking.value = '';
  gradingController = new AbortController();
  try {
    const graded = await apiClient.regradeAssessmentStream(sessionId, (progress, receivedChars) => {
      aiProgress.value = progress;
      aiReceivedChars.value = receivedChars ?? aiReceivedChars.value;
    }, gradingController.signal, (_delta, accumulated) => { gradingThinking.value = accumulated; });
    result.value = graded.result;
    await load();
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '重新判题失败';
  } finally {
    busy.value = false;
    gradingController = null;
  }
}

function requestSubmit() {
  if (answeredCount.value !== questions.value.length) {
    error.value = `还有 ${questions.value.length - answeredCount.value} 道题未作答，请完成后再提交`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  pendingConfirmation.value = 'SUBMIT';
}

async function performCancel() {
  busy.value = true;
  error.value = null;
  try {
    await apiClient.cancelAssessment(sessionId);
    await load();
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '取消挑战失败';
  } finally { busy.value = false; }
}

async function confirmPendingAction() {
  const action = pendingConfirmation.value;
  pendingConfirmation.value = null;
  if (action === 'SUBMIT') await performSubmit();
  if (action === 'REGRADE') await performRegrade();
  if (action === 'CANCEL') await performCancel();
}

function parseFeedback(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value) as {
      summary?: string;
      whatWasStrong?: string[];
      whatMustImprove?: string[];
      suggestedRetestFocus?: string[];
      questionReviews?: Array<{
        questionId: string;
        score: number;
        maxScore: number;
        correctParts: string[];
        incorrectParts: string[];
        missingParts: string[];
        referenceAnswer: string;
        sourceBasis: string[];
        nextAction: string;
      }>;
    };
  }
  catch { return { summary: value }; }
}

function questionReview(questionId: string) {
  return parseFeedback(result.value?.feedback ?? null)?.questionReviews?.find((item) => item.questionId === questionId);
}

function criticalFailures(value: string | null) {
  if (!value) return [] as Array<{ code?: string; evidence?: string; reason?: string }>;
  try {
    const parsed = JSON.parse(value) as Array<{ code?: string; evidence?: string; reason?: string }>;
    return Array.isArray(parsed) ? parsed : [];
  } catch { return [{ reason: value }]; }
}

function sessionStatusLabel(status: AssessmentDetail['session']['status']) {
  return ({
    DRAFT: '待开始', IN_PROGRESS: '进行中', SUBMITTED: '已提交', GRADING: '正在评分', GRADED: '评分完成', ERROR: '评分异常', CANCELLED: '已中止',
  } as const)[status];
}

onMounted(() => {
  load();
  timer = window.setInterval(() => { now.value = Date.now(); }, 1000);
});
onBeforeUnmount(() => {
  if (timer) window.clearInterval(timer);
  hintController?.abort();
  gradingController?.abort();
});
</script>

<template>
  <main class="assessment-page">
    <button class="back-link" @click="router.push(`/knowledge/${detail?.session.knowledgePointCode ?? ''}`)">← 返回知识点</button>

    <div v-if="loading" class="state-panel">正在装载考核卷...</div>
    <div v-else-if="!detail" class="state-panel error">{{ error || '考核不存在' }}</div>

    <template v-else>
      <header class="exam-header">
        <div>
          <p class="eyebrow">OPTIONAL MASTERY CHALLENGE · M{{ detail.session.masteryStage }}</p>
          <h1>{{ detail.session.knowledgePointCode }} 掌握挑战</h1>
          <p class="exam-meta">{{ questions.length }} 个渐进任务 · {{ totalScore }} 分 · 建议 {{ detail.session.durationMinutes }} 分钟 · M{{ detail.session.masteryStage }} {{ detail.session.assessmentType === 'RETEST' ? '复测变式' : '首次合同' }}</p>
        </div>
        <div class="exam-state">
          <span>{{ sessionStatusLabel(detail.session.status) }}</span>
          <strong v-if="detail.session.status === 'IN_PROGRESS'" :class="{ urgent: remainingSeconds < 600 }">建议时间 {{ remainingText }}</strong>
          <button v-if="['DRAFT', 'IN_PROGRESS'].includes(detail.session.status)" type="button" class="cancel-action" :disabled="busy" @click="pendingConfirmation = 'CANCEL'">取消本次挑战</button>
        </div>
      </header>

      <p v-if="resumedMessage" class="resume-banner">↻ {{ resumedMessage }}</p>
      <p v-if="error" class="error-banner" role="alert">{{ error }}</p>

      <section v-if="detail.session.status === 'DRAFT'" class="briefing">
        <p class="briefing-number">01</p>
        <div>
          <h2>先尝试，再按需要逐步获得帮助</h2>
          <p>本卷会保留本知识点的原题合同；M{{ detail.session.masteryStage }} {{ detail.session.assessmentType === 'RETEST' ? '使用复测变式验证迁移' : '从资料定位、最小产出到受限排错渐进展开' }}。帮助不会扣分，但系统会如实记录独立程度；失败或中止不会撤销“已学完”。</p>
          <button class="primary-action" :disabled="busy" @click="start">{{ busy ? '准备中...' : '开始挑战' }}</button>
        </div>
      </section>

      <section v-else-if="result" class="result-sheet">
        <div class="verdict" :class="result.verdict.toLowerCase()">
          <span>{{ result.verdict === 'PASS' ? `通过 · M${certifiedLevel}` : result.verdict === 'FAIL' ? '未通过 · 保留已有状态' : '需要复核' }}</span>
          <strong>{{ result.totalScore }}</strong><small>/ 100</small>
        </div>
        <div class="score-grid">
          <div><span>原理与边界</span><strong>{{ result.principlesScore }}/25</strong></div>
          <div><span>实践产出</span><strong>{{ result.practiceScore }}/35</strong></div>
          <div><span>排障与设计</span><strong>{{ result.troubleshootingScore }}/25</strong></div>
          <div><span>项目表达</span><strong>{{ result.communicationScore }}/15</strong></div>
        </div>
        <div v-if="parseFeedback(result.feedback)" class="feedback">
          <h2>评审意见</h2>
          <p>{{ parseFeedback(result.feedback)?.summary }}</p>
          <ul><li v-for="item in parseFeedback(result.feedback)?.whatMustImprove ?? []" :key="item">{{ item }}</li></ul>
          <button v-if="result.verdict === 'MANUAL_REVIEW'" class="primary-action" :disabled="busy" @click="pendingConfirmation = 'REGRADE'">
            {{ busy ? '重新判题中...' : '重新调用 DeepSeek 判题' }}
          </button>
        </div>
        <section v-if="criticalFailures(result.criticalFailures).length" class="critical-failures" aria-label="本次挑战否决项">
          <h2>本次挑战否决项</h2>
          <ul><li v-for="item in criticalFailures(result.criticalFailures)" :key="`${item.code}-${item.reason}`"><strong v-if="item.code">{{ item.code }}</strong>{{ item.reason }}<small v-if="item.evidence">证据：{{ item.evidence }}</small></li></ul>
        </section>
        <div v-if="parseFeedback(result.feedback)?.questionReviews?.length" class="question-review-list">
          <h2>逐题评审与参考答案</h2>
          <article v-for="(question, index) in questions" :key="question.id" class="question-review-card">
            <header>
              <span>{{ String(index + 1).padStart(2, '0') }}</span>
              <div><strong>{{ question.content.question || question.content.prompt }}</strong><small>{{ questionReview(question.id)?.score ?? 0 }} / {{ questionReview(question.id)?.maxScore ?? question.maxScore }} 分</small></div>
            </header>
            <section class="user-answer">
              <h3>我的答案</h3>
              <p>{{ answers[question.id]?.trim() || '未作答' }}</p>
            </section>
            <section>
              <h3>对的地方</h3>
              <ul><li v-for="item in questionReview(question.id)?.correctParts ?? ['未识别到明确正确点']" :key="item">{{ item }}</li></ul>
            </section>
            <section>
              <h3>错误或缺失</h3>
              <ul>
                <li v-for="item in [...(questionReview(question.id)?.incorrectParts ?? []), ...(questionReview(question.id)?.missingParts ?? [])]" :key="item">{{ item }}</li>
                <li v-if="!(questionReview(question.id)?.incorrectParts?.length || questionReview(question.id)?.missingParts?.length)">无明显错误或缺失</li>
              </ul>
            </section>
            <section class="reference-answer">
              <h3>参考答案</h3>
              <p>{{ questionReview(question.id)?.referenceAnswer }}</p>
              <div v-if="questionReview(question.id)?.sourceBasis?.length"><span>依据</span><b v-for="source in questionReview(question.id)?.sourceBasis" :key="source">{{ source }}</b></div>
            </section>
            <footer>{{ questionReview(question.id)?.nextAction }}</footer>
          </article>
        </div>
      </section>

      <section v-else-if="detail.session.status === 'CANCELLED'" class="state-panel">
        本次掌握挑战已中止。题目和已保存的答案不会被删除；重新发起同一级挑战时，系统会创建采用当前合同的新会话。
      </section>

      <section v-else class="question-list">
        <article v-for="(question, index) in questions" :key="question.id" class="question-card">
          <div class="question-index">{{ String(index + 1).padStart(2, '0') }}</div>
          <div class="question-body">
            <div class="question-meta"><span>{{ question.dimension }} · {{ question.questionType === 'CODE_WRITE' ? '机试实战' : question.questionType }}</span><strong>{{ question.maxScore }} 分</strong></div>
            <div v-if="question.content.knowledgeTags?.length" class="knowledge-tags"><span>相关知识点</span><b v-for="tag in question.content.knowledgeTags" :key="tag">{{ tag }}</b></div>
            <div v-if="question.content.level || question.content.sourceHint" class="question-scope">
              <span v-if="question.content.level">{{ question.content.level }}</span>
              <p>先独立尝试；卡住时再按需展开帮助。</p>
            </div>
            <p class="source-question-label">原题任务 · {{ question.content.sourceQuestion ?? '本题合同' }}</p>
            <h2>{{ sourceQuestion(question) }}</h2>
            <p v-if="question.content.wordLimit" class="word-limit">建议不超过 {{ question.content.wordLimit }} 字</p>
            <div class="answer-contract">
              <section v-if="question.content.givenInput"><span>题目输入</span><p>{{ question.content.givenInput }}</p></section>
              <section v-if="question.content.expectedOutput"><span>必须输出</span><p>{{ question.content.expectedOutput }}</p></section>
              <section v-if="question.content.answerRequirements?.length"><span>作答要求</span><ol><li v-for="item in question.content.answerRequirements" :key="item">{{ item }}</li></ol></section>
              <section v-if="question.content.answerFormat"><span>指定格式</span><pre>{{ question.content.answerFormat }}</pre></section>
            </div>
            <div class="challenge-contract" aria-label="挑战验证合同">
              <section><span>M 阶段 / 复测</span><p v-for="line in stageContractLines(question.content.stageContract)" :key="line">{{ line }}</p><p v-if="!stageContractLines(question.content.stageContract).length">M{{ detail.session.masteryStage }} · {{ retestVariantText(question) }}</p></section>
              <section v-if="question.content.failureFixture"><span>失败夹具</span><p>{{ question.content.failureFixture }}</p></section>
              <section v-if="question.content.verificationChecklist?.length"><span>验证清单</span><ul><li v-for="item in question.content.verificationChecklist" :key="item">{{ item }}</li></ul></section>
              <section class="veto-items"><span>否决项</span><ul v-if="question.content.vetoItems?.length"><li v-for="item in question.content.vetoItems" :key="item">{{ item }}</li></ul><p v-else>本题未列出额外否决项；仍须满足题干、资料依据与验证清单。</p></section>
              <section class="deterministic-contract"><span>本地 Worker 自检（非安全沙箱 / 非服务端证明）</span><p>{{ deterministicStatus(question) }}</p><ul v-if="visibleTestCases(question).length"><li v-for="testCase in visibleTestCases(question)" :key="testCase.id"><b>{{ testCase.id }}</b><em v-if="testCase.input">输入：{{ testCase.input }}</em><em v-if="testCase.expectedOutput">预期：{{ testCase.expectedOutput }}</em></li></ul></section>
            </div>
            <details v-if="question.content.materialReferences?.length" class="question-materials">
              <summary>本题对应的学习资料与具体位置</summary>
              <div v-for="source in question.content.materialReferences" :key="`${source.title}-${source.url}`">
                <a v-if="source.url" :href="source.url" target="_blank" rel="noreferrer">{{ source.title }} ↗</a><strong v-else>{{ source.title }}</strong>
                <p>{{ source.locator }}；重点：{{ source.focus }}</p>
              </div>
            </details>
            <details v-if="question.content.derivationGuide?.required" class="derivation-guide">
              <summary>这道题需要举一反三：查看系统整理的推导依据</summary>
              <p>{{ question.content.derivationGuide.basis }}</p>
              <ol><li v-for="step in question.content.derivationGuide.steps" :key="step">{{ step }}</li></ol>
            </details>
            <div class="assistance-ladder">
              <span>卡住了？选择恰好够用的帮助</span>
              <div><button v-for="option in hintOptions" :key="option[0]" :disabled="hintBusy === `${question.id}:${option[0]}`" @click="revealHint(question.id, option[0])">{{ option[1] }}</button></div>
              <article v-if="streamingHints[question.id]" class="streaming-hint" aria-live="polite"><header><strong>{{ hintOptions.find(item => item[0] === streamingHints[question.id]?.kind)?.[1] }}</strong><em>AI 正在针对本题生成</em></header><MarkdownRenderer :source="streamingHints[question.id]?.text || '正在读取题目与对应资料…'" :thinking="streamingHints[question.id]?.thinking" :streaming="true" :thinking-open="false" aria-label="正在生成的题目提示" /></article>
              <article v-for="hint in revealedHints[question.id] ?? []" :key="`${hint.kind}-${hint.level}`"><header><strong>{{ hintOptions.find(item => item[0] === hint.kind)?.[1] }}</strong><em>{{ hint.source === 'AI' ? 'AI 针对本题生成' : '题目规则提示' }}</em></header><MarkdownRenderer :source="hint.text" :thinking="hint.thinking" :thinking-open="false" aria-label="题目提示" /><small>{{ hint.independenceImpact }}</small></article>
            </div>
            <section v-if="question.questionType === 'CODE_WRITE'" class="challenge-code-lab">
              <header><div><span>本地 Worker 自检区</span><small>非安全沙箱；结果可辅助排查，只作为 AI 上下文，不能成为服务端证明或单独决定通过。</small></div><button type="button" :disabled="runningQuestionId === question.id || detail.session.status !== 'IN_PROGRESS'" @click="runQuestionCode(question)">{{ runningQuestionId === question.id ? '本地自检运行中…' : '运行本地自检并保存记录' }}</button></header>
              <textarea
                v-model="answers[question.id]"
                :disabled="detail.session.status !== 'IN_PROGRESS'"
                rows="13"
                :aria-label="`代码答案：第 ${index + 1} 题`"
                placeholder="编写可在本地 Worker 自检区运行的代码；可为每个给定场景添加真实条件的 console.assert。"
                @blur="save(question.id)"
              />
              <div class="challenge-execution-output" :data-status="codeExecutions[question.id]?.status ?? 'NOT_RUN'" aria-live="polite"><span>本地自检结果 · {{ codeExecutions[question.id]?.passed ? '通过' : codeExecutions[question.id]?.status ?? '尚未运行' }}</span><pre>{{ codeExecutions[question.id]?.output || '尚未运行。运行后会保存有界的本地自检记录。' }}</pre></div>
            </section>
            <textarea
              v-else
              v-model="answers[question.id]"
              :disabled="detail.session.status !== 'IN_PROGRESS'"
              rows="10"
              placeholder="写下可以被追问、验证和复现的答案..."
              @blur="save(question.id)"
            />
            <span v-if="savedQuestionId === question.id" class="saved">已保存到本地</span>
          </div>
        </article>

        <footer v-if="detail.session.status === 'IN_PROGRESS'" class="submit-bar">
          <div v-if="busy" class="submit-progress" aria-live="polite"><span>{{ aiProgress }}<small v-if="aiReceivedChars"> · 已接收 {{ aiReceivedChars }} 字符</small></span><MarkdownRenderer v-if="gradingThinking" source="" :thinking="gradingThinking" :streaming="true" :thinking-open="false" aria-label="AI 判题思考过程" /></div>
          <span v-else>已完成 {{ answeredCount }} / {{ questions.length }}</span>
          <button class="primary-action" :disabled="busy" @click="requestSubmit">{{ busy ? '正在生成反馈…' : '提交并查看掌握反馈' }}</button>
        </footer>
        <div v-else-if="['SUBMITTED', 'GRADING', 'ERROR'].includes(detail.session.status)" class="state-panel">
          当前状态：{{ detail.session.status }}。若评分失败，请检查设置页中的 DeepSeek 配置后重试。
          <button v-if="detail.session.status === 'ERROR'" class="primary-action" :disabled="busy" @click="pendingConfirmation = 'REGRADE'">
            {{ busy ? '重新判题中...' : '重新调用 DeepSeek 判题' }}
          </button>
        </div>
      </section>
    </template>
  </main>
  <BaseDialog
    :open="Boolean(pendingConfirmation)"
    :title="pendingConfirmation === 'REGRADE' ? '重新生成掌握反馈？' : pendingConfirmation === 'CANCEL' ? '取消本次挑战？' : '提交本次掌握挑战？'"
    :description="pendingConfirmation === 'REGRADE' ? '系统会使用当前答卷重新调用 AI 判题，不会修改你的答案。' : pendingConfirmation === 'CANCEL' ? '已保存的答案会保留；本会话不再继续，之后可新建采用当前合同的挑战。' : '提交后答案将锁定，系统会逐题分析并给出下一步建议。'"
    :confirm-label="pendingConfirmation === 'REGRADE' ? '重新判题' : pendingConfirmation === 'CANCEL' ? '确认取消' : '提交并生成反馈'"
    :busy="busy"
    @cancel="pendingConfirmation = null"
    @confirm="confirmPendingAction"
  />
</template>

<style scoped src="./AssessmentPage.styles.css"></style>
