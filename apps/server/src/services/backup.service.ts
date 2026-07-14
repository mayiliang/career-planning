/**
 * 备份服务
 * 
 * Phase 8 实现：数据备份、恢复和轮换管理
 * 
 * 安全原则：
 * 1. 备份包含 checksum，防止数据损坏
 * 2. 恢复前预览，用户可确认
 * 3. 原子恢复，失败可回滚
 * 4. 自动轮换，控制存储占用
 */
import { createHash } from 'crypto';
import { readdir, stat, unlink, mkdir, readFile, writeFile, copyFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, basename, dirname } from 'path';
import { rawDb, getDatabasePath } from '../db/index.js';

// ===== 备份配置 =====

export interface BackupConfig {
  // 备份目录
  backupDir: string;

  // 数据库路径
  dbPath: string;

  // 最大备份数量
  maxBackups: number;

  // 备份文件名前缀
  prefix: string;
}

const DEFAULT_CONFIG: BackupConfig = {
  backupDir: join(dirname(getDatabasePath()), 'backups'),
  dbPath: getDatabasePath(),
  maxBackups: 10,
  prefix: 'career-atlas',
};

// ===== 备份元数据 =====

export interface BackupMetadata {
  // 备份文件名
  filename: string;

  // 备份时间
  createdAt: string;

  // 文件大小（字节）
  size: number;

  // SHA256 checksum
  checksum: string;

  // 备份版本
  version: string;

  // 备份数据统计
  stats: {
    knowledgePoints: number;
    planEvents: number;
    assessments: number;
    jobs: number;
  };

  // 备注
  note?: string;
}

// ===== 备份结果 =====

export interface BackupResult {
  success: boolean;
  metadata: BackupMetadata | null;
  error?: string;
}

// ===== 恢复预览结果 =====

export interface RestorePreviewResult {
  // 备份元数据
  metadata: BackupMetadata;

  // 当前数据库统计
  currentStats: {
    knowledgePoints: number;
    planEvents: number;
    assessments: number;
    jobs: number;
  };

  // 差异分析
  differences: {
    knowledgePoints: number; // 正数表示备份更多
    planEvents: number;
    assessments: number;
    jobs: number;
  };

  // 警告信息
  warnings: string[];
}

// ===== 备份服务 =====

export class BackupService {
  private config: BackupConfig;

