import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parseAllKnowledgeFiles } from './markdown.js';

const CHINESE_RESOURCE_PATTERN =
  /\[[^\]]+\]\((?:\.\.\/chinese-guides\/|https?:\/\/[^)]*(?:\/zh-CN\/|\/zh-cn\/|\/zh_cn\/|\/zh\/|zh-hans\.|cn\.vuejs\.org|cn\.vite\.dev|cn\.vitest\.dev|nodejs\.cn|node\.org\.cn|playwright\.nodejs\.cn|testing-library\.node\.org\.cn|eslint\.org\.cn|nuxt\.com\.cn|oi-wiki\.org|hl=zh-cn|hl=zh_cn|umijs\.org|ant\.design|lbs\.amap\.com|developer\.work\.weixin\.qq\.com|open\.dingtalk\.com|\.cn\/))[^)]*\)/i;
const LEGACY_TEMPLATE_PATTERN =
  /围绕「.+」的定义、机制、边界、反例和通过标准|围绕首考题 3 的产出给出一个失败现象|3 分钟向同事讲清是什么、什么时候用、如何验证没有用错|不得用未列资料或题目未点名的框架\/项目场景作为主要评分依据/;
const GENERIC_CONTRACT_PATTERN =
  /覆盖范围：必须从列出资料建立主题术语表|闭卷用状态图、数据流、时序或类型推导解释关键机制|对首考题 3 实施至少一个正常|3 分钟按问题、机制、选择、反例和验证证据五段复述|评分只依据列出资料/;

function extractMarkdownLinks(markdown: string): Array<{ markup: string; url: string }> {
  return [...markdown.matchAll(/(\[[^\]]+\]\(([^)]+)\))/g)].map((match) => ({
    markup: match[1] ?? '',
    url: match[2] ?? '',
  }));
}

function learningResourceLabels(markdown: string): Set<string> {
  return new Set(
    [...markdown.matchAll(/\[([^\]]+)\]\([^)]+\)/g)]
      .map((match) => match[1]?.trim() ?? '')
      .filter(Boolean),
  );
}

function strictAssessmentSourceTitles(assessmentSpec: string): string[] {
  const sourceQuestion = assessmentSpec.match(
    /首考题\s*1（资料定位）：(.+?)(?:；首考题\s*2（机制解释）：|$)/,
  )?.[1] ?? '';
  const allowedSources = sourceQuestion.match(/只允许使用(.+?)(?:，|；|$)/)?.[1] ?? '';
  return [...allowedSources.matchAll(/《([^》]+)》/g)]
    .map((match) => match[1]?.trim() ?? '')
    .filter(Boolean);
}

function strictAssessmentDeclaredSourceTitles(assessmentSpec: string): string[] {
  const declaredSources = assessmentSpec.match(/题源包含(.+?)(?:；|。|$)/)?.[1] ?? '';
  return [...declaredSources.matchAll(/《([^》]+)》/g)]
    .map((match) => match[1]?.trim() ?? '')
    .filter(Boolean);
}

function isChineseResource(markup: string): boolean {
  if (/https?:\/\/nodejs\.cn\/en\//i.test(markup)) {
    return false;
  }
  if (/https?:\/\/mobile\.ant\.design\//i.test(markup)) {
    return false;
  }
  if (
    /https?:\/\/qiankun\.umijs\.org\//i.test(markup) &&
    !/https?:\/\/qiankun\.umijs\.org\/zh\//i.test(markup)
  ) {
    return false;
  }
  return CHINESE_RESOURCE_PATTERN.test(markup);
}

function findProjectRoot(): string {
  let current = process.cwd();

  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
      return current;
    }
    current = path.dirname(current);
  }

  throw new Error('无法定位项目根目录');
}

const AUDIT_REPORTS = [
  { file: '01-03.md', domains: ['01', '02', '03'] },
  { file: '04-06.md', domains: ['04', '05', '06'] },
  { file: '07-09.md', domains: ['07', '08', '09'] },
  { file: '10-12.md', domains: ['10', '11', '12'] },
  { file: '13-14.md', domains: ['13', '14'] },
  { file: '15-17.md', domains: ['15', '16', '17'] },
  { file: '18-20.md', domains: ['18', '19', '20'] },
] as const;

function collectMarkdownFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectMarkdownFiles(entryPath);
    return entry.isFile() && entry.name.endsWith('.md') ? [entryPath] : [];
  });
}

function normalizeMarkdownAnchor(value: string): string {
  return decodeURIComponent(value)
    .replace(/<[^>]*>/g, '')
    .replace(/\[[^\]]*\]\([^)]*\)/g, '')
    .trim()
    .toLocaleLowerCase()
    .replace(/[!"#$%&'()*+,./:;<=>?@[\\\]^_`{|}~]/g, '')
    .replace(/\s+/g, '-');
}

function markdownAnchors(markdown: string): Set<string> {
  return new Set(
    [...markdown.matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gm)]
      .map((match) => normalizeMarkdownAnchor(match[1] ?? ''))
      .filter(Boolean),
  );
}

function localMarkdownLinkProblems(root: string): string[] {
  const knowledgeDirectory = path.join(root, 'docs', 'knowledge');
  const problems: string[] = [];

  for (const sourceFile of collectMarkdownFiles(knowledgeDirectory)) {
    const source = fs.readFileSync(sourceFile, 'utf8');
    for (const { url } of extractMarkdownLinks(source)) {
      const target = url.trim();
      if (!target || /^(?:https?:|mailto:|tel:|data:)/i.test(target)) continue;

      const [rawPath, rawAnchor = ''] = target.split('#', 2);
      // Links to assets are intentionally out of scope; this guard verifies Markdown learning material.
      if (rawPath && !/\.md$/i.test(rawPath)) continue;
      const targetFile = rawPath
        ? path.resolve(path.dirname(sourceFile), decodeURIComponent(rawPath))
        : sourceFile;

      if (!fs.existsSync(targetFile) || !fs.statSync(targetFile).isFile()) {
        problems.push(`${path.relative(root, sourceFile)} -> ${target}: missing Markdown file`);
        continue;
      }
      if (rawAnchor) {
        const anchors = markdownAnchors(fs.readFileSync(targetFile, 'utf8'));
        if (!anchors.has(normalizeMarkdownAnchor(rawAnchor))) {
          problems.push(`${path.relative(root, sourceFile)} -> ${target}: missing anchor`);
        }
      }
    }
  }
  return problems;
}

function auditCodes(markdown: string): string[] {
  const tables: string[][] = [];
  let currentTable: string[] = [];
  for (const line of [...markdown.split(/\r?\n/), '']) {
    if (/^\|/.test(line)) {
      currentTable.push(line);
    } else if (currentTable.length > 0) {
      tables.push(currentTable);
      currentTable = [];
    }
  }

  return tables.flatMap((table) => {
    const header = table[0]?.split('|').slice(1, -1).map((cell) => cell.trim()) ?? [];
    const isPointSummary = /知识点|code/i.test(header[0] ?? '')
      && header.some((cell) => /覆盖/.test(cell))
      && header.some((cell) => /状态|结论|verdict|status/i.test(cell));
    if (!isPointSummary) return [];

    return table.slice(2).flatMap((line) => {
      const firstCell = line.split('|')[1]?.trim() ?? '';
      const match = firstCell.match(/^`?([A-Z][A-Z0-9]*-[0-9]+)`?$/);
      return match?.[1] ? [match[1]] : [];
    });
  });
}

