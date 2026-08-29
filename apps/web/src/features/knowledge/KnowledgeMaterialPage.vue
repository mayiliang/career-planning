<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { apiClient } from '@/api/client';
import MarkdownRenderer from '@/components/MarkdownRenderer.vue';
import { extractMarkdownHeadings } from '@/utils/markdown';

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const error = ref('');
const material = ref<Awaited<ReturnType<typeof apiClient.getKnowledgeMaterial>> | null>(null);
const readerRoot = ref<HTMLElement | null>(null);
const activeHeading = ref('');
const readingProgress = ref(0);
const tocOpen = ref(false);
const copied = ref(false);
const pronunciationFeedback = ref('');
type MaterialReading = Awaited<ReturnType<typeof apiClient.getMaterialReadingProgress>>[number];
const materialReadingByKey = ref<Record<string, MaterialReading>>({});
const readingSaveFeedback = ref('');
let headingObserver: IntersectionObserver | null = null;
let pronunciationAudio: HTMLAudioElement | null = null;
let activePronunciationButton: HTMLButtonElement | null = null;
let readingSaveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingReadingSave: { guide: string; anchor: string; progressPercent: number } | null = null;

interface PronunciationManifest {
  voice: { name: string; culture: string; rate: number };
  terms: Record<string, { file: string; text: string }>;
}

const pronunciationManifestPromises = new Map<string, Promise<PronunciationManifest>>();

const headings = computed(() => {
  const candidates = extractMarkdownHeadings(material.value?.markdown ?? '')
    .filter(({ level }, index) => index > 0 && level <= 4);
  return candidates.length > 1 ? candidates : [];
});
const characterCount = computed(() => (material.value?.markdown ?? '').replace(/\s/g, '').length);
const readingMinutes = computed(() => Math.max(1, Math.ceil(characterCount.value / 450)));
const isBeginnerGuide = computed(() => material.value?.guide === 'beginner-prerequisites-and-glossary.md');
const scopedMainGuides = new Set([
  'js-01-execution-context-scope-closure.md',
  'js-02-prototype-object-model-this.md',
  'js-03-types-equality-copy-immutability.md',
  'js-07-iteration-metaprogramming-resources.md',
  'cs-01-complexity-scale-engineering-cost.md',
  'cs-02-data-structures-algorithms-correctness.md',
  'cs-03-large-data-workers-incremental-memory.md',
  'js-04-async-promise-browser-event-loop.md',
  'js-05-promise-errors-async-control-flow.md',
  'js-06-es-modules-module-boundaries.md',
  'ts-01-type-system-structural-strict-mode.md',
  'ts-02-unions-narrowing-never-exhaustiveness.md',
]);
const atomicPrerequisiteGuides = new Set([
  'javascript-variables-and-bindings.md',
  'javascript-functions-and-callbacks.md',
  'javascript-objects-properties-methods.md',
  'javascript-scheduled-callbacks.md',
  'javascript-strict-mode.md',
  'javascript-exceptions-and-finally.md',
  'javascript-promises-and-cancellation.md',
  'javascript-property-descriptors.md',
  'algorithm-input-size-and-growth.md',
  'javascript-collections-keys-membership.md',
  'browser-main-thread-messages-memory.md',
]);
const pronunciationBatchByGuide = new Map<string, string>([
  ...[
    'js-01-execution-context-scope-closure.md',
    'js-02-prototype-object-model-this.md',
    'js-03-types-equality-copy-immutability.md',
    'js-07-iteration-metaprogramming-resources.md',
    'javascript-variables-and-bindings.md',
    'javascript-functions-and-callbacks.md',
    'javascript-objects-properties-methods.md',
    'javascript-scheduled-callbacks.md',
    'javascript-strict-mode.md',
    'javascript-exceptions-and-finally.md',
    'javascript-promises-and-cancellation.md',
    'javascript-property-descriptors.md',
  ].map((guide) => [guide, 'b01'] as const),
  ...[
    'cs-01-complexity-scale-engineering-cost.md',
    'cs-02-data-structures-algorithms-correctness.md',
    'cs-03-large-data-workers-incremental-memory.md',
    'js-04-async-promise-browser-event-loop.md',
    'algorithm-input-size-and-growth.md',
    'javascript-collections-keys-membership.md',
    'browser-main-thread-messages-memory.md',
  ].map((guide) => [guide, 'b02'] as const),
  ...[
    'js-05-promise-errors-async-control-flow.md',
    'js-06-es-modules-module-boundaries.md',
    'ts-01-type-system-structural-strict-mode.md',
    'ts-02-unions-narrowing-never-exhaustiveness.md',
  ].map((guide) => [guide, 'b03'] as const),
]);
const isScopedMainGuide = computed(() => scopedMainGuides.has(material.value?.guide ?? ''));
const isAtomicPrerequisite = computed(() => atomicPrerequisiteGuides.has(material.value?.guide ?? ''));
const usesLinkedPrerequisites = computed(() => isScopedMainGuide.value || isAtomicPrerequisite.value);
const pronunciationBatch = computed(() => pronunciationBatchByGuide.get(material.value?.guide ?? '') ?? '');
const hasPronunciations = computed(() => Boolean(pronunciationBatch.value));
const tracksReadingProgress = computed(() => pronunciationBatchByGuide.has(material.value?.guide ?? ''));
const currentReading = computed<MaterialReading>(() => {
  const guide = material.value?.guide ?? '';
  const anchor = material.value?.anchor ?? '';
  return materialReadingByKey.value[`${guide}#${anchor}`] ?? {
    guide,
    anchor,
    progressPercent: 0,
    completed: false,
    completedAt: null,
    updatedAt: null,
  };
});
const readingStateLabel = computed(() => currentReading.value.completed
  ? '已看完'
  : currentReading.value.progressPercent > 0
    ? `已读 ${currentReading.value.progressPercent}%`
    : '未读');
