import type { FastifyInstance } from 'fastify';
import { ZodError, type ZodType } from 'zod';

/** 应用与路由测试共用校验、响应包装及异常映射，避免各自维护协议副本。 */
export function configureHttpContract(app: FastifyInstance): void {
  app.setValidatorCompiler(({ schema }) => (data) => {
    const validator = schema as Partial<ZodType>;
    if (typeof validator.safeParse !== 'function') return { value: data };
    const result = validator.safeParse(data);
    return result.success ? { value: result.data } : { error: result.error };
  });
  app.setSerializerCompiler(() => (data) => JSON.stringify(data));

  app.decorateReply('ok', function (data: unknown) {
    return this.send({ data, meta: { requestId: this.request.id } });
  });
  app.decorateReply('error', function (code: string, message: string, statusCode = 400, details?: unknown) {
    return this.code(statusCode).send({
      error: { code, message, retryable: false, ...(details === undefined ? {} : { details }) },
      meta: { requestId: this.request.id },
    });
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.error('VALIDATION_ERROR', '请求参数不符合要求', 400, error.issues);
    }
    const status = error && typeof error === 'object' && 'statusCode' in error ? error.statusCode : undefined;
    const statusCode = typeof status === 'number' && status >= 400 && status <= 599 ? status : 500;
    const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
    if (statusCode >= 500) request.log.error({ err: error }, 'API request failed');
    return reply.error(
      typeof code === 'string' ? code : (statusCode >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'),
      statusCode >= 500 ? '本地服务暂时无法完成请求' : error instanceof Error ? error.message : '请求失败',
      statusCode,
    );
  });
}
