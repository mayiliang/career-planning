/**
 * 知识解析结果类型
 * 
 * Phase 1 实现：符合 Drizzle schema 字段
 */
import { z } from 'zod';

// 知识点解析结果
export const ParsedKnowledgePointSchema = z.object({
  code: z.string(), // 如 'JS-01'
  title: z.string(),
  difficulty: z.enum(['intermediate', 'senior', 'advanced']).default('intermediate'),
  
  // Markdown 内容
  studyMaterial: z.string(), // 学习资料
  assessmentSpec: z.string(), // 严格考核
  passCriteria: z.string(), // 通过标准
  
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
  points: z.array(ParsedKnowledgePointSchema),
});

export type ParsedDomain = z.infer<typeof ParsedDomainSchema>;

// CSV 学习计划解析结果
export const ParsedPlanItemSchema = z.object({
  week: z.number(),
  theme: z.string(),
  day: z.string(),
  learningTopic: z.string(),
  practiceTask: z.string(),
  output: z.string(),
  reviewQuestion: z.string(),
  status: z.string(),
});

export type ParsedPlanItem = z.infer<typeof ParsedPlanItemSchema>;

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