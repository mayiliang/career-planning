/**
 * Drizzle ORM Schema
 *
 * Phase 1: 核心知识表
 * Phase 3: 计划与打卡表
 * Phase 4: 知识关系表
 * Phase 5: AI 考核表
 */
import { sqliteTable, text, integer, index, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';

// ===== 知识领域表 =====
export const knowledgeDomains = sqliteTable('knowledge_domains', {
  id: text('id').primaryKey().notNull(),
  code: text('code').notNull().unique(),

  title: text('title').notNull(),
  description: text('description'),
  capabilityLayer: text('capability_layer', { enum: ['CORE', 'APPLICATION', 'SPECIALTY', 'LEADERSHIP'] }).notNull().default('CORE'),
  requirementLevel: text('requirement_level', { enum: ['REQUIRED', 'TRACK_REQUIRED', 'ELECTIVE'] }).notNull().default('REQUIRED'),
  maturity: text('maturity', { enum: ['STABLE', 'EVOLVING', 'EXPERIMENTAL'] }).notNull().default('STABLE'),
  aiRelation: text('ai_relation', { enum: ['NONE', 'AI_ASSISTED', 'AI_NATIVE', 'AGENTIC'] }).notNull().default('NONE'),
  portability: text('portability', { enum: ['PORTABLE', 'FRAMEWORK_SPECIFIC', 'VENDOR_SPECIFIC', 'PLATFORM_SPECIFIC', 'JURISDICTION_SPECIFIC'] }).notNull().default('PORTABLE'),
  applicabilityTags: text('applicability_tags', { mode: 'json' }).$type<string[]>().notNull().default([]),
  topicTags: text('topic_tags', { mode: 'json' }).$type<string[]>().notNull().default([]),
  trackIds: text('track_ids', { mode: 'json' }).$type<string[]>().notNull().default([]),
  verifiedAt: text('verified_at').notNull().default('2026-08-04'),
  fallbackStrategy: text('fallback_strategy').notNull().default('按目标环境做能力检测并保留稳定降级路径。'),

  // 排序和来源
  orderIndex: integer('order_index').notNull(),
  sourcePath: text('source_path').notNull(),
  sourceHash: text('source_hash').notNull(),

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ===== 知识点表 =====
export const knowledgePoints = sqliteTable('knowledge_points', {
  id: text('id').primaryKey().notNull(),
  code: text('code').notNull().unique(),

  // 关联
  domainId: text('domain_id').notNull().references(() => knowledgeDomains.id, { onDelete: 'cascade' }),

  // 内容
  title: text('title').notNull(),
  summary: text('summary'), // 用户补充摘要
  secondaryTopic: text('secondary_topic').notNull().default('未分类'),
  topicOrder: integer('topic_order').notNull().default(0),

  // 学习资料和考核（从 Markdown 导入）
  studyMaterialMd: text('study_material_md').notNull(),
  assessmentSpecMd: text('assessment_spec_md').notNull(),
  passCriteriaMd: text('pass_criteria_md').notNull(),

  // 属性
  difficulty: text('difficulty', { enum: ['intermediate', 'senior', 'advanced'] }).notNull(),
  capabilityLayer: text('capability_layer', { enum: ['CORE', 'APPLICATION', 'SPECIALTY', 'LEADERSHIP'] }).notNull().default('CORE'),
  requirementLevel: text('requirement_level', { enum: ['REQUIRED', 'TRACK_REQUIRED', 'ELECTIVE'] }).notNull().default('REQUIRED'),
  maturity: text('maturity', { enum: ['STABLE', 'EVOLVING', 'EXPERIMENTAL'] }).notNull().default('STABLE'),
  aiRelation: text('ai_relation', { enum: ['NONE', 'AI_ASSISTED', 'AI_NATIVE', 'AGENTIC'] }).notNull().default('NONE'),
  portability: text('portability', { enum: ['PORTABLE', 'FRAMEWORK_SPECIFIC', 'VENDOR_SPECIFIC', 'PLATFORM_SPECIFIC', 'JURISDICTION_SPECIFIC'] }).notNull().default('PORTABLE'),
  applicabilityTags: text('applicability_tags', { mode: 'json' }).$type<string[]>().notNull().default([]),
  topicTags: text('topic_tags', { mode: 'json' }).$type<string[]>().notNull().default([]),
  trackIds: text('track_ids', { mode: 'json' }).$type<string[]>().notNull().default([]),
  verifiedAt: text('verified_at').notNull().default('2026-08-04'),
  fallbackStrategy: text('fallback_strategy').notNull().default('按目标环境做能力检测并保留稳定降级路径。'),
  planWeek: integer('plan_week'), // 兼容字段：紧凑核心路线的批次编号

  // 首次掌握按阶段拆分，复测单列；均以分钟计，便于计划负载计算。
  studyMinutes: integer('study_minutes').notNull().default(45),
  practiceMinutes: integer('practice_minutes').notNull().default(75),
  projectMinutes: integer('project_minutes').notNull().default(60),
  assessmentMinutes: integer('assessment_minutes').notNull().default(45),
  retestMinutes: integer('retest_minutes').notNull().default(30),

  // 状态（由状态机管理）
  status: text('status', {
    enum: ['NOT_STARTED', 'LEARNING', 'SELF_MASTERED', 'FIRST_PASS_PENDING_RETEST', 'MASTERED', 'NEEDS_RELEARNING']
  }).notNull(),

  // 自主学习与掌握证据是两条独立状态轴；旧 status 继续保留以兼容历史数据。
  learningState: text('learning_state', {
    enum: ['NOT_STARTED', 'LEARNING', 'LEARNED', 'DEFERRED']
  }).notNull().default('NOT_STARTED'),
  masteryLevel: integer('mastery_level').notNull().default(0), // M0-M4
  learnedAt: text('learned_at'),
  deferredAt: text('deferred_at'),
  deferReason: text('defer_reason'),
  currentFocus: integer('current_focus', { mode: 'boolean' }).notNull().default(false),

  // 状态时间
  selfMasteredAt: text('self_mastered_at'),
  firstPassedAt: text('first_passed_at'),
  masteredAt: text('mastered_at'),
  nextReviewAt: text('next_review_at'),

  // 来源追踪
  sourcePath: text('source_path').notNull(),
  sourceHash: text('source_hash').notNull(),

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  domainStatusIdx: index('kp_domain_status_idx').on(table.domainId, table.status),
}));

// ===== 知识关系表 =====
// Phase 4: 知识图谱
export const knowledgeEdges = sqliteTable('knowledge_edges', {
  id: text('id').primaryKey().notNull(),

  // 关系两端的知识点
  sourcePointId: text('source_point_id').notNull().references(() => knowledgePoints.id, { onDelete: 'cascade' }),
  targetPointId: text('target_point_id').notNull().references(() => knowledgePoints.id, { onDelete: 'cascade' }),

  // 关系类型
  type: text('type', {
    enum: ['PREREQUISITE', 'RELATED', 'COMPARES_WITH', 'APPLIED_WITH']
  }).notNull(),

  // 描述和权重
  description: text('description'),
  weight: integer('weight').notNull().default(1), // 1-10，关系强度

  createdAt: text('created_at').notNull(),
}, (table) => ({
  // 唯一约束：同一对知识点之间同类型关系只能有一条
  sourceTargetTypeIdx: index('ke_source_target_type_idx').on(table.sourcePointId, table.targetPointId, table.type),
}));

// ===== 计划事件表 =====
// Phase 3: 日历、计划与打卡
export const planEvents = sqliteTable('plan_events', {
  id: text('id').primaryKey().notNull(),

  // 事件类型
  eventType: text('event_type', {
    enum: ['LEARNING', 'ASSESSMENT', 'RETEST', 'PROJECT_OUTPUT', 'JOB_APPLICATION', 'INTERVIEW', 'REVIEW']
  }).notNull(),

  // 基本信息
  title: text('title').notNull(),
  description: text('description'),

  // 时间
  startAt: text('start_at').notNull(), // ISO 8601 UTC
  endAt: text('end_at').notNull(),
  allDay: integer('all_day', { mode: 'boolean' }).notNull().default(false),

  // 状态
  status: text('status', {
    enum: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'PARTIAL', 'SKIPPED', 'RESCHEDULED']
  }).notNull().default('PLANNED'),

  // 优先级 (1-5, 1最高)
  priority: integer('priority').notNull().default(3),

  // 关联业务对象（至少关联一个或填写独立描述）
  knowledgePointId: text('knowledge_point_id').references(() => knowledgePoints.id, { onDelete: 'set null' }),
  jobId: text('job_id'), // Phase 6 求职支线
  assessmentSessionId: text('assessment_session_id'), // Phase 5 考核

  // 重复事件
  recurrenceRule: text('recurrence_rule'), // RFC 5545 RRULE 格式
  recurrenceParentId: text('recurrence_parent_id').references((): AnySQLiteColumn => planEvents.id, { onDelete: 'cascade' }),

  // 改期追踪
  rescheduledToId: text('rescheduled_to_id').references((): AnySQLiteColumn => planEvents.id, { onDelete: 'set null' }),
  rescheduledFromId: text('rescheduled_from_id').references((): AnySQLiteColumn => planEvents.id, { onDelete: 'set null' }),

  // 来源（模板导入或用户创建）
  sourceType: text('source_type', { enum: ['TEMPLATE', 'USER', 'SYSTEM'] }).notNull().default('USER'),
  templateWeek: integer('template_week'), // 来源模板周次
  templateDay: text('template_day'), // 来源模板日期（周一/周二等）

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  startAtEventTypeIdx: index('pe_start_at_event_type_idx').on(table.startAt, table.eventType),
  statusIdx: index('pe_status_idx').on(table.status),
  knowledgePointIdx: index('pe_knowledge_point_idx').on(table.knowledgePointId),
}));

