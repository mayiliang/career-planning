/**
 * 评分服务
 * 
 * Phase 5 实现：确定性评分 + AI 评分 + 服务端重算
 */
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { db, rawDb } from '../db/index.js';
import {
  assessmentSessions,
  assessmentQuestions,
  assessmentAnswers,
  assessmentResults,
  knowledgePoints,
  masteryEvents,
} from '../db/schema.js';
import type {
  AssessmentSessionRecord,
  AssessmentResultRecord,
  NewAssessmentResult,
  NewMasteryEvent,
} from '../db/schema.js';
import { createProvider } from '../ai/index.js';
import {
  calculateVerdict,
  type DimensionScores,
} from '@career-atlas/shared';

type QuestionReview = {
  questionId: string;
  score: number;
  maxScore: number;
  correctParts: string[];
  incorrectParts: string[];
  missingParts: string[];
  referenceAnswer: string;
  sourceBasis: string[];
  nextAction: string;
};

type GradingFeedback = {
  summary: string;
  whatWasStrong: string[];
  whatMustImprove: string[];
  suggestedRetestFocus: string[];
  questionReviews: QuestionReview[];
};

type QuestionForReview = {
  id: string;
  dimension: string;
  maxScore: number;
  questionContent: string;
};

// ===== 评分请求 =====

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

// ===== 执行评分 =====

