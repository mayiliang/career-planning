/** 稳定的页面调用入口；业务接口按领域维护，传输层独立复用。 */
import { knowledgeApi } from './modules/knowledge';
import { calendarApi } from './modules/calendar';
import { jobsApi } from './modules/jobs';
import { assessmentApi } from './modules/assessment';
import { systemApi } from './modules/system';
import { assistantApi } from './modules/assistant';
import { learningApi } from './modules/learning';

export { ApiError, AssistantStreamError } from './errors';
export type { AssistantErrorDiagnostic } from './errors';
export type { KnowledgePointListItem, KnowledgeRecommendation, KnowledgePointDetail, LearningActivity, GraphNode, GraphEdge, GraphData, DomainStats, KnowledgeRelations, RelationPoint, KnowledgeTree } from './modules/knowledge';
export type { PlanEvent, Checkin, TodayPlan, PlanLearningBrief, LearningBriefPoint, LeaveDay, EventType, EventStatus, CheckinResult } from './modules/calendar';
export type { Job, JobStatus, JobActivity, JobActivityType, SkillGap, JobListResponse, JobDetailResponse, JobKanbanColumn, JobFunnelStats, JobCSVRow, JobImportPreview } from './modules/jobs';
export type { AssessmentSession, AssessmentQuestion, AssessmentAnswer, AssessmentDetail, AssessmentResult } from './modules/assessment';
export type { ResetLearningProgressResult, BackupMetadata, RestorePreview, PortableDataExport, PortableDataImportPreview } from './modules/system';
export type { AssistantSource, AssistantGapCandidate, AssistantRequest, AssistantRuntimeDiagnostic, AssistantStreamHandlers } from './modules/assistant';
export type { NoteSortMode, LearningWorkspace, WorkspacePoint, LearningBranch, PracticeAttempt, KnowledgeNote, LearningCheckin } from './modules/learning';

export const apiClient = {
  ...knowledgeApi,
  ...calendarApi,
  ...jobsApi,
  ...assessmentApi,
  ...systemApi,
  ...assistantApi,
  ...learningApi,
};
