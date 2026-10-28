import { effectScope, nextTick, ref, type EffectScope } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, type KnowledgeNote } from '@/api/client';
import { usePointNoteEditor } from './usePointNoteEditor';

const now = '2026-10-13T00:00:00Z';
function note(code: string, originalMd = code, organizedMd: string | null = null): KnowledgeNote {
  return {
    id: code, knowledgePointCode: code, pointTitle: code, domainCode: '01', domainTitle: '测试',
    originalMd, organizedMd, activeVersionSource: 'ORIGINAL', activeMd: originalMd, aiReview: null,
    createdAt: now, updatedAt: now, routeOrder: 1,
    versions: organizedMd ? [{ id: `${code}-draft`, versionNo: 2, source: 'AI_DRAFT', changeSummary: null, createdAt: now }] : [],
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => { resolve = resolvePromise; reject = rejectPromise; });
  return { promise, resolve, reject };
}

describe('知识点笔记编辑状态', () => {
  let scope: EffectScope;
  beforeEach(() => {
    scope = effectScope();
    vi.useFakeTimers();
    const stored = new Map<string, string>();
    vi.stubGlobal('window', { localStorage: {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
      removeItem: (key: string) => stored.delete(key),
    } });
  });
  afterEach(() => {
    scope.stop();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function createEditor() {
    const code = ref('A');
    const message = ref('');
    const error = ref('');
    const editor = scope.run(() => usePointNoteEditor({ code, loading: ref(false), message, error }))!;
    editor.initialize('A', note('A', '原文 A', '候选稿 A'), '');
    return { code, message, error, editor };
  }

  it.each(['success', 'failure'] as const)('切换知识点后旧采用操作的 %s 不更新新页面', async outcome => {
    const pending = deferred<KnowledgeNote>();
    const accept = vi.spyOn(apiClient, 'acceptOrganizedNote').mockReturnValueOnce(pending.promise);
    const { code, message, error, editor } = createEditor();
    const adopting = editor.acceptOrganized();
    expect(accept).toHaveBeenCalledWith('A', 'A-draft');
    code.value = 'B';
    editor.initialize('B', note('B'), '');
    if (outcome === 'success') pending.resolve(note('A', '原文 A', '已采用 A'));
    else pending.reject(new Error('旧页面失败'));
    await adopting;
    expect(editor.note.value?.knowledgePointCode).toBe('B');
    expect(editor.noteDraft.value).toBe('B');
    expect(message.value).toBe('');
    expect(error.value).toBe('');
    expect(editor.accepting.value).toBe(false);
  });

  it('采用响应晚于新原文保存时，保留最新笔记及候选稿失效状态', async () => {
    const pending = deferred<KnowledgeNote>();
    vi.spyOn(apiClient, 'acceptOrganizedNote').mockReturnValueOnce(pending.promise);
    vi.spyOn(apiClient, 'saveNote').mockResolvedValueOnce(note('A', '新原文 B'));
    const { editor, message } = createEditor();
    const adopting = editor.acceptOrganized();
    editor.noteDraft.value = '新原文 B';
    await nextTick();
    await editor.saveNote(false);
    pending.resolve(note('A', '原文 A', '已采用 A'));
    await adopting;
    expect(editor.note.value?.originalMd).toBe('新原文 B');
    expect(editor.note.value?.organizedMd).toBeNull();
    expect(message.value).toBe('');
  });

  it('整理响应晚于新原文保存时，不用旧结果替换最新编辑状态', async () => {
    const pending = deferred<KnowledgeNote>();
    const started = deferred<void>();
    const organize = vi.spyOn(apiClient, 'organizeNoteStream').mockImplementationOnce(() => { started.resolve(); return pending.promise; });
    vi.spyOn(apiClient, 'saveNote').mockResolvedValueOnce(note('A', '新原文 B'));
    const { editor, message } = createEditor();
    const generating = editor.organizeNote();
    await started.promise;
    expect(organize).toHaveBeenCalledOnce();
    editor.noteDraft.value = '新原文 B';
    await nextTick();
    await editor.saveNote(false);
    pending.resolve(note('A', '原文 A', '旧结果 A'));
    await generating;
    expect(editor.note.value?.originalMd).toBe('新原文 B');
    expect(editor.canAcceptOrganized.value).toBe(false);
    expect(message.value).toContain('原文已修改');
  });

  it('原文尚未保存时不能采用此前的候选稿', async () => {
    const accept = vi.spyOn(apiClient, 'acceptOrganizedNote');
    const { editor } = createEditor();
    editor.noteDraft.value = '新原文 B';
    expect(editor.canAcceptOrganized.value).toBe(false);
    await editor.acceptOrganized();
    expect(accept).not.toHaveBeenCalled();
  });

  it('保存途中撤回修改再离开时，保留最终文本供下次恢复', async () => {
    const pending = deferred<KnowledgeNote>();
    vi.spyOn(apiClient, 'saveNote').mockReturnValueOnce(pending.promise);
    const { editor } = createEditor();
    editor.noteDraft.value = '中间修改 B';
    await nextTick();
    const saving = editor.saveNote(false);
    editor.noteDraft.value = '原文 A';
    await nextTick();
    expect(await editor.flushNoteBeforeNavigation()).toBe(true);
    scope.stop();
    pending.resolve(note('A', '中间修改 B'));
    await saving;
    expect(window.localStorage.getItem('career-atlas:note-draft:A')).toBe('原文 A');
  });

  it('作用域销毁时取消整理，晚到的流内容与结果不更新状态', async () => {
    const pending = deferred<KnowledgeNote>();
    const started = deferred<void>();
    const organize = vi.spyOn(apiClient, 'organizeNoteStream').mockImplementationOnce(() => { started.resolve(); return pending.promise; });
    const { editor } = createEditor();
    const generating = editor.organizeNote();
    await started.promise;
    const call = organize.mock.calls[0]!;
    scope.stop();
    expect(call[2]?.aborted).toBe(true);
    call[1]('晚到内容', '晚到内容');
    pending.resolve(note('A', '原文 A', '晚到整理稿'));
    await generating;
    expect(editor.streamingOrganizedMd.value).toBe('');
    expect(editor.note.value?.organizedMd).toBe('候选稿 A');
  });
});
