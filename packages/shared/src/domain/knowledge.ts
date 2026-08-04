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

export const CapabilityLayerSchema = z.enum(['CORE', 'APPLICATION', 'SPECIALTY', 'LEADERSHIP']);
export type CapabilityLayer = z.infer<typeof CapabilityLayerSchema>;
export const RequirementLevelSchema = z.enum(['REQUIRED', 'TRACK_REQUIRED', 'ELECTIVE']);
export type RequirementLevel = z.infer<typeof RequirementLevelSchema>;
export const MaturityLevelSchema = z.enum(['STABLE', 'EVOLVING', 'EXPERIMENTAL']);
export type MaturityLevel = z.infer<typeof MaturityLevelSchema>;
export const AiRelationSchema = z.enum(['NONE', 'AI_ASSISTED', 'AI_NATIVE', 'AGENTIC']);
export type AiRelation = z.infer<typeof AiRelationSchema>;
export const PortabilityLevelSchema = z.enum(['PORTABLE', 'FRAMEWORK_SPECIFIC', 'VENDOR_SPECIFIC', 'PLATFORM_SPECIFIC', 'JURISDICTION_SPECIFIC']);
export type PortabilityLevel = z.infer<typeof PortabilityLevelSchema>;
export const ApplicabilityTagSchema = z.enum(['FRAMEWORK_SPECIFIC', 'VENDOR_SPECIFIC', 'PLATFORM_SPECIFIC', 'JURISDICTION_SPECIFIC']);
export type ApplicabilityTag = z.infer<typeof ApplicabilityTagSchema>;
export const TrackIdSchema = z.enum(['react', 'vue', 'umi-antd', 'agent-mcp']);
export type TrackId = z.infer<typeof TrackIdSchema>;
export const TopicTagSchema = z.enum(['component-platform', 'api-engineering', 'tooling', 'platform-engineering', 'realtime-ai', 'ai-tooling', 'engineering-leadership', 'web-platform', 'accessibility', 'security-privacy', 'performance-mobile', 'media', 'runtime-cross-platform', 'node-bff', 'data-realtime', 'browser-ai', 'graphics-viz', 'growth-content-i18n', 'deployment', 'visual-testing']);
export type TopicTag = z.infer<typeof TopicTagSchema>;

// 知识领域 DTO
export const KnowledgeDomainSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  title: z.string(),
  description: z.string().optional(),
  capabilityLayer: CapabilityLayerSchema,
  requirementLevel: RequirementLevelSchema,
  maturity: MaturityLevelSchema,
  aiRelation: AiRelationSchema,
  portability: PortabilityLevelSchema,
  applicabilityTags: z.array(ApplicabilityTagSchema),
  topicTags: z.array(TopicTagSchema),
  trackIds: z.array(TrackIdSchema),
  verifiedAt: z.string(),
  fallbackStrategy: z.string(),
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
  secondaryTopic: z.string(),
  topicOrder: z.number().int().nonnegative(),
  summary: z.string().optional(),
  studyMaterialMd: z.string(),
  assessmentSpecMd: z.string(),
  passCriteriaMd: z.string(),
  difficulty: DifficultySchema,
  capabilityLayer: CapabilityLayerSchema,
  requirementLevel: RequirementLevelSchema,
  maturity: MaturityLevelSchema,
  aiRelation: AiRelationSchema,
  portability: PortabilityLevelSchema,
  applicabilityTags: z.array(ApplicabilityTagSchema),
  topicTags: z.array(TopicTagSchema),
  trackIds: z.array(TrackIdSchema),
  verifiedAt: z.string(),
  fallbackStrategy: z.string(),
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
