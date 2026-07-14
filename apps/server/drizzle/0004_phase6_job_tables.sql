-- Phase 6: 求职支线 - 岗位、求职活动、技能缺口、项目资产表
-- 创建时间: 2026-07-14

-- ===== 岗位表 =====
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY NOT NULL,
  company TEXT NOT NULL,
  job_title TEXT NOT NULL,
  platform TEXT NOT NULL,
  salary TEXT,
  experience TEXT,
  location TEXT,
  source_url TEXT,
  source_path TEXT,
  job_direction TEXT,
  tech_stack TEXT,
  jd_keywords TEXT,
  matched_project TEXT,
  match_level TEXT CHECK(match_level IN ('HIGH', 'MEDIUM', 'LOW')),
  skill_gap TEXT,
  status TEXT NOT NULL DEFAULT 'SAVED' CHECK(status IN ('SAVED', 'TO_APPLY', 'APPLIED', 'CONTACTING', 'ASSESSMENT', 'INTERVIEWING', 'OFFER', 'REJECTED', 'WITHDRAWN')),
  next_action TEXT,
  next_action_due TEXT,
  notes TEXT,
  priority INTEGER NOT NULL DEFAULT 3,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);--> statement-breakpoint

-- 岗位索引
CREATE INDEX IF NOT EXISTS jobs_status_idx ON jobs(status);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS jobs_platform_idx ON jobs(platform);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS jobs_created_at_idx ON jobs(created_at);--> statement-breakpoint

-- ===== 求职活动表 =====
CREATE TABLE IF NOT EXISTS job_activities (
  id TEXT PRIMARY KEY NOT NULL,
  job_id TEXT NOT NULL,
  activity_type TEXT NOT NULL CHECK(activity_type IN ('APPLICATION', 'MESSAGE', 'WRITTEN_TEST', 'INTERVIEW', 'FOLLOW_UP', 'OFFER', 'REJECTION')),
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TEXT,
  completed_at TEXT,
  status TEXT NOT NULL DEFAULT 'PLANNED' CHECK(status IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  interview_round INTEGER,
  interview_type TEXT CHECK(interview_type IN ('PHONE', 'VIDEO', 'ONSITE')),
  interviewer TEXT,
  feedback_md TEXT,
  discovered_gaps TEXT,
  plan_event_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_event_id) REFERENCES plan_events(id) ON DELETE SET NULL
);--> statement-breakpoint

-- 活动索引
CREATE INDEX IF NOT EXISTS ja_job_id_idx ON job_activities(job_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ja_activity_type_idx ON job_activities(activity_type);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ja_scheduled_at_idx ON job_activities(scheduled_at);--> statement-breakpoint

-- ===== 技能缺口表 =====
CREATE TABLE IF NOT EXISTS skill_gaps (
  id TEXT PRIMARY KEY NOT NULL,
  job_id TEXT NOT NULL,
  knowledge_point_code TEXT NOT NULL,
  gap_level TEXT NOT NULL CHECK(gap_level IN ('HIGH', 'MEDIUM', 'LOW')),
  source_type TEXT NOT NULL CHECK(source_type IN ('JD_ANALYSIS', 'INTERVIEW_FEEDBACK', 'SELF_ASSESSMENT')),
  activity_id TEXT,
  status TEXT NOT NULL DEFAULT 'IDENTIFIED' CHECK(status IN ('IDENTIFIED', 'LEARNING', 'MASTERED', 'CLOSED')),
  learning_action TEXT,
  closed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (activity_id) REFERENCES job_activities(id) ON DELETE SET NULL
);--> statement-breakpoint

-- 技能缺口索引
CREATE INDEX IF NOT EXISTS sg_job_id_idx ON skill_gaps(job_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS sg_knowledge_point_code_idx ON skill_gaps(knowledge_point_code);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS sg_status_idx ON skill_gaps(status);--> statement-breakpoint

-- ===== 项目资产表 =====
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  project_type TEXT NOT NULL CHECK(project_type IN ('WEB', 'H5', 'COMPONENT_LIBRARY', 'TOOL', 'OTHER')),
  positioning TEXT,
  growth_themes TEXT,
  business_context TEXT,
  target_users TEXT,
  my_role TEXT,
  tech_stack TEXT,
  core_modules TEXT,
  tech_challenges TEXT,
  components TEXT,
  lessons_learned TEXT,
  resume_version TEXT,
  interview_version TEXT,
  deep_version TEXT,
  matched_jobs TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED')),
  source_path TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);--> statement-breakpoint

-- 项目索引
CREATE INDEX IF NOT EXISTS projects_type_idx ON projects(project_type);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS projects_status_idx ON projects(status);