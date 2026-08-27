<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { apiClient, type AssistantGapCandidate, type AssistantRequest, type AssistantSource } from '@/api/client';

const MarkdownRenderer = defineAsyncComponent(() => import('@/components/MarkdownRenderer.vue'));

type AssistantTurn = {
  id: string;
  prompt: string;
  content: string;
  thinking: string;
  sources: AssistantSource[];
  searchQuery: string;
  warning: string;
  gap: AssistantGapCandidate | null;
  status: string;
  streaming: boolean;
  error: string;
  pageCharacterCount: number;
};

const route = useRoute();
const panelOpen = ref(false);
const question = ref('');
const selectedText = ref('');
const selectionPosition = ref({ left: 24, top: 120 });
const turns = ref<AssistantTurn[]>([]);
const conversation = ref<HTMLElement | null>(null);
const composer = ref<HTMLTextAreaElement | null>(null);
const contextSnapshot = ref(capturePage());
let controller: AbortController | null = null;
let selectionTimer: number | undefined;

const activeTurn = computed(() => turns.value.findLast((turn) => turn.streaming));
const busy = computed(() => Boolean(activeTurn.value));
const pageCountLabel = computed(() => `${contextSnapshot.value.content.length.toLocaleString('zh-CN')} 字`);

function capturePage(): AssistantRequest['page'] {
  const root = document.querySelector<HTMLElement>('#main-content');
  return {
    route: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    title: document.title.replace(/\s+-\s+Career Atlas$/u, '') || 'Career Atlas',
    content: root?.innerText.trim() || '当前页面暂时没有可读取的正文。',
    capturedAt: new Date().toISOString(),
  };
}

function refreshContext() {
  contextSnapshot.value = capturePage();
}

function openPanel(focusComposer = false) {
  refreshContext();
  panelOpen.value = true;
  if (focusComposer) void nextTick(() => composer.value?.focus());
}

function closePanel() {
  panelOpen.value = false;
}

function updateSelection() {
  const selection = window.getSelection();
  const value = selection?.toString().trim() ?? '';
  if (!selection || !value || selection.rangeCount === 0) {
    selectedText.value = '';
    return;
  }
  const range = selection.getRangeAt(0);
  const common = range.commonAncestorContainer instanceof Element
    ? range.commonAncestorContainer
    : range.commonAncestorContainer.parentElement;
  if (!common?.closest('#main-content')) {
    selectedText.value = '';
    return;
  }
  selectedText.value = value;
  const rect = range.getBoundingClientRect();
  selectionPosition.value = {
    left: Math.max(16, Math.min(window.innerWidth - 156, rect.left + rect.width / 2 - 70)),
    top: Math.max(16, Math.min(window.innerHeight - 70, rect.bottom + 10)),
  };
}

function onSelectionChange() {
  if (selectionTimer !== undefined) window.clearTimeout(selectionTimer);
  selectionTimer = window.setTimeout(updateSelection, 80);
}

function onKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLocaleLowerCase() === 'a') {
    event.preventDefault();
    panelOpen.value ? closePanel() : openPanel(true);
  } else if (event.key === 'Escape' && panelOpen.value) closePanel();
}

