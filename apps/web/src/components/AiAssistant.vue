<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { AssistantStreamError, apiClient, type AssistantGapCandidate, type AssistantRequest, type AssistantSource } from '@/api/client';

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
  contextCharacterCount: number;
  webSearchUsed: boolean;
  mode: 'EXPLAIN' | 'SUMMARY' | 'ASK';
  route: string;
  selectedCharacterCount: number;
  incidentId: string;
  stage: string;
  elapsedMs: number;
  firstTokenMs?: number;
  siteSourceCount: number;
  webSourceCount: number;
  errorCode: string;
  stalled: boolean;
  reportCopied: boolean;
  historyContent: string;
};

type AssistantSession = {
  id: string;
  title: string;
  kind: 'EXPLAIN' | 'SUMMARY' | 'ASK';
  route: string;
  pageTitle: string;
  createdAt: string;
  updatedAt: string;
  turns: AssistantTurn[];
};

const SESSION_STORAGE_KEY = 'career-atlas:assistant-sessions:v1';
const WIDTH_STORAGE_KEY = 'career-atlas:assistant-width:v1';
const MAX_STORED_SESSIONS = 30;

const route = useRoute();
const router = useRouter();
const panelOpen = ref(false);
const historyOpen = ref(false);
const wideMode = ref(localStorage.getItem(WIDTH_STORAGE_KEY) === 'wide');
const question = ref('');
const selectedText = ref('');
const selectionPosition = ref({ left: 24, top: 120 });
const sessions = ref<AssistantSession[]>(restoreSessions());
const activeSessionId = ref(sessions.value[0]?.id ?? '');
const conversation = ref<HTMLElement | null>(null);
const composer = ref<HTMLTextAreaElement | null>(null);
const contextSnapshot = ref(capturePage());
let controller: AbortController | null = null;
let selectionTimer: number | undefined;
let contextRefreshTimer: number | undefined;
let pointerSelecting = false;
let suppressSelectionUntil = 0;
let persistSessionsTimer: number | undefined;

const activeSession = computed(() => sessions.value.find((session) => session.id === activeSessionId.value) ?? null);
const turns = computed(() => activeSession.value?.turns ?? []);
const historySessions = computed(() => [...sessions.value].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
const activeTurn = computed(() => turns.value.findLast((turn) => turn.streaming));
const busy = computed(() => Boolean(activeTurn.value));
const pageCountLabel = computed(() => `${contextSnapshot.value.content.length.toLocaleString('zh-CN')} 字`);

function capturePage(): AssistantRequest['page'] {
  const root = document.querySelector<HTMLElement>('#main-content');
  const pageHeading = root?.querySelector<HTMLElement>('h1')?.innerText.trim();
  return {
    route: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    title: pageHeading || document.title.replace(/\s+-\s+Career Atlas$/u, '') || 'Career Atlas',
    content: root?.innerText.trim() || '当前页面暂时没有可读取的正文。',
    capturedAt: new Date().toISOString(),
  };
}

function refreshContext() {
  contextSnapshot.value = capturePage();
}

function refreshContextAfterPageSettles() {
  refreshContext();
  if (contextRefreshTimer !== undefined) window.clearTimeout(contextRefreshTimer);
  contextRefreshTimer = window.setTimeout(refreshContext, 650);
}

async function waitForPageContext() {
  for (let attempt = 0; attempt < 6; attempt++) {
    refreshContext();
    const root = document.querySelector<HTMLElement>('#main-content');
    if (root?.querySelector('h1') && contextSnapshot.value.content.length >= 80) return;
    await new Promise((resolve) => window.setTimeout(resolve, 120));
  }
}

function openPanel(focusComposer = false) {
  refreshContextAfterPageSettles();
  panelOpen.value = true;
  if (focusComposer) void nextTick(() => composer.value?.focus());
}

function closePanel() {
  panelOpen.value = false;
}

function toggleWideMode() {
  wideMode.value = !wideMode.value;
  localStorage.setItem(WIDTH_STORAGE_KEY, wideMode.value ? 'wide' : 'standard');
  void nextTick(scrollToLatest);
}

function clearSelectionTimer() {
  if (selectionTimer !== undefined) window.clearTimeout(selectionTimer);
  selectionTimer = undefined;
}

function scheduleSelectionUpdate(delay: number) {
  clearSelectionTimer();
  selectionTimer = window.setTimeout(updateSelection, delay);
}

function updateSelection() {
  selectionTimer = undefined;
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
    left: Math.max(12, Math.min(window.innerWidth - 132, rect.left + rect.width / 2 - 58)),
    top: Math.max(12, Math.min(window.innerHeight - 54, rect.bottom + 8)),
  };
}

function onPointerDown(event: PointerEvent) {
  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest('#atlas-ai-panel, .assistant-launcher, .selection-explain')) {
    suppressSelectionUntil = Date.now() + 500;
    return;
  }
  clearSelectionTimer();
  if (event.button === 0 && target?.closest('#main-content')) {
    pointerSelecting = true;
    selectedText.value = '';
  } else {
    selectedText.value = '';
  }
}

function onPointerUp() {
  if (!pointerSelecting) return;
  pointerSelecting = false;
  scheduleSelectionUpdate(180);
}

function onPointerCancel() {
  pointerSelecting = false;
  clearSelectionTimer();
}

function onSelectionChange() {
  if (pointerSelecting || Date.now() < suppressSelectionUntil) return;
  // 键盘选择没有 pointerup，用较长静默期判断用户已经停止调整范围。
  scheduleSelectionUpdate(360);
}

function onKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLocaleLowerCase() === 'a') {
    event.preventDefault();
    panelOpen.value ? closePanel() : openPanel(true);
  } else if (event.key === 'Escape' && panelOpen.value) closePanel();
}

