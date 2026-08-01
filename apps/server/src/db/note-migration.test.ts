import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import Database from 'better-sqlite3';
import { afterAll, describe, expect, it } from 'vitest';

const tempDir = mkdtempSync(join(tmpdir(), 'career-atlas-note-migration-'));

describe('旧版笔记安全迁移', () => {
  afterAll(() => rmSync(tempDir, { recursive: true, force: true }));

  it('把 knowledge_points.summary 复制到原始笔记和首个迁移版本，不修改旧字段', () => {
    const sqlite = new Database(join(tempDir, 'legacy.db'));
    for (let index = 0; index <= 6; index += 1) {
      const filename = index === 0 ? '0000_dapper_multiple_man.sql'
        : index === 1 ? '0001_phase3_plan_tables.sql'
          : index === 2 ? '0002_phase4_knowledge_edges.sql'
            : index === 3 ? '0003_phase5_assessment_tables.sql'
              : index === 4 ? '0004_phase6_job_tables.sql'
                : index === 5 ? '0005_phase9_leave_days.sql' : '0006_knowledge_effort.sql';
      const sql = readFileSync(resolve(__dirname, `../../drizzle/${filename}`), 'utf8');
      for (const statement of sql.split('--> statement-breakpoint')) if (statement.trim()) sqlite.exec(statement);
    }
    const now = new Date().toISOString();
    sqlite.prepare(`INSERT INTO knowledge_domains
      (id, code, title, description, order_index, source_path, source_hash, created_at, updated_at)
      VALUES ('domain-legacy', '99', '迁移测试', NULL, 99, 'legacy.md', 'hash', ?, ?)`).run(now, now);
    sqlite.prepare(`INSERT INTO knowledge_points
      (id, code, domain_id, title, summary, study_material_md, assessment_spec_md, pass_criteria_md,
       difficulty, plan_week, status, source_path, source_hash, created_at, updated_at)
      VALUES ('point-legacy', 'LEGACY-01', 'domain-legacy', '旧版笔记', '绝不能丢失的原文', '资料', '考核', '标准',
       'intermediate', 1, 'LEARNING', 'legacy.md', 'hash', ?, ?)`).run(now, now);

    const migration = readFileSync(resolve(__dirname, '../../drizzle/0007_self_paced_learning.sql'), 'utf8');
    for (const statement of migration.split('--> statement-breakpoint')) if (statement.trim()) sqlite.exec(statement);

    const point = sqlite.prepare("SELECT summary, learning_state AS learningState FROM knowledge_points WHERE code = 'LEGACY-01'").get() as { summary: string; learningState: string };
    const note = sqlite.prepare("SELECT original_md AS originalMd FROM knowledge_notes WHERE knowledge_point_code = 'LEGACY-01'").get() as { originalMd: string };
    const version = sqlite.prepare("SELECT source, content_md AS contentMd FROM knowledge_note_versions").get() as { source: string; contentMd: string };
    expect(point).toEqual({ summary: '绝不能丢失的原文', learningState: 'LEARNING' });
    expect(note.originalMd).toBe('绝不能丢失的原文');
    expect(version).toEqual({ source: 'MIGRATED', contentMd: '绝不能丢失的原文' });
    sqlite.close();
  });
});
