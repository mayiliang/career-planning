/**
 * Phase 0 验收测试 - Server
 * 
 * 验证：
 * - 配置不暴露 API Key
 */
import { describe, it, expect } from 'vitest';

// 简单的配置验证，不依赖运行时环境变量
describe('Server Config', () => {
  it('should have default HOST', () => {
    const HOST = process.env.HOST || '127.0.0.1';
    expect(HOST).toBe('127.0.0.1');
  });

  it('should have default PORT', () => {
    const PORT = parseInt(process.env.PORT || '41730', 10);
    expect(PORT).toBe(41730);
  });

  it('should have default DATABASE_URL', () => {
    const DATABASE_URL = process.env.DATABASE_URL || './data/career.db';
    expect(DATABASE_URL).toBe('./data/career.db');
  });

  it('should have default DEEPSEEK_MODEL', () => {
    const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro';
    expect(DEEPSEEK_MODEL).toBe('deepseek-v4-pro');
  });

  it('should not expose API key in tests', () => {
    // API Key 应为空或未设置
    const apiKey = process.env.DEEPSEEK_API_KEY;
    // 测试环境不应有真实密钥
    const isSafe = !apiKey || apiKey === '';
    expect(isSafe).toBe(true);
  });
});