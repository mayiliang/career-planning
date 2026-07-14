/**
 * 知识图谱 API 路由
 * 
 * Phase 4 实现：
 * - GET /graph - 获取图谱数据
 * - GET /domains - 获取领域统计
 */
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as graphService from '../../services/graph.service.js';

// 请求参数 Schema
const GraphQuerySchema = z.object({
  domainCode: z.string().optional(),
  collapsedDomains: z.string().optional(), // 逗号分隔的 ID 列表
});

export async function graphRoutes(app: FastifyInstance) {
  // 获取领域统计
  app.get('/domains', async (request, reply) => {
    const stats = await graphService.getDomainStats();
    
    return reply.ok(stats);
  });
  
  // 获取图谱数据
  app.get('/graph', async (request, reply) => {
    const query = GraphQuerySchema.parse(request.query);
    
    const collapsedDomains = query.collapsedDomains
      ? query.collapsedDomains.split(',')
      : undefined;
    
    const graphData = await graphService.getGraphData({
      domainCode: query.domainCode,
      collapsedDomains,
    });
    
    return reply.ok(graphData);
  });

  app.get('/tree', async (_request, reply) => {
    return reply.ok(await graphService.getKnowledgeTree());
  });
  
  // 获取知识点关系
  app.get('/points/:pointId/relations', async (request, reply) => {
    const params = z.object({ pointId: z.string() }).parse(request.params);
    
    const relations = await graphService.getKnowledgeRelations(params.pointId);
    
    return reply.ok(relations);
  });
}
