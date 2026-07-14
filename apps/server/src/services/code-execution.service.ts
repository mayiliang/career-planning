/**
 * 代码题评分服务
 * 
 * Phase 7 实现：处理代码题的安全执行和确定性测试
 * 
 * 安全原则：
 * 1. 代码必须在沙箱中执行
 * 2. 执行失败不能被 AI 覆盖
 * 3. 没有沙箱时降级为人工复核
 */
import type { CodeExecutionResult, DeterministicResult } from '@career-atlas/shared';
import { getExecutorManager } from '../executor/index.js';

// ===== 代码题执行请求 =====

export interface CodeQuestionExecutionRequest {
  // 题目 ID
  questionId: string;

  // 用户代码
  code: string;

  // 语言
  language: 'javascript' | 'typescript';

  // 测试用例（从题目内容解析）
  testCases: Array<{
    id: string;
    input?: string;
    expectedOutput: string;
    isHidden: boolean;
  }>;

  // 资源限制
  timeLimitMs?: number;
  memoryLimitMb?: number;
}

// ===== 代码题执行结果 =====

export interface CodeQuestionExecutionResult {
  // 题目 ID
  questionId: string;

  // 执行是否成功
  executionSuccess: boolean;

  // 所有测试是否通过
  allTestsPassed: boolean;

  // 确定性测试结果（用于评分）
  deterministicResult: DeterministicResult;

  // 详细结果
  details: CodeExecutionResult;

  // 是否需要人工复核
  needsManualReview: boolean;

  // 复核原因
  manualReviewReason?: string;
}

/**
 * 执行代码题
 * 
 * 在沙箱中安全执行用户提交的代码
 */
export async function executeCodeQuestion(
  request: CodeQuestionExecutionRequest
): Promise<CodeQuestionExecutionResult> {
  const executorManager = getExecutorManager();

  // 检查执行器状态
  const status = await executorManager.getStatus();

  // 如果执行器不可用，直接降级为人工复核
  if (!status.available) {
    return {
      questionId: request.questionId,
      executionSuccess: false,
      allTestsPassed: false,
      deterministicResult: {
        passed: false,
        error: 'Code executor not available',
      },
      details: {
        status: 'ERROR',
        allTestsPassed: false,
        testResults: [],
        passedCount: 0,
        totalCount: request.testCases.length,
        hiddenPassedCount: 0,
        hiddenTotalCount: request.testCases.filter(t => t.isHidden).length,
        errorMessage: status.warnings?.join('; ') || 'No sandbox available',
      },
      needsManualReview: true,
      manualReviewReason: 'No sandbox environment available for code execution',
    };
  }

  try {
    // 执行代码
    const result = await executorManager.execute({
      code: request.code,
      language: request.language,
      testCases: request.testCases,
      timeLimitMs: request.timeLimitMs || 5000,
      memoryLimitMb: request.memoryLimitMb || 128,
      allowNetwork: false,
      allowFileWrite: false,
    });

    // 构建确定性结果
    const deterministicResult: DeterministicResult = {
      passed: result.allTestsPassed && result.status === 'SUCCESS',
      output: JSON.stringify({
        passed: result.passedCount,
        total: result.totalCount,
        hiddenPassed: result.hiddenPassedCount,
        hiddenTotal: result.hiddenTotalCount,
      }),
      error: result.errorMessage,
      runtimeMs: result.totalRuntimeMs,
    };

    // 判断是否需要人工复核
    const needsManualReview =
      result.status === 'SECURITY_VIOLATION' ||
      result.status === 'ERROR' ||
      (result.status === 'SUCCESS' && !result.allTestsPassed && result.hiddenPassedCount === 0);

    return {
      questionId: request.questionId,
      executionSuccess: result.status === 'SUCCESS',
      allTestsPassed: result.allTestsPassed,
      deterministicResult,
      details: result,
      needsManualReview,
      manualReviewReason: needsManualReview
        ? getManualReviewReason(result)
        : undefined,
    };
  } catch (error) {
    // 执行异常，需要人工复核
    return {
      questionId: request.questionId,
      executionSuccess: false,
      allTestsPassed: false,
      deterministicResult: {
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown execution error',
      },
      details: {
        status: 'ERROR',
        allTestsPassed: false,
        testResults: [],
        passedCount: 0,
        totalCount: request.testCases.length,
        hiddenPassedCount: 0,
        hiddenTotalCount: request.testCases.filter(t => t.isHidden).length,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
      needsManualReview: true,
      manualReviewReason: 'Execution failed unexpectedly',
    };
  }
}

/**
 * 批量执行代码题
 */
export async function executeCodeQuestions(
  requests: CodeQuestionExecutionRequest[]
): Promise<Map<string, CodeQuestionExecutionResult>> {
  const results = new Map<string, CodeQuestionExecutionResult>();

  // 并行执行所有题目
  const executions = requests.map(async (request) => {
    const result = await executeCodeQuestion(request);
    return [request.questionId, result] as const;
  });

  const settled = await Promise.all(executions);
  for (const [questionId, result] of settled) {
    results.set(questionId, result);
  }

  return results;
}

/**
 * 获取人工复核原因
 */
function getManualReviewReason(result: CodeExecutionResult): string {
  if (result.status === 'SECURITY_VIOLATION') {
    return 'Security violation detected in code';
  }

  if (result.status === 'ERROR') {
    return `Execution error: ${result.errorMessage || 'Unknown error'}`;
  }

  if (result.status === 'TIMEOUT') {
    return 'Code execution timed out';
  }

  if (!result.allTestsPassed) {
    if (result.hiddenPassedCount === 0 && result.hiddenTotalCount > 0) {
      return 'All hidden test cases failed';
    }
    return `${result.totalCount - result.passedCount} test cases failed`;
  }

  return 'Unknown reason';
}

/**
 * 检查是否有可用的代码执行器
 */
export async function isCodeExecutorAvailable(): Promise<boolean> {
  const status = await getExecutorManager().getStatus();
  return status.available;
}

/**
 * 获取代码执行器状态信息
 */
export async function getExecutorStatusInfo(): Promise<{
  available: boolean;
  type: string;
  warnings: string[];
}> {
  const status = await getExecutorManager().getStatus();
  return {
    available: status.available,
    type: status.type,
    warnings: status.warnings || [],
  };
}