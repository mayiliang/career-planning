-- Phase 4: 知识图谱 - 知识关系表
-- 创建时间: 2026-07-14

CREATE TABLE IF NOT EXISTS knowledge_edges (
  id TEXT PRIMARY KEY NOT NULL,
  source_point_id TEXT NOT NULL,
  target_point_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('PREREQUISITE', 'RELATED', 'COMPARES_WITH', 'APPLIED_WITH')),
  description TEXT,
  weight INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  
  FOREIGN KEY (source_point_id) REFERENCES knowledge_points(id) ON DELETE CASCADE,
  FOREIGN KEY (target_point_id) REFERENCES knowledge_points(id) ON DELETE CASCADE
);--> statement-breakpoint

-- 索引：快速查询关系
CREATE INDEX IF NOT EXISTS ke_source_target_type_idx ON knowledge_edges(source_point_id, target_point_id, type);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ke_target_idx ON knowledge_edges(target_point_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ke_type_idx ON knowledge_edges(type);