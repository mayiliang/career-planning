/**
 * Docker 代码执行器
 * 
 * Phase 7 实现：使用 Docker 容器隔离执行代码
 * 
 * 安全特性：
 * - 网络隔离（默认禁用）
 * - 文件系统隔离（只读挂载）
 * - 资源限制（CPU、内存、时间）
 * - 非特权容器
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
import { exec } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';

const execAsync = promisify(exec);

/**
 * Docker 执行器配置
 */
export interface DockerExecutorConfig extends ExecutorConfig {
  // Docker 镜像
  image?: string;

  // 数据目录
  dataDir?: string;

  // 执行超时
  executionTimeout?: number;
}

interface ResolvedDockerExecutorConfig {
  image: string;
  dataDir: string;
  executionTimeout: number;
  defaultTimeLimitMs: number;
  defaultMemoryLimitMb: number;
  allowNetwork: false;
  allowFileWrite: false;
  healthCheckTimeout: number;
}

/**
 * Docker 执行器
 * 
 * 使用 Docker 容器提供安全的代码执行环境
 */
export class DockerExecutor implements CodeExecutor {
  readonly type = 'DOCKER' as const;

  private config: ResolvedDockerExecutorConfig;
  private available: boolean | null = null;

  constructor(config: DockerExecutorConfig = {}) {
    this.config = {
      image: config.image || 'node:20-slim',
      dataDir: config.dataDir || '/tmp/career-atlas-executor',
      executionTimeout: config.executionTimeout || 35000,
      defaultTimeLimitMs: config.defaultTimeLimitMs || 5000,
      defaultMemoryLimitMb: config.defaultMemoryLimitMb || 128,
      allowNetwork: false,
      allowFileWrite: false,
      healthCheckTimeout: 5000,
    };
  }

  /**
   * 检查执行器是否可用
   */
  async isAvailable(): Promise<boolean> {
    if (this.available !== null) {
      return this.available;
    }

    try {
      // 检查 Docker 是否安装和运行
      const { stdout } = await execAsync('docker --version', {
        timeout: this.config.healthCheckTimeout,
      });

      if (stdout.includes('Docker')) {
        // 尝试拉取镜像
        await this.pullImageIfNeeded();
        this.available = true;
        return true;
      }
    } catch {
      // Docker 不可用
      this.available = false;
    }

    return false;
  }

  /**
   * 获取执行器状态
   */
  async getStatus(): Promise<ExecutorStatus> {
    const available = await this.isAvailable();

    return {
      available,
      type: 'DOCKER',
      version: available ? await this.getDockerVersion() : undefined,
      lastHealthCheck: new Date().toISOString(),
      healthy: available,
      maxTimeLimitMs: 30000,
      maxMemoryLimitMb: 512,
      warnings: available ? [] : ['Docker is not available'],
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
      networkIsolation: true,
      filesystemIsolation: true,
      processIsolation: true,
      supportsHiddenTests: true,
      supportsStdin: true,
      supportsModules: true,
    };
  }

