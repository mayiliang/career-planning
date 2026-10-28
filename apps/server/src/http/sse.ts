import type { FastifyReply } from 'fastify';

/** SSE 连接只监听实际断连；请求正文读取完成不代表客户端离开。 */
export function openEventStream(reply: FastifyReply) {
  const controller = new AbortController();
  const request = reply.request.raw;
  const response = reply.raw;
  let closed = false;

  const cleanup = () => {
    request.off('aborted', abort);
    response.off('close', onClose);
  };
  const abort = () => {
    controller.abort();
    cleanup();
  };
  const onClose = () => {
    if (!response.writableEnded) abort();
    else cleanup();
  };

  reply.hijack();
  response.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  response.flushHeaders();
  request.once('aborted', abort);
  response.once('close', onClose);
  if (request.aborted || response.destroyed) abort();

  return {
    signal: controller.signal,
    send(event: string, data: unknown) {
      if (!closed && !controller.signal.aborted && !response.destroyed && !response.writableEnded) {
        response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      }
    },
    close() {
      if (closed) return;
      closed = true;
      cleanup();
      if (!response.destroyed && !response.writableEnded) response.end();
    },
  };
}
