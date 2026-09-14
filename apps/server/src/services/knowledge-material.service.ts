import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { projectRoot } from '../config/index.js';

const guideRoot = resolve(projectRoot, 'docs', 'knowledge', 'chinese-guides');
const guideNamePattern = /^[a-z0-9][a-z0-9.-]*\.md$/i;
const anchorPattern = /^[\p{L}\p{N}_-]+$/u;

export class KnowledgeMaterialError extends Error {
  constructor(
    message: string,
    public readonly code: 'INVALID_MATERIAL_PATH' | 'MATERIAL_NOT_FOUND',
  ) {
    super(message);
  }
}

function normalizeAnchor(value: string) {
  return value.trim().toLocaleLowerCase('en-US');
}

function headingSlug(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('en-US')
    .replace(/[`*_~]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function headingMatches(heading: string, anchor: string) {
  const expected = normalizeAnchor(anchor);
  const code = heading.match(/\b[A-Z][A-Z0-9]*-\d+\b/i)?.[0];
  return normalizeAnchor(code ?? '') === expected || headingSlug(heading) === expected;
}

/** 只扫描正文中的标题；Shell 注释和示例 Markdown 不构成章节边界。 */
export function extractMaterialHeadings(lines: string[]) {
  const headings: Array<{ line: number; level: number; title: string }> = [];
  let fence: { marker: string; length: number } | null = null;
  for (const [line, text] of lines.entries()) {
    const delimiter = text.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (fence) {
      if (delimiter && delimiter[1]?.[0] === fence.marker
        && delimiter[1].length >= fence.length && !delimiter[2]?.trim()) fence = null;
      continue;
    }
    if (delimiter && !(delimiter[1]?.[0] === '`' && delimiter[2]?.includes('`'))) {
      fence = { marker: delimiter[1]![0]!, length: delimiter[1]!.length };
      continue;
    }
    const match = text.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (match) headings.push({ line, level: match[1]!.length, title: match[2]!.trim() });
  }
  return headings;
}

export function validateKnowledgeMaterialPath(guide: string, anchor: string) {
  if (!guideNamePattern.test(guide) || guide.includes('..') || !anchorPattern.test(anchor)) {
    throw new KnowledgeMaterialError('学习资料路径无效', 'INVALID_MATERIAL_PATH');
  }
}

export async function getKnowledgeMaterial(guide: string, anchor: string) {
  validateKnowledgeMaterialPath(guide, anchor);

  let source: string;
  try {
    source = await readFile(resolve(guideRoot, guide), 'utf8');
  } catch {
    throw new KnowledgeMaterialError('学习资料不存在', 'MATERIAL_NOT_FOUND');
  }

  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const headings = extractMaterialHeadings(lines);
  const headingIndex = headings.findIndex(({ title }) => headingMatches(title, anchor));
  const heading = headings[headingIndex];
  if (!heading) {
    throw new KnowledgeMaterialError('学习资料章节不存在', 'MATERIAL_NOT_FOUND');
  }
  const { line: start, level, title } = heading;
  let end = headings.slice(headingIndex + 1).find((next) => next.level <= level)?.line ?? lines.length;
  while (
    end > start + 1
    && (/^\s*$/.test(lines[end - 1] ?? '') || /^\s*<a\s+id=["'][^"']+["']\s*><\/a>\s*$/i.test(lines[end - 1] ?? ''))
  ) {
    end -= 1;
  }

  return {
    guide,
    anchor: normalizeAnchor(anchor),
    title,
    markdown: lines.slice(start, end).join('\n').trim(),
  };
}
