/**
 * 考核 API 路由
 * 
 * Phase 5 实现：考核会话的创建、查询、提交、评分接口
 * Phase 7 实现：代码题执行接口
 */
import type { FastifyPluginCallback } from 'fastify';
import { db } from '../../db/index.js';
import { assessmentResults } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import {
  createAssessmentSession,
  startAssessmentSession,
  getAssessmentSession,
  saveAnswer,
  submitAssessmentSession,
  cancelAssessmentSession,
  revealAssessmentHint,
} from '../../services/assessment.service.js';
import { gradeAssessment, regradeAssessment } from '../../services/grading.service.js';
import {
  executeCodeQuestion,
  getExecutorStatusInfo,
} from '../../services/code-execution.service.js';
import { getAIStatus } from '../../ai/index.js';
import {
  CreateAssessmentRequestSchema,
  AssessmentSessionSchema,
} from '@career-atlas/shared';
import { z } from 'zod';

// ===== 执行代码题请求 Schema =====

const ExecuteCodeQuestionRequestSchema = z.object({
  code: z.string().max(100000),
  language: z.enum(['javascript', 'typescript']),
  testCases: z.array(z.object({
    id: z.string(),
    input: z.string().optional(),
    expectedOutput: z.string(),
    isHidden: z.boolean().default(false),
  })).max(50),
  timeLimitMs: z.number().int().min(100).max(30000).optional(),
  memoryLimitMb: z.number().int().min(16).max(512).optional(),
});

// ===== 路由插件 =====

