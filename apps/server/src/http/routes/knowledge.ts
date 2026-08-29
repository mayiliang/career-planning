/**
 * 知识点 API 路由
 * 
 * Phase 2 实现：
 * - GET /api/v1/knowledge/points - 知识点列表（支持筛选）
 * - GET /api/v1/knowledge/points/:code - 知识点详情
 * - PATCH /api/v1/knowledge/points/:code - 更新摘要
 * - POST /api/v1/knowledge/points/:code/self-master - 自评掌握
 */
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  getKnowledgePoints,
  getKnowledgePointByCode,
  updateKnowledgePointSummary,
  selfMasterKnowledgePoint,
  getKnowledgeRecommendation,
  KnowledgeListQuerySchema,
} from '../../services/knowledge.service.js';
import {
  getKnowledgeMaterial,
  KnowledgeMaterialError,
} from '../../services/knowledge-material.service.js';
import {
  listMaterialReadingProgress,
  updateMaterialReadingProgress,
} from '../../services/knowledge-material-progress.service.js';

// 请求参数 Schema
const UpdateSummarySchema = z.object({
  summary: z.string().min(1, '摘要不能为空'),
});

const SelfMasterSchema = z.object({
  summary: z.string().min(1, '摘要不能为空'),
});

const MaterialProgressSchema = z.object({
  progressPercent: z.number().min(0).max(100),
});

