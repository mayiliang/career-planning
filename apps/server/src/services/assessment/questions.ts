/** 按知识点合同构建题目；读取本地资料上下文，不写入数据库。 */
import { randomUUID } from 'node:crypto';
import type { CreateAssessmentRequest } from '@career-atlas/shared';
import type { KnowledgePointRecord, NewAssessmentQuestion } from '../../db/schema.js';
import {
  buildDerivationGuide, extractKnowledgeTags, extractLearningMaterialReferences,
  type DerivationGuide, type LearningMaterialReference,
} from '../learning-content.service.js';
import { extractLocalMaterialContext } from '../learning-material-context.service.js';

export type QuestionContent = {
  question?: string;
  prompt?: string;
  sourceHint?: string;
  sourceBasis?: string[];
  referenceAnswer?: string;
  code?: string;
  starterCode?: string;
  knowledgeTags?: string[];
  answerRequirements?: string[];
  answerFormat?: string;
  givenInput?: string;
  expectedOutput?: string;
  materialReferences?: LearningMaterialReference[];
  derivationGuide?: DerivationGuide;
  /** 严格考核 Markdown 中的原始题目合同；评分时不得被通用模板替换。 */
  contractSource?: 'FIRST_ASSESSMENT' | 'RETEST_VARIANT';
  contractQuestionNumber?: number;
  contractLabel?: string;
  profile?: string;
  artifactType?: 'explanation' | 'example' | 'code' | 'debug-report' | 'tool-evidence' | 'design-case';
  verificationEvidence?: string[];
  referenceDirection?: string;
  deductionRules?: string[];
  vetoRules?: string[];
  deterministicRequired?: boolean;
  /** 仅表示浏览器自检执行记录，不能单独证明代码语义正确。 */
  selfCheckEvidenceRequired?: boolean;
  executionEvidenceKind?: 'BROWSER_SELF_CHECK';
  testCases?: Array<{ id: string; input?: string; expectedOutput: string; isHidden: boolean }>;
  sourceQuestion?: string;
  stageContract?: string;
  retestVariant?: string;
  failureFixture?: string;
  verificationChecklist?: string[];
  vetoItems?: string[];
};

type FirstAssessmentQuestion = { number: 1 | 2 | 3 | 4 | 5; label: string; body: string };

const questionRules = {
  1: { maxScore: 10, dimension: 'principlesAndBoundaries' },
  2: { maxScore: 15, dimension: 'principlesAndBoundaries' },
  3: { maxScore: 35, dimension: 'practice' },
  4: { maxScore: 25, dimension: 'troubleshootingAndDesign' },
  5: { maxScore: 15, dimension: 'projectCommunication' },
} satisfies Record<FirstAssessmentQuestion['number'], Pick<NewAssessmentQuestion, 'maxScore' | 'dimension'>>;

