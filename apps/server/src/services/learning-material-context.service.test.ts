import { describe, expect, it } from 'vitest';
import { extractLocalMaterialContext } from './learning-material-context.service.js';

describe('本地中文讲义上下文', () => {
  it('只读取已链接的中文讲义章节，拒绝穿越与外链', () => {
    const context = extractLocalMaterialContext([
      '[TS-02 讲义](../chinese-guides/content-audit-01-03.md#ts-02)',
      '[非法](../chinese-guides/../knowledge-base/01-javascript-browser.md#js-01)',
      '[外链](https://example.com/guide.md#x)',
    ].join(' '));
    expect(context).toHaveLength(1);
    expect(context[0]?.source).toBe('content-audit-01-03.md#ts-02');
    expect(context[0]?.content).toContain('TS-02');
  });
});
