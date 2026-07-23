/**
 * 考核 DTO 和 Schema
 * 
 * Phase 5 实现：完整的考核类型定义
 */
import { z } from 'zod';

// ===== 枚举类型 =====

// 考核类型枚举
export const AssessmentTypeSchema = z.enum([
  'FIRST',
  'RETEST',
  'MONTHLY_REVIEW',
  'DOMAIN_COMPREHENSIVE',
]);

export type AssessmentType = z.infer<typeof AssessmentTypeSchema>;

// 考核会话状态枚举
export const AssessmentSessionStatusSchema = z.enum([
  'DRAFT',
  'IN_PROGRESS',
  'SUBMITTED',
  'GRADING',
  'GRADED',
  'ERROR',
  'CANCELLED',
]);

export type AssessmentSessionStatus = z.infer<typeof AssessmentSessionStatusSchema>;

// 考核结果枚举
export const AssessmentVerdictSchema = z.enum(['PASS', 'FAIL', 'MANUAL_REVIEW']);
export type AssessmentVerdict = z.infer<typeof AssessmentVerdictSchema>;

// 题目类型枚举
export const QuestionTypeSchema = z.enum([
  'CHOICE',
  'OUTPUT',
  'ESSAY',
  'CODE_READ',
  'CODE_WRITE',
]);

export type QuestionType = z.infer<typeof QuestionTypeSchema>;

// 评分维度枚举
export const AssessmentDimensionSchema = z.enum([
  'principlesAndBoundaries',
  'practice',
  'troubleshootingAndDesign',
  'projectCommunication',
]);

export type AssessmentDimension = z.infer<typeof AssessmentDimensionSchema>;

// ===== 维度分数 Schema =====

export const DimensionScoresSchema = z.object({
  principlesAndBoundaries: z.number().min(0).max(25),
  practice: z.number().min(0).max(35),
  troubleshootingAndDesign: z.number().min(0).max(25),
  projectCommunication: z.number().min(0).max(15),
});

export type DimensionScores = z.infer<typeof DimensionScoresSchema>;

// ===== 题目内容 Schema =====

// 选择题选项
export const ChoiceOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
});

export type ChoiceOption = z.infer<typeof ChoiceOptionSchema>;

// 选择题内容
export const ChoiceQuestionContentSchema = z.object({
  question: z.string(),
  options: z.array(ChoiceOptionSchema),
  correctOptionIds: z.array(z.string()), // 服务端保留，不下发
});

// 输出题内容
export const OutputQuestionContentSchema = z.object({
  question: z.string(),
  expectedOutput: z.string(), // 服务端保留
  outputType: z.enum(['text', 'json', 'code']),
});

// 问答题内容
export const EssayQuestionContentSchema = z.object({
  question: z.string(),
  wordLimit: z.number().optional(),
  rubric: z.string(), // 服务端保留
});

// 代码阅读题内容
export const CodeReadQuestionContentSchema = z.object({
  code: z.string(),
  language: z.string(),
  questions: z.array(z.string()),
});

// 代码题内容
export const CodeWriteQuestionContentSchema = z.object({
  prompt: z.string(),
  language: z.string(),
  starterCode: z.string().optional(),
  testCases: z.string(), // 服务端保留
  timeLimit: z.number().optional(), // 秒
});

// ===== 用户答案 Schema =====

// 选择题答案
export const ChoiceAnswerSchema = z.object({
  selectedOptionIds: z.array(z.string()),
});

// 输出题答案
export const OutputAnswerSchema = z.object({
  output: z.string(),
});

// 问答题答案
export const EssayAnswerSchema = z.object({
  text: z.string(),
});

// 代码题答案
export const CodeAnswerSchema = z.object({
  code: z.string(),
});

// ===== 确定性测试结果 Schema =====

export const DeterministicResultSchema = z.object({
  passed: z.boolean(),
  output: z.string().optional(),
  error: z.string().optional(),
  runtimeMs: z.number().optional(),
});

export type DeterministicResult = z.infer<typeof DeterministicResultSchema>;

// ===== 评分输出 Schema =====

// 评分 Finding
export const AssessmentFindingSchema = z.object({
  dimension: AssessmentDimensionSchema,
  criterionId: z.string(),
  score: z.number().int().min(0),
  maxScore: z.number().int().min(1),
  evidence: z.string(),
  reason: z.string(),
});

export type AssessmentFinding = z.infer<typeof AssessmentFindingSchema>;

// 否决项
export const CriticalFailureSchema = z.object({
  code: z.string(),
  evidence: z.string(),
  reason: z.string(),
});

export type CriticalFailure = z.infer<typeof CriticalFailureSchema>;

// 薄弱项
export const WeaknessSchema = z.object({
  topic: z.string(),
  severity: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  evidence: z.string(),
  nextAction: z.string(),
});

export type Weakness = z.infer<typeof WeaknessSchema>;

// 反馈
export const AssessmentFeedbackSchema = z.object({
  summary: z.string(),
  whatWasStrong: z.array(z.string()),
  whatMustImprove: z.array(z.string()),
  suggestedRetestFocus: z.array(z.string()),
  questionReviews: z.array(z.object({
    questionId: z.string(),
    score: z.number().min(0),
    maxScore: z.number().min(0),
    correctParts: z.array(z.string()),
    incorrectParts: z.array(z.string()),
    missingParts: z.array(z.string()),
    referenceAnswer: z.string(),
    sourceBasis: z.array(z.string()),
    nextAction: z.string(),
  })),
});

