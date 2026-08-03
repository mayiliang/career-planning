<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { apiClient, type KnowledgePointListItem } from '@/api/client';

const router = useRouter();
const points = ref<KnowledgePointListItem[]>([]);
const loading = ref(true);
const error = ref('');
const search = ref('');
const expandedWeeks = ref(new Set<number>());

const CAPSTONE_WEEKS: Record<number, { theme: string; outcome: string }> = {
  61: { theme: '作品集与项目证据', outcome: '从已学知识中挑选代表项目，整理架构、代码、测试与决策证据。' },
  62: { theme: '生产部署与故障演练', outcome: '按真实生产标准练习部署、监控、故障定位、恢复与发布复盘。' },
  63: { theme: 'AI 时代高级前端综合实作', outcome: '自由组合渲染、数据、AI、安全、性能与体验能力，完成跨领域作品。' },
  64: { theme: '综合答辩与求职启动', outcome: '整理可运行产品、证据矩阵、作品集与简历；综合挑战仍由你决定是否参加。' },
};

const weeks = computed(() => {
  const term = search.value.trim().toLowerCase();
  const filtered = points.value.filter((point) => !term || `${point.code} ${point.title} ${point.domainTitle}`.toLowerCase().includes(term));
  const map = new Map<number, KnowledgePointListItem[]>();
  if (!term) for (let week = 1; week <= 64; week += 1) map.set(week, []);
  for (const point of filtered) {
    const week = point.planWeek ?? 64;
    map.set(week, [...(map.get(week) ?? []), point]);
  }
  if (term) {
    for (const [week, content] of Object.entries(CAPSTONE_WEEKS)) {
      if (`${content.theme} ${content.outcome}`.toLowerCase().includes(term)) map.set(Number(week), map.get(Number(week)) ?? []);
    }
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]);
});
const stats = computed(() => ({
  total: points.value.length,
  learned: points.value.filter((item) => item.learningState === 'LEARNED').length,
  mastered: points.value.filter((item) => item.masteryLevel >= 3).length,
  optional: points.value.filter((item) => item.learningState === 'DEFERRED').length,
}));

async function load() {
  try {
    const result = await apiClient.getKnowledgePoints();
    points.value = result.items;
    const activeWeek = result.items.find((item) => item.currentFocus)?.planWeek ?? result.items.find((item) => item.learningState !== 'LEARNED' && item.learningState !== 'DEFERRED')?.planWeek;
    if (activeWeek) expandedWeeks.value.add(activeWeek);
  } catch (reason) { error.value = reason instanceof Error ? reason.message : '路线参考加载失败'; }
  finally { loading.value = false; }
}

function toggleWeek(week: number) {
  const next = new Set(expandedWeeks.value);
  next.has(week) ? next.delete(week) : next.add(week);
  expandedWeeks.value = next;
}
function weekTheme(week: number, items: KnowledgePointListItem[]) {
  if (CAPSTONE_WEEKS[week]) return CAPSTONE_WEEKS[week].theme;
  const domains = [...new Set(items.map((item) => item.domainTitle))];
  return domains.length ? domains.slice(0, 2).join(' × ') + (domains.length > 2 ? ` 等 ${domains.length} 个领域` : '') : '自主复盘与机动学习';
}
function stateLabel(item: KnowledgePointListItem) {
  return item.learningState === 'LEARNED' ? `已学完 · M${item.masteryLevel}`
    : item.learningState === 'LEARNING' ? '学习中'
      : item.learningState === 'DEFERRED' ? '稍后学习' : '未开始';
}
onMounted(load);
</script>

<template>
  <div class="route-reference">
    <header class="route-header"><div><p>OPTIONAL ROUTE REFERENCE</p><h1>64 周路线参考</h1><span>它只说明一种合理的先后顺序，不规定你哪一天必须学什么。</span></div><button @click="router.push('/')">回到学习台</button></header>
    <section class="route-principles"><strong>按需使用</strong><span>可以跳周、换顺序、暂停知识点或暂缓整条支线。关键前置会解释影响，但不会制造逾期。</span><span>理论与实战是学习原则，不是每天必须凑齐的五个阶段。</span></section>
    <section class="route-stats"><div><strong>{{ stats.total }}</strong><span>完整知识点</span></div><div><strong>{{ stats.learned }}</strong><span>已学完</span></div><div><strong>{{ stats.mastered }}</strong><span>M3+ 已掌握</span></div><div><strong>{{ stats.optional }}</strong><span>稍后学习</span></div></section>
    <label class="route-search"><span>在路线中查找</span><input v-model="search" placeholder="知识点、编号或领域"></label>
    <div v-if="loading" class="state">正在整理路线参考…</div><div v-else-if="error" class="state error">{{ error }}</div>
    <section v-else class="week-list">
      <article v-for="[week, items] in weeks" :key="week" :class="{ open: expandedWeeks.has(week) }">
        <button class="week-summary" @click="toggleWeek(week)"><span>W{{ String(week).padStart(2, '0') }}</span><div><strong>{{ weekTheme(week, items) }}</strong><small v-if="CAPSTONE_WEEKS[week]">综合实践参考 · 可以提前、推后或跳过</small><small v-else>{{ items.length }} 个知识点 · 预计 {{ Math.round(items.reduce((sum, item) => sum + item.estimatedTotalMinutes, 0) / 60) }} 小时，仅供参考</small></div><div class="week-progress"><b>{{ CAPSTONE_WEEKS[week] ? '自选' : `${items.filter(item => item.learningState === 'LEARNED').length}/${items.length}` }}</b><i>{{ expandedWeeks.has(week) ? '收起' : '展开' }}</i></div></button>
        <div v-if="expandedWeeks.has(week)" class="week-points">
          <p v-if="CAPSTONE_WEEKS[week]" class="capstone-note">{{ CAPSTONE_WEEKS[week].outcome }}</p>
          <button v-for="item in items" :key="item.code" @click="router.push(`/knowledge/${item.code}`)"><code>{{ item.code }}</code><span><strong>{{ item.title }}</strong><small>{{ item.domainTitle }} · {{ item.challengeProfile }}</small></span><b :data-state="item.learningState">{{ stateLabel(item) }}</b></button>
          <p v-if="!items.length && !CAPSTONE_WEEKS[week]" class="capstone-note">这一周可用于自由复盘、补充笔记或直接跳过。</p>
        </div>
      </article>
      <div v-if="!weeks.length" class="state">没有匹配的知识点。</div>
    </section>
  </div>
