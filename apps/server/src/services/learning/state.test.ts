import Fastify from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { rawDb } from '../../db/index.js';
import { configureHttpContract } from '../../http/contract.js';
import { learningRoutes } from '../../http/routes/learning.js';
import { executeImport } from '../import.service.js';
import { deferPoint, markPointLearned, restorePoint, saveRouteChoice, setCurrentLearningPoint } from './state.js';
import { getNextBranches, planNextRoute } from './routes.js';

function reset() {
  rawDb.prepare('DELETE FROM learning_route_choices').run();
  rawDb.prepare("UPDATE knowledge_points SET learning_state = 'NOT_STARTED', current_focus = 0, learned_at = NULL, deferred_at = NULL, defer_reason = NULL, mastery_level = 0").run();
}

function point(code: string) {
  return rawDb.prepare('SELECT learning_state AS state, learned_at AS learnedAt, deferred_at AS deferredAt, defer_reason AS reason, mastery_level AS mastery, current_focus AS focus FROM knowledge_points WHERE code = ?').get(code);
}

describe('学习状态与路线一致性', () => {
  beforeAll(async () => { await executeImport(); });
  beforeEach(reset);
  afterAll(reset);

  it('重新聚焦已学完的知识点返回真实状态，并保留学习与掌握记录', async () => {
    setCurrentLearningPoint('JS-02');
    rawDb.prepare("UPDATE knowledge_points SET learning_state = 'LEARNED', learned_at = '2026-10-01', mastery_level = 3 WHERE code = 'JS-01'").run();
    const app = Fastify({ logger: false });
    configureHttpContract(app);
    app.register(learningRoutes);
    try {
      const response = await app.inject({ method: 'POST', url: '/api/v1/learning/points/JS-01/focus' });
      expect(response.statusCode).toBe(200);
      expect(response.json().data.learningState).toBe('LEARNED');
      expect(point('JS-01')).toMatchObject({ state: 'LEARNED', learnedAt: '2026-10-01', mastery: 3, focus: 1 });
      expect(point('JS-02')).toMatchObject({ focus: 0 });
    } finally { await app.close(); }
  });

  it.each([deferPoint, restorePoint])('不通过不适用的操作撤销已学完记录', operation => {
    markPointLearned('JS-01');
    const before = point('JS-01');
    expect(() => operation('JS-01')).toThrow('学习记录已保留');
    expect(point('JS-01')).toEqual(before);
  });

  it('恢复只针对暂缓状态，重复恢复仍是未开始', () => {
    deferPoint('JS-01', '稍后');
    expect(restorePoint('JS-01').learningState).toBe('NOT_STARTED');
    expect(restorePoint('JS-01').learningState).toBe('NOT_STARTED');
    expect(point('JS-01')).toMatchObject({ state: 'NOT_STARTED', deferredAt: null, reason: null });
    setCurrentLearningPoint('JS-01');
    expect(() => restorePoint('JS-01')).toThrow('只有暂缓');
  });

  it('完成学习清理暂缓信息，重复确认保留首次完成时间', () => {
    deferPoint('JS-01', '以后再学');
    markPointLearned('JS-01');
    rawDb.prepare("UPDATE knowledge_points SET learned_at = '2026-10-01' WHERE code = 'JS-01'").run();
    expect(markPointLearned('JS-01').learnedAt).toBe('2026-10-01');
    expect(point('JS-01')).toMatchObject({ state: 'LEARNED', deferredAt: null, reason: null });
  });

  it('不允许暂缓已学完的目标，失败时不留下路线选择记录', () => {
    markPointLearned('JS-02');
    expect(() => saveRouteChoice('JS-01', 'JS-02', 'DEFERRED', 'POINT')).toThrow('已学完');
    expect(rawDb.prepare('SELECT * FROM learning_route_choices').all()).toEqual([]);
    expect(point('JS-02')).toMatchObject({ state: 'LEARNED' });
  });

  it('整条路线暂缓中途失败时回滚选择记录和所有状态，随后可重试', () => {
    rawDb.exec(`CREATE TRIGGER reject_route_defer BEFORE UPDATE ON knowledge_points
      WHEN NEW.code = 'TS-02' AND NEW.learning_state = 'DEFERRED'
      BEGIN SELECT RAISE(ABORT, 'simulated route failure'); END;`);
    try {
      expect(() => saveRouteChoice('JS-01', 'TS-01', 'DEFERRED', 'BRANCH')).toThrow('simulated route failure');
      expect(rawDb.prepare('SELECT * FROM learning_route_choices').all()).toEqual([]);
      expect(point('TS-01')).toMatchObject({ state: 'NOT_STARTED' });
      expect(point('TS-02')).toMatchObject({ state: 'NOT_STARTED' });
    } finally { rawDb.exec('DROP TRIGGER reject_route_defer'); }
    saveRouteChoice('JS-01', 'TS-01', 'DEFERRED', 'BRANCH');
    expect(point('TS-01')).toMatchObject({ state: 'DEFERRED' });
    expect(point('TS-09')).toMatchObject({ state: 'DEFERRED' });
    expect(rawDb.prepare('SELECT * FROM learning_route_choices').all()).toHaveLength(1);
  });

  it('一份状态快照决定唯一下一步和剩余数量，忽略缺失、已学完与暂缓项', () => {
    const plan = planNextRoute('JS-01', new Map([
      ['JS-01', 'LEARNED'], ['JS-02', 'DEFERRED'], ['JS-03', 'LEARNED'],
      ['JS-07', 'LEARNING'], ['CS-01', 'NOT_STARTED'],
    ]));
    expect(plan).toEqual([{ code: 'JS-07', kind: 'CONTINUE', remaining: 2, mainline: true }]);
  });

  it('路线状态变化立即生效，223 个知识点的分支规划保持有界查询次数', () => {
    expect(getNextBranches('JS-01')[0]?.code).toBe('JS-02');
    deferPoint('JS-02');
    expect(getNextBranches('JS-01')[0]?.code).toBe('JS-03');
    restorePoint('JS-02');
    expect(getNextBranches('JS-01')[0]?.code).toBe('JS-02');
    const prepare = vi.spyOn(rawDb, 'prepare');
    try {
      expect(getNextBranches('LEAD-01').length).toBeGreaterThan(1);
      expect(prepare.mock.calls.length).toBeLessThanOrEqual(3);
    } finally { prepare.mockRestore(); }
  });
});
