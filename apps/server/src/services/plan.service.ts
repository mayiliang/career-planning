/**
 * 计划服务
 * 
 * Phase 3: 日历、计划与打卡
 * - 从 16 周 CSV 模板生成计划事件
 * - 事件查询、创建、更新
 * - 打卡和状态管理
 */
import { eq, and, gte, lte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db, rawDb } from '../db/index.js';
import { planEvents, checkins, dailyReviews, leaveDays } from '../db/schema.js';
import type {
  NewPlanEvent,
  PlanEventRecord,
  CheckinRecord,
  EventType,
  PlanEventStatus,
} from '../db/schema.js';
import { parsePlanCsv } from '@career-atlas/content-parser';
import { LEARNING_WEEK_PATHS } from './knowledge-relations.service.js';
export { LEARNING_WEEK_PATHS } from './knowledge-relations.service.js';

export interface LearningBriefPoint {
  id: string;
  code: string;
  title: string;
  status: string;
  domainCode: string;
  domainTitle: string;
  prerequisites: Array<{ id: string; code: string; title: string; status: string }>;
}

export interface PlanLearningBrief {
  displayTitle: string;
  phase: string;
  weekTheme: string;
  weekOutcome: string;
  projectAnchor: string;
  dailyFocus: string;
  assessmentMode: string;
  reviewCadence: string[];
  learningContent: string[];
  masteryGoals: Array<{ code: string; text: string }>;
  tasks: Array<{ code: string; text: string }>;
  outputs: string[];
  reviewQuestion: string;
  prerequisitesReady: boolean;
  pendingPrerequisiteCount: number;
  knowledgePoints: LearningBriefPoint[];
  effort: {
    studyMinutes: number;
    practiceMinutes: number;
    projectMinutes: number;
    assessmentMinutes: number;
    retestMinutes: number;
    estimatedTotalMinutes: number;
    capacityMinutes: number;
    utilizationPercent: number;
    overloaded: boolean;
  };
}

export type PlanEventWithLearningBrief = PlanEventRecord & { learningBrief: PlanLearningBrief | null };

export interface LearningWeekBlueprint {
  phase: string;
  theme: string;
  projectAnchor: string;
  outcome: string;
  assessment: string;
}

/** 16 周元计划：学习成长是主线，求职表达在能力证据形成后再集中转译。 */
export const LEARNING_WEEK_BLUEPRINTS: Record<number, LearningWeekBlueprint> = {
  1: { phase: '基础底座', theme: 'Web 运行模型、平台能力与网络', projectAnchor: '浏览器机制实验室', outcome: '完成语言、CSS、可访问性、浏览器渲染和网络的可运行实验集', assessment: '闭卷机制问答 + DevTools 现场诊断 + 网络缓存排障' },
  2: { phase: '基础底座', theme: '前端安全与 TypeScript 类型系统', projectAnchor: '安全边界与审核流类型模型', outcome: '完成安全攻击修复证据，并用类型系统表达业务状态和动作', assessment: '安全代码审查 + 现场类型建模 + 非法状态编译期验证' },
  3: { phase: '框架与业务', theme: 'TypeScript 工程收口与 Vue 3 核心链路', projectAnchor: 'Career Atlas Vue 功能迭代', outcome: '完成类型工程化，并独立实现 Vue 路由、状态、请求、测试和性能链路', assessment: '类型工程题 + Vue 原理问答 + 限时功能开发' },
  4: { phase: '框架与业务', theme: 'Vue 生产化与 React 原理、复杂状态', projectAnchor: '双框架复杂页面对照实验', outcome: '交付 Vue SSR 边界与 React 组件、Effect、并发和性能证据', assessment: '双框架机制对比 + Bug 修复 + 性能测量前后对比' },
  5: { phase: '框架与业务', theme: 'Umi/Max、Ant Design 与业务建模', projectAnchor: 'gungnir-web 审核流页面模板', outcome: '沉淀中后台标准实现，并完成对象、状态和接口契约的前半段建模', assessment: '中后台限时实现 + 状态机推演 + 边界验收' },
  6: { phase: '工程与平台', theme: '复杂业务闭环与工程质量底座', projectAnchor: 'CampusJob 契约与质量流水线', outcome: '补齐业务验收、错误和迁移边界，建立工作区、构建与质量门禁', assessment: '接口变更应对 + 构建故障定位 + CI 门禁答辩' },
  7: { phase: '工程与平台', theme: '测试、发布、可观测性与性能诊断', projectAnchor: 'get_apidoc 质量与性能流水线', outcome: '建立测试金字塔、发布回滚、RUM 和 Core Web Vitals 诊断闭环', assessment: '单元/组件/E2E 实作 + 发布故障演练 + DevTools 诊断' },
  8: { phase: '工程与平台', theme: 'H5、Hybrid 与组件设计系统', projectAnchor: '移动端组件与设计 Token 专项', outcome: '交付移动兼容修复、Bridge 边界和可复用组件 API 证据', assessment: '真机问题修复 + 组件 API 设计 + 破坏性变更评审' },
  9: { phase: '工程与平台', theme: '平台化、Node.js、OpenAPI 与 MCP 入门', projectAnchor: 'get_apidoc MCP 工具链', outcome: '完成平台边界、CLI、Schema、类型生成和首个 MCP Tool', assessment: 'CLI 现场编码 + Schema 设计 + 工具安全测试' },
  10: { phase: 'AI 原生能力', theme: 'MCP 收口与 AI 应用工程', projectAnchor: 'Career Atlas DeepSeek 考核链路', outcome: '交付 MCP 安全边界、流式输出、Tool Calling、RAG 和基础评估', assessment: '模型应用系统设计 + 工具协议实作 + 失败注入' },
  11: { phase: 'AI 原生能力', theme: '可信 AI 体验与 Agent Loop', projectAnchor: '可恢复的学习评测 Agent', outcome: '补齐质量、成本与可信体验，并实现带停止条件和状态的 Agent Loop', assessment: '回归集评分 + Agent 场景设计 + 异常恢复' },
  12: { phase: 'AI 原生能力', theme: 'Agent 工具协作与浏览器 AI 基础', projectAnchor: '最小权限 Agent 与本地推理实验', outcome: '完成审批、回放、并发与安全闭环，并验证浏览器 AI 兼容和隐私边界', assessment: '工具协议实作 + 安全红队 + 端云能力检测' },
  13: { phase: 'AI 原生能力', theme: '浏览器本地推理与 AI 辅助研发入门', projectAnchor: '本地语义搜索 PWA', outcome: '完成 Worker/WebGPU/WASM/离线链路，并建立规格驱动研发起点', assessment: '性能能耗测量 + 离线恢复 + 规格质量评审' },
  14: { phase: 'AI 原生能力', theme: 'AI 辅助研发、评审与工程治理', projectAnchor: 'AI 研发质量门禁', outcome: '形成上下文工程、代码验证、评审、可观测性和供应链治理流程', assessment: 'Agentic Coding 实战 + 风险分级 Review + 指标答辩' },
  15: { phase: '影响力转译', theme: 'AI 治理收口、项目表达与职业影响力', projectAnchor: '四个代表项目资产包', outcome: '完成团队治理并把前 14 周证据转成项目复盘、架构图、ADR 和面试表达', assessment: '治理方案答辩 + 项目深挖模拟面试 + 教学表达' },
  16: { phase: '综合闸门', theme: 'Career Atlas AI 学习系统毕业项目', projectAnchor: 'Career Atlas 2.0', outcome: '交付可运行产品、测试报告、性能报告、架构文档和演示材料', assessment: '4 小时综合实作 + 90 分钟答辩 + 7 天后盲测复核' },
};

