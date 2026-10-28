/** 日历事件、打卡与请假：运行时响应校验与业务接口。 */
import { z } from 'zod';
import { request } from '../http';

const EventTypeSchema = z.enum([
  'LEARNING', 'ASSESSMENT', 'RETEST', 'PROJECT_OUTPUT',
  'JOB_APPLICATION', 'INTERVIEW', 'REVIEW'
]);

const EventStatusSchema = z.enum([
  'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'PARTIAL', 'SKIPPED', 'RESCHEDULED'
]);

const CheckinResultSchema = z.enum(['COMPLETED', 'PARTIAL', 'SKIPPED', 'RESCHEDULED']);

const LearningBriefPointSchema = z.object({
  id: z.string(),
  code: z.string(),
  title: z.string(),
  status: z.string(),
  domainCode: z.string(),
  domainTitle: z.string(),
  prerequisites: z.array(z.object({
    id: z.string(),
    code: z.string(),
    title: z.string(),
    status: z.string(),
  })),
});

const PlanLearningBriefSchema = z.object({
  displayTitle: z.string(),
  phase: z.string(),
  weekTheme: z.string(),
  weekOutcome: z.string(),
  projectAnchor: z.string(),
  dailyFocus: z.string(),
  assessmentMode: z.string(),
  reviewCadence: z.array(z.string()),
  learningContent: z.array(z.string()),
  masteryGoals: z.array(z.object({ code: z.string(), text: z.string() })),
  tasks: z.array(z.object({ code: z.string(), text: z.string() })),
  outputs: z.array(z.string()),
  reviewQuestion: z.string(),
  prerequisitesReady: z.boolean(),
  pendingPrerequisiteCount: z.number(),
  knowledgePoints: z.array(LearningBriefPointSchema),
  effort: z.object({
    studyMinutes: z.number(),
    practiceMinutes: z.number(),
    projectMinutes: z.number(),
    assessmentMinutes: z.number(),
    retestMinutes: z.number(),
    estimatedTotalMinutes: z.number(),
    capacityMinutes: z.number(),
    utilizationPercent: z.number(),
    overloaded: z.boolean(),
  }),
});

const PlanEventSchema = z.object({
  id: z.string(),
  eventType: EventTypeSchema,
  title: z.string(),
  description: z.string().nullable(),
  startAt: z.string(),
  endAt: z.string(),
  allDay: z.boolean(),
  status: EventStatusSchema,
  priority: z.number(),
  knowledgePointId: z.string().nullable(),
  jobId: z.string().nullable(),
  assessmentSessionId: z.string().nullable(),
  recurrenceRule: z.string().nullable(),
  recurrenceParentId: z.string().nullable(),
  rescheduledToId: z.string().nullable(),
  rescheduledFromId: z.string().nullable(),
  sourceType: z.enum(['TEMPLATE', 'USER', 'SYSTEM']),
  templateWeek: z.number().nullable(),
  templateDay: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  learningBrief: PlanLearningBriefSchema.nullable().optional(),
});

const CheckinSchema = z.object({
  id: z.string(),
  planEventId: z.string(),
  result: CheckinResultSchema,
  actualMinutes: z.number().nullable(),
  noteMd: z.string().nullable(),
  energyLevel: z.number().nullable(),
  difficultyLevel: z.number().nullable(),
  evidencePath: z.string().nullable(),
  checkedAt: z.string(),
  createdAt: z.string(),
});

const TodayPlanSchema = z.object({
  events: z.array(PlanEventSchema),
  retests: z.array(PlanEventSchema),
  stats: z.object({
    total: z.number(),
    completed: z.number(),
    inProgress: z.number(),
    planned: z.number(),
  }),
});

const LeaveDaySchema = z.object({
  id: z.string(),
  leaveDate: z.string(),
  reason: z.string().nullable(),
  shiftedEventCount: z.number(),
  createdAt: z.string(),
});

export const calendarApi = {
  async getCalendarEvents(params: {
    from: string;
    to: string;
    eventType?: string;
    status?: string;
  }) {
    const query = new URLSearchParams();
    query.set('from', params.from);
    query.set('to', params.to);
    if (params.eventType) query.set('eventType', params.eventType);
    if (params.status) query.set('status', params.status);

    return request(`/calendar/events?${query.toString()}`, z.array(PlanEventSchema));
  },

  async getCalendarEvent(id: string) {
    return request(`/calendar/events/${id}`, PlanEventSchema);
  },

  async createCalendarEvent(data: {
    eventType: z.infer<typeof EventTypeSchema>;
    title: string;
    description?: string;
    startAt: string;
    endAt: string;
    allDay?: boolean;
    priority?: number;
    knowledgePointId?: string;
  }) {
    return request(`/calendar/events`, PlanEventSchema, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateCalendarEvent(id: string, data: {
    title?: string;
    description?: string;
    startAt?: string;
    endAt?: string;
    priority?: number;
    status?: z.infer<typeof EventStatusSchema>;
  }) {
    return request(`/calendar/events/${id}`, PlanEventSchema, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async checkinEvent(eventId: string, data: {
    result: z.infer<typeof CheckinResultSchema>;
    actualMinutes?: number;
    noteMd?: string;
    energyLevel?: number;
    difficultyLevel?: number;
  }) {
    return request(`/calendar/events/${eventId}/checkins`, z.object({
      checkin: CheckinSchema,
      event: PlanEventSchema,
    }), {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async rescheduleEvent(eventId: string, data: {
    newStartAt: string;
    newEndAt: string;
  }) {
    return request(`/calendar/events/${eventId}/reschedule`, z.object({
      original: PlanEventSchema,
      newEvent: PlanEventSchema,
    }), {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getTodayPlan(date?: string) {
    const query = date ? `?date=${date}` : '';
    return request(`/calendar/today${query}`, TodayPlanSchema);
  },

  async saveDailyReview(date: string, summaryMd: string) {
    return request(`/calendar/reviews/daily/${date}`, z.object({
      id: z.string(),
      reviewDate: z.string(),
      summaryMd: z.string().nullable(),
      updatedAt: z.string(),
    }).passthrough(), {
      method: 'PUT',
      body: JSON.stringify({ summaryMd }),
    });
  },

  async getLeaveDays(from: string, to: string) {
    return request(`/calendar/leaves?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, z.array(LeaveDaySchema));
  },

  async takeLeave(date: string, reason?: string) {
    return request('/calendar/leaves', LeaveDaySchema, {
      method: 'POST',
      body: JSON.stringify({ date, reason }),
    });
  },
};

export type PlanEvent = z.infer<typeof PlanEventSchema>;

export type Checkin = z.infer<typeof CheckinSchema>;

export type TodayPlan = z.infer<typeof TodayPlanSchema>;

export type PlanLearningBrief = z.infer<typeof PlanLearningBriefSchema>;

export type LearningBriefPoint = z.infer<typeof LearningBriefPointSchema>;

export type LeaveDay = z.infer<typeof LeaveDaySchema>;

export type EventType = z.infer<typeof EventTypeSchema>;

export type EventStatus = z.infer<typeof EventStatusSchema>;

export type CheckinResult = z.infer<typeof CheckinResultSchema>;
