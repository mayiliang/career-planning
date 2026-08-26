import Fastify from 'fastify';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { registerLocalWeb } from './local-web.js';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function createWebDist() {
  const root = await mkdtemp(join(tmpdir(), 'career-atlas-local-web-'));
  temporaryRoots.push(root);
  await mkdir(join(root, 'assets'));
  await writeFile(join(root, 'index.html'), '<!doctype html><title>Career Atlas</title>');
  await writeFile(join(root, 'assets', 'app.js'), 'window.__CAREER_ATLAS__ = true;');
  return root;
}

describe('Windows 单机版页面服务', () => {
  it('未配置页面目录时不改变现有 API 服务', async () => {
    const app = Fastify();
    expect(await registerLocalWeb(app)).toBe(false);
    await app.close();
  });

  it('提供构建资源，并让前端路由回退到 index.html', async () => {
    const app = Fastify();
    const root = await createWebDist();
    expect(await registerLocalWeb(app, root)).toBe(true);

    const asset = await app.inject({ method: 'GET', url: '/assets/app.js' });
    expect(asset.statusCode).toBe(200);
    expect(asset.body).toContain('__CAREER_ATLAS__');
    expect(asset.headers['cache-control']).toContain('immutable');

    const route = await app.inject({ method: 'GET', url: '/knowledge/JS-01' });
    expect(route.statusCode).toBe(200);
    expect(route.body).toContain('<title>Career Atlas</title>');
    expect(route.headers['cache-control']).toContain('max-age=0');

    const missingApi = await app.inject({ method: 'GET', url: '/api/v1/missing' });
    expect(missingApi.statusCode).toBe(404);
    expect(missingApi.json().error.code).toBe('NOT_FOUND');
    await app.close();
  });

  it('目录缺少 index.html 时拒绝启动单机页面服务', async () => {
    const root = await mkdtemp(join(tmpdir(), 'career-atlas-local-web-empty-'));
    temporaryRoots.push(root);
    const app = Fastify();
    await expect(registerLocalWeb(app, root)).rejects.toThrow(/index\.html/);
    await app.close();
  });
});
