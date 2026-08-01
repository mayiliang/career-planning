ALTER TABLE `knowledge_points` ADD `learning_state` text NOT NULL DEFAULT 'NOT_STARTED';
--> statement-breakpoint
ALTER TABLE `knowledge_points` ADD `mastery_level` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `knowledge_points` ADD `learned_at` text;
--> statement-breakpoint
ALTER TABLE `knowledge_points` ADD `deferred_at` text;
--> statement-breakpoint
ALTER TABLE `knowledge_points` ADD `defer_reason` text;
--> statement-breakpoint
ALTER TABLE `knowledge_points` ADD `current_focus` integer NOT NULL DEFAULT 0;
--> statement-breakpoint

UPDATE `knowledge_points`
SET `learning_state` = CASE
  WHEN `status` = 'NOT_STARTED' THEN 'NOT_STARTED'
  WHEN `status` = 'LEARNING' THEN 'LEARNING'
  ELSE 'LEARNED'
END,
`mastery_level` = CASE
  WHEN `status` = 'MASTERED' THEN 3
  WHEN `status` = 'FIRST_PASS_PENDING_RETEST' THEN 2
  WHEN `status` = 'NEEDS_RELEARNING' THEN 1
  ELSE 0
END,
`learned_at` = CASE
  WHEN `status` IN ('SELF_MASTERED', 'FIRST_PASS_PENDING_RETEST', 'MASTERED', 'NEEDS_RELEARNING')
    THEN COALESCE(`self_mastered_at`, `first_passed_at`, `mastered_at`, `updated_at`)
  ELSE NULL
END;
--> statement-breakpoint

UPDATE `knowledge_points`
SET `current_focus` = 1
WHERE `id` = (
  SELECT `id` FROM `knowledge_points`
  WHERE `learning_state` = 'LEARNING'
  ORDER BY `updated_at` DESC LIMIT 1
);
--> statement-breakpoint

CREATE UNIQUE INDEX `kp_single_current_focus_idx`
ON `knowledge_points` (`current_focus`) WHERE `current_focus` = 1;
--> statement-breakpoint
CREATE INDEX `kp_learning_state_idx` ON `knowledge_points` (`learning_state`);
--> statement-breakpoint
CREATE INDEX `kp_mastery_level_idx` ON `knowledge_points` (`mastery_level`);
--> statement-breakpoint

CREATE TABLE `knowledge_notes` (
  `id` text PRIMARY KEY NOT NULL,
  `knowledge_point_code` text NOT NULL,
  `domain_code_snapshot` text,
  `point_title_snapshot` text NOT NULL,
  `original_md` text NOT NULL DEFAULT '',
  `organized_md` text,
  `active_version_source` text NOT NULL DEFAULT 'ORIGINAL',
  `ai_review_json` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `kn_point_code_uidx` ON `knowledge_notes` (`knowledge_point_code`);
--> statement-breakpoint
CREATE INDEX `kn_updated_at_idx` ON `knowledge_notes` (`updated_at`);
--> statement-breakpoint

INSERT INTO `knowledge_notes` (
  `id`, `knowledge_point_code`, `domain_code_snapshot`, `point_title_snapshot`,
  `original_md`, `active_version_source`, `created_at`, `updated_at`
)
SELECT
  lower(hex(randomblob(16))), kp.`code`, kd.`code`, kp.`title`, kp.`summary`,
  'ORIGINAL', kp.`created_at`, kp.`updated_at`
FROM `knowledge_points` kp
JOIN `knowledge_domains` kd ON kd.`id` = kp.`domain_id`
WHERE trim(COALESCE(kp.`summary`, '')) <> '';
--> statement-breakpoint

CREATE TABLE `knowledge_note_versions` (
  `id` text PRIMARY KEY NOT NULL,
  `note_id` text NOT NULL REFERENCES `knowledge_notes`(`id`) ON DELETE CASCADE,
  `version_no` integer NOT NULL,
  `source` text NOT NULL,
  `content_md` text NOT NULL,
  `change_summary` text,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `knv_note_version_uidx` ON `knowledge_note_versions` (`note_id`, `version_no`);
--> statement-breakpoint
CREATE INDEX `knv_note_idx` ON `knowledge_note_versions` (`note_id`);
--> statement-breakpoint

INSERT INTO `knowledge_note_versions` (`id`, `note_id`, `version_no`, `source`, `content_md`, `change_summary`, `created_at`)
SELECT lower(hex(randomblob(16))), `id`, 1, 'MIGRATED', `original_md`, '从旧版知识点笔记安全迁移', `updated_at`
FROM `knowledge_notes`;
--> statement-breakpoint

CREATE TABLE `learning_checkins` (
  `id` text PRIMARY KEY NOT NULL,
  `checkin_date` text NOT NULL,
  `summary_md` text,
  `actual_minutes` integer,
  `energy_level` integer,
  `difficulty_level` integer,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lc_checkin_date_uidx` ON `learning_checkins` (`checkin_date`);
--> statement-breakpoint

CREATE TABLE `learning_checkin_points` (
  `id` text PRIMARY KEY NOT NULL,
  `checkin_id` text NOT NULL REFERENCES `learning_checkins`(`id`) ON DELETE CASCADE,
  `knowledge_point_code` text NOT NULL,
  `activity` text NOT NULL DEFAULT 'PROGRESSED',
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lcp_checkin_point_uidx` ON `learning_checkin_points` (`checkin_id`, `knowledge_point_code`);
--> statement-breakpoint

CREATE TABLE `learning_route_choices` (
  `id` text PRIMARY KEY NOT NULL,
  `source_code` text NOT NULL,
  `target_code` text NOT NULL,
  `state` text NOT NULL,
  `scope` text NOT NULL DEFAULT 'POINT',
  `reason` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lrc_source_target_uidx` ON `learning_route_choices` (`source_code`, `target_code`);
--> statement-breakpoint
CREATE INDEX `lrc_state_idx` ON `learning_route_choices` (`state`);
--> statement-breakpoint

ALTER TABLE `assessment_sessions` ADD `mastery_stage` integer NOT NULL DEFAULT 3;
--> statement-breakpoint
ALTER TABLE `assessment_sessions` ADD `challenge_mode` text NOT NULL DEFAULT 'THEORY';
--> statement-breakpoint
ALTER TABLE `assessment_sessions` ADD `challenge_profile` text NOT NULL DEFAULT 'AUTO';
--> statement-breakpoint
ALTER TABLE `assessment_sessions` ADD `assistance_level` integer NOT NULL DEFAULT 0;
--> statement-breakpoint

UPDATE `assessment_sessions`
SET `mastery_stage` = CASE WHEN `assessment_type` = 'RETEST' THEN 4 ELSE 3 END;
--> statement-breakpoint

CREATE TABLE `assessment_hint_events` (
  `id` text PRIMARY KEY NOT NULL,
  `session_id` text NOT NULL REFERENCES `assessment_sessions`(`id`) ON DELETE CASCADE,
  `question_id` text REFERENCES `assessment_questions`(`id`) ON DELETE CASCADE,
  `level` integer NOT NULL,
  `hint_kind` text NOT NULL,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ahe_session_idx` ON `assessment_hint_events` (`session_id`);
