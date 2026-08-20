import type { JobCSVRow } from '@/api/client';

export type JobCsvIssue = { row?: number; message: string };
export type JobCsvParseResult = { rows: JobCSVRow[]; errors: JobCsvIssue[]; warnings: JobCsvIssue[] };

const aliases: Record<string, keyof JobCSVRow> = {
  date: 'date', 日期: 'date',
  platform: 'platform', 平台: 'platform', 来源平台: 'platform',
  company: 'company', 公司: 'company', 公司名称: 'company',
  job_title: 'job_title', 岗位: 'job_title', 职位: 'job_title', 岗位名称: 'job_title',
  salary: 'salary', 薪资: 'salary',
  experience: 'experience', 经验: 'experience',
  location: 'location', 地点: 'location', 工作地点: 'location',
  source_url: 'source_url', 链接: 'source_url', 岗位链接: 'source_url',
  job_direction: 'job_direction', 方向: 'job_direction',
  tech_stack: 'tech_stack', 技术栈: 'tech_stack',
  jd_keywords: 'jd_keywords', 关键词: 'jd_keywords',
  matched_project: 'matched_project', 匹配项目: 'matched_project',
  match_level: 'match_level', 匹配度: 'match_level',
  skill_gap: 'skill_gap', 技能缺口: 'skill_gap',
  next_learning_action: 'next_learning_action', 下一步: 'next_learning_action',
  status: 'status', 状态: 'status',
  notes: 'notes', 备注: 'notes',
};

function parseCells(source: string): { table: string[][]; unclosedQuote: boolean } {
  const table: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && source[index + 1] === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) table.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim())) table.push(row);
  return { table, unclosedQuote: quoted };
}

export function parseJobCsv(source: string): JobCsvParseResult {
  const errors: JobCsvIssue[] = [];
  const warnings: JobCsvIssue[] = [];
  const { table, unclosedQuote } = parseCells(source.replace(/^\uFEFF/, ''));
  if (unclosedQuote) errors.push({ message: '存在未闭合的双引号，请检查包含逗号或换行的单元格。' });
  if (table.length < 2) {
    errors.push({ message: 'CSV 至少需要一行表头和一行岗位数据。' });
    return { rows: [], errors, warnings };
  }

  const rawHeaders = table[0]!.map((value) => value.trim());
  const headers = rawHeaders.map((value) => aliases[value.toLowerCase()] ?? aliases[value]);
  const seen = new Set<keyof JobCSVRow>();
  headers.forEach((header, index) => {
    if (!header) warnings.push({ message: `未识别列“${rawHeaders[index]}”，导入时会忽略。` });
    else if (seen.has(header)) errors.push({ message: `表头“${rawHeaders[index]}”与已有列重复。` });
    else seen.add(header);
  });

  for (const required of ['company', 'job_title', 'platform'] as const) {
    if (!seen.has(required)) errors.push({ message: `缺少必需列 ${required}。` });
  }
  if (errors.length > 0) return { rows: [], errors, warnings };

  const rows: JobCSVRow[] = [];
  table.slice(1).forEach((cells, index) => {
    const line = index + 2;
    if (cells.length > headers.length) {
      errors.push({ row: line, message: `第 ${line} 行比表头多 ${cells.length - headers.length} 列，可能有未加引号的逗号。` });
      return;
    }
    const record: Partial<Record<keyof JobCSVRow, string>> = {};
    headers.forEach((header, columnIndex) => {
      if (header) record[header] = (cells[columnIndex] ?? '').trim();
    });
    rows.push(record as JobCSVRow);
  });

  return { rows, errors, warnings };
}

export const jobCsvSample = [
  'company,job_title,platform,salary,location,source_url,status,notes',
  '示例科技,高级前端工程师,公司官网,30k-45k,上海,https://example.com/jobs/1,SAVED,"关注 React 与 Vue 双栈"',
].join('\n');
