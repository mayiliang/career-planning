/**
 * 代码执行器接口
 * 
 * Phase 7 实现：定义代码执行沙箱的统一接口
 * 
 * 安全原则：
 * - 没有沙箱时绝不执行不可信代码
 * - 执行器必须提供隔离保证
 * - 错误必须被安全捕获
 */
import type {
  CodeExecutionRequest,
  CodeExecutionResult,
  ExecutorStatus,
  ExecutorCapabilities,
} from '@career-atlas/shared';

/**
 * 代码执行器接口
 * 
 * 所有执行器必须实现此接口
 */
export interface CodeExecutor {
  /**
   * 执行器类型
   */
  readonly type: 'DOCKER' | 'PODMAN' | 'FAKE' | 'DISABLED';

  /**
   * 检查执行器是否可用
   */
  isAvailable(): Promise<boolean>;

  /**
   * 获取执行器状态
   */
  getStatus(): Promise<ExecutorStatus>;

  /**
   * 获取执行器能力声明
   */
  getCapabilities(): ExecutorCapabilities;

  /**
   * 执行代码
   * 
   * @param request 执行请求
   * @returns 执行结果
   * @throws Error 如果执行器不可用或安全违规
   */
  execute(request: CodeExecutionRequest): Promise<CodeExecutionResult>;

  /**
   * 健康检查
   */
  healthCheck(): Promise<boolean>;

  /**
   * 清理资源（可选）
   */
  cleanup?(): Promise<void>;
}

/**
 * 执行器配置
 */
export interface ExecutorConfig {
  // 执行器类型
  type?: 'DOCKER' | 'PODMAN' | 'FAKE' | 'DISABLED';

  // Docker/Podman 配置
  containerImage?: string;
  containerTimeout?: number;

  // 资源限制
  defaultTimeLimitMs?: number;
  defaultMemoryLimitMb?: number;

  // 安全配置
  allowNetwork?: boolean;
  allowFileWrite?: boolean;

  // 超时配置
  healthCheckTimeout?: number;
}

/**
 * 执行结果工厂
 */
export class ExecutionResultBuilder {
  /**
   * 创建成功结果
   */
  static success(
    testResults: CodeExecutionResult['testResults']
  ): CodeExecutionResult {
    const passedCount = testResults.filter(t => t.passed).length;
    const hiddenTests = testResults.filter(t => t.isHidden);
    
    return {
      status: 'SUCCESS',
      allTestsPassed: passedCount === testResults.length,
      testResults,
      passedCount,
      totalCount: testResults.length,
      hiddenPassedCount: hiddenTests.filter(t => t.passed).length,
      hiddenTotalCount: hiddenTests.length,
    };
  }

  /**
   * 创建超时结果
   */
  static timeout(
    testResults: CodeExecutionResult['testResults'],
    totalRuntimeMs: number
  ): CodeExecutionResult {
    return {
      status: 'TIMEOUT',
      allTestsPassed: false,
      testResults,
      passedCount: testResults.filter(t => t.passed).length,
      totalCount: testResults.length,
      hiddenPassedCount: 0,
      hiddenTotalCount: testResults.filter(t => t.isHidden).length,
      totalRuntimeMs,
      errorMessage: `Execution timed out after ${totalRuntimeMs}ms`,
    };
  }

  /**
   * 创建错误结果
   */
  static error(
    errorMessage: string,
    testResults: CodeExecutionResult['testResults'] = []
  ): CodeExecutionResult {
    return {
      status: 'ERROR',
      allTestsPassed: false,
      testResults,
      passedCount: 0,
      totalCount: testResults.length,
      hiddenPassedCount: 0,
      hiddenTotalCount: testResults.filter(t => t.isHidden).length,
      errorMessage,
    };
  }

  /**
   * 创建安全违规结果
   */
  static securityViolation(
    warnings: string[]
  ): CodeExecutionResult {
    return {
      status: 'SECURITY_VIOLATION',
      allTestsPassed: false,
      testResults: [],
      passedCount: 0,
      totalCount: 0,
      hiddenPassedCount: 0,
      hiddenTotalCount: 0,
      errorMessage: 'Security violation detected',
      securityWarnings: warnings,
    };
  }
}
