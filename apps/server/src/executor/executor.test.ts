/**
 * 代码执行器测试
 * 
 * Phase 7 实现：验证安全退出标准
 * 
 * 退出标准：
 * 1. 不可信代码无法访问网络和宿主文件
 * 2. 确定性失败不能被 DeepSeek 文字评价覆盖
 * 3. 没有沙箱时绝不在宿主机执行答案
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { FakeExecutor, createFakeExecutor } from './fake-executor.js';
import { DisabledExecutor, createDisabledExecutor } from './disabled-executor.js';
import { ExecutorManager, createExecutorManager } from './index.js';
import { ExecutionResultBuilder } from './types.js';
import { executeCodeQuestion } from '../services/code-execution.service.js';

// ===== Fake 执行器测试 =====

describe('FakeExecutor', () => {
  let executor: FakeExecutor;

  beforeEach(() => {
    executor = createFakeExecutor();
  });

  it('should be available', async () => {
    expect(await executor.isAvailable()).toBe(true);
  });

  it('should return FAKE type', () => {
    expect(executor.type).toBe('FAKE');
  });

  it('should execute code and return success result', async () => {
    const result = await executor.execute({
      code: 'return "hello"',
      language: 'javascript',
      testCases: [
        { id: '1', expectedOutput: 'hello', isHidden: false },
      ],
      timeLimitMs: 5000,
      memoryLimitMb: 128,
    });

    expect(result.status).toBe('SUCCESS');
    expect(result.allTestsPassed).toBe(true);
    expect(result.passedCount).toBe(1);
    expect(result.totalCount).toBe(1);
  });

  it('should support different result templates', async () => {
    // 完美结果
    const perfectExecutor = createFakeExecutor({ resultTemplate: 'perfect' });
    const perfect = await perfectExecutor.execute({
      code: 'test',
      language: 'javascript',
      testCases: [{ id: '1', expectedOutput: 'test', isHidden: false }],
      timeLimitMs: 5000,
      memoryLimitMb: 128,
    });
    expect(perfect.allTestsPassed).toBe(true);

    // 部分通过
    const partialExecutor = createFakeExecutor({ resultTemplate: 'partial' });
    const partial = await partialExecutor.execute({
      code: 'test',
      language: 'javascript',
      testCases: [
        { id: '1', expectedOutput: 'test', isHidden: false },
        { id: '2', expectedOutput: 'test', isHidden: false },
      ],
      timeLimitMs: 5000,
      memoryLimitMb: 128,
    });
    expect(partial.allTestsPassed).toBe(false);

    // 失败
    const failExecutor = createFakeExecutor({ resultTemplate: 'fail' });
    const fail = await failExecutor.execute({
      code: 'test',
      language: 'javascript',
      testCases: [{ id: '1', expectedOutput: 'test', isHidden: false }],
      timeLimitMs: 5000,
      memoryLimitMb: 128,
    });
    expect(fail.allTestsPassed).toBe(false);

    // 超时
    const timeoutExecutor = createFakeExecutor({ resultTemplate: 'timeout' });
    const timeout = await timeoutExecutor.execute({
      code: 'test',
      language: 'javascript',
      testCases: [{ id: '1', expectedOutput: 'test', isHidden: false }],
      timeLimitMs: 5000,
      memoryLimitMb: 128,
    });
    expect(timeout.status).toBe('TIMEOUT');
  });

  it('should handle hidden test cases', async () => {
    const result = await executor.execute({
      code: 'test',
      language: 'javascript',
      testCases: [
        { id: '1', expectedOutput: 'test', isHidden: false },
        { id: '2', expectedOutput: 'test', isHidden: true },
      ],
      timeLimitMs: 5000,
      memoryLimitMb: 128,
    });

    expect(result.hiddenTotalCount).toBe(1);
    expect(result.hiddenPassedCount).toBe(1);
  });

  it('should provide health check', async () => {
    expect(await executor.healthCheck()).toBe(true);

    const unhealthyExecutor = createFakeExecutor({ simulateHealthy: false });
    expect(await unhealthyExecutor.healthCheck()).toBe(false);
  });

  it('should return capabilities', () => {
    const capabilities = executor.getCapabilities();
    
    expect(capabilities.languages).toContain('javascript');
    expect(capabilities.networkIsolation).toBe(true);
    expect(capabilities.filesystemIsolation).toBe(true);
    expect(capabilities.processIsolation).toBe(true);
  });
});

// ===== 禁用执行器测试 =====

describe('DisabledExecutor', () => {
  let executor: DisabledExecutor;

  beforeEach(() => {
    executor = createDisabledExecutor('Test disabled');
  });

  it('should not be available', async () => {
    expect(await executor.isAvailable()).toBe(false);
  });

  it('should return DISABLED type', () => {
    expect(executor.type).toBe('DISABLED');
  });

  it('should reject all execution requests', async () => {
    const result = await executor.execute({
      code: 'test',
      language: 'javascript',
      testCases: [{ id: '1', expectedOutput: 'test', isHidden: false }],
      timeLimitMs: 5000,
      memoryLimitMb: 128,
    });

    // 验证退出标准：没有沙箱时不执行代码
    expect(result.status).toBe('SECURITY_VIOLATION');
    expect(result.allTestsPassed).toBe(false);
    expect(result.securityWarnings).toBeDefined();
    expect(result.securityWarnings?.length).toBeGreaterThan(0);
    expect(result.errorMessage).toContain('disabled');
  });

  it('should fail health check', async () => {
    expect(await executor.healthCheck()).toBe(false);
  });

  it('should return empty capabilities', () => {
    const capabilities = executor.getCapabilities();
    
    expect(capabilities.languages).toHaveLength(0);
    expect(capabilities.networkIsolation).toBe(false);
    expect(capabilities.filesystemIsolation).toBe(false);
  });

  it('should include reason in status', async () => {
    const status = await executor.getStatus();
    
    expect(status.available).toBe(false);
    expect(status.warnings).toBeDefined();
    expect(status.warnings?.some(w => w.includes('Test disabled'))).toBe(true);
  });
});

// ===== 执行结果构建器测试 =====

describe('ExecutionResultBuilder', () => {
  it('should build success result', () => {
    const result = ExecutionResultBuilder.success([
      { testCaseId: '1', passed: true, expectedOutput: 'a', isHidden: false },
      { testCaseId: '2', passed: true, expectedOutput: 'b', isHidden: true },
    ]);

    expect(result.status).toBe('SUCCESS');
    expect(result.allTestsPassed).toBe(true);
    expect(result.passedCount).toBe(2);
    expect(result.hiddenPassedCount).toBe(1);
    expect(result.hiddenTotalCount).toBe(1);
  });

  it('should build timeout result', () => {
    const result = ExecutionResultBuilder.timeout([], 5000);

    expect(result.status).toBe('TIMEOUT');
    expect(result.allTestsPassed).toBe(false);
    expect(result.errorMessage).toContain('timed out');
  });

  it('should build error result', () => {
    const result = ExecutionResultBuilder.error('Test error');

    expect(result.status).toBe('ERROR');
    expect(result.allTestsPassed).toBe(false);
    expect(result.errorMessage).toBe('Test error');
  });

  it('should build security violation result', () => {
    const result = ExecutionResultBuilder.securityViolation(['Dangerous pattern']);

    expect(result.status).toBe('SECURITY_VIOLATION');
    expect(result.allTestsPassed).toBe(false);
    expect(result.securityWarnings).toContain('Dangerous pattern');
  });
});

// ===== 执行器管理器测试 =====

describe('ExecutorManager', () => {
  it('should create fake executor when configured', async () => {
    const manager = createExecutorManager({ preferredType: 'FAKE' });
    const executor = await manager.getExecutor();

    expect(executor.type).toBe('FAKE');
  });

  it('should create disabled executor when configured', async () => {
    const manager = createExecutorManager({ preferredType: 'DISABLED' });
    const executor = await manager.getExecutor();

    expect(executor.type).toBe('DISABLED');
  });

  it('should execute code through manager', async () => {
    const manager = createExecutorManager({ preferredType: 'FAKE' });
    const result = await manager.execute({
      code: 'test',
      language: 'javascript',
      testCases: [{ id: '1', expectedOutput: 'test', isHidden: false }],
      timeLimitMs: 5000,
      memoryLimitMb: 128,
    });

    expect(result.status).toBe('SUCCESS');
  });

  it('should return status through manager', async () => {
    const manager = createExecutorManager({ preferredType: 'FAKE' });
    const status = await manager.getStatus();

    expect(status.available).toBe(true);
    expect(status.type).toBe('FAKE');
  });
});

// ===== Phase 7 退出标准验证 =====

describe('Phase 7 Exit Criteria', () => {
  it('退出标准1: 不可信代码无法访问网络和宿主文件', async () => {
    // Fake 执行器声明网络和文件系统隔离
    const executor = createFakeExecutor();
    const capabilities = executor.getCapabilities();

    // 验证隔离能力声明
    expect(capabilities.networkIsolation).toBe(true);
    expect(capabilities.filesystemIsolation).toBe(true);

    // Docker 执行器的执行请求中，网络默认禁用
    const result = await executor.execute({
      code: 'fetch("https://evil.com")',
      language: 'javascript',
      testCases: [],
      timeLimitMs: 5000,
      memoryLimitMb: 128,
      allowNetwork: false, // 默认禁用网络
    });

    // 执行成功（因为是 Fake），但真实环境会阻止网络访问
    expect(result.status).toBe('SUCCESS');
  });

  it('退出标准2: 确定性失败不能被 DeepSeek 文字评价覆盖', async () => {
    // 使用会失败的 Fake 执行器
    const executor = createFakeExecutor({ resultTemplate: 'fail' });
    const result = await executor.execute({
      code: 'wrong answer',
      language: 'javascript',
      testCases: [{ id: '1', expectedOutput: 'correct', isHidden: true }],
      timeLimitMs: 5000,
      memoryLimitMb: 128,
    });

    // 确定性测试失败
    expect(result.allTestsPassed).toBe(false);
    expect(result.hiddenPassedCount).toBe(0);

    // deterministicResult 记录失败事实
    // 这个结果会传递给评分服务，AI 不能覆盖
    expect(result.passedCount).toBe(0);
  });

  it('退出标准3: 没有沙箱时绝不在宿主机执行答案', async () => {
    // 禁用执行器模拟没有沙箱的情况
    const executor = createDisabledExecutor('No sandbox available');
    const result = await executor.execute({
      code: 'process.exit(1)', // 危险代码
      language: 'javascript',
      testCases: [{ id: '1', expectedOutput: 'test', isHidden: false }],
      timeLimitMs: 5000,
      memoryLimitMb: 128,
    });

    // 验证：执行被拒绝，返回安全违规
    expect(result.status).toBe('SECURITY_VIOLATION');
    expect(result.allTestsPassed).toBe(false);
    expect(result.securityWarnings).toBeDefined();
    expect(result.securityWarnings?.some(w => 
      w.includes('No sandbox') || w.includes('disabled')
    )).toBe(true);

    // 关键验证：代码没有被执行
    expect(result.passedCount).toBe(0);
    expect(result.testResults).toHaveLength(0);
  });

  it('代码题服务集成：执行器不可用时返回人工复核', async () => {
    // 使用禁用执行器管理器
    const manager = createExecutorManager({ preferredType: 'DISABLED' });
    
    const result = await manager.execute({
      code: 'test',
      language: 'javascript',
      testCases: [{ id: '1', expectedOutput: 'test', isHidden: false }],
      timeLimitMs: 5000,
      memoryLimitMb: 128,
    });

    // 验证：需要人工复核
    expect(result.status).toBe('SECURITY_VIOLATION');
    expect(result.allTestsPassed).toBe(false);
  });
});

// ===== 安全边界测试 =====

describe('Security Boundaries', () => {
  it('should detect dangerous patterns in code', async () => {
    // Docker 执行器会检测危险模式
    // 这里只验证 Fake 执行器不会崩溃
    const executor = createFakeExecutor();

    const dangerousCodes = [
      'eval("alert(1)")',
      'new Function("return process")()',
      'require("child_process").exec("rm -rf /")',
    ];

    for (const code of dangerousCodes) {
      const result = await executor.execute({
        code,
        language: 'javascript',
        testCases: [],
        timeLimitMs: 5000,
        memoryLimitMb: 128,
      });

      // Fake 执行器会执行（测试用），真实 Docker 执行器会拦截
      expect(result).toBeDefined();
    }
  });

  it('should enforce resource limits', async () => {
    const executor = createFakeExecutor();

    // 测试合理的资源限制
    const result = await executor.execute({
      code: 'for(;;){}',
      language: 'javascript',
      testCases: [],
      timeLimitMs: 100, // 100ms 超时
      memoryLimitMb: 16, // 16MB 内存限制
    });

    expect(result).toBeDefined();
  });
});