// ===== 打卡记录表 =====
export const checkins = sqliteTable('checkins', {
  id: text('id').primaryKey().notNull(),
  planEventId: text('plan_event_id').notNull().references(() => planEvents.id, { onDelete: 'cascade' }),

  // 结果
  result: text('result', {
    enum: ['COMPLETED', 'PARTIAL', 'SKIPPED', 'RESCHEDULED']
  }).notNull(),

  // 实际耗时（分钟）
  actualMinutes: integer('actual_minutes'),

  // 笔记和反思
  noteMd: text('note_md'),

  // 能量和难度评估（1-5）
  energyLevel: integer('energy_level'),
  difficultyLevel: integer('difficulty_level'),

  // 证据附件路径
  evidencePath: text('evidence_path'),

  checkedAt: text('checked_at').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  planEventIdx: index('checkins_plan_event_idx').on(table.planEventId),
  checkedAtIdx: index('checkins_checked_at_idx').on(table.checkedAt),
}));

// ===== 日复盘表 =====
export const dailyReviews = sqliteTable('daily_reviews', {
  id: text('id').primaryKey().notNull(),

  // 日期范围
  reviewDate: text('review_date').notNull().unique(), // YYYY-MM-DD (Asia/Shanghai)

  // 完成统计
  plannedCount: integer('planned_count').notNull().default(0),
  completedCount: integer('completed_count').notNull().default(0),
  partialCount: integer('partial_count').notNull().default(0),
  skippedCount: integer('skipped_count').notNull().default(0),

  // 复盘内容
  summaryMd: text('summary_md'), // 今日收获
  challengesMd: text('challenges_md'), // 遇到的困难
  adjustmentsMd: text('adjustments_md'), // 明日调整
  nextDayFocus: text('next_day_focus'), // 明日重点

  // 实际学习时长（分钟）
  totalMinutes: integer('total_minutes').notNull().default(0),

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  reviewDateIdx: index('dr_review_date_idx').on(table.reviewDate),
}));

