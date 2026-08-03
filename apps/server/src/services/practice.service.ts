import { randomUUID } from 'node:crypto';
import { rawDb } from '../db/index.js';
import { aiThinkingRequestOption, config } from '../config/index.js';
import { getKnowledgePointByCode } from './knowledge.service.js';

export interface PracticeAttemptInput {
  submissionMd: string;
  code?: string;
  language?: 'javascript' | 'typescript';
  executionOutput?: string;
  executionStatus?: 'NOT_RUN' | 'SUCCESS' | 'ERROR' | 'TIMEOUT';
}

type PracticeReview = {
  passed: boolean;
  summary: string;
  checks: Array<{ label: string; passed: boolean }>;
  nextAction: string;
  mode: 'AI' | 'RULE';
};

type PracticeAttemptRow = {
  id: string;
  knowledgePointCode: string;
  activityId: string;
  submissionMd: string;
  code: string;
  language: string | null;
  executionOutput: string;
  executionStatus: string | null;
  validationJson: string | null;
  status: 'DRAFT' | 'COMPLETED';
  createdAt: string;
  updatedAt: string;
};

const selectAttempt = `SELECT id, knowledge_point_code AS knowledgePointCode,
  activity_id AS activityId, submission_md AS submissionMd, code, language,
  execution_output AS executionOutput, execution_status AS executionStatus,
  validation_json AS validationJson, status, created_at AS createdAt, updated_at AS updatedAt
  FROM learning_practice_attempts`;

export function listPracticeAttempts(code: string) {
  return (rawDb.prepare(`${selectAttempt} WHERE knowledge_point_code = ? ORDER BY created_at`).all(code) as PracticeAttemptRow[])
    .map(serializeAttempt);
}

export function savePracticeAttempt(code: string, activityId: string, input: PracticeAttemptInput) {
  const now = new Date().toISOString();
  const existing = rawDb.prepare(`${selectAttempt} WHERE knowledge_point_code = ? AND activity_id = ? LIMIT 1`)
    .get(code, activityId) as PracticeAttemptRow | undefined;
  if (existing) {
    rawDb.prepare(`UPDATE learning_practice_attempts SET submission_md = ?, code = ?, language = ?,
      execution_output = ?, execution_status = ?, validation_json = NULL, status = 'DRAFT', updated_at = ?
      WHERE id = ?`).run(
        input.submissionMd,
        input.code ?? '',
        input.language ?? null,
        input.executionOutput ?? '',
        input.executionStatus ?? 'NOT_RUN',
        now,
        existing.id,
      );
  } else {
    rawDb.prepare(`INSERT INTO learning_practice_attempts
      (id, knowledge_point_code, activity_id, submission_md, code, language, execution_output,
       execution_status, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?)`).run(
        randomUUID(), code, activityId, input.submissionMd, input.code ?? '', input.language ?? null,
        input.executionOutput ?? '', input.executionStatus ?? 'NOT_RUN', now, now,
      );
  }
  return getPracticeAttempt(code, activityId);
}

export async function validatePracticeAttempt(
  code: string,
  activityId: string,
  input: PracticeAttemptInput,
  onProgress: (message: string, receivedChars?: number, thinkingDelta?: string) => void = () => {},
  signal?: AbortSignal,
) {
  onProgress('正在读取知识点、任务契约和提交内容');
  const point = await getKnowledgePointByCode(code);
  if (!point) throw new Error(`知识点不存在：${code}`);
  const activity = point.learningActivities.find((item) => item.id === activityId && item.deliveryMode === 'WORKSPACE');
  if (!activity) throw new Error('练习任务不存在或不需要提交');
  const saved = savePracticeAttempt(code, activityId, input);
  const localChecks = [
    { label: '提交说明达到可复核长度', passed: input.submissionMd.trim().length >= 80 },
    { label: '包含资料、依据、机制、输入或输出等证据', passed: /资料|依据|机制|输入|输出|验证|边界/.test(input.submissionMd) },
    ...(activity.workspaceMode === 'CODE' ? [
      { label: '代码达到最小可运行规模', passed: (input.code?.trim().length ?? 0) >= 80 },
      { label: '脚本已在站内执行成功', passed: input.executionStatus === 'SUCCESS' },
      { label: '已保存实际执行输出', passed: Boolean(input.executionOutput?.trim()) },
    ] : []),
  ];
  const locallyReady = localChecks.every((item) => item.passed);
  onProgress(locallyReady ? '本地必备项已通过，正在依据学习资料进行 AI 核对' : '本地必备项尚未齐全，正在生成明确的补充要求');
  let review: PracticeReview | null = locallyReady ? await requestAiPracticeReview(point, activity, input, onProgress, signal) : null;
  if (!review) {
    review = {
      passed: locallyReady,
      summary: locallyReady
        ? '输入、输出、资料依据和验证证据已经齐全；当前使用本地规则完成结构验证。'
        : '提交内容还不能被复核，请先补齐未通过的检查项。',
      checks: localChecks,
      nextAction: locallyReady ? '可以保留为练习证据，继续下一项。' : '根据红色检查项补充后再次验证。',
      mode: 'RULE' as const,
    };
  }
  const merged = {
    ...review,
    passed: locallyReady && review.passed,
    checks: review.checks?.length ? review.checks : localChecks,
    mode: review.mode ?? 'AI',
  };
  const now = new Date().toISOString();
  rawDb.prepare(`UPDATE learning_practice_attempts SET validation_json = ?, status = ?, updated_at = ? WHERE id = ?`)
    .run(JSON.stringify(merged), merged.passed ? 'COMPLETED' : 'DRAFT', now, saved.id);
  onProgress('验证结论已完成并保存');
  return getPracticeAttempt(code, activityId);
}

