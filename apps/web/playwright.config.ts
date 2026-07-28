import { defineConfig, devices } from '@playwright/test';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:41731',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
  ],
  webServer: [
    {
      command: 'node ../server/dist/index.js',
      url: 'http://127.0.0.1:41730/api/v1/system/health',
      reuseExistingServer: true,
      timeout: 60_000,
      env: {
        DATA_DIR: join(tmpdir(), 'career-atlas-e2e'),
        NODE_ENV: 'test',
        AUTO_BACKUP: 'false',
        EXIT_ON_STDIN_CLOSE: 'true',
      },
    },
    {
      command: 'node node_modules/vite/bin/vite.js',
      url: 'http://127.0.0.1:41731',
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