export const assessmentRoutes: FastifyPluginCallback = (app, _options, done) => {
  // ===== POST /api/v1/assessments - 创建考核会话 =====
  app.post('/api/v1/assessments', {
    schema: {
      body: CreateAssessmentRequestSchema,
      response: {
        200: AssessmentSessionSchema,
      },
    },
  }, async (request, reply) => {
    const body = CreateAssessmentRequestSchema.parse(request.body);
    
    try {
      const creation = await createAssessmentSession({
        knowledgePointCode: body.knowledgePointCode,
        type: body.type,
        durationMinutes: body.durationMinutes,
        masteryStage: body.masteryStage,
        challengeMode: body.challengeMode,
        challengeProfile: body.challengeProfile,
      });
      
      const session = creation.session;
      return reply.ok({
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
        resumedExisting: creation.resumedExisting,
        resumeMessage: creation.resumeMessage,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.error('VALIDATION_ERROR', message);
    }
  });
  
  // ===== GET /api/v1/assessments/:id - 获取考核会话详情 =====
  app.get('/api/v1/assessments/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    try {
      const { session, questions, answers } = await getAssessmentSession(id);
      
      return reply.ok({
        session: {
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
        },
        questions: questions.map(q => ({
          id: q.id,
          sessionId: q.sessionId,
          questionType: q.questionType,
          dimension: q.dimension,
          questionContent: q.questionContent,
          maxScore: q.maxScore,
          orderIndex: q.orderIndex,
          createdAt: q.createdAt,
        })),
        answers: answers.map(a => ({
          id: a.id,
          sessionId: a.sessionId,
          questionId: a.questionId,
          answerContent: a.answerContent,
          deterministicResult: a.deterministicResult,
          answeredAt: a.answeredAt,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
        })),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.error('NOT_FOUND', message);
    }
  });
  
  // ===== POST /api/v1/assessments/:id/start - 开始考核 =====
  app.post('/api/v1/assessments/:id/start', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    try {
      const session = await startAssessmentSession(id);
      
      return reply.ok({
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
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.error('STATE_TRANSITION_INVALID', message);
    }
  });
  
  // ===== PUT /api/v1/assessments/:id/answers/:questionId - 保存答案 =====
  app.put('/api/v1/assessments/:id/answers/:questionId', async (request, reply) => {
    const { id, questionId } = request.params as { id: string; questionId: string };
    const body = request.body as { answerContent: string; deterministicResult?: string };
    
    try {
      const answer = await saveAnswer(id, questionId, body.answerContent, body.deterministicResult);
      
      return reply.ok({
        id: answer.id,
        sessionId: answer.sessionId,
        questionId: answer.questionId,
        answerContent: answer.answerContent,
        deterministicResult: answer.deterministicResult,
        answeredAt: answer.answeredAt,
        createdAt: answer.createdAt,
        updatedAt: answer.updatedAt,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.error('VALIDATION_ERROR', message);
    }
  });
  
  // ===== POST /api/v1/assessments/:id/submit - 提交考核 =====
  app.post('/api/v1/assessments/:id/submit', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    try {
      const session = await submitAssessmentSession(id);
      
      return reply.ok({
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
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.error('STATE_TRANSITION_INVALID', message);
    }
  });
  
  // ===== POST /api/v1/assessments/:id/grade - 执行评分 =====
  app.post('/api/v1/assessments/:id/grade', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { provider?: 'deepseek' | 'fake' } | undefined;
    
    try {
      const result = await gradeAssessment({
        sessionId: id,
        provider: body?.provider,
      });
      
      return reply.ok({
        session: {
          id: result.session.id,
          knowledgePointCode: result.session.knowledgePointCode,
          assessmentType: result.session.assessmentType,
          status: result.session.status,
          durationMinutes: result.session.durationMinutes,
          masteryStage: result.session.masteryStage,
          challengeMode: result.session.challengeMode,
          challengeProfile: result.session.challengeProfile,
          assistanceLevel: result.session.assistanceLevel,
          startedAt: result.session.startedAt,
          submittedAt: result.session.submittedAt,
          gradedAt: result.session.gradedAt,
          resultId: result.session.resultId,
          provider: result.session.provider,
          model: result.session.model,
          createdAt: result.session.createdAt,
          updatedAt: result.session.updatedAt,
        },
        result: {
          id: result.result.id,
          sessionId: result.result.sessionId,
          principlesScore: result.result.principlesScore,
          practiceScore: result.result.practiceScore,
          troubleshootingScore: result.result.troubleshootingScore,
          communicationScore: result.result.communicationScore,
          totalScore: result.result.totalScore,
          verdict: result.result.verdict,
          confidence: result.result.confidence,
          criticalFailures: result.result.criticalFailures,
          weaknesses: result.result.weaknesses,
          feedback: result.result.feedback,
          createdAt: result.result.createdAt,
        },
        knowledgePointUpdated: result.knowledgePointUpdated,
        retestEventCreated: result.retestEventCreated,
        reviewEventCreated: result.reviewEventCreated,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const code = message.includes('DEEPSEEK_API_KEY') ? 'AI_NOT_CONFIGURED' : 'AI_GRADING_FAILED';
      return reply.error(code, message, code === 'AI_NOT_CONFIGURED' ? 400 : 502);
    }
  });

  app.post('/api/v1/assessments/:id/regrade', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const result = await regradeAssessment(id);
      return reply.ok({
        result: {
          id: result.result.id,
          sessionId: result.result.sessionId,
          principlesScore: result.result.principlesScore,
          practiceScore: result.result.practiceScore,
          troubleshootingScore: result.result.troubleshootingScore,
          communicationScore: result.result.communicationScore,
          totalScore: result.result.totalScore,
          verdict: result.result.verdict,
          confidence: result.result.confidence,
          criticalFailures: result.result.criticalFailures,
          weaknesses: result.result.weaknesses,
          feedback: result.result.feedback,
          createdAt: result.result.createdAt,
        },
        knowledgePointUpdated: result.knowledgePointUpdated,
        retestEventCreated: result.retestEventCreated,
        reviewEventCreated: result.reviewEventCreated,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '重新判题失败';
      const code = message.includes('DEEPSEEK_API_KEY') ? 'AI_NOT_CONFIGURED' : 'AI_GRADING_FAILED';
      return reply.error(code, message, code === 'AI_NOT_CONFIGURED' ? 400 : 502);
    }
  });

  app.post('/api/v1/assessments/:id/questions/:questionId/hints', async (request, reply) => {
    const { id, questionId } = request.params as { id: string; questionId: string };
    const body = z.object({ kind: z.enum(['EXPLAIN', 'HINT', 'DECOMPOSE', 'OUTLINE', 'STARTER', 'SIMILAR_EXAMPLE', 'FULL_ANSWER']) }).parse(request.body);
    try {
      return reply.ok(await revealAssessmentHint(id, questionId, body.kind));
    } catch (error) {
      return reply.error('HINT_UNAVAILABLE', error instanceof Error ? error.message : '无法提供提示');
    }
  });
  
  // ===== GET /api/v1/assessments/:id/result - 获取评分结果 =====
  app.get('/api/v1/assessments/:id/result', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const { session } = await getAssessmentSession(id);
    
    if (session.status !== 'GRADED' || !session.resultId) {
      return reply.error('NOT_FOUND', 'Result not available');
    }
    
    const result = await db.query.assessmentResults.findFirst({
      where: eq(assessmentResults.id, session.resultId),
    });
    
    if (!result) {
      return reply.error('NOT_FOUND', 'Result not found');
    }
    
    return reply.ok({
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
    });
  });
  
  // ===== POST /api/v1/assessments/:id/cancel - 取消考核 =====
  app.post('/api/v1/assessments/:id/cancel', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    try {
      const session = await cancelAssessmentSession(id);
      
      return reply.ok({
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
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.error('STATE_TRANSITION_INVALID', message);
    }
  });

  // ===== Phase 7: 代码题执行 API =====

  // ===== POST /api/v1/assessments/:id/questions/:questionId/execute - 执行代码题 =====
  app.post('/api/v1/assessments/:id/questions/:questionId/execute', async (request, reply) => {
    const { questionId } = request.params as { id: string; questionId: string };
    const body = request.body as z.infer<typeof ExecuteCodeQuestionRequestSchema>;
    
    try {
      // 验证请求
      const validated = ExecuteCodeQuestionRequestSchema.parse(body);
      
      // 执行代码
      const result = await executeCodeQuestion({
        questionId,
        code: validated.code,
        language: validated.language,
        testCases: validated.testCases,
        timeLimitMs: validated.timeLimitMs,
        memoryLimitMb: validated.memoryLimitMb,
      });
      
      return reply.ok({
        questionId: result.questionId,
        executionSuccess: result.executionSuccess,
        allTestsPassed: result.allTestsPassed,
        deterministicResult: result.deterministicResult,
        details: {
          status: result.details.status,
          passedCount: result.details.passedCount,
          totalCount: result.details.totalCount,
          hiddenPassedCount: result.details.hiddenPassedCount,
          hiddenTotalCount: result.details.hiddenTotalCount,
          totalRuntimeMs: result.details.totalRuntimeMs,
          errorMessage: result.details.errorMessage,
          securityWarnings: result.details.securityWarnings,
        },
        needsManualReview: result.needsManualReview,
        manualReviewReason: result.manualReviewReason,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.error('EXECUTION_ERROR', message);
    }
  });

  // ===== GET /api/v1/system/executor/status - 获取代码执行器状态 =====
  app.get('/api/v1/system/executor/status', async (request, reply) => {
    const status = await getExecutorStatusInfo();
    
    return reply.ok({
      available: status.available,
      type: status.type,
      warnings: status.warnings,
    });
  });
  
  // ===== GET /api/v1/system/ai/status - 获取 AI 状态 =====
  app.get('/api/v1/system/ai/status', async (request, reply) => {
    const status = await getAIStatus();
    
    return reply.ok(status);
  });
  
  done();
};
