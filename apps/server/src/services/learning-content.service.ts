export interface LearningMaterialReference {
  title: string;
  url: string | null;
  locator: string;
  focus: string;
}

export interface DerivationGuide {
  required: boolean;
  basis: string;
  steps: string[];
}

export function extractKnowledgeTags(title: string): string[] {
  return title
    .replace(/[`*]/g, '')
    .split(/[、，,与和及\/：:（）()]/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2)
    .slice(0, 6);
}

function learningMaterialUrl(url: string) {
  const match = url.match(/^\.\.\/chinese-guides\/([a-z0-9][a-z0-9.-]*\.md)#([\p{L}\p{N}_-]+)$/iu);
  const guide = match?.[1];
  const anchor = match?.[2];
  if (!guide || !anchor || guide.includes('..')) return url;
  return `/knowledge/materials/${encodeURIComponent(guide)}/${encodeURIComponent(anchor)}`;
}

export function extractLearningMaterialReferences(markdown: string, pointTitle: string): LearningMaterialReference[] {
  const tags = extractKnowledgeTags(pointTitle);
  const fallbackFocus = tags[0] ?? pointTitle;
  const references: LearningMaterialReference[] = [];
  for (const match of markdown.matchAll(/\[([^\]]+)]\(([^)]+)\)/g)) {
    const title = match[1]?.replace(/^中文[｜|]\s*/, '').trim();
    const rawUrl = match[2]?.trim();
    if (!title || !rawUrl) continue;
    const hash = rawUrl.includes('#') ? decodeURIComponent(rawUrl.split('#').pop() ?? '') : '';
    references.push({
      title,
      url: learningMaterialUrl(rawUrl),
      locator: hash
        ? `打开后定位到“${hash.replace(/[-_]/g, ' ')}”章节`
        : `打开后使用页面查找定位“${fallbackFocus}”相关段落`,
      focus: tags.slice(0, 3).join('、') || pointTitle,
    });
  }
  if (references.length) return references.slice(0, 8);
  return [{
    title: `${pointTitle} 学习资料`,
    url: null,
    locator: `在当前资料正文中定位“${fallbackFocus}”相关段落`,
    focus: tags.slice(0, 3).join('、') || pointTitle,
  }];
}

export function extractMinimumOutput(spec: string): string | null {
  const compact = spec.replace(/\s+/g, ' ').trim();
  return compact.match(/首考题\s*3（最小产出）：(.+?)(?:；首考题\s*4|命题边界：|$)/)?.[1]?.trim() ?? null;
}

export function buildDerivationGuide(
  pointTitle: string,
  references: LearningMaterialReference[],
  required: boolean,
): DerivationGuide {
  const source = references[0];
  return {
    required,
    basis: required
      ? `依据“${source?.title ?? pointTitle}”中的机制与边界，把资料规则迁移到题目给定的小场景。`
      : `答案可从“${source?.title ?? pointTitle}”的指定位置直接定位。`,
    steps: required
      ? [
          '先从资料中写出直接适用的定义、规则或不变量。',
          '把题目给定的输入和约束逐项映射到这些规则。',
          '按“规则 → 条件 → 中间结果 → 结论”写出推导链。',
          '用资料中的边界或反例检查结论是否仍然成立。',
        ]
      : ['按资料定位打开对应章节。', '摘出直接回答题目的定义或规则。', '按题目指定格式重新组织，不补充资料外结论。'],
  };
}
