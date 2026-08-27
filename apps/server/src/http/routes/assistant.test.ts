import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MAX_ASSISTANT_PAGE_CHARS } from '../../services/assistant.service.js';
import { assistantRoutes } from './assistant.js';

function buildTestApp() {
  const app = Fastify({ logger: false });
  app.setValidatorCompiler(({ schema }) => (data) => {
    const validator = schema as { safeParse?: (input: unknown) => { success: boolean; data?: unknown; error?: Error } };
    if (!validator.safeParse) return { value: data };
    const result = validator.safeParse(data);
    return result.success ? { value: result.data } : { error: result.error };
  });
  app.decorateReply('ok', function (data: unknown) {
    return this.send({ data, meta: { requestId: this.request.id } });
  });
  app.decorateReply('error', function (code: string, message: string, statusCode = 400) {
    return this.code(statusCode).send({ error: { code, message, retryable: false }, meta: { requestId: this.request.id } });
  });
  app.register(assistantRoutes);
  return app;
}

describe('Atlas AI 助手路由', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildTestApp();
    await app.ready();
  });

  afterAll(async () => app.close());

  it('提供可查看的待补资料目录', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/assistant/gaps' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ data: { directory: expect.any(String), items: expect.any(Array) } });
  });

  it('页面过长时明确拒绝，不会静默截断后继续发送', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/assistant/stream',
      payload: {
        mode: 'SUMMARY',
        page: {
          route: '/',
          title: '超长页面',
          content: 'x'.repeat(MAX_ASSISTANT_PAGE_CHARS + 1),
          capturedAt: '2026-08-27T00:00:00.000Z',
        },
      },
    });
    expect(response.statusCode).toBe(400);
  });
});
