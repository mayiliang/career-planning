<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuery } from '@tanstack/vue-query';
import { apiClient } from '@/api/client';

const router = useRouter();
const selectedDomain = ref('');
const selectedStatus = ref('');
const searchQuery = ref('');

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'NOT_STARTED', label: '未开始' },
  { value: 'LEARNING', label: '学习中' },
  { value: 'SELF_MASTERED', label: '待首考' },
  { value: 'FIRST_PASS_PENDING_RETEST', label: '待复测' },
  { value: 'MASTERED', label: '已掌握' },
  { value: 'NEEDS_RELEARNING', label: '需要重学' },
];

const actionLabels = {
  LEARN: '开始学习', CONTINUE: '继续推进', ASSESS: '发起首考', RETEST: '完成复测',
  RELEARN: '重新学习', COMPLETE: '查看掌握成果',
} as const;

const { data: domainStats, isLoading: statsLoading } = useQuery({
  queryKey: ['knowledge', 'domains'],
  queryFn: apiClient.getDomainStats,
});
const { data: recommendation, isLoading: recommendationLoading } = useQuery({
  queryKey: ['knowledge', 'recommendation'],
  queryFn: apiClient.getKnowledgeRecommendation,
});
const { data: knowledgeData, isLoading, error } = useQuery({
  queryKey: ['knowledge', 'points', selectedDomain, selectedStatus, searchQuery],
  queryFn: () => apiClient.getKnowledgePoints({
    domainId: selectedDomain.value || undefined,
    status: selectedStatus.value || undefined,
    search: searchQuery.value.trim() || undefined,
  }),
});

const knowledgePoints = computed(() => knowledgeData.value?.items ?? []);
const totalCount = computed(() => domainStats.value?.reduce((sum, domain) => sum + domain.pointCount, 0) ?? knowledgeData.value?.total ?? 0);
const masteredCount = computed(() => domainStats.value?.reduce((sum, domain) => sum + domain.masteredCount, 0) ?? 0);
const learningCount = computed(() => domainStats.value?.reduce((sum, domain) => sum + domain.learningCount, 0) ?? 0);
const progress = computed(() => totalCount.value ? Math.round(masteredCount.value / totalCount.value * 100) : 0);
const hasFilters = computed(() => Boolean(selectedDomain.value || selectedStatus.value || searchQuery.value.trim()));
const currentCode = computed(() => recommendation.value?.point?.code);
const routeStep = computed(() => {
  const action = recommendation.value?.action;
  if (action === 'ASSESS') return 2;
  if (action === 'RETEST') return 3;
  if (action === 'COMPLETE') return 4;
  return 1;
});
const formatStatus = (status: string) => statusOptions.find((item) => item.value === status)?.label ?? status;
const formatMinutes = (minutes: number) => minutes >= 60 ? `${Math.floor(minutes / 60)}h${minutes % 60 ? `${minutes % 60}m` : ''}` : `${minutes}m`;
const openRecommendation = () => {
  const code = recommendation.value?.point?.code;
  router.push(code ? `/knowledge/${code}` : '/knowledge/map');
};
const clearFilters = () => {
  selectedDomain.value = '';
  selectedStatus.value = '';
  searchQuery.value = '';
};
</script>