function getPracticeAttempt(code: string, activityId: string) {
  const row = rawDb.prepare(`${selectAttempt} WHERE knowledge_point_code = ? AND activity_id = ? LIMIT 1`)
    .get(code, activityId) as PracticeAttemptRow | undefined;
  if (!row) throw new Error('练习记录保存失败');
  return serializeAttempt(row);
}

function serializeAttempt(row: PracticeAttemptRow) {
  return {
    ...row,
    validation: row.validationJson ? JSON.parse(row.validationJson) : null,
  };
}

async function requestAiPracticeReview(
  point: NonNullable<Awaited<ReturnType<typeof getKnowledgePointByCode>>>,
  activity: NonNullable<NonNullable<Awaited<ReturnType<typeof getKnowledgePointByCode>>>['learningActivities'][number]>,
  input: PracticeAttemptInput,
  onProgress: (message: string, receivedChars?: number, thinkingDelta?: string) => void,
  signal?: AbortSignal,
): Promise<PracticeReview | null> {
  if (!config.DEEPSEEK_API_KEY) return null;
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort();
  signal?.addEventListener('abort', abortFromCaller, { once: true });
  const timeout = setTimeout(() => controller.abort(), Math.min(config.DEEPSEEK_TIMEOUT_MS, 45_000));
  try {
    const response = await fetch(`${config.DEEPSEEK_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.DEEPSEEK_API_KEY}` },
      body: JSON.stringify({
        model: config.DEEPSEEK_MODEL, temperature: 0.1, max_tokens: 1200, ...aiThinkingRequestOption(), stream: true,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: '你是前端学习练习验证器。只依据给定学习资料、任务契约和通过标准验证提交，不补充资料外要求。只输出 JSON。' },
          { role: 'user', content: JSON.stringify({
            requiredJson: { passed: 'boolean', summary: 'string', checks: [{ label: 'string', passed: 'boolean' }], nextAction: 'string', mode: 'AI' },
            knowledgePoint: `${point.code} ${point.title}`,
            task: activity.task,
            input: activity.input,
            outputRequirements: activity.outputRequirements,
            completionCriteria: activity.completionCriteria,
            materialReferences: activity.materialReferences,
            passCriteria: point.passCriteriaMd,
            submissionMd: input.submissionMd,
            code: input.code ?? '',
            executionOutput: input.executionOutput ?? '',
            executionStatus: input.executionStatus ?? 'NOT_RUN',
          }) },
        ],
      }),
    });
    if (!response.ok || !response.body) return null;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let content = '';
    const consume = (frame: string) => {
      const data = frame.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('\n');
      if (!data || data === '[DONE]') return;
      try {
        const payload = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string; reasoning_content?: string; reasoning?: string } }> };
        const packetDelta = payload.choices?.[0]?.delta;
        const thinkingDelta = packetDelta?.reasoning_content ?? packetDelta?.reasoning;
        if (thinkingDelta) onProgress('AI 正在分析提交与资料依据', undefined, thinkingDelta);
        const delta = packetDelta?.content;
        if (delta) {
          content += delta;
          onProgress('AI 正在逐项核对资料依据与提交证据', content.length);
        }
      } catch { /* 忽略心跳帧 */ }
    };
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() ?? '';
      for (const frame of frames) consume(frame);
      if (done) break;
    }
    if (buffer.trim()) consume(buffer);
    content = content.trim();
    if (!content) return null;
    const parsed = JSON.parse(content.replace(/^```json\s*|\s*```$/g, '')) as {
      passed?: boolean; summary?: string; checks?: Array<{ label: string; passed: boolean }>; nextAction?: string; mode?: 'AI';
    };
    if (typeof parsed.passed !== 'boolean' || !parsed.summary || !parsed.nextAction) return null;
    return {
      passed: parsed.passed,
      summary: parsed.summary,
      checks: parsed.checks ?? [],
      nextAction: parsed.nextAction,
      mode: 'AI',
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abortFromCaller);
  }
}
