import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { rawDb } from '../../db/index.js';
import { jobsRoutes } from './jobs.js';

type Envelope<T> = { data: T };

function buildTestApp() {
  const app = Fastify({ logger: false });
  app.decorateReply('ok', function (data: unknown) {
    return this.send({ data, meta: { requestId: this.request.id } });
  });
  app.decorateReply('error', function (code: string, message: string, statusCode = 400, details?: unknown) {
    return this.code(statusCode).send({ error: { code, message, retryable: false, details }, meta: { requestId: this.request.id } });
  });
  app.register(jobsRoutes);
  return app;
}

describe('岗位 CSV 预览与导入', () => {
  let app: FastifyInstance;
  const company = 'CSV-IMPORT-E2E-ONLY';

  beforeAll(async () => {
    rawDb.prepare('DELETE FROM jobs WHERE company = ?').run(company);
    app = buildTestApp();
    await app.ready();
  });

  afterAll(async () => {
    rawDb.prepare('DELETE FROM jobs WHERE company = ?').run(company);
    await app.close();
  });

  it('预览逐行返回字段错误，不把部分有效数据直接写入', async () => {
    const response = await app.inject({
      method: 'POST', url: '/api/v1/jobs/import/preview',
      payload: { rows: [
        { company, job_title: '高级前端', platform: '官网', source_url: 'https://example.com/job' },
        { company: '', job_title: '前端', platform: '官网', source_url: 'javascript:alert(1)' },
      ] },
    });
    expect(response.statusCode, response.body).toBe(200);
    const preview = (response.json() as Envelope<{
      total: number; valid: number; invalid: number; errors: Array<{ row: number; field: string }>;
    }>).data;
    expect(preview).toMatchObject({ total: 2, valid: 1, invalid: 1 });
    expect(preview.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ row: 3, field: 'company' }),
      expect.objectContaining({ row: 3, field: 'source_url' }),
    ]));
    expect(rawDb.prepare('SELECT COUNT(*) AS count FROM jobs WHERE company = ?').get(company)).toEqual({ count: 0 });
  });

  it('导入拒绝混有无效行的批次，并接受完整通过预览的批次', async () => {
    const rejected = await app.inject({
      method: 'POST', url: '/api/v1/jobs/import',
      payload: { rows: [{ company, job_title: '', platform: '官网' }] },
    });
    expect(rejected.statusCode).toBe(400);

    const accepted = await app.inject({
      method: 'POST', url: '/api/v1/jobs/import',
      payload: { rows: [{ company, job_title: 'Vue / React 前端', platform: '官网', status: 'SAVED' }] },
    });
    expect(accepted.statusCode, accepted.body).toBe(200);
    expect((accepted.json() as Envelope<{ imported: number }>).data.imported).toBe(1);
    expect(rawDb.prepare('SELECT COUNT(*) AS count FROM jobs WHERE company = ?').get(company)).toEqual({ count: 1 });
  });
});
