/**
 * 状态枚举集合
 * 
 * Phase 0 实现：集中导出所有状态枚举
 */
export {
  KnowledgeStatusSchema,
  type KnowledgeStatus,
  DifficultySchema,
  type Difficulty,
} from '../domain/knowledge.js';

export {
  AssessmentTypeSchema,
  type AssessmentType,
  AssessmentSessionStatusSchema,
  type AssessmentSessionStatus,
  AssessmentVerdictSchema,
  type AssessmentVerdict,
} from '../domain/assessment.js';

export {
  EventTypeSchema,
  type EventType,
  EventStatusSchema,
  type EventStatus,
  PrioritySchema,
  type Priority,
} from '../domain/planning.js';

export {
  JobStatusSchema,
  type JobStatus,
  JobActivityTypeSchema,
  type JobActivityType,
  GapLevelSchema,
  type GapLevel,
} from '../domain/jobs.js';