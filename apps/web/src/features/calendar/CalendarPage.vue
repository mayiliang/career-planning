<script setup lang="ts">
/**
 * 日历页面
 *
 * Phase 3 实现：
 * - 月视图显示计划事件
 * - 创建计划事件
 * - 导入 16 周计划
 */
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { apiClient, type LeaveDay, type PlanEvent } from '@/api/client';

// ===== 状态 =====

const loading = ref(true);
const router = useRouter();
const error = ref<string | null>(null);
const events = ref<PlanEvent[]>([]);
const currentDate = ref(new Date());
const viewMode = ref<'month' | 'week' | 'day'>('week');
const leaves = ref<LeaveDay[]>([]);
const showLeaveDialog = ref(false);
const leaveDate = ref(new Date().toISOString().slice(0, 10));
const leaveReason = ref('');
const leaveSaving = ref(false);
const notice = ref<string | null>(null);

// ===== 计算属性 =====

const currentMonth = computed(() => {
  if (viewMode.value === 'month') return currentDate.value.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
  if (viewMode.value === 'day') return currentDate.value.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  const days = activePeriodDays.value;
  const first = days[0]?.date;
  const last = days[6]?.date;
  if (!first || !last) return '';
  return `${first.getMonth() + 1}月${first.getDate()}日 — ${last.getMonth() + 1}月${last.getDate()}日`;
});

const calendarDays = computed(() => {
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth();

  // 获取当月第一天和最后一天
  const firstDay = new Date(year, month, 1);
  // 计算日历开始日期（从周一开始）
  const startDay = firstDay.getDay();
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - (startDay === 0 ? 6 : startDay - 1));

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
      const eventDate = e.startAt.split('T')[0];
      return eventDate === dateStr;
    });

    days.push({
      date: new Date(current),
      isCurrentMonth: current.getMonth() === month,
      events: dayEvents,
    });

    current.setDate(current.getDate() + 1);
  }

  return days;
});

const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const leaveDates = computed(() => new Set(leaves.value.map((item) => item.leaveDate)));
const activePeriodDays = computed(() => {
  if (viewMode.value === 'day') return calendarDays.value.filter((day) => dateKey(day.date) === dateKey(currentDate.value));
  const current = new Date(currentDate.value);
  const offset = current.getDay() === 0 ? -6 : 1 - current.getDay();
  current.setDate(current.getDate() + offset);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(current);
    date.setDate(current.getDate() + index);
    return {
      date,
      isCurrentMonth: date.getMonth() === currentDate.value.getMonth(),
      events: events.value.filter((event) => event.startAt.startsWith(dateKey(date))),
    };
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
    // 加载当月事件
    const year = currentDate.value.getFullYear();
    const month = currentDate.value.getMonth();

    const from = new Date(year, month, 1).toISOString();
    const to = new Date(year, month + 2, 0).toISOString();

    const [eventResult, leaveResult] = await Promise.all([
      apiClient.getCalendarEvents({ from, to }),
      apiClient.getLeaveDays(dateKey(new Date(year, month, 1)), dateKey(new Date(year, month + 2, 0))),
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
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
  const newDate = new Date(currentDate.value);
  if (viewMode.value === 'month') newDate.setMonth(newDate.getMonth() - 1);
  else newDate.setDate(newDate.getDate() - (viewMode.value === 'week' ? 7 : 1));
  currentDate.value = newDate;
}

function nextMonth() {
  const newDate = new Date(currentDate.value);
  if (viewMode.value === 'month') newDate.setMonth(newDate.getMonth() + 1);
  else newDate.setDate(newDate.getDate() + (viewMode.value === 'week' ? 7 : 1));
  currentDate.value = newDate;
}

function goToToday() {
  currentDate.value = new Date();
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
      <div><strong>16</strong><span>周完整路径</span></div>
      <div><strong>143</strong><span>知识点全覆盖</span></div>
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
            'is-today': day.date.toDateString() === new Date().toDateString(),
            'is-leave': leaveDates.has(dateKey(day.date))
          }]"
          @dblclick="openLeave(day.date)"
        >
          <div class="day-number">
            {{ day.date.getDate() }}
          </div>

          <div class="day-events">
            <div v-if="leaveDates.has(dateKey(day.date))" class="leave-tag">休 · 计划已顺延</div>
            <div
              v-for="event in day.events.slice(0, 3)"
              :key="event.id"
              :class="['event-tag', getStatusClass(event.status)]"
            >
              <span class="event-type-badge">{{ getEventTypeLabel(event.eventType) }}</span>
              <span class="event-title-short">{{ (event.learningBrief?.displayTitle ?? event.title).slice(0, 14) }}</span>
            </div>
            <div v-if="day.events.length > 3" class="more-events">
              +{{ day.events.length - 3 }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="agenda-view" :class="`agenda-${viewMode}`">
      <article v-for="day in activePeriodDays" :key="dateKey(day.date)" class="agenda-day" :class="{ 'is-leave': leaveDates.has(dateKey(day.date)) }">
        <header class="agenda-day-header"><div class="agenda-date"><span>{{ day.date.toLocaleDateString('zh-CN', { weekday: 'short' }) }}</span><strong>{{ day.date.getDate() }}</strong><small>{{ day.date.toLocaleDateString('zh-CN', { month: 'short' }) }}</small></div><div class="day-load"><strong>{{ day.events.reduce((sum, event) => sum + (event.learningBrief?.knowledgePoints.length ?? 0), 0) }}</strong><span>知识点</span><i></i><strong>{{ day.events.reduce((sum, event) => sum + (event.learningBrief?.effort.estimatedTotalMinutes ?? eventMinutes(event)), 0) }}</strong><span>预计分钟</span></div><button @click="openLeave(day.date)">{{ leaveDates.has(dateKey(day.date)) ? '已请假' : '当天请假' }}</button></header>
        <div v-if="day.events.length" class="agenda-events">
          <article v-for="event in day.events" :key="event.id" class="learning-contract" :class="getStatusClass(event.status)">
            <header class="contract-header">
              <div class="contract-time"><time>{{ new Date(event.startAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }) }}</time><span>{{ eventMinutes(event) }} MIN</span></div>
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
        <div v-else class="agenda-empty"><span>OPEN DAY</span><p>当天没有计划，可以用于休息、补前置知识或完成未收尾的产出。</p></div>
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
