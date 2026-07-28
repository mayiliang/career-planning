<script setup lang="ts">
/**
 * 日历页面
 *
 * Phase 3 实现：
 * - 月视图显示计划事件
 * - 创建计划事件
 * - 导入 48 周计划
 */
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { apiClient, type LeaveDay, type PlanEvent } from '@/api/client';

// ===== 状态 =====

const loading = ref(true);
const router = useRouter();
const error = ref<string | null>(null);
const events = ref<PlanEvent[]>([]);
const BEIJING_TIME_ZONE = 'Asia/Shanghai';
const currentDate = ref(beijingDateToDate(currentBeijingDateKey()));
const viewMode = ref<'month' | 'week' | 'day'>('week');
const leaves = ref<LeaveDay[]>([]);
const showLeaveDialog = ref(false);
const leaveDate = ref(currentBeijingDateKey());
const leaveReason = ref('');
const leaveSaving = ref(false);
const notice = ref<string | null>(null);

// ===== 计算属性 =====

const currentMonth = computed(() => {
  if (viewMode.value === 'month') return currentDate.value.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', timeZone: BEIJING_TIME_ZONE });
  if (viewMode.value === 'day') return currentDate.value.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', timeZone: BEIJING_TIME_ZONE });
  const days = activePeriodDays.value;
  const first = days[0]?.date;
  const last = days[6]?.date;
  if (!first || !last) return '';
  return `${formatBeijingMonthDay(first)} — ${formatBeijingMonthDay(last)}`;
});

const calendarDays = computed(() => {
  const normalizedCurrentDate = normalizeBeijingDate(currentDate.value);
  const year = normalizedCurrentDate.getUTCFullYear();
  const month = normalizedCurrentDate.getUTCMonth();

  // 使用北京时间对应的 UTC 中午时间，避免浏览器本地时区影响月视图边界。
  const firstDay = new Date(Date.UTC(year, month, 1, 4, 0, 0));
  const startDay = firstDay.getUTCDay();
  const startDate = new Date(firstDay);
  startDate.setUTCDate(startDate.getUTCDate() - (startDay === 0 ? 6 : startDay - 1));

  // 生成 42 天（6 周）
  const days: Array<{
    date: Date;
    isCurrentMonth: boolean;
    events: PlanEvent[];
  }> = [];

  const current = new Date(startDate);
  for (let i = 0; i < 42; i++) {
    const dateStr = dateKey(current);
    const dayEvents = events.value.filter(e => {
      const eventDate = isoToBeijingDateKey(e.startAt);
      return eventDate === dateStr;
    });

    days.push({
      date: new Date(current),
      isCurrentMonth: current.getUTCMonth() === month,
      events: dayEvents,
    });

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return days;
});

const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const leaveDates = computed(() => new Set(leaves.value.map((item) => item.leaveDate)));
function buildAgendaDay(date: Date) {
  const key = dateKey(date);
  return {
    date,
    isCurrentMonth: normalizeBeijingDate(date).getUTCMonth() === normalizeBeijingDate(currentDate.value).getUTCMonth(),
    events: events.value.filter((event) => isoToBeijingDateKey(event.startAt) === key),
  };
}

const activePeriodDays = computed(() => {
  if (viewMode.value === 'day') return [buildAgendaDay(normalizeBeijingDate(currentDate.value))];
  const current = normalizeBeijingDate(currentDate.value);
  const offset = current.getUTCDay() === 0 ? -6 : 1 - current.getUTCDay();
  current.setUTCDate(current.getUTCDate() + offset);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(current);
    date.setUTCDate(current.getUTCDate() + index);
    return buildAgendaDay(date);
  });
});

const activeEvents = computed(() => activePeriodDays.value.flatMap((day) => day.events));
const activeKnowledgeCodes = computed(() => new Set(activeEvents.value.flatMap((event) => event.learningBrief?.knowledgePoints.map((point) => point.code) ?? [])));
const pendingPrerequisites = computed(() => activeEvents.value.reduce((sum, event) => sum + (event.learningBrief?.pendingPrerequisiteCount ?? 0), 0));
const activeTasks = computed(() => activeEvents.value.reduce((sum, event) => sum + (event.learningBrief?.tasks.length ?? 0), 0));