export async function knowledgeRoutes(app: FastifyInstance) {
  app.get('/material-progress', async (request, reply) => {
    return reply.status(200).send({ data: listMaterialReadingProgress(), meta: { requestId: request.id } });
  });

  app.patch('/materials/:guide/:anchor/progress', async (request, reply) => {
    try {
      const { guide, anchor } = request.params as { guide: string; anchor: string };
      // 先验证资料章节真实存在，避免为无效路径写入孤儿阅读记录。
      await getKnowledgeMaterial(guide, anchor);
      const body = MaterialProgressSchema.parse(request.body);
      const progress = updateMaterialReadingProgress(guide, anchor, body.progressPercent);
      return reply.status(200).send({ data: progress, meta: { requestId: request.id } });
    } catch (error) {
      if (error instanceof KnowledgeMaterialError) {
        return reply.status(error.code === 'INVALID_MATERIAL_PATH' ? 400 : 404).send({
          error: { code: error.code, message: error.message, retryable: false },
          meta: { requestId: request.id },
        });
      }
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: { code: 'INVALID_MATERIAL_PROGRESS', message: '阅读进度必须是 0 到 100', retryable: false },
          meta: { requestId: request.id },
        });
      }
      request.log.error(error);
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: '无法保存阅读进度', retryable: true },
        meta: { requestId: request.id },
      });
    }
  });

  // ===== GET /api/v1/knowledge/materials/:guide/:anchor - 站内中文讲义章节 =====
  app.get('/materials/:guide/:anchor', async (request, reply) => {
    try {
      const { guide, anchor } = request.params as { guide: string; anchor: string };
      const material = await getKnowledgeMaterial(guide, anchor);
      return reply.status(200).send({ data: material, meta: { requestId: request.id } });
    } catch (error) {
      if (error instanceof KnowledgeMaterialError) {
        return reply.status(error.code === 'INVALID_MATERIAL_PATH' ? 400 : 404).send({
          error: {
            code: error.code,
            message: error.message,
            retryable: false,
          },
          meta: { requestId: request.id },
        });
      }
      request.log.error(error);
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: '无法读取学习资料', retryable: true },
        meta: { requestId: request.id },
      });
    }
  });

  // ===== GET /api/v1/knowledge/recommendation - 下一最佳行动 =====
  app.get('/recommendation', async (request, reply) => {
    try {
      const recommendation = await getKnowledgeRecommendation();
      return reply.status(200).send({ data: recommendation, meta: { requestId: request.id } });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: '无法生成学习建议', retryable: true },
        meta: { requestId: request.id },
      });
    }
  });

  // ===== GET /api/v1/knowledge/points - 知识点列表 =====
  app.get('/points', async (request, reply) => {
    try {
      // 解析查询参数
      const query = KnowledgeListQuerySchema.parse(request.query);
      
      // 调用服务
      const result = await getKnowledgePoints(query);
      
      // 返回响应
      return reply.status(200).send({
        data: result,
        meta: {
          requestId: request.id,
        },
      });
    } catch (error) {
      request.log.error(error);
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: '查询参数无效',
            details: error.errors,
            retryable: false,
          },
          meta: {
            requestId: request.id,
          },
        });
      }
      
      return reply.status(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: '服务器内部错误',
          retryable: true,
        },
        meta: {
          requestId: request.id,
        },
      });
    }
  });
  
  // ===== GET /api/v1/knowledge/points/:code - 知识点详情 =====
  app.get('/points/:code', async (request, reply) => {
    try {
      const { code } = request.params as { code: string };
      
      // 调用服务
      const point = await getKnowledgePointByCode(code);
      
      if (!point) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: `知识点不存在: ${code}`,
            retryable: false,
          },
          meta: {
            requestId: request.id,
          },
        });
      }
      
      // 返回响应
      return reply.status(200).send({
        data: point,
        meta: {
          requestId: request.id,
        },
      });
    } catch (error) {
      request.log.error(error);
      
      return reply.status(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: '服务器内部错误',
          retryable: true,
        },
        meta: {
          requestId: request.id,
        },
      });
    }
  });
  
  // ===== PATCH /api/v1/knowledge/points/:code - 更新摘要 =====
  app.patch('/points/:code', async (request, reply) => {
    try {
      const { code } = request.params as { code: string };
      const body = UpdateSummarySchema.parse(request.body);
      
      // 调用服务
      const result = await updateKnowledgePointSummary(code, body.summary);
      
      if (!result.success) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: `知识点不存在: ${code}`,
            retryable: false,
          },
          meta: {
            requestId: request.id,
          },
        });
      }
      
      // 返回响应
      return reply.status(200).send({
        data: {
          updatedAt: result.updatedAt,
        },
        meta: {
          requestId: request.id,
        },
      });
    } catch (error) {
      request.log.error(error);
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: '请求体无效',
            details: error.errors,
            retryable: false,
          },
          meta: {
            requestId: request.id,
          },
        });
      }
      
      return reply.status(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: '服务器内部错误',
          retryable: true,
        },
        meta: {
          requestId: request.id,
        },
      });
    }
  });
  
  // ===== POST /api/v1/knowledge/points/:code/self-master - 自评掌握 =====
  app.post('/points/:code/self-master', async (request, reply) => {
    try {
      const { code } = request.params as { code: string };
      const body = SelfMasterSchema.parse(request.body);
      
      // 调用服务（包含状态机验证）
      const result = await selfMasterKnowledgePoint(code, body.summary);
      
      // 返回响应
      return reply.status(200).send({
        data: {
          previousStatus: result.previousStatus,
          newStatus: result.newStatus,
          selfMasteredAt: result.selfMasteredAt,
        },
        meta: {
          requestId: request.id,
        },
      });
    } catch (error) {
      request.log.error(error);
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: '请求体无效',
            details: error.errors,
            retryable: false,
          },
          meta: {
            requestId: request.id,
          },
        });
      }
      
      // 业务规则错误
      if (error instanceof Error && error.message.includes('不允许')) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_STATUS_TRANSITION',
            message: error.message,
            retryable: false,
          },
          meta: {
            requestId: request.id,
          },
        });
      }
      
      // 知识点不存在
      if (error instanceof Error && error.message.includes('不存在')) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: error.message,
            retryable: false,
          },
          meta: {
            requestId: request.id,
          },
        });
      }
      
      return reply.status(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: '服务器内部错误',
          retryable: true,
        },
        meta: {
          requestId: request.id,
        },
      });
    }
  });
}
