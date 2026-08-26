import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { rawDb } from '../db/index.js';
import { executeImport } from './import.service.js';
import {
  createPortableDataExport,
  importPortableData,
  previewPortableDataImport,
} from './portable-data.service.js';

beforeAll(async () => {
  await executeImport();
});

afterAll(() => {
  rawDb.prepare('DROP TRIGGER IF EXISTS portable_import_abort').run();
});

describe('可迁移个人数据 JSON', () => {
  it('只导出固定白名单内的个人数据，不包含知识正文或密钥配置', () => {
    const exported = createPortableDataExport();
    expect(exported).toMatchObject({ schemaVersion: 1, product: 'career-atlas' });
    expect(exported.counts.knowledgeProgress).toBeGreaterThan(0);
    expect(exported.data).toHaveProperty('knowledgeNotes');
    expect(exported.data).toHaveProperty('jobs');
    expect(exported.data).not.toHaveProperty('systemConfig');
    expect(JSON.stringify(exported)).not.toContain('study_material_md');
    expect(JSON.stringify(exported)).not.toContain('DEEPSEEK_API_KEY');
  });

  it('预览同一份文件的类别差异，并识别旧版与新版知识点', () => {
    const snapshot = createPortableDataExport();
    const oldPoint = { ...snapshot.data.knowledgeProgress[0], code: 'REMOVED-OLD-POINT', title: '旧版知识点' };
    snapshot.data.knowledgeProgress.push(oldPoint);
    snapshot.counts.knowledgeProgress += 1;

    const preview = previewPortableDataImport(snapshot);

    expect(preview.totalRecords).toBe(Object.values(snapshot.counts).reduce((sum, count) => sum + count, 0));
    expect(preview.knowledgePoints.skipped).toBe(1);
    expect(preview.confirmation).toMatch(/^[a-f0-9]{64}$/);
    expect(preview.warnings.some((warning) => warning.includes('旧知识点'))).toBe(true);
  });

  it('拒绝计数不一致的损坏文件，不进入导入阶段', () => {
    const snapshot = createPortableDataExport();
    snapshot.counts.jobs += 1;

    expect(() => previewPortableDataImport(snapshot)).toThrow('与实际');
  });

  it('按预览确认值完整恢复个人数据，并删除快照之后新增的记录', () => {
    const snapshot = createPortableDataExport();
    const originalPoint = snapshot.data.knowledgeProgress.find((row) => row.code === 'JS-01');
    expect(originalPoint).toBeDefined();
    const changedStatus = originalPoint?.status === 'MASTERED' ? 'LEARNING' : 'MASTERED';
    rawDb.prepare('UPDATE knowledge_points SET status = ? WHERE code = ?').run(changedStatus, 'JS-01');
    const extraJobId = `portable-extra-${randomUUID()}`;
    const now = new Date().toISOString();
    rawDb.prepare(`INSERT INTO jobs (id, company, job_title, platform, status, priority, created_at, updated_at)
      VALUES (?, '导入后新增公司', '临时岗位', '测试', 'SAVED', 3, ?, ?)`).run(extraJobId, now, now);

    const preview = previewPortableDataImport(snapshot);
    const result = importPortableData(snapshot, preview.confirmation);
    const restoredPoint = rawDb.prepare("SELECT status FROM knowledge_points WHERE code = 'JS-01'").get() as { status: string };
    const removedJob = rawDb.prepare('SELECT id FROM jobs WHERE id = ?').get(extraJobId);

    expect(result.importedRecords).toBeGreaterThanOrEqual(snapshot.counts.knowledgeProgress);
    expect(restoredPoint.status).toBe(originalPoint?.status);
    expect(removedJob).toBeUndefined();
  });

  it('数据库写入中途失败时回滚全部删除和更新', () => {
    const jobId = `portable-rollback-${randomUUID()}`;
    const now = new Date().toISOString();
    rawDb.prepare(`INSERT INTO jobs (id, company, job_title, platform, status, priority, created_at, updated_at)
      VALUES (?, '事务回滚公司', '回滚验证岗位', '测试', 'SAVED', 3, ?, ?)`).run(jobId, now, now);
    const snapshot = createPortableDataExport();
    const originalStatus = String(snapshot.data.knowledgeProgress.find((row) => row.code === 'JS-01')?.status);
    const changedStatus = originalStatus === 'MASTERED' ? 'LEARNING' : 'MASTERED';
    rawDb.prepare('UPDATE knowledge_points SET status = ? WHERE code = ?').run(changedStatus, 'JS-01');
    const preview = previewPortableDataImport(snapshot);
    rawDb.prepare("CREATE TEMP TRIGGER portable_import_abort BEFORE INSERT ON jobs BEGIN SELECT RAISE(ABORT, 'forced import failure'); END").run();

    try {
      expect(() => importPortableData(snapshot, preview.confirmation)).toThrow('forced import failure');
      const pointAfterFailure = rawDb.prepare("SELECT status FROM knowledge_points WHERE code = 'JS-01'").get() as { status: string };
      expect(pointAfterFailure.status).toBe(changedStatus);
      expect(rawDb.prepare('SELECT id FROM jobs WHERE id = ?').get(jobId)).toBeDefined();
    } finally {
      rawDb.prepare('DROP TRIGGER IF EXISTS portable_import_abort').run();
      rawDb.prepare('DELETE FROM jobs WHERE id = ?').run(jobId);
      rawDb.prepare('UPDATE knowledge_points SET status = ? WHERE code = ?').run(originalStatus, 'JS-01');
    }
  });
});
