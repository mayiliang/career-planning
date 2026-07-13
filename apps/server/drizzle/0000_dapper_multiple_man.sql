CREATE TABLE `knowledge_domains` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`order_index` integer NOT NULL,
	`source_path` text NOT NULL,
	`source_hash` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `knowledge_domains_code_unique` ON `knowledge_domains` (`code`);--> statement-breakpoint
CREATE TABLE `knowledge_points` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`domain_id` text NOT NULL,
	`title` text NOT NULL,
	`summary` text,
	`study_material_md` text NOT NULL,
	`assessment_spec_md` text NOT NULL,
	`pass_criteria_md` text NOT NULL,
	`difficulty` text NOT NULL,
	`plan_week` integer,
	`status` text NOT NULL,
	`self_mastered_at` text,
	`first_passed_at` text,
	`mastered_at` text,
	`next_review_at` text,
	`source_path` text NOT NULL,
	`source_hash` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`domain_id`) REFERENCES `knowledge_domains`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `knowledge_points_code_unique` ON `knowledge_points` (`code`);--> statement-breakpoint
CREATE INDEX `kp_domain_status_idx` ON `knowledge_points` (`domain_id`,`status`);