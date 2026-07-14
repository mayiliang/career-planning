/**
 * API Client - 前端与本地服务的通信层
 *
 * Phase 0 实现：
 * - 基础 fetch wrapper
 * - 健康检查 API
 * - 类型化响应处理
 *
 * Phase 2 新增：
 * - 知识点 API
 *
 * Phase 3 新增：
 * - 日历 API
 *
 * Phase 4 新增：
 * - 知识图谱 API
 *
 * Phase 6 新增：
 * - 求职 API
 */
import { z } from 'zod';

// API 基础 URL（Vite proxy 配置后可直接使用 /api）
const API_BASE = '/api/v1';

// 响应包装器 Schema
const ApiResponseSchema = z.object({
  data: z.unknown(),
  meta: z.object({
    requestId: z.string(),
  }),
});

const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
    retryable: z.boolean(),
  }),
  meta: z.object({
    requestId: z.string(),
  }),
});

// 健康检查响应 Schema
const HealthResponseSchema = z.object({
  ok: z.boolean(),
  db: z.boolean(),
  dataDir: z.boolean(),
  aiConfigured: z.boolean(),
  timestamp: z.string(),
});

// ===== 知识点 Schema =====

// 知识点列表项 Schema
const KnowledgePointListItemSchema = z.object({
  id: z.string(),
  code: z.string(),
  title: z.string(),
  difficulty: z.enum(['intermediate', 'senior', 'advanced']),
  planWeek: z.number().nullable(),
  status: z.enum(['NOT_STARTED', 'LEARNING', 'SELF_MASTERED', 'FIRST_PASS_PENDING_RETEST', 'MASTERED', 'NEEDS_RELEARNING']),
  domainId: z.string(),
  domainCode: z.string(),
  domainTitle: z.string(),
  selfMasteredAt: z.string().nullable(),
  firstPassedAt: z.string().nullable(),
  masteredAt: z.string().nullable(),
});

