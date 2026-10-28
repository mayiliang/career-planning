import { afterEach, describe, expect, it, vi } from 'vitest';
import { startAutomaticBackups } from './bootstrap.service.js';

const service = vi.hoisted(() => ({ listBackups: vi.fn(), createBackup: vi.fn() }));
vi.mock('./backup.service.js', () => ({ getBackupService: () => service }));

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

describe('自动备份任务', () => {
  it.each(['invalid', 'Infinity', '1000000'])('无效间隔 %s 使用默认值，避免高频循环', async (interval) => {
    vi.useFakeTimers();
    vi.stubEnv('AUTO_BACKUP_INTERVAL_HOURS', interval);
    service.listBackups.mockResolvedValue([]);
    service.createBackup.mockResolvedValue({});
    const stop = await startAutomaticBackups(vi.fn());
    try {
      await vi.advanceTimersByTimeAsync(60_000);
      expect(service.listBackups).toHaveBeenCalledOnce();
      await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);
      expect(service.listBackups).toHaveBeenCalledTimes(2);
    } finally { await stop(); }
  });

  it('定时备份失败交给日志回调，后续检查仍可执行', async () => {
    vi.useFakeTimers();
    vi.stubEnv('AUTO_BACKUP_INTERVAL_HOURS', '1');
    const failure = new Error('disk unavailable');
    service.listBackups.mockResolvedValueOnce([{ createdAt: new Date().toISOString() }]).mockRejectedValueOnce(failure).mockResolvedValue([]);
    service.createBackup.mockResolvedValue({});
    const onError = vi.fn();
    const stop = await startAutomaticBackups(onError);
    try {
      await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
      expect(onError).toHaveBeenCalledWith(failure);
      await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
      expect(service.createBackup).toHaveBeenCalledOnce();
    } finally { await stop(); }
    expect(vi.getTimerCount()).toBe(0);
  });

  it('关闭时等待进行中的备份，防止任务继续使用已关闭的数据库', async () => {
    vi.useFakeTimers();
    vi.stubEnv('AUTO_BACKUP_INTERVAL_HOURS', '1');
    service.listBackups.mockResolvedValueOnce([{ createdAt: new Date().toISOString() }]).mockResolvedValue([]);
    let finishBackup!: () => void;
    service.createBackup.mockReturnValue(new Promise<void>(resolve => { finishBackup = resolve; }));
    const stop = await startAutomaticBackups(vi.fn());
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    let stopped = false;
    const shutdown = stop().then(() => { stopped = true; });
    await Promise.resolve();
    expect(stopped).toBe(false);
    finishBackup();
    await shutdown;
    expect(stopped).toBe(true);
  });
});
