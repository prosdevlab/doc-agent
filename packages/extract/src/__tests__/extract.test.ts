import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock providers
vi.mock('../providers/gemini', () => ({
  extractWithGemini: vi.fn(),
}));

vi.mock('../providers/ollama', () => ({
  extractWithOllama: vi.fn(),
}));

// Mock fs
vi.mock('node:fs', () => ({
  readFileSync: vi.fn(() => Buffer.from('fake-file-content')),
}));

// Mock kero
vi.mock('@lytics/kero', () => ({
  default: {
    createLogger: () => ({
      debug: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

import type { Config } from '@doc-agent/core';
import { extractWithGemini } from '../providers/gemini';
import { extractWithOllama } from '../providers/ollama';
import { extractDocument } from '../extract';

describe('extractDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should route to Gemini provider when aiProvider is gemini', async () => {
    const mockResult = {
      id: '123',
      filename: 'test.pdf',
      extractedAt: new Date(),
      type: 'receipt' as const,
    };
    vi.mocked(extractWithGemini).mockResolvedValueOnce(mockResult);

    const config: Config = {
      aiProvider: 'gemini',
      geminiApiKey: 'test-key',
    };

    const result = await extractDocument('/path/to/test.pdf', config);

    expect(extractWithGemini).toHaveBeenCalledWith(
      '/path/to/test.pdf',
      expect.any(String), // base64
      config
    );
    expect(result).toEqual(mockResult);
  });

  it('should route to Ollama provider when aiProvider is ollama', async () => {
    const mockResult = {
      id: '456',
      filename: 'invoice.pdf',
      extractedAt: new Date(),
      type: 'invoice' as const,
    };
    vi.mocked(extractWithOllama).mockResolvedValueOnce(mockResult);

    const config: Config = {
      aiProvider: 'ollama',
    };

    const result = await extractDocument('/path/to/invoice.pdf', config);

    expect(extractWithOllama).toHaveBeenCalledWith(
      '/path/to/invoice.pdf',
      expect.any(String), // base64
      config,
      0, // retryCount
      undefined // onStream
    );
    expect(result).toEqual(mockResult);
  });

  it('should pass onStream callback to Ollama provider', async () => {
    const mockResult = {
      id: '789',
      filename: 'doc.pdf',
      extractedAt: new Date(),
      type: 'other' as const,
    };
    vi.mocked(extractWithOllama).mockResolvedValueOnce(mockResult);

    const config: Config = { aiProvider: 'ollama' };
    const onStream = vi.fn();

    await extractDocument('/path/to/doc.pdf', config, { onStream });

    expect(extractWithOllama).toHaveBeenCalledWith(
      '/path/to/doc.pdf',
      expect.any(String),
      config,
      0,
      onStream
    );
  });

  it('should throw error for unsupported provider', async () => {
    const config = { aiProvider: 'openai' } as Config;

    await expect(extractDocument('/path/to/file.pdf', config)).rejects.toThrow(
      'Provider openai not yet implemented'
    );
  });

  it('should convert file to base64', async () => {
    vi.mocked(extractWithGemini).mockResolvedValueOnce({
      id: '1',
      filename: 'test.pdf',
      extractedAt: new Date(),
      type: 'receipt' as const,
    });

    const config: Config = { aiProvider: 'gemini', geminiApiKey: 'key' };
    await extractDocument('/path/to/test.pdf', config);

    // base64 of 'fake-file-content'
    const expectedBase64 = Buffer.from('fake-file-content').toString('base64');
    expect(extractWithGemini).toHaveBeenCalledWith(
      '/path/to/test.pdf',
      expectedBase64,
      config
    );
  });
});
