import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.d.ts', '**/test/**'],
    },
  },
  resolve: {
    alias: {
      '@doc-agent/core': resolve(__dirname, 'packages/core/src'),
      '@doc-agent/extract': resolve(__dirname, 'packages/extract/src'),
      '@doc-agent/storage': resolve(__dirname, 'packages/storage/src'),
      '@doc-agent/vector-store': resolve(__dirname, 'packages/vector-store/src'),
      '@doc-agent/cli': resolve(__dirname, 'packages/cli/src'),
    },
  },
});