// ===== 16 周计划模板解析 =====

/**
 * 学习计划模板项（从 CSV 解析）
 */
interface PlanTemplateItem {
  week: number;
  theme: string;
  day: string; // 周一/周二/...
  learningTopic: string;
  practiceTask: string;
  output: string;
  reviewQuestion: string;
  phase: string;
  projectAnchor: string;
  weeklyOutcome: string;
  weeklyAssessment: string;
}

const DAILY_RHYTHMS = [
  { day: '周一', focus: '建立心智模型', task: '精读资料并画出概念、输入输出和前置关系', output: '概念图 + 闭卷复述录音', question: '我能否从运行机制解释现象，而不是背结论？' },
  { day: '周二', focus: '机制实验与源码验证', task: '用最小 Demo、DevTools 或源码断点验证关键机制', output: '可运行实验 + 观察记录', question: '证据是否真的支持我的结论？' },
  { day: '周三', focus: '边界、反例与面试追问', task: '完成反例、故障注入和高级面试连续追问', output: '错题卡 + 边界用例', question: '条件改变后，我的答案是否仍成立？' },
  { day: '周四', focus: '真实项目迁移', task: '把知识用于本周项目锚点，记录方案、取舍和风险', output: '项目增量 + ADR', question: '这项改动解决了什么真实问题，代价是什么？' },
  { day: '周五', focus: '严格日检与补弱', task: '闭卷作答、限时编码或方案设计，未通过项当天补学再测', output: '评分记录 + 修订证据', question: '没有资料和 AI 时，我是否仍能独立完成？' },
  { day: '周六', focus: '知识关系整合', task: '合并本周知识图谱，完成跨知识点综合题和项目复查', output: '关系图 + 综合题解', question: '我能否讲清前置、因果、对比和应用关系？' },
  { day: '周日', focus: '周闸门与项目答辩', task: '完成 90 分钟闭卷、120 分钟实作和项目证据答辩', output: '周考报告 + 可演示项目里程碑', question: '本周证据能否经受高级前端面试的连续追问？' },
] as const;

/**
 * 解析学习计划 CSV
 * 使用 csv-parse 库正确处理带引号和逗号的字段
 */
export function parseLearningPlanCSV(csvContent: string): PlanTemplateItem[] {
  return parsePlanCsv(csvContent).flatMap(({ status: _status, ...week }) => DAILY_RHYTHMS.map((rhythm) => ({
    week: week.week,
    theme: week.theme,
    day: rhythm.day,
    learningTopic: `${week.theme} · ${rhythm.focus}`,
    practiceTask: `${rhythm.task}；项目锚点：${week.projectAnchor}`,
    output: `${rhythm.output}；本周成果：${week.weeklyOutcome}`,
    reviewQuestion: rhythm.question,
    phase: week.phase,
    projectAnchor: week.projectAnchor,
    weeklyOutcome: week.weeklyOutcome,
    weeklyAssessment: week.weeklyAssessment,
  })));
}

/**
 * 日期计算工具
 */
function getDayOfWeek(dayName: string): number {
  const dayMap: Record<string, number> = {
    '周日': 0, '周天': 0, '星期日': 0, '星期天': 0,
    '周一': 1, '星期一': 1,
    '周二': 2, '星期二': 2,
    '周三': 3, '星期三': 3,
    '周四': 4, '星期四': 4,
    '周五': 5, '星期五': 5,
    '周六': 6, '星期六': 6,
  };
  return dayMap[dayName] ?? 1;
}

/**
 * 计算计划日期
 * @param startDate 计划开始日期（周一）
 * @param weekNumber 周次（1-16）
 * @param dayOfWeek 星期几（0-6）
 */
function calculatePlanDate(startDate: Date, weekNumber: number, dayOfWeek: number): Date {
  const date = new Date(startDate);
  // 计算周偏移量（weekNumber - 1）
  const weekOffset = (weekNumber - 1) * 7;
  // 将原生周日 0 映射到一周末尾 6，确保周日位于同一周的周六之后。
  const dayOffset = (dayOfWeek + 6) % 7;
  date.setDate(date.getDate() + weekOffset + dayOffset);
  return date;
}

function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

type KnowledgeEffortRow = {
  code: string;
  studyMinutes: number;
  practiceMinutes: number;
  projectMinutes: number;
  assessmentMinutes: number;
  retestMinutes: number;
};

function loadEffortByCode(): Map<string, KnowledgeEffortRow> {
  const rows = rawDb.prepare(`
    SELECT code,
           study_minutes AS studyMinutes,
           practice_minutes AS practiceMinutes,
           project_minutes AS projectMinutes,
           assessment_minutes AS assessmentMinutes,
           retest_minutes AS retestMinutes
    FROM knowledge_points
  `).all() as KnowledgeEffortRow[];
  return new Map(rows.map((row) => [row.code, row]));
}

