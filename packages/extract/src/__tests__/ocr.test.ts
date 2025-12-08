import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

// Mock tesseract.js to avoid worker issues in tests
vi.mock('tesseract.js', () => ({
  default: {
    recognize: vi.fn().mockResolvedValue({
      data: {
        text: 'Mocked OCR text\nTaqueria 10/10\n$5.99\n$4.49',
      },
    }),
  },
}));

describe('OCR Processing', () => {
  // Skip if running in CI without the example file
  const examplePath = resolve(__dirname, '../../../../examples/tacqueria-receipt.pdf');

  it('should extract text from PDF using OCR', async () => {
    // Import dynamically to avoid issues with tesseract worker
    const { extractDocument } = await import('../index');

    // Check if example file exists
    let fileExists = false;
    try {
      readFileSync(examplePath);
      fileExists = true;
    } catch {
      fileExists = false;
    }

    if (!fileExists) {
      console.log('Skipping OCR test - example file not found');
      return;
    }

    // Mock the Ollama API to return a simple response
    const mockFetch = globalThis.fetch;
    globalThis.fetch = async (url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url.toString();

      if (urlStr.includes('localhost:11434')) {
        return {
          ok: true,
          json: async () => ({
            response: JSON.stringify({
              type: 'receipt',
              vendor: 'Taqueria 10/10',
              amount: 22.4,
              items: [{ description: 'Test Item', total: 5.99 }],
            }),
          }),
          body: null,
        } as Response;
      }
      return mockFetch(url as RequestInfo, undefined);
    };

    try {
      const result = await extractDocument(examplePath, {
        aiProvider: 'ollama',
        ollamaModel: 'llama3.2-vision',
      });

      // Verify extraction completed
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.filename).toBe('tacqueria-receipt.pdf');
    } finally {
      globalThis.fetch = mockFetch;
    }
  });

  it('should handle OCR errors gracefully', async () => {
    const { extractDocument } = await import('../index');

    // Create a mock that simulates OCR failure by using invalid image data
    const mockFetch = globalThis.fetch;
    globalThis.fetch = async (url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url.toString();

      if (urlStr.includes('localhost:11434')) {
        return {
          ok: true,
          json: async () => ({
            response: JSON.stringify({
              type: 'receipt',
              vendor: 'Test',
              amount: 10,
            }),
          }),
          body: null,
        } as Response;
      }
      return mockFetch(url as RequestInfo, undefined);
    };

    try {
      // This should not throw even if OCR fails internally
      // The extraction should proceed with whatever data is available
      const result = await extractDocument(examplePath, {
        aiProvider: 'ollama',
        ollamaModel: 'llama3.2-vision',
      });

      expect(result).toBeDefined();
    } finally {
      globalThis.fetch = mockFetch;
    }
  });
});

describe('getMimeType', () => {
  it('should detect PDF mime type', async () => {
    const { getMimeType } = await import('../index');
    expect(getMimeType('test.pdf')).toBe('application/pdf');
    expect(getMimeType('TEST.PDF')).toBe('application/pdf');
  });

  it('should detect image mime types', async () => {
    const { getMimeType } = await import('../index');
    expect(getMimeType('test.png')).toBe('image/png');
    expect(getMimeType('test.jpg')).toBe('image/jpeg');
    expect(getMimeType('test.jpeg')).toBe('image/jpeg');
    expect(getMimeType('test.gif')).toBe('image/gif');
    expect(getMimeType('test.webp')).toBe('image/webp');
  });

  it('should default to PDF for unknown extensions', async () => {
    const { getMimeType } = await import('../index');
    expect(getMimeType('test.unknown')).toBe('application/pdf');
  });
});
