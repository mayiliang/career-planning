<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useQuery } from '@tanstack/vue-query';
import { apiClient } from '@/api/client';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();
const router = useRouter();
const query = ref('');
const activeIndex = ref(0);
const input = ref<HTMLInputElement | null>(null);
const panel = ref<HTMLElement | null>(null);
let previousFocus: HTMLElement | null = null;
let previousBodyOverflow = '';

function focusableElements() {
  return Array.from(panel.value?.querySelectorAll<HTMLElement>('input, button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])') ?? [])
    .filter((element) => element.getClientRects().length > 0);
}

const { data } = useQuery({
  queryKey: ['knowledge', 'points', 'command-palette'],
  queryFn: () => apiClient.getKnowledgePoints(),
  staleTime: 60_000,
});

const destinations = [
  { label: '学习台', hint: '继续当前知识点与今日打卡', path: '/', code: 'LEARN', type: '页面' },
  { label: '知识体系脑图', hint: '查看完整能力结构', path: '/knowledge/map', code: 'ATLAS', type: '页面' },
  { label: '知识关系图谱', hint: '查看前置与关联关系', path: '/knowledge/graph', code: 'GRAPH', type: '页面' },
  { label: '笔记中心', hint: '按知识体系管理原文与 AI 整理稿', path: '/notes', code: 'NOTES', type: '页面' },
  { label: '紧凑核心路线', hint: '35 个连续批次，只安排真实知识点', path: '/plan', code: 'ROUTE', type: '页面' },
  { label: '求职支线', hint: '管理岗位、反馈与技能缺口', path: '/jobs', code: 'JOBS', type: '页面' },
  { label: '设置与本地数据', hint: 'DeepSeek、备份与恢复', path: '/settings', code: 'LOCAL', type: '页面' },
];

const results = computed(() => {
  const keyword = query.value.trim().toLowerCase();
  const pages = destinations.filter((item) => !keyword || `${item.label} ${item.hint} ${item.code}`.toLowerCase().includes(keyword));
  const points = (data.value?.items ?? [])
    .filter((point) => !keyword || `${point.code} ${point.title} ${point.domainTitle}`.toLowerCase().includes(keyword))
    .slice(0, keyword ? 9 : 5)
    .map((point) => ({
      label: point.title,
      hint: `${point.domainTitle} · ${point.planWeek ? `核心批次 B${String(point.planWeek).padStart(2, '0')}` : '专项路线'}`,
      path: `/knowledge/${point.code}`,
      code: point.code,
      type: point.status === 'MASTERED' ? '已掌握' : '知识点',
    }));
  return [...pages.slice(0, keyword ? 4 : 3), ...points].slice(0, 12);
});

function close() {
  emit('update:modelValue', false);
}

function choose(index = activeIndex.value) {
  const item = results.value[index];
  if (!item) return;
  close();
  void router.push(item.path);
}

function handleGlobalKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    emit('update:modelValue', !props.modelValue);
    return;
  }
  if (!props.modelValue) return;
  if (event.key === 'Escape') close();
  if (event.key === 'Tab') {
    const elements = focusableElements();
    const first = elements[0];
    const last = elements.at(-1);
    if (first && last && event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (first && last && !event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    activeIndex.value = (activeIndex.value + 1) % Math.max(1, results.value.length);
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    activeIndex.value = (activeIndex.value - 1 + Math.max(1, results.value.length)) % Math.max(1, results.value.length);
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    choose();
  }
}

watch(() => props.modelValue, async (open) => {
  if (!open) {
    document.body.style.overflow = previousBodyOverflow;
    previousFocus?.focus();
    previousFocus = null;
    return;
  }
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  query.value = '';
  activeIndex.value = 0;
  await nextTick();
  input.value?.focus();
});
watch(results, () => { activeIndex.value = 0; });
onMounted(() => window.addEventListener('keydown', handleGlobalKeydown));
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
  if (props.modelValue) document.body.style.overflow = previousBodyOverflow;
  previousFocus?.focus();
});
</script>

