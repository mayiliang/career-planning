import { mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

// Vitest 的 worker 线程共用 process.pid；若只按 PID 建库，多个 setupFiles
// 会并发迁移同一 SQLite 文件，新增列时可触发 duplicate column。
const workerId = process.env.VITEST_POOL_ID ?? process.env.VITEST_WORKER_ID ?? '0';
const dataDir = join(tmpdir(), `career-atlas-tests-${process.pid}-${workerId}`);
mkdirSync(dataDir, { recursive: true });
process.env.DATA_DIR = dataDir;
process.env.NODE_ENV = 'test';

const sqlite = new Database(join(dataDir, 'career-atlas.db'));
migrate(drizzle(sqlite), { migrationsFolder: resolve(__dirname, '../../drizzle') });
sqlite.close();