function restoreSessions(): AssistantSession[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) ?? '[]') as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_STORED_SESSIONS).flatMap((entry) => {
      const candidate = entry as Partial<AssistantSession>;
      if (!candidate || typeof candidate.id !== 'string' || typeof candidate.title !== 'string' || !Array.isArray(candidate.turns)) return [];
      const kind = candidate.kind === 'EXPLAIN' || candidate.kind === 'SUMMARY' || candidate.kind === 'ASK' ? candidate.kind : 'ASK';
      const turns = candidate.turns.flatMap((entryTurn) => {
        const turn = entryTurn as Partial<AssistantTurn>;
        if (!turn || typeof turn.id !== 'string' || typeof turn.prompt !== 'string') return [];
        return [{
          id: turn.id,
          prompt: turn.prompt,
          content: typeof turn.content === 'string' ? turn.content : '',
          thinking: typeof turn.thinking === 'string' ? turn.thinking : '',
          sources: Array.isArray(turn.sources) ? turn.sources : [],
          searchQuery: typeof turn.searchQuery === 'string' ? turn.searchQuery : '',
          warning: typeof turn.warning === 'string' ? turn.warning : '',
          gap: turn.gap ?? null,
          status: turn.streaming ? '上次生成已中断' : typeof turn.status === 'string' ? turn.status : '',
          streaming: false,
          error: typeof turn.error === 'string' ? turn.error : '',
          pageCharacterCount: Number(turn.pageCharacterCount) || 0,
          contextCharacterCount: Number(turn.contextCharacterCount) || 0,
          webSearchUsed: turn.webSearchUsed === true,
          mode: turn.mode === 'EXPLAIN' || turn.mode === 'SUMMARY' || turn.mode === 'ASK' ? turn.mode : 'ASK',
          route: typeof turn.route === 'string' ? turn.route : candidate.route ?? '/',
          selectedCharacterCount: Number(turn.selectedCharacterCount) || 0,
          incidentId: typeof turn.incidentId === 'string' ? turn.incidentId : '',
          stage: typeof turn.stage === 'string' ? turn.stage : 'RESTORED',
          elapsedMs: Number(turn.elapsedMs) || 0,
          ...(typeof turn.firstTokenMs === 'number' ? { firstTokenMs: turn.firstTokenMs } : {}),
          siteSourceCount: Number(turn.siteSourceCount) || 0,
          webSourceCount: Number(turn.webSourceCount) || 0,
          errorCode: typeof turn.errorCode === 'string' ? turn.errorCode : '',
          stalled: false,
          reportCopied: false,
          historyContent: typeof turn.historyContent === 'string' ? turn.historyContent : turn.prompt,
        } satisfies AssistantTurn];
      });
      return [{
        id: candidate.id,
        title: candidate.title,
        kind,
        route: typeof candidate.route === 'string' ? candidate.route : '/',
        pageTitle: typeof candidate.pageTitle === 'string' ? candidate.pageTitle : 'Career Atlas',
        createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString(),
        updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : new Date().toISOString(),
        turns,
      } satisfies AssistantSession];
    });
  } catch {
    return [];
  }
}

function writeSessionsSnapshot() {
  const snapshot = sessions.value.slice(0, MAX_STORED_SESSIONS).map((session) => ({
    ...session,
    turns: session.turns.slice(-20).map((turn) => ({
      ...turn,
      content: turn.content.slice(0, 24_000),
      thinking: turn.thinking.slice(0, 4_000),
      sources: turn.sources.slice(0, 8),
      reportCopied: false,
      stalled: false,
    })),
  }));
  try { localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(snapshot)); }
  catch { /* 本机存储空间不足时不影响当前回答。 */ }
}

function persistSessions(immediate = false) {
  if (persistSessionsTimer !== undefined) window.clearTimeout(persistSessionsTimer);
  persistSessionsTimer = undefined;
  if (immediate) {
    writeSessionsSnapshot();
    return;
  }
  persistSessionsTimer = window.setTimeout(() => {
    persistSessionsTimer = undefined;
    writeSessionsSnapshot();
  }, 500);
}

function sessionTitle(kind: AssistantSession['kind'], pageTitle: string, selected: string, prompt: string) {
  if (kind === 'SUMMARY') return `总结 · ${pageTitle}`;
  if (kind === 'EXPLAIN') return `解释 · ${selected.replace(/\s+/gu, ' ').trim().slice(0, 28) || pageTitle}`;
  return `提问 · ${prompt.replace(/\s+/gu, ' ').trim().slice(0, 28) || pageTitle}`;
}

function createSession(kind: AssistantSession['kind'], page: AssistantRequest['page'], selected = '', prompt = '') {
  const now = new Date().toISOString();
  sessions.value.unshift({
    id: crypto.randomUUID(),
    title: sessionTitle(kind, page.title, selected, prompt),
    kind,
    route: page.route,
    pageTitle: page.title,
    createdAt: now,
    updatedAt: now,
    turns: [],
  });
  activeSessionId.value = sessions.value[0]!.id;
  historyOpen.value = false;
  persistSessions();
  return sessions.value[0]!;
}

function newConversation() {
  if (busy.value) return;
  activeSessionId.value = '';
  historyOpen.value = false;
  question.value = '';
}

function toggleHistory() {
  if (busy.value) return;
  historyOpen.value = !historyOpen.value;
}

async function selectSession(session: AssistantSession) {
  if (busy.value) return;
  activeSessionId.value = session.id;
  historyOpen.value = false;
  if (route.fullPath !== session.route) {
    await router.push(session.route);
    await nextTick();
    refreshContextAfterPageSettles();
  }
  await scrollToLatest();
}

function conversationHistory(session: AssistantSession) {
  return session.turns
    .filter((turn) => !turn.streaming && Boolean(turn.content.trim()))
    .flatMap((turn) => [
      { role: 'user' as const, content: turn.historyContent.slice(0, 6_000) },
      { role: 'assistant' as const, content: turn.content.slice(0, 6_000) },
    ])
    .slice(-12);
}