type ReportedResource = {
  deleted: boolean;
  hasRequiredAuditFields: boolean;
  hasLowBodyRelevance: boolean;
  rawUrl: string;
  unverified: boolean;
};

function hasRequiredBodyRelevanceDeclaration(line: string): boolean {
  return /正文相关度\s*(?:≥|>=)\s*80\s*[%％]/.test(line);
}

function hasCoverageRoleDeclaration(line: string): boolean {
  return /覆盖分工\s*[=＝]\s*[^\s|]/.test(line);
}

function isHistoricalDeletionLine(line: string): boolean {
  return /删除|已从当前学习资料移除|历史(?:已)?移除/.test(line);
}

function hasExplicitLowBodyRelevance(line: string): boolean {
  if (
    /(?:正文相关度|相关度百分比)\s*(?:为|[=＝:：])?\s*(?:低于|不足|[<＜])\s*80\s*[%％]?/.test(line)
  ) {
    return true;
  }

  const declaredPercentages = line.matchAll(
    /(?:正文相关度|相关度百分比)\s*(?:为|[=＝:：])?\s*约?\s*(\d{1,3})(?:\s*[—–~-]\s*(\d{1,3}))?\s*[%％]/g,
  );
  for (const match of declaredPercentages) {
    const lowerBound = Number(match[1]);
    if (lowerBound < 80) return true;
  }

  const declaredLowerBounds = line.matchAll(
    /(?:正文相关度|相关度百分比)\s*(?:≥|>=)\s*(\d{1,3})\s*[%％]/g,
  );
  return [...declaredLowerBounds].some((match) => Number(match[1]) < 80);
}

function auditResourceMap(markdown: string): Map<string, Map<string, ReportedResource>> {
  const result = new Map<string, Map<string, ReportedResource>>();
  for (const line of markdown.split(/\r?\n/).filter((candidate) => /^\|/.test(candidate))) {
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    const firstCode = cells[0]?.match(/^`?([A-Z][A-Z0-9]*-[0-9]+)`?$/)?.[1];
    const secondCode = cells[1]?.match(/^`?([A-Z][A-Z0-9]*-[0-9]+)`?$/)?.[1];
    const code = firstCode ?? (extractMarkdownLinks(cells[0] ?? '').length > 0 ? secondCode : undefined);
    if (!code) continue;

    const resources = result.get(code) ?? new Map<string, ReportedResource>();
    for (const { url } of extractMarkdownLinks(line)) {
      const normalized = normalizeLearningResourceUrl(url);
      const previous = resources.get(normalized);
      const lineIsDeleted = isHistoricalDeletionLine(line);
      resources.set(normalized, {
        deleted: previous ? previous.deleted && lineIsDeleted : lineIsDeleted,
        hasRequiredAuditFields:
          (previous?.hasRequiredAuditFields ?? false)
          || (
            !lineIsDeleted
            && hasRequiredBodyRelevanceDeclaration(line)
            && hasCoverageRoleDeclaration(line)
          ),
        hasLowBodyRelevance:
          (previous?.hasLowBodyRelevance ?? false)
          || (!lineIsDeleted && hasExplicitLowBodyRelevance(line)),
        rawUrl: url,
        unverified: previous
          ? previous.unverified
            || (!lineIsDeleted && /无法正文核验|未正文核验|未核验|无法读取/.test(line))
          : !lineIsDeleted && /无法正文核验|未正文核验|未核验|无法读取/.test(line),
      });
    }
    result.set(code, resources);
  }
  return result;
}

function hasChineseMainSource(studyMaterial: string): boolean {
  return extractMarkdownLinks(studyMaterial).some(({ markup, url }) => {
    if (/^\.\.\/chinese-guides\/[^#]+\.md#[^#\s]+$/i.test(url)) return true;
    return /^https?:\/\//i.test(url) && isChineseResource(markup);
  });
}

function hasImmediateEnglishVersionMarker(studyMaterial: string, linkMarkup: string): boolean {
  const linkIndex = studyMaterial.indexOf(linkMarkup);
  if (linkIndex < 0) return false;
  const suffix = studyMaterial.slice(linkIndex + linkMarkup.length);
  return /^\s*[（(【[]\s*英文原文\s*[,，、;；:：]\s*仅用于版本核验\s*[）)】\]]/.test(suffix);
}

function normalizeLearningResourceUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) {
    const parsed = new URL(url);
    parsed.hash = '';
    parsed.hostname = parsed.hostname.toLocaleLowerCase();
    parsed.searchParams.sort();
    if (parsed.pathname.length > 1) parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    return parsed.toString();
  }

  const [filePath, anchor = ''] = url.split('#', 2);
  const normalizedPath = path.posix.normalize(filePath.replace(/\\/g, '/'));
  return `${normalizedPath}#${normalizeMarkdownAnchor(anchor)}`;
}

