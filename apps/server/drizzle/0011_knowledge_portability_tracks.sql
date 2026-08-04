ALTER TABLE `knowledge_domains` ADD `portability` text NOT NULL DEFAULT 'PORTABLE';
--> statement-breakpoint
ALTER TABLE `knowledge_domains` ADD `track_ids` text NOT NULL DEFAULT '[]';
--> statement-breakpoint
ALTER TABLE `knowledge_points` ADD `portability` text NOT NULL DEFAULT 'PORTABLE';
--> statement-breakpoint
ALTER TABLE `knowledge_points` ADD `track_ids` text NOT NULL DEFAULT '[]';
