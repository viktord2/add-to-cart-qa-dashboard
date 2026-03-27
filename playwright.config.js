// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  use: {
    baseURL: 'http://localhost:5052',
  },
  webServer: {
    command: 'node serve-dashboard.mjs',
    port: 5052,
    env: { PORT: '5052' },
    reuseExistingServer: !process.env.CI,
  },
});
