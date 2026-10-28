/** AI 助手、引用与诊断：运行时响应校验与业务接口。 */
import { z } from 'zod';
import { request } from '../http';
import { consumeSse } from '../stream';

const AssistantSourceSchema = z.object({
  id: z.string(),
  kind: z.enum(['SITE', 'WEB']),
  title: z.string(),
  url: z.string(),
  excerpt: z.string(),
  code: z.string().optional(),
  domain: z.string().optional(),
});

const AssistantGapCandidateSchema = z.object({
  id: z.string(),
  title: z.string(),
  rationale: z.string(),
  suggestedScope: z.string(),
  sourceRoute: z.string(),
  sourcePageTitle: z.string(),
  status: z.enum(['PENDING', 'ADDED', 'DISMISSED']),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const AssistantGapDirectorySchema = z.object({
  directory: z.string(),
  items: z.array(AssistantGapCandidateSchema),
});

const AssistantDiagnosticRecordSchema = z.object({
  incidentId: z.string(),
  startedAt: z.string(),
  finishedAt: z.string(),
  outcome: z.enum(['SUCCESS', 'ERROR', 'ABORTED']),
  mode: z.enum(['EXPLAIN', 'SUMMARY', 'ASK']),
  route: z.string(),
  stage: z.string(),
  elapsedMs: z.number(),
  pageCharacterCount: z.number(),
  selectedCharacterCount: z.number(),
  questionCharacterCount: z.number(),
  contextCharacterCount: z.number(),
  siteSourceCount: z.number(),
  webSourceCount: z.number(),
  webSearchUsed: z.boolean(),
  firstTokenMs: z.number().optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
});

const AssistantDiagnosticDirectorySchema = z.object({
  file: z.string(),
  items: z.array(AssistantDiagnosticRecordSchema),
});

const AssistantRequestSchema = z.object({
  mode: z.enum(['EXPLAIN', 'SUMMARY', 'ASK']),
  question: z.string().optional(),
  selectedText: z.string().optional(),
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })).max(12).optional(),
  page: z.object({
    route: z.string(),
    title: z.string(),
    content: z.string(),
    capturedAt: z.string(),
  }),
});

export const assistantApi = {
  async streamAssistant(
    input: AssistantRequest,
    handlers: AssistantStreamHandlers,
    signal?: AbortSignal,
  ) {
    const payload = AssistantRequestSchema.parse(input);
    await consumeSse(
      '/assistant/stream',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal,
      },
      (event, data) => {
        if (event === 'progress' && typeof data.message === 'string') handlers.onProgress?.(data.message);
        if (event === 'diagnostic') handlers.onDiagnostic?.({
          incidentId: typeof data.incidentId === 'string' ? data.incidentId : '',
          stage: typeof data.stage === 'string' ? data.stage : 'UNKNOWN',
          elapsedMs: typeof data.elapsedMs === 'number' ? data.elapsedMs : 0,
          contextCharacterCount: typeof data.contextCharacterCount === 'number' ? data.contextCharacterCount : undefined,
          siteSourceCount: typeof data.siteSourceCount === 'number' ? data.siteSourceCount : undefined,
          webSourceCount: typeof data.webSourceCount === 'number' ? data.webSourceCount : undefined,
          firstTokenMs: typeof data.firstTokenMs === 'number' ? data.firstTokenMs : undefined,
        });
        if (event === 'heartbeat') handlers.onHeartbeat?.({
          incidentId: typeof data.incidentId === 'string' ? data.incidentId : '',
          stage: typeof data.stage === 'string' ? data.stage : 'UNKNOWN',
          elapsedMs: typeof data.elapsedMs === 'number' ? data.elapsedMs : 0,
        });
        if (event === 'delta' && typeof data.delta === 'string') handlers.onDelta?.(data.delta);
        if (event === 'thinking' && typeof data.delta === 'string') handlers.onThinking?.(data.delta);
        if (event === 'sources') {
          handlers.onSources?.(
            z.array(AssistantSourceSchema).parse(data.sources ?? []),
            typeof data.searchQuery === 'string' ? data.searchQuery : '',
            typeof data.webSearchWarning === 'string' ? data.webSearchWarning : '',
            data.webSearchUsed === true,
          );
        }
        if (event === 'gap') handlers.onGap?.(AssistantGapCandidateSchema.parse(data.candidate));
        if (event === 'done') handlers.onDone?.({
          provider: typeof data.provider === 'string' ? data.provider : '',
          model: typeof data.model === 'string' ? data.model : '',
          pageCharacterCount: typeof data.pageCharacterCount === 'number' ? data.pageCharacterCount : 0,
          contextCharacterCount: typeof data.contextCharacterCount === 'number' ? data.contextCharacterCount : 0,
          webSearchUsed: data.webSearchUsed === true,
          elapsedMs: typeof data.elapsedMs === 'number' ? data.elapsedMs : 0,
        });
      },
    );
  },

  async listAssistantGaps() {
    return request('/assistant/gaps', AssistantGapDirectorySchema);
  },

  async listAssistantDiagnostics() {
    return request('/assistant/diagnostics?limit=40', AssistantDiagnosticDirectorySchema);
  },
};

export type AssistantSource = z.infer<typeof AssistantSourceSchema>;

export type AssistantGapCandidate = z.infer<typeof AssistantGapCandidateSchema>;

export type AssistantRequest = z.infer<typeof AssistantRequestSchema>;

export interface AssistantRuntimeDiagnostic {
  incidentId: string;
  stage: string;
  elapsedMs: number;
  contextCharacterCount?: number;
  siteSourceCount?: number;
  webSourceCount?: number;
  firstTokenMs?: number;
}

export interface AssistantStreamHandlers {
  onProgress?: (message: string) => void;
  onDiagnostic?: (diagnostic: AssistantRuntimeDiagnostic) => void;
  onHeartbeat?: (diagnostic: Pick<AssistantRuntimeDiagnostic, 'incidentId' | 'stage' | 'elapsedMs'>) => void;
  onDelta?: (delta: string) => void;
  onThinking?: (delta: string) => void;
  onSources?: (sources: AssistantSource[], searchQuery: string, warning: string, webSearchUsed: boolean) => void;
  onGap?: (candidate: AssistantGapCandidate) => void;
  onDone?: (metadata: { provider: string; model: string; pageCharacterCount: number; contextCharacterCount: number; webSearchUsed: boolean; elapsedMs: number }) => void;
}
