/**
 * 取消旧请求并使其结果失效。AbortSignal 之外仍须检查 isCurrent，
 * 因为 Promise 回调、缓存命中或不支持取消的请求仍可能继续执行。
 */
export function createLatestRequest() {
  let controller: AbortController | undefined;

  return {
    start() {
      controller?.abort();
      const current = new AbortController();
      controller = current;
      return {
        signal: current.signal,
        isCurrent: () => controller === current && !current.signal.aborted,
      };
    },
    cancel() {
      controller?.abort();
      controller = undefined;
    },
  };
}
