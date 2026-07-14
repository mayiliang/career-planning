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

const { data: domainStats } = useQuery({ queryKey: ['knowledge', 'domains'], queryFn: apiClient.getDomainStats });
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
const formatStatus = (status: string) => statusOptions.find((item) => item.value === status)?.label ?? status;
</script>

<template>
  <main class="knowledge-page">
    <header class="knowledge-hero">
      <div class="hero-copy"><p class="eyebrow">LEARNING INVENTORY</p><h1>知识清单</h1><p>清单负责推进，脑图负责建立全局。每个知识点都要经历学习、自评、首考和复测。</p></div>
      <div class="hero-progress" :style="{ '--progress': `${progress * 3.6}deg` }"><div><strong>{{ progress }}%</strong><span>严格掌握</span></div></div>
    </header>

    <section class="overview-strip">
      <div><strong>{{ totalCount }}</strong><span>知识点</span></div><div><strong>{{ domainStats?.length ?? '—' }}</strong><span>领域</span></div><div><strong>{{ learningCount }}</strong><span>学习中</span></div><div><strong>{{ masteredCount }}</strong><span>已掌握</span></div>
      <nav><button @click="router.push('/knowledge/map')">打开体系脑图</button><button class="secondary" @click="router.push('/knowledge/graph')">关系图谱</button></nav>
    </section>

    <section class="filter-dock">
      <label class="search-field"><span>⌕</span><input v-model="searchQuery" type="search" placeholder="搜索知识点、编号或能力关键词" /></label>
      <select v-model="selectedDomain"><option value="">全部领域</option><option v-for="domain in domainStats" :key="domain.id" :value="domain.id">{{ domain.code }} · {{ domain.title }}</option></select>
      <select v-model="selectedStatus"><option v-for="status in statusOptions" :key="status.value" :value="status.value">{{ status.label }}</option></select>
      <span class="result-count">当前 {{ knowledgeData?.total ?? 0 }} 项</span>
    </section>

    <div v-if="isLoading" class="loading-state">正在整理知识卡片...</div>
    <div v-else-if="error" class="error-state">加载失败：{{ (error as Error).message }}</div>
    <section v-else class="knowledge-grid">
      <button v-for="point in knowledgePoints" :key="point.id" class="knowledge-card" @click="router.push(`/knowledge/${point.code}`)">
        <span class="mastery-orbit" :data-status="point.status"><i></i></span>
        <span class="card-copy"><span class="card-kicker"><code>{{ point.code }}</code><small>{{ point.domainCode }}</small></span><strong>{{ point.title }}</strong><span class="card-meta">{{ point.difficulty }}<template v-if="point.planWeek"> · 第 {{ point.planWeek }} 周</template></span></span>
        <span class="card-state">{{ formatStatus(point.status) }}<b>→</b></span>
      </button>
      <div v-if="knowledgePoints.length === 0" class="empty-state">没有匹配项。清除筛选或换一个关键词。</div>
    </section>
  </main>
</template>