function initialMinutes(effort: KnowledgeEffortRow | undefined): number {
  return effort
    ? effort.studyMinutes + effort.practiceMinutes + effort.projectMinutes + effort.assessmentMinutes
    : 240;
}

type EffortStage = 'study' | 'practice' | 'project' | 'assessment';
type EffortSegment = { code: string; stage: EffortStage; minutes: number };

const STAGE_LABELS: Record<EffortStage, string> = {
  study: '资料精读',
  practice: '机制练习',
  project: '项目产出',
  assessment: '严格首考',
};

const STAGE_TASKS: Record<EffortStage, string> = {
  study: '精读官方资料，写出关键机制、输入输出、前置关系和 3 个待验证问题',
  practice: '完成最小 Demo、反例或故障注入，并保存 DevTools、类型或测试证据',
  project: '迁移到本周项目锚点，提交可运行增量并记录方案、取舍和风险',
  assessment: '闭卷完成知识点严格考核，达到 80 分且关键项全部通过',
};

/** 把知识点的四个首次掌握阶段按分钟连续铺到周一至周六，可在 15 分钟边界跨日。 */
function effortSegmentsForWeek(week: number, effortByCode = loadEffortByCode()): EffortSegment[][] {
  const stages = (LEARNING_WEEK_PATHS[week] ?? []).flatMap((code) => {
    const effort = effortByCode.get(code);
    return ([
      { code, stage: 'study', minutes: effort?.studyMinutes ?? 45 },
      { code, stage: 'practice', minutes: effort?.practiceMinutes ?? 75 },
      { code, stage: 'project', minutes: effort?.projectMinutes ?? 60 },
      { code, stage: 'assessment', minutes: effort?.assessmentMinutes ?? 60 },
    ] satisfies EffortSegment[]);
  });
  const totalMinutes = stages.reduce((sum, stage) => sum + stage.minutes, 0);
  const targetMinutes = Math.min(480, Math.ceil(totalMinutes / 6 / 15) * 15);
  const days = Array.from({ length: 6 }, () => [] as EffortSegment[]);
  let dayIndex = 0;
  let dayMinutes = 0;
  for (const stage of stages) {
    let remaining = stage.minutes;
    while (remaining > 0) {
      const capacity = Math.max(15, targetMinutes - dayMinutes);
      const minutes = Math.min(remaining, capacity);
      days[Math.min(dayIndex, 5)]!.push({ ...stage, minutes });
      remaining -= minutes;
      dayMinutes += minutes;
      if (dayMinutes >= targetMinutes && dayIndex < 5) {
        dayIndex++;
        dayMinutes = 0;
      }
    }
  }
  return days;
}

/** 把一周的知识路径切成连续且负载尽量相近的 6 组，避免按数量平均造成难度失衡。 */
export function partitionKnowledgePathByEffort(
  path: string[],
  effortByCode = loadEffortByCode(),
  dayCount = 6,
): string[][] {
  const groups = Array.from({ length: dayCount }, () => [] as string[]);
  let cursor = 0;
  for (let dayIndex = 0; dayIndex < dayCount && cursor < path.length; dayIndex++) {
    const remainingDays = dayCount - dayIndex;
    const remainingCodes = path.slice(cursor);
    const remainingMinutes = remainingCodes.reduce((sum, code) => sum + initialMinutes(effortByCode.get(code)), 0);
    const target = remainingMinutes / remainingDays;
    const mustLeave = Math.min(remainingDays - 1, Math.max(0, remainingCodes.length - 1));
    let groupMinutes = 0;

    while (cursor < path.length - mustLeave) {
      const code = path[cursor]!;
      const minutes = initialMinutes(effortByCode.get(code));
      if (groups[dayIndex]!.length > 0 && Math.abs(groupMinutes - target) < Math.abs(groupMinutes + minutes - target)) break;
      groups[dayIndex]!.push(code);
      groupMinutes += minutes;
      cursor++;
    }
    if (groups[dayIndex]!.length === 0 && cursor < path.length) groups[dayIndex]!.push(path[cursor++]!);
  }
  while (cursor < path.length) groups[dayCount - 1]!.push(path[cursor++]!);
  return groups;
}

function codesForPlanDay(week: number, day: string): string[] {
  const path = LEARNING_WEEK_PATHS[week] ?? [];
  if (path.length === 0) return [];
  const dayIndex = (getDayOfWeek(day) + 6) % 7;
  // 周一到周六推进新知识，周日抽取末端知识做综合闸门，不再塞入新内容。
  if (dayIndex === 6) return path.slice(Math.max(0, path.length - 2));
  return [...new Set((effortSegmentsForWeek(week)[dayIndex] ?? []).map((segment) => segment.code))];
}

function describeTemplateItem(item: PlanTemplateItem): string {
  const codes = codesForPlanDay(item.week, item.day);
  const isWeeklyGate = getDayOfWeek(item.day) === 0;
  const segments = isWeeklyGate ? [] : effortSegmentsForWeek(item.week)[(getDayOfWeek(item.day) + 6) % 7] ?? [];
  const estimatedMinutes = isWeeklyGate
    ? 210
    : segments.reduce((sum, segment) => sum + segment.minutes, 0);
  return [
    `阶段：${item.phase}`,
    `知识点：${codes.join('、')}`,
    `阶段任务：${segments.map((segment) => `${segment.code}/${segment.stage}/${segment.minutes}`).join('、')}`,
    `预计投入：${estimatedMinutes} 分钟${estimatedMinutes > 480 ? '（超出 8 小时，建议顺延低优先级任务）' : ''}`,
    `本周目标：${item.weeklyOutcome}`,
    `项目锚点：${item.projectAnchor}`,
    `今日任务：${item.practiceTask}`,
    `验收产出：${item.output}`,
    `周闸门：${item.weeklyAssessment}`,
  ].join('\n');
}

function concise(text: string, maxLength = 220): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}

type KnowledgeContextRow = {
  id: string;
  code: string;
  title: string;
  status: string;
  domainCode: string;
  domainTitle: string;
  assessmentSpec: string;
  passCriteria: string;
  studyMinutes: number;
  practiceMinutes: number;
  projectMinutes: number;
  assessmentMinutes: number;
  retestMinutes: number;
};

