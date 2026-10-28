/** 进程入口：初始化本地数据、启动后台任务并管理关闭顺序。 */
import { buildApp } from './app.js';
import { getConfig } from './config/index.js';
import { checkDatabaseHealth, closeDatabase } from './db/index.js';
import { bootstrapLocalData, startAutomaticBackups } from './services/bootstrap.service.js';
import { recoverInterruptedGradings } from './services/grading.service.js';

const config = getConfig();
const app = await buildApp(config);
let stopBackups: (() => Promise<void>) | undefined;
let shutdownPromise: Promise<void> | undefined;

function shutdown(reason: string): Promise<void> {
  if (shutdownPromise) return shutdownPromise;
  shutdownPromise = (async () => {
    app.log.info({ reason }, '准备关闭服务');
    try {
      await stopBackups?.();
      await app.close();
    } finally {
      closeDatabase();
    }
  })();
  return shutdownPromise;
}

function handleShutdown(reason: string, exitCode?: number) {
  void shutdown(reason).then(
    () => { if (exitCode !== undefined) process.exit(exitCode); },
    (err: unknown) => {
      app.log.error({ err }, '关闭服务失败');
      process.exitCode = 1;
      if (exitCode !== undefined) process.exit(1);
    },
  );
}

process.once('SIGTERM', () => handleShutdown('SIGTERM'));
process.once('SIGINT', () => handleShutdown('SIGINT'));

// Windows 测试进程关闭输入管道时，主动退出，避免遗留后台服务。
if (process.env.EXIT_ON_STDIN_CLOSE === 'true') {
  process.stdin.resume();
  process.stdin.once('end', () => handleShutdown('stdin-end', 0));
  process.stdin.once('close', () => handleShutdown('stdin-close', 0));
}

async function start() {
  try {
    const recovered = recoverInterruptedGradings();
    if (recovered > 0) app.log.warn({ recovered }, '已恢复上次中断的评分任务，可重新发起判题');
    if (process.env.AUTO_BOOTSTRAP !== 'false') {
      app.log.info(await bootstrapLocalData(), '本地数据初始化完成');
    }
    if (process.env.AUTO_BACKUP !== 'false') {
      stopBackups = await startAutomaticBackups((err) => app.log.error({ err }, '自动备份失败'));
    }
    const health = checkDatabaseHealth();
    if (!health.ok) throw new Error(health.error || '数据库检查失败');
    await app.listen({ port: config.port, host: config.host });
  } catch (err) {
    app.log.error({ err }, '启动服务失败');
    handleShutdown('startup-failed', 1);
  }
}

void start();
