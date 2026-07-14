<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { apiClient, type AssessmentDetail, type AssessmentResult } from '@/api/client';

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
const now = ref(Date.now());
let timer: number | undefined;

const questions = computed(() => (detail.value?.questions ?? []).map((question) => {
  try {
    return { ...question, content: JSON.parse(question.questionContent) as { question?: string; prompt?: string; wordLimit?: number } };
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

async function load() {
  loading.value = true;
  error.value = null;
  try {
    detail.value = await apiClient.getAssessment(sessionId);
    for (const answer of detail.value.answers) answers.value[answer.questionId] = answer.answerContent;
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

async function submit() {
  if (answeredCount.value !== questions.value.length) {
    error.value = `还有 ${questions.value.length - answeredCount.value} 道题未作答`;
    return;
  }
  if (!window.confirm('提交后不能继续修改答案，确定提交并交给 DeepSeek 评分吗？')) return;

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

async function regrade() {
  if (!window.confirm('将使用当前答卷重新调用 DeepSeek 判题，确定继续吗？')) return;
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

function parseFeedback(value: string | null) {
  if (!value) return null;
  try { return JSON.parse(value) as { summary?: string; whatWasStrong?: string[]; whatMustImprove?: string[]; suggestedRetestFocus?: string[] }; }
  catch { return { summary: value }; }
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
          <p class="eyebrow">STRICT ASSESSMENT · {{ detail.session.assessmentType }}</p>
          <h1>{{ detail.session.knowledgePointCode }} 严格考核</h1>
          <p class="exam-meta">{{ questions.length }} 道任务 · {{ totalScore }} 分 · {{ detail.session.durationMinutes }} 分钟</p>
        </div>
        <div class="exam-state">
          <span>{{ detail.session.status }}</span>
          <strong v-if="detail.session.status === 'IN_PROGRESS'" :class="{ urgent: remainingSeconds < 600 }">{{ remainingText }}</strong>
        </div>
      </header>

      <p v-if="error" class="error-banner" role="alert">{{ error }}</p>

      <section v-if="detail.session.status === 'DRAFT'" class="briefing">
        <p class="briefing-number">01</p>
        <div>
          <h2>闭卷、限时、逐题留痕</h2>
          <p>题目覆盖原理边界、实践产出、排障设计与项目表达。提交后由 DeepSeek 按 100 分量表评分，服务端会重算通过结论。</p>
          <button class="primary-action" :disabled="busy" @click="start">{{ busy ? '准备中...' : '开始计时' }}</button>
        </div>
      </section>

      <section v-else-if="result" class="result-sheet">
        <div class="verdict" :class="result.verdict.toLowerCase()">
          <span>{{ result.verdict }}</span>
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
          <button v-if="result.verdict === 'MANUAL_REVIEW'" class="primary-action" :disabled="busy" @click="regrade">
            {{ busy ? '重新判题中...' : '重新调用 DeepSeek 判题' }}
          </button>
        </div>
      </section>

      <section v-else class="question-list">
        <article v-for="(question, index) in questions" :key="question.id" class="question-card">
          <div class="question-index">{{ String(index + 1).padStart(2, '0') }}</div>
          <div class="question-body">
            <div class="question-meta"><span>{{ question.dimension }}</span><strong>{{ question.maxScore }} 分</strong></div>
            <h2>{{ question.content.question || question.content.prompt }}</h2>
            <p v-if="question.content.wordLimit" class="word-limit">建议不超过 {{ question.content.wordLimit }} 字</p>
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
          <button class="primary-action" :disabled="busy" @click="submit">{{ busy ? '提交并评分中...' : '提交给 DeepSeek 评分' }}</button>
        </footer>
        <div v-else-if="['SUBMITTED', 'GRADING', 'ERROR'].includes(detail.session.status)" class="state-panel">
          当前状态：{{ detail.session.status }}。若评分失败，请检查设置页中的 DeepSeek 配置后重试。
          <button v-if="detail.session.status === 'ERROR'" class="primary-action" :disabled="busy" @click="regrade">
            {{ busy ? '重新判题中...' : '重新调用 DeepSeek 判题' }}
          </button>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped src="./AssessmentPage.styles.css"></style>
