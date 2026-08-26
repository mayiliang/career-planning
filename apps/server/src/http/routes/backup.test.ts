import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { executeImport } from '../../services/import.service.js';
import { getBackupService } from '../../services/backup.service.js';
import { backupRoutes } from './backup.js';

type Envelope<T> = { data: T };

function buildTestApp() {
  const app = Fastify({ logger: false });
  app.decorateReply('ok', function (data: unknown) {
    return this.send({ data, meta: { requestId: this.request.id } });
  });
  app.decorateReply('error', function (code: string, message: string, statusCode = 400, details?: unknown) {
    return this.code(statusCode).send({ error: { code, message, retryable: false, details }, meta: { requestId: this.request.id } });
  });
  app.register(backupRoutes);
  return app;
}

describe('个人数据 JSON 导入路由', () => {
  let app: FastifyInstance;
  let createdBackupFilename = '';

  beforeAll(async () => {
    await executeImport();
    app = buildTestApp();
    await app.ready();
  });

  afterAll(async () => {
    if (createdBackupFilename) await getBackupService().deleteBackup(createdBackupFilename);
    await app.close();
  });

  it('要求先预览同一份文件，确认后自动备份并完成导入', async () => {
    const exportResponse = await app.inject({ method: 'GET', url: '/api/v1/data/export' });
    expect(exportResponse.statusCode, exportResponse.body).toBe(200);
    const snapshot = (exportResponse.json() as Envelope<unknown>).data;

    const previewResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/data/import/preview',
      payload: { snapshot },
    });
    expect(previewResponse.statusCode, previewResponse.body).toBe(200);
    const preview = (previewResponse.json() as Envelope<{ confirmation: string; totalRecords: number }>).data;
    expect(preview.totalRecords).toBeGreaterThan(0);

    const missingConfirmation = await app.inject({
      method: 'POST',
      url: '/api/v1/data/import',
      payload: { snapshot, confirm: 'not-the-preview' },
    });
    expect(missingConfirmation.statusCode, missingConfirmation.body).toBe(400);

    const importResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/data/import',
      payload: { snapshot, confirm: preview.confirmation },
    });
    expect(importResponse.statusCode, importResponse.body).toBe(200);
    const result = (importResponse.json() as Envelope<{
      message: string;
      importedRecords: number;
      backupFilename: string;
    }>).data;
    createdBackupFilename = result.backupFilename;
    expect(result.message).toBe('个人数据导入完成');
    expect(result.importedRecords).toBeGreaterThan(0);

    const backups = await getBackupService().listBackups();
    expect(backups).toEqual(expect.arrayContaining([
      expect.objectContaining({
        filename: createdBackupFilename,
        note: expect.stringContaining('导入个人数据 JSON 前自动备份'),
      }),
    ]));
  });
});
