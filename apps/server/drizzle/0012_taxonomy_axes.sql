ALTER TABLE `knowledge_domains` ADD `ai_relation` text NOT NULL DEFAULT 'NONE';
--> statement-breakpoint
ALTER TABLE `knowledge_domains` ADD `applicability_tags` text NOT NULL DEFAULT '[]';
--> statement-breakpoint
ALTER TABLE `knowledge_points` ADD `ai_relation` text NOT NULL DEFAULT 'NONE';
--> statement-breakpoint
ALTER TABLE `knowledge_points` ADD `applicability_tags` text NOT NULL DEFAULT '[]';
--> statement-breakpoint
UPDATE `knowledge_domains` SET `capability_layer` = 'LEADERSHIP' WHERE `capability_layer` = 'AI_LEADERSHIP';
--> statement-breakpoint
UPDATE `knowledge_points` SET `capability_layer` = 'LEADERSHIP' WHERE `capability_layer` = 'AI_LEADERSHIP';
--> statement-breakpoint
UPDATE `knowledge_domains` SET `requirement_level` = 'ELECTIVE' WHERE `requirement_level` = 'EXPERIMENTAL';
--> statement-breakpoint
UPDATE `knowledge_points` SET `requirement_level` = 'ELECTIVE' WHERE `requirement_level` = 'EXPERIMENTAL';