const materialDescription = computed(() => isAtomicPrerequisite.value
  ? '这是一份只解释一个前置概念的短文。读懂后可按文末链接返回相关知识点，不会把多个领域术语混在一起。'
  : isScopedMainGuide.value
    ? '这份讲义围绕知识点本身展开；所需前置在正文头部按需列出，练习与挑战不决定讲义结构。'
    : '当前页只呈现这个知识点对应的 Markdown 章节，资料、练习与掌握挑战使用同一学习边界。');
const materialKind = computed(() => isBeginnerGuide.value ? '阅读辅助' : isAtomicPrerequisite.value ? '前置知识短文' : '知识点主讲义');

async function load() {
  loading.value = true;
  error.value = '';
  activeHeading.value = '';
  readingSaveFeedback.value = '';
  try {
    const guide = String(route.params.guide ?? '');
    const anchor = String(route.params.anchor ?? '');
    const [materialData, readingRecords] = await Promise.all([
      apiClient.getKnowledgeMaterial(guide, anchor),
      pronunciationBatchByGuide.has(guide) ? apiClient.getMaterialReadingProgress() : Promise.resolve([]),
    ]);
    materialReadingByKey.value = Object.fromEntries(readingRecords.map((record) => [`${record.guide}#${record.anchor}`, record]));
    material.value = materialData;
    readingProgress.value = materialReadingByKey.value[`${materialData.guide}#${materialData.anchor}`]?.progressPercent ?? 0;
  } catch (reason) {
    material.value = null;
    error.value = reason instanceof Error ? reason.message : '学习资料加载失败';
  } finally {
    loading.value = false;
  }
}

function updateReadingProgress() {
  const root = readerRoot.value;
  const markdownRoot = root?.querySelector<HTMLElement>('.markdown-body');
  if (!root || !markdownRoot) return;
  const rect = markdownRoot.getBoundingClientRect();
  const start = rect.top + window.scrollY;
  const visibleBottom = window.scrollY + window.innerHeight;
  const viewportCoverage = Math.min(100, Math.max(0, ((visibleBottom - start) / Math.max(1, rect.height)) * 100));
  const nextProgress = Math.max(currentReading.value.progressPercent, Math.floor(viewportCoverage));
  readingProgress.value = nextProgress;
  scheduleReadingProgressSave(nextProgress);
}

