/** 笔记公共入口与 AI 整理编排；存储和模型实现分别维护。 */
import { config } from '../config/index.js';
import { requireNotePoint, getNoteByCode, savePointNote, persistOrganizedNote } from './notes/persistence.js';
import { requestOrganizedNoteStream, isIncompleteAiFinalAnswer, localOrganizedDraft } from './notes/model.js';
import type { NoteSnapshot } from './notes/types.js';
export { savePointNote, getNoteByCode, listNotes, acceptOrganizedNote, type NoteSortMode } from './notes/persistence.js';
export { extractPartialJsonString } from './notes/model.js';

export async function organizePointNote(code: string) {
  return organizePointNoteStream(code, () => undefined);
}

export async function organizePointNoteStream(
  code: string,
  onDelta: (delta: string) => void,
  signal?: AbortSignal,
  onStatus: (message: string) => void = () => {},
  onThinking: (delta: string) => void = () => {},
  onReset: () => void = () => {},
) {
  if (signal?.aborted) throw new DOMException('已停止本次整理', 'AbortError');
  const point = requireNotePoint(code);
  let note = getNoteByCode(code);
  if (!note) note = savePointNote(code, point.summary || '');
  if (!note.originalMd.trim()) throw new Error('请先写下一些原始笔记，再让 AI 整理。');
  const snapshot: NoteSnapshot = { code, id: note.id, originalMd: note.originalMd, versionNo: note.versions[0]?.versionNo ?? 0 };

  let generated;
  let generationNotice: string | undefined;
  if (config.DEEPSEEK_API_KEY) {
    try {
      onStatus('正在连接 AI 并准备资料上下文');
      generated = await requestOrganizedNoteStream(point, note.originalMd, onDelta, onStatus, onThinking, signal);
    } catch (reason) {
      if (signal?.aborted) throw new DOMException('已停止本次整理', 'AbortError');
      if (isIncompleteAiFinalAnswer(reason)) {
        try {
          onReset();
          onThinking('\n\n---\n\n最终正文未完整返回，正在重新生成最终整理稿。\n\n');
          onStatus('思考已完成，但最终正文不完整；正在自动重新生成正文');
          generated = await requestOrganizedNoteStream(point, note.originalMd, onDelta, onStatus, onThinking, signal, true);
        } catch (retryReason) {
          if (signal?.aborted) throw new DOMException('已停止本次整理', 'AbortError');
          generationNotice = retryReason instanceof Error ? retryReason.message : 'AI 暂时没有完成最终正文';
          onStatus('AI 最终正文仍未完成，正在生成明确标注的安全排版稿');
          generated = localOrganizedDraft(point, note.originalMd, `${generationNotice}；本稿只做结构排版，没有执行 AI 事实核验。`);
        }
      } else {
        generationNotice = reason instanceof Error ? reason.message : 'AI 暂时没有完成响应';
        onStatus('AI 暂时不可用，正在生成明确标注的安全排版稿');
        generated = localOrganizedDraft(point, note.originalMd, `${generationNotice}；本稿只做结构排版，没有执行 AI 事实核验。`);
      }
    }
  } else {
    generationNotice = '当前未配置 AI，本稿只做结构排版，没有执行事实核验。';
    onStatus('当前未配置 AI，正在生成安全排版稿');
    generated = localOrganizedDraft(point, note.originalMd, generationNotice);
  }
  if (generated.mode === 'LOCAL_FALLBACK') {
    onReset();
    for (const chunk of generated.organizedMarkdown.match(/.{1,32}/gs) ?? []) onDelta(chunk);
  }
  if (signal?.aborted) throw new DOMException('生成已取消', 'AbortError');
  return { ...persistOrganizedNote(snapshot, generated), generationNotice };
}