// 知识点详情 Schema
const KnowledgePointDetailSchema = KnowledgePointListItemSchema.extend({
  summary: z.string().nullable(),
  studyMaterialMd: z.string(),
  assessmentSpecMd: z.string(),
  passCriteriaMd: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// 知识点列表响应 Schema
const KnowledgeListResponseSchema = z.object({
  items: z.array(KnowledgePointListItemSchema),
  total: z.number(),
});

// ===== 日历 Schema =====

// 事件类型枚举
const EventTypeSchema = z.enum([
  'LEARNING', 'ASSESSMENT', 'RETEST', 'PROJECT_OUTPUT',
  'JOB_APPLICATION', 'INTERVIEW', 'REVIEW'
]);

// 事件状态枚举
const EventStatusSchema = z.enum([
  'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'PARTIAL', 'SKIPPED', 'RESCHEDULED'
]);

// 打卡结果枚举
const CheckinResultSchema = z.enum(['COMPLETED', 'PARTIAL', 'SKIPPED', 'RESCHEDULED']);

const LearningBriefPointSchema = z.object({
  id: z.string(),
  code: z.string(),
  title: z.string(),
  status: z.string(),
  domainCode: z.string(),
  domainTitle: z.string(),
  prerequisites: z.array(z.object({
    id: z.string(),
    code: z.string(),
    title: z.string(),
    status: z.string(),
  })),
});

const PlanLearningBriefSchema = z.object({
  displayTitle: z.string(),
  weekTheme: z.string(),
  learningContent: z.array(z.string()),
  masteryGoals: z.array(z.object({ code: z.string(), text: z.string() })),
  tasks: z.array(z.object({ code: z.string(), text: z.string() })),
  outputs: z.array(z.string()),
  reviewQuestion: z.string(),
  prerequisitesReady: z.boolean(),
  pendingPrerequisiteCount: z.number(),
  knowledgePoints: z.array(LearningBriefPointSchema),
});

// 计划事件 Schema
const PlanEventSchema = z.object({
  id: z.string(),
  eventType: EventTypeSchema,
  title: z.string(),
  description: z.string().nullable(),
  startAt: z.string(),
  endAt: z.string(),
  allDay: z.boolean(),
  status: EventStatusSchema,
  priority: z.number(),
  knowledgePointId: z.string().nullable(),
  jobId: z.string().nullable(),
  assessmentSessionId: z.string().nullable(),
  recurrenceRule: z.string().nullable(),
  recurrenceParentId: z.string().nullable(),
  rescheduledToId: z.string().nullable(),
  rescheduledFromId: z.string().nullable(),
  sourceType: z.enum(['TEMPLATE', 'USER', 'SYSTEM']),
  templateWeek: z.number().nullable(),
  templateDay: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  learningBrief: PlanLearningBriefSchema.nullable().optional(),
});

// 打卡记录 Schema
const CheckinSchema = z.object({
  id: z.string(),
  planEventId: z.string(),
  result: CheckinResultSchema,
  actualMinutes: z.number().nullable(),
  noteMd: z.string().nullable(),
  energyLevel: z.number().nullable(),
  difficultyLevel: z.number().nullable(),
  evidencePath: z.string().nullable(),
  checkedAt: z.string(),
  createdAt: z.string(),
});

// 今日计划 Schema
const TodayPlanSchema = z.object({
  events: z.array(PlanEventSchema),
  retests: z.array(PlanEventSchema),
  stats: z.object({
    total: z.number(),
    completed: z.number(),
    inProgress: z.number(),
    planned: z.number(),
  }),
});

// 计划导入预览 Schema
const PlanImportPreviewSchema = z.object({
  totalItems: z.number(),
  weeks: z.array(z.object({
    week: z.number(),
    theme: z.string(),
    itemCount: z.number(),
  })),
  items: z.array(z.object({
    week: z.number(),
    day: z.string(),
    date: z.string(),
    title: z.string(),
    learningTopic: z.string(),
    practiceTask: z.string(),
  })),
});

const LeaveDaySchema = z.object({
  id: z.string(),
  leaveDate: z.string(),
  reason: z.string().nullable(),
  shiftedEventCount: z.number(),
  createdAt: z.string(),
});

// ===== 知识图谱 Schema =====

// 图谱节点 Schema
const GraphNodeSchema = z.object({
  id: z.string(),
  type: z.enum(['domain', 'knowledge']),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: z.object({
    code: z.string(),
    title: z.string(),
    status: z.string().optional(),
    domainCode: z.string().optional(),
    domainTitle: z.string().optional(),
    difficulty: z.string().optional(),
    selfMastered: z.boolean().optional(),
    strictPassed: z.boolean().optional(),
    pointCount: z.number().optional(),
    masteredCount: z.number().optional(),
  }),
});

// 图谱边 Schema
const GraphEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  type: z.string(),
  animated: z.boolean().optional(),
  data: z.object({
    edgeType: z.string(),
    weight: z.number(),
  }),
});

// 图谱数据 Schema
const GraphDataSchema = z.object({
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
});

// 领域统计 Schema
const DomainStatsSchema = z.object({
  id: z.string(),
  code: z.string(),
  title: z.string(),
  orderIndex: z.number(),
  pointCount: z.number(),
  masteredCount: z.number(),
  learningCount: z.number(),
  notStartedCount: z.number(),
});

// 知识关系 Schema
const RelationPointSchema = z.object({
  id: z.string(),
  code: z.string(),
  title: z.string(),
  status: z.string(),
  domainCode: z.string(),
  domainTitle: z.string(),
  description: z.string().nullable(),
  weight: z.number(),
});

const KnowledgeRelationsSchema = z.object({
  prerequisites: z.array(RelationPointSchema),
  dependents: z.array(RelationPointSchema),
  related: z.array(RelationPointSchema),
  appliedWith: z.array(RelationPointSchema),
});

const KnowledgeTreeSchema = z.object({
  title: z.string(),
  totalPoints: z.number(),
  groups: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    domains: z.array(z.object({
      id: z.string(),
      code: z.string(),
      title: z.string(),
      description: z.string().nullable(),
      points: z.array(z.object({
        id: z.string(),
        code: z.string(),
        title: z.string(),
        status: z.string(),
      })),
    })),
  })),
});

// ===== 求职 Schema =====

// 岗位状态枚举
const JobStatusSchema = z.enum([
  'SAVED', 'TO_APPLY', 'APPLIED', 'CONTACTING',
  'ASSESSMENT', 'INTERVIEWING', 'OFFER', 'REJECTED', 'WITHDRAWN'
]);

// 岗位 Schema
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

// 求职活动类型枚举
const JobActivityTypeSchema = z.enum([
  'APPLICATION', 'MESSAGE', 'WRITTEN_TEST', 'INTERVIEW',
  'FOLLOW_UP', 'OFFER', 'REJECTION'
]);

