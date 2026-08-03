<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { renderMarkdown } from '@/utils/markdown';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github-dark.css';

const props = withDefaults(defineProps<{
  source: string;
  thinking?: string;
  streaming?: boolean;
  thinkingOpen?: boolean;
  thinkingAutoCollapse?: boolean;
  ariaLabel?: string;
}>(), {
  thinking: '',
  streaming: false,
  thinkingOpen: true,
  thinkingAutoCollapse: true,
  ariaLabel: 'Markdown 内容',
});

const contentRoot = ref<HTMLElement | null>(null);
const thinkingRoot = ref<HTMLElement | null>(null);
const thinkingDetails = ref<HTMLDetailsElement | null>(null);
const rendered = ref('');
const renderedThinking = ref('');
const thinkingExpanded = ref(props.thinkingOpen);
const followingThinking = ref(true);
const thinkingCharacters = computed(() => props.thinking.trim().length.toLocaleString('zh-CN'));
let timer: ReturnType<typeof setTimeout> | undefined;
let frame: number | undefined;
let revision = 0;
let thinkingWasVisible = false;
const diagramCache = new Map<string, string>();

function scheduleRender() {
  if (!props.streaming) {
    flushRender();
    return;
  }
  if (timer !== undefined || frame !== undefined) return;
  timer = setTimeout(() => {
    timer = undefined;
    frame = requestAnimationFrame(() => {
      frame = undefined;
      flushRender();
    });
  }, 72);
}

function flushRender() {
  rendered.value = renderMarkdown(props.source);
  renderedThinking.value = props.thinking ? renderMarkdown(props.thinking) : '';
  const currentRevision = ++revision;
  void nextTick(async () => {
    await renderDiagrams(currentRevision);
    syncThinkingViewport();
  });
}

