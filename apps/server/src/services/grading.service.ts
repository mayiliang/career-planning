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
  planEvents,
} from '../db/schema.js';
import type {
  AssessmentSessionRecord,
  AssessmentResultRecord,
  NewAssessmentResult,
  NewMasteryEvent,
  NewPlanEvent,
} from '../db/schema.js';
import { createProvider } from '../ai/index.js';
import {
  calculateVerdict,
  type DimensionScores,
} from '@career-atlas/shared';

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
    };
    
    // 调用 AI 评分
    const aiResponse = await aiProvider.grade(gradingRequest);
    
    // 解析或处理 AI 响应
    let dimensionScores: DimensionScores;
    let confidence: number;
    let criticalFailures: Array<{ code: string; evidence: string; reason: string }> = [];
    let weaknesses: Array<{ topic: string; severity: string; evidence: string; nextAction: string }> = [];
    let feedback: { summary: string; whatWasStrong: string[]; whatMustImprove: string[]; suggestedRetestFocus: string[] };
    
    if (aiResponse.parseSuccess && aiResponse.parsedOutput) {
      const output = aiResponse.parsedOutput;
      dimensionScores = output.dimensionScores;
      confidence = output.confidence;
      criticalFailures = output.criticalFailures;
      weaknesses = output.weaknesses;
      feedback = output.feedback;
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
        request.sessionId
      );
      
      // 首次通过，创建 7 天后复测事件
      if (session.assessmentType === 'FIRST') {
        retestEventCreated = await createRetestEvent(
          session.knowledgePointCode,
          request.sessionId
        );
      } else if (session.assessmentType === 'RETEST') {
        reviewEventCreated = await createMonthlyReviewEvent(
          session.knowledgePointCode,
          request.sessionId
        );
      }
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
  sessionId: string
): Promise<boolean> {
  const knowledgePoint = await db.query.knowledgePoints.findFirst({
    where: eq(knowledgePoints.code, knowledgePointCode),
  });
  
  if (!knowledgePoint) {
    return false;
  }
  
  const now = new Date().toISOString();
  let newStatus: typeof knowledgePoints.$inferSelect.status;
  let action: NewMasteryEvent['action'];
  
  if (assessmentType === 'FIRST') {
    newStatus = 'FIRST_PASS_PENDING_RETEST';
    action = 'firstPass';
  } else if (assessmentType === 'RETEST') {
    newStatus = 'MASTERED';
    action = 'retestPass';
  } else {
    // MONTHLY_REVIEW 通过，保持 MASTERED
    newStatus = 'MASTERED';
    action = 'reviewPass';
  }
  
  // 验证状态转换
  const { isValidTransition } = await import('@career-atlas/shared');
  if (!isValidTransition(knowledgePoint.status, newStatus)) {
    console.error(`Invalid state transition: ${knowledgePoint.status} -> ${newStatus}`);
    return false;
  }
  
  // 更新知识点状态
  await db
    .update(knowledgePoints)
    .set({
      status: newStatus,
      firstPassedAt: assessmentType === 'FIRST' ? now : knowledgePoint.firstPassedAt,
      masteredAt: assessmentType === 'RETEST' ? now : knowledgePoint.masteredAt,
      nextReviewAt: assessmentType === 'RETEST' ? calculateNextReviewDate() : knowledgePoint.nextReviewAt,
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
  let newStatus: typeof knowledgePoints.$inferSelect.status;
  let action: NewMasteryEvent['action'];
  
  if (assessmentType === 'FIRST') {
    newStatus = 'LEARNING';
    action = 'firstFail';
  } else if (assessmentType === 'RETEST') {
    newStatus = 'NEEDS_RELEARNING';
    action = 'retestFail';
  } else {
    // MONTHLY_REVIEW 失败
    newStatus = 'NEEDS_RELEARNING';
    action = 'reviewFail';
  }
  
  // 更新知识点状态
  await db
    .update(knowledgePoints)
    .set({
      status: newStatus,
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

// ===== 创建复测事件 =====

async function createRetestEvent(
  knowledgePointCode: string,
  sessionId: string
): Promise<boolean> {
  const now = new Date();
  const retestDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 天后
  
  const point = await db.query.knowledgePoints.findFirst({ where: eq(knowledgePoints.code, knowledgePointCode) });
  const event: NewPlanEvent = {
    id: randomUUID(),
    eventType: 'RETEST',
    title: `复测: ${knowledgePointCode}`,
    description: '首次考核通过，需要进行复测',
    startAt: retestDate.toISOString(),
    endAt: new Date(retestDate.getTime() + 60 * 60 * 1000).toISOString(), // 1 小时
    allDay: false,
    status: 'PLANNED',
    priority: 2,
    knowledgePointId: point?.id ?? null,
    assessmentSessionId: sessionId,
    sourceType: 'SYSTEM',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  
  await db.insert(planEvents).values(event);
  
  return true;
}

/** 复测通过后，把 30 天迁移复习真正放入日历，而不只保存一个不可见时间戳。 */
async function createMonthlyReviewEvent(
  knowledgePointCode: string,
  sessionId: string
): Promise<boolean> {
  const point = await db.query.knowledgePoints.findFirst({ where: eq(knowledgePoints.code, knowledgePointCode) });
  const now = new Date();
  const reviewDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(planEvents).values({
    id: randomUUID(),
    eventType: 'REVIEW',
    title: `月度迁移复习: ${knowledgePointCode}`,
    description: '复测通过 30 天后的迁移题抽测；未通过将重新进入学习状态。',
    startAt: reviewDate.toISOString(),
    endAt: new Date(reviewDate.getTime() + 60 * 60 * 1000).toISOString(),
    allDay: false,
    status: 'PLANNED',
    priority: 3,
    knowledgePointId: point?.id ?? null,
    assessmentSessionId: sessionId,
    sourceType: 'SYSTEM',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
  return true;
}

// ===== 计算下次复习日期 =====

function calculateNextReviewDate(): string {
  // 默认 30 天后进行月度抽测
  const nextReview = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return nextReview.toISOString();
}

function requireRecord<T>(record: T | undefined, action: string): T {
  if (!record) {
    throw new Error(`${action}失败：数据库未返回记录`);
  }
  return record;
}
