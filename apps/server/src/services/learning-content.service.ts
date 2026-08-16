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

/**
 * 严格考核的可提交部分。练习和掌握挑战必须复用原题，而不是再根据标题猜一个
 * "正常/边界/异常" 的通用题目；否则会丢失知识点已经写明的具体产出和排错范围。
 */
export interface StrictAssessmentTasks {
  minimumOutput: string;
  constrainedDebugging: string;
}

export type PracticeProfile = 'THEORY_ONLY' | 'EXAMPLE_DRIVEN' | 'CODING' | 'DEBUGGING' | 'TOOL_OPERATION' | 'DESIGN_CASE';

/** 每种挑战形态都要留下可逐项检查的证据，不以字数或泛关键词代替。 */
export const PRACTICE_SECTION_HEADINGS: Record<PracticeProfile, string[]> = {
  THEORY_ONLY: ['首考题 3：结论与最小产出', '固定输入与约束', '预期结论', '实际结论', '首考题 4：异常、假设与证伪', '资料依据与定位', '验证证据'],
  EXAMPLE_DRIVEN: ['首考题 3：最小示例', '固定输入', '预期结果', '实际结果', '首考题 4：异常与根因', '资料依据与定位', '验证证据'],
  CODING: ['首考题 3：实现说明', '固定输入', '预期输出', '实际输出', '首考题 4：异常、根因与修复', '资料机制映射', '验证证据'],
  DEBUGGING: ['首考题 3：复现基线', '固定输入与预期', '实际现象', '首考题 4：异常、假设与证伪', '根因与修复', '回归验证证据', '资料依据与定位'],
  TOOL_OPERATION: ['首考题 3：操作产物', '固定输入与环境', '命令或配置', '预期与实际结果', '首考题 4：异常、根因与修复', '验证证据', '资料依据与定位'],
  DESIGN_CASE: ['首考题 3：方案产出', '固定场景与约束', '候选方案与取舍', '预期与实际结果', '首考题 4：异常、假设与证伪', '验证证据', '资料依据与定位'],
};

export function practiceSubmissionTemplate(profile: PracticeProfile) {
  return PRACTICE_SECTION_HEADINGS[profile].map((heading) => `# ${heading}\n`).join('\n');
}

export function practiceEvidenceRequirements(profile: PracticeProfile) {
  return ({
    THEORY_ONLY: ['结论能回指资料中的规则与边界', '题 4 至少写出一个可证伪的异常假设'],
    EXAMPLE_DRIVEN: ['同一固定输入下预期和实际结果可比较', '题 4 异常有复现、根因或排除证据'],
    CODING: ['代码保留固定输入、预期输出、实际输出和断言', '题 4 异常有根因、修复与回归证据'],
    DEBUGGING: ['现象、假设、证伪、根因、修复和回归形成闭环', '不得用“重试成功”替代复现证据'],
    TOOL_OPERATION: ['命令或配置、环境和产物可复核', '异常处理有实际结果与验证记录'],
    DESIGN_CASE: ['约束、候选方案、取舍和验证结果完整', '异常假设可被实际证据支持或否定'],
  } as const)[profile];
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
  // 练习与考核合同必须列出本点的全部当前资料；静默截断会让后续“仅可依据”
  // 变成错误的资料边界。界面可以折叠展示，但服务层不能丢失引用。
  if (references.length) return references;
  return [{
    title: `${pointTitle} 学习资料`,
    url: null,
    locator: `在当前资料正文中定位“${fallbackFocus}”相关段落`,
    focus: tags.slice(0, 3).join('、') || pointTitle,
  }];
}

export function extractMinimumOutput(spec: string): string | null {
  return extractStrictAssessmentTasks(spec)?.minimumOutput ?? null;
}

export function extractStrictAssessmentTasks(spec: string): StrictAssessmentTasks | null {
  const compact = spec.replace(/\s+/g, ' ').trim();
  const match = compact.match(
    /首考题\s*3(?:[（(]\s*最小产出\s*[）)])?\s*[：:]\s*(.+?)；\s*首考题\s*4(?:[（(]\s*受限排错\s*[）)])?\s*[：:]\s*(.+?)(?=；\s*首考题\s*5(?:[（(]|\s*[：:])|\s*命题边界[：:]|$)/,
  );
  if (!match?.[1] || !match[2]) return null;
  return { minimumOutput: match[1].trim(), constrainedDebugging: match[2].trim() };
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
