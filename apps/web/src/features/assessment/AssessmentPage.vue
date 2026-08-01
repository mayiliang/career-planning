<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { apiClient, type AssessmentDetail, type AssessmentResult } from '@/api/client';
import BaseDialog from '@/components/BaseDialog.vue';

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
const revealedHints = ref<Record<string, Array<{ kind: string; level: number; text: string; source: 'AI' | 'RULE'; independenceImpact: string }>>>({});
const hintBusy = ref<string | null>(null);
const pendingConfirmation = ref<'SUBMIT' | 'REGRADE' | null>(null);
const resumedMessage = computed(() => route.query.resumed === '1'
  ? String(route.query.message || '已继续打开上次未完成的掌握挑战，原题目和答案均已保留。')
  : '');
const now = ref(Date.now());
let timer: number | undefined;

const questions = computed(() => (detail.value?.questions ?? []).map((question) => {
  try {
    return { ...question, content: JSON.parse(question.questionContent) as {
      question?: string;
      prompt?: string;
      wordLimit?: number;
      level?: string;
      sourceHint?: string;
      starterCode?: string;
      knowledgeTags?: string[];
      givenInput?: string;
      expectedOutput?: string;
      answerRequirements?: string[];
      answerFormat?: string;
      materialReferences?: Array<{ title: string; url: string | null; locator: string; focus: string }>;
      derivationGuide?: { required: boolean; basis: string; steps: string[] };
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

async function load() {
  loading.value = true;
  error.value = null;
  try {
    detail.value = await apiClient.getAssessment(sessionId);
    for (const answer of detail.value.answers) answers.value[answer.questionId] = answer.answerContent;
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
    await apiClient.saveAssessmentAnswer(sessionId, questionId, content);
    savedQuestionId.value = questionId;
    window.setTimeout(() => { if (savedQuestionId.value === questionId) savedQuestionId.value = null; }, 1600);
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '答案保存失败';
  }
}

async function revealHint(questionId: string, kind: typeof hintOptions[number][0]) {
  hintBusy.value = `${questionId}:${kind}`;
  try {
    const hint = await apiClient.revealAssessmentHint(sessionId, questionId, kind);
    revealedHints.value[questionId] = [...(revealedHints.value[questionId] ?? []), hint];
    if (detail.value) detail.value.session.assistanceLevel = Math.max(detail.value.session.assistanceLevel, hint.level);
  } catch (reason) { error.value = reason instanceof Error ? reason.message : '暂时无法提供提示'; }
  finally { hintBusy.value = null; }
}

async function performSubmit() {
  busy.value = true;
  error.value = null;
  try {
    await Promise.all(questions.value.map((question) => save(question.id)));
    await apiClient.submitAssessment(sessionId);
    const graded = await apiClient.gradeAssessment(sessionId);
    result.value = graded.result;
    await load();
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '提交或评分失败，请在设置页检查 DeepSeek 配置';
    await load();
  } finally {
    busy.value = false;
  }
}

async function performRegrade() {
  busy.value = true;
  error.value = null;
  try {
    const graded = await apiClient.regradeAssessment(sessionId);
    result.value = graded.result;
    await load();
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '重新判题失败';
  } finally {
    busy.value = false;
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

async function confirmPendingAction() {
  const action = pendingConfirmation.value;
  pendingConfirmation.value = null;
  if (action === 'SUBMIT') await performSubmit();
  if (action === 'REGRADE') await performRegrade();
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

onMounted(() => {
  load();
  timer = window.setInterval(() => { now.value = Date.now(); }, 1000);
});
onBeforeUnmount(() => { if (timer) window.clearInterval(timer); });
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
          <p class="exam-meta">{{ questions.length }} 个渐进任务 · {{ totalScore }} 分 · 建议 {{ detail.session.durationMinutes }} 分钟 · {{ detail.session.challengeMode }}</p>
        </div>
        <div class="exam-state">
          <span>{{ detail.session.status }}</span>
          <strong v-if="detail.session.status === 'IN_PROGRESS'" :class="{ urgent: remainingSeconds < 600 }">建议时间 {{ remainingText }}</strong>
        </div>
      </header>

      <p v-if="resumedMessage" class="resume-banner">↻ {{ resumedMessage }}</p>
      <p v-if="error" class="error-banner" role="alert">{{ error }}</p>

      <section v-if="detail.session.status === 'DRAFT'" class="briefing">
        <p class="briefing-number">01</p>
        <div>
          <h2>先尝试，再按需要逐步获得帮助</h2>
          <p>这不是必须完成的门槛。你可以解释题意、获取提示、拆解步骤、请求提纲或开头。帮助不会扣分，但系统会如实记录独立程度；失败不会撤销“已学完”。</p>
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
            <h2>{{ question.content.question || question.content.prompt }}</h2>
            <p v-if="question.content.wordLimit" class="word-limit">建议不超过 {{ question.content.wordLimit }} 字</p>
            <div class="answer-contract">
              <section v-if="question.content.givenInput"><span>题目输入</span><p>{{ question.content.givenInput }}</p></section>
              <section v-if="question.content.expectedOutput"><span>必须输出</span><p>{{ question.content.expectedOutput }}</p></section>
              <section v-if="question.content.answerRequirements?.length"><span>作答要求</span><ol><li v-for="item in question.content.answerRequirements" :key="item">{{ item }}</li></ol></section>
              <section v-if="question.content.answerFormat"><span>指定格式</span><pre>{{ question.content.answerFormat }}</pre></section>
            </div>
            <details v-if="question.content.materialReferences?.length" class="question-materials" open>
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
              <article v-for="hint in revealedHints[question.id] ?? []" :key="`${hint.kind}-${hint.level}`"><header><strong>{{ hintOptions.find(item => item[0] === hint.kind)?.[1] }}</strong><em>{{ hint.source === 'AI' ? 'AI 针对本题生成' : '题目规则提示' }}</em></header><p>{{ hint.text }}</p><small>{{ hint.independenceImpact }}</small></article>
            </div>
            <textarea
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
          <span>已完成 {{ answeredCount }} / {{ questions.length }}</span>
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
    :title="pendingConfirmation === 'REGRADE' ? '重新生成掌握反馈？' : '提交本次掌握挑战？'"
    :description="pendingConfirmation === 'REGRADE' ? '系统会使用当前答卷重新调用 AI 判题，不会修改你的答案。' : '提交后答案将锁定，系统会逐题分析并给出下一步建议。'"
    :confirm-label="pendingConfirmation === 'REGRADE' ? '重新判题' : '提交并生成反馈'"
    :busy="busy"
    @cancel="pendingConfirmation = null"
    @confirm="confirmPendingAction"
  />
</template>

<style scoped src="./AssessmentPage.styles.css"></style>
