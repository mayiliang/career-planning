/**
 * Phase 0 验收测试
 * 
 * 验证：
 * - 状态机规则正确
 */
import { describe, it, expect } from 'vitest';
import {
  isValidTransition,
  getNextStates,
  KnowledgeStatusSchema,
} from './knowledge-status.js';

describe('Knowledge Status Machine', () => {
  it('should allow NOT_STARTED -> LEARNING', () => {
    expect(isValidTransition('NOT_STARTED', 'LEARNING')).toBe(true);
  });

  it('should NOT allow NOT_STARTED -> MASTERED directly', () => {
    expect(isValidTransition('NOT_STARTED', 'MASTERED')).toBe(false);
  });

  it('should NOT allow SELF_MASTERED -> MASTERED directly', () => {
    // 必须经过 FIRST_PASS_PENDING_RETEST
    expect(isValidTransition('SELF_MASTERED', 'MASTERED')).toBe(false);
  });

  it('should return correct next states for NOT_STARTED', () => {
    const next = getNextStates('NOT_STARTED');
    expect(next).toEqual(['LEARNING']);
  });

  it('should return correct next states for FIRST_PASS_PENDING_RETEST', () => {
    const next = getNextStates('FIRST_PASS_PENDING_RETEST');
    expect(next).toContain('MASTERED');
    expect(next).toContain('NEEDS_RELEARNING');
  });

  it('should validate KnowledgeStatus enum', () => {
    expect(KnowledgeStatusSchema.parse('NOT_STARTED')).toBe('NOT_STARTED');
    expect(KnowledgeStatusSchema.parse('LEARNING')).toBe('LEARNING');
    expect(() => KnowledgeStatusSchema.parse('INVALID')).toThrow();
  });
});