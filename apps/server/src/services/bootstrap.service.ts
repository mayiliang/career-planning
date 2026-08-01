import { executeImport } from './import.service.js';
import { getBackupService } from './backup.service.js';
import { syncKnowledgeRelations } from './knowledge-relations.service.js';

export interface BootstrapResult {
  knowledgePoints: number;
  planCreated: boolean;
  planItems: number;
  knowledgeRelations: number;
  normalizedPlanTimes: number;
}

/** 首次启动自动迁移后只同步知识与关系；自主学习模式不再生成每日任务。 */
export async function bootstrapLocalData(): Promise<BootstrapResult> {
  const importResult = await executeImport();
  const relationResult = syncKnowledgeRelations();

  return {
    knowledgePoints: importResult.totalPoints,
    planCreated: false,
    planItems: 0,
    knowledgeRelations: relationResult.total,
    normalizedPlanTimes: 0,
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
