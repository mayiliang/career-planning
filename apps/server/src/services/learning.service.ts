import { randomUUID } from 'node:crypto';
import { rawDb } from '../db/index.js';
import { aiThinkingRequestOption, config } from '../config/index.js';
import { KNOWLEDGE_PATHS, KNOWLEDGE_ROUTE_INDEX, RECOMMENDED_KNOWLEDGE_ROUTE } from './knowledge-relations.service.js';

export type LearningState = 'NOT_STARTED' | 'LEARNING' | 'LEARNED' | 'DEFERRED';
export type ChallengeProfile = 'THEORY_ONLY' | 'EXAMPLE_DRIVEN' | 'CODING' | 'DEBUGGING' | 'TOOL_OPERATION' | 'DESIGN_CASE';

type PointRow = {
  id: string;
  code: string;
  title: string;
  domainCode: string;
  domainTitle: string;
  learningState: LearningState;
  masteryLevel: number;
  currentFocus: number;
  learnedAt: string | null;
  deferReason: string | null;
  planWeek: number | null;
  studyMinutes: number;
  practiceMinutes: number;
  projectMinutes: number;
  assessmentMinutes: number;
  summary: string | null;
  studyMaterialMd?: string;
  assessmentSpecMd?: string;
  passCriteriaMd?: string;
};

const pointSelect = `
  SELECT kp.id, kp.code, kp.title, kd.code AS domainCode, kd.title AS domainTitle,
    kp.learning_state AS learningState, kp.mastery_level AS masteryLevel,
    kp.current_focus AS currentFocus, kp.learned_at AS learnedAt,
    kp.defer_reason AS deferReason, kp.plan_week AS planWeek,
    kp.study_minutes AS studyMinutes, kp.practice_minutes AS practiceMinutes,
    kp.project_minutes AS projectMinutes, kp.assessment_minutes AS assessmentMinutes,
    kp.summary
  FROM knowledge_points kp JOIN knowledge_domains kd ON kd.id = kp.domain_id`;

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
  const suggestedRows = rawDb.prepare(`${pointSelect}
    WHERE kp.learning_state = 'NOT_STARTED'`).all() as PointRow[];
  const routeSuggested = current ? getNextBranches(current.code)[0] : null;
  const suggested = routeSuggested ?? suggestedRows.sort(compareRouteOrder)[0];

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
    suggested: suggested ? ('challengeProfile' in suggested ? suggested : enrichPoint(suggested)) : null,
    stats,
    todayCheckin: checkin,
    recentlyLearned: recent.map(enrichPoint),
    principle: '系统不规定你今天必须学什么；你决定学习完成，系统只根据挑战证据判定掌握程度。',
  };
}

export function setCurrentLearningPoint(code: string) {
  const point = requirePoint(code);
  const now = new Date().toISOString();
  rawDb.transaction(() => {
    rawDb.prepare(`UPDATE knowledge_points SET current_focus = 0 WHERE current_focus = 1`).run();
    rawDb.prepare(`UPDATE knowledge_points SET current_focus = 1,
      learning_state = CASE WHEN learning_state IN ('NOT_STARTED', 'DEFERRED') THEN 'LEARNING' ELSE learning_state END,
      deferred_at = NULL, defer_reason = NULL, updated_at = ? WHERE code = ?`).run(now, code);
  })();
  return { code: point.code, learningState: 'LEARNING' as const, currentFocus: true, updatedAt: now };
}

export function markPointLearned(code: string) {
  const point = requirePoint(code);
  const now = new Date().toISOString();
  rawDb.transaction(() => {
    rawDb.prepare('UPDATE knowledge_points SET current_focus = 0 WHERE current_focus = 1 AND code <> ?').run(code);
    rawDb.prepare(`UPDATE knowledge_points SET learning_state = 'LEARNED', learned_at = ?, current_focus = 1,
      status = CASE WHEN status IN ('NOT_STARTED', 'LEARNING') THEN 'SELF_MASTERED' ELSE status END,
      self_mastered_at = COALESCE(self_mastered_at, ?), updated_at = ? WHERE code = ?`).run(now, now, now, code);
  })();
  return { code: point.code, learningState: 'LEARNED' as const, learnedAt: now, masteryLevel: point.masteryLevel };
}

