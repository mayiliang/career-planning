/**
 * Vitest 配置 - 根目录
 * 
 * Phase 0 实现：
 * - 全局测试配置
 * - 工作区测试
 */
import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    setupFiles: [resolve(__dirname, 'test/setup.ts')],
    include: ['**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'data'],
    coverage: {
      reporter: ['text', 'json'],
      exclude: ['node_modules', 'dist', '**/*.d.ts'],
    },
  },
});
