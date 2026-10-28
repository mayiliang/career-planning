interface StreamOptions {
  signal?: AbortSignal;
  onActivity?: () => void;
}

/** 兼容模型供应商的 data 流：处理分片、结束标记及异常时的连接清理。 */
export async function consumeSseData(
  body: ReadableStream<Uint8Array>,
  consume: (data: string) => void,
  { signal, onActivity }: StreamOptions = {},
): Promise<void> {
  signal?.throwIfAborted();
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let ended = false;
  const processFrame = (frame: string) => {
    const data = frame.split(/\r?\n/u)
      .filter(line => line.startsWith('data:'))
      .map(line => line.slice(5).replace(/^ /, ''))
      .join('\n');
    if (data.trim() === '[DONE]') return true;
    if (data.trim()) consume(data);
    return false;
  };
  const abort = () => { void reader.cancel(signal?.reason).catch(() => {}); };
  signal?.addEventListener('abort', abort, { once: true });
  try {
    while (true) {
      signal?.throwIfAborted();
      const { value, done } = await reader.read();
      signal?.throwIfAborted();
      ended = done;
      if (value?.length) onActivity?.();
      buffer += decoder.decode(value, { stream: !done });
      const frames = buffer.split(/\r?\n\r?\n/u);
      buffer = frames.pop() ?? '';
      for (const frame of frames) if (processFrame(frame)) return;
      if (done) break;
    }
    if (buffer.trim()) processFrame(buffer);
  } finally {
    signal?.removeEventListener('abort', abort);
    if (!ended) await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
