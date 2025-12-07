import type { Config } from '@doc-agent/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { extractDocument } from '../index.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Ollama Extraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should extract document data from Ollama API', async () => {
    const mockResponse = {
      response: JSON.stringify({
        type: 'invoice',
        vendor: 'Test Company',
        amount: 100.5,
        date: '2025-12-07',
        items: [{ description: 'Test item', total: 100.5 }],
      }),
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    // Create a temporary file for testing
    const fs = await import('node:fs');
    const path = await import('node:path');
    const os = await import('node:os');
    const tmpDir = os.tmpdir();
    const testFile = path.join(tmpDir, 'test-invoice.pdf');

    // Create a minimal PDF file (just for testing file reading)
    fs.writeFileSync(testFile, Buffer.from('test pdf content'));

    const config: Config = {
      aiProvider: 'ollama',
      ollamaModel: 'llama3.2-vision',
    };

    const result = await extractDocument(testFile, config);

    expect(result.type).toBe('invoice');
    expect(result.vendor).toBe('Test Company');
    expect(result.amount).toBe(100.5);
    expect(result.date).toBe('2025-12-07');
    expect(result.items).toHaveLength(1);
    expect(result.id).toBeDefined();
    expect(result.filename).toBe('test-invoice.pdf');
    expect(result.extractedAt).toBeInstanceOf(Date);

    // Verify API call
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: expect.stringContaining('llama3.2-vision'),
    });

    // Cleanup
    fs.unlinkSync(testFile);
  });

  it('should retry once on Zod validation failure', async () => {
    const invalidResponse = {
      response: JSON.stringify({
        type: 'invalid_type', // Invalid type
        vendor: 'Test Company',
      }),
    };

    const validResponse = {
      response: JSON.stringify({
        type: 'receipt',
        vendor: 'Test Company',
        amount: 50.0,
      }),
    };

    // First call returns invalid data, second call returns valid data
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => invalidResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => validResponse,
      });

    const fs = await import('node:fs');
    const path = await import('node:path');
    const os = await import('node:os');
    const tmpDir = os.tmpdir();
    const testFile = path.join(tmpDir, 'test-receipt.pdf');
    fs.writeFileSync(testFile, Buffer.from('test pdf content'));

    const config: Config = {
      aiProvider: 'ollama',
      ollamaModel: 'llama3.2-vision',
    };

    const result = await extractDocument(testFile, config);

    expect(result.type).toBe('receipt');
    expect(mockFetch).toHaveBeenCalledTimes(2); // Should retry once

    fs.unlinkSync(testFile);
  });

  it('should handle API errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    const fs = await import('node:fs');
    const path = await import('node:path');
    const os = await import('node:os');
    const tmpDir = os.tmpdir();
    const testFile = path.join(tmpDir, 'test-error.pdf');
    fs.writeFileSync(testFile, Buffer.from('test pdf content'));

    const config: Config = {
      aiProvider: 'ollama',
      ollamaModel: 'llama3.2-vision',
    };

    await expect(extractDocument(testFile, config)).rejects.toThrow('Ollama API error');

    fs.unlinkSync(testFile);
  });

  it('should handle JSON parse errors', async () => {
    const invalidJsonResponse = {
      response: 'not valid json {',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => invalidJsonResponse,
    });

    const fs = await import('node:fs');
    const path = await import('node:path');
    const os = await import('node:os');
    const tmpDir = os.tmpdir();
    const testFile = path.join(tmpDir, 'test-parse-error.pdf');
    fs.writeFileSync(testFile, Buffer.from('test pdf content'));

    const config: Config = {
      aiProvider: 'ollama',
      ollamaModel: 'llama3.2-vision',
    };

    await expect(extractDocument(testFile, config)).rejects.toThrow('Failed to parse JSON');

    fs.unlinkSync(testFile);
  });

  it('should use default model if not specified', async () => {
    const mockResponse = {
      response: JSON.stringify({
        type: 'receipt',
      }),
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const fs = await import('node:fs');
    const path = await import('node:path');
    const os = await import('node:os');
    const tmpDir = os.tmpdir();
    const testFile = path.join(tmpDir, 'test-default.pdf');
    fs.writeFileSync(testFile, Buffer.from('test pdf content'));

    const config: Config = {
      aiProvider: 'ollama',
      // No ollamaModel specified
    };

    await extractDocument(testFile, config);

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(callBody.model).toBe('llama3.2-vision'); // Default model

    fs.unlinkSync(testFile);
  });
});
