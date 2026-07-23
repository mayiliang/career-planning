/**
 * 日历 API 路由
 * 
 * Phase 3: 日历、计划与打卡
 * 
 * 端点：
 * - GET /api/v1/calendar/events - 按日期范围查询事件
 * - POST /api/v1/calendar/events - 创建事件
 * - GET /api/v1/calendar/events/:id - 获取事件详情
 * - PATCH /api/v1/calendar/events/:id - 更新事件
 * - POST /api/v1/calendar/events/:id/checkins - 打卡
 * - POST /api/v1/calendar/events/:id/reschedule - 改期
 * - GET /api/v1/calendar/today - 获取今日计划
 * - POST /api/v1/calendar/plan/import - 从模板导入计划
 * - POST /api/v1/calendar/plan/preview - 预览模板导入
 */
import type { FastifyPluginCallback } from 'fastify';
import { z } from 'zod';
import { currentBeijingDate, planService } from '../../services/plan.service.js';
import { projectRoot } from '../../config/index.js';
import { join } from 'path';

// ===== Zod Schemas =====

const eventTypeSchema = z.enum([
  'LEARNING', 'ASSESSMENT', 'RETEST', 'PROJECT_OUTPUT',
  'JOB_APPLICATION', 'INTERVIEW', 'REVIEW'
]);

const eventStatusSchema = z.enum([
  'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'PARTIAL', 'SKIPPED', 'RESCHEDULED'
]);

const checkinResultSchema = z.enum(['COMPLETED', 'PARTIAL', 'SKIPPED', 'RESCHEDULED']);

const createEventSchema = z.object({
  eventType: eventTypeSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  allDay: z.boolean().optional().default(false),
  priority: z.number().int().min(1).max(5).optional().default(3),
  knowledgePointId: z.string().uuid().optional(),
  jobId: z.string().uuid().optional(),
  assessmentSessionId: z.string().uuid().optional(),
});

const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  priority: z.number().int().min(1).max(5).optional(),
  status: eventStatusSchema.optional(),
});

const checkinSchema = z.object({
  result: checkinResultSchema,
  actualMinutes: z.number().int().min(0).max(1440).optional(),
  noteMd: z.string().max(2000).optional(),
  energyLevel: z.number().int().min(1).max(5).optional(),
  difficultyLevel: z.number().int().min(1).max(5).optional(),
});

const rescheduleSchema = z.object({
  newStartAt: z.string().datetime(),
  newEndAt: z.string().datetime(),
});

const planImportSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  templatePath: z.string().optional(),
});

const dailyReviewSchema = z.object({
  summaryMd: z.string().trim().min(1).max(5000),
});

const leaveSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().trim().max(300).optional(),
});

const eventsQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  eventType: eventTypeSchema.optional(),
  status: eventStatusSchema.optional(),
});

// ===== API 响应类型 =====

interface ApiResponse<T> {
  data: T;
  meta: {
    requestId: string;
  };
}

interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    retryable: boolean;
  };
  meta: {
    requestId: string;
  };
}

// ===== 路由插件 =====

