/** 自主学习路线、学习状态与打卡；笔记接口由独立服务提供。 */
import { randomUUID } from 'node:crypto';
import { rawDb } from '../db/index.js';
import { pointSelect, requirePoint, enrichPoint, compareRouteOrder, type PointRow } from './learning/points.js';
import { getNextBranches } from './learning/routes.js';
export { getNextBranches } from './learning/routes.js';
export { setCurrentLearningPoint, markPointLearned, deferPoint, restorePoint, saveRouteChoice } from './learning/state.js';
export { inferChallengeProfile, type LearningState, type ChallengeProfile } from './learning/points.js';

export {
  savePointNote, getNoteByCode, listNotes, organizePointNote, organizePointNoteStream,
  acceptOrganizedNote, extractPartialJsonString, type NoteSortMode,
} from './notes.service.js';

export function getLearningWorkspace() {
  let current = rawDb.prepare(`${pointSelect} WHERE kp.current_focus = 1 LIMIT 1`).get() as PointRow | undefined;
  if (!current) {
    current = rawDb.prepare(`${pointSelect}
      WHERE kp.learning_state = 'LEARNING'
      ORDER BY kp.updated_at DESC LIMIT 1`).get() as PointRow | undefined;
  }
  // 已学完的知识点会留在学习台，直到用户明确开始下一项，避免完成动作让学习现场突然消失。
  if (!current) {
    current = rawDb.prepare(`${pointSelect}
      WHERE kp.learning_state = 'LEARNED'
      ORDER BY kp.learned_at DESC LIMIT 1`).get() as PointRow | undefined;
  }
  // 学习台、路线参考和详情页必须使用同一份路线索引，不能依赖导入时为空的 plan_week。
  const routeSuggested = current ? getNextBranches(current.code)[0] : null;
  let suggested: ReturnType<typeof enrichPoint> | null | undefined = routeSuggested;
  if (!suggested) {
    const candidates = rawDb.prepare("SELECT code FROM knowledge_points WHERE learning_state = 'NOT_STARTED'").all() as Array<{ code: string }>;
    const next = candidates.sort(compareRouteOrder)[0];
    if (next) suggested = enrichPoint(requirePoint(next.code));
  }

  const stats = rawDb.prepare(`SELECT
    COUNT(*) AS total,
    SUM(CASE WHEN learning_state = 'LEARNED' THEN 1 ELSE 0 END) AS learned,
    SUM(CASE WHEN learning_state = 'LEARNING' THEN 1 ELSE 0 END) AS learning,
    SUM(CASE WHEN learning_state = 'DEFERRED' THEN 1 ELSE 0 END) AS deferred,
    SUM(CASE WHEN mastery_level >= 3 THEN 1 ELSE 0 END) AS mastered,
    SUM(CASE WHEN mastery_level >= 4 THEN 1 ELSE 0 END) AS stable
    FROM knowledge_points`).get() as Record<string, number>;
  const today = localDateKey(new Date());
  const checkin = getCheckin(today);
  const recent = rawDb.prepare(`${pointSelect}
    WHERE kp.learning_state = 'LEARNED'
    ORDER BY kp.learned_at DESC LIMIT 5`).all() as PointRow[];

  return {
    mode: 'SELF_PACED' as const,
    current: current ? enrichPoint(current) : null,
    suggested: suggested ?? null,
    stats,
    todayCheckin: checkin,
    recentlyLearned: recent.map(enrichPoint),
    principle: '系统不规定你今天必须学什么；你决定学习完成，系统只根据挑战证据判定掌握程度。',
  };
}

export function saveCheckin(input: { date: string; pointCodes: string[]; summaryMd?: string; actualMinutes?: number; energyLevel?: number; difficultyLevel?: number }) {
  const uniqueCodes = [...new Set(input.pointCodes)];
  uniqueCodes.forEach((code) => requirePoint(code));
  const now = new Date().toISOString();
  return rawDb.transaction(() => {
    let row = rawDb.prepare(`SELECT id FROM learning_checkins WHERE checkin_date = ?`).get(input.date) as { id: string } | undefined;
    if (!row) {
      row = { id: randomUUID() };
      rawDb.prepare(`INSERT INTO learning_checkins
        (id, checkin_date, summary_md, actual_minutes, energy_level, difficulty_level, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(row.id, input.date, input.summaryMd?.trim() || null,
          input.actualMinutes ?? null, input.energyLevel ?? null, input.difficultyLevel ?? null, now, now);
    } else {
      rawDb.prepare(`UPDATE learning_checkins SET summary_md = ?, actual_minutes = ?, energy_level = ?,
        difficulty_level = ?, updated_at = ? WHERE id = ?`).run(input.summaryMd?.trim() || null,
          input.actualMinutes ?? null, input.energyLevel ?? null, input.difficultyLevel ?? null, now, row.id);
      rawDb.prepare(`DELETE FROM learning_checkin_points WHERE checkin_id = ?`).run(row.id);
    }
    const insert = rawDb.prepare(`INSERT INTO learning_checkin_points
      (id, checkin_id, knowledge_point_code, activity, created_at) VALUES (?, ?, ?, ?, ?)`);
    for (const code of uniqueCodes) {
      const point = requirePoint(code);
      const activity = point.learningState === 'LEARNED' ? 'LEARNED' : 'PROGRESSED';
      insert.run(randomUUID(), row.id, code, activity, now);
    }
    return getCheckin(input.date)!;
  })();
}

export function getCheckin(date: string) {
  const row = rawDb.prepare(`SELECT id, checkin_date AS checkinDate, summary_md AS summaryMd,
    actual_minutes AS actualMinutes, energy_level AS energyLevel, difficulty_level AS difficultyLevel,
    created_at AS createdAt, updated_at AS updatedAt FROM learning_checkins WHERE checkin_date = ?`).get(date) as Record<string, unknown> | undefined;
  if (!row) return null;
  const points = rawDb.prepare(`SELECT lcp.knowledge_point_code AS code, kp.title, lcp.activity
    FROM learning_checkin_points lcp LEFT JOIN knowledge_points kp ON kp.code = lcp.knowledge_point_code
    WHERE lcp.checkin_id = ? ORDER BY lcp.rowid`).all(row.id);
  return { ...row, points };
}

function localDateKey(date: Date) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Hong_Kong', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
