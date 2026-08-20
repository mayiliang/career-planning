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

const router = useRouter();
const workspace = ref<LearningWorkspace | null>(null);
const points = ref<KnowledgePointListItem[]>([]);
const suggestedDetail = ref<KnowledgePointDetail | null>(null);
const loading = ref(true);
const error = ref('');
const showCheckin = ref(false);
const checkinSaving = ref(false);
const checkinForm = ref({ pointCodes: [] as string[], summaryMd: '', actualMinutes: 60, energyLevel: 3, difficultyLevel: 3 });
const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Hong_Kong', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const dateLabel = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Hong_Kong', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date());
const deferred = computed(() => points.value.filter((item) => item.learningState === 'DEFERRED').slice(0, 8));
const currentProgress = computed(() => workspace.value ? Math.round(workspace.value.stats.learned / Math.max(1, workspace.value.stats.total) * 100) : 0);
const firstRecommendedActivity = computed(() => {
  const activities = suggestedDetail.value?.learningActivities ?? [];
  return activities.find((activity) => !activity.optional) ?? activities[0] ?? null;
});

async function load() {
  loading.value = true;
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
  if (!checkinForm.value.pointCodes.length) { error.value = '请至少选择一个今天学习过的知识点'; return; }
  checkinSaving.value = true;
  try {
    await apiClient.saveLearningCheckin(today, checkinForm.value);
    showCheckin.value = false;
    await load();
  } catch (reason) { error.value = reason instanceof Error ? reason.message : '打卡保存失败'; }
  finally { checkinSaving.value = false; }
}

async function restore(code: string) {
  await apiClient.restoreLearningPoint(code);
  await load();
}

async function startPoint(code: string) {
  await apiClient.focusLearningPoint(code);
  await router.push(`/knowledge/${code}`);
}

onMounted(load);
</script>

<template>
  <div class="learning-workspace">
    <header class="workspace-header">
      <div><p>SELF-PACED LEARNING · {{ today }}</p><h1>学习台</h1><span>{{ dateLabel }}。今天学多少、学不学，由你决定。</span></div>
      <div><button @click="router.push('/knowledge/map')">从知识体系选择</button><button class="primary" @click="openCheckin">{{ workspace?.todayCheckin ? '修改今日打卡' : '记录今日学习' }}</button></div>
    </header>

    <div v-if="loading" class="state-card">正在恢复你的学习现场…</div>
    <div v-else-if="error && !workspace" class="state-card error">{{ error }}<button @click="load">重试</button></div>

    <template v-else-if="workspace">
      <p v-if="error" class="inline-error">{{ error }}</p>
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
          <button v-if="workspace.current.learningState === 'LEARNED' && workspace.suggested" @click="startPoint(workspace.suggested.code)">学习下一个 · {{ workspace.suggested.code }} →</button>
          <button @click="router.push(`/knowledge/${workspace.current.code}?tab=notes`)">打开笔记</button>
        </div>
      </section>
      <section v-else class="empty-current">
        <div class="activation-copy">
          <small>FIRST CONCRETE STEP</small>
          <h2>{{ workspace.suggested ? `${workspace.suggested.code} · ${workspace.suggested.title}` : '现在没有正在学习的知识点' }}</h2>
          <template v-if="workspace.suggested && firstRecommendedActivity">
            <p class="activation-task"><strong>先完成：{{ firstRecommendedActivity.label }}</strong>{{ firstRecommendedActivity.task }}</p>
            <dl class="activation-contract">
              <div><dt>预计投入</dt><dd>{{ firstRecommendedActivity.minutes }} 分钟</dd></div>
              <div><dt>固定输入</dt><dd>{{ firstRecommendedActivity.input }}</dd></div>
              <div><dt>交付结果</dt><dd>{{ firstRecommendedActivity.outputRequirements.slice(0, 2).join('；') }}</dd></div>
              <div><dt>完成判定</dt><dd>{{ firstRecommendedActivity.completionCriteria.slice(0, 2).join('；') }}</dd></div>
            </dl>
          </template>
          <p v-else>不需要补课，也没有逾期。{{ workspace.suggested ? `统一路线建议从 ${workspace.suggested.code} 开始。` : '想学时再从完整知识体系挑一个。' }}</p>
        </div>
        <div class="empty-actions"><button v-if="workspace.suggested" class="primary" @click="startPoint(workspace.suggested.code)">开始这项具体任务 →</button><button @click="router.push('/knowledge/map')">自由选择</button></div>
      </section>

      <section class="principle-strip">
        <strong>这里没有泛化每日任务</strong><span>{{ workspace.principle }}</span><button @click="router.push('/plan')">查看紧凑核心路线</button>
      </section>

      <div class="workspace-grid">
        <section class="overview-card">
          <header><div><small>LEARNING OVERVIEW</small><h2>按你的节奏积累</h2></div><strong>{{ currentProgress }}%</strong></header>
          <div class="progress"><i :style="{ width: `${currentProgress}%` }"></i></div>
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
          <button @click="openCheckin">{{ workspace.todayCheckin ? '编辑记录' : '现在打卡' }}</button>
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
          <div v-if="deferred.length" class="deferred-list"><article v-for="item in deferred" :key="item.code"><div><code>{{ item.code }}</code><strong>{{ item.title }}</strong><small>{{ item.deferReason || '个人路线中暂缓' }}</small></div><button @click="restore(item.code)">恢复</button></article></div>
          <p v-else class="empty">暂时没有搁置的知识点。以后不需要的分支可以放心放到这里。</p>
        </section>
      </div>
    </template>
  </div>

  <BaseDialog :open="showCheckin" :eyebrow="`CHECK-IN · ${today}`" title="今天实际学了什么？" description="可以选择多个知识点。系统只记录事实，不检查计划。" confirm-label="保存今日打卡" :busy="checkinSaving" :confirm-disabled="!checkinForm.pointCodes.length" @cancel="showCheckin = false" @confirm="saveCheckin">
    <div class="checkin-form">
      <div class="point-picker">
        <button v-for="item in points.filter(p => p.learningState !== 'DEFERRED').slice(0, 60)" :key="item.code" type="button" :class="{ selected: checkinForm.pointCodes.includes(item.code) }" @click="togglePoint(item.code)"><code>{{ item.code }}</code>{{ item.title }}</button>
      </div>
      <label>今日学习记录<textarea v-model="checkinForm.summaryMd" placeholder="关键收获、仍然困惑的地方、下一次想继续什么……"></textarea></label>
      <div class="number-row"><label>实际投入（分钟）<input v-model.number="checkinForm.actualMinutes" type="number" min="0" max="1440"></label><label>精力 {{ checkinForm.energyLevel }}/5<input v-model.number="checkinForm.energyLevel" type="range" min="1" max="5"></label><label>难度 {{ checkinForm.difficultyLevel }}/5<input v-model.number="checkinForm.difficultyLevel" type="range" min="1" max="5"></label></div>
      <p class="selected-count">已选 {{ checkinForm.pointCodes.length }} 个知识点</p>
    </div>
  </BaseDialog>