function formatSessionTime(value: string) {
  const date = new Date(value);
  const today = new Date();
  return date.toDateString() === today.toDateString()
    ? date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

async function run(mode: 'EXPLAIN' | 'SUMMARY' | 'ASK') {
  if (busy.value) return;
  await waitForPageContext();
  const page = contextSnapshot.value;
  const selectedSnapshot = selectedText.value;
  const prompt = mode === 'SUMMARY'
    ? '总结当前页面'
    : mode === 'EXPLAIN'
      ? `解释选中内容（${selectedSnapshot.length.toLocaleString('zh-CN')} 字）`
      : question.value.trim();
  if (mode === 'EXPLAIN' && !selectedSnapshot) {
    openPanel();
    question.value = '请先在页面正文中选中需要解释的内容。';
    return;
  }
  if (mode === 'ASK' && !prompt) return;
  openPanel();
  const session = mode === 'SUMMARY' || mode === 'EXPLAIN'
    ? createSession(mode, page, selectedSnapshot, prompt)
    : activeSession.value && activeSession.value.route === page.route
      ? activeSession.value
      : createSession('ASK', page, '', prompt);
  if (mode === 'EXPLAIN' && selectedSnapshot.length > 40_000) {
    turns.value.push(makeErrorTurn(prompt, '选中内容超过 4 万字，请缩小范围后重试。'));
    persistSessions(true);
    return;
  }
  if (page.content.length > 80_000) {
    turns.value.push(makeErrorTurn(prompt, '当前页面超过 8 万字，请先聚焦到具体知识点或选中一段内容。'));
    persistSessions(true);
    return;
  }

  const history = conversationHistory(session);
  session.updatedAt = new Date().toISOString();
  const turn = reactive<AssistantTurn>({
    id: crypto.randomUUID(),
    prompt,
    content: '',
    thinking: '',
    sources: [],
    searchQuery: '',
    warning: '',
    gap: null,
    status: mode === 'SUMMARY' ? '正在梳理页面结构与细节' : mode === 'EXPLAIN' ? '正在理解选中内容与上下文' : '正在结合当前会话查找依据',
    streaming: true,
    error: '',
    pageCharacterCount: page.content.length,
    contextCharacterCount: 0,
    webSearchUsed: false,
    mode,
    route: page.route,
    selectedCharacterCount: mode === 'EXPLAIN' ? selectedSnapshot.length : 0,
    incidentId: '',
    stage: 'REQUEST_RECEIVED',
    elapsedMs: 0,
    siteSourceCount: 0,
    webSourceCount: 0,
    errorCode: '',
    stalled: false,
    reportCopied: false,
    historyContent: mode === 'EXPLAIN' ? `请解释以下选中内容：\n${selectedSnapshot}` : prompt,
  });
  turns.value.push(turn);
  if (mode === 'ASK') question.value = '';
  const localController = new AbortController();
  controller = localController;
  let timedOut = false;
  const hardTimeoutMs = mode === 'EXPLAIN' ? 55_000 : 65_000;
  const hardTimeout = window.setTimeout(() => {
    timedOut = true;
    localController.abort();
  }, hardTimeoutMs);
  await scrollToLatest();
  try {
    await apiClient.streamAssistant({
      mode,
      ...(mode === 'ASK' ? { question: prompt } : {}),
      ...(mode === 'EXPLAIN' ? { selectedText: selectedSnapshot } : {}),
      ...(history.length ? { history } : {}),
      page,
    }, {
      onProgress: (message) => { turn.status = message; },
      onDiagnostic: (diagnostic) => {
        turn.incidentId = diagnostic.incidentId || turn.incidentId;
        turn.stage = diagnostic.stage;
        turn.elapsedMs = diagnostic.elapsedMs;
        if (diagnostic.contextCharacterCount !== undefined) turn.contextCharacterCount = diagnostic.contextCharacterCount;
        if (diagnostic.siteSourceCount !== undefined) turn.siteSourceCount = diagnostic.siteSourceCount;
        if (diagnostic.webSourceCount !== undefined) turn.webSourceCount = diagnostic.webSourceCount;
        if (diagnostic.firstTokenMs !== undefined) turn.firstTokenMs = diagnostic.firstTokenMs;
      },
      onHeartbeat: (diagnostic) => {
        turn.incidentId = diagnostic.incidentId || turn.incidentId;
        turn.stage = diagnostic.stage;
        turn.elapsedMs = diagnostic.elapsedMs;
        turn.stalled = diagnostic.elapsedMs >= 12_000 && ['MODEL_WAIT', 'MODEL_STREAM', 'WEB_SEARCH'].includes(diagnostic.stage) && !turn.content;
      },
      onSources: (sources, searchQuery, warning, webSearchUsed) => {
        turn.sources = sources;
        turn.searchQuery = searchQuery;
        turn.warning = warning;
        turn.webSearchUsed = webSearchUsed;
        turn.siteSourceCount = sources.filter((source) => source.kind === 'SITE').length;
        turn.webSourceCount = sources.filter((source) => source.kind === 'WEB').length;
      },
      onThinking: (delta) => { turn.thinking += delta; },
      onDelta: (delta) => { turn.content += delta; turn.stalled = false; void scrollToLatest(); },
      onGap: (candidate) => { turn.gap = candidate; },
      onDone: (metadata) => {
        turn.pageCharacterCount = metadata.pageCharacterCount;
        turn.contextCharacterCount = metadata.contextCharacterCount;
        turn.webSearchUsed = metadata.webSearchUsed;
        turn.elapsedMs = metadata.elapsedMs;
        turn.stage = 'COMPLETE';
        turn.status = '回答完成';
        session.updatedAt = new Date().toISOString();
      },
    }, localController.signal);
  } catch (reason) {
    if (timedOut) {
      turn.status = '请求已停止';
      turn.error = `${mode === 'EXPLAIN' ? '划词解释' : 'AI 回答'}等待超过 ${Math.round(hardTimeoutMs / 1_000)} 秒，已自动停止，避免继续卡住。`;
      turn.errorCode = 'CLIENT_TIMEOUT';
      turn.stage = turn.stage || 'CLIENT_WAIT';
      turn.elapsedMs = hardTimeoutMs;
    } else if (localController.signal.aborted) {
      turn.status = '已停止生成';
    } else {
      turn.error = reason instanceof Error ? reason.message : '助手暂时无法完成回答';
      if (reason instanceof AssistantStreamError) {
        turn.incidentId = reason.diagnostic.incidentId || turn.incidentId;
        turn.errorCode = reason.diagnostic.code;
        turn.stage = reason.diagnostic.stage;
        turn.elapsedMs = reason.diagnostic.elapsedMs;
      } else {
        turn.errorCode = 'CLIENT_STREAM_ERROR';
      }
    }
  } finally {
    window.clearTimeout(hardTimeout);
    turn.streaming = false;
    turn.stalled = false;
    session.updatedAt = new Date().toISOString();
    persistSessions(true);
    if (controller === localController) controller = null;
    await scrollToLatest();
  }
}

function makeErrorTurn(prompt: string, error: string): AssistantTurn {
  return {
    id: crypto.randomUUID(), prompt, content: '', thinking: '', sources: [], searchQuery: '', warning: '', gap: null,
    status: '', streaming: false, error, pageCharacterCount: contextSnapshot.value.content.length,
    contextCharacterCount: 0, webSearchUsed: false, mode: 'EXPLAIN', route: contextSnapshot.value.route,
    selectedCharacterCount: 0, incidentId: '', stage: 'CLIENT_VALIDATION', elapsedMs: 0,
    siteSourceCount: 0, webSourceCount: 0, errorCode: 'CLIENT_VALIDATION', stalled: false, reportCopied: false,
    historyContent: prompt,
  };
}

function stop() { controller?.abort(); }

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

function isExternal(source: AssistantSource) { return source.kind === 'WEB'; }

function citationTokens(source: AssistantSource) {
  return source.kind === 'SITE'
    ? [`[站内:${source.id}]`]
    : [`[网络:${source.id}]`, `[站外:${source.id}]`];
}

function isSourceCited(turn: AssistantTurn, source: AssistantSource) {
  return citationTokens(source).some((token) => turn.content.includes(token));
}

function citedSources(turn: AssistantTurn) {
  return turn.sources.filter((source) => isSourceCited(turn, source));
}

function linkedAnswer(turn: AssistantTurn) {
  let answer = turn.content;
  for (const source of turn.sources) {
    const destination = source.url.replace(/ /gu, '%20').replace(/>/gu, '%3E');
    for (const token of citationTokens(source)) {
      answer = answer.split(token).join(`[${token.slice(1, -1)}](<${destination}>)`);
    }
  }
  return answer;
}

function sourceSummaryLabel(turn: AssistantTurn) {
  const cited = citedSources(turn);
  const site = cited.filter((source) => source.kind === 'SITE').length;
  const web = cited.filter((source) => source.kind === 'WEB').length;
  return `${cited.length} 条正文引用 · ${site} 站内 · ${web} 站外${turn.webSearchUsed ? ' · 已联网核验' : ''}`;
}

function contextUsageLabel(turn: AssistantTurn) {
  if (!turn.contextCharacterCount) return turn.streaming ? '正在准备相关上下文' : '未收到上下文指标';
  return `使用 ${turn.contextCharacterCount.toLocaleString('zh-CN')} / ${turn.pageCharacterCount.toLocaleString('zh-CN')} 字`;
}

function diagnosticReport(turn: AssistantTurn) {
  return JSON.stringify({
    reportVersion: 1,
    incidentId: turn.incidentId || 'not-received',
    capturedAt: new Date().toISOString(),
    mode: turn.mode,
    route: turn.route.split(/[?#]/u)[0],
    stage: turn.stage,
    elapsedMs: turn.elapsedMs,
    firstTokenMs: turn.firstTokenMs ?? null,
    pageCharacterCount: turn.pageCharacterCount,
    selectedCharacterCount: turn.selectedCharacterCount,
    contextCharacterCount: turn.contextCharacterCount,
    siteSourceCount: turn.siteSourceCount,
    webSourceCount: turn.webSourceCount,
    webSearchUsed: turn.webSearchUsed,
    errorCode: turn.errorCode || null,
    errorMessage: turn.error || null,
  }, null, 2);
}

async function copyDiagnosticReport(turn: AssistantTurn) {
  try {
    await navigator.clipboard.writeText(diagnosticReport(turn));
    turn.reportCopied = true;
    window.setTimeout(() => { turn.reportCopied = false; }, 2_000);
  } catch {
    turn.warning = '无法访问剪贴板。请在系统设置中查看本机 Atlas AI 诊断日志。';
  }
}

watch(() => route.fullPath, async () => {
  selectedText.value = '';
  await nextTick();
  refreshContextAfterPageSettles();
});
watch(sessions, () => persistSessions(), { deep: true });

onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('pointerup', onPointerUp, true);
  document.addEventListener('pointercancel', onPointerCancel, true);
  document.addEventListener('selectionchange', onSelectionChange);
  window.addEventListener('keydown', onKeydown);
  refreshContextAfterPageSettles();
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown, true);
  document.removeEventListener('pointerup', onPointerUp, true);
  document.removeEventListener('pointercancel', onPointerCancel, true);
  document.removeEventListener('selectionchange', onSelectionChange);
  window.removeEventListener('keydown', onKeydown);
  clearSelectionTimer();
  if (contextRefreshTimer !== undefined) window.clearTimeout(contextRefreshTimer);
  if (persistSessionsTimer !== undefined) window.clearTimeout(persistSessionsTimer);
  persistSessions(true);
  controller?.abort();
});
</script>

