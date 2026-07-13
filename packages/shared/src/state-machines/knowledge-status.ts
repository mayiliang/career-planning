/**
 * 知识状态机
 * 
 * Phase 0 实现：状态转换规则定义
 */
import type { KnowledgeStatus } from '../domain/knowledge.js';
import { KnowledgeStatusSchema } from '../domain/knowledge.js';

// 状态转换类型
export type StateTransition = {
  from: KnowledgeStatus;
  to: KnowledgeStatus;
  action: string;
  guard?: (context: unknown) => boolean;
};

// 允许的状态转换
export const ALLOWED_TRANSITIONS: StateTransition[] = [
  { from: 'NOT_STARTED', to: 'LEARNING', action: 'start' },
  { from: 'LEARNING', to: 'SELF_MASTERED', action: 'selfMastery' },
  { from: 'SELF_MASTERED', to: 'FIRST_PASS_PENDING_RETEST', action: 'firstPass' },
  { from: 'SELF_MASTERED', to: 'LEARNING', action: 'firstFail' },
  { from: 'FIRST_PASS_PENDING_RETEST', to: 'MASTERED', action: 'retestPass' },
  { from: 'FIRST_PASS_PENDING_RETEST', to: 'NEEDS_RELEARNING', action: 'retestFail' },
  { from: 'MASTERED', to: 'NEEDS_RELEARNING', action: 'reviewFail' },
  { from: 'NEEDS_RELEARNING', to: 'LEARNING', action: 'restart' },
  { from: 'MASTERED', to: 'LEARNING', action: 'reopen' },
];

// 检查转换是否有效
export function isValidTransition(from: KnowledgeStatus, to: KnowledgeStatus): boolean {
  return ALLOWED_TRANSITIONS.some((t) => t.from === from && t.to === to);
}

// 获取允许的下一状态
export function getNextStates(current: KnowledgeStatus): KnowledgeStatus[] {
  return ALLOWED_TRANSITIONS
    .filter((t) => t.from === current)
    .map((t) => t.to);
}

// 导出 KnowledgeStatusSchema 供测试使用
export { KnowledgeStatusSchema };