async function run(mode: 'EXPLAIN' | 'SUMMARY' | 'ASK') {
  if (busy.value) return;
  refreshContext();
  const page = contextSnapshot.value;
  const prompt = mode === 'SUMMARY'
    ? '总结当前页面'
    : mode === 'EXPLAIN'
      ? `解释选中内容：${selectedText.value}`
      : question.value.trim();
  if (mode === 'EXPLAIN' && !selectedText.value) {
    openPanel();
    question.value = '请先在页面正文中选中需要解释的内容。';
    return;
  }
  if (mode === 'ASK' && !prompt) return;
  if (mode === 'EXPLAIN' && selectedText.value.length > 40_000) {
    openPanel();
    turns.value.push(makeErrorTurn(prompt, '本次选中内容超过 4 万字。为了避免只解释其中一部分，助手没有静默截断，请缩小选择范围后重试。'));
    return;
  }
  if (page.content.length > 80_000) {
    openPanel();
    turns.value.push(makeErrorTurn(prompt, '当前页面超过 8 万字。为了保证“完整语境”而不是静默截断，助手没有发送这次请求。'));
    return;
  }
  openPanel();
  const turn: AssistantTurn = {
    id: crypto.randomUUID(),
    prompt,
    content: '',
    thinking: '',
    sources: [],
    searchQuery: '',
    warning: '',
    gap: null,
    status: '正在准备完整页面语境',
    streaming: true,
    error: '',
    pageCharacterCount: page.content.length,
  };
  turns.value.push(turn);
  if (mode === 'ASK') question.value = '';
  controller = new AbortController();
  await scrollToLatest();
  try {
    await apiClient.streamAssistant({
      mode,
      ...(mode === 'ASK' ? { question: prompt } : {}),
      ...(mode === 'EXPLAIN' ? { selectedText: selectedText.value } : {}),
      page,
    }, {
      onProgress: (message) => { turn.status = message; },
      onSources: (sources, searchQuery, warning) => {
        turn.sources = sources;
        turn.searchQuery = searchQuery;
        turn.warning = warning;
      },
      onThinking: (delta) => { turn.thinking += delta; void scrollToLatest(); },
      onDelta: (delta) => { turn.content += delta; void scrollToLatest(); },
      onGap: (candidate) => { turn.gap = candidate; },
      onDone: (metadata) => {
        turn.pageCharacterCount = metadata.pageCharacterCount;
        turn.status = '回答完成';
      },
    }, controller.signal);
  } catch (reason) {
    if (controller.signal.aborted) turn.status = '已停止生成';
    else turn.error = reason instanceof Error ? reason.message : '助手暂时无法完成回答';
  } finally {
    turn.streaming = false;
    controller = null;
    await scrollToLatest();
  }
}

function makeErrorTurn(prompt: string, error: string): AssistantTurn {
  return { id: crypto.randomUUID(), prompt, content: '', thinking: '', sources: [], searchQuery: '', warning: '', gap: null, status: '', streaming: false, error, pageCharacterCount: contextSnapshot.value.content.length };
}

function stop() {
  controller?.abort();
}

function clearConversation() {
  if (busy.value) return;
  turns.value = [];
}

async function scrollToLatest() {
  await nextTick();
  const root = conversation.value;
  if (root) root.scrollTop = root.scrollHeight;
}

function sendFromComposer() {
  if (!question.value.trim() || busy.value) return;
  void run('ASK');
}

function onComposerKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendFromComposer();
  }
}

function isExternal(source: AssistantSource) {
  return source.kind === 'WEB';
}

watch(() => route.fullPath, async () => {
  selectedText.value = '';
  await nextTick();
  refreshContext();
});

onMounted(() => {
  document.addEventListener('selectionchange', onSelectionChange);
  window.addEventListener('keydown', onKeydown);
  refreshContext();
});
onBeforeUnmount(() => {
  document.removeEventListener('selectionchange', onSelectionChange);
  window.removeEventListener('keydown', onKeydown);
  if (selectionTimer !== undefined) window.clearTimeout(selectionTimer);
  controller?.abort();
});
</script>

