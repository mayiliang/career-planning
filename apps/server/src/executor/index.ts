/**
 * 代码执行器管理器
 * 
 * Phase 7 实现：根据配置和环境自动选择合适的执行器
 * 
 * 选择策略：
 * 1. 如果配置了 Docker 且可用，使用 Docker 执行器
 * 2. 如果配置了 Podman 且可用，使用 Podman 执行器（待实现）
 * 3. 如果是测试环境，使用 Fake 执行器
 * 4. 否则使用禁用执行器（安全降级）
 */
import type { CodeExecutor } from './types.js';
import type {
  CodeExecutionRequest,
  CodeExecutionResult,
  ExecutorStatus,
} from '@career-atlas/shared';
import { FakeExecutor, type FakeExecutorConfig } from './fake-executor.js';
import { DockerExecutor, type DockerExecutorConfig } from './docker-executor.js';
import { DisabledExecutor } from './disabled-executor.js';

export * from './types.js';
export * from './fake-executor.js';
export * from './docker-executor.js';
export * from './disabled-executor.js';

/**
 * 执行器管理器配置
 */
export interface ExecutorManagerConfig {
  // 首选执行器类型
  preferredType?: 'DOCKER' | 'PODMAN' | 'FAKE' | 'DISABLED';

  // Docker 配置
  docker?: DockerExecutorConfig;

  // Fake 配置（测试用）
  fake?: FakeExecutorConfig;

  // 是否自动检测可用执行器
  autoDetect?: boolean;
}

/**
 * 执行器管理器
 * 
 * 负责管理代码执行器的创建、选择和生命周期
 */
export class ExecutorManager {
  private config: ExecutorManagerConfig;
  private executor: CodeExecutor | null = null;
  private initialized = false;

  constructor(config: ExecutorManagerConfig = {}) {
    this.config = {
      preferredType: 'DISABLED',
      autoDetect: true,
      ...config,
    };
  }

  /**
   * 初始化执行器
   * 
   * 根据配置和环境自动选择合适的执行器
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // 根据首选类型创建执行器
    if (this.config.preferredType === 'FAKE') {
      this.executor = new FakeExecutor(this.config.fake);
      this.initialized = true;
      return;
    }

    if (this.config.preferredType === 'DISABLED') {
      this.executor = new DisabledExecutor('Executor disabled by configuration');
      this.initialized = true;
      return;
    }

    // 自动检测
    if (this.config.autoDetect) {
      this.executor = await this.detectAvailableExecutor();
    } else {
      this.executor = new DisabledExecutor('Auto-detection disabled');
    }

    this.initialized = true;
  }

  /**
   * 获取当前执行器
   */
  async getExecutor(): Promise<CodeExecutor> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.executor) {
      throw new Error('Executor not initialized');
    }

    return this.executor;
  }

  /**
   * 执行代码
   */
  async execute(request: CodeExecutionRequest): Promise<CodeExecutionResult> {
    const executor = await this.getExecutor();

    // 记录执行日志
    console.log('[ExecutorManager] Executing code:', {
      type: executor.type,
      language: request.language,
      testCount: request.testCases.length,
      timeLimit: request.timeLimitMs,
    });

    try {
      const result = await executor.execute(request);

      // 记录结果
      console.log('[ExecutorManager] Execution result:', {
        status: result.status,
        passed: result.allTestsPassed,
        passRate: `${result.passedCount}/${result.totalCount}`,
      });

      return result;
    } catch (error) {
      console.error('[ExecutorManager] Execution error:', error);

      // 执行失败，返回错误结果
      return {
        status: 'ERROR',
        allTestsPassed: false,
        testResults: [],
        passedCount: 0,
        totalCount: request.testCases.length,
        hiddenPassedCount: 0,
        hiddenTotalCount: request.testCases.filter(t => t.isHidden).length,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 获取执行器状态
   */
  async getStatus(): Promise<ExecutorStatus> {
    const executor = await this.getExecutor();
    return executor.getStatus();
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    const executor = await this.getExecutor();
    return executor.healthCheck();
  }

  // ===== 私有方法 =====

  /**
   * 检测可用的执行器
   */
  private async detectAvailableExecutor(): Promise<CodeExecutor> {
    // 尝试 Docker
    if (this.config.preferredType === 'DOCKER' || !this.config.preferredType) {
      const dockerExecutor = new DockerExecutor(this.config.docker);
      if (await dockerExecutor.isAvailable()) {
        console.log('[ExecutorManager] Docker executor available');
        return dockerExecutor;
      }
    }

    // Docker 不可用，降级为禁用执行器
    console.warn('[ExecutorManager] No sandbox available, using disabled executor');
    return new DisabledExecutor(
      'No sandbox environment available. Install Docker for code execution support.'
    );
  }
}

// ===== 单例管理 =====

let defaultManager: ExecutorManager | null = null;

/**
 * 获取默认执行器管理器
 */
export function getExecutorManager(): ExecutorManager {
  if (!defaultManager) {
    defaultManager = new ExecutorManager({
      preferredType: parseExecutorType(process.env.EXECUTOR_TYPE),
      autoDetect: process.env.EXECUTOR_AUTO_DETECT !== 'false',
    });
  }
  return defaultManager;
}

function parseExecutorType(value: string | undefined): ExecutorManagerConfig['preferredType'] {
  if (value === 'DOCKER' || value === 'PODMAN' || value === 'FAKE' || value === 'DISABLED') {
    return value;
  }
  return 'DISABLED';
}

/**
 * 创建执行器管理器
 */
export function createExecutorManager(config?: ExecutorManagerConfig): ExecutorManager {
  return new ExecutorManager(config);
}
