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
  weekTheme: string;
  learningContent: string[];
  masteryGoals: Array<{ code: string; text: string }>;
  tasks: Array<{ code: string; text: string }>;
  outputs: string[];
  reviewQuestion: string;
  prerequisitesReady: boolean;
  pendingPrerequisiteCount: number;
  knowledgePoints: LearningBriefPoint[];
}

export type PlanEventWithLearningBrief = PlanEventRecord & { learningBrief: PlanLearningBrief | null };

/**
 * 16 周知识编排。前 15 周覆盖全部 132 个知识点，第 16 周用跨领域项目完成综合验证。
 * 每周 7 天按顺序自动切分为 1-2 个明确知识点。
 */
export const LEARNING_WEEK_PATHS: Record<number, string[]> = {
  1: ['CAREER-01', 'CAREER-02', 'CAREER-03', 'CAREER-04', 'CAREER-05', 'CAREER-06'],
  2: ['JS-01', 'JS-02', 'JS-03', 'JS-04', 'JS-05', 'JS-06', 'WEB-01', 'WEB-02', 'BROWSER-01', 'NET-01', 'SEC-01'],
  3: ['TS-01', 'TS-02', 'TS-03', 'TS-04', 'TS-05', 'TS-06', 'TS-07', 'TS-08'],
  4: ['REACT-01', 'REACT-02', 'REACT-03', 'REACT-04', 'REACT-05', 'REACT-06', 'REACT-07', 'REACT-08', 'VUE-01'],
  5: ['VUE-02', 'VUE-03', 'VUE-04', 'VUE-05', 'VUE-06', 'VUE-07', 'VUE-08', 'VUE-09', 'VUE-10'],
  6: ['UMI-01', 'UMI-02', 'UMI-03', 'UMI-04', 'ANTD-01', 'ANTD-02', 'ANTD-03', 'ANTD-04'],
  7: ['BIZ-01', 'BIZ-02', 'BIZ-03', 'BIZ-04', 'BIZ-05', 'BIZ-06', 'BIZ-07', 'BIZ-08'],
  8: ['ENG-01', 'ENG-02', 'ENG-03', 'ENG-04', 'ENG-05', 'TEST-01', 'TEST-02', 'TEST-03', 'ENG-06'],
  9: ['PERF-01', 'PERF-02', 'PERF-03', 'PERF-04', 'H5-01', 'H5-02', 'HYBRID-01', 'H5-03', 'PERF-05'],
  10: ['COMP-01', 'COMP-02', 'DS-01', 'COMP-03', 'PLATFORM-01', 'PLATFORM-02', 'PLATFORM-03'],
  11: ['NODE-01', 'NODE-02', 'NODE-03', 'API-01', 'API-02', 'MCP-01', 'MCP-02', 'AI-01'],
  12: ['AIAPP-01', 'AIAPP-02', 'AIAPP-03', 'AIAPP-04', 'AIAPP-05', 'AIAPP-06', 'AIAPP-07', 'AIAPP-08', 'AIAPP-09', 'AIAPP-10'],
  13: ['AGENT-01', 'AGENT-02', 'AGENT-03', 'AGENT-04', 'AGENT-05', 'AGENT-06', 'AGENT-07', 'AGENT-08', 'AGENT-09', 'AGENT-10'],
  14: ['WEBAI-01', 'WEBAI-02', 'WEBAI-03', 'WEBAI-04', 'WEBAI-05', 'WEBAI-06', 'WEBAI-07', 'WEBAI-08', 'WEBAI-09', 'WEBAI-10'],
  15: ['AIDEV-01', 'AIDEV-02', 'AIDEV-03', 'AIDEV-04', 'AIDEV-05', 'AIDEV-06', 'AIDEV-07', 'AIDEV-08', 'AIDEV-09', 'AIDEV-10'],
  16: ['TS-08', 'VUE-10', 'BIZ-08', 'TEST-03', 'AIAPP-04', 'AGENT-10', 'CAREER-06'],
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
}

/**
 * 解析学习计划 CSV
 * 使用 csv-parse 库正确处理带引号和逗号的字段
 */
export function parseLearningPlanCSV(csvContent: string): PlanTemplateItem[] {
  const weekdays = parsePlanCsv(csvContent).map(({ status: _status, ...item }) => item);
  const result = [...weekdays];
  const weeks = new Map<number, PlanTemplateItem[]>();
  for (const item of weekdays) {
    weeks.set(item.week, [...(weeks.get(item.week) ?? []), item]);
  }

  // 旧模板按工作日编写；运行时为每周补充两天体系复盘与项目验证。
  for (const [week, items] of weeks) {
    const theme = items[0]?.theme ?? `第 ${week} 周`;
    if (!items.some((item) => getDayOfWeek(item.day) === 6)) {
      result.push({
        week,
        theme,
        day: '周六',
        learningTopic: `${theme} · 知识整合`,
        practiceTask: '闭卷复述本周核心模型，把概念、前置关系、易错点和项目证据补进知识脑图',
        output: '本周知识脑图与错题清单',
        reviewQuestion: '我能否不看资料讲清本周知识之间的因果关系？',
      });
    }
    if (!items.some((item) => getDayOfWeek(item.day) === 0)) {
      result.push({
        week,
        theme,
        day: '周日',
        learningTopic: `${theme} · 项目挑战`,
        practiceTask: '选择本周一个知识点，在真实项目或独立 Demo 中完成可运行验证，并记录取舍与结果',
        output: '可运行代码、测试证据与一页复盘',
        reviewQuestion: '这个产出能否经受高级前端面试中的连续追问？',
      });
    }
  }

  return result.sort((a, b) => a.week - b.week || ((getDayOfWeek(a.day) + 6) % 7) - ((getDayOfWeek(b.day) + 6) % 7));
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
  // 计算日偏移量
  const dayOffset = dayOfWeek - 1; // 假设开始日期是周一
  date.setDate(date.getDate() + weekOffset + dayOffset);
  return date;
}