// 求职活动 Schema
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

// 技能缺口 Schema
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

// 岗位列表响应 Schema
const JobListResponseSchema = z.object({
  items: z.array(JobSchema),
  total: z.number(),
  filters: z.object({
    status: JobStatusSchema.nullable(),
    platform: z.string().nullable(),
    search: z.string().nullable(),
  }),
});

// 岗位详情响应 Schema
const JobDetailResponseSchema = z.object({
  job: JobSchema,
  activities: z.array(JobActivitySchema),
  skillGaps: z.array(SkillGapSchema),
});

// 看板列 Schema
const JobKanbanColumnSchema = z.object({
  status: JobStatusSchema,
  title: z.string(),
  jobs: z.array(JobSchema),
});

// 漏斗统计 Schema
const JobFunnelStatsSchema = z.object({
  saved: z.number(),
  applied: z.number(),
  interviewing: z.number(),
  offer: z.number(),
});

// ===== 严格考核与系统运维 Schema =====

const AssessmentSessionSchema = z.object({
  id: z.string(),
  knowledgePointCode: z.string(),
  assessmentType: z.enum(['FIRST', 'RETEST', 'MONTHLY_REVIEW', 'DOMAIN_COMPREHENSIVE']),
  status: z.enum(['DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'GRADING', 'GRADED', 'ERROR', 'CANCELLED']),
  durationMinutes: z.number(),
  startedAt: z.string().nullable(),
  submittedAt: z.string().nullable(),
  gradedAt: z.string().nullable(),
  resultId: z.string().nullable(),
  provider: z.string().nullable(),
  model: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const AssessmentQuestionSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  questionType: z.enum(['CHOICE', 'OUTPUT', 'ESSAY', 'CODE_READ', 'CODE_WRITE']),
  dimension: z.enum(['principlesAndBoundaries', 'practice', 'troubleshootingAndDesign', 'projectCommunication']),
  questionContent: z.string(),
  maxScore: z.number(),
  orderIndex: z.number(),
  createdAt: z.string(),
});

const AssessmentAnswerSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  questionId: z.string(),
  answerContent: z.string(),
  deterministicResult: z.string().nullable(),
  answeredAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const AssessmentDetailSchema = z.object({
  session: AssessmentSessionSchema,
  questions: z.array(AssessmentQuestionSchema),
  answers: z.array(AssessmentAnswerSchema),
});

const AssessmentResultSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  principlesScore: z.number(),
  practiceScore: z.number(),
  troubleshootingScore: z.number(),
  communicationScore: z.number(),
  totalScore: z.number(),
  verdict: z.enum(['PASS', 'FAIL', 'MANUAL_REVIEW']),
  confidence: z.string(),
  criticalFailures: z.string().nullable(),
  weaknesses: z.string().nullable(),
  feedback: z.string().nullable(),
  createdAt: z.string(),
});

const AIStatusSchema = z.object({
  configured: z.boolean(),
  provider: z.string(),
  model: z.string(),
  connectionOk: z.boolean().optional(),
});

const ExecutorStatusSchema = z.object({
  available: z.boolean(),
  type: z.string(),
  warnings: z.array(z.string()),
});

const BackupMetadataSchema = z.object({
  filename: z.string(),
  createdAt: z.string(),
  size: z.number(),
  checksum: z.string(),
  version: z.string(),
  stats: z.object({
    knowledgePoints: z.number(),
    planEvents: z.number(),
    assessments: z.number(),
    jobs: z.number(),
  }),
  note: z.string().optional(),
});

// API 错误类型
export class ApiError extends Error {
  code: string;
  retryable: boolean;
  requestId: string;

  constructor(code: string, message: string, retryable: boolean, requestId: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.retryable = retryable;
    this.requestId = requestId;
  }
}

// 通用请求函数
async function request<T>(
  path: string,
  schema: z.ZodSchema<T>,
  options?: RequestInit
): Promise<T> {
  const headers = new Headers(options?.headers);
  if (options?.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const parsed = ApiErrorSchema.safeParse(json);
    if (parsed.success) {
      throw new ApiError(
        parsed.data.error.code,
        parsed.data.error.message,
        parsed.data.error.retryable,
        parsed.data.meta.requestId
      );
    }
    const fallback = json && typeof json === 'object' ? json as { message?: string; error?: string } : {};
    throw new ApiError(`HTTP_${response.status}`, fallback.message || fallback.error || '本地服务请求失败', false, 'unknown');
  }

  const parsed = ApiResponseSchema.parse(json);
  return schema.parse(parsed.data);
}

