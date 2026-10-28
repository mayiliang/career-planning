import type { DimensionScores } from '@career-atlas/shared';

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

export type GradingFeedback = {
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

export function referenceAnswerFromQuestion(questionContent: string): string {
  try {
    const parsed = JSON.parse(questionContent) as { referenceAnswer?: string };
    return parsed.referenceAnswer ?? '请按题目要求和学习资料整理参考答案。';
  } catch {
    return '请按题目要求和学习资料整理参考答案。';
  }
}

export function sourceBasisFromQuestion(questionContent: string): string[] {
  try {
    const parsed = JSON.parse(questionContent) as { sourceBasis?: unknown };
    return Array.isArray(parsed.sourceBasis)
      ? parsed.sourceBasis.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

