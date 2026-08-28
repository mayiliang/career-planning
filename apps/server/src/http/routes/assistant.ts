import type { FastifyPluginCallback } from 'fastify';
import { z } from 'zod';
import {
  listAssistantDiagnostics,
  listAssistantGapCandidates,
  MAX_ASSISTANT_PAGE_CHARS,
  recordAssistantDiagnostic,
  runAssistant,
  type AssistantDiagnosticRecord,
  type AssistantRequest,
} from '../../services/assistant.service.js';

const AssistantRequestSchema = z.object({
  mode: z.enum(['EXPLAIN', 'SUMMARY', 'ASK']),
  question: z.string().trim().max(4_000).optional(),
  selectedText: z.string().trim().max(40_000).optional(),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().trim().min(1).max(6_000),
  })).max(12).optional(),
  page: z.object({
    route: z.string().trim().min(1).max(500),
    title: z.string().trim().min(1).max(300),
    content: z.string().min(1).max(MAX_ASSISTANT_PAGE_CHARS),
    capturedAt: z.string().datetime(),
  }),
}).superRefine((value, context) => {
  if (value.mode === 'EXPLAIN' && !value.selectedText) {
    context.addIssue({ code: 'custom', path: ['selectedText'], message: '解释模式需要选中文本' });
  }
  if (value.mode === 'ASK' && !value.question) {
    context.addIssue({ code: 'custom', path: ['question'], message: '提问模式需要问题' });
  }
});

const ASSISTANT_BODY_LIMIT = 3 * 1024 * 1024;

export const assistantRoutes: FastifyPluginCallback = (app, _options, done) => {
  app.get('/api/v1/assistant/gaps', async (_request, reply) => reply.ok(listAssistantGapCandidates()));
  app.get('/api/v1/assistant/diagnostics', async (request, reply) => {
    const query = request.query as { limit?: string };
    const limit = Number.parseInt(query.limit ?? '40', 10);
    return reply.ok(listAssistantDiagnostics(Number.isFinite(limit) ? limit : 40));
  });

  app.post('/api/v1/assistant/stream', {
    bodyLimit: ASSISTANT_BODY_LIMIT,
    schema: { body: AssistantRequestSchema },
  }, async (request, reply) => {
    const body = request.body as AssistantRequest;
    const incidentId = String(request.id);
    const startedAtMs = Date.now();
    const startedAt = new Date(startedAtMs).toISOString();
    let stage = 'REQUEST_RECEIVED';
    let contextCharacterCount = 0;
    let siteSourceCount = 0;
    let webSourceCount = 0;
    let webSearchUsed = false;
    let firstTokenMs: number | undefined;
    let completed = false;
    let clientDisconnected = false;
    let errorCode: string | undefined;
    let errorMessage: string | undefined;
    reply.hijack();
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    reply.raw.flushHeaders?.();
    const controller = new AbortController();
    const abortFromRequest = () => {
      clientDisconnected = true;
      controller.abort();
    };
    const abortFromReply = () => {
      if (reply.raw.writableEnded) return;
      clientDisconnected = true;
      controller.abort();
    };
    request.raw.once('aborted', abortFromRequest);
    reply.raw.once('close', abortFromReply);
    const send = (event: string, data: Record<string, unknown>) => {
      if (event === 'diagnostic') {
        if (typeof data.stage === 'string') stage = data.stage;
        if (typeof data.contextCharacterCount === 'number') contextCharacterCount = data.contextCharacterCount;
        if (typeof data.siteSourceCount === 'number') siteSourceCount = data.siteSourceCount;
        if (typeof data.webSourceCount === 'number') webSourceCount = data.webSourceCount;
        if (typeof data.firstTokenMs === 'number') firstTokenMs = data.firstTokenMs;
        if (data.webSearchUsed === true) webSearchUsed = true;
      }
      if (event === 'sources') {
        const sources = Array.isArray(data.sources) ? data.sources as Array<{ kind?: string }> : [];
        siteSourceCount = sources.filter((source) => source.kind === 'SITE').length;
        webSourceCount = sources.filter((source) => source.kind === 'WEB').length;
        webSearchUsed = data.webSearchUsed === true;
      }
      if (event === 'done') {
        completed = true;
        stage = 'COMPLETE';
        if (typeof data.contextCharacterCount === 'number') contextCharacterCount = data.contextCharacterCount;
      }
      if (!reply.raw.destroyed && !reply.raw.writableEnded) reply.raw.write(`event: ${event}\ndata: ${JSON.stringify({ incidentId, ...data })}\n\n`);
    };
    send('diagnostic', { stage, elapsedMs: 0 });
    const heartbeat = setInterval(() => {
      send('heartbeat', { stage, elapsedMs: Date.now() - startedAtMs });
    }, 5_000);
    try {
      await runAssistant(body, send, controller.signal);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'AI 助手暂时无法完成回答';
      errorCode = clientDisconnected
        ? 'CLIENT_DISCONNECTED'
        : /超时/u.test(errorMessage)
          ? 'AI_TIMEOUT'
          : /AI 服务/u.test(errorMessage)
            ? 'AI_PROVIDER_ERROR'
            : 'ASSISTANT_ERROR';
      if (!clientDisconnected) {
        send('error', {
          message: errorMessage,
          code: errorCode,
          stage,
          elapsedMs: Date.now() - startedAtMs,
          retryable: errorCode !== 'ASSISTANT_ERROR',
        });
      }
      request.log.error({ err: error, incidentId, stage, errorCode }, 'Atlas AI request failed');
    } finally {
      clearInterval(heartbeat);
      request.raw.off('aborted', abortFromRequest);
      reply.raw.off('close', abortFromReply);
      const diagnostic: AssistantDiagnosticRecord = {
        incidentId,
        startedAt,
        finishedAt: new Date().toISOString(),
        outcome: completed ? 'SUCCESS' : clientDisconnected ? 'ABORTED' : 'ERROR',
        mode: body.mode,
        route: body.page.route,
        stage,
        elapsedMs: Date.now() - startedAtMs,
        pageCharacterCount: body.page.content.length,
        selectedCharacterCount: body.selectedText?.length ?? 0,
        questionCharacterCount: body.question?.length ?? 0,
        contextCharacterCount,
        siteSourceCount,
        webSourceCount,
        webSearchUsed,
        ...(firstTokenMs === undefined ? {} : { firstTokenMs }),
        ...(errorCode ? { errorCode } : {}),
        ...(errorMessage ? { errorMessage } : {}),
      };
      recordAssistantDiagnostic(diagnostic);
      if (!reply.raw.destroyed && !reply.raw.writableEnded) reply.raw.end();
    }
  });
  done();
};