// ===== 请假与计划顺延 =====
export const leaveDays = sqliteTable('leave_days', {
  id: text('id').primaryKey().notNull(),
  leaveDate: text('leave_date').notNull().unique(),
  reason: text('reason'),
  shiftedEventCount: integer('shifted_event_count').notNull().default(0),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  leaveDateIdx: index('leave_days_date_idx').on(table.leaveDate),
}));

// ===== 周复盘表 =====
export const weeklyReviews = sqliteTable('weekly_reviews', {
  id: text('id').primaryKey().notNull(),

  // 周范围
  weekStartDate: text('week_start_date').notNull(), // ISO 周一日期
  weekEndDate: text('week_end_date').notNull(),
  weekNumber: integer('week_number').notNull(), // 年内周次

  // 完成统计
  plannedCount: integer('planned_count').notNull().default(0),
  completedCount: integer('completed_count').notNull().default(0),
  partialCount: integer('partial_count').notNull().default(0),
  skippedCount: integer('skipped_count').notNull().default(0),
  completionRate: integer('completion_rate'), // 百分比 0-100

  // 复盘内容
  summaryMd: text('summary_md'), // 本周收获
  challengesMd: text('challenges_md'), // 遇到的困难
  adjustmentsMd: text('adjustments_md'), // 下周调整
  nextWeekFocus: text('next_week_focus'), // 下周重点

  // 历史复盘兼容字段；新路线不以自然周为单位
  planWeekNumber: integer('plan_week_number'), // 可记录核心路线批次编号
  themeCompleted: integer('theme_completed', { mode: 'boolean' }), // 该批次主题是否完成

  // 实际学习时长（分钟）
  totalMinutes: integer('total_minutes').notNull().default(0),

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  weekStartIdx: index('wr_week_start_idx').on(table.weekStartDate),
  planWeekIdx: index('wr_plan_week_idx').on(table.planWeekNumber),
}));

