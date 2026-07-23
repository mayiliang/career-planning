<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { apiClient, type KnowledgePointListItem, type KnowledgeRecommendation, type PlanEvent, type TodayPlan } from '@/api/client';

const router = useRouter();
const loading = ref(true);
const error = ref<string | null>(null);
const todayPlan = ref<TodayPlan | null>(null);
const upcomingEvents = ref<PlanEvent[]>([]);
const learningPoints = ref<KnowledgePointListItem[]>([]);
const recommendation = ref<KnowledgeRecommendation | null>(null);
const reviewSummary = ref('');
const reviewSaving = ref(false);
const reviewMessage = ref<string | null>(null);
const retestStartingId = ref<string | null>(null);
const showCheckinDialog = ref(false);
const selectedEvent = ref<PlanEvent | null>(null);
const checkinSaving = ref(false);
const checkinForm = ref({
  result: 'COMPLETED' as 'COMPLETED' | 'PARTIAL' | 'SKIPPED',
  actualMinutes: 60,
  noteMd: '',
  energyLevel: 3,
  difficultyLevel: 3,
});

const BEIJING_TIME_ZONE = 'Asia/Shanghai';
const now = new Date();
const todayDate = computed(() => now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long', timeZone: BEIJING_TIME_ZONE }));
const todayCode = computed(() => localDateKey(now).replaceAll('-', '.'));
const actionableEvents = computed(() => todayPlan.value?.events.filter((event) => ['PLANNED', 'IN_PROGRESS'].includes(event.status)) ?? []);
const currentMission = computed(() => actionableEvents.value[0] ?? todayPlan.value?.events[0] ?? null);
const currentMissionPoints = computed(() => currentMission.value?.learningBrief?.knowledgePoints ?? []);
const firstMissionPoint = computed(() => currentMissionPoints.value[0] ?? recommendation.value?.point ?? null);
const startSteps = computed(() => currentMission.value?.learningBrief?.learningContent.slice(0, 6) ?? []);
const missionOutputs = computed(() => currentMission.value?.learningBrief?.outputs ?? []);
const missionMasteryGoals = computed(() => currentMission.value?.learningBrief?.masteryGoals.slice(0, 3) ?? []);
const missionEffortStages = computed(() => {
  const effort = currentMission.value?.learningBrief?.effort;
  if (!effort) return [];
  return [
    { label: '资料', minutes: effort.studyMinutes },
    { label: '练习', minutes: effort.practiceMinutes },
    { label: '项目', minutes: effort.projectMinutes },
    { label: '考核', minutes: effort.assessmentMinutes },
  ].filter((item) => item.minutes > 0);
});
const completionPercent = computed(() => {
  const stats = todayPlan.value?.stats;
  if (!stats?.total) return 0;
  return Math.round((stats.completed / stats.total) * 100);
});
const plannedMinutes = computed(() => (todayPlan.value?.events ?? []).reduce((sum, event) => sum + estimatedEventMinutes(event), 0));
const completedMinutes = computed(() => (todayPlan.value?.events ?? []).filter((event) => event.status === 'COMPLETED').reduce((sum, event) => sum + eventMinutes(event), 0));

const learningQueue = computed(() => {
  const recommended = recommendation.value?.point;
  const points = [recommended, ...learningPoints.value
    .filter((point) => ['LEARNING', 'SELF_MASTERED', 'FIRST_PASS_PENDING_RETEST', 'NEEDS_RELEARNING'].includes(point.status))]
    .filter((point): point is KnowledgePointListItem => Boolean(point));
  return [...new Map(points.map((point) => [point.code, point])).values()]
  .sort((a, b) => statusPriority(a.status) - statusPriority(b.status))
  .sort((a, b) => Number(b.code === recommended?.code) - Number(a.code === recommended?.code))
  .slice(0, 5);
});

const upcomingDays = computed(() => {
  const groups = new Map<string, PlanEvent[]>();
  for (const event of upcomingEvents.value.filter((item) => !['RESCHEDULED', 'SKIPPED'].includes(item.status))) {
    const key = localDateKey(new Date(event.startAt));
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  return Array.from({ length: 7 }, (_, index) => {
    const date = beijingDateToDate(localDateKey(new Date(Date.now() + (index + 1) * 86_400_000)));
    const key = localDateKey(date);
    return { key, date, events: groups.get(key) ?? [] };
  });
});

function localDateKey(date: Date) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: BEIJING_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function beijingDateToDate(date: string) {
  return new Date(`${date}T12:00:00+08:00`);
}

function beijingDayStartIso(date: string) {
  return new Date(`${date}T00:00:00+08:00`).toISOString();
}

function beijingDayEndIso(date: string) {
  return new Date(`${date}T23:59:59+08:00`).toISOString();
}

function dayLabel(date: Date) {
  return date.toLocaleDateString('zh-CN', { weekday: 'short', timeZone: BEIJING_TIME_ZONE }).replace('周', '');
}

function eventMinutes(event: PlanEvent) {
  return Math.max(0, Math.round((new Date(event.endAt).getTime() - new Date(event.startAt).getTime()) / 60000));
}

function estimatedEventMinutes(event: PlanEvent) {
  return event.learningBrief?.effort.estimatedTotalMinutes ?? eventMinutes(event);
}

function statusPriority(status: string) {
  return ({ NEEDS_RELEARNING: 0, FIRST_PASS_PENDING_RETEST: 1, LEARNING: 2, SELF_MASTERED: 3 } as Record<string, number>)[status] ?? 9;
}

async function loadDashboard() {
  loading.value = true;
  error.value = null;
  const today = localDateKey(new Date());
  const toDate = localDateKey(new Date(Date.now() + 8 * 86_400_000));
  try {
    const [plan, events, points, nextAction] = await Promise.all([
      apiClient.getTodayPlan(),
      apiClient.getCalendarEvents({ from: beijingDayStartIso(today), to: beijingDayEndIso(toDate) }),
      apiClient.getKnowledgePoints(),
      apiClient.getKnowledgeRecommendation(),
    ]);
    todayPlan.value = plan;
    upcomingEvents.value = events.filter((event) => localDateKey(new Date(event.startAt)) > today);
    learningPoints.value = points.items;
    recommendation.value = nextAction;
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '今日学习驾驶舱加载失败';
  } finally {
    loading.value = false;
  }
}

function formatTime(isoString: string) {
  return new Date(isoString).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: BEIJING_TIME_ZONE });
}

