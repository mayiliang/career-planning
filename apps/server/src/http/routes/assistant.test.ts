import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { config } from '../../config/index.js';
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

  it('请求正文读取完成不会误中止流，并留下可查询的诊断记录', async () => {
    const originalKey = config.DEEPSEEK_API_KEY;
    config.DEEPSEEK_API_KEY = 'assistant-route-test-key';
    const responseBody = [
      `data: ${JSON.stringify({ choices: [{ delta: { content: '快速解释。' } }] })}`,
      '',
      'data: [DONE]',
      '',
    ].join('\n');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(responseBody, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    }));
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/assistant/stream',
        payload: {
          mode: 'EXPLAIN',
          selectedText: '微任务会在下一个宏任务之前清空',
          page: {
            route: '/knowledge/JS-04',
            title: '异步、Promise 与事件循环',
            content: '事件循环负责协调任务。微任务会在下一个宏任务之前清空。',
            capturedAt: '2026-08-28T00:00:00.000Z',
          },
        },
      });
      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('event: delta');
      expect(response.body).toContain('event: done');
      expect(response.body).not.toContain('CLIENT_DISCONNECTED');

      const diagnostics = await app.inject({ method: 'GET', url: '/api/v1/assistant/diagnostics?limit=5' });
      expect(diagnostics.statusCode).toBe(200);
      expect(diagnostics.json()).toMatchObject({ data: { file: expect.any(String), items: expect.arrayContaining([expect.objectContaining({ outcome: 'SUCCESS', mode: 'EXPLAIN' })]) } });
    } finally {
      fetchMock.mockRestore();
      config.DEEPSEEK_API_KEY = originalKey;
    }
  });
});
