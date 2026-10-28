/** 显式投影公开字段，避免数据库新增列自动进入 JSON 或 SSE 响应。 */
import type {
  AssessmentSession, AssessmentQuestion, AssessmentAnswer, AssessmentResult,
  AssessmentGradeResponse, AssessmentRegradeResponse,
} from '@career-atlas/shared';
import type {
  AssessmentSessionRecord, AssessmentQuestionRecord, AssessmentAnswerRecord, AssessmentResultRecord,
} from '../../db/schema.js';
import type { GradeResult } from '../../services/grading/types.js';

export function toAssessmentSessionDto(session: AssessmentSessionRecord): AssessmentSession {
  return {
    id: session.id,
    knowledgePointCode: session.knowledgePointCode,
    assessmentType: session.assessmentType,
    status: session.status,
    durationMinutes: session.durationMinutes,
    masteryStage: session.masteryStage,
    challengeMode: session.challengeMode,
    challengeProfile: session.challengeProfile,
    assistanceLevel: session.assistanceLevel,
    startedAt: session.startedAt,
    submittedAt: session.submittedAt,
    gradedAt: session.gradedAt,
    resultId: session.resultId,
    provider: session.provider,
    model: session.model,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

export function toAssessmentQuestionDto(question: AssessmentQuestionRecord): AssessmentQuestion {
  return {
    id: question.id,
    sessionId: question.sessionId,
    questionType: question.questionType,
    dimension: question.dimension,
    questionContent: question.questionContent,
    maxScore: question.maxScore,
    orderIndex: question.orderIndex,
    createdAt: question.createdAt,
  };
}

export function toAssessmentAnswerDto(answer: AssessmentAnswerRecord): AssessmentAnswer {
  return {
    id: answer.id,
    sessionId: answer.sessionId,
    questionId: answer.questionId,
    answerContent: answer.answerContent,
    deterministicResult: answer.deterministicResult,
    answeredAt: answer.answeredAt,
    createdAt: answer.createdAt,
    updatedAt: answer.updatedAt,
  };
}

export function toAssessmentResultDto(result: AssessmentResultRecord): AssessmentResult {
  return {
    id: result.id,
    sessionId: result.sessionId,
    principlesScore: result.principlesScore,
    practiceScore: result.practiceScore,
    troubleshootingScore: result.troubleshootingScore,
    communicationScore: result.communicationScore,
    totalScore: result.totalScore,
    verdict: result.verdict,
    confidence: result.confidence,
    criticalFailures: result.criticalFailures,
    weaknesses: result.weaknesses,
    feedback: result.feedback,
    createdAt: result.createdAt,
  };
}

export function toAssessmentRegradeDto(grade: GradeResult): AssessmentRegradeResponse {
  return {
    result: toAssessmentResultDto(grade.result),
    knowledgePointUpdated: grade.knowledgePointUpdated,
    retestEventCreated: grade.retestEventCreated,
    reviewEventCreated: grade.reviewEventCreated,
  };
}

export function toAssessmentGradeDto(grade: GradeResult): AssessmentGradeResponse {
  return { session: toAssessmentSessionDto(grade.session), ...toAssessmentRegradeDto(grade) };
}
