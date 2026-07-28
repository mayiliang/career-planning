/**
 * 知识导入服务
 * 
 * Phase 1 实现：扫描、解析、幂等导入
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db, rawDb } from '../db/index.js';
import { knowledgeDomains, knowledgePoints, type NewKnowledgeDomain, type NewKnowledgePoint } from '../db/schema.js';
import { parseAllKnowledgeFiles } from '@career-atlas/content-parser';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { currentBeijingDate, planService } from './plan.service.js';
import { projectRoot } from '../config/index.js';

const PROJECT_ROOT = projectRoot;
const KNOWLEDGE_BASE_DIR = 'docs/knowledge/knowledge-base';
const LEARNING_TEMPLATE_PATH = path.join(PROJECT_ROOT, 'templates', 'learning-tracker-template.csv');

/**
 * 扫描知识文件
 */
export function scanKnowledgeFiles(): { files: string[]; total: number } {
  const knowledgeDir = path.join(PROJECT_ROOT, KNOWLEDGE_BASE_DIR);
  
  if (!fs.existsSync(knowledgeDir)) {
    throw new Error(`知识文件目录不存在: ${knowledgeDir}`);
  }
  
  const files = fs.readdirSync(knowledgeDir)
    .filter(file => 
      file.endsWith('.md') && 
      file !== '00-assessment-rules.md' && 
      file !== 'README.md' &&
      file !== 'assessment-record-template.md'
    )
    .map(file => path.join(knowledgeDir, file));
  
  return { files, total: files.length };
}

/**
 * 计算内容 hash
 */
function calculateHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * 预览导入内容
 */
export function previewImport(): {
  domains: Array<{ code: string; title: string; pointCount: number }>;
  totalPoints: number;
  files: string[];
} {
  const { files } = scanKnowledgeFiles();
  
  const fileContents = new Map<string, string>();
  for (const file of files) {
    fileContents.set(file, fs.readFileSync(file, 'utf-8'));
  }
  
  const domains = parseAllKnowledgeFiles(fileContents);
  const totalPoints = domains.reduce((sum, d) => sum + d.points.length, 0);
  
  return {
    domains: domains.map(d => ({
      code: d.code,
      title: d.title,
      pointCount: d.points.length,
    })),
    totalPoints,
    files,
  };
}

/**
 * 执行导入（事务 + 幂等）
 */
export async function executeImport(): Promise<{
  importedDomains: number;
  updatedDomains: number;
  importedPoints: number;
  updatedPoints: number;
  skippedPoints: number;
  totalPoints: number;
}> {
  const { files } = scanKnowledgeFiles();
  
  const fileContents = new Map<string, string>();
  for (const file of files) {
    fileContents.set(file, fs.readFileSync(file, 'utf-8'));
  }
  
  const domains = parseAllKnowledgeFiles(fileContents);
  
  let importedDomains = 0;
  let updatedDomains = 0;
  let importedPoints = 0;
  let updatedPoints = 0;
  let skippedPoints = 0;
  
  // 使用事务
  const transaction = rawDb.transaction(() => {
    for (const domain of domains) {
      // 检查领域是否已存在
      const existingDomain = db.select()
        .from(knowledgeDomains)
        .where(eq(knowledgeDomains.code, domain.code))
        .get();

      const domainHash = calculateHash(domain.title + (domain.description || ''));
      const sourceFile = files.find((file) => path.basename(file).startsWith(`${domain.code}-`));
      const sourcePath = sourceFile ? path.relative(PROJECT_ROOT, sourceFile) : KNOWLEDGE_BASE_DIR;
      const now = new Date().toISOString();
      let domainId: string;

      if (existingDomain) {
        domainId = existingDomain.id;
        if (existingDomain.sourceHash !== domainHash) {
          db.update(knowledgeDomains)
            .set({
              title: domain.title,
              description: domain.description,
              orderIndex: parseInt(domain.code, 10),
              sourcePath,
              sourceHash: domainHash,
              updatedAt: now,
            })
            .where(eq(knowledgeDomains.id, domainId))
            .run();
          updatedDomains++;
        }
      } else {
        domainId = uuidv4();
        const newDomain: NewKnowledgeDomain = {
          id: domainId,
          code: domain.code,
          title: domain.title,
          description: domain.description,
          orderIndex: parseInt(domain.code, 10),
          sourcePath,
          sourceHash: domainHash,
          createdAt: now,
          updatedAt: now,
        };

        db.insert(knowledgeDomains).values(newDomain).run();
        importedDomains++;
      }
      
      // 导入知识点
      for (const point of domain.points) {
        const existingPoint = db.select()
          .from(knowledgePoints)
          .where(eq(knowledgePoints.code, point.code))
          .get();

        const pointHash = calculateHash(
          point.title + point.studyMaterial + point.assessmentSpec + point.passCriteria
          + point.studyMinutes + point.practiceMinutes + point.projectMinutes
          + point.assessmentMinutes + point.retestMinutes
        );

        if (existingPoint) {
          if (existingPoint.sourceHash === pointHash && existingPoint.domainId === domainId) {
            skippedPoints++;
            continue;
          }

          // 只更新来源内容，保留摘要、学习状态和所有历史时间。
          db.update(knowledgePoints)
            .set({
              domainId,
              title: point.title,
              studyMaterialMd: point.studyMaterial,
              assessmentSpecMd: point.assessmentSpec,
              passCriteriaMd: point.passCriteria,
              difficulty: point.difficulty,
              studyMinutes: point.studyMinutes,
              practiceMinutes: point.practiceMinutes,
              projectMinutes: point.projectMinutes,
              assessmentMinutes: point.assessmentMinutes,
              retestMinutes: point.retestMinutes,
              sourcePath,
              sourceHash: pointHash,
              updatedAt: now,
            })
            .where(eq(knowledgePoints.id, existingPoint.id))
            .run();
          updatedPoints++;
          continue;
        }

        const pointId = uuidv4();
        const newPoint: NewKnowledgePoint = {
          id: pointId,
          code: point.code,
          domainId,
          title: point.title,
          summary: null,
          studyMaterialMd: point.studyMaterial,
          assessmentSpecMd: point.assessmentSpec,
          passCriteriaMd: point.passCriteria,
          difficulty: point.difficulty,
          planWeek: null,
          studyMinutes: point.studyMinutes,
          practiceMinutes: point.practiceMinutes,
          projectMinutes: point.projectMinutes,
          assessmentMinutes: point.assessmentMinutes,
          retestMinutes: point.retestMinutes,
          status: 'NOT_STARTED',
          selfMasteredAt: null,
          firstPassedAt: null,
          masteredAt: null,
          nextReviewAt: null,
          sourcePath,
          sourceHash: pointHash,
          createdAt: now,
          updatedAt: now,
        };
        
        db.insert(knowledgePoints).values(newPoint).run();
        importedPoints++;
      }
    }
    
    return {
      importedDomains,
      updatedDomains,
      importedPoints,
      updatedPoints,
      skippedPoints,
      totalPoints: domains.reduce((sum, d) => sum + d.points.length, 0),
    };
  });
  
  return transaction();
}

