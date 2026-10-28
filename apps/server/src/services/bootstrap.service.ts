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
export async function startAutomaticBackups(
  onError: (error: unknown) => void = (error) => console.error('自动备份失败', error),
): Promise<() => Promise<void>> {
  const service = getBackupService();
  const createIfNeeded = async () => {
    const latest = (await service.listBackups())[0];
    const today = new Date().toISOString().slice(0, 10);
    if (!latest?.createdAt.startsWith(today)) {
      await service.createBackup('系统自动备份');
    }
  };

  await createIfNeeded();
  const configuredHours = Number(process.env.AUTO_BACKUP_INTERVAL_HOURS ?? 24);
  // Node 超过 32 位上限的延时会回退为 1ms，不能把过大配置直接交给定时器。
  const maximumHours = 2_147_483_647 / (60 * 60 * 1000);
  const intervalHours = Number.isFinite(configuredHours) && configuredHours <= maximumHours
    ? Math.max(1, configuredHours)
    : 24;
  let pending: Promise<void> | undefined;
  const timer = setInterval(() => {
    if (pending) return;
    pending = createIfNeeded().catch(onError).finally(() => { pending = undefined; });
  }, intervalHours * 60 * 60 * 1000);
  timer.unref();
  return async () => {
    clearInterval(timer);
    await pending;
  };
}
