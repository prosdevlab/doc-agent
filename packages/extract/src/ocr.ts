import Tesseract from 'tesseract.js';
import type { LogLevel, OcrProgressCallback, StreamCallback } from './types';

/**
 * Helper to emit log via stream callback
 */
function emitLog(
  onStream: StreamCallback | undefined,
  level: LogLevel,
  message: string,
  data?: Record<string, unknown>
): void {
  onStream?.({ type: 'log', level, message, data });
}

/**
 * OCR all images in parallel using tesseract.js
 * @returns Concatenated text with page markers
 */
export async function ocrImages(
  images: Buffer[],
  onProgress?: OcrProgressCallback,
  onStream?: StreamCallback
): Promise<string> {
  if (images.length === 0) return '';

  try {
    const totalPages = images.length;

    // Process all pages in parallel
    const results = await Promise.all(
      images.map(async (image, index) => {
        const pageNum = index + 1;
        try {
          const result = await Tesseract.recognize(image, 'eng', {
            logger: (m) => {
              if (onProgress && m.status === 'recognizing text') {
                onProgress(pageNum, totalPages, m.progress, m.status);
              }
            },
          });
          emitLog(onStream, 'debug', `OCR completed for page ${pageNum}`, {
            page: pageNum,
            textLength: result.data.text.length,
          });
          return { page: pageNum, text: result.data.text };
        } catch (error) {
          emitLog(onStream, 'error', `OCR failed for page ${pageNum}`, {
            page: pageNum,
            error: String(error),
          });
          return { page: pageNum, text: '' };
        }
      })
    );

    // Concatenate with page markers
    const ocrText = results
      .filter((r) => r.text.trim())
      .map((r) => `--- Page ${r.page} ---\n${r.text.trim()}`)
      .join('\n\n');

    emitLog(onStream, 'info', `OCR complete: ${totalPages} pages, ${ocrText.length} chars`, {
      totalPages,
      totalTextLength: ocrText.length,
    });
    return ocrText;
  } catch (error) {
    emitLog(onStream, 'error', 'OCR batch failed', { error: String(error) });
    return '';
  }
}
