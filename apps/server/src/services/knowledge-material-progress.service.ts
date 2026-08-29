import { randomUUID } from 'node:crypto';
import { rawDb } from '../db/index.js';
import { validateKnowledgeMaterialPath } from './knowledge-material.service.js';

export interface MaterialReadingProgress {
  guide: string;
  anchor: string;
  progressPercent: number;
  completed: boolean;
  completedAt: string | null;
  updatedAt: string | null;
}

type ReadingRow = {
  guide: string;
  anchor: string;
  progressPercent: number;
  completed: number;
  completedAt: string | null;
  updatedAt: string;
};

function normalizeAnchor(value: string) {
  return value.trim().toLocaleLowerCase('en-US');
}

function toProgress(row: ReadingRow): MaterialReadingProgress {
  return {
    guide: row.guide,
    anchor: row.anchor,
    progressPercent: row.progressPercent,
    completed: Boolean(row.completed),
    completedAt: row.completedAt,
    updatedAt: row.updatedAt,
  };
}

export function listMaterialReadingProgress(): MaterialReadingProgress[] {
  const rows = rawDb.prepare(`
    SELECT guide, anchor, progress_percent AS progressPercent, completed,
           completed_at AS completedAt, updated_at AS updatedAt
      FROM material_reading_progress
      ORDER BY updated_at DESC, guide, anchor
  `).all() as ReadingRow[];
  return rows.map(toProgress);
}

export function updateMaterialReadingProgress(
  guide: string,
  anchor: string,
  progressPercent: number,
): MaterialReadingProgress {
  validateKnowledgeMaterialPath(guide, anchor);
  const normalizedAnchor = normalizeAnchor(anchor);
  const requestedProgress = Math.min(100, Math.max(0, Math.round(progressPercent)));
  const existing = rawDb.prepare(`
    SELECT guide, anchor, progress_percent AS progressPercent, completed,
           completed_at AS completedAt, updated_at AS updatedAt
      FROM material_reading_progress
      WHERE guide = ? AND anchor = ?
  `).get(guide, normalizedAnchor) as ReadingRow | undefined;
  const nextProgress = Math.max(existing?.progressPercent ?? 0, requestedProgress);
  const completed = Boolean(existing?.completed) || nextProgress > 80;
  const now = new Date().toISOString();
  const completedAt = existing?.completedAt ?? (completed ? now : null);

  if (existing) {
    rawDb.prepare(`
      UPDATE material_reading_progress
         SET progress_percent = ?, completed = ?, completed_at = ?, updated_at = ?
       WHERE guide = ? AND anchor = ?
    `).run(nextProgress, completed ? 1 : 0, completedAt, now, guide, normalizedAnchor);
  } else {
    rawDb.prepare(`
      INSERT INTO material_reading_progress
        (id, guide, anchor, progress_percent, completed, completed_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), guide, normalizedAnchor, nextProgress, completed ? 1 : 0, completedAt, now, now);
  }

  return {
    guide,
    anchor: normalizedAnchor,
    progressPercent: nextProgress,
    completed,
    completedAt,
    updatedAt: now,
  };
}
