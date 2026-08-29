CREATE TABLE `material_reading_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`guide` text NOT NULL,
	`anchor` text NOT NULL,
	`progress_percent` integer DEFAULT 0 NOT NULL,
	`completed` integer DEFAULT 0 NOT NULL,
	`completed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `material_reading_guide_anchor_uidx` ON `material_reading_progress` (`guide`,`anchor`);
--> statement-breakpoint
CREATE INDEX `material_reading_completed_idx` ON `material_reading_progress` (`completed`,`updated_at`);