</template>

<style scoped>
.route-reference{max-width:1160px;margin:0 auto;padding:26px;display:grid;gap:18px}.route-header{display:flex;justify-content:space-between;align-items:end;gap:20px}.route-header p{font:700 .68rem ui-monospace;color:#536da6;letter-spacing:.13em}.route-header h1{font-size:clamp(2rem,4vw,3.2rem);margin:4px 0}.route-header span{color:#677284}.route-reference button{border:1px solid #ccd4df;background:#fff;border-radius:10px;padding:9px 13px;color:inherit;cursor:pointer}.route-principles{display:grid;grid-template-columns:auto 1fr 1fr;gap:16px;padding:17px;background:#edf2ff;border:1px solid #dae3fb;border-radius:13px}.route-principles span{color:#58677e}.route-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.route-stats div{background:#fff;border:1px solid #dce2e9;border-radius:13px;padding:16px}.route-stats strong,.route-stats span{display:block}.route-stats strong{font-size:1.8rem}.route-stats span{font-size:.76rem;color:#727c89}.route-search{display:grid;gap:6px}.route-search span{font-size:.72rem;color:#657084}.route-search input{width:100%;box-sizing:border-box;border:1px solid #cad3df;border-radius:10px;padding:12px;font:inherit}.week-list{display:grid;gap:9px}.week-list article{background:#fff;border:1px solid #dce2e9;border-radius:14px;overflow:hidden}.week-list article.open{border-color:#afbedf}.week-summary{width:100%;display:grid;grid-template-columns:75px 1fr auto;align-items:center;text-align:left;border:0!important;border-radius:0!important;padding:16px!important}.week-summary>span{font:800 1.05rem ui-monospace;color:#3657a3}.week-summary div strong,.week-summary div small{display:block}.week-summary div small{color:#7a8491;margin-top:4px}.week-progress{text-align:right}.week-progress b,.week-progress i{display:block}.week-progress i{font-style:normal;color:#7a8491;font-size:.72rem}.week-points{border-top:1px solid #e5e9ee;padding:0 16px}.week-points button{width:100%;display:grid;grid-template-columns:82px 1fr auto;align-items:center;text-align:left;border-width:0 0 1px!important;border-radius:0!important;padding:13px 3px!important}.week-points button:last-child{border-bottom:0!important}.week-points span strong,.week-points span small{display:block}.week-points span small{color:#7d8793;margin-top:3px}.week-points>button>b{font-size:.74rem;color:#687386}.week-points>button>b[data-state=LEARNED]{color:#187044}.week-points>button>b[data-state=DEFERRED]{color:#9a6a28}.capstone-note{margin:0;padding:15px 3px;color:#526278;line-height:1.65}.state{padding:28px;background:#fff;border-radius:13px;color:#687385}.state.error{background:#fff0ee;color:#9b3128}@media(max-width:760px){.route-reference{padding:13px}.route-header{align-items:flex-start;flex-direction:column}.route-principles{grid-template-columns:1fr}.route-stats{grid-template-columns:repeat(2,1fr)}.week-summary{grid-template-columns:52px 1fr}.week-progress{grid-column:2;display:flex;gap:8px;text-align:left}.week-points button{grid-template-columns:70px 1fr}.week-points>button>b{grid-column:2}}
</style>

<style scoped>
.route-reference{width:100%;max-width:1560px;padding:0}.route-header{padding:4px 2px 10px}.route-principles,.route-stats div,.week-list article{box-shadow:0 8px 28px rgba(25,48,78,.055)}.route-principles{background:linear-gradient(110deg,#edf3ff,#f3f8ff);border-color:#d7e2f4}.route-stats div{padding:18px;background:linear-gradient(145deg,#fff,#fafcff)}.week-list{grid-template-columns:repeat(2,minmax(0,1fr));align-items:stretch}.week-list article{height:100%}.week-list article:not(.open){display:flex}.week-list article:not(.open) .week-summary{height:100%}.week-list article.open{grid-column:1/-1;height:auto;box-shadow:0 14px 34px rgba(36,74,133,.09)}.week-summary{min-height:92px}.week-summary div strong{display:-webkit-box;overflow:hidden;-webkit-box-orient:vertical;-webkit-line-clamp:2}.route-search input{background:#fff;box-shadow:0 5px 17px rgba(25,48,78,.04)}
@media(max-width:950px){.week-list{grid-template-columns:1fr}.week-list article.open{grid-column:auto}}
@media(max-width:760px){.route-reference{padding:0}}
</style>
