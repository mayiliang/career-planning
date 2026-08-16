export type BrowserExecutionStatus = 'SUCCESS' | 'ERROR' | 'TIMEOUT';

export interface BrowserExecutionResult {
  status: BrowserExecutionStatus;
  output: string;
  durationMs: number;
}

type WorkerResultMessage = {
  kind: 'career-atlas-browser-self-check-result';
  nonce: string;
  ok: boolean;
  lines: string[];
  error?: string;
};

const MAX_OUTPUT_LINES = 120;
const MAX_OUTPUT_CHARS = 12_000;

/**
 * 这只保护 UI 不会把用户代码主动 postMessage 的第一条消息误认为运行结果。
 * Worker 仍然不是安全沙箱，客户端提交的任何结果都不能作为服务端证明。
 */
export function isBrowserSelfCheckMessage(value: unknown, nonce: string): value is WorkerResultMessage {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<WorkerResultMessage>;
  return candidate.kind === 'career-atlas-browser-self-check-result'
    && candidate.nonce === nonce
    && typeof candidate.ok === 'boolean'
    && Array.isArray(candidate.lines)
    && candidate.lines.length <= MAX_OUTPUT_LINES
    && candidate.lines.every((line) => typeof line === 'string' && line.length <= 2_000)
    && (candidate.error === undefined || typeof candidate.error === 'string');
}

function executionNonce() {
  const bytes = new Uint32Array(4);
  crypto.getRandomValues(bytes);
  return [...bytes].map((item) => item.toString(16)).join('-');
}

function boundedOutput(lines: string[], error?: string) {
  const joined = [...lines.slice(0, MAX_OUTPUT_LINES), ...(error ? [error] : [])].join('\n');
  return joined.slice(0, MAX_OUTPUT_CHARS) || '脚本执行完成，但没有产生控制台输出。';
}

export async function runBrowserCode(
  source: string,
  language: 'javascript' | 'typescript',
  timeoutMs = 3000,
): Promise<BrowserExecutionResult> {
  const startedAt = performance.now();
  let code = source;
  if (language === 'typescript') {
    const ts = await import('typescript');
    const result = ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
      reportDiagnostics: true,
    });
    const errors = result.diagnostics?.filter((item) => item.category === ts.DiagnosticCategory.Error) ?? [];
    if (errors.length) {
      return {
        status: 'ERROR',
        output: errors.map((item) => ts.flattenDiagnosticMessageText(item.messageText, '\n')).join('\n').slice(0, MAX_OUTPUT_CHARS),
        durationMs: Math.round(performance.now() - startedAt),
      };
    }
    code = result.outputText;
  }

  const nonce = executionNonce();
  const workerSource = `
    // 必须在任何用户代码运行前捕获原生发送函数。用户代码可以改写 self.postMessage，
    // 但运行器的最终消息只能经过这个不可达的闭包引用发送。
    const nativePostMessage = self.postMessage.bind(self);
    const MAX_LINES = ${MAX_OUTPUT_LINES};
    const MAX_LINE_CHARS = 2000;
    const format = (value) => {
      if (typeof value === 'string') return value;
      if (typeof value === 'undefined') return 'undefined';
      if (typeof value === 'function') return '[Function ' + (value.name || 'anonymous') + ']';
      try { return JSON.stringify(value, null, 2); } catch { return String(value); }
    };
    self.onmessage = async (event) => {
      const { code, nonce } = event.data || {};
      if (typeof code !== 'string' || typeof nonce !== 'string') return;
      const lines = [];
      const append = (line) => { if (lines.length < MAX_LINES) lines.push(String(line).slice(0, MAX_LINE_CHARS)); };
      const send = (ok, error) => nativePostMessage({
        kind: 'career-atlas-browser-self-check-result', nonce, ok, lines,
        ...(error ? { error: String(error).slice(0, MAX_LINE_CHARS) } : {}),
      });
      const consoleProxy = {};
      for (const level of ['log', 'info', 'warn', 'error']) {
        consoleProxy[level] = (...args) => append((level === 'log' ? '' : '[' + level.toUpperCase() + '] ') + args.map(format).join(' '));
      }
      consoleProxy.assert = (condition, ...args) => {
        if (!condition) throw new Error('Assertion failed' + (args.length ? ': ' + args.map(format).join(' ') : ''));
        append('[ASSERT PASS] ' + (args.length ? args.map(format).join(' ') : '条件成立'));
      };
      try {
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
        const execute = new AsyncFunction('console', 'fetch', 'XMLHttpRequest', 'WebSocket', 'importScripts', 'indexedDB', 'caches', '"use strict";\\n' + code);
        const returnValue = await execute(consoleProxy, undefined, undefined, undefined, undefined, undefined, undefined);
        if (typeof returnValue !== 'undefined') append('[RETURN] ' + format(returnValue));
        send(true);
      } catch (error) {
        send(false, error && error.stack ? error.stack : String(error));
      }
    };
  `;
  const url = URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' }));
  let worker: Worker | undefined;
  try {
    // Worker 构造完成前保留 Blob URL；浏览器会把紧接着发送的消息排队到脚本 ready。
    // URL 只在执行 settled（成功、错误或超时）且 Worker 终止后撤销。
    worker = new Worker(url);
    const activeWorker = worker;
    return await new Promise<BrowserExecutionResult>((resolve) => {
      let settled = false;
      const finish = (result: BrowserExecutionResult) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        resolve(result);
      };
      const timeout = window.setTimeout(() => {
        finish({ status: 'TIMEOUT', output: `执行超过 ${timeoutMs}ms，已自动终止。`, durationMs: Math.round(performance.now() - startedAt) });
      }, timeoutMs);
      activeWorker.onmessage = (event: MessageEvent<unknown>) => {
        // 用户代码可调用 self.postMessage；没有闭包 nonce 或不符合 schema 的消息一律忽略。
        if (!isBrowserSelfCheckMessage(event.data, nonce)) return;
        finish({
          status: event.data.ok ? 'SUCCESS' : 'ERROR',
          output: boundedOutput(event.data.lines, event.data.error),
          durationMs: Math.round(performance.now() - startedAt),
        });
      };
      activeWorker.onerror = (event) => {
        finish({ status: 'ERROR', output: event.message || '本地 Worker 自检发生未知错误。', durationMs: Math.round(performance.now() - startedAt) });
      };
      activeWorker.postMessage({ code, nonce });
    });
  } finally {
    worker?.terminate();
    URL.revokeObjectURL(url);
  }
}
