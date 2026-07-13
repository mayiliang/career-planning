/**
 * Drizzle Kit 配置
 * 
 * 用于生成迁移文件
 */
import { defineConfig } from 'drizzle-kit';
import path from 'path';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: path.join(process.cwd(), 'data/career-atlas.db'),
  },
});