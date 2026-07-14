/**
 * SQLite 数据库连接与 Drizzle ORM 配置
 * 
 * Phase 1 实现：
 * - 数据库连接绑定 127.0.0.1（本地优先）
 * - 启用外键约束
 * - 提供 Drizzle 查询接口
 */
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { schema } from './schema.js';
import path from 'path';
import fs from 'fs';
import { getConfig, projectRoot } from '../config/index.js';

// 数据库路径
const config = getConfig();
const dataDir = config.dataDir;
const dbPath = path.join(dataDir, 'career-atlas.db');

// 确保 data 目录存在
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 恢复操作先写入待恢复快照，服务重启且数据库尚未打开时再安全切换。
const pendingRestorePath = path.join(dataDir, 'restore-pending.db');
if (fs.existsSync(pendingRestorePath)) {
  if (fs.existsSync(dbPath)) {
    fs.copyFileSync(dbPath, `${dbPath}.pre-restore`);
  }
  for (const suffix of ['-wal', '-shm']) {
    const sidecarPath = `${dbPath}${suffix}`;
    if (fs.existsSync(sidecarPath)) fs.unlinkSync(sidecarPath);
  }
  fs.renameSync(pendingRestorePath, dbPath);
}

// 创建 SQLite 连接
const sqlite = new Database(dbPath);

// 启用外键约束
sqlite.pragma('journal_mode = WAL'); // 写前日志模式，提升性能
sqlite.pragma('foreign_keys = ON');  // 启用外键约束

// 每次启动自动执行幂等迁移，实现首次运行零手工初始化。
const database = drizzle(sqlite, { schema });
migrate(database, { migrationsFolder: path.join(projectRoot, 'apps/server/drizzle') });

// 创建 Drizzle 实例
export const db = database;

// 导出原始 SQLite 实例（用于特殊操作）
export const rawDb = sqlite;

// 关闭数据库连接（用于测试和清理）
export function closeDatabase(): void {
  sqlite.close();
}

// 检查数据库健康状态
export function checkDatabaseHealth(): { ok: boolean; error?: string } {
  try {
    // 检查是否能执行查询
    const result = sqlite.prepare('SELECT 1 as test').get();
    return { ok: result !== undefined };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

// 获取数据库路径
export function getDatabasePath(): string {
  return dbPath;
}
