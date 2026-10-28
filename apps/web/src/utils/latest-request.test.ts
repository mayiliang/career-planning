import { describe, expect, it } from 'vitest';
import { createLatestRequest } from './latest-request';

describe('只接收最新请求结果', () => {
  it('新请求使旧请求的成功、失败和 finally 回调全部失效', async () => {
    const latest = createLatestRequest();
    const old = latest.start();
    let resolveOld!: () => void;
    const updates: string[] = [];
    const oldResponse = new Promise<void>(resolve => { resolveOld = resolve; }).then(() => {
      if (old.isCurrent()) updates.push('old-success');
    }).finally(() => {
      if (old.isCurrent()) updates.push('old-finally');
    });
    const current = latest.start();
    expect(old.signal.aborted).toBe(true);
    resolveOld();
    await oldResponse;
    expect(updates).toEqual([]);
    expect(current.isCurrent()).toBe(true);
  });

  it('取消后拒绝后续结果，同时允许下一次加载', () => {
    const latest = createLatestRequest();
    const current = latest.start();
    latest.cancel();
    expect(current.signal.aborted).toBe(true);
    expect(current.isCurrent()).toBe(false);
    expect(latest.start().isCurrent()).toBe(true);
  });
});
