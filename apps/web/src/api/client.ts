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
  secondaryTopic: z.string(),
  topicOrder: z.number().int().nonnegative(),
  difficulty: z.enum(['intermediate', 'senior', 'advanced']),
  capabilityLayer: z.enum(['CORE', 'APPLICATION', 'SPECIALTY', 'LEADERSHIP']),
  requirementLevel: z.enum(['REQUIRED', 'TRACK_REQUIRED', 'ELECTIVE']),
  maturity: z.enum(['STABLE', 'EVOLVING', 'EXPERIMENTAL']),
  aiRelation: z.enum(['NONE', 'AI_ASSISTED', 'AI_NATIVE', 'AGENTIC']),
  portability: z.enum(['PORTABLE', 'FRAMEWORK_SPECIFIC', 'VENDOR_SPECIFIC', 'PLATFORM_SPECIFIC', 'JURISDICTION_SPECIFIC']),
  applicabilityTags: z.array(z.enum(['FRAMEWORK_SPECIFIC', 'VENDOR_SPECIFIC', 'PLATFORM_SPECIFIC', 'JURISDICTION_SPECIFIC'])),
  topicTags: z.array(z.string()),
  trackIds: z.array(z.enum(['react', 'vue', 'umi-antd', 'agent-mcp'])),
  verifiedAt: z.string(),
  fallbackStrategy: z.string(),
  planWeek: z.number().nullable(),
  status: z.enum(['NOT_STARTED', 'LEARNING', 'SELF_MASTERED', 'FIRST_PASS_PENDING_RETEST', 'MASTERED', 'NEEDS_RELEARNING']),
  learningState: z.enum(['NOT_STARTED', 'LEARNING', 'LEARNED', 'DEFERRED']),
  masteryLevel: z.number().int().min(0).max(4),
  learnedAt: z.string().nullable(),
  deferredAt: z.string().nullable(),
  deferReason: z.string().nullable(),
  currentFocus: z.boolean(),
  domainId: z.string(),
  domainCode: z.string(),
  domainTitle: z.string(),
  selfMasteredAt: z.string().nullable(),
  firstPassedAt: z.string().nullable(),
  masteredAt: z.string().nullable(),
  routeOrder: z.number(),
  studyMinutes: z.number(),
  practiceMinutes: z.number(),
  projectMinutes: z.number(),
  assessmentMinutes: z.number(),
  retestMinutes: z.number(),
  estimatedTotalMinutes: z.number(),
  challengeProfile: z.enum(['THEORY_ONLY', 'EXAMPLE_DRIVEN', 'CODING', 'DEBUGGING', 'TOOL_OPERATION', 'DESIGN_CASE']),
});

const KnowledgeRecommendationSchema = z.object({
  action: z.enum(['LEARN', 'CONTINUE', 'ASSESS', 'RETEST', 'RELEARN', 'COMPLETE']),
  readiness: z.enum(['READY', 'BLOCKED', 'COMPLETE']),
  reason: z.string(),
  point: KnowledgePointListItemSchema.nullable(),
  blockers: z.array(z.object({
    code: z.string(),
    title: z.string(),
    status: z.enum(['NOT_STARTED', 'LEARNING', 'SELF_MASTERED', 'FIRST_PASS_PENDING_RETEST', 'MASTERED', 'NEEDS_RELEARNING']),
  })),
  prerequisiteProgress: z.object({ mastered: z.number(), total: z.number() }),
  routePosition: z.object({ week: z.number(), index: z.number(), total: z.number() }).nullable(),
});

// 知识点详情 Schema
const KnowledgePointDetailSchema = KnowledgePointListItemSchema.extend({
  summary: z.string().nullable(),
  studyMaterialMd: z.string(),
  assessmentSpecMd: z.string(),
  passCriteriaMd: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  estimatedCoreMinutes: z.number(),
  learningActivities: z.array(z.object({
    id: z.string(),
    type: z.enum(['READING', 'GUIDED_PRACTICE', 'APPLICATION', 'CASE_STUDY']),
    label: z.string(), minutes: z.number(), optional: z.boolean(), task: z.string(),
    input: z.string(), outputRequirements: z.array(z.string()), completionCriteria: z.array(z.string()),
    failureFixture: z.string().nullable(),
    verificationChecklist: z.array(z.string()),
    vetoItems: z.array(z.string()),
    deliveryMode: z.enum(['READ_ONLY', 'WORKSPACE']), workspaceMode: z.enum(['TEXT', 'CODE']).nullable(),
    language: z.enum(['javascript', 'typescript']).nullable(), starterCode: z.string().nullable(), submissionTemplate: z.string().nullable(),
    materialReferences: z.array(z.object({ title: z.string(), url: z.string().nullable(), locator: z.string(), focus: z.string() })),
  })),
});