<style scoped>
.knowledge-page{max-width:1380px;margin:0 auto}.knowledge-hero{display:flex;justify-content:space-between;align-items:flex-end;gap:2rem;padding:.5rem 0 2rem}.eyebrow{margin:0;color:var(--color-primary);font:750 .72rem var(--font-mono);letter-spacing:.17em}.knowledge-hero h1{margin:.25rem 0 .5rem;font-size:clamp(2.5rem,5vw,4.9rem);line-height:1;letter-spacing:-.065em}.hero-copy>p:last-child{max-width:650px;margin:0;color:var(--color-text-secondary)}.hero-progress{display:grid;place-items:center;width:124px;height:124px;padding:8px;background:conic-gradient(var(--color-primary) var(--progress),var(--color-border) 0);border-radius:50%;box-shadow:var(--shadow-sm)}.hero-progress>div{display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;background:var(--color-surface);border-radius:50%}.hero-progress strong{font:750 1.65rem var(--font-mono)}.hero-progress span{color:var(--color-text-tertiary);font-size:.66rem}.overview-strip{display:grid;grid-template-columns:repeat(4,minmax(90px,1fr)) 2fr;gap:1px;overflow:hidden;margin-bottom:1rem;background:var(--color-border);border:1px solid var(--color-border);border-radius:16px;box-shadow:var(--shadow-xs)}.overview-strip>div{display:flex;flex-direction:column;padding:1rem;background:var(--color-surface)}.overview-strip strong{font:750 1.35rem var(--font-mono)}.overview-strip span{color:var(--color-text-tertiary);font-size:.68rem}.overview-strip nav{display:flex;justify-content:flex-end;align-items:center;gap:.55rem;padding:.8rem;background:var(--color-surface)}.overview-strip button{min-height:42px;padding:0 1rem;color:white;font-weight:700;background:var(--color-primary);border:0;border-radius:11px;cursor:pointer}.overview-strip .secondary{color:var(--color-text);background:var(--color-surface-raised);border:1px solid var(--color-border)}.filter-dock{position:sticky;top:1rem;z-index:10;display:flex;gap:.65rem;align-items:center;margin-bottom:1rem;padding:.7rem;background:color-mix(in srgb,var(--color-surface) 90%,transparent);border:1px solid var(--color-border);border-radius:15px;box-shadow:var(--shadow-sm);backdrop-filter:blur(18px)}.search-field{display:flex;align-items:center;gap:.55rem;flex:1;min-width:240px;padding:0 .8rem;background:var(--color-surface-raised);border:1px solid var(--color-border);border-radius:10px}.search-field span{color:var(--color-text-tertiary);font-size:1.1rem}.search-field input,.filter-dock select{min-height:42px;background:transparent;border:0;outline:0}.search-field input{width:100%}.filter-dock select{padding:0 2rem 0 .8rem;background:var(--color-surface-raised);border:1px solid var(--color-border);border-radius:10px}.result-count{color:var(--color-text-tertiary);font:.68rem var(--font-mono);white-space:nowrap}.knowledge-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:.7rem}.knowledge-card{display:grid;grid-template-columns:48px 1fr auto;gap:.9rem;align-items:center;min-height:102px;padding:1rem;text-align:left;color:var(--color-text);background:var(--color-surface);border:1px solid var(--color-border);border-radius:15px;cursor:pointer;box-shadow:var(--shadow-xs)}.knowledge-card:hover{transform:translateY(-2px);border-color:var(--color-primary-border);box-shadow:var(--shadow-sm)}.mastery-orbit{position:relative;display:grid;place-items:center;width:42px;height:42px;border:2px solid #c9d1dc;border-radius:50%}.mastery-orbit::after{position:absolute;inset:4px;content:'';border:2px solid #dce2ea;border-radius:50%}.mastery-orbit i{width:7px;height:7px;background:#aeb8c5;border-radius:50%}.mastery-orbit[data-status='LEARNING']::after,.mastery-orbit[data-status='SELF_MASTERED']::after{border-color:var(--color-primary)}.mastery-orbit[data-status='FIRST_PASS_PENDING_RETEST']{border-color:var(--color-warning);border-style:dashed}.mastery-orbit[data-status='MASTERED']{border-color:var(--color-success)}.mastery-orbit[data-status='MASTERED']::after,.mastery-orbit[data-status='MASTERED'] i{border-color:var(--color-success);background:var(--color-success)}.mastery-orbit[data-status='NEEDS_RELEARNING']{border-color:var(--color-danger)}.card-copy{display:flex;min-width:0;flex-direction:column;gap:.22rem}.card-kicker{display:flex;gap:.5rem;align-items:center}.card-kicker code{color:var(--color-primary);font:750 .68rem var(--font-mono)}.card-kicker small{padding:.1rem .35rem;color:var(--color-text-tertiary);font:.58rem var(--font-mono);background:var(--color-surface-raised);border-radius:5px}.card-copy>strong{overflow:hidden;font-size:.9rem;text-overflow:ellipsis;white-space:nowrap}.card-meta{color:var(--color-text-tertiary);font-size:.66rem}.card-state{display:flex;flex-direction:column;align-items:flex-end;color:var(--color-text-secondary);font-size:.68rem;white-space:nowrap}.card-state b{color:var(--color-primary);font-size:1rem}.empty-state{grid-column:1/-1}@media(max-width:900px){.overview-strip{grid-template-columns:repeat(4,1fr)}.overview-strip nav{grid-column:1/-1;justify-content:flex-start}.filter-dock{position:relative;top:auto;flex-wrap:wrap}.search-field{flex-basis:100%}}@media(max-width:620px){.knowledge-hero{align-items:flex-start}.hero-progress{width:88px;height:88px;flex-shrink:0}.hero-progress strong{font-size:1.2rem}.overview-strip{grid-template-columns:repeat(2,1fr)}.knowledge-grid{grid-template-columns:1fr}.knowledge-card{grid-template-columns:42px 1fr}.card-state{grid-column:2;align-items:flex-start;flex-direction:row;gap:.4rem}.filter-dock select{flex:1;min-width:0}}
</style>