// ===== 考核会话表 =====
// Phase 5: AI 考核 MVP
export const assessmentSessions = sqliteTable('assessment_sessions', {
  id: text('id').primaryKey().notNull(),

  // 关联知识点
  knowledgePointCode: text('knowledge_point_code').notNull(),

  // 考核类型
  assessmentType: text('assessment_type', {
    enum: ['FIRST', 'RETEST', 'MONTHLY_REVIEW', 'DOMAIN_COMPREHENSIVE']
  }).notNull(),

  // 会话状态
  status: text('status', {
    enum: ['DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'GRADING', 'GRADED', 'ERROR', 'CANCELLED']
  }).notNull().default('DRAFT'),

  // 时长配置（分钟）
  durationMinutes: integer('duration_minutes').notNull(),

  // 可选的渐进式掌握挑战：M1 理解、M2 引导应用、M3 独立掌握、M4 稳定掌握。
  masteryStage: integer('mastery_stage').notNull().default(3),
  challengeMode: text('challenge_mode', { enum: ['THEORY', 'PRACTICE', 'MIXED'] }).notNull().default('THEORY'),
  challengeProfile: text('challenge_profile', {
    enum: ['AUTO', 'THEORY_ONLY', 'EXAMPLE_DRIVEN', 'CODING', 'DEBUGGING', 'TOOL_OPERATION', 'DESIGN_CASE']
  }).notNull().default('AUTO'),
  assistanceLevel: integer('assistance_level').notNull().default(0),

  // 时间戳
  startedAt: text('started_at'),
  submittedAt: text('submitted_at'),
  gradedAt: text('graded_at'),

  // 评分结果（外键关联 assessment_results）
  resultId: text('result_id'),

  // AI Provider 信息
  provider: text('provider'),
  model: text('model'),
  promptVersion: text('prompt_version'),

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  knowledgePointCodeIdx: index('as_knowledge_point_code_idx').on(table.knowledgePointCode),
  statusIdx: index('as_status_idx').on(table.status),
}));

// ===== 考核题目表 =====
export const assessmentQuestions = sqliteTable('assessment_questions', {
  id: text('id').primaryKey().notNull(),
  sessionId: text('session_id').notNull().references(() => assessmentSessions.id, { onDelete: 'cascade' }),

  // 题目类型
  questionType: text('question_type', {
    enum: ['CHOICE', 'OUTPUT', 'ESSAY', 'CODE_READ', 'CODE_WRITE']
  }).notNull(),

  // 维度归属
  dimension: text('dimension', {
    enum: ['principlesAndBoundaries', 'practice', 'troubleshootingAndDesign', 'projectCommunication']
  }).notNull(),

  // 题目内容（JSON）
  questionContent: text('question_content').notNull(), // JSON string

  // 分值
  maxScore: integer('max_score').notNull(),

  // 排序
  orderIndex: integer('order_index').notNull(),

  createdAt: text('created_at').notNull(),
}, (table) => ({
  sessionIdx: index('aq_session_idx').on(table.sessionId),
}));

// ===== 用户答案表 =====
export const assessmentAnswers = sqliteTable('assessment_answers', {
  id: text('id').primaryKey().notNull(),
  sessionId: text('session_id').notNull().references(() => assessmentSessions.id, { onDelete: 'cascade' }),
  questionId: text('question_id').notNull().references(() => assessmentQuestions.id, { onDelete: 'cascade' }),

  // 答案内容
  answerContent: text('answer_content').notNull(), // JSON string

  // 历史字段名：当前保存的是未经服务端认证的本地 Worker 自检记录（代码题）
  deterministicResult: text('deterministic_result'), // JSON string

  // 提交时间
  answeredAt: text('answered_at').notNull(),

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  sessionIdx: index('aa_session_idx').on(table.sessionId),
  questionIdx: index('aa_question_idx').on(table.questionId),
  // 唯一约束：每个题目的答案唯一
  sessionQuestionUIdx: index('aa_session_question_uidx').on(table.sessionId, table.questionId),
}));