// ===== 方法 =====

async function loadEvents() {
  loading.value = true;
  error.value = null;

  try {
    const normalizedCurrentDate = normalizeBeijingDate(currentDate.value);
    const rangeStart = new Date(normalizedCurrentDate);
    rangeStart.setUTCDate(1);
    rangeStart.setUTCDate(rangeStart.getUTCDate() - 14);
    const rangeEnd = new Date(normalizedCurrentDate);
    rangeEnd.setUTCMonth(rangeEnd.getUTCMonth() + 2, 14);

    const [eventResult, leaveResult] = await Promise.all([
      apiClient.getCalendarEvents({ from: beijingDayStartIso(dateKey(rangeStart)), to: beijingDayEndIso(dateKey(rangeEnd)) }),
      apiClient.getLeaveDays(dateKey(rangeStart), dateKey(rangeEnd)),
    ]);
    events.value = eventResult;
    leaves.value = leaveResult;
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败';
  } finally {
    loading.value = false;
  }
}

function dateKey(date: Date) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: BEIJING_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function currentBeijingDateKey() {
  return dateKey(new Date());
}

function beijingDateToDate(date: string) {
  return new Date(`${date}T12:00:00+08:00`);
}

// 统一把任意 Date 归一到“北京时间当天中午”，再使用 UTC 运算避免本地时区干扰。
function normalizeBeijingDate(date: Date) {
  return beijingDateToDate(dateKey(date));
}

function isoToBeijingDateKey(iso: string) {
  return dateKey(new Date(iso));
}

function beijingDayStartIso(date: string) {
  return new Date(`${date}T00:00:00+08:00`).toISOString();
}

function beijingDayEndIso(date: string) {
  return new Date(`${date}T23:59:59+08:00`).toISOString();
}

function formatBeijingMonthDay(date: Date) {
  const normalizedDate = normalizeBeijingDate(date);
  return `${normalizedDate.getUTCMonth() + 1}月${normalizedDate.getUTCDate()}日`;
}

