/**
 * Fake Provider 实现
 * 
 * Phase 5 实现：用于测试，返回预设的评分结果
 */
import type { AIProvider, AIResponse, GradingRequest } from './provider.js';
import type { AssessmentGradingOutput } from '@career-atlas/shared';

// ===== 预设的评分结果模板 =====

// 优秀答案模板
const EXCELLENT_OUTPUT: AssessmentGradingOutput = {
  schemaVersion: '1.0',
  knowledgePointId: '',
  assessmentType: 'FIRST',
  dimensionScores: {
    principlesAndBoundaries: 23,
    practice: 32,
    troubleshootingAndDesign: 22,
    projectCommunication: 14,
  },
  findings: [
    {
      dimension: 'principlesAndBoundaries',
      criterionId: 'PB-01',
      score: 23,
      maxScore: 25,
      evidence: '正确解释了核心概念',
      reason: '理解深入，举例恰当',
    },
  ],
  criticalFailures: [],
  weaknesses: [],
  feedback: {
    summary: '整体表现优秀',
    whatWasStrong: ['概念理解准确', '代码实现正确'],
    whatMustImprove: [],
    suggestedRetestFocus: [],
  },
  recommendedVerdict: 'PASS',
  confidence: 0.95,
};

// 临界答案模板（接近通过线）
const BORDERLINE_OUTPUT: AssessmentGradingOutput = {
  schemaVersion: '1.0',
  knowledgePointId: '',
  assessmentType: 'FIRST',
  dimensionScores: {
    principlesAndBoundaries: 16,
    practice: 22,
    troubleshootingAndDesign: 16,
    projectCommunication: 10,
  },
  findings: [
    {
      dimension: 'principlesAndBoundaries',
      criterionId: 'PB-01',
      score: 16,
      maxScore: 25,
      evidence: '基本理解概念',
      reason: '能够解释定义，但缺少深度分析',
    },
  ],
  criticalFailures: [],
  weaknesses: [
    {
      topic: '边界情况处理',
      severity: 'MEDIUM',
      evidence: '未能完全覆盖边界情况',
      nextAction: '补充边界测试用例',
    },
  ],
  feedback: {
    summary: '基本达标，但有提升空间',
    whatWasStrong: ['基础概念掌握'],
    whatMustImprove: ['边界情况处理', '性能优化'],
    suggestedRetestFocus: ['边界情况处理'],
  },
  recommendedVerdict: 'PASS',
  confidence: 0.78,
};

// 失败答案模板
const FAIL_OUTPUT: AssessmentGradingOutput = {
  schemaVersion: '1.0',
  knowledgePointId: '',
  assessmentType: 'FIRST',
  dimensionScores: {
    principlesAndBoundaries: 10,
    practice: 15,
    troubleshootingAndDesign: 12,
    projectCommunication: 8,
  },
  findings: [
    {
      dimension: 'principlesAndBoundaries',
      criterionId: 'PB-01',
      score: 10,
      maxScore: 25,
      evidence: '概念理解存在偏差',
      reason: '只能背诵定义，无法解释因果关系',
    },
  ],
  criticalFailures: [],
  weaknesses: [
    {
      topic: '核心概念',
      severity: 'HIGH',
      evidence: '无法正确解释核心概念',
      nextAction: '重新学习基础知识',
    },
  ],
  feedback: {
    summary: '未能达到通过标准',
    whatWasStrong: [],
    whatMustImprove: ['核心概念理解', '代码实践', '问题分析'],
    suggestedRetestFocus: ['核心概念理解', '代码实践'],
  },
  recommendedVerdict: 'FAIL',
  confidence: 0.9,
};

// 提示注入答案模板
const INJECTION_OUTPUT: AssessmentGradingOutput = {
  schemaVersion: '1.0',
  knowledgePointId: '',
  assessmentType: 'FIRST',
  dimensionScores: {
    principlesAndBoundaries: 25,
    practice: 35,
    troubleshootingAndDesign: 25,
    projectCommunication: 15,
  },
  findings: [],
  criticalFailures: [
    {
      code: 'PROMPT_INJECTION_DETECTED',
      evidence: '答案中包含改变评分规则的指令',
      reason: '检测到提示注入尝试',
    },
  ],
  weaknesses: [],
  feedback: {
    summary: '检测到异常答案',
    whatWasStrong: [],
    whatMustImprove: ['诚实作答'],
    suggestedRetestFocus: [],
  },
  recommendedVerdict: 'MANUAL_REVIEW',
  confidence: 0.99,
};

// ===== Fake Provider 配置 =====

export interface FakeProviderConfig {
  // 预设的返回类型
  responseType: 'excellent' | 'borderline' | 'fail' | 'injection' | 'invalid_json' | 'timeout';
  // 响应延迟（毫秒）
  delay?: number;
}

// ===== Fake Provider =====

export class FakeProvider implements AIProvider {
  readonly name = 'fake';
  readonly model = 'fake-model';
  
  private readonly responseType: string;
  private readonly delay: number;
  
  constructor(config: FakeProviderConfig) {
    this.responseType = config.responseType;
    this.delay = config.delay || 0;
  }
  
  async grade(request: GradingRequest): Promise<AIResponse> {
    const startTime = Date.now();
    
    // 模拟延迟
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }
    
    // 模拟超时
    if (this.responseType === 'timeout') {
      throw new Error('Request timeout');
    }
    
    // 根据类型返回不同结果
    let output: AssessmentGradingOutput | null = null;
    let rawContent = '';
    let parseSuccess = true;
    let parseError: string | undefined;
    
    switch (this.responseType) {
      case 'excellent':
        output = {
          ...EXCELLENT_OUTPUT,
          knowledgePointId: request.knowledgePointCode,
          assessmentType: request.assessmentType,
        };
        rawContent = JSON.stringify(output);
        break;
        
      case 'borderline':
        output = {
          ...BORDERLINE_OUTPUT,
          knowledgePointId: request.knowledgePointCode,
          assessmentType: request.assessmentType,
        };
        rawContent = JSON.stringify(output);
        break;
        
      case 'fail':
        output = {
          ...FAIL_OUTPUT,
          knowledgePointId: request.knowledgePointCode,
          assessmentType: request.assessmentType,
        };
        rawContent = JSON.stringify(output);
        break;
        
      case 'injection':
        output = {
          ...INJECTION_OUTPUT,
          knowledgePointId: request.knowledgePointCode,
          assessmentType: request.assessmentType,
        };
        rawContent = JSON.stringify(output);
        break;
        
      case 'invalid_json':
        rawContent = 'This is not valid JSON';
        parseSuccess = false;
        parseError = 'Invalid JSON format';
        break;
        
      default:
        rawContent = JSON.stringify({ error: 'Unknown response type' });
        parseSuccess = false;
        parseError = 'Unknown response type';
    }
    
    return {
      rawContent,
      parsedOutput: output,
      parseSuccess,
      parseError,
      usage: {
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300,
      },
      provider: this.name,
      model: this.model,
      responseTime: Date.now() - startTime,
    };
  }
  
  async testConnection(): Promise<boolean> {
    return true;
  }
}