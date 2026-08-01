export type BrowserExecutionStatus = 'SUCCESS' | 'ERROR' | 'TIMEOUT';

export interface BrowserExecutionResult {
  status: BrowserExecutionStatus;
  output: string;
  durationMs: number;
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
        output: errors.map((item) => ts.flattenDiagnosticMessageText(item.messageText, '\n')).join('\n'),
        durationMs: Math.round(performance.now() - startedAt),
      };
    }
    code = result.outputText;
  }

  const workerSource = `
    const format = (value) => {
      if (typeof value === 'string') return value;
      if (typeof value === 'undefined') return 'undefined';
      if (typeof value === 'function') return '[Function ' + (value.name || 'anonymous') + ']';
      try { return JSON.stringify(value, null, 2); } catch { return String(value); }
    };
    self.onmessage = async (event) => {
      const lines = [];
      const consoleProxy = {};
      for (const level of ['log', 'info', 'warn', 'error']) {
        consoleProxy[level] = (...args) => lines.push((level === 'log' ? '' : '[' + level.toUpperCase() + '] ') + args.map(format).join(' '));
      }
      consoleProxy.assert = (condition, ...args) => {
        if (!condition) throw new Error('Assertion failed' + (args.length ? ': ' + args.map(format).join(' ') : ''));
        lines.push('[ASSERT PASS] ' + (args.length ? args.map(format).join(' ') : '条件成立'));
      };
      try {
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
        const execute = new AsyncFunction('console', 'fetch', 'XMLHttpRequest', 'WebSocket', 'importScripts', 'indexedDB', 'caches', '"use strict";\\n' + event.data.code);
        const returnValue = await execute(consoleProxy, undefined, undefined, undefined, undefined, undefined, undefined);
        if (typeof returnValue !== 'undefined') lines.push('[RETURN] ' + format(returnValue));
        self.postMessage({ ok: true, lines });
      } catch (error) {
        self.postMessage({ ok: false, lines, error: error && error.stack ? error.stack : String(error) });
      }
    };
  `;
  const url = URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' }));
  const worker = new Worker(url);
  try {
    return await new Promise<BrowserExecutionResult>((resolve) => {
      const timeout = window.setTimeout(() => {
        worker.terminate();
        resolve({ status: 'TIMEOUT', output: `执行超过 ${timeoutMs}ms，已自动终止。`, durationMs: Math.round(performance.now() - startedAt) });
      }, timeoutMs);
      worker.onmessage = (event: MessageEvent<{ ok: boolean; lines: string[]; error?: string }>) => {
        window.clearTimeout(timeout);
        resolve({
          status: event.data.ok ? 'SUCCESS' : 'ERROR',
          output: [...event.data.lines, ...(event.data.error ? [event.data.error] : [])].join('\n') || '脚本执行完成，但没有产生控制台输出。',
          durationMs: Math.round(performance.now() - startedAt),
        });
      };
      worker.onerror = (event) => {
        window.clearTimeout(timeout);
        resolve({ status: 'ERROR', output: event.message || '隔离运行区发生未知错误。', durationMs: Math.round(performance.now() - startedAt) });
      };
      worker.postMessage({ code });
    });
  } finally {
    worker.terminate();
    URL.revokeObjectURL(url);
  }
}
