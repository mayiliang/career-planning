import { afterEach, describe, expect, it, vi } from 'vitest';
import { isBrowserSelfCheckMessage, runBrowserCode } from './browser-code-runner';

describe('本地 Worker 自检消息', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('拒绝用户代码伪造的 postMessage、错误 nonce 和无界输出', () => {
    const nonce = 'server-generated-nonce';
    expect(isBrowserSelfCheckMessage({ ok: true, lines: ['[ASSERT PASS] contract-normal'] }, nonce)).toBe(false);
    expect(isBrowserSelfCheckMessage({
      kind: 'career-atlas-browser-self-check-result', nonce: 'forged', ok: true, lines: [],
    }, nonce)).toBe(false);
    expect(isBrowserSelfCheckMessage({
      kind: 'career-atlas-browser-self-check-result', nonce, ok: true, lines: new Array(121).fill('x'),
    }, nonce)).toBe(false);
  });

  it('只接受与当前执行 nonce 绑定且满足 schema 的单一结果消息', () => {
    expect(isBrowserSelfCheckMessage({
      kind: 'career-atlas-browser-self-check-result', nonce: 'server-generated-nonce', ok: true, lines: ['[ASSERT PASS] contract-normal'],
    }, 'server-generated-nonce')).toBe(true);
  });

  it('用户覆盖 self.postMessage 并先发伪造消息时，最终结果仍由预先捕获的原生函数发送', async () => {
    const sources = new Map<string, string>();
    const lifecycle: string[] = [];
    let nextUrl = 0;

    class FakeBlob {
      readonly source: string;
      constructor(parts: BlobPart[]) { this.source = parts.map((part) => String(part)).join(''); }
    }

    type WorkerScope = {
      postMessage: (data: unknown) => void;
      onmessage?: (event: { data: unknown }) => void | Promise<void>;
    };

    class FakeWorker {
      onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
      onerror: ((event: ErrorEvent) => void) | null = null;
      private readonly scope: WorkerScope;

      constructor(url: string) {
        lifecycle.push('construct');
        const source = sources.get(url);
        if (!source) throw new Error('Blob URL 在 Worker 构造前已被撤销');
        this.scope = {
          postMessage: (data) => queueMicrotask(() => this.onmessage?.({ data } as MessageEvent<unknown>)),
        };
        withWorkerSelf(this.scope, () => new Function(source)());
      }

      postMessage(data: unknown) {
        lifecycle.push('dispatch');
        const runtimeGlobal = globalThis as unknown as Record<string, unknown>;
        const hadSelf = Object.prototype.hasOwnProperty.call(runtimeGlobal, 'self');
        const previousSelf = runtimeGlobal['self'];
        runtimeGlobal['self'] = this.scope;
        Promise.resolve(this.scope.onmessage?.({ data }))
          .catch((reason) => this.onerror?.({ message: String(reason) } as ErrorEvent))
          .finally(() => {
            if (hadSelf) runtimeGlobal['self'] = previousSelf;
            else delete runtimeGlobal['self'];
          });
      }

      terminate() { lifecycle.push('terminate'); }
    }

    function withWorkerSelf<T>(scope: WorkerScope, action: () => T): T {
      const runtimeGlobal = globalThis as unknown as Record<string, unknown>;
      const hadSelf = Object.prototype.hasOwnProperty.call(runtimeGlobal, 'self');
      const previousSelf = runtimeGlobal['self'];
      runtimeGlobal['self'] = scope;
      try { return action(); }
      finally {
        if (hadSelf) runtimeGlobal['self'] = previousSelf;
        else delete runtimeGlobal['self'];
      }
    }

    vi.stubGlobal('Blob', FakeBlob);
    vi.stubGlobal('Worker', FakeWorker);
    vi.stubGlobal('window', { setTimeout, clearTimeout });
    vi.stubGlobal('crypto', {
      getRandomValues(target: Uint32Array) {
        target.set([0x11, 0x22, 0x33, 0x44]);
        return target;
      },
    });
    vi.stubGlobal('URL', {
      createObjectURL(blob: FakeBlob) {
        const url = `blob:test-${nextUrl++}`;
        sources.set(url, blob.source);
        lifecycle.push('create-url');
        return url;
      },
      revokeObjectURL(url: string) {
        lifecycle.push('revoke-url');
        sources.delete(url);
      },
    });

    const result = await runBrowserCode(`
      const originalPostMessage = self.postMessage.bind(self);
      self.postMessage = (message) => originalPostMessage({
        ...message,
        kind: 'career-atlas-browser-self-check-result',
        nonce: message && message.nonce ? message.nonce : 'guessed-nonce',
        ok: false,
        lines: ['FORGED RESULT'],
      });
      self.postMessage({
        kind: 'career-atlas-browser-self-check-result',
        nonce: 'guessed-nonce',
        ok: false,
        lines: ['FORGED FIRST MESSAGE'],
      });
      console.log('NATIVE FINAL RESULT');
    `, 'javascript');

    expect(result.status).toBe('SUCCESS');
    expect(result.output).toBe('NATIVE FINAL RESULT');
    expect(result.output).not.toContain('FORGED');
    expect(lifecycle).toEqual(['create-url', 'construct', 'dispatch', 'terminate', 'revoke-url']);
  });
});
