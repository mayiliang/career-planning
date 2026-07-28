import { describe, expect, it } from 'vitest';
import { CONTENT_PLAN_WEEK_COUNT, LEARNING_WEEK_PATHS } from './plan.service.js';
import { KNOWLEDGE_PATHS, buildRelationDefinitions } from './knowledge-relations.service.js';

describe('知识关系与 48 周计划编排', () => {
  it('前 44 周恰好覆盖全部 190 个唯一知识点', () => {
    const knowledgeCodes = KNOWLEDGE_PATHS.flat();
    const plannedCodes = Object.entries(LEARNING_WEEK_PATHS)
      .filter(([week]) => Number(week) <= CONTENT_PLAN_WEEK_COUNT)
      .flatMap(([, codes]) => codes);

    expect(new Set(knowledgeCodes).size).toBe(190);
    expect(new Set(plannedCodes).size).toBe(190);
    expect(new Set(plannedCodes)).toEqual(new Set(knowledgeCodes));
  });

  it('只把真实依赖建成硬前置，不把推荐阅读顺序机械转成前置', () => {
    const prerequisites = buildRelationDefinitions().filter((relation) => relation.type === 'PREREQUISITE');
    const relationKeys = new Set(prerequisites.map((relation) => `${relation.source}->${relation.target}`));

    expect(relationKeys.has('REACT-05->REACT-04')).toBe(true);
    expect(relationKeys.has('REACT-04->REACT-05')).toBe(false);
    expect(relationKeys.has('BIZ-03->UMI-04')).toBe(true);
    expect(relationKeys.has('UMI-04->BIZ-03')).toBe(false);
    expect(relationKeys.has('ENG-04->ENG-07')).toBe(true);
    expect(relationKeys.has('AGENT-09->AGENT-10')).toBe(false);
  });

  it('关系定义没有重复且包含跨领域关联', () => {
    const definitions = buildRelationDefinitions();
    const keys = definitions.map((relation) => `${relation.source}:${relation.target}:${relation.type}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(definitions.some((relation) => relation.source === 'REACT-05' && relation.target === 'VUE-06' && relation.type === 'RELATED')).toBe(true);
    expect(definitions.some((relation) => relation.source === 'AIAPP-04' && relation.target === 'AGENT-01' && relation.type === 'PREREQUISITE')).toBe(true);
  });

  it('所有跨周前置知识都排在依赖知识之前', () => {
    const weekByCode = new Map(Object.entries(LEARNING_WEEK_PATHS)
      .filter(([week]) => Number(week) <= CONTENT_PLAN_WEEK_COUNT)
      .flatMap(([week, codes]) => codes.map((code) => [code, Number(week)] as const)));
    for (const relation of buildRelationDefinitions().filter((item) => item.type === 'PREREQUISITE')) {
      const sourceWeek = weekByCode.get(relation.source);
      const targetWeek = weekByCode.get(relation.target);
      expect(sourceWeek).toBeDefined();
      expect(targetWeek).toBeDefined();
      expect(
        sourceWeek!,
        `${relation.source}（第 ${sourceWeek} 周）必须早于 ${relation.target}（第 ${targetWeek} 周）`,
      ).toBeLessThanOrEqual(targetWeek!);
    }
  });
});
