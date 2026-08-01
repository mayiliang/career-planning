import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  acceptOrganizedNote,
  deferPoint,
  getLearningWorkspace,
  getNextBranches,
  getNoteByCode,
  listNotes,
  markPointLearned,
  organizePointNote,
  restorePoint,
  saveCheckin,
  savePointNote,
  saveRouteChoice,
  setCurrentLearningPoint,
} from '../../services/learning.service.js';
import {
  listPracticeAttempts,
  savePracticeAttempt,
  validatePracticeAttempt,
} from '../../services/practice.service.js';

const codeParams = z.object({ code: z.string().min(1) });

export async function learningRoutes(app: FastifyInstance) {
  app.get('/api/v1/learning/workspace', async (_request, reply) => reply.ok(getLearningWorkspace()));

  app.post('/api/v1/learning/points/:code/focus', async (request, reply) => {
    const { code } = codeParams.parse(request.params);
    return reply.ok(setCurrentLearningPoint(code));
  });

  app.post('/api/v1/learning/points/:code/complete', async (request, reply) => {
    const { code } = codeParams.parse(request.params);
    return reply.ok(markPointLearned(code));
  });

  app.post('/api/v1/learning/points/:code/defer', async (request, reply) => {
    const { code } = codeParams.parse(request.params);
    const body = z.object({ reason: z.string().max(500).optional() }).parse(request.body ?? {});
    return reply.ok(deferPoint(code, body.reason));
  });

  app.post('/api/v1/learning/points/:code/restore', async (request, reply) => {
    const { code } = codeParams.parse(request.params);
    return reply.ok(restorePoint(code));
  });

  app.get('/api/v1/learning/points/:code/branches', async (request, reply) => {
    const { code } = codeParams.parse(request.params);
    return reply.ok(getNextBranches(code));
  });

  app.get('/api/v1/learning/points/:code/practice-attempts', async (request, reply) => {
    const { code } = codeParams.parse(request.params);
    return reply.ok(listPracticeAttempts(code));
  });

  const practiceInput = z.object({
    submissionMd: z.string().max(100_000),
    code: z.string().max(100_000).optional(),
    language: z.enum(['javascript', 'typescript']).optional(),
    executionOutput: z.string().max(100_000).optional(),
    executionStatus: z.enum(['NOT_RUN', 'SUCCESS', 'ERROR', 'TIMEOUT']).optional(),
  });

  app.put('/api/v1/learning/points/:code/practice-attempts/:activityId', async (request, reply) => {
    const { code, activityId } = z.object({ code: z.string().min(1), activityId: z.string().min(1) }).parse(request.params);
    return reply.ok(savePracticeAttempt(code, activityId, practiceInput.parse(request.body)));
  });

  app.post('/api/v1/learning/points/:code/practice-attempts/:activityId/validate', async (request, reply) => {
    const { code, activityId } = z.object({ code: z.string().min(1), activityId: z.string().min(1) }).parse(request.params);
    return reply.ok(await validatePracticeAttempt(code, activityId, practiceInput.parse(request.body)));
  });

  app.put('/api/v1/learning/route-choices', async (request, reply) => {
    const body = z.object({
      sourceCode: z.string().min(1), targetCode: z.string().min(1),
      state: z.enum(['SELECTED', 'DEFERRED']), scope: z.enum(['POINT', 'BRANCH']).default('POINT'),
      reason: z.string().max(500).optional(),
    }).parse(request.body);
    return reply.ok(saveRouteChoice(body.sourceCode, body.targetCode, body.state, body.scope, body.reason));
  });

  app.get('/api/v1/notes', async (request, reply) => {
    const query = z.object({ search: z.string().optional(), domainCode: z.string().optional() }).parse(request.query);
    return reply.ok(listNotes(query.search, query.domainCode));
  });

  app.get('/api/v1/notes/:code', async (request, reply) => {
    const { code } = codeParams.parse(request.params);
    return reply.ok(getNoteByCode(code));
  });

  app.put('/api/v1/notes/:code', async (request, reply) => {
    const { code } = codeParams.parse(request.params);
    const body = z.object({ contentMd: z.string().max(200_000) }).parse(request.body);
    return reply.ok(savePointNote(code, body.contentMd));
  });

  app.post('/api/v1/notes/:code/organize', async (request, reply) => {
    const { code } = codeParams.parse(request.params);
    return reply.ok(await organizePointNote(code));
  });

  app.post('/api/v1/notes/:code/accept-organized', async (request, reply) => {
    const { code } = codeParams.parse(request.params);
    return reply.ok(acceptOrganizedNote(code));
  });

  app.put('/api/v1/learning/checkins/:date', async (request, reply) => {
    const { date } = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(request.params);
    const body = z.object({
      pointCodes: z.array(z.string()).min(1), summaryMd: z.string().max(10_000).optional(),
      actualMinutes: z.number().int().min(0).max(1440).optional(),
      energyLevel: z.number().int().min(1).max(5).optional(),
      difficultyLevel: z.number().int().min(1).max(5).optional(),
    }).parse(request.body);
    return reply.ok(saveCheckin({ date, ...body }));
  });
}
