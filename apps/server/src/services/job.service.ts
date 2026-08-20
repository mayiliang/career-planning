/**
 * 岗位服务
 * 
 * Phase 6 实现：岗位管理、求职活动、技能缺口
 */
import { eq, and, or, desc, sql, inArray } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { db } from '../db/index.js';
import {
  jobs,
  jobActivities,
  skillGaps,
  planEvents,
} from '../db/schema.js';
import type {
  JobRecord,
  NewJob,
  JobActivityRecord,
  NewJobActivity,
  SkillGapRecord,
  NewSkillGap,
} from '../db/schema.js';

// ===== 类型导入 =====
import type {
  JobStatus,
  CreateJobRequest,
  UpdateJobRequest,
  CreateJobActivityRequest,
  UpdateJobActivityRequest,
  CreateSkillGapRequest,
  JobListResponse,
  JobDetailResponse,
  JobKanbanResponse,
  JobFunnelStats,
} from '@career-atlas/shared';

// ===== 岗位列表查询 =====

export interface ListJobsOptions {
  status?: JobStatus;
  platform?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function listJobs(options: ListJobsOptions = {}): Promise<JobListResponse> {
  const { status, platform, search, limit = 50, offset = 0 } = options;
  
  // 构建查询条件
  const conditions = [];
  if (status) {
    conditions.push(eq(jobs.status, status));
  }
  if (platform) {
    conditions.push(eq(jobs.platform, platform));
  }
  if (search) {
    conditions.push(
      or(
        sql`${jobs.company} LIKE ${`%${search}%`}`,
        sql`${jobs.jobTitle} LIKE ${`%${search}%`}`
      )
    );
  }
  
  // 查询总数
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(jobs)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  
  const total = countResult[0]?.count || 0;
  
  // 查询列表
  const items = await db.query.jobs.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    limit,
    offset,
    orderBy: [desc(jobs.createdAt)],
  });
  
  return {
    items: items.map(transformJob),
    total,
    filters: {
      status: status || null,
      platform: platform || null,
      search: search || null,
    },
  };
}

// ===== 岗位详情查询 =====

export async function getJobDetail(id: string): Promise<JobDetailResponse | null> {
  const job = await db.query.jobs.findFirst({
    where: eq(jobs.id, id),
  });
  
  if (!job) {
    return null;
  }
  
  // 查询关联的活动
  const activities = await db.query.jobActivities.findMany({
    where: eq(jobActivities.jobId, id),
    orderBy: [desc(jobActivities.createdAt)],
  });
  
  // 查询关联的技能缺口
  const gaps = await db.query.skillGaps.findMany({
    where: eq(skillGaps.jobId, id),
    orderBy: [desc(skillGaps.createdAt)],
  });
  
  return {
    job: transformJob(job),
    activities: activities.map(transformActivity),
    skillGaps: gaps.map(transformSkillGap),
  };
}

// ===== 创建岗位 =====

export async function createJob(request: CreateJobRequest): Promise<JobRecord> {
  const now = new Date().toISOString();
  
  const newJob: NewJob = {
    id: randomUUID(),
    company: request.company,
    jobTitle: request.jobTitle,
    platform: request.platform,
    salary: request.salary || null,
    experience: request.experience || null,
    location: request.location || null,
    sourceUrl: request.sourceUrl || null,
    sourcePath: null,
    jobDirection: request.jobDirection || null,
    techStack: request.techStack ? request.techStack.join(';') : null,
    jdKeywords: request.jdKeywords ? request.jdKeywords.join(';') : null,
    matchedProject: request.matchedProject || null,
    matchLevel: request.matchLevel || null,
    skillGap: null,
    status: 'SAVED',
    nextAction: null,
    nextActionDue: null,
    notes: request.notes || null,
    priority: request.priority || 3,
    createdAt: now,
    updatedAt: now,
  };
  
  const [created] = await db.insert(jobs).values(newJob).returning();
  return requireRecord(created, '创建岗位');
}

// ===== 更新岗位 =====

export async function updateJob(id: string, request: UpdateJobRequest): Promise<JobRecord | null> {
  const existing = await db.query.jobs.findFirst({
    where: eq(jobs.id, id),
  });
  
  if (!existing) {
    return null;
  }
  
  const now = new Date().toISOString();
  const updates: Partial<NewJob> = {
    updatedAt: now,
  };
  
  if (request.status) {
    updates.status = request.status;
  }
  if (request.nextAction !== undefined) {
    updates.nextAction = request.nextAction;
  }
  if (request.nextActionDue !== undefined) {
    updates.nextActionDue = request.nextActionDue;
  }
  if (request.notes !== undefined) {
    updates.notes = request.notes;
  }
  if (request.priority !== undefined) {
    updates.priority = request.priority;
  }
  
  const [updated] = await db
    .update(jobs)
    .set(updates)
    .where(eq(jobs.id, id))
    .returning();
  
  return updated ?? null;
}