export function deferPoint(code: string, reason?: string) {
  requirePoint(code);
  const now = new Date().toISOString();
  rawDb.prepare(`UPDATE knowledge_points SET learning_state = 'DEFERRED', current_focus = 0,
    deferred_at = ?, defer_reason = ?, updated_at = ? WHERE code = ?`).run(now, reason?.trim() || null, now, code);
  return { code, learningState: 'DEFERRED' as const, deferredAt: now, reason: reason?.trim() || null };
}

export function restorePoint(code: string) {
  requirePoint(code);
  const now = new Date().toISOString();
  rawDb.prepare(`UPDATE knowledge_points SET learning_state = 'NOT_STARTED', deferred_at = NULL,
    defer_reason = NULL, updated_at = ? WHERE code = ?`).run(now, code);
  return { code, learningState: 'NOT_STARTED' as const };
}

export function getNextBranches(code: string) {
  requirePoint(code);
  const trackIndex = KNOWLEDGE_PATHS.findIndex((path) => path.includes(code));
  const currentTrack = trackIndex >= 0 ? KNOWLEDGE_PATHS[trackIndex]! : RECOMMENDED_KNOWLEDGE_ROUTE;
  const position = currentTrack.indexOf(code);
  const directNextCode = currentTrack.slice(position + 1).find(isAvailableForRoute);

  // 一条路线尚未结束时只提供唯一下一步。相关关系仍保留在知识图谱，不在学习流程中提前制造分叉。
  if (directNextCode) {
    const next = getPointRow(directNextCode);
    return next ? [toNavigationPoint(next, {
      relation: 'CONTINUE',
      description: '当前学习路线中紧接此知识点的下一步；不会打乱路线或丢失其他方向。',
      navigationKind: 'CONTINUE',
      trackName: next.domainTitle,
      trackRemaining: countAvailable(currentTrack, currentTrack.indexOf(directNextCode)),
    })] : [];
  }

  // 当前路线走完后，才从其他尚未完成且未被暂缓的路线中各取一个入口。
  const trackChoices = KNOWLEDGE_PATHS
    .map((path, index) => ({ path, index, nextCode: path.find(isAvailableForRoute) }))
    .filter((item) => item.index !== trackIndex && item.nextCode)
    .map((item) => ({ ...item, point: getPointRow(item.nextCode!) }))
    .filter((item): item is typeof item & { point: PointRow } => Boolean(item.point))
    .sort((left, right) => compareRouteOrder(left.point, right.point))
    .slice(0, 6);

  return trackChoices.map(({ path, point }) => toNavigationPoint(point, {
    relation: 'TRACK_CHOICE',
    description: `“${point.domainTitle}”路线的下一个未完成知识点。未选择的路线不会被放弃，完成所选路线后仍会再次出现。`,
    navigationKind: 'TRACK_CHOICE',
    trackName: point.domainTitle,
    trackRemaining: countAvailable(path, path.indexOf(point.code)),
  }));
}

