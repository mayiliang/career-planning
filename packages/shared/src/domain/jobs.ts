/**
 * 求职 DTO 和 Schema
 * 
 * Phase 6 实现：完整的求职模块类型定义
 */
import { z } from 'zod';

// ===== 枚举定义 =====

// 岗位状态枚举
export const JobStatusSchema = z.enum([
  'SAVED',       // 已保存
  'TO_APPLY',    // 待投递
  'APPLIED',     // 已投递
  'CONTACTING',  // 沟通中
  'ASSESSMENT',  // 笔试/测评
  'INTERVIEWING', // 面试中
  'OFFER',       // 已获 Offer
  'REJECTED',    // 已拒绝
  'WITHDRAWN',   // 已撤回
]);

export type JobStatus = z.infer<typeof JobStatusSchema>;

// 求职活动类型枚举
export const JobActivityTypeSchema = z.enum([
  'APPLICATION',    // 投递
  'MESSAGE',        // 消息沟通
  'WRITTEN_TEST',   // 笔试
  'INTERVIEW',      // 面试
  'FOLLOW_UP',      // 跟进
  'OFFER',          // Offer
  'REJECTION',      // 拒信
]);

export type JobActivityType = z.infer<typeof JobActivityTypeSchema>;

// 活动状态枚举
export const ActivityStatusSchema = z.enum([
  'PLANNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);

export type ActivityStatus = z.infer<typeof ActivityStatusSchema>;

// 技能缺口等级
export const GapLevelSchema = z.enum(['HIGH', 'MEDIUM', 'LOW']);
export type GapLevel = z.infer<typeof GapLevelSchema>;

// 技能缺口来源
export const GapSourceSchema = z.enum([
  'JD_ANALYSIS',         // JD 分析发现
  'INTERVIEW_FEEDBACK',  // 面试反馈发现
  'SELF_ASSESSMENT',     // 自我评估发现
]);

export type GapSource = z.infer<typeof GapSourceSchema>;

// 技能缺口状态
export const SkillGapStatusSchema = z.enum([
  'IDENTIFIED', // 已识别
  'LEARNING',   // 学习中
  'MASTERED',   // 已掌握
  'CLOSED',     // 已关闭
]);

export type SkillGapStatus = z.infer<typeof SkillGapStatusSchema>;

// 项目类型枚举
export const ProjectTypeSchema = z.enum([
  'WEB',
  'H5',
  'COMPONENT_LIBRARY',
  'TOOL',
  'OTHER',
]);

export type ProjectType = z.infer<typeof ProjectTypeSchema>;

// 项目状态枚举
export const ProjectStatusSchema = z.enum([
  'DRAFT',
  'IN_PROGRESS',
  'COMPLETED',
  'ARCHIVED',
]);

export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

// 面试类型枚举
export const InterviewTypeSchema = z.enum([
  'PHONE',
  'VIDEO',
  'ONSITE',
]);

export type InterviewType = z.infer<typeof InterviewTypeSchema>;

// ===== 实体 Schema =====

// 岗位 Schema
export const JobSchema = z.object({
  id: z.string(),
  company: z.string(),
  jobTitle: z.string(),
  platform: z.string(),
  salary: z.string().nullable(),
  experience: z.string().nullable(),
  location: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  jobDirection: z.string().nullable(),
  techStack: z.array(z.string()).nullable(),
  jdKeywords: z.array(z.string()).nullable(),
  matchedProject: z.string().nullable(),
  matchLevel: GapLevelSchema.nullable(),
  skillGap: z.array(z.string()).nullable(),
  status: JobStatusSchema,
  nextAction: z.string().nullable(),
  nextActionDue: z.string().nullable(),
  notes: z.string().nullable(),
  priority: z.number().int().min(1).max(5),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Job = z.infer<typeof JobSchema>;

// 创建岗位请求
export const CreateJobRequestSchema = z.object({
  company: z.string().min(1),
  jobTitle: z.string().min(1),
  platform: z.string().min(1),
  salary: z.string().optional(),
  experience: z.string().optional(),
  location: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  jobDirection: z.string().optional(),
  techStack: z.array(z.string()).optional(),
  jdKeywords: z.array(z.string()).optional(),
  matchedProject: z.string().optional(),
  matchLevel: GapLevelSchema.optional(),
  notes: z.string().optional(),
  priority: z.number().int().min(1).max(5).optional(),
});

export type CreateJobRequest = z.infer<typeof CreateJobRequestSchema>;

// 更新岗位请求
export const UpdateJobRequestSchema = z.object({
  status: JobStatusSchema.optional(),
  nextAction: z.string().optional(),
  nextActionDue: z.string().optional(),
  notes: z.string().optional(),
  priority: z.number().int().min(1).max(5).optional(),
});

export type UpdateJobRequest = z.infer<typeof UpdateJobRequestSchema>;

// 求职活动 Schema
export const JobActivitySchema = z.object({
  id: z.string(),
  jobId: z.string(),
  activityType: JobActivityTypeSchema,
  title: z.string(),
  description: z.string().nullable(),
  scheduledAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  status: ActivityStatusSchema,
  interviewRound: z.number().int().positive().nullable(),
  interviewType: InterviewTypeSchema.nullable(),
  interviewer: z.string().nullable(),
  feedbackMd: z.string().nullable(),
  discoveredGaps: z.array(z.string()).nullable(),
  planEventId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type JobActivity = z.infer<typeof JobActivitySchema>;

// 创建求职活动请求
export const CreateJobActivityRequestSchema = z.object({
  jobId: z.string(),
  activityType: JobActivityTypeSchema,
  title: z.string().min(1),
  description: z.string().optional(),
  scheduledAt: z.string().optional(),
  interviewRound: z.number().int().positive().optional(),
  interviewType: InterviewTypeSchema.optional(),
  interviewer: z.string().optional(),
});

export type CreateJobActivityRequest = z.infer<typeof CreateJobActivityRequestSchema>;

// 更新求职活动请求
export const UpdateJobActivityRequestSchema = z.object({
  status: ActivityStatusSchema.optional(),
  feedbackMd: z.string().optional(),
  discoveredGaps: z.array(z.string()).optional(),
});

export type UpdateJobActivityRequest = z.infer<typeof UpdateJobActivityRequestSchema>;

// 技能缺口 Schema
export const SkillGapSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  knowledgePointCode: z.string(),
  gapLevel: GapLevelSchema,
  sourceType: GapSourceSchema,
  activityId: z.string().nullable(),
  status: SkillGapStatusSchema,
  learningAction: z.string().nullable(),
  closedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SkillGap = z.infer<typeof SkillGapSchema>;

// 创建技能缺口请求
export const CreateSkillGapRequestSchema = z.object({
  jobId: z.string(),
  knowledgePointCode: z.string(),
  gapLevel: GapLevelSchema,
  sourceType: GapSourceSchema,
  activityId: z.string().optional(),
  learningAction: z.string().optional(),
});

export type CreateSkillGapRequest = z.infer<typeof CreateSkillGapRequestSchema>;

// 项目资产 Schema
export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: ProjectTypeSchema,
  positioning: z.string().nullable(),
  growthThemes: z.array(z.string()).nullable(),
  businessContext: z.string().nullable(),
  targetUsers: z.string().nullable(),
  myRole: z.string().nullable(),
  techStack: z.array(z.string()).nullable(),
  coreModules: z.array(z.object({
    name: z.string(),
    description: z.string(),
  })).nullable(),
  techChallenges: z.array(z.object({
    challenge: z.string(),
    solution: z.string(),
    result: z.string(),
  })).nullable(),
  components: z.string().nullable(),
  lessonsLearned: z.string().nullable(),
  resumeVersion: z.string().nullable(),
  interviewVersion: z.string().nullable(),
  deepVersion: z.string().nullable(),
  matchedJobs: z.array(z.string()).nullable(),
  status: ProjectStatusSchema,
  sourcePath: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Project = z.infer<typeof ProjectSchema>;

// 创建项目请求
export const CreateProjectRequestSchema = z.object({
  name: z.string().min(1),
  type: ProjectTypeSchema,
  positioning: z.string().optional(),
  growthThemes: z.array(z.string()).optional(),
  businessContext: z.string().optional(),
  targetUsers: z.string().optional(),
  myRole: z.string().optional(),
  techStack: z.array(z.string()).optional(),
});

export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;

// ===== 查询响应 Schema =====

// 岗位列表响应
export const JobListResponseSchema = z.object({
  items: z.array(JobSchema),
  total: z.number().int().nonnegative(),
  filters: z.object({
    status: JobStatusSchema.nullable(),
    platform: z.string().nullable(),
    search: z.string().nullable(),
  }),
});

export type JobListResponse = z.infer<typeof JobListResponseSchema>;

// 岗位详情响应（包含活动和技能缺口）
export const JobDetailResponseSchema = z.object({
  job: JobSchema,
  activities: z.array(JobActivitySchema),
  skillGaps: z.array(SkillGapSchema),
});

export type JobDetailResponse = z.infer<typeof JobDetailResponseSchema>;

// 看板列定义
export const JobKanbanColumnSchema = z.object({
  status: JobStatusSchema,
  title: z.string(),
  jobs: z.array(JobSchema),
});

export type JobKanbanColumn = z.infer<typeof JobKanbanColumnSchema>;

// 看板响应
export const JobKanbanResponseSchema = z.array(JobKanbanColumnSchema);

export type JobKanbanResponse = z.infer<typeof JobKanbanResponseSchema>;

// 求职漏斗统计
export const JobFunnelStatsSchema = z.object({
  saved: z.number().int().nonnegative(),
  applied: z.number().int().nonnegative(),
  interviewing: z.number().int().nonnegative(),
  offer: z.number().int().nonnegative(),
});

export type JobFunnelStats = z.infer<typeof JobFunnelStatsSchema>;