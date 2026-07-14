/**
 * 评分逻辑测试
 * 
 * Phase 5 测试：验证评分计算和判定逻辑
 */
import { describe, it, expect } from 'vitest';
import { calculateVerdict, PASS_THRESHOLD } from '@career-atlas/shared';
import { buildGradingUserMessage } from '../ai/provider.js';

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
      questions: [{ id: 'q1', type: 'ESSAY', dimension: 'principlesAndBoundaries', content: '解释闭包' }],
      answers: [{ questionId: 'q1', content: '示例答案' }],
      rubric: '严格评分',
      passCriteria: '80 分',
    });

    expect(message).toContain('"criterionId": "Q1-mechanism"');
    expect(message).toContain('"maxScore": 10');
    expect(message).toContain('"nextAction": "可执行的下一步"');
    expect(message).toContain('字段一个都不能省略');
  });
});
