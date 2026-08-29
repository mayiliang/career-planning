import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const guideRoot = join(repoRoot, 'docs', 'knowledge', 'chinese-guides');
const batches = JSON.parse(readFileSync(new URL('./pronunciation-batches.json', import.meta.url), 'utf8'));
const guideNames = [...new Set(Object.values(batches).flat())];
const guideSet = new Set(guideNames);
const graph = new Map();
const problems = [];

function directPrerequisites(markdown, guideName) {
  const start = markdown.indexOf('### 学习前先确认');
  if (start < 0) {
    problems.push(`${guideName}：缺少“学习前先确认”`);
    return [];
  }
  if (start > 900) problems.push(`${guideName}：前置入口离讲义头部过远`);
  const suffix = markdown.slice(start + '### 学习前先确认'.length);
  const nextHeading = suffix.search(/^###\s+/m);
  const section = nextHeading >= 0 ? suffix.slice(0, nextHeading) : suffix;
  const directLines = section.split(/\r?\n/).filter((line) => /^-\s*直接前置[：:]/u.test(line));
  const prerequisites = directLines.flatMap((line) => Array.from(
    line.matchAll(/\.\.\/chinese-guides\/([a-z0-9][a-z0-9.-]*\.md)#[\p{L}\p{N}_-]+/giu),
    (match) => match[1],
  ));
  if (directLines.some((line) => !/\.\.\/chinese-guides\//u.test(line))) {
    problems.push(`${guideName}：“直接前置”行缺少站内资料链接`);
  }
  if (new Set(prerequisites).size !== prerequisites.length) {
    problems.push(`${guideName}：直接前置列表存在重复链接`);
  }
  for (const prerequisite of prerequisites) {
    if (!guideSet.has(prerequisite)) problems.push(`${guideName}：直接前置 ${prerequisite} 超出 B01～B03 资料范围`);
    if (prerequisite === guideName) problems.push(`${guideName}：不能把自己列为前置`);
  }
  return [...new Set(prerequisites)];
}

for (const guideName of guideNames) {
  const markdown = readFileSync(join(guideRoot, guideName), 'utf8');
  const compactLength = markdown.replace(/\s/g, '').length;
  const isMainGuide = /^(?:js|ts|cs)-\d{2}-/i.test(guideName);
  const minimum = isMainGuide ? 5_000 : 1_200;
  if (compactLength < minimum) {
    problems.push(`${guideName}：正文仅 ${compactLength} 字符，低于${isMainGuide ? '主讲义' : '前置短文'}深度门槛 ${minimum}`);
  }
  if (/挑战前自检|固定\s*fixture|为了掌握挑战|能通过挑战|与挑战固定输入对齐|讲义内置挑战/.test(markdown)) {
    problems.push(`${guideName}：正文仍按站内挑战组织`);
  }
  graph.set(guideName, directPrerequisites(markdown, guideName));
}

function reaches(from, target, seen = new Set()) {
  if (from === target) return true;
  if (seen.has(from)) return false;
  seen.add(from);
  return (graph.get(from) ?? []).some((next) => reaches(next, target, seen));
}

for (const guideName of guideNames) {
  const direct = graph.get(guideName) ?? [];
  for (let left = 0; left < direct.length; left += 1) {
    for (let right = 0; right < direct.length; right += 1) {
      if (left === right) continue;
      const candidate = direct[left];
      const parent = direct[right];
      if (reaches(parent, candidate)) {
        problems.push(`${guideName}：${candidate} 已由 ${parent} 递归包含，不应重复列为直接前置`);
      }
    }
  }
  for (const prerequisite of direct) {
    if (reaches(prerequisite, guideName)) problems.push(`${guideName}：与 ${prerequisite} 形成前置依赖环`);
  }
}

if (problems.length) {
  console.error('B01～B03 学习资料结构检查失败：');
  for (const problem of [...new Set(problems)]) console.error(`- ${problem}`);
  process.exit(1);
}

const edgeCount = [...graph.values()].reduce((sum, prerequisites) => sum + prerequisites.length, 0);
console.log(`B01～B03 学习资料结构检查通过：${guideNames.length} 份资料，${edgeCount} 条直接前置，无环且无传递性重复。`);
