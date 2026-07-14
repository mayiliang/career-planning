import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './markdown';

describe('学习资料 Markdown 渲染', () => {
  it('把 http/https 资料渲染为新窗口可点击链接', () => {
    const html = renderMarkdown('- [MDN 闭包](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Closures)');
    expect(html).toContain('href="https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Closures"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('转义 HTML 并拒绝非 http 协议', () => {
    const html = renderMarkdown('<script>alert(1)</script> [危险](javascript:alert(1))');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('href="javascript:');
    expect(html).toContain('&lt;script&gt;');
  });
});
