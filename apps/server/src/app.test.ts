import { describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { getConfig } from './config/index.js';

describe('应用组装', () => {
  it('可以独立组装多个实例而不监听端口或启动后台任务', async () => {
    const config = { ...getConfig(), logLevel: 'silent', webDistDir: undefined };
    const first = await buildApp(config);
    const second = await buildApp(config);
    try {
      for (const app of [first, second]) {
        expect(app.server.listening).toBe(false);
        const health = await app.inject('/api/v1/system/health');
        expect(health.statusCode).toBe(200);
        expect(health.json()).toMatchObject({ data: { ok: true, db: true }, meta: { requestId: expect.any(String) } });
        const invalid = await app.inject({ method: 'PUT', url: '/api/v1/notes/JS-01', payload: { contentMd: 123 } });
        expect(invalid.statusCode).toBe(400);
        expect(invalid.json().error.code).toBe('VALIDATION_ERROR');
      }
    } finally {
      await first.close();
      await second.close();
    }
  });
});
