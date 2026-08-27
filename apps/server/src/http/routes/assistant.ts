import type { FastifyPluginCallback } from 'fastify';
import { z } from 'zod';
import {
  listAssistantGapCandidates,
  MAX_ASSISTANT_PAGE_CHARS,
  runAssistant,
  type AssistantRequest,
} from '../../services/assistant.service.js';

const AssistantRequestSchema = z.object({
  mode: z.enum(['EXPLAIN', 'SUMMARY', 'ASK']),
  question: z.string().trim().max(4_000).optional(),
  selectedText: z.string().trim().max(40_000).optional(),
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

  app.post('/api/v1/assistant/stream', {
    bodyLimit: ASSISTANT_BODY_LIMIT,
    schema: { body: AssistantRequestSchema },
  }, async (request, reply) => {
    const body = request.body as AssistantRequest;
    reply.hijack();
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    const controller = new AbortController();
    const abort = () => controller.abort();
    request.raw.once('close', abort);
    const send = (event: string, data: Record<string, unknown>) => {
      if (!reply.raw.destroyed) reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    try {
      await runAssistant(body, send, controller.signal);
    } catch (error) {
      if (!controller.signal.aborted) {
        send('error', { message: error instanceof Error ? error.message : 'AI 助手暂时无法完成回答' });
      }
    } finally {
      request.raw.off('close', abort);
      if (!reply.raw.destroyed) reply.raw.end();
    }
  });
  done();
};
