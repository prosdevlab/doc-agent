import type { Config } from '@doc-agent/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock GoogleGenerativeAI - use hoisted to avoid initialization issues
const mockGenerateContent = vi.hoisted(() => vi.fn());

vi.mock('@google/generative-ai', () => {
  // Reference the hoisted mock from outer scope
  return {
    GoogleGenerativeAI: class {
      getGenerativeModel() {
        return {
          generateContent: mockGenerateContent,
        };
      }
    },
  };
});

import { extractDocument } from '../index';

describe('Gemini Extraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should extract document data from Gemini API', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () =>
          JSON.stringify({
            type: 'invoice',
            vendor: 'Test Company',
            amount: 200.0,
            date: '2025-12-07',
            items: [{ description: 'Service', total: 200.0 }],
          }),
      },
    });

    const fs = await import('node:fs');
    const path = await import('node:path');
    const os = await import('node:os');
    const tmpDir = os.tmpdir();
    const testFile = path.join(tmpDir, 'test-gemini.pdf');
    fs.writeFileSync(testFile, Buffer.from('test pdf content'));

    const config: Config = {
      aiProvider: 'gemini',
      geminiApiKey: 'test-api-key',
    };

    const result = await extractDocument(testFile, config);

    expect(result.type).toBe('invoice');
    expect(result.vendor).toBe('Test Company');
    expect(result.amount).toBe(200.0);
    expect(result.id).toBeDefined();
    expect(result.filename).toBe('test-gemini.pdf');
    expect(result.extractedAt).toBeInstanceOf(Date);
    expect(mockGenerateContent).toHaveBeenCalled();

    fs.unlinkSync(testFile);
  });

  it('should handle JSON wrapped in markdown code blocks', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => '```json\n{"type": "receipt", "amount": 50.0}\n```',
      },
    });

    const fs = await import('node:fs');
    const path = await import('node:path');
    const os = await import('node:os');
    const tmpDir = os.tmpdir();
    const testFile = path.join(tmpDir, 'test-markdown.pdf');
    fs.writeFileSync(testFile, Buffer.from('test pdf content'));

    const config: Config = {
      aiProvider: 'gemini',
      geminiApiKey: 'test-api-key',
    };

    const result = await extractDocument(testFile, config);

    expect(result.type).toBe('receipt');
    expect(result.amount).toBe(50.0);

    fs.unlinkSync(testFile);
  });

  it('should throw error when API key is missing', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const os = await import('node:os');
    const tmpDir = os.tmpdir();
    const testFile = path.join(tmpDir, 'test-no-key.pdf');
    fs.writeFileSync(testFile, Buffer.from('test pdf content'));

    const config: Config = {
      aiProvider: 'gemini',
      // No geminiApiKey
    };

    await expect(extractDocument(testFile, config)).rejects.toThrow('Gemini API key required');

    fs.unlinkSync(testFile);
  });
});