  /**
   * 执行代码
   */
  async execute(request: CodeExecutionRequest): Promise<CodeExecutionResult> {
    // 检查可用性
    if (!(await this.isAvailable())) {
      throw new Error('Docker executor is not available');
    }

    // 安全检查：拒绝危险模式
    const securityWarnings = this.checkSecurity(request);
    if (securityWarnings.length > 0) {
      return ExecutionResultBuilder.securityViolation(securityWarnings);
    }

    const executionId = randomUUID();
    const workDir = join(this.config.dataDir, executionId);

    try {
      // 创建工作目录
      await mkdir(workDir, { recursive: true });

      // 准备代码文件
      const codeFile = request.language === 'typescript'
        ? 'code.ts'
        : 'code.js';
      await writeFile(join(workDir, codeFile), request.code);

      // 准备测试文件
      const testFile = 'tests.json';
      await writeFile(
        join(workDir, testFile),
        JSON.stringify(request.testCases, null, 2)
      );

      // 准备执行脚本
      const script = this.buildExecutionScript(request, codeFile, testFile);
      await writeFile(join(workDir, 'run.js'), script);

      // 执行 Docker 容器
      const result = await this.runInContainer(workDir, request);

      return result;
    } catch (error) {
      return ExecutionResultBuilder.error(
        error instanceof Error ? error.message : 'Unknown execution error'
      );
    } finally {
      // 清理工作目录
      try {
        await rm(workDir, { recursive: true, force: true });
      } catch {
        // 忽略清理错误
      }
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    return this.isAvailable();
  }

  // ===== 私有方法 =====

  private async getDockerVersion(): Promise<string> {
    try {
      const { stdout } = await execAsync('docker --version', {
        timeout: this.config.healthCheckTimeout,
      });
      const match = stdout.match(/Docker version ([\d.]+)/);
      return match?.[1] ?? 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private async pullImageIfNeeded(): Promise<void> {
    try {
      await execAsync(`docker image inspect ${this.config.image}`, {
        timeout: 10000,
      });
    } catch {
      // 镜像不存在，拉取
      await execAsync(`docker pull ${this.config.image}`, {
        timeout: 60000,
      });
    }
  }

  private checkSecurity(request: CodeExecutionRequest): string[] {
    const warnings: string[] = [];

    // 检查危险模式
    const dangerousPatterns = [
      /eval\s*\(/,
      /Function\s*\(/,
      /require\s*\(\s*['"]child_process['"]\s*\)/,
      /process\.exit/,
      /import\s+.*from\s+['"]child_process['"]/,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(request.code)) {
        warnings.push(`Potentially dangerous pattern detected: ${pattern.source}`);
      }
    }

    return warnings;
  }

  private buildExecutionScript(
    _request: CodeExecutionRequest,
    codeFile: string,
    testFile: string
  ): string {
    // 简化的执行脚本（实际实现需要更完善的测试框架）
    return `
const fs = require('fs');
const code = fs.readFileSync('${codeFile}', 'utf-8');
const tests = JSON.parse(fs.readFileSync('${testFile}', 'utf-8'));

// 执行代码并运行测试
const results = tests.map(test => {
  try {
    // 创建隔离的执行环境
    const fn = new Function('return (' + code + ')')();
    const output = String(fn(test.input || ''));
    return {
      testCaseId: test.id,
      passed: output === test.expectedOutput,
      actualOutput: output,
      expectedOutput: test.expectedOutput,
      isHidden: test.isHidden
    };
  } catch (e) {
    return {
      testCaseId: test.id,
      passed: false,
      error: e.message,
      expectedOutput: test.expectedOutput,
      isHidden: test.isHidden
    };
  }
});

console.log(JSON.stringify(results));
`;
  }

  private async runInContainer(
    workDir: string,
    request: CodeExecutionRequest
  ): Promise<CodeExecutionResult> {
    const containerName = `career-atlas-exec-${randomUUID()}`;
    const timeout = request.timeLimitMs + 5000; // 额外 5 秒缓冲

    try {
      // 构建 Docker 命令
      const dockerCmd = [
        'docker run --rm',
        `--name ${containerName}`,
        `--memory=${request.memoryLimitMb}m`,
        `--cpus=1`,
        `--network=${request.allowNetwork ? 'bridge' : 'none'}`,
        `-v "${workDir}:/workspace:ro"`,
        `-w /workspace`,
        this.config.image,
        'node run.js',
      ].join(' ');

      const { stdout } = await execAsync(dockerCmd, {
        timeout: Math.min(timeout, this.config.executionTimeout),
        maxBuffer: 1024 * 1024, // 1MB 输出缓冲
      });

      // 解析结果
      try {
        const testResults: TestCaseResult[] = JSON.parse(stdout);
        return ExecutionResultBuilder.success(testResults);
      } catch {
        return ExecutionResultBuilder.error(`Failed to parse output: ${stdout}`);
      }
    } catch (error) {
      // 处理超时
      if (error instanceof Error && error.message.includes('ETIMEDOUT')) {
        return ExecutionResultBuilder.timeout([], request.timeLimitMs);
      }

      return ExecutionResultBuilder.error(
        error instanceof Error ? error.message : 'Container execution failed'
      );
    }
  }
}

/**
 * 创建 Docker 执行器实例
 */
export function createDockerExecutor(config?: DockerExecutorConfig): DockerExecutor {
  return new DockerExecutor(config);
}
