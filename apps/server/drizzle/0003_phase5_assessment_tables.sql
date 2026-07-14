-- Phase 5: AI 考核 MVP - 考核会话、题目、答案、评分结果、审计事件表
-- 创建时间: 2026-07-14

-- ===== 考核会话表 =====
CREATE TABLE IF NOT EXISTS assessment_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  knowledge_point_code TEXT NOT NULL,
  assessment_type TEXT NOT NULL CHECK(assessment_type IN ('FIRST', 'RETEST', 'MONTHLY_REVIEW', 'DOMAIN_COMPREHENSIVE')),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'GRADING', 'GRADED', 'ERROR', 'CANCELLED')),
  duration_minutes INTEGER NOT NULL,
  started_at TEXT,
  submitted_at TEXT,
  graded_at TEXT,
  result_id TEXT,
  provider TEXT,
  model TEXT,
  prompt_version TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);--> statement-breakpoint

-- 会话索引
CREATE INDEX IF NOT EXISTS as_knowledge_point_code_idx ON assessment_sessions(knowledge_point_code);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS as_status_idx ON assessment_sessions(status);--> statement-breakpoint

-- ===== 考核题目表 =====
CREATE TABLE IF NOT EXISTS assessment_questions (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK(question_type IN ('CHOICE', 'OUTPUT', 'ESSAY', 'CODE_READ', 'CODE_WRITE')),
  dimension TEXT NOT NULL CHECK(dimension IN ('principlesAndBoundaries', 'practice', 'troubleshootingAndDesign', 'projectCommunication')),
  question_content TEXT NOT NULL,
  max_score INTEGER NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  
  FOREIGN KEY (session_id) REFERENCES assessment_sessions(id) ON DELETE CASCADE
);--> statement-breakpoint

-- 题目索引
CREATE INDEX IF NOT EXISTS aq_session_idx ON assessment_questions(session_id);--> statement-breakpoint

-- ===== 用户答案表 =====
CREATE TABLE IF NOT EXISTS assessment_answers (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  answer_content TEXT NOT NULL,
  deterministic_result TEXT,
  answered_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  
  FOREIGN KEY (session_id) REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES assessment_questions(id) ON DELETE CASCADE
);--> statement-breakpoint

-- 答案索引
CREATE INDEX IF NOT EXISTS aa_session_idx ON assessment_answers(session_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS aa_question_idx ON assessment_answers(question_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS aa_session_question_uidx ON assessment_answers(session_id, question_id);--> statement-breakpoint

-- ===== 评分结果表 =====
CREATE TABLE IF NOT EXISTS assessment_results (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL UNIQUE,
  principles_score INTEGER NOT NULL DEFAULT 0,
  practice_score INTEGER NOT NULL DEFAULT 0,
  troubleshooting_score INTEGER NOT NULL DEFAULT 0,
  communication_score INTEGER NOT NULL DEFAULT 0,
  total_score INTEGER NOT NULL DEFAULT 0,
  verdict TEXT NOT NULL CHECK(verdict IN ('PASS', 'FAIL', 'MANUAL_REVIEW')),
  confidence TEXT NOT NULL,
  critical_failures TEXT,
  weaknesses TEXT,
  feedback TEXT,
  ai_raw_response TEXT,
  ai_usage_prompt_tokens INTEGER,
  ai_usage_completion_tokens INTEGER,
  server_calculated_total INTEGER,
  server_calculated_verdict TEXT CHECK(server_calculated_verdict IN ('PASS', 'FAIL', 'MANUAL_REVIEW')),
  created_at TEXT NOT NULL,
  
  FOREIGN KEY (session_id) REFERENCES assessment_sessions(id) ON DELETE CASCADE
);--> statement-breakpoint

-- 结果索引
CREATE INDEX IF NOT EXISTS ar_session_idx ON assessment_results(session_id);--> statement-breakpoint

-- ===== 掌握审计事件表 =====
CREATE TABLE IF NOT EXISTS mastery_events (
  id TEXT PRIMARY KEY NOT NULL,
  knowledge_point_code TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('start', 'selfMastery', 'firstPass', 'firstFail', 'retestPass', 'retestFail', 'reviewPass', 'reviewFail', 'restart', 'reopen')),
  from_status TEXT NOT NULL CHECK(from_status IN ('NOT_STARTED', 'LEARNING', 'SELF_MASTERED', 'FIRST_PASS_PENDING_RETEST', 'MASTERED', 'NEEDS_RELEARNING')),
  to_status TEXT NOT NULL CHECK(to_status IN ('NOT_STARTED', 'LEARNING', 'SELF_MASTERED', 'FIRST_PASS_PENDING_RETEST', 'MASTERED', 'NEEDS_RELEARNING')),
  assessment_session_id TEXT,
  evidence_summary TEXT,
  created_at TEXT NOT NULL,
  
  FOREIGN KEY (assessment_session_id) REFERENCES assessment_sessions(id) ON DELETE SET NULL
);--> statement-breakpoint

-- 审计事件索引
CREATE INDEX IF NOT EXISTS me_knowledge_point_code_idx ON mastery_events(knowledge_point_code);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS me_created_at_idx ON mastery_events(created_at);