export function buildAssessmentQuestions(
  sessionId: string,
  request: CreateAssessmentRequest,
  knowledgePoint: KnowledgePointRecord,
  now: string,
): NewAssessmentQuestion[] {
  const firstQuestions = extractFirstAssessmentQuestions(knowledgePoint.assessmentSpecMd);
  if (firstQuestions.length !== 5 || firstQuestions.some(question => !question.body)) {
    throw new Error(`${knowledgePoint.code} 的严格考核未提供完整的首考题 1–5，无法生成可审计的掌握挑战。`);
  }
  const retestVariant = extractRetestVariant(knowledgePoint.assessmentSpecMd);
  if (request.masteryStage === 4 && !retestVariant) {
    throw new Error(`${knowledgePoint.code} 尚未配置“复测变式”；M4 不会伪造通用变式，请先补充本点变式合同。`);
  }

  const context = `${knowledgePoint.code} ${knowledgePoint.title}`;
  const studySource = compactMarkdown(knowledgePoint.studyMaterialMd, 1600);
  const passCriteria = compactMarkdown(knowledgePoint.passCriteriaMd, 1200);
  const knowledgeTags = extractKnowledgeTags(knowledgePoint.title);
  const materialReferences = extractLearningMaterialReferences(knowledgePoint.studyMaterialMd, knowledgePoint.title);
  const localMaterialContext = extractLocalMaterialContext(knowledgePoint.studyMaterialMd)
    .map((item) => `【${item.title}｜${item.source}】\n${item.content}`);
  const directGuide = buildDerivationGuide(knowledgePoint.title, materialReferences, false);
  const profile = resolveChallengeProfile(request.challengeProfile, request.challengeMode, firstQuestions[2]!.body);
  const stageContract = buildStageContract(request.masteryStage, retestVariant);
  return firstQuestions.map((source, index) => {
    const sourceQuestion = `首考题 ${source.number}（${source.label}）`;
    const isPractice = source.number === 3;
    const artifact = artifactForQuestion(source.number, profile);
    const coding = isPractice && artifact === 'code';
    const contract = buildQuestionContract({
      source, context, stageContract, retestVariant, materialReferences, passCriteria, coding,
    });
    const effectiveContract = request.masteryStage === 4
      ? buildM4VariantContract(source, retestVariant!, contract)
      : contract;
    return {
      id: randomUUID(),
      sessionId,
      questionType: questionTypeForContract(artifact),
      ...questionRules[source.number],
      orderIndex: index,
      createdAt: now,
      questionContent: JSON.stringify({
        level: source.label,
        question: effectiveContract.question,
        prompt: effectiveContract.question,
        sourceQuestion,
        stageContract,
        retestVariant: request.masteryStage === 4 ? retestVariant : undefined,
        failureFixture: effectiveContract.failureFixture,
        verificationChecklist: effectiveContract.verificationChecklist,
        vetoItems: effectiveContract.vetoItems,
        contractSource: request.masteryStage === 4 ? 'RETEST_VARIANT' : 'FIRST_ASSESSMENT',
        contractQuestionNumber: source.number,
        contractLabel: source.label,
        profile,
        artifactType: artifact,
        knowledgeTags,
        givenInput: effectiveContract.givenInput,
        expectedOutput: effectiveContract.expectedOutput,
        answerRequirements: effectiveContract.answerRequirements,
        answerFormat: effectiveContract.answerFormat,
        materialReferences,
        derivationGuide: source.number === 1 || request.masteryStage <= 2 ? directGuide : buildDerivationGuide(knowledgePoint.title, materialReferences, true),
        sourceHint: effectiveContract.sourceHint,
        sourceBasis: [source.body, passCriteria, studySource, ...localMaterialContext],
        referenceAnswer: effectiveContract.referenceDirection,
        referenceDirection: effectiveContract.referenceDirection,
        verificationEvidence: effectiveContract.verificationChecklist,
        deductionRules: effectiveContract.deductionRules,
        vetoRules: effectiveContract.vetoItems,
        deterministicRequired: coding,
        selfCheckEvidenceRequired: coding,
        executionEvidenceKind: coding ? 'BROWSER_SELF_CHECK' : undefined,
        language: coding ? 'typescript' : undefined,
        starterCode: coding ? buildBrowserAssertionStarter(effectiveContract.testCases) : undefined,
        testCases: coding ? effectiveContract.testCases : undefined,
        wordLimit: source.number === 5 ? 520 : undefined,
      }),
    };
  });
}

/** 解析知识库唯一权威的“五段式首考”文本，绝不以共享模板重写题干。 */
export function extractFirstAssessmentQuestions(spec: string): FirstAssessmentQuestion[] {
  const questions: FirstAssessmentQuestion[] = [];
  // 不假设各领域都用同一种分号、括号或换行写法；先按题号切段，再解析段首。
  const starts = [...spec.matchAll(/首考题\s*[1-5](?:\s*[（(]|\s*[:：])/g)];
  for (const [index, start] of starts.entries()) {
    const segment = spec.slice(start.index, starts[index + 1]?.index ?? spec.length);
    const match = /^首考题\s*([1-5])(?:\s*[（(]([^）)]+)[）)])?\s*[:：]\s*/.exec(segment);
    if (!match) continue;
    const number = Number(match[1]);
    if (number < 1 || number > 5 || questions.some((item) => item.number === number)) continue;
    questions.push({
      number: number as FirstAssessmentQuestion['number'],
      label: match[2]?.trim() || ['资料定位', '机制解释', '最小产出', '受限排错', '学习复述'][number - 1]!,
      body: segment.slice(match[0].length)
        .replace(/；\s*复测变式\s*[:：][\s\S]*$/, '')
        .replace(/。?\s*命题边界\s*[:：][\s\S]*$/, '')
        .trim(),
    });
  }
  return questions.sort((a, b) => a.number - b.number);
}

