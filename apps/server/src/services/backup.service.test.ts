import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdir, readFile, rm } from 'fs/promises';
import { dirname, join } from 'path';
import { createBackupService } from './backup.service.js';
import { getDatabasePath } from '../db/index.js';

const dbPath = getDatabasePath();
const backupDir = join(dirname(dbPath), 'backup-service-tests');
const pendingRestorePath = join(dirname(dbPath), 'restore-pending.db');
const service = createBackupService({ backupDir, dbPath, maxBackups: 2 });
let filename = '';

beforeAll(async () => {
  await mkdir(backupDir, { recursive: true });
});

afterAll(async () => {
  await rm(backupDir, { recursive: true, force: true });
  await rm(pendingRestorePath, { force: true });
});

describe('BackupService', () => {
  it('创建带真实统计与校验和的 SQLite 快照', async () => {
    const result = await service.createBackup('自动化验收');

    expect(result.success).toBe(true);
    expect(result.metadata?.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(result.metadata?.stats.knowledgePoints).toBeGreaterThanOrEqual(0);
    filename = result.metadata?.filename ?? '';
  });

  it('可列出并预览已校验的备份', async () => {
    const backups = await service.listBackups();
    const preview = await service.previewRestore(filename);

    expect(backups.some((backup) => backup.filename === filename)).toBe(true);
    expect(preview.metadata.filename).toBe(filename);
    expect(preview.differences).toEqual({
      knowledgePoints: 0,
      planEvents: 0,
      assessments: 0,
      jobs: 0,
    });
  });

  it('拒绝路径穿越文件名', async () => {
    await expect(service.previewRestore('../career-atlas-evil.db')).rejects.toThrow(
      'Invalid backup filename'
    );
  });

  it('恢复操作只暂存快照并要求重启', async () => {
    const result = await service.restore(filename);
    const pending = await readFile(pendingRestorePath);

    expect(result).toEqual({ success: true, restartRequired: true });
    expect(pending.byteLength).toBeGreaterThan(0);
  });
});