function getStatusLabel(status: string) {
  return ({ PLANNED: '待开始', IN_PROGRESS: '进行中', COMPLETED: '已完成', PARTIAL: '部分完成', SKIPPED: '已跳过', RESCHEDULED: '已顺延' } as Record<string, string>)[status] ?? status;
}

function getEventTypeLabel(type: string) {
  return ({ LEARNING: '学习', ASSESSMENT: '考核', RETEST: '复测', PROJECT_OUTPUT: '项目产出', JOB_APPLICATION: '求职', INTERVIEW: '面试', REVIEW: '复盘' } as Record<string, string>)[type] ?? type;
}

function pointStatusLabel(status: string) {
  return ({ LEARNING: '学习中', SELF_MASTERED: '待首次考核', FIRST_PASS_PENDING_RETEST: '待复测', NEEDS_RELEARNING: '需要重学', MASTERED: '已掌握', NOT_STARTED: '未开始' } as Record<string, string>)[status] ?? status;
}

function openCheckinDialog(event: PlanEvent) {
  selectedEvent.value = event;
  checkinForm.value = { result: 'COMPLETED', actualMinutes: eventMinutes(event) || 60, noteMd: '', energyLevel: 3, difficultyLevel: 3 };
  showCheckinDialog.value = true;
}