export function extractRetestVariant(spec: string): string | undefined {
  const match = spec.match(/(?:复测变式|M4\s*变式)\s*[:：]\s*([\s\S]*?)(?=。?\s*命题边界\s*[:：]|\n\s*-\s*(?:通过标准|预计耗时)|$)/);
  return match?.[1]?.trim() || undefined;
}

function buildStageContract(stage: number, variant?: string): string {
  if (stage === 1) return 'M1 理解：按首考合同完成；最多可请求“提纲”级帮助（等级 4），认证上限为 M1。';
  if (stage === 2) return 'M2 引导应用：按首考合同完成；最多可请求“提示”级帮助（等级 2），认证上限为 M2。';
  if (stage === 3) return 'M3 独立掌握：按首考合同独立完成，不提供题目帮助；缺少独立证据不得认证 M3。';
  return `M4 稳定掌握：独立完成该点已配置的延迟复测变式，不提供题目帮助。变式：${variant}`;
}

function resolveChallengeProfile(profile: CreateAssessmentRequest['challengeProfile'], mode: CreateAssessmentRequest['challengeMode'], practice: string) {
  if (profile !== 'AUTO' && profile !== 'CODING') return profile;
  if (profile === 'CODING' && isCodingContract(practice)) return 'CODING';
  if (/调试|排错|故障|异常|根因/.test(practice)) return 'DEBUGGING';
  if (/配置|部署|DevTools|Lighthouse|Playwright|监控|日志|审计|测试矩阵|工具/.test(practice)) return 'TOOL_OPERATION';
  if (/设计|方案|架构|策略|矩阵|流程|报告|图|预注册/.test(practice)) return 'DESIGN_CASE';
  if (isCodingContract(practice) && mode !== 'THEORY') return 'CODING';
  return mode === 'THEORY' ? 'THEORY_ONLY' : 'EXAMPLE_DRIVEN';
}

function isCodingContract(value: string) {
  return /(?:实现|编写|重构|函数|组件|模块|脚本|代码|TypeScript|JavaScript|CSS|HTML|算法|接口)/i.test(value)
    && !/^(?:建立|设计|制定).{0,18}(?:方案|策略|矩阵|流程|报告|清单)/.test(value);
}

function artifactForQuestion(number: number, profile: string): NonNullable<QuestionContent['artifactType']> {
  if (number === 1 || number === 2 || number === 5) return 'explanation';
  if (number === 4 || profile === 'DEBUGGING') return 'debug-report';
  if (profile === 'CODING') return 'code';
  if (profile === 'TOOL_OPERATION') return 'tool-evidence';
  if (profile === 'DESIGN_CASE') return 'design-case';
  return 'example';
}

function questionTypeForContract(artifact: NonNullable<QuestionContent['artifactType']>): NewAssessmentQuestion['questionType'] {
  if (artifact === 'code') return 'CODE_WRITE';
  if (artifact === 'tool-evidence') return 'OUTPUT';
  return 'ESSAY';
}

