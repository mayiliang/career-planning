/** 笔记、版本和阅读内容的持久化；只在同步短事务中修改状态。 */
import { randomUUID } from 'node:crypto';
import { rawDb } from '../../db/index.js';
import { KNOWLEDGE_ROUTE_INDEX } from '../knowledge-relations.service.js';
import type { KnowledgeNoteRecord, KnowledgeNoteVersionRecord } from '../../db/schema.js';
import { NoteConflictError, type NotePointContext, type NoteSnapshot } from './types.js';

type NoteVersion = Pick<KnowledgeNoteVersionRecord, 'id' | 'versionNo' | 'source' | 'changeSummary' | 'createdAt'>;

const noteSelect = `SELECT kn.*, kd.title AS domainTitle,
  (SELECT content_md FROM knowledge_note_versions WHERE note_id = kn.id AND source = 'AI_ACCEPTED'
    ORDER BY version_no DESC LIMIT 1) AS acceptedMd
  FROM knowledge_notes kn LEFT JOIN knowledge_domains kd ON kd.code = kn.domain_code_snapshot`;

export function requireNotePoint(code: string): NotePointContext {
  const row = rawDb.prepare(`SELECT kp.code, kp.title, kd.code AS domainCode, kp.summary,
    kp.study_material_md AS studyMaterialMd, kp.pass_criteria_md AS passCriteriaMd
    FROM knowledge_points kp JOIN knowledge_domains kd ON kd.id = kp.domain_id WHERE kp.code = ?`)
    .get(code) as NotePointContext | undefined;
  if (!row) throw new Error(`知识点不存在：${code}`);
  return row;
}

export function savePointNote(code: string, contentMd: string) {
  const point = requireNotePoint(code);
  const content = contentMd.replace(/\r\n/g, '\n');
  const now = new Date().toISOString();
  return rawDb.transaction(() => {
    const existing = rawDb.prepare('SELECT id, original_md AS originalMd FROM knowledge_notes WHERE knowledge_point_code = ?')
      .get(code) as Pick<KnowledgeNoteRecord, 'id' | 'originalMd'> | undefined;
    // 自动保存和网络重试相同内容时复用结果，不制造重复历史或让候选稿失效。
    if (existing?.originalMd === content) return getNoteByCode(code)!;
    const note = existing ?? { id: randomUUID() };
    if (!existing) {
      rawDb.prepare(`INSERT INTO knowledge_notes
        (id, knowledge_point_code, domain_code_snapshot, point_title_snapshot, original_md, active_version_source, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'ORIGINAL', ?, ?)`)
        .run(note.id, code, point.domainCode, point.title, content, now, now);
    } else {
      preserveLegacyReadingVersion(note.id, now);
      rawDb.prepare(`UPDATE knowledge_notes SET original_md = ?, point_title_snapshot = ?,
        domain_code_snapshot = ?, organized_md = NULL, ai_review_json = NULL, updated_at = ? WHERE id = ?`)
        .run(content, point.title, point.domainCode, now, note.id);
    }
    const version = nextNoteVersion(note.id);
    rawDb.prepare(`INSERT INTO knowledge_note_versions
      (id, note_id, version_no, source, content_md, change_summary, created_at)
      VALUES (?, ?, ?, 'USER', ?, '用户保存原始笔记', ?)`)
      .run(randomUUID(), note.id, version, content, now);
    // 旧字段继续镜像原始笔记，保证旧页面、备份和导入流程仍可读取。
    rawDb.prepare(`UPDATE knowledge_points SET summary = ?, updated_at = ? WHERE code = ?`).run(content, now, code);
    return getNoteByCode(code)!;
  }).immediate();
}

export function getNoteByCode(code: string) {
  const note = rawDb.prepare(`${noteSelect} WHERE kn.knowledge_point_code = ?`).get(code) as Record<string, unknown> | undefined;
  if (!note) return null;
  return normalizeNote(note, getNoteVersions(String(note.id)));
}

export type NoteSortMode = 'knowledge' | 'updated_desc' | 'updated_asc' | 'title_asc' | 'code_asc';

