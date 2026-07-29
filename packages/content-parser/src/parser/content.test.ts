import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parseAllKnowledgeFiles } from './markdown.js';

const CHINESE_RESOURCE_PATTERN =
  /\[[^\]]+\]\((?:\.\.\/chinese-guides\/|https?:\/\/[^)]*(?:\/zh-CN\/|\/zh-cn\/|\/zh_cn\/|\/zh\/|zh-hans\.|cn\.vuejs\.org|cn\.vite\.dev|cn\.vitest\.dev|nodejs\.cn|node\.org\.cn|playwright\.nodejs\.cn|testing-library\.node\.org\.cn|eslint\.org\.cn|nuxt\.com\.cn|oi-wiki\.org|hl=zh-cn|hl=zh_cn|umijs\.org|ant\.design|lbs\.amap\.com|developer\.work\.weixin\.qq\.com|open\.dingtalk\.com|\.cn\/))[^)]*\)/i;
const ENGLISH_ORIGINAL_MARKER = '（英文原文，仅用于版本核验）';
const ENGLISH_ORIGINAL_SCOPE = '英文原文仅用于版本核验，不作为必读或独立首考题源。';
const ENGLISH_ORIGINAL_ASSESSMENT_SCOPE = '英文原文仅用于版本核验，不作为独立首考题源。';
const LEGACY_TEMPLATE_PATTERN =
  /围绕「.+」的定义、机制、边界、反例和通过标准|围绕首考题 3 的产出给出一个失败现象|3 分钟向同事讲清是什么、什么时候用、如何验证没有用错|不得用未列资料或题目未点名的框架\/项目场景作为主要评分依据/;

function extractMarkdownLinks(markdown: string): Array<{ markup: string; url: string }> {
  return [...markdown.matchAll(/(\[[^\]]+\]\(([^)]+)\))/g)].map((match) => ({
    markup: match[1] ?? '',
    url: match[2] ?? '',
  }));
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