<template>
  <main class="knowledge-page">
    <header class="knowledge-hero">
      <div class="hero-copy">
        <p class="eyebrow">LEARNING INVENTORY · 2026</p>
        <h1>知识清单</h1>
        <p>不是收藏夹，而是一条可验证的掌握路线。按前置关系学习，用首考与复测把理解固化为证据。</p>
      </div>
      <div class="hero-progress" :class="{ pending: statsLoading }" :style="{ '--progress': `${progress * 3.6}deg` }">
        <div><strong>{{ statsLoading ? '—' : `${progress}%` }}</strong><span>严格掌握</span></div>
      </div>
    </header>

    <section v-if="recommendationLoading" class="route-deck route-skeleton" aria-label="正在计算学习路线">
      <div></div><div></div><div></div>
    </section>
    <section v-else-if="recommendation" class="route-deck" :data-readiness="recommendation.readiness">
      <div class="route-intro">
        <p class="eyebrow">NEXT BEST ACTION</p>
        <span class="route-week">{{ recommendation.routePosition ? `W${String(recommendation.routePosition.week).padStart(2, '0')}` : 'DONE' }}</span>
        <h2 v-if="recommendation.point"><code>{{ recommendation.point.code }}</code>{{ recommendation.point.title }}</h2>
        <h2 v-else>整条路线已经贯通</h2>
        <p>{{ recommendation.reason }}</p>
        <button class="route-primary" @click="openRecommendation">{{ actionLabels[recommendation.action] }}<span>↗</span></button>
      </div>

      <div class="route-rail" aria-label="知识掌握闭环">
        <div v-for="(label, index) in ['学习', '首考', '7 天复测', '掌握']" :key="label" :class="{ active: routeStep === index + 1, passed: routeStep > index + 1 }">
          <i>{{ routeStep > index + 1 ? '✓' : index + 1 }}</i><span>{{ label }}</span>
        </div>
      </div>

      <aside class="route-context">
        <span class="context-label">前置就绪度</span>
        <strong>{{ recommendation.prerequisiteProgress.mastered }}/{{ recommendation.prerequisiteProgress.total }}</strong>
        <div class="readiness-bar"><i :style="{ width: `${recommendation.prerequisiteProgress.total ? recommendation.prerequisiteProgress.mastered / recommendation.prerequisiteProgress.total * 100 : 100}%` }"></i></div>
        <p v-if="recommendation.blockers.length">先完成 <button v-for="blocker in recommendation.blockers.slice(0, 3)" :key="blocker.code" @click="router.push(`/knowledge/${blocker.code}`)">{{ blocker.code }}</button></p>
        <p v-else>没有阻塞项，可以立即推进。</p>
        <small v-if="recommendation.routePosition">能力路线 {{ recommendation.routePosition.index }} / {{ recommendation.routePosition.total }}</small>
      </aside>
    </section>

    <section class="overview-strip" :aria-busy="statsLoading">
      <div><strong>{{ statsLoading ? '—' : totalCount }}</strong><span>知识点</span></div>
      <div><strong>{{ statsLoading ? '—' : domainStats?.length }}</strong><span>能力领域</span></div>
      <div><strong>{{ statsLoading ? '—' : learningCount }}</strong><span>正在推进</span></div>
      <div><strong>{{ statsLoading ? '—' : masteredCount }}</strong><span>严格掌握</span></div>
      <nav><button @click="router.push('/knowledge/map')">打开体系脑图</button><button class="secondary" @click="router.push('/knowledge/graph')">查看关系图谱</button></nav>
    </section>

    <section class="filter-dock">
      <label class="search-field"><span>⌕</span><input v-model="searchQuery" type="search" placeholder="搜索知识点、编号或能力关键词" /></label>
      <select v-model="selectedDomain" aria-label="按领域筛选"><option value="">全部领域</option><option v-for="domain in domainStats" :key="domain.id" :value="domain.id">{{ domain.code }} · {{ domain.title }}</option></select>
      <select v-model="selectedStatus" aria-label="按掌握状态筛选"><option v-for="status in statusOptions" :key="status.value" :value="status.value">{{ status.label }}</option></select>
      <button v-if="hasFilters" class="clear-filter" @click="clearFilters">清除</button>
      <span class="result-count">{{ isLoading ? '整理中' : `${knowledgeData?.total ?? 0} 项` }}</span>
    </section>

    <section v-if="isLoading" class="knowledge-grid" aria-label="正在加载知识点">
      <div v-for="index in 8" :key="index" class="knowledge-card card-skeleton"><i></i><span></span><b></b></div>
    </section>
    <div v-else-if="error" class="error-state">加载失败：{{ (error as Error).message }}</div>
    <section v-else class="knowledge-grid">
      <button v-for="point in knowledgePoints" :key="point.id" class="knowledge-card" :class="{ recommended: point.code === currentCode }" @click="router.push(`/knowledge/${point.code}`)">
        <span class="mastery-orbit" :data-status="point.status"><i></i></span>
        <span class="card-copy">
          <span class="card-kicker"><code>{{ point.code }}</code><small>{{ point.domainCode }}</small><em v-if="point.code === currentCode">推荐下一站</em></span>
          <strong>{{ point.title }}</strong>
          <span class="card-meta">第 {{ point.planWeek ?? '—' }} 周 · {{ point.difficulty }} · 预计 {{ formatMinutes(point.estimatedTotalMinutes) }}</span>
        </span>
        <span class="card-state">{{ formatStatus(point.status) }}<b>→</b></span>
      </button>
      <div v-if="knowledgePoints.length === 0" class="empty-state"><strong>没有匹配项</strong><p>换一个关键词，或清除当前筛选条件。</p><button @click="clearFilters">查看完整路线</button></div>
    </section>
  </main>
