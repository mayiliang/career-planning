/**
 * 导入 API 路由
 * 
 * Phase 1 实现：
 * - GET /api/v1/import/status - 检查导入状态
 * - GET /api/v1/import/preview - 预览导入内容
 * - POST /api/v1/import/execute - 执行导入
 */
import { FastifyInstance } from 'fastify';
import { previewImport, executeImport, checkImportStatus } from '../../services/import.service.js';
import { z } from 'zod';

// API 响应 schema
const ImportStatusResponseSchema = z.object({
  hasData: z.boolean(),
  domainCount: z.number(),
  pointCount: z.number(),
  pointCodes: z.array(z.string()),
});

const ImportPreviewResponseSchema = z.object({
  domains: z.array(z.object({
    code: z.string(),
    title: z.string(),
    pointCount: z.number(),
  })),
  totalPoints: z.number(),
  files: z.array(z.string()),
});

const ImportExecuteResponseSchema = z.object({
  importedDomains: z.number(),
  importedPoints: z.number(),
  skippedPoints: z.number(),
  totalPoints: z.number(),
});

/**
 * 注册导入路由
 */
export async function registerImportRoutes(app: FastifyInstance) {
  // 检查导入状态
  app.get('/api/v1/import/status', async (request, reply) => {
    const status = await checkImportStatus();
    
    return reply.success(ImportStatusResponseSchema.parse(status));
  });
  
  // 预览导入内容
  app.get('/api/v1/import/preview', async (request, reply) => {
    const preview = previewImport();
    
    return reply.success(ImportPreviewResponseSchema.parse(preview));
  });
  
  // 执行导入
  app.post('/api/v1/import/execute', async (request, reply) => {
    const result = await executeImport();
    
    return reply.success(ImportExecuteResponseSchema.parse(result));
  });
}