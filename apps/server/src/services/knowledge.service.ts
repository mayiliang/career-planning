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
import { db } from '../db/index.js';
import { knowledgePoints, knowledgeDomains, masteryEvents } from '../db/schema.js';
import type { KnowledgeStatus } from '@career-atlas/shared';

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
  
  const items = await db
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
    })
    .from(knowledgePoints)
    .innerJoin(knowledgeDomains, eq(knowledgePoints.domainId, knowledgeDomains.id))
    .where(whereClause)
    .orderBy(knowledgePoints.code);
  
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
    })
    .from(knowledgePoints)
    .innerJoin(knowledgeDomains, eq(knowledgePoints.domainId, knowledgeDomains.id))
    .where(eq(knowledgePoints.code, code))
    .limit(1);
  
  return results[0] || null;
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