type PrerequisiteRow = {
  targetId: string;
  sourceId: string;
  code: string;
  title: string;
  status: string;
};

function loadKnowledgeContext() {
  const points = rawDb.prepare(`
    SELECT kp.id, kp.code, kp.title, kp.status,
           kd.code AS domainCode, kd.title AS domainTitle,
           kp.assessment_spec_md AS assessmentSpec,
           kp.pass_criteria_md AS passCriteria,
           kp.study_minutes AS studyMinutes,
           kp.practice_minutes AS practiceMinutes,
           kp.project_minutes AS projectMinutes,
           kp.assessment_minutes AS assessmentMinutes,
           kp.retest_minutes AS retestMinutes
    FROM knowledge_points kp
    JOIN knowledge_domains kd ON kd.id = kp.domain_id
  `).all() as KnowledgeContextRow[];
  const prerequisites = rawDb.prepare(`
    SELECT edge.target_point_id AS targetId, source.id AS sourceId,
           source.code, source.title, source.status
    FROM knowledge_edges edge
    JOIN knowledge_points source ON source.id = edge.source_point_id
    WHERE edge.type = 'PREREQUISITE'
    ORDER BY edge.weight DESC, source.code ASC
  `).all() as PrerequisiteRow[];
  const prerequisitesByTarget = new Map<string, PrerequisiteRow[]>();
  for (const prerequisite of prerequisites) {
    prerequisitesByTarget.set(prerequisite.targetId, [...(prerequisitesByTarget.get(prerequisite.targetId) ?? []), prerequisite]);
  }
  return { byCode: new Map(points.map((point) => [point.code, point])), byId: new Map(points.map((point) => [point.id, point])), prerequisitesByTarget };
}

function buildLearningBrief(
  event: PlanEventRecord,
  context: ReturnType<typeof loadKnowledgeContext>,
): PlanLearningBrief | null {
  const embeddedSegments = event.description?.match(/^阶段任务：(.+)$/m)?.[1]
    ?.split('、')
    .map((value) => {
      const [code, stage, minutes] = value.split('/');
      return code && ['study', 'practice', 'project', 'assessment'].includes(stage ?? '') && Number(minutes) > 0
        ? { code, stage: stage as EffortStage, minutes: Number(minutes) }
        : null;
    })
    .filter((segment): segment is EffortSegment => Boolean(segment)) ?? [];
  const embeddedCodes = event.description?.match(/^知识点：(.+)$/m)?.[1]
    ?.split('、')
    .map((code) => code.trim())
    .filter(Boolean) ?? [];
  // 描述中的知识点快照保证已完成历史不会被后续蓝图重排成另一组知识。
  const codes = embeddedCodes.length > 0
    ? embeddedCodes
    : event.status === 'PLANNED' && event.templateWeek && event.templateDay
      ? codesForPlanDay(event.templateWeek, event.templateDay)
      : [];
  const selected = codes.map((code) => context.byCode.get(code)).filter((point): point is KnowledgeContextRow => Boolean(point));
  if (selected.length === 0 && event.knowledgePointId) {
    const linked = context.byId.get(event.knowledgePointId);
    if (linked) selected.push(linked);
  }
  if (selected.length === 0) return null;

  const knowledgePoints: LearningBriefPoint[] = selected.map((point) => ({
    id: point.id,
    code: point.code,
    title: point.title,
    status: point.status,
    domainCode: point.domainCode,
    domainTitle: point.domainTitle,
    prerequisites: (context.prerequisitesByTarget.get(point.id) ?? []).map((item) => ({
      id: item.sourceId,
      code: item.code,
      title: item.title,
      status: item.status,
    })),
  }));
  const scheduledCodes = new Set(knowledgePoints.map((point) => point.code));
  const pendingPrerequisiteCodes = new Set(
    knowledgePoints.flatMap((point) => point.prerequisites)
      // 同一学习合同中的前置节点已经按阶段顺序排在前面，只提示合同外的真实阻塞。
      .filter((point) => point.status !== 'MASTERED' && !scheduledCodes.has(point.code))
      .map((point) => point.code),
  );
  const domainTitles = [...new Set(selected.map((point) => point.domainTitle))];
  const displayTitle = selected.map((point) => `${point.code} ${point.title}`).join(' + ');
  const blueprint = event.templateWeek ? LEARNING_WEEK_BLUEPRINTS[event.templateWeek] : undefined;
  const dayIndex = event.templateDay ? (getDayOfWeek(event.templateDay) + 6) % 7 : 0;
  const rhythm = DAILY_RHYTHMS[dayIndex] ?? DAILY_RHYTHMS[0];
  const isWeeklyGate = dayIndex === 6;
  const daySegments = isWeeklyGate
    ? []
    : embeddedSegments.length > 0
      ? embeddedSegments
      : event.templateWeek
        ? effortSegmentsForWeek(event.templateWeek)[dayIndex] ?? []
        : [];
  const activeStageLabels = [...new Set(daySegments.map((segment) => STAGE_LABELS[segment.stage]))];
  const assessmentSegmentCount = daySegments.filter((segment) => segment.stage === 'assessment').length;
  const capacityMinutes = Math.max(0, Math.round((new Date(event.endAt).getTime() - new Date(event.startAt).getTime()) / 60_000));
  const effort = isWeeklyGate
    ? {
        studyMinutes: 0,
        practiceMinutes: 0,
        projectMinutes: 120,
        assessmentMinutes: 90,
        retestMinutes: 0,
        estimatedTotalMinutes: 210,
      }
    : daySegments.length > 0
      ? {
        studyMinutes: daySegments.filter((segment) => segment.stage === 'study').reduce((sum, segment) => sum + segment.minutes, 0),
        practiceMinutes: daySegments.filter((segment) => segment.stage === 'practice').reduce((sum, segment) => sum + segment.minutes, 0),
        projectMinutes: daySegments.filter((segment) => segment.stage === 'project').reduce((sum, segment) => sum + segment.minutes, 0),
        assessmentMinutes: daySegments.filter((segment) => segment.stage === 'assessment').reduce((sum, segment) => sum + segment.minutes, 0),
        retestMinutes: 0,
        estimatedTotalMinutes: daySegments.reduce((sum, segment) => sum + segment.minutes, 0),
      }
      : {
        studyMinutes: selected.reduce((sum, point) => sum + point.studyMinutes, 0),
        practiceMinutes: selected.reduce((sum, point) => sum + point.practiceMinutes, 0),
        projectMinutes: selected.reduce((sum, point) => sum + point.projectMinutes, 0),
        assessmentMinutes: selected.reduce((sum, point) => sum + point.assessmentMinutes, 0),
        retestMinutes: selected.reduce((sum, point) => sum + point.retestMinutes, 0),
        estimatedTotalMinutes: selected.reduce((sum, point) => sum + initialMinutes(point), 0),
      };

  return {
    displayTitle,
    phase: blueprint?.phase ?? '自主计划',
    weekTheme: blueprint?.theme ?? domainTitles.join(' × '),
    weekOutcome: blueprint?.outcome ?? '完成知识学习、严格考核与可追溯产出',
    projectAnchor: blueprint?.projectAnchor ?? '独立 Demo 或真实项目',
    dailyFocus: isWeeklyGate ? rhythm.focus : activeStageLabels.length ? activeStageLabels.join(' → ') : rhythm.focus,
    assessmentMode: isWeeklyGate
      ? `周闸门：${blueprint?.assessment ?? '闭卷问答 + 限时实作 + 项目答辩'}；总分至少 80，关键项必须全部通过`
      : assessmentSegmentCount
        ? `今日包含 ${assessmentSegmentCount} 个首考阶段：由 DeepSeek 严格评分；未通过项回到薄弱阶段补学再测`
        : '今日先完成输入、实验或项目证据；严格首考已按分钟安排在后续负载块',
    reviewCadence: ['当天闭卷回忆', '次日 15 分钟复述', '7 天后严格复测', '30 天后迁移题'],
    learningContent: daySegments.length > 0
      ? daySegments.map((segment) => `${segment.code} · ${STAGE_LABELS[segment.stage]} · ${segment.minutes} 分钟`)
      : [
          `${rhythm.focus}：${selected.map((point) => `${point.code} ${point.title}`).join('；')}`,
          `项目迁移：${blueprint?.projectAnchor ?? '独立 Demo 或真实项目'}`,
        ],
    masteryGoals: selected.map((point) => ({ code: point.code, text: concise(point.passCriteria) })),
    tasks: daySegments.length > 0
      ? daySegments.map((segment) => ({
          code: segment.code,
          text: segment.stage === 'assessment'
            ? concise(context.byCode.get(segment.code)?.assessmentSpec ?? STAGE_TASKS.assessment)
            : `${STAGE_TASKS[segment.stage]}（${segment.minutes} 分钟）`,
        }))
      : selected.map((point) => ({ code: point.code, text: concise(point.assessmentSpec) })),
    outputs: [
      `${selected.map((point) => point.code).join('、')}：闭卷回答 + 可运行代码、测试或项目证据`,
      rhythm.output,
    ],
    reviewQuestion: `${rhythm.question} 我能否不看资料解释 ${selected.map((point) => point.code).join('、')}？`,
    prerequisitesReady: pendingPrerequisiteCodes.size === 0,
    pendingPrerequisiteCount: pendingPrerequisiteCodes.size,
    knowledgePoints,
    effort: {
      ...effort,
      capacityMinutes,
      utilizationPercent: capacityMinutes ? Math.round(effort.estimatedTotalMinutes / capacityMinutes * 100) : 0,
      overloaded: capacityMinutes > 0 && effort.estimatedTotalMinutes > capacityMinutes,
    },
  };
}

