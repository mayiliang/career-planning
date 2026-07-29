import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parseAllKnowledgeFiles } from './markdown.js';

const CHINESE_RESOURCE_PATTERN =
  /\[[^\]]+\]\((?:\.\.\/chinese-guides\/|https?:\/\/[^)]*(?:\/zh-CN\/|\/zh-cn\/|\/zh_cn\/|\/zh\/|zh-hans\.|cn\.vuejs\.org|cn\.vite\.dev|cn\.vitest\.dev|nodejs\.cn|node\.org\.cn|playwright\.nodejs\.cn|testing-library\.node\.org\.cn|eslint\.org\.cn|nuxt\.com\.cn|hl=zh-cn|umijs\.org|ant\.design|developer\.work\.weixin\.qq\.com|open\.dingtalk\.com|\.cn\/))[^)]*\)/i;
const ENGLISH_ORIGINAL_MARKER = '（英文原文，仅用于版本核验）';
const ENGLISH_ORIGINAL_SCOPE = '英文原文仅用于版本核验，不作为必读或独立首考题源。';
const ENGLISH_ORIGINAL_ASSESSMENT_SCOPE = '英文原文仅用于版本核验，不作为独立首考题源。';

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
  it('应解析 20 个领域和 190 个唯一知识点', () => {
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
    expect(points).toHaveLength(190);
    expect(new Set(points.map((point) => point.code)).size).toBe(190);
    for (const point of points) {
      expect(point.studyMaterial, `${point.code} 缺少学习资料`).not.toBe('');
      expect(point.assessmentSpec, `${point.code} 缺少严格考核`).not.toBe('');
      expect(point.passCriteria, `${point.code} 缺少通过标准`).not.toBe('');
      expect(point.studyMaterial, `${point.code} 学习资料缺少覆盖范围`).toContain('覆盖范围：');
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
      }
      expect(`${point.studyMaterial}\n${point.assessmentSpec}`).not.toMatch(
        /2025-11-25|react\.dev\/learn\/displaying-data|docs\.sigstore\.dev\/cosign\/overview\/|ant\.design\/docs\/spec\/api\/|responsible-use\/copilot-code-review|sre\.google\/sre-book\/risk-engineering|techwriting\.withgoogle\.com\/resources\/one\/two\/review|multi-step-tools|docs\.docker\.com\/build\/guide\/|modelcards\.withgoogle\.com|rework\.withgoogle\.com|www\.gov\.cn\/xinwen\/2021-08-20/,
      );
    }

    const pointsByCode = new Map(points.map((point) => [point.code, point]));
    expect(pointsByCode.get('JS-01')?.studyMaterial).not.toMatch(/React|useEffect/i);
    expect(pointsByCode.get('JS-01')?.assessmentSpec).not.toMatch(/React|useEffect/i);
    expect(pointsByCode.get('JS-06')?.studyMaterial).toContain('https://nodejs.cn/api/esm.html');
    expect(pointsByCode.get('JS-06')?.studyMaterial).not.toContain('https://nodejs.org/api/esm.html');
    expect(pointsByCode.get('REACT-04')?.studyMaterial).toMatch(/Effect|Effects/i);
    expect(pointsByCode.get('WEB-01')?.studyMaterial).not.toContain('w3.org/WAI/ARIA/apg');
    expect(pointsByCode.get('WEB-01')?.studyMaterial).not.toContain('英文原文');
    expect(pointsByCode.get('WEB-01')?.studyMaterial).toContain(
      'https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Extensions/Forms',
    );
    expect(pointsByCode.get('WEB-01')?.studyMaterial).toContain(
      'https://developer.mozilla.org/zh-CN/docs/Web/Accessibility/ARIA',
    );

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
