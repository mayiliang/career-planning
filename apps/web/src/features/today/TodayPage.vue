<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  apiClient,
  type KnowledgePointDetail,
  type LearningWorkspace,
  type KnowledgePointListItem,
} from '@/api/client';
import BaseDialog from '@/components/BaseDialog.vue';
import AppIcon from '@/components/AppIcon.vue';

const router = useRouter();
const workspace = ref<LearningWorkspace | null>(null);
const points = ref<KnowledgePointListItem[]>([]);
const suggestedDetail = ref<KnowledgePointDetail | null>(null);
const loading = ref(true);
const error = ref('');
const showCheckin = ref(false);
const checkinSaving = ref(false);
const checkinError = ref('');
const pointSearch = ref('');
const selectedOnly = ref(false);
const pendingAction = ref('');
const feedback = ref('');
const checkinForm = ref({ pointCodes: [] as string[], summaryMd: '', actualMinutes: 60, energyLevel: 3, difficultyLevel: 3 });
const selectedPoints = computed(() => points.value.filter((point) => checkinForm.value.pointCodes.includes(point.code)));
const availablePoints = computed(() => {
  const keyword = pointSearch.value.trim().toLocaleLowerCase();
  return points.value.filter((point) =>
    (!selectedOnly.value || checkinForm.value.pointCodes.includes(point.code)) &&
    (!keyword || `${point.code} ${point.title} ${point.domainTitle}`.toLocaleLowerCase().includes(keyword)),
  );
});
const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Hong_Kong', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const dateLabel = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Hong_Kong', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date());
const deferred = computed(() => points.value.filter((item) => item.learningState === 'DEFERRED').slice(0, 8));
const currentProgress = computed(() => workspace.value ? Math.round(workspace.value.stats.learned / Math.max(1, workspace.value.stats.total) * 100) : 0);
const firstRecommendedActivity = computed(() => {
  const activities = suggestedDetail.value?.learningActivities ?? [];
  return activities.find((activity) => !activity.optional) ?? activities[0] ?? null;
});

async function load() {
  loading.value = !workspace.value;
  error.value = '';
  try {
    const [workspaceData, pointData] = await Promise.all([apiClient.getLearningWorkspace(), apiClient.getKnowledgePoints()]);
    workspace.value = workspaceData;
    points.value = pointData.items;
    suggestedDetail.value = null;
    if (workspaceData.suggested) {
      try {
        suggestedDetail.value = await apiClient.getKnowledgePoint(workspaceData.suggested.code);
      } catch {
        // 推荐详情只增强首次启动卡；失败时保留基础推荐，不阻断学习台。
      }
    }
  } catch (reason) { error.value = reason instanceof Error ? reason.message : '学习台加载失败'; }
  finally { loading.value = false; }
}

function openCheckin() {
  checkinError.value = '';
  pointSearch.value = '';
  selectedOnly.value = false;
  const existing = workspace.value?.todayCheckin;
  checkinForm.value = {
    pointCodes: existing?.points.map((item) => item.code) ?? (workspace.value?.current ? [workspace.value.current.code] : []),
    summaryMd: existing?.summaryMd ?? '', actualMinutes: existing?.actualMinutes ?? 60,
    energyLevel: existing?.energyLevel ?? 3, difficultyLevel: existing?.difficultyLevel ?? 3,
  };
  showCheckin.value = true;
}

function togglePoint(code: string) {
  const values = checkinForm.value.pointCodes;
  checkinForm.value.pointCodes = values.includes(code) ? values.filter((item) => item !== code) : [...values, code];
}

async function saveCheckin() {
  if (checkinSaving.value) return;
  checkinError.value = '';
  if (!checkinForm.value.pointCodes.length) { checkinError.value = '请至少选择一个今天学习过的知识点'; return; }
  if (!Number.isInteger(checkinForm.value.actualMinutes) || checkinForm.value.actualMinutes < 0 || checkinForm.value.actualMinutes > 1440) {
    checkinError.value = '学习时长请填写 0–1440 之间的整数分钟。';
    return;
  }
  checkinSaving.value = true;
  try {
    await apiClient.saveLearningCheckin(today, checkinForm.value);
    showCheckin.value = false;
    feedback.value = '今日学习已记录，下次回来可以继续编辑。';
    await load();
  } catch (reason) { checkinError.value = reason instanceof Error ? reason.message : '打卡保存失败，请重试'; }
  finally { checkinSaving.value = false; }
}

