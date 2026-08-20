/**
 * CSV 解析器
 * 
 * 当前只保留仍在产品中使用的岗位 CSV 解析。
 */
import { parse } from 'csv-parse/sync';
import type { ParsedJob } from '../types/index.js';

// 岗位 CSV 列名映射
const JOB_CSV_COLUMNS = [
  'date', 'platform', 'company', 'job_title', 'salary', 'experience',
  'location', 'source_url', 'job_direction', 'tech_stack', 'jd_keywords',
  'matched_project', 'match_level', 'skill_gap', 'next_learning_action',
  'status', 'notes'
];

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
