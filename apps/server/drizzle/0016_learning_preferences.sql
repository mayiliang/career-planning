CREATE TABLE learning_preferences (
  id TEXT PRIMARY KEY NOT NULL CHECK (id = 'local'),
  framework_choice TEXT NOT NULL DEFAULT 'UNDECIDED' CHECK (framework_choice IN ('UNDECIDED','REACT','VUE','NONE')),
  revision INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
--> statement-breakpoint
INSERT INTO learning_preferences VALUES ('local', 'UNDECIDED', 0, strftime('%Y-%m-%dT%H:%M:%fZ','now'));
--> statement-breakpoint
ALTER TABLE knowledge_edges ADD COLUMN origin TEXT NOT NULL DEFAULT 'UNKNOWN';
--> statement-breakpoint
ALTER TABLE knowledge_edges ADD COLUMN contract_version TEXT;

--> statement-breakpoint
DELETE FROM knowledge_edges WHERE origin = 'UNKNOWN' AND type = 'PREREQUISITE' AND description = '不可变更新与值语义是理解 React 渲染的基础' AND source_point_id IN (SELECT id FROM knowledge_points WHERE code = 'JS-03') AND target_point_id IN (SELECT id FROM knowledge_points WHERE code = 'REACT-01');

--> statement-breakpoint
DELETE FROM knowledge_edges WHERE origin = 'UNKNOWN' AND type = 'PREREQUISITE' AND description = '组件与渲染模型是状态更新的前置' AND source_point_id IN (SELECT id FROM knowledge_points WHERE code = 'REACT-01') AND target_point_id IN (SELECT id FROM knowledge_points WHERE code = 'REACT-02');

--> statement-breakpoint
DELETE FROM knowledge_edges WHERE origin = 'UNKNOWN' AND type = 'PREREQUISITE' AND description = '异步和事件循环支撑 Effect 外部同步与取消' AND source_point_id IN (SELECT id FROM knowledge_points WHERE code = 'JS-04') AND target_point_id IN (SELECT id FROM knowledge_points WHERE code = 'REACT-04');

--> statement-breakpoint
DELETE FROM knowledge_edges WHERE origin = 'UNKNOWN' AND type = 'PREREQUISITE' AND description = 'Vue 响应式代理建立在对象身份、Proxy 与 Reflect 语义之上' AND source_point_id IN (SELECT id FROM knowledge_points WHERE code = 'JS-07') AND target_point_id IN (SELECT id FROM knowledge_points WHERE code = 'VUE-02');

--> statement-breakpoint
DELETE FROM knowledge_edges WHERE origin = 'UNKNOWN' AND type = 'PREREQUISITE' AND description = '副作用监听、失效清理与异步恢复建立在 Vue 响应式依赖追踪之上' AND source_point_id IN (SELECT id FROM knowledge_points WHERE code = 'VUE-02') AND target_point_id IN (SELECT id FROM knowledge_points WHERE code = 'VUE-05');

--> statement-breakpoint
INSERT INTO knowledge_edges (id, source_point_id, target_point_id, type, description, weight, created_at, origin, contract_version) SELECT lower(hex(randomblob(16))), s.id, t.id, 'PREREQUISITE', '已审学习基础；阅读与自主标记学完不受考核门禁限制。', 9, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'AUTO_CONTRACT', 'framework-foundation-v1' FROM knowledge_points s, knowledge_points t WHERE s.code = 'JS-01' AND t.code = 'JS-04' AND NOT EXISTS (SELECT 1 FROM knowledge_edges e WHERE e.source_point_id=s.id AND e.target_point_id=t.id AND e.type='PREREQUISITE');

--> statement-breakpoint
INSERT INTO knowledge_edges (id, source_point_id, target_point_id, type, description, weight, created_at, origin, contract_version) SELECT lower(hex(randomblob(16))), s.id, t.id, 'PREREQUISITE', '已审学习基础；阅读与自主标记学完不受考核门禁限制。', 9, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'AUTO_CONTRACT', 'framework-foundation-v1' FROM knowledge_points s, knowledge_points t WHERE s.code = 'JS-04' AND t.code = 'JS-05' AND NOT EXISTS (SELECT 1 FROM knowledge_edges e WHERE e.source_point_id=s.id AND e.target_point_id=t.id AND e.type='PREREQUISITE');

--> statement-breakpoint
INSERT INTO knowledge_edges (id, source_point_id, target_point_id, type, description, weight, created_at, origin, contract_version) SELECT lower(hex(randomblob(16))), s.id, t.id, 'PREREQUISITE', '已审学习基础；阅读与自主标记学完不受考核门禁限制。', 9, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'AUTO_CONTRACT', 'framework-foundation-v1' FROM knowledge_points s, knowledge_points t WHERE s.code = 'JS-01' AND t.code = 'REACT-01' AND NOT EXISTS (SELECT 1 FROM knowledge_edges e WHERE e.source_point_id=s.id AND e.target_point_id=t.id AND e.type='PREREQUISITE');

--> statement-breakpoint
INSERT INTO knowledge_edges (id, source_point_id, target_point_id, type, description, weight, created_at, origin, contract_version) SELECT lower(hex(randomblob(16))), s.id, t.id, 'PREREQUISITE', '已审学习基础；阅读与自主标记学完不受考核门禁限制。', 9, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'AUTO_CONTRACT', 'framework-foundation-v1' FROM knowledge_points s, knowledge_points t WHERE s.code = 'JS-03' AND t.code = 'REACT-01' AND NOT EXISTS (SELECT 1 FROM knowledge_edges e WHERE e.source_point_id=s.id AND e.target_point_id=t.id AND e.type='PREREQUISITE');

--> statement-breakpoint
INSERT INTO knowledge_edges (id, source_point_id, target_point_id, type, description, weight, created_at, origin, contract_version) SELECT lower(hex(randomblob(16))), s.id, t.id, 'PREREQUISITE', '已审学习基础；阅读与自主标记学完不受考核门禁限制。', 9, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'AUTO_CONTRACT', 'framework-foundation-v1' FROM knowledge_points s, knowledge_points t WHERE s.code = 'WEB-01' AND t.code = 'REACT-01' AND NOT EXISTS (SELECT 1 FROM knowledge_edges e WHERE e.source_point_id=s.id AND e.target_point_id=t.id AND e.type='PREREQUISITE');

--> statement-breakpoint
INSERT INTO knowledge_edges (id, source_point_id, target_point_id, type, description, weight, created_at, origin, contract_version) SELECT lower(hex(randomblob(16))), s.id, t.id, 'PREREQUISITE', '已审学习基础；阅读与自主标记学完不受考核门禁限制。', 9, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'AUTO_CONTRACT', 'framework-foundation-v1' FROM knowledge_points s, knowledge_points t WHERE s.code = 'REACT-01' AND t.code = 'REACT-02' AND NOT EXISTS (SELECT 1 FROM knowledge_edges e WHERE e.source_point_id=s.id AND e.target_point_id=t.id AND e.type='PREREQUISITE');

--> statement-breakpoint
INSERT INTO knowledge_edges (id, source_point_id, target_point_id, type, description, weight, created_at, origin, contract_version) SELECT lower(hex(randomblob(16))), s.id, t.id, 'PREREQUISITE', '已审学习基础；阅读与自主标记学完不受考核门禁限制。', 9, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'AUTO_CONTRACT', 'framework-foundation-v1' FROM knowledge_points s, knowledge_points t WHERE s.code = 'REACT-02' AND t.code = 'REACT-03' AND NOT EXISTS (SELECT 1 FROM knowledge_edges e WHERE e.source_point_id=s.id AND e.target_point_id=t.id AND e.type='PREREQUISITE');

--> statement-breakpoint
INSERT INTO knowledge_edges (id, source_point_id, target_point_id, type, description, weight, created_at, origin, contract_version) SELECT lower(hex(randomblob(16))), s.id, t.id, 'PREREQUISITE', '已审学习基础；阅读与自主标记学完不受考核门禁限制。', 9, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'AUTO_CONTRACT', 'framework-foundation-v1' FROM knowledge_points s, knowledge_points t WHERE s.code = 'REACT-03' AND t.code = 'REACT-04' AND NOT EXISTS (SELECT 1 FROM knowledge_edges e WHERE e.source_point_id=s.id AND e.target_point_id=t.id AND e.type='PREREQUISITE');

--> statement-breakpoint
INSERT INTO knowledge_edges (id, source_point_id, target_point_id, type, description, weight, created_at, origin, contract_version) SELECT lower(hex(randomblob(16))), s.id, t.id, 'PREREQUISITE', '已审学习基础；阅读与自主标记学完不受考核门禁限制。', 9, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'AUTO_CONTRACT', 'framework-foundation-v1' FROM knowledge_points s, knowledge_points t WHERE s.code = 'JS-05' AND t.code = 'REACT-04' AND NOT EXISTS (SELECT 1 FROM knowledge_edges e WHERE e.source_point_id=s.id AND e.target_point_id=t.id AND e.type='PREREQUISITE');

--> statement-breakpoint
INSERT INTO knowledge_edges (id, source_point_id, target_point_id, type, description, weight, created_at, origin, contract_version) SELECT lower(hex(randomblob(16))), s.id, t.id, 'PREREQUISITE', '已审学习基础；阅读与自主标记学完不受考核门禁限制。', 9, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'AUTO_CONTRACT', 'framework-foundation-v1' FROM knowledge_points s, knowledge_points t WHERE s.code = 'WEB-01' AND t.code = 'VUE-01' AND NOT EXISTS (SELECT 1 FROM knowledge_edges e WHERE e.source_point_id=s.id AND e.target_point_id=t.id AND e.type='PREREQUISITE');

--> statement-breakpoint
INSERT INTO knowledge_edges (id, source_point_id, target_point_id, type, description, weight, created_at, origin, contract_version) SELECT lower(hex(randomblob(16))), s.id, t.id, 'PREREQUISITE', '已审学习基础；阅读与自主标记学完不受考核门禁限制。', 9, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'AUTO_CONTRACT', 'framework-foundation-v1' FROM knowledge_points s, knowledge_points t WHERE s.code = 'VUE-01' AND t.code = 'VUE-02' AND NOT EXISTS (SELECT 1 FROM knowledge_edges e WHERE e.source_point_id=s.id AND e.target_point_id=t.id AND e.type='PREREQUISITE');

--> statement-breakpoint
INSERT INTO knowledge_edges (id, source_point_id, target_point_id, type, description, weight, created_at, origin, contract_version) SELECT lower(hex(randomblob(16))), s.id, t.id, 'PREREQUISITE', '已审学习基础；阅读与自主标记学完不受考核门禁限制。', 9, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'AUTO_CONTRACT', 'framework-foundation-v1' FROM knowledge_points s, knowledge_points t WHERE s.code = 'VUE-02' AND t.code = 'VUE-03' AND NOT EXISTS (SELECT 1 FROM knowledge_edges e WHERE e.source_point_id=s.id AND e.target_point_id=t.id AND e.type='PREREQUISITE');

--> statement-breakpoint
INSERT INTO knowledge_edges (id, source_point_id, target_point_id, type, description, weight, created_at, origin, contract_version) SELECT lower(hex(randomblob(16))), s.id, t.id, 'PREREQUISITE', '已审学习基础；阅读与自主标记学完不受考核门禁限制。', 9, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'AUTO_CONTRACT', 'framework-foundation-v1' FROM knowledge_points s, knowledge_points t WHERE s.code = 'VUE-03' AND t.code = 'VUE-04' AND NOT EXISTS (SELECT 1 FROM knowledge_edges e WHERE e.source_point_id=s.id AND e.target_point_id=t.id AND e.type='PREREQUISITE');

--> statement-breakpoint
INSERT INTO knowledge_edges (id, source_point_id, target_point_id, type, description, weight, created_at, origin, contract_version) SELECT lower(hex(randomblob(16))), s.id, t.id, 'PREREQUISITE', '已审学习基础；阅读与自主标记学完不受考核门禁限制。', 9, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'AUTO_CONTRACT', 'framework-foundation-v1' FROM knowledge_points s, knowledge_points t WHERE s.code = 'VUE-04' AND t.code = 'VUE-05' AND NOT EXISTS (SELECT 1 FROM knowledge_edges e WHERE e.source_point_id=s.id AND e.target_point_id=t.id AND e.type='PREREQUISITE');

--> statement-breakpoint
INSERT INTO knowledge_edges (id, source_point_id, target_point_id, type, description, weight, created_at, origin, contract_version) SELECT lower(hex(randomblob(16))), s.id, t.id, 'PREREQUISITE', '已审学习基础；阅读与自主标记学完不受考核门禁限制。', 9, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'AUTO_CONTRACT', 'framework-foundation-v1' FROM knowledge_points s, knowledge_points t WHERE s.code = 'JS-05' AND t.code = 'VUE-05' AND NOT EXISTS (SELECT 1 FROM knowledge_edges e WHERE e.source_point_id=s.id AND e.target_point_id=t.id AND e.type='PREREQUISITE');