async function restore(code: string) {
  if (pendingAction.value) return;
  pendingAction.value = code;
  error.value = '';
  try {
    await apiClient.restoreLearningPoint(code);
    feedback.value = `${code} 已恢复到学习列表。`;
    await load();
  } catch (reason) { error.value = reason instanceof Error ? reason.message : '恢复失败，请重试'; }
  finally { pendingAction.value = ''; }
}

async function startPoint(code: string) {
  if (pendingAction.value) return;
  pendingAction.value = code;
  error.value = '';
  try {
    await apiClient.focusLearningPoint(code);
    await router.push(`/knowledge/${code}`);
  } catch (reason) { error.value = reason instanceof Error ? reason.message : '暂时无法开始，请重试'; }
  finally { pendingAction.value = ''; }
}

onMounted(load);
</script>

<template>
  <div class="learning-workspace">
    <header class="workspace-header">
      <div><p>YOUR LEARNING SPACE <span class="date-label">{{ dateLabel }}</span></p><h1>学习台<span class="heading-dot" aria-hidden="true">.</span></h1><span>每一点积累，都在拓宽你的能力边界。按自己的节奏，继续就好。</span></div>
      <div class="header-actions"><button @click="router.push('/knowledge/map')"><AppIcon name="map" />从知识体系选择</button><button class="primary" :disabled="loading || !workspace" @click="openCheckin"><AppIcon name="plus" />{{ workspace?.todayCheckin ? '修改今日打卡' : '记录今日学习' }}</button></div>
    </header>

    <div v-if="loading" class="workspace-skeleton" role="status"><span class="sr-only">正在恢复你的学习现场…</span><div class="skeleton-focus"></div><div></div><div></div></div>
    <div v-else-if="error && !workspace" class="state-card error">{{ error }}<button @click="load">重试</button></div>

    <template v-else-if="workspace">
      <p v-if="error" class="inline-error" role="alert">{{ error }}</p>
      <p v-if="feedback" class="inline-success" role="status"><AppIcon name="check" />{{ feedback }}<button aria-label="关闭提示" @click="feedback = ''"><AppIcon name="close" /></button></p>
      <section v-if="workspace.current" class="current-card">
        <div class="current-index"><small>{{ workspace.current.learningState === 'LEARNED' ? 'JUST LEARNED' : 'CURRENT' }}</small><strong>{{ workspace.current.code }}</strong><span>{{ workspace.current.learningState === 'LEARNED' ? '最近完成' : '当前正在学' }}</span></div>
        <div class="current-copy">
          <p>{{ workspace.current.domainTitle }}</p><h2>{{ workspace.current.title }}</h2>
          <span>{{ workspace.current.learningApproach }}</span>
          <div><i>学习状态：{{ { NOT_STARTED: '未开始', LEARNING: '学习中', LEARNED: '已学完', DEFERRED: '稍后学习' }[workspace.current.learningState] }}</i><i>掌握：M{{ workspace.current.masteryLevel }}</i><i>{{ workspace.current.challengeProfileLabel }}</i></div>
        </div>
        <div class="current-actions">
          <button v-if="workspace.current.learningState !== 'LEARNED'" class="primary" @click="router.push(`/knowledge/${workspace.current.code}`)">继续学习 →</button>
          <button v-else class="primary" @click="router.push(`/knowledge/${workspace.current.code}`)">回顾已学内容</button>
          <button v-if="workspace.current.learningState === 'LEARNED' && workspace.suggested" :disabled="Boolean(pendingAction)" @click="startPoint(workspace.suggested.code)">{{ pendingAction ? '正在打开…' : `学习下一个 · ${workspace.suggested.code} →` }}</button>
          <button @click="router.push(`/knowledge/${workspace.current.code}?tab=notes`)">打开笔记</button>
        </div>
      </section>
      <section v-else class="empty-current">
        <div class="activation-copy">
          <small class="focus-eyebrow"><span></span>从这里，开始下一步 <span class="sr-only">FIRST CONCRETE STEP</span></small>
          <h2>{{ workspace.suggested ? `${workspace.suggested.code} · ${workspace.suggested.title}` : '现在没有正在学习的知识点' }}</h2>
          <template v-if="workspace.suggested && firstRecommendedActivity">
            <p class="activation-task"><strong>先完成：{{ firstRecommendedActivity.label }}</strong>{{ firstRecommendedActivity.task }}</p>
            <div class="activation-meta"><AppIcon name="clock" /><span>预计 {{ firstRecommendedActivity.minutes }} 分钟</span><span>·</span><span>可随时暂停，下次继续</span></div>
            <details class="activation-details"><summary>查看任务输入与完成标准 <span aria-hidden="true">＋</span></summary><dl class="activation-contract">
              <div><dt>固定输入</dt><dd>{{ firstRecommendedActivity.input }}</dd></div>
              <div><dt>交付结果</dt><dd>{{ firstRecommendedActivity.outputRequirements.slice(0, 2).join('；') }}</dd></div>
              <div><dt>完成判定</dt><dd>{{ firstRecommendedActivity.completionCriteria.slice(0, 2).join('；') }}</dd></div>
            </dl></details>
          </template>
          <p v-else>不需要补课，也没有逾期。{{ workspace.suggested ? `统一路线建议从 ${workspace.suggested.code} 开始。` : '想学时再从完整知识体系挑一个。' }}</p>
        </div>
        <div class="empty-actions"><button v-if="workspace.suggested" class="primary" :disabled="Boolean(pendingAction)" @click="startPoint(workspace.suggested.code)">{{ pendingAction ? '正在打开…' : '开始这项具体任务 →' }}</button><button @click="router.push('/knowledge/map')">自由选择</button></div>
      </section>

      <section class="principle-strip">
        <strong>这里没有泛化每日任务</strong><span>{{ workspace.principle }}</span><button @click="router.push('/plan')">查看求职优先路线</button>
      </section>

      <div class="workspace-grid">
        <section class="overview-card">
          <header><div><small>LEARNING OVERVIEW</small><h2>按你的节奏积累</h2></div><div class="progress-summary"><strong>{{ currentProgress }}<span>%</span></strong><small>学习完成度</small></div></header>
          <div class="progress" role="progressbar" aria-label="学习完成度" :aria-valuenow="currentProgress" :aria-valuemin="0" :aria-valuemax="100"><i :style="{ width: `${currentProgress}%` }"></i></div>
          <div class="metrics"><div><strong>{{ workspace.stats.learned }}</strong><span>已学完</span></div><div><strong>{{ workspace.stats.learning }}</strong><span>学习中</span></div><div><strong>{{ workspace.stats.mastered }}</strong><span>M3 已掌握</span></div><div><strong>{{ workspace.stats.stable }}</strong><span>M4 稳定掌握</span></div></div>
          <p>阅读完成由你确认；M0–M4 只表示系统拥有多少掌握证据。两者不会混在一起。</p>
        </section>

        <section class="checkin-card" :class="{ done: workspace.todayCheckin }">
          <header><small>DAILY CHECK-IN</small><span>{{ workspace.todayCheckin ? '今日已记录' : '等待你的记录' }}</span></header>
          <template v-if="workspace.todayCheckin">
            <h2>{{ workspace.todayCheckin.points.length }} 个知识点 · {{ workspace.todayCheckin.actualMinutes ?? 0 }} 分钟</h2>
            <div class="tags"><span v-for="item in workspace.todayCheckin.points" :key="item.code">{{ item.code }} · {{ item.title }}</span></div>
            <p>{{ workspace.todayCheckin.summaryMd || '今天没有填写额外总结。' }}</p>
          </template>
          <template v-else><h2>今天学了什么，就记录什么</h2><p>不和计划绑定，不产生缺勤、逾期或补打压力。时长、感受和总结都可选。</p></template>
          <button @click="openCheckin">{{ workspace.todayCheckin ? '编辑记录' : '现在打卡' }}<AppIcon name="arrow" /></button>
        </section>
      </div>

      <div class="lower-grid">
        <section class="recent-card">
          <header><div><small>RECENTLY LEARNED</small><h2>最近学完</h2></div><button @click="router.push('/notes')">全部笔记 →</button></header>
          <button v-for="item in workspace.recentlyLearned" :key="item.code" class="recent-row" @click="router.push(`/knowledge/${item.code}`)"><code>{{ item.code }}</code><span><strong>{{ item.title }}</strong><small>{{ item.domainTitle }}</small></span><b>M{{ item.masteryLevel }}</b></button>
          <p v-if="!workspace.recentlyLearned.length" class="empty">还没有标记为“已学完”的知识点。认真读完第一个并留下笔记，就会出现在这里。</p>
        </section>

        <section class="deferred-card">
          <header><div><small>LEARN LATER</small><h2>稍后学习</h2></div><strong>{{ workspace.stats.deferred }}</strong></header>
          <div v-if="deferred.length" class="deferred-list"><article v-for="item in deferred" :key="item.code"><div><code>{{ item.code }}</code><strong>{{ item.title }}</strong><small>{{ item.deferReason || '个人路线中暂缓' }}</small></div><button :disabled="Boolean(pendingAction)" @click="restore(item.code)">{{ pendingAction === item.code ? '恢复中…' : '恢复' }}</button></article></div>
          <p v-else class="empty">暂时没有搁置的知识点。以后不需要的分支可以放心放到这里。</p>
        </section>
      </div>
    </template>
  </div>

  <BaseDialog :open="showCheckin" size="wide" :eyebrow="`CHECK-IN · ${today}`" title="今天实际学了什么？" description="可以选择多个知识点。系统只记录事实，不检查计划。" confirm-label="保存今日打卡" :busy="checkinSaving" :confirm-disabled="!checkinForm.pointCodes.length" @cancel="showCheckin = false" @confirm="saveCheckin">
    <div class="checkin-form">
      <label class="point-search">选择今天学过的知识点<input v-model="pointSearch" type="search" :disabled="checkinSaving" placeholder="搜索全部知识点：编号、名称或领域" aria-label="搜索打卡知识点"></label>
      <div class="picker-toolbar"><span>{{ availablePoints.length }} 个匹配</span><button :aria-pressed="selectedOnly" :disabled="checkinSaving" @click="selectedOnly = !selectedOnly">{{ selectedOnly ? '查看全部' : `只看已选（${selectedPoints.length}）` }}</button></div>
      <div class="point-picker" role="group" aria-label="可选知识点">
        <button v-for="item in availablePoints" :key="item.code" type="button" :disabled="checkinSaving" :class="{ selected: checkinForm.pointCodes.includes(item.code) }" :aria-pressed="checkinForm.pointCodes.includes(item.code)" @click="togglePoint(item.code)"><code>{{ item.code }}</code><span>{{ item.title }}</span><AppIcon v-if="checkinForm.pointCodes.includes(item.code)" name="check" /></button>
        <p v-if="!availablePoints.length" class="picker-empty">{{ selectedOnly ? '还没有选中匹配的知识点。' : '没有找到匹配的知识点，试试其他名称或编号。' }}</p>
      </div>
      <div v-if="selectedPoints.length" class="selected-points" aria-label="已选知识点"><button v-for="item in selectedPoints" :key="item.code" :disabled="checkinSaving" :aria-label="`移除 ${item.code}`" @click="togglePoint(item.code)">{{ item.code }}<AppIcon name="close" /></button></div>
      <label>今日学习记录<textarea v-model="checkinForm.summaryMd" :disabled="checkinSaving" placeholder="关键收获、仍然困惑的地方、下一次想继续什么……"></textarea></label>
      <div class="number-row"><label>实际投入（分钟）<input v-model.number="checkinForm.actualMinutes" :disabled="checkinSaving" type="number" min="0" max="1440"></label><label>精力 {{ checkinForm.energyLevel }}/5<input v-model.number="checkinForm.energyLevel" :disabled="checkinSaving" type="range" min="1" max="5"></label><label>难度 {{ checkinForm.difficultyLevel }}/5<input v-model.number="checkinForm.difficultyLevel" :disabled="checkinSaving" type="range" min="1" max="5"></label></div>
      <p class="selected-count" aria-live="polite">已选 {{ checkinForm.pointCodes.length }} 个知识点</p>
      <p v-if="checkinError" class="inline-error" role="alert">{{ checkinError }}</p>
    </div>
  </BaseDialog>
</template>

<style scoped src="./TodayPage.styles.css"></style>
