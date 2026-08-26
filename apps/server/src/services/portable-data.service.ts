/**
 * 可迁移个人数据 JSON 的导出、校验、预览与导入。
 *
 * 知识正文由当前版本的 Markdown 知识库维护；这里仅恢复个人进度与个人生成的数据。
 * 所有表名和列名都来自内部白名单，外部 JSON 不能控制 SQL 标识符。
 */
import { createHash } from 'crypto';
import { rawDb } from '../db/index.js';

type PortableScalar = string | number | null;
type PortableRow = Record<string, PortableScalar>;

const TABLE_DEFINITIONS = [
  { key: 'planEvents', table: 'plan_events', orderBy: 'start_at' },
  { key: 'checkins', table: 'checkins', orderBy: 'checked_at' },
  { key: 'dailyReviews', table: 'daily_reviews', orderBy: 'review_date' },
  { key: 'leaveDays', table: 'leave_days', orderBy: 'leave_date' },
  { key: 'weeklyReviews', table: 'weekly_reviews', orderBy: 'week_start_date' },
  { key: 'assessmentSessions', table: 'assessment_sessions', orderBy: 'created_at' },
  { key: 'assessmentQuestions', table: 'assessment_questions', orderBy: 'session_id, order_index' },
  { key: 'assessmentAnswers', table: 'assessment_answers', orderBy: 'session_id, created_at' },
  { key: 'assessmentResults', table: 'assessment_results', orderBy: 'created_at' },
  { key: 'assessmentHintEvents', table: 'assessment_hint_events', orderBy: 'created_at' },
  { key: 'masteryEvents', table: 'mastery_events', orderBy: 'created_at' },
  { key: 'knowledgeNotes', table: 'knowledge_notes', orderBy: 'updated_at' },
  { key: 'knowledgeNoteVersions', table: 'knowledge_note_versions', orderBy: 'note_id, version_no' },
  { key: 'learningCheckins', table: 'learning_checkins', orderBy: 'checkin_date' },
  { key: 'learningCheckinPoints', table: 'learning_checkin_points', orderBy: 'created_at' },
  { key: 'learningRouteChoices', table: 'learning_route_choices', orderBy: 'created_at' },
  { key: 'jobs', table: 'jobs', orderBy: 'created_at' },
  { key: 'jobActivities', table: 'job_activities', orderBy: 'created_at' },
  { key: 'skillGaps', table: 'skill_gaps', orderBy: 'created_at' },
  { key: 'projects', table: 'projects', orderBy: 'created_at' },
] as const;

const PORTABLE_KEYS = ['knowledgeProgress', ...TABLE_DEFINITIONS.map((definition) => definition.key)] as const;
type PortableDataKey = typeof PORTABLE_KEYS[number];

const KNOWLEDGE_PROGRESS_COLUMNS = [
  'code', 'title', 'domain_id', 'status', 'learning_state', 'mastery_level', 'learned_at',
  'deferred_at', 'defer_reason', 'current_focus', 'self_mastered_at', 'first_passed_at',
  'mastered_at', 'next_review_at', 'updated_at',
] as const;
const KNOWLEDGE_PROGRESS_WRITABLE_COLUMNS = [
  'status', 'learning_state', 'mastery_level', 'learned_at', 'deferred_at', 'defer_reason',
  'current_focus', 'self_mastered_at', 'first_passed_at', 'mastered_at', 'next_review_at', 'updated_at',
] as const;

const MAX_PORTABLE_RECORDS = 100_000;

