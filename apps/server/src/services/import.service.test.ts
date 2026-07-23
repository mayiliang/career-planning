/**
 * 导入服务测试
 */
import { describe, it, expect } from 'vitest';
import { scanKnowledgeFiles, previewImport, executeImport, checkImportStatus, resetLearningProgress } from './import.service.js';
import { rawDb } from '../db/index.js';
import { parseKnowledgeMarkdown } from '@career-atlas/content-parser';
import fs from 'fs';

describe('Import Service', () => {
  it('应该能够扫描知识文件', () => {
    const result = scanKnowledgeFiles();
    
    expect(result.total).toBeGreaterThan(0);
    expect(result.files.length).toBeGreaterThan(0);
    
    // 所有文件都是 .md 文件
    for (const file of result.files) {
      expect(file).toMatch(/\.md$/);
    }
  });
  
  it('应该能够解析单个文件', () => {
    const { files } = scanKnowledgeFiles();
    const firstFile = files[0];
    
    // 读取文件内容
    const content = fs.readFileSync(firstFile, 'utf-8');
    
    // 解析
    const result = parseKnowledgeMarkdown(content, firstFile);
    
    // 验证
    expect(result.code).toMatch(/^\d{2}$/);
    expect(result.title).toBeTruthy();
    expect(result.points.length).toBeGreaterThan(0);
    
    // 打印调试信息
    console.log(`文件: ${firstFile}`);
    console.log(`领域: ${result.code} - ${result.title}`);
    console.log(`知识点数量: ${result.points.length}`);
    if (result.points.length > 0) {
      console.log(`第一个知识点: ${result.points[0].code} - ${result.points[0].title}`);
    }
  });
  
  it('应该能够预览导入内容', () => {
    const preview = previewImport();
    
    expect(preview.domains.length).toBeGreaterThan(0);
    expect(preview.totalPoints).toBeGreaterThan(0);
    
    console.log(`\n预览结果:`);
    console.log(`领域数量: ${preview.domains.length}`);
    console.log(`总知识点: ${preview.totalPoints}`);
    
    for (const domain of preview.domains) {
      console.log(`  - ${domain.code}: ${domain.title} (${domain.pointCount} 个知识点)`);
    }
  });
  
  it('应该能够检查导入状态', async () => {
    const status = await checkImportStatus();
    
    expect(status).toHaveProperty('hasData');
    expect(status).toHaveProperty('domainCount');
    expect(status).toHaveProperty('pointCount');
    expect(status).toHaveProperty('pointCodes');
  });

  it('应该能够重置学习进度并保留用户自建计划', async () => {
    rawDb.prepare('DELETE FROM assessment_answers').run();
    rawDb.prepare('DELETE FROM assessment_questions').run();
    rawDb.prepare('DELETE FROM assessment_results').run();
    rawDb.prepare('DELETE FROM assessment_sessions').run();
    rawDb.prepare('DELETE FROM mastery_events').run();
    rawDb.prepare('DELETE FROM checkins').run();
    rawDb.prepare('DELETE FROM daily_reviews').run();
    rawDb.prepare('DELETE FROM weekly_reviews').run();
    rawDb.prepare('DELETE FROM leave_days').run();
    rawDb.prepare('DELETE FROM plan_events').run();

    await executeImport();
    const now = new Date().toISOString();
    rawDb.prepare(`
      UPDATE knowledge_points
      SET status = 'MASTERED', summary = '测试摘要', self_mastered_at = ?, first_passed_at = ?, mastered_at = ?
      WHERE code = 'JS-01'
    `).run(now, now, now);
    rawDb.prepare(`
      INSERT INTO plan_events (id, event_type, title, description, start_at, end_at, all_day, status, priority, source_type, template_week, template_day, created_at, updated_at)
      VALUES ('template-reset-test', 'LEARNING', '旧模板计划', NULL, ?, ?, 0, 'COMPLETED', 3, 'TEMPLATE', 1, '周一', ?, ?)
    `).run(now, now, now, now);
    rawDb.prepare(`
      INSERT INTO plan_events (id, event_type, title, description, start_at, end_at, all_day, status, priority, source_type, created_at, updated_at)
      VALUES ('user-reset-test', 'LEARNING', '用户自建学习计划', NULL, ?, ?, 0, 'PLANNED', 3, 'USER', ?, ?)
    `).run(now, now, now, now);
    rawDb.prepare(`
      INSERT INTO checkins (id, plan_event_id, result, actual_minutes, note_md, checked_at, created_at)
      VALUES ('checkin-reset-test', 'user-reset-test', 'COMPLETED', 60, '测试打卡', ?, ?)
    `).run(now, now);
    rawDb.prepare(`
      INSERT INTO assessment_sessions (id, knowledge_point_code, assessment_type, status, duration_minutes, created_at, updated_at)
      VALUES ('session-reset-test', 'JS-01', 'FIRST', 'GRADED', 60, ?, ?)
    `).run(now, now);
    rawDb.prepare(`
      INSERT INTO mastery_events (id, knowledge_point_code, action, from_status, to_status, assessment_session_id, created_at)
      VALUES ('mastery-reset-test', 'JS-01', 'retestPass', 'FIRST_PASS_PENDING_RETEST', 'MASTERED', 'session-reset-test', ?)
    `).run(now);

    const result = await resetLearningProgress('2026-07-20');
    const point = rawDb.prepare("SELECT status, summary, mastered_at AS masteredAt FROM knowledge_points WHERE code = 'JS-01'").get() as {
      status: string;
      summary: string | null;
      masteredAt: string | null;
    };
    const templateCount = rawDb.prepare("SELECT count(*) AS count FROM plan_events WHERE source_type = 'TEMPLATE'").get() as { count: number };
    const userCount = rawDb.prepare("SELECT count(*) AS count FROM plan_events WHERE source_type = 'USER'").get() as { count: number };
    const checkinCount = rawDb.prepare('SELECT count(*) AS count FROM checkins').get() as { count: number };
    const assessmentCount = rawDb.prepare('SELECT count(*) AS count FROM assessment_sessions').get() as { count: number };

    expect(result.syncedKnowledgePoints).toBe(153);
    expect(result.resetKnowledgePoints).toBe(153);
    expect(result.deletedTemplateEvents).toBe(1);
    expect(result.deletedCheckins).toBe(1);
    expect(result.deletedAssessmentSessions).toBe(1);
    expect(result.deletedMasteryEvents).toBe(1);
    expect(result.importedPlanEvents).toBe(161);
    expect(point).toEqual({ status: 'NOT_STARTED', summary: null, masteredAt: null });
    expect(templateCount.count).toBe(161);
    expect(userCount.count).toBe(1);
    expect(checkinCount.count).toBe(0);
    expect(assessmentCount.count).toBe(0);
  });
});
