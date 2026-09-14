<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useQuery } from '@tanstack/vue-query';
import { apiClient } from '@/api/client';
import AppIcon from '@/components/AppIcon.vue';

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
  return Array.from(panel.value?.querySelectorAll<HTMLElement>('input, button:not([disabled]):not([tabindex="-1"]), a[href], [tabindex]:not([tabindex="-1"])') ?? [])
    .filter((element) => element.getClientRects().length > 0);
}

const { data, isFetching, error, refetch } = useQuery({
  queryKey: ['knowledge', 'points', 'command-palette'],
  queryFn: () => apiClient.getKnowledgePoints(),
  staleTime: 60_000,
  enabled: computed(() => props.modelValue),
});

const destinations = [
  { label: '学习台', hint: '继续当前知识点与今日打卡', path: '/', code: 'LEARN', type: '页面' },
  { label: '知识体系脑图', hint: '查看完整能力结构', path: '/knowledge/map', code: 'ATLAS', type: '页面' },
  { label: '知识关系图谱', hint: '查看前置与关联关系', path: '/knowledge/graph', code: 'GRAPH', type: '页面' },
  { label: '笔记中心', hint: '按知识体系管理原文与 AI 整理稿', path: '/notes', code: 'NOTES', type: '页面' },
  { label: '求职优先核心路线', hint: '先 React/Vue 与面试能力，再逐层深入', path: '/plan', code: 'ROUTE', type: '页面' },
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
  return [...pages, ...points].slice(0, 12);
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
  if (event.isComposing || event.keyCode === 229) return;
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    if (!props.modelValue && document.querySelector('[role="dialog"][aria-modal="true"]')) return;
    event.preventDefault();
    emit('update:modelValue', !props.modelValue);
    return;
  }
  if (!props.modelValue) return;
  if (event.key === 'Escape') { event.preventDefault(); close(); return; }
  if (event.key === 'Tab') {
    const elements = focusableElements();
    const first = elements[0];
    const last = elements.at(-1);
    if (first && last && event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (first && last && !event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  if (event.target !== input.value) return;
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    activeIndex.value = (activeIndex.value + 1) % Math.max(1, results.value.length);
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    activeIndex.value = (activeIndex.value - 1 + Math.max(1, results.value.length)) % Math.max(1, results.value.length);
  }
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    void nextTick(() => panel.value?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }));
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
            <AppIcon name="search" />
            <input ref="input" v-model="query" role="combobox" aria-label="搜索页面或知识点" aria-autocomplete="list" aria-controls="command-results" aria-expanded="true" :aria-activedescendant="results.length ? `command-result-${activeIndex}` : undefined" placeholder="搜索知识点、页面或能力领域…" autocomplete="off" />
            <button class="command-close" aria-label="关闭快速查找" @click="close"><AppIcon name="close" /></button>
          </header>
          <div class="command-context"><span>{{ query.trim() ? '搜索结果' : '快捷前往' }}</span><small>↑↓ 选择 · Enter 打开 · Esc 关闭</small></div>
          <div v-if="error" class="command-notice" role="alert"><span>知识点暂时无法加载，仍可前往页面。</span><button @click="refetch()">重试</button></div>
          <div id="command-results" class="command-results" role="listbox" aria-label="页面与知识点" :aria-busy="isFetching">
            <button v-for="(item, index) in results" :id="`command-result-${index}`" :key="`${item.type}-${item.code}`" :class="{ active: activeIndex === index }" role="option" tabindex="-1" :aria-selected="activeIndex === index" @mouseenter="activeIndex = index" @click="choose(index)">
              <code>{{ item.code }}</code><span><strong>{{ item.label }}</strong><small>{{ item.hint }}</small></span><em>{{ item.type }}</em><b>↗</b>
            </button>
            <div v-if="results.length === 0" class="command-empty"><strong>{{ isFetching ? '正在查找知识点…' : '没有匹配结果' }}</strong><span>试试“Vue”“安全”或具体知识点编号。</span></div>
          </div>
          <footer><span><i></i>本地知识库</span><span role="status">{{ isFetching ? '正在加载…' : `${results.length} 个结果 · ${data?.total ?? '—'} 个知识点可搜索` }}</span></footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.command-overlay { position: fixed; z-index: 2400; inset: 0; display: grid; place-items: start center; padding: clamp(30px, 10vh, 100px) 20px 20px; background: #10223666; backdrop-filter: blur(8px); }
.command-panel { display: flex; flex-direction: column; width: min(680px, 100%); max-height: calc(100dvh - clamp(30px, 10vh, 100px) - 20px); overflow: hidden; color: var(--color-text); background: #fff; border: 1px solid #dfe7ef; border-radius: 18px; box-shadow: 0 28px 100px #0c203d38; }
.command-panel > header { display: grid; grid-template-columns: 22px minmax(0, 1fr) 32px; gap: 14px; align-items: center; padding: 20px 22px; border-bottom: 1px solid #e8edf3; flex-shrink: 0; }
.command-panel > header > .app-icon { color: #6482a3; }
.command-panel input { min-width: 0; width: 100%; padding: 6px 0; color: #304b65; font-size: 15px; background: transparent; border: 0; outline: 0; }
.command-panel input::placeholder { color: #93a0b0; }
.command-panel input:focus-visible { outline: 0; }
.command-panel > header:focus-within { box-shadow: inset 0 -2px 0 #6591c7; }
.command-close { display: grid; place-items: center; width: 32px; height: 32px; padding: 0; color: #8493a5; background: #f4f7fa; border: 1px solid #e4eaf1; border-radius: 7px; cursor: pointer; }
.command-close .app-icon { width: 16px; height: 16px; }
.command-context { display: flex; justify-content: space-between; flex-shrink: 0; gap: 10px; padding: 16px 24px 8px; color: #7a8ca0; font-size: 11px; }
.command-context small { color: #94a0ae; font-size: 10px; }
.command-results { min-height: 0; overflow: auto; overscroll-behavior: contain; padding: 0 10px 10px; scrollbar-gutter: stable; }
.command-results > button { display: grid; grid-template-columns: 70px minmax(0, 1fr) auto 16px; gap: 12px; align-items: center; width: 100%; min-height: 65px; padding: 10px 12px; text-align: left; color: #30485f; background: transparent; border: 1px solid transparent; border-radius: 10px; cursor: pointer; }
.command-results > button.active { color: #254f83; background: #eef4fc; border-color: #dbe7f7; }
.command-results code { color: #5e7eaa; font: 600 11px/1.5 var(--font-mono); }
.command-results button > span { display: flex; min-width: 0; flex-direction: column; gap: 4px; }
.command-results strong { overflow: hidden; font-size: 13px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.command-results small { overflow: hidden; color: #8191a3; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.command-results em { padding: 2px 7px; color: #8b98a7; font: 10px/1.5 var(--font-body); font-style: normal; background: #f1f4f8; border-radius: 5px; }
.command-results b { font-size: 16px; color: #6e91bf; opacity: 0; }
.command-results > button.active b { opacity: 1; }
.command-empty { display: flex; min-height: 160px; padding: 20px; flex-direction: column; gap: 8px; align-items: center; justify-content: center; color: #8999aa; }
.command-empty strong { color: #5c7288; font-size: 14px; }
.command-empty span { font-size: 12px; text-align: center; }
.command-notice { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 4px 22px 10px; padding: 10px; font-size: 12px; color: #8b683b; background: #fff7e8; border-radius: 7px; }
.command-notice button { padding: 3px 6px; color: inherit; background: transparent; border: 1px solid #e8d6b8; border-radius: 4px; cursor: pointer; }
.command-panel > footer { display: flex; justify-content: space-between; flex-shrink: 0; gap: 12px; padding: 13px 22px; color: #8a98a8; font-size: 10px; background: #f9fbfd; border-top: 1px solid #e9eef4; }
.command-panel > footer span { display: flex; align-items: center; gap: 7px; }
.command-panel > footer i { width: 5px; height: 5px; background: #68a98b; border-radius: 50%; }
.command-enter-active, .command-leave-active { transition: opacity .16s ease; }
.command-enter-active .command-panel, .command-leave-active .command-panel { transition: transform .18s ease; }
.command-enter-from, .command-leave-to { opacity: 0; }
.command-enter-from .command-panel, .command-leave-to .command-panel { transform: translateY(-10px) scale(.99); }
@media (max-width: 560px) {
  .command-overlay { padding: max(12px, env(safe-area-inset-top)) 10px 12px; }
  .command-panel { max-height: calc(100dvh - 24px - env(safe-area-inset-top)); border-radius: 14px; }
  .command-panel > header { padding: 14px; gap: 9px; }
  .command-panel input { font-size: 14px; }
  .command-context { padding-inline: 16px; }
  .command-context small { font-size: 9px; }
  .command-results > button { grid-template-columns: 64px minmax(0, 1fr) 12px; gap: 8px; }
  .command-results em { display: none; }
  .command-panel > footer { padding: 12px 16px; }
}
</style>