const KnowledgeMaterialSchema = z.object({
  guide: z.string(),
  anchor: z.string(),
  title: z.string(),
  markdown: z.string(),
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
  phase: z.string(),
  weekTheme: z.string(),
  weekOutcome: z.string(),
  projectAnchor: z.string(),
  dailyFocus: z.string(),
  assessmentMode: z.string(),
  reviewCadence: z.array(z.string()),
  learningContent: z.array(z.string()),
  masteryGoals: z.array(z.object({ code: z.string(), text: z.string() })),
  tasks: z.array(z.object({ code: z.string(), text: z.string() })),
  outputs: z.array(z.string()),
  reviewQuestion: z.string(),
  prerequisitesReady: z.boolean(),
  pendingPrerequisiteCount: z.number(),
  knowledgePoints: z.array(LearningBriefPointSchema),
  effort: z.object({
    studyMinutes: z.number(),
    practiceMinutes: z.number(),
    projectMinutes: z.number(),
    assessmentMinutes: z.number(),
    retestMinutes: z.number(),
    estimatedTotalMinutes: z.number(),
    capacityMinutes: z.number(),
    utilizationPercent: z.number(),
    overloaded: z.boolean(),
  }),
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
    capabilityLayer: z.string().optional(),
    requirementLevel: z.string().optional(),
    maturity: z.string().optional(),
    aiRelation: z.string().optional(),
    portability: z.string().optional(),
    applicabilityTags: z.array(z.string()).optional(),
    topicTags: z.array(z.string()).optional(),
    trackIds: z.array(z.string()).optional(),
    secondaryTopic: z.string().optional(),
    topicOrder: z.number().optional(),
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
  capabilityLayer: z.string(),
  requirementLevel: z.string(),
  maturity: z.string(),
  aiRelation: z.string(),
  portability: z.string(),
  applicabilityTags: z.array(z.string()),
  topicTags: z.array(z.string()),
  trackIds: z.array(z.string()),
  verifiedAt: z.string(),
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

// ===== 严格考核与系统运维 Schema =====

const AssessmentSessionSchema = z.object({
  id: z.string(),
  knowledgePointCode: z.string(),
  assessmentType: z.enum(['FIRST', 'RETEST', 'MONTHLY_REVIEW', 'DOMAIN_COMPREHENSIVE']),
  status: z.enum(['DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'GRADING', 'GRADED', 'ERROR', 'CANCELLED']),
  durationMinutes: z.number(),
  masteryStage: z.number().int().min(1).max(4),
  challengeMode: z.enum(['THEORY', 'PRACTICE', 'MIXED']),
  challengeProfile: z.enum(['AUTO', 'THEORY_ONLY', 'EXAMPLE_DRIVEN', 'CODING', 'DEBUGGING', 'TOOL_OPERATION', 'DESIGN_CASE']),
  assistanceLevel: z.number().int().min(0).max(7),
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

const BackupStatsSchema = BackupMetadataSchema.shape.stats;
const RestorePreviewSchema = z.object({
  metadata: BackupMetadataSchema,
  currentStats: BackupStatsSchema,
  differences: BackupStatsSchema,
  warnings: z.array(z.string()),
});

const PortableDataExportSchema = z.object({
  schemaVersion: z.literal(1),
  product: z.literal('career-atlas'),
  exportedAt: z.string(),
  counts: z.record(z.number()),
  data: z.record(z.array(z.record(z.unknown()))),
});

const PortableDataImportPreviewSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string(),
  totalRecords: z.number().int().nonnegative(),
  confirmation: z.string(),
  knowledgePoints: z.object({
    inFile: z.number().int().nonnegative(),
    matched: z.number().int().nonnegative(),
    skipped: z.number().int().nonnegative(),
    retainedCurrent: z.number().int().nonnegative(),
  }),
  categories: z.array(z.object({
    key: z.string(),
    label: z.string(),
    current: z.number().int().nonnegative(),
    after: z.number().int().nonnegative(),
    difference: z.number().int(),
  })),
  warnings: z.array(z.string()),
});

const PortableDataImportResultSchema = z.object({
  message: z.string(),
  importedRecords: z.number().int().nonnegative(),
  skippedKnowledgePoints: z.number().int().nonnegative(),
  backupFilename: z.string(),
});

const AssistantSourceSchema = z.object({
  id: z.string(),
  kind: z.enum(['SITE', 'WEB']),
  title: z.string(),
  url: z.string(),
  excerpt: z.string(),
  code: z.string().optional(),
  domain: z.string().optional(),
});

const AssistantGapCandidateSchema = z.object({
  id: z.string(),
  title: z.string(),
  rationale: z.string(),
  suggestedScope: z.string(),
  sourceRoute: z.string(),
  sourcePageTitle: z.string(),
  status: z.enum(['PENDING', 'ADDED', 'DISMISSED']),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const AssistantGapDirectorySchema = z.object({
  directory: z.string(),
  items: z.array(AssistantGapCandidateSchema),
});

const AssistantDiagnosticRecordSchema = z.object({
  incidentId: z.string(),
  startedAt: z.string(),
  finishedAt: z.string(),
  outcome: z.enum(['SUCCESS', 'ERROR', 'ABORTED']),
  mode: z.enum(['EXPLAIN', 'SUMMARY', 'ASK']),
  route: z.string(),
  stage: z.string(),
  elapsedMs: z.number(),
  pageCharacterCount: z.number(),
  selectedCharacterCount: z.number(),
  questionCharacterCount: z.number(),
  contextCharacterCount: z.number(),
  siteSourceCount: z.number(),
  webSourceCount: z.number(),
  webSearchUsed: z.boolean(),
  firstTokenMs: z.number().optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
});

const AssistantDiagnosticDirectorySchema = z.object({
  file: z.string(),
  items: z.array(AssistantDiagnosticRecordSchema),
});

const AssistantRequestSchema = z.object({
  mode: z.enum(['EXPLAIN', 'SUMMARY', 'ASK']),
  question: z.string().optional(),
  selectedText: z.string().optional(),
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })).max(12).optional(),
  page: z.object({
    route: z.string(),
    title: z.string(),
    content: z.string(),
    capturedAt: z.string(),
  }),
});

const AssessmentGradeResponseSchema = z.object({
  session: AssessmentSessionSchema,
  result: AssessmentResultSchema,
  knowledgePointUpdated: z.boolean(),
  retestEventCreated: z.boolean(),
  reviewEventCreated: z.boolean(),
});

const AssessmentRegradeResponseSchema = AssessmentGradeResponseSchema.omit({ session: true });

const WorkspacePointSchema = z.object({
  id: z.string(), code: z.string(), title: z.string(), domainCode: z.string(), domainTitle: z.string(),
  learningState: z.enum(['NOT_STARTED', 'LEARNING', 'LEARNED', 'DEFERRED']),
  masteryLevel: z.number(), currentFocus: z.boolean(), learnedAt: z.string().nullable(), deferReason: z.string().nullable(),
  planWeek: z.number().nullable(), studyMinutes: z.number(), practiceMinutes: z.number(), projectMinutes: z.number(),
  assessmentMinutes: z.number(), summary: z.string().nullable(), estimatedMinutes: z.number(),
  challengeProfile: z.enum(['THEORY_ONLY', 'EXAMPLE_DRIVEN', 'CODING', 'DEBUGGING', 'TOOL_OPERATION', 'DESIGN_CASE']),
  challengeProfileLabel: z.string(), practiceRecommended: z.boolean(), learningApproach: z.string(),
});

const LearningCheckinSchema = z.object({
  id: z.string(), checkinDate: z.string(), summaryMd: z.string().nullable(), actualMinutes: z.number().nullable(),
  energyLevel: z.number().nullable(), difficultyLevel: z.number().nullable(), createdAt: z.string(), updatedAt: z.string(),
  points: z.array(z.object({ code: z.string(), title: z.string().nullable(), activity: z.string() })),
});

const LearningWorkspaceSchema = z.object({
  mode: z.literal('SELF_PACED'), current: WorkspacePointSchema.nullable(),
  suggested: WorkspacePointSchema.nullable(),
  stats: z.object({ total: z.number(), learned: z.number(), learning: z.number(), deferred: z.number(), mastered: z.number(), stable: z.number() }),
  todayCheckin: LearningCheckinSchema.nullable(), recentlyLearned: z.array(WorkspacePointSchema), principle: z.string(),
});

const BranchSchema = WorkspacePointSchema.extend({
  relation: z.string(), relationDescription: z.string().nullable(), recommended: z.boolean(), requiredPrerequisite: z.boolean(),
  routeChoice: z.string().nullable(), routeChoiceScope: z.string().nullable(), field: z.string(), impactIfDeferred: z.string(),
  navigationKind: z.enum(['CONTINUE', 'TRACK_CHOICE']), trackName: z.string(), trackRemaining: z.number(),
});

const PracticeValidationSchema = z.object({
  passed: z.boolean(), summary: z.string(), checks: z.array(z.object({ label: z.string(), passed: z.boolean() })),
  nextAction: z.string(), mode: z.enum(['AI', 'RULE']),
  validationLevel: z.enum(['STRUCTURE_ONLY', 'SEMANTIC']).optional(),
});

const PracticeAttemptSchema = z.object({
  id: z.string(), knowledgePointCode: z.string(), activityId: z.string(), submissionMd: z.string(), code: z.string(),
  language: z.string().nullable(), executionOutput: z.string(), executionStatus: z.string().nullable(),
  validationJson: z.string().nullable(), status: z.enum(['DRAFT', 'COMPLETED']), createdAt: z.string(), updatedAt: z.string(),
  validation: PracticeValidationSchema.nullable(),
});

const NoteVersionSchema = z.object({
  id: z.string(), versionNo: z.number(), source: z.string(), changeSummary: z.string().nullable(), createdAt: z.string(),
});

const KnowledgeNoteSchema = z.object({
  id: z.string(), knowledgePointCode: z.string(), pointTitle: z.string(), domainCode: z.string().nullable(), domainTitle: z.string().nullable(),
  originalMd: z.string(), organizedMd: z.string().nullable(), activeVersionSource: z.string(), activeMd: z.string(),
  aiReview: z.object({ corrections: z.array(z.string()).optional(), additions: z.array(z.string()).optional(), uncertainItems: z.array(z.string()).optional(), sourceGrounded: z.boolean().optional() }).passthrough().nullable(),
  createdAt: z.string(), updatedAt: z.string(), versions: z.array(NoteVersionSchema),
  generationMode: z.string().optional(), generationNotice: z.string().optional(),
  routeOrder: z.number(),
});

export type NoteSortMode = 'knowledge' | 'updated_desc' | 'updated_asc' | 'title_asc' | 'code_asc';

const ResetLearningProgressSchema = z.object({
  syncedKnowledgePoints: z.number(),
  resetKnowledgePoints: z.number(),
  deletedTemplateEvents: z.number(),
  deletedSystemLearningEvents: z.number(),
  deletedCheckins: z.number(),
  deletedDailyReviews: z.number(),
  deletedWeeklyReviews: z.number(),
  deletedLeaveDays: z.number(),
  deletedAssessmentSessions: z.number(),
  deletedAssessmentQuestions: z.number(),
  deletedAssessmentAnswers: z.number(),
  deletedAssessmentResults: z.number(),
  deletedMasteryEvents: z.number(),
  importedPlanEvents: z.number(),
  startDate: z.string(),
});

export type ResetLearningProgressResult = z.infer<typeof ResetLearningProgressSchema>;

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

  const controller = new AbortController();
  const callerSignal = options?.signal;
  let timedOut = false;
  const timeoutMs = path.startsWith('/data/import') ? 60_000 : path === '/system/ai/status' ? 35_000 : 20_000;
  const timeout = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const abortFromCaller = () => controller.abort(callerSignal?.reason);
  if (callerSignal?.aborted) abortFromCaller();
  else callerSignal?.addEventListener('abort', abortFromCaller, { once: true });

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers, signal: controller.signal });
  } catch (reason) {
    if (timedOut) throw new ApiError('REQUEST_TIMEOUT', `本地服务在 ${Math.round(timeoutMs / 1000)} 秒内没有响应`, true, 'client-timeout');
    throw reason;
  } finally {
    globalThis.clearTimeout(timeout);
    callerSignal?.removeEventListener('abort', abortFromCaller);
  }

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

