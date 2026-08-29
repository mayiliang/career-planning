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

const routePoints = computed(() => points.value.filter((point) => point.planWeek !== null));
const weeks = computed(() => {
  const term = search.value.trim().toLowerCase();
  const filtered = routePoints.value.filter((point) => !term || `${point.code} ${point.title} ${point.domainTitle}`.toLowerCase().includes(term));
  const map = new Map<number, KnowledgePointListItem[]>();
  for (const point of filtered) {
    const week = point.planWeek!;
    map.set(week, [...(map.get(week) ?? []), point]);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]);
});
const stats = computed(() => ({
  total: routePoints.value.length,
  learned: routePoints.value.filter((item) => item.learningState === 'LEARNED').length,
  mastered: routePoints.value.filter((item) => item.masteryLevel >= 3).length,
  optional: points.value.length - routePoints.value.length,
}));
const routeBatchCount = computed(() => new Set(routePoints.value.map((point) => point.planWeek)).size);
const completionPercent = computed(() => stats.value.total ? Math.round((stats.value.learned / stats.value.total) * 100) : 0);
const activeBatch = computed(() => routePoints.value.find((point) => point.currentFocus)?.planWeek
  ?? routePoints.value.find((point) => point.learningState !== 'LEARNED' && point.learningState !== 'DEFERRED')?.planWeek
  ?? 1);
