ALTER TABLE `knowledge_domains` ADD `topic_tags` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE `knowledge_points` ADD `secondary_topic` text DEFAULT '未分类' NOT NULL;
--> statement-breakpoint
ALTER TABLE `knowledge_points` ADD `topic_order` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `knowledge_points` ADD `topic_tags` text DEFAULT '[]' NOT NULL;
