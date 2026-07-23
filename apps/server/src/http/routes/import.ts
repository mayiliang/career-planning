/**
 * 导入 API 路由
 * 
 * Phase 1 实现：
 * - GET /api/v1/import/status - 检查导入状态
 * - GET /api/v1/import/preview - 预览导入内容
 * - POST /api/v1/import/execute - 执行导入
 */
import { FastifyInstance } from 'fastify';
import { previewImport, executeImport, checkImportStatus, resetLearningProgress } from '../../services/import.service.js';
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
  updatedDomains: z.number(),
  importedPoints: z.number(),
  updatedPoints: z.number(),
  skippedPoints: z.number(),
  totalPoints: z.number(),
});

const ResetLearningProgressBodySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).optional();

const ResetLearningProgressResponseSchema = z.object({
  syncedKnowledgePoints: z.number(),
  resetKnowledgePoints: z.number(),
  deletedTemplateEvents: z.number(),
  deletedSystemLearningEvents: z.number(),
  deletedCheckins: z.number(),
  deletedDailyReviews: z.number(),
  deletedWeeklyReviews: z.number(),
  deletedLeaveDays: z.number(),
  deletedAssessmentSessions: z.number(),
  deletedAssessmentQuestions: z.number(),
  deletedAssessmentAnswers: z.number(),
  deletedAssessmentResults: z.number(),
  deletedMasteryEvents: z.number(),
  importedPlanEvents: z.number(),
  startDate: z.string(),
});

/**
 * 注册导入路由
 */
export async function registerImportRoutes(app: FastifyInstance) {
  // 检查导入状态
  app.get('/api/v1/import/status', async (request, reply) => {
    const status = await checkImportStatus();
    
    return reply.ok(ImportStatusResponseSchema.parse(status));
  });
  
  // 预览导入内容
  app.get('/api/v1/import/preview', async (request, reply) => {
    const preview = previewImport();
    
    return reply.ok(ImportPreviewResponseSchema.parse(preview));
  });
  
  // 执行导入
  app.post('/api/v1/import/execute', async (request, reply) => {
    const result = await executeImport();
    
    return reply.ok(ImportExecuteResponseSchema.parse(result));
  });

  app.post('/api/v1/import/reset-learning-progress', async (request, reply) => {
    const body = ResetLearningProgressBodySchema.parse(request.body);
    const result = await resetLearningProgress(body?.startDate);

    return reply.ok(ResetLearningProgressResponseSchema.parse(result));
  });
}