<template>
  <Teleport to="body">
    <Transition name="command">
      <div v-if="modelValue" class="command-overlay" @mousedown.self="close">
        <section ref="panel" class="command-panel" role="dialog" aria-modal="true" aria-label="快速查找" tabindex="-1">
          <header>
            <span>⌕</span>
            <input ref="input" v-model="query" aria-label="搜索页面或知识点" placeholder="搜索知识点、页面或能力领域…" autocomplete="off" />
            <kbd>ESC</kbd>
          </header>
          <div class="command-context"><span>COMMAND ROUTER</span><small>↑↓ 选择 · Enter 打开</small></div>
          <div class="command-results" role="listbox">
            <button v-for="(item, index) in results" :key="`${item.type}-${item.code}`" :class="{ active: activeIndex === index }" role="option" :aria-selected="activeIndex === index" @mouseenter="activeIndex = index" @click="choose(index)">
              <code>{{ item.code }}</code><span><strong>{{ item.label }}</strong><small>{{ item.hint }}</small></span><em>{{ item.type }}</em><b>↗</b>
            </button>
            <div v-if="results.length === 0" class="command-empty"><strong>没有匹配结果</strong><span>试试“Vue”“安全”或具体知识点编号。</span></div>
          </div>
          <footer><span><i></i>本地知识库</span><span>{{ data?.total ?? '—' }} 个可导航知识点</span></footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.command-overlay{position:fixed;z-index:2000;inset:0;display:grid;place-items:start center;padding:clamp(70px,12vh,150px) 1rem 1rem;background:rgba(9,20,35,.66);backdrop-filter:blur(10px)}.command-panel{width:min(680px,100%);overflow:hidden;color:var(--color-text);background:rgba(255,255,255,.98);border:1px solid rgba(194,210,230,.9);border-radius:20px;box-shadow:0 32px 100px rgba(8,23,42,.35)}.command-panel>header{display:grid;grid-template-columns:30px 1fr auto;gap:.5rem;align-items:center;padding:1rem 1.1rem;border-bottom:1px solid var(--color-border)}.command-panel>header>span{color:var(--color-primary);font-size:1.45rem}.command-panel input{width:100%;font-size:1rem;background:transparent;border:0;outline:0}.command-panel kbd{padding:.18rem .42rem;color:var(--color-text-tertiary);font:.56rem var(--font-mono);background:var(--color-surface-raised);border:1px solid var(--color-border);border-radius:6px;box-shadow:0 1px 0 var(--color-border-strong)}.command-context{display:flex;justify-content:space-between;padding:.65rem 1.1rem .4rem;color:var(--color-text-tertiary);font:.55rem var(--font-mono);letter-spacing:.12em}.command-context small{font:inherit;letter-spacing:0}.command-results{max-height:min(58vh,520px);overflow:auto;padding:.35rem .55rem .65rem}.command-results>button{display:grid;grid-template-columns:62px 1fr auto 18px;gap:.7rem;align-items:center;width:100%;min-height:62px;padding:.55rem .7rem;text-align:left;color:var(--color-text);background:transparent;border:1px solid transparent;border-radius:11px;cursor:pointer}.command-results>button.active{background:linear-gradient(90deg,var(--color-primary-soft),#f7faff);border-color:var(--color-primary-border)}.command-results code{color:var(--color-primary);font:720 .62rem var(--font-mono)}.command-results button>span{display:flex;min-width:0;flex-direction:column}.command-results strong{overflow:hidden;font-size:.75rem;text-overflow:ellipsis;white-space:nowrap}.command-results small{overflow:hidden;color:var(--color-text-tertiary);font-size:.59rem;text-overflow:ellipsis;white-space:nowrap}.command-results em{padding:.14rem .38rem;color:var(--color-text-tertiary);font:.52rem var(--font-body);font-style:normal;background:#f0f3f7;border-radius:5px}.command-results b{color:var(--color-primary);opacity:0}.command-results>button.active b{opacity:1}.command-empty{display:flex;min-height:150px;flex-direction:column;align-items:center;justify-content:center;color:var(--color-text-tertiary)}.command-empty strong{color:var(--color-text-secondary);font-size:.78rem}.command-empty span{font-size:.62rem}.command-panel>footer{display:flex;justify-content:space-between;padding:.65rem 1rem;color:var(--color-text-tertiary);font:.55rem var(--font-mono);background:var(--color-surface-raised);border-top:1px solid var(--color-border)}.command-panel>footer span{display:flex;gap:.4rem;align-items:center}.command-panel>footer i{width:6px;height:6px;background:var(--color-success);border-radius:50%}.command-enter-active,.command-leave-active{transition:opacity .16s ease}.command-enter-active .command-panel,.command-leave-active .command-panel{transition:transform .18s ease,opacity .16s ease}.command-enter-from,.command-leave-to{opacity:0}.command-enter-from .command-panel,.command-leave-to .command-panel{opacity:0;transform:translateY(-12px) scale(.98)}
@media(max-width:560px){.command-overlay{padding:1rem;place-items:start center}.command-panel{border-radius:16px}.command-results>button{grid-template-columns:54px 1fr 18px}.command-results em{display:none}.command-context small{display:none}}
</style>