</template>

<style scoped>
.knowledge-page{max-width:1420px;margin:0 auto}.eyebrow{margin:0;color:var(--color-primary);font:760 .7rem var(--font-mono);letter-spacing:.17em}.knowledge-hero{display:flex;justify-content:space-between;align-items:flex-end;gap:2rem;padding:.4rem 0 1.65rem}.knowledge-hero h1{margin:.25rem 0 .5rem;font-size:clamp(2.7rem,5vw,4.8rem);line-height:1;letter-spacing:-.065em}.hero-copy>p:last-child{max-width:690px;margin:0;color:var(--color-text-secondary)}.hero-progress{display:grid;place-items:center;flex:0 0 116px;width:116px;height:116px;padding:7px;background:conic-gradient(var(--color-primary) var(--progress),var(--color-border) 0);border-radius:50%;box-shadow:var(--shadow-sm)}.hero-progress.pending{background:var(--color-border)}.hero-progress>div{display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;background:var(--color-surface);border-radius:50%}.hero-progress strong{font:760 1.55rem var(--font-mono)}.hero-progress span{color:var(--color-text-tertiary);font-size:.62rem}
.route-deck{position:relative;display:grid;grid-template-columns:minmax(280px,1.3fr) minmax(310px,1fr) minmax(210px,.62fr);gap:1.4rem;overflow:hidden;margin-bottom:1rem;padding:1.45rem;color:#eaf2ff;background:linear-gradient(125deg,#142741 0%,#193250 60%,#173b4b 100%);border:1px solid rgba(119,170,232,.18);border-radius:22px;box-shadow:0 22px 55px rgba(16,37,65,.16)}.route-deck::after{position:absolute;right:-90px;bottom:-130px;width:310px;height:310px;content:'';background:radial-gradient(circle,rgba(101,213,173,.16),transparent 66%);pointer-events:none}.route-intro{position:relative;z-index:1}.route-intro .eyebrow{color:#77a9ef}.route-week{position:absolute;top:0;right:0;padding:.22rem .48rem;color:#90aac8;font:700 .6rem var(--font-mono);background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.08);border-radius:7px}.route-intro h2{display:flex;gap:.55rem;align-items:baseline;margin:.38rem 0 .3rem;color:#fff;font-size:1.3rem;line-height:1.25}.route-intro h2 code{color:#70a7f3;font:.72rem var(--font-mono)}.route-intro>p:not(.eyebrow){max-width:520px;margin:0;color:#9fb2c9;font-size:.72rem}.route-primary{display:inline-flex;gap:.7rem;align-items:center;min-height:42px;margin-top:1rem;padding:0 .85rem;color:#112940;font-size:.7rem;font-weight:760;background:#80e0bd;border:0;border-radius:10px;cursor:pointer;box-shadow:0 8px 24px rgba(67,196,150,.16)}.route-primary:hover{background:#9aebce;transform:translateY(-1px)}.route-primary span{font-size:1rem}
.route-rail{position:relative;z-index:1;display:grid;grid-template-columns:repeat(4,1fr);align-content:center}.route-rail::before{position:absolute;top:calc(50% - 12px);right:11%;left:11%;height:2px;content:'';background:rgba(137,169,205,.22)}.route-rail>div{position:relative;display:flex;flex-direction:column;gap:.4rem;align-items:center;color:#7087a2;font-size:.58rem}.route-rail i{display:grid;place-items:center;width:28px;height:28px;font:700 .58rem var(--font-mono);font-style:normal;background:#203b5a;border:2px solid #3a5472;border-radius:50%}.route-rail .active{color:#fff}.route-rail .active i{color:#122b45;background:#7ba8ec;border-color:#a7c4ef;box-shadow:0 0 0 6px rgba(112,162,233,.12)}.route-rail .passed{color:#8ed7ba}.route-rail .passed i{color:#153727;background:#65d5ad;border-color:#94e7ca}
.route-context{position:relative;z-index:1;padding-left:1.2rem;border-left:1px solid rgba(255,255,255,.1)}.context-label{color:#8299b4;font-size:.58rem}.route-context>strong{display:block;margin:.2rem 0;font:760 1.7rem var(--font-mono)}.readiness-bar{height:5px;overflow:hidden;background:rgba(255,255,255,.09);border-radius:99px}.readiness-bar i{display:block;height:100%;background:#65d5ad;border-radius:99px}.route-context p{margin:.65rem 0 .3rem;color:#9fb2c9;font-size:.62rem}.route-context p button{margin-left:.28rem;padding:.12rem .3rem;color:#c9defb;font:.56rem var(--font-mono);background:rgba(89,139,208,.2);border:1px solid rgba(120,169,235,.25);border-radius:5px;cursor:pointer}.route-context small{color:#6f89a8;font:.55rem var(--font-mono)}.route-skeleton{min-height:190px;background:#dfe6ee}.route-skeleton div{min-height:120px;background:linear-gradient(100deg,#d6dee8 20%,#eef2f6 40%,#d6dee8 60%);background-size:200% 100%;border-radius:13px;animation:shimmer 1.35s infinite}
.overview-strip{display:grid;grid-template-columns:repeat(4,minmax(90px,1fr)) 2fr;gap:1px;overflow:hidden;margin-bottom:1rem;background:var(--color-border);border:1px solid var(--color-border);border-radius:16px;box-shadow:var(--shadow-xs)}.overview-strip>div{display:flex;flex-direction:column;padding:.9rem 1rem;background:var(--color-surface)}.overview-strip strong{font:760 1.3rem var(--font-mono)}.overview-strip span{color:var(--color-text-tertiary);font-size:.64rem}.overview-strip nav{display:flex;justify-content:flex-end;align-items:center;gap:.5rem;padding:.7rem;background:var(--color-surface)}.overview-strip button{min-height:40px;padding:0 .9rem;color:white;font-size:.68rem;font-weight:720;background:var(--color-primary);border:0;border-radius:10px;cursor:pointer}.overview-strip .secondary{color:var(--color-text);background:var(--color-surface-raised);border:1px solid var(--color-border)}
.filter-dock{position:sticky;top:1rem;z-index:10;display:flex;gap:.6rem;align-items:center;margin-bottom:1rem;padding:.65rem;background:color-mix(in srgb,var(--color-surface) 92%,transparent);border:1px solid var(--color-border);border-radius:15px;box-shadow:var(--shadow-sm);backdrop-filter:blur(18px)}.search-field{display:flex;align-items:center;gap:.5rem;flex:1;min-width:240px;padding:0 .75rem;background:var(--color-surface-raised);border:1px solid var(--color-border);border-radius:10px}.search-field span{color:var(--color-text-tertiary);font-size:1.05rem}.search-field input,.filter-dock select{min-height:40px;background:transparent;border:0;outline:0}.search-field input{width:100%}.filter-dock select{padding:0 1.8rem 0 .7rem;background:var(--color-surface-raised);border:1px solid var(--color-border);border-radius:10px}.clear-filter{min-height:38px;padding:0 .55rem;color:var(--color-primary);font-size:.62rem;background:var(--color-primary-soft);border:1px solid var(--color-primary-border);border-radius:9px;cursor:pointer}.result-count{color:var(--color-text-tertiary);font:.64rem var(--font-mono);white-space:nowrap}
.knowledge-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:.7rem}.knowledge-card{position:relative;display:grid;grid-template-columns:48px 1fr auto;gap:.85rem;align-items:center;min-height:104px;padding:.95rem;text-align:left;color:var(--color-text);background:var(--color-surface);border:1px solid var(--color-border);border-radius:15px;cursor:pointer;box-shadow:var(--shadow-xs)}.knowledge-card:hover{transform:translateY(-2px);border-color:var(--color-primary-border);box-shadow:var(--shadow-sm)}.knowledge-card.recommended{background:linear-gradient(135deg,#fff,#f2f7ff);border-color:#9dbbea;box-shadow:0 10px 30px rgba(54,104,180,.1)}.knowledge-card.recommended::before{position:absolute;top:14px;bottom:14px;left:-1px;width:3px;content:'';background:var(--color-primary);border-radius:0 5px 5px 0}.mastery-orbit{position:relative;display:grid;place-items:center;width:42px;height:42px;border:2px solid #c9d1dc;border-radius:50%}.mastery-orbit::after{position:absolute;inset:4px;content:'';border:2px solid #dce2ea;border-radius:50%}.mastery-orbit i{width:7px;height:7px;background:#aeb8c5;border-radius:50%}.mastery-orbit[data-status='LEARNING']::after,.mastery-orbit[data-status='SELF_MASTERED']::after{border-color:var(--color-primary)}.mastery-orbit[data-status='FIRST_PASS_PENDING_RETEST']{border-color:var(--color-warning);border-style:dashed}.mastery-orbit[data-status='MASTERED']{border-color:var(--color-success)}.mastery-orbit[data-status='MASTERED']::after,.mastery-orbit[data-status='MASTERED'] i{border-color:var(--color-success);background:var(--color-success)}.mastery-orbit[data-status='NEEDS_RELEARNING']{border-color:var(--color-danger)}.card-copy{display:flex;min-width:0;flex-direction:column;gap:.2rem}.card-kicker{display:flex;gap:.42rem;align-items:center}.card-kicker code{color:var(--color-primary);font:750 .66rem var(--font-mono)}.card-kicker small{padding:.08rem .3rem;color:var(--color-text-tertiary);font:.55rem var(--font-mono);background:var(--color-surface-raised);border-radius:5px}.card-kicker em{padding:.08rem .34rem;color:var(--color-primary);font:680 .52rem var(--font-body);font-style:normal;background:var(--color-primary-soft);border-radius:5px}.card-copy>strong{overflow:hidden;font-size:.87rem;text-overflow:ellipsis;white-space:nowrap}.card-meta{color:var(--color-text-tertiary);font-size:.62rem}.card-state{display:flex;flex-direction:column;align-items:flex-end;color:var(--color-text-secondary);font-size:.64rem;white-space:nowrap}.card-state b{color:var(--color-primary);font-size:1rem}.card-skeleton{cursor:default}.card-skeleton i,.card-skeleton span,.card-skeleton b{display:block;background:linear-gradient(100deg,#e4e9ef 20%,#f4f6f8 40%,#e4e9ef 60%);background-size:200% 100%;border-radius:8px;animation:shimmer 1.35s infinite}.card-skeleton i{width:42px;height:42px;border-radius:50%}.card-skeleton span{height:34px}.card-skeleton b{width:48px;height:18px}.empty-state{grid-column:1/-1;padding:3rem;text-align:center;background:var(--color-surface);border:1px dashed var(--color-border-strong);border-radius:16px}.empty-state strong{font-size:.9rem}.empty-state p{margin:.25rem 0 1rem;color:var(--color-text-tertiary);font-size:.68rem}.empty-state button{min-height:38px;padding:0 .8rem;color:#fff;background:var(--color-primary);border:0;border-radius:9px;cursor:pointer}@keyframes shimmer{to{background-position-x:-200%}}
@media(max-width:1080px){.route-deck{grid-template-columns:1.2fr 1fr}.route-context{grid-column:1/-1;padding:1rem 0 0;border-top:1px solid rgba(255,255,255,.1);border-left:0}.overview-strip{grid-template-columns:repeat(4,1fr)}.overview-strip nav{grid-column:1/-1;justify-content:flex-start}}
@media(max-width:760px){.knowledge-hero{align-items:flex-start}.hero-progress{width:88px;height:88px;flex-basis:88px}.hero-progress strong{font-size:1.15rem}.route-deck{grid-template-columns:minmax(0,1fr);padding:1.1rem}.route-rail{min-width:0;min-height:78px}.route-context{grid-column:auto;min-width:0}.filter-dock{position:relative;top:auto;flex-wrap:wrap}.search-field{flex-basis:100%;min-width:0}.filter-dock select{width:0;min-width:0;flex:1 1 42%}.result-count{margin-left:auto}.knowledge-grid{grid-template-columns:minmax(0,1fr)}}
@media(max-width:520px){.knowledge-hero h1{font-size:2.45rem}.hero-copy>p:last-child{font-size:.75rem}.overview-strip{grid-template-columns:repeat(2,1fr)}.overview-strip nav{display:grid;grid-template-columns:1fr 1fr}.knowledge-card{grid-template-columns:42px 1fr}.card-state{grid-column:2;align-items:flex-start;flex-direction:row;gap:.35rem}.route-rail>div span{font-size:.5rem}}
</style>
