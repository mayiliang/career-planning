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

  it('支持笔记常用的标题、强调、任务清单、表格、引用和代码块', () => {
    const html = renderMarkdown('# 标题\n\n**重点** 与 `const`\n\n- [x] 已完成\n\n> 边界说明\n\n| 输入 | 输出 |\n| --- | --- |\n| 1 | 2 |\n\n```js\nconst result = 2;\n```');
    expect(html).toContain('<h1>标题</h1>');
    expect(html).toContain('<strong>重点</strong>');
    expect(html).toContain('type="checkbox" disabled checked');
    expect(html).toContain('<blockquote>');
    expect(html).toContain('<table>');
    expect(html).toContain('class="language-js"');
  });
});
