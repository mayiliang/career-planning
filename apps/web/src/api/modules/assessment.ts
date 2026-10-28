/** 掌握挑战、提示与评分：运行时响应校验与业务接口。 */
import { z } from 'zod';
import {
  CreateAssessmentRequestSchema, AssessmentSessionSchema, AssessmentAnswerSchema,
  AssessmentCreationResponseSchema, AssessmentDetailSchema, AssessmentResultSchema,
  AssessmentGradeResponseSchema, AssessmentRegradeResponseSchema,
} from '@career-atlas/shared';
import { request } from '../http';
import { consumeSse, streamStructuredResult } from '../stream';

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

export const assessmentApi = {
  async createAssessment(data: z.input<typeof CreateAssessmentRequestSchema>) {
    return request('/assessments', AssessmentCreationResponseSchema, {
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

  async getAssessment(id: string, signal?: AbortSignal) {
    return request(`/assessments/${id}`, AssessmentDetailSchema, { signal });
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
    return streamStructuredResult(`/assessments/${encodeURIComponent(id)}/grade/stream`, AssessmentGradeResponseSchema, 'grade', onProgress, { signal }, onThinking);
  },

  async regradeAssessment(id: string) {
    return request(`/assessments/${id}/regrade`, AssessmentRegradeResponseSchema, { method: 'POST' });
  },

  async regradeAssessmentStream(id: string, onProgress: (message: string, receivedChars?: number) => void, signal?: AbortSignal, onThinking?: (delta: string, accumulated: string) => void) {
    return streamStructuredResult(`/assessments/${encodeURIComponent(id)}/regrade/stream`, AssessmentRegradeResponseSchema, 'grade', onProgress, { signal }, onThinking);
  },

  async getAssessmentResult(id: string, signal?: AbortSignal) {
    return request(`/assessments/${id}/result`, AssessmentResultSchema, { signal });
  },
};

export type { AssessmentSession, AssessmentQuestion, AssessmentAnswer, AssessmentDetail, AssessmentResult } from '@career-atlas/shared';
