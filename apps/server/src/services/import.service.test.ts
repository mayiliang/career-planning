/**
 * 导入服务测试
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { scanKnowledgeFiles, previewImport, executeImport, checkImportStatus } from './import.service.js';
import { closeDatabase } from '../db/index.js';
import { parseKnowledgeMarkdown } from '@career-atlas/content-parser';
import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '../../../..');

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
});