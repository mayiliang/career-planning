/**
 * 求职 API 路由
 * 
 * Phase 6 实现：岗位管理、求职活动、技能缺口 API
 */
import { FastifyInstance } from 'fastify';
import {
  listJobs,
  getJobDetail,
  createJob,
  updateJob,
  deleteJob,
  getJobKanban,
  getJobFunnelStats,
  createJobActivity,
  updateJobActivity,
  createSkillGap,
  updateSkillGapStatus,
  importJobsFromCSV,
  type JobCSVRow,
} from '../../services/job.service.js';
import {
  CreateJobRequestSchema,
  UpdateJobRequestSchema,
  CreateJobActivityRequestSchema,
  UpdateJobActivityRequestSchema,
  CreateSkillGapRequestSchema,
  JobStatusSchema,
} from '@career-atlas/shared';

export async function jobsRoutes(app: FastifyInstance) {
  // ===== 岗位列表 =====
  app.get('/api/v1/jobs', async (request, reply) => {
    const query = request.query as {
      status?: string;
      platform?: string;
      search?: string;
      limit?: string;
      offset?: string;
    };
    
    // 验证状态参数
    const status = query.status && JobStatusSchema.safeParse(query.status).success
      ? query.status as 'SAVED' | 'TO_APPLY' | 'APPLIED' | 'CONTACTING' | 'ASSESSMENT' | 'INTERVIEWING' | 'OFFER' | 'REJECTED' | 'WITHDRAWN'
      : undefined;
    
    const result = await listJobs({
      status,
      platform: query.platform,
      search: query.search,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
      offset: query.offset ? parseInt(query.offset, 10) : undefined,
    });
    
    return reply.ok(result);
  });
  
  // ===== 岗位详情 =====
  app.get('/api/v1/jobs/:id', async (request, reply) => {
    const params = request.params as { id: string };
    const result = await getJobDetail(params.id);
    
    if (!result) {
      return reply.error('NOT_FOUND', '岗位不存在', 404);
    }
    
    return reply.ok(result);
  });
  
  // ===== 创建岗位 =====
  app.post('/api/v1/jobs', async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    
    // 验证请求
    const parseResult = CreateJobRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return reply.error('VALIDATION_ERROR', '岗位信息不完整', 400, parseResult.error.errors);
    }
    
    const job = await createJob(parseResult.data);
    return reply.code(201).ok(job);
  });
  
  // ===== 更新岗位 =====
  app.patch('/api/v1/jobs/:id', async (request, reply) => {
    const params = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    
    // 验证请求
    const parseResult = UpdateJobRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return reply.error('VALIDATION_ERROR', '岗位更新内容无效', 400, parseResult.error.errors);
    }
    
    const job = await updateJob(params.id, parseResult.data);
    
    if (!job) {
      return reply.error('NOT_FOUND', '岗位不存在', 404);
    }
    
    return reply.ok(job);
  });
  
  // ===== 删除岗位 =====
  app.delete('/api/v1/jobs/:id', async (request, reply) => {
    const params = request.params as { id: string };
    const deleted = await deleteJob(params.id);
    
    if (!deleted) {
      return reply.error('NOT_FOUND', '岗位不存在', 404);
    }
    
    return reply.ok({ deleted: true });
  });
  
  // ===== 看板视图 =====
  app.get('/api/v1/jobs/kanban', async (request, reply) => {
    const result = await getJobKanban();
    return reply.ok(result);
  });
  
  // ===== 漏斗统计 =====
  app.get('/api/v1/jobs/funnel', async (request, reply) => {
    const result = await getJobFunnelStats();
    return reply.ok(result);
  });
  
  // ===== CSV 导入预览 =====
  app.post('/api/v1/jobs/import/preview', async (request, reply) => {
    const body = request.body as { rows: JobCSVRow[] };
    
    if (!body.rows || !Array.isArray(body.rows)) {
      return reply.error('VALIDATION_ERROR', '必须提供 rows 数组');
    }
    
    // 返回预览信息
    const validRows = body.rows.filter(row => row.company && row.job_title && row.platform);
    
    return reply.ok({
      total: body.rows.length,
      valid: validRows.length,
      preview: validRows.slice(0, 5).map(row => ({
        company: row.company,
        jobTitle: row.job_title,
        platform: row.platform,
        status: row.status || 'SAVED',
      })),
    });
  });
  
  // ===== CSV 导入执行 =====
  app.post('/api/v1/jobs/import', async (request, reply) => {
    const body = request.body as { rows: JobCSVRow[] };
    
    if (!body.rows || !Array.isArray(body.rows)) {
      return reply.error('VALIDATION_ERROR', '必须提供 rows 数组');
    }
    
    const imported = await importJobsFromCSV(body.rows);
    
    return reply.ok({
      imported,
      message: `成功导入 ${imported} 个岗位`,
    });
  });
  
  // ===== 创建求职活动 =====
  app.post('/api/v1/jobs/:jobId/activities', async (request, reply) => {
    const params = request.params as { jobId: string };
    const body = request.body as Record<string, unknown>;
    
    // 添加 jobId 到请求
    const requestWithJobId = {
      ...body,
      jobId: params.jobId,
    };
    
    // 验证请求
    const parseResult = CreateJobActivityRequestSchema.safeParse(requestWithJobId);
    if (!parseResult.success) {
      return reply.error('VALIDATION_ERROR', '求职活动信息无效', 400, parseResult.error.errors);
    }
    
    const activity = await createJobActivity(parseResult.data);
    return reply.code(201).ok(activity);
  });
  
  // ===== 更新求职活动 =====
  app.patch('/api/v1/jobs/:jobId/activities/:activityId', async (request, reply) => {
    const params = request.params as { jobId: string; activityId: string };
    const body = request.body as Record<string, unknown>;
    
    // 验证请求
    const parseResult = UpdateJobActivityRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return reply.error('VALIDATION_ERROR', '求职活动更新内容无效', 400, parseResult.error.errors);
    }
    
    const activity = await updateJobActivity(params.activityId, parseResult.data);
    
    if (!activity) {
      return reply.error('NOT_FOUND', '求职活动不存在', 404);
    }
    
    return reply.ok(activity);
  });
  
  // ===== 创建技能缺口 =====
  app.post('/api/v1/jobs/:jobId/skill-gaps', async (request, reply) => {
    const params = request.params as { jobId: string };
    const body = request.body as Record<string, unknown>;
    
    // 添加 jobId 到请求
    const requestWithJobId = {
      ...body,
      jobId: params.jobId,
    };
    
    // 验证请求
    const parseResult = CreateSkillGapRequestSchema.safeParse(requestWithJobId);
    if (!parseResult.success) {
      return reply.error('VALIDATION_ERROR', '技能缺口信息无效', 400, parseResult.error.errors);
    }
    
    const gap = await createSkillGap(parseResult.data);
    return reply.code(201).ok(gap);
  });
  
  // ===== 更新技能缺口状态 =====
  app.patch('/api/v1/jobs/:jobId/skill-gaps/:gapId', async (request, reply) => {
    const params = request.params as { jobId: string; gapId: string };
    const body = request.body as { status?: string };
    
    if (!body.status) {
      return reply.error('VALIDATION_ERROR', '必须提供状态');
    }
    
    const gap = await updateSkillGapStatus(
      params.gapId,
      body.status as 'IDENTIFIED' | 'LEARNING' | 'MASTERED' | 'CLOSED'
    );
    
    if (!gap) {
      return reply.error('NOT_FOUND', '技能缺口不存在', 404);
    }
    
    return reply.ok(gap);
  });
}
