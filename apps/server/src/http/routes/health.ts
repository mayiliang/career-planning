/**
 * 健康检查 API 路由
 * 
 * Phase 1 实现：
 * - GET /api/v1/system/health - 返回系统健康状态
 */
import { FastifyInstance } from 'fastify';
import { checkDatabaseHealth } from '../../db/index.js';
import { isAiConfigured } from '../../config/index.js';
import { z } from 'zod';

// 响应 schema
const HealthResponseSchema = z.object({
  ok: z.boolean(),
  db: z.boolean(),
  dataDir: z.boolean(),
  aiConfigured: z.boolean(),
  timestamp: z.string(),
});

/**
 * 注册健康检查路由
 */
export async function registerHealthRoutes(app: FastifyInstance) {
  app.get('/api/v1/system/health', async (request, reply) => {
    const dbHealth = checkDatabaseHealth();
    
    const response = HealthResponseSchema.parse({
      ok: true,
      db: dbHealth.ok,
      dataDir: true, // data 目录由数据库初始化创建
      aiConfigured: isAiConfigured(),
      timestamp: new Date().toISOString(),
    });
    
    return reply.ok(response);
  });
}