function enrichEvents(events: PlanEventRecord[]): PlanEventWithLearningBrief[] {
  const context = loadKnowledgeContext();
  return events.map((event) => ({ ...event, learningBrief: buildLearningBrief(event, context) }));
}

// ===== 计划导入服务 =====

export interface PlanImportPreview {
  totalItems: number;
  weeks: Array<{
    week: number;
    theme: string;
    itemCount: number;
  }>;
  items: Array<{
    week: number;
    day: string;
    date: string;
    title: string;
    learningTopic: string;
    practiceTask: string;
  }>;
}

export interface PlanImportOptions {
  startDate: string; // ISO 日期 YYYY-MM-DD
  dailySchedule?: Array<{
    timeBlock: string;
    startHour: number;
    startMinute: number;
    durationMinutes: number;
  }>;
}

/**
 * 计划服务
 */
export class PlanService {
  /** 保证模板计划在本地时区统一为 09:00-17:00，修复早期周末任务使用 UTC 小时造成的偏移。 */
  normalizeTemplateSchedule(): number {
    const records = rawDb.prepare(`
      SELECT id, start_at AS startAt, end_at AS endAt
      FROM plan_events
      WHERE source_type = 'TEMPLATE'
    `).all() as Array<{ id: string; startAt: string; endAt: string }>;
    const update = rawDb.prepare('UPDATE plan_events SET start_at = ?, end_at = ?, updated_at = ? WHERE id = ?');
    let updated = 0;
    const now = new Date().toISOString();
    rawDb.transaction(() => {
      for (const record of records) {
        const start = new Date(record.startAt);
        const currentEnd = new Date(record.endAt);
        if (start.getHours() === 9 && currentEnd.getHours() === 17 && currentEnd.getTime() - start.getTime() === 8 * 60 * 60 * 1000) continue;
        start.setHours(9, 0, 0, 0);
        const end = new Date(start);
        end.setHours(17, 0, 0, 0);
        update.run(start.toISOString(), end.toISOString(), now, record.id);
        updated++;
      }
    })();
    return updated;
  }

