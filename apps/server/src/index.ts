/**
 * Career Atlas 服务入口
 *
 * Phase 1 实现：
 * - Fastify 服务绑定 127.0.0.1
 * - 健康检查 API
 * - 导入 API
 *
 * Phase 2 新增：
 * - 知识点 API
 *
 * Phase 3 新增：
 * - 日历 API
 *
 * Phase 4 新增：
 * - 知识图谱 API
 *
 * Phase 5 新增：
 * - 考核 API
 *
 * Phase 6 新增：
 * - 求职 API
 *
 * Phase 8 新增：
 * - 备份 API
 */
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerHealthRoutes } from './http/routes/health.js';
import { registerImportRoutes } from './http/routes/import.js';
import { knowledgeRoutes } from './http/routes/knowledge.js';
import { calendarRoutes } from './http/routes/calendar.js';
import { graphRoutes } from './http/routes/graph.js';
import { assessmentRoutes } from './http/routes/assessment.js';
import { jobsRoutes } from './http/routes/jobs.js';
import { backupRoutes } from './http/routes/backup.js';
import { getConfig } from './config/index.js';
import { checkDatabaseHealth, closeDatabase } from './db/index.js';
import { bootstrapLocalData, startAutomaticBackups } from './services/bootstrap.service.js';

const config = getConfig();

// 创建 Fastify 实例
const app = Fastify({
  logger: {
    level: config.logLevel,
  },
});

// Fastify 默认按 JSON Schema 编译路由；项目路由直接复用 Zod Schema。
// 在这里接入 Zod，避免把 Zod 对象误交给 AJV 导致服务启动失败。
app.setValidatorCompiler(({ schema: routeSchema }) => {
  return (data) => {
    const schema = routeSchema as {
      safeParse?: (input: unknown) =>
        | { success: true; data: unknown }
        | { success: false; error: Error };
    };

    if (typeof schema.safeParse !== 'function') {
      return { value: data };
    }

    const result = schema.safeParse(data);
    return result.success ? { value: result.data } : { error: result.error };
  };
});

// 响应结构由 reply.ok/reply.error 统一封装，序列化阶段不重复套用 Zod。
app.setSerializerCompiler(() => (data) => JSON.stringify(data));

// CORS 配置（只允许本地）
app.register(cors, {
  origin: ['http://127.0.0.1:41731', 'http://localhost:41731'],
  credentials: true,
});

// 响应格式统一
app.decorateReply('ok', function (data: unknown) {
  return this.send({
    data,
    meta: {
      requestId: this.request.id,
    },
  });
});

// 错误响应格式
app.decorateReply('error', function (code: string, message: string, statusCode = 400, details?: unknown) {
  return this.code(statusCode).send({
    error: {
      code,
      message,
      retryable: false,
      ...(details === undefined ? {} : { details }),
    },
    meta: {
      requestId: this.request.id,
    },
  });
});

// 注册路由
await registerHealthRoutes(app);
await registerImportRoutes(app);

// Phase 2: 知识点路由
await app.register(knowledgeRoutes, { prefix: '/api/v1/knowledge' });

// Phase 3: 日历路由
await app.register(calendarRoutes, { prefix: '/api/v1/calendar' });

// Phase 4: 知识图谱路由
await app.register(graphRoutes, { prefix: '/api/v1/knowledge' });

// Phase 5: 考核路由
await app.register(assessmentRoutes);

// Phase 6: 求职路由
await app.register(jobsRoutes);

// Phase 8: 备份路由
await app.register(backupRoutes);

// 启动服务
const start = async () => {
  try {
    if (process.env.AUTO_BOOTSTRAP !== 'false') {
      const result = await bootstrapLocalData();
      app.log.info(result, '本地数据初始化完成');
    }
    if (process.env.AUTO_BACKUP !== 'false') {
      await startAutomaticBackups();
    }

    // 检查数据库
    const dbHealth = checkDatabaseHealth();
    if (!dbHealth.ok) {
    app.log.error({ error: dbHealth.error }, '数据库检查失败');
    }

    // 本机运行默认绑定 127.0.0.1；Docker 中通过 HOST=0.0.0.0 允许容器网络访问。
    await app.listen({
      port: config.port,
      host: config.host,
    });

    console.log(`Career Atlas 服务已启动: http://${config.host}:${config.port}`);
  } catch (err) {
    app.log.error(err);
    closeDatabase();
    process.exit(1);
  }
};

// 优雅关闭
process.on('SIGTERM', async () => {
  app.log.info('收到 SIGTERM，准备关闭');
  await app.close();
  closeDatabase();
});

process.on('SIGINT', async () => {
  app.log.info('收到 SIGINT，准备关闭');
  await app.close();
  closeDatabase();
});

start();
