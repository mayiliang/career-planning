import { closeDatabase } from '../db/index.js';
import { getBackupService } from '../services/backup.service.js';

async function main(): Promise<void> {
  const result = await getBackupService().createBackup('由命令行手动创建');

  if (!result.success || !result.metadata) {
    throw new Error(result.error ?? '备份创建失败');
  }

  process.stdout.write(`${result.metadata.filename}\n`);
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : '备份创建失败'}\n`);
    process.exitCode = 1;
  })
  .finally(() => {
    closeDatabase();
  });