  /**
   * 用最新知识蓝图同步模板计划。只改尚未打卡的 PLANNED 事件，已完成、部分完成、
   * 跳过、改期或已有打卡证据的记录全部保留；缺失日期会按原计划锚点补齐。
   */
  async syncTemplatePlan(templatePath: string): Promise<{ created: number; updated: number; preserved: number }> {
    const existing = rawDb.prepare(`
      SELECT pe.id, pe.status, pe.title, pe.description,
             pe.knowledge_point_id AS knowledgePointId,
             pe.start_at AS startAt, pe.end_at AS endAt,
             pe.template_week AS templateWeek, pe.template_day AS templateDay,
             EXISTS(SELECT 1 FROM checkins c WHERE c.plan_event_id = pe.id) AS hasCheckin
      FROM plan_events pe
      WHERE pe.source_type = 'TEMPLATE' AND pe.template_week IS NOT NULL AND pe.template_day IS NOT NULL
      ORDER BY pe.template_week ASC,
        CASE pe.template_day WHEN '周一' THEN 1 WHEN '周二' THEN 2 WHEN '周三' THEN 3
          WHEN '周四' THEN 4 WHEN '周五' THEN 5 WHEN '周六' THEN 6 WHEN '周日' THEN 7 ELSE 8 END
    `).all() as Array<{
      id: string;
      status: PlanEventStatus;
      title: string;
      description: string | null;
      knowledgePointId: string | null;
      startAt: string;
      endAt: string;
      templateWeek: number;
      templateDay: string;
      hasCheckin: number;
    }>;
    if (existing.length === 0) return { created: 0, updated: 0, preserved: 0 };

    const fs = await import('fs/promises');
    const items = parseLearningPlanCSV(await fs.readFile(templatePath, 'utf-8'));
    const byKey = new Map(existing.map((event) => [`${event.templateWeek}:${event.templateDay}`, event]));
    const mondayByWeek = new Map(existing.filter((event) => getDayOfWeek(event.templateDay) === 1).map((event) => [event.templateWeek, event]));
    const anchor = existing[0]!;
    const startDate = new Date(anchor.startAt);
    const anchorOffset = (anchor.templateWeek - 1) * 7 + ((getDayOfWeek(anchor.templateDay) + 6) % 7);
    startDate.setDate(startDate.getDate() - anchorOffset);
    startDate.setHours(9, 0, 0, 0);

    const pointIds = new Map((rawDb.prepare('SELECT code, id FROM knowledge_points').all() as Array<{ code: string; id: string }>).map((point) => [point.code, point.id]));
    const update = rawDb.prepare(`
      UPDATE plan_events
      SET title = ?, description = ?, knowledge_point_id = ?, updated_at = ?
      WHERE id = ?
    `);
    const updateSchedule = rawDb.prepare('UPDATE plan_events SET start_at = ?, end_at = ?, updated_at = ? WHERE id = ?');
    const now = new Date().toISOString();
    const inserts: NewPlanEvent[] = [];
    let updated = 0;
    let preserved = 0;

    rawDb.transaction(() => {
      for (const item of items) {
        const firstCode = codesForPlanDay(item.week, item.day)[0];
        const knowledgePointId = firstCode ? pointIds.get(firstCode) ?? null : null;
        const description = describeTemplateItem(item);
        const existingEvent = byKey.get(`${item.week}:${item.day}`);
        if (existingEvent) {
          if (existingEvent.status !== 'PLANNED' || existingEvent.hasCheckin) {
            preserved++;
            continue;
          }
          const monday = mondayByWeek.get(item.week);
          const needsScheduleFix = getDayOfWeek(item.day) === 0 && monday && new Date(existingEvent.startAt) < new Date(monday.startAt);
          const needsContentUpdate = existingEvent.title !== item.learningTopic
            || existingEvent.description !== description
            || existingEvent.knowledgePointId !== knowledgePointId;
          if (!needsContentUpdate && !needsScheduleFix) continue;
          if (needsContentUpdate) update.run(item.learningTopic, description, knowledgePointId, now, existingEvent.id);
          if (needsScheduleFix) {
            updateSchedule.run(
              new Date(new Date(existingEvent.startAt).getTime() + 7 * 86_400_000).toISOString(),
              new Date(new Date(existingEvent.endAt).getTime() + 7 * 86_400_000).toISOString(),
              now,
              existingEvent.id,
            );
          }
          updated++;
          continue;
        }

        const planDate = calculatePlanDate(startDate, item.week, getDayOfWeek(item.day));
        planDate.setHours(9, 0, 0, 0);
        const endAt = new Date(planDate);
        endAt.setHours(17, 0, 0, 0);
        inserts.push({
          id: uuidv4(),
          eventType: 'LEARNING',
          title: item.learningTopic,
          description,
          startAt: planDate.toISOString(),
          endAt: endAt.toISOString(),
          allDay: false,
          status: 'PLANNED',
          priority: 3,
          sourceType: 'TEMPLATE',
          knowledgePointId: knowledgePointId ?? undefined,
          templateWeek: item.week,
          templateDay: item.day,
          createdAt: now,
          updatedAt: now,
        });
      }
    })();
    if (inserts.length > 0) await db.insert(planEvents).values(inserts);
    return { created: inserts.length, updated, preserved };
  }

  /** 兼容旧调用：同步时补齐缺失的周末事件。 */
  async ensureSevenDayTemplate(templatePath: string): Promise<number> {
    return (await this.syncTemplatePlan(templatePath)).created;
  }

  /**
   * 预览从模板生成计划
   */
  async previewFromTemplate(
    templatePath: string,
    options: PlanImportOptions
  ): Promise<PlanImportPreview> {
    // 读取模板文件
    const fs = await import('fs/promises');
    const csvContent = await fs.readFile(templatePath, 'utf-8');
    
    // 解析 CSV
    const items = parseLearningPlanCSV(csvContent);
    
    // 计算开始日期
    const startDate = new Date(options.startDate + 'T00:00:00');
    
    // 按周分组
    const weeks: Map<number, { week: number; theme: string; itemCount: number }> = new Map();
    
    const previewItems = items.map(item => {
      // 更新周统计
      if (!weeks.has(item.week)) {
        weeks.set(item.week, {
          week: item.week,
          theme: item.theme,
          itemCount: 0,
        });
      }
      weeks.get(item.week)!.itemCount++;
      
      // 计算日期
      const dayOfWeek = getDayOfWeek(item.day);
      const planDate = calculatePlanDate(startDate, item.week, dayOfWeek);
      
      return {
        week: item.week,
        day: item.day,
        date: formatLocalDate(planDate),
        title: item.learningTopic,
        learningTopic: item.learningTopic,
        practiceTask: item.practiceTask,
      };
    });
    
    return {
      totalItems: items.length,
      weeks: Array.from(weeks.values()),
      items: previewItems,
    };
  }
  
