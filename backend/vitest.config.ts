/**
 * Vitest config for backend. Per Implementation Plan 16.1.1.
 */
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@td3/shared-types': path.resolve(__dirname, '../libs/shared-types/src/index.ts'),
    },
  },
});
