/**
 * AI 模块入口
 * 
 * Phase 5 实现：Provider 工厂和配置
 */
import type { AIProvider } from './provider.js';
import { DeepSeekProvider } from './deepseek.js';
import { FakeProvider, type FakeProviderConfig } from './fake.js';

// ===== 导出 =====

export * from './provider.js';
export * from './deepseek.js';
export * from './fake.js';

// ===== 从环境变量读取配置 =====

function getEnvConfig() {
  return {
    // DeepSeek 配置
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
      model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro',
      timeout: parseInt(process.env.DEEPSEEK_TIMEOUT_MS || '120000', 10),
      maxRetries: parseInt(process.env.DEEPSEEK_MAX_RETRIES || '3', 10),
    },
    
    // Fake provider 配置（测试用）
    fake: {
      responseType: (process.env.FAKE_RESPONSE_TYPE || 'excellent') as FakeProviderConfig['responseType'],
      delay: parseInt(process.env.FAKE_DELAY || '0', 10),
    },
  };
}

// ===== Provider 工厂 =====

/**
 * 创建 Provider 实例
 * 
 * @param providerType - provider 类型，'deepseek' 或 'fake'
 * @returns AI Provider 实例
 */
export function createProvider(providerType: 'deepseek' | 'fake' = 'deepseek'): AIProvider {
  const config = getEnvConfig();
  
  if (providerType === 'fake') {
    return new FakeProvider(config.fake);
  }
  
  // DeepSeek provider
  if (!config.deepseek.apiKey) {
    throw new Error('DEEPSEEK_API_KEY environment variable is required');
  }
  
  return new DeepSeekProvider({
    name: 'deepseek',
    model: config.deepseek.model,
    baseUrl: config.deepseek.baseUrl,
    apiKey: config.deepseek.apiKey,
    timeout: config.deepseek.timeout,
    maxRetries: config.deepseek.maxRetries,
  });
}

// ===== Provider 状态检查 =====

export interface AIStatus {
  configured: boolean;
  provider: string;
  model: string;
  connectionOk?: boolean;
}

/**
 * 获取 AI Provider 状态
 * 
 * 注意：不返回 API Key
 */
export async function getAIStatus(): Promise<AIStatus> {
  const config = getEnvConfig();
  
  const status: AIStatus = {
    configured: !!config.deepseek.apiKey,
    provider: 'deepseek',
    model: config.deepseek.model,
  };
  
  if (status.configured) {
    try {
      const provider = createProvider('deepseek');
      status.connectionOk = await provider.testConnection();
    } catch {
      status.connectionOk = false;
    }
  }
  
  return status;
}
