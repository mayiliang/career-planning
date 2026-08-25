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
  let start = -1;
  let level = 0;
  let title = anchor;

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index]?.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (!match || !headingMatches(match[2] ?? '', anchor)) continue;
    start = index;
    level = match[1]?.length ?? 2;
    title = match[2]?.trim() ?? anchor;
    break;
  }

  if (start < 0) {
    throw new KnowledgeMaterialError('学习资料章节不存在', 'MATERIAL_NOT_FOUND');
  }

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const match = lines[index]?.match(/^(#{1,6})\s+/);
    if (match && (match[1]?.length ?? 7) <= level) {
      end = index;
      while (
        end > start + 1
        && (/^\s*$/.test(lines[end - 1] ?? '') || /^\s*<a\s+id=["'][^"']+["']\s*><\/a>\s*$/i.test(lines[end - 1] ?? ''))
      ) {
        end -= 1;
      }
      break;
    }
  }

  return {
    guide,
    anchor: normalizeAnchor(anchor),
    title,
    markdown: lines.slice(start, end).join('\n').trim(),
  };
}
