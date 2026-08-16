import { describe, expect, it } from 'vitest';
import { extractLearningMaterialReferences, extractStrictAssessmentTasks, practiceSubmissionTemplate } from './learning-content.service.js';

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

describe('严格考核任务解析', () => {
  it('保留首考题 3 与首考题 4 的具体原文，并兼容简写题号', () => {
    const tasks = extractStrictAssessmentTasks('挑战类型：DEBUGGING；首考题 3：固定夹具为 A/B/C；提交时间线；首考题 4：仅改副作用层，注入旧响应；提交预期/实际、根因与回归；首考题 5：复述。');
    expect(tasks).toEqual({ minimumOutput: '固定夹具为 A/B/C；提交时间线', constrainedDebugging: '仅改副作用层，注入旧响应；提交预期/实际、根因与回归' });
    expect(practiceSubmissionTemplate('DEBUGGING')).toContain('# 回归验证证据');
  });
});
