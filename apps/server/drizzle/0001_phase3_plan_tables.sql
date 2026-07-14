-- Phase 3: 计划与打卡表
CREATE TABLE `plan_events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_type` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`start_at` text NOT NULL,
	`end_at` text NOT NULL,
	`all_day` integer NOT NULL DEFAULT false,
	`status` text NOT NULL DEFAULT 'PLANNED',
	`priority` integer NOT NULL DEFAULT 3,
	`knowledge_point_id` text,
	`job_id` text,
	`assessment_session_id` text,
	`recurrence_rule` text,
	`recurrence_parent_id` text,
	`rescheduled_to_id` text,
	`rescheduled_from_id` text,
	`source_type` text NOT NULL DEFAULT 'USER',
	`template_week` integer,
	`template_day` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`knowledge_point_id`) REFERENCES `knowledge_points`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`recurrence_parent_id`) REFERENCES `plan_events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`rescheduled_to_id`) REFERENCES `plan_events`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`rescheduled_from_id`) REFERENCES `plan_events`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `pe_start_at_event_type_idx` ON `plan_events` (`start_at`,`event_type`);--> statement-breakpoint
CREATE INDEX `pe_status_idx` ON `plan_events` (`status`);--> statement-breakpoint
CREATE INDEX `pe_knowledge_point_idx` ON `plan_events` (`knowledge_point_id`);--> statement-breakpoint
CREATE TABLE `checkins` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_event_id` text NOT NULL,
	`result` text NOT NULL,
	`actual_minutes` integer,
	`note_md` text,
	`energy_level` integer,
	`difficulty_level` integer,
	`evidence_path` text,
	`checked_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`plan_event_id`) REFERENCES `plan_events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `checkins_plan_event_idx` ON `checkins` (`plan_event_id`);--> statement-breakpoint
CREATE INDEX `checkins_checked_at_idx` ON `checkins` (`checked_at`);--> statement-breakpoint
CREATE TABLE `daily_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`review_date` text NOT NULL,
	`planned_count` integer NOT NULL DEFAULT 0,
	`completed_count` integer NOT NULL DEFAULT 0,
	`partial_count` integer NOT NULL DEFAULT 0,
	`skipped_count` integer NOT NULL DEFAULT 0,
	`summary_md` text,
	`challenges_md` text,
	`adjustments_md` text,
	`next_day_focus` text,
	`total_minutes` integer NOT NULL DEFAULT 0,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_reviews_review_date_unique` ON `daily_reviews` (`review_date`);--> statement-breakpoint
CREATE INDEX `dr_review_date_idx` ON `daily_reviews` (`review_date`);--> statement-breakpoint
CREATE TABLE `weekly_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`week_start_date` text NOT NULL,
	`week_end_date` text NOT NULL,
	`week_number` integer NOT NULL,
	`planned_count` integer NOT NULL DEFAULT 0,
	`completed_count` integer NOT NULL DEFAULT 0,
	`partial_count` integer NOT NULL DEFAULT 0,
	`skipped_count` integer NOT NULL DEFAULT 0,
	`completion_rate` integer,
	`summary_md` text,
	`challenges_md` text,
	`adjustments_md` text,
	`next_week_focus` text,
	`plan_week_number` integer,
	`theme_completed` integer,
	`total_minutes` integer NOT NULL DEFAULT 0,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `wr_week_start_idx` ON `weekly_reviews` (`week_start_date`);--> statement-breakpoint
CREATE INDEX `wr_plan_week_idx` ON `weekly_reviews` (`plan_week_number`);