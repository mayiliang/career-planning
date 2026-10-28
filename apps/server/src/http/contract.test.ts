import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { configureHttpContract } from './contract.js';

describe('HTTP 响应与校验协议', () => {
  it('校验并转换 Zod 路由输入，成功响应包含请求标识', async () => {
    const app = Fastify();
    configureHttpContract(app);
    app.post('/test', { schema: { body: z.object({ title: z.string().trim() }) } }, (request, reply) => reply.ok(request.body));
    try {
      const response = await app.inject({ method: 'POST', url: '/test', payload: { title: ' 笔记 ' } });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ data: { title: '笔记' }, meta: { requestId: expect.any(String) } });
      const invalid = await app.inject({ method: 'POST', url: '/test', payload: { title: 123 } });
      expect(invalid.statusCode).toBe(400);
      expect(invalid.json()).toMatchObject({ error: { retryable: false }, meta: { requestId: expect.any(String) } });
    } finally { await app.close(); }
  });

  it('处理器内显式参数校验失败返回 400 与字段详情', async () => {
    const app = Fastify();
    configureHttpContract(app);
    app.post('/test', (request, reply) => reply.ok(z.object({ title: z.string() }).parse(request.body)));
    try {
      const response = await app.inject({ method: 'POST', url: '/test', payload: {} });
      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR', details: [expect.objectContaining({ path: ['title'] })] } });
    } finally { await app.close(); }
  });

  it('内部异常返回统一 500 响应，具体内部信息交给日志', async () => {
    const app = Fastify();
    configureHttpContract(app);
    app.get('/test', () => { throw new Error('private database path'); });
    try {
      const response = await app.inject('/test');
      expect(response.statusCode).toBe(500);
      expect(response.json()).toMatchObject({ error: { code: 'INTERNAL_ERROR', retryable: false }, meta: { requestId: expect.any(String) } });
      expect(response.body).not.toContain('private database path');
    } finally { await app.close(); }
  });
});