function scheduleReadingProgressSave(progressPercent: number) {
  if (!tracksReadingProgress.value || !material.value || currentReading.value.completed) return;
  if (progressPercent <= currentReading.value.progressPercent) return;
  pendingReadingSave = {
    guide: material.value.guide,
    anchor: material.value.anchor,
    progressPercent: Math.max(pendingReadingSave?.progressPercent ?? 0, progressPercent),
  };
  if (readingSaveTimer) clearTimeout(readingSaveTimer);
  if (pendingReadingSave.progressPercent > 80) {
    void flushReadingProgressSave();
    return;
  }
  readingSaveTimer = setTimeout(() => { void flushReadingProgressSave(); }, 650);
}

async function flushReadingProgressSave() {
  if (readingSaveTimer) clearTimeout(readingSaveTimer);
  readingSaveTimer = null;
  const pending = pendingReadingSave;
  pendingReadingSave = null;
  if (!pending) return;
  try {
    const saved = await apiClient.updateMaterialReadingProgress(pending.guide, pending.anchor, pending.progressPercent);
    materialReadingByKey.value = { ...materialReadingByKey.value, [`${saved.guide}#${saved.anchor}`]: saved };
    readingProgress.value = Math.max(readingProgress.value, saved.progressPercent);
    readingSaveFeedback.value = saved.completed ? '阅读超过 80%，已自动标记为看完' : `阅读进度已保存到 ${saved.progressPercent}%`;
    decorateMaterialReadingStatuses();
  } catch {
    readingSaveFeedback.value = '阅读进度暂时没有保存，继续阅读时会重试';
  }
}

