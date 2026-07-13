/**
 * 知识领域 DTO 和 Schema
 * 
 * Phase 0 实现：基础类型定义
 */
import { z } from 'zod';

// 知识状态枚举
export const KnowledgeStatusSchema = z.enum([
  'NOT_STARTED',
  'LEARNING',
  'SELF_MASTERED',
  'FIRST_PASS_PENDING_RETEST',
  'MASTERED',
  'NEEDS_RELEARNING',
]);

export type KnowledgeStatus = z.infer<typeof KnowledgeStatusSchema>;

// 难度枚举
export const DifficultySchema = z.enum(['intermediate', 'senior', 'advanced']);
export type Difficulty = z.infer<typeof DifficultySchema>;

// 知识领域 DTO
export const KnowledgeDomainSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  title: z.string(),
  description: z.string().optional(),
  orderIndex: z.number().int(),
  sourcePath: z.string(),
  sourceHash: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type KnowledgeDomain = z.infer<typeof KnowledgeDomainSchema>;

// 知识点 DTO
export const KnowledgePointSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  domainId: z.string().uuid(),
  title: z.string(),
  summary: z.string().optional(),
  studyMaterialMd: z.string(),
  assessmentSpecMd: z.string(),
  passCriteriaMd: z.string(),
  difficulty: DifficultySchema,
  planWeek: z.number().int().optional(),
  status: KnowledgeStatusSchema,
  selfMasteredAt: z.string().optional(),
  firstPassedAt: z.string().optional(),
  masteredAt: z.string().optional(),
  nextReviewAt: z.string().optional(),
  sourcePath: z.string(),
  sourceHash: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type KnowledgePoint = z.infer<typeof KnowledgePointSchema>;