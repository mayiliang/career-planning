import { join } from 'node:path';
import { config } from '../../config/index.js';
import { type AssistantDiagnosticRecord, type AssistantGapCandidate, type AssistantRequest, type AssistantGapEvaluation } from './types.js';
import { mkdirSync, appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { compact, normalize, escapeMarkdown } from './text.js';
import { rawDb } from '../../db/index.js';
import { createHash, randomUUID } from 'node:crypto';

export const SUPPLEMENT_ROOT = join(config.DATA_DIR, 'learning-material-supplements');

export const SUPPLEMENT_PENDING_DIR = join(SUPPLEMENT_ROOT, 'pending');

export const ASSISTANT_DIAGNOSTIC_DIR = join(config.DATA_DIR, 'diagnostics');

export const ASSISTANT_DIAGNOSTIC_FILE = join(ASSISTANT_DIAGNOSTIC_DIR, 'assistant-requests.jsonl');

export function recordAssistantDiagnostic(record: AssistantDiagnosticRecord) {
  try {
    mkdirSync(ASSISTANT_DIAGNOSTIC_DIR, { recursive: true });
    const safeRecord = {
      ...record,
      route: record.route.split(/[?#]/u)[0]!.slice(0, 200),
      errorMessage: record.errorMessage ? compact(record.errorMessage, 300) : undefined,
    };
    appendFileSync(ASSISTANT_DIAGNOSTIC_FILE, `${JSON.stringify(safeRecord)}\n`, 'utf8');
  } catch {
    // 诊断日志不能反过来影响助手回答。
  }
}

export function listAssistantDiagnostics(limit = 40) {
  const normalizedLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
  if (!existsSync(ASSISTANT_DIAGNOSTIC_FILE)) return { file: ASSISTANT_DIAGNOSTIC_FILE, items: [] as AssistantDiagnosticRecord[] };
  try {
    const items = readFileSync(ASSISTANT_DIAGNOSTIC_FILE, 'utf8')
      .split(/\r?\n/u)
      .filter(Boolean)
      .slice(-normalizedLimit)
      .reverse()
      .flatMap((line) => {
        try { return [JSON.parse(line) as AssistantDiagnosticRecord]; }
        catch { return []; }
      });
    return { file: ASSISTANT_DIAGNOSTIC_FILE, items };
  } catch {
    return { file: ASSISTANT_DIAGNOSTIC_FILE, items: [] as AssistantDiagnosticRecord[] };
  }
}

export function listAssistantGapCandidates() {
  mkdirSync(SUPPLEMENT_PENDING_DIR, { recursive: true });
  const storedItems = rawDb.prepare(`
    SELECT id, title, rationale, suggested_scope AS suggestedScope,
           source_route AS sourceRoute, source_page_title AS sourcePageTitle,
           question_excerpt AS questionExcerpt, status,
           created_at AS createdAt, updated_at AS updatedAt
      FROM assistant_gap_candidates
     ORDER BY CASE status WHEN 'PENDING' THEN 0 WHEN 'ADDED' THEN 1 ELSE 2 END, created_at DESC
  `).all() as Array<AssistantGapCandidate & { questionExcerpt: string }>;
  for (const item of storedItems) {
    if (item.status === 'PENDING' && !existsSync(candidateMarkdownPath(item.id))) {
      writeCandidateMarkdown(item, item.questionExcerpt);
    }
  }
  const items = storedItems.map(({ questionExcerpt: _questionExcerpt, ...item }) => item);
  return { directory: SUPPLEMENT_PENDING_DIR, items };
}

export function persistGapCandidate(
  request: AssistantRequest,
  evaluation: AssistantGapEvaluation,
): AssistantGapCandidate {
  mkdirSync(SUPPLEMENT_PENDING_DIR, { recursive: true });
  const fingerprint = createHash('sha256').update(normalize(evaluation.title)).digest('hex');
  const existing = rawDb.prepare(`
    SELECT id, title, rationale, suggested_scope AS suggestedScope,
           source_route AS sourceRoute, source_page_title AS sourcePageTitle,
           status, created_at AS createdAt, updated_at AS updatedAt
      FROM assistant_gap_candidates WHERE fingerprint = ?
  `).get(fingerprint) as AssistantGapCandidate | undefined;
  if (existing) return existing;

  const now = new Date().toISOString();
  const candidate: AssistantGapCandidate = {
    id: randomUUID(),
    title: evaluation.title,
    rationale: evaluation.rationale,
    suggestedScope: evaluation.suggestedScope,
    sourceRoute: request.page.route,
    sourcePageTitle: request.page.title,
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
  };
  rawDb.prepare(`
    INSERT INTO assistant_gap_candidates (
      id, fingerprint, title, rationale, suggested_scope, source_route,
      source_page_title, question_excerpt, selected_text_excerpt, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)
  `).run(
    candidate.id,
    fingerprint,
    candidate.title,
    candidate.rationale,
    candidate.suggestedScope,
    candidate.sourceRoute,
    candidate.sourcePageTitle,
    compact(request.question || '解释选中文本', 500),
    request.selectedText ? compact(request.selectedText, 800) : null,
    now,
    now,
  );
  writeCandidateMarkdown(candidate, request.question || request.selectedText || '未提供');
  return candidate;
}

export function candidateMarkdownPath(id: string) {
  return join(SUPPLEMENT_PENDING_DIR, `${id}.md`);
}

export function writeCandidateMarkdown(candidate: AssistantGapCandidate, questionExcerpt: string) {
  const markdown = [
    `# ${escapeMarkdown(candidate.title)}`,
    '',
    '- 状态：待补充',
    `- 发现时间：${candidate.createdAt}`,
    `- 来源页面：${escapeMarkdown(candidate.sourcePageTitle)}（\`${candidate.sourceRoute}\`）`,
    '',
    '## 为什么需要补充',
    '',
    candidate.rationale,
    '',
    '## 建议覆盖范围',
    '',
    candidate.suggestedScope,
    '',
    '## 用户疑问摘录',
    '',
    compact(questionExcerpt, 800),
    '',
    '> 此文件由内置 AI 助手登记。纳入知识库前必须由开发者阅读原问题、核对现有资料，并补齐中文讲义、术语解释、掌握挑战和站内练习。',
    '',
  ].join('\n');
  writeFileSync(candidateMarkdownPath(candidate.id), markdown, 'utf8');
}