describe('知识库内容完整性', () => {
  it('应解析 20 个领域和 219 个唯一知识点', () => {
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
    const insufficientChineseGuides: string[] = [];
    const insufficientCoverageScopes: string[] = [];

    expect(domains).toHaveLength(20);
    expect(points).toHaveLength(219);
    expect(new Set(points.map((point) => point.code)).size).toBe(219);
    for (const point of points) {
      expect(point.studyMaterial, `${point.code} 缺少学习资料`).not.toBe('');
      expect(point.assessmentSpec, `${point.code} 缺少严格考核`).not.toBe('');
      expect(point.passCriteria, `${point.code} 缺少通过标准`).not.toBe('');
      expect(point.studyMaterial, `${point.code} 学习资料缺少覆盖范围`).toContain('覆盖范围：');
      expect(
        `${point.studyMaterial}\n${point.assessmentSpec}\n${point.passCriteria}`,
        `${point.code} 仍含不能证明具体覆盖或诊断能力的旧模板句`,
      ).not.toMatch(LEGACY_TEMPLATE_PATTERN);
      const coverageLength = point.studyMaterial.split('覆盖范围：')[1]?.length ?? 0;
      if (coverageLength < 60) {
        insufficientCoverageScopes.push(`${point.code}:${coverageLength}/60`);
      }
      const sourceScope = point.studyMaterial.split('。覆盖范围：')[0] ?? point.studyMaterial;
      expect(sourceScope, `${point.code} 学习资料题源含有隐性项目背景`).not.toMatch(
        /真实|历史问题|所用|现有 service|项目现有|项目真实|项目中的|目标项目|历史技术方案|团队规范|自己已经通过/,
      );
      expect(point.assessmentSpec, `${point.code} 严格考核缺少资料定位题`).toContain('首考题 1（资料定位）');
      expect(point.assessmentSpec, `${point.code} 严格考核缺少机制解释题`).toContain('首考题 2（机制解释）');
      expect(point.assessmentSpec, `${point.code} 严格考核缺少最小产出题`).toContain('首考题 3（最小产出）');
      expect(point.assessmentSpec, `${point.code} 严格考核缺少受限排错题`).toContain('首考题 4（受限排错）');
      expect(point.assessmentSpec, `${point.code} 严格考核缺少学习复述题`).toContain('首考题 5（学习复述）');
      expect(point.assessmentSpec, `${point.code} 严格考核缺少命题边界`).toContain('命题边界：');
      expect(point.passCriteria, `${point.code} 通过标准缺少评估边界`).toContain('评估边界：');
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
        `${point.code} 至少需要两份可交叉验证的学习资料`,
      ).toBeGreaterThanOrEqual(2);
      expect(
        point.studyMaterial,
        `${point.code} 必须有中文必读资料；无稳定中文版时应链接项目内中文核心讲义`,
      ).toMatch(CHINESE_RESOURCE_PATTERN);

      const englishOriginals = extractMarkdownLinks(point.studyMaterial).filter(
        ({ markup, url }) => /^https?:\/\//i.test(url) && !isChineseResource(markup),
      );
      for (const original of englishOriginals) {
        expect(
          point.studyMaterial,
          `${point.code} 的英文链接 ${original.url} 未逐条标明“仅用于版本核验”`,
        ).toContain(`${original.markup}${ENGLISH_ORIGINAL_MARKER}`);
      }
      if (englishOriginals.length > 0) {
        const pointGuideLink =
          `../chinese-guides/advanced-topics.md#${point.code.toLowerCase()}`;
        const ecosystemGuideLink =
          `../chinese-guides/core-and-ecosystem-topics.md#${point.code.toLowerCase()}`;
        expect(
          point.studyMaterial.includes(pointGuideLink) ||
            point.studyMaterial.includes(ecosystemGuideLink),
          `${point.code} 保留了英文原文，却没有对应知识点的中文核心讲义`,
        ).toBe(true);
        expect(
          point.studyMaterial,
          `${point.code} 没有声明英文原文不属于必读和独立首考题源`,
        ).toContain(ENGLISH_ORIGINAL_SCOPE);
        expect(
          point.assessmentSpec,
          `${point.code} 的考核题源未包含中文核心讲义`,
        ).toContain('《中文核心讲义》');
        expect(
          point.assessmentSpec,
          `${point.code} 没有限制英文原文不得独立命题`,
        ).toContain(ENGLISH_ORIGINAL_ASSESSMENT_SCOPE);
        const sourceQuestion = point.assessmentSpec.match(
          /首考题 1（资料定位）：(.+?)；首考题 2（机制解释）：/,
        )?.[1] ?? '';
        expect(
          sourceQuestion,
          `${point.code} 的资料定位题必须只以中文核心讲义命题，英文原文只能核验版本`,
        ).toContain('只允许使用《中文核心讲义》');
        expect(
          (sourceQuestion.match(/《/g) ?? []).length,
          `${point.code} 的资料定位题仍混入了中文核心讲义以外的命题资料`,
        ).toBe(1);

        const guideFile = point.studyMaterial.includes('../chinese-guides/advanced-topics.md#')
          ? 'advanced-topics.md'
          : 'core-and-ecosystem-topics.md';
        const guideText = fs.readFileSync(
          path.join(root, 'docs/knowledge/chinese-guides', guideFile),
          'utf8',
        );
        const escapedCode = point.code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const guideSection = guideText.match(
          new RegExp(`^## ${escapedCode}\\r?\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm'),
        )?.[1]?.trim() ?? '';
        const chineseExternalCount = extractMarkdownLinks(point.studyMaterial).filter(
          ({ markup, url }) => /^https?:\/\//i.test(url) && isChineseResource(markup),
        ).length;
        const minimumGuideLength =
          chineseExternalCount === 0 ? 200 : chineseExternalCount === 1 ? 140 : 120;
        if (guideSection.length < minimumGuideLength) {
          insufficientChineseGuides.push(
            `${point.code}:${guideSection.length}/${minimumGuideLength}（中文外部资料 ${chineseExternalCount}）`,
          );
        }
      }
      expect(`${point.studyMaterial}\n${point.assessmentSpec}`).not.toMatch(
        /2025-11-25|react\.dev\/learn\/displaying-data|docs\.sigstore\.dev\/cosign\/overview\/|ant\.design\/docs\/spec\/api\/|responsible-use\/copilot-code-review|sre\.google\/sre-book\/risk-engineering|techwriting\.withgoogle\.com\/resources\/one\/two\/review|multi-step-tools|docs\.docker\.com\/build\/guide\/|modelcards\.withgoogle\.com|rework\.withgoogle\.com|www\.gov\.cn\/xinwen\/2021-08-20/,
      );
    }
    expect(
      insufficientChineseGuides,
      '保留英文核验原文的知识点必须有与中文外部资料数量相匹配的中文讲义深度',
    ).toEqual([]);
    expect(
      insufficientCoverageScopes,
      '覆盖范围必须足以界定机制、反例和验收边界',
    ).toEqual([]);

    const pointsByCode = new Map(points.map((point) => [point.code, point]));
    for (const code of [
      'CS-01', 'CS-02', 'CS-03', 'DEBUG-01', 'WEB-05', 'SEC-04', 'UX-01',
      'RUNTIME-01', 'RUNTIME-02', 'MOBILE-01', 'SEO-01', 'AIAPP-11', 'AIAPP-12',
      'WEBAGENT-01', 'JS-07', 'BROWSER-02', 'SEC-05', 'TEST-04', 'PWA-02',
      'WEBAI-11', 'AGENT-11', 'AIUI-01', 'AIAPP-13', 'AIMEDIA-01', 'SUSTAIN-01',
      'DX-01', 'MEDIA-01', 'WASM-01', 'AIDEV-11',
      'NODE-04', 'EDITOR-01', 'LOCALFIRST-01', 'EMBED-01',
    ]) {
      expect(pointsByCode.has(code), `${code} 必须进入正式知识体系`).toBe(true);
    }
    for (const code of ['AI-01', 'CAREER-03', 'PERF-05', 'DEPLOY-02', 'AIDEV-05', 'AGENT-02', 'MCP-02']) {
      expect(pointsByCode.has(code), `${code} 已被合并，不应继续形成重复学习合同`).toBe(false);
    }
    expect(pointsByCode.get('JS-01')?.studyMaterial).not.toMatch(/React|useEffect/i);
    expect(pointsByCode.get('JS-01')?.assessmentSpec).not.toMatch(/React|useEffect/i);
    expect(pointsByCode.get('JS-06')?.studyMaterial).toContain('https://nodejs.cn/api/esm.html');
    expect(pointsByCode.get('JS-06')?.studyMaterial).not.toContain('https://nodejs.org/api/esm.html');
    expect(pointsByCode.get('REACT-04')?.studyMaterial).toMatch(/Effect|Effects/i);
    for (const code of ['GIT-01', 'GIT-02', 'GIT-03']) {
      expect(pointsByCode.get(code)?.studyMaterial, `${code} 必须使用中文 Git 学习资料`)
        .toMatch(/git-scm\.com\/book\/zh\/v2|docs\.github\.com\/zh\//);
      expect(pointsByCode.get(code)?.studyMaterial, `${code} 不应依赖英文必读资料`)
        .not.toContain('英文原文');
    }
    expect(pointsByCode.get('WEB-01')?.studyMaterial).not.toContain('w3.org/WAI/ARIA/apg');
    expect(pointsByCode.get('WEB-01')?.studyMaterial).not.toContain('英文原文');
    expect(pointsByCode.get('WEB-01')?.studyMaterial).toContain(
      'https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Extensions/Forms',
    );
    expect(pointsByCode.get('WEB-01')?.studyMaterial).toContain(
      'https://developer.mozilla.org/zh-CN/docs/Web/Accessibility/ARIA',
    );
    expect(pointsByCode.get('A11Y-01')?.studyMaterial).not.toContain('w3.org/WAI/ARIA/apg');
    expect(pointsByCode.get('A11Y-01')?.studyMaterial).not.toContain('英文原文');
    expect(pointsByCode.get('AIAPP-05')?.studyMaterial).toContain(
      'https://modelcontextprotocol.io/extensions/apps/overview',
    );
    expect(pointsByCode.get('BROWSER-02')?.studyMaterial).toContain('scheduler.yield');
    expect(pointsByCode.get('H5-03')?.studyMaterial).toContain('lbs.amap.com/api/javascript-api-v2');
    expect(pointsByCode.get('H5-03')?.studyMaterial).toContain('multipart-upload');
    expect(pointsByCode.get('AIAPP-09')?.studyMaterial).toContain('token_usage');
    expect(pointsByCode.get('AIAPP-09')?.studyMaterial).toContain('kv_cache');
    expect(pointsByCode.get('WEBAI-05')?.studyMaterial).toContain('Origin_private_file_system');
    expect(pointsByCode.get('WEBAI-03')?.studyMaterial).toContain('完成 `WASM-01`');
    expect(pointsByCode.get('AIDEV-11')?.studyMaterial).toContain('playwright.nodejs.cn/docs/trace-viewer');

    const guideFiles = [
      'advanced-topics.md',
      'core-and-ecosystem-topics.md',
    ] as const;
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
    const domain = parseKnowledgeMarkdown(`# 01 示例\n\n## JS-99 自定义负载\n- [ ] 自评已掌握\n- [ ] 已通过严格考核\n- 学习资料：官方文档\n- 严格考核：完成项目\n- 通过标准：达到 80 分\n- 预计耗时：资料 60 分钟；练习 120 分钟；项目 90 分钟；考核 75 分钟；复测 45 分钟`, 'example.md');
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
    const source = '# 01 示例\n\n## JS-99 换行兼容\n- [ ] 自评已掌握\n- [ ] 已通过严格考核\n- 学习资料：官方文档\n- 严格考核：完成项目\n- 通过标准：达到 80 分';
    expect(parseKnowledgeMarkdown(source, 'lf.md').points).toHaveLength(1);
    expect(parseKnowledgeMarkdown(source.replace(/\n/g, '\r\n'), 'crlf.md').points).toHaveLength(1);
  });
});
