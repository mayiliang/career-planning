/**
 * 计划 DTO 和 Schema
 * 
 * Phase 0 实现：基础类型定义
 */
import { z } from 'zod';

// 事件类型枚举
export const EventTypeSchema = z.enum([
  'LEARNING',
  'ASSESSMENT',
  'RETEST',
  'PROJECT_OUTPUT',
  'JOB_APPLICATION',
  'INTERVIEW',
  'REVIEW',
]);

export type EventType = z.infer<typeof EventTypeSchema>;

// 事件状态枚举
export const EventStatusSchema = z.enum([
  'PLANNED',
  'IN_PROGRESS',
  'COMPLETED',
  'PARTIAL',
  'SKIPPED',
  'RESCHEDULED',
]);

export type EventStatus = z.infer<typeof EventStatusSchema>;

// 优先级枚举
export const PrioritySchema = z.enum(['high', 'medium', 'low']);
export type Priority = z.infer<typeof PrioritySchema>;