export type AssessmentFeedback = z.infer<typeof AssessmentFeedbackSchema>;

// AI 评分输出 Schema（完整版，根据文档）
export const AssessmentGradingOutputSchema = z.object({
  schemaVersion: z.literal('1.0'),
  knowledgePointId: z.string(),
  assessmentType: AssessmentTypeSchema,
  dimensionScores: DimensionScoresSchema,
  findings: z.array(AssessmentFindingSchema),
  criticalFailures: z.array(CriticalFailureSchema),
  weaknesses: z.array(WeaknessSchema),
  feedback: AssessmentFeedbackSchema,
  recommendedVerdict: AssessmentVerdictSchema,
  confidence: z.number().min(0).max(1),
});

export type AssessmentGradingOutput = z.infer<typeof AssessmentGradingOutputSchema>;

// ===== 考核会话 Schema =====

// 创建考核请求
export const CreateAssessmentRequestSchema = z.object({
  knowledgePointCode: z.string(),
  type: AssessmentTypeSchema,
  durationMinutes: z.number().int().min(10).max(180),
});

export type CreateAssessmentRequest = z.infer<typeof CreateAssessmentRequestSchema>;

// 考核会话 DTO
export const AssessmentSessionSchema = z.object({
  id: z.string().uuid(),
  knowledgePointCode: z.string(),
  assessmentType: AssessmentTypeSchema,
  status: AssessmentSessionStatusSchema,
  durationMinutes: z.number().int(),
  startedAt: z.string().optional(),
  submittedAt: z.string().optional(),
  gradedAt: z.string().optional(),
  resultId: z.string().uuid().optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AssessmentSession = z.infer<typeof AssessmentSessionSchema>;

// 考核题目 DTO
export const AssessmentQuestionSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  questionType: QuestionTypeSchema,
  dimension: AssessmentDimensionSchema,
  questionContent: z.string(), // JSON string
  maxScore: z.number().int(),
  orderIndex: z.number().int(),
  createdAt: z.string(),
});

export type AssessmentQuestion = z.infer<typeof AssessmentQuestionSchema>;

// 考核答案 DTO
export const AssessmentAnswerSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  questionId: z.string().uuid(),
  answerContent: z.string(), // JSON string
  deterministicResult: z.string().optional(), // JSON string
  answeredAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AssessmentAnswer = z.infer<typeof AssessmentAnswerSchema>;

// 评分结果 DTO
export const AssessmentResultSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  principlesScore: z.number().int().min(0).max(25),
  practiceScore: z.number().int().min(0).max(35),
  troubleshootingScore: z.number().int().min(0).max(25),
  communicationScore: z.number().int().min(0).max(15),
  totalScore: z.number().int().min(0).max(100),
  verdict: AssessmentVerdictSchema,
  confidence: z.string(),
  criticalFailures: z.string().optional(), // JSON string
  weaknesses: z.string().optional(), // JSON string
  feedback: z.string().optional(), // JSON string
  aiRawResponse: z.string().optional(), // JSON string
  createdAt: z.string(),
});

export type AssessmentResult = z.infer<typeof AssessmentResultSchema>;

// ===== 通过条件验证 =====

export const PASS_THRESHOLD = {
  TOTAL_SCORE: 80,
  DIMENSION_PERCENTAGE: 0.6, // 每个维度至少 60%
  CONFIDENCE: 0.75,
};

// 验证是否通过（服务端重算逻辑）
export function calculateVerdict(
  scores: DimensionScores,
  confidence: number,
  hasCriticalFailures: boolean,
  deterministicTestsPassed: boolean
): AssessmentVerdict {
  // 计算总分
  const totalScore =
    scores.principlesAndBoundaries +
    scores.practice +
    scores.troubleshootingAndDesign +
    scores.projectCommunication;

  // 维度最低分检查
  const dimensionMinScores = {
    principlesAndBoundaries: 25 * PASS_THRESHOLD.DIMENSION_PERCENTAGE, // 15
    practice: 35 * PASS_THRESHOLD.DIMENSION_PERCENTAGE, // 21
    troubleshootingAndDesign: 25 * PASS_THRESHOLD.DIMENSION_PERCENTAGE, // 15
    projectCommunication: 15 * PASS_THRESHOLD.DIMENSION_PERCENTAGE, // 9
  };

  const allDimensionsPass =
    scores.principlesAndBoundaries >= dimensionMinScores.principlesAndBoundaries &&
    scores.practice >= dimensionMinScores.practice &&
    scores.troubleshootingAndDesign >= dimensionMinScores.troubleshootingAndDesign &&
    scores.projectCommunication >= dimensionMinScores.projectCommunication;

  // 通过条件
  if (
    totalScore >= PASS_THRESHOLD.TOTAL_SCORE &&
    allDimensionsPass &&
    confidence >= PASS_THRESHOLD.CONFIDENCE &&
    !hasCriticalFailures &&
    deterministicTestsPassed
  ) {
    return 'PASS';
  }

  // 置信度不足或证据冲突
  if (confidence < PASS_THRESHOLD.CONFIDENCE || hasCriticalFailures) {
    return 'MANUAL_REVIEW';
  }

  return 'FAIL';
}