function buildQuestionContract(input: {
  source: FirstAssessmentQuestion; context: string;
  stageContract: string; retestVariant?: string; materialReferences: LearningMaterialReference[]; passCriteria: string;
  coding: boolean;
}) {
  const { source, context, materialReferences, stageContract, retestVariant, coding, passCriteria } = input;
  const materialText = materialReferences.map((item) => `《${item.title}》`).join('、') || '本知识点列出的学习资料';
  const failureFixture = source.number === 4
    ? `仅使用首考题 3 的产出；异常必须来自题干指定或该产出的一个可复现失败条件：${source.body}`
    : undefined;
  const verificationChecklist = source.number === 1
    ? ['逐项给出资料名称和章节/关键词定位', '每项资料定位均支撑题干中的定义、机制或边界']
    : source.number === 3
      ? ['固定输入已写明', '实际产出与题干要求可逐项对应', '预期与实际结果或操作证据可复核', '明确资料机制、边界与验证结论']
      : source.number === 4
        ? ['固定正常/异常条件以及预期和实际', '每条假设有可证伪验证动作与证据', '修复后有回归验证']
        : ['回答覆盖原题全部问题', '含适用边界或反例', '结论可回溯到本点资料定位'];
  const vetoItems = [
    '用资料外的框架、经验或泛化模板替代原题要求。',
    ...(coding ? ['以自行打印断言标记、无条件断言或空壳代码冒充实现。代码语义仍由逐题合同与 AI 复核。'] : []),
    ...(source.number === 4 ? ['没有异常复现、证伪证据或回归验证。'] : []),
  ];
  const testCases = coding ? [
    { id: 'contract-normal', input: `首考题 3 的固定场景：${source.body}`, expectedOutput: '[ASSERT PASS] contract-normal', isHidden: false },
    { id: 'contract-boundary', input: `首考题 3 或通过标准的边界场景：${passCriteria}`, expectedOutput: '[ASSERT PASS] contract-boundary', isHidden: false },
  ] : [];
  const retestPrefix = retestVariant ? `\n\n本次 M4 变式合同：${retestVariant}` : '';
  return {
    question: `${source.body}\n\n【本次挑战合同】知识点：${context}。${stageContract}${retestPrefix}\n只能使用：${materialText}。请保留给定输入、必须输出、资料定位、验证证据和边界说明；不得以泛化题替代本题。`,
    givenInput: `原题给定条件：${source.body}\n可用资料：${materialText}。`,
    expectedOutput: `完成原始${source.number}号首考题规定的交付物；同时提交可复核验证证据。`,
    answerRequirements: ['逐项完成原始首考题题干', '保留题干给定输入与限制', '提交题干要求的产出或结论', '给出资料名称与具体定位', '提交验证证据及边界说明'],
    answerFormat: '## 原题要求逐项回应\n## 给定输入与限制\n## 必须输出 / 实际产出\n## 验证证据\n## 资料依据与定位\n## 边界、扣分点与否决项',
    sourceHint: `本题直接来自${source.number}号首考题。先按题干中的资料范围定位：${materialText}。`,
    referenceDirection: `评分仅核对原题「${source.label}」的要求：${source.body}\n通过标准：${passCriteria}`,
    verificationChecklist,
    deductionRules: ['遗漏题干的给定输入、必须输出、资料定位或验证证据时逐项扣分。', '把本点题干改写成泛化题、扩展到资料外要求时不计相关得分。'],
    vetoItems,
    failureFixture,
    testCases,
  };
}

/**
 * M4 的主体是延迟复测变式。五题分别验证定位、机制不变量、实施、排错和迁移；
 * sourceQuestion 仍保留在持久化内容中，便于审计，但不会要求用户重做旧题。
 */
