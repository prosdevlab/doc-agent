import type { Config } from '@doc-agent/core';
import { extractDocument } from '@doc-agent/extract';
import { z } from 'zod';
import { McpServer, StdioServerTransport } from './sdk';

const server = new McpServer({
  name: 'doc-agent',
  version: '0.1.0',
});

// Register extract_document tool
server.registerTool(
  'extract_document',
  {
    description: 'Extract structured data from invoice, receipt, or bank statement',
    inputSchema: {
      filepath: z.string().describe('Path to the document file'),
      provider: z
        .enum(['gemini', 'openai', 'ollama'])
        .default('gemini')
        .describe('AI provider to use'),
    },
  },
  async ({ filepath, provider }) => {
    const config: Config = {
      aiProvider: provider,
      geminiApiKey: process.env.GEMINI_API_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY,
    };

    try {
      const result = await extractDocument(filepath, config);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${(error as Error).message}` }],
        isError: true,
      };
    }
  }
);

// Register search_documents tool
server.registerTool(
  'search_documents',
  {
    description: 'Search indexed documents using natural language',
    inputSchema: {
      query: z.string().describe('Search query in natural language'),
      limit: z.number().default(10).describe('Maximum number of results'),
    },
  },
  async () => {
    return {
      content: [{ type: 'text', text: 'Search functionality not yet implemented' }],
    };
  }
);

export async function startMCPServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('doc-agent MCP server running on stdio');
}

// Run server if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  startMCPServer().catch(console.error);
}