function materialReadingFromHref(href: string): MaterialReading | null {
  const match = href.match(/^\/knowledge\/materials\/([^/]+)\/([^/#?]+)/u);
  if (!match?.[1] || !match[2]) return null;
  try {
    const guide = decodeURIComponent(match[1]);
    const anchor = decodeURIComponent(match[2]).toLocaleLowerCase('en-US');
    return materialReadingByKey.value[`${guide}#${anchor}`] ?? {
      guide,
      anchor,
      progressPercent: 0,
      completed: false,
      completedAt: null,
      updatedAt: null,
    };
  } catch {
    return null;
  }
}

function decorateMaterialReadingStatuses() {
  if (!tracksReadingProgress.value) return;
  const markdownRoot = readerRoot.value?.querySelector<HTMLElement>('.markdown-body');
  if (!markdownRoot) return;
  for (const link of markdownRoot.querySelectorAll<HTMLAnchorElement>('a[href^="/knowledge/materials/"]')) {
    const reading = materialReadingFromHref(link.getAttribute('href') ?? '');
    if (!reading) continue;
    link.querySelector('.material-reading-badge')?.remove();
    const badge = document.createElement('span');
    badge.className = 'material-reading-badge';
    badge.dataset.state = reading.completed ? 'completed' : reading.progressPercent > 0 ? 'reading' : 'unread';
    badge.textContent = reading.completed ? '已看完' : reading.progressPercent > 0 ? `${reading.progressPercent}%` : '未读';
    link.append(badge);
  }
}

function observeHeadings() {
  headingObserver?.disconnect();
  headingObserver = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (visible[0]?.target.id) activeHeading.value = visible[0].target.id;
  }, { rootMargin: '-96px 0px -68% 0px', threshold: [0, 1] });
  for (const heading of headings.value) {
    const element = readerRoot.value?.querySelector<HTMLElement>(`#${CSS.escape(heading.id)}`);
    if (element) headingObserver.observe(element);
  }
  const targetId = decodeURIComponent(route.hash.replace(/^#/, ''));
  if (targetId) window.setTimeout(() => scrollToHeading(targetId), 0);
  updateReadingProgress();
}

function normalizePronunciationTerm(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
}

function loadPronunciationManifest(batch: string) {
  const pending = pronunciationManifestPromises.get(batch) ?? fetch(`/pronunciation/${batch}/manifest.json`)
    .then(async (response) => {
      if (!response.ok) throw new Error(`发音资源加载失败（${response.status}）`);
      return response.json() as Promise<PronunciationManifest>;
    });
  pronunciationManifestPromises.set(batch, pending);
  return pending;
}

function createPronunciationButton(term: string, file: string, batch: string) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'pronunciation-button';
  button.dataset.pronunciationTerm = term;
  button.dataset.pronunciationSrc = `/pronunciation/${batch}/${file}`;
  button.setAttribute('aria-label', `播放“${term}”的美式发音`);
  button.title = `播放“${term}”的美式发音`;
  const icon = document.createElement('span');
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '🔊';
  button.append(icon);
  return button;
}

function extractKeyPronunciationTerms(value: string) {
  const parenthetical = Array.from(value.matchAll(/[（(]([A-Za-z][A-Za-z0-9.' -]*)[）)]/g), (match) => match[1]?.trim() ?? '')
    .filter(Boolean);
  if (parenthetical.length) return parenthetical;
  const normalized = value.trim().replace(/\s+/g, ' ');
  return /^[A-Za-z][A-Za-z0-9.' -]*$/.test(normalized) ? [normalized] : [];
}

async function decoratePronunciations(guide: string, batch: string) {
  const manifest = await loadPronunciationManifest(batch);
  if (material.value?.guide !== guide || pronunciationBatch.value !== batch) return;
  const markdownRoot = readerRoot.value?.querySelector<HTMLElement>('.markdown-body');
  if (!markdownRoot || markdownRoot.dataset.pronunciations === 'ready') return;

  for (const strong of markdownRoot.querySelectorAll<HTMLElement>('strong')) {
    const strongText = strong.textContent?.trim().replace(/\s+/g, ' ') ?? '';
    const terms = extractKeyPronunciationTerms(strongText);
    for (const term of terms) {
      const entry = manifest.terms[normalizePronunciationTerm(term)];
      if (!entry) continue;
      if (normalizePronunciationTerm(strongText) === normalizePronunciationTerm(term)) {
        strong.after(createPronunciationButton(term, entry.file, batch));
        continue;
      }
      const walker = document.createTreeWalker(strong, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const textNode = walker.currentNode as Text;
        const value = textNode.nodeValue ?? '';
        const index = value.indexOf(term);
        if (index < 0) continue;
        const fragment = document.createDocumentFragment();
        fragment.append(document.createTextNode(value.slice(0, index + term.length)));
        fragment.append(createPronunciationButton(term, entry.file, batch));
        fragment.append(document.createTextNode(value.slice(index + term.length)));
        textNode.replaceWith(fragment);
        break;
      }
    }
  }
  markdownRoot.dataset.pronunciations = 'ready';
}

function resetPronunciationButton() {
  activePronunciationButton?.classList.remove('is-playing', 'has-error');
  activePronunciationButton = null;
}

async function playPronunciation(button: HTMLButtonElement) {
  pronunciationAudio?.pause();
  resetPronunciationButton();
  const term = button.dataset.pronunciationTerm ?? '';
  const source = button.dataset.pronunciationSrc;
  if (!term || !source) return;
  const audio = new Audio(source);
  pronunciationAudio = audio;
  activePronunciationButton = button;
  button.classList.add('is-playing');
  pronunciationFeedback.value = `正在播放“${term}”的美式发音`;
  const finish = () => {
    if (pronunciationAudio === audio) pronunciationAudio = null;
    if (activePronunciationButton === button) resetPronunciationButton();
  };
  audio.addEventListener('ended', finish, { once: true });
  audio.addEventListener('error', () => {
    button.classList.add('has-error');
    pronunciationFeedback.value = `暂时无法播放“${term}”`;
    window.setTimeout(finish, 1200);
  }, { once: true });
  try {
    await audio.play();
  } catch {
    button.classList.add('has-error');
    pronunciationFeedback.value = `暂时无法播放“${term}”`;
    window.setTimeout(finish, 1200);
  }
}

function handleReaderClick(event: MouseEvent) {
  const target = event.target instanceof Element ? event.target : null;
  const button = target?.closest<HTMLButtonElement>('.pronunciation-button');
  if (!button || !readerRoot.value?.contains(button)) return;
  event.preventDefault();
  event.stopPropagation();
  void playPronunciation(button);
}

function handleRendered() {
  const guide = material.value?.guide ?? '';
  const batch = pronunciationBatch.value;
  void nextTick(async () => {
    observeHeadings();
    decorateMaterialReadingStatuses();
    updateReadingProgress();
    if (hasPronunciations.value) {
      try {
        await decoratePronunciations(guide, batch);
      } catch (reason) {
        pronunciationFeedback.value = reason instanceof Error ? reason.message : '发音资源加载失败';
      }
    }
  });
}

function scrollToHeading(id: string) {
  const element = readerRoot.value?.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
  if (!element) return;
  activeHeading.value = id;
  tocOpen.value = false;
  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  window.history.replaceState(window.history.state, '', `${route.path}#${encodeURIComponent(id)}`);
}

async function copyPageLink() {
  let didCopy = false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(window.location.href);
      didCopy = true;
    }
  } catch { /* 使用兼容路径 */ }
  if (!didCopy) {
    const textarea = document.createElement('textarea');
    textarea.value = window.location.href;
    textarea.style.cssText = 'position:fixed;left:-9999px;opacity:0';
    document.body.append(textarea);
    textarea.select();
    didCopy = document.execCommand('copy');
    textarea.remove();
  }
  copied.value = didCopy;
  window.setTimeout(() => { copied.value = false; }, 1400);
}

function openBeginnerGuide() {
  void router.push('/knowledge/materials/beginner-prerequisites-and-glossary.md/primer-00');
}

onMounted(() => {
  void load();
  window.addEventListener('scroll', updateReadingProgress, { passive: true });
  window.addEventListener('resize', updateReadingProgress);
});
watch(() => [route.params.guide, route.params.anchor], load);
onBeforeUnmount(() => {
  void flushReadingProgressSave();
  headingObserver?.disconnect();
  pronunciationAudio?.pause();
  window.removeEventListener('scroll', updateReadingProgress);
  window.removeEventListener('resize', updateReadingProgress);
});
</script>

<template>
  <main class="material-page" :class="{ 'without-toc': Boolean(material) && headings.length === 0 }">
    <div class="reading-progress" aria-hidden="true"><i :style="{ width: `${readingProgress}%` }"></i></div>
    <nav class="page-actions" aria-label="讲义操作">
      <button class="back-link" type="button" @click="router.back()">← 返回知识点</button>
      <div>
        <button v-if="!isBeginnerGuide && !usesLinkedPrerequisites" type="button" @click="openBeginnerGuide">初学者术语讲义</button>
        <button type="button" @click="copyPageLink">{{ copied ? '链接已复制' : '复制本页链接' }}</button>
      </div>
    </nav>

    <div v-if="loading" class="state-panel">正在装载中文学习资料…</div>
    <div v-else-if="error" class="state-panel error" role="alert">{{ error }}</div>

    <template v-else-if="material">
      <header class="material-hero">
        <div>
          <p>站内中文讲义 <span>·</span> {{ material.anchor.toUpperCase() }}</p>
          <h1>{{ material.title }}</h1>
          <span>{{ materialDescription }}</span>
        </div>
        <dl>
          <div><dt>预计阅读</dt><dd>{{ readingMinutes }} 分钟</dd></div>
          <div><dt>正文规模</dt><dd>{{ characterCount.toLocaleString('zh-CN') }} 字</dd></div>
          <div><dt>内容定位</dt><dd>{{ materialKind }}</dd></div>
          <div v-if="tracksReadingProgress" class="reading-state" :data-state="currentReading.completed ? 'completed' : currentReading.progressPercent > 0 ? 'reading' : 'unread'"><dt>阅读状态</dt><dd>{{ readingStateLabel }}</dd></div>
        </dl>
      </header>

      <button v-if="headings.length" class="mobile-toc-trigger" type="button" @click="tocOpen = !tocOpen">
        {{ tocOpen ? '收起目录' : '打开本页目录' }}
      </button>

      <div class="reading-layout" :class="{ 'toc-open': tocOpen, 'has-toc': headings.length > 0 }">
        <aside v-if="headings.length" class="toc-rail" aria-label="本页目录">
          <small>本页目录</small>
          <nav>
            <button
              v-for="heading in headings"
              :key="heading.id"
              type="button"
              :class="[`level-${heading.level}`, { active: activeHeading === heading.id }]"
              @click="scrollToHeading(heading.id)"
            >{{ heading.title }}</button>
          </nav>
        </aside>

        <article ref="readerRoot" class="material-sheet" @click="handleReaderClick">
          <div class="sheet-note">
            <strong>{{ isBeginnerGuide ? '这是一份阅读辅助' : isAtomicPrerequisite ? '只补当前需要的一个台阶' : '先理解，再复现' }}</strong>
            <span>{{ isBeginnerGuide ? '用于补齐陌生术语和隐含前置知识，不单独作为考核题源。' : isAtomicPrerequisite ? '读懂定义和最小示例后，沿文末链接回到原知识点；不需要继续阅读无关术语。' : '建议先读机制与边界，再运行示例，并保留日志、截图或测试结果作为学习证据。' }}</span>
          </div>
          <MarkdownRenderer class="reader-content" :source="material.markdown" @rendered="handleRendered" />
          <footer>
            <span>{{ currentReading.completed ? '本资料已自动标记为看完' : '正文阅读超过 80% 后会自动标记为看完' }}</span>
            <button type="button" @click="router.back()">带着理解返回知识点 →</button>
          </footer>
          <span class="pronunciation-feedback" aria-live="polite">{{ pronunciationFeedback }}</span>
          <span class="reading-save-feedback" aria-live="polite">{{ readingSaveFeedback }}</span>
        </article>

        <aside class="support-rail">
          <section>
            <small>阅读方法</small>
            <ol>
              <li>先用自己的话解释“是什么”。</li>
              <li>运行或推演讲义中的最小示例。</li>
              <li>主动触发一个失败或反例。</li>
              <li>保存可复核的验证证据。</li>
            </ol>
          </section>
          <section v-if="!isBeginnerGuide && !usesLinkedPrerequisites" class="beginner-card">
            <small>遇到陌生词？</small>
            <strong>不要跳过隐含前置知识</strong>
            <p>术语讲义会同时保留中文译名与英文原名，并解释它在代码、练习和排错中的实际作用。</p>
            <button type="button" @click="openBeginnerGuide">打开初学者术语讲义 →</button>
          </section>
          <section>
            <small>考核边界</small>
            <p>阅读辅助不扩张知识点范围。挑战仍只依据知识点明确列出的资料、题目输入和交付物评分。</p>
          </section>
        </aside>
      </div>
    </template>
  </main>
</template>

<style scoped>
.material-page{--ink:#193028;--muted:#667970;--paper:#fffefa;--line:#dce5df;--accent:#176a55;--accent-warm:#c85d37;width:min(1460px,calc(100% - 36px));margin:0 auto;padding:20px 0 72px;color:var(--ink)}.material-page.without-toc{width:min(1280px,calc(100% - 36px))}
.reading-progress{position:fixed;top:0;left:0;z-index:80;width:100%;height:3px;background:rgba(23,106,85,.1)}.reading-progress i{display:block;height:100%;background:linear-gradient(90deg,var(--accent),#4e9a80,var(--accent-warm));transition:width .12s linear}
.page-actions{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}.page-actions>div{display:flex;gap:8px}.page-actions button{padding:8px 11px;color:#385b4f;font-weight:750;background:rgba(255,255,255,.72);border:1px solid #d6e1db;border-radius:9px;cursor:pointer}.page-actions button:hover{border-color:#91b2a6;background:#fff}.back-link{border-color:transparent!important;background:transparent!important}
.state-panel{padding:28px;border:1px solid #d7e0dc;border-radius:16px;background:#fff}.state-panel.error{color:#9b302b;background:#fff4f2}
.material-hero{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:30px;align-items:end;overflow:hidden;margin-bottom:18px;padding:34px 38px;border:1px solid #d6e3dc;border-radius:24px;background:linear-gradient(135deg,#f8fcfa 0%,#eef7f3 68%,#fff5ef 100%);box-shadow:0 18px 52px rgba(31,67,54,.08)}.material-hero::after{position:absolute;right:-70px;bottom:-100px;width:300px;height:300px;content:'';background:radial-gradient(circle,rgba(200,93,55,.12),transparent 68%);pointer-events:none}.material-hero>*{position:relative;z-index:1}.material-hero p{margin:0;color:#397664;font:800 .7rem ui-monospace;letter-spacing:.11em;text-transform:uppercase}.material-hero p span{color:#bd6a4c}.material-hero h1{max-width:920px;margin:9px 0 10px;font-size:clamp(1.85rem,3.7vw,3.4rem);line-height:1.12;letter-spacing:-.045em}.without-toc .material-hero h1{font-size:clamp(1.85rem,3vw,3rem)}.material-hero>div>span{display:block;max-width:760px;color:#60736b;line-height:1.7}.material-hero dl{display:grid;grid-template-columns:repeat(3,minmax(92px,1fr));gap:1px;margin:0;overflow:hidden;border:1px solid rgba(125,157,145,.25);border-radius:14px;background:rgba(125,157,145,.2)}.material-hero dl div{padding:13px 15px;background:rgba(255,255,255,.74)}.material-hero dt{color:#7a8983;font-size:.66rem}.material-hero dd{margin:5px 0 0;color:#274c40;font-size:.82rem;font-weight:800;white-space:nowrap}
.material-hero dl:has(.reading-state){grid-template-columns:repeat(4,minmax(92px,1fr))}.reading-state[data-state=completed] dd{color:#14704e}.reading-state[data-state=reading] dd{color:#8b5c1d}.reading-layout{display:grid;grid-template-columns:minmax(0,1fr) 230px;gap:18px;align-items:start}.reading-layout.has-toc{grid-template-columns:220px minmax(0,850px) 230px;justify-content:center}.toc-rail,.support-rail{position:sticky;top:24px;max-height:calc(100vh - 48px);overflow:auto}.toc-rail{padding:16px 0}.toc-rail>small,.support-rail small{display:block;margin-bottom:10px;color:#71827b;font:800 .66rem ui-monospace;letter-spacing:.1em;text-transform:uppercase}.toc-rail nav{display:grid;gap:3px;border-left:1px solid #d9e3de}.toc-rail button{width:100%;padding:7px 10px;color:#60726b;font-size:.75rem;line-height:1.4;text-align:left;background:transparent;border:0;border-left:2px solid transparent;cursor:pointer}.toc-rail button.level-4{padding-left:25px;font-size:.7rem}.toc-rail button:hover{color:#234f40}.toc-rail button.active{color:#0f664f;font-weight:800;background:linear-gradient(90deg,rgba(23,106,85,.09),transparent);border-left-color:#1d8064}
.material-sheet{min-width:0;overflow:hidden;border:1px solid #d6e0da;border-radius:22px;background:var(--paper);box-shadow:0 20px 60px rgba(27,54,43,.09)}.sheet-note{display:flex;gap:10px;align-items:baseline;padding:15px 30px;color:#526c61;font-size:.75rem;line-height:1.55;background:#f1f7f4;border-bottom:1px solid #dce7e1}.sheet-note strong{flex:0 0 auto;color:#1c604d}.reader-content{padding:34px 42px 46px}.reader-content :deep(.markdown-body){font-size:1.02rem;line-height:1.9}.reader-content :deep(.markdown-body>h2:first-child){display:none}.reader-content :deep(h2),.reader-content :deep(h3),.reader-content :deep(h4){scroll-margin-top:90px}.reader-content :deep(h2){margin-top:2.2em;padding-top:.25em;border-top:1px solid #e3e9e5}.reader-content :deep(h3){position:relative;padding-left:.75rem}.reader-content :deep(h3)::before{position:absolute;top:.35em;bottom:.22em;left:0;width:3px;content:'';background:linear-gradient(#2c8068,#d27a59);border-radius:3px}.material-sheet>footer{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px 30px;color:#6b7c75;font-size:.76rem;background:#f7faf8;border-top:1px solid #e0e7e3}.material-sheet>footer button{padding:9px 12px;color:#fff;font-weight:800;background:#245f4e;border:0;border-radius:9px;cursor:pointer}
.reader-content :deep(.pronunciation-button){display:inline-grid;width:1.35rem;height:1.35rem;margin:0 .12rem;padding:0;place-items:center;vertical-align:.12rem;color:#8a4c38;background:linear-gradient(145deg,#fff8f1,#eef8f4);border:1px solid #d7e4dd;border-radius:999px;box-shadow:0 2px 7px rgba(44,86,70,.12);cursor:pointer;transition:transform .15s ease,box-shadow .15s ease,background .15s ease}.reader-content :deep(.pronunciation-button span){font-size:.68rem;line-height:1}.reader-content :deep(.pronunciation-button:hover){background:linear-gradient(145deg,#fff0e5,#e4f5ed);box-shadow:0 3px 10px rgba(44,86,70,.2);transform:translateY(-1px) scale(1.06)}.reader-content :deep(.pronunciation-button:focus-visible){outline:2px solid #2c8068;outline-offset:2px}.reader-content :deep(.pronunciation-button.is-playing){background:#dff3e9;border-color:#62a58d;animation:pronunciation-pulse .62s ease-in-out infinite alternate}.reader-content :deep(.pronunciation-button.has-error){background:#fff0ed;border-color:#d98b78}.reader-content :deep(.material-reading-badge){display:inline-block;margin-left:.38rem;padding:.08rem .38rem;color:#66766f;font-size:.6rem;font-weight:800;line-height:1.5;text-decoration:none;background:#f0f3f1;border:1px solid #dce4df;border-radius:999px;vertical-align:.08rem}.reader-content :deep(.material-reading-badge[data-state=reading]){color:#815a1e;background:#fff7dd;border-color:#eadba7}.reader-content :deep(.material-reading-badge[data-state=completed]){color:#176448;background:#e7f6ee;border-color:#bddfce}.pronunciation-feedback,.reading-save-feedback{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.support-rail{display:grid;gap:12px}.support-rail section{padding:15px;border:1px solid #dbe4df;border-radius:15px;background:rgba(255,255,255,.76)}.support-rail ol{margin:0;padding-left:1.2rem;color:#52665d;font-size:.76rem;line-height:1.7}.support-rail li+li{margin-top:6px}.support-rail p{margin:7px 0 0;color:#64766f;font-size:.75rem;line-height:1.65}.beginner-card{background:linear-gradient(145deg,#f2f8f5,#fff7f2)!important;border-color:#cfded7!important}.beginner-card strong{display:block;color:#254d40;font-size:.86rem}.beginner-card button{margin-top:12px;padding:0;color:#a94e31;font-weight:800;background:transparent;border:0;cursor:pointer}.mobile-toc-trigger{display:none}
@media(max-width:1180px){.reading-layout{grid-template-columns:minmax(0,1fr)}.reading-layout.has-toc{grid-template-columns:190px minmax(0,1fr)}.support-rail{position:static;grid-column:1;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));max-height:none}.reading-layout.has-toc .support-rail{grid-column:2}.material-hero{grid-template-columns:1fr}.material-hero dl{width:max-content}}
@media(max-width:800px){.material-page{width:min(100% - 22px,1460px);padding-top:12px}.page-actions{display:grid;grid-template-columns:1fr;align-items:start;gap:8px}.page-actions>div{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.page-actions button{width:100%;white-space:nowrap}.page-actions .back-link{width:max-content;padding-left:0}.material-hero{padding:25px 22px;border-radius:19px}.material-hero dl{width:100%;grid-template-columns:1fr}.reading-layout{display:block}.mobile-toc-trigger{display:block;width:100%;margin:0 0 10px;padding:11px;color:#315c4d;font-weight:800;background:#f3f8f5;border:1px solid #d7e2dc;border-radius:11px}.toc-rail{display:none;position:static;max-height:none;margin-bottom:10px;padding:10px 0;background:#fff;border:1px solid #dce5e0;border-radius:12px}.toc-open .toc-rail{display:block}.toc-rail>small{padding:0 12px}.support-rail{display:grid;grid-template-columns:1fr;margin-top:12px}.reader-content{padding:26px 21px 34px}.sheet-note{display:grid;padding:14px 20px}.material-sheet>footer{align-items:flex-start;flex-direction:column;padding:18px 20px}}
@keyframes pronunciation-pulse{to{box-shadow:0 0 0 4px rgba(44,128,104,.15);transform:scale(1.08)}}
@media(prefers-reduced-motion:reduce){.reading-progress i,.reader-content :deep(.pronunciation-button){transition:none;animation:none}}
</style>
