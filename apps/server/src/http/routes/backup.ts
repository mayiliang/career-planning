/**
 * 备份 API 路由
 * 
 * Phase 8 实现：备份、恢复、轮换管理接口
 */
import type { FastifyPluginCallback } from 'fastify';
import { createPortableDataExport, getBackupService } from '../../services/backup.service.js';

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
