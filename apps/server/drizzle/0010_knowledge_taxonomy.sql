ALTER TABLE `knowledge_domains` ADD `capability_layer` text NOT NULL DEFAULT 'CORE';
--> statement-breakpoint
ALTER TABLE `knowledge_domains` ADD `requirement_level` text NOT NULL DEFAULT 'REQUIRED';
--> statement-breakpoint
ALTER TABLE `knowledge_domains` ADD `maturity` text NOT NULL DEFAULT 'STABLE';
--> statement-breakpoint
ALTER TABLE `knowledge_domains` ADD `verified_at` text NOT NULL DEFAULT '2026-08-04';
--> statement-breakpoint
ALTER TABLE `knowledge_domains` ADD `fallback_strategy` text NOT NULL DEFAULT '按目标环境做能力检测并保留稳定降级路径。';
--> statement-breakpoint
ALTER TABLE `knowledge_points` ADD `capability_layer` text NOT NULL DEFAULT 'CORE';
--> statement-breakpoint
ALTER TABLE `knowledge_points` ADD `requirement_level` text NOT NULL DEFAULT 'REQUIRED';
--> statement-breakpoint
ALTER TABLE `knowledge_points` ADD `maturity` text NOT NULL DEFAULT 'STABLE';
--> statement-breakpoint
ALTER TABLE `knowledge_points` ADD `verified_at` text NOT NULL DEFAULT '2026-08-04';
--> statement-breakpoint
ALTER TABLE `knowledge_points` ADD `fallback_strategy` text NOT NULL DEFAULT '按目标环境做能力检测并保留稳定降级路径。';
