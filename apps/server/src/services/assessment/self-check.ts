function parseDeterministicResult(value: string | null | undefined) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as { passed?: boolean; output?: string };
    return { passed: parsed.passed === true, output: typeof parsed.output === 'string' ? parsed.output : '' };
  } catch { return null; }
}

const MAX_SELF_CHECK_JSON_CHARS = 16_000;
const MAX_SELF_CHECK_OUTPUT_CHARS = 12_000;

/** 将浏览器传来的结果收敛为有界的“不可信本地自检”，绝不把它升级为服务端回执。 */
export function sanitizeClientSelfCheck(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (value.length > MAX_SELF_CHECK_JSON_CHARS) throw new Error('本地 Worker 自检记录超过 16000 个字符上限。');
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object' || typeof parsed.passed !== 'boolean') return undefined;
    const output = typeof parsed.output === 'string' ? parsed.output.slice(0, MAX_SELF_CHECK_OUTPUT_CHARS) : '';
    const error = typeof parsed.error === 'string' ? parsed.error.slice(0, 2_000) : undefined;
    const runtimeMs = typeof parsed.runtimeMs === 'number' && Number.isFinite(parsed.runtimeMs)
      ? Math.max(0, Math.min(Math.round(parsed.runtimeMs), 60_000)) : undefined;
    const status = typeof parsed.status === 'string' && ['SUCCESS', 'ERROR', 'TIMEOUT'].includes(parsed.status)
      ? parsed.status : undefined;
    return JSON.stringify({
      kind: 'LOCAL_WORKER_SELF_CHECK_UNTRUSTED',
      passed: parsed.passed,
      output,
      ...(error ? { error } : {}),
      ...(runtimeMs !== undefined ? { runtimeMs } : {}),
      ...(status ? { status } : {}),
    });
  } catch {
    return undefined;
  }
}

/**
 * 自检只能证明“浏览器在当时运行了这些可见断言”。它不是隐藏测试，也不能代替
 * AI 基于逐题合同、代码和资料的语义评分。这里仅拒绝明显伪造或缺失的执行证据。
 */
export function validateCodingSelfCheckEvidence(
  answerContent: string,
  deterministicResult: string | null | undefined,
  testCases: Array<{ id: string }>,
) {
  const failures: string[] = [];
  const result = parseDeterministicResult(deterministicResult);
  if (!result?.passed) failures.push('未保存通过的浏览器自检执行结果');
  const output = result?.output ?? '';
  for (const test of testCases) {
    if (!output.includes(`[ASSERT PASS] ${test.id}`)) failures.push(`缺少 ${test.id} 的通过记录`);
  }
  if (/console\.(?:log|info|warn)\s*\(\s*(['"`])[^\n]*\[ASSERT PASS\][^\n]*\1\s*\)/i.test(answerContent)) {
    failures.push('代码直接打印 ASSERT PASS 标记，不能作为执行证据');
  }
  const codeWithoutComments = answerContent
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')
    .replace(/console\.assert\([\s\S]*?\);?/g, '')
    .replace(/console\.(?:log|info|warn)\([\s\S]*?\);?/g, '')
    .trim();
  if (!/(?:\bfunction\b|=>|\bclass\b|\bconst\s+\w+\s*=|\blet\s+\w+\s*=|\bvar\s+\w+\s*=)/.test(codeWithoutComments)) {
    failures.push('缺少可审阅的题干实现，不能只提交断言或标记');
  }
  for (const test of testCases) {
    const assertion = new RegExp(`console\\.assert\\(\\s*([^,]+),\\s*(['\"])${escapeRegExp(test.id)}\\2\\s*\\)`, 's').exec(answerContent);
    if (!assertion) {
      failures.push(`缺少 ${test.id} 的条件断言`);
      continue;
    }
    if (isObviousConstantTrue(assertion[1] ?? '')) failures.push(`${test.id} 使用无条件 true 断言`);
  }
  return { passed: failures.length === 0, failures };
}

function isObviousConstantTrue(expression: string) {
  return /^(?:true|!false|1\s*===\s*1|['"](?:true|ok|pass)['"]\s*===\s*['"](?:true|ok|pass)['"])\s*$/i.test(expression.trim());
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

type DeterministicContractFailure = {
  questionId: string;
  evidence: string;
  reason: string;
};

/**
 * 兼容旧导出，供历史结果展示/诊断使用。它只报告本地自检格式或可见断言缺失，
 * 不再被 gradeAssessment 当作服务端确定性失败，也不能推导 PASS。
 */
export function collectDeterministicContractFailures(
  questions: Array<{ id: string; questionContent: string }>,
  answers: Array<{ questionId: string; answerContent: string; deterministicResult: string | null }>,
): DeterministicContractFailure[] {
  const failures: DeterministicContractFailure[] = [];
  for (const question of questions) {
    const contract = parseQuestionContract(question.questionContent);
    if (!contract.deterministicRequired) continue;
    const answer = answers.find((item) => item.questionId === question.id);
    const validation = validateCodingSelfCheckEvidence(answer?.answerContent ?? '', answer?.deterministicResult, contract.testCases);
    if (!validation.passed) {
      const result = parseDeterministicEvidence(answer?.deterministicResult);
      failures.push({
        questionId: question.id,
        evidence: result.raw || '未提交浏览器隔离执行证据。',
        reason: `未经服务端认证的本地 Worker 自检记录不完整：${validation.failures.join('；')}。仅供 AI 复核上下文，不能单独决定结果。`,
      });
    }
  }
  return failures;
}

export function parseUntrustedLocalSelfCheck(value: string) {
  if (value.length > 16_000) return null;
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (parsed.kind !== 'LOCAL_WORKER_SELF_CHECK_UNTRUSTED' || typeof parsed.passed !== 'boolean') return null;
    return {
      passed: parsed.passed,
      output: typeof parsed.output === 'string' ? parsed.output.slice(0, 12_000) : '',
      error: typeof parsed.error === 'string' ? parsed.error.slice(0, 2_000) : undefined,
    };
  } catch { return null; }
}

function parseQuestionContract(content: string) {
  try {
    const parsed = JSON.parse(content) as {
      deterministicRequired?: boolean;
      selfCheckEvidenceRequired?: boolean;
      testCases?: Array<{ id?: string }>;
    };
    return {
      deterministicRequired: parsed.deterministicRequired === true || parsed.selfCheckEvidenceRequired === true,
      testCases: (parsed.testCases ?? []).filter((item): item is { id: string } => typeof item?.id === 'string' && item.id.length > 0),
    };
  } catch {
    return { deterministicRequired: false, testCases: [] as Array<{ id: string }> };
  }
}

function parseDeterministicEvidence(value: string | null | undefined) {
  if (!value) return { passed: false, output: '', raw: '' };
  try {
    const parsed = JSON.parse(value) as { passed?: boolean; output?: string; error?: string };
    return {
      passed: parsed.passed === true,
      output: typeof parsed.output === 'string' ? parsed.output : '',
      raw: typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed),
    };
  } catch {
    return { passed: false, output: '', raw: value };
  }
}

