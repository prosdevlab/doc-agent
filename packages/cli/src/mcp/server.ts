import type { Config } from '@doc-agent/core';
import { extractDocument } from '@doc-agent/extract';
import { Server } from '@modelcontextprotocol/sdk/server';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  type CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  {
    name: 'doc-agent',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'extract_document',
        description: 'Extract structured data from invoice, receipt, or bank statement',
        inputSchema: {
          type: 'object',
          properties: {
            filepath: {
              type: 'string',
              description: 'Path to the document file',
            },
            provider: {
              type: 'string',
              enum: ['gemini', 'openai', 'ollama'],
              description: 'AI provider to use',
              default: 'gemini',
            },
          },
          required: ['filepath'],
        },
      },
      {
        name: 'search_documents',
        description: 'Search indexed documents using natural language',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query in natural language',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results',
              default: 10,
            },
          },
          required: ['query'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  if (request.params.name === 'extract_document') {
    const { filepath, provider = 'gemini' } = request.params.arguments as {
      filepath: string;
      provider?: string;
    };

    const config: Config = {
      aiProvider: provider as 'gemini' | 'openai' | 'ollama',
      geminiApiKey: process.env.GEMINI_API_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY,
    };

    try {
      const result = await extractDocument(filepath, config);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${(error as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  }

  if (request.params.name === 'search_documents') {
    return {
      content: [
        {
          type: 'text',
          text: 'Search functionality not yet implemented',
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

export async function startMCPServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('doc-agent MCP server running on stdio');
}

// Run server if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  startMCPServer().catch(console.error);
}