export async function gradeAssessment(request: GradeRequest): Promise<GradeResult> {
  // 获取会话和答案
  const session = await db.query.assessmentSessions.findFirst({
    where: eq(assessmentSessions.id, request.sessionId),
  });
  
  if (!session) {
    throw new Error(`Session not found: ${request.sessionId}`);
  }
  
  if (!['SUBMITTED', 'ERROR'].includes(session.status)) {
    throw new Error(`Cannot grade session with status: ${session.status}`);
  }
  
  // 检查是否已有结果
  const existingResult = await db.query.assessmentResults.findFirst({
    where: eq(assessmentResults.sessionId, request.sessionId),
  });
  
  if (existingResult) {
    // 幂等：返回已有结果
    const knowledgePoint = await db.query.knowledgePoints.findFirst({
      where: eq(knowledgePoints.code, session.knowledgePointCode),
    });
    
    return {
      session,
      result: existingResult,
      knowledgePointUpdated: knowledgePoint?.status !== 'SELF_MASTERED',
      retestEventCreated: false,
      reviewEventCreated: false,
    };
  }
  
  // 更新状态为 GRADING
  await db
    .update(assessmentSessions)
    .set({ status: 'GRADING', updatedAt: new Date().toISOString() })
    .where(eq(assessmentSessions.id, request.sessionId));
  
  try {
    // 获取题目和答案
    const questions = await db.query.assessmentQuestions.findMany({
      where: eq(assessmentQuestions.sessionId, request.sessionId),
    });
    
    const answers = await db.query.assessmentAnswers.findMany({
      where: eq(assessmentAnswers.sessionId, request.sessionId),
    });
    
    // 获取知识点信息
    const knowledgePoint = await db.query.knowledgePoints.findFirst({
      where: eq(knowledgePoints.code, session.knowledgePointCode),
    });
    
    if (!knowledgePoint) {
      throw new Error(`Knowledge point not found: ${session.knowledgePointCode}`);
    }
    
    // 创建 AI Provider
    const provider = request.provider ?? (process.env.NODE_ENV === 'test' ? 'fake' : 'deepseek');
    const aiProvider = createProvider(provider);
    
    // 构建 AI 评分请求
    const gradingRequest = {
      knowledgePointCode: session.knowledgePointCode,
      knowledgePointTitle: knowledgePoint.title,
      assessmentType: session.assessmentType,
      questions: questions.map(q => ({
        id: q.id,
        type: q.questionType,
        dimension: q.dimension,
        maxScore: q.maxScore,
        content: q.questionContent,
      })),
      answers: answers.map(a => ({
        questionId: a.questionId,
        content: a.answerContent,
      })),
      deterministicResults: answers
        .filter(a => a.deterministicResult)
        .map(a => {
          const parsed = JSON.parse(a.deterministicResult!);
          return {
            questionId: a.questionId,
            passed: parsed.passed,
            output: parsed.output,
            error: parsed.error,
          };
        }),
      rubric: knowledgePoint.assessmentSpecMd,
      passCriteria: knowledgePoint.passCriteriaMd,
      studyMaterial: knowledgePoint.studyMaterialMd,
    };
    
    // 调用 AI 评分
    const aiResponse = await aiProvider.grade(gradingRequest);
    
    // 解析或处理 AI 响应
    let dimensionScores: DimensionScores;
    let confidence: number;
    let criticalFailures: Array<{ code: string; evidence: string; reason: string }> = [];
    let weaknesses: Array<{ topic: string; severity: string; evidence: string; nextAction: string }> = [];
    let feedback: GradingFeedback;
    
    if (aiResponse.parseSuccess && aiResponse.parsedOutput) {
      const output = aiResponse.parsedOutput;
      dimensionScores = output.dimensionScores;
      confidence = output.confidence;
      criticalFailures = output.criticalFailures;
      weaknesses = output.weaknesses;
      const normalized = normalizeFeedbackAndDimensionScores(output.feedback, dimensionScores, questions);
      feedback = normalized.feedback;
      dimensionScores = normalized.dimensionScores;
    } else {
      // AI 响应无效，使用默认值并标记为人工复核
      dimensionScores = {
        principlesAndBoundaries: 0,
        practice: 0,
        troubleshootingAndDesign: 0,
        projectCommunication: 0,
      };
      confidence = 0;
      feedback = {
        summary: `DeepSeek 已响应，但评分结构校验失败，需要重新判题或人工复核。${aiResponse.parseError ? ` ${aiResponse.parseError}` : ''}`,
        whatWasStrong: [],
        whatMustImprove: [],
        suggestedRetestFocus: [],
        questionReviews: questions.map((question) => ({
          questionId: question.id,
          score: 0,
          maxScore: question.maxScore,
          correctParts: [],
          incorrectParts: ['DeepSeek 评分结构校验失败，无法可靠判断该题。'],
          missingParts: [],
          referenceAnswer: referenceAnswerFromQuestion(question.questionContent),
          sourceBasis: sourceBasisFromQuestion(question.questionContent),
          nextAction: '重新调用 DeepSeek 判题；若仍失败，按题目参考依据人工复核。',
        })),
      };
    }
    
    // 检查确定性测试是否全部通过
    const deterministicTestsPassed = answers
      .filter(a => a.deterministicResult)
      .every(a => {
        try {
          const result = JSON.parse(a.deterministicResult!);
          return result.passed === true;
        } catch {
          return false;
        }
      });
    
    // 服务端重算判定结果
    const serverCalculatedVerdict = calculateVerdict(
      dimensionScores,
      confidence,
      criticalFailures.length > 0,
      deterministicTestsPassed
    );
    
    // 计算总分
    const totalScore =
      dimensionScores.principlesAndBoundaries +
      dimensionScores.practice +
      dimensionScores.troubleshootingAndDesign +
      dimensionScores.projectCommunication;
    
    // 保存评分结果
    const now = new Date().toISOString();
    const result: NewAssessmentResult = {
      id: randomUUID(),
      sessionId: request.sessionId,
      principlesScore: dimensionScores.principlesAndBoundaries,
      practiceScore: dimensionScores.practice,
      troubleshootingScore: dimensionScores.troubleshootingAndDesign,
      communicationScore: dimensionScores.projectCommunication,
      totalScore,
      verdict: serverCalculatedVerdict,
      confidence: confidence.toString(),
      criticalFailures: criticalFailures.length > 0 ? JSON.stringify(criticalFailures) : null,
      weaknesses: weaknesses.length > 0 ? JSON.stringify(weaknesses) : null,
      feedback: JSON.stringify(feedback),
      aiRawResponse: aiResponse.rawContent,
      aiUsagePromptTokens: aiResponse.usage.promptTokens,
      aiUsageCompletionTokens: aiResponse.usage.completionTokens,
      serverCalculatedTotal: totalScore,
      serverCalculatedVerdict,
      createdAt: now,
    };
    
    const [createdResult] = await db.insert(assessmentResults).values(result).returning();
    const savedResult = requireRecord(createdResult, '保存评分结果');
    
    // 更新会话状态
    const [updatedSession] = await db
      .update(assessmentSessions)
      .set({
        status: 'GRADED',
        resultId: savedResult.id,
        gradedAt: now,
        updatedAt: now,
      })
      .where(eq(assessmentSessions.id, request.sessionId))
      .returning();
    
    // 更新知识点状态（如果通过）
    let knowledgePointUpdated = false;
    let retestEventCreated = false;
    let reviewEventCreated = false;
    
    if (serverCalculatedVerdict === 'PASS') {
      knowledgePointUpdated = await updateKnowledgePointStatus(
        session.knowledgePointCode,
        session.assessmentType,
        request.sessionId,
        session.masteryStage,
        session.assistanceLevel
      );
      // M4 只是 7 天后解锁的可选稳定性挑战，不再自动塞入日历制造“逾期”。
    } else if (serverCalculatedVerdict === 'FAIL') {
      // 失败，回退到 LEARNING 状态
      await handleAssessmentFailure(
        session.knowledgePointCode,
        session.assessmentType,
        request.sessionId
      );
    }
    
    return {
      session: requireRecord(updatedSession, '更新考核会话'),
      result: savedResult,
      knowledgePointUpdated,
      retestEventCreated,
      reviewEventCreated,
    };
  } catch (error) {
    // 评分失败，更新状态为 ERROR
    await db
      .update(assessmentSessions)
      .set({
        status: 'ERROR',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(assessmentSessions.id, request.sessionId));
    
    throw error;
  }
}

/**
 * 对已经进入人工复核或错误状态的会话重新调用评分器。
 * 原始答卷保持不变，只替换当前会话的机器评分结果。
 */
export async function regradeAssessment(sessionId: string): Promise<GradeResult> {
  const session = await db.query.assessmentSessions.findFirst({
    where: eq(assessmentSessions.id, sessionId),
  });

  if (!session || !['GRADED', 'ERROR'].includes(session.status)) {
    throw new Error('只有判题完成或判题错误的考核才能重新判题');
  }

  rawDb.transaction(() => {
    db.delete(assessmentResults)
      .where(eq(assessmentResults.sessionId, sessionId))
      .run();
    db.update(assessmentSessions)
      .set({
        status: 'SUBMITTED',
        resultId: null,
        gradedAt: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(assessmentSessions.id, sessionId))
      .run();
  })();

  return gradeAssessment({ sessionId, provider: 'deepseek' });
}

// ===== 更新知识点状态 =====

async function updateKnowledgePointStatus(
  knowledgePointCode: string,
  assessmentType: string,
  sessionId: string,
  masteryStage: number,
  assistanceLevel: number
): Promise<boolean> {
  const knowledgePoint = await db.query.knowledgePoints.findFirst({
    where: eq(knowledgePoints.code, knowledgePointCode),
  });
  
  if (!knowledgePoint) {
    return false;
  }
  
  const now = new Date().toISOString();
  // 解释题/轻提示不惩罚；拆解、提纲、开头或完整答案意味着本次最高认证 M2。
  const certifiedStage = assistanceLevel >= 3 ? Math.min(masteryStage, 2) : masteryStage;
  const newLevel = Math.max(knowledgePoint.masteryLevel, certifiedStage);
  const newStatus: typeof knowledgePoints.$inferSelect.status = newLevel >= 3
    ? 'MASTERED'
    : 'FIRST_PASS_PENDING_RETEST';
  const action: NewMasteryEvent['action'] = certifiedStage >= 4
    ? 'reviewPass'
    : certifiedStage >= 3 ? 'retestPass' : 'firstPass';
  
  // 更新知识点状态
  await db
    .update(knowledgePoints)
    .set({
      status: newStatus,
      learningState: 'LEARNED',
      masteryLevel: newLevel,
      firstPassedAt: knowledgePoint.firstPassedAt ?? now,
      masteredAt: newLevel >= 3 ? (knowledgePoint.masteredAt ?? now) : knowledgePoint.masteredAt,
      nextReviewAt: newLevel >= 3 && newLevel < 4 ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null,
      updatedAt: now,
    })
    .where(eq(knowledgePoints.code, knowledgePointCode));
  
  // 追加审计事件
  const event: NewMasteryEvent = {
    id: randomUUID(),
    knowledgePointCode,
    action,
    fromStatus: knowledgePoint.status,
    toStatus: newStatus,
    assessmentSessionId: sessionId,
    evidenceSummary: `掌握挑战 M${masteryStage} 通过；帮助等级 ${assistanceLevel}；认证为 M${certifiedStage}`,
    createdAt: now,
  };
  
  await db.insert(masteryEvents).values(event);
  
  return true;
}

// ===== 处理考核失败 =====

async function handleAssessmentFailure(
  knowledgePointCode: string,
  assessmentType: string,
  sessionId: string
): Promise<void> {
  const knowledgePoint = await db.query.knowledgePoints.findFirst({
    where: eq(knowledgePoints.code, knowledgePointCode),
  });
  
  if (!knowledgePoint) {
    return;
  }
  
  const now = new Date().toISOString();
  const newStatus: typeof knowledgePoints.$inferSelect.status = knowledgePoint.status;
  let action: NewMasteryEvent['action'];
  
  if (assessmentType === 'FIRST') {
    action = 'firstFail';
  } else if (assessmentType === 'RETEST') {
    action = 'retestFail';
  } else {
    action = 'reviewFail';
  }
  
  // 掌握挑战完全可选：失败只形成诊断证据，不撤销“已学完”，也不降低既有掌握等级。
  await db
    .update(knowledgePoints)
    .set({
      updatedAt: now,
    })
    .where(eq(knowledgePoints.code, knowledgePointCode));
  
  // 追加审计事件
  const event: NewMasteryEvent = {
    id: randomUUID(),
    knowledgePointCode,
    action,
    fromStatus: knowledgePoint.status,
    toStatus: newStatus,
    assessmentSessionId: sessionId,
    createdAt: now,
  };
  
  await db.insert(masteryEvents).values(event);
}

export function normalizeFeedbackAndDimensionScores(
  feedback: GradingFeedback,
  fallbackDimensionScores: DimensionScores,
  questions: QuestionForReview[]
): { feedback: GradingFeedback; dimensionScores: DimensionScores } {
  const usedReviewIndexes = new Set<number>();

  const normalizedReviews = questions.map((question, index) => {
    const reviewIndex = findReviewIndexForQuestion(feedback.questionReviews, question.id, index, usedReviewIndexes);
    if (reviewIndex >= 0) {
      usedReviewIndexes.add(reviewIndex);
      return normalizeQuestionReview(feedback.questionReviews[reviewIndex]!, question);
    }

    return {
      questionId: question.id,
      score: 0,
      maxScore: question.maxScore,
      correctParts: [],
      incorrectParts: ['DeepSeek 未返回可匹配到本题的逐题评审。'],
      missingParts: [],
      referenceAnswer: referenceAnswerFromQuestion(question.questionContent),
      sourceBasis: sourceBasisFromQuestion(question.questionContent),
      nextAction: '重新调用 DeepSeek 判题；若仍无法匹配，按本题资料依据人工复核。',
    };
  });

  const canUseQuestionScores = normalizedReviews.length === questions.length
    && normalizedReviews.every(review => Number.isFinite(review.score) && Number.isFinite(review.maxScore));

  return {
    feedback: {
      ...feedback,
      questionReviews: normalizedReviews,
    },
    dimensionScores: canUseQuestionScores
      ? buildDimensionScoresFromReviews(normalizedReviews, questions)
      : fallbackDimensionScores,
  };
}

function findReviewIndexForQuestion(
  reviews: QuestionReview[],
  questionId: string,
  questionIndex: number,
  usedIndexes: Set<number>
): number {
  const exact = reviews.findIndex((review, index) => !usedIndexes.has(index) && review.questionId === questionId);
  if (exact >= 0) return exact;

  const ordinalAliases = new Set([
    String(questionIndex + 1),
    `q${questionIndex + 1}`,
    `Q${questionIndex + 1}`,
    `question-${questionIndex + 1}`,
    `Question-${questionIndex + 1}`,
  ]);
  const ordinal = reviews.findIndex((review, index) => !usedIndexes.has(index) && ordinalAliases.has(review.questionId));
  if (ordinal >= 0) return ordinal;

  return !usedIndexes.has(questionIndex) && reviews[questionIndex] ? questionIndex : -1;
}

function normalizeQuestionReview(review: QuestionReview, question: QuestionForReview): QuestionReview {
  const sourceMaxScore = Number.isFinite(review.maxScore) && review.maxScore > 0 ? review.maxScore : question.maxScore;
  const scaledScore = sourceMaxScore > 0 ? (review.score / sourceMaxScore) * question.maxScore : 0;

  return {
    questionId: question.id,
    score: clampScore(Math.round(scaledScore), question.maxScore),
    maxScore: question.maxScore,
    correctParts: Array.isArray(review.correctParts) ? review.correctParts : [],
    incorrectParts: Array.isArray(review.incorrectParts) ? review.incorrectParts : [],
    missingParts: Array.isArray(review.missingParts) ? review.missingParts : [],
    referenceAnswer: review.referenceAnswer?.trim() || referenceAnswerFromQuestion(question.questionContent),
    sourceBasis: Array.isArray(review.sourceBasis) && review.sourceBasis.length > 0
      ? review.sourceBasis
      : sourceBasisFromQuestion(question.questionContent),
    nextAction: review.nextAction?.trim() || '按本题资料依据复盘答案。',
  };
}

function buildDimensionScoresFromReviews(reviews: QuestionReview[], questions: QuestionForReview[]): DimensionScores {
  const scores: DimensionScores = {
    principlesAndBoundaries: 0,
    practice: 0,
    troubleshootingAndDesign: 0,
    projectCommunication: 0,
  };

  questions.forEach((question) => {
    const review = reviews.find(item => item.questionId === question.id);
    if (!review) return;

    if (question.dimension === 'principlesAndBoundaries') {
      scores.principlesAndBoundaries += review.score;
    } else if (question.dimension === 'practice') {
      scores.practice += review.score;
    } else if (question.dimension === 'troubleshootingAndDesign') {
      scores.troubleshootingAndDesign += review.score;
    } else if (question.dimension === 'projectCommunication') {
      scores.projectCommunication += review.score;
    }
  });

  return {
    principlesAndBoundaries: clampScore(scores.principlesAndBoundaries, 25),
    practice: clampScore(scores.practice, 35),
    troubleshootingAndDesign: clampScore(scores.troubleshootingAndDesign, 25),
    projectCommunication: clampScore(scores.projectCommunication, 15),
  };
}

function clampScore(score: number, maxScore: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(maxScore, score));
}

function referenceAnswerFromQuestion(questionContent: string): string {
  try {
    const parsed = JSON.parse(questionContent) as { referenceAnswer?: string };
    return parsed.referenceAnswer ?? '请按题目要求和学习资料整理参考答案。';
  } catch {
    return '请按题目要求和学习资料整理参考答案。';
  }
}

function sourceBasisFromQuestion(questionContent: string): string[] {
  try {
    const parsed = JSON.parse(questionContent) as { sourceBasis?: unknown };
    return Array.isArray(parsed.sourceBasis)
      ? parsed.sourceBasis.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

function requireRecord<T>(record: T | undefined, action: string): T {
  if (!record) {
    throw new Error(`${action}失败：数据库未返回记录`);
  }
  return record;
}