function buildM4VariantContract(
  source: FirstAssessmentQuestion,
  variant: string,
  base: ReturnType<typeof buildQuestionContract>,
) {
  type VariantRole = { task: string; input: string; output: string; format: string; boundary?: string; failure?: string };
  const trace = `原题能力追溯：首考题 ${source.number}（${source.label}），仅用于追溯，不得重做原题。`;
  const shared = `复测变式依据：${variant}`;
  const roles: VariantRole[] = [
    {
      task: `定位两条直接支持复测变式差异的资料位置，并说明各自证明的条件差异。${shared} ${trace}`,
      input: `${shared}\n只定位本知识点资料中直接解释变式差异的两处内容。`,
      output: '两条精确资料定位、各自对应的变式条件，以及一条不可替代性说明。',
      format: '## 变式差异\n## 证据定位 1\n## 证据定位 2\n## 不可替代性与边界',
    },
    {
      task: `解释复测变式下仍成立的一项核心机制与变化后的边界，并给出一个不能沿用首考结论的反例。${shared} ${trace}`,
      input: `${shared}\n按“机制不变量 → 变式条件 → 新边界”组织答案。`,
      output: '机制不变量、变化条件、新边界与可观察反例的因果链。',
      format: '## 机制不变量\n## 变式条件\n## 新边界与反例\n## 因果链',
    },
    {
      task: `针对复测变式完成最小实现或操作产出，并在固定输入和边界输入下各验证一次。${shared} ${trace}`,
      input: `${shared}\n固定输入：只实现使变式成立所需的最小函数、配置、组件状态或操作步骤。`,
      boundary: `${shared}\n边界输入：故意移除、反转或延后变式中的一个关键条件。`,
      output: '变式最小产出、固定输入结果、边界输入结果及两者差异解释。',
      format: '## 变式最小产出\n## 固定输入与结果\n## 边界输入与结果\n## 结果解释',
    },
    {
      task: `在复测变式中复现受限失败；列出不超过三条假设并逐条证伪，最小修复后以同一变式回归。${shared} ${trace}`,
      input: `${shared}\n故障夹具：故意遗漏、反转或延后变式中的一个关键条件。`,
      output: '失败复现、最多三条假设和证伪证据、最小修复、同一变式回归结果。',
      format: '## 失败复现\n## 假设与证伪\n## 最小修复\n## 变式回归',
      failure: `M4 变式故障夹具：采用“${variant}”后，故意遗漏、反转或延后一个关键条件；不得改用首考故障。`,
    },
    {
      task: `把复测变式写成给下一位实现者的迁移说明：什么可迁移、什么不可迁移，以及如何用一个可观察信号验证。${shared} ${trace}`,
      input: `${shared}\n交接对象只知道首考结论，尚未看到本次变式。`,
      output: '变式摘要、迁移与不迁移清单、验证信号和反向检查。',
      format: '## 变式摘要\n## 可迁移 / 不可迁移\n## 验证信号\n## 反向检查',
    },
  ];
  const role = roles[source.number - 1]!;
  const testCases = source.number === 3
    ? base.testCases.map((test, index) => ({
      ...test,
      input: index === 0 ? role.input : (role.boundary ?? `${shared}\n边界输入：反转一个关键条件。`),
    }))
    : base.testCases;
  return {
    ...base,
    question: `${role.task}\n\n【M4 变式挑战合同】本题以变式为主任务，不要求重做首考题。`,
    givenInput: role.input,
    expectedOutput: role.output,
    answerRequirements: ['只完成本题的变式动作，不复写首考作答', '保留变式给定输入与限制', '提交可复核的实际产出或结论', '给出资料定位与验证证据', '说明变式的适用边界'],
    answerFormat: role.format,
    sourceHint: `${shared}；本题仅验证变式动作，不提供首考题答案。`,
    referenceDirection: `评分以本题 M4 变式交付为准。${trace}\n${shared}`,
    failureFixture: role.failure ?? base.failureFixture,
    verificationChecklist: [
      ...base.verificationChecklist,
      '实际输出必须针对本题变式，且能与首考题干区分',
    ],
    testCases,
  };
}

function buildBrowserAssertionStarter(testCases: Array<{ id: string; input?: string; expectedOutput: string; isHidden: boolean }>) {
  const assertions = testCases.map((test) => `// ${test.id}：把题干固定输入的实际结果与预期结果进行比较。\n// 浏览器执行器会在断言通过后记录 ${test.expectedOutput}；不要自行打印该标记。\nconsole.assert(/* TODO: 真实条件表达式，例如 observed === expected */ false, '${test.id}');`).join('\n\n');
  return `// 浏览器自检执行证据，不是安全沙箱，也不能单独证明实现正确。\n// 请完成题干要求的最小实现，再以真实条件断言固定场景和边界场景。\n// 不得删除、改名或用无条件 true 替代断言；不得自行打印 [ASSERT PASS] 标记。\n\n// TODO: 在这里实现题干要求的最小代码（函数、状态、配置或转换逻辑）\n\n${assertions}\n`;
}

function compactMarkdown(value: string, maxLength: number): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1（$2）')
    .trim()
    .slice(0, maxLength);
}