  constructor(config: Partial<BackupConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 创建备份
   */
  async createBackup(note?: string): Promise<BackupResult> {
    try {
      // 确保备份目录存在
      if (!existsSync(this.config.backupDir)) {
        await mkdir(this.config.backupDir, { recursive: true });
      }

      // 生成备份文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${this.config.prefix}-${timestamp}.db`;
      const backupPath = join(this.config.backupDir, filename);

      // 检查数据库是否存在
      if (!existsSync(this.config.dbPath)) {
        throw new Error('Database file not found');
      }

      // SQLite 在线备份 API 能在 WAL 模式下生成一致快照。
      await rawDb.backup(backupPath);

      // 计算 checksum
      const checksum = await this.calculateChecksum(backupPath);

      // 获取文件大小
      const stats = await stat(backupPath);

      // 获取数据统计
      const dataStats = await this.getDataStats();

      // 创建元数据
      const metadata: BackupMetadata = {
        filename,
        createdAt: new Date().toISOString(),
        size: stats.size,
        checksum,
        version: '1.0.0',
        stats: dataStats,
        note,
      };

      // 保存元数据文件
      await writeFile(
        join(this.config.backupDir, `${filename}.meta.json`),
        JSON.stringify(metadata, null, 2)
      );

      // 执行备份轮换
      await this.rotateBackups();

      return { success: true, metadata };
    } catch (error) {
      return {
        success: false,
        metadata: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 列出所有备份
   */
  async listBackups(): Promise<BackupMetadata[]> {
    if (!existsSync(this.config.backupDir)) {
      return [];
    }

    const files = await readdir(this.config.backupDir);
    const metaFiles = files.filter(f => f.endsWith('.meta.json'));

    const backups: BackupMetadata[] = [];
    for (const metaFile of metaFiles) {
      try {
        const content = await readFile(
          join(this.config.backupDir, metaFile),
          'utf-8'
        );
        backups.push(JSON.parse(content));
      } catch {
        // 忽略无效的元数据文件
      }
    }

    // 按时间倒序排列
    return backups.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * 预览恢复
   */
  async previewRestore(filename: string): Promise<RestorePreviewResult> {
    const safeFilename = this.validateFilename(filename);
    const backupPath = join(this.config.backupDir, safeFilename);
    const metaPath = join(this.config.backupDir, `${safeFilename}.meta.json`);

    if (!existsSync(backupPath) || !existsSync(metaPath)) {
      throw new Error('Backup file not found');
    }

    // 读取元数据
    const metaContent = await readFile(metaPath, 'utf-8');
    const metadata: BackupMetadata = JSON.parse(metaContent);

    // 验证 checksum
    const currentChecksum = await this.calculateChecksum(backupPath);
    if (currentChecksum !== metadata.checksum) {
      throw new Error('Backup file checksum mismatch');
    }

    // 获取当前数据统计
    const currentStats = await this.getDataStats();

    // 计算差异
    const differences = {
      knowledgePoints: metadata.stats.knowledgePoints - currentStats.knowledgePoints,
      planEvents: metadata.stats.planEvents - currentStats.planEvents,
      assessments: metadata.stats.assessments - currentStats.assessments,
      jobs: metadata.stats.jobs - currentStats.jobs,
    };

    // 生成警告
    const warnings: string[] = [];
    if (differences.knowledgePoints < 0) {
      warnings.push(`恢复后将丢失 ${Math.abs(differences.knowledgePoints)} 个知识点的数据`);
    }
    if (differences.planEvents < 0) {
      warnings.push(`恢复后将丢失 ${Math.abs(differences.planEvents)} 条计划事件`);
    }
    if (differences.assessments < 0) {
      warnings.push(`恢复后将丢失 ${Math.abs(differences.assessments)} 条考核记录`);
    }
    if (differences.jobs < 0) {
      warnings.push(`恢复后将丢失 ${Math.abs(differences.jobs)} 个岗位记录`);
    }

    return {
      metadata,
      currentStats,
      differences,
      warnings,
    };
  }

  /**
   * 执行恢复
   */
  async restore(filename: string): Promise<{ success: boolean; restartRequired?: boolean; error?: string }> {
    try {
      const safeFilename = this.validateFilename(filename);
      const backupPath = join(this.config.backupDir, safeFilename);

      if (!existsSync(backupPath)) {
        throw new Error('Backup file not found');
      }

      // 预览以验证 checksum
      await this.previewRestore(safeFilename);

      // 运行中的 SQLite 连接不应直接被覆盖，重启时再原子切换。
      const pendingPath = join(dirname(this.config.dbPath), 'restore-pending.db');
      await copyFile(backupPath, pendingPath);
      return { success: true, restartRequired: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 删除备份
   */
  async deleteBackup(filename: string): Promise<{ success: boolean; error?: string }> {
    try {
      const safeFilename = this.validateFilename(filename);
      const backupPath = join(this.config.backupDir, safeFilename);
      const metaPath = join(this.config.backupDir, `${safeFilename}.meta.json`);

      if (existsSync(backupPath)) {
        await unlink(backupPath);
      }
      if (existsSync(metaPath)) {
        await unlink(metaPath);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ===== 私有方法 =====

  /**
   * 计算文件 SHA256 checksum
   */
  private async calculateChecksum(filePath: string): Promise<string> {
    const content = await readFile(filePath);
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * 获取数据统计
   */
  private async getDataStats(): Promise<BackupMetadata['stats']> {
    const count = (table: string): number => {
      const row = rawDb.prepare(`SELECT count(*) AS count FROM ${table}`).get() as { count: number };
      return row.count;
    };

    return {
      knowledgePoints: count('knowledge_points'),
      planEvents: count('plan_events'),
      assessments: count('assessment_sessions'),
      jobs: count('jobs'),
    };
  }

  private validateFilename(filename: string): string {
    if (
      basename(filename) !== filename ||
      !filename.startsWith(`${this.config.prefix}-`) ||
      !filename.endsWith('.db')
    ) {
      throw new Error('Invalid backup filename');
    }
    return filename;
  }

  /**
   * 备份轮换
   */
  private async rotateBackups(): Promise<void> {
    const backups = await this.listBackups();

    if (backups.length <= this.config.maxBackups) {
      return;
    }

    // 删除最旧的备份
    const toDelete = backups.slice(this.config.maxBackups);
    for (const backup of toDelete) {
      await this.deleteBackup(backup.filename);
    }
  }
}

// ===== 导出默认实例 =====

let defaultService: BackupService | null = null;

export function getBackupService(config?: Partial<BackupConfig>): BackupService {
  if (!defaultService) {
    defaultService = new BackupService(config);
  }
  return defaultService;
}

export function createBackupService(config?: Partial<BackupConfig>): BackupService {
  return new BackupService(config);
}
