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
import { learningRoutes } from './http/routes/learning.js';
import { assistantRoutes } from './http/routes/assistant.js';
import { registerLocalWeb } from './http/local-web.js';
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

// 自主学习工作台、笔记中心、学习打卡与个人分支偏好
await app.register(learningRoutes);

// 全局学习助手：完整页面语境、站内资料、联网补充与知识缺口登记
await app.register(assistantRoutes);

// Windows 单机版显式设置 WEB_DIST_DIR 后，由同一个 Fastify 进程提供页面与 API。
// 开发环境和 Docker 双容器部署没有该变量，行为保持不变。
await registerLocalWeb(app, config.webDistDir);

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

let isClosing = false;
async function shutdown(reason: string, exitCode?: number) {
  if (isClosing) return;
  isClosing = true;
  app.log.info({ reason }, '准备关闭服务');
  await app.close();
  closeDatabase();
  if (exitCode !== undefined) process.exit(exitCode);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

// Playwright 在 Windows 上结束父 shell 后不会向子进程转发 POSIX 信号。
// 测试环境显式启用 stdin 生命周期，让 API 在测试运行器关闭管道时可靠退出。
if (process.env.EXIT_ON_STDIN_CLOSE === 'true') {
  process.stdin.resume();
  process.stdin.once('end', () => void shutdown('stdin-end', 0));
  process.stdin.once('close', () => void shutdown('stdin-close', 0));
}

start();
