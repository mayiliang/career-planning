/**
 * Server Vitest 配置
 * 
 * Phase 1 实现：
 * - 配置 workspace 包别名
 * - 配置测试环境
 */
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    setupFiles: ['src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@career-atlas/content-parser': resolve(__dirname, '../../packages/content-parser/index.ts'),
      '@career-atlas/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
});
