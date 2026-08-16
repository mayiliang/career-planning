/**
 * 知识点服务
 * 
 * Phase 2 实现：
 * - 知识点列表查询（支持筛选）
 * - 知识点详情查询
 * - 摘要更新
 * - 自评掌握命令（状态机）
 */
import { eq, and, like, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { db, rawDb } from '../db/index.js';
import { knowledgePoints, knowledgeDomains, masteryEvents } from '../db/schema.js';
import type { KnowledgeStatus } from '@career-atlas/shared';
import { KNOWLEDGE_ROUTE_INDEX } from './knowledge-relations.service.js';
import { inferChallengeProfile, savePointNote } from './learning.service.js';
import {
  extractLearningMaterialReferences,
  extractStrictAssessmentTasks,
  practiceEvidenceRequirements,
  practiceSubmissionTemplate,
  type PracticeProfile,
  type LearningMaterialReference,
} from './learning-content.service.js';

// ===== 查询参数 Schema =====
export const KnowledgeListQuerySchema = z.object({
  domainId: z.string().optional(), // 领域 ID
  status: z.enum(['NOT_STARTED', 'LEARNING', 'SELF_MASTERED', 'FIRST_PASS_PENDING_RETEST', 'MASTERED', 'NEEDS_RELEARNING']).optional(),
  capabilityLayer: z.enum(['CORE', 'APPLICATION', 'SPECIALTY', 'LEADERSHIP']).optional(),
  requirementLevel: z.enum(['REQUIRED', 'TRACK_REQUIRED', 'ELECTIVE']).optional(),
  maturity: z.enum(['STABLE', 'EVOLVING', 'EXPERIMENTAL']).optional(),
  aiRelation: z.enum(['NONE', 'AI_ASSISTED', 'AI_NATIVE', 'AGENTIC']).optional(),
  portability: z.enum(['PORTABLE', 'FRAMEWORK_SPECIFIC', 'VENDOR_SPECIFIC', 'PLATFORM_SPECIFIC', 'JURISDICTION_SPECIFIC']).optional(),
  secondaryTopic: z.string().optional(),
  trackId: z.enum(['react', 'vue', 'umi-antd', 'agent-mcp']).optional(),
  topicTag: z.enum(['component-platform', 'api-engineering', 'tooling', 'platform-engineering', 'realtime-ai', 'ai-tooling', 'engineering-leadership', 'web-platform', 'accessibility', 'security-privacy', 'performance-mobile', 'media', 'runtime-cross-platform', 'node-bff', 'data-realtime', 'browser-ai', 'graphics-viz', 'growth-content-i18n', 'deployment', 'visual-testing']).optional(),
  search: z.string().optional(), // 搜索关键词（标题、code）
});

export type KnowledgeListQuery = z.infer<typeof KnowledgeListQuerySchema>;

// ===== 响应类型 =====
export interface KnowledgePointListItem {
  id: string;
  code: string;
  title: string;
  secondaryTopic: string;
  topicOrder: number;
  difficulty: string;
  capabilityLayer: 'CORE' | 'APPLICATION' | 'SPECIALTY' | 'LEADERSHIP';
  requirementLevel: 'REQUIRED' | 'TRACK_REQUIRED' | 'ELECTIVE';
  maturity: 'STABLE' | 'EVOLVING' | 'EXPERIMENTAL';
  aiRelation: 'NONE' | 'AI_ASSISTED' | 'AI_NATIVE' | 'AGENTIC';
  portability: 'PORTABLE' | 'FRAMEWORK_SPECIFIC' | 'VENDOR_SPECIFIC' | 'PLATFORM_SPECIFIC' | 'JURISDICTION_SPECIFIC';
  applicabilityTags: string[];
  topicTags: string[];
  trackIds: string[];
  verifiedAt: string;
  fallbackStrategy: string;
  planWeek: number | null;
  status: KnowledgeStatus;
  learningState: 'NOT_STARTED' | 'LEARNING' | 'LEARNED' | 'DEFERRED';
  masteryLevel: number;
  learnedAt: string | null;
  deferredAt: string | null;
  deferReason: string | null;
  currentFocus: boolean;
  domainId: string;
  domainCode: string;
  domainTitle: string;
  selfMasteredAt: string | null;
  firstPassedAt: string | null;
  masteredAt: string | null;
  routeOrder: number;
  studyMinutes: number;
  practiceMinutes: number;
  projectMinutes: number;
  assessmentMinutes: number;
  retestMinutes: number;
  estimatedTotalMinutes: number;
  challengeProfile: ReturnType<typeof inferChallengeProfile>;
}

export interface KnowledgeRecommendation {
  action: 'LEARN' | 'CONTINUE' | 'ASSESS' | 'RETEST' | 'RELEARN' | 'COMPLETE';
  readiness: 'READY' | 'BLOCKED' | 'COMPLETE';
  reason: string;
  point: KnowledgePointListItem | null;
  blockers: Array<{ code: string; title: string; status: KnowledgeStatus }>;
  prerequisiteProgress: { mastered: number; total: number };
  routePosition: { week: number; index: number; total: number } | null;
}

export interface KnowledgePointDetail extends KnowledgePointListItem {
  summary: string | null;
  studyMaterialMd: string;
  assessmentSpecMd: string;
  passCriteriaMd: string;
  createdAt: string;
  updatedAt: string;
  estimatedCoreMinutes: number;
  learningActivities: LearningActivity[];
}

export interface LearningActivity {
  id: string;
  type: 'READING' | 'GUIDED_PRACTICE' | 'APPLICATION' | 'CASE_STUDY';
  label: string;
  minutes: number;
  optional: boolean;
  task: string;
  input: string;
  outputRequirements: string[];
  completionCriteria: string[];
  deliveryMode: 'READ_ONLY' | 'WORKSPACE';
  workspaceMode: 'TEXT' | 'CODE' | null;
  language: 'javascript' | 'typescript' | null;
  starterCode: string | null;
  submissionTemplate: string | null;
  materialReferences: LearningMaterialReference[];
  /** 首考题 4 原文：不能用泛化的异常模板替换。 */
  failureFixture: string | null;
  /** 本地可确定检查的项目；语义是否正确由 AI 或严格考核判断。 */
  verificationChecklist: string[];
  vetoItems: string[];
}

// ===== 服务函数 =====

/**
 * 获取知识点列表（支持筛选）
 */
export async function getKnowledgePoints(query: KnowledgeListQuery): Promise<{
  items: KnowledgePointListItem[];
  total: number;
}> {
  // 构建筛选条件
  const conditions = [];
  
  if (query.domainId) {
    conditions.push(eq(knowledgePoints.domainId, query.domainId));
  }
  
  if (query.status) {
    conditions.push(eq(knowledgePoints.status, query.status));
  }

  if (query.capabilityLayer) {
    conditions.push(eq(knowledgePoints.capabilityLayer, query.capabilityLayer));
  }

  if (query.requirementLevel) {
    conditions.push(eq(knowledgePoints.requirementLevel, query.requirementLevel));
  }

  if (query.maturity) {
    conditions.push(eq(knowledgePoints.maturity, query.maturity));
  }

  if (query.aiRelation) {
    conditions.push(eq(knowledgePoints.aiRelation, query.aiRelation));
  }

  if (query.portability) {
    conditions.push(eq(knowledgePoints.portability, query.portability));
  }

  if (query.secondaryTopic) {
    conditions.push(eq(knowledgePoints.secondaryTopic, query.secondaryTopic));
  }

  if (query.trackId) {
    conditions.push(like(knowledgePoints.trackIds, `%"${query.trackId}"%`));
  }

  if (query.topicTag) {
    conditions.push(like(knowledgePoints.topicTags, `%"${query.topicTag}"%`));
  }
  
  // 搜索条件（标题或 code）
  if (query.search) {
    const searchPattern = `%${query.search}%`;
    conditions.push(
      or(
        like(knowledgePoints.title, searchPattern),
        like(knowledgePoints.code, searchPattern),
        like(knowledgePoints.secondaryTopic, searchPattern)
      )
    );
  }
  
  // 查询知识点列表（关联领域）
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  
  const rows = await db
    .select({
      id: knowledgePoints.id,
      code: knowledgePoints.code,
      title: knowledgePoints.title,
      secondaryTopic: knowledgePoints.secondaryTopic,
      topicOrder: knowledgePoints.topicOrder,
      difficulty: knowledgePoints.difficulty,
      capabilityLayer: knowledgePoints.capabilityLayer,
      requirementLevel: knowledgePoints.requirementLevel,
      maturity: knowledgePoints.maturity,
      aiRelation: knowledgePoints.aiRelation,
      portability: knowledgePoints.portability,
      applicabilityTags: knowledgePoints.applicabilityTags,
      topicTags: knowledgePoints.topicTags,
      trackIds: knowledgePoints.trackIds,
      verifiedAt: knowledgePoints.verifiedAt,
      fallbackStrategy: knowledgePoints.fallbackStrategy,
      planWeek: knowledgePoints.planWeek,
      status: knowledgePoints.status,
      learningState: knowledgePoints.learningState,
      masteryLevel: knowledgePoints.masteryLevel,
      learnedAt: knowledgePoints.learnedAt,
      deferredAt: knowledgePoints.deferredAt,
      deferReason: knowledgePoints.deferReason,
      currentFocus: knowledgePoints.currentFocus,
      domainId: knowledgePoints.domainId,
      domainCode: knowledgeDomains.code,
      domainTitle: knowledgeDomains.title,
      selfMasteredAt: knowledgePoints.selfMasteredAt,
      firstPassedAt: knowledgePoints.firstPassedAt,
      masteredAt: knowledgePoints.masteredAt,
      studyMinutes: knowledgePoints.studyMinutes,
      practiceMinutes: knowledgePoints.practiceMinutes,
      projectMinutes: knowledgePoints.projectMinutes,
      assessmentMinutes: knowledgePoints.assessmentMinutes,
      retestMinutes: knowledgePoints.retestMinutes,
      assessmentSpecMd: knowledgePoints.assessmentSpecMd,
    })
    .from(knowledgePoints)
    .innerJoin(knowledgeDomains, eq(knowledgePoints.domainId, knowledgeDomains.id))
    .where(whereClause)
    .orderBy(knowledgeDomains.orderIndex, knowledgePoints.code);

  // 清单默认沿推荐学习路径排列，避免字母序把 Agent 等后置能力提前展示。
  const items = rows.map(({ assessmentSpecMd, ...item }) => {
    const route = KNOWLEDGE_ROUTE_INDEX.get(item.code);
    const challengeProfile = inferChallengeProfile(item.code, item.title, item.domainTitle, assessmentSpecMd);
    return {
      ...item,
      planWeek: route?.week ?? item.planWeek,
      routeOrder: route?.order ?? Number.MAX_SAFE_INTEGER,
      // 掌握挑战完全可选，不计入路线的学习投入；纯理论知识也不再虚构项目时间。
      estimatedTotalMinutes: visibleLearningMinutes(item, challengeProfile),
      challengeProfile,
    };
  }).sort((left, right) => left.routeOrder - right.routeOrder || left.code.localeCompare(right.code));
  
  // 统计总数
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(knowledgePoints)
    .where(whereClause);
  
  const total = countResult[0]?.count || 0;
  
  return { items, total };
}

/**
 * 获取知识点详情
 */
export async function getKnowledgePointByCode(code: string): Promise<KnowledgePointDetail | null> {
  const results = await db
    .select({
      id: knowledgePoints.id,
      code: knowledgePoints.code,
      title: knowledgePoints.title,
      secondaryTopic: knowledgePoints.secondaryTopic,
      topicOrder: knowledgePoints.topicOrder,
      summary: knowledgePoints.summary,
      studyMaterialMd: knowledgePoints.studyMaterialMd,
      assessmentSpecMd: knowledgePoints.assessmentSpecMd,
      passCriteriaMd: knowledgePoints.passCriteriaMd,
      difficulty: knowledgePoints.difficulty,
      capabilityLayer: knowledgePoints.capabilityLayer,
      requirementLevel: knowledgePoints.requirementLevel,
      maturity: knowledgePoints.maturity,
      aiRelation: knowledgePoints.aiRelation,
      portability: knowledgePoints.portability,
      applicabilityTags: knowledgePoints.applicabilityTags,
      topicTags: knowledgePoints.topicTags,
      trackIds: knowledgePoints.trackIds,
      verifiedAt: knowledgePoints.verifiedAt,
      fallbackStrategy: knowledgePoints.fallbackStrategy,
      planWeek: knowledgePoints.planWeek,
      status: knowledgePoints.status,
      learningState: knowledgePoints.learningState,
      masteryLevel: knowledgePoints.masteryLevel,
      learnedAt: knowledgePoints.learnedAt,
      deferredAt: knowledgePoints.deferredAt,
      deferReason: knowledgePoints.deferReason,
      currentFocus: knowledgePoints.currentFocus,
      domainId: knowledgePoints.domainId,
      domainCode: knowledgeDomains.code,
      domainTitle: knowledgeDomains.title,
      selfMasteredAt: knowledgePoints.selfMasteredAt,
      firstPassedAt: knowledgePoints.firstPassedAt,
      masteredAt: knowledgePoints.masteredAt,
      createdAt: knowledgePoints.createdAt,
      updatedAt: knowledgePoints.updatedAt,
      studyMinutes: knowledgePoints.studyMinutes,
      practiceMinutes: knowledgePoints.practiceMinutes,
      projectMinutes: knowledgePoints.projectMinutes,
      assessmentMinutes: knowledgePoints.assessmentMinutes,
      retestMinutes: knowledgePoints.retestMinutes,
    })
    .from(knowledgePoints)
    .innerJoin(knowledgeDomains, eq(knowledgePoints.domainId, knowledgeDomains.id))
    .where(eq(knowledgePoints.code, code))
    .limit(1);
  
  const result = results[0];
  if (!result) return null;
  const route = KNOWLEDGE_ROUTE_INDEX.get(result.code);
  const challengeProfile = inferChallengeProfile(result.code, result.title, result.domainTitle, result.assessmentSpecMd);
  const learningActivities = buildLearningActivities(result, challengeProfile);
  return {
    ...result,
    planWeek: route?.week ?? result.planWeek,
    routeOrder: route?.order ?? Number.MAX_SAFE_INTEGER,
    estimatedTotalMinutes: learningActivities.reduce((sum, activity) => sum + activity.minutes, 0),
    estimatedCoreMinutes: result.studyMinutes,
    learningActivities,
    challengeProfile,
  };
}

function visibleLearningMinutes(
  point: Pick<KnowledgePointListItem, 'studyMinutes' | 'practiceMinutes' | 'projectMinutes'>,
  profile: ReturnType<typeof inferChallengeProfile>,
) {
  return point.studyMinutes + point.practiceMinutes + (profile === 'THEORY_ONLY' ? 0 : point.projectMinutes);
}

function buildLearningActivities(
  point: Pick<KnowledgePointDetail, 'code' | 'studyMinutes' | 'practiceMinutes' | 'projectMinutes' | 'studyMaterialMd' | 'assessmentSpecMd' | 'passCriteriaMd' | 'title'>,
  profile: ReturnType<typeof inferChallengeProfile>,
): LearningActivity[] {
  const strictTasks = extractStrictAssessmentTasks(point.assessmentSpecMd);
  if (!strictTasks) throw new Error(`${point.code} 缺少可解析的首考题 3 / 首考题 4 严格考核合同`);
  const references = extractLearningMaterialReferences(point.studyMaterialMd, point.title);
  const sourceNames = references.map((item) => `《${item.title}》`).join('、');
  const practiceProfile = profile as PracticeProfile;
  const activities: LearningActivity[] = [{
    id: 'reading', type: 'READING', label: '资料阅读与笔记', minutes: point.studyMinutes, optional: false,
    task: '读完列出的资料，记录核心概念、仍有疑问的地方，以及至少一个边界或反例。',
    input: `学习资料：${sourceNames}。`,
    outputRequirements: ['知识点原始笔记', '至少一个资料定位', '至少一个边界、反例或疑问'],
    completionCriteria: ['由你确认资料已经阅读', '原始笔记已保存；系统不会用 AI 稿覆盖原文'],
    deliveryMode: 'READ_ONLY', workspaceMode: null, language: null, starterCode: null, submissionTemplate: null,
    materialReferences: references,
    failureFixture: null, verificationChecklist: [], vetoItems: [],
  }];
  const isCode = profile === 'CODING';
  const label = ({
    THEORY_ONLY: '站内案例辨析', EXAMPLE_DRIVEN: '站内最小示例', CODING: '站内编码验证',
    DEBUGGING: '站内故障诊断', TOOL_OPERATION: '站内工具操作', DESIGN_CASE: '站内方案取舍',
  } as const)[profile];
  const outputByProfile: Record<PracticeProfile, string[]> = {
    THEORY_ONLY: ['题 3 结论与推导链', '固定条件下的预期和实际结论', '题 4 的异常假设、证伪和资料定位'],
    EXAMPLE_DRIVEN: ['题 3 的可复现最小示例', '固定输入、预期和实际结果', '题 4 的异常复现、根因或排除证据'],
    CODING: ['题 3 的可执行实现', '固定输入、预期、实际输出与断言', '题 4 的异常、根因、修复和回归证据'],
    DEBUGGING: ['题 3 复现基线', '题 4 的假设、证伪、根因、修复和回归', '固定输入、预期与实际现象'],
    TOOL_OPERATION: ['题 3 的命令、配置或操作产物', '环境、固定输入、预期与实际结果', '题 4 的异常处理和验证证据'],
    DESIGN_CASE: ['题 3 的方案产出', '固定场景、约束与候选方案取舍', '题 4 的异常假设、证伪与验证证据'],
  };
  const verificationChecklist = [
    '首考题 3 和首考题 4 原文均已绑定到本练习',
    '提交模板的每个固定栏目都已填写',
    '固定输入、预期、实际和验证证据均可定位',
    ...practiceEvidenceRequirements(practiceProfile),
    ...(isCode ? ['代码包含固定输入、expected、actual 与 console.assert，并已成功执行'] : []),
  ];
  activities.push({
    id: 'strict-practice', type: profile === 'THEORY_ONLY' ? 'CASE_STUDY' : 'GUIDED_PRACTICE', label,
    minutes: point.practiceMinutes + (profile === 'THEORY_ONLY' ? 0 : point.projectMinutes), optional: true,
    task: strictTasks.minimumOutput,
    input: `首考题 3（最小产出）原文：${strictTasks.minimumOutput}\n\n首考题 4（受限排错）原文：${strictTasks.constrainedDebugging}\n\n仅可依据 ${sourceNames} 和本点通过标准完成；不得用通用 PASS/CONTROLLED 模板替换题目给定的输入、预期或异常。`,
    outputRequirements: outputByProfile[practiceProfile],
    completionCriteria: verificationChecklist,
    deliveryMode: 'WORKSPACE', workspaceMode: isCode ? 'CODE' : 'TEXT', language: isCode ? (point.code.startsWith('TS-') ? 'typescript' : 'javascript') : null,
    starterCode: isCode ? strictPracticeStarterCode(point, strictTasks.minimumOutput, strictTasks.constrainedDebugging) : null,
    submissionTemplate: practiceSubmissionTemplate(practiceProfile), materialReferences: references,
    failureFixture: strictTasks.constrainedDebugging,
    verificationChecklist,
    vetoItems: ['未保留首考题 3 的具体产出或首考题 4 的受限排错证据', '以资料外经验、空泛描述或预设 PASS/CONTROLLED 状态替代题目要求'],
  });
  return activities;
}

function strictPracticeStarterCode(
  point: Pick<KnowledgePointDetail, 'code' | 'title'>,
  minimumOutput: string,
  constrainedDebugging: string,
) {
  return `// ${point.code} ${point.title}\n// 首考题 3 原文：${minimumOutput}\n// 首考题 4 原文：${constrainedDebugging}\n// 把题目给定的具体 fixture 写入 fixedInput；不要把预期替换成通用 PASS/CONTROLLED。\nconst fixedInput = Object.freeze({ /* 填写首考题 3 的固定输入 */ });\nconst expected = Object.freeze({ /* 填写题目要求的具体预期 */ });\n\nfunction solve(input) {\n  // 根据学习资料实现首考题 3。\n  throw new Error('TODO');\n}\n\nlet actual;\ntry {\n  actual = solve(fixedInput);\n  console.log({ fixedInput, expected, actual });\n  console.assert(JSON.stringify(actual) === JSON.stringify(expected), '实际输出与首考题 3 的具体预期不一致');\n} catch (error) {\n  console.error({ fixedInput, expected, error: String(error) });\n  throw error;\n}\n`;
}

/**
 * 给出唯一、可解释的下一最佳行动。优先处理复测和首考，再继续已开始的学习，
 * 最后从所有前置已掌握的节点中选择路径最靠前的一项。
 */
export async function getKnowledgeRecommendation(): Promise<KnowledgeRecommendation> {
  const { items } = await getKnowledgePoints({});
  const activeItems = items.filter((item) => item.status !== 'MASTERED');
  if (activeItems.length === 0) {
    return {
      action: 'COMPLETE', readiness: 'COMPLETE', reason: '全部知识点已经通过严格掌握闭环。',
      point: null, blockers: [], prerequisiteProgress: { mastered: 0, total: 0 }, routePosition: null,
    };
  }

  const prerequisiteRows = rawDb.prepare(`
    SELECT target.code AS targetCode, source.code, source.title, source.status
    FROM knowledge_edges edge
    JOIN knowledge_points source ON source.id = edge.source_point_id
    JOIN knowledge_points target ON target.id = edge.target_point_id
    WHERE edge.type = 'PREREQUISITE'
    ORDER BY edge.weight DESC, source.code ASC
  `).all() as Array<{ targetCode: string; code: string; title: string; status: KnowledgeStatus }>;
  const prerequisites = new Map<string, Array<{ code: string; title: string; status: KnowledgeStatus }>>();
  for (const row of prerequisiteRows) prerequisites.set(row.targetCode, [...(prerequisites.get(row.targetCode) ?? []), row]);

  const statePriority: Record<KnowledgeStatus, number> = {
    FIRST_PASS_PENDING_RETEST: 0,
    SELF_MASTERED: 1,
    NEEDS_RELEARNING: 2,
    LEARNING: 3,
    NOT_STARTED: 4,
    MASTERED: 9,
  };
  const candidates = activeItems.map((point) => {
    const allPrerequisites = prerequisites.get(point.code) ?? [];
    const blockers = allPrerequisites.filter((item) => item.status !== 'MASTERED');
    // 已开始或自评掌握也不能绕过前置闸门，避免形成“孤岛式掌握”。
    const stateReady = blockers.length === 0;
    return { point, allPrerequisites, blockers, stateReady };
  }).sort((left, right) => {
    const readinessDifference = Number(right.stateReady) - Number(left.stateReady);
    if (readinessDifference) return readinessDifference;
    const stateDifference = statePriority[left.point.status] - statePriority[right.point.status];
    return stateDifference || left.point.routeOrder - right.point.routeOrder;
  });
  const selected = candidates[0]!;
  const actionByStatus: Record<KnowledgeStatus, KnowledgeRecommendation['action']> = {
    NOT_STARTED: 'LEARN', LEARNING: 'CONTINUE', SELF_MASTERED: 'ASSESS',
    FIRST_PASS_PENDING_RETEST: 'RETEST', MASTERED: 'COMPLETE', NEEDS_RELEARNING: 'RELEARN',
  };
  const reasonByAction: Record<KnowledgeRecommendation['action'], string> = {
    LEARN: selected.stateReady ? '前置知识已经就绪，这是推荐路径中最靠前的未开始节点。' : '当前路径暂时被前置知识阻塞，先完成下方节点。',
    CONTINUE: '你已经开始学习，优先完成当前上下文能降低切换成本。',
    ASSESS: '你已完成自评，需要用严格首考把理解转成可验证证据。',
    RETEST: '首次考核已通过，完成复测后才会正式进入已掌握状态。',
    RELEARN: '最近一次严格考核未通过，先补齐薄弱点再重新挑战。',
    COMPLETE: '全部知识点已经通过严格掌握闭环。',
  };
  const route = KNOWLEDGE_ROUTE_INDEX.get(selected.point.code);
  return {
    action: actionByStatus[selected.point.status],
    readiness: selected.stateReady ? 'READY' : 'BLOCKED',
    reason: reasonByAction[actionByStatus[selected.point.status]],
    point: selected.point,
    blockers: selected.blockers,
    prerequisiteProgress: {
      mastered: selected.allPrerequisites.length - selected.blockers.length,
      total: selected.allPrerequisites.length,
    },
    routePosition: route ? { week: route.week, index: selected.point.routeOrder + 1, total: KNOWLEDGE_ROUTE_INDEX.size } : null,
  };
}

/**
 * 更新知识点摘要
 */
export async function updateKnowledgePointSummary(
  code: string,
  summary: string
): Promise<{ success: boolean; updatedAt: string }> {
  const now = new Date().toISOString();
  try {
    savePointNote(code, summary);
    return { success: true, updatedAt: now };
  } catch (error) {
    if (error instanceof Error && error.message.includes('不存在')) return { success: false, updatedAt: now };
    throw error;
  }
}

/**
 * 自评掌握命令（状态机）
 * 
 * 业务规则：
 * - 只有 NOT_STARTED 或 LEARNING 状态才能自评掌握
 * - 自评掌握后进入 SELF_MASTERED 状态
 * - 必须提供摘要或证据
 */
export async function selfMasterKnowledgePoint(
  code: string,
  summary: string
): Promise<{
  success: boolean;
  previousStatus: string;
  newStatus: string;
  selfMasteredAt: string;
}> {
  // 获取当前知识点
  const point = await getKnowledgePointByCode(code);
  
  if (!point) {
    throw new Error(`知识点不存在: ${code}`);
  }
  
  // 验证状态转换（状态机）
  const allowedStatuses = ['NOT_STARTED', 'LEARNING'];
  if (!allowedStatuses.includes(point.status)) {
    throw new Error(`当前状态不允许自评掌握: ${point.status}`);
  }
  
  // 验证摘要不为空
  if (!summary || summary.trim().length === 0) {
    throw new Error('自评掌握必须提供摘要');
  }
  
  // 更新状态和摘要
  const now = new Date().toISOString();
  const previousStatus = point.status;
  const newStatus = 'SELF_MASTERED' as const;
  
  db.transaction((tx) => {
    tx
      .update(knowledgePoints)
      .set({
        summary,
        status: newStatus,
        selfMasteredAt: now,
        updatedAt: now,
      })
      .where(eq(knowledgePoints.code, code))
      .run();

    tx.insert(masteryEvents).values({
      id: randomUUID(),
      knowledgePointCode: code,
      action: 'selfMastery',
      fromStatus: point.status,
      toStatus: newStatus,
      evidenceSummary: summary.trim().slice(0, 500),
      createdAt: now,
    }).run();
  });
  
  return {
    success: true,
    previousStatus,
    newStatus,
    selfMasteredAt: now,
  };
}
