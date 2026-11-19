<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import { ROUTE_OUTCOME_TEXT, FOUNDATION_CODES, FRAMEWORK_CHAINS, type FrameworkChoice } from '@career-atlas/shared';
import { apiClient } from '@/api/client';
const props = defineProps<{ refreshKey?: string; expanded?: boolean }>();
const emit = defineEmits<{ changed: [] }>();
const location = useRoute();
const route = ref<Awaited<ReturnType<typeof apiClient.getLearningRoute>> | null>(null);
const preference = ref<Awaited<ReturnType<typeof apiClient.getLearningPreferences>> | null>(null);
const choice = ref<FrameworkChoice>('UNDECIDED');
const error = ref('');
const saving = ref(false);
let generation = 0;
async function load() {
  const own = ++generation;
  try {
    const [next, saved] = await Promise.all([apiClient.getLearningRoute(), apiClient.getLearningPreferences()]);
    if (own !== generation) return;
    route.value = next; preference.value = saved; choice.value = saved.frameworkChoice;
  } catch (reason) { if (own === generation) error.value = reason instanceof Error ? reason.message : '路线加载失败'; }
}
async function save() {
  if (!preference.value) return;
  saving.value = true; error.value = '';
  try {
    await apiClient.saveLearningPreferences(choice.value, preference.value.revision);
    await load(); emit('changed');
  } catch (reason) { error.value = `${reason instanceof Error ? reason.message : '保存失败'} 已重新读取偏好，请确认后再保存。`; await load(); }
  finally { saving.value = false; }
}
watch(() => [props.refreshKey, location.path], load, { immediate: true });
onBeforeUnmount(() => generation++);
</script>
<template>
  <section class="personal-route" aria-label="我的下一步">
    <header><h2>我的下一步</h2><RouterLink to="/plan">查看学习路线</RouterLink></header>
    <form @submit.prevent="save">
      <label>框架方向 <select v-model="choice" :disabled="saving || !preference"><option value="UNDECIDED">尚未选择</option><option value="REACT">React</option><option value="VUE">Vue</option><option value="NONE">暂不进入框架</option></select></label>
      <button type="submit" :disabled="saving || !preference">{{ saving ? '保存中…' : '保存方向' }}</button>
    </form>
    <p class="muted">选择只影响推荐，不改变当前学习点、暂缓状态或阅读进度。</p>
    <p v-if="error" role="alert">{{ error }} <button type="button" @click="load">重试</button></p>
    <template v-if="route">
      <p role="status">{{ ROUTE_OUTCOME_TEXT[route.outcome] }}</p>
      <RouterLink v-if="route.next" class="next" :to="`/knowledge/${route.next.code}`">{{ route.next.kind === 'CONTINUE' ? '继续学习' : route.next.kind === 'PREREQUISITE' ? '补齐基础' : '查看下一步' }} · {{ route.next.code }} →</RouterLink>
      <p v-if="route.current?.outsideSelectedTrack">保留当前学习点 {{ route.current.code }}，它位于其他方向。</p>
      <p v-if="route.current && !route.current.audited">当前点可以继续学习，其依赖尚未纳入本次审定。</p>
      <ul v-if="route.blockers.length"><li v-for="item in route.blockers" :key="item.code"><RouterLink :to="item.href">{{ item.code }}</RouterLink> · {{ item.reason }}</li></ul>
      <p v-for="diagnostic in route.diagnostics" :key="diagnostic">{{ diagnostic }}</p>
      <RouterLink v-if="route.outcome === 'DATA_GAP'" to="/settings">检查资料导入</RouterLink>
      <details :open="expanded"><summary>本次已审范围：共同基础与一个可选框架方向</summary>
        <p>共同基础：<RouterLink v-for="code in FOUNDATION_CODES" :key="code" :to="`/knowledge/${code}`">{{ code }} </RouterLink></p>
        <p v-for="(codes, track) in FRAMEWORK_CHAINS" :key="track">{{ track }}：<RouterLink v-for="code in codes" :key="code" :to="`/knowledge/${code}`">{{ code }} </RouterLink></p>
        <p>两条框架链可独立选择。已审链完成后不会自动进入另一框架或后续未审内容。学习完成与考核掌握分别记录。</p>
      </details>
    </template>
    <RouterLink to="/knowledge">浏览全部资料</RouterLink>
  </section>
</template>
<style scoped>
.personal-route{min-width:0;padding:22px;border:1px solid #c8ddd2;border-radius:16px;background:#f5faf7;color:#284c3d;line-height:1.75}.personal-route header,.personal-route form{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.personal-route header{justify-content:space-between}.personal-route h2{margin:0 0 10px;font-size:1.2rem}.personal-route p{margin:10px 0}.personal-route a{color:#155d47;text-decoration:underline;text-underline-offset:3px}.personal-route details a{display:inline-block;margin-right:9px}.personal-route select,.personal-route button{font:inherit;padding:8px;border:1px solid #a3b9ac;border-radius:8px;background:white;color:#284c3d}.personal-route button,.personal-route summary{cursor:pointer}.personal-route :focus-visible{outline:3px solid #b95d33;outline-offset:3px}.muted{font-size:.86rem}.next{font-weight:700}.personal-route details{margin:14px 0}.personal-route ul{padding-left:22px}
</style>