<template>
  <Transition name="selection-tool">
    <button
      v-if="selectedText && !panelOpen"
      class="selection-explain"
      :style="{ left: `${selectionPosition.left}px`, top: `${selectionPosition.top}px` }"
      @mousedown.prevent
      @click="run('EXPLAIN')"
    >
      <span aria-hidden="true">✦</span> 解释这段
    </button>
  </Transition>

  <button class="assistant-launcher" :class="{ 'is-open': panelOpen }" :aria-expanded="panelOpen" aria-controls="atlas-ai-panel" @click="panelOpen ? closePanel() : openPanel(true)">
    <span class="launcher-orbit" aria-hidden="true"><i></i><b>✦</b></span>
    <span><strong>Atlas AI</strong><small>全文语境助手</small></span>
    <kbd>Ctrl ⇧ A</kbd>
  </button>

  <Transition name="assistant-panel">
    <aside v-if="panelOpen" id="atlas-ai-panel" class="assistant-panel" aria-label="Atlas AI 学习助手">
      <header class="assistant-header">
        <div class="assistant-identity">
          <span class="assistant-symbol" aria-hidden="true">✦</span>
          <div><p>CAREER ATLAS INTELLIGENCE</p><h2>Atlas AI</h2></div>
        </div>
        <div class="assistant-header-actions">
          <button :disabled="busy || !turns.length" title="清空当前对话" aria-label="清空当前对话" @click="clearConversation">↺</button>
          <button title="关闭助手" aria-label="关闭助手" @click="closePanel">×</button>
        </div>
        <div class="capability-strip" aria-label="助手能力">
          <span><i></i>完整页面语境</span><span><i></i>站内知识检索</span><span><i></i>联网补充</span>
        </div>
      </header>

      <section class="context-card">
        <div><span>当前上下文</span><strong>{{ contextSnapshot.title }}</strong></div>
        <b>{{ pageCountLabel }} · 完整发送</b>
      </section>

      <div ref="conversation" class="assistant-conversation" aria-live="polite">
        <section v-if="!turns.length" class="assistant-welcome">
          <span class="welcome-constellation" aria-hidden="true">✦</span>
          <p class="eyebrow">CONTEXT-AWARE LEARNING</p>
          <h3>不只解释一句话，<br />而是理解它所在的整页内容。</h3>
          <p>选中文字可以获得带语境的解释，也可以总结全文或继续追问。回答会优先连接站内知识，再用网络资料补充核对。</p>
          <div class="quick-actions">
            <button @click="run('SUMMARY')"><span>01</span><strong>总结当前页面</strong><small>结构、术语与下一步</small></button>
            <button :disabled="!selectedText" @click="run('EXPLAIN')"><span>02</span><strong>解释选中内容</strong><small>{{ selectedText ? `${selectedText.length} 字已选中` : '先在页面中选择文本' }}</small></button>
          </div>
        </section>

        <article v-for="turn in turns" :key="turn.id" class="assistant-turn">
          <div class="user-intent"><span>你的请求</span><p>{{ turn.prompt }}</p></div>
          <div class="answer-card">
            <div class="answer-meta">
              <span class="ai-label"><i>✦</i> Atlas AI</span>
              <span>{{ turn.pageCharacterCount.toLocaleString('zh-CN') }} 字全文语境</span>
            </div>
            <div v-if="turn.streaming && !turn.content" class="assistant-working"><i></i><span>{{ turn.status }}</span></div>
            <MarkdownRenderer
              v-if="turn.content || turn.thinking"
              :source="turn.content"
              :thinking="turn.thinking"
              :streaming="turn.streaming"
              :thinking-open="true"
              aria-label="AI 助手回答"
            />
            <p v-if="turn.error" class="assistant-error">{{ turn.error }}</p>
            <p v-if="turn.warning" class="assistant-warning">{{ turn.warning }}</p>
            <div v-if="turn.sources.length" class="assistant-sources">
              <div class="source-heading"><strong>进一步学习</strong><span>{{ turn.sources.filter(source => source.kind === 'SITE').length }} 站内 · {{ turn.sources.filter(source => source.kind === 'WEB').length }} 网络</span></div>
              <a
                v-for="source in turn.sources"
                :key="`${turn.id}-${source.id}`"
                :href="source.url"
                :target="isExternal(source) ? '_blank' : undefined"
                :rel="isExternal(source) ? 'noopener noreferrer' : undefined"
                class="source-link"
              >
                <span :class="`source-kind source-${source.kind.toLocaleLowerCase()}`">{{ source.kind === 'SITE' ? '站内' : '网络' }}</span>
                <span><strong>{{ source.title }}</strong><small>{{ source.excerpt }}</small></span>
                <b aria-hidden="true">↗</b>
              </a>
            </div>
            <RouterLink v-if="turn.gap" to="/settings#assistant-gaps" class="gap-notice" @click="closePanel">
              <span aria-hidden="true">＋</span><span><strong>已加入后续学习资料补充目录</strong><small>{{ turn.gap.title }} · 等待开发者完整审阅</small></span><b>查看</b>
            </RouterLink>
          </div>
        </article>
      </div>

      <footer class="assistant-composer">
        <div class="composer-box" :class="{ 'is-busy': busy }">
          <textarea ref="composer" v-model="question" rows="2" maxlength="4000" placeholder="结合当前页面继续提问…" :disabled="busy" @keydown="onComposerKeydown"></textarea>
          <button v-if="busy" class="stop-button" aria-label="停止生成" @click="stop"><i></i></button>
          <button v-else class="send-button" :disabled="!question.trim()" aria-label="发送问题" @click="sendFromComposer">↑</button>
        </div>
        <p><span aria-hidden="true">◈</span> 当前页正文完整发送给已配置的 AI；联网检索只使用脱敏后的短技术查询。</p>
      </footer>
    </aside>
  </Transition>
</template>