// ===== 删除岗位 =====

export async function deleteJob(id: string): Promise<boolean> {
  const result = await db.delete(jobs).where(eq(jobs.id, id)).returning();
  return result.length > 0;
}

// ===== 获取看板视图 =====

export async function getJobKanban(): Promise<JobKanbanResponse> {
  // 定义看板列
  const columns: JobStatus[] = [
    'SAVED',
    'TO_APPLY',
    'APPLIED',
    'CONTACTING',
    'ASSESSMENT',
    'INTERVIEWING',
    'OFFER',
    'REJECTED',
    'WITHDRAWN',
  ];
  
  const columnTitles: Record<JobStatus, string> = {
    'SAVED': '已保存',
    'TO_APPLY': '待投递',
    'APPLIED': '已投递',
    'CONTACTING': '沟通中',
    'ASSESSMENT': '笔试/测评',
    'INTERVIEWING': '面试中',
    'OFFER': '已获 Offer',
    'REJECTED': '已拒绝',
    'WITHDRAWN': '已撤回',
  };
  
  const result = [];
  
  for (const status of columns) {
    const jobsInColumn = await db.query.jobs.findMany({
      where: eq(jobs.status, status),
      orderBy: [desc(jobs.createdAt)],
    });
    
    result.push({
      status,
      title: columnTitles[status],
      jobs: jobsInColumn.map(transformJob),
    });
  }
  
  return result;
}

// ===== 获取漏斗统计 =====

export async function getJobFunnelStats(): Promise<JobFunnelStats> {
  const saved = await db
    .select({ count: sql<number>`count(*)` })
    .from(jobs)
    .where(inArray(jobs.status, ['SAVED', 'TO_APPLY']));
  
  const applied = await db
    .select({ count: sql<number>`count(*)` })
    .from(jobs)
    .where(inArray(jobs.status, ['APPLIED', 'CONTACTING', 'ASSESSMENT']));
  
  const interviewing = await db
    .select({ count: sql<number>`count(*)` })
    .from(jobs)
    .where(eq(jobs.status, 'INTERVIEWING'));
  
  const offer = await db
    .select({ count: sql<number>`count(*)` })
    .from(jobs)
    .where(eq(jobs.status, 'OFFER'));
  
  return {
    saved: saved[0]?.count || 0,
    applied: applied[0]?.count || 0,
    interviewing: interviewing[0]?.count || 0,
    offer: offer[0]?.count || 0,
  };
}

// ===== 求职活动 =====

export async function createJobActivity(request: CreateJobActivityRequest): Promise<JobActivityRecord> {
  const now = new Date().toISOString();
  
  const newActivity: NewJobActivity = {
    id: randomUUID(),
    jobId: request.jobId,
    activityType: request.activityType,
    title: request.title,
    description: request.description || null,
    scheduledAt: request.scheduledAt || null,
    completedAt: null,
    status: 'PLANNED',
    interviewRound: request.interviewRound || null,
    interviewType: request.interviewType || null,
    interviewer: request.interviewer || null,
    feedbackMd: null,
    discoveredGaps: null,
    planEventId: null,
    createdAt: now,
    updatedAt: now,
  };
  
  const [created] = await db.insert(jobActivities).values(newActivity).returning();
  const createdActivity = requireRecord(created, '创建求职活动');
  
  // 同步创建日历事件（如果是面试或笔试）
  if (request.scheduledAt && ['INTERVIEW', 'WRITTEN_TEST'].includes(request.activityType)) {
    await createCalendarEventForActivity(createdActivity);
  }
  
  return createdActivity;
}

export async function updateJobActivity(
  id: string,
  request: UpdateJobActivityRequest
): Promise<JobActivityRecord | null> {
  const existing = await db.query.jobActivities.findFirst({
    where: eq(jobActivities.id, id),
  });
  
  if (!existing) {
    return null;
  }
  
  const now = new Date().toISOString();
  const updates: Partial<NewJobActivity> = {
    updatedAt: now,
  };
  
  if (request.status) {
    updates.status = request.status;
    if (request.status === 'COMPLETED') {
      updates.completedAt = now;
    }
  }
  if (request.feedbackMd !== undefined) {
    updates.feedbackMd = request.feedbackMd;
  }
  if (request.discoveredGaps !== undefined) {
    updates.discoveredGaps = request.discoveredGaps ? JSON.stringify(request.discoveredGaps) : null;
  }
  
  const [updated] = await db
    .update(jobActivities)
    .set(updates)
    .where(eq(jobActivities.id, id))
    .returning();
  
  return updated ?? null;
}

