import type { AssessmentSessionRecord, AssessmentResultRecord } from '../../db/schema.js';

export class GradingStateError extends Error {
  constructor(message: string, readonly statusCode = 409) {
    super(message);
    this.name = 'GradingStateError';
  }
}

export interface GradeRequest {
  sessionId: string;
  provider?: 'deepseek' | 'fake';
}

// ===== 评分结果 =====

export interface GradeResult {
  session: AssessmentSessionRecord;
  result: AssessmentResultRecord;
  knowledgePointUpdated: boolean;
  retestEventCreated: boolean;
  reviewEventCreated: boolean;
}

