import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  external: ['@doc-agent/core', '@doc-agent/extract'],
  tsconfig: './tsconfig.json',
});