</template>

<style scoped>
.learning-workspace{max-width:1320px;margin:0 auto;padding:26px;display:grid;gap:18px}.workspace-header{display:flex;justify-content:space-between;gap:20px;align-items:end}.workspace-header p{font:700 .68rem ui-monospace;color:#536a9e;letter-spacing:.12em}.workspace-header h1{font-size:clamp(2rem,4vw,3.2rem);margin:3px 0}.workspace-header span{color:#6d7584}.workspace-header>div:last-child{display:flex;gap:8px}.learning-workspace button,.checkin-dialog button{border:1px solid #cbd2dc;background:#fff;border-radius:10px;padding:9px 13px;cursor:pointer;color:inherit}.learning-workspace .primary,.checkin-dialog .primary{background:#243a73;border-color:#243a73;color:#fff}.current-card,.empty-current,.overview-card,.checkin-card,.recent-card,.deferred-card{background:#fff;border:1px solid #dce2e9;border-radius:18px}.current-card{display:grid;grid-template-columns:150px 1fr auto;min-height:240px;overflow:hidden}.current-index{background:#17233f;color:#fff;padding:24px;display:flex;flex-direction:column}.current-index small{font:700 .65rem ui-monospace;letter-spacing:.15em;color:#aab8db}.current-index strong{font:800 1.45rem ui-monospace;margin-top:auto}.current-index span{color:#aeb9d1;font-size:.78rem}.current-copy{padding:27px}.current-copy>p{font-size:.75rem;color:#65718a;margin:0}.current-copy h2{font-size:clamp(1.55rem,3vw,2.5rem);margin:8px 0}.current-copy>span{display:block;max-width:750px;line-height:1.7;color:#596478}.current-copy>div{display:flex;gap:7px;flex-wrap:wrap;margin-top:18px}.current-copy i{font-style:normal;background:#f0f3f8;padding:7px 9px;border-radius:8px;font-size:.74rem}.current-actions{padding:24px;display:flex;flex-direction:column;justify-content:center;gap:8px}.empty-current{padding:30px;display:flex;justify-content:space-between;align-items:center}.empty-current h2{margin:4px 0}.empty-current p{color:#687184}.principle-strip{display:flex;gap:16px;align-items:center;background:#eef2ff;border:1px solid #dce3ff;border-radius:12px;padding:13px 16px}.principle-strip span{flex:1;color:#52617c}.principle-strip button{background:transparent;border:0}.workspace-grid,.lower-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:16px}.overview-card,.checkin-card,.recent-card,.deferred-card{padding:22px}.overview-card header,.recent-card header,.deferred-card header,.checkin-card header{display:flex;justify-content:space-between;align-items:start}.overview-card small,.checkin-card small,.recent-card small,.deferred-card small,.checkin-dialog small{font:700 .67rem ui-monospace;color:#62729b;letter-spacing:.12em}.overview-card h2,.recent-card h2,.deferred-card h2{margin:4px 0 15px}.overview-card header>strong{font:800 2rem ui-monospace}.progress{height:8px;background:#eef1f5;border-radius:10px;overflow:hidden}.progress i{display:block;height:100%;background:#3659b4}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:17px 0}.metrics div{background:#f5f7fa;border-radius:10px;padding:12px}.metrics strong,.metrics span{display:block}.metrics strong{font-size:1.4rem}.metrics span{font-size:.75rem;color:#727b89}.overview-card>p{color:#667185;font-size:.82rem}.checkin-card.done{background:#f1faf4;border-color:#cfe6d6}.checkin-card header span{font-size:.75rem}.checkin-card h2{margin:22px 0 8px}.checkin-card p{line-height:1.65;color:#5f6c7c}.checkin-card>button{margin-top:8px}.tags{display:flex;gap:6px;flex-wrap:wrap}.tags span{background:#fff;border:1px solid #d5e5d9;padding:5px 7px;border-radius:7px;font-size:.72rem}.recent-row{width:100%;display:grid!important;grid-template-columns:75px 1fr auto;text-align:left;align-items:center;border-width:0 0 1px!important;border-radius:0!important;padding:12px 3px!important}.recent-row span strong,.recent-row span small{display:block}.recent-row span small{color:#7a8492;margin-top:3px}.recent-row b{color:#425ca2}.deferred-card header>strong{font-size:2rem}.deferred-list article{display:flex;justify-content:space-between;gap:10px;border-top:1px solid #e5e8ed;padding:12px 0}.deferred-list article div{display:grid;grid-template-columns:70px 1fr;gap:3px}.deferred-list article small{grid-column:2;letter-spacing:0;color:#7b8490}.empty{color:#707a89;line-height:1.6}.inline-error,.state-card.error{background:#fff0ee;color:#9c2d25;padding:12px;border-radius:10px}.state-card{padding:28px;background:#fff;border-radius:15px}.dialog-backdrop{position:fixed;inset:0;background:#11182799;z-index:50;display:grid;place-items:center;padding:18px}.checkin-dialog{width:min(780px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:18px;padding:23px}.checkin-dialog>header{display:flex;justify-content:space-between}.checkin-dialog h2{margin:5px 0}.checkin-dialog header p{color:#687386}.point-picker{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;max-height:230px;overflow:auto;margin:16px 0}.point-picker button{text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.point-picker button.selected{background:#e9eeff;border-color:#4a65af}.point-picker code{margin-right:7px;color:#3d58a4}.checkin-dialog>label{display:grid;gap:6px}.checkin-dialog textarea{min-height:120px;border:1px solid #cbd3df;border-radius:10px;padding:12px;font:inherit}.number-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:14px}.number-row label{display:grid;gap:6px;font-size:.8rem}.number-row input[type=number]{padding:8px;border:1px solid #ccd4df;border-radius:8px}.checkin-dialog footer{display:flex;justify-content:flex-end;align-items:center;gap:8px;margin-top:20px}.checkin-dialog footer span{margin-right:auto;color:#657085}@media(max-width:900px){.current-card{grid-template-columns:1fr}.current-index{min-height:80px}.current-index strong{margin-top:15px}.current-actions{align-items:start}.workspace-grid,.lower-grid{grid-template-columns:1fr}.principle-strip{align-items:flex-start;flex-direction:column}}@media(max-width:600px){.learning-workspace{padding:13px}.workspace-header{align-items:flex-start;flex-direction:column}.workspace-header>div:last-child{width:100%}.workspace-header button{flex:1}.metrics{grid-template-columns:repeat(2,1fr)}.empty-current{align-items:flex-start;flex-direction:column;gap:12px}.point-picker,.number-row{grid-template-columns:1fr}.checkin-dialog footer{flex-wrap:wrap}.checkin-dialog footer span{width:100%}}
.empty-actions{display:flex;gap:8px}.activation-copy{min-width:0;max-width:920px}.activation-task{display:grid;gap:5px;margin:12px 0;color:#526077!important}.activation-task strong{color:#263a59}.activation-contract{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:15px 0 0}.activation-contract div{padding:10px 12px;background:#f5f8fc;border:1px solid #e2e8f0;border-radius:10px}.activation-contract dt{color:#758196;font-size:.69rem;font-weight:800;letter-spacing:.06em}.activation-contract dd{margin:4px 0 0;color:#3e4d63;font-size:.79rem;line-height:1.55}@media(max-width:600px){.empty-actions{width:100%;flex-direction:column}.activation-contract{grid-template-columns:1fr}}
@media(max-width:1300px){.workspace-header{align-items:flex-start;flex-wrap:wrap}.workspace-grid,.lower-grid{grid-template-columns:1fr}.empty-current{align-items:flex-start;flex-wrap:wrap;gap:16px}.principle-strip{align-items:flex-start;flex-wrap:wrap}.principle-strip span{min-width:55%}}
</style>

<style scoped>
.learning-workspace{width:100%;max-width:1580px;padding:0;gap:16px}
.current-card,.empty-current,.overview-card,.checkin-card,.recent-card,.deferred-card{border-color:#dfe5ed;box-shadow:0 10px 32px rgba(24,48,79,.065)}
.workspace-header{padding:4px 2px 10px}.workspace-header h1{letter-spacing:-.045em}.workspace-header button{box-shadow:0 4px 14px rgba(26,48,78,.05)}
.current-card{grid-template-columns:170px minmax(0,1fr) 230px;min-height:226px}.current-index{position:relative;overflow:hidden;background:linear-gradient(150deg,#142943,#20496b)}.current-index::after{position:absolute;right:-60px;bottom:-70px;width:160px;height:160px;content:'';background:radial-gradient(circle,rgba(92,218,186,.3),transparent 68%)}.current-index>*{position:relative;z-index:1}.current-copy{padding:30px 32px}.current-actions{padding:24px 26px;background:#f8fafc;border-left:1px solid #e6ebf1}
.principle-strip{background:linear-gradient(100deg,#edf3ff,#f3f8ff);border-color:#d6e2f6}.workspace-grid,.lower-grid{align-items:stretch}.overview-card,.checkin-card,.recent-card,.deferred-card{height:100%;padding:24px}.checkin-card,.recent-card,.deferred-card{display:flex;flex-direction:column}.checkin-card>button{align-self:flex-start;margin-top:auto}.recent-card>.empty,.deferred-card>.empty{margin-top:auto}.metrics div{background:#f5f8fc;border:1px solid #e8edf3}.checkin-card{background:linear-gradient(145deg,#fff,#f9fbfe)}.checkin-card.done{background:linear-gradient(145deg,#f5fff8,#ecf9f1)}
.dialog-backdrop{background:rgba(9,18,32,.56);backdrop-filter:blur(14px)}.checkin-dialog{border:1px solid rgba(255,255,255,.8);border-radius:24px;box-shadow:0 30px 90px rgba(13,28,52,.3)}.checkin-dialog>header{margin:-23px -23px 18px;padding:23px;background:linear-gradient(145deg,#f6faff,#fff);border-bottom:1px solid #e6ebf2;border-radius:24px 24px 0 0}.point-picker button{border-color:#dbe3ed;background:#fafcff}.point-picker button.selected{color:#244f92;background:#eaf2ff;border-color:#6f93ce;box-shadow:0 0 0 3px rgba(66,112,190,.1)}
.checkin-form{display:grid;gap:14px}.checkin-form>label,.number-row label{display:grid;gap:6px;color:#455368;font-size:.78rem;font-weight:720}.checkin-form textarea{min-height:110px;padding:11px 12px;font:inherit;border:1px solid #cbd3df;border-radius:10px;resize:vertical}.checkin-form button{padding:9px 11px;color:inherit;background:#fff;border:1px solid #dbe3ed;border-radius:9px;cursor:pointer}.selected-count{margin:0;color:#647085;font-size:.78rem}
@media(max-width:1100px){.current-card{grid-template-columns:135px minmax(0,1fr) 210px}}
@media(max-width:900px){.current-card{grid-template-columns:1fr}.current-actions{border-top:1px solid #e6ebf1;border-left:0}.learning-workspace{padding:0}}
</style>
