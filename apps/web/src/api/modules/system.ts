/** 健康检查、内容导入与数据保护：运行时响应校验与业务接口。 */
import { z } from 'zod';
import { request } from '../http';

const HealthResponseSchema = z.object({
  ok: z.boolean(),
  db: z.boolean(),
  dataDir: z.boolean(),
  aiConfigured: z.boolean(),
  timestamp: z.string(),
});

const AIStatusSchema = z.object({
  configured: z.boolean(),
  provider: z.string(),
  model: z.string(),
  connectionOk: z.boolean().optional(),
});

const ExecutorStatusSchema = z.object({
  available: z.boolean(),
  type: z.string(),
  warnings: z.array(z.string()),
});

const BackupMetadataSchema = z.object({
  filename: z.string(),
  createdAt: z.string(),
  size: z.number(),
  checksum: z.string(),
  version: z.string(),
  stats: z.object({
    knowledgePoints: z.number(),
    planEvents: z.number(),
    assessments: z.number(),
    jobs: z.number(),
  }),
  note: z.string().optional(),
});

const BackupStatsSchema = BackupMetadataSchema.shape.stats;

const RestorePreviewSchema = z.object({
  metadata: BackupMetadataSchema,
  currentStats: BackupStatsSchema,
  differences: BackupStatsSchema,
  warnings: z.array(z.string()),
});

const PortableDataExportSchema = z.object({
  schemaVersion: z.literal(1),
  product: z.literal('career-atlas'),
  exportedAt: z.string(),
  counts: z.record(z.number()),
  data: z.record(z.array(z.record(z.unknown()))),
});

const PortableDataImportPreviewSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string(),
  totalRecords: z.number().int().nonnegative(),
  confirmation: z.string(),
  knowledgePoints: z.object({
    inFile: z.number().int().nonnegative(),
    matched: z.number().int().nonnegative(),
    skipped: z.number().int().nonnegative(),
    retainedCurrent: z.number().int().nonnegative(),
  }),
  categories: z.array(z.object({
    key: z.string(),
    label: z.string(),
    current: z.number().int().nonnegative(),
    after: z.number().int().nonnegative(),
    difference: z.number().int(),
  })),
  warnings: z.array(z.string()),
});

const PortableDataImportResultSchema = z.object({
  message: z.string(),
  importedRecords: z.number().int().nonnegative(),
  skippedKnowledgePoints: z.number().int().nonnegative(),
  backupFilename: z.string(),
});

const ResetLearningProgressSchema = z.object({
  syncedKnowledgePoints: z.number(),
  resetKnowledgePoints: z.number(),
  deletedTemplateEvents: z.number(),
  deletedSystemLearningEvents: z.number(),
  deletedCheckins: z.number(),
  deletedDailyReviews: z.number(),
  deletedWeeklyReviews: z.number(),
  deletedLeaveDays: z.number(),
  deletedAssessmentSessions: z.number(),
  deletedAssessmentQuestions: z.number(),
  deletedAssessmentAnswers: z.number(),
  deletedAssessmentResults: z.number(),
  deletedMasteryEvents: z.number(),
  importedPlanEvents: z.number(),
  startDate: z.string(),
});

export const systemApi = {
  async getHealth() {
    return request('/system/health', HealthResponseSchema);
  },

  async getAIStatus() {
    return request('/system/ai/status', AIStatusSchema);
  },

  async getExecutorStatus() {
    return request('/system/executor/status', ExecutorStatusSchema);
  },

  async getImportStatus() {
    return request('/import/status', z.object({
      hasData: z.boolean(),
      domainCount: z.number(),
      pointCount: z.number(),
      pointCodes: z.array(z.string()),
    }));
  },

  async executeContentImport() {
    return request('/import/execute', z.object({
      importedDomains: z.number(),
      updatedDomains: z.number(),
      importedPoints: z.number(),
      updatedPoints: z.number(),
      skippedPoints: z.number(),
      totalPoints: z.number(),
    }), { method: 'POST' });
  },

  async resetLearningProgress(startDate?: string) {
    return request('/import/reset-learning-progress', ResetLearningProgressSchema, {
      method: 'POST',
      body: JSON.stringify(startDate ? { startDate } : {}),
    });
  },

  async listBackups() {
    return request('/backups', z.array(BackupMetadataSchema));
  },

  async createBackup(note?: string) {
    return request('/backups', BackupMetadataSchema, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  },

  async restoreBackup(filename: string) {
    return request(`/backups/${encodeURIComponent(filename)}/restore`, z.object({
      message: z.string(),
      restartRequired: z.boolean(),
    }), {
      method: 'POST',
      body: JSON.stringify({ confirm: filename }),
    });
  },

  async deleteBackup(filename: string) {
    return request(`/backups/${encodeURIComponent(filename)}`, z.object({ message: z.string() }), {
      method: 'DELETE',
      body: JSON.stringify({ confirm: filename }),
    });
  },

  async previewBackupRestore(filename: string) {
    return request(`/backups/${encodeURIComponent(filename)}/preview`, RestorePreviewSchema);
  },

  async exportPortableData() {
    return request('/data/export', PortableDataExportSchema);
  },

  async previewPortableDataImport(snapshot: unknown) {
    return request('/data/import/preview', PortableDataImportPreviewSchema, {
      method: 'POST',
      body: JSON.stringify({ snapshot }),
    });
  },

  async importPortableData(snapshot: unknown, confirm: string) {
    return request('/data/import', PortableDataImportResultSchema, {
      method: 'POST',
      body: JSON.stringify({ snapshot, confirm }),
    });
  },
};

export type ResetLearningProgressResult = z.infer<typeof ResetLearningProgressSchema>;

export type BackupMetadata = z.infer<typeof BackupMetadataSchema>;

export type RestorePreview = z.infer<typeof RestorePreviewSchema>;

export type PortableDataExport = z.infer<typeof PortableDataExportSchema>;

export type PortableDataImportPreview = z.infer<typeof PortableDataImportPreviewSchema>;
