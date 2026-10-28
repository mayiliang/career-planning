/** 评分流程编排：模型请求、逐题归一化、服务端重算和原子提交。 */
import { prepareGrading, commitGrading, failGrading } from './grading/persistence.js';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db } from '../db/index.js';
import {
  assessmentQuestions,
  assessmentAnswers,
  knowledgePoints,
} from '../db/schema.js';
import type { NewAssessmentResult } from '../db/schema.js';
import { createProvider } from '../ai/index.js';
import {
  calculateVerdict,
  type DimensionScores,
} from '@career-atlas/shared';
import { extractLocalMaterialContext } from './learning-material-context.service.js';
import { parseUntrustedLocalSelfCheck } from './assessment/self-check.js';
import { normalizeFeedbackAndDimensionScores, referenceAnswerFromQuestion, sourceBasisFromQuestion, type GradingFeedback } from './grading/feedback.js';
export { collectDeterministicContractFailures } from './assessment/self-check.js';
export { normalizeFeedbackAndDimensionScores } from './grading/feedback.js';

import type { GradeRequest, GradeResult } from './grading/types.js';
export type { GradeRequest, GradeResult } from './grading/types.js';
export { GradingStateError } from './grading/types.js';
export { recoverInterruptedGradings } from './grading/persistence.js';

// ===== 执行评分 =====

async function executeGrading(
  request: GradeRequest,
  onProgress: (message: string, receivedChars?: number, thinkingDelta?: string) => void = () => {},
  signal?: AbortSignal,
  regrade = false,
): Promise<GradeResult> {
  signal?.throwIfAborted();
  onProgress('正在读取答卷、题目要求和对应学习资料');
  const preparation = prepareGrading(request.sessionId, regrade);
  if (preparation.kind === 'cached') return preparation.result;
  const { attempt } = preparation;
  const { session } = attempt;

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
    const localMaterialContext = extractLocalMaterialContext(knowledgePoint.studyMaterialMd);
    const gradingMaterialContext = localMaterialContext.length
      ? `${knowledgePoint.studyMaterialMd}\n\n以下是本知识点链接的本地中文讲义正文（仅这些章节可作为补充事实依据）：\n${localMaterialContext.map((item) => `【${item.title}｜${item.source}】\n${item.content}`).join('\n\n')}`
      : knowledgePoint.studyMaterialMd;
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
      // 这些仅是浏览器 Worker 的本地自检记录，客户端可伪造；只给 AI 作为补充上下文，
      // 绝不能作为服务端硬门禁或独立通过证明。
      deterministicResults: answers
        .filter(a => a.deterministicResult)
        .map(a => {
          const parsed = parseUntrustedLocalSelfCheck(a.deterministicResult!);
          return {
            questionId: a.questionId,
            passed: parsed?.passed ?? false,
            output: parsed?.output ?? '无有效本地自检记录',
            error: parsed?.error,
          };
        }),
      rubric: knowledgePoint.assessmentSpecMd,
      passCriteria: knowledgePoint.passCriteriaMd,
      studyMaterial: gradingMaterialContext,
    };
    
    // 调用 AI 评分
    onProgress('答卷结构已确认，正在启动 AI 判题');
    const aiResponse = await aiProvider.grade(gradingRequest, onProgress, signal);
    
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

    // 当前架构没有服务端执行回执。浏览器 Worker 不是安全沙箱，HTTP 也可被伪造，
    // 因而本地自检缺失、失败或伪造都不能单独强制 FAIL / PASS；语义评分由 AI 与题目合同完成。
    const deterministicTestsPassed = true;
    
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
    
    signal?.throwIfAborted();
    return commitGrading(attempt, result);
  } catch (error) {
    failGrading(attempt);
    throw error;
  }
}

export function gradeAssessment(
  request: GradeRequest,
  onProgress: (message: string, receivedChars?: number, thinkingDelta?: string) => void = () => {},
  signal?: AbortSignal,
): Promise<GradeResult> {
  return executeGrading(request, onProgress, signal);
}

/** 保留原始答卷和旧结果，只有新评分成功后才原子替换。 */
export function regradeAssessment(
  sessionId: string,
  onProgress: (message: string, receivedChars?: number, thinkingDelta?: string) => void = () => {},
  signal?: AbortSignal,
): Promise<GradeResult> {
  return executeGrading({ sessionId, provider: 'deepseek' }, onProgress, signal, true);
}