function syncThinkingViewport(force = false) {
  const viewport = thinkingRoot.value;
  if (!viewport || !thinkingExpanded.value || (!followingThinking.value && !force)) return;
  viewport.scrollTop = viewport.scrollHeight;
  followingThinking.value = true;
  if (!thinkingWasVisible && props.streaming && props.thinking) {
    thinkingWasVisible = true;
    thinkingDetails.value?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function onThinkingScroll() {
  const viewport = thinkingRoot.value;
  if (!viewport) return;
  followingThinking.value = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 36;
}

function onThinkingToggle(event: Event) {
  thinkingExpanded.value = (event.currentTarget as HTMLDetailsElement).open;
  if (thinkingExpanded.value) {
    followingThinking.value = true;
    void nextTick(() => syncThinkingViewport(true));
  }
}

function jumpToLatestThinking() {
  followingThinking.value = true;
  syncThinkingViewport(true);
}

async function renderDiagrams(currentRevision: number) {
  const roots = [contentRoot.value, thinkingRoot.value].filter((value): value is HTMLElement => Boolean(value));
  const targets = roots.flatMap((root) => Array.from(root.querySelectorAll<HTMLElement>('.mermaid-diagram[data-mermaid-state="pending"]')));
  if (!targets.length) return;
  const { default: mermaid } = await import('mermaid');
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral', suppressErrorRendering: true });
  for (const [index, target] of targets.entries()) {
    if (currentRevision !== revision || !target.isConnected) return;
    const source = target.querySelector('code')?.textContent?.trim() ?? '';
    if (!source) continue;
    try {
      let svg = diagramCache.get(source);
      if (!svg) {
        const result = await mermaid.render(`ca-mermaid-${currentRevision}-${index}-${Math.random().toString(36).slice(2)}`, source);
        svg = result.svg;
        diagramCache.set(source, svg);
        if (diagramCache.size > 40) diagramCache.delete(diagramCache.keys().next().value as string);
      }
      if (currentRevision === revision && target.isConnected) {
        target.innerHTML = svg;
        target.dataset.mermaidState = 'ready';
      }
    } catch (reason) {
      if (currentRevision === revision && target.isConnected) {
        target.dataset.mermaidState = 'error';
        const message = reason instanceof Error ? reason.message : '图形语法不完整';
        target.querySelector('.mermaid-status')!.textContent = `暂时无法绘制：${message}`;
      }
    }
  }
}

watch(() => [props.source, props.thinking, props.streaming], scheduleRender, { immediate: true });
watch(() => props.thinkingOpen, (open) => { thinkingExpanded.value = open; });
watch(() => props.streaming, (streaming, wasStreaming) => {
  if (streaming) {
    thinkingWasVisible = false;
    followingThinking.value = true;
    thinkingExpanded.value = props.thinkingOpen;
  } else if (wasStreaming && props.thinkingAutoCollapse && props.thinking) {
    thinkingExpanded.value = false;
  }
});
onBeforeUnmount(() => {
  revision += 1;
  if (timer !== undefined) clearTimeout(timer);
  if (frame !== undefined) cancelAnimationFrame(frame);
});
</script>

<template>
  <div class="markdown-renderer" :class="{ 'is-streaming': streaming }">
    <details ref="thinkingDetails" v-if="thinking" class="thinking-panel" :open="thinkingExpanded" @toggle="onThinkingToggle">
      <summary>
        <i v-if="streaming" aria-hidden="true"></i>
        <span class="thinking-panel__title"><b>AI 思考过程</b><small>模型提供，可能不完整 · {{ thinkingCharacters }} 字</small></span>
        <span class="thinking-panel__state">{{ streaming ? '正在生成' : thinkingExpanded ? '收起' : '展开查看' }}</span>
        <span class="thinking-panel__chevron" aria-hidden="true"></span>
      </summary>
      <div class="thinking-panel__body">
        <div ref="thinkingRoot" class="thinking-panel__content" aria-label="AI 思考过程" @scroll.passive="onThinkingScroll" v-html="renderedThinking"></div>
        <button v-if="streaming && !followingThinking" type="button" class="thinking-panel__latest" @click="jumpToLatestThinking">回到最新 ↓</button>
      </div>
    </details>
    <article ref="contentRoot" class="markdown-body" :aria-label="ariaLabel" v-html="rendered"></article>
  </div>
</template>

<style scoped>
.markdown-renderer { min-width: 0; color: #1c2925; font-size: 1rem; line-height: 1.82; overflow-wrap: anywhere; }
.markdown-body { min-width: 0; }
.markdown-body :deep(> :first-child), .thinking-panel__content :deep(> :first-child) { margin-top: 0; }
.markdown-body :deep(> :last-child), .thinking-panel__content :deep(> :last-child) { margin-bottom: 0; }
.markdown-renderer :deep(h1), .markdown-renderer :deep(h2), .markdown-renderer :deep(h3), .markdown-renderer :deep(h4) { color: #10241d; line-height: 1.3; margin: 1.55em 0 .68em; letter-spacing: -.02em; scroll-margin-top: 5rem; }
.markdown-renderer :deep(h1) { font-size: 2em; padding-bottom: .4em; border-bottom: 1px solid #dce4df; }
.markdown-renderer :deep(h2) { font-size: 1.52em; }
.markdown-renderer :deep(h3) { font-size: 1.24em; }
.markdown-renderer :deep(p), .markdown-renderer :deep(ul), .markdown-renderer :deep(ol), .markdown-renderer :deep(blockquote), .markdown-renderer :deep(table), .markdown-renderer :deep(pre) { margin: .82em 0; }
.markdown-renderer :deep(ul), .markdown-renderer :deep(ol) { padding-left: 1.6em; }
.markdown-renderer :deep(li + li) { margin-top: .28em; }
.markdown-renderer :deep(a) { color: #096c59; text-decoration-thickness: .08em; text-underline-offset: .2em; }
.markdown-renderer :deep(a:hover) { color: #b34b2d; }
.markdown-renderer :deep(blockquote) { padding: .7em 1em; border-left: 4px solid #5c8c7c; background: #f3f7f5; color: #4d615a; border-radius: 0 10px 10px 0; }
.markdown-renderer :deep(code:not(pre code)) { padding: .14em .38em; border: 1px solid #dde6e1; border-radius: 5px; background: #f3f6f4; color: #a2422b; font-size: .9em; }
.markdown-renderer :deep(pre.hljs), .markdown-renderer :deep(pre:not(.mermaid-source)) { position: relative; padding: 1.1rem 1.2rem; border-radius: 12px; background: #17231f; color: #edf5f1; overflow: auto; box-shadow: inset 0 0 0 1px rgba(255,255,255,.06); }
.markdown-renderer :deep(pre code) { font-family: "Cascadia Code", "SFMono-Regular", Consolas, monospace; font-size: .88rem; line-height: 1.65; }
.markdown-renderer :deep(.table-wrap) { overflow-x: auto; }
.markdown-renderer :deep(table) { display: block; width: max-content; min-width: min(100%, 36rem); max-width: 100%; border-spacing: 0; overflow-x: auto; border: 1px solid #dbe4df; border-radius: 10px; }
.markdown-renderer :deep(th), .markdown-renderer :deep(td) { min-width: 8rem; padding: .65rem .78rem; border-right: 1px solid #e1e8e4; border-bottom: 1px solid #e1e8e4; text-align: left; vertical-align: top; }
.markdown-renderer :deep(th) { background: #edf4f1; color: #173e33; font-weight: 750; }
.markdown-renderer :deep(tr:last-child td) { border-bottom: 0; }
.markdown-renderer :deep(th:last-child), .markdown-renderer :deep(td:last-child) { border-right: 0; }
.markdown-renderer :deep(img) { display: block; max-width: 100%; height: auto; margin: 1rem auto; border-radius: 12px; }
.markdown-renderer :deep(hr) { border: 0; border-top: 1px solid #d8e0dc; margin: 1.7rem 0; }
.markdown-renderer :deep(.task-list-item) { list-style: none; margin-left: -1.4em; }
.markdown-renderer :deep(.task-list-item-checkbox) { margin-right: .55em; accent-color: #176a55; }
.markdown-renderer :deep(.footnotes) { margin-top: 2rem; padding-top: .8rem; border-top: 1px solid #d9e2dd; color: #5c6e68; font-size: .9em; }
.markdown-renderer :deep(mark) { padding: .05em .18em; background: #ffeca5; border-radius: 3px; }
.markdown-renderer :deep(.katex-display) { padding: .55rem 0; overflow-x: auto; overflow-y: hidden; }
.markdown-renderer :deep(.mermaid-diagram) { min-height: 8rem; margin: 1rem 0; padding: 1rem; display: grid; place-items: center; border: 1px solid #d9e4df; border-radius: 14px; background: linear-gradient(145deg, #fbfdfc, #f0f6f3); overflow-x: auto; }
.markdown-renderer :deep(.mermaid-diagram svg) { max-width: 100%; height: auto; }
.markdown-renderer :deep(.mermaid-source) { display: none; }
.markdown-renderer :deep(.mermaid-status) { color: #6d7d77; }
.markdown-renderer :deep(.mermaid-diagram[data-mermaid-state="pending"]) { background-image: linear-gradient(90deg, transparent, rgba(255,255,255,.75), transparent); background-size: 200% 100%; animation: diagram-shimmer 1.35s linear infinite; }
.markdown-renderer :deep(.mermaid-diagram[data-mermaid-state="error"]) { min-height: 4rem; border-color: #e7c1b4; background: #fff6f2; }
.markdown-renderer :deep(.markdown-callout) { margin: 1rem 0; padding: .85rem 1rem; border: 1px solid #c9ddd5; border-left: 4px solid #2f8068; border-radius: 10px; background: #f3f9f6; }
.markdown-renderer :deep(.markdown-callout--warning) { border-color: #ead6a5; border-left-color: #bd841a; background: #fffaf0; }
.markdown-renderer :deep(.markdown-callout--danger) { border-color: #ebc3b8; border-left-color: #b94e36; background: #fff5f1; }
.markdown-renderer :deep(.thinking-block), .thinking-panel { margin: .8rem 0 1rem; border: 1px solid #cddcd7; border-radius: 12px; background: linear-gradient(135deg, #f5f9f7, #eef5f2); overflow: hidden; }
.markdown-renderer :deep(.thinking-block summary), .thinking-panel > summary { display: flex; align-items: center; gap: .65rem; min-height: 48px; padding: .55rem .8rem; color: #2f5a4d; font-weight: 750; cursor: pointer; list-style: none; user-select: none; }
.markdown-renderer :deep(.thinking-block summary::-webkit-details-marker), .thinking-panel > summary::-webkit-details-marker { display: none; }
.markdown-renderer :deep(.thinking-block summary small), .thinking-panel > summary small { color: #74857f; font-size: .7rem; font-weight: 500; }
.markdown-renderer :deep(.thinking-block__content) { max-height: clamp(10rem, 32vh, 22rem); padding: .35rem 1rem 1rem; overflow: auto; color: #42564f; font-size: .92rem; scrollbar-gutter: stable; overscroll-behavior: contain; }
.thinking-panel__title { display: grid; min-width: 0; gap: .05rem; line-height: 1.35; }
.thinking-panel__title b { font-size: .86rem; }
.thinking-panel__state { margin-left: auto; color: #667a73; font-size: .68rem; font-weight: 650; white-space: nowrap; }
.thinking-panel__chevron { width: .48rem; height: .48rem; border-right: 2px solid #668078; border-bottom: 2px solid #668078; transform: rotate(45deg); transition: transform .18s ease; }
.thinking-panel[open] .thinking-panel__chevron { transform: rotate(225deg); }
.thinking-panel > summary i { flex: 0 0 auto; width: .45rem; height: .45rem; border-radius: 50%; background: #cf6a42; box-shadow: 0 0 0 .28rem rgba(207,106,66,.13); animation: pulse 1.1s ease-in-out infinite; }
.thinking-panel__body { position: relative; border-top: 1px solid rgba(150,177,168,.3); }
.thinking-panel__content { max-height: clamp(10rem, 32vh, 22rem); padding: .75rem 1rem 1rem; overflow: auto; color: #42564f; font-size: .88rem; line-height: 1.7; scrollbar-gutter: stable; overscroll-behavior: contain; scroll-behavior: smooth; }
.thinking-panel__latest { position: absolute; right: .8rem; bottom: .7rem; padding: .36rem .62rem; color: #fff; font-size: .68rem; font-weight: 700; background: #2f6858; border: 0; border-radius: 999px; box-shadow: 0 5px 16px rgba(38,86,71,.25); cursor: pointer; }
.is-streaming .markdown-body:not(:empty)::after { content: ""; display: inline-block; width: .5em; height: 1em; margin-left: .2em; vertical-align: -.12em; background: #c85d37; border-radius: 2px; animation: pulse .85s ease-in-out infinite; }
@keyframes pulse { 50% { opacity: .25; } }
@keyframes diagram-shimmer { to { background-position: -200% 0; } }
@media (max-width: 720px) { .markdown-renderer { font-size: .95rem; } .markdown-renderer :deep(h1) { font-size: 1.65em; } .markdown-renderer :deep(pre.hljs) { border-radius: 9px; padding: .9rem; } }
@media (prefers-reduced-motion: reduce) { .markdown-renderer :deep(.mermaid-diagram), .thinking-panel > summary i, .is-streaming .markdown-body::after { animation: none; } }
</style>