// ===== 评分结果表 =====
export const assessmentResults = sqliteTable('assessment_results', {
  id: text('id').primaryKey().notNull(),
  sessionId: text('session_id').notNull().references(() => assessmentSessions.id, { onDelete: 'cascade' }).unique(),

  // 维度分数
  principlesScore: integer('principles_score').notNull().default(0), // 满分 25
  practiceScore: integer('practice_score').notNull().default(0), // 满分 35
  troubleshootingScore: integer('troubleshooting_score').notNull().default(0), // 满分 25
  communicationScore: integer('communication_score').notNull().default(0), // 满分 15

  // 总分
  totalScore: integer('total_score').notNull().default(0), // 满分 100

  // 判定结果
  verdict: text('verdict', {
    enum: ['PASS', 'FAIL', 'MANUAL_REVIEW']
  }).notNull(),

  // 置信度 (0.0 - 1.0)
  confidence: text('confidence').notNull(), // 存储为字符串避免精度问题

  // 否决项
  criticalFailures: text('critical_failures'), // JSON string array

  // 薄弱项
  weaknesses: text('weaknesses'), // JSON string array

  // 反馈
  feedback: text('feedback'), // JSON string

  // AI 原始响应（完整保存，用于审计）
  aiRawResponse: text('ai_raw_response'), // JSON string

  // AI 使用量
  aiUsagePromptTokens: integer('ai_usage_prompt_tokens'),
  aiUsageCompletionTokens: integer('ai_usage_completion_tokens'),

  // 重算验证（服务端重算后的结果）
  serverCalculatedTotal: integer('server_calculated_total'),
  serverCalculatedVerdict: text('server_calculated_verdict', {
    enum: ['PASS', 'FAIL', 'MANUAL_REVIEW']
  }),

  createdAt: text('created_at').notNull(),
}, (table) => ({
  sessionIdx: index('ar_session_idx').on(table.sessionId),
}));

// ===== 掌握审计事件表 =====
// 追踪所有状态变化
export const masteryEvents = sqliteTable('mastery_events', {
  id: text('id').primaryKey().notNull(),

  // 关联知识点
  knowledgePointCode: text('knowledge_point_code').notNull(),

  // 事件类型（状态转换动作）
  action: text('action', {
    enum: ['start', 'selfMastery', 'firstPass', 'firstFail', 'retestPass', 'retestFail', 'reviewPass', 'reviewFail', 'restart', 'reopen']
  }).notNull(),

  // 状态变化
  fromStatus: text('from_status', {
    enum: ['NOT_STARTED', 'LEARNING', 'SELF_MASTERED', 'FIRST_PASS_PENDING_RETEST', 'MASTERED', 'NEEDS_RELEARNING']
  }).notNull(),
  toStatus: text('to_status', {
    enum: ['NOT_STARTED', 'LEARNING', 'SELF_MASTERED', 'FIRST_PASS_PENDING_RETEST', 'MASTERED', 'NEEDS_RELEARNING']
  }).notNull(),

  // 关联考核（如果有）
  assessmentSessionId: text('assessment_session_id').references(() => assessmentSessions.id, { onDelete: 'set null' }),

  // 证据摘要
  evidenceSummary: text('evidence_summary'),

  createdAt: text('created_at').notNull(),
}, (table) => ({
  knowledgePointCodeIdx: index('me_knowledge_point_code_idx').on(table.knowledgePointCode),
  createdAtIdx: index('me_created_at_idx').on(table.createdAt),
}));

// ===== 笔记中心 =====
// 原始笔记永不被 AI 静默覆盖；organizedMd 只是候选整理稿。
export const knowledgeNotes = sqliteTable('knowledge_notes', {
  id: text('id').primaryKey().notNull(),
  knowledgePointCode: text('knowledge_point_code').notNull().unique(),
  domainCodeSnapshot: text('domain_code_snapshot'),
  pointTitleSnapshot: text('point_title_snapshot').notNull(),
  originalMd: text('original_md').notNull().default(''),
  organizedMd: text('organized_md'),
  activeVersionSource: text('active_version_source', { enum: ['ORIGINAL', 'ORGANIZED'] }).notNull().default('ORIGINAL'),
  aiReviewJson: text('ai_review_json'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  updatedAtIdx: index('kn_updated_at_idx').on(table.updatedAt),
}));

export const knowledgeNoteVersions = sqliteTable('knowledge_note_versions', {
  id: text('id').primaryKey().notNull(),
  noteId: text('note_id').notNull().references(() => knowledgeNotes.id, { onDelete: 'cascade' }),
  versionNo: integer('version_no').notNull(),
  source: text('source', { enum: ['USER', 'AI_DRAFT', 'AI_ACCEPTED', 'MIGRATED'] }).notNull(),
  contentMd: text('content_md').notNull(),
  changeSummary: text('change_summary'),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  noteIdx: index('knv_note_idx').on(table.noteId),
}));

