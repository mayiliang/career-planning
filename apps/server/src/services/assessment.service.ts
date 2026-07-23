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
  
  // 生成题目：考核必须可由学习资料直接回答，或由学习资料中的机制举一反三推导。
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
  const studySource = compactMarkdown(knowledgePoint.studyMaterialMd, 1600);
  const assessmentFocus = compactMarkdown(knowledgePoint.assessmentSpecMd, 900);
  const passCriteria = compactMarkdown(knowledgePoint.passCriteriaMd, 900);
  const practiceBasis = request.type === 'FIRST' ? passCriteria : (assessmentFocus || passCriteria);
  const transferLevel = request.type === 'FIRST'
    ? '只允许一跳推导：题目必须能从学习资料、考核要求或通过标准直接定位答案，不要求真实项目经历。'
    : request.type === 'RETEST'
      ? '允许二跳迁移：可以换一个小场景验证同一机制，但必须保留资料中的核心概念和边界。'
      : '允许综合迁移：可以结合项目场景，但仍必须能追溯到学习资料中的机制、边界或标准。';

  const questionTemplates = [
    {
      questionType: 'ESSAY',
      dimension: 'principlesAndBoundaries',
      maxScore: 10,
      content: JSON.stringify({
        level: '资料定位',
        question: `从学习资料中定位 ${context} 的 3 个关键概念或规则，并分别用一句话说明它们解决什么问题。`,
        sourceHint: '只需要依据学习资料回答，不需要项目经验。',
        sourceBasis: [studySource],
        referenceAnswer: `答案应覆盖学习资料中与 ${context} 直接相关的关键概念、定义或规则；每个概念都要说明用途，而不是只抄标题。`,
        wordLimit: 360,
      }),
    },
    {
      questionType: 'ESSAY',
      dimension: 'principlesAndBoundaries',
      maxScore: 15,
      content: JSON.stringify({
        level: '概念解释',
        question: `不用背诵原文，用自己的话解释 ${context} 的核心机制、适用边界和一个容易误解的点。`,
        sourceHint: '答案必须能回到学习资料中的机制或通过标准。',
        sourceBasis: [studySource, passCriteria],
        referenceAnswer: `答案应说明：核心机制是什么、它在什么条件下成立、边界或误区是什么，并至少包含一个可从资料推导出的例子。`,
        wordLimit: 520,
      }),
    },
    {
      questionType: 'ESSAY',
      dimension: 'practice',
      maxScore: 35,
      content: JSON.stringify({
        level: '小例子推导',
        question: `选择学习资料中的一个核心机制，写一个最小例子或伪代码来证明你理解 ${context}。说明输入、关键步骤、预期输出，以及为什么这个例子能验证该知识点。`,
        sourceHint: request.type === 'FIRST'
          ? '例子规模要小，只验证资料里的一个核心机制，不要求完整业务系统或真实项目经历。'
          : '例子可以做小范围迁移，但必须明确对应学习资料中的机制。',
        sourceBasis: [studySource, practiceBasis],
        referenceAnswer: request.type === 'FIRST'
          ? `答案应包含一个聚焦 ${context} 的最小例子或伪代码，解释输入、关键步骤、预期结果和验证理由；只需要证明学习资料中的一个核心机制，并满足通过标准中的可验证点：${passCriteria}`
          : `答案应包含一个聚焦 ${context} 的最小例子或伪代码，解释关键步骤与预期结果，并能对应到考核要求：${practiceBasis}`,
        outputType: 'reasoned-example',
      }),
    },
    {
      questionType: 'ESSAY',
      dimension: 'troubleshootingAndDesign',
      maxScore: 25,
      content: JSON.stringify({
        level: request.type === 'FIRST' ? '受限排错' : '迁移排错',
        question: `基于上一题的最小例子，先写出“预期结果”和一个“实际异常结果”，再列出 3 个最可能原因、验证方式和修复方向。\n\n迁移范围：${transferLevel}`,
        sourceHint: '只排查这个最小例子，不需要设计完整线上事故流程；原因必须来自学习资料覆盖的机制、边界或误区。',
        sourceBasis: [studySource, passCriteria],
        referenceAnswer: `答案应先给出与上一题一致的预期结果和一个可解释的异常结果，再从 ${context} 的机制、边界、误区中推导 3 个可能原因；每个原因都要有验证方式和修复方向，不能泛泛写“看日志/加监控”。`,
        wordLimit: request.type === 'FIRST' ? 520 : 700,
      }),
    },
    {
      questionType: 'ESSAY',
      dimension: 'projectCommunication',
      maxScore: 15,
      content: JSON.stringify({
        level: '学习复述',
        question: `用 3 分钟讲给同事听的方式，总结 ${context}：它是什么、什么时候用、怎么验证自己没有用错。`,
        sourceHint: '这是学习复述题，不要求真实项目履历；表达必须基于学习资料和通过标准。',
        sourceBasis: [studySource, passCriteria],
        referenceAnswer: `答案应结构化覆盖：定义/机制、使用条件、验证方法、常见误区或边界，并能被学习资料或通过标准支持。`,
        wordLimit: 420,
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

function compactMarkdown(value: string, maxLength: number): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1（$2）')
    .trim()
    .slice(0, maxLength);
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