export const calendarRoutes: FastifyPluginCallback = (app, _opts, done) => {
  // 路由前缀已由主应用设置
  
  // ===== 事件查询 =====
  
  /**
   * GET /api/v1/calendar/events
   * 按日期范围查询事件
   */
  app.get('/events', {
    schema: {
      querystring: eventsQuerySchema,
    },
  }, async (request, reply) => {
    const { from, to, eventType, status } = request.query as z.infer<typeof eventsQuerySchema>;
    
    const events = await planService.getEvents({
      from: new Date(from).toISOString(),
      to: new Date(to).toISOString(),
      eventType,
      status,
    });
    
    return reply.send({
      data: events,
      meta: { requestId: request.id },
    } as ApiResponse<typeof events>);
  });
  
  /**
   * GET /api/v1/calendar/events/:id
   * 获取事件详情
   */
  app.get('/events/:id', {
    schema: {
      params: z.object({
        id: z.string().uuid(),
      }),
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const event = await planService.getEvent(id);
    
    if (!event) {
      return reply.status(404).send({
        error: {
          code: 'NOT_FOUND',
          message: '事件不存在',
          retryable: false,
        },
        meta: { requestId: request.id },
      } as ApiErrorResponse);
    }
    
    return reply.send({
      data: event,
      meta: { requestId: request.id },
    } as ApiResponse<typeof event>);
  });
  
  /**
   * POST /api/v1/calendar/events
   * 创建事件
   */
  app.post('/events', {
    schema: {
      body: createEventSchema,
    },
  }, async (request, reply) => {
    const data = request.body as z.infer<typeof createEventSchema>;
    
    const event = await planService.createEvent({
      ...data,
      sourceType: 'USER',
    });
    
    return reply.status(201).send({
      data: event,
      meta: { requestId: request.id },
    } as ApiResponse<typeof event>);
  });
  
  /**
   * PATCH /api/v1/calendar/events/:id
   * 更新事件
   */
  app.patch('/events/:id', {
    schema: {
      params: z.object({
        id: z.string().uuid(),
      }),
      body: updateEventSchema,
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as z.infer<typeof updateEventSchema>;
    
    const event = await planService.updateEvent(id, data);
    
    if (!event) {
      return reply.status(404).send({
        error: {
          code: 'NOT_FOUND',
          message: '事件不存在',
          retryable: false,
        },
        meta: { requestId: request.id },
      } as ApiErrorResponse);
    }
    
    return reply.send({
      data: event,
      meta: { requestId: request.id },
    } as ApiResponse<typeof event>);
  });
  
  /**
   * POST /api/v1/calendar/events/:id/checkins
   * 打卡
   */
  app.post('/events/:id/checkins', {
    schema: {
      params: z.object({
        id: z.string().uuid(),
      }),
      body: checkinSchema,
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as z.infer<typeof checkinSchema>;
    
    try {
      const result = await planService.checkin(id, data);
      
      return reply.send({
        data: result,
        meta: { requestId: request.id },
      } as ApiResponse<typeof result>);
    } catch {
      return reply.status(404).send({
        error: {
          code: 'NOT_FOUND',
          message: '事件不存在',
          retryable: false,
        },
        meta: { requestId: request.id },
      } as ApiErrorResponse);
    }
  });
  
  /**
   * POST /api/v1/calendar/events/:id/reschedule
   * 改期
   */
  app.post('/events/:id/reschedule', {
    schema: {
      params: z.object({
        id: z.string().uuid(),
      }),
      body: rescheduleSchema,
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { newStartAt, newEndAt } = request.body as z.infer<typeof rescheduleSchema>;
    
    try {
      const result = await planService.reschedule(id, newStartAt, newEndAt);
      
      return reply.send({
        data: result,
        meta: { requestId: request.id },
      } as ApiResponse<typeof result>);
    } catch {
      return reply.status(404).send({
        error: {
          code: 'NOT_FOUND',
          message: '事件不存在',
          retryable: false,
        },
        meta: { requestId: request.id },
      } as ApiErrorResponse);
    }
  });
  
  // ===== 今日计划 =====
  
  /**
   * GET /api/v1/calendar/today
   * 获取今日计划
   */
  app.get('/today', {
    schema: {
      querystring: z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      }),
    },
  }, async (request, reply) => {
    const { date } = request.query as { date?: string };
    const today = date ?? currentBeijingDate();
    
    const result = await planService.getTodayPlan(today);
    
    return reply.send({
      data: result,
      meta: { requestId: request.id },
    } as ApiResponse<typeof result>);
  });
  
  // ===== 计划导入 =====
  
  /**
   * POST /api/v1/calendar/plan/preview
   * 预览模板导入
   */
  app.post('/plan/preview', {
    schema: {
      body: planImportSchema,
    },
  }, async (request, reply) => {
    const { startDate, templatePath } = request.body as z.infer<typeof planImportSchema>;
    
    // 默认模板路径
    const defaultTemplatePath = join(projectRoot, 'templates', 'learning-tracker-template.csv');
    const path = templatePath ?? defaultTemplatePath;
    
    try {
      const preview = await planService.previewFromTemplate(path, { startDate });
      
      return reply.send({
        data: preview,
        meta: { requestId: request.id },
      } as ApiResponse<typeof preview>);
    } catch {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: '无法读取模板文件',
          details: { path },
          retryable: false,
        },
        meta: { requestId: request.id },
      } as ApiErrorResponse);
    }
  });
  
  /**
   * POST /api/v1/calendar/plan/import
   * 执行模板导入
   */
  app.post('/plan/import', {
    schema: {
      body: planImportSchema,
    },
  }, async (request, reply) => {
    const { startDate, templatePath } = request.body as z.infer<typeof planImportSchema>;
    
    // 默认模板路径
    const defaultTemplatePath = join(projectRoot, 'templates', 'learning-tracker-template.csv');
    const path = templatePath ?? defaultTemplatePath;
    
    try {
      const result = await planService.importFromTemplate(path, { startDate });
      
      return reply.send({
        data: {
          imported: result.imported,
          eventIds: result.events.map(e => e.id),
        },
        meta: { requestId: request.id },
      } as ApiResponse<{ imported: number; eventIds: string[] }>);
    } catch {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: '导入失败',
          retryable: true,
        },
        meta: { requestId: request.id },
      } as ApiErrorResponse);
    }
  });
  
  app.put('/reviews/daily/:date', {
    schema: { body: dailyReviewSchema },
  }, async (request, reply) => {
    const { date } = request.params as { date: string };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return reply.error('VALIDATION_ERROR', '日期格式必须为 YYYY-MM-DD');
    }
    const body = dailyReviewSchema.parse(request.body);
    return reply.ok(await planService.saveDailyReview(date, body.summaryMd));
  });

  app.get('/leaves', {
    schema: {
      querystring: z.object({
        from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    },
  }, async (request, reply) => {
    const { from, to } = request.query as { from: string; to: string };
    return reply.ok(await planService.getLeaveDays(from, to));
  });

  app.post('/leaves', {
    schema: { body: leaveSchema },
  }, async (request, reply) => {
    const body = leaveSchema.parse(request.body);
    try {
      return reply.ok(await planService.takeLeave(body.date, body.reason));
    } catch (error) {
      return reply.error('LEAVE_CONFLICT', error instanceof Error ? error.message : '请假失败', 409);
    }
  });

  done();
};
