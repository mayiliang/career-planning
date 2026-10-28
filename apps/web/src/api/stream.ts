import { z } from 'zod';
import { ApiError, AssistantStreamError } from './errors';
import { API_BASE, responseError } from './http';

const EventDataSchema = z.record(z.unknown());

/**
 * 所有业务流共用解析与资源清理；按行处理可保留跨 chunk 的 CRLF 和 UTF-8。
 * JSON 事件不属于业务 DTO，业务模块在 done 时继续校验最终结果。
 */
export async function consumeSse(
  path: string,
  options: RequestInit,
  onEvent: (event: string, data: Record<string, unknown>) => void,
): Promise<void> {
  options.signal?.throwIfAborted();
  const response = await fetch(`${API_BASE}${path}`, options);
  if (!response.ok) throw await responseError(response);
  if (!response.body) throw new ApiError('EMPTY_STREAM', '本地服务没有返回流式内容', true, 'unknown');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let event = 'message';
  let dataLines: string[] = [];
  let ended = false;

  const dispatch = () => {
    if (dataLines.length === 0) { event = 'message'; return; }
    let data: Record<string, unknown>;
    try {
      data = EventDataSchema.parse(JSON.parse(dataLines.join('\n')));
    } catch {
      throw new ApiError('INVALID_STREAM_EVENT', '本地服务返回了无法解析的流式事件', false, 'unknown');
    }
    options.signal?.throwIfAborted();
    if (event === 'error') {
      throw new AssistantStreamError(typeof data.message === 'string' ? data.message : '流式请求失败', {
        incidentId: typeof data.incidentId === 'string' ? data.incidentId : '',
        code: typeof data.code === 'string' ? data.code : 'STREAM_ERROR',
        stage: typeof data.stage === 'string' ? data.stage : 'UNKNOWN',
        elapsedMs: typeof data.elapsedMs === 'number' ? data.elapsedMs : 0,
        retryable: data.retryable === true,
      });
    }
    onEvent(event, data);
    event = 'message';
    dataLines = [];
  };

  const processLine = (line: string) => {
    if (!line) { dispatch(); return; }
    if (line.startsWith(':')) return;
    const separator = line.indexOf(':');
    const field = separator === -1 ? line : line.slice(0, separator);
    const rawValue = separator === -1 ? '' : line.slice(separator + 1);
    const value = rawValue.startsWith(' ') ? rawValue.slice(1) : rawValue;
    if (field === 'event') event = value || 'message';
    if (field === 'data') dataLines.push(value);
  };

  const abortReader = () => { void reader.cancel(options.signal?.reason).catch(() => {}); };
  options.signal?.addEventListener('abort', abortReader, { once: true });
  try {
    while (true) {
      options.signal?.throwIfAborted();
      const { value, done } = await reader.read();
      options.signal?.throwIfAborted();
      ended = done;
      buffer += decoder.decode(value, { stream: !done });
      let separator: number;
      while ((separator = buffer.indexOf('\n')) !== -1) {
        processLine(buffer.slice(0, separator).replace(/\r$/, ''));
        buffer = buffer.slice(separator + 1);
      }
      if (done) break;
    }
    if (buffer) processLine(buffer.replace(/\r$/, ''));
    dispatch();
  } finally {
    options.signal?.removeEventListener('abort', abortReader);
    if (!ended) await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

/** 挑战判题和练习验证共享进度协议，结果字段由业务模块明确指定。 */
export async function streamStructuredResult<T>(
  path: string,
  schema: z.ZodType<T>,
  resultKey: 'attempt' | 'grade',
  onProgress: (message: string, receivedChars?: number) => void,
  options: RequestInit = {},
  onThinking: (delta: string, accumulated: string) => void = () => {},
): Promise<T> {
  let finalValue: unknown;
  let accumulatedThinking = '';
  await consumeSse(path, { method: 'POST', ...options }, (event, data) => {
    if (event === 'progress' && typeof data.message === 'string') {
      onProgress(data.message, typeof data.receivedChars === 'number' ? data.receivedChars : undefined);
    }
    if (event === 'thinking' && typeof data.delta === 'string') {
      accumulatedThinking += data.delta;
      onThinking(data.delta, accumulatedThinking);
    }
    if (event === 'done') finalValue = data[resultKey];
  });
  if (finalValue === undefined) throw new ApiError('INCOMPLETE_STREAM', '流式请求已结束，但没有收到完整结果', true, 'unknown');
  return schema.parse(finalValue);
}
