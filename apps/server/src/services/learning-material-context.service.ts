import { readFileSync, realpathSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { projectRoot } from '../config/index.js';

const CHINESE_GUIDES_ROOT = resolve(projectRoot, 'docs/knowledge/chinese-guides');
const MAX_CONTEXT_CHARS = 24_000;
const MAX_SECTION_CHARS = 6_000;

/**
 * 将当前知识点明确链接到的本地中文讲义锚点转成 AI 可核对的正文。
 * 只允许 ../chinese-guides/<filename>.md#<anchor>；不访问网络、不跟随任意路径。
 */
export function extractLocalMaterialContext(studyMaterialMd: string) {
  const sections: Array<{ title: string; source: string; content: string }> = [];
  const seen = new Set<string>();
  for (const match of studyMaterialMd.matchAll(/\[([^\]]+)]\((\.\.\/chinese-guides\/[^)]+)\)/g)) {
    const title = match[1]?.trim();
    const parsed = parseGuideReference(match[2]?.trim() ?? '');
    if (!title || !parsed) continue;
    const key = `${parsed.file}#${parsed.anchor}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const content = readGuideSection(parsed.file, parsed.anchor);
    if (content) sections.push({ title, source: key, content });
  }
  let remaining = MAX_CONTEXT_CHARS;
  return sections.flatMap((section) => {
    if (remaining <= 0) return [];
    const content = section.content.slice(0, Math.min(MAX_SECTION_CHARS, remaining));
    remaining -= content.length;
    return [{ ...section, content }];
  });
}

function parseGuideReference(reference: string) {
  const match = reference.match(/^\.\.\/chinese-guides\/([a-z0-9][a-z0-9.-]*\.md)#([\p{L}\p{N}_-]+)$/iu);
  if (!match?.[1] || !match[2] || match[1].includes('..')) return null;
  return { file: match[1], anchor: decodeURIComponent(match[2]) };
}

function readGuideSection(file: string, anchor: string) {
  try {
    const candidate = resolve(CHINESE_GUIDES_ROOT, file);
    const root = realpathSync(CHINESE_GUIDES_ROOT);
    const resolved = realpathSync(candidate);
    if (!resolved.startsWith(`${root}${sep}`) || !resolved.endsWith('.md')) return null;
    const markdown = readFileSync(resolved, 'utf8').replace(/\r\n/g, '\n');
    const heading = new RegExp(`^(#{1,6})\\s+${escapeRegex(anchor)}(?:\\s|$).*?$`, 'mi').exec(markdown);
    if (!heading) return null;
    const level = heading[1]?.length;
    if (!level) return null;
    const start = heading.index;
    const after = start + heading[0].length;
    const rest = markdown.slice(after);
    const next = new RegExp(`^#{1,${level}}\\s+`, 'm').exec(rest);
    return markdown.slice(start, next?.index === undefined ? markdown.length : after + next.index).trim();
  } catch {
    return null;
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
