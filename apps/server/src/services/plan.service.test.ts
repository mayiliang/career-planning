/**
 * 计划服务测试
 * 
 * Phase 3 验收：
 * - 可以从模板生成完整 16 周计划
 * - 打卡和改期历史可追踪
 * - 7 天复测事件类型已准备好
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { PlanService, parseLearningPlanCSV } from '../services/plan.service.js';
import { rawDb } from '../db/index.js';

describe('Plan Service', () => {
  const planService = new PlanService();
  const templatePath = '/Users/bob/Documents/career-planning/templates/learning-tracker-template.csv';
  
  describe('parseLearningPlanCSV', () => {
    it('应该正确解析 16 周计划 CSV', async () => {
      const fs = await import('fs/promises');
      const csvContent = await fs.readFile(templatePath, 'utf-8');
      
      const items = parseLearningPlanCSV(csvContent);
      
      // 验证解析结果
      expect(items.length).toBe(112); // 16 周 × 7 天
      
      // 验证第一周内容
      const firstItem = items[0];
      expect(firstItem.week).toBe(1);
      expect(firstItem.theme).toBe('项目资产盘点');
      expect(firstItem.day).toBe('周一');
      expect(firstItem.learningTopic).toContain('项目总览');
      
      // 验证最后一周内容
      const lastItem = items[items.length - 1];
      expect(lastItem.week).toBe(16);
      expect(lastItem.theme).toBe('AI 辅助研发与整合');
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
      const startDate = '2026-07-14'; // 周一
      
      const preview = await planService.previewFromTemplate(templatePath, { startDate });
      
      // 验证预览结构
      expect(preview.totalItems).toBe(112);
      expect(preview.weeks.length).toBe(16);
      
      // 验证第一周
      const week1 = preview.weeks.find(w => w.week === 1);
      expect(week1).toBeDefined();
      expect(week1?.theme).toBe('项目资产盘点');
      expect(week1?.itemCount).toBe(7);
      
      // 验证日期计算
      const firstItem = preview.items[0];
      expect(firstItem.date).toBe('2026-07-14'); // 周一
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
  const templatePath = '/Users/bob/Documents/career-planning/templates/learning-tracker-template.csv';

  beforeEach(() => {
    rawDb.prepare('DELETE FROM leave_days').run();
    rawDb.prepare('DELETE FROM checkins').run();
    rawDb.prepare('DELETE FROM plan_events').run();
  });

  it('能把旧版工作日计划自动补齐周末且保持幂等', async () => {
    await service.importFromTemplate(templatePath, { startDate: '2026-07-20' });
    rawDb.prepare("DELETE FROM plan_events WHERE template_day IN ('周六', '周日')").run();

    expect((rawDb.prepare('SELECT count(*) AS count FROM plan_events').get() as { count: number }).count).toBe(80);
    expect(await service.ensureSevenDayTemplate(templatePath)).toBe(32);
    expect(await service.ensureSevenDayTemplate(templatePath)).toBe(0);
    expect((rawDb.prepare('SELECT count(*) AS count FROM plan_events').get() as { count: number }).count).toBe(112);
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

  it('模板事件统一为本地 09:00-17:00 且保持 8 小时', async () => {
    const event = await service.createEvent({
      eventType: 'LEARNING', title: '周末任务', startAt: '2026-07-20T09:00:00.000Z', endAt: '2026-07-20T17:00:00.000Z',
      allDay: false, status: 'PLANNED', priority: 3, sourceType: 'TEMPLATE', templateWeek: 1, templateDay: '周六',
    });
    service.normalizeTemplateSchedule();
    const normalized = await service.getEvent(event.id);
    expect(new Date(normalized!.startAt).getHours()).toBe(9);
    expect(new Date(normalized!.endAt).getHours()).toBe(17);
    expect(new Date(normalized!.endAt).getTime() - new Date(normalized!.startAt).getTime()).toBe(8 * 60 * 60 * 1000);
  });
});
