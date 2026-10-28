/** 学习状态变更；返回与数据库一致的状态，保留学习完成记录。 */
import { rawDb } from '../../db/index.js';
import { randomUUID } from 'node:crypto';
import { KNOWLEDGE_PATHS } from '../knowledge-relations.service.js';
import { requirePoint } from './points.js';

export class LearningStateError extends Error {
  readonly statusCode = 409;
  readonly code = 'LEARNING_STATE_INVALID';
}

export function setCurrentLearningPoint(code: string) {
  const now = new Date().toISOString();
  return rawDb.transaction(() => {
    requirePoint(code);
    rawDb.prepare(`UPDATE knowledge_points SET current_focus = 0 WHERE current_focus = 1`).run();
    rawDb.prepare(`UPDATE knowledge_points SET current_focus = 1,
      learning_state = CASE WHEN learning_state IN ('NOT_STARTED', 'DEFERRED') THEN 'LEARNING' ELSE learning_state END,
      deferred_at = NULL, defer_reason = NULL, updated_at = ? WHERE code = ?`).run(now, code);
    return { code, learningState: requirePoint(code).learningState, currentFocus: true, updatedAt: now };
  }).immediate();
}

export function markPointLearned(code: string) {
  const now = new Date().toISOString();
  return rawDb.transaction(() => {
    const point = requirePoint(code);
    const learnedAt = point.learningState === 'LEARNED' && point.learnedAt ? point.learnedAt : now;
    rawDb.prepare('UPDATE knowledge_points SET current_focus = 0 WHERE current_focus = 1 AND code <> ?').run(code);
    rawDb.prepare(`UPDATE knowledge_points SET learning_state = 'LEARNED', learned_at = ?, current_focus = 1,
      deferred_at = NULL, defer_reason = NULL,
      status = CASE WHEN status IN ('NOT_STARTED', 'LEARNING') THEN 'SELF_MASTERED' ELSE status END,
      self_mastered_at = COALESCE(self_mastered_at, ?), updated_at = ? WHERE code = ?`).run(learnedAt, now, now, code);
    return { code, learningState: 'LEARNED' as const, learnedAt, masteryLevel: point.masteryLevel };
  }).immediate();
}

export function deferPoint(code: string, reason?: string) {
  const now = new Date().toISOString();
  return rawDb.transaction(() => {
    if (requirePoint(code).learningState === 'LEARNED') throw new LearningStateError('已学完的知识点不能改为暂缓，已有学习记录已保留。');
    rawDb.prepare(`UPDATE knowledge_points SET learning_state = 'DEFERRED', current_focus = 0,
      deferred_at = ?, defer_reason = ?, updated_at = ? WHERE code = ?`).run(now, reason?.trim() || null, now, code);
    return { code, learningState: 'DEFERRED' as const, deferredAt: now, reason: reason?.trim() || null };
  }).immediate();
}

export function restorePoint(code: string) {
  const now = new Date().toISOString();
  return rawDb.transaction(() => {
    const state = requirePoint(code).learningState;
    if (state !== 'DEFERRED' && state !== 'NOT_STARTED') throw new LearningStateError('只有暂缓的知识点才能恢复为未开始，当前学习记录已保留。');
    rawDb.prepare(`UPDATE knowledge_points SET learning_state = 'NOT_STARTED', deferred_at = NULL,
      defer_reason = NULL, updated_at = ? WHERE code = ?`).run(now, code);
    return { code, learningState: 'NOT_STARTED' as const };
  }).immediate();
}

export function saveRouteChoice(sourceCode: string, targetCode: string, state: 'SELECTED' | 'DEFERRED', scope: 'POINT' | 'BRANCH', reason?: string) {
  return rawDb.transaction(() => writeRouteChoice(sourceCode, targetCode, state, scope, reason)).immediate();
}

function writeRouteChoice(sourceCode: string, targetCode: string, state: 'SELECTED' | 'DEFERRED', scope: 'POINT' | 'BRANCH', reason?: string) {
  requirePoint(sourceCode);
  requirePoint(targetCode);
  const now = new Date().toISOString();
  const existing = rawDb.prepare(`SELECT id FROM learning_route_choices WHERE source_code = ? AND target_code = ?`).get(sourceCode, targetCode) as { id: string } | undefined;
  if (existing) {
    rawDb.prepare(`UPDATE learning_route_choices SET state = ?, scope = ?, reason = ?, updated_at = ? WHERE id = ?`)
      .run(state, scope, reason?.trim() || null, now, existing.id);
  } else {
    rawDb.prepare(`INSERT INTO learning_route_choices
      (id, source_code, target_code, state, scope, reason, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(randomUUID(), sourceCode, targetCode, state, scope, reason?.trim() || null, now, now);
  }
  if (state === 'DEFERRED' && scope === 'POINT') deferPoint(targetCode, reason || `从 ${sourceCode} 的后续路线暂缓`);
  if (state === 'DEFERRED' && scope === 'BRANCH') {
    const path = KNOWLEDGE_PATHS.find((candidate) => candidate.includes(targetCode)) ?? [targetCode];
    const start = Math.max(0, path.indexOf(targetCode));
    const targets = path.slice(start);
    const defer = rawDb.prepare(`UPDATE knowledge_points SET learning_state = 'DEFERRED', current_focus = 0,
      deferred_at = ?, defer_reason = ?, updated_at = ?
      WHERE code = ? AND learning_state NOT IN ('LEARNED')`);
    rawDb.transaction(() => {
      for (const target of targets) defer.run(now, reason?.trim() || `从 ${targetCode} 起暂缓整条路线`, now, target);
    })();
  }
  return { sourceCode, targetCode, state, scope, updatedAt: now };
}

