/** 题目内容与浏览器自检记录的展示投影；不执行网络或页面状态变更。 */
import type { AssessmentQuestion } from '@/api/client';
import type { BrowserExecutionStatus } from '@/utils/browser-code-runner';

export interface QuestionContent {
  question?: string;
  prompt?: string;
  wordLimit?: number;
  level?: string;
  sourceHint?: string;
  starterCode?: string;
  language?: 'javascript' | 'typescript';
  knowledgeTags?: string[];
  givenInput?: string;
  expectedOutput?: string;
  answerRequirements?: string[];
  answerFormat?: string;
  materialReferences?: Array<{ title: string; url: string | null; locator: string; focus: string }>;
  derivationGuide?: { required: boolean; basis: string; steps: string[] };
  sourceQuestion?: string;
  stageContract?: string | { stage?: string; goal?: string; requirement?: string; retest?: string; [key: string]: unknown };
  retestVariant?: string | boolean | { description?: string; [key: string]: unknown };
  failureFixture?: string;
  verificationChecklist?: string[];
  vetoItems?: string[];
  deterministicRequired?: boolean;
  testCases?: Array<{ id: string; input?: string; expectedOutput?: string; isHidden?: boolean }>;
}

export function parseAssessmentQuestions(questions: AssessmentQuestion[]) {
  return questions.map(question => {
    try { return { ...question, content: JSON.parse(question.questionContent) as QuestionContent }; }
    catch { return { ...question, content: { question: question.questionContent } }; }
  });
}

export type QuestionView = ReturnType<typeof parseAssessmentQuestions>[number];
export const hintOptions = [
  ['EXPLAIN', '解释题意'], ['HINT', '给一个提示'], ['DECOMPOSE', '拆解步骤'], ['OUTLINE', '给回答提纲'],
  ['STARTER', '帮我起个头'], ['SIMILAR_EXAMPLE', '看相似示例'], ['FULL_ANSWER', '查看完整思路'],
] as const;

export type HintKind = typeof hintOptions[number][0];
export interface LocalExecution {
  status: 'NOT_RUN' | BrowserExecutionStatus;
  output: string;
  durationMs: number;
  passed: boolean;
  missingCaseIds: string[];
}

export function parseStoredExecution(value: string | null): LocalExecution | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as { passed?: boolean; output?: string; error?: string; runtimeMs?: number; status?: BrowserExecutionStatus; missingCaseIds?: string[] };
    if (typeof parsed.passed !== 'boolean') return null;
    return {
      status: parsed.status ?? (parsed.passed ? 'SUCCESS' : 'ERROR') as BrowserExecutionStatus,
      output: parsed.output || parsed.error || '', durationMs: parsed.runtimeMs ?? 0,
      passed: parsed.passed, missingCaseIds: parsed.missingCaseIds ?? [],
    };
  } catch { return null; }
}

export function executionPayload(execution: LocalExecution | undefined) {
  if (!execution) return undefined;
  return JSON.stringify({
    passed: execution.passed,
    output: execution.output,
    error: execution.status === 'SUCCESS' ? undefined : execution.output,
    runtimeMs: execution.durationMs,
    status: execution.status,
    missingCaseIds: execution.missingCaseIds,
  });
}

