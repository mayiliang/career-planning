const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function safeExternalLink(label: string, href: string): string {
  try {
    const url = new URL(href);
    if (!['http:', 'https:'].includes(url.protocol)) return escapeHtml(label);
    return `<a href="${escapeHtml(url.toString())}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}<span aria-hidden="true">↗</span></a>`;
  } catch {
    return escapeHtml(label);
  }
}

function renderInline(source: string) {
  const tokens: string[] = [];
  const token = (html: string) => `@@CA_MD_${tokens.push(html) - 1}@@`;
  let value = source
    .replace(/`([^`\n]+)`/g, (_match, code: string) => token(`<code>${escapeHtml(code)}</code>`))
    .replace(/\[([^\]]+)]\(([^)\s]+)\)/g, (_match, label: string, href: string) => token(safeExternalLink(label, href)))
    .replace(/(^|\s)(https?:\/\/[^\s<]+)/g, (_match, prefix: string, href: string) => `${prefix}${token(safeExternalLink(href, href))}`);

  value = escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/(^|\s)\*([^*\n]+)\*(?=\s|$)/g, '$1<em>$2</em>')
    .replace(/@@CA_MD_(\d+)@@/g, (_match, index: string) => tokens[Number(index)] ?? '');
  return value;
}

function renderTable(lines: string[]) {
  const cells = (line: string) => line.replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
  const [header, , ...body] = lines.map(cells);
  return `<table><thead><tr>${(header ?? []).map((cell) => `<th>${renderInline(cell)}</th>`).join('')}</tr></thead><tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

/** 安全渲染学习笔记常用 Markdown；原始 HTML 会被转义，外链只允许 http/https。 */
export function renderMarkdown(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const output: string[] = [];
  let paragraph: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let quote: string[] = [];

  const closeParagraph = () => {
    if (paragraph.length) output.push(`<p>${paragraph.map(renderInline).join('<br>')}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (listType) output.push(`</${listType}>`);
    listType = null;
  };
  const closeQuote = () => {
    if (quote.length) output.push(`<blockquote><p>${quote.map(renderInline).join('<br>')}</p></blockquote>`);
    quote = [];
  };
  const closeBlocks = () => { closeParagraph(); closeList(); closeQuote(); };

  for (let index = 0; index < lines.length; index += 1) {
    const source = lines[index] ?? '';
    const trimmed = source.trim();

    const fence = trimmed.match(/^```([\w+-]*)$/);
    if (fence) {
      closeBlocks();
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !(lines[index] ?? '').trim().startsWith('```')) {
        code.push(lines[index] ?? '');
        index += 1;
      }
      const language = fence[1]?.replace(/[^\w+-]/g, '') || 'text';
      output.push(`<pre><code class="language-${language}">${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    if (trimmed.includes('|') && /^\s*\|?\s*:?-{3,}/.test(lines[index + 1] ?? '')) {
      closeBlocks();
      const tableLines = [source, lines[index + 1] ?? ''];
      index += 2;
      while (index < lines.length && (lines[index] ?? '').includes('|') && (lines[index] ?? '').trim()) {
        tableLines.push(lines[index] ?? '');
        index += 1;
      }
      index -= 1;
      output.push(renderTable(tableLines));
      continue;
    }

    if (!trimmed) { closeBlocks(); continue; }
    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      closeBlocks();
      const level = heading[1]!.length;
      output.push(`<h${level}>${renderInline(heading[2]!)}</h${level}>`);
      continue;
    }
    if (/^(---+|___+|\*\*\*+)$/.test(trimmed)) { closeBlocks(); output.push('<hr>'); continue; }
    if (trimmed.startsWith('>')) {
      closeParagraph(); closeList();
      quote.push(trimmed.replace(/^>\s?/, ''));
      continue;
    }
    closeQuote();

    const task = trimmed.match(/^[-*+]\s+\[([ xX])]\s+(.+)$/);
    const unordered = trimmed.match(/^[-*+]\s+(.+)$/);
    const ordered = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (task || unordered || ordered) {
      closeParagraph();
      const targetType = ordered ? 'ol' : 'ul';
      if (listType !== targetType) { closeList(); listType = targetType; output.push(`<${targetType}>`); }
      if (task) output.push(`<li class="task-item"><input type="checkbox" disabled${task[1]?.toLowerCase() === 'x' ? ' checked' : ''}> <span>${renderInline(task[2]!)}</span></li>`);
      else output.push(`<li>${renderInline((ordered?.[1] ?? unordered?.[1])!)}</li>`);
      continue;
    }

    closeList();
    paragraph.push(source.trim());
  }
  closeBlocks();
  return output.join('');
}
