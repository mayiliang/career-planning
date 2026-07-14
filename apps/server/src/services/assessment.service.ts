/**
 * 考核会话服务
 * 
 * Phase 5 实现：考核会话的创建、开始、保存答案、提交
 */
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { db } from '../db/index.js';
import {
  assessmentSessions,
  assessmentQuestions,
  assessmentAnswers,
  knowledgePoints,
} from '../db/schema.js';
import type {
  AssessmentSessionRecord,
  AssessmentQuestionRecord,
  AssessmentAnswerRecord,
  NewAssessmentSession,
  NewAssessmentQuestion,
  NewAssessmentAnswer,
} from '../db/schema.js';
import type { CreateAssessmentRequest } from '@career-atlas/shared';

// ===== 创建考核会话 =====

export async function createAssessmentSession(
  request: CreateAssessmentRequest,
  provider: string = 'deepseek',
  model: string = 'deepseek-v4-pro'
): Promise<AssessmentSessionRecord> {
  const now = new Date().toISOString();
  
  // 验证知识点存在且状态允许考核
  const knowledgePoint = await db.query.knowledgePoints.findFirst({
    where: eq(knowledgePoints.code, request.knowledgePointCode),
  });
  
  if (!knowledgePoint) {
    throw new Error(`Knowledge point not found: ${request.knowledgePointCode}`);
  }
  
  // 验证状态转换
  if (request.type === 'FIRST' && knowledgePoint.status !== 'SELF_MASTERED') {
    throw new Error(`First assessment requires SELF_MASTERED status, current: ${knowledgePoint.status}`);
  }
  
  if (request.type === 'RETEST' && knowledgePoint.status !== 'FIRST_PASS_PENDING_RETEST') {
    throw new Error(`Retest requires FIRST_PASS_PENDING_RETEST status, current: ${knowledgePoint.status}`);
  }
  
  if (request.type === 'MONTHLY_REVIEW' && knowledgePoint.status !== 'MASTERED') {
    throw new Error(`Monthly review requires MASTERED status, current: ${knowledgePoint.status}`);
  }
  
  // 检查是否有未完成的考核会话
  const existingSession = await db.query.assessmentSessions.findFirst({
    where: and(
      eq(assessmentSessions.knowledgePointCode, request.knowledgePointCode),
      eq(assessmentSessions.assessmentType, request.type)
    ),
  });
  
  // 如果已有完成的会话，检查是否可以创建新的
  if (existingSession && ['DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'GRADING'].includes(existingSession.status)) {
    throw new Error(`Existing session in progress: ${existingSession.id}`);
  }
  
  // 创建会话
  const session: NewAssessmentSession = {
    id: randomUUID(),
    knowledgePointCode: request.knowledgePointCode,
    assessmentType: request.type,
    status: 'DRAFT',
    durationMinutes: request.durationMinutes,
    provider,
    model,
    promptVersion: '1.0',
    createdAt: now,
    updatedAt: now,
  };
  
  const [created] = await db.insert(assessmentSessions).values(session).returning();
  const createdSession = requireRecord(created, '创建考核会话');
  
  // 生成题目（简化版本，实际应该调用 AI 生成）
  await generateQuestions(createdSession.id, request, knowledgePoint);
  
  return createdSession;
}

// ===== 生成题目 =====

async function generateQuestions(
  sessionId: string,
  request: CreateAssessmentRequest,
  knowledgePoint: typeof knowledgePoints.$inferSelect
): Promise<AssessmentQuestionRecord[]> {
  const now = new Date().toISOString();
  
  const context = `${knowledgePoint.code} ${knowledgePoint.title}`;
  const assessmentFocus = knowledgePoint.assessmentSpecMd.slice(0, 1800);
  const passCriteria = knowledgePoint.passCriteriaMd.slice(0, 1200);
  const questionTemplates = [
    {
      questionType: 'ESSAY',
      dimension: 'principlesAndBoundaries',
      maxScore: 10,
      content: JSON.stringify({
        question: `请说明 ${context} 的核心机制、适用边界和一个常见误区。`,
        wordLimit: 600,
      }),
    },
    {
      questionType: 'ESSAY',
      dimension: 'principlesAndBoundaries',
      maxScore: 15,
      content: JSON.stringify({
        question: `针对 ${context}，比较两种可行方案并给出选型依据。必须覆盖性能、维护性与失败场景。`,
        wordLimit: 700,
      }),
    },
    {
      questionType: 'OUTPUT',
      dimension: 'practice',
      maxScore: 35,
      content: JSON.stringify({
        question: `完成一个可运行或可审阅的 ${context} 实践产出（${request.type}）。\n\n考核要求：\n${assessmentFocus}\n\n通过标准：\n${passCriteria}`,
        outputType: 'code',
      }),
    },
    {
      questionType: 'ESSAY',
      dimension: 'troubleshootingAndDesign',
      maxScore: 25,
      content: JSON.stringify({
        question: `假设线上与 ${context} 相关的功能出现间歇性故障。请给出从复现、观测、定位到修复验证的完整排障方案，并说明如何防止复发。`,
        wordLimit: 900,
      }),
    },
    {
      questionType: 'ESSAY',
      dimension: 'projectCommunication',
      maxScore: 15,
      content: JSON.stringify({
        question: `以面试陈述的方式说明你如何在真实项目中应用 ${context}：背景、约束、你的决策、量化结果及复盘。若没有真实经历，请给出可验证的项目方案。`,
        wordLimit: 600,
      }),
    },
  ];
  
  const questions: NewAssessmentQuestion[] = questionTemplates.map((q, index) => ({
    id: randomUUID(),
    sessionId,
    questionType: q.questionType as 'CHOICE' | 'OUTPUT' | 'ESSAY' | 'CODE_READ' | 'CODE_WRITE',
    dimension: q.dimension as 'principlesAndBoundaries' | 'practice' | 'troubleshootingAndDesign' | 'projectCommunication',
    questionContent: q.content,
    maxScore: q.maxScore,
    orderIndex: index,
    createdAt: now,
  }));
  
  return db.insert(assessmentQuestions).values(questions).returning();
}

// ===== 开始考核 =====

export async function startAssessmentSession(sessionId: string): Promise<AssessmentSessionRecord> {
  const now = new Date().toISOString();
  
  const session = await db.query.assessmentSessions.findFirst({
    where: eq(assessmentSessions.id, sessionId),
  });
  
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  
  if (session.status !== 'DRAFT') {
    throw new Error(`Cannot start session with status: ${session.status}`);
  }
  
  const [updated] = await db
    .update(assessmentSessions)
    .set({
      status: 'IN_PROGRESS',
      startedAt: now,
      updatedAt: now,
    })
    .where(eq(assessmentSessions.id, sessionId))
    .returning();
  
  return requireRecord(updated, '开始考核');
}

// ===== 获取考核会话详情 =====

export async function getAssessmentSession(sessionId: string): Promise<{
  session: AssessmentSessionRecord;
  questions: AssessmentQuestionRecord[];
  answers: AssessmentAnswerRecord[];
}> {
  const session = await db.query.assessmentSessions.findFirst({
    where: eq(assessmentSessions.id, sessionId),
  });
  
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  
  const questions = await db.query.assessmentQuestions.findMany({
    where: eq(assessmentQuestions.sessionId, sessionId),
    orderBy: (q, { asc }) => [asc(q.orderIndex)],
  });
  
  const answers = await db.query.assessmentAnswers.findMany({
    where: eq(assessmentAnswers.sessionId, sessionId),
  });
  
  return { session, questions, answers };
}

// ===== 保存答案 =====

export async function saveAnswer(
  sessionId: string,
  questionId: string,
  answerContent: string,
  deterministicResult?: string
): Promise<AssessmentAnswerRecord> {
  const now = new Date().toISOString();
  
  // 验证会话存在且状态正确
  const session = await db.query.assessmentSessions.findFirst({
    where: eq(assessmentSessions.id, sessionId),
  });
  
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  
  if (!['DRAFT', 'IN_PROGRESS'].includes(session.status)) {
    throw new Error(`Cannot save answer to session with status: ${session.status}`);
  }
  
  // 验证题目存在
  const question = await db.query.assessmentQuestions.findFirst({
    where: and(
      eq(assessmentQuestions.sessionId, sessionId),
      eq(assessmentQuestions.id, questionId)
    ),
  });
  
  if (!question) {
    throw new Error(`Question not found: ${questionId}`);
  }
  
  // 查找现有答案
  const existingAnswer = await db.query.assessmentAnswers.findFirst({
    where: and(
      eq(assessmentAnswers.sessionId, sessionId),
      eq(assessmentAnswers.questionId, questionId)
    ),
  });
  
  if (existingAnswer) {
    // 更新答案
    const [updated] = await db
      .update(assessmentAnswers)
      .set({
        answerContent,
        deterministicResult,
        answeredAt: now,
        updatedAt: now,
      })
      .where(eq(assessmentAnswers.id, existingAnswer.id))
      .returning();
    
    return requireRecord(updated, '更新答案');
  }
  
  // 创建新答案
  const answer: NewAssessmentAnswer = {
    id: randomUUID(),
    sessionId,
    questionId,
    answerContent,
    deterministicResult,
    answeredAt: now,
    createdAt: now,
    updatedAt: now,
  };
  
  const [created] = await db.insert(assessmentAnswers).values(answer).returning();
  return requireRecord(created, '创建答案');
}

// ===== 提交考核 =====

export async function submitAssessmentSession(sessionId: string): Promise<AssessmentSessionRecord> {
  const now = new Date().toISOString();
  
  const { session, questions, answers } = await getAssessmentSession(sessionId);
  
  if (session.status !== 'IN_PROGRESS') {
    throw new Error(`Cannot submit session with status: ${session.status}`);
  }
  
  const answeredQuestionIds = new Set(answers.map((answer) => answer.questionId));
  const unansweredCount = questions.filter((question) => !answeredQuestionIds.has(question.id)).length;
  if (unansweredCount > 0) {
    throw new Error(`还有 ${unansweredCount} 道题未作答`);
  }
  
  const [updated] = await db
    .update(assessmentSessions)
    .set({
      status: 'SUBMITTED',
      submittedAt: now,
      updatedAt: now,
    })
    .where(eq(assessmentSessions.id, sessionId))
    .returning();
  
  return requireRecord(updated, '提交考核');
}

// ===== 取消考核 =====

export async function cancelAssessmentSession(sessionId: string): Promise<AssessmentSessionRecord> {
  const now = new Date().toISOString();
  
  const session = await db.query.assessmentSessions.findFirst({
    where: eq(assessmentSessions.id, sessionId),
  });
  
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  
  if (!['DRAFT', 'IN_PROGRESS'].includes(session.status)) {
    throw new Error(`Cannot cancel session with status: ${session.status}`);
  }
  
  const [updated] = await db
    .update(assessmentSessions)
    .set({
      status: 'CANCELLED',
      updatedAt: now,
    })
    .where(eq(assessmentSessions.id, sessionId))
    .returning();
  
  return requireRecord(updated, '取消考核');
}

function requireRecord<T>(record: T | undefined, action: string): T {
  if (!record) {
    throw new Error(`${action}失败：数据库未返回记录`);
  }
  return record;
}
