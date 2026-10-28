

export type AssistantMode = 'EXPLAIN' | 'SUMMARY' | 'ASK';

export interface AssistantGapEvaluation {
  relevant: boolean;
  reasonable: boolean;
  title: string;
  rationale: string;
  suggestedScope: string;
}

export interface AssistantPageContext {
  route: string;
  title: string;
  content: string;
  capturedAt: string;
}

export interface AssistantRequest {
  mode: AssistantMode;
  question?: string;
  selectedText?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  page: AssistantPageContext;
}

export interface AssistantSource {
  id: string;
  kind: 'SITE' | 'WEB';
  title: string;
  url: string;
  excerpt: string;
  code?: string;
  domain?: string;
}

export interface AssistantGapCandidate {
  id: string;
  title: string;
  rationale: string;
  suggestedScope: string;
  sourceRoute: string;
  sourcePageTitle: string;
  status: 'PENDING' | 'ADDED' | 'DISMISSED';
  createdAt: string;
  updatedAt: string;
}

export type EmitEvent = (event: 'progress' | 'diagnostic' | 'sources' | 'thinking' | 'delta' | 'gap' | 'done', data: Record<string, unknown>) => void;

export type KnowledgeRow = {
  code: string;
  title: string;
  summary: string | null;
  secondaryTopic: string;
  topicTags: string;
  applicabilityTags: string;
  studyMaterialMd: string;
  domainTitle: string;
};

export interface AssistantContextPlan {
  content: string;
  originalCharacterCount: number;
  contextCharacterCount: number;
  strategy: 'OUTLINE' | 'SELECTION' | 'RELEVANT';
}

export interface AssistantDiagnosticRecord {
  incidentId: string;
  startedAt: string;
  finishedAt: string;
  outcome: 'SUCCESS' | 'ERROR' | 'ABORTED';
  mode: AssistantMode;
  route: string;
  stage: string;
  elapsedMs: number;
  pageCharacterCount: number;
  selectedCharacterCount: number;
  questionCharacterCount: number;
  contextCharacterCount: number;
  siteSourceCount: number;
  webSourceCount: number;
  webSearchUsed: boolean;
  firstTokenMs?: number;
  errorCode?: string;
  errorMessage?: string;
}
