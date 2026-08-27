CREATE TABLE `assistant_gap_candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`fingerprint` text NOT NULL,
	`title` text NOT NULL,
	`rationale` text NOT NULL,
	`suggested_scope` text NOT NULL,
	`source_route` text NOT NULL,
	`source_page_title` text NOT NULL,
	`question_excerpt` text NOT NULL,
	`selected_text_excerpt` text,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assistant_gap_candidates_fingerprint_unique` ON `assistant_gap_candidates` (`fingerprint`);
--> statement-breakpoint
CREATE INDEX `assistant_gap_status_created_idx` ON `assistant_gap_candidates` (`status`,`created_at`);