const ENUM_COLUMNS: Record<string, readonly string[]> = {
  'knowledge_points.status': ['NOT_STARTED', 'LEARNING', 'SELF_MASTERED', 'FIRST_PASS_PENDING_RETEST', 'MASTERED', 'NEEDS_RELEARNING'],
  'knowledge_points.learning_state': ['NOT_STARTED', 'LEARNING', 'LEARNED', 'DEFERRED'],
  'plan_events.event_type': ['LEARNING', 'ASSESSMENT', 'RETEST', 'PROJECT_OUTPUT', 'JOB_APPLICATION', 'INTERVIEW', 'REVIEW'],
  'plan_events.status': ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'PARTIAL', 'SKIPPED', 'RESCHEDULED'],
  'plan_events.source_type': ['TEMPLATE', 'USER', 'SYSTEM'],
  'checkins.result': ['COMPLETED', 'PARTIAL', 'SKIPPED', 'RESCHEDULED'],
  'assessment_sessions.assessment_type': ['FIRST', 'RETEST', 'MONTHLY_REVIEW', 'DOMAIN_COMPREHENSIVE'],
  'assessment_sessions.status': ['DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'GRADING', 'GRADED', 'ERROR', 'CANCELLED'],
  'assessment_sessions.challenge_mode': ['THEORY', 'PRACTICE', 'MIXED'],
  'assessment_sessions.challenge_profile': ['AUTO', 'THEORY_ONLY', 'EXAMPLE_DRIVEN', 'CODING', 'DEBUGGING', 'TOOL_OPERATION', 'DESIGN_CASE'],
  'assessment_questions.question_type': ['CHOICE', 'OUTPUT', 'ESSAY', 'CODE_READ', 'CODE_WRITE'],
  'assessment_questions.dimension': ['principlesAndBoundaries', 'practice', 'troubleshootingAndDesign', 'projectCommunication'],
  'assessment_results.verdict': ['PASS', 'FAIL', 'MANUAL_REVIEW'],
  'assessment_results.server_calculated_verdict': ['PASS', 'FAIL', 'MANUAL_REVIEW'],
  'mastery_events.action': ['start', 'selfMastery', 'firstPass', 'firstFail', 'retestPass', 'retestFail', 'reviewPass', 'reviewFail', 'restart', 'reopen'],
  'mastery_events.from_status': ['NOT_STARTED', 'LEARNING', 'SELF_MASTERED', 'FIRST_PASS_PENDING_RETEST', 'MASTERED', 'NEEDS_RELEARNING'],
  'mastery_events.to_status': ['NOT_STARTED', 'LEARNING', 'SELF_MASTERED', 'FIRST_PASS_PENDING_RETEST', 'MASTERED', 'NEEDS_RELEARNING'],
  'knowledge_notes.active_version_source': ['ORIGINAL', 'ORGANIZED'],
  'knowledge_note_versions.source': ['USER', 'AI_DRAFT', 'AI_ACCEPTED', 'MIGRATED'],
  'learning_checkin_points.activity': ['PROGRESSED', 'LEARNED', 'REVIEWED', 'CHALLENGED'],
  'learning_route_choices.state': ['SELECTED', 'DEFERRED'],
  'learning_route_choices.scope': ['POINT', 'BRANCH'],
  'assessment_hint_events.hint_kind': ['EXPLAIN', 'HINT', 'DECOMPOSE', 'OUTLINE', 'STARTER', 'SIMILAR_EXAMPLE', 'FULL_ANSWER'],
  'jobs.match_level': ['HIGH', 'MEDIUM', 'LOW'],
  'jobs.status': ['SAVED', 'TO_APPLY', 'APPLIED', 'CONTACTING', 'ASSESSMENT', 'INTERVIEWING', 'OFFER', 'REJECTED', 'WITHDRAWN'],
  'job_activities.activity_type': ['APPLICATION', 'MESSAGE', 'WRITTEN_TEST', 'INTERVIEW', 'FOLLOW_UP', 'OFFER', 'REJECTION'],
  'job_activities.status': ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  'job_activities.interview_type': ['PHONE', 'VIDEO', 'ONSITE'],
  'skill_gaps.gap_level': ['HIGH', 'MEDIUM', 'LOW'],
  'skill_gaps.source_type': ['JD_ANALYSIS', 'INTERVIEW_FEEDBACK', 'SELF_ASSESSMENT'],
  'skill_gaps.status': ['IDENTIFIED', 'LEARNING', 'MASTERED', 'CLOSED'],
  'projects.project_type': ['WEB', 'H5', 'COMPONENT_LIBRARY', 'TOOL', 'OTHER'],
  'projects.status': ['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED'],
};

