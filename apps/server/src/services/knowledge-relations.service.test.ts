import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolvePointTaxonomy } from '@career-atlas/content-parser';
import { projectRoot } from '../config/index.js';
import {
  CONTENT_PLAN_WEEK_COUNT,
  CORE_ROUTE_BATCH_COUNT,
  DEFAULT_TRACK_IDS,
  FRAMEWORK_ROUTE_CANDIDATES,
  KNOWLEDGE_PATHS,
  LEARNING_WEEK_PATHS,
  RECOMMENDED_KNOWLEDGE_ROUTE,
  buildRelationDefinitions,
} from './knowledge-relations.service.js';

describe('知识关系与紧凑核心路线编排', () => {
  it('完整体系包含 223 点，35 个非空批次覆盖 149 个主干点且不生成占位任务', () => {
    const knowledgeCodes = KNOWLEDGE_PATHS.flat();
    const plannedCodes = Object.entries(LEARNING_WEEK_PATHS)
      .filter(([week]) => Number(week) <= CONTENT_PLAN_WEEK_COUNT)
      .flatMap(([, codes]) => codes);

    const plannedSet = new Set(plannedCodes);
    expect(new Set(knowledgeCodes).size).toBe(223);
    expect(CORE_ROUTE_BATCH_COUNT).toBe(35);
    expect(Object.keys(LEARNING_WEEK_PATHS)).toHaveLength(CORE_ROUTE_BATCH_COUNT);
    expect(Object.values(LEARNING_WEEK_PATHS).every((codes) => codes.length >= 4 && codes.length <= 5)).toBe(true);
    expect(plannedCodes).toHaveLength(149);
    expect(plannedSet.size).toBe(plannedCodes.length);
    expect(plannedCodes).toEqual(RECOMMENDED_KNOWLEDGE_ROUTE);
    KNOWLEDGE_PATHS.forEach((path, index) => {
      const domainCode = String(index + 1).padStart(2, '0');
      for (const code of path) {
        const { requirementLevel, trackIds } = resolvePointTaxonomy(code, domainCode);
        const belongsToDefaultTrack = requirementLevel === 'TRACK_REQUIRED'
          && trackIds.some((trackId) => DEFAULT_TRACK_IDS.has(trackId));
        expect(
          plannedSet.has(code),
          `${code} 的默认路线归属与要求级别不一致`,
        ).toBe(requirementLevel === 'REQUIRED' || belongsToDefaultTrack);
      }
    });

    expect([...DEFAULT_TRACK_IDS]).toEqual(['react', 'vue', 'agent-mcp']);
    expect(plannedSet.has('REACT-01')).toBe(true);
    expect(plannedSet.has('REACT-09')).toBe(true);
    expect(plannedSet.has('VUE-01')).toBe(true);
    expect(plannedSet.has('VUE-11')).toBe(true);
    expect(plannedSet.has('VUE-09')).toBe(false);

    const plannedFrameworkRoute = RECOMMENDED_KNOWLEDGE_ROUTE.filter(
      (code) => code.startsWith('REACT-') || code.startsWith('VUE-'),
    );
    expect(plannedFrameworkRoute).toEqual(
      FRAMEWORK_ROUTE_CANDIDATES.filter((code) => code !== 'VUE-09'),
    );
  });

  it('唯一推荐路线文档的 35 个批次与运行时逐点一致', () => {
    const document = readFileSync(resolve(projectRoot, 'docs/plans/self-paced-learning-route.md'), 'utf8');
    const rows = [...document.matchAll(/^\| B(\d{2}) \| ([^|]+) \|$/gm)];
    expect(rows).toHaveLength(CORE_ROUTE_BATCH_COUNT);
    for (const row of rows) {
      const batch = Number(row[1]);
      const codes = [...row[2]!.matchAll(/`([A-Z0-9-]+)`/g)].map((match) => match[1]);
      expect(codes, `路线文档 B${row[1]} 与运行时不一致`).toEqual(LEARNING_WEEK_PATHS[batch]);
    }
  });

  it('只把真实依赖建成硬前置，不把推荐阅读顺序机械转成前置', () => {
    const prerequisites = buildRelationDefinitions().filter((relation) => relation.type === 'PREREQUISITE');
    const relationKeys = new Set(prerequisites.map((relation) => `${relation.source}->${relation.target}`));

    expect(relationKeys.has('REACT-04->REACT-05')).toBe(true);
    expect(relationKeys.has('REACT-05->REACT-04')).toBe(false);
    expect(relationKeys.has('BIZ-03->UMI-04')).toBe(true);
    expect(relationKeys.has('UMI-04->BIZ-03')).toBe(false);
    expect(relationKeys.has('GIT-01->GIT-02')).toBe(true);
    expect(relationKeys.has('GIT-02->DEBUG-01')).toBe(false);
    expect(relationKeys.has('MCP-01->AGENT-08')).toBe(true);
    expect(relationKeys.has('A11Y-01->UX-01')).toBe(true);
    expect(relationKeys.has('ENG-04->ENG-07')).toBe(false);
    expect(relationKeys.has('ENG-02->ENG-07')).toBe(true);
    expect(relationKeys.has('CS-02->CS-03')).toBe(true);
    expect(relationKeys.has('SEC-04->WEBAGENT-01')).toBe(true);
    expect(relationKeys.has('AIAPP-01->AIAPP-12')).toBe(true);
    expect(relationKeys.has('AIAPP-12->AIAPP-13')).toBe(true);
    expect(relationKeys.has('AGENT-07->AGENT-11')).toBe(true);
    expect(relationKeys.has('WEBAI-03->WEBAI-11')).toBe(false);
    expect(relationKeys.has('PWA-01->PWA-02')).toBe(true);
    expect(relationKeys.has('TEST-04->ENG-06')).toBe(true);
    expect(relationKeys.has('AIAPP-09->SUSTAIN-01')).toBe(false);
    expect(relationKeys.has('HYBRID-01->MOBILE-01')).toBe(false);
    expect(relationKeys.has('ENG-06->DX-01')).toBe(true);
    expect(relationKeys.has('H5-03->MEDIA-01')).toBe(false);
    expect(relationKeys.has('MEDIA-02->AIAPP-11')).toBe(true);
    expect(relationKeys.has('WASM-01->WEBAI-03')).toBe(true);
    expect(relationKeys.has('AIDEV-03->AIDEV-11')).toBe(true);
    expect(relationKeys.has('NODE-02->NODE-04')).toBe(true);
    expect(relationKeys.has('SEC-04->EMBED-01')).toBe(true);
    expect(relationKeys.has('PWA-01->LOCALFIRST-01')).toBe(false);
    expect(relationKeys.has('API-01->API-02')).toBe(true);
    expect(relationKeys.has('DOCKER-01->DOCKER-04')).toBe(true);
    expect(relationKeys.has('AIAPP-01->AIAPP-02')).toBe(true);
    expect(relationKeys.has('TS-07->AIAPP-03')).toBe(true);
    expect(relationKeys.has('MCP-01->AGENT-10')).toBe(true);
    expect(relationKeys.has('AGENT-01->AGENT-07')).toBe(true);
    expect(relationKeys.has('PWA-01->WEBAI-09')).toBe(false);
    expect(relationKeys.has('TS-08->BIZ-03')).toBe(false);
    expect(relationKeys.has('ENG-06->DEPLOY-01')).toBe(false);
    expect(relationKeys.has('REACT-08->RENDER-02')).toBe(false);
    expect(relationKeys.has('AIAPP-02->WEBAI-04')).toBe(false);
    expect(relationKeys.has('AIAPP-02->AIAPP-11')).toBe(false);
    expect(relationKeys.has('AIGOV-01->AIMEDIA-01')).toBe(false);
    expect(relationKeys.has('AIAPP-06->WEBAI-06')).toBe(false);
    expect(relationKeys.has('MCP-01->AIAPP-05')).toBe(false);
    expect(relationKeys.has('RENDER-01->RENDER-02')).toBe(true);
    expect(relationKeys.has('REACT-02->REACT-10')).toBe(true);
    expect(relationKeys.has('VUE-02->VUE-05')).toBe(true);
    expect(relationKeys.has('VUE-05->VUE-06')).toBe(true);
    expect(relationKeys.has('VUE-02->VUE-08')).toBe(true);
    expect(relationKeys.has('VUE-07->VUE-11')).toBe(true);
    expect(relationKeys.has('ARCH-04->ARCH-05')).toBe(true);
    expect(relationKeys.has('WEB-01->EDITOR-01')).toBe(true);
    expect(relationKeys.has('AGENT-09->AGENT-10')).toBe(false);
  });

  it('关系定义没有重复且包含跨领域关联', () => {
    const definitions = buildRelationDefinitions();
    const keys = definitions.map((relation) => `${relation.source}:${relation.target}:${relation.type}`);
    const semanticPairs = new Map<string, Set<string>>();
    const knowledgeCodes = new Set(KNOWLEDGE_PATHS.flat());
    expect(new Set(keys).size).toBe(keys.length);
    for (const relation of definitions) {
      expect(knowledgeCodes.has(relation.source), `关系来源不存在：${relation.source}`).toBe(true);
      expect(knowledgeCodes.has(relation.target), `关系目标不存在：${relation.target}`).toBe(true);
      expect(relation.source, '关系不得指向自身').not.toBe(relation.target);
      const pairKey = [relation.source, relation.target].sort().join('<->');
      const types = semanticPairs.get(pairKey) ?? new Set<string>();
      types.add(relation.type);
      semanticPairs.set(pairKey, types);
    }
    const conflictingPairs = [...semanticPairs.entries()]
      .filter(([, types]) => types.has('PREREQUISITE') && types.has('RELATED'))
      .map(([pair]) => pair);
    expect(conflictingPairs, '同一知识对不得同时标记为前置与相关').toEqual([]);
    expect(definitions.some((relation) => relation.source === 'REACT-05' && relation.target === 'VUE-06' && relation.type === 'RELATED')).toBe(true);
    expect(definitions.some((relation) => relation.source === 'REACT-10' && relation.target === 'VUE-07' && relation.type === 'RELATED')).toBe(true);
    expect(definitions.some((relation) => relation.source === 'REACT-09' && relation.target === 'VUE-11' && relation.type === 'RELATED')).toBe(true);
    expect(definitions.some((relation) => relation.source === 'AIAPP-04' && relation.target === 'AGENT-01' && relation.type === 'PREREQUISITE')).toBe(true);
  });

  it('硬前置关系构成无环图', () => {
    const codes = KNOWLEDGE_PATHS.flat();
    const adjacency = new Map(codes.map((code) => [code, [] as string[]]));
    const indegree = new Map(codes.map((code) => [code, 0]));
    for (const relation of buildRelationDefinitions().filter((item) => item.type === 'PREREQUISITE')) {
      adjacency.get(relation.source)!.push(relation.target);
      indegree.set(relation.target, indegree.get(relation.target)! + 1);
    }
    const queue = codes.filter((code) => indegree.get(code) === 0);
    let visited = 0;
    while (queue.length > 0) {
      const code = queue.shift()!;
      visited++;
      for (const target of adjacency.get(code)!) {
        const next = indegree.get(target)! - 1;
        indegree.set(target, next);
        if (next === 0) queue.push(target);
      }
    }
    expect(visited, '硬前置关系中存在循环依赖').toBe(codes.length);
  });

  it('所有跨批次前置知识都排在依赖知识之前', () => {
    const weekByCode = new Map(Object.entries(LEARNING_WEEK_PATHS)
      .filter(([week]) => Number(week) <= CONTENT_PLAN_WEEK_COUNT)
      .flatMap(([week, codes]) => codes.map((code) => [code, Number(week)] as const)));
    for (const relation of buildRelationDefinitions().filter((item) => item.type === 'PREREQUISITE')) {
      const sourceWeek = weekByCode.get(relation.source);
      const targetWeek = weekByCode.get(relation.target);
      if (targetWeek === undefined) continue;
      expect(sourceWeek, `${relation.source} 是 ${relation.target} 的前置，但不在默认路线`).toBeDefined();
      expect(
        sourceWeek!,
        `${relation.source}（批次 ${sourceWeek}）必须早于 ${relation.target}（批次 ${targetWeek}）`,
      ).toBeLessThanOrEqual(targetWeek!);
    }
  });
});
