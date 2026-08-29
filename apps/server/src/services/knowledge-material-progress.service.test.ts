import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { rawDb } from '../db/index.js';
import {
  listMaterialReadingProgress,
  updateMaterialReadingProgress,
} from './knowledge-material-progress.service.js';

const guide = `reading-progress-${randomUUID()}.md`;
const anchor = 'test-reading';

describe('学习资料阅读进度', () => {
  afterAll(() => {
    rawDb.prepare('DELETE FROM material_reading_progress WHERE guide = ? AND anchor = ?').run(guide, anchor);
  });

  it('只向前保存进度，并在超过 80% 后自动且永久标记看完', () => {
    const started = updateMaterialReadingProgress(guide, anchor, 42.4);
    expect(started).toMatchObject({ progressPercent: 42, completed: false, completedAt: null });

    const cannotGoBack = updateMaterialReadingProgress(guide, anchor.toUpperCase(), 20);
    expect(cannotGoBack).toMatchObject({ anchor, progressPercent: 42, completed: false });

    const exactlyEighty = updateMaterialReadingProgress(guide, anchor, 80);
    expect(exactlyEighty).toMatchObject({ progressPercent: 80, completed: false, completedAt: null });

    const completed = updateMaterialReadingProgress(guide, anchor, 81);
    expect(completed.progressPercent).toBe(81);
    expect(completed.completed).toBe(true);
    expect(completed.completedAt).toBeTruthy();

    const remainsCompleted = updateMaterialReadingProgress(guide, anchor, 50);
    expect(remainsCompleted).toMatchObject({ progressPercent: 81, completed: true, completedAt: completed.completedAt });
    expect(listMaterialReadingProgress()).toContainEqual(remainsCompleted);
  });

  it('把越界值收敛到可保存范围', () => {
    const highGuide = `reading-progress-high-${randomUUID()}.md`;
    try {
      expect(updateMaterialReadingProgress(highGuide, anchor, 120)).toMatchObject({ progressPercent: 100, completed: true });
    } finally {
      rawDb.prepare('DELETE FROM material_reading_progress WHERE guide = ? AND anchor = ?').run(highGuide, anchor);
    }
  });
});