const CATEGORY_DEFINITIONS = [
  { key: 'knowledge', label: '知识点进度', sources: ['knowledgeProgress'] },
  { key: 'planning', label: '计划、打卡与复盘', sources: ['planEvents', 'checkins', 'dailyReviews', 'leaveDays', 'weeklyReviews'] },
  { key: 'assessment', label: '掌握挑战与证据', sources: ['assessmentSessions', 'assessmentQuestions', 'assessmentAnswers', 'assessmentResults', 'assessmentHintEvents', 'masteryEvents'] },
  { key: 'notes', label: '笔记与版本', sources: ['knowledgeNotes', 'knowledgeNoteVersions'] },
  { key: 'learning', label: '自主学习记录与路线', sources: ['learningCheckins', 'learningCheckinPoints', 'learningRouteChoices'] },
  { key: 'jobs', label: '岗位、活动与技能缺口', sources: ['jobs', 'jobActivities', 'skillGaps'] },
  { key: 'projects', label: '项目资产', sources: ['projects'] },
] as const satisfies readonly { key: string; label: string; sources: readonly PortableDataKey[] }[];

const DELETE_ORDER = [
  'assessment_hint_events', 'assessment_answers', 'assessment_results', 'assessment_questions',
  'mastery_events', 'assessment_sessions', 'knowledge_note_versions', 'knowledge_notes',
  'learning_checkin_points', 'learning_checkins', 'learning_route_choices', 'skill_gaps',
  'job_activities', 'jobs', 'checkins', 'plan_events', 'daily_reviews', 'leave_days',
  'weekly_reviews', 'projects',
] as const;

interface SqliteColumnInfo {
  name: string;
  type: string;
  notnull: 0 | 1;
  dflt_value: string | null;
  pk: number;
}

interface SqliteForeignKeyInfo {
  id: number;
  table: string;
  from: string;
  to: string;
}

interface SqliteIndexInfo {
  name: string;
  unique: 0 | 1;
}

interface SqliteIndexColumnInfo {
  name: string;
}

export interface PortableDataExport {
  schemaVersion: 1;
  product: 'career-atlas';
  exportedAt: string;
  counts: Record<PortableDataKey, number>;
  data: Record<PortableDataKey, PortableRow[]>;
}

export interface PortableDataImportPreview {
  schemaVersion: 1;
  exportedAt: string;
  totalRecords: number;
  confirmation: string;
  knowledgePoints: {
    inFile: number;
    matched: number;
    skipped: number;
    retainedCurrent: number;
  };
  categories: Array<{
    key: string;
    label: string;
    current: number;
    after: number;
    difference: number;
  }>;
  warnings: string[];
}

