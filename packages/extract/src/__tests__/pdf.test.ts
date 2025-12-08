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
    const mockPages = [
      new Uint8Array([1, 2, 3]),
      new Uint8Array([4, 5, 6]),
    ];

    // Create async iterator
    mockPdf.mockResolvedValueOnce({
      [Symbol.asyncIterator]: async function* () {
        for (const page of mockPages) {
          yield page;
        }
      },
    } as AsyncIterable<Uint8Array>);

    const result = await pdfToImages('/path/to/test.pdf');

    expect(result).toHaveLength(2);
    expect(result![0]).toBeInstanceOf(Buffer);
    expect(result![1]).toBeInstanceOf(Buffer);
    expect(mockPdf).toHaveBeenCalledWith('/path/to/test.pdf', { scale: 2 });
  });

  it('should return null for empty PDF', async () => {
    const mockPdf = vi.mocked(pdf);

    mockPdf.mockResolvedValueOnce({
      [Symbol.asyncIterator]: async function* () {
        // No pages
      },
    } as AsyncIterable<Uint8Array>);

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
    const mockPage = new Uint8Array([1, 2, 3, 4, 5]);

    mockPdf.mockResolvedValueOnce({
      [Symbol.asyncIterator]: async function* () {
        yield mockPage;
      },
    } as AsyncIterable<Uint8Array>);

    const result = await pdfToImages('/path/to/single-page.pdf');

    expect(result).toHaveLength(1);
    expect(Buffer.from(result![0])).toEqual(Buffer.from(mockPage));
  });
});