  /**
   * 执行计划导入
   */
  async importFromTemplate(
    templatePath: string,
    options: PlanImportOptions
  ): Promise<{ imported: number; events: PlanEventRecord[] }> {
    // 读取模板文件
    const fs = await import('fs/promises');
    const csvContent = await fs.readFile(templatePath, 'utf-8');
    
    // 解析 CSV
    const items = parseLearningPlanCSV(csvContent);
    
    // 计算开始日期
    const startDate = new Date(options.startDate + 'T00:00:00');
    const pointIds = new Map((rawDb.prepare('SELECT code, id FROM knowledge_points').all() as Array<{ code: string; id: string }>).map((point) => [point.code, point.id]));
    
    const now = new Date().toISOString();
    const events: NewPlanEvent[] = [];
    
    for (const item of items) {
      const dayOfWeek = getDayOfWeek(item.day);
      const planDate = calculatePlanDate(startDate, item.week, dayOfWeek);
      
      // 创建事件时间（默认 09:00-17:00）
      const startAt = new Date(planDate);
      startAt.setHours(9, 0, 0, 0);
      
      const endAt = new Date(planDate);
      endAt.setHours(17, 0, 0, 0);
      
      events.push({
        id: uuidv4(),
        eventType: 'LEARNING',
        title: `${item.learningTopic}`,
        description: describeTemplateItem(item),
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        allDay: false,
        status: 'PLANNED',
        priority: 3,
        sourceType: 'TEMPLATE',
        knowledgePointId: pointIds.get(codesForPlanDay(item.week, item.day)[0] ?? ''),
        templateWeek: item.week,
        templateDay: item.day,
        createdAt: now,
        updatedAt: now,
      });
    }
    
    // 批量插入
    if (events.length > 0) {
      await db.insert(planEvents).values(events);
    }
    
    // 查询插入的记录
    const insertedEvents = await db.select()
      .from(planEvents)
      .where(eq(planEvents.sourceType, 'TEMPLATE'))
      .orderBy(planEvents.startAt);
    
    return {
      imported: events.length,
      events: insertedEvents,
    };
  }
  
  /**
   * 查询日历事件
   */
  async getEvents(options: {
    from: string;
    to: string;
    eventType?: EventType;
    status?: PlanEventStatus;
  }): Promise<PlanEventWithLearningBrief[]> {
    const conditions = [
      gte(planEvents.startAt, options.from),
      lte(planEvents.startAt, options.to),
    ];
    
    if (options.eventType) {
      conditions.push(eq(planEvents.eventType, options.eventType));
    }
    
    if (options.status) {
      conditions.push(eq(planEvents.status, options.status));
    }
    
    const records = await db.select()
      .from(planEvents)
      .where(and(...conditions))
      .orderBy(planEvents.startAt);
    return enrichEvents(records);
  }
  
  /**
   * 获取单个事件
   */
  async getEvent(id: string): Promise<PlanEventRecord | null> {
    const results = await db.select()
      .from(planEvents)
      .where(eq(planEvents.id, id))
      .limit(1);
    
    return results[0] ?? null;
  }
  
