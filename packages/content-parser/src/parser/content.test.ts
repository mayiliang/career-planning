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
  it('应解析 15 个领域和 132 个唯一知识点', () => {
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
    expect(points).toHaveLength(132);
    expect(new Set(points.map((point) => point.code)).size).toBe(132);
    for (const point of points) {
      expect(point.studyMaterial, `${point.code} 缺少学习资料`).not.toBe('');
      expect(point.assessmentSpec, `${point.code} 缺少严格考核`).not.toBe('');
      expect(point.passCriteria, `${point.code} 缺少通过标准`).not.toBe('');
    }
  });
});
