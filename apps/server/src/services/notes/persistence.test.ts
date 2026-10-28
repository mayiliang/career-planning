import Fastify from 'fastify';
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { rawDb } from '../../db/index.js';
import { config } from '../../config/index.js';
import { configureHttpContract } from '../../http/contract.js';
import { learningRoutes } from '../../http/routes/learning.js';
import { executeImport } from '../import.service.js';
import { savePointNote, getNoteByCode, listNotes, organizePointNoteStream, acceptOrganizedNote } from '../notes.service.js';
import { NoteConflictError } from './types.js';

const code = 'WEB-01';
const previousKey = config.DEEPSEEK_API_KEY;

function response(markdown: string, review: unknown = { sourceGrounded: true }) {
  const content = JSON.stringify({ organizedMarkdown: markdown, review });
  return new Response(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\ndata: [DONE]\n\n`);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(resolvePromise => { resolve = resolvePromise; });
  return { promise, resolve };
}

function organize(signal?: AbortSignal) {
  return organizePointNoteStream(code, () => {}, signal);
}

function draftId() {
  return getNoteByCode(code)!.versions.find(version => version.source === 'AI_DRAFT')!.id;
}

describe('笔记候选稿、阅读版本与并发写入', () => {
  beforeAll(async () => { await executeImport(); });
  beforeEach(() => {
    rawDb.prepare('DELETE FROM knowledge_notes WHERE knowledge_point_code = ?').run(code);
    rawDb.prepare('UPDATE knowledge_points SET summary = NULL WHERE code = ?').run(code);
    config.DEEPSEEK_API_KEY = 'test-key';
  });
  afterEach(() => {
    vi.restoreAllMocks();
    config.DEEPSEEK_API_KEY = previousKey;
    rawDb.prepare('DELETE FROM knowledge_notes WHERE knowledge_point_code = ?').run(code);
  });

  it('相同内容与换行规范化后的重复保存复用结果，不制造版本', () => {
    const first = savePointNote(code, '第一行\n第二行');
    const retried = savePointNote(code, '第一行\r\n第二行');
    expect(retried).toEqual(first);
    expect(retried.versions).toHaveLength(1);
  });

  it('重新生成只更新候选稿，采用前继续使用上一次确认的阅读内容', async () => {
    savePointNote(code, '原始记录');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(response('已采用稿 A')).mockResolvedValueOnce(response('新候选稿 B'));
    await organize();
    const accepted = acceptOrganizedNote(code, draftId());
    expect(acceptOrganizedNote(code, draftId())).toEqual(accepted);
    await organize();
    expect(getNoteByCode(code)).toMatchObject({ originalMd: '原始记录', organizedMd: '新候选稿 B', activeMd: '已采用稿 A' });
    expect(listNotes().find(note => note.knowledgePointCode === code)).toEqual(getNoteByCode(code));
    expect(acceptOrganizedNote(code, draftId()).activeMd).toBe('新候选稿 B');
  });

  it('新原文使旧候选稿失效，已采用的阅读版本和历史仍然保留', async () => {
    savePointNote(code, '原文 A');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(response('已采用稿 A'));
    await organize();
    acceptOrganizedNote(code);
    const saved = savePointNote(code, '原文 B');
    expect(saved).toMatchObject({ originalMd: '原文 B', organizedMd: null, activeMd: '已采用稿 A' });
    expect(saved.versions.some(version => version.source === 'AI_DRAFT')).toBe(true);
    expect(() => acceptOrganizedNote(code)).toThrow(NoteConflictError);
    expect((rawDb.prepare('SELECT summary FROM knowledge_points WHERE code = ?').get(code) as { summary: string }).summary).toBe('原文 B');
  });

  it('原文在生成期间改变时拒绝旧结果，不把旧稿挂在新原文下', async () => {
    savePointNote(code, '原文 A');
    const pending = deferred<Response>();
    vi.spyOn(globalThis, 'fetch').mockReturnValueOnce(pending.promise);
    const generating = organize();
    savePointNote(code, '原文 B');
    pending.resolve(response('依据原文 A 的旧稿'));
    await expect(generating).rejects.toMatchObject({ code: 'NOTE_CONFLICT', statusCode: 409 });
    expect(getNoteByCode(code)).toMatchObject({ originalMd: '原文 B', organizedMd: null });
    expect(getNoteByCode(code)!.versions).toHaveLength(2);
  });

  it('同时生成只提交一个结果，晚到任务不能替换已提交的候选稿', async () => {
    savePointNote(code, '共同原文');
    const first = deferred<Response>();
    const second = deferred<Response>();
    vi.spyOn(globalThis, 'fetch').mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const older = organize();
    const newer = organize();
    second.resolve(response('先完成的稿 B'));
    await newer;
    first.resolve(response('晚到稿 A'));
    await expect(older).rejects.toBeInstanceOf(NoteConflictError);
    expect(getNoteByCode(code)!.organizedMd).toBe('先完成的稿 B');
    expect(getNoteByCode(code)!.versions.filter(version => version.source === 'AI_DRAFT')).toHaveLength(1);
  });

  it('已经取消的请求不创建笔记、不访问模型', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    const controller = new AbortController();
    controller.abort();
    await expect(organize(controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetch).not.toHaveBeenCalled();
    expect(getNoteByCode(code)).toBeNull();
  });

  it('模型忽略取消后仍返回时，不提交候选稿', async () => {
    const saved = savePointNote(code, '原始记录');
    const pending = deferred<Response>();
    vi.spyOn(globalThis, 'fetch').mockReturnValueOnce(pending.promise);
    const controller = new AbortController();
    const generating = organize(controller.signal);
    controller.abort();
    pending.resolve(response('取消后的迟到内容'));
    await expect(generating).rejects.toMatchObject({ name: 'AbortError' });
    expect(getNoteByCode(code)).toEqual(saved);
  });

  it('版本写入失败时回滚候选稿与核对信息，保留原阅读内容', async () => {
    savePointNote(code, '原始记录');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(response('稿 A')).mockResolvedValueOnce(response('稿 B'));
    await organize();
    const accepted = acceptOrganizedNote(code);
    rawDb.exec(`CREATE TRIGGER reject_note_draft BEFORE INSERT ON knowledge_note_versions
      WHEN NEW.source = 'AI_DRAFT' BEGIN SELECT RAISE(ABORT, 'simulated note history failure'); END;`);
    try {
      await expect(organize()).rejects.toThrow('simulated note history failure');
      expect(getNoteByCode(code)).toEqual(accepted);
    } finally {
      rawDb.exec('DROP TRIGGER reject_note_draft');
    }
  });

  it('旧页面采用旧候选稿时返回 409，不能误采用其他页面新生成的内容', async () => {
    savePointNote(code, '原始记录');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(response('稿 A')).mockResolvedValueOnce(response('稿 B'));
    await organize();
    const previousDraft = draftId();
    await organize();
    const app = Fastify({ logger: false });
    configureHttpContract(app);
    app.register(learningRoutes);
    try {
      const conflict = await app.inject({ method: 'POST', url: `/api/v1/notes/${code}/accept-organized`, payload: { expectedDraftVersionId: previousDraft } });
      expect(conflict.statusCode).toBe(409);
      expect(conflict.json()).toMatchObject({ error: { code: 'NOTE_CONFLICT' } });
      expect(getNoteByCode(code)!.activeMd).toBe('原始记录');
      const accepted = await app.inject({ method: 'POST', url: `/api/v1/notes/${code}/accept-organized`, payload: { expectedDraftVersionId: draftId() } });
      expect(accepted.statusCode, accepted.body).toBe(200);
      expect(accepted.json().data.activeMd).toBe('稿 B');
    } finally { await app.close(); }
  });

  it('超过可见历史数量后仍读取真正采用的版本，列表与详情历史一致', async () => {
    savePointNote(code, '原文');
    let generation = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => response(`候选稿 ${generation++}`));
    await organize();
    acceptOrganizedNote(code);
    for (let index = 0; index < 22; index += 1) await organize();
    const note = getNoteByCode(code)!;
    expect(note.versions).toHaveLength(20);
    expect(note.versions.some(version => version.source === 'AI_ACCEPTED')).toBe(false);
    expect(note.activeMd).toBe('候选稿 0');
    expect(note.organizedMd).toBe('候选稿 22');
    expect(listNotes().find(item => item.id === note.id)).toEqual(note);
  });

  it('兼容无采用历史的旧阅读标记，生成新候选稿时先保留原阅读内容', async () => {
    const note = savePointNote(code, '原文');
    rawDb.prepare("UPDATE knowledge_notes SET active_version_source = 'ORGANIZED', organized_md = '旧阅读稿' WHERE id = ?").run(note.id);
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(response('新候选稿'));
    await organize();
    expect(getNoteByCode(code)).toMatchObject({ organizedMd: '新候选稿', activeMd: '旧阅读稿' });
  });

  it('无效核对字段安全降级并清空模型残稿，不保存无法被客户端读取的结构', async () => {
    savePointNote(code, '原文');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(response('模型残稿', { corrections: '错误的非数组字段' }));
    let displayed = '';
    const result = await organizePointNoteStream(code, delta => { displayed += delta; }, undefined, () => {}, () => {}, () => { displayed = ''; });
    expect(result.generationMode).toBe('LOCAL_FALLBACK');
    expect(result.generationNotice).toContain('字段不符合要求');
    expect(result.aiReview.sourceGrounded).toBe(false);
    expect(displayed).toBe(result.organizedMd);
  });
});
