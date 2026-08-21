import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    hookTimeout: 15_000,
    include: ['tests/runtime/**/*.smoke.ts'],
    testTimeout: 15_000,
  },
});