export function listNotes(search?: string, domainCode?: string, sort: NoteSortMode = 'knowledge') {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (search?.trim()) {
    clauses.push(`(kn.point_title_snapshot LIKE ? OR kn.knowledge_point_code LIKE ? OR kn.original_md LIKE ? OR kn.organized_md LIKE ?)`);
    const term = `%${search.trim()}%`;
    params.push(term, term, term, term);
  }
  if (domainCode) { clauses.push(`kn.domain_code_snapshot = ?`); params.push(domainCode); }
  const rows = rawDb.prepare(`${noteSelect}
    ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
    ORDER BY kn.knowledge_point_code`).all(...params) as Record<string, unknown>[];
  const versions = getVersionsByNoteIds(rows.map(row => String(row.id)));
  const notes = rows.map((row) => normalizeNote(row, versions.get(String(row.id)) ?? []));
  const compareText = (left: string, right: string) => left.localeCompare(right, 'zh-CN', { numeric: true });
  return notes.sort((left, right) => {
    if (sort === 'updated_desc') return right.updatedAt.localeCompare(left.updatedAt) || left.routeOrder - right.routeOrder;
    if (sort === 'updated_asc') return left.updatedAt.localeCompare(right.updatedAt) || left.routeOrder - right.routeOrder;
    if (sort === 'title_asc') return compareText(left.pointTitle, right.pointTitle) || left.routeOrder - right.routeOrder;
    if (sort === 'code_asc') return compareText(left.knowledgePointCode, right.knowledgePointCode);
    return left.routeOrder - right.routeOrder || compareText(left.knowledgePointCode, right.knowledgePointCode);
  });
}

export function persistOrganizedNote(
  snapshot: NoteSnapshot,
  generated: { organizedMarkdown: string; review: Record<string, unknown>; mode: 'AI' | 'LOCAL_FALLBACK' },
) {
  const now = new Date().toISOString();
  return rawDb.transaction(() => {
    const current = getNoteByCode(snapshot.code);
    if (!current || current.id !== snapshot.id || current.originalMd !== snapshot.originalMd
      || nextNoteVersion(snapshot.id) !== snapshot.versionNo + 1) throw new NoteConflictError();
    const noteId = snapshot.id;
    preserveLegacyReadingVersion(noteId, now);
    rawDb.prepare(`UPDATE knowledge_notes SET organized_md = ?, ai_review_json = ?, updated_at = ? WHERE id = ?`)
      .run(generated.organizedMarkdown, JSON.stringify(generated.review), now, noteId);
    rawDb.prepare(`INSERT INTO knowledge_note_versions
      (id, note_id, version_no, source, content_md, change_summary, created_at)
      VALUES (?, ?, ?, 'AI_DRAFT', ?, ?, ?)`)
      .run(randomUUID(), noteId, nextNoteVersion(noteId), generated.organizedMarkdown, 'AI 整理候选稿（未覆盖原文）', now);
    return { ...getNoteByCode(snapshot.code)!, generationMode: generated.mode };
  }).immediate();
}

export function acceptOrganizedNote(code: string, expectedDraftVersionId?: string) {
  const now = new Date().toISOString();
  return rawDb.transaction(() => {
    const note = getNoteByCode(code);
    if (!note?.organizedMd) throw new NoteConflictError('当前没有可接受的 AI 整理稿，请基于最新原文重新整理。');
    const draft = rawDb.prepare("SELECT id FROM knowledge_note_versions WHERE note_id = ? AND source = 'AI_DRAFT' ORDER BY version_no DESC LIMIT 1")
      .get(note.id) as { id: string } | undefined;
    if (expectedDraftVersionId !== undefined && draft?.id !== expectedDraftVersionId) {
      throw new NoteConflictError('候选稿已更新，请重新打开并核对后再采用。');
    }
    if (note.activeVersionSource === 'ORGANIZED' && note.activeMd === note.organizedMd) return note;
    rawDb.prepare(`UPDATE knowledge_notes SET active_version_source = 'ORGANIZED', updated_at = ? WHERE id = ?`).run(now, note.id);
    rawDb.prepare(`INSERT INTO knowledge_note_versions
      (id, note_id, version_no, source, content_md, change_summary, created_at)
      VALUES (?, ?, ?, 'AI_ACCEPTED', ?, '用户接受 AI 整理稿；原始笔记仍保留', ?)`)
      .run(randomUUID(), note.id, nextNoteVersion(note.id), note.organizedMd, now);
    return getNoteByCode(code)!;
  }).immediate();
}