async function streamOrganizedNote(
  code: string,
  onDelta: (delta: string, accumulated: string) => void,
  signal?: AbortSignal,
  onProgress: (message: string, elapsedSeconds: number) => void = () => {},
  onThinking: (delta: string, accumulated: string) => void = () => {},
) {
  const response = await fetch(`${API_BASE}/notes/${encodeURIComponent(code)}/organize/stream`, { method: 'POST', signal });
  if (!response.ok || !response.body) throw new Error(`无法开始 AI 流式整理（${response.status}）`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let accumulated = '';
  let accumulatedThinking = '';
  let finalNote: unknown = null;

  const processFrame = (frame: string) => {
    const event = frame.split(/\r?\n/).find((line) => line.startsWith('event:'))?.slice(6).trim() ?? 'message';
    const rawData = frame.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('\n');
    if (!rawData) return;
    const data = JSON.parse(rawData) as { delta?: string; message?: string; elapsedSeconds?: number; note?: unknown };
    if (event === 'delta' && data.delta) {
      accumulated += data.delta;
      onDelta(data.delta, accumulated);
    } else if (event === 'reset') {
      accumulated = '';
      onDelta('', '');
    } else if (event === 'thinking' && data.delta) {
      accumulatedThinking += data.delta;
      onThinking(data.delta, accumulatedThinking);
    } else if (event === 'done') {
      finalNote = data.note;
    } else if (event === 'progress' && data.message) {
      onProgress(data.message, data.elapsedSeconds ?? 0);
    } else if (event === 'error') {
      throw new Error(data.message || 'AI 整理失败');
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    const frames = buffer.split(/\r?\n\r?\n/);
    buffer = frames.pop() ?? '';
    for (const frame of frames) processFrame(frame);
    if (done) break;
  }
  if (buffer.trim()) processFrame(buffer);
  if (!finalNote) throw new Error('AI 整理流已结束，但没有收到完整结果');
  return KnowledgeNoteSchema.parse(finalNote);
}

async function consumeSse(
  path: string,
  options: RequestInit,
  onEvent: (event: string, data: Record<string, unknown>) => void,
) {
  const response = await fetch(`${API_BASE}${path}`, options);
  if (!response.ok || !response.body) throw new Error(`无法开始流式请求（${response.status}）`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const processFrame = (frame: string) => {
    const event = frame.split(/\r?\n/).find((line) => line.startsWith('event:'))?.slice(6).trim() ?? 'message';
    const rawData = frame.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('\n');
    if (!rawData) return;
    const data = JSON.parse(rawData) as Record<string, unknown>;
    if (event === 'error') {
      throw new AssistantStreamError(
        typeof data.message === 'string' ? data.message : '流式请求失败',
        {
          incidentId: typeof data.incidentId === 'string' ? data.incidentId : '',
          code: typeof data.code === 'string' ? data.code : 'STREAM_ERROR',
          stage: typeof data.stage === 'string' ? data.stage : 'UNKNOWN',
          elapsedMs: typeof data.elapsedMs === 'number' ? data.elapsedMs : 0,
          retryable: data.retryable === true,
        },
      );
    }
    onEvent(event, data);
  };
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    const frames = buffer.split(/\r?\n\r?\n/);
    buffer = frames.pop() ?? '';
    for (const frame of frames) processFrame(frame);
    if (done) break;
  }
  if (buffer.trim()) processFrame(buffer);
}

async function streamHint(
  id: string,
  questionId: string,
  kind: 'EXPLAIN' | 'HINT' | 'DECOMPOSE' | 'OUTLINE' | 'STARTER' | 'SIMILAR_EXAMPLE' | 'FULL_ANSWER',
  onDelta: (delta: string, accumulated: string) => void,
  signal?: AbortSignal,
  onThinking: (delta: string, accumulated: string) => void = () => {},
) {
  let accumulated = '';
  let accumulatedThinking = '';
  let finalHint: unknown;
  await consumeSse(
    `/assessments/${encodeURIComponent(id)}/questions/${encodeURIComponent(questionId)}/hints/stream`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind }), signal },
    (event, data) => {
      if (event === 'delta' && typeof data.delta === 'string') {
        accumulated += data.delta;
        onDelta(data.delta, accumulated);
      }
      if (event === 'thinking' && typeof data.delta === 'string') {
        accumulatedThinking += data.delta;
        onThinking(data.delta, accumulatedThinking);
      }
      if (event === 'done') finalHint = data.hint;
    },
  );
  return z.object({ kind: z.string(), level: z.number(), text: z.string(), source: z.enum(['AI', 'RULE']), independenceImpact: z.string() }).parse(finalHint);
}

