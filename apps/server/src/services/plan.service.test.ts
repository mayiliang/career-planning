import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { rawDb } from '../db/index.js';
import { executeImport } from './import.service.js';
import { PlanService, parseEmbeddedEffortSegments } from './plan.service.js';

describe('Plan Service', () => {
  const service = new PlanService();

  beforeAll(async () => {
    await executeImport();
  });

  beforeEach(() => {
    rawDb.prepare('DELETE FROM checkins').run();
    rawDb.prepare('DELETE FROM plan_events').run();
    rawDb.prepare('DELETE FROM leave_days').run();
  });

  it('不再暴露固定周历模板导入能力', () => {
    expect('importFromTemplate' in service).toBe(false);
    expect('previewFromTemplate' in service).toBe(false);
    expect('syncTemplatePlan' in service).toBe(false);
    expect('getDailyScheduleTemplate' in service).toBe(false);
  });

  it('关联知识点的任务只展示本点具体资料、练习与验收合同', async () => {
    const point = rawDb.prepare("SELECT id FROM knowledge_points WHERE code = 'JS-01'").get() as { id: string };
    await service.createEvent({
      eventType: 'LEARNING',
      title: 'JS-01 资料与练习',
      description: '知识点：JS-01\n阶段任务：JS-01/study/30、JS-01/practice/45',
      startAt: '2026-07-20T01:00:00.000Z',
      endAt: '2026-07-20T02:15:00.000Z',
      allDay: false,
      status: 'PLANNED',
      priority: 1,
      sourceType: 'USER',
      knowledgePointId: point.id,
    });

    const [event] = await service.getEvents({
      from: '2026-07-20T00:00:00.000Z',
      to: '2026-07-20T23:59:59.999Z',
    });
    const brief = event?.learningBrief;
    expect(brief?.knowledgePoints.map((item) => item.code)).toEqual(['JS-01']);
    expect(brief?.learningContent).toEqual([
      expect.stringMatching(/^JS-01 .+资料精读 · 30 分钟$/),
      expect.stringMatching(/^JS-01 .+机制练习 · 45 分钟$/),
    ]);
    expect(brief?.tasks[0]?.text).toContain('阅读本点列出的资料');
    expect(brief?.tasks[0]?.text).toContain('执行上下文');
    expect(brief?.tasks[1]?.text).toContain('在站内练习区完成并提交此固定任务');
    expect(brief?.tasks[1]?.text).toContain('固定 fixture');
    expect(brief?.tasks[1]?.text).toContain('两个独立计数器');
    expect(JSON.stringify(brief)).not.toMatch(/建立心智模型|项目锚点|独立 Demo|周闸门/);
    expect(brief?.effort.estimatedTotalMinutes).toBe(75);
    expect(brief?.effort.overloaded).toBe(false);
  });

  it('没有关联知识点的用户日历事件不会伪装成学习任务', async () => {
    await service.createEvent({
      eventType: 'REVIEW',
      title: '与导师沟通',
      description: '讨论下次会议时间',
      startAt: '2026-07-20T03:00:00.000Z',
      endAt: '2026-07-20T03:30:00.000Z',
      allDay: false,
      status: 'PLANNED',
      priority: 3,
      sourceType: 'USER',
    });
    const [event] = await service.getEvents({
      from: '2026-07-20T00:00:00.000Z',
      to: '2026-07-20T23:59:59.999Z',
    });
    expect(event?.learningBrief).toBeNull();
  });

  it('仍可读取历史事件中已经保存的具体阶段任务', () => {
    expect(parseEmbeddedEffortSegments('阶段任务：REACT-01/study/60、REACT-01/assessment/90')).toEqual([
      { code: 'REACT-01', stage: 'study', minutes: 60 },
      { code: 'REACT-01', stage: 'assessment', minutes: 90 },
    ]);
    expect(parseEmbeddedEffortSegments('阶段任务：泛化复盘')).toEqual([]);
  });

  it('打卡会保存证据并更新事件状态', async () => {
    const event = await service.createEvent({
      eventType: 'ASSESSMENT', title: '具体考核',
      startAt: '2026-07-20T01:00:00.000Z', endAt: '2026-07-20T02:00:00.000Z',
      allDay: false, status: 'PLANNED', priority: 2, sourceType: 'USER',
    });
    const result = await service.checkin(event.id, {
      result: 'COMPLETED', actualMinutes: 55, noteMd: '已保存测试和修复证据。',
    });
    expect(result.event.status).toBe('COMPLETED');
    expect(result.checkin.actualMinutes).toBe(55);
    expect(result.checkin.noteMd).toContain('测试');
  });

  it('请假只顺延已经明确发布的未完成事件', async () => {
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
});
