/**
 * 知识解析结果类型
 * 
 * Phase 1 实现：符合 Drizzle schema 字段
 */
import { z } from 'zod';
import {
  AI_RELATIONS,
  APPLICABILITY_TAGS,
  CAPABILITY_LAYERS,
  MATURITY_LEVELS,
  PORTABILITY_LEVELS,
  REQUIREMENT_LEVELS,
  TOPIC_TAGS,
  TRACK_IDS,
} from '../taxonomy.js';

// 知识点解析结果
export const ParsedKnowledgePointSchema = z.object({
  code: z.string(), // 如 'JS-01'
  title: z.string(),
  secondaryTopic: z.string().min(1),
  topicOrder: z.number().int().nonnegative(),
  difficulty: z.enum(['intermediate', 'senior', 'advanced']).default('intermediate'),
  capabilityLayer: z.enum(CAPABILITY_LAYERS),
  requirementLevel: z.enum(REQUIREMENT_LEVELS),
  maturity: z.enum(MATURITY_LEVELS),
  aiRelation: z.enum(AI_RELATIONS),
  portability: z.enum(PORTABILITY_LEVELS),
  applicabilityTags: z.array(z.enum(APPLICABILITY_TAGS)),
  topicTags: z.array(z.enum(TOPIC_TAGS)),
  trackIds: z.array(z.enum(TRACK_IDS)),
  verifiedAt: z.string(),
  fallbackStrategy: z.string(),
  
  // Markdown 内容
  studyMaterial: z.string(), // 学习资料
  assessmentSpec: z.string(), // 严格考核
  passCriteria: z.string(), // 通过标准

  // 可计算学习负载（首次掌握总时长不包含复测）
  studyMinutes: z.number().int().positive(),
  practiceMinutes: z.number().int().positive(),
  projectMinutes: z.number().int().positive(),
  assessmentMinutes: z.number().int().positive(),
  retestMinutes: z.number().int().positive(),
  estimatedTotalMinutes: z.number().int().positive(),
  
  // 状态（仅作为导入提示，不写入数据库状态）
  selfMastered: z.boolean().default(false),
  strictPassed: z.boolean().default(false),
});

export type ParsedKnowledgePoint = z.infer<typeof ParsedKnowledgePointSchema>;

// 知识领域解析结果
export const ParsedDomainSchema = z.object({
  code: z.string(), // 如 '01'
  title: z.string(),
  description: z.string().optional(),
  capabilityLayer: z.enum(CAPABILITY_LAYERS),
  requirementLevel: z.enum(REQUIREMENT_LEVELS),
  maturity: z.enum(MATURITY_LEVELS),
  aiRelation: z.enum(AI_RELATIONS),
  portability: z.enum(PORTABILITY_LEVELS),
  applicabilityTags: z.array(z.enum(APPLICABILITY_TAGS)),
  topicTags: z.array(z.enum(TOPIC_TAGS)),
  trackIds: z.array(z.enum(TRACK_IDS)),
  verifiedAt: z.string(),
  fallbackStrategy: z.string(),
  points: z.array(ParsedKnowledgePointSchema),
});

export type ParsedDomain = z.infer<typeof ParsedDomainSchema>;

// 岗位 CSV 解析结果
export const ParsedJobSchema = z.object({
  date: z.string(),
  platform: z.string(),
  company: z.string(),
  jobTitle: z.string(),
  salary: z.string(),
  experience: z.string(),
  location: z.string(),
  sourceUrl: z.string(),
  jobDirection: z.string(),
  techStack: z.string(),
  jdKeywords: z.string(),
  matchedProject: z.string(),
  matchLevel: z.string(),
  skillGap: z.string(),
  nextLearningAction: z.string(),
  status: z.string(),
  notes: z.string(),
});

export type ParsedJob = z.infer<typeof ParsedJobSchema>;
