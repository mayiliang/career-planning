import fastifyStatic from '@fastify/static';
import type { FastifyInstance } from 'fastify';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const INDEX_FILE = 'index.html';

/**
 * Windows 单机版把构建后的 Vue 页面和 API 放在同一个本机端口。
 * 没有显式配置 WEB_DIST_DIR 时不注册，因此不改变开发环境和 Docker 双容器部署。
 */
export async function registerLocalWeb(app: FastifyInstance, webDistDir?: string): Promise<boolean> {
  if (!webDistDir) return false;

  const root = resolve(webDistDir);
  const indexPath = resolve(root, INDEX_FILE);
  if (!existsSync(indexPath)) {
    throw new Error(`WEB_DIST_DIR does not contain ${INDEX_FILE}: ${root}`);
  }

  await app.register(fastifyStatic, {
    root,
    prefix: '/',
    maxAge: '30d',
    immutable: true,
  });

  app.get('/', async (_request, reply) => {
    return reply.sendFile(INDEX_FILE, { maxAge: 0, immutable: false });
  });

  app.setNotFoundHandler(async (request, reply) => {
    if (request.method === 'GET' && !request.url.startsWith('/api/')) {
      return reply.sendFile(INDEX_FILE, { maxAge: 0, immutable: false });
    }

    return reply.code(404).send({
      error: {
        code: 'NOT_FOUND',
        message: '请求的本地资源不存在',
        retryable: false,
      },
      meta: { requestId: request.id },
    });
  });

  return true;
}
