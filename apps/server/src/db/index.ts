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
import { schema } from './schema.js';
import path from 'path';
import fs from 'fs';
import { getConfig } from '../config/index.js';

// 数据库路径
const config = getConfig();
const dataDir = config.dataDir;
const dbPath = path.join(dataDir, 'career-atlas.db');

// 确保 data 目录存在
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 创建 SQLite 连接
const sqlite = new Database(dbPath);

// 启用外键约束
sqlite.pragma('journal_mode = WAL'); // 写前日志模式，提升性能
sqlite.pragma('foreign_keys = ON');  // 启用外键约束

// 创建 Drizzle 实例
export const db = drizzle(sqlite, { schema });

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