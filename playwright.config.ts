import { defineConfig, devices } from '@playwright/test'
import { config } from './infrastructure/env.config'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: config.isCI,
  retries: config.isCI ? 2 : 0,
  workers: config.isCI ? 1 : undefined,
  reporter: 'html',
  use: {
    extraHTTPHeaders: {
      requester: 'playwright',
    },
    trace: 'on-first-retry',
    video: 'on-first-retry',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: '.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
})
