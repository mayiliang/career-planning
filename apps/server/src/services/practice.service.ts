import { randomUUID } from 'node:crypto';
import { rawDb } from '../db/index.js';
import { aiThinkingRequestOption, config } from '../config/index.js';
import { getKnowledgePointByCode } from './knowledge.service.js';
import { PRACTICE_SECTION_HEADINGS, type PracticeProfile } from './learning-content.service.js';
import { extractLocalMaterialContext } from './learning-material-context.service.js';

export interface PracticeAttemptInput {
  submissionMd: string;
  code?: string;
  language?: 'javascript' | 'typescript';
  executionOutput?: string;
  executionStatus?: 'NOT_RUN' | 'SUCCESS' | 'ERROR' | 'TIMEOUT';
}

export type PracticeReview = {
  passed: boolean;
  summary: string;
  checks: Array<{ label: string; passed: boolean }>;
  nextAction: string;
  mode: 'AI' | 'RULE';
  validationLevel: 'STRUCTURE_ONLY' | 'SEMANTIC';
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
  assertStrictPracticeId(activityId);
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
  const localChecks = buildLocalContractChecks(activity, input, point.challengeProfile as PracticeProfile);
  const locallyReady = localChecks.every((item) => item.passed);
  onProgress(locallyReady ? '本地必备项已通过，正在依据学习资料进行 AI 核对' : '本地必备项尚未齐全，正在生成明确的补充要求');
  let review: PracticeReview | null = locallyReady ? await requestAiPracticeReview(point, activity, input, onProgress, signal) : null;
  if (!review) {
    review = {
      passed: locallyReady,
      summary: locallyReady
        ? '已完成站内练习合同的确定性结构核验；未配置 AI 时，本结论不表示语义或技术方案已被判定正确。'
        : '提交尚未满足可确定的练习合同；请逐项补齐未通过的固定栏目、输入/预期/实际或验证证据。',
      checks: localChecks,
      nextAction: locallyReady ? '可保留为结构完整的练习证据；需要语义正确性判断时，请在可用 AI 下再次验证或参加严格考核。' : '根据红色检查项补充后再次验证。',
      mode: 'RULE' as const,
      validationLevel: 'STRUCTURE_ONLY' as const,
    };
  }
  const merged = {
    ...review,
    passed: locallyReady && review.passed,
    checks: mergePracticeChecks(localChecks, review.checks ?? []),
    mode: review.mode ?? 'AI',
    validationLevel: review.mode === 'AI' ? 'SEMANTIC' as const : 'STRUCTURE_ONLY' as const,
  };
  const now = new Date().toISOString();
  rawDb.prepare(`UPDATE learning_practice_attempts SET validation_json = ?, status = ?, updated_at = ? WHERE id = ?`)
    .run(JSON.stringify(merged), merged.passed ? 'COMPLETED' : 'DRAFT', now, saved.id);
  onProgress('验证结论已完成并保存');
  return getPracticeAttempt(code, activityId);
}

function assertStrictPracticeId(activityId: string) {
  if (activityId !== 'strict-practice') {
    throw new Error('每个知识点只有“strict-practice”这一项可提交练习；阅读和历史模板不可提交。');
  }
}

type WorkspaceActivity = NonNullable<NonNullable<Awaited<ReturnType<typeof getKnowledgePointByCode>>>['learningActivities'][number]>;

function buildLocalContractChecks(activity: WorkspaceActivity, input: PracticeAttemptInput, profile: PracticeProfile) {
  const headings = PRACTICE_SECTION_HEADINGS[profile];
  const markdown = input.submissionMd.replace(/\r\n/g, '\n');
  const checks = [
    { label: '首考题 3 原文已绑定到任务', passed: activity.task.trim().length > 0 && activity.input.includes(activity.task) },
    { label: '首考题 4 受限排错原文已绑定到任务', passed: Boolean(activity.failureFixture?.trim()) && activity.input.includes(activity.failureFixture ?? '') },
    ...headings.map((heading, index) => ({
      label: `已填写固定栏目：${heading}`,
      passed: hasFilledHeading(markdown, heading, headings[index + 1]),
    })),
    { label: '固定输入、预期、实际和验证证据均已保留', passed: /# (?:固定输入|固定输入与约束|固定场景与约束)/.test(markdown)
      && /# (?:预期(?:结论|结果|输出)|固定输入与预期|预期与实际结果)/.test(markdown)
      && /# (?:实际(?:结论|结果|输出|现象)|预期与实际结果)/.test(markdown)
      && /# (?:验证证据|回归验证证据)/.test(markdown) },
  ];
  if (activity.workspaceMode === 'CODE') {
    const source = input.code ?? '';
    checks.push(
      { label: '代码保留 fixedInput、expected 与 actual', passed: /\bfixedInput\b/.test(source) && /\bexpected\b/.test(source) && /\bactual\b/.test(source) },
      { label: '代码包含针对具体预期的断言', passed: /console\.assert\s*\(/.test(source) && !/expectedOutput\s*=\s*.*PASS|CONTROLLED/.test(source) },
      { label: '脚本已在站内执行成功', passed: input.executionStatus === 'SUCCESS' },
      { label: '执行输出保留固定输入、预期和实际值', passed: /fixedInput|input/.test(input.executionOutput ?? '') && /expected/.test(input.executionOutput ?? '') && /actual/.test(input.executionOutput ?? '') },
    );
  }
  return checks;
}

function hasFilledHeading(markdown: string, heading: string, nextHeading?: string) {
  const start = markdown.indexOf(`# ${heading}`);
  if (start < 0) return false;
  const bodyStart = start + heading.length + 2;
  const end = nextHeading ? markdown.indexOf(`# ${nextHeading}`, bodyStart) : markdown.length;
  const body = markdown.slice(bodyStart, end < 0 ? markdown.length : end).trim();
  return body.length >= 8 && !/^(?:TODO|待填写|填写|待补充|暂无|n\/a)[。.!！\s]*$/i.test(body);
}

/** 同名项以本地门禁为准；AI 不得用同名的“通过”结论覆盖本地失败。 */
export function mergePracticeChecks(
  localChecks: Array<{ label: string; passed: boolean }>,
  reviewChecks: Array<{ label: string; passed: boolean }>,
) {
  const merged = new Map<string, { label: string; passed: boolean }>();
  for (const check of localChecks) merged.set(check.label, check);
  for (const check of reviewChecks) if (!merged.has(check.label)) merged.set(check.label, check);
  return [...merged.values()];
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
            // 外部链接只提供元数据；本地中文讲义的已链接章节正文才是 AI 的可核验依据。
            materialContext: extractLocalMaterialContext(point.studyMaterialMd),
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
      validationLevel: 'SEMANTIC',
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abortFromCaller);
  }
}