export interface PortableDataImportResult {
  importedRecords: number;
  skippedKnowledgePoints: number;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function fail(message: string): never {
  throw new Error(`个人数据 JSON 无效：${message}`);
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function getColumns(table: string): SqliteColumnInfo[] {
  return rawDb.prepare(`PRAGMA table_info(${quoteIdentifier(table)})`).all() as SqliteColumnInfo[];
}

function validateScalar(table: string, column: SqliteColumnInfo, value: unknown, location: string): asserts value is PortableScalar {
  if (value === null) {
    if (column.notnull) fail(`${location} 不能为空`);
    return;
  }
  if (column.type.toUpperCase().includes('INT')) {
    if (typeof value !== 'number' || !Number.isSafeInteger(value)) fail(`${location} 应为整数`);
  } else if (column.type.toUpperCase().includes('REAL') || column.type.toUpperCase().includes('NUM')) {
    if (typeof value !== 'number' || !Number.isFinite(value)) fail(`${location} 应为有限数字`);
  } else if (typeof value !== 'string') {
    fail(`${location} 应为文本`);
  }

  const allowed = ENUM_COLUMNS[`${table}.${column.name}`];
  if (allowed && typeof value === 'string' && !allowed.includes(value)) {
    fail(`${location} 的值“${value}”不受当前版本支持`);
  }
}

function validateRows(key: PortableDataKey, table: string, rows: unknown[]): PortableRow[] {
  const columns = getColumns(table);
  if (!columns.length) fail(`当前版本缺少数据表 ${table}`);
  const columnMap = new Map(columns.map((column) => [column.name, column]));
  const normalized = rows.map((candidate, rowIndex) => {
    if (!isPlainObject(candidate)) fail(`data.${key}[${rowIndex}] 应为对象`);
    const entries = Object.entries(candidate);
    if (!entries.length) fail(`data.${key}[${rowIndex}] 不能为空对象`);
    const row: PortableRow = {};
    for (const [columnName, value] of entries) {
      const column = columnMap.get(columnName);
      if (!column) fail(`data.${key}[${rowIndex}] 包含当前版本不认识的字段 ${columnName}`);
      validateScalar(table, column, value, `data.${key}[${rowIndex}].${columnName}`);
      row[columnName] = value;
    }
    for (const column of columns) {
      if (column.notnull && column.dflt_value === null && !(column.name in row)) {
        fail(`data.${key}[${rowIndex}] 缺少必填字段 ${column.name}`);
      }
    }
    return row;
  });
  validateUniqueValues(key, table, normalized, columns);
  return normalized;
}

function validateUniqueValues(key: PortableDataKey, table: string, rows: PortableRow[], columns: SqliteColumnInfo[]): void {
  const uniqueColumnGroups: string[][] = [];
  const primaryColumns = columns.filter((column) => column.pk > 0).sort((left, right) => left.pk - right.pk).map((column) => column.name);
  if (primaryColumns.length) uniqueColumnGroups.push(primaryColumns);
  const indexes = rawDb.prepare(`PRAGMA index_list(${quoteIdentifier(table)})`).all() as SqliteIndexInfo[];
  for (const index of indexes.filter((candidate) => candidate.unique)) {
    const indexColumns = rawDb.prepare(`PRAGMA index_info(${quoteIdentifier(index.name)})`).all() as SqliteIndexColumnInfo[];
    if (indexColumns.length) uniqueColumnGroups.push(indexColumns.map((column) => column.name));
  }
  for (const columnNames of uniqueColumnGroups) {
    const seen = new Set<string>();
    rows.forEach((row, rowIndex) => {
      const values = columnNames.map((columnName) => row[columnName]);
      if (values.some((value) => value === null || value === undefined)) return;
      const signature = JSON.stringify(values);
      if (seen.has(signature)) fail(`data.${key}[${rowIndex}] 与另一条记录的唯一标识重复`);
      seen.add(signature);
    });
  }
}

function validateKnowledgeRows(rows: unknown[]): PortableRow[] {
  const columnMap = new Map(getColumns('knowledge_points').map((column) => [column.name, column]));
  const required = new Set(KNOWLEDGE_PROGRESS_COLUMNS);
  const seenCodes = new Set<string>();
  let currentFocusCount = 0;
  return rows.map((candidate, rowIndex) => {
    if (!isPlainObject(candidate)) fail(`data.knowledgeProgress[${rowIndex}] 应为对象`);
    const unknownColumns = Object.keys(candidate).filter((column) => !required.has(column as typeof KNOWLEDGE_PROGRESS_COLUMNS[number]));
    if (unknownColumns.length) fail(`data.knowledgeProgress[${rowIndex}] 包含当前版本不认识的字段 ${unknownColumns[0]}`);
    const row: PortableRow = {};
    for (const columnName of KNOWLEDGE_PROGRESS_COLUMNS) {
      if (!(columnName in candidate)) fail(`data.knowledgeProgress[${rowIndex}] 缺少字段 ${columnName}`);
      const column = columnMap.get(columnName);
      if (!column) fail(`当前版本无法恢复知识点字段 ${columnName}`);
      const value = candidate[columnName];
      validateScalar('knowledge_points', column, value, `data.knowledgeProgress[${rowIndex}].${columnName}`);
      row[columnName] = value;
    }
    const code = row.code;
    if (typeof code !== 'string' || !code.trim()) fail(`data.knowledgeProgress[${rowIndex}].code 不能为空`);
    if (seenCodes.has(code)) fail(`知识点编号 ${code} 重复`);
    seenCodes.add(code);
    const masteryLevel = row.mastery_level;
    const currentFocus = row.current_focus;
    if (typeof masteryLevel !== 'number' || masteryLevel < 0 || masteryLevel > 4) fail(`知识点 ${code} 的 mastery_level 必须在 0 到 4 之间`);
    if (currentFocus !== 0 && currentFocus !== 1) fail(`知识点 ${code} 的 current_focus 必须为 0 或 1`);
    if (currentFocus === 1) currentFocusCount += 1;
    return row;
  }).map((row) => {
    if (currentFocusCount > 1) fail('最多只能有一个当前学习焦点');
    return row;
  });
}

function assertKeys(object: Record<string, unknown>, expected: readonly string[], location: string): void {
  const missing = expected.filter((key) => !(key in object));
  const unknown = Object.keys(object).filter((key) => !expected.includes(key));
  if (missing.length) fail(`${location} 缺少 ${missing[0]}`);
  if (unknown.length) fail(`${location} 包含不支持的字段 ${unknown[0]}`);
}

function validateForeignKeys(data: Record<PortableDataKey, PortableRow[]>): void {
  const rowsByTable = new Map<string, PortableRow[]>(TABLE_DEFINITIONS.map((definition) => [definition.table, data[definition.key]]));
  const currentKnowledgeIds = new Set((rawDb.prepare('SELECT id FROM knowledge_points').all() as Array<{ id: string }>).map((row) => row.id));
  for (const definition of TABLE_DEFINITIONS) {
    const foreignKeys = rawDb.prepare(`PRAGMA foreign_key_list(${quoteIdentifier(definition.table)})`).all() as SqliteForeignKeyInfo[];
    const grouped = new Map<number, SqliteForeignKeyInfo[]>();
    for (const foreignKey of foreignKeys) {
      const group = grouped.get(foreignKey.id) ?? [];
      group.push(foreignKey);
      grouped.set(foreignKey.id, group);
    }
    for (const group of grouped.values()) {
      if (group.length !== 1) fail(`当前版本暂不支持 ${definition.table} 的复合外键导入`);
      const foreignKey = group[0]!;
      const parentRows = rowsByTable.get(foreignKey.table);
      const parentValues = foreignKey.table === 'knowledge_points'
        ? currentKnowledgeIds
        : new Set((parentRows ?? []).map((row) => row[foreignKey.to]).filter((value): value is string => typeof value === 'string'));
      data[definition.key].forEach((row, rowIndex) => {
        const value = row[foreignKey.from];
        if (value === null || value === undefined) return;
        if (typeof value !== 'string' || !parentValues.has(value)) {
          fail(`data.${definition.key}[${rowIndex}].${foreignKey.from} 引用了文件中不存在的记录`);
        }
      });
    }
  }
}

export function validatePortableDataExport(input: unknown): PortableDataExport {
  if (!isPlainObject(input)) fail('文件顶层应为对象');
  assertKeys(input, ['schemaVersion', 'product', 'exportedAt', 'counts', 'data'], '文件顶层');
  if (input.schemaVersion !== 1) fail(`不支持 schemaVersion=${String(input.schemaVersion)}，当前只支持版本 1`);
  if (input.product !== 'career-atlas') fail('product 不是 career-atlas');
  if (typeof input.exportedAt !== 'string' || Number.isNaN(Date.parse(input.exportedAt))) fail('exportedAt 不是有效时间');
  if (!isPlainObject(input.counts)) fail('counts 应为对象');
  if (!isPlainObject(input.data)) fail('data 应为对象');
  assertKeys(input.counts, PORTABLE_KEYS, 'counts');
  assertKeys(input.data, PORTABLE_KEYS, 'data');

  const data = {} as Record<PortableDataKey, PortableRow[]>;
  for (const key of PORTABLE_KEYS) {
    const rows = input.data[key];
    const count = input.counts[key];
    if (!Array.isArray(rows)) fail(`data.${key} 应为数组`);
    if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) fail(`counts.${key} 应为非负整数`);
    if (count !== rows.length) fail(`counts.${key}=${count} 与实际 ${rows.length} 条不一致`);
    if (key === 'knowledgeProgress') data[key] = validateKnowledgeRows(rows);
    else {
      const definition = TABLE_DEFINITIONS.find((candidate) => candidate.key === key);
      if (!definition) fail(`当前版本缺少 ${key} 的导入规则`);
      data[key] = validateRows(key, definition.table, rows);
    }
  }
  const totalRecords = Object.values(data).reduce((sum, rows) => sum + rows.length, 0);
  if (totalRecords > MAX_PORTABLE_RECORDS) fail(`记录数 ${totalRecords} 超过上限 ${MAX_PORTABLE_RECORDS}`);
  validateForeignKeys(data);

  const counts = Object.fromEntries(PORTABLE_KEYS.map((key) => [key, data[key].length])) as Record<PortableDataKey, number>;
  return { schemaVersion: 1, product: 'career-atlas', exportedAt: input.exportedAt, counts, data };
}

/** 导出固定白名单内的可阅读个人数据，不包含知识正文或密钥配置。 */
export function createPortableDataExport(): PortableDataExport {
  const knowledgeProgress = rawDb.prepare(`SELECT ${KNOWLEDGE_PROGRESS_COLUMNS.join(', ')} FROM knowledge_points ORDER BY code`).all() as PortableRow[];
  const data = { knowledgeProgress } as Record<PortableDataKey, PortableRow[]>;
  for (const definition of TABLE_DEFINITIONS) {
    data[definition.key] = rawDb.prepare(
      `SELECT * FROM ${quoteIdentifier(definition.table)} ORDER BY ${definition.orderBy}`
    ).all() as PortableRow[];
  }
  const counts = Object.fromEntries(PORTABLE_KEYS.map((key) => [key, data[key].length])) as Record<PortableDataKey, number>;
  return { schemaVersion: 1, product: 'career-atlas', exportedAt: new Date().toISOString(), counts, data };
}

function createConfirmation(snapshot: PortableDataExport): string {
  return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
}

function countTable(table: string): number {
  return (rawDb.prepare(`SELECT count(*) AS count FROM ${quoteIdentifier(table)}`).get() as { count: number }).count;
}

export function previewPortableDataImport(input: unknown): PortableDataImportPreview {
  const snapshot = validatePortableDataExport(input);
  const currentCodes = new Set((rawDb.prepare('SELECT code FROM knowledge_points').all() as Array<{ code: string }>).map((row) => row.code));
  const snapshotCodes = new Set(snapshot.data.knowledgeProgress.map((row) => String(row.code)));
  const matched = [...snapshotCodes].filter((code) => currentCodes.has(code)).length;
  const skipped = snapshotCodes.size - matched;
  const retainedCurrent = [...currentCodes].filter((code) => !snapshotCodes.has(code)).length;

  const currentCounts = { knowledgeProgress: currentCodes.size } as Record<PortableDataKey, number>;
  for (const definition of TABLE_DEFINITIONS) currentCounts[definition.key] = countTable(definition.table);

  const categories = CATEGORY_DEFINITIONS.map((category) => {
    const current = category.sources.reduce((sum, key) => sum + currentCounts[key], 0);
    const after = category.key === 'knowledge'
      ? currentCodes.size
      : category.sources.reduce((sum, key) => sum + snapshot.counts[key], 0);
    return { key: category.key, label: category.label, current, after, difference: after - current };
  });

  const warnings: string[] = [];
  if (skipped) warnings.push(`文件中的 ${skipped} 个旧知识点在当前版本不存在，其进度将跳过；相关历史笔记仍会保留。`);
  if (retainedCurrent) warnings.push(`当前版本新增的 ${retainedCurrent} 个知识点不在文件中，其现有进度将保持不变。`);
  for (const category of categories) {
    if (category.difference < 0) warnings.push(`“${category.label}”将比当前少 ${Math.abs(category.difference)} 条记录。`);
  }

  return {
    schemaVersion: 1,
    exportedAt: snapshot.exportedAt,
    totalRecords: Object.values(snapshot.counts).reduce((sum, count) => sum + count, 0),
    confirmation: createConfirmation(snapshot),
    knowledgePoints: { inFile: snapshotCodes.size, matched, skipped, retainedCurrent },
    categories,
    warnings,
  };
}

function insertRows(table: string, rows: PortableRow[]): void {
  const statementCache = new Map<string, ReturnType<typeof rawDb.prepare>>();
  for (const row of rows) {
    const columns = Object.keys(row);
    const signature = columns.join('\u0000');
    let statement = statementCache.get(signature);
    if (!statement) {
      statement = rawDb.prepare(
        `INSERT INTO ${quoteIdentifier(table)} (${columns.map(quoteIdentifier).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`
      );
      statementCache.set(signature, statement);
    }
    statement.run(columns.map((column) => row[column]));
  }
}

export function importPortableData(input: unknown, confirmation: string): PortableDataImportResult {
  const snapshot = validatePortableDataExport(input);
  if (confirmation !== createConfirmation(snapshot)) throw new Error('导入确认已失效，请重新预览这份 JSON。');
  const currentCodes = new Set((rawDb.prepare('SELECT code FROM knowledge_points').all() as Array<{ code: string }>).map((row) => row.code));
  const matchedKnowledgeRows = snapshot.data.knowledgeProgress.filter((row) => currentCodes.has(String(row.code)));

  rawDb.transaction(() => {
    rawDb.pragma('defer_foreign_keys = ON');
    for (const table of DELETE_ORDER) rawDb.prepare(`DELETE FROM ${quoteIdentifier(table)}`).run();
    for (const definition of TABLE_DEFINITIONS) insertRows(definition.table, snapshot.data[definition.key]);

    // current_focus uses a partial unique index, so clear the existing focus before
    // replaying snapshot rows. Otherwise a new focused point can be written before
    // the previous focused point is cleared, making a valid snapshot fail by row order.
    rawDb.prepare('UPDATE knowledge_points SET current_focus = 0 WHERE current_focus = 1').run();
    const assignments = KNOWLEDGE_PROGRESS_WRITABLE_COLUMNS.map((column) => `${quoteIdentifier(column)} = ?`).join(', ');
    const statement = rawDb.prepare(`UPDATE knowledge_points SET ${assignments} WHERE code = ?`);
    for (const row of matchedKnowledgeRows) {
      statement.run([...KNOWLEDGE_PROGRESS_WRITABLE_COLUMNS.map((column) => row[column]), row.code]);
    }
  })();

  const importedTableRecords = TABLE_DEFINITIONS.reduce((sum, definition) => sum + snapshot.data[definition.key].length, 0);
  return {
    importedRecords: matchedKnowledgeRows.length + importedTableRecords,
    skippedKnowledgePoints: snapshot.data.knowledgeProgress.length - matchedKnowledgeRows.length,
  };
}
