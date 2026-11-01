import { describe, expect, it } from 'vitest';
import { ASYNC_PILOT_NODES, planAsyncPilot, type PilotState } from './async-pilot.js';
const state = (values: Record<string, PilotState>) => new Map(Object.entries(values));
describe('异步链建议保持用户选择', () => {
  it('首次进入解释全部必要基础，阅读辅助没有知识点完成状态', () => {
    expect(planAsyncPilot(state({}), new Set()).prerequisites).toEqual(['PREJS-04', 'PREJS-07', 'JS-01']);
    expect(ASYNC_PILOT_NODES.filter(n => n.kind === 'POINT').map(n => n.code)).toEqual(['JS-01', 'JS-04', 'JS-05']);
  });
  it('已学前置不重复要求基础，当前学习继续', () => {
    expect(planAsyncPilot(state({ 'JS-04': 'LEARNED', 'JS-05': 'LEARNING' }), new Set(), 'JS-05')).toMatchObject({ target: 'JS-05', prerequisites: [] });
    expect(planAsyncPilot(state({ 'JS-01': 'LEARNED' }), new Set(['PREJS-07'])).prerequisites).toEqual([]);
  });
  it('未学与暂缓的硬前置不会当成满足或自动恢复', () => {
    const states = state({ 'JS-04': 'DEFERRED', 'JS-05': 'LEARNING' });
    const before = [...states];
    const result = planAsyncPilot(states, new Set(), 'JS-05');
    expect(result.prerequisites).toContain('JS-04');
    expect(result.reason).toContain('已暂缓');
    expect([...states]).toEqual(before);
    expect(result.target).toBe('JS-05');
  });
  it('链条完成时不重新推荐旧点', () => {
    expect(planAsyncPilot(state({ 'JS-04': 'LEARNED', 'JS-05': 'LEARNED' }), new Set())).toMatchObject({ target: null, prerequisites: [] });
  });
});
