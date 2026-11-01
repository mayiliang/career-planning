<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { ASYNC_PILOT_CHAIN, ASYNC_PILOT_NODES, pilotNode, pilotMaterialHref, planAsyncPilot, type PilotState } from '@career-atlas/shared';
import { apiClient } from '@/api/client';

const props = defineProps<{ currentCode?: string; refreshKey?: string }>();
const states = ref(new Map<string, PilotState>());
const read = ref(new Set<string>());
const error = ref('');
let generation = 0;
const plan = computed(() => planAsyncPilot(states.value, read.value, props.currentCode));
const prerequisites = computed(() => plan.value.prerequisites.map(code => pilotNode(code)!));
function stateLabel(code: string) {
  if (pilotNode(code)?.kind === 'READING') return read.value.has(code) ? '已查阅 · 阅读辅助' : '阅读辅助';
  return ({ LEARNED: '已学完', LEARNING: '学习中', DEFERRED: '已暂缓', NOT_STARTED: '未开始' })[states.value.get(code) ?? 'NOT_STARTED'];
}
watch(() => [props.currentCode, props.refreshKey], async () => {
  const own = ++generation;
  try {
    const [points, records] = await Promise.all([apiClient.getKnowledgePoints(), apiClient.getMaterialReadingProgress()]);
    if (own !== generation) return;
    states.value = new Map(points.items.map(point => [point.code, point.learningState]));
    read.value = new Set(ASYNC_PILOT_NODES.filter(node => records.some(record => record.guide === node.guide && record.anchor === node.anchor && record.completed)).map(node => node.code));
    error.value = '';
  } catch { if (own === generation) error.value = '进度暂不可用；仍可打开资料，当前推荐未结合完整进度。'; }
}, { immediate: true });
onBeforeUnmount(() => generation++);
</script>

<template>
  <section class="async-pilot" aria-label="异步学习链试点">
    <header><h2>异步学习链</h2><span>试点 · 按基础连接</span></header>
    <p>先会等待结果，再理解执行顺序，最后处理失败与结束。批次只作导航分组；阅读、学完与掌握分别记录。</p>
    <ol>
      <li v-for="code in ASYNC_PILOT_CHAIN" :key="code" :aria-current="currentCode === code ? 'step' : undefined">
        <strong>{{ code }} · {{ pilotNode(code)!.title }}</strong><small>{{ stateLabel(code) }}</small>
        <RouterLink v-if="pilotNode(code)!.kind === 'POINT'" :to="`/knowledge/${code}`">查看详情与练习</RouterLink>
        <RouterLink :to="pilotMaterialHref(pilotNode(code)!)">阅读讲义</RouterLink>
      </li>
    </ol>
    <p role="status">{{ error || plan.reason }}</p>
    <ul v-if="prerequisites.length" class="prerequisites" aria-label="待补基础">
      <li v-for="node in prerequisites" :key="node.code">
        <RouterLink :to="pilotMaterialHref(node)">{{ node.code }} · {{ node.title }}</RouterLink>
        <span>{{ stateLabel(node.code) }}。{{ node.reason }}</span>
        <RouterLink v-if="states.get(node.code) === 'DEFERRED'" :to="`/knowledge/${node.code}`">查看暂缓状态</RouterLink>
      </li>
    </ul>
    <small>已熟悉的短文可按需略读；这里的建议不切换当前学习点。其他路线仍使用兼容分组，尚未完成全库重排。</small>
  </section>
</template>

<style scoped>
.async-pilot{margin:18px 0;padding:22px;border:1px solid #c8ddd2;border-radius:16px;background:#f5faf7;color:#284c3d}.async-pilot header{display:flex;flex-wrap:wrap;align-items:center;gap:12px}.async-pilot h2{margin:0;font-size:1.2rem}.async-pilot header span,.async-pilot small{color:#536c60;font-size:.78rem}.async-pilot p{line-height:1.7;font-size:.9rem}.async-pilot ol{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;list-style:none;padding:0}.async-pilot ol li{display:flex;flex-wrap:wrap;gap:8px;padding:14px;background:#fff;border:1px solid #d7e4dc;border-radius:10px}.async-pilot strong,.async-pilot ol small{width:100%}.async-pilot a{color:#155d47;text-decoration:underline;text-underline-offset:3px;line-height:1.7}.async-pilot a:focus-visible{outline:2px solid #155d47;outline-offset:4px}.prerequisites{padding-left:20px}.prerequisites li{margin:10px 0}.prerequisites span{display:block;font-size:.85rem;line-height:1.7}[aria-current=step]{border-color:#26745b!important}@media(max-width:750px){.async-pilot ol{grid-template-columns:1fr}}
</style>
