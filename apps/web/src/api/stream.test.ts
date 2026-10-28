import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { consumeSse, streamStructuredResult } from './stream';

afterEach(() => vi.restoreAllMocks());

function mockStream(text: string, close = true) {
  const bytes = new TextEncoder().encode(text);
  const cancel = vi.fn();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      // 每个字节独立到达，覆盖 UTF-8 字符和 CRLF 在 chunk 边界拆开的情形。
      for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
      if (close) controller.close();
    },
    cancel,
  });
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(body));
  return { body, cancel };
}

describe('共用 SSE 传输', () => {
  it('支持中文、多行 data、CRLF、注释和没有结尾空行的最终事件', async () => {
    const { body } = mockStream(': heartbeat\r\nevent: delta\r\ndata: {"delta":\r\ndata: " 中文 "}\r\n\r\nevent: done\r\ndata: {"ok":true}');
    const events: unknown[] = [];
    await consumeSse('/stream', {}, (event, data) => events.push({ event, data }));
    expect(events).toEqual([{ event: 'delta', data: { delta: ' 中文 ' } }, { event: 'done', data: { ok: true } }]);
    expect(body.locked).toBe(false);
  });

  it('收到业务错误后取消上游，释放读取器并保留助手诊断', async () => {
    const { body, cancel } = mockStream('event: error\ndata: {"message":"失败","incidentId":"incident-1","code":"AI_TIMEOUT","stage":"GENERATING","elapsedMs":12,"retryable":true}\n\n', false);
    await expect(consumeSse('/stream', {}, vi.fn())).rejects.toMatchObject({ name: 'AssistantStreamError', diagnostic: { incidentId: 'incident-1', code: 'AI_TIMEOUT', retryable: true } });
    expect(cancel).toHaveBeenCalledOnce();
    expect(body.locked).toBe(false);
  });

  it('事件格式错误时清理连接', async () => {
    const { body, cancel } = mockStream('event: delta\ndata: not-json\n\n', false);
    await expect(consumeSse('/stream', {}, vi.fn())).rejects.toMatchObject({ code: 'INVALID_STREAM_EVENT' });
    expect(cancel).toHaveBeenCalledOnce();
    expect(body.locked).toBe(false);
  });

  it('调用方取消挂起的读取时立即退出', async () => {
    const cancel = vi.fn();
    const body = new ReadableStream({ cancel });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(body));
    const controller = new AbortController();
    const result = consumeSse('/stream', { signal: controller.signal }, vi.fn());
    const assertion = expect(result).rejects.toMatchObject({ name: 'AbortError' });
    await Promise.resolve();
    controller.abort();
    await assertion;
    expect(cancel).toHaveBeenCalledOnce();
    expect(body.locked).toBe(false);
  });

  it('回调异常也会取消连接并原样抛出', async () => {
    const { body, cancel } = mockStream('event: delta\ndata: {"delta":"text"}\n\n', false);
    const failure = new Error('callback failed');
    await expect(consumeSse('/stream', {}, () => { throw failure; })).rejects.toBe(failure);
    expect(cancel).toHaveBeenCalledOnce();
    expect(body.locked).toBe(false);
  });

  it('流式连接失败与 JSON API 使用相同错误协议', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ error: { code: 'AI_NOT_CONFIGURED', message: '未配置 AI', retryable: false }, meta: { requestId: 'r1' } }, { status: 400 }));
    await expect(consumeSse('/stream', {}, vi.fn())).rejects.toMatchObject({ code: 'AI_NOT_CONFIGURED', requestId: 'r1' });
  });

  it('连接结束但没有最终结果时，不把部分内容当作成功', async () => {
    mockStream('event: progress\ndata: {"message":"处理中"}\n\n');
    await expect(streamStructuredResult('/stream', z.object({ id: z.string() }), 'grade', vi.fn())).rejects.toMatchObject({ code: 'INCOMPLETE_STREAM' });
  });

  it('从明确的业务字段读取并校验最终结果', async () => {
    mockStream('event: done\ndata: {"attempt":{"id":"practice-1"},"grade":{"id":"grade-1"}}\n\n');
    await expect(streamStructuredResult('/stream', z.object({ id: z.string() }), 'grade', vi.fn())).resolves.toEqual({ id: 'grade-1' });
  });
});
