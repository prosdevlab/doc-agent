import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ocrImages } from '../ocr';

// Mock tesseract.js
vi.mock('tesseract.js', () => ({
  default: {
    recognize: vi.fn(),
  },
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

import Tesseract from 'tesseract.js';

describe('ocrImages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty string for empty images array', async () => {
    const result = await ocrImages([]);
    expect(result).toBe('');
  });

  it('should process single image and return text', async () => {
    const mockRecognize = vi.mocked(Tesseract.recognize);
    mockRecognize.mockResolvedValueOnce({
      data: { text: 'Hello World' },
    } as Tesseract.RecognizeResult);

    const imageBuffer = Buffer.from('fake-image-data');
    const result = await ocrImages([imageBuffer]);

    expect(result).toBe('--- Page 1 ---\nHello World');
    expect(mockRecognize).toHaveBeenCalledWith(imageBuffer, 'eng', expect.any(Object));
  });

  it('should process multiple images in parallel', async () => {
    const mockRecognize = vi.mocked(Tesseract.recognize);
    mockRecognize
      .mockResolvedValueOnce({ data: { text: 'Page 1 content' } } as Tesseract.RecognizeResult)
      .mockResolvedValueOnce({ data: { text: 'Page 2 content' } } as Tesseract.RecognizeResult)
      .mockResolvedValueOnce({ data: { text: 'Page 3 content' } } as Tesseract.RecognizeResult);

    const images = [Buffer.from('image1'), Buffer.from('image2'), Buffer.from('image3')];
    const result = await ocrImages(images);

    expect(result).toContain('--- Page 1 ---');
    expect(result).toContain('--- Page 2 ---');
    expect(result).toContain('--- Page 3 ---');
    expect(mockRecognize).toHaveBeenCalledTimes(3);
  });

  it('should filter out empty pages', async () => {
    const mockRecognize = vi.mocked(Tesseract.recognize);
    mockRecognize
      .mockResolvedValueOnce({ data: { text: 'Has content' } } as Tesseract.RecognizeResult)
      .mockResolvedValueOnce({ data: { text: '   ' } } as Tesseract.RecognizeResult); // Whitespace only

    const images = [Buffer.from('image1'), Buffer.from('image2')];
    const result = await ocrImages(images);

    expect(result).toBe('--- Page 1 ---\nHas content');
    expect(result).not.toContain('Page 2');
  });

  it('should call progress callback during recognition', async () => {
    const mockRecognize = vi.mocked(Tesseract.recognize);
    let capturedLogger: ((m: { status: string; progress: number }) => void) | undefined;

    mockRecognize.mockImplementation((_image, _lang, options) => {
      capturedLogger = options?.logger as (m: { status: string; progress: number }) => void;
      // Simulate progress callbacks
      if (capturedLogger) {
        capturedLogger({ status: 'recognizing text', progress: 0.5 });
        capturedLogger({ status: 'recognizing text', progress: 1.0 });
      }
      return Promise.resolve({ data: { text: 'Result' } } as Tesseract.RecognizeResult);
    });

    const progressCallback = vi.fn();
    const images = [Buffer.from('image1')];

    await ocrImages(images, progressCallback);

    expect(progressCallback).toHaveBeenCalledWith(1, 1, 0.5, 'recognizing text');
    expect(progressCallback).toHaveBeenCalledWith(1, 1, 1.0, 'recognizing text');
  });

  it('should handle OCR errors gracefully for individual pages', async () => {
    const mockRecognize = vi.mocked(Tesseract.recognize);
    mockRecognize
      .mockResolvedValueOnce({ data: { text: 'Good page' } } as Tesseract.RecognizeResult)
      .mockRejectedValueOnce(new Error('OCR failed'));

    const images = [Buffer.from('image1'), Buffer.from('image2')];
    const result = await ocrImages(images);

    // Should still return the successful page
    expect(result).toBe('--- Page 1 ---\nGood page');
  });

  it('should ignore non-recognizing status in progress callback', async () => {
    const mockRecognize = vi.mocked(Tesseract.recognize);

    mockRecognize.mockImplementation((_image, _lang, options) => {
      const logger = options?.logger as
        | ((m: { status: string; progress: number }) => void)
        | undefined;
      if (logger) {
        logger({ status: 'loading tesseract core', progress: 0.5 }); // Should be ignored
        logger({ status: 'recognizing text', progress: 1.0 }); // Should be called
      }
      return Promise.resolve({ data: { text: 'Result' } } as Tesseract.RecognizeResult);
    });

    const progressCallback = vi.fn();
    await ocrImages([Buffer.from('image1')], progressCallback);

    // Only called for 'recognizing text' status
    expect(progressCallback).toHaveBeenCalledTimes(1);
    expect(progressCallback).toHaveBeenCalledWith(1, 1, 1.0, 'recognizing text');
  });
});
