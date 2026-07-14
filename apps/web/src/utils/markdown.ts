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

/** 将本地可信 Markdown 子集安全渲染为可点击的学习资料。 */
export function renderMarkdown(markdown: string): string {
  const anchors: string[] = [];
  const withTokens = markdown.replace(/\[([^\]]+)]\((https?:\/\/[^)\s]+)\)/g, (_match, label: string, href: string) => {
    const index = anchors.push(safeExternalLink(label, href)) - 1;
    return `@@CAREER_ATLAS_LINK_${index}@@`;
  });

  const escaped = escapeHtml(withTokens)
    .replace(/(^|\s)(https?:\/\/[^\s<]+)/g, (_match, prefix: string, href: string) => `${prefix}${safeExternalLink(href, href)}`)
    .replace(/@@CAREER_ATLAS_LINK_(\d+)@@/g, (_match, index: string) => anchors[Number(index)] ?? '');

  const lines = escaped.split(/\r?\n/);
  const output: string[] = [];
  let listOpen = false;

  for (const sourceLine of lines) {
    const line = sourceLine.trim();
    const listMatch = line.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      if (!listOpen) output.push('<ul>');
      listOpen = true;
      output.push(`<li>${listMatch[1]}</li>`);
      continue;
    }
    if (listOpen) {
      output.push('</ul>');
      listOpen = false;
    }
    if (!line) continue;
    if (line.startsWith('### ')) output.push(`<h3>${line.slice(4)}</h3>`);
    else if (line.startsWith('## ')) output.push(`<h2>${line.slice(3)}</h2>`);
    else if (line.startsWith('# ')) output.push(`<h1>${line.slice(2)}</h1>`);
    else output.push(`<p>${line}</p>`);
  }
  if (listOpen) output.push('</ul>');
  return output.join('');
}