<template>
  <Transition name="selection-tool">
    <button
      v-if="selectedText && !panelOpen"
      class="selection-explain"
      :style="{ left: `${selectionPosition.left}px`, top: `${selectionPosition.top}px` }"
      @pointerdown.prevent
      @click="run('EXPLAIN')"
    ><span aria-hidden="true">✦</span> AI 解释</button>
  </Transition>

  <button class="assistant-launcher" :class="{ 'is-open': panelOpen }" :aria-expanded="panelOpen" aria-controls="atlas-ai-panel" @click="panelOpen ? closePanel() : openPanel(true)">
    <span class="launcher-mark" aria-hidden="true">✦</span>
    <span><strong>Atlas AI</strong><small>总结 · 解释 · 查资料</small></span>
  </button>

  <Transition name="assistant-panel">
    <aside v-if="panelOpen" id="atlas-ai-panel" class="assistant-panel" :class="{ 'is-wide': wideMode }" aria-label="Atlas AI 学习助手">
      <header class="assistant-header">
        <div class="assistant-identity"><span class="assistant-symbol" aria-hidden="true">✦</span><div><h2>Atlas AI</h2><p>{{ activeSession?.title || '会判断与核验资料的学习助手' }}</p></div></div>
        <div class="assistant-header-actions">
          <button class="width-toggle" :class="{ 'is-active': wideMode }" :title="wideMode ? '恢复标准宽度' : '宽屏阅读'" :aria-label="wideMode ? '标准宽度' : '宽屏阅读'" @click="toggleWideMode">↔</button>
          <button :disabled="busy" title="新会话" aria-label="新会话" @click="newConversation">＋</button>
          <button :disabled="busy" :class="{ 'is-active': historyOpen }" title="历史会话" aria-label="历史会话" @click="toggleHistory">☷</button>
          <button title="关闭助手" aria-label="关闭助手" @click="closePanel">×</button>
        </div>
      </header>

      <section class="context-bar"><span>当前页</span><strong>{{ contextSnapshot.title }}</strong><b>{{ pageCountLabel }}</b></section>
      <section class="source-policy"><span aria-hidden="true">◇</span><p><strong>资料不是答案</strong> 页面、站内与网络内容都会先经过判断；发现冲突时，回答会明确核验或纠错。</p></section>

      <section v-if="historyOpen" class="assistant-history" aria-label="Atlas AI 历史会话">
        <div class="history-heading"><div><strong>历史会话</strong><span>{{ historySessions.length }} 个独立会话</span></div><button @click="newConversation">＋ 新会话</button></div>
        <div v-if="historySessions.length" class="history-list">
          <button v-for="session in historySessions" :key="session.id" :class="{ 'is-current': session.id === activeSessionId }" @click="selectSession(session)">
            <span class="history-kind">{{ session.kind === 'SUMMARY' ? '总结' : session.kind === 'EXPLAIN' ? '解释' : '提问' }}</span>
            <span class="history-copy"><strong>{{ session.title }}</strong><small>{{ session.pageTitle }} · {{ session.turns.length }} 轮对话</small></span>
            <time>{{ formatSessionTime(session.updatedAt) }}</time>
          </button>
        </div>
        <div v-else class="history-empty"><strong>还没有历史会话</strong><span>总结、划词解释或首次提问都会建立一个独立会话。</span></div>
      </section>

      <div v-else ref="conversation" class="assistant-conversation" aria-live="polite">
        <section v-if="!turns.length" class="assistant-welcome">
          <span class="welcome-mark" aria-hidden="true">✦</span>
          <h3>先抓重点，再展开。</h3>
          <p>页面和检索资料只是信息来源。Atlas AI 会先理解、核验和重新组织，再给出自己的结论；发现错误或冲突时会明确指出。</p>
          <div class="quick-actions">
            <button @click="run('SUMMARY')"><span aria-hidden="true">≡</span><strong>总结当前页</strong><small>理解主线、核验结论，再覆盖重要细节</small></button>
            <button :disabled="!selectedText" @click="run('EXPLAIN')"><span aria-hidden="true">“</span><strong>解释选中内容</strong><small>{{ selectedText ? `已选 ${selectedText.length} 字，将先判断是否准确` : '划词完成后可用' }}</small></button>
          </div>
        </section>

        <article v-for="turn in turns" :key="turn.id" class="assistant-turn">
          <div class="user-intent"><p>{{ turn.prompt }}</p></div>
          <div class="answer-card">
            <div class="answer-meta"><span class="ai-label"><i>✦</i> Atlas AI</span><span>{{ contextUsageLabel(turn) }}</span></div>
            <div v-if="turn.streaming && !turn.content" class="assistant-working"><i></i><span>{{ turn.status }}<small v-if="turn.elapsedMs >= 1_000">已等待 {{ Math.ceil(turn.elapsedMs / 1_000) }} 秒</small></span></div>
            <MarkdownRenderer v-if="turn.content || turn.thinking" :source="linkedAnswer(turn)" :thinking="turn.thinking" :streaming="turn.streaming" :thinking-open="false" aria-label="AI 助手回答" />
            <div v-if="turn.stalled" class="assistant-stalled"><strong>这个步骤比预期慢</strong><span>请求仍在运行；你可以停止，或先复制当前诊断信息。</span><button @click="copyDiagnosticReport(turn)">{{ turn.reportCopied ? '已复制' : '复制当前诊断' }}</button></div>
            <div v-if="turn.error" class="assistant-error"><p>{{ turn.error }}</p><small>{{ turn.errorCode || 'ASSISTANT_ERROR' }} · {{ turn.stage }}<span v-if="turn.incidentId"> · {{ turn.incidentId }}</span></small><button @click="copyDiagnosticReport(turn)">{{ turn.reportCopied ? '报告已复制' : '复制错误报告' }}</button></div>
            <p v-if="turn.warning" class="assistant-warning">{{ turn.warning }}</p>
            <details v-if="citedSources(turn).length" class="assistant-sources">
              <summary><strong>资料与链接</strong><span>{{ sourceSummaryLabel(turn) }}</span></summary>
              <div class="source-list">
                <a v-for="source in citedSources(turn)" :key="`${turn.id}-${source.id}`" :href="source.url" :target="isExternal(source) ? '_blank' : undefined" :rel="isExternal(source) ? 'noopener noreferrer' : undefined" class="source-link is-cited">
                  <span :class="`source-kind source-${source.kind.toLocaleLowerCase()}`">{{ source.kind === 'SITE' ? '站内' : '站外' }}</span>
                  <span><strong>{{ source.title }}</strong><small>{{ source.excerpt }}</small></span><b>已引用 ↗</b>
                </a>
              </div>
            </details>
            <RouterLink v-if="turn.gap" to="/settings#assistant-gaps" class="gap-notice" @click="closePanel"><span aria-hidden="true">＋</span><span><strong>已加入资料候补</strong><small>{{ turn.gap.title }}</small></span><b>查看</b></RouterLink>
          </div>
        </article>
      </div>

      <footer class="assistant-composer">
        <div class="composer-box" :class="{ 'is-busy': busy }">
          <textarea ref="composer" v-model="question" rows="2" maxlength="4000" :placeholder="activeSession ? '在当前会话中继续追问…' : '结合当前页开始新问题…'" :disabled="busy" @keydown="onComposerKeydown"></textarea>
          <button v-if="busy" class="stop-button" aria-label="停止生成" @click="stop"><i></i></button>
          <button v-else class="send-button" :disabled="!question.trim()" aria-label="发送问题" @click="sendFromComposer">↑</button>
        </div>
        <p>{{ activeSession ? '追问只使用当前独立会话的历史，不会混入其他会话。' : '总结或解释会新建会话；旧会话可从历史中继续。' }}</p>
      </footer>
    </aside>
  </Transition>
