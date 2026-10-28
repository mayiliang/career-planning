import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiError } from './errors';
import { request } from './http';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const schema = z.object({ title: z.string() });

describe('JSON 请求传输', () => {
  it('校验响应内容并保留调用方请求头', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ data: { title: '笔记' }, meta: { requestId: 'r1' } }));
    await expect(request('/notes', schema, { method: 'PUT', body: '{}', headers: { 'X-Trace': 'trace' } })).resolves.toEqual({ title: '笔记' });
    const options = fetchMock.mock.calls[0]?.[1];
    expect(new Headers(options?.headers).get('Content-Type')).toBe('application/json');
    expect(new Headers(options?.headers).get('X-Trace')).toBe('trace');
  });

  it('保留服务端业务错误、诊断标识和校验详情', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ error: { code: 'INVALID_NOTE', message: '内容过长', retryable: false, details: ['contentMd'] }, meta: { requestId: 'r2' } }, { status: 400 }));
    await expect(request('/notes', schema)).rejects.toMatchObject({ code: 'INVALID_NOTE', requestId: 'r2', details: ['contentMd'] });
  });

  it('网关非 JSON 错误映射为可识别的 HTTP 错误', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('<html>502</html>', { status: 502 }));
    await expect(request('/notes', schema)).rejects.toMatchObject({ code: 'HTTP_502' });
  });

  it('拒绝通过 HTTP 200 返回的不合法业务数据', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ data: { title: 123 }, meta: { requestId: 'r3' } }));
    await expect(request('/notes', schema)).rejects.toBeInstanceOf(z.ZodError);
  });

  it('响应头已经到达而正文一直不结束时，仍会超时并取消读取', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | null | undefined;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, options) => {
      signal = options?.signal;
      return new Response(new ReadableStream({
        start(controller) { signal?.addEventListener('abort', () => controller.error(signal?.reason), { once: true }); },
      }));
    });
    const result = request('/notes', schema);
    const assertion = expect(result).rejects.toMatchObject({ name: 'ApiError', code: 'REQUEST_TIMEOUT', retryable: true });
    await vi.advanceTimersByTimeAsync(20_000);
    await assertion;
    expect(signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('调用方已经取消的请求不会发送，也不会伪装成超时', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const controller = new AbortController();
    controller.abort();
    const error = await request('/notes', schema, { signal: controller.signal }).catch(reason => reason);
    expect(error.name).toBe('AbortError');
    expect(error).not.toBeInstanceOf(ApiError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