// ===== 自主学习打卡 =====
export const learningCheckins = sqliteTable('learning_checkins', {
  id: text('id').primaryKey().notNull(),
  checkinDate: text('checkin_date').notNull().unique(),
  summaryMd: text('summary_md'),
  actualMinutes: integer('actual_minutes'),
  energyLevel: integer('energy_level'),
  difficultyLevel: integer('difficulty_level'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const learningCheckinPoints = sqliteTable('learning_checkin_points', {
  id: text('id').primaryKey().notNull(),
  checkinId: text('checkin_id').notNull().references(() => learningCheckins.id, { onDelete: 'cascade' }),
  knowledgePointCode: text('knowledge_point_code').notNull(),
  activity: text('activity', { enum: ['PROGRESSED', 'LEARNED', 'REVIEWED', 'CHALLENGED'] }).notNull().default('PROGRESSED'),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  checkinIdx: index('lcp_checkin_idx').on(table.checkinId),
}));

// 分支选择属于个人路线偏好，不修改知识图谱本身。
export const learningRouteChoices = sqliteTable('learning_route_choices', {
  id: text('id').primaryKey().notNull(),
  sourceCode: text('source_code').notNull(),
  targetCode: text('target_code').notNull(),
  state: text('state', { enum: ['SELECTED', 'DEFERRED'] }).notNull(),
  scope: text('scope', { enum: ['POINT', 'BRANCH'] }).notNull().default('POINT'),
  reason: text('reason'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  stateIdx: index('lrc_state_idx').on(table.state),
}));

export const assessmentHintEvents = sqliteTable('assessment_hint_events', {
  id: text('id').primaryKey().notNull(),
  sessionId: text('session_id').notNull().references(() => assessmentSessions.id, { onDelete: 'cascade' }),
  questionId: text('question_id').references(() => assessmentQuestions.id, { onDelete: 'cascade' }),
  level: integer('level').notNull(),
  hintKind: text('hint_kind', { enum: ['EXPLAIN', 'HINT', 'DECOMPOSE', 'OUTLINE', 'STARTER', 'SIMILAR_EXAMPLE', 'FULL_ANSWER'] }).notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  sessionIdx: index('ahe_session_idx').on(table.sessionId),
}));

// ===== 岗位表 =====
// Phase 6: 求职支线
export const jobs = sqliteTable('jobs', {
  id: text('id').primaryKey().notNull(),

  // 基本信息
  company: text('company').notNull(),
  jobTitle: text('job_title').notNull(),
  platform: text('platform').notNull(), // BOSS、猎聘、前程无忧等

  // 薪资和经验
  salary: text('salary'), // 如 "25-40K"
  experience: text('experience'), // 如 "3-5年"
  location: text('location'), // 如 "杭州"

  // 来源
  sourceUrl: text('source_url'),
  sourcePath: text('source_path'), // 来源文件路径（CSV导入时）

  // 方向和技术栈
  jobDirection: text('job_direction'), // 如 "React 中后台"
  techStack: text('tech_stack'), // 分号分隔，如 "React;TypeScript;Umi"
  jdKeywords: text('jd_keywords'), // 分号分隔，如 "权限;表单;表格"

  // 匹配分析
  matchedProject: text('matched_project'), // 最匹配的项目名
  matchLevel: text('match_level', { enum: ['HIGH', 'MEDIUM', 'LOW'] }),
  skillGap: text('skill_gap'), // 分号分隔的技能缺口

  // 状态流转
  status: text('status', {
    enum: ['SAVED', 'TO_APPLY', 'APPLIED', 'CONTACTING', 'ASSESSMENT', 'INTERVIEWING', 'OFFER', 'REJECTED', 'WITHDRAWN']
  }).notNull().default('SAVED'),

  // 下一步动作
  nextAction: text('next_action'), // 如 "完善简历"、"刷题准备"
  nextActionDue: text('next_action_due'), // ISO 日期

  // 备注
  notes: text('notes'),

  // 重要程度
  priority: integer('priority').notNull().default(3), // 1-5，1最高

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  statusIdx: index('jobs_status_idx').on(table.status),
  platformIdx: index('jobs_platform_idx').on(table.platform),
  createdAtIdx: index('jobs_created_at_idx').on(table.createdAt),
}));

// ===== 求职活动表 =====
// 追踪面试、沟通、笔试等
export const jobActivities = sqliteTable('job_activities', {
  id: text('id').primaryKey().notNull(),

  // 关联岗位
  jobId: text('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),

  // 活动类型
  activityType: text('activity_type', {
    enum: ['APPLICATION', 'MESSAGE', 'WRITTEN_TEST', 'INTERVIEW', 'FOLLOW_UP', 'OFFER', 'REJECTION']
  }).notNull(),

  // 基本信息
  title: text('title').notNull(),
  description: text('description'),

  // 时间
  scheduledAt: text('scheduled_at'), // 计划时间
  completedAt: text('completed_at'), // 实际完成时间

  // 状态
  status: text('status', {
    enum: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
  }).notNull().default('PLANNED'),

  // 面试细节（仅 INTERVIEW 类型）
  interviewRound: integer('interview_round'), // 第几轮
  interviewType: text('interview_type', { enum: ['PHONE', 'VIDEO', 'ONSITE'] }),
  interviewer: text('interviewer'), // 面试官信息

  // 反馈记录
  feedbackMd: text('feedback_md'), // 面试反馈（Markdown）

  // 技能缺口发现
  discoveredGaps: text('discovered_gaps'), // JSON array of knowledge point codes

  // 关联日历事件
  planEventId: text('plan_event_id').references(() => planEvents.id, { onDelete: 'set null' }),

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  jobIdIdx: index('ja_job_id_idx').on(table.jobId),
  activityTypeIdx: index('ja_activity_type_idx').on(table.activityType),
  scheduledAtIdx: index('ja_scheduled_at_idx').on(table.scheduledAt),
}));

