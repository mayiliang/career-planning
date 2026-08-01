CREATE TABLE IF NOT EXISTS `learning_practice_attempts` (
  `id` text PRIMARY KEY NOT NULL,
  `knowledge_point_code` text NOT NULL,
  `activity_id` text NOT NULL,
  `submission_md` text NOT NULL DEFAULT '',
  `code` text NOT NULL DEFAULT '',
  `language` text,
  `execution_output` text NOT NULL DEFAULT '',
  `execution_status` text,
  `validation_json` text,
  `status` text NOT NULL DEFAULT 'DRAFT',
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `lpa_point_activity_idx`
ON `learning_practice_attempts` (`knowledge_point_code`, `activity_id`);
