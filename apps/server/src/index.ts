/**
 * Career Atlas 服务入口
 * 
 * Phase 1 实现：
 * - Fastify 服务绑定 127.0.0.1
 * - 健康检查 API
 * - 导入 API
 */
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerHealthRoutes } from './http/routes/health.js';
import { registerImportRoutes } from './http/routes/import.js';
import { getConfig } from './config/index.js';
import { checkDatabaseHealth, closeDatabase } from './db/index.js';

const config = getConfig();

// 创建 Fastify 实例
const app = Fastify({
  logger: {
    level: config.logLevel,
  },
});

// CORS 配置（只允许本地）
app.register(cors, {
  origin: ['http://127.0.0.1:41731', 'http://localhost:41731'],
  credentials: true,
});

// 响应格式统一
app.decorateReply('success', function (data: unknown) {
  return this.send({
    data,
    meta: {
      requestId: this.request.id,
    },
  });
});

// 注册路由
await registerHealthRoutes(app);
await registerImportRoutes(app);

// 启动服务
const start = async () => {
  try {
    // 检查数据库
    const dbHealth = checkDatabaseHealth();
    if (!dbHealth.ok) {
      app.log.error('数据库检查失败:', dbHealth.error);
    }
    
    // 启动服务（只绑定本地）
    await app.listen({
      port: config.port,
      host: '127.0.0.1', // 安全：只监听本地
    });
    
    console.log(`Career Atlas 服务已启动: http://127.0.0.1:${config.port}`);
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