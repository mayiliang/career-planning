/**
 * 禁用执行器
 * 
 * Phase 7 实现：当没有沙箱可用时的安全降级方案
 * 
 * 安全原则：
 * - 绝不在宿主机执行不可信代码
 * - 明确告知用户执行器不可用
 * - 自动降级为人工复核
 */
import type { CodeExecutor } from './types.js';
import type {
  CodeExecutionRequest,
  CodeExecutionResult,
  ExecutorStatus,
  ExecutorCapabilities,
} from '@career-atlas/shared';

/**
 * 禁用执行器
 * 
 * 当没有安全的执行环境可用时使用此执行器
 * 所有执行请求都会返回 DISABLED 状态
 */
export class DisabledExecutor implements CodeExecutor {
  readonly type = 'DISABLED' as const;

  private reason: string;

  constructor(reason?: string) {
    this.reason = reason || 'No sandbox available';
  }

  /**
   * 检查执行器是否可用
   */
  async isAvailable(): Promise<boolean> {
    return false; // 禁用执行器永远不可用
  }

  /**
   * 获取执行器状态
   */
  async getStatus(): Promise<ExecutorStatus> {
    return {
      available: false,
      type: 'DISABLED',
      version: '1.0.0-disabled',
      lastHealthCheck: new Date().toISOString(),
      healthy: false,
      maxTimeLimitMs: 0,
      maxMemoryLimitMb: 0,
      warnings: [
        this.reason,
        'Code execution is disabled for security reasons',
        'Assessment will require manual review for code questions',
      ],
    };
  }

  /**
   * 获取执行器能力声明
   */
  getCapabilities(): ExecutorCapabilities {
    return {
      languages: [],
      minTimeLimitMs: 0,
      maxTimeLimitMs: 0,
      minMemoryLimitMb: 0,
      maxMemoryLimitMb: 0,
      networkIsolation: false,
      filesystemIsolation: false,
      processIsolation: false,
      supportsHiddenTests: false,
      supportsStdin: false,
      supportsModules: false,
    };
  }

  /**
   * 执行代码（直接拒绝）
   */
  async execute(request: CodeExecutionRequest): Promise<CodeExecutionResult> {
    // 记录拒绝日志
    console.warn('[DisabledExecutor] Code execution request rejected:', {
      reason: this.reason,
      language: request.language,
      testCaseCount: request.testCases.length,
    });

    // 返回安全违规结果，触发人工复核
    return {
      status: 'SECURITY_VIOLATION',
      allTestsPassed: false,
      testResults: [],
      passedCount: 0,
      totalCount: request.testCases.length,
      hiddenPassedCount: 0,
      hiddenTotalCount: request.testCases.filter(t => t.isHidden).length,
      errorMessage: `Code execution is disabled: ${this.reason}`,
      securityWarnings: [
        'No sandbox available for safe code execution',
        'This assessment will require manual review',
      ],
    };
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    return false;
  }

  /**
   * 获取禁用原因
   */
  getReason(): string {
    return this.reason;
  }
}

/**
 * 创建禁用执行器实例
 */
export function createDisabledExecutor(reason?: string): DisabledExecutor {
  return new DisabledExecutor(reason);
}
