import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
export default defineConfig({ test: { environment: 'node', include: ['docs/auto-coding/evidence/framework-foundation-route/capture.test.ts'], setupFiles: ['apps/server/src/test/setup.ts'], testTimeout: 30000 }, resolve: { alias: { '@career-atlas/shared': resolve('packages/shared/src/index.ts'), '@career-atlas/content-parser': resolve('packages/content-parser/index.ts') } } });
