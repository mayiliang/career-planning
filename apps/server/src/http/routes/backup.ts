/**
 * 备份 API 路由
 * 
 * Phase 8 实现：备份、恢复、轮换管理接口
 */
import type { FastifyPluginCallback } from 'fastify';
import { getBackupService } from '../../services/backup.service.js';
import {
  createPortableDataExport,
  importPortableData,
  previewPortableDataImport,
} from '../../services/portable-data.service.js';

const PORTABLE_IMPORT_BODY_LIMIT = 25 * 1024 * 1024;

// ===== 路由插件 =====

export const backupRoutes: FastifyPluginCallback = (app, _options, done) => {
  const backupService = getBackupService();

  // ===== POST /api/v1/backups - 创建备份 =====
  app.post('/api/v1/backups', async (request, reply) => {
    const body = request.body as { note?: string } | undefined;
    
    const result = await backupService.createBackup(body?.note);
    
    if (result.success) {
      return reply.ok(result.metadata);
    } else {
      return reply.error('BACKUP_ERROR', result.error || 'Unknown error');
    }
  });

  // ===== GET /api/v1/backups - 列出所有备份 =====
  app.get('/api/v1/backups', async (request, reply) => {
    const backups = await backupService.listBackups();
    return reply.ok(backups);
  });

  // ===== GET /api/v1/data/export - 导出可阅读的个人数据 =====
  app.get('/api/v1/data/export', async (_request, reply) => {
    return reply.ok(createPortableDataExport());
  });

  // ===== POST /api/v1/data/import/preview - 校验并预览本地 JSON =====
  app.post('/api/v1/data/import/preview', { bodyLimit: PORTABLE_IMPORT_BODY_LIMIT }, async (request, reply) => {
    const body = request.body as { snapshot?: unknown } | undefined;
    try {
      return reply.ok(previewPortableDataImport(body?.snapshot));
    } catch (error) {
      const message = error instanceof Error ? error.message : '无法校验个人数据 JSON';
      return reply.error('INVALID_PORTABLE_DATA', message);
    }
  });

  // ===== POST /api/v1/data/import - 导入已预览的本地 JSON =====
  app.post('/api/v1/data/import', { bodyLimit: PORTABLE_IMPORT_BODY_LIMIT }, async (request, reply) => {
    const body = request.body as { snapshot?: unknown; confirm?: string } | undefined;
    try {
      const preview = previewPortableDataImport(body?.snapshot);
      if (!body?.confirm || body.confirm !== preview.confirmation) {
        return reply.error('CONFIRMATION_REQUIRED', '导入前必须重新预览并确认同一份个人数据 JSON');
      }

      const safetyBackup = await backupService.createBackup(`导入个人数据 JSON 前自动备份（源文件导出于 ${preview.exportedAt}）`);
      if (!safetyBackup.success || !safetyBackup.metadata) {
        return reply.error('BACKUP_ERROR', `导入已取消：无法创建导入前备份。${safetyBackup.error ?? ''}`.trim());
      }

      const result = importPortableData(body.snapshot, body.confirm);
      return reply.ok({
        message: '个人数据导入完成',
        ...result,
        backupFilename: safetyBackup.metadata.filename,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '个人数据导入失败';
      return reply.error('PORTABLE_IMPORT_ERROR', `导入失败，现有数据未被部分覆盖：${message}`);
    }
  });

  // ===== GET /api/v1/backups/:filename/preview - 预览恢复 =====
  app.get('/api/v1/backups/:filename/preview', async (request, reply) => {
    const { filename } = request.params as { filename: string };
    
    try {
      const preview = await backupService.previewRestore(filename);
      return reply.ok(preview);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.error('BACKUP_NOT_FOUND', message);
    }
  });

  // ===== POST /api/v1/backups/:filename/restore - 执行恢复 =====
  app.post('/api/v1/backups/:filename/restore', async (request, reply) => {
    const { filename } = request.params as { filename: string };
    const body = request.body as { confirm?: string } | undefined;
    if (body?.confirm !== filename) {
      return reply.error('CONFIRMATION_REQUIRED', '恢复前必须确认备份文件名');
    }
    
    const result = await backupService.restore(filename);
    
    if (result.success) {
      return reply.ok({ message: '恢复已排队，重启服务后生效', restartRequired: result.restartRequired === true });
    } else {
      return reply.error('RESTORE_ERROR', result.error || 'Unknown error');
    }
  });

  // ===== DELETE /api/v1/backups/:filename - 删除备份 =====
  app.delete('/api/v1/backups/:filename', async (request, reply) => {
    const { filename } = request.params as { filename: string };
    const body = request.body as { confirm?: string } | undefined;
    if (body?.confirm !== filename) {
      return reply.error('CONFIRMATION_REQUIRED', '删除前必须确认备份文件名');
    }
    
    const result = await backupService.deleteBackup(filename);
    
    if (result.success) {
      return reply.ok({ message: 'Backup deleted' });
    } else {
      return reply.error('DELETE_ERROR', result.error || 'Unknown error');
    }
  });

  done();
};