// API Client 对象
export const apiClient = {
  // 健康检查
  async getHealth() {
    return request('/system/health', HealthResponseSchema);
  },

  // ===== 知识点 API =====

  /**
   * 获取知识点列表（支持筛选）
   */
  async getKnowledgePoints(params?: {
    domainId?: string;
    status?: string;
    search?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.domainId) query.set('domainId', params.domainId);
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);

    const queryString = query.toString();
    const path = queryString ? `/knowledge/points?${queryString}` : '/knowledge/points';

    return request(path, KnowledgeListResponseSchema);
  },

  /**
   * 获取知识点详情
   */
  async getKnowledgePoint(code: string) {
    return request(`/knowledge/points/${code}`, KnowledgePointDetailSchema);
  },

  /**
   * 更新知识点摘要
   */
  async updateKnowledgePointSummary(code: string, summary: string) {
    return request(`/knowledge/points/${code}`, z.object({ updatedAt: z.string() }), {
      method: 'PATCH',
      body: JSON.stringify({ summary }),
    });
  },

  /**
   * 自评掌握
   */
  async selfMasterKnowledgePoint(code: string, summary: string) {
    return request(`/knowledge/points/${code}/self-master`, z.object({
      previousStatus: z.string(),
      newStatus: z.string(),
      selfMasteredAt: z.string(),
    }), {
      method: 'POST',
      body: JSON.stringify({ summary }),
    });
  },

  // ===== 日历 API =====

  /**
   * 获取日历事件（按日期范围）
   */
  async getCalendarEvents(params: {
    from: string;
    to: string;
    eventType?: string;
    status?: string;
  }) {
    const query = new URLSearchParams();
    query.set('from', params.from);
    query.set('to', params.to);
    if (params.eventType) query.set('eventType', params.eventType);
    if (params.status) query.set('status', params.status);

    return request(`/calendar/events?${query.toString()}`, z.array(PlanEventSchema));
  },

  /**
   * 获取事件详情
   */
  async getCalendarEvent(id: string) {
    return request(`/calendar/events/${id}`, PlanEventSchema);
  },

  /**
   * 创建事件
   */
  async createCalendarEvent(data: {
    eventType: z.infer<typeof EventTypeSchema>;
    title: string;
    description?: string;
    startAt: string;
    endAt: string;
    allDay?: boolean;
    priority?: number;
    knowledgePointId?: string;
  }) {
    return request(`/calendar/events`, PlanEventSchema, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * 更新事件
   */
  async updateCalendarEvent(id: string, data: {
    title?: string;
    description?: string;
    startAt?: string;
    endAt?: string;
    priority?: number;
    status?: z.infer<typeof EventStatusSchema>;
  }) {
    return request(`/calendar/events/${id}`, PlanEventSchema, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * 打卡
   */
  async checkinEvent(eventId: string, data: {
    result: z.infer<typeof CheckinResultSchema>;
    actualMinutes?: number;
    noteMd?: string;
    energyLevel?: number;
    difficultyLevel?: number;
  }) {
    return request(`/calendar/events/${eventId}/checkins`, z.object({
      checkin: CheckinSchema,
      event: PlanEventSchema,
    }), {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * 改期
   */
  async rescheduleEvent(eventId: string, data: {
    newStartAt: string;
    newEndAt: string;
  }) {
    return request(`/calendar/events/${eventId}/reschedule`, z.object({
      original: PlanEventSchema,
      newEvent: PlanEventSchema,
    }), {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * 获取今日计划
   */
  async getTodayPlan(date?: string) {
    const query = date ? `?date=${date}` : '';
    return request(`/calendar/today${query}`, TodayPlanSchema);
  },

  async saveDailyReview(date: string, summaryMd: string) {
    return request(`/calendar/reviews/daily/${date}`, z.object({
      id: z.string(),
      reviewDate: z.string(),
      summaryMd: z.string().nullable(),
      updatedAt: z.string(),
    }).passthrough(), {
      method: 'PUT',
      body: JSON.stringify({ summaryMd }),
    });
  },

  async getLeaveDays(from: string, to: string) {
    return request(`/calendar/leaves?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, z.array(LeaveDaySchema));
  },

  async takeLeave(date: string, reason?: string) {
    return request('/calendar/leaves', LeaveDaySchema, {
      method: 'POST',
      body: JSON.stringify({ date, reason }),
    });
  },

  /**
   * 预览计划导入
   */
  async previewPlanImport(data: {
    startDate: string;
    templatePath?: string;
  }) {
    return request(`/calendar/plan/preview`, PlanImportPreviewSchema, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * 执行计划导入
   */
  async importPlan(data: {
    startDate: string;
    templatePath?: string;
  }) {
    return request(`/calendar/plan/import`, z.object({
      imported: z.number(),
      eventIds: z.array(z.string()),
    }), {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // ===== 知识图谱 API =====

  /**
   * 获取领域统计
   */
  async getDomainStats() {
    return request('/knowledge/domains', z.array(DomainStatsSchema));
  },

  /**
   * 获取图谱数据
   */
  async getGraphData(params?: {
    domainCode?: string;
    collapsedDomains?: string[];
  }) {
    const query = new URLSearchParams();
    if (params?.domainCode) query.set('domainCode', params.domainCode);
    if (params?.collapsedDomains) query.set('collapsedDomains', params.collapsedDomains.join(','));

    const queryString = query.toString();
    const path = queryString ? `/knowledge/graph?${queryString}` : '/knowledge/graph';

    return request(path, GraphDataSchema);
  },

  async getKnowledgeTree() {
    return request('/knowledge/tree', KnowledgeTreeSchema);
  },

  /**
   * 获取知识点关系
   */
  async getKnowledgeRelations(pointId: string) {
    return request(`/knowledge/points/${pointId}/relations`, KnowledgeRelationsSchema);
  },

  // ===== 严格考核 API =====

  async createAssessment(data: {
    knowledgePointCode: string;
    type: 'FIRST' | 'RETEST' | 'MONTHLY_REVIEW' | 'DOMAIN_COMPREHENSIVE';
    durationMinutes: number;
  }) {
    return request('/assessments', AssessmentSessionSchema, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getAssessment(id: string) {
    return request(`/assessments/${id}`, AssessmentDetailSchema);
  },

  async startAssessment(id: string) {
    return request(`/assessments/${id}/start`, AssessmentSessionSchema, { method: 'POST' });
  },

  async saveAssessmentAnswer(id: string, questionId: string, answerContent: string) {
    return request(`/assessments/${id}/answers/${questionId}`, AssessmentAnswerSchema, {
      method: 'PUT',
      body: JSON.stringify({ answerContent }),
    });
  },

  async submitAssessment(id: string) {
    return request(`/assessments/${id}/submit`, AssessmentSessionSchema, { method: 'POST' });
  },

  async gradeAssessment(id: string) {
    return request(`/assessments/${id}/grade`, z.object({
      session: AssessmentSessionSchema,
      result: AssessmentResultSchema,
      knowledgePointUpdated: z.boolean(),
      retestEventCreated: z.boolean(),
    }), {
      method: 'POST',
      body: JSON.stringify({ provider: 'deepseek' }),
    });
  },

  async regradeAssessment(id: string) {
    return request(`/assessments/${id}/regrade`, z.object({
      result: AssessmentResultSchema,
      knowledgePointUpdated: z.boolean(),
      retestEventCreated: z.boolean(),
    }), { method: 'POST' });
  },

  async getAssessmentResult(id: string) {
    return request(`/assessments/${id}/result`, AssessmentResultSchema);
  },

  // ===== 系统与备份 API =====

  async getAIStatus() {
    return request('/system/ai/status', AIStatusSchema);
  },

  async getExecutorStatus() {
    return request('/system/executor/status', ExecutorStatusSchema);
  },

  async getImportStatus() {
    return request('/import/status', z.object({
      hasData: z.boolean(),
      domainCount: z.number(),
      pointCount: z.number(),
      pointCodes: z.array(z.string()),
    }));
  },

  async executeContentImport() {
    return request('/import/execute', z.object({
      importedDomains: z.number(),
      updatedDomains: z.number(),
      importedPoints: z.number(),
      updatedPoints: z.number(),
      skippedPoints: z.number(),
      totalPoints: z.number(),
    }), { method: 'POST' });
  },

  async listBackups() {
    return request('/backups', z.array(BackupMetadataSchema));
  },

  async createBackup(note?: string) {
    return request('/backups', BackupMetadataSchema, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  },

  async restoreBackup(filename: string) {
    return request(`/backups/${encodeURIComponent(filename)}/restore`, z.object({
      message: z.string(),
      restartRequired: z.boolean(),
    }), {
      method: 'POST',
      body: JSON.stringify({ confirm: filename }),
    });
  },

  async deleteBackup(filename: string) {
    return request(`/backups/${encodeURIComponent(filename)}`, z.object({ message: z.string() }), {
      method: 'DELETE',
      body: JSON.stringify({ confirm: filename }),
    });
  },

  // ===== 求职 API =====

  /**
   * 获取岗位列表
   */
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

  /**
   * 获取岗位详情
   */
  async getJobDetail(id: string) {
    return request(`/jobs/${id}`, JobDetailResponseSchema);
  },

  /**
   * 创建岗位
   */
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

  /**
   * 更新岗位
   */
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

  /**
   * 删除岗位
   */
  async deleteJob(id: string) {
    await fetch(`${API_BASE}/jobs/${id}`, { method: 'DELETE' });
  },

  /**
   * 获取看板视图
   */
  async getJobKanban() {
    return request(`/jobs/kanban`, z.array(JobKanbanColumnSchema));
  },

  /**
   * 获取漏斗统计
   */
  async getJobFunnelStats() {
    return request(`/jobs/funnel`, JobFunnelStatsSchema);
  },

  /**
   * 创建求职活动
   */
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

  /**
   * 更新求职活动
   */
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

  /**
   * 创建技能缺口
   */
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

  /**
   * 更新技能缺口状态
   */
  async updateSkillGapStatus(jobId: string, gapId: string, status: 'IDENTIFIED' | 'LEARNING' | 'MASTERED' | 'CLOSED') {
    return request(`/jobs/${jobId}/skill-gaps/${gapId}`, SkillGapSchema, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};

// 导出类型
export type KnowledgePointListItem = z.infer<typeof KnowledgePointListItemSchema>;
export type KnowledgePointDetail = z.infer<typeof KnowledgePointDetailSchema>;
export type PlanEvent = z.infer<typeof PlanEventSchema>;
export type Checkin = z.infer<typeof CheckinSchema>;
export type TodayPlan = z.infer<typeof TodayPlanSchema>;
export type PlanLearningBrief = z.infer<typeof PlanLearningBriefSchema>;
export type LearningBriefPoint = z.infer<typeof LearningBriefPointSchema>;
export type PlanImportPreview = z.infer<typeof PlanImportPreviewSchema>;
export type LeaveDay = z.infer<typeof LeaveDaySchema>;
export type EventType = z.infer<typeof EventTypeSchema>;
export type EventStatus = z.infer<typeof EventStatusSchema>;
export type CheckinResult = z.infer<typeof CheckinResultSchema>;
export type GraphNode = z.infer<typeof GraphNodeSchema>;
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;
export type GraphData = z.infer<typeof GraphDataSchema>;
export type DomainStats = z.infer<typeof DomainStatsSchema>;
export type KnowledgeRelations = z.infer<typeof KnowledgeRelationsSchema>;
export type RelationPoint = z.infer<typeof RelationPointSchema>;
export type KnowledgeTree = z.infer<typeof KnowledgeTreeSchema>;
export type AssessmentSession = z.infer<typeof AssessmentSessionSchema>;
export type AssessmentQuestion = z.infer<typeof AssessmentQuestionSchema>;
export type AssessmentAnswer = z.infer<typeof AssessmentAnswerSchema>;
export type AssessmentDetail = z.infer<typeof AssessmentDetailSchema>;
export type AssessmentResult = z.infer<typeof AssessmentResultSchema>;
export type BackupMetadata = z.infer<typeof BackupMetadataSchema>;
// 求职相关类型
export type Job = z.infer<typeof JobSchema>;
export type JobStatus = z.infer<typeof JobStatusSchema>;
export type JobActivity = z.infer<typeof JobActivitySchema>;
export type JobActivityType = z.infer<typeof JobActivityTypeSchema>;
export type SkillGap = z.infer<typeof SkillGapSchema>;
export type JobListResponse = z.infer<typeof JobListResponseSchema>;
export type JobDetailResponse = z.infer<typeof JobDetailResponseSchema>;
export type JobKanbanColumn = z.infer<typeof JobKanbanColumnSchema>;
export type JobFunnelStats = z.infer<typeof JobFunnelStatsSchema>;
