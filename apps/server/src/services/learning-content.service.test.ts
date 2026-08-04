import { describe, expect, it } from 'vitest';
import { extractLearningMaterialReferences } from './learning-content.service.js';

describe('学习资料引用', () => {
  it('让站内练习和掌握挑战直接打开中文讲义章节', () => {
    const [reference] = extractLearningMaterialReferences(
      '[中文补充讲义](../chinese-guides/content-audit-01-03.md#react-06)',
      'Reducer 与 Context',
    );
    expect(reference?.url).toBe('/knowledge/materials/content-audit-01-03.md/react-06');
    expect(reference?.locator).toContain('react 06');
  });

  it('保留已核验外部学习资料 URL', () => {
    const [reference] = extractLearningMaterialReferences(
      '[MDN](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript)',
      'JavaScript 基础',
    );
    expect(reference?.url).toBe('https://developer.mozilla.org/zh-CN/docs/Web/JavaScript');
  });
});