<style scoped>
.assistant-launcher{position:fixed;right:24px;bottom:22px;z-index:1600;display:grid;grid-template-columns:38px auto auto;gap:10px;align-items:center;min-width:224px;height:58px;padding:7px 10px 7px 8px;color:#f5f9ff;text-align:left;background:linear-gradient(125deg,#142a48 0%,#1c3c64 58%,#185848 140%);border:1px solid rgba(159,192,229,.24);border-radius:18px;box-shadow:0 18px 50px rgba(13,31,55,.3),inset 0 1px 0 rgba(255,255,255,.08);cursor:pointer}.assistant-launcher:hover{transform:translateY(-2px);box-shadow:0 23px 60px rgba(13,31,55,.36),inset 0 1px 0 rgba(255,255,255,.1)}.assistant-launcher.is-open{opacity:0;pointer-events:none;transform:translateY(10px)}.launcher-orbit{position:relative;display:grid;place-items:center;width:38px;height:38px;background:radial-gradient(circle at 36% 28%,#89c6ff,#3a72cc 45%,#1f477d 70%);border-radius:13px;box-shadow:0 7px 20px rgba(60,127,216,.34)}.launcher-orbit i{position:absolute;inset:5px;border:1px solid rgba(255,255,255,.42);border-radius:50%;transform:rotate(28deg) scaleY(.5)}.launcher-orbit b{position:relative;font-size:.9rem}.assistant-launcher>span:nth-child(2){display:flex;min-width:0;flex-direction:column}.assistant-launcher strong{font:700 .78rem var(--font-display);letter-spacing:.01em}.assistant-launcher small{color:#9db4ce;font-size:.6rem}.assistant-launcher kbd{padding:2px 5px;color:#87a1be;font:600 .5rem var(--font-mono);background:rgba(5,18,34,.28);border:1px solid rgba(255,255,255,.1);border-radius:6px}.selection-explain{position:fixed;z-index:1700;display:flex;gap:7px;align-items:center;height:38px;padding:0 13px;color:#fff;font-weight:700;background:#183557;border:1px solid rgba(255,255,255,.18);border-radius:11px;box-shadow:0 12px 34px rgba(12,31,55,.28);cursor:pointer}.selection-explain span{color:#85cbb3}.assistant-panel{position:fixed;z-index:1800;top:14px;right:14px;bottom:14px;display:grid;grid-template-rows:auto auto minmax(0,1fr) auto;width:min(500px,calc(100vw - 28px));overflow:hidden;color:#1c2939;background:rgba(249,251,254,.965);border:1px solid rgba(204,215,229,.88);border-radius:26px;box-shadow:0 34px 100px rgba(12,30,52,.3),0 0 0 1px rgba(255,255,255,.7) inset;backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px)}.assistant-header{position:relative;display:grid;grid-template-columns:1fr auto;gap:12px;padding:18px 19px 13px;color:#f3f8ff;background:radial-gradient(circle at 92% -10%,rgba(61,175,135,.38),transparent 42%),linear-gradient(125deg,#10243d,#173a5d 70%,#155044);overflow:hidden}.assistant-header::after{position:absolute;right:-42px;bottom:-68px;width:180px;height:180px;content:'';border:1px solid rgba(255,255,255,.08);border-radius:50%;box-shadow:0 0 0 26px rgba(255,255,255,.025),0 0 0 52px rgba(255,255,255,.018)}.assistant-identity{position:relative;z-index:1;display:flex;gap:10px;align-items:center}.assistant-symbol{display:grid;place-items:center;width:38px;height:38px;color:#dffbef;background:linear-gradient(145deg,rgba(72,169,138,.72),rgba(62,112,177,.72));border:1px solid rgba(255,255,255,.18);border-radius:13px;box-shadow:0 8px 24px rgba(8,25,43,.26)}.assistant-identity p{margin:0;color:#8da7c4;font:700 .48rem var(--font-mono);letter-spacing:.16em}.assistant-identity h2{margin:1px 0 0;font:720 1.08rem var(--font-display);letter-spacing:-.02em}.assistant-header-actions{position:relative;z-index:2;display:flex;gap:6px}.assistant-header-actions button{display:grid;place-items:center;width:34px;height:34px;padding:0;color:#b8c9db;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.09);border-radius:10px;cursor:pointer}.assistant-header-actions button:hover{color:#fff;background:rgba(255,255,255,.11)}.assistant-header-actions button:last-child{font-size:1.3rem}.assistant-header-actions button:disabled{opacity:.35}.capability-strip{position:relative;z-index:1;grid-column:1/-1;display:flex;gap:12px;padding-top:8px;color:#9fb3c9;font-size:.58rem}.capability-strip span{display:flex;gap:5px;align-items:center}.capability-strip i{width:4px;height:4px;background:#62b597;border-radius:50%;box-shadow:0 0 0 3px rgba(98,181,151,.1)}.context-card{display:flex;justify-content:space-between;gap:12px;align-items:center;margin:11px 13px 0;padding:10px 12px;background:linear-gradient(135deg,#f1f5fb,#edf5f1);border:1px solid #dbe5e7;border-radius:13px}.context-card>div{display:flex;min-width:0;flex-direction:column}.context-card span{color:#8090a2;font-size:.57rem}.context-card strong{overflow:hidden;font-size:.72rem;text-overflow:ellipsis;white-space:nowrap}.context-card>b{flex:0 0 auto;padding:4px 7px;color:#326653;font:650 .55rem var(--font-mono);background:#dcece5;border-radius:7px}.assistant-conversation{min-height:0;padding:14px 13px 18px;overflow:auto;scrollbar-color:#c4d0dc transparent;scrollbar-width:thin}.assistant-welcome{display:flex;min-height:100%;padding:24px 12px 6px;flex-direction:column;align-items:flex-start}.welcome-constellation{display:grid;place-items:center;width:48px;height:48px;margin-bottom:18px;color:#fff;font-size:1.05rem;background:linear-gradient(145deg,#336cc5,#28816b);border-radius:16px;box-shadow:0 12px 34px rgba(49,105,161,.22)}.assistant-welcome .eyebrow{margin:0 0 7px;color:#5d7897;font:700 .55rem var(--font-mono);letter-spacing:.14em}.assistant-welcome h3{margin:0;color:#18283b;font:720 1.5rem/1.25 var(--font-display);letter-spacing:-.045em}.assistant-welcome>p:not(.eyebrow){max-width:390px;margin:13px 0 22px;color:#677689;font-size:.75rem;line-height:1.75}.quick-actions{display:grid;width:100%;gap:8px}.quick-actions button{display:grid;grid-template-columns:32px 1fr;gap:2px 10px;padding:12px;text-align:left;background:#fff;border:1px solid #e0e6ee;border-radius:13px;cursor:pointer}.quick-actions button:hover{border-color:#aec7ed;box-shadow:0 8px 24px rgba(26,60,103,.07)}.quick-actions button:disabled{opacity:.48;cursor:not-allowed}.quick-actions span{grid-row:1/3;display:grid;place-items:center;width:32px;height:32px;color:#3c669b;font:700 .6rem var(--font-mono);background:#edf3fa;border-radius:9px}.quick-actions strong{font-size:.72rem}.quick-actions small{color:#8a96a5;font-size:.6rem}.assistant-turn{display:grid;gap:10px;margin-bottom:18px}.user-intent{margin-left:40px;padding:10px 12px;color:#eaf2fb;background:linear-gradient(135deg,#2a496c,#28425f);border-radius:13px 13px 4px 13px}.user-intent span{display:block;margin-bottom:2px;color:#94abc2;font-size:.52rem}.user-intent p{display:-webkit-box;margin:0;overflow:hidden;font-size:.7rem;line-height:1.55;-webkit-box-orient:vertical;-webkit-line-clamp:4}.answer-card{padding:13px 13px 14px;background:rgba(255,255,255,.82);border:1px solid #e0e7ee;border-radius:4px 15px 15px;box-shadow:0 8px 24px rgba(25,46,72,.045)}.answer-meta{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;color:#8794a3;font-size:.55rem}.ai-label{display:flex;gap:5px;align-items:center;color:#2b6755;font-weight:750}.ai-label i{font-style:normal}.assistant-working{display:flex;gap:9px;align-items:center;padding:20px 5px;color:#607286;font-size:.7rem}.assistant-working i{width:16px;height:16px;border:2px solid #c9d7e6;border-top-color:#3572c6;border-radius:50%;animation:assistant-spin .8s linear infinite}.assistant-error,.assistant-warning{margin:10px 0 0;padding:9px 10px;font-size:.67rem;line-height:1.55;border-radius:9px}.assistant-error{color:#963c40;background:#fff0f0;border:1px solid #f0cccc}.assistant-warning{color:#76571f;background:#fff8e8;border:1px solid #eee0ba}.assistant-sources{display:grid;gap:7px;margin-top:14px;padding-top:12px;border-top:1px solid #e8edf2}.source-heading{display:flex;justify-content:space-between;align-items:center;margin-bottom:2px}.source-heading strong{font-size:.7rem}.source-heading span{color:#8b97a5;font-size:.55rem}.source-link{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px;align-items:start;padding:9px;color:inherit;text-decoration:none;background:#f7f9fc;border:1px solid #e5eaf0;border-radius:10px}.source-link:hover{background:#f1f6fc;border-color:#bfd1e8}.source-kind{margin-top:1px;padding:3px 5px;font:700 .5rem var(--font-mono);border-radius:5px}.source-site{color:#2b6653;background:#dfeee7}.source-web{color:#3b6091;background:#e3ebf7}.source-link>span:nth-child(2){display:flex;min-width:0;flex-direction:column}.source-link strong{overflow:hidden;font-size:.64rem;text-overflow:ellipsis;white-space:nowrap}.source-link small{display:-webkit-box;margin-top:2px;color:#7c8998;overflow:hidden;font-size:.57rem;line-height:1.45;-webkit-box-orient:vertical;-webkit-line-clamp:2}.source-link>b{color:#8b9aae;font-size:.66rem}.gap-notice{display:grid;grid-template-columns:30px 1fr auto;gap:9px;align-items:center;margin-top:10px;padding:10px;color:#285d4b;text-decoration:none;background:linear-gradient(135deg,#e8f5ef,#f2f8f5);border:1px solid #cde4d9;border-radius:11px}.gap-notice>span:first-child{display:grid;place-items:center;width:30px;height:30px;background:#d4eadf;border-radius:9px}.gap-notice>span:nth-child(2){display:flex;min-width:0;flex-direction:column}.gap-notice strong{font-size:.64rem}.gap-notice small{overflow:hidden;color:#668577;font-size:.55rem;text-overflow:ellipsis;white-space:nowrap}.gap-notice>b{font-size:.57rem}.assistant-composer{padding:10px 13px 13px;background:rgba(248,250,253,.94);border-top:1px solid #e1e7ee}.composer-box{display:grid;grid-template-columns:minmax(0,1fr) 38px;gap:7px;align-items:end;padding:7px 7px 7px 11px;background:#fff;border:1px solid #d5dee8;border-radius:14px;box-shadow:0 7px 22px rgba(22,45,73,.06)}.composer-box:focus-within{border-color:#8fb1df;box-shadow:0 0 0 3px rgba(58,111,190,.1)}.composer-box textarea{max-height:112px;padding:4px 0;resize:none;color:#233144;background:transparent;border:0;outline:0;font-size:.72rem;line-height:1.5}.send-button,.stop-button{display:grid;place-items:center;width:36px;height:36px;padding:0;color:#fff;background:linear-gradient(145deg,#326ac0,#23599f);border:0;border-radius:11px;cursor:pointer}.send-button{font-size:1.05rem}.send-button:disabled{opacity:.35}.stop-button{background:#253a52}.stop-button i{width:9px;height:9px;background:#fff;border-radius:2px}.assistant-composer>p{margin:7px 3px 0;color:#8b97a5;font-size:.54rem;line-height:1.45}.assistant-composer>p span{color:#3e806a}.answer-card :deep(.markdown-renderer){font-size:.71rem}.answer-card :deep(.markdown-body){line-height:1.72}.answer-card :deep(.thinking-panel){margin:0 0 10px}.assistant-panel-enter-active,.assistant-panel-leave-active{transition:opacity .2s ease,transform .24s cubic-bezier(.2,.78,.24,1)}.assistant-panel-enter-from,.assistant-panel-leave-to{opacity:0;transform:translateX(24px) scale(.985)}.selection-tool-enter-active,.selection-tool-leave-active{transition:opacity .14s ease,transform .14s ease}.selection-tool-enter-from,.selection-tool-leave-to{opacity:0;transform:translateY(-5px) scale(.96)}@keyframes assistant-spin{to{transform:rotate(360deg)}}
@media(max-width:700px){.assistant-launcher{right:12px;bottom:82px;grid-template-columns:38px auto;min-width:164px}.assistant-launcher kbd{display:none}.assistant-panel{top:0;right:0;bottom:0;width:100vw;border:0;border-radius:0}.assistant-header{padding-top:max(17px,env(safe-area-inset-top))}.capability-strip{gap:8px}.context-card{margin-top:9px}.assistant-composer{padding-bottom:max(12px,env(safe-area-inset-bottom))}.selection-explain{max-width:calc(100vw - 32px)}}
@media(prefers-reduced-motion:reduce){.assistant-working i{animation:none}}
</style>
