/**
 * Fake 代码执行器
 * 
 * Phase 7 实现：用于测试的假执行器
 * 
 * 安全特性：
 * - 不执行任何真实代码
 * - 返回预设结果
 * - 支持各种测试场景模拟
 */
import type { CodeExecutor, ExecutorConfig } from './types.js';
import type {
  CodeExecutionRequest,
  CodeExecutionResult,
  ExecutorStatus,
  ExecutorCapabilities,
  TestCaseResult,
} from '@career-atlas/shared';
import { ExecutionResultBuilder } from './types.js';

/**
 * 预设结果模板
 */
export type FakeResultTemplate = 'perfect' | 'partial' | 'fail' | 'timeout' | 'error';

/**
 * Fake 执行器配置
 */
export interface FakeExecutorConfig extends ExecutorConfig {
  // 预设结果模板
  resultTemplate?: FakeResultTemplate;

  // 模拟延迟（毫秒）
  simulatedDelayMs?: number;

  // 是否模拟健康状态
  simulateHealthy?: boolean;

  // 是否抛出错误
  shouldThrow?: boolean;
}

/**
 * Fake 执行器
 * 
 * 用于测试，不执行真实代码
 */
export class FakeExecutor implements CodeExecutor {
  readonly type = 'FAKE' as const;

  private config: FakeExecutorConfig;

  constructor(config: FakeExecutorConfig = {}) {
    this.config = {
      resultTemplate: 'perfect',
      simulatedDelayMs: 10,
      simulateHealthy: true,
      shouldThrow: false,
      ...config,
    };
  }

  /**
   * 检查执行器是否可用
   */
  async isAvailable(): Promise<boolean> {
    return true; // Fake 执行器始终可用
  }

  /**
   * 获取执行器状态
   */
  async getStatus(): Promise<ExecutorStatus> {
    return {
      available: true,
      type: 'FAKE',
      version: '1.0.0-fake',
      lastHealthCheck: new Date().toISOString(),
      healthy: this.config.simulateHealthy ?? true,
      maxTimeLimitMs: 30000,
      maxMemoryLimitMb: 512,
      warnings: ['This is a fake executor for testing only'],
    };
  }

  /**
   * 获取执行器能力声明
   */
  getCapabilities(): ExecutorCapabilities {
    return {
      languages: ['javascript', 'typescript'],
      minTimeLimitMs: 100,
      maxTimeLimitMs: 30000,
      minMemoryLimitMb: 16,
      maxMemoryLimitMb: 512,
      networkIsolation: true, // 假的隔离保证
      filesystemIsolation: true,
      processIsolation: true,
      supportsHiddenTests: true,
      supportsStdin: true,
      supportsModules: false, // Fake 不支持真实模块
    };
  }

  /**
   * 执行代码（假执行）
   */
  async execute(request: CodeExecutionRequest): Promise<CodeExecutionResult> {
    // 模拟延迟
    if (this.config.simulatedDelayMs && this.config.simulatedDelayMs > 0) {
      await this.delay(this.config.simulatedDelayMs);
    }

    // 模拟抛出错误
    if (this.config.shouldThrow) {
      throw new Error('Fake executor simulated error');
    }

    // 根据模板返回结果
    switch (this.config.resultTemplate) {
      case 'perfect':
        return this.generatePerfectResult(request);
      case 'partial':
        return this.generatePartialResult(request);
      case 'fail':
        return this.generateFailResult(request);
      case 'timeout':
        return ExecutionResultBuilder.timeout([], request.timeLimitMs);
      case 'error':
        return ExecutionResultBuilder.error('Fake executor simulated error');
      default:
        return this.generatePerfectResult(request);
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    return this.config.simulateHealthy ?? true;
  }

  // ===== 私有方法 =====

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 生成完美结果（所有测试通过）
   */
  private generatePerfectResult(request: CodeExecutionRequest): CodeExecutionResult {
    const testResults: TestCaseResult[] = request.testCases.map(tc => ({
      testCaseId: tc.id,
      passed: true,
      actualOutput: tc.expectedOutput,
      expectedOutput: tc.expectedOutput,
      runtimeMs: Math.floor(Math.random() * 100) + 1,
      isHidden: tc.isHidden,
    }));

    return ExecutionResultBuilder.success(testResults);
  }

  /**
   * 生成部分通过结果
   */
  private generatePartialResult(request: CodeExecutionRequest): CodeExecutionResult {
    const testResults: TestCaseResult[] = request.testCases.map((tc, index) => ({
      testCaseId: tc.id,
      passed: index % 2 === 0, // 交替通过/失败
      actualOutput: index % 2 === 0 ? tc.expectedOutput : `wrong output for ${tc.id}`,
      expectedOutput: tc.expectedOutput,
      runtimeMs: Math.floor(Math.random() * 100) + 1,
      isHidden: tc.isHidden,
    }));

    return ExecutionResultBuilder.success(testResults);
  }

  /**
   * 生成全部失败结果
   */
  private generateFailResult(request: CodeExecutionRequest): CodeExecutionResult {
    const testResults: TestCaseResult[] = request.testCases.map(tc => ({
      testCaseId: tc.id,
      passed: false,
      actualOutput: `wrong output for ${tc.id}`,
      expectedOutput: tc.expectedOutput,
      error: 'Test assertion failed',
      runtimeMs: Math.floor(Math.random() * 100) + 1,
      isHidden: tc.isHidden,
    }));

    return ExecutionResultBuilder.success(testResults);
  }
}

/**
 * 创建 Fake 执行器实例
 */
export function createFakeExecutor(config?: FakeExecutorConfig): FakeExecutor {
  return new FakeExecutor(config);
}