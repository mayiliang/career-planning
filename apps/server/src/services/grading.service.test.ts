/**
 * 评分逻辑测试
 * 
 * Phase 5 测试：验证评分计算和判定逻辑
 */
import { describe, it, expect } from 'vitest';
import { calculateVerdict, PASS_THRESHOLD } from '@career-atlas/shared';
import { buildGradingUserMessage } from '../ai/provider.js';
import { collectDeterministicContractFailures, normalizeFeedbackAndDimensionScores } from './grading.service.js';
import { extractLocalMaterialContext } from './learning-material-context.service.js';

describe('评分逻辑', () => {
  describe('calculateVerdict', () => {
    it('高分、高置信度、无否决项、确定性测试通过 -> PASS', () => {
      const scores = {
        principlesAndBoundaries: 23,
        practice: 32,
        troubleshootingAndDesign: 22,
        projectCommunication: 14,
      };
      
      const verdict = calculateVerdict(scores, 0.95, false, true);
      
      expect(verdict).toBe('PASS');
    });
    
    it('总分低于80 -> FAIL', () => {
      const scores = {
        principlesAndBoundaries: 15,
        practice: 21,
        troubleshootingAndDesign: 15,
        communication: 9,
      };
      
      // 总分 60，低于 80
      const verdict = calculateVerdict(scores, 0.95, false, true);
      
      expect(verdict).toBe('FAIL');
    });
    
    it('单个维度低于60% -> FAIL', () => {
      const scores = {
        principlesAndBoundaries: 10, // 低于 15 (25 * 0.6)
        practice: 30,
        troubleshootingAndDesign: 20,
        projectCommunication: 12,
      };
      
      const verdict = calculateVerdict(scores, 0.95, false, true);
      
      expect(verdict).toBe('FAIL');
    });
    
    it('置信度低于0.75 -> MANUAL_REVIEW', () => {
      const scores = {
        principlesAndBoundaries: 23,
        practice: 32,
        troubleshootingAndDesign: 22,
        projectCommunication: 14,
      };
      
      const verdict = calculateVerdict(scores, 0.7, false, true);
      
      expect(verdict).toBe('MANUAL_REVIEW');
    });
    
    it('存在否决项 -> MANUAL_REVIEW', () => {
      const scores = {
        principlesAndBoundaries: 23,
        practice: 32,
        troubleshootingAndDesign: 22,
        projectCommunication: 14,
      };
      
      const verdict = calculateVerdict(scores, 0.95, true, true);
      
      expect(verdict).toBe('MANUAL_REVIEW');
    });
    
    it('确定性测试失败 -> FAIL', () => {
      const scores = {
        principlesAndBoundaries: 23,
        practice: 32,
        troubleshootingAndDesign: 22,
        projectCommunication: 14,
      };
      
      const verdict = calculateVerdict(scores, 0.95, false, false);
      
      expect(verdict).toBe('FAIL');
    });
    
    it('边界分数刚好通过 -> PASS', () => {
      // 总分刚好 80
      const scores = {
        principlesAndBoundaries: 20, // 超过 15 (25 * 0.6)
        practice: 25, // 超过 21 (35 * 0.6)
        troubleshootingAndDesign: 20, // 超过 15 (25 * 0.6)
        projectCommunication: 15, // 超过 9 (15 * 0.6)
      };
      
      const verdict = calculateVerdict(scores, 0.75, false, true);
      
      expect(verdict).toBe('PASS');
    });
    
    it('高分但置信度不足 -> MANUAL_REVIEW', () => {
      const scores = {
        principlesAndBoundaries: 25,
        practice: 35,
        troubleshootingAndDesign: 25,
        projectCommunication: 15,
      };
      
      const verdict = calculateVerdict(scores, 0.5, false, true);
      
      expect(verdict).toBe('MANUAL_REVIEW');
    });
  });
  
  describe('PASS_THRESHOLD', () => {
    it('总分阈值为80', () => {
      expect(PASS_THRESHOLD.TOTAL_SCORE).toBe(80);
    });
    
    it('维度百分比为60%', () => {
      expect(PASS_THRESHOLD.DIMENSION_PERCENTAGE).toBe(0.6);
    });
    
    it('置信度阈值为0.75', () => {
      expect(PASS_THRESHOLD.CONFIDENCE).toBe(0.75);
    });
  });
});

