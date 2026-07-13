/**
 * Vitest 配置 - 根目录
 * 
 * Phase 0 实现：
 * - 全局测试配置
 * - 工作区测试
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'data'],
    coverage: {
      reporter: ['text', 'json'],
      exclude: ['node_modules', 'dist', '**/*.d.ts'],
    },
  },
});