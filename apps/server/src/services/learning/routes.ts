import { planLearningRoute, ROUTE_OUTCOME_TEXT, type RouteState } from '@career-atlas/shared';
import { rawDb } from '../../db/index.js';
import { enrichPoint, fieldDescription, requirePoint } from './points.js';
import { getLearningPreferences } from './preferences.js';
export { planLearningRoute } from '@career-atlas/shared';
/** 所有入口读取同一快照；查看某篇文章不参与选择焦点。 */
export function getLearningRoute() {
  return rawDb.transaction(() => {
    const preferences = getLearningPreferences();
    const rows = rawDb.prepare('SELECT code, learning_state AS state, current_focus AS focus FROM knowledge_points ORDER BY updated_at DESC, code ASC').all() as Array<{ code: string; state: RouteState; focus: number }>;
    const focuses = rows.filter(row => row.focus);
    const current = focuses[0] ?? rows.find(row => row.state === 'LEARNING');
    const route = planLearningRoute({ frameworkChoice: preferences.frameworkChoice, preferenceRevision: preferences.revision, currentFocusCode: current?.code, states: new Map(rows.map(row => [row.code, row.state])) });
    if (focuses.length > 1) route.diagnostics.push('存在多个显式焦点，已按更新时间倒序、code 字典序展示；未修改记录。');
    return route;
  })();
}
export function getNextBranches(_code: string) {
  const route = getLearningRoute();
  if (!route.next) return [];
  const point = requirePoint(route.next.code);
  const prerequisite = route.next.kind === 'PREREQUISITE';
  return [{ ...enrichPoint(point), relation: prerequisite ? 'PREREQUISITE' : 'CONTINUE',
    relationDescription: ROUTE_OUTCOME_TEXT[route.outcome], recommended: true, requiredPrerequisite: prerequisite,
    routeChoice: null, routeChoiceScope: null, navigationKind: prerequisite ? 'PREREQUISITE' : 'CONTINUE',
    trackName: '我的下一步', trackRemaining: 1, field: fieldDescription(point.domainTitle),
    impactIfDeferred: '暂缓后路线会明确暂停，不会自动跨入其他框架。' }];
}