  /**
   * 创建事件
   */
  async createEvent(data: Omit<NewPlanEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<PlanEventRecord> {
    const now = new Date().toISOString();
    
    const [event] = await db.insert(planEvents).values({
      ...data,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    }).returning();
    
    return requireRecord(event, '创建计划事件');
  }
  
  /**
   * 更新事件（改期、描述等）
   */
  async updateEvent(
    id: string,
    data: Partial<Pick<NewPlanEvent, 'title' | 'description' | 'startAt' | 'endAt' | 'priority' | 'status'>>
  ): Promise<PlanEventRecord | null> {
    const now = new Date().toISOString();
    
    const [updated] = await db.update(planEvents)
      .set({ ...data, updatedAt: now })
      .where(eq(planEvents.id, id))
      .returning();
    
    return updated ?? null;
  }
  
  /**
   * 打卡（完成、部分完成、跳过）
   */
  async checkin(
    eventId: string,
    data: {
      result: 'COMPLETED' | 'PARTIAL' | 'SKIPPED' | 'RESCHEDULED';
      actualMinutes?: number;
      noteMd?: string;
      energyLevel?: number;
      difficultyLevel?: number;
    }
  ): Promise<{ checkin: CheckinRecord; event: PlanEventRecord }> {
    const now = new Date().toISOString();
    
    // 创建打卡记录
    const [checkin] = await db.insert(checkins).values({
      id: uuidv4(),
      planEventId: eventId,
      result: data.result,
      actualMinutes: data.actualMinutes,
      noteMd: data.noteMd,
      energyLevel: data.energyLevel,
      difficultyLevel: data.difficultyLevel,
      checkedAt: now,
      createdAt: now,
    }).returning();
    
    // 更新事件状态
    const eventStatus = data.result === 'COMPLETED' ? 'COMPLETED' :
                        data.result === 'PARTIAL' ? 'PARTIAL' :
                        data.result === 'SKIPPED' ? 'SKIPPED' : 'RESCHEDULED';
    
    const [event] = await db.update(planEvents)
      .set({ status: eventStatus, updatedAt: now })
      .where(eq(planEvents.id, eventId))
      .returning();
    
    return {
      checkin: requireRecord(checkin, '创建打卡记录'),
      event: requireRecord(event, '更新计划事件'),
    };
  }
  
  /**
   * 改期（创建新事件，保留原事件）
   */
  async reschedule(
    eventId: string,
    newStartAt: string,
    newEndAt: string
  ): Promise<{ original: PlanEventRecord; newEvent: PlanEventRecord }> {
    const now = new Date().toISOString();
    
    // 获取原事件
    const original = await this.getEvent(eventId);
    if (!original) {
      throw new Error('事件不存在');
    }
    
    // 创建新事件
    const newEventData: NewPlanEvent = {
      ...original,
      id: uuidv4(),
      startAt: newStartAt,
      endAt: newEndAt,
      status: 'PLANNED',
      rescheduledFromId: eventId,
      createdAt: now,
      updatedAt: now,
    };
    
    const [createdEvent] = await db.insert(planEvents).values(newEventData).returning();
    const newEvent = requireRecord(createdEvent, '创建改期事件');
    
    // 更新原事件状态
    await db.update(planEvents)
      .set({ status: 'RESCHEDULED', rescheduledToId: newEvent.id, updatedAt: now })
      .where(eq(planEvents.id, eventId));
    
    const updatedOriginal = await this.getEvent(eventId);
    
    return {
      original: requireRecord(updatedOriginal ?? undefined, '读取原计划事件'),
      newEvent,
    };
  }
  
  /**
   * 获取今日计划
   */
  async getTodayPlan(date: string): Promise<{
    events: PlanEventWithLearningBrief[];
    retests: PlanEventWithLearningBrief[]; // 待复测事件
    stats: {
      total: number;
      completed: number;
      inProgress: number;
      planned: number;
    };
  }> {
    // 获取当天的开始和结束时间
    const startOfDay = new Date(date + 'T00:00:00Z');
    const endOfDay = new Date(date + 'T23:59:59Z');
    
    // 查询当天事件
    const eventRecords = await db.select()
      .from(planEvents)
      .where(and(
        gte(planEvents.startAt, startOfDay.toISOString()),
        lte(planEvents.startAt, endOfDay.toISOString())
      ))
      .orderBy(planEvents.startAt);
    
    // 查询待复测事件（复测日期在未来 7 天内）
    const retestDate = new Date(date);
    retestDate.setDate(retestDate.getDate() + 7);
    
    const retestRecords = await db.select()
      .from(planEvents)
      .where(and(
        eq(planEvents.eventType, 'RETEST'),
        gte(planEvents.startAt, date),
        lte(planEvents.startAt, retestDate.toISOString())
      ))
      .orderBy(planEvents.startAt);
    const events = enrichEvents(eventRecords);
    const retests = enrichEvents(retestRecords);
    
    // 统计
    const stats = {
      total: events.length,
      completed: events.filter(e => e.status === 'COMPLETED').length,
      inProgress: events.filter(e => e.status === 'IN_PROGRESS').length,
      planned: events.filter(e => e.status === 'PLANNED').length,
    };
    
    return { events, retests, stats };
  }
  
  /**
   * 获取每日时间块模板
   */
  async getDailyScheduleTemplate(): Promise<Array<{
    timeBlock: string;
    startHour: number;
    startMinute: number;
    durationMinutes: number;
  }>> {
    // 默认时间块（从 daily-8h-learning-schedule.csv）
    return [
      { timeBlock: '计划', startHour: 9, startMinute: 0, durationMinutes: 30 },
      { timeBlock: '系统学习', startHour: 9, startMinute: 30, durationMinutes: 90 },
      { timeBlock: '基础训练', startHour: 11, startMinute: 0, durationMinutes: 60 },
      { timeBlock: '项目实战', startHour: 14, startMinute: 0, durationMinutes: 150 },
      { timeBlock: '输出沉淀', startHour: 16, startMinute: 30, durationMinutes: 60 },
      { timeBlock: '求职校准', startHour: 19, startMinute: 30, durationMinutes: 60 },
      { timeBlock: '复盘', startHour: 20, startMinute: 30, durationMinutes: 30 },
    ];
  }

  async saveDailyReview(reviewDate: string, summaryMd: string) {
    const now = new Date().toISOString();
    const day = await this.getTodayPlan(reviewDate);
    const plannedCount = day.events.length;
    const completedCount = day.events.filter((event) => event.status === 'COMPLETED').length;
    const partialCount = day.events.filter((event) => event.status === 'PARTIAL').length;
    const skippedCount = day.events.filter((event) => event.status === 'SKIPPED').length;

    const [review] = await db.insert(dailyReviews).values({
      id: uuidv4(),
      reviewDate,
      plannedCount,
      completedCount,
      partialCount,
      skippedCount,
      summaryMd,
      totalMinutes: 0,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: dailyReviews.reviewDate,
      set: { plannedCount, completedCount, partialCount, skippedCount, summaryMd, updatedAt: now },
    }).returning();

    return requireRecord(review, '保存每日复盘');
  }

  async getLeaveDays(from: string, to: string) {
    return db.select()
      .from(leaveDays)
      .where(and(gte(leaveDays.leaveDate, from), lte(leaveDays.leaveDate, to)))
      .orderBy(leaveDays.leaveDate);
  }

  /** 请假当天及之后尚未完成的学习计划整体顺延一天。 */
  async takeLeave(leaveDate: string, reason?: string) {
    const existing = db.select().from(leaveDays).where(eq(leaveDays.leaveDate, leaveDate)).get();
    if (existing) throw new Error('这一天已经请过假，计划无需再次顺延');

    const start = `${leaveDate}T00:00:00.000Z`;
    const events = rawDb.prepare(`
      SELECT id, start_at AS startAt, end_at AS endAt
      FROM plan_events
      WHERE start_at >= ?
        AND event_type IN ('LEARNING', 'ASSESSMENT', 'RETEST', 'PROJECT_OUTPUT', 'REVIEW')
        AND status IN ('PLANNED', 'IN_PROGRESS')
      ORDER BY start_at DESC
    `).all(start) as Array<{ id: string; startAt: string; endAt: string }>;

    const now = new Date().toISOString();
    const record = {
      id: uuidv4(),
      leaveDate,
      reason: reason?.trim() || null,
      shiftedEventCount: events.length,
      createdAt: now,
    };

    rawDb.transaction(() => {
      const update = rawDb.prepare('UPDATE plan_events SET start_at = ?, end_at = ?, updated_at = ? WHERE id = ?');
      for (const event of events) {
        update.run(
          new Date(new Date(event.startAt).getTime() + 86_400_000).toISOString(),
          new Date(new Date(event.endAt).getTime() + 86_400_000).toISOString(),
          now,
          event.id
        );
      }
      db.insert(leaveDays).values(record).run();
    })();

    return record;
  }
}

function requireRecord<T>(record: T | undefined, action: string): T {
  if (!record) {
    throw new Error(`${action}失败：数据库未返回记录`);
  }
  return record;
}

// 导出单例
export const planService = new PlanService();