/** 兼容仅保存了阅读标记、尚无采用历史的旧数据；后续候选稿不替换既有阅读内容。 */
function preserveLegacyReadingVersion(noteId: string, now: string) {
  const current = rawDb.prepare(`SELECT organized_md AS content FROM knowledge_notes
    WHERE id = ? AND active_version_source = 'ORGANIZED' AND organized_md IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM knowledge_note_versions WHERE note_id = ? AND source = 'AI_ACCEPTED')`)
    .get(noteId, noteId) as { content: string } | undefined;
  if (!current) return;
  rawDb.prepare(`INSERT INTO knowledge_note_versions
    (id, note_id, version_no, source, content_md, change_summary, created_at)
    VALUES (?, ?, ?, 'AI_ACCEPTED', ?, '保留旧数据中已选定的阅读版本', ?)`)
    .run(randomUUID(), noteId, nextNoteVersion(noteId), current.content, now);
}

function nextNoteVersion(noteId: string) {
  const row = rawDb.prepare(`SELECT COALESCE(MAX(version_no), 0) + 1 AS version FROM knowledge_note_versions WHERE note_id = ?`).get(noteId) as { version: number };
  return row.version;
}

function getNoteVersions(noteId: string) {
  return rawDb.prepare(`SELECT id, version_no AS versionNo, source, change_summary AS changeSummary,
    created_at AS createdAt FROM knowledge_note_versions WHERE note_id = ? ORDER BY version_no DESC LIMIT 20`).all(noteId) as NoteVersion[];
}

function getVersionsByNoteIds(ids: string[]) {
  const byNote = new Map<string, NoteVersion[]>();
  if (!ids.length) return byNote;
  const rows = rawDb.prepare(`SELECT * FROM (
    SELECT note_id AS noteId, id, version_no AS versionNo, source, change_summary AS changeSummary, created_at AS createdAt,
      ROW_NUMBER() OVER (PARTITION BY note_id ORDER BY version_no DESC) AS rank
    FROM knowledge_note_versions WHERE note_id IN (${ids.map(() => '?').join(',')})
  ) WHERE rank <= 20 ORDER BY noteId, versionNo DESC`).all(...ids) as Array<NoteVersion & { noteId: string }>;
  for (const { noteId, ...version } of rows) {
    const versions = byNote.get(noteId) ?? [];
    // 内部排序字段不进入公开的版本元数据。
    versions.push({ id: version.id, versionNo: version.versionNo, source: version.source, changeSummary: version.changeSummary, createdAt: version.createdAt });
    byNote.set(noteId, versions);
  }
  return byNote;
}

function normalizeNote(row: Record<string, unknown>, versions: NoteVersion[]) {
  let review = null;
  try { review = row.ai_review_json ? JSON.parse(String(row.ai_review_json)) : null; } catch { review = null; }
  return {
    id: String(row.id),
    knowledgePointCode: String(row.knowledge_point_code),
    pointTitle: String(row.point_title_snapshot),
    domainCode: row.domain_code_snapshot ? String(row.domain_code_snapshot) : null,
    domainTitle: row.domainTitle ? String(row.domainTitle) : null,
    originalMd: String(row.original_md ?? ''),
    organizedMd: row.organized_md == null ? null : String(row.organized_md),
    activeVersionSource: String(row.active_version_source),
    activeMd: row.active_version_source === 'ORGANIZED'
      ? String(row.acceptedMd ?? row.organized_md ?? row.original_md ?? '') : String(row.original_md ?? ''),
    aiReview: review,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    routeOrder: KNOWLEDGE_ROUTE_INDEX.get(String(row.knowledge_point_code))?.order ?? Number.MAX_SAFE_INTEGER,
    versions,
  };
}

