/** 岗位、求职活动与技能缺口：运行时响应校验与业务接口。 */
import { z } from 'zod';
import { request } from '../http';

const JobStatusSchema = z.enum([
  'SAVED', 'TO_APPLY', 'APPLIED', 'CONTACTING',
  'ASSESSMENT', 'INTERVIEWING', 'OFFER', 'REJECTED', 'WITHDRAWN'
]);

const JobSchema = z.object({
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
  matchLevel: z.enum(['HIGH', 'MEDIUM', 'LOW']).nullable(),
  skillGap: z.array(z.string()).nullable(),
  status: JobStatusSchema,
  nextAction: z.string().nullable(),
  nextActionDue: z.string().nullable(),
  notes: z.string().nullable(),
  priority: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const JobActivityTypeSchema = z.enum([
  'APPLICATION', 'MESSAGE', 'WRITTEN_TEST', 'INTERVIEW',
  'FOLLOW_UP', 'OFFER', 'REJECTION'
]);

const JobActivitySchema = z.object({
  id: z.string(),
  jobId: z.string(),
  activityType: JobActivityTypeSchema,
  title: z.string(),
  description: z.string().nullable(),
  scheduledAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  interviewRound: z.number().nullable(),
  interviewType: z.enum(['PHONE', 'VIDEO', 'ONSITE']).nullable(),
  interviewer: z.string().nullable(),
  feedbackMd: z.string().nullable(),
  discoveredGaps: z.array(z.string()).nullable(),
  planEventId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const SkillGapSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  knowledgePointCode: z.string(),
  gapLevel: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  sourceType: z.enum(['JD_ANALYSIS', 'INTERVIEW_FEEDBACK', 'SELF_ASSESSMENT']),
  activityId: z.string().nullable(),
  status: z.enum(['IDENTIFIED', 'LEARNING', 'MASTERED', 'CLOSED']),
  learningAction: z.string().nullable(),
  closedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const JobListResponseSchema = z.object({
  items: z.array(JobSchema),
  total: z.number(),
  filters: z.object({
    status: JobStatusSchema.nullable(),
    platform: z.string().nullable(),
    search: z.string().nullable(),
  }),
});

const JobDetailResponseSchema = z.object({
  job: JobSchema,
  activities: z.array(JobActivitySchema),
  skillGaps: z.array(SkillGapSchema),
});

const JobKanbanColumnSchema = z.object({
  status: JobStatusSchema,
  title: z.string(),
  jobs: z.array(JobSchema),
});

const JobFunnelStatsSchema = z.object({
  saved: z.number(),
  applied: z.number(),
  interviewing: z.number(),
  offer: z.number(),
});

const JobCSVRowSchema = z.object({
  date: z.string().optional(),
  platform: z.string(),
  company: z.string(),
  job_title: z.string(),
  salary: z.string().optional(),
  experience: z.string().optional(),
  location: z.string().optional(),
  source_url: z.string().optional(),
  job_direction: z.string().optional(),
  tech_stack: z.string().optional(),
  jd_keywords: z.string().optional(),
  matched_project: z.string().optional(),
  match_level: z.string().optional(),
  skill_gap: z.string().optional(),
  next_learning_action: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

const JobImportPreviewSchema = z.object({
  total: z.number(),
  valid: z.number(),
  invalid: z.number(),
  preview: z.array(z.object({
    company: z.string(), jobTitle: z.string(), platform: z.string(), status: JobStatusSchema,
  })),
  errors: z.array(z.object({ row: z.number(), field: z.string(), message: z.string() })),
});

const JobImportResultSchema = z.object({ imported: z.number(), message: z.string() });

export const jobsApi = {
  async getJobs(params?: {
    status?: string;
    platform?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.platform) query.set('platform', params.platform);
    if (params?.search) query.set('search', params.search);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));

    const queryString = query.toString();
    const path = queryString ? `/jobs?${queryString}` : '/jobs';

    return request(path, JobListResponseSchema);
  },

  async getJobDetail(id: string, signal?: AbortSignal) {
    return request(`/jobs/${encodeURIComponent(id)}`, JobDetailResponseSchema, { signal });
  },

  async createJob(data: {
    company: string;
    jobTitle: string;
    platform: string;
    salary?: string;
    experience?: string;
    location?: string;
    sourceUrl?: string;
    jobDirection?: string;
    techStack?: string[];
    jdKeywords?: string[];
    matchedProject?: string;
    matchLevel?: 'HIGH' | 'MEDIUM' | 'LOW';
    notes?: string;
    priority?: number;
  }) {
    return request(`/jobs`, JobSchema, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async previewJobImport(rows: z.infer<typeof JobCSVRowSchema>[]) {
    const validatedRows = z.array(JobCSVRowSchema).parse(rows);
    return request('/jobs/import/preview', JobImportPreviewSchema, {
      method: 'POST',
      body: JSON.stringify({ rows: validatedRows }),
    });
  },

  async importJobs(rows: z.infer<typeof JobCSVRowSchema>[]) {
    const validatedRows = z.array(JobCSVRowSchema).parse(rows);
    return request('/jobs/import', JobImportResultSchema, {
      method: 'POST',
      body: JSON.stringify({ rows: validatedRows }),
    });
  },

  async updateJob(id: string, data: {
    status?: z.infer<typeof JobStatusSchema>;
    nextAction?: string;
    nextActionDue?: string;
    notes?: string;
    priority?: number;
  }) {
    return request(`/jobs/${id}`, JobSchema, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteJob(id: string) {
    return request(`/jobs/${id}`, z.object({ deleted: z.boolean() }), { method: 'DELETE' });
  },

  async getJobKanban() {
    return request(`/jobs/kanban`, z.array(JobKanbanColumnSchema));
  },

  async getJobFunnelStats() {
    return request(`/jobs/funnel`, JobFunnelStatsSchema);
  },

  async createJobActivity(jobId: string, data: {
    activityType: z.infer<typeof JobActivityTypeSchema>;
    title: string;
    description?: string;
    scheduledAt?: string;
    interviewRound?: number;
    interviewType?: 'PHONE' | 'VIDEO' | 'ONSITE';
    interviewer?: string;
  }) {
    return request(`/jobs/${jobId}/activities`, JobActivitySchema, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateJobActivity(jobId: string, activityId: string, data: {
    status?: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    feedbackMd?: string;
    discoveredGaps?: string[];
  }) {
    return request(`/jobs/${jobId}/activities/${activityId}`, JobActivitySchema, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async createSkillGap(jobId: string, data: {
    knowledgePointCode: string;
    gapLevel: 'HIGH' | 'MEDIUM' | 'LOW';
    sourceType: 'JD_ANALYSIS' | 'INTERVIEW_FEEDBACK' | 'SELF_ASSESSMENT';
    activityId?: string;
    learningAction?: string;
  }) {
    return request(`/jobs/${jobId}/skill-gaps`, SkillGapSchema, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateSkillGapStatus(jobId: string, gapId: string, status: 'IDENTIFIED' | 'LEARNING' | 'MASTERED' | 'CLOSED') {
    return request(`/jobs/${jobId}/skill-gaps/${gapId}`, SkillGapSchema, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};

export type Job = z.infer<typeof JobSchema>;

export type JobStatus = z.infer<typeof JobStatusSchema>;

export type JobActivity = z.infer<typeof JobActivitySchema>;

export type JobActivityType = z.infer<typeof JobActivityTypeSchema>;

export type SkillGap = z.infer<typeof SkillGapSchema>;

export type JobListResponse = z.infer<typeof JobListResponseSchema>;

export type JobDetailResponse = z.infer<typeof JobDetailResponseSchema>;

export type JobKanbanColumn = z.infer<typeof JobKanbanColumnSchema>;

export type JobFunnelStats = z.infer<typeof JobFunnelStatsSchema>;

export type JobCSVRow = z.infer<typeof JobCSVRowSchema>;

export type JobImportPreview = z.infer<typeof JobImportPreviewSchema>;