async function submitCheckin() {
  if (!selectedEvent.value || checkinSaving.value) return;
  checkinSaving.value = true;
  try {
    await apiClient.checkinEvent(selectedEvent.value.id, checkinForm.value);
    showCheckinDialog.value = false;
    await loadDashboard();
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '打卡失败';
  } finally {
    checkinSaving.value = false;
  }
}

function appendReviewPrompt(prompt: string) {
  reviewSummary.value = `${reviewSummary.value}${reviewSummary.value.trim() ? '\n' : ''}${prompt} `;
}

async function saveReview() {
  if (!reviewSummary.value.trim()) return;
  reviewSaving.value = true;
  reviewMessage.value = null;
  try {
    await apiClient.saveDailyReview(localDateKey(new Date()), reviewSummary.value.trim());
    reviewMessage.value = '已保存到本地复盘档案';
  } catch (reason) {
    reviewMessage.value = reason instanceof Error ? reason.message : '复盘保存失败';
  } finally {
    reviewSaving.value = false;
  }
}

function eventDescription(event: PlanEvent) {
  if (event.learningBrief) {
    const blocker = event.learningBrief.prerequisitesReady
      ? ''
      : `前置未就绪（${event.learningBrief.pendingPrerequisiteCount} 项），请先沿推荐路线补齐。`;
    return `${blocker}${blocker ? ' ' : ''}需要掌握：${event.learningBrief.masteryGoals.map((goal) => goal.text).join('；')}`;
  }
  return event.description?.trim() || `${getEventTypeLabel(event.eventType)}任务 · 建议投入 ${eventMinutes(event)} 分钟`;
}

function eventTitle(event: PlanEvent) {
  return event.learningBrief?.displayTitle ?? event.title;
}

function openEventKnowledge(event: PlanEvent | null) {
  const code = event?.learningBrief?.knowledgePoints[0]?.code ?? firstMissionPoint.value?.code;
  if (code) router.push(`/knowledge/${code}`);
  else router.push('/knowledge');
}

async function beginRetest(event: PlanEvent) {
  const code = event.learningBrief?.knowledgePoints[0]?.code
    ?? event.title.match(/[A-Z][A-Z0-9]*-\d+/)?.[0];
  if (!code || retestStartingId.value) return;
  retestStartingId.value = event.id;
  error.value = null;
  try {
    const session = await apiClient.createAssessment({ knowledgePointCode: code, type: 'RETEST', durationMinutes: 60 });
    await router.push(`/assessment/${session.id}`);
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '创建复测失败';
  } finally {
    retestStartingId.value = null;
  }
}

onMounted(loadDashboard);
</script>

