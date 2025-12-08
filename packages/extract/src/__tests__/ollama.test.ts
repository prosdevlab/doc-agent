import type { Config } from '@doc-agent/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { extractDocument } from '../index';

// Mock tesseract.js to avoid worker issues in tests
vi.mock('tesseract.js', () => ({
  default: {
    recognize: vi.fn().mockResolvedValue({
      data: { text: 'Mocked OCR text' },
    }),
  },
}));

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

  it('should coerce invalid type to "other"', async () => {
    // Schema is lenient - invalid types become 'other'
    const invalidResponse = {
      response: JSON.stringify({
        type: 'invalid_type', // Invalid type - will be coerced to 'other'
        vendor: 'Test Company',
      }),
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => invalidResponse,
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

    // Invalid type should be coerced to 'other'
    expect(result.type).toBe('other');
    expect(result.vendor).toBe('Test Company');
    expect(mockFetch).toHaveBeenCalledTimes(1); // No retry needed

    fs.unlinkSync(testFile);
  });

  it('should coerce string numbers to actual numbers', async () => {
    // Schema coerces strings like "100.50" to numbers
    const responseWithStrings = {
      response: JSON.stringify({
        type: 'receipt',
        vendor: 'Test Store',
        amount: '50.99', // String instead of number
        items: [{ description: 'Item', total: '25.50' }],
      }),
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => responseWithStrings,
    });

    const fs = await import('node:fs');
    const path = await import('node:path');
    const os = await import('node:os');
    const tmpDir = os.tmpdir();
    const testFile = path.join(tmpDir, 'test-coerce.pdf');
    fs.writeFileSync(testFile, Buffer.from('test pdf content'));

    const config: Config = {
      aiProvider: 'ollama',
      ollamaModel: 'llama3.2-vision',
    };

    const result = await extractDocument(testFile, config);

    expect(result.amount).toBe(50.99);
    expect(typeof result.amount).toBe('number');
    expect(result.items?.[0].total).toBe(25.5);
    expect(typeof result.items?.[0].total).toBe('number');

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

  it('should not retry on API errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    const fs = await import('node:fs');
    const path = await import('node:path');
    const os = await import('node:os');
    const tmpDir = os.tmpdir();
    const testFile = path.join(tmpDir, 'test-no-retry.pdf');
    fs.writeFileSync(testFile, Buffer.from('test pdf content'));

    const config: Config = {
      aiProvider: 'ollama',
      ollamaModel: 'llama3.2-vision',
    };

    await expect(extractDocument(testFile, config)).rejects.toThrow('Ollama API error');

    // Should not retry on API errors
    expect(mockFetch).toHaveBeenCalledTimes(1);

    fs.unlinkSync(testFile);
  });

  it('should handle different image MIME types', async () => {
    const mockResponse = {
      response: JSON.stringify({
        type: 'receipt',
        vendor: 'Store',
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
    const testFile = path.join(tmpDir, 'receipt.png');
    fs.writeFileSync(testFile, Buffer.from('test image content'));

    const config: Config = {
      aiProvider: 'ollama',
      ollamaModel: 'llama3.2-vision',
    };

    await extractDocument(testFile, config);

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    // With OCR enabled, prompt now includes OCR text
    expect(callBody.prompt).toContain('OCR Text'); // OCR is applied to images too

    fs.unlinkSync(testFile);
  });

  it('should handle missing type field gracefully', async () => {
    // Schema defaults missing type to 'other'
    const noTypeResponse = {
      response: JSON.stringify({
        vendor: 'Test Company',
        amount: 100,
      }),
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => noTypeResponse,
    });

    const fs = await import('node:fs');
    const path = await import('node:path');
    const os = await import('node:os');
    const tmpDir = os.tmpdir();
    const testFile = path.join(tmpDir, 'test-no-type.pdf');
    fs.writeFileSync(testFile, Buffer.from('test pdf content'));

    const config: Config = {
      aiProvider: 'ollama',
      ollamaModel: 'llama3.2-vision',
    };

    const result = await extractDocument(testFile, config);

    // Missing type should default to 'other'
    expect(result.type).toBe('other');
    expect(result.vendor).toBe('Test Company');

    fs.unlinkSync(testFile);
  });
});
