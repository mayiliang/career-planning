import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db, rawDb } from '../../db/index.js';
import { assessmentSessions, assessmentResults, knowledgePoints, masteryEvents } from '../../db/schema.js';
import type { AssessmentSessionRecord, AssessmentResultRecord, NewAssessmentResult, NewMasteryEvent } from '../../db/schema.js';
import { GradingStateError, type GradeResult } from './types.js';

interface GradingAttempt {
  session: AssessmentSessionRecord;
  previousResult: AssessmentResultRecord | undefined;
}

type Preparation = { kind: 'cached'; result: GradeResult } | { kind: 'claimed'; attempt: GradingAttempt };

/** 同步短事务领取评分任务；外部模型请求不占用数据库事务。 */
export function prepareGrading(sessionId: string, regrade: boolean): Preparation {
  return rawDb.transaction((): Preparation => {
    const session = db.select().from(assessmentSessions).where(eq(assessmentSessions.id, sessionId)).get();
    if (!session) throw new GradingStateError(`Session not found: ${sessionId}`, 404);
    if (session.status === 'GRADING') throw new GradingStateError('本次考核正在判题，请等待当前任务完成。');

    const previousResult = db.select().from(assessmentResults).where(eq(assessmentResults.sessionId, sessionId)).get();
    if (!regrade && previousResult && ['GRADED', 'ERROR', 'SUBMITTED'].includes(session.status)) {
      return {
        kind: 'cached',
        result: { session, result: previousResult, knowledgePointUpdated: false, retestEventCreated: false, reviewEventCreated: false },
      };
    }
    const allowed = regrade ? ['GRADED', 'ERROR'] : ['SUBMITTED', 'ERROR'];
    if (!allowed.includes(session.status)) {
      throw new GradingStateError(regrade ? '只有判题完成或判题错误的考核才能重新判题' : `Cannot grade session with status: ${session.status}`);
    }

    db.update(assessmentSessions).set({ status: 'GRADING', updatedAt: new Date().toISOString() })
      .where(eq(assessmentSessions.id, sessionId)).run();
    return { kind: 'claimed', attempt: { session, previousResult } };
  })();
}

/** 评分、会话、知识点和审计事件一起提交；任一步失败都会回滚。 */
export function commitGrading(attempt: GradingAttempt, result: NewAssessmentResult): GradeResult {
  return rawDb.transaction(() => {
    const { session } = attempt;
    const current = db.select().from(assessmentSessions).where(eq(assessmentSessions.id, session.id)).get();
    if (current?.status !== 'GRADING') throw new GradingStateError('考核状态已改变，本次评分未写入。');

    // 旧结果一直保留到新结果完成；删除和替换在同一事务中完成。
    db.delete(assessmentResults).where(eq(assessmentResults.sessionId, session.id)).run();
    const savedResult = db.insert(assessmentResults).values(result).returning().get();
    const now = new Date().toISOString();
    const updatedSession = db.update(assessmentSessions)
      .set({ status: 'GRADED', resultId: savedResult.id, gradedAt: now, updatedAt: now })
      .where(eq(assessmentSessions.id, session.id)).returning().get();
    let knowledgePointUpdated = false;
    if (savedResult.serverCalculatedVerdict === 'PASS') {
      knowledgePointUpdated = updateKnowledgePointStatus(session.knowledgePointCode, session.id, session.masteryStage, session.assistanceLevel);
    } else if (savedResult.serverCalculatedVerdict === 'FAIL') {
      handleAssessmentFailure(session.knowledgePointCode, session.assessmentType, session.id);
    }
    return { session: updatedSession, result: savedResult, knowledgePointUpdated, retestEventCreated: false, reviewEventCreated: false };
  })();
}

/** 重评失败恢复旧结果的可读状态；首次评分失败允许重试。 */
export function failGrading(attempt: GradingAttempt): void {
  const { session, previousResult } = attempt;
  db.update(assessmentSessions).set({
    status: previousResult ? 'GRADED' : 'ERROR',
    resultId: previousResult?.id ?? null,
    gradedAt: previousResult ? session.gradedAt : null,
    updatedAt: new Date().toISOString(),
  }).where(and(eq(assessmentSessions.id, session.id), eq(assessmentSessions.status, 'GRADING'))).run();
}