async function streamStructuredResult<T>(
  path: string,
  schema: z.ZodType<T>,
  onProgress: (message: string, receivedChars?: number) => void,
  options: RequestInit = {},
  onThinking: (delta: string, accumulated: string) => void = () => {},
) {
  let finalValue: unknown;
  let accumulatedThinking = '';
  await consumeSse(path, { method: 'POST', ...options }, (event, data) => {
    if (event === 'progress' && typeof data.message === 'string') {
      onProgress(data.message, typeof data.receivedChars === 'number' ? data.receivedChars : undefined);
    }
    if (event === 'thinking' && typeof data.delta === 'string') {
      accumulatedThinking += data.delta;
      onThinking(data.delta, accumulatedThinking);
    }
    if (event === 'done') finalValue = data.attempt ?? data.grade;
  });
  return schema.parse(finalValue);
}

// API Client 对象
export const apiClient = {
  // 健康检查
  async getHealth() {
    return request('/system/health', HealthResponseSchema);
  },

  // ===== 全局 AI 学习助手 =====
  async streamAssistant(
    input: AssistantRequest,
    handlers: AssistantStreamHandlers,
    signal?: AbortSignal,
  ) {
    const payload = AssistantRequestSchema.parse(input);
    await consumeSse(
      '/assistant/stream',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal,
      },
      (event, data) => {
        if (event === 'progress' && typeof data.message === 'string') handlers.onProgress?.(data.message);
        if (event === 'diagnostic') handlers.onDiagnostic?.({
          incidentId: typeof data.incidentId === 'string' ? data.incidentId : '',
          stage: typeof data.stage === 'string' ? data.stage : 'UNKNOWN',
          elapsedMs: typeof data.elapsedMs === 'number' ? data.elapsedMs : 0,
          contextCharacterCount: typeof data.contextCharacterCount === 'number' ? data.contextCharacterCount : undefined,
          siteSourceCount: typeof data.siteSourceCount === 'number' ? data.siteSourceCount : undefined,
          webSourceCount: typeof data.webSourceCount === 'number' ? data.webSourceCount : undefined,
          firstTokenMs: typeof data.firstTokenMs === 'number' ? data.firstTokenMs : undefined,
        });
        if (event === 'heartbeat') handlers.onHeartbeat?.({
          incidentId: typeof data.incidentId === 'string' ? data.incidentId : '',
          stage: typeof data.stage === 'string' ? data.stage : 'UNKNOWN',
          elapsedMs: typeof data.elapsedMs === 'number' ? data.elapsedMs : 0,
        });
        if (event === 'delta' && typeof data.delta === 'string') handlers.onDelta?.(data.delta);
        if (event === 'thinking' && typeof data.delta === 'string') handlers.onThinking?.(data.delta);
        if (event === 'sources') {
          handlers.onSources?.(
            z.array(AssistantSourceSchema).parse(data.sources ?? []),
            typeof data.searchQuery === 'string' ? data.searchQuery : '',
            typeof data.webSearchWarning === 'string' ? data.webSearchWarning : '',
            data.webSearchUsed === true,
          );
        }
        if (event === 'gap') handlers.onGap?.(AssistantGapCandidateSchema.parse(data.candidate));
        if (event === 'done') handlers.onDone?.({
          provider: typeof data.provider === 'string' ? data.provider : '',
          model: typeof data.model === 'string' ? data.model : '',
          pageCharacterCount: typeof data.pageCharacterCount === 'number' ? data.pageCharacterCount : 0,
          contextCharacterCount: typeof data.contextCharacterCount === 'number' ? data.contextCharacterCount : 0,
          webSearchUsed: data.webSearchUsed === true,
          elapsedMs: typeof data.elapsedMs === 'number' ? data.elapsedMs : 0,
        });
      },
    );
  },

  async listAssistantGaps() {
    return request('/assistant/gaps', AssistantGapDirectorySchema);
  },

  async listAssistantDiagnostics() {
    return request('/assistant/diagnostics?limit=40', AssistantDiagnosticDirectorySchema);
  },

  // ===== 知识点 API =====

  /**
   * 获取知识点列表（支持筛选）
   */
  async getKnowledgePoints(params?: {
    domainId?: string;
    status?: string;
    capabilityLayer?: 'CORE' | 'APPLICATION' | 'SPECIALTY' | 'LEADERSHIP';
    requirementLevel?: 'REQUIRED' | 'TRACK_REQUIRED' | 'ELECTIVE';
    maturity?: 'STABLE' | 'EVOLVING' | 'EXPERIMENTAL';
    aiRelation?: 'NONE' | 'AI_ASSISTED' | 'AI_NATIVE' | 'AGENTIC';
    portability?: 'PORTABLE' | 'FRAMEWORK_SPECIFIC' | 'VENDOR_SPECIFIC' | 'PLATFORM_SPECIFIC' | 'JURISDICTION_SPECIFIC';
    secondaryTopic?: string;
    trackId?: 'react' | 'vue' | 'umi-antd' | 'agent-mcp';
    topicTag?: string;
    search?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.domainId) query.set('domainId', params.domainId);
    if (params?.status) query.set('status', params.status);
    if (params?.capabilityLayer) query.set('capabilityLayer', params.capabilityLayer);
    if (params?.requirementLevel) query.set('requirementLevel', params.requirementLevel);
    if (params?.maturity) query.set('maturity', params.maturity);
    if (params?.aiRelation) query.set('aiRelation', params.aiRelation);
    if (params?.portability) query.set('portability', params.portability);
    if (params?.secondaryTopic) query.set('secondaryTopic', params.secondaryTopic);
    if (params?.trackId) query.set('trackId', params.trackId);
    if (params?.topicTag) query.set('topicTag', params.topicTag);
    if (params?.search) query.set('search', params.search);

    const queryString = query.toString();
    const path = queryString ? `/knowledge/points?${queryString}` : '/knowledge/points';

    return request(path, KnowledgeListResponseSchema);
  },

  async getKnowledgeRecommendation() {
    return request('/knowledge/recommendation', KnowledgeRecommendationSchema);
  },

  /**
   * 获取知识点详情
   */
  async getKnowledgePoint(code: string) {
    return request(`/knowledge/points/${code}`, KnowledgePointDetailSchema);
  },

  async getKnowledgeMaterial(guide: string, anchor: string) {
    return request(
      `/knowledge/materials/${encodeURIComponent(guide)}/${encodeURIComponent(anchor)}`,
      KnowledgeMaterialSchema,
    );
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

  // ===== 自主学习工作台与笔记中心 =====

  async getLearningWorkspace() {
    return request('/learning/workspace', LearningWorkspaceSchema);
  },

  async focusLearningPoint(code: string) {
    return request(`/learning/points/${encodeURIComponent(code)}/focus`, z.object({ code: z.string(), learningState: z.literal('LEARNING'), currentFocus: z.boolean(), updatedAt: z.string() }), { method: 'POST' });
  },

  async completeLearningPoint(code: string) {
    return request(`/learning/points/${encodeURIComponent(code)}/complete`, z.object({ code: z.string(), learningState: z.literal('LEARNED'), learnedAt: z.string(), masteryLevel: z.number() }), { method: 'POST' });
  },

  async deferLearningPoint(code: string, reason?: string) {
    return request(`/learning/points/${encodeURIComponent(code)}/defer`, z.object({ code: z.string(), learningState: z.literal('DEFERRED'), deferredAt: z.string(), reason: z.string().nullable() }), {
      method: 'POST', body: JSON.stringify({ reason }),
    });
  },

  async restoreLearningPoint(code: string) {
    return request(`/learning/points/${encodeURIComponent(code)}/restore`, z.object({ code: z.string(), learningState: z.literal('NOT_STARTED') }), { method: 'POST' });
  },

  async getNextBranches(code: string) {
    return request(`/learning/points/${encodeURIComponent(code)}/branches`, z.array(BranchSchema));
  },

  async getPracticeAttempts(code: string) {
    return request(`/learning/points/${encodeURIComponent(code)}/practice-attempts`, z.array(PracticeAttemptSchema));
  },

  async savePracticeAttempt(code: string, activityId: string, data: {
    submissionMd: string; code?: string; language?: 'javascript' | 'typescript';
    executionOutput?: string; executionStatus?: 'NOT_RUN' | 'SUCCESS' | 'ERROR' | 'TIMEOUT';
  }) {
    return request(`/learning/points/${encodeURIComponent(code)}/practice-attempts/${encodeURIComponent(activityId)}`, PracticeAttemptSchema, {
      method: 'PUT', body: JSON.stringify(data),
    });
  },

  async validatePracticeAttempt(code: string, activityId: string, data: {
    submissionMd: string; code?: string; language?: 'javascript' | 'typescript';
    executionOutput?: string; executionStatus?: 'NOT_RUN' | 'SUCCESS' | 'ERROR' | 'TIMEOUT';
  }) {
    return request(`/learning/points/${encodeURIComponent(code)}/practice-attempts/${encodeURIComponent(activityId)}/validate`, PracticeAttemptSchema, {
      method: 'POST', body: JSON.stringify(data),
    });
  },

  async validatePracticeAttemptStream(code: string, activityId: string, data: {
    submissionMd: string; code?: string; language?: 'javascript' | 'typescript';
    executionOutput?: string; executionStatus?: 'NOT_RUN' | 'SUCCESS' | 'ERROR' | 'TIMEOUT';
  }, onProgress: (message: string, receivedChars?: number) => void, signal?: AbortSignal, onThinking?: (delta: string, accumulated: string) => void) {
    return streamStructuredResult(
      `/learning/points/${encodeURIComponent(code)}/practice-attempts/${encodeURIComponent(activityId)}/validate/stream`,
      PracticeAttemptSchema,
      onProgress,
      { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal },
      onThinking,
    );
  },

  async saveRouteChoice(data: { sourceCode: string; targetCode: string; state: 'SELECTED' | 'DEFERRED'; scope: 'POINT' | 'BRANCH'; reason?: string }) {
    return request('/learning/route-choices', z.object({ sourceCode: z.string(), targetCode: z.string(), state: z.string(), scope: z.string(), updatedAt: z.string() }), {
      method: 'PUT', body: JSON.stringify(data),
    });
  },

  async listNotes(params?: { search?: string; domainCode?: string; sort?: NoteSortMode }) {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.domainCode) query.set('domainCode', params.domainCode);
    if (params?.sort) query.set('sort', params.sort);
    return request(`/notes${query.size ? `?${query}` : ''}`, z.array(KnowledgeNoteSchema));
  },

  async getNote(code: string) {
    return request(`/notes/${encodeURIComponent(code)}`, KnowledgeNoteSchema.nullable());
  },

  async saveNote(code: string, contentMd: string) {
    return request(`/notes/${encodeURIComponent(code)}`, KnowledgeNoteSchema, { method: 'PUT', body: JSON.stringify({ contentMd }) });
  },

  async organizeNote(code: string) {
    return request(`/notes/${encodeURIComponent(code)}/organize`, KnowledgeNoteSchema, { method: 'POST' });
  },

  async organizeNoteStream(code: string, onDelta: (delta: string, accumulated: string) => void, signal?: AbortSignal, onProgress?: (message: string, elapsedSeconds: number) => void, onThinking?: (delta: string, accumulated: string) => void) {
    return streamOrganizedNote(code, onDelta, signal, onProgress, onThinking);
  },

  async acceptOrganizedNote(code: string) {
    return request(`/notes/${encodeURIComponent(code)}/accept-organized`, KnowledgeNoteSchema, { method: 'POST' });
  },

  async saveLearningCheckin(date: string, data: { pointCodes: string[]; summaryMd?: string; actualMinutes?: number; energyLevel?: number; difficultyLevel?: number }) {
    return request(`/learning/checkins/${date}`, LearningCheckinSchema, { method: 'PUT', body: JSON.stringify(data) });
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
    masteryStage?: number;
    challengeMode?: 'THEORY' | 'PRACTICE' | 'MIXED';
    challengeProfile?: 'AUTO' | 'THEORY_ONLY' | 'EXAMPLE_DRIVEN' | 'CODING' | 'DEBUGGING' | 'TOOL_OPERATION' | 'DESIGN_CASE';
  }) {
    return request('/assessments', AssessmentSessionSchema.extend({
      resumedExisting: z.boolean(), resumeMessage: z.string().nullable(),
    }), {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async revealAssessmentHint(id: string, questionId: string, kind: 'EXPLAIN' | 'HINT' | 'DECOMPOSE' | 'OUTLINE' | 'STARTER' | 'SIMILAR_EXAMPLE' | 'FULL_ANSWER') {
    return request(`/assessments/${id}/questions/${questionId}/hints`, z.object({ kind: z.string(), level: z.number(), text: z.string(), source: z.enum(['AI', 'RULE']), independenceImpact: z.string() }), {
      method: 'POST', body: JSON.stringify({ kind }),
    });
  },

  async revealAssessmentHintStream(id: string, questionId: string, kind: 'EXPLAIN' | 'HINT' | 'DECOMPOSE' | 'OUTLINE' | 'STARTER' | 'SIMILAR_EXAMPLE' | 'FULL_ANSWER', onDelta: (delta: string, accumulated: string) => void, signal?: AbortSignal, onThinking?: (delta: string, accumulated: string) => void) {
    return streamHint(id, questionId, kind, onDelta, signal, onThinking);
  },

  async getAssessment(id: string) {
    return request(`/assessments/${id}`, AssessmentDetailSchema);
  },

  async startAssessment(id: string) {
    return request(`/assessments/${id}/start`, AssessmentSessionSchema, { method: 'POST' });
  },

  async saveAssessmentAnswer(id: string, questionId: string, answerContent: string, deterministicResult?: string) {
    return request(`/assessments/${id}/answers/${questionId}`, AssessmentAnswerSchema, {
      method: 'PUT',
      body: JSON.stringify({ answerContent, deterministicResult }),
    });
  },

  async submitAssessment(id: string) {
    return request(`/assessments/${id}/submit`, AssessmentSessionSchema, { method: 'POST' });
  },

  async cancelAssessment(id: string) {
    return request(`/assessments/${id}/cancel`, AssessmentSessionSchema, { method: 'POST' });
  },

  async gradeAssessment(id: string) {
    return request(`/assessments/${id}/grade`, AssessmentGradeResponseSchema, {
      method: 'POST',
      body: JSON.stringify({ provider: 'deepseek' }),
    });
  },

  async gradeAssessmentStream(id: string, onProgress: (message: string, receivedChars?: number) => void, signal?: AbortSignal, onThinking?: (delta: string, accumulated: string) => void) {
    return streamStructuredResult(`/assessments/${encodeURIComponent(id)}/grade/stream`, AssessmentGradeResponseSchema, onProgress, { signal }, onThinking);
  },

  async regradeAssessment(id: string) {
    return request(`/assessments/${id}/regrade`, AssessmentRegradeResponseSchema, { method: 'POST' });
  },

  async regradeAssessmentStream(id: string, onProgress: (message: string, receivedChars?: number) => void, signal?: AbortSignal, onThinking?: (delta: string, accumulated: string) => void) {
    return streamStructuredResult(`/assessments/${encodeURIComponent(id)}/regrade/stream`, AssessmentRegradeResponseSchema, onProgress, { signal }, onThinking);
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

  async resetLearningProgress(startDate?: string) {
    return request('/import/reset-learning-progress', ResetLearningProgressSchema, {
      method: 'POST',
      body: JSON.stringify(startDate ? { startDate } : {}),
    });
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

  async previewBackupRestore(filename: string) {
    return request(`/backups/${encodeURIComponent(filename)}/preview`, RestorePreviewSchema);
  },

  async exportPortableData() {
    return request('/data/export', PortableDataExportSchema);
  },

  async previewPortableDataImport(snapshot: unknown) {
    return request('/data/import/preview', PortableDataImportPreviewSchema, {
      method: 'POST',
      body: JSON.stringify({ snapshot }),
    });
  },

  async importPortableData(snapshot: unknown, confirm: string) {
    return request('/data/import', PortableDataImportResultSchema, {
      method: 'POST',
      body: JSON.stringify({ snapshot, confirm }),
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
    return request(`/jobs/${id}`, z.object({ deleted: z.boolean() }), { method: 'DELETE' });
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
export type KnowledgeRecommendation = z.infer<typeof KnowledgeRecommendationSchema>;
export type KnowledgePointDetail = z.infer<typeof KnowledgePointDetailSchema>;
export type LearningWorkspace = z.infer<typeof LearningWorkspaceSchema>;
export type WorkspacePoint = z.infer<typeof WorkspacePointSchema>;
export type LearningBranch = z.infer<typeof BranchSchema>;
export type LearningActivity = KnowledgePointDetail['learningActivities'][number];
export type PracticeAttempt = z.infer<typeof PracticeAttemptSchema>;
export type KnowledgeNote = z.infer<typeof KnowledgeNoteSchema>;
export type LearningCheckin = z.infer<typeof LearningCheckinSchema>;
export type PlanEvent = z.infer<typeof PlanEventSchema>;
export type Checkin = z.infer<typeof CheckinSchema>;
export type TodayPlan = z.infer<typeof TodayPlanSchema>;
export type PlanLearningBrief = z.infer<typeof PlanLearningBriefSchema>;
export type LearningBriefPoint = z.infer<typeof LearningBriefPointSchema>;
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
export type RestorePreview = z.infer<typeof RestorePreviewSchema>;
export type PortableDataExport = z.infer<typeof PortableDataExportSchema>;
export type PortableDataImportPreview = z.infer<typeof PortableDataImportPreviewSchema>;
export type AssistantSource = z.infer<typeof AssistantSourceSchema>;
export type AssistantGapCandidate = z.infer<typeof AssistantGapCandidateSchema>;
export type AssistantRequest = z.infer<typeof AssistantRequestSchema>;
export interface AssistantRuntimeDiagnostic {
  incidentId: string;
  stage: string;
  elapsedMs: number;
  contextCharacterCount?: number;
  siteSourceCount?: number;
  webSourceCount?: number;
  firstTokenMs?: number;
}
export interface AssistantErrorDiagnostic {
  incidentId: string;
  code: string;
  stage: string;
  elapsedMs: number;
  retryable: boolean;
}
export class AssistantStreamError extends Error {
  constructor(message: string, readonly diagnostic: AssistantErrorDiagnostic) {
    super(message);
    this.name = 'AssistantStreamError';
  }
}
export interface AssistantStreamHandlers {
  onProgress?: (message: string) => void;
  onDiagnostic?: (diagnostic: AssistantRuntimeDiagnostic) => void;
  onHeartbeat?: (diagnostic: Pick<AssistantRuntimeDiagnostic, 'incidentId' | 'stage' | 'elapsedMs'>) => void;
  onDelta?: (delta: string) => void;
  onThinking?: (delta: string) => void;
  onSources?: (sources: AssistantSource[], searchQuery: string, warning: string, webSearchUsed: boolean) => void;
  onGap?: (candidate: AssistantGapCandidate) => void;
  onDone?: (metadata: { provider: string; model: string; pageCharacterCount: number; contextCharacterCount: number; webSearchUsed: boolean; elapsedMs: number }) => void;
}
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
export type JobCSVRow = z.infer<typeof JobCSVRowSchema>;
export type JobImportPreview = z.infer<typeof JobImportPreviewSchema>;
