/**
 * 知识点服务
 * 
 * Phase 2 实现：
 * - 知识点列表查询（支持筛选）
 * - 知识点详情查询
 * - 摘要更新
 * - 自评掌握命令（状态机）
 */
import { eq, and, like, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { db, rawDb } from '../db/index.js';
import { knowledgePoints, knowledgeDomains, masteryEvents } from '../db/schema.js';
import type { KnowledgeStatus } from '@career-atlas/shared';
import { KNOWLEDGE_ROUTE_INDEX } from './knowledge-relations.service.js';

// ===== 查询参数 Schema =====
export const KnowledgeListQuerySchema = z.object({
  domainId: z.string().optional(), // 领域 ID
  status: z.enum(['NOT_STARTED', 'LEARNING', 'SELF_MASTERED', 'FIRST_PASS_PENDING_RETEST', 'MASTERED', 'NEEDS_RELEARNING']).optional(),
  search: z.string().optional(), // 搜索关键词（标题、code）
});

export type KnowledgeListQuery = z.infer<typeof KnowledgeListQuerySchema>;

// ===== 响应类型 =====
export interface KnowledgePointListItem {
  id: string;
  code: string;
  title: string;
  difficulty: string;
  planWeek: number | null;
  status: KnowledgeStatus;
  domainId: string;
  domainCode: string;
  domainTitle: string;
  selfMasteredAt: string | null;
  firstPassedAt: string | null;
  masteredAt: string | null;
  routeOrder: number;
  studyMinutes: number;
  practiceMinutes: number;
  projectMinutes: number;
  assessmentMinutes: number;
  retestMinutes: number;
  estimatedTotalMinutes: number;
}

export interface KnowledgeRecommendation {
  action: 'LEARN' | 'CONTINUE' | 'ASSESS' | 'RETEST' | 'RELEARN' | 'COMPLETE';
  readiness: 'READY' | 'BLOCKED' | 'COMPLETE';
  reason: string;
  point: KnowledgePointListItem | null;
  blockers: Array<{ code: string; title: string; status: KnowledgeStatus }>;
  prerequisiteProgress: { mastered: number; total: number };
  routePosition: { week: number; index: number; total: number } | null;
}

export interface KnowledgePointDetail extends KnowledgePointListItem {
  summary: string | null;
  studyMaterialMd: string;
  assessmentSpecMd: string;
  passCriteriaMd: string;
  createdAt: string;
  updatedAt: string;
}

// ===== 服务函数 =====

/**
 * 获取知识点列表（支持筛选）
 */
export async function getKnowledgePoints(query: KnowledgeListQuery): Promise<{
  items: KnowledgePointListItem[];
  total: number;
}> {
  // 构建筛选条件
  const conditions = [];
  
  if (query.domainId) {
    conditions.push(eq(knowledgePoints.domainId, query.domainId));
  }
  
  if (query.status) {
    conditions.push(eq(knowledgePoints.status, query.status));
  }
  
  // 搜索条件（标题或 code）
  if (query.search) {
    const searchPattern = `%${query.search}%`;
    conditions.push(
      or(
        like(knowledgePoints.title, searchPattern),
        like(knowledgePoints.code, searchPattern)
      )
    );
  }
  
  // 查询知识点列表（关联领域）
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  
  const rows = await db
    .select({
      id: knowledgePoints.id,
      code: knowledgePoints.code,
      title: knowledgePoints.title,
      difficulty: knowledgePoints.difficulty,
      planWeek: knowledgePoints.planWeek,
      status: knowledgePoints.status,
      domainId: knowledgePoints.domainId,
      domainCode: knowledgeDomains.code,
      domainTitle: knowledgeDomains.title,
      selfMasteredAt: knowledgePoints.selfMasteredAt,
      firstPassedAt: knowledgePoints.firstPassedAt,
      masteredAt: knowledgePoints.masteredAt,
      studyMinutes: knowledgePoints.studyMinutes,
      practiceMinutes: knowledgePoints.practiceMinutes,
      projectMinutes: knowledgePoints.projectMinutes,
      assessmentMinutes: knowledgePoints.assessmentMinutes,
      retestMinutes: knowledgePoints.retestMinutes,
    })
    .from(knowledgePoints)
    .innerJoin(knowledgeDomains, eq(knowledgePoints.domainId, knowledgeDomains.id))
    .where(whereClause)
    .orderBy(knowledgeDomains.orderIndex, knowledgePoints.code);

  // 清单默认沿推荐学习路径排列，避免字母序把 Agent 等后置能力提前展示。
  const items = rows.map((item) => {
    const route = KNOWLEDGE_ROUTE_INDEX.get(item.code);
    return {
      ...item,
      planWeek: route?.week ?? item.planWeek,
      routeOrder: route?.order ?? Number.MAX_SAFE_INTEGER,
      estimatedTotalMinutes: item.studyMinutes + item.practiceMinutes + item.projectMinutes + item.assessmentMinutes,
    };
  }).sort((left, right) => left.routeOrder - right.routeOrder || left.code.localeCompare(right.code));
  
  // 统计总数
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(knowledgePoints)
    .where(whereClause);
  
  const total = countResult[0]?.count || 0;
  
  return { items, total };
}

/**
 * 获取知识点详情
 */
export async function getKnowledgePointByCode(code: string): Promise<KnowledgePointDetail | null> {
  const results = await db
    .select({
      id: knowledgePoints.id,
      code: knowledgePoints.code,
      title: knowledgePoints.title,
      summary: knowledgePoints.summary,
      studyMaterialMd: knowledgePoints.studyMaterialMd,
      assessmentSpecMd: knowledgePoints.assessmentSpecMd,
      passCriteriaMd: knowledgePoints.passCriteriaMd,
      difficulty: knowledgePoints.difficulty,
      planWeek: knowledgePoints.planWeek,
      status: knowledgePoints.status,
      domainId: knowledgePoints.domainId,
      domainCode: knowledgeDomains.code,
      domainTitle: knowledgeDomains.title,
      selfMasteredAt: knowledgePoints.selfMasteredAt,
      firstPassedAt: knowledgePoints.firstPassedAt,
      masteredAt: knowledgePoints.masteredAt,
      createdAt: knowledgePoints.createdAt,
      updatedAt: knowledgePoints.updatedAt,
      studyMinutes: knowledgePoints.studyMinutes,
      practiceMinutes: knowledgePoints.practiceMinutes,
      projectMinutes: knowledgePoints.projectMinutes,
      assessmentMinutes: knowledgePoints.assessmentMinutes,
      retestMinutes: knowledgePoints.retestMinutes,
    })
    .from(knowledgePoints)
    .innerJoin(knowledgeDomains, eq(knowledgePoints.domainId, knowledgeDomains.id))
    .where(eq(knowledgePoints.code, code))
    .limit(1);
  
  const result = results[0];
  if (!result) return null;
  const route = KNOWLEDGE_ROUTE_INDEX.get(result.code);
  return {
    ...result,
    planWeek: route?.week ?? result.planWeek,
    routeOrder: route?.order ?? Number.MAX_SAFE_INTEGER,
    estimatedTotalMinutes: result.studyMinutes + result.practiceMinutes + result.projectMinutes + result.assessmentMinutes,
  };
}

/**
 * 给出唯一、可解释的下一最佳行动。优先处理复测和首考，再继续已开始的学习，
 * 最后从所有前置已掌握的节点中选择路径最靠前的一项。
 */
export async function getKnowledgeRecommendation(): Promise<KnowledgeRecommendation> {
  const { items } = await getKnowledgePoints({});
  const activeItems = items.filter((item) => item.status !== 'MASTERED');
  if (activeItems.length === 0) {
    return {
      action: 'COMPLETE', readiness: 'COMPLETE', reason: '全部知识点已经通过严格掌握闭环。',
      point: null, blockers: [], prerequisiteProgress: { mastered: 0, total: 0 }, routePosition: null,
    };
  }

  const prerequisiteRows = rawDb.prepare(`
    SELECT target.code AS targetCode, source.code, source.title, source.status
    FROM knowledge_edges edge
    JOIN knowledge_points source ON source.id = edge.source_point_id
    JOIN knowledge_points target ON target.id = edge.target_point_id
    WHERE edge.type = 'PREREQUISITE'
    ORDER BY edge.weight DESC, source.code ASC
  `).all() as Array<{ targetCode: string; code: string; title: string; status: KnowledgeStatus }>;
  const prerequisites = new Map<string, Array<{ code: string; title: string; status: KnowledgeStatus }>>();
  for (const row of prerequisiteRows) prerequisites.set(row.targetCode, [...(prerequisites.get(row.targetCode) ?? []), row]);

  const statePriority: Record<KnowledgeStatus, number> = {
    FIRST_PASS_PENDING_RETEST: 0,
    SELF_MASTERED: 1,
    NEEDS_RELEARNING: 2,
    LEARNING: 3,
    NOT_STARTED: 4,
    MASTERED: 9,
  };
  const candidates = activeItems.map((point) => {
    const allPrerequisites = prerequisites.get(point.code) ?? [];
    const blockers = allPrerequisites.filter((item) => item.status !== 'MASTERED');
    // 已开始或自评掌握也不能绕过前置闸门，避免形成“孤岛式掌握”。
    const stateReady = blockers.length === 0;
    return { point, allPrerequisites, blockers, stateReady };
  }).sort((left, right) => {
    const readinessDifference = Number(right.stateReady) - Number(left.stateReady);
    if (readinessDifference) return readinessDifference;
    const stateDifference = statePriority[left.point.status] - statePriority[right.point.status];
    return stateDifference || left.point.routeOrder - right.point.routeOrder;
  });
  const selected = candidates[0]!;
  const actionByStatus: Record<KnowledgeStatus, KnowledgeRecommendation['action']> = {
    NOT_STARTED: 'LEARN', LEARNING: 'CONTINUE', SELF_MASTERED: 'ASSESS',
    FIRST_PASS_PENDING_RETEST: 'RETEST', MASTERED: 'COMPLETE', NEEDS_RELEARNING: 'RELEARN',
  };
  const reasonByAction: Record<KnowledgeRecommendation['action'], string> = {
    LEARN: selected.stateReady ? '前置知识已经就绪，这是推荐路径中最靠前的未开始节点。' : '当前路径暂时被前置知识阻塞，先完成下方节点。',
    CONTINUE: '你已经开始学习，优先完成当前上下文能降低切换成本。',
    ASSESS: '你已完成自评，需要用严格首考把理解转成可验证证据。',
    RETEST: '首次考核已通过，完成复测后才会正式进入已掌握状态。',
    RELEARN: '最近一次严格考核未通过，先补齐薄弱点再重新挑战。',
    COMPLETE: '全部知识点已经通过严格掌握闭环。',
  };
  const route = KNOWLEDGE_ROUTE_INDEX.get(selected.point.code);
  return {
    action: actionByStatus[selected.point.status],
    readiness: selected.stateReady ? 'READY' : 'BLOCKED',
    reason: reasonByAction[actionByStatus[selected.point.status]],
    point: selected.point,
    blockers: selected.blockers,
    prerequisiteProgress: {
      mastered: selected.allPrerequisites.length - selected.blockers.length,
      total: selected.allPrerequisites.length,
    },
    routePosition: route ? { week: route.week, index: selected.point.routeOrder + 1, total: KNOWLEDGE_ROUTE_INDEX.size } : null,
  };
}

/**
 * 更新知识点摘要
 */
export async function updateKnowledgePointSummary(
  code: string,
  summary: string
): Promise<{ success: boolean; updatedAt: string }> {
  const now = new Date().toISOString();
  
  const result = await db
    .update(knowledgePoints)
    .set({
      summary,
      updatedAt: now,
    })
    .where(eq(knowledgePoints.code, code))
    .returning({ updatedAt: knowledgePoints.updatedAt });
  
  if (result.length === 0) {
    return { success: false, updatedAt: now };
  }
  
  const updated = result[0];
  return { success: true, updatedAt: updated?.updatedAt ?? now };
}

/**
 * 自评掌握命令（状态机）
 * 
 * 业务规则：
 * - 只有 NOT_STARTED 或 LEARNING 状态才能自评掌握
 * - 自评掌握后进入 SELF_MASTERED 状态
 * - 必须提供摘要或证据
 */
export async function selfMasterKnowledgePoint(
  code: string,
  summary: string
): Promise<{
  success: boolean;
  previousStatus: string;
  newStatus: string;
  selfMasteredAt: string;
}> {
  // 获取当前知识点
  const point = await getKnowledgePointByCode(code);
  
  if (!point) {
    throw new Error(`知识点不存在: ${code}`);
  }
  
  // 验证状态转换（状态机）
  const allowedStatuses = ['NOT_STARTED', 'LEARNING'];
  if (!allowedStatuses.includes(point.status)) {
    throw new Error(`当前状态不允许自评掌握: ${point.status}`);
  }
  
  // 验证摘要不为空
  if (!summary || summary.trim().length === 0) {
    throw new Error('自评掌握必须提供摘要');
  }
  
  // 更新状态和摘要
  const now = new Date().toISOString();
  const previousStatus = point.status;
  const newStatus = 'SELF_MASTERED' as const;
  
  db.transaction((tx) => {
    tx
      .update(knowledgePoints)
      .set({
        summary,
        status: newStatus,
        selfMasteredAt: now,
        updatedAt: now,
      })
      .where(eq(knowledgePoints.code, code))
      .run();

    tx.insert(masteryEvents).values({
      id: randomUUID(),
      knowledgePointCode: code,
      action: 'selfMastery',
      fromStatus: point.status,
      toStatus: newStatus,
      evidenceSummary: summary.trim().slice(0, 500),
      createdAt: now,
    }).run();
  });
  
  return {
    success: true,
    previousStatus,
    newStatus,
    selfMasteredAt: now,
  };
}
