/**
 * 求职 DTO 和 Schema
 * 
 * Phase 0 实现：基础类型定义
 */
import { z } from 'zod';

// 岗位状态枚举
export const JobStatusSchema = z.enum([
  'SAVED',
  'TO_APPLY',
  'APPLIED',
  'CONTACTING',
  'ASSESSMENT',
  'INTERVIEWING',
  'OFFER',
  'REJECTED',
  'WITHDRAWN',
]);

export type JobStatus = z.infer<typeof JobStatusSchema>;

// 求职活动类型枚举
export const JobActivityTypeSchema = z.enum([
  'APPLICATION',
  'MESSAGE',
  'WRITTEN_TEST',
  'INTERVIEW',
  'FOLLOW_UP',
  'OFFER',
  'REJECTION',
]);

export type JobActivityType = z.infer<typeof JobActivityTypeSchema>;

// 技能缺口等级
export const GapLevelSchema = z.enum(['HIGH', 'MEDIUM', 'LOW']);
export type GapLevel = z.infer<typeof GapLevelSchema>;