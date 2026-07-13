/**
 * API Client - 前端与本地服务的通信层
 * 
 * Phase 0 实现：
 * - 基础 fetch wrapper
 * - 健康检查 API
 * - 类型化响应处理
 */
import { z } from 'zod';

// API 基础 URL（Vite proxy 配置后可直接使用 /api）
const API_BASE = '/api/v1';

// 响应包装器 Schema
const ApiResponseSchema = z.object({
  data: z.unknown(),
  meta: z.object({
    requestId: z.string(),
  }),
});

const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
    retryable: z.boolean(),
  }),
  meta: z.object({
    requestId: z.string(),
  }),
});

// 健康检查响应 Schema
const HealthResponseSchema = z.object({
  ok: z.boolean(),
  db: z.boolean(),
  dataDir: z.boolean(),
  aiConfigured: z.boolean(),
  timestamp: z.string(),
});

// API 错误类型
export class ApiError extends Error {
  code: string;
  retryable: boolean;
  requestId: string;

  constructor(code: string, message: string, retryable: boolean, requestId: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.retryable = retryable;
    this.requestId = requestId;
  }
}

// 通用请求函数
async function request<T>(
  path: string,
  schema: z.ZodSchema<T>,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const json = await response.json();

  if (!response.ok) {
    const parsed = ApiErrorSchema.parse(json);
    throw new ApiError(
      parsed.error.code,
      parsed.error.message,
      parsed.error.retryable,
      parsed.meta.requestId
    );
  }

  const parsed = ApiResponseSchema.parse(json);
  return schema.parse(parsed.data);
}

// API Client 对象
export const apiClient = {
  // 健康检查
  async getHealth() {
    return request('/system/health', HealthResponseSchema);
  },
};