import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./tests/globalSetup.js'],
    setupFiles: ['./tests/setup.js'],
    // all test files share one database, so run files one at a time
    fileParallelism: false,
    testTimeout: 15000,
    env: { NODE_ENV: 'test' },
  },
});
