/**
 * 代码执行沙箱 Schema 和 DTO
 * 
 * Phase 7 实现：安全的代码执行隔离
 * 
 * 安全原则：
 * 1. 没有沙箱时绝不在宿主机执行不可信代码
 * 2. 确定性测试失败不能被 AI 文字评价覆盖
 * 3. 执行结果必须是可验证的
 */
import { z } from 'zod';

// ===== 执行环境枚举 =====

export const ExecutorTypeSchema = z.enum([
  'DOCKER',      // Docker 容器隔离
  'PODMAN',      // Podman 容器隔离
  'FAKE',        // 假执行器（仅测试用）
  'DISABLED',    // 禁用执行（降级为人工复核）
]);

export type ExecutorType = z.infer<typeof ExecutorTypeSchema>;

// ===== 支持的语言 =====

export const SupportedLanguageSchema = z.enum([
  'javascript',
  'typescript',
]);

export type SupportedLanguage = z.infer<typeof SupportedLanguageSchema>;

// ===== 执行请求 Schema =====

export const CodeExecutionRequestSchema = z.object({
  // 代码内容
  code: z.string().max(100000), // 限制代码长度
  
  // 语言
  language: SupportedLanguageSchema,
  
  // 测试用例（隐藏）
  testCases: z.array(z.object({
    id: z.string(),
    input: z.string().optional(),
    expectedOutput: z.string(),
    isHidden: z.boolean().default(false), // 隐藏测试用例
  })).max(50),
  
  // 资源限制
  timeLimitMs: z.number().int().min(100).max(30000).default(5000), // 100ms-30s
  memoryLimitMb: z.number().int().min(16).max(512).default(128), // 16-512MB
  
  // 执行选项
  allowNetwork: z.boolean().default(false), // 默认禁止网络访问
  allowFileWrite: z.boolean().default(false), // 默认禁止文件写入
});

export type CodeExecutionRequest = z.infer<typeof CodeExecutionRequestSchema>;

// ===== 单个测试用例结果 =====

export const TestCaseResultSchema = z.object({
  testCaseId: z.string(),
  passed: z.boolean(),
  actualOutput: z.string().optional(),
  expectedOutput: z.string(),
  error: z.string().optional(),
  runtimeMs: z.number().optional(),
  isHidden: z.boolean(),
});

export type TestCaseResult = z.infer<typeof TestCaseResultSchema>;

// ===== 执行结果 Schema =====

export const CodeExecutionResultSchema = z.object({
  // 执行状态
  status: z.enum(['SUCCESS', 'TIMEOUT', 'ERROR', 'SECURITY_VIOLATION']),
  
  // 整体通过状态
  allTestsPassed: z.boolean(),
  
  // 测试用例结果
  testResults: z.array(TestCaseResultSchema),
  
  // 统计
  passedCount: z.number().int(),
  totalCount: z.number().int(),
  hiddenPassedCount: z.number().int(), // 隐藏测试通过数
  hiddenTotalCount: z.number().int(), // 隐藏测试总数
  
  // 执行信息
  totalRuntimeMs: z.number().optional(),
  peakMemoryMb: z.number().optional(),
  
  // 错误信息
  errorMessage: z.string().optional(),
  
  // 安全审计
  securityWarnings: z.array(z.string()).optional(),
});

export type CodeExecutionResult = z.infer<typeof CodeExecutionResultSchema>;

// ===== 执行器状态 Schema =====

export const ExecutorStatusSchema = z.object({
  available: z.boolean(),
  type: ExecutorTypeSchema,
  version: z.string().optional(),
  
  // 健康检查
  lastHealthCheck: z.string().optional(),
  healthy: z.boolean().optional(),
  
  // 资源限制
  maxTimeLimitMs: z.number(),
  maxMemoryLimitMb: z.number(),
  
  // 警告信息
  warnings: z.array(z.string()).optional(),
});

export type ExecutorStatus = z.infer<typeof ExecutorStatusSchema>;

// ===== 执行器能力声明 =====

export const ExecutorCapabilitiesSchema = z.object({
  // 支持的语言
  languages: z.array(SupportedLanguageSchema),
  
  // 资源限制范围
  minTimeLimitMs: z.number(),
  maxTimeLimitMs: z.number(),
  minMemoryLimitMb: z.number(),
  maxMemoryLimitMb: z.number(),
  
  // 安全能力
  networkIsolation: z.boolean(),
  filesystemIsolation: z.boolean(),
  processIsolation: z.boolean(),
  
  // 功能支持
  supportsHiddenTests: z.boolean(),
  supportsStdin: z.boolean(),
  supportsModules: z.boolean(),
});

export type ExecutorCapabilities = z.infer<typeof ExecutorCapabilitiesSchema>;

// ===== 预设测试用例模板 =====

// 基础 JavaScript 测试用例模板
export const JS_BASIC_TEST_TEMPLATE = {
  language: 'javascript' as const,
  testCases: [
    {
      id: 'basic-1',
      input: '',
      expectedOutput: 'test output',
      isHidden: false,
    },
  ],
  timeLimitMs: 5000,
  memoryLimitMb: 128,
  allowNetwork: false,
  allowFileWrite: false,
};

// TypeScript 测试用例模板
export const TS_BASIC_TEST_TEMPLATE = {
  language: 'typescript' as const,
  testCases: [
    {
      id: 'basic-1',
      input: '',
      expectedOutput: 'test output',
      isHidden: false,
    },
  ],
  timeLimitMs: 5000,
  memoryLimitMb: 128,
  allowNetwork: false,
  allowFileWrite: false,
};