function localChineseGuideBody(root: string, url: string): string | undefined {
  const match = url.match(/^\.\.\/chinese-guides\/([^#]+\.md)#(.+)$/i);
  if (!match) return undefined;
  const filePath = path.join(root, 'docs', 'knowledge', 'chinese-guides', match[1] ?? '');
  if (!fs.existsSync(filePath)) return undefined;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  const targetAnchor = normalizeMarkdownAnchor(match[2] ?? '');
  const headingIndex = lines.findIndex((line) => {
    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    return heading && normalizeMarkdownAnchor(heading[2] ?? '') === targetAnchor;
  });
  if (headingIndex < 0) return undefined;

  const level = lines[headingIndex]?.match(/^(#{1,6})\s/)?.[1].length ?? 6;
  const body: string[] = [];
  for (const line of lines.slice(headingIndex + 1)) {
    const nextHeading = line.match(/^(#{1,6})\s/);
    if (nextHeading && nextHeading[1].length <= level) break;
    body.push(line);
  }
  return body.join('\n')
    .replace(/<!--.*?-->/gs, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[\s#>*`_~|()[\]{}-]/g, '');
}

const LOCAL_GUIDE_SEMANTIC_SIGNALS = [
  {
    dimension: '定义/概念',
    pattern: /定义|概念|术语|是什么|含义|指的是|表示|称为|语义|职责|核心是|本质是/,
  },
  {
    dimension: '机制/流程',
    pattern: /机制|原理|流程|时序|过程|步骤|状态机|数据流|因果|链路|算法|如何(?:工作|运行|执行|处理)|先.{0,80}(?:再|然后|最后)|第一步|状态(?:转换|迁移)|调用链|执行器/,
  },
  {
    dimension: '适用条件/场景',
    pattern: /适用(?:条件|场景|范围)?|应用场景|使用场景|前提条件|成立条件|何时(?:使用|采用)|什么时候(?:使用|采用)|在.{0,30}(?:情况下|场景下)|只有.{0,30}才|例如|举例|例子|例[：:]/,
  },
  {
    dimension: '具体示例/实验',
    pattern: /示例|案例|例子|例如|举例|样例|夹具|fixture|练习|实验|演练|故障注入|最小实现|最小产出/,
  },
  {
    dimension: '边界/失败/反例',
    pattern: /边界|限制|局限|失败|异常|反例|风险|不适用|误区|陷阱|失效|降级|不得|不能|不可/,
  },
  {
    dimension: '验证/测试/证据',
    pattern: /验证|测试|证据|验收|检查|断言|可观测|复现|指标|回归|日志|追踪|核验|证明/,
  },
] as const;

function missingLocalGuideSemanticDimensions(body: string): string[] {
  return LOCAL_GUIDE_SEMANTIC_SIGNALS
    .filter(({ pattern }) => !pattern.test(body))
    .map(({ dimension }) => dimension);
}

describe('知识库内容完整性', () => {
  it('应解析 20 个领域和 223 个唯一知识点', () => {
    const root = findProjectRoot();
    const knowledgeDir = path.join(root, 'docs/knowledge/knowledge-base');
    const files = fs.readdirSync(knowledgeDir)
      .filter((file) => /^(0[1-9]|1[0-9]|20)-.*\.md$/.test(file))
      .sort();
    const contents = new Map(
      files.map((file) => [
        path.join(knowledgeDir, file),
        fs.readFileSync(path.join(knowledgeDir, file), 'utf8'),
      ]),
    );
    const domains = parseAllKnowledgeFiles(contents);
    const points = domains.flatMap((domain) => domain.points);

    expect(domains).toHaveLength(20);
    expect(points).toHaveLength(223);
    expect(new Set(points.map((point) => point.code)).size).toBe(223);
    const allowedTracks = new Set(['react', 'vue', 'umi-antd', 'agent-mcp']);
    const allowedTopicTags = new Set([
      'component-platform', 'api-engineering', 'tooling', 'platform-engineering',
      'realtime-ai', 'ai-tooling', 'engineering-leadership', 'web-platform',
      'accessibility', 'security-privacy', 'performance-mobile', 'media',
      'runtime-cross-platform', 'node-bff', 'data-realtime', 'browser-ai',
      'graphics-viz', 'growth-content-i18n', 'deployment', 'visual-testing',
    ]);
    const normalizedTitles = points.map((point) => point.title.toLocaleLowerCase().replace(/[\s、，,/·：:（）()`-]/g, ''));
    expect(new Set(normalizedTitles).size, '知识点主题标题不应重复').toBe(points.length);
    for (const domain of domains) {
      const source = [...contents.entries()].find(([file]) => path.basename(file).startsWith(`${domain.code}-`))?.[1] ?? '';
      const declaredTopics = [...source.matchAll(/^###\s+(.+)$/gm)].map((match) => match[1]?.trim() ?? '');
      const mappedTopics = [...new Set(domain.points.map((point) => point.secondaryTopic))];
      expect(declaredTopics.length, `${domain.code} 至少需要两个二级主题`).toBeGreaterThanOrEqual(2);
      expect(new Set(declaredTopics).size, `${domain.code} 二级主题标题重复`).toBe(declaredTopics.length);
      expect(mappedTopics, `${domain.code} 存在空主题或无知识点主题`).toEqual(declaredTopics);
    }
    for (const [file, content] of contents) {
      expect(content, `${path.basename(file)} 仍含批量复制的通用学习合同`).not.toMatch(GENERIC_CONTRACT_PATTERN);
      expect(content, `${path.basename(file)} 缺少结构化领域综合考核`).toMatch(
        /## 领域综合考核\r?\n\r?\n- \[ \] 已通过领域综合考核\r?\n- 任务：.+\r?\n- 通过标准：.+评估边界：/,
      );
    }
    for (const point of points) {
      expect(point.studyMaterial, `${point.code} 缺少学习资料`).not.toBe('');
      expect(point.assessmentSpec, `${point.code} 缺少严格考核`).not.toBe('');
      expect(point.passCriteria, `${point.code} 缺少通过标准`).not.toBe('');
      expect(point.verifiedAt, `${point.code} 缺少版本核验日期`).toBe('2026-08-09');
      expect(point.fallbackStrategy, `${point.code} 缺少降级策略`).not.toBe('');
      expect(['CORE', 'APPLICATION', 'SPECIALTY', 'LEADERSHIP']).toContain(point.capabilityLayer);
      expect(['REQUIRED', 'TRACK_REQUIRED', 'ELECTIVE']).toContain(point.requirementLevel);
      expect(['STABLE', 'EVOLVING', 'EXPERIMENTAL']).toContain(point.maturity);
      expect(['NONE', 'AI_ASSISTED', 'AI_NATIVE', 'AGENTIC']).toContain(point.aiRelation);
      expect(['PORTABLE', 'FRAMEWORK_SPECIFIC', 'VENDOR_SPECIFIC', 'PLATFORM_SPECIFIC', 'JURISDICTION_SPECIFIC']).toContain(point.portability);
      expect(Array.isArray(point.applicabilityTags)).toBe(true);
      expect(point.secondaryTopic, `${point.code} 缺少二级主题`).not.toBe('');
      expect(point.topicOrder, `${point.code} 二级主题顺序非法`).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(point.topicTags)).toBe(true);
      expect(Array.isArray(point.trackIds)).toBe(true);
      expect(point.trackIds.every((trackId) => allowedTracks.has(trackId)), `${point.code} 把主题标签混入了学习路线`).toBe(true);
      expect(point.topicTags.every((topicTag) => allowedTopicTags.has(topicTag)), `${point.code} 使用了未知主题标签`).toBe(true);
      if (point.requirementLevel === 'TRACK_REQUIRED') {
        expect(point.trackIds.length, `${point.code} 是赛道必修但没有 trackIds`).toBeGreaterThan(0);
      }
      expect(point.studyMaterial, `${point.code} 学习资料缺少覆盖范围`).toMatch(/覆盖范围\s*[：:]/);
      expect(
        `${point.studyMaterial}\n${point.assessmentSpec}\n${point.passCriteria}`,
        `${point.code} 仍含不能证明具体覆盖或诊断能力的旧模板句`,
      ).not.toMatch(LEGACY_TEMPLATE_PATTERN);
      const sourceScope = point.studyMaterial.split('。覆盖范围：')[0] ?? point.studyMaterial;
      expect(sourceScope, `${point.code} 学习资料题源含有隐性项目背景`).not.toMatch(
        /真实|历史问题|所用|现有 service|项目现有|项目真实|项目中的|目标项目|历史技术方案|团队规范|自己已经通过/,
      );
      expect(point.assessmentSpec, `${point.code} 严格考核缺少资料定位`).toMatch(/资料定位|题源|讲义/);
      expect(point.assessmentSpec, `${point.code} 严格考核缺少机制解释`).toMatch(/机制|原理|时序|因果/);
      expect(point.assessmentSpec, `${point.code} 严格考核缺少最小产出`).toMatch(/最小(?:产出|输出|交付|实现)|至少.{0,40}(?:产出|输出|交付|实现|提交)/s);
      expect(point.assessmentSpec, `${point.code} 严格考核缺少受限排错`).toMatch(/调试|排错|故障|失败|异常|注入/);
      expect(point.assessmentSpec, `${point.code} 严格考核缺少学习解释`).toMatch(/复述|解释|说明|讲解/);
      expect(point.assessmentSpec, `${point.code} 严格考核缺少命题范围`).toMatch(/命题边界|范围|只允许|不得/);
      expect(point.passCriteria, `${point.code} 通过标准缺少评估范围`).toMatch(/评估边界|范围|不得|资料|可复核/);
      expect(point.studyMinutes, `${point.code} 资料精读时间过低`).toBeGreaterThanOrEqual(90);
      expect(point.practiceMinutes, `${point.code} 机制练习时间过低`).toBeGreaterThanOrEqual(150);
      expect(point.projectMinutes, `${point.code} 项目产出时间过低`).toBeGreaterThanOrEqual(135);
      expect(point.assessmentMinutes, `${point.code} 首考时间过低`).toBeGreaterThanOrEqual(90);
      expect(point.estimatedTotalMinutes, `${point.code} 首次掌握耗时过低`).toBeGreaterThanOrEqual(465);
      expect(point.retestMinutes, `${point.code} 复测耗时过低`).toBeGreaterThanOrEqual(75);
      expect(point.estimatedTotalMinutes).toBe(
        point.studyMinutes + point.practiceMinutes + point.projectMinutes + point.assessmentMinutes,
      );
      expect(
        (point.studyMaterial.match(/\[[^\]]+\]\([^)]+\)/g) ?? []).length,
        `${point.code} 至少需要一份可定位的学习资料`,
      ).toBeGreaterThanOrEqual(1);
      expect(
        point.studyMaterial,
        `${point.code} 必须有中文必读资料；无稳定中文版时应链接项目内中文核心讲义`,
      ).toMatch(CHINESE_RESOURCE_PATTERN);

      const englishOriginals = extractMarkdownLinks(point.studyMaterial).filter(
        ({ markup, url }) => /^https?:\/\//i.test(url) && !isChineseResource(markup),
      );
      if (englishOriginals.length > 0) {
        expect(
          hasChineseMainSource(point.studyMaterial),
          `${point.code} 保留了英文原文，却没有对应知识点的中文核心讲义`,
        ).toBe(true);
        expect(
          point.assessmentSpec,
          `${point.code} 的考核题源必须明确中文主学习源`,
        ).toMatch(/中文/);
        const sourceQuestion = point.assessmentSpec.match(
          /首考题 1（资料定位）：(.+?)；首考题 2（机制解释）：/,
        )?.[1] ?? '';
        expect(
          sourceQuestion,
          `${point.code} 的资料定位题必须明确中文主学习源为首考范围`,
        ).toMatch(/只允许使用|中文/);
      }
      expect(`${point.studyMaterial}\n${point.assessmentSpec}`).not.toMatch(
        /2025-11-25|react\.dev\/learn\/displaying-data|docs\.sigstore\.dev\/cosign\/overview\/|ant\.design\/docs\/spec\/api\/|responsible-use\/copilot-code-review|sre\.google\/sre-book\/risk-engineering|techwriting\.withgoogle\.com\/resources\/one\/two\/review|multi-step-tools|docs\.docker\.com\/build\/guide\/|modelcards\.withgoogle\.com|rework\.withgoogle\.com|www\.gov\.cn\/xinwen\/2021-08-20/,
      );
    }
    const pointsByCode = new Map(points.map((point) => [point.code, point]));
    const auditMatrix = fs.readFileSync(path.join(root, 'docs/knowledge/topic-audit-matrix.md'), 'utf8');
    const auditRows = auditMatrix.match(/^\| `[A-Z][A-Z0-9]*-[0-9]+` \| \d{2} \| .+ \| .+ \| 通过 \|$/gm) ?? [];
    expect(auditRows, '逐点主题审计矩阵必须覆盖全部知识点').toHaveLength(points.length);
    for (const domain of domains) {
      for (const point of domain.points) {
        expect(
          auditMatrix,
          `${point.code} 的逐点审计记录与当前一级/二级主题或标题不一致`,
        ).toContain(`| \`${point.code}\` | ${domain.code} | ${point.secondaryTopic} | ${point.title} | 通过 |`);
      }
    }
    for (const code of [
      'CS-01', 'CS-02', 'CS-03', 'DEBUG-01', 'WEB-05', 'SEC-04', 'UX-01',
      'RUNTIME-01', 'RUNTIME-02', 'MOBILE-01', 'SEO-01', 'AIAPP-11', 'AIAPP-12',
      'WEBAGENT-01', 'JS-07', 'BROWSER-02', 'SEC-05', 'TEST-04', 'PWA-02',
      'WEBAI-11', 'AGENT-11', 'AIUI-01', 'AIAPP-13', 'AIMEDIA-01', 'SUSTAIN-01',
      'DX-01', 'MEDIA-01', 'MEDIA-02', 'H5-04', 'WASM-01', 'AIDEV-11',
      'NODE-04', 'EDITOR-01', 'LOCALFIRST-01', 'EMBED-01', 'REACT-10', 'ARCH-05',
    ]) {
      expect(pointsByCode.has(code), `${code} 必须进入正式知识体系`).toBe(true);
    }
    for (const code of ['AI-01', 'CAREER-03', 'PERF-05', 'DEPLOY-02', 'AIDEV-05', 'AGENT-02', 'MCP-02']) {
      expect(pointsByCode.has(code), `${code} 已被合并，不应继续形成重复学习合同`).toBe(false);
    }
    expect(pointsByCode.get('JS-01')?.studyMaterial).not.toMatch(/React|useEffect/i);
    expect(pointsByCode.get('JS-01')?.assessmentSpec).not.toMatch(/React|useEffect/i);
    expect(pointsByCode.get('JS-06')?.studyMaterial).not.toContain('https://nodejs.org/api/esm.html');
    expect(
      `${pointsByCode.get('JS-06')?.studyMaterial}\n${pointsByCode.get('JS-06')?.assessmentSpec}`,
      'JS-06 必须覆盖模块解析、边界与可验证加载行为',
    ).toMatch(/模块|ESM|解析|加载/);
    expect(pointsByCode.get('REACT-04')?.studyMaterial).toMatch(/Effect|Effects/i);
    for (const code of ['GIT-01', 'GIT-02', 'GIT-03']) {
      expect(pointsByCode.get(code)?.studyMaterial, `${code} 必须使用中文 Git 学习资料`)
        .toMatch(/git-scm\.com\/book\/zh\/v2|docs\.github\.com\/zh\//);
      expect(pointsByCode.get(code)?.studyMaterial, `${code} 不应依赖英文必读资料`)
        .not.toContain('英文原文');
    }
    expect(pointsByCode.get('WEB-01')?.studyMaterial).not.toContain('w3.org/WAI/ARIA/apg');
    expect(pointsByCode.get('WEB-01')?.studyMaterial).not.toContain('英文原文');
    expect(
      `${pointsByCode.get('WEB-01')?.studyMaterial}\n${pointsByCode.get('WEB-01')?.assessmentSpec}`,
      'WEB-01 必须覆盖语义结构、表单和可访问性边界',
    ).toMatch(/语义|表单|可访问|无障碍/);
    expect(pointsByCode.get('A11Y-01')?.studyMaterial).not.toContain('w3.org/WAI/ARIA/apg');
    expect(pointsByCode.get('A11Y-01')?.studyMaterial).not.toContain('英文原文');
    expect(pointsByCode.get('WEBAI-01')).toMatchObject({ maturity: 'EVOLVING', portability: 'VENDOR_SPECIFIC' });
    expect(pointsByCode.get('TEST-02')?.trackIds).toContain('react');
    expect(pointsByCode.get('TS-08')).toMatchObject({ capabilityLayer: 'APPLICATION' });
    expect(pointsByCode.get('REACT-09')).toMatchObject({ maturity: 'EVOLVING' });
    expect(pointsByCode.get('ENG-07')).toMatchObject({ portability: 'PORTABLE', applicabilityTags: [] });
    expect(pointsByCode.get('TEST-02')).toMatchObject({ capabilityLayer: 'APPLICATION' });
    expect(pointsByCode.get('HYBRID-01')?.applicabilityTags).toEqual(['VENDOR_SPECIFIC', 'PLATFORM_SPECIFIC']);
    expect(pointsByCode.get('MOBILE-01')?.applicabilityTags).toEqual(['PLATFORM_SPECIFIC']);
    expect(pointsByCode.get('CAREER-01')).toMatchObject({ capabilityLayer: 'APPLICATION' });
    expect(pointsByCode.get('AIUI-01')).toMatchObject({ capabilityLayer: 'SPECIALTY' });
    expect(pointsByCode.get('WEBAI-04')).toMatchObject({ maturity: 'EVOLVING' });
    expect(pointsByCode.get('WEBAI-10')).toMatchObject({ maturity: 'STABLE' });
    expect(pointsByCode.get('EDGE-01')).toMatchObject({ portability: 'PLATFORM_SPECIFIC' });
    expect(pointsByCode.get('UX-01')).toMatchObject({ secondaryTopic: '产品交互与可用性' });
    expect(domains.find((domain) => domain.points.some((point) => point.code === 'UX-01'))?.code).toBe('05');
    expect(pointsByCode.get('AGENT-03')?.secondaryTopic).toBe('MCP 传输与客户端兼容');
    expect(pointsByCode.get('AGENT-04')?.secondaryTopic).toBe('MCP 传输与客户端兼容');
    expect(pointsByCode.get('AIDEV-06')?.secondaryTopic).toBe('确定性代码变换工具链');
    expect(pointsByCode.get('AIAPP-05')?.trackIds).not.toContain('agent-mcp');
    expect(pointsByCode.get('AIUI-01')?.trackIds).toContain('agent-mcp');
    expect(
      `${pointsByCode.get('AIAPP-09')?.studyMaterial}\n${pointsByCode.get('AIAPP-09')?.assessmentSpec}`,
      'AIAPP-09 必须覆盖令牌用量与缓存成本证据',
    ).toMatch(/令牌|token|缓存|cache/i);
    expect(
      `${pointsByCode.get('WEBAI-05')?.studyMaterial}\n${pointsByCode.get('WEBAI-05')?.assessmentSpec}`,
      'WEBAI-05 必须覆盖本地缓存、配额与持久化边界',
    ).toMatch(/缓存|配额|持久化|离线/);
    expect(pointsByCode.get('WEBAI-03')?.studyMaterial).toContain('完成 `WASM-01`');
    expect(pointsByCode.get('AIDEV-11')?.studyMaterial).toContain(
      '../chinese-guides/content-audit-15-17.md#aidev-11',
    );
    expect(
      `${pointsByCode.get('AIDEV-11')?.studyMaterial}\n${pointsByCode.get('AIDEV-11')?.assessmentSpec}`,
      'AIDEV-11 必须以运行时证据复核 AI 生成结果，不能绑定某个低相关工具页',
    ).toMatch(/运行时|trace|日志|截图|网络|控制台/i);

    // All local Chinese-guide anchors are checked generically by localMarkdownLinkProblems.
    const guideFiles: readonly string[] = [];
    const guides = new Map(
      guideFiles.map((file) => [
        file,
        fs.readFileSync(path.join(root, 'docs/knowledge/chinese-guides', file), 'utf8'),
      ]),
    );
    for (const point of points) {
      for (const guideFile of guideFiles) {
        if (point.studyMaterial.includes(`../chinese-guides/${guideFile}#`)) {
          expect(
            guides.get(guideFile),
            `${point.code} 引用了 ${guideFile}，但讲义中没有对应章节`,
          ).toContain(`## ${point.code}`);
        }
      }
    }
  });

  it('允许 Markdown 为复杂知识点覆盖默认耗时', async () => {
    const { parseKnowledgeMarkdown } = await import('./markdown.js');
    const domain = parseKnowledgeMarkdown(`# 01 示例\n\n### 示例主题\n\n## JS-99 自定义负载\n- [ ] 自评已掌握\n- [ ] 已通过严格考核\n- 学习资料：官方文档\n- 严格考核：完成项目\n- 通过标准：达到 80 分\n- 预计耗时：资料 60 分钟；练习 120 分钟；项目 90 分钟；考核 75 分钟；复测 45 分钟`, 'example.md');
    expect(domain.points[0]).toMatchObject({
      studyMinutes: 60,
      practiceMinutes: 120,
      projectMinutes: 90,
      assessmentMinutes: 75,
      retestMinutes: 45,
      estimatedTotalMinutes: 345,
    });
  });

  it('同时支持 LF 与 CRLF 知识库文件', async () => {
    const { parseKnowledgeMarkdown } = await import('./markdown.js');
    const source = '# 01 示例\n\n### 示例主题\n\n## JS-99 换行兼容\n- [ ] 自评已掌握\n- [ ] 已通过严格考核\n- 学习资料：官方文档\n- 严格考核：完成项目\n- 通过标准：达到 80 分';
    expect(parseKnowledgeMarkdown(source, 'lf.md').points).toHaveLength(1);
    expect(parseKnowledgeMarkdown(source.replace(/\n/g, '\r\n'), 'crlf.md').points).toHaveLength(1);
  });
});

describe('知识资源审计防线', () => {
  it('要求每个知识点具备可学习的中文主源、覆盖说明和可验证考核', () => {
    const root = findProjectRoot();
    const knowledgeDirectory = path.join(root, 'docs', 'knowledge', 'knowledge-base');
    const contents = new Map(
      fs.readdirSync(knowledgeDirectory)
        .filter((file) => /^(0[1-9]|1[0-9]|20)-.*\.md$/.test(file))
        .map((file) => [path.join(knowledgeDirectory, file), fs.readFileSync(path.join(knowledgeDirectory, file), 'utf8')]),
    );
    const points = parseAllKnowledgeFiles(contents).flatMap((domain) => domain.points);
    const staleEnglishVersionDeclarations: string[] = [];

    for (const point of points) {
      expect(point.studyMaterial.trim(), `${point.code} 缺少学习资料`).not.toBe('');
      expect(point.studyMaterial, `${point.code} 缺少“覆盖范围”说明`).toMatch(/覆盖范围\s*[：:]/);
      expect(
        hasChineseMainSource(point.studyMaterial),
        `${point.code} 必须有本地中文讲义的精确锚点或中文官方主学习源`,
      ).toBe(true);

      const links = extractMarkdownLinks(point.studyMaterial);
      const normalizedUrls = links.map(({ url }) => normalizeLearningResourceUrl(url));
      expect(
        new Set(normalizedUrls).size,
        `${point.code} 的学习资料包含归一化后重复的 URL`,
      ).toBe(normalizedUrls.length);
      const EnglishSources = links.filter(({ markup, url }) => /^https?:\/\//i.test(url) && !isChineseResource(markup));
      if (EnglishSources.length > 0) {
        for (const source of EnglishSources) {
          expect(
            hasImmediateEnglishVersionMarker(point.studyMaterial, source.markup),
            `${point.code} 的非中文外链 ${source.url} 后必须紧随“英文原文，仅用于版本核验”标记`,
          ).toBe(true);
        }
        expect(
          hasChineseMainSource(point.studyMaterial),
          `${point.code} 的英文资料不得成为唯一必读或首考题源`,
        ).toBe(true);
        expect(
          point.studyMaterial,
          `${point.code} 必须声明英文资料不作为必读内容`,
        ).toMatch(/英文(?:原文|资料)[\s\S]{0,100}(?:不作为|不属于|不得作为|不能作为)[\s\S]{0,30}必读/);
        expect(
          point.studyMaterial,
          `${point.code} 必须声明英文资料不得作为独立首考题源`,
        ).toMatch(/英文(?:原文|资料)[\s\S]{0,140}(?:不作为|不属于|不得作为|不能作为|不得)[\s\S]{0,40}(?:独立首考|独立命题|独立题源)/);
        expect(
          point.assessmentSpec,
          `${point.code} 的严格考核必须限制英文资料不得独立命题`,
        ).toMatch(/英文(?:原文|资料)[\s\S]{0,100}(?:不作为|不属于|不得作为|不能作为|不得)[\s\S]{0,40}(?:独立首考|独立命题|独立题源)/);
      } else {
        if (/英文(?:原文|资料)[\s\S]{0,100}仅用于版本核验/.test(`${point.studyMaterial}\n${point.assessmentSpec}`)) {
          staleEnglishVersionDeclarations.push(point.code);
        }
      }
      expect(point.assessmentSpec.trim(), `${point.code} 缺少严格考核`).not.toBe('');
      expect(point.passCriteria.trim(), `${point.code} 缺少通过标准`).not.toBe('');
      expect(
        point.assessmentSpec,
        `${point.code} 严格考核必须声明最小输出或交付物`,
      ).toMatch(/最小(?:产出|输出|交付|实现)|至少.{0,40}(?:产出|输出|交付|实现|提交)/s);
      expect(
        point.assessmentSpec,
        `${point.code} 严格考核必须含调试或受限排错`,
      ).toMatch(/调试|排错|故障|失败|异常|注入/);
      expect(
        `${point.assessmentSpec}\n${point.passCriteria}`,
        `${point.code} 严格考核必须含验证、检查或可复核证据`,
      ).toMatch(/验证|核验|复核|检查|测试|证据|复现|验收/);
      expect(
        point.assessmentSpec,
        `${point.code} 考核必须能定位到列出的资料或中文主源，避免资料外评分`,
      ).toMatch(/资料|题源|讲义|首考题\s*1/);
      expect(
        point.passCriteria,
        `${point.code} 通过标准必须限定在本点资料、题目输入和可复核产出内`,
      ).toMatch(/评估边界|资料|题目输入|可复核/);
    }
    expect(
      staleEnglishVersionDeclarations,
      '没有非中文外链的知识点不得保留英文版本核验声明',
    ).toEqual([]);
  });

  it('逐点限制所有非中文外链只能用于版本核验', () => {
    const root = findProjectRoot();
    const knowledgeDirectory = path.join(root, 'docs', 'knowledge', 'knowledge-base');
    const contents = new Map(
      fs.readdirSync(knowledgeDirectory)
        .filter((file) => /^(0[1-9]|1[0-9]|20)-.*\.md$/.test(file))
        .map((file) => [path.join(knowledgeDirectory, file), fs.readFileSync(path.join(knowledgeDirectory, file), 'utf8')]),
    );
    const failures: string[] = [];

    for (const point of parseAllKnowledgeFiles(contents).flatMap((domain) => domain.points)) {
      const englishSources = extractMarkdownLinks(point.studyMaterial).filter(
        ({ markup, url }) => /^https?:\/\//i.test(url) && !isChineseResource(markup),
      );
      if (englishSources.length === 0) continue;

      for (const source of englishSources) {
        if (!hasImmediateEnglishVersionMarker(point.studyMaterial, source.markup)) {
          failures.push(`${point.code}:链接后缺版本核验标记 ${source.url}`);
        }
      }
      if (!hasChineseMainSource(point.studyMaterial)) failures.push(`${point.code}:缺少中文主学习源`);
      if (!/英文(?:原文|资料)[\s\S]{0,100}(?:不作为|不属于|不得作为|不能作为)[\s\S]{0,30}必读/.test(point.studyMaterial)) {
        failures.push(`${point.code}:资料行未声明英文不作为必读`);
      }
      if (!/英文(?:原文|资料)[\s\S]{0,140}(?:不作为|不属于|不得作为|不能作为|不得)[\s\S]{0,40}(?:独立首考|独立命题|独立题源)/.test(point.studyMaterial)) {
        failures.push(`${point.code}:资料行未声明英文不得作为独立首考题源`);
      }
      if (!/英文(?:原文|资料)[\s\S]{0,100}(?:不作为|不属于|不得作为|不能作为|不得)[\s\S]{0,40}(?:独立首考|独立命题|独立题源)/.test(point.assessmentSpec)) {
        failures.push(`${point.code}:严格考核未限制英文独立命题`);
      }
    }

    expect(failures, '非中文外链边界必须逐链接、逐知识点完整声明').toEqual([]);
  });

  it('严格考核的资料定位题不得引用已移除或重复题源', () => {
    const root = findProjectRoot();
    const knowledgeDirectory = path.join(root, 'docs', 'knowledge', 'knowledge-base');
    const contents = new Map(
      fs.readdirSync(knowledgeDirectory)
        .filter((file) => /^(0[1-9]|1[0-9]|20)-.*\.md$/.test(file))
        .map((file) => [path.join(knowledgeDirectory, file), fs.readFileSync(path.join(knowledgeDirectory, file), 'utf8')]),
    );
    const failures: string[] = [];

    for (const point of parseAllKnowledgeFiles(contents).flatMap((domain) => domain.points)) {
      const labels = learningResourceLabels(point.studyMaterial);
      const sourceTitles = strictAssessmentSourceTitles(point.assessmentSpec);
      const declaredTitles = strictAssessmentDeclaredSourceTitles(point.assessmentSpec);
      const assessableCurrentTitles = extractMarkdownLinks(point.studyMaterial)
        .filter(({ markup, url }) => (
          /^\.\.\/chinese-guides\/[^#]+\.md#[^#\s]+$/i.test(url)
          || (/^https?:\/\//i.test(url) && isChineseResource(markup))
        ))
        .map(({ markup }) => markup.match(/^\[([^\]]+)\]/)?.[1]?.trim() ?? '')
        .filter(Boolean);
      const declaredCurrentTitles = new Set([...sourceTitles, ...declaredTitles]);
      const sourceQuestion = point.assessmentSpec.match(
        /首考题\s*1（资料定位）：(.+?)(?:；首考题\s*2（机制解释）：|$)/,
      )?.[1] ?? '';
      const staleTitles = [...sourceTitles, ...declaredTitles].filter((title) => !labels.has(title));
      const omittedCurrentTitles = assessableCurrentTitles.filter(
        (title) => !declaredCurrentTitles.has(title),
      );
      const duplicateTitles = sourceTitles.filter((title, index) => sourceTitles.indexOf(title) !== index);
      const duplicateDeclaredTitles = declaredTitles.filter(
        (title, index) => declaredTitles.indexOf(title) !== index,
      );
      if (sourceTitles.length === 0) {
        failures.push(`${point.code}:资料定位题未用《资料名》明确限制当前题源`);
      }
      if (/[一二三四五六七八九十\d]+份(?:中文|英文)?(?:资料|文档|页面|链接)/.test(sourceQuestion)) {
        failures.push(`${point.code}:资料定位题使用数量代称而非逐项列出当前题源`);
      }
      if (staleTitles.length > 0) {
        failures.push(`${point.code}:首考题引用非当前资料 ${[...new Set(staleTitles)].join('、')}`);
      }
      if (omittedCurrentTitles.length > 0) {
        failures.push(`${point.code}:首考题遗漏当前中文资料 ${[...new Set(omittedCurrentTitles)].join('、')}`);
      }
      if (duplicateTitles.length > 0) {
        failures.push(`${point.code}:首考题重复列出资料 ${[...new Set(duplicateTitles)].join('、')}`);
      }
      if (duplicateDeclaredTitles.length > 0) {
        failures.push(`${point.code}:题源声明重复列出资料 ${[...new Set(duplicateDeclaredTitles)].join('、')}`);
      }
    }

    expect(
      failures,
      '资料定位题中的《资料名》必须与当前中文学习资料链接标签精确一致、完整列出，历史删除项不得残留',
    ).toEqual([]);
  });

  it('本地中文讲义必须进入学习资料字段而不是游离在知识点正文中', () => {
    const root = findProjectRoot();
    const knowledgeDirectory = path.join(root, 'docs', 'knowledge', 'knowledge-base');
    const failures: string[] = [];

    for (const file of fs.readdirSync(knowledgeDirectory).filter((name) => /^(0[1-9]|1[0-9]|20)-.*\.md$/.test(name))) {
      const markdown = fs.readFileSync(path.join(knowledgeDirectory, file), 'utf8');
      const points = new Map(
        parseAllKnowledgeFiles(new Map([[path.join(knowledgeDirectory, file), markdown]]))
          .flatMap((domain) => domain.points)
          .map((point) => [point.code, point]),
      );

      for (const match of markdown.matchAll(
        /^##\s+([A-Z][A-Z0-9]*-\d+)\b[^\n]*\n([\s\S]*?)(?=^##\s+[A-Z][A-Z0-9]*-\d+\b|(?![\s\S]))/gm,
      )) {
        const code = match[1] ?? '';
        const section = match[2] ?? '';
        const point = points.get(code);
        if (!point) continue;
        const rawLocalLinks = extractMarkdownLinks(section)
          .map(({ url }) => url)
          .filter((url) => /^\.\.\/chinese-guides\/[^#]+\.md#[^#\s]+$/i.test(url))
          .map(normalizeLearningResourceUrl)
          .sort();
        const parsedLocalLinks = extractMarkdownLinks(point.studyMaterial)
          .map(({ url }) => url)
          .filter((url) => /^\.\.\/chinese-guides\/[^#]+\.md#[^#\s]+$/i.test(url))
          .map(normalizeLearningResourceUrl)
          .sort();
        if (rawLocalLinks.join('\n') !== parsedLocalLinks.join('\n')) {
          failures.push(`${code}:知识点正文中的本地讲义链接必须全部且仅由“学习资料”字段承载`);
        }
      }
    }

    expect(failures, '不得用游离的“本地强化讲义”行或跨点附录绕过学习资料解析').toEqual([]);
  });

  it('仅依赖本地中文讲义时只累计实际链接锚点的有效正文与显式语义信号', () => {
    const root = findProjectRoot();
    const knowledgeDirectory = path.join(root, 'docs', 'knowledge', 'knowledge-base');
    const contents = new Map(
      fs.readdirSync(knowledgeDirectory)
        .filter((file) => /^(0[1-9]|1[0-9]|20)-.*\.md$/.test(file))
        .map((file) => [path.join(knowledgeDirectory, file), fs.readFileSync(path.join(knowledgeDirectory, file), 'utf8')]),
    );
    const failures: string[] = [];

    for (const point of parseAllKnowledgeFiles(contents).flatMap((domain) => domain.points)) {
      const links = extractMarkdownLinks(point.studyMaterial);
      const hasChineseExternalSource = links.some(
        ({ markup, url }) => /^https?:\/\//i.test(url) && isChineseResource(markup),
      );
      if (hasChineseExternalSource) continue;

      const linkedGuideBodies = links
        .map(({ url }) => localChineseGuideBody(root, url))
        .filter((body): body is string => body !== undefined);
      const totalBodyLength = linkedGuideBodies.reduce((total, body) => total + body.length, 0);
      if (linkedGuideBodies.length === 0) failures.push(`${point.code}:没有有效本地讲义锚点`);
      else {
        if (totalBodyLength < 700) failures.push(`${point.code}:有效正文 ${totalBodyLength}/700`);
        const missingDimensions = missingLocalGuideSemanticDimensions(linkedGuideBodies.join('\n'));
        if (missingDimensions.length > 0) {
          failures.push(`${point.code}:缺少显式语义维度 ${missingDimensions.join('、')}`);
        }
      }
    }

    expect(
      failures,
      '本地-only 中文讲义必须达到结构长度下限，并显式覆盖定义、机制、场景、具体示例/实验、失败边界与验证证据；报告声明不能替代正文',
    ).toEqual([]);
  });

  it('解析 docs/knowledge 中每一条本地 Markdown 资源与锚点', () => {
    const problems = localMarkdownLinkProblems(findProjectRoot());
    expect(problems, `本地 Markdown 链接或锚点失效：\n${problems.join('\n')}`).toEqual([]);
  });

  it('只按当前资源行的正文相关度字段执行 80% 门禁', () => {
    expect(hasExplicitLowBodyRelevance('正文相关度=30–60%；覆盖分工=术语核验')).toBe(true);
    expect(hasExplicitLowBodyRelevance('相关度百分比：45-70%；覆盖分工=边界')).toBe(true);
    expect(hasExplicitLowBodyRelevance('正文相关度 70%；覆盖分工=示例')).toBe(true);
    expect(hasExplicitLowBodyRelevance('正文相关度≥75%；覆盖分工=版本')).toBe(true);
    expect(
      hasExplicitLowBodyRelevance('正文相关度≥80%；知识点覆盖比例=45%；覆盖分工=机制'),
    ).toBe(false);

    const resources = auditResourceMap(`
| 资源 | 知识点 | 判定 |
| --- | --- | --- |
| [历史页](https://example.com/resource) | \`TEST-99\` | 删除；正文相关度=30–60%；无法正文核验 |
| [当前页](https://example.com/resource) | \`TEST-99\` | 正文相关度≥80%；覆盖分工=机制与验证；已核验 |
| [旧迁移页](https://example.com/removed) | \`TEST-99\` | 已从当前学习资料移除；正文相关度=70% |
| [旧导航页](https://example.com/historical) | \`TEST-99\` | 历史移除；正文相关度低于 80% |
`);
    const current = resources.get('TEST-99')?.get('https://example.com/resource');
    expect(current).toMatchObject({
      deleted: false,
      hasLowBodyRelevance: false,
      hasRequiredAuditFields: true,
      unverified: false,
    });
    expect(resources.get('TEST-99')?.get('https://example.com/removed')).toMatchObject({ deleted: true });
    expect(resources.get('TEST-99')?.get('https://example.com/historical')).toMatchObject({ deleted: true });
  });

  it('使七份批次审计报告与权威 20 域/223 点清单一一对应', () => {
    const root = findProjectRoot();
    const knowledgeDirectory = path.join(root, 'docs', 'knowledge', 'knowledge-base');
    const contents = new Map(
      fs.readdirSync(knowledgeDirectory)
        .filter((file) => /^(0[1-9]|1[0-9]|20)-.*\.md$/.test(file))
        .map((file) => [path.join(knowledgeDirectory, file), fs.readFileSync(path.join(knowledgeDirectory, file), 'utf8')]),
    );
    const domains = parseAllKnowledgeFiles(contents);
    const pointsByCode = new Map(domains.flatMap((domain) => domain.points).map((point) => [point.code, point]));
    const auditDirectory = path.join(root, 'docs', 'knowledge', 'content-audits');
    const allExpectedCodes = new Set(domains.flatMap((domain) => domain.points.map((point) => point.code)));
    const seen = new Map<string, string>();
    const resourceMappingProblems: string[] = [];

    for (const report of AUDIT_REPORTS) {
      const reportPath = path.join(auditDirectory, report.file);
      expect(fs.existsSync(reportPath), `缺少批次审计报告 ${report.file}`).toBe(true);
      const reportText = fs.readFileSync(reportPath, 'utf8');
      const actualCodes = auditCodes(reportText);
      const reportedResources = auditResourceMap(reportText);
      const expectedCodes = domains
        .filter((domain) => (report.domains as readonly string[]).includes(domain.code))
        .flatMap((domain) => domain.points.map((point) => point.code));

      expect(actualCodes.length, `${report.file} 没有可解析的知识点表格行`).toBeGreaterThan(0);
      expect(new Set(actualCodes).size, `${report.file} 存在重复知识点行`).toBe(actualCodes.length);
      expect(new Set(actualCodes), `${report.file} 缺少、错放或多报知识点`).toEqual(new Set(expectedCodes));
      expect(reportText, `${report.file} 缺少本次核验日期`).toMatch(/2026-08-09/);
      expect(reportText, `${report.file} 缺少逐点审计结论`).toMatch(/通过|有条件通过|需修订|阻塞/);

      for (const code of actualCodes) {
        expect(allExpectedCodes.has(code), `${report.file} 包含知识库外代码 ${code}`).toBe(true);
        expect(seen.has(code), `${code} 同时出现在 ${seen.get(code)} 与 ${report.file}`).toBe(false);
        seen.set(code, report.file);
      }
      for (const code of expectedCodes) {
        const point = pointsByCode.get(code);
        expect(point, `${report.file} 无法从权威清单解析 ${code}`).toBeDefined();
        if (!point) continue;
        const actualResourceUrls = new Set(
          extractMarkdownLinks(point.studyMaterial).map(({ url }) => normalizeLearningResourceUrl(url)),
        );
        const auditedResourceUrls = reportedResources.get(code) ?? new Map<string, ReportedResource>();
        const missing = [...actualResourceUrls].filter((url) => {
          const resource = auditedResourceUrls.get(url);
          return !resource || resource.deleted;
        });
        if (missing.length > 0) {
          resourceMappingProblems.push(`${report.file}/${code}:缺少 ${missing.join(', ')}`);
        }
        const unverifiedCurrent = [...actualResourceUrls].filter((url) => {
          const resource = auditedResourceUrls.get(url);
          return resource && !resource.deleted && resource.unverified;
        });
        if (unverifiedCurrent.length > 0) {
          resourceMappingProblems.push(
            `${report.file}/${code}:当前资料未完成正文核验 ${unverifiedCurrent.join(', ')}`,
          );
        }
        const lowRelevanceCurrent = [...actualResourceUrls].filter((url) => {
          const resource = auditedResourceUrls.get(url);
          return resource && !resource.deleted && resource.hasLowBodyRelevance;
        });
        if (lowRelevanceCurrent.length > 0) {
          resourceMappingProblems.push(
            `${report.file}/${code}:当前资料明确声明正文相关度低于 80% ${lowRelevanceCurrent.join(', ')}`,
          );
        }
        const missingRelevanceDeclaration = [...actualResourceUrls].filter((url) => {
          const resource = auditedResourceUrls.get(url);
          return resource
            && !resource.deleted
            && !resource.hasRequiredAuditFields;
        });
        if (missingRelevanceDeclaration.length > 0) {
          resourceMappingProblems.push(
            `${report.file}/${code}:当前资料映射行必须声明“正文相关度≥80%；覆盖分工=...” ${missingRelevanceDeclaration.join(', ')}`,
          );
        }

        const undeclaredExtras = [...auditedResourceUrls.entries()]
          .filter(([url, resource]) => !actualResourceUrls.has(url) && !resource.deleted)
          .map(([, resource]) => resource.rawUrl);
        if (undeclaredExtras.length > 0) {
          resourceMappingProblems.push(
            `${report.file}/${code}:当前资料外 URL 未标“删除” ${undeclaredExtras.join(', ')}`,
          );
        }
      }
    }
    expect(new Set(seen.keys()), '批次报告没有完整覆盖权威知识点清单').toEqual(allExpectedCodes);
    expect(
      resourceMappingProblems,
      '批次报告必须逐项映射当前学习资料 URL；额外历史 URL 仅在同行标明“删除”时允许保留',
    ).toEqual([]);
  });
});
