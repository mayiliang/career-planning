import { rawDb } from '../../db/index.js';
import { KNOWLEDGE_PATHS, RECOMMENDED_KNOWLEDGE_ROUTE } from '../knowledge-relations.service.js';
import { compareRouteOrder, enrichPoint, fieldDescription, pointSelect, type LearningState, type PointRow } from './points.js';

type RouteStep = { code: string; kind: 'CONTINUE' | 'TRACK_CHOICE'; remaining: number; mainline: boolean };

/** 在一份状态快照上规划路线；不在遍历过程中访问数据库。 */
export function planNextRoute(code: string, states: ReadonlyMap<string, LearningState>): RouteStep[] {
  if (!states.has(code)) throw new Error(`知识点不存在：${code}`);
  const available = (candidate: string) => {
    const state = states.get(candidate);
    return state !== undefined && state !== 'LEARNED' && state !== 'DEFERRED';
  };
  const countRemaining = (path: string[], candidate: string) => path.slice(path.indexOf(candidate)).filter(available).length;
  const trackIndex = KNOWLEDGE_PATHS.findIndex(path => path.includes(code));
  const mainline = RECOMMENDED_KNOWLEDGE_ROUTE.includes(code);
  const currentTrack = mainline ? RECOMMENDED_KNOWLEDGE_ROUTE : KNOWLEDGE_PATHS[trackIndex] ?? [code];
  const next = currentTrack.slice(currentTrack.indexOf(code) + 1).find(available);
  if (next) return [{ code: next, kind: 'CONTINUE', remaining: countRemaining(currentTrack, next), mainline }];
  return KNOWLEDGE_PATHS.flatMap((path, index) => {
    const code = index === trackIndex ? undefined : path.find(available);
    return code ? [{ code, kind: 'TRACK_CHOICE' as const, remaining: countRemaining(path, code), mainline: false }] : [];
  }).sort(compareRouteOrder).slice(0, 6);
}

export function getNextBranches(code: string) {
  return rawDb.transaction(() => {
    const states = rawDb.prepare('SELECT code, learning_state AS state FROM knowledge_points').all() as Array<{ code: string; state: LearningState }>;
    const steps = planNextRoute(code, new Map(states.map(point => [point.code, point.state])));
    if (!steps.length) return [];
    const rows = rawDb.prepare(`${pointSelect} WHERE kp.code IN (${steps.map(() => '?').join(',')})`)
      .all(...steps.map(step => step.code)) as PointRow[];
    const byCode = new Map(rows.map(point => [point.code, point]));
    return steps.map(step => {
      const point = byCode.get(step.code)!;
      const continuing = step.kind === 'CONTINUE';
      return {
        ...enrichPoint(point), relation: step.kind,
        relationDescription: continuing
          ? '当前学习路线中紧接此知识点的下一步；不会打乱路线或丢失其他方向。'
          : `“${point.domainTitle}”路线的下一个未完成知识点。未选择的路线不会被放弃，完成所选路线后仍会再次出现。`,
        recommended: continuing, requiredPrerequisite: false, routeChoice: null, routeChoiceScope: null,
        navigationKind: step.kind,
        trackName: step.mainline ? '求职优先核心路线' : point.domainTitle,
        trackRemaining: step.remaining, field: fieldDescription(point.domainTitle),
        impactIfDeferred: continuing
          ? '系统会直接跳过它，继续推荐本路线后面的知识点；它只进入“稍后学习”，不会被删除。'
          : '暂缓整条路线后，该路线不会再出现在后续选择中；未暂缓的其他路线仍会保留。',
      };
    });
  })();
}
