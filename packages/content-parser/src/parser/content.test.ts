import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parseAllKnowledgeFiles } from './markdown.js';

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
  it('应解析 16 个领域和 153 个唯一知识点', () => {
    const root = findProjectRoot();
    const knowledgeDir = path.join(root, 'docs/knowledge/knowledge-base');
    const files = fs.readdirSync(knowledgeDir)
      .filter((file) => /^(0[1-9]|1[0-6])-.*\.md$/.test(file))
      .sort();
    const contents = new Map(
      files.map((file) => [
        path.join(knowledgeDir, file),
        fs.readFileSync(path.join(knowledgeDir, file), 'utf8'),
      ]),
    );
    const domains = parseAllKnowledgeFiles(contents);
    const points = domains.flatMap((domain) => domain.points);

    expect(domains).toHaveLength(16);
    expect(points).toHaveLength(153);
    expect(new Set(points.map((point) => point.code)).size).toBe(153);
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
      expect(point.assessmentSpec, `${point.code} 严格考核缺少资料限制`).toContain('只允许使用');
      expect(point.assessmentSpec, `${point.code} 严格考核缺少参考答案回指要求`).toContain('参考答案必须逐题回指学习资料');
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
    }

    const pointsByCode = new Map(points.map((point) => [point.code, point]));
    expect(pointsByCode.get('JS-01')?.studyMaterial).not.toMatch(/React|useEffect/i);
    expect(pointsByCode.get('JS-01')?.assessmentSpec).not.toMatch(/React|useEffect/i);
    expect(pointsByCode.get('REACT-04')?.studyMaterial).toMatch(/Effect|Effects/i);
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
});
