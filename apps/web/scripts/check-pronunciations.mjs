import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { basename, join } from 'node:path';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const guideRoot = join(repoRoot, 'docs', 'knowledge', 'chinese-guides');
const pronunciationRoot = join(repoRoot, 'apps', 'web', 'public', 'pronunciation');
const batches = JSON.parse(readFileSync(new URL('./pronunciation-batches.json', import.meta.url), 'utf8'));
const normalizeTerm = (value) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
const allProblems = [];
const summaries = [];

function collectKeyTerms(guideNames, problems) {
  const terms = new Map();
  for (const guideName of guideNames) {
    const guidePath = join(guideRoot, guideName);
    if (!existsSync(guidePath)) {
      problems.push(`资料不存在：${guideName}`);
      continue;
    }
    const markdown = readFileSync(guidePath, 'utf8').replace(/```[\s\S]*?```/g, ' ');
    for (const strongMatch of markdown.matchAll(/\*\*([^*\r\n]+)\*\*/g)) {
      const strongText = strongMatch[1].replaceAll('`', '').trim();
      const parenthetical = Array.from(strongText.matchAll(/[（(]([A-Za-z][A-Za-z0-9.' -]*)[）)]/g), (match) => match[1].trim());
      const selected = parenthetical.length
        ? parenthetical
        : /^[A-Za-z][A-Za-z0-9.' -]*$/.test(strongText) ? [strongText] : [];
      for (const term of selected) terms.set(normalizeTerm(term), term);
    }
  }
  return terms;
}

for (const [batch, guideNames] of Object.entries(batches)) {
  const problems = [];
  const assetRoot = join(pronunciationRoot, batch);
  const manifestPath = join(assetRoot, 'manifest.json');
  if (!existsSync(manifestPath)) {
    problems.push('缺少 manifest.json');
    allProblems.push(...problems.map((problem) => `${batch.toUpperCase()}：${problem}`));
    continue;
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const expectedTerms = collectKeyTerms(guideNames, problems);
  const manifestTerms = new Set(Object.keys(manifest.terms ?? {}));
  for (const key of expectedTerms.keys()) {
    if (!manifestTerms.has(key)) problems.push(`缺少关键术语发音：${expectedTerms.get(key)}`);
  }
  for (const key of manifestTerms) {
    if (!expectedTerms.has(key)) problems.push(`存在已经不再标记为关键术语的发音：${manifest.terms[key].text}`);
  }
  if (JSON.stringify(manifest.sourceGuides) !== JSON.stringify(guideNames)) {
    problems.push('发音清单中的资料范围与当前规则不一致');
  }
  if (manifest.voice?.culture !== 'en-US') problems.push('发音清单不是 en-US 美式英语');

  const referencedFiles = new Set();
  for (const [key, entry] of Object.entries(manifest.terms ?? {})) {
    const fileName = basename(entry.file);
    if (!/^[a-f0-9]{16}\.wav$/.test(fileName) || fileName !== entry.file) {
      problems.push(`发音文件名不安全：${key}`);
      continue;
    }
    const path = join(assetRoot, fileName);
    try {
      const header = readFileSync(path).subarray(0, 4).toString('ascii');
      if (statSync(path).size <= 44 || header !== 'RIFF') problems.push(`发音文件损坏：${entry.text}`);
    } catch {
      problems.push(`发音文件缺失：${entry.text}`);
    }
    referencedFiles.add(fileName);
  }
  for (const fileName of readdirSync(assetRoot).filter((name) => name.endsWith('.wav'))) {
    if (!referencedFiles.has(fileName)) problems.push(`存在未被清单引用的旧发音文件：${fileName}`);
  }
  allProblems.push(...problems.map((problem) => `${batch.toUpperCase()}：${problem}`));
  summaries.push(`${batch.toUpperCase()} ${guideNames.length} 份资料、${expectedTerms.size} 个关键术语`);
}

if (allProblems.length) {
  console.error('英文发音检查失败：');
  for (const problem of allProblems) console.error(`- ${problem}`);
  console.error('请在 Windows 上运行：pnpm --filter @career-atlas/web pronunciation:generate');
  process.exit(1);
}

console.log(`英文发音检查通过：${summaries.join('；')}，音频与清单一致。`);