/** 单实例启动、尚未接受请求时，恢复上一进程未完成的评分任务。 */
export function recoverInterruptedGradings(): number {
  return rawDb.transaction(() => {
    const interrupted = db.select().from(assessmentSessions).where(eq(assessmentSessions.status, 'GRADING')).all();
    for (const session of interrupted) {
      const previousResult = db.select().from(assessmentResults).where(eq(assessmentResults.sessionId, session.id)).get();
      failGrading({ session, previousResult });
    }
    return interrupted.length;
  })();
}

// ===== 更新知识点状态 =====

function updateKnowledgePointStatus(
  knowledgePointCode: string,
  sessionId: string,
  masteryStage: number,
  assistanceLevel: number
): boolean {
  const knowledgePoint = db.select().from(knowledgePoints).where(eq(knowledgePoints.code, knowledgePointCode)).get();
  
  if (!knowledgePoint) {
    return false;
  }
  
  const now = new Date().toISOString();
  // 解释题/轻提示不惩罚；拆解、提纲、开头或完整答案意味着本次最高认证 M2。
  const certifiedStage = assistanceLevel >= 3 ? Math.min(masteryStage, 2) : masteryStage;
  const newLevel = Math.max(knowledgePoint.masteryLevel, certifiedStage);
  const newStatus: typeof knowledgePoints.$inferSelect.status = newLevel >= 3
    ? 'MASTERED'
    : 'FIRST_PASS_PENDING_RETEST';
  const action: NewMasteryEvent['action'] = certifiedStage >= 4
    ? 'reviewPass'
    : certifiedStage >= 3 ? 'retestPass' : 'firstPass';
  
  // 更新知识点状态
  db
    .update(knowledgePoints)
    .set({
      status: newStatus,
      learningState: 'LEARNED',
      masteryLevel: newLevel,
      firstPassedAt: knowledgePoint.firstPassedAt ?? now,
      masteredAt: newLevel >= 3 ? (knowledgePoint.masteredAt ?? now) : knowledgePoint.masteredAt,
      nextReviewAt: newLevel >= 3 && newLevel < 4 ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null,
      updatedAt: now,
    })
    .where(eq(knowledgePoints.code, knowledgePointCode)).run();
  
  // 追加审计事件
  const event: NewMasteryEvent = {
    id: randomUUID(),
    knowledgePointCode,
    action,
    fromStatus: knowledgePoint.status,
    toStatus: newStatus,
    assessmentSessionId: sessionId,
    evidenceSummary: `掌握挑战 M${masteryStage} 通过；帮助等级 ${assistanceLevel}；认证为 M${certifiedStage}`,
    createdAt: now,
  };
  
  db.insert(masteryEvents).values(event).run();
  
  return true;
}

// ===== 处理考核失败 =====

function handleAssessmentFailure(
  knowledgePointCode: string,
  assessmentType: string,
  sessionId: string
): void {
  const knowledgePoint = db.select().from(knowledgePoints).where(eq(knowledgePoints.code, knowledgePointCode)).get();
  
  if (!knowledgePoint) {
    return;
  }
  
  const now = new Date().toISOString();
  const newStatus: typeof knowledgePoints.$inferSelect.status = knowledgePoint.status;
  let action: NewMasteryEvent['action'];
  
  if (assessmentType === 'FIRST') {
    action = 'firstFail';
  } else if (assessmentType === 'RETEST') {
    action = 'retestFail';
  } else {
    action = 'reviewFail';
  }
  
  // 掌握挑战完全可选：失败只形成诊断证据，不撤销“已学完”，也不降低既有掌握等级。
  db
    .update(knowledgePoints)
    .set({
      updatedAt: now,
    })
    .where(eq(knowledgePoints.code, knowledgePointCode)).run();
  
  // 追加审计事件
  const event: NewMasteryEvent = {
    id: randomUUID(),
    knowledgePointCode,
    action,
    fromStatus: knowledgePoint.status,
    toStatus: newStatus,
    assessmentSessionId: sessionId,
    createdAt: now,
  };
  
  db.insert(masteryEvents).values(event).run();
}

