import { describe, expect, it, vi } from 'vitest';
import { consumeSseData } from './sse.js';

function createStream(text: string, close = true) {
  const cancel = vi.fn();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const byte of new TextEncoder().encode(text)) controller.enqueue(Uint8Array.of(byte));
      if (close) controller.close();
    },
    cancel,
  });
  return { body, cancel };
}

describe('模型供应商 SSE 数据流', () => {
  it('完整解码跨分片的中文与 CRLF，并处理没有结束空行的最终数据', async () => {
    const { body } = createStream('data: {"text":"中文"}\r\n\r\ndata: {"final":true}');
    const data: unknown[] = [];
    await consumeSseData(body, value => data.push(JSON.parse(value)));
    expect(data).toEqual([{ text: '中文' }, { final: true }]);
    expect(body.locked).toBe(false);
  });

  it('[DONE] 后主动清理持续打开的连接，不等待供应商关闭', async () => {
    const { body, cancel } = createStream('data: {"text":"回答"}\n\ndata: [DONE]\n\n', false);
    const consume = vi.fn();
    await consumeSseData(body, consume);
    expect(consume).toHaveBeenCalledOnce();
    expect(consume).toHaveBeenCalledWith('{"text":"回答"}');
    expect(cancel).toHaveBeenCalledOnce();
    expect(body.locked).toBe(false);
  });

  it('业务解析失败时取消读取并释放锁', async () => {
    const { body, cancel } = createStream('data: invalid-json\n\n', false);
    await expect(consumeSseData(body, value => { JSON.parse(value); })).rejects.toBeInstanceOf(SyntaxError);
    expect(cancel).toHaveBeenCalledOnce();
    expect(body.locked).toBe(false);
  });

  it('已经取消的任务不获取读取器，也不消费内容', async () => {
    const { body } = createStream('data: {}\n\n');
    const controller = new AbortController();
    controller.abort();
    const consume = vi.fn();
    await expect(consumeSseData(body, consume, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(consume).not.toHaveBeenCalled();
    expect(body.locked).toBe(false);
  });
});
