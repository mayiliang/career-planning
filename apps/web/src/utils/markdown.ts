import MarkdownIt from 'markdown-it';
import createDOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdownLanguage from 'highlight.js/lib/languages/markdown';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import { katex } from '@mdit/plugin-katex';
import container from 'markdown-it-container';
import footnote from 'markdown-it-footnote';
import mark from 'markdown-it-mark';
import sub from 'markdown-it-sub';
import sup from 'markdown-it-sup';
import taskLists from 'markdown-it-task-lists';

const MAX_CACHE_ENTRIES = 120;
type MarkdownInstance = InstanceType<typeof MarkdownIt>;
type RenderRule = NonNullable<MarkdownInstance['renderer']['rules']['fence']>;
const renderCache = new Map<string, string>();
const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('css', css);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('markdown', markdownLanguage);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('yaml', yaml);

function remember(source: string, html: string) {
  renderCache.delete(source);
  renderCache.set(source, html);
  if (renderCache.size > MAX_CACHE_ENTRIES) {
    const oldest = renderCache.keys().next().value as string | undefined;
    if (oldest !== undefined) renderCache.delete(oldest);
  }
}

function normalizeThinkingBlocks(source: string) {
  return source.replace(/<think>\s*([\s\S]*?)\s*<\/think>/gi, (_match, content: string) => `\n::: thinking\n${content}\n:::\n`);
}

function isSafeLink(href: string) {
  if (href.startsWith('#') || href.startsWith('/')) return true;
  try {
    return ['http:', 'https:', 'mailto:'].includes(new URL(href).protocol);
  } catch {
    return false;
  }
}

const markdown: MarkdownInstance = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: false,
  highlight(code, language): string {
    const normalized = language.trim().toLowerCase();
    if (normalized && hljs.getLanguage(normalized)) {
      return `<pre class="hljs"><code>${hljs.highlight(code, { language: normalized, ignoreIllegals: true }).value}</code></pre>`;
    }
    return `<pre class="hljs"><code>${escapeHtml(code)}</code></pre>`;
  },
});

markdown.use(katex, {
  delimiters: 'all',
  mathFence: true,
  throwOnError: false,
  strict: 'warn',
});
markdown.use(footnote);
markdown.use(mark);
markdown.use(sub);
markdown.use(sup);
markdown.use(taskLists, { enabled: false, label: true, labelAfter: true });
markdown.use(container, 'thinking', {
  validate: (params: string) => /^thinking(?:\s|$)/.test(params.trim()),
  render: (tokens: Array<{ nesting: number }>, index: number) => tokens[index]?.nesting === 1
    ? '<details class="thinking-block" open><summary><span>AI 思考过程</span><small>模型提供，可能不完整</small></summary><div class="thinking-block__content">\n'
    : '</div></details>\n',
});
for (const kind of ['tip', 'note', 'warning', 'danger']) {
  markdown.use(container, kind, {
    validate: (params: string) => new RegExp(`^${kind}(?:\\s|$)`).test(params.trim()),
    render: (tokens: Array<{ nesting: number; info?: string }>, index: number) => {
      if (tokens[index]?.nesting !== 1) return '</div>\n';
      const title = tokens[index]?.info?.trim().slice(kind.length).trim() || ({ tip: '提示', note: '说明', warning: '注意', danger: '警告' }[kind] ?? kind);
      return `<div class="markdown-callout markdown-callout--${kind}"><strong>${markdown.utils.escapeHtml(title)}</strong>\n`;
    },
  });
}

const defaultFence = markdown.renderer.rules.fence!;
const fenceRule: RenderRule = (tokens, index, options, env, renderer) => {
  const token = tokens[index];
  if (token?.info.trim().split(/\s+/)[0]?.toLowerCase() === 'mermaid') {
    return `<div class="mermaid-diagram" data-mermaid-state="pending"><pre class="mermaid-source"><code>${markdown.utils.escapeHtml(token.content)}</code></pre><p class="mermaid-status">正在绘制图形…</p></div>`;
  }
  return defaultFence(tokens, index, options, env, renderer);
};
markdown.renderer.rules.fence = fenceRule;

const fallbackLinkOpen: RenderRule = (tokens, index, options, _env, renderer) => renderer.renderToken(tokens, index, options);
const defaultLinkOpen = markdown.renderer.rules.link_open ?? fallbackLinkOpen;
const linkOpenRule: RenderRule = (tokens, index, options, env, renderer) => {
  const hrefIndex = tokens[index]?.attrIndex('href') ?? -1;
  const href = String(hrefIndex >= 0 ? tokens[index]?.attrs?.[hrefIndex]?.[1] ?? '' : '');
  if (!isSafeLink(href)) {
    const token = tokens[index];
    if (token) {
      token.tag = 'span';
      token.attrs = (token.attrs ?? []).filter(([name]) => name !== 'href');
      token.attrJoin('class', 'unavailable-link');
      for (let cursor = index + 1; cursor < tokens.length; cursor += 1) {
        if (tokens[cursor]?.type === 'link_close') {
          tokens[cursor]!.tag = 'span';
          break;
        }
      }
    }
    return renderer.renderToken(tokens, index, options);
  }
  if (/^https?:/i.test(href)) {
    tokens[index]?.attrSet('target', '_blank');
    tokens[index]?.attrSet('rel', 'noopener noreferrer');
  }
  return defaultLinkOpen(tokens, index, options, env, renderer);
};
markdown.renderer.rules.link_open = linkOpenRule;

const purifier = typeof window === 'undefined' ? null : createDOMPurify(window);

/**
 * 渲染现代 Markdown。原始 HTML 默认关闭，结果再经 DOMPurify 清洗。
 * LRU 缓存避免流式输出中对相同快照重复解析。
 */
export function renderMarkdown(source: string): string {
  const normalized = normalizeThinkingBlocks(source.replace(/\r\n/g, '\n'));
  const cached = renderCache.get(normalized);
  if (cached !== undefined) {
    renderCache.delete(normalized);
    renderCache.set(normalized, cached);
    return cached;
  }
  const rendered = markdown.render(normalized);
  const sanitized = purifier
    ? purifier.sanitize(rendered, {
      USE_PROFILES: { html: true, svg: true, mathMl: true },
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
      FORBID_ATTR: ['onerror', 'onload'],
      ADD_ATTR: ['target', 'rel'],
    })
    : rendered;
  remember(normalized, sanitized);
  return sanitized;
}

export function clearMarkdownRenderCache() {
  renderCache.clear();
}

export function getMarkdownRenderCacheSize() {
  return renderCache.size;
}