function shiftBeijingDate(date: Date, days: number) {
  const nextDate = normalizeBeijingDate(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function shiftBeijingMonth(date: Date, months: number) {
  const nextDate = normalizeBeijingDate(date);
  nextDate.setUTCMonth(nextDate.getUTCMonth() + months);
  return nextDate;
}

function openLeave(date = currentDate.value) {
  leaveDate.value = dateKey(date);
  leaveReason.value = '';
  showLeaveDialog.value = true;
}

async function submitLeave() {
  leaveSaving.value = true;
  error.value = null;
  try {
    const result = await apiClient.takeLeave(leaveDate.value, leaveReason.value.trim() || undefined);
    notice.value = `已请假，${result.shiftedEventCount} 条未完成学习计划顺延 1 天`;
    showLeaveDialog.value = false;
    await loadEvents();
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '请假失败';
  } finally {
    leaveSaving.value = false;
  }
}

function prevMonth() {
  currentDate.value = viewMode.value === 'month'
    ? shiftBeijingMonth(currentDate.value, -1)
    : shiftBeijingDate(currentDate.value, viewMode.value === 'week' ? -7 : -1);
}

function nextMonth() {
  currentDate.value = viewMode.value === 'month'
    ? shiftBeijingMonth(currentDate.value, 1)
    : shiftBeijingDate(currentDate.value, viewMode.value === 'week' ? 7 : 1);
}

function goToToday() {
  currentDate.value = beijingDateToDate(currentBeijingDateKey());
}

function selectDay(date: Date) {
  currentDate.value = beijingDateToDate(dateKey(date));
  viewMode.value = 'day';
}

function getEventTypeLabel(type: string) {
  const labels: Record<string, string> = {
    LEARNING: '学',
    ASSESSMENT: '考',
    RETEST: '复',
    PROJECT_OUTPUT: '项',
    JOB_APPLICATION: '职',
    INTERVIEW: '面',
    REVIEW: '盘'
  };
  return labels[type] ?? type;
}

function getStatusClass(status: string) {
  const classes: Record<string, string> = {
    PLANNED: 'status-planned',
    IN_PROGRESS: 'status-in-progress',
    COMPLETED: 'status-completed',
    PARTIAL: 'status-partial',
    SKIPPED: 'status-skipped',
    RESCHEDULED: 'status-rescheduled'
  };
  return classes[status] ?? '';
}

function getStatusLabel(status: string) {
  return ({ PLANNED: '待开始', IN_PROGRESS: '进行中', COMPLETED: '已完成', PARTIAL: '部分完成', SKIPPED: '已跳过', RESCHEDULED: '已顺延' } as Record<string, string>)[status] ?? status;
}

function knowledgeStatusLabel(status: string) {
  return ({ NOT_STARTED: '未开始', LEARNING: '学习中', SELF_MASTERED: '待考核', FIRST_PASS_PENDING_RETEST: '待复测', MASTERED: '已掌握', NEEDS_RELEARNING: '需重学' } as Record<string, string>)[status] ?? status;
}

function eventMinutes(event: PlanEvent) {
  return Math.max(0, Math.round((new Date(event.endAt).getTime() - new Date(event.startAt).getTime()) / 60000));
}

function eventStartTime(event: PlanEvent) {
  return new Date(event.startAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: BEIJING_TIME_ZONE });
}

// ===== 生命周期 =====

onMounted(() => {
  loadEvents();
});

watch(currentDate, () => {
  loadEvents();
});
</script>

<template>
  <div class="calendar-page">
    <header class="calendar-heading">
      <div><p class="eyebrow">DAILY LEARNING CONTRACT</p><h1>学习计划</h1><p>每天都明确学什么、掌握到什么程度、完成什么任务，以及用什么产出证明。</p></div>
      <div class="heading-actions"><span class="auto-plan-note">计划已由系统自动生成</span><button class="leave-button" @click="openLeave()">请假并顺延</button></div>
    </header>
    <p v-if="notice" class="notice" role="status">{{ notice }}</p>
    <section class="plan-overview-strip" aria-label="当前计划概览">
      <div><strong>48</strong><span>周完整路径</span></div>
      <div><strong>190</strong><span>知识点全覆盖</span></div>
      <div><strong>{{ activeKnowledgeCodes.size }}</strong><span>本{{ viewMode === 'day' ? '日' : viewMode === 'week' ? '周' : '期' }}知识点</span></div>
      <div><strong>{{ activeTasks }}</strong><span>严格任务</span></div>
      <div class="dependency-summary" :class="{ ready: pendingPrerequisites === 0 }"><i></i><span><strong>{{ pendingPrerequisites ? `${pendingPrerequisites} 项前置待补` : '前置路径已就绪' }}</strong><small>前置状态只做学习顺序提示，不会阻止打开任务</small></span></div>
    </section>
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="nav-controls">
        <button @click="prevMonth" class="nav-button" aria-label="上一周期">←</button>
        <span class="current-month">{{ currentMonth }}</span>
        <button @click="nextMonth" class="nav-button" aria-label="下一周期">→</button>
        <button @click="goToToday" class="today-button">今天</button>
      </div>

      <div class="view-controls">
        <button
          :class="['view-button', { active: viewMode === 'month' }]"
          @click="viewMode = 'month'"
        >
          月
        </button>
        <button
          :class="['view-button', { active: viewMode === 'week' }]"
          @click="viewMode = 'week'"
        >
          周
        </button>
        <button
          :class="['view-button', { active: viewMode === 'day' }]"
          @click="viewMode = 'day'"
        >
          日
        </button>
      </div>

      <span class="plan-density">{{ events.length }} 条计划 · {{ leaves.length }} 天请假</span>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      加载中...
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-state">
      {{ error }}
      <button @click="loadEvents" class="retry-button">重试</button>
    </div>

    <!-- 月视图 -->
    <div v-else-if="viewMode === 'month'" class="month-view">
      <!-- 星期标题 -->
      <div class="weekday-header">
        <div v-for="day in weekDays" :key="day" class="weekday-cell">
          {{ day }}
        </div>
      </div>

      <!-- 日期网格 -->
      <div class="month-grid">
        <div
          v-for="(day, index) in calendarDays"
          :key="index"
          :class="['day-cell', {
            'other-month': !day.isCurrentMonth,
            'is-today': dateKey(day.date) === currentBeijingDateKey(),
            'is-leave': leaveDates.has(dateKey(day.date))
          }]"
          role="button"
          tabindex="0"
          @click="selectDay(day.date)"
          @keydown.enter.prevent="selectDay(day.date)"
          @dblclick="openLeave(day.date)"
        >
          <div class="day-number">
            {{ day.date.getDate() }}
          </div>

          <div class="day-events">
            <div v-if="leaveDates.has(dateKey(day.date))" class="leave-tag">休 · 计划已顺延</div>
            <button
              v-for="event in day.events.slice(0, 3)"
              :key="event.id"
              type="button"
              :class="['event-tag', getStatusClass(event.status)]"
              @click.stop="selectDay(day.date)"
            >
              <span class="event-type-badge">{{ getEventTypeLabel(event.eventType) }}</span>
              <span class="event-title-short">{{ (event.learningBrief?.displayTitle ?? event.title).slice(0, 14) }}</span>
            </button>
            <div v-if="day.events.length > 3" class="more-events">
              +{{ day.events.length - 3 }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="agenda-view" :class="`agenda-mode-${viewMode}`" :data-view-mode="viewMode">
      <article v-for="day in activePeriodDays" :key="dateKey(day.date)" class="agenda-day" :data-date-key="dateKey(day.date)" :class="{ 'is-leave': leaveDates.has(dateKey(day.date)) }">
        <header class="agenda-day-header"><div class="agenda-date"><span>{{ day.date.toLocaleDateString('zh-CN', { weekday: 'short', timeZone: BEIJING_TIME_ZONE }) }}</span><strong>{{ Number(dateKey(day.date).slice(8, 10)) }}</strong><small>{{ day.date.toLocaleDateString('zh-CN', { month: 'short', timeZone: BEIJING_TIME_ZONE }) }}</small></div><div class="day-load"><strong>{{ day.events.reduce((sum, event) => sum + (event.learningBrief?.knowledgePoints.length ?? 0), 0) }}</strong><span>知识点</span><i></i><strong>{{ day.events.reduce((sum, event) => sum + (event.learningBrief?.effort.estimatedTotalMinutes ?? eventMinutes(event)), 0) }}</strong><span>预计分钟</span></div><button @click="openLeave(day.date)">{{ leaveDates.has(dateKey(day.date)) ? '已请假' : '当天请假' }}</button></header>
        <div v-if="day.events.length" class="agenda-events">
          <article v-for="event in day.events" :key="event.id" class="learning-contract" :class="getStatusClass(event.status)">
            <header class="contract-header">
              <div class="contract-time"><time>{{ eventStartTime(event) }}</time><span>{{ eventMinutes(event) }} MIN</span></div>
              <div class="contract-title"><p>{{ event.learningBrief?.weekTheme ?? getEventTypeLabel(event.eventType) }}</p><h2>{{ event.learningBrief?.displayTitle ?? event.title }}</h2></div>
              <span class="contract-status">{{ getStatusLabel(event.status) }}</span>
            </header>

            <template v-if="event.learningBrief">
              <section class="plan-context">
                <div class="plan-context-main">
                  <span>{{ event.learningBrief.phase }}</span>
                  <strong>{{ event.learningBrief.dailyFocus }}</strong>
                  <p>{{ event.learningBrief.weekOutcome }}</p>
                </div>
                <dl>
                  <div><dt>PROJECT</dt><dd>{{ event.learningBrief.projectAnchor }}</dd></div>
                  <div><dt>ASSESS</dt><dd>{{ event.learningBrief.assessmentMode }}</dd></div>
                </dl>
                <div class="review-cadence"><span>复测节奏</span><i v-for="item in event.learningBrief.reviewCadence" :key="item">{{ item }}</i></div>
                <div class="effort-budget" :class="{ overloaded: event.learningBrief.effort.overloaded }">
                  <header><span>预计投入 <strong>{{ event.learningBrief.effort.estimatedTotalMinutes }} 分钟</strong></span><em>{{ event.learningBrief.effort.utilizationPercent }}% / {{ event.learningBrief.effort.capacityMinutes }} 分钟容量</em></header>
                  <div class="effort-track"><i :style="{ width: `${Math.min(100, event.learningBrief.effort.utilizationPercent)}%` }"></i></div>
                  <footer><span>资料 {{ event.learningBrief.effort.studyMinutes }}m</span><span>练习 {{ event.learningBrief.effort.practiceMinutes }}m</span><span>项目 {{ event.learningBrief.effort.projectMinutes }}m</span><span>考核 {{ event.learningBrief.effort.assessmentMinutes }}m</span><b v-if="event.learningBrief.effort.overloaded">建议顺延低优先级任务</b></footer>
                </div>
              </section>

              <div class="knowledge-binding">
                <span>今日知识</span>
                <button v-for="point in event.learningBrief.knowledgePoints" :key="point.id" @click="router.push(`/knowledge/${point.code}`)">
                  <code>{{ point.code }}</code><strong>{{ point.title }}</strong><small :data-status="point.status">{{ knowledgeStatusLabel(point.status) }}</small>
                </button>
                <span class="prerequisite-state" :class="{ ready: event.learningBrief.prerequisitesReady }">{{ event.learningBrief.prerequisitesReady ? '前置已就绪' : `${event.learningBrief.pendingPrerequisiteCount} 项前置待补` }}</span>
              </div>

              <div class="contract-grid">
                <section class="contract-section learn-section"><header><span>01</span><div><strong>需要学习</strong><small>明确今天的知识边界</small></div></header><ul><li v-for="content in event.learningBrief.learningContent" :key="content">{{ content }}</li></ul></section>
                <section class="contract-section mastery-section"><header><span>02</span><div><strong>必须掌握</strong><small>达到这些标准才算完成</small></div></header><ul><li v-for="goal in event.learningBrief.masteryGoals" :key="goal.code"><code>{{ goal.code }}</code>{{ goal.text }}</li></ul></section>
                <section class="contract-section task-section"><header><span>03</span><div><strong>必须完成</strong><small>面试难度的实践任务</small></div></header><ul><li v-for="task in event.learningBrief.tasks" :key="task.code"><code>{{ task.code }}</code>{{ task.text }}</li></ul></section>
                <section class="contract-section output-section"><header><span>04</span><div><strong>验收产出</strong><small>留下可追溯学习证据</small></div></header><ul><li v-for="output in event.learningBrief.outputs" :key="output">{{ output }}</li></ul></section>
              </div>

              <footer class="contract-footer"><p><span>复盘问题</span>{{ event.learningBrief.reviewQuestion }}</p><div><button @click="router.push(`/knowledge/${event.learningBrief.knowledgePoints[0]?.code}`)">开始学习</button><button class="graph-link" @click="router.push('/knowledge/graph')">查看前置关系</button></div></footer>
            </template>
            <div v-else class="plain-event"><p>{{ event.description || '这是一个独立计划事件，暂未绑定知识点。' }}</p></div>
          </article>
        </div>
        <div v-else class="agenda-empty"><span>NO PLAN</span><p>当天没有排期。重置学习进度后，系统会从北京时间今天开始连续生成每天同强度的学习计划。</p></div>
      </article>
    </div>
  </div>

  <div v-if="showLeaveDialog" class="dialog-overlay" @click.self="showLeaveDialog = false">
    <form class="dialog-content leave-dialog" @submit.prevent="submitLeave">
      <p class="eyebrow">SHIFT THE ROUTE</p>
      <h3>请假并顺延学习计划</h3>
      <p>从请假当天开始，所有未完成的学习、考核、复测和项目任务整体后移一天。</p>
      <div class="form-group"><label for="leave-date">请假日期</label><input id="leave-date" v-model="leaveDate" type="date" required /></div>
      <div class="form-group"><label for="leave-reason">原因（可选）</label><input id="leave-reason" v-model="leaveReason" maxlength="300" placeholder="休息、出行或临时事务" /></div>
      <div class="import-actions"><button class="import-confirm-button" :disabled="leaveSaving">{{ leaveSaving ? '顺延中...' : '确认请假并顺延' }}</button><button type="button" class="cancel-button" @click="showLeaveDialog = false">取消</button></div>
    </form>
  </div>

</template>

<style scoped src="./CalendarPage.styles.css"></style>
