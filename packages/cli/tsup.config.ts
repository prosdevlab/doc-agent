import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    cli: 'src/cli.ts',
    'mcp/server': 'src/mcp/server.ts',
    'mcp/index': 'src/mcp/index.ts',
  },
  format: ['esm'],
  dts: false,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  external: [
    '@doc-agent/core',
    '@doc-agent/extract',
    '@doc-agent/vector-store',
    '@google/generative-ai',
    '@modelcontextprotocol/sdk',
    'chalk',
    'commander',
    'ora',
    'vectordb',
  ],
  tsconfig: './tsconfig.json',
});
