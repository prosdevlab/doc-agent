import { readFileSync } from 'node:fs';
import type { Config, DocumentData } from '@doc-agent/core';
import { extractWithGemini } from './providers/gemini';
import { extractWithOllama } from './providers/ollama';
import type { ExtractOptions } from './types';

/**
 * Extract structured data from a document (PDF or image)
 * Routes to the appropriate AI provider based on config
 */
export async function extractDocument(
  filePath: string,
  config: Config,
  options?: ExtractOptions
): Promise<DocumentData> {
  options?.onStream?.({
    type: 'log',
    level: 'info',
    message: `Starting extraction with ${config.aiProvider}`,
    data: { filePath, provider: config.aiProvider },
  });

  const fileBuffer = readFileSync(filePath);
  const base64 = fileBuffer.toString('base64');

  if (config.aiProvider === 'gemini') {
    return extractWithGemini(filePath, base64, config);
  }

  if (config.aiProvider === 'ollama') {
    return extractWithOllama(filePath, base64, config, 0, options?.onStream);
  }

  throw new Error(`Provider ${config.aiProvider} not yet implemented`);
}
