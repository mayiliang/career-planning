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
  it('应解析 15 个领域和 143 个唯一知识点', () => {
    const root = findProjectRoot();
    const knowledgeDir = path.join(root, 'docs/knowledge/knowledge-base');
    const files = fs.readdirSync(knowledgeDir)
      .filter((file) => /^(0[1-9]|1[0-5])-.*\.md$/.test(file))
      .sort();
    const contents = new Map(
      files.map((file) => [
        path.join(knowledgeDir, file),
        fs.readFileSync(path.join(knowledgeDir, file), 'utf8'),
      ]),
    );
    const domains = parseAllKnowledgeFiles(contents);
    const points = domains.flatMap((domain) => domain.points);

    expect(domains).toHaveLength(15);
    expect(points).toHaveLength(143);
    expect(new Set(points.map((point) => point.code)).size).toBe(143);
    for (const point of points) {
      expect(point.studyMaterial, `${point.code} 缺少学习资料`).not.toBe('');
      expect(point.assessmentSpec, `${point.code} 缺少严格考核`).not.toBe('');
      expect(point.passCriteria, `${point.code} 缺少通过标准`).not.toBe('');
      expect(point.estimatedTotalMinutes, `${point.code} 缺少首次掌握耗时`).toBeGreaterThanOrEqual(180);
      expect(point.retestMinutes, `${point.code} 缺少复测耗时`).toBeGreaterThanOrEqual(30);
      expect(point.estimatedTotalMinutes).toBe(
        point.studyMinutes + point.practiceMinutes + point.projectMinutes + point.assessmentMinutes,
      );
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
});
