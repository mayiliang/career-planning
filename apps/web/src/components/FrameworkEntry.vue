<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { frameworkEntry, FRAMEWORK_ENTRY_NODES, FRAMEWORK_PREREQUISITE_REASONS, type PilotState } from '@career-atlas/shared';
import { apiClient } from '@/api/client';
const props = defineProps<{ code?: string; refreshKey?: string }>();
const entries = computed(() => props.code ? FRAMEWORK_ENTRY_NODES.filter(n => n.code === props.code) : FRAMEWORK_ENTRY_NODES);
const states = ref(new Map<string, PilotState>());
const error = ref('');
let generation = 0;
watch(() => [props.code, props.refreshKey], async () => {
  const own = ++generation;
  try {
    const points = await apiClient.getKnowledgePoints();
    if (own !== generation) return;
    states.value = new Map(points.items.map(p => [p.code, p.learningState]));
    error.value = '';
  } catch { if (own === generation) error.value = '状态暂不可用；可继续查阅，不能据此判断前置已满足。'; }
}, { immediate: true });
onBeforeUnmount(() => generation++);
function label(code: string) {
  return ({ LEARNED: '已学完', LEARNING: '学习中', DEFERRED: '已暂缓，依赖仍需补齐', NOT_STARTED: '未开始，可按需补学' })[states.value.get(code) ?? 'NOT_STARTED'];
}
</script>
<template>
  <section v-if="!code || frameworkEntry(code)" class="framework-entry" aria-label="框架入口基础">
    <h2>从一个框架开始</h2>
    <p>选择你要学的入口；无需先学另一个框架。熟悉下列基础可直接继续，查看链接不会更改当前学习点、学完或暂缓状态。</p>
    <p v-if="error" role="status">{{ error }}</p>
    <article v-for="entry in entries" :key="entry.code">
      <h3>{{ entry.code }} · {{ label(entry.code) }}</h3>
      <RouterLink :to="`/knowledge/${entry.code}`">详情与练习</RouterLink>
      <RouterLink :to="`/knowledge/materials/${entry.guide}/${entry.anchor}`">阅读讲义</RouterLink>
      <ul>
        <li v-for="dependency in entry.prerequisites" :key="dependency">
          <RouterLink :to="{ path: `/knowledge/${dependency}`, query: { entryReturn: entry.code } }">补学 {{ dependency }}</RouterLink> · {{ label(dependency) }}<br>{{ FRAMEWORK_PREREQUISITE_REASONS[dependency] }}
        </li>
      </ul>
    </article>
    <small>查阅不等于掌握；正文说明每项基础的用途。TS-03、Router 和跨框架对照不是入口门槛。全局交错路线仍是待替换的兼容现状。</small>
  </section>
</template>
<style scoped>
.framework-entry{margin:18px 0;padding:22px;border:1px solid #c8ddd2;border-radius:16px;background:#f5faf7;color:#284c3d;line-height:1.8}.framework-entry h2{margin:0;font-size:1.2rem}.framework-entry h3{font-size:1rem}.framework-entry a{color:#155d47;text-decoration:underline;margin-right:14px;text-underline-offset:3px}.framework-entry a:focus-visible{outline:2px solid #155d47;outline-offset:4px}.framework-entry small{display:block;color:#536c60}
</style>