/**
 * 检查导入状态
 */
export async function checkImportStatus(): Promise<{
  hasData: boolean;
  domainCount: number;
  pointCount: number;
  pointCodes: string[];
}> {
  const domains = db.select().from(knowledgeDomains).all();
  const points = db.select().from(knowledgePoints).all();
  
  return {
    hasData: domains.length > 0,
    domainCount: domains.length,
    pointCount: points.length,
    pointCodes: points.map(p => p.code),
  };
}

export interface ResetLearningProgressResult {
  syncedKnowledgePoints: number;
  resetKnowledgePoints: number;
  deletedTemplateEvents: number;
  deletedSystemLearningEvents: number;
  deletedCheckins: number;
  deletedDailyReviews: number;
  deletedWeeklyReviews: number;
  deletedLeaveDays: number;
  deletedAssessmentSessions: number;
  deletedAssessmentQuestions: number;
  deletedAssessmentAnswers: number;
  deletedAssessmentResults: number;
  deletedMasteryEvents: number;
  importedPlanEvents: number;
  startDate: string;
}

/**
 * 清空学习进度并按最新版 48 周模板重建计划。
 *
 * 保留知识内容、知识关系、岗位、项目、技能缺口和备份；只清除学习过程状态、
 * 考核证据、打卡复盘、请假顺延记录，以及模板/系统生成的学习计划。
 */
export async function resetLearningProgress(startDate = currentBeijingDate()): Promise<ResetLearningProgressResult> {
  const importResult = await executeImport();
  const now = new Date().toISOString();

  const deleted = rawDb.transaction(() => {
    const deletedAssessmentAnswers = rawDb.prepare('DELETE FROM assessment_answers').run().changes;
    const deletedAssessmentQuestions = rawDb.prepare('DELETE FROM assessment_questions').run().changes;
    const deletedAssessmentResults = rawDb.prepare('DELETE FROM assessment_results').run().changes;
    const deletedMasteryEvents = rawDb.prepare('DELETE FROM mastery_events').run().changes;
    const deletedAssessmentSessions = rawDb.prepare('DELETE FROM assessment_sessions').run().changes;
    const deletedCheckins = rawDb.prepare('DELETE FROM checkins').run().changes;
    const deletedDailyReviews = rawDb.prepare('DELETE FROM daily_reviews').run().changes;
    const deletedWeeklyReviews = rawDb.prepare('DELETE FROM weekly_reviews').run().changes;
    const deletedLeaveDays = rawDb.prepare('DELETE FROM leave_days').run().changes;
    const deletedTemplateEvents = rawDb.prepare("DELETE FROM plan_events WHERE source_type = 'TEMPLATE'").run().changes;
    const deletedSystemLearningEvents = rawDb.prepare(`
      DELETE FROM plan_events
      WHERE source_type = 'SYSTEM'
        AND event_type IN ('LEARNING', 'ASSESSMENT', 'RETEST', 'PROJECT_OUTPUT', 'REVIEW')
    `).run().changes;
    const resetKnowledgePoints = rawDb.prepare(`
      UPDATE knowledge_points
      SET status = 'NOT_STARTED',
          summary = NULL,
          self_mastered_at = NULL,
          first_passed_at = NULL,
          mastered_at = NULL,
          next_review_at = NULL,
          updated_at = ?
    `).run(now).changes;

    return {
      resetKnowledgePoints,
      deletedTemplateEvents,
      deletedSystemLearningEvents,
      deletedCheckins,
      deletedDailyReviews,
      deletedWeeklyReviews,
      deletedLeaveDays,
      deletedAssessmentSessions,
      deletedAssessmentQuestions,
      deletedAssessmentAnswers,
      deletedAssessmentResults,
      deletedMasteryEvents,
    };
  })();

  const planResult = await planService.importFromTemplate(LEARNING_TEMPLATE_PATH, { startDate });
  planService.normalizeTemplateSchedule();

  return {
    syncedKnowledgePoints: importResult.totalPoints,
    importedPlanEvents: planResult.imported,
    startDate,
    ...deleted,
  };
}
