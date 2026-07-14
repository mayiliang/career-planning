import { join } from 'path';
import { projectRoot } from '../config/index.js';
import { rawDb } from '../db/index.js';
import { executeImport } from './import.service.js';
import { planService } from './plan.service.js';
import { getBackupService } from './backup.service.js';
import { syncKnowledgeRelations } from './knowledge-relations.service.js';

export interface BootstrapResult {
  knowledgePoints: number;
  planCreated: boolean;
  planItems: number;
  knowledgeRelations: number;
  normalizedPlanTimes: number;
}

function nextMonday(): string {
  const date = new Date();
  const daysUntilMonday = (8 - date.getDay()) % 7 || 7;
  date.setDate(date.getDate() + daysUntilMonday);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** 首次启动自动迁移后，增量同步知识并生成默认学习计划。 */
export async function bootstrapLocalData(): Promise<BootstrapResult> {
  const importResult = await executeImport();
  const relationResult = syncKnowledgeRelations();
  const row = rawDb.prepare('SELECT count(*) AS count FROM plan_events').get() as { count: number };
  let planItems = 0;
  const templatePath = join(projectRoot, 'templates', 'learning-tracker-template.csv');

  if (row.count === 0) {
    const result = await planService.importFromTemplate(templatePath, { startDate: nextMonday() });
    planItems = result.imported;
  } else {
    planItems = await planService.ensureSevenDayTemplate(templatePath);
  }
  const normalizedPlanTimes = planService.normalizeTemplateSchedule();

  return {
    knowledgePoints: importResult.totalPoints,
    planCreated: planItems > 0,
    planItems,
    knowledgeRelations: relationResult.total,
    normalizedPlanTimes,
  };
}

/** 启动时检查当天备份，此后按固定间隔自动检查。 */
export async function startAutomaticBackups(): Promise<() => void> {
  const service = getBackupService();
  const createIfNeeded = async () => {
    const latest = (await service.listBackups())[0];
    const today = new Date().toISOString().slice(0, 10);
    if (!latest?.createdAt.startsWith(today)) {
      await service.createBackup('系统自动备份');
    }
  };

  await createIfNeeded();
  const intervalHours = Math.max(1, Number(process.env.AUTO_BACKUP_INTERVAL_HOURS ?? 24));
  const timer = setInterval(() => void createIfNeeded(), intervalHours * 60 * 60 * 1000);
  timer.unref();
  return () => clearInterval(timer);
}
