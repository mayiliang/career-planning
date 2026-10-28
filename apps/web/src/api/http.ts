import { z } from 'zod';
import { ApiError } from './errors';

export const API_BASE = '/api/v1';

const ApiResponseSchema = z.object({
  data: z.unknown(),
  meta: z.object({ requestId: z.string() }),
});

const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
    retryable: z.boolean(),
  }),
  meta: z.object({ requestId: z.string() }),
});

function requestTimeout(path: string): number {
  if (path.startsWith('/data/import')) return 60_000;
  if (path === '/system/ai/status') return 35_000;
  return 20_000;
}

/** JSON 和 SSE 请求在建立连接失败时使用相同的错误映射。 */
export async function responseError(response: Response): Promise<ApiError> {
  const json: unknown = await response.json().catch(() => null);
  const parsed = ApiErrorSchema.safeParse(json);
  if (parsed.success) {
    const { error, meta } = parsed.data;
    return new ApiError(error.code, error.message, error.retryable, meta.requestId, error.details);
  }
  const fallback = z.object({ message: z.string().optional(), error: z.string().optional() }).safeParse(json);
  const message = fallback.success ? fallback.data.message || fallback.data.error : undefined;
  return new ApiError(`HTTP_${response.status}`, message || '本地服务请求失败', false, 'unknown');
}

/** 超时与调用方取消覆盖整个响应读取过程，完成后统一释放监听器。 */
export async function request<T>(path: string, schema: z.ZodType<T>, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body !== undefined && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const controller = new AbortController();
  const callerSignal = options.signal;
  const timeoutMs = requestTimeout(path);
  let timedOut = false;
  const timeout = globalThis.setTimeout(() => {
    if (controller.signal.aborted) return;
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const abortFromCaller = () => controller.abort(callerSignal?.reason);
  if (callerSignal?.aborted) abortFromCaller();
  else callerSignal?.addEventListener('abort', abortFromCaller, { once: true });

  try {
    controller.signal.throwIfAborted();
    const response = await fetch(`${API_BASE}${path}`, { ...options, headers, signal: controller.signal });
    if (!response.ok) throw await responseError(response);
    const json: unknown = await response.json();
    controller.signal.throwIfAborted();
    const envelope = ApiResponseSchema.parse(json);
    return schema.parse(envelope.data);
  } catch (reason) {
    if (timedOut) {
      throw new ApiError('REQUEST_TIMEOUT', `本地服务在 ${Math.round(timeoutMs / 1000)} 秒内没有响应`, true, 'client-timeout');
    }
    if (callerSignal?.aborted) callerSignal.throwIfAborted();
    throw reason;
  } finally {
    globalThis.clearTimeout(timeout);
    callerSignal?.removeEventListener('abort', abortFromCaller);
  }
}