export function saveRouteChoice(sourceCode: string, targetCode: string, state: 'SELECTED' | 'DEFERRED', scope: 'POINT' | 'BRANCH', reason?: string) {
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

function isAvailableForRoute(code: string) {
  const state = rawDb.prepare('SELECT learning_state AS learningState FROM knowledge_points WHERE code = ?')
    .get(code) as { learningState: LearningState } | undefined;
  return Boolean(state && !['LEARNED', 'DEFERRED'].includes(state.learningState));
}

function getPointRow(code: string) {
  return rawDb.prepare(`${pointSelect} WHERE kp.code = ? LIMIT 1`).get(code) as PointRow | undefined;
}

function countAvailable(path: string[], from: number) {
  return path.slice(Math.max(0, from)).filter(isAvailableForRoute).length;
}

function toNavigationPoint(point: PointRow, route: {
  relation: 'CONTINUE' | 'TRACK_CHOICE';
  description: string;
  navigationKind: 'CONTINUE' | 'TRACK_CHOICE';
  trackName: string;
  trackRemaining: number;
}) {
  return {
    ...enrichPoint(point),
    relation: route.relation,
    relationDescription: route.description,
    recommended: route.navigationKind === 'CONTINUE',
    requiredPrerequisite: false,
    routeChoice: null,
    routeChoiceScope: null,
    navigationKind: route.navigationKind,
    trackName: route.trackName,
    trackRemaining: route.trackRemaining,
    field: fieldDescription(point.domainTitle),
    impactIfDeferred: route.navigationKind === 'CONTINUE'
      ? '系统会直接跳过它，继续推荐本路线后面的知识点；它只进入“稍后学习”，不会被删除。'
      : '暂缓整条路线后，该路线不会再出现在后续选择中；未暂缓的其他路线仍会保留。',
  };
}

export function savePointNote(code: string, contentMd: string) {
  const point = requirePoint(code);
  const content = contentMd.replace(/\r\n/g, '\n');
  const now = new Date().toISOString();
  return rawDb.transaction(() => {
    let note = rawDb.prepare(`SELECT * FROM knowledge_notes WHERE knowledge_point_code = ?`).get(code) as { id: string } | undefined;
    if (!note) {
      note = { id: randomUUID() };
      rawDb.prepare(`INSERT INTO knowledge_notes
        (id, knowledge_point_code, domain_code_snapshot, point_title_snapshot, original_md, active_version_source, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'ORIGINAL', ?, ?)`)
        .run(note.id, code, point.domainCode, point.title, content, now, now);
    } else {
      rawDb.prepare(`UPDATE knowledge_notes SET original_md = ?, point_title_snapshot = ?,
        domain_code_snapshot = ?, updated_at = ? WHERE id = ?`).run(content, point.title, point.domainCode, now, note.id);
    }
    const version = nextNoteVersion(note.id);
    rawDb.prepare(`INSERT INTO knowledge_note_versions
      (id, note_id, version_no, source, content_md, change_summary, created_at)
      VALUES (?, ?, ?, 'USER', ?, '用户保存原始笔记', ?)`)
      .run(randomUUID(), note.id, version, content, now);
    // 旧字段继续镜像原始笔记，保证旧页面、备份和导入流程仍可读取。
    rawDb.prepare(`UPDATE knowledge_points SET summary = ?, updated_at = ? WHERE code = ?`).run(content, now, code);
    return getNoteByCode(code)!;
  })();
}

export function getNoteByCode(code: string) {
  const note = rawDb.prepare(`SELECT kn.*, kd.title AS domainTitle
    FROM knowledge_notes kn LEFT JOIN knowledge_domains kd ON kd.code = kn.domain_code_snapshot
    WHERE kn.knowledge_point_code = ?`).get(code) as Record<string, unknown> | undefined;
  if (!note) return null;
  return normalizeNote(note, getNoteVersions(String(note.id)));
}

export type NoteSortMode = 'knowledge' | 'updated_desc' | 'updated_asc' | 'title_asc' | 'code_asc';

export function listNotes(search?: string, domainCode?: string, sort: NoteSortMode = 'knowledge') {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (search?.trim()) {
    clauses.push(`(kn.point_title_snapshot LIKE ? OR kn.knowledge_point_code LIKE ? OR kn.original_md LIKE ? OR kn.organized_md LIKE ?)`);
    const term = `%${search.trim()}%`;
    params.push(term, term, term, term);
  }
  if (domainCode) { clauses.push(`kn.domain_code_snapshot = ?`); params.push(domainCode); }
  const rows = rawDb.prepare(`SELECT kn.*, kd.title AS domainTitle
    FROM knowledge_notes kn LEFT JOIN knowledge_domains kd ON kd.code = kn.domain_code_snapshot
    ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
    ORDER BY kn.knowledge_point_code`).all(...params) as Record<string, unknown>[];
  const notes = rows.map((row) => normalizeNote(row, getNoteVersions(String(row.id))));
  const compareText = (left: string, right: string) => left.localeCompare(right, 'zh-CN', { numeric: true });
  return notes.sort((left, right) => {
    if (sort === 'updated_desc') return right.updatedAt.localeCompare(left.updatedAt) || left.routeOrder - right.routeOrder;
    if (sort === 'updated_asc') return left.updatedAt.localeCompare(right.updatedAt) || left.routeOrder - right.routeOrder;
    if (sort === 'title_asc') return compareText(left.pointTitle, right.pointTitle) || left.routeOrder - right.routeOrder;
    if (sort === 'code_asc') return compareText(left.knowledgePointCode, right.knowledgePointCode);
    return left.routeOrder - right.routeOrder || compareText(left.knowledgePointCode, right.knowledgePointCode);
  });
}

export async function organizePointNote(code: string) {
  return organizePointNoteStream(code, () => undefined);
}

export async function organizePointNoteStream(
  code: string,
  onDelta: (delta: string) => void,
  signal?: AbortSignal,
  onStatus: (message: string) => void = () => {},
  onThinking: (delta: string) => void = () => {},
) {
  const point = requirePoint(code, true);
  let note = getNoteByCode(code);
  if (!note) note = savePointNote(code, point.summary || '');
  if (!note.originalMd.trim()) throw new Error('请先写下一些原始笔记，再让 AI 整理。');

  let generated;
  let generationNotice: string | undefined;
  if (config.DEEPSEEK_API_KEY) {
    try {
      onStatus('正在连接 AI 并准备资料上下文');
      generated = await requestOrganizedNoteStream(point, note.originalMd, onDelta, onStatus, onThinking, signal);
    } catch (reason) {
      if (signal?.aborted) throw new DOMException('已停止本次整理', 'AbortError');
      generationNotice = reason instanceof Error ? reason.message : 'AI 暂时没有完成响应';
      onStatus('AI 暂时不可用，正在生成不会覆盖原文的安全排版稿');
      generated = localOrganizedDraft(point, note.originalMd, `${generationNotice}；本稿只做结构排版，没有执行 AI 事实核验。`);
    }
  } else {
    generationNotice = '当前未配置 AI，本稿只做结构排版，没有执行事实核验。';
    onStatus('当前未配置 AI，正在生成安全排版稿');
    generated = localOrganizedDraft(point, note.originalMd, generationNotice);
  }
  if (generated.mode === 'LOCAL_FALLBACK') {
    for (const chunk of generated.organizedMarkdown.match(/.{1,32}/gs) ?? []) onDelta(chunk);
  }
  if (signal?.aborted) throw new DOMException('生成已取消', 'AbortError');
  return { ...persistOrganizedNote(code, note.id, generated), generationNotice };
}

function persistOrganizedNote(
  code: string,
  noteId: string,
  generated: { organizedMarkdown: string; review: Record<string, unknown>; mode: 'AI' | 'LOCAL_FALLBACK' },
) {
  const now = new Date().toISOString();
  rawDb.transaction(() => {
    rawDb.prepare(`UPDATE knowledge_notes SET organized_md = ?, ai_review_json = ?, updated_at = ? WHERE id = ?`)
      .run(generated.organizedMarkdown, JSON.stringify(generated.review), now, noteId);
    rawDb.prepare(`INSERT INTO knowledge_note_versions
      (id, note_id, version_no, source, content_md, change_summary, created_at)
      VALUES (?, ?, ?, 'AI_DRAFT', ?, ?, ?)`)
      .run(randomUUID(), noteId, nextNoteVersion(noteId), generated.organizedMarkdown, 'AI 整理候选稿（未覆盖原文）', now);
  })();
  return { ...getNoteByCode(code)!, generationMode: generated.mode };
}

export function acceptOrganizedNote(code: string) {
  const note = getNoteByCode(code);
  if (!note?.organizedMd) throw new Error('当前没有可接受的 AI 整理稿。');
  const now = new Date().toISOString();
  rawDb.transaction(() => {
    rawDb.prepare(`UPDATE knowledge_notes SET active_version_source = 'ORGANIZED', updated_at = ? WHERE id = ?`).run(now, note.id);
    rawDb.prepare(`INSERT INTO knowledge_note_versions
      (id, note_id, version_no, source, content_md, change_summary, created_at)
      VALUES (?, ?, ?, 'AI_ACCEPTED', ?, '用户接受 AI 整理稿；原始笔记仍保留', ?)`)
      .run(randomUUID(), note.id, nextNoteVersion(note.id), note.organizedMd, now);
  })();
  return getNoteByCode(code)!;
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

function requirePoint(code: string, withContent = false): PointRow {
  const extra = withContent ? `, kp.study_material_md AS studyMaterialMd, kp.assessment_spec_md AS assessmentSpecMd, kp.pass_criteria_md AS passCriteriaMd` : '';
  const row = rawDb.prepare(`${pointSelect.replace('kp.summary', `kp.summary${extra}`)} WHERE kp.code = ? LIMIT 1`).get(code) as PointRow | undefined;
  if (!row) throw new Error(`知识点不存在：${code}`);
  return row;
}

function enrichPoint(point: PointRow) {
  const profile = inferChallengeProfile(point.code, point.title, point.domainTitle);
  return {
    ...point,
    currentFocus: Boolean(point.currentFocus),
    masteryLevel: Math.max(0, Math.min(4, point.masteryLevel || 0)),
    estimatedMinutes: point.studyMinutes + point.practiceMinutes + (profile === 'THEORY_ONLY' ? 0 : point.projectMinutes),
    challengeProfile: profile,
    challengeProfileLabel: profileLabel(profile),
    practiceRecommended: !['THEORY_ONLY'].includes(profile),
    learningApproach: approachFor(profile),
  };
}

function compareRouteOrder(left: PointRow, right: PointRow) {
  return (KNOWLEDGE_ROUTE_INDEX.get(left.code)?.order ?? Number.MAX_SAFE_INTEGER)
    - (KNOWLEDGE_ROUTE_INDEX.get(right.code)?.order ?? Number.MAX_SAFE_INTEGER)
    || left.code.localeCompare(right.code);
}

export function inferChallengeProfile(code: string, title: string, domainTitle: string): ChallengeProfile {
  const value = `${code} ${title} ${domainTitle}`.toLowerCase();
  if (/伦理|法规|合规|隐私原则|概念边界|职业|影响力|判断|治理/.test(value)) return 'THEORY_ONLY';
  if (/git|docker|linux|ci\/cd|发布|部署|调试工具|mcp|openapi|工具链/.test(value)) return 'TOOL_OPERATION';
  if (/排错|调试|故障|监控|可观测|兼容|诊断/.test(value)) return 'DEBUGGING';
  if (/架构|设计系统|技术方案|权限模型|业务建模|安全模型|演进/.test(value)) return 'DESIGN_CASE';
  if (/javascript|typescript|react|vue|css|html|node|算法|wasm|webgpu|组件|状态|hooks|数据层/.test(value)) return 'CODING';
  return 'EXAMPLE_DRIVEN';
}

function profileLabel(profile: ChallengeProfile) {
  return ({ THEORY_ONLY: '理解辨析型', EXAMPLE_DRIVEN: '示例驱动型', CODING: '编码验证型', DEBUGGING: '排错诊断型', TOOL_OPERATION: '工具操作型', DESIGN_CASE: '方案设计型' } as const)[profile];
}

function approachFor(profile: ChallengeProfile) {
  return ({
    THEORY_ONLY: '先建立概念、边界与反例；实战不是必选，案例辨析更合适。',
    EXAMPLE_DRIVEN: '先看最小示例，再回到文字解释机制，最后换一个例子复述。',
    CODING: '先理解机制，再运行最小代码、修改变量并观察结果。',
    DEBUGGING: '从可复现异常出发，形成“现象—假设—验证—修复”的证据链。',
    TOOL_OPERATION: '跟随一个真实工作流操作，保留命令、配置或产物作为证据。',
    DESIGN_CASE: '先读原则，再对一个具体场景做取舍并解释约束与代价。',
  } as const)[profile];
}

function fieldDescription(domainTitle: string) {
  if (domainTitle.includes('AI')) return 'AI 原生应用与智能研发';
  if (domainTitle.includes('工程') || domainTitle.includes('部署')) return '前端工程化与交付';
  if (domainTitle.includes('React') || domainTitle.includes('Vue')) return '框架与应用开发';
  if (domainTitle.includes('架构')) return '架构与技术领导力';
  if (domainTitle.includes('体验') || domainTitle.includes('设计')) return '组件、设计系统与体验';
  return domainTitle;
}

function nextNoteVersion(noteId: string) {
  const row = rawDb.prepare(`SELECT COALESCE(MAX(version_no), 0) + 1 AS version FROM knowledge_note_versions WHERE note_id = ?`).get(noteId) as { version: number };
  return row.version;
}

function getNoteVersions(noteId: string) {
  return rawDb.prepare(`SELECT id, version_no AS versionNo, source, change_summary AS changeSummary,
    created_at AS createdAt FROM knowledge_note_versions WHERE note_id = ? ORDER BY version_no DESC LIMIT 20`).all(noteId);
}

function normalizeNote(row: Record<string, unknown>, versions: unknown[]) {
  let review = null;
  try { review = row.ai_review_json ? JSON.parse(String(row.ai_review_json)) : null; } catch { review = null; }
  return {
    id: String(row.id),
    knowledgePointCode: String(row.knowledge_point_code),
    pointTitle: String(row.point_title_snapshot),
    domainCode: row.domain_code_snapshot ? String(row.domain_code_snapshot) : null,
    domainTitle: row.domainTitle ? String(row.domainTitle) : null,
    originalMd: String(row.original_md ?? ''),
    organizedMd: row.organized_md == null ? null : String(row.organized_md),
    activeVersionSource: String(row.active_version_source),
    activeMd: row.active_version_source === 'ORGANIZED' && row.organized_md ? String(row.organized_md) : String(row.original_md ?? ''),
    aiReview: review,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    routeOrder: KNOWLEDGE_ROUTE_INDEX.get(String(row.knowledge_point_code))?.order ?? Number.MAX_SAFE_INTEGER,
    versions,
  };
}

async function requestOrganizedNoteStream(
  point: PointRow,
  originalMd: string,
  onDelta: (delta: string) => void,
  onStatus: (message: string) => void,
  onThinking: (delta: string) => void,
  externalSignal?: AbortSignal,
) {
  const controller = new AbortController();
  const totalTimeoutMs = Math.max(config.DEEPSEEK_TIMEOUT_MS, 300_000);
  let abortReason: 'START_TIMEOUT' | 'IDLE_TIMEOUT' | 'TOTAL_TIMEOUT' | null = null;
  const startTimeout = setTimeout(() => { abortReason = 'START_TIMEOUT'; controller.abort(); }, 45_000);
  const totalTimeout = setTimeout(() => { abortReason = 'TOTAL_TIMEOUT'; controller.abort(); }, totalTimeoutMs);
  const abort = () => controller.abort();
  externalSignal?.addEventListener('abort', abort, { once: true });
  let idleTimer: ReturnType<typeof setInterval> | undefined;
  try {
    const response = await fetch(`${config.DEEPSEEK_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: config.DEEPSEEK_MODEL,
        temperature: 0.1,
        max_tokens: 6000,
        response_format: { type: 'json_object' },
        stream: true,
        ...aiThinkingRequestOption(),
        stream_options: { include_usage: true },
        messages: [
          { role: 'system', content: '你是严谨的中文前端学习笔记编辑。只能依据用户原笔记和给定学习资料核对；不得把不确定内容伪装成事实。原文永不被你覆盖。只返回 JSON，并且必须先输出 organizedMarkdown 字段，以便界面流式展示。' },
          { role: 'user', content: `请整理下面知识点笔记。要求：使用规范 Markdown；结构清晰、中文表达、纠正有资料依据的错误、补齐资料明确覆盖的重要遗漏；任何无法由资料确认的内容放入 uncertainItems。\n\n知识点：${point.code} ${point.title}\n\n用户原笔记：\n${originalMd.slice(0, 12000)}\n\n学习资料：\n${point.studyMaterialMd?.slice(0, 12000) || ''}\n\n通过标准：\n${point.passCriteriaMd?.slice(0, 3000) || ''}\n\n严格按字段顺序返回：{"organizedMarkdown":"...","review":{"corrections":["..."],"additions":["..."],"uncertainItems":["..."],"sourceGrounded":true}}` },
        ],
      }),
    });
    clearTimeout(startTimeout);
    if (!response.ok) throw new Error(`AI 服务返回 ${response.status}`);
    if (!response.body) throw new Error('AI 服务没有返回可读取的流');
    onStatus('AI 已连接，正在分析笔记和对应学习资料');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let wireBuffer = '';
    let content = '';
    let emittedLength = 0;
    let done = false;
    let lastActivityAt = Date.now();
    let receivedFirstContent = false;
    idleTimer = setInterval(() => {
      if (Date.now() - lastActivityAt > 60_000) {
        abortReason = 'IDLE_TIMEOUT';
        controller.abort();
      }
    }, 5_000);
    while (!done) {
      const result = await reader.read();
      done = result.done;
      if (result.value?.length) lastActivityAt = Date.now();
      wireBuffer += decoder.decode(result.value ?? new Uint8Array(), { stream: !done });
      const frames = wireBuffer.split(/\r?\n\r?\n/);
      wireBuffer = frames.pop() ?? '';
      for (const frame of frames) {
        const data = frame.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('\n');
        if (!data || data === '[DONE]') continue;
        const packet = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string; reasoning_content?: string; reasoning?: string } }> };
        const delta = packet.choices?.[0]?.delta;
        const thinkingDelta = delta?.reasoning_content ?? delta?.reasoning ?? '';
        const contentDelta = delta?.content ?? '';
        if (thinkingDelta) {
          onThinking(thinkingDelta);
          onStatus('AI 正在分析资料、核对事实与组织结构');
        }
        content += contentDelta;
        if (contentDelta && !receivedFirstContent) {
          receivedFirstContent = true;
          onStatus('AI 已开始输出，正在逐段整理 Markdown');
        }
        if (content.length > 200_000) throw new Error('AI 整理结果过长，已停止生成');
        const partial = extractPartialJsonString(content, 'organizedMarkdown');
        if (partial.value.length > emittedLength) {
          onDelta(partial.value.slice(emittedLength));
          emittedLength = partial.value.length;
        }
      }
    }
    if (!content.trim()) throw new Error('AI 没有返回整理结果');
    const parsed = JSON.parse(content.replace(/^```json\s*|\s*```$/g, '')) as { organizedMarkdown?: string; review?: Record<string, unknown> };
    if (!parsed.organizedMarkdown?.trim()) throw new Error('AI 整理结果缺少正文');
    if (parsed.organizedMarkdown.length > emittedLength) onDelta(parsed.organizedMarkdown.slice(emittedLength));
    return { organizedMarkdown: parsed.organizedMarkdown.trim(), review: parsed.review ?? {}, mode: 'AI' as const };
  } catch (reason) {
    if (externalSignal?.aborted) throw new DOMException('已停止本次整理', 'AbortError');
    if (abortReason === 'START_TIMEOUT') throw new Error('AI 在 45 秒内没有建立响应');
    if (abortReason === 'IDLE_TIMEOUT') throw new Error('AI 输出中断超过 60 秒');
    if (abortReason === 'TOTAL_TIMEOUT') throw new Error('AI 整理超过最长处理时间');
    if (reason instanceof Error && reason.name === 'AbortError') throw new Error('AI 请求被意外中止');
    throw reason;
  } finally {
    clearTimeout(startTimeout);
    clearTimeout(totalTimeout);
    if (idleTimer) clearInterval(idleTimer);
    externalSignal?.removeEventListener('abort', abort);
  }
}

/** 从仍在生成的 JSON 字符串字段中安全提取已完整解码的部分。 */
export function extractPartialJsonString(source: string, field: string) {
  const marker = new RegExp(`"${field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s*:\\s*"`).exec(source);
  if (!marker) return { value: '', complete: false };
  let value = '';
  const start = marker.index + marker[0].length;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index]!;
    if (char === '"') return { value, complete: true };
    if (char !== '\\') { value += char; continue; }
    const escaped = source[index + 1];
    if (escaped == null) break;
    if (escaped === 'u') {
      const hex = source.slice(index + 2, index + 6);
      if (!/^[\da-fA-F]{4}$/.test(hex)) break;
      value += String.fromCharCode(Number.parseInt(hex, 16));
      index += 5;
      continue;
    }
    value += ({ n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '"': '"', '\\': '\\', '/': '/' } as Record<string, string>)[escaped] ?? escaped;
    index += 1;
  }
  return { value, complete: false };
}

function localOrganizedDraft(point: PointRow, originalMd: string, reason = '当前未配置 AI，以上内容仅做结构化排版，尚未完成事实核验。') {
  return {
    organizedMarkdown: `# ${point.title}\n\n## 我的原始记录\n\n${originalMd.trim()}\n\n## 待核对与补充\n\n- ${reason}`,
    review: { corrections: [], additions: [], uncertainItems: [reason], sourceGrounded: false },
    mode: 'LOCAL_FALLBACK' as const,
  };
}

function localDateKey(date: Date) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Hong_Kong', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
