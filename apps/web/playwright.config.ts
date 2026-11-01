import { defineConfig, devices } from '@playwright/test';

const e2eFrontendPort = 42731;

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  // 用例共享 globalSetup 的单用户数据库，学习焦点与阅读记录写入必须串行。
  workers: 1,
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${e2eFrontendPort}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
  ],
});
