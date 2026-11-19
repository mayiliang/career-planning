/** 已审推荐合同；旧分组、人工关系与考核等级不参与规划。 */
export const LEARNING_ROUTE_VERSION = 'framework-foundation-v1';
export type FrameworkChoice = 'UNDECIDED' | 'REACT' | 'VUE' | 'NONE';
export interface LearningPreferences { frameworkChoice: FrameworkChoice; revision: number; updatedAt: string }
export const FOUNDATION_CODES = ['JS-01', 'JS-03', 'WEB-01', 'JS-04', 'JS-05'];
export const FRAMEWORK_CHAINS = { REACT: ['REACT-01', 'REACT-02', 'REACT-03', 'REACT-04'], VUE: ['VUE-01', 'VUE-02', 'VUE-03', 'VUE-04', 'VUE-05'] };
export const AUDITED_PREREQUISITES: Readonly<Record<string, readonly string[]>> = {
  'JS-01': [], 'JS-03': [], 'WEB-01': [], 'JS-04': ['JS-01'], 'JS-05': ['JS-04'],
  'REACT-01': ['JS-01', 'JS-03', 'WEB-01'], 'REACT-02': ['REACT-01'], 'REACT-03': ['REACT-02'], 'REACT-04': ['REACT-03', 'JS-05'],
  'VUE-01': ['WEB-01'], 'VUE-02': ['VUE-01'], 'VUE-03': ['VUE-02'], 'VUE-04': ['VUE-03'], 'VUE-05': ['VUE-04', 'JS-05'],
};
export const ASSESSMENT_PENDING: Readonly<Record<string, string>> = {
  'REACT-02': '筛选后编辑器行为与双面板复测夹具尚未统一。',
  'REACT-03': '价格刷新、空数量与对象切换整合夹具尚未发布。',
  'REACT-04': '连接时序、八个候选与卸载提交检查尚未固定。',
  'VUE-02': '十项片段、筛选故障补丁与浅层容器复测尚未固定。',
  'VUE-03': '列表身份、日期输入与复测排序边界尚未统一。',
  'VUE-04': '延迟确认、日期组件与模态焦点夹具尚未验证。',
  'VUE-05': '快慢请求、失效提交与错误恢复整合夹具尚未发布。',
};
export const ASSESSMENT_READY_CODES = ['REACT-01', 'VUE-01', 'JS-04', 'JS-05'];
export type RouteState = 'NOT_STARTED' | 'LEARNING' | 'LEARNED' | 'DEFERRED';
export type RouteOutcome = 'STEP' | 'CHOOSE_FRAMEWORK' | 'PAUSED_PREREQUISITE' | 'PAUSED_POINT' | 'AUDITED_CHAIN_COMPLETE' | 'NO_RECOMMENDATION' | 'DATA_GAP';
export interface RouteBlocker { code: string; state: string; reason: string; href: string; kind: 'POINT' | 'READING' }
export interface LearningRoute {
  routeVersion: string; preferenceRevision: number; frameworkChoice: FrameworkChoice;
  current: null | { code: string; outsideSelectedTrack: boolean; audited: boolean; blockers: RouteBlocker[] };
  next: null | { code: string; kind: 'CONTINUE' | 'PREREQUISITE' | 'START' };
  outcome: RouteOutcome; blockers: RouteBlocker[]; diagnostics: string[];
  reviewScope: { auditedCodes: string[]; assessmentReadyCodes: string[]; unreviewedCodes: string[] };
}
export const ROUTE_OUTCOME_TEXT: Record<RouteOutcome, string> = {
  STEP: '按当前偏好与学习记录推荐；可自由查阅其他资料。', CHOOSE_FRAMEWORK: '请选择框架方向，或暂不进入框架。',
  PAUSED_POINT: '下一项已暂缓；可查看详情并主动恢复。', PAUSED_PREREQUISITE: '所需基础已暂缓；可查看并主动恢复基础。',
  AUDITED_CHAIN_COMPLETE: '所选方向的已审学习链已完成；后续资料仍可浏览。', NO_RECOMMENDATION: '已审共同基础已完成，可调整方向或浏览全部资料。',
  DATA_GAP: '路线所需目录记录缺失，请检查资料导入。',
};
export function planLearningRoute(input: { frameworkChoice: FrameworkChoice; preferenceRevision: number; states: ReadonlyMap<string, RouteState>; currentFocusCode?: string; readingStates?: ReadonlySet<string> }): LearningRoute {
  const { states, frameworkChoice: choice } = input;
  const selected = choice === 'REACT' || choice === 'VUE' ? FRAMEWORK_CHAINS[choice] : FOUNDATION_CODES;
  const result: LearningRoute = { routeVersion: LEARNING_ROUTE_VERSION, preferenceRevision: input.preferenceRevision, frameworkChoice: choice,
    current: null, next: null, outcome: 'NO_RECOMMENDATION', blockers: [], diagnostics: [],
    reviewScope: { auditedCodes: Object.keys(AUDITED_PREREQUISITES), assessmentReadyCodes: [...ASSESSMENT_READY_CODES], unreviewedCodes: [...states.keys()].filter(code => !(code in AUDITED_PREREQUISITES)) } };
  const blocker = (code: string): RouteBlocker => ({ code, state: states.get(code) ?? 'MISSING', reason: !states.has(code) ? '目录记录缺失' : states.get(code) === 'DEFERRED' ? '已暂缓，需主动恢复' : '建议补齐此基础', href: `/knowledge/${code}`, kind: 'POINT' });
  const readings = (code: string) => code === 'JS-04' ? ['PREJS-04', 'PREJS-07'].filter(id => !input.readingStates?.has(id)).map(id => ({ code: id, state: 'READING_HINT', reason: '阅读辅助，可按需查阅，不是完成门槛', href: `/knowledge/materials/${id === 'PREJS-04' ? 'javascript-scheduled-callbacks' : 'javascript-promises-and-cancellation'}.md/${id.toLowerCase()}`, kind: 'READING' as const })) : [];
  const pending = (code: string): string | undefined => {
    if (states.get(code) === 'LEARNED') return;
    if (!states.has(code) || states.get(code) === 'DEFERRED') return code;
    for (const prerequisite of AUDITED_PREREQUISITES[code] ?? []) { const found = pending(prerequisite); if (found) return found; }
    return code;
  };
  const focus = input.currentFocusCode;
  if (focus) {
    if (!states.has(focus)) { result.outcome = 'DATA_GAP'; result.blockers = [blocker(focus)]; return result; }
    const blockers = (AUDITED_PREREQUISITES[focus] ?? []).map(pending).filter((code): code is string => !!code).map(blocker).concat(readings(focus));
    result.current = { code: focus, outsideSelectedTrack: !selected.includes(focus) && !FOUNDATION_CODES.includes(focus), audited: focus in AUDITED_PREREQUISITES, blockers };
    if (states.get(focus) === 'LEARNING') { result.next = { code: focus, kind: 'CONTINUE' }; result.outcome = 'STEP'; result.blockers = blockers; return result; }
  }
  if (choice === 'UNDECIDED') { result.outcome = 'CHOOSE_FRAMEWORK'; return result; }
  const target = selected.find(code => states.get(code) !== 'LEARNED');
  if (!target) { result.outcome = choice === 'NONE' ? 'NO_RECOMMENDATION' : 'AUDITED_CHAIN_COMPLETE'; return result; }
  const next = pending(target)!;
  if (!states.has(next)) { result.outcome = 'DATA_GAP'; result.blockers = [blocker(next)]; }
  else if (states.get(next) === 'DEFERRED') { result.outcome = next === target ? 'PAUSED_POINT' : 'PAUSED_PREREQUISITE'; result.blockers = [blocker(next)]; }
  else { result.outcome = 'STEP'; result.next = { code: next, kind: next === target ? 'START' : 'PREREQUISITE' }; result.blockers = readings(next); }
  return result;
}
