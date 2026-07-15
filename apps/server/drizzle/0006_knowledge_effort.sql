ALTER TABLE `knowledge_points` ADD `study_minutes` integer NOT NULL DEFAULT 45;
--> statement-breakpoint
ALTER TABLE `knowledge_points` ADD `practice_minutes` integer NOT NULL DEFAULT 75;
--> statement-breakpoint
ALTER TABLE `knowledge_points` ADD `project_minutes` integer NOT NULL DEFAULT 60;
--> statement-breakpoint
ALTER TABLE `knowledge_points` ADD `assessment_minutes` integer NOT NULL DEFAULT 45;
--> statement-breakpoint
ALTER TABLE `knowledge_points` ADD `retest_minutes` integer NOT NULL DEFAULT 30;
