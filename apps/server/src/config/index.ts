/**
 * 服务配置
 * 
 * Phase 1 实现：
 * - 从环境变量读取配置
 * - 安全的默认值
 * - API Key 不暴露给前端
 * - 数据目录配置
 */
import dotenv from 'dotenv';
import fs from 'node:fs';
import { dirname, resolve } from 'node:path';

function findProjectRoot(start = process.cwd()): string {
  let current = resolve(start);

  while (current !== dirname(current)) {
    if (fs.existsSync(resolve(current, 'pnpm-workspace.yaml'))) {
      return current;
    }
    current = dirname(current);
  }

  return resolve(start);
}

export const projectRoot = findProjectRoot();

// 加载环境变量
dotenv.config({ path: resolve(projectRoot, '.env.local') });

// 配置类型
export interface AppConfig {
  host: string;
  port: number;
  logLevel: string;
  dataDir: string;
  aiProvider?: string;
  aiBaseUrl?: string;
  aiModel?: string;
  aiTimeoutMs: number;
  isProduction: boolean;
}

// 获取配置
export function getConfig(): AppConfig {
  return {
    host: process.env.HOST || '127.0.0.1',
    port: parseInt(process.env.PORT || '41730', 10),
    logLevel: process.env.LOG_LEVEL || 'info',
    dataDir: resolve(projectRoot, process.env.DATA_DIR || './data'),
    aiProvider: process.env.AI_PROVIDER || undefined,
    aiBaseUrl: process.env.DEEPSEEK_BASE_URL || undefined,
    aiModel: process.env.DEEPSEEK_MODEL || undefined,
    aiTimeoutMs: parseInt(process.env.DEEPSEEK_TIMEOUT_MS || '120000', 10),
    isProduction: process.env.NODE_ENV === 'production',
  };
}

// 旧版配置对象（向后兼容）
export const config = {
  HOST: process.env.HOST || '127.0.0.1',
  PORT: parseInt(process.env.PORT || '41730', 10),
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  DATABASE_URL: process.env.DATABASE_URL || './data/career.db',
  DATA_DIR: resolve(projectRoot, process.env.DATA_DIR || './data'),
  AI_PROVIDER: process.env.AI_PROVIDER || 'deepseek',
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || '',
  DEEPSEEK_BASE_URL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
  DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro',
  DEEPSEEK_TIMEOUT_MS: parseInt(process.env.DEEPSEEK_TIMEOUT_MS || '120000', 10),
  isProduction: process.env.NODE_ENV === 'production',
};

// AI 是否配置（用于健康检查，不暴露密钥）
export function isAiConfigured(): boolean {
  return Boolean(config.DEEPSEEK_API_KEY && config.DEEPSEEK_API_KEY.length > 0);
}
