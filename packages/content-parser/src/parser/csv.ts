/**
 * CSV 解析器
 * 
 * Phase 1 实现：
 * - 解析 learning-tracker-template.csv
 * - 解析 hangzhou-frontend-jobs-template.csv
 * - 解析 daily-8h-learning-schedule.csv
 */
import { parse } from 'csv-parse/sync';
import type { ParsedPlanItem, ParsedJob } from '../types/index.js';

// 学习计划 CSV 列名映射
const PLAN_CSV_COLUMNS = [
  'week', 'phase', 'theme', 'project_anchor', 'weekly_outcome',
  'weekly_assessment', 'status'
];

// 岗位 CSV 列名映射
const JOB_CSV_COLUMNS = [
  'date', 'platform', 'company', 'job_title', 'salary', 'experience',
  'location', 'source_url', 'job_direction', 'tech_stack', 'jd_keywords',
  'matched_project', 'match_level', 'skill_gap', 'next_learning_action',
  'status', 'notes'
];

// 解析学习计划 CSV
export function parsePlanCsv(content: string): ParsedPlanItem[] {
  const records = parse(content, {
    columns: PLAN_CSV_COLUMNS,
    skip_empty_lines: true,
    from_line: 2, // 跳过标题行
  });
  
  // 类型转换
  return records.map((row: Record<string, string>) => ({
    week: parseInt(row.week ?? '', 10),
    phase: row.phase ?? '',
    theme: row.theme ?? '',
    projectAnchor: row.project_anchor ?? '',
    weeklyOutcome: row.weekly_outcome ?? '',
    weeklyAssessment: row.weekly_assessment ?? '',
    status: row.status ?? '',
  }));
}

// 解析岗位 CSV
export function parseJobsCsv(content: string): ParsedJob[] {
  const records = parse(content, {
    columns: JOB_CSV_COLUMNS,
    skip_empty_lines: true,
    from_line: 2,
  });
  
  return records.map((row: Record<string, string>) => ({
    date: row.date ?? '',
    platform: row.platform ?? '',
    company: row.company ?? '',
    jobTitle: row.job_title ?? '',
    salary: row.salary ?? '',
    experience: row.experience ?? '',
    location: row.location ?? '',
    sourceUrl: row.source_url ?? '',
    jobDirection: row.job_direction ?? '',
    techStack: row.tech_stack ?? '',
    jdKeywords: row.jd_keywords ?? '',
    matchedProject: row.matched_project ?? '',
    matchLevel: row.match_level ?? '',
    skillGap: row.skill_gap ?? '',
    nextLearningAction: row.next_learning_action ?? '',
    status: row.status ?? '',
    notes: row.notes ?? '',
  }));
}

// 解析每日时间安排 CSV
export function parseDailyScheduleCsv(content: string): Array<{
  time: string;
  block: string;
  task: string;
  output: string;
  notes: string;
}> {
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
  });
  
  return records.map((row: Record<string, string>) => ({
    time: row.time ?? '',
    block: row.block ?? '',
    task: row.task ?? '',
    output: row.output ?? '',
    notes: row.notes ?? '',
  }));
}
