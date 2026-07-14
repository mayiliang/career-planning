import 'fastify';

declare module 'fastify' {
  interface FastifyReply {
    ok(data: unknown): FastifyReply;
    error(code: string, message: string, statusCode?: number, details?: unknown): FastifyReply;
  }
}
