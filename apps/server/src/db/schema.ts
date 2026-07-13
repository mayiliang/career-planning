/**
 * Drizzle ORM Schema
 * 
 * Phase 1 实现：核心知识表（符合 04-data-model-and-content-import.md）
 */
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

// ===== 知识领域表 =====
export const knowledgeDomains = sqliteTable('knowledge_domains', {
  id: text('id').primaryKey().notNull(),
  code: text('code').notNull().unique(),
  
  title: text('title').notNull(),
  description: text('description'),
  
  // 排序和来源
  orderIndex: integer('order_index').notNull(),
  sourcePath: text('source_path').notNull(),
  sourceHash: text('source_hash').notNull(),
  
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ===== 知识点表 =====
export const knowledgePoints = sqliteTable('knowledge_points', {
  id: text('id').primaryKey().notNull(),
  code: text('code').notNull().unique(),
  
  // 关联
  domainId: text('domain_id').notNull().references(() => knowledgeDomains.id, { onDelete: 'cascade' }),
  
  // 内容
  title: text('title').notNull(),
  summary: text('summary'), // 用户补充摘要
  
  // 学习资料和考核（从 Markdown 导入）
  studyMaterialMd: text('study_material_md').notNull(),
  assessmentSpecMd: text('assessment_spec_md').notNull(),
  passCriteriaMd: text('pass_criteria_md').notNull(),
  
  // 属性
  difficulty: text('difficulty', { enum: ['intermediate', 'senior', 'advanced'] }).notNull(),
  planWeek: integer('plan_week'), // 推荐周次
  
  // 状态（由状态机管理）
  status: text('status', {
    enum: ['NOT_STARTED', 'LEARNING', 'SELF_MASTERED', 'FIRST_PASS_PENDING_RETEST', 'MASTERED', 'NEEDS_RELEARNING']
  }).notNull(),
  
  // 状态时间
  selfMasteredAt: text('self_mastered_at'),
  firstPassedAt: text('first_passed_at'),
  masteredAt: text('mastered_at'),
  nextReviewAt: text('next_review_at'),
  
  // 来源追踪
  sourcePath: text('source_path').notNull(),
  sourceHash: text('source_hash').notNull(),
  
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  domainStatusIdx: index('kp_domain_status_idx').on(table.domainId, table.status),
}));

// ===== 导出 schema 对象 =====
export const schema = {
  knowledgeDomains,
  knowledgePoints,
};

// ===== 类型导出 =====
export type KnowledgeDomainRecord = typeof knowledgeDomains.$inferSelect;
export type KnowledgePointRecord = typeof knowledgePoints.$inferSelect;
export type NewKnowledgeDomain = typeof knowledgeDomains.$inferInsert;
export type NewKnowledgePoint = typeof knowledgePoints.$inferInsert;