// ===== 技能缺口表 =====
// 关联知识点和岗位
export const skillGaps = sqliteTable('skill_gaps', {
  id: text('id').primaryKey().notNull(),

  // 关联岗位
  jobId: text('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),

  // 关联知识点
  knowledgePointCode: text('knowledge_point_code').notNull(),

  // 缺口等级
  gapLevel: text('gap_level', { enum: ['HIGH', 'MEDIUM', 'LOW'] }).notNull(),

  // 来源
  sourceType: text('source_type', { enum: ['JD_ANALYSIS', 'INTERVIEW_FEEDBACK', 'SELF_ASSESSMENT'] }).notNull(),

  // 来源活动（如果是面试反馈）
  activityId: text('activity_id').references(() => jobActivities.id, { onDelete: 'set null' }),

  // 状态
  status: text('status', {
    enum: ['IDENTIFIED', 'LEARNING', 'MASTERED', 'CLOSED']
  }).notNull().default('IDENTIFIED'),

  // 学习行动
  learningAction: text('learning_action'),

  // 关闭时间
  closedAt: text('closed_at'),

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  jobIdIdx: index('sg_job_id_idx').on(table.jobId),
  knowledgePointCodeIdx: index('sg_knowledge_point_code_idx').on(table.knowledgePointCode),
  statusIdx: index('sg_status_idx').on(table.status),
}));

// ===== 项目资产表 =====
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey().notNull(),

  // 基本信息
  name: text('name').notNull(),
  type: text('project_type', {
    enum: ['WEB', 'H5', 'COMPONENT_LIBRARY', 'TOOL', 'OTHER']
  }).notNull(),

  // 定位和主题
  positioning: text('positioning'), // 如 "大型中后台代表作"
  growthThemes: text('growth_themes'), // 分号分隔，如 "性能优化;业务建模"

  // 业务背景
  businessContext: text('business_context'),
  targetUsers: text('target_users'),
  myRole: text('my_role'),

  // 技术信息
  techStack: text('tech_stack'), // 分号分隔

  // 核心内容
  coreModules: text('core_modules'), // JSON array of module summaries
  techChallenges: text('tech_challenges'), // JSON array of challenge objects

  // 沉淀
  components: text('components'), // 沉淀的组件/工具
  lessonsLearned: text('lessons_learned'), // 踩坑和反思

  // 表达版本
  resumeVersion: text('resume_version'), // 30秒简历版
  interviewVersion: text('interview_version'), // 2分钟面试版
  deepVersion: text('deep_version'), // 5分钟深挖版

  // 关联
  matchedJobs: text('matched_jobs'), // JSON array of job IDs

  // 状态
  status: text('status', {
    enum: ['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED']
  }).notNull().default('DRAFT'),

  // 来源
  sourcePath: text('source_path'), // Markdown 来源路径

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  typeIdx: index('projects_type_idx').on(table.type),
  statusIdx: index('projects_status_idx').on(table.status),
}));

// ===== AI 助手发现的待补学习资料 =====
// 只保存经模型判断与培养目标相关、且站内没有强匹配知识点的候选项。
export const assistantGapCandidates = sqliteTable('assistant_gap_candidates', {
  id: text('id').primaryKey().notNull(),
  fingerprint: text('fingerprint').notNull().unique(),
  title: text('title').notNull(),
  rationale: text('rationale').notNull(),
  suggestedScope: text('suggested_scope').notNull(),
  sourceRoute: text('source_route').notNull(),
  sourcePageTitle: text('source_page_title').notNull(),
  questionExcerpt: text('question_excerpt').notNull(),
  selectedTextExcerpt: text('selected_text_excerpt'),
  status: text('status', { enum: ['PENDING', 'ADDED', 'DISMISSED'] }).notNull().default('PENDING'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  statusCreatedIdx: index('assistant_gap_status_created_idx').on(table.status, table.createdAt),
}));

