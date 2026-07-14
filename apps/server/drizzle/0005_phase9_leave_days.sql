CREATE TABLE IF NOT EXISTS leave_days (
  id TEXT PRIMARY KEY NOT NULL,
  leave_date TEXT NOT NULL UNIQUE,
  reason TEXT,
  shifted_event_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS leave_days_date_idx ON leave_days(leave_date);