const visiblePointCount = computed(() => weeks.value.reduce((sum, [, items]) => sum + items.length, 0));

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
function toggleAll() {
  if (expandedWeeks.value.size === weeks.value.length) expandedWeeks.value = new Set();
  else expandedWeeks.value = new Set(weeks.value.map(([week]) => week));
}
function weekTheme(items: KnowledgePointListItem[]) {
  const domains = [...new Set(items.map((item) => item.domainTitle))];
  const codes = items.map((item) => item.code);
  const stage = codes.some((code) => code.startsWith('REACT-') || code.startsWith('VUE-'))
    ? 'React / Vue 求职主线'
    : codes.some((code) => /^(?:GIT|ENG|TEST|CAREER)-/.test(code))
      ? '工程与面试证据'
      : '';
  const domainLabel = domains.slice(0, 2).join(' × ') + (domains.length > 2 ? ` 等 ${domains.length} 个领域` : '');
  return stage ? `${stage} · ${domainLabel}` : domainLabel;
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
    <header class="route-hero">
      <div class="hero-copy"><p>JOB-FIRST CORE ROUTE · {{ routeBatchCount }} BATCHES</p><h1>先建立面试竞争力，再走向高级工程师</h1><span>{{ stats.total }} 个主干知识点按求职优先重新排序：保留框架真正需要的 JavaScript、TypeScript 前置，随后尽早进入 React、Vue、工程化、测试和项目表达；安全、AI 与架构能力继续层层递进。</span><div class="hero-actions"><button type="button" class="primary" @click="router.push('/')">继续当前学习 <span>→</span></button><button type="button" @click="router.push('/knowledge')">查看完整知识清单</button></div></div>
      <aside aria-label="核心路线完成情况"><div class="route-orbit" :style="{ '--progress': `${completionPercent * 3.6}deg` }"><div><strong>{{ completionPercent }}%</strong><span>主干完成度</span></div></div><dl><div><dt>当前批次</dt><dd>B{{ String(activeBatch).padStart(2, '0') }}</dd></div><div><dt>已学完</dt><dd>{{ stats.learned }} / {{ stats.total }}</dd></div><div><dt>M3+ 掌握</dt><dd>{{ stats.mastered }}</dd></div></dl></aside>
    </header>
    <section class="route-principles"><strong><small>ROUTE CONTRACT</small>这条路线如何使用</strong><span><b>求职优先，但不制造知识断层。</b>先学框架不可缺少的底座，B04 起进入 React/Vue；{{ stats.optional }} 个专项选修仍保留在完整知识清单中。</span><span><b>用真实工程证据准备面试。</b>框架之后紧接 Git、构建、测试和项目表达；学习完成与 M3+ 掌握仍分别记录。</span></section>
    <section class="route-stats" aria-label="路线统计"><div><small>CORE</small><strong>{{ stats.total }}</strong><span>主干知识点</span></div><div><small>DONE</small><strong>{{ stats.learned }}</strong><span>已学完</span></div><div><small>MASTERED</small><strong>{{ stats.mastered }}</strong><span>M3+ 已掌握</span></div><div><small>OPTIONAL</small><strong>{{ stats.optional }}</strong><span>专项路线知识点</span></div></section>
    <section class="route-toolbar"><label class="route-search"><span>在核心路线中查找</span><div><i aria-hidden="true">⌕</i><input v-model="search" type="search" placeholder="主干知识点、编号或领域"></div></label><div><span>当前显示 {{ visiblePointCount }} 个知识点</span><button type="button" @click="toggleAll">{{ expandedWeeks.size === weeks.length ? '全部收起' : '全部展开' }}</button></div></section>
    <div v-if="loading" class="state">正在整理路线参考…</div><div v-else-if="error" class="state error">{{ error }}</div>
    <section v-else class="week-list">
      <article v-for="[week, items] in weeks" :key="week" :class="{ open: expandedWeeks.has(week) }">
        <button class="week-summary" type="button" :aria-expanded="expandedWeeks.has(week)" @click="toggleWeek(week)"><span :class="{ current: week === activeBatch }">B{{ String(week).padStart(2, '0') }}<i v-if="week === activeBatch">当前</i></span><div><strong>{{ weekTheme(items) }}</strong><small>{{ items.length }} 个主干知识点 · 合计约 {{ Math.round(items.reduce((sum, item) => sum + item.estimatedTotalMinutes, 0) / 60) }} 小时，可逐点推进</small><em><i :style="{ width: `${items.filter(item => item.learningState === 'LEARNED').length / items.length * 100}%` }"></i></em></div><div class="week-progress"><b>{{ items.filter(item => item.learningState === 'LEARNED').length }}/{{ items.length }}</b><i>{{ expandedWeeks.has(week) ? '收起 ↑' : '展开 ↓' }}</i></div></button>
        <div v-if="expandedWeeks.has(week)" class="week-points">
          <button v-for="item in items" :key="item.code" type="button" @click="router.push(`/knowledge/${item.code}`)"><code>{{ item.code }}</code><span><strong>{{ item.title }}</strong><small>{{ item.domainTitle }} · {{ item.challengeProfile }}</small></span><b :data-state="item.learningState">{{ stateLabel(item) }}</b><i aria-hidden="true">→</i></button>
        </div>
      </article>
      <div v-if="!weeks.length" class="state">没有匹配的知识点。</div>
    </section>
  </div>
</template>

<style scoped>
.route-reference{--route-ink:#19312a;--route-muted:#687a72;--route-green:#176a55;--route-green-soft:#edf7f3;--route-clay:#c2603f;display:grid;gap:14px;width:100%;max-width:1600px;margin:0 auto}.route-reference button{font:inherit}.route-hero{position:relative;display:grid;grid-template-columns:minmax(0,1.4fr) minmax(340px,.75fr);gap:30px;align-items:center;overflow:hidden;padding:34px 36px;color:#eff8f5;background:linear-gradient(125deg,#142d29 0%,#173b33 63%,#27483f 100%);border:1px solid #23473d;border-radius:23px;box-shadow:0 20px 55px rgba(16,43,36,.16)}.route-hero::after{position:absolute;right:-95px;bottom:-145px;width:420px;height:420px;content:'';background:radial-gradient(circle,rgba(212,112,75,.23),transparent 68%);pointer-events:none}.route-hero>*{position:relative;z-index:1}.hero-copy p{margin:0;color:#83c8b0;font:800 .64rem var(--font-mono);letter-spacing:.13em}.hero-copy h1{max-width:820px;margin:7px 0 10px;font-size:clamp(2rem,4.2vw,4.2rem);line-height:1.03;letter-spacing:-.055em}.hero-copy>span{display:block;max-width:760px;color:#b6cbc3;font-size:.79rem;line-height:1.75}.hero-actions{display:flex;gap:8px;margin-top:20px}.hero-actions button{padding:9px 12px;color:#e7f3ef;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);border-radius:9px;cursor:pointer}.hero-actions button.primary{color:#17362d;font-weight:800;background:#ecf7f2;border-color:#ecf7f2}.route-hero aside{display:grid;grid-template-columns:142px minmax(0,1fr);gap:17px;align-items:center;padding:17px;background:rgba(255,255,255,.065);border:1px solid rgba(255,255,255,.12);border-radius:18px;backdrop-filter:blur(8px)}.route-orbit{display:grid;place-items:center;width:134px;height:134px;background:conic-gradient(#78c5aa var(--progress),rgba(255,255,255,.13) 0);border-radius:50%}.route-orbit>div{display:grid;place-items:center;width:112px;height:112px;text-align:center;background:#17362f;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}.route-orbit strong{font:760 1.75rem var(--font-mono)}.route-orbit span{color:#91aaa1;font-size:.59rem}.route-hero dl{display:grid;gap:8px;margin:0}.route-hero dl div{padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,.1)}.route-hero dl div:last-child{padding-bottom:0;border-bottom:0}.route-hero dt{color:#91aaa1;font-size:.58rem}.route-hero dd{margin:2px 0 0;font:750 .84rem var(--font-mono)}
.route-principles{display:grid;grid-template-columns:minmax(170px,.55fr) 1fr 1fr;gap:20px;padding:17px 20px;color:#53685f;background:linear-gradient(110deg,#eff7f3,#fff8f4);border:1px solid #d5e2db;border-radius:15px;box-shadow:0 8px 26px rgba(27,58,47,.045)}.route-principles strong{color:#274d40;font-size:.83rem}.route-principles strong small{display:block;margin-bottom:3px;color:#5d8d7d;font:.55rem var(--font-mono);letter-spacing:.1em}.route-principles span{font-size:.72rem;line-height:1.65}.route-principles span b{display:block;color:#345a4c}.route-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.route-stats div{position:relative;overflow:hidden;padding:16px 18px;background:linear-gradient(145deg,#fff,#fbfdfa);border:1px solid #d9e3dd;border-radius:14px;box-shadow:0 8px 28px rgba(25,55,44,.05)}.route-stats div::after{position:absolute;right:-18px;bottom:-22px;width:72px;height:72px;content:'';background:radial-gradient(circle,rgba(23,106,85,.09),transparent 68%)}.route-stats small{color:#7a9187;font:.55rem var(--font-mono);letter-spacing:.1em}.route-stats strong,.route-stats span{display:block}.route-stats strong{color:var(--route-ink);font:760 1.8rem var(--font-mono)}.route-stats span{color:#74847d;font-size:.68rem}.route-toolbar{display:flex;align-items:end;justify-content:space-between;gap:16px;padding:3px 1px}.route-search{display:grid;gap:5px;width:min(560px,100%)}.route-search>span{color:#65786f;font-size:.65rem}.route-search>div{position:relative}.route-search i{position:absolute;top:50%;left:12px;color:#768a81;font-style:normal;transform:translateY(-50%)}.route-search input{width:100%;padding:11px 12px 11px 35px;color:var(--route-ink);background:#fff;border:1px solid #ccd9d2;border-radius:10px;outline:0;box-shadow:0 5px 17px rgba(25,48,78,.04)}.route-search input:focus{border-color:#6ba28e;box-shadow:0 0 0 3px rgba(23,106,85,.1)}.route-toolbar>div{display:flex;align-items:center;gap:12px}.route-toolbar>div>span{color:#7a8983;font-size:.64rem}.route-toolbar button{padding:8px 11px;color:#315e4f;font-weight:720;background:#f3f8f5;border:1px solid #d1ded7;border-radius:9px;cursor:pointer}
.week-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;align-items:stretch}.week-list article{height:100%;overflow:hidden;background:#fff;border:1px solid #d9e2dd;border-radius:15px;box-shadow:0 8px 28px rgba(25,48,78,.05)}.week-list article:not(.open){display:flex}.week-list article:not(.open) .week-summary{height:100%}.week-list article.open{grid-column:1/-1;height:auto;border-color:#a8c6ba;box-shadow:0 14px 38px rgba(31,84,65,.09)}.week-summary{display:grid;grid-template-columns:78px minmax(0,1fr) auto;gap:15px;align-items:center;width:100%;min-height:104px;padding:16px;text-align:left;color:var(--route-ink);background:linear-gradient(145deg,#fff,#fbfdfc);border:0;cursor:pointer}.week-summary>span{display:flex;align-items:flex-start;flex-direction:column;color:#26725b;font:800 1.02rem var(--font-mono)}.week-summary>span>i{margin-top:4px;padding:2px 5px;color:#a35236;font:.5rem var(--font-body);font-style:normal;background:#fff0e9;border-radius:5px}.week-summary>span.current{color:#a24e33}.week-summary>div:nth-child(2){min-width:0}.week-summary div strong,.week-summary div small{display:block}.week-summary div strong{display:-webkit-box;overflow:hidden;font-size:.81rem;-webkit-box-orient:vertical;-webkit-line-clamp:2}.week-summary div small{margin-top:3px;color:#7c8983;font-size:.64rem}.week-summary em{display:block;height:3px;margin-top:10px;overflow:hidden;background:#e5ece8;border-radius:3px}.week-summary em i{display:block;height:100%;background:linear-gradient(90deg,#2c8067,#d27856)}.week-progress{text-align:right}.week-progress b,.week-progress i{display:block}.week-progress b{font:700 .72rem var(--font-mono)}.week-progress i{margin-top:4px;color:#7c8983;font-size:.61rem;font-style:normal}.week-points{padding:0 16px;background:#fdfefc;border-top:1px solid #e1e8e4}.week-points button{display:grid;grid-template-columns:82px minmax(0,1fr) auto 20px;gap:10px;align-items:center;width:100%;padding:13px 4px;text-align:left;color:var(--route-ink);background:transparent;border-width:0 0 1px;border-style:solid;border-color:#e6ebe8;cursor:pointer}.week-points button:hover{background:linear-gradient(90deg,rgba(23,106,85,.045),transparent)}.week-points button:last-child{border-bottom:0}.week-points code{color:#24715a;font:700 .62rem var(--font-mono)}.week-points span strong,.week-points span small{display:block}.week-points span strong{font-size:.74rem}.week-points span small{margin-top:3px;color:#7d8b84;font-size:.61rem}.week-points>button>b{padding:3px 7px;color:#687b72;font-size:.61rem;background:#f0f4f2;border-radius:6px}.week-points>button>b[data-state=LEARNED]{color:#176b4c;background:#e8f6ef}.week-points>button>b[data-state=LEARNING]{color:#35619a;background:#edf4ff}.week-points>button>b[data-state=DEFERRED]{color:#956427;background:#fff5df}.week-points>button>i{color:#8a9891;font-style:normal}.state{padding:28px;color:#687b72;background:#fff;border:1px solid #dae3de;border-radius:13px}.state.error{color:#9b3128;background:#fff0ee}
@media(max-width:1100px){.route-hero{grid-template-columns:1fr}.route-hero aside{width:max-content}.route-principles{grid-template-columns:1fr 1fr}.route-principles>strong{grid-column:1/-1}}
@media(max-width:950px){.week-list{grid-template-columns:1fr}.week-list article.open{grid-column:auto}}
@media(max-width:760px){.route-hero{padding:25px 20px}.route-hero aside{grid-template-columns:118px 1fr;width:100%}.route-orbit{width:112px;height:112px}.route-orbit>div{width:94px;height:94px}.hero-actions{flex-direction:column}.route-principles{grid-template-columns:1fr}.route-principles>strong{grid-column:auto}.route-stats{grid-template-columns:repeat(2,1fr)}.route-toolbar{align-items:stretch;flex-direction:column}.route-toolbar>div{justify-content:space-between}.week-summary{grid-template-columns:58px 1fr}.week-progress{grid-column:2;display:flex;gap:8px;text-align:left}.week-points button{grid-template-columns:70px 1fr 18px}.week-points>button>b{grid-column:2}.week-points>button>i{grid-row:1/-1;grid-column:3}}
@media(max-width:440px){.route-hero aside{grid-template-columns:1fr}.route-orbit{margin:auto}.route-stats{grid-template-columns:1fr 1fr}.route-toolbar>div{align-items:flex-start;flex-direction:column}}
</style>
