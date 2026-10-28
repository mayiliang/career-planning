/** 一个知识点页面中的草稿、保存与候选稿状态；写入保留，反馈按页面身份隔离。 */
import { computed, onScopeDispose, ref, watch, type Ref } from 'vue';
import { apiClient, type KnowledgeNote } from '@/api/client';

export function usePointNoteEditor(options: {
  code: Readonly<Ref<string>>;
  loading: Ref<boolean>;
  message: Ref<string>;
  error: Ref<string>;
}) {
  const { code, loading, message, error } = options;
  let generation = 0;
  let disposed = false;
  const note = ref<KnowledgeNote | null>(null);
  const noteDraft = ref('');
  const loadedCode = ref('');
  const noteSavedSnapshot = ref('');
  const noteSaveState = ref<'SAVED' | 'UNSAVED' | 'SAVING' | 'ERROR'>('SAVED');
  let noteSaveTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingNoteSave: Promise<KnowledgeNote> | null = null;
  const saving = ref(false);
  const organizing = ref(false);
  const accepting = ref(false);
  const streamingOrganizedMd = ref('');
  const streamingThinking = ref('');
  const organizeProgress = ref('');
  const organizeElapsedSeconds = ref(0);
  const notePreviewMode = ref<'edit' | 'preview'>('edit');
  let organizeController: AbortController | null = null;
  const organizedDisplayMd = computed(() => organizing.value ? streamingOrganizedMd.value : note.value?.organizedMd || '');
  const canAcceptOrganized = computed(() => Boolean(note.value?.organizedMd)
    && noteDraft.value === noteSavedSnapshot.value && !saving.value && !organizing.value && !accepting.value);

  function captureEditorContext(targetCode = loadedCode.value) {
    const currentGeneration = generation;
    return () => !disposed && currentGeneration === generation && loadedCode.value === targetCode && code.value === targetCode;
  }

  function invalidate() {
    generation += 1;
    loadedCode.value = '';
    if (noteSaveTimer) { clearTimeout(noteSaveTimer); noteSaveTimer = null; }
    organizeController?.abort();
    organizeController = null;
    pendingNoteSave = null;
    saving.value = false;
    organizing.value = false;
    accepting.value = false;
    streamingOrganizedMd.value = '';
    streamingThinking.value = '';
  }

  function initialize(targetCode: string, serverNote: KnowledgeNote | null, fallbackOriginal: string) {
    invalidate();
    note.value = serverNote;
    loadedCode.value = targetCode;
    const serverDraft = serverNote?.originalMd ?? fallbackOriginal;
    noteSavedSnapshot.value = serverDraft;
    let localDraft: string | null = null;
    try { localDraft = window.localStorage.getItem(`career-atlas:note-draft:${targetCode}`); } catch { /* 保留手动保存入口 */ }
    noteDraft.value = localDraft !== null && localDraft !== serverDraft ? localDraft : serverDraft;
    noteSaveState.value = noteDraft.value === serverDraft ? 'SAVED' : 'UNSAVED';
    if (noteSaveState.value === 'UNSAVED') {
      message.value = '已恢复上次未写入服务端的本地草稿，系统会自动重试保存';
      scheduleNoteSave();
    }
  }

  try {
    const savedMode = window.localStorage.getItem('career-atlas:note-view-mode');
    if (savedMode === 'edit' || savedMode === 'preview') notePreviewMode.value = savedMode;
  } catch { /* 默认只编辑 */ }

  function storeLocalDraft(content: string, targetCode = loadedCode.value) {
    try { window.localStorage.setItem(`career-atlas:note-draft:${targetCode}`, content); return true; }
    catch { return false; }
  }

  function clearLocalDraft(targetCode = loadedCode.value) {
    try { window.localStorage.removeItem(`career-atlas:note-draft:${targetCode}`); } catch { /* 无需阻断服务端保存 */ }
  }

  function scheduleNoteSave() {
    if (noteSaveTimer) clearTimeout(noteSaveTimer);
    noteSaveTimer = setTimeout(() => { void saveNote(false); }, 1200);
  }

  async function saveNote(showMessage = true, targetCode = loadedCode.value): Promise<boolean> {
    if (saving.value || !targetCode) return false;
    if (noteSaveTimer) { clearTimeout(noteSaveTimer); noteSaveTimer = null; }
    const contentToSave = noteDraft.value;
    const isCurrentPage = captureEditorContext(targetCode);
    storeLocalDraft(contentToSave, targetCode);
    let savedSuccessfully = false;
    saving.value = true;
    noteSaveState.value = 'SAVING';
    const write = apiClient.saveNote(targetCode, contentToSave);
    pendingNoteSave = write;
    try {
      const saved = await write;
      if (isCurrentPage()) {
        note.value = saved;
        noteSavedSnapshot.value = contentToSave;
        if (noteDraft.value === contentToSave) {
          clearLocalDraft(targetCode);
          noteSaveState.value = 'SAVED';
        } else {
          noteSaveState.value = 'UNSAVED';
        }
      }
      if (showMessage && isCurrentPage()) message.value = '原始笔记已保存';
      savedSuccessfully = true;
      return true;
    } catch (reason) {
      if (isCurrentPage()) {
        error.value = reason instanceof Error ? reason.message : '笔记保存失败';
        noteSaveState.value = 'ERROR';
        storeLocalDraft(noteDraft.value, targetCode);
      }
      return false;
    } finally {
      if (pendingNoteSave === write) pendingNoteSave = null;
      if (isCurrentPage()) {
        saving.value = false;
        if (savedSuccessfully && noteDraft.value !== noteSavedSnapshot.value) scheduleNoteSave();
      }
    }
  }

  async function ensureNoteSaved(targetCode: string) {
    const isCurrentPage = captureEditorContext(targetCode);
    // 整理与完成学习必须基于已保存的原文；普通导航仍可用本地草稿及时离开。
    await pendingNoteSave?.catch(() => {});
    if (!isCurrentPage()) return false;
    if (noteDraft.value === noteSavedSnapshot.value) return true;
    return saveNote(false, targetCode);
  }

  async function organizeNote() {
    if (organizing.value) return;
    if (!noteDraft.value.trim()) { message.value = '请先写下一些原始笔记'; return; }
    const targetCode = loadedCode.value;
    const isCurrentPage = captureEditorContext(targetCode);
    const controller = new AbortController();
    organizeController = controller;
    const isCurrent = () => isCurrentPage() && organizeController === controller;
    organizing.value = true;
    streamingOrganizedMd.value = '';
    streamingThinking.value = '';
    organizeProgress.value = '正在保存原始笔记并准备整理';
    organizeElapsedSeconds.value = 0;
    error.value = '';
    try {
      if (!await ensureNoteSaved(targetCode) || !isCurrent() || controller.signal.aborted) return;
      const originalToOrganize = noteSavedSnapshot.value;
      const organized = await apiClient.organizeNoteStream(targetCode, (_delta, accumulated) => {
        if (isCurrent()) streamingOrganizedMd.value = accumulated;
      }, controller.signal, (progress, elapsedSeconds) => {
        if (!isCurrent()) return;
        organizeProgress.value = progress;
        organizeElapsedSeconds.value = elapsedSeconds;
      }, (_delta, accumulated) => {
        if (isCurrent()) streamingThinking.value = accumulated;
      });
      if (!isCurrent()) return;
      if (noteSavedSnapshot.value !== originalToOrganize || noteDraft.value !== originalToOrganize) {
        message.value = '原文已修改，请基于最新原文重新整理';
        return;
      }
      note.value = organized;
      streamingOrganizedMd.value = '';
      message.value = note.value.generationMode === 'LOCAL_FALLBACK'
        ? `已生成安全排版稿；${note.value.generationNotice ?? '尚未执行 AI 事实核验'}`
        : 'AI 候选稿已生成。原始笔记未被覆盖，请核对后再接受';
    } catch (reason) {
      if (!isCurrent()) return;
      if ((reason instanceof DOMException && reason.name === 'AbortError') || (reason instanceof Error && /abort|中止|停止/i.test(reason.message))) message.value = '已停止本次整理，尚未完成的内容没有保存';
      else error.value = reason instanceof Error ? reason.message : 'AI 整理失败';
    } finally { if (isCurrent()) { organizing.value = false; organizeController = null; } }
  }

  function cancelOrganization() { organizeController?.abort(); }

  async function acceptOrganized() {
    if (!canAcceptOrganized.value || !note.value) return;
    const targetCode = loadedCode.value;
    const candidate = note.value;
    const isCurrentPage = captureEditorContext(targetCode);
    const canUpdateNote = () => isCurrentPage() && note.value === candidate && noteDraft.value === candidate.originalMd;
    const draftVersionId = candidate.versions.find(version => version.source === 'AI_DRAFT')?.id;
    accepting.value = true;
    error.value = '';
    try {
      const accepted = await apiClient.acceptOrganizedNote(targetCode, draftVersionId);
      if (!canUpdateNote()) return;
      note.value = accepted;
      message.value = '已将整理稿设为阅读版本；原始笔记和全部版本仍然保留';
    } catch (reason) {
      if (canUpdateNote()) error.value = reason instanceof Error ? reason.message : '接受整理稿失败';
    } finally {
      if (isCurrentPage()) accepting.value = false;
    }
  }

  watch(noteDraft, (content) => {
    if (loading.value || !loadedCode.value || code.value !== loadedCode.value) return;
    // 进行中的写入可能保存了中间文本；即使撤回到旧快照，也必须保留最终意图。
    if (saving.value) {
      storeLocalDraft(content);
      noteSaveState.value = 'SAVING';
      return;
    }
    if (content === noteSavedSnapshot.value) {
      if (noteSaveTimer) { clearTimeout(noteSaveTimer); noteSaveTimer = null; }
      clearLocalDraft();
      noteSaveState.value = 'SAVED';
      return;
    }
    storeLocalDraft(content);
    noteSaveState.value = 'UNSAVED';
    scheduleNoteSave();
  });
  watch(notePreviewMode, (mode) => {
    try { window.localStorage.setItem('career-atlas:note-view-mode', mode); } catch { /* 视图偏好不可用不影响笔记 */ }
  });

  async function flushNoteBeforeNavigation() {
    if (!loadedCode.value || (noteDraft.value === noteSavedSnapshot.value && !saving.value)) return true;
    const storedLocally = storeLocalDraft(noteDraft.value);
    const saved = await saveNote(false);
    return saved || storedLocally;
  }

  onScopeDispose(() => { disposed = true; invalidate(); });
  return {
    note, noteDraft, loadedCode, noteSaveState, saving, organizing, accepting, canAcceptOrganized,
    streamingOrganizedMd, streamingThinking, organizeProgress, organizeElapsedSeconds,
    notePreviewMode, organizedDisplayMd, invalidate, initialize,
    saveNote, ensureNoteSaved, organizeNote, cancelOrganization, acceptOrganized, flushNoteBeforeNavigation,
  };
}
