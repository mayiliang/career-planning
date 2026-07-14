import { mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

const dataDir = join(tmpdir(), `career-atlas-tests-${process.pid}`);
mkdirSync(dataDir, { recursive: true });
process.env.DATA_DIR = dataDir;
process.env.NODE_ENV = 'test';

const sqlite = new Database(join(dataDir, 'career-atlas.db'));
migrate(drizzle(sqlite), { migrationsFolder: resolve(__dirname, '../../drizzle') });
sqlite.close();
