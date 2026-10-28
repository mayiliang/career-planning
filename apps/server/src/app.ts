import Fastify from 'fastify';
import cors from '@fastify/cors';
import { getConfig, type AppConfig } from './config/index.js';
import { configureHttpContract } from './http/contract.js';
import { registerLocalWeb } from './http/local-web.js';
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

/** 组装可注入请求的应用；监听端口、备份任务和进程退出由入口负责。 */
export async function buildApp(config: AppConfig = getConfig()) {
  const app = Fastify({ logger: { level: config.logLevel } });
  configureHttpContract(app);
  app.register(cors, {
    origin: ['http://127.0.0.1:41731', 'http://localhost:41731'],
    credentials: true,
  });

  await registerHealthRoutes(app);
  await registerImportRoutes(app);
  await app.register(knowledgeRoutes, { prefix: '/api/v1/knowledge' });
  await app.register(calendarRoutes, { prefix: '/api/v1/calendar' });
  await app.register(graphRoutes, { prefix: '/api/v1/knowledge' });
  await app.register(assessmentRoutes);
  await app.register(jobsRoutes);
  await app.register(backupRoutes);
  await app.register(learningRoutes);
  await app.register(assistantRoutes);
  await registerLocalWeb(app, config.webDistDir);
  return app;
}
