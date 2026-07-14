import { describe, expect, it } from 'vitest';
import { LEARNING_WEEK_PATHS } from './plan.service.js';
import { KNOWLEDGE_PATHS, buildRelationDefinitions } from './knowledge-relations.service.js';

describe('知识关系与 16 周计划编排', () => {
  it('前 15 周恰好覆盖全部 132 个唯一知识点', () => {
    const knowledgeCodes = KNOWLEDGE_PATHS.flat();
    const plannedCodes = Object.entries(LEARNING_WEEK_PATHS)
      .filter(([week]) => Number(week) <= 15)
      .flatMap(([, codes]) => codes);

    expect(new Set(knowledgeCodes).size).toBe(132);
    expect(new Set(plannedCodes).size).toBe(132);
    expect(new Set(plannedCodes)).toEqual(new Set(knowledgeCodes));
  });

  it('每个领域除起点外都有明确的领域内前置知识', () => {
    const prerequisites = buildRelationDefinitions().filter((relation) => relation.type === 'PREREQUISITE');
    const relationKeys = new Set(prerequisites.map((relation) => `${relation.source}->${relation.target}`));

    for (const path of KNOWLEDGE_PATHS) {
      for (let index = 1; index < path.length; index++) {
        expect(relationKeys.has(`${path[index - 1]}->${path[index]}`)).toBe(true);
      }
    }
  });

  it('关系定义没有重复且包含跨领域关联', () => {
    const definitions = buildRelationDefinitions();
    const keys = definitions.map((relation) => `${relation.source}:${relation.target}:${relation.type}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(definitions.some((relation) => relation.source === 'REACT-05' && relation.target === 'VUE-06' && relation.type === 'RELATED')).toBe(true);
    expect(definitions.some((relation) => relation.source === 'AIAPP-04' && relation.target === 'AGENT-01' && relation.type === 'PREREQUISITE')).toBe(true);
  });
});