<template>
  <div class="today-page">
    <header class="today-header">
      <div><p class="eyebrow">TODAY LOG · {{ todayCode }}</p><h1>今天的学习航线</h1><p>{{ todayDate }} · 聚焦一个可验证的进步，不追求填满时间。</p></div>
      <div class="header-actions"><button @click="router.push('/knowledge/map')">打开知识脑图</button><button class="primary" @click="router.push('/plan')">查看 7 天计划</button></div>
    </header>

    <div v-if="loading" class="today-skeleton" aria-label="正在加载"><div class="skeleton-hero"></div><div></div><div></div></div>
    <div v-else-if="error && !todayPlan" class="error-state">{{ error }}<button class="retry-button" @click="loadDashboard">重新加载</button></div>

    <template v-else-if="todayPlan">
      <p v-if="error" class="inline-error">{{ error }}</p>
      <section class="mission-deck">
        <article class="current-mission" :class="{ empty: !currentMission }">
          <div class="mission-index"><span>CURRENT<br />MISSION</span><strong>{{ currentMission ? '01' : '00' }}</strong></div>
          <div class="mission-copy">
            <div class="mission-kicker"><span class="live-dot"></span>{{ currentMission ? `${formatTime(currentMission.startAt)} — ${formatTime(currentMission.endAt)}` : '等待安排' }}<i></i><b>{{ currentMission ? getEventTypeLabel(currentMission.eventType) : 'FREE SLOT' }}</b></div>
            <h2>{{ currentMission ? eventTitle(currentMission) : '为今天选择一个明确的学习成果' }}</h2>
            <p>{{ currentMission ? eventDescription(currentMission) : '计划不是为了把日历填满，而是决定今天要留下什么证据。可以从知识脑图选择一个知识点，或前往计划页安排任务。' }}</p>
            <div class="mission-actions">
              <button v-if="currentMission && ['PLANNED', 'IN_PROGRESS'].includes(currentMission.status)" class="mission-primary" @click="openEventKnowledge(currentMission)">开始学习 →</button>
              <button v-else class="mission-primary" @click="router.push('/plan')">安排今日任务 →</button>
              <button v-if="currentMission && ['PLANNED', 'IN_PROGRESS'].includes(currentMission.status)" @click="openCheckinDialog(currentMission)">完成后打卡</button>
              <button v-if="currentMission?.knowledgePointId" @click="openEventKnowledge(currentMission)">查看相关知识</button>
              <button v-else @click="router.push('/knowledge/map')">从知识体系选择</button>
            </div>
          </div>
          <div class="mission-seal"><span>{{ currentMission ? getStatusLabel(currentMission.status) : '待规划' }}</span><small>{{ currentMission ? `预计 ${estimatedEventMinutes(currentMission)} MIN` : 'OPEN' }}</small></div>
        </article>

        <aside class="readiness-card">
          <header><span>今日完成度</span><code>{{ String(todayPlan.stats.completed).padStart(2, '0') }}/{{ String(todayPlan.stats.total).padStart(2, '0') }}</code></header>
          <div class="completion-orbit" :style="{ '--progress': `${completionPercent * 3.6}deg` }"><div><strong>{{ completionPercent }}%</strong><span>{{ completionPercent === 100 ? '航线完成' : '继续推进' }}</span></div></div>
          <div class="metric-grid"><div><strong>{{ completedMinutes }}</strong><span>完成分钟</span></div><div><strong>{{ plannedMinutes }}</strong><span>计划分钟</span></div><div><strong>{{ todayPlan.retests.length }}</strong><span>待复测</span></div><div><strong>{{ learningQueue.length }}</strong><span>推进中</span></div></div>
        </aside>
      </section>

      <section class="study-launchpad" aria-label="今日学习启动台">
        <div class="launch-primary">
          <p class="eyebrow">START HERE</p>
          <h2>{{ firstMissionPoint ? `先学 ${firstMissionPoint.code} · ${firstMissionPoint.title}` : '先选择一个知识点开始' }}</h2>
          <p>{{ currentMission?.learningBrief?.dailyFocus ?? recommendation?.reason ?? '打开一个知识详情页，从资料精读开始，留下可验证证据后再打卡。' }}</p>
          <div class="launch-actions">
            <button class="launch-main-button" @click="openEventKnowledge(currentMission)">打开学习内容</button>
            <button v-if="currentMission" @click="openCheckinDialog(currentMission)">完成后记录证据</button>
          </div>
        </div>

        <div class="launch-steps">
          <header><span>按这个顺序推进</span><strong>{{ currentMission ? estimatedEventMinutes(currentMission) : plannedMinutes }} min</strong></header>
          <ol v-if="startSteps.length">
            <li v-for="step in startSteps" :key="step">{{ step }}</li>
          </ol>
          <ol v-else>
            <li>打开推荐知识点，先读资料并写 3 个验证问题。</li>
            <li>做一个最小 Demo 或反例，记录能复现的证据。</li>
            <li>把结论写进今日复盘，再进行打卡。</li>
          </ol>
        </div>

        <div class="launch-proof">
          <header><span>今天完成的标准</span><button v-if="firstMissionPoint" @click="router.push(`/knowledge/${firstMissionPoint.code}`)">详情 →</button></header>
          <div class="effort-pills">
            <span v-for="stage in missionEffortStages" :key="stage.label"><b>{{ stage.label }}</b>{{ stage.minutes }}m</span>
          </div>
          <ul v-if="missionMasteryGoals.length">
            <li v-for="goal in missionMasteryGoals" :key="goal.code"><code>{{ goal.code }}</code>{{ goal.text }}</li>
          </ul>
          <p v-else>{{ missionOutputs[0] ?? '能用自己的话讲清概念，提交可运行代码、笔记或截图证据。' }}</p>
        </div>
      </section>

      <div class="today-grid">
        <section class="route-panel">
          <header class="section-heading"><div><p class="eyebrow">ACTION ROUTE</p><h2>今日行动时间线</h2></div><span>{{ todayPlan.events.length }} 个节点</span></header>
          <div v-if="todayPlan.events.length" class="event-route">
            <article v-for="(event, index) in todayPlan.events" :key="event.id" :class="[`status-${event.status.toLowerCase()}`, { current: currentMission?.id === event.id }]">
              <time>{{ formatTime(event.startAt) }}</time><div class="route-marker"><i></i><span>{{ String(index + 1).padStart(2, '0') }}</span></div>
              <div class="route-copy"><div><span>{{ getEventTypeLabel(event.eventType) }}</span><small>预计 {{ estimatedEventMinutes(event) }} MIN</small></div><h3>{{ eventTitle(event) }}</h3><p>{{ eventDescription(event) }}</p></div>
              <button v-if="['PLANNED', 'IN_PROGRESS'].includes(event.status)" @click="openCheckinDialog(event)">{{ event.status === 'IN_PROGRESS' ? '继续并打卡' : '开始 / 打卡' }}</button><span v-else class="event-state">{{ getStatusLabel(event.status) }}</span>
            </article>
          </div>
          <div v-else class="actionable-empty"><span>＋</span><div><strong>今日还没有行动节点</strong><p>从周计划中选择任务，或创建一条 30–90 分钟的学习事件。</p></div><button @click="router.push('/plan')">去安排</button></div>
        </section>

        <aside class="side-stack">
          <section class="queue-panel">
            <header class="section-heading"><div><p class="eyebrow">LEARNING QUEUE</p><h2>需要继续推进</h2></div><button @click="router.push('/knowledge')">全部 →</button></header>
            <div v-if="learningQueue.length" class="point-queue">
              <button v-for="point in learningQueue" :key="point.id" @click="router.push(`/knowledge/${point.code}`)"><span class="point-orbit" :data-status="point.status"><i></i></span><span><code>{{ point.code }}</code><strong>{{ point.title }}</strong><small>{{ point.code === recommendation?.point?.code ? '智能推荐下一站' : point.domainTitle }}</small></span><b>{{ point.code === recommendation?.point?.code ? '下一步' : pointStatusLabel(point.status) }}</b></button>
            </div>
            <div v-else class="compact-empty"><strong>暂无推进中的知识点</strong><button @click="router.push('/knowledge/map')">从脑图选择一个</button></div>
          </section>

          <section v-if="todayPlan.retests.length" class="retest-panel"><header><span>严格复测提醒</span><strong>{{ todayPlan.retests.length }}</strong></header><button v-for="event in todayPlan.retests.slice(0, 3)" :key="event.id" :disabled="retestStartingId === event.id" @click="beginRetest(event)"><time>{{ new Date(event.startAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) }}</time><span>{{ retestStartingId === event.id ? '正在创建复测…' : eventTitle(event) }}</span></button></section>
        </aside>
      </div>

      <section class="week-strip">
        <header class="section-heading"><div><p class="eyebrow">NEXT 7 DAYS</p><h2>未来一周雷达</h2></div><button @click="router.push('/plan')">打开完整日历 →</button></header>
        <div class="week-days">
          <button v-for="day in upcomingDays" :key="day.key" :class="{ busy: day.events.length }" @click="router.push('/plan')"><span>{{ dayLabel(day.date) }}</span><strong>{{ day.date.getDate() }}</strong><i><b v-for="event in day.events.slice(0, 3)" :key="event.id" :title="event.title"></b></i><small>{{ day.events.length ? `${day.events.length} 项 · 预计 ${day.events.reduce((sum, event) => sum + estimatedEventMinutes(event), 0)}m` : '留白' }}</small></button>
        </div>
      </section>

      <section class="review-station">
        <div class="review-intro"><p class="eyebrow">EVIDENCE LOG</p><h2>把“学过”变成可追溯的证据</h2><p>一句结论、一段代码、一个失败原因，都比模糊的完成感更有价值。</p><div class="prompt-chips"><button v-for="prompt in ['今天学会了：','证据是：','仍然卡在：','明天先做：']" :key="prompt" @click="appendReviewPrompt(prompt)">{{ prompt }}</button></div></div>
        <div class="review-editor"><textarea v-model="reviewSummary" placeholder="示例：今天能脱离文档解释 Vue 响应式依赖收集，并完成了一个最小实现。证据位于……"></textarea><footer><span :class="{ success: reviewMessage?.includes('已保存') }">{{ reviewMessage ?? `${reviewSummary.trim().length} 字 · 数据仅保存在本地` }}</span><button :disabled="reviewSaving || !reviewSummary.trim()" @click="saveReview">{{ reviewSaving ? '正在归档…' : '归档今日复盘' }}</button></footer></div>
      </section>
    </template>
  </div>

  <div v-if="showCheckinDialog" class="dialog-overlay" @click.self="showCheckinDialog = false">
    <form class="dialog-content" @submit.prevent="submitCheckin">
      <header><div><p class="eyebrow">CHECK-IN · 学习证据</p><h2>{{ selectedEvent ? eventTitle(selectedEvent) : '' }}</h2></div><button type="button" aria-label="关闭" @click="showCheckinDialog = false">×</button></header>
      <fieldset><legend>这次推进的结果</legend><div class="result-options"><label v-for="option in [{ value: 'COMPLETED', label: '完成', hint: '目标与证据都达成' }, { value: 'PARTIAL', label: '部分完成', hint: '留下明确后续动作' }, { value: 'SKIPPED', label: '未执行', hint: '诚实记录阻塞原因' }]" :key="option.value" :class="{ selected: checkinForm.result === option.value }"><input v-model="checkinForm.result" type="radio" :value="option.value" /><span><strong>{{ option.label }}</strong><small>{{ option.hint }}</small></span></label></div></fieldset>
      <div class="duration-field"><label for="duration">实际投入</label><div><button type="button" @click="checkinForm.actualMinutes = Math.max(0, checkinForm.actualMinutes - 15)">−</button><input id="duration" v-model.number="checkinForm.actualMinutes" type="number" min="0" max="900" /><span>分钟</span><button type="button" @click="checkinForm.actualMinutes = Math.min(900, checkinForm.actualMinutes + 15)">＋</button></div></div>
      <label class="note-field">学习证据或阻塞原因<textarea v-model="checkinForm.noteMd" placeholder="写下能证明进展的产出、关键结论，或者下一步要解决的问题"></textarea></label>
      <div class="range-row"><label>精力状态 <strong>{{ checkinForm.energyLevel }}/5</strong><input v-model.number="checkinForm.energyLevel" type="range" min="1" max="5" /></label><label>感知难度 <strong>{{ checkinForm.difficultyLevel }}/5</strong><input v-model.number="checkinForm.difficultyLevel" type="range" min="1" max="5" /></label></div>
      <footer><button type="button" @click="showCheckinDialog = false">暂不记录</button><button class="submit-button" type="submit" :disabled="checkinSaving">{{ checkinSaving ? '正在保存…' : '记录本次学习' }}</button></footer>
    </form>
  </div>
</template>

<style scoped src="./TodayPage.styles.css"></style>