describe('DeepSeek 评分契约', () => {
  it('提示词提供数组元素的完整结构，避免模型返回不可校验的简写对象', () => {
    const message = buildGradingUserMessage({
      knowledgePointCode: 'JS-01',
      knowledgePointTitle: '闭包',
      assessmentType: 'FIRST',
      questions: [{ id: 'q1', type: 'ESSAY', dimension: 'principlesAndBoundaries', maxScore: 10, content: '解释闭包' }],
      answers: [{ questionId: 'q1', content: '示例答案' }],
      rubric: '严格评分',
      passCriteria: '80 分',
      studyMaterial: 'MDN 闭包资料',
    });

    expect(message).toContain('"criterionId": "Q1-mechanism"');
    expect(message).toContain('"maxScore": 10');
    expect(message).toContain('"nextAction": "可执行的下一步"');
    expect(message).toContain('"questionReviews"');
    expect(message).toContain('"referenceAnswer"');
    expect(message).toContain('学习资料：');
    expect(message).toContain('不得引入学习资料无法直接查到');
    expect(message).toContain('字段一个都不能省略');
    expect(message).toContain('summary 不超过 120 个中文字符');
    expect(message).toContain('referenceAnswer 不超过 180 个中文字符');
    expect(message).toContain('引用之外的解释是否成立');
    expect(message).toContain('如果题目允许伪代码');
    expect(message).toContain('不要主动扩展到 React Hook 或 useEffect');
  });

  it('服务端会把 DeepSeek 返回的 Q1/Q2 逐题评审映射回真实题目，并按实际题目分值重算维度分', () => {
    const questions = [
      { id: 'uuid-q1', dimension: 'principlesAndBoundaries', maxScore: 10, questionContent: '{"referenceAnswer":"r1","sourceBasis":["s1"]}' },
      { id: 'uuid-q2', dimension: 'principlesAndBoundaries', maxScore: 15, questionContent: '{"referenceAnswer":"r2","sourceBasis":["s2"]}' },
      { id: 'uuid-q3', dimension: 'practice', maxScore: 35, questionContent: '{"referenceAnswer":"r3","sourceBasis":["s3"]}' },
      { id: 'uuid-q4', dimension: 'troubleshootingAndDesign', maxScore: 25, questionContent: '{"referenceAnswer":"r4","sourceBasis":["s4"]}' },
      { id: 'uuid-q5', dimension: 'projectCommunication', maxScore: 15, questionContent: '{"referenceAnswer":"r5","sourceBasis":["s5"]}' },
    ];

    const normalized = normalizeFeedbackAndDimensionScores({
      summary: '全部正确',
      whatWasStrong: [],
      whatMustImprove: [],
      suggestedRetestFocus: [],
      questionReviews: questions.map((_, index) => ({
        questionId: `Q${index + 1}`,
        score: 10,
        maxScore: 10,
        correctParts: ['正确'],
        incorrectParts: [],
        missingParts: [],
        referenceAnswer: `参考 ${index + 1}`,
        sourceBasis: ['MDN'],
        nextAction: '继续保持',
      })),
    }, {
      principlesAndBoundaries: 20,
      practice: 10,
      troubleshootingAndDesign: 10,
      projectCommunication: 10,
    }, questions);

    expect(normalized.feedback.questionReviews.map(review => review.questionId)).toEqual([
      'uuid-q1',
      'uuid-q2',
      'uuid-q3',
      'uuid-q4',
      'uuid-q5',
    ]);
    expect(normalized.feedback.questionReviews.map(review => review.maxScore)).toEqual([10, 15, 35, 25, 15]);
    expect(normalized.dimensionScores).toEqual({
      principlesAndBoundaries: 25,
      practice: 35,
      troubleshootingAndDesign: 25,
      projectCommunication: 15,
    });
  });
});

describe('逐题合同评分门禁', () => {
  it('编码题漏掉本地自检记录时只产生诊断提示，不能升级为服务端硬证据', () => {
    const questions = [{
      id: 'coding-q3', dimension: 'practice', maxScore: 35,
      questionContent: JSON.stringify({
        deterministicRequired: true,
        testCases: [{ id: 'contract-normal' }, { id: 'contract-boundary' }],
      }),
    }];
    const failures = collectDeterministicContractFailures(questions, [{
      questionId: 'coding-q3',
      answerContent: 'const actual = runFixture(); console.assert(actual === expected, "contract-normal"); console.assert(actual === expected, "contract-boundary");',
      deterministicResult: JSON.stringify({ passed: true, output: '[ASSERT PASS] contract-normal' }),
    }]);
    expect(failures).toHaveLength(1);
    expect(failures[0]?.reason).toContain('contract-boundary');
    expect(failures[0]?.reason).toContain('不能单独决定结果');
  });

  it('JS 与 AI 点的本地中文讲义正文会进入评分上下文，而非只给 Markdown 链接', () => {
    const examples = [
      ['[中文核心讲义](../chinese-guides/core-and-ecosystem-topics.md#js-07)', 'core-and-ecosystem-topics.md#js-07', 'JS-07'],
      ['[AIAPP-01 中文核心讲义](../chinese-guides/aiapp-01-model-interface-instructions-context-boundaries.md#aiapp-01)', 'aiapp-01-model-interface-instructions-context-boundaries.md#aiapp-01', 'AIAPP-01'],
    ] as const;
    for (const [markdown, source, marker] of examples) {
      const context = extractLocalMaterialContext(markdown);
      expect(context).toHaveLength(1);
      expect(context[0]?.source).toBe(source);
      expect(context[0]?.content).toContain(marker);
      expect(context[0]?.content.length).toBeGreaterThan(300);
    }
  });
});
