import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock pdf-to-img
vi.mock('pdf-to-img', () => ({
  pdf: vi.fn(),
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

import { pdf } from 'pdf-to-img';
import { pdfToImages } from '../pdf';

describe('pdfToImages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should convert PDF to array of image buffers', async () => {
    const mockPdf = vi.mocked(pdf);
    const mockPages = [Buffer.from([1, 2, 3]), Buffer.from([4, 5, 6])];

    // Create mock document with required properties
    mockPdf.mockResolvedValueOnce({
      length: mockPages.length,
      metadata: {} as never,
      getPage: vi.fn(),
      [Symbol.asyncIterator]: async function* () {
        for (const page of mockPages) {
          yield page;
        }
      },
    });

    const result = await pdfToImages('/path/to/test.pdf');

    expect(result).toHaveLength(2);
    expect(result?.[0]).toBeInstanceOf(Buffer);
    expect(result?.[1]).toBeInstanceOf(Buffer);
    expect(mockPdf).toHaveBeenCalledWith('/path/to/test.pdf', { scale: 3 });
  });

  it('should return null for empty PDF', async () => {
    const mockPdf = vi.mocked(pdf);

    mockPdf.mockResolvedValueOnce({
      length: 0,
      metadata: {} as never,
      getPage: vi.fn(),
      [Symbol.asyncIterator]: async function* () {
        // No pages
      },
    });

    const result = await pdfToImages('/path/to/empty.pdf');

    expect(result).toBeNull();
  });

  it('should return null on PDF conversion error', async () => {
    const mockPdf = vi.mocked(pdf);
    mockPdf.mockRejectedValueOnce(new Error('Invalid PDF'));

    const result = await pdfToImages('/path/to/invalid.pdf');

    expect(result).toBeNull();
  });

  it('should handle single page PDF', async () => {
    const mockPdf = vi.mocked(pdf);
    const mockPage = Buffer.from([1, 2, 3, 4, 5]);

    mockPdf.mockResolvedValueOnce({
      length: 1,
      metadata: {} as never,
      getPage: vi.fn(),
      [Symbol.asyncIterator]: async function* () {
        yield mockPage;
      },
    });

    const result = await pdfToImages('/path/to/single-page.pdf');

    expect(result).toHaveLength(1);
    expect(result?.[0]).toEqual(mockPage);
  });
});