</template>

<style scoped>
.assistant-launcher {
  position: fixed; right: 22px; bottom: 20px; z-index: 1600;
  display: grid; grid-template-columns: 38px auto; gap: 10px; align-items: center;
  min-width: 190px; min-height: 58px; padding: 8px 15px 8px 9px;
  color: #f7fbff; text-align: left; background: #173452;
  border: 1px solid rgba(165, 199, 230, .3); border-radius: 17px;
  box-shadow: 0 14px 38px rgba(14, 38, 63, .25); cursor: pointer;
  transition: transform .16s ease, box-shadow .16s ease, opacity .16s ease;
}
.assistant-launcher:hover { transform: translateY(-2px); box-shadow: 0 18px 44px rgba(14, 38, 63, .31); }
.assistant-launcher.is-open { opacity: 0; pointer-events: none; transform: translateY(8px); }
.launcher-mark, .assistant-symbol, .welcome-mark {
  display: grid; place-items: center; color: #effff9; background: #27735f; border-radius: 12px;
}
.launcher-mark, .assistant-symbol { width: 38px; height: 38px; }
.assistant-launcher > span:last-child { display: flex; min-width: 0; flex-direction: column; }
.assistant-launcher strong { font: 720 14px/1.35 var(--font-display); }
.assistant-launcher small { margin-top: 2px; color: #b8cada; font-size: 12px; line-height: 1.3; }
.selection-explain {
  position: fixed; z-index: 1700; display: flex; gap: 7px; align-items: center;
  min-height: 40px; padding: 0 14px; color: #fff; font-size: 14px; font-weight: 720;
  background: #173452; border: 1px solid rgba(255, 255, 255, .18); border-radius: 11px;
  box-shadow: 0 10px 28px rgba(12, 31, 55, .26); cursor: pointer;
}
.selection-explain span { color: #79cfb3; }

.assistant-panel {
  position: fixed; z-index: 1800; top: 12px; right: 12px; bottom: 12px;
  display: grid; grid-template-rows: auto auto auto minmax(0, 1fr) auto;
  width: min(560px, calc(100vw - 24px)); overflow: hidden; color: #1b2938;
  background: #f7f9fb; border: 1px solid #d4dee7; border-radius: 22px;
  box-shadow: 0 28px 80px rgba(12, 30, 52, .3);
  transition: width .2s ease;
}
.assistant-panel > * { min-width: 0; }
.assistant-panel.is-wide { width: min(720px, calc(100vw - 24px)); }
.assistant-header {
  display: flex; justify-content: space-between; gap: 16px; align-items: center;
  min-height: 68px; padding: 13px 16px; color: #f5f9fd; background: #173452;
}
.assistant-identity { display: flex; min-width: 0; gap: 12px; align-items: center; }
.assistant-identity > div { min-width: 0; }
.assistant-identity h2 { margin: 0; font: 740 18px/1.3 var(--font-display); }
.assistant-identity p {
  max-width: 360px; margin: 3px 0 0; overflow: hidden; color: #b8cada;
  font-size: 13px; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap;
}
.assistant-header-actions { display: flex; flex: none; gap: 7px; }
.assistant-header-actions button {
  display: grid; place-items: center; width: 38px; height: 38px; padding: 0;
  color: #c8d7e4; font-size: 17px; background: rgba(255, 255, 255, .07);
  border: 1px solid rgba(255, 255, 255, .12); border-radius: 10px; cursor: pointer;
}
.assistant-header-actions button:hover, .assistant-header-actions button.is-active { color: #fff; background: rgba(255, 255, 255, .15); }
.assistant-header-actions button:last-child { font-size: 22px; }
.assistant-header-actions button:disabled { opacity: .35; }

.context-bar {
  display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 10px; align-items: center;
  min-height: 44px; padding: 9px 16px; color: #718092; background: #eef3f6;
  border-bottom: 1px solid #dde5eb; font-size: 12px;
}
.context-bar strong { overflow: hidden; color: #34485a; font-size: 13px; line-height: 1.4; text-overflow: ellipsis; white-space: nowrap; }
.context-bar b { color: #2f6d59; font: 680 12px/1.4 var(--font-mono); }
.source-policy {
  display: grid; grid-template-columns: 24px minmax(0, 1fr); gap: 9px; align-items: center;
  min-height: 48px; padding: 8px 16px; color: #526979; background: #f4f8f6;
  border-bottom: 1px solid #dce7e2;
}
.source-policy > span { display: grid; place-items: center; width: 24px; height: 24px; color: #2e725d; font-size: 16px; background: #dfeee8; border-radius: 8px; }
.source-policy p { min-width: 0; margin: 0; overflow-wrap: anywhere; font-size: 12.5px; line-height: 1.5; }
.source-policy strong { color: #255f4d; font-size: 13px; }

.assistant-conversation, .assistant-history {
  min-width: 0; min-height: 0; padding: 20px; overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain;
  scrollbar-color: #b9c8d4 transparent; scrollbar-width: thin; scrollbar-gutter: stable;
}
.assistant-welcome { display: flex; min-height: 100%; padding: 26px 4px 10px; flex-direction: column; align-items: flex-start; }
.welcome-mark { width: 48px; height: 48px; margin-bottom: 18px; font-size: 18px; }
.assistant-welcome h3 { margin: 0; color: #18283b; font: 740 24px/1.3 var(--font-display); letter-spacing: -.03em; }
.assistant-welcome > p { max-width: 480px; margin: 12px 0 24px; color: #536577; font-size: 15px; line-height: 1.72; }
.quick-actions { display: grid; width: 100%; gap: 10px; }
.quick-actions button {
  display: grid; grid-template-columns: 40px 1fr; gap: 3px 12px; min-height: 68px; padding: 13px 14px;
  text-align: left; background: #fff; border: 1px solid #d9e3eb; border-radius: 14px; cursor: pointer;
}
.quick-actions button:hover { border-color: #91b4d1; background: #fcfeff; box-shadow: 0 8px 24px rgba(23, 58, 91, .06); }
.quick-actions button:disabled { opacity: .46; cursor: not-allowed; }
.quick-actions button > span { grid-row: 1/3; display: grid; place-items: center; width: 40px; height: 40px; color: #285f8f; font-size: 17px; background: #eaf1f7; border-radius: 11px; }
.quick-actions strong { font-size: 15px; line-height: 1.35; }
.quick-actions small { color: #718092; font-size: 13px; line-height: 1.4; }

.history-heading { display: flex; justify-content: space-between; gap: 16px; align-items: center; margin-bottom: 16px; }
.history-heading > div { display: flex; flex-direction: column; }
.history-heading strong { font-size: 18px; }
.history-heading span { margin-top: 3px; color: #718092; font-size: 12.5px; }
.history-heading button { min-height: 38px; padding: 0 13px; color: #285f4e; font-size: 13px; font-weight: 720; background: #e6f2ec; border: 1px solid #c9dfd5; border-radius: 10px; cursor: pointer; }
.history-list { display: grid; gap: 9px; }
.history-list > button {
  display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 11px; align-items: center;
  width: 100%; min-height: 64px; padding: 12px; text-align: left; background: #fff;
  border: 1px solid #dbe4eb; border-radius: 13px; cursor: pointer;
}
.history-list > button:hover { border-color: #9bb8cf; background: #fcfeff; }
.history-list > button.is-current { border-color: #6fa18e; box-shadow: 0 0 0 3px rgba(39, 115, 95, .08); }
.history-kind { padding: 5px 7px; color: #356b59; font: 720 11px/1.2 var(--font-mono); background: #e2f0e9; border-radius: 6px; }
.history-copy { display: flex; min-width: 0; flex-direction: column; }
.history-copy strong { overflow: hidden; color: #263747; font-size: 14px; line-height: 1.4; text-overflow: ellipsis; white-space: nowrap; }
.history-copy small { margin-top: 3px; overflow: hidden; color: #738292; font-size: 12px; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }
.history-list time { color: #7d8996; font: 11.5px/1.3 var(--font-mono); }
.history-empty { display: flex; min-height: 260px; gap: 7px; align-items: center; justify-content: center; flex-direction: column; color: #718092; text-align: center; background: #f2f6f8; border: 1px dashed #c9d6df; border-radius: 14px; }
.history-empty strong { color: #405466; font-size: 16px; }
.history-empty span { max-width: 340px; font-size: 13px; line-height: 1.65; }

.assistant-turn { display: grid; gap: 11px; margin-bottom: 24px; }
.user-intent { margin-left: 64px; padding: 11px 14px; color: #f2f7fb; background: #294963; border-radius: 14px 14px 4px; }
.user-intent p { display: -webkit-box; margin: 0; overflow: hidden; font-size: 14px; line-height: 1.55; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
.answer-card { min-width: 0; padding: 18px 18px 20px; background: #fff; border: 1px solid #d9e3ea; border-radius: 5px 17px 17px; box-shadow: 0 7px 24px rgba(25, 46, 72, .055); }
.answer-meta { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 14px; color: #738291; font-size: 12px; line-height: 1.4; }
.ai-label { display: flex; gap: 7px; align-items: center; color: #245f4d; font-size: 13px; font-weight: 760; }
.ai-label i { font-style: normal; }
.assistant-working { display: flex; gap: 11px; align-items: center; padding: 24px 4px; color: #52677a; font-size: 14px; line-height: 1.5; }
.assistant-working i { width: 18px; height: 18px; border: 2px solid #c9d7e6; border-top-color: #3572c6; border-radius: 50%; animation: assistant-spin .8s linear infinite; }
.assistant-working span { display: flex; flex-direction: column; }
.assistant-working small { margin-top: 3px; color: #748393; font-size: 12px; }

.assistant-error, .assistant-warning { margin: 13px 0 0; padding: 12px 13px; font-size: 13.5px; line-height: 1.6; border-radius: 10px; }
.assistant-error { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px 12px; color: #87363b; background: #fff0f0; border: 1px solid #ecc4c7; }
.assistant-error p { grid-column: 1/-1; margin: 0; }
.assistant-error small { align-self: center; overflow-wrap: anywhere; color: #9a5d61; font: 11.5px/1.5 var(--font-mono); }
.assistant-error button, .assistant-stalled button { min-height: 34px; padding: 0 11px; font-size: 12px; font-weight: 720; border-radius: 8px; cursor: pointer; }
.assistant-error button { color: #813238; background: #fff; border: 1px solid #dfaeb2; }
.assistant-warning { color: #70531d; background: #fff8e8; border: 1px solid #ead9ab; }
.assistant-stalled { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 12px; margin: 13px 0 0; padding: 12px; color: #70531d; background: #fff8e8; border: 1px solid #ead9ab; border-radius: 10px; }
.assistant-stalled strong { font-size: 13.5px; }
.assistant-stalled span { grid-column: 1; font-size: 12.5px; line-height: 1.5; }
.assistant-stalled button { grid-column: 2; grid-row: 1/3; color: #705520; background: #fffdf7; border: 1px solid #dac890; }

.assistant-sources { margin-top: 18px; padding-top: 14px; border-top: 1px solid #e2e9ee; }
.assistant-sources summary { display: flex; justify-content: space-between; gap: 12px; align-items: center; color: #627385; cursor: pointer; list-style: none; }
.assistant-sources summary::-webkit-details-marker { display: none; }
.assistant-sources summary strong { color: #2f4254; font-size: 14px; }
.assistant-sources summary span { font-size: 12px; line-height: 1.45; text-align: right; }
.source-list { display: grid; gap: 8px; margin-top: 11px; }
.source-link { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 9px; align-items: start; padding: 11px; color: inherit; text-decoration: none; background: #f6f9fb; border: 1px solid #e0e8ee; border-radius: 11px; }
.source-link:hover { background: #eff6fa; border-color: #a9c1d3; }
.source-link.is-cited { background: #f1f8f5; border-color: #bdd8cd; }
.source-kind { margin-top: 1px; padding: 4px 6px; font: 720 10.5px/1.2 var(--font-mono); border-radius: 6px; }
.source-site { color: #2b6653; background: #dfeee7; }
.source-web { color: #3b6091; background: #e3ebf7; }
.source-link > span:nth-child(2) { display: flex; min-width: 0; flex-direction: column; }
.source-link strong { overflow: hidden; font-size: 13.5px; line-height: 1.4; text-overflow: ellipsis; white-space: nowrap; }
.source-link small { display: -webkit-box; margin-top: 3px; color: #68798a; overflow: hidden; font-size: 12.5px; line-height: 1.5; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.source-link > b { color: #607b70; font-size: 11.5px; line-height: 1.5; white-space: nowrap; }

.gap-notice { display: grid; grid-template-columns: 34px 1fr auto; gap: 10px; align-items: center; margin-top: 13px; padding: 11px; color: #285d4b; text-decoration: none; background: #edf7f2; border: 1px solid #c8e0d5; border-radius: 11px; }
.gap-notice > span:first-child { display: grid; place-items: center; width: 34px; height: 34px; background: #d4eadf; border-radius: 9px; }
.gap-notice > span:nth-child(2) { display: flex; min-width: 0; flex-direction: column; }
.gap-notice strong { font-size: 13.5px; }
.gap-notice small { overflow: hidden; color: #5e7e70; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.gap-notice > b { font-size: 12px; }

.assistant-composer { padding: 12px 16px 14px; background: #f5f8fa; border-top: 1px solid #dbe4ea; }
.composer-box { display: grid; grid-template-columns: minmax(0, 1fr) 42px; gap: 8px; align-items: end; padding: 8px 8px 8px 13px; background: #fff; border: 1px solid #cbd8e2; border-radius: 14px; box-shadow: 0 5px 18px rgba(22, 45, 73, .04); }
.composer-box:focus-within { border-color: #779fc0; box-shadow: 0 0 0 3px rgba(58, 111, 160, .1); }
.composer-box textarea { max-height: 132px; padding: 5px 0; resize: none; color: #1f3042; background: transparent; border: 0; outline: 0; font-size: 15px; line-height: 1.55; }
.send-button, .stop-button { display: grid; place-items: center; width: 42px; height: 42px; padding: 0; color: #fff; background: #2d669d; border: 0; border-radius: 11px; cursor: pointer; }
.send-button { font-size: 20px; }
.send-button:disabled { opacity: .35; }
.stop-button { background: #31475d; }
.stop-button i { width: 10px; height: 10px; background: #fff; border-radius: 2px; }
.assistant-composer > p { margin: 8px 3px 0; color: #6f7e8d; font-size: 12.5px; line-height: 1.5; }

.answer-card :deep(.markdown-renderer) { font-size: 15.5px; line-height: 1.78; }
.answer-card :deep(.markdown-body) { line-height: 1.78; }
.answer-card :deep(.markdown-body h1) { font-size: 1.6em; }
.answer-card :deep(.markdown-body h2) { font-size: 1.38em; }
.answer-card :deep(.markdown-body h3) { font-size: 1.18em; }
.answer-card :deep(.markdown-body p), .answer-card :deep(.markdown-body li) { color: #243545; }
.answer-card :deep(.thinking-panel) { margin: 0 0 12px; }

.assistant-panel-enter-active, .assistant-panel-leave-active { transition: opacity .18s ease, transform .22s ease; }
.assistant-panel-enter-from, .assistant-panel-leave-to { opacity: 0; transform: translateX(20px); }
.selection-tool-enter-active, .selection-tool-leave-active { transition: opacity .14s ease, transform .14s ease; }
.selection-tool-enter-from, .selection-tool-leave-to { opacity: 0; transform: translateY(-4px) scale(.97); }
@keyframes assistant-spin { to { transform: rotate(360deg); } }

@media (max-width: 760px) {
  .assistant-launcher { right: 12px; bottom: 78px; min-width: 176px; }
  .assistant-panel, .assistant-panel.is-wide { top: 0; right: 0; bottom: 0; width: 100vw; border: 0; border-radius: 0; }
  .assistant-header { min-height: 64px; padding: max(12px, env(safe-area-inset-top)) 12px 10px; }
  .assistant-identity p { max-width: 180px; }
  .width-toggle { display: none !important; }
  .context-bar { padding-inline: 13px; }
  .source-policy { padding: 8px 13px; }
  .assistant-conversation, .assistant-history { padding: 15px 13px; }
  .answer-card { padding: 16px 14px 18px; }
  .user-intent { margin-left: 34px; }
  .answer-card :deep(.markdown-renderer) { font-size: 16px; }
  .assistant-composer { padding: 10px 12px max(12px, env(safe-area-inset-bottom)); }
  .selection-explain { max-width: calc(100vw - 24px); }
}
@media (prefers-reduced-motion: reduce) {
  .assistant-working i { animation: none; }
  .assistant-panel { transition: none; }
}
</style>
