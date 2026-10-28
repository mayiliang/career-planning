import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { openEventStream } from './sse.js';

describe('SSE 连接生命周期', () => {
  it('读取完请求正文后继续发送事件，正常完成不会触发取消', async () => {
    const app = Fastify();
    let signal: AbortSignal | undefined;
    app.post('/stream', async (_request, reply) => {
      const stream = openEventStream(reply);
      signal = stream.signal;
      stream.send('delta', { delta: '中文内容' });
      stream.send('done', { ok: true });
      stream.close();
      stream.close();
    });
    try {
      const response = await app.inject({ method: 'POST', url: '/stream', payload: { question: 'test' } });
      expect(response.headers['content-type']).toContain('text/event-stream');
      expect(response.headers['x-accel-buffering']).toBe('no');
      expect(response.body).toContain('event: delta\ndata: {"delta":"中文内容"}');
      expect(response.body).toContain('event: done');
      expect(signal?.aborted).toBe(false);
    } finally { await app.close(); }
  });

  it('浏览器实际断开后取消服务端任务', async () => {
    const app = Fastify();
    let resolveAborted!: () => void;
    const aborted = new Promise<void>(resolve => { resolveAborted = resolve; });
    app.get('/stream', async (_request, reply) => {
      const stream = openEventStream(reply);
      stream.send('start', {});
      await new Promise<void>(resolve => {
        stream.signal.addEventListener('abort', () => { resolveAborted(); resolve(); }, { once: true });
      });
      stream.close();
    });
    const controller = new AbortController();
    try {
      const origin = await app.listen({ port: 0, host: '127.0.0.1' });
      const response = await fetch(`${origin}/stream`, { signal: controller.signal });
      const reader = response.body!.getReader();
      await reader.read();
      controller.abort();
      await aborted;
      reader.releaseLock();
    } finally {
      controller.abort();
      await app.close();
    }
  });
});
