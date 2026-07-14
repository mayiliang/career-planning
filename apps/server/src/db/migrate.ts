/**
 * 数据库迁移脚本
 * 
 * Phase 1 实现：
 * - 运行 Drizzle Kit 生成的迁移
 * - 创建所有表和索引
 */
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { getConfig, projectRoot } from '../config/index.js';

const config = getConfig();
const dataDir = config.dataDir;
const dbPath = path.join(dataDir, 'career-atlas.db');
const migrationsFolder = path.join(projectRoot, 'apps/server/drizzle');

// 确保 data 目录存在
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

console.log('数据库路径:', dbPath);
console.log('迁移文件夹:', migrationsFolder);

// 创建连接
const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

const db = drizzle(sqlite);

// 运行迁移
try {
  migrate(db, { migrationsFolder });
  console.log('迁移成功');
} catch (error) {
  console.error('迁移失败:', error);
  throw error;
}

sqlite.close();
console.log('数据库连接已关闭');
