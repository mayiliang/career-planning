/**
 * 计划服务
 * 
 * 日历、用户事件与打卡服务。
 * 推荐学习路线由知识点顺序直接生成，不再从固定周历模板批量制造每日任务。
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

export const BEIJING_TIME_ZONE = 'Asia/Shanghai';
const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function currentBeijingDate(): string {
  return new Date(Date.now() + BEIJING_OFFSET_MS).toISOString().slice(0, 10);
}

function beijingDateToUtcMs(date: string): number {
  return Date.parse(`${date}T00:00:00+08:00`);
}

function addBeijingDays(date: string, days: number): string {
  return new Date(beijingDateToUtcMs(date) + days * DAY_MS + BEIJING_OFFSET_MS).toISOString().slice(0, 10);
}

function beijingDateTimeToIso(date: string, minutesFromMidnight: number): string {
  return new Date(beijingDateToUtcMs(date) + minutesFromMidnight * 60_000).toISOString();
}

type EffortStage = 'study' | 'practice' | 'project' | 'assessment' | 'retest';
type EffortSegment = { code: string; stage: EffortStage; minutes: number };
const EFFORT_STAGES: EffortStage[] = ['study', 'practice', 'project', 'assessment', 'retest'];

export function parseEmbeddedEffortSegments(description: string | null | undefined): EffortSegment[] {
  return description?.match(/^阶段任务：(.+)$/m)?.[1]
    ?.split('、')
    .map((value) => {
      const [code, stage, minutes] = value.split('/');
      return code && EFFORT_STAGES.includes(stage as EffortStage) && Number(minutes) > 0
        ? { code, stage: stage as EffortStage, minutes: Number(minutes) }
        : null;
    })
    .filter((segment): segment is EffortSegment => Boolean(segment)) ?? [];
}

const STAGE_LABELS: Record<EffortStage, string> = {
  study: '资料精读',
  practice: '机制练习',
  project: '项目产出',
  assessment: '严格首考',
  retest: '7 天复测',
};

function concise(text: string, maxLength = 220): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}

function assessmentQuestion(spec: string, number: 1 | 2 | 3 | 4 | 5): string | null {
  const starts = [...spec.matchAll(/首考题\s*[1-5](?:\s*[（(]|\s*[:：])/g)];
  const index = starts.findIndex((start) => new RegExp(`^首考题\\s*${number}`).test(start[0]));
  if (index < 0) return null;
  const start = starts[index]!;
  const segment = spec.slice(start.index, starts[index + 1]?.index ?? spec.length);
  const prefix = new RegExp(`^首考题\\s*${number}(?:\\s*[（(][^）)]+[）)])?\\s*[:：]\\s*`);
  return segment.replace(prefix, '')
    .replace(/；\s*复测变式\s*[:：][\s\S]*$/, '')
    .replace(/。?\s*命题边界\s*[:：][\s\S]*$/, '')
    .trim() || null;
}

function retestVariant(spec: string): string | null {
  return spec.match(/(?:复测变式|M4\s*变式)\s*[:：]\s*([\s\S]*?)(?=。?\s*命题边界\s*[:：]|$)/)?.[1]?.trim() || null;
}

type KnowledgeContextRow = {
  id: string;
  code: string;
  title: string;
  status: string;
  domainCode: string;
  domainTitle: string;
  studyMaterial: string;
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
           kp.study_material_md AS studyMaterial,
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
  const embeddedSegments = parseEmbeddedEffortSegments(event.description);
  const embeddedCodes = event.description?.match(/^知识点：(.+)$/m)?.[1]
    ?.split('、')
    .map((code) => code.trim())
    .filter(Boolean) ?? [];
  // 描述中的知识点快照保证已完成历史不会被后续蓝图重排成另一组知识。
  const codes = embeddedCodes;
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
  const daySegments = embeddedSegments;
  const activeStageLabels = [...new Set(daySegments.map((segment) => STAGE_LABELS[segment.stage]))];
  const capacityMinutes = Math.max(0, Math.round((new Date(event.endAt).getTime() - new Date(event.startAt).getTime()) / 60_000));
  const effort = daySegments.length > 0
      ? {
        studyMinutes: daySegments.filter((segment) => segment.stage === 'study').reduce((sum, segment) => sum + segment.minutes, 0),
        practiceMinutes: daySegments.filter((segment) => segment.stage === 'practice').reduce((sum, segment) => sum + segment.minutes, 0),
        projectMinutes: daySegments.filter((segment) => segment.stage === 'project').reduce((sum, segment) => sum + segment.minutes, 0),
        assessmentMinutes: daySegments.filter((segment) => segment.stage === 'assessment').reduce((sum, segment) => sum + segment.minutes, 0),
        retestMinutes: daySegments.filter((segment) => segment.stage === 'retest').reduce((sum, segment) => sum + segment.minutes, 0),
        estimatedTotalMinutes: daySegments.reduce((sum, segment) => sum + segment.minutes, 0),
      }
      : {
        studyMinutes: selected.reduce((sum, point) => sum + point.studyMinutes, 0),
        practiceMinutes: selected.reduce((sum, point) => sum + point.practiceMinutes, 0),
        projectMinutes: selected.reduce((sum, point) => sum + point.projectMinutes, 0),
        assessmentMinutes: selected.reduce((sum, point) => sum + point.assessmentMinutes, 0),
        retestMinutes: selected.reduce((sum, point) => sum + point.retestMinutes, 0),
        estimatedTotalMinutes: selected.reduce((sum, point) => sum
          + point.studyMinutes + point.practiceMinutes + point.projectMinutes + point.assessmentMinutes, 0),
      };

  const taskForStage = (segment: EffortSegment) => {
    const point = context.byCode.get(segment.code);
    if (!point) return `${segment.code}：该历史任务对应的知识点已不在当前体系中。`;
    const minimumOutput = assessmentQuestion(point.assessmentSpec, 3);
    const constrainedDebugging = assessmentQuestion(point.assessmentSpec, 4);
    if (segment.stage === 'study') return `阅读本点列出的资料并完成机制、边界与验证笔记：${concise(point.studyMaterial, 520)}`;
    if (segment.stage === 'practice') return `在站内练习区完成并提交此固定任务：${concise(minimumOutput ?? point.assessmentSpec, 760)}`;
    if (segment.stage === 'project') return `完成本点最小产出并用受限故障回归验收：${concise(`${minimumOutput ?? ''} ${constrainedDebugging ?? ''}`, 900)}`;
    if (segment.stage === 'retest') return `完成本点 M4 单变量复测并保存新证据：${concise(retestVariant(point.assessmentSpec) ?? point.assessmentSpec, 720)}`;
    return `启动本点掌握挑战，完成首考题 1–5，并按通过标准验收：${concise(point.passCriteria, 520)}`;
  };

  return {
    displayTitle,
    phase: '知识点任务',
    weekTheme: domainTitles.join(' × '),
    weekOutcome: `完成 ${selected.map((point) => point.code).join('、')} 的资料、站内练习或掌握挑战，并保存验收结果`,
    projectAnchor: '对应知识点详情页的站内练习与掌握挑战',
    dailyFocus: activeStageLabels.length ? activeStageLabels.join(' → ') : '知识点学习与验收',
    assessmentMode: '练习先执行本地结构与证据检查，再由 AI 复核语义；掌握挑战按本点严格考核合同评分',
    reviewCadence: ['完成资料与笔记', '完成站内练习并保存验证', '按需启动 M1～M3', '首考至少 7 天后完成 M4'],
    learningContent: daySegments.length > 0
      ? daySegments.map((segment) => `${segment.code} ${context.byCode.get(segment.code)?.title ?? ''} · ${STAGE_LABELS[segment.stage]} · ${segment.minutes} 分钟`)
      : selected.map((point) => `${point.code} ${point.title}`),
    masteryGoals: selected.map((point) => ({ code: point.code, text: concise(point.passCriteria) })),
    tasks: daySegments.length > 0
      ? daySegments.map((segment) => ({
          code: segment.code,
          text: taskForStage(segment),
        }))
      : selected.map((point) => ({ code: point.code, text: `完成本点站内练习或掌握挑战：${concise(point.assessmentSpec, 320)}` })),
    outputs: selected.map((point) => `${point.code}：${concise(point.passCriteria, 260)}`),
    reviewQuestion: `我是否已经为 ${selected.map((point) => point.code).join('、')} 保存了本点要求的输入、产出、验证证据和失败修复记录？`,
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

/**
 * 计划服务
 */
export class PlanService {
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
    const startOfDay = beijingDateTimeToIso(date, 0);
    const endOfDay = beijingDateTimeToIso(date, 24 * 60 - 1);
    
    // 查询当天事件
    const eventRecords = await db.select()
      .from(planEvents)
      .where(and(
        gte(planEvents.startAt, startOfDay),
        lte(planEvents.startAt, endOfDay)
      ))
      .orderBy(planEvents.startAt);
    
    // 查询待复测事件（复测日期在未来 7 天内）
    const retestDate = addBeijingDays(date, 7);
    
    const retestRecords = await db.select()
      .from(planEvents)
      .where(and(
        eq(planEvents.eventType, 'RETEST'),
        gte(planEvents.startAt, beijingDateTimeToIso(date, 0)),
        lte(planEvents.startAt, beijingDateTimeToIso(retestDate, 24 * 60 - 1))
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

    const start = beijingDateTimeToIso(leaveDate, 0);
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