// ===== 技能缺口 =====

export async function createSkillGap(request: CreateSkillGapRequest): Promise<SkillGapRecord> {
  const now = new Date().toISOString();
  
  const newGap: NewSkillGap = {
    id: randomUUID(),
    jobId: request.jobId,
    knowledgePointCode: request.knowledgePointCode,
    gapLevel: request.gapLevel,
    sourceType: request.sourceType,
    activityId: request.activityId || null,
    status: 'IDENTIFIED',
    learningAction: request.learningAction || null,
    closedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  
  const [created] = await db.insert(skillGaps).values(newGap).returning();
  return requireRecord(created, '创建技能缺口');
}

export async function updateSkillGapStatus(
  id: string,
  status: 'IDENTIFIED' | 'LEARNING' | 'MASTERED' | 'CLOSED'
): Promise<SkillGapRecord | null> {
  const existing = await db.query.skillGaps.findFirst({
    where: eq(skillGaps.id, id),
  });
  
  if (!existing) {
    return null;
  }
  
  const now = new Date().toISOString();
  const updates: Partial<NewSkillGap> = {
    status,
    updatedAt: now,
  };
  
  if (status === 'CLOSED') {
    updates.closedAt = now;
  }
  
  const [updated] = await db
    .update(skillGaps)
    .set(updates)
    .where(eq(skillGaps.id, id))
    .returning();
  
  return updated ?? null;
}

// ===== CSV 导入 =====

export interface JobCSVRow {
  date?: string;
  platform: string;
  company: string;
  job_title: string;
  salary?: string;
  experience?: string;
  location?: string;
  source_url?: string;
  job_direction?: string;
  tech_stack?: string;
  jd_keywords?: string;
  matched_project?: string;
  match_level?: 'HIGH' | 'MEDIUM' | 'LOW';
  skill_gap?: string;
  next_learning_action?: string;
  status?: JobStatus;
  notes?: string;
}

export async function importJobsFromCSV(rows: JobCSVRow[]): Promise<number> {
  const now = new Date().toISOString();
  let imported = 0;
  
  for (const row of rows) {
    if (!row.company || !row.job_title || !row.platform) {
      continue;
    }
    
    const newJob: NewJob = {
      id: randomUUID(),
      company: row.company,
      jobTitle: row.job_title,
      platform: row.platform,
      salary: row.salary || null,
      experience: row.experience || null,
      location: row.location || null,
      sourceUrl: row.source_url || null,
      sourcePath: null,
      jobDirection: row.job_direction || null,
      techStack: row.tech_stack ? row.tech_stack.split(';').filter(Boolean).join(';') : null,
      jdKeywords: row.jd_keywords ? row.jd_keywords.split(';').filter(Boolean).join(';') : null,
      matchedProject: row.matched_project || null,
      matchLevel: row.match_level || null,
      skillGap: row.skill_gap ? row.skill_gap.split(';').filter(Boolean).join(';') : null,
      status: row.status || 'SAVED',
      nextAction: row.next_learning_action || null,
      nextActionDue: null,
      notes: row.notes || null,
      priority: 3,
      createdAt: now,
      updatedAt: now,
    };
    
    await db.insert(jobs).values(newJob);
    imported++;
  }
  
  return imported;
}

// ===== 私有辅助函数 =====

function transformJob(record: JobRecord): Job {
  return {
    id: record.id,
    company: record.company,
    jobTitle: record.jobTitle,
    platform: record.platform,
    salary: record.salary,
    experience: record.experience,
    location: record.location,
    sourceUrl: record.sourceUrl,
    jobDirection: record.jobDirection,
    techStack: record.techStack ? record.techStack.split(';') : null,
    jdKeywords: record.jdKeywords ? record.jdKeywords.split(';') : null,
    matchedProject: record.matchedProject,
    matchLevel: record.matchLevel as 'HIGH' | 'MEDIUM' | 'LOW' | null,
    skillGap: record.skillGap ? record.skillGap.split(';') : null,
    status: record.status as JobStatus,
    nextAction: record.nextAction,
    nextActionDue: record.nextActionDue,
    notes: record.notes,
    priority: record.priority,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function transformActivity(record: JobActivityRecord): JobActivity {
  return {
    id: record.id,
    jobId: record.jobId,
    activityType: record.activityType as 'APPLICATION' | 'MESSAGE' | 'WRITTEN_TEST' | 'INTERVIEW' | 'FOLLOW_UP' | 'OFFER' | 'REJECTION',
    title: record.title,
    description: record.description,
    scheduledAt: record.scheduledAt,
    completedAt: record.completedAt,
    status: record.status as 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
    interviewRound: record.interviewRound,
    interviewType: record.interviewType as 'PHONE' | 'VIDEO' | 'ONSITE' | null,
    interviewer: record.interviewer,
    feedbackMd: record.feedbackMd,
    discoveredGaps: record.discoveredGaps ? JSON.parse(record.discoveredGaps) : null,
    planEventId: record.planEventId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function transformSkillGap(record: SkillGapRecord): SkillGap {
  return {
    id: record.id,
    jobId: record.jobId,
    knowledgePointCode: record.knowledgePointCode,
    gapLevel: record.gapLevel as 'HIGH' | 'MEDIUM' | 'LOW',
    sourceType: record.sourceType as 'JD_ANALYSIS' | 'INTERVIEW_FEEDBACK' | 'SELF_ASSESSMENT',
    activityId: record.activityId,
    status: record.status as 'IDENTIFIED' | 'LEARNING' | 'MASTERED' | 'CLOSED',
    learningAction: record.learningAction,
    closedAt: record.closedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function createCalendarEventForActivity(activity: JobActivityRecord): Promise<void> {
  const job = await db.query.jobs.findFirst({
    where: eq(jobs.id, activity.jobId),
  });
  
  if (!job) return;
  
  const scheduledTime = new Date(activity.scheduledAt!);
  const endTime = new Date(scheduledTime.getTime() + 60 * 60 * 1000); // 1小时
  
  await db.insert(planEvents).values({
    id: randomUUID(),
    eventType: activity.activityType === 'INTERVIEW' ? 'INTERVIEW' : 'JOB_APPLICATION',
    title: `${activity.activityType === 'INTERVIEW' ? '面试' : '笔试'}: ${job.company} - ${job.jobTitle}`,
    description: activity.description,
    startAt: scheduledTime.toISOString(),
    endAt: endTime.toISOString(),
    allDay: false,
    status: 'PLANNED',
    priority: 1,
    knowledgePointId: null,
    jobId: job.id,
    assessmentSessionId: null,
    sourceType: 'USER',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

// 类型定义（因为需要从 shared 包导入）
type Job = {
  id: string;
  company: string;
  jobTitle: string;
  platform: string;
  salary: string | null;
  experience: string | null;
  location: string | null;
  sourceUrl: string | null;
  jobDirection: string | null;
  techStack: string[] | null;
  jdKeywords: string[] | null;
  matchedProject: string | null;
  matchLevel: 'HIGH' | 'MEDIUM' | 'LOW' | null;
  skillGap: string[] | null;
  status: JobStatus;
  nextAction: string | null;
  nextActionDue: string | null;
  notes: string | null;
  priority: number;
  createdAt: string;
  updatedAt: string;
};

type JobActivity = {
  id: string;
  jobId: string;
  activityType: 'APPLICATION' | 'MESSAGE' | 'WRITTEN_TEST' | 'INTERVIEW' | 'FOLLOW_UP' | 'OFFER' | 'REJECTION';
  title: string;
  description: string | null;
  scheduledAt: string | null;
  completedAt: string | null;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  interviewRound: number | null;
  interviewType: 'PHONE' | 'VIDEO' | 'ONSITE' | null;
  interviewer: string | null;
  feedbackMd: string | null;
  discoveredGaps: string[] | null;
  planEventId: string | null;
  createdAt: string;
  updatedAt: string;
};

type SkillGap = {
  id: string;
  jobId: string;
  knowledgePointCode: string;
  gapLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  sourceType: 'JD_ANALYSIS' | 'INTERVIEW_FEEDBACK' | 'SELF_ASSESSMENT';
  activityId: string | null;
  status: 'IDENTIFIED' | 'LEARNING' | 'MASTERED' | 'CLOSED';
  learningAction: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function requireRecord<T>(record: T | undefined, action: string): T {
  if (!record) {
    throw new Error(`${action}失败：数据库未返回记录`);
  }
  return record;
}