function codesForPlanDay(week: number, day: string): string[] {
  const path = LEARNING_WEEK_PATHS[week] ?? [];
  if (path.length === 0) return [];
  const dayIndex = (getDayOfWeek(day) + 6) % 7;
  const start = Math.floor((dayIndex * path.length) / 7);
  const end = Math.floor(((dayIndex + 1) * path.length) / 7);
  const result = path.slice(start, Math.max(start + 1, end));
  return result.length ? result : [path[Math.min(start, path.length - 1)]!];
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
           kp.pass_criteria_md AS passCriteria
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
  const codes = event.templateWeek && event.templateDay
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
  const pendingPrerequisiteCodes = new Set(
    knowledgePoints.flatMap((point) => point.prerequisites)
      .filter((point) => point.status !== 'MASTERED')
      .map((point) => point.code),
  );
  const domainTitles = [...new Set(selected.map((point) => point.domainTitle))];
  const displayTitle = selected.map((point) => `${point.code} ${point.title}`).join(' + ');

  return {
    displayTitle,
    weekTheme: domainTitles.join(' × '),
    learningContent: selected.map((point) => `${point.code} · ${point.title}`),
    masteryGoals: selected.map((point) => ({ code: point.code, text: concise(point.passCriteria) })),
    tasks: selected.map((point) => ({ code: point.code, text: concise(point.assessmentSpec) })),
    outputs: selected.map((point) => `${point.code}：闭卷回答 + 可运行代码、测试或项目证据`),
    reviewQuestion: `我能否不看资料解释 ${selected.map((point) => point.code).join('、')}，并用今天的产出证明？`,
    prerequisitesReady: pendingPrerequisiteCodes.size === 0,
    pendingPrerequisiteCount: pendingPrerequisiteCodes.size,
    knowledgePoints,
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

  /** 将旧版每周 5 天模板无损补齐为 7 天；已存在的日期不会重复插入。 */
  async ensureSevenDayTemplate(templatePath: string): Promise<number> {
    const existing = rawDb.prepare(`
      SELECT start_at AS startAt, template_week AS templateWeek, template_day AS templateDay
      FROM plan_events
      WHERE source_type = 'TEMPLATE' AND template_week IS NOT NULL AND template_day IS NOT NULL
      ORDER BY start_at ASC
    `).all() as Array<{ startAt: string; templateWeek: number; templateDay: string }>;
    if (existing.length === 0) return 0;

    const first = existing[0];
    if (!first) return 0;
    const firstDate = new Date(`${first.startAt.slice(0, 10)}T00:00:00.000Z`);
    const firstOffset = (first.templateWeek - 1) * 7 + getDayOfWeek(first.templateDay) - 1;
    firstDate.setUTCDate(firstDate.getUTCDate() - firstOffset);

    const fs = await import('fs/promises');
    const items = parseLearningPlanCSV(await fs.readFile(templatePath, 'utf-8'));
    const existingKeys = new Set(existing.map((event) => `${event.templateWeek}:${event.templateDay}`));
    const missing = items.filter((item) => {
      const weekday = getDayOfWeek(item.day);
      return (weekday === 0 || weekday === 6) && !existingKeys.has(`${item.week}:${item.day}`);
    });
    if (missing.length === 0) return 0;

    const now = new Date().toISOString();
    const events: NewPlanEvent[] = missing.map((item) => {
      const planDate = calculatePlanDate(firstDate, item.week, getDayOfWeek(item.day));
      const startAt = new Date(planDate);
      const endAt = new Date(planDate);
      startAt.setHours(9, 0, 0, 0);
      endAt.setHours(17, 0, 0, 0);
      return {
        id: uuidv4(),
        eventType: 'LEARNING',
        title: item.learningTopic,
        description: `实践任务：${item.practiceTask}\n预期产出：${item.output}`,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        allDay: false,
        status: 'PLANNED',
        priority: 3,
        sourceType: 'TEMPLATE',
        templateWeek: item.week,
        templateDay: item.day,
        createdAt: now,
        updatedAt: now,
      };
    });
    await db.insert(planEvents).values(events);
    return events.length;
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
    const startDate = new Date(options.startDate + 'T00:00:00Z');
    
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
        date: planDate.toISOString().slice(0, 10),
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
    const startDate = new Date(options.startDate + 'T00:00:00Z');
    
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
        description: `实践任务：${item.practiceTask}\n预期产出：${item.output}`,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        allDay: false,
        status: 'PLANNED',
        priority: 3,
        sourceType: 'TEMPLATE',
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