// ===== 导出 schema 对象 =====
export const schema = {
  knowledgeDomains,
  knowledgePoints,
  knowledgeEdges,
  planEvents,
  checkins,
  dailyReviews,
  leaveDays,
  weeklyReviews,
  assessmentSessions,
  assessmentQuestions,
  assessmentAnswers,
  assessmentResults,
  masteryEvents,
  knowledgeNotes,
  knowledgeNoteVersions,
  learningCheckins,
  learningCheckinPoints,
  learningRouteChoices,
  assessmentHintEvents,
  jobs,
  jobActivities,
  skillGaps,
  projects,
  assistantGapCandidates,
};

// ===== 类型导出 =====
export type KnowledgeDomainRecord = typeof knowledgeDomains.$inferSelect;
export type KnowledgePointRecord = typeof knowledgePoints.$inferSelect;
export type KnowledgeEdgeRecord = typeof knowledgeEdges.$inferSelect;
export type NewKnowledgeDomain = typeof knowledgeDomains.$inferInsert;
export type NewKnowledgePoint = typeof knowledgePoints.$inferInsert;
export type NewKnowledgeEdge = typeof knowledgeEdges.$inferInsert;

export type PlanEventRecord = typeof planEvents.$inferSelect;
export type NewPlanEvent = typeof planEvents.$inferInsert;
export type CheckinRecord = typeof checkins.$inferSelect;
export type NewCheckin = typeof checkins.$inferInsert;
export type DailyReviewRecord = typeof dailyReviews.$inferSelect;
export type NewDailyReview = typeof dailyReviews.$inferInsert;
export type LeaveDayRecord = typeof leaveDays.$inferSelect;
export type NewLeaveDay = typeof leaveDays.$inferInsert;
export type WeeklyReviewRecord = typeof weeklyReviews.$inferSelect;
export type NewWeeklyReview = typeof weeklyReviews.$inferInsert;

export type AssessmentSessionRecord = typeof assessmentSessions.$inferSelect;
export type NewAssessmentSession = typeof assessmentSessions.$inferInsert;
export type AssessmentQuestionRecord = typeof assessmentQuestions.$inferSelect;
export type NewAssessmentQuestion = typeof assessmentQuestions.$inferInsert;
export type AssessmentAnswerRecord = typeof assessmentAnswers.$inferSelect;
export type NewAssessmentAnswer = typeof assessmentAnswers.$inferInsert;
export type AssessmentResultRecord = typeof assessmentResults.$inferSelect;
export type NewAssessmentResult = typeof assessmentResults.$inferInsert;
export type MasteryEventRecord = typeof masteryEvents.$inferSelect;
export type NewMasteryEvent = typeof masteryEvents.$inferInsert;
export type KnowledgeNoteRecord = typeof knowledgeNotes.$inferSelect;
export type KnowledgeNoteVersionRecord = typeof knowledgeNoteVersions.$inferSelect;
export type LearningCheckinRecord = typeof learningCheckins.$inferSelect;
export type LearningRouteChoiceRecord = typeof learningRouteChoices.$inferSelect;

// Phase 6: 求职支线类型导出
export type JobRecord = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type JobActivityRecord = typeof jobActivities.$inferSelect;
export type NewJobActivity = typeof jobActivities.$inferInsert;
export type SkillGapRecord = typeof skillGaps.$inferSelect;
export type NewSkillGap = typeof skillGaps.$inferInsert;
export type ProjectRecord = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type AssistantGapCandidateRecord = typeof assistantGapCandidates.$inferSelect;

// ===== 枚举类型导出 =====
export type EventType = typeof planEvents.$inferSelect.eventType;
export type PlanEventStatus = typeof planEvents.$inferSelect.status;
export type CheckinResult = typeof checkins.$inferSelect.result;
export type KnowledgeEdgeType = typeof knowledgeEdges.$inferSelect.type;

export type AssessmentType = typeof assessmentSessions.$inferSelect.assessmentType;
export type AssessmentSessionStatus = typeof assessmentSessions.$inferSelect.status;
export type QuestionType = typeof assessmentQuestions.$inferSelect.questionType;
export type AssessmentDimension = typeof assessmentQuestions.$inferSelect.dimension;
export type AssessmentVerdict = typeof assessmentResults.$inferSelect.verdict;
export type MasteryAction = typeof masteryEvents.$inferSelect.action;

// Phase 6 枚举
export type JobStatus = typeof jobs.$inferSelect.status;
export type JobActivityType = typeof jobActivities.$inferSelect.activityType;
export type SkillGapLevel = typeof skillGaps.$inferSelect.gapLevel;
export type SkillGapStatus = typeof skillGaps.$inferSelect.status;
export type ProjectType = typeof projects.$inferSelect.type;
export type ProjectStatus = typeof projects.$inferSelect.status;
