/** 自主学习、练习与笔记：运行时响应校验与业务接口。 */
import { z } from 'zod';
import { request } from '../http';
import { consumeSse, streamStructuredResult } from '../stream';

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

export const learningApi = {
  async getLearningWorkspace() {
    return request('/learning/workspace', LearningWorkspaceSchema);
  },

  async focusLearningPoint(code: string) {
    return request(`/learning/points/${encodeURIComponent(code)}/focus`, z.object({ code: z.string(), learningState: z.enum(['LEARNING', 'LEARNED']), currentFocus: z.boolean(), updatedAt: z.string() }), { method: 'POST' });
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

  async getNextBranches(code: string, signal?: AbortSignal) {
    return request(`/learning/points/${encodeURIComponent(code)}/branches`, z.array(BranchSchema), { signal });
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
      'attempt',
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

  async listNotes(params?: { search?: string; domainCode?: string; sort?: NoteSortMode }, signal?: AbortSignal) {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.domainCode) query.set('domainCode', params.domainCode);
    if (params?.sort) query.set('sort', params.sort);
    return request(`/notes${query.size ? `?${query}` : ''}`, z.array(KnowledgeNoteSchema), { signal });
  },

  async getNote(code: string, signal?: AbortSignal) {
    return request(`/notes/${encodeURIComponent(code)}`, KnowledgeNoteSchema.nullable(), { signal });
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

  async acceptOrganizedNote(code: string, expectedDraftVersionId?: string) {
    return request(`/notes/${encodeURIComponent(code)}/accept-organized`, KnowledgeNoteSchema, {
      method: 'POST', body: JSON.stringify({ expectedDraftVersionId }),
    });
  },

  async saveLearningCheckin(date: string, data: { pointCodes: string[]; summaryMd?: string; actualMinutes?: number; energyLevel?: number; difficultyLevel?: number }) {
    return request(`/learning/checkins/${date}`, LearningCheckinSchema, { method: 'PUT', body: JSON.stringify(data) });
  },
};

export type NoteSortMode = 'knowledge' | 'updated_desc' | 'updated_asc' | 'title_asc' | 'code_asc';

export type LearningWorkspace = z.infer<typeof LearningWorkspaceSchema>;

export type WorkspacePoint = z.infer<typeof WorkspacePointSchema>;

export type LearningBranch = z.infer<typeof BranchSchema>;

export type PracticeAttempt = z.infer<typeof PracticeAttemptSchema>;

export type KnowledgeNote = z.infer<typeof KnowledgeNoteSchema>;

export type LearningCheckin = z.infer<typeof LearningCheckinSchema>;

async function streamOrganizedNote(
  code: string,
  onDelta: (delta: string, accumulated: string) => void,
  signal?: AbortSignal,
  onProgress: (message: string, elapsedSeconds: number) => void = () => {},
  onThinking: (delta: string, accumulated: string) => void = () => {},
) {
  let accumulated = '';
  let accumulatedThinking = '';
  let finalNote: unknown = null;

  await consumeSse(`/notes/${encodeURIComponent(code)}/organize/stream`, { method: 'POST', signal }, (event, data) => {
    if (event === 'delta' && typeof data.delta === 'string') {
      accumulated += data.delta;
      onDelta(data.delta, accumulated);
    } else if (event === 'reset') {
      accumulated = '';
      onDelta('', '');
    } else if (event === 'thinking' && typeof data.delta === 'string') {
      accumulatedThinking += data.delta;
      onThinking(data.delta, accumulatedThinking);
    } else if (event === 'done') {
      finalNote = data.note;
    } else if (event === 'progress' && typeof data.message === 'string') {
      onProgress(data.message, typeof data.elapsedSeconds === 'number' ? data.elapsedSeconds : 0);
    }
  });
  if (!finalNote) throw new Error('AI 整理流已结束，但没有收到完整结果');
  return KnowledgeNoteSchema.parse(finalNote);
}
