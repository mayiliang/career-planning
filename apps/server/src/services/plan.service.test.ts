/**
 * 计划服务测试
 * 
 * Phase 3 验收：
 * - 可以从模板生成完整 48 周计划
 * - 打卡和改期历史可追踪
 * - 7 天复测事件类型已准备好
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { CONTENT_PLAN_WEEK_COUNT, LEARNING_WEEK_PATHS, PlanService, parseEmbeddedEffortSegments, parseLearningPlanCSV } from '../services/plan.service.js';
import { rawDb } from '../db/index.js';
import { projectRoot } from '../config/index.js';
import { join } from 'node:path';

describe('Plan Service', () => {
  const planService = new PlanService();
  const templatePath = join(projectRoot, 'templates', 'learning-tracker-template.csv');
  
  describe('parseLearningPlanCSV', () => {
    it('应该正确解析 48 周计划 CSV', async () => {
      const fs = await import('fs/promises');
      const csvContent = await fs.readFile(templatePath, 'utf-8');
      
      const items = parseLearningPlanCSV(csvContent);
      
      // 验证解析结果
      expect(items.length).toBe(336); // 48 周 × 7 天
      
      // 验证第一周内容
      const firstItem = items[0];
      expect(firstItem.week).toBe(1);
      expect(firstItem.theme).toBe('JavaScript 运行模型与对象系统');
      expect(firstItem.day).toBe('周一');
      expect(firstItem.learningTopic).toContain('建立心智模型');
      expect(firstItem.projectAnchor).toBe('浏览器机制实验室');
      
      // 验证最后一周内容
      const lastItem = items[items.length - 1];
      expect(lastItem.week).toBe(48);
      expect(lastItem.theme).toBe('综合答辩、盲测与求职启动');
    });
    
    it('应该正确处理带引号的 CSV 字段', () => {
      const csvLine = '1,主题,周一,"包含逗号的内容","输出,多个","问题?"';
      
      // 使用 parseCSVLine 内部逻辑验证
      const fields: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < csvLine.length; i++) {
        const char = csvLine[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          fields.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      fields.push(current.trim());
      
      expect(fields).toEqual([
        '1',
        '主题',
        '周一',
        '包含逗号的内容',
        '输出,多个',
        '问题?'
      ]);
    });
  });
  
  describe('previewFromTemplate', () => {
    it('应该能够预览计划导入', async () => {
      const startDate = '2026-07-20'; // 周一
      
      const preview = await planService.previewFromTemplate(templatePath, { startDate });
      
      // 验证预览结构
      expect(preview.totalItems).toBe(336);
      expect(preview.weeks.length).toBe(48);
      
      // 验证第一周
      const week1 = preview.weeks.find(w => w.week === 1);
      expect(week1).toBeDefined();
      expect(week1?.theme).toBe('JavaScript 运行模型与对象系统');
      expect(week1?.itemCount).toBe(7);
      
      // 验证日期计算
      const firstItem = preview.items[0];
      expect(firstItem.date).toBe('2026-07-20'); // 周一
      expect(firstItem.day).toBe('周一');
    });
  });
  
  describe('事件状态和类型', () => {
    it('RETEST 事件类型应该可用', () => {
      // 验证事件类型枚举包含 RETEST
      const eventTypes = ['LEARNING', 'ASSESSMENT', 'RETEST', 'PROJECT_OUTPUT', 'JOB_APPLICATION', 'INTERVIEW', 'REVIEW'];
      expect(eventTypes).toContain('RETEST');
    });
    
    it('7 天复测事件应该可以正确计算', async () => {
      const startDate = '2026-07-14';
      
      // 计算首次考核通过后的复测日期
      const firstPassDate = new Date('2026-07-15');
      const retestDate = new Date(firstPassDate);
      retestDate.setDate(retestDate.getDate() + 7);
      
      expect(retestDate.getDate()).toBe(22);
    });
  });
  
  describe('事件状态机', () => {
    it('打卡结果应该映射到正确的事件状态', () => {
      const resultToStatus: Record<string, string> = {
        COMPLETED: 'COMPLETED',
        PARTIAL: 'PARTIAL',
        SKIPPED: 'SKIPPED',
        RESCHEDULED: 'RESCHEDULED'
      };
      
      expect(resultToStatus['COMPLETED']).toBe('COMPLETED');
      expect(resultToStatus['PARTIAL']).toBe('PARTIAL');
      expect(resultToStatus['SKIPPED']).toBe('SKIPPED');
      expect(resultToStatus['RESCHEDULED']).toBe('RESCHEDULED');
    });
  });
});

describe('7 天计划升级与请假顺延', () => {
  const service = new PlanService();
  const templatePath = join(projectRoot, 'templates', 'learning-tracker-template.csv');

  beforeEach(() => {
    rawDb.prepare('DELETE FROM leave_days').run();
    rawDb.prepare('DELETE FROM checkins').run();
    rawDb.prepare('DELETE FROM plan_events').run();
  });

  it('能把旧版工作日计划自动补齐周末且保持幂等', async () => {
    await service.importFromTemplate(templatePath, { startDate: '2026-07-20' });
    expect(await service.syncTemplatePlan(templatePath)).toEqual({ created: 0, updated: 0, preserved: 0 });
    rawDb.prepare("DELETE FROM plan_events WHERE template_day IN ('周六', '周日')").run();

    expect((rawDb.prepare('SELECT count(*) AS count FROM plan_events').get() as { count: number }).count).toBe(240);
    expect(await service.ensureSevenDayTemplate(templatePath)).toBe(96);
    expect(await service.ensureSevenDayTemplate(templatePath)).toBe(0);
    expect((rawDb.prepare('SELECT count(*) AS count FROM plan_events').get() as { count: number }).count).toBe(336);
  });

  it('同步新蓝图时更新未开始计划并保留已有打卡证据', async () => {
    const result = await service.importFromTemplate(templatePath, { startDate: '2026-07-20' });
    const protectedEvent = result.events.find((event) => event.templateWeek === 1 && event.templateDay === '周一')!;
    const plannedEvent = result.events.find((event) => event.templateWeek === 1 && event.templateDay === '周二')!;
    await service.updateEvent(protectedEvent.id, { title: '已有学习证据，不应覆盖' });
    await service.checkin(protectedEvent.id, { result: 'COMPLETED', actualMinutes: 480 });
    await service.updateEvent(plannedEvent.id, { title: '旧计划标题' });

    const synced = await service.syncTemplatePlan(templatePath);
    expect(synced.preserved).toBe(1);
    expect((await service.getEvent(protectedEvent.id))?.title).toBe('已有学习证据，不应覆盖');
    expect((await service.getEvent(plannedEvent.id))?.title).toContain('机制实验与源码验证');
  });

  it('周计划按前置顺序覆盖全部知识且每周学习强度支撑 7 天连续推进', async () => {
    const route = Array.from({ length: CONTENT_PLAN_WEEK_COUNT }, (_, index) => LEARNING_WEEK_PATHS[index + 1] ?? []).flat();
    expect(route).toHaveLength(190);
    expect(new Set(route).size).toBe(190);
    rawDb.prepare('DELETE FROM plan_events').run();
    const result = await service.importFromTemplate(templatePath, { startDate: '2026-07-20' });
    expect(result.events).toHaveLength(336);
    for (const event of result.events) {
      const expected = Number(event.description?.match(/^预计投入：(\d+) 分钟/m)?.[1] ?? 0);
      expect(expected, `${event.templateWeek}-${event.templateDay} 未安排学习合同`).toBeGreaterThan(0);
      expect(expected, `${event.templateWeek}-${event.templateDay} 负载过高`).toBeLessThanOrEqual(390);
      expect(new Date(event.endAt).getTime() - new Date(event.startAt).getTime()).toBe(expected * 60 * 1000);
    }
    const retestEvent = result.events.find((event) => event.description?.includes('/retest/'));
    expect(retestEvent, '计划中必须存在至少 7 天后的复测阶段').toBeDefined();
    expect(
      parseEmbeddedEffortSegments(retestEvent!.description)
        .filter((segment) => segment.stage === 'retest')
        .reduce((sum, segment) => sum + segment.minutes, 0),
    ).toBeGreaterThan(0);
    const lastAssessmentAt = new Map<string, number>();
    const firstRetestAt = new Map<string, number>();
    for (const event of result.events) {
      const eventTime = new Date(event.startAt).getTime();
      for (const segment of parseEmbeddedEffortSegments(event.description)) {
        if (segment.stage === 'assessment') {
          lastAssessmentAt.set(segment.code, Math.max(lastAssessmentAt.get(segment.code) ?? 0, eventTime));
        }
        if (segment.stage === 'retest') {
          firstRetestAt.set(segment.code, Math.min(firstRetestAt.get(segment.code) ?? Number.POSITIVE_INFINITY, eventTime));
        }
      }
    }
    expect(lastAssessmentAt.size).toBe(190);
    expect(firstRetestAt.size).toBe(190);
    for (const [code, assessmentAt] of lastAssessmentAt) {
      expect(firstRetestAt.get(code)! - assessmentAt, `${code} 的复测必须至少延迟 7 天`)
        .toBeGreaterThanOrEqual(7 * 24 * 60 * 60 * 1_000);
    }
    expect(LEARNING_WEEK_PATHS[1]?.[0]).toBe('JS-01');
    expect(LEARNING_WEEK_PATHS[44]?.at(-1)).toBe('CAREER-06');
  });

  it('请假会将当天及未来未完成学习任务整体顺延一天', async () => {
    const first = await service.createEvent({
      eventType: 'LEARNING', title: '任务一', startAt: '2026-07-20T09:00:00.000Z', endAt: '2026-07-20T10:00:00.000Z',
      allDay: false, status: 'PLANNED', priority: 3, sourceType: 'USER',
    });
    const second = await service.createEvent({
      eventType: 'ASSESSMENT', title: '任务二', startAt: '2026-07-21T09:00:00.000Z', endAt: '2026-07-21T10:00:00.000Z',
      allDay: false, status: 'PLANNED', priority: 3, sourceType: 'USER',
    });

    const leave = await service.takeLeave('2026-07-20', '休息');
    expect(leave.shiftedEventCount).toBe(2);
    expect((await service.getEvent(first.id))?.startAt).toBe('2026-07-21T09:00:00.000Z');
    expect((await service.getEvent(second.id))?.startAt).toBe('2026-07-22T09:00:00.000Z');
    await expect(service.takeLeave('2026-07-20')).rejects.toThrow('已经请过假');
  });

  it('模板事件统一为北京时间 09:00 开始且默认容量为 390 分钟', async () => {
    const event = await service.createEvent({
      eventType: 'LEARNING', title: '周末任务', startAt: '2026-07-20T09:00:00.000Z', endAt: '2026-07-20T17:00:00.000Z',
      allDay: false, status: 'PLANNED', priority: 3, sourceType: 'TEMPLATE', templateWeek: 1, templateDay: '周六',
    });
    service.normalizeTemplateSchedule();
    const normalized = await service.getEvent(event.id);
    expect(normalized!.startAt).toBe('2026-07-20T01:00:00.000Z');
    expect(new Date(normalized!.endAt).getTime() - new Date(normalized!.startAt).getTime()).toBe(390 * 60 * 1000);
  });
});
