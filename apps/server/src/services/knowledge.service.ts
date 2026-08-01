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
  extractKnowledgeTags,
  extractLearningMaterialReferences,
  extractMinimumOutput,
  type LearningMaterialReference,
} from './learning-content.service.js';

// ===== 查询参数 Schema =====
export const KnowledgeListQuerySchema = z.object({
  domainId: z.string().optional(), // 领域 ID
  status: z.enum(['NOT_STARTED', 'LEARNING', 'SELF_MASTERED', 'FIRST_PASS_PENDING_RETEST', 'MASTERED', 'NEEDS_RELEARNING']).optional(),
  search: z.string().optional(), // 搜索关键词（标题、code）
});

export type KnowledgeListQuery = z.infer<typeof KnowledgeListQuerySchema>;

// ===== 响应类型 =====
export interface KnowledgePointListItem {
  id: string;
  code: string;
  title: string;
  difficulty: string;
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
  
  // 搜索条件（标题或 code）
  if (query.search) {
    const searchPattern = `%${query.search}%`;
    conditions.push(
      or(
        like(knowledgePoints.title, searchPattern),
        like(knowledgePoints.code, searchPattern)
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
      difficulty: knowledgePoints.difficulty,
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
    })
    .from(knowledgePoints)
    .innerJoin(knowledgeDomains, eq(knowledgePoints.domainId, knowledgeDomains.id))
    .where(whereClause)
    .orderBy(knowledgeDomains.orderIndex, knowledgePoints.code);

  // 清单默认沿推荐学习路径排列，避免字母序把 Agent 等后置能力提前展示。
  const items = rows.map((item) => {
    const route = KNOWLEDGE_ROUTE_INDEX.get(item.code);
    const challengeProfile = inferChallengeProfile(item.code, item.title, item.domainTitle);
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
      summary: knowledgePoints.summary,
      studyMaterialMd: knowledgePoints.studyMaterialMd,
      assessmentSpecMd: knowledgePoints.assessmentSpecMd,
      passCriteriaMd: knowledgePoints.passCriteriaMd,
      difficulty: knowledgePoints.difficulty,
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
  const challengeProfile = inferChallengeProfile(result.code, result.title, result.domainTitle);
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
  const minimumOutput = extractMinimumOutput(point.assessmentSpecMd)
    || `围绕“${point.title}”完成一个能说明适用边界的最小例子，并记录预期与实际结果。`;
  const references = extractLearningMaterialReferences(point.studyMaterialMd, point.title);
  const tags = extractKnowledgeTags(point.title);
  const sourceNames = references.slice(0, 3).map((item) => `《${item.title}》`).join('、');
  const taskLiteral = JSON.stringify(minimumOutput);
  const activities: LearningActivity[] = [{
    id: 'reading', type: 'READING', label: '资料阅读与笔记', minutes: point.studyMinutes, optional: false,
    task: '读完列出的资料，记录核心概念、仍有疑问的地方，以及至少一个边界或反例。',
    input: `学习资料：${sourceNames}。`,
    outputRequirements: ['知识点原始笔记', '至少一个资料定位', '至少一个边界、反例或疑问'],
    completionCriteria: ['由你确认资料已经阅读', '原始笔记已保存；系统不会用 AI 稿覆盖原文'],
    deliveryMode: 'READ_ONLY', workspaceMode: null, language: null, starterCode: null, submissionTemplate: null,
    materialReferences: references,
  }];
  if (profile === 'THEORY_ONLY') {
    activities.push({
      id: 'case-study', type: 'CASE_STUDY', label: '站内案例辨析', minutes: point.practiceMinutes, optional: true,
      task: minimumOutput,
      input: `待分析任务：${minimumOutput}\n只允许使用 ${sourceNames} 与当前知识点通过标准。`,
      outputRequirements: ['明确结论', '资料名称与定位', '规则 → 条件 → 结论的推导链', '一个不成立的边界或反例'],
      completionCriteria: ['所有输出栏目均已填写', '结论能回指学习资料', '系统验证推导链与知识点边界一致'],
      deliveryMode: 'WORKSPACE', workspaceMode: 'TEXT', language: null, starterCode: null,
      submissionTemplate: '# 结论\n\n# 资料依据与定位\n\n# 推导过程\n1. 资料规则：\n2. 题目条件：\n3. 中间推导：\n4. 结论：\n\n# 边界或反例\n',
      materialReferences: references,
    });
    return activities;
  }
  const isCode = profile === 'CODING';
  const language = point.code.startsWith('TS-') ? 'typescript' : 'javascript';
  activities.push({
    id: 'guided-practice', type: 'GUIDED_PRACTICE', label: isCode ? '站内脚本练习' : '站内机制练习', minutes: point.practiceMinutes, optional: true,
    task: minimumOutput,
    input: isCode
      ? `固定任务输入：${minimumOutput}\n系统已在代码模板中提供 normal、boundary、failure 三个不可省略的样例编号；预期输出分别为 PASS、PASS、CONTROLLED。禁止依赖外部服务；重点验证 ${tags.join('、') || point.title}。`
      : `给定任务：${minimumOutput}\n依据仅限 ${sourceNames} 与当前知识点通过标准。`,
    outputRequirements: isCode
      ? ['可独立执行的 JavaScript/TypeScript 脚本', '明确的固定输入', '控制台输出预期值与实际值', '正常、边界、异常至少三类验证', '说明代码如何对应资料机制']
      : ['按任务逐项给出结果', '标明使用的资料与定位', '写出预期结果和实际判断', '解释至少一个边界或失败条件'],
    completionCriteria: isCode
      ? ['脚本在站内隔离运行区执行成功', '控制台没有未处理错误', '提交内容包含输入、输出与资料机制映射', '系统完成语义验证']
      : ['所有输出栏目均已填写', '答案能够回指资料', '系统验证结论与边界'],
    deliveryMode: 'WORKSPACE', workspaceMode: isCode ? 'CODE' : 'TEXT', language: isCode ? language : null,
    starterCode: isCode
      ? `// ${point.code} ${point.title}\n// 固定输入：保留三个样例编号，并把 description 补成可执行的具体数据。\nconst input = Object.freeze({\n  task: ${taskLiteral},\n  cases: [\n    { id: 'normal', description: '填写正常输入' },\n    { id: 'boundary', description: '填写边界输入' },\n    { id: 'failure', description: '填写异常输入' },\n  ],\n});\n\n// 固定预期输出：实现必须让三个样例分别得到这些状态。\nconst expectedOutput = Object.freeze({ normal: 'PASS', boundary: 'PASS', failure: 'CONTROLLED' });\n\nfunction solve(givenInput) {\n  // 根据学习资料实现；返回 { normal, boundary, failure }。\n  return { normal: 'TODO', boundary: 'TODO', failure: 'TODO' };\n}\n\nconst actualOutput = solve(input);\nconsole.log({ input, expectedOutput, actualOutput });\nfor (const id of ['normal', 'boundary', 'failure']) {\n  console.assert(actualOutput[id] === expectedOutput[id], id + ' 的实际输出不符合预期');\n}\n`
      : null,
    submissionTemplate: isCode
      ? '# 固定输入\n\n# 预期输出\n\n# 实际输出\n\n# 资料机制映射\n\n# 边界与异常验证\n'
      : '# 任务结果\n\n# 资料依据与定位\n\n# 预期与实际\n\n# 机制解释\n\n# 边界或失败条件\n',
    materialReferences: references,
  });
  activities.push({
    id: 'application', type: 'APPLICATION', label: '站内综合产出', minutes: point.projectMinutes, optional: true,
    task: minimumOutput,
    input: isCode
      ? `固定综合任务：${minimumOutput}\n代码模板给出 normal、boundary、failure 三个固定输入槽位与 PASS、PASS、CONTROLLED 三个预期状态；必须在站内逐项运行并保留输出。`
      : `把前一项练习扩展成可复核产出：${minimumOutput}\n必须显式使用当前知识点的资料依据和通过标准。`,
    outputRequirements: isCode
      ? ['可独立执行的完整脚本', '固定输入与约束', '预期与实际输出', '正常、边界和异常样例的验证证据', '资料依据、机制映射和仍未解决的问题']
      : ['任务结果或实现说明', '输入与约束', '预期与实际输出', '验证步骤与证据', '资料依据、边界和仍未解决的问题'],
    completionCriteria: isCode
      ? ['完整脚本已在本页面隔离运行区执行成功', '输入、输出和验证证据齐全', '系统验证与学习资料及通过标准一致']
      : ['产出可在本页面完整查看', '输入、输出和验证证据齐全', '系统验证与学习资料及通过标准一致'],
    deliveryMode: 'WORKSPACE', workspaceMode: isCode ? 'CODE' : 'TEXT', language: isCode ? language : null,
    starterCode: isCode
      ? `// ${point.code} ${point.title} · 综合产出\nconst task = ${taskLiteral};\nconst cases = [\n  { id: 'normal', input: { description: '填写正常输入' }, expected: 'PASS' },\n  { id: 'boundary', input: { description: '填写边界输入' }, expected: 'PASS' },\n  { id: 'failure', input: { description: '填写异常输入' }, expected: 'CONTROLLED' },\n];\n\nfunction solve(input) {\n  // 根据学习资料实现，并返回 PASS 或 CONTROLLED。\n  return 'TODO';\n}\n\nconsole.log({ task });\nfor (const testCase of cases) {\n  const actual = solve(testCase.input);\n  console.log(testCase.id, { input: testCase.input, expected: testCase.expected, actual });\n  console.assert(actual === testCase.expected, testCase.id + ' 未通过');\n}\n`
      : null,
    submissionTemplate: '# 输入与约束\n\n# 产出\n\n# 预期输出\n\n# 实际输出与验证证据\n\n# 资料依据\n\n# 边界与未解决问题\n',
    materialReferences: references,
  });
  return activities;
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
