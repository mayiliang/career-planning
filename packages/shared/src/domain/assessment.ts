/**
 * 考核 DTO 和 Schema
 * 
 * Phase 0 实现：基础类型定义
 */
import { z } from 'zod';

// 考核类型枚举
export const AssessmentTypeSchema = z.enum([
  'FIRST',
  'RETEST',
  'MONTHLY_REVIEW',
  'DOMAIN_COMPREHENSIVE',
]);

export type AssessmentType = z.infer<typeof AssessmentTypeSchema>;

// 考核会话状态枚举
export const AssessmentSessionStatusSchema = z.enum([
  'DRAFT',
  'IN_PROGRESS',
  'SUBMITTED',
  'GRADING',
  'GRADED',
  'ERROR',
  'CANCELLED',
]);

export type AssessmentSessionStatus = z.infer<typeof AssessmentSessionStatusSchema>;

// 考核结果枚举
export const AssessmentVerdictSchema = z.enum(['PASS', 'FAIL', 'MANUAL_REVIEW']);
export type AssessmentVerdict = z.infer<typeof AssessmentVerdictSchema>;

// 维度分数 Schema
export const DimensionScoresSchema = z.object({
  principlesAndBoundaries: z.number().min(0).max(25),
  practice: z.number().min(0).max(35),
  troubleshootingAndDesign: z.number().min(0).max(25),
  projectCommunication: z.number().min(0).max(15),
});

export type DimensionScores = z.infer<typeof DimensionScoresSchema>;