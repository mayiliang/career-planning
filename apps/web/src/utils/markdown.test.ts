import { describe, expect, it } from 'vitest';
import { clearMarkdownRenderCache, extractMarkdownHeadings, getMarkdownRenderCacheSize, renderMarkdown } from './markdown';

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

  it('把仓库中文讲义链接改写为可打开的站内资料页', () => {
    const html = renderMarkdown('[中文补充讲义](../chinese-guides/content-audit-01-03.md#react-06)');
    expect(html).toContain('href="/knowledge/materials/content-audit-01-03.md/react-06"');
    expect(html).not.toContain('unavailable-link');
    expect(html).not.toContain('target="_blank"');
  });

  it('支持现代 Markdown 的表格、任务、脚注、标记、代码高亮、数学公式和图形', () => {
    const html = renderMarkdown('# 标题\n\n**重点** 与 `const` 以及 ==标记==[^1]\n\n- [x] 已完成\n\n> 边界说明\n\n| 输入 | 输出 |\n| --- | --- |\n| 1 | 2 |\n\n$$E = mc^2$$\n\n```js\nconst result = 2;\n```\n\n```mermaid\ngraph LR\n A --> B\n```\n\n[^1]: 脚注内容');
    expect(html).toContain('<h1 id="标题">标题</h1>');
    expect(html).toContain('<strong>重点</strong>');
    expect(html).toContain('class="task-list-item-checkbox"');
    expect(html).toContain('checked=""');
    expect(html).toContain('<blockquote>');
    expect(html).toContain('<table>');
    expect(html).toContain('class="hljs"');
    expect(html).toContain('class="code-copy"');
    expect(html).toContain('<mark>标记</mark>');
    expect(html).toContain('class="katex-display"');
    expect(html).toContain('class="mermaid-diagram"');
    expect(html).toContain('class="footnotes-sep"');
  });

  it('为长讲义生成稳定且去重的标题锚点', () => {
    expect(extractMarkdownHeadings('## 运行时（Runtime）\n\n### 验证\n\n### 验证')).toEqual([
      { id: '运行时runtime', level: 2, title: '运行时（Runtime）' },
      { id: '验证', level: 3, title: '验证' },
      { id: '验证-1', level: 3, title: '验证' },
    ]);
    const html = renderMarkdown('## 运行时（Runtime）\n\n### 验证\n\n### 验证');
    expect(html).toContain('id="验证-1"');
  });

  it('兼容中文正文中紧邻后文的加粗术语', () => {
    const html = renderMarkdown('**运行时（Runtime）**是代码实际执行的阶段。**产出与边界。**继续验证。');
    expect(html).toContain('<strong>运行时（Runtime）</strong>');
    expect(html).toContain('<strong>产出与边界。</strong>');
    expect(html).not.toContain('**运行时');
    expect(html).not.toContain('**产出');
  });

  it('把模型 think 标签和显式 thinking 容器渲染为可折叠思考区', () => {
    const fromTag = renderMarkdown('<think>先核对 **边界**</think>最终回答');
    const fromContainer = renderMarkdown('::: thinking\n逐步推导\n:::\n');
    expect(fromTag).toContain('class="thinking-block"');
    expect(fromTag).toContain('<strong>边界</strong>');
    expect(fromContainer).toContain('AI 思考过程');
  });

  it('使用有界缓存复用流式 Markdown 快照', () => {
    clearMarkdownRenderCache();
    expect(renderMarkdown('同一个快照')).toBe(renderMarkdown('同一个快照'));
    expect(getMarkdownRenderCacheSize()).toBe(1);
    for (let index = 0; index < 140; index += 1) renderMarkdown(`快照 ${index}`);
    expect(getMarkdownRenderCacheSize()).toBeLessThanOrEqual(120);
